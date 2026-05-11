import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { log } from "./vite";

const replitEnabled = !!process.env.REPLIT_DOMAINS;

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week

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

  // Use PostgreSQL session store when DATABASE_URL is available (dev or prod)
  // so sessions survive server restarts. We pre-create the table ourselves
  // (with IF NOT EXISTS on both table and index) rather than using
  // createTableIfMissing, which omits IF NOT EXISTS on the index and throws
  // when the index already exists in the database.
  if (process.env.DATABASE_URL) {
    const PgSession = connectPg(session);
    sessionConfig.store = new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: "session",
      createTableIfMissing: false, // we create it ourselves below
      ttl: sessionTtl / 1000,
    });
    log("[SESSION] Using PostgreSQL session store.");
  }

  return session(sessionConfig);
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = { ...tokens.claims() };
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  const orgId = claims["orgId"] || claims["org_id"] || null;
  const userData: any = {
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"] || null,
    role: claims["role"] || "staff",
  };
  if (orgId) {
    userData.orgId = orgId;
  }

  console.log("[OIDC] Upserting user with data:", {
    id: userData.id,
    email: userData.email,
    role: userData.role,
    orgId: userData.orgId,
  });

  await storage.upsertUser(userData);
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  if (!replitEnabled) {
    log(
      "[AUTH] REPLIT_DOMAINS not set — Replit OIDC is disabled. " +
        "Staff login via Replit is unavailable. " +
        "Use /api/super-admin/login with ADMIN_EMAIL + ADMIN_PASSWORD for platform access."
    );
    // Provide stub routes so the app doesn't 404
    app.get("/api/login", (_req, res) =>
      res
        .status(503)
        .json({ message: "Replit OIDC not configured on this deployment." })
    );
    app.get("/api/callback", (_req, res) => res.redirect("/"));
    app.get("/api/logout", (req, res) => {
      req.logout(() => res.redirect("/"));
    });
    return;
  }

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const claims = tokens.claims();
    const user: any = {
      id: claims["sub"],
    };
    updateUserSession(user, tokens);

    try {
      console.log("[OIDC] Attempting to upsert user:", claims["sub"]);
      await upsertUser(claims);
      console.log("[OIDC] User upserted successfully");

      let dbUser = await storage.getUser(claims["sub"]);
      console.log("[OIDC] Fetched user from database:", dbUser ? "found" : "not found");
      if (dbUser) {
        if (!dbUser.orgId) {
          if (process.env.NODE_ENV !== "production") {
            console.log("[OIDC] User has no orgId, assigning to default organization (DEV MODE)");
            const SEEDED_DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";
            let defaultOrg = await storage.getOrg(SEEDED_DEFAULT_ORG_ID);

            if (!defaultOrg) {
              const allOrgs = await storage.getOrgs();
              defaultOrg = allOrgs[0];
            }

            if (!defaultOrg) {
              defaultOrg = await storage.createOrg({
                name: "Default Organization",
                contactEmail: dbUser.email || "test@hubify.com",
                tier: "premium",
                status: "active",
              });
              console.log("[OIDC] Created Default Organization:", defaultOrg.id);
            }

            await storage.updateUser(dbUser.id, { orgId: defaultOrg.id });
            dbUser = await storage.getUser(claims["sub"]);
            console.log("[OIDC] User assigned to default organization:", defaultOrg?.name, defaultOrg?.id);
          } else {
            console.error(
              "[OIDC] Production user missing orgId - user must be invited to an organization:",
              claims["sub"]
            );
          }
        }

        user.claims.orgId = dbUser?.orgId;
        user.claims.role = dbUser?.role;
        console.log("[OIDC] User session claims updated:", {
          sub: claims["sub"],
          orgId: user.claims.orgId,
          role: user.claims.role,
        });
      } else {
        console.error("[OIDC] ERROR: User not found in database after upsert:", claims["sub"]);
      }
    } catch (error) {
      console.error("[OIDC] CRITICAL ERROR upserting user:", error);
    }

    console.log("[OIDC] Final user object for session:", {
      id: user.id,
      claimsRole: user.claims.role,
      claimsOrgId: user.claims.orgId,
    });

    verified(null, user);
  };

  for (const domain of process.env.REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify
    );
    passport.use(strategy);
  }

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      if (replitEnabled) {
        getOidcConfig().then((cfg) => {
          res.redirect(
            client
              .buildEndSessionUrl(cfg, {
                client_id: process.env.REPL_ID!,
                post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
              })
              .href
          );
        }).catch(() => res.redirect("/"));
      } else {
        res.redirect("/");
      }
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as any;

  if (!user || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!user.claims?.orgId || !user.claims?.role) {
    const userId = user.claims?.sub || user.id;
    if (userId) {
      try {
        const dbUser = await storage.getUser(userId);
        if (dbUser) {
          if (!user.claims) user.claims = {};
          if (!user.claims.orgId && dbUser.orgId) user.claims.orgId = dbUser.orgId;
          if (!user.claims.role && dbUser.role) user.claims.role = dbUser.role;
        }
      } catch (_) {
        // Non-critical
      }
    }
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken || !replitEnabled) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    if (!user.claims?.orgId) {
      const userId = user.claims?.sub || user.id;
      if (userId) {
        const dbUser = await storage.getUser(userId);
        if (dbUser) {
          if (dbUser.orgId) user.claims.orgId = dbUser.orgId;
          if (dbUser.role) user.claims.role = dbUser.role;
        }
      }
    }
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
