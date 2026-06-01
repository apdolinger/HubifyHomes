---
name: Portal inspection scoping
description: How portal inspection report endpoints enforce property-level access control, and a category field gap in getTasksByPropertyIds.
---

Portal inspection report endpoints (`GET /api/portal/inspections`, `/:id`, `/:id/pdf`) are gated by `portal_user_properties`, not by `task.orgId` (which doesn't exist — see tasks-org-scoping.md).

Security pattern used:
1. Get `allowedPropertyIds = portal_user_properties where portal_user_id = portalUser.id`
2. Filter tasks by `propertyId IN allowedPropertyIds` (already org-scoped since portal users are created within an org)
3. For detail/pdf: additionally check `task.propertyId` is in the allowed list and `category='inspection'` + `status='completed'`

**category field gap:** `storage.getTasksByPropertyIds()` did not include `category` in its Drizzle select, so the `category` field was always `undefined` in portal tasks responses. This caused the "Report" button in MyTasks.tsx to never render. Fix: added `category: tasks.category` to the select in `server/storage.ts`.

**Why:** The fix was found when the e2e test confirmed inspection rows appeared in the Inspections tab but the "Report" button was missing from the My Tasks tab — the API response had no `category` field for those tasks.
