import {
  users,
  outOfOfficePeriods,
  orgs,
  orgSubscriptions,
  orgStripeConnections,
  stripeWebhookEvents,
  platformInvoices,
  clientInvoices,
  clients,
  portalUsers,
  portalUserProperties,
  portalSessions,
  portalInvitations,
  communities,
  properties,
  rooms,
  roomSupplies,
  roomNotes,
  roomDevices,
  roomSurfaces,
  roomFixtures,
  roomPhotos,
  roomChecklists,
  vehicles,
  vehicleMaintenance,
  vehicleNotes,
  tasks,
  timeEntries,
  contacts,
  contactProperties,
  teamMessages,
  messageReactions,
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
  securityAuditLogs,
  userSessions,
  type User,
  type UpsertUser,
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
  type RoomFixture,
  type InsertRoomFixture,
  type RoomPhoto,
  type InsertRoomPhoto,
  type RoomChecklist,
  type InsertRoomChecklist,
  type Vehicle,
  type InsertVehicle,
  type VehicleMaintenance,
  type InsertVehicleMaintenance,
  type VehicleNote,
  type InsertVehicleNote,
  type Task,
  type InsertTask,
  type TimeEntry,
  type InsertTimeEntry,
  type Contact,
  type InsertContact,
  type ContactProperty,
  type InsertContactProperty,
  type TeamMessage,
  type InsertTeamMessage,
  type MessageReaction,
  type InsertMessageReaction,
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
  type OutOfOfficePeriod,
  type InsertOutOfOfficePeriod,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, count, sql } from "drizzle-orm";

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
  
  // Organization operations
  getOrgs(): Promise<Org[]>;
  getOrg(id: string): Promise<Org | undefined>;
  createOrg(org: InsertOrg): Promise<Org>;
  updateOrg(id: string, org: Partial<InsertOrg>): Promise<Org>;
  getOrgSubscription(orgId: string): Promise<OrgSubscription | undefined>;
  upsertOrgSubscription(subscription: InsertOrgSubscription): Promise<OrgSubscription>;
  
  // Client operations
  getClients(orgId: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client>;
  
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
  createRoomSupply(supply: InsertRoomSupply): Promise<RoomSupply>;
  updateRoomSupply(id: number, supply: Partial<InsertRoomSupply>): Promise<RoomSupply>;
  deleteRoomSupply(id: number): Promise<void>;
  
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
  archiveTask(taskId: number): Promise<Task>;
  deleteTask(taskId: number): Promise<void>;
  checkTaskConflicts(assignedUserId: string, dueDate: string, timeEstimate: string, excludeTaskId?: number): Promise<any[]>;
  
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
  
  // Team message operations
  getTeamMessages(limit?: number): Promise<TeamMessage[]>;
  createTeamMessage(message: InsertTeamMessage): Promise<TeamMessage>;
  
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
  ignoreDuplicate(recordType: string, recordIds: number[], userId: string, reason?: string): Promise<void>;
  getDuplicateHistory(): Promise<DuplicateHistory[]>;
  addDuplicateHistory(action: string, recordType: string, recordIds: number[], userId: string, details?: any): Promise<void>;
  
  // Calendar operations
  getCalendars(orgId: string): Promise<Calendar[]>;
  getCalendar(id: string): Promise<Calendar | undefined>;
  createCalendar(calendar: InsertCalendar): Promise<Calendar>;
  updateCalendar(id: string, calendar: Partial<InsertCalendar>): Promise<Calendar>;
  deleteCalendar(id: string): Promise<void>;
  
  // Event operations
  getEvents(orgId: string, startDate?: Date, endDate?: Date, calendarId?: string): Promise<Event[]>;
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
    const existing = await this.getUser(userData.id);
    
    if (existing) {
      const [user] = await db
        .update(users)
        .set({ ...userData, updatedAt: new Date() })
        .where(eq(users.id, userData.id))
        .returning();
      return user;
    } else {
      const [user] = await db.insert(users).values(userData).returning();
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
      locationInRoom: roomDevices.locationInRoom,
      installDate: roomDevices.installDate,
      lastServiced: roomDevices.lastServiced,
      nextServiceDue: roomDevices.nextServiceDue,
      notes: roomDevices.notes,
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
    
    // Then return the complete task with joined data
    const [updatedTask] = await db.select({
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

  async archiveTask(taskId: number): Promise<Task> {
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
      userId: updatedTask.assignedToId || "system",
      action: "task_archived",
      entityType: "task",
      entityId: taskId.toString(),
      description: `Archived task "${updatedTask.title}"`,
    });
    
    return updatedTask;
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
    return duplicates.filter(group => group.confidence >= criteria.minimumConfidence);
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
    if (contact.first_name) score += 20;
    if (contact.last_name) score += 20;
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
    const name1 = `${contact1.first_name || ''} ${contact1.last_name || ''}`.trim().toLowerCase();
    const name2 = `${contact2.first_name || ''} ${contact2.last_name || ''}`.trim().toLowerCase();
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

    const name1 = `${contact1.first_name || ''} ${contact1.last_name || ''}`.trim().toLowerCase();
    const name2 = `${contact2.first_name || ''} ${contact2.last_name || ''}`.trim().toLowerCase();
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

  async ignoreDuplicate(recordType: string, recordIds: number[], userId: string, reason?: string): Promise<void> {
    await db.insert(ignoredDuplicates).values({
      recordType,
      recordIds: recordIds.map(id => id.toString()),
      ignoredBy: userId,
      reason: reason || null,
    });

    // Add to history
    await this.addDuplicateHistory('ignore', recordType, recordIds, userId, { reason });
  }

  async getDuplicateHistory(): Promise<DuplicateHistory[]> {
    const results = await db
      .select()
      .from(duplicateHistory)
      .orderBy(desc(duplicateHistory.performedAt));

    return results;
  }

  async addDuplicateHistory(action: string, recordType: string, recordIds: number[], userId: string, details?: any): Promise<void> {
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
    const [event] = await db
      .update(events)
      .set({ ...eventData, updatedAt: new Date() })
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
}

export const storage = new DatabaseStorage();
