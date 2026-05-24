/**
 * Hubify Demo Tenant — seed and reset functions
 *
 * Exports:
 *   seedDemoTenant()  — idempotent, safe to run multiple times
 *   resetDemoTenant() — wipes all mutable demo data, then reseeds
 *
 * Demo credentials
 *   Staff admin:   demo@hubifyhomesonline.com  /  Demo2026!  (role = admin)
 *   Portal client: client@demo.hubifyhomesonline.com  /  DemoClient2026!
 *
 * Org:  Hubify Demo Portfolio  (id = DEMO_ORG_ID below)
 * Domain: demo.hubifyhomesonline.com
 *
 * 10 property scenarios:
 *  1. Beachside Breeze      — Home Watch, HVAC issue before owner arrival
 *  2. Sunset Key Villa      — Luxury Estate, pool heater + smart-home offline
 *  3. Coconut Harbor Retreat — Seasonal/Snowbird, hurricane prep
 *  4. Pelican Point Cottage  — Emergency, water leak discovered
 *  5. Royal Palm Estate      — VIP Luxury, owner event preparation
 *  6. Marina Bay Condo       — Rental, guest turnover + smart lock reset
 *  7. Gulfstream Manor       — High Maintenance, irrigation + HOA violation
 *  8. The Sandpiper          — Seasonal Arrival, owner arriving early
 *  9. Lighthouse Point       — Storm Damage, roof leak
 * 10. Oceanfront Oasis       — Stable Premium, healthy recurring account
 */

import { and, eq, inArray, like } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "./db";
import {
  orgs,
  users,
  contacts,
  properties,
  propertyAccessItems,
  propertyVendors,
  tasks,
  taskChecklistItems,
  inspectionSchedules,
  calendars,
  events,
  eventAttendees,
  forms,
  formFields,
  formSubmissions,
  communityDocuments,
  clients,
  clientInvoices,
  clientPaymentMethods,
  portalUsers,
  portalUserProperties,
  notifications,
} from "../shared/schema";

// ─── Constants ───────────────────────────────────────────────────────────────

export const DEMO_ORG_ID   = "00000000-0000-0000-0000-000000000de0";
export const DEMO_ORG_NAME = "Hubify Demo Portfolio";
export const DEMO_DOMAIN   = "demo.hubifyhomesonline.com";
export const DEMO_ADMIN_EMAIL    = "demo@hubifyhomesonline.com";
export const DEMO_ADMIN_PASSWORD = "Demo2026!";
export const DEMO_PORTAL_EMAIL   = "client@demo.hubifyhomesonline.com";
export const DEMO_PORTAL_PASSWORD = "DemoClient2026!";

const USER_IDS = {
  admin:      "demo-admin",
  supervisor: "demo-supervisor",
  staff1:     "demo-staff-1",
  staff2:     "demo-staff-2",
};

const CALENDAR_ID    = "0000de40-0000-0000-0000-000000000001";
const CLIENT_MAIN_ID = "0000de40-0000-0000-0000-000000000010";
const CLIENT_VIP_ID  = "0000de40-0000-0000-0000-000000000011";
const CLIENT_RENT_ID = "0000de40-0000-0000-0000-000000000012";
const PORTAL_USER_ID = "0000de40-0000-0000-0000-000000000020";

// ─── Time helpers ─────────────────────────────────────────────────────────────

const NOW = new Date();
const days  = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);
const hours = (h: number, base?: Date) => {
  const d = base ? new Date(base) : new Date(NOW);
  d.setHours(h, 0, 0, 0);
  return d;
};
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

// ─── Logging helpers ─────────────────────────────────────────────────────────

let created = 0;
let skipped = 0;

function resetCounters() { created = 0; skipped = 0; }

const log = (action: "create" | "skip" | "info", msg: string) => {
  if (action === "create") created++;
  else if (action === "skip") skipped++;
  const prefix = action === "create" ? "[+]" : action === "skip" ? "[=]" : "[i]";
  console.log(`  ${prefix} ${msg}`);
};

// ─── Generic upsert helpers ───────────────────────────────────────────────────

async function ensureOrg() {
  const [ex] = await db.select().from(orgs).where(eq(orgs.id, DEMO_ORG_ID)).limit(1);
  if (ex) { log("skip", `Org "${DEMO_ORG_NAME}"`); return; }
  await db.insert(orgs).values({
    id: DEMO_ORG_ID,
    name: DEMO_ORG_NAME,
    domain: DEMO_DOMAIN,
    isActive: true,
    timezone: "America/New_York",
    currency: "USD",
    industry: "Property Management",
    primaryContact: "Demo Admin",
    phone: "239-555-0200",
    website: `https://${DEMO_DOMAIN}`,
    defaultHourlyRateCents: 8500,
    city: "Naples",
    state: "FL",
  });
  log("create", `Org "${DEMO_ORG_NAME}"`);
}

async function ensureUser(
  id: string, email: string, firstName: string, lastName: string,
  role: "admin" | "supervisor" | "staff", password?: string, supervisorId?: string
) {
  const [ex] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (ex) {
    if (password && !ex.passwordHash) {
      const hash = await bcrypt.hash(password, 12);
      await db.update(users).set({ passwordHash: hash }).where(eq(users.id, id));
    }
    log("skip", `User ${email}`);
    return;
  }
  const passwordHash = password ? await bcrypt.hash(password, 12) : null;
  await db.insert(users).values({
    id, orgId: DEMO_ORG_ID, email, firstName, lastName, role,
    tier: "premium", supervisorId: supervisorId ?? null, isActive: true,
    passwordHash: passwordHash ?? null,
  });
  log("create", `User ${email} (${role})`);
}

async function ensureContact(opts: {
  firstName: string; lastName: string; email: string; phone?: string;
  type: "owner" | "vendor" | "tenant" | "emergency_contact" | "client";
  vendorType?: string; vendorCategory?: "organization" | "individual";
}): Promise<number> {
  const [ex] = await db.select().from(contacts)
    .where(and(eq(contacts.orgId, DEMO_ORG_ID), eq(contacts.email, opts.email))).limit(1);
  if (ex) { log("skip", `Contact ${opts.email}`); return ex.id; }
  const [row] = await db.insert(contacts).values({
    orgId: DEMO_ORG_ID, ...opts, isActive: true,
  }).returning();
  log("create", `Contact ${opts.email} (${opts.type})`);
  return row.id;
}

async function ensureClient(opts: {
  id: string; email: string; firstName: string; lastName: string; phone?: string;
  orgId?: string;
}) {
  const [ex] = await db.select().from(clients).where(eq(clients.id, opts.id)).limit(1);
  if (ex) { log("skip", `Client ${opts.email}`); return; }
  await db.insert(clients).values({
    id: opts.id, orgId: DEMO_ORG_ID, email: opts.email,
    firstName: opts.firstName, lastName: opts.lastName,
    phone: opts.phone ?? null, isActive: true,
    billingEnabled: true, invoiceFrequency: "monthly",
    defaultHourlyRateCents: 8500,
  });
  log("create", `Client ${opts.email}`);
}

async function ensurePortalUser() {
  const [ex] = await db.select().from(portalUsers).where(eq(portalUsers.id, PORTAL_USER_ID)).limit(1);
  if (ex) { log("skip", "Portal user"); return; }
  const passwordHash = await bcrypt.hash(DEMO_PORTAL_PASSWORD, 10);
  await db.insert(portalUsers).values({
    id: PORTAL_USER_ID, orgId: DEMO_ORG_ID,
    email: DEMO_PORTAL_EMAIL, passwordHash,
    firstName: "Morgan", lastName: "Demouser",
    role: "staff", isActive: true, emailVerified: true,
  });
  log("create", `Portal user ${DEMO_PORTAL_EMAIL}`);
}

async function ensurePortalPropertyLink(propertyId: number) {
  const [ex] = await db.select().from(portalUserProperties)
    .where(and(eq(portalUserProperties.portalUserId, PORTAL_USER_ID), eq(portalUserProperties.propertyId, propertyId)))
    .limit(1);
  if (ex) return;
  await db.insert(portalUserProperties).values({
    portalUserId: PORTAL_USER_ID, propertyId, relationship: "owner", isActive: true,
  });
}

async function ensureProperty(opts: {
  name: string; type: string; address1: string; city: string; state: string; zip: string;
  units?: number; squareFootage?: number; managerId?: string; primaryContactId?: number;
  description?: string; status?: string;
}): Promise<number> {
  const [ex] = await db.select().from(properties)
    .where(and(eq(properties.orgId, DEMO_ORG_ID), eq(properties.name, opts.name))).limit(1);
  if (ex) { log("skip", `Property "${opts.name}"`); return ex.id; }
  const [row] = await db.insert(properties).values({
    orgId: DEMO_ORG_ID, name: opts.name, type: opts.type,
    address1: opts.address1, city: opts.city, state: opts.state, zip: opts.zip,
    units: opts.units ?? 1, squareFootage: opts.squareFootage,
    managerId: opts.managerId, primaryContactId: opts.primaryContactId,
    description: opts.description, status: (opts.status ?? "occupied") as any,
    isActive: true,
  }).returning();
  log("create", `Property "${opts.name}"`);
  return row.id;
}

