import {
  users,
  communities,
  properties,
  tasks,
  contacts,
  teamMessages,
  activityLog,
  type User,
  type UpsertUser,
  type Community,
  type InsertCommunity,
  type Property,
  type InsertProperty,
  type Task,
  type InsertTask,
  type Contact,
  type InsertContact,
  type TeamMessage,
  type InsertTeamMessage,
  type ActivityLog,
  type InsertActivityLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations - required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Community operations
  getCommunities(): Promise<Community[]>;
  getCommunity(id: number): Promise<Community | undefined>;
  createCommunity(community: InsertCommunity, userId: string): Promise<Community>;
  updateCommunity(id: number, community: Partial<InsertCommunity>): Promise<Community>;
  deleteCommunity(id: number): Promise<void>;
  
  // Property operations
  getProperties(): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  createProperty(property: InsertProperty, userId: string): Promise<Property>;
  updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property>;
  deleteProperty(id: number): Promise<void>;
  
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
  
  // Contact operations
  getContacts(): Promise<Contact[]>;
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
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
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
  async getProperties(): Promise<Property[]> {
    return await db.select().from(properties).where(eq(properties.isActive, true)).orderBy(desc(properties.createdAt));
  }

  async getProperty(id: number): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property;
  }

  async createProperty(property: InsertProperty, userId: string): Promise<Property> {
    const [newProperty] = await db.insert(properties).values(property).returning();
    
    // Log activity
    await this.logActivity({
      userId: userId,
      action: "property_created",
      entityType: "property",
      entityId: newProperty.id.toString(),
      description: `Added property "${newProperty.name}"`,
    });
    
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

  // Task operations
  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTasksByProperty(propertyId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.propertyId, propertyId)).orderBy(desc(tasks.createdAt));
  }

  async getTasksByUser(userId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.assignedToId, userId)).orderBy(desc(tasks.createdAt));
  }

  async getUrgentTasks(): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.status, "pending"),
        or(
          eq(tasks.priority, "urgent"),
          and(
            eq(tasks.priority, "high"),
            sql`${tasks.dueDate} <= CURRENT_TIMESTAMP + INTERVAL '1 day'`
          )
        )
      ))
      .orderBy(desc(tasks.priority), tasks.dueDate);
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    
    // Log activity
    await this.logActivity({
      userId: task.assignedById || "system",
      action: "task_created",
      entityType: "task",
      entityId: newTask.id.toString(),
      description: `Created task "${newTask.title}"`,
    });
    
    return newTask;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ ...task, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
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

  // Contact operations
  async getContacts(): Promise<Contact[]> {
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

  async createContact(contact: InsertContact, userId: string): Promise<Contact> {
    const [newContact] = await db.insert(contacts).values(contact).returning();
    
    // Log activity
    await this.logActivity({
      userId: userId,
      action: "contact_created",
      entityType: "contact",
      entityId: newContact.id.toString(),
      description: `Added contact "${newContact.firstName} ${newContact.lastName}"`,
    });
    
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
  async getTeamMessages(limit: number = 10): Promise<TeamMessage[]> {
    return await db
      .select()
      .from(teamMessages)
      .orderBy(desc(teamMessages.createdAt))
      .limit(limit);
  }

  async createTeamMessage(message: InsertTeamMessage): Promise<TeamMessage> {
    const [newMessage] = await db.insert(teamMessages).values(message).returning();
    return newMessage;
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
        eq(tasks.status, "pending"),
        or(
          eq(tasks.priority, "urgent"),
          eq(tasks.priority, "high")
        )
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
          like(properties.address, searchTerm)
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
}

export const storage = new DatabaseStorage();
