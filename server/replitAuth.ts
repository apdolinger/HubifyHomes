import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { log } from "./vite";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET environment variable is required in production."
      );
    }
    log("[SESSION] WARNING: SESSION_SECRET not set — using insecure dev default.");
  }

  const sessionConfig: session.SessionOptions = {
    secret: secret || "dev-insecure-secret-do-not-use-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: sessionTtl,
    },
  };

  if (process.env.DATABASE_URL) {
    const PgSession = connectPg(session);
    sessionConfig.store = new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: "session",
      createTableIfMissing: false,
      ttl: sessionTtl / 1000,
    });
    log("[SESSION] Using PostgreSQL session store.");
  }

  return session(sessionConfig);
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Staff email+password login
  app.post("/api/staff/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
      }

      const user = await storage.getUserByEmail(String(email).toLowerCase().trim());
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      if (!user.passwordHash) {
        return res.status(401).json({ message: "No password set for this account. Contact your administrator." });
      }

      const valid = await bcrypt.compare(String(password), user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      (req.session as any).staffUser = {
        id: user.id,
        email: user.email,
        orgId: user.orgId,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      };

      await storage.updateUser(user.id, { lastActiveAt: new Date() });
      log(`[AUTH] Staff login: ${user.email} (${user.role})`);
      res.json({ ok: true });
    } catch (error) {
      console.error("[AUTH] Staff login error:", error);
      res.status(500).json({ message: "Login failed." });
    }
  });

  // Staff logout (POST)
  app.post("/api/staff/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  // GET /api/logout — kept for backward-compat (links, bookmarks)
  app.get("/api/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/staff/login"));
  });

  // GET /api/login — redirect gracefully instead of returning 503
  app.get("/api/login", (_req, res) => res.redirect("/staff/login"));
  app.get("/api/callback", (_req, res) => res.redirect("/"));

  // ---------------------------------------------------------------
  // One-time password setup — guarded by ADMIN_PASSWORD env var.
  //
  // Use this to set the initial password for any staff account on Render:
  //
  //   curl -X POST https://hubifyhomesonline.com/api/staff/setup-password \
  //     -H "Content-Type: application/json" \
  //     -d '{"adminPassword":"<ADMIN_PASSWORD>","email":"you@example.com","newPassword":"YourNewPass1!"}'
  //
  // The endpoint is disabled once you no longer call it — no UI exposure.
  // ---------------------------------------------------------------
  app.post("/api/staff/setup-password", async (req, res) => {
    try {
      const { adminPassword, email, newPassword } = req.body;
      const expected = process.env.ADMIN_PASSWORD;
      if (!expected || String(adminPassword) !== expected) {
        return res.status(403).json({ message: "Forbidden." });
      }
      if (!email || !newPassword || String(newPassword).length < 8) {
        return res.status(400).json({ message: "email and newPassword (min 8 chars) are required." });
      }

      const user = await storage.getUserByEmail(String(email).toLowerCase().trim());
      if (!user) {
        return res.status(404).json({ message: "No staff user found with that email." });
      }

      const hash = await bcrypt.hash(String(newPassword), 12);
      await storage.updateUser(user.id, { passwordHash: hash });

      log(`[AUTH] Password set for staff user: ${user.email}`);
      res.json({ ok: true, message: `Password set for ${user.email} (role: ${user.role})` });
    } catch (error) {
      console.error("[AUTH] setup-password error:", error);
      res.status(500).json({ message: "Failed to set password." });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const staffUser = (req.session as any)?.staffUser;
  if (!staffUser?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Populate req.user in the shape the rest of the app expects
  (req as any).user = {
    id: staffUser.id,
    claims: {
      sub: staffUser.id,
      orgId: staffUser.orgId,
      role: staffUser.role,
      email: staffUser.email,
      first_name: staffUser.firstName,
      last_name: staffUser.lastName,
    },
    expires_at: Infinity,
  };

  return next();
};
