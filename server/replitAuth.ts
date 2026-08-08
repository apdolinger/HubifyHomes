import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { log } from "./vite";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET environment variable is required in production."
      );
    }
    log("[SESSION] WARNING: SESSION_SECRET not set — using insecure dev default.");
  }

  const sessionConfig: session.SessionOptions = {
    secret: secret || "dev-insecure-secret-do-not-use-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: sessionTtl,
    },
  };

  if (process.env.DATABASE_URL) {
    const PgSession = connectPg(session);
    sessionConfig.store = new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: "session",
      createTableIfMissing: false,
      ttl: sessionTtl / 1000,
    });
    log("[SESSION] Using PostgreSQL session store.");
  }

  return session(sessionConfig);
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Staff email+password login
  app.post("/api/staff/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
      }

      const user = await storage.getUserByEmail(String(email).toLowerCase().trim());
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      if (!user.passwordHash) {
        return res.status(401).json({ message: "No password set for this account. Contact your administrator." });
      }

      const valid = await bcrypt.compare(String(password), user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      // Ensure SA and staff sessions never coexist — clear SA session on staff login.
      (req.session as any).superAdmin = null;
      (req.session as any).staffUser = {
        id: user.id,
        email: user.email,
        orgId: user.orgId,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      };

      await storage.updateUser(user.id, { lastActiveAt: new Date() });
      log(`[AUTH] Staff login: ${user.email} (${user.role})`);
      res.json({ ok: true });
    } catch (error) {
      console.error("[AUTH] Staff login error:", error);
      res.status(500).json({ message: "Login failed." });
    }
  });

  // Staff logout (POST)
  app.post("/api/staff/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  // GET /api/logout — kept for backward-compat (links, bookmarks)
  app.get("/api/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/staff/login"));
  });

  // GET /api/login — redirect gracefully instead of returning 503
  app.get("/api/login", (_req, res) => res.redirect("/staff/login"));
  app.get("/api/callback", (_req, res) => res.redirect("/"));

  // ---------------------------------------------------------------
  // One-time password setup — guarded by ADMIN_PASSWORD env var.
  //
  // Use this to set the initial password for any staff account on Render:
  //
  //   curl -X POST https://hubifyhomesonline.com/api/staff/setup-password \
  //     -H "Content-Type: application/json" \
  //     -d '{"adminPassword":"<ADMIN_PASSWORD>","email":"you@example.com","newPassword":"YourNewPass1!"}'
  //
  // The endpoint is disabled once you no longer call it — no UI exposure.
  // ---------------------------------------------------------------
  app.post("/api/staff/setup-password", async (req, res) => {
    try {
      const { adminPassword, email, newPassword } = req.body;
      const expected = process.env.ADMIN_PASSWORD;
      if (!expected || String(adminPassword) !== expected) {
        return res.status(403).json({ message: "Forbidden." });
      }
      if (!email || !newPassword || String(newPassword).length < 8) {
        return res.status(400).json({ message: "email and newPassword (min 8 chars) are required." });
      }

      const user = await storage.getUserByEmail(String(email).toLowerCase().trim());
      if (!user) {
        return res.status(404).json({ message: "No staff user found with that email." });
      }

      const hash = await bcrypt.hash(String(newPassword), 12);
      await storage.updateUser(user.id, { passwordHash: hash });

      log(`[AUTH] Password set for staff user: ${user.email}`);
      res.json({ ok: true, message: `Password set for ${user.email} (role: ${user.role})` });
    } catch (error) {
      console.error("[AUTH] setup-password error:", error);
      res.status(500).json({ message: "Failed to set password." });
    }
  });

  // Staff forgot-password — sends a reset link via email
  app.post("/api/staff/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required." });

      const normalEmail = String(email).toLowerCase().trim();
      const user = await storage.getUserByEmail(normalEmail);

      // Always respond with success to prevent email enumeration
      if (!user || !user.isActive) {
        return res.json({ message: "If an account exists with this email, you will receive a password reset link." });
      }

      await storage.invalidatePasswordResetTokensForEmail(normalEmail);

      const { nanoid } = await import("nanoid");
      const resetToken = nanoid(48);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await storage.createPasswordResetToken({
        token: resetToken,
        email: normalEmail,
        userType: "staff",
        expiresAt,
      });

      const baseUrl = process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : "http://localhost:5000";
      const resetUrl = `${baseUrl}/staff/reset-password?token=${resetToken}`;
      const firstName = user.firstName || "there";

      const htmlContent = `
        <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
        <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
          <div style="max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#0d9488;">Hubify — Password Reset</h2>
            <p>Hi ${firstName},</p>
            <p>We received a request to reset the password for your Hubify staff account (<strong>${normalEmail}</strong>).</p>
            <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
            <div style="text-align:center;margin:30px 0;">
              <a href="${resetUrl}" style="background-color:#0097BD;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">Reset Password</a>
            </div>
            <p style="color:#666;font-size:13px;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:30px 0;">
            <p style="color:#999;font-size:12px;">Hubify Homes · <a href="https://hubifyhomesonline.com" style="color:#0d9488;">hubifyhomesonline.com</a></p>
          </div>
        </body></html>
      `;

      try {
        const { sendGenericEmail } = await import("./emailUtils");
        await sendGenericEmail({ to: normalEmail, subject: "Reset your Hubify password", htmlContent });
        log(`[AUTH] Password reset email sent to ${normalEmail}`);
      } catch (emailErr) {
        console.error("[AUTH] Failed to send password reset email:", emailErr);
      }

      res.json({ message: "If an account exists with this email, you will receive a password reset link." });
    } catch (error) {
      console.error("[AUTH] staff forgot-password error:", error);
      res.status(500).json({ message: "Failed to process request." });
    }
  });

  // Staff reset-password — verify token
  app.get("/api/staff/reset-password/verify", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ valid: false, message: "Token is required." });
      }
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken || resetToken.userType !== "staff") {
        return res.json({ valid: false, message: "Invalid or expired reset link." });
      }
      if (resetToken.isUsed) {
        return res.json({ valid: false, message: "This reset link has already been used." });
      }
      if (new Date(resetToken.expiresAt) < new Date()) {
        return res.json({ valid: false, message: "This reset link has expired." });
      }
      res.json({ valid: true, email: resetToken.email });
    } catch (error) {
      console.error("[AUTH] staff reset-password/verify error:", error);
      res.status(500).json({ valid: false, message: "Failed to verify token." });
    }
  });

  // Staff reset-password — apply new password
  app.post("/api/staff/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required." });
      }
      if (String(newPassword).length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters." });
      }

      const resetToken = await storage.getPasswordResetToken(String(token));
      if (!resetToken || resetToken.userType !== "staff" || resetToken.isUsed || new Date(resetToken.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Invalid or expired reset link." });
      }

      const user = await storage.getUserByEmail(resetToken.email);
      if (!user) {
        return res.status(400).json({ message: "Account not found." });
      }

      const passwordHash = await bcrypt.hash(String(newPassword), 12);
      await storage.updateUser(user.id, { passwordHash });
      await storage.markPasswordResetTokenUsed(String(token));

      log(`[AUTH] Staff password reset completed for ${resetToken.email}`);
      res.json({ ok: true });
    } catch (error) {
      console.error("[AUTH] staff reset-password error:", error);
      res.status(500).json({ message: "Failed to reset password." });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const staffUser = (req.session as any)?.staffUser;

  // Also allow through if a valid super-admin session is present
  const superAdmin = (req.session as any)?.superAdmin;
  if (superAdmin?.authenticated) {
    // Populate req.user with a synthetic super-admin identity so downstream
    // middleware (requireMFA, etc.) can inspect role without crashing.
    if (!(req as any).user) {
      (req as any).user = {
        id: "super_admin",
        claims: {
          sub: "super_admin",
          role: "super_admin",
          email: superAdmin.username ?? "",
        },
        expires_at: Infinity,
      };
    }
    return next();
  }

  if (!staffUser?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Populate req.user in the shape the rest of the app expects
  (req as any).user = {
    id: staffUser.id,
    claims: {
      sub: staffUser.id,
      orgId: staffUser.orgId,
      role: staffUser.role,
      email: staffUser.email,
      first_name: staffUser.firstName,
      last_name: staffUser.lastName,
    },
    expires_at: Infinity,
  };

  return next();
};

// ── Global deny-by-default API auth gate ─────────────────────────────────────
// Paths (prefix-matched) that are intentionally reachable without a session.
// Everything else under /api/* requires either a staff session or a super-admin
// session.  Per-route guards (isAuthenticated, isPortalAuthenticated, etc.) are
// kept in place as a second layer; this middleware is the first line of defense.
const PUBLIC_API_PREFIXES: string[] = [
  // Tenant resolution (needed before any login UI renders)
  "/api/tenant",

  // Staff auth flows registered by setupAuth() — login, logout, password reset
  "/api/auth/",
  "/api/staff/login",
  "/api/staff/logout",
  "/api/staff/forgot-password",
  "/api/staff/reset-password",
  "/api/staff/setup-password",   // ADMIN_PASSWORD-gated bootstrap endpoint
  "/api/logout",                  // GET logout — redirect to /staff/login
  "/api/login",                   // GET redirect shim
  "/api/callback",                // GET redirect shim

  // Super-admin auth (credential-gated internally)
  "/api/super-admin/login",
  "/api/super-admin/logout",
  "/api/super-admin/session",

  // Dev-only test login (already hard-gated on NODE_ENV inside the handler)
  "/api/dev/login",

  // Public inquiry / contact / beta / onboarding / account-setup flows
  "/api/public/",

  // Portal: login, register, password-reset, cookie notice, and all
  // authenticated portal endpoints (isPortalAuthenticated guards those)
  "/api/portal/",

  // Token-based payment collection (no staff session, uses a signed token)
  "/api/payment-collection/",

  // Stripe inbound webhooks (registered in index.ts before registerRoutes,
  // signature-validated inside each handler)
  "/api/stripe/webhooks/",
  "/api/stripe-webhook",

  // Public signup flow (powers the /signup page)
  "/api/signup",
  "/api/signup/config",

  // Public discount-code validation (used on public pricing/signup pages)
  "/api/discount-codes/validate",

  // Support info endpoint (consumed by Hubify Console and public surfaces)
  "/api/support-info",
];

export const requireApiSession: RequestHandler = (req, res, next) => {
  const path = req.path;

  // Only gate /api/* — let everything else through (static files, HTML, etc.)
  if (!path.startsWith("/api/") && path !== "/api") {
    return next();
  }

  // Allow explicitly public paths (prefix match against the full path)
  for (const prefix of PUBLIC_API_PREFIXES) {
    if (path === prefix || path.startsWith(prefix)) {
      return next();
    }
  }

  const session = (req as any).session;
  const staffUser   = session?.staffUser;
  const superAdmin  = session?.superAdmin;

  if (staffUser?.id || superAdmin?.authenticated) {
    return next();
  }

  return res.status(401).json({ message: "Unauthorized" });
};
