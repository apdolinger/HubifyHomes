import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startScheduledTasks } from "./scheduledTasks";
import { logError } from "./errorLogger";
import { tenantMiddleware } from "./tenantMiddleware";
import { db } from "./db";
import { sql } from "drizzle-orm";

// Install process-level error guards as early as possible so transient
// database / WebSocket drops during startup don't crash the process.
process.on("uncaughtException", (err: Error) => {
  console.error("[UNCAUGHT EXCEPTION – early guard]", err.message);
});
process.on("unhandledRejection", (reason: any) => {
  console.error("[UNHANDLED REJECTION – early guard]", reason?.message ?? reason);
});

const app = express();

/**
 * Run once after startup migrations complete.
 * If encryption is enabled and the stored canary cannot be decrypted with the
 * current key, send a warning email to the platform admin address.
 * Rate-limited to at most one email per 24 hours via a platform_settings key.
 */
async function checkEncryptionCanaryAndAlert(): Promise<void> {
  const { isEncryptionEnabled, decrypt, getCanaryPlaintext } = await import('./encryption.js');

  if (!isEncryptionEnabled()) {
    // No key configured — nothing to check.
    return;
  }

  const { storage } = await import('./storage.js');
  const settings = await storage.getPlatformSettings();

  const storedCanary = settings['encryption_canary_v1'] as string | undefined;
  if (!storedCanary) {
    // Canary not written yet — first boot with encryption. Nothing to alert.
    return;
  }

  let canaryOk: boolean;
  try {
    const decrypted = decrypt(storedCanary);
    canaryOk = decrypted === getCanaryPlaintext();
  } catch {
    canaryOk = false;
  }

  if (canaryOk) {
    return;
  }

  console.error('[startup] ENCRYPTION KEY MISMATCH — stored canary cannot be decrypted with the current PLATFORM_ENCRYPTION_KEY. Stripe keys and other encrypted data will be unreadable until the correct key is restored.');

  // Rate-limit: skip if an alert was already sent within the last 24 hours.
  const RATE_LIMIT_MS = 24 * 60 * 60 * 1000;
  const lastAlertIso = settings['encryption_mismatch_alert_sent_at'] as string | undefined;
  if (lastAlertIso) {
    const lastAlertMs = new Date(lastAlertIso).getTime();
    if (!isNaN(lastAlertMs) && Date.now() - lastAlertMs < RATE_LIMIT_MS) {
      console.warn(`[startup] Encryption mismatch alert already sent at ${lastAlertIso} — skipping duplicate.`);
      return;
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL || process.env.SUPPORT_EMAIL;
  if (!adminEmail) {
    console.warn('[startup] No ADMIN_EMAIL or SUPPORT_EMAIL configured — cannot send encryption mismatch alert.');
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn('[startup] RESEND_API_KEY not configured — cannot send encryption mismatch alert email.');
    return;
  }

  try {
    const { sendGenericEmail } = await import('./emailUtils.js');
    const platformSettingsUrl = `${process.env.PUBLIC_URL || ''}/super-admin/platform-settings`;

    const htmlContent = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#dc2626;">⚠️ Encryption Key Mismatch Detected</h2>
        <p>The platform encryption canary could not be decrypted with the current
        <strong>PLATFORM_ENCRYPTION_KEY</strong> on startup (${new Date().toISOString()}).</p>
        <p>This means the key has been rotated or changed without re-encrypting the stored data.
        <strong>Stripe payment keys and other encrypted credentials will fail</strong> until the
        correct key is restored or a re-encryption is performed.</p>
        <h3>Recommended actions</h3>
        <ol>
          <li>Restore the previous <code>PLATFORM_ENCRYPTION_KEY</code> environment variable, or</li>
          <li>Open Platform Settings and use the Re-encrypt tool to migrate data to the new key.</li>
        </ol>
        <p>
          <a href="${platformSettingsUrl}"
             style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">
            Open Platform Settings
          </a>
        </p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p style="color:#6b7280;font-size:13px;">This alert is sent at most once every 24 hours.</p>
      </div>
    `;

    await sendGenericEmail({
      to: adminEmail,
      subject: '⚠️ Hubify: Encryption key mismatch detected at startup',
      htmlContent,
      fromName: 'Hubify Platform',
    });

    // Persist the timestamp so we don't flood on rapid restarts.
    await storage.setPlatformSettings(
      { encryption_mismatch_alert_sent_at: new Date().toISOString() },
      null,
    );

    console.log(`[startup] Encryption mismatch alert sent to ${adminEmail}`);
  } catch (emailErr) {
    console.error('[startup] Failed to send encryption mismatch alert email:', emailErr);
  }
}

// Security headers (production only — skip CSP in dev to keep Vite HMR working)
if (process.env.NODE_ENV === "production") {
  app.use(
    helmet({
      contentSecurityPolicy: false, // configured at the CDN/proxy layer
      crossOriginEmbedderPolicy: false,
    })
  );

  // /submit and /contact are intentionally embeddable cross-origin so that
  // hubifyhomes.com can load them inside an iframe modal. Remove the
  // X-Frame-Options: SAMEORIGIN header that helmet sets for those two paths.
  app.use((req, res, next) => {
    if (req.path === "/submit" || req.path === "/contact") {
      res.removeHeader("X-Frame-Options");
    }
    next();
  });
}

// Rate limiting — all API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

// Stricter limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later." },
});

app.use("/api", apiLimiter);
app.use("/api/super-admin/login", authLimiter);
app.use("/api/portal/login", authLimiter);
app.use("/api/portal/register", authLimiter);

// Webhook routes MUST be registered before express.json() to preserve raw body for signature verification
app.post("/api/stripe/webhooks/master", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const { getMasterStripe, handleMasterWebhook } = await import("./stripe");
    const stripe = getMasterStripe();
    const sig = req.headers["stripe-signature"];

    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).json({ message: "Missing signature or webhook secret" });
    }

    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    await handleMasterWebhook(event);
    res.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(400).json({ message: `Webhook Error: ${(error as Error).message}` });
  }
});

// Beta onboarding checkout webhook — must be before express.json()
app.post("/api/stripe/webhooks/beta-onboarding", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_BETA_ONBOARDING_WEBHOOK_SECRET;

    let event: any;
    if (sig && webhookSecret) {
      const { getMasterStripe } = await import("./stripe");
      const stripe = getMasterStripe();
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // No secret configured — parse raw JSON for dev/staging
      try {
        event = JSON.parse(req.body.toString());
      } catch {
        return res.status(400).json({ message: "Invalid JSON body" });
      }
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const prospectToken = session.metadata?.prospect_token;
      if (prospectToken) {
        const { db } = await import("./db");
        const { onboardingProspects } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");
        const rows = await db.select().from(onboardingProspects)
          .where(eq(onboardingProspects.onboardingToken, prospectToken)).limit(1);
        const prospect = rows[0];
        if (prospect) {
          // Only update payment metadata if not already provisioned
          if (!(prospect as any).orgId) {
            const now = new Date();
            const existingHistory: any[] = (prospect as any).stageHistory ?? [];
            await db.update(onboardingProspects).set({
              paymentStatus: "paid",
              paymentCompletedAt: now,
              betaStripeCustomerId: session.customer ?? null,
              betaStripeSubscriptionId: session.subscription ?? null,
              stage: "platform_initializing",
              stageHistory: [
                ...existingHistory,
                { stage: "platform_initializing", enteredAt: now.toISOString(), note: "Stripe Checkout completed" },
              ],
            } as any).where(eq(onboardingProspects.id, prospect.id));

            // Send payment receipt email
            const prospectEmail = prospect.email ?? (session.metadata?.prospect_email ?? "");
            if (prospectEmail) {
              try {
                const resendKey = process.env.RESEND_API_KEY;
                if (resendKey) {
                  const { Resend } = await import("resend");
                  const { buildPaymentReceiptEmail } = await import("./emailUtils.js");
                  const resend = new Resend(resendKey);
                  const fromEmail = process.env.RESEND_FROM_EMAIL || "no-reply@hubifyhomesonline.com";
                  const firstName = (prospect as any).firstName || ((prospect as any).name || "").split(" ")[0] || "there";
                  const orgName = (prospect as any).company || (prospect as any).name || "your organization";
                  await resend.emails.send({
                    from: fromEmail,
                    replyTo: "contact@hubifyhomes.com",
                    to: prospectEmail,
                    subject: "Payment received — your Hubify workspace is being set up",
                    html: buildPaymentReceiptEmail({
                      firstName,
                      orgName,
                      amountCents: session.amount_total ?? 0,
                      currency: session.currency ?? "usd",
                      paidAt: now,
                    }),
                  });
                  await db.update(onboardingProspects).set({
                    paymentReceiptEmailSentAt: now,
                  } as any).where(eq(onboardingProspects.id, prospect.id));
                  console.log(`[beta-onboarding-webhook] Payment receipt sent to ${prospectEmail}`);
                }
              } catch (emailErr) {
                console.error(`[beta-onboarding-webhook] Failed to send payment receipt to ${prospectEmail}:`, emailErr);
              }
            }
          }
          console.log(`[beta-onboarding-webhook] Payment confirmed for prospect ${prospect.id} — starting provisioning`);

          // Auto-provision the org immediately after payment (idempotent — safe to retry)
          const baseUrl = `${req.protocol}://${req.get("host")}`;
          try {
            const { provisionBetaOrg } = await import("./betaProvisioning");
            await provisionBetaOrg(prospect.id, baseUrl, {
              stripeCustomerId: session.customer ?? null,
              stripeSubscriptionId: session.subscription ?? null,
            });
            console.log(`[beta-onboarding-webhook] Provisioning complete for prospect ${prospect.id}`);
          } catch (provisionErr) {
            console.error(`[beta-onboarding-webhook] Provisioning failed for prospect ${prospect.id}:`, provisionErr);
            // Mark failure — do NOT throw so Stripe gets 200 and won't retry
            try {
              await db.update(onboardingProspects).set({
                stage: "provisioning_failed",
                provisioningFailed: true,
                provisioningError: String(provisionErr),
              } as any).where(eq(onboardingProspects.id, prospect.id));
            } catch (dbErr) {
              console.error("[beta-onboarding-webhook] Failed to persist provisioning error:", dbErr);
            }
          }
        }
      }
    }

    // Always return 200 so Stripe won't retry for application-level issues
    res.json({ received: true });
  } catch (error) {
    console.error("[beta-onboarding-webhook] Signature/parse error:", error);
    // Only return 400 for signature verification failures (legitimate reason to retry)
    res.status(400).json({ message: `Webhook Error: ${(error as Error).message}` });
  }
});

