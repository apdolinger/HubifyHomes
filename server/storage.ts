import {
  users,
  outOfOfficePeriods,
  teams,
  teamMembers,
  orgs,
  orgSubscriptions,
  orgStripeConnections,
  stripeWebhookEvents,
  platformInvoices,
  clientInvoices,
  clients,
  recurringBillingSchedules,
  billingSubmissions,
  portalUsers,
  portalUserProperties,
  portalSessions,
  portalInvitations,
  communities,
  communityDocuments,
  properties,
  rooms,
  roomSupplies,
  roomNotes,
  roomDevices,
  roomSurfaces,
  roomSurfaceLinks,
  roomFixtures,
  roomPhotos,
  roomChecklists,
  propertyAccessItems,
  vehicles,
  vehicleMaintenance,
  vehicleNotes,
  vehiclePhotos,
  tasks,
  taskChecklistItems,
  timeEntries,
  contacts,
  contactProperties,
  alerts,
  systemAlerts,
  systemAlertAcknowledgements,
  teamMessages,
  messageReactions,
  messageMentions,
  userNotificationPreferences,
  activityLog,
  forms,
  formFields,
  formSubmissions,
  propertyForms,
  propertyPortalSettings,
  ignoredDuplicates,
  duplicateHistory,
  calendars,
  events,
  eventAttendees,
  eventReminders,
  icsFeeds,
  eventImports,
  conflictResolutions,
  securityAuditLogs,
  userSessions,
  importHistory,
  platformTemplates,
  calendarReportTemplates,
  supportRequests,
  emailTemplates,
  customFields,
  type User,
  type UpsertUser,
  type Team,
  type InsertTeam,
  type TeamMember,
  type InsertTeamMember,
  type Org,
  type InsertOrg,
  type OrgSubscription,
  type InsertOrgSubscription,
  type OrgStripeConnection,
  type InsertOrgStripeConnection,
  type StripeWebhookEvent,
  type InsertStripeWebhookEvent,
  type PlatformInvoice,
  type InsertPlatformInvoice,
  type ClientInvoice,
  type InsertClientInvoice,
  type Client,
  type InsertClient,
  type RecurringBillingSchedule,
  type InsertRecurringBillingSchedule,
  type BillingSubmission,
  type InsertBillingSubmission,
  type PortalUser,
  type InsertPortalUser,
  type PortalUserProperty,
  type InsertPortalUserProperty,
  type PortalSession,
  type InsertPortalSession,
  type PortalInvitation,
  type InsertPortalInvitation,
  type Community,
  type InsertCommunity,
  type CommunityDocument,
  type InsertCommunityDocument,
  type Property,
  type InsertProperty,
  type Room,
  type InsertRoom,
  type RoomSupply,
  type InsertRoomSupply,
  type RoomNote,
  type InsertRoomNote,
  type RoomDevice,
  type InsertRoomDevice,
  type RoomSurface,
  type InsertRoomSurface,
  type RoomSurfaceLink,
  type InsertRoomSurfaceLink,
  type RoomFixture,
  type InsertRoomFixture,
  type RoomPhoto,
  type InsertRoomPhoto,
  type RoomChecklist,
  type InsertRoomChecklist,
  type SelectPropertyAccessItem,
  type InsertPropertyAccessItem,
  type Vehicle,
  type InsertVehicle,
  type VehicleMaintenance,
  type InsertVehicleMaintenance,
  type VehicleNote,
  type InsertVehicleNote,
  type VehiclePhoto,
  type InsertVehiclePhoto,
  type Task,
  type InsertTask,
  type TaskChecklistItem,
  type InsertTaskChecklistItem,
  type TaskComment,
  type InsertTaskComment,
  type TimeEntry,
  type InsertTimeEntry,
  type Contact,
  type InsertContact,
  type ContactProperty,
  type InsertContactProperty,
  type Alert,
  type InsertAlert,
  type SystemAlert,
  type InsertSystemAlert,
  type SystemAlertAcknowledgement,
  type InsertSystemAlertAcknowledgement,
  type TeamMessage,
  type InsertTeamMessage,
  type MessageReaction,
  type InsertMessageReaction,
  type MessageMention,
  type InsertMessageMention,
  type UserNotificationPreferences,
  type InsertUserNotificationPreferences,
  type ActivityLog,
  type InsertActivityLog,
  type Form,
  type InsertForm,
  type PropertyForm,
  type InsertPropertyForm,
  type FormSubmission,
  type InsertFormSubmission,
  type PropertyPortalSettings,
  type InsertPropertyPortalSettings,
  type DuplicateHistory,
  type InsertDuplicateHistory,
  type Calendar,
  type InsertCalendar,
  type Event,
  type InsertEvent,
  type EventAttendee,
  type InsertEventAttendee,
  type EventReminder,
  type InsertEventReminder,
  type IcsFeed,
  type InsertIcsFeed,
  type EventImport,
  type InsertEventImport,
  type ConflictResolution,
  type InsertConflictResolution,
  type OutOfOfficePeriod,
  type InsertOutOfOfficePeriod,
  type ImportHistory,
  type InsertImportHistory,
  type PlatformTemplate,
  type InsertPlatformTemplate,
  type CalendarReportTemplate,
  type InsertCalendarReportTemplate,
  type SupportRequest,
  type InsertSupportRequest,
  type EmailTemplate,
  type InsertEmailTemplate,
  type CustomField,
  type InsertCustomField,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, count, sql, inArray, isNotNull } from "drizzle-orm";

export interface IStorage {
  // User operations - required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, userData: Partial<UpsertUser>): Promise<User>;
  getUserTaskStats(userId: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    activeTasks: number;
    overdueTasks: number;
  }>;
  
  // Out-of-office operations
  getOutOfOfficePeriods(userId: string): Promise<OutOfOfficePeriod[]>;
  getActiveOutOfOfficePeriod(userId: string, date?: Date): Promise<OutOfOfficePeriod | undefined>;
  createOutOfOfficePeriod(period: InsertOutOfOfficePeriod): Promise<OutOfOfficePeriod>;
  updateOutOfOfficePeriod(id: number, period: Partial<InsertOutOfOfficePeriod>): Promise<OutOfOfficePeriod>;
  deleteOutOfOfficePeriod(id: number): Promise<void>;
  getUsersOutOfOffice(orgId: string, startDate: Date, endDate: Date): Promise<User[]>;
  
