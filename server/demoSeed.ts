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
  communities,
  communityDocuments,
  clients,
  clientInvoices,
  clientPaymentMethods,
  portalUsers,
  portalUserProperties,
  notifications,
} from "../shared/schema";

// ─── Constants ───────────────────────────────────────────────────────────────

export const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000de0";
export const DEMO_ORG_NAME = "Hubify Demo Portfolio";
export const DEMO_DOMAIN = "demo.hubifyhomesonline.com";
export const DEMO_ADMIN_EMAIL = "demo@hubifyhomesonline.com";
export const DEMO_ADMIN_PASSWORD = "Demo2026!";
export const DEMO_PORTAL_EMAIL = "client@demo.hubifyhomesonline.com";
export const DEMO_PORTAL_PASSWORD = "DemoClient2026!";

const USER_IDS = {
  admin: "demo-admin",
  supervisor: "demo-supervisor",
  staff1: "demo-staff-1",
  staff2: "demo-staff-2",
};

const CALENDAR_ID = "0000de40-0000-0000-0000-000000000001";
const CLIENT_ID = "0000de40-0000-0000-0000-000000000010";
const PORTAL_USER_ID = "0000de40-0000-0000-0000-000000000020";

const NOW = new Date();
const days = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

// ─── Logging helpers ─────────────────────────────────────────────────────────

let created = 0;
let skipped = 0;

function resetCounters() {
  created = 0;
  skipped = 0;
}

const log = (action: "create" | "skip" | "info", msg: string) => {
  if (action === "create") created++;
  else if (action === "skip") skipped++;
  const prefix = action === "create" ? "[+]" : action === "skip" ? "[=]" : "[i]";
  console.log(`  ${prefix} ${msg}`);
};

// ─── Seed helpers ─────────────────────────────────────────────────────────────

async function ensureOrg() {
  const [existing] = await db.select().from(orgs).where(eq(orgs.id, DEMO_ORG_ID)).limit(1);
  if (existing) {
    log("skip", `Org "${DEMO_ORG_NAME}" already exists`);
    return;
  }
  await db.insert(orgs).values({
    id: DEMO_ORG_ID,
    name: DEMO_ORG_NAME,
    domain: DEMO_DOMAIN,
    isActive: true,
    timezone: "America/New_York",
    currency: "USD",
    industry: "Property Management",
    primaryContact: "Demo Admin",
    phone: "555-0200",
    website: `https://${DEMO_DOMAIN}`,
    defaultHourlyRateCents: 8500,
  });
  log("create", `Org "${DEMO_ORG_NAME}" (${DEMO_ORG_ID})`);
}

async function ensureUser(
  id: string,
  email: string,
  firstName: string,
  lastName: string,
  role: "admin" | "supervisor" | "staff",
  passwordPlain?: string,
  supervisorId?: string
) {
  const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (existing) {
    // Ensure password is set (re-hash on every seed so demo credentials stay fresh)
    if (passwordPlain && !existing.passwordHash) {
      const passwordHash = await bcrypt.hash(passwordPlain, 12);
      await db.update(users).set({ passwordHash }).where(eq(users.id, id));
      log("info", `Password set for ${email}`);
    }
    log("skip", `User ${email}`);
    return;
  }
  const passwordHash = passwordPlain ? await bcrypt.hash(passwordPlain, 12) : undefined;
  await db.insert(users).values({
    id,
    orgId: DEMO_ORG_ID,
    email,
    firstName,
    lastName,
    role,
    tier: "premium",
    supervisorId: supervisorId ?? null,
    isActive: true,
    passwordHash: passwordHash ?? null,
  });
  log("create", `User ${email} (${role})`);
}

async function ensureContact(opts: {
  firstName: string;
  lastName: string;
  email: string;
  type: "owner" | "vendor" | "tenant" | "emergency_contact" | "client";
  phone?: string;
  vendorType?: string;
  vendorCategory?: "organization" | "individual";
}): Promise<number> {
  const [existing] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.orgId, DEMO_ORG_ID), eq(contacts.email, opts.email)))
    .limit(1);
  if (existing) {
    log("skip", `Contact ${opts.email}`);
    return existing.id;
  }
  const [row] = await db
    .insert(contacts)
    .values({
      orgId: DEMO_ORG_ID,
      firstName: opts.firstName,
      lastName: opts.lastName,
      email: opts.email,
      phone: opts.phone,
      type: opts.type,
      vendorType: opts.vendorType,
      vendorCategory: opts.vendorCategory,
      isActive: true,
    })
    .returning();
  log("create", `Contact ${opts.email} (${opts.type})`);
  return row.id;
}

