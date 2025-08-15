import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  integer,
  boolean,
  serial,
  uuid,
  unique,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Organizations table for multi-tenancy
export const orgs = pgTable("orgs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name").notNull(),
  domain: varchar("domain"), // Custom domain for the org
  branding: jsonb("branding").$type<{
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  }>().default({}),
  theme: jsonb("theme").$type<{
    tokens?: Record<string, string>;
    customCss?: string;
  }>().default({}),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organization subscriptions and tiers
export const orgSubscriptions = pgTable("org_subscriptions", {
  orgId: uuid("org_id").primaryKey().references(() => orgs.id),
  tier: text("tier").$type<"starter"|"pro"|"grow"|"enterprise">().notNull().default("starter"),
  features: jsonb("features").$type<Record<string, boolean>>().default({}),
  renewedAt: timestamp("renewed_at"),
  expiresAt: timestamp("expires_at"),
});

// Clients table for property tenants/owners
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  email: varchar("email").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: varchar("phone"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueOrgEmail: unique().on(table.orgId, table.email),
}));

// User storage table - required for Replit Auth (staff/admin users)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  orgId: uuid("org_id").references(() => orgs.id), // Which org they belong to
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("staff"), // admin, supervisor, staff
  tier: varchar("tier").notNull().default("basic"), // basic, standard, premium
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Communities table
export const communities = pgTable("communities", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  address1: varchar("address1"),
  address2: varchar("address2"),
  city: varchar("city"),
  state: varchar("state"),
  zip: varchar("zip"),
  imageUrl: varchar("image_url"),
  managerId: varchar("manager_id").references(() => users.id),
  hoaPresidentId: varchar("hoa_president_id").references(() => users.id),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Properties table
export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  name: varchar("name").notNull(),
  address1: varchar("address1").notNull(),
  address2: varchar("address2"),
  city: varchar("city").notNull(),
  state: varchar("state").notNull(),
  zip: varchar("zip").notNull(),
  type: varchar("type").notNull(), // single-family, condo, apartment, house, commercial
  units: integer("units").default(1),
  managerId: varchar("manager_id").references(() => users.id),
  isActive: boolean("is_active").notNull().default(true),
  imageUrl: varchar("image_url"),
  squareFootage: integer("square_footage"),
  billingType: varchar("billing_type"), // sqft, flat_fee
  status: varchar("status").notNull().default("occupied"), // occupied, vacant, under_repair
  communityId: integer("community_id").references(() => communities.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rooms/Spaces table
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // 'bedroom', 'bathroom', 'kitchen', 'living_room', 'office', 'storage', 'outdoor', 'other'
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Vehicles table
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull(),
  make: varchar("make").notNull(),
  model: varchar("model").notNull(),
  year: integer("year"),
  color: varchar("color"),
  licensePlate: varchar("license_plate"),
  vin: varchar("vin"),
  type: varchar("type").notNull(), // 'car', 'truck', 'motorcycle', 'boat', 'rv', 'trailer', 'other'
  details: text("details"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Vehicle Maintenance table
export const vehicleMaintenance = pgTable("vehicle_maintenance", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type").notNull(), // 'oil_change', 'inspection', 'registration', 'repair', 'service', 'other'
  description: text("description").notNull(),
  cost: varchar("cost"), // dollar amount as string
  serviceDate: timestamp("service_date"),
  nextDueDate: timestamp("next_due_date"),
  mileage: integer("mileage"),
  vendor: varchar("vendor"),
  notes: text("notes"),
  createdById: varchar("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Vehicle Notes table
export const vehicleNotes = pgTable("vehicle_notes", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  category: varchar("category").notNull(), // 'insurance', 'registration', 'condition', 'history', 'other'
  createdById: varchar("created_by_id").references(() => users.id).notNull(),
  isImportant: boolean("is_important").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Room Supplies table
export const roomSupplies = pgTable("room_supplies", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => rooms.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name").notNull(),
  category: varchar("category").notNull(), // 'lighting', 'hardware', 'paint', 'flooring', 'fixtures', 'appliances', 'other'
  brand: varchar("brand"),
  model: varchar("model"),
  quantity: integer("quantity").default(1),
  unitCost: varchar("unit_cost"), // dollar amount as string
  totalCost: varchar("total_cost"), // calculated field
  purchaseDate: timestamp("purchase_date"),
  warrantyExpires: timestamp("warranty_expires"),
  vendor: varchar("vendor"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Room Notes table
export const roomNotes = pgTable("room_notes", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => rooms.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  category: varchar("category").notNull(), // 'paint', 'dimensions', 'features', 'maintenance', 'history', 'other'
  createdById: varchar("created_by_id").references(() => users.id).notNull(),
  isImportant: boolean("is_important").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Room Devices table
export const roomDevices = pgTable("room_devices", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => rooms.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name").notNull(), // e.g. "Nest Thermostat", "Samsung Smart TV"
  type: varchar("type").notNull(), // thermostat, TV, network, alarm, speaker, camera
  brand: varchar("brand"), // e.g. LG, Google, Sony
  model: varchar("model"), // e.g. T3007ES, OLED55CXPUA
  serialNumber: varchar("serial_number"),
  macAddress: varchar("mac_address"), // For networked devices
  ipAddress: varchar("ip_address"), // For networked devices
  locationInRoom: varchar("location_in_room"), // e.g. "On west wall", "Mounted above bed"
  installDate: timestamp("install_date"),
  lastServiced: timestamp("last_serviced"),
  nextServiceDue: timestamp("next_service_due"),
  notes: text("notes"), // Troubleshooting tips, remote control info, special access notes
  isActive: boolean("is_active").default(true),
  createdById: varchar("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Room surfaces and structure table
export const roomSurfaces = pgTable("room_surfaces", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => rooms.id, { onDelete: "cascade" }).notNull(),
  flooringType: varchar("flooring_type"), // carpet, hardwood, tile, laminate, vinyl, etc.
  flooringNotes: text("flooring_notes"),
  paintColor: varchar("paint_color"),
  paintCode: varchar("paint_code"), // e.g. SW 7005
  paintBrand: varchar("paint_brand"), // e.g. Sherwin-Williams
  wallTreatment: varchar("wall_treatment"), // wallpaper, paneling, etc.
  wallTreatmentNotes: text("wall_treatment_notes"),
  ceilingType: varchar("ceiling_type"), // standard, tray, vaulted, popcorn, etc.
  ceilingHeight: varchar("ceiling_height"),
  ceilingNotes: text("ceiling_notes"),
  createdById: varchar("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Room fixtures and features table
export const roomFixtures = pgTable("room_fixtures", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => rooms.id, { onDelete: "cascade" }).notNull(),
  windowCount: integer("window_count"),
  windowType: varchar("window_type"), // single-hung, double-hung, casement, etc.
  windowTreatments: varchar("window_treatments"), // blinds, curtains, shutters
  doorCount: integer("door_count"),
  doorTypes: varchar("door_types"), // interior, exterior, sliding, etc.
  lockTypes: varchar("lock_types"),
  lightingType: varchar("lighting_type"), // overhead, recessed, pendant, etc.
  lightingNotes: text("lighting_notes"),
  hasDimmer: boolean("has_dimmer").default(false),
  hvacVents: integer("hvac_vents"),
  hvacFilterSize: varchar("hvac_filter_size"),
  hvacNotes: text("hvac_notes"),
  plumbingAccess: varchar("plumbing_access"), // none, sink, toilet, shower, etc.
  plumbingNotes: text("plumbing_notes"),
  electricalOutlets: integer("electrical_outlets"),
  electricalNotes: text("electrical_notes"),
  createdById: varchar("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Room photos table
export const roomPhotos = pgTable("room_photos", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => rooms.id, { onDelete: "cascade" }).notNull(),
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  url: varchar("url").notNull(),
  description: text("description"),
  category: varchar("category").default("general"), // general, before, after, issue, etc.
  uploadedById: varchar("uploaded_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Room checklists table
export const roomChecklists = pgTable("room_checklists", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => rooms.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  template: varchar("template"), // bedroom_turnover, bathroom_deep_clean, etc.
  items: jsonb("items"), // array of checklist items with completion status
  isCompleted: boolean("is_completed").default(false),
  completedById: varchar("completed_by_id").references(() => users.id),
  completedAt: timestamp("completed_at"),
  createdById: varchar("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description"),
  priority: varchar("priority").notNull().default("normal"), // urgent, high, normal, low
  status: varchar("status").notNull().default("pending"), // pending, in_progress, completed, cancelled
  propertyId: integer("property_id").references(() => properties.id),
  roomId: integer("room_id").references(() => rooms.id),
  contactId: integer("contact_id").references(() => contacts.id),
  assignedToId: varchar("assigned_to_id").references(() => users.id),
  assignedById: varchar("assigned_by_id").references(() => users.id),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  timeEstimate: varchar("time_estimate"), // e.g., "1 days 2 hours 30 minutes"
  category: varchar("category"), // maintenance, inspection, cleaning, repair, administrative
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurrenceFrequency: varchar("recurrence_frequency"), // daily, weekly, monthly, quarterly
  billedSeparately: boolean("billed_separately").notNull().default(false),
  billingAmount: varchar("billing_amount"), // dollar amount as string, e.g., "125.00"
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contacts/People table
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  type: varchar("type").notNull(), // tenant, owner, vendor, emergency_contact
  propertyId: integer("property_id").references(() => properties.id),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contact Properties junction table - many-to-many relationship
export const contactProperties = pgTable("contact_properties", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").references(() => contacts.id, { onDelete: "cascade" }).notNull(),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull(),
  isPrimary: boolean("is_primary").default(false),
  relationship: varchar("relationship"), // tenant, owner, vendor, emergency_contact
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team Messages table
export const teamMessages = pgTable("team_messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  authorId: varchar("author_id").references(() => users.id),
  parentId: integer("parent_id").references(() => teamMessages.id), // For replies
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isEdited: boolean("is_edited").notNull().default(false),
  emailNotification: boolean("email_notification").notNull().default(false),
});

// Message Reactions table
export const messageReactions = pgTable("message_reactions", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => teamMessages.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  reaction: varchar("reaction").notNull(), // emoji like '👍', '❤️', '😄', etc.
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Ensure one reaction per user per message
  uniqueUserMessageReaction: index("unique_user_message_reaction").on(table.messageId, table.userId, table.reaction),
}));

// Activity Log table
export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action").notNull(), // task_completed, property_added, etc.
  entityType: varchar("entity_type").notNull(), // task, property, contact
  entityId: varchar("entity_id").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Advanced Forms Library (organization creates; client sees/uses)
export const forms = pgTable("forms", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  schema: jsonb("schema").$type<{
    fields: Array<{
      id: string;
      label: string;
      type: "text"|"textarea"|"number"|"select"|"checkbox"|"date"|"file";
      required?: boolean;
      options?: string[];
      placeholder?: string;
      help?: string;
      maxSizeMB?: number;
    }>;
    submitLabel?: string;
    successMessage?: string;
  }>().notNull(),
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Assign org forms to a property (controls client visibility)
export const propertyForms = pgTable("property_forms", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  formId: uuid("form_id").references(() => forms.id).notNull(),
  sortOrder: integer("sort_order").default(0),
  isRequired: boolean("is_required").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  uniq: unique().on(t.orgId, t.propertyId, t.formId),
}));

// Client submissions with enhanced features
export const formSubmissions = pgTable("form_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  formId: uuid("form_id").references(() => forms.id).notNull(),
  submittedByClientId: uuid("submitted_by_client_id").references(() => clients.id).notNull(),
  answers: jsonb("answers").$type<Record<string, any>>().notNull(),
  files: jsonb("files").$type<Array<{fieldId:string; name:string; url:string; size:number}>>().default([]),
  status: text("status").$type<"received"|"in_review"|"accepted"|"rejected">().default("received"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Checklist Templates (Admin-managed)
export const checklistTemplates = pgTable("checklist_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category").notNull(), // 'inspection', 'maintenance', 'cleaning', etc.
  items: jsonb("items").notNull().default('[]'), // Array of template items
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Task Checklist Items (Enhanced)
export const taskChecklistItems = pgTable("task_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  text: text("text").notNull(),
  completed: boolean("completed").default(false),
  dueDate: timestamp("due_date"),
  assignedToId: varchar("assigned_to_id").references(() => users.id),
  priority: varchar("priority").default("normal"), // 'urgent', 'high', 'normal', 'low'
  sortOrder: integer("sort_order").notNull().default(0),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ignored duplicates table for tracking duplicates that should be ignored
export const ignoredDuplicates = pgTable("ignored_duplicates", {
  id: serial("id").primaryKey(),
  recordType: varchar("record_type").notNull(), // 'contact' or 'property'
  recordIds: text("record_ids").array().notNull(), // Array of record IDs in this duplicate group
  ignoredBy: varchar("ignored_by").notNull().references(() => users.id),
  reason: text("reason"), // Optional reason for ignoring
  createdAt: timestamp("created_at").defaultNow(),
});

// Duplicate history table for tracking all duplicate actions
export const duplicateHistory = pgTable("duplicate_history", {
  id: serial("id").primaryKey(),
  action: varchar("action", { length: 20 }).notNull(), // 'merge' or 'ignore'
  recordType: varchar("record_type", { length: 50 }).notNull(), // 'contact' or 'property'
  recordIds: jsonb("record_ids").notNull(), // Array of record IDs involved
  performedBy: varchar("performed_by", { length: 255 }).notNull().references(() => users.id),
  performedByName: varchar("performed_by_name", { length: 255 }), // Cache the user name
  performedAt: timestamp("performed_at").defaultNow(),
  details: jsonb("details"), // Additional details about the action
});

// Relations
export const orgsRelations = relations(orgs, ({ one, many }) => ({
  subscription: one(orgSubscriptions),
  users: many(users),
  clients: many(clients),
  properties: many(properties),
  forms: many(forms),
  propertyForms: many(propertyForms),
  formSubmissions: many(formSubmissions),
}));

export const orgSubscriptionsRelations = relations(orgSubscriptions, ({ one }) => ({
  org: one(orgs, {
    fields: [orgSubscriptions.orgId],
    references: [orgs.id],
  }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  org: one(orgs, {
    fields: [clients.orgId],
    references: [orgs.id],
  }),
  formSubmissions: many(formSubmissions),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  org: one(orgs, {
    fields: [users.orgId],
    references: [orgs.id],
  }),
  managedProperties: many(properties),
  assignedTasks: many(tasks, { relationName: "assignedTo" }),
  createdTasks: many(tasks, { relationName: "assignedBy" }),
  messages: many(teamMessages),
  activities: many(activityLog),
}));

export const communitiesRelations = relations(communities, ({ one, many }) => ({
  manager: one(users, {
    fields: [communities.managerId],
    references: [users.id],
  }),
  hoaPresident: one(users, {
    fields: [communities.hoaPresidentId],
    references: [users.id],
  }),
  properties: many(properties),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  org: one(orgs, {
    fields: [properties.orgId],
    references: [orgs.id],
  }),
  manager: one(users, {
    fields: [properties.managerId],
    references: [users.id],
  }),
  community: one(communities, {
    fields: [properties.communityId],
    references: [communities.id],
  }),
  tasks: many(tasks),
  contacts: many(contacts),
  rooms: many(rooms),
  vehicles: many(vehicles),
  propertyForms: many(propertyForms),
  formSubmissions: many(formSubmissions),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  property: one(properties, {
    fields: [tasks.propertyId],
    references: [properties.id],
  }),
  room: one(rooms, {
    fields: [tasks.roomId],
    references: [rooms.id],
  }),
  assignedTo: one(users, {
    fields: [tasks.assignedToId],
    references: [users.id],
    relationName: "assignedTo",
  }),
  assignedBy: one(users, {
    fields: [tasks.assignedById],
    references: [users.id],
    relationName: "assignedBy",
  }),
  checklistItems: many(taskChecklistItems),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  property: one(properties, {
    fields: [rooms.propertyId],
    references: [properties.id],
  }),
  tasks: many(tasks),
  supplies: many(roomSupplies),
  notes: many(roomNotes),
  devices: many(roomDevices),
  surfaces: many(roomSurfaces),
  fixtures: many(roomFixtures),
  photos: many(roomPhotos),
  checklists: many(roomChecklists),
}));

export const roomSuppliesRelations = relations(roomSupplies, ({ one }) => ({
  room: one(rooms, {
    fields: [roomSupplies.roomId],
    references: [rooms.id],
  }),
}));

export const roomNotesRelations = relations(roomNotes, ({ one }) => ({
  room: one(rooms, {
    fields: [roomNotes.roomId],
    references: [rooms.id],
  }),
  createdBy: one(users, {
    fields: [roomNotes.createdById],
    references: [users.id],
  }),
}));

export const roomDevicesRelations = relations(roomDevices, ({ one }) => ({
  room: one(rooms, {
    fields: [roomDevices.roomId],
    references: [rooms.id],
  }),
  createdBy: one(users, {
    fields: [roomDevices.createdById],
    references: [users.id],
  }),
}));

export const roomSurfacesRelations = relations(roomSurfaces, ({ one }) => ({
  room: one(rooms, {
    fields: [roomSurfaces.roomId],
    references: [rooms.id],
  }),
  createdBy: one(users, {
    fields: [roomSurfaces.createdById],
    references: [users.id],
  }),
}));

export const roomFixturesRelations = relations(roomFixtures, ({ one }) => ({
  room: one(rooms, {
    fields: [roomFixtures.roomId],
    references: [rooms.id],
  }),
  createdBy: one(users, {
    fields: [roomFixtures.createdById],
    references: [users.id],
  }),
}));

export const roomPhotosRelations = relations(roomPhotos, ({ one }) => ({
  room: one(rooms, {
    fields: [roomPhotos.roomId],
    references: [rooms.id],
  }),
  uploadedBy: one(users, {
    fields: [roomPhotos.uploadedById],
    references: [users.id],
  }),
}));

export const roomChecklistsRelations = relations(roomChecklists, ({ one }) => ({
  room: one(rooms, {
    fields: [roomChecklists.roomId],
    references: [rooms.id],
  }),
  createdBy: one(users, {
    fields: [roomChecklists.createdById],
    references: [users.id],
  }),
  completedBy: one(users, {
    fields: [roomChecklists.completedById],
    references: [users.id],
  }),
}));

export const checklistTemplatesRelations = relations(checklistTemplates, ({ one }) => ({
  createdBy: one(users, {
    fields: [checklistTemplates.createdBy],
    references: [users.id],
  }),
}));

export const taskChecklistItemsRelations = relations(taskChecklistItems, ({ one }) => ({
  task: one(tasks, {
    fields: [taskChecklistItems.taskId],
    references: [tasks.id],
  }),
  assignedTo: one(users, {
    fields: [taskChecklistItems.assignedToId],
    references: [users.id],
    relationName: "checklistAssignedTo",
  }),
  completedBy: one(users, {
    fields: [taskChecklistItems.completedBy],
    references: [users.id],
    relationName: "checklistCompletedBy",
  }),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  property: one(properties, {
    fields: [contacts.propertyId],
    references: [properties.id],
  }),
}));

export const teamMessagesRelations = relations(teamMessages, ({ one, many }) => ({
  author: one(users, {
    fields: [teamMessages.authorId],
    references: [users.id],
  }),
  parent: one(teamMessages, {
    fields: [teamMessages.parentId],
    references: [teamMessages.id],
    relationName: "replies",
  }),
  replies: many(teamMessages, {
    relationName: "replies",
  }),
  reactions: many(messageReactions),
}));

export const messageReactionsRelations = relations(messageReactions, ({ one }) => ({
  message: one(teamMessages, {
    fields: [messageReactions.messageId],
    references: [teamMessages.id],
  }),
  user: one(users, {
    fields: [messageReactions.userId],
    references: [users.id],
  }),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  property: one(properties, {
    fields: [vehicles.propertyId],
    references: [properties.id],
  }),
  maintenance: many(vehicleMaintenance),
  notes: many(vehicleNotes),
}));

export const vehicleMaintenanceRelations = relations(vehicleMaintenance, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleMaintenance.vehicleId],
    references: [vehicles.id],
  }),
  createdBy: one(users, {
    fields: [vehicleMaintenance.createdById],
    references: [users.id],
  }),
}));

export const vehicleNotesRelations = relations(vehicleNotes, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleNotes.vehicleId],
    references: [vehicles.id],
  }),
  createdBy: one(users, {
    fields: [vehicleNotes.createdById],
    references: [users.id],
  }),
}));

export const formsRelations = relations(forms, ({ one, many }) => ({
  org: one(orgs, {
    fields: [forms.orgId],
    references: [orgs.id],
  }),
  propertyForms: many(propertyForms),
  submissions: many(formSubmissions),
}));

export const propertyFormsRelations = relations(propertyForms, ({ one }) => ({
  org: one(orgs, {
    fields: [propertyForms.orgId],
    references: [orgs.id],
  }),
  property: one(properties, {
    fields: [propertyForms.propertyId],
    references: [properties.id],
  }),
  form: one(forms, {
    fields: [propertyForms.formId],
    references: [forms.id],
  }),
}));

export const formSubmissionsRelations = relations(formSubmissions, ({ one }) => ({
  org: one(orgs, {
    fields: [formSubmissions.orgId],
    references: [orgs.id],
  }),
  property: one(properties, {
    fields: [formSubmissions.propertyId],
    references: [properties.id],
  }),
  form: one(forms, {
    fields: [formSubmissions.formId],
    references: [forms.id],
  }),
  submittedByClient: one(clients, {
    fields: [formSubmissions.submittedByClientId],
    references: [clients.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertChecklistTemplateSchema = createInsertSchema(checklistTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskChecklistItemSchema = createInsertSchema(taskChecklistItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const insertCommunitySchema = createInsertSchema(communities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamMessageSchema = createInsertSchema(teamMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isEdited: true,
});

export const insertMessageReactionSchema = createInsertSchema(messageReactions).omit({
  id: true,
  createdAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  createdAt: true,
});

// New schemas for the enhanced forms system
export const insertOrgSchema = createInsertSchema(orgs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrgSubscriptionSchema = createInsertSchema(orgSubscriptions);

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFormSchema = createInsertSchema(forms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertyFormSchema = createInsertSchema(propertyForms).omit({
  id: true,
  createdAt: true,
});

export const insertFormSubmissionSchema = createInsertSchema(formSubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVehicleMaintenanceSchema = createInsertSchema(vehicleMaintenance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVehicleNoteSchema = createInsertSchema(vehicleNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoomSupplySchema = createInsertSchema(roomSupplies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoomNoteSchema = createInsertSchema(roomNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoomDeviceSchema = createInsertSchema(roomDevices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoomSurfaceSchema = createInsertSchema(roomSurfaces).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoomFixtureSchema = createInsertSchema(roomFixtures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoomPhotoSchema = createInsertSchema(roomPhotos).omit({
  id: true,
  createdAt: true,
});

export const insertRoomChecklistSchema = createInsertSchema(roomChecklists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContactPropertySchema = createInsertSchema(contactProperties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertOrg = z.infer<typeof insertOrgSchema>;
export type Org = typeof orgs.$inferSelect;
export type InsertOrgSubscription = z.infer<typeof insertOrgSubscriptionSchema>;
export type OrgSubscription = typeof orgSubscriptions.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type Community = typeof communities.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;
export type InsertPropertyForm = z.infer<typeof insertPropertyFormSchema>;
export type PropertyForm = typeof propertyForms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContactProperty = z.infer<typeof insertContactPropertySchema>;
export type ContactProperty = typeof contactProperties.$inferSelect;
export type InsertTeamMessage = z.infer<typeof insertTeamMessageSchema>;
export type TeamMessage = typeof teamMessages.$inferSelect;
export type InsertMessageReaction = z.infer<typeof insertMessageReactionSchema>;
export type MessageReaction = typeof messageReactions.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertForm = z.infer<typeof insertFormSchema>;
export type Form = typeof forms.$inferSelect;

export type InsertFormSubmission = z.infer<typeof insertFormSubmissionSchema>;
export type FormSubmission = typeof formSubmissions.$inferSelect;
export type InsertChecklistTemplate = z.infer<typeof insertChecklistTemplateSchema>;
export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;
export type InsertTaskChecklistItem = z.infer<typeof insertTaskChecklistItemSchema>;
export type TaskChecklistItem = typeof taskChecklistItems.$inferSelect;
export type InsertRoomSupply = z.infer<typeof insertRoomSupplySchema>;
export type RoomSupply = typeof roomSupplies.$inferSelect;
export type InsertRoomNote = z.infer<typeof insertRoomNoteSchema>;
export type RoomNote = typeof roomNotes.$inferSelect;
export type InsertRoomDevice = z.infer<typeof insertRoomDeviceSchema>;
export type RoomDevice = typeof roomDevices.$inferSelect;
export type InsertRoomSurface = z.infer<typeof insertRoomSurfaceSchema>;
export type RoomSurface = typeof roomSurfaces.$inferSelect;
export type InsertRoomFixture = z.infer<typeof insertRoomFixtureSchema>;
export type RoomFixture = typeof roomFixtures.$inferSelect;
export type InsertRoomPhoto = z.infer<typeof insertRoomPhotoSchema>;
export type RoomPhoto = typeof roomPhotos.$inferSelect;
export type InsertRoomChecklist = z.infer<typeof insertRoomChecklistSchema>;
export type RoomChecklist = typeof roomChecklists.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicleMaintenance = z.infer<typeof insertVehicleMaintenanceSchema>;
export type VehicleMaintenance = typeof vehicleMaintenance.$inferSelect;
export type InsertVehicleNote = z.infer<typeof insertVehicleNoteSchema>;
export type VehicleNote = typeof vehicleNotes.$inferSelect;
export type IgnoredDuplicate = typeof ignoredDuplicates.$inferSelect;
export type InsertIgnoredDuplicate = typeof ignoredDuplicates.$inferInsert;
export type DuplicateHistory = typeof duplicateHistory.$inferSelect;
export type InsertDuplicateHistory = typeof duplicateHistory.$inferInsert;
