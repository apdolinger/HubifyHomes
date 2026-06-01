import { pool } from "./db";
import { log } from "./vite";

/**
 * Add `slug` (unique) and `org_status` columns to the orgs table, then
 * backfill slugs from org names and set org_status from is_active.
 * Safe to run multiple times (fully idempotent).
 */
export async function ensureOrgSlugAndStatusColumns(): Promise<void> {
  const client = await pool.connect();
  try {
    // 1. Add columns if they don't exist
    await client.query(`
      ALTER TABLE orgs ADD COLUMN IF NOT EXISTS slug VARCHAR;
      ALTER TABLE orgs ADD COLUMN IF NOT EXISTS org_status VARCHAR NOT NULL DEFAULT 'active';
    `);

    // 2. Unique index on slug (only non-null values)
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS orgs_slug_unique_idx
        ON orgs (slug) WHERE slug IS NOT NULL;
    `);

    // 3. Backfill org_status from is_active for rows still at the column default
    await client.query(`
      UPDATE orgs
        SET org_status = CASE WHEN is_active THEN 'active' ELSE 'suspended' END
      WHERE org_status = 'active' AND NOT is_active;
    `);

    // 4. Backfill slugs for orgs that don't have one yet
    await client.query(`
      DO $$
      DECLARE
        r RECORD;
        base_slug TEXT;
        candidate TEXT;
        suffix INT;
      BEGIN
        FOR r IN SELECT id, name FROM orgs WHERE slug IS NULL ORDER BY created_at ASC LOOP
          -- Normalise: lowercase, collapse non-alphanum to hyphen, trim hyphens, max 63 chars
          base_slug := lower(
            regexp_replace(
              regexp_replace(r.name, '[^a-zA-Z0-9]+', '-', 'g'),
              '^-+|-+$', '', 'g'
            )
          );
          base_slug := left(base_slug, 63);
          IF base_slug = '' THEN base_slug := 'org'; END IF;

          candidate := base_slug;
          suffix := 2;
          WHILE EXISTS (SELECT 1 FROM orgs WHERE slug = candidate) LOOP
            candidate := left(base_slug, 60) || '-' || suffix;
            suffix := suffix + 1;
          END LOOP;

          UPDATE orgs SET slug = candidate WHERE id = r.id;
        END LOOP;
      END $$;
    `);

    // 5. Ensure the hardcoded demo org always has slug='demo'
    //    (migration backfill may have set it from the org name instead)
    await client.query(`
      UPDATE orgs
        SET slug = 'demo'
      WHERE id = '00000000-0000-0000-0000-000000000de0'
        AND (slug IS NULL OR slug <> 'demo');
    `);

    log("[MIGRATE] orgs.slug + orgs.org_status columns verified.");
  } catch (err: any) {
    log(`[MIGRATE] Failed to ensure orgs slug/status columns: ${err?.message ?? err}`);
  } finally {
    client.release();
  }
}

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

/**
 * Add agreement_content / agreement_signed_at columns to onboarding_prospects
 * and create the onboarding_stage_email_templates and onboarding_prospect_emails
 * tables. All DDL is idempotent (ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS).
 */
export async function ensureOnboardingEnhancements(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE onboarding_prospects
        ADD COLUMN IF NOT EXISTS agreement_content TEXT,
        ADD COLUMN IF NOT EXISTS agreement_signed_at TIMESTAMP;

      CREATE TABLE IF NOT EXISTS onboarding_stage_email_templates (
        stage VARCHAR PRIMARY KEY,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        send_after_days INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS onboarding_prospect_emails (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        prospect_id UUID NOT NULL REFERENCES onboarding_prospects(id) ON DELETE CASCADE,
        stage VARCHAR NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        sent_by VARCHAR NOT NULL DEFAULT 'manual',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS onboarding_prospect_emails_prospect_idx
        ON onboarding_prospect_emails(prospect_id);
    `);
    log("[MIGRATE] Onboarding enhancements (agreement + stage emails) verified.");
  } catch (err: unknown) {
    log(`[MIGRATE] Failed to ensure onboarding enhancements: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    client.release();
  }
}

/**
 * Create the org_signup_tokens table used by the self-service signup wizard.
 * Idempotent (CREATE TABLE / INDEX IF NOT EXISTS).
 */
export async function ensureOrgSignupTokensTable(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS org_signup_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        email VARCHAR NOT NULL,
        token VARCHAR(64) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        claimed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS org_signup_tokens_email_idx ON org_signup_tokens(email);
      CREATE INDEX IF NOT EXISTS org_signup_tokens_token_idx ON org_signup_tokens(token);
    `);
    log("[MIGRATE] org_signup_tokens table verified.");
  } catch (err: any) {
    log(`[MIGRATE] Failed to ensure org_signup_tokens table: ${err?.message ?? err}`);
  } finally {
    client.release();
  }
}

