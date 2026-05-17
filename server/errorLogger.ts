import { db } from "./db";
import { errorLogs } from "@shared/schema";
import { Request } from "express";

export type ErrorLevel = "warn" | "error" | "critical";
export type ErrorSource = "server" | "unhandled" | "stripe" | "email" | "cron" | "webhook";

export interface LogErrorOptions {
  level?: ErrorLevel;
  source?: ErrorSource;
  message: string;
  stack?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  metadata?: Record<string, any>;
  userId?: string;
  orgId?: string;
  ip?: string;
}

export async function logError(opts: LogErrorOptions): Promise<void> {
  try {
    await db.insert(errorLogs).values({
      level: opts.level ?? "error",
      source: opts.source ?? "server",
      route: opts.route,
      method: opts.method,
      statusCode: opts.statusCode,
      message: opts.message.slice(0, 2000),
      stack: opts.stack ? opts.stack.slice(0, 5000) : undefined,
      metadata: opts.metadata,
      userId: opts.userId,
      orgId: opts.orgId,
      ip: opts.ip,
    });
  } catch {
    // Never let the logger itself crash the app
  }
}

export function logErrorFromRequest(req: Request, err: any, statusCode = 500): void {
  const user = (req as any).user;
  logError({
    level: statusCode >= 500 ? "error" : "warn",
    source: "server",
    route: req.path,
    method: req.method,
    statusCode,
    message: err?.message || String(err),
    stack: err?.stack,
    userId: user?.claims?.sub || user?.id,
    orgId: user?.claims?.orgId || user?.orgId,
    ip: req.ip || req.headers["x-forwarded-for"]?.toString(),
    metadata: { url: req.originalUrl },
  });
}
