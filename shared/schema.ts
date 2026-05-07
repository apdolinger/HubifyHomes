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
  date,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Photo attachment with before/after categorization
export type PhotoAttachment = {
  url: string;
  filename: string;
  category?: 'before' | 'after' | null;
};

// Form context types
export type FormContext = 'people' | 'property' | 'task' | 'multi';

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
  iCalFeedToken: varchar("ical_feed_token"), // Secret token for organization-wide iCal feed subscription
  billingWorkflowMode: varchar("billing_workflow_mode").$type<"automatic"|"require_authorization"|"manual">().default("manual"), // Billing submission workflow
  invoiceGroupingStrategy: varchar("invoice_grouping_strategy").$type<"client"|"property">().default("client"), // How to group submissions for consolidated invoicing
  completedTaskRetentionDays: integer("completed_task_retention_days").default(60), // Days before auto-archiving completed tasks
  cancelledTaskRetentionDays: integer("cancelled_task_retention_days").default(60), // Days before auto-archiving cancelled tasks
  notificationDefaults: jsonb("notification_defaults").$type<{
    taskOverdueHours?: number;       // Hours after due before sending overdue alert (default 0)
    inspectionDueDays?: number;      // Days before inspection due to notify (default 7)
    invoiceDueDays?: number;         // Days before invoice due to send reminder (default 3)
    calendarEventMinutes?: number;   // Minutes before event to send reminder (default 60)
    forceEnableAll?: boolean;        // Force-enable notifications for all users
  }>().default({}),
  supplyTypes: jsonb("supply_types").$type<string[]>().default(["lightbulb", "filter", "paint", "battery", "cleaning", "hardware", "electrical", "plumbing", "hvac", "other"]), // Customizable supply type categories
  supplyUnits: jsonb("supply_units").$type<string[]>().default(["piece", "gallon", "quart", "liter", "bottle", "box", "pack", "roll", "tube", "bag"]), // Customizable supply unit options
  defaultHourlyRateCents: integer("default_hourly_rate_cents"), // Organization-level default hourly rate (prepopulates client billing settings)
  invoiceTemplateId: varchar("invoice_template_id").$type<"modern"|"minimal"|"classic"|"compact"|"bold">().default("modern"), // Selected invoice template
  invoiceTemplatePrefs: jsonb("invoice_template_prefs").$type<Record<string, any>>().default({}), // Template-specific customization overrides
  
  // Company Profile fields
  address1: varchar("address_1"),
  address2: varchar("address_2"),
  city: varchar("city"),
  state: varchar("state"),
  zip: varchar("zip"),
  country: varchar("country").default("USA"),
  phone: varchar("phone"),
  website: varchar("website"),
  timezone: varchar("timezone").default("America/New_York"),
  currency: varchar("currency").default("USD"),
  primaryContact: varchar("primary_contact"), // Name of primary contact person
  industry: varchar("industry"), // Type of business (e.g., "Property Management", "HOA Management")

  // Per-org feature flag overrides — { flagKey: boolean }. Missing key = use feature_flags.defaultEnabled.
  featureFlags: jsonb("feature_flags").$type<Record<string, boolean>>().default({}),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Platform-wide feature flags (Super Admin owned)
