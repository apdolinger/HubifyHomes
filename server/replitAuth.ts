import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

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
  
  // Use memory store for development to avoid PostgreSQL session issues
  return session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  // Spread into a new plain object so we can add orgId/role without hitting a frozen JWT object
  user.claims = { ...tokens.claims() };
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  const orgId = claims["orgId"] || claims["org_id"] || null;
  const userData: any = {
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"] || null,
    role: claims["role"] || "staff",
  };
  // Only include orgId if explicitly provided in claims (avoid overwriting existing DB value with null)
  if (orgId) {
    userData.orgId = orgId;
  }
  
  console.log('[OIDC] Upserting user with data:', {
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

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const claims = tokens.claims();
    const user: any = {
      id: claims["sub"], // Add user ID for session tracking
    };
    updateUserSession(user, tokens);
    
    try {
      console.log('[OIDC] Attempting to upsert user:', claims["sub"]);
      await upsertUser(claims);
      console.log('[OIDC] User upserted successfully');
      
      // Fetch user from database to get orgId and role
      let dbUser = await storage.getUser(claims["sub"]);
      console.log('[OIDC] Fetched user from database:', dbUser ? 'found' : 'not found');
      if (dbUser) {
        // If user doesn't have an orgId, assign them to a default organization (DEV ONLY)
        if (!dbUser.orgId) {
          // SECURITY: Only auto-assign users to organizations in development mode
          // In production, users must be explicitly invited and assigned to an organization
          if (process.env.NODE_ENV !== 'production') {
            console.log('[OIDC] User has no orgId, assigning to default organization (DEV MODE)');
            
            // Use the seeded default organization (always created with this fixed ID by seedOrgs.ts)
            const SEEDED_DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';
            let defaultOrg = await storage.getOrg(SEEDED_DEFAULT_ORG_ID);

            if (!defaultOrg) {
              // Fall back: any existing active org
              const allOrgs = await storage.getOrgs();
              defaultOrg = allOrgs[0];
            }

            if (!defaultOrg) {
              // Last resort: create a fallback org
              defaultOrg = await storage.createOrg({
                name: 'Default Organization',
                contactEmail: dbUser.email || 'test@hubify.com',
                tier: 'premium',
                status: 'active'
              });
              console.log('[OIDC] Created Default Organization:', defaultOrg.id);
            }
            
            // Update user with orgId
            await storage.updateUser(dbUser.id, { orgId: defaultOrg.id });
            dbUser = await storage.getUser(claims["sub"]);
            console.log('[OIDC] User assigned to default organization:', defaultOrg.name, defaultOrg.id);
          } else {
            // In production, log error and continue without orgId
            // The user will need to be invited to an organization
            console.error('[OIDC] Production user missing orgId - user must be invited to an organization:', claims["sub"]);
          }
        }
        
        // Add orgId and role from database to session claims
        user.claims.orgId = dbUser.orgId;
        user.claims.role = dbUser.role;
        console.log('[OIDC] User session claims updated:', {
          sub: claims["sub"],
          orgId: user.claims.orgId,
          role: user.claims.role,
        });
      } else {
        console.error('[OIDC] ERROR: User not found in database after upsert:', claims["sub"]);
        console.error('[OIDC] This should not happen - upsertUser should have created the user');
      }
    } catch (error) {
      console.error('[OIDC] CRITICAL ERROR upserting user:', error);
      console.error('[OIDC] User claims:', JSON.stringify(claims, null, 2));
      // Continue anyway - user session will still work with just claims
    }
    
    console.log('[OIDC] Final user object for session:', {
      id: user.id,
      claimsRole: user.claims.role,
      claimsOrgId: user.claims.orgId,
    });
    
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

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
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Check if user is authenticated via passport
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as any;
  
  // Check if user object has required data
  if (!user || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // If orgId or role is missing from session claims, look up from DB
  // This handles cases where the session was created without these fields
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
        // Non-critical: proceed without orgId lookup
      }
    }
  }

  // Check if token is still valid
  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  // Token expired, try to refresh
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    // Re-apply orgId and role after token refresh (updateUserSession resets claims)
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
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
