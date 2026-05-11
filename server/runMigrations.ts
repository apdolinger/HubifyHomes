import { pool } from "./db";
import { log } from "./vite";

/**
 * Ensure the connect-pg-simple session table exists.
 * We create it ourselves (with IF NOT EXISTS on BOTH table AND index) so that
 * connect-pg-simple's createTableIfMissing option can be left off — that
 * option omits IF NOT EXISTS on the index, causing a hard crash when the
 * index already exists in the database.
 */
export async function ensureSessionTable(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid"    varchar        NOT NULL COLLATE "default",
        "sess"   json           NOT NULL,
        "expire" timestamp(6)   NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);
    log("[SESSION] Session table verified.");
  } catch (err: unknown) {
    log(`[SESSION] Failed to ensure session table: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    client.release();
  }
}

/**
 * Ensure the outbound-webhook tables (webhook_endpoints, webhook_deliveries)
 * exist. These are referenced by the webhook dispatcher on every task
 * mutation; if they're missing, every PATCH /api/tasks/:id logs a noisy
 * `relation "webhook_endpoints" does not exist` error.
 *
 * This is intentionally targeted (only the webhook tables) and idempotent
 * (CREATE TABLE/INDEX IF NOT EXISTS) so it is safe to run on every boot
 * in any environment without touching unrelated schema.
 *
 * The DDL mirrors shared/schema.ts (webhookEndpoints / webhookDeliveries)
 * and migrations/002_add_webhook_tables.sql.
 */
export async function ensureWebhookTables(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_endpoints (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES orgs(id),
        url TEXT NOT NULL,
        secret VARCHAR NOT NULL,
        event_types JSONB NOT NULL DEFAULT '[]'::jsonb,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        description VARCHAR,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS webhook_endpoints_org_idx ON webhook_endpoints(org_id);

      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
        org_id UUID NOT NULL REFERENCES orgs(id),
        event_type VARCHAR NOT NULL,
        payload JSONB NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        last_attempt_at TIMESTAMP,
        next_retry_at TIMESTAMP,
        response_status INTEGER,
        response_body TEXT,
        error_message TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS webhook_deliveries_endpoint_idx ON webhook_deliveries(endpoint_id);
      CREATE INDEX IF NOT EXISTS webhook_deliveries_org_idx ON webhook_deliveries(org_id);
      CREATE INDEX IF NOT EXISTS webhook_deliveries_status_idx ON webhook_deliveries(status);
    `);
  } catch (err: any) {
    log(`[MIGRATE] Failed to ensure webhook tables: ${err?.message ?? err}`);
  } finally {
    client.release();
  }
}

/**
 * Rename the cookie-consent `marketing` column to `preference` on both the
 * OIDC user table and the portal user table. The UI and Privacy Policy now
 * call this category "Preference"; this brings the schema in line.
 *
 * Idempotent:
 *   - if only `marketing` exists, rename to `preference`
 *   - if both exist (transient state), backfill `preference` from `marketing`
 *     and drop `marketing`
 *   - if only `preference` exists, do nothing
 */
/**
 * Ensure the onboarding_prospects table exists. Referenced by super-admin
 * onboarding pipeline routes; missing table causes 500s on first deploy.
 * Idempotent (CREATE TABLE/INDEX IF NOT EXISTS).
 */
export async function ensureOnboardingProspectsTable(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS onboarding_prospects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        email VARCHAR NOT NULL,
        company VARCHAR,
        phone VARCHAR,
        stage VARCHAR NOT NULL DEFAULT 'inquiry',
        stage_history JSONB NOT NULL DEFAULT '[]'::jsonb,
        dropped_reason TEXT,
        welcome_email_sent_at TIMESTAMP,
        notes TEXT,
        org_id UUID,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS onboarding_prospects_stage_idx ON onboarding_prospects(stage);
      CREATE INDEX IF NOT EXISTS onboarding_prospects_email_idx ON onboarding_prospects(email);
    `);
  } catch (err: unknown) {
    log(`[MIGRATE] Failed to ensure onboarding_prospects table: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    client.release();
  }
}

export async function ensureInvoiceReceiptColumns(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE client_invoices ADD COLUMN IF NOT EXISTS receipt_url TEXT;
      ALTER TABLE client_invoices ADD COLUMN IF NOT EXISTS payment_method_brand VARCHAR;
      ALTER TABLE client_invoices ADD COLUMN IF NOT EXISTS payment_method_last4 VARCHAR;
    `);
  } catch (err: any) {
    log(`[MIGRATE] Failed to add invoice receipt columns: ${err?.message ?? err}`);
  } finally {
    client.release();
  }
}

export async function ensureCookieConsentPreferenceColumn(): Promise<void> {
  const client = await pool.connect();
  try {
    for (const table of ["user_cookie_consent", "portal_user_cookie_consent"]) {
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = '${table}' AND column_name = 'marketing'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = '${table}' AND column_name = 'preference'
          ) THEN
            ALTER TABLE ${table} RENAME COLUMN marketing TO preference;
          ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = '${table}' AND column_name = 'marketing'
          ) AND EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = '${table}' AND column_name = 'preference'
          ) THEN
            UPDATE ${table} SET preference = marketing WHERE preference IS DISTINCT FROM marketing;
            ALTER TABLE ${table} DROP COLUMN marketing;
          END IF;
        END $$;
      `);
    }
  } catch (err: any) {
    log(`[MIGRATE] Failed to rename cookie consent column: ${err?.message ?? err}`);
  } finally {
    client.release();
  }
}
