/**
 * Hubify Beta Demo Org Seeder
 *
 * Idempotent: safe to run multiple times — keys on stable UUIDs / natural keys
 * and skips or upserts existing rows.
 *
 * Usage:
 *   tsx scripts/seed-beta-org.ts          # local / staging
 *   tsx scripts/seed-beta-org.ts --force  # required when NODE_ENV=production
 *
 * Test credentials, the demo org id, and the portal URL are also documented
 * under the "Beta Demo Org" section of replit.md.
 *
 * --- Demo accounts ---
 * Org id:        00000000-0000-0000-0000-0000000000be
 * Org name:      Hubify Beta Demo
 *
 * Internal users (Replit-Auth ids — log in as super admin and impersonate, or
 * use the dev-login flow if enabled):
 *   beta-admin       admin@beta.hubify.test       role=admin
 *   beta-supervisor  supervisor@beta.hubify.test  role=supervisor
 *   beta-staff-1     staff1@beta.hubify.test      role=staff
 *   beta-staff-2     staff2@beta.hubify.test      role=staff
 *
 * Portal client (logs in at /portal/login):
 *   email:     client@beta.hubify.test
 *   password:  HubifyBeta!2025
 */

import { and, eq, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, pool } from "../server/db";
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

// ---------- Constants ----------

const ORG_ID = "00000000-0000-0000-0000-0000000000be";
const ORG_NAME = "Hubify Beta Demo";

const USER_IDS = {
  admin: "beta-admin",
  supervisor: "beta-supervisor",
  staff1: "beta-staff-1",
  staff2: "beta-staff-2",
};

const CALENDAR_ID = "000000be-0000-0000-0000-000000000001";
const CLIENT_ID = "000000be-0000-0000-0000-000000000010";
const PORTAL_USER_ID = "000000be-0000-0000-0000-000000000020";
const PORTAL_PASSWORD = "HubifyBeta!2025";

const INVOICE_IDS = {
  draft: "000000be-0000-0000-0000-0000000000d1",
  sent: "000000be-0000-0000-0000-0000000000d2",
  paid: "000000be-0000-0000-0000-0000000000d3",
  overdue: "000000be-0000-0000-0000-0000000000d4",
  consolidated: "000000be-0000-0000-0000-0000000000d5",
};
const PAYMENT_METHOD_ID = "000000be-0000-0000-0000-0000000000e1";

const NOW = new Date();
const days = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

let created = 0;
let skipped = 0;
const log = (action: "create" | "skip" | "info", msg: string) => {
  if (action === "create") created++;
  else if (action === "skip") skipped++;
  const prefix = action === "create" ? "[+]" : action === "skip" ? "[=]" : "[i]";
  console.log(`${prefix} ${msg}`);
};

// ---------- Production guard ----------

function guardProduction() {
  const isProd = process.env.NODE_ENV === "production";
  const force = process.argv.includes("--force");
  if (isProd && !force) {
    console.error(
      "REFUSING to run beta seed in production. Re-run with --force if you really mean it."
    );
    process.exit(1);
  }
  if (isProd && force) {
    console.warn("⚠️  --force given: running beta seed against PRODUCTION DB.");
  }
}

// ---------- Helpers ----------

async function ensureOrg() {
  const [existing] = await db.select().from(orgs).where(eq(orgs.id, ORG_ID)).limit(1);
  if (existing) {
    log("skip", `Org "${ORG_NAME}" already exists`);
    return;
  }
  await db.insert(orgs).values({
    id: ORG_ID,
    name: ORG_NAME,
    isActive: true,
    timezone: "America/New_York",
    currency: "USD",
    industry: "Property Management",
    primaryContact: "Beta Admin",
    defaultHourlyRateCents: 7500,
  });
  log("create", `Org "${ORG_NAME}" (${ORG_ID})`);
}

