import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import PDFDocument from "pdfkit";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService } from "./objectStorage";
import { importSampleData } from "./import-data";
import { getBrandingLevel, enforceBrandingPolicy, getBrandingCapabilities } from "./branding";
import { 
  AuditLogger, 
  MFAEnforcement, 
  IPAllowlist, 
  SessionManager,
  auditMiddleware,
  requireMFA,
  requireAllowedIP,
  trackSession
} from "./security";
import { sendGenericEmail } from "./emailUtils";
import { 
  insertPortalUserSchema,
  insertCommunitySchema,
  insertPropertySchema,
  insertRoomSchema,
  insertOutOfOfficePeriodSchema,
  insertTeamSchema,
  insertTeamMemberSchema,
  insertRoomSupplySchema,
  insertRoomNoteSchema,
  insertRoomDeviceSchema,
  insertRoomSurfaceSchema,
  insertRoomSurfaceLinkSchema,
  insertRoomFixtureSchema,
  insertRoomPhotoSchema,
  insertRoomChecklistSchema,
  insertPropertyAccessItemSchema,
  insertVehicleSchema,
  insertVehicleMaintenanceSchema,
  insertVehicleNoteSchema,
  insertTaskSchema,
  insertTimeEntrySchema,
  insertContactSchema,
  insertVendorEmployeeSchema,
  insertAlertSchema,
  insertSystemAlertSchema,
  insertTeamMessageSchema,
  insertFormSchema,
  insertFormSubmissionSchema,
  insertPropertyPortalSettingsSchema,
  insertCalendarSchema,
  insertEventSchema,
  insertEventAttendeeSchema,
  insertEventReminderSchema,
  insertConflictResolutionSchema,
  insertPlatformInvoiceSchema,
  insertClientInvoiceSchema,
  insertRecurringBillingScheduleSchema,
  insertBillingSubmissionSchema,
  insertClientBillingPrefSchema,
  insertSupportRequestSchema,
  insertEmailTemplateSchema,
  insertOrgEmailTemplateSchema,
  insertCustomFieldSchema,
  updateCustomFieldSchema,
  insertManagementNoteSchema,
  insertInspectionScheduleSchema,
  type Form,
  type TimeEntry,
  contacts,
  properties,
  tasks,
  users,
  timeEntries,
  formSubmissions,
  contactProperties,
  rooms,
  vehicles,
  alerts,
  ignoredDuplicates,
  duplicateHistory,
  customFields,
  managementNotes,
  isPremiumPropertyType,
  tierAllowsPremiumProperties,
  WEBHOOK_EVENT_TYPES
} from "@shared/schema";
import { z } from "zod";
import { createSetupIntentForClient, detachPaymentMethod } from "./stripe";
import { db } from "./db";
import { eq, lt, and, desc, inArray } from "drizzle-orm";
import sgMail from "@sendgrid/mail";
import { dispatchWebhookEvent, sendTestWebhookEvent, validateWebhookUrlSafe } from "./webhookDispatcher";

// Initialize SendGrid if API key is available
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// Helper function to send OOO conflict notification email
async function sendOOOConflictNotification(
  supervisorEmail: string,
  supervisorName: string,
  assignedUserName: string,
  taskTitle: string,
  taskDueDate: Date,
  oooStartDate: Date,
  oooEndDate: Date,
  oooReason: string | null
) {
  if (!SENDGRID_API_KEY) {
    console.warn("SendGrid API key not configured. Skipping email notification.");
    return;
  }

  try {
    const msg = {
      to: supervisorEmail,
      from: process.env.SENDGRID_FROM_EMAIL || "noreply@hubify.com",
      subject: `Out-of-Office Conflict: Task Assigned to ${assignedUserName}`,
      text: `Hello ${supervisorName},

A task has been assigned to ${assignedUserName}, who is currently scheduled to be out of office during the task's due date.

Task Details:
- Title: ${taskTitle}
- Due Date: ${new Date(taskDueDate).toLocaleDateString()}

Out-of-Office Period:
- Start: ${new Date(oooStartDate).toLocaleDateString()}
- End: ${new Date(oooEndDate).toLocaleDateString()}
${oooReason ? `- Reason: ${oooReason}` : ""}

Please reassign this task to another team member or adjust the due date accordingly.

Best regards,
Hubify Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Out-of-Office Conflict Alert</h2>
          <p>Hello ${supervisorName},</p>
          <p>A task has been assigned to <strong>${assignedUserName}</strong>, who is currently scheduled to be out of office during the task's due date.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Task Details</h3>
            <p><strong>Title:</strong> ${taskTitle}</p>
            <p><strong>Due Date:</strong> ${new Date(taskDueDate).toLocaleDateString()}</p>
          </div>

          <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Out-of-Office Period</h3>
            <p><strong>Start:</strong> ${new Date(oooStartDate).toLocaleDateString()}</p>
            <p><strong>End:</strong> ${new Date(oooEndDate).toLocaleDateString()}</p>
            ${oooReason ? `<p><strong>Reason:</strong> ${oooReason}</p>` : ""}
          </div>

          <p>Please reassign this task to another team member or adjust the due date accordingly.</p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Best regards,<br>Hubify Team</p>
        </div>
      `,
    };

    await sgMail.send(msg);
    console.log(`OOO conflict notification sent to ${supervisorEmail}`);
  } catch (error) {
    console.error("Error sending OOO conflict notification:", error);
  }
}

// Helper function to parse @mentions from message content
function parseMentions(content: string, allUsers: Array<{id: string, firstName: string | null, lastName: string | null}>): string[] {
  const mentionRegex = /@(\w+(?:\s+\w+)?)/g;
  const matches = content.matchAll(mentionRegex);
  const mentionedUserIds: string[] = [];
  
  for (const match of matches) {
    const mentionedName = match[1].toLowerCase();
    
    // Try to find user by first name, last name, or full name
    const user = allUsers.find(u => {
      const firstName = (u.firstName || '').toLowerCase();
      const lastName = (u.lastName || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();
      
      return firstName === mentionedName || 
             lastName === mentionedName || 
             fullName === mentionedName;
    });
    
    if (user && !mentionedUserIds.includes(user.id)) {
      mentionedUserIds.push(user.id);
    }
  }
  
  return mentionedUserIds;
}

// Helper function to send mention notification email
async function sendMentionNotification(
  mentionedUserEmail: string,
  mentionedUserName: string,
  authorName: string,
  messageContent: string
) {
  if (!SENDGRID_API_KEY) {
    console.warn("SendGrid API key not configured. Skipping email notification.");
    return;
  }

  try {
    const msg = {
      to: mentionedUserEmail,
      from: process.env.SENDGRID_FROM_EMAIL || "noreply@hubify.com",
      subject: `${authorName} mentioned you in a team message`,
      text: `Hello ${mentionedUserName},

${authorName} mentioned you in a team message:

"${messageContent}"

Log in to Hubify to view and respond.

Best regards,
Hubify Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">New Mention in Team Chat</h2>
          <p>Hello ${mentionedUserName},</p>
          <p><strong>${authorName}</strong> mentioned you in a team message:</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <p style="margin: 0;">"${messageContent}"</p>
          </div>

          <p>Log in to Hubify to view and respond to this message.</p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Best regards,<br>Hubify Team</p>
        </div>
      `,
    };

    await sgMail.send(msg);
    console.log(`Mention notification sent to ${mentionedUserEmail}`);
  } catch (error) {
    console.error("Error sending mention notification:", error);
  }
}

// Helper function to send broadcast notification email to all team members
async function sendBroadcastNotification(
  recipientEmail: string,
  recipientName: string,
  authorName: string,
  messageContent: string
) {
  if (!SENDGRID_API_KEY) {
    console.warn("SendGrid API key not configured. Skipping email notification.");
    return;
  }

  try {
    const msg = {
      to: recipientEmail,
      from: process.env.SENDGRID_FROM_EMAIL || "noreply@hubify.com",
      subject: `${authorName} posted a new team message`,
      text: `Hello ${recipientName},

${authorName} posted a new message to the team:

"${messageContent}"

Log in to Hubify to view and respond.

Best regards,
Hubify Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">New Team Message</h2>
          <p>Hello ${recipientName},</p>
          <p><strong>${authorName}</strong> posted a new message to the team:</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <p style="margin: 0;">"${messageContent}"</p>
          </div>

          <p>Log in to Hubify to view and respond to this message.</p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Best regards,<br>Hubify Team</p>
        </div>
      `,
    };

    await sgMail.send(msg);
    console.log(`Broadcast notification sent to ${recipientEmail}`);
  } catch (error) {
    console.error("Error sending broadcast notification:", error);
  }
}

// Security Middleware
const isSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for super admin session (new session-based auth)
    const superAdminSession = (req.session as any)?.superAdmin;
    
    if (superAdminSession?.authenticated) {
      // Super admin is authenticated via session
      next();
      return;
    }
    
    // Fallback: check for super_admin role in OIDC user (legacy support)
    const user = req.user as any;
    if (user?.role === 'super_admin') {
      next();
      return;
    }
    
    // Access denied
    await AuditLogger.log({
      req,
      action: "unauthorized_super_admin_access",
      actionType: "auth",
      resource: "super_admin",
      severity: "critical",
      success: false,
      errorMessage: "User attempted to access super admin route without proper authentication",
    });
    return res.status(403).json({ message: "Super admin access required" });
  } catch (error) {
    console.error("Error in isSuperAdmin middleware:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    
    console.log('[AUTH] isAdmin middleware check:', {
      userId: user?.id || user?.claims?.sub,
      userRole: user?.role,
      userClaimsRole: user?.claims?.role,
      hasUser: !!user,
    });
    
    // Check user.role (super admin), then DB role (canonical for OIDC users), then claims fallback
    let role: string | undefined = user?.role;
    if (!role) {
      const userId = user?.claims?.sub || user?.id;
      if (userId) {
        const dbUser = await storage.getUser(userId);
        role = dbUser?.role;
      }
    }
    if (!role) {
      role = user?.claims?.role;
    }
    
    if (role !== 'admin' && role !== 'supervisor' && role !== 'super_admin') {
      console.log('[AUTH] isAdmin check failed - insufficient role:', role);
      await AuditLogger.log({
        req,
        action: "unauthorized_admin_access",
        actionType: "auth",
        resource: "admin",
        severity: "warning",
        success: false,
        errorMessage: "User attempted to access admin route without proper role",
      });
      return res.status(403).json({ message: "Admin access required" });
    }
    
    console.log('[AUTH] isAdmin check passed for role:', role);
    next();
  } catch (error) {
    console.error("Error in isAdmin middleware:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const requireAdminAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const userId = user?.claims?.sub || user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const userRecord = await storage.getUser(userId);
    
    if (user?.role === 'admin' || user?.role === 'supervisor') {
      if (!userRecord?.isAdminAccount) {
        await AuditLogger.log({
          req,
          action: "admin_daily_work_blocked",
          actionType: "auth",
          resource: "admin_account",
          severity: "warning",
          success: false,
          errorMessage: "Admin user using personal account for daily operations (least privilege violation)",
        });
        return res.status(403).json({ 
          message: "This operation requires a separate admin account. Please use your personal account for daily work.",
          code: "ADMIN_ACCOUNT_REQUIRED"
        });
      }
    }
    
    next();
  } catch (error) {
    console.error("Error in requireAdminAccount middleware:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// HTML template for forms
function generateFormHTML(form: any, isEmbed: boolean): string {
  const fields = Array.isArray(form.fields) ? form.fields : [];
  
  const fieldHTML = fields.map((field: any) => {
    const required = field.required ? 'required' : '';
    const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
    const fieldId = `field-${field.id}`;
    
    switch (field.type) {
      case 'textarea':
        return `
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">${field.label}${field.required ? ' *' : ''}</label>
            ${field.description ? `<p class="text-sm text-gray-600 mb-2">${field.description}</p>` : ''}
            <textarea name="${fieldId}" ${required} placeholder="${field.placeholder || ''}" 
                      class="${inputClass}" rows="4"></textarea>
          </div>
        `;
      case 'select':
        const options = (field.options || []).map((opt: string) => 
          `<option value="${opt}">${opt}</option>`
        ).join('');
        return `
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">${field.label}${field.required ? ' *' : ''}</label>
            ${field.description ? `<p class="text-sm text-gray-600 mb-2">${field.description}</p>` : ''}
            <select name="${fieldId}" ${required} class="${inputClass}">
              <option value="">Select an option</option>
              ${options}
            </select>
          </div>
        `;
      case 'multiselect':
        const multioptions = (field.options || []).map((opt: string) => 
          `<option value="${opt}">${opt}</option>`
        ).join('');
        return `
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">${field.label}${field.required ? ' *' : ''}</label>
            ${field.description ? `<p class="text-sm text-gray-600 mb-2">${field.description}</p>` : ''}
            <select name="${fieldId}" ${required} multiple class="${inputClass}" size="4">
              ${multioptions}
            </select>
            <p class="text-xs text-gray-500 mt-1">Hold Ctrl (Cmd on Mac) to select multiple options</p>
          </div>
        `;
      case 'file':
        return `
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">${field.label}${field.required ? ' *' : ''}</label>
            ${field.description ? `<p class="text-sm text-gray-600 mb-2">${field.description}</p>` : ''}
            <input type="file" name="${fieldId}" ${required} 
                   class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
          </div>
        `;
      case 'signature':
        return `
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">${field.label}${field.required ? ' *' : ''}</label>
            ${field.description ? `<p class="text-sm text-gray-600 mb-2">${field.description}</p>` : ''}
            <div class="border-2 border-gray-300 rounded-md p-2">
              <canvas id="${fieldId}-canvas" width="500" height="150" class="w-full border border-gray-200 rounded cursor-crosshair"></canvas>
              <button type="button" onclick="clearSignature('${fieldId}')" class="mt-2 text-sm text-blue-600 hover:text-blue-800">Clear Signature</button>
              <input type="hidden" name="${fieldId}" id="${fieldId}-input" ${required}>
            </div>
          </div>
        `;
      case 'checkbox':
        return `
          <div class="mb-4">
            <div class="flex items-start">
              <input type="checkbox" name="${fieldId}" ${required} id="${fieldId}"
                     class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1">
              <div class="ml-2">
                <label for="${fieldId}" class="block text-sm text-gray-700">${field.label}${field.required ? ' *' : ''}</label>
                ${field.description ? `<p class="text-sm text-gray-600 mt-1">${field.description}</p>` : ''}
              </div>
            </div>
          </div>
        `;
      default:
        return `
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">${field.label}${field.required ? ' *' : ''}</label>
            ${field.description ? `<p class="text-sm text-gray-600 mb-2">${field.description}</p>` : ''}
            <input type="${field.type}" name="${fieldId}" ${required} 
                   placeholder="${field.placeholder || ''}" class="${inputClass}">
          </div>
        `;
    }
  }).join('');

  const headerHTML = isEmbed ? '' : `
    <div class="bg-blue-600 text-white p-4 mb-6">
      <div class="container mx-auto">
        <h1 class="text-2xl font-bold">Hubify</h1>
      </div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${form.form_title || form.formTitle || 'Form'}</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-50">
      ${headerHTML}
      <div class="container mx-auto px-4 py-8 max-w-2xl">
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">${form.form_title || form.formTitle || 'Form'}</h2>
          ${form.description ? `<p class="text-gray-600 mb-6">${form.description}</p>` : ''}
          
          <form id="hubify-form" onsubmit="submitForm(event)">
            ${fieldHTML}
            
            <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
              Submit
            </button>
          </form>
          
          <div id="success-message" class="hidden mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p class="text-green-800">Thank you! Your form has been submitted successfully.</p>
          </div>
          
          <div id="error-message" class="hidden mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p class="text-red-800">There was an error submitting your form. Please try again.</p>
          </div>
        </div>
      </div>
      
      <script>
        // Initialize signature canvases
        document.addEventListener('DOMContentLoaded', function() {
          const canvases = document.querySelectorAll('canvas[id$="-canvas"]');
          canvases.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            let drawing = false;
            
            canvas.addEventListener('mousedown', (e) => {
              drawing = true;
              const rect = canvas.getBoundingClientRect();
              ctx.beginPath();
              ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
            });
            
            canvas.addEventListener('mousemove', (e) => {
              if (drawing) {
                const rect = canvas.getBoundingClientRect();
                ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                ctx.stroke();
                updateSignatureInput(canvas.id.replace('-canvas', ''));
              }
            });
            
            canvas.addEventListener('mouseup', () => drawing = false);
            canvas.addEventListener('mouseout', () => drawing = false);
          });
        });
        
        function clearSignature(fieldId) {
          const canvas = document.getElementById(fieldId + '-canvas');
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          document.getElementById(fieldId + '-input').value = '';
        }
        
        function updateSignatureInput(fieldId) {
          const canvas = document.getElementById(fieldId + '-canvas');
          const input = document.getElementById(fieldId + '-input');
          input.value = canvas.toDataURL();
        }
        
        async function submitForm(event) {
          event.preventDefault();
          const form = event.target;
          const submitButton = form.querySelector('button[type="submit"]');
          const successMessage = document.getElementById('success-message');
          const errorMessage = document.getElementById('error-message');
          
          submitButton.disabled = true;
          submitButton.textContent = 'Submitting...';
          
          try {
            const formData = new FormData(form);
            
            const response = await fetch('/forms/${form.slug}/submit', {
              method: 'POST',
              body: formData,
            });
            
            if (response.ok) {
              form.reset();
              successMessage.classList.remove('hidden');
              errorMessage.classList.add('hidden');
            } else {
              throw new Error('Submission failed');
            }
          } catch (error) {
            console.error('Error:', error);
            errorMessage.classList.remove('hidden');
            successMessage.classList.add('hidden');
          } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Submit';
          }
        }
      </script>
    </body>
    </html>
  `;
}

// Configure multer for file uploads
const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/photos';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'photo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_multer,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Configure multer for invoice uploads (PDFs and images)
const invoiceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/invoices';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'invoice-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadInvoice = multer({ 
  storage: invoiceStorage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit for invoices
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed for invoices'));
    }
  }
});

// Memory storage for object storage uploads
const uploadToMemory = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit — allows large mobile photos to reach server-side compression
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Context-based form submission handler
async function onFormSubmit(formData: any, formSchema: any, storage: any) {
  const contexts = formSchema.contexts || ['people'];
  let profileId = null;
  let propertyId = null;  
  let taskId = null;

  if (contexts.includes('people')) {
    profileId = await upsertPerson(formData, storage);
  }

  if (contexts.includes('property')) {
    propertyId = await upsertProperty(formData, storage);
  }

  if (contexts.includes('task')) {
    taskId = await createTask(formData, storage);
  }

  // Create form submission with all relevant IDs
  await storage.createFormSubmission({
    formId: formSchema.id,
    profileId,
    propertyId,
    taskId,
    data: formData
  });

  console.log(`Form submission processed: formId=${formSchema.id}, profileId=${profileId}, propertyId=${propertyId}, taskId=${taskId}`);
}

// Helper functions for context-specific data handling
async function upsertPerson(formData: any, storage: any): Promise<number | null> {
  try {
    // Handle "Full Name" field by finding any field value that contains a space
    let firstName = formData.firstName || formData.first_name;
    let lastName = formData.lastName || formData.last_name;
    
    // Check for "Full Name" field (field-X format from forms)
    for (const [key, value] of Object.entries(formData)) {
      if (typeof value === 'string' && value.includes(' ') && key.startsWith('field-') && !firstName) {
        const parts = value.trim().split(/\s+/);
        firstName = parts[0];
        lastName = parts.slice(1).join(' ') || parts[0]; // Use first name as last name if no space
        break;
      }
    }
    
    // Default fallback to "Unknown" if still no name
    if (!firstName) firstName = 'Unknown';
    if (!lastName) lastName = '';
    
    const personData = {
      firstName,
      lastName,
      email: formData.email || formData[Object.keys(formData).find(k => k.includes('email') || k.includes('Email')) || ''],
      phone: formData.phone || formData.phoneNumber || formData[Object.keys(formData).find(k => k.includes('phone') || k.includes('Phone')) || ''],
      notes: formData.notes || formData[Object.keys(formData).find(k => k.includes('notes') || k.includes('Notes')) || ''],
      type: 'client',
      isActive: true,
      orgId: '00000000-0000-0000-0000-000000000001' // Default org for now
    };

    // Try to find existing person by email or phone
    let existingPerson = null;
    if (personData.email) {
      existingPerson = await storage.getContactByEmail(personData.email, personData.orgId);
    } else if (personData.phone) {
      existingPerson = await storage.getContactByPhone(personData.phone, personData.orgId);
    }

    if (existingPerson) {
      // Update existing person
      await storage.updateContact(existingPerson.id, personData);
      console.log(`Updated person: ${existingPerson.id}`);
      return existingPerson.id;
    } else {
      // Create new person
      const newPerson = await storage.createContact(personData, null);
      console.log(`Created new person: ${newPerson.id}`);
      return newPerson.id;
    }
  } catch (error) {
    console.error('Error upserting person:', error);
    return null;
  }
}

async function upsertProperty(formData: any, storage: any): Promise<number | null> {
  try {
    const propertyData = {
      name: formData.address || 'Untitled Property',
      address: formData.address,
      squareFootage: formData.squareFootage ? parseInt(formData.squareFootage) : null,
      bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
      garageSpots: formData.garageSpots ? parseInt(formData.garageSpots) : null,
      roomList: formData.roomList,
      supplies: formData.supplies,
      orgId: '00000000-0000-0000-0000-000000000001', // Default org for now
      status: 'active',
      type: 'residential',
      isActive: true
    };

    // Try to find existing property by address
    const existingProperty = await storage.getPropertyByAddress(propertyData.address, propertyData.orgId);
    
    if (existingProperty) {
      // Update existing property
      await storage.updateProperty(existingProperty.id, propertyData);
      console.log(`Updated property: ${existingProperty.id}`);
      return existingProperty.id;
    } else {
      // Create new property
      const newProperty = await storage.createProperty(propertyData, null);
      console.log(`Created new property: ${newProperty.id}`);
      return newProperty.id;
    }
  } catch (error) {
    console.error('Error upserting property:', error);
    return null;
  }
}

async function createTask(formData: any, storage: any): Promise<number | null> {
  try {
    const taskData = {
      title: formData.taskTitle || formData.title,
      description: formData.taskDescription || formData.description,
      priority: formData.priority || 'medium',
      status: 'pending',
      dueDate: formData.requestedDate ? new Date(formData.requestedDate) : null,
      assignedToId: formData.assignedUserId || null,
      assignedById: null, // Will be set when admin assigns
      orgId: '00000000-0000-0000-0000-000000000001', // Default org for now
      isArchived: false
    };

    const newTask = await storage.createTask(taskData, null);
    console.log(`Created new task: ${newTask.id}`);
    return newTask.id;
  } catch (error) {
    console.error('Error creating task:', error);
    return null;
  }
}

async function logSubmission(formId: number, formData: any, storage: any) {
  try {
    console.log(`Form submission logged: formId=${formId}, data=${JSON.stringify(formData)}, timestamp=${Date.now()}`);
  } catch (error) {
    console.error('Error logging submission:', error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Legacy redirect middleware - must come before other routes
  app.use((req, res, next) => {
    const path = req.path;
    
    // UI page redirects
    if (path.startsWith("/property-centers/")) {
      const newPath = path.replace("/property-centers/", "/admin/client-portal/");
      return res.redirect(308, newPath);
    }
    
    // API endpoint redirects  
    if (path.startsWith("/api/property-centers/")) {
      const newPath = path.replace("/api/property-centers/", "/api/admin/client-portal/");
      return res.redirect(308, newPath);
    }
    
    next();
  });

  // Auth middleware
  await setupAuth(app);
  
  // Global security middlewares
  app.use(trackSession);
  app.use(auditMiddleware);
  
  // Serve uploaded photos
  app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
  });
  app.use('/uploads', express.static('uploads'));

  // Generic file upload endpoint for object storage
  app.post('/api/upload', isAuthenticated, uploadToMemory.array('files', 10), async (req: any, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files provided' });
      }

      const directory = req.body.directory || 'public';
      
      // Parse bucket name from directory path (format: /bucket-name/path/to/file or bucket-name/path)
      const dirPath = directory.startsWith('/') ? directory : `/${directory}`;
      const pathParts = dirPath.split('/').filter(p => p);
      
      if (pathParts.length === 0) {
        return res.status(400).json({ message: 'Invalid directory path' });
      }

      // Use the private object dir to get the bucket name
      const privateDir = process.env.PRIVATE_OBJECT_DIR || '';
      const privateDirParts = privateDir.split('/').filter(p => p);
      const bucketName = privateDirParts[0] || 'repl-default-bucket';
      
      const { objectStorageClient } = await import("./objectStorage");
      const bucket = objectStorageClient.bucket(bucketName);
      const uploadedUrls: string[] = [];

      for (const file of req.files) {
        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const ext = path.extname(file.originalname);
        const filename = `${timestamp}-${randomStr}${ext}`;
        
        // Build the full object path (without leading bucket name)
        const objectPath = `${directory.replace(/^\//, '')}/${filename}`;

        // Upload to object storage
        const gcsFile = bucket.file(objectPath);
        await gcsFile.save(file.buffer, {
          contentType: file.mimetype,
          metadata: {
            originalName: file.originalname,
            uploadedAt: new Date().toISOString(),
          }
        });

        // Get the public URL (note: bucket should allow public read access)
        // If bucket has public access prevention, use signed URLs instead
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${objectPath}`;
        uploadedUrls.push(publicUrl);
      }

      res.json({ urls: uploadedUrls });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: 'Failed to upload files' });
    }
  });

  // Development route to create a test user
  app.post('/api/dev/login', async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(404).json({ message: "Not found" });
    }
    
    try {
      // Create or get test user, always update to ensure admin role (not super admin)
      let user = await storage.getUserByEmail('test@hubify.com');
      user = await storage.upsertUser({
        id: 'dev-user-123',
        email: 'test@hubify.com',
        firstName: 'Test',
        lastName: 'User',
        profileImageUrl: null,
        role: 'admin', // Set admin role for development user (regular admin, not super admin)
      });
      
      // Get or create a test organization for the dev user
      let orgs = await storage.getOrgs();
      let testOrg = orgs.find(o => o.name === 'Test Organization');
      
      if (!testOrg) {
        testOrg = await storage.createOrg({
          name: 'Test Organization',
          contactEmail: 'test@hubify.com',
          tier: 'premium',
          status: 'active'
        });
      }
      
      // Update user with orgId
      await storage.updateUser(user.id, { orgId: testOrg.id });
      
      // Create a Passport-compatible user object
      const passportUser = {
        id: user.id,
        claims: { 
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl,
          role: user.role,
          orgId: testOrg.id // Add orgId to claims
        },
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
      };
      
      // Use Passport's login method to properly authenticate
      req.login(passportUser, (err) => {
        if (err) {
          console.error("Error logging in:", err);
          return res.status(500).json({ message: "Failed to login" });
        }
        res.json({ message: "Logged in as test user", user });
      });
    } catch (error) {
      console.error("Error creating test user:", error);
      res.status(500).json({ message: "Failed to create test user" });
    }
  });

  // Super Admin login route (username/password authentication)
  app.post('/api/super-admin/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      // Require environment variables for super admin credentials (security requirement)
      const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME;
      const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

      // For development only: allow defaults
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      const finalUsername = SUPER_ADMIN_USERNAME || (isDevelopment ? 'superadmin' : null);
      const finalPassword = SUPER_ADMIN_PASSWORD || (isDevelopment ? 'hubify2025' : null);

      if (!finalUsername || !finalPassword) {
        console.error("Super Admin credentials not configured. Set SUPER_ADMIN_USERNAME and SUPER_ADMIN_PASSWORD environment variables.");
        return res.status(503).json({ message: "Super Admin authentication is not configured" });
      }

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Validate credentials
      if (username !== finalUsername || password !== finalPassword) {
        // Log failed attempt
        await AuditLogger.log({
          req,
          action: 'super_admin_login_failed',
          actionType: 'auth',
          resource: 'super_admin_authentication',
          metadata: { username },
          severity: 'warning',
          success: false,
          errorMessage: 'Invalid credentials'
        });
        
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set super admin session
      (req.session as any).superAdmin = {
        authenticated: true,
        username,
        loginTime: new Date().toISOString()
      };

      // Log successful login
      await AuditLogger.log({
        req,
        action: 'super_admin_login_success',
        actionType: 'auth',
        resource: 'super_admin_authentication',
        metadata: { username },
        severity: 'info',
        success: true
      });

      res.json({ 
        message: "Super admin authenticated successfully",
        username 
      });
    } catch (error) {
      console.error("Super admin login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Super Admin logout route
  app.post('/api/super-admin/logout', async (req, res) => {
    const username = (req.session as any).superAdmin?.username;
    
    if (username) {
      await AuditLogger.log({
        req,
        action: 'super_admin_logout',
        actionType: 'auth',
        resource: 'super_admin_authentication',
        metadata: { username },
        severity: 'info',
        success: true
      });
    }

    (req.session as any).superAdmin = null;
    res.json({ message: "Logged out successfully" });
  });

  // Super Admin session check route
  app.get('/api/super-admin/session', (req, res) => {
    const superAdmin = (req.session as any).superAdmin;
    if (superAdmin?.authenticated) {
      res.json({ 
        authenticated: true, 
        username: superAdmin.username,
        loginTime: superAdmin.loginTime
      });
    } else {
      res.json({ authenticated: false });
    }
  });

  // Manual billing automation trigger (Admin or Super Admin only)
  app.post('/api/admin/run-billing-automation', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub || req.user?.id);
      const superAdmin = (req.session as any).superAdmin;
      
      // Check if user is admin/supervisor or super admin
      const userRole = (user as any)?.claims?.role ?? (user as any)?.role;
      const isSuperAdmin = superAdmin?.authenticated;
      const isAdmin = userRole === 'admin' || userRole === 'supervisor';
      
      if (!isAdmin && !isSuperAdmin) {
        return res.status(403).json({ message: "Access denied. Admin, supervisor, or super admin role required." });
      }

      // Import and run billing automation
      const { runBillingAutomation } = await import("./scheduledTasks");
      const result = await runBillingAutomation();
      
      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error("Error running billing automation:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to run billing automation",
        error: String(error),
      });
    }
  });

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Check for Super Admin session first
      const superAdmin = (req.session as any).superAdmin;
      if (superAdmin?.authenticated) {
        // Return Super Admin user object
        return res.json({
          id: 'super-admin',
          email: superAdmin.username,
          name: 'Super Admin',
          role: 'super_admin',
          isSuperAdmin: true,
          // Super Admin doesn't have an orgId since they manage all orgs
          orgId: null
        });
      }

      // Check for regular OIDC authentication
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      // Include orgId and role — DB is source of truth, fall back to claims
      const orgId = user?.orgId || req.user.claims.orgId || req.user.claims.org_id;
      const role = user?.role || req.user.claims.role;

      // Include effective feature flags so the canonical /api/auth/user response
      // is the single source of truth for feature gating decisions on the client.
      const { getEffectiveFeatureFlags } = await import("./featureFlags");
      const featureFlags = await getEffectiveFeatureFlags(orgId ?? null);

      res.json({ ...user, orgId, role, featureFlags });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Cookie consent: GET/POST current user's choice (auth via OIDC or super-admin session)
  app.get('/api/me/cookie-consent', async (req: any, res) => {
    try {
      const superAdmin = (req.session as any)?.superAdmin;
      if (superAdmin?.authenticated) {
        return res.json(null);
      }
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = req.user.claims.sub;
      const consent = await storage.getUserCookieConsent(userId);
      res.json(consent || null);
    } catch (error) {
      console.error("Error fetching cookie consent:", error);
      res.status(500).json({ message: "Failed to fetch cookie consent" });
    }
  });

  app.post('/api/me/cookie-consent', async (req: any, res) => {
    try {
      const superAdmin = (req.session as any)?.superAdmin;
      if (superAdmin?.authenticated) {
        // Super admin choice is held in localStorage only.
        return res.json({ ok: true, persisted: false });
      }
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = req.user.claims.sub;
      const { version, analytics, preference } = req.body || {};
      const consent = await storage.upsertUserCookieConsent({
        userId,
        version: Number.isFinite(version) ? Number(version) : 1,
        essential: true,
        analytics: !!analytics,
        preference: !!preference,
      });
      res.json(consent);
    } catch (error) {
      console.error("Error saving cookie consent:", error);
      res.status(500).json({ message: "Failed to save cookie consent" });
    }
  });

  // User routes
  app.get("/api/current-user", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching current user:", error);
      res.status(500).json({ message: "Failed to fetch current user" });
    }
  });

  app.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/users/:id/task-stats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      const stats = await storage.getUserTaskStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user task stats:", error);
      res.status(500).json({ message: "Failed to fetch user task stats" });
    }
  });

  app.patch("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      const updateData = req.body;
      const currentUserId = (req.user as any)?.claims?.sub;
      
      // Get current user to check their role
      const currentUser = await storage.getUser(currentUserId);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Authorization check: only admins can edit other users, users can edit themselves (limited fields)
      const isAdmin = currentUser.role === 'admin' || currentUser.role === 'supervisor';
      const isSelfUpdate = userId === currentUserId;
      
      if (!isAdmin && !isSelfUpdate) {
        return res.status(403).json({ message: "Insufficient permissions to edit this user" });
      }

      // Define allowed fields based on permissions
      let allowedFields: string[];
      if (isAdmin) {
        // Admins can edit all fields
        allowedFields = ['firstName', 'lastName', 'email', 'role', 'isActive'];
      } else {
        // Users can only edit their own basic info, not role or active status
        allowedFields = ['firstName', 'lastName', 'email'];
      }
      
      // Validate and sanitize input
      const filteredData = Object.keys(updateData)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updateData[key];
          return obj;
        }, {} as any);

      const updatedUser = await storage.updateUser(userId, filteredData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Team routes
  app.get("/api/teams", isAuthenticated, async (req, res) => {
    try {
      const userOrgId = (req.user as any)?.claims?.orgId;
      if (!userOrgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }

      const teams = await storage.getTeams(userOrgId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  app.post("/api/teams", isAuthenticated, async (req, res) => {
    try {
      const userOrgId = (req.user as any)?.claims?.orgId;
      const userId = (req.user as any)?.claims?.sub;
      if (!userOrgId || !userId) {
        return res.status(400).json({ message: "Organization ID or User ID not found" });
      }

      const result = insertTeamSchema.safeParse({
        ...req.body,
        orgId: userOrgId,
        createdBy: userId,
      });

      if (!result.success) {
        return res.status(400).json({ errors: result.error.errors });
      }

      const team = await storage.createTeam(result.data);
      res.status(201).json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  app.get("/api/teams/:id", isAuthenticated, async (req, res) => {
    try {
      const teamId = req.params.id;
      const team = await storage.getTeamWithMembers(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.json(team);
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  app.patch("/api/teams/:id", isAuthenticated, async (req, res) => {
    try {
      const teamId = req.params.id;
      const updates = req.body;
      const updatedTeam = await storage.updateTeam(teamId, updates);
      res.json(updatedTeam);
    } catch (error) {
      console.error("Error updating team:", error);
      res.status(500).json({ message: "Failed to update team" });
    }
  });

  app.delete("/api/teams/:id", isAuthenticated, async (req, res) => {
    try {
      const teamId = req.params.id;
      await storage.deleteTeam(teamId);
      res.json({ message: "Team deleted successfully" });
    } catch (error) {
      console.error("Error deleting team:", error);
      res.status(500).json({ message: "Failed to delete team" });
    }
  });

  app.post("/api/teams/:teamId/members", isAuthenticated, async (req, res) => {
    try {
      const { teamId } = req.params;
      const result = insertTeamMemberSchema.safeParse({
        ...req.body,
        teamId,
      });

      if (!result.success) {
        return res.status(400).json({ errors: result.error.errors });
      }

      const member = await storage.addTeamMember(result.data);
      res.status(201).json(member);
    } catch (error) {
      console.error("Error adding team member:", error);
      res.status(500).json({ message: "Failed to add team member" });
    }
  });

  app.delete("/api/teams/:teamId/members/:userId", isAuthenticated, async (req, res) => {
    try {
      const { teamId, userId } = req.params;
      await storage.removeTeamMember(teamId, userId);
      res.json({ message: "Team member removed successfully" });
    } catch (error) {
      console.error("Error removing team member:", error);
      res.status(500).json({ message: "Failed to remove team member" });
    }
  });

  app.get("/api/users/:userId/teams", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const teams = await storage.getUserTeams(userId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching user teams:", error);
      res.status(500).json({ message: "Failed to fetch user teams" });
    }
  });

  app.patch("/api/teams/:teamId/members/:userId/role", isAuthenticated, async (req, res) => {
    try {
      const { teamId, userId } = req.params;
      const { role } = req.body;
      
      if (!role || (role !== 'lead' && role !== 'member')) {
        return res.status(400).json({ message: "Invalid role. Must be 'lead' or 'member'" });
      }

      // If promoting to lead, first demote all current leads in the team
      if (role === 'lead') {
        const team = await storage.getTeamById(teamId);
        if (team?.members) {
          for (const member of team.members) {
            if (member.role === 'lead' && member.userId !== userId) {
              await storage.updateTeamMemberRole(teamId, member.userId, 'member');
            }
          }
        }
      }

      const updatedMember = await storage.updateTeamMemberRole(teamId, userId, role);
      res.json(updatedMember);
    } catch (error) {
      console.error("Error updating team member role:", error);
      res.status(500).json({ message: "Failed to update team member role" });
    }
  });

  // Send email to entire team
  app.post("/api/teams/send-email", isAuthenticated, async (req: any, res) => {
    try {
      const { processMergeFields, buildMergeFieldData, sendEmail } = await import('./email-service');
      
      const orgId = req.user?.claims?.orgId;
      const userId = req.user?.claims?.sub || req.user?.id;
      
      if (!orgId || !userId) {
        return res.status(400).json({ message: "Organization ID or User ID not found" });
      }

      const { teamId, subject, body, templateId } = req.body;

      if (!teamId) {
        return res.status(400).json({ message: "Team ID is required" });
      }

      // Get team and verify it belongs to the organization
      const team = await storage.getTeamById(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      if (team.orgId !== orgId) {
        return res.status(403).json({ message: "Access denied to this team" });
      }

      let finalSubject = subject;
      let finalBody = body;

      // Load template if provided
      if (templateId) {
        const template = await storage.getOrgEmailTemplate(templateId, orgId);
        if (!template) {
          return res.status(404).json({ message: "Email template not found" });
        }
        finalSubject = template.subject;
        finalBody = template.body;
      }

      if (!finalSubject || !finalBody) {
        return res.status(400).json({ message: "Subject and body are required" });
      }

      // Get all team members
      const teamMembers = team.members || [];
      if (teamMembers.length === 0) {
        return res.status(400).json({ message: "Team has no members" });
      }

      const successCount = {value: 0};
      const failedRecipients: string[] = [];

      // Send email to each team member
      for (const member of teamMembers) {
        try {
          if (!member.email) {
            failedRecipients.push(`${member.firstName} ${member.lastName} (no email)`);
            continue;
          }

          // Build merge field data for this member
          const mergeData = await buildMergeFieldData({
            senderId: userId,
            orgId,
            additionalData: {
              firstName: member.firstName || '',
              lastName: member.lastName || '',
              fullName: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
              email: member.email,
              teamName: team.name,
            },
          });

          // Process merge fields
          const processedSubject = processMergeFields(finalSubject, mergeData);
          const processedBody = processMergeFields(finalBody, mergeData);

          // Send email immediately
          await sendEmail({
            recipientEmail: member.email,
            recipientName: `${member.firstName} ${member.lastName}`,
            subject: processedSubject,
            body: processedBody,
            orgId,
            senderId: userId,
          });

          successCount.value++;
        } catch (memberError: any) {
          console.error(`Error sending email to ${member.email}:`, memberError);
          failedRecipients.push(`${member.firstName} ${member.lastName} (${member.email})`);
        }
      }

      if (successCount.value === 0) {
        return res.status(500).json({ 
          message: "Failed to send email to any team members",
          failedRecipients 
        });
      }

      res.json({ 
        message: `Email sent to ${successCount.value} of ${teamMembers.length} team members`,
        successCount: successCount.value,
        totalMembers: teamMembers.length,
        failedRecipients: failedRecipients.length > 0 ? failedRecipients : undefined
      });
    } catch (error: any) {
      console.error("Error sending team email:", error);
      res.status(500).json({ message: error.message || "Failed to send team email" });
    }
  });

  // Portal authentication middleware
  const isPortalAuthenticated = async (req: any, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const session = await storage.getPortalSessionByToken(token);
    if (!session) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      await storage.invalidatePortalSession(token);
      return res.status(401).json({ message: 'Session expired' });
    }

    const user = await storage.getPortalUserById(session.portalUserId);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    req.portalUser = user;
    req.portalSession = session;
    next();
  };

  // Portal auth routes
  app.post('/api/portal/register', async (req, res) => {
    try {
      const { inviteToken, email, password, firstName, lastName, phone } = req.body;

      if (!inviteToken || !email || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Normalize email to lowercase so the email-only login lookup
      // (which lowercases the submitted email) always matches.
      const normalizedEmail = String(email).toLowerCase();

      // Get and validate invitation
      const invitation = await storage.getPortalInvitationByToken(inviteToken);
      if (!invitation) {
        return res.status(404).json({ message: 'Invalid or expired invitation' });
      }

      // Check if invitation expired
      if (new Date() > invitation.expiresAt) {
        return res.status(400).json({ message: 'Invitation has expired' });
      }

      // Verify email matches invitation
      if (normalizedEmail !== invitation.email.toLowerCase()) {
        return res.status(400).json({ message: 'Email does not match invitation' });
      }

      // Check if user already exists
      const existingUser = await storage.getPortalUserByEmail(invitation.orgId, normalizedEmail);
      if (existingUser) {
        return res.status(409).json({ message: 'User already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user with invitation's orgId and role
      const user = await storage.createPortalUser({
        orgId: invitation.orgId,
        email: normalizedEmail,
        passwordHash,
        role: invitation.role,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
      });

      // Mark invitation as used
      await storage.markPortalInvitationUsed(inviteToken);

      // Create session
      const token = nanoid(32);
      const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await storage.createPortalSession({
        portalUserId: user.id,
        token,
        expiresAt: sessionExpiresAt,
      });

      res.status(201).json({ user: { ...user, passwordHash: undefined }, token });
    } catch (error) {
      console.error('Error registering portal user:', error);
      res.status(500).json({ message: 'Failed to register user' });
    }
  });

  app.post('/api/portal/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Look up matching portal users by email across all orgs and verify
      // the password against each match. Return the first one that verifies.
      // Future: subdomain-based org routing (e.g. acme.hubify.app) could
      // narrow this lookup before password verification.
      const candidates = await storage.getPortalUsersByEmailAcrossOrgs(email.toLowerCase());
      let user: typeof candidates[number] | undefined;
      for (const candidate of candidates) {
        if (!candidate.isActive) continue;
        const isValid = await bcrypt.compare(password, candidate.passwordHash);
        if (isValid) {
          user = candidate;
          break;
        }
      }
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Create session
      const token = nanoid(32);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await storage.createPortalSession({
        portalUserId: user.id,
        token,
        expiresAt,
      });

      // Update last login
      await storage.updatePortalUser(user.id, { lastLoginAt: new Date() });

      res.json({ user: { ...user, passwordHash: undefined }, token });
    } catch (error) {
      console.error('Error logging in portal user:', error);
      res.status(500).json({ message: 'Failed to login' });
    }
  });

  app.post('/api/portal/logout', isPortalAuthenticated, async (req: any, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        await storage.invalidatePortalSession(token);
      }
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Error logging out portal user:', error);
      res.status(500).json({ message: 'Failed to logout' });
    }
  });

  // Password reset for portal users - Request reset
  app.post('/api/portal/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Look up across orgs; pick the first active match.
      const candidates = await storage.getPortalUsersByEmailAcrossOrgs(email.toLowerCase());
      const user = candidates.find((u) => u.isActive);

      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ message: 'If an account exists with this email, you will receive a password reset link.' });
      }
      const orgId = user.orgId;

      // Invalidate any existing reset tokens for this email
      await storage.invalidatePasswordResetTokensForEmail(email.toLowerCase());

      // Generate new reset token
      const resetToken = nanoid(48);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

      await storage.createPasswordResetToken({
        token: resetToken,
        email: email.toLowerCase(),
        userType: 'portal_user',
        portalUserId: user.id,
        orgId: orgId,
        expiresAt,
      });

      // Get organization for branding
      const org = await storage.getOrg(orgId);
      const orgName = org?.name || 'Hubify';

      // Send email with reset link
      const resetUrl = `${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000'}/portal/reset-password?token=${resetToken}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Password Reset Request</h2>
            <p>Hello ${user.firstName || 'User'},</p>
            <p>We received a request to reset your password for your ${orgName} portal account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
            </div>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request a password reset, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">This email was sent by ${orgName}.</p>
          </div>
        </body>
        </html>
      `;

      try {
        const { sendGenericEmail } = await import('./emailUtils');
        await sendGenericEmail({
          to: email.toLowerCase(),
          subject: `Password Reset Request - ${orgName}`,
          htmlContent,
        });
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Don't fail the request, token is still created
      }

      res.json({ message: 'If an account exists with this email, you will receive a password reset link.' });
    } catch (error) {
      console.error('Error requesting password reset:', error);
      res.status(500).json({ message: 'Failed to process request' });
    }
  });

  // Password reset for portal users - Verify token
  app.get('/api/portal/reset-password/verify', async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ valid: false, message: 'Token is required' });
      }

      const resetToken = await storage.getPasswordResetToken(token);

      if (!resetToken) {
        return res.json({ valid: false, message: 'Invalid or expired reset link' });
      }

      if (resetToken.isUsed) {
        return res.json({ valid: false, message: 'This reset link has already been used' });
      }

      if (new Date(resetToken.expiresAt) < new Date()) {
        return res.json({ valid: false, message: 'This reset link has expired' });
      }

      res.json({ valid: true, email: resetToken.email });
    } catch (error) {
      console.error('Error verifying reset token:', error);
      res.status(500).json({ valid: false, message: 'Failed to verify token' });
    }
  });

  // Portal user cookie consent (Bearer token via isPortalAuthenticated)
  app.get('/api/portal/me/cookie-consent', isPortalAuthenticated, async (req: any, res) => {
    try {
      const portalUserId = req.portalSession.portalUserId;
      const consent = await storage.getPortalUserCookieConsent(portalUserId);
      res.json(consent || null);
    } catch (error) {
      console.error("Error fetching portal cookie consent:", error);
      res.status(500).json({ message: "Failed to fetch cookie consent" });
    }
  });

  app.post('/api/portal/me/cookie-consent', isPortalAuthenticated, async (req: any, res) => {
    try {
      const portalUserId = req.portalSession.portalUserId;
      const { version, analytics, preference } = req.body || {};
      const consent = await storage.upsertPortalUserCookieConsent({
        portalUserId,
        version: Number.isFinite(version) ? Number(version) : 1,
        essential: true,
        analytics: !!analytics,
        preference: !!preference,
      });
      res.json(consent);
    } catch (error) {
      console.error("Error saving portal cookie consent:", error);
      res.status(500).json({ message: "Failed to save cookie consent" });
    }
  });

  // Public: org-level cookie banner override for portal pages.
  // Returns enabled=false only when the org's published portal settings
  // explicitly disable the cookie notice. Defaults to enabled=true.
  app.get('/api/portal/cookie-notice', async (req, res) => {
    try {
      const orgId = String(req.query.orgId || '').trim();
      if (!orgId) {
        return res.json({ enabled: true });
      }
      const { propertyPortalSettings } = await import("@shared/schema");
      const rows = await db
        .select({ legal: propertyPortalSettings.legal })
        .from(propertyPortalSettings)
        .where(and(
          eq(propertyPortalSettings.orgId, orgId),
          eq(propertyPortalSettings.status, 'published')
        ));
      // Disable banner only if every published setting opted out.
      if (rows.length > 0 && rows.every((r) => r.legal?.cookieNotice === false)) {
        return res.json({ enabled: false });
      }
      res.json({ enabled: true });
    } catch (error) {
      console.error("Error fetching portal cookie notice:", error);
      res.json({ enabled: true });
    }
  });

  // Password reset for portal users - Reset password
  app.post('/api/portal/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
      }

      const resetToken = await storage.getPasswordResetToken(token);

      if (!resetToken || resetToken.isUsed || new Date(resetToken.expiresAt) < new Date()) {
        return res.status(400).json({ message: 'Invalid or expired reset link' });
      }

      if (!resetToken.portalUserId) {
        return res.status(400).json({ message: 'Invalid reset token' });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Update user's password
      await storage.updatePortalUser(resetToken.portalUserId, { passwordHash });

      // Mark token as used
      await storage.markPasswordResetTokenUsed(token);

      res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  });

  app.get('/api/portal/me', isPortalAuthenticated, async (req: any, res) => {
    try {
      const user = req.portalUser;
      const properties = await storage.getPortalUserProperties(user.id);
      res.json({ user: { ...user, passwordHash: undefined }, properties });
    } catch (error) {
      console.error('Error fetching portal user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // Portal client home: properties linked to the portal user.
  app.get('/api/portal/properties', isPortalAuthenticated, async (req: any, res) => {
    try {
      const portalUser = req.portalUser;
      const links = await storage.getPortalUserProperties(portalUser.id);
      const propertyIds = links.map((l) => l.propertyId);
      if (propertyIds.length === 0) return res.json([]);
      const props = await storage.getPropertiesByIds(propertyIds, portalUser.orgId);
      const propsById = new Map(props.map((p) => [p.id, p] as const));
      const visible = propertyIds
        .map((id) => propsById.get(id))
        .filter((p): p is NonNullable<typeof p> => !!p)
        .map((p) => ({
          id: p.id,
          name: p.name,
          address1: p.address1,
          address2: p.address2,
          city: p.city,
          state: p.state,
          zip: p.zip,
          type: p.type,
          imageUrl: p.imageUrl,
        }));
      res.json(visible);
    } catch (error) {
      console.error('Error fetching portal properties:', error);
      res.status(500).json({ message: 'Failed to fetch properties' });
    }
  });

  // Portal client home: single property detail (only if linked to portal user).
  app.get('/api/portal/properties/:id', isPortalAuthenticated, async (req: any, res) => {
    try {
      const portalUser = req.portalUser;
      const propertyId = Number(req.params.id);
      if (!Number.isInteger(propertyId)) {
        return res.status(400).json({ message: 'Invalid property id' });
      }
      const links = await storage.getPortalUserProperties(portalUser.id);
      const allowed = new Set(links.map((l) => l.propertyId));
      if (!allowed.has(propertyId)) {
        return res.status(404).json({ message: 'Property not found' });
      }
      const property = await storage.getProperty(propertyId);
      if (!property || property.orgId !== portalUser.orgId) {
        return res.status(404).json({ message: 'Property not found' });
      }
      res.json({
        id: property.id,
        name: property.name,
        type: property.type,
        address1: property.address1,
        address2: property.address2,
        city: property.city,
        state: property.state,
        zip: property.zip,
        units: property.units,
        squareFootage: property.squareFootage,
        description: property.description,
        imageUrl: property.imageUrl,
      });
    } catch (error) {
      console.error('Error fetching portal property:', error);
      res.status(500).json({ message: 'Failed to fetch property' });
    }
  });

  // Portal client home: tasks across the portal user's properties.
  app.get('/api/portal/tasks', isPortalAuthenticated, async (req: any, res) => {
    try {
      const portalUser = req.portalUser;
      const links = await storage.getPortalUserProperties(portalUser.id);
      const propertyIds = links.map((l) => l.propertyId);
      if (propertyIds.length === 0) return res.json([]);
      const props = await storage.getPropertiesByIds(propertyIds, portalUser.orgId);
      const propsById = new Map<number, string>(props.map((p) => [p.id, p.name]));
      const allowedIds = Array.from(propsById.keys());
      if (allowedIds.length === 0) return res.json([]);
      const taskRows = await storage.getTasksByPropertyIds(allowedIds, portalUser.orgId);
      const merged: Array<{
        id: number;
        title: string;
        status: string;
        priority: string;
        dueDate: Date | null;
        propertyId: number | null;
        propertyName: string | null;
      }> = [];
      for (const t of taskRows) {
        if (!t.propertyId || !propsById.has(t.propertyId)) continue;
        if (t.isArchived) continue;
        merged.push({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          propertyId: t.propertyId,
          propertyName: propsById.get(t.propertyId) || null,
        });
      }
      merged.sort((a, b) => {
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        if (ad !== bd) return ad - bd;
        return a.id - b.id;
      });
      res.json(merged);
    } catch (error) {
      console.error('Error fetching portal tasks:', error);
      res.status(500).json({ message: 'Failed to fetch tasks' });
    }
  });

  // Portal client home: invoices for the portal user's client (drafts hidden).
  app.get('/api/portal/invoices', isPortalAuthenticated, async (req: any, res) => {
    try {
      const portalUser = req.portalUser;
      const { clients: clientsTable } = await import('@shared/schema');
      const [client] = await db
        .select()
        .from(clientsTable)
        .where(and(
          eq(clientsTable.orgId, portalUser.orgId),
          eq(clientsTable.email, portalUser.email)
        ));
      if (!client) return res.json([]);
      const invoices = await storage.getClientInvoicesByClient(client.id);
      const visible = invoices
        .filter((inv) => inv.status !== 'draft')
        .map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          amountCents: inv.amountCents,
          currency: inv.currency,
          status: inv.status,
          paymentStatus: inv.paymentStatus,
          dueDate: inv.dueDate,
          issuedAt: inv.issuedAt,
          sentAt: inv.sentAt,
          description: inv.description,
          hostedInvoiceUrl: inv.hostedInvoiceUrl,
        }));
      res.json(visible);
    } catch (error) {
      console.error('Error fetching portal invoices:', error);
      res.status(500).json({ message: 'Failed to fetch invoices' });
    }
  });

  // Documents for properties linked to the portal user. Property-scoped docs
  // are visible only for linked properties; community-wide docs are visible
  // only for communities attached to those linked properties.
  app.get('/api/portal/documents', isPortalAuthenticated, async (req: any, res) => {
    try {
      const portalUser = req.portalUser;
      const { communityDocuments, properties: propsTable } = await import('@shared/schema');
      const { or } = await import('drizzle-orm');
      const links = await storage.getPortalUserProperties(portalUser.id);
      const propertyIds = links.map((l) => l.propertyId);
      if (propertyIds.length === 0) return res.json([]);
      const propRows = await db
        .select({ id: propsTable.id, communityId: propsTable.communityId, orgId: propsTable.orgId })
        .from(propsTable)
        .where(inArray(propsTable.id, propertyIds));
      const allowedPropIds = new Set<number>();
      const communityIds = new Set<number>();
      for (const r of propRows) {
        if (r.orgId !== portalUser.orgId) continue;
        allowedPropIds.add(r.id);
        if (r.communityId) communityIds.add(r.communityId);
      }
      if (allowedPropIds.size === 0) return res.json([]);
      const propClause = inArray(communityDocuments.propertyId, Array.from(allowedPropIds));
      const where =
        communityIds.size > 0
          ? or(inArray(communityDocuments.communityId, Array.from(communityIds)), propClause)
          : propClause;
      const docs = await db
        .select({
          id: communityDocuments.id,
          communityId: communityDocuments.communityId,
          propertyId: communityDocuments.propertyId,
          documentType: communityDocuments.documentType,
          classification: communityDocuments.classification,
          fileUrl: communityDocuments.fileUrl,
          fileName: communityDocuments.fileName,
          uploadedAt: communityDocuments.uploadedAt,
        })
        .from(communityDocuments)
        .where(where)
        .orderBy(desc(communityDocuments.uploadedAt));
      const visible = docs.filter((d) => {
        if (d.propertyId) return allowedPropIds.has(d.propertyId);
        return d.communityId != null && communityIds.has(d.communityId);
      });
      res.json(visible);
    } catch (error) {
      console.error('Error fetching portal documents:', error);
      res.status(500).json({ message: 'Failed to fetch documents' });
    }
  });

  // Admin endpoint to create portal invitations
  app.post('/api/portal/invitations', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user?.claims?.sub;
      const currentUser = await storage.getUser(currentUserId);
      
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'supervisor')) {
        return res.status(403).json({ message: 'Only admins can create invitations' });
      }

      const { email, role, propertyIds, expiresInDays = 7 } = req.body;

      if (!email || !role) {
        return res.status(400).json({ message: 'Email and role are required' });
      }

      const token = nanoid(32);
      const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

      const invitation = await storage.createPortalInvitation({
        orgId: currentUser.orgId!,
        token,
        email: email.toLowerCase(),
        role,
        propertyIds: propertyIds || [],
        createdByUserId: currentUserId,
        expiresAt,
      });

      res.status(201).json(invitation);
    } catch (error) {
      console.error('Error creating portal invitation:', error);
      res.status(500).json({ message: 'Failed to create invitation' });
    }
  });

  app.get('/api/portal/invitations', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user?.claims?.sub;
      const currentUser = await storage.getUser(currentUserId);
      
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'supervisor')) {
        return res.status(403).json({ message: 'Only admins can view invitations' });
      }

      const invitations = await storage.getPortalInvitationsByOrg(currentUser.orgId!);
      res.json(invitations);
    } catch (error) {
      console.error('Error fetching portal invitations:', error);
      res.status(500).json({ message: 'Failed to fetch invitations' });
    }
  });

  // Helper function to check for out-of-office conflicts
  async function checkOutOfOfficeConflict(assignedToId: string, dueDate: Date | null) {
    if (!dueDate || !assignedToId) {
      return { hasConflict: false, activeOOO: null, assignedUser: null };
    }

    try {
      // Get the assigned user to check for supervisor
      const assignedUser = await storage.getUser(assignedToId);
      if (!assignedUser) {
        return { hasConflict: false, activeOOO: null, assignedUser: null };
      }

      // Check if user has an active OOO period on the due date
      const activeOOO = await storage.getActiveOutOfOfficePeriod(assignedToId);
      if (!activeOOO) {
        return { hasConflict: false, activeOOO: null, assignedUser };
      }

      // Check if due date falls within OOO period
      const dueDateTimestamp = new Date(dueDate).getTime();
      const oooStart = new Date(activeOOO.startDate).getTime();
      const oooEnd = new Date(activeOOO.endDate).getTime();

      if (dueDateTimestamp >= oooStart && dueDateTimestamp <= oooEnd) {
        return { hasConflict: true, activeOOO, assignedUser };
      }

      return { hasConflict: false, activeOOO: null, assignedUser };
    } catch (error) {
      console.error("Error checking OOO conflict:", error);
      return { hasConflict: false, activeOOO: null, assignedUser: null };
    }
  }

  // Out-of-office routes
  app.get("/api/out-of-office/:userId", isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.userId;
      const currentUserId = (req.user as any)?.claims?.sub;
      const currentUser = await storage.getUser(currentUserId);

      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Check target user exists and is in same org
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Authorization: users can view anyone in their organization
      const sameOrg = currentUser.orgId === targetUser.orgId;

      if (!sameOrg) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const periods = await storage.getOutOfOfficePeriods(userId);
      res.json(periods);
    } catch (error) {
      console.error("Error fetching out-of-office periods:", error);
      res.status(500).json({ message: "Failed to fetch out-of-office periods" });
    }
  });

  app.get("/api/out-of-office/:userId/active", isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.userId;
      const currentUserId = (req.user as any)?.claims?.sub;
      const currentUser = await storage.getUser(currentUserId);

      // Authorization: users can view anyone in their organization
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const sameOrg = currentUser?.orgId === targetUser.orgId;

      if (!sameOrg) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const period = await storage.getActiveOutOfOfficePeriod(userId);
      res.json(period || null);
    } catch (error) {
      console.error("Error fetching active out-of-office period:", error);
      res.status(500).json({ message: "Failed to fetch active period" });
    }
  });

  // Get active OOO statuses for all users in the organization
  app.get("/api/out-of-office/active-statuses", isAuthenticated, async (req, res) => {
    try {
      const currentUserId = (req.user as any)?.claims?.sub;
      const currentUser = await storage.getUser(currentUserId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get all users in the organization
      const users = await storage.getUsersByOrganization(currentUser.organizationId);
      
      // Get active OOO periods for each user
      const activeStatuses = [];
      for (const user of users) {
        const period = await storage.getActiveOutOfOfficePeriod(user.id);
        if (period) {
          activeStatuses.push(period);
        }
      }

      res.json(activeStatuses);
    } catch (error) {
      console.error("Error fetching active OOO statuses:", error);
      res.status(500).json({ message: "Failed to fetch active statuses" });
    }
  });

  app.post("/api/out-of-office", isAuthenticated, async (req, res) => {
    try {
      const currentUserId = (req.user as any)?.claims?.sub;
      const currentUser = await storage.getUser(currentUserId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Validate with Zod
      const validatedData = insertOutOfOfficePeriodSchema.parse({
        ...req.body,
        userId: currentUserId, // Ensure user can only create for themselves
        orgId: currentUser.orgId,
      });

      const period = await storage.createOutOfOfficePeriod(validatedData);
      
      // Detect conflicts with scheduled events during the OOO period
      if (currentUser.orgId) {
        await detectOOOConflicts(
          currentUserId, 
          new Date(period.startDate), 
          new Date(period.endDate), 
          currentUser.orgId, 
          currentUserId
        );
      }
      
      res.status(201).json(period);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating out-of-office period:", error);
      res.status(500).json({ message: "Failed to create out-of-office period" });
    }
  });

  app.patch("/api/out-of-office/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }

      const currentUserId = (req.user as any)?.claims?.sub;
      const currentUser = await storage.getUser(currentUserId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get the period to verify ownership and org
      const periods = await storage.getOutOfOfficePeriods(currentUser.id);
      const period = periods.find(p => p.id === id);
      
      if (!period) {
        return res.status(404).json({ message: "Out-of-office period not found" });
      }

      // Verify ownership and org match
      if (period.userId !== currentUserId || period.orgId !== currentUser.orgId) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Define allowed fields to prevent userId/orgId tampering
      const allowedFields = ['startDate', 'endDate', 'reason', 'isActive'];
      const updateData = Object.keys(req.body)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = req.body[key];
          return obj;
        }, {} as any);

      // Validate dates if provided
      if (updateData.startDate || updateData.endDate) {
        const startDate = updateData.startDate ? new Date(updateData.startDate) : new Date(period.startDate);
        const endDate = updateData.endDate ? new Date(updateData.endDate) : new Date(period.endDate);
        
        if (endDate <= startDate) {
          return res.status(400).json({ message: "End date must be after start date" });
        }
      }

      const updated = await storage.updateOutOfOfficePeriod(id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating out-of-office period:", error);
      res.status(500).json({ message: "Failed to update out-of-office period" });
    }
  });

  app.delete("/api/out-of-office/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }

      const currentUserId = (req.user as any)?.claims?.sub;
      const currentUser = await storage.getUser(currentUserId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get the period to verify ownership and org
      const periods = await storage.getOutOfOfficePeriods(currentUser.id);
      const period = periods.find(p => p.id === id);
      
      if (!period) {
        return res.status(404).json({ message: "Out-of-office period not found" });
      }

      // Verify ownership and org match
      if (period.userId !== currentUserId || period.orgId !== currentUser.orgId) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      await storage.deleteOutOfOfficePeriod(id);
      res.json({ message: 'Out-of-office period deleted successfully' });
    } catch (error) {
      console.error("Error deleting out-of-office period:", error);
      res.status(500).json({ message: "Failed to delete out-of-office period" });
    }
  });

  // Management notes routes
  app.get("/api/users/:id/management-notes", isAuthenticated, async (req, res) => {
    try {
      const targetUserId = req.params.id;
      const currentUserId = (req.user as any)?.claims?.sub;
      const currentUser = await storage.getUser(currentUserId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get the target user to check supervisor relationship
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Permission check: HR permissions OR admin/supervisor role OR is the user's supervisor
      const role = currentUser.role;
      const hasHrPermissions = currentUser.hasHrPermissions;
      const isSupervisor = targetUser.supervisorId === currentUserId;
      const isAdminOrSupervisorRole = role === 'admin' || role === 'supervisor';
      
      if (!hasHrPermissions && !isAdminOrSupervisorRole && !isSupervisor) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const notes = await storage.getManagementNotes(targetUserId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching management notes:", error);
      res.status(500).json({ message: "Failed to fetch management notes" });
    }
  });

  app.post("/api/users/:id/management-notes", isAuthenticated, async (req, res) => {
    try {
      const targetUserId = req.params.id;
      const currentUserId = (req.user as any)?.claims?.sub;
      const currentUser = await storage.getUser(currentUserId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get the target user to check supervisor relationship
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Permission check: HR permissions OR admin/supervisor role OR is the user's supervisor
      const role = currentUser.role;
      const hasHrPermissions = currentUser.hasHrPermissions;
      const isSupervisor = targetUser.supervisorId === currentUserId;
      const isAdminOrSupervisorRole = role === 'admin' || role === 'supervisor';
      
      if (!hasHrPermissions && !isAdminOrSupervisorRole && !isSupervisor) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Validate with insertManagementNoteSchema and set authorId and orgId
      const validatedData = insertManagementNoteSchema.parse({
        ...req.body,
        userId: targetUserId,
        authorId: currentUserId,
        orgId: currentUser.orgId,
      });

      const note = await storage.createManagementNote(validatedData);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating management note:", error);
      res.status(500).json({ message: "Failed to create management note" });
    }
  });

  app.patch("/api/management-notes/:id", isAuthenticated, async (req, res) => {
    try {
      const noteId = parseInt(req.params.id);
      if (isNaN(noteId)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }

      const currentUserId = (req.user as any)?.claims?.sub;
      const currentUser = await storage.getUser(currentUserId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Validate request body has noteText
      if (!req.body.noteText || typeof req.body.noteText !== 'string') {
        return res.status(400).json({ message: "noteText is required" });
      }

      // Get the note from database to check authorization
      const noteResult = await db
        .select()
        .from(managementNotes)
        .where(eq(managementNotes.id, noteId))
        .limit(1);
      
      if (!noteResult || noteResult.length === 0) {
        return res.status(404).json({ message: "Management note not found" });
      }

      const note = noteResult[0];
      
      // Permission check: Must be the original author OR an admin
      const isAdmin = currentUser.role === 'admin';
      const isAuthor = note.authorId === currentUserId;
      
      if (!isAuthor && !isAdmin) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const updatedNote = await storage.updateManagementNote(noteId, req.body.noteText);
      res.json(updatedNote);
    } catch (error) {
      console.error("Error updating management note:", error);
      res.status(500).json({ message: "Failed to update management note" });
    }
  });

  app.patch("/api/users/:id/hr-permissions", isAuthenticated, async (req, res) => {
    try {
      const targetUserId = req.params.id;
      const currentUserId = (req.user as any)?.claims?.sub;
      const currentUser = await storage.getUser(currentUserId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Permission check: Admin only
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Validate request body has hasHrPermissions boolean
      if (typeof req.body.hasHrPermissions !== 'boolean') {
        return res.status(400).json({ message: "hasHrPermissions must be a boolean" });
      }

      // Get the target user
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update the user's HR permissions
      const updatedUser = await storage.updateUser(targetUserId, {
        hasHrPermissions: req.body.hasHrPermissions,
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating HR permissions:", error);
      res.status(500).json({ message: "Failed to update HR permissions" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/urgent-tasks", isAuthenticated, async (req, res) => {
    try {
      const urgentTasks = await storage.getUrgentTasks();
      res.json(urgentTasks);
    } catch (error) {
      console.error("Error fetching urgent tasks:", error);
      res.status(500).json({ message: "Failed to fetch urgent tasks" });
    }
  });

  app.get("/api/dashboard/team-messages", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getTeamMessages(10);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching team messages:", error);
      res.status(500).json({ message: "Failed to fetch team messages" });
    }
  });

  app.get("/api/dashboard/recent-activity", isAuthenticated, async (req, res) => {
    try {
      const activity = await storage.getRecentActivity(10);
      res.json(activity);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  // Community routes — gated by community_profiles feature flag
  const { requireFeatureFlag } = await import("./featureFlags");
  const requireCommunities = requireFeatureFlag("community_profiles");

  app.get("/api/communities", isAuthenticated, requireCommunities, async (req, res) => {
    try {
      const communities = await storage.getCommunities();
      res.json(communities);
    } catch (error) {
      console.error("Error fetching communities:", error);
      res.status(500).json({ message: "Failed to fetch communities" });
    }
  });

  app.get("/api/communities/:id", isAuthenticated, requireCommunities, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid community ID' });
      }

      const community = await storage.getCommunity(id);
      if (!community) {
        return res.status(404).json({ message: 'Community not found' });
      }

      res.json(community);
    } catch (error) {
      console.error("Error fetching community:", error);
      res.status(500).json({ message: "Failed to fetch community" });
    }
  });

  app.get("/api/communities/:id/properties", isAuthenticated, requireCommunities, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid community ID' });
      }

      // Get all properties filtered by community ID
      const allProperties = await storage.getProperties();
      const communityProperties = allProperties.filter((p: any) => p.communityId === id);
      
      res.json(communityProperties);
    } catch (error) {
      console.error("Error fetching community properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  // Super Admin: Get all communities across all organizations  
  app.get("/api/super-admin/communities-report", isAuthenticated, isSuperAdmin, requireMFA, requireAllowedIP, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      
      const communitiesData = await storage.getAllCommunitiesForSuperAdmin();
      
      await AuditLogger.log({
        req,
        action: "view_communities_report",
        actionType: "read",
        resource: "super_admin",
        severity: "info",
        success: true,
      });
      
      res.json(communitiesData);
    } catch (error) {
      console.error("Error fetching super admin communities report:", error);
      
      await AuditLogger.log({
        req,
        action: "view_communities_report",
        actionType: "read",
        resource: "super_admin",
        severity: "critical",
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      
      res.status(500).json({ message: "Failed to fetch communities report" });
    }
  });

  // Super Admin: Get all vendors across all organizations with rating statistics
  app.get("/api/super-admin/vendors-report", isAuthenticated, isSuperAdmin, requireMFA, requireAllowedIP, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      
      const vendorsData = await storage.getAllVendorsForSuperAdmin();
      
      await AuditLogger.log({
        req,
        action: "view_vendors_report",
        actionType: "read",
        resource: "super_admin",
        severity: "info",
        success: true,
      });
      
      res.json(vendorsData);
    } catch (error) {
      console.error("Error fetching super admin vendors report:", error);
      
      await AuditLogger.log({
        req,
        action: "view_vendors_report",
        actionType: "read",
        resource: "super_admin",
        severity: "critical",
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      
      res.status(500).json({ message: "Failed to fetch vendors report" });
    }
  });

  // Super Admin Security & Compliance API Endpoints
  
  // Get audit logs
  app.get("/api/super-admin/audit-logs", isAuthenticated, isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { limit = 100, offset = 0, severity, actionType, userId, startDate, endDate } = req.query;
      
      const logs = await storage.getAuditLogs({
        limit: Number(limit),
        offset: Number(offset),
        severity: severity as string | undefined,
        actionType: actionType as string | undefined,
        userId: userId as string | undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
      });
      
      await AuditLogger.log({
        req,
        action: "view_audit_logs",
        actionType: "read",
        resource: "audit_logs",
        severity: "info",
        success: true,
      });
      
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });
  
  // Get access review report (all admin users)
  app.get("/api/super-admin/access-review", isAuthenticated, isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const adminUsers = await storage.getAdminUsers();
      
      await AuditLogger.log({
        req,
        action: "view_access_review",
        actionType: "read",
        resource: "access_review",
        severity: "info",
        success: true,
      });
      
      res.json(adminUsers);
    } catch (error) {
      console.error("Error fetching access review:", error);
      res.status(500).json({ message: "Failed to fetch access review" });
    }
  });
  
  // Force logout all sessions for a user
  app.post("/api/super-admin/sessions/invalidate", isAuthenticated, isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "userId is required" });
      }
      
      await SessionManager.invalidateUserSessions(userId);
      
      await AuditLogger.log({
        req,
        action: "invalidate_user_sessions",
        actionType: "admin",
        resource: "user_sessions",
        resourceId: userId,
        severity: "warning",
        success: true,
      });
      
      res.json({ message: "All sessions invalidated successfully" });
    } catch (error) {
      console.error("Error invalidating sessions:", error);
      res.status(500).json({ message: "Failed to invalidate sessions" });
    }
  });
  
  // Get active sessions
  app.get("/api/super-admin/sessions", isAuthenticated, isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { userId } = req.query;
      
      const sessions = userId 
        ? await storage.getUserSessions(userId as string)
        : await storage.getAllActiveSessions();
      
      await AuditLogger.log({
        req,
        action: "view_active_sessions",
        actionType: "read",
        resource: "user_sessions",
        severity: "info",
        success: true,
      });
      
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Platform Template Management Routes (Super Admin only)
  app.get("/api/super-admin/templates", isAuthenticated, isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const templates = await storage.getPlatformTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.get("/api/super-admin/templates/:id", isAuthenticated, isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getPlatformTemplate(parseInt(id));
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching template:", error);
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  app.post("/api/super-admin/templates", isAuthenticated, isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { insertPlatformTemplateSchema } = await import("@shared/schema");
      const validation = insertPlatformTemplateSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid template data", errors: validation.error.issues });
      }

      const template = await storage.createPlatformTemplate(validation.data);
      
      await AuditLogger.log({
        req,
        action: "create_platform_template",
        actionType: "create",
        resource: "platform_template",
        resourceId: template.id.toString(),
        severity: "info",
        success: true,
      });
      
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.patch("/api/super-admin/templates/:id", isAuthenticated, isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.updatePlatformTemplate(parseInt(id), req.body);
      
      await AuditLogger.log({
        req,
        action: "update_platform_template",
        actionType: "update",
        resource: "platform_template",
        resourceId: id,
        severity: "info",
        success: true,
      });
      
      res.json(template);
    } catch (error) {
      console.error("Error updating template:", error);
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  app.delete("/api/super-admin/templates/:id", isAuthenticated, isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePlatformTemplate(parseInt(id));
      
      await AuditLogger.log({
        req,
        action: "delete_platform_template",
        actionType: "delete",
        resource: "platform_template",
        resourceId: id,
        severity: "warning",
        success: true,
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  // Calendar Report Template Management Routes (Super Admin only)
  app.get("/api/super-admin/calendar-report-templates", isAuthenticated, isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const templates = await storage.getCalendarReportTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching calendar report templates:", error);
      res.status(500).json({ message: "Failed to fetch calendar report templates" });
    }
  });

  app.get("/api/super-admin/calendar-report-templates/:id", isAuthenticated, isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getCalendarReportTemplate(parseInt(id));
      if (!template) {
        return res.status(404).json({ message: "Calendar report template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching calendar report template:", error);
      res.status(500).json({ message: "Failed to fetch calendar report template" });
    }
  });

  app.post("/api/super-admin/calendar-report-templates", isAuthenticated, isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { insertCalendarReportTemplateSchema } = await import("@shared/schema");
      const validation = insertCalendarReportTemplateSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid template data", errors: validation.error.issues });
      }

      const template = await storage.createCalendarReportTemplate(validation.data);
      
      await AuditLogger.log({
        req,
        action: "create_calendar_report_template",
        actionType: "create",
        resource: "calendar_report_template",
        resourceId: template.id.toString(),
        severity: "info",
        success: true,
      });
      
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating calendar report template:", error);
      res.status(500).json({ message: "Failed to create calendar report template" });
    }
  });

  app.patch("/api/super-admin/calendar-report-templates/:id", isAuthenticated, isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.updateCalendarReportTemplate(parseInt(id), req.body);
      
      await AuditLogger.log({
        req,
        action: "update_calendar_report_template",
        actionType: "update",
        resource: "calendar_report_template",
        resourceId: id,
        severity: "info",
        success: true,
      });
      
      res.json(template);
    } catch (error) {
      console.error("Error updating calendar report template:", error);
      res.status(500).json({ message: "Failed to update calendar report template" });
    }
  });

  app.delete("/api/super-admin/calendar-report-templates/:id", isAuthenticated, isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCalendarReportTemplate(parseInt(id));
      
      await AuditLogger.log({
        req,
        action: "delete_calendar_report_template",
        actionType: "delete",
        resource: "calendar_report_template",
        resourceId: id,
        severity: "warning",
        success: true,
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting calendar report template:", error);
      res.status(500).json({ message: "Failed to delete calendar report template" });
    }
  });

  // ============================================================
  // Super Admin: Revenue Metrics, System Health, Platform Settings, Platform Alerts
  // ============================================================

  // Revenue metrics aggregated from org_subscriptions + platform_settings prices
  app.get("/api/super-admin/revenue-metrics", isAuthenticated, isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const metrics = await storage.getRevenueMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching revenue metrics:", error);
      res.status(500).json({ message: "Failed to fetch revenue metrics" });
    }
  });

  // Orgs overview (Super Admin Organizations tab)
  app.get("/api/super-admin/orgs-overview", isAuthenticated, isSuperAdmin, requireMFA, async (_req, res) => {
    try {
      const rows = await storage.getOrgsOverview();
      res.json(rows);
    } catch (error) {
      console.error("Error fetching orgs overview:", error);
      res.status(500).json({ message: "Failed to fetch orgs overview" });
    }
  });

  app.get("/api/super-admin/orgs-overview.csv", isAuthenticated, isSuperAdmin, requireMFA, async (_req, res) => {
    try {
      const rows = await storage.getOrgsOverview();
      const esc = (v: any) => {
        if (v === null || v === undefined) return '';
        let s = String(v);
        if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const header = ['Organization', 'Primary Admin', 'Plan', 'Subscription Status', 'Active', 'Properties', 'Users', 'MRR (USD)', 'Created'];
      const lines = [header.join(',')];
      for (const r of rows) {
        lines.push([
          esc(r.name),
          esc(r.primaryAdminEmail),
          esc(r.tier),
          esc(r.subscriptionStatus),
          esc(r.isActive ? 'yes' : 'no'),
          esc(r.propertyCount),
          esc(r.userCount),
          esc((r.mrrCents / 100).toFixed(2)),
          esc(r.createdAt ? new Date(r.createdAt).toISOString() : ''),
        ].join(','));
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="organizations.csv"');
      res.send(lines.join('\n'));
    } catch (error) {
      console.error("Error exporting orgs overview:", error);
      res.status(500).json({ message: "Failed to export organizations" });
    }
  });

  app.patch("/api/super-admin/orgs/:orgId/status", isAuthenticated, isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { orgId } = req.params;
      const { isActive } = req.body ?? {};
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "isActive (boolean) required" });
      }
      const updated = await storage.updateOrg(orgId, { isActive });
      if (!updated) {
        await AuditLogger.log({
          req,
          action: isActive ? "activate_organization" : "suspend_organization",
          actionType: "admin",
          resource: "organization",
          resourceId: orgId,
          severity: "warning",
          success: false,
          errorMessage: "Organization not found",
        });
        return res.status(404).json({ message: "Organization not found" });
      }
      await AuditLogger.log({
        req,
        action: isActive ? "activate_organization" : "suspend_organization",
        actionType: "admin",
        resource: "organization",
        resourceId: orgId,
        severity: "warning",
        success: true,
      });
      res.json(updated);
    } catch (error) {
      console.error("Error updating org status:", error);
      res.status(500).json({ message: "Failed to update organization status" });
    }
  });

  // Users overview across all orgs (Super Admin All Users tab)
  app.get("/api/super-admin/users-overview", isAuthenticated, isSuperAdmin, requireMFA, async (_req, res) => {
    try {
      const rows = await storage.getUsersOverview();
      res.json(rows);
    } catch (error) {
      console.error("Error fetching users overview:", error);
      res.status(500).json({ message: "Failed to fetch users overview" });
    }
  });

  app.get("/api/super-admin/users-overview.csv", isAuthenticated, isSuperAdmin, requireMFA, async (_req, res) => {
    try {
      const rows = await storage.getUsersOverview();
      const esc = (v: any) => {
        if (v === null || v === undefined) return '';
        let s = String(v);
        if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const header = ['Name', 'Email', 'Organization', 'Role', 'Active', 'Last Active', 'Created'];
      const lines = [header.join(',')];
      for (const r of rows) {
        const name = [r.firstName, r.lastName].filter(Boolean).join(' ').trim();
        lines.push([
          esc(name),
          esc(r.email),
          esc(r.orgName),
          esc(r.role),
          esc(r.isActive ? 'yes' : 'no'),
          esc(r.lastActiveAt ? new Date(r.lastActiveAt).toISOString() : ''),
          esc(r.createdAt ? new Date(r.createdAt).toISOString() : ''),
        ].join(','));
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
      res.send(lines.join('\n'));
    } catch (error) {
      console.error("Error exporting users overview:", error);
      res.status(500).json({ message: "Failed to export users" });
    }
  });

  // System health: process info, counts, recent failed webhooks/notifications
  app.get("/api/super-admin/system-health", isAuthenticated, isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const health = await storage.getSystemHealthMetrics();
      res.json(health);
    } catch (error) {
      console.error("Error fetching system health:", error);
      res.status(500).json({ message: "Failed to fetch system health" });
    }
  });

  // Platform settings (key/value JSONB store)
  // Note: auth is enforced by isSuperAdmin (which accepts both session-based super admin
  // and OIDC users with role super_admin). isAuthenticated is intentionally not required
  // so that the session-based super admin login can manage platform settings.
  app.get("/api/super-admin/platform-settings", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching platform settings:", error);
      res.status(500).json({ message: "Failed to fetch platform settings" });
    }
  });

  app.patch("/api/super-admin/platform-settings", isSuperAdmin, requireMFA, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || null;
      const updates = req.body;
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        return res.status(400).json({ message: "Body must be an object of key/value updates" });
      }
      const settings = await storage.setPlatformSettings(updates, userId);

      await AuditLogger.log({
        req,
        action: "update_platform_settings",
        actionType: "update",
        resource: "platform_settings",
        severity: "info",
        success: true,
        metadata: { keys: Object.keys(updates) },
      });

      res.json(settings);
    } catch (error) {
      console.error("Error updating platform settings:", error);
      res.status(500).json({ message: "Failed to update platform settings" });
    }
  });

  // Platform alerts CRUD (Super Admin)
  app.get("/api/super-admin/platform-alerts", isAuthenticated, isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const alerts = await storage.getAllPlatformAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching platform alerts:", error);
      res.status(500).json({ message: "Failed to fetch platform alerts" });
    }
  });

  app.post("/api/super-admin/platform-alerts", isAuthenticated, isSuperAdmin, requireMFA, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { insertPlatformAlertSchema } = await import("@shared/schema");
      const data = insertPlatformAlertSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      const alert = await storage.createPlatformAlert(data);

      await AuditLogger.log({
        req,
        action: "create_platform_alert",
        actionType: "create",
        resource: "platform_alert",
        resourceId: String(alert.id),
        severity: "info",
        success: true,
      });

      res.status(201).json(alert);
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid alert data", errors: error.errors });
      }
      console.error("Error creating platform alert:", error);
      res.status(500).json({ message: "Failed to create platform alert" });
    }
  });

  app.patch("/api/super-admin/platform-alerts/:id", isAuthenticated, isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid alert ID" });
      const existing = await storage.getPlatformAlert(id);
      if (!existing) return res.status(404).json({ message: "Platform alert not found" });

      const { insertPlatformAlertSchema } = await import("@shared/schema");
      // Allow partial updates; createdBy cannot be changed
      const updateSchema = insertPlatformAlertSchema.partial().omit({ createdBy: true });
      const data = updateSchema.parse(req.body);

      const updated = await storage.updatePlatformAlert(id, data);

      await AuditLogger.log({
        req,
        action: "update_platform_alert",
        actionType: "update",
        resource: "platform_alert",
        resourceId: String(id),
        severity: "info",
        success: true,
      });

      res.json(updated);
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid alert data", errors: error.errors });
      }
      console.error("Error updating platform alert:", error);
      res.status(500).json({ message: "Failed to update platform alert" });
    }
  });

  app.delete("/api/super-admin/platform-alerts/:id", isAuthenticated, isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid alert ID" });
      const existing = await storage.getPlatformAlert(id);
      if (!existing) return res.status(404).json({ message: "Platform alert not found" });

      await storage.deletePlatformAlert(id);

      await AuditLogger.log({
        req,
        action: "delete_platform_alert",
        actionType: "delete",
        resource: "platform_alert",
        resourceId: String(id),
        severity: "warning",
        success: true,
      });

      res.json({ message: "Platform alert deleted" });
    } catch (error) {
      console.error("Error deleting platform alert:", error);
      res.status(500).json({ message: "Failed to delete platform alert" });
    }
  });

  // Active platform alerts for the current user (any authenticated user)
  app.get("/api/platform-alerts/active", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const orgId = req.user?.claims?.orgId ?? null;
      const userRole = req.user?.claims?.role || 'staff';
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const alerts = await storage.getActivePlatformAlertsForUser(userId, orgId, userRole);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching active platform alerts:", error);
      res.status(500).json({ message: "Failed to fetch platform alerts" });
    }
  });

  // ============================================================
  // Feature Flags (Super Admin owns flags; orgs override per-org)
  // ============================================================
  app.get("/api/super-admin/feature-flags", isAuthenticated, isSuperAdmin, requireMFA, async (_req, res) => {
    try {
      const flags = await storage.getAllFeatureFlags();
      res.json(flags);
    } catch (error) {
      console.error("Error fetching feature flags:", error);
      res.status(500).json({ message: "Failed to fetch feature flags" });
    }
  });

  app.post("/api/super-admin/feature-flags", isAuthenticated, isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { insertFeatureFlagSchema } = await import("@shared/schema");
      const data = insertFeatureFlagSchema.parse(req.body);
      if (!/^[a-z][a-z0-9_]*$/.test(data.key)) {
        return res.status(400).json({ message: "Flag key must be snake_case (lowercase, digits, underscores)" });
      }
      const existing = await storage.getFeatureFlag(data.key);
      if (existing) return res.status(409).json({ message: "Flag with that key already exists" });
      const flag = await storage.createFeatureFlag(data);
      await AuditLogger.log({
        req,
        action: "create_feature_flag",
        actionType: "create",
        resource: "feature_flag",
        resourceId: data.key,
        severity: "info",
        success: true,
      });
      res.status(201).json(flag);
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid flag data", errors: error.errors });
      }
      console.error("Error creating feature flag:", error);
      res.status(500).json({ message: "Failed to create feature flag" });
    }
  });

  app.patch("/api/super-admin/feature-flags/:key", isAuthenticated, isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const key = req.params.key;
      const existing = await storage.getFeatureFlag(key);
      if (!existing) return res.status(404).json({ message: "Feature flag not found" });
      const { insertFeatureFlagSchema } = await import("@shared/schema");
      // Disallow renaming the key via PATCH; updates only mutate metadata + defaultEnabled.
      const updateSchema = insertFeatureFlagSchema.partial().omit({ key: true });
      const data = updateSchema.parse(req.body);
      const updated = await storage.updateFeatureFlag(key, data);
      await AuditLogger.log({
        req,
        action: "update_feature_flag",
        actionType: "update",
        resource: "feature_flag",
        resourceId: key,
        severity: "info",
        success: true,
        metadata: { keys: Object.keys(data) },
      });
      res.json(updated);
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid flag data", errors: error.errors });
      }
      console.error("Error updating feature flag:", error);
      res.status(500).json({ message: "Failed to update feature flag" });
    }
  });

  app.delete("/api/super-admin/feature-flags/:key", isAuthenticated, isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const key = req.params.key;
      const existing = await storage.getFeatureFlag(key);
      if (!existing) return res.status(404).json({ message: "Feature flag not found" });
      await storage.deleteFeatureFlag(key);
      await AuditLogger.log({
        req,
        action: "delete_feature_flag",
        actionType: "delete",
        resource: "feature_flag",
        resourceId: key,
        severity: "warning",
        success: true,
      });
      res.json({ message: "Feature flag deleted" });
    } catch (error) {
      console.error("Error deleting feature flag:", error);
      res.status(500).json({ message: "Failed to delete feature flag" });
    }
  });

  // Per-org effective flag map (override merged with defaults)
  app.get(
    "/api/super-admin/orgs/:orgId/feature-flags",
    isAuthenticated, isSuperAdmin, requireMFA,
    async (req, res) => {
      try {
        const { getEffectiveFeatureFlags } = await import("./featureFlags");
        const orgId = req.params.orgId;
        const org = await storage.getOrg(orgId);
        if (!org) return res.status(404).json({ message: "Organization not found" });
        const overrides = await storage.getOrgFeatureFlagOverrides(orgId);
        const effective = await getEffectiveFeatureFlags(orgId);
        res.json({ orgId, overrides, effective });
      } catch (error) {
        console.error("Error fetching org feature flags:", error);
        res.status(500).json({ message: "Failed to fetch org feature flags" });
      }
    },
  );

  app.patch(
    "/api/super-admin/orgs/:orgId/feature-flags",
    isAuthenticated, isSuperAdmin, requireMFA,
    async (req, res) => {
      try {
        const orgId = req.params.orgId;
        const org = await storage.getOrg(orgId);
        if (!org) return res.status(404).json({ message: "Organization not found" });
        const { key, enabled } = req.body ?? {};
        if (typeof key !== 'string' || key.length === 0) {
          return res.status(400).json({ message: "Body must include flag `key`" });
        }
        if (enabled !== null && typeof enabled !== 'boolean') {
          return res.status(400).json({ message: "`enabled` must be true, false, or null (clear override)" });
        }
        const flag = await storage.getFeatureFlag(key);
        if (!flag) return res.status(404).json({ message: "Unknown flag key" });
        const overrides = await storage.setOrgFeatureFlagOverride(orgId, key, enabled);
        await AuditLogger.log({
          req,
          action: enabled === null ? "clear_org_feature_flag_override" : "set_org_feature_flag_override",
          actionType: "update",
          resource: "feature_flag_override",
          resourceId: `${orgId}:${key}`,
          severity: "info",
          success: true,
          metadata: { orgId, key, enabled },
        });
        res.json({ orgId, overrides });
      } catch (error) {
        console.error("Error updating org feature flag override:", error);
        res.status(500).json({ message: "Failed to update org feature flag override" });
      }
    },
  );

  // Public effective flag map for the calling user's org
  app.get("/api/feature-flags/me", isAuthenticated, async (req: any, res) => {
    try {
      const { getEffectiveFeatureFlags } = await import("./featureFlags");
      const orgId = req.user?.claims?.orgId ?? req.user?.claims?.org_id ?? null;
      const flags = await getEffectiveFeatureFlags(orgId);
      res.json(flags);
    } catch (error) {
      console.error("Error fetching effective feature flags:", error);
      res.status(500).json({ message: "Failed to fetch feature flags" });
    }
  });

  // GET /api/field-mode/today-summary — counts of today's completed tasks,
  // checklist results, and uploaded photos for the signed-in field user.
  app.get("/api/field-mode/today-summary", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { tasks, taskChecklistItems } = await import("@shared/schema");
      const { db } = await import("./db");
      const { and, eq, gte, lte, sql, inArray } = await import("drizzle-orm");

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      // All tasks assigned to this user that are due/active today, plus those completed today
      const userTasks = await db
        .select({ id: tasks.id, status: tasks.status, completedAt: tasks.completedAt, dueDate: tasks.dueDate })
        .from(tasks)
        .where(eq(tasks.assignedToId, userId));

      const tasksTodayBucket = userTasks.filter((t: any) => {
        if (t.status === "completed" && t.completedAt) {
          const d = new Date(t.completedAt);
          return d >= todayStart && d <= todayEnd;
        }
        if (t.status === "in_progress") return true;
        if (t.dueDate) {
          const d = new Date(t.dueDate);
          return d >= todayStart && d <= todayEnd;
        }
        return false;
      });
      const tasksCompleted = tasksTodayBucket.filter((t: any) => t.status === "completed").length;
      const tasksTotal = tasksTodayBucket.length;

      // Checklist items completed today across this user's tasks
      const userTaskIds = userTasks.map((t: any) => t.id);
      let checklistPass = 0, checklistFail = 0, checklistNa = 0, photosUploaded = 0;
      if (userTaskIds.length > 0) {
        const items = await db
          .select({ result: taskChecklistItems.result, photoUrls: taskChecklistItems.photoUrls, completedAt: taskChecklistItems.completedAt })
          .from(taskChecklistItems)
          .where(
            and(
              inArray(taskChecklistItems.taskId, userTaskIds),
              gte(taskChecklistItems.completedAt, todayStart),
              lte(taskChecklistItems.completedAt, todayEnd),
            ),
          );
        for (const it of items) {
          if (it.result === "pass") checklistPass++;
          else if (it.result === "fail") checklistFail++;
          else if (it.result === "na") checklistNa++;
          if (Array.isArray(it.photoUrls)) photosUploaded += it.photoUrls.length;
        }
      }

      res.json({ tasksCompleted, tasksTotal, checklistPass, checklistFail, checklistNa, photosUploaded });
    } catch (error) {
      console.error("Error fetching today summary:", error);
      res.status(500).json({ message: "Failed to fetch today summary" });
    }
  });

  // Server-side gate for Field Mode. Returns 403 when the org has the
  // mobile_field_mode flag disabled. The Field Mode shell calls this on mount
  // so users who land directly on /field with a stale localStorage preference
  // get a definitive server signal even if the client-side check is bypassed.
  app.get("/api/field-mode/access", isAuthenticated, async (req: any, res) => {
    try {
      const { isFeatureEnabled } = await import("./featureFlags");
      const orgId = req.user?.claims?.orgId ?? req.user?.claims?.org_id ?? null;
      const enabled = await isFeatureEnabled(orgId, "mobile_field_mode");
      if (!enabled) {
        return res.status(403).json({
          enabled: false,
          flag: "mobile_field_mode",
          message: "Field Mode is disabled for your organization.",
        });
      }
      res.json({ enabled: true, flag: "mobile_field_mode" });
    } catch (error) {
      console.error("Error checking field mode access:", error);
      res.status(500).json({ message: "Failed to check field mode access" });
    }
  });

  // Public support contact info (used by Hubify Console "Call Support" button)
  app.get("/api/support-info", async (_req, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      const raw = settings.support_phone ?? settings.supportPhone ?? null;
      const supportPhone = typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null;
      res.json({ supportPhone });
    } catch (error) {
      console.error("Error fetching support info:", error);
      res.status(500).json({ message: "Failed to fetch support info" });
    }
  });

  app.post("/api/platform-alerts/:id/acknowledge", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid alert ID" });
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const existing = await storage.getPlatformAlert(id);
      if (!existing) return res.status(404).json({ message: "Platform alert not found" });

      const already = await storage.hasUserAcknowledgedPlatformAlert(id, userId);
      if (already) return res.json({ message: "Already acknowledged" });

      const ack = await storage.acknowledgePlatformAlert(id, userId);
      res.status(201).json(ack);
    } catch (error) {
      console.error("Error acknowledging platform alert:", error);
      res.status(500).json({ message: "Failed to acknowledge alert" });
    }
  });

  // Get calendar report templates (for regular users)
  app.get("/api/calendar-report-templates", isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getCalendarReportTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching calendar report templates:", error);
      res.status(500).json({ message: "Failed to fetch calendar report templates" });
    }
  });

  // Calendar Report Generation (For regular users)
  app.post("/api/calendar/export", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const orgId = req.user?.orgId;
      
      if (!userId || !orgId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { startDate, endDate, templateId, format } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start and end dates are required" });
      }
      
      // Get template (or use default)
      let template;
      if (templateId) {
        template = await storage.getCalendarReportTemplate(templateId);
      } else {
        template = await storage.getDefaultCalendarReportTemplate();
      }
      
      if (!template) {
        return res.status(404).json({ message: "No report template found" });
      }
      
      // Fetch events for the date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const events = await storage.getEvents(orgId, start, end);
      
      // Fetch attendees for each event
      const eventsWithAttendees = await Promise.all(
        events.map(async (event) => {
          const attendees = await storage.getEventAttendees(event.id);
          return { ...event, attendees };
        })
      );
      
      // Get organization details for template variables
      const org = await storage.getOrg(orgId);
      const user = await storage.getUser(userId);
      
      // Apply template configuration to filter/format events
      const { includedFields, formatOptions } = template;
      
      // Filter events based on template options
      let filteredEvents = eventsWithAttendees.filter(event => {
        if (!formatOptions.includeAllDayEvents && event.allDay) return false;
        return true;
      });
      
      // Sort events
      if (formatOptions.sortBy === 'startDate') {
        filteredEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      } else if (formatOptions.sortBy === 'title') {
        filteredEvents.sort((a, b) => a.title.localeCompare(b.title));
      }
      
      if (formatOptions.sortOrder === 'desc') {
        filteredEvents.reverse();
      }
      
      // Generate report based on format
      if (format === 'csv') {
        // Generate CSV
        const csvRows = [];
        
        // Header row
        const headers = [];
        if (includedFields.title) headers.push('Title');
        if (includedFields.description) headers.push('Description');
        if (includedFields.startDate) headers.push('Start Date');
        if (includedFields.startTime) headers.push('Start Time');
        if (includedFields.endDate) headers.push('End Date');
        if (includedFields.endTime) headers.push('End Time');
        if (includedFields.location) headers.push('Location');
        if (includedFields.calendar) headers.push('Calendar');
        if (includedFields.attendees) headers.push('Attendees');
        
        csvRows.push(headers.join(','));
        
        // Data rows
        for (const event of filteredEvents) {
          const row = [];
          if (includedFields.title) row.push(`"${(event.title || '').replace(/"/g, '""')}"`);
          if (includedFields.description) row.push(`"${(event.description || '').replace(/"/g, '""')}"`);
          if (includedFields.startDate) row.push(new Date(event.start).toLocaleDateString());
          if (includedFields.startTime) row.push(event.allDay ? 'All Day' : new Date(event.start).toLocaleTimeString());
          if (includedFields.endDate) row.push(event.end ? new Date(event.end).toLocaleDateString() : '');
          if (includedFields.endTime) row.push(event.end && !event.allDay ? new Date(event.end).toLocaleTimeString() : '');
          if (includedFields.location) row.push(`"${(event.location || '').replace(/"/g, '""')}"`);
          if (includedFields.calendar) row.push(event.calendarId || '');
          if (includedFields.attendees) row.push(`"${event.attendees?.map((a: any) => a.email || a.name).join('; ') || ''}"`);
          
          csvRows.push(row.join(','));
        }
        
        const csvContent = csvRows.join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="calendar-report-${startDate}-to-${endDate}.csv"`);
        res.send(csvContent);
      } else {
        // Generate PDF
        const doc = new PDFDocument({ margin: 50 });
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="calendar-report-${startDate}-to-${endDate}.pdf"`);
        
        // Pipe the PDF to the response
        doc.pipe(res);
        
        // Header with organization info
        doc.fontSize(20).text(org?.name || 'Calendar Report', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(14).text(template.name, { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).text(`${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`, { align: 'center' });
        doc.moveDown(1);
        
        // Add a line
        doc.strokeColor('#aaaaaa')
           .lineWidth(1)
           .moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .stroke();
        doc.moveDown(1);
        
        // Summary section
        doc.fontSize(12).fillColor('#000000').text(`Total Events: ${filteredEvents.length}`, { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`);
        doc.text(`Generated by: ${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown');
        doc.moveDown(1.5);
        
        // Events section
        doc.fontSize(14).text('Events', { underline: true });
        doc.moveDown(1);
        
        for (const event of filteredEvents) {
          // Check if we need a new page
          if (doc.y > 700) {
            doc.addPage();
          }
          
          // Event title
          if (includedFields.title) {
            doc.fontSize(12).fillColor('#1a73e8').text(event.title || 'Untitled Event');
            doc.moveDown(0.3);
          }
          
          // Date and time
          const startDate = new Date(event.start);
          const endDate = event.end ? new Date(event.end) : null;
          
          doc.fontSize(10).fillColor('#666666');
          
          if (includedFields.startDate && includedFields.startTime) {
            const dateTimeStr = event.allDay 
              ? `${startDate.toLocaleDateString()} (All Day)`
              : `${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString()}`;
            doc.text(`📅 ${dateTimeStr}`);
          } else if (includedFields.startDate) {
            doc.text(`📅 ${startDate.toLocaleDateString()}`);
          }
          
          if (endDate && includedFields.endDate) {
            const endStr = event.allDay
              ? endDate.toLocaleDateString()
              : `${endDate.toLocaleDateString()} ${endDate.toLocaleTimeString()}`;
            doc.text(`   to ${endStr}`);
          }
          
          // Location
          if (includedFields.location && event.location) {
            doc.text(`📍 ${event.location}`);
          }
          
          // Description
          if (includedFields.description && event.description) {
            doc.moveDown(0.3);
            doc.fillColor('#000000').text(event.description, {
              width: 500,
              align: 'left'
            });
          }
          
          // Attendees
          if (includedFields.attendees && event.attendees && event.attendees.length > 0) {
            doc.moveDown(0.3);
            doc.fillColor('#666666').text(`👥 ${event.attendees.map((a: any) => a.email || a.name).join(', ')}`);
          }
          
          // Add separator
          doc.moveDown(0.5);
          doc.strokeColor('#eeeeee')
             .lineWidth(0.5)
             .moveTo(50, doc.y)
             .lineTo(550, doc.y)
             .stroke();
          doc.moveDown(1);
        }
        
        // Footer on last page
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);
          doc.fontSize(8)
             .fillColor('#999999')
             .text(
               `Page ${i + 1} of ${pageCount}`,
               50,
               doc.page.height - 50,
               { align: 'center' }
             );
        }
        
        // Finalize the PDF
        doc.end();
      }
      
      await AuditLogger.log({
        req,
        action: "export_calendar_report",
        actionType: "read",
        resource: "calendar_report",
        resourceId: templateId?.toString() || 'default',
        severity: "info",
        success: true,
        metadata: { startDate, endDate, format, eventCount: filteredEvents.length },
      });
    } catch (error) {
      console.error("Error generating calendar report:", error);
      res.status(500).json({ message: "Failed to generate calendar report" });
    }
  });

  app.post("/api/communities", isAuthenticated, requireCommunities, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      console.log("Creating community with data:", req.body);
      console.log("User ID:", userId);
      
      // Validate required fields
      if (!req.body.name) {
        return res.status(400).json({ message: "Community name is required" });
      }

      // Extract only the fields that exist in the current database schema
      const communityData = {
        name: req.body.name,
        address1: req.body.address1 || null,
        address2: req.body.address2 || null,
        city: req.body.city || null,
        state: req.body.state || null,
        zip: req.body.zip || null,
        notes: req.body.notes || null
      };

      const community = await storage.createCommunity(communityData, userId);
      res.status(201).json(community);
    } catch (error) {
      console.error("Error creating community:", error);
      res.status(500).json({ message: "Failed to create community", error: error.message });
    }
  });

  app.patch("/api/communities/:id", isAuthenticated, requireCommunities, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid community ID' });
      }

      const community = await storage.updateCommunity(id, req.body);
      res.json(community);
    } catch (error) {
      console.error("Error updating community:", error);
      res.status(500).json({ message: "Failed to update community" });
    }
  });

  // Document Template routes
  app.get("/api/document-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userOrgId = req.user.claims.orgId || req.user.orgId;
      const templates = await storage.getDocumentTemplates(userOrgId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching document templates:", error);
      res.status(500).json({ message: "Failed to fetch document templates" });
    }
  });

  app.post("/api/document-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userOrgId = req.user.claims.orgId || req.user.orgId;
      const userId = req.user.claims.sub;
      const userRole = req.user.claims.role;

      // Only admins can create document templates
      if (userRole !== "admin" && userRole !== "supervisor") {
        return res.status(403).json({ message: "Only admins and supervisors can create document templates" });
      }

      const { name, description, documentType, fileUrl, fileName } = req.body;

      // Validate required fields
      if (!name || !documentType || !fileUrl || !fileName) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const template = await storage.createDocumentTemplate({
        orgId: userOrgId,
        name,
        description: description || null,
        documentType,
        fileUrl,
        fileName,
        uploadedBy: userId,
      });

      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating document template:", error);
      res.status(500).json({ message: "Failed to create document template" });
    }
  });

  app.patch("/api/document-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid template ID' });
      }

      const userOrgId = req.user.claims.orgId || req.user.orgId;
      const userRole = req.user.claims.role;

      // Only admins can update document templates
      if (userRole !== "admin" && userRole !== "supervisor") {
        return res.status(403).json({ message: "Only admins and supervisors can update document templates" });
      }

      const { name, description, documentType, isActive } = req.body;

      const updatedTemplate = await storage.updateDocumentTemplate(id, userOrgId, {
        name,
        description,
        documentType,
        isActive,
      });

      res.json(updatedTemplate);
    } catch (error) {
      console.error("Error updating document template:", error);
      res.status(500).json({ message: "Failed to update document template" });
    }
  });

  app.delete("/api/document-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid template ID' });
      }

      const userOrgId = req.user.claims.orgId || req.user.orgId;
      const userRole = req.user.claims.role;

      // Only admins can delete document templates
      if (userRole !== "admin" && userRole !== "supervisor") {
        return res.status(403).json({ message: "Only admins and supervisors can delete document templates" });
      }

      await storage.deleteDocumentTemplate(id, userOrgId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document template:", error);
      res.status(500).json({ message: "Failed to delete document template" });
    }
  });

  app.post("/api/communities/:communityId/link-template/:templateId", isAuthenticated, requireCommunities, async (req: any, res) => {
    try {
      const communityId = parseInt(req.params.communityId);
      const templateId = parseInt(req.params.templateId);

      if (isNaN(communityId)) {
        return res.status(400).json({ message: 'Invalid community ID' });
      }
      if (isNaN(templateId)) {
        return res.status(400).json({ message: 'Invalid template ID' });
      }

      const userId = req.user.claims.sub;

      const communityDoc = await storage.linkTemplateToCommunity(templateId, communityId, userId);
      res.status(201).json(communityDoc);
    } catch (error) {
      console.error("Error linking template to community:", error);
      res.status(500).json({ message: "Failed to link template to community", error: error.message });
    }
  });

  // Community documents routes
  app.post("/api/communities/:id/documents/upload-url", isAuthenticated, requireCommunities, async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      if (isNaN(communityId)) {
        return res.status(400).json({ message: 'Invalid community ID' });
      }

      const { fileName } = req.body;
      if (!fileName) {
        return res.status(400).json({ message: 'File name is required' });
      }

      const objectStorageService = new ObjectStorageService();
      const uploadInfo = await objectStorageService.getCommunityDocumentUploadURL(communityId, fileName);
      res.json(uploadInfo);
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ message: "Failed to generate upload URL" });
    }
  });

  app.get("/api/communities/:id/documents", isAuthenticated, requireCommunities, async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      if (isNaN(communityId)) {
        return res.status(400).json({ message: 'Invalid community ID' });
      }

      const documents = await storage.getCommunityDocuments(communityId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching community documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post("/api/communities/:id/documents", isAuthenticated, requireCommunities, async (req: any, res) => {
    try {
      const communityId = parseInt(req.params.id);
      if (isNaN(communityId)) {
        return res.status(400).json({ message: 'Invalid community ID' });
      }

      const { documentType, classification, fileUrl, fileName, propertyId } = req.body;
      const userId = req.user.claims.sub;
      const userRole = req.user.claims.role;
      const userOrgId = req.user.claims.orgId || req.user.orgId;

      // Validate required fields
      if (!documentType || !classification || !fileUrl || !fileName) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // SECURITY: Validate fileUrl matches expected format and prevent path traversal
      const expectedPattern = `/community-documents/community-${communityId}_`;
      let pathToCheck = fileUrl;
      
      // Parse URL if it's a full URL, otherwise treat as path
      try {
        const url = new URL(fileUrl);
        pathToCheck = url.pathname;
      } catch (error) {
        // fileUrl is a path, not a full URL
      }
      
      // Normalize path and check for traversal attempts
      const normalizedPath = pathToCheck.replace(/\/+/g, '/'); // Remove duplicate slashes
      if (normalizedPath.includes('..')) {
        return res.status(400).json({ 
          message: "Invalid file URL - path traversal detected" 
        });
      }
      
      // Check if path contains the expected community pattern
      if (!normalizedPath.includes(expectedPattern)) {
        return res.status(400).json({ 
          message: "Invalid file URL - does not match community path pattern" 
        });
      }

      // SECURITY: Validate propertyId and organization access
      if (classification === "residential-based") {
        if (!propertyId) {
          return res.status(400).json({ 
            message: "Property ID is required for residential-based documents" 
          });
        }

        // Verify property exists, belongs to this community, AND user's organization
        const property = await storage.getProperty(propertyId);
        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }
        
        if (property.communityId !== communityId) {
          return res.status(403).json({ 
            message: "Property does not belong to this community" 
          });
        }
        if (property.orgId !== userOrgId) {
          return res.status(403).json({ 
            message: "You do not have access to upload documents for this property" 
          });
        }
      } else if (classification === "community-wide") {
        if (propertyId) {
          return res.status(400).json({ 
            message: "Community-wide documents should not have a property ID" 
          });
        }
        
        // SECURITY: Verify user's org has at least one property in this community
        const allProperties = await storage.getProperties(true);
        const orgCommunityProperties = allProperties.filter(
          p => p.communityId === communityId && p.orgId === userOrgId
        );
        
        if (orgCommunityProperties.length === 0) {
          return res.status(403).json({ 
            message: "You do not have access to upload community-wide documents for this community" 
          });
        }
      }

      // If community-wide, check if a document of this type already exists
      if (classification === "community-wide") {
        const existingDocs = await storage.getCommunityDocuments(communityId);
        const existingDoc = existingDocs.find(
          (doc) => doc.documentType === documentType && doc.classification === "community-wide" && !doc.propertyId
        );

        if (existingDoc) {
          // Only admins can replace existing community-wide documents
          if (userRole !== "admin") {
            return res.status(403).json({ 
              message: "Only administrators can replace existing community-wide documents" 
            });
          }
          
          // Delete the old document before adding the new one
          await storage.deleteCommunityDocument(existingDoc.id);
        }
      }

      // Create the document
      const document = await storage.createCommunityDocument({
        communityId,
        propertyId: propertyId || null,
        documentType,
        classification: classification as "community-wide" | "residential-based",
        fileUrl,
        fileName,
        uploadedBy: userId,
      });

      res.status(201).json(document);
    } catch (error) {
      console.error("Error uploading community document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.delete("/api/community-documents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid document ID' });
      }

      const userRole = req.user.claims.role;

      // Only admins can delete documents
      if (userRole !== "admin") {
        return res.status(403).json({ 
          message: "Only administrators can delete community documents" 
        });
      }

      // SECURITY: Verify document exists and user has organization-level access
      const document = await storage.getCommunityDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // SECURITY: Verify user's organization has access to this document's community
      const userOrgId = req.user.claims.orgId || req.user.orgId;
      
      // For residential-based documents, verify through property ownership
      if (document.propertyId) {
        const property = await storage.getProperty(document.propertyId);
        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }
        if (property.orgId !== userOrgId) {
          return res.status(403).json({ 
            message: "You do not have access to delete this document" 
          });
        }
      } else {
        // For community-wide documents, verify user's org has at least one property in this community
        const allProperties = await storage.getProperties(true); // Include inactive
        const orgCommunityProperties = allProperties.filter(
          p => p.communityId === document.communityId && p.orgId === userOrgId
        );
        
        if (orgCommunityProperties.length === 0) {
          return res.status(403).json({ 
            message: "You do not have access to delete this document" 
          });
        }
      }

      await storage.deleteCommunityDocument(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting community document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Download community document
  app.get("/api/download-document", isAuthenticated, async (req: any, res) => {
    try {
      const { path: filePath } = req.query;
      if (!filePath) {
        return res.status(400).json({ message: "File path is required" });
      }

      // Parse the object path to get bucket and object name
      const parseObjectPath = (path: string): { bucketName: string; objectName: string } => {
        if (!path.startsWith("/")) {
          path = `/${path}`;
        }
        const pathParts = path.split("/");
        if (pathParts.length < 3) {
          throw new Error("Invalid path: must contain at least a bucket name");
        }
        const bucketName = pathParts[1];
        const objectName = pathParts.slice(2).join("/");
        return { bucketName, objectName };
      };

      const { bucketName, objectName } = parseObjectPath(filePath as string);
      
      // Import object storage client
      const { objectStorageClient } = await import("./objectStorage");
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      const objectStorage = new ObjectStorageService();
      await objectStorage.downloadObject(file, res);
    } catch (error) {
      console.error("Error downloading document:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to download document" });
      }
    }
  });

  // Property routes
  app.get("/api/properties", isAuthenticated, async (req, res) => {
    try {
      const { includeInactive, managerId } = req.query;
      const includeInactiveFlag = includeInactive === 'true';
      let properties = await storage.getProperties(includeInactiveFlag);
      
      // Filter by managerId if provided
      if (managerId) {
        properties = properties.filter(property => property.managerId === managerId);
      }
      
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid property ID' });
      }
      
      const property = await storage.getProperty(id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  app.post("/api/properties", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // For dev mode, use the default org. In production, this would come from the user's org
      const orgId = req.user.orgId || "00000000-0000-0000-0000-000000000000";
      
      console.log("Property creation request:", {
        body: req.body,
        userId,
        orgId,
        user: req.user
      });
      
      // Extract contactId from request body if provided
      const { contactId, ...propertyData } = req.body;
      
      const dataToValidate = {
        ...propertyData,
        orgId,
        managerId: userId,
      };
      
      console.log("Data being validated:", dataToValidate);
      
      const validatedData = insertPropertySchema.parse(dataToValidate);
      
      // Check if trying to create a premium property type
      if (isPremiumPropertyType(validatedData.type)) {
        // Get org subscription to check tier
        const subscription = await storage.getOrgSubscription(orgId);
        const tier = subscription?.tier || 'starter';
        
        if (!tierAllowsPremiumProperties(tier)) {
          return res.status(403).json({ 
            message: `Storage units and boats are premium features available on Pro, Grow, and Enterprise plans. Your current plan is ${tier}.`,
            upgrade_required: true,
            current_tier: tier,
            required_tiers: ['pro', 'grow', 'enterprise']
          });
        }
      }
      
      const property = await storage.createProperty(validatedData, userId);
      
      // If contactId is provided, create the property-contact association
      if (contactId) {
        await storage.linkContactToProperty(contactId, property.id, true, "owner");
        console.log(`Linked contact ${contactId} to property ${property.id}`);
      }
      
      res.status(201).json(property);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Zod validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating property:", error);
      res.status(500).json({ message: "Failed to create property" });
    }
  });

  // Update property
  app.patch("/api/properties/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid property ID' });
      }

      console.log(`Updating property ${id} with data:`, req.body);
      
      // Check if trying to change to a premium property type
      if (req.body.type && isPremiumPropertyType(req.body.type)) {
        // Get the existing property to get orgId
        const existingProperty = await storage.getProperty(id);
        if (!existingProperty) {
          return res.status(404).json({ message: "Property not found" });
        }
        
        // Get org subscription to check tier
        const subscription = await storage.getOrgSubscription(existingProperty.orgId);
        const tier = subscription?.tier || 'starter';
        
        if (!tierAllowsPremiumProperties(tier)) {
          return res.status(403).json({ 
            message: `Storage units and boats are premium features available on Pro, Grow, and Enterprise plans. Your current plan is ${tier}.`,
            upgrade_required: true,
            current_tier: tier,
            required_tiers: ['pro', 'grow', 'enterprise']
          });
        }
      }
      
      const property = await storage.updateProperty(id, req.body);
      console.log("Updated property result:", property);
      res.json(property);
    } catch (error) {
      console.error("Error updating property:", error);
      res.status(500).json({ message: "Failed to update property" });
    }
  });

  // Update property community
  app.patch("/api/properties/:id/community", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid property ID' });
      }

      const { communityId } = req.body;
      
      // communityId can be null (to remove community) or a valid number
      if (communityId !== null && communityId !== undefined) {
        const parsedCommunityId = parseInt(communityId);
        if (isNaN(parsedCommunityId)) {
          return res.status(400).json({ message: 'Invalid community ID' });
        }
      }

      const property = await storage.updateProperty(id, { communityId });
      res.json(property);
    } catch (error) {
      console.error("Error updating property community:", error);
      res.status(500).json({ message: "Failed to update property community" });
    }
  });

  // Delete property
  app.delete("/api/properties/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid property ID' });
      }

      await storage.deleteProperty(id);
      res.json({ message: 'Property deleted successfully' });
    } catch (error) {
      console.error('Error deleting property:', error);
      res.status(500).json({ message: 'Failed to delete property' });
    }
  });

  // Property-Vendor relationship routes
  app.get("/api/properties/:propertyId/vendors", isAuthenticated, async (req: any, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: 'Invalid property ID' });
      }
      
      const orgId = req.user.orgId || "00000000-0000-0000-0000-000000000000";
      const vendors = await storage.getPropertyVendors(propertyId, orgId);
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching property vendors:", error);
      res.status(500).json({ message: "Failed to fetch property vendors" });
    }
  });

  app.post("/api/properties/:propertyId/vendors", isAuthenticated, async (req: any, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: 'Invalid property ID' });
      }

      const orgId = req.user.orgId || "00000000-0000-0000-0000-000000000000";
      const { vendorId, notes } = req.body;

      if (!vendorId || isNaN(parseInt(vendorId))) {
        return res.status(400).json({ message: 'Invalid vendor ID' });
      }

      const propertyVendor = await storage.addPropertyVendor(propertyId, parseInt(vendorId), orgId, notes);
      res.status(201).json(propertyVendor);
    } catch (error) {
      console.error("Error adding property vendor:", error);
      res.status(500).json({ message: "Failed to add property vendor" });
    }
  });

  app.delete("/api/property-vendors/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid property vendor ID' });
      }

      const orgId = req.user.orgId || "00000000-0000-0000-0000-000000000000";
      await storage.removePropertyVendor(id, orgId);
      res.json({ message: 'Property vendor removed successfully' });
    } catch (error) {
      console.error('Error removing property vendor:', error);
      res.status(500).json({ message: 'Failed to remove property vendor' });
    }
  });

  app.post("/api/properties/:targetPropertyId/copy-vendors/:sourcePropertyId", isAuthenticated, async (req: any, res) => {
    try {
      const targetPropertyId = parseInt(req.params.targetPropertyId);
      const sourcePropertyId = parseInt(req.params.sourcePropertyId);
      
      if (isNaN(targetPropertyId) || isNaN(sourcePropertyId)) {
        return res.status(400).json({ message: 'Invalid property ID' });
      }

      const orgId = req.user.orgId || "00000000-0000-0000-0000-000000000000";
      const copiedCount = await storage.copyPropertyVendors(sourcePropertyId, targetPropertyId, orgId);
      
      res.json({ 
        message: `Successfully copied ${copiedCount} vendor(s) to the property`,
        count: copiedCount 
      });
    } catch (error: any) {
      console.error('Error copying property vendors:', error);
      res.status(500).json({ message: error.message || 'Failed to copy vendors' });
    }
  });

  // Room routes
  app.get("/api/properties/:propertyId/rooms", isAuthenticated, async (req, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: 'Invalid property ID' });
      }
      
      const rooms = await storage.getRoomsByProperty(propertyId);
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  app.post("/api/rooms", isAuthenticated, async (req, res) => {
    try {
      console.log("Creating room with data:", req.body);
      const validatedData = insertRoomSchema.parse(req.body);
      console.log("Validated room data:", validatedData);
      const room = await storage.createRoom(validatedData);
      res.status(201).json(room);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Room validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating room:", error);
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  app.patch("/api/rooms/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid room ID' });
      }

      const room = await storage.updateRoom(id, req.body);
      res.json(room);
    } catch (error) {
      console.error("Error updating room:", error);
      res.status(500).json({ message: "Failed to update room" });
    }
  });

  app.delete("/api/rooms/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid room ID' });
      }

      await storage.deleteRoom(id);
      res.json({ message: 'Room deleted successfully' });
    } catch (error) {
      console.error('Error deleting room:', error);
      res.status(500).json({ message: 'Failed to delete room' });
    }
  });

  // Room supply routes
  app.get("/api/rooms/:roomId/supplies", isAuthenticated, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) {
        return res.status(400).json({ message: 'Invalid room ID' });
      }
      
      const supplies = await storage.getRoomSupplies(roomId);
      res.json(supplies);
    } catch (error) {
      console.error("Error fetching room supplies:", error);
      res.status(500).json({ message: "Failed to fetch room supplies" });
    }
  });

  // Get all supplies for a property (grouped by room)
  app.get("/api/properties/:propertyId/supplies-report", isAuthenticated, async (req, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: 'Invalid property ID' });
      }
      
      const supplies = await storage.getPropertySupplies(propertyId);
      res.json(supplies);
    } catch (error) {
      console.error("Error fetching property supplies:", error);
      res.status(500).json({ message: "Failed to fetch property supplies" });
    }
  });

  // Get all devices for a property (grouped by room)
  app.get("/api/properties/:propertyId/devices-report", isAuthenticated, async (req, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: 'Invalid property ID' });
      }
      
      const devices = await storage.getPropertyDevices(propertyId);
      res.json(devices);
    } catch (error) {
      console.error("Error fetching property devices:", error);
      res.status(500).json({ message: "Failed to fetch property devices" });
    }
  });

  // Get all fixtures for a property (grouped by room)
  app.get("/api/properties/:propertyId/fixtures-report", isAuthenticated, async (req, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: 'Invalid property ID' });
      }
      
      const fixtures = await storage.getPropertyFixtures(propertyId);
      res.json(fixtures);
    } catch (error) {
      console.error("Error fetching property fixtures:", error);
      res.status(500).json({ message: "Failed to fetch property fixtures" });
    }
  });

  // Get all surface links for a property (grouped by room)
  app.get("/api/properties/:propertyId/surface-links-report", isAuthenticated, async (req, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: 'Invalid property ID' });
      }
      
      const links = await storage.getPropertySurfaceLinks(propertyId);
      res.json(links);
    } catch (error) {
      console.error("Error fetching property surface links:", error);
      res.status(500).json({ message: "Failed to fetch property surface links" });
    }
  });

  // Get shopping list for a property (supplies needing replacement, devices needing service, surface links)
  app.get("/api/properties/:propertyId/shopping-list", isAuthenticated, async (req, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: 'Invalid property ID' });
      }
      
      const shoppingList = await storage.getPropertyShoppingList(propertyId);
      res.json(shoppingList);
    } catch (error) {
      console.error("Error fetching property shopping list:", error);
      res.status(500).json({ message: "Failed to fetch property shopping list" });
    }
  });

  app.post("/api/room-supplies", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertRoomSupplySchema.parse(req.body);
      const supply = await storage.createRoomSupply(validatedData);
      res.status(201).json(supply);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating room supply:", error);
      res.status(500).json({ message: "Failed to create room supply" });
    }
  });

  app.patch("/api/room-supplies/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid supply ID' });
      }

      const supply = await storage.updateRoomSupply(id, req.body);
      res.json(supply);
    } catch (error) {
      console.error("Error updating room supply:", error);
      res.status(500).json({ message: "Failed to update room supply" });
    }
  });

  app.delete("/api/room-supplies/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid supply ID' });
      }

      await storage.deleteRoomSupply(id);
      res.json({ message: 'Room supply deleted successfully' });
    } catch (error) {
      console.error('Error deleting room supply:', error);
      res.status(500).json({ message: 'Failed to delete room supply' });
    }
  });

  // Room note routes
  app.get("/api/rooms/:roomId/notes", isAuthenticated, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) {
        return res.status(400).json({ message: 'Invalid room ID' });
      }
      
      const notes = await storage.getRoomNotes(roomId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching room notes:", error);
      res.status(500).json({ message: "Failed to fetch room notes" });
    }
  });

  app.post("/api/room-notes", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertRoomNoteSchema.parse(req.body);
      const note = await storage.createRoomNote(validatedData);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating room note:", error);
      res.status(500).json({ message: "Failed to create room note" });
    }
  });

  app.patch("/api/room-notes/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid note ID' });
      }

      const note = await storage.updateRoomNote(id, req.body);
      res.json(note);
    } catch (error) {
      console.error("Error updating room note:", error);
      res.status(500).json({ message: "Failed to update room note" });
    }
  });

  app.delete("/api/room-notes/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid note ID' });
      }

      await storage.deleteRoomNote(id);
      res.json({ message: 'Room note deleted successfully' });
    } catch (error) {
      console.error('Error deleting room note:', error);
      res.status(500).json({ message: 'Failed to delete room note' });
    }
  });

  // Room device routes
  app.get("/api/rooms/:roomId/devices", isAuthenticated, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) {
        return res.status(400).json({ message: 'Invalid room ID' });
      }
      
      const devices = await storage.getRoomDevices(roomId);
      res.json(devices);
    } catch (error) {
      console.error("Error fetching room devices:", error);
      res.status(500).json({ message: "Failed to fetch room devices" });
    }
  });

  app.post("/api/room-devices", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Transform date strings to Date objects or null
      const deviceData = {
        ...req.body,
        createdById: userId,
        installDate: req.body.installDate ? new Date(req.body.installDate) : null,
        lastServiced: req.body.lastServiced ? new Date(req.body.lastServiced) : null,
        nextServiceDue: req.body.nextServiceDue ? new Date(req.body.nextServiceDue) : null,
        warrantyStartDate: req.body.warrantyStartDate ? new Date(req.body.warrantyStartDate) : null,
        warrantyEndDate: req.body.warrantyEndDate ? new Date(req.body.warrantyEndDate) : null,
      };

      const validatedData = insertRoomDeviceSchema.parse(deviceData);
      const device = await storage.createRoomDevice(validatedData);
      res.status(201).json(device);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating room device:", error);
      res.status(500).json({ message: "Failed to create room device" });
    }
  });

  app.patch("/api/room-devices/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid device ID' });
      }

      // Transform date strings to Date objects or null, but only for fields that are present
      const deviceData = { ...req.body };
      
      // Only transform date fields if they're present in the request
      if ('installDate' in req.body) {
        deviceData.installDate = req.body.installDate ? new Date(req.body.installDate) : null;
      }
      if ('lastServiced' in req.body) {
        deviceData.lastServiced = req.body.lastServiced ? new Date(req.body.lastServiced) : null;
      }
      if ('nextServiceDue' in req.body) {
        deviceData.nextServiceDue = req.body.nextServiceDue ? new Date(req.body.nextServiceDue) : null;
      }
      if ('warrantyStartDate' in req.body) {
        deviceData.warrantyStartDate = req.body.warrantyStartDate ? new Date(req.body.warrantyStartDate) : null;
      }
      if ('warrantyEndDate' in req.body) {
        deviceData.warrantyEndDate = req.body.warrantyEndDate ? new Date(req.body.warrantyEndDate) : null;
      }

      const device = await storage.updateRoomDevice(id, deviceData);
      res.json(device);
    } catch (error) {
      console.error("Error updating room device:", error);
      res.status(500).json({ message: "Failed to update room device" });
    }
  });

  app.delete("/api/room-devices/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid device ID' });
      }

      await storage.deleteRoomDevice(id);
      res.json({ message: 'Room device deleted successfully' });
    } catch (error) {
      console.error('Error deleting room device:', error);
      res.status(500).json({ message: 'Failed to delete room device' });
    }
  });

  // Room surface routes
  app.get("/api/rooms/:roomId/surfaces", isAuthenticated, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) {
        return res.status(400).json({ message: 'Invalid room ID' });
      }
      
      const surfaces = await storage.getRoomSurfaces(roomId);
      res.json(surfaces);
    } catch (error) {
      console.error("Error fetching room surfaces:", error);
      res.status(500).json({ message: "Failed to fetch room surfaces" });
    }
  });

  app.post("/api/room-surfaces", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertRoomSurfaceSchema.parse(req.body);
      const surface = await storage.createRoomSurface(validatedData);
      res.status(201).json(surface);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating room surface:", error);
      res.status(500).json({ message: "Failed to create room surface" });
    }
  });

  app.patch("/api/room-surfaces/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid surface ID' });
      }

      const surface = await storage.updateRoomSurface(id, req.body);
      res.json(surface);
    } catch (error) {
      console.error("Error updating room surface:", error);
      res.status(500).json({ message: "Failed to update room surface" });
    }
  });

  app.delete("/api/room-surfaces/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid surface ID' });
      }

      await storage.deleteRoomSurface(id);
      res.json({ message: 'Room surface deleted successfully' });
    } catch (error) {
      console.error('Error deleting room surface:', error);
      res.status(500).json({ message: 'Failed to delete room surface' });
    }
  });

  // Room surface link routes
  app.get("/api/rooms/:roomId/surface-links", isAuthenticated, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) {
        return res.status(400).json({ message: 'Invalid room ID' });
      }
      
      const links = await storage.getRoomSurfaceLinks(roomId);
      res.json(links);
    } catch (error) {
      console.error("Error fetching room surface links:", error);
      res.status(500).json({ message: "Failed to fetch room surface links" });
    }
  });

  app.post("/api/room-surface-links", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if a link already exists for this surface category in this room
      const roomId = req.body.roomId;
      const surfaceCategory = req.body.surfaceCategory;
      
      if (roomId && surfaceCategory) {
        const existingLinks = await storage.getRoomSurfaceLinks(roomId);
        const categoryExists = existingLinks.some(link => link.surfaceCategory === surfaceCategory);
        
        if (categoryExists) {
          return res.status(400).json({ 
            message: `A link already exists for the ${surfaceCategory} category in this room. Please edit the existing link instead.` 
          });
        }
      }

      const linkData = {
        ...req.body,
        createdById: userId,
      };

      const validatedData = insertRoomSurfaceLinkSchema.parse(linkData);
      const link = await storage.createRoomSurfaceLink(validatedData);
      res.status(201).json(link);
    } catch (error: any) {
      console.error("Error creating room surface link:", error);
      res.status(400).json({ message: error.message || "Failed to create room surface link" });
    }
  });

  app.patch("/api/room-surface-links/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid link ID' });
      }

      // Check if changing surface category would create a duplicate
      if (req.body.surfaceCategory && req.body.roomId) {
        const existingLinks = await storage.getRoomSurfaceLinks(req.body.roomId);
        const categoryExists = existingLinks.some(
          link => link.surfaceCategory === req.body.surfaceCategory && link.id !== id
        );
        
        if (categoryExists) {
          return res.status(400).json({ 
            message: `A link already exists for the ${req.body.surfaceCategory} category in this room.` 
          });
        }
      }

      const link = await storage.updateRoomSurfaceLink(id, req.body);
      res.json(link);
    } catch (error: any) {
      console.error('Error updating room surface link:', error);
      res.status(400).json({ message: error.message || 'Failed to update room surface link' });
    }
  });

  app.delete("/api/room-surface-links/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid link ID' });
      }

      await storage.deleteRoomSurfaceLink(id);
      res.json({ message: 'Room surface link deleted successfully' });
    } catch (error) {
      console.error('Error deleting room surface link:', error);
      res.status(500).json({ message: 'Failed to delete room surface link' });
    }
  });

  // Room fixture routes
  app.get("/api/rooms/:roomId/fixtures", isAuthenticated, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) {
        return res.status(400).json({ message: 'Invalid room ID' });
      }
      
      const fixtures = await storage.getRoomFixtures(roomId);
      res.json(fixtures);
    } catch (error) {
      console.error("Error fetching room fixtures:", error);
      res.status(500).json({ message: "Failed to fetch room fixtures" });
    }
  });

  app.post("/api/room-fixtures", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertRoomFixtureSchema.parse(req.body);
      const fixture = await storage.createRoomFixture(validatedData);
      res.status(201).json(fixture);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating room fixture:", error);
      res.status(500).json({ message: "Failed to create room fixture" });
    }
  });

  app.patch("/api/room-fixtures/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid fixture ID' });
      }

      const fixture = await storage.updateRoomFixture(id, req.body);
      res.json(fixture);
    } catch (error) {
      console.error("Error updating room fixture:", error);
      res.status(500).json({ message: "Failed to update room fixture" });
    }
  });

  app.delete("/api/room-fixtures/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid fixture ID' });
      }

      await storage.deleteRoomFixture(id);
      res.json({ message: 'Room fixture deleted successfully' });
    } catch (error) {
      console.error('Error deleting room fixture:', error);
      res.status(500).json({ message: 'Failed to delete room fixture' });
    }
  });

  // Room photo routes
  app.get("/api/rooms/:roomId/photos", isAuthenticated, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) {
        return res.status(400).json({ message: 'Invalid room ID' });
      }
      
      const photos = await storage.getRoomPhotos(roomId);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching room photos:", error);
      res.status(500).json({ message: "Failed to fetch room photos" });
    }
  });

  app.post("/api/room-photos", isAuthenticated, upload.single('photo'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No photo file provided" });
      }

      const { roomId, category, description } = req.body;
      
      if (!roomId) {
        return res.status(400).json({ message: "Room ID is required" });
      }

      const userId = req.user.claims.sub;
      const photoData = {
        roomId: parseInt(roomId),
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: `/uploads/photos/${req.file.filename}`,
        category: category || 'general',
        description: description || '',
        uploadedById: userId,
      };

      const photo = await storage.createRoomPhoto(photoData);
      
      // Return photo with accessible URL
      res.status(201).json({
        ...photo,
        photoUrl: `/uploads/photos/${req.file.filename}`
      });
    } catch (error) {
      console.error("Error uploading room photo:", error);
      // Clean up uploaded file if database save failed
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ message: "Failed to upload room photo" });
    }
  });

  app.delete("/api/room-photos/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid photo ID' });
      }

      await storage.deleteRoomPhoto(id);
      res.json({ message: 'Room photo deleted successfully' });
    } catch (error) {
      console.error('Error deleting room photo:', error);
      res.status(500).json({ message: 'Failed to delete room photo' });
    }
  });

  // Room checklist routes
  app.get("/api/rooms/:roomId/checklists", isAuthenticated, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) {
        return res.status(400).json({ message: 'Invalid room ID' });
      }
      
      const checklists = await storage.getRoomChecklists(roomId);
      res.json(checklists);
    } catch (error) {
      console.error("Error fetching room checklists:", error);
      res.status(500).json({ message: "Failed to fetch room checklists" });
    }
  });

  app.post("/api/room-checklists", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertRoomChecklistSchema.parse(req.body);
      const checklist = await storage.createRoomChecklist(validatedData);
      res.status(201).json(checklist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating room checklist:", error);
      res.status(500).json({ message: "Failed to create room checklist" });
    }
  });

  app.patch("/api/room-checklists/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid checklist ID' });
      }

      const checklist = await storage.updateRoomChecklist(id, req.body);
      res.json(checklist);
    } catch (error) {
      console.error("Error updating room checklist:", error);
      res.status(500).json({ message: "Failed to update room checklist" });
    }
  });

  app.delete("/api/room-checklists/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid checklist ID' });
      }

      await storage.deleteRoomChecklist(id);
      res.json({ message: 'Room checklist deleted successfully' });
    } catch (error) {
      console.error('Error deleting room checklist:', error);
      res.status(500).json({ message: 'Failed to delete room checklist' });
    }
  });

  // Property access items routes
  app.get("/api/properties/:propertyId/access", isAuthenticated, async (req, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: 'Invalid property ID' });
      }
      
      const items = await storage.getPropertyAccessItems(propertyId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching property access items:", error);
      res.status(500).json({ message: "Failed to fetch property access items" });
    }
  });

  app.post("/api/property-access", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID found" });
      }
      
      // Add createdById BEFORE validation
      const validatedData = insertPropertyAccessItemSchema.parse({
        ...req.body,
        createdById: userId
      });
      
      const item = await storage.createPropertyAccessItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating property access item:", error);
      res.status(500).json({ message: "Failed to create property access item" });
    }
  });

  app.patch("/api/property-access/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid access item ID' });
      }

      const item = await storage.updatePropertyAccessItem(id, req.body);
      res.json(item);
    } catch (error) {
      console.error("Error updating property access item:", error);
      res.status(500).json({ message: "Failed to update property access item" });
    }
  });

  app.delete("/api/property-access/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid access item ID' });
      }

      await storage.deletePropertyAccessItem(id);
      res.json({ message: 'Property access item deleted successfully' });
    } catch (error) {
      console.error('Error deleting property access item:', error);
      res.status(500).json({ message: 'Failed to delete property access item' });
    }
  });

  // Property notes routes
  app.get("/api/properties/:propertyId/notes", isAuthenticated, async (req, res) => {
    try {
      const propertyId = req.params.propertyId;
      if (!propertyId) {
        return res.status(400).json({ message: 'Invalid property ID' });
      }
      
      const notes = await storage.getPropertyNotes(propertyId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching property notes:", error);
      res.status(500).json({ message: "Failed to fetch property notes" });
    }
  });

  // Property contacts routes
  app.get("/api/properties/:propertyId/contacts", isAuthenticated, async (req, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: 'Invalid property ID' });
      }
      
      const contacts = await storage.getContactsByProperty(propertyId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching property contacts:", error);
      res.status(500).json({ message: "Failed to fetch property contacts" });
    }
  });

  // Vehicle routes
  app.get("/api/properties/:propertyId/vehicles", isAuthenticated, async (req, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: 'Invalid property ID' });
      }
      
      const vehicles = await storage.getVehicles(propertyId);
      res.json(vehicles);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      res.status(500).json({ message: "Failed to fetch vehicles" });
    }
  });

  app.get("/api/vehicles/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid vehicle ID' });
      }
      
      const vehicle = await storage.getVehicle(id);
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      res.json(vehicle);
    } catch (error) {
      console.error("Error fetching vehicle:", error);
      res.status(500).json({ message: "Failed to fetch vehicle" });
    }
  });

  app.post("/api/vehicles", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(validatedData);
      res.status(201).json(vehicle);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating vehicle:", error);
      res.status(500).json({ message: "Failed to create vehicle" });
    }
  });

  app.patch("/api/vehicles/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid vehicle ID' });
      }

      // Convert date strings to Date objects for timestamp fields
      const vehicleData = { ...req.body };
      if (vehicleData.registrationDate) {
        vehicleData.registrationDate = new Date(vehicleData.registrationDate);
      }
      if (vehicleData.registrationDueDate) {
        vehicleData.registrationDueDate = new Date(vehicleData.registrationDueDate);
      }

      const vehicle = await storage.updateVehicle(id, vehicleData);
      res.json(vehicle);
    } catch (error) {
      console.error("Error updating vehicle:", error);
      res.status(500).json({ message: "Failed to update vehicle" });
    }
  });

  app.delete("/api/vehicles/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid vehicle ID' });
      }

      await storage.deleteVehicle(id);
      res.json({ message: 'Vehicle deleted successfully' });
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      res.status(500).json({ message: 'Failed to delete vehicle' });
    }
  });

  // Vehicle maintenance routes
  app.get("/api/vehicles/:vehicleId/maintenance", isAuthenticated, async (req, res) => {
    try {
      const vehicleId = parseInt(req.params.vehicleId);
      if (isNaN(vehicleId)) {
        return res.status(400).json({ message: 'Invalid vehicle ID' });
      }
      
      const maintenance = await storage.getVehicleMaintenance(vehicleId);
      res.json(maintenance);
    } catch (error) {
      console.error("Error fetching vehicle maintenance:", error);
      res.status(500).json({ message: "Failed to fetch vehicle maintenance" });
    }
  });

  app.post("/api/vehicle-maintenance", isAuthenticated, async (req: any, res) => {
    try {
      // Extract userId from session/claims with fallback
      const userId = req.user?.claims?.sub || req.user?.sub || req.user?.id;
      
      console.log('[VEHICLE MAINTENANCE] Creating maintenance record, userId:', userId, 'user object:', JSON.stringify(req.user));
      
      if (!userId) {
        console.error('[VEHICLE MAINTENANCE] No user ID found in request');
        return res.status(401).json({ message: "User authentication failed" });
      }
      
      // Convert date strings to Date objects
      const dataWithDates = {
        ...req.body,
        serviceDate: req.body.serviceDate ? new Date(req.body.serviceDate) : null,
        nextDueDate: req.body.nextDueDate ? new Date(req.body.nextDueDate) : null,
      };
      
      const validatedData = insertVehicleMaintenanceSchema.parse(dataWithDates);
      const maintenance = await storage.createVehicleMaintenance({
        ...validatedData,
        createdById: userId,
      });
      res.status(201).json(maintenance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[VEHICLE MAINTENANCE] Validation error:', error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating vehicle maintenance:", error);
      res.status(500).json({ message: "Failed to create vehicle maintenance" });
    }
  });

  app.patch("/api/vehicle-maintenance/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid maintenance ID' });
      }

      // Convert date strings to Date objects if present
      const dataWithDates = {
        ...req.body,
        serviceDate: req.body.serviceDate ? new Date(req.body.serviceDate) : undefined,
        nextDueDate: req.body.nextDueDate ? new Date(req.body.nextDueDate) : undefined,
      };

      const maintenance = await storage.updateVehicleMaintenance(id, dataWithDates);
      res.json(maintenance);
    } catch (error) {
      console.error("Error updating vehicle maintenance:", error);
      res.status(500).json({ message: "Failed to update vehicle maintenance" });
    }
  });

  app.delete("/api/vehicle-maintenance/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid maintenance ID' });
      }

      await storage.deleteVehicleMaintenance(id);
      res.json({ message: 'Vehicle maintenance deleted successfully' });
    } catch (error) {
      console.error('Error deleting vehicle maintenance:', error);
      res.status(500).json({ message: 'Failed to delete vehicle maintenance' });
    }
  });

  // Vehicle notes routes
  app.get("/api/vehicles/:vehicleId/notes", isAuthenticated, async (req, res) => {
    try {
      const vehicleId = parseInt(req.params.vehicleId);
      if (isNaN(vehicleId)) {
        return res.status(400).json({ message: 'Invalid vehicle ID' });
      }
      
      const notes = await storage.getVehicleNotes(vehicleId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching vehicle notes:", error);
      res.status(500).json({ message: "Failed to fetch vehicle notes" });
    }
  });

  app.post("/api/vehicle-notes", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertVehicleNoteSchema.parse(req.body);
      const note = await storage.createVehicleNote(validatedData);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating vehicle note:", error);
      res.status(500).json({ message: "Failed to create vehicle note" });
    }
  });

  app.patch("/api/vehicle-notes/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid note ID' });
      }

      const note = await storage.updateVehicleNote(id, req.body);
      res.json(note);
    } catch (error) {
      console.error("Error updating vehicle note:", error);
      res.status(500).json({ message: "Failed to update vehicle note" });
    }
  });

  app.delete("/api/vehicle-notes/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid note ID' });
      }

      await storage.deleteVehicleNote(id);
      res.json({ message: 'Vehicle note deleted successfully' });
    } catch (error) {
      console.error('Error deleting vehicle note:', error);
      res.status(500).json({ message: 'Failed to delete vehicle note' });
    }
  });

  // Vehicle photos routes
  app.get("/api/vehicles/:vehicleId/photos", isAuthenticated, async (req, res) => {
    try {
      const vehicleId = parseInt(req.params.vehicleId);
      if (isNaN(vehicleId)) {
        return res.status(400).json({ message: 'Invalid vehicle ID' });
      }
      
      const photos = await storage.getVehiclePhotos(vehicleId);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching vehicle photos:", error);
      res.status(500).json({ message: "Failed to fetch vehicle photos" });
    }
  });

  app.post("/api/vehicle-photos", isAuthenticated, upload.single('photo'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No photo file provided" });
      }

      const { vehicleId, category, description } = req.body;
      
      if (!vehicleId) {
        return res.status(400).json({ message: "Vehicle ID is required" });
      }

      const userId = req.user.claims.sub;
      const photoData = {
        vehicleId: parseInt(vehicleId),
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: `/uploads/photos/${req.file.filename}`,
        category: category || 'general',
        description: description || '',
        uploadedById: userId,
      };

      const photo = await storage.createVehiclePhoto(photoData);
      
      // Return photo with accessible URL
      res.status(201).json({
        ...photo,
        photoUrl: `/uploads/photos/${req.file.filename}`
      });
    } catch (error) {
      console.error("Error uploading vehicle photo:", error);
      // Clean up uploaded file if database save failed
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ message: "Failed to upload vehicle photo" });
    }
  });

  app.delete("/api/vehicle-photos/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid photo ID' });
      }

      await storage.deleteVehiclePhoto(id);
      res.json({ message: 'Vehicle photo deleted successfully' });
    } catch (error) {
      console.error('Error deleting vehicle photo:', error);
      res.status(500).json({ message: 'Failed to delete vehicle photo' });
    }
  });

  // Task routes
  app.get("/api/tasks", isAuthenticated, async (req, res) => {
    try {
      const { assignedTo, limit, showArchived } = req.query;
      let tasks = await storage.getTasks();
      
      console.log(`[TASKS DEBUG] Total tasks: ${tasks.length}, showArchived: ${showArchived}, archived count: ${tasks.filter(t => t.isArchived).length}`);
      
      // Exclude archived tasks by default
      if (showArchived !== 'true') {
        tasks = tasks.filter(task => !task.isArchived);
        console.log(`[TASKS DEBUG] After filtering archived: ${tasks.length} tasks`);
      } else {
        console.log(`[TASKS DEBUG] Including archived tasks: ${tasks.length} total`);
      }
      
      // Filter by assignedTo if provided
      if (assignedTo) {
        tasks = tasks.filter(task => task.assignedToId === assignedTo);
      }
      
      // Apply limit if provided
      if (limit) {
        const limitNum = parseInt(limit as string);
        if (!isNaN(limitNum)) {
          tasks = tasks.slice(0, limitNum);
        }
      }
      
      console.log(`[TASKS DEBUG] Final task count: ${tasks.length}`);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Get task templates (tasks marked as templates)
  app.get("/api/tasks/templates", isAuthenticated, async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      const templates = tasks.filter(task => task.isTemplate && !task.isArchived);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching task templates:", error);
      res.status(500).json({ message: "Failed to fetch task templates" });
    }
  });

  app.get("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertTaskSchema.parse(req.body);
      
      // Check for out-of-office conflicts
      const conflict = await checkOutOfOfficeConflict(
        validatedData.assignedToId,
        validatedData.dueDate
      );

      const task = await storage.createTask({
        ...validatedData,
        assignedById: userId,
      });

      // Fire webhook event for task creation
      const taskOrgId = req.user?.claims?.orgId || req.user?.orgId;
      if (taskOrgId) {
        dispatchWebhookEvent(taskOrgId, "task.created", { task }).catch(() => {});
      }

      // If this is a recurring task, automatically generate instances
      let generatedInstances: any[] = [];
      if (task.recurrenceRule) {
        try {
          const checklistItems = await storage.getTaskChecklistItems(task.id);
          const { generateTaskInstances } = await import('./taskInstanceGenerator');
          const instances = await generateTaskInstances({
            templateTask: task,
            checklistItems,
            lookAheadMonths: 12, // Generate 12 months of instances by default
          });
          generatedInstances = instances.map(i => ({
            taskId: i.task.id,
            dueDate: i.task.dueDate,
          }));
        } catch (genError) {
          console.error("Error auto-generating task instances:", genError);
          // Don't fail the whole request if instance generation fails
        }
      }

      // Send email notification if conflict exists and user has supervisor
      if (conflict.hasConflict && conflict.assignedUser?.supervisorId) {
        const supervisor = await storage.getUser(conflict.assignedUser.supervisorId);
        if (supervisor?.email) {
          // Send notification asynchronously (don't await to avoid blocking)
          sendOOOConflictNotification(
            supervisor.email,
            `${supervisor.firstName} ${supervisor.lastName}`,
            `${conflict.assignedUser.firstName} ${conflict.assignedUser.lastName}`,
            task.title,
            task.dueDate!,
            conflict.activeOOO!.startDate,
            conflict.activeOOO!.endDate,
            conflict.activeOOO!.reason
          ).catch(error => console.error("Failed to send OOO notification:", error));
        }
      }

      // Return task with conflict information and generated instances
      res.status(201).json({
        ...task,
        oooConflict: conflict.hasConflict ? {
          hasConflict: true,
          assignedUserName: `${conflict.assignedUser?.firstName} ${conflict.assignedUser?.lastName}`,
          supervisorId: conflict.assignedUser?.supervisorId,
          oooStartDate: conflict.activeOOO?.startDate,
          oooEndDate: conflict.activeOOO?.endDate,
          oooReason: conflict.activeOOO?.reason,
        } : null,
        generatedInstances: generatedInstances.length > 0 ? {
          count: generatedInstances.length,
          instances: generatedInstances,
        } : null,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  // Bulk create tasks for multiple properties
  app.post("/api/tasks/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { propertyIds, title, description, priority, status, assignedToId, dueDate, category } = req.body;

      if (!propertyIds || !Array.isArray(propertyIds) || propertyIds.length === 0) {
        return res.status(400).json({ message: "Property IDs array is required" });
      }

      if (!title) {
        return res.status(400).json({ message: "Task title is required" });
      }

      const createdTasks = [];

      for (const propertyId of propertyIds) {
        const taskData = {
          title,
          description: description || null,
          priority: priority || "normal",
          status: status || "pending",
          propertyId: parseInt(propertyId),
          assignedToId: assignedToId || null,
          assignedById: userId,
          dueDate: dueDate ? new Date(dueDate) : null,
          category: category || null,
          orgId: req.user.orgId,
          isArchived: false,
        };

        const task = await storage.createTask(taskData, userId);
        createdTasks.push(task);
      }

      res.json({ 
        message: `Successfully created ${createdTasks.length} tasks`,
        tasks: createdTasks 
      });
    } catch (error: any) {
      console.error("Error creating bulk tasks:", error);
      res.status(500).json({ message: "Failed to create bulk tasks" });
    }
  });

  // Generate task instances from a recurring task template
  app.post("/api/tasks/:id/generate-instances", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { lookAheadMonths = 12 } = req.body;

      // Get the template task
      const templateTask = await storage.getTask(taskId);
      if (!templateTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (!templateTask.recurrenceRule) {
        return res.status(400).json({ message: "Task must have a recurrence rule to generate instances" });
      }

      // Get checklist items for the template
      const checklistItems = await storage.getTaskChecklistItems(taskId);

      // Generate instances
      const { generateTaskInstances } = await import('./taskInstanceGenerator');
      const instances = await generateTaskInstances({
        templateTask,
        checklistItems,
        lookAheadMonths,
      });

      res.json({
        message: `Generated ${instances.length} task instances`,
        count: instances.length,
        instances: instances.map(i => ({
          taskId: i.task.id,
          dueDate: i.task.dueDate,
          checklistItemCount: i.checklistItems.length,
        })),
      });
    } catch (error) {
      console.error("Error generating task instances:", error);
      res.status(500).json({ message: "Failed to generate task instances" });
    }
  });

  // Get all instances for a template task
  app.get("/api/tasks/:id/instances", isAuthenticated, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const { getTaskInstances } = await import('./taskInstanceGenerator');
      const instances = await getTaskInstances(templateId);
      res.json(instances);
    } catch (error) {
      console.error("Error fetching task instances:", error);
      res.status(500).json({ message: "Failed to fetch task instances" });
    }
  });

  // Get the template task for an instance
  app.get("/api/tasks/:id/template", isAuthenticated, async (req, res) => {
    try {
      const instanceId = parseInt(req.params.id);
      const { getTemplateTask } = await import('./taskInstanceGenerator');
      const template = await getTemplateTask(instanceId);
      
      if (!template) {
        return res.status(404).json({ message: "Template task not found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching template task:", error);
      res.status(500).json({ message: "Failed to fetch template task" });
    }
  });

  app.patch("/api/tasks/:id/assign", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { assignedToId } = req.body;
      const assignedById = req.user.claims.sub;
      
      const task = await storage.assignTask(taskId, assignedToId, assignedById);
      
      // Check for out-of-office conflicts
      const conflict = await checkOutOfOfficeConflict(assignedToId, task.dueDate);

      // Send email notification if conflict exists and user has supervisor
      if (conflict.hasConflict && conflict.assignedUser?.supervisorId) {
        const supervisor = await storage.getUser(conflict.assignedUser.supervisorId);
        if (supervisor?.email) {
          sendOOOConflictNotification(
            supervisor.email,
            `${supervisor.firstName} ${supervisor.lastName}`,
            `${conflict.assignedUser.firstName} ${conflict.assignedUser.lastName}`,
            task.title,
            task.dueDate!,
            conflict.activeOOO!.startDate,
            conflict.activeOOO!.endDate,
            conflict.activeOOO!.reason
          ).catch(error => console.error("Failed to send OOO notification:", error));
        }
      }

      // Return task with conflict information
      res.json({
        ...task,
        oooConflict: conflict.hasConflict ? {
          hasConflict: true,
          assignedUserName: `${conflict.assignedUser?.firstName} ${conflict.assignedUser?.lastName}`,
          supervisorId: conflict.assignedUser?.supervisorId,
          oooStartDate: conflict.activeOOO?.startDate,
          oooEndDate: conflict.activeOOO?.endDate,
          oooReason: conflict.activeOOO?.reason,
        } : null,
      });
    } catch (error) {
      console.error("Error assigning task:", error);
      res.status(500).json({ message: "Failed to assign task" });
    }
  });

  app.patch("/api/tasks/:id", isAuthenticated, async (req, res) => {
    const taskId = parseInt(req.params.id);
    try {
      const updateData = req.body;
      console.log("Updating task:", taskId, "with data:", updateData);
      
      if (isNaN(taskId)) {
        return res.status(400).json({ 
          message: "Invalid task ID", 
          code: "INVALID_TASK_ID" 
        });
      }
      
      // Convert dueDate string to Date object if provided
      if (updateData.dueDate && typeof updateData.dueDate === 'string') {
        updateData.dueDate = new Date(updateData.dueDate);
        console.log("Converted dueDate to:", updateData.dueDate);
      }
      
      const task = await storage.updateTask(taskId, updateData);

      // Fire webhook event for task update
      const updateTaskOrgId = req.user?.claims?.orgId || req.user?.orgId;
      if (updateTaskOrgId) {
        dispatchWebhookEvent(updateTaskOrgId, "task.updated", { task }).catch(() => {});
      }
      
      // Check for out-of-office conflicts if assignee or due date changed
      let conflict = { hasConflict: false, activeOOO: null, assignedUser: null };
      if (updateData.assignedToId || updateData.dueDate) {
        const assignedToId = updateData.assignedToId || task.assignedToId;
        const dueDate = updateData.dueDate || task.dueDate;
        conflict = await checkOutOfOfficeConflict(assignedToId, dueDate);

        // Send email notification if conflict exists and user has supervisor
        if (conflict.hasConflict && conflict.assignedUser?.supervisorId) {
          const supervisor = await storage.getUser(conflict.assignedUser.supervisorId);
          if (supervisor?.email) {
            sendOOOConflictNotification(
              supervisor.email,
              `${supervisor.firstName} ${supervisor.lastName}`,
              `${conflict.assignedUser.firstName} ${conflict.assignedUser.lastName}`,
              task.title,
              dueDate!,
              conflict.activeOOO!.startDate,
              conflict.activeOOO!.endDate,
              conflict.activeOOO!.reason
            ).catch(error => console.error("Failed to send OOO notification:", error));
          }
        }
      }

      // Return task with conflict information
      res.json({
        ...task,
        oooConflict: conflict.hasConflict ? {
          hasConflict: true,
          assignedUserName: `${conflict.assignedUser?.firstName} ${conflict.assignedUser?.lastName}`,
          supervisorId: conflict.assignedUser?.supervisorId,
          oooStartDate: conflict.activeOOO?.startDate,
          oooEndDate: conflict.activeOOO?.endDate,
          oooReason: conflict.activeOOO?.reason,
        } : null,
      });
    } catch (error) {
      console.error("Error updating task (ID:", taskId, "):", error);
      if (error instanceof Error && error.message?.includes('constraint')) {
        return res.status(400).json({ 
          message: "Database constraint violation", 
          code: "CONSTRAINT_VIOLATION",
          details: error.message 
        });
      }
      res.status(500).json({ 
        message: "Failed to update task", 
        code: "UPDATE_TASK_ERROR",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.patch("/api/tasks/:id/complete", isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.completeTask(taskId);

      // Fire webhook event for task completion
      const completeOrgId = req.user?.claims?.orgId || req.user?.orgId;
      if (completeOrgId) {
        dispatchWebhookEvent(completeOrgId, "task.completed", { task }).catch(() => {});
        // Also fire inspection.completed when the completed task is categorized as an inspection
        if (task.category === "inspection") {
          dispatchWebhookEvent(completeOrgId, "inspection.completed", { task }).catch(() => {});
        }
      }

      res.json(task);
    } catch (error) {
      console.error("Error completing task:", error);
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  app.patch("/api/tasks/:id/archive", isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const userId = req.user!.sub;
      const task = await storage.archiveTask(taskId, userId);
      res.json(task);
    } catch (error) {
      console.error("Error archiving task:", error);
      res.status(500).json({ message: "Failed to archive task" });
    }
  });

  app.patch("/api/tasks/:id/unarchive", isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const userId = req.user!.sub;
      const task = await storage.unarchiveTask(taskId, userId);
      res.json(task);
    } catch (error) {
      console.error("Error unarchiving task:", error);
      res.status(500).json({ message: "Failed to unarchive task" });
    }
  });

  app.delete("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const userId = req.user?.claims?.sub;
      await storage.deleteTask(taskId, userId);
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Task comment routes
  app.get("/api/tasks/:taskId/comments", isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const comments = await storage.getTaskComments(taskId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching task comments:", error);
      res.status(500).json({ message: "Failed to fetch task comments" });
    }
  });

  app.post("/api/tasks/:taskId/comments", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const userId = req.user.claims.sub;
      const { text } = req.body;

      if (!text || !text.trim()) {
        return res.status(400).json({ message: "Comment text is required" });
      }

      const comment = await storage.createTaskComment({
        taskId,
        userId,
        text: text.trim(),
      });

      // Fetch the comment with user details
      const comments = await storage.getTaskComments(taskId);
      const newComment = comments.find(c => c.id === comment.id);
      
      res.json(newComment);
    } catch (error) {
      console.error("Error creating task comment:", error);
      res.status(500).json({ message: "Failed to create task comment" });
    }
  });

  app.patch("/api/tasks/:taskId/comments/:commentId", isAuthenticated, async (req: any, res) => {
    try {
      const commentId = parseInt(req.params.commentId);
      const userId = req.user.claims.sub;
      const { text } = req.body;

      if (!text || !text.trim()) {
        return res.status(400).json({ message: "Comment text is required" });
      }

      const updatedComment = await storage.updateTaskComment(commentId, userId, text.trim());
      res.json(updatedComment);
    } catch (error) {
      console.error("Error updating task comment:", error);
      res.status(500).json({ message: "Failed to update task comment" });
    }
  });

  app.delete("/api/tasks/:taskId/comments/:commentId", isAuthenticated, async (req: any, res) => {
    try {
      const commentId = parseInt(req.params.commentId);
      const userId = req.user.claims.sub;

      await storage.deleteTaskComment(commentId, userId);
      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Error deleting task comment:", error);
      res.status(500).json({ message: "Failed to delete task comment" });
    }
  });

  app.post("/api/tasks/check-conflicts", isAuthenticated, async (req, res) => {
    try {
      const { assignedUserId, dueDate, timeEstimate, excludeTaskId } = req.body;
      const conflicts = await storage.checkTaskConflicts(assignedUserId, dueDate, timeEstimate, excludeTaskId);
      res.json(conflicts);
    } catch (error) {
      console.error("Error checking task conflicts:", error);
      res.status(500).json({ message: "Failed to check task conflicts" });
    }
  });

  // Time tracking routes
  app.get("/api/time-entries", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const orgId = user.claims?.orgId || user.orgId;
      
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID is required" });
      }

      const filters: { userId?: string; propertyId?: number; taskId?: number; startDate?: string; endDate?: string } = {};
      if (typeof req.query.userId === 'string') filters.userId = req.query.userId;
      if (typeof req.query.propertyId === 'string') {
        const n = parseInt(req.query.propertyId, 10);
        if (Number.isFinite(n)) filters.propertyId = n;
      }
      if (typeof req.query.taskId === 'string') {
        const n = parseInt(req.query.taskId, 10);
        if (Number.isFinite(n)) filters.taskId = n;
      }
      if (typeof req.query.startDate === 'string') filters.startDate = req.query.startDate;
      // Make endDate inclusive of the full selected day to match the report endpoint.
      if (typeof req.query.endDate === 'string') filters.endDate = `${req.query.endDate}T23:59:59.999Z`;

      const entries = await storage.getTimeEntries(orgId, filters);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching time entries:", error);
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  // PDF Mockup Gallery — admin-only sample PDFs for design / demo / preview.
  // Reuses the production PDF generators (generateInvoicePDF for invoice + consolidated,
  // buildInspectionReportPdf for inspection) with sample data and watermark=true.
  app.get("/api/pdf-mockups/:type", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const type = String(req.params.type);
      const { getSampleInvoiceArgs, getSampleInspectionArgs } = await import("./pdfMockData");
      const { generateInvoicePDF } = await import("./invoiceUtils.js");

      let buf: Buffer;
      if (type === "invoice") {
        const a = getSampleInvoiceArgs(false);
        buf = await generateInvoicePDF(a.invoice, a.client, a.org, { watermark: true });
      } else if (type === "consolidated") {
        const a = getSampleInvoiceArgs(true);
        buf = await generateInvoicePDF(a.invoice, a.client, a.org, { watermark: true });
      } else if (type === "inspection") {
        const a = getSampleInspectionArgs();
        buf = await buildInspectionReportPdf(a.task, a.checklistItems, { watermark: true });
      } else if (type === "property") {
        const { generateSamplePropertyReportPdf } = await import("./pdfGenerators/samplePropertyReportPdf");
        buf = await generateSamplePropertyReportPdf();
      } else if (type === "time") {
        const { generateSampleTimeReportPdf } = await import("./pdfGenerators/sampleTimeReportPdf");
        buf = await generateSampleTimeReportPdf();
      } else {
        return res.status(404).json({ message: `Unknown mockup type: ${type}` });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="sample-${type}.pdf"`);
      res.send(buf);
    } catch (error) {
      console.error("Error generating mockup PDF:", error);
      res.status(500).json({ message: "Failed to generate mockup PDF" });
    }
  });

  app.get("/api/time-entries/report", isAuthenticated, requireFeatureFlag("advanced_reporting"), async (req: any, res) => {
    try {
      const user = req.user;
      const userId = user.claims?.sub || user.id;
      const dbUser = userId ? await storage.getUser(userId) : null;
      const orgId = dbUser?.orgId || user.claims?.orgId || user.orgId;
      const role = dbUser?.role || user.claims?.role;

      if (!orgId) {
        return res.status(400).json({ message: "Organization ID is required" });
      }

      if (role !== 'admin' && role !== 'supervisor') {
        return res.status(403).json({ message: "Only admins and supervisors can view time reports" });
      }

      const groupBy: "user" | "property" = req.query.groupBy === 'property' ? 'property' : 'user';
      const billableFilter = typeof req.query.billable === 'string' ? req.query.billable : undefined;

      const propertyIdRaw = typeof req.query.propertyId === 'string' ? parseInt(req.query.propertyId, 10) : undefined;
      const taskIdRaw = typeof req.query.taskId === 'string' ? parseInt(req.query.taskId, 10) : undefined;
      const startDateRaw = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
      const endDateRaw = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;

      const filters: { userId?: string; propertyId?: number; taskId?: number; startDate?: string; endDate?: string } = {};
      if (typeof req.query.userId === 'string') filters.userId = req.query.userId;
      if (propertyIdRaw !== undefined && Number.isFinite(propertyIdRaw)) filters.propertyId = propertyIdRaw;
      if (taskIdRaw !== undefined && Number.isFinite(taskIdRaw)) filters.taskId = taskIdRaw;
      if (startDateRaw) filters.startDate = startDateRaw;
      // Make endDate inclusive of the full selected day (storage compares clockIn <= endDate)
      if (endDateRaw) filters.endDate = `${endDateRaw}T23:59:59.999Z`;

      const allEntries: TimeEntry[] = await storage.getTimeEntries(orgId, filters);

      const entries = allEntries.filter((e) => {
        if (billableFilter === 'billable') return e.isBillable === true;
        if (billableFilter === 'nonbillable') return e.isBillable === false;
        return true;
      });

      const [allUsers, allPropertiesGlobal] = await Promise.all([
        storage.getUsersByOrg(orgId),
        storage.getProperties(true),
      ]);
      // Strict multi-tenant boundary: only resolve labels for this org's properties.
      const allProperties = allPropertiesGlobal.filter((p) => p.orgId === orgId);
      const userMap = new Map<string, string>(
        allUsers.map((u) => [u.id, `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || u.id])
      );
      const propertyMap = new Map<number, string>(
        allProperties.map((p) => [p.id, p.name])
      );

      const computeHours = (entry: TimeEntry): number => {
        const start = new Date(entry.clockIn).getTime();
        const end = entry.clockOut ? new Date(entry.clockOut).getTime() : Date.now();
        const ms = Math.max(0, end - start);
        return ms / (1000 * 60 * 60);
      };

      type Bucket = {
        key: string;
        label: string;
        totalHours: number;
        billableHours: number;
        nonBillableHours: number;
        billableAmountCents: number;
        entryCount: number;
        breakdown: Map<string, Bucket>;
      };

      const makeBucket = (key: string, label: string): Bucket => ({
        key, label,
        totalHours: 0, billableHours: 0, nonBillableHours: 0,
        billableAmountCents: 0, entryCount: 0, breakdown: new Map(),
      });

      const groups = new Map<string, Bucket>();
      const activeUserIds = new Set<string>();
      const activePropertyIds = new Set<string>();
      let totalHours = 0, billableHours = 0, nonBillableHours = 0, billableAmountCents = 0;

      for (const entry of entries) {
        const hours = computeHours(entry);
        const isBillable = entry.isBillable !== false;
        const amountCents = isBillable && entry.billableRateCents
          ? Math.round((entry.billableRateCents) * hours)
          : 0;

        totalHours += hours;
        if (isBillable) billableHours += hours; else nonBillableHours += hours;
        billableAmountCents += amountCents;
        activeUserIds.add(entry.userId);
        if (entry.propertyId) activePropertyIds.add(String(entry.propertyId));

        const primaryKey = groupBy === 'user'
          ? (entry.userId || 'unassigned')
          : (entry.propertyId ? String(entry.propertyId) : 'unassigned');
        const primaryLabel = groupBy === 'user'
          ? (userMap.get(entry.userId) || 'Unknown User')
          : (entry.propertyId ? (propertyMap.get(entry.propertyId) || `Property #${entry.propertyId}`) : '(No Property)');

        let g = groups.get(primaryKey);
        if (!g) { g = makeBucket(primaryKey, primaryLabel); groups.set(primaryKey, g); }
        g.totalHours += hours;
        if (isBillable) g.billableHours += hours; else g.nonBillableHours += hours;
        g.billableAmountCents += amountCents;
        g.entryCount += 1;

        const subKey = groupBy === 'user'
          ? (entry.propertyId ? String(entry.propertyId) : 'unassigned')
          : (entry.userId || 'unassigned');
        const subLabel = groupBy === 'user'
          ? (entry.propertyId ? (propertyMap.get(entry.propertyId) || `Property #${entry.propertyId}`) : '(No Property)')
          : (userMap.get(entry.userId) || 'Unknown User');

        let sub = g.breakdown.get(subKey);
        if (!sub) { sub = makeBucket(subKey, subLabel); g.breakdown.set(subKey, sub); }
        sub.totalHours += hours;
        if (isBillable) sub.billableHours += hours; else sub.nonBillableHours += hours;
        sub.billableAmountCents += amountCents;
        sub.entryCount += 1;
      }

      const serializeBucket = (b: Bucket) => ({
        key: b.key,
        label: b.label,
        totalHours: Number(b.totalHours.toFixed(2)),
        billableHours: Number(b.billableHours.toFixed(2)),
        nonBillableHours: Number(b.nonBillableHours.toFixed(2)),
        billableAmountCents: b.billableAmountCents,
        entryCount: b.entryCount,
      });

      const result = {
        groupBy,
        totals: {
          totalHours: Number(totalHours.toFixed(2)),
          billableHours: Number(billableHours.toFixed(2)),
          nonBillableHours: Number(nonBillableHours.toFixed(2)),
          billableAmountCents,
          activeUsers: activeUserIds.size,
          activeProperties: activePropertyIds.size,
          entryCount: entries.length,
        },
        groups: Array.from(groups.values())
          .sort((a, b) => b.totalHours - a.totalHours)
          .map((g) => ({
            ...serializeBucket(g),
            breakdown: Array.from(g.breakdown.values())
              .sort((a, b) => b.totalHours - a.totalHours)
              .map(serializeBucket),
          })),
      };

      res.json(result);
    } catch (error) {
      console.error("Error generating time report:", error);
      res.status(500).json({ message: "Failed to generate time report" });
    }
  });

  app.get("/api/time-entries/active", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entry = await storage.getActiveTimeEntry(userId);
      res.json(entry || null);
    } catch (error) {
      console.error("Error fetching active time entry:", error);
      res.status(500).json({ message: "Failed to fetch active time entry" });
    }
  });

  app.get("/api/time-entries/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const entry = await storage.getTimeEntry(id);
      
      if (!entry) {
        return res.status(404).json({ message: "Time entry not found" });
      }
      
      res.json(entry);
    } catch (error) {
      console.error("Error fetching time entry:", error);
      res.status(500).json({ message: "Failed to fetch time entry" });
    }
  });

  app.post("/api/time-entries/clock-in", isAuthenticated, requireFeatureFlag("task_cost_tracking"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = req.user;
      const orgId = user.orgId;
      
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID is required" });
      }

      // Check if user already has an active time entry
      const activeEntry = await storage.getActiveTimeEntry(userId);
      if (activeEntry) {
        return res.status(400).json({ message: "You already have an active time entry. Please clock out first." });
      }

      const { propertyId, taskId, notes } = req.body;

      let billableRate: number | null = null;

      // If taskId is provided, fetch the task's billable rate
      if (taskId) {
        const task = await storage.getTask(parseInt(taskId));
        if (task && task.billableRateCents) {
          billableRate = task.billableRateCents;
        }
      }

      const entryData = {
        userId,
        orgId,
        clockIn: new Date(),
        propertyId: propertyId ? parseInt(propertyId) : null,
        taskId: taskId ? parseInt(taskId) : null,
        notes: notes || null,
        billableRateCents: billableRate,
      };

      const validatedData = insertTimeEntrySchema.parse(entryData);
      const entry = await storage.createTimeEntry(validatedData);
      
      res.status(201).json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error clocking in:", error);
      res.status(500).json({ message: "Failed to clock in" });
    }
  });

  app.post("/api/time-entries/:id/clock-out", isAuthenticated, requireFeatureFlag("task_cost_tracking"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const entry = await storage.getTimeEntry(id);
      if (!entry) {
        return res.status(404).json({ message: "Time entry not found" });
      }
      
      // Verify the entry belongs to the current user
      if (entry.userId !== userId) {
        return res.status(403).json({ message: "You can only clock out your own time entries" });
      }
      
      if (entry.clockOut) {
        return res.status(400).json({ message: "This time entry is already clocked out" });
      }

      const updatedEntry = await storage.clockOut(id, new Date());
      res.json(updatedEntry);
    } catch (error) {
      console.error("Error clocking out:", error);
      res.status(500).json({ message: "Failed to clock out" });
    }
  });

  app.patch("/api/time-entries/:id", isAuthenticated, requireFeatureFlag("task_cost_tracking"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.user;
      const entry = await storage.getTimeEntry(id);
      
      if (!entry) {
        return res.status(404).json({ message: "Time entry not found" });
      }

      // Check if user has permission to fully edit time entries
      const canFullyEdit = user.role === 'admin' || user.role === 'supervisor';

      const updates: any = {};
      
      // Everyone can edit notes and billable rate
      if (req.body.notes !== undefined) updates.notes = req.body.notes;
      if (req.body.billableRateCents !== undefined) updates.billableRateCents = req.body.billableRateCents;

      // Only admins and supervisors can edit all other fields
      if (canFullyEdit) {
        if (req.body.clockIn !== undefined) updates.clockIn = req.body.clockIn;
        if (req.body.clockOut !== undefined) updates.clockOut = req.body.clockOut;
        if (req.body.userId !== undefined) updates.userId = req.body.userId;
        if (req.body.propertyId !== undefined) updates.propertyId = req.body.propertyId ? parseInt(req.body.propertyId) : null;
        if (req.body.taskId !== undefined) updates.taskId = req.body.taskId ? parseInt(req.body.taskId) : null;
      }

      const updatedEntry = await storage.updateTimeEntry(id, updates);
      res.json(updatedEntry);
    } catch (error) {
      console.error("Error updating time entry:", error);
      res.status(500).json({ message: "Failed to update time entry" });
    }
  });

  app.delete("/api/time-entries/:id", isAuthenticated, requireFeatureFlag("task_cost_tracking"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTimeEntry(id);
      res.json({ message: "Time entry deleted successfully" });
    } catch (error) {
      console.error("Error deleting time entry:", error);
      res.status(500).json({ message: "Failed to delete time entry" });
    }
  });

  // Contact routes
  app.get("/api/contacts", isAuthenticated, async (req, res) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const contacts = await storage.getContacts(includeInactive);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.get("/api/contacts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }

      const contact = await storage.getContact(id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      console.error("Error fetching contact:", error);
      res.status(500).json({ message: "Failed to fetch contact" });
    }
  });

  app.post("/api/contacts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgId = req.user?.claims?.orgId || req.user?.orgId || "00000000-0000-0000-0000-000000000000";
      const validatedData = insertContactSchema.parse({ ...req.body, orgId });
      const contact = await storage.createContact(validatedData, userId);

      // Fire webhook event for contact creation
      if (orgId && orgId !== "00000000-0000-0000-0000-000000000000") {
        dispatchWebhookEvent(orgId, "contact.created", { contact }).catch(() => {});
      }

      res.status(201).json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating contact:", error);
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  app.patch("/api/contacts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }

      const updateData = insertContactSchema.partial().parse(req.body);
      const contact = await storage.updateContact(id, updateData);
      res.json(contact);
    } catch (error) {
      console.error("Error updating contact:", error);
      res.status(500).json({ message: "Failed to update contact" });
    }
  });

  // Contact-Property relationship endpoints
  app.get("/api/contacts/:contactId/properties", isAuthenticated, async (req, res) => {
    try {
      const contactId = parseInt(req.params.contactId);
      if (isNaN(contactId)) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }

      const properties = await storage.getContactProperties(contactId);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching contact properties:", error);
      res.status(500).json({ message: "Failed to fetch contact properties" });
    }
  });

  app.post("/api/contacts/:contactId/properties", isAuthenticated, async (req, res) => {
    try {
      const contactId = parseInt(req.params.contactId);
      if (isNaN(contactId)) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }

      const { propertyId, isPrimary, relationship } = req.body;
      if (!propertyId || isNaN(parseInt(propertyId))) {
        return res.status(400).json({ message: "Valid property ID is required" });
      }

      const contactProperty = await storage.linkContactToProperty(
        contactId, 
        parseInt(propertyId), 
        isPrimary || false, 
        relationship
      );
      res.status(201).json(contactProperty);
    } catch (error) {
      console.error("Error linking contact to property:", error);
      res.status(500).json({ message: "Failed to link contact to property" });
    }
  });

  // Delete contact-property relationship by relationship ID
  app.delete("/api/contacts/:contactId/properties/:relationshipId", isAuthenticated, async (req, res) => {
    try {
      const contactId = parseInt(req.params.contactId);
      const relationshipId = parseInt(req.params.relationshipId);
      
      if (isNaN(contactId) || isNaN(relationshipId)) {
        return res.status(400).json({ message: "Invalid contact ID or relationship ID" });
      }

      await storage.deleteContactProperty(relationshipId);
      res.json({ message: "Property unlinked successfully" });
    } catch (error) {
      console.error("Error unlinking contact from property:", error);
      res.status(500).json({ message: "Failed to unlink contact from property" });
    }
  });

  app.patch("/api/contacts/:contactId/properties/:propertyId/primary", isAuthenticated, async (req, res) => {
    try {
      const contactId = parseInt(req.params.contactId);
      const propertyId = parseInt(req.params.propertyId);
      
      if (isNaN(contactId) || isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid contact ID or property ID" });
      }

      await storage.setPrimaryProperty(contactId, propertyId);
      res.json({ message: "Primary property updated successfully" });
    } catch (error) {
      console.error("Error setting primary property:", error);
      res.status(500).json({ message: "Failed to set primary property" });
    }
  });

  // Set primary contact for a property
  app.patch("/api/properties/:propertyId/contacts/:contactId/set-primary", isAuthenticated, async (req, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      const contactId = parseInt(req.params.contactId);
      
      if (isNaN(propertyId) || isNaN(contactId)) {
        return res.status(400).json({ message: "Invalid property ID or contact ID" });
      }

      await storage.setPrimaryContactForProperty(propertyId, contactId);
      res.json({ message: "Primary contact updated successfully" });
    } catch (error) {
      console.error("Error setting primary contact:", error);
      res.status(500).json({ message: "Failed to set primary contact" });
    }
  });

  // Bulk move contacts to a new property
  app.post("/api/contact-properties/bulk-move", isAuthenticated, async (req, res) => {
    try {
      const { contactIds, oldPropertyId, newPropertyId } = req.body;
      
      if (!Array.isArray(contactIds) || contactIds.length === 0) {
        return res.status(400).json({ message: "Contact IDs array is required" });
      }
      
      if (!oldPropertyId || isNaN(parseInt(oldPropertyId))) {
        return res.status(400).json({ message: "Valid origin property ID is required" });
      }
      
      if (!newPropertyId || isNaN(parseInt(newPropertyId))) {
        return res.status(400).json({ message: "Valid destination property ID is required" });
      }

      await storage.bulkMoveContactsToProperty(contactIds, parseInt(oldPropertyId), parseInt(newPropertyId));
      res.json({ message: "Contacts moved successfully" });
    } catch (error) {
      console.error("Error moving contacts:", error);
      res.status(500).json({ message: "Failed to move contacts" });
    }
  });

  // Delete contact
  app.delete("/api/contacts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid contact ID' });
      }

      await storage.deleteContact(id);
      res.json({ message: 'Contact deleted successfully' });
    } catch (error) {
      console.error('Error deleting contact:', error);
      res.status(500).json({ message: 'Failed to delete contact' });
    }
  });

  // Vendor Employee routes
  app.get("/api/vendors/:vendorId/employees", isAuthenticated, async (req, res) => {
    try {
      const vendorId = parseInt(req.params.vendorId);
      if (isNaN(vendorId)) {
        return res.status(400).json({ message: "Invalid vendor ID" });
      }

      const employees = await storage.getVendorEmployees(vendorId);
      res.json(employees);
    } catch (error) {
      console.error("Error fetching vendor employees:", error);
      res.status(500).json({ message: "Failed to fetch vendor employees" });
    }
  });

  app.get("/api/vendor-employees/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }

      const employee = await storage.getVendorEmployee(id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      console.error("Error fetching vendor employee:", error);
      res.status(500).json({ message: "Failed to fetch vendor employee" });
    }
  });

  app.post("/api/vendor-employees", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgId = req.user.orgId || "00000000-0000-0000-0000-000000000000";
      const validatedData = insertVendorEmployeeSchema.parse({ ...req.body, orgId });
      const employee = await storage.createVendorEmployee(validatedData, userId);
      res.status(201).json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating vendor employee:", error);
      res.status(500).json({ message: "Failed to create vendor employee" });
    }
  });

  app.patch("/api/vendor-employees/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }

      const updateData = insertVendorEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateVendorEmployee(id, updateData);
      res.json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating vendor employee:", error);
      res.status(500).json({ message: "Failed to update vendor employee" });
    }
  });

  app.delete("/api/vendor-employees/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }

      await storage.deleteVendorEmployee(id);
      res.json({ message: "Employee deleted successfully" });
    } catch (error) {
      console.error("Error deleting vendor employee:", error);
      res.status(500).json({ message: "Failed to delete vendor employee" });
    }
  });

  // Send email to client
  app.post("/api/send-email", isAuthenticated, async (req: any, res) => {
    try {
      const { recipientEmail, subject, message } = req.body;
      
      if (!recipientEmail || !subject || !message) {
        return res.status(400).json({ message: 'Recipient email, subject, and message are required' });
      }

      const orgId = req.user.claims.orgId;
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }

      // Get organization details for branding
      const org = await storage.getOrganization(orgId);
      const organizationName = org?.name || "Hubify";
      
      // Create a simple HTML email with branding
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
      color: #333333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
      padding: 30px 20px;
      text-align: center;
    }
    .header-text {
      color: #ffffff;
      font-size: 20px;
      font-weight: 600;
      margin: 0;
    }
    .content {
      padding: 40px 30px;
    }
    .message {
      line-height: 1.6;
      color: #333333;
      white-space: pre-wrap;
    }
    .footer {
      background-color: #f5f5f5;
      padding: 20px;
      text-align: center;
      border-top: 1px solid #e0e0e0;
    }
    .footer-text {
      color: #777777;
      font-size: 14px;
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p class="header-text">${organizationName}</p>
    </div>
    <div class="content">
      <div class="message">${message}</div>
    </div>
    <div class="footer">
      <p class="footer-text">This message was sent from ${organizationName}</p>
    </div>
  </div>
</body>
</html>
`;

      await sendGenericEmail({
        to: recipientEmail,
        subject,
        htmlContent,
        fromName: organizationName,
      });

      res.json({ message: 'Email sent successfully' });
    } catch (error: any) {
      console.error('Error sending email:', error);
      res.status(500).json({ message: error.message || 'Failed to send email' });
    }
  });

  // Alert routes with plan-based restrictions
  const ALERT_CHARACTER_LIMITS: Record<string, number> = {
    starter: 100,
    pro: 250,
    grow: 500,
    enterprise: 1000,
  };

  // Get all alerts for an organization
  app.get("/api/alerts", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.user.claims.orgId;
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }

      const filters: any = {};
      if (req.query.type) filters.type = req.query.type;
      if (req.query.entityId) filters.entityId = parseInt(req.query.entityId);
      if (req.query.isActive) filters.isActive = req.query.isActive === 'true';

      const alerts = await storage.getAlerts(orgId, filters);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  // Get alerts for a specific entity
  app.get("/api/alerts/entity/:type/:entityId", isAuthenticated, async (req: any, res) => {
    try {
      const { type, entityId } = req.params;
      const orgId = req.user.claims.orgId;
      const userId = req.user.id;
      const userRole = req.user.claims.role;
      
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }
      
      if (!['client', 'property', 'task'].includes(type)) {
        return res.status(400).json({ message: "Invalid alert type" });
      }
      
      const id = parseInt(entityId);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid entity ID" });
      }

      const alerts = await storage.getAlertsByEntity(orgId, type as "client" | "property" | "task", id, userId, userRole);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching entity alerts:", error);
      res.status(500).json({ message: "Failed to fetch entity alerts" });
    }
  });

  // Get cascaded client alerts for a property
  app.get("/api/alerts/cascaded/property/:propertyId", isAuthenticated, async (req: any, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      const orgId = req.user.claims.orgId;
      
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }
      
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      // Get the property to find its associated client
      const property = await storage.getProperty(propertyId);
      if (!property || property.orgId !== orgId) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Get client alerts for this property's client
      if (property.primaryContact) {
        const alerts = await storage.getAlertsByEntity(orgId, 'client', property.primaryContact);
        return res.json(alerts);
      }

      // No client associated, return empty array
      res.json([]);
    } catch (error) {
      console.error("Error fetching cascaded property alerts:", error);
      res.status(500).json({ message: "Failed to fetch cascaded alerts" });
    }
  });

  // Get cascaded client alerts for a task
  app.get("/api/alerts/cascaded/task/:taskId", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const orgId = req.user.claims.orgId;
      
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }
      
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      // Get the task to find its associated property
      const task = await storage.getTask(taskId);
      if (!task || task.orgId !== orgId) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Get property and then client alerts
      if (task.propertyId) {
        const property = await storage.getProperty(task.propertyId);
        if (property && property.primaryContact) {
          const alerts = await storage.getAlertsByEntity(orgId, 'client', property.primaryContact);
          return res.json(alerts);
        }
      }

      // No property/client associated, return empty array
      res.json([]);
    } catch (error) {
      console.error("Error fetching cascaded task alerts:", error);
      res.status(500).json({ message: "Failed to fetch cascaded alerts" });
    }
  });

  // Create alert with plan validation
  app.post("/api/alerts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgId = req.user.claims.orgId;
      
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }

      // Get org subscription to check plan tier
      const subscription = await storage.getOrgSubscription(orgId);
      const tier = subscription?.tier || 'starter';
      const characterLimit = ALERT_CHARACTER_LIMITS[tier] || ALERT_CHARACTER_LIMITS.starter;

      // Validate message length against plan limit
      if (req.body.message && req.body.message.length > characterLimit) {
        return res.status(400).json({ 
          message: `Alert message exceeds your plan's limit of ${characterLimit} characters. Upgrade your plan for longer alerts.`,
          limit: characterLimit,
          tier: tier
        });
      }

      const validatedData = insertAlertSchema.parse({
        ...req.body,
        orgId,
        createdBy: userId,
      });

      const alert = await storage.createAlert(validatedData);
      res.status(201).json(alert);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating alert:", error);
      res.status(500).json({ message: "Failed to create alert" });
    }
  });

  // Update alert
  app.patch("/api/alerts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid alert ID" });
      }

      const orgId = req.user.claims.orgId;
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }

      // Verify alert exists and belongs to this org
      const existingAlert = await storage.getAlert(id, orgId);
      if (!existingAlert) {
        return res.status(404).json({ message: "Alert not found" });
      }

      // Get org subscription to check plan tier
      const subscription = await storage.getOrgSubscription(orgId);
      const tier = subscription?.tier || 'starter';
      const characterLimit = ALERT_CHARACTER_LIMITS[tier] || ALERT_CHARACTER_LIMITS.starter;

      // Validate message length if being updated
      if (req.body.message && req.body.message.length > characterLimit) {
        return res.status(400).json({ 
          message: `Alert message exceeds your plan's limit of ${characterLimit} characters. Upgrade your plan for longer alerts.`,
          limit: characterLimit,
          tier: tier
        });
      }

      const updatedAlert = await storage.updateAlert(id, orgId, req.body);
      res.json(updatedAlert);
    } catch (error) {
      console.error("Error updating alert:", error);
      res.status(500).json({ message: "Failed to update alert" });
    }
  });

  // Delete alert
  app.delete("/api/alerts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid alert ID" });
      }

      const orgId = req.user.claims.orgId;
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }

      // Verify alert exists and belongs to this org
      const existingAlert = await storage.getAlert(id, orgId);
      if (!existingAlert) {
        return res.status(404).json({ message: "Alert not found" });
      }

      await storage.deleteAlert(id, orgId);
      res.json({ message: "Alert deleted successfully" });
    } catch (error) {
      console.error("Error deleting alert:", error);
      res.status(500).json({ message: "Failed to delete alert" });
    }
  });

  // Get character limit for current plan
  app.get("/api/alerts/limits", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.user.claims.orgId;
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }

      const subscription = await storage.getOrgSubscription(orgId);
      const tier = subscription?.tier || 'starter';
      const characterLimit = ALERT_CHARACTER_LIMITS[tier] || ALERT_CHARACTER_LIMITS.starter;

      res.json({ 
        tier,
        characterLimit,
        allLimits: ALERT_CHARACTER_LIMITS
      });
    } catch (error) {
      console.error("Error fetching alert limits:", error);
      res.status(500).json({ message: "Failed to fetch alert limits" });
    }
  });

  // System Alert routes - for platform-wide or role-based notifications
  
  // Get active system alerts for current user (unacknowledged only)
  app.get("/api/system-alerts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgId = req.user.claims.orgId;
      const userRole = req.user.claims.role;
      
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }

      const alerts = await storage.getSystemAlertsForUser(orgId, userId, userRole);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching system alerts:", error);
      res.status(500).json({ message: "Failed to fetch system alerts" });
    }
  });

  // Get all system alerts (admin only - for management interface)
  app.get("/api/system-alerts/all", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.user.claims.orgId;
      const userRole = req.user.claims.role;
      
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }

      // Only admins can view all system alerts
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Unauthorized: Admin access required" });
      }

      const alerts = await storage.getAllSystemAlerts(orgId);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching all system alerts:", error);
      res.status(500).json({ message: "Failed to fetch system alerts" });
    }
  });

  // Create system alert (admin only)
  app.post("/api/system-alerts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgId = req.user.claims.orgId;
      const userRole = req.user.claims.role;
      
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }

      // Only admins can create system alerts
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Unauthorized: Admin access required" });
      }

      const validatedData = insertSystemAlertSchema.parse({
        ...req.body,
        orgId,
        createdBy: userId,
      });

      const alert = await storage.createSystemAlert(validatedData);
      res.status(201).json(alert);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating system alert:", error);
      res.status(500).json({ message: "Failed to create system alert" });
    }
  });

  // Update system alert (admin only)
  app.patch("/api/system-alerts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid alert ID" });
      }

      const orgId = req.user.claims.orgId;
      const userRole = req.user.claims.role;
      
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }

      // Only admins can update system alerts
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Unauthorized: Admin access required" });
      }

      // Verify alert exists and belongs to this org
      const existingAlert = await storage.getSystemAlert(id, orgId);
      if (!existingAlert) {
        return res.status(404).json({ message: "System alert not found" });
      }

      const updatedAlert = await storage.updateSystemAlert(id, orgId, req.body);
      res.json(updatedAlert);
    } catch (error) {
      console.error("Error updating system alert:", error);
      res.status(500).json({ message: "Failed to update system alert" });
    }
  });

  // Delete system alert (admin only)
  app.delete("/api/system-alerts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid alert ID" });
      }

      const orgId = req.user.claims.orgId;
      const userRole = req.user.claims.role;
      
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }

      // Only admins can delete system alerts
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Unauthorized: Admin access required" });
      }

      // Verify alert exists and belongs to this org
      const existingAlert = await storage.getSystemAlert(id, orgId);
      if (!existingAlert) {
        return res.status(404).json({ message: "System alert not found" });
      }

      await storage.deleteSystemAlert(id, orgId);
      res.json({ message: "System alert deleted successfully" });
    } catch (error) {
      console.error("Error deleting system alert:", error);
      res.status(500).json({ message: "Failed to delete system alert" });
    }
  });

  // Acknowledge system alert
  app.post("/api/system-alerts/:id/acknowledge", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid alert ID" });
      }

      const userId = req.user.claims.sub;
      const orgId = req.user.claims.orgId;
      
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }

      // Verify alert exists and belongs to this org
      const existingAlert = await storage.getSystemAlert(id, orgId);
      if (!existingAlert) {
        return res.status(404).json({ message: "System alert not found" });
      }

      // Check if already acknowledged
      const hasAcknowledged = await storage.hasUserAcknowledgedAlert(id, userId);
      if (hasAcknowledged) {
        return res.status(400).json({ message: "Alert already acknowledged" });
      }

      const acknowledgement = await storage.acknowledgeSystemAlert(id, userId);
      res.status(201).json(acknowledgement);
    } catch (error) {
      console.error("Error acknowledging system alert:", error);
      res.status(500).json({ message: "Failed to acknowledge system alert" });
    }
  });

  // Team message routes
  app.get("/api/team-messages", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getTeamMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching team messages:", error);
      res.status(500).json({ message: "Failed to fetch team messages" });
    }
  });

  app.post("/api/team-messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertTeamMessageSchema.parse({
        ...req.body,
        authorId: userId,
      });
      
      // Create the message
      const message = await storage.createTeamMessage(validatedData);
      
      // Parse @mentions
      const allUsers = await storage.getUsers();
      const mentionedUserIds = parseMentions(validatedData.content, allUsers);
      
      // Get author info (used for both mentions and broadcasts)
      const author = await storage.getUser(userId);
      const authorName = author ? `${author.firstName || ''} ${author.lastName || ''}`.trim() || 'A team member' : 'A team member';
      
      // Create mention records
      if (mentionedUserIds.length > 0) {
        await storage.createMentions(message.id, mentionedUserIds);
        
        // Send email notifications to mentioned users
        for (const mentionedUserId of mentionedUserIds) {
          const mentionedUser = await storage.getUser(mentionedUserId);
          if (mentionedUser && mentionedUser.email) {
            // Check user's notification preferences
            const prefs = await storage.getUserNotificationPreferences(mentionedUserId);
            if (!prefs || prefs.emailOnMention) { // Send email by default
              const mentionedUserName = `${mentionedUser.firstName || ''} ${mentionedUser.lastName || ''}`.trim() || 'there';
              await sendMentionNotification(
                mentionedUser.email,
                mentionedUserName,
                authorName,
                validatedData.content
              );
            }
          }
        }
      }
      
      // Send broadcast emails if emailNotification is enabled
      if (validatedData.emailNotification) {
        for (const user of allUsers) {
          // Skip the author
          if (user.id === userId) continue;
          
          // Skip if user was already mentioned (they'll get the mention email)
          if (mentionedUserIds.includes(user.id)) continue;
          
          if (user.email) {
            // Check user's notification preferences for broadcasts
            const prefs = await storage.getUserNotificationPreferences(user.id);
            // Send email by default (no prefs or emailOnBroadcast is true/undefined)
            // Only skip if emailOnBroadcast is explicitly false
            const shouldSend = !prefs || prefs.emailOnBroadcast === undefined || prefs.emailOnBroadcast === true;
            if (shouldSend) {
              const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'there';
              await sendBroadcastNotification(
                user.email,
                userName,
                authorName,
                validatedData.content
              );
            }
          }
        }
      }
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating team message:", error);
      res.status(500).json({ message: "Failed to create team message" });
    }
  });

  app.put("/api/team-messages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const { content } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Message content is required" });
      }

      const updatedMessage = await storage.updateTeamMessage(
        messageId,
        content.trim(),
        req.user.claims.sub
      );

      if (!updatedMessage) {
        return res.status(404).json({ message: "Message not found or you don't have permission to edit it" });
      }

      // Update @mentions
      const allUsers = await storage.getUsers();
      const mentionedUserIds = parseMentions(content.trim(), allUsers);
      
      // Delete old mentions and create new ones
      await storage.deleteMentions(messageId);
      if (mentionedUserIds.length > 0) {
        await storage.createMentions(messageId, mentionedUserIds);
      }

      res.json(updatedMessage);
    } catch (error) {
      console.error("Error updating team message:", error);
      res.status(500).json({ message: "Failed to update message" });
    }
  });

  app.delete("/api/team-messages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.id);
      
      await storage.deleteTeamMessage(messageId, req.user.claims.sub);
      
      res.json({ message: "Message deleted successfully" });
    } catch (error) {
      console.error("Error deleting team message:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  // Message reaction routes
  app.post("/api/team-messages/:id/reactions", isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const { reaction } = req.body;
      
      if (!reaction || typeof reaction !== 'string') {
        return res.status(400).json({ message: "Reaction is required" });
      }

      const result = await storage.toggleReaction(messageId, req.user.claims.sub, reaction);
      
      res.json(result);
    } catch (error) {
      console.error("Error toggling reaction:", error);
      res.status(500).json({ message: "Failed to toggle reaction" });
    }
  });

  // Reply to message route
  app.post("/api/team-messages/:id/reply", isAuthenticated, async (req: any, res) => {
    try {
      const parentId = parseInt(req.params.id);
      const { content, emailNotification = false } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Reply content is required" });
      }

      const reply = await storage.createTeamMessage({
        content: content.trim(),
        authorId: req.user.claims.sub,
        parentId,
        emailNotification,
      });

      // Parse @mentions in reply
      const allUsers = await storage.getUsers();
      const mentionedUserIds = parseMentions(content.trim(), allUsers);
      
      // Get author info (used for both mentions and broadcasts)
      const author = await storage.getUser(req.user.claims.sub);
      const authorName = author ? `${author.firstName || ''} ${author.lastName || ''}`.trim() || 'A team member' : 'A team member';
      
      // Create mention records
      if (mentionedUserIds.length > 0) {
        await storage.createMentions(reply.id, mentionedUserIds);
        
        // Send email notifications to mentioned users
        for (const mentionedUserId of mentionedUserIds) {
          const mentionedUser = await storage.getUser(mentionedUserId);
          if (mentionedUser && mentionedUser.email) {
            const prefs = await storage.getUserNotificationPreferences(mentionedUserId);
            if (!prefs || prefs.emailOnMention) {
              const mentionedUserName = `${mentionedUser.firstName || ''} ${mentionedUser.lastName || ''}`.trim() || 'there';
              await sendMentionNotification(
                mentionedUser.email,
                mentionedUserName,
                authorName,
                content.trim()
              );
            }
          }
        }
      }
      
      // Send broadcast emails if emailNotification is enabled
      if (emailNotification) {
        for (const user of allUsers) {
          // Skip the author
          if (user.id === req.user.claims.sub) continue;
          
          // Skip if user was already mentioned (they'll get the mention email)
          if (mentionedUserIds.includes(user.id)) continue;
          
          if (user.email) {
            // Check user's notification preferences for broadcasts
            const prefs = await storage.getUserNotificationPreferences(user.id);
            // Send email by default (no prefs or emailOnBroadcast is true/undefined)
            // Only skip if emailOnBroadcast is explicitly false
            const shouldSend = !prefs || prefs.emailOnBroadcast === undefined || prefs.emailOnBroadcast === true;
            if (shouldSend) {
              const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'there';
              await sendBroadcastNotification(
                user.email,
                userName,
                authorName,
                content.trim()
              );
            }
          }
        }
      }

      res.status(201).json(reply);
    } catch (error) {
      console.error("Error creating reply:", error);
      res.status(500).json({ message: "Failed to create reply" });
    }
  });

  // User mentions routes
  app.get("/api/user-mentions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mentions = await storage.getMentionedMessages(userId);
      res.json(mentions);
    } catch (error) {
      console.error("Error fetching user mentions:", error);
      res.status(500).json({ message: "Failed to fetch mentions" });
    }
  });

  // Get mentions for a specific user (for viewing their profile Messages tab)
  app.get("/api/mentions/user/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.userId;
      const mentions = await storage.getMentionedMessages(userId);
      res.json(mentions);
    } catch (error) {
      console.error("Error fetching user mentions:", error);
      res.status(500).json({ message: "Failed to fetch mentions" });
    }
  });

  app.post("/api/user-mentions/:id/mark-read", isAuthenticated, async (req: any, res) => {
    try {
      const mentionId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      await storage.markMentionAsRead(mentionId, userId);
      res.json({ message: "Mention marked as read" });
    } catch (error) {
      console.error("Error marking mention as read:", error);
      res.status(500).json({ message: "Failed to mark mention as read" });
    }
  });

  // User notification preferences routes
  app.get("/api/notification-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let prefs = await storage.getUserNotificationPreferences(userId);
      
      if (!prefs) {
        // Seed defaults from org-level notificationDefaults when no user row exists
        const orgId = (req as any).user?.claims?.orgId;
        let orgDefaults: Record<string, unknown> = {};
        if (orgId) {
          const org = await storage.getOrg(orgId);
          orgDefaults = (org?.notificationDefaults as Record<string, unknown>) || {};
        }
        prefs = {
          userId,
          emailOnMention: orgDefaults.emailOnMention !== false,
          emailOnReply: orgDefaults.emailOnReply !== false,
          emailOnReaction: orgDefaults.emailOnReaction === true,
          emailOnBroadcast: orgDefaults.emailOnBroadcast !== false,
          emailOnTaskAssigned: orgDefaults.emailOnTaskAssigned !== false,
          emailOnTaskOverdue: orgDefaults.emailOnTaskOverdue !== false,
          emailOnInspectionDue: orgDefaults.emailOnInspectionDue !== false,
          emailOnInvoiceDue: orgDefaults.emailOnInvoiceDue !== false,
          emailOnCalendarEvent: orgDefaults.emailOnCalendarEvent !== false,
          inAppEnabled: orgDefaults.inAppEnabled !== false,
          taskOverdueHoursOffset: null,
          inspectionAdvanceDays: null,
          invoiceAdvanceDays: null,
          calendarAdvanceMinutes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
      
      res.json(prefs);
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      res.status(500).json({ message: "Failed to fetch notification preferences" });
    }
  });

  app.put("/api/notification-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Fetch existing row to merge with (prevents partial updates from resetting unspecified fields)
      const existing = await storage.getUserNotificationPreferences(userId);
      const body = req.body as Record<string, unknown>;

      // Gate: pushNotificationsEnabled requires the mobile_push_notifications flag.
      // Reject the entire request when the field is supplied with a truthy value
      // and the org has the flag turned off.
      if ('pushNotificationsEnabled' in body && Boolean(body.pushNotificationsEnabled)) {
        const { isFeatureEnabled } = await import("./featureFlags");
        const orgId = req.user?.claims?.orgId ?? null;
        const enabled = await isFeatureEnabled(orgId, "mobile_push_notifications");
        if (!enabled) {
          return res.status(403).json({
            message: "Mobile push notifications are disabled for your organization",
            code: "FEATURE_DISABLED",
            feature: "mobile_push_notifications",
          });
        }
      }

      const coerceBool = (key: string, fallback: boolean): boolean => {
        if (key in body) return Boolean(body[key]);
        if (existing && key in existing) return Boolean((existing as Record<string, unknown>)[key]);
        return fallback;
      };
      const coerceNullInt = (key: string): number | null => {
        if (key in body) return body[key] === null ? null : Number(body[key]);
        if (existing && key in existing) return (existing as Record<string, unknown>)[key] as number | null;
        return null;
      };

      const prefs = await storage.upsertUserNotificationPreferences({
        userId,
        emailOnMention: coerceBool('emailOnMention', true),
        emailOnReply: coerceBool('emailOnReply', true),
        emailOnReaction: coerceBool('emailOnReaction', false),
        emailOnBroadcast: coerceBool('emailOnBroadcast', true),
        emailOnTaskAssigned: coerceBool('emailOnTaskAssigned', true),
        emailOnTaskOverdue: coerceBool('emailOnTaskOverdue', true),
        emailOnInspectionDue: coerceBool('emailOnInspectionDue', true),
        emailOnInvoiceDue: coerceBool('emailOnInvoiceDue', true),
        emailOnCalendarEvent: coerceBool('emailOnCalendarEvent', true),
        inAppEnabled: coerceBool('inAppEnabled', true),
        pushNotificationsEnabled: coerceBool('pushNotificationsEnabled', false),
        taskOverdueHoursOffset: coerceNullInt('taskOverdueHoursOffset'),
        inspectionAdvanceDays: coerceNullInt('inspectionAdvanceDays'),
        invoiceAdvanceDays: coerceNullInt('invoiceAdvanceDays'),
        calendarAdvanceMinutes: coerceNullInt('calendarAdvanceMinutes'),
      });

      res.json(prefs);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });

  // Search routes
  app.get("/api/search", isAuthenticated, async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      const results = await storage.globalSearch(q);
      res.json(results);
    } catch (error) {
      console.error("Error performing search:", error);
      res.status(500).json({ message: "Failed to perform search" });
    }
  });

  // Duplicate detection and management
  app.post("/api/duplicates/scan", isAuthenticated, async (req, res) => {
    try {
      const criteria = req.body.criteria || {
        nameThreshold: 85,
        emailExact: true,
        phoneNormalized: true,
        addressThreshold: 80,
        includeContacts: true,
        includeProperties: true,
        minimumConfidence: 70
      };

      const duplicates = await storage.scanForDuplicates(criteria);
      res.json({ duplicates, scanTime: new Date().toISOString() });
    } catch (error) {
      console.error("Error scanning for duplicates:", error);
      res.status(500).json({ message: "Failed to scan for duplicates" });
    }
  });

  app.get("/api/duplicates", isAuthenticated, async (req, res) => {
    try {
      const duplicates = await storage.getDuplicates();
      res.json(duplicates);
    } catch (error) {
      console.error("Error fetching duplicates:", error);
      res.status(500).json({ message: "Failed to fetch duplicates" });
    }
  });

  app.post("/api/duplicates/ignore", isAuthenticated, async (req: any, res) => {
    try {
      const { recordType, recordIds, reason, mergeNotes } = req.body;
      
      if (!recordType || !recordIds || !Array.isArray(recordIds)) {
        return res.status(400).json({ message: "recordType and recordIds array are required" });
      }
      
      await storage.ignoreDuplicate(recordType, recordIds, req.user.claims.sub, reason, mergeNotes);
      res.json({ message: "Duplicate ignored successfully" });
    } catch (error) {
      console.error("Error ignoring duplicate:", error);
      res.status(500).json({ message: "Failed to ignore duplicate" });
    }
  });

  app.get("/api/duplicates/history", isAuthenticated, async (req, res) => {
    try {
      const history = await storage.getDuplicateHistory();
      res.json(history);
    } catch (error) {
      console.error("Error fetching duplicate history:", error);
      res.status(500).json({ message: "Failed to fetch duplicate history" });
    }
  });

  // Cleanup duplicate history (admin only)
  const cleanupSchema = z.object({
    type: z.enum(['ignored', 'history', 'all']),
    daysOld: z.number().int().positive().min(1).max(365)
  });
  
  app.post("/api/duplicates/cleanup", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      // Validate request body
      const validation = cleanupSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: validation.error.errors 
        });
      }
      
      const { type, daysOld } = validation.data;
      
      // Calculate the cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      let deletedCount = 0;
      
      // Delete old ignored duplicates
      if (type === 'ignored' || type === 'all') {
        const ignoredResult = await db
          .delete(ignoredDuplicates)
          .where(lt(ignoredDuplicates.createdAt, cutoffDate))
          .returning();
        deletedCount += ignoredResult.length;
      }
      
      // Delete old duplicate history
      if (type === 'history' || type === 'all') {
        const historyResult = await db
          .delete(duplicateHistory)
          .where(lt(duplicateHistory.performedAt, cutoffDate))
          .returning();
        deletedCount += historyResult.length;
      }
      
      console.log(`[Duplicate Cleanup] User ${req.user.claims.email} cleaned up ${deletedCount} ${type} records older than ${daysOld} days`);
      
      res.json({ 
        message: "Cleanup completed successfully", 
        deletedCount,
        type,
        daysOld 
      });
    } catch (error) {
      console.error("Error cleaning up duplicate history:", error);
      res.status(500).json({ message: "Failed to clean up duplicate history" });
    }
  });

  // Smart merge multiple duplicates
  app.post("/api/duplicates/merge-multiple", isAuthenticated, async (req, res) => {
    try {
      const { recordIds, type, mergeNotes } = req.body;
      
      if (!recordIds || recordIds.length < 2) {
        return res.status(400).json({ message: "At least 2 records required for merge" });
      }
      
      if (type === 'contact') {
        // Get all contacts to merge
        const allContacts = await db.select().from(contacts);
        const contactsToMerge = allContacts.filter(c => recordIds.includes(c.id));
        
        if (contactsToMerge.length !== recordIds.length) {
          return res.status(404).json({ message: "Some contacts not found" });
        }
        
        // Sort by completeness - most complete becomes primary
        const calculateCompleteness = (contact: any): number => {
          let score = 0;
          if (contact.first_name) score += 20;
          if (contact.last_name) score += 20;
          if (contact.email) score += 25;
          if (contact.phone) score += 20;
          if (contact.address) score += 10;
          if (contact.type) score += 5;
          return score;
        };
        
        const sortedContacts = contactsToMerge.sort((a, b) => {
          const scoreA = calculateCompleteness(a);
          const scoreB = calculateCompleteness(b);
          return scoreB - scoreA;
        });
        
        const primary = sortedContacts[0];
        const duplicates = sortedContacts.slice(1);
        
        // Create smart merged record
        const mergedData = { ...primary };
        
        // Collect all notes for intelligent combination
        const allNotes: Array<{ text: string; createdAt: Date | null }> = [];
        
        // Add primary's notes if exists
        if (primary.notes) {
          allNotes.push({ 
            text: primary.notes, 
            createdAt: primary.created_at 
          });
        }
        
        duplicates.forEach(duplicate => {
          // Add duplicate's notes if exists
          if (duplicate.notes) {
            allNotes.push({ 
              text: duplicate.notes, 
              createdAt: duplicate.created_at 
            });
          }
          
          // Fill in missing fields from duplicates (excluding notes - handled separately)
          Object.keys(duplicate).forEach(key => {
            if (key === 'id' || key === 'notes') return;
            
            if (!mergedData[key] && duplicate[key]) {
              mergedData[key] = duplicate[key];
            }
            
            // For strings, prefer longer/more complete versions
            if (typeof mergedData[key] === 'string' && typeof duplicate[key] === 'string') {
              if (duplicate[key].length > mergedData[key].length) {
                mergedData[key] = duplicate[key];
              }
            }
          });
        });
        
        // Intelligently combine notes
        if (allNotes.length > 0) {
          // Sort by creation date (oldest first)
          allNotes.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return a.createdAt.getTime() - b.createdAt.getTime();
          });
          
          // Combine notes with separators (all notes get date headers)
          const combinedNotes = allNotes
            .map((note) => {
              const timestamp = note.createdAt 
                ? new Date(note.createdAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })
                : 'Unknown date';
              
              return `--- Notes from ${timestamp} ---\n${note.text}`;
            })
            .join('\n\n');
          
          mergedData.notes = combinedNotes;
        }
        
        // Update primary record with merged data
        await db.update(contacts)
          .set({
            ...mergedData,
            updated_at: new Date()
          })
          .where(eq(contacts.id, primary.id));
        
        const duplicateIds = duplicates.map(d => d.id);
        
        // Transfer all related records to primary contact
        let transferCounts = {
          tasks: 0,
          formSubmissions: 0,
          contactProperties: 0,
          alerts: 0
        };
        
        for (const duplicateId of duplicateIds) {
          // Transfer tasks
          const tasksResult = await db.update(tasks)
            .set({ contactId: primary.id })
            .where(eq(tasks.contactId, duplicateId))
            .returning();
          transferCounts.tasks += tasksResult.length;
          
          // Transfer form submissions
          const formSubmissionsResult = await db.update(formSubmissions)
            .set({ profileId: primary.id })
            .where(eq(formSubmissions.profileId, duplicateId))
            .returning();
          transferCounts.formSubmissions += formSubmissionsResult.length;
          
          // Transfer contact-property links (with deduplication)
          const existingLinks = await db.select()
            .from(contactProperties)
            .where(eq(contactProperties.contactId, primary.id));
          
          const duplicateLinks = await db.select()
            .from(contactProperties)
            .where(eq(contactProperties.contactId, duplicateId));
          
          for (const dupLink of duplicateLinks) {
            const alreadyExists = existingLinks.some(
              link => link.propertyId === dupLink.propertyId
            );
            
            if (!alreadyExists) {
              // Transfer the link
              await db.update(contactProperties)
                .set({ contactId: primary.id })
                .where(eq(contactProperties.id, dupLink.id));
              transferCounts.contactProperties++;
            } else {
              // Delete duplicate link
              await db.delete(contactProperties)
                .where(eq(contactProperties.id, dupLink.id));
            }
          }
          
          // Transfer alerts
          const alertsResult = await db.update(alerts)
            .set({ entityId: primary.id })
            .where(and(
              eq(alerts.type, 'client'),
              eq(alerts.entityId, duplicateId)
            ))
            .returning();
          transferCounts.alerts += alertsResult.length;
        }
        
        // Delete duplicate records
        for (const duplicateId of duplicateIds) {
          await db.delete(contacts).where(eq(contacts.id, duplicateId));
        }
        
        // Log the merge activity
        await storage.logActivity({
          userId: req.user?.claims?.sub,
          action: 'contact_merge',
          entityType: 'contact',
          entityId: primary.id.toString(),
          description: `Merged ${duplicates.length} duplicate contacts into primary record. Transferred: ${transferCounts.tasks} tasks, ${transferCounts.formSubmissions} form submissions, ${transferCounts.contactProperties} property links, ${transferCounts.alerts} alerts`
        });
        
        // Add to duplicate history with notes
        await storage.addDuplicateHistory(
          'merge',
          'contact',
          recordIds,
          req.user?.claims?.sub,
          { 
            mergedContactIds: duplicateIds,
            totalRecords: contactsToMerge.length,
            transferredRecords: transferCounts
          },
          mergeNotes
        );
        
        res.json({ 
          success: true, 
          primaryId: primary.id, 
          deletedIds: duplicateIds,
          mergedRecords: contactsToMerge.length 
        });
        
      } else if (type === 'property') {
        // Get all properties to merge
        const allProperties = await db.select().from(properties);
        const propertiesToMerge = allProperties.filter(p => recordIds.includes(p.id));
        
        if (propertiesToMerge.length !== recordIds.length) {
          return res.status(404).json({ message: "Some properties not found" });
        }
        
        // Ensure all properties belong to the same organization
        const orgIds = [...new Set(propertiesToMerge.map(p => p.orgId))];
        if (orgIds.length > 1) {
          return res.status(400).json({ message: "Cannot merge properties from different organizations" });
        }
        
        // Sort by completeness - most complete becomes primary
        const calculatePropertyCompleteness = (property: any): number => {
          let score = 0;
          if (property.name) score += 15;
          if (property.address1) score += 20;
          if (property.address2) score += 5;
          if (property.city) score += 15;
          if (property.state) score += 10;
          if (property.zip) score += 10;
          if (property.type) score += 10;
          if (property.managerId) score += 5;
          if (property.imageUrl) score += 5;
          if (property.squareFootage) score += 5;
          if (property.accountId) score += 5;
          return score;
        };
        
        const sortedProperties = propertiesToMerge.sort((a, b) => {
          const scoreA = calculatePropertyCompleteness(a);
          const scoreB = calculatePropertyCompleteness(b);
          return scoreB - scoreA;
        });
        
        const primary = sortedProperties[0];
        const duplicates = sortedProperties.slice(1);
        
        // Create smart merged record
        const mergedData = { ...primary };
        
        // Collect all notes for intelligent combination
        const allPropertyNotes: Array<{ text: string; createdAt: Date | null }> = [];
        
        // Add primary's notes if exists
        if (primary.notes) {
          allPropertyNotes.push({ 
            text: primary.notes, 
            createdAt: primary.createdAt 
          });
        }
        
        duplicates.forEach(duplicate => {
          // Add duplicate's notes if exists
          if (duplicate.notes) {
            allPropertyNotes.push({ 
              text: duplicate.notes, 
              createdAt: duplicate.createdAt 
            });
          }
          
          // Fill in missing fields from duplicates (excluding notes - handled separately)
          Object.keys(duplicate).forEach(key => {
            if (key === 'id' || key === 'notes') return;
            
            if (!mergedData[key] && duplicate[key]) {
              mergedData[key] = duplicate[key];
            }
            
            // For strings, prefer longer/more complete versions
            if (typeof mergedData[key] === 'string' && typeof duplicate[key] === 'string') {
              if (duplicate[key].length > mergedData[key].length) {
                mergedData[key] = duplicate[key];
              }
            }
            
            // For numbers, prefer larger values (e.g., square footage)
            if (typeof mergedData[key] === 'number' && typeof duplicate[key] === 'number') {
              if (duplicate[key] > mergedData[key]) {
                mergedData[key] = duplicate[key];
              }
            }
          });
        });
        
        // Intelligently combine notes
        if (allPropertyNotes.length > 0) {
          // Sort by creation date (oldest first)
          allPropertyNotes.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return a.createdAt.getTime() - b.createdAt.getTime();
          });
          
          // Combine notes with separators (all notes get date headers)
          const combinedNotes = allPropertyNotes
            .map((note) => {
              const timestamp = note.createdAt 
                ? new Date(note.createdAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })
                : 'Unknown date';
              
              return `--- Notes from ${timestamp} ---\n${note.text}`;
            })
            .join('\n\n');
          
          mergedData.notes = combinedNotes;
        }
        
        // Update primary record with merged data
        await db.update(properties)
          .set({
            ...mergedData,
            updatedAt: new Date()
          })
          .where(eq(properties.id, primary.id));
        
        // Reassign all related records to the primary property
        const duplicateIds = duplicates.map(d => d.id);
        
        // Transfer all related records with tracking
        let propertyTransferCounts = {
          tasks: 0,
          timeEntries: 0,
          formSubmissions: 0,
          contactProperties: 0,
          rooms: 0,
          vehicles: 0,
          alerts: 0,
          events: 0,
          contacts: 0
        };
        
        for (const duplicateId of duplicateIds) {
          // Transfer tasks
          const tasksResult = await db.update(tasks)
            .set({ propertyId: primary.id })
            .where(eq(tasks.propertyId, duplicateId))
            .returning();
          propertyTransferCounts.tasks += tasksResult.length;
          
          // Transfer time entries
          const timeEntriesResult = await db.update(timeEntries)
            .set({ propertyId: primary.id })
            .where(eq(timeEntries.propertyId, duplicateId))
            .returning();
          propertyTransferCounts.timeEntries += timeEntriesResult.length;
          
          // Transfer form submissions
          const formSubmissionsResult = await db.update(formSubmissions)
            .set({ propertyId: primary.id })
            .where(eq(formSubmissions.propertyId, duplicateId))
            .returning();
          propertyTransferCounts.formSubmissions += formSubmissionsResult.length;
          
          // Transfer rooms
          const roomsResult = await db.update(rooms)
            .set({ propertyId: primary.id })
            .where(eq(rooms.propertyId, duplicateId))
            .returning();
          propertyTransferCounts.rooms += roomsResult.length;
          
          // Transfer vehicles
          const vehiclesResult = await db.update(vehicles)
            .set({ propertyId: primary.id })
            .where(eq(vehicles.propertyId, duplicateId))
            .returning();
          propertyTransferCounts.vehicles += vehiclesResult.length;
          
          // Transfer events
          const eventsResult = await db.update(events)
            .set({ propertyId: primary.id })
            .where(eq(events.propertyId, duplicateId))
            .returning();
          propertyTransferCounts.events += eventsResult.length;
          
          // Transfer alerts
          const alertsResult = await db.update(alerts)
            .set({ entityId: primary.id })
            .where(and(
              eq(alerts.type, 'property'),
              eq(alerts.entityId, duplicateId)
            ))
            .returning();
          propertyTransferCounts.alerts += alertsResult.length;
          
          // Transfer contacts (if they reference propertyId directly)
          const contactsResult = await db.update(contacts)
            .set({ propertyId: primary.id })
            .where(eq(contacts.propertyId, duplicateId))
            .returning();
          propertyTransferCounts.contacts += contactsResult.length;
          
          // Transfer contact-property links (with deduplication)
          const existingLinks = await db.select()
            .from(contactProperties)
            .where(eq(contactProperties.propertyId, primary.id));
          
          const duplicateLinks = await db.select()
            .from(contactProperties)
            .where(eq(contactProperties.propertyId, duplicateId));
          
          for (const link of duplicateLinks) {
            // Check if this contact is already linked to the primary property
            const exists = existingLinks.some(el => el.contactId === link.contactId);
            
            if (!exists) {
              // Safe to update - no conflict
              await db.update(contactProperties)
                .set({ propertyId: primary.id })
                .where(eq(contactProperties.id, link.id));
              propertyTransferCounts.contactProperties++;
            } else {
              // Conflict - just delete the duplicate link
              await db.delete(contactProperties)
                .where(eq(contactProperties.id, link.id));
            }
          }
        }
        
        // Delete duplicate properties
        for (const duplicateId of duplicateIds) {
          await db.delete(properties).where(eq(properties.id, duplicateId));
        }
        
        // Log the merge activity
        await storage.logActivity({
          userId: req.user?.claims?.sub,
          action: 'property_merge',
          entityType: 'property',
          entityId: primary.id.toString(),
          description: `Merged ${duplicates.length} duplicate properties into primary record at ${primary.address1}, ${primary.city}, ${primary.state}. Transferred: ${propertyTransferCounts.tasks} tasks, ${propertyTransferCounts.timeEntries} time entries, ${propertyTransferCounts.formSubmissions} form submissions, ${propertyTransferCounts.contactProperties} contact links, ${propertyTransferCounts.rooms} rooms, ${propertyTransferCounts.vehicles} vehicles, ${propertyTransferCounts.alerts} alerts, ${propertyTransferCounts.events} events`
        });
        
        // Add to duplicate history with notes
        await storage.addDuplicateHistory(
          'merge',
          'property',
          recordIds,
          req.user?.claims?.sub,
          { 
            mergedPropertyIds: duplicateIds,
            totalRecords: propertiesToMerge.length,
            primaryAddress: `${primary.address1}, ${primary.city}, ${primary.state}`,
            transferredRecords: propertyTransferCounts
          },
          mergeNotes
        );
        
        res.json({ 
          success: true, 
          primaryId: primary.id, 
          deletedIds: duplicateIds,
          mergedRecords: propertiesToMerge.length 
        });
        
      } else {
        res.status(400).json({ message: "Invalid record type for merge" });
      }
      
    } catch (error) {
      console.error("Error merging duplicates:", error);
      res.status(500).json({ message: "Failed to merge duplicates" });
    }
  });

  // Forms API routes
  app.get("/api/forms", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.user as any).claims.sub);
      if (!user?.orgId) {
        return res.status(404).json({ message: "User organization not found" });
      }
      
      // Get forms with their fields
      const forms = await storage.getFormsWithFields();
      res.json(forms);
    } catch (error) {
      console.error("Error fetching forms:", error);
      res.status(500).json({ message: "Failed to fetch forms" });
    }
  });

  app.post("/api/forms", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate request body
      const formData = {
        formTitle: req.body.name || req.body.formTitle,
        slug: req.body.slug || req.body.name?.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
        contexts: req.body.contexts || req.body.schema?.contexts || [req.body.context || 'people'],
        settings: {
          internalDescription: req.body.description,
          allowMultipleSubmissions: req.body.schema?.allowMultipleSubmissions || false,
          matchExistingBy: req.body.schema?.matchExistingBy || 'email',
          triggerAutomation: req.body.schema?.triggerAutomation || false,
          fieldMapping: req.body.schema?.fieldMapping || {},
          submitLabel: req.body.schema?.submitLabel || 'Submit Form',
          successMessage: req.body.schema?.successMessage || 'Thank you for your submission!'
        }
      };

      // Create form using new schema
      const form = await storage.createForm(formData);
      
      // Create form fields if provided
      if (req.body.schema?.fields && Array.isArray(req.body.schema.fields)) {
        const fields = req.body.schema.fields.map((field: any, index: number) => ({
          formId: form.id,
          label: field.label,
          type: field.type,
          required: field.required || false,
          profileFieldKey: field.profileFieldKey || field.id,
          options: field.options || null,
          sortOrder: index
        }));
        
        await storage.createFormFields(form.id, fields);
      }
      
      res.json(form);
    } catch (error) {
      console.error("Error creating form:", error);
      res.status(500).json({ message: "Failed to create form" });
    }
  });

  app.delete("/api/forms/:id", isAuthenticated, async (req: any, res) => {
    try {
      const formId = parseInt(req.params.id);
      const userId = (req.user as any).claims.sub;
      
      await storage.deleteForm(formId, userId);
      res.json({ message: "Form deleted successfully" });
    } catch (error) {
      console.error("Error deleting form:", error);
      res.status(500).json({ message: "Failed to delete form" });
    }
  });

  app.patch("/api/forms/:id", isAuthenticated, async (req: any, res) => {
    try {
      const formId = parseInt(req.params.id);
      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update form data
      const updateData: any = {};
      if (req.body.formTitle !== undefined) updateData.formTitle = req.body.formTitle;
      if (req.body.slug !== undefined) updateData.slug = req.body.slug;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
      if (req.body.embedEnabled !== undefined) updateData.embedEnabled = req.body.embedEnabled;
      if (req.body.contexts !== undefined) updateData.contexts = req.body.contexts;

      const updatedForm = await storage.updateForm(formId, updateData);
      res.json(updatedForm);
    } catch (error) {
      console.error("Error updating form:", error);
      res.status(500).json({ message: "Failed to update form" });
    }
  });

  app.get("/api/forms/:id/submissions", isAuthenticated, async (req: any, res) => {
    try {
      const formId = parseInt(req.params.id);
      const submissions = await storage.getFormSubmissionsWithFields(formId);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching form submissions:", error);
      res.status(500).json({ message: "Failed to fetch form submissions" });
    }
  });

  // Public form routes (no authentication required)
  app.get("/forms/:slug", async (req, res) => {
    try {
      const form = await storage.getFormBySlug(req.params.slug);
      if (!form) {
        return res.status(404).send("Form not found");
      }
      
      // Render form page with branding
      res.send(generateFormHTML(form, false));
    } catch (error) {
      console.error("Error fetching form:", error);
      res.status(500).send("Error loading form");
    }
  });

  app.get("/forms/:formKey/embed", async (req, res) => {
    try {
      const form = await storage.getFormByKey(req.params.formKey);
      if (!form) {
        return res.status(404).send("Form not found");
      }
      
      if (!form.embedEnabled) {
        return res.status(403).send("Embedding not enabled for this form");
      }
      
      // Render form page without branding
      res.send(generateFormHTML(form, true));
    } catch (error) {
      console.error("Error fetching form:", error);
      res.status(500).send("Error loading form");
    }
  });

  // File upload URL endpoint for form fields
  app.post("/api/forms/:formId/fields/:fieldId/upload-url", async (req, res) => {
    try {
      const formId = parseInt(req.params.formId);
      const fieldId = parseInt(req.params.fieldId);
      
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getFormFileUploadURL(formId, fieldId);
      
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Configure multer for form submissions (handles files and multipart data)
  const formSubmissionUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    }
  }).any(); // Accept any field as file or data

  // Form submission with profile matching logic
  app.post("/forms/:slug/submit", formSubmissionUpload, async (req, res) => {
    try {
      const form = await storage.getFormBySlug(req.params.slug);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      // Combine req.body (text fields) and req.files (uploaded files)
      const submissionData: any = { ...req.body };
      
      // Handle uploaded files
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          submissionData[file.fieldname] = {
            filename: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            buffer: file.buffer
          };
        }
      }
      const formSettings = form.settings as any;
      let profileId = null;

      // Process submission based on form contexts
      await onFormSubmit(submissionData, form, storage);

      // Handle profile matching and creation if form has mapping
      if (formSettings?.matchExistingBy && formSettings?.fieldMapping) {
        const identifier = formSettings.matchExistingBy;
        const matchKey = identifier === 'email' ? submissionData.email : submissionData.phone;

        if (matchKey) {
          // Try to find existing contact
          let existingContact = null;
          try {
            if (identifier === 'email') {
              existingContact = await storage.getContactByEmail(matchKey, form.orgId);
            } else {
              existingContact = await storage.getContactByPhone(matchKey, form.orgId);
            }
          } catch (error) {
            console.log("Contact lookup failed:", error);
          }

          if (existingContact) {
            // Update existing profile with new data
            const updateData: any = {};
            Object.entries(formSettings.fieldMapping).forEach(([formFieldId, profileField]) => {
              if (submissionData[formFieldId] && profileField !== 'none') {
                updateData[profileField] = submissionData[formFieldId];
              }
            });

            if (Object.keys(updateData).length > 0) {
              await storage.updateContact(existingContact.id, updateData);
            }
            profileId = existingContact.id;
          } else {
            // Create new profile
            const newProfileData: any = {
              orgId: form.orgId
            };
            
            Object.entries(formSettings.fieldMapping).forEach(([formFieldId, profileField]) => {
              if (submissionData[formFieldId] && profileField !== 'none') {
                newProfileData[profileField] = submissionData[formFieldId];
              }
            });

            if (newProfileData.firstName || newProfileData.lastName || newProfileData.email || newProfileData.phone) {
              const newContact = await storage.createContact(newProfileData, null);
              profileId = newContact.id;
            }
          }
        }
      } else {
        // Fallback: Extract mapped fields and create contact if configured (legacy behavior)
        if (req.body.email && (req.body.firstName || req.body.name)) {
          try {
            const newContact = await storage.createContact({
              firstName: req.body.firstName || req.body.name?.split(' ')[0] || 'Unknown',
              lastName: req.body.lastName || req.body.name?.split(' ').slice(1).join(' ') || '',
              email: req.body.email,
              phone: req.body.phone || null,
              type: 'client',
              isActive: true,
              orgId: form.orgId
            }, null);
            profileId = newContact.id;
          } catch (contactError) {
            console.warn("Could not create contact from form submission:", contactError);
          }
        }
      }

      // Create form submission with profile reference
      await storage.createFormSubmission({
        formId: form.id,
        data: submissionData,
        profileId: profileId
      });

      // Log form submission
      console.log(`Form submission processed: formId=${form.id}, profileId=${profileId}, timestamp=${Date.now()}`);

      // TODO: Implement automation triggers if needed
      if (formSettings?.triggerAutomation) {
        console.log(`Automation triggered for form: ${form.slug}`);
        // triggerAutomation(form.slug, submissionData);
      }

      res.json({ message: "Form submitted successfully" });
    } catch (error) {
      console.error("Error submitting form:", error);
      res.status(500).json({ message: "Failed to submit form" });
    }
  });

  // Data import endpoint (for importing sample data)
  app.post("/api/import-sample-data", async (req: any, res) => {
    try {
      console.log("Starting sample data import...");
      
      const csvData = [
        {
          fullName: "Bruce Wayne",
          propertyName: "Wayne Manor",
          streetAddress: "1313 Mockingbird Ln.",
          city: "Gotham City",
          state: "NJ",
          zipCode: "00001",
          phoneNumber: "(807) 536-1076",
          email: "bruce.wayne@example.com",
          tasks: "Replace roof tiles; Inspect security cameras"
        },
        {
          fullName: "Tony Stark",
          propertyName: "Stark Lake House",
          streetAddress: "10880 Malibu Point",
          city: "Malibu",
          state: "CA",
          zipCode: "90265",
          phoneNumber: "(625) 667-8476",
          email: "tony.stark@example.com",
          tasks: "Calibrate solar panels; Reset water system"
        },
        {
          fullName: "Bilbo Baggins",
          propertyName: "Bag End",
          streetAddress: "111 Bag End, Bagshot Row",
          city: "Hobbiton, The Shire",
          state: "ME",
          zipCode: "24791",
          phoneNumber: "(397) 259-9198",
          email: "bilbo.baggins@example.com",
          tasks: "Chimney sweep; Pantry pest control"
        },
        {
          fullName: "Jay Gatsby",
          propertyName: "Gatsby Estate",
          streetAddress: "1 Gatsby Lane",
          city: "West Egg",
          state: "NY",
          zipCode: "11560",
          phoneNumber: "(734) 348-9487",
          email: "jay.gatsby@example.com",
          tasks: "Clean pool; Repair ballroom lights"
        },
        {
          fullName: "Elsa Arendelle",
          propertyName: "Ice Castle",
          streetAddress: "1 Ice Palace Rd",
          city: "North Mountain",
          state: "AK",
          zipCode: "99686",
          phoneNumber: "(918) 766-7895",
          email: "elsa.arendelle@example.com",
          tasks: "De-ice entry; Inspect HVAC"
        },
        {
          fullName: "Clark Kent",
          propertyName: "Smallville Farmhouse",
          streetAddress: "100 Farmhouse Way",
          city: "Smallville",
          state: "KS",
          zipCode: "67524",
          phoneNumber: "(884) 945-4765",
          email: "clark.kent@example.com",
          tasks: "Repair barn door; Reset perimeter alert"
        },
        {
          fullName: "Sherlock Holmes",
          propertyName: "221B Baker Street",
          streetAddress: "221B Baker Street",
          city: "London",
          state: "UK",
          zipCode: "NW1 6XE",
          phoneNumber: "(366) 722-1185",
          email: "sherlock.holmes@example.com",
          tasks: "Check gas line; Fix loose window latch"
        },
        {
          fullName: "Lara Croft",
          propertyName: "Croft Manor",
          streetAddress: "1 Croft Manor",
          city: "Surrey",
          state: "UK",
          zipCode: "GU1 1AA",
          phoneNumber: "(743) 571-6460",
          email: "lara.croft@example.com",
          tasks: "Fix surveillance system; Schedule garden trim"
        },
        {
          fullName: "Doc Brown",
          propertyName: "Hill Valley Garage",
          streetAddress: "1640 Riverside Drive",
          city: "Hill Valley",
          state: "CA",
          zipCode: "95420",
          phoneNumber: "(380) 547-9627",
          email: "doc.brown@example.com",
          tasks: "Clean flux capacitor bay; Inspect storm damage"
        },
        {
          fullName: "Willy Wonka",
          propertyName: "Chocolate Factory Guest House",
          streetAddress: "10 Candy Cane Lane",
          city: "Candy Town",
          state: "PA",
          zipCode: "15001",
          phoneNumber: "(720) 511-5742",
          email: "willy.wonka@example.com",
          tasks: "Sanitize chocolate river filter; Inspect candy wall"
        }
      ];

      const importResults = {
        properties: 0,
        contacts: 0,
        tasks: 0
      };

      for (const record of csvData) {
        console.log(`Processing ${record.fullName}...`);
        
        // Split full name
        const nameParts = record.fullName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        
        // Create property
        const property = await storage.createProperty({
          name: record.propertyName,
          type: "house",
          address1: record.streetAddress,
          address2: "",
          city: record.city,
          state: record.state,
          zip: record.zipCode,
          status: "occupied", // Use default status from schema
          units: 1,
          isActive: true,
          orgId: "00000000-0000-0000-0000-000000000000", // Default org for imported data
          managerId: null
        }, null); // Use null for user_id to avoid foreign key constraint
        
        importResults.properties++;
        console.log(`Created property: ${property.name}`);
        
        // Create contact
        const contact = await storage.createContact({
          firstName,
          lastName,
          email: record.email,
          phone: record.phoneNumber,
          type: "owner",
          propertyId: property.id,
          isActive: true
        }, null); // Use null for user_id to avoid foreign key constraint
        
        importResults.contacts++;
        console.log(`Created contact: ${contact.firstName} ${contact.lastName}`);
        
        // Create tasks
        const taskList = record.tasks.split(';').map(task => task.trim());
        
        for (const taskTitle of taskList) {
          if (taskTitle) {
            const task = await storage.createTask({
              title: taskTitle,
              description: `Task for ${record.propertyName}`,
              priority: "normal",
              status: "pending",
              propertyId: property.id,
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              assignedToId: null,
              assignedById: null
            }, null); // Use null for user_id to avoid foreign key constraint
            
            importResults.tasks++;
            console.log(`Created task: ${task.title}`);
          }
        }
      }
      
      console.log("Import completed successfully!");
      console.log(`Results: ${importResults.properties} properties, ${importResults.contacts} contacts, ${importResults.tasks} tasks`);
      
      res.json({
        success: true,
        message: `Successfully imported ${importResults.properties} properties, ${importResults.contacts} contacts, and ${importResults.tasks} tasks`,
        results: importResults
      });

    } catch (error) {
      console.error("Error importing data:", error);
      res.status(500).json({ 
        success: false, 
        message: `Failed to import data: ${error}` 
      });
    }
  });

  // Organization and Branding routes
  app.get("/api/orgs/:orgId", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const userOrgId = req.user?.claims?.orgId;
      
      // Ensure user belongs to the organization
      if (userOrgId !== orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const org = await storage.getOrg(orgId);
      
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      res.json(org);
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  app.patch("/api/orgs/:orgId", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const userOrgId = req.user?.claims?.orgId;
      const userRole = req.user?.claims?.role;
      
      // Ensure user belongs to the organization and has admin privileges
      if (userOrgId !== orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (userRole !== "admin" && userRole !== "supervisor") {
        return res.status(403).json({ message: "Only admins and supervisors can update organization settings" });
      }
      
      const updates: any = {};
      
      // Allow updating billing workflow mode
      if (req.body.hasOwnProperty('billingWorkflowMode')) {
        const validModes = ["automatic", "require_authorization", "manual"];
        if (!validModes.includes(req.body.billingWorkflowMode)) {
          return res.status(400).json({ message: "Invalid billing workflow mode" });
        }
        updates.billingWorkflowMode = req.body.billingWorkflowMode;
      }
      
      // Allow updating task retention periods
      if (req.body.hasOwnProperty('completedTaskRetentionDays')) {
        const days = parseInt(req.body.completedTaskRetentionDays);
        if (isNaN(days) || days < 0) {
          return res.status(400).json({ message: "Invalid completed task retention days" });
        }
        updates.completedTaskRetentionDays = days;
      }
      
      if (req.body.hasOwnProperty('cancelledTaskRetentionDays')) {
        const days = parseInt(req.body.cancelledTaskRetentionDays);
        if (isNaN(days) || days < 0) {
          return res.status(400).json({ message: "Invalid cancelled task retention days" });
        }
        updates.cancelledTaskRetentionDays = days;
      }
      
      // Allow updating company profile fields
      const profileFields = ['address1', 'address2', 'city', 'state', 'zip', 'country', 
        'phone', 'website', 'timezone', 'currency', 'primaryContact', 'industry'];
      profileFields.forEach(field => {
        if (req.body.hasOwnProperty(field)) {
          updates[field] = req.body[field];
        }
      });
      
      const updatedOrg = await storage.updateOrg(orgId, updates);

      res.json(updatedOrg);
    } catch (error) {
      console.error("Error updating organization:", error);
      res.status(500).json({ message: "Failed to update organization" });
    }
  });

  app.get("/api/orgs/:orgId/branding", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const org = await storage.getOrg(orgId);
      
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const subscription = await storage.getOrgSubscription(orgId);
      const tier = subscription?.tier || "starter";
      const capabilities = getBrandingCapabilities(tier as any);

      res.json({
        branding: org.branding || {},
        theme: org.theme || {},
        capabilities,
        tier
      });
    } catch (error) {
      console.error("Error fetching organization branding:", error);
      res.status(500).json({ message: "Failed to fetch organization branding" });
    }
  });

  app.patch("/api/orgs/:orgId/branding", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.params.orgId;
      const callerOrgId = req.user?.claims?.orgId;
      const callerRole = req.user?.claims?.role;
      const superAdminSession = (req.session as any)?.superAdmin?.authenticated === true;
      if (!superAdminSession && (callerOrgId !== orgId || (callerRole !== "admin" && callerRole !== "owner"))) {
        return res.status(403).json({ message: "Forbidden: cannot modify branding for another organization" });
      }
      const { isFeatureEnabled } = await import("./featureFlags");
      const enabled = await isFeatureEnabled(orgId, "white_label_branding");
      if (!enabled) {
        return res.status(403).json({
          enabled: false,
          flag: "white_label_branding",
          code: "FEATURE_DISABLED",
          feature: "white_label_branding",
          message: 'This feature ("white_label_branding") is disabled for your organization.',
        });
      }
      const org = await storage.getOrg(orgId);

      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Get current branding level based on subscription
      const brandingLevel = await getBrandingLevel(orgId);
      
      // Enforce branding policy
      const allowedData = enforceBrandingPolicy(brandingLevel, req.body);
      
      // Update organization with enforced branding
      const updatedOrg = await storage.updateOrg(orgId, {
        branding: allowedData.branding,
        theme: allowedData.theme,
      });

      res.json({
        branding: updatedOrg.branding,
        theme: updatedOrg.theme,
        level: brandingLevel
      });
    } catch (error) {
      console.error("Error updating organization branding:", error);
      res.status(500).json({ message: "Failed to update organization branding" });
    }
  });

  // API Key routes
  app.get("/api/orgs/:orgId/api-keys", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const userOrgId = req.user?.claims?.orgId;
      const userRole = req.user?.claims?.role;
      
      if (userOrgId !== orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (userRole !== "admin") {
        return res.status(403).json({ message: "Only admins can manage API keys" });
      }
      
      const apiKeys = await storage.getApiKeys(orgId);
      res.json(apiKeys);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  app.post("/api/orgs/:orgId/api-keys", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const userOrgId = req.user?.claims?.orgId;
      const userRole = req.user?.claims?.role;
      
      if (userOrgId !== orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (userRole !== "admin") {
        return res.status(403).json({ message: "Only admins can create API keys" });
      }
      
      const { name } = req.body;
      
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Name is required" });
      }
      
      const { apiKey, plainKey } = await storage.createApiKey(name, orgId);
      
      // Return the plain key only once (it will never be shown again)
      res.json({ ...apiKey, plainKey });
    } catch (error) {
      console.error("Error creating API key:", error);
      res.status(500).json({ message: "Failed to create API key" });
    }
  });

  app.delete("/api/orgs/:orgId/api-keys/:keyId", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const keyId = parseInt(req.params.keyId);
      const userOrgId = req.user?.claims?.orgId;
      const userRole = req.user?.claims?.role;
      
      if (userOrgId !== orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (userRole !== "admin") {
        return res.status(403).json({ message: "Only admins can revoke API keys" });
      }
      
      await storage.revokeApiKey(keyId, orgId);
      res.json({ message: "API key revoked successfully" });
    } catch (error) {
      console.error("Error revoking API key:", error);
      res.status(500).json({ message: "Failed to revoke API key" });
    }
  });

  // Get organization invoice template settings
  app.get("/api/organizations/:orgId/invoice-template", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const userOrgId = req.user?.claims?.orgId || req.user?.orgId;
      const userRole = req.user?.claims?.role || req.user?.role;
      
      // Verify user belongs to org
      if (userOrgId !== orgId && userRole !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const org = await storage.getOrg(orgId);
      
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      res.json({
        invoiceTemplateId: org.invoiceTemplateId || 'modern',
        invoiceTemplatePrefs: org.invoiceTemplatePrefs || {},
      });
    } catch (error) {
      console.error("Error fetching invoice template:", error);
      res.status(500).json({ message: "Failed to fetch invoice template" });
    }
  });

  // Update organization invoice template
  app.patch("/api/organizations/:orgId/invoice-template", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const userOrgId = req.user?.claims?.orgId || req.user?.orgId;
      const userRole = req.user?.claims?.role || req.user?.role;
      
      // Verify user belongs to org and is admin/supervisor
      if (userOrgId !== orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (userRole !== 'admin' && userRole !== 'supervisor') {
        return res.status(403).json({ message: "Only admins and supervisors can update invoice templates" });
      }
      
      const org = await storage.getOrg(orgId);
      
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const { invoiceTemplateId, invoiceTemplatePrefs } = req.body;
      
      // Validate template ID
      const validTemplates = ['modern', 'minimal', 'classic', 'compact', 'bold'];
      if (invoiceTemplateId && !validTemplates.includes(invoiceTemplateId)) {
        return res.status(400).json({ message: "Invalid invoice template ID" });
      }
      
      // Update organization
      const updatedOrg = await storage.updateOrg(orgId, {
        invoiceTemplateId: invoiceTemplateId || org.invoiceTemplateId,
        invoiceTemplatePrefs: invoiceTemplatePrefs || org.invoiceTemplatePrefs,
      });

      res.json({
        invoiceTemplateId: updatedOrg.invoiceTemplateId,
        invoiceTemplatePrefs: updatedOrg.invoiceTemplatePrefs,
      });
    } catch (error) {
      console.error("Error updating invoice template:", error);
      res.status(500).json({ message: "Failed to update invoice template" });
    }
  });

  app.get("/api/orgs/:orgId/subscription", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.params.orgId;
      const userId = req.user?.claims?.sub;
      const dbUser = userId ? await storage.getUser(userId) : null;
      const userOrgId = dbUser?.orgId || req.user?.claims?.orgId || req.user?.claims?.org_id;
      const userRole = dbUser?.role || req.user?.claims?.role;
      const isSuperAdminSession = (req.session as any)?.superAdmin?.authenticated === true;
      const isSuperAdminRole = userRole === 'super_admin';

      if (!isSuperAdminSession && !isSuperAdminRole) {
        if (userOrgId !== orgId) {
          return res.status(403).json({ message: "Forbidden" });
        }
        if (userRole !== 'admin') {
          return res.status(403).json({ message: "Admin access required" });
        }
      }

      const subscription = await storage.getOrgSubscription(orgId);

      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      const capabilities = getBrandingCapabilities(subscription.tier as any);

      // Return only the fields the Account UI needs; never leak Stripe IDs.
      res.json({
        tier: subscription.tier,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        capabilities,
      });
    } catch (error) {
      console.error("Error fetching organization subscription:", error);
      res.status(500).json({ message: "Failed to fetch organization subscription" });
    }
  });

  // Property Portal Settings routes
  app.get("/api/orgs/:orgId/properties/:propertyId/portal-settings", isAuthenticated, async (req, res) => {
    try {
      const { orgId, propertyId } = req.params;
      const { status } = req.query;
      
      if (status) {
        // Get latest settings for specific status
        const settings = await storage.getLatestPropertyPortalSettings(orgId, parseInt(propertyId), status as string);
        return res.json(settings || null);
      } else {
        // Get all settings versions
        const allSettings = await storage.getPropertyPortalSettings(orgId, parseInt(propertyId));
        return res.json(allSettings);
      }
    } catch (error) {
      console.error("Error fetching property portal settings:", error);
      res.status(500).json({ message: "Failed to fetch property portal settings" });
    }
  });

  app.post("/api/orgs/:orgId/properties/:propertyId/portal-settings", isAuthenticated, async (req: any, res) => {
    try {
      const { orgId, propertyId } = req.params;

      const callerOrgId = req.user?.claims?.orgId;
      const callerRole = req.user?.claims?.role;
      const superAdminSession = (req.session as any)?.superAdmin?.authenticated === true;
      if (!superAdminSession && (callerOrgId !== orgId || (callerRole !== "admin" && callerRole !== "owner"))) {
        return res.status(403).json({ message: "Forbidden: cannot modify portal settings for another organization" });
      }

      const { isFeatureEnabled } = await import("./featureFlags");
      const whiteLabelEnabled = await isFeatureEnabled(orgId, "white_label_branding");
      const submittedBranding =
        (req.body.branding && Object.keys(req.body.branding).length > 0) ||
        (req.body.theme && Object.keys(req.body.theme).length > 0);
      if (!whiteLabelEnabled && submittedBranding) {
        return res.status(403).json({
          message: "White label branding is disabled for this organization",
          code: "FEATURE_DISABLED",
          feature: "white_label_branding",
        });
      }

      // Get current branding level to enforce policy
      const brandingLevel = await getBrandingLevel(orgId);

      const brandingData = {
        branding: req.body.branding || {},
        theme: req.body.theme || {},
      };
      const allowedBranding = enforceBrandingPolicy(brandingLevel, brandingData);
      
      // Get the next version number
      const existingSettings = await storage.getPropertyPortalSettings(orgId, parseInt(propertyId));
      const nextVersion = existingSettings.length > 0 ? Math.max(...existingSettings.map(s => s.version)) + 1 : 1;
      
      const settingsData = {
        orgId,
        propertyId: parseInt(propertyId),
        version: nextVersion,
        status: req.body.status || "draft",
        branding: allowedBranding.branding,
        theme: allowedBranding.theme,
        layout: req.body.layout || {},
        modulesEnabled: req.body.modulesEnabled || { taskRequests: true, messages: true },
        copy: req.body.copy || {},
        legal: req.body.legal || {},
        i18n: req.body.i18n || { defaultLocale: "en", supportedLocales: ["en"] },
        featureFlags: req.body.featureFlags || [],
        authOptions: req.body.authOptions || { allowedLogin: "both", mfa: "sms" }
      };
      
      const parsedData = insertPropertyPortalSettingsSchema.parse(settingsData);
      const settings = await storage.createPropertyPortalSettings(parsedData);
      
      res.status(201).json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating property portal settings:", error);
      res.status(500).json({ message: "Failed to create property portal settings" });
    }
  });

  app.patch("/api/orgs/:orgId/properties/:propertyId/portal-settings/:settingsId", isAuthenticated, async (req: any, res) => {
    try {
      const { orgId, settingsId } = req.params;

      const callerOrgId = req.user?.claims?.orgId;
      const callerRole = req.user?.claims?.role;
      const superAdminSession = (req.session as any)?.superAdmin?.authenticated === true;
      if (!superAdminSession && (callerOrgId !== orgId || (callerRole !== "admin" && callerRole !== "owner"))) {
        return res.status(403).json({ message: "Forbidden: cannot modify portal settings for another organization" });
      }

      const { isFeatureEnabled } = await import("./featureFlags");
      const whiteLabelEnabled = await isFeatureEnabled(orgId, "white_label_branding");
      const submittedBranding =
        (req.body.branding && Object.keys(req.body.branding).length > 0) ||
        (req.body.theme && Object.keys(req.body.theme).length > 0);
      if (!whiteLabelEnabled && submittedBranding) {
        return res.status(403).json({
          message: "White label branding is disabled for this organization",
          code: "FEATURE_DISABLED",
          feature: "white_label_branding",
        });
      }

      // Get current branding level to enforce policy
      const brandingLevel = await getBrandingLevel(orgId);

      // Extract branding data and enforce policy if provided
      const updateData: any = { ...req.body };
      if (req.body.branding || req.body.theme) {
        const brandingData = {
          branding: req.body.branding || {},
          theme: req.body.theme || {}
        };
        const allowedBranding = enforceBrandingPolicy(brandingLevel, brandingData);
        updateData.branding = allowedBranding.branding;
        updateData.theme = allowedBranding.theme;
      }
      
      const settings = await storage.updatePropertyPortalSettings(settingsId, updateData);
      res.json(settings);
    } catch (error) {
      console.error("Error updating property portal settings:", error);
      res.status(500).json({ message: "Failed to update property portal settings" });
    }
  });

  app.post("/api/orgs/:orgId/properties/:propertyId/portal-settings/publish", isAuthenticated, async (req: any, res) => {
    try {
      const { orgId, propertyId } = req.params;

      const callerOrgId = req.user?.claims?.orgId;
      const callerRole = req.user?.claims?.role;
      const superAdminSession = (req.session as any)?.superAdmin?.authenticated === true;
      if (!superAdminSession && (callerOrgId !== orgId || (callerRole !== "admin" && callerRole !== "owner"))) {
        return res.status(403).json({ message: "Forbidden: cannot publish portal settings for another organization" });
      }

      const { version } = req.body;
      
      if (!version) {
        return res.status(400).json({ message: "Version is required" });
      }
      
      const settings = await storage.publishPropertyPortalSettings(orgId, parseInt(propertyId), version);
      res.json(settings);
    } catch (error) {
      console.error("Error publishing property portal settings:", error);
      res.status(500).json({ message: "Failed to publish property portal settings" });
    }
  });

  // Property Forms Assignment routes
  app.get("/api/orgs/:orgId/properties/:propertyId/forms", isAuthenticated, async (req, res) => {
    try {
      const { orgId, propertyId } = req.params;
      const propertyForms = await storage.getPropertyForms(orgId, propertyId);
      res.json(propertyForms);
    } catch (error) {
      console.error("Error fetching property forms:", error);
      res.status(500).json({ message: "Failed to fetch property forms" });
    }
  });

  app.post("/api/orgs/:orgId/properties/:propertyId/forms", isAuthenticated, async (req, res) => {
    try {
      const { orgId, propertyId } = req.params;
      const { form_id, sort_order, is_required } = req.body;

      if (!form_id) {
        return res.status(400).json({ error: "form_id is required" });
      }

      const assignment = await storage.assignFormToProperty(
        orgId, 
        propertyId, 
        form_id, 
        sort_order ?? 0, 
        !!is_required
      );
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning form to property:", error);
      if (error.message === "Form not found") {
        res.status(404).json({ error: "Form not found" });
      } else {
        res.status(500).json({ message: "Failed to assign form to property" });
      }
    }
  });

  app.delete("/api/orgs/:orgId/properties/:propertyId/forms", isAuthenticated, async (req, res) => {
    try {
      const { orgId, propertyId } = req.params;
      const { form_id } = req.query;

      if (!form_id) {
        return res.status(400).json({ error: "form_id required" });
      }

      await storage.removeFormFromProperty(orgId, propertyId, form_id as string);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error removing form from property:", error);
      res.status(500).json({ message: "Failed to remove form from property" });
    }
  });

  app.patch("/api/orgs/:orgId/properties/:propertyId/forms/:formId", isAuthenticated, async (req, res) => {
    try {
      const { orgId, propertyId, formId } = req.params;
      const { sort_order, is_required } = req.body;

      const updates: { sortOrder?: number, isRequired?: boolean } = {};
      if (sort_order !== undefined) updates.sortOrder = sort_order;
      if (is_required !== undefined) updates.isRequired = !!is_required;

      const assignment = await storage.updatePropertyFormAssignment(orgId, propertyId, formId, updates);
      res.json(assignment);
    } catch (error) {
      console.error("Error updating property form assignment:", error);
      res.status(500).json({ message: "Failed to update form assignment" });
    }
  });

  // Staff Forms Management routes
  app.post("/api/staff/forms", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers["x-tenant-org"] as string;
      if (!orgId) {
        return res.status(400).json({ error: "x-tenant-org header required" });
      }

      const { name, description, schema } = req.body;
      if (!name || !schema) {
        return res.status(400).json({ error: "name and schema are required" });
      }

      const form = await storage.createForm({
        orgId,
        name,
        description: description || null,
        schema
      });

      res.status(201).json(form);
    } catch (error) {
      console.error("Error creating form:", error);
      res.status(500).json({ message: "Failed to create form" });
    }
  });

  // Property Centers Forms Assignment (matching your API pattern)
  // New route under admin/client-portal
  app.post("/api/admin/client-portal/:propertyId/forms", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers["x-tenant-org"] as string;
      const { propertyId } = req.params;
      const { form_id, sort_order, is_required } = req.body;

      if (!orgId) {
        return res.status(400).json({ error: "x-tenant-org header required" });
      }

      if (!form_id) {
        return res.status(400).json({ error: "form_id is required" });
      }

      const assignment = await storage.assignFormToProperty(
        orgId, 
        propertyId, 
        form_id, 
        sort_order ?? 0, 
        !!is_required
      );
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning form to property:", error);
      if (error.message === "Form not found") {
        res.status(404).json({ error: "Form not found" });
      } else {
        res.status(500).json({ message: "Failed to assign form to property" });
      }
    }
  });

  // Backward compatibility redirect for property-centers API
  app.post("/api/property-centers/:propertyId/forms", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.headers["x-tenant-org"] as string;
      const { propertyId } = req.params;
      const { form_id, sort_order, is_required } = req.body;

      if (!orgId) {
        return res.status(400).json({ error: "x-tenant-org header required" });
      }

      if (!form_id) {
        return res.status(400).json({ error: "form_id is required" });
      }

      const assignment = await storage.assignFormToProperty(
        orgId, 
        propertyId, 
        form_id, 
        sort_order ?? 0, 
        !!is_required
      );
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning form to property:", error);
      if (error.message === "Form not found") {
        res.status(404).json({ error: "Form not found" });
      } else {
        res.status(500).json({ message: "Failed to assign form to property" });
      }
    }
  });

  // Backward compatibility redirects for property portal settings
  app.get("/api/orgs/:orgId/properties/:propertyId/portal-settings", (req, res) => {
    const { orgId, propertyId } = req.params;
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const redirectUrl = `/api/admin/client-portal/${orgId}/${propertyId}/settings${queryString ? `?${queryString}` : ''}`;
    res.redirect(308, redirectUrl);
  });

  app.post("/api/orgs/:orgId/properties/:propertyId/portal-settings", (req, res) => {
    const { orgId, propertyId } = req.params;
    const redirectUrl = `/api/admin/client-portal/${orgId}/${propertyId}/settings`;
    res.redirect(308, redirectUrl);
  });

  // New admin client portal API routes
  app.get("/api/admin/client-portal/:orgId/:propertyId/settings", isAuthenticated, async (req, res) => {
    try {
      const { orgId, propertyId } = req.params;
      const { status } = req.query;
      
      if (status) {
        const settings = await storage.getLatestPropertyPortalSettings(orgId, parseInt(propertyId), status as string);
        return res.json(settings || null);
      } else {
        const allSettings = await storage.getPropertyPortalSettings(orgId, parseInt(propertyId));
        return res.json(allSettings);
      }
    } catch (error) {
      console.error("Error fetching property portal settings:", error);
      res.status(500).json({ message: "Failed to fetch property portal settings" });
    }
  });

  app.post("/api/admin/client-portal/:orgId/:propertyId/settings", isAuthenticated, async (req, res) => {
    try {
      const { orgId, propertyId } = req.params;
      
      const brandingLevel = await getBrandingLevel(orgId);
      const brandingData = {
        branding: req.body.branding || {},
        theme: req.body.theme || {}
      };
      const allowedBranding = enforceBrandingPolicy(brandingLevel, brandingData);
      
      const existingSettings = await storage.getPropertyPortalSettings(orgId, parseInt(propertyId));
      const nextVersion = existingSettings.length > 0 ? Math.max(...existingSettings.map(s => s.version)) + 1 : 1;
      
      const settingsData = {
        orgId,
        propertyId: parseInt(propertyId),
        version: nextVersion,
        status: req.body.status || "draft",
        branding: allowedBranding.branding,
        theme: allowedBranding.theme,
        layout: req.body.layout || {},
        modulesEnabled: req.body.modulesEnabled || { taskRequests: true, messages: true },
        copy: req.body.copy || {},
        legal: req.body.legal || {},
        i18n: req.body.i18n || { defaultLocale: "en", supportedLocales: ["en"] },
        featureFlags: req.body.featureFlags || [],
        authOptions: req.body.authOptions || { allowedLogin: "both", mfa: "sms" }
      };
      
      const parsedData = insertPropertyPortalSettingsSchema.parse(settingsData);
      const settings = await storage.createPropertyPortalSettings(parsedData);
      
      res.status(201).json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating property portal settings:", error);
      res.status(500).json({ message: "Failed to create property portal settings" });
    }
  });

  app.post("/api/admin/client-portal/:orgId/:propertyId/settings/publish", isAuthenticated, async (req, res) => {
    try {
      const { orgId, propertyId } = req.params;
      const { version } = req.body;
      
      const settings = await storage.publishPropertyPortalSettings(orgId, parseInt(propertyId), version);
      res.json(settings);
    } catch (error) {
      console.error("Error publishing property portal settings:", error);
      res.status(500).json({ message: "Failed to publish property portal settings" });
    }
  });

  // ===== ADMIN API ALIASES =====
  // These routes provide the new admin namespace while keeping existing logic
  
  // 2a) Preview, Publish, Draft Save aliases
  app.get("/api/admin/client-portal/:propertyId/preview", (req, res, next) => {
    // Alias to existing property-centers preview logic
    req.url = req.url.replace("/api/admin/client-portal/", "/api/property-centers/");
    next();
  });

  app.post("/api/admin/client-portal/:propertyId/publish", (req, res, next) => {
    // Alias to existing property-centers publish logic
    req.url = req.url.replace("/api/admin/client-portal/", "/api/property-centers/");
    next();
  });

  app.put("/api/admin/client-portal/:propertyId/config", (req, res, next) => {
    // Alias to existing property-centers config logic
    req.url = req.url.replace("/api/admin/client-portal/", "/api/property-centers/");
    next();
  });

  // 2b) Forms assignment aliases (per property)  
  app.get("/api/admin/client-portal/:propertyId/forms", (req, res, next) => {
    // Alias to existing property-centers forms logic
    req.url = req.url.replace("/api/admin/client-portal/", "/api/property-centers/");
    next();
  });

  app.post("/api/admin/client-portal/:propertyId/forms", (req, res, next) => {
    // Alias to existing property-centers forms logic
    req.url = req.url.replace("/api/admin/client-portal/", "/api/property-centers/");
    next();
  });

  app.delete("/api/admin/client-portal/:propertyId/forms", (req, res, next) => {
    // Alias to existing property-centers forms logic  
    req.url = req.url.replace("/api/admin/client-portal/", "/api/property-centers/");
    next();
  });

  // 2c) Forms library aliases (org level)
  app.get("/api/admin/forms", (req, res, next) => {
    // Alias to existing staff forms logic
    req.url = req.url.replace("/api/admin/forms", "/api/staff/forms");
    next();
  });

  app.post("/api/admin/forms", (req, res, next) => {
    // Alias to existing staff forms logic
    req.url = req.url.replace("/api/admin/forms", "/api/staff/forms");
    next();
  });

  app.patch("/api/admin/forms", (req, res, next) => {
    // Alias to existing staff forms logic
    req.url = req.url.replace("/api/admin/forms", "/api/staff/forms");
    next();
  });

  // Client Forms API (forms available to clients for a property)
  app.get("/api/client/forms", async (req, res) => {
    try {
      const orgId = req.headers["x-tenant-org"] as string;
      const { property_id } = req.query;
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

      if (!orgId) {
        return res.status(400).json({ error: "x-tenant-org header required" });
      }

      if (!token) {
        return res.status(401).json({ error: "Client authentication required" });
      }

      if (!property_id) {
        return res.status(400).json({ error: "property_id query parameter required" });
      }

      // In a real implementation, you would verify the JWT token here
      // For now, we'll proceed with the property forms lookup
      const propertyForms = await storage.getPropertyForms(orgId, property_id as string);
      res.json(propertyForms);
    } catch (error) {
      console.error("Error fetching client forms:", error);
      res.status(500).json({ message: "Failed to fetch forms" });
    }
  });

  // Client Form Submission (matching your production pattern)
  app.post("/api/client/forms/:formId/submit", async (req, res) => {
    try {
      const orgId = req.headers["x-tenant-org"] as string;
      const { formId } = req.params;
      const { property_id, answers, files } = req.body;
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

      if (!orgId) {
        return res.status(400).json({ error: "x-tenant-org header required" });
      }

      if (!token) {
        return res.status(401).json({ error: "Client authentication required" });
      }

      if (!property_id || !answers) {
        return res.status(400).json({ error: "property_id and answers are required" });
      }

      // In a real implementation, you would extract client_id from JWT token
      // For testing, we'll use a placeholder client ID
      const clientId = "test-client-from-jwt";

      // Validate form submission
      const validation = await storage.validateFormSubmission(orgId, property_id, formId, answers);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.errors.join(", ") });
      }

      // Create submission
      const submission = await storage.createFormSubmission({
        orgId,
        propertyId: property_id,
        formId,
        submittedByClientId: clientId,
        answers,
        files: files || [],
        status: "received"
      });

      res.status(201).json({ ok: true, submission_id: submission.id });
    } catch (error) {
      console.error("Error creating form submission:", error);
      res.status(500).json({ message: "Failed to create form submission" });
    }
  });

  // Legacy endpoint for testing (keeping for backward compatibility)
  app.post("/api/orgs/:orgId/forms/:formId/submit", async (req, res) => {
    try {
      const { orgId, formId } = req.params;
      const { property_id, answers, files, client_id } = req.body;

      if (!client_id) {
        return res.status(401).json({ error: "Client authentication required" });
      }

      if (!property_id || !answers) {
        return res.status(400).json({ error: "property_id and answers are required" });
      }

      const validation = await storage.validateFormSubmission(orgId, property_id, formId, answers);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.errors.join(", ") });
      }

      const submission = await storage.createFormSubmission({
        orgId,
        propertyId: property_id,
        formId,
        submittedByClientId: client_id,
        answers,
        files: files || [],
        status: "received"
      });

      res.status(201).json({ ok: true, submission_id: submission.id });
    } catch (error) {
      console.error("Error creating form submission:", error);
      res.status(500).json({ message: "Failed to create form submission" });
    }
  });

  // Form Submissions management routes (staff-facing)
  app.get("/api/orgs/:orgId/form-submissions", isAuthenticated, async (req, res) => {
    try {
      const { orgId } = req.params;
      const { property_id, form_id } = req.query;
      
      const submissions = await storage.getFormSubmissions(
        orgId, 
        property_id as string, 
        form_id as string
      );
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching form submissions:", error);
      res.status(500).json({ message: "Failed to fetch form submissions" });
    }
  });

  app.get("/api/orgs/:orgId/form-submissions/:submissionId", isAuthenticated, async (req, res) => {
    try {
      const { orgId, submissionId } = req.params;
      const submission = await storage.getFormSubmission(orgId, submissionId);
      
      if (!submission) {
        return res.status(404).json({ message: "Form submission not found" });
      }
      
      res.json(submission);
    } catch (error) {
      console.error("Error fetching form submission:", error);
      res.status(500).json({ message: "Failed to fetch form submission" });
    }
  });

  app.patch("/api/orgs/:orgId/form-submissions/:submissionId/status", isAuthenticated, async (req, res) => {
    try {
      const { orgId, submissionId } = req.params;
      const { status } = req.body;
      
      if (!["received", "in_review", "accepted", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }

      const submission = await storage.updateFormSubmissionStatus(orgId, submissionId, status);
      res.json(submission);
    } catch (error) {
      console.error("Error updating form submission status:", error);
      res.status(500).json({ message: "Failed to update form submission status" });
    }
  });

  // Client portal routes
  app.get("/api/orgs/:orgId/clients", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const clients = await storage.getClients(orgId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post("/api/orgs/:orgId/clients", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const clientData = { ...req.body, orgId };
      
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  // Calendar routes
  app.get("/api/orgs/:orgId/calendars", isAuthenticated, async (req, res) => {
    try {
      const { orgId } = req.params;
      const calendars = await storage.getCalendars(orgId);
      res.json(calendars);
    } catch (error) {
      console.error("Error fetching calendars:", error);
      res.status(500).json({ message: "Failed to fetch calendars" });
    }
  });

  app.post("/api/orgs/:orgId/calendars", isAuthenticated, async (req, res) => {
    try {
      const { orgId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const validation = insertCalendarSchema.safeParse({
        ...req.body,
        orgId,
        createdById: userId
      });

      if (!validation.success) {
        return res.status(400).json({ message: "Invalid calendar data", errors: validation.error.issues });
      }

      const calendar = await storage.createCalendar(validation.data);
      res.status(201).json(calendar);
    } catch (error) {
      console.error("Error creating calendar:", error);
      res.status(500).json({ message: "Failed to create calendar" });
    }
  });

  app.patch("/api/orgs/:orgId/calendars/:calendarId", isAuthenticated, async (req, res) => {
    try {
      const { calendarId } = req.params;
      const calendar = await storage.updateCalendar(calendarId, req.body);
      res.json(calendar);
    } catch (error) {
      console.error("Error updating calendar:", error);
      res.status(500).json({ message: "Failed to update calendar" });
    }
  });

  app.delete("/api/orgs/:orgId/calendars/:calendarId", isAuthenticated, async (req, res) => {
    try {
      const { calendarId } = req.params;
      await storage.deleteCalendar(calendarId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting calendar:", error);
      res.status(500).json({ message: "Failed to delete calendar" });
    }
  });

  // Event routes
  // Helper function to detect and create conflict resolutions for overlapping events
  async function detectAndCreateEventConflicts(newEvent: any, orgId: string, requestedById: string) {
    try {
      // Get all events in the org
      const allEvents = await storage.getEvents(orgId);
      
      const newStart = new Date(newEvent.start).getTime();
      const newEnd = new Date(newEvent.end).getTime();
      
      const conflictingEvents: string[] = [];
      const conflictingUserIds: Set<string> = new Set();
      let conflictingPropertyId: number | null = null;
      let conflictingRoomId: number | null = null;
      let conflictType: 'staff' | 'property' | 'resource' = 'resource';
      
      // Check for overlapping events
      for (const event of allEvents) {
        // Skip the same event
        if (event.id === newEvent.id) continue;
        
        const eventStart = new Date(event.start).getTime();
        const eventEnd = new Date(event.end).getTime();
        
        // Check if events overlap
        const overlaps = (newStart < eventEnd && newEnd > eventStart);
        
        if (overlaps) {
          // Check for property conflicts
          if (event.propertyId && newEvent.propertyId && event.propertyId === newEvent.propertyId) {
            conflictingEvents.push(event.id);
            conflictingPropertyId = event.propertyId;
            conflictType = 'property';
          }
          
          // Check for room conflicts
          if (event.roomId && newEvent.roomId && event.roomId === newEvent.roomId) {
            if (!conflictingEvents.includes(event.id)) {
              conflictingEvents.push(event.id);
            }
            conflictingRoomId = event.roomId;
            if (conflictType !== 'property') {
              conflictType = 'resource';
            }
          }
          
          // Check for staff conflicts (overlapping attendees)
          const eventAttendees = await storage.getEventAttendees(event.id);
          const newEventAttendees = await storage.getEventAttendees(newEvent.id);
          
          for (const eventAttendee of eventAttendees) {
            for (const newAttendee of newEventAttendees) {
              if (eventAttendee.userId && newAttendee.userId && eventAttendee.userId === newAttendee.userId) {
                if (!conflictingEvents.includes(event.id)) {
                  conflictingEvents.push(event.id);
                }
                conflictingUserIds.add(eventAttendee.userId);
                if (conflictType !== 'property') {
                  conflictType = 'staff';
                }
              }
            }
          }
          
          // Check for staff out-of-office conflicts
          for (const newAttendee of newEventAttendees) {
            if (newAttendee.userId) {
              const activeOOO = await storage.getActiveOutOfOfficePeriod(newAttendee.userId);
              if (activeOOO) {
                const oooStart = new Date(activeOOO.startDate).getTime();
                const oooEnd = new Date(activeOOO.endDate).getTime();
                
                // Check if event falls within OOO period
                if ((newStart >= oooStart && newStart <= oooEnd) || 
                    (newEnd >= oooStart && newEnd <= oooEnd) ||
                    (newStart <= oooStart && newEnd >= oooEnd)) {
                  if (!conflictingEvents.includes(event.id)) {
                    conflictingEvents.push(event.id);
                  }
                  conflictingUserIds.add(newAttendee.userId);
                  if (conflictType !== 'property') {
                    conflictType = 'staff';
                  }
                }
              }
            }
          }
        }
      }
      
      // If conflicts found, create a conflict resolution record
      if (conflictingEvents.length > 0) {
        // Add the new event to the list of conflicting events
        const allConflictingEventIds = [...new Set([newEvent.id, ...conflictingEvents])];
        
        let resolutionNotes = `Automatically detected: ${conflictType} conflict with ${conflictingEvents.length} event(s)`;
        if (conflictingRoomId) {
          resolutionNotes += ` (Room ID: ${conflictingRoomId})`;
        }
        
        const conflictData = {
          orgId,
          conflictType,
          eventIds: allConflictingEventIds,
          userIds: Array.from(conflictingUserIds),
          propertyId: conflictingPropertyId,
          status: 'pending' as const,
          requestedById,
          resolutionNotes
        };
        
        await storage.createConflictResolution(conflictData);
        console.log(`Created conflict resolution for event ${newEvent.id} - ${conflictType} conflict detected`);
      }
    } catch (error) {
      console.error('Error detecting event conflicts:', error);
      // Don't fail the event creation/update if conflict detection fails
    }
  }
  
  // Helper function to detect conflicts when staff activates out-of-office
  async function detectOOOConflicts(userId: string, oooStart: Date, oooEnd: Date, orgId: string, requestedById: string) {
    try {
      // Get all future events in the org
      const allEvents = await storage.getEvents(orgId);
      
      const oooStartTime = new Date(oooStart).getTime();
      const oooEndTime = new Date(oooEnd).getTime();
      
      const conflictingEventIds: string[] = [];
      
      // Check each event to see if this user is an attendee and it falls within OOO period
      for (const event of allEvents) {
        const eventStart = new Date(event.start).getTime();
        const eventEnd = new Date(event.end).getTime();
        
        // Check if event overlaps with OOO period
        const overlapsOOO = (eventStart < oooEndTime && eventEnd > oooStartTime);
        
        if (overlapsOOO) {
          // Check if the OOO user is an attendee
          const attendees = await storage.getEventAttendees(event.id);
          const isAttendee = attendees.some(a => a.userId === userId);
          
          if (isAttendee) {
            conflictingEventIds.push(event.id);
          }
        }
      }
      
      // If conflicts found, create a conflict resolution record
      if (conflictingEventIds.length > 0) {
        const conflictData = {
          orgId,
          conflictType: 'staff' as const,
          eventIds: conflictingEventIds,
          userIds: [userId],
          propertyId: null,
          status: 'pending' as const,
          requestedById,
          resolutionNotes: `Staff member activated out-of-office from ${oooStart.toLocaleDateString()} to ${oooEnd.toLocaleDateString()}. ${conflictingEventIds.length} event(s) affected.`
        };
        
        await storage.createConflictResolution(conflictData);
        console.log(`Created OOO conflict resolution for user ${userId} - ${conflictingEventIds.length} events affected`);
      }
    } catch (error) {
      console.error('Error detecting OOO conflicts:', error);
      // Don't fail the OOO creation if conflict detection fails
    }
  }

  app.get("/api/orgs/:orgId/events", isAuthenticated, async (req, res) => {
    try {
      const { orgId } = req.params;
      const { start, end, calendar_id } = req.query;
      
      const startDate = start ? new Date(start as string) : undefined;
      const endDate = end ? new Date(end as string) : undefined;
      
      // Fetch calendar events
      const events = await storage.getEvents(orgId, startDate, endDate, calendar_id as string);
      
      // Fetch attendees for each event
      const eventsWithAttendees = await Promise.all(
        events.map(async (event) => {
          const attendees = await storage.getEventAttendees(event.id);
          return { ...event, attendees };
        })
      );
      
      // Fetch all tasks and filter to this organization's tasks with due dates
      const allTasks = await storage.getTasks();
      const orgTasks = allTasks.filter(task => 
        task.property?.id && 
        task.dueDate && 
        !task.isArchived &&
        task.status !== 'completed' &&
        task.status !== 'cancelled'
      );
      
      // Get properties for this org to filter tasks
      const allProperties = await storage.getProperties();
      const orgProperties = allProperties.filter(p => p.orgId === orgId);
      const propertyIds = new Set(orgProperties.map(p => p.id));
      
      // Filter tasks to only those belonging to this org's properties
      const orgTasksFiltered = orgTasks.filter(task => 
        task.propertyId && propertyIds.has(task.propertyId)
      );
      
      // Transform tasks into calendar event format (tasks don't have attendees)
      const taskEvents = orgTasksFiltered.map(task => ({
        id: `task-${task.id}`,
        title: task.title,
        start: task.dueDate,
        end: task.dueDate,
        allDay: true,
        description: task.description || '',
        location: task.property ? `${task.property.address1}, ${task.property.city}` : '',
        calendarId: null,
        type: 'task',
        taskId: task.id,
        priority: task.priority,
        status: task.status,
        propertyName: task.property?.name,
        attendees: []
      }));
      
      // Combine calendar events and task events
      const allEvents = [...eventsWithAttendees, ...taskEvents];
      
      res.json(allEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get("/api/orgs/:orgId/events/:eventId", isAuthenticated, async (req, res) => {
    try {
      const { eventId } = req.params;
      const event = await storage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const attendees = await storage.getEventAttendees(eventId);
      const reminders = await storage.getEventReminders(eventId);
      
      res.json({ ...event, attendees, reminders });
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.post("/api/orgs/:orgId/events", isAuthenticated, async (req, res) => {
    try {
      const { orgId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { attendees, reminders, ...eventData } = req.body;

      // Convert date strings to Date objects for validation
      const processedEventData = {
        ...eventData,
        start: eventData.start ? new Date(eventData.start) : eventData.start,
        end: eventData.end ? new Date(eventData.end) : eventData.end,
      };

      const validation = insertEventSchema.safeParse({
        ...processedEventData,
        orgId,
        organizerId: userId,
        createdById: userId
      });

      if (!validation.success) {
        return res.status(400).json({ message: "Invalid event data", errors: validation.error.issues });
      }

      const event = await storage.createEvent(validation.data);
      
      if (attendees && Array.isArray(attendees)) {
        for (const attendee of attendees) {
          await storage.addEventAttendee({
            ...attendee,
            eventId: event.id
          });
        }
      }
      
      if (reminders && Array.isArray(reminders)) {
        for (const reminder of reminders) {
          await storage.addEventReminder({
            ...reminder,
            eventId: event.id
          });
        }
      }
      
      // Detect and create conflict resolutions for overlapping events
      await detectAndCreateEventConflicts(event, orgId, userId);
      
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.patch("/api/orgs/:orgId/events/:eventId", isAuthenticated, async (req, res) => {
    try {
      const { orgId, eventId } = req.params;
      const { attendees, reminders, ...eventData } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const event = await storage.updateEvent(eventId, eventData);
      
      if (attendees) {
        const existingAttendees = await storage.getEventAttendees(eventId);
        for (const existing of existingAttendees) {
          await storage.removeEventAttendee(existing.id);
        }
        
        for (const attendee of attendees) {
          await storage.addEventAttendee({
            ...attendee,
            eventId: event.id
          });
        }
      }
      
      if (reminders) {
        const existingReminders = await storage.getEventReminders(eventId);
        for (const existing of existingReminders) {
          await storage.removeEventReminder(existing.id);
        }
        
        for (const reminder of reminders) {
          await storage.addEventReminder({
            ...reminder,
            eventId: event.id
          });
        }
      }
      
      // Detect and create conflict resolutions for overlapping events
      await detectAndCreateEventConflicts(event, orgId, userId);
      
      res.json(event);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete("/api/orgs/:orgId/events/:eventId", isAuthenticated, async (req, res) => {
    try {
      const { eventId } = req.params;
      await storage.deleteEvent(eventId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Event attendee routes
  app.get("/api/orgs/:orgId/events/:eventId/attendees", isAuthenticated, async (req, res) => {
    try {
      const { orgId, eventId } = req.params;
      
      // Tasks displayed as events (e.g., "task-36") don't have attendees
      if (eventId.startsWith('task-')) {
        return res.json([]);
      }
      
      // Verify event belongs to org
      const event = await storage.getEvent(eventId);
      if (!event || event.orgId !== orgId) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const attendees = await storage.getEventAttendees(eventId);
      res.json(attendees);
    } catch (error) {
      console.error("Error fetching attendees:", error);
      res.status(500).json({ message: "Failed to fetch attendees" });
    }
  });

  app.post("/api/orgs/:orgId/events/:eventId/attendees", isAuthenticated, async (req, res) => {
    try {
      const { orgId, eventId } = req.params;
      
      // Verify event belongs to org
      const event = await storage.getEvent(eventId);
      if (!event || event.orgId !== orgId) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const validation = insertEventAttendeeSchema.safeParse({
        ...req.body,
        eventId
      });

      if (!validation.success) {
        return res.status(400).json({ message: "Invalid attendee data", errors: validation.error.issues });
      }

      const attendee = await storage.addEventAttendee(validation.data);
      
      // Send email invitation after successfully adding attendee
      try {
        // Get organization for branding
        const org = await storage.getOrg(orgId);
        if (!org) {
          console.warn("Organization not found for email invitation");
          return res.status(201).json(attendee);
        }
        
        // Get attendee email and name
        let attendeeEmail: string | undefined;
        let attendeeName: string | undefined;
        
        if (attendee.userId) {
          const user = await storage.getUser(attendee.userId);
          if (user) {
            attendeeEmail = user.email;
            attendeeName = `${user.firstName} ${user.lastName}`;
          }
        } else if (attendee.clientId) {
          const client = await storage.getClient(attendee.clientId);
          if (client) {
            attendeeEmail = client.email;
            attendeeName = `${client.firstName} ${client.lastName}`;
          }
        } else if (attendee.email) {
          attendeeEmail = attendee.email;
          attendeeName = attendee.name || attendee.email;
        }
        
        if (!attendeeEmail) {
          console.warn("No email found for attendee, skipping invitation");
          return res.status(201).json(attendee);
        }
        
        // Get related entities for email content
        let propertyName: string | undefined;
        let taskTitle: string | undefined;
        let clientName: string | undefined;
        
        if (event.propertyId) {
          const property = await storage.getProperty(event.propertyId);
          if (property) {
            propertyName = property.name;
          }
        }
        
        if (event.taskId) {
          const task = await storage.getTask(event.taskId);
          if (task) {
            taskTitle = task.title;
          }
        }
        
        if (event.clientId) {
          const client = await storage.getClient(event.clientId);
          if (client) {
            clientName = `${client.firstName} ${client.lastName}`;
          }
        }
        
        // Send email invitation
        const { sendEventInvitationEmail } = await import('./emailUtils.js');
        await sendEventInvitationEmail(
          attendeeEmail,
          attendeeName,
          {
            eventTitle: event.title,
            eventDescription: event.description || undefined,
            eventLocation: event.location || undefined,
            eventStart: new Date(event.start),
            eventEnd: new Date(event.end),
            organizationName: org.name,
            organizationBranding: org.branding as any,
            propertyName,
            taskTitle,
            clientName,
          }
        );
        
        console.log(`Event invitation email sent to ${attendeeEmail} (${attendeeName})`);
      } catch (emailError) {
        // Log email error but don't fail the request
        console.error("Error sending event invitation email:", emailError);
      }
      
      res.status(201).json(attendee);
    } catch (error) {
      console.error("Error adding attendee:", error);
      res.status(500).json({ message: "Failed to add attendee" });
    }
  });

  app.patch("/api/orgs/:orgId/events/:eventId/attendees/:attendeeId", isAuthenticated, async (req, res) => {
    try {
      const { orgId, eventId, attendeeId } = req.params;
      
      // Verify event belongs to org
      const event = await storage.getEvent(eventId);
      if (!event || event.orgId !== orgId) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const attendee = await storage.updateEventAttendee(parseInt(attendeeId), req.body);
      res.json(attendee);
    } catch (error) {
      console.error("Error updating attendee:", error);
      res.status(500).json({ message: "Failed to update attendee" });
    }
  });

  app.delete("/api/orgs/:orgId/events/:eventId/attendees/:attendeeId", isAuthenticated, async (req, res) => {
    try {
      const { orgId, eventId, attendeeId } = req.params;
      
      // Verify event belongs to org
      const event = await storage.getEvent(eventId);
      if (!event || event.orgId !== orgId) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      await storage.removeEventAttendee(parseInt(attendeeId));
      res.status(204).send();
    } catch (error) {
      console.error("Error removing attendee:", error);
      res.status(500).json({ message: "Failed to remove attendee" });
    }
  });

  // Preview event invitation email
  app.get("/api/orgs/:orgId/events/:eventId/email-preview", isAuthenticated, async (req, res) => {
    try {
      const { orgId, eventId } = req.params;
      
      // Get event
      const event = await storage.getEvent(eventId);
      if (!event || event.orgId !== orgId) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Get organization for branding
      const org = await storage.getOrg(orgId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Get related entities for display
      let propertyName: string | undefined;
      let taskTitle: string | undefined;
      let clientName: string | undefined;
      
      if (event.propertyId) {
        const property = await storage.getProperty(event.propertyId);
        if (property) {
          propertyName = property.name;
        }
      }
      
      if (event.taskId) {
        const task = await storage.getTask(event.taskId);
        if (task) {
          taskTitle = task.title;
        }
      }
      
      if (event.clientId) {
        const client = await storage.getClient(event.clientId);
        if (client) {
          clientName = `${client.firstName} ${client.lastName}`;
        }
      }
      
      // Generate preview HTML
      const { generateEventInvitationHTML } = await import('./emailUtils.js');
      const html = generateEventInvitationHTML({
        eventTitle: event.title,
        eventDescription: event.description || undefined,
        eventLocation: event.location || undefined,
        eventStart: new Date(event.start),
        eventEnd: new Date(event.end),
        organizationName: org.name,
        organizationBranding: org.branding as any,
        propertyName,
        taskTitle,
        clientName,
      });
      
      res.send(html);
    } catch (error) {
      console.error("Error generating email preview:", error);
      res.status(500).json({ message: "Failed to generate email preview" });
    }
  });

  // Scan all existing events for conflicts
  app.post("/api/orgs/:orgId/conflicts/scan", isAuthenticated, async (req, res) => {
    try {
      const { orgId } = req.params;
      
      // Get full user data from database
      const userId = (req.user as any)?.claims?.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Only supervisors and admins can scan for conflicts
      if (user.role !== 'supervisor' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Only supervisors and admins can scan for conflicts." });
      }
      
      // Verify user belongs to org
      if (user.orgId !== orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get all events
      const allEvents = await storage.getEvents(orgId);
      let conflictsCreated = 0;
      
      // Scan each event for conflicts
      for (const event of allEvents) {
        const count = await detectAndCreateEventConflicts(event, orgId, userId);
        conflictsCreated += count;
      }
      
      res.json({ 
        message: "Conflict scan complete", 
        eventsScanned: allEvents.length,
        conflictsDetected: conflictsCreated
      });
    } catch (error) {
      console.error("Error scanning for conflicts:", error);
      res.status(500).json({ message: "Failed to scan for conflicts" });
    }
  });

  // Conflict resolution routes
  app.get("/api/orgs/:orgId/conflicts", isAuthenticated, async (req, res) => {
    try {
      const { orgId } = req.params;
      const { status } = req.query;
      
      // Get full user data from database
      const userId = (req.user as any)?.claims?.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Only supervisors and admins can view conflicts
      if (user.role !== 'supervisor' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Only supervisors and admins can view conflicts." });
      }
      
      // Verify user belongs to org
      if (user.orgId !== orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const conflicts = await storage.getConflictResolutions(orgId, status as string);
      res.json(conflicts);
    } catch (error) {
      console.error("Error fetching conflicts:", error);
      res.status(500).json({ message: "Failed to fetch conflicts" });
    }
  });

  app.get("/api/orgs/:orgId/conflicts/:id", isAuthenticated, async (req, res) => {
    try {
      const { orgId, id } = req.params;
      
      // Get full user data from database
      const userId = (req.user as any)?.claims?.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Only supervisors and admins can view conflicts
      if (user.role !== 'supervisor' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Only supervisors and admins can view conflicts." });
      }
      
      // Verify user belongs to org
      if (user.orgId !== orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const conflict = await storage.getConflictResolution(parseInt(id));
      if (!conflict || conflict.orgId !== orgId) {
        return res.status(404).json({ message: "Conflict not found" });
      }
      
      res.json(conflict);
    } catch (error) {
      console.error("Error fetching conflict:", error);
      res.status(500).json({ message: "Failed to fetch conflict" });
    }
  });

  app.post("/api/orgs/:orgId/conflicts", isAuthenticated, async (req, res) => {
    try {
      const { orgId } = req.params;
      
      // Get full user data from database
      const userId = (req.user as any)?.claims?.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Only supervisors and admins can create conflicts
      if (user.role !== 'supervisor' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Only supervisors and admins can create conflicts." });
      }
      
      // Verify user belongs to org
      if (user.orgId !== orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const validation = insertConflictResolutionSchema.safeParse({
        ...req.body,
        orgId,
        requestedById: userId
      });
      
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid conflict data", errors: validation.error.issues });
      }
      
      const conflict = await storage.createConflictResolution(validation.data);
      res.status(201).json(conflict);
    } catch (error) {
      console.error("Error creating conflict:", error);
      res.status(500).json({ message: "Failed to create conflict" });
    }
  });

  app.patch("/api/orgs/:orgId/conflicts/:id/approve", isAuthenticated, async (req, res) => {
    try {
      const { orgId, id } = req.params;
      const { notes } = req.body;
      
      // Get full user data from database
      const userId = (req.user as any)?.claims?.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Only supervisors and admins can approve conflicts
      if (user.role !== 'supervisor' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Only supervisors and admins can approve conflicts." });
      }
      
      // Verify user belongs to org
      if (user.orgId !== orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const conflict = await storage.getConflictResolution(parseInt(id));
      if (!conflict || conflict.orgId !== orgId) {
        return res.status(404).json({ message: "Conflict not found" });
      }
      
      const updated = await storage.approveConflictResolution(parseInt(id), userId, notes);
      res.json(updated);
    } catch (error) {
      console.error("Error approving conflict:", error);
      res.status(500).json({ message: "Failed to approve conflict" });
    }
  });

  app.patch("/api/orgs/:orgId/conflicts/:id/reject", isAuthenticated, async (req, res) => {
    try {
      const { orgId, id } = req.params;
      const { notes } = req.body;
      
      // Get full user data from database
      const userId = (req.user as any)?.claims?.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Only supervisors and admins can reject conflicts
      if (user.role !== 'supervisor' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Only supervisors and admins can reject conflicts." });
      }
      
      // Verify user belongs to org
      if (user.orgId !== orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const conflict = await storage.getConflictResolution(parseInt(id));
      if (!conflict || conflict.orgId !== orgId) {
        return res.status(404).json({ message: "Conflict not found" });
      }
      
      const updated = await storage.rejectConflictResolution(parseInt(id), userId, notes);
      res.json(updated);
    } catch (error) {
      console.error("Error rejecting conflict:", error);
      res.status(500).json({ message: "Failed to reject conflict" });
    }
  });

  app.patch("/api/orgs/:orgId/conflicts/:id/resolve", isAuthenticated, async (req, res) => {
    try {
      const { orgId, id } = req.params;
      const { notes } = req.body;
      
      // Get full user data from database
      const userId = (req.user as any)?.claims?.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Only supervisors and admins can resolve conflicts
      if (user.role !== 'supervisor' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Only supervisors and admins can resolve conflicts." });
      }
      
      // Verify user belongs to org
      if (user.orgId !== orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const conflict = await storage.getConflictResolution(parseInt(id));
      if (!conflict || conflict.orgId !== orgId) {
        return res.status(404).json({ message: "Conflict not found" });
      }
      
      const updated = await storage.resolveConflictResolution(parseInt(id), notes);
      res.json(updated);
    } catch (error) {
      console.error("Error resolving conflict:", error);
      res.status(500).json({ message: "Failed to resolve conflict" });
    }
  });

  app.delete("/api/orgs/:orgId/conflicts/:id", isAuthenticated, async (req, res) => {
    try {
      const { orgId, id } = req.params;
      
      // Get full user data from database
      const userId = (req.user as any)?.claims?.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Only supervisors and admins can delete conflicts
      if (user.role !== 'supervisor' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Only supervisors and admins can delete conflicts." });
      }
      
      // Verify user belongs to org
      if (user.orgId !== orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const conflict = await storage.getConflictResolution(parseInt(id));
      if (!conflict || conflict.orgId !== orgId) {
        return res.status(404).json({ message: "Conflict not found" });
      }
      
      await storage.deleteConflictResolution(parseInt(id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conflict:", error);
      res.status(500).json({ message: "Failed to delete conflict" });
    }
  });

  app.get("/api/users/:userId/pending-conflicts", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Verify user is requesting their own conflicts or is an admin
      if (req.user?.id !== userId && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const conflicts = await storage.getPendingConflictsByUser(userId);
      res.json(conflicts);
    } catch (error) {
      console.error("Error fetching pending conflicts:", error);
      res.status(500).json({ message: "Failed to fetch pending conflicts" });
    }
  });

  // Stripe routes - Master billing (Hubify billing organizations)
  app.get("/api/stripe/subscriptions", isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const subscriptions = await storage.getAllOrgSubscriptions();
      res.json(subscriptions);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  app.post("/api/stripe/create-subscription", isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { orgId, orgName, email, priceId } = req.body;
      const { createSubscription } = await import("./stripe");
      
      const result = await createSubscription(orgId, orgName, email, priceId);
      res.json(result);
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.post("/api/stripe/cancel-subscription", isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { orgId, cancelAtPeriodEnd } = req.body;
      const { cancelSubscription } = await import("./stripe");
      
      const result = await cancelSubscription(orgId, cancelAtPeriodEnd);
      res.json(result);
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // NOTE: Stripe webhook endpoints are registered in server/index.ts BEFORE express.json() middleware
  // to preserve raw request body for signature verification

  // Stripe routes - Per-organization connections
  app.get("/api/orgs/:orgId/stripe-connection", isAuthenticated, async (req, res) => {
    try {
      const { orgId } = req.params;
      
      // Verify user belongs to org
      if (req.user?.orgId !== orgId && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const connection = await storage.getOrgStripeConnection(orgId);
      
      // Hide sensitive data
      if (connection) {
        const { stripeSecretKey, accessToken, refreshToken, ...safeConnection } = connection;
        res.json(safeConnection);
      } else {
        res.json(null);
      }
    } catch (error) {
      console.error("Error fetching Stripe connection:", error);
      res.status(500).json({ message: "Failed to fetch Stripe connection" });
    }
  });

  app.post("/api/orgs/:orgId/stripe-connection", isAuthenticated, async (req, res) => {
    try {
      const { orgId } = req.params;
      
      // Verify user belongs to org or is platform admin
      if (req.user?.orgId !== orgId && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { accountType, stripePublishableKey, stripeSecretKey } = req.body;

      if (accountType === "direct") {
        const connection = await storage.createOrgStripeConnection({
          orgId,
          accountType: "direct",
          stripePublishableKey,
          stripeSecretKey, // TODO: Encrypt in production
          isActive: true,
        });

        const { stripeSecretKey: _, ...safeConnection } = connection;
        res.status(201).json(safeConnection);
      } else if (accountType === "connect") {
        const org = await storage.getOrg(orgId);
        if (!org) {
          return res.status(404).json({ message: "Organization not found" });
        }

        const { createStripeConnectAccount } = await import("./stripe");
        const account = await createStripeConnectAccount(orgId, org.name, req.user.email || "");
        
        res.status(201).json({ accountId: account.id });
      } else {
        res.status(400).json({ message: "Invalid account type" });
      }
    } catch (error) {
      console.error("Error creating Stripe connection:", error);
      res.status(500).json({ message: "Failed to create Stripe connection" });
    }
  });

  app.delete("/api/orgs/:orgId/stripe-connection", isAuthenticated, async (req, res) => {
    try {
      const { orgId } = req.params;
      
      // Verify user belongs to org or is platform admin
      if (req.user?.orgId !== orgId && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteOrgStripeConnection(orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting Stripe connection:", error);
      res.status(500).json({ message: "Failed to delete Stripe connection" });
    }
  });

  app.post("/api/orgs/:orgId/stripe-connect/account-link", isAuthenticated, async (req, res) => {
    try {
      const { orgId } = req.params;
      const { accountId, returnUrl, refreshUrl } = req.body;
      
      // Verify user belongs to org or is platform admin
      if (req.user?.orgId !== orgId && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { createStripeConnectAccountLink } = await import("./stripe");
      const accountLink = await createStripeConnectAccountLink(accountId, returnUrl, refreshUrl);
      
      res.json(accountLink);
    } catch (error) {
      console.error("Error creating account link:", error);
      res.status(500).json({ message: "Failed to create account link" });
    }
  });

  // Organizations list endpoint for admin
  app.get("/api/organizations", isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const orgs = await storage.getOrgs();
      res.json(orgs);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  // Supply settings endpoints
  app.get("/api/organizations/:id/supply-settings", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userOrgId = req.user?.claims?.orgId;
      
      // Verify user belongs to org or is platform admin
      if (userOrgId !== id && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const settings = await storage.getOrgSupplySettings(id);
      if (!settings) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error fetching supply settings:", error);
      res.status(500).json({ message: "Failed to fetch supply settings" });
    }
  });

  app.patch("/api/organizations/:id/supply-settings", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { supplyTypes, supplyUnits } = req.body;
      const userOrgId = req.user?.claims?.orgId;
      
      // Verify user belongs to org or is platform admin
      if (userOrgId !== id && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate that arrays are provided
      if (!Array.isArray(supplyTypes) && !Array.isArray(supplyUnits)) {
        return res.status(400).json({ message: "Supply types or units must be arrays" });
      }

      const updated = await storage.updateOrgSupplySettings(id, { supplyTypes, supplyUnits });
      if (!updated) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating supply settings:", error);
      res.status(500).json({ message: "Failed to update supply settings" });
    }
  });

  // Platform Invoice routes (Admin → Organizations)
  const statusEnum = z.enum(["draft", "open", "paid", "void", "uncollectible"]);
  
  app.get("/api/admin/invoices", isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { orgId, status } = req.query;
      
      // Validate status if provided
      const validatedStatus = status ? statusEnum.optional().parse(status) : undefined;
      
      const invoices = await storage.getPlatformInvoices(
        orgId as string | undefined,
        validatedStatus
      );
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching platform invoices:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid status filter", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/admin/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const invoice = await storage.getPlatformInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.post("/api/admin/invoices", isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertPlatformInvoiceSchema.parse(req.body);
      const invoice = await storage.createPlatformInvoice(validatedData);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid invoice data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.patch("/api/admin/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertPlatformInvoiceSchema.partial().parse(req.body);
      const invoice = await storage.updatePlatformInvoice(req.params.id, validatedData);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.json(invoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid invoice data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  app.delete("/api/admin/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const existing = await storage.getPlatformInvoice(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      await storage.deletePlatformInvoice(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // Admin Notes Search - Search across all note types in the system
  app.get("/api/admin/notes/search", isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { q: searchQuery } = req.query;
      const orgId = req.user?.claims?.orgId;

      if (!orgId) {
        return res.status(403).json({ message: "Organization required" });
      }

      const results = await storage.searchAllNotes(orgId, searchQuery as string || "");
      res.json(results);
    } catch (error) {
      console.error("Error searching notes:", error);
      res.status(500).json({ message: "Failed to search notes" });
    }
  });

  // Upload/Download endpoints for admin platform invoices
  app.post("/api/admin/invoices/:id/upload", uploadInvoice.single('file'), isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const invoice = await storage.getPlatformInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const objectStorage = new ObjectStorageService();
      const ext = path.extname(req.file.originalname);
      const contentType = req.file.mimetype;
      const storageKey = `invoices/platform/${invoice.orgId}/${req.params.id}${ext}`;
      
      try {
        await objectStorage.uploadFile(
          req.file.path,
          storageKey,
          contentType
        );

        // Update invoice with storage key
        const updatedInvoice = await storage.updatePlatformInvoice(req.params.id, { pdfStorageKey: storageKey });
        res.json({ pdfStorageKey: storageKey, invoice: updatedInvoice });
      } finally {
        // Clean up temp file (non-blocking, ignore errors)
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error("Failed to clean up temp file:", cleanupError);
        }
      }
    } catch (error) {
      console.error("Error uploading invoice PDF:", error);
      res.status(500).json({ message: "Failed to upload PDF" });
    }
  });

  app.get("/api/admin/invoices/:id/download", isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const invoice = await storage.getPlatformInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (!invoice.pdfStorageKey) {
        return res.status(404).json({ message: "No PDF available for this invoice" });
      }

      const objectStorage = new ObjectStorageService();
      const signedUrl = await objectStorage.getSignedUrl(invoice.pdfStorageKey, 3600);
      
      res.json({ downloadUrl: signedUrl });
    } catch (error) {
      console.error("Error generating download URL:", error);
      res.status(500).json({ message: "Failed to generate download URL" });
    }
  });

  // Organization platform invoice routes (View their invoices from Hubify)
  app.get("/api/orgs/:orgId/platform-invoices", isAuthenticated, async (req, res) => {
    try {
      const { orgId } = req.params;
      
      // Verify user belongs to org
      if (req.user?.orgId !== orgId && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const { status } = req.query;
      const validatedStatus = status ? statusEnum.optional().parse(status) : undefined;
      
      const invoices = await storage.getPlatformInvoices(orgId, validatedStatus);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching org platform invoices:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid status filter", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/orgs/:orgId/platform-invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const { orgId, id } = req.params;
      
      // Verify user belongs to org
      if (req.user?.orgId !== orgId && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const invoice = await storage.getPlatformInvoice(id, orgId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching platform invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.get("/api/orgs/:orgId/platform-invoices/:id/download", isAuthenticated, async (req, res) => {
    try {
      const { orgId, id } = req.params;
      
      // Verify user belongs to org
      if (req.user?.orgId !== orgId && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const invoice = await storage.getPlatformInvoice(id, orgId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (!invoice.pdfStorageKey) {
        return res.status(404).json({ message: "No PDF available for this invoice" });
      }

      const objectStorage = new ObjectStorageService();
      const signedUrl = await objectStorage.getSignedUrl(invoice.pdfStorageKey, 3600);
      
      res.json({ downloadUrl: signedUrl });
    } catch (error) {
      console.error("Error generating download URL:", error);
      res.status(500).json({ message: "Failed to generate download URL" });
    }
  });

  // Client Invoice routes (Organizations → Clients)
  app.get("/api/orgs/:orgId/clients/:clientId/invoices", isAuthenticated, async (req, res) => {
    try {
      const { orgId, clientId } = req.params;
      
      // Verify user belongs to org
      if (req.user?.orgId !== orgId && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const { status } = req.query;
      const validatedStatus = status ? statusEnum.optional().parse(status) : undefined;
      
      const invoices = await storage.getClientInvoices(orgId, clientId, validatedStatus);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching client invoices:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid status filter", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/orgs/:orgId/client-invoices", isAuthenticated, async (req, res) => {
    try {
      const { orgId } = req.params;
      
      // Get orgId and role from OIDC claims
      const userOrgId = (req.user as any)?.claims?.orgId || (req.user as any)?.claims?.org_id;
      const userRole = (req.user as any)?.claims?.role;
      
      // Verify user belongs to org or is admin
      if (userOrgId !== orgId && userRole !== "admin" && userRole !== "supervisor") {
        return res.status(403).json({ message: "Access denied" });
      }

      const { status } = req.query;
      const validatedStatus = status ? statusEnum.optional().parse(status) : undefined;
      
      const invoices = await storage.getClientInvoices(orgId, undefined, validatedStatus);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching client invoices:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid status filter", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/orgs/:orgId/client-invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const { orgId, id } = req.params;
      
      // Verify user belongs to org
      if (req.user?.orgId !== orgId && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const invoice = await storage.getClientInvoice(orgId, id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching client invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.post("/api/orgs/:orgId/clients/:clientId/invoices", isAuthenticated, async (req, res) => {
    try {
      const { orgId, clientId } = req.params;
      
      // Verify user belongs to org
      if (req.user?.orgId !== orgId && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedData = insertClientInvoiceSchema.parse({
        ...req.body,
        orgId,
        clientId,
        createdBy: req.user.claims.sub,
      });
      
      const invoice = await storage.createClientInvoice(validatedData);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating client invoice:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid invoice data", errors: error.errors });
      }
      res.status(500).json({ message: (error as Error).message || "Failed to create invoice" });
    }
  });

  app.patch("/api/orgs/:orgId/client-invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const { orgId, id } = req.params;
      
      // Verify user belongs to org
      if (req.user?.orgId !== orgId && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedData = insertClientInvoiceSchema.partial().parse(req.body);
      const invoice = await storage.updateClientInvoice(orgId, id, validatedData);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.json(invoice);
    } catch (error) {
      console.error("Error updating client invoice:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid invoice data", errors: error.errors });
      }
      res.status(500).json({ message: (error as Error).message || "Failed to update invoice" });
    }
  });

  app.delete("/api/orgs/:orgId/client-invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const { orgId, id } = req.params;
      
      // Verify user belongs to org
      if (req.user?.orgId !== orgId && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const existing = await storage.getClientInvoice(orgId, id);
      if (!existing) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      await storage.deleteClientInvoice(orgId, id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // Upload/Download endpoints for client invoices
  app.post("/api/orgs/:orgId/client-invoices/:id/upload", uploadInvoice.single('file'), isAuthenticated, async (req, res) => {
    try {
      const { orgId, id } = req.params;
      
      // Verify user belongs to org
      if (req.user?.orgId !== orgId && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const invoice = await storage.getClientInvoice(orgId, id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const objectStorage = new ObjectStorageService();
      const ext = path.extname(req.file.originalname);
      const contentType = req.file.mimetype;
      const storageKey = `invoices/org/${orgId}/clients/${invoice.clientId}/${id}${ext}`;
      
      try {
        await objectStorage.uploadFile(
          req.file.path,
          storageKey,
          contentType
        );

        // Update invoice with storage key
        const updatedInvoice = await storage.updateClientInvoice(orgId, id, { pdfStorageKey: storageKey });
        res.json({ pdfStorageKey: storageKey, invoice: updatedInvoice });
      } finally {
        // Clean up temp file (non-blocking, ignore errors)
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error("Failed to clean up temp file:", cleanupError);
        }
      }
    } catch (error) {
      console.error("Error uploading client invoice PDF:", error);
      res.status(500).json({ message: "Failed to upload PDF" });
    }
  });

  app.get("/api/orgs/:orgId/client-invoices/:id/download", isAuthenticated, async (req, res) => {
    try {
      const { orgId, id } = req.params;
      
      // Verify user belongs to org
      if (req.user?.orgId !== orgId && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const invoice = await storage.getClientInvoice(orgId, id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (!invoice.pdfStorageKey) {
        return res.status(404).json({ message: "No PDF available for this invoice" });
      }

      const objectStorage = new ObjectStorageService();
      const signedUrl = await objectStorage.getSignedUrl(invoice.pdfStorageKey, 3600);
      
      res.json({ downloadUrl: signedUrl });
    } catch (error) {
      console.error("Error generating download URL:", error);
      res.status(500).json({ message: "Failed to generate download URL" });
    }
  });

  app.post("/api/orgs/:orgId/client-invoices/:id/generate-pdf", isAuthenticated, async (req, res) => {
    try {
      const { orgId, id } = req.params;
      
      // Verify user belongs to org
      if (req.user?.orgId !== orgId && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const invoice = await storage.getClientInvoice(orgId, id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const client = await storage.getClient(invoice.clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      const org = await storage.getOrg(orgId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const submissions = await storage.getBillingSubmissionsByInvoice(invoice.id);
      
      const lineItems = submissions.map((submission: any) => ({
        description: submission.description || `${submission.sourceType} - ${submission.sourceId}`,
        quantity: 1,
        unitPrice: submission.amountCents,
        total: submission.amountCents
      }));

      // Fetch custom fields for invoice entity type
      const customFields = await storage.getCustomFields(orgId, "invoice");

      const invoiceData = {
        invoiceNumber: invoice.invoiceNumber || `INV-${invoice.id.slice(0, 8)}`,
        invoiceDate: invoice.invoiceDate || invoice.createdAt || new Date(),
        dueDate: invoice.dueDate,
        
        organizationName: org.name,
        organizationAddress: org.address,
        organizationPhone: org.phone,
        organizationEmail: org.email,
        organizationLogo: org.branding?.logo,
        
        clientName: `${client.firstName} ${client.lastName}`,
        clientEmail: client.email || undefined,
        clientAddress: client.address || undefined,
        clientPhone: client.phone || undefined,
        
        lineItems,
        
        subtotal: invoice.subtotalCents,
        taxRate: invoice.taxRate || undefined,
        taxAmount: invoice.taxCents || undefined,
        total: invoice.totalCents,
        amountPaid: invoice.paidCents || 0,
        amountDue: invoice.totalCents - (invoice.paidCents || 0),
        
        notes: invoice.notes || undefined,
        paymentTerms: invoice.paymentTerms || undefined,
        currency: invoice.currency || 'usd',
        
        primaryColor: org.branding?.primaryColor,
        secondaryColor: org.branding?.secondaryColor,
        
        attachments: (invoice as any).attachments || undefined,
        
        customFieldValues: invoice.customFieldValues || {},
        customFields: customFields.map(cf => ({
          fieldKey: cf.fieldKey,
          fieldName: cf.fieldName,
          fieldType: cf.fieldType
        })),
      };

      const { generateInvoicePDFToResponse } = await import('./invoiceUtils.js');
      await generateInvoicePDFToResponse(invoiceData, res);

    } catch (error) {
      console.error("Error generating invoice PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  app.post("/api/orgs/:orgId/client-invoices/:id/send", isAuthenticated, async (req, res) => {
    try {
      const { orgId, id } = req.params;
      const { recipientEmail, recipientName, message } = req.body;
      
      // Verify user belongs to org
      if (req.user?.orgId !== orgId && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!SENDGRID_API_KEY) {
        return res.status(500).json({ message: "Email service not configured. Please set SENDGRID_API_KEY." });
      }

      const invoice = await storage.getClientInvoice(orgId, id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const client = await storage.getClient(invoice.clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      const org = await storage.getOrg(orgId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const emailTo = recipientEmail || client.email;
      if (!emailTo) {
        return res.status(400).json({ message: "No email address provided or found for client" });
      }

      const clientName = recipientName || `${client.firstName} ${client.lastName}`;
      
      const invoiceEmailData = {
        invoiceNumber: invoice.invoiceNumber || `INV-${invoice.id.slice(0, 8)}`,
        invoiceDate: invoice.invoiceDate || invoice.createdAt || new Date(),
        dueDate: invoice.dueDate,
        total: invoice.totalCents,
        amountDue: invoice.totalCents - (invoice.paidCents || 0),
        currency: invoice.currency || 'usd',
        clientName,
        organizationName: org.name,
        organizationBranding: org.branding,
        paymentUrl: invoice.paymentUrl || undefined,
        notes: message || invoice.notes || undefined,
      };

      const { generateInvoiceEmailHTML } = await import('./emailUtils.js');
      const htmlContent = generateInvoiceEmailHTML(invoiceEmailData);

      let pdfBuffer: Buffer | undefined;
      if (invoice.pdfStorageKey) {
        const objectStorage = new ObjectStorageService();
        const signedUrl = await objectStorage.getSignedUrl(invoice.pdfStorageKey, 60);
        
        const response = await fetch(signedUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          pdfBuffer = Buffer.from(arrayBuffer);
        }
      }

      const mailData: any = {
        to: emailTo,
        from: process.env.SENDGRID_FROM_EMAIL || "noreply@hubify.com",
        subject: `Invoice ${invoiceEmailData.invoiceNumber} from ${org.name}`,
        html: htmlContent,
      };

      if (pdfBuffer) {
        mailData.attachments = [
          {
            content: pdfBuffer.toString('base64'),
            filename: `invoice-${invoiceEmailData.invoiceNumber}.pdf`,
            type: 'application/pdf',
            disposition: 'attachment',
          },
        ];
      }

      await sgMail.send(mailData);
      
      await storage.updateClientInvoice(orgId, id, { 
        status: invoice.status === 'draft' ? 'open' : invoice.status,
        sentAt: new Date(),
      });

      res.json({ 
        message: "Invoice sent successfully",
        sentTo: emailTo
      });

    } catch (error) {
      console.error("Error sending invoice:", error);
      res.status(500).json({ message: "Failed to send invoice" });
    }
  });

  // CSV Import history endpoint
  app.get("/api/admin/import/history", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userRole = user?.claims?.role || user?.role;
      
      if (!userRole || (userRole !== 'admin' && userRole !== 'supervisor' && userRole !== 'super_admin')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get orgId from claims or user
      const orgId = user?.claims?.orgId || user?.claims?.org_id || user?.orgId;
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID required" });
      }

      const history = await storage.getImportHistory(orgId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching import history:", error);
      res.status(500).json({ message: "Failed to fetch import history" });
    }
  });

  // CSV Import execution endpoint - Request validation schema
  const importExecuteSchema = z.object({
    entityType: z.enum(['properties', 'contacts', 'tasks']),
    data: z.array(z.record(z.any())).min(1, "Data array cannot be empty"),
    fieldMapping: z.record(z.string()),
  });

  app.post("/api/admin/import/execute", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub || user?.id;
      const userRole = user?.claims?.role || user?.role;
      
      if (!userRole || (userRole !== 'admin' && userRole !== 'supervisor' && userRole !== 'super_admin')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Validate request body
      const validation = importExecuteSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid import request", 
          errors: validation.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }

      const { entityType, data, fieldMapping } = validation.data;

      // Get orgId from claims or user
      const orgId = user?.claims?.orgId || user?.claims?.org_id || user?.orgId;
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID required" });
      }

      // Validate entity-specific required fields
      const requiredFields: Record<string, string[]> = {
        properties: ['name', 'address1', 'city', 'state', 'zip', 'type'],
        contacts: ['firstName', 'lastName', 'type'],
        tasks: ['title'],
      };

      const entityRequiredFields = requiredFields[entityType];
      const mappedFields = Object.values(fieldMapping).filter(v => v && v !== '__skip__');
      
      for (const requiredField of entityRequiredFields) {
        if (!mappedFields.includes(requiredField)) {
          return res.status(400).json({ 
            message: `Missing required field mapping: ${requiredField}` 
          });
        }
      }

      const results: Array<{
        row: number;
        status: 'success' | 'failed' | 'skipped';
        action: 'created' | 'updated' | 'skipped';
        message?: string;
        recordId?: number;
      }> = [];

      // Process each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        try {
          if (entityType === 'properties') {
            // Check for existing property by accountId
            const accountId = row.accountId?.trim();
            let existingProperty;
            
            if (accountId) {
              const [existing] = await db
                .select()
                .from(properties)
                .where(eq(properties.accountId, accountId))
                .limit(1);
              existingProperty = existing;
            }

            if (existingProperty) {
              // Update existing property
              const [updated] = await db
                .update(properties)
                .set({
                  ...row,
                  updatedAt: new Date(),
                })
                .where(eq(properties.id, existingProperty.id))
                .returning();
              
              results.push({
                row: i + 1,
                status: 'success',
                action: 'updated',
                recordId: updated.id,
              });
            } else {
              // Create new property
              const [created] = await db
                .insert(properties)
                .values({
                  ...row,
                  orgId,
                })
                .returning();
              
              results.push({
                row: i + 1,
                status: 'success',
                action: 'created',
                recordId: created.id,
              });
            }
          } else if (entityType === 'contacts') {
            // Check for existing contact by email (if provided)
            const email = row.email?.trim().toLowerCase();
            let existingContact;
            
            if (email) {
              const [existing] = await db
                .select()
                .from(contacts)
                .where(eq(contacts.email, email))
                .limit(1);
              existingContact = existing;
            }

            if (existingContact) {
              // Update existing contact
              const [updated] = await db
                .update(contacts)
                .set({
                  ...row,
                  updatedAt: new Date(),
                })
                .where(eq(contacts.id, existingContact.id))
                .returning();
              
              results.push({
                row: i + 1,
                status: 'success',
                action: 'updated',
                recordId: updated.id,
              });
            } else {
              // Create new contact
              const [created] = await db
                .insert(contacts)
                .values(row)
                .returning();
              
              results.push({
                row: i + 1,
                status: 'success',
                action: 'created',
                recordId: created.id,
              });
            }
          } else if (entityType === 'tasks') {
            // Tasks are always created (no update logic for CSV import)
            const [created] = await db
              .insert(tasks)
              .values(row)
              .returning();
            
            results.push({
              row: i + 1,
              status: 'success',
              action: 'created',
              recordId: created.id,
            });
          }
        } catch (error) {
          console.error(`Error processing row ${i + 1}:`, error);
          results.push({
            row: i + 1,
            status: 'failed',
            action: 'skipped',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Calculate summary
      const summary = {
        total: data.length,
        created: results.filter(r => r.action === 'created').length,
        updated: results.filter(r => r.action === 'updated').length,
        failed: results.filter(r => r.status === 'failed').length,
        skipped: results.filter(r => r.action === 'skipped').length,
      };

      // Determine status
      let status: 'success' | 'partial_success' | 'failed';
      if (summary.failed === 0) {
        status = 'success';
      } else if (summary.created + summary.updated > 0) {
        status = 'partial_success';
      } else {
        status = 'failed';
      }

      // Save import history
      await storage.createImportHistory({
        orgId,
        initiatedBy: userId,
        entityType,
        fileName: null, // Could be added later if we capture filename
        status,
        totalRecords: summary.total,
        createdRecords: summary.created,
        updatedRecords: summary.updated,
        failedRecords: summary.failed,
      });

      res.json({
        success: true,
        summary,
        results,
      });
    } catch (error) {
      console.error("Error executing import:", error);
      res.status(500).json({ message: "Failed to execute import" });
    }
  });

  // iCal Feed Routes (public, no auth required)
  
  // Helper function to generate iCal feed content
  function generateICalFeed(events: any[], calendarName: string) {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Hubify//Calendar Feed//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${calendarName}`,
      'X-WR-TIMEZONE:UTC',
    ];

    for (const event of events) {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${event.id}@hubify.app`);
      lines.push(`DTSTAMP:${formatICalDate(new Date())}`);
      
      // Handle all-day vs timed events
      if (event.allDay) {
        lines.push(`DTSTART;VALUE=DATE:${formatICalDate(new Date(event.start), true)}`);
        if (event.end) {
          // For all-day events, end date is exclusive in iCal
          const endDate = new Date(event.end);
          endDate.setDate(endDate.getDate() + 1);
          lines.push(`DTEND;VALUE=DATE:${formatICalDate(endDate, true)}`);
        }
      } else {
        lines.push(`DTSTART:${formatICalDate(new Date(event.start))}`);
        
        // RFC 5545: DTEND and DURATION are mutually exclusive
        // For recurring events, use DURATION instead of DTEND
        if (event.recurrenceRule && event.start && event.end) {
          const duration = new Date(event.end).getTime() - new Date(event.start).getTime();
          const hours = Math.floor(duration / (1000 * 60 * 60));
          const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
          if (hours > 0 || minutes > 0) {
            lines.push(`DURATION:PT${hours}H${minutes}M`);
          }
        } else if (event.end) {
          // For non-recurring events, use DTEND
          lines.push(`DTEND:${formatICalDate(new Date(event.end))}`);
        }
      }
      
      lines.push(`SUMMARY:${escapeICalText(event.title)}`);
      
      if (event.description) {
        lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
      }
      
      if (event.location) {
        lines.push(`LOCATION:${escapeICalText(event.location)}`);
      }
      
      // Add recurrence rule if present
      if (event.recurrenceRule) {
        lines.push(`RRULE:${event.recurrenceRule}`);
      }
      
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  function formatICalDate(date: Date, dateOnly = false): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    
    if (dateOnly) {
      return `${year}${month}${day}`;
    }
    
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  }

  function escapeICalText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  // Organization-wide calendar feed
  app.get("/ical/org/:orgId/:token", async (req, res) => {
    try {
      const { orgId, token } = req.params;
      
      // Verify token
      const org = await storage.getOrg(orgId);
      if (!org || org.iCalFeedToken !== token) {
        return res.status(404).send('Calendar feed not found');
      }
      
      // Get all non-private events for the organization
      const events = await storage.getOrgEvents(orgId);
      const nonPrivateEvents = events.filter((e: any) => {
        // Filter out events from private calendars
        return !e.calendar?.isPrivate;
      });
      
      const icalContent = generateICalFeed(nonPrivateEvents, `${org.name} Calendar`);
      
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${org.name.replace(/[^a-zA-Z0-9]/g, '_')}_calendar.ics"`);
      res.send(icalContent);
    } catch (error) {
      console.error("Error generating org iCal feed:", error);
      res.status(500).send('Error generating calendar feed');
    }
  });

  // Personal calendar feed
  app.get("/ical/user/:userId/:token", async (req, res) => {
    try {
      const { userId, token } = req.params;
      
      // Verify token
      const user = await storage.getUser(userId);
      if (!user || user.iCalFeedToken !== token) {
        return res.status(404).send('Calendar feed not found');
      }
      
      if (!user.orgId) {
        return res.status(400).send('User not associated with an organization');
      }
      
      // Get all events for the user (org events + their private calendar events)
      const orgEvents = await storage.getOrgEvents(user.orgId);
      const userEvents = orgEvents.filter((e: any) => {
        // Include non-private org events + user's own private calendar events
        if (e.calendar?.isPrivate) {
          return e.calendar.ownerId === userId;
        }
        return true;
      });
      
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User';
      const icalContent = generateICalFeed(userEvents, `${userName}'s Calendar`);
      
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${userName.replace(/[^a-zA-Z0-9]/g, '_')}_calendar.ics"`);
      res.send(icalContent);
    } catch (error) {
      console.error("Error generating user iCal feed:", error);
      res.status(500).send('Error generating calendar feed');
    }
  });

  // Generate/regenerate iCal feed token for organization
  app.post("/api/orgs/:orgId/ical-token/generate", isAuthenticated, async (req, res) => {
    try {
      const { orgId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Check if user is admin
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can generate organization calendar tokens" });
      }
      
      // Generate new token
      const token = nanoid(32);
      await storage.updateOrg(orgId, { iCalFeedToken: token });
      
      res.json({ token });
    } catch (error) {
      console.error("Error generating org iCal token:", error);
      res.status(500).json({ message: "Failed to generate calendar token" });
    }
  });

  // Generate/regenerate iCal feed token for user
  app.post("/api/users/:userId/ical-token/generate", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user?.id;
      
      if (!currentUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Users can only generate tokens for themselves
      if (userId !== currentUserId) {
        return res.status(403).json({ message: "You can only generate tokens for yourself" });
      }
      
      // Generate new token
      const token = nanoid(32);
      await storage.updateUser(userId, { iCalFeedToken: token });
      
      res.json({ token });
    } catch (error) {
      console.error("Error generating user iCal token:", error);
      res.status(500).json({ message: "Failed to generate calendar token" });
    }
  });

  // Get client by ID
  app.get("/api/clients/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub || req.user?.id);
      if (!user?.orgId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { id } = req.params;
      const client = await storage.getClient(id);
      
      if (!client || client.orgId !== user.orgId) {
        return res.status(404).json({ message: "Client not found" });
      }

      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  // Billing - Recurring Schedule endpoints
  app.post("/api/clients/:clientId/recurring-schedules", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub || req.user?.id);
      if (!user?.orgId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { clientId } = req.params;
      const client = await storage.getClient(clientId);
      
      if (!client || client.orgId !== user.orgId) {
        return res.status(404).json({ message: "Client not found" });
      }

      const validatedData = insertRecurringBillingScheduleSchema.parse({
        ...req.body,
        orgId: user.orgId,
        clientId,
      });

      const schedule = await storage.createRecurringSchedule(validatedData);
      res.status(201).json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating recurring schedule:", error);
      res.status(500).json({ message: "Failed to create recurring schedule" });
    }
  });

  app.get("/api/clients/:clientId/recurring-schedules", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub || req.user?.id);
      if (!user?.orgId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { clientId } = req.params;
      const client = await storage.getClient(clientId);
      
      if (!client || client.orgId !== user.orgId) {
        return res.status(404).json({ message: "Client not found" });
      }

      const schedules = await storage.getRecurringSchedulesByClient(clientId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching recurring schedules:", error);
      res.status(500).json({ message: "Failed to fetch recurring schedules" });
    }
  });

  app.patch("/api/recurring-schedules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub || req.user?.id);
      if (!user?.orgId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { id } = req.params;
      const schedule = await storage.getRecurringSchedule(id);
      
      if (!schedule || schedule.orgId !== user.orgId) {
        return res.status(404).json({ message: "Schedule not found" });
      }

      const validatedData = insertRecurringBillingScheduleSchema.partial().parse(req.body);
      const updated = await storage.updateRecurringSchedule(id, validatedData);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating recurring schedule:", error);
      res.status(500).json({ message: "Failed to update recurring schedule" });
    }
  });

  app.delete("/api/recurring-schedules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub || req.user?.id);
      if (!user?.orgId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { id } = req.params;
      const schedule = await storage.getRecurringSchedule(id);
      
      if (!schedule || schedule.orgId !== user.orgId) {
        return res.status(404).json({ message: "Schedule not found" });
      }

      await storage.deleteRecurringSchedule(id);
      res.json({ message: "Recurring schedule deleted successfully" });
    } catch (error) {
      console.error("Error deleting recurring schedule:", error);
      res.status(500).json({ message: "Failed to delete recurring schedule" });
    }
  });

  // Update client billing settings
  app.patch("/api/clients/:clientId", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub || req.user?.id);
      if (!user?.orgId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // RBAC: Only admins and supervisors can update client billing settings
      const userRole = (user as any)?.claims?.role ?? (user as any)?.role;
      if (userRole !== 'admin' && userRole !== 'supervisor') {
        return res.status(403).json({ message: "Access denied. Admin or supervisor role required." });
      }

      const { clientId } = req.params;
      const client = await storage.getClient(clientId);
      
      if (!client || client.orgId !== user.orgId) {
        return res.status(404).json({ message: "Client not found" });
      }

      const updated = await storage.updateClient(clientId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  // Contact-to-Client bridge endpoint
  app.get("/api/contacts/:contactId/client", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub || req.user?.id);
      if (!user?.orgId) {
        console.log("[CLIENT-BRIDGE] User not authenticated");
        return res.status(401).json({ message: "User not authenticated" });
      }

      const contactId = parseInt(req.params.contactId);
      if (isNaN(contactId)) {
        console.log("[CLIENT-BRIDGE] Invalid contact ID:", req.params.contactId);
        return res.status(400).json({ message: "Invalid contact ID" });
      }

      // Get the contact to verify it belongs to this org
      const contact = await storage.getContact(contactId);
      console.log(`[CLIENT-BRIDGE] Contact ${contactId} lookup:`, {
        exists: !!contact,
        contactOrgId: contact?.orgId,
        userOrgId: user.orgId,
        contactType: contact?.type,
        match: contact?.orgId === user.orgId
      });
      
      if (!contact || contact.orgId !== user.orgId) {
        return res.status(404).json({ message: "Contact not found" });
      }

      // Try to get existing client record
      let client = await storage.getClientByContactId(contactId);
      console.log(`[CLIENT-BRIDGE] Existing client for contact ${contactId}:`, !!client);

      // If no client exists and this is a client-type contact, create one
      if (!client && contact.type === 'client') {
        console.log(`[CLIENT-BRIDGE] Creating new client for contact ${contactId}`);
        client = await storage.createClientForContact(
          contactId,
          user.orgId,
          contact.email,
          contact.firstName || undefined,
          contact.lastName || undefined
        );
        console.log(`[CLIENT-BRIDGE] Client created:`, !!client);
      }

      if (!client) {
        console.log(`[CLIENT-BRIDGE] No client record - contact type is '${contact.type}'`);
        return res.status(404).json({ message: "No client record found for this contact" });
      }

      res.json(client);
    } catch (error) {
      console.error("[CLIENT-BRIDGE] Error fetching client for contact:", error);
      res.status(500).json({ message: "Failed to fetch client record" });
    }
  });

  // Payment collection token endpoints
  app.post("/api/clients/:clientId/payment-link", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub || req.user?.id);
      if (!user?.orgId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // RBAC: Only admins and supervisors can generate payment links
      const userRole = (user as any)?.claims?.role ?? (user as any)?.role;
      if (userRole !== 'admin' && userRole !== 'supervisor') {
        return res.status(403).json({ message: "Access denied. Admin or supervisor role required." });
      }

      const { clientId } = req.params;
      const client = await storage.getClient(clientId);
      
      if (!client || client.orgId !== user.orgId) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Create payment collection token (expires in 72 hours by default)
      const token = await storage.createPaymentCollectionToken(
        clientId,
        user.orgId,
        user.id,
        72
      );

      // Generate the full URL for the client
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const paymentUrl = `${baseUrl}/payment-collection/${token.token}`;

      res.json({
        token: token.token,
        paymentUrl,
        expiresAt: token.expiresAt,
      });
    } catch (error) {
      console.error("Error creating payment link:", error);
      res.status(500).json({ message: "Failed to create payment link" });
    }
  });

  // Public endpoint to validate payment collection token and get client info
  app.get("/api/payment-collection/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const collectionToken = await storage.getPaymentCollectionToken(token);
      
      if (!collectionToken) {
        return res.status(404).json({ message: "Invalid or expired payment link" });
      }

      // Check if token is expired
      if (new Date() > collectionToken.expiresAt) {
        return res.status(410).json({ message: "This payment link has expired" });
      }

      // Check if token has been used
      if (collectionToken.isUsed) {
        return res.status(410).json({ message: "This payment link has already been used" });
      }

      // Get client information
      const client = await storage.getClient(collectionToken.clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Return client info (without sensitive internal data like orgId)
      res.json({
        clientId: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
      });
    } catch (error) {
      console.error("Error validating payment collection token:", error);
      res.status(500).json({ message: "Failed to validate payment link" });
    }
  });

  // Public endpoint to create setup intent using payment collection token
  app.post("/api/payment-collection/:token/setup-intent", async (req, res) => {
    try {
      const { token } = req.params;
      
      const collectionToken = await storage.getPaymentCollectionToken(token);
      
      if (!collectionToken) {
        return res.status(404).json({ message: "Invalid or expired payment link" });
      }

      // Check if token is expired
      if (new Date() > collectionToken.expiresAt) {
        return res.status(410).json({ message: "This payment link has expired" });
      }

      // Check if token has been used
      if (collectionToken.isUsed) {
        return res.status(410).json({ message: "This payment link has already been used" });
      }

      // Get client information
      const client = await storage.getClient(collectionToken.clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Validate payment method types
      const validatedData = z.object({
        paymentMethodTypes: z.array(z.enum(['card', 'us_bank_account'])).default(['card', 'us_bank_account'])
      }).parse({ paymentMethodTypes: req.body.paymentMethodTypes });

      // Create setup intent for the client
      const setupIntent = await createSetupIntentForClient(
        client.orgId,
        client.id,
        client.email,
        validatedData.paymentMethodTypes
      );

      // Mark token as used after successful setup intent creation
      await storage.markPaymentCollectionTokenUsed(collectionToken.id);

      res.json(setupIntent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating setup intent via token:", error);
      res.status(500).json({ message: "Failed to create setup intent" });
    }
  });

  // Client Payment Method endpoints
  app.post("/api/clients/:clientId/setup-intent", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub || req.user?.id);
      if (!user?.orgId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // RBAC: Only admins and supervisors can manage payment methods
      const userRole = (user as any)?.claims?.role ?? (user as any)?.role;
      if (userRole !== 'admin' && userRole !== 'supervisor') {
        return res.status(403).json({ message: "Access denied. Admin or supervisor role required." });
      }

      const { clientId } = req.params;
      const client = await storage.getClient(clientId);
      
      if (!client || client.orgId !== user.orgId) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Validate payment method types
      const validatedData = z.object({
        paymentMethodTypes: z.array(z.enum(['card', 'us_bank_account'])).default(['card', 'us_bank_account'])
      }).parse({ paymentMethodTypes: req.body.paymentMethodTypes });

      const setupIntent = await createSetupIntentForClient(
        user.orgId,
        clientId,
        client.email,
        validatedData.paymentMethodTypes
      );

      res.json(setupIntent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating setup intent:", error);
      res.status(500).json({ message: "Failed to create setup intent" });
    }
  });

  app.get("/api/clients/:clientId/payment-methods", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub || req.user?.id);
      if (!user?.orgId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // RBAC: Only admins and supervisors can view payment methods
      const userRole = (user as any)?.claims?.role ?? (user as any)?.role;
      if (userRole !== 'admin' && userRole !== 'supervisor') {
        return res.status(403).json({ message: "Access denied. Admin or supervisor role required." });
      }

      const { clientId } = req.params;
      const client = await storage.getClient(clientId);
      
      if (!client || client.orgId !== user.orgId) {
        return res.status(404).json({ message: "Client not found" });
      }

      const paymentMethods = await storage.getClientPaymentMethods(clientId);
      res.json(paymentMethods);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ message: "Failed to fetch payment methods" });
    }
  });

  app.post("/api/clients/:clientId/payment-methods/:paymentMethodId/set-default", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub || req.user?.id);
      if (!user?.orgId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // RBAC: Only admins and supervisors can set default payment method
      const userRole = (user as any)?.claims?.role ?? (user as any)?.role;
      if (userRole !== 'admin' && userRole !== 'supervisor') {
        return res.status(403).json({ message: "Access denied. Admin or supervisor role required." });
      }

      const { clientId, paymentMethodId } = req.params;
      const client = await storage.getClient(clientId);
      
      if (!client || client.orgId !== user.orgId) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Verify payment method belongs to this client
      const paymentMethod = await storage.getClientPaymentMethod(paymentMethodId);
      if (!paymentMethod || paymentMethod.clientId !== clientId) {
        return res.status(404).json({ message: "Payment method not found" });
      }

      await storage.setDefaultPaymentMethod(clientId, paymentMethodId);
      res.json({ message: "Default payment method updated" });
    } catch (error) {
      console.error("Error setting default payment method:", error);
      res.status(500).json({ message: "Failed to set default payment method" });
    }
  });

  app.delete("/api/payment-methods/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub || req.user?.id);
      if (!user?.orgId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // RBAC: Only admins and supervisors can delete payment methods
      const userRole = (user as any)?.claims?.role ?? (user as any)?.role;
      if (userRole !== 'admin' && userRole !== 'supervisor') {
        return res.status(403).json({ message: "Access denied. Admin or supervisor role required." });
      }

      const { id } = req.params;
      const paymentMethod = await storage.getClientPaymentMethod(id);
      
      if (!paymentMethod) {
        return res.status(404).json({ message: "Payment method not found" });
      }

      // Verify client belongs to user's org
      const client = await storage.getClient(paymentMethod.clientId);
      if (!client || client.orgId !== user.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Detach from Stripe
      await detachPaymentMethod(user.orgId, paymentMethod.stripePaymentMethodId);
      
      // Delete from database
      await storage.deleteClientPaymentMethod(id);
      
      res.json({ message: "Payment method deleted successfully" });
    } catch (error) {
      console.error("Error deleting payment method:", error);
      res.status(500).json({ message: "Failed to delete payment method" });
    }
  });

  // Client Billing Preferences endpoints
  app.get("/api/clients/:clientId/billing-prefs", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub || req.user?.id);
      if (!user?.orgId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // RBAC: Only admins and supervisors can view billing preferences
      const userRole = (user as any)?.claims?.role ?? (user as any)?.role;
      if (userRole !== 'admin' && userRole !== 'supervisor') {
        return res.status(403).json({ message: "Access denied. Admin or supervisor role required." });
      }

      const { clientId } = req.params;
      const client = await storage.getClient(clientId);
      
      if (!client || client.orgId !== user.orgId) {
        return res.status(404).json({ message: "Client not found" });
      }

      const prefs = await storage.getClientBillingPref(clientId);
      
      // Return default preferences if none exist
      if (!prefs) {
        return res.json({
          clientId,
          orgId: user.orgId,
          autoChargeInvoices: true,
          autoChargeTiming: 'on_due',
          retryStrategy: [3, 5, 7],
          emailReceipts: true,
          notifyFailedPayment: true,
        });
      }

      res.json(prefs);
    } catch (error) {
      console.error("Error fetching billing preferences:", error);
      res.status(500).json({ message: "Failed to fetch billing preferences" });
    }
  });

  app.put("/api/clients/:clientId/billing-prefs", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub || req.user?.id);
      if (!user?.orgId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // RBAC: Only admins and supervisors can update billing preferences
      const userRole = (user as any)?.claims?.role ?? (user as any)?.role;
      if (userRole !== 'admin' && userRole !== 'supervisor') {
        return res.status(403).json({ message: "Access denied. Admin or supervisor role required." });
      }

      const { clientId } = req.params;
      const client = await storage.getClient(clientId);
      
      if (!client || client.orgId !== user.orgId) {
        return res.status(404).json({ message: "Client not found" });
      }

      const validatedData = insertClientBillingPrefSchema.parse({
        ...req.body,
        clientId,
        orgId: user.orgId,
      });

      const prefs = await storage.upsertClientBillingPref(validatedData);
      res.json(prefs);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating billing preferences:", error);
      res.status(500).json({ message: "Failed to update billing preferences" });
    }
  });

  // Billing Submissions endpoints
  app.get("/api/billing-submissions", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub || req.user?.id);
      if (!user?.orgId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { status, clientId } = req.query;
      const submissions = await storage.getBillingSubmissions(user.orgId, {
        status: status as string,
        clientId: clientId as string,
      });
      
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching billing submissions:", error);
      res.status(500).json({ message: "Failed to fetch billing submissions" });
    }
  });

  app.post("/api/billing-submissions", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub || req.user?.id);
      if (!user?.orgId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Validate the request data first
      const validatedData = insertBillingSubmissionSchema.parse({
        ...req.body,
        orgId: user.orgId,
      });

      // CRITICAL: Verify that the client belongs to the user's organization
      const client = await storage.getClient(validatedData.clientId);
      if (!client || client.orgId !== user.orgId) {
        return res.status(404).json({ message: "Client not found" });
      }

      // If source is a task, verify the task belongs to the same org via property or contact
      if (validatedData.sourceType === 'task') {
        const task = await storage.getTask(parseInt(validatedData.sourceId));
        if (!task) {
          return res.status(404).json({ message: "Task not found" });
        }

        // Verify task belongs to user's org through property, contact, or direct client relationship
        let taskBelongsToOrg = false;

        // Path 1: Verify via direct clientId if task has it
        if ((task as any).clientId) {
          const taskClient = await storage.getClient((task as any).clientId);
          if (taskClient && taskClient.orgId === user.orgId) {
            taskBelongsToOrg = true;
          }
        }

        // Path 2: Verify via property if task has propertyId
        if (!taskBelongsToOrg && task.propertyId) {
          const property = await storage.getProperty(task.propertyId);
          if (property && (property as any).orgId === user.orgId) {
            taskBelongsToOrg = true;
          }
        }

        // Path 3: Verify via contact → client if task has contactId
        if (!taskBelongsToOrg && task.contactId) {
          const contact = await storage.getContact(task.contactId);
          if (contact && (contact as any).accountId) {
            const contactClient = await storage.getClient((contact as any).accountId);
            if (contactClient && contactClient.orgId === user.orgId) {
              taskBelongsToOrg = true;
            }
          }
        }

        if (!taskBelongsToOrg) {
          return res.status(404).json({ message: "Task not found" });
        }
      }

      // Build enhanced submission data with line items and notes
      let submissionData: any = { ...validatedData };
      
      // If source is a task, aggregate task and time entry data into line items
      if (validatedData.sourceType === 'task') {
        const taskId = parseInt(validatedData.sourceId);
        if (isNaN(taskId)) {
          console.warn(`Invalid task sourceId: ${validatedData.sourceId}, skipping line item aggregation`);
        } else {
          const task = await storage.getTask(taskId);
          if (task) {
          const lineItems: Array<{
            id: string,
            description: string,
            quantity: number,
            rateCents: number,
            amountCents: number,
            type: "task" | "time_entry" | "material" | "other"
          }> = [];

          // Add task itself as a line item if it has a billing amount
          if (task.billableRateCents || task.billingAmount) {
            const taskAmountCents = task.billingAmount 
              ? Math.round(parseFloat(task.billingAmount) * 100)
              : task.billableRateCents || 0;
            
            lineItems.push({
              id: `task-${task.id}`,
              description: task.title || 'Task',
              quantity: 1,
              rateCents: taskAmountCents,
              amountCents: taskAmountCents,
              type: 'task'
            });
          }

          // Fetch and add associated time entries
          const taskTimeEntries = await storage.getTimeEntries(user.orgId, { taskId: task.id });

          for (const entry of taskTimeEntries) {
            if (entry.clockOut && entry.isBillable) {
              const hoursWorked = (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60);
              const rateCents = entry.billableRateCents || task.billableRateCents || 0;
              const amountCents = Math.round(hoursWorked * rateCents);

              lineItems.push({
                id: `time-${entry.id}`,
                description: entry.notes || `Time entry - ${hoursWorked.toFixed(2)} hours`,
                quantity: parseFloat(hoursWorked.toFixed(2)),
                rateCents,
                amountCents,
                type: 'time_entry'
              });
            }
          }

          // Calculate total amount from line items
          const totalAmountCents = lineItems.reduce((sum, item) => sum + item.amountCents, 0);

          // Update submission data with enhanced fields
          submissionData = {
            ...submissionData,
            notes: task.description || null,
            lineItems,
            amountCents: totalAmountCents || validatedData.amountCents,
            attachments: (task as any).attachments || [],
          };
        }
        }
      }

      const submission = await storage.createBillingSubmission(submissionData);
      
      // Check organization's billing workflow mode
      const org = await storage.getOrg(user.orgId);
      const workflowMode = org?.billingWorkflowMode || "manual";
      
      // If workflow mode is automatic, immediately authorize the submission
      if (workflowMode === "automatic") {
        const userId = req.user?.claims?.sub || req.user?.id;
        const authorizedSubmission = await storage.authorizeBillingSubmission(submission.id, userId);
        res.status(201).json(authorizedSubmission);
      } else {
        // For manual or require_authorization modes, return the pending submission
        res.status(201).json(submission);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating billing submission:", error);
      res.status(500).json({ message: "Failed to create billing submission" });
    }
  });

  // Get single billing submission with full details
  app.get("/api/billing-submissions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub || req.user?.id);
      if (!user?.orgId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { id } = req.params;
      const submission = await storage.getBillingSubmission(id);
      
      if (!submission || submission.orgId !== user.orgId) {
        return res.status(404).json({ message: "Billing submission not found" });
      }

      res.json(submission);
    } catch (error) {
      console.error("Error fetching billing submission:", error);
      res.status(500).json({ message: "Failed to fetch billing submission" });
    }
  });

  // Update billing submission (admin/supervisor only)
  app.patch("/api/billing-submissions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);
      if (!user?.orgId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Check permissions: only admin/supervisor can edit submissions
      if (user.role !== 'admin' && user.role !== 'supervisor') {
        return res.status(403).json({ message: "Only admin or supervisor users can edit billing submissions" });
      }

      const { id } = req.params;
      const submission = await storage.getBillingSubmission(id);
      
      if (!submission || submission.orgId !== user.orgId) {
        return res.status(404).json({ message: "Billing submission not found" });
      }

      // Only allow editing pending submissions
      if (submission.status !== 'pending') {
        return res.status(400).json({ message: "Only pending submissions can be edited" });
      }

      // Extract allowed update fields
      const { description, amountCents, notes, attachments, lineItems } = req.body;
      const updates: any = {};
      
      if (description !== undefined) updates.description = description;
      if (amountCents !== undefined) updates.amountCents = amountCents;
      if (notes !== undefined) updates.notes = notes;
      if (attachments !== undefined) updates.attachments = attachments;
      if (lineItems !== undefined) updates.lineItems = lineItems;

      const updated = await storage.updateBillingSubmission(id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating billing submission:", error);
      res.status(500).json({ message: "Failed to update billing submission" });
    }
  });

  app.post("/api/billing-submissions/:id/authorize", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);
      if (!user?.orgId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { id } = req.params;
      const submission = await storage.getBillingSubmission(id);
      
      if (!submission || submission.orgId !== user.orgId) {
        return res.status(404).json({ message: "Billing submission not found" });
      }

      if (submission.status !== 'pending') {
        return res.status(400).json({ message: "Only pending submissions can be authorized" });
      }

      const authorized = await storage.authorizeBillingSubmission(id, userId);
      res.json(authorized);
    } catch (error) {
      console.error("Error authorizing billing submission:", error);
      res.status(500).json({ message: "Failed to authorize billing submission" });
    }
  });

  app.post("/api/billing-submissions/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub || req.user?.id);
      if (!user?.orgId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { id } = req.params;
      const { rejectionReason } = req.body;

      if (!rejectionReason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }

      const submission = await storage.getBillingSubmission(id);
      
      if (!submission || submission.orgId !== user.orgId) {
        return res.status(404).json({ message: "Billing submission not found" });
      }

      if (submission.status !== 'pending') {
        return res.status(400).json({ message: "Only pending submissions can be rejected" });
      }

      const rejected = await storage.rejectBillingSubmission(id, rejectionReason);
      res.json(rejected);
    } catch (error) {
      console.error("Error rejecting billing submission:", error);
      res.status(500).json({ message: "Failed to reject billing submission" });
    }
  });

  // Authorize & Send - streamlined workflow for admin/supervisor roles
  app.post("/api/billing-submissions/:id/authorize-and-send", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);
      if (!user?.orgId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Check permissions: only admin/supervisor can use this feature
      if (user.role !== 'admin' && user.role !== 'supervisor') {
        return res.status(403).json({ message: "Only admin or supervisor users can authorize and send" });
      }

      const { id } = req.params;
      const { recipientEmail, message: customMessage } = req.body;

      // Validate submission exists and belongs to org
      const submission = await storage.getBillingSubmission(id);
      if (!submission || submission.orgId !== user.orgId) {
        return res.status(404).json({ message: "Billing submission not found" });
      }

      if (submission.status !== 'pending') {
        return res.status(400).json({ message: "Only pending submissions can be authorized" });
      }

      // Get client information
      const client = await storage.getClient(submission.clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Get organization for branding
      const org = await storage.getOrg(user.orgId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Step 1: Authorize the submission
      const authorizedSubmission = await storage.authorizeBillingSubmission(id, userId);

      // Step 2: Create invoice from submission
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      // Transform submission lineItems to invoice lineItems format
      const invoiceLineItems = ((submission as any).lineItems || []).map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unitAmountCents: item.rateCents,
        totalCents: item.amountCents
      }));
      
      // Build description including notes if present
      let invoiceDescription = submission.description;
      if ((submission as any).notes) {
        invoiceDescription += `\n\nNotes: ${(submission as any).notes}`;
      }
      
      const invoice = await storage.createClientInvoice({
        orgId: user.orgId,
        clientId: submission.clientId,
        source: 'manual',
        invoiceNumber,
        amountCents: submission.amountCents,
        currency: 'usd',
        status: 'open',
        description: invoiceDescription,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        issuedAt: new Date(),
        lineItems: invoiceLineItems,
        attachments: (submission as any).attachments || [],
        metadata: {
          submissionId: submission.id,
          authorizedBy: userId,
          quickSend: true,
          notes: (submission as any).notes || null
        },
        createdBy: userId
      });

      // Link submission to invoice
      await storage.db
        .update(storage.billingSubmissions)
        .set({ 
          invoiceId: invoice.id,
          status: 'invoiced',
          updatedAt: new Date()
        })
        .where(storage.eq(storage.billingSubmissions.id, id));

      // Step 3: Generate PDF with organization's selected template
      const customFields = await storage.getCustomFields(user.orgId, "invoice");
      const { generateInvoicePDFWithTemplate } = await import('./invoiceUtils.js');
      const pdfBuffer = await generateInvoicePDFWithTemplate(
        invoice, 
        client, 
        org, 
        org.invoiceTemplateId || 'modern',
        customFields.map(cf => ({
          fieldKey: cf.fieldKey,
          fieldName: cf.fieldName,
          fieldType: cf.fieldType
        }))
      );
      
      // Store PDF in object storage
      const pdfKey = `invoices/org/${org.id}/clients/${client.id}/${invoice.id}.pdf`;
      const bucket = storage.getBucket();
      const file = bucket.file(pdfKey);
      await file.save(pdfBuffer, {
        contentType: 'application/pdf',
        metadata: {
          invoiceId: invoice.id,
          clientId: client.id,
          orgId: org.id
        }
      });

      // Update invoice with PDF key
      await storage.updateClientInvoice(invoice.id, {
        pdfStorageKey: pdfKey
      });

      // Step 4: Send email to client
      const emailTo = recipientEmail || (client as any).email || '';
      if (!emailTo) {
        return res.status(400).json({ message: "Client email is required" });
      }

      const emailSubject = `Invoice ${invoiceNumber} from ${org.name}`;
      const emailBody = await generateInvoiceEmail(
        invoice,
        client,
        org,
        customMessage || `Please find attached invoice ${invoiceNumber}.`
      );

      await sendInvoiceEmail(emailTo, emailSubject, emailBody, pdfBuffer, invoiceNumber);

      // Update invoice as sent
      await storage.updateClientInvoice(invoice.id, {
        sentAt: new Date(),
        status: 'open'
      });

      // Fire webhook event for invoice sent
      const invoiceOrgId = req.user?.claims?.orgId || req.user?.orgId;
      if (invoiceOrgId) {
        dispatchWebhookEvent(invoiceOrgId, "invoice.sent", { invoice, recipientEmail: emailTo }).catch(() => {});
      }

      // Log activity
      await storage.logActivity({
        userId,
        action: 'authorize_and_send_submission',
        entityType: 'billing_submission',
        entityId: String(submission.id),
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber,
          recipientEmail: emailTo,
          amountCents: submission.amountCents
        },
        severity: 'info',
        success: true
      });

      res.json({
        message: "Submission authorized, invoice created and sent successfully",
        submission: authorizedSubmission,
        invoice,
        emailSent: true
      });
    } catch (error) {
      console.error("Error in authorize-and-send workflow:", error);
      res.status(500).json({ message: "Failed to complete authorize-and-send workflow" });
    }
  });

  // Batch authorize and send endpoint (consolidates multiple submissions into one invoice)
  app.post("/api/billing-submissions/batch-authorize-and-send", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);
      if (!user?.orgId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Check permissions: only admin/supervisor can use this feature
      if (user.role !== 'admin' && user.role !== 'supervisor') {
        return res.status(403).json({ message: "Only admin or supervisor users can authorize and send" });
      }

      const { submissionIds, recipientEmail, message: customMessage } = req.body;

      if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
        return res.status(400).json({ message: "submissionIds array is required" });
      }

      // Fetch all submissions
      const submissions = await Promise.all(
        submissionIds.map((id: string) => storage.getBillingSubmission(id))
      );

      // Validate all submissions exist, belong to org, and are pending
      for (const submission of submissions) {
        if (!submission || submission.orgId !== user.orgId) {
          return res.status(404).json({ message: "One or more billing submissions not found" });
        }
        if (submission.status !== 'pending') {
          return res.status(400).json({ message: "All submissions must be in pending status" });
        }
      }

      // Ensure all submissions are for the same client
      const clientIds = [...new Set(submissions.map(s => s!.clientId))];
      if (clientIds.length > 1) {
        return res.status(400).json({ message: "All submissions must be for the same client" });
      }

      const clientId = submissions[0]!.clientId;
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      const org = await storage.getOrg(user.orgId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Step 1: Authorize all submissions and create invoice in try-catch for error handling
      try {
        // Authorize all submissions
        await Promise.all(
          submissions.map(s => storage.authorizeBillingSubmission(s!.id, userId))
        );
      } catch (authError) {
        return res.status(500).json({ message: "Failed to authorize submissions" });
      }

      // Step 2: Create consolidated invoice
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      // Consolidate all line items, notes, and attachments from all submissions
      const allLineItems: any[] = [];
      const allNotes: string[] = [];
      const allAttachments: any[] = [];
      let totalAmountCents = 0;

      submissions.forEach((submission) => {
        if (!submission) return;
        
        // Safely handle line items (default to empty array if null/undefined)
        const submissionLineItems = (Array.isArray((submission as any).lineItems) ? (submission as any).lineItems : []).map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          unitAmountCents: item.rateCents,
          totalCents: item.amountCents
        }));
        
        allLineItems.push(...submissionLineItems);
        
        // Safely collect notes
        if ((submission as any).notes && typeof (submission as any).notes === 'string') {
          allNotes.push(`[${submission.description}]: ${(submission as any).notes}`);
        }
        
        // Safely collect attachments (deduplicate by URL)
        if (Array.isArray((submission as any).attachments)) {
          (submission as any).attachments.forEach((att: any) => {
            if (att && att.url && !allAttachments.find((a: any) => a.url === att.url)) {
              allAttachments.push(att);
            }
          });
        }
        
        totalAmountCents += submission.amountCents;
      });

      // Build consolidated description
      const consolidatedDescription = `Consolidated invoice for ${submissions.length} submission(s):\n` + 
        submissions.map((s, i) => `${i + 1}. ${s!.description}`).join('\n');

      const consolidatedNotes = allNotes.length > 0 ? allNotes.join('\n\n') : undefined;

      const invoice = await storage.createClientInvoice({
        orgId: user.orgId,
        clientId: clientId,
        source: 'manual',
        invoiceNumber,
        amountCents: totalAmountCents,
        currency: 'usd',
        status: 'open',
        description: consolidatedDescription,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        issuedAt: new Date(),
        lineItems: allLineItems,
        attachments: allAttachments,
        metadata: {
          submissionIds: submissionIds,
          authorizedBy: userId,
          consolidatedInvoice: true,
          submissionCount: submissions.length,
          notes: consolidatedNotes || null
        },
        createdBy: userId
      });

      // Link all submissions to invoice and mark as invoiced
      await Promise.all(
        submissions.map(s => 
          storage.updateBillingSubmission(s!.id, { 
            status: 'invoiced',
            invoiceId: invoice.id
          })
        )
      );

      // Update client's last invoice date
      await storage.updateClient(clientId, {
        lastInvoiceDate: new Date()
      });

      // Step 3: Generate PDF and send email with organization's selected template
      try {
        const customFields = await storage.getCustomFields(orgId, "invoice");
        const { generateInvoicePDFWithTemplate } = await import('./invoiceUtils.js');
        const pdfBuffer = await generateInvoicePDFWithTemplate(
          invoice, 
          client, 
          org, 
          org.invoiceTemplateId || 'modern',
          customFields.map(cf => ({
            fieldKey: cf.fieldKey,
            fieldName: cf.fieldName,
            fieldType: cf.fieldType
          }))
        );

        // Store PDF in object storage
        const pdfKey = `invoices/org/${org.id}/clients/${client.id}/${invoice.id}.pdf`;
        const bucket = storage.getBucket();
        const file = bucket.file(pdfKey);
        await file.save(pdfBuffer, {
          contentType: 'application/pdf',
          metadata: {
            invoiceId: invoice.id,
            clientId: client.id,
            orgId: org.id,
            consolidated: 'true'
          }
        });

        // Update invoice with PDF key
        await storage.updateClientInvoice(invoice.id, {
          pdfStorageKey: pdfKey
        });

        // Send email with PDF attachment
        const { generateInvoiceEmail, sendInvoiceEmail } = await import('./emailUtils.js');
        const emailSubject = `Invoice ${invoice.invoiceNumber} from ${org.name}`;
        const emailBody = await generateInvoiceEmail(
          invoice,
          client,
          org,
          customMessage || `Please find attached your consolidated invoice.`
        );

        await sendInvoiceEmail(recipientEmail, emailSubject, emailBody, pdfBuffer, invoice.invoiceNumber);

        // Update invoice as sent
        await storage.updateClientInvoice(invoice.id, {
          sentAt: new Date()
        });

        res.json({
          success: true,
          invoice,
          submissionsConsolidated: submissions.length,
          message: `Successfully created consolidated invoice for ${submissions.length} submission(s)`
        });
      } catch (pdfError) {
        console.error("Error generating/sending PDF:", pdfError);
        // Invoice was created but PDF/email failed
        return res.status(500).json({ 
          message: "Invoice created but failed to generate PDF or send email",
          invoice
        });
      }
    } catch (error) {
      console.error("Error in batch authorize-and-send workflow:", error);
      res.status(500).json({ message: "Failed to complete batch authorize-and-send workflow" });
    }
  });

  // Client Invoice endpoints
  app.post("/api/billing/generate-invoice", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);
      if (!user?.orgId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const validatedData = insertClientInvoiceSchema.parse({
        ...req.body,
        orgId: user.orgId,
        createdBy: userId,
      });

      const invoice = await storage.createClientInvoice(validatedData);
      res.status(201).json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.get("/api/clients/:clientId/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub || req.user?.id);
      if (!user?.orgId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { clientId } = req.params;
      const client = await storage.getClient(clientId);
      
      if (!client || client.orgId !== user.orgId) {
        return res.status(404).json({ message: "Client not found" });
      }

      const invoices = await storage.getClientInvoicesByClient(clientId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching client invoices:", error);
      res.status(500).json({ message: "Failed to fetch client invoices" });
    }
  });

  app.get("/api/invoices/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub || req.user?.id);
      if (!user?.orgId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { id } = req.params;
      const invoice = await storage.getClientInvoice(id);
      
      if (!invoice || invoice.orgId !== user.orgId) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.patch("/api/invoices/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub || req.user?.id);
      if (!user?.orgId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { id } = req.params;
      const invoice = await storage.getClientInvoice(id);
      
      if (!invoice || invoice.orgId !== user.orgId) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const validatedData = insertClientInvoiceSchema.partial().parse(req.body);
      const updated = await storage.updateClientInvoice(id, validatedData);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  // Support request endpoints
  app.post("/api/support-requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const validatedData = insertSupportRequestSchema.parse({
        ...req.body,
        organizationId: user.orgId,
        userId: user.id,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      });

      const supportRequest = await storage.createSupportRequest(validatedData);
      
      res.status(201).json(supportRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating support request:", error);
      res.status(500).json({ message: "Failed to create support request" });
    }
  });

  app.get("/api/super-admin/support-requests", isSuperAdmin, async (req, res) => {
    try {
      const requests = await storage.getSupportRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching support requests:", error);
      res.status(500).json({ message: "Failed to fetch support requests" });
    }
  });

  app.patch("/api/super-admin/support-requests/:id/status", isSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      if (!["new", "in_progress", "resolved"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updated = await storage.updateSupportRequestStatus(id, status);
      res.json(updated);
    } catch (error) {
      console.error("Error updating support request status:", error);
      res.status(500).json({ message: "Failed to update support request status" });
    }
  });

  // Email template endpoints (Super Admin only)
  app.get("/api/super-admin/email-templates", isSuperAdmin, async (req, res) => {
    try {
      const templates = await storage.getEmailTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching email templates:", error);
      res.status(500).json({ message: "Failed to fetch email templates" });
    }
  });

  app.post("/api/super-admin/email-templates", isSuperAdmin, async (req, res) => {
    try {
      const validatedData = insertEmailTemplateSchema.parse(req.body);
      const template = await storage.createEmailTemplate(validatedData);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating email template:", error);
      res.status(500).json({ message: "Failed to create email template" });
    }
  });

  app.patch("/api/super-admin/email-templates/:id", isSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertEmailTemplateSchema.partial().parse(req.body);
      const updated = await storage.updateEmailTemplate(id, validatedData);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating email template:", error);
      res.status(500).json({ message: "Failed to update email template" });
    }
  });

  app.delete("/api/super-admin/email-templates/:id", isSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteEmailTemplate(id);
      res.json({ message: "Email template deleted successfully" });
    } catch (error) {
      console.error("Error deleting email template:", error);
      res.status(500).json({ message: "Failed to delete email template" });
    }
  });

  // Custom Fields endpoints
  app.get("/api/custom-fields", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId;
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }
      
      const entityType = req.query.entityType as "task"|"property"|"contact"|undefined;
      const fields = await storage.getCustomFields(orgId, entityType);
      res.json(fields);
    } catch (error) {
      console.error("Error fetching custom fields:", error);
      res.status(500).json({ message: "Failed to fetch custom fields" });
    }
  });

  app.post("/api/custom-fields", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId;
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }
      
      // Generate a temporary fieldKey from fieldName for validation
      const tempFieldKey = req.body.fieldName?.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'field';
      
      const validatedData = insertCustomFieldSchema.parse({ 
        ...req.body, 
        orgId,
        fieldKey: tempFieldKey // Temporary key, will be regenerated with collision handling in createCustomField
      });
      const field = await storage.createCustomField(validatedData);
      res.status(201).json(field);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      // Handle unique constraint violations
      if (error instanceof Error && error.message.includes("unique constraint")) {
        return res.status(409).json({ 
          message: "A custom field with this name already exists for this entity type. Please try a different name." 
        });
      }
      console.error("Error creating custom field:", error);
      res.status(500).json({ message: "Failed to create custom field" });
    }
  });

  app.patch("/api/custom-fields/:id", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId;
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }
      
      const id = parseInt(req.params.id);
      const validatedData = updateCustomFieldSchema.parse(req.body);
      const updated = await storage.updateCustomField(id, orgId, validatedData);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      if (error instanceof Error && error.message.includes("not found or access denied")) {
        return res.status(404).json({ message: error.message });
      }
      console.error("Error updating custom field:", error);
      res.status(500).json({ message: "Failed to update custom field" });
    }
  });

  app.delete("/api/custom-fields/:id", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId;
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }
      
      const id = parseInt(req.params.id);
      await storage.deleteCustomField(id, orgId);
      res.json({ message: "Custom field deleted successfully" });
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found or access denied")) {
        return res.status(404).json({ message: error.message });
      }
      console.error("Error deleting custom field:", error);
      res.status(500).json({ message: "Failed to delete custom field" });
    }
  });

  app.post("/api/custom-fields/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId;
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }
      
      const { fieldIds } = req.body;
      if (!Array.isArray(fieldIds)) {
        return res.status(400).json({ message: "fieldIds must be an array" });
      }
      
      await storage.reorderCustomFields(orgId, fieldIds);
      res.json({ message: "Custom fields reordered successfully" });
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found or access denied")) {
        return res.status(404).json({ message: error.message });
      }
      console.error("Error reordering custom fields:", error);
      res.status(500).json({ message: "Failed to reorder custom fields" });
    }
  });

  // Email template routes
  app.get("/api/email-templates", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId;
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }
      
      const templates = await storage.getOrgEmailTemplates(orgId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching email templates:", error);
      res.status(500).json({ message: "Failed to fetch email templates" });
    }
  });

  app.get("/api/email-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId;
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }
      
      const id = parseInt(req.params.id);
      const template = await storage.getOrgEmailTemplate(id, orgId);
      
      if (!template) {
        return res.status(404).json({ message: "Email template not found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching email template:", error);
      res.status(500).json({ message: "Failed to fetch email template" });
    }
  });

  app.post("/api/email-templates", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId;
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }
      
      const validatedData = insertOrgEmailTemplateSchema.parse({
        ...req.body,
        orgId,
      });
      
      const template = await storage.createOrgEmailTemplate(validatedData);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid template data", errors: error.errors });
      }
      console.error("Error creating email template:", error);
      res.status(500).json({ message: "Failed to create email template" });
    }
  });

  app.patch("/api/email-templates/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId;
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }
      
      const id = parseInt(req.params.id);
      const template = await storage.updateOrgEmailTemplate(id, orgId, req.body);
      res.json(template);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Email template not found" });
      }
      console.error("Error updating email template:", error);
      res.status(500).json({ message: "Failed to update email template" });
    }
  });

  app.delete("/api/email-templates/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId;
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }
      
      const id = parseInt(req.params.id);
      await storage.deleteOrgEmailTemplate(id, orgId);
      res.json({ message: "Email template deleted successfully" });
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Email template not found" });
      }
      console.error("Error deleting email template:", error);
      res.status(500).json({ message: "Failed to delete email template" });
    }
  });

  // Advanced email sending route
  app.post("/api/send-email-advanced", isAuthenticated, async (req: any, res) => {
    try {
      const { processMergeFields, buildMergeFieldData, sendEmail } = await import('./email-service');
      
      const orgId = req.user?.claims?.orgId;
      const userId = req.user?.claims?.sub || req.user?.id;
      
      if (!orgId || !userId) {
        return res.status(400).json({ message: "Organization ID or User ID not found" });
      }
      
      const {
        recipientEmail,
        recipientName,
        recipientContactId,
        subject,
        body,
        templateId,
        scheduledFor,
        mergeFieldData = {},
        propertyId,
      } = req.body;
      
      if (!recipientEmail) {
        return res.status(400).json({ message: "Recipient email is required" });
      }
      
      let finalSubject = subject;
      let finalBody = body;
      
      // Load template if provided
      if (templateId) {
        const template = await storage.getOrgEmailTemplate(templateId, orgId);
        if (!template) {
          return res.status(404).json({ message: "Email template not found" });
        }
        finalSubject = template.subject;
        finalBody = template.body;
      }
      
      if (!finalSubject || !finalBody) {
        return res.status(400).json({ message: "Subject and body are required" });
      }
      
      // Build merge field data
      const mergeData = await buildMergeFieldData({
        contactId: recipientContactId,
        propertyId,
        senderId: userId,
        orgId,
        additionalData: mergeFieldData,
      });
      
      // Process merge fields in subject and body
      finalSubject = processMergeFields(finalSubject, mergeData);
      finalBody = processMergeFields(finalBody, mergeData);
      
      // Get sender info
      const sender = await storage.getUser(userId);
      const senderName = sender ? [sender.firstName, sender.lastName].filter(Boolean).join(' ') || sender.email : undefined;
      const senderEmail = sender?.email || undefined;
      
      // If scheduling, create scheduled email record
      if (scheduledFor) {
        const scheduledDate = new Date(scheduledFor);
        if (isNaN(scheduledDate.getTime())) {
          return res.status(400).json({ message: "Invalid scheduled date" });
        }
        
        // Create scheduled email
        await storage.createScheduledEmail({
          orgId,
          senderId: userId,
          senderName: senderName || 'Unknown',
          senderEmail: senderEmail || '',
          recipientContactId: recipientContactId || null,
          recipientEmail,
          recipientName: recipientName || null,
          subject: finalSubject,
          body: finalBody,
          templateId: templateId || null,
          scheduledFor: scheduledDate,
          status: "pending",
        });
        
        // Create email history record with scheduled status
        await storage.createEmailHistory({
          orgId,
          senderId: userId,
          senderName: senderName || 'Unknown',
          senderEmail: senderEmail || '',
          recipientContactId: recipientContactId || null,
          recipientEmail,
          recipientName: recipientName || null,
          subject: finalSubject,
          body: finalBody,
          templateId: templateId || null,
          status: "scheduled",
          scheduledFor: scheduledDate,
          sentAt: null,
          errorMessage: null,
        });
        
        return res.json({ message: "Email scheduled successfully", scheduledFor: scheduledDate });
      }
      
      // Send immediately
      await sendEmail({
        to: recipientEmail,
        subject: finalSubject,
        body: finalBody,
        orgId,
        fromName: senderName,
        fromEmail: senderEmail,
      });
      
      // Create email history record
      await storage.createEmailHistory({
        orgId,
        senderId: userId,
        senderName: senderName || 'Unknown',
        senderEmail: senderEmail || '',
        recipientContactId: recipientContactId || null,
        recipientEmail,
        recipientName: recipientName || null,
        subject: finalSubject,
        body: finalBody,
        templateId: templateId || null,
        status: "sent",
        scheduledFor: null,
        sentAt: new Date(),
        errorMessage: null,
      });
      
      res.json({ message: "Email sent successfully" });
    } catch (error: any) {
      console.error("Error sending email:", error);
      
      // Try to log failed send to email history
      try {
        const orgId = req.user?.claims?.orgId;
        const userId = req.user?.claims?.sub || req.user?.id;
        const sender = await storage.getUser(userId);
        const senderName = sender ? [sender.firstName, sender.lastName].filter(Boolean).join(' ') || sender.email : 'Unknown';
        const senderEmail = sender?.email || '';
        
        await storage.createEmailHistory({
          orgId,
          senderId: userId,
          senderName,
          senderEmail,
          recipientContactId: req.body.recipientContactId || null,
          recipientEmail: req.body.recipientEmail,
          recipientName: req.body.recipientName || null,
          subject: req.body.subject || 'Email send failed',
          body: req.body.body || '',
          templateId: req.body.templateId || null,
          status: "failed",
          scheduledFor: null,
          sentAt: null,
          errorMessage: error.message || 'Unknown error',
        });
      } catch (historyError) {
        console.error("Error logging failed email to history:", historyError);
      }
      
      res.status(500).json({ message: error.message || "Failed to send email" });
    }
  });

  // Email history routes
  app.get("/api/contacts/:id/email-history", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId;
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }
      
      const contactId = parseInt(req.params.id);
      const history = await storage.getEmailHistory(orgId, contactId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching email history:", error);
      res.status(500).json({ message: "Failed to fetch email history" });
    }
  });

  // Scheduled emails routes
  app.get("/api/scheduled-emails", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId;
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }
      
      const status = req.query.status as "pending"|"sent"|"failed"|"cancelled"|undefined;
      const scheduledEmails = await storage.getScheduledEmails(orgId, status);
      res.json(scheduledEmails);
    } catch (error) {
      console.error("Error fetching scheduled emails:", error);
      res.status(500).json({ message: "Failed to fetch scheduled emails" });
    }
  });

  app.patch("/api/scheduled-emails/:id/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId;
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }
      
      const id = parseInt(req.params.id);
      const scheduledEmail = await storage.getScheduledEmail(id, orgId);
      
      if (!scheduledEmail) {
        return res.status(404).json({ message: "Scheduled email not found" });
      }
      
      if (scheduledEmail.status !== "pending") {
        return res.status(400).json({ message: "Only pending emails can be cancelled" });
      }
      
      const updated = await storage.updateScheduledEmail(id, orgId, { status: "cancelled" });
      res.json({ message: "Scheduled email cancelled successfully", email: updated });
    } catch (error) {
      console.error("Error cancelling scheduled email:", error);
      res.status(500).json({ message: "Failed to cancel scheduled email" });
    }
  });

  app.patch("/api/scheduled-emails/:id/reschedule", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId;
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID not found" });
      }
      
      const id = parseInt(req.params.id);
      const { scheduledFor } = req.body;
      
      if (!scheduledFor) {
        return res.status(400).json({ message: "New scheduled time is required" });
      }
      
      const scheduledEmail = await storage.getScheduledEmail(id, orgId);
      
      if (!scheduledEmail) {
        return res.status(404).json({ message: "Scheduled email not found" });
      }
      
      if (scheduledEmail.status !== "pending") {
        return res.status(400).json({ message: "Only pending emails can be rescheduled" });
      }
      
      const newScheduledDate = new Date(scheduledFor);
      if (newScheduledDate <= new Date()) {
        return res.status(400).json({ message: "Scheduled time must be in the future" });
      }
      
      const updated = await storage.updateScheduledEmail(id, orgId, { scheduledFor: newScheduledDate.toISOString() });
      res.json({ message: "Scheduled email rescheduled successfully", email: updated });
    } catch (error) {
      console.error("Error rescheduling scheduled email:", error);
      res.status(500).json({ message: "Failed to reschedule scheduled email" });
    }
  });

  // =====================
  // Webhook Endpoints API
  // =====================

  /**
   * Redacts the signing secret before sending endpoint data to the client.
   * Returns only the last 4 characters so admins can identify which key is set
   * without exposing the full secret. All secrets are stored only server-side.
   */
  function redactEndpointSecret<T extends { secret: string }>(endpoint: T): Omit<T, "secret"> & { secretHint: string } {
    const { secret, ...rest } = endpoint;
    return { ...rest, secretHint: "••••" + secret.slice(-4) };
  }

  // Zapier/webhook endpoints — gated by zapier_integration feature flag
  const requireZapier = requireFeatureFlag("zapier_integration");

  // GET /api/webhooks/endpoints — list org's webhook endpoints
  app.get("/api/webhooks/endpoints", isAuthenticated, isAdmin, requireZapier, async (req, res) => {
    try {
      const orgId = req.user?.claims?.orgId || req.user?.orgId;
      if (!orgId) return res.status(400).json({ message: "Organization not found" });
      const endpoints = await storage.getWebhookEndpoints(orgId);
      res.json(endpoints.map(redactEndpointSecret));
    } catch (error) {
      console.error("Error fetching webhook endpoints:", error);
      res.status(500).json({ message: "Failed to fetch webhook endpoints" });
    }
  });

  // POST /api/webhooks/endpoints — create a new webhook endpoint
  app.post("/api/webhooks/endpoints", isAuthenticated, isAdmin, requireZapier, async (req, res) => {
    try {
      const orgId = req.user?.claims?.orgId || req.user?.orgId;
      if (!orgId) return res.status(400).json({ message: "Organization not found" });

      const schema = z.object({
        url: z.string().url("Must be a valid URL"),
        secret: z.string().min(8, "Secret must be at least 8 characters"),
        eventTypes: z.array(z.enum(WEBHOOK_EVENT_TYPES)).min(1, "Select at least one event type"),
        enabled: z.boolean().optional().default(true),
        description: z.string().optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const urlCheck = await validateWebhookUrlSafe(parsed.data.url);
      if (!urlCheck.valid) {
        return res.status(400).json({ message: urlCheck.reason });
      }

      const endpoint = await storage.createWebhookEndpoint({ ...parsed.data, orgId });
      res.status(201).json(redactEndpointSecret(endpoint));
    } catch (error) {
      console.error("Error creating webhook endpoint:", error);
      res.status(500).json({ message: "Failed to create webhook endpoint" });
    }
  });

  // PATCH /api/webhooks/endpoints/:id — update a webhook endpoint
  app.patch("/api/webhooks/endpoints/:id", isAuthenticated, isAdmin, requireZapier, async (req, res) => {
    try {
      const orgId = req.user?.claims?.orgId || req.user?.orgId;
      if (!orgId) return res.status(400).json({ message: "Organization not found" });

      const { id } = req.params;
      const schema = z.object({
        url: z.string().url().optional(),
        secret: z.string().min(8).optional(),
        eventTypes: z.array(z.enum(WEBHOOK_EVENT_TYPES)).optional(),
        enabled: z.boolean().optional(),
        description: z.string().optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      if (parsed.data.url) {
        const urlCheck = await validateWebhookUrlSafe(parsed.data.url);
        if (!urlCheck.valid) {
          return res.status(400).json({ message: urlCheck.reason });
        }
      }

      const existing = await storage.getWebhookEndpoint(id, orgId);
      if (!existing) return res.status(404).json({ message: "Endpoint not found" });

      const updated = await storage.updateWebhookEndpoint(id, orgId, parsed.data);
      res.json(redactEndpointSecret(updated));
    } catch (error) {
      console.error("Error updating webhook endpoint:", error);
      res.status(500).json({ message: "Failed to update webhook endpoint" });
    }
  });

  // DELETE /api/webhooks/endpoints/:id — delete a webhook endpoint
  app.delete("/api/webhooks/endpoints/:id", isAuthenticated, isAdmin, requireZapier, async (req, res) => {
    try {
      const orgId = req.user?.claims?.orgId || req.user?.orgId;
      if (!orgId) return res.status(400).json({ message: "Organization not found" });

      const { id } = req.params;
      const existing = await storage.getWebhookEndpoint(id, orgId);
      if (!existing) return res.status(404).json({ message: "Endpoint not found" });

      await storage.deleteWebhookEndpoint(id, orgId);
      res.json({ message: "Webhook endpoint deleted" });
    } catch (error) {
      console.error("Error deleting webhook endpoint:", error);
      res.status(500).json({ message: "Failed to delete webhook endpoint" });
    }
  });

  // POST /api/webhooks/endpoints/:id/test — send a test event
  app.post("/api/webhooks/endpoints/:id/test", isAuthenticated, isAdmin, requireZapier, async (req, res) => {
    try {
      const orgId = req.user?.claims?.orgId || req.user?.orgId;
      if (!orgId) return res.status(400).json({ message: "Organization not found" });

      const { id } = req.params;
      const result = await sendTestWebhookEvent(id, orgId);
      res.json(result);
    } catch (error: any) {
      console.error("Error sending test webhook:", error);
      res.status(500).json({ message: error.message || "Failed to send test event" });
    }
  });

  // GET /api/webhooks/endpoints/:id/deliveries — delivery log for an endpoint
  app.get("/api/webhooks/endpoints/:id/deliveries", isAuthenticated, isAdmin, requireZapier, async (req, res) => {
    try {
      const orgId = req.user?.claims?.orgId || req.user?.orgId;
      if (!orgId) return res.status(400).json({ message: "Organization not found" });

      const { id } = req.params;
      const deliveries = await storage.getWebhookDeliveries(id, orgId);
      res.json(deliveries);
    } catch (error) {
      console.error("Error fetching webhook deliveries:", error);
      res.status(500).json({ message: "Failed to fetch delivery log" });
    }
  });

  // ============================================================
  // Checklist Template Routes
  // ============================================================

  app.get("/api/checklist-templates", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId || req.user?.orgId;
      if (!orgId) return res.status(400).json({ message: "Organization not found" });
      const templates = await storage.getChecklistTemplates(orgId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching checklist templates:", error);
      res.status(500).json({ message: "Failed to fetch checklist templates" });
    }
  });

  app.post("/api/checklist-templates", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId || req.user?.orgId;
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!orgId) return res.status(400).json({ message: "Organization not found" });
      const { name, description, category, items } = req.body;
      if (!name || !category) return res.status(400).json({ message: "name and category are required" });
      const template = await storage.createChecklistTemplate({
        orgId,
        name,
        description: description || null,
        category,
        items: items || [],
        isActive: true,
        createdBy: userId,
      });
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating checklist template:", error);
      res.status(500).json({ message: "Failed to create checklist template" });
    }
  });

  app.patch("/api/checklist-templates/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId || req.user?.orgId;
      if (!orgId) return res.status(400).json({ message: "Organization not found" });
      const { id } = req.params;
      const { name, description, category, items, isActive } = req.body;
      const template = await storage.updateChecklistTemplate(id, orgId, {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(items !== undefined && { items }),
        ...(isActive !== undefined && { isActive }),
      });
      res.json(template);
    } catch (error) {
      console.error("Error updating checklist template:", error);
      res.status(500).json({ message: "Failed to update checklist template" });
    }
  });

  app.delete("/api/checklist-templates/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId || req.user?.orgId;
      if (!orgId) return res.status(400).json({ message: "Organization not found" });
      await storage.deleteChecklistTemplate(req.params.id, orgId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting checklist template:", error);
      res.status(500).json({ message: "Failed to delete checklist template" });
    }
  });

  // ============================================================
  // Task Checklist Item Routes (inspection-enhanced)
  // ============================================================

  app.get("/api/tasks/:taskId/checklist-items", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      if (isNaN(taskId)) return res.status(400).json({ message: "Invalid task ID" });
      const task = await storage.getTask(taskId);
      if (!task) return res.status(404).json({ message: "Task not found" });
      const userOrgId = req.user?.claims?.orgId || req.user?.claims?.org_id || req.user?.orgId;
      if (task.orgId !== userOrgId) return res.status(403).json({ message: "Forbidden" });
      const items = await storage.getTaskChecklistItems(taskId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching checklist items:", error);
      res.status(500).json({ message: "Failed to fetch checklist items" });
    }
  });

  app.post("/api/tasks/:taskId/checklist-items", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const { text, required, sortOrder, category } = req.body;
      if (!text) return res.status(400).json({ message: "text is required" });
      const trimmedCategory = typeof category === "string" ? category.trim() : undefined;
      const item = await storage.createTaskChecklistItem({
        taskId,
        text,
        required: required || false,
        sortOrder: sortOrder || 0,
        ...(trimmedCategory ? { category: trimmedCategory } : {}),
      });
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating checklist item:", error);
      res.status(500).json({ message: "Failed to create checklist item" });
    }
  });

  app.patch("/api/task-checklist-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub || req.user?.id;
      const { text, completed, result, resultNote, photoUrl, photoUrls, required, notes, priority, sortOrder } = req.body;
      const updates: Record<string, any> = {};
      if (text !== undefined) updates.text = text;
      if (required !== undefined) updates.required = required;
      if (notes !== undefined) updates.notes = notes;
      if (priority !== undefined) updates.priority = priority;
      if (sortOrder !== undefined) updates.sortOrder = sortOrder;
      if (result !== undefined) updates.result = result;
      if (resultNote !== undefined) updates.resultNote = resultNote;
      if (photoUrl !== undefined) updates.photoUrl = photoUrl;
      if (photoUrls !== undefined) updates.photoUrls = photoUrls;
      if (completed !== undefined) {
        updates.completed = completed;
        updates.completedAt = completed ? new Date() : null;
        updates.completedBy = completed ? userId : null;
      }
      const item = await storage.updateTaskChecklistItem(id, updates);

      // Auto-complete task if all required items now have a result
      if (result !== undefined && item.taskId) {
        try {
          const allItems = await storage.getTaskChecklistItems(item.taskId);
          const requiredItems = allItems.filter((i: any) => i.required);
          const allRequiredHaveResult = requiredItems.length > 0 && requiredItems.every((i: any) => i.result && i.result !== "");
          if (allRequiredHaveResult) {
            const task = await storage.getTask(item.taskId);
            if (task && (task as any).status !== "completed") {
              await storage.updateTask(item.taskId, { status: "completed", completedAt: new Date() } as any);
            }
          }
        } catch (autoErr) {
          console.warn("Auto-complete check failed (non-fatal):", autoErr);
        }
      }

      res.json(item);
    } catch (error) {
      console.error("Error updating checklist item:", error);
      res.status(500).json({ message: "Failed to update checklist item" });
    }
  });

  app.delete("/api/task-checklist-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteTaskChecklistItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting checklist item:", error);
      res.status(500).json({ message: "Failed to delete checklist item" });
    }
  });

  // Apply a checklist template to a task (bulk-create items)
  app.post("/api/tasks/:taskId/apply-checklist-template", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const { templateId } = req.body;
      if (!templateId) return res.status(400).json({ message: "templateId is required" });
      const template = await storage.getChecklistTemplate(templateId);
      if (!template) return res.status(404).json({ message: "Template not found" });
      const items = (template.items as Array<{ text: string; required?: boolean; category?: string }>) || [];
      const created = [];
      for (let i = 0; i < items.length; i++) {
        const item = await storage.createTaskChecklistItem({
          taskId,
          text: items[i].text,
          required: items[i].required || false,
          category: items[i].category || null,
          sortOrder: i,
        });
        created.push(item);
      }
      res.status(201).json(created);
    } catch (error) {
      console.error("Error applying checklist template:", error);
      res.status(500).json({ message: "Failed to apply checklist template" });
    }
  });

  // Helper: generate inspection report PDF as a Buffer
  /**
   * Download a photo from trusted GCS object storage and resize it for PDF embedding.
   * Only accepts URLs from the known storage.googleapis.com domain for our Replit
   * bucket (prefix "repl-"), which prevents SSRF to internal or arbitrary hosts.
   * Enforces a max download size before Sharp processing to limit memory use.
   */
  async function fetchPhotoForPdf(url: string): Promise<Buffer | null> {
    const GCS_PREFIX = "https://storage.googleapis.com/";
    if (typeof url !== "string" || !url.startsWith(GCS_PREFIX)) return null;
    const withoutPrefix = url.slice(GCS_PREFIX.length);
    const slashIdx = withoutPrefix.indexOf("/");
    if (slashIdx === -1) return null;
    const bucketName = withoutPrefix.slice(0, slashIdx);
    const objectName = withoutPrefix.slice(slashIdx + 1);
    // Only allow our Replit-provisioned buckets and the checklist-photos path
    if (!bucketName.startsWith("repl-") || !objectName) return null;
    if (!objectName.startsWith("public/checklist-photos/")) return null;
    const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB hard limit before processing
    try {
      const { objectStorageClient } = await import("./objectStorage");
      const [contents] = await objectStorageClient.bucket(bucketName).file(objectName).download();
      if (!contents || contents.length > MAX_PHOTO_BYTES) return null;
      const sharp = (await import("sharp")).default;
      return await sharp(contents as Buffer)
        .rotate()
        .resize(320, undefined, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();
    } catch {
      return null;
    }
  }

  async function buildInspectionReportPdf(
    task: any,
    checklistItems: any[],
    opts?: { watermark?: boolean; orgBrandingLogo?: string | null }
  ): Promise<Buffer> {
    // Pre-fetch and resize photos for failed items before PDF construction.
    // Capped at MAX_PHOTOS_TOTAL across the whole report and MAX_PHOTOS_PER_ITEM
    // per item. Photos are fetched sequentially to bound concurrency/memory.
    const MAX_PHOTOS_PER_ITEM = 3;
    const MAX_PHOTOS_TOTAL = 9;
    const failItems = checklistItems.filter((i: any) => i.result === "fail");

    // Collect (itemId, url) pairs up to the global cap
    const photoJobs: Array<{ itemId: string; url: string }> = [];
    for (const item of failItems) {
      if (photoJobs.length >= MAX_PHOTOS_TOTAL) break;
      const urls: string[] = [
        ...(Array.isArray(item.photoUrls) ? item.photoUrls : []),
        ...(item.photoUrl && !(item.photoUrls || []).includes(item.photoUrl) ? [item.photoUrl] : []),
      ]
        .filter((u: string) => typeof u === "string" && u.startsWith("https://storage.googleapis.com/"))
        .slice(0, MAX_PHOTOS_PER_ITEM);
      for (const url of urls) {
        if (photoJobs.length >= MAX_PHOTOS_TOTAL) break;
        photoJobs.push({ itemId: String(item.id), url });
      }
    }

    // Fetch sequentially to keep memory/concurrency predictable
    const photoBufferMap = new Map<string, Buffer[]>();
    for (const { itemId, url } of photoJobs) {
      const buf = await fetchPhotoForPdf(url);
      if (!buf) continue;
      const arr = photoBufferMap.get(itemId) || [];
      arr.push(buf);
      photoBufferMap.set(itemId, arr);
    }

    // Pre-fetch header logo (org branding logo if set, else Hubify Homes platform logo).
    const { resolvePdfHeaderLogo: resolveInspectionLogo } = await import("./pdfLogoHelper");
    const headerLogoBuf = await resolveInspectionLogo(opts?.orgBrandingLogo ?? null);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: "A4", bufferPages: opts?.watermark === true });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const passCount = checklistItems.filter((i: any) => i.result === "pass").length;
      const failCount = checklistItems.filter((i: any) => i.result === "fail").length;
      const naCount = checklistItems.filter((i: any) => i.result === "na").length;
      const pendingCount = checklistItems.filter((i: any) => !i.result).length;
      const totalItems = checklistItems.length;
      const overallScore = totalItems > 0 ? Math.round(((passCount + naCount) / totalItems) * 100) : null;

      const propertyAddress = task.property?.address1 || "";
      const inspector = task.assignedUser
        ? `${task.assignedUser.firstName || ""} ${task.assignedUser.lastName || ""}`.trim()
        : "";
      const dueDateStr = task.dueDate
        ? new Date(task.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        : "";
      const generatedAt = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

      // ── Header ──
      const headerStartY = doc.y;
      doc.fontSize(20).fillColor("#1e40af").text("Inspection Report", 50, headerStartY, { align: "left" });
      doc.fontSize(9).fillColor("#64748b").text(`Generated ${generatedAt}`, 50, doc.y, { align: "left" });
      if (headerLogoBuf) {
        try {
          doc.image(headerLogoBuf, doc.page.width - 50 - 110, headerStartY, { fit: [110, 44], align: "right", valign: "top" });
        } catch (err) {
          console.error("Error rendering header logo on inspection PDF:", err);
        }
      }
      doc.moveDown(0.5);

      // ── Task Details ──
      doc.fontSize(14).fillColor("#0f172a").text(task.title || "Untitled Task");
      doc.moveDown(0.3);
      const detailParts: string[] = [];
      if (propertyAddress) detailParts.push(`Property: ${propertyAddress}`);
      if (dueDateStr) detailParts.push(`Due: ${dueDateStr}`);
      if (inspector) detailParts.push(`Inspector: ${inspector}`);
      if (detailParts.length > 0) {
        doc.fontSize(9).fillColor("#475569").text(detailParts.join("   |   "));
      }
      if (task.description) {
        doc.moveDown(0.3);
        doc.fontSize(9).fillColor("#64748b").text(task.description);
      }
      doc.moveDown(0.8);

      // ── Horizontal Rule ──
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#e2e8f0").stroke();
      doc.moveDown(0.6);

      // ── Summary ──
      doc.fontSize(12).fillColor("#0f172a").text("Performance Summary");
      doc.moveDown(0.4);

      const scoreColor = overallScore === null ? "#64748b" : overallScore >= 80 ? "#16a34a" : overallScore >= 60 ? "#ca8a04" : "#dc2626";
      const summaryY = doc.y;
      const boxWidth = 90;
      const boxGap = 10;
      const boxes = [
        { label: "Overall Score", value: overallScore !== null ? `${overallScore}%` : "—", color: scoreColor },
        { label: "Passed", value: String(passCount), color: "#16a34a" },
        { label: "Failed", value: String(failCount), color: "#dc2626" },
        { label: "N/A", value: String(naCount), color: "#64748b" },
        { label: "Pending", value: String(pendingCount), color: "#f59e0b" },
      ];

      boxes.forEach((box, i) => {
        const bx = 50 + i * (boxWidth + boxGap);
        doc.rect(bx, summaryY, boxWidth, 52).fillColor("#f8fafc").fill();
        doc.rect(bx, summaryY, boxWidth, 52).strokeColor("#e2e8f0").stroke();
        doc.fontSize(20).fillColor(box.color).text(box.value, bx, summaryY + 8, { width: boxWidth, align: "center" });
        doc.fontSize(8).fillColor("#64748b").text(box.label, bx, summaryY + 34, { width: boxWidth, align: "center" });
      });

      doc.y = summaryY + 64;
      doc.moveDown(0.4);

      // ── Failed Items ──
      if (failItems.length > 0) {
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#e2e8f0").stroke();
        doc.moveDown(0.6);
        doc.fontSize(12).fillColor("#dc2626").text(`Failed Items (${failItems.length})`);
        doc.moveDown(0.4);
        for (const item of failItems) {
          const itemText = item.text || "";
          const noteText = item.resultNote || "";
          const photoBuffers = (photoBufferMap.get(item.id) || []).filter(Boolean) as Buffer[];
          const textH = doc.heightOfString(itemText, { fontSize: 9, width: 460 });
          const noteH = noteText ? doc.heightOfString(noteText, { fontSize: 8, width: 460 }) + 4 : 0;
          const PHOTO_DISPLAY_WIDTH = 160;
          const PHOTO_DISPLAY_HEIGHT = 120;
          const PHOTO_GAP = 7;
          const photoRowH = photoBuffers.length > 0 ? PHOTO_DISPLAY_HEIGHT + 10 : 0;
          const boxH = 12 + textH + noteH + 10;
          if (doc.y + boxH + photoRowH > 720) doc.addPage();
          const startY = doc.y;
          doc.rect(50, startY, 495, boxH).fillColor("#fef2f2").fill();
          doc.rect(50, startY, 495, boxH).strokeColor("#fca5a5").stroke();
          doc.fontSize(9).fillColor("#dc2626").text("✗", 58, startY + 8, { lineBreak: false });
          doc.fontSize(9).fillColor("#0f172a").text(itemText, 72, startY + 8, { width: 460 });
          if (noteText) {
            const noteY = startY + 8 + textH + 4;
            doc.fontSize(8).fillColor("#475569").text(noteText, 72, noteY, { width: 460 });
          }
          doc.y = startY + boxH + 4;
          // Embed photos below the item box
          if (photoBuffers.length > 0) {
            const photoY = doc.y + 2;
            photoBuffers.forEach((buf, idx) => {
              const photoX = 50 + idx * (PHOTO_DISPLAY_WIDTH + PHOTO_GAP);
              try {
                doc.image(buf, photoX, photoY, { width: PHOTO_DISPLAY_WIDTH, height: PHOTO_DISPLAY_HEIGHT });
              } catch {
                // skip unembeddable image
              }
            });
            doc.y = photoY + PHOTO_DISPLAY_HEIGHT + 6;
          }
        }
        doc.moveDown(0.4);
      }

      // ── Full Checklist ──
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#e2e8f0").stroke();
      doc.moveDown(0.6);
      doc.fontSize(12).fillColor("#0f172a").text(`Full Checklist (${totalItems} items)`);
      doc.moveDown(0.4);

      if (totalItems === 0) {
        doc.fontSize(9).fillColor("#94a3b8").text("No checklist items recorded for this inspection.", { align: "center" });
      } else {
        const grouped: Record<string, any[]> = {};
        checklistItems.forEach((item: any) => {
          const cat = (item.category || "General").trim() || "General";
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(item);
        });

        for (const [category, items] of Object.entries(grouped)) {
          if (doc.y > 700) doc.addPage();

          doc.fontSize(8).fillColor("#64748b").text(category.toUpperCase(), 50, doc.y, { width: 495 });
          doc.moveTo(50, doc.y + 1).lineTo(545, doc.y + 1).strokeColor("#e2e8f0").stroke();
          doc.moveDown(0.5);

          for (const item of items) {
            if (doc.y > 720) doc.addPage();

            const resultLabel = item.result === "pass" ? "PASS" : item.result === "fail" ? "FAIL" : item.result === "na" ? "N/A" : "PENDING";
            const resultColor = item.result === "pass" ? "#16a34a" : item.result === "fail" ? "#dc2626" : item.result === "na" ? "#64748b" : "#f59e0b";

            const itemY = doc.y;
            doc.fontSize(9).fillColor("#0f172a").text(item.text || "", 50, itemY, { width: 400 });
            doc.fontSize(8).fillColor(resultColor).text(resultLabel, 455, itemY, { width: 90, align: "right" });

            if (item.required) {
              doc.fontSize(7).fillColor("#64748b").text("Required", 50, doc.y, { width: 100 });
            }
            if (item.resultNote) {
              doc.fontSize(8).fillColor("#64748b").text(item.resultNote, 50, doc.y, { width: 495 });
            }
            doc.moveDown(0.5);

            if (doc.y < 720) {
              doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#f1f5f9").stroke();
              doc.moveDown(0.2);
            }
          }
          doc.moveDown(0.4);
        }
      }

      // ── Pending Warning ──
      if (pendingCount > 0) {
        if (doc.y > 700) doc.addPage();
        doc.moveDown(0.4);
        doc.rect(50, doc.y, 495, 30).fillColor("#fffbeb").fill();
        doc.rect(50, doc.y, 495, 30).strokeColor("#fcd34d").stroke();
        doc.fontSize(9).fillColor("#92400e").text(
          `⚠  ${pendingCount} item${pendingCount !== 1 ? "s" : ""} still pending review — this inspection is not yet complete.`,
          58, doc.y + 9, { width: 479 }
        );
        doc.y = doc.y + 38;
      }

      if (opts?.watermark === true) {
        import('./pdfGenerators/index.js').then(({ applyWatermarkToAllPages }) => {
          applyWatermarkToAllPages(doc);
          doc.end();
        }).catch(reject);
      } else {
        doc.end();
      }
    });
  }

  // GET /api/tasks/:id/inspection-report — full data for inspection report
  app.get("/api/tasks/:id/inspection-report", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId || req.user?.orgId;
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      if (!task || (task as any).orgId !== orgId) return res.status(404).json({ message: "Task not found" });
      const checklistItems = await storage.getTaskChecklistItems(taskId);
      const passCount = checklistItems.filter((i: any) => i.result === "pass").length;
      const failCount = checklistItems.filter((i: any) => i.result === "fail").length;
      const naCount = checklistItems.filter((i: any) => i.result === "na").length;
      const pendingCount = checklistItems.filter((i: any) => !i.result).length;
      res.json({ task, checklistItems, summary: { passCount, failCount, naCount, pendingCount } });
    } catch (error) {
      console.error("Error fetching inspection report:", error);
      res.status(500).json({ message: "Failed to fetch inspection report" });
    }
  });

  // POST /api/tasks/:id/inspection-report/email — email the report link to the property's client
  app.post("/api/tasks/:id/inspection-report/email", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId || req.user?.orgId;
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      if (!task || (task as any).orgId !== orgId) return res.status(404).json({ message: "Task not found" });

      const checklistItems = await storage.getTaskChecklistItems(taskId);
      const passCount = checklistItems.filter((i: any) => i.result === "pass").length;
      const failCount = checklistItems.filter((i: any) => i.result === "fail").length;
      const total = checklistItems.length;

      // Find client email — via task's contactId property
      let recipientEmail: string | null = null;
      let recipientName = "Client";
      if ((task as any).contact?.email) {
        recipientEmail = (task as any).contact.email;
        recipientName = `${(task as any).contact.firstName || ""} ${(task as any).contact.lastName || ""}`.trim() || "Client";
      } else if (req.body.email) {
        recipientEmail = req.body.email;
      }

      if (!recipientEmail) {
        return res.status(400).json({ message: "No client email found for this task. Provide an email address." });
      }

      const org = await storage.getOrg(orgId);
      const orgName = org?.name || "Your Property Management Company";
      const reportUrl = `${req.protocol}://${req.get("host")}/inspection-report/${taskId}`;
      const propertyAddress = (task as any).property?.address1 || "the property";
      const inspector = (task as any).assignedUser
        ? `${(task as any).assignedUser.firstName || ""} ${(task as any).assignedUser.lastName || ""}`.trim()
        : "Your inspector";

      const escHtml = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      const failItems = checklistItems.filter((i: any) => i.result === "fail");
      const failItemsHtml = failItems.length > 0 ? `
        <div style="margin:20px 0;">
          <h3 style="color:#dc2626;margin:0 0 12px;">Failed Items (${failItems.length})</h3>
          ${failItems.map((item: any) => {
            const photos: string[] = [
              ...(Array.isArray(item.photoUrls) ? item.photoUrls : []),
              ...(item.photoUrl && !(item.photoUrls || []).includes(item.photoUrl) ? [item.photoUrl] : []),
            ];
            const safePhotos = photos.filter((u: string) => /^https?:\/\//.test(u));
            const photoHtml = safePhotos.length > 0
              ? `<div style="margin-top:8px;">${safePhotos.map((url: string) => `<a href="${escHtml(url)}" target="_blank"><img src="${escHtml(url)}" alt="Photo evidence" style="height:80px;width:106px;object-fit:cover;border-radius:4px;border:1px solid #fca5a5;margin-right:6px;"/></a>`).join("")}</div>`
              : "";
            return `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:10px;margin-bottom:8px;">
              <p style="margin:0;font-weight:600;color:#1f2937;">${escHtml(item.text)}</p>
              ${item.resultNote ? `<p style="margin:4px 0 0;color:#4b5563;font-size:13px;">${escHtml(item.resultNote)}</p>` : ""}
              ${photoHtml}
            </div>`;
          }).join("")}
        </div>
      ` : "";

      const attachPdf = req.body.attachPdf === true;
      let emailAttachments: Array<{ content: string; filename: string; type: string; disposition: string }> | undefined;
      if (attachPdf) {
        const orgRecord = await storage.getOrg(orgId);
        const branding = (orgRecord?.branding ?? null) as { logo?: string | null } | null;
        const pdfBuffer = await buildInspectionReportPdf(task, checklistItems, {
          orgBrandingLogo: branding?.logo ?? null,
        });
        emailAttachments = [{
          content: pdfBuffer.toString("base64"),
          filename: `inspection-report-${taskId}.pdf`,
          type: "application/pdf",
          disposition: "attachment",
        }];
      }

      const pdfNote = attachPdf
        ? `<p><a href="${reportUrl}" style="display:inline-block;background:#1e40af;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">View Full Report Online</a></p>
           <p style="color:#64748b;font-size:12px;margin-top:4px;">📎 A PDF copy of this report is also attached to this email.</p>`
        : `<p><a href="${reportUrl}" style="display:inline-block;background:#1e40af;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">View Full Report Online</a></p>`;

      await sendGenericEmail({
        to: recipientEmail,
        subject: `Inspection Report — ${propertyAddress}`,
        htmlContent: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#1e40af;">Inspection Report</h2>
            <p>Dear ${recipientName},</p>
            <p>Please find your inspection report for <strong>${propertyAddress}</strong> below.</p>
            <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:20px 0;border:1px solid #e2e8f0;">
              <h3 style="margin:0 0 12px;color:#374151;">Summary</h3>
              <div style="display:flex;gap:24px;">
                <div style="text-align:center;">
                  <div style="font-size:24px;font-weight:700;color:#16a34a;">${passCount}</div>
                  <div style="font-size:12px;color:#6b7280;">Passed</div>
                </div>
                <div style="text-align:center;">
                  <div style="font-size:24px;font-weight:700;color:#dc2626;">${failCount}</div>
                  <div style="font-size:12px;color:#6b7280;">Failed</div>
                </div>
                <div style="text-align:center;">
                  <div style="font-size:24px;font-weight:700;color:#6b7280;">${total}</div>
                  <div style="font-size:12px;color:#6b7280;">Total Items</div>
                </div>
              </div>
            </div>
            ${failItemsHtml}
            ${pdfNote}
            <p style="color:#6b7280;font-size:13px;">Inspected by: ${inspector}</p>
            <p style="color:#6b7280;font-size:13px;margin-top:30px;">Best regards,<br/>${orgName}</p>
          </div>
        `,
        attachments: emailAttachments,
      });

      res.json({ success: true, sentTo: recipientEmail, pdfAttached: attachPdf });
    } catch (error) {
      console.error("Error emailing inspection report:", error);
      res.status(500).json({ message: "Failed to send inspection report email" });
    }
  });

  // GET /api/tasks/:id/inspection-report/pdf — generate and download PDF inspection report
  app.get("/api/tasks/:id/inspection-report/pdf", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId || req.user?.orgId;
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      if (!task || (task as any).orgId !== orgId) return res.status(404).json({ message: "Task not found" });
      const checklistItems = await storage.getTaskChecklistItems(taskId);
      const orgRecord = await storage.getOrg(orgId);
      const branding = (orgRecord?.branding ?? null) as { logo?: string | null } | null;
      const pdfBuffer = await buildInspectionReportPdf(task, checklistItems, {
        orgBrandingLogo: branding?.logo ?? null,
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="inspection-report-${taskId}.pdf"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.end(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF inspection report:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate PDF report" });
      }
    }
  });

  // POST /api/task-checklist-items/:id/photo — upload a photo for a checklist item (appends to photoUrls)
  app.post("/api/task-checklist-items/:id/photo", isAuthenticated, uploadToMemory.single("photo"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No photo file provided" });
      }
      const orgId = req.user?.claims?.orgId || req.user?.orgId;
      const itemId = req.params.id;

      // Verify ownership: load the item → task → property → orgId
      const item = await storage.getTaskChecklistItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Checklist item not found" });
      }
      const task = await storage.getTask(item.taskId);
      if (!task || !task.propertyId) {
        return res.status(404).json({ message: "Task or property not found" });
      }
      const property = await storage.getProperty(task.propertyId);
      if (!property || (property as any).orgId !== orgId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Compress and resize the image using sharp before storing
      const sharp = (await import("sharp")).default;
      const MAX_DIMENSION = 1920;
      const JPEG_QUALITY = 80;
      const THUMBNAIL_SIZE = 300;

      const compressedBuffer = await sharp(req.file.buffer)
        .rotate() // auto-orient based on EXIF
        .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();

      const thumbnailBuffer = await sharp(req.file.buffer)
        .rotate()
        .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "cover" })
        .jpeg({ quality: 75 })
        .toBuffer();

      // Upload to object storage
      const privateDir = process.env.PRIVATE_OBJECT_DIR || '';
      const privateDirParts = privateDir.split('/').filter((p: string) => p);
      const bucketName = privateDirParts[0] || 'repl-default-bucket';
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const filename = `${timestamp}-${randomStr}.jpg`;
      const thumbnailFilename = `${timestamp}-${randomStr}-thumb.jpg`;
      const objectPath = `public/checklist-photos/${itemId}/${filename}`;
      const thumbnailPath = `public/checklist-photos/${itemId}/${thumbnailFilename}`;

      const { objectStorageClient } = await import("./objectStorage");
      const bucket = objectStorageClient.bucket(bucketName);

      await Promise.all([
        bucket.file(objectPath).save(compressedBuffer, {
          contentType: "image/jpeg",
          metadata: { originalName: req.file.originalname, uploadedAt: new Date().toISOString() },
        }),
        bucket.file(thumbnailPath).save(thumbnailBuffer, {
          contentType: "image/jpeg",
          metadata: { originalName: req.file.originalname, uploadedAt: new Date().toISOString(), type: "thumbnail" },
        }),
      ]);

      const photoUrl = `https://storage.googleapis.com/${bucketName}/${objectPath}`;
      const thumbnailUrl = `https://storage.googleapis.com/${bucketName}/${thumbnailPath}`;

      // Append to photoUrls and thumbnailUrls arrays, keeping index alignment for legacy photos
      const existingUrls: string[] = Array.isArray((item as any).photoUrls) ? (item as any).photoUrls : [];
      const existingThumbnails: string[] = Array.isArray((item as any).thumbnailUrls) ? (item as any).thumbnailUrls : [];
      // Pad thumbnailUrls with empty strings to match the length of existing photoUrls
      // This preserves index alignment for legacy photos that don't have thumbnails yet
      const paddedThumbnails = existingUrls.map((_: string, i: number) => existingThumbnails[i] || "");
      const newPhotoUrls = [...existingUrls, photoUrl];
      const newThumbnailUrls = [...paddedThumbnails, thumbnailUrl];
      const updated = await storage.updateTaskChecklistItem(itemId, { photoUrls: newPhotoUrls, thumbnailUrls: newThumbnailUrls } as any);
      res.json({ photoUrl, thumbnailUrl, item: updated });
    } catch (error) {
      console.error("Error uploading checklist item photo:", error);
      res.status(500).json({ message: "Failed to upload photo" });
    }
  });

  // DELETE /api/task-checklist-items/:id/photo — remove a specific photo from a checklist item
  app.delete("/api/task-checklist-items/:id/photo", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId || req.user?.orgId;
      const itemId = req.params.id;
      const { photoUrl } = req.body;
      if (!photoUrl) return res.status(400).json({ message: "photoUrl is required" });

      const item = await storage.getTaskChecklistItem(itemId);
      if (!item) return res.status(404).json({ message: "Checklist item not found" });
      const task = await storage.getTask(item.taskId);
      if (!task || !task.propertyId) return res.status(404).json({ message: "Task not found" });
      const property = await storage.getProperty(task.propertyId);
      if (!property || (property as any).orgId !== orgId) return res.status(403).json({ message: "Access denied" });

      const existingUrls: string[] = Array.isArray((item as any).photoUrls) ? (item as any).photoUrls : [];
      const existingThumbnails: string[] = Array.isArray((item as any).thumbnailUrls) ? (item as any).thumbnailUrls : [];

      // Find the corresponding thumbnail by index to maintain parallel array alignment
      const photoIndex = existingUrls.indexOf(photoUrl);
      const thumbnailUrl = (photoIndex !== -1 && existingThumbnails[photoIndex]) ? existingThumbnails[photoIndex] : null;

      // Remove by index to keep arrays aligned (splice copies so originals are not mutated)
      const newPhotoUrls = existingUrls.filter((_: string, i: number) => i !== photoIndex);
      const newThumbnailUrls = photoIndex !== -1
        ? existingThumbnails.filter((_: string, i: number) => i !== photoIndex)
        : existingThumbnails;
      const updated = await storage.updateTaskChecklistItem(itemId, { photoUrls: newPhotoUrls, thumbnailUrls: newThumbnailUrls } as any);

      // Best-effort: delete the photo and thumbnail from GCS storage to prevent orphaned files
      const gcsPrefix = "https://storage.googleapis.com/";
      const urlsToDelete = [photoUrl, thumbnailUrl].filter(Boolean) as string[];
      try {
        const { objectStorageClient } = await import("./objectStorage");
        await Promise.all(urlsToDelete.map(async (url) => {
          if (url.startsWith(gcsPrefix)) {
            const withoutPrefix = url.slice(gcsPrefix.length);
            const slashIdx = withoutPrefix.indexOf("/");
            if (slashIdx !== -1) {
              const bucketName = withoutPrefix.slice(0, slashIdx);
              const objectName = withoutPrefix.slice(slashIdx + 1);
              await objectStorageClient.bucket(bucketName).file(objectName).delete({ ignoreNotFound: true });
            }
          }
        }));
      } catch (deleteErr) {
        console.warn("Failed to delete photo from object storage (non-fatal):", deleteErr);
      }

      res.json({ item: updated });
    } catch (error) {
      console.error("Error removing checklist item photo:", error);
      res.status(500).json({ message: "Failed to remove photo" });
    }
  });

  // GET /api/properties/:id/inspection-history — past inspection tasks for a property
  app.get("/api/properties/:id/inspection-history", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId || req.user?.orgId;
      const propertyId = parseInt(req.params.id);

      // Verify the property belongs to this org (access control)
      const property = await storage.getProperty(propertyId);
      if (!property || (property as any).orgId !== orgId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Query completed inspection tasks for this property, sorted by completion date
      const inspections = await db.select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        dueDate: tasks.dueDate,
        completedAt: tasks.completedAt,
        category: tasks.category,
        createdAt: tasks.createdAt,
        assignedToId: tasks.assignedToId,
        assignedToName: users.firstName,
        assignedToLastName: users.lastName,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedToId, users.id))
      .where(and(
        eq(tasks.propertyId, propertyId),
        eq(tasks.category, "inspection"),
        eq(tasks.status, "completed")
      ))
      .orderBy(desc(tasks.completedAt));

      // Enrich each inspection with pass/fail summary
      const enriched = await Promise.all(inspections.map(async (insp: any) => {
        try {
          const items = await storage.getTaskChecklistItems(insp.id);
          const passCount = items.filter((i: any) => i.result === "pass").length;
          const failCount = items.filter((i: any) => i.result === "fail").length;
          const naCount = items.filter((i: any) => i.result === "na").length;
          const assignedToName = insp.assignedToName
            ? `${insp.assignedToName} ${insp.assignedToLastName || ""}`.trim()
            : null;
          return {
            ...insp,
            assignedToName,
            checklistSummary: { passCount, failCount, naCount, total: items.length },
          };
        } catch {
          return { ...insp, checklistSummary: null };
        }
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching inspection history:", error);
      res.status(500).json({ message: "Failed to fetch inspection history" });
    }
  });

  // ============================================================
  // In-App Notification Routes
  // ============================================================

  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const orgId = req.user?.claims?.orgId || req.user?.orgId;
      if (!userId || !orgId) return res.status(400).json({ message: "User or org not found" });
      const limit = parseInt(String(req.query.limit || "50"));
      const notifs = await storage.getNotifications(userId, orgId, limit);
      res.json(notifs);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const orgId = req.user?.claims?.orgId || req.user?.orgId;
      if (!userId || !orgId) return res.json({ count: 0 });
      const count = await storage.getUnreadNotificationCount(userId, orgId);
      res.json({ count });
    } catch (error) {
      res.json({ count: 0 });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      await storage.markNotificationRead(parseInt(req.params.id), userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ message: "Failed to mark notification read" });
    }
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const orgId = req.user?.claims?.orgId || req.user?.orgId;
      if (!userId || !orgId) return res.status(400).json({ message: "User or org not found" });
      await storage.markAllNotificationsRead(userId, orgId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications read:", error);
      res.status(500).json({ message: "Failed to mark all notifications read" });
    }
  });

  // Portal user notification preferences (invoice reminders opt-in)
  app.get("/api/portal/notification-preferences", isPortalAuthenticated as any, async (req: any, res) => {
    try {
      const portalUser = await storage.getPortalUserById(req.portalSession.portalUserId);
      if (!portalUser) return res.status(404).json({ message: "Portal user not found" });
      res.json({
        emailInvoiceReminders: portalUser.emailInvoiceReminders ?? true,
        emailInspectionReminders: portalUser.emailInspectionReminders ?? true,
      });
    } catch (error) {
      console.error("Error fetching portal notification preferences:", error);
      res.status(500).json({ message: "Failed to fetch notification preferences" });
    }
  });

  app.patch("/api/portal/notification-preferences", isPortalAuthenticated as any, async (req: any, res) => {
    try {
      const { emailInvoiceReminders, emailInspectionReminders } = req.body;
      const updateData: Record<string, boolean> = {};
      if (emailInvoiceReminders !== undefined) updateData.emailInvoiceReminders = Boolean(emailInvoiceReminders);
      if (emailInspectionReminders !== undefined) updateData.emailInspectionReminders = Boolean(emailInspectionReminders);
      const updated = await storage.updatePortalUser(req.portalSession.portalUserId, updateData);
      res.json({
        emailInvoiceReminders: updated.emailInvoiceReminders,
        emailInspectionReminders: updated.emailInspectionReminders,
      });
    } catch (error) {
      console.error("Error updating portal notification preferences:", error);
      res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });

  // Org notification defaults (admin only)
  app.get("/api/orgs/:orgId/notification-defaults", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgId = req.params.orgId;
      const userOrgId = req.user?.claims?.orgId || req.user?.orgId;
      if (orgId !== userOrgId) return res.status(403).json({ message: "Access denied" });
      const org = await storage.getOrg(orgId);
      if (!org) return res.status(404).json({ message: "Organization not found" });
      res.json(org.notificationDefaults || {});
    } catch (error) {
      console.error("Error fetching notification defaults:", error);
      res.status(500).json({ message: "Failed to fetch notification defaults" });
    }
  });

  app.patch("/api/orgs/:orgId/notification-defaults", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgId = req.params.orgId;
      const userOrgId = req.user?.claims?.orgId || req.user?.orgId;
      if (orgId !== userOrgId) return res.status(403).json({ message: "Access denied" });
      const org = await storage.getOrg(orgId);
      if (!org) return res.status(404).json({ message: "Organization not found" });
      // Read-modify-write: merge incoming fields into existing defaults
      type OrgNotificationDefaults = {
        taskOverdueHours?: number;
        inspectionDueDays?: number;
        invoiceDueDays?: number;
        calendarEventMinutes?: number;
        forceEnableAll?: boolean;
      };
      const existing: OrgNotificationDefaults = (org.notificationDefaults as OrgNotificationDefaults | null) ?? {};
      const { taskOverdueHours, inspectionDueDays, invoiceDueDays, calendarEventMinutes, forceEnableAll } = req.body;
      const merged: OrgNotificationDefaults = {
        ...existing,
        ...(taskOverdueHours !== undefined && { taskOverdueHours: Number(taskOverdueHours) }),
        ...(inspectionDueDays !== undefined && { inspectionDueDays: Number(inspectionDueDays) }),
        ...(invoiceDueDays !== undefined && { invoiceDueDays: Number(invoiceDueDays) }),
        ...(calendarEventMinutes !== undefined && { calendarEventMinutes: Number(calendarEventMinutes) }),
        ...(forceEnableAll !== undefined && { forceEnableAll: Boolean(forceEnableAll) }),
      };
      const updated = await storage.updateOrg(orgId, { notificationDefaults: merged });
      res.json(updated.notificationDefaults || {});
    } catch (error) {
      console.error("Error updating notification defaults:", error);
      res.status(500).json({ message: "Failed to update notification defaults" });
    }
  });

  // Inspection Schedule routes
  app.get("/api/properties/:id/inspection-schedules", isAuthenticated, async (req: any, res) => {
    try {
      const propertyId = parseInt(req.params.id);
      const userOrgId = req.user?.claims?.orgId || req.user?.orgId;
      const property = await storage.getProperty(propertyId);
      if (!property) return res.status(404).json({ message: "Property not found" });
      if (property.orgId !== userOrgId) return res.status(403).json({ message: "Access denied" });
      const schedules = await storage.getInspectionSchedulesByProperty(propertyId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching inspection schedules:", error);
      res.status(500).json({ message: "Failed to fetch inspection schedules" });
    }
  });

  app.post("/api/properties/:id/inspection-schedules", isAuthenticated, async (req: any, res) => {
    try {
      const propertyId = parseInt(req.params.id);
      const userId = req.user?.claims?.sub || req.user?.id;
      const orgId = req.user?.claims?.orgId || req.user?.orgId;
      const property = await storage.getProperty(propertyId);
      if (!property) return res.status(404).json({ message: "Property not found" });
      if (property.orgId !== orgId) return res.status(403).json({ message: "Access denied" });

      // Validate inspectorUserId belongs to the same org (prevent cross-tenant assignment)
      if (req.body.inspectorUserId) {
        const inspector = await storage.getUser(req.body.inspectorUserId);
        if (!inspector || inspector.orgId !== orgId) {
          return res.status(403).json({ message: "Inspector must belong to your organization" });
        }
      }

      // Validate templateId belongs to this org or is a global template (orgId = null)
      if (req.body.templateId) {
        const tmpl = await storage.getChecklistTemplate(req.body.templateId);
        if (!tmpl || (tmpl.orgId !== null && tmpl.orgId !== orgId)) {
          return res.status(403).json({ message: "Template not accessible to your organization" });
        }
      }

      const body = insertInspectionScheduleSchema.extend({
        frequency: z.enum(["weekly", "monthly", "quarterly", "annually"]),
      }).parse({
        ...req.body,
        propertyId,
        orgId,
        createdBy: userId,
      });
      const schedule = await storage.createInspectionSchedule(body);
      res.status(201).json(schedule);
    } catch (error: any) {
      console.error("Error creating inspection schedule:", error);
      if (error.name === "ZodError") return res.status(400).json({ message: "Validation error", errors: error.errors });
      res.status(500).json({ message: "Failed to create inspection schedule" });
    }
  });

  app.patch("/api/inspection-schedules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userOrgId = req.user?.claims?.orgId || req.user?.orgId;
      const existing = await storage.getInspectionSchedule(id);
      if (!existing) return res.status(404).json({ message: "Schedule not found" });
      if (existing.orgId !== userOrgId) return res.status(403).json({ message: "Access denied" });

      // Only allow safe, mutable fields — never let the caller change orgId, propertyId, or createdBy
      const allowedUpdateSchema = z.object({
        frequency: z.enum(["weekly", "monthly", "quarterly", "annually"]).optional(),
        startDate: z.string().optional(),
        inspectorUserId: z.string().nullable().optional(),
        templateId: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      }).strict();
      const parsed = allowedUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation error", errors: parsed.error.errors });
      }

      // If inspectorUserId is being set, verify the inspector is in the same org
      if (parsed.data.inspectorUserId) {
        const inspector = await storage.getUser(parsed.data.inspectorUserId);
        if (!inspector || inspector.orgId !== userOrgId) {
          return res.status(403).json({ message: "Inspector must belong to your organization" });
        }
      }

      // Validate templateId belongs to this org or is a global template (orgId = null)
      if (parsed.data.templateId) {
        const tmpl = await storage.getChecklistTemplate(parsed.data.templateId);
        if (!tmpl || (tmpl.orgId !== null && tmpl.orgId !== userOrgId)) {
          return res.status(403).json({ message: "Template not accessible to your organization" });
        }
      }

      const schedule = await storage.updateInspectionSchedule(id, parsed.data);
      res.json(schedule);
    } catch (error) {
      console.error("Error updating inspection schedule:", error);
      res.status(500).json({ message: "Failed to update inspection schedule" });
    }
  });

  app.delete("/api/inspection-schedules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userOrgId = req.user?.claims?.orgId || req.user?.orgId;
      const existing = await storage.getInspectionSchedule(id);
      if (!existing) return res.status(404).json({ message: "Schedule not found" });
      if (existing.orgId !== userOrgId) return res.status(403).json({ message: "Access denied" });
      await storage.deleteInspectionSchedule(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting inspection schedule:", error);
      res.status(500).json({ message: "Failed to delete inspection schedule" });
    }
  });

  app.get("/api/inspection-schedules", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId || req.user?.orgId;
      if (!orgId) return res.status(400).json({ message: "Organization not found" });
      const schedules = await storage.getInspectionSchedulesByOrg(orgId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching org inspection schedules:", error);
      res.status(500).json({ message: "Failed to fetch inspection schedules" });
    }
  });

  // Notification logs routes (admin-only: contains org-wide recipient emails + error details)
  app.get("/api/notification-logs", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId;
      if (!orgId) return res.status(400).json({ message: "Organization ID not found" });
      const type = req.query.type as string | undefined;
      const rawLimit = req.query.limit ? parseInt(req.query.limit as string, 10) : 200;
      const limit = Number.isNaN(rawLimit) ? 200 : Math.min(Math.max(rawLimit, 1), 500);
      const logs = await storage.getNotificationLogs(orgId, type, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching notification logs:", error);
      res.status(500).json({ message: "Failed to fetch notification logs" });
    }
  });

  // Register the conflict detector for scheduled tasks
  const { setConflictDetector } = await import('./scheduledTasks');
  setConflictDetector(detectAndCreateEventConflicts);
  
  const httpServer = createServer(app);
  return httpServer;
}