app.post("/api/stripe/webhooks/org/:orgId", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const { orgId } = req.params;
    const { getOrgStripe, handleOrgWebhook } = await import("./stripe");
    const { storage } = await import("./storage");

    // DB-stored secret takes priority over env vars — enables full self-serve per org
    const connection = await storage.getOrgStripeConnection(orgId);
    const sig = req.headers["stripe-signature"];
    const webhookSecret =
      connection?.stripeWebhookSecret ||
      process.env[`STRIPE_ORG_WEBHOOK_SECRET_${orgId}`] ||
      process.env.STRIPE_ORG_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      return res.status(400).json({
        message:
          "Webhook secret not configured. Add your Stripe webhook signing secret in Settings → Stripe → Webhooks.",
      });
    }

    const orgStripeConnection = await getOrgStripe(orgId);
    if (!orgStripeConnection) {
      return res.status(404).json({ message: "Organization Stripe connection not found or inactive" });
    }

    // constructEvent is pure HMAC-SHA256 — no Stripe API call needed
    const event = orgStripeConnection.stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    await handleOrgWebhook(event, orgId);
    res.json({ received: true });
  } catch (error) {
    console.error("Organization webhook error:", error);
    res.status(400).json({ message: `Webhook Error: ${(error as Error).message}` });
  }
});