async function ensureProperty(opts: {
  name: string;
  type: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  units?: number;
  squareFootage?: number;
  managerId?: string;
  primaryContactId?: number;
  description?: string;
  status?: string;
}): Promise<number> {
  const [existing] = await db
    .select()
    .from(properties)
    .where(and(eq(properties.orgId, DEMO_ORG_ID), eq(properties.name, opts.name)))
    .limit(1);
  if (existing) {
    log("skip", `Property "${opts.name}"`);
    return existing.id;
  }
  const [row] = await db
    .insert(properties)
    .values({
      orgId: DEMO_ORG_ID,
      name: opts.name,
      type: opts.type,
      address1: opts.address1,
      city: opts.city,
      state: opts.state,
      zip: opts.zip,
      units: opts.units ?? 1,
      squareFootage: opts.squareFootage,
      managerId: opts.managerId,
      primaryContactId: opts.primaryContactId,
      description: opts.description,
      status: (opts.status ?? "occupied") as any,
      isActive: true,
    })
    .returning();
  log("create", `Property "${opts.name}"`);
  return row.id;
}

async function ensureAccessItem(opts: {
  propertyId: number;
  category: string;
  description: string;
  value: string;
  notes?: string;
}) {
  const [existing] = await db
    .select()
    .from(propertyAccessItems)
    .where(
      and(
        eq(propertyAccessItems.propertyId, opts.propertyId),
        eq(propertyAccessItems.description, opts.description),
      ),
    )
    .limit(1);
  if (existing) {
    log("skip", `Access "${opts.description}" on property ${opts.propertyId}`);
    return;
  }
  await db.insert(propertyAccessItems).values({
    propertyId: opts.propertyId,
    category: opts.category,
    description: opts.description,
    value: opts.value,
    notes: opts.notes,
    createdById: USER_IDS.admin,
  });
  log("create", `Access "${opts.description}" on property ${opts.propertyId}`);
}

async function ensurePropertyVendor(propertyId: number, vendorId: number, notes?: string) {
  const [existing] = await db
    .select()
    .from(propertyVendors)
    .where(and(eq(propertyVendors.propertyId, propertyId), eq(propertyVendors.vendorId, vendorId)))
    .limit(1);
  if (existing) {
    log("skip", `Vendor link ${vendorId} on property ${propertyId}`);
    return;
  }
  await db.insert(propertyVendors).values({ orgId: DEMO_ORG_ID, propertyId, vendorId, notes });
  log("create", `Vendor link ${vendorId} on property ${propertyId}`);
}

async function ensureTask(opts: {
  title: string;
  propertyId: number;
  status?: "pending" | "in_progress" | "completed" | "cancelled";
  priority?: "urgent" | "high" | "normal" | "low";
  category?: string;
  assignedToId?: string;
  dueDate?: Date;
  completedAt?: Date | null;
  isRecurring?: boolean;
  recurrenceRule?: string;
  inspectionScheduleId?: number;
  description?: string;
  attachments?: Array<{ url: string; filename: string; category?: "before" | "after" | null }>;
}): Promise<number> {
  const [existing] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.title, opts.title), eq(tasks.propertyId, opts.propertyId)))
    .limit(1);
  if (existing) {
    log("skip", `Task "${opts.title}"`);
    return existing.id;
  }
  const [row] = await db
    .insert(tasks)
    .values({
      title: opts.title,
      description: opts.description,
      status: opts.status ?? "pending",
      priority: opts.priority ?? "normal",
      propertyId: opts.propertyId,
      assignedToId: opts.assignedToId,
      assignedById: USER_IDS.admin,
      dueDate: opts.dueDate,
      completedAt: opts.completedAt ?? null,
      category: opts.category,
      isRecurring: opts.isRecurring ?? false,
      recurrenceRule: opts.recurrenceRule,
      attachments: opts.attachments ?? [],
      inspectionScheduleId: opts.inspectionScheduleId,
    })
    .returning();
  log("create", `Task "${opts.title}"`);
  return row.id;
}

async function ensureChecklistItems(
  taskId: number,
  items: Array<{ text: string; result: "pass" | "fail" | "na"; note?: string }>
) {
  const existing = await db
    .select()
    .from(taskChecklistItems)
    .where(eq(taskChecklistItems.taskId, taskId));
  if (existing.length > 0) {
    log("skip", `Checklist for task ${taskId}`);
    return;
  }
  await db.insert(taskChecklistItems).values(
    items.map((item, idx) => ({
      taskId,
      text: item.text,
      completed: true,
      result: item.result,
      resultNote: item.note,
      sortOrder: idx,
      completedAt: NOW,
      completedBy: USER_IDS.staff1,
    }))
  );
  log("create", `${items.length} checklist items for task ${taskId}`);
}

async function ensureInspectionSchedule(opts: {
  propertyId: number;
  frequency: "weekly" | "monthly" | "quarterly" | "annually";
  inspectorUserId?: string;
}): Promise<number> {
  const [existing] = await db
    .select()
    .from(inspectionSchedules)
    .where(
      and(
        eq(inspectionSchedules.orgId, DEMO_ORG_ID),
        eq(inspectionSchedules.propertyId, opts.propertyId),
        eq(inspectionSchedules.frequency, opts.frequency)
      )
    )
    .limit(1);
  if (existing) {
    log("skip", `Inspection schedule (${opts.frequency}) on property ${opts.propertyId}`);
    return existing.id;
  }
  const [row] = await db
    .insert(inspectionSchedules)
    .values({
      orgId: DEMO_ORG_ID,
      propertyId: opts.propertyId,
      frequency: opts.frequency,
      startDate: isoDate(days(-14)),
      nextDueDate: isoDate(days(opts.frequency === "monthly" ? 16 : opts.frequency === "quarterly" ? 76 : 351)),
      inspectorUserId: opts.inspectorUserId,
      isActive: true,
      createdBy: USER_IDS.admin,
    })
    .returning();
  log("create", `Inspection schedule (${opts.frequency}) on property ${opts.propertyId}`);
  return row.id;
}

