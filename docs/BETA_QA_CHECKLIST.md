# Hubify — Closed-Beta QA Checklist

A copy-paste-friendly checklist any teammate can run against a freshly seeded environment before opening the app to a closed-beta partner. It is paired with the seed script in `scripts/seed-beta-org.ts`; keep this file in sync with the demo data that script produces.

## Before you start

1. Reset / seed the demo organization:
   ```bash
   npx tsx scripts/seed-beta-org.ts
   ```
   Re-running is safe — the script is idempotent.
2. Confirm the script printed:
   ```
   Org id:        00000000-0000-0000-0000-0000000000be
   Portal login:  /portal/login (email: client@beta.hubify.test  password: HubifyBeta!2025)
   ```
3. Open the app at the running Replit URL (e.g. `https://<host>/`). Use a fresh incognito window so cookie consent and auth state are clean.
4. Demo accounts (all in the "Hubify Beta Demo" org, `orgId 00000000-0000-0000-0000-0000000000be`):

   | Role          | Internal user id    | Email                          |
   | ------------- | ------------------- | ------------------------------ |
   | Admin         | `beta-admin`        | admin@beta.hubify.test         |
   | Supervisor    | `beta-supervisor`   | supervisor@beta.hubify.test    |
   | Staff 1       | `beta-staff-1`      | staff1@beta.hubify.test        |
   | Staff 2       | `beta-staff-2`      | staff2@beta.hubify.test        |
   | Portal client | `client@beta.hubify.test` (password `HubifyBeta!2025`) |

   Internal users sign in with **Replit Auth** (Replit OIDC). To exercise a specific role, sign in with the corresponding Replit account, then map your Replit ID to the seeded user via the dev-login / impersonation flow if available, or by editing the `users.id` of your row in the DB (dev only).

5. Demo properties created by the seed (capture the numeric IDs from the run output for use below):
   - **Bayshore Estate** (single-family, FL) — has 4 access codes + HVAC + Security vendors
   - **Palmview Condo 12B** (condo, FL) — HVAC + Electrician
   - **Magnolia Apartments** (apartment, FL) — Electrician + Security
   - **Cedar Ridge House** (house, NC) — HVAC
   - **Harborfront Commercial** (commercial, FL) — Electrician + Security
   - **Sunset Storage** (storage_unit, FL) — Security

---

## 1. Login & Auth
**Logged in as:** rotates per step. **Demo data:** all 4 internal users + the portal client.

1. **Replit OIDC login** — Sign in as `beta-admin` via Replit Auth. ✅ Pass: lands on the dashboard for "Hubify Beta Demo".
2. **Super Admin login** — Sign in via `/super-admin/login` with the Super Admin account; complete MFA prompt. ✅ Pass: Super Admin Console loads.
3. **Hubify Portal login** — Open `/portal/login` (incognito), submit `client@beta.hubify.test` / `HubifyBeta!2025`. ✅ Pass: portal home shows the demo client's properties.
4. **Portal invitation flow** — As `beta-admin`, invite a new portal user (use a throwaway email). ✅ Pass: invitation email/link generated; opening the link lets the invitee set a password and log in.
5. **Logout** — From each surface (admin, super-admin, portal) sign out. ✅ Pass: redirected to login; protected pages now bounce to the login screen.
6. **Portal password reset** — From `/portal/login`, click "Forgot password", submit the demo client email, follow the reset link. ✅ Pass: password updates; old password no longer works.

## 2. Org Setup
**Logged in as:** `beta-admin`. **Demo data:** the Hubify Beta Demo org.

1. **Company Profile save** — Open Account → Company Profile, change Company Phone, click Save. ✅ Pass: success toast and value persists after reload.
2. **API key issue** — Account → Integrations → "Create API key", name it `qa-key`. ✅ Pass: secret shown once, key visible in the list.
3. **API key revoke** — Revoke `qa-key`. ✅ Pass: row disappears / shows revoked; calling the API with that key returns 401.
4. **Default hourly rate** — Admin → Billing → set default hourly rate to `75`, save. ✅ Pass: value persists; new tasks default to $75/hr.
5. **Billing settings save** — Toggle a billing setting (e.g. invoice numbering prefix), save. ✅ Pass: value persists after reload.