export async function ensureErrorLogsTable(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS error_logs (
        id SERIAL PRIMARY KEY,
        level VARCHAR(20) NOT NULL DEFAULT 'error',
        source VARCHAR(50) NOT NULL DEFAULT 'server',
        route VARCHAR(500),
        method VARCHAR(10),
        status_code INTEGER,
        message TEXT NOT NULL,
        stack TEXT,
        metadata JSONB,
        user_id VARCHAR,
        org_id UUID,
        ip VARCHAR(100),
        resolved BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS error_logs_level_idx ON error_logs(level);
      CREATE INDEX IF NOT EXISTS error_logs_created_at_idx ON error_logs(created_at);
      CREATE INDEX IF NOT EXISTS error_logs_resolved_idx ON error_logs(resolved);
    `);
    log("[MIGRATE] error_logs table verified.");
  } catch (err: any) {
    log(`[MIGRATE] Failed to ensure error_logs table: ${err?.message ?? err}`);
  } finally {
    client.release();
  }
}

export async function ensureDiscountCodeUsagesTable(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS discount_code_usages (
        id SERIAL PRIMARY KEY,
        discount_code_id INTEGER NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
        org_id UUID REFERENCES orgs(id) ON DELETE SET NULL,
        org_name VARCHAR(255),
        plan_name VARCHAR(128),
        used_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS discount_code_usages_code_idx ON discount_code_usages(discount_code_id);
    `);
    log("[MIGRATE] discount_code_usages table verified.");
  } catch (err: any) {
    log(`[MIGRATE] Failed to ensure discount_code_usages table: ${err?.message ?? err}`);
  } finally {
    client.release();
  }
}

export async function ensureSubmissionColumns(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE onboarding_prospects
        ADD COLUMN IF NOT EXISTS first_name VARCHAR,
        ADD COLUMN IF NOT EXISTS last_name VARCHAR,
        ADD COLUMN IF NOT EXISTS website VARCHAR,
        ADD COLUMN IF NOT EXISTS business_type VARCHAR,
        ADD COLUMN IF NOT EXISTS service_area VARCHAR,
        ADD COLUMN IF NOT EXISTS estimated_homes INTEGER,
        ADD COLUMN IF NOT EXISTS current_mgmt_method VARCHAR,
        ADD COLUMN IF NOT EXISTS team_size INTEGER,
        ADD COLUMN IF NOT EXISTS suggested_tier VARCHAR,
        ADD COLUMN IF NOT EXISTS trial_intent VARCHAR,
        ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR,
        ADD COLUMN IF NOT EXISTS submission_status VARCHAR DEFAULT 'new';
    `);
    log("[MIGRATE] onboarding_prospects submission columns verified.");
  } catch (err: any) {
    log(`[MIGRATE] Failed to add submission columns to onboarding_prospects: ${err?.message ?? err}`);
  } finally {
    client.release();
  }
}

export async function ensureStaffPasswordHashColumn(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS password_hash VARCHAR;
    `);
    log("[MIGRATE] users.password_hash column verified.");
  } catch (err: any) {
    log(`[MIGRATE] Failed to add password_hash column to users: ${err?.message ?? err}`);
  } finally {
    client.release();
  }
}

export async function ensureProspectDiscountCodeColumn(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE onboarding_prospects
        ADD COLUMN IF NOT EXISTS discount_code VARCHAR(64);
    `);
    log("[MIGRATE] onboarding_prospects.discount_code column verified.");
  } catch (err: any) {
    log(`[MIGRATE] Failed to add discount_code column to onboarding_prospects: ${err?.message ?? err}`);
  } finally {
    client.release();
  }
}

export async function ensureProspectConfirmationEmailTemplateTable(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS prospect_confirmation_email_template (
        id VARCHAR PRIMARY KEY DEFAULT 'default',
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    log("[MIGRATE] prospect_confirmation_email_template table verified.");
  } catch (err: any) {
    log(`[MIGRATE] Failed to ensure prospect_confirmation_email_template table: ${err?.message ?? err}`);
  } finally {
    client.release();
  }
}

export async function ensureTrialColumns(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE onboarding_prospects
        ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS trial_status VARCHAR DEFAULT 'inactive',
        ADD COLUMN IF NOT EXISTS trial_warning_sent_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS trial_expired_email_sent_at TIMESTAMP;
    `);
    log("[MIGRATE] onboarding_prospects trial columns verified.");
  } catch (err: any) {
    log(`[MIGRATE] Failed to add trial columns to onboarding_prospects: ${err?.message ?? err}`);
  } finally {
    client.release();
  }
}