async function ensureCalendar() {
  const [existing] = await db.select().from(calendars).where(eq(calendars.id, CALENDAR_ID)).limit(1);
  if (existing) {
    log("skip", "Default calendar");
    return;
  }
  await db.insert(calendars).values({
    id: CALENDAR_ID,
    orgId: DEMO_ORG_ID,
    name: "Demo Team",
    color: "#0891b2",
    isDefault: true,
    createdById: USER_IDS.admin,
  });
  log("create", "Default calendar");
}

async function ensureEvent(opts: {
  id: string;
  title: string;
  start: Date;
  end: Date;
  organizerId: string;
  attendeeIds?: string[];
  recurrenceRule?: string;
  location?: string;
  propertyId?: number;
}) {
  const [existing] = await db.select().from(events).where(eq(events.id, opts.id)).limit(1);
  if (existing) {
    log("skip", `Event "${opts.title}"`);
    return;
  }
  await db.insert(events).values({
    id: opts.id,
    orgId: DEMO_ORG_ID,
    calendarId: CALENDAR_ID,
    title: opts.title,
    location: opts.location,
    start: opts.start,
    end: opts.end,
    timezone: "America/New_York",
    organizerId: opts.organizerId,
    createdById: opts.organizerId,
    propertyId: opts.propertyId,
    recurrenceRule: opts.recurrenceRule,
    visibility: "org",
  });
  if (opts.attendeeIds?.length) {
    await db.insert(eventAttendees).values(
      opts.attendeeIds.map((uid) => ({
        eventId: opts.id,
        type: "user",
        userId: uid,
        responseStatus: "accepted",
      }))
    );
  }
  log("create", `Event "${opts.title}"`);
}

async function ensureClient() {
  const [existing] = await db.select().from(clients).where(eq(clients.id, CLIENT_ID)).limit(1);
  if (existing) {
    log("skip", "Client");
    return;
  }
  await db.insert(clients).values({
    id: CLIENT_ID,
    orgId: DEMO_ORG_ID,
    email: DEMO_PORTAL_EMAIL,
    firstName: "Morgan",
    lastName: "Demouser",
    phone: "555-0299",
    isActive: true,
    billingEnabled: true,
    invoiceFrequency: "monthly",
    defaultHourlyRateCents: 8500,
  });
  log("create", `Client ${DEMO_PORTAL_EMAIL}`);
}

async function ensurePortalUser() {
  const [existing] = await db.select().from(portalUsers).where(eq(portalUsers.id, PORTAL_USER_ID)).limit(1);
  if (existing) {
    log("skip", "Portal user");
    return;
  }
  const passwordHash = await bcrypt.hash(DEMO_PORTAL_PASSWORD, 10);
  await db.insert(portalUsers).values({
    id: PORTAL_USER_ID,
    orgId: DEMO_ORG_ID,
    email: DEMO_PORTAL_EMAIL,
    passwordHash,
    firstName: "Morgan",
    lastName: "Demouser",
    role: "staff",
    isActive: true,
    emailVerified: true,
  });
  log("create", `Portal user ${DEMO_PORTAL_EMAIL}`);
}

async function ensurePortalPropertyLink(portalUserId: string, propertyId: number) {
  const [existing] = await db
    .select()
    .from(portalUserProperties)
    .where(
      and(
        eq(portalUserProperties.portalUserId, portalUserId),
        eq(portalUserProperties.propertyId, propertyId)
      )
    )
    .limit(1);
  if (existing) return;
  await db.insert(portalUserProperties).values({
    portalUserId,
    propertyId,
    relationship: "owner",
    isActive: true,
  });
}

async function ensureInvoice(opts: {
  id: string;
  invoiceNumber: string;
  amountCents: number;
  status: "draft" | "open" | "paid" | "void";
  dueDate?: Date;
  paymentStatus?: "succeeded";
  paymentDate?: Date;
  receiptUrl?: string;
  paymentMethodBrand?: string;
  paymentMethodLast4?: string;
  description?: string;
  metadata?: Record<string, any>;
}) {
  const [existing] = await db.select().from(clientInvoices).where(eq(clientInvoices.id, opts.id)).limit(1);
  if (existing) {
    log("skip", `Invoice ${opts.invoiceNumber}`);
    return;
  }
  await db.insert(clientInvoices).values({
    id: opts.id,
    orgId: DEMO_ORG_ID,
    clientId: CLIENT_ID,
    invoiceNumber: opts.invoiceNumber,
    amountCents: opts.amountCents,
    currency: "usd",
    status: opts.status,
    paymentStatus: opts.paymentStatus,
    paymentDate: opts.paymentDate,
    dueDate: opts.dueDate,
    issuedAt: opts.status === "draft" ? null : days(-5),
    sentAt: opts.status === "draft" ? null : days(-5),
    description: opts.description,
    receiptUrl: opts.receiptUrl,
    paymentMethodBrand: opts.paymentMethodBrand,
    paymentMethodLast4: opts.paymentMethodLast4,
    metadata: opts.metadata ?? {},
    createdBy: USER_IDS.admin,
  });
  log("create", `Invoice ${opts.invoiceNumber} (${opts.status})`);
}