export const featureFlags = pgTable("feature_flags", {
  key: varchar("key").primaryKey(), // canonical snake_case identifier
  displayName: varchar("display_name").notNull(),
  description: text("description"),
  defaultEnabled: boolean("default_enabled").notNull().default(false),
  beta: boolean("beta").notNull().default(false),
  category: varchar("category"), // optional grouping label
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organization subscriptions and tiers (Master Stripe billing)
export const orgSubscriptions = pgTable("org_subscriptions", {
  orgId: uuid("org_id").primaryKey().references(() => orgs.id),
  tier: text("tier").$type<"starter"|"pro"|"grow"|"enterprise">().notNull().default("starter"),
  features: jsonb("features").$type<Record<string, boolean>>().default({}),
  
  // Stripe master billing fields (Hubify billing organizations)
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  stripeProductId: varchar("stripe_product_id"),
  stripePriceId: varchar("stripe_price_id"),
  status: varchar("status").$type<"active"|"past_due"|"canceled"|"incomplete"|"trialing">().default("trialing"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  
  renewedAt: timestamp("renewed_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Per-organization Stripe connections (organizations connect their own Stripe accounts)
export const orgStripeConnections = pgTable("org_stripe_connections", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").references(() => orgs.id).notNull().unique(),
  
  // Stripe Connect Account ID (if using Stripe Connect)
  stripeAccountId: varchar("stripe_account_id"),
  
  // Direct API keys (alternative to Stripe Connect)
  stripePublishableKey: varchar("stripe_publishable_key"),
  stripeSecretKey: varchar("stripe_secret_key"), // Encrypted in production
  
  // Connection metadata
  accountType: varchar("account_type").$type<"connect"|"direct">().notNull().default("direct"),
  isActive: boolean("is_active").notNull().default(true),
  
  // Stripe Connect details (if using Connect)
  accessToken: varchar("access_token"), // Encrypted
  refreshToken: varchar("refresh_token"), // Encrypted
  scope: varchar("scope"),
  livemode: boolean("livemode").default(false),
  
  // Account capabilities and status
  chargesEnabled: boolean("charges_enabled").default(false),
  payoutsEnabled: boolean("payouts_enabled").default(false),
  detailsSubmitted: boolean("details_submitted").default(false),
  
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Stripe webhook events for tracking and idempotency
export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  id: serial("id").primaryKey(),
  stripeEventId: varchar("stripe_event_id").notNull().unique(), // Stripe's event ID
  
  // Master vs Org-level webhook
  eventSource: varchar("event_source").$type<"master"|"organization">().notNull(),
  orgId: uuid("org_id").references(() => orgs.id), // null for master events
  
  eventType: varchar("event_type").notNull(), // e.g., "customer.subscription.updated"
  eventData: jsonb("event_data").notNull(),
  
  processed: boolean("processed").default(false),
  processedAt: timestamp("processed_at"),
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("stripe_webhook_events_stripe_id_idx").on(table.stripeEventId),
  index("stripe_webhook_events_org_idx").on(table.orgId),
]);

// Platform invoices - Hubify billing organizations
export const platformInvoices = pgTable("platform_invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  
  // Source and Stripe linkage
  source: varchar("source").$type<"stripe"|"manual">().notNull().default("manual"),
  stripeInvoiceId: varchar("stripe_invoice_id"),
  
  // Invoice details
  invoiceNumber: varchar("invoice_number"),
  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency").notNull().default("usd"),
  status: varchar("status").$type<"draft"|"open"|"paid"|"void"|"uncollectible">().notNull().default("draft"),
  
  // Dates
  dueDate: timestamp("due_date"),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  
  // Links and storage
  hostedInvoiceUrl: text("hosted_invoice_url"),
  pdfStorageKey: text("pdf_storage_key"),
  
  // Additional info
  description: text("description"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("platform_invoices_org_status_idx").on(table.orgId, table.status),
  index("platform_invoices_stripe_id_idx").on(table.stripeInvoiceId),
]);

// Client invoices - Organizations billing their clients
export const clientInvoices = pgTable("client_invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  
  // Source and integration linkage
  source: varchar("source").$type<"stripe"|"manual">().notNull().default("manual"),
  stripeInvoiceId: varchar("stripe_invoice_id"),
  stripeCustomerId: varchar("stripe_customer_id"),
  quickbooksInvoiceId: varchar("quickbooks_invoice_id"), // QuickBooks Invoice ID when synced
  
  // Invoice details
  invoiceNumber: varchar("invoice_number"),
  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency").notNull().default("usd"),
  status: varchar("status").$type<"draft"|"open"|"paid"|"void"|"uncollectible">().notNull().default("draft"),
  
  // Payment tracking
  paymentStatus: varchar("payment_status").$type<"pending"|"processing"|"succeeded"|"failed"|"refunded">(),
  paymentMethod: varchar("payment_method"), // card, bank_transfer, ach, etc.
  paymentDate: timestamp("payment_date"),
  paymentError: text("payment_error"), // Decline reason or error message
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  
  // Auto-charge tracking
  autoChargeAttemptedAt: timestamp("auto_charge_attempted_at"),
  attemptNumber: integer("attempt_number").default(0),
  lastAttemptError: text("last_attempt_error"),
  paidViaPaymentMethodId: uuid("paid_via_payment_method_id"),
  
  // Dates
  dueDate: timestamp("due_date"),
  issuedAt: timestamp("issued_at"),
  sentAt: timestamp("sent_at"), // When invoice was sent to client
  
  // Payment receipt details (populated from Stripe charge on success)
  receiptUrl: text("receipt_url"),
  paymentMethodBrand: varchar("payment_method_brand"),
  paymentMethodLast4: varchar("payment_method_last4"),

  // Links and storage
  hostedInvoiceUrl: text("hosted_invoice_url"),
  pdfStorageKey: text("pdf_storage_key"),
  
  // Additional info
  description: text("description"),
  lineItems: jsonb("line_items").$type<Array<{
    description: string;
    quantity: number;
    unitAmountCents: number;
    totalCents: number;
  }>>().default([]),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  attachments: jsonb("attachments").$type<PhotoAttachment[]>().default([]),
  customFieldValues: jsonb("custom_field_values").$type<Record<string, any>>().default({}),
  
  // Creator tracking
  createdBy: varchar("created_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("client_invoices_org_status_idx").on(table.orgId, table.status),
  index("client_invoices_org_client_idx").on(table.orgId, table.clientId),
  index("client_invoices_stripe_id_idx").on(table.stripeInvoiceId),
]);

// QuickBooks Online connections - per-organization OAuth integration
export const quickbooksConnections = pgTable("quickbooks_connections", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").references(() => orgs.id).notNull().unique(),
  
  // OAuth 2.0 credentials
  accessToken: text("access_token").notNull(), // Encrypted in production
  refreshToken: text("refresh_token").notNull(), // Encrypted in production
  realmId: varchar("realm_id").notNull(), // QuickBooks Company ID
  
  // Token expiry tracking
  accessTokenExpiresAt: timestamp("access_token_expires_at").notNull(),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at").notNull(),
  
  // Connection metadata
  companyName: varchar("company_name"),
  isActive: boolean("is_active").notNull().default(true),
  isProduction: boolean("is_production").notNull().default(false), // Sandbox vs production
  
  // Sync settings
  autoSyncInvoices: boolean("auto_sync_invoices").notNull().default(false),
  autoSyncCustomers: boolean("auto_sync_customers").notNull().default(false),
  autoSyncPayments: boolean("auto_sync_payments").notNull().default(false),
  
  // Last sync tracking
  lastInvoiceSyncAt: timestamp("last_invoice_sync_at"),
  lastCustomerSyncAt: timestamp("last_customer_sync_at"),
  lastPaymentSyncAt: timestamp("last_payment_sync_at"),
  
  // Error tracking
  lastError: text("last_error"),
  lastErrorAt: timestamp("last_error_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("quickbooks_connections_org_idx").on(table.orgId),
  index("quickbooks_connections_realm_idx").on(table.realmId),
]);

// QuickBooks sync log - track individual sync operations
export const quickbooksSyncLogs = pgTable("quickbooks_sync_logs", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  connectionId: integer("connection_id").references(() => quickbooksConnections.id).notNull(),
  
  // Sync details
  syncType: varchar("sync_type").$type<"invoice"|"customer"|"payment">().notNull(),
  direction: varchar("direction").$type<"to_quickbooks"|"from_quickbooks">().notNull(),
  status: varchar("status").$type<"success"|"failed"|"partial">().notNull(),
  
  // Records processed
  recordsProcessed: integer("records_processed").notNull().default(0),
  recordsSucceeded: integer("records_succeeded").notNull().default(0),
  recordsFailed: integer("records_failed").notNull().default(0),
  
  // Error details
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details").$type<Record<string, any>>().default({}),
  
  // Duration
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("quickbooks_sync_logs_org_idx").on(table.orgId),
  index("quickbooks_sync_logs_connection_idx").on(table.connectionId),
  index("quickbooks_sync_logs_status_idx").on(table.status),
]);

// Clients table for property tenants/owners
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  contactId: integer("contact_id").references(() => contacts.id, { onDelete: "cascade" }), // Link to contact record
  email: varchar("email").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: varchar("phone"),
  isActive: boolean("is_active").notNull().default(true),
  
  // Billing configuration
  billingEnabled: boolean("billing_enabled").notNull().default(false),
  billingTypes: jsonb("billing_types").$type<{
    recurringCharges: boolean;
    hourlyTime: boolean;
    taskBased: boolean;
  }>().default({ recurringCharges: false, hourlyTime: false, taskBased: false }),
  invoiceFrequency: varchar("invoice_frequency").$type<"weekly"|"biweekly"|"monthly"|"on_completion"|"manual">().default("monthly"),
  billingDay: integer("billing_day"), // Day of week (0-6) for weekly/biweekly
  billingDayOfMonth: integer("billing_day_of_month"), // Day of month (1-28) for monthly billing
  lastInvoiceDate: timestamp("last_invoice_date"), // Last time an invoice was generated for batching
  autoSendInvoices: boolean("auto_send_invoices").notNull().default(false), // Automatically send invoices when generated
  billingWorkflow: varchar("billing_workflow").$type<"auto"|"review">().notNull().default("review"),
  defaultHourlyRateCents: integer("default_hourly_rate_cents"),
  invoiceDeliveryMethod: varchar("invoice_delivery_method").$type<"email"|"sms"|"both">().default("email"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueOrgEmail: unique().on(table.orgId, table.email),
  contactIdIdx: index("clients_contact_id_idx").on(table.contactId),
}));

// Client payment methods - Stripe payment method tokens for auto-charging
export const clientPaymentMethods = pgTable("client_payment_methods", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  addedByContactId: integer("added_by_contact_id").references(() => contacts.id), // Track which contact added this method
  
  // Stripe payment method
  stripePaymentMethodId: varchar("stripe_payment_method_id").notNull(),
  type: varchar("type").$type<"card"|"us_bank_account">().notNull(),
  
  // Display metadata
  brand: varchar("brand"), // "Visa", "Mastercard", or bank name
  last4: varchar("last4").notNull(),
  expMonth: integer("exp_month"), // For cards
  expYear: integer("exp_year"), // For cards
  
  // Status and default
  isDefault: boolean("is_default").notNull().default(false),
  status: varchar("status").$type<"active"|"requires_verification"|"inactive">().notNull().default("active"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("client_payment_methods_client_idx").on(table.clientId),
  index("client_payment_methods_stripe_pm_idx").on(table.stripePaymentMethodId),
  index("client_payment_methods_added_by_idx").on(table.addedByContactId),
]);

// Payment collection tokens - Secure one-time links for clients to add payment methods
export const paymentCollectionTokens = pgTable("payment_collection_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  token: varchar("token").notNull().unique(),
  
  // Token metadata
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  isUsed: boolean("is_used").notNull().default(false),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("payment_collection_tokens_client_idx").on(table.clientId),
  index("payment_collection_tokens_token_idx").on(table.token),
  index("payment_collection_tokens_expires_idx").on(table.expiresAt),
]);

// Client billing preferences - Auto-charge settings and policies
export const clientBillingPrefs = pgTable("client_billing_prefs", {
  clientId: uuid("client_id").primaryKey().references(() => clients.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  
  // Auto-charge settings
  autoChargeInvoices: boolean("auto_charge_invoices").notNull().default(true),
  autoChargeTiming: varchar("auto_charge_timing").$type<"on_issue"|"on_due"|"1_day_after"|"3_days_after">().notNull().default("on_due"),
  
  // Retry strategy (JSON array of days to retry: [3, 5, 7])
  retryStrategy: jsonb("retry_strategy").$type<number[]>().default([3, 5, 7]),
  
  // Notification preferences
  emailReceipts: boolean("email_receipts").notNull().default(true),
  notifyFailedPayment: boolean("notify_failed_payment").notNull().default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Recurring billing schedules - for scheduled recurring charges
export const recurringBillingSchedules = pgTable("recurring_billing_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  
  description: text("description").notNull(),
  amountCents: integer("amount_cents").notNull(),
  frequency: varchar("frequency").$type<"weekly"|"biweekly"|"monthly">().notNull(),
  
  // Schedule tracking
  nextBillingDate: timestamp("next_billing_date").notNull(),
  lastBilledAt: timestamp("last_billed_at"),
  isActive: boolean("is_active").notNull().default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("recurring_billing_org_client_idx").on(table.orgId, table.clientId),
  index("recurring_billing_next_date_idx").on(table.nextBillingDate),
]);

// Billing submissions - tracks completed work awaiting authorization
export const billingSubmissions = pgTable("billing_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  
  // Source tracking
  sourceType: varchar("source_type").$type<"task"|"time_entry"|"recurring_charge">().notNull(),
  sourceId: varchar("source_id").notNull(), // References the task ID, time entry ID, or recurring schedule ID
  
  // Billing details
  description: text("description").notNull(),
  amountCents: integer("amount_cents").notNull(),
  quantity: integer("quantity").notNull().default(1),
  
  // Rich content from source task/work
  notes: text("notes"),
  attachments: jsonb("attachments").$type<PhotoAttachment[]>().default([]),
  
  // Itemized line items for receipt-style billing
  lineItems: jsonb("line_items").$type<Array<{
    id: string,
    description: string,
    quantity: number,
    rateCents: number,
    amountCents: number,
    type: "task" | "time_entry" | "material" | "other"
  }>>().default([]),
  
  // Workflow status
  status: varchar("status").$type<"pending"|"authorized"|"rejected"|"invoiced">().notNull().default("pending"),
  authorizedBy: varchar("authorized_by").references(() => users.id),
  authorizedAt: timestamp("authorized_at"),
  rejectionReason: text("rejection_reason"),
  invoiceId: uuid("invoice_id").references(() => clientInvoices.id),
  
  // Metadata
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("billing_submissions_org_client_idx").on(table.orgId, table.clientId),
  index("billing_submissions_status_idx").on(table.status),
  index("billing_submissions_invoice_idx").on(table.invoiceId),
]);

// Portal users table - for Hubify Portal (Staff, Vendors)
export const portalUsers = pgTable("portal_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  email: varchar("email").notNull(),
  passwordHash: varchar("password_hash").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: varchar("phone"),
  role: varchar("role").$type<"staff"|"vendor">().notNull(),
  profileImageUrl: varchar("profile_image_url"),
  isActive: boolean("is_active").notNull().default(true),
  emailVerified: boolean("email_verified").notNull().default(false),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  lastLoginAt: timestamp("last_login_at"),
  emailInvoiceReminders: boolean("email_invoice_reminders").notNull().default(true), // Portal user can opt out of invoice reminder emails
  emailInspectionReminders: boolean("email_inspection_reminders").notNull().default(true), // Portal user can opt out of inspection reminder emails
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueOrgEmail: unique().on(table.orgId, table.email),
}));

// Portal user property associations
export const portalUserProperties = pgTable("portal_user_properties", {
  id: serial("id").primaryKey(),
  portalUserId: uuid("portal_user_id").references(() => portalUsers.id, { onDelete: "cascade" }).notNull(),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull(),
  relationship: varchar("relationship").$type<"resident"|"owner"|"staff"|"vendor"|"emergency_contact">(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("portal_user_properties_user_idx").on(table.portalUserId),
  index("portal_user_properties_property_idx").on(table.propertyId),
]);

// Portal sessions for authentication
export const portalSessions = pgTable("portal_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  portalUserId: uuid("portal_user_id").references(() => portalUsers.id, { onDelete: "cascade" }).notNull(),
  token: varchar("token").notNull().unique(),
  deviceInfo: jsonb("device_info").$type<{
    userAgent?: string;
    deviceType?: string;
    browser?: string;
    os?: string;
  }>(),
  ipAddress: varchar("ip_address"),
  isActive: boolean("is_active").notNull().default(true),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("portal_sessions_user_idx").on(table.portalUserId),
  index("portal_sessions_token_idx").on(table.token),
  index("portal_sessions_expires_idx").on(table.expiresAt),
]);

// Portal invitations for secure registration
export const portalInvitations = pgTable("portal_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => orgs.id, { onDelete: "cascade" }).notNull(),
  token: varchar("token").notNull().unique(),
  email: varchar("email").notNull(),
  role: varchar("role").$type<"staff"|"vendor">().notNull(),
  propertyIds: text("property_ids").array().$type<string[]>(),
  createdByUserId: varchar("created_by_user_id").references(() => users.id).notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("portal_invitations_token_idx").on(table.token),
  index("portal_invitations_org_idx").on(table.orgId),
  index("portal_invitations_email_idx").on(table.email),
]);

// Password reset tokens for account recovery
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: varchar("token").notNull().unique(),
  email: varchar("email").notNull(),
  userType: varchar("user_type").$type<"portal_user"|"super_admin">().notNull(),
  portalUserId: uuid("portal_user_id").references(() => portalUsers.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").references(() => orgs.id, { onDelete: "cascade" }),
  isUsed: boolean("is_used").notNull().default(false),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("password_reset_token_idx").on(table.token),
  index("password_reset_email_idx").on(table.email),
  index("password_reset_expires_idx").on(table.expiresAt),
]);

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

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
  supervisorId: varchar("supervisor_id").references(() => users.id), // Reports to this supervisor
  isAdminAccount: boolean("is_admin_account").notNull().default(false), // For least privilege: separate admin accounts
  hasHrPermissions: boolean("has_hr_permissions").notNull().default(false), // Can view/edit HR-related sections
  isActive: boolean("is_active").notNull().default(true),
  lastActiveAt: timestamp("last_active_at"),
  iCalFeedToken: varchar("ical_feed_token"), // Secret token for personal iCal feed subscription
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Out-of-office periods for team members
export const outOfOfficePeriods = pgTable("out_of_office_periods", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reason: text("reason"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("out_of_office_user_idx").on(table.userId),
  index("out_of_office_org_idx").on(table.orgId),
  index("out_of_office_dates_idx").on(table.startDate, table.endDate),
]);

