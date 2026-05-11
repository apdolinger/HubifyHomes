/**
 * Platform Master Admin
 *
 * Manages the built-in platform-level admin account used for non-Replit
 * deployments (e.g. Render). Credentials come entirely from environment
 * variables; no plaintext secrets are stored in the codebase.
 *
 * Environment variables:
 *   ADMIN_EMAIL    - email address for the master admin account
 *   ADMIN_PASSWORD - plaintext password (only used to create the hash on
 *                    first boot; change it and restart to rotate)
 */

import bcrypt from "bcryptjs";
import { pool } from "./db";
import { log } from "./vite";

const BCRYPT_ROUNDS = 12;

export interface PlatformAdmin {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

/** Idempotent – safe to call on every boot. */
export async function ensurePlatformAdminsTable(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_admins (
        id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        email        VARCHAR     NOT NULL UNIQUE,
        password_hash VARCHAR    NOT NULL,
        created_at   TIMESTAMP   NOT NULL DEFAULT NOW()
      );
    `);
  } catch (err: unknown) {
    log(
      `[MASTER ADMIN] Failed to ensure platform_admins table: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  } finally {
    client.release();
  }
}

/**
 * If ADMIN_EMAIL + ADMIN_PASSWORD are configured and no admin with that
 * email exists yet, create one with a bcrypt-hashed password.
 * Existing admins are never overwritten – delete the row and restart to
 * reset a password.
 */
export async function initializePlatformAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();

  if (!email || !password) {
    if (process.env.NODE_ENV === "production") {
      log(
        "[MASTER ADMIN] WARNING: ADMIN_EMAIL / ADMIN_PASSWORD not set. " +
          "Platform master-admin login is disabled."
      );
    }
    return;
  }

  const client = await pool.connect();
  try {
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Upsert: create on first boot, update the hash on subsequent boots
    // so that changing ADMIN_PASSWORD + restarting always takes effect.
    const result = await client.query(
      `INSERT INTO platform_admins (email, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING (xmax = 0) AS inserted`,
      [email, hash]
    );

    const wasInserted = result.rows[0]?.inserted;
    if (wasInserted) {
      log(`[MASTER ADMIN] Master admin account created for ${email}.`);
    } else {
      log(`[MASTER ADMIN] Master admin password updated for ${email}.`);
    }
  } catch (err: unknown) {
    log(
      `[MASTER ADMIN] Error initializing platform admin: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  } finally {
    client.release();
  }
}

/** Looks up a platform admin by email. Returns null if not found. */
export async function getPlatformAdmin(
  email: string
): Promise<PlatformAdmin | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id, email, password_hash, created_at FROM platform_admins WHERE email = $1",
      [email]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
    };
  } finally {
    client.release();
  }
}

/** Verifies a plaintext password against the stored bcrypt hash. */
export async function verifyPlatformAdminPassword(
  admin: PlatformAdmin,
  plaintext: string
): Promise<boolean> {
  return bcrypt.compare(plaintext, admin.passwordHash);
}
