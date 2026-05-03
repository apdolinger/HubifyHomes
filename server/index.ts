import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startScheduledTasks } from "./scheduledTasks";

const app = express();

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
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
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
      const { ensureWebhookTables, ensureCookieConsentPreferenceColumn } = await import('./runMigrations.js');
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
    } catch (error) {
      console.error('Error loading startup migrations:', error);
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
