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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
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

// User storage table - required for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("staff"), // admin, supervisor, staff, client
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
  id: serial("id").primaryKey(),
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

// Tasks table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description"),
  priority: varchar("priority").notNull().default("normal"), // urgent, high, normal, low
  status: varchar("status").notNull().default("pending"), // pending, in_progress, completed, cancelled
  propertyId: integer("property_id").references(() => properties.id),
  assignedToId: varchar("assigned_to_id").references(() => users.id),
  assignedById: varchar("assigned_by_id").references(() => users.id),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
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

// Forms system tables
export const forms = pgTable("forms", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  fields: jsonb("fields").notNull(), // Form fields structure
  embedEnabled: boolean("embed_enabled").notNull().default(false),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  formKey: text("form_key").notNull().unique(), // used in public URL and embed
  tierRequired: text("tier_required").notNull().default("standard"), // 'basic', 'standard', 'premium'
});

export const formSubmissions = pgTable("form_submissions", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").references(() => forms.id, { onDelete: 'cascade' }).notNull(),
  data: jsonb("data").notNull(), // Form field values
  submittedAt: timestamp("submitted_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
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
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  property: one(properties, {
    fields: [tasks.propertyId],
    references: [properties.id],
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

export const formsRelations = relations(forms, ({ many, one }) => ({
  submissions: many(formSubmissions),
  createdBy: one(users, {
    fields: [forms.createdBy],
    references: [users.id],
  }),
}));

export const formSubmissionsRelations = relations(formSubmissions, ({ one }) => ({
  form: one(forms, {
    fields: [formSubmissions.formId],
    references: [forms.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
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

export const insertFormSchema = createInsertSchema(forms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});



export const insertFormSubmissionSchema = createInsertSchema(formSubmissions).omit({
  id: true,
  submittedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type Community = typeof communities.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;
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