async function ensureAccess(propertyId: number, category: string, description: string, value: string, notes?: string) {
  const [ex] = await db.select().from(propertyAccessItems)
    .where(and(eq(propertyAccessItems.propertyId, propertyId), eq(propertyAccessItems.description, description))).limit(1);
  if (ex) return;
  await db.insert(propertyAccessItems).values({
    propertyId, category, description, value, notes: notes ?? null,
    createdById: USER_IDS.admin,
  });
  log("create", `Access "${description}"`);
}

async function ensureVendorLink(propertyId: number, vendorId: number, notes?: string) {
  const [ex] = await db.select().from(propertyVendors)
    .where(and(eq(propertyVendors.propertyId, propertyId), eq(propertyVendors.vendorId, vendorId))).limit(1);
  if (ex) return;
  await db.insert(propertyVendors).values({ orgId: DEMO_ORG_ID, propertyId, vendorId, notes });
  log("create", `Vendor link on property ${propertyId}`);
}

async function ensureTask(opts: {
  title: string; propertyId: number; description?: string;
  status?: "pending" | "in_progress" | "completed" | "cancelled";
  priority?: "urgent" | "high" | "normal" | "low";
  category?: string; assignedToId?: string; dueDate?: Date;
  completedAt?: Date | null; isRecurring?: boolean; recurrenceRule?: string;
  inspectionScheduleId?: number;
  attachments?: Array<{ url: string; filename: string; category?: "before" | "after" | null }>;
}): Promise<number> {
  const [ex] = await db.select().from(tasks)
    .where(and(eq(tasks.title, opts.title), eq(tasks.propertyId, opts.propertyId))).limit(1);
  if (ex) { log("skip", `Task "${opts.title}"`); return ex.id; }
  const [row] = await db.insert(tasks).values({
    title: opts.title, description: opts.description,
    status: opts.status ?? "pending", priority: opts.priority ?? "normal",
    propertyId: opts.propertyId, assignedToId: opts.assignedToId,
    assignedById: USER_IDS.admin, dueDate: opts.dueDate,
    completedAt: opts.completedAt ?? null, category: opts.category,
    isRecurring: opts.isRecurring ?? false, recurrenceRule: opts.recurrenceRule,
    attachments: opts.attachments ?? [], inspectionScheduleId: opts.inspectionScheduleId,
  }).returning();
  log("create", `Task "${opts.title}"`);
  return row.id;
}

async function ensureChecklistItems(
  taskId: number,
  items: Array<{ text: string; result: "pass" | "fail" | "na"; note?: string }>,
  completedBy?: string
) {
  const ex = await db.select().from(taskChecklistItems).where(eq(taskChecklistItems.taskId, taskId));
  if (ex.length > 0) { log("skip", `Checklist for task ${taskId}`); return; }
  await db.insert(taskChecklistItems).values(
    items.map((item, idx) => ({
      taskId, text: item.text, completed: true, result: item.result,
      resultNote: item.note, sortOrder: idx, completedAt: NOW,
      completedBy: completedBy ?? USER_IDS.staff1,
    }))
  );
  log("create", `${items.length} checklist items for task ${taskId}`);
}

async function ensureInspectionSchedule(opts: {
  propertyId: number; frequency: "weekly" | "monthly" | "quarterly" | "annually";
  inspectorUserId?: string;
}): Promise<number> {
  const [ex] = await db.select().from(inspectionSchedules)
    .where(and(eq(inspectionSchedules.orgId, DEMO_ORG_ID), eq(inspectionSchedules.propertyId, opts.propertyId), eq(inspectionSchedules.frequency, opts.frequency))).limit(1);
  if (ex) { log("skip", `Inspection schedule (${opts.frequency}) on property ${opts.propertyId}`); return ex.id; }
  const daysOut = opts.frequency === "weekly" ? 7 : opts.frequency === "monthly" ? 30 : opts.frequency === "quarterly" ? 90 : 365;
  const [row] = await db.insert(inspectionSchedules).values({
    orgId: DEMO_ORG_ID, propertyId: opts.propertyId, frequency: opts.frequency,
    startDate: isoDate(days(-14)),
    nextDueDate: isoDate(days(daysOut - 14)),
    inspectorUserId: opts.inspectorUserId,
    isActive: true, createdBy: USER_IDS.admin,
  }).returning();
  log("create", `Inspection schedule (${opts.frequency}) on property ${opts.propertyId}`);
  return row.id;
}

async function ensureCalendar() {
  const [ex] = await db.select().from(calendars).where(eq(calendars.id, CALENDAR_ID)).limit(1);
  if (ex) { log("skip", "Calendar"); return; }
  await db.insert(calendars).values({
    id: CALENDAR_ID, orgId: DEMO_ORG_ID, name: "Demo Team",
    color: "#0891b2", isDefault: true, createdById: USER_IDS.admin,
  });
  log("create", "Calendar");
}

async function ensureEvent(opts: {
  id: string; title: string; start: Date; end: Date; organizerId: string;
  attendeeIds?: string[]; recurrenceRule?: string; location?: string;
  description?: string; propertyId?: number;
}) {
  const [ex] = await db.select().from(events).where(eq(events.id, opts.id)).limit(1);
  if (ex) { log("skip", `Event "${opts.title}"`); return; }
  await db.insert(events).values({
    id: opts.id, orgId: DEMO_ORG_ID, calendarId: CALENDAR_ID,
    title: opts.title, description: opts.description, location: opts.location,
    start: opts.start, end: opts.end, timezone: "America/New_York",
    organizerId: opts.organizerId, createdById: opts.organizerId,
    propertyId: opts.propertyId, recurrenceRule: opts.recurrenceRule, visibility: "org",
  });
  if (opts.attendeeIds?.length) {
    await db.insert(eventAttendees).values(
      opts.attendeeIds.map(uid => ({
        eventId: opts.id, type: "user", userId: uid, responseStatus: "accepted",
      }))
    );
  }
  log("create", `Event "${opts.title}"`);
}

async function ensureInvoice(opts: {
  id: string; invoiceNumber: string; clientId: string; amountCents: number;
  status: "draft" | "open" | "paid" | "void";
  dueDate?: Date; paymentStatus?: "succeeded"; paymentDate?: Date;
  receiptUrl?: string; paymentMethodBrand?: string; paymentMethodLast4?: string;
  description?: string; metadata?: Record<string, any>;
}) {
  const [ex] = await db.select().from(clientInvoices).where(eq(clientInvoices.id, opts.id)).limit(1);
  if (ex) { log("skip", `Invoice ${opts.invoiceNumber}`); return; }
  await db.insert(clientInvoices).values({
    id: opts.id, orgId: DEMO_ORG_ID, clientId: opts.clientId,
    invoiceNumber: opts.invoiceNumber, amountCents: opts.amountCents, currency: "usd",
    status: opts.status, paymentStatus: opts.paymentStatus, paymentDate: opts.paymentDate,
    dueDate: opts.dueDate, issuedAt: opts.status === "draft" ? null : days(-5),
    sentAt: opts.status === "draft" ? null : days(-5),
    description: opts.description, receiptUrl: opts.receiptUrl,
    paymentMethodBrand: opts.paymentMethodBrand, paymentMethodLast4: opts.paymentMethodLast4,
    metadata: opts.metadata ?? {}, createdBy: USER_IDS.admin,
  });
  log("create", `Invoice ${opts.invoiceNumber} (${opts.status})`);
}

async function ensureNotification(opts: {
  userId: string; type: "task_assigned"|"task_overdue"|"inspection_due"|"invoice_due"|"mention"|"general";
  title: string; body: string; linkUrl?: string;
}) {
  const [ex] = await db.select().from(notifications)
    .where(and(eq(notifications.orgId, DEMO_ORG_ID), eq(notifications.userId, opts.userId), eq(notifications.title, opts.title))).limit(1);
  if (ex) { log("skip", `Notification "${opts.title}"`); return; }
  await db.insert(notifications).values({
    orgId: DEMO_ORG_ID, userId: opts.userId, type: opts.type,
    title: opts.title, body: opts.body, linkUrl: opts.linkUrl, isRead: false,
  });
  log("create", `Notification "${opts.title}"`);
}

// Photo attachments used across tasks
const PHOTOS = [
  { url: "https://example.com/demo/before.jpg", filename: "before.jpg", category: "before" as const },
  { url: "https://example.com/demo/after.jpg",  filename: "after.jpg",  category: "after"  as const },
];

// ─── Main seed function ───────────────────────────────────────────────────────

