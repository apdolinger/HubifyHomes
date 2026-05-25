import { Request, Response, NextFunction } from "express";
import { pool } from "./db";

const BASE_DOMAIN = process.env.BASE_DOMAIN || "hubifyhomesonline.com";
// "demo" is intentionally NOT reserved in routing — demo.hubifyhomesonline.com
// maps to the real demo org. It IS reserved in the PATCH endpoint so no
// customer org can ever claim it.
const RESERVED_SLUGS = new Set(["www", "admin", "api", "app", "support"]);

export interface TenantInfo {
  isPublicDomain: boolean;
  subdomain: string | null;
  found: boolean;
  orgId: string | null;
  name: string | null;
  orgStatus: string | null;
}

declare global {
  namespace Express {
    interface Request {
      tenant: TenantInfo;
    }
  }
}

function extractSubdomain(hostname: string): string | null {
  const host = hostname.split(":")[0].toLowerCase();
  if (host === BASE_DOMAIN || host === `www.${BASE_DOMAIN}`) return null;
  const suffix = `.${BASE_DOMAIN}`;
  if (!host.endsWith(suffix)) return null;
  const sub = host.slice(0, host.length - suffix.length);
  if (!sub || sub.includes(".")) return null;
  return sub;
}

export async function tenantMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  // Use Host header first (always contains the exact domain the client
  // requested, preserved by Cloudflare and Render). Fall back to
  // X-Forwarded-Host (set by CDN), then Express's computed req.hostname.
  const rawHost =
    (req.headers["host"] as string)?.split(":")[0]?.trim() ||
    (req.headers["x-forwarded-host"] as string)?.split(",")[0]?.trim() ||
    req.hostname;

  const subdomain = extractSubdomain(rawHost);

  if (subdomain === null || RESERVED_SLUGS.has(subdomain)) {
    req.tenant = {
      isPublicDomain: true,
      subdomain: null,
      found: false,
      orgId: null,
      name: null,
      orgStatus: null,
    };
    return next();
  }

  try {
    const client = await pool.connect();
    try {
      const result = await client.query<{
        id: string;
        name: string;
        org_status: string | null;
      }>(
        `SELECT id, name, org_status FROM orgs WHERE slug = $1 LIMIT 1`,
        [subdomain]
      );
      if (result.rows.length === 0) {
        req.tenant = {
          isPublicDomain: false,
          subdomain,
          found: false,
          orgId: null,
          name: null,
          orgStatus: null,
        };
      } else {
        const row = result.rows[0];
        req.tenant = {
          isPublicDomain: false,
          subdomain,
          found: true,
          orgId: row.id,
          name: row.name,
          orgStatus: row.org_status ?? "active",
        };
      }
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[TENANT] Middleware lookup error:", err);
    req.tenant = {
      isPublicDomain: false,
      subdomain,
      found: false,
      orgId: null,
      name: null,
      orgStatus: null,
    };
  }

  next();
}
