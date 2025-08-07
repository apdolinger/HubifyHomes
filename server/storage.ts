import {
  users,
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
  tasks,
  contacts,
  teamMessages,
  messageReactions,
  activityLog,
  forms,
  formSubmissions,
  type User,
  type UpsertUser,
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
  type Task,
  type InsertTask,
  type Contact,
  type InsertContact,
  type TeamMessage,
  type InsertTeamMessage,
  type MessageReaction,
  type InsertMessageReaction,
  type ActivityLog,
  type InsertActivityLog,
  type Form,
  type InsertForm,
  type FormSubmission,
  type InsertFormSubmission,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations - required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Community operations
  getCommunities(): Promise<Community[]>;
  getCommunity(id: number): Promise<Community | undefined>;
  createCommunity(community: InsertCommunity, userId: string): Promise<Community>;
  updateCommunity(id: number, community: Partial<InsertCommunity>): Promise<Community>;
  deleteCommunity(id: number): Promise<void>;
  
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
  
  // Contact operations
  getContacts(includeInactive?: boolean): Promise<Contact[]>;
  getContactsByProperty(propertyId: number): Promise<Contact[]>;
  getContact(id: number): Promise<Contact | undefined>;
  createContact(contact: InsertContact, userId: string): Promise<Contact>;
  updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact>;
  deleteContact(id: number): Promise<void>;
  
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
  getForms(userId: string): Promise<Form[]>;
  getFormByKey(formKey: string): Promise<Form | undefined>;
  createForm(form: InsertForm): Promise<Form>;
  deleteForm(formId: number, userId: string): Promise<void>;
  createFormSubmission(submission: InsertFormSubmission): Promise<FormSubmission>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
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

  // Community operations
  async getCommunities(): Promise<Community[]> {
    return db.select().from(communities).orderBy(desc(communities.createdAt));
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
      isActive: roomDevices.isActive,
      createdById: roomDevices.createdById,
      createdAt: roomDevices.createdAt,
      updatedAt: roomDevices.updatedAt,
      createdBy: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      }
    })
    .from(roomDevices)
    .leftJoin(users, eq(roomDevices.createdById, users.id))
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

  // Contact operations
  async getContacts(includeInactive: boolean = false): Promise<Contact[]> {
    if (includeInactive) {
      return await db.select().from(contacts).orderBy(desc(contacts.createdAt));
    }
    return await db.select().from(contacts).where(eq(contacts.isActive, true)).orderBy(desc(contacts.createdAt));
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

    const [completedTodayCount] = await db
      .select({ count: count() })
      .from(tasks)
      .where(and(
        eq(tasks.status, "completed"),
        sql`DATE(${tasks.completedAt}) = CURRENT_DATE`
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
      completedToday: completedTodayCount.count,
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
  async getForms(userId: string): Promise<Form[]> {
    return await db
      .select()
      .from(forms)
      .where(eq(forms.createdBy, userId))
      .orderBy(desc(forms.createdAt));
  }

  async getFormByKey(formKey: string): Promise<Form | undefined> {
    const [form] = await db
      .select()
      .from(forms)
      .where(eq(forms.formKey, formKey));
    return form;
  }

  async createForm(formData: InsertForm): Promise<Form> {
    const [form] = await db.insert(forms).values(formData).returning();
    return form;
  }

  async deleteForm(formId: number, userId: string): Promise<void> {
    await db
      .delete(forms)
      .where(and(eq(forms.id, formId), eq(forms.createdBy, userId)));
  }

  async createFormSubmission(submissionData: InsertFormSubmission): Promise<FormSubmission> {
    const [submission] = await db
      .insert(formSubmissions)
      .values(submissionData)
      .returning();
    return submission;
  }
}

export const storage = new DatabaseStorage();
