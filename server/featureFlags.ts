import type { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { featureFlags, orgs } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Returns true if a feature flag is enabled for the given org.
 *
 * Resolution order:
 *   1. Per-org override (orgs.featureFlags[key]) — wins if set to true/false.
 *   2. Flag's defaultEnabled (feature_flags.default_enabled) — fallback.
 *   3. False — if the flag is unknown.
 *
 * Pass `null` orgId for unauthenticated/super-admin contexts; only the
 * default value is used in that case.
 */
export async function isFeatureEnabled(
  orgId: string | null,
  flagKey: string,
): Promise<boolean> {
  if (orgId) {
    const [org] = await db
      .select({ featureFlags: orgs.featureFlags })
      .from(orgs)
      .where(eq(orgs.id, orgId));
    const overrides = (org?.featureFlags ?? {}) as Record<string, boolean>;
    if (Object.prototype.hasOwnProperty.call(overrides, flagKey)) {
      return overrides[flagKey] === true;
    }
  }

  const [flag] = await db
    .select({ defaultEnabled: featureFlags.defaultEnabled })
    .from(featureFlags)
    .where(eq(featureFlags.key, flagKey));
  return flag?.defaultEnabled === true;
}

/**
 * Returns the effective flag map for the given org. For each known flag,
 * the value is the per-org override if present, otherwise the flag's default.
 * Unknown overrides (no matching flag row) are ignored.
 */
export async function getEffectiveFeatureFlags(
  orgId: string | null,
): Promise<Record<string, boolean>> {
  const all = await db.select().from(featureFlags);
  let overrides: Record<string, boolean> = {};
  if (orgId) {
    const [org] = await db
      .select({ featureFlags: orgs.featureFlags })
      .from(orgs)
      .where(eq(orgs.id, orgId));
    overrides = (org?.featureFlags ?? {}) as Record<string, boolean>;
  }
  const result: Record<string, boolean> = {};
  for (const flag of all) {
    result[flag.key] = Object.prototype.hasOwnProperty.call(overrides, flag.key)
      ? overrides[flag.key] === true
      : flag.defaultEnabled === true;
  }
  return result;
}

/**
 * Express middleware factory: rejects the request with 403 when the named
 * feature flag is disabled for the caller's org. Use after `isAuthenticated`
 * so that `req.user.claims.orgId` is populated.
 */
export function requireFeatureFlag(flagKey: string) {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user?.claims?.orgId ?? req.user?.claims?.org_id ?? null;
      const enabled = await isFeatureEnabled(orgId, flagKey);
      if (!enabled) {
        return res.status(403).json({
          enabled: false,
          flag: flagKey,
          message: `This feature ("${flagKey}") is disabled for your organization.`,
        });
      }
      next();
    } catch (error) {
      console.error(`requireFeatureFlag(${flagKey}) error:`, error);
      res.status(500).json({ message: "Failed to evaluate feature flag" });
    }
  };
}
