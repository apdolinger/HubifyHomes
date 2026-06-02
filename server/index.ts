import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startScheduledTasks } from "./scheduledTasks";
import { logError } from "./errorLogger";
import { tenantMiddleware } from "./tenantMiddleware";

const app = express();

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
          console.log(`[beta-onboarding-webhook] Payment confirmed for prospect ${prospect.id}`);
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("[beta-onboarding-webhook] Error:", error);
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

// Stripe Connect return URL — Stripe bounces the browser here after onboarding completes
app.get("/api/orgs/:orgId/stripe-connect/return", async (req, res) => {
  try {
    const { orgId } = req.params;
    const { storage } = await import("./storage");
    const { getMasterStripe } = await import("./stripe");

    const connection = await storage.getOrgStripeConnection(orgId);
    if (!connection?.stripeAccountId) {
      return res.redirect("/settings/stripe?error=no_account");
    }

    const stripe = getMasterStripe();
    const account = await stripe.accounts.retrieve(connection.stripeAccountId);

    await storage.updateOrgStripeConnection(orgId, {
      isActive: account.charges_enabled || account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      lastSyncedAt: new Date(),
    });

    const success = account.charges_enabled || account.details_submitted;
    res.redirect(`/settings/stripe?${success ? "connected=true" : "onboarding=incomplete"}`);
  } catch (error) {
    console.error("Connect return error:", error);
    res.redirect("/settings/stripe?error=verification_failed");
  }
});

// Stripe Connect refresh URL — re-generates the onboarding link when user abandoned or link expired
app.get("/api/orgs/:orgId/stripe-connect/refresh", async (req, res) => {
  try {
    const { orgId } = req.params;
    const { storage } = await import("./storage");
    const { createStripeConnectAccountLink } = await import("./stripe");

    const connection = await storage.getOrgStripeConnection(orgId);
    if (!connection?.stripeAccountId) {
      return res.redirect("/settings/stripe?error=no_account");
    }

    const host = `${req.protocol}://${req.get("host")}`;
    const returnUrl = `${host}/api/orgs/${orgId}/stripe-connect/return`;
    const refreshUrl = `${host}/api/orgs/${orgId}/stripe-connect/refresh`;

    const accountLink = await createStripeConnectAccountLink(
      connection.stripeAccountId,
      returnUrl,
      refreshUrl
    );
    res.redirect(accountLink.url);
  } catch (error) {
    console.error("Connect refresh error:", error);
    res.redirect("/settings/stripe?error=refresh_failed");
  }
});

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
  });
})();