// Teams for managing team assignments
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => orgs.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("teams_org_idx").on(table.orgId),
  index("teams_created_by_idx").on(table.createdBy),
]);

// Team members junction table
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role").$type<"lead"|"member">().notNull().default("member"),
  assignedAt: timestamp("assigned_at").defaultNow(),
}, (table) => [
  index("team_members_team_idx").on(table.teamId),
  index("team_members_user_idx").on(table.userId),
  unique("team_members_unique").on(table.teamId, table.userId),
]);

// Management notes for employee performance tracking
export const managementNotes = pgTable("management_notes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(), // Employee the note is about
  authorId: varchar("author_id").references(() => users.id).notNull(), // Who wrote the note
  orgId: uuid("org_id").references(() => orgs.id, { onDelete: "cascade" }).notNull(),
  noteText: text("note_text").notNull(),
  isEdited: boolean("is_edited").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("management_notes_user_idx").on(table.userId),
  index("management_notes_author_idx").on(table.authorId),
  index("management_notes_org_idx").on(table.orgId),
  index("management_notes_created_idx").on(table.createdAt),
]);

// Communities table
export const communities = pgTable("communities", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  address1: varchar("address1"),
  address2: varchar("address2"),
  city: varchar("city"),
  state: varchar("state"),
  zip: varchar("zip"),
  phone: varchar("phone"),
  email: varchar("email"),
  website: varchar("website"),
  imageUrl: varchar("image_url"),
  managerId: varchar("manager_id").references(() => users.id),
  hoaPresidentId: varchar("hoa_president_id").references(() => users.id),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  // Overview section
  gateCode: varchar("gate_code"),
  propertyManagerName: varchar("property_manager_name"),
  emergencyContact: varchar("emergency_contact"),
  emergencyContactPhone: varchar("emergency_contact_phone"),
  emergencyContactEmail: varchar("emergency_contact_email"),
  hoaMailingAddress: text("hoa_mailing_address"),
  // Rules section
  rentalRestrictions: text("rental_restrictions"),
  petPolicy: text("pet_policy"),
  parkingRules: text("parking_rules"),
  noiseRestrictions: text("noise_restrictions"),
  vendorAccessProcedures: text("vendor_access_procedures"),
  // Schedule section
  trashRecyclingPickup: varchar("trash_recycling_pickup"),
  bulkTrash: varchar("bulk_trash"),
  landscapeMaintenance: varchar("landscape_maintenance"),
  communityEvents: text("community_events"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document Templates table - Reusable documents that can be linked to multiple communities
export const documentTemplates = pgTable("document_templates", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  name: varchar("name").notNull(), // Template name (e.g., "Standard HOA Declaration", "Welcome Packet 2024")
  description: text("description"), // Optional description of the document
  documentType: varchar("document_type").notNull(), // 'hoa_declarations', 'ccrs_bylaws', 'community_faq', 'welcome_packet', 'other'
  fileUrl: varchar("file_url").notNull(),
  fileName: varchar("file_name").notNull(),
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  isActive: boolean("is_active").notNull().default(true), // Can be deactivated without deleting
}, (table) => [
  index("document_templates_org_idx").on(table.orgId),
  index("document_templates_type_idx").on(table.documentType),
]);

// Community Documents table
export const communityDocuments = pgTable("community_documents", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id").references(() => communities.id, { onDelete: "cascade" }).notNull(),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: "cascade" }), // Null for community-wide documents
  documentType: varchar("document_type").notNull(), // 'hoa_declarations', 'ccrs_bylaws', 'community_faq', 'welcome_packet'
  classification: varchar("classification").notNull().$type<"community-wide"|"residential-based">(), // 'community-wide' or 'residential-based'
  fileUrl: varchar("file_url").notNull(),
  fileName: varchar("file_name").notNull(),
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  templateId: integer("template_id").references(() => documentTemplates.id, { onDelete: "set null" }), // Link to template if document was created from a template
}, (table) => [
  index("community_docs_community_idx").on(table.communityId),
  index("community_docs_property_idx").on(table.propertyId),
  index("community_docs_template_idx").on(table.templateId),
]);

// System Alerts table - for system-wide or targeted user alerts (blocking modal)
export const systemAlerts = pgTable("system_alerts", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  severity: varchar("severity").notNull().$type<"info"|"warning"|"critical">(), // info, warning, critical
  isActive: boolean("is_active").notNull().default(true),
  targetType: varchar("target_type").notNull().$type<"all"|"roles"|"users">(), // all, roles, users
  targetRoles: text("target_roles").array(), // Array of role names if targetType is 'roles'
  targetUserIds: text("target_user_ids").array(), // Array of user IDs if targetType is 'users'
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  expiresAt: timestamp("expires_at"), // Optional expiration date
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("system_alerts_org_idx").on(table.orgId),
  index("system_alerts_active_idx").on(table.isActive),
]);