## 3. Properties
**Logged in as:** `beta-admin`. **Demo data:** the 6 seeded properties.

1. **List & filter** — Open Properties; filter by type=`single-family`. ✅ Pass: only Bayshore Estate shows.
2. **Detail view** — Open Bayshore Estate. ✅ Pass: address, manager, primary contact, units, sqft all match seed.
3. **Create property** — Add property "QA Test Property". ✅ Pass: appears in list; detail page loads.
4. **Edit access codes** — On Bayshore Estate, edit the "Front Door Lockbox" code from `4827` to `9999`. ✅ Pass: change persists; audit/edit timestamp updates.
5. **Add preferred vendor** — On Cedar Ridge House, link the "Sigrid Security" vendor. ✅ Pass: vendor shows under Preferred Vendors and is unique (no duplicate).
6. **Inspection History** — Open Bayshore → Inspection History. ✅ Pass: prior monthly inspection task is listed with its checklist.
7. **Inspection Schedules** — Open Inspection Schedules tab. ✅ Pass: monthly schedule on Bayshore + quarterly on Palmview are present and active.

## 4. Tasks
**Logged in as:** `beta-supervisor` (assigner) and `beta-staff-1` (assignee). **Demo data:** the 20 seeded tasks.

1. **Create & assign** — Create task "QA: Replace bulb" on Magnolia Apartments, assign to staff1, due tomorrow. ✅ Pass: task appears in staff1's queue.
2. **Complete with photo** — As staff1, open the task, upload one photo, mark complete. ✅ Pass: status flips to completed and photo attaches.
3. **Recurring task** — Create a weekly recurring task on Sunset Storage. ✅ Pass: task is flagged recurring; next occurrence visible after completion.
4. **Bulk-create from template** — Use a task template to seed several tasks across two properties. ✅ Pass: each generated task references the template.
5. **Overdue notification** — Verify the seeded "OVERDUE: Storm cleanup" task on Bayshore shows an overdue badge for staff1 and triggered the corresponding in-app notification. ✅ Pass: task list highlights overdue; bell badge shows ≥1 unread.

## 5. Inspections
**Logged in as:** `beta-staff-1`. **Demo data:** "Monthly Inspection — Bayshore Estate" and the 5 checklist items the seed creates.

1. **Open inspection panel** — Open the Monthly Inspection task. ✅ Pass: checklist panel loads with the 5 items.
2. **Apply checklist template** — Apply a template to a different inspection task. ✅ Pass: items populate; existing items aren't lost.
3. **Mark items pass/fail/N/A + notes** — Mark item 1 pass, item 2 fail (with note), item 3 N/A. ✅ Pass: state persists after reload.
4. **Generate printable report** — Click "Generate Report". ✅ Pass: report opens in a new tab with all marked items.
5. **Download PDF** — Download the PDF. ✅ Pass: PDF downloads; opens in a viewer with org branding.

## 6. Field Mode
**Logged in as:** `beta-staff-2`. **Demo data:** any task assigned to staff2 + Bayshore Estate.

1. **Switch to Field Mode** — From the desktop user menu, switch to Field Mode. ✅ Pass: layout swaps to mobile-optimized.
2. **Phone-sized viewport** — Resize browser to 390×844 (or use device emulation). ✅ Pass: nav and cards reflow without overflow.
3. **Today's Summary** — Verify today's task count and overdue count match seed expectations. ✅ Pass: counts match.
4. **Tap into a property** — Open Bayshore from the property list. ✅ Pass: address, contact, access codes visible.
5. **Get directions** — Tap "Directions". ✅ Pass: opens Maps with the seeded address.
6. **Complete task with photo** — Open a pending task, upload a photo, mark complete. ✅ Pass: status flips, photo attached.
7. **Toggle status** — Toggle a task between in-progress and pending. ✅ Pass: state persists.

## 7. Calendar
**Logged in as:** `beta-supervisor`. **Demo data:** 5 seeded events including the "Palmview vendor meeting (CONFLICT)" entry.