// Stripe Connect return/refresh callbacks are registered inside registerRoutes()
// so they run behind the global API auth gate with isAuthenticated guards.

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Tenant subdomain resolution — runs on every request before any route
app.use(tenantMiddleware);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Ensure the session table exists before the session middleware initialises
  // the connect-pg-simple store. We use our own idempotent DDL (with
  // IF NOT EXISTS on both table and index) rather than connect-pg-simple's
  // createTableIfMissing, which crashes when the index already exists.
  try {
    const { ensureSessionTable, ensureOnboardingProspectsTable, ensureOnboardingEnhancements } = await import('./runMigrations.js');
    await ensureSessionTable();
    // Ensure the prospects table exists BEFORE the enhancement migration runs
    // ALTER TABLE statements so they never fail on a fresh database.
    await ensureOnboardingProspectsTable();
    await ensureOnboardingEnhancements();
  } catch (err) {
    console.error('Error ensuring session table:', err);
  }

  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Persist 5xx errors to the error_logs table for Super Admin monitoring
    if (status >= 500) {
      const user = (req as any).user;
      logError({
        level: "error",
        source: "server",
        route: req.path,
        method: req.method,
        statusCode: status,
        message,
        stack: err?.stack,
        userId: user?.claims?.sub || user?.id,
        orgId: user?.claims?.orgId || user?.orgId,
        ip: req.ip || (req.headers["x-forwarded-for"] as string),
        metadata: { url: req.originalUrl },
      });
    }

    // Guard against double-send (e.g. async session-save errors arriving
    // after the route handler already flushed a response).
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  // Capture uncaught process-level errors
  process.on("uncaughtException", (err: Error) => {
    logError({ level: "critical", source: "unhandled", message: err.message, stack: err.stack });
    console.error("[UNCAUGHT EXCEPTION]", err);
  });
  process.on("unhandledRejection", (reason: any) => {
    logError({ level: "critical", source: "unhandled", message: String(reason?.message ?? reason), stack: reason?.stack });
    console.error("[UNHANDLED REJECTION]", reason);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Serve content-addressed Vite assets (/assets/*.js, /assets/*.css, etc.)
    // with long-lived immutable cache headers.  fallthrough:false means a
    // request for a file that no longer exists (e.g. an old bundle hash cached
    // by Safari) returns 404 instead of falling through to the SPA catch-all
    // and receiving index.html as if it were JavaScript.
    const assetsDir = path.resolve(import.meta.dirname, "public", "assets");
    if (fs.existsSync(assetsDir)) {
      app.use(
        "/assets",
        express.static(assetsDir, {
          maxAge: "1y",
          immutable: true,
          fallthrough: false,
        }),
      );
    }

    // Force browsers to always fetch a fresh copy of index.html.
    // "public, max-age=0" allows Safari to serve a cached copy without
    // revalidating in some navigation paths, which can load a stale bundle
    // reference that 404s → no JS → blank page.  "no-store" prevents all
    // caching of the HTML shell.  The send/sendFile modules only set
    // Cache-Control when the header is absent, so this survives serveStatic.
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (
        req.method === "GET" &&
        !req.path.startsWith("/api") &&
        !req.path.startsWith("/assets")
      ) {
        res.setHeader("Cache-Control", "no-store");
      }
      next();
    });

    serveStatic(app);
  }

  // Bind to process.env.PORT for Render/cloud compatibility; fall back to 5000 for Replit
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);

    // Ensure the outbound-webhook tables exist (targeted, idempotent).
    // Without this the dispatcher logs an error on every task mutation in
    // environments where the webhook integration was never provisioned.
    try {
      const { ensureWebhookTables, ensureCookieConsentPreferenceColumn, ensureOnboardingProspectsTable, ensureInvoiceReceiptColumns, ensureOrgSignupTokensTable, ensureErrorLogsTable, ensureDiscountCodeUsagesTable, ensureProspectDiscountCodeColumn, ensureStaffPasswordHashColumn, ensureSubmissionColumns, ensureProspectConfirmationEmailTemplateTable, ensureTrialColumns, ensureProspectConfirmationEmailColumns, ensureOrganizationServicesTable, ensureDemoProspectColumns, ensureOrgSetupProgressTable, ensureProspectConvertedAtColumn, ensurePropertyServiceAssignmentsTable, ensureBetaProspectColumns } = await import('./runMigrations.js');
      try {
        await ensureWebhookTables();
      } catch (err) {
        console.error('Error ensuring webhook tables:', err);
      }
      try {
        await ensureCookieConsentPreferenceColumn();
      } catch (err) {
        console.error('Error ensuring cookie-consent preference column:', err);
      }
      try {
        await ensureOnboardingProspectsTable();
      } catch (err) {
        console.error('Error ensuring onboarding_prospects table:', err);
      }
      try {
        await ensureInvoiceReceiptColumns();
      } catch (err) {
        console.error('Error ensuring invoice receipt columns:', err);
      }
      try {
        await ensureOrgSignupTokensTable();
      } catch (err) {
        console.error('Error ensuring org_signup_tokens table:', err);
      }
      try {
        await ensureErrorLogsTable();
      } catch (err) {
        console.error('Error ensuring error_logs table:', err);
      }
      try {
        await ensureDiscountCodeUsagesTable();
      } catch (err) {
        console.error('Error ensuring discount_code_usages table:', err);
      }
      try {
        await ensureProspectDiscountCodeColumn();
      } catch (err) {
        console.error('Error ensuring discount_code column on onboarding_prospects:', err);
      }
      try {
        await ensureStaffPasswordHashColumn();
      } catch (err) {
        console.error('Error ensuring password_hash column on users:', err);
      }
      try {
        await ensureSubmissionColumns();
      } catch (err) {
        console.error('Error ensuring submission columns on onboarding_prospects:', err);
      }
      try {
        await ensureProspectConfirmationEmailTemplateTable();
      } catch (err) {
        console.error('Error ensuring prospect_confirmation_email_template table:', err);
      }
      try {
        await ensureTrialColumns();
      } catch (err) {
        console.error('Error ensuring trial columns on onboarding_prospects:', err);
      }
      try {
        await ensureProspectConfirmationEmailColumns();
      } catch (err) {
        console.error('Error ensuring confirmation email columns on onboarding_prospects:', err);
      }
      try {
        await ensureOrganizationServicesTable();
      } catch (err) {
        console.error('Error ensuring organization_services table:', err);
      }
      try {
        await ensureDemoProspectColumns();
      } catch (err) {
        console.error('Error ensuring demo columns on onboarding_prospects:', err);
      }
      try {
        const { ensureOrgSlugAndStatusColumns } = await import('./runMigrations.js');
        await ensureOrgSlugAndStatusColumns();
      } catch (err) {
        console.error('Error ensuring orgs slug/status columns:', err);
      }
      try {
        await ensureOrgSetupProgressTable();
      } catch (err) {
        console.error('Error ensuring org_setup_progress table:', err);
      }
      try {
        await ensureProspectConvertedAtColumn();
      } catch (err) {
        console.error('Error ensuring converted_at column on onboarding_prospects:', err);
      }
      try {
        await ensurePropertyServiceAssignmentsTable();
      } catch (err) {
        console.error('Error ensuring property_service_assignments table:', err);
      }
      try {
        await ensureBetaProspectColumns();
      } catch (err) {
        console.error('Error ensuring beta columns on onboarding_prospects:', err);
      }
      try {
        const { ensurePortalInvitationColumns } = await import('./runMigrations.js');
        await ensurePortalInvitationColumns();
      } catch (err) {
        console.error('Error ensuring portal_invitations columns:', err);
      }
      try {
        const { ensureBetaApprovalColumns } = await import('./runMigrations.js');
        await ensureBetaApprovalColumns();
      } catch (err) {
        console.error('Error ensuring beta approval columns on onboarding_prospects:', err);
      }
      try {
        const { ensureBetaApprovalEmailColumns } = await import('./runMigrations.js');
        await ensureBetaApprovalEmailColumns();
      } catch (err) {
        console.error('Error ensuring beta approval email columns on onboarding_prospects:', err);
      }
      try {
        const { ensureAgreementSignatureColumns } = await import('./runMigrations.js');
        await ensureAgreementSignatureColumns();
      } catch (err) {
        console.error('Error ensuring agreement signature columns on onboarding_prospects:', err);
      }
      try {
        const { ensurePaymentSetupColumns } = await import('./runMigrations.js');
        await ensurePaymentSetupColumns();
      } catch (err) {
        console.error('Error ensuring payment setup columns on onboarding_prospects:', err);
      }
      try {
        const { ensureOnboardingTrackerColumns } = await import('./runMigrations.js');
        await ensureOnboardingTrackerColumns();
      } catch (err) {
        console.error('Error ensuring tracker columns on onboarding_prospects:', err);
      }
      try {
        const { ensureStripeWebhookSecretColumn } = await import('./runMigrations.js');
        await ensureStripeWebhookSecretColumn();
      } catch (err) {
        console.error('Error ensuring stripe_webhook_secret column:', err);
      }
      try {
        const { ensureApprovalEmailTrackingColumns } = await import('./runMigrations.js');
        await ensureApprovalEmailTrackingColumns();
      } catch (err) {
        console.error('Error ensuring approval email tracking columns:', err);
      }
      try {
        const { ensureAgreementMetadataColumns } = await import('./runMigrations.js');
        await ensureAgreementMetadataColumns();
      } catch (err) {
        console.error('Error ensuring agreement metadata columns:', err);
      }
      try {
        const { ensureAgreementEmailTrackingColumns } = await import('./runMigrations.js');
        await ensureAgreementEmailTrackingColumns();
      } catch (err) {
        console.error('Error ensuring agreement email tracking columns:', err);
      }
      try {
        const { ensureAgreementAcceptancesTable } = await import('./runMigrations.js');
        await ensureAgreementAcceptancesTable();
      } catch (err) {
        console.error('Error ensuring agreement_acceptances table:', err);
      }
      try {
        const { ensureBillingLifecycleColumns } = await import('./runMigrations.js');
        await ensureBillingLifecycleColumns();
      } catch (err) {
        console.error('Error ensuring billing lifecycle columns:', err);
      }
      try {
        const { ensureProspectAgreementVersionColumns } = await import('./runMigrations.js');
        await ensureProspectAgreementVersionColumns();
      } catch (err) {
        console.error('Error ensuring prospect agreement version columns:', err);
      }
      try {
        const { ensureTimeEntryV1Columns } = await import('./runMigrations.js');
        await ensureTimeEntryV1Columns();
      } catch (err) {
        console.error('Error ensuring time entry V1 columns:', err);
      }
      try {
        const { ensureClientInvoiceRefundColumns } = await import('./runMigrations.js');
        await ensureClientInvoiceRefundColumns();
      } catch (err) {
        console.error('Error ensuring client invoice refund columns:', err);
      }
      try {
        const { ensureOrgSubscriptionSetupFeeColumn } = await import('./runMigrations.js');
        await ensureOrgSubscriptionSetupFeeColumn();
      } catch (err) {
        console.error('Error ensuring org_subscriptions.setup_fee_cents column:', err);
      }
      try {
        const { ensureDispatchCenterTables } = await import('./runMigrations.js');
        await ensureDispatchCenterTables();
      } catch (err) {
        console.error('Error ensuring Dispatch Center tables:', err);
      }
      try {
        const { ensureReviewAutomationTables } = await import('./runMigrations.js');
        await ensureReviewAutomationTables();
      } catch (err) {
        console.error('Error ensuring Review Automation tables:', err);
      }
      try {
        const { ensureInspectionV1Tables } = await import('./runMigrations.js');
        await ensureInspectionV1Tables();
      } catch (err) {
        console.error('Error ensuring Inspection V1 tables:', err);
      }
      try {
        const { ensureBetaProvisioningTables } = await import('./runMigrations.js');
        await ensureBetaProvisioningTables();
      } catch (err) {
        console.error('Error ensuring beta provisioning tables:', err);
      }
      try {
        const { ensureProspectWorkspaceSlugColumn } = await import('./runMigrations.js');
        await ensureProspectWorkspaceSlugColumn();
      } catch (err) {
        console.error('Error ensuring prospect workspace_slug column:', err);
      }
      try {
        const { ensureProspectAccountPasswordHashColumn } = await import('./runMigrations.js');
        await ensureProspectAccountPasswordHashColumn();
      } catch (err) {
        console.error('Error ensuring prospect account_password_hash column:', err);
      }
      try {
        const { ensureMultiTenancyOrgIdColumns } = await import('./runMigrations.js');
        await ensureMultiTenancyOrgIdColumns();
      } catch (err) {
        console.error('Error ensuring multi-tenancy org_id columns:', err);
      }
      try {
        const { ensurePaymentReceiptEmailColumn } = await import('./runMigrations.js');
        await ensurePaymentReceiptEmailColumn();
      } catch (err) {
        console.error('Error ensuring payment_receipt_email_sent_at column:', err);
      }
      try {
        const { ensureRoomSupplyIntervalColumn } = await import('./runMigrations.js');
        await ensureRoomSupplyIntervalColumn();
      } catch (err) {
        console.error('Error ensuring room_supplies.replacement_interval_days column:', err);
      }
      try {
        const { ensureDispatchStopActualTimeColumns } = await import('./runMigrations.js');
        await ensureDispatchStopActualTimeColumns();
      } catch (err) {
        console.error('Error ensuring dispatch stop actual time columns:', err);
      }
      try {
        const { ensureAccountSetupTokenProspectNullable } = await import('./runMigrations.js');
        await ensureAccountSetupTokenProspectNullable();
      } catch (err) {
        console.error('Error making account_setup_tokens.prospect_id nullable:', err);
      }
      try {
        const { ensureCommunityHoaPresidentIdColumn } = await import('./runMigrations.js');
        await ensureCommunityHoaPresidentIdColumn();
      } catch (err) {
        console.error('Error ensuring communities.hoa_president_id column:', err);
      }
    } catch (error) {
      console.error('Error loading startup migrations:', error);
    }

    // Initialize platform master admin (ADMIN_EMAIL / ADMIN_PASSWORD)
    try {
      const { ensurePlatformAdminsTable, initializePlatformAdmin } = await import('./masterAdmin.js');
      await ensurePlatformAdminsTable();
      await initializePlatformAdmin();
    } catch (err) {
      console.error('Error initializing platform admin:', err);
    }

    // Start scheduled background tasks
    startScheduledTasks();
    
    // Initialize default test organization (only creates if not exists)
    try {
      const { initializeDefaultOrganization } = await import('./seedOrgs.js');
      await initializeDefaultOrganization();
    } catch (error) {
      console.error('Error initializing default organization:', error);
    }
    
    // Initialize default platform templates (only creates if not exists)
    try {
      const { initializeTemplates } = await import('./seedTemplates.js');
      await initializeTemplates();
    } catch (error) {
      console.error('Error initializing templates:', error);
    }

    // Seed default stage email templates (insert-only, never overwrites customized content)
    try {
      const { initializeStageEmailTemplates } = await import('./seedTemplates.js');
      await initializeStageEmailTemplates();
    } catch (error) {
      console.error('Error initializing stage email templates:', error);
    }

    // Encryption canary check — alert admin by email if key mismatch is detected
    try {
      await checkEncryptionCanaryAndAlert();
    } catch (error) {
      console.error('[startup] Error during encryption canary check:', error);
    }

    // DDL migrations that need to run but cannot block startup (Neon suspends
    // its endpoint after inactivity; it only wakes once real traffic arrives).
    // Fire-and-forget: retry in the background until the DB is reachable.
    const runDdlBackground = (label: string, query: any, delayMs = 10000) => {
      const attempt = async () => {
        try {
          await db.execute(query);
          log(`[MIGRATE] ${label} verified.`);
        } catch (err: any) {
          const msg: string = err?.message ?? String(err);
          const isTransient = msg.includes('endpoint has been disabled') ||
                              msg.includes('Connection terminated') ||
                              msg.includes('ECONNRESET');
          if (isTransient) {
            setTimeout(attempt, delayMs);
          } else {
            console.error(`[MIGRATE] ${label} failed permanently:`, msg);
          }
        }
      };
      // Start first attempt after a short delay to let traffic warm the DB
      setTimeout(attempt, 5000);
    };

    runDdlBackground(
      'communities.hoa_president_id',
      sql`ALTER TABLE communities ADD COLUMN IF NOT EXISTS hoa_president_id VARCHAR REFERENCES users(id) ON DELETE SET NULL`
    );
    runDdlBackground(
      'account_setup_tokens.prospect_id nullable',
      sql`ALTER TABLE account_setup_tokens ALTER COLUMN prospect_id DROP NOT NULL`
    );
  });
})();
