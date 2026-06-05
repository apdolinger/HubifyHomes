---
name: Password-auth vs OIDC user object shape
description: req.user structure differs between staff password login and Replit OIDC — defensive access pattern required in all routes
---

## The Rule

Always access user identity fields with a defensive fallback:

```js
const orgId  = req.user?.claims?.orgId  || req.user?.orgId;
const userId = req.user?.claims?.sub    || req.user?.id;
const role   = req.user?.claims?.role   || req.user?.role;
```

**Never** use `req.user.orgId`, `req.user.role`, or `req.user.claims.orgId` alone.

## Why

Hubify has two auth paths:
- **Replit OIDC** (`/api/auth/...`): identity fields live under `req.user.claims.*`
- **Staff password login** (`/api/staff/login`, `server/replitAuth.ts`): fields attached directly as `req.user.orgId`, `req.user.role`, `req.user.id`

Routes that only read `req.user.claims.orgId` silently get `undefined` for password-auth users, causing 400 "Organization ID is required" or DB NOT NULL constraint failures.

## How to Apply

- Every new API route: use the defensive `||` pattern shown above
- Bulk-fix existing routes: `sed -i "s/user\.orgId/user.claims?.orgId || user.orgId/g"` (be careful not to double-replace)
- Dispatch routes (which use the `(req.user as any)` cast): `(req.user as any)?.claims?.orgId || (req.user as any)?.orgId`
- The same issue applies to `userId` (sub vs id) and `role`

## Affected Route Groups Fixed (June 2026)

Time-tracking: clock-in, clock-out, missing-clockout, bulk-action, generate-invoice, PATCH
Dispatch: all 17+ routes covering templates, itineraries, stops