async function ensureNotification(opts: {
  userId: string;
  type: "task_assigned" | "task_overdue" | "inspection_due" | "invoice_due" | "mention" | "general";
  title: string;
  body: string;
  linkUrl?: string;
}) {
  const [existing] = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.orgId, DEMO_ORG_ID),
        eq(notifications.userId, opts.userId),
        eq(notifications.title, opts.title)
      )
    )
    .limit(1);
  if (existing) {
    log("skip", `Notification "${opts.title}"`);
    return;
  }
  await db.insert(notifications).values({
    orgId: DEMO_ORG_ID,
    userId: opts.userId,
    type: opts.type,
    title: opts.title,
    body: opts.body,
    linkUrl: opts.linkUrl,
    isRead: false,
  });
  log("create", `Notification "${opts.title}" for ${opts.userId}`);
}

// ─── Main seed function ───────────────────────────────────────────────────────

export async function seedDemoTenant() {
  resetCounters();
  console.log("[DEMO SEED] Starting…");

  // 1. Org
  await ensureOrg();

  // 2. Staff users (admin has password for direct login)
  await ensureUser(USER_IDS.admin, DEMO_ADMIN_EMAIL, "Demo", "Admin", "admin", DEMO_ADMIN_PASSWORD);
  await ensureUser(USER_IDS.supervisor, "supervisor@demo.hubifyhomesonline.com", "Alex", "Rivera", "supervisor", undefined, USER_IDS.admin);
  await ensureUser(USER_IDS.staff1, "staff1@demo.hubifyhomesonline.com", "Jordan", "Lee", "staff", undefined, USER_IDS.supervisor);
  await ensureUser(USER_IDS.staff2, "staff2@demo.hubifyhomesonline.com", "Casey", "Morgan", "staff", undefined, USER_IDS.supervisor);

  // 3. Contacts: 4 owners, 3 vendors, 2 tenants, 1 emergency
  const ownerAId = await ensureContact({ firstName: "Victoria", lastName: "Harmon", email: "v.harmon@demo.test", phone: "555-0301", type: "owner" });
  const ownerBId = await ensureContact({ firstName: "Desmond", lastName: "Whitfield", email: "d.whitfield@demo.test", phone: "555-0302", type: "owner" });
  const ownerCId = await ensureContact({ firstName: "Priya", lastName: "Nair", email: "p.nair@demo.test", phone: "555-0303", type: "owner" });
  const ownerDId = await ensureContact({ firstName: "Marcus", lastName: "Chen", email: "m.chen@demo.test", phone: "555-0304", type: "owner" });
  const vendorPlumbId = await ensureContact({ firstName: "Rapid", lastName: "Plumbing Co.", email: "rapid@plumbing.demo.test", phone: "555-0401", type: "vendor", vendorType: "plumber", vendorCategory: "organization" });
  const vendorHvacId = await ensureContact({ firstName: "Cool", lastName: "Air HVAC", email: "coolairhvac@demo.test", phone: "555-0402", type: "vendor", vendorType: "hvac", vendorCategory: "organization" });
  const vendorElecId = await ensureContact({ firstName: "Bright", lastName: "Electric LLC", email: "brightelectric@demo.test", phone: "555-0403", type: "vendor", vendorType: "electrician", vendorCategory: "organization" });
  await ensureContact({ firstName: "James", lastName: "Whitaker", email: "j.whitaker@demo.test", phone: "555-0501", type: "tenant" });
  await ensureContact({ firstName: "Lena", lastName: "Gutierrez", email: "l.gutierrez@demo.test", phone: "555-0502", type: "tenant" });
  await ensureContact({ firstName: "Emergency", lastName: "Dispatch", email: "dispatch@demo.test", phone: "555-0911", type: "emergency_contact" });

  // 4. Ten properties across different types and scenarios
  const propA = await ensureProperty({ name: "Ocean View Villa", type: "single_family", address1: "101 Ocean Drive", city: "Miami Beach", state: "FL", zip: "33139", squareFootage: 3800, managerId: USER_IDS.supervisor, primaryContactId: ownerAId, description: "Luxury beachfront villa with private pool" });
  const propB = await ensureProperty({ name: "Harbor Pointe Condo", type: "condo", address1: "220 Harbor Blvd, Unit 12B", city: "Fort Lauderdale", state: "FL", zip: "33301", squareFootage: 1400, managerId: USER_IDS.supervisor, primaryContactId: ownerBId });
  const propC = await ensureProperty({ name: "Sunrise Townhome", type: "townhouse", address1: "55 Sunrise Way", city: "Boca Raton", state: "FL", zip: "33431", squareFootage: 2100, managerId: USER_IDS.staff1, primaryContactId: ownerCId });
  const propD = await ensureProperty({ name: "The Palms at Lakewood", type: "multi_unit", address1: "800 Lakewood Ave", city: "West Palm Beach", state: "FL", zip: "33401", squareFootage: 8500, units: 4, managerId: USER_IDS.supervisor, primaryContactId: ownerDId, description: "4-unit multi-family building" });
  const propE = await ensureProperty({ name: "Brickell Office Suite", type: "commercial", address1: "1000 Brickell Ave, Suite 300", city: "Miami", state: "FL", zip: "33131", squareFootage: 2600, managerId: USER_IDS.admin });
  const propF = await ensureProperty({ name: "Westwood Estate", type: "single_family", address1: "14 Westwood Circle", city: "Naples", state: "FL", zip: "34102", squareFootage: 5200, managerId: USER_IDS.staff1, primaryContactId: ownerAId, description: "Gated estate with guest house" });
  const propG = await ensureProperty({ name: "Coral Springs Cottage", type: "single_family", address1: "72 Coral Way", city: "Coral Springs", state: "FL", zip: "33071", squareFootage: 1600, managerId: USER_IDS.staff2, primaryContactId: ownerBId });
  const propH = await ensureProperty({ name: "Marina Bay Penthouse", type: "condo", address1: "500 Marina Blvd, PH-7", city: "Miami", state: "FL", zip: "33132", squareFootage: 3200, managerId: USER_IDS.supervisor, primaryContactId: ownerCId, description: "Top-floor penthouse with panoramic bay views" });
  const propI = await ensureProperty({ name: "Riverside Ranch", type: "single_family", address1: "22 Riverside Lane", city: "Jupiter", state: "FL", zip: "33458", squareFootage: 2900, managerId: USER_IDS.staff2, primaryContactId: ownerDId });
  const propJ = await ensureProperty({ name: "Garden Terrace HOA Unit", type: "single_family", address1: "910 Garden Terrace Dr", city: "Deerfield Beach", state: "FL", zip: "33442", squareFootage: 1900, managerId: USER_IDS.staff1, primaryContactId: ownerCId, status: "vacant" });

  // 5. Access codes
  const accessSpecs = [
    { propertyId: propA, category: "door", description: "Front door keypad", value: "4821#", notes: "Main entrance" },
    { propertyId: propA, category: "pool", description: "Pool gate code", value: "1177*", notes: "Pool area gate" },
    { propertyId: propB, category: "door", description: "Unit 12B entry fob", value: "FOB-B12", notes: "Building front and unit" },
    { propertyId: propC, category: "alarm", description: "Security alarm", value: "9934", notes: "Arm with *9934, disarm with 9934" },
    { propertyId: propD, category: "gate", description: "Complex gate code", value: "8800", notes: "Common gate, all 4 units" },
    { propertyId: propF, category: "door", description: "Front gate keypad", value: "1359*", notes: "Gated entry" },
    { propertyId: propF, category: "wifi", description: "Guest house WiFi", value: "WestEstate2026!", notes: "Guest network" },
    { propertyId: propH, category: "door", description: "Penthouse elevator code", value: "PH07#", notes: "Elevator direct to penthouse" },
  ];
  for (const spec of accessSpecs) await ensureAccessItem(spec);

  // 6. Vendor links
  await ensurePropertyVendor(propA, vendorHvacId, "Annual AC contract");
  await ensurePropertyVendor(propA, vendorPlumbId);
  await ensurePropertyVendor(propB, vendorHvacId);
  await ensurePropertyVendor(propC, vendorPlumbId, "On-call plumber");
  await ensurePropertyVendor(propD, vendorElecId, "Building electrician");
  await ensurePropertyVendor(propF, vendorHvacId);
  await ensurePropertyVendor(propF, vendorElecId);

  // 7. Inspection schedules (3)
  const monthlyScheduleA = await ensureInspectionSchedule({ propertyId: propA, frequency: "monthly", inspectorUserId: USER_IDS.staff1 });
  await ensureInspectionSchedule({ propertyId: propD, frequency: "quarterly", inspectorUserId: USER_IDS.staff2 });
  await ensureInspectionSchedule({ propertyId: propF, frequency: "quarterly", inspectorUserId: USER_IDS.staff1 });

  // 8. Tasks — 20+ across all statuses
  const photoSet = [
    { url: "https://example.com/demo/before.jpg", filename: "before.jpg", category: "before" as const },
    { url: "https://example.com/demo/after.jpg", filename: "after.jpg", category: "after" as const },
  ];

  const inspTask1 = await ensureTask({
    title: "Monthly Inspection — Ocean View Villa",
    propertyId: propA,
    status: "completed",
    priority: "high",
    category: "inspection",
    assignedToId: USER_IDS.staff1,
    dueDate: days(-7),
    completedAt: days(-2),
    inspectionScheduleId: monthlyScheduleA,
    attachments: photoSet,
  });
  await ensureChecklistItems(inspTask1, [
    { text: "Exterior — roof and gutters", result: "pass" },
    { text: "Pool equipment running", result: "pass" },
    { text: "HVAC filters checked", result: "fail", note: "Filters overdue — replaced on site" },
    { text: "Irrigation system operational", result: "pass" },
    { text: "Security cameras online", result: "pass" },
  ]);

  const inspTask2 = await ensureTask({
    title: "Quarterly Inspection — The Palms at Lakewood",
    propertyId: propD,
    status: "completed",
    priority: "normal",
    category: "inspection",
    assignedToId: USER_IDS.staff2,
    dueDate: days(-21),
    completedAt: days(-17),
    attachments: photoSet,
  });
  await ensureChecklistItems(inspTask2, [
    { text: "Common area lighting", result: "pass" },
    { text: "Parking lot condition", result: "fail", note: "Pothole near unit 3 — vendor scheduled" },
    { text: "Exterior paint condition", result: "pass" },
    { text: "Mail kiosk secure", result: "pass" },
  ]);

  const inspTask3 = await ensureTask({
    title: "Move-in Inspection — Harbor Pointe Condo",
    propertyId: propB,
    status: "completed",
    priority: "high",
    category: "inspection",
    assignedToId: USER_IDS.staff1,
    dueDate: days(-10),
    completedAt: days(-8),
  });
  await ensureChecklistItems(inspTask3, [
    { text: "Appliances functional", result: "pass" },
    { text: "No water damage present", result: "pass" },
    { text: "Smoke detectors tested", result: "pass" },
    { text: "HVAC filter clean", result: "na", note: "New filter installed by previous tenant" },
  ]);

  // Recurring tasks
  await ensureTask({ title: "Weekly Pool Maintenance — Ocean View Villa", propertyId: propA, status: "in_progress", priority: "normal", category: "maintenance", assignedToId: USER_IDS.staff1, dueDate: days(1), isRecurring: true, recurrenceRule: "FREQ=WEEKLY;BYDAY=TH" });
  await ensureTask({ title: "Bi-weekly Lawn Care — Westwood Estate", propertyId: propF, status: "pending", priority: "low", category: "maintenance", assignedToId: USER_IDS.staff2, dueDate: days(4), isRecurring: true, recurrenceRule: "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO" });

  // Mixed tasks
  const mixedTasks: Array<Parameters<typeof ensureTask>[0]> = [
    { title: "Replace HVAC filters", propertyId: propC, status: "pending", priority: "normal", category: "maintenance", assignedToId: USER_IDS.staff2, dueDate: days(5) },
    { title: "Fix leaking faucet — Kitchen", propertyId: propB, status: "in_progress", priority: "high", category: "repair", assignedToId: USER_IDS.staff1, dueDate: days(2) },
    { title: "Power-wash driveway", propertyId: propF, status: "pending", priority: "low", category: "cleaning", assignedToId: USER_IDS.staff2, dueDate: days(9) },
    { title: "Annual pest control treatment", propertyId: propG, status: "completed", priority: "normal", category: "maintenance", assignedToId: USER_IDS.staff2, dueDate: days(-15), completedAt: days(-13) },
    { title: "Replace smoke detectors", propertyId: propH, status: "completed", priority: "high", category: "maintenance", assignedToId: USER_IDS.staff1, dueDate: days(-5), completedAt: days(-3), attachments: photoSet },
    { title: "Repaint guest bedroom", propertyId: propI, status: "pending", priority: "low", category: "repair", assignedToId: USER_IDS.staff2, dueDate: days(14) },
    { title: "Inspect roof after storm", propertyId: propA, status: "in_progress", priority: "urgent", category: "inspection", assignedToId: USER_IDS.supervisor, dueDate: days(0), attachments: photoSet },
    { title: "OVERDUE: Fix garage door motor", propertyId: propC, status: "pending", priority: "high", category: "repair", assignedToId: USER_IDS.staff1, dueDate: days(-5) },
    { title: "OVERDUE: Broken window latch — Unit 2", propertyId: propD, status: "pending", priority: "urgent", category: "repair", assignedToId: USER_IDS.staff2, dueDate: days(-3) },
    { title: "Deep clean before owner arrival", propertyId: propH, status: "pending", priority: "high", category: "cleaning", assignedToId: USER_IDS.staff1, dueDate: days(3), description: "Owner arriving Friday — full turnover clean" },
    { title: "Replace kitchen garbage disposal", propertyId: propJ, status: "cancelled", priority: "normal", category: "repair", assignedToId: USER_IDS.staff1, dueDate: days(-1) },
    { title: "Exterior caulking and sealing", propertyId: propF, status: "pending", priority: "normal", category: "maintenance", assignedToId: USER_IDS.staff2, dueDate: days(20) },
    { title: "Annual fire extinguisher inspection", propertyId: propE, status: "pending", priority: "normal", category: "maintenance", assignedToId: USER_IDS.admin, dueDate: days(25) },
    { title: "Rekey front door — new tenant", propertyId: propJ, status: "in_progress", priority: "high", category: "repair", assignedToId: USER_IDS.staff1, dueDate: days(1) },
    { title: "Roof membrane quote — Brickell", propertyId: propE, status: "in_progress", priority: "high", category: "administrative", assignedToId: USER_IDS.supervisor, dueDate: days(6) },
  ];
  for (const t of mixedTasks) await ensureTask(t);

  // 9. Calendar + events
  await ensureCalendar();
  const eb = "0000de40-0000-0000-0000-0000000ee";

  const e1s = days(2); e1s.setHours(10, 0, 0, 0);
  await ensureEvent({ id: `${eb}001`, title: "Ocean View Villa walkthrough", start: e1s, end: new Date(e1s.getTime() + 60 * 60 * 1000), organizerId: USER_IDS.supervisor, attendeeIds: [USER_IDS.staff1], location: "101 Ocean Drive, Miami Beach", propertyId: propA });

  const e2s = days(2); e2s.setHours(10, 30, 0, 0);
  await ensureEvent({ id: `${eb}002`, title: "Harbor Pointe vendor meeting (CONFLICT)", start: e2s, end: new Date(e2s.getTime() + 60 * 60 * 1000), organizerId: USER_IDS.admin, attendeeIds: [USER_IDS.staff1, USER_IDS.staff2], location: "220 Harbor Blvd", propertyId: propB });

  const e3s = days(1); e3s.setHours(9, 0, 0, 0);
  await ensureEvent({ id: `${eb}003`, title: "Weekly team standup", start: e3s, end: new Date(e3s.getTime() + 30 * 60 * 1000), organizerId: USER_IDS.admin, attendeeIds: [USER_IDS.supervisor, USER_IDS.staff1, USER_IDS.staff2], recurrenceRule: "FREQ=WEEKLY;BYDAY=MO", location: "Office" });

  const e4s = days(8); e4s.setHours(14, 0, 0, 0);
  await ensureEvent({ id: `${eb}004`, title: "Owner review — Westwood Estate", start: e4s, end: new Date(e4s.getTime() + 90 * 60 * 1000), organizerId: USER_IDS.admin, attendeeIds: [USER_IDS.supervisor], propertyId: propF });

  const e5s = days(15); e5s.setHours(15, 0, 0, 0);
  await ensureEvent({ id: `${eb}005`, title: "Quarterly portfolio review", start: e5s, end: new Date(e5s.getTime() + 60 * 60 * 1000), organizerId: USER_IDS.admin, attendeeIds: [USER_IDS.supervisor, USER_IDS.staff1, USER_IDS.staff2] });

  // 10. Client + portal user + property links
  await ensureClient();
  await ensurePortalUser();
  await ensurePortalPropertyLink(PORTAL_USER_ID, propA);
  await ensurePortalPropertyLink(PORTAL_USER_ID, propH);

  // 11. Invoices
  const invBase = "0000de40-0000-0000-inv";
  await ensureInvoice({ id: `${invBase}-0001`, invoiceNumber: "DEMO-DRAFT-0001", amountCents: 32000, status: "draft", description: "Monthly service — Ocean View Villa (draft)" });
  await ensureInvoice({ id: `${invBase}-0002`, invoiceNumber: "DEMO-SENT-0002", amountCents: 56500, status: "open", dueDate: days(12), description: "Monthly service — Harbor Pointe + Sunrise Townhome" });
  await ensureInvoice({ id: `${invBase}-0003`, invoiceNumber: "DEMO-PAID-0003", amountCents: 42000, status: "paid", paymentStatus: "succeeded", paymentDate: days(-3), dueDate: days(-8), description: "Monthly service — Westwood Estate", receiptUrl: "https://pay.stripe.com/receipts/payment/demo-receipt-0003", paymentMethodBrand: "visa", paymentMethodLast4: "4242" });
  await ensureInvoice({ id: `${invBase}-0004`, invoiceNumber: "DEMO-OVERDUE-0004", amountCents: 21500, status: "open", dueDate: days(-10), description: "Repair services — Coral Springs Cottage (overdue)" });
  await ensureInvoice({ id: `${invBase}-0005`, invoiceNumber: "DEMO-CONSOL-0005", amountCents: 112000, status: "open", dueDate: days(18), description: "Consolidated — Ocean View Villa + Marina Bay Penthouse", metadata: { consolidatedInvoice: true, propertyIds: [propA, propH] } });

  // 12. Notifications
  await ensureNotification({ userId: USER_IDS.staff1, type: "task_overdue", title: "Task overdue: Fix garage door motor", body: "OVERDUE: Fix garage door motor at Sunrise Townhome is 5 days past due.", linkUrl: "/tasks" });
  await ensureNotification({ userId: USER_IDS.staff2, type: "task_overdue", title: "Task overdue: Broken window latch", body: "OVERDUE: Broken window latch at The Palms at Lakewood is 3 days past due.", linkUrl: "/tasks" });
  await ensureNotification({ userId: USER_IDS.supervisor, type: "invoice_due", title: "Invoice past due", body: "Invoice DEMO-OVERDUE-0004 is 10 days overdue.", linkUrl: "/invoices" });
  await ensureNotification({ userId: USER_IDS.admin, type: "inspection_due", title: "Monthly inspection due", body: "Monthly inspection for Ocean View Villa is coming up next week.", linkUrl: "/inspections" });
  await ensureNotification({ userId: USER_IDS.staff1, type: "task_assigned", title: "New task assigned", body: "Deep clean before owner arrival — Marina Bay Penthouse, due in 3 days.", linkUrl: "/tasks" });

  console.log(`[DEMO SEED] Done — ${created} created, ${skipped} skipped`);
  return { created, skipped };
}