1. **Create event** — Create "QA: Walkthrough" tomorrow 09:00–10:00. ✅ Pass: event appears on calendar.
2. **Invite attendees** — Add staff1 + staff2 as attendees. ✅ Pass: attendees show in the event detail.
3. **Trigger conflict** — Verify the seeded conflict pair flags overlap; create a new event that overlaps and confirm the warning. ✅ Pass: UI surfaces a conflict indicator.
4. **Recurring event** — Create a weekly recurring event. ✅ Pass: future occurrences render; editing one occurrence prompts "this event / all events".
5. **Copy iCal feed** — Copy the iCal URL from settings. ✅ Pass: URL copies; opening it in a calendar client subscribes successfully.

## 8. Forms
**Logged in as:** `beta-admin` (admin viewer) and the demo portal client. **Demo data:** "Beta — New Service Request" and "Beta — Owner Onboarding".

1. **Open published form (client)** — As the portal client, open "Beta — New Service Request". ✅ Pass: 3 fields render, required validation works.
2. **Submit** — Submit a sample response. ✅ Pass: confirmation screen.
3. **Admin viewer** — As admin, open the form's submissions tab. ✅ Pass: the new submission is listed alongside the 2 seeded ones.
4. **Export CSV** — Click "Export CSV". ✅ Pass: CSV downloads with all submissions and headers.

## 9. Documents
**Logged in as:** `beta-admin`. **Demo data:** the seeded community + 2 documents.

1. **Upload** — Upload a small PDF with classification "Policy". ✅ Pass: document appears in the community's document list.
2. **Download** — Download the uploaded file. ✅ Pass: file downloads intact.
3. **Delete** — Delete the uploaded file. ✅ Pass: row disappears; download URL 404s.

## 10. Invoices
**Logged in as:** `beta-admin`. **Demo data:** invoices `BETA-DRAFT-0001`…`BETA-OVERDUE-0004` and the consolidated batch `BETA-CONSOL-0005`.

1. **Create invoice** — Create a manual invoice for the demo client, $250, two line items. ✅ Pass: appears in the invoice list as Draft.
2. **View PDF** — Click "View PDF" on the new invoice. ✅ Pass: PDF renders with org branding and line items.
3. **Send to client** — Send the invoice. ✅ Pass: status moves to Open / Sent; client portal sees it.
4. **Mark paid manually** — Mark `BETA-SENT-0002` as paid. ✅ Pass: status flips to Paid; payment_date set.
5. **Consolidated batch** — Run a new consolidated batch across Bayshore Estate + Palmview Condo. ✅ Pass: a single batch invoice is generated with both properties' line items.
6. **Download both PDFs** — Download the per-property PDFs and the consolidated PDF. ✅ Pass: both download cleanly.

## 11. Stripe Payment-Method Collection
**Requires `STRIPE_SECRET_KEY` (test mode).** **Logged in as:** `beta-admin` and the portal client.

1. **Admin-authenticated add-card** — From the demo client's detail page, click "Add card on file", complete the Stripe Elements form with `4242 4242 4242 4242`. ✅ Pass: success toast; card listed under saved methods.
2. **Client self-service** — As the portal client, open Billing → Payment methods → Add card; complete the same flow. ✅ Pass: card listed under the client's saved methods.
3. **DB spot-check** — In the dev DB, query `SELECT stripe_payment_method_id, brand, last4 FROM client_payment_methods WHERE client_id = '000000be-0000-0000-0000-000000000010';`. ✅ Pass: only `stripe_payment_method_id` (and display metadata) is stored — no raw PAN, CVV, or full card object.

## 12. Notifications
**Logged in as:** `beta-staff-1` and `beta-admin`. **Demo data:** the 4 seeded notifications.

1. **Trigger overdue notification** — Adjust a task's due date to yesterday (or run the overdue cron). ✅ Pass: a new notification appears and bell badge increments.
2. **Bell badge increments** — Reload; the badge count rises by 1. ✅ Pass.
3. **Mark read** — Click a single notification. ✅ Pass: it dims; unread count decreases.
4. **Mark all read** — Click "Mark all read". ✅ Pass: badge clears.
5. **Per-user preferences** — Toggle "Email me about overdue tasks" off in user settings. ✅ Pass: setting persists; subsequent overdue events do not email this user (verify via SendGrid logs or local mailcatcher).

## 13. Reports
**Logged in as:** `beta-admin`.

