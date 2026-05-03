# Feature Flag Gating — E2E Test Plan

This document describes the end-to-end coverage for the six seeded feature
flags gated by Task #32. Coverage is split across two layers:

1. **Executable Node test**: `npx tsx tests/feature-flags.e2e.ts`
   Toggles each flag ON/OFF on a temporary org and asserts both
   `isFeatureEnabled()` resolution and the standardized
   `requireFeatureFlag` middleware contract (`HTTP 403` with
   `{ code: "FEATURE_DISABLED", feature: <key>, enabled: false, flag }`).
2. **Browser/UI plan**: the test plan below, executed through Replit's
   testing skill (Playwright) against a live dev server. The plan covers
   surfaces that need a real session (Account toggles, route gating,
   handler-level 403s on portal-settings/branding/notification-prefs).

## Flags & Surfaces

| Flag | Surfaces |
| --- | --- |
| `task_cost_tracking` | Navigation → Time Tracking dropdown; `/time-tracking` route; `POST /api/time-entries/clock-in`, `POST /api/time-entries/:id/clock-out`, `PATCH /api/time-entries/:id`, `DELETE /api/time-entries/:id` |
| `community_profiles` | `/communities/:id` route; `GET /api/communities*` |
| `zapier_integration` | Account → Integrations → Webhooks; `/api/webhooks/endpoints*` CRUD |
| `advanced_reporting` | Account → Reports tab (trigger + content); `/time-tracking` Reports tab; `GET /api/time-entries/report` |
| `mobile_push_notifications` | Account → Notifications → "Mobile push notifications" toggle; `PUT /api/notification-preferences` rejects `pushNotificationsEnabled=true` with `403 FEATURE_DISABLED` |
| `white_label_branding` | Property Portal Settings → Branding tab; `PATCH /api/orgs/:orgId/branding`; `POST/PATCH /api/orgs/:orgId/properties/:propertyId/portal-settings` reject `branding`/`theme` with `403 FEATURE_DISABLED` |

## Test Plan (executed via runTest)

For each flag:

1. Seed an org with the flag **OFF**, log in as an admin user of that org.
2. Confirm the relevant UI surface is hidden (route 404s, tab/menu absent).
3. Issue the corresponding API call directly and assert HTTP `403` with
   `{ code: "FEATURE_DISABLED", feature: <flag> }`.
4. Toggle the flag **ON** through `PATCH /api/super-admin/feature-flags/:id`
   (super-admin session) and confirm the UI re-appears and the API call
   succeeds (200/201).
5. Toggle back **OFF** and re-assert step 3.

The full suite is run interactively through the testing skill; the most
recent run on **2026-05-03** completed with status `success` for all six
flags (Phase A 403/UI hidden, Phase B 200/UI visible, Phase C cleanup).

The executable Node script at `tests/feature-flags.e2e.ts` complements the
plan above with end-to-end coverage of the gating layer (run on every
verification): it boots a real Express test app, mounts the actual
`requireFeatureFlag` middleware and equivalent handler-level gates, and
asserts both the standardized 403 payload and the regression case where
empty `branding`/`theme` objects must NOT trigger the white-label gate.