  // Team operations
  getTeams(orgId: string): Promise<Team[]>;
  getTeam(id: string): Promise<Team | undefined>;
  getTeamWithMembers(id: string): Promise<(Team & { members: (TeamMember & { user: User })[] }) | undefined>;
  getUserTeams(userId: string): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: string, team: Partial<InsertTeam>): Promise<Team>;
  deleteTeam(id: string): Promise<void>;
  addTeamMember(teamMember: InsertTeamMember): Promise<TeamMember>;
  removeTeamMember(teamId: string, userId: string): Promise<void>;
  getTeamMembers(teamId: string): Promise<(TeamMember & { user: User })[]>;
  updateTeamMemberRole(teamId: string, userId: string, role: 'lead' | 'member'): Promise<TeamMember>;
  
  // Organization operations
  getOrgs(): Promise<Org[]>;
  getOrg(id: string): Promise<Org | undefined>;
  createOrg(org: InsertOrg): Promise<Org>;
  updateOrg(id: string, org: Partial<InsertOrg>): Promise<Org>;
  getOrgSubscription(orgId: string): Promise<OrgSubscription | undefined>;
  upsertOrgSubscription(subscription: InsertOrgSubscription): Promise<OrgSubscription>;
  getOrgSupplySettings(id: string): Promise<{ supplyTypes: string[]; supplyUnits: string[] } | undefined>;
  updateOrgSupplySettings(id: string, settings: { supplyTypes?: string[]; supplyUnits?: string[] }): Promise<{ supplyTypes: string[]; supplyUnits: string[] } | undefined>;
  
  // Client operations
  getClients(orgId: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client>;
  
  // Recurring billing schedule operations
  createRecurringSchedule(schedule: InsertRecurringBillingSchedule): Promise<RecurringBillingSchedule>;
  getRecurringSchedulesByClient(clientId: string): Promise<RecurringBillingSchedule[]>;
  getRecurringSchedule(id: string): Promise<RecurringBillingSchedule | undefined>;
  updateRecurringSchedule(id: string, schedule: Partial<InsertRecurringBillingSchedule>): Promise<RecurringBillingSchedule>;
  deleteRecurringSchedule(id: string): Promise<void>;
  getDueRecurringSchedules(beforeDate: Date): Promise<RecurringBillingSchedule[]>;
  
  // Billing submission operations
  createBillingSubmission(submission: InsertBillingSubmission): Promise<BillingSubmission>;
  getBillingSubmissions(orgId: string, filters?: { status?: string; clientId?: string }): Promise<BillingSubmission[]>;
  getBillingSubmissionsByClient(clientId: string): Promise<BillingSubmission[]>;
  getBillingSubmissionsByInvoice(invoiceId: string): Promise<BillingSubmission[]>;
  getBillingSubmission(id: string): Promise<BillingSubmission | undefined>;
  updateBillingSubmission(id: string, updates: Partial<InsertBillingSubmission>): Promise<BillingSubmission>;
  authorizeBillingSubmission(id: string, authorizedBy: string): Promise<BillingSubmission>;
  rejectBillingSubmission(id: string, rejectionReason: string): Promise<BillingSubmission>;
  
  // Client invoice operations
  createClientInvoice(invoice: InsertClientInvoice): Promise<ClientInvoice>;
  getClientInvoices(orgId: string, filters?: { status?: string; clientId?: string }): Promise<ClientInvoice[]>;
  getClientInvoicesByClient(clientId: string): Promise<ClientInvoice[]>;
  getClientInvoice(id: string): Promise<ClientInvoice | undefined>;
  updateClientInvoice(id: string, invoice: Partial<InsertClientInvoice>): Promise<ClientInvoice>;
  updateInvoicePaymentStatus(invoiceId: string, updates: Partial<InsertClientInvoice>): Promise<ClientInvoice>;
  getClientInvoiceByStripePaymentIntent(paymentIntentId: string): Promise<ClientInvoice | undefined>;
  updateInvoicePaymentStatusByStripePaymentIntent(paymentIntentId: string, updates: Partial<InsertClientInvoice>): Promise<void>;
  
  // Portal user operations
  getPortalUserByEmail(orgId: string, email: string): Promise<PortalUser | undefined>;
  getPortalUserById(id: string): Promise<PortalUser | undefined>;
  createPortalUser(user: InsertPortalUser): Promise<PortalUser>;
  updatePortalUser(id: string, updates: Partial<InsertPortalUser>): Promise<PortalUser>;
  createPortalSession(session: InsertPortalSession): Promise<PortalSession>;
  getPortalSessionByToken(token: string): Promise<PortalSession | undefined>;
  invalidatePortalSession(token: string): Promise<void>;
  getPortalUserProperties(portalUserId: string): Promise<PortalUserProperty[]>;
  
  // Community operations
  getCommunities(): Promise<Community[]>;
  getCommunity(id: number): Promise<Community | undefined>;
  createCommunity(community: InsertCommunity, userId: string): Promise<Community>;
  updateCommunity(id: number, community: Partial<InsertCommunity>): Promise<Community>;
  deleteCommunity(id: number): Promise<void>;
  getAllCommunitiesForSuperAdmin(): Promise<any[]>;
  
  // Community Documents operations
  getCommunityDocuments(communityId: number): Promise<CommunityDocument[]>;
  getCommunityDocument(id: number): Promise<CommunityDocument | undefined>;
  createCommunityDocument(doc: InsertCommunityDocument): Promise<CommunityDocument>;
  deleteCommunityDocument(id: number): Promise<void>;
  
  // Property operations
  getProperties(includeInactive?: boolean): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  createProperty(property: InsertProperty, userId: string): Promise<Property>;
  updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property>;
  deleteProperty(id: number): Promise<void>;
  
  // Room operations
  getRoomsByProperty(propertyId: number): Promise<Room[]>;
  getRoom(id: number): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: number, room: Partial<InsertRoom>): Promise<Room>;
  deleteRoom(id: number): Promise<void>;
  
  // Room supply operations
  getRoomSupplies(roomId: number): Promise<RoomSupply[]>;
  getPropertySupplies(propertyId: number): Promise<any[]>;
  createRoomSupply(supply: InsertRoomSupply): Promise<RoomSupply>;
  updateRoomSupply(id: number, supply: Partial<InsertRoomSupply>): Promise<RoomSupply>;
  deleteRoomSupply(id: number): Promise<void>;
  
  // Property report operations
  getPropertyDevices(propertyId: number): Promise<any[]>;
  getPropertyFixtures(propertyId: number): Promise<any[]>;
  getPropertySurfaceLinks(propertyId: number): Promise<any[]>;
  getPropertyShoppingList(propertyId: number): Promise<any>;
  
  // Room note operations
  getRoomNotes(roomId: number): Promise<RoomNote[]>;
  getPropertyNotes(propertyId: string): Promise<any[]>;
  createRoomNote(note: InsertRoomNote): Promise<RoomNote>;
  updateRoomNote(id: number, note: Partial<InsertRoomNote>): Promise<RoomNote>;
  deleteRoomNote(id: number): Promise<void>;
  
  // Room device operations
  getRoomDevices(roomId: number): Promise<RoomDevice[]>;
  createRoomDevice(device: InsertRoomDevice): Promise<RoomDevice>;
  updateRoomDevice(id: number, device: Partial<InsertRoomDevice>): Promise<RoomDevice>;
  deleteRoomDevice(id: number): Promise<void>;
  
  // Room surface operations
  getRoomSurfaces(roomId: number): Promise<RoomSurface[]>;
  createRoomSurface(surface: InsertRoomSurface): Promise<RoomSurface>;
  updateRoomSurface(id: number, surface: Partial<InsertRoomSurface>): Promise<RoomSurface>;
  deleteRoomSurface(id: number): Promise<void>;
  
  // Room surface link operations
  getRoomSurfaceLinks(roomId: number): Promise<RoomSurfaceLink[]>;
  createRoomSurfaceLink(link: InsertRoomSurfaceLink): Promise<RoomSurfaceLink>;
  updateRoomSurfaceLink(id: number, link: Partial<InsertRoomSurfaceLink>): Promise<RoomSurfaceLink>;
  deleteRoomSurfaceLink(id: number): Promise<void>;
  
  // Room fixture operations
  getRoomFixtures(roomId: number): Promise<RoomFixture[]>;
  createRoomFixture(fixture: InsertRoomFixture): Promise<RoomFixture>;
  updateRoomFixture(id: number, fixture: Partial<InsertRoomFixture>): Promise<RoomFixture>;
  deleteRoomFixture(id: number): Promise<void>;
  
  // Room photo operations
  getRoomPhotos(roomId: number): Promise<RoomPhoto[]>;
  createRoomPhoto(photo: InsertRoomPhoto): Promise<RoomPhoto>;
  deleteRoomPhoto(id: number): Promise<void>;
  
  // Room checklist operations
  getRoomChecklists(roomId: number): Promise<RoomChecklist[]>;
  createRoomChecklist(checklist: InsertRoomChecklist): Promise<RoomChecklist>;
  updateRoomChecklist(id: number, checklist: Partial<InsertRoomChecklist>): Promise<RoomChecklist>;
  deleteRoomChecklist(id: number): Promise<void>;
  
  // Property access items operations
  getPropertyAccessItems(propertyId: number): Promise<SelectPropertyAccessItem[]>;
  createPropertyAccessItem(item: InsertPropertyAccessItem): Promise<SelectPropertyAccessItem>;
  updatePropertyAccessItem(id: number, item: Partial<InsertPropertyAccessItem>): Promise<SelectPropertyAccessItem>;
  deletePropertyAccessItem(id: number): Promise<void>;
  
  // Vehicle operations
  getVehicles(propertyId: number): Promise<Vehicle[]>;
  getVehicle(id: number): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: number, vehicle: Partial<InsertVehicle>): Promise<Vehicle>;
  deleteVehicle(id: number): Promise<void>;
  
  // Vehicle maintenance operations
  getVehicleMaintenance(vehicleId: number): Promise<VehicleMaintenance[]>;
  createVehicleMaintenance(maintenance: InsertVehicleMaintenance): Promise<VehicleMaintenance>;
  updateVehicleMaintenance(id: number, maintenance: Partial<InsertVehicleMaintenance>): Promise<VehicleMaintenance>;
  deleteVehicleMaintenance(id: number): Promise<void>;
  
  // Vehicle note operations
  getVehicleNotes(vehicleId: number): Promise<VehicleNote[]>;
  createVehicleNote(note: InsertVehicleNote): Promise<VehicleNote>;
  updateVehicleNote(id: number, note: Partial<InsertVehicleNote>): Promise<VehicleNote>;
  deleteVehicleNote(id: number): Promise<void>;
  
  // Vehicle photo operations
  getVehiclePhotos(vehicleId: number): Promise<VehiclePhoto[]>;
  createVehiclePhoto(photo: InsertVehiclePhoto): Promise<VehiclePhoto>;
  deleteVehiclePhoto(id: number): Promise<void>;
  
  // Task operations
  getTasks(): Promise<Task[]>;
  getTasksByProperty(propertyId: number): Promise<Task[]>;
  getTasksByUser(userId: string): Promise<Task[]>;
  getUrgentTasks(): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task>;
  assignTask(taskId: number, userId: string, assignedById: string): Promise<Task>;
  completeTask(taskId: number): Promise<Task>;
  archiveTask(taskId: number, userId: string): Promise<Task>;
  unarchiveTask(taskId: number, userId: string): Promise<Task>;
  deleteTask(taskId: number): Promise<void>;
  checkTaskConflicts(assignedUserId: string, dueDate: string, timeEstimate: string, excludeTaskId?: number): Promise<any[]>;
  getTaskChecklistItems(taskId: number): Promise<TaskChecklistItem[]>;
  
  // Task comment operations
  getTaskComments(taskId: number): Promise<any[]>;
  createTaskComment(comment: InsertTaskComment): Promise<TaskComment>;
  updateTaskComment(id: number, userId: string, text: string): Promise<TaskComment>;
  deleteTaskComment(id: number, userId: string): Promise<void>;
  
  // Time tracking operations
  getTimeEntries(orgId: string, filters?: { userId?: string; propertyId?: number; taskId?: number; startDate?: string; endDate?: string }): Promise<TimeEntry[]>;
  getActiveTimeEntry(userId: string): Promise<TimeEntry | undefined>;
  getTimeEntry(id: number): Promise<TimeEntry | undefined>;
  createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: number, entry: Partial<InsertTimeEntry>): Promise<TimeEntry>;
  clockOut(id: number, clockOutTime: Date): Promise<TimeEntry>;
  deleteTimeEntry(id: number): Promise<void>;
  
  // Contact operations
  getContacts(includeInactive?: boolean): Promise<Contact[]>;
  getContactsByProperty(propertyId: number): Promise<Contact[]>;
  getContact(id: number): Promise<Contact | undefined>;
  createContact(contact: InsertContact, userId: string): Promise<Contact>;
  updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact>;
  deleteContact(id: number): Promise<void>;
  
  // Contact-Property relationship operations
  getContactProperties(contactId: number): Promise<any[]>;
  linkContactToProperty(contactId: number, propertyId: number, isPrimary?: boolean, relationship?: string): Promise<ContactProperty>;
  unlinkContactFromProperty(contactId: number, propertyId: number): Promise<void>;
  deleteContactProperty(relationshipId: number): Promise<void>;
  setPrimaryProperty(contactId: number, propertyId: number): Promise<void>;
  setPrimaryContactForProperty(propertyId: number, contactId: number): Promise<void>;
  bulkMoveContactsToProperty(contactIds: number[], oldPropertyId: number, newPropertyId: number): Promise<void>;
  
  // Alert operations
  getAlerts(orgId: string, filters?: { type?: string; entityId?: number; isActive?: boolean }): Promise<Alert[]>;
  getAlertsByEntity(orgId: string, type: "client" | "property" | "task", entityId: number, userId?: string, userRole?: string): Promise<Alert[]>;
  getAlert(id: number, orgId: string): Promise<Alert | undefined>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlert(id: number, orgId: string, alert: Partial<InsertAlert>): Promise<Alert>;
  deleteAlert(id: number, orgId: string): Promise<void>;
  
  // System Alert operations
  getSystemAlertsForUser(orgId: string, userId: string, userRole: string): Promise<SystemAlert[]>;
  getSystemAlert(id: number, orgId: string): Promise<SystemAlert | undefined>;
  getAllSystemAlerts(orgId: string): Promise<SystemAlert[]>;
  createSystemAlert(alert: InsertSystemAlert): Promise<SystemAlert>;
  updateSystemAlert(id: number, orgId: string, alert: Partial<InsertSystemAlert>): Promise<SystemAlert>;
  deleteSystemAlert(id: number, orgId: string): Promise<void>;
  acknowledgeSystemAlert(alertId: number, userId: string): Promise<SystemAlertAcknowledgement>;
  hasUserAcknowledgedAlert(alertId: number, userId: string): Promise<boolean>;
  
  // Team message operations
  getTeamMessages(limit?: number): Promise<TeamMessage[]>;
  createTeamMessage(message: InsertTeamMessage): Promise<TeamMessage>;
  updateTeamMessage(id: number, content: string, userId: string): Promise<TeamMessage>;
  deleteTeamMessage(id: number, userId: string): Promise<void>;
  toggleReaction(messageId: number, userId: string, reaction: string): Promise<any>;
  
  // Message mention operations
  createMentions(messageId: number, mentionedUserIds: string[]): Promise<void>;
  deleteMentions(messageId: number): Promise<void>;
  getMentionedMessages(userId: string): Promise<any[]>;
  markMentionAsRead(mentionId: number, userId: string): Promise<void>;
  
  // User notification preferences operations
  getUserNotificationPreferences(userId: string): Promise<UserNotificationPreferences | null>;
  upsertUserNotificationPreferences(preferences: InsertUserNotificationPreferences): Promise<UserNotificationPreferences>;
  
  // Activity log operations
  getRecentActivity(limit?: number): Promise<ActivityLog[]>;
  logActivity(activity: InsertActivityLog): Promise<ActivityLog>;
  
  // Dashboard stats
  getDashboardStats(): Promise<{
    totalProperties: number;
    urgentTasks: number;
    completedToday: number;
    activeTeam: number;
  }>;
  
  // Search operations
  globalSearch(query: string): Promise<{
    properties: Property[];
    tasks: Task[];
    contacts: Contact[];
  }>;
  
  // Forms operations
  getFormsWithFields(): Promise<any[]>;
  getFormBySlug(slug: string): Promise<any>;
  createForm(form: any): Promise<any>;
  createFormFields(formId: number, fields: any[]): Promise<void>;
  deleteForm(formId: number, userId: string): Promise<void>;
  createFormSubmission(submission: InsertFormSubmission): Promise<FormSubmission>;
  
  // Property Portal Settings operations
  getPropertyPortalSettings(orgId: string, propertyId: number): Promise<PropertyPortalSettings[]>;
  getLatestPropertyPortalSettings(orgId: string, propertyId: number, status?: string): Promise<PropertyPortalSettings | undefined>;
  createPropertyPortalSettings(settings: InsertPropertyPortalSettings): Promise<PropertyPortalSettings>;
  updatePropertyPortalSettings(id: string, settings: Partial<InsertPropertyPortalSettings>): Promise<PropertyPortalSettings>;
  publishPropertyPortalSettings(orgId: string, propertyId: number, version: number): Promise<PropertyPortalSettings>;
  
  // Duplicate detection operations
  scanForDuplicates(criteria: any): Promise<any[]>;
  getDuplicates(): Promise<any[]>;
  ignoreDuplicate(recordType: string, recordIds: number[], userId: string, reason?: string, notes?: string): Promise<void>;
  getDuplicateHistory(): Promise<DuplicateHistory[]>;
  addDuplicateHistory(action: string, recordType: string, recordIds: number[], userId: string, details?: any, notes?: string): Promise<void>;
  
  // Calendar operations
  getCalendars(orgId: string): Promise<Calendar[]>;
  getCalendar(id: string): Promise<Calendar | undefined>;
  createCalendar(calendar: InsertCalendar): Promise<Calendar>;
  updateCalendar(id: string, calendar: Partial<InsertCalendar>): Promise<Calendar>;
  deleteCalendar(id: string): Promise<void>;
  
  // Event operations
  getEvents(orgId: string, startDate?: Date, endDate?: Date, calendarId?: string): Promise<Event[]>;
  getOrgEvents(orgId: string): Promise<any[]>; // Get all events with calendar info for iCal feeds
  getEvent(id: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: string): Promise<void>;
  
  // Event attendee operations
  getEventAttendees(eventId: string): Promise<EventAttendee[]>;
  addEventAttendee(attendee: InsertEventAttendee): Promise<EventAttendee>;
  updateEventAttendee(id: number, attendee: Partial<InsertEventAttendee>): Promise<EventAttendee>;
  removeEventAttendee(id: number): Promise<void>;
  
  // Event reminder operations
  getEventReminders(eventId: string): Promise<EventReminder[]>;
  addEventReminder(reminder: InsertEventReminder): Promise<EventReminder>;
  removeEventReminder(id: number): Promise<void>;
  getPendingReminders(): Promise<any[]>;
  markReminderSent(id: number): Promise<void>;
  
  // ICS feed operations
  getIcsFeed(token: string): Promise<IcsFeed | undefined>;
  createIcsFeed(feed: InsertIcsFeed): Promise<IcsFeed>;
  getIcsFeedsByOrg(orgId: string): Promise<IcsFeed[]>;
  deactivateIcsFeed(id: number): Promise<void>;
  
  // Event import operations
  getEventImports(orgId: string): Promise<EventImport[]>;
  createEventImport(importData: InsertEventImport): Promise<EventImport>;
  updateEventImport(id: number, importData: Partial<InsertEventImport>): Promise<EventImport>;
  deleteEventImport(id: number): Promise<void>;
  
  // Conflict resolution operations
  getConflictResolutions(orgId: string, status?: string): Promise<ConflictResolution[]>;
  getConflictResolution(id: number): Promise<ConflictResolution | undefined>;
  createConflictResolution(data: InsertConflictResolution): Promise<ConflictResolution>;
  updateConflictResolution(id: number, data: Partial<InsertConflictResolution>): Promise<ConflictResolution>;
  deleteConflictResolution(id: number): Promise<void>;
  approveConflictResolution(id: number, supervisorId: string, notes?: string): Promise<ConflictResolution>;
  rejectConflictResolution(id: number, supervisorId: string, notes?: string): Promise<ConflictResolution>;
  resolveConflictResolution(id: number, notes?: string): Promise<ConflictResolution>;
  getPendingConflictsByUser(userId: string): Promise<ConflictResolution[]>;
  
  // Stripe operations - Master billing (Hubify billing organizations)
  getOrgSubscription(orgId: string): Promise<OrgSubscription | undefined>;
  getAllOrgSubscriptions(): Promise<OrgSubscription[]>;
  updateOrgSubscription(orgId: string, subscription: Partial<InsertOrgSubscription>): Promise<OrgSubscription>;
  upsertOrgSubscription(orgId: string, subscription: InsertOrgSubscription): Promise<OrgSubscription>;
  
  // Stripe operations - Per-organization connections
  getOrgStripeConnection(orgId: string): Promise<OrgStripeConnection | undefined>;
  createOrgStripeConnection(connection: InsertOrgStripeConnection): Promise<OrgStripeConnection>;
  updateOrgStripeConnection(orgId: string, connection: Partial<InsertOrgStripeConnection>): Promise<OrgStripeConnection>;
  deleteOrgStripeConnection(orgId: string): Promise<void>;
  
  // Stripe webhook operations
  recordWebhookEvent(event: InsertStripeWebhookEvent): Promise<StripeWebhookEvent>;
  markWebhookProcessed(stripeEventId: string, error?: string): Promise<void>;
  getUnprocessedWebhooks(limit?: number): Promise<StripeWebhookEvent[]>;
  
  // Platform invoice operations (Admin → Organizations)
  getPlatformInvoices(orgId?: string, status?: PlatformInvoice["status"]): Promise<PlatformInvoice[]>;
  getPlatformInvoice(id: string, orgId?: string): Promise<PlatformInvoice | undefined>;
  createPlatformInvoice(invoice: InsertPlatformInvoice): Promise<PlatformInvoice>;
  updatePlatformInvoice(id: string, invoice: Partial<InsertPlatformInvoice>, orgId?: string): Promise<PlatformInvoice>;
  deletePlatformInvoice(id: string, orgId?: string): Promise<void>;
  
  // Client invoice operations (Organizations → Clients)
  getClientInvoices(orgId: string, clientId?: string, status?: ClientInvoice["status"]): Promise<ClientInvoice[]>;
  getClientInvoice(orgId: string, id: string): Promise<ClientInvoice | undefined>;
  createClientInvoice(invoice: InsertClientInvoice): Promise<ClientInvoice>;
  updateClientInvoice(orgId: string, id: string, invoice: Partial<InsertClientInvoice>): Promise<ClientInvoice>;
  deleteClientInvoice(orgId: string, id: string): Promise<void>;
  
  // Security & Compliance operations
  getAuditLogs(params: {
    limit: number;
    offset: number;
    severity?: string;
    actionType?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<any[]>;
  getAdminUsers(): Promise<any[]>;
  getUserSessions(userId: string): Promise<any[]>;
  getAllActiveSessions(): Promise<any[]>;
  
  // Import history operations
  createImportHistory(history: InsertImportHistory): Promise<ImportHistory>;
  getImportHistory(orgId: string): Promise<any[]>;
  
  // Platform template operations
  getPlatformTemplates(): Promise<PlatformTemplate[]>;
  getPlatformTemplate(id: number): Promise<PlatformTemplate | undefined>;
  getPlatformTemplateByType(type: string): Promise<PlatformTemplate | undefined>;
  createPlatformTemplate(template: InsertPlatformTemplate): Promise<PlatformTemplate>;
  updatePlatformTemplate(id: number, template: Partial<InsertPlatformTemplate>): Promise<PlatformTemplate>;
  deletePlatformTemplate(id: number): Promise<void>;
  
  // Calendar report template operations
  getCalendarReportTemplates(): Promise<CalendarReportTemplate[]>;
  getCalendarReportTemplate(id: number): Promise<CalendarReportTemplate | undefined>;
  getDefaultCalendarReportTemplate(): Promise<CalendarReportTemplate | undefined>;
  createCalendarReportTemplate(template: InsertCalendarReportTemplate): Promise<CalendarReportTemplate>;
  updateCalendarReportTemplate(id: number, template: Partial<InsertCalendarReportTemplate>): Promise<CalendarReportTemplate>;
  deleteCalendarReportTemplate(id: number): Promise<void>;
  
  // Support request operations
  createSupportRequest(request: InsertSupportRequest): Promise<SupportRequest>;
  getSupportRequests(): Promise<SupportRequest[]>;
  getSupportRequest(id: number): Promise<SupportRequest | undefined>;
  updateSupportRequestStatus(id: number, status: "new"|"in_progress"|"resolved"): Promise<SupportRequest>;
  
  // Email template operations
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  getEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplate(id: number): Promise<EmailTemplate | undefined>;
  getEmailTemplateByType(type: "ticket_receipt"|"ticket_notification"|"status_update"): Promise<EmailTemplate | undefined>;
  updateEmailTemplate(id: number, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate>;
  deleteEmailTemplate(id: number): Promise<void>;
  
  // Custom field operations
  getCustomFields(orgId: string, entityType?: "task"|"property"|"contact"): Promise<CustomField[]>;
  getCustomField(id: number, orgId: string): Promise<CustomField | undefined>;
  createCustomField(field: InsertCustomField): Promise<CustomField>;
  updateCustomField(id: number, orgId: string, field: Partial<Omit<InsertCustomField, "orgId"|"fieldKey">>): Promise<CustomField>;
  deleteCustomField(id: number, orgId: string): Promise<void>;
  reorderCustomFields(orgId: string, fieldIds: number[]): Promise<void>;
  
  // Admin note search
  searchAllNotes(orgId: string, searchQuery: string): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isActive, true)).orderBy(users.firstName, users.lastName);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if user exists by ID first
    let existing = await this.getUser(userData.id);
    
    // If not found by ID, check by email (important for OIDC where sub might change)
    if (!existing && userData.email) {
      existing = await this.getUserByEmail(userData.email);
    }
    
    if (existing) {
      // Update existing user (keep existing ID to avoid primary key conflicts)
      const [user] = await db
        .update(users)
        .set({ 
          ...userData, 
          id: existing.id, // Always preserve the existing ID
          updatedAt: new Date() 
        })
        .where(eq(users.id, existing.id))
        .returning();
      return user;
    } else {
      // Insert new user
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      return user;
    }
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getUserTaskStats(userId: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    activeTasks: number;
    overdueTasks: number;
  }> {
    // Get all tasks assigned to this user
    const allTasks = await db.select().from(tasks).where(eq(tasks.assignedToId, userId));
    
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(task => task.status === 'completed').length;
    const activeTasks = allTasks.filter(task => task.status === 'in_progress' || task.status === 'pending').length;
    const overdueTasks = allTasks.filter(task => 
      task.dueDate && 
      new Date(task.dueDate) < new Date() && 
      task.status !== 'completed'
    ).length;

    return {
      totalTasks,
      completedTasks,
      activeTasks,
      overdueTasks
    };
  }

  // Out-of-office operations
  async getOutOfOfficePeriods(userId: string): Promise<OutOfOfficePeriod[]> {
    return await db
      .select()
      .from(outOfOfficePeriods)
      .where(and(
        eq(outOfOfficePeriods.userId, userId),
        eq(outOfOfficePeriods.isActive, true)
      ))
      .orderBy(desc(outOfOfficePeriods.startDate));
  }

  async getActiveOutOfOfficePeriod(userId: string, date?: Date): Promise<OutOfOfficePeriod | undefined> {
    const checkDate = date || new Date();
    const [period] = await db
      .select()
      .from(outOfOfficePeriods)
      .where(and(
        eq(outOfOfficePeriods.userId, userId),
        eq(outOfOfficePeriods.isActive, true),
        sql`${outOfOfficePeriods.startDate} <= ${checkDate}`,
        sql`${outOfOfficePeriods.endDate} >= ${checkDate}`
      ));
    return period;
  }

  async createOutOfOfficePeriod(period: InsertOutOfOfficePeriod): Promise<OutOfOfficePeriod> {
    const [created] = await db.insert(outOfOfficePeriods).values(period).returning();
    return created;
  }

  async updateOutOfOfficePeriod(id: number, periodData: Partial<InsertOutOfOfficePeriod>): Promise<OutOfOfficePeriod> {
    const [updated] = await db
      .update(outOfOfficePeriods)
      .set({ ...periodData, updatedAt: new Date() })
      .where(eq(outOfOfficePeriods.id, id))
      .returning();
    return updated;
  }

  async deleteOutOfOfficePeriod(id: number): Promise<void> {
    await db
      .update(outOfOfficePeriods)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(outOfOfficePeriods.id, id));
  }

  async getUsersOutOfOffice(orgId: string, startDate: Date, endDate: Date): Promise<User[]> {
    // Find all users who have active out-of-office periods overlapping with the date range
    const periods = await db
      .select()
      .from(outOfOfficePeriods)
      .where(and(
        eq(outOfOfficePeriods.orgId, orgId),
        eq(outOfOfficePeriods.isActive, true),
        or(
          and(
            sql`${outOfOfficePeriods.startDate} <= ${endDate}`,
            sql`${outOfOfficePeriods.endDate} >= ${startDate}`
          )
        )
      ));

    if (periods.length === 0) return [];

    const userIds = Array.from(new Set(periods.map(p => p.userId)));
    return await db.select().from(users).where(sql`${users.id} = ANY(${userIds})`);
  }

  // Team operations
  async getTeams(orgId: string): Promise<Team[]> {
    return await db
      .select()
      .from(teams)
      .where(and(eq(teams.orgId, orgId), eq(teams.isActive, true)))
      .orderBy(desc(teams.createdAt));
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async getTeamWithMembers(id: string): Promise<(Team & { members: (TeamMember & { user: User })[] }) | undefined> {
    const team = await this.getTeam(id);
    if (!team) return undefined;

    const members = await this.getTeamMembers(id);
    return { ...team, members };
  }

  async getUserTeams(userId: string): Promise<Team[]> {
    // Get all teams where the user is a member
    const memberships = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));

    if (memberships.length === 0) return [];

    const teamIds = memberships.map(m => m.teamId);
    return await db
      .select()
      .from(teams)
      .where(and(
        sql`${teams.id} = ANY(${teamIds})`,
        eq(teams.isActive, true)
      ))
      .orderBy(desc(teams.createdAt));
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values(team).returning();
    return newTeam;
  }

  async updateTeam(id: string, teamData: Partial<InsertTeam>): Promise<Team> {
    const [updated] = await db
      .update(teams)
      .set({ ...teamData, updatedAt: new Date() })
      .where(eq(teams.id, id))
      .returning();
    return updated;
  }

  async deleteTeam(id: string): Promise<void> {
    await db.update(teams).set({ isActive: false }).where(eq(teams.id, id));
  }

  async addTeamMember(teamMember: InsertTeamMember): Promise<TeamMember> {
    const [newMember] = await db.insert(teamMembers).values(teamMember).returning();
    return newMember;
  }

  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    await db
      .delete(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ));
  }

  async getTeamMembers(teamId: string): Promise<(TeamMember & { user: User })[]> {
    const members = await db
      .select({
        id: teamMembers.id,
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        role: teamMembers.role,
        assignedAt: teamMembers.assignedAt,
        user: users,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId))
      .orderBy(teamMembers.assignedAt);

    return members;
  }

  async updateTeamMemberRole(teamId: string, userId: string, role: 'lead' | 'member'): Promise<TeamMember> {
    const [updated] = await db
      .update(teamMembers)
      .set({ role })
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ))
      .returning();
    return updated;
  }

  // Organization operations
  async getOrgs(): Promise<Org[]> {
    return await db.select().from(orgs).where(eq(orgs.isActive, true)).orderBy(orgs.name);
  }

  async getOrg(id: string): Promise<Org | undefined> {
    const [org] = await db.select().from(orgs).where(eq(orgs.id, id));
    return org;
  }

  async createOrg(orgData: InsertOrg): Promise<Org> {
    const [org] = await db.insert(orgs).values(orgData).returning();
    return org;
  }

  async updateOrg(id: string, orgData: Partial<InsertOrg>): Promise<Org> {
    const [org] = await db
      .update(orgs)
      .set({ ...orgData, updatedAt: new Date() })
      .where(eq(orgs.id, id))
      .returning();
    return org;
  }

  async getOrgSubscription(orgId: string): Promise<OrgSubscription | undefined> {
    const [subscription] = await db
      .select()
      .from(orgSubscriptions)
      .where(eq(orgSubscriptions.orgId, orgId));
    return subscription;
  }

  async upsertOrgSubscription(subscriptionData: InsertOrgSubscription): Promise<OrgSubscription> {
    const [subscription] = await db
      .insert(orgSubscriptions)
      .values(subscriptionData)
      .onConflictDoUpdate({
        target: orgSubscriptions.orgId,
        set: subscriptionData,
      })
      .returning();
    return subscription;
  }

  async getOrgSupplySettings(id: string): Promise<{ supplyTypes: string[]; supplyUnits: string[] } | undefined> {
    const [org] = await db
      .select({
        supplyTypes: orgs.supplyTypes,
        supplyUnits: orgs.supplyUnits,
      })
      .from(orgs)
      .where(eq(orgs.id, id));
    
    if (!org) return undefined;
    
    return {
      supplyTypes: org.supplyTypes as string[] || [],
      supplyUnits: org.supplyUnits as string[] || [],
    };
  }

  async updateOrgSupplySettings(id: string, settings: { supplyTypes?: string[]; supplyUnits?: string[] }): Promise<{ supplyTypes: string[]; supplyUnits: string[] } | undefined> {
    const updateData: any = { updatedAt: new Date() };
    
    if (settings.supplyTypes !== undefined) {
      updateData.supplyTypes = settings.supplyTypes;
    }
    if (settings.supplyUnits !== undefined) {
      updateData.supplyUnits = settings.supplyUnits;
    }
    
    const [org] = await db
      .update(orgs)
      .set(updateData)
      .where(eq(orgs.id, id))
      .returning({
        supplyTypes: orgs.supplyTypes,
        supplyUnits: orgs.supplyUnits,
      });
    
    if (!org) return undefined;
    
    return {
      supplyTypes: org.supplyTypes as string[] || [],
      supplyUnits: org.supplyUnits as string[] || [],
    };
  }

  // Client operations
  async getClients(orgId: string): Promise<Client[]> {
    return await db
      .select()
      .from(clients)
      .where(and(eq(clients.orgId, orgId), eq(clients.isActive, true)))
      .orderBy(clients.firstName, clients.lastName);
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(clientData: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(clientData).returning();
    return client;
  }

  async updateClient(id: string, clientData: Partial<InsertClient>): Promise<Client> {
    const [client] = await db
      .update(clients)
      .set({ ...clientData, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return client;
  }

  // Recurring billing schedule operations
  async createRecurringSchedule(scheduleData: InsertRecurringBillingSchedule): Promise<RecurringBillingSchedule> {
    const [schedule] = await db
      .insert(recurringBillingSchedules)
      .values(scheduleData)
      .returning();
    return schedule;
  }

  async getRecurringSchedulesByClient(clientId: string): Promise<RecurringBillingSchedule[]> {
    return await db
      .select()
      .from(recurringBillingSchedules)
      .where(and(
        eq(recurringBillingSchedules.clientId, clientId),
        eq(recurringBillingSchedules.isActive, true)
      ))
      .orderBy(recurringBillingSchedules.nextBillingDate);
  }

  async getRecurringSchedule(id: string): Promise<RecurringBillingSchedule | undefined> {
    const [schedule] = await db
      .select()
      .from(recurringBillingSchedules)
      .where(eq(recurringBillingSchedules.id, id));
    return schedule;
  }

  async updateRecurringSchedule(id: string, scheduleData: Partial<InsertRecurringBillingSchedule>): Promise<RecurringBillingSchedule> {
    const [schedule] = await db
      .update(recurringBillingSchedules)
      .set({ ...scheduleData, updatedAt: new Date() } as any)
      .where(eq(recurringBillingSchedules.id, id))
      .returning();
    return schedule;
  }

  async deleteRecurringSchedule(id: string): Promise<void> {
    await db
      .update(recurringBillingSchedules)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(recurringBillingSchedules.id, id));
  }

  async getDueRecurringSchedules(beforeDate: Date): Promise<RecurringBillingSchedule[]> {
    return await db
      .select()
      .from(recurringBillingSchedules)
      .where(and(
        eq(recurringBillingSchedules.isActive, true),
        sql`${recurringBillingSchedules.nextBillingDate} <= ${beforeDate}`
      ))
      .orderBy(recurringBillingSchedules.nextBillingDate);
  }

  // Billing submission operations
  async createBillingSubmission(submissionData: InsertBillingSubmission): Promise<BillingSubmission> {
    const [submission] = await db
      .insert(billingSubmissions)
      .values(submissionData)
      .returning();
    return submission;
  }

  async getBillingSubmissions(orgId: string, filters?: { status?: string; clientId?: string }): Promise<any[]> {
    const conditions = [eq(billingSubmissions.orgId, orgId)];
    
    if (filters?.status) {
      conditions.push(eq(billingSubmissions.status, filters.status as any));
    }
    
    if (filters?.clientId) {
      conditions.push(eq(billingSubmissions.clientId, filters.clientId));
    }
    
    const submissions = await db
      .select()
      .from(billingSubmissions)
      .where(and(...conditions))
      .orderBy(desc(billingSubmissions.createdAt));
    
    // Fetch related clients and properties individually for each submission
    const results = await Promise.all(
      submissions.map(async (submission) => {
        const client = submission.clientId
          ? (await db.select().from(contacts).where(eq(contacts.accountId, submission.clientId)))[0]
          : null;
        const property = submission.propertyId
          ? (await db.select().from(properties).where(eq(properties.id, submission.propertyId)))[0]
          : null;
        
        return {
          ...submission,
          client,
          property,
        };
      })
    );
    
    return results;
  }

  async getBillingSubmissionsByClient(clientId: string): Promise<BillingSubmission[]> {
    return await db
      .select()
      .from(billingSubmissions)
      .where(eq(billingSubmissions.clientId, clientId))
      .orderBy(desc(billingSubmissions.createdAt));
  }

  async getBillingSubmissionsByInvoice(invoiceId: string): Promise<BillingSubmission[]> {
    return await db
      .select()
      .from(billingSubmissions)
      .where(eq(billingSubmissions.invoiceId, invoiceId))
      .orderBy(desc(billingSubmissions.createdAt));
  }

  async getBillingSubmission(id: string): Promise<BillingSubmission | undefined> {
    const [submission] = await db
      .select()
      .from(billingSubmissions)
      .where(eq(billingSubmissions.id, id));
    return submission;
  }

  async updateBillingSubmission(id: string, updates: Partial<InsertBillingSubmission>): Promise<BillingSubmission> {
    const [submission] = await db
      .update(billingSubmissions)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(billingSubmissions.id, id))
      .returning();
    return submission;
  }

  async authorizeBillingSubmission(id: string, authorizedBy: string): Promise<BillingSubmission> {
    const [submission] = await db
      .update(billingSubmissions)
      .set({
        status: 'authorized',
        authorizedBy,
        authorizedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(billingSubmissions.id, id))
      .returning();
    return submission;
  }

  async rejectBillingSubmission(id: string, rejectionReason: string): Promise<BillingSubmission> {
    const [submission] = await db
      .update(billingSubmissions)
      .set({
        status: 'rejected',
        rejectionReason,
        updatedAt: new Date(),
      })
      .where(eq(billingSubmissions.id, id))
      .returning();
    return submission;
  }

  // Client invoice operations
  async createClientInvoice(invoiceData: InsertClientInvoice): Promise<ClientInvoice> {
    const [invoice] = await db
      .insert(clientInvoices)
      .values(invoiceData)
      .returning();
    return invoice;
  }

  async getClientInvoices(orgId: string, filters?: { status?: string; clientId?: string }): Promise<ClientInvoice[]> {
    const conditions = [eq(clientInvoices.orgId, orgId)];
    
    if (filters?.status) {
      conditions.push(eq(clientInvoices.status, filters.status as any));
    }
    
    if (filters?.clientId) {
      conditions.push(eq(clientInvoices.clientId, filters.clientId));
    }
    
    return await db
      .select()
      .from(clientInvoices)
      .where(and(...conditions))
      .orderBy(desc(clientInvoices.createdAt));
  }

  async getClientInvoicesByClient(clientId: string): Promise<ClientInvoice[]> {
    return await db
      .select()
      .from(clientInvoices)
      .where(eq(clientInvoices.clientId, clientId))
      .orderBy(desc(clientInvoices.createdAt));
  }

  async getClientInvoice(id: string): Promise<ClientInvoice | undefined> {
    const [invoice] = await db
      .select()
      .from(clientInvoices)
      .where(eq(clientInvoices.id, id));
    return invoice;
  }

  async updateClientInvoice(id: string, invoiceData: Partial<InsertClientInvoice>): Promise<ClientInvoice> {
    const [invoice] = await db
      .update(clientInvoices)
      .set({ ...invoiceData, updatedAt: new Date() } as any)
      .where(eq(clientInvoices.id, id))
      .returning();
    return invoice;
  }

  async updateInvoicePaymentStatus(invoiceId: string, updates: Partial<InsertClientInvoice>): Promise<ClientInvoice> {
    const [invoice] = await db
      .update(clientInvoices)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(clientInvoices.id, invoiceId))
      .returning();
    return invoice;
  }

  async getClientInvoiceByStripePaymentIntent(paymentIntentId: string): Promise<ClientInvoice | undefined> {
    const [invoice] = await db
      .select()
      .from(clientInvoices)
      .where(eq(clientInvoices.stripePaymentIntentId, paymentIntentId));
    return invoice;
  }

  async updateInvoicePaymentStatusByStripePaymentIntent(paymentIntentId: string, updates: Partial<InsertClientInvoice>): Promise<void> {
    await db
      .update(clientInvoices)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(clientInvoices.stripePaymentIntentId, paymentIntentId));
  }

  // Portal user operations
  async getPortalUserByEmail(orgId: string, email: string): Promise<PortalUser | undefined> {
    const [user] = await db
      .select()
      .from(portalUsers)
      .where(and(eq(portalUsers.orgId, orgId), eq(portalUsers.email, email)));
    return user;
  }

  async getPortalUserById(id: string): Promise<PortalUser | undefined> {
    const [user] = await db
      .select()
      .from(portalUsers)
      .where(eq(portalUsers.id, id));
    return user;
  }

  async createPortalUser(userData: InsertPortalUser): Promise<PortalUser> {
    const [user] = await db
      .insert(portalUsers)
      .values(userData)
      .returning();
    return user;
  }

  async updatePortalUser(id: string, updates: Partial<InsertPortalUser>): Promise<PortalUser> {
    const [user] = await db
      .update(portalUsers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(portalUsers.id, id))
      .returning();
    return user;
  }

  async createPortalSession(sessionData: InsertPortalSession): Promise<PortalSession> {
    const [session] = await db
      .insert(portalSessions)
      .values(sessionData)
      .returning();
    return session;
  }

  async getPortalSessionByToken(token: string): Promise<PortalSession | undefined> {
    const [session] = await db
      .select()
      .from(portalSessions)
      .where(and(
        eq(portalSessions.token, token),
        eq(portalSessions.isActive, true)
      ));
    return session;
  }

  async invalidatePortalSession(token: string): Promise<void> {
    await db
      .update(portalSessions)
      .set({ isActive: false })
      .where(eq(portalSessions.token, token));
  }

  async getPortalUserProperties(portalUserId: string): Promise<PortalUserProperty[]> {
    return await db
      .select()
      .from(portalUserProperties)
      .where(and(
        eq(portalUserProperties.portalUserId, portalUserId),
        eq(portalUserProperties.isActive, true)
      ));
  }

  async createPortalInvitation(data: InsertPortalInvitation): Promise<PortalInvitation> {
    const [invitation] = await db
      .insert(portalInvitations)
      .values(data)
      .returning();
    return invitation;
  }

  async getPortalInvitationByToken(token: string): Promise<PortalInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(portalInvitations)
      .where(and(
        eq(portalInvitations.token, token),
        eq(portalInvitations.isUsed, false)
      ));
    return invitation;
  }

  async markPortalInvitationUsed(token: string): Promise<void> {
    await db
      .update(portalInvitations)
      .set({ isUsed: true, usedAt: new Date() })
      .where(eq(portalInvitations.token, token));
  }

  async getPortalInvitationsByOrg(orgId: string): Promise<PortalInvitation[]> {
    return await db
      .select()
      .from(portalInvitations)
      .where(eq(portalInvitations.orgId, orgId))
      .orderBy(desc(portalInvitations.createdAt));
  }

  // Community operations
  async getCommunities(): Promise<Community[]> {
    return db.select().from(communities).orderBy(desc(communities.createdAt));
  }

  // Super Admin: Get all communities across all organizations with additional details
  async getAllCommunitiesForSuperAdmin(): Promise<any[]> {
    // Get all communities with manager details
    const allCommunities = await db
      .select({
        id: communities.id,
        name: communities.name,
        address1: communities.address1,
        address2: communities.address2,
        city: communities.city,
        state: communities.state,
        zip: communities.zip,
        notes: communities.notes,
        managerId: communities.managerId,
        hoaPresidentId: communities.hoaPresidentId,
        imageUrl: communities.imageUrl,
        isActive: communities.isActive,
        createdAt: communities.createdAt,
        updatedAt: communities.updatedAt,
        managerFirstName: users.firstName,
        managerLastName: users.lastName,
        managerEmail: users.email,
      })
      .from(communities)
      .leftJoin(users, eq(communities.managerId, users.id))
      .orderBy(desc(communities.createdAt));

    // For each community, get property count and organization details
    const enhancedResults = await Promise.all(
      allCommunities.map(async (community) => {
        // Get property count for this community
        const propertyCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(properties)
          .where(eq(properties.communityId, community.id));

        // Get organizations associated with this community via properties
        const associatedOrgs = await db
          .select({ 
            orgId: properties.orgId,
            orgName: orgs.name 
          })
          .from(properties)
          .leftJoin(orgs, eq(properties.orgId, orgs.id))
          .where(eq(properties.communityId, community.id))
          .groupBy(properties.orgId, orgs.name);

        const organizationNames = associatedOrgs.length > 0 
          ? associatedOrgs.map(org => org.orgName || 'Unknown').join(', ')
          : 'No Properties';

        return {
          ...community,
          propertyCount: propertyCount[0]?.count || 0,
          organizationNames,
          managerName: community.managerFirstName && community.managerLastName 
            ? `${community.managerFirstName} ${community.managerLastName}`
            : 'N/A',
          fullAddress: [community.address1, community.city, community.state, community.zip]
            .filter(Boolean)
            .join(', ') || 'No Address'
        };
      })
    );
    
    return enhancedResults;
  }

  async getCommunity(id: number): Promise<Community | undefined> {
    const [community] = await db
      .select()
      .from(communities)
      .where(eq(communities.id, id));
    return community;
  }

  async createCommunity(communityData: InsertCommunity, userId: string): Promise<Community> {
    const [community] = await db
      .insert(communities)
      .values(communityData)
      .returning();
    
    await this.logActivity({
      userId,
      action: "community_created",
      entityType: "community",
      entityId: community.id.toString(),
      description: `Added community "${community.name}"`
    });
    
    return community;
  }

  async updateCommunity(id: number, communityData: Partial<InsertCommunity>): Promise<Community> {
    const [community] = await db
      .update(communities)
      .set({ ...communityData, updatedAt: new Date() })
      .where(eq(communities.id, id))
      .returning();
    return community;
  }

  async deleteCommunity(id: number): Promise<void> {
    await db.delete(communities).where(eq(communities.id, id));
  }

  // Community Documents operations
  async getCommunityDocuments(communityId: number): Promise<CommunityDocument[]> {
    return await db
      .select()
      .from(communityDocuments)
      .where(eq(communityDocuments.communityId, communityId))
      .orderBy(communityDocuments.documentType);
  }

  async getCommunityDocument(id: number): Promise<CommunityDocument | undefined> {
    const [document] = await db
      .select()
      .from(communityDocuments)
      .where(eq(communityDocuments.id, id));
    return document;
  }

  async createCommunityDocument(doc: InsertCommunityDocument): Promise<CommunityDocument> {
    const [document] = await db
      .insert(communityDocuments)
      .values(doc)
      .returning();
    return document;
  }

  async deleteCommunityDocument(id: number): Promise<void> {
    await db.delete(communityDocuments).where(eq(communityDocuments.id, id));
  }

  // Property operations
  async getProperties(includeInactive: boolean = false): Promise<Property[]> {
    if (includeInactive) {
      return await db.select().from(properties).orderBy(desc(properties.createdAt));
    }
    return await db.select().from(properties).where(eq(properties.isActive, true)).orderBy(desc(properties.createdAt));
  }

  async getProperty(id: number): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property;
  }

  async getPropertyByAddress(address: string, orgId: string): Promise<Property | null> {
    const propertyList = await db.select().from(properties).where(
      and(eq(properties.address, address), eq(properties.orgId, orgId))
    );
    return propertyList[0] || null;
  }

  async createProperty(property: InsertProperty, userId: string | null): Promise<Property> {
    const [newProperty] = await db.insert(properties).values(property).returning();
    
    // Log activity only if we have a valid userId
    if (userId) {
      await this.logActivity({
        userId: userId,
        action: "property_created",
        entityType: "property",
        entityId: newProperty.id.toString(),
        description: `Added property "${newProperty.name}"`,
      });
    }
    
    return newProperty;
  }

  async updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property> {
    const [updatedProperty] = await db
      .update(properties)
      .set({ ...property, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    return updatedProperty;
  }

  async deleteProperty(id: number): Promise<void> {
    await db.update(properties).set({ isActive: false }).where(eq(properties.id, id));
  }

  // Room operations
  async getRoomsByProperty(propertyId: number): Promise<Room[]> {
    return await db.select().from(rooms).where(eq(rooms.propertyId, propertyId));
  }

  async getRoom(id: number): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [newRoom] = await db.insert(rooms).values(room).returning();
    return newRoom;
  }

  async updateRoom(id: number, room: Partial<InsertRoom>): Promise<Room> {
    const [updatedRoom] = await db
      .update(rooms)
      .set({ ...room, updatedAt: new Date() })
      .where(eq(rooms.id, id))
      .returning();
    return updatedRoom;
  }

  async deleteRoom(id: number): Promise<void> {
    await db.delete(rooms).where(eq(rooms.id, id));
  }

  // Room supply operations
  async getRoomSupplies(roomId: number): Promise<RoomSupply[]> {
    return await db.select().from(roomSupplies).where(eq(roomSupplies.roomId, roomId)).orderBy(desc(roomSupplies.createdAt));
  }

  async getPropertySupplies(propertyId: number): Promise<any[]> {
    const supplies = await db
      .select({
        id: roomSupplies.id,
        roomId: roomSupplies.roomId,
        roomName: rooms.name,
        roomType: rooms.type,
        name: roomSupplies.name,
        type: roomSupplies.type,
        brand: roomSupplies.brand,
        model: roomSupplies.model,
        quantity: roomSupplies.quantity,
        unit: roomSupplies.unit,
        location: roomSupplies.location,
        purchaseUrl: roomSupplies.purchaseUrl,
        lastChanged: roomSupplies.lastChanged,
        nextReplacement: roomSupplies.nextReplacement,
        notes: roomSupplies.notes,
        createdAt: roomSupplies.createdAt,
      })
      .from(roomSupplies)
      .leftJoin(rooms, eq(roomSupplies.roomId, rooms.id))
      .where(eq(rooms.propertyId, propertyId))
      .orderBy(rooms.name, roomSupplies.name);
    
    return supplies;
  }

  async createRoomSupply(supply: InsertRoomSupply): Promise<RoomSupply> {
    const [newSupply] = await db.insert(roomSupplies).values(supply).returning();
    return newSupply;
  }

  async updateRoomSupply(id: number, supply: Partial<InsertRoomSupply>): Promise<RoomSupply> {
    const [updatedSupply] = await db
      .update(roomSupplies)
      .set({ ...supply, updatedAt: new Date() })
      .where(eq(roomSupplies.id, id))
      .returning();
    return updatedSupply;
  }

  async deleteRoomSupply(id: number): Promise<void> {
    await db.delete(roomSupplies).where(eq(roomSupplies.id, id));
  }

  // Property report operations
  async getPropertyDevices(propertyId: number): Promise<any[]> {
    const devices = await db
      .select({
        id: roomDevices.id,
        roomId: roomDevices.roomId,
        roomName: rooms.name,
        roomType: rooms.type,
        name: roomDevices.name,
        type: roomDevices.type,
        brand: roomDevices.brand,
        model: roomDevices.model,
        serialNumber: roomDevices.serialNumber,
        location: roomDevices.location,
        purchaseDate: roomDevices.purchaseDate,
        link: roomDevices.link,
        hasWarranty: roomDevices.hasWarranty,
        warrantyStart: roomDevices.warrantyStart,
        warrantyEnd: roomDevices.warrantyEnd,
        requiresServicing: roomDevices.requiresServicing,
        serviceInterval: roomDevices.serviceInterval,
        serviceIntervalUnit: roomDevices.serviceIntervalUnit,
        nextServiceDue: roomDevices.nextServiceDue,
        notes: roomDevices.notes,
        createdAt: roomDevices.createdAt,
      })
      .from(roomDevices)
      .leftJoin(rooms, eq(roomDevices.roomId, rooms.id))
      .where(eq(rooms.propertyId, propertyId))
      .orderBy(rooms.name, roomDevices.name);
    
    return devices;
  }

  async getPropertyFixtures(propertyId: number): Promise<any[]> {
    const fixtures = await db
      .select({
        id: roomFixtures.id,
        roomId: roomFixtures.roomId,
        roomName: rooms.name,
        roomType: rooms.type,
        lightFixtures: roomFixtures.lightFixtures,
        ceilingFans: roomFixtures.ceilingFans,
        smokeDetectors: roomFixtures.smokeDetectors,
        coDetectors: roomFixtures.coDetectors,
        thermostats: roomFixtures.thermostats,
        waterShutoffValves: roomFixtures.waterShutoffValves,
        electricalOutlets: roomFixtures.electricalOutlets,
        lightingNotes: roomFixtures.lightingNotes,
        hvacNotes: roomFixtures.hvacNotes,
        plumbingNotes: roomFixtures.plumbingNotes,
        electricalNotes: roomFixtures.electricalNotes,
        createdAt: roomFixtures.createdAt,
      })
      .from(roomFixtures)
      .leftJoin(rooms, eq(roomFixtures.roomId, rooms.id))
      .where(eq(rooms.propertyId, propertyId))
      .orderBy(rooms.name);
    
    return fixtures;
  }

  async getPropertySurfaceLinks(propertyId: number): Promise<any[]> {
    const links = await db
      .select({
        id: roomSurfaceLinks.id,
        roomId: roomSurfaceLinks.roomId,
        roomName: rooms.name,
        roomType: rooms.type,
        name: roomSurfaceLinks.name,
        url: roomSurfaceLinks.url,
        surfaceCategory: roomSurfaceLinks.surfaceCategory,
        notes: roomSurfaceLinks.notes,
        createdAt: roomSurfaceLinks.createdAt,
      })
      .from(roomSurfaceLinks)
      .leftJoin(rooms, eq(roomSurfaceLinks.roomId, rooms.id))
      .where(eq(rooms.propertyId, propertyId))
      .orderBy(rooms.name, roomSurfaceLinks.surfaceCategory);
    
    return links;
  }

  async getPropertyShoppingList(propertyId: number): Promise<any> {
    // Get supplies needing replacement (within next 90 days or past due)
    const now = new Date();
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    
    const suppliesNeedingReplacement = await db
      .select({
        id: roomSupplies.id,
        roomId: roomSupplies.roomId,
        roomName: rooms.name,
        roomType: rooms.type,
        name: roomSupplies.name,
        type: roomSupplies.type,
        brand: roomSupplies.brand,
        model: roomSupplies.model,
        quantity: roomSupplies.quantity,
        unit: roomSupplies.unit,
        purchaseUrl: roomSupplies.purchaseUrl,
        nextReplacement: roomSupplies.nextReplacement,
        notes: roomSupplies.notes,
      })
      .from(roomSupplies)
      .leftJoin(rooms, eq(roomSupplies.roomId, rooms.id))
      .where(
        and(
          eq(rooms.propertyId, propertyId),
          isNotNull(roomSupplies.nextReplacement)
        )
      );
    
    // Filter in memory for date comparison
    const filteredSupplies = suppliesNeedingReplacement.filter(supply => {
      if (!supply.nextReplacement) return false;
      const replacementDate = new Date(supply.nextReplacement);
      return replacementDate <= ninetyDaysFromNow;
    });

    // Get devices needing service (within next 90 days or past due)
    const devicesNeedingService = await db
      .select({
        id: roomDevices.id,
        roomId: roomDevices.roomId,
        roomName: rooms.name,
        roomType: rooms.type,
        name: roomDevices.name,
        type: roomDevices.type,
        brand: roomDevices.brand,
        model: roomDevices.model,
        serviceInterval: roomDevices.serviceInterval,
        serviceIntervalUnit: roomDevices.serviceIntervalUnit,
        nextServiceDue: roomDevices.nextServiceDue,
        notes: roomDevices.notes,
      })
      .from(roomDevices)
      .leftJoin(rooms, eq(roomDevices.roomId, rooms.id))
      .where(
        and(
          eq(rooms.propertyId, propertyId),
          eq(roomDevices.requiresServicing, true),
          isNotNull(roomDevices.nextServiceDue)
        )
      );
    
    // Filter in memory for date comparison
    const filteredDevices = devicesNeedingService.filter(device => {
      if (!device.nextServiceDue) return false;
      const serviceDate = new Date(device.nextServiceDue);
      return serviceDate <= ninetyDaysFromNow;
    });

    // Get all surface links
    const surfaceLinks = await this.getPropertySurfaceLinks(propertyId);

    return {
      supplies: filteredSupplies,
      devices: filteredDevices,
      surfaceLinks: surfaceLinks,
    };
  }

  // Room note operations
  async getPropertyNotes(propertyId: string): Promise<any[]> {
    try {
      // For now, return empty array since property notes don't exist yet
      // In the future, this would fetch from a property_notes table
      return [];
    } catch (error) {
      console.error("Error fetching property notes:", error);
      throw error;
    }
  }

  async getRoomNotes(roomId: number): Promise<RoomNote[]> {
    return await db.select({
      id: roomNotes.id,
      roomId: roomNotes.roomId,
      title: roomNotes.title,
      content: roomNotes.content,
      category: roomNotes.category,
      createdById: roomNotes.createdById,
      isImportant: roomNotes.isImportant,
      createdAt: roomNotes.createdAt,
      updatedAt: roomNotes.updatedAt,
      createdBy: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      }
    })
    .from(roomNotes)
    .leftJoin(users, eq(roomNotes.createdById, users.id))
    .where(eq(roomNotes.roomId, roomId))
    .orderBy(desc(roomNotes.createdAt));
  }

  async createRoomNote(note: InsertRoomNote): Promise<RoomNote> {
    const [newNote] = await db.insert(roomNotes).values(note).returning();
    return newNote;
  }

  async updateRoomNote(id: number, note: Partial<InsertRoomNote>): Promise<RoomNote> {
    const [updatedNote] = await db
      .update(roomNotes)
      .set({ ...note, updatedAt: new Date() })
      .where(eq(roomNotes.id, id))
      .returning();
    return updatedNote;
  }

  async deleteRoomNote(id: number): Promise<void> {
    await db.delete(roomNotes).where(eq(roomNotes.id, id));
  }

  // Room device operations
  async getRoomDevices(roomId: number): Promise<RoomDevice[]> {
    return await db.select({
      id: roomDevices.id,
      roomId: roomDevices.roomId,
      name: roomDevices.name,
      type: roomDevices.type,
      brand: roomDevices.brand,
      model: roomDevices.model,
      serialNumber: roomDevices.serialNumber,
      macAddress: roomDevices.macAddress,
      ipAddress: roomDevices.ipAddress,
      link: roomDevices.link,
      locationInRoom: roomDevices.locationInRoom,
      installDate: roomDevices.installDate,
      lastServiced: roomDevices.lastServiced,
      requiresServicing: roomDevices.requiresServicing,
      serviceInterval: roomDevices.serviceInterval,
      serviceIntervalUnit: roomDevices.serviceIntervalUnit,
      nextServiceDue: roomDevices.nextServiceDue,
      notes: roomDevices.notes,
      hasWarranty: roomDevices.hasWarranty,
      warrantyStartDate: roomDevices.warrantyStartDate,
      warrantyEndDate: roomDevices.warrantyEndDate,
      isActive: roomDevices.isActive,
      createdById: roomDevices.createdById,
      createdAt: roomDevices.createdAt,
      updatedAt: roomDevices.updatedAt,
    })
    .from(roomDevices)
    .where(eq(roomDevices.roomId, roomId))
    .orderBy(desc(roomDevices.createdAt));
  }

  async createRoomDevice(device: InsertRoomDevice): Promise<RoomDevice> {
    const [newDevice] = await db.insert(roomDevices).values(device).returning();
    return newDevice;
  }

  async updateRoomDevice(id: number, device: Partial<InsertRoomDevice>): Promise<RoomDevice> {
    const [updatedDevice] = await db
      .update(roomDevices)
      .set({ ...device, updatedAt: new Date() })
      .where(eq(roomDevices.id, id))
      .returning();
    return updatedDevice;
  }

  async deleteRoomDevice(id: number): Promise<void> {
    await db.delete(roomDevices).where(eq(roomDevices.id, id));
  }

  // Room surface operations
  async getRoomSurfaces(roomId: number): Promise<RoomSurface[]> {
    return await db.select().from(roomSurfaces).where(eq(roomSurfaces.roomId, roomId));
  }

  async createRoomSurface(surface: InsertRoomSurface): Promise<RoomSurface> {
    const [newSurface] = await db.insert(roomSurfaces).values(surface).returning();
    return newSurface;
  }

  async updateRoomSurface(id: number, surface: Partial<InsertRoomSurface>): Promise<RoomSurface> {
    const [updatedSurface] = await db
      .update(roomSurfaces)
      .set({ ...surface, updatedAt: new Date() })
      .where(eq(roomSurfaces.id, id))
      .returning();
    return updatedSurface;
  }

  async deleteRoomSurface(id: number): Promise<void> {
    await db.delete(roomSurfaces).where(eq(roomSurfaces.id, id));
  }

  // Room surface link operations
  async getRoomSurfaceLinks(roomId: number): Promise<RoomSurfaceLink[]> {
    return await db.select().from(roomSurfaceLinks).where(eq(roomSurfaceLinks.roomId, roomId));
  }

  async createRoomSurfaceLink(link: InsertRoomSurfaceLink): Promise<RoomSurfaceLink> {
    const [newLink] = await db.insert(roomSurfaceLinks).values(link).returning();
    return newLink;
  }

  async updateRoomSurfaceLink(id: number, link: Partial<InsertRoomSurfaceLink>): Promise<RoomSurfaceLink> {
    const [updatedLink] = await db
      .update(roomSurfaceLinks)
      .set({ ...link, updatedAt: new Date() })
      .where(eq(roomSurfaceLinks.id, id))
      .returning();
    return updatedLink;
  }

  async deleteRoomSurfaceLink(id: number): Promise<void> {
    await db.delete(roomSurfaceLinks).where(eq(roomSurfaceLinks.id, id));
  }

  // Room fixture operations
  async getRoomFixtures(roomId: number): Promise<RoomFixture[]> {
    return await db.select().from(roomFixtures).where(eq(roomFixtures.roomId, roomId));
  }

  async createRoomFixture(fixture: InsertRoomFixture): Promise<RoomFixture> {
    const [newFixture] = await db.insert(roomFixtures).values(fixture).returning();
    return newFixture;
  }

  async updateRoomFixture(id: number, fixture: Partial<InsertRoomFixture>): Promise<RoomFixture> {
    const [updatedFixture] = await db
      .update(roomFixtures)
      .set({ ...fixture, updatedAt: new Date() })
      .where(eq(roomFixtures.id, id))
      .returning();
    return updatedFixture;
  }

  async deleteRoomFixture(id: number): Promise<void> {
    await db.delete(roomFixtures).where(eq(roomFixtures.id, id));
  }

  // Room photo operations
  async getRoomPhotos(roomId: number): Promise<RoomPhoto[]> {
    return await db.select().from(roomPhotos).where(eq(roomPhotos.roomId, roomId)).orderBy(desc(roomPhotos.createdAt));
  }

  async createRoomPhoto(photo: InsertRoomPhoto): Promise<RoomPhoto> {
    const [newPhoto] = await db.insert(roomPhotos).values(photo).returning();
    return newPhoto;
  }

  async deleteRoomPhoto(id: number): Promise<void> {
    await db.delete(roomPhotos).where(eq(roomPhotos.id, id));
  }

  // Room checklist operations
  async getRoomChecklists(roomId: number): Promise<RoomChecklist[]> {
    return await db.select().from(roomChecklists).where(eq(roomChecklists.roomId, roomId)).orderBy(desc(roomChecklists.createdAt));
  }

  async createRoomChecklist(checklist: InsertRoomChecklist): Promise<RoomChecklist> {
    const [newChecklist] = await db.insert(roomChecklists).values(checklist).returning();
    return newChecklist;
  }

  async updateRoomChecklist(id: number, checklist: Partial<InsertRoomChecklist>): Promise<RoomChecklist> {
    const [updatedChecklist] = await db
      .update(roomChecklists)
      .set({ ...checklist, updatedAt: new Date() })
      .where(eq(roomChecklists.id, id))
      .returning();
    return updatedChecklist;
  }

  async deleteRoomChecklist(id: number): Promise<void> {
    await db.delete(roomChecklists).where(eq(roomChecklists.id, id));
  }

  // Property access items operations
  async getPropertyAccessItems(propertyId: number): Promise<SelectPropertyAccessItem[]> {
    return await db.select().from(propertyAccessItems).where(eq(propertyAccessItems.propertyId, propertyId)).orderBy(propertyAccessItems.category, propertyAccessItems.description);
  }

  async createPropertyAccessItem(item: InsertPropertyAccessItem): Promise<SelectPropertyAccessItem> {
    const [newItem] = await db.insert(propertyAccessItems).values(item).returning();
    return newItem;
  }

  async updatePropertyAccessItem(id: number, item: Partial<InsertPropertyAccessItem>): Promise<SelectPropertyAccessItem> {
    const [updatedItem] = await db
      .update(propertyAccessItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(propertyAccessItems.id, id))
      .returning();
    return updatedItem;
  }

  async deletePropertyAccessItem(id: number): Promise<void> {
    await db.delete(propertyAccessItems).where(eq(propertyAccessItems.id, id));
  }

  // Task operations
  async getTasks(): Promise<Task[]> {
    return await db.select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      priority: tasks.priority,
      status: tasks.status,
      propertyId: tasks.propertyId,
      contactId: tasks.contactId,
      assignedToId: tasks.assignedToId,
      assignedById: tasks.assignedById,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      recurrenceRule: tasks.recurrenceRule,
      recurrenceExDates: tasks.recurrenceExDates,
      isTemplate: tasks.isTemplate,
      templateTaskId: tasks.templateTaskId,
      instanceDate: tasks.instanceDate,
      isArchived: tasks.isArchived,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      property: {
        id: properties.id,
        name: properties.name,
        address1: properties.address1,
        address2: properties.address2,
        city: properties.city,
        state: properties.state,
        zip: properties.zip,
        type: properties.type,
      },
      contact: {
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        phone: contacts.phone,
        type: contacts.type,
      },
      assignedUser: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        profileImageUrl: users.profileImageUrl,
      }
    })
    .from(tasks)
    .leftJoin(properties, eq(tasks.propertyId, properties.id))
    .leftJoin(contacts, eq(tasks.contactId, contacts.id))
    .leftJoin(users, eq(tasks.assignedToId, users.id))
    .where(eq(tasks.isArchived, false))
    .orderBy(desc(tasks.createdAt));
  }

  async getTasksByProperty(propertyId: number): Promise<Task[]> {
    return await db.select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      priority: tasks.priority,
      status: tasks.status,
      propertyId: tasks.propertyId,
      assignedToId: tasks.assignedToId,
      assignedById: tasks.assignedById,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      isArchived: tasks.isArchived,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      assignedUser: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        profileImageUrl: users.profileImageUrl,
      }
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assignedToId, users.id))
    .where(eq(tasks.propertyId, propertyId))
    .orderBy(desc(tasks.createdAt));
  }

  async getTasksByUser(userId: string): Promise<Task[]> {
    return await db.select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      priority: tasks.priority,
      status: tasks.status,
      propertyId: tasks.propertyId,
      assignedToId: tasks.assignedToId,
      assignedById: tasks.assignedById,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      isArchived: tasks.isArchived,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      property: {
        id: properties.id,
        name: properties.name,
        address1: properties.address1,
        city: properties.city,
        state: properties.state,
      }
    })
    .from(tasks)
    .leftJoin(properties, eq(tasks.propertyId, properties.id))
    .where(eq(tasks.assignedToId, userId))
    .orderBy(desc(tasks.createdAt));
  }

  async getUrgentTasks(): Promise<Task[]> {
    return await db.select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      priority: tasks.priority,
      status: tasks.status,
      propertyId: tasks.propertyId,
      contactId: tasks.contactId,
      assignedToId: tasks.assignedToId,
      assignedById: tasks.assignedById,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      isArchived: tasks.isArchived,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      property: {
        id: properties.id,
        name: properties.name,
        address1: properties.address1,
        address2: properties.address2,
        city: properties.city,
        state: properties.state,
        zip: properties.zip,
        type: properties.type,
      },
      contact: {
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        phone: contacts.phone,
        type: contacts.type,
      },
      assignedUser: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        profileImageUrl: users.profileImageUrl,
      }
    })
    .from(tasks)
    .leftJoin(properties, eq(tasks.propertyId, properties.id))
    .leftJoin(contacts, eq(tasks.contactId, contacts.id))
    .leftJoin(users, eq(tasks.assignedToId, users.id))
    .where(and(
      or(eq(tasks.status, "pending"), eq(tasks.status, "in_progress")),
      eq(tasks.isArchived, false),
      eq(tasks.priority, "urgent")
    ))
    .orderBy(desc(tasks.createdAt));
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      priority: tasks.priority,
      status: tasks.status,
      propertyId: tasks.propertyId,
      roomId: tasks.roomId,
      contactId: tasks.contactId,
      clientId: tasks.clientId,
      assignedToId: tasks.assignedToId,
      assignedById: tasks.assignedById,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      timeEstimate: tasks.timeEstimate,
      category: tasks.category,
      isRecurring: tasks.isRecurring,
      recurrenceFrequency: tasks.recurrenceFrequency,
      recurrenceRule: tasks.recurrenceRule,
      recurrenceExDates: tasks.recurrenceExDates,
      isTemplate: tasks.isTemplate,
      templateTaskId: tasks.templateTaskId,
      instanceDate: tasks.instanceDate,
      billedSeparately: tasks.billedSeparately,
      billingAmount: tasks.billingAmount,
      billableRateCents: tasks.billableRateCents,
      isArchived: tasks.isArchived,
      attachments: tasks.attachments,
      tags: tasks.tags,
      customFieldValues: tasks.customFieldValues,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      property: {
        id: properties.id,
        name: properties.name,
        address1: properties.address1,
        address2: properties.address2,
        city: properties.city,
        state: properties.state,
        zip: properties.zip,
        type: properties.type,
        units: properties.units,
        status: properties.status,
        squareFootage: properties.squareFootage,
        billingType: properties.billingType,
      },
      contact: {
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        phone: contacts.phone,
        type: contacts.type,
      },
      assignedUser: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        profileImageUrl: users.profileImageUrl,
      }
    })
    .from(tasks)
    .leftJoin(properties, eq(tasks.propertyId, properties.id))
    .leftJoin(contacts, eq(tasks.contactId, contacts.id))
    .leftJoin(users, eq(tasks.assignedToId, users.id))
    .where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask, userId: string | null = null): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    
    // Log activity only if we have a valid userId
    const activityUserId = userId || task.assignedById;
    if (activityUserId) {
      await this.logActivity({
        userId: activityUserId,
        action: "task_created",
        entityType: "task",
        entityId: newTask.id.toString(),
        description: `Created task "${newTask.title}"`,
      });
    }
    
    return newTask;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task> {
    // First update the task
    await db
      .update(tasks)
      .set({ ...task, updatedAt: new Date() })
      .where(eq(tasks.id, id));
    
    // Then return the complete task with joined data - INCLUDING ALL FIELDS
    const [updatedTask] = await db.select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      priority: tasks.priority,
      status: tasks.status,
      propertyId: tasks.propertyId,
      roomId: tasks.roomId,
      contactId: tasks.contactId,
      clientId: tasks.clientId,
      assignedToId: tasks.assignedToId,
      assignedById: tasks.assignedById,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      timeEstimate: tasks.timeEstimate,
      category: tasks.category,
      isRecurring: tasks.isRecurring,
      recurrenceFrequency: tasks.recurrenceFrequency,
      recurrenceRule: tasks.recurrenceRule,
      recurrenceExDates: tasks.recurrenceExDates,
      isTemplate: tasks.isTemplate,
      templateTaskId: tasks.templateTaskId,
      instanceDate: tasks.instanceDate,
      billedSeparately: tasks.billedSeparately,
      billingAmount: tasks.billingAmount,
      billableRateCents: tasks.billableRateCents,
      isArchived: tasks.isArchived,
      attachments: tasks.attachments,
      tags: tasks.tags,
      customFieldValues: tasks.customFieldValues,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      property: {
        id: properties.id,
        name: properties.name,
        address1: properties.address1,
        address2: properties.address2,
        city: properties.city,
        state: properties.state,
        zip: properties.zip,
        type: properties.type,
        status: properties.status,
      },
      contact: {
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        phone: contacts.phone,
        type: contacts.type,
      },
      assignedUser: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        profileImageUrl: users.profileImageUrl,
      }
    })
    .from(tasks)
    .leftJoin(properties, eq(tasks.propertyId, properties.id))
    .leftJoin(contacts, eq(tasks.contactId, contacts.id))
    .leftJoin(users, eq(tasks.assignedToId, users.id))
    .where(eq(tasks.id, id));
    
    return updatedTask;
  }

  async assignTask(taskId: number, userId: string, assignedById: string): Promise<Task> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ 
        assignedToId: userId, 
        assignedById: assignedById,
        updatedAt: new Date() 
      })
      .where(eq(tasks.id, taskId))
      .returning();
    
    // Log activity
    await this.logActivity({
      userId: assignedById,
      action: "task_assigned",
      entityType: "task",
      entityId: taskId.toString(),
      description: `Assigned task "${updatedTask.title}" to user`,
    });
    
    return updatedTask;
  }

  async completeTask(taskId: number): Promise<Task> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ 
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(tasks.id, taskId))
      .returning();
    
    // Log activity
    await this.logActivity({
      userId: updatedTask.assignedToId || "system",
      action: "task_completed",
      entityType: "task",
      entityId: taskId.toString(),
      description: `Completed task "${updatedTask.title}"`,
    });
    
    return updatedTask;
  }

  async archiveTask(taskId: number, userId: string): Promise<Task> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ 
        isArchived: true,
        updatedAt: new Date() 
      })
      .where(eq(tasks.id, taskId))
      .returning();
    
    // Log activity
    await this.logActivity({
      userId: userId,
      action: "task_archived",
      entityType: "task",
      entityId: taskId.toString(),
      description: `Archived task "${updatedTask.title}"`,
    });
    
    return updatedTask;
  }

  async unarchiveTask(taskId: number, userId: string): Promise<Task> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ 
        isArchived: false,
        updatedAt: new Date() 
      })
      .where(eq(tasks.id, taskId))
      .returning();
    
    // Log activity
    await this.logActivity({
      userId: userId,
      action: "task_unarchived",
      entityType: "task",
      entityId: taskId.toString(),
      description: `Unarchived task "${updatedTask.title}"`,
    });
    
    return updatedTask;
  }

  async getTaskChecklistItems(taskId: number): Promise<TaskChecklistItem[]> {
    return await db.select()
      .from(taskChecklistItems)
      .where(eq(taskChecklistItems.taskId, taskId))
      .orderBy(taskChecklistItems.sortOrder);
  }

  async getTaskComments(taskId: number): Promise<any[]> {
    const { taskComments, users } = await import("@shared/schema");
    
    const comments = await db.select({
      id: taskComments.id,
      taskId: taskComments.taskId,
      userId: taskComments.userId,
      text: taskComments.text,
      createdAt: taskComments.createdAt,
      updatedAt: taskComments.updatedAt,
      userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      userFirstName: users.firstName,
      userLastName: users.lastName,
    })
      .from(taskComments)
      .leftJoin(users, eq(taskComments.userId, users.id))
      .where(eq(taskComments.taskId, taskId))
      .orderBy(taskComments.createdAt);
    
    return comments;
  }

  async createTaskComment(comment: InsertTaskComment): Promise<TaskComment> {
    const { taskComments } = await import("@shared/schema");
    const [newComment] = await db.insert(taskComments).values(comment).returning();
    return newComment;
  }

  async updateTaskComment(id: number, userId: string, text: string): Promise<TaskComment> {
    const { taskComments } = await import("@shared/schema");
    const [updatedComment] = await db.update(taskComments)
      .set({ text, updatedAt: new Date() })
      .where(and(eq(taskComments.id, id), eq(taskComments.userId, userId)))
      .returning();
    
    if (!updatedComment) {
      throw new Error("Comment not found or you don't have permission to edit it");
    }
    
    return updatedComment;
  }

  async deleteTaskComment(id: number, userId: string): Promise<void> {
    const { taskComments } = await import("@shared/schema");
    await db.delete(taskComments)
      .where(and(eq(taskComments.id, id), eq(taskComments.userId, userId)));
  }

  async deleteTask(taskId: number): Promise<void> {
    const taskToDelete = await this.getTask(taskId);
    
    await db.delete(tasks).where(eq(tasks.id, taskId));
    
    // Log activity
    if (taskToDelete) {
      await this.logActivity({
        userId: taskToDelete.assignedToId || "system",
        action: "task_deleted",
        entityType: "task",
        entityId: taskId.toString(),
        description: `Deleted task "${taskToDelete.title}"`,
      });
    }
  }

  async checkTaskConflicts(assignedUserId: string, dueDate: string, timeEstimate: string, excludeTaskId?: number): Promise<any[]> {
    try {
      // Parse the time estimate to get duration in minutes
      const timeMatch = timeEstimate.match(/(\d+)\s*days?\s*(\d+)\s*hours?\s*(\d+)\s*minutes?/);
      let durationMinutes = 0;
      if (timeMatch) {
        const [, days, hours, minutes] = timeMatch;
        durationMinutes = (parseInt(days) || 0) * 24 * 60 + (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
      }

      // Convert dueDate to Date object
      const taskDate = new Date(dueDate);
      const startTime = new Date(taskDate.getTime() - durationMinutes * 60000); // Subtract duration from due date
      const endTime = taskDate;

      // Query for overlapping tasks assigned to the same user
      let query = db
        .select({
          id: tasks.id,
          title: tasks.title,
          dueDate: tasks.dueDate,
          timeEstimate: tasks.timeEstimate,
          assignedToId: tasks.assignedToId,
          propertyId: tasks.propertyId,
          assignedToName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, 'Unassigned')`,
          property: sql<string>`${properties.name}`,
        })
        .from(tasks)
        .leftJoin(users, eq(tasks.assignedToId, users.id))
        .leftJoin(properties, eq(tasks.propertyId, properties.id))
        .where(
          and(
            eq(tasks.assignedToId, assignedUserId),
            eq(tasks.status, 'pending'), // Only check pending tasks
            sql`${tasks.dueDate} IS NOT NULL`
          )
        );

      // Exclude current task if editing by adding to existing where conditions
      if (excludeTaskId) {
        query = db
          .select({
            id: tasks.id,
            title: tasks.title,
            dueDate: tasks.dueDate,
            timeEstimate: tasks.timeEstimate,
            assignedToId: tasks.assignedToId,
            propertyId: tasks.propertyId,
            assignedToName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, 'Unassigned')`,
            property: sql<string>`${properties.name}`,
          })
          .from(tasks)
          .leftJoin(users, eq(tasks.assignedToId, users.id))
          .leftJoin(properties, eq(tasks.propertyId, properties.id))
          .where(
            and(
              eq(tasks.assignedToId, assignedUserId),
              eq(tasks.status, 'pending'),
              sql`${tasks.dueDate} IS NOT NULL`,
              sql`${tasks.id} != ${excludeTaskId}`
            )
          );
      }

      const existingTasks = await query;

      // Check for time conflicts
      const conflicts = existingTasks.filter(existingTask => {
        if (!existingTask.dueDate || !existingTask.timeEstimate) return false;

        // Parse existing task's time estimate
        const existingTimeMatch = existingTask.timeEstimate.match(/(\d+)\s*days?\s*(\d+)\s*hours?\s*(\d+)\s*minutes?/);
        let existingDurationMinutes = 0;
        if (existingTimeMatch) {
          const [, days, hours, minutes] = existingTimeMatch;
          existingDurationMinutes = (parseInt(days) || 0) * 24 * 60 + (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
        }

        const existingEndTime = new Date(existingTask.dueDate);
        const existingStartTime = new Date(existingEndTime.getTime() - existingDurationMinutes * 60000);

        // Check for overlap: tasks overlap if one starts before the other ends
        const overlap = startTime < existingEndTime && endTime > existingStartTime;
        return overlap;
      });

      return conflicts;
    } catch (error) {
      console.error("Error checking task conflicts:", error);
      return [];
    }
  }

  // Time tracking operations
  async getTimeEntries(orgId: string, filters?: { userId?: string; propertyId?: number; taskId?: number; startDate?: string; endDate?: string }): Promise<TimeEntry[]> {
    let query = db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.orgId, orgId))
      .orderBy(desc(timeEntries.clockIn));

    if (filters) {
      const conditions = [eq(timeEntries.orgId, orgId)];
      
      if (filters.userId) {
        conditions.push(eq(timeEntries.userId, filters.userId));
      }
      if (filters.propertyId) {
        conditions.push(eq(timeEntries.propertyId, filters.propertyId));
      }
      if (filters.taskId) {
        conditions.push(eq(timeEntries.taskId, filters.taskId));
      }
      if (filters.startDate) {
        conditions.push(sql`${timeEntries.clockIn} >= ${filters.startDate}`);
      }
      if (filters.endDate) {
        conditions.push(sql`${timeEntries.clockIn} <= ${filters.endDate}`);
      }

      query = db
        .select()
        .from(timeEntries)
        .where(and(...conditions))
        .orderBy(desc(timeEntries.clockIn));
    }

    return await query;
  }

  async getActiveTimeEntry(userId: string): Promise<TimeEntry | undefined> {
    const [entry] = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, userId),
          sql`${timeEntries.clockOut} IS NULL`
        )
      )
      .orderBy(desc(timeEntries.clockIn))
      .limit(1);

    return entry;
  }

  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    const [entry] = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.id, id));

    return entry;
  }

  async createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry> {
    const [newEntry] = await db
      .insert(timeEntries)
      .values(entry)
      .returning();

    return newEntry;
  }

  async updateTimeEntry(id: number, entry: Partial<InsertTimeEntry>): Promise<TimeEntry> {
    const [updatedEntry] = await db
      .update(timeEntries)
      .set({ ...entry, updatedAt: new Date() })
      .where(eq(timeEntries.id, id))
      .returning();

    return updatedEntry;
  }

  async clockOut(id: number, clockOutTime: Date): Promise<TimeEntry> {
    const [updatedEntry] = await db
      .update(timeEntries)
      .set({ clockOut: clockOutTime, updatedAt: new Date() })
      .where(eq(timeEntries.id, id))
      .returning();

    return updatedEntry;
  }

  async deleteTimeEntry(id: number): Promise<void> {
    await db.delete(timeEntries).where(eq(timeEntries.id, id));
  }

  // Contact operations
  async getContacts(includeInactive: boolean = false): Promise<Contact[]> {
    const contactsQuery = includeInactive 
      ? db.select().from(contacts).orderBy(desc(contacts.createdAt))
      : db.select().from(contacts).where(eq(contacts.isActive, true)).orderBy(desc(contacts.createdAt));
    
    const contactsList = await contactsQuery;
    
    // For each contact, fetch their associated properties
    const contactsWithProperties = await Promise.all(
      contactsList.map(async (contact) => {
        const contactProps = await db
          .select({
            propertyId: contactProperties.propertyId,
            propertyName: properties.name,
            isPrimary: contactProperties.isPrimary,
            relationship: contactProperties.relationship,
          })
          .from(contactProperties)
          .leftJoin(properties, eq(contactProperties.propertyId, properties.id))
          .where(eq(contactProperties.contactId, contact.id));
        
        return {
          ...contact,
          properties: contactProps,
        };
      })
    );
    
    return contactsWithProperties;
  }

  async getContactsByProperty(propertyId: number): Promise<Contact[]> {
    return await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.propertyId, propertyId), eq(contacts.isActive, true)))
      .orderBy(contacts.firstName, contacts.lastName);
  }

  async getContact(id: number): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact;
  }

  async getContactByEmail(email: string, orgId: string): Promise<Contact | undefined> {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.email, email), eq(contacts.orgId, orgId)));
    return contact;
  }

  async getContactByPhone(phone: string, orgId: string): Promise<Contact | undefined> {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.phone, phone), eq(contacts.orgId, orgId)));
    return contact;
  }

  async createContact(contact: InsertContact, userId: string | null): Promise<Contact> {
    const [newContact] = await db.insert(contacts).values(contact).returning();
    
    // Log activity only if we have a valid userId
    if (userId) {
      await this.logActivity({
        userId: userId,
        action: "contact_created",
        entityType: "contact",
        entityId: newContact.id.toString(),
        description: `Added contact "${newContact.firstName} ${newContact.lastName}"`,
      });
    }
    
    return newContact;
  }

  async updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact> {
    const [updatedContact] = await db
      .update(contacts)
      .set({ ...contact, updatedAt: new Date() })
      .where(eq(contacts.id, id))
      .returning();
    return updatedContact;
  }

  async deleteContact(id: number): Promise<void> {
    await db.update(contacts).set({ isActive: false }).where(eq(contacts.id, id));
  }

  // Alert operations
  async getAlerts(orgId: string, filters?: { type?: string; entityId?: number; isActive?: boolean }): Promise<Alert[]> {
    let query = db.select().from(alerts).where(eq(alerts.orgId, orgId));
    
    if (filters?.type) {
      query = query.where(eq(alerts.type, filters.type)) as any;
    }
    if (filters?.entityId) {
      query = query.where(eq(alerts.entityId, filters.entityId)) as any;
    }
    if (filters?.isActive !== undefined) {
      query = query.where(eq(alerts.isActive, filters.isActive)) as any;
    }
    
    return await query.orderBy(desc(alerts.createdAt));
  }

  async getAlertsByEntity(orgId: string, type: "client" | "property" | "task", entityId: number, userId?: string, userRole?: string): Promise<Alert[]> {
    const allAlerts = await db
      .select()
      .from(alerts)
      .where(and(
        eq(alerts.orgId, orgId),
        eq(alerts.type, type),
        eq(alerts.entityId, entityId),
        eq(alerts.isActive, true)
      ))
      .orderBy(desc(alerts.severity), desc(alerts.createdAt));
    
    // Filter based on targeting if userId and userRole are provided
    if (!userId || !userRole) {
      return allAlerts;
    }
    
    return allAlerts.filter(alert => {
      // If targetType is 'all' or not set, show to everyone
      if (!alert.targetType || alert.targetType === 'all') {
        return true;
      }
      
      // If targetType is 'roles', check if user's role is in targetRoles
      if (alert.targetType === 'roles' && alert.targetRoles) {
        return alert.targetRoles.includes(userRole);
      }
      
      // If targetType is 'users', check if userId is in targetUserIds
      if (alert.targetType === 'users' && alert.targetUserIds) {
        return alert.targetUserIds.includes(userId);
      }
      
      return false;
    });
  }

  async getAlert(id: number, orgId: string): Promise<Alert | undefined> {
    const [alert] = await db
      .select()
      .from(alerts)
      .where(and(eq(alerts.id, id), eq(alerts.orgId, orgId)));
    return alert;
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [newAlert] = await db.insert(alerts).values(alert).returning();
    return newAlert;
  }

  async updateAlert(id: number, orgId: string, alertData: Partial<InsertAlert>): Promise<Alert> {
    const [updatedAlert] = await db
      .update(alerts)
      .set({ ...alertData, updatedAt: new Date() })
      .where(and(eq(alerts.id, id), eq(alerts.orgId, orgId)))
      .returning();
    return updatedAlert;
  }

  async deleteAlert(id: number, orgId: string): Promise<void> {
    await db.delete(alerts).where(and(eq(alerts.id, id), eq(alerts.orgId, orgId)));
  }

  // System Alert operations
  async getSystemAlertsForUser(orgId: string, userId: string, userRole: string): Promise<SystemAlert[]> {
    // Get active system alerts that the user hasn't acknowledged
    const activeAlerts = await db
      .select()
      .from(systemAlerts)
      .where(and(
        eq(systemAlerts.orgId, orgId),
        eq(systemAlerts.isActive, true),
        or(
          isNotNull(systemAlerts.expiresAt) ? sql`${systemAlerts.expiresAt} > NOW()` : sql`true`,
          sql`${systemAlerts.expiresAt} IS NULL`
        )
      ))
      .orderBy(desc(systemAlerts.severity), desc(systemAlerts.createdAt));

    // Filter based on targeting and check acknowledgements
    const userAlerts: SystemAlert[] = [];
    
    for (const alert of activeAlerts) {
      // Check targeting
      let isTargeted = false;
      
      if (alert.targetType === 'all') {
        isTargeted = true;
      } else if (alert.targetType === 'roles' && alert.targetRoles) {
        isTargeted = alert.targetRoles.includes(userRole);
      } else if (alert.targetType === 'users' && alert.targetUserIds) {
        isTargeted = alert.targetUserIds.includes(userId);
      }
      
      if (!isTargeted) continue;
      
      // Check if user has acknowledged this alert
      const hasAcknowledged = await this.hasUserAcknowledgedAlert(alert.id, userId);
      if (!hasAcknowledged) {
        userAlerts.push(alert);
      }
    }
    
    return userAlerts;
  }

  async getSystemAlert(id: number, orgId: string): Promise<SystemAlert | undefined> {
    const [alert] = await db
      .select()
      .from(systemAlerts)
      .where(and(eq(systemAlerts.id, id), eq(systemAlerts.orgId, orgId)));
    return alert;
  }

  async getAllSystemAlerts(orgId: string): Promise<SystemAlert[]> {
    return await db
      .select()
      .from(systemAlerts)
      .where(eq(systemAlerts.orgId, orgId))
      .orderBy(desc(systemAlerts.createdAt));
  }

  async createSystemAlert(alert: InsertSystemAlert): Promise<SystemAlert> {
    const [newAlert] = await db.insert(systemAlerts).values(alert).returning();
    return newAlert;
  }

  async updateSystemAlert(id: number, orgId: string, alertData: Partial<InsertSystemAlert>): Promise<SystemAlert> {
    const [updatedAlert] = await db
      .update(systemAlerts)
      .set({ ...alertData, updatedAt: new Date() })
      .where(and(eq(systemAlerts.id, id), eq(systemAlerts.orgId, orgId)))
      .returning();
    return updatedAlert;
  }

  async deleteSystemAlert(id: number, orgId: string): Promise<void> {
    await db.delete(systemAlerts).where(and(eq(systemAlerts.id, id), eq(systemAlerts.orgId, orgId)));
  }

  async acknowledgeSystemAlert(alertId: number, userId: string): Promise<SystemAlertAcknowledgement> {
    const [acknowledgement] = await db
      .insert(systemAlertAcknowledgements)
      .values({ alertId, userId })
      .returning();
    return acknowledgement;
  }

  async hasUserAcknowledgedAlert(alertId: number, userId: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(systemAlertAcknowledgements)
      .where(and(
        eq(systemAlertAcknowledgements.alertId, alertId),
        eq(systemAlertAcknowledgements.userId, userId)
      ));
    return !!result;
  }

  // Contact-Property relationship operations
  async getContactProperties(contactId: number): Promise<any[]> {
    const contactProps = await db
      .select({
        id: contactProperties.id,
        contactId: contactProperties.contactId,
        propertyId: contactProperties.propertyId,
        isPrimary: contactProperties.isPrimary,
        relationship: contactProperties.relationship,
        startDate: contactProperties.startDate,
        endDate: contactProperties.endDate,
        notes: contactProperties.notes,
        createdAt: contactProperties.createdAt,
        property: {
          id: properties.id,
          name: properties.name,
          address1: properties.address1,
          address2: properties.address2,
          city: properties.city,
          state: properties.state,
          zip: properties.zip,
          type: properties.type,
          status: properties.status,
        }
      })
      .from(contactProperties)
      .leftJoin(properties, eq(contactProperties.propertyId, properties.id))
      .where(eq(contactProperties.contactId, contactId))
      .orderBy(desc(contactProperties.isPrimary), contactProperties.createdAt);
    
    return contactProps;
  }

  async linkContactToProperty(
    contactId: number, 
    propertyId: number, 
    isPrimary: boolean = false, 
    relationship?: string
  ): Promise<ContactProperty> {
    // If setting as primary, unset any existing primary properties for this contact
    if (isPrimary) {
      await db
        .update(contactProperties)
        .set({ isPrimary: false })
        .where(eq(contactProperties.contactId, contactId));
    }

    const [newContactProperty] = await db
      .insert(contactProperties)
      .values({
        contactId,
        propertyId,
        isPrimary,
        relationship,
      })
      .returning();

    return newContactProperty;
  }

  async unlinkContactFromProperty(contactId: number, propertyId: number): Promise<void> {
    await db
      .delete(contactProperties)
      .where(
        and(
          eq(contactProperties.contactId, contactId),
          eq(contactProperties.propertyId, propertyId)
        )
      );
  }

  async deleteContactProperty(relationshipId: number): Promise<void> {
    await db.delete(contactProperties)
      .where(eq(contactProperties.id, relationshipId));
  }

  async setPrimaryProperty(contactId: number, propertyId: number): Promise<void> {
    // First, unset all primary flags for this contact
    await db
      .update(contactProperties)
      .set({ isPrimary: false })
      .where(eq(contactProperties.contactId, contactId));

    // Then set the specified property as primary
    await db
      .update(contactProperties)
      .set({ isPrimary: true })
      .where(
        and(
          eq(contactProperties.contactId, contactId),
          eq(contactProperties.propertyId, propertyId)
        )
      );
  }

  async setPrimaryContactForProperty(propertyId: number, contactId: number): Promise<void> {
    // First, unset all primary flags for this property
    await db
      .update(contactProperties)
      .set({ isPrimary: false })
      .where(eq(contactProperties.propertyId, propertyId));

    // Then set the specified contact as primary for this property
    await db
      .update(contactProperties)
      .set({ isPrimary: true })
      .where(
        and(
          eq(contactProperties.contactId, contactId),
          eq(contactProperties.propertyId, propertyId)
        )
      );
  }

  async bulkMoveContactsToProperty(contactIds: number[], oldPropertyId: number, newPropertyId: number): Promise<void> {
    // For each contact, move their property association
    for (const contactId of contactIds) {
      // First, delete the old relationship from the origin property
      await db
        .delete(contactProperties)
        .where(
          and(
            eq(contactProperties.contactId, contactId),
            eq(contactProperties.propertyId, oldPropertyId)
          )
        );

      // Then, check if this contact already has a relationship with the new property
      const existing = await db
        .select()
        .from(contactProperties)
        .where(
          and(
            eq(contactProperties.contactId, contactId),
            eq(contactProperties.propertyId, newPropertyId)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        // If no existing relationship, create one (not as primary)
        await db
          .insert(contactProperties)
          .values({
            contactId,
            propertyId: newPropertyId,
            isPrimary: false,
            relationship: 'tenant', // Default relationship type
          });
      }
      // If they already have a relationship with the new property, keep the existing one
    }
  }

  // Team message operations
  async getTeamMessages(limit: number = 10): Promise<any[]> {
    const messages = await db
      .select({
        id: teamMessages.id,
        content: teamMessages.content,
        authorId: teamMessages.authorId,
        parentId: teamMessages.parentId,
        createdAt: teamMessages.createdAt,
        updatedAt: teamMessages.updatedAt,
        isEdited: teamMessages.isEdited,
        emailNotification: teamMessages.emailNotification,
        author: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        }
      })
      .from(teamMessages)
      .leftJoin(users, eq(teamMessages.authorId, users.id))
      .where(sql`${teamMessages.parentId} IS NULL`) // Only top-level messages
      .orderBy(desc(teamMessages.createdAt))
      .limit(limit);

    // Get reactions and replies for each message
    for (const message of messages) {
      // Get reactions
      const reactions = await db
        .select({
          id: messageReactions.id,
          reaction: messageReactions.reaction,
          userId: messageReactions.userId,
          user: {
            firstName: users.firstName,
            lastName: users.lastName,
          }
        })
        .from(messageReactions)
        .leftJoin(users, eq(messageReactions.userId, users.id))
        .where(eq(messageReactions.messageId, message.id));

      // Get replies
      const replies = await db
        .select({
          id: teamMessages.id,
          content: teamMessages.content,
          authorId: teamMessages.authorId,
          createdAt: teamMessages.createdAt,
          isEdited: teamMessages.isEdited,
          author: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl,
          }
        })
        .from(teamMessages)
        .leftJoin(users, eq(teamMessages.authorId, users.id))
        .where(eq(teamMessages.parentId, message.id))
        .orderBy(teamMessages.createdAt);

      message.reactions = reactions;
      message.replies = replies;
    }

    return messages;
  }

  async createTeamMessage(message: InsertTeamMessage): Promise<TeamMessage> {
    const [newMessage] = await db.insert(teamMessages).values(message).returning();
    return newMessage;
  }

  async updateTeamMessage(id: number, content: string, userId: string): Promise<TeamMessage> {
    const [updatedMessage] = await db
      .update(teamMessages)
      .set({
        content,
        updatedAt: new Date(),
        isEdited: true,
      })
      .where(and(
        eq(teamMessages.id, id),
        eq(teamMessages.authorId, userId) // Only allow author to edit their own message
      ))
      .returning();
    return updatedMessage;
  }

  async deleteTeamMessage(id: number, userId: string): Promise<void> {
    await db
      .delete(teamMessages)
      .where(and(
        eq(teamMessages.id, id),
        eq(teamMessages.authorId, userId) // Only allow author to delete their own message
      ));
  }

  // Message reaction operations
  async addReaction(messageId: number, userId: string, reaction: string): Promise<MessageReaction> {
    // Remove existing reaction from this user for this message with same emoji
    await db
      .delete(messageReactions)
      .where(and(
        eq(messageReactions.messageId, messageId),
        eq(messageReactions.userId, userId),
        eq(messageReactions.reaction, reaction)
      ));

    // Add new reaction
    const [newReaction] = await db
      .insert(messageReactions)
      .values({
        messageId,
        userId,
        reaction,
      })
      .returning();
    
    return newReaction;
  }

  async removeReaction(messageId: number, userId: string, reaction: string): Promise<void> {
    await db
      .delete(messageReactions)
      .where(and(
        eq(messageReactions.messageId, messageId),
        eq(messageReactions.userId, userId),
        eq(messageReactions.reaction, reaction)
      ));
  }

  async toggleReaction(messageId: number, userId: string, reaction: string): Promise<{ added: boolean }> {
    // Check if reaction already exists
    const [existingReaction] = await db
      .select()
      .from(messageReactions)
      .where(and(
        eq(messageReactions.messageId, messageId),
        eq(messageReactions.userId, userId),
        eq(messageReactions.reaction, reaction)
      ));

    if (existingReaction) {
      // Remove existing reaction
      await this.removeReaction(messageId, userId, reaction);
      return { added: false };
    } else {
      // Add new reaction
      await this.addReaction(messageId, userId, reaction);
      return { added: true };
    }
  }

  // Message mention operations
  async createMentions(messageId: number, mentionedUserIds: string[]): Promise<void> {
    if (mentionedUserIds.length === 0) return;
    
    const mentionRecords = mentionedUserIds.map(userId => ({
      messageId,
      mentionedUserId: userId,
    }));
    
    await db.insert(messageMentions).values(mentionRecords);
  }

  async deleteMentions(messageId: number): Promise<void> {
    await db.delete(messageMentions).where(eq(messageMentions.messageId, messageId));
  }

  async getMentionedMessages(userId: string): Promise<any[]> {
    const mentions = await db
      .select({
        id: messageMentions.id,
        messageId: messageMentions.messageId,
        isRead: messageMentions.isRead,
        createdAt: messageMentions.createdAt,
        message: {
          id: teamMessages.id,
          content: teamMessages.content,
          createdAt: teamMessages.createdAt,
          isEdited: teamMessages.isEdited,
          author: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl,
          }
        }
      })
      .from(messageMentions)
      .leftJoin(teamMessages, eq(messageMentions.messageId, teamMessages.id))
      .leftJoin(users, eq(teamMessages.authorId, users.id))
      .where(eq(messageMentions.mentionedUserId, userId))
      .orderBy(desc(messageMentions.createdAt));

    return mentions;
  }

  async markMentionAsRead(mentionId: number, userId: string): Promise<void> {
    await db
      .update(messageMentions)
      .set({ isRead: true })
      .where(and(
        eq(messageMentions.id, mentionId),
        eq(messageMentions.mentionedUserId, userId)
      ));
  }

  // User notification preferences operations
  async getUserNotificationPreferences(userId: string): Promise<UserNotificationPreferences | null> {
    const [prefs] = await db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId));
    
    return prefs || null;
  }

  async upsertUserNotificationPreferences(preferences: InsertUserNotificationPreferences): Promise<UserNotificationPreferences> {
    const [prefs] = await db
      .insert(userNotificationPreferences)
      .values(preferences)
      .onConflictDoUpdate({
        target: userNotificationPreferences.userId,
        set: {
          emailOnMention: preferences.emailOnMention,
          emailOnReply: preferences.emailOnReply,
          emailOnReaction: preferences.emailOnReaction,
          emailOnBroadcast: preferences.emailOnBroadcast,
          updatedAt: new Date(),
        }
      })
      .returning();
    
    return prefs;
  }

  // Activity log operations
  async getRecentActivity(limit: number = 10): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLog)
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);
  }

  async logActivity(activity: InsertActivityLog): Promise<ActivityLog> {
    const [newActivity] = await db.insert(activityLog).values(activity).returning();
    return newActivity;
  }

  // Dashboard stats
  async getDashboardStats() {
    const [propertiesCount] = await db
      .select({ count: count() })
      .from(properties)
      .where(eq(properties.isActive, true));

    const [urgentTasksCount] = await db
      .select({ count: count() })
      .from(tasks)
      .where(and(
        or(eq(tasks.status, "pending"), eq(tasks.status, "in_progress")),
        eq(tasks.isArchived, false),
        eq(tasks.priority, "urgent")
      ));

    const [overdueTasksCount] = await db
      .select({ count: count() })
      .from(tasks)
      .where(and(
        or(eq(tasks.status, "pending"), eq(tasks.status, "in_progress")),
        eq(tasks.isArchived, false),
        sql`DATE(${tasks.dueDate}) < CURRENT_DATE`
      ));

    const [activeTeamCount] = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        eq(users.isActive, true),
        or(
          eq(users.role, "admin"),
          eq(users.role, "supervisor"),
          eq(users.role, "staff")
        )
      ));

    return {
      totalProperties: propertiesCount.count,
      urgentTasks: urgentTasksCount.count,
      overdueTasks: overdueTasksCount.count,
      activeTeam: activeTeamCount.count,
    };
  }

  // Search operations
  async globalSearch(query: string) {
    const searchTerm = `%${query}%`;

    const searchProperties = await db
      .select()
      .from(properties)
      .where(and(
        eq(properties.isActive, true),
        or(
          like(properties.name, searchTerm),
          like(properties.address1, searchTerm)
        )
      ))
      .limit(5);

    const searchTasks = await db
      .select()
      .from(tasks)
      .where(or(
        like(tasks.title, searchTerm),
        like(tasks.description, searchTerm)
      ))
      .limit(5);

    const searchContacts = await db
      .select()
      .from(contacts)
      .where(and(
        eq(contacts.isActive, true),
        or(
          like(contacts.firstName, searchTerm),
          like(contacts.lastName, searchTerm),
          like(contacts.email, searchTerm)
        )
      ))
      .limit(5);

    return {
      properties: searchProperties,
      tasks: searchTasks,
      contacts: searchContacts,
    };
  }

  // Forms operations
  async getFormsWithFields(): Promise<any[]> {
    const formsData = await db.select().from(forms).orderBy(desc(forms.createdAt));
    
    // Get fields for each form
    const formsWithFields = await Promise.all(formsData.map(async (form) => {
      const fields = await db
        .select()
        .from(formFields)
        .where(eq(formFields.formId, form.id))
        .orderBy(formFields.sortOrder);
      
      return {
        ...form,
        fields
      };
    }));
    
    return formsWithFields;
  }

  async getFormBySlug(slug: string): Promise<any> {
    const [form] = await db
      .select()
      .from(forms)
      .where(eq(forms.slug, slug));
    
    if (!form) return undefined;
    
    // Get fields for this form
    const fields = await db
      .select()
      .from(formFields)
      .where(eq(formFields.formId, form.id))
      .orderBy(formFields.sortOrder);
    
    return {
      ...form,
      fields
    };
  }

  async createForm(formData: any): Promise<any> {
    const [form] = await db.insert(forms).values(formData).returning();
    return form;
  }

  async createFormFields(formId: number, fields: any[]): Promise<void> {
    if (fields.length > 0) {
      await db.insert(formFields).values(fields);
    }
  }

  async deleteForm(formId: number, userId: string): Promise<void> {
    // Delete form fields first (foreign key constraint)
    await db.delete(formFields).where(eq(formFields.formId, formId));
    // Delete form submissions
    await db.delete(formSubmissions).where(eq(formSubmissions.formId, formId));
    // Delete the form
    await db.delete(forms).where(eq(forms.id, formId));
  }

  async createFormSubmission(submissionData: any): Promise<any> {
    const [submission] = await db
      .insert(formSubmissions)
      .values(submissionData)
      .returning();
    return submission;
  }

  // Vehicle operations
  async getVehicles(propertyId: number): Promise<Vehicle[]> {
    return await db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.propertyId, propertyId), eq(vehicles.isActive, true)))
      .orderBy(vehicles.make, vehicles.model);
  }

  async getVehicle(id: number): Promise<Vehicle | undefined> {
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, id));
    return vehicle;
  }

  async createVehicle(vehicleData: InsertVehicle): Promise<Vehicle> {
    const [vehicle] = await db
      .insert(vehicles)
      .values(vehicleData)
      .returning();
    return vehicle;
  }

  async updateVehicle(id: number, vehicleData: Partial<InsertVehicle>): Promise<Vehicle> {
    const [vehicle] = await db
      .update(vehicles)
      .set({ ...vehicleData, updatedAt: new Date() })
      .where(eq(vehicles.id, id))
      .returning();
    return vehicle;
  }

  async deleteVehicle(id: number): Promise<void> {
    await db
      .update(vehicles)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(vehicles.id, id));
  }

  // Vehicle maintenance operations
  async getVehicleMaintenance(vehicleId: number): Promise<VehicleMaintenance[]> {
    return await db
      .select()
      .from(vehicleMaintenance)
      .where(eq(vehicleMaintenance.vehicleId, vehicleId))
      .orderBy(desc(vehicleMaintenance.serviceDate));
  }

  async createVehicleMaintenance(maintenanceData: InsertVehicleMaintenance): Promise<VehicleMaintenance> {
    const [maintenance] = await db
      .insert(vehicleMaintenance)
      .values(maintenanceData)
      .returning();
    return maintenance;
  }

  async updateVehicleMaintenance(id: number, maintenanceData: Partial<InsertVehicleMaintenance>): Promise<VehicleMaintenance> {
    const [maintenance] = await db
      .update(vehicleMaintenance)
      .set({ ...maintenanceData, updatedAt: new Date() })
      .where(eq(vehicleMaintenance.id, id))
      .returning();
    return maintenance;
  }

  async deleteVehicleMaintenance(id: number): Promise<void> {
    await db
      .delete(vehicleMaintenance)
      .where(eq(vehicleMaintenance.id, id));
  }

  // Vehicle note operations
  async getVehicleNotes(vehicleId: number): Promise<VehicleNote[]> {
    return await db
      .select()
      .from(vehicleNotes)
      .where(eq(vehicleNotes.vehicleId, vehicleId))
      .orderBy(desc(vehicleNotes.createdAt));
  }

  async createVehicleNote(noteData: InsertVehicleNote): Promise<VehicleNote> {
    const [note] = await db
      .insert(vehicleNotes)
      .values(noteData)
      .returning();
    return note;
  }

  async updateVehicleNote(id: number, noteData: Partial<InsertVehicleNote>): Promise<VehicleNote> {
    const [note] = await db
      .update(vehicleNotes)
      .set({ ...noteData, updatedAt: new Date() })
      .where(eq(vehicleNotes.id, id))
      .returning();
    return note;
  }

  async deleteVehicleNote(id: number): Promise<void> {
    await db
      .delete(vehicleNotes)
      .where(eq(vehicleNotes.id, id));
  }

  // Vehicle photo operations
  async getVehiclePhotos(vehicleId: number): Promise<VehiclePhoto[]> {
    return await db.select().from(vehiclePhotos).where(eq(vehiclePhotos.vehicleId, vehicleId)).orderBy(desc(vehiclePhotos.createdAt));
  }

  async createVehiclePhoto(photo: InsertVehiclePhoto): Promise<VehiclePhoto> {
    const [newPhoto] = await db.insert(vehiclePhotos).values(photo).returning();
    return newPhoto;
  }

  async deleteVehiclePhoto(id: number): Promise<void> {
    await db.delete(vehiclePhotos).where(eq(vehiclePhotos.id, id));
  }

  // Duplicate detection operations
  async scanForDuplicates(criteria: any): Promise<any[]> {
    const duplicates = [];
    
    if (criteria.includeContacts) {
      const contactDuplicates = await this.findContactDuplicates(criteria);
      duplicates.push(...contactDuplicates);
    }
    
    if (criteria.includeProperties) {
      const propertyDuplicates = await this.findPropertyDuplicates(criteria);
      duplicates.push(...propertyDuplicates);
    }
    
    // Filter by minimum confidence threshold
    const filteredDuplicates = duplicates.filter(group => group.confidence >= criteria.minimumConfidence);
    
    // Filter out ignored duplicates
    const ignoredDuplicatesList = await db.select().from(ignoredDuplicates);
    
    const finalDuplicates = filteredDuplicates.filter(group => {
      const groupRecordIds = group.records.map((r: any) => r.id.toString()).sort();
      
      // Check if this duplicate group matches any ignored entry
      const isIgnored = ignoredDuplicatesList.some(ignored => {
        if (ignored.recordType !== group.type) return false;
        
        const ignoredIds = ignored.recordIds.sort();
        
        // Check if the ignored IDs match any subset of the group
        return ignoredIds.every((id: string) => groupRecordIds.includes(id)) &&
               ignoredIds.length >= 2;
      });
      
      return !isIgnored;
    });
    
    return finalDuplicates;
  }

  async getDuplicates(): Promise<any[]> {
    // Return cached/stored duplicates from a previous scan
    // For now, just return the result of a default scan
    const defaultCriteria = {
      nameThreshold: 85,
      emailExact: true,
      phoneNormalized: true,
      addressThreshold: 80,
      includeContacts: true,
      includeProperties: true,
      minimumConfidence: 70
    };
    
    return await this.scanForDuplicates(defaultCriteria);
  }

  private async findContactDuplicates(criteria: any): Promise<any[]> {
    const allContacts = await db.select().from(contacts);
    const duplicateGroups = [];
    const processedIds = new Set();

    for (let i = 0; i < allContacts.length; i++) {
      if (processedIds.has(allContacts[i].id)) continue;
      
      const duplicateCluster = [allContacts[i]];
      const confidenceScores = [];
      
      // Find all related duplicates for this contact
      for (let j = i + 1; j < allContacts.length; j++) {
        if (processedIds.has(allContacts[j].id)) continue;
        
        const confidence = this.calculateContactSimilarity(allContacts[i], allContacts[j], criteria);
        
        if (confidence >= criteria.minimumConfidence) {
          duplicateCluster.push(allContacts[j]);
          confidenceScores.push(confidence);
          processedIds.add(allContacts[j].id);
        }
      }
      
      // Check for transitive duplicates (duplicates of duplicates)
      for (let k = 1; k < duplicateCluster.length; k++) {
        for (let l = k + 1; l < allContacts.length; l++) {
          if (processedIds.has(allContacts[l].id)) continue;
          
          const confidence = this.calculateContactSimilarity(duplicateCluster[k], allContacts[l], criteria);
          
          if (confidence >= criteria.minimumConfidence) {
            duplicateCluster.push(allContacts[l]);
            confidenceScores.push(confidence);
            processedIds.add(allContacts[l].id);
          }
        }
      }
      
      if (duplicateCluster.length > 1) {
        // Sort duplicates by completeness (more complete records first)
        const sortedCluster = duplicateCluster.sort((a, b) => {
          const scoreA = this.calculateRecordCompleteness(a);
          const scoreB = this.calculateRecordCompleteness(b);
          return scoreB - scoreA;
        });
        
        // Calculate the actual confidence based on the primary pair comparison
        // This gives the most accurate match percentage
        let actualConfidence;
        if (confidenceScores.length > 0) {
          // Use the average of all pairwise comparisons
          actualConfidence = Math.round(confidenceScores.reduce((sum, conf) => sum + conf, 0) / confidenceScores.length);
        } else {
          // If no scores were recorded, calculate it now for the first pair
          actualConfidence = this.calculateContactSimilarity(sortedCluster[0], sortedCluster[1], criteria);
        }
        
        const matchFields = this.getContactMatchFields(sortedCluster[0], sortedCluster[1], criteria);
        
        duplicateGroups.push({
          id: duplicateGroups.length + 1,
          type: 'contact',
          confidence: actualConfidence,
          matchFields,
          records: sortedCluster,
          totalRecords: sortedCluster.length,
          createdAt: new Date().toISOString()
        });
        
        // Mark all records in cluster as processed
        sortedCluster.forEach(record => processedIds.add(record.id));
      }
    }

    return duplicateGroups;
  }

  // Calculate how complete a contact record is (more fields = higher score)
  private calculateRecordCompleteness(contact: any): number {
    let score = 0;
    if (contact.firstName) score += 20;
    if (contact.lastName) score += 20;
    if (contact.email) score += 25;
    if (contact.phone) score += 20;
    if (contact.address) score += 10;
    if (contact.type) score += 5;
    return score;
  }

  private async findPropertyDuplicates(criteria: any): Promise<any[]> {
    const allProperties = await db.select().from(properties);
    const duplicateGroups = [];
    const processedIds = new Set();

    for (let i = 0; i < allProperties.length; i++) {
      if (processedIds.has(allProperties[i].id)) continue;
      
      const potentialDuplicates = [];
      
      for (let j = i + 1; j < allProperties.length; j++) {
        if (processedIds.has(allProperties[j].id)) continue;
        
        const confidence = this.calculatePropertySimilarity(allProperties[i], allProperties[j], criteria);
        
        if (confidence >= criteria.minimumConfidence) {
          potentialDuplicates.push({
            record: allProperties[j],
            confidence
          });
          processedIds.add(allProperties[j].id);
        }
      }
      
      if (potentialDuplicates.length > 0) {
        const matchFields = this.getPropertyMatchFields(allProperties[i], potentialDuplicates[0].record, criteria);
        
        duplicateGroups.push({
          id: duplicateGroups.length + 1000, // Offset to avoid conflicts with contact IDs
          type: 'property',
          confidence: Math.max(...potentialDuplicates.map(d => d.confidence)),
          matchFields,
          records: [allProperties[i], ...potentialDuplicates.map(d => d.record)],
          createdAt: new Date().toISOString()
        });
        
        processedIds.add(allProperties[i].id);
      }
    }

    return duplicateGroups;
  }

  private calculateContactSimilarity(contact1: any, contact2: any, criteria: any): number {
    let totalScore = 0;
    let totalWeights = 0;

    // Name similarity (weight: 40%)
    const nameWeight = 40;
    const name1 = `${contact1.firstName || ''} ${contact1.lastName || ''}`.trim().toLowerCase();
    const name2 = `${contact2.firstName || ''} ${contact2.lastName || ''}`.trim().toLowerCase();
    const nameScore = this.calculateStringSimilarity(name1, name2);
    
    if (nameScore >= criteria.nameThreshold / 100) {
      totalScore += nameScore * nameWeight;
      totalWeights += nameWeight;
    }

    // Email similarity (weight: 30%)
    const emailWeight = 30;
    if (contact1.email && contact2.email) {
      const emailScore = criteria.emailExact 
        ? (contact1.email.toLowerCase() === contact2.email.toLowerCase() ? 1.0 : 0.0)
        : this.calculateStringSimilarity(contact1.email.toLowerCase(), contact2.email.toLowerCase());
      
      if (emailScore > 0.7) {
        totalScore += emailScore * emailWeight;
        totalWeights += emailWeight;
      }
    }

    // Phone similarity (weight: 20%)
    const phoneWeight = 20;
    if (contact1.phone && contact2.phone) {
      const phone1 = this.normalizePhone(contact1.phone);
      const phone2 = this.normalizePhone(contact2.phone);
      const phoneScore = phone1 === phone2 ? 1.0 : 0.0;
      
      if (phoneScore > 0) {
        totalScore += phoneScore * phoneWeight;
        totalWeights += phoneWeight;
      }
    }

    // Address similarity (weight: 10%)
    const addressWeight = 10;
    if (contact1.address && contact2.address) {
      const addressScore = this.calculateStringSimilarity(
        contact1.address.toLowerCase(), 
        contact2.address.toLowerCase()
      );
      
      if (addressScore >= criteria.addressThreshold / 100) {
        totalScore += addressScore * addressWeight;
        totalWeights += addressWeight;
      }
    }

    return totalWeights > 0 ? Math.round((totalScore / totalWeights) * 100) : 0;
  }

  private calculatePropertySimilarity(property1: any, property2: any, criteria: any): number {
    let totalScore = 0;
    let totalWeights = 0;

    // Build full address for comparison (address1 + city + state + zip)
    const addr1 = `${property1.address1 || ''} ${property1.city || ''} ${property1.state || ''} ${property1.zip || ''}`.trim().toLowerCase();
    const addr2 = `${property2.address1 || ''} ${property2.city || ''} ${property2.state || ''} ${property2.zip || ''}`.trim().toLowerCase();

    // Address similarity (weight: 60%)
    const addressWeight = 60;
    if (addr1 && addr2) {
      const addressScore = this.calculateStringSimilarity(addr1, addr2);
      
      if (addressScore >= criteria.addressThreshold / 100) {
        totalScore += addressScore * addressWeight;
        totalWeights += addressWeight;
      }
    }

    // Property name similarity (weight: 40%)
    const nameWeight = 40;
    if (property1.name && property2.name) {
      const nameScore = this.calculateStringSimilarity(
        property1.name.toLowerCase(), 
        property2.name.toLowerCase()
      );
      
      if (nameScore >= criteria.nameThreshold / 100) {
        totalScore += nameScore * nameWeight;
        totalWeights += nameWeight;
      }
    }

    return totalWeights > 0 ? Math.round((totalScore / totalWeights) * 100) : 0;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Levenshtein distance-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private normalizePhone(phone: string): string {
    // Remove all non-digit characters
    return phone.replace(/\D/g, '');
  }

  private getContactMatchFields(contact1: any, contact2: any, criteria: any): string[] {
    const matchFields = [];

    const name1 = `${contact1.firstName || ''} ${contact1.lastName || ''}`.trim().toLowerCase();
    const name2 = `${contact2.firstName || ''} ${contact2.lastName || ''}`.trim().toLowerCase();
    if (this.calculateStringSimilarity(name1, name2) >= criteria.nameThreshold / 100) {
      matchFields.push('name');
    }

    if (contact1.email && contact2.email) {
      const emailMatch = criteria.emailExact 
        ? contact1.email.toLowerCase() === contact2.email.toLowerCase()
        : this.calculateStringSimilarity(contact1.email.toLowerCase(), contact2.email.toLowerCase()) > 0.8;
      
      if (emailMatch) {
        matchFields.push('email');
      }
    }

    if (contact1.phone && contact2.phone) {
      if (this.normalizePhone(contact1.phone) === this.normalizePhone(contact2.phone)) {
        matchFields.push('phone');
      }
    }

    if (contact1.address && contact2.address) {
      if (this.calculateStringSimilarity(contact1.address.toLowerCase(), contact2.address.toLowerCase()) >= criteria.addressThreshold / 100) {
        matchFields.push('address');
      }
    }

    return matchFields;
  }

  private getPropertyMatchFields(property1: any, property2: any, criteria: any): string[] {
    const matchFields = [];

    // Check name similarity
    if (property1.name && property2.name) {
      if (this.calculateStringSimilarity(property1.name.toLowerCase(), property2.name.toLowerCase()) >= criteria.nameThreshold / 100) {
        matchFields.push('name');
      }
    }

    // Check full address similarity
    const addr1 = `${property1.address1 || ''} ${property1.city || ''} ${property1.state || ''} ${property1.zip || ''}`.trim().toLowerCase();
    const addr2 = `${property2.address1 || ''} ${property2.city || ''} ${property2.state || ''} ${property2.zip || ''}`.trim().toLowerCase();
    
    if (addr1 && addr2) {
      if (this.calculateStringSimilarity(addr1, addr2) >= criteria.addressThreshold / 100) {
        matchFields.push('address');
      }
    }

    return matchFields;
  }

  async ignoreDuplicate(recordType: string, recordIds: number[], userId: string, reason?: string, notes?: string): Promise<void> {
    await db.insert(ignoredDuplicates).values({
      recordType,
      recordIds: recordIds.map(id => id.toString()),
      ignoredBy: userId,
      reason: reason || null,
    });

    // Add to history
    await this.addDuplicateHistory('ignore', recordType, recordIds, userId, { reason }, notes);
  }

  async getDuplicateHistory(): Promise<DuplicateHistory[]> {
    const results = await db
      .select()
      .from(duplicateHistory)
      .orderBy(desc(duplicateHistory.performedAt));

    return results;
  }

  async addDuplicateHistory(action: string, recordType: string, recordIds: number[], userId: string, details?: any, notes?: string): Promise<void> {
    // Get user name for the history record
    const user = await this.getUser(userId);
    const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User' : 'Unknown User';
    
    await db.insert(duplicateHistory).values({
      action,
      recordType,
      recordIds: recordIds,
      performedBy: userId,
      performedByName: userName,
      details: details || null,
      notes: notes || null,
    });
  }

  // Property Portal Settings operations
  async getPropertyPortalSettings(orgId: string, propertyId: number): Promise<PropertyPortalSettings[]> {
    return await db
      .select()
      .from(propertyPortalSettings)
      .where(and(eq(propertyPortalSettings.orgId, orgId), eq(propertyPortalSettings.propertyId, propertyId)))
      .orderBy(desc(propertyPortalSettings.version));
  }

  async getLatestPropertyPortalSettings(orgId: string, propertyId: number, status: string = "draft"): Promise<PropertyPortalSettings | undefined> {
    const [settings] = await db
      .select()
      .from(propertyPortalSettings)
      .where(and(
        eq(propertyPortalSettings.orgId, orgId),
        eq(propertyPortalSettings.propertyId, propertyId),
        eq(propertyPortalSettings.status, status)
      ))
      .orderBy(desc(propertyPortalSettings.version))
      .limit(1);
    return settings;
  }

  async createPropertyPortalSettings(settingsData: InsertPropertyPortalSettings): Promise<PropertyPortalSettings> {
    const [settings] = await db.insert(propertyPortalSettings).values(settingsData).returning();
    return settings;
  }

  async updatePropertyPortalSettings(id: string, settingsData: Partial<InsertPropertyPortalSettings>): Promise<PropertyPortalSettings> {
    const [settings] = await db
      .update(propertyPortalSettings)
      .set({ ...settingsData, updatedAt: new Date() })
      .where(eq(propertyPortalSettings.id, id))
      .returning();
    return settings;
  }

  async publishPropertyPortalSettings(orgId: string, propertyId: number, version: number): Promise<PropertyPortalSettings> {
    // First, archive any existing published settings
    await db
      .update(propertyPortalSettings)
      .set({ status: "archived", updatedAt: new Date() })
      .where(and(
        eq(propertyPortalSettings.orgId, orgId),
        eq(propertyPortalSettings.propertyId, propertyId),
        eq(propertyPortalSettings.status, "published")
      ));

    // Then publish the specified version
    const [settings] = await db
      .update(propertyPortalSettings)
      .set({ status: "published", updatedAt: new Date() })
      .where(and(
        eq(propertyPortalSettings.orgId, orgId),
        eq(propertyPortalSettings.propertyId, propertyId),
        eq(propertyPortalSettings.version, version)
      ))
      .returning();

    return settings;
  }

  // Property Forms Assignment operations
  async getPropertyForms(orgId: string, propertyId: string): Promise<PropertyForm[]> {
    return await db
      .select()
      .from(propertyForms)
      .where(and(eq(propertyForms.orgId, orgId), eq(propertyForms.propertyId, propertyId)))
      .orderBy(propertyForms.sortOrder);
  }

  async assignFormToProperty(orgId: string, propertyId: string, formId: string, sortOrder: number = 0, isRequired: boolean = false): Promise<PropertyForm> {
    // First verify the form exists and belongs to the organization
    const [form] = await db
      .select()
      .from(forms)
      .where(and(eq(forms.id, formId), eq(forms.orgId, orgId)))
      .limit(1);
    
    if (!form) {
      throw new Error("Form not found");
    }

    const [assignment] = await db
      .insert(propertyForms)
      .values({
        orgId,
        propertyId,
        formId,
        sortOrder,
        isRequired,
      })
      .returning();
    
    return assignment;
  }

  async removeFormFromProperty(orgId: string, propertyId: string, formId: string): Promise<void> {
    await db
      .delete(propertyForms)
      .where(and(
        eq(propertyForms.orgId, orgId),
        eq(propertyForms.propertyId, propertyId),
        eq(propertyForms.formId, formId)
      ));
  }

  async updatePropertyFormAssignment(orgId: string, propertyId: string, formId: string, updates: { sortOrder?: number, isRequired?: boolean }): Promise<PropertyForm> {
    const [assignment] = await db
      .update(propertyForms)
      .set(updates)
      .where(and(
        eq(propertyForms.orgId, orgId),
        eq(propertyForms.propertyId, propertyId),
        eq(propertyForms.formId, formId)
      ))
      .returning();
    
    return assignment;
  }

  // Form Submissions operations
  async createFormSubmission(submissionData: {
    orgId: string;
    propertyId: string;
    formId: string;
    submittedByClientId: string;
    answers: Record<string, any>;
    files?: Array<{fieldId: string; name: string; url: string; size: number}>;
    status?: string;
  }): Promise<FormSubmission> {
    const [submission] = await db
      .insert(formSubmissions)
      .values({
        ...submissionData,
        files: submissionData.files || [],
        status: submissionData.status || "received",
      })
      .returning();
    
    return submission;
  }

  async getFormSubmissions(orgId: string, propertyId?: string, formId?: string): Promise<FormSubmission[]> {
    let query = db.select().from(formSubmissions).where(eq(formSubmissions.orgId, orgId));
    
    if (propertyId) {
      query = query.where(and(eq(formSubmissions.orgId, orgId), eq(formSubmissions.propertyId, propertyId)));
    }
    
    if (formId) {
      const conditions = [eq(formSubmissions.orgId, orgId)];
      if (propertyId) conditions.push(eq(formSubmissions.propertyId, propertyId));
      conditions.push(eq(formSubmissions.formId, formId));
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(formSubmissions.createdAt));
  }

  async getFormSubmission(orgId: string, submissionId: string): Promise<FormSubmission | undefined> {
    const [submission] = await db
      .select()
      .from(formSubmissions)
      .where(and(eq(formSubmissions.orgId, orgId), eq(formSubmissions.id, submissionId)))
      .limit(1);
    
    return submission;
  }

  async updateFormSubmissionStatus(orgId: string, submissionId: string, status: string): Promise<FormSubmission> {
    const [submission] = await db
      .update(formSubmissions)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(formSubmissions.orgId, orgId), eq(formSubmissions.id, submissionId)))
      .returning();
    
    return submission;
  }

  // Form validation helper
  async validateFormSubmission(orgId: string, propertyId: string, formId: string, answers: Record<string, any>): Promise<{isValid: boolean; errors: string[]}> {
    // Check if form is assigned to property
    const [propertyForm] = await db
      .select()
      .from(propertyForms)
      .where(and(
        eq(propertyForms.orgId, orgId),
        eq(propertyForms.propertyId, propertyId),
        eq(propertyForms.formId, formId)
      ))
      .limit(1);
    
    if (!propertyForm) {
      return { isValid: false, errors: ["Form not assigned to this property"] };
    }

    // Get form definition
    const [form] = await db
      .select()
      .from(forms)
      .where(and(eq(forms.id, formId), eq(forms.orgId, orgId)))
      .limit(1);
    
    if (!form) {
      return { isValid: false, errors: ["Form not found"] };
    }

    // Validate required fields
    const errors: string[] = [];
    const requiredFields = form.schema.fields.filter((f: any) => f.required);
    
    for (const field of requiredFields) {
      const value = answers[field.id];
      if (value === undefined || value === null || value === "") {
        errors.push(`Missing required field: ${field.label || field.id}`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  // Calendar operations
  async getCalendars(orgId: string): Promise<Calendar[]> {
    return await db
      .select()
      .from(calendars)
      .where(eq(calendars.orgId, orgId))
      .orderBy(calendars.name);
  }

  async getCalendar(id: string): Promise<Calendar | undefined> {
    const [calendar] = await db
      .select()
      .from(calendars)
      .where(eq(calendars.id, id));
    return calendar;
  }

  async createCalendar(calendarData: InsertCalendar): Promise<Calendar> {
    const [calendar] = await db
      .insert(calendars)
      .values(calendarData)
      .returning();
    return calendar;
  }

  async updateCalendar(id: string, calendarData: Partial<InsertCalendar>): Promise<Calendar> {
    const [calendar] = await db
      .update(calendars)
      .set({ ...calendarData, updatedAt: new Date() })
      .where(eq(calendars.id, id))
      .returning();
    return calendar;
  }

  async deleteCalendar(id: string): Promise<void> {
    await db.delete(calendars).where(eq(calendars.id, id));
  }

  // Event operations
  async getEvents(orgId: string, startDate?: Date, endDate?: Date, calendarId?: string): Promise<Event[]> {
    let conditions = [eq(events.orgId, orgId)];
    
    if (calendarId) {
      conditions.push(eq(events.calendarId, calendarId));
    }
    
    if (startDate && endDate) {
      conditions.push(
        and(
          sql`${events.start} <= ${endDate.toISOString()}`,
          sql`${events.end} >= ${startDate.toISOString()}`
        ) as any
      );
    }
    
    return await db
      .select()
      .from(events)
      .where(and(...conditions))
      .orderBy(events.start);
  }

  async getOrgEvents(orgId: string): Promise<any[]> {
    // Get all events with calendar information for iCal feed generation
    const results = await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        start: events.start,
        end: events.end,
        allDay: events.allDay,
        location: events.location,
        recurrenceRule: events.recurrenceRule,
        calendar: {
          id: calendars.id,
          name: calendars.name,
          isPrivate: calendars.isPrivate,
          ownerId: calendars.ownerId,
        }
      })
      .from(events)
      .leftJoin(calendars, eq(events.calendarId, calendars.id))
      .where(eq(events.orgId, orgId))
      .orderBy(events.start);
    
    return results;
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, id));
    return event;
  }

  async createEvent(eventData: InsertEvent): Promise<Event> {
    const [event] = await db
      .insert(events)
      .values(eventData)
      .returning();
    return event;
  }

  async updateEvent(id: string, eventData: Partial<InsertEvent>): Promise<Event> {
    // Convert ISO string dates to Date objects if they are strings
    const processedData: any = { ...eventData };
    
    if (processedData.start && typeof processedData.start === 'string') {
      processedData.start = new Date(processedData.start);
    }
    
    if (processedData.end && typeof processedData.end === 'string') {
      processedData.end = new Date(processedData.end);
    }
    
    const [event] = await db
      .update(events)
      .set({ ...processedData, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return event;
  }

  async deleteEvent(id: string): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  // Event attendee operations
  async getEventAttendees(eventId: string): Promise<EventAttendee[]> {
    return await db
      .select()
      .from(eventAttendees)
      .where(eq(eventAttendees.eventId, eventId));
  }

  async addEventAttendee(attendeeData: InsertEventAttendee): Promise<EventAttendee> {
    const [attendee] = await db
      .insert(eventAttendees)
      .values(attendeeData)
      .returning();
    return attendee;
  }

  async updateEventAttendee(id: number, attendeeData: Partial<InsertEventAttendee>): Promise<EventAttendee> {
    const [attendee] = await db
      .update(eventAttendees)
      .set(attendeeData)
      .where(eq(eventAttendees.id, id))
      .returning();
    return attendee;
  }

  async removeEventAttendee(id: number): Promise<void> {
    await db.delete(eventAttendees).where(eq(eventAttendees.id, id));
  }

  // Event reminder operations
  async getEventReminders(eventId: string): Promise<EventReminder[]> {
    return await db
      .select()
      .from(eventReminders)
      .where(eq(eventReminders.eventId, eventId));
  }

  async addEventReminder(reminderData: InsertEventReminder): Promise<EventReminder> {
    const [reminder] = await db
      .insert(eventReminders)
      .values(reminderData)
      .returning();
    return reminder;
  }

  async removeEventReminder(id: number): Promise<void> {
    await db.delete(eventReminders).where(eq(eventReminders.id, id));
  }

  async getPendingReminders(): Promise<any[]> {
    const now = new Date();
    const upcomingWindow = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour window
    
    const reminders = await db
      .select({
        reminder: eventReminders,
        event: events,
      })
      .from(eventReminders)
      .innerJoin(events, eq(eventReminders.eventId, events.id))
      .where(
        and(
          sql`${eventReminders.lastSentAt} IS NULL`,
          sql`${events.start} <= ${upcomingWindow.toISOString()}`,
          sql`${events.start} > ${now.toISOString()}`
        )
      );
    
    return reminders;
  }

  async markReminderSent(id: number): Promise<void> {
    await db
      .update(eventReminders)
      .set({ lastSentAt: new Date() })
      .where(eq(eventReminders.id, id));
  }

  // ICS feed operations
  async getIcsFeed(token: string): Promise<IcsFeed | undefined> {
    const [feed] = await db
      .select()
      .from(icsFeeds)
      .where(and(eq(icsFeeds.token, token), eq(icsFeeds.isActive, true)));
    return feed;
  }

  async createIcsFeed(feedData: InsertIcsFeed): Promise<IcsFeed> {
    const [feed] = await db
      .insert(icsFeeds)
      .values(feedData)
      .returning();
    return feed;
  }

  async getIcsFeedsByOrg(orgId: string): Promise<IcsFeed[]> {
    return await db
      .select()
      .from(icsFeeds)
      .where(and(eq(icsFeeds.orgId, orgId), eq(icsFeeds.isActive, true)));
  }

  async deactivateIcsFeed(id: number): Promise<void> {
    await db
      .update(icsFeeds)
      .set({ isActive: false })
      .where(eq(icsFeeds.id, id));
  }

  // Event import operations
  async getEventImports(orgId: string): Promise<EventImport[]> {
    return await db
      .select()
      .from(eventImports)
      .where(eq(eventImports.orgId, orgId))
      .orderBy(desc(eventImports.createdAt));
  }

  async createEventImport(importData: InsertEventImport): Promise<EventImport> {
    const [eventImport] = await db
      .insert(eventImports)
      .values(importData)
      .returning();
    return eventImport;
  }

  async updateEventImport(id: number, importData: Partial<InsertEventImport>): Promise<EventImport> {
    const [eventImport] = await db
      .update(eventImports)
      .set({ ...importData, updatedAt: new Date() })
      .where(eq(eventImports.id, id))
      .returning();
    return eventImport;
  }

  async deleteEventImport(id: number): Promise<void> {
    await db.delete(eventImports).where(eq(eventImports.id, id));
  }

  // Conflict resolution operations
  async getConflictResolutions(orgId: string, status?: string): Promise<ConflictResolution[]> {
    let query = db
      .select()
      .from(conflictResolutions)
      .where(eq(conflictResolutions.orgId, orgId));
    
    if (status) {
      query = query.where(and(
        eq(conflictResolutions.orgId, orgId),
        eq(conflictResolutions.status, status)
      )) as any;
    }
    
    return await query.orderBy(desc(conflictResolutions.createdAt));
  }

  async getConflictResolution(id: number): Promise<ConflictResolution | undefined> {
    const [resolution] = await db
      .select()
      .from(conflictResolutions)
      .where(eq(conflictResolutions.id, id));
    return resolution;
  }

  async createConflictResolution(data: InsertConflictResolution): Promise<ConflictResolution> {
    const [resolution] = await db
      .insert(conflictResolutions)
      .values(data)
      .returning();
    return resolution;
  }

  async updateConflictResolution(id: number, data: Partial<InsertConflictResolution>): Promise<ConflictResolution> {
    const [resolution] = await db
      .update(conflictResolutions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(conflictResolutions.id, id))
      .returning();
    return resolution;
  }

  async deleteConflictResolution(id: number): Promise<void> {
    await db.delete(conflictResolutions).where(eq(conflictResolutions.id, id));
  }

  async approveConflictResolution(id: number, supervisorId: string, notes?: string): Promise<ConflictResolution> {
    const [resolution] = await db
      .update(conflictResolutions)
      .set({
        status: 'approved',
        supervisorId,
        resolutionNotes: notes || null,
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(conflictResolutions.id, id))
      .returning();
    return resolution;
  }

  async rejectConflictResolution(id: number, supervisorId: string, notes?: string): Promise<ConflictResolution> {
    const [resolution] = await db
      .update(conflictResolutions)
      .set({
        status: 'rejected',
        supervisorId,
        resolutionNotes: notes || null,
        rejectedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(conflictResolutions.id, id))
      .returning();
    return resolution;
  }

  async resolveConflictResolution(id: number, notes?: string): Promise<ConflictResolution> {
    const [resolution] = await db
      .update(conflictResolutions)
      .set({
        status: 'resolved',
        resolutionNotes: notes || null,
        resolvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(conflictResolutions.id, id))
      .returning();
    return resolution;
  }

  async getPendingConflictsByUser(userId: string): Promise<ConflictResolution[]> {
    return await db
      .select()
      .from(conflictResolutions)
      .where(and(
        eq(conflictResolutions.supervisorId, userId),
        eq(conflictResolutions.status, 'pending')
      ))
      .orderBy(desc(conflictResolutions.createdAt));
  }

  // Stripe operations - Master billing (Hubify billing organizations)
  async getOrgSubscription(orgId: string): Promise<OrgSubscription | undefined> {
    const [subscription] = await db
      .select()
      .from(orgSubscriptions)
      .where(eq(orgSubscriptions.orgId, orgId));
    return subscription;
  }

  async getAllOrgSubscriptions(): Promise<OrgSubscription[]> {
    const subscriptions = await db
      .select()
      .from(orgSubscriptions)
      .orderBy(orgSubscriptions.updatedAt);
    return subscriptions;
  }

  async updateOrgSubscription(orgId: string, subscriptionData: Partial<InsertOrgSubscription>): Promise<OrgSubscription> {
    const [subscription] = await db
      .update(orgSubscriptions)
      .set({ ...subscriptionData, updatedAt: new Date() })
      .where(eq(orgSubscriptions.orgId, orgId))
      .returning();
    return subscription;
  }

  async upsertOrgSubscription(orgId: string, subscriptionData: InsertOrgSubscription): Promise<OrgSubscription> {
    const existing = await this.getOrgSubscription(orgId);
    
    if (existing) {
      return await this.updateOrgSubscription(orgId, subscriptionData);
    } else {
      const [subscription] = await db
        .insert(orgSubscriptions)
        .values(subscriptionData)
        .returning();
      return subscription;
    }
  }

  // Stripe operations - Per-organization connections
  async getOrgStripeConnection(orgId: string): Promise<OrgStripeConnection | undefined> {
    const [connection] = await db
      .select()
      .from(orgStripeConnections)
      .where(eq(orgStripeConnections.orgId, orgId));
    return connection;
  }

  async createOrgStripeConnection(connectionData: InsertOrgStripeConnection): Promise<OrgStripeConnection> {
    const [connection] = await db
      .insert(orgStripeConnections)
      .values(connectionData)
      .returning();
    return connection;
  }

  async updateOrgStripeConnection(orgId: string, connectionData: Partial<InsertOrgStripeConnection>): Promise<OrgStripeConnection> {
    const [connection] = await db
      .update(orgStripeConnections)
      .set({ ...connectionData, updatedAt: new Date() })
      .where(eq(orgStripeConnections.orgId, orgId))
      .returning();
    return connection;
  }

  async deleteOrgStripeConnection(orgId: string): Promise<void> {
    await db.delete(orgStripeConnections).where(eq(orgStripeConnections.orgId, orgId));
  }

  // Stripe webhook operations
  async recordWebhookEvent(eventData: InsertStripeWebhookEvent): Promise<StripeWebhookEvent> {
    const [event] = await db
      .insert(stripeWebhookEvents)
      .values(eventData)
      .returning();
    return event;
  }

  async markWebhookProcessed(stripeEventId: string, error?: string): Promise<void> {
    await db
      .update(stripeWebhookEvents)
      .set({
        processed: true,
        processedAt: new Date(),
        errorMessage: error || null,
      })
      .where(eq(stripeWebhookEvents.stripeEventId, stripeEventId));
  }

  async getUnprocessedWebhooks(limit: number = 50): Promise<StripeWebhookEvent[]> {
    return await db
      .select()
      .from(stripeWebhookEvents)
      .where(eq(stripeWebhookEvents.processed, false))
      .orderBy(stripeWebhookEvents.createdAt)
      .limit(limit);
  }

  // Platform invoice operations (Admin → Organizations)
  async getPlatformInvoices(orgId?: string, status?: PlatformInvoice["status"]): Promise<PlatformInvoice[]> {
    let query = db.select().from(platformInvoices);
    
    const conditions = [];
    if (orgId) {
      conditions.push(eq(platformInvoices.orgId, orgId));
    }
    if (status) {
      conditions.push(eq(platformInvoices.status, status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(platformInvoices.createdAt));
  }

  async getPlatformInvoice(id: string, orgId?: string): Promise<PlatformInvoice | undefined> {
    const conditions = [eq(platformInvoices.id, id)];
    if (orgId) {
      conditions.push(eq(platformInvoices.orgId, orgId));
    }
    
    const [invoice] = await db
      .select()
      .from(platformInvoices)
      .where(and(...conditions));
    return invoice;
  }

  async createPlatformInvoice(invoiceData: InsertPlatformInvoice): Promise<PlatformInvoice> {
    const [invoice] = await db
      .insert(platformInvoices)
      .values(invoiceData)
      .returning();
    return invoice;
  }

  async updatePlatformInvoice(id: string, invoiceData: Partial<InsertPlatformInvoice>, orgId?: string): Promise<PlatformInvoice> {
    const conditions = [eq(platformInvoices.id, id)];
    if (orgId) {
      conditions.push(eq(platformInvoices.orgId, orgId));
    }
    
    const [invoice] = await db
      .update(platformInvoices)
      .set({ ...invoiceData, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();
    return invoice;
  }

  async deletePlatformInvoice(id: string, orgId?: string): Promise<void> {
    const conditions = [eq(platformInvoices.id, id)];
    if (orgId) {
      conditions.push(eq(platformInvoices.orgId, orgId));
    }
    
    await db.delete(platformInvoices).where(and(...conditions));
  }

  // Client invoice operations (Organizations → Clients)
  async getClientInvoices(orgId: string, clientId?: string, status?: ClientInvoice["status"]): Promise<ClientInvoice[]> {
    const conditions = [eq(clientInvoices.orgId, orgId)];
    
    if (clientId) {
      conditions.push(eq(clientInvoices.clientId, clientId));
    }
    if (status) {
      conditions.push(eq(clientInvoices.status, status));
    }
    
    return await db
      .select()
      .from(clientInvoices)
      .where(and(...conditions))
      .orderBy(desc(clientInvoices.createdAt));
  }

  async getClientInvoice(orgId: string, id: string): Promise<ClientInvoice | undefined> {
    const [invoice] = await db
      .select()
      .from(clientInvoices)
      .where(and(
        eq(clientInvoices.id, id),
        eq(clientInvoices.orgId, orgId)
      ));
    return invoice;
  }

  async createClientInvoice(invoiceData: InsertClientInvoice): Promise<ClientInvoice> {
    // Verify client belongs to the organization (integrity check)
    const [client] = await db
      .select()
      .from(clients)
      .where(and(
        eq(clients.id, invoiceData.clientId),
        eq(clients.orgId, invoiceData.orgId)
      ));
    
    if (!client) {
      throw new Error("Client does not belong to the specified organization");
    }
    
    const [invoice] = await db
      .insert(clientInvoices)
      .values(invoiceData)
      .returning();
    return invoice;
  }

  async updateClientInvoice(orgId: string, id: string, invoiceData: Partial<InsertClientInvoice>): Promise<ClientInvoice> {
    // If clientId is being updated, verify it belongs to the org
    if (invoiceData.clientId) {
      const [client] = await db
        .select()
        .from(clients)
        .where(and(
          eq(clients.id, invoiceData.clientId),
          eq(clients.orgId, orgId)
        ));
      
      if (!client) {
        throw new Error("Client does not belong to the specified organization");
      }
    }
    
    const [invoice] = await db
      .update(clientInvoices)
      .set({ ...invoiceData, updatedAt: new Date() })
      .where(and(
        eq(clientInvoices.id, id),
        eq(clientInvoices.orgId, orgId)
      ))
      .returning();
    return invoice;
  }

  async deleteClientInvoice(orgId: string, id: string): Promise<void> {
    await db.delete(clientInvoices).where(and(
      eq(clientInvoices.id, id),
      eq(clientInvoices.orgId, orgId)
    ));
  }
  
  // Security & Compliance operations
  async getAuditLogs(params: {
    limit: number;
    offset: number;
    severity?: string;
    actionType?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<any[]> {
    const conditions = [];
    
    if (params.severity) {
      conditions.push(eq(securityAuditLogs.severity, params.severity as any));
    }
    if (params.actionType) {
      conditions.push(eq(securityAuditLogs.actionType, params.actionType as any));
    }
    if (params.userId) {
      conditions.push(eq(securityAuditLogs.userId, params.userId));
    }
    if (params.startDate) {
      conditions.push(sql`${securityAuditLogs.createdAt} >= ${params.startDate}`);
    }
    if (params.endDate) {
      conditions.push(sql`${securityAuditLogs.createdAt} <= ${params.endDate}`);
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    return await db
      .select()
      .from(securityAuditLogs)
      .where(whereClause)
      .orderBy(desc(securityAuditLogs.createdAt))
      .limit(params.limit)
      .offset(params.offset);
  }
  
  async getAdminUsers(): Promise<any[]> {
    return await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isAdminAccount: users.isAdminAccount,
        lastActiveAt: users.lastActiveAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(or(
        eq(users.role, 'admin'),
        eq(users.role, 'supervisor'),
        eq(users.role, 'super_admin')
      ))
      .orderBy(desc(users.lastActiveAt));
  }
  
  async getUserSessions(userId: string): Promise<any[]> {
    return await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, userId))
      .orderBy(desc(userSessions.lastActivityAt));
  }
  
  async getAllActiveSessions(): Promise<any[]> {
    return await db
      .select({
        sessionId: userSessions.sessionId,
        userId: userSessions.userId,
        userEmail: users.email,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('userName'),
        ipAddress: userSessions.ipAddress,
        userAgent: userSessions.userAgent,
        lastActivityAt: userSessions.lastActivityAt,
        createdAt: userSessions.createdAt,
      })
      .from(userSessions)
      .innerJoin(users, eq(userSessions.userId, users.id))
      .where(eq(userSessions.isActive, true))
      .orderBy(desc(userSessions.lastActivityAt));
  }

  // Import history operations
  async createImportHistory(history: InsertImportHistory): Promise<ImportHistory> {
    const [newHistory] = await db.insert(importHistory).values(history).returning();
    return newHistory;
  }

  async getImportHistory(orgId: string): Promise<any[]> {
    return await db
      .select({
        id: importHistory.id,
        entityType: importHistory.entityType,
        fileName: importHistory.fileName,
        status: importHistory.status,
        totalRecords: importHistory.totalRecords,
        createdRecords: importHistory.createdRecords,
        updatedRecords: importHistory.updatedRecords,
        failedRecords: importHistory.failedRecords,
        initiatedAt: importHistory.initiatedAt,
        initiatedBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(importHistory)
      .innerJoin(users, eq(importHistory.initiatedBy, users.id))
      .where(eq(importHistory.orgId, orgId))
      .orderBy(desc(importHistory.initiatedAt));
  }

  // Platform template operations
  async getPlatformTemplates(): Promise<PlatformTemplate[]> {
    return await db.select().from(platformTemplates).orderBy(platformTemplates.type, platformTemplates.name);
  }

  async getPlatformTemplate(id: number): Promise<PlatformTemplate | undefined> {
    const [template] = await db.select().from(platformTemplates).where(eq(platformTemplates.id, id));
    return template;
  }

  async getPlatformTemplateByType(type: string): Promise<PlatformTemplate | undefined> {
    const [template] = await db
      .select()
      .from(platformTemplates)
      .where(and(
        eq(platformTemplates.type, type),
        eq(platformTemplates.isActive, true)
      ))
      .limit(1);
    return template;
  }

  async createPlatformTemplate(template: InsertPlatformTemplate): Promise<PlatformTemplate> {
    const [newTemplate] = await db.insert(platformTemplates).values(template).returning();
    return newTemplate;
  }

  async updatePlatformTemplate(id: number, template: Partial<InsertPlatformTemplate>): Promise<PlatformTemplate> {
    const [updated] = await db
      .update(platformTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(platformTemplates.id, id))
      .returning();
    return updated;
  }

  async deletePlatformTemplate(id: number): Promise<void> {
    await db.delete(platformTemplates).where(eq(platformTemplates.id, id));
  }
  
  // Calendar report template operations
  async getCalendarReportTemplates(): Promise<CalendarReportTemplate[]> {
    return await db.select().from(calendarReportTemplates).where(eq(calendarReportTemplates.isActive, true)).orderBy(calendarReportTemplates.name);
  }
  
  async getCalendarReportTemplate(id: number): Promise<CalendarReportTemplate | undefined> {
    const [template] = await db.select().from(calendarReportTemplates).where(eq(calendarReportTemplates.id, id));
    return template;
  }
  
  async getDefaultCalendarReportTemplate(): Promise<CalendarReportTemplate | undefined> {
    const [template] = await db
      .select()
      .from(calendarReportTemplates)
      .where(and(
        eq(calendarReportTemplates.isActive, true),
        eq(calendarReportTemplates.isDefault, true)
      ))
      .limit(1);
    return template;
  }
  
  async createCalendarReportTemplate(template: InsertCalendarReportTemplate): Promise<CalendarReportTemplate> {
    const [newTemplate] = await db.insert(calendarReportTemplates).values(template).returning();
    return newTemplate;
  }
  
  async updateCalendarReportTemplate(id: number, template: Partial<InsertCalendarReportTemplate>): Promise<CalendarReportTemplate> {
    const [updated] = await db
      .update(calendarReportTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(calendarReportTemplates.id, id))
      .returning();
    return updated;
  }
  
  async deleteCalendarReportTemplate(id: number): Promise<void> {
    await db.delete(calendarReportTemplates).where(eq(calendarReportTemplates.id, id));
  }
  
  // Support request operations
  async createSupportRequest(request: InsertSupportRequest): Promise<SupportRequest> {
    const [newRequest] = await db.insert(supportRequests).values(request).returning();
    return newRequest;
  }
  
  async getSupportRequests(): Promise<any[]> {
    const results = await db
      .select({
        id: supportRequests.id,
        organizationId: supportRequests.organizationId,
        organizationName: orgs.name,
        userId: supportRequests.userId,
        userName: supportRequests.userName,
        email: supportRequests.email,
        subject: supportRequests.subject,
        message: supportRequests.message,
        hyperlinks: supportRequests.hyperlinks,
        attachmentUrls: supportRequests.attachmentUrls,
        status: supportRequests.status,
        urgency: supportRequests.urgency,
        resolvedAt: supportRequests.resolvedAt,
        createdAt: supportRequests.createdAt,
      })
      .from(supportRequests)
      .leftJoin(orgs, eq(supportRequests.organizationId, orgs.id))
      .orderBy(desc(supportRequests.createdAt));
    return results;
  }
  
  async getSupportRequest(id: number): Promise<SupportRequest | undefined> {
    const [request] = await db.select().from(supportRequests).where(eq(supportRequests.id, id));
    return request;
  }
  
  async updateSupportRequestStatus(id: number, status: "new"|"in_progress"|"resolved"): Promise<SupportRequest> {
    const updates: any = { status };
    if (status === "resolved") {
      updates.resolvedAt = new Date();
    }
    const [updated] = await db
      .update(supportRequests)
      .set(updates)
      .where(eq(supportRequests.id, id))
      .returning();
    return updated;
  }
  
  // Email template operations
  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [newTemplate] = await db.insert(emailTemplates).values(template).returning();
    return newTemplate;
  }
  
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates).orderBy(emailTemplates.type);
  }
  
  async getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return template;
  }
  
  async getEmailTemplateByType(type: "ticket_receipt"|"ticket_notification"|"status_update"): Promise<EmailTemplate | undefined> {
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(and(
        eq(emailTemplates.type, type),
        eq(emailTemplates.isActive, true)
      ));
    return template;
  }
  
  async updateEmailTemplate(id: number, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate> {
    const [updated] = await db
      .update(emailTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(emailTemplates.id, id))
      .returning();
    return updated;
  }
  
  async deleteEmailTemplate(id: number): Promise<void> {
    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
  }
  
  // Custom field operations
  async getCustomFields(orgId: string, entityType?: "task"|"property"|"contact"): Promise<CustomField[]> {
    const conditions = [eq(customFields.orgId, orgId), eq(customFields.isActive, true)];
    if (entityType) {
      conditions.push(eq(customFields.entityType, entityType));
    }
    
    return await db
      .select()
      .from(customFields)
      .where(and(...conditions))
      .orderBy(customFields.displayOrder, customFields.id);
  }
  
  async getCustomField(id: number, orgId: string): Promise<CustomField | undefined> {
    const [field] = await db
      .select()
      .from(customFields)
      .where(and(eq(customFields.id, id), eq(customFields.orgId, orgId)));
    return field;
  }
  
  async createCustomField(field: InsertCustomField): Promise<CustomField> {
    // Auto-generate fieldKey from fieldName if not provided
    let baseKey = field.fieldKey || field.fieldName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    let fieldKey = baseKey;
    let suffix = 1;
    
    // Check for existing keys and append suffix if needed to avoid collisions
    while (true) {
      const existing = await db
        .select()
        .from(customFields)
        .where(and(
          eq(customFields.orgId, field.orgId),
          eq(customFields.entityType, field.entityType),
          eq(customFields.fieldKey, fieldKey)
        ))
        .limit(1);
      
      if (existing.length === 0) {
        // Key is available
        break;
      }
      
      // Key exists, try with suffix
      fieldKey = `${baseKey}_${suffix}`;
      suffix++;
    }
    
    const [newField] = await db
      .insert(customFields)
      .values({ ...field, fieldKey })
      .returning();
    return newField;
  }
  
  async updateCustomField(id: number, orgId: string, field: Partial<Omit<InsertCustomField, "orgId"|"fieldKey">>): Promise<CustomField> {
    // Verify org ownership before updating
    const existing = await this.getCustomField(id, orgId);
    if (!existing) {
      throw new Error("Custom field not found or access denied");
    }
    
    const [updated] = await db
      .update(customFields)
      .set({ ...field, updatedAt: new Date() })
      .where(and(eq(customFields.id, id), eq(customFields.orgId, orgId)))
      .returning();
    return updated;
  }
  
  async deleteCustomField(id: number, orgId: string): Promise<void> {
    // Verify org ownership before deleting
    const existing = await this.getCustomField(id, orgId);
    if (!existing) {
      throw new Error("Custom field not found or access denied");
    }
    
    // Soft delete by setting isActive to false
    await db
      .update(customFields)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(customFields.id, id), eq(customFields.orgId, orgId)));
  }
  
  async reorderCustomFields(orgId: string, fieldIds: number[]): Promise<void> {
    // Verify all fields belong to this org before reordering
    const fields = await db
      .select()
      .from(customFields)
      .where(and(
        eq(customFields.orgId, orgId),
        inArray(customFields.id, fieldIds)
      ));
    
    if (fields.length !== fieldIds.length) {
      throw new Error("Some fields not found or access denied");
    }
    
    // Update display order for each field
    for (let i = 0; i < fieldIds.length; i++) {
      await db
        .update(customFields)
        .set({ displayOrder: i, updatedAt: new Date() })
        .where(and(eq(customFields.id, fieldIds[i]), eq(customFields.orgId, orgId)));
    }
  }
  
  // Admin note search - searches across all note sources in the system
  async searchAllNotes(orgId: string, searchQuery: string): Promise<any[]> {
    const searchTerm = `%${searchQuery}%`;
    const results: any[] = [];
    
    // 1. Vehicle Notes
    const vehicleNotesResults = await db
      .select({
        id: vehicleNotes.id,
        type: sql<string>`'vehicle_note'`,
        title: vehicleNotes.title,
        content: vehicleNotes.content,
        category: vehicleNotes.category,
        createdBy: users.name,
        createdAt: vehicleNotes.createdAt,
        relatedEntity: vehicles.name,
        relatedEntityId: vehicles.id,
        relatedEntityType: sql<string>`'vehicle'`,
        isImportant: vehicleNotes.isImportant,
      })
      .from(vehicleNotes)
      .innerJoin(vehicles, eq(vehicleNotes.vehicleId, vehicles.id))
      .innerJoin(users, eq(vehicleNotes.createdById, users.id))
      .innerJoin(properties, eq(vehicles.propertyId, properties.id))
      .where(and(
        eq(properties.orgId, orgId),
        or(
          like(vehicleNotes.title, searchTerm),
          like(vehicleNotes.content, searchTerm)
        )
      ))
      .orderBy(desc(vehicleNotes.createdAt))
      .limit(50);
    results.push(...vehicleNotesResults);
    
    // 2. Room Notes
    const roomNotesResults = await db
      .select({
        id: roomNotes.id,
        type: sql<string>`'room_note'`,
        title: roomNotes.title,
        content: roomNotes.content,
        category: roomNotes.category,
        createdBy: users.name,
        createdAt: roomNotes.createdAt,
        relatedEntity: sql<string>`${rooms.name} || ' (' || ${properties.address} || ')'`,
        relatedEntityId: rooms.id,
        relatedEntityType: sql<string>`'room'`,
        isImportant: roomNotes.isImportant,
      })
      .from(roomNotes)
      .innerJoin(rooms, eq(roomNotes.roomId, rooms.id))
      .innerJoin(properties, eq(rooms.propertyId, properties.id))
      .innerJoin(users, eq(roomNotes.createdById, users.id))
      .where(and(
        eq(properties.orgId, orgId),
        or(
          like(roomNotes.title, searchTerm),
          like(roomNotes.content, searchTerm)
        )
      ))
      .orderBy(desc(roomNotes.createdAt))
      .limit(50);
    results.push(...roomNotesResults);
    
    // 3. Property notes
    const propertyNotesResults = await db
      .select({
        id: properties.id,
        type: sql<string>`'property_note'`,
        title: sql<string>`'Property Note'`,
        content: properties.notes,
        category: sql<string>`'general'`,
        createdBy: sql<string>`''`,
        createdAt: properties.createdAt,
        relatedEntity: properties.address,
        relatedEntityId: properties.id,
        relatedEntityType: sql<string>`'property'`,
        isImportant: sql<boolean>`false`,
      })
      .from(properties)
      .where(and(
        eq(properties.orgId, orgId),
        isNotNull(properties.notes),
        like(properties.notes, searchTerm)
      ))
      .orderBy(desc(properties.createdAt))
      .limit(50);
    results.push(...propertyNotesResults);
    
    // 4. Contact notes
    const contactNotesResults = await db
      .select({
        id: contacts.id,
        type: sql<string>`'contact_note'`,
        title: sql<string>`'Contact Note'`,
        content: contacts.notes,
        category: contacts.type,
        createdBy: sql<string>`''`,
        createdAt: contacts.createdAt,
        relatedEntity: sql<string>`${contacts.firstName} || ' ' || ${contacts.lastName}`,
        relatedEntityId: contacts.id,
        relatedEntityType: sql<string>`'contact'`,
        isImportant: sql<boolean>`false`,
      })
      .from(contacts)
      .where(and(
        eq(contacts.orgId, orgId),
        eq(contacts.isActive, true),
        isNotNull(contacts.notes),
        like(contacts.notes, searchTerm)
      ))
      .orderBy(desc(contacts.createdAt))
      .limit(50);
    results.push(...contactNotesResults);
    
    // 5. Task notes (checklist items)
    const taskNotesResults = await db
      .select({
        id: checklistItems.id,
        type: sql<string>`'task_note'`,
        title: tasks.title,
        content: checklistItems.notes,
        category: sql<string>`'task'`,
        createdBy: sql<string>`''`,
        createdAt: tasks.createdAt,
        relatedEntity: tasks.title,
        relatedEntityId: tasks.id,
        relatedEntityType: sql<string>`'task'`,
        isImportant: sql<boolean>`false`,
      })
      .from(checklistItems)
      .innerJoin(tasks, eq(checklistItems.taskId, tasks.id))
      .where(and(
        eq(tasks.orgId, orgId),
        isNotNull(checklistItems.notes),
        like(checklistItems.notes, searchTerm)
      ))
      .orderBy(desc(tasks.createdAt))
      .limit(50);
    results.push(...taskNotesResults);
    
    // 6. Time tracking notes
    const timeTrackingNotesResults = await db
      .select({
        id: timeTracking.id,
        type: sql<string>`'time_tracking_note'`,
        title: sql<string>`'Time Entry Note'`,
        content: timeTracking.notes,
        category: timeTracking.workType,
        createdBy: users.name,
        createdAt: timeTracking.clockIn,
        relatedEntity: sql<string>`${users.name} || ' - ' || ${timeTracking.workType}`,
        relatedEntityId: timeTracking.id,
        relatedEntityType: sql<string>`'time_tracking'`,
        isImportant: sql<boolean>`false`,
      })
      .from(timeTracking)
      .innerJoin(users, eq(timeTracking.userId, users.id))
      .where(and(
        eq(users.orgId, orgId),
        isNotNull(timeTracking.notes),
        like(timeTracking.notes, searchTerm)
      ))
      .orderBy(desc(timeTracking.clockIn))
      .limit(50);
    results.push(...timeTrackingNotesResults);
    
    // 7. Vehicle Maintenance notes
    const vehicleMaintenanceNotesResults = await db
      .select({
        id: vehicleMaintenance.id,
        type: sql<string>`'vehicle_maintenance_note'`,
        title: vehicleMaintenance.serviceType,
        content: vehicleMaintenance.notes,
        category: vehicleMaintenance.serviceType,
        createdBy: users.name,
        createdAt: vehicleMaintenance.createdAt,
        relatedEntity: sql<string>`${vehicles.name} || ' - ' || ${vehicleMaintenance.serviceType}`,
        relatedEntityId: vehicles.id,
        relatedEntityType: sql<string>`'vehicle'`,
        isImportant: sql<boolean>`false`,
      })
      .from(vehicleMaintenance)
      .innerJoin(vehicles, eq(vehicleMaintenance.vehicleId, vehicles.id))
      .innerJoin(users, eq(vehicleMaintenance.createdById, users.id))
      .innerJoin(properties, eq(vehicles.propertyId, properties.id))
      .where(and(
        eq(properties.orgId, orgId),
        isNotNull(vehicleMaintenance.notes),
        like(vehicleMaintenance.notes, searchTerm)
      ))
      .orderBy(desc(vehicleMaintenance.createdAt))
      .limit(50);
    results.push(...vehicleMaintenanceNotesResults);
    
    // Sort all results by created date
    results.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    
    // Return top 100 results
    return results.slice(0, 100);
  }
}

export const storage = new DatabaseStorage();
