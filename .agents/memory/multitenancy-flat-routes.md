---
name: Multi-tenancy flat route audit
description: Which flat API routes had cross-org data leaks, what was fixed, and the safe audit pattern for future routes.
---

# Multi-tenancy flat route audit

## The rule
Flat routes (no `/api/orgs/:orgId/` prefix) must explicitly extract `orgId` from the authenticated session — never call unscoped `storage.getXxx()` that returns all rows platform-wide.

**Why:** The `/api/orgs/:orgId/` namespace has a middleware guard (server/routes.ts ~line 11180) that verifies `req.params.orgId === session orgId`. Flat routes have no such gate, so a missing `WHERE org_id = ?` means every tenant can see every other tenant's data.

## Safe pattern
```ts
const orgId = req.user?.claims?.orgId || req.user?.orgId;
if (!orgId) return res.status(403).json({ message: "Organization context required" });
const data = await storage.getSomething(orgId);
```

## Breaches found and fixed (session June 2026)

| Endpoint | Root cause | Fix |
|---|---|---|
| `GET /api/users` | `storage.getUsers()` — no filter | Changed to `storage.getUsersByOrg(orgId)` |
| `GET /api/team-messages` | `storage.getTeamMessages()` — no org filter | Added `orgId` param; added `org_id` column to `team_messages` table (backfilled from author) |
| `POST /api/team-messages` @mentions | `storage.getUsers()` for mention resolution | Changed to `getUsersByOrg(orgId)` — prevents emailing users from other orgs |
| `PATCH /api/team-messages/:id` @mentions | same | same fix |
| `POST /api/team-messages/:id/reply` | same | same fix |
| `GET /api/forms` | `storage.getFormsWithFields()` — no filter | Added `orgId` param; added `org_id` column to `forms` table |
| `POST /api/forms` | `storage.createForm()` — orgId not stored | Now passes `orgId` into form data |
| `GET /api/duplicates` | `getDuplicates()` → `scanForDuplicates()` scanned ALL contacts/properties | orgId threaded through full call chain; `findContactDuplicates` and `findPropertyDuplicates` now filter by orgId |
| `POST /api/duplicates/scan` | same | same |
| `GET /api/duplicates/history` | `getDuplicateHistory()` — no filter | Added `orgId` param; added `org_id` column to `duplicate_history` table |
| `POST /api/duplicates/ignore` | `ignoreDuplicate()` — no orgId stored | Added `orgId` param threaded from session |

## What is safe (no changes needed)
- All `/api/orgs/:orgId/*` routes — middleware guard at routes.ts ~line 11180 blocks mismatched orgId
- All `/api/super-admin/*` routes — gated by `isSuperAdmin` middleware
- Portal routes — gated by `isPortalAuthenticated` + `portal_user_properties` join

## How to apply
Before adding any new flat route that reads potentially multi-tenant data, confirm the storage method accepts and filters by `orgId`. If the storage method has no orgId param, treat it as unsafe until confirmed it only reads platform-level (non-tenant) data.