export async function ensureProspectConfirmationEmailColumns(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE onboarding_prospects
        ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS confirmation_email_status VARCHAR;
    `);
    log("[MIGRATE] onboarding_prospects confirmation email columns verified.");
  } catch (err: any) {
    log(`[MIGRATE] Failed to add confirmation email columns to onboarding_prospects: ${err?.message ?? err}`);
  } finally {
    client.release();
  }
}

export async function ensureOrganizationServicesTable(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS organization_services (
        id SERIAL PRIMARY KEY,
        org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(128),
        default_price_cents INTEGER,
        billing_frequency VARCHAR(64) DEFAULT 'monthly',
        is_billable BOOLEAN NOT NULL DEFAULT TRUE,
        creates_tasks BOOLEAN NOT NULL DEFAULT FALSE,
        default_task_category VARCHAR(128),
        recurrence_rule TEXT,
        estimated_duration_minutes INTEGER,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS org_services_org_id_idx ON organization_services(org_id);
      CREATE INDEX IF NOT EXISTS org_services_active_idx ON organization_services(is_active);
      CREATE INDEX IF NOT EXISTS org_services_category_idx ON organization_services(category);
    `);
    log("[MIGRATE] organization_services table verified.");
  } catch (err: any) {
    log(`[MIGRATE] Failed to ensure organization_services table: ${err?.message ?? err}`);
  } finally {
    client.release();
  }
}

export async function ensureDemoProspectColumns(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE onboarding_prospects
        ADD COLUMN IF NOT EXISTS source VARCHAR,
        ADD COLUMN IF NOT EXISTS demo_access_sent BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS demo_email_sent_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS demo_email_error TEXT;
    `);
    log("[MIGRATE] onboarding_prospects demo columns verified.");
  } catch (err: any) {
    log(`[MIGRATE] Failed to add demo columns to onboarding_prospects: ${err?.message ?? err}`);
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

export async function ensureOrgSetupProgressTable(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS org_setup_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL UNIQUE REFERENCES orgs(id) ON DELETE CASCADE,
        has_added_property BOOLEAN NOT NULL DEFAULT FALSE,
        has_invited_staff BOOLEAN NOT NULL DEFAULT FALSE,
        has_connected_stripe BOOLEAN NOT NULL DEFAULT FALSE,
        has_imported_clients BOOLEAN NOT NULL DEFAULT FALSE,
        has_configured_service BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS org_setup_progress_org_id_idx ON org_setup_progress(org_id);
    `);
    log("[MIGRATE] org_setup_progress table verified.");
  } catch (err: any) {
    log(`[MIGRATE] Failed to ensure org_setup_progress table: ${err?.message ?? err}`);
  } finally {
    client.release();
  }
}

export async function ensureProspectConvertedAtColumn(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE onboarding_prospects
        ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP;
    `);
    log("[MIGRATE] onboarding_prospects converted_at column verified.");
  } catch (err: any) {
    log(`[MIGRATE] Failed to add converted_at column to onboarding_prospects: ${err?.message ?? err}`);
  } finally {
    client.release();
  }
}

export async function ensureBetaProspectColumns(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE onboarding_prospects
        ADD COLUMN IF NOT EXISTS beta_discount_tier VARCHAR,
        ADD COLUMN IF NOT EXISTS beta_removed_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS is_beta_member BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS beta_approved_at TIMESTAMP;
    `);
    // Backfill existing approved beta members who pre-date the is_beta_member column
    await client.query(`
      UPDATE onboarding_prospects
      SET is_beta_member = true,
          beta_approved_at = COALESCE(updated_at, created_at)
      WHERE source = 'beta_application'
        AND stage = 'welcome'
        AND beta_removed_at IS NULL
        AND is_beta_member = false;
    `);
    log("[MIGRATE] onboarding_prospects beta columns verified.");
  } catch (err: any) {
    log(`[MIGRATE] Failed to add beta columns to onboarding_prospects: ${err?.message ?? err}`);
  } finally {
    client.release();
  }
}

