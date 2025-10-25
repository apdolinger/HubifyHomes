import { RRule } from 'rrule';
import type { InsertTask, Task, TaskChecklistItem, InsertTaskChecklistItem } from '@shared/schema';
import { db } from './db';
import { tasks, taskChecklistItems } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface GenerateInstancesOptions {
  templateTask: Task;
  checklistItems?: TaskChecklistItem[];
  lookAheadMonths?: number; // How far into the future to generate instances (default: 12 months)
}

export interface GeneratedInstance {
  task: Task;
  checklistItems: TaskChecklistItem[];
}

/**
 * Generates individual task instances from a recurring task template
 * Each instance gets its own copy of checklist items
 */
export async function generateTaskInstances(
  options: GenerateInstancesOptions
): Promise<GeneratedInstance[]> {
  const { templateTask, checklistItems = [], lookAheadMonths = 12 } = options;

  if (!templateTask.recurrenceRule) {
    throw new Error('Template task must have a recurrence rule');
  }

  // Parse the RRULE to get occurrence dates
  const rrule = RRule.fromString(templateTask.recurrenceRule);
  
  // Calculate how many instances to generate
  const now = new Date();
  const lookAheadUntil = new Date(now);
  lookAheadUntil.setMonth(lookAheadUntil.getMonth() + lookAheadMonths);
  
  // Get all occurrences within the lookahead period
  const occurrences = rrule.between(now, lookAheadUntil, true);

  const generatedInstances: GeneratedInstance[] = [];

  for (const occurrenceDate of occurrences) {
    // Create task instance
    const instanceData: InsertTask = {
      title: templateTask.title,
      description: templateTask.description,
      priority: templateTask.priority,
      status: 'pending',
      propertyId: templateTask.propertyId,
      roomId: templateTask.roomId,
      contactId: templateTask.contactId,
      assignedToId: templateTask.assignedToId,
      assignedById: templateTask.assignedById,
      dueDate: occurrenceDate,
      timeEstimate: templateTask.timeEstimate,
      category: templateTask.category,
      billedSeparately: templateTask.billedSeparately,
      billingAmount: templateTask.billingAmount,
      billableRateCents: templateTask.billableRateCents,
      // Instance-specific fields
      isTemplate: false,
      templateTaskId: templateTask.id,
      instanceDate: occurrenceDate,
      // No recurrence rule for instances
      recurrenceRule: null,
      recurrenceExDates: null,
    };

    // Insert the task instance
    const [taskInstance] = await db.insert(tasks).values(instanceData).returning();

    // Clone checklist items for this instance
    const clonedChecklistItems: TaskChecklistItem[] = [];
    
    if (checklistItems.length > 0) {
      for (const item of checklistItems) {
        const clonedItemData: InsertTaskChecklistItem = {
          taskId: taskInstance.id,
          text: item.text,
          completed: false, // Reset completion status
          dueDate: item.dueDate ? new Date(occurrenceDate.getTime() + (item.dueDate.getTime() - (templateTask.dueDate?.getTime() || occurrenceDate.getTime()))) : null,
          assignedToId: item.assignedToId,
          priority: item.priority,
          sortOrder: item.sortOrder,
          notes: item.notes,
        };

        const [clonedItem] = await db.insert(taskChecklistItems).values(clonedItemData).returning();
        clonedChecklistItems.push(clonedItem);
      }
    }

    generatedInstances.push({
      task: taskInstance,
      checklistItems: clonedChecklistItems,
    });
  }

  // Mark the original task as a template
  await db.update(tasks)
    .set({ isTemplate: true })
    .where(eq(tasks.id, templateTask.id));

  return generatedInstances;
}

/**
 * Get all instances for a template task
 */
export async function getTaskInstances(templateTaskId: number): Promise<Task[]> {
  return await db.select()
    .from(tasks)
    .where(eq(tasks.templateTaskId, templateTaskId));
}

/**
 * Get the template task for an instance
 */
export async function getTemplateTask(instanceId: number): Promise<Task | undefined> {
  const [instance] = await db.select()
    .from(tasks)
    .where(eq(tasks.id, instanceId));
  
  if (!instance?.templateTaskId) {
    return undefined;
  }

  const [template] = await db.select()
    .from(tasks)
    .where(eq(tasks.id, instance.templateTaskId));
  
  return template;
}