async function ensureUser(
  id: string,
  email: string,
  firstName: string,
  lastName: string,
  role: "admin" | "supervisor" | "staff",
  supervisorId?: string
) {
  const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (existing) {
    log("skip", `User ${email}`);
    return;
  }
  await db.insert(users).values({
    id,
    orgId: ORG_ID,
    email,
    firstName,
    lastName,
    role,
    tier: "premium",
    supervisorId: supervisorId ?? null,
    isActive: true,
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
    .where(and(eq(contacts.orgId, ORG_ID), eq(contacts.email, opts.email)))
    .limit(1);
  if (existing) {
    log("skip", `Contact ${opts.email}`);
    return existing.id;
  }
  const [row] = await db
    .insert(contacts)
    .values({
      orgId: ORG_ID,
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
}): Promise<number> {
  const [existing] = await db
    .select()
    .from(properties)
    .where(and(eq(properties.orgId, ORG_ID), eq(properties.name, opts.name)))
    .limit(1);
  if (existing) {
    log("skip", `Property "${opts.name}"`);
    return existing.id;
  }
  const [row] = await db
    .insert(properties)
    .values({
      orgId: ORG_ID,
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
      status: "occupied",
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
        eq(propertyAccessItems.category, opts.category),
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

async function ensurePropertyVendor(opts: {
  propertyId: number;
  vendorId: number;
  notes?: string;
}) {
  const [existing] = await db
    .select()
    .from(propertyVendors)
    .where(
      and(
        eq(propertyVendors.propertyId, opts.propertyId),
        eq(propertyVendors.vendorId, opts.vendorId),
      ),
    )
    .limit(1);
  if (existing) {
    log("skip", `Vendor link ${opts.vendorId} on property ${opts.propertyId}`);
    return;
  }
  await db.insert(propertyVendors).values({
    orgId: ORG_ID,
    propertyId: opts.propertyId,
    vendorId: opts.vendorId,
    notes: opts.notes,
  });
  log("create", `Vendor link ${opts.vendorId} on property ${opts.propertyId}`);
}

async function ensureTask(opts: {
  title: string;
  propertyId: number;
  status?: "pending" | "in_progress" | "completed" | "cancelled";
  priority?: "urgent" | "high" | "normal" | "low";
  category?: string;
  assignedToId?: string;
  assignedById?: string;
  dueDate?: Date;
  completedAt?: Date | null;
  isRecurring?: boolean;
  recurrenceRule?: string;
  attachments?: Array<{ url: string; filename: string; category?: "before" | "after" | null }>;
  inspectionScheduleId?: number;
  description?: string;
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
      assignedById: opts.assignedById ?? USER_IDS.admin,
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
    log("skip", `Checklist items for task ${taskId}`);
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
        eq(inspectionSchedules.orgId, ORG_ID),
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
      orgId: ORG_ID,
      propertyId: opts.propertyId,
      frequency: opts.frequency,
      startDate: isoDate(days(-7)),
      nextDueDate: isoDate(days(opts.frequency === "monthly" ? 30 : 90)),
      inspectorUserId: opts.inspectorUserId,
      isActive: true,
      createdBy: USER_IDS.admin,
    })
    .returning();
  log("create", `Inspection schedule (${opts.frequency}) on property ${opts.propertyId}`);
  return row.id;
}

async function ensureCalendar() {
  const [existing] = await db
    .select()
    .from(calendars)
    .where(eq(calendars.id, CALENDAR_ID))
    .limit(1);
  if (existing) {
    log("skip", "Default calendar");
    return;
  }
  await db.insert(calendars).values({
    id: CALENDAR_ID,
    orgId: ORG_ID,
    name: "Beta Team",
    color: "#4f46e5",
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
  description?: string;
  propertyId?: number;
}) {
  const [existing] = await db.select().from(events).where(eq(events.id, opts.id)).limit(1);
  if (existing) {
    log("skip", `Event "${opts.title}"`);
    return;
  }
  await db.insert(events).values({
    id: opts.id,
    orgId: ORG_ID,
    calendarId: CALENDAR_ID,
    title: opts.title,
    description: opts.description,
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

async function ensureForm(opts: {
  formTitle: string;
  slug: string;
  contexts: string[];
  fields: Array<{ label: string; type: string; required?: boolean; context: string }>;
  submissionsCount: number;
  propertyId?: number;
  contactId?: number;
}): Promise<number> {
  const [existing] = await db
    .select()
    .from(forms)
    .where(eq(forms.slug, opts.slug))
    .limit(1);
  let formId: number;
  if (existing) {
    log("skip", `Form "${opts.formTitle}"`);
    formId = existing.id;
  } else {
    const [row] = await db
      .insert(forms)
      .values({
        formTitle: opts.formTitle,
        slug: opts.slug,
        contexts: opts.contexts,
        description: "Beta demo form",
        isActive: true,
      })
      .returning();
    formId = row.id;
    await db.insert(formFields).values(
      opts.fields.map((f, idx) => ({
        formId,
        label: f.label,
        type: f.type,
        required: f.required ?? false,
        context: f.context,
        sortOrder: idx,
      }))
    );
    log("create", `Form "${opts.formTitle}" with ${opts.fields.length} fields`);
  }

  const subs = await db
    .select()
    .from(formSubmissions)
    .where(eq(formSubmissions.formId, formId));
  if (subs.length === 0) {
    for (let i = 0; i < opts.submissionsCount; i++) {
      await db.insert(formSubmissions).values({
        formId,
        propertyId: opts.propertyId,
        profileId: opts.contactId,
        data: {
          submittedAt: new Date().toISOString(),
          note: `Beta demo submission #${i + 1}`,
          ...Object.fromEntries(opts.fields.map((f) => [f.label, `Sample ${f.label}`])),
        },
      });
    }
    log("create", `${opts.submissionsCount} submission(s) for "${opts.formTitle}"`);
  } else {
    log("skip", `Submissions for "${opts.formTitle}" (${subs.length} present)`);
  }
  return formId;
}

async function ensureCommunity(): Promise<number> {
  const [existing] = await db
    .select()
    .from(communities)
    .where(eq(communities.name, "Beta Demo Community"))
    .limit(1);
  if (existing) {
    log("skip", "Community");
    return existing.id;
  }
  const [row] = await db
    .insert(communities)
    .values({
      name: "Beta Demo Community",
      city: "Sarasota",
      state: "FL",
      zip: "34236",
      managerId: USER_IDS.admin,
      isActive: true,
    })
    .returning();
  log("create", "Community");
  return row.id;
}

async function ensureCommunityDocs(communityId: number) {
  const existing = await db
    .select()
    .from(communityDocuments)
    .where(eq(communityDocuments.communityId, communityId));
  if (existing.length > 0) {
    log("skip", `Community documents (${existing.length} present)`);
    return;
  }
  await db.insert(communityDocuments).values([
    {
      communityId,
      documentType: "welcome_packet",
      classification: "community-wide",
      fileUrl: "https://example.com/beta/welcome.pdf",
      fileName: "Beta-Welcome-Packet.pdf",
      uploadedBy: USER_IDS.admin,
    },
    {
      communityId,
      documentType: "ccrs_bylaws",
      classification: "community-wide",
      fileUrl: "https://example.com/beta/ccrs.pdf",
      fileName: "Beta-CCRs-2025.pdf",
      uploadedBy: USER_IDS.admin,
    },
  ]);
  log("create", "2 community documents");
}

async function ensureClient() {
  const [existing] = await db.select().from(clients).where(eq(clients.id, CLIENT_ID)).limit(1);
  if (existing) {
    log("skip", "Client");
    return;
  }
  await db.insert(clients).values({
    id: CLIENT_ID,
    orgId: ORG_ID,
    email: "client@beta.hubify.test",
    firstName: "Casey",
    lastName: "Client",
    phone: "555-0100",
    isActive: true,
    billingEnabled: true,
    invoiceFrequency: "monthly",
    defaultHourlyRateCents: 7500,
  });
  log("create", "Client casey@beta.hubify.test");
}

async function ensurePortalUser() {
  const [existing] = await db
    .select()
    .from(portalUsers)
    .where(eq(portalUsers.id, PORTAL_USER_ID))
    .limit(1);
  if (existing) {
    log("skip", "Portal user");
    return;
  }
  const passwordHash = await bcrypt.hash(PORTAL_PASSWORD, 10);
  await db.insert(portalUsers).values({
    id: PORTAL_USER_ID,
    orgId: ORG_ID,
    email: "client@beta.hubify.test",
    passwordHash,
    firstName: "Casey",
    lastName: "Client",
    role: "staff",
    isActive: true,
    emailVerified: true,
  });
  log("create", `Portal user client@beta.hubify.test (password: ${PORTAL_PASSWORD})`);
}

async function ensurePortalPropertyLink(portalUserId: string, propertyId: number) {
  const existing = await db
    .select()
    .from(portalUserProperties)
    .where(
      and(
        eq(portalUserProperties.portalUserId, portalUserId),
        eq(portalUserProperties.propertyId, propertyId)
      )
    );
  if (existing.length > 0) return;
  await db.insert(portalUserProperties).values({
    portalUserId,
    propertyId,
    relationship: "owner",
    isActive: true,
  });
}

async function ensureInvoice(opts: {
  id: string;
  amountCents: number;
  status: "draft" | "open" | "paid" | "void" | "uncollectible";
  dueDate?: Date;
  paymentStatus?: "succeeded";
  paymentDate?: Date;
  receiptUrl?: string;
  paymentMethodBrand?: string;
  paymentMethodLast4?: string;
  description?: string;
  metadata?: Record<string, any>;
  invoiceNumber: string;
}) {
  const [existing] = await db
    .select()
    .from(clientInvoices)
    .where(eq(clientInvoices.id, opts.id))
    .limit(1);
  if (existing) {
    // Back-fill receipt fields if they are missing (e.g. on re-runs after migration)
    if (opts.receiptUrl && !existing.receiptUrl) {
      await db
        .update(clientInvoices)
        .set({
          receiptUrl: opts.receiptUrl,
          paymentMethodBrand: opts.paymentMethodBrand ?? null,
          paymentMethodLast4: opts.paymentMethodLast4 ?? null,
        })
        .where(eq(clientInvoices.id, opts.id));
      log("update", `Invoice ${opts.invoiceNumber} — backfilled receipt fields`);
    } else {
      log("skip", `Invoice ${opts.invoiceNumber}`);
    }
    return;
  }
  await db.insert(clientInvoices).values({
    id: opts.id,
    orgId: ORG_ID,
    clientId: CLIENT_ID,
    invoiceNumber: opts.invoiceNumber,
    amountCents: opts.amountCents,
    currency: "usd",
    status: opts.status,
    paymentStatus: opts.paymentStatus,
    paymentDate: opts.paymentDate,
    dueDate: opts.dueDate,
    issuedAt: opts.status === "draft" ? null : days(-3),
    sentAt: opts.status === "draft" ? null : days(-3),
    description: opts.description,
    receiptUrl: opts.receiptUrl,
    paymentMethodBrand: opts.paymentMethodBrand,
    paymentMethodLast4: opts.paymentMethodLast4,
    metadata: opts.metadata ?? {},
    createdBy: USER_IDS.admin,
  });
  log("create", `Invoice ${opts.invoiceNumber} (${opts.status})`);
}

async function ensurePaymentMethod() {
  if (!process.env.STRIPE_SECRET_KEY) {
    log("info", "STRIPE_SECRET_KEY not set — skipping client payment method seed");
    return;
  }
  const [existing] = await db
    .select()
    .from(clientPaymentMethods)
    .where(eq(clientPaymentMethods.id, PAYMENT_METHOD_ID))
    .limit(1);
  if (existing) {
    log("skip", "Client payment method");
    return;
  }
  await db.insert(clientPaymentMethods).values({
    id: PAYMENT_METHOD_ID,
    clientId: CLIENT_ID,
    orgId: ORG_ID,
    stripePaymentMethodId: "pm_demo_visa_4242",
    type: "card",
    brand: "Visa",
    last4: "4242",
    expMonth: 12,
    expYear: 2030,
    isDefault: true,
    status: "active",
  });
  log("create", "Client payment method (test fixture pm_demo_visa_4242)");
}

async function ensureNotification(opts: {
  userId: string;
  type:
    | "task_assigned"
    | "task_overdue"
    | "inspection_due"
    | "invoice_due"
    | "mention"
    | "general";
  title: string;
  body: string;
  linkUrl?: string;
}) {
  const existing = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.orgId, ORG_ID),
        eq(notifications.userId, opts.userId),
        eq(notifications.title, opts.title)
      )
    );
  if (existing.length > 0) {
    log("skip", `Notification "${opts.title}" for ${opts.userId}`);
    return;
  }
  await db.insert(notifications).values({
    orgId: ORG_ID,
    userId: opts.userId,
    type: opts.type,
    title: opts.title,
    body: opts.body,
    linkUrl: opts.linkUrl,
    isRead: false,
  });
  log("create", `Notification "${opts.title}" for ${opts.userId}`);
}

// ---------- Main ----------

async function main() {
  guardProduction();
  console.log(`\n=== Seeding "${ORG_NAME}" (${ORG_ID}) ===\n`);

  // 1. Org + users
  await ensureOrg();
  await ensureUser(USER_IDS.admin, "admin@beta.hubify.test", "Alex", "Admin", "admin");
  await ensureUser(
    USER_IDS.supervisor,
    "supervisor@beta.hubify.test",
    "Sam",
    "Supervisor",
    "supervisor",
    USER_IDS.admin
  );
  await ensureUser(
    USER_IDS.staff1,
    "staff1@beta.hubify.test",
    "Sky",
    "Staff",
    "staff",
    USER_IDS.supervisor
  );
  await ensureUser(
    USER_IDS.staff2,
    "staff2@beta.hubify.test",
    "Riley",
    "Staff",
    "staff",
    USER_IDS.supervisor
  );

  // 2. Contacts (10: 4 owners, 3 vendors, 2 tenants, 1 emergency)
  const ownerIds: number[] = [];
  for (const c of [
    { firstName: "Olivia", lastName: "Owner", email: "olivia.owner@beta.hubify.test" },
    { firstName: "Owen", lastName: "Oakhurst", email: "owen.oakhurst@beta.hubify.test" },
    { firstName: "Mia", lastName: "Marlow", email: "mia.marlow@beta.hubify.test" },
    { firstName: "Noah", lastName: "Northrop", email: "noah.northrop@beta.hubify.test" },
  ]) {
    ownerIds.push(
      await ensureContact({
        ...c,
        type: "owner",
        phone: "555-0200",
      })
    );
  }
  const vendorHvacId = await ensureContact({
    firstName: "Vince",
    lastName: "HVAC Co",
    email: "vince@hvac.beta.test",
    type: "vendor",
    vendorType: "HVAC",
    vendorCategory: "organization",
    phone: "555-0301",
  });
  const vendorElectricId = await ensureContact({
    firstName: "Ellie",
    lastName: "Electric",
    email: "ellie@electric.beta.test",
    type: "vendor",
    vendorType: "Electrician",
    vendorCategory: "individual",
    phone: "555-0302",
  });
  const vendorSecurityId = await ensureContact({
    firstName: "Sigrid",
    lastName: "Security",
    email: "sigrid@security.beta.test",
    type: "vendor",
    vendorType: "Security",
    vendorCategory: "organization",
    phone: "555-0303",
  });
  await ensureContact({
    firstName: "Tina",
    lastName: "Tenant",
    email: "tina.tenant@beta.hubify.test",
    type: "tenant",
    phone: "555-0401",
  });
  await ensureContact({
    firstName: "Trent",
    lastName: "Tenant",
    email: "trent.tenant@beta.hubify.test",
    type: "tenant",
    phone: "555-0402",
  });
  await ensureContact({
    firstName: "Eddie",
    lastName: "Emergency",
    email: "eddie@emergency.beta.test",
    type: "emergency_contact",
    phone: "555-0500",
  });

  // 3. Properties (6 mixed types)
  const propA = await ensureProperty({
    name: "Bayshore Estate",
    type: "single-family",
    address1: "100 Bayshore Dr",
    city: "Sarasota",
    state: "FL",
    zip: "34236",
    units: 1,
    squareFootage: 4200,
    managerId: USER_IDS.supervisor,
    primaryContactId: ownerIds[0],
    description: "Waterfront single-family home with private dock",
  });
  const propB = await ensureProperty({
    name: "Palmview Condo 12B",
    type: "condo",
    address1: "200 Palmview Ave Unit 12B",
    city: "Naples",
    state: "FL",
    zip: "34102",
    units: 1,
    squareFootage: 1800,
    managerId: USER_IDS.supervisor,
    primaryContactId: ownerIds[1],
  });
  const propC = await ensureProperty({
    name: "Magnolia Apartments",
    type: "apartment",
    address1: "300 Magnolia St",
    city: "Tampa",
    state: "FL",
    zip: "33602",
    units: 8,
    squareFootage: 9600,
    managerId: USER_IDS.admin,
    primaryContactId: ownerIds[2],
    description: "8-unit multi-family",
  });
  const propD = await ensureProperty({
    name: "Cedar Ridge House",
    type: "house",
    address1: "400 Cedar Ridge Ln",
    city: "Asheville",
    state: "NC",
    zip: "28801",
    units: 1,
    squareFootage: 2600,
    managerId: USER_IDS.supervisor,
    primaryContactId: ownerIds[3],
  });
  const propE = await ensureProperty({
    name: "Harborfront Commercial",
    type: "commercial",
    address1: "500 Harborfront Blvd",
    city: "Miami",
    state: "FL",
    zip: "33131",
    units: 1,
    squareFootage: 12000,
    managerId: USER_IDS.admin,
    primaryContactId: ownerIds[0],
  });
  const propF = await ensureProperty({
    name: "Sunset Storage",
    type: "storage_unit",
    address1: "600 Sunset Hwy",
    city: "Orlando",
    state: "FL",
    zip: "32801",
    units: 1,
    squareFootage: 200,
    managerId: USER_IDS.staff1,
    primaryContactId: ownerIds[1],
  });
  const allProps = [propA, propB, propC, propD, propE, propF];

  // 3a. Property access codes (door / wifi / alarm / gate per property)
  const accessSpecs: Array<{ p: number; cat: string; desc: string; val: string; notes?: string }> = [
    { p: propA, cat: "door", desc: "Front Door Lockbox", val: "4827", notes: "Rotate quarterly" },
    { p: propA, cat: "wifi", desc: "Bayshore Guest WiFi", val: "BayshoreGuest / Sunset!2025" },
    { p: propA, cat: "alarm", desc: "Main Alarm Panel", val: "9134#" },
    { p: propA, cat: "gate", desc: "Driveway Gate Code", val: "1100*" },
    { p: propB, cat: "door", desc: "Lobby Keypad", val: "5521" },
    { p: propB, cat: "wifi", desc: "Palmview Owner WiFi", val: "Palmview12B / CondoLife!" },
    { p: propC, cat: "door", desc: "Main Entry Code", val: "3300", notes: "Shared with leasing" },
    { p: propC, cat: "alarm", desc: "Common Area Alarm", val: "7788#" },
    { p: propD, cat: "door", desc: "Front Door Smart Lock", val: "9012", notes: "August lock app" },
    { p: propD, cat: "garage", desc: "Garage Side Door", val: "2244" },
    { p: propE, cat: "door", desc: "Tenant Entrance", val: "1492" },
    { p: propE, cat: "alarm", desc: "After-hours Alarm", val: "5566#" },
    { p: propF, cat: "gate", desc: "Storage Yard Gate", val: "0606*" },
  ];
  for (const a of accessSpecs) {
    await ensureAccessItem({ propertyId: a.p, category: a.cat, description: a.desc, value: a.val, notes: a.notes });
  }

  // 3b. Preferred vendors per property
  const vendorLinks: Array<{ p: number; v: number; notes?: string }> = [
    { p: propA, v: vendorHvacId, notes: "Preferred for HVAC + pool equipment" },
    { p: propA, v: vendorSecurityId, notes: "Manages alarm + camera system" },
    { p: propB, v: vendorHvacId },
    { p: propB, v: vendorElectricId, notes: "Condo board approved" },
    { p: propC, v: vendorElectricId, notes: "On call for unit turnover" },
    { p: propC, v: vendorSecurityId },
    { p: propD, v: vendorHvacId },
    { p: propE, v: vendorElectricId, notes: "Commercial-rated electrician" },
    { p: propE, v: vendorSecurityId, notes: "24/7 monitoring contract" },
    { p: propF, v: vendorSecurityId, notes: "Yard alarm + cameras" },
  ];
  for (const link of vendorLinks) {
    await ensurePropertyVendor({ propertyId: link.p, vendorId: link.v, notes: link.notes });
  }

  // 4. Inspection schedules (2)
  const monthlySchedule = await ensureInspectionSchedule({
    propertyId: propA,
    frequency: "monthly",
    inspectorUserId: USER_IDS.staff1,
  });
  await ensureInspectionSchedule({
    propertyId: propB,
    frequency: "quarterly",
    inspectorUserId: USER_IDS.staff2,
  });

  // 5. Tasks — 20 across statuses, with 3 inspection-completed and at least 1 recurring
  const photoSet = [
    { url: "https://example.com/beta/photo-before.jpg", filename: "before.jpg", category: "before" as const },
    { url: "https://example.com/beta/photo-after.jpg", filename: "after.jpg", category: "after" as const },
  ];

  // Three completed inspection tasks with full checklists
  const inspectionTask1 = await ensureTask({
    title: "Monthly Inspection — Bayshore Estate",
    propertyId: propA,
    status: "completed",
    priority: "high",
    category: "inspection",
    assignedToId: USER_IDS.staff1,
    dueDate: days(-7),
    completedAt: days(-1),
    inspectionScheduleId: monthlySchedule,
    attachments: photoSet,
  });
  await ensureChecklistItems(inspectionTask1, [
    { text: "Exterior — roof condition", result: "pass" },
    { text: "Exterior — gutters clear", result: "pass" },
    { text: "Interior — HVAC filter check", result: "fail", note: "Filter overdue, replaced" },
    { text: "Plumbing — leaks under sinks", result: "pass" },
    { text: "Pool equipment", result: "na", note: "Pool serviced separately" },
  ]);

  const inspectionTask2 = await ensureTask({
    title: "Quarterly Inspection — Palmview Condo",
    propertyId: propB,
    status: "completed",
    priority: "normal",
    category: "inspection",
    assignedToId: USER_IDS.staff2,
    dueDate: days(-30),
    completedAt: days(-25),
  });
  await ensureChecklistItems(inspectionTask2, [
    { text: "Smoke detectors operational", result: "pass" },
    { text: "Balcony rails secure", result: "pass" },
    { text: "Water shutoff accessible", result: "pass" },
    { text: "Patio lighting", result: "fail", note: "Two bulbs replaced" },
  ]);

  const inspectionTask3 = await ensureTask({
    title: "Move-out Inspection — Cedar Ridge House",
    propertyId: propD,
    status: "completed",
    priority: "high",
    category: "inspection",
    assignedToId: USER_IDS.staff1,
    dueDate: days(-14),
    completedAt: days(-10),
    attachments: photoSet,
  });
  await ensureChecklistItems(inspectionTask3, [
    { text: "Walls clean / patched", result: "pass" },
    { text: "Carpet condition", result: "fail", note: "Stain in master bedroom" },
    { text: "Appliances operational", result: "pass" },
    { text: "Keys returned", result: "pass" },
  ]);

  // Recurring weekly task
  await ensureTask({
    title: "Weekly Pool Cleaning — Bayshore",
    propertyId: propA,
    status: "in_progress",
    priority: "normal",
    category: "maintenance",
    assignedToId: USER_IDS.staff1,
    dueDate: days(2),
    isRecurring: true,
    recurrenceRule: "FREQ=WEEKLY;BYDAY=TU",
  });

  // Mixed pending/in_progress/completed/cancelled/overdue tasks
  const mixedTasks: Array<Parameters<typeof ensureTask>[0]> = [
    { title: "Replace HVAC filter", propertyId: propB, status: "pending", priority: "normal", category: "maintenance", assignedToId: USER_IDS.staff2, dueDate: days(5) },
    { title: "Repair gate motor", propertyId: propC, status: "in_progress", priority: "high", category: "repair", assignedToId: USER_IDS.staff1, dueDate: days(1) },
    { title: "Power-wash exterior", propertyId: propA, status: "pending", priority: "low", category: "cleaning", assignedToId: USER_IDS.staff2, dueDate: days(10) },
    { title: "Annual pest control", propertyId: propD, status: "completed", priority: "normal", category: "maintenance", assignedToId: USER_IDS.staff1, dueDate: days(-20), completedAt: days(-18) },
    { title: "Replace smoke detectors", propertyId: propE, status: "completed", priority: "high", category: "maintenance", assignedToId: USER_IDS.staff2, dueDate: days(-5), completedAt: days(-2) },
    { title: "Storage unit lock change", propertyId: propF, status: "pending", priority: "low", category: "repair", assignedToId: USER_IDS.staff1, dueDate: days(7) },
    { title: "Lawn re-sod estimate", propertyId: propA, status: "pending", priority: "normal", category: "maintenance", assignedToId: USER_IDS.staff2, dueDate: days(14) },
    { title: "Inspect attic insulation", propertyId: propD, status: "pending", priority: "low", category: "inspection", assignedToId: USER_IDS.staff1, dueDate: days(21) },
    { title: "OVERDUE: Storm cleanup", propertyId: propA, status: "pending", priority: "urgent", category: "maintenance", assignedToId: USER_IDS.staff1, dueDate: days(-3) },
    { title: "OVERDUE: Replace dryer vent hose", propertyId: propC, status: "pending", priority: "high", category: "repair", assignedToId: USER_IDS.staff2, dueDate: days(-2) },
    { title: "Re-key front door", propertyId: propB, status: "cancelled", priority: "normal", category: "repair", assignedToId: USER_IDS.staff1, dueDate: days(-1) },
    { title: "Quote roof recoating", propertyId: propE, status: "in_progress", priority: "high", category: "administrative", assignedToId: USER_IDS.supervisor, dueDate: days(4), attachments: photoSet },
    { title: "Annual fire-extinguisher recharge", propertyId: propC, status: "pending", priority: "normal", category: "maintenance", assignedToId: USER_IDS.staff2, dueDate: days(30) },
    { title: "Replace garbage disposal", propertyId: propB, status: "completed", priority: "normal", category: "repair", assignedToId: USER_IDS.staff2, dueDate: days(-12), completedAt: days(-9), attachments: photoSet },
    { title: "Patio lighting upgrade", propertyId: propA, status: "in_progress", priority: "low", category: "maintenance", assignedToId: USER_IDS.staff2, dueDate: days(8) },
    { title: "Quarterly grease-trap service", propertyId: propE, status: "pending", priority: "normal", category: "maintenance", assignedToId: USER_IDS.staff1, dueDate: days(15) },
  ];
  for (const t of mixedTasks) await ensureTask(t);

  // 6. Calendar + 5 events (incl. conflict + recurring)
  await ensureCalendar();
  const eventBase = "000000be-0000-0000-0000-000000eb00";
  const conflictStart = days(3);
  conflictStart.setHours(10, 0, 0, 0);
  const conflictEnd = new Date(conflictStart.getTime() + 60 * 60 * 1000);

  await ensureEvent({
    id: `${eventBase}01`,
    title: "Bayshore site walkthrough",
    start: conflictStart,
    end: conflictEnd,
    organizerId: USER_IDS.supervisor,
    attendeeIds: [USER_IDS.staff1],
    location: "Bayshore Estate",
    propertyId: propA,
  });
  // Conflicting event for staff1
  await ensureEvent({
    id: `${eventBase}02`,
    title: "Palmview vendor meeting (CONFLICT)",
    start: conflictStart,
    end: conflictEnd,
    organizerId: USER_IDS.admin,
    attendeeIds: [USER_IDS.staff1, USER_IDS.staff2],
    location: "Palmview Condo 12B",
    propertyId: propB,
  });
  // Recurring weekly team standup
  const standupStart = days(1);
  standupStart.setHours(9, 0, 0, 0);
  const standupEnd = new Date(standupStart.getTime() + 30 * 60 * 1000);
  await ensureEvent({
    id: `${eventBase}03`,
    title: "Weekly team standup",
    start: standupStart,
    end: standupEnd,
    organizerId: USER_IDS.admin,
    attendeeIds: [USER_IDS.supervisor, USER_IDS.staff1, USER_IDS.staff2],
    recurrenceRule: "FREQ=WEEKLY;BYDAY=MO",
    location: "Office",
  });
  // Standalone events
  const e4Start = days(7); e4Start.setHours(13, 0, 0, 0);
  await ensureEvent({
    id: `${eventBase}04`,
    title: "Owner review — Cedar Ridge",
    start: e4Start,
    end: new Date(e4Start.getTime() + 90 * 60 * 1000),
    organizerId: USER_IDS.admin,
    attendeeIds: [USER_IDS.supervisor],
    propertyId: propD,
  });
  const e5Start = days(14); e5Start.setHours(15, 0, 0, 0);
  await ensureEvent({
    id: `${eventBase}05`,
    title: "Quarterly business review",
    start: e5Start,
    end: new Date(e5Start.getTime() + 60 * 60 * 1000),
    organizerId: USER_IDS.admin,
    attendeeIds: [USER_IDS.supervisor, USER_IDS.staff1, USER_IDS.staff2],
  });

  // 7. Forms + submissions (2 published)
  await ensureForm({
    formTitle: "Beta — New Service Request",
    slug: "beta-new-service-request",
    contexts: ["task", "property"],
    fields: [
      { label: "Issue Summary", type: "text", required: true, context: "task" },
      { label: "Details", type: "textarea", required: true, context: "task" },
      { label: "Urgency", type: "select", context: "task" },
    ],
    submissionsCount: 2,
    propertyId: propA,
  });
  await ensureForm({
    formTitle: "Beta — Owner Onboarding",
    slug: "beta-owner-onboarding",
    contexts: ["people", "property"],
    fields: [
      { label: "Full Name", type: "text", required: true, context: "people" },
      { label: "Email", type: "text", required: true, context: "people" },
      { label: "Property Address", type: "text", required: true, context: "property" },
      { label: "Square Footage", type: "number", context: "property" },
    ],
    submissionsCount: 1,
    propertyId: propB,
  });

  // 8. Community + 2 community documents
  const communityId = await ensureCommunity();
  await ensureCommunityDocs(communityId);

  // Attach the portal client's properties to the community so community-wide
  // documents are visible under the portal's strict per-property scoping.
  await db
    .update(properties)
    .set({ communityId })
    .where(inArray(properties.id, [propA, propB]));

  // 9. Client + portal user + property links
  await ensureClient();
  await ensurePortalUser();
  await ensurePortalPropertyLink(PORTAL_USER_ID, propA);
  await ensurePortalPropertyLink(PORTAL_USER_ID, propB);

  // 10. Invoices: draft / sent / paid / overdue + 1 consolidated
  await ensureInvoice({
    id: INVOICE_IDS.draft,
    invoiceNumber: "BETA-DRAFT-0001",
    amountCents: 25000,
    status: "draft",
    description: "Draft invoice — pending review",
  });
  await ensureInvoice({
    id: INVOICE_IDS.sent,
    invoiceNumber: "BETA-SENT-0002",
    amountCents: 48000,
    status: "open",
    dueDate: days(10),
    description: "Sent invoice — awaiting payment",
  });
  await ensureInvoice({
    id: INVOICE_IDS.paid,
    invoiceNumber: "BETA-PAID-0003",
    amountCents: 32000,
    status: "paid",
    paymentStatus: "succeeded",
    paymentDate: days(-2),
    dueDate: days(-7),
    description: "Paid invoice — successful charge",
    receiptUrl: "https://pay.stripe.com/receipts/payment/demo-receipt-beta-paid-0003",
    paymentMethodBrand: "visa",
    paymentMethodLast4: "4242",
  });
  await ensureInvoice({
    id: INVOICE_IDS.overdue,
    invoiceNumber: "BETA-OVERDUE-0004",
    amountCents: 19500,
    status: "open",
    dueDate: days(-12),
    description: "Overdue invoice — past due date",
  });
  await ensureInvoice({
    id: INVOICE_IDS.consolidated,
    invoiceNumber: "BETA-CONSOL-0005",
    amountCents: 95000,
    status: "open",
    dueDate: days(15),
    description:
      "Consolidated invoice covering Bayshore Estate and Palmview Condo 12B",
    metadata: {
      consolidatedInvoice: true,
      propertyIds: [propA, propB],
    },
  });

  // 11. Stripe payment method (test fixture; skips if STRIPE_SECRET_KEY absent)
  await ensurePaymentMethod();

  // 12. Notifications (3+ across staff/supervisor)
  await ensureNotification({
    userId: USER_IDS.staff1,
    type: "task_overdue",
    title: "Task overdue: Storm cleanup",
    body: "OVERDUE: Storm cleanup at Bayshore Estate is past its due date.",
    linkUrl: "/tasks",
  });
  await ensureNotification({
    userId: USER_IDS.supervisor,
    type: "invoice_due",
    title: "Invoice past due",
    body: "Invoice BETA-OVERDUE-0004 for Casey Client is 12 days overdue.",
    linkUrl: "/invoices",
  });
  await ensureNotification({
    userId: USER_IDS.admin,
    type: "inspection_due",
    title: "Inspection due soon",
    body: "Quarterly inspection for Palmview Condo 12B is due next week.",
    linkUrl: "/inspections",
  });
  await ensureNotification({
    userId: USER_IDS.staff2,
    type: "task_assigned",
    title: "New task assigned",
    body: "You've been assigned: Replace HVAC filter at Palmview Condo 12B.",
    linkUrl: "/tasks",
  });

  console.log(
    `\n=== Done — ${created} created, ${skipped} skipped ===\n` +
      `Org id:        ${ORG_ID}\n` +
      `Portal login:  /portal/login (email: client@beta.hubify.test  password: ${PORTAL_PASSWORD})\n` +
      `Property ids:\n` +
      `  Bayshore Estate         = ${propA}\n` +
      `  Palmview Condo 12B      = ${propB}\n` +
      `  Magnolia Apartments     = ${propC}\n` +
      `  Cedar Ridge House       = ${propD}\n` +
      `  Harborfront Commercial  = ${propE}\n` +
      `  Sunset Storage          = ${propF}\n`
  );
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Seed failed:", err);
    try {
      await pool.end();
    } catch {}
    process.exit(1);
  });
