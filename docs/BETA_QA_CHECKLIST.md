# Hubify — Closed-Beta QA Checklist

A copy-paste-friendly checklist any teammate can run against a freshly seeded environment before opening the app to a closed-beta partner. It is paired with the seed script in `scripts/seed-beta-org.ts`; keep this file in sync with the demo data that script produces.

## Before you start

> **Run the portal e2e first.** Before walking the checklist by hand, run the portal happy-path e2e — it catches the regressions surfaced by the 2026-05-03 QA pass before you spend time on the manual run:
> ```bash
> npx tsx tests/portal-happy-path.e2e.ts
> ```
> The script seeds the demo org for you (idempotent) and exercises sign-in → properties → invoices (with the `BETA-DRAFT-0001` negative assertion) → sign-out → re-auth bounce.
>
> **CI now gates this on every push and PR.** The GitHub Actions workflow at `.github/workflows/portal-e2e.yml` boots the dev server, runs `scripts/seed-beta-org.ts`, and executes the same `tests/portal-happy-path.e2e.ts` against `http://localhost:5000`. Any assertion failure fails the build, so the portal blockers from the 2026-05-03 QA pass cannot silently regress between manual QA runs. The job needs a `CI_DATABASE_URL` repo secret pointing at a throwaway Neon test branch (the app uses `@neondatabase/serverless`, so a generic CI Postgres service won't work).

1. Reset / seed the demo organization (idempotent — safe to re-run):
   ```bash
   npx tsx scripts/seed-beta-org.ts
   ```
2. Capture the seed output — it ends with the org id, portal login, and the numeric property ids you'll need:
   ```
   Org id:        00000000-0000-0000-0000-0000000000be
   Portal login:  /portal/login (email: client@beta.hubify.test  password: HubifyBeta!2025)
   Property ids:
     Bayshore Estate         = <PROP_A>
     Palmview Condo 12B      = <PROP_B>
     Magnolia Apartments     = <PROP_C>
     Cedar Ridge House       = <PROP_D>
     Harborfront Commercial  = <PROP_E>
     Sunset Storage          = <PROP_F>
   ```
3. Open the app at the running Replit URL (e.g. `https://<host>/`) in a fresh incognito window so cookie consent and auth state are clean.
4. Internal user accounts (all in the "Hubify Beta Demo" org, `orgId 00000000-0000-0000-0000-0000000000be`):

   | Role        | Internal user id    | Email                          |
   | ----------- | ------------------- | ------------------------------ |
   | Admin       | `beta-admin`        | admin@beta.hubify.test         |
   | Supervisor  | `beta-supervisor`   | supervisor@beta.hubify.test    |
   | Staff 1     | `beta-staff-1`      | staff1@beta.hubify.test        |
   | Staff 2     | `beta-staff-2`      | staff2@beta.hubify.test        |

   Internal users sign in with **Replit Auth** (Replit OIDC). To exercise a specific role, sign in with the corresponding Replit account, then map your Replit ID to the seeded user via the dev-login / impersonation flow if available, or by editing `users.id` of your row in the dev DB only.

   **Portal client** (separate auth — email + password at `/portal/login`):

   | Email                       | Password         |
   | --------------------------- | ---------------- |
   | `client@beta.hubify.test`   | `HubifyBeta!2025` |

   **Super Admin** (separate auth — `/super-admin/login` with TOTP MFA): credentials are NOT seeded by this script. Use the shared closed-beta Super Admin credentials from the team's 1Password vault under "Hubify — Super Admin (closed beta)". If you do not have access, ask the project lead before starting Section 1 step 2.

5. Demo properties seeded (also printed by the seed script):
   - **Bayshore Estate** (single-family, FL) — 4 access codes (door / wifi / alarm / gate) + HVAC + Security vendors + active monthly inspection schedule
   - **Palmview Condo 12B** (condo, FL) — door + wifi codes + HVAC + Electrician + active quarterly inspection schedule
   - **Magnolia Apartments** (apartment, FL) — door + alarm codes + Electrician + Security vendors
   - **Cedar Ridge House** (house, NC) — smart-lock + garage codes + HVAC vendor
   - **Harborfront Commercial** (commercial, FL) — door + alarm codes + Electrician + Security vendors
   - **Sunset Storage** (storage_unit, FL) — gate code + Security vendor

6. Demo invoices seeded: `BETA-DRAFT-0001` (draft), `BETA-SENT-0002` (open/sent), `BETA-PAID-0003` (paid), `BETA-OVERDUE-0004` (overdue), `BETA-CONSOL-0005` (consolidated batch covering Bayshore + Palmview).

---

## 1. Login & Auth
**Logged in as:** rotates per step. **Demo data:** the 4 seeded internal users (`beta-admin/supervisor/staff-1/staff-2`) and the seeded portal client `client@beta.hubify.test`.

1. **Replit OIDC login** — Sign in as `beta-admin` via Replit Auth. ✅ Pass: lands on the dashboard for "Hubify Beta Demo" with the admin's name in the header.
2. **Super Admin login** — Open `/super-admin/login`, sign in with the Super Admin account, complete the MFA prompt. ✅ Pass: Super Admin Console loads at `/super-admin`.
3. **Hubify Portal login** — In incognito, open `/portal/login`. Sign in with Email `client@beta.hubify.test` and Password `HubifyBeta!2025`. ✅ Pass: portal home shows the demo client's properties and no admin chrome. ⚠️ See "Known issues" below — the blank portal home for client-role users is still a tracked bug.
4. **Portal invitation flow** — As `beta-admin`, invite a new portal user with a throwaway email. ✅ Pass: invitation link is generated; opening it in a new window lets the invitee set a password and reach the portal home.
5. **Logout (3 surfaces)** — From admin, super-admin, and portal sign out. ✅ Pass: each redirects to its login screen and revisiting a protected URL bounces back to login.
6. **Portal password reset** — From `/portal/login` click "Forgot password", submit the demo client email, follow the reset link, set a new password. ✅ Pass: new password works on `/portal/login`; the previous password is rejected with an error.

## 2. Org Setup
**Logged in as:** `beta-admin`. **Demo data:** the "Hubify Beta Demo" org (`orgId 00000000-0000-0000-0000-0000000000be`).

1. **Company Profile save** — Account → Company Profile, change Company Phone to `555-9999`, click Save. ✅ Pass: success toast appears and the new phone number persists after a hard reload.
2. **API key issue** — Account → Integrations → "Create API key", name it `qa-key`. ✅ Pass: secret is shown exactly once and `qa-key` appears in the list with a created-at timestamp.
3. **API key revoke** — Click revoke on `qa-key`, confirm. ✅ Pass: row is marked revoked / disappears, and `curl -H "Authorization: Bearer <key>" https://<host>/api/orgs/00000000-0000-0000-0000-0000000000be/properties` returns HTTP 401.
4. **Default hourly rate** — Admin → Billing → set default hourly rate to `75`, save. ✅ Pass: value persists after reload and a newly created task pre-fills `$75/hr`.
5. **Billing settings save** — Change the invoice number prefix (e.g. `BETA-`) and save. ✅ Pass: value persists; the next invoice you create uses the new prefix.

## 3. Properties
**Logged in as:** `beta-admin`. **Demo data:** the 6 seeded properties (`<PROP_A>`…`<PROP_F>` from the seed output) plus the 13 seeded access codes and 10 seeded preferred-vendor links.

1. **List & filter** — Open Properties; filter by type=`single-family`. ✅ Pass: only Bayshore Estate (`<PROP_A>`) is shown.
2. **Detail view** — Open Bayshore Estate. ✅ Pass: address `100 Bayshore Dr, Sarasota, FL 34236`, manager `beta-supervisor`, primary contact Olivia Owner, units `1`, sqft `4200` all match the seed.
3. **Create property** — Add a new property "QA Test Property" in any city. ✅ Pass: row appears in the list and its detail page loads cleanly.
4. **Edit access codes** — On Bayshore Estate, edit the "Front Door Lockbox" code from `4827` to `9999`, save. ✅ Pass: new value persists after reload and the updated_at column moves forward.
5. **Add preferred vendor** — On Cedar Ridge House (`<PROP_D>`), link the "Sigrid Security" vendor. ✅ Pass: Sigrid Security appears in the property's Preferred Vendors list and trying to add the same vendor again is blocked (unique constraint).
6. **Inspection History** — Open Bayshore Estate → Inspection History. ✅ Pass: at least one inspection task ("Monthly Inspection — Bayshore Estate") with its 5 checklist items is listed.
7. **Inspection Schedules** — Open Inspection Schedules. ✅ Pass: the seeded monthly schedule on Bayshore (`<PROP_A>`) and quarterly schedule on Palmview (`<PROP_B>`) are listed and both flagged active.

## 4. Tasks
**Logged in as:** `beta-supervisor` (assigner) and `beta-staff-1` (assignee). **Demo data:** the 20 seeded tasks, including 2 prefixed `OVERDUE:` and one weekly recurring "Weekly Pool Cleaning — Bayshore".

1. **Create & assign** — Create task "QA: Replace bulb" on Magnolia Apartments (`<PROP_C>`), assign to staff1, due tomorrow. ✅ Pass: the task appears in `beta-staff-1`'s task list with the correct due date.
2. **Complete with photo** — As `beta-staff-1`, open "QA: Replace bulb", upload one photo, mark complete. ✅ Pass: status flips to Completed, photo thumbnail appears, and `completed_at` is set.
3. **Recurring task** — Create a weekly recurring task on Sunset Storage (`<PROP_F>`). ✅ Pass: task is flagged recurring and after marking it complete, the next occurrence is generated with a future due date.
4. **Bulk-create from template** — Use a task template to bulk-create tasks across two properties. ✅ Pass: each generated task references the template name, and the count of new tasks equals (template count) × (selected properties).
5. **Overdue notification** — Open `beta-staff-1`'s task list. ✅ Pass: the seeded "OVERDUE: Storm cleanup" task on Bayshore renders with an overdue badge and the matching "Task overdue: Storm cleanup" notification appears in the bell with unread state.

## 5. Inspections
**Logged in as:** `beta-staff-1`. **Demo data:** the seeded inspection task "Monthly Inspection — Bayshore Estate" (5 checklist items) and the two other seeded inspection tasks on Palmview and Cedar Ridge.

1. **Open inspection panel** — Open the Monthly Inspection task. ✅ Pass: checklist panel renders all 5 seeded items in order.
2. **Apply checklist template** — Open the Cedar Ridge "Move-out Inspection" task and apply a checklist template. ✅ Pass: the template's items are appended; previously seeded items are not deleted.
3. **Mark items pass/fail/N/A + notes** — Mark item 1 pass, item 2 fail with note "broken latch", item 3 N/A. ✅ Pass: state and note persist after a full page reload.
4. **Generate printable report** — Click "Generate Report". ✅ Pass: a report opens in a new tab listing every checklist item with its result and any notes.
5. **Download PDF** — From the report click "Download PDF". ✅ Pass: a PDF file downloads, opens in any viewer, and shows the org name plus all marked items.

## 6. Field Mode
**Logged in as:** `beta-staff-2`. **Demo data:** any task seeded against `beta-staff-2` (e.g. "Replace HVAC filter") and Bayshore Estate (`<PROP_A>`).

1. **Switch to Field Mode** — From the desktop user menu, choose "Switch to Field Mode". ✅ Pass: the chrome swaps to the mobile-optimized layout.
2. **Phone-sized viewport** — Resize the browser to 390×844 (or use device emulation). ✅ Pass: nav and cards reflow with no horizontal scroll or overflow.
3. **Today's Summary** — Inspect Today's Summary on the home screen. ✅ Pass: today's task count and overdue count are non-zero and match what the seed produced for `beta-staff-2`.
4. **Tap into a property** — From the property list, open Bayshore Estate. ✅ Pass: address `100 Bayshore Dr, Sarasota, FL 34236`, primary contact, and the 4 seeded access codes are visible.
5. **Get directions** — Tap "Directions". ✅ Pass: the device's Maps app (or maps.google.com) opens with the Bayshore address pre-filled.
6. **Complete task with photo** — Open a pending task assigned to staff2, upload a photo, mark complete. ✅ Pass: status flips to Completed and the photo is attached when re-opened.
7. **Toggle status** — Toggle a different task between In Progress and Pending. ✅ Pass: the new status persists after navigating away and back.

## 7. Calendar
**Logged in as:** `beta-supervisor`. **Demo data:** the 5 seeded events on the default calendar, including "Palmview vendor meeting (CONFLICT)" (intentionally overlapping another event) and the recurring "Weekly team standup".

1. **Create event** — Create "QA: Walkthrough" tomorrow 09:00–10:00 on the default calendar. ✅ Pass: the event renders on tomorrow's calendar slot.
2. **Invite attendees** — Edit "QA: Walkthrough" and add `beta-staff-1` and `beta-staff-2` as attendees. ✅ Pass: both names appear in the event's attendee list with response status visible.
3. **Trigger conflict** — Inspect the day containing the seeded "Palmview vendor meeting (CONFLICT)"; then create a new event that overlaps it. ✅ Pass: the UI surfaces a visible conflict indicator on both events.
4. **Recurring event** — Create a weekly recurring event "QA: Weekly". ✅ Pass: future weeks render the event, and editing one occurrence prompts "this event only / all events".
5. **Copy iCal feed** — Open calendar settings and copy the iCal feed URL. ✅ Pass: the URL copies to clipboard and pasting it into a calendar client (or `curl` returning a `BEGIN:VCALENDAR` body) lists the seeded events.

## 8. Forms
**Logged in as:** `beta-admin` (admin viewer) and the seeded portal client. **Demo data:** the seeded forms "Beta — New Service Request" (3 fields, 2 prior submissions) and "Beta — Owner Onboarding" (4 fields, 1 prior submission).

1. **Open published form (client)** — As the portal client, open "Beta — New Service Request". ✅ Pass: 3 fields render; submitting with a required field empty shows a validation error.
2. **Submit** — Fill the form and submit. ✅ Pass: a confirmation screen appears and the count of submissions in admin grows by 1.
3. **Admin viewer** — As `beta-admin`, open the form's submissions tab. ✅ Pass: the new submission is listed alongside the 2 seeded ones (3 rows total).
4. **Export CSV** — Click "Export CSV". ✅ Pass: a CSV file downloads with a header row plus one data row per submission.

## 9. Documents
**Logged in as:** `beta-admin`. **Demo data:** the seeded community ("Hubify Beta Community") and its 2 seeded documents.

1. **Upload** — Upload a small PDF with classification "Policy". ✅ Pass: the document appears in the community's document list (3 docs total).
2. **Download** — Click Download on the new file. ✅ Pass: the file downloads with its original name and identical bytes.
3. **Delete** — Delete the uploaded file. ✅ Pass: the row disappears (back to 2 docs) and the previous download URL returns HTTP 404.

## 10. Invoices
**Logged in as:** `beta-admin`. **Demo data:** seeded invoices `BETA-DRAFT-0001`, `BETA-SENT-0002`, `BETA-PAID-0003`, `BETA-OVERDUE-0004`, and the consolidated `BETA-CONSOL-0005` (covers Bayshore + Palmview).

1. **Create invoice** — Create a manual invoice for the demo client, $250 total, two line items. ✅ Pass: invoice appears in the list with status Draft and the amount $250.
2. **View PDF** — Click "View PDF" on the new invoice. ✅ Pass: a PDF renders with org branding, the demo client's name, and both line items.
3. **Send to client** — Click "Send" on the new invoice. ✅ Pass: status moves to Open / Sent, `sent_at` is set, and the demo client's portal lists this invoice.
4. **Mark paid manually** — Open `BETA-SENT-0002` and mark it Paid. ✅ Pass: status flips to Paid and `payment_date` is set.
5. **Consolidated batch** — Run a new consolidated batch across Bayshore (`<PROP_A>`) + Palmview (`<PROP_B>`). ✅ Pass: a single batch invoice is generated whose line items cover both properties' open work.
6. **Download both PDFs** — Download the per-property PDFs and the consolidated PDF. ✅ Pass: all PDFs download, open without errors, and totals match the on-screen amounts.

## 11. Stripe Payment-Method Collection
**Requires `STRIPE_SECRET_KEY` (test mode).** **Logged in as:** `beta-admin` (admin flow) and the seeded portal client (self-service flow). **Demo data:** the seeded client `000000be-0000-0000-0000-000000000010` (`client@beta.hubify.test`).

1. **Admin-authenticated add-card** — From the demo client's detail page click "Add card on file"; complete the Stripe Elements form with `4242 4242 4242 4242` (any future expiry, any CVC). ✅ Pass: success toast and the new card (brand Visa, last4 4242) is listed under saved methods.
2. **Client self-service** — As the portal client open Billing → Payment methods → Add card; complete the same Stripe form. ✅ Pass: the new card appears under the client's saved methods in both the portal and the admin view.
3. **DB spot-check** — Run `SELECT stripe_payment_method_id, brand, last4 FROM client_payment_methods WHERE client_id = '000000be-0000-0000-0000-000000000010';` against the dev DB. ✅ Pass: only `stripe_payment_method_id` plus display metadata (brand / last4) is present — no PAN, no CVV, no full card object.

## 12. Notifications
**Logged in as:** `beta-staff-1` and `beta-admin`. **Demo data:** the 4 seeded in-app notifications ("Task overdue: Storm cleanup" for staff-1, "Invoice past due" for supervisor, "Inspection due soon" for admin, "New task assigned" for staff-2).

1. **Trigger overdue notification** — Adjust an open task's due date to yesterday (or run the overdue cron job). ✅ Pass: a new "Task overdue" notification is created and the bell badge increments by 1.
2. **Bell badge increments** — Reload the page. ✅ Pass: the bell badge count is one higher than before step 1.
3. **Mark read** — Click a single unread notification. ✅ Pass: it switches to a read style and the unread count decreases by 1.
4. **Mark all read** — Click "Mark all read". ✅ Pass: every notification is marked read and the bell badge clears to 0.
5. **Per-user preferences** — In user settings, toggle "Email me about overdue tasks" off and save. ✅ Pass: the toggle persists after reload (`SELECT email_overdue_tasks FROM user_notification_preferences WHERE user_id='beta-staff-1';` returns `false`) and a subsequent overdue trigger does NOT email this user (verify via SendGrid Activity at https://app.sendgrid.com/email_activity, filtering by the user's email address).

## 13. Reports
**Logged in as:** `beta-admin`. **Demo data:** the seeded tasks and time entries from the past 30 days plus the 5 sample PDFs in the PDF Mockup Gallery.

1. **Time Report** — Run Time Report for the last 30 days, grouped by user. ✅ Pass: the report renders with non-empty totals and the per-user breakdown matches what is visible in the Tasks list.
2. **Export CSV** — Click "Export CSV" on the Time Report. ✅ Pass: a CSV downloads whose row count equals the on-screen row count plus the header row.
3. **PDF Mockup Gallery** — Open `/admin/pdf-mockups`. ✅ Pass: all 5 sample PDF cards are listed with thumbnails and a Download button.
4. **Download all 5** — Download each sample PDF. ✅ Pass: all 5 downloads succeed, each opens in a viewer, and each carries the watermark.

## 14. Hubify Portal (client side)
**Logged in as:** `client@beta.hubify.test` / `HubifyBeta!2025` at `/portal/login`. **Demo data:** the seeded properties linked to this portal user, the seeded invoices visible to clients (`BETA-SENT-0002`, `BETA-PAID-0003`, `BETA-OVERDUE-0004`, `BETA-CONSOL-0005`), and the 2 seeded community documents.

1. **Properties + tasks** — On the Portal home, switch between the **My Properties** and **My Tasks** tabs. ✅ Pass: both seeded properties (`Bayshore Estate`, `Palmview Condo 12B`) appear with full address; the Tasks tab lists tasks at those two properties (Bayshore + Palmview only — no tasks from properties this user is not linked to).
2. **Invoices** — Open the **My Invoices** tab. ✅ Pass: the 4 client-visible seeded invoices (`BETA-SENT-0002`, `BETA-PAID-0003`, `BETA-OVERDUE-0004`, `BETA-CONSOL-0005`) are listed with status pills and amounts; `BETA-DRAFT-0001` is NOT shown (drafts are filtered server-side in `GET /api/portal/invoices`).
3. **Pay (test mode)** — On `BETA-OVERDUE-0004` click "Pay now" and complete with `4242 4242 4242 4242`. ✅ Pass: invoice status flips to Paid via the Stripe webhook and `payment_method` shows `card`.
4. **Notification preferences** — Toggle "Email invoice reminders" off and save. ✅ Pass: the toggle persists after reload and `SELECT email_invoice_reminders FROM portal_users WHERE email='client@beta.hubify.test';` returns `false`.
5. **Documents** — Open the **Documents** tab. ✅ Pass: the 2 seeded community documents (`Beta-Welcome-Packet.pdf`, `Beta-CCRs-2025.pdf`) are listed and each Download link opens cleanly.

## 15. Super Admin Console
**Logged in as:** Super Admin (with MFA). **Demo data:** all real platform data — confirm there are no fake/mocked numbers anywhere. Use the seeded "Hubify Beta Demo" org for spot-checks.

1. **Organizations tab** — Open Organizations. ✅ Pass: the row count matches `SELECT count(*) FROM orgs;` and "Hubify Beta Demo" is present; clicking the row opens its detail.
2. **Users tab** — Open Users. ✅ Pass: the 4 seeded `beta-*` users appear; suspending and then restoring a non-critical test user works without page errors.
3. **Revenue tab** — Open Revenue. ✅ Pass: totals come from real subscription data (no obvious placeholder figures like `$0.00` everywhere or `$1,234,567`).
4. **Compliance tab** — Open Compliance. ✅ Pass: every status pill / row reflects an actual DB column (not a hard-coded string).
5. **Feature Flags tab** — Toggle a non-destructive flag for "Hubify Beta Demo" and save. ✅ Pass: the override persists and the flag's effect is visible in the demo org's UI.
6. **Support Tickets tab** — Open Support Tickets and reply to any ticket. ✅ Pass: the reply is saved and visible after reload.
7. **System Alerts tab** — Create, edit, then dismiss a system alert. ✅ Pass: each action persists and the alert disappears after dismissal.
8. **Audit log tab** — Open the Audit log. ✅ Pass: the actions you performed earlier in this section appear with the correct timestamp and actor.

## 16. Cookie Consent + Legal
**Logged in as:** anonymous, then the seeded portal client. **Demo data:** the cookie consent banner driven by `localStorage["hubify_cookie_consent_v1"]` plus the `user_cookie_consent` / `portal_user_cookie_consent` tables.

1. **Clear browser storage** — DevTools → Application → Clear storage; reload the landing page. ✅ Pass: the cookie banner reappears at the bottom with the three buttons (Accept all / Reject non-essential / Customize).
2. **Accept** — Click Accept all. ✅ Pass: banner disappears and `localStorage["hubify_cookie_consent_v1"]` shows `essential: true, analytics: true, marketing: true`.
3. **Reload + reject test** — Re-clear storage, reload, click Reject non-essential. ✅ Pass: only `essential: true` is set; analytics and marketing are `false`.
4. **Customize** — Re-clear storage, open Customize, enable only Analytics, save. ✅ Pass: stored value matches `essential+analytics: true, marketing: false`.
5. **Persistence after login** — Sign in to the portal as the demo client and change preferences from the Cookie preferences footer link. ✅ Pass: a row exists in `portal_user_cookie_consent` for this portal user with the chosen booleans.
6. **Privacy / Terms from portal auth pages** — From `/portal/login`, `/portal/register`, `/portal/forgot-password`, `/portal/reset-password` click Privacy and Terms. ✅ Pass: both pages load publicly without an auth redirect.

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

### Bugs found during the 2026-05-03 automated smoke pass (file before beta launch)

- ~~**Portal login form requires the raw Organization UUID**~~ — Fixed 2026-05-03. `/portal/login` and `/portal/forgot-password` now accept email + password only; the org is resolved server-side by matching the email/password (see `tests/portal-login.e2e.ts`).
- ~~**Portal home (`/portal`) renders a blank white page after login**~~ — Fixed 2026-05-03. `/portal` now renders an unconditional client-facing home with four data-backed tabs (My Properties, My Tasks, My Invoices, Documents) plus a tap-through property detail page at `/portal/properties/:id`. The legacy `StaffDashboard` / `VendorDashboard` components have been removed.
