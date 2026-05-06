# Deploying Hubify to Render

## Overview

Hubify is a full-stack Node.js + React application. The server serves both the Express API and the built React frontend from a single process.

---

## Required Environment Variables

Set all of these in your Render service's **Environment** tab.

### Core (required)

| Variable | Description |
|---|---|
| `NODE_ENV` | Set to `production` |
| `DATABASE_URL` | PostgreSQL connection string (Neon or any Postgres provider) |
| `SESSION_SECRET` | Long random string for session encryption (generate with `openssl rand -hex 64`) |

### Master Admin (required for platform access)

| Variable | Description |
|---|---|
| `ADMIN_EMAIL` | Email address for the master admin account |
| `ADMIN_PASSWORD` | Password for the master admin account (auto-hashed with bcrypt on first boot) |

> **Note:** On first boot, Hubify creates the master admin account in the database automatically. To rotate the password: delete the row from `platform_admins` and redeploy.

### Super Admin Panel (optional — alternative credentials)

| Variable | Description |
|---|---|
| `SUPER_ADMIN_USERNAME` | Username for the legacy super admin login |
| `SUPER_ADMIN_PASSWORD` | Password for the legacy super admin login |

### Email (optional but recommended)

| Variable | Description |
|---|---|
| `SENDGRID_API_KEY` | SendGrid API key for transactional email |
| `SUPPORT_EMAIL_FROM` | From address for outbound emails (e.g. `noreply@yourdomain.com`) |

### Payments (optional)

| Variable | Description |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret key for billing features |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (master account) |
| `STRIPE_ORG_WEBHOOK_SECRET` | Stripe webhook signing secret (per-org, if using Connect) |

### AI Features (optional)

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI key for AI-powered field mapping in the import manager |

### Replit Auth (only if deploying on Replit)

| Variable | Description |
|---|---|
| `REPL_ID` | Your Replit application ID |
| `REPLIT_DOMAINS` | Comma-separated list of allowed domains |
| `ISSUER_URL` | OIDC issuer URL (defaults to `https://replit.com/oidc`) |

> If `REPLIT_DOMAINS` is not set, Replit OIDC login is disabled and the app runs in standalone mode. Staff must be created via the database directly or a future invite flow.

### Object Storage (Replit only)

| Variable | Description |
|---|---|
| `PUBLIC_OBJECT_SEARCH_PATHS` | Replit object storage public paths |
| `PRIVATE_OBJECT_DIR` | Replit object storage private directory |

> File upload features (form attachments, community documents) require Replit's managed object storage. These features return errors on non-Replit deployments.

---

## Render Service Configuration

### Build Command

```
npm install && npm run build
```

### Start Command

```
npm start
```

`npm start` runs `NODE_ENV=production node dist/index.js`, which serves the compiled backend and pre-built React frontend from the same port.

### Health Check Path

```
/
```

### Port

Render automatically sets the `PORT` environment variable. Hubify reads `process.env.PORT` with a fallback to `5000`. No configuration needed.

---

## Database

Hubify requires a PostgreSQL database. We recommend **Neon** (serverless Postgres) which is what the app is built for.

### Recommended: Neon

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string and set it as `DATABASE_URL`
3. The connection string format: `postgresql://user:password@host/dbname?sslmode=require`

### Schema / Migrations

Hubify uses Drizzle ORM and runs startup migrations automatically. On first boot:

- All core tables are created via `drizzle-kit push` (run once before starting)
- Supplementary tables (webhooks, cookie consent, onboarding pipeline, platform admins, sessions) are created idempotently at boot time

**Before first deployment, run:**

```bash
DATABASE_URL=<your-connection-string> npx drizzle-kit push --force
```

Or set it as an environment variable in a Render **pre-deploy command**.

---

## Security Notes

- Sessions are stored in PostgreSQL in production (not in-memory) — automatically configured when `DATABASE_URL` is set and `NODE_ENV=production`
- All cookies are `httpOnly`, `secure`, and `sameSite: strict` in production
- Rate limiting is applied to all API routes (200 req / 15 min) and stricter limits on auth routes (10 req / 15 min)
- Helmet security headers are enabled in production
- Never commit `ADMIN_PASSWORD`, `SESSION_SECRET`, or any API keys to source control

---

## First-Deployment Checklist

1. [ ] Create a Neon (or other Postgres) database
2. [ ] Set all required environment variables in Render
3. [ ] Run `npx drizzle-kit push --force` against the production database (once)
4. [ ] Deploy the service
5. [ ] Visit `https://your-app.onrender.com/super-admin/login`
6. [ ] Log in with `ADMIN_EMAIL` + `ADMIN_PASSWORD`
7. [ ] Create your first organization and invite staff users

---

## Limitations on Render vs Replit

| Feature | Replit | Render |
|---|---|---|
| Staff login (Replit OIDC) | ✅ | ❌ (requires Replit) |
| Portal login (email/password) | ✅ | ✅ |
| Super Admin login | ✅ | ✅ |
| File uploads | ✅ (Replit Object Storage) | ❌ (returns error) |
| Stripe billing | ✅ | ✅ |
| Email (SendGrid) | ✅ | ✅ |
| Database | ✅ | ✅ |
| Scheduled tasks | ✅ | ✅ |