export async function seedDemoTenant() {
  resetCounters();
  console.log("[DEMO SEED] Starting…");

  // ── 1. Org ──────────────────────────────────────────────────────────────────
  await ensureOrg();

  // ── 2. Staff users ──────────────────────────────────────────────────────────
  await ensureUser(USER_IDS.admin,      DEMO_ADMIN_EMAIL,                          "Demo",   "Admin",   "admin",      DEMO_ADMIN_PASSWORD);
  await ensureUser(USER_IDS.supervisor, "supervisor@demo.hubifyhomesonline.com",    "Rachel", "Torres",  "supervisor", undefined, USER_IDS.admin);
  await ensureUser(USER_IDS.staff1,     "jordan@demo.hubifyhomesonline.com",        "Jordan", "Lee",     "staff",      undefined, USER_IDS.supervisor);
  await ensureUser(USER_IDS.staff2,     "casey@demo.hubifyhomesonline.com",         "Casey",  "Morgan",  "staff",      undefined, USER_IDS.supervisor);

  // ── 3. Vendors (contacts) ────────────────────────────────────────────────────
  const vHvac  = await ensureContact({ firstName: "CoolBreeze",  lastName: "HVAC LLC",          email: "coolbreeze@demo.test",   phone: "239-555-0401", type: "vendor", vendorType: "hvac",        vendorCategory: "organization" });
  const vPlumb = await ensureContact({ firstName: "FastFlow",    lastName: "Plumbing Co.",       email: "fastflow@demo.test",     phone: "239-555-0402", type: "vendor", vendorType: "plumber",     vendorCategory: "organization" });
  const vElec  = await ensureContact({ firstName: "Bright",      lastName: "Electric LLC",       email: "brightelectric@demo.test",phone:"239-555-0403",type: "vendor", vendorType: "electrician", vendorCategory: "organization" });
  const vPool  = await ensureContact({ firstName: "ClearWater",  lastName: "Pool Services",      email: "clearwater@demo.test",   phone: "239-555-0404", type: "vendor", vendorType: "pool",        vendorCategory: "organization" });
  const vLawn  = await ensureContact({ firstName: "GreenEdge",   lastName: "Landscaping",        email: "greenedge@demo.test",    phone: "239-555-0405", type: "vendor", vendorType: "landscaping", vendorCategory: "organization" });
  const vRoof  = await ensureContact({ firstName: "StormGuard",  lastName: "Roofing Inc.",       email: "stormguard@demo.test",   phone: "239-555-0406", type: "vendor", vendorType: "roofing",     vendorCategory: "organization" });
  const vClean = await ensureContact({ firstName: "Pristine",    lastName: "Cleaning Services",  email: "pristine@demo.test",     phone: "239-555-0407", type: "vendor", vendorType: "cleaning",    vendorCategory: "organization" });
  const vSmart = await ensureContact({ firstName: "SmartHome",   lastName: "Tech Solutions",     email: "smarthome@demo.test",    phone: "239-555-0408", type: "vendor", vendorType: "technology",  vendorCategory: "organization" });
  const vIrrig = await ensureContact({ firstName: "Aqua",        lastName: "Irrigation Systems", email: "aquairrig@demo.test",    phone: "239-555-0409", type: "vendor", vendorType: "irrigation",  vendorCategory: "organization" });
  const vRemed = await ensureContact({ firstName: "DryPro",      lastName: "Remediation LLC",    email: "drypro@demo.test",       phone: "239-555-0410", type: "vendor", vendorType: "remediation", vendorCategory: "organization" });

  // ── 4. Property owner contacts (10 primary clients) ─────────────────────────
  const cBeach   = await ensureContact({ firstName: "Sandra",   lastName: "Holloway",   email: "s.holloway@demo.test",  phone: "941-555-0101", type: "owner" });
  const cSunset  = await ensureContact({ firstName: "Victor",   lastName: "Ashford",    email: "v.ashford@demo.test",   phone: "786-555-0102", type: "owner" });
  const cCoconut = await ensureContact({ firstName: "Elena",    lastName: "Castillo",   email: "e.castillo@demo.test",  phone: "239-555-0103", type: "owner" });
  const cPelican = await ensureContact({ firstName: "Thomas",   lastName: "Brinkley",   email: "t.brinkley@demo.test",  phone: "305-555-0104", type: "owner" });
  const cRoyal   = await ensureContact({ firstName: "Natasha",  lastName: "Whitmore",   email: "n.whitmore@demo.test",  phone: "561-555-0105", type: "owner" });
  const cMarina  = await ensureContact({ firstName: "Derek",    lastName: "Nguyen",     email: "d.nguyen@demo.test",    phone: "954-555-0106", type: "owner" });
  const cGulf    = await ensureContact({ firstName: "Patricia", lastName: "Sommers",    email: "p.sommers@demo.test",   phone: "727-555-0107", type: "owner" });
  const cSand    = await ensureContact({ firstName: "Michael",  lastName: "Okafor",     email: "m.okafor@demo.test",    phone: "407-555-0108", type: "owner" });
  const cLight   = await ensureContact({ firstName: "Jennifer", lastName: "Marchand",   email: "j.marchand@demo.test",  phone: "850-555-0109", type: "owner" });
  const cOcean   = await ensureContact({ firstName: "William",  lastName: "Hartfield",  email: "w.hartfield@demo.test", phone: "321-555-0110", type: "owner" });

  // ── 5. Billing clients (portal login uses CLIENT_MAIN_ID) ───────────────────
  await ensureClient({ id: CLIENT_MAIN_ID, email: "s.holloway@demo.test",  firstName: "Sandra",  lastName: "Holloway",  phone: "941-555-0101" });
  await ensureClient({ id: CLIENT_VIP_ID,  email: "n.whitmore@demo.test",  firstName: "Natasha", lastName: "Whitmore",  phone: "561-555-0105" });
  await ensureClient({ id: CLIENT_RENT_ID, email: "d.nguyen@demo.test",    firstName: "Derek",   lastName: "Nguyen",    phone: "954-555-0106" });
  await ensurePortalUser();

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPERTY 1 — Beachside Breeze
  // Standard Home Watch | HVAC not cooling before owner arrival
  // ═══════════════════════════════════════════════════════════════════════════
  const p1 = await ensureProperty({
    name: "Beachside Breeze", type: "single_family",
    address1: "412 Gulf Shore Blvd N", city: "Naples", state: "FL", zip: "34102",
    squareFootage: 2800, managerId: USER_IDS.staff1, primaryContactId: cBeach,
    description: "Beachside single-family home. Owner arrives quarterly. Weekly home watch required.",
    status: "occupied",
  });
  await ensureAccess(p1, "door",  "Front door keypad",   "7713*");
  await ensureAccess(p1, "alarm", "Security system code", "5542");
  await ensureAccess(p1, "wifi",  "Wi-Fi password",       "BeachBreeze2026!");
  await ensureVendorLink(p1, vHvac, "Annual AC contract");
  await ensureVendorLink(p1, vPool);

  const p1sched = await ensureInspectionSchedule({ propertyId: p1, frequency: "weekly",   inspectorUserId: USER_IDS.staff1 });
  const p1sched2= await ensureInspectionSchedule({ propertyId: p1, frequency: "monthly",  inspectorUserId: USER_IDS.staff1 });

  // Completed weekly inspection
  const t1a = await ensureTask({ title: "Weekly Home Watch — Beachside Breeze", propertyId: p1, status: "completed", priority: "normal", category: "inspection", assignedToId: USER_IDS.staff1, dueDate: days(-3), completedAt: days(-2), inspectionScheduleId: p1sched, attachments: PHOTOS });
  await ensureChecklistItems(t1a, [
    { text: "Exterior condition check", result: "pass" },
    { text: "Check for water intrusion", result: "pass" },
    { text: "HVAC thermostat — cooling test", result: "fail", note: "Unit not cooling — temp 84°F inside, set to 72°F. Vendor call needed." },
    { text: "Refrigerator and appliances on", result: "pass" },
    { text: "Locks and entry points secure", result: "pass" },
    { text: "Pool/spa level normal", result: "pass" },
  ]);

  // Active scenario tasks
  await ensureTask({ title: "Schedule HVAC vendor — AC not cooling", propertyId: p1, status: "in_progress", priority: "urgent", category: "maintenance", assignedToId: USER_IDS.staff1, dueDate: days(0), description: "Call CoolBreeze HVAC. Unit is at 84°F interior, set to 72°F. Owner arrives in 5 days." });
  await ensureTask({ title: "HVAC thermostat inspection and diagnosis", propertyId: p1, status: "pending", priority: "high", category: "inspection", assignedToId: USER_IDS.staff1, dueDate: days(1) });
  await ensureTask({ title: "Owner arrival prep — cleaning and stock fridge", propertyId: p1, status: "pending", priority: "high", category: "cleaning", assignedToId: USER_IDS.staff1, dueDate: days(3) });
  await ensureTask({ title: "Follow up with client — HVAC repair status update", propertyId: p1, status: "pending", priority: "normal", category: "administrative", assignedToId: USER_IDS.supervisor, dueDate: days(2) });
  await ensureTask({ title: "Monthly inspection — Beachside Breeze", propertyId: p1, status: "pending", priority: "normal", category: "inspection", assignedToId: USER_IDS.staff1, dueDate: days(14), inspectionScheduleId: p1sched2 });
  await ensureTask({ title: "Weekly home watch — Beachside Breeze (recurring)", propertyId: p1, status: "pending", priority: "normal", category: "inspection", assignedToId: USER_IDS.staff1, dueDate: days(7), isRecurring: true, recurrenceRule: "FREQ=WEEKLY;BYDAY=TU", inspectionScheduleId: p1sched });
  await ensurePortalPropertyLink(p1);

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPERTY 2 — Sunset Key Villa
  // Luxury Estate | Pool heater failure + smart-home system offline
  // ═══════════════════════════════════════════════════════════════════════════
  const p2 = await ensureProperty({
    name: "Sunset Key Villa", type: "single_family",
    address1: "1620 Gordon Drive", city: "Naples", state: "FL", zip: "34102",
    squareFootage: 6200, managerId: USER_IDS.supervisor, primaryContactId: cSunset,
    description: "Luxury waterfront estate. Year-round full estate management. Pool, spa, and smart-home integrated.",
    status: "occupied",
  });
  await ensureAccess(p2, "gate",  "Estate gate code",     "3391*");
  await ensureAccess(p2, "door",  "Front door smart lock", "1204-VICTOR");
  await ensureAccess(p2, "pool",  "Pool equipment room",   "Key in lockbox: SV-POOL");
  await ensureVendorLink(p2, vPool, "Weekly pool and spa service");
  await ensureVendorLink(p2, vSmart, "Smart-home system vendor");
  await ensureVendorLink(p2, vHvac);

  const p2sched = await ensureInspectionSchedule({ propertyId: p2, frequency: "monthly",   inspectorUserId: USER_IDS.supervisor });

  const t2a = await ensureTask({ title: "Estate monthly inspection — Sunset Key Villa", propertyId: p2, status: "completed", priority: "high", category: "inspection", assignedToId: USER_IDS.supervisor, dueDate: days(-7), completedAt: days(-5), inspectionScheduleId: p2sched, attachments: PHOTOS });
  await ensureChecklistItems(t2a, [
    { text: "Pool water chemistry balanced", result: "fail", note: "Pool heater offline — water at 68°F, expected 82°F" },
    { text: "Smart home hub connectivity", result: "fail", note: "Hub shows offline — lights and locks unresponsive" },
    { text: "Exterior lighting operational", result: "pass" },
    { text: "Irrigation running on schedule", result: "pass" },
    { text: "Interior climate control", result: "pass" },
    { text: "Security camera feeds active", result: "pass" },
  ], USER_IDS.supervisor);

  await ensureTask({ title: "Pool heater service — Sunset Key Villa", propertyId: p2, status: "in_progress", priority: "urgent", category: "repair", assignedToId: USER_IDS.staff2, dueDate: days(1), description: "ClearWater Pool Services dispatched. Pool heater offline — error code E-04." });
  await ensureTask({ title: "Smart-home system reset and diagnostics", propertyId: p2, status: "in_progress", priority: "high", category: "repair", assignedToId: USER_IDS.staff2, dueDate: days(1), description: "SmartHome Tech Solutions on site. Hub offline. Needs factory reset and re-pairing." });
  await ensureTask({ title: "Estate walkthrough after vendor repairs", propertyId: p2, status: "pending", priority: "normal", category: "inspection", assignedToId: USER_IDS.supervisor, dueDate: days(3) });
  await ensureTask({ title: "Vendor follow-up confirmation — pool and smart-home", propertyId: p2, status: "pending", priority: "normal", category: "administrative", assignedToId: USER_IDS.supervisor, dueDate: days(4) });
  await ensureTask({ title: "Weekly pool chemical check (recurring)", propertyId: p2, status: "pending", priority: "normal", category: "maintenance", assignedToId: USER_IDS.staff2, dueDate: days(5), isRecurring: true, recurrenceRule: "FREQ=WEEKLY;BYDAY=FR" });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPERTY 3 — Coconut Harbor Retreat
  // Seasonal/Snowbird | Hurricane prep required
  // ═══════════════════════════════════════════════════════════════════════════
  const p3 = await ensureProperty({
    name: "Coconut Harbor Retreat", type: "single_family",
    address1: "310 Coconut Dr", city: "Fort Myers", state: "FL", zip: "33919",
    squareFootage: 2300, managerId: USER_IDS.staff2, primaryContactId: cCoconut,
    description: "Seasonal snowbird property — owners absent June–November. Hurricane prep and close-up services required.",
    status: "vacant",
  });
  await ensureAccess(p3, "door",  "Lockbox code",           "8874");
  await ensureAccess(p3, "alarm", "Alarm disarm code",       "1123");

  const p3sched = await ensureInspectionSchedule({ propertyId: p3, frequency: "monthly",   inspectorUserId: USER_IDS.staff2 });

  const t3a = await ensureTask({ title: "Hurricane prep inspection — Coconut Harbor", propertyId: p3, status: "in_progress", priority: "urgent", category: "inspection", assignedToId: USER_IDS.staff2, dueDate: days(0), inspectionScheduleId: p3sched, attachments: PHOTOS });
  await ensureChecklistItems(t3a, [
    { text: "Hurricane shutters installed — front", result: "pass" },
    { text: "Hurricane shutters installed — rear and side", result: "fail", note: "Rear shutters not yet installed — awaiting hardware" },
    { text: "Lanai furniture secured or stored", result: "pass" },
    { text: "Generator fuel level checked", result: "fail", note: "Generator at 25% — needs fuel before storm" },
    { text: "Exterior photos taken — pre-storm", result: "pass" },
    { text: "Sump pump functional", result: "pass" },
  ], USER_IDS.staff2);

  await ensureTask({ title: "Install rear hurricane shutters", propertyId: p3, status: "pending", priority: "urgent", category: "maintenance", assignedToId: USER_IDS.staff2, dueDate: days(0) });
  await ensureTask({ title: "Fuel generator — pre-storm", propertyId: p3, status: "pending", priority: "urgent", category: "maintenance", assignedToId: USER_IDS.staff2, dueDate: days(0) });
  await ensureTask({ title: "Secure lanai furniture and store loose items", propertyId: p3, status: "completed", priority: "high", category: "maintenance", assignedToId: USER_IDS.staff2, dueDate: days(-1), completedAt: days(-1) });
  await ensureTask({ title: "Photograph exterior condition — pre-storm documentation", propertyId: p3, status: "completed", priority: "normal", category: "administrative", assignedToId: USER_IDS.staff2, dueDate: days(-1), completedAt: days(-1), attachments: PHOTOS });
  await ensureTask({ title: "Post-storm exterior inspection", propertyId: p3, status: "pending", priority: "high", category: "inspection", assignedToId: USER_IDS.staff2, dueDate: days(3) });
  await ensureTask({ title: "Monthly vacant property check (recurring)", propertyId: p3, status: "pending", priority: "normal", category: "inspection", assignedToId: USER_IDS.staff2, dueDate: days(30), isRecurring: true, recurrenceRule: "FREQ=MONTHLY;BYMONTHDAY=15", inspectionScheduleId: p3sched });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPERTY 4 — Pelican Point Cottage
  // Emergency | Water leak discovered during inspection
  // ═══════════════════════════════════════════════════════════════════════════
  const p4 = await ensureProperty({
    name: "Pelican Point Cottage", type: "single_family",
    address1: "87 Pelican Bay Blvd", city: "Naples", state: "FL", zip: "34108",
    squareFootage: 1650, managerId: USER_IDS.staff1, primaryContactId: cPelican,
    description: "Quaint coastal cottage. Emergency water leak detected in kitchen during last inspection.",
    status: "occupied",
  });
  await ensureAccess(p4, "door",  "Front door code", "2291#");
  await ensureVendorLink(p4, vPlumb, "Emergency plumber");
  await ensureVendorLink(p4, vRemed, "Water damage remediation");

  const p4sched = await ensureInspectionSchedule({ propertyId: p4, frequency: "monthly",   inspectorUserId: USER_IDS.staff1 });

  const t4a = await ensureTask({ title: "Emergency inspection — Pelican Point water leak", propertyId: p4, status: "completed", priority: "urgent", category: "inspection", assignedToId: USER_IDS.staff1, dueDate: days(-2), completedAt: days(-2), inspectionScheduleId: p4sched, attachments: PHOTOS });
  await ensureChecklistItems(t4a, [
    { text: "Kitchen under-sink cabinet inspection", result: "fail", note: "Active leak from supply line — water pooling on cabinet floor" },
    { text: "Water main shut off", result: "pass", note: "Shut off main valve immediately" },
    { text: "Extent of water damage documented", result: "pass", note: "Cabinet floor warped, drywall wicking moisture" },
    { text: "No structural damage visible", result: "pass" },
    { text: "Mold/mildew risk assessment", result: "na", note: "Remediation vendor needed within 24h" },
  ]);

  await ensureTask({ title: "OVERDUE: Plumber on-site — kitchen supply line repair", propertyId: p4, status: "in_progress", priority: "urgent", category: "repair", assignedToId: USER_IDS.staff1, dueDate: days(-1), description: "FastFlow Plumbing dispatched. Repair supply line and assess cabinet damage." });
  await ensureTask({ title: "Document water damage with photos for insurance", propertyId: p4, status: "completed", priority: "high", category: "administrative", assignedToId: USER_IDS.staff1, dueDate: days(-2), completedAt: days(-2), attachments: PHOTOS });
  await ensureTask({ title: "Notify client — water leak and repair status", propertyId: p4, status: "completed", priority: "urgent", category: "administrative", assignedToId: USER_IDS.supervisor, dueDate: days(-2), completedAt: days(-2) });
  await ensureTask({ title: "Schedule water remediation — DryPro", propertyId: p4, status: "pending", priority: "high", category: "repair", assignedToId: USER_IDS.supervisor, dueDate: days(1) });
  await ensureTask({ title: "Follow-up inspection — verify leak repair complete", propertyId: p4, status: "pending", priority: "high", category: "inspection", assignedToId: USER_IDS.staff1, dueDate: days(5) });
  await ensureTask({ title: "Mold risk re-check after remediation", propertyId: p4, status: "pending", priority: "normal", category: "inspection", assignedToId: USER_IDS.staff1, dueDate: days(14) });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPERTY 5 — Royal Palm Estate
  // VIP Luxury | Owner event preparation
  // ═══════════════════════════════════════════════════════════════════════════
  const p5 = await ensureProperty({
    name: "Royal Palm Estate", type: "single_family",
    address1: "2800 Royal Palm Way", city: "Palm Beach", state: "FL", zip: "33480",
    squareFootage: 8400, managerId: USER_IDS.supervisor, primaryContactId: cRoyal,
    description: "VIP luxury estate — high-touch management. Owner hosting event in 6 days. Full preparation required.",
    status: "occupied",
  });
  await ensureAccess(p5, "gate",  "Estate entrance gate",  "ROYAL-2026");
  await ensureAccess(p5, "door",  "Main entrance code",    "4488*");
  await ensureAccess(p5, "pool",  "Pool house key",        "Lockbox: RP-POOL");
  await ensureVendorLink(p5, vClean, "Event deep-clean team");
  await ensureVendorLink(p5, vLawn, "Luxury landscaping");
  await ensureVendorLink(p5, vPool);

  const p5sched = await ensureInspectionSchedule({ propertyId: p5, frequency: "monthly",   inspectorUserId: USER_IDS.supervisor });

  const t5a = await ensureTask({ title: "Pre-event estate inspection — Royal Palm", propertyId: p5, status: "completed", priority: "high", category: "inspection", assignedToId: USER_IDS.supervisor, dueDate: days(-3), completedAt: days(-2), inspectionScheduleId: p5sched, attachments: PHOTOS });
  await ensureChecklistItems(t5a, [
    { text: "Grounds and landscaping guest-ready", result: "fail", note: "Lawn needs edging and flower beds refreshed" },
    { text: "Pool and spa clean and heated", result: "pass" },
    { text: "All indoor lighting operational", result: "pass" },
    { text: "Event area set up per owner spec", result: "fail", note: "Setup not started — scheduled for Day-3" },
    { text: "Catering prep area accessible", result: "pass" },
    { text: "Vehicle access and parking clear", result: "pass" },
  ], USER_IDS.supervisor);

  await ensureTask({ title: "Deep cleaning — interior and event areas", propertyId: p5, status: "in_progress", priority: "high", category: "cleaning", assignedToId: USER_IDS.staff1, dueDate: days(1), description: "Pristine Cleaning 6-person team. Full interior plus patio and pool deck." });
  await ensureTask({ title: "Landscaping refresh — edging, flowers, walkways", propertyId: p5, status: "in_progress", priority: "high", category: "maintenance", assignedToId: USER_IDS.staff2, dueDate: days(1) });
  await ensureTask({ title: "Vehicle detailing — owner's 2 cars", propertyId: p5, status: "pending", priority: "normal", category: "maintenance", assignedToId: USER_IDS.staff2, dueDate: days(2) });
  await ensureTask({ title: "Grocery and wine delivery coordination", propertyId: p5, status: "pending", priority: "normal", category: "administrative", assignedToId: USER_IDS.supervisor, dueDate: days(3) });
  await ensureTask({ title: "Final event walkthrough — day before", propertyId: p5, status: "pending", priority: "high", category: "inspection", assignedToId: USER_IDS.supervisor, dueDate: days(5) });
  await ensureTask({ title: "Post-event walkthrough and inventory", propertyId: p5, status: "pending", priority: "normal", category: "inspection", assignedToId: USER_IDS.supervisor, dueDate: days(8) });
  await ensureTask({ title: "Monthly estate inspection (recurring)", propertyId: p5, status: "pending", priority: "normal", category: "inspection", assignedToId: USER_IDS.supervisor, dueDate: days(30), isRecurring: true, recurrenceRule: "FREQ=MONTHLY;BYMONTHDAY=1", inspectionScheduleId: p5sched });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPERTY 6 — Marina Bay Condo
  // Rental/Guest Use | Guest turnover + smart lock reset
  // ═══════════════════════════════════════════════════════════════════════════
  const p6 = await ensureProperty({
    name: "Marina Bay Condo", type: "condo",
    address1: "500 Marina Blvd, Unit 8B", city: "Fort Lauderdale", state: "FL", zip: "33301",
    squareFootage: 1450, managerId: USER_IDS.staff2, primaryContactId: cMarina,
    description: "Short-term rental condo. Guest departed yesterday — turnover in progress. New guests arrive tomorrow.",
    status: "occupied",
  });
  await ensureAccess(p6, "door",  "Smart lock code (changes per guest)", "RESET-NEEDED");
  await ensureAccess(p6, "building", "Building access fob",              "FOB-8B");
  await ensureVendorLink(p6, vClean, "Turnover cleaning team");

  const p6sched = await ensureInspectionSchedule({ propertyId: p6, frequency: "monthly",   inspectorUserId: USER_IDS.staff2 });

  const t6a = await ensureTask({ title: "Guest departure inspection — Marina Bay", propertyId: p6, status: "completed", priority: "normal", category: "inspection", assignedToId: USER_IDS.staff2, dueDate: days(-1), completedAt: days(-1), inspectionScheduleId: p6sched, attachments: PHOTOS });
  await ensureChecklistItems(t6a, [
    { text: "Unit cleaned and guest items removed", result: "pass" },
    { text: "Appliances undamaged", result: "pass" },
    { text: "Smart lock reset to default code", result: "fail", note: "Lock still showing guest code — reset required before new check-in" },
    { text: "Linens and towels sent to laundry", result: "pass" },
    { text: "Balcony and outdoor furniture OK", result: "pass" },
    { text: "No damage reported", result: "pass" },
  ], USER_IDS.staff2);

  await ensureTask({ title: "Reset smart lock code — new guest code", propertyId: p6, status: "in_progress", priority: "urgent", category: "repair", assignedToId: USER_IDS.staff2, dueDate: days(0), description: "New guests arrive tomorrow morning. Reset lock to code: 4491. Send to owner." });
  await ensureTask({ title: "Turnover cleaning — full unit", propertyId: p6, status: "completed", priority: "high", category: "cleaning", assignedToId: USER_IDS.staff2, dueDate: days(0), completedAt: days(0) });
  await ensureTask({ title: "Fresh linens and towels — set up for new guests", propertyId: p6, status: "completed", priority: "normal", category: "maintenance", assignedToId: USER_IDS.staff2, dueDate: days(0), completedAt: days(0) });
  await ensureTask({ title: "Restock supplies — toiletries, kitchen basics", propertyId: p6, status: "in_progress", priority: "normal", category: "maintenance", assignedToId: USER_IDS.staff2, dueDate: days(0) });
  await ensureTask({ title: "Post-guest departure inspection (recurring)", propertyId: p6, status: "pending", priority: "normal", category: "inspection", assignedToId: USER_IDS.staff2, dueDate: days(30), isRecurring: true, recurrenceRule: "FREQ=MONTHLY;BYMONTHDAY=1", inspectionScheduleId: p6sched });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPERTY 7 — Gulfstream Manor
  // High Maintenance | Irrigation failure + HOA violation risk
  // ═══════════════════════════════════════════════════════════════════════════
  const p7 = await ensureProperty({
    name: "Gulfstream Manor", type: "single_family",
    address1: "188 Gulfstream Blvd", city: "Bonita Springs", state: "FL", zip: "34135",
    squareFootage: 3400, managerId: USER_IDS.staff1, primaryContactId: cGulf,
    description: "High-maintenance property. Recurring irrigation issues causing lawn yellowing — HOA violation risk if unresolved in 7 days.",
    status: "occupied",
  });
  await ensureAccess(p7, "door",  "Front entry keypad",   "6620#");
  await ensureAccess(p7, "gate",  "Community gate code",  "HOA-4400");
  await ensureVendorLink(p7, vIrrig, "Recurring irrigation specialist");
  await ensureVendorLink(p7, vLawn);

  const p7sched  = await ensureInspectionSchedule({ propertyId: p7, frequency: "monthly",  inspectorUserId: USER_IDS.staff1 });
  const p7schedb = await ensureInspectionSchedule({ propertyId: p7, frequency: "quarterly", inspectorUserId: USER_IDS.supervisor });

  const t7a = await ensureTask({ title: "Monthly inspection — Gulfstream Manor", propertyId: p7, status: "completed", priority: "normal", category: "inspection", assignedToId: USER_IDS.staff1, dueDate: days(-5), completedAt: days(-4), inspectionScheduleId: p7sched, attachments: PHOTOS });
  await ensureChecklistItems(t7a, [
    { text: "Lawn and landscaping condition", result: "fail", note: "Back lawn yellow — zones 3–5 not firing. HOA violation possible." },
    { text: "Irrigation controller — all zones tested", result: "fail", note: "Zones 3, 4, 5 not activating. Controller shows fault." },
    { text: "Exterior paint and structure", result: "pass" },
    { text: "Driveway and walkways", result: "pass" },
    { text: "Pool condition", result: "pass" },
  ]);

  await ensureTask({ title: "OVERDUE: Irrigation repair — zones 3–5 not firing", propertyId: p7, status: "in_progress", priority: "urgent", category: "repair", assignedToId: USER_IDS.staff1, dueDate: days(-3), description: "Aqua Irrigation dispatched. Zones 3-5 fault. HOA will issue violation within 7 days if lawn not recovered." });
  await ensureTask({ title: "HOA photo documentation — lawn condition", propertyId: p7, status: "completed", priority: "high", category: "administrative", assignedToId: USER_IDS.staff1, dueDate: days(-4), completedAt: days(-4), attachments: PHOTOS });
  await ensureTask({ title: "Landscaping follow-up — lawn treatment after repair", propertyId: p7, status: "pending", priority: "high", category: "maintenance", assignedToId: USER_IDS.staff2, dueDate: days(3) });
  await ensureTask({ title: "Supervisor review — HOA status update", propertyId: p7, status: "pending", priority: "normal", category: "administrative", assignedToId: USER_IDS.supervisor, dueDate: days(2) });
  await ensureTask({ title: "Quarterly inspection — Gulfstream Manor", propertyId: p7, status: "pending", priority: "normal", category: "inspection", assignedToId: USER_IDS.supervisor, dueDate: days(45), inspectionScheduleId: p7schedb });
  await ensureTask({ title: "Monthly irrigation zone check (recurring)", propertyId: p7, status: "pending", priority: "normal", category: "maintenance", assignedToId: USER_IDS.staff1, dueDate: days(25), isRecurring: true, recurrenceRule: "FREQ=MONTHLY;BYMONTHDAY=10", inspectionScheduleId: p7sched });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPERTY 8 — The Sandpiper
  // Seasonal Arrival | Owner arriving earlier than expected
  // ═══════════════════════════════════════════════════════════════════════════
  const p8 = await ensureProperty({
    name: "The Sandpiper", type: "single_family",
    address1: "44 Sandpiper Way", city: "Sarasota", state: "FL", zip: "34236",
    squareFootage: 2100, managerId: USER_IDS.staff1, primaryContactId: cSand,
    description: "Seasonal property — owner changing arrival to 2 days from now (was 3 weeks). Rush prep required.",
    status: "vacant",
  });
  await ensureAccess(p8, "door",  "Lockbox on front rail", "7823");
  await ensureAccess(p8, "alarm", "Alarm code",            "4491");

  const p8sched = await ensureInspectionSchedule({ propertyId: p8, frequency: "monthly",  inspectorUserId: USER_IDS.staff1 });

  const t8a = await ensureTask({ title: "Rush arrival inspection — The Sandpiper", propertyId: p8, status: "in_progress", priority: "urgent", category: "inspection", assignedToId: USER_IDS.staff1, dueDate: days(0), inspectionScheduleId: p8sched, description: "Owner arriving 2 days early. Full inspection — water, HVAC, appliances, security.", attachments: PHOTOS });
  await ensureChecklistItems(t8a, [
    { text: "Water pressure and hot water working", result: "pass" },
    { text: "AC cooling to set temperature", result: "pass" },
    { text: "All appliances operational", result: "pass" },
    { text: "Vehicle battery status checked", result: "fail", note: "Owner's SUV battery flat — needs jump or replacement" },
    { text: "No pest activity observed", result: "pass" },
    { text: "Home clean and guest-ready", result: "fail", note: "Cleaning scheduled for tomorrow — rush clean needed today" },
  ]);

  await ensureTask({ title: "Rush interior clean — owner arrives in 2 days", propertyId: p8, status: "in_progress", priority: "urgent", category: "cleaning", assignedToId: USER_IDS.staff1, dueDate: days(0), description: "Pristine Cleaning dispatched same-day." });
  await ensureTask({ title: "Refrigerator stocking — standard owner grocery list", propertyId: p8, status: "pending", priority: "high", category: "maintenance", assignedToId: USER_IDS.staff1, dueDate: days(1) });
  await ensureTask({ title: "Vehicle battery jump or replacement — owner's SUV", propertyId: p8, status: "pending", priority: "high", category: "repair", assignedToId: USER_IDS.staff1, dueDate: days(1) });
  await ensureTask({ title: "AC pre-cool — set to 72°F 4 hours before arrival", propertyId: p8, status: "pending", priority: "normal", category: "maintenance", assignedToId: USER_IDS.staff1, dueDate: days(1) });
  await ensureTask({ title: "Arrival confirmation call with owner", propertyId: p8, status: "pending", priority: "normal", category: "administrative", assignedToId: USER_IDS.supervisor, dueDate: days(1) });
  await ensureTask({ title: "Monthly property check (recurring)", propertyId: p8, status: "pending", priority: "normal", category: "inspection", assignedToId: USER_IDS.staff1, dueDate: days(30), isRecurring: true, recurrenceRule: "FREQ=MONTHLY;BYMONTHDAY=20", inspectionScheduleId: p8sched });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPERTY 9 — Lighthouse Point
  // Storm Damage | Roof leak after storm
  // ═══════════════════════════════════════════════════════════════════════════
  const p9 = await ensureProperty({
    name: "Lighthouse Point", type: "single_family",
    address1: "92 Lighthouse Rd", city: "Key West", state: "FL", zip: "33040",
    squareFootage: 1950, managerId: USER_IDS.staff2, primaryContactId: cLight,
    description: "Post-storm property — roof leak discovered. Active water intrusion into master bedroom ceiling.",
    status: "occupied",
  });
  await ensureAccess(p9, "door",  "Door lock code",  "3318*");
  await ensureVendorLink(p9, vRoof, "Emergency roofing");
  await ensureVendorLink(p9, vRemed, "Water damage remediation");

  const p9sched = await ensureInspectionSchedule({ propertyId: p9, frequency: "monthly",   inspectorUserId: USER_IDS.staff2 });

  const t9a = await ensureTask({ title: "Storm damage inspection — Lighthouse Point", propertyId: p9, status: "completed", priority: "urgent", category: "inspection", assignedToId: USER_IDS.staff2, dueDate: days(-1), completedAt: days(-1), inspectionScheduleId: p9sched, attachments: PHOTOS });
  await ensureChecklistItems(t9a, [
    { text: "Roof integrity — visual check", result: "fail", note: "Missing shingles on SE corner. Water stain on master ceiling." },
    { text: "Interior moisture check — master bedroom", result: "fail", note: "Ceiling damp, drywall soft to touch" },
    { text: "Insurance documentation photos taken", result: "pass" },
    { text: "Tarp installed over exposed area", result: "pass", note: "12x16 tarp installed by StormGuard, Day 1" },
    { text: "Electrical panel checked — no water contact", result: "pass" },
    { text: "Other rooms — no water intrusion", result: "pass" },
  ], USER_IDS.staff2);

  await ensureTask({ title: "Roofing inspection — professional assessment", propertyId: p9, status: "in_progress", priority: "urgent", category: "repair", assignedToId: USER_IDS.staff2, dueDate: days(0), description: "StormGuard Roofing on-site today. Estimate for full repair needed for insurance claim." });
  await ensureTask({ title: "Moisture assessment — master bedroom ceiling", propertyId: p9, status: "pending", priority: "high", category: "inspection", assignedToId: USER_IDS.staff2, dueDate: days(1) });
  await ensureTask({ title: "Insurance photo package — compile and submit", propertyId: p9, status: "in_progress", priority: "high", category: "administrative", assignedToId: USER_IDS.supervisor, dueDate: days(1), attachments: PHOTOS });
  await ensureTask({ title: "Tarp installation confirmed — verify coverage", propertyId: p9, status: "completed", priority: "urgent", category: "maintenance", assignedToId: USER_IDS.staff2, dueDate: days(-1), completedAt: days(-1) });
  await ensureTask({ title: "Client update call — storm damage status", propertyId: p9, status: "completed", priority: "high", category: "administrative", assignedToId: USER_IDS.supervisor, dueDate: days(-1), completedAt: days(-1) });
  await ensureTask({ title: "Schedule remediation — DryPro after roof sealed", propertyId: p9, status: "pending", priority: "high", category: "repair", assignedToId: USER_IDS.supervisor, dueDate: days(3) });
  await ensureTask({ title: "Follow-up inspection after roof repair complete", propertyId: p9, status: "pending", priority: "normal", category: "inspection", assignedToId: USER_IDS.staff2, dueDate: days(10) });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPERTY 10 — Oceanfront Oasis
  // Stable Premium | Healthy recurring maintenance account
  // ═══════════════════════════════════════════════════════════════════════════
  const p10 = await ensureProperty({
    name: "Oceanfront Oasis", type: "single_family",
    address1: "3301 Ocean Blvd", city: "Delray Beach", state: "FL", zip: "33483",
    squareFootage: 4600, managerId: USER_IDS.supervisor, primaryContactId: cOcean,
    description: "Premium stable account. Long-term client — 4 years. Full service home watch with preventative maintenance program.",
    status: "occupied",
  });
  await ensureAccess(p10, "door",  "Entry smart lock",     "OO-9933");
  await ensureAccess(p10, "gate",  "Private gate code",    "2024*OCEAN");
  await ensureAccess(p10, "alarm", "Alarm disarm",         "7741");
  await ensureAccess(p10, "pool",  "Pool equipment room",  "Key: OASIS-POOL");
  await ensureVendorLink(p10, vHvac, "Quarterly preventative maintenance");
  await ensureVendorLink(p10, vPool, "Weekly pool service");
  await ensureVendorLink(p10, vElec, "Annual electrical inspection");

  const p10sched  = await ensureInspectionSchedule({ propertyId: p10, frequency: "weekly",    inspectorUserId: USER_IDS.supervisor });
  const p10sched2 = await ensureInspectionSchedule({ propertyId: p10, frequency: "monthly",   inspectorUserId: USER_IDS.supervisor });
  const p10sched3 = await ensureInspectionSchedule({ propertyId: p10, frequency: "quarterly", inspectorUserId: USER_IDS.supervisor });

  const t10a = await ensureTask({ title: "Weekly home watch — Oceanfront Oasis", propertyId: p10, status: "completed", priority: "normal", category: "inspection", assignedToId: USER_IDS.supervisor, dueDate: days(-4), completedAt: days(-3), inspectionScheduleId: p10sched, attachments: PHOTOS });
  await ensureChecklistItems(t10a, [
    { text: "Exterior walkthrough — no visible damage", result: "pass" },
    { text: "Interior — climate stable (72°F)", result: "pass" },
    { text: "Pool chemistry and pump running", result: "pass" },
    { text: "Security system active", result: "pass" },
    { text: "No pest activity", result: "pass" },
    { text: "Mail collected and secured", result: "pass" },
  ], USER_IDS.supervisor);

  const t10b = await ensureTask({ title: "Monthly inspection — Oceanfront Oasis", propertyId: p10, status: "completed", priority: "normal", category: "inspection", assignedToId: USER_IDS.supervisor, dueDate: days(-10), completedAt: days(-9), inspectionScheduleId: p10sched2, attachments: PHOTOS });
  await ensureChecklistItems(t10b, [
    { text: "Full interior condition review", result: "pass" },
    { text: "AC filter replacement", result: "pass", note: "Filter replaced — next due in 30 days" },
    { text: "Roof and gutters — no blockage", result: "pass" },
    { text: "Irrigation system — all zones operational", result: "pass" },
    { text: "Pool heater maintaining 82°F", result: "pass" },
    { text: "Smoke/CO detectors tested", result: "pass" },
  ], USER_IDS.supervisor);

  await ensureTask({ title: "Preventative AC service — Oceanfront Oasis", propertyId: p10, status: "pending", priority: "normal", category: "maintenance", assignedToId: USER_IDS.staff1, dueDate: days(8), description: "Quarterly CoolBreeze HVAC service. Coil cleaning, refrigerant check, filter replacement." });
  await ensureTask({ title: "Weekly pool chemical check and brush", propertyId: p10, status: "pending", priority: "normal", category: "maintenance", assignedToId: USER_IDS.staff2, dueDate: days(3), isRecurring: true, recurrenceRule: "FREQ=WEEKLY;BYDAY=WE", inspectionScheduleId: p10sched });
  await ensureTask({ title: "Security system annual test — Oceanfront Oasis", propertyId: p10, status: "pending", priority: "normal", category: "maintenance", assignedToId: USER_IDS.supervisor, dueDate: days(20) });
  await ensureTask({ title: "Monthly report — Oceanfront Oasis", propertyId: p10, status: "pending", priority: "normal", category: "administrative", assignedToId: USER_IDS.supervisor, dueDate: days(15), isRecurring: true, recurrenceRule: "FREQ=MONTHLY;BYMONTHDAY=1", inspectionScheduleId: p10sched2 });
  await ensureTask({ title: "Quarterly full estate inspection", propertyId: p10, status: "pending", priority: "normal", category: "inspection", assignedToId: USER_IDS.supervisor, dueDate: days(35), inspectionScheduleId: p10sched3 });
  await ensureTask({ title: "Weekly home watch — Oceanfront Oasis (recurring)", propertyId: p10, status: "pending", priority: "normal", category: "inspection", assignedToId: USER_IDS.supervisor, dueDate: days(3), isRecurring: true, recurrenceRule: "FREQ=WEEKLY;BYDAY=MO", inspectionScheduleId: p10sched });

  // ── 6. Calendar ─────────────────────────────────────────────────────────────
  await ensureCalendar();
  // Event UUIDs — format: 0000de40-0000-0000-cafe-<12 hex digits>
  const evtId = (n: number) => `0000de40-0000-0000-cafe-${String(n).padStart(12, "0")}`;

  // Weekly team standup (recurring)
  const standup = days(1); standup.setHours(9, 0, 0, 0);
  await ensureEvent({ id: evtId(1), title: "Weekly team standup", start: standup, end: new Date(standup.getTime() + 30*60*1000), organizerId: USER_IDS.admin, attendeeIds: [USER_IDS.supervisor, USER_IDS.staff1, USER_IDS.staff2], recurrenceRule: "FREQ=WEEKLY;BYDAY=MO", location: "Office" });

  // HVAC vendor — Beachside Breeze
  const hvacAppt = days(1); hvacAppt.setHours(10, 0, 0, 0);
  await ensureEvent({ id: evtId(2), title: "CoolBreeze HVAC — Beachside Breeze service call", start: hvacAppt, end: new Date(hvacAppt.getTime() + 2*60*60*1000), organizerId: USER_IDS.staff1, attendeeIds: [USER_IDS.staff1], location: "412 Gulf Shore Blvd N, Naples", propertyId: p1, description: "HVAC unit not cooling — AC diagnosis and repair" });

  // Owner event — Royal Palm Estate
  const eventDay = days(6); eventDay.setHours(17, 0, 0, 0);
  await ensureEvent({ id: evtId(3), title: "Owner event — Royal Palm Estate", start: eventDay, end: new Date(eventDay.getTime() + 4*60*60*1000), organizerId: USER_IDS.supervisor, attendeeIds: [USER_IDS.supervisor], location: "2800 Royal Palm Way, Palm Beach", propertyId: p5, description: "Private owner event. Full prep completed D-1." });

  // Plumber — Pelican Point
  const plumbAppt = days(0); plumbAppt.setHours(8, 0, 0, 0);
  await ensureEvent({ id: evtId(4), title: "FastFlow Plumbing — Pelican Point leak repair", start: plumbAppt, end: new Date(plumbAppt.getTime() + 3*60*60*1000), organizerId: USER_IDS.staff1, attendeeIds: [USER_IDS.staff1], location: "87 Pelican Bay Blvd, Naples", propertyId: p4 });

  // Owner arrival — The Sandpiper
  const arrival = days(2); arrival.setHours(14, 0, 0, 0);
  await ensureEvent({ id: evtId(5), title: "Owner arrival — The Sandpiper", start: arrival, end: new Date(arrival.getTime() + 60*60*1000), organizerId: USER_IDS.supervisor, attendeeIds: [USER_IDS.staff1, USER_IDS.supervisor], location: "44 Sandpiper Way, Sarasota", propertyId: p8, description: "Owner arriving 3 weeks early. Rush prep required." });

  // Smart-home vendor — Sunset Key Villa
  const smartAppt = days(1); smartAppt.setHours(13, 0, 0, 0);
  await ensureEvent({ id: evtId(6), title: "SmartHome Tech — Sunset Key Villa system reset", start: smartAppt, end: new Date(smartAppt.getTime() + 2*60*60*1000), organizerId: USER_IDS.staff2, attendeeIds: [USER_IDS.staff2], location: "1620 Gordon Drive, Naples", propertyId: p2 });

  // Hurricane prep deadline — Coconut Harbor
  const storm = days(0); storm.setHours(6, 0, 0, 0);
  await ensureEvent({ id: evtId(7), title: "Hurricane prep completion deadline — Coconut Harbor", start: storm, end: new Date(storm.getTime() + 60*60*1000), organizerId: USER_IDS.admin, attendeeIds: [USER_IDS.staff2], location: "310 Coconut Dr, Fort Myers", propertyId: p3, description: "All shutters, generator, and exterior secured by 6am." });

  // StormGuard roofing — Lighthouse Point
  const roofAppt = days(0); roofAppt.setHours(9, 0, 0, 0);
  await ensureEvent({ id: evtId(8), title: "StormGuard Roofing — Lighthouse Point assessment", start: roofAppt, end: new Date(roofAppt.getTime() + 3*60*60*1000), organizerId: USER_IDS.staff2, attendeeIds: [USER_IDS.staff2], location: "92 Lighthouse Rd, Key West", propertyId: p9 });

  // Quarterly portfolio review
  const quarterly = days(14); quarterly.setHours(15, 0, 0, 0);
  await ensureEvent({ id: evtId(9), title: "Quarterly portfolio review", start: quarterly, end: new Date(quarterly.getTime() + 90*60*1000), organizerId: USER_IDS.admin, attendeeIds: [USER_IDS.supervisor, USER_IDS.staff1, USER_IDS.staff2], location: "Office" });

  // Royal Palm pre-event walkthrough
  const walkthrough = days(5); walkthrough.setHours(11, 0, 0, 0);
  await ensureEvent({ id: evtId(10), title: "Pre-event walkthrough — Royal Palm Estate", start: walkthrough, end: new Date(walkthrough.getTime() + 2*60*60*1000), organizerId: USER_IDS.supervisor, attendeeIds: [USER_IDS.supervisor, USER_IDS.staff1], location: "2800 Royal Palm Way, Palm Beach", propertyId: p5 });

  // ── 7. Invoices ─────────────────────────────────────────────────────────────
  // Invoice UUIDs — format: 0000de40-0000-0000-beef-<12 hex digits>
  const invId = (n: number) => `0000de40-0000-0000-beef-${String(n).padStart(12, "0")}`;
  // Beachside Breeze — Sandra Holloway — monthly, paid
  await ensureInvoice({ id: invId(1), invoiceNumber: "DEMO-2026-001", clientId: CLIENT_MAIN_ID, amountCents: 38500, status: "paid", paymentStatus: "succeeded", paymentDate: days(-8), dueDate: days(-15), description: "Monthly home watch + weekly inspections — Beachside Breeze (April)", receiptUrl: "https://pay.stripe.com/receipts/demo-001", paymentMethodBrand: "visa", paymentMethodLast4: "4242" });
  // Beachside Breeze — current month, HVAC addon — open
  await ensureInvoice({ id: invId(2), invoiceNumber: "DEMO-2026-002", clientId: CLIENT_MAIN_ID, amountCents: 52000, status: "open", dueDate: days(12), description: "Monthly service + HVAC emergency call coordination — Beachside Breeze (May)" });
  // Royal Palm VIP — Natasha Whitmore — paid
  await ensureInvoice({ id: invId(3), invoiceNumber: "DEMO-2026-003", clientId: CLIENT_VIP_ID,  amountCents: 185000, status: "paid", paymentStatus: "succeeded", paymentDate: days(-5), dueDate: days(-10), description: "Full estate management + event prep coordination — Royal Palm Estate (April)", receiptUrl: "https://pay.stripe.com/receipts/demo-003", paymentMethodBrand: "amex", paymentMethodLast4: "1234" });
  // Royal Palm — event services — open, upcoming
  await ensureInvoice({ id: invId(4), invoiceNumber: "DEMO-2026-004", clientId: CLIENT_VIP_ID,  amountCents: 246000, status: "open", dueDate: days(10), description: "Estate management + owner event coordination (6 vendors) — Royal Palm Estate (May)" });
  // Marina Bay Condo — Derek Nguyen — rental management
  await ensureInvoice({ id: invId(5), invoiceNumber: "DEMO-2026-005", clientId: CLIENT_RENT_ID, amountCents: 28500, status: "paid", paymentStatus: "succeeded", paymentDate: days(-12), dueDate: days(-18), description: "Rental turnover management + monthly inspection — Marina Bay Condo (April)", receiptUrl: "https://pay.stripe.com/receipts/demo-005", paymentMethodBrand: "visa", paymentMethodLast4: "8888" });
  // Marina Bay — current month — open
  await ensureInvoice({ id: invId(6), invoiceNumber: "DEMO-2026-006", clientId: CLIENT_RENT_ID, amountCents: 31000, status: "open", dueDate: days(8), description: "Turnover coordination + guest prep services — Marina Bay Condo (May)" });
  // Consolidated — Beachside + Royal Palm + Marina Bay
  await ensureInvoice({ id: invId(7), invoiceNumber: "DEMO-2026-CONSOL", clientId: CLIENT_MAIN_ID, amountCents: 98500, status: "draft", description: "Consolidated monthly portfolio invoice — all 3 active billing accounts (May 2026 preview)", metadata: { consolidatedInvoice: true, propertyIds: [p1, p5, p6] } });

  // ── 8. Notifications ─────────────────────────────────────────────────────────
  await ensureNotification({ userId: USER_IDS.staff1, type: "task_overdue", title: "URGENT: Plumber on-site — Pelican Point", body: "FastFlow Plumbing on-site now. Staff1 to meet vendor and document repair progress.", linkUrl: "/tasks" });
  await ensureNotification({ userId: USER_IDS.staff2, type: "task_overdue", title: "URGENT: HVAC zones 3–5 overdue — Gulfstream Manor", body: "Irrigation repair at Gulfstream Manor is 3 days overdue. HOA violation window closing.", linkUrl: "/tasks" });
  await ensureNotification({ userId: USER_IDS.supervisor, type: "inspection_due", title: "Owner arriving early — The Sandpiper (2 days)", body: "Michael Okafor changed arrival to 2 days from now. Rush prep tasks created.", linkUrl: "/tasks" });
  await ensureNotification({ userId: USER_IDS.supervisor, type: "invoice_due", title: "Invoice open — Royal Palm Estate ($2,460)", body: "Invoice DEMO-2026-004 for Natasha Whitmore due in 10 days. May event services.", linkUrl: "/invoices" });
  await ensureNotification({ userId: USER_IDS.admin, type: "general", title: "Storm prep deadline — Coconut Harbor (today)", body: "Hurricane prep must be complete by 6am today. Jordan assigned — rear shutters and generator outstanding.", linkUrl: "/tasks" });

  console.log(`[DEMO SEED] Done — ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

// ─── Reset function ───────────────────────────────────────────────────────────

export async function resetDemoTenant() {
  console.log("[DEMO RESET] Wiping mutable demo data…");

  // Notifications
  await db.delete(notifications).where(eq(notifications.orgId, DEMO_ORG_ID));
  console.log("  [del] notifications");

  // Invoices + payment methods
  const demoClients = await db.select({ id: clients.id }).from(clients).where(eq(clients.orgId, DEMO_ORG_ID));
  const cIds = demoClients.map(c => c.id);
  if (cIds.length > 0) {
    await db.delete(clientPaymentMethods).where(inArray(clientPaymentMethods.clientId, cIds));
    await db.delete(clientInvoices).where(eq(clientInvoices.orgId, DEMO_ORG_ID));
  }

  // Portal users / sessions
  await db.delete(portalUserProperties).where(eq(portalUserProperties.portalUserId, PORTAL_USER_ID));
  await db.delete(portalUsers).where(eq(portalUsers.orgId, DEMO_ORG_ID));
  await db.delete(clients).where(eq(clients.orgId, DEMO_ORG_ID));
  console.log("  [del] clients, invoices, portal users");

  // Events + calendars
  const demoCals = await db.select({ id: calendars.id }).from(calendars).where(eq(calendars.orgId, DEMO_ORG_ID));
  if (demoCals.length > 0) {
    const demoEvts = await db.select({ id: events.id }).from(events).where(eq(events.orgId, DEMO_ORG_ID));
    if (demoEvts.length > 0) {
      await db.delete(eventAttendees).where(inArray(eventAttendees.eventId, demoEvts.map(e => e.id)));
    }
    await db.delete(events).where(eq(events.orgId, DEMO_ORG_ID));
    await db.delete(calendars).where(eq(calendars.orgId, DEMO_ORG_ID));
  }
  console.log("  [del] events, calendars");

  // Tasks + checklists + inspection schedules
  const demoPropRows = await db.select({ id: properties.id }).from(properties).where(eq(properties.orgId, DEMO_ORG_ID));
  const pIds = demoPropRows.map(p => p.id);
  if (pIds.length > 0) {
    const demoTasks = await db.select({ id: tasks.id }).from(tasks).where(inArray(tasks.propertyId, pIds));
    if (demoTasks.length > 0) {
      await db.delete(taskChecklistItems).where(inArray(taskChecklistItems.taskId, demoTasks.map(t => t.id)));
    }
    await db.delete(tasks).where(inArray(tasks.propertyId, pIds));
    await db.delete(inspectionSchedules).where(eq(inspectionSchedules.orgId, DEMO_ORG_ID));
    await db.delete(propertyAccessItems).where(inArray(propertyAccessItems.propertyId, pIds));
    await db.delete(propertyVendors).where(eq(propertyVendors.orgId, DEMO_ORG_ID));
  }
  console.log("  [del] tasks, checklists, inspections, access items");

  // Properties (clear community link first)
  await db.update(properties).set({ communityId: null }).where(eq(properties.orgId, DEMO_ORG_ID));
  await db.delete(properties).where(eq(properties.orgId, DEMO_ORG_ID));
  console.log("  [del] properties");

  // Forms (scoped by slug prefix "demo-")
  const demoForms = await db.select({ id: forms.id }).from(forms).where(like(forms.slug, "demo-%"));
  if (demoForms.length > 0) {
    const fIds = demoForms.map(f => f.id);
    await db.delete(formSubmissions).where(inArray(formSubmissions.formId, fIds));
    await db.delete(formFields).where(inArray(formFields.formId, fIds));
    await db.delete(forms).where(inArray(forms.id, fIds));
  }

  // Contacts (all, including vendors)
  await db.delete(contacts).where(eq(contacts.orgId, DEMO_ORG_ID));
  console.log("  [del] contacts");

  // Staff users (all — re-seeded fresh, including password)
  await db.delete(users).where(eq(users.orgId, DEMO_ORG_ID));
  console.log("  [del] staff users");

  console.log("[DEMO RESET] Wipe complete — reseeding…");
  return await seedDemoTenant();
}