// ─── Reset function ───────────────────────────────────────────────────────────

export async function resetDemoTenant() {
  console.log("[DEMO RESET] Wiping mutable demo data…");

  // Delete in reverse-dependency order, all scoped to DEMO_ORG_ID

  // Notifications
  await db.delete(notifications).where(eq(notifications.orgId, DEMO_ORG_ID));
  console.log("  [del] notifications");

  // Invoices + payment methods
  const demoClientIds = await db.select({ id: clients.id }).from(clients).where(eq(clients.orgId, DEMO_ORG_ID));
  const clientIdList = demoClientIds.map(c => c.id);
  if (clientIdList.length > 0) {
    await db.delete(clientPaymentMethods).where(inArray(clientPaymentMethods.clientId, clientIdList));
    await db.delete(clientInvoices).where(eq(clientInvoices.orgId, DEMO_ORG_ID));
  }

  // Portal users / sessions
  await db.delete(portalUserProperties).where(eq(portalUserProperties.portalUserId, PORTAL_USER_ID));
  await db.delete(portalUsers).where(eq(portalUsers.orgId, DEMO_ORG_ID));
  await db.delete(clients).where(eq(clients.orgId, DEMO_ORG_ID));
  console.log("  [del] clients, invoices, portal users");

  // Events + calendars
  const demoCals = await db.select({ id: calendars.id }).from(calendars).where(eq(calendars.orgId, DEMO_ORG_ID));
  const calIds = demoCals.map(c => c.id);
  if (calIds.length > 0) {
    const demoEvents = await db.select({ id: events.id }).from(events).where(eq(events.orgId, DEMO_ORG_ID));
    const eventIds = demoEvents.map(e => e.id);
    if (eventIds.length > 0) {
      await db.delete(eventAttendees).where(inArray(eventAttendees.eventId, eventIds));
    }
    await db.delete(events).where(eq(events.orgId, DEMO_ORG_ID));
    await db.delete(calendars).where(eq(calendars.orgId, DEMO_ORG_ID));
  }
  console.log("  [del] events, calendars");

  // Task checklist items + inspection schedules + tasks
  const demoPropIds = await db.select({ id: properties.id }).from(properties).where(eq(properties.orgId, DEMO_ORG_ID));
  const propIds = demoPropIds.map(p => p.id);
  if (propIds.length > 0) {
    const demoTasks = await db.select({ id: tasks.id }).from(tasks).where(inArray(tasks.propertyId, propIds));
    const taskIds = demoTasks.map(t => t.id);
    if (taskIds.length > 0) {
      await db.delete(taskChecklistItems).where(inArray(taskChecklistItems.taskId, taskIds));
    }
    await db.delete(tasks).where(inArray(tasks.propertyId, propIds));
    await db.delete(inspectionSchedules).where(eq(inspectionSchedules.orgId, DEMO_ORG_ID));
    console.log("  [del] tasks, checklists, inspection schedules");

    // Property access items + vendor links
    await db.delete(propertyAccessItems).where(inArray(propertyAccessItems.propertyId, propIds));
    await db.delete(propertyVendors).where(eq(propertyVendors.orgId, DEMO_ORG_ID));
  }

  // Clear community links from properties, delete communities
  await db.update(properties).set({ communityId: null }).where(eq(properties.orgId, DEMO_ORG_ID));
  await db.delete(properties).where(eq(properties.orgId, DEMO_ORG_ID));
  console.log("  [del] properties");

  // Form submissions / fields / forms (scoped by slug prefix)
  const demoForms = await db.select({ id: forms.id }).from(forms).where(like(forms.slug, "demo-%"));
  const formIds = demoForms.map(f => f.id);
  if (formIds.length > 0) {
    await db.delete(formSubmissions).where(inArray(formSubmissions.formId, formIds));
    await db.delete(formFields).where(inArray(formFields.formId, formIds));
    await db.delete(forms).where(inArray(forms.id, formIds));
  }

  // Contacts
  await db.delete(contacts).where(eq(contacts.orgId, DEMO_ORG_ID));
  console.log("  [del] contacts");

  // Staff users (all except demo-admin)
  await db.delete(users).where(
    and(
      eq(users.orgId, DEMO_ORG_ID),
      // Keep the admin login
    )
  );
  // Re-insert admin (or it was also deleted — we re-seed it fresh)
  console.log("  [del] staff users");

  console.log("[DEMO RESET] Wipe complete — reseeding…");
  return await seedDemoTenant();
}
