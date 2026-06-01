---
name: Tasks table has no org_id
description: Tasks scope through propertyId, not a direct org_id column. Checking task.orgId returns undefined and breaks auth checks.
---

The `tasks` table has no `org_id` column. The DB will error with "column t.org_id does not exist".

Tasks are org-scoped by joining through `properties`: `tasks.property_id → properties.id → properties.org_id`.

**Why:** This was discovered when the portal inspection detail/pdf endpoints tried to check `(task as any).orgId !== portalUser.orgId` and that check always evaluated to `undefined !== orgId` (always true), causing all inspection reports to return 404.

**How to apply:** When writing any endpoint that loads a task and needs to validate org ownership, either:
1. Join through properties and check `properties.org_id`, or
2. For portal endpoints: check that `task.propertyId` is in the portal user's allowed property list (which is already org-scoped via `portal_user_properties`). This is the stronger security check anyway.

The `storage.getTask()` method returns a nested `property` object but does NOT include `orgId` from that join — only `id, name, address1, address2, city, state, zip, type, units, status, squareFootage, billingType`.
