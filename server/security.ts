import { Request } from "express";
import { db } from "./db";
import { securityAuditLogs, userMfaSettings, adminIpAllowlist, userSessions } from "@shared/schema";
import type { InsertSecurityAuditLog } from "@shared/schema";
import { eq, and, gte } from "drizzle-orm";

// Audit logging service
export class AuditLogger {
  static async log(params: {
    req: Request;
    action: string;
    actionType: "read" | "create" | "update" | "delete" | "auth" | "admin";
    resource: string;
    resourceId?: string;
    changes?: { before?: Record<string, any>; after?: Record<string, any> };
    metadata?: Record<string, any>;
    severity?: "info" | "warning" | "critical";
    success?: boolean;
    errorMessage?: string;
  }) {
    const { req, action, actionType, resource, resourceId, changes, metadata, severity, success, errorMessage } = params;
    
    const user = req.user as any;
    const orgId = user?.orgId || null;
    
    const auditLog = {
      userId: user?.id || null,
      userEmail: user?.email || null,
      userRole: user?.role || null,
      orgId,
      action,
      actionType,
      resource,
      resourceId: resourceId || null,
      method: req.method,
      endpoint: req.originalUrl,
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null,
      sessionId: req.sessionID || null,
      changes: changes || null,
      metadata: metadata || null,
      severity: severity || "info",
      success: success !== false,
      errorMessage: errorMessage || null,
    };

    try {
      await db.insert(securityAuditLogs).values(auditLog as any);
    } catch (error) {
      console.error("Failed to write audit log:", error);
    }
  }

  // Log admin actions with critical severity
  static async logAdminAction(req: Request, action: string, resource: string, resourceId?: string, changes?: any) {
    return this.log({
      req,
      action,
      actionType: "admin",
      resource,
      resourceId,
      changes,
      severity: "critical",
    });
  }

  // Log authentication events
  static async logAuth(req: Request, action: "login" | "logout" | "mfa_verify" | "mfa_fail", success: boolean = true, errorMessage?: string) {
    return this.log({
      req,
      action,
      actionType: "auth",
      resource: "authentication",
      severity: success ? "info" : "warning",
      success,
      errorMessage,
    });
  }
}

// MFA enforcement
export class MFAEnforcement {
  static async isEnabled(userId: string): Promise<boolean> {
    const settings = await db
      .select()
      .from(userMfaSettings)
      .where(eq(userMfaSettings.userId, userId))
      .limit(1);
    
    return settings[0]?.mfaEnabled || false;
  }

  static async requireMFAForAdmin(req: Request): Promise<boolean> {
    const user = req.user as any;
    
    // Non-admin users don't need MFA enforcement
    if (user?.role !== "admin" && user?.role !== "supervisor") {
      return true;
    }

    // Check if MFA is enabled
    const mfaEnabled = await this.isEnabled(user.id);
    
    if (!mfaEnabled) {
      await AuditLogger.log({
        req,
        action: "admin_access_blocked_no_mfa",
        actionType: "auth",
        resource: "mfa",
        severity: "warning",
        success: false,
        errorMessage: "MFA not enabled for admin user",
      });
      return false;
    }

    return true;
  }
}

// IP Allowlist enforcement
export class IPAllowlist {
  static async isAllowed(ipAddress: string): Promise<boolean> {
    const allowedIPs = await db
      .select()
      .from(adminIpAllowlist)
      .where(eq(adminIpAllowlist.isActive, true));

    // If no IPs are configured, allow all (default behavior)
    if (allowedIPs.length === 0) {
      return true;
    }

    // Check exact IP match
    const exactMatch = allowedIPs.find(ip => ip.ipAddress === ipAddress);
    if (exactMatch) {
      return true;
    }

    // Check CIDR range match (basic implementation)
    // For production, use a proper CIDR matching library like ip-cidr
    for (const allowedIP of allowedIPs) {
      if (allowedIP.ipRange) {
        // Simplified check - in production, use proper CIDR matching
        if (ipAddress.startsWith(allowedIP.ipRange.split('/')[0])) {
          return true;
        }
      }
    }

    return false;
  }