export async function ensurePropertyServiceAssignmentsTable(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS property_service_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        service_id INTEGER NOT NULL REFERENCES organization_services(id) ON DELETE CASCADE,
        client_contact_id INTEGER REFERENCES contacts(id),
        start_date DATE NOT NULL,
        end_date DATE,
        custom_price_cents INTEGER,
        billing_frequency_override VARCHAR(64),
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        visible_to_portal BOOLEAN NOT NULL DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS psa_org_id_idx ON property_service_assignments(org_id);
      CREATE INDEX IF NOT EXISTS psa_property_id_idx ON property_service_assignments(property_id);
      CREATE INDEX IF NOT EXISTS psa_service_id_idx ON property_service_assignments(service_id);
      CREATE INDEX IF NOT EXISTS psa_status_idx ON property_service_assignments(status);
      ALTER TABLE property_service_assignments ADD COLUMN IF NOT EXISTS visible_to_portal BOOLEAN NOT NULL DEFAULT true;
    `);
    log("[MIGRATE] property_service_assignments table verified.");
  } catch (err: any) {
    log(`[MIGRATE] Failed to ensure property_service_assignments table: ${err?.message ?? err}`);
  } finally {
    client.release();
  }
}

export async function ensureBetaApprovalColumns(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE onboarding_prospects
        ADD COLUMN IF NOT EXISTS why_interested TEXT,
        ADD COLUMN IF NOT EXISTS biggest_challenge TEXT,
        ADD COLUMN IF NOT EXISTS launch_timeframe VARCHAR,
        ADD COLUMN IF NOT EXISTS portfolio_tier VARCHAR,
        ADD COLUMN IF NOT EXISTS original_monthly_price REAL,
        ADD COLUMN IF NOT EXISTS discount_percentage INTEGER,
        ADD COLUMN IF NOT EXISTS discounted_monthly_price REAL,
        ADD COLUMN IF NOT EXISTS setup_fee REAL,
        ADD COLUMN IF NOT EXISTS beta_cohort_number INTEGER,
        ADD COLUMN IF NOT EXISTS agreement_status VARCHAR;
    `);
    log("[MIGRATE] onboarding_prospects beta approval columns verified.");
  } catch (err: any) {
    log(`[MIGRATE] Failed to add beta approval columns to onboarding_prospects: ${err?.message ?? err}`);
  } finally {
    client.release();
  }
}

export async function ensureBetaApprovalEmailColumns(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE onboarding_prospects
        ADD COLUMN IF NOT EXISTS onboarding_token VARCHAR UNIQUE,
        ADD COLUMN IF NOT EXISTS onboarding_token_created_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS onboarding_token_expires_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS approval_email_sent BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS approval_email_sent_at TIMESTAMP;
    `);
    log("[MIGRATE] onboarding_prospects beta approval email columns verified.");
  } catch (err: any) {
    log(`[MIGRATE] Failed to add beta approval email columns to onboarding_prospects: ${err?.message ?? err}`);
  } finally {
    client.release();
  }
}

export async function ensureAgreementSignatureColumns(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE onboarding_prospects
        ADD COLUMN IF NOT EXISTS agreement_signer_name VARCHAR,
        ADD COLUMN IF NOT EXISTS agreement_organization_name VARCHAR,
        ADD COLUMN IF NOT EXISTS agreement_accepted_ip VARCHAR,
        ADD COLUMN IF NOT EXISTS agreement_accepted_user_agent TEXT;
    `);
    log("[MIGRATE] onboarding_prospects agreement signature columns verified.");
  } catch (err: any) {
    log(`[MIGRATE] Failed to add agreement signature columns to onboarding_prospects: ${err?.message ?? err}`);
  } finally {
    client.release();
  }
}

export async function ensurePaymentSetupColumns(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE onboarding_prospects
        ADD COLUMN IF NOT EXISTS payment_status VARCHAR,
        ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS beta_stripe_customer_id VARCHAR,
        ADD COLUMN IF NOT EXISTS beta_stripe_subscription_id VARCHAR,
        ADD COLUMN IF NOT EXISTS beta_stripe_checkout_session_id VARCHAR;
    `);
    log("[MIGRATE] onboarding_prospects payment setup columns verified.");
  } catch (err: any) {
    log(`[MIGRATE] Failed to add payment setup columns to onboarding_prospects: ${err?.message ?? err}`);
  } finally {
    client.release();
  }
}

export async function ensureOnboardingTrackerColumns(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE onboarding_prospects
        ADD COLUMN IF NOT EXISTS owner VARCHAR,
        ADD COLUMN IF NOT EXISTS next_action TEXT,
        ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS onboarding_checklist JSONB;
    `);
    log("[MIGRATE] onboarding_prospects tracker columns verified.");
  } catch (err: any) {
    log(`[MIGRATE] Failed to add tracker columns to onboarding_prospects: ${err?.message ?? err}`);
  } finally {
    client.release();
  }
}

export async function ensureStripeWebhookSecretColumn(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE org_stripe_connections
        ADD COLUMN IF NOT EXISTS stripe_webhook_secret VARCHAR;
    `);
    log("[MIGRATE] org_stripe_connections.stripe_webhook_secret column verified.");
  } catch (err: any) {
    log(`[MIGRATE] Failed to add stripe_webhook_secret to org_stripe_connections: ${err?.message ?? err}`);
  } finally {
    client.release();
  }
}

export async function ensurePortalInvitationColumns(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE portal_invitations
        ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL;
    `);
    log("[MIGRATE] portal_invitations sent_at and contact_id columns verified.");
  } catch (err: any) {
    log(`[MIGRATE] Failed to add columns to portal_invitations: ${err?.message ?? err}`);
  } finally {
    client.release();
  }
}
