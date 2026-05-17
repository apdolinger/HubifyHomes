import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startScheduledTasks } from "./scheduledTasks";
import { logError } from "./errorLogger";

const app = express();

// Security headers (production only — skip CSP in dev to keep Vite HMR working)
if (process.env.NODE_ENV === "production") {
  app.use(
    helmet({
      contentSecurityPolicy: false, // configured at the CDN/proxy layer
      crossOriginEmbedderPolicy: false,
    })
  );
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

app.post("/api/stripe/webhooks/org/:orgId", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const { orgId } = req.params;
    const { getOrgStripe, handleOrgWebhook } = await import("./stripe");
    
    const orgStripeConnection = await getOrgStripe(orgId);
    if (!orgStripeConnection) {
      return res.status(404).json({ message: "Organization Stripe connection not found" });
    }

    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env[`STRIPE_ORG_WEBHOOK_SECRET_${orgId}`] || process.env.STRIPE_ORG_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      return res.status(400).json({ message: "Missing signature or webhook secret" });
    }

    const event = orgStripeConnection.stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );

    await handleOrgWebhook(event, orgId);
    res.json({ received: true });
  } catch (error) {
    console.error("Organization webhook error:", error);
    res.status(400).json({ message: `Webhook Error: ${(error as Error).message}` });
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
      const { ensureWebhookTables, ensureCookieConsentPreferenceColumn, ensureOnboardingProspectsTable, ensureInvoiceReceiptColumns, ensureOrgSignupTokensTable, ensureErrorLogsTable } = await import('./runMigrations.js');
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