  static async enforceForAdmin(req: Request): Promise<boolean> {
    const user = req.user as any;
    
    // Only enforce for admin users
    if (user?.role !== "admin") {
      return true;
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
    const allowed = await this.isAllowed(ipAddress);

    if (!allowed) {
      await AuditLogger.log({
        req,
        action: "admin_access_blocked_ip",
        actionType: "auth",
        resource: "ip_allowlist",
        severity: "critical",
        success: false,
        errorMessage: `Admin access blocked from unauthorized IP: ${ipAddress}`,
      });
    }

    return allowed;
  }
}

// Session management
export class SessionManager {
  static async trackSession(req: Request): Promise<void> {
    const user = req.user as any;
    if (!user) return;

    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const sessionId = req.sessionID;

    // Check for existing session
    const existing = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, user.id),
          eq(userSessions.sessionId, sessionId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      // Create new session record
      await db.insert(userSessions).values({
        userId: user.id,
        sessionId,
        ipAddress,
        userAgent,
        isActive: true,
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });
    } else {
      // Update last activity
      await db
        .update(userSessions)
        .set({ lastActivityAt: new Date() })
        .where(eq(userSessions.id, existing[0].id));
    }
  }

  static async getActiveSessions(userId: string): Promise<number> {
    const sessions = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, userId),
          eq(userSessions.isActive, true),
          gte(userSessions.expiresAt, new Date())
        )
      );

    return sessions.length;
  }

  static async enforceSessionLimit(req: Request, maxSessions: number = 3): Promise<boolean> {
    const user = req.user as any;
    if (!user) return true;

    const activeCount = await this.getActiveSessions(user.id);

    if (activeCount > maxSessions) {
      await AuditLogger.log({
        req,
        action: "session_limit_exceeded",
        actionType: "auth",
        resource: "sessions",
        severity: "warning",
        success: false,
        metadata: { activeCount, maxSessions },
      });
      return false;
    }

    return true;
  }

  static async invalidateUserSessions(userId: string): Promise<void> {
    await db
      .update(userSessions)
      .set({ isActive: false })
      .where(eq(userSessions.userId, userId));
  }
}

// Middleware for audit logging
export function auditMiddleware(req: Request, res: any, next: any) {
  // Track the original methods
  const originalJson = res.json;
  const originalSend = res.send;

  let responseBody: any;

  // Intercept response to log it
  res.json = function (body: any) {
    responseBody = body;
    return originalJson.call(this, body);
  };

  res.send = function (body: any) {
    responseBody = body;
    return originalSend.call(this, body);
  };

  // Log after response is sent
  res.on('finish', async () => {
    const user = req.user as any;
    
    // Only log authenticated requests
    if (!user) return;

    // Determine action type based on method
    let actionType: "read" | "create" | "update" | "delete" | "auth" | "admin" = "read";
    if (req.method === "POST") actionType = "create";
    else if (req.method === "PUT" || req.method === "PATCH") actionType = "update";
    else if (req.method === "DELETE") actionType = "delete";

    // Determine severity based on path
    let severity: "info" | "warning" | "critical" = "info";
    if (req.path.includes("/admin") || req.path.includes("/super-admin")) {
      severity = "critical";
    }

    await AuditLogger.log({
      req,
      action: `${req.method} ${req.path}`,
      actionType,
      resource: req.path.split('/')[2] || "unknown",
      severity,
      success: res.statusCode < 400,
      errorMessage: res.statusCode >= 400 ? responseBody?.message : undefined,
    });
  });

  next();
}

// Middleware for MFA enforcement on admin routes
export async function requireMFA(req: Request, res: any, next: any) {
  const hasValidMFA = await MFAEnforcement.requireMFAForAdmin(req);
  
  if (!hasValidMFA) {
    return res.status(403).json({
      message: "Multi-factor authentication required. Please enable MFA on your account to access admin functions.",
      requireMFA: true,
    });
  }

  next();
}

// Middleware for IP allowlist enforcement on admin routes
export async function requireAllowedIP(req: Request, res: any, next: any) {
  const isAllowed = await IPAllowlist.enforceForAdmin(req);
  
  if (!isAllowed) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress;
    return res.status(403).json({
      message: "Access denied. Your IP address is not authorized for admin access.",
      ipAddress,
    });
  }

  next();
}

// Middleware for session tracking
export async function trackSession(req: Request, res: any, next: any) {
  if (req.user) {
    await SessionManager.trackSession(req);
  }
  next();
}