1. **Time Report** — Run Time Report for the last 30 days, grouped by user. ✅ Pass: report renders with totals.
2. **Export CSV** — Export the report to CSV. ✅ Pass: CSV downloads with matching rows.
3. **PDF Mockup Gallery** — Open `/admin/pdf-mockups`. ✅ Pass: all 5 sample PDFs are listed.
4. **Download all 5** — Download each sample PDF. ✅ Pass: all downloads succeed and open without errors.

## 14. Hubify Portal (client side)
**Logged in as:** `client@beta.hubify.test` / `HubifyBeta!2025` at `/portal/login`.

1. **Properties + tasks** — View "My properties" and "My tasks". ✅ Pass: only properties linked to this portal user appear; tasks reflect the seeded data.
2. **Invoices** — Open Invoices. ✅ Pass: the seeded sent / paid / overdue / consolidated invoices are visible (draft is hidden from clients).
3. **Pay (test mode)** — On the Open invoice, click "Pay now", complete with `4242 4242 4242 4242`. ✅ Pass: invoice flips to Paid; webhook updates status.
4. **Notification preferences** — Toggle "Email invoice reminders" off, save. ✅ Pass: value persists in `portal_users.email_invoice_reminders`.
5. **Documents** — Open Documents. ✅ Pass: the 2 seeded community documents are listed and downloadable.

## 15. Super Admin Console
**Logged in as:** Super Admin (with MFA).

Walk every tab in order. For each tab, ✅ Pass means: no fake numbers, no dead buttons, no placeholder rows.

1. **Organizations** — Counts match real DB (`SELECT count(*) FROM orgs`). Row actions work.
2. **Users** — Real user list; suspend/restore actions work on a non-critical test user.
3. **Revenue** — Numbers come from real subscription data (no mocked totals).
4. **Compliance** — All status pills reflect real columns.
5. **Feature Flags** — Toggling a flag persists and shows in the org override view.
6. **Support Tickets** — Real ticket list; reply works.
7. **System Alerts** — Create, edit, dismiss an alert.
8. **Audit log** — Recent actions you took during this checklist appear here.

## 16. Cookie Consent + Legal
**Logged in as:** anonymous, then portal client.

1. **Clear browser storage** — DevTools → Application → Clear storage.
2. **Visit landing page** — Banner appears at the bottom with Accept all / Reject non-essential / Customize.
3. **Accept** — Click Accept all. ✅ Pass: banner disappears; `localStorage["hubify_cookie_consent_v1"]` shows essential+analytics+marketing true.
4. **Reload + reject test** — Re-clear storage, reload, click Reject non-essential. ✅ Pass: only essential is true.
5. **Customize** — Re-clear storage, open Customize, toggle only Analytics on, save. ✅ Pass: persisted choice matches.
6. **Persistence after login** — Sign in to the portal as the demo client, change preferences via the Cookie preferences footer link. ✅ Pass: choice persists in `user_cookie_consent` (or `portal_user_cookie_consent` for portal users).
7. **Privacy / Terms from portal auth** — From `/portal/login`, `/portal/register`, `/portal/forgot-password`, and `/portal/reset-password`, click Privacy and Terms. ✅ Pass: both pages load publicly without auth.

---

## Known issues / "Internal Preview" labels

These are intentional and should NOT be filed as bugs during beta QA:

- Items hidden behind feature flags (per-org overrides in Super Admin → Feature Flags) may not appear unless the flag is enabled for the demo org.
- The Subscription card on Account Settings reads real `org_subscriptions` data; for the seeded demo org without an active Stripe subscription it will show an empty state by design.
- The Forms / Email Templates / Task Templates / Team Roles tabs in Account Settings are intentional empty-state cards that link out to their full admin pages — the empty card is the design.
- Internal users sign in via Replit Auth, not email/password. Mapping a Replit account to a seeded `beta-*` user requires the dev-login / impersonation path; password-based login is intentionally unavailable for internal users.
- Stripe payment-method seeding is a no-op when `STRIPE_SECRET_KEY` is unset — the seed log line `STRIPE_SECRET_KEY not set — skipping client payment method seed` is expected.
- The seeded "Palmview vendor meeting (CONFLICT)" event is intentionally scheduled to overlap another event so QA can exercise conflict detection.
- Two seeded "OVERDUE:" tasks are deliberately past due so QA can exercise overdue badges and notifications.