// System Alert Acknowledgements table - tracks which users have acknowledged which system alerts
export const systemAlertAcknowledgements = pgTable("system_alert_acknowledgements", {
  id: serial("id").primaryKey(),
  alertId: integer("alert_id").references(() => systemAlerts.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  acknowledgedAt: timestamp("acknowledged_at").defaultNow().notNull(),
}, (table) => [
  index("system_alert_ack_alert_idx").on(table.alertId),
  index("system_alert_ack_user_idx").on(table.userId),
  // Unique constraint to prevent duplicate acknowledgements
  index("system_alert_ack_unique_idx").on(table.alertId, table.userId),
]);

// Platform-wide settings (Super Admin) - simple key/value JSONB store
export const platformSettings = pgTable("platform_settings", {
  key: varchar("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

// Platform-wide alerts authored by Super Admin (separate from per-org system_alerts)
export const platformAlerts = pgTable("platform_alerts", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  severity: varchar("severity").notNull().$type<"info" | "warning" | "critical" | "success">().default("info"),
  isActive: boolean("is_active").notNull().default(true),
  // Empty/null targetOrgIds = all orgs; otherwise restrict to listed orgs
  targetOrgIds: text("target_org_ids").array(),
  // Empty/null targetRoles = all roles; otherwise restrict to listed roles (admin, manager, staff, etc.)
  targetRoles: text("target_roles").array(),
  // Optional page/location filter (e.g. "all", "dashboard", "properties", ...)
  location: varchar("location").default("all"),
  requireAck: boolean("require_ack").notNull().default(true),
  showOncePerSession: boolean("show_once_per_session").notNull().default(false),
  actionLabel: varchar("action_label"),
  actionUrl: text("action_url"),
  startsAt: timestamp("starts_at"),
  expiresAt: timestamp("expires_at"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("platform_alerts_active_idx").on(table.isActive),
]);

export const platformAlertAcknowledgements = pgTable("platform_alert_acknowledgements", {
  id: serial("id").primaryKey(),
  alertId: integer("alert_id").references(() => platformAlerts.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  acknowledgedAt: timestamp("acknowledged_at").defaultNow().notNull(),
}, (table) => [
  index("platform_alert_ack_alert_idx").on(table.alertId),
  index("platform_alert_ack_user_idx").on(table.userId),
  index("platform_alert_ack_unique_idx").on(table.alertId, table.userId),
]);

// Properties table
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  accountId: varchar("account_id"), // External account/reference ID for company tracking
  name: varchar("name").notNull(),
  address1: varchar("address1").notNull(),
  address2: varchar("address2"),
  city: varchar("city").notNull(),
  state: varchar("state").notNull(),
  zip: varchar("zip").notNull(),
  type: varchar("type").notNull(), // single-family, condo, apartment, house, commercial, storage_unit (premium), boat (premium)
  units: integer("units").default(1),
  managerId: varchar("manager_id").references(() => users.id),
  primaryContactId: integer("primary_contact_id").references(() => contacts.id), // Primary contact/client for this property
  description: text("description"), // Property description/notes
  isActive: boolean("is_active").notNull().default(true),
  imageUrl: varchar("image_url"),
  squareFootage: integer("square_footage"),
  billingType: varchar("billing_type"), // sqft, flat_fee
  status: varchar("status").notNull().default("occupied"), // occupied, vacant, under_repair
  communityId: integer("community_id").references(() => communities.id),
  customFieldValues: jsonb("custom_field_values").$type<Record<string, any>>().default({}), // Custom field data
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
  odometer: integer("odometer"), // Current mileage/hours
  registrationDate: timestamp("registration_date"), // When registration was last completed
  registrationDueDate: timestamp("registration_due_date"), // When registration renewal is due
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

// Vehicle Photos table
export const vehiclePhotos = pgTable("vehicle_photos", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id, { onDelete: "cascade" }).notNull(),
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  url: varchar("url").notNull(),
  description: text("description"),
  category: varchar("category").default("general"), // general, damage, before, after, repair, insurance, etc.
  uploadedById: varchar("uploaded_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Room Supplies table
export const roomSupplies = pgTable("room_supplies", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => rooms.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // 'lightbulb', 'filter', 'paint', 'battery', 'cleaning', 'hardware', 'electrical', 'plumbing', 'hvac', 'other'
  brand: varchar("brand"),
  model: varchar("model"),
  quantity: integer("quantity").default(1),
  unit: varchar("unit"), // 'piece', 'gallon', 'quart', 'liter', 'bottle', 'box', 'pack', 'roll', 'tube', 'bag'
  location: varchar("location"),
  purchaseUrl: varchar("purchase_url"), // hyperlink for future purchases
  lastChanged: date("last_changed"),
  nextReplacement: date("next_replacement"),
  notes: text("notes"),
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
  link: varchar("link"), // Product page, manual URL, or related resource link
  locationInRoom: varchar("location_in_room"), // e.g. "On west wall", "Mounted above bed"
  installDate: timestamp("install_date"),
  lastServiced: timestamp("last_serviced"),
  requiresServicing: boolean("requires_servicing").default(false),
  serviceInterval: integer("service_interval"), // e.g. 3, 6, 12
  serviceIntervalUnit: varchar("service_interval_unit"), // 'days', 'weeks', 'months', 'years'
  nextServiceDue: timestamp("next_service_due"),
  notes: text("notes"), // Troubleshooting tips, remote control info, special access notes
  hasWarranty: boolean("has_warranty").default(false),
  warrantyStartDate: timestamp("warranty_start_date"),
  warrantyEndDate: timestamp("warranty_end_date"),
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

// Room surface links table for storing URLs related to surfaces (purchasing, product pages, etc.)
export const roomSurfaceLinks = pgTable("room_surface_links", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => rooms.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name").notNull(), // e.g. "Oak Flooring Purchase", "Paint Product Page"
  url: varchar("url").notNull(), // The actual link
  surfaceCategory: varchar("surface_category").notNull(), // 'flooring', 'wall', 'ceiling', 'countertop', 'trim', 'tile', 'cabinet', 'fixture', 'other'
  notes: text("notes"), // Optional additional information
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

// Property Access Items table - Stores access control information like WiFi, codes, etc.
export const propertyAccessItems = pgTable("property_access_items", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull(),
  category: varchar("category").notNull(), // 'wifi', 'alarm', 'door', 'garage', 'gate', 'other'
  description: varchar("description").notNull(), // e.g. "Front Door", "Main WiFi Network", "Alarm Panel"
  value: varchar("value").notNull(), // Code, password, or key information
  notes: text("notes"), // Additional details or instructions
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
  vendorId: integer("vendor_id").references(() => contacts.id), // References vendor in contacts table
  vendorNeeded: boolean("vendor_needed").notNull().default(false), // Toggle to show/hide vendor section
  vendorSatisfactionRating: integer("vendor_satisfaction_rating"), // 1-5 stars rating for vendor work
  vendorNotes: text("vendor_notes"), // Notes about vendor work, estimates, or details
  clientId: uuid("client_id").references(() => clients.id), // Billable client reference for billing submissions
  assignedToId: varchar("assigned_to_id").references(() => users.id),
  assignedById: varchar("assigned_by_id").references(() => users.id),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  timeEstimate: varchar("time_estimate"), // e.g., "1 days 2 hours 30 minutes"
  category: varchar("category"), // maintenance, inspection, cleaning, repair, administrative
  isRecurring: boolean("is_recurring").notNull().default(false), // Legacy field, keep for backward compatibility
  recurrenceFrequency: varchar("recurrence_frequency"), // Legacy field, keep for backward compatibility
  recurrenceRule: text("recurrence_rule"), // RFC5545 RRULE string for recurring tasks
  recurrenceExDates: text("recurrence_ex_dates").array(), // Exception dates for recurring tasks
  isTemplate: boolean("is_template").notNull().default(false), // True if this is a recurring task template
  templateTaskId: integer("template_task_id").references((): any => tasks.id, { onDelete: "set null" }), // Links instance to template
  instanceDate: timestamp("instance_date"), // Specific date this instance is for
  billedSeparately: boolean("billed_separately").notNull().default(false),
  billingAmount: varchar("billing_amount"), // dollar amount as string, e.g., "125.00"
  billableRateCents: integer("billable_rate_cents"), // Hourly billable rate in cents for time tracking
  isArchived: boolean("is_archived").notNull().default(false),
  attachments: jsonb("attachments").$type<PhotoAttachment[]>().default([]),
  tags: text("tags"), // Comma-separated tags, e.g., "urgent, maintenance, inspection"
  customFieldValues: jsonb("custom_field_values").$type<Record<string, any>>().default({}), // Custom field data
  inspectionScheduleId: integer("inspection_schedule_id"), // Links to inspection_schedules.id when auto-generated
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Time Entries table - for clock in/out and time tracking
export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  propertyId: integer("property_id").references(() => properties.id),
  taskId: integer("task_id").references(() => tasks.id),
  clockIn: timestamp("clock_in").notNull(),
  clockOut: timestamp("clock_out"), // null when currently clocked in
  notes: text("notes"),
  billableRateCents: integer("billable_rate_cents"), // Hourly rate in cents, overrides task rate if set
  isBillable: boolean("is_billable").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("time_entries_org_user_idx").on(table.orgId, table.userId),
  index("time_entries_property_idx").on(table.propertyId),
  index("time_entries_task_idx").on(table.taskId),
]);

// Contacts/People table
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  accountId: varchar("account_id"), // External account/reference ID for company tracking
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  type: varchar("type").notNull(), // tenant, owner, vendor, emergency_contact, client
  clientCategory: varchar("client_category"), // primary, secondary (only used when type is 'client')
  vendorCategory: varchar("vendor_category").$type<"organization"|"individual">(), // organization, individual (only used when type is 'vendor')
  vendorType: varchar("vendor_type"), // HVAC, Electrician, Security, Other (only used when type is 'vendor')
  vendorTypeOther: varchar("vendor_type_other"), // Custom vendor type when vendorType is 'Other'
  propertyId: integer("property_id").references(() => properties.id),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  customFieldValues: jsonb("custom_field_values").$type<Record<string, any>>().default({}), // Custom field data
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

// Vendor Employees table - track employees for vendor organizations
export const vendorEmployees = pgTable("vendor_employees", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").references(() => contacts.id, { onDelete: "cascade" }).notNull(), // References vendor in contacts table
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  position: varchar("position"), // Job title/role
  email: varchar("email"),
  phone: varchar("phone"),
  notes: text("notes"), // Organization's notes about this employee
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("vendor_employees_vendor_idx").on(table.vendorId),
  index("vendor_employees_org_idx").on(table.orgId),
]);

// Property Vendors junction table - track preferred vendors for each property
export const propertyVendors = pgTable("property_vendors", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull(),
  vendorId: integer("vendor_id").references(() => contacts.id, { onDelete: "cascade" }).notNull(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  notes: text("notes"), // Special instructions or preferences for this vendor on this property
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("property_vendors_property_idx").on(table.propertyId),
  index("property_vendors_vendor_idx").on(table.vendorId),
  index("property_vendors_org_idx").on(table.orgId),
  unique("property_vendors_unique").on(table.propertyId, table.vendorId), // Prevent duplicate vendor assignments
]);

// Custom Fields table - user-defined fields for tasks, properties, and contacts
export const customFields = pgTable("custom_fields", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  entityType: varchar("entity_type").$type<"task"|"property"|"contact"|"invoice">().notNull(), // Which entity this field applies to
  fieldName: varchar("field_name").notNull(), // Display label for the field
  fieldKey: varchar("field_key").notNull(), // Unique key for storing values (auto-generated from fieldName)
  fieldType: varchar("field_type").$type<"text"|"textarea"|"number"|"date"|"select"|"multiselect"|"checkbox">().notNull(),
  required: boolean("required").notNull().default(false),
  options: jsonb("options").$type<string[]>(), // For select/multiselect field types
  placeholder: varchar("placeholder"), // Placeholder text for input fields
  helpText: text("help_text"), // Help text displayed below the field
  displayOrder: integer("display_order").notNull().default(0), // Order in which fields appear
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("custom_fields_org_entity_idx").on(table.orgId, table.entityType),
  index("custom_fields_key_idx").on(table.fieldKey),
  unique("custom_fields_org_entity_key_unique").on(table.orgId, table.entityType, table.fieldKey),
]);

// Alerts table - contextual alerts for clients, properties, and tasks
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  type: varchar("type").$type<"client"|"property"|"task">().notNull(),
  entityId: integer("entity_id").notNull(), // ID of the client/property/task
  message: text("message").notNull(),
  severity: varchar("severity").$type<"info"|"warning"|"critical">().notNull().default("info"),
  isActive: boolean("is_active").notNull().default(true),
  targetType: varchar("target_type").$type<"all"|"roles"|"users">().notNull().default("all"), // all, roles, users
  targetRoles: text("target_roles").array(), // Array of role names if targetType is 'roles'
  targetUserIds: text("target_user_ids").array(), // Array of user IDs if targetType is 'users'
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("alerts_org_idx").on(table.orgId),
  index("alerts_type_entity_idx").on(table.type, table.entityId),
]);

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

// Message Mentions table - tracks @mentions in messages
export const messageMentions = pgTable("message_mentions", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => teamMessages.id, { onDelete: 'cascade' }).notNull(),
  mentionedUserId: varchar("mentioned_user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("message_mentions_message_idx").on(table.messageId),
  index("message_mentions_user_idx").on(table.mentionedUserId),
  index("message_mentions_unread_idx").on(table.mentionedUserId, table.isRead),
]);

// User Notification Preferences table
export const userNotificationPreferences = pgTable("user_notification_preferences", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: 'cascade' }).notNull(),
  emailOnMention: boolean("email_on_mention").notNull().default(true),
  emailOnReply: boolean("email_on_reply").notNull().default(true),
  emailOnReaction: boolean("email_on_reaction").notNull().default(false),
  emailOnBroadcast: boolean("email_on_broadcast").notNull().default(true),
  emailOnTaskAssigned: boolean("email_on_task_assigned").notNull().default(true),
  emailOnTaskOverdue: boolean("email_on_task_overdue").notNull().default(true),
  emailOnInspectionDue: boolean("email_on_inspection_due").notNull().default(true),
  emailOnInvoiceDue: boolean("email_on_invoice_due").notNull().default(true),
  emailOnCalendarEvent: boolean("email_on_calendar_event").notNull().default(true),
  inAppEnabled: boolean("in_app_enabled").notNull().default(true),
  // Mobile push delivery opt-in (gated by mobile_push_notifications feature flag).
  pushNotificationsEnabled: boolean("push_notifications_enabled").notNull().default(false),
  // Per-user advance notice windows (null = use org default)
  taskOverdueHoursOffset: integer("task_overdue_hours_offset"),
  inspectionAdvanceDays: integer("inspection_advance_days"),
  invoiceAdvanceDays: integer("invoice_advance_days"),
  calendarAdvanceMinutes: integer("calendar_advance_minutes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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

// Security Audit Logs - Comprehensive admin action tracking for compliance
export const securityAuditLogs = pgTable("security_audit_logs", {
  id: serial("id").primaryKey(),
  
  // Actor (who performed the action)
  userId: varchar("user_id").references(() => users.id),
  userEmail: varchar("user_email"),
  userRole: varchar("user_role"),
  
  // Organization context (multi-tenant)
  orgId: uuid("org_id").references(() => orgs.id),
  
  // Action details
  action: varchar("action").notNull(), // login, logout, create, update, delete, export, etc.
  actionType: varchar("action_type").$type<"read"|"create"|"update"|"delete"|"auth"|"admin">().notNull(),
  resource: varchar("resource").notNull(), // users, properties, invoices, settings, etc.
  resourceId: varchar("resource_id"), // ID of the affected resource
  
  // Request context
  method: varchar("method"), // GET, POST, PUT, DELETE
  endpoint: varchar("endpoint"), // /api/admin/users, etc.
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id"),
  
  // Change tracking
  changes: jsonb("changes").$type<{
    before?: Record<string, any>;
    after?: Record<string, any>;
  }>(),
  
  // Additional metadata
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  
  // Security classification
  severity: varchar("severity").$type<"info"|"warning"|"critical">().notNull().default("info"),
  
  // Result
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
  
  // Timestamp (immutable)
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("security_audit_logs_user_idx").on(table.userId),
  index("security_audit_logs_org_idx").on(table.orgId),
  index("security_audit_logs_action_idx").on(table.action),
  index("security_audit_logs_created_idx").on(table.createdAt),
  index("security_audit_logs_severity_idx").on(table.severity),
]);

// MFA (Two-Factor Authentication) tracking
export const userMfaSettings = pgTable("user_mfa_settings", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  
  // MFA status
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  mfaMethod: varchar("mfa_method").$type<"totp"|"sms"|"email"|"hardware">(),
  
  // TOTP (Time-based One-Time Password) secret
  totpSecret: varchar("totp_secret"), // Encrypted
  
  // Backup codes (encrypted, hashed)
  backupCodes: text("backup_codes").array(),
  
  // Last verification
  lastVerifiedAt: timestamp("last_verified_at"),
  
  // Timestamps
  enabledAt: timestamp("enabled_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin IP Allowlist - controls which IPs can access admin functions
export const adminIpAllowlist = pgTable("admin_ip_allowlist", {
  id: serial("id").primaryKey(),
  
  ipAddress: varchar("ip_address").notNull().unique(),
  ipRange: varchar("ip_range"), // CIDR notation, e.g., "192.168.1.0/24"
  
  description: text("description"), // e.g., "Office HQ", "VPN Gateway"
  
  isActive: boolean("is_active").notNull().default(true),
  
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("admin_ip_allowlist_active_idx").on(table.isActive),
]);

// User session tracking - for concurrent session limits and monitoring
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  
  userId: varchar("user_id").references(() => users.id).notNull(),
  sessionId: varchar("session_id").notNull().unique(), // From express-session
  
  // Session metadata
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  deviceFingerprint: varchar("device_fingerprint"),
  
  // Location (optional)
  country: varchar("country"),
  city: varchar("city"),
  
  // Session state
  isActive: boolean("is_active").notNull().default(true),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => [
  index("user_sessions_user_idx").on(table.userId),
  index("user_sessions_active_idx").on(table.isActive),
  index("user_sessions_expires_idx").on(table.expiresAt),
]);

// Advanced Forms Library (organization creates; client sees/uses)
export const forms = pgTable("forms", {
  id: serial("id").primaryKey(),
  formTitle: text("form_title").notNull(),
  slug: text("slug").notNull().unique(),
  contexts: text("contexts").array().notNull(), // ['people', 'property', 'task']
  description: text("description"), // Internal description/notes
  isActive: boolean("is_active").notNull().default(true), // Enable/disable form
  embedEnabled: boolean("embed_enabled").notNull().default(false), // Allow embedding
  createdAt: timestamp("created_at").defaultNow(),
});

export const formFields = pgTable("form_fields", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").references(() => forms.id).notNull(),
  label: text("label").notNull(),
  type: text("type").notNull(), // text, textarea, select, checkbox, file, signature, etc.
  required: boolean("required").default(false),
  profileFieldKey: text("profile_field_key"), // maps to database field
  context: text("context").notNull(), // 'people', 'property', or 'task'
  options: jsonb("options").$type<string[]>(), // for select/checkbox options
  conditions: jsonb("conditions").$type<{
    showIf?: { fieldId: number; operator: 'equals' | 'not_equals' | 'contains'; value: string }[];
    hideIf?: { fieldId: number; operator: 'equals' | 'not_equals' | 'contains'; value: string }[];
  }>(), // conditional display logic
  validation: jsonb("validation").$type<{
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    fileTypes?: string[];
    maxFileSize?: number;
  }>(), // field validation rules
  sortOrder: integer("sort_order").default(0),
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

export const formSubmissions = pgTable("form_submissions", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").references(() => forms.id).notNull(),
  profileId: integer("profile_id").references(() => contacts.id), // if people context used
  propertyId: integer("property_id").references(() => properties.id), // if property context used  
  taskId: integer("task_id").references(() => tasks.id), // if task context used
  data: jsonb("data").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

// Property portal settings for tenant/client portals with branding and configuration
export const propertyPortalSettings = pgTable("property_portal_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  version: integer("version").notNull().default(1),
  status: varchar("status").notNull().default("draft"), // draft, published, archived
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
  layout: jsonb("layout").$type<{
    headerType?: "minimal" | "standard" | "custom";
    sidebarEnabled?: boolean;
    footerText?: string;
  }>().default({}),
  modulesEnabled: jsonb("modules_enabled").$type<{
    taskRequests?: boolean;
    messages?: boolean;
    documentLibrary?: boolean;
    maintenanceRequests?: boolean;
    announcements?: boolean;
    billingPortal?: boolean;
  }>().default({ taskRequests: true, messages: true }),
  copy: jsonb("copy").$type<{
    welcomeMessage?: string;
    portalTitle?: string;
    footerText?: string;
  }>().default({}),
  legal: jsonb("legal").$type<{
    termsUrl?: string;
    privacyUrl?: string;
    disclaimerText?: string;
    cookieNotice?: boolean;
  }>().default({}),
  i18n: jsonb("i18n").$type<{
    defaultLocale?: string;
    supportedLocales?: string[];
  }>().default({ defaultLocale: "en", supportedLocales: ["en"] }),
  featureFlags: jsonb("feature_flags").$type<string[]>().default([]),
  authOptions: jsonb("auth_options").$type<{
    allowedLogin?: "email" | "phone" | "both";
    mfa?: "none" | "sms" | "email" | "app";
    sessionTimeout?: number;
  }>().default({ allowedLogin: "both", mfa: "sms" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueOrgPropertyVersion: unique().on(table.orgId, table.propertyId, table.version),
}));

// Checklist Templates (Admin-managed)
export const checklistTemplates = pgTable("checklist_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid("org_id").references(() => orgs.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category").notNull(), // 'inspection', 'maintenance', 'cleaning', etc.
  items: jsonb("items").notNull().default('[]'), // Array of { text, required, category } objects
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
  required: boolean("required").default(false),
  result: varchar("result").$type<"pass"|"fail"|"na">(), // Inspection result
  resultNote: text("result_note"), // Inspector note for this item
  photoUrl: text("photo_url"), // Photo evidence URL (legacy single photo)
  photoUrls: text("photo_urls").array().default([]), // Multiple photo evidence URLs
  thumbnailUrls: text("thumbnail_urls").array().default([]), // Thumbnail versions of photos
  dueDate: timestamp("due_date"),
  assignedToId: varchar("assigned_to_id").references(() => users.id),
  priority: varchar("priority").default("normal"), // 'urgent', 'high', 'normal', 'low'
  sortOrder: integer("sort_order").notNull().default(0),
  category: varchar("category"), // e.g. 'Exterior', 'Kitchen', 'HVAC', etc.
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Task Comments table for notes and discussions on tasks
export const taskComments = pgTable("task_comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  text: text("text").notNull(),
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
  notes: text("notes"), // User-provided notes explaining the action
});

// Calendar tables
export const calendars = pgTable("calendars", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  name: varchar("name").notNull(),
  color: varchar("color").default("#3b82f6"), // Hex color code
  isDefault: boolean("is_default").default(false),
  isPrivate: boolean("is_private").default(false), // Private calendars only visible to owner
  ownerId: varchar("owner_id").references(() => users.id), // Owner for private calendars
  createdById: varchar("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  calendarId: uuid("calendar_id").references(() => calendars.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description"),
  location: varchar("location"),
  allDay: boolean("all_day").default(false),
  start: timestamp("start", { withTimezone: true }).notNull(),
  end: timestamp("end", { withTimezone: true }).notNull(),
  timezone: varchar("timezone").default("UTC"),
  recurrenceRule: text("recurrence_rule"), // RFC5545 RRULE string
  recurrenceExDates: text("recurrence_ex_dates").array(), // Exception dates for recurring events
  organizerId: varchar("organizer_id").references(() => users.id).notNull(),
  propertyId: integer("property_id").references(() => properties.id),
  taskId: integer("task_id").references(() => tasks.id),
  clientId: uuid("client_id").references(() => clients.id),
  visibility: varchar("visibility").default("org"), // 'private', 'org', 'public'
  createdById: varchar("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const eventAttendees = pgTable("event_attendees", {
  id: serial("id").primaryKey(),
  eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type").notNull(), // 'user', 'client', 'external'
  userId: varchar("user_id").references(() => users.id),
  clientId: uuid("client_id").references(() => clients.id),
  email: varchar("email"),
  name: varchar("name"),
  responseStatus: varchar("response_status").default("needsAction"), // 'needsAction', 'accepted', 'declined', 'tentative'
  isOptional: boolean("is_optional").default(false),
  notifyByEmail: boolean("notify_by_email").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const eventReminders = pgTable("event_reminders", {
  id: serial("id").primaryKey(),
  eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  offsetMinutes: integer("offset_minutes").notNull(), // Minutes before event to send reminder
  method: varchar("method").default("email"), // 'email', 'push', 'sms'
  lastSentAt: timestamp("last_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const icsFeeds = pgTable("ics_feeds", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  calendarId: uuid("calendar_id").references(() => calendars.id),
  userId: varchar("user_id").references(() => users.id),
  token: varchar("token").unique().notNull(), // Unique token for accessing the feed
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const eventImports = pgTable("event_imports", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  calendarId: uuid("calendar_id").references(() => calendars.id).notNull(),
  sourceType: varchar("source_type").notNull(), // 'ics_url', 'ics_file'
  sourceUrl: varchar("source_url"),
  lastSyncAt: timestamp("last_sync_at"),
  status: varchar("status").default("pending"), // 'pending', 'syncing', 'success', 'error'
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conflictResolutions = pgTable("conflict_resolutions", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  conflictType: varchar("conflict_type").notNull(), // 'staff', 'property', 'resource'
  eventIds: text("event_ids").array().notNull(), // Array of conflicting event IDs
  propertyId: integer("property_id").references(() => properties.id),
  userIds: text("user_ids").array(), // Array of affected user IDs
  status: varchar("status").default("pending").notNull(), // 'pending', 'approved', 'rejected', 'resolved'
  supervisorId: varchar("supervisor_id").references(() => users.id),
  requestedById: varchar("requested_by_id").references(() => users.id).notNull(),
  resolutionNotes: text("resolution_notes"),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  propertyPortalSettings: many(propertyPortalSettings),
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
  createdTeams: many(teams),
  teamMemberships: many(teamMembers),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  org: one(orgs, {
    fields: [teams.orgId],
    references: [orgs.id],
  }),
  creator: one(users, {
    fields: [teams.createdBy],
    references: [users.id],
  }),
  members: many(teamMembers),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
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
  propertyAccessItems: many(propertyAccessItems),
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
  contact: one(contacts, {
    fields: [tasks.contactId],
    references: [contacts.id],
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
  surfaceLinks: many(roomSurfaceLinks),
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

export const roomSurfaceLinksRelations = relations(roomSurfaceLinks, ({ one }) => ({
  room: one(rooms, {
    fields: [roomSurfaceLinks.roomId],
    references: [rooms.id],
  }),
  createdBy: one(users, {
    fields: [roomSurfaceLinks.createdById],
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

export const alertsRelations = relations(alerts, ({ one }) => ({
  org: one(orgs, {
    fields: [alerts.orgId],
    references: [orgs.id],
  }),
  createdBy: one(users, {
    fields: [alerts.createdBy],
    references: [users.id],
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
  mentions: many(messageMentions),
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

export const messageMentionsRelations = relations(messageMentions, ({ one }) => ({
  message: one(teamMessages, {
    fields: [messageMentions.messageId],
    references: [teamMessages.id],
  }),
  mentionedUser: one(users, {
    fields: [messageMentions.mentionedUserId],
    references: [users.id],
  }),
}));

export const userNotificationPreferencesRelations = relations(userNotificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userNotificationPreferences.userId],
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

export const formsRelations = relations(forms, ({ many }) => ({
  fields: many(formFields),
  submissions: many(formSubmissions),
}));

export const formFieldsRelations = relations(formFields, ({ one }) => ({
  form: one(forms, {
    fields: [formFields.formId],
    references: [forms.id],
  }),
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
  form: one(forms, {
    fields: [formSubmissions.formId],
    references: [forms.id],
  }),
  profile: one(contacts, {
    fields: [formSubmissions.profileId],
    references: [contacts.id],
  }),
  property: one(properties, {
    fields: [formSubmissions.propertyId],
    references: [properties.id],
  }),
  task: one(tasks, {
    fields: [formSubmissions.taskId],
    references: [tasks.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertManagementNoteSchema = createInsertSchema(managementNotes).omit({
  id: true,
  isEdited: true,
  createdAt: true,
  updatedAt: true,
});

export type ManagementNote = typeof managementNotes.$inferSelect;
export type InsertManagementNote = z.infer<typeof insertManagementNoteSchema>;

export const insertOutOfOfficePeriodSchema = createInsertSchema(outOfOfficePeriods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  assignedAt: true,
});

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

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

export const insertTaskCommentSchema = createInsertSchema(taskComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;
export type TaskComment = typeof taskComments.$inferSelect;

export const insertCommunitySchema = createInsertSchema(communities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentTemplateSchema = createInsertSchema(documentTemplates).omit({
  id: true,
  uploadedAt: true,
});

export const insertCommunityDocumentSchema = createInsertSchema(communityDocuments).omit({
  id: true,
  uploadedAt: true,
});

export const insertSystemAlertSchema = createInsertSchema(systemAlerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSystemAlertAcknowledgementSchema = createInsertSchema(systemAlertAcknowledgements).omit({
  id: true,
  acknowledgedAt: true,
});

export const insertPlatformSettingsSchema = createInsertSchema(platformSettings).omit({
  updatedAt: true,
});

export const insertPlatformAlertSchema = createInsertSchema(platformAlerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertPlatformAlertAcknowledgementSchema = createInsertSchema(platformAlertAcknowledgements).omit({
  id: true,
  acknowledgedAt: true,
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

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  vendorTypeOther: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
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

export const insertFormSchema = createInsertSchema(forms).omit({
  id: true,
  createdAt: true,
});

export const insertFormFieldSchema = createInsertSchema(formFields).omit({
  id: true,
});

export const insertFormSubmissionSchema = createInsertSchema(formSubmissions).omit({
  id: true,
  submittedAt: true,
  reviewedAt: true,
});

export const insertMessageReactionSchema = createInsertSchema(messageReactions).omit({
  id: true,
  createdAt: true,
});

export const insertMessageMentionSchema = createInsertSchema(messageMentions).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

export const insertPaymentCollectionTokenSchema = createInsertSchema(paymentCollectionTokens).omit({
  id: true,
  createdAt: true,
  isUsed: true,
  usedAt: true,
});

export type InsertPaymentCollectionToken = z.infer<typeof insertPaymentCollectionTokenSchema>;
export type PaymentCollectionToken = typeof paymentCollectionTokens.$inferSelect;

export const insertUserNotificationPreferencesSchema = createInsertSchema(userNotificationPreferences).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  createdAt: true,
});

export const insertSecurityAuditLogSchema = createInsertSchema(securityAuditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertUserMfaSettingsSchema = createInsertSchema(userMfaSettings).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertAdminIpAllowlistSchema = createInsertSchema(adminIpAllowlist).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
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

export const insertOrgStripeConnectionSchema = createInsertSchema(orgStripeConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStripeWebhookEventSchema = createInsertSchema(stripeWebhookEvents).omit({
  id: true,
  createdAt: true,
});

export const insertPlatformInvoiceSchema = createInsertSchema(platformInvoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientInvoiceSchema = createInsertSchema(clientInvoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuickbooksConnectionSchema = createInsertSchema(quickbooksConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuickbooksSyncLogSchema = createInsertSchema(quickbooksSyncLogs).omit({
  id: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecurringBillingScheduleSchema = createInsertSchema(recurringBillingSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBillingSubmissionSchema = createInsertSchema(billingSubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientPaymentMethodSchema = createInsertSchema(clientPaymentMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientBillingPrefSchema = createInsertSchema(clientBillingPrefs).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertPortalUserSchema = createInsertSchema(portalUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPortalInvitationSchema = createInsertSchema(portalInvitations).omit({
  id: true,
  createdAt: true,
  isUsed: true,
  usedAt: true,
});

export const insertPortalUserPropertySchema = createInsertSchema(portalUserProperties).omit({
  id: true,
  createdAt: true,
});

export const insertPortalSessionSchema = createInsertSchema(portalSessions).omit({
  id: true,
  createdAt: true,
});

export const insertPropertyFormSchema = createInsertSchema(propertyForms).omit({
  id: true,
  createdAt: true,
});

export const insertPropertyPortalSettingsSchema = createInsertSchema(propertyPortalSettings).omit({
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
  createdById: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVehicleNoteSchema = createInsertSchema(vehicleNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVehiclePhotoSchema = createInsertSchema(vehiclePhotos).omit({
  id: true,
  createdAt: true,
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

export const insertRoomSurfaceLinkSchema = createInsertSchema(roomSurfaceLinks).omit({
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

export const insertPropertyAccessItemSchema = createInsertSchema(propertyAccessItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPropertyAccessItem = z.infer<typeof insertPropertyAccessItemSchema>;
export type SelectPropertyAccessItem = typeof propertyAccessItems.$inferSelect;

export const insertContactPropertySchema = createInsertSchema(contactProperties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVendorEmployeeSchema = createInsertSchema(vendorEmployees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().transform(v => v || undefined).optional().refine(
    (val) => !val || z.string().email().safeParse(val).success,
    { message: "Invalid email address" }
  ),
  position: z.string().transform(v => v || undefined).optional(),
  phone: z.string().transform(v => v || undefined).optional(),
  notes: z.string().transform(v => v || undefined).optional(),
});

export const insertPropertyVendorSchema = createInsertSchema(propertyVendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  notes: z.string().transform(v => v || undefined).optional(),
});

export type InsertPropertyVendor = z.infer<typeof insertPropertyVendorSchema>;
export type SelectPropertyVendor = typeof propertyVendors.$inferSelect;

export const insertCalendarSchema = createInsertSchema(calendars).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventAttendeeSchema = createInsertSchema(eventAttendees).omit({
  id: true,
  createdAt: true,
});

export const insertEventReminderSchema = createInsertSchema(eventReminders).omit({
  id: true,
  createdAt: true,
});

export const insertIcsFeedSchema = createInsertSchema(icsFeeds).omit({
  id: true,
  createdAt: true,
});

export const insertEventImportSchema = createInsertSchema(eventImports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConflictResolutionSchema = createInsertSchema(conflictResolutions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertOutOfOfficePeriod = z.infer<typeof insertOutOfOfficePeriodSchema>;
export type OutOfOfficePeriod = typeof outOfOfficePeriods.$inferSelect;
export type InsertOrg = z.infer<typeof insertOrgSchema>;
export type Org = typeof orgs.$inferSelect;
export type InsertOrgSubscription = z.infer<typeof insertOrgSubscriptionSchema>;
export type OrgSubscription = typeof orgSubscriptions.$inferSelect;
export type InsertOrgStripeConnection = z.infer<typeof insertOrgStripeConnectionSchema>;
export type OrgStripeConnection = typeof orgStripeConnections.$inferSelect;
export type InsertStripeWebhookEvent = z.infer<typeof insertStripeWebhookEventSchema>;
export type StripeWebhookEvent = typeof stripeWebhookEvents.$inferSelect;
export type InsertPlatformInvoice = z.infer<typeof insertPlatformInvoiceSchema>;
export type PlatformInvoice = typeof platformInvoices.$inferSelect;
export type InsertClientInvoice = z.infer<typeof insertClientInvoiceSchema>;
export type ClientInvoice = typeof clientInvoices.$inferSelect;
export type InsertQuickbooksConnection = z.infer<typeof insertQuickbooksConnectionSchema>;
export type QuickbooksConnection = typeof quickbooksConnections.$inferSelect;
export type InsertQuickbooksSyncLog = z.infer<typeof insertQuickbooksSyncLogSchema>;
export type QuickbooksSyncLog = typeof quickbooksSyncLogs.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertRecurringBillingSchedule = z.infer<typeof insertRecurringBillingScheduleSchema>;
export type RecurringBillingSchedule = typeof recurringBillingSchedules.$inferSelect;
export type InsertBillingSubmission = z.infer<typeof insertBillingSubmissionSchema>;
export type BillingSubmission = typeof billingSubmissions.$inferSelect;
export type InsertClientPaymentMethod = z.infer<typeof insertClientPaymentMethodSchema>;
export type ClientPaymentMethod = typeof clientPaymentMethods.$inferSelect;
export type InsertClientBillingPref = z.infer<typeof insertClientBillingPrefSchema>;
export type ClientBillingPref = typeof clientBillingPrefs.$inferSelect;
export type InsertPortalUser = z.infer<typeof insertPortalUserSchema>;
export type PortalUser = typeof portalUsers.$inferSelect;
export type InsertPortalUserProperty = z.infer<typeof insertPortalUserPropertySchema>;
export type PortalUserProperty = typeof portalUserProperties.$inferSelect;
export type InsertPortalSession = z.infer<typeof insertPortalSessionSchema>;
export type PortalSession = typeof portalSessions.$inferSelect;
export type InsertPortalInvitation = z.infer<typeof insertPortalInvitationSchema>;
export type PortalInvitation = typeof portalInvitations.$inferSelect;
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type Community = typeof communities.$inferSelect;
export type InsertDocumentTemplate = z.infer<typeof insertDocumentTemplateSchema>;
export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type InsertCommunityDocument = z.infer<typeof insertCommunityDocumentSchema>;
export type CommunityDocument = typeof communityDocuments.$inferSelect;
export type InsertSystemAlert = z.infer<typeof insertSystemAlertSchema>;
export type SystemAlert = typeof systemAlerts.$inferSelect;
export type InsertSystemAlertAcknowledgement = z.infer<typeof insertSystemAlertAcknowledgementSchema>;
export type SystemAlertAcknowledgement = typeof systemAlertAcknowledgements.$inferSelect;
export type InsertPlatformSettings = z.infer<typeof insertPlatformSettingsSchema>;
export type PlatformSettings = typeof platformSettings.$inferSelect;
export type InsertPlatformAlert = z.infer<typeof insertPlatformAlertSchema>;
export type PlatformAlert = typeof platformAlerts.$inferSelect;
export type InsertPlatformAlertAcknowledgement = z.infer<typeof insertPlatformAlertAcknowledgementSchema>;
export type PlatformAlertAcknowledgement = typeof platformAlertAcknowledgements.$inferSelect;
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
export type FeatureFlag = typeof featureFlags.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;
export type InsertPropertyForm = z.infer<typeof insertPropertyFormSchema>;
export type PropertyForm = typeof propertyForms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContactProperty = z.infer<typeof insertContactPropertySchema>;
export type ContactProperty = typeof contactProperties.$inferSelect;
export type InsertVendorEmployee = z.infer<typeof insertVendorEmployeeSchema>;
export type VendorEmployee = typeof vendorEmployees.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertTeamMessage = z.infer<typeof insertTeamMessageSchema>;
export type TeamMessage = typeof teamMessages.$inferSelect;
export type InsertMessageReaction = z.infer<typeof insertMessageReactionSchema>;
export type MessageReaction = typeof messageReactions.$inferSelect;
export type InsertMessageMention = z.infer<typeof insertMessageMentionSchema>;
export type MessageMention = typeof messageMentions.$inferSelect;
export type InsertUserNotificationPreferences = z.infer<typeof insertUserNotificationPreferencesSchema>;
export type UserNotificationPreferences = typeof userNotificationPreferences.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;

export type InsertSecurityAuditLog = z.infer<typeof insertSecurityAuditLogSchema>;
export type SecurityAuditLog = typeof securityAuditLogs.$inferSelect;

export type InsertUserMfaSettings = z.infer<typeof insertUserMfaSettingsSchema>;
export type UserMfaSettings = typeof userMfaSettings.$inferSelect;

export type InsertAdminIpAllowlist = z.infer<typeof insertAdminIpAllowlistSchema>;
export type AdminIpAllowlist = typeof adminIpAllowlist.$inferSelect;

export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type UserSession = typeof userSessions.$inferSelect;

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
export type InsertRoomSurfaceLink = z.infer<typeof insertRoomSurfaceLinkSchema>;
export type RoomSurfaceLink = typeof roomSurfaceLinks.$inferSelect;
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
export type InsertVehiclePhoto = z.infer<typeof insertVehiclePhotoSchema>;
export type VehiclePhoto = typeof vehiclePhotos.$inferSelect;
export type IgnoredDuplicate = typeof ignoredDuplicates.$inferSelect;
export type InsertIgnoredDuplicate = typeof ignoredDuplicates.$inferInsert;
export type DuplicateHistory = typeof duplicateHistory.$inferSelect;
export type InsertDuplicateHistory = typeof duplicateHistory.$inferInsert;
export type InsertPropertyPortalSettings = z.infer<typeof insertPropertyPortalSettingsSchema>;
export type PropertyPortalSettings = typeof propertyPortalSettings.$inferSelect;
export type InsertCalendar = z.infer<typeof insertCalendarSchema>;
export type Calendar = typeof calendars.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEventAttendee = z.infer<typeof insertEventAttendeeSchema>;
export type EventAttendee = typeof eventAttendees.$inferSelect;
export type InsertEventReminder = z.infer<typeof insertEventReminderSchema>;
export type EventReminder = typeof eventReminders.$inferSelect;
export type InsertIcsFeed = z.infer<typeof insertIcsFeedSchema>;
export type IcsFeed = typeof icsFeeds.$inferSelect;
export type InsertEventImport = z.infer<typeof insertEventImportSchema>;
export type EventImport = typeof eventImports.$inferSelect;
export type InsertConflictResolution = z.infer<typeof insertConflictResolutionSchema>;
export type ConflictResolution = typeof conflictResolutions.$inferSelect;

// Import History table for tracking CSV imports
export const importHistory = pgTable("import_history", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  initiatedBy: varchar("initiated_by").references(() => users.id).notNull(),
  entityType: text("entity_type").$type<"properties" | "contacts" | "tasks">().notNull(),
  fileName: varchar("file_name"),
  status: text("status").$type<"success" | "partial_success" | "failed">().notNull(),
  totalRecords: integer("total_records").notNull(),
  createdRecords: integer("created_records").notNull().default(0),
  updatedRecords: integer("updated_records").notNull().default(0),
  failedRecords: integer("failed_records").notNull().default(0),
  initiatedAt: timestamp("initiated_at").defaultNow().notNull(),
}, (table) => [
  index("import_history_org_idx").on(table.orgId),
  index("import_history_user_idx").on(table.initiatedBy),
]);

export const insertImportHistorySchema = createInsertSchema(importHistory).omit({
  id: true,
  initiatedAt: true,
});
export type InsertImportHistory = z.infer<typeof insertImportHistorySchema>;
export type ImportHistory = typeof importHistory.$inferSelect;

// Platform Templates - for managing email, invoice, and other document templates
export const platformTemplates = pgTable("platform_templates", {
  id: serial("id").primaryKey(),
  type: text("type").$type<"email_invitation" | "invoice" | "notification" | "email_general">().notNull(),
  name: varchar("name").notNull(),
  subject: varchar("subject"), // Email subject line (for email templates)
  htmlContent: text("html_content").notNull(), // HTML template with {{variables}}
  variables: jsonb("variables").$type<string[]>().default([]), // Available template variables
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("platform_templates_type_idx").on(table.type),
]);

export const insertPlatformTemplateSchema = createInsertSchema(platformTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPlatformTemplate = z.infer<typeof insertPlatformTemplateSchema>;
export type PlatformTemplate = typeof platformTemplates.$inferSelect;

// Calendar Report Templates - for exporting calendar data with custom formatting
export const calendarReportTemplates = pgTable("calendar_report_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  
  // Template content
  headerHtml: text("header_html"), // Optional header content with {{variables}}
  footerHtml: text("footer_html"), // Optional footer content with {{variables}}
  
  // Included fields configuration
  includedFields: jsonb("included_fields").$type<{
    title?: boolean;
    description?: boolean;
    startDate?: boolean;
    endDate?: boolean;
    startTime?: boolean;
    endTime?: boolean;
    duration?: boolean;
    location?: boolean;
    calendar?: boolean;
    attendees?: boolean;
    recurrence?: boolean;
    organizer?: boolean;
  }>().notNull().default({
    title: true,
    startDate: true,
    endDate: true,
    startTime: true,
    endTime: true,
    calendar: true,
  }),
  
  // Format options
  formatOptions: jsonb("format_options").$type<{
    groupBy?: "date" | "calendar" | "none";
    sortBy?: "startDate" | "title" | "calendar";
    sortOrder?: "asc" | "desc";
    dateFormat?: string;
    timeFormat?: "12h" | "24h";
    includeAllDayEvents?: boolean;
    includeRecurringInstances?: boolean;
    showEventCount?: boolean;
  }>().notNull().default({
    groupBy: "date",
    sortBy: "startDate",
    sortOrder: "asc",
    dateFormat: "MMMM d, yyyy",
    timeFormat: "12h",
    includeAllDayEvents: true,
    includeRecurringInstances: true,
    showEventCount: true,
  }),
  
  // Styling options for PDF
  styleOptions: jsonb("style_options").$type<{
    fontSize?: number;
    fontFamily?: string;
    primaryColor?: string;
    secondaryColor?: string;
    includeLogo?: boolean;
  }>().default({
    fontSize: 12,
    fontFamily: "Arial",
    primaryColor: "#000000",
    secondaryColor: "#666666",
    includeLogo: false,
  }),
  
  variables: jsonb("variables").$type<string[]>().default([
    "organizationName",
    "reportStartDate",
    "reportEndDate",
    "totalEvents",
    "generatedDate",
    "generatedBy",
  ]),
  
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false), // Mark one template as default
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCalendarReportTemplateSchema = createInsertSchema(calendarReportTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCalendarReportTemplate = z.infer<typeof insertCalendarReportTemplateSchema>;
export type CalendarReportTemplate = typeof calendarReportTemplates.$inferSelect;

// Premium property types - available only on Pro, Grow, and Enterprise tiers
export const PREMIUM_PROPERTY_TYPES = ['storage_unit', 'boat'] as const;
export const PREMIUM_TIER_PROPERTY_TIERS = ['pro', 'grow', 'enterprise'] as const;

// Helper function to check if a property type is premium
export function isPremiumPropertyType(type: string): boolean {
  return PREMIUM_PROPERTY_TYPES.includes(type as any);
}

// Helper function to check if a tier allows premium property types
export function tierAllowsPremiumProperties(tier: string): boolean {
  return PREMIUM_TIER_PROPERTY_TIERS.includes(tier as any);
}

// Support Requests table - Super Admin only visibility
export const supportRequests = pgTable("support_requests", {
  id: serial("id").primaryKey(),
  organizationId: uuid("organization_id").references(() => orgs.id).notNull(),
  userId: text("user_id").notNull(), // Replit Auth sub
  userName: varchar("user_name").notNull(),
  email: varchar("email").notNull(),
  subject: varchar("subject").notNull(),
  message: text("message").notNull(),
  hyperlinks: text("hyperlinks").array().default([]),
  attachmentUrls: text("attachment_urls").array().default([]),
  status: varchar("status").$type<"new"|"in_progress"|"resolved">().notNull().default("new"),
  urgency: varchar("urgency").$type<"low"|"medium"|"high"|"critical">().notNull().default("medium"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSupportRequestSchema = createInsertSchema(supportRequests).omit({
  id: true,
  createdAt: true,
});
export type InsertSupportRequest = z.infer<typeof insertSupportRequestSchema>;
export type SupportRequest = typeof supportRequests.$inferSelect;

// Email Templates table - Super Admin only, for customizable email notifications
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(), // User-friendly name
  type: varchar("type").$type<"ticket_receipt"|"ticket_notification"|"status_update">().notNull().unique(),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text").notNull(),
  fromEmail: varchar("from_email").notNull(),
  fromName: varchar("from_name").notNull(),
  
  // Available variables that can be used in templates
  availableVariables: jsonb("available_variables").$type<string[]>().default([]),
  
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

// Organization Email Templates - For client communication
export const orgEmailTemplates = pgTable("org_email_templates", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  name: varchar("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  description: text("description"), // Internal documentation for template purpose
  
  // Available merge fields that can be used in this template
  availableMergeFields: jsonb("available_merge_fields").$type<string[]>().default([
    "firstName", "lastName", "fullName", "email", "phone",
    "propertyName", "propertyAddress", "propertyCity",
    "senderName", "senderEmail", "organizationName"
  ]),
  
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOrgEmailTemplateSchema = createInsertSchema(orgEmailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOrgEmailTemplate = z.infer<typeof insertOrgEmailTemplateSchema>;
export type OrgEmailTemplate = typeof orgEmailTemplates.$inferSelect;

// Email History - Track all sent emails
export const emailHistory = pgTable("email_history", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  
  // Sender (user who sent the email)
  senderId: text("sender_id").notNull(), // Replit Auth sub
  senderName: varchar("sender_name").notNull(),
  senderEmail: varchar("sender_email").notNull(),
  
  // Recipient (contact)
  recipientContactId: integer("recipient_contact_id").references(() => contacts.id),
  recipientEmail: varchar("recipient_email").notNull(),
  recipientName: varchar("recipient_name"),
  
  // Email content
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  
  // Template used (if any)
  templateId: integer("template_id").references(() => orgEmailTemplates.id),
  
  // Status tracking
  status: varchar("status").$type<"sent"|"failed"|"scheduled">().notNull().default("sent"),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmailHistorySchema = createInsertSchema(emailHistory).omit({
  id: true,
  createdAt: true,
});
export type InsertEmailHistory = z.infer<typeof insertEmailHistorySchema>;
export type EmailHistory = typeof emailHistory.$inferSelect;

// Scheduled Emails - Queue for emails to be sent later
export const scheduledEmails = pgTable("scheduled_emails", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  
  // Sender
  senderId: text("sender_id").notNull(),
  senderName: varchar("sender_name").notNull(),
  senderEmail: varchar("sender_email").notNull(),
  
  // Recipient
  recipientContactId: integer("recipient_contact_id").references(() => contacts.id),
  recipientEmail: varchar("recipient_email").notNull(),
  recipientName: varchar("recipient_name"),
  
  // Email content
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  
  // Template used (if any)
  templateId: integer("template_id").references(() => orgEmailTemplates.id),
  
  // Scheduling
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: varchar("status").$type<"pending"|"sent"|"failed"|"cancelled">().notNull().default("pending"),
  
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScheduledEmailSchema = createInsertSchema(scheduledEmails).omit({
  id: true,
  createdAt: true,
});
export type InsertScheduledEmail = z.infer<typeof insertScheduledEmailSchema>;
export type ScheduledEmail = typeof scheduledEmails.$inferSelect;

// Custom Fields insert schema - fieldKey is provided by server but will be regenerated to avoid collisions
export const insertCustomFieldSchema = createInsertSchema(customFields).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCustomField = z.infer<typeof insertCustomFieldSchema>;
export type CustomField = typeof customFields.$inferSelect;

// Custom Fields update schema - excludes orgId and fieldKey to prevent tampering
export const updateCustomFieldSchema = insertCustomFieldSchema.omit({
  orgId: true,
  fieldKey: true,
}).partial();

// API Keys - For custom Hubify API access
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  name: varchar("name").notNull(), // User-friendly name (e.g., "Production API", "Mobile App")
  keyPrefix: varchar("key_prefix").notNull(), // First 8 chars shown to user (e.g., "hbfy_12ab")
  hashedKey: varchar("hashed_key").notNull(), // Bcrypt hash of full API key
  lastUsedAt: timestamp("last_used_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

// Webhook event types
export const WEBHOOK_EVENT_TYPES = [
  "task.created",
  "task.updated",
  "task.completed",
  "contact.created",
  "invoice.sent",
  "inspection.completed",
  "test",
] as const;
export type WebhookEventType = typeof WEBHOOK_EVENT_TYPES[number];

// Webhook endpoints - org-configured outbound webhook destinations
export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  url: text("url").notNull(),
  secret: varchar("secret").notNull(),
  eventTypes: jsonb("event_types").$type<WebhookEventType[]>().notNull().default([]),
  enabled: boolean("enabled").notNull().default(true),
  description: varchar("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("webhook_endpoints_org_idx").on(table.orgId),
]);

export const insertWebhookEndpointSchema = createInsertSchema(webhookEndpoints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWebhookEndpoint = z.infer<typeof insertWebhookEndpointSchema>;
export type WebhookEndpoint = typeof webhookEndpoints.$inferSelect;

// Webhook deliveries - log of outbound webhook delivery attempts
export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  endpointId: uuid("endpoint_id").references(() => webhookEndpoints.id, { onDelete: "cascade" }).notNull(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  eventType: varchar("event_type").$type<WebhookEventType>().notNull(),
  payload: jsonb("payload").$type<Record<string, any>>().notNull(),
  status: varchar("status").$type<"pending"|"success"|"failed">().notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  nextRetryAt: timestamp("next_retry_at"),
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("webhook_deliveries_endpoint_idx").on(table.endpointId),
  index("webhook_deliveries_org_idx").on(table.orgId),
  index("webhook_deliveries_status_idx").on(table.status),
]);

export const insertWebhookDeliverySchema = createInsertSchema(webhookDeliveries).omit({
  id: true,
  createdAt: true,
});
export type InsertWebhookDelivery = z.infer<typeof insertWebhookDeliverySchema>;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;

// In-app notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").references(() => orgs.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type").$type<"task_assigned"|"task_overdue"|"inspection_due"|"invoice_due"|"mention"|"general">().notNull(),
  title: varchar("title").notNull(),
  body: text("body").notNull(),
  linkUrl: varchar("link_url"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("notifications_user_read_idx").on(table.userId, table.isRead),
  index("notifications_org_idx").on(table.orgId),
]);

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Inspection Schedules - recurring automated inspection scheduling per property
export const inspectionSchedules = pgTable("inspection_schedules", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").references(() => orgs.id, { onDelete: "cascade" }).notNull(),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull(),
  templateId: varchar("template_id").references(() => checklistTemplates.id, { onDelete: "set null" }),
  inspectorUserId: varchar("inspector_user_id").references(() => users.id, { onDelete: "set null" }),
  frequency: varchar("frequency").$type<"weekly" | "monthly" | "quarterly" | "annually">().notNull(),
  startDate: date("start_date").notNull(),
  nextDueDate: date("next_due_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("inspection_schedules_org_idx").on(table.orgId),
  index("inspection_schedules_property_idx").on(table.propertyId),
  index("inspection_schedules_next_due_idx").on(table.nextDueDate),
]);

export const insertInspectionScheduleSchema = createInsertSchema(inspectionSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertInspectionSchedule = z.infer<typeof insertInspectionScheduleSchema>;
export type InspectionSchedule = typeof inspectionSchedules.$inferSelect;

// Notification Logs - Audit trail for all system-sent notification emails
export const notificationLogs = pgTable("notification_logs", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),

  // Notification type
  type: varchar("type").$type<
    | "task_overdue"
    | "invoice_due"
    | "inspection_reminder"
    | "calendar_reminder"
    | "invoice_sent"
    | "billing_summary"
  >().notNull(),

  // Recipient info
  recipientEmail: varchar("recipient_email").notNull(),
  recipientName: varchar("recipient_name"),

  // Email content summary
  subject: text("subject").notNull(),

  // Status tracking
  status: varchar("status").$type<"sent" | "failed">().notNull().default("sent"),
  errorMessage: text("error_message"),

  // Related entity (optional context)
  relatedEntityType: varchar("related_entity_type"), // e.g. "task", "invoice", "inspection_schedule", "event"
  relatedEntityId: varchar("related_entity_id"),

  sentAt: timestamp("sent_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("notification_logs_org_idx").on(table.orgId),
  index("notification_logs_type_idx").on(table.type),
  index("notification_logs_recipient_idx").on(table.recipientEmail),
]);

export const insertNotificationLogSchema = createInsertSchema(notificationLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertNotificationLog = z.infer<typeof insertNotificationLogSchema>;
export type NotificationLog = typeof notificationLogs.$inferSelect;

// User Cookie Consent table
export const userCookieConsent = pgTable("user_cookie_consent", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: 'cascade' }).notNull(),
  version: integer("version").notNull().default(1),
  essential: boolean("essential").notNull().default(true),
  analytics: boolean("analytics").notNull().default(false),
  preference: boolean("preference").notNull().default(false),
  decidedAt: timestamp("decided_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserCookieConsentSchema = createInsertSchema(userCookieConsent).omit({
  decidedAt: true,
  updatedAt: true,
});
export type InsertUserCookieConsent = z.infer<typeof insertUserCookieConsentSchema>;
export type UserCookieConsent = typeof userCookieConsent.$inferSelect;

// Portal users authenticate separately from OIDC users, so their consent has
// its own table keyed by portal_user_id.
export const portalUserCookieConsent = pgTable("portal_user_cookie_consent", {
  portalUserId: uuid("portal_user_id").primaryKey().references(() => portalUsers.id, { onDelete: 'cascade' }).notNull(),
  version: integer("version").notNull().default(1),
  essential: boolean("essential").notNull().default(true),
  analytics: boolean("analytics").notNull().default(false),
  preference: boolean("preference").notNull().default(false),
  decidedAt: timestamp("decided_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertPortalUserCookieConsentSchema = createInsertSchema(portalUserCookieConsent).omit({
  decidedAt: true,
  updatedAt: true,
});
export type InsertPortalUserCookieConsent = z.infer<typeof insertPortalUserCookieConsentSchema>;
export type PortalUserCookieConsent = typeof portalUserCookieConsent.$inferSelect;

// ─── Onboarding Prospects ───────────────────────────────────────────────────
// Tracks new customer leads through the super-admin onboarding funnel.
export type OnboardingStage =
  | "inquiry"
  | "agreement"
  | "payment_setup"
  | "initial_payment"
  | "welcome"
  | "dropped";

export type StageHistoryEntry = { stage: OnboardingStage; enteredAt: string };

export const onboardingProspects = pgTable("onboarding_prospects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name").notNull(),
  email: varchar("email").notNull(),
  company: varchar("company"),
  phone: varchar("phone"),
  stage: varchar("stage").$type<OnboardingStage>().notNull().default("inquiry"),
  stageHistory: jsonb("stage_history").$type<StageHistoryEntry[]>().notNull().default([]),
  droppedReason: text("dropped_reason"),
  welcomeEmailSentAt: timestamp("welcome_email_sent_at"),
  notes: text("notes"),
  orgId: uuid("org_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("onboarding_prospects_stage_idx").on(table.stage),
  index("onboarding_prospects_email_idx").on(table.email),
]);

export const onboardingStageEnum = z.enum([
  "inquiry",
  "agreement",
  "payment_setup",
  "initial_payment",
  "welcome",
  "dropped",
]);

export const insertOnboardingProspectSchema = createInsertSchema(onboardingProspects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  stage: onboardingStageEnum.optional(),
});
export type InsertOnboardingProspect = z.infer<typeof insertOnboardingProspectSchema>;
export type OnboardingProspect = typeof onboardingProspects.$inferSelect;
