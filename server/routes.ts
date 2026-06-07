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
import { getHubifyHomesEmailLogoUrl, HUBIFY_HOMES_LOGO_PATH, HUBIFY_HOMES_EMAIL_LOGO_PATH, HUBIFY_HOMES_EMAIL_LOGO_V2_PATH, HUBIFY_HOMES_EMAIL_LOGO_V3_PATH, HUBIFY_HOMES_EMAIL_LOGO_V4_PATH, getAppBaseUrl } from "./brandAsset";
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
  inspectionSchedules,
  clientInvoices,
  events,
  notifications,
  isPremiumPropertyType,
  tierAllowsPremiumProperties,
  WEBHOOK_EVENT_TYPES,
  type InsertOnboardingProspect,
  type OnboardingStage,
  onboardingProspects,
  type InsertDiscountCode,
} from "@shared/schema";
import { z } from "zod";
import { createSetupIntentForClient, detachPaymentMethod, createPortalPayIntentForInvoice, chargeInvoice } from "./stripe";
import { db } from "./db";
import { eq, lt, and, or, desc, inArray, count, ne, isNull } from "drizzle-orm";
import { Resend } from "resend";
import { dispatchWebhookEvent, sendTestWebhookEvent, validateWebhookUrlSafe } from "./webhookDispatcher";
import { seedDemoTenant, resetDemoTenant, DEMO_ORG_ID, DEMO_DOMAIN, DEMO_ADMIN_EMAIL } from "./demoSeed";
import { buildTrialWelcomeEmail } from "./scheduledTasks";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/** Substitute {{name}}, {{company}}, {{email}}, {{phone}}, {{stage}} merge tags. */
function applyProspectMergeTags(text: string, p: { name: string; email: string; company: string; phone: string; stage: string }): string {
  return text
    .replace(/\{\{name\}\}/gi, p.name)
    .replace(/\{\{company\}\}/gi, p.company)
    .replace(/\{\{email\}\}/gi, p.email)
    .replace(/\{\{phone\}\}/gi, p.phone)
    .replace(/\{\{stage\}\}/gi, p.stage);
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
  if (!resend) {
    console.warn("RESEND_API_KEY not configured. Skipping email notification.");
    return;
  }

  try {
    const msg = {
      to: supervisorEmail,
      from: process.env.RESEND_FROM_EMAIL || "noreply@hubify.com",
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

    const { error } = await resend.emails.send(msg);
    if (error) throw new Error(error.message);
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
  if (!resend) {
    console.warn("RESEND_API_KEY not configured. Skipping email notification.");
    return;
  }

  try {
    const msg = {
      to: mentionedUserEmail,
      from: process.env.RESEND_FROM_EMAIL || "noreply@hubify.com",
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

    const { error: mentionError } = await resend.emails.send(msg);
    if (mentionError) throw new Error(mentionError.message);
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
  if (!resend) {
    console.warn("RESEND_API_KEY not configured. Skipping email notification.");
    return;
  }

  try {
    const msg = {
      to: recipientEmail,
      from: process.env.RESEND_FROM_EMAIL || "noreply@hubify.com",
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

    const { error: broadcastError } = await resend.emails.send(msg);
    if (broadcastError) throw new Error(broadcastError.message);
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

  // ── Tenant resolution (public, no auth) ──────────────────────────────────
  // Returns the resolved tenant for the current hostname so the frontend
  // can gate on org status before rendering any routes.
  app.get("/api/tenant", (req, res) => {
    res.json(req.tenant ?? {
      isPublicDomain: true,
      subdomain: null,
      found: false,
      orgId: null,
      name: null,
      orgStatus: null,
      logoUrl: null,
    });
  });
  
  // Serve Hubify Homes logo — publicly reachable fallback for email clients that don't render data URIs
  app.get('/hubify-homes-logo.png', (_req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.sendFile(HUBIFY_HOMES_LOGO_PATH);
  });

  // Email-optimised logo (legacy v1 — kept for backward compat).
  app.get('/hubify-homes-logo-email.png', (_req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.sendFile(HUBIFY_HOMES_EMAIL_LOGO_PATH);
  });

  // Email-optimised logo v2 — legacy, kept for backward compat.
  app.get('/hubify-homes-logo-email-v2.png', (_req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.sendFile(HUBIFY_HOMES_EMAIL_LOGO_V2_PATH);
  });

  // Email-optimised logo v3 — legacy, kept for backward compat.
  app.get('/hubify-homes-logo-email-v3.png', (_req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.sendFile(HUBIFY_HOMES_EMAIL_LOGO_V3_PATH);
  });

  // Email-optimised logo v4 — approved teal "Hubify Homes", transparent, 480×672 px.
  app.get('/hubify-homes-logo-email-v4.png', (_req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.sendFile(HUBIFY_HOMES_EMAIL_LOGO_V4_PATH);
  });

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
      
      // Set staff session for dev login — clear SA session to avoid collision.
      (req.session as any).superAdmin = null;
      (req.session as any).staffUser = {
        id: user.id,
        email: user.email,
        orgId: testOrg.id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      };
      res.json({ message: "Logged in as test user", user });
    } catch (error) {
      console.error("Error creating test user:", error);
      res.status(500).json({ message: "Failed to create test user" });
    }
  });

  // Super Admin login route
  // Accepts either:
  //   { email, password }    — checked against the platform_admins DB table
  //                            (seeded from ADMIN_EMAIL / ADMIN_PASSWORD env vars)
  //   { username, password } — checked against SUPER_ADMIN_USERNAME / SUPER_ADMIN_PASSWORD env vars
  //                            (legacy; dev fallback superadmin/hubify2025 in development only)
  app.post('/api/super-admin/login', async (req, res) => {
    try {
      const { username, password, email } = req.body;

      // ── Path 1: email + password (master admin via platform_admins table) ──
      if (email) {
        if (!password) {
          return res.status(400).json({ message: "Password is required" });
        }

        const { getPlatformAdmin, verifyPlatformAdminPassword } = await import('./masterAdmin.js');
        const lookupEmail = email.trim().toLowerCase();
        const admin = await getPlatformAdmin(lookupEmail);

        let credentialsValid = admin
          ? await verifyPlatformAdminPassword(admin, password)
          : false;

        // Fallback: also accept if ADMIN_EMAIL + ADMIN_PASSWORD env vars match directly.
        // This covers edge cases where the stored hash is stale or bcrypt comparison fails.
        if (!credentialsValid) {
          const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
          const envPassword = process.env.ADMIN_PASSWORD?.trim();
          if (envEmail && envPassword && lookupEmail === envEmail && password === envPassword) {
            credentialsValid = true;
          }
        }

        if (!credentialsValid) {
          await AuditLogger.log({
            req,
            action: 'super_admin_login_failed',
            actionType: 'auth',
            resource: 'super_admin_authentication',
            metadata: { email },
            severity: 'warning',
            success: false,
            errorMessage: 'Invalid credentials',
          });
          return res.status(401).json({ message: "Invalid credentials" });
        }

        // Ensure SA and staff sessions never coexist — clear staff session on SA login.
        (req.session as any).staffUser = null;
        (req.session as any).superAdmin = {
          authenticated: true,
          username: email,
          loginTime: new Date().toISOString(),
        };

        // Explicitly persist the session before responding so the browser
        // always receives a Set-Cookie header even if the async save fires
        // after the response would otherwise have been flushed.
        await new Promise<void>((resolve, reject) =>
          req.session.save((err) => (err ? reject(err) : resolve()))
        );

        await AuditLogger.log({
          req,
          action: 'super_admin_login_success',
          actionType: 'auth',
          resource: 'super_admin_authentication',
          metadata: { email },
          severity: 'info',
          success: true,
        });

        return res.json({ message: "Super admin authenticated successfully", username: email });
      }

      // ── Path 2: username + password (env-var credentials) ──
      const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME;
      const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

      const isDevelopment = process.env.NODE_ENV === 'development';
      const finalUsername = SUPER_ADMIN_USERNAME || (isDevelopment ? 'superadmin' : null);
      const finalPassword = SUPER_ADMIN_PASSWORD || (isDevelopment ? 'hubify2025' : null);

      if (!finalUsername || !finalPassword) {
        console.error("Super Admin credentials not configured. Set SUPER_ADMIN_USERNAME / SUPER_ADMIN_PASSWORD or ADMIN_EMAIL / ADMIN_PASSWORD.");
        return res.status(503).json({ message: "Super Admin authentication is not configured" });
      }

      if (!username || !password) {
        return res.status(400).json({ message: "Username/email and password are required" });
      }

      if (username !== finalUsername || password !== finalPassword) {
        await AuditLogger.log({
          req,
          action: 'super_admin_login_failed',
          actionType: 'auth',
          resource: 'super_admin_authentication',
          metadata: { username },
          severity: 'warning',
          success: false,
          errorMessage: 'Invalid credentials',
        });
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Ensure SA and staff sessions never coexist — clear staff session on SA login.
      (req.session as any).staffUser = null;
      (req.session as any).superAdmin = {
        authenticated: true,
        username,
        loginTime: new Date().toISOString(),
      };

      await AuditLogger.log({
        req,
        action: 'super_admin_login_success',
        actionType: 'auth',
        resource: 'super_admin_authentication',
        metadata: { username },
        severity: 'info',
        success: true,
      });

      return res.json({ message: "Super admin authenticated successfully", username });
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
    await new Promise<void>((resolve) => req.session.save(() => resolve()));
    res.json({ message: "Logged out successfully" });
  });

  // ── Platform Admin Management ──────────────────────────────────────────────

  // GET /api/super-admin/admins — list all platform admins
  app.get('/api/super-admin/admins', isSuperAdmin, requireMFA, async (_req, res) => {
    try {
      const { listPlatformAdmins } = await import('./masterAdmin.js');
      const admins = await listPlatformAdmins();
      res.json(admins);
    } catch (err: any) {
      res.status(500).json({ message: err.message || 'Failed to list admins' });
    }
  });

  // POST /api/super-admin/admins — create a new platform admin
  app.post('/api/super-admin/admins', isSuperAdmin, requireMFA, async (req: any, res) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8, 'Password must be at least 8 characters'),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });

      const { createPlatformAdminAccount } = await import('./masterAdmin.js');
      const admin = await createPlatformAdminAccount(parsed.data.email, parsed.data.password);
      await AuditLogger.log({ req, action: 'platform_admin_created', metadata: { email: parsed.data.email } });
      res.status(201).json(admin);
    } catch (err: any) {
      res.status(400).json({ message: err.message || 'Failed to create admin' });
    }
  });

  // PATCH /api/super-admin/admins/:id/password — change password
  app.patch('/api/super-admin/admins/:id/password', isSuperAdmin, requireMFA, async (req: any, res) => {
    try {
      const schema = z.object({ password: z.string().min(8, 'Password must be at least 8 characters') });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });

      const { changePlatformAdminPassword } = await import('./masterAdmin.js');
      await changePlatformAdminPassword(req.params.id, parsed.data.password);
      await AuditLogger.log({ req, action: 'platform_admin_password_changed', metadata: { id: req.params.id } });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message || 'Failed to change password' });
    }
  });

  // DELETE /api/super-admin/admins/:id — remove a platform admin
  app.delete('/api/super-admin/admins/:id', isSuperAdmin, requireMFA, async (req: any, res) => {
    try {
      // Prevent self-deletion by matching the session email
      const sessionEmail = (req.session as any)?.superAdmin?.username;
      const { listPlatformAdmins, deletePlatformAdminById } = await import('./masterAdmin.js');
      const all = await listPlatformAdmins();
      const target = all.find(a => a.id === req.params.id);
      if (!target) return res.status(404).json({ message: 'Admin not found' });
      if (target.email === sessionEmail) return res.status(400).json({ message: 'You cannot delete your own account' });
      if (all.length <= 1) return res.status(400).json({ message: 'Cannot delete the last admin account' });

      await deletePlatformAdminById(req.params.id);
      await AuditLogger.log({ req, action: 'platform_admin_deleted', metadata: { email: target.email } });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message || 'Failed to delete admin' });
    }
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

      // Check for regular staff session
      const staffUser = (req.session as any)?.staffUser;
      if (!staffUser?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = staffUser.id;
      const user = await storage.getUser(userId);

      // Include orgId and role — DB is source of truth, fall back to session
      const orgId = user?.orgId || staffUser.orgId;
      const role = user?.role || staffUser.role;

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
      const staffUserGet = (req.session as any)?.staffUser;
      if (!staffUserGet?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = staffUserGet.id;
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
      const staffUserPost = (req.session as any)?.staffUser;
      if (!staffUserPost?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = staffUserPost.id;
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
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
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

  // ── Invite a new team member ──────────────────────────────────────────────
  // Creates the user record and sends them an invitation email so they know
  // to log in and what to expect when they get there.
  app.post("/api/users", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
      if (!orgId) return res.status(400).json({ message: "Organization not found" });

      const { id, firstName, lastName, email, role = "staff", isActive = true } = req.body;
      if (!firstName || !lastName || !email) {
        return res.status(400).json({ message: "firstName, lastName, and email are required" });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const userId = id || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const user = await storage.upsertUser({
        id: userId,
        orgId,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        email: normalizedEmail,
        role,
        isActive,
      });

      // Fetch org name for the invitation email
      const org = await storage.getOrg(orgId);
      const orgName = org?.name ?? "your team";
      const inviterName = `${req.user?.claims?.first_name ?? ""} ${req.user?.claims?.last_name ?? ""}`.trim() || "Your admin";
      const roleLabel = role === "admin" ? "Admin" : role === "supervisor" ? "Supervisor" : "Staff";
      const loginUrl = `${req.protocol}://${req.hostname}/staff/login`;

      try {
        const { sendEmail } = await import("./email-service");
        await sendEmail({
          to: normalizedEmail,
          subject: `You've been added to ${orgName} on Hubify`,
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
              <div style="background:#2563eb;padding:32px 40px;border-radius:12px 12px 0 0;">
                <h1 style="color:white;margin:0;font-size:24px;font-weight:700;">You're on the team.</h1>
              </div>
              <div style="background:#ffffff;padding:32px 40px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;">
                <p style="font-size:16px;margin:0 0 20px;">Hi ${firstName},</p>
                <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px;">
                  ${inviterName} has added you to <strong>${orgName}</strong> on Hubify as a <strong>${roleLabel}</strong>.
                  Hubify is the property management platform your team uses to track tasks, manage properties, and stay coordinated.
                </p>

                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px 24px;margin:0 0 28px;">
                  <p style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin:0 0 12px;">What you can do in Hubify</p>
                  <ul style="margin:0;padding-left:20px;color:#475569;font-size:14px;line-height:2;">
                    <li>See and act on tasks assigned to you</li>
                    <li>View property details, access codes, and notes</li>
                    <li>Communicate with your team in real time</li>
                    <li>Log your work and track time on jobs</li>
                  </ul>
                </div>

                <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 28px;">
                  To get in, click the button below and sign in with the email address this was sent to:
                  <strong style="color:#1e293b;">${normalizedEmail}</strong>
                </p>

                <p style="margin:0 0 32px;text-align:center;">
                  <a href="${loginUrl}"
                     style="display:inline-block;background:#2563eb;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                    Log in to Hubify
                  </a>
                </p>

                <p style="font-size:13px;color:#94a3b8;margin:0;">
                  If you have questions, please email <a href="mailto:contact@hubifyhomes.com" style="color:#94a3b8">contact@hubifyhomes.com</a>
                </p>

                <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
                <p style="font-size:12px;color:#cbd5e1;margin:0;">
                  Hubify · <a href="https://hubify.com/privacy" style="color:#cbd5e1;">Privacy Policy</a>
                </p>
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        // Don't fail the request if the email can't send — user is still created
        console.warn("[INVITE] Failed to send invitation email to", normalizedEmail, emailErr);
      }

      res.status(201).json(user);
    } catch (error) {
      console.error("Error inviting team member:", error);
      res.status(500).json({ message: "Failed to invite team member" });
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
      const currentUserId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      
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
      const userOrgId = (req.user as any)?.claims?.orgId || (req.user as any)?.orgId;
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

  app.post("/api/teams", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userOrgId = (req.user as any)?.claims?.orgId || (req.user as any)?.orgId;
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
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

  app.patch("/api/teams/:id", isAuthenticated, isAdmin, async (req, res) => {
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

  app.delete("/api/teams/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const teamId = req.params.id;
      await storage.deleteTeam(teamId);
      res.json({ message: "Team deleted successfully" });
    } catch (error) {
      console.error("Error deleting team:", error);
      res.status(500).json({ message: "Failed to delete team" });
    }
  });

  app.post("/api/teams/:teamId/members", isAuthenticated, isAdmin, async (req, res) => {
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

  app.delete("/api/teams/:teamId/members/:userId", isAuthenticated, isAdmin, async (req, res) => {
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

  app.patch("/api/teams/:teamId/members/:userId/role", isAuthenticated, isAdmin, async (req, res) => {
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
  app.post("/api/teams/send-email", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { processMergeFields, buildMergeFieldData, sendEmail } = await import('./email-service');
      
      const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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

      // Fetch org name for the welcome screen
      const org = await storage.getOrg(invitation.orgId);
      const orgName = org?.name || 'Your Property Manager';

      res.status(201).json({ user: { ...user, passwordHash: undefined }, token, orgName });
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

  // Portal: active service assignments for a single property.
  app.get('/api/portal/properties/:id/services', isPortalAuthenticated, async (req: any, res) => {
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
      const { propertyServiceAssignments, organizationServices: orgSvcTable } = await import('@shared/schema');
      const { eq, and } = await import('drizzle-orm');
      const rows = await db
        .select({
          id: propertyServiceAssignments.id,
          status: propertyServiceAssignments.status,
          startDate: propertyServiceAssignments.startDate,
          endDate: propertyServiceAssignments.endDate,
          customPriceCents: propertyServiceAssignments.customPriceCents,
          billingFrequencyOverride: propertyServiceAssignments.billingFrequencyOverride,
          serviceName: orgSvcTable.name,
          serviceCategory: orgSvcTable.category,
          serviceDefaultPriceCents: orgSvcTable.defaultPriceCents,
          serviceBillingFrequency: orgSvcTable.billingFrequency,
        })
        .from(propertyServiceAssignments)
        .innerJoin(orgSvcTable, eq(propertyServiceAssignments.serviceId, orgSvcTable.id))
        .where(
          and(
            eq(propertyServiceAssignments.propertyId, propertyId),
            eq(propertyServiceAssignments.orgId, portalUser.orgId),
            eq(propertyServiceAssignments.status, 'active'),
            eq(propertyServiceAssignments.visibleToPortal, true),
          )
        );
      res.json(rows);
    } catch (error) {
      console.error('Error fetching portal property services:', error);
      res.status(500).json({ message: 'Failed to fetch services' });
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
        category: string | null;
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
          category: (t as any).category ?? null,
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

  // Portal client home: active service assignments across all the portal user's properties.
  app.get('/api/portal/services', isPortalAuthenticated, async (req: any, res) => {
    try {
      const portalUser = req.portalUser;
      const links = await storage.getPortalUserProperties(portalUser.id);
      const propertyIds = links.map((l) => l.propertyId);
      if (propertyIds.length === 0) return res.json([]);
      const props = await storage.getPropertiesByIds(propertyIds, portalUser.orgId);
      const propsById = new Map<number, string>(props.map((p) => [p.id, p.name]));
      const allowedIds = Array.from(propsById.keys());
      if (allowedIds.length === 0) return res.json([]);
      const { propertyServiceAssignments, organizationServices: orgSvcTable } = await import('@shared/schema');
      const { eq, and, inArray } = await import('drizzle-orm');
      const rows = await db
        .select({
          id: propertyServiceAssignments.id,
          propertyId: propertyServiceAssignments.propertyId,
          status: propertyServiceAssignments.status,
          startDate: propertyServiceAssignments.startDate,
          endDate: propertyServiceAssignments.endDate,
          customPriceCents: propertyServiceAssignments.customPriceCents,
          billingFrequencyOverride: propertyServiceAssignments.billingFrequencyOverride,
          serviceName: orgSvcTable.name,
          serviceCategory: orgSvcTable.category,
          serviceDefaultPriceCents: orgSvcTable.defaultPriceCents,
          serviceBillingFrequency: orgSvcTable.billingFrequency,
        })
        .from(propertyServiceAssignments)
        .innerJoin(orgSvcTable, eq(propertyServiceAssignments.serviceId, orgSvcTable.id))
        .where(
          and(
            inArray(propertyServiceAssignments.propertyId, allowedIds),
            eq(propertyServiceAssignments.orgId, portalUser.orgId),
            eq(propertyServiceAssignments.status, 'active'),
            eq(propertyServiceAssignments.visibleToPortal, true),
          )
        );
      const result = rows.map((r) => ({
        ...r,
        propertyName: r.propertyId ? (propsById.get(r.propertyId) ?? null) : null,
      }));
      result.sort((a, b) => {
        const pa = a.propertyName ?? '';
        const pb = b.propertyName ?? '';
        if (pa !== pb) return pa.localeCompare(pb);
        return (a.serviceName ?? '').localeCompare(b.serviceName ?? '');
      });
      res.json(result);
    } catch (error) {
      console.error('Error fetching portal services:', error);
      res.status(500).json({ message: 'Failed to fetch services' });
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
          paymentDate: inv.paymentDate,
          paymentMethod: inv.paymentMethod ?? null,
          paymentMethodBrand: inv.paymentMethodBrand ?? null,
          paymentMethodLast4: inv.paymentMethodLast4 ?? null,
          receiptUrl: inv.receiptUrl ?? null,
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

  // Portal "Pay Now": create or reuse a confirmable PaymentIntent for an
  // invoice the signed-in portal user is allowed to pay. Returns the client
  // secret + publishable key so the browser can mount Stripe Elements.
  app.post('/api/portal/invoices/:id/pay-intent', isPortalAuthenticated, async (req: any, res) => {
    try {
      const portalUser = req.portalUser;
      const { id } = req.params;

      // Use a direct DB query (consistent with other portal routes) so we can
      // filter by both id AND orgId in a single round-trip without ambiguity.
      const { clientInvoices: clientInvoicesTable, clients: clientsTable } = await import('@shared/schema');
      const [invoice] = await db
        .select()
        .from(clientInvoicesTable)
        .where(and(
          eq(clientInvoicesTable.id, id),
          eq(clientInvoicesTable.orgId, portalUser.orgId),
        ));
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      if (invoice.status === 'draft') {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      if (invoice.status === 'paid' || invoice.paymentStatus === 'succeeded') {
        return res.status(409).json({ message: 'Invoice already paid' });
      }
      if (invoice.status === 'void' || invoice.status === 'uncollectible') {
        return res.status(409).json({ message: 'Invoice is not payable' });
      }

      // Authorize: invoice's client must match the portal user's client by email+org.
      const [client] = await db
        .select()
        .from(clientsTable)
        .where(and(
          eq(clientsTable.orgId, portalUser.orgId),
          eq(clientsTable.email, portalUser.email),
        ));
      if (!client || client.id !== invoice.clientId) {
        return res.status(403).json({ message: 'Not authorized to pay this invoice' });
      }

      const result = await createPortalPayIntentForInvoice(
        invoice.id,
        invoice.orgId,
        client.id,
        client.email,
        invoice.amountCents,
        invoice.currency || 'usd',
        invoice.invoiceNumber ? `Invoice ${invoice.invoiceNumber}` : undefined,
      );
      res.json(result);
    } catch (error: any) {
      console.error('Error creating portal pay intent:', error);
      const msg = error?.message || 'Failed to create payment';
      if (/Stripe account not configured/i.test(msg)) {
        return res.status(503).json({ message: 'Online payment is not configured for this organization yet.' });
      }
      res.status(500).json({ message: 'Failed to create payment' });
    }
  });

  // Portal payment methods: list saved cards for the portal user's linked client
  app.get('/api/portal/payment-methods', isPortalAuthenticated, async (req: any, res) => {
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
      const methods = await storage.getClientPaymentMethods(client.id);
      res.json(methods.map((m) => ({
        id: m.id,
        paymentMethodType: m.paymentMethodType,
        last4: m.last4,
        brand: m.brand,
        expMonth: m.expMonth,
        expYear: m.expYear,
        bankName: m.bankName,
        isDefault: m.isDefault,
      })));
    } catch (error) {
      console.error('Error fetching portal payment methods:', error);
      res.status(500).json({ message: 'Failed to fetch payment methods' });
    }
  });

  // Portal: create a SetupIntent so the portal user can add a saved card
  app.post('/api/portal/payment-methods/setup-intent', isPortalAuthenticated, async (req: any, res) => {
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
      if (!client) {
        return res.status(404).json({ message: 'Client record not found for this portal user' });
      }
      const result = await createSetupIntentForClient(
        portalUser.orgId,
        client.id,
        client.email,
        ['card']
      );
      res.json(result);
    } catch (error: any) {
      console.error('Error creating portal setup intent:', error);
      const msg = error?.message || 'Failed to create setup intent';
      if (/Stripe account not configured/i.test(msg)) {
        return res.status(503).json({ message: 'Online payment is not configured for this organization yet.' });
      }
      res.status(500).json({ message: 'Failed to create setup intent' });
    }
  });

  // Portal: delete a saved payment method (verifying it belongs to the portal user)
  app.delete('/api/portal/payment-methods/:id', isPortalAuthenticated, async (req: any, res) => {
    try {
      const portalUser = req.portalUser;
      const { id } = req.params;
      const paymentMethod = await storage.getClientPaymentMethod(id);
      if (!paymentMethod) {
        return res.status(404).json({ message: 'Payment method not found' });
      }
      // Verify the payment method belongs to a client whose email matches the portal user
      const { clients: clientsTable } = await import('@shared/schema');
      const [client] = await db
        .select()
        .from(clientsTable)
        .where(and(
          eq(clientsTable.orgId, portalUser.orgId),
          eq(clientsTable.email, portalUser.email)
        ));
      if (!client || client.id !== paymentMethod.clientId) {
        return res.status(403).json({ message: 'Not authorized to delete this payment method' });
      }
      await detachPaymentMethod(portalUser.orgId, paymentMethod.stripePaymentMethodId);
      await storage.deleteClientPaymentMethod(id);
      res.json({ message: 'Payment method removed' });
    } catch (error: any) {
      console.error('Error deleting portal payment method:', error);
      res.status(500).json({ message: 'Failed to remove payment method' });
    }
  });

  // Portal: pay an invoice with a saved payment method (off-session charge)
  app.post('/api/portal/invoices/:id/pay-saved', isPortalAuthenticated, async (req: any, res) => {
    try {
      const portalUser = req.portalUser;
      const { id } = req.params;
      const { paymentMethodId } = req.body;
      if (!paymentMethodId) {
        return res.status(400).json({ message: 'paymentMethodId is required' });
      }
      // Use a direct DB query (consistent with other portal routes) so we can
      // filter by both id AND orgId in a single round-trip without ambiguity.
      const { clientInvoices: clientInvoicesTable, clients: clientsTable } = await import('@shared/schema');
      const [invoice] = await db
        .select()
        .from(clientInvoicesTable)
        .where(and(
          eq(clientInvoicesTable.id, id),
          eq(clientInvoicesTable.orgId, portalUser.orgId),
        ));
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      if (invoice.status === 'draft') {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      if (invoice.status === 'paid' || invoice.paymentStatus === 'succeeded') {
        return res.status(409).json({ message: 'Invoice already paid' });
      }
      if (invoice.status === 'void' || invoice.status === 'uncollectible') {
        return res.status(409).json({ message: 'Invoice is not payable' });
      }
      // Authorize: invoice client must match this portal user
      const [client] = await db
        .select()
        .from(clientsTable)
        .where(and(
          eq(clientsTable.orgId, portalUser.orgId),
          eq(clientsTable.email, portalUser.email)
        ));
      if (!client || client.id !== invoice.clientId) {
        return res.status(403).json({ message: 'Not authorized to pay this invoice' });
      }
      // Verify payment method belongs to this client
      const paymentMethod = await storage.getClientPaymentMethod(paymentMethodId);
      if (!paymentMethod || paymentMethod.clientId !== client.id) {
        return res.status(403).json({ message: 'Payment method not found or not authorized' });
      }
      const result = await chargeInvoice(
        invoice.id,
        invoice.orgId,
        client.id,
        paymentMethod.stripePaymentMethodId,
        invoice.amountCents,
        invoice.invoiceNumber ? `Invoice ${invoice.invoiceNumber}` : undefined,
      );
      res.json({ paymentIntentId: result.paymentIntentId, status: result.status });
    } catch (error: any) {
      console.error('Error paying invoice with saved method:', error);
      const msg = error?.message || 'Payment failed';
      res.status(500).json({ message: msg });
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

  // Portal inspections — list completed inspection reports for the portal user's properties
  app.get('/api/portal/inspections', isPortalAuthenticated, async (req: any, res) => {
    try {
      const portalUser = req.portalUser;
      const links = await storage.getPortalUserProperties(portalUser.id);
      const propertyIds = links.map((l: any) => l.propertyId);
      if (propertyIds.length === 0) return res.json([]);
      const { tasks: tasksTable, properties: propsTable } = await import('@shared/schema');
      const { eq, and, inArray, desc: descOp } = await import('drizzle-orm');
      const filterPropertyId = req.query.propertyId ? parseInt(req.query.propertyId as string) : null;
      const effectivePropertyIds =
        filterPropertyId && propertyIds.includes(filterPropertyId)
          ? [filterPropertyId]
          : filterPropertyId
          ? []
          : propertyIds;
      if (effectivePropertyIds.length === 0) return res.json([]);
      const rows = await db
        .select({
          id: tasksTable.id,
          title: tasksTable.title,
          status: tasksTable.status,
          completedAt: tasksTable.completedAt,
          dueDate: tasksTable.dueDate,
          propertyId: tasksTable.propertyId,
          propertyName: propsTable.name,
        })
        .from(tasksTable)
        .leftJoin(propsTable, eq(tasksTable.propertyId, propsTable.id))
        .where(
          and(
            eq(tasksTable.category, 'inspection'),
            eq(tasksTable.status, 'completed'),
            inArray(tasksTable.propertyId, effectivePropertyIds),
          )
        )
        .orderBy(descOp(tasksTable.completedAt));
      res.json(rows);
    } catch (error) {
      console.error('Error fetching portal inspections:', error);
      res.status(500).json({ message: 'Failed to fetch inspections' });
    }
  });

  // Portal inspection report detail
  app.get('/api/portal/inspections/:id', isPortalAuthenticated, async (req: any, res) => {
    try {
      const portalUser = req.portalUser;
      const taskId = parseInt(req.params.id);
      // Security: verify task property is in portal user's allowed list (which is org-scoped)
      const links = await storage.getPortalUserProperties(portalUser.id);
      const allowedPropertyIds = links.map((l: any) => l.propertyId);
      const task = await storage.getTask(taskId);
      if (!task) return res.status(404).json({ message: 'Not found' });
      if ((task as any).category !== 'inspection' || (task as any).status !== 'completed') {
        return res.status(404).json({ message: 'Not found' });
      }
      if (!(task as any).propertyId || !allowedPropertyIds.includes((task as any).propertyId)) {
        return res.status(403).json({ message: 'Access denied' });
      }
      const checklistItems = await storage.getTaskChecklistItems(taskId);
      const passCount = checklistItems.filter((i: any) => i.result === 'pass').length;
      const failCount = checklistItems.filter((i: any) => i.result === 'fail').length;
      const naCount = checklistItems.filter((i: any) => i.result === 'na').length;
      const pendingCount = checklistItems.filter((i: any) => !i.result).length;
      res.json({ task, checklistItems, summary: { passCount, failCount, naCount, pendingCount } });
    } catch (error) {
      console.error('Error fetching portal inspection report:', error);
      res.status(500).json({ message: 'Failed to fetch inspection report' });
    }
  });

  // Portal inspection report PDF download
  app.get('/api/portal/inspections/:id/pdf', isPortalAuthenticated, async (req: any, res) => {
    try {
      const portalUser = req.portalUser;
      const taskId = parseInt(req.params.id);
      // Security: verify task property is in portal user's allowed list (which is org-scoped)
      const links = await storage.getPortalUserProperties(portalUser.id);
      const allowedPropertyIds = links.map((l: any) => l.propertyId);
      const task = await storage.getTask(taskId);
      if (!task) return res.status(404).json({ message: 'Not found' });
      if ((task as any).category !== 'inspection' || (task as any).status !== 'completed') {
        return res.status(404).json({ message: 'Not found' });
      }
      if (!(task as any).propertyId || !allowedPropertyIds.includes((task as any).propertyId)) {
        return res.status(403).json({ message: 'Access denied' });
      }
      const checklistItems = await storage.getTaskChecklistItems(taskId);
      const pdfBuffer = await buildInspectionReportPdf(task, checklistItems, {});
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="inspection-report-${taskId}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating portal inspection PDF:', error);
      res.status(500).json({ message: 'Failed to generate PDF' });
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

      const { email, role, propertyIds, contactId, expiresInDays = 7 } = req.body;

      if (!email || !role) {
        return res.status(400).json({ message: 'Email and role are required' });
      }

      const orgId = currentUser.orgId!;
      const normalizedEmail = email.toLowerCase().trim();

      // Check for duplicate active (non-expired, non-used) invitation
      const existing = await storage.getActivePortalInvitationByEmailAndOrg(orgId, normalizedEmail);
      if (existing) {
        return res.status(409).json({ message: 'An active invitation already exists for this email', invitation: existing });
      }

      const token = nanoid(32);
      const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
      const sentAt = new Date();

      const invitation = await storage.createPortalInvitation({
        orgId,
        token,
        email: normalizedEmail,
        role,
        propertyIds: propertyIds || [],
        contactId: contactId || null,
        createdByUserId: currentUserId,
        expiresAt,
        sentAt,
      });

      // Send invitation email
      try {
        const { sendPortalInvitationEmail } = await import('./portalInvitationEmail.js');
        const org = await storage.getOrg(orgId);
        const baseUrl = getAppBaseUrl();
        // Look up contact first name for personalized greeting
        let contactFirstName: string | undefined;
        if (contactId) {
          try {
            const contact = await storage.getContact(contactId);
            contactFirstName = contact?.firstName || undefined;
          } catch {}
        }
        await sendPortalInvitationEmail({
          toEmail: normalizedEmail,
          orgName: org?.name || 'Your Property Manager',
          orgBranding: (org?.branding as any) || {},
          registrationUrl: `${baseUrl}/portal/register?token=${token}`,
          expiresAt,
          expiresInDays,
          contactFirstName,
        });
      } catch (emailErr) {
        console.error('[portal-invite] Failed to send invitation email:', emailErr);
        // Don't fail the request — invitation record is created, admin can resend
      }

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

      const { email } = req.query;
      let invitations;
      if (email && typeof email === 'string') {
        invitations = await storage.getPortalInvitationsByEmail(currentUser.orgId!, email);
      } else {
        invitations = await storage.getPortalInvitationsByOrg(currentUser.orgId!);
      }
      res.json(invitations);
    } catch (error) {
      console.error('Error fetching portal invitations:', error);
      res.status(500).json({ message: 'Failed to fetch invitations' });
    }
  });

  app.post('/api/portal/invitations/:id/resend', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user?.claims?.sub;
      const currentUser = await storage.getUser(currentUserId);
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'supervisor')) {
        return res.status(403).json({ message: 'Only admins can resend invitations' });
      }

      const inv = await storage.getPortalInvitationById(req.params.id);
      if (!inv || inv.orgId !== currentUser.orgId) {
        return res.status(404).json({ message: 'Invitation not found' });
      }
      if (inv.isUsed) {
        return res.status(400).json({ message: 'Cannot resend an already-used invitation' });
      }

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const sentAt = new Date();
      const updated = await storage.updatePortalInvitation(inv.id, { expiresAt, sentAt });

      // Resend email
      try {
        const { sendPortalInvitationEmail } = await import('./portalInvitationEmail.js');
        const org = await storage.getOrg(currentUser.orgId!);
        const baseUrl = getAppBaseUrl();
        // Look up contact first name for personalized greeting
        let contactFirstName: string | undefined;
        if ((inv as any).contactId) {
          try {
            const contact = await storage.getContact((inv as any).contactId);
            contactFirstName = contact?.firstName || undefined;
          } catch {}
        }
        await sendPortalInvitationEmail({
          toEmail: inv.email,
          orgName: org?.name || 'Your Property Manager',
          orgBranding: (org?.branding as any) || {},
          registrationUrl: `${baseUrl}/portal/register?token=${inv.token}`,
          expiresAt,
          expiresInDays: 7,
          contactFirstName,
        });
      } catch (emailErr) {
        console.error('[portal-invite] Failed to resend invitation email:', emailErr);
      }

      res.json(updated);
    } catch (error) {
      console.error('Error resending portal invitation:', error);
      res.status(500).json({ message: 'Failed to resend invitation' });
    }
  });

  app.delete('/api/portal/invitations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user?.claims?.sub;
      const currentUser = await storage.getUser(currentUserId);
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'supervisor')) {
        return res.status(403).json({ message: 'Only admins can cancel invitations' });
      }

      const inv = await storage.getPortalInvitationById(req.params.id);
      if (!inv || inv.orgId !== currentUser.orgId) {
        return res.status(404).json({ message: 'Invitation not found' });
      }

      await storage.deletePortalInvitation(inv.id);
      res.status(204).end();
    } catch (error) {
      console.error('Error cancelling portal invitation:', error);
      res.status(500).json({ message: 'Failed to cancel invitation' });
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
      const currentUserId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
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
      const currentUserId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
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
      const currentUserId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
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
      const currentUserId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
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

      const currentUserId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
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

      const currentUserId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
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
      const currentUserId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
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
      const currentUserId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
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

      const currentUserId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
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
      const currentUserId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
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
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.user.claims?.orgId || req.user.orgId;
      const stats = await storage.getDashboardStats(orgId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/urgent-tasks", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.user.claims?.orgId || req.user.orgId;
      const urgentTasks = await storage.getUrgentTasks(orgId);
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

      // Get all properties filtered by community ID (org-scoped)
      const communityOrgId = (req as any).user?.claims?.orgId || (req as any).user?.orgId;
      const allProperties = await storage.getProperties(false, communityOrgId);
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
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      
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
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      
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
      const { isActive, slug, orgStatus } = req.body ?? {};

      const RESERVED = new Set(["www", "admin", "api", "app", "support", "demo"]);
      const VALID_STATUSES = new Set(["pending", "onboarding", "active", "suspended", "archived"]);

      const updates: Record<string, any> = {};

      if (typeof isActive === 'boolean') {
        updates.isActive = isActive;
        // Keep orgStatus in sync when toggling via legacy boolean
        if (!orgStatus) {
          updates.orgStatus = isActive ? "active" : "suspended";
        }
      }

      if (slug !== undefined) {
        if (typeof slug !== 'string') return res.status(400).json({ message: "slug must be a string" });
        const slugClean = slug.toLowerCase().trim();
        if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(slugClean)) {
          return res.status(400).json({ message: "slug must be 3–63 chars: lowercase letters, numbers, hyphens (not at start/end)" });
        }
        if (RESERVED.has(slugClean)) {
          return res.status(400).json({ message: `"${slugClean}" is a reserved slug` });
        }
        updates.slug = slugClean;
      }

      if (orgStatus !== undefined) {
        if (!VALID_STATUSES.has(orgStatus)) {
          return res.status(400).json({ message: `orgStatus must be one of: ${[...VALID_STATUSES].join(", ")}` });
        }
        updates.orgStatus = orgStatus;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "At least one of isActive, slug, or orgStatus is required" });
      }

      const updated = await storage.updateOrg(orgId, updates as any);
      if (!updated) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const action = updates.isActive === true ? "activate_organization"
        : updates.isActive === false ? "suspend_organization"
        : "update_organization";

      await AuditLogger.log({
        req,
        action,
        actionType: "admin",
        resource: "organization",
        resourceId: orgId,
        severity: "warning",
        success: true,
      });

      res.json(updated);
    } catch (error: any) {
      if (error?.code === "23505") {
        return res.status(409).json({ message: "That slug is already in use by another organization" });
      }
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

  // ── Encryption Status (Super Admin) ──────────────────────────────────────
  // Returns whether encryption is truly active (key is set AND valid 32-byte base64),
  // whether the canary decrypts successfully (key-mismatch detection), and how many
  // org_stripe_connections rows fail decryption with the current key.
  // No key material is returned.
  app.get("/api/super-admin/platform/encryption-status", isSuperAdmin, requireMFA, async (_req, res) => {
    try {
      const { isEncryptionEnabled, encrypt, decrypt, getCanaryPlaintext } = await import("./encryption");
      const enabled = isEncryptionEnabled();

      if (!enabled) {
        const { orgStripeConnections: oscTablePlain } = await import("@shared/schema");
        const { isNotNull } = await import("drizzle-orm");
        const plaintextRows = await db
          .select({ orgId: oscTablePlain.orgId })
          .from(oscTablePlain)
          .where(isNotNull(oscTablePlain.stripeSecretKey));
        return res.json({
          enabled: false,
          canaryOk: null,
          affectedCount: 0,
          totalConnections: 0,
          plaintextStripeOrgs: plaintextRows.length,
        });
      }

      // ── Canary check ──
      // Read the stored canary from platform_settings. If none exists, write one now.
      const settings = await storage.getPlatformSettings();
      const storedCanary = settings["encryption_canary_v1"] as string | undefined;
      let canaryOk: boolean;

      if (!storedCanary) {
        // First time with encryption enabled — write the canary
        const canaryValue = encrypt(getCanaryPlaintext());
        await storage.setPlatformSettings({ encryption_canary_v1: canaryValue }, null);
        canaryOk = true;
      } else {
        try {
          const decrypted = decrypt(storedCanary);
          canaryOk = decrypted === getCanaryPlaintext();
        } catch {
          canaryOk = false;
        }
      }

      // ── Connection health check ──
      // Try to decrypt the stripeSecretKey of every connection to find affected rows.
      const { orgStripeConnections: oscTable } = await import("@shared/schema");
      const allConnections = await db.select().from(oscTable);
      let affectedCount = 0;
      for (const conn of allConnections) {
        const fields = [conn.stripeSecretKey, conn.accessToken, conn.refreshToken, conn.stripeWebhookSecret];
        const hasEncryptedField = fields.some(
          (f) => typeof f === "string" && f.split(":").length === 3
        );
        if (!hasEncryptedField) continue; // plaintext or null — skip
        try {
          // Attempt decryption of the first non-null encrypted field
          const field = fields.find((f) => typeof f === "string" && f.split(":").length === 3)!;
          const result = decrypt(field as string);
          // If decrypt returns the cipher string unchanged (wrong key), count as affected
          if (result === field) affectedCount++;
        } catch {
          affectedCount++;
        }
      }

      // ── Access item plaintext count ──
      const { propertyAccessItems: paiTable } = await import("@shared/schema");
      const allAccessItems = await db.select({ id: paiTable.id, value: paiTable.value }).from(paiTable);
      const plaintextAccessItems = allAccessItems.filter(
        (r) => r.value.split(":").length !== 3
      ).length;

      res.json({
        enabled,
        canaryOk,
        affectedCount,
        totalConnections: allConnections.length,
        plaintextAccessItems,
        totalAccessItems: allAccessItems.length,
      });
    } catch (err) {
      console.error("Error checking encryption status:", err);
      res.status(500).json({ message: "Failed to check encryption status" });
    }
  });

  // ── Re-encrypt stored Stripe keys (Super Admin) ───────────────────────────
  // Admin provides the OLD key (base64) in the request body. The server decrypts
  // every org_stripe_connections row with the old key and re-encrypts with the
  // current key. Also re-issues the encryption canary.
  app.post("/api/super-admin/platform/reencrypt-stripe-keys", isSuperAdmin, requireMFA, async (req: any, res) => {
    try {
      const { isEncryptionEnabled, encryptWithKey, decryptWithKey, parseKeyBase64, encrypt, getCanaryPlaintext } = await import("./encryption");

      if (!isEncryptionEnabled()) {
        return res.status(400).json({ message: "Encryption is not enabled. Set PLATFORM_ENCRYPTION_KEY first." });
      }

      const { oldKey: oldKeyB64 } = req.body;
      if (!oldKeyB64 || typeof oldKeyB64 !== "string") {
        return res.status(400).json({ message: "oldKey (base64) is required in the request body." });
      }

      const oldKeyBuf = parseKeyBase64(oldKeyB64);
      if (!oldKeyBuf) {
        return res.status(400).json({ message: "oldKey must be a valid base64-encoded 32-byte key." });
      }

      const { orgStripeConnections: oscTable } = await import("@shared/schema");
      const allConnections = await db.select().from(oscTable);

      let reencrypted = 0;
      let skipped = 0;
      const errors: { orgId: string; error: string }[] = [];

      for (const conn of allConnections) {
        try {
          const updates: Record<string, string | undefined> = {};

          const reencryptField = (val: string | null | undefined): string | undefined => {
            if (!val) return undefined;
            if (val.split(":").length !== 3) return undefined; // not encrypted
            const plain = decryptWithKey(val, oldKeyBuf); // throws on wrong key
            return encrypt(plain); // encrypt with current key
          };

          let changed = false;
          const secretUpdate = reencryptField(conn.stripeSecretKey);
          if (secretUpdate !== undefined) { updates.stripeSecretKey = secretUpdate; changed = true; }
          const accessUpdate = reencryptField(conn.accessToken);
          if (accessUpdate !== undefined) { updates.accessToken = accessUpdate; changed = true; }
          const refreshUpdate = reencryptField(conn.refreshToken);
          if (refreshUpdate !== undefined) { updates.refreshToken = refreshUpdate; changed = true; }
          const webhookUpdate = reencryptField(conn.stripeWebhookSecret);
          if (webhookUpdate !== undefined) { updates.stripeWebhookSecret = webhookUpdate; changed = true; }

          if (changed) {
            await storage.updateOrgStripeConnection(conn.orgId, updates as any);
            reencrypted++;
          } else {
            skipped++;
          }
        } catch (err: any) {
          errors.push({ orgId: conn.orgId, error: err?.message ?? String(err) });
        }
      }

      // Re-issue canary with current key only when ALL rows succeeded.
      // If any row failed (wrong old key, corrupted data) we leave the canary
      // unchanged so the key-mismatch warning remains visible in the UI.
      if (errors.length === 0) {
        const newCanary = encrypt(getCanaryPlaintext());
        await storage.setPlatformSettings({ encryption_canary_v1: newCanary }, req.user?.claims?.sub ?? null);
      }

      await AuditLogger.log({
        req,
        action: "reencrypt_stripe_keys",
        actionType: "update",
        resource: "org_stripe_connections",
        severity: "warning",
        success: errors.length === 0,
        metadata: { reencrypted, skipped, errorCount: errors.length },
      });

      res.json({ reencrypted, skipped, errors });
    } catch (err) {
      console.error("Error re-encrypting Stripe keys:", err);
      res.status(500).json({ message: "Failed to re-encrypt Stripe keys" });
    }
  });

  // ── Migrate plaintext property access credentials → AES-256-GCM (Super Admin) ─
  // Scans every property_access_items row. Rows whose value already looks
  // encrypted (3-part base64:base64:base64) are skipped; all others are
  // encrypted in-place with the current PLATFORM_ENCRYPTION_KEY.
  app.post("/api/super-admin/platform/encrypt-access-items", isSuperAdmin, requireMFA, async (req: any, res) => {
    try {
      const { isEncryptionEnabled, encrypt } = await import("./encryption");

      if (!isEncryptionEnabled()) {
        return res.status(400).json({ message: "Encryption is not enabled. Set PLATFORM_ENCRYPTION_KEY first." });
      }

      const { propertyAccessItems: paiTable } = await import("@shared/schema");
      const allItems = await db.select().from(paiTable);

      let encrypted = 0;
      let skipped = 0;
      const errors: { id: number; error: string }[] = [];

      for (const item of allItems) {
        const parts = item.value.split(":");
        if (parts.length === 3) {
          // Already looks encrypted — skip
          skipped++;
          continue;
        }
        try {
          await db.update(paiTable).set({ value: encrypt(item.value) }).where(eq(paiTable.id, item.id));
          encrypted++;
        } catch (err: any) {
          errors.push({ id: item.id, error: err?.message ?? String(err) });
        }
      }

      await AuditLogger.log({
        req,
        action: "encrypt_access_items",
        actionType: "update",
        resource: "property_access_items",
        severity: "warning",
        success: errors.length === 0,
        metadata: { total: allItems.length, encrypted, skipped, errorCount: errors.length },
      });

      res.json({ total: allItems.length, encrypted, skipped, errors });
    } catch (err) {
      console.error("Error encrypting access items:", err);
      res.status(500).json({ message: "Failed to encrypt access items" });
    }
  });

  // ── Integration Status (Super Admin) ─────────────────────────────────────
  app.get("/api/super-admin/integration-status", isSuperAdmin, requireMFA, async (_req, res) => {
    try {
      res.json({
        stripe: {
          secretKey:     !!process.env.STRIPE_SECRET_KEY,
          webhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
        },
        resend: {
          apiKey:    !!process.env.RESEND_API_KEY,
          fromEmail: !!process.env.RESEND_FROM_EMAIL,
        },
        database: {
          connected: !!process.env.DATABASE_URL,
        },
        objectStorage: {
          configured: !!(process.env.PUBLIC_OBJECT_SEARCH_PATHS || process.env.PRIVATE_OBJECT_DIR),
        },
        replitAuth: {
          configured: !!(process.env.ISSUER_URL || process.env.REPL_ID),
        },
        billingAutomation: {
          enabled: process.env.BILLING_AUTOMATION_ENABLED === "true",
        },
        superAdmin: {
          usernameSet: !!(process.env.SUPER_ADMIN_USERNAME || process.env.ADMIN_EMAIL),
          passwordSet: !!(process.env.SUPER_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD),
        },
      });
    } catch (error) {
      console.error("Error fetching integration status:", error);
      res.status(500).json({ message: "Failed to fetch integration status" });
    }
  });

  // ── Pricing Tiers (Super Admin) ──────────────────────────────────────────
  app.get("/api/super-admin/pricing-tiers", isSuperAdmin, requireMFA, async (_req, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      res.json(settings.pricingTiers ?? []);
    } catch (error) {
      console.error("Error fetching pricing tiers:", error);
      res.status(500).json({ message: "Failed to fetch pricing tiers" });
    }
  });

  app.patch("/api/super-admin/pricing-tiers", isSuperAdmin, requireMFA, async (req: any, res) => {
    try {
      const tierSchema = z.object({
        name:         z.string().min(1),
        homesMin:     z.number().int().min(0),
        homesMax:     z.number().int().min(1),
        monthlyPrice: z.number().min(0),
        setupFee:     z.number().min(0),
        startsAt:     z.boolean(),
      });
      const result = z.array(tierSchema).safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid pricing tiers data", errors: result.error.errors });
      }
      const userId = req.user?.claims?.sub || null;
      await storage.setPlatformSettings({ pricingTiers: result.data }, userId);

      await AuditLogger.log({
        req,
        action: "update_pricing_tiers",
        actionType: "update",
        resource: "platform_settings",
        severity: "info",
        success: true,
        metadata: { tierCount: result.data.length },
      });

      res.json(result.data);
    } catch (error) {
      console.error("Error updating pricing tiers:", error);
      res.status(500).json({ message: "Failed to update pricing tiers" });
    }
  });

  // ── Beta Pricing (Super Admin) ───────────────────────────────────────────
  app.get("/api/super-admin/beta-pricing", isSuperAdmin, requireMFA, async (_req, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      const bp = settings.betaPricing as any | undefined;
      // Support legacy single-tier format by mapping to two-tier
      const basePrice = Number(bp?.basePrice ?? 199);
      const tier1DiscountPct = Number(bp?.tier1DiscountPct ?? bp?.discountPct ?? 50);
      const tier1Cap = Number(bp?.tier1Cap ?? 10);
      const tier2DiscountPct = Number(bp?.tier2DiscountPct ?? 25);
      const tier2Cap = Number(bp?.tier2Cap ?? 10);
      res.json({ basePrice, tier1DiscountPct, tier1Cap, tier2DiscountPct, tier2Cap });
    } catch (error) {
      console.error("Error fetching beta pricing:", error);
      res.status(500).json({ message: "Failed to fetch beta pricing" });
    }
  });

  app.patch("/api/super-admin/beta-pricing", isSuperAdmin, requireMFA, async (req: any, res) => {
    try {
      const schema = z.object({
        basePrice: z.number().min(0),
        tier1DiscountPct: z.number().min(0).max(100),
        tier1Cap: z.number().int().min(1),
        tier2DiscountPct: z.number().min(0).max(100),
        tier2Cap: z.number().int().min(0),
      });
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid beta pricing data", errors: result.error.errors });
      }
      const userId = req.user?.claims?.sub || null;
      await storage.setPlatformSettings({ betaPricing: result.data }, userId);

      await AuditLogger.log({
        req,
        action: "update_beta_pricing",
        actionType: "update",
        resource: "platform_settings",
        severity: "info",
        success: true,
        metadata: result.data,
      });

      res.json(result.data);
    } catch (error) {
      console.error("Error updating beta pricing:", error);
      res.status(500).json({ message: "Failed to update beta pricing" });
    }
  });

  // ── Beta Member Management (Super Admin) ─────────────────────────────────

  // GET /api/super-admin/beta-members — list active approved beta members
  // Uses isBetaMember flag (not stage) so members remain visible after stage transitions
  app.get("/api/super-admin/beta-members", isSuperAdmin, requireMFA, async (_req, res) => {
    try {
      const members = await db
        .select()
        .from(onboardingProspects)
        .where(
          and(
            eq(onboardingProspects.isBetaMember, true),
            isNull(onboardingProspects.betaRemovedAt)
          )
        )
        .orderBy(onboardingProspects.createdAt);
      res.json(members);
    } catch (error) {
      console.error("Error fetching beta members:", error);
      res.status(500).json({ message: "Failed to fetch beta members" });
    }
  });

  // POST /api/super-admin/beta-members — manually add a beta member
  app.post("/api/super-admin/beta-members", isSuperAdmin, requireMFA, async (req: any, res) => {
    try {
      const { name, email, company, betaDiscountTier } = req.body;
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Name is required" });
      }
      if (!email || typeof email !== "string" || !email.trim()) {
        return res.status(400).json({ message: "Email is required" });
      }
      if (betaDiscountTier && !["founding_10", "early_access_10"].includes(betaDiscountTier)) {
        return res.status(400).json({ message: "Invalid tier" });
      }

      const prospect = await storage.createOnboardingProspect({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        company: company?.trim() || null,
        betaDiscountTier: betaDiscountTier || null,
        isBetaMember: true,
        stage: "welcome",
        source: "manual",
      } as any);

      await AuditLogger.log({
        req,
        action: "add_beta_member_manual",
        actionType: "create",
        resource: "onboarding_prospect",
        resourceId: prospect.id,
        severity: "info",
        success: true,
        metadata: { name: prospect.name, email: prospect.email, betaDiscountTier },
      });

      // Non-blocking welcome email — failure must not fail the API response
      if (resend) {
        const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.SUPPORT_EMAIL_FROM || "noreply@hubify.com";
        const nameParts = (prospect.name || "").trim().split(/\s+/);
        const firstName = nameParts[0] || prospect.name || "there";
        const tierLabelMap: Record<string, string> = {
          founding_10: "Founding Member (10% lifetime discount)",
          early_access_10: "Early Access (10% discount)",
        };
        const tierLabel = prospect.betaDiscountTier ? tierLabelMap[prospect.betaDiscountTier] || prospect.betaDiscountTier : null;
        const tierRow = tierLabel
          ? `<tr>
               <td style="padding:8px 0;color:#64748b;font-size:14px;width:160px;vertical-align:top">Beta tier</td>
               <td style="padding:8px 0;font-size:14px;vertical-align:top">
                 <span style="display:inline-block;background:#ccfbf1;color:#0d9488;font-weight:700;padding:3px 10px;border-radius:20px">${tierLabel}</span>
               </td>
             </tr>`
          : "";
        const companyRow = prospect.company
          ? `<tr>
               <td style="padding:8px 0;color:#64748b;font-size:14px;vertical-align:top">Organization</td>
               <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top">${prospect.company}</td>
             </tr>`
          : "";

        resend.emails.send({
          to: prospect.email,
          from: fromEmail,
          subject: `You're in — welcome to the Hubify beta!`,
          html: `
            <div style="font-family:sans-serif;max-width:580px;margin:0 auto;padding:32px 24px;background:#ffffff">
              <div style="text-align:center;margin-bottom:28px">
                <div style="font-size:22px;font-weight:800;color:#0d9488;letter-spacing:-0.5px">Hubify</div>
              </div>
              <h1 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px">Hi ${firstName}, you're in!</h1>
              <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px">
                You've been granted access to the Hubify beta program. We're excited to have you on board${prospect.company ? ` at <strong>${prospect.company}</strong>` : ""}.
              </p>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:28px">
                <table style="width:100%;border-collapse:collapse">
                  <tr>
                    <td style="padding:8px 0;color:#64748b;font-size:14px;width:160px;vertical-align:top">Name</td>
                    <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top">${prospect.name}</td>
                  </tr>
                  ${companyRow}
                  ${tierRow}
                </table>
              </div>
              <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px">
                Our team will reach out shortly with your next steps and onboarding details. If you have questions please email <a href="mailto:contact@hubifyhomes.com" style="color:#0d9488">contact@hubifyhomes.com</a>.
              </p>
              <p style="color:#6b7280;font-size:14px;margin-top:30px;">Best regards,<br>The Hubify Team</p>
            </div>
          `,
          text: `Hi ${firstName},\n\nYou've been granted access to the Hubify beta program${prospect.company ? ` at ${prospect.company}` : ""}.\n\n${tierLabel ? `Beta tier: ${tierLabel}\n\n` : ""}Our team will reach out shortly with your next steps and onboarding details.\n\nBest regards,\nThe Hubify Team`,
        }).then(({ error }) => {
          if (error) {
            console.error(`[beta-members] Welcome email failed for ${prospect.email}:`, error.message);
          } else {
            storage.updateOnboardingProspect(prospect.id, { welcomeEmailSentAt: new Date() } as any).catch(() => {});
          }
        }).catch((err: unknown) => {
          console.error(`[beta-members] Welcome email exception for ${prospect.email}:`, err);
        });
      }

      res.status(201).json(prospect);
    } catch (error) {
      console.error("Error adding beta member:", error);
      res.status(500).json({ message: "Failed to add beta member" });
    }
  });

  // PATCH /api/super-admin/beta-members/:id/remove — legacy alias for soft-remove
  app.patch("/api/super-admin/beta-members/:id/remove", isSuperAdmin, requireMFA, async (req: any, res) => {
    const { id } = req.params;
    try {
      const prospect = await storage.getOnboardingProspect(id);
      if (!prospect) return res.status(404).json({ message: "Beta member not found" });
      const updated = await storage.updateOnboardingProspect(id, {
        isBetaMember: false,
        betaRemovedAt: new Date(),
        stage: "inquiry",
      } as any);
      await AuditLogger.log({ req, action: "remove_beta_member", actionType: "update", resource: "onboarding_prospect", resourceId: id, severity: "info", success: true, metadata: { name: prospect.name, email: prospect.email } });
      res.json(updated);
    } catch (error) {
      console.error("Error removing beta member:", error);
      res.status(500).json({ message: "Failed to remove beta member" });
    }
  });

  // DELETE /api/super-admin/beta-members/:id — soft-remove: clears isBetaMember, frees slot, preserves record
  app.delete("/api/super-admin/beta-members/:id", isSuperAdmin, requireMFA, async (req: any, res) => {
    try {
      const { id } = req.params;
      const prospect = await storage.getOnboardingProspect(id);
      if (!prospect) return res.status(404).json({ message: "Beta member not found" });

      const updated = await storage.updateOnboardingProspect(id, {
        isBetaMember: false,
        betaRemovedAt: new Date(),
        stage: "inquiry",
      } as any);

      await AuditLogger.log({
        req,
        action: "remove_beta_member",
        actionType: "update",
        resource: "onboarding_prospect",
        resourceId: id,
        severity: "info",
        success: true,
        metadata: { name: prospect.name, email: prospect.email },
      });

      res.json({ message: "Beta slot freed", prospect: updated });
    } catch (error) {
      console.error("Error removing beta member:", error);
      res.status(500).json({ message: "Failed to remove beta member" });
    }
  });

  // DELETE /api/super-admin/beta-members/:id/hard — hard delete (cannot be undone)
  app.delete("/api/super-admin/beta-members/:id/hard", isSuperAdmin, requireMFA, async (req: any, res) => {
    try {
      const { id } = req.params;
      const prospect = await storage.getOnboardingProspect(id);
      if (!prospect) return res.status(404).json({ message: "Beta member not found" });

      await storage.deleteOnboardingProspect(id);

      await AuditLogger.log({
        req,
        action: "delete_beta_member",
        actionType: "delete",
        resource: "onboarding_prospect",
        resourceId: id,
        severity: "warning",
        success: true,
        metadata: { name: prospect.name, email: prospect.email },
      });

      res.json({ message: "Beta member permanently deleted" });
    } catch (error) {
      console.error("Error deleting beta member:", error);
      res.status(500).json({ message: "Failed to delete beta member" });
    }
  });

  // ── Demo Tenant (Super Admin) ─────────────────────────────────────────────

  // GET /api/super-admin/demo/info — basic stats for the demo tenant
  app.get("/api/super-admin/demo/info", isSuperAdmin, requireMFA, async (_req, res) => {
    try {
      const [orgRow] = await db.select().from(orgs).where(eq(orgs.id, DEMO_ORG_ID)).limit(1);
      if (!orgRow) {
        return res.json({ exists: false });
      }

      const [
        [{ userCount }],
        [{ propertyCount }],
        [{ contactCount }],
        [{ tc }],
        [{ invoiceCount }],
        [{ eventCount }],
        [{ inspectionCount }],
        [{ notificationCount }],
      ] = await Promise.all([
        db.select({ userCount: count() }).from(users).where(eq(users.orgId, DEMO_ORG_ID)),
        db.select({ propertyCount: count() }).from(properties).where(eq(properties.orgId, DEMO_ORG_ID)),
        db.select({ contactCount: count() }).from(contacts).where(eq(contacts.orgId, DEMO_ORG_ID)),
        db.select({ tc: count() }).from(tasks)
          .innerJoin(properties, eq(tasks.propertyId, properties.id))
          .where(eq(properties.orgId, DEMO_ORG_ID)),
        db.select({ invoiceCount: count() }).from(clientInvoices).where(eq(clientInvoices.orgId, DEMO_ORG_ID)),
        db.select({ eventCount: count() }).from(events).where(eq(events.orgId, DEMO_ORG_ID)),
        db.select({ inspectionCount: count() }).from(inspectionSchedules).where(eq(inspectionSchedules.orgId, DEMO_ORG_ID)),
        db.select({ notificationCount: count() }).from(notifications).where(eq(notifications.orgId, DEMO_ORG_ID)),
      ]);

      res.json({
        exists: true,
        orgId: DEMO_ORG_ID,
        orgName: orgRow.name,
        domain: DEMO_DOMAIN,
        adminEmail: DEMO_ADMIN_EMAIL,
        adminPassword: "Demo2026!",
        portalEmail: "client@demo.hubifyhomesonline.com",
        portalPassword: "DemoClient2026!",
        staffLoginUrl: "/staff/login",
        portalLoginUrl: "/portal/login",
        userCount: Number(userCount),
        propertyCount: Number(propertyCount),
        contactCount: Number(contactCount),
        taskCount: Number(tc),
        invoiceCount: Number(invoiceCount),
        eventCount: Number(eventCount),
        inspectionCount: Number(inspectionCount),
        notificationCount: Number(notificationCount),
        demoSiteUrl: `https://${DEMO_DOMAIN}`,
      });
    } catch (error) {
      console.error("Error fetching demo info:", error);
      res.status(500).json({ message: "Failed to fetch demo info" });
    }
  });

  // GET /api/super-admin/demo/requests-summary — demo lead funnel stats
  app.get("/api/super-admin/demo/requests-summary", isSuperAdmin, requireMFA, async (_req, res) => {
    try {
      const DEMO_STAGES = ["demo_requested", "demo_sent", "demo_completed", "follow_up_needed", "converted", "not_a_fit"];
      const rows = await db
        .select({ stage: onboardingProspects.stage, id: onboardingProspects.id, name: onboardingProspects.name, company: onboardingProspects.company, email: onboardingProspects.email, demoAccessSent: onboardingProspects.demoAccessSent, demoEmailSentAt: onboardingProspects.demoEmailSentAt, demoEmailError: onboardingProspects.demoEmailError, createdAt: onboardingProspects.createdAt })
        .from(onboardingProspects)
        .where(inArray(onboardingProspects.stage as any, DEMO_STAGES))
        .orderBy(desc(onboardingProspects.createdAt));

      const stageCounts = DEMO_STAGES.reduce<Record<string, number>>((acc, s) => {
        acc[s] = rows.filter(r => r.stage === s).length;
        return acc;
      }, {});

      const total = rows.length;
      const sent = (stageCounts.demo_sent ?? 0) + (stageCounts.demo_completed ?? 0) + (stageCounts.follow_up_needed ?? 0) + (stageCounts.converted ?? 0);
      const recent = rows.slice(0, 10);

      res.json({ total, stageCounts, sent, recent });
    } catch (error) {
      console.error("Error fetching demo requests summary:", error);
      res.status(500).json({ message: "Failed to fetch demo requests summary" });
    }
  });

  // POST /api/super-admin/demo/send-invite — email demo credentials to a recipient
  app.post("/api/super-admin/demo/send-invite", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const schema = z.object({
        recipientEmail: z.string().email(),
        recipientName: z.string().min(1).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid request", errors: parsed.error.errors });

      const { recipientEmail, recipientName } = parsed.data;
      const firstName = recipientName ? recipientName.split(" ")[0] : "there";
      const displayName = recipientName || recipientEmail;

      const fromEmail = process.env.RESEND_FROM_EMAIL;
      if (!resend || !fromEmail) {
        return res.status(503).json({ message: "Email not configured (RESEND_FROM_EMAIL / RESEND_API_KEY missing)" });
      }

      const { DEMO_DOMAIN } = await import('./demoSeed.js');
      const staffUrl  = `https://${DEMO_DOMAIN}/staff/login`;
      const portalUrl = `https://${DEMO_DOMAIN}/portal/login`;

      const html = `
        <div style="font-family:sans-serif;max-width:580px;margin:0 auto;padding:32px 24px;background:#ffffff">
          <div style="text-align:center;margin-bottom:28px">
            <img src="${getHubifyHomesEmailLogoUrl()}" alt="Hubify Homes" width="180" style="width:180px;max-width:180px;height:auto;display:block;margin:0 auto;border:0;outline:none;text-decoration:none;">
          </div>

          <h1 style="font-size:21px;font-weight:700;color:#0f172a;margin:0 0 10px">Hi ${firstName}, here's your Hubify demo access.</h1>
          <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 28px">
            We've set up a fully loaded demo environment for <strong>${displayName}</strong> so you can explore everything Hubify Homes has to offer. Use the credentials below to log in and take a look around.
          </p>

          <!-- Staff / Admin access -->
          <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:20px 24px;margin-bottom:16px">
            <div style="font-size:11px;font-weight:700;color:#0d9488;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:10px">Staff / Admin Login</div>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr>
                <td style="color:#64748b;padding:4px 0;width:80px">URL</td>
                <td><a href="${staffUrl}" style="color:#0d9488;font-weight:600">${staffUrl}</a></td>
              </tr>
              <tr>
                <td style="color:#64748b;padding:4px 0">Email</td>
                <td style="font-family:monospace;color:#0f172a">demo@hubifyhomesonline.com</td>
              </tr>
              <tr>
                <td style="color:#64748b;padding:4px 0">Password</td>
                <td style="font-family:monospace;color:#0f172a">Demo2026!</td>
              </tr>
            </table>
          </div>

          <!-- Portal / Client access -->
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin-bottom:28px">
            <div style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:10px">Client Portal Login</div>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr>
                <td style="color:#64748b;padding:4px 0;width:80px">URL</td>
                <td><a href="${portalUrl}" style="color:#0d9488;font-weight:600">${portalUrl}</a></td>
              </tr>
              <tr>
                <td style="color:#64748b;padding:4px 0">Email</td>
                <td style="font-family:monospace;color:#0f172a">client@demo.hubifyhomesonline.com</td>
              </tr>
              <tr>
                <td style="color:#64748b;padding:4px 0">Password</td>
                <td style="font-family:monospace;color:#0f172a">DemoClient2026!</td>
              </tr>
            </table>
          </div>

          <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 24px">
            The demo includes 10 sample properties, realistic tasks, invoices, inspections, and a full client portal view. Feel free to click around — nothing you do will affect any real data.
          </p>

          <div style="text-align:center;margin-bottom:32px">
            <a href="${staffUrl}" style="display:inline-block;background:#0d9488;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px">
              Open Demo
            </a>
          </div>

          <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px" />
          <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0">
            If you have questions, please email <a href="mailto:contact@hubifyhomes.com" style="color:#94a3b8">contact@hubifyhomes.com</a><br/>
            Hubify Homes · Property Management Platform
          </p>
        </div>
      `;

      const { error } = await resend.emails.send({
        from: fromEmail,
        to: recipientEmail,
        subject: `Your Hubify Homes Demo Access`,
        html,
      });

      if (error) {
        console.error("[demo-invite] Resend error:", error);
        return res.status(500).json({ message: "Failed to send invite email", detail: error.message });
      }

      await AuditLogger.log({ req, action: "demo_invite_sent", metadata: { recipientEmail, recipientName } });
      res.json({ ok: true, recipientEmail });
    } catch (error: any) {
      console.error("Error sending demo invite:", error);
      res.status(500).json({ message: error.message || "Failed to send demo invite" });
    }
  });

  // POST /api/super-admin/demo/seed — seed the demo tenant (idempotent)
  app.post("/api/super-admin/demo/seed", isSuperAdmin, requireMFA, async (req: any, res) => {
    try {
      const result = await seedDemoTenant();
      await AuditLogger.log({ req, action: "demo_seed", metadata: result });
      res.json({ ok: true, ...result });
    } catch (error: any) {
      console.error("Demo seed error:", error);
      res.status(500).json({ message: error.message || "Failed to seed demo tenant" });
    }
  });

  // POST /api/super-admin/demo/reset — wipe and reseed the demo tenant
  app.post("/api/super-admin/demo/reset", isSuperAdmin, requireMFA, async (req: any, res) => {
    try {
      const result = await resetDemoTenant();
      await AuditLogger.log({ req, action: "demo_reset", metadata: result });
      res.json({ ok: true, ...result });
    } catch (error: any) {
      console.error("Demo reset error:", error);
      res.status(500).json({ message: error.message || "Failed to reset demo tenant" });
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
  app.get("/api/super-admin/feature-flags", isSuperAdmin, requireMFA, async (_req, res) => {
    try {
      const flags = await storage.getAllFeatureFlags();
      res.json(flags);
    } catch (error) {
      console.error("Error fetching feature flags:", error);
      res.status(500).json({ message: "Failed to fetch feature flags" });
    }
  });

  app.post("/api/super-admin/feature-flags", isSuperAdmin, requireMFA, async (req, res) => {
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

  app.patch("/api/super-admin/feature-flags/:key", isSuperAdmin, requireMFA, async (req, res) => {
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

  app.delete("/api/super-admin/feature-flags/:key", isSuperAdmin, requireMFA, async (req, res) => {
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
    isSuperAdmin, requireMFA,
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
    isSuperAdmin, requireMFA,
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

  // ── Admin billing lifecycle controls ─────────────────────────────────────────
  // All routes gated by isSuperAdmin + requireMFA.

  // POST /api/super-admin/orgs/:orgId/billing/cancel
  app.post("/api/super-admin/orgs/:orgId/billing/cancel", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { orgId } = req.params;
      const { reason } = req.body ?? {};
      const org = await storage.getOrg(orgId);
      if (!org) return res.status(404).json({ message: "Organization not found" });
      const now = new Date();
      await storage.updateOrgSubscription(orgId, {
        canceledAt: now,
        status: "canceled" as any,
        betaPriceForfeitureReason: reason ?? "admin_cancel",
      } as any);
      res.json({ ok: true, canceledAt: now });
    } catch (err: any) {
      console.error("[billing/cancel]", err?.message ?? err);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // POST /api/super-admin/orgs/:orgId/billing/mark-payment-failed
  app.post("/api/super-admin/orgs/:orgId/billing/mark-payment-failed", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { orgId } = req.params;
      const org = await storage.getOrg(orgId);
      if (!org) return res.status(404).json({ message: "Organization not found" });
      await storage.updateOrgSubscription(orgId, {
        paymentStatus: "failed" as any,
        status: "past_due" as any,
      } as any);
      res.json({ ok: true });
    } catch (err: any) {
      console.error("[billing/mark-payment-failed]", err?.message ?? err);
      res.status(500).json({ message: "Failed to mark payment failed" });
    }
  });

  // POST /api/super-admin/orgs/:orgId/billing/mark-payment-disputed
  app.post("/api/super-admin/orgs/:orgId/billing/mark-payment-disputed", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { orgId } = req.params;
      const org = await storage.getOrg(orgId);
      if (!org) return res.status(404).json({ message: "Organization not found" });
      await storage.updateOrgSubscription(orgId, {
        paymentStatus: "disputed" as any,
      } as any);
      res.json({ ok: true });
    } catch (err: any) {
      console.error("[billing/mark-payment-disputed]", err?.message ?? err);
      res.status(500).json({ message: "Failed to mark payment disputed" });
    }
  });

  // POST /api/super-admin/orgs/:orgId/billing/forfeit-beta-pricing
  app.post("/api/super-admin/orgs/:orgId/billing/forfeit-beta-pricing", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { orgId } = req.params;
      const { reason } = req.body ?? {};
      const org = await storage.getOrg(orgId);
      if (!org) return res.status(404).json({ message: "Organization not found" });
      const existing = await storage.getOrgSubscription(orgId);
      if (!existing?.betaPriceLocked) {
        return res.status(409).json({ message: "Organization does not have locked beta pricing." });
      }
      const now = new Date();
      await storage.updateOrgSubscription(orgId, {
        betaPriceLocked: false,
        betaPriceForfeitedAt: now,
        betaPriceForfeitureReason: reason ?? "admin_action",
      } as any);
      res.json({ ok: true, forfeitedAt: now });
    } catch (err: any) {
      console.error("[billing/forfeit-beta-pricing]", err?.message ?? err);
      res.status(500).json({ message: "Failed to forfeit beta pricing" });
    }
  });

  // GET /api/super-admin/orgs/:orgId/agreement-history
  app.get("/api/super-admin/orgs/:orgId/agreement-history", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { orgId } = req.params;
      const org = await storage.getOrg(orgId);
      if (!org) return res.status(404).json({ message: "Organization not found" });
      const records = await storage.getAgreementAcceptancesByOrg(orgId);
      res.json(records);
    } catch (err: any) {
      console.error("[agreement-history]", err?.message ?? err);
      res.status(500).json({ message: "Failed to fetch agreement history" });
    }
  });

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
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
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
        const allProperties = await storage.getProperties(true, userOrgId);
        const orgCommunityProperties = allProperties.filter(
          p => p.communityId === communityId
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
        const allProperties = await storage.getProperties(true, userOrgId);
        const orgCommunityProperties = allProperties.filter(
          p => p.communityId === document.communityId
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
      const orgId = (req as any).user?.claims?.orgId || (req as any).user?.orgId;
      let properties = await storage.getProperties(includeInactiveFlag, orgId);
      
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
      const orgId = req.user.claims?.orgId || req.user.orgId;
      
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
      
      const orgId = req.user.claims?.orgId || req.user.orgId;
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

      const orgId = req.user.claims?.orgId || req.user.orgId;
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

      const orgId = req.user.claims?.orgId || req.user.orgId;
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

      const orgId = req.user.claims?.orgId || req.user.orgId;
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
      
      const { decrypt } = await import("./encryption");
      const items = await storage.getPropertyAccessItems(propertyId);
      res.json(items.map(item => ({ ...item, value: decrypt(item.value) })));
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

      const { encrypt, decrypt } = await import("./encryption");
      const stored = await storage.createPropertyAccessItem({
        ...validatedData,
        value: encrypt(validatedData.value),
      });
      res.status(201).json({ ...stored, value: decrypt(stored.value) });
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

      const { encrypt, decrypt } = await import("./encryption");
      const body = { ...req.body };
      if (typeof body.value === "string") {
        body.value = encrypt(body.value);
      }
      const item = await storage.updatePropertyAccessItem(id, body);
      res.json({ ...item, value: decrypt(item.value) });
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
      const tasksOrgId = (req as any).user?.claims?.orgId || (req as any).user?.orgId;
      let tasks = await storage.getTasks(tasksOrgId);
      
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
      const templatesOrgId = (req as any).user?.claims?.orgId || (req as any).user?.orgId;
      const tasks = await storage.getTasks(templatesOrgId);
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
          orgId: req.user.claims?.orgId || req.user.orgId,
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

      const [allUsers, allProperties] = await Promise.all([
        storage.getUsersByOrg(orgId),
        storage.getProperties(true, orgId),
      ]);
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
        totalMileage: number;
        breakdown: Map<string, Bucket>;
      };

      const makeBucket = (key: string, label: string): Bucket => ({
        key, label,
        totalHours: 0, billableHours: 0, nonBillableHours: 0,
        billableAmountCents: 0, entryCount: 0, totalMileage: 0, breakdown: new Map(),
      });

      const groups = new Map<string, Bucket>();
      const activeUserIds = new Set<string>();
      const activePropertyIds = new Set<string>();
      let totalHours = 0, billableHours = 0, nonBillableHours = 0, billableAmountCents = 0, totalMileage = 0;

      // Per-user per-week hour tracking for overtime detection (Mon-start ISO week)
      const userWeekHours = new Map<string, Map<string, number>>();
      const getWeekKey = (date: Date): string => {
        const d = new Date(date);
        const day = d.getDay();
        d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
        return d.toISOString().slice(0, 10);
      };

      for (const entry of entries) {
        const hours = computeHours(entry);
        const isBillable = entry.isBillable !== false;
        const amountCents = isBillable && entry.billableRateCents
          ? Math.round((entry.billableRateCents) * hours)
          : 0;
        const entryMileage = (entry as any).mileage ?? 0;

        totalHours += hours;
        if (isBillable) billableHours += hours; else nonBillableHours += hours;
        billableAmountCents += amountCents;
        totalMileage += entryMileage;
        activeUserIds.add(entry.userId);
        if (entry.propertyId) activePropertyIds.add(String(entry.propertyId));

        // Accumulate per-user weekly hours for overtime
        const weekKey = getWeekKey(new Date(entry.clockIn));
        if (!userWeekHours.has(entry.userId)) userWeekHours.set(entry.userId, new Map());
        const wm = userWeekHours.get(entry.userId)!;
        wm.set(weekKey, (wm.get(weekKey) ?? 0) + hours);

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
        g.totalMileage += entryMileage;

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

      // Build overtime flag map: true if user exceeded 40h in any single ISO week
      const userOvertimeFlags = new Map<string, boolean>();
      for (const [uid, weekMap] of userWeekHours) {
        userOvertimeFlags.set(uid, Array.from(weekMap.values()).some((h) => h > 40));
      }

      const serializeBucket = (b: Bucket) => ({
        key: b.key,
        label: b.label,
        totalHours: Number(b.totalHours.toFixed(2)),
        billableHours: Number(b.billableHours.toFixed(2)),
        nonBillableHours: Number(b.nonBillableHours.toFixed(2)),
        billableAmountCents: b.billableAmountCents,
        entryCount: b.entryCount,
        totalMileage: b.totalMileage,
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
          totalMileage,
        },
        groups: Array.from(groups.values())
          .sort((a, b) => b.totalHours - a.totalHours)
          .map((g) => ({
            ...serializeBucket(g),
            overtimeFlag: groupBy === 'user' ? (userOvertimeFlags.get(g.key) ?? false) : false,
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

  // Live time-report PDF — mirrors the JSON report route but returns a PDF
  app.get("/api/time-entries/report.pdf", isAuthenticated, requireFeatureFlag("advanced_reporting"), async (req: any, res) => {
    try {
      const user = req.user;
      const userId = user.claims?.sub || user.id;
      const dbUser = userId ? await storage.getUser(userId) : null;
      const orgId = dbUser?.orgId || user.claims?.orgId || user.orgId;
      const role = dbUser?.role || user.claims?.role;

      if (!orgId) return res.status(400).json({ message: "Organization ID is required" });
      if (role !== 'admin' && role !== 'supervisor') return res.status(403).json({ message: "Only admins and supervisors can export time reports" });

      const groupBy: "user" | "property" = req.query.groupBy === 'property' ? 'property' : 'user';
      const billableFilterQ = typeof req.query.billable === 'string' ? req.query.billable : 'all';
      const startDateRaw = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
      const endDateRaw = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;

      const filters: any = {};
      if (typeof req.query.userId === 'string') filters.userId = req.query.userId;
      if (typeof req.query.propertyId === 'string') { const n = parseInt(req.query.propertyId); if (Number.isFinite(n)) filters.propertyId = n; }
      if (typeof req.query.taskId === 'string') { const n = parseInt(req.query.taskId); if (Number.isFinite(n)) filters.taskId = n; }
      if (startDateRaw) filters.startDate = startDateRaw;
      if (endDateRaw) filters.endDate = `${endDateRaw}T23:59:59.999Z`;

      const allEntries: any[] = await storage.getTimeEntries(orgId, filters);
      const entries = allEntries.filter((e: any) => {
        if (billableFilterQ === 'billable') return e.isBillable === true;
        if (billableFilterQ === 'nonbillable') return e.isBillable === false;
        return true;
      });

      const [allUsers, allProperties] = await Promise.all([
        storage.getUsersByOrg(orgId),
        storage.getProperties(true, orgId),
      ]);
      const userMap = new Map<string, string>(
        allUsers.map((u: any) => [u.id, `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || u.id])
      );
      const propertyMap = new Map<number, string>(
        allProperties.map((p: any) => [p.id, p.name])
      );

      const computeH = (e: any) => {
        const ms = Math.max(0, (e.clockOut ? new Date(e.clockOut) : new Date()).getTime() - new Date(e.clockIn).getTime());
        return ms / 3600000;
      };

      type PBucket = { key: string; label: string; totalHours: number; billableHours: number; nonBillableHours: number; billableAmountCents: number; entryCount: number; totalMileage: number; breakdown: Map<string, PBucket> };
      const mb = (key: string, label: string): PBucket => ({ key, label, totalHours: 0, billableHours: 0, nonBillableHours: 0, billableAmountCents: 0, entryCount: 0, totalMileage: 0, breakdown: new Map() });

      const groups = new Map<string, PBucket>();
      const userWeekHours = new Map<string, Map<string, number>>();
      const getWK = (d: Date) => { const x = new Date(d); const day = x.getDay(); x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day)); return x.toISOString().slice(0, 10); };
      let th = 0, bh = 0, nbh = 0, bac = 0, tm = 0;

      for (const e of entries) {
        const h = computeH(e), bil = e.isBillable !== false, ac = bil && e.billableRateCents ? Math.round(e.billableRateCents * h) : 0, mi = e.mileage ?? 0;
        th += h; if (bil) bh += h; else nbh += h; bac += ac; tm += mi;
        const wk = getWK(new Date(e.clockIn));
        if (!userWeekHours.has(e.userId)) userWeekHours.set(e.userId, new Map());
        const wm = userWeekHours.get(e.userId)!; wm.set(wk, (wm.get(wk) ?? 0) + h);
        const pk = groupBy === 'user' ? (e.userId || 'x') : (e.propertyId ? String(e.propertyId) : 'x');
        const pl = groupBy === 'user' ? (userMap.get(e.userId) || 'Unknown') : (e.propertyId ? (propertyMap.get(e.propertyId) || `#${e.propertyId}`) : '(No Property)');
        let g = groups.get(pk); if (!g) { g = mb(pk, pl); groups.set(pk, g); }
        g.totalHours += h; if (bil) g.billableHours += h; else g.nonBillableHours += h; g.billableAmountCents += ac; g.entryCount++; g.totalMileage += mi;
        const sk = groupBy === 'user' ? (e.propertyId ? String(e.propertyId) : 'x') : (e.userId || 'x');
        const sl = groupBy === 'user' ? (e.propertyId ? (propertyMap.get(e.propertyId) || `#${e.propertyId}`) : '(No Property)') : (userMap.get(e.userId) || 'Unknown');
        let sub = g.breakdown.get(sk); if (!sub) { sub = mb(sk, sl); g.breakdown.set(sk, sub); }
        sub.totalHours += h; if (bil) sub.billableHours += h; else sub.nonBillableHours += h; sub.billableAmountCents += ac; sub.entryCount++;
      }

      const overFlags = new Map<string, boolean>();
      for (const [uid, wm] of userWeekHours) overFlags.set(uid, Array.from(wm.values()).some((v) => v > 40));

      const dateRange = [startDateRaw, endDateRaw].filter(Boolean).join(' – ') || 'All dates';
      const billableFilter = billableFilterQ === 'billable' ? 'Billable Only' : billableFilterQ === 'nonbillable' ? 'Non-Billable Only' : 'All';

      const { generateLiveTimeReportPdf } = await import("./pdfGenerators/timeReportPdf.js");
      const reportData = {
        groupBy: groupBy as "user" | "property",
        dateRange,
        billableFilter,
        totals: { totalHours: th, billableHours: bh, nonBillableHours: nbh, billableAmountCents: bac, activeUsers: 0, activeProperties: 0, entryCount: entries.length, totalMileage: tm },
        groups: Array.from(groups.values()).sort((a, b) => b.totalHours - a.totalHours).map((g) => ({
          key: g.key, label: g.label,
          totalHours: g.totalHours, billableHours: g.billableHours, nonBillableHours: g.nonBillableHours,
          billableAmountCents: g.billableAmountCents, entryCount: g.entryCount, totalMileage: g.totalMileage,
          overtimeFlag: groupBy === 'user' ? (overFlags.get(g.key) ?? false) : false,
          breakdown: Array.from(g.breakdown.values()).sort((a, b) => b.totalHours - a.totalHours).map((s) => ({
            key: s.key, label: s.label, totalHours: s.totalHours, billableHours: s.billableHours,
            nonBillableHours: s.nonBillableHours, billableAmountCents: s.billableAmountCents, entryCount: s.entryCount,
          })),
        })),
      };

      const buf = await generateLiveTimeReportPdf(reportData);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="time-report-${startDateRaw ?? 'all'}-to-${endDateRaw ?? 'all'}.pdf"`);
      res.send(buf);
    } catch (error) {
      console.error("Error generating live time report PDF:", error);
      res.status(500).json({ message: "Failed to generate time report PDF" });
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

  app.get("/api/time-entries/missing-clockout", isAuthenticated, requireFeatureFlag("task_cost_tracking"), async (req: any, res) => {
    try {
      const user = req.user;
      const orgId = user.claims?.orgId || user.orgId;
      const role = user.claims?.role || user.role;
      const canViewAll = role === 'admin' || role === 'supervisor';
      const userId = user.claims?.sub || user.id;
      const thresholdHours = 12;
      const cutoff = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);

      const allEntries = await storage.getTimeEntries(orgId);
      const missing = allEntries.filter((entry: any) =>
        !entry.clockOut &&
        new Date(entry.clockIn) < cutoff &&
        (canViewAll || entry.userId === userId)
      );

      res.json({ count: missing.length, thresholdHours, entries: missing });
    } catch (error) {
      console.error("Error fetching missing clock-outs:", error);
      res.status(500).json({ message: "Failed to fetch missing clock-outs" });
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
      const user = req.user;
      const userId = user.claims?.sub || user.id;
      const orgId = user.claims?.orgId || user.orgId;
      
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID is required" });
      }

      // Check if user already has an active time entry
      const activeEntry = await storage.getActiveTimeEntry(userId);
      if (activeEntry) {
        return res.status(400).json({ message: "You already have an active time entry. Please clock out first." });
      }

      const { propertyId, taskId, notes, workType, mileage, isBillable } = req.body;

      let billableRate: number | null = null;

      // If taskId is provided, fetch the task's billable rate
      if (taskId) {
        const task = await storage.getTask(parseInt(taskId));
        if (task && task.billableRateCents) {
          billableRate = task.billableRateCents;
        }
      }

      // Default isBillable to true for client time; frontend sends explicit boolean
      const isBillableVal = typeof isBillable === 'boolean' ? isBillable : true;

      const entryData = {
        userId,
        orgId,
        clockIn: new Date(),
        propertyId: propertyId ? parseInt(propertyId) : null,
        taskId: taskId ? parseInt(taskId) : null,
        notes: notes || null,
        billableRateCents: billableRate,
        isBillable: isBillableVal,
        workType: workType || null,
        mileage: mileage != null ? parseInt(mileage) : null,
        status: 'draft',
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

  // Submit a time entry for manager approval (staff action)
  app.post("/api/time-entries/:id/submit", isAuthenticated, requireFeatureFlag("task_cost_tracking"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      const entry = await storage.getTimeEntry(id);
      if (!entry) return res.status(404).json({ message: "Time entry not found" });

      // Only the entry owner can submit (admins can approve directly)
      if (entry.userId !== userId) {
        return res.status(403).json({ message: "You can only submit your own time entries" });
      }

      if ((entry as any).status === 'approved') {
        return res.status(400).json({ message: "Approved entries cannot be re-submitted" });
      }

      if (!(entry as any).clockOut) {
        return res.status(400).json({ message: "Cannot submit an active (clocked-in) entry" });
      }

      const updatedEntry = await storage.updateTimeEntry(id, { status: 'pending_approval' } as any);
      res.json(updatedEntry);
    } catch (error) {
      console.error("Error submitting time entry:", error);
      res.status(500).json({ message: "Failed to submit time entry" });
    }
  });

  // Bulk approve / reject time entries (admin/supervisor action)
  app.post("/api/time-entries/bulk-action", isAuthenticated, requireFeatureFlag("task_cost_tracking"), async (req: any, res) => {
    try {
      const user = req.user;
      const role = user.claims?.role || user.role;
      const canManage = role === 'admin' || role === 'supervisor';
      if (!canManage) return res.status(403).json({ message: "Only admins and supervisors can approve or reject entries" });

      const { action, ids, rejectionNote } = req.body as { action: 'approve' | 'reject'; ids: number[]; rejectionNote?: string };
      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ message: "action must be 'approve' or 'reject'" });
      }
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "ids must be a non-empty array" });
      }

      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      const results: any[] = [];

      for (const id of ids) {
        const entry = await storage.getTimeEntry(id);
        if (!entry) continue;
        if ((entry as any).status === 'approved' && action === 'approve') {
          results.push({ id, skipped: true, reason: 'already approved' });
          continue;
        }
        const updates: any = { status: newStatus };
        if (action === 'reject' && rejectionNote) updates.notes = rejectionNote;
        const updated = await storage.updateTimeEntry(id, updates);
        results.push(updated);
      }

      res.json({ success: true, action, count: results.length, results });
    } catch (error) {
      console.error("Error performing bulk action on time entries:", error);
      res.status(500).json({ message: "Failed to perform bulk action" });
    }
  });

  // Generate a draft client invoice from approved time entries (Phase 2)
  app.post("/api/time-entries/generate-invoice", isAuthenticated, requireFeatureFlag("task_cost_tracking"), async (req: any, res) => {
    try {
      const user = req.user;
      const orgId = user.claims?.orgId || user.orgId;
      const role = user.claims?.role || user.role;
      const canManage = role === 'admin' || role === 'supervisor';
      if (!canManage) return res.status(403).json({ message: "Only admins and supervisors can generate invoices" });

      const { timeEntryIds, clientId, notes } = req.body as { timeEntryIds: number[]; clientId: string; notes?: string };
      if (!Array.isArray(timeEntryIds) || timeEntryIds.length === 0) {
        return res.status(400).json({ message: "timeEntryIds must be a non-empty array" });
      }
      if (!clientId) return res.status(400).json({ message: "clientId is required" });

      // Fetch and validate entries
      const validEntries: any[] = [];
      for (const id of timeEntryIds) {
        const entry = await storage.getTimeEntry(id);
        if (!entry) continue;
        if ((entry as any).orgId !== orgId) continue;
        if ((entry as any).status !== 'approved') continue;
        if (!entry.clockOut) continue;
        validEntries.push(entry);
      }

      if (validEntries.length === 0) {
        return res.status(400).json({ message: "No valid approved time entries found" });
      }

      // Build line items from entries
      let totalAmountCents = 0;
      const lineItems = validEntries.map((e: any) => {
        const hours = Math.max(0, (new Date(e.clockOut).getTime() - new Date(e.clockIn).getTime()) / 3600000);
        const rate = e.billableRateCents ?? 0;
        const total = Math.round(rate * hours);
        totalAmountCents += total;
        const desc = [e.workType, e.notes].filter(Boolean).join(' — ') || 'Time Entry';
        return {
          description: `${desc} (${hours.toFixed(2)}h @ $${(rate / 100).toFixed(2)}/hr)`,
          quantity: Math.round(hours * 100) / 100,
          unitAmountCents: rate,
          totalCents: total,
        };
      });

      // Find the client record for this contact
      // clientId from the frontend is the contacts table integer id (as a string)
      const clients = await storage.getClients(orgId);
      const client = clients.find((c: any) =>
        String(c.contactId) === String(clientId) || c.id === clientId
      );
      if (!client) {
        return res.status(404).json({ message: "Client not found. Make sure this contact has been set up as a client." });
      }

      const invoiceData = {
        orgId,
        clientId: client.id,
        amountCents: totalAmountCents,
        currency: 'usd',
        status: 'draft' as const,
        lineItems,
        description: notes || `Time entries for ${validEntries.length} entr${validEntries.length === 1 ? 'y' : 'ies'}`,
        createdBy: user.claims?.sub || user.id,
      };

      const invoice = await storage.createClientInvoice(invoiceData as any);
      res.status(201).json({ invoice, entryCount: validEntries.length, totalAmountCents });
    } catch (error) {
      console.error("Error generating invoice from time entries:", error);
      res.status(500).json({ message: "Failed to generate invoice" });
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

      // Approved entries are locked — no edits allowed
      if ((entry as any).status === 'approved') {
        return res.status(403).json({ message: "Approved entries are locked and cannot be edited" });
      }

      // Check if user has permission to fully edit time entries
      const userRole = user.claims?.role || user.role;
      const canFullyEdit = userRole === 'admin' || userRole === 'supervisor';
      const userId = user.claims?.sub || user.id;

      // Staff can only edit their own entries
      if (!canFullyEdit && entry.userId !== userId) {
        return res.status(403).json({ message: "You can only edit your own time entries" });
      }

      const updates: any = {};
      
      // Everyone can edit: notes, workType, mileage, billable rate, isBillable
      if (req.body.notes !== undefined) updates.notes = req.body.notes;
      if (req.body.billableRateCents !== undefined) updates.billableRateCents = req.body.billableRateCents;
      if (req.body.workType !== undefined) updates.workType = req.body.workType || null;
      if (req.body.mileage !== undefined) updates.mileage = req.body.mileage != null ? parseInt(req.body.mileage) : null;
      if (typeof req.body.isBillable === 'boolean') updates.isBillable = req.body.isBillable;

      // Only admins and supervisors can edit all other fields
      if (canFullyEdit) {
        if (req.body.clockIn !== undefined) updates.clockIn = req.body.clockIn;
        if (req.body.clockOut !== undefined) updates.clockOut = req.body.clockOut;
        if (req.body.userId !== undefined) updates.userId = req.body.userId;
        if (req.body.propertyId !== undefined) updates.propertyId = req.body.propertyId ? parseInt(req.body.propertyId) : null;
        if (req.body.taskId !== undefined) updates.taskId = req.body.taskId ? parseInt(req.body.taskId) : null;
      }

      // If editing a rejected entry, move it back to draft
      if ((entry as any).status === 'rejected' && Object.keys(updates).length > 0) {
        updates.status = 'draft';
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
      const orgId = (req as any).user?.claims?.orgId || (req as any).user?.orgId;
      const contacts = await storage.getContacts(includeInactive, orgId);
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
      const orgId = req.user.claims?.orgId || req.user.orgId;
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
      <p class="footer-text" style="font-size:12px;color:#999999;margin-top:8px;">Hubify · [ADD MAILING ADDRESS] · [City, FL ZIP] · <a href="https://hubify.com/privacy" style="color:#999999;">Privacy Policy</a></p>
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
  app.get("/api/search", isAuthenticated, async (req: any, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      const orgId = req.user.claims?.orgId || req.user.orgId;
      const results = await storage.globalSearch(q, orgId);
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

  // ── Org-ownership guard ──────────────────────────────────────────────────
  // Every authenticated request to /api/orgs/:orgId/* must belong to the
  // signed-in user's own organisation.  Super-admin sessions are exempt so
  // they can manage any org via the super-admin panel.
  app.use('/api/orgs/:orgId', (req: any, res: any, next: any) => {
    if (!req.user) return next(); // unauthenticated — let isAuthenticated handle 401
    const orgId = req.params.orgId;
    const userOrgId = req.user?.claims?.orgId || req.user?.orgId;
    const isSuperAdmin =
      (req.session as any)?.superAdmin?.authenticated === true ||
      req.user?.claims?.role === 'super_admin' ||
      req.user?.role === 'super_admin';
    if (!isSuperAdmin && userOrgId !== orgId) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  });

  // Organization and Branding routes
  app.get("/api/orgs/:orgId", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const userOrgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
      
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

  app.get("/api/orgs/:orgId/audit-logs", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.params.orgId;
      const userOrgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
      const userRole = req.user?.claims?.role;
      if (userOrgId !== orgId) return res.status(403).json({ message: "Access denied" });
      if (!["admin", "manager"].includes(userRole)) return res.status(403).json({ message: "Admin access required" });
      const { securityAuditLogs } = await import("@shared/schema");
      const { desc, eq } = await import("drizzle-orm");
      const logs = await db
        .select({
          id: securityAuditLogs.id,
          userEmail: securityAuditLogs.userEmail,
          action: securityAuditLogs.action,
          actionType: securityAuditLogs.actionType,
          resource: securityAuditLogs.resource,
          severity: securityAuditLogs.severity,
          success: securityAuditLogs.success,
          ipAddress: securityAuditLogs.ipAddress,
          createdAt: securityAuditLogs.createdAt,
        })
        .from(securityAuditLogs)
        .where(eq(securityAuditLogs.orgId, orgId))
        .orderBy(desc(securityAuditLogs.createdAt))
        .limit(100);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching org audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  app.patch("/api/orgs/:orgId", isAuthenticated, async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const userOrgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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
      const callerOrgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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
      const userOrgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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
      const userOrgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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
      const userOrgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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
      if (userOrgId !== orgId) {
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

      const callerOrgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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

      const callerOrgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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

      const callerOrgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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
      
      // Fetch tasks and properties scoped to this org
      const [allTasks, orgPropertiesList] = await Promise.all([
        storage.getTasks(orgId),
        storage.getProperties(true, orgId),
      ]);
      const orgTasks = allTasks.filter(task =>
        task.property?.id &&
        task.dueDate &&
        !task.isArchived &&
        task.status !== 'completed' &&
        task.status !== 'cancelled'
      );
      const propertyIds = new Set(orgPropertiesList.map(p => p.id));
      
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
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
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
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
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
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
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
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
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
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
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
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
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
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
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
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
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
      const userOrgId = (req.user as any)?.claims?.orgId || (req.user as any)?.orgId;
      const userRole = (req.user as any)?.claims?.role || (req.user as any)?.role;

      if (userOrgId !== orgId && userRole !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const connection = await storage.getOrgStripeConnection(orgId);

      if (connection) {
        // Strip secrets; expose booleans so the frontend knows what's configured
        const { stripeSecretKey, accessToken, refreshToken, stripeWebhookSecret, ...safeConnection } = connection;
        res.json({
          ...safeConnection,
          hasWebhookSecret: !!stripeWebhookSecret,
          encryptionEnabled: (await import("./encryption")).isEncryptionEnabled(),
        });
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
      const userOrgId = (req.user as any)?.claims?.orgId || (req.user as any)?.orgId;
      const userRole = (req.user as any)?.claims?.role || (req.user as any)?.role;
      const userEmail = (req.user as any)?.claims?.email || (req.user as any)?.email || "";

      if (userOrgId !== orgId && userRole !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { accountType, stripePublishableKey, stripeSecretKey } = req.body;

      if (accountType === "direct") {
        const { encrypt } = await import("./encryption");
        const connection = await storage.createOrgStripeConnection({
          orgId,
          accountType: "direct",
          stripePublishableKey,
          stripeSecretKey: stripeSecretKey ? encrypt(stripeSecretKey) : undefined,
          isActive: true,
        });

        const { stripeSecretKey: _, ...safeConnection } = connection;
        res.status(201).json(safeConnection);
      } else if (accountType === "connect") {
        const org = await storage.getOrg(orgId);
        if (!org) return res.status(404).json({ message: "Organization not found" });

        const { createStripeConnectAccount } = await import("./stripe");
        const account = await createStripeConnectAccount(orgId, org.name, userEmail);
        res.status(201).json({ accountId: account.id });
      } else {
        res.status(400).json({ message: "Invalid account type" });
      }
    } catch (error) {
      console.error("Error creating Stripe connection:", error);
      res.status(500).json({ message: "Failed to create Stripe connection" });
    }
  });

  // PATCH — update individual fields (webhook secret, etc.) without re-creating the whole connection
  app.patch("/api/orgs/:orgId/stripe-connection", isAuthenticated, async (req, res) => {
    try {
      const { orgId } = req.params;
      const userOrgId = (req.user as any)?.claims?.orgId || (req.user as any)?.orgId;
      const userRole = (req.user as any)?.claims?.role || (req.user as any)?.role;

      if (userOrgId !== orgId && userRole !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { stripeWebhookSecret } = req.body;
      const updates: Record<string, any> = {};

      if (typeof stripeWebhookSecret !== "undefined") {
        updates.stripeWebhookSecret = stripeWebhookSecret || null;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }

      // Upsert: update if exists, create a minimal record if not
      let existing = await storage.getOrgStripeConnection(orgId);
      let connection;
      if (existing) {
        connection = await storage.updateOrgStripeConnection(orgId, updates);
      } else {
        connection = await storage.createOrgStripeConnection({ orgId, accountType: "direct", isActive: false, ...updates } as any);
      }

      if (!connection) {
        return res.status(500).json({ message: "Failed to save connection" });
      }

      const { stripeSecretKey, accessToken, refreshToken, stripeWebhookSecret: secret, ...safeConnection } = connection;
      res.json({ ...safeConnection, hasWebhookSecret: !!secret });
    } catch (error) {
      console.error("Error updating Stripe connection:", error);
      res.status(500).json({ message: "Failed to update Stripe connection" });
    }
  });

  app.delete("/api/orgs/:orgId/stripe-connection", isAuthenticated, async (req, res) => {
    try {
      const { orgId } = req.params;
      const userOrgId = (req.user as any)?.claims?.orgId || (req.user as any)?.orgId;
      const userRole = (req.user as any)?.claims?.role || (req.user as any)?.role;

      if (userOrgId !== orgId && userRole !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteOrgStripeConnection(orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting Stripe connection:", error);
      res.status(500).json({ message: "Failed to delete Stripe connection" });
    }
  });

  // Returns whether this org is payment-ready (used by admin invoice list for the warning banner)
  app.get("/api/orgs/:orgId/payment-readiness", isAuthenticated, async (req, res) => {
    try {
      const { orgId } = req.params;
      const userOrgId = (req.user as any)?.claims?.orgId || (req.user as any)?.orgId;
      const userRole = (req.user as any)?.claims?.role || (req.user as any)?.role;

      if (userOrgId !== orgId && userRole !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const connection = await storage.getOrgStripeConnection(orgId);
      const webhookConfigured =
        !!(connection?.stripeWebhookSecret) ||
        !!(process.env[`STRIPE_ORG_WEBHOOK_SECRET_${orgId}`]) ||
        !!(process.env.STRIPE_ORG_WEBHOOK_SECRET);

      res.json({
        stripeConnected: !!(connection?.isActive),
        webhookConfigured,
        accountType: connection?.accountType ?? null,
      });
    } catch (error) {
      console.error("Error checking payment readiness:", error);
      res.status(500).json({ message: "Failed to check payment readiness" });
    }
  });

  app.get("/api/orgs/:orgId/beta-checklist", isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      const user = req.user as any;
      const userOrgId = user?.claims?.orgId || user?.orgId;
      const userRole = user?.claims?.role || user?.role;
      if (userOrgId !== orgId && userRole !== "admin" && userRole !== "super_admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const [org, properties, contacts, invitations, stripeConnection, allTasks, allInvoices] = await Promise.all([
        storage.getOrganization(orgId),
        storage.getProperties(true, orgId),
        storage.getContacts(true, orgId),
        storage.getPortalInvitationsByOrg(orgId),
        storage.getOrgStripeConnection(orgId),
        storage.getTasks(orgId),
        storage.getClientInvoices(orgId),
      ]);

      if (!org) return res.status(404).json({ message: "Organization not found" });

      const branding = (org.branding as any) ?? {};

      const items = [
        {
          key: "profile",
          label: "Complete company profile",
          description: "Add your phone number and address so clients can reach you.",
          done: !!(org.phone && (org.city || (org as any).address1)),
          href: "/account?tab=company",
          icon: "Building2",
        },
        {
          key: "logo",
          label: "Upload your logo",
          description: "Add your company logo for a professional branded experience.",
          done: !!branding.logo,
          href: "/account?tab=branding",
          icon: "Image",
        },
        {
          key: "branding",
          label: "Configure portal branding",
          description: "Set your brand colors so clients see your identity in the portal.",
          done: !!branding.primaryColor,
          href: "/account?tab=branding",
          icon: "Palette",
        },
        {
          key: "stripe",
          label: "Connect Stripe",
          description: "Accept online payments directly from clients.",
          done: !!(stripeConnection?.isActive),
          href: "/settings/stripe",
          icon: "CreditCard",
        },
        {
          key: "webhook",
          label: "Configure payment webhooks",
          description: "Receive real-time payment status updates in Hubify.",
          done: !!(stripeConnection?.stripeWebhookSecret) || !!(process.env.STRIPE_ORG_WEBHOOK_SECRET),
          href: "/settings/stripe",
          icon: "Webhook",
        },
        {
          key: "property",
          label: "Add your first property",
          description: "Create the first property in your managed portfolio.",
          done: properties.length > 0,
          href: "/properties",
          icon: "Home",
        },
        {
          key: "contact",
          label: "Add your first client",
          description: "Add an owner, tenant, or client contact.",
          done: contacts.length > 0,
          href: "/people",
          icon: "Users",
        },
        {
          key: "invitation",
          label: "Send a portal invitation",
          description: "Invite a client to view their property portal.",
          done: invitations.length > 0,
          href: "/hubify-console",
          icon: "Mail",
        },
        {
          key: "inspection",
          label: "Complete your first inspection",
          description: "Run a property inspection task with a checklist.",
          done: allTasks.some((t: any) => t.category === "inspection" && t.status === "completed"),
          href: "/tasks",
          icon: "ClipboardCheck",
        },
        {
          key: "invoice",
          label: "Send your first invoice",
          description: "Create and send an invoice to a client.",
          done: allInvoices.some((inv: any) => inv.sentAt != null || inv.status === "open" || inv.status === "paid"),
          href: "/invoices/clients",
          icon: "FileText",
        },
      ];

      const completedCount = items.filter(i => i.done).length;
      const total = items.length;
      const percentage = Math.round((completedCount / total) * 100);
      const nextItem = items.find(i => !i.done) ?? null;
      const isComplete = completedCount === total;

      res.json({ items, completedCount, total, percentage, nextItem, isComplete });
    } catch (error) {
      console.error("Error fetching beta checklist:", error);
      res.status(500).json({ message: "Failed to fetch beta checklist" });
    }
  });

  app.post("/api/orgs/:orgId/stripe-connect/account-link", isAuthenticated, async (req, res) => {
    try {
      const { orgId } = req.params;
      const userOrgId = (req.user as any)?.claims?.orgId || (req.user as any)?.orgId;
      const userRole = (req.user as any)?.claims?.role || (req.user as any)?.role;
      const userEmail = (req.user as any)?.claims?.email || (req.user as any)?.email || "";

      if (userOrgId !== orgId && userRole !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { createStripeConnectAccount, createStripeConnectAccountLink } = await import("./stripe");

      // Auto-create the Connect account if one doesn't exist yet
      let connection = await storage.getOrgStripeConnection(orgId);
      let stripeAccountId = connection?.stripeAccountId;

      if (!stripeAccountId) {
        const org = await storage.getOrg(orgId);
        if (!org) return res.status(404).json({ message: "Organization not found" });
        const account = await createStripeConnectAccount(orgId, org.name, userEmail);
        stripeAccountId = account.id;
      }

      // Build return/refresh URLs from the request host so they always match the deployment
      const host = `${req.protocol}://${req.get("host")}`;
      const returnUrl = `${host}/api/orgs/${orgId}/stripe-connect/return`;
      const refreshUrl = `${host}/api/orgs/${orgId}/stripe-connect/refresh`;

      const accountLink = await createStripeConnectAccountLink(stripeAccountId, returnUrl, refreshUrl);
      res.json(accountLink);
    } catch (error) {
      console.error("Error creating account link:", error);
      res.status(500).json({ message: "Failed to create account link" });
    }
  });

  // GET /api/orgs/:orgId/stripe-connect/return
  // Stripe redirects here after the user completes (or cancels) the Connect onboarding flow.
  // We retrieve the account, flip isActive if charges are enabled, then redirect to the settings page.
  app.get("/api/orgs/:orgId/stripe-connect/return", async (req, res) => {
    const { orgId } = req.params;
    try {
      const connection = await storage.getOrgStripeConnection(orgId);
      if (!connection?.stripeAccountId) {
        console.warn("[stripe-connect/return] No connection found for org", orgId);
        return res.redirect(`/settings/stripe?error=no_connection`);
      }

      const { getMasterStripe } = await import("./stripe");
      const stripe = getMasterStripe();
      if (!stripe) {
        console.warn("[stripe-connect/return] Master Stripe not configured");
        return res.redirect(`/settings/stripe?error=stripe_not_configured`);
      }

      const account = await stripe.accounts.retrieve(connection.stripeAccountId);
      const isReady = account.charges_enabled || account.details_submitted;

      if (isReady) {
        await storage.updateOrgStripeConnection(orgId, { isActive: true } as any);
        console.log(`[stripe-connect/return] org=${orgId} account=${account.id} activated (charges_enabled=${account.charges_enabled})`);
        return res.redirect(`/settings/stripe?connected=true`);
      } else {
        // Account created but not yet fully onboarded — send them back to finish
        console.log(`[stripe-connect/return] org=${orgId} account=${account.id} not yet ready — redirecting to refresh`);
        return res.redirect(`/api/orgs/${orgId}/stripe-connect/refresh`);
      }
    } catch (err: any) {
      console.error("[stripe-connect/return] Error:", err?.message ?? err);
      return res.redirect(`/settings/stripe?error=server_error`);
    }
  });

  // GET /api/orgs/:orgId/stripe-connect/refresh
  // Stripe redirects here when the account link has expired (user took too long).
  // We generate a fresh account link and redirect the user back to Stripe.
  app.get("/api/orgs/:orgId/stripe-connect/refresh", async (req, res) => {
    const { orgId } = req.params;
    try {
      const connection = await storage.getOrgStripeConnection(orgId);
      if (!connection?.stripeAccountId) {
        return res.redirect(`/settings/stripe?error=no_connection`);
      }

      const { createStripeConnectAccountLink, getMasterStripe } = await import("./stripe");
      const stripe = getMasterStripe();
      if (!stripe) {
        return res.redirect(`/settings/stripe?error=stripe_not_configured`);
      }

      const host = `${req.protocol}://${req.get("host")}`;
      const returnUrl = `${host}/api/orgs/${orgId}/stripe-connect/return`;
      const refreshUrl = `${host}/api/orgs/${orgId}/stripe-connect/refresh`;

      const accountLink = await createStripeConnectAccountLink(connection.stripeAccountId, returnUrl, refreshUrl);
      return res.redirect(accountLink.url);
    } catch (err: any) {
      console.error("[stripe-connect/refresh] Error:", err?.message ?? err);
      return res.redirect(`/account?tab=stripe&connect=error&reason=server_error`);
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
      const userOrgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
      
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
      const userOrgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
      
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

  // ── Organization Service Catalog ─────────────────────────────────────────────
  {
    const { organizationServices, insertOrganizationServiceSchema } = await import("@shared/schema");
    const { eq, and, desc, sql: sqlFn } = await import("drizzle-orm");

    app.get("/api/admin/services", isAuthenticated, isAdmin, async (req: any, res) => {
      try {
        const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
        if (!orgId) return res.status(403).json({ message: "No organization context" });
        const services = await db
          .select({
            id: organizationServices.id,
            orgId: organizationServices.orgId,
            name: organizationServices.name,
            description: organizationServices.description,
            category: organizationServices.category,
            defaultPriceCents: organizationServices.defaultPriceCents,
            billingFrequency: organizationServices.billingFrequency,
            isBillable: organizationServices.isBillable,
            createsTasks: organizationServices.createsTasks,
            defaultTaskCategory: organizationServices.defaultTaskCategory,
            recurrenceRule: organizationServices.recurrenceRule,
            estimatedDurationMinutes: organizationServices.estimatedDurationMinutes,
            isActive: organizationServices.isActive,
            createdAt: organizationServices.createdAt,
            updatedAt: organizationServices.updatedAt,
            assignedPropertyCount: sqlFn<number>`(
              SELECT COUNT(DISTINCT property_id)::int
              FROM property_service_assignments
              WHERE service_id = ${organizationServices.id}
              AND status = 'active'
            )`,
          })
          .from(organizationServices)
          .where(eq(organizationServices.orgId, orgId))
          .orderBy(desc(organizationServices.createdAt));
        res.json(services);
      } catch (err) {
        console.error("GET /api/admin/services error:", err);
        res.status(500).json({ message: "Failed to fetch services" });
      }
    });

    app.post("/api/admin/services", isAuthenticated, isAdmin, async (req: any, res) => {
      try {
        const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
        if (!orgId) return res.status(403).json({ message: "No organization context" });
        const parsed = insertOrganizationServiceSchema.safeParse({ ...req.body, orgId });
        if (!parsed.success) return res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
        const [created] = await db
          .insert(organizationServices)
          .values(parsed.data)
          .returning();
        res.status(201).json(created);
      } catch (err) {
        console.error("POST /api/admin/services error:", err);
        res.status(500).json({ message: "Failed to create service" });
      }
    });

    app.patch("/api/admin/services/:id", isAuthenticated, isAdmin, async (req: any, res) => {
      try {
        const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
        const serviceId = parseInt(req.params.id, 10);
        if (!orgId) return res.status(403).json({ message: "No organization context" });
        const [existing] = await db
          .select()
          .from(organizationServices)
          .where(and(eq(organizationServices.id, serviceId), eq(organizationServices.orgId, orgId)));
        if (!existing) return res.status(404).json({ message: "Service not found" });
        const allowedFields = ["name", "description", "category", "defaultPriceCents", "billingFrequency",
          "isBillable", "createsTasks", "defaultTaskCategory", "recurrenceRule", "estimatedDurationMinutes", "isActive"];
        const updates: Record<string, any> = { updatedAt: new Date() };
        for (const key of allowedFields) {
          if (req.body[key] !== undefined) updates[key] = req.body[key];
        }
        const [updated] = await db
          .update(organizationServices)
          .set(updates)
          .where(and(eq(organizationServices.id, serviceId), eq(organizationServices.orgId, orgId)))
          .returning();
        res.json(updated);
      } catch (err) {
        console.error("PATCH /api/admin/services/:id error:", err);
        res.status(500).json({ message: "Failed to update service" });
      }
    });

    app.delete("/api/admin/services/:id", isAuthenticated, isAdmin, async (req: any, res) => {
      try {
        const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
        const serviceId = parseInt(req.params.id, 10);
        if (!orgId) return res.status(403).json({ message: "No organization context" });
        const [existing] = await db
          .select()
          .from(organizationServices)
          .where(and(eq(organizationServices.id, serviceId), eq(organizationServices.orgId, orgId)));
        if (!existing) return res.status(404).json({ message: "Service not found" });
        // Soft delete: set isActive = false
        const [updated] = await db
          .update(organizationServices)
          .set({ isActive: false, updatedAt: new Date() })
          .where(and(eq(organizationServices.id, serviceId), eq(organizationServices.orgId, orgId)))
          .returning();
        res.json({ message: "Service deactivated", service: updated });
      } catch (err) {
        console.error("DELETE /api/admin/services/:id error:", err);
        res.status(500).json({ message: "Failed to deactivate service" });
      }
    });
  }

  // ── Property Service Assignments ─────────────────────────────────────────────
  {
    const {
      propertyServiceAssignments,
      organizationServices: orgSvcTable,
      properties: propertiesTable,
      contacts: contactsTable,
      insertPropertyServiceAssignmentSchema,
    } = await import("@shared/schema");
    const { eq, and, desc, sql: sqlFn2 } = await import("drizzle-orm");

    // GET /api/properties/:propertyId/service-assignments — list with joined service data
    app.get("/api/properties/:propertyId/service-assignments", isAuthenticated, async (req: any, res) => {
      try {
        const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
        const propertyId = parseInt(req.params.propertyId, 10);
        if (!orgId) return res.status(403).json({ message: "No organization context" });
        const assignments = await db
          .select({
            id: propertyServiceAssignments.id,
            orgId: propertyServiceAssignments.orgId,
            propertyId: propertyServiceAssignments.propertyId,
            serviceId: propertyServiceAssignments.serviceId,
            clientContactId: propertyServiceAssignments.clientContactId,
            startDate: propertyServiceAssignments.startDate,
            endDate: propertyServiceAssignments.endDate,
            customPriceCents: propertyServiceAssignments.customPriceCents,
            billingFrequencyOverride: propertyServiceAssignments.billingFrequencyOverride,
            status: propertyServiceAssignments.status,
            visibleToPortal: propertyServiceAssignments.visibleToPortal,
            notes: propertyServiceAssignments.notes,
            createdAt: propertyServiceAssignments.createdAt,
            updatedAt: propertyServiceAssignments.updatedAt,
            serviceName: orgSvcTable.name,
            serviceCategory: orgSvcTable.category,
            serviceDefaultPriceCents: orgSvcTable.defaultPriceCents,
            serviceBillingFrequency: orgSvcTable.billingFrequency,
            serviceIsBillable: orgSvcTable.isBillable,
            clientContactName: sqlFn2<string | null>`(
              SELECT CONCAT(first_name, ' ', last_name)
              FROM contacts
              WHERE id = ${propertyServiceAssignments.clientContactId}
              AND org_id = ${orgId}
            )`,
          })
          .from(propertyServiceAssignments)
          .innerJoin(orgSvcTable, eq(propertyServiceAssignments.serviceId, orgSvcTable.id))
          .where(
            and(
              eq(propertyServiceAssignments.propertyId, propertyId),
              eq(propertyServiceAssignments.orgId, orgId),
            )
          )
          .orderBy(desc(propertyServiceAssignments.createdAt));
        res.json(assignments);
      } catch (err) {
        console.error("GET /api/properties/:propertyId/service-assignments error:", err);
        res.status(500).json({ message: "Failed to fetch service assignments" });
      }
    });

    // POST /api/properties/:propertyId/service-assignments — create
    app.post("/api/properties/:propertyId/service-assignments", isAuthenticated, isAdmin, async (req: any, res) => {
      try {
        const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
        const propertyId = parseInt(req.params.propertyId, 10);
        if (!orgId) return res.status(403).json({ message: "No organization context" });
        // Verify property belongs to caller's org
        const [property] = await db
          .select()
          .from(propertiesTable)
          .where(and(eq(propertiesTable.id, propertyId), eq(propertiesTable.orgId, orgId)));
        if (!property) return res.status(404).json({ message: "Property not found" });
        // Verify service belongs to same org
        const [service] = await db
          .select()
          .from(orgSvcTable)
          .where(and(eq(orgSvcTable.id, req.body.serviceId), eq(orgSvcTable.orgId, orgId)));
        if (!service) return res.status(404).json({ message: "Service not found in your catalog" });
        // Verify contact (if provided) belongs to same org
        if (req.body.clientContactId != null) {
          const [contact] = await db
            .select()
            .from(contactsTable)
            .where(and(eq(contactsTable.id, req.body.clientContactId), eq(contactsTable.orgId, orgId)));
          if (!contact) return res.status(404).json({ message: "Contact not found" });
        }
        const parsed = insertPropertyServiceAssignmentSchema.safeParse({ ...req.body, orgId, propertyId });
        if (!parsed.success) return res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
        const [created] = await db.insert(propertyServiceAssignments).values(parsed.data).returning();
        res.status(201).json(created);
      } catch (err) {
        console.error("POST /api/properties/:propertyId/service-assignments error:", err);
        res.status(500).json({ message: "Failed to create service assignment" });
      }
    });

    // PATCH /api/properties/:propertyId/service-assignments/:id — update
    app.patch("/api/properties/:propertyId/service-assignments/:id", isAuthenticated, isAdmin, async (req: any, res) => {
      try {
        const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
        const assignmentId = req.params.id;
        const propertyId = parseInt(req.params.propertyId, 10);
        if (!orgId) return res.status(403).json({ message: "No organization context" });
        const [existing] = await db
          .select()
          .from(propertyServiceAssignments)
          .where(
            and(
              eq(propertyServiceAssignments.id, assignmentId),
              eq(propertyServiceAssignments.orgId, orgId),
              eq(propertyServiceAssignments.propertyId, propertyId),
            )
          );
        if (!existing) return res.status(404).json({ message: "Assignment not found" });

        // Validate status enum
        const validStatuses = ["active", "paused", "cancelled"] as const;
        if (req.body.status !== undefined && !validStatuses.includes(req.body.status)) {
          return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
        }

        // Validate billingFrequencyOverride enum
        const validFrequencies = ["one_time", "weekly", "biweekly", "monthly", "quarterly", "annually", "per_visit", "custom"] as const;
        if (req.body.billingFrequencyOverride !== undefined && req.body.billingFrequencyOverride !== null && !validFrequencies.includes(req.body.billingFrequencyOverride)) {
          return res.status(400).json({ message: `Invalid billingFrequencyOverride. Must be one of: ${validFrequencies.join(", ")}` });
        }

        // Verify contact (if being updated) belongs to same org
        if (req.body.clientContactId != null) {
          const [contact] = await db
            .select()
            .from(contactsTable)
            .where(and(eq(contactsTable.id, req.body.clientContactId), eq(contactsTable.orgId, orgId)));
          if (!contact) return res.status(404).json({ message: "Contact not found" });
        }

        const allowed = ["status", "customPriceCents", "billingFrequencyOverride", "endDate", "notes", "startDate", "clientContactId", "visibleToPortal"];
        const updates: Record<string, any> = { updatedAt: new Date() };
        for (const key of allowed) {
          if (req.body[key] !== undefined) updates[key] = req.body[key];
        }
        const [updated] = await db
          .update(propertyServiceAssignments)
          .set(updates)
          .where(
            and(
              eq(propertyServiceAssignments.id, assignmentId),
              eq(propertyServiceAssignments.orgId, orgId),
              eq(propertyServiceAssignments.propertyId, propertyId),
            )
          )
          .returning();
        res.json(updated);
      } catch (err) {
        console.error("PATCH /api/properties/:propertyId/service-assignments/:id error:", err);
        res.status(500).json({ message: "Failed to update service assignment" });
      }
    });

    // DELETE /api/properties/:propertyId/service-assignments/:id — remove
    app.delete("/api/properties/:propertyId/service-assignments/:id", isAuthenticated, isAdmin, async (req: any, res) => {
      try {
        const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
        const assignmentId = req.params.id;
        const propertyId = parseInt(req.params.propertyId, 10);
        if (!orgId) return res.status(403).json({ message: "No organization context" });
        const [existing] = await db
          .select()
          .from(propertyServiceAssignments)
          .where(
            and(
              eq(propertyServiceAssignments.id, assignmentId),
              eq(propertyServiceAssignments.orgId, orgId),
              eq(propertyServiceAssignments.propertyId, propertyId),
            )
          );
        if (!existing) return res.status(404).json({ message: "Assignment not found" });
        await db
          .delete(propertyServiceAssignments)
          .where(
            and(
              eq(propertyServiceAssignments.id, assignmentId),
              eq(propertyServiceAssignments.orgId, orgId),
              eq(propertyServiceAssignments.propertyId, propertyId),
            )
          );
        res.json({ message: "Assignment removed" });
      } catch (err) {
        console.error("DELETE /api/properties/:propertyId/service-assignments/:id error:", err);
        res.status(500).json({ message: "Failed to remove service assignment" });
      }
    });

    // GET /api/admin/services/:serviceId/bulk-assign/progress — SSE stream for bulk-assign progress
    app.get("/api/admin/services/:serviceId/bulk-assign/progress", isAuthenticated, isAdmin, async (req: any, res) => {
      const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
      const serviceId = parseInt(req.params.serviceId, 10);
      if (!orgId) { res.status(403).json({ message: "No organization context" }); return; }

      const rawIds = typeof req.query.propertyIds === "string" ? req.query.propertyIds : "";
      const propertyIds = rawIds.split(",").map((s: string) => parseInt(s.trim(), 10)).filter((n: number) => !isNaN(n) && n > 0);
      if (propertyIds.length === 0) { res.status(400).json({ message: "propertyIds query param required" }); return; }

      const startDate: string = typeof req.query.startDate === "string" && req.query.startDate ? req.query.startDate : new Date().toISOString().slice(0, 10);
      const customPriceCents: number | undefined = req.query.customPriceCents != null && req.query.customPriceCents !== "" ? parseInt(String(req.query.customPriceCents), 10) : undefined;
      const billingFrequencyOverride: string | undefined = typeof req.query.billingFrequencyOverride === "string" && req.query.billingFrequencyOverride ? req.query.billingFrequencyOverride : undefined;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      function send(data: object) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
        if (typeof (res as any).flush === "function") (res as any).flush();
      }

      const total = propertyIds.length;
      const counters = { processed: 0, created: 0, skipped: 0, failed: 0 };
      const createdIds: number[] = [];

      try {
        // Verify service
        const [service] = await db.select().from(orgSvcTable).where(and(eq(orgSvcTable.id, serviceId), eq(orgSvcTable.orgId, orgId)));
        if (!service) { send({ error: "Service not found" }); res.end(); return; }

        // Fetch existing assignments
        const existing = await db.select({ propertyId: propertyServiceAssignments.propertyId }).from(propertyServiceAssignments).where(and(eq(propertyServiceAssignments.serviceId, serviceId), eq(propertyServiceAssignments.orgId, orgId)));
        const alreadyAssigned = new Set(existing.map((e: { propertyId: number }) => e.propertyId));

        // Send initial event so frontend knows total
        send({ processed: 0, total, created: 0, skipped: 0, failed: 0 });

        for (const propertyId of propertyIds) {
          if (alreadyAssigned.has(propertyId)) {
            counters.skipped++;
          } else {
            const [property] = await db.select().from(propertiesTable).where(and(eq(propertiesTable.id, propertyId), eq(propertiesTable.orgId, orgId)));
            if (!property) {
              counters.failed++;
            } else {
              const parsed = insertPropertyServiceAssignmentSchema.safeParse({
                orgId,
                propertyId,
                serviceId,
                startDate,
                ...(customPriceCents != null && !isNaN(customPriceCents) ? { customPriceCents } : {}),
                ...(billingFrequencyOverride ? { billingFrequencyOverride } : {}),
              });
              if (!parsed.success) {
                counters.failed++;
              } else {
                await db.insert(propertyServiceAssignments).values(parsed.data);
                counters.created++;
                createdIds.push(propertyId);
              }
            }
          }
          counters.processed++;
          send({ processed: counters.processed, total, created: counters.created, skipped: counters.skipped, failed: counters.failed });
        }
        send({ processed: total, total, created: counters.created, skipped: counters.skipped, failed: counters.failed, createdIds, done: true });
      } catch (err) {
        console.error("GET /api/admin/services/:serviceId/bulk-assign/progress error:", err);
        send({ error: "Internal error during bulk-assign" });
      } finally {
        res.end();
      }
    });

    // POST /api/admin/services/:serviceId/bulk-assign — assign service to multiple properties at once
    app.post("/api/admin/services/:serviceId/bulk-assign", isAuthenticated, isAdmin, async (req: any, res) => {
      try {
        const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
        const serviceId = parseInt(req.params.serviceId, 10);
        if (!orgId) return res.status(403).json({ message: "No organization context" });
        const { propertyIds, startDate, customPriceCents, billingFrequencyOverride } = req.body;
        if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
          return res.status(400).json({ message: "propertyIds must be a non-empty array" });
        }
        const resolvedStartDate = startDate || new Date().toISOString().slice(0, 10);
        const resolvedCustomPrice = customPriceCents != null ? parseInt(String(customPriceCents), 10) : undefined;
        const resolvedBillingFrequency = billingFrequencyOverride || undefined;
        // Verify service belongs to caller's org
        const [service] = await db
          .select()
          .from(orgSvcTable)
          .where(and(eq(orgSvcTable.id, serviceId), eq(orgSvcTable.orgId, orgId)));
        if (!service) return res.status(404).json({ message: "Service not found in your catalog" });

        // Fetch existing assignments for this service so we can skip duplicates
        const existing = await db
          .select({ propertyId: propertyServiceAssignments.propertyId })
          .from(propertyServiceAssignments)
          .where(and(eq(propertyServiceAssignments.serviceId, serviceId), eq(propertyServiceAssignments.orgId, orgId)));
        const alreadyAssigned = new Set(existing.map(e => e.propertyId));

        const results = { created: 0, skipped: 0, failed: 0 };
        for (const rawId of propertyIds) {
          const propertyId = parseInt(String(rawId), 10);
          if (isNaN(propertyId)) { results.failed++; continue; }
          if (alreadyAssigned.has(propertyId)) { results.skipped++; continue; }
          // Verify property belongs to org
          const [property] = await db
            .select()
            .from(propertiesTable)
            .where(and(eq(propertiesTable.id, propertyId), eq(propertiesTable.orgId, orgId)));
          if (!property) { results.failed++; continue; }
          const parsed = insertPropertyServiceAssignmentSchema.safeParse({
            orgId,
            propertyId,
            serviceId,
            startDate: resolvedStartDate,
            ...(resolvedCustomPrice != null && !isNaN(resolvedCustomPrice) ? { customPriceCents: resolvedCustomPrice } : {}),
            ...(resolvedBillingFrequency ? { billingFrequencyOverride: resolvedBillingFrequency } : {}),
          });
          if (!parsed.success) { results.failed++; continue; }
          await db.insert(propertyServiceAssignments).values(parsed.data);
          results.created++;
        }
        res.json(results);
      } catch (err) {
        console.error("POST /api/admin/services/:serviceId/bulk-assign error:", err);
        res.status(500).json({ message: "Failed to bulk-assign service" });
      }
    });

    // POST /api/admin/services/:serviceId/bulk-unassign — undo a bulk-assign by removing only newly created assignments
    app.post("/api/admin/services/:serviceId/bulk-unassign", isAuthenticated, isAdmin, async (req: any, res) => {
      try {
        const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
        const serviceId = parseInt(req.params.serviceId, 10);
        if (!orgId) return res.status(403).json({ message: "No organization context" });
        const { propertyIds } = req.body;
        if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
          return res.status(400).json({ message: "propertyIds must be a non-empty array" });
        }
        const [service] = await db
          .select()
          .from(orgSvcTable)
          .where(and(eq(orgSvcTable.id, serviceId), eq(orgSvcTable.orgId, orgId)));
        if (!service) return res.status(404).json({ message: "Service not found in your catalog" });

        let removed = 0;
        for (const rawId of propertyIds) {
          const propertyId = parseInt(String(rawId), 10);
          if (isNaN(propertyId)) continue;
          const result = await db
            .delete(propertyServiceAssignments)
            .where(
              and(
                eq(propertyServiceAssignments.serviceId, serviceId),
                eq(propertyServiceAssignments.propertyId, propertyId),
                eq(propertyServiceAssignments.orgId, orgId),
              )
            );
          if ((result as any).rowCount > 0 || (result as any).changes > 0) removed++;
        }
        res.json({ removed });
      } catch (err) {
        console.error("POST /api/admin/services/:serviceId/bulk-unassign error:", err);
        res.status(500).json({ message: "Failed to undo bulk assignment" });
      }
    });

    // GET /api/admin/services/:serviceId/bulk-remove/progress — SSE progress stream for bulk-remove
    app.get("/api/admin/services/:serviceId/bulk-remove/progress", isAuthenticated, isAdmin, async (req: any, res) => {
      const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
      const serviceId = parseInt(req.params.serviceId, 10);
      if (!orgId) { res.status(403).json({ message: "No organization context" }); return; }

      const rawIds = typeof req.query.propertyIds === "string" ? req.query.propertyIds : "";
      const propertyIds = rawIds.split(",").map((s: string) => parseInt(s.trim(), 10)).filter((n: number) => !isNaN(n) && n > 0);
      if (propertyIds.length === 0) { res.status(400).json({ message: "propertyIds query param required" }); return; }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      function send(data: object) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
        if (typeof (res as any).flush === "function") (res as any).flush();
      }

      const total = propertyIds.length;
      const counters = { processed: 0, removed: 0, skipped: 0, failed: 0 };

      try {
        const [service] = await db.select().from(orgSvcTable).where(and(eq(orgSvcTable.id, serviceId), eq(orgSvcTable.orgId, orgId)));
        if (!service) { send({ error: "Service not found" }); res.end(); return; }

        send({ processed: 0, total, removed: 0, skipped: 0, failed: 0 });

        for (const propertyId of propertyIds) {
          const existing = await db
            .select({ id: propertyServiceAssignments.id })
            .from(propertyServiceAssignments)
            .where(
              and(
                eq(propertyServiceAssignments.serviceId, serviceId),
                eq(propertyServiceAssignments.propertyId, propertyId),
                eq(propertyServiceAssignments.orgId, orgId),
              )
            );
          if (existing.length === 0) {
            counters.skipped++;
          } else {
            try {
              await db
                .delete(propertyServiceAssignments)
                .where(
                  and(
                    eq(propertyServiceAssignments.serviceId, serviceId),
                    eq(propertyServiceAssignments.propertyId, propertyId),
                    eq(propertyServiceAssignments.orgId, orgId),
                  )
                );
              counters.removed++;
            } catch {
              counters.failed++;
            }
          }
          counters.processed++;
          send({ processed: counters.processed, total, removed: counters.removed, skipped: counters.skipped, failed: counters.failed });
        }
        send({ processed: total, total, removed: counters.removed, skipped: counters.skipped, failed: counters.failed, done: true });
      } catch (err) {
        console.error("GET /api/admin/services/:serviceId/bulk-remove/progress error:", err);
        send({ error: "Internal error during bulk-remove" });
      } finally {
        res.end();
      }
    });

    // POST /api/admin/services/:serviceId/bulk-remove — remove service from multiple properties at once
    app.post("/api/admin/services/:serviceId/bulk-remove", isAuthenticated, isAdmin, async (req: any, res) => {
      try {
        const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
        const serviceId = parseInt(req.params.serviceId, 10);
        if (!orgId) return res.status(403).json({ message: "No organization context" });
        const { propertyIds } = req.body;
        if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
          return res.status(400).json({ message: "propertyIds must be a non-empty array" });
        }
        // Verify service belongs to caller's org
        const [service] = await db
          .select()
          .from(orgSvcTable)
          .where(and(eq(orgSvcTable.id, serviceId), eq(orgSvcTable.orgId, orgId)));
        if (!service) return res.status(404).json({ message: "Service not found in your catalog" });

        const results = { removed: 0, notFound: 0, failed: 0 };
        for (const rawId of propertyIds) {
          const propertyId = parseInt(String(rawId), 10);
          if (isNaN(propertyId)) { results.failed++; continue; }
          // Find the active assignment(s) for this property + service
          const existing = await db
            .select({ id: propertyServiceAssignments.id })
            .from(propertyServiceAssignments)
            .where(
              and(
                eq(propertyServiceAssignments.serviceId, serviceId),
                eq(propertyServiceAssignments.propertyId, propertyId),
                eq(propertyServiceAssignments.orgId, orgId),
              )
            );
          if (existing.length === 0) { results.notFound++; continue; }
          await db
            .delete(propertyServiceAssignments)
            .where(
              and(
                eq(propertyServiceAssignments.serviceId, serviceId),
                eq(propertyServiceAssignments.propertyId, propertyId),
                eq(propertyServiceAssignments.orgId, orgId),
              )
            );
          results.removed++;
        }
        res.json(results);
      } catch (err) {
        console.error("POST /api/admin/services/:serviceId/bulk-remove error:", err);
        res.status(500).json({ message: "Failed to bulk-remove service" });
      }
    });

    // GET /api/admin/services/:serviceId/assignments — list properties assigned to a service
    app.get("/api/admin/services/:serviceId/assignments", isAuthenticated, isAdmin, async (req: any, res) => {
      try {
        const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
        const serviceId = parseInt(req.params.serviceId, 10);
        if (!orgId) return res.status(403).json({ message: "No organization context" });
        const { organizationServices: orgSvcForList } = await import('@shared/schema');
        const assignments = await db
          .select({
            id: propertyServiceAssignments.id,
            propertyId: propertyServiceAssignments.propertyId,
            status: propertyServiceAssignments.status,
            startDate: propertyServiceAssignments.startDate,
            endDate: propertyServiceAssignments.endDate,
            customPriceCents: propertyServiceAssignments.customPriceCents,
            createdAt: propertyServiceAssignments.createdAt,
            propertyName: sqlFn2<string>`(SELECT name FROM properties WHERE id = ${propertyServiceAssignments.propertyId})`,
            serviceDefaultPriceCents: orgSvcForList.defaultPriceCents,
          })
          .from(propertyServiceAssignments)
          .leftJoin(orgSvcForList, eq(propertyServiceAssignments.serviceId, orgSvcForList.id))
          .where(
            and(
              eq(propertyServiceAssignments.serviceId, serviceId),
              eq(propertyServiceAssignments.orgId, orgId),
            )
          )
          .orderBy(desc(propertyServiceAssignments.createdAt));
        res.json(assignments);
      } catch (err) {
        console.error("GET /api/admin/services/:serviceId/assignments error:", err);
        res.status(500).json({ message: "Failed to fetch service property assignments" });
      }
    });
  }

  // Platform Invoice routes (Admin → Organizations)
  const statusEnum = z.enum(["draft", "open", "paid", "void", "uncollectible"]);
  
  app.get("/api/admin/invoices", isAuthenticated, isAdmin, async (req, res) => {
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

  app.get("/api/admin/invoices/:id", isAuthenticated, isAdmin, async (req, res) => {
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

  app.post("/api/admin/invoices", isAuthenticated, isAdmin, async (req, res) => {
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

  app.patch("/api/admin/invoices/:id", isAuthenticated, isAdmin, async (req, res) => {
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

  app.delete("/api/admin/invoices/:id", isAuthenticated, isAdmin, async (req, res) => {
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
  app.get("/api/admin/notes/search", isAuthenticated, isAdmin, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { q: searchQuery } = req.query;
      const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;

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
  app.post("/api/admin/invoices/:id/upload", uploadInvoice.single('file'), isAuthenticated, isAdmin, async (req, res) => {
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

  app.get("/api/admin/invoices/:id/download", isAuthenticated, isAdmin, async (req, res) => {
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
      const userOrgId = req.user?.claims?.orgId || req.user?.orgId;
      if (userOrgId !== orgId && req.user?.claims?.role !== "admin" && req.user?.role !== "admin") {
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
      const userOrgId = req.user?.claims?.orgId || req.user?.orgId;
      if (userOrgId !== orgId && req.user?.claims?.role !== "admin" && req.user?.role !== "admin") {
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
      const userOrgId = req.user?.claims?.orgId || req.user?.orgId;
      if (userOrgId !== orgId && req.user?.claims?.role !== "admin" && req.user?.role !== "admin") {
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

      // Build line items: prefer the invoice's stored lineItems JSONB; fall back to
      // a single line from the invoice description, or a generic placeholder.
      const rawLineItems: Array<{ description: string; quantity: number; unitAmountCents: number; totalCents: number }> =
        Array.isArray(invoice.lineItems) && invoice.lineItems.length > 0
          ? invoice.lineItems as any[]
          : invoice.description
            ? [{ description: invoice.description, quantity: 1, unitAmountCents: invoice.amountCents, totalCents: invoice.amountCents }]
            : [{ description: `Invoice ${invoice.invoiceNumber || invoice.id.slice(0, 8)}`, quantity: 1, unitAmountCents: invoice.amountCents, totalCents: invoice.amountCents }];

      const lineItems = rawLineItems.map((item: any) => ({
        description: item.description || 'Service',
        quantity: item.quantity ?? 1,
        unitPrice: item.unitAmountCents ?? item.unitPrice ?? invoice.amountCents,
        total: item.totalCents ?? item.total ?? invoice.amountCents,
      }));

      // Fetch custom fields for invoice entity type
      const customFields = await storage.getCustomFields(orgId, "invoice");

      const isPaid = invoice.paymentStatus === 'succeeded';
      const amountCents = invoice.amountCents ?? 0;
      const amountPaid = isPaid ? amountCents : 0;
      const amountDue = isPaid ? 0 : amountCents;

      const invoiceData = {
        invoiceNumber: invoice.invoiceNumber || `INV-${invoice.id.slice(0, 8)}`,
        invoiceDate: invoice.issuedAt || invoice.createdAt || new Date(),
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
        
        subtotal: amountCents,
        total: amountCents,
        amountPaid,
        amountDue,
        
        currency: invoice.currency || 'usd',
        
        primaryColor: org.branding?.primaryColor,
        secondaryColor: org.branding?.secondaryColor,
        
        attachments: invoice.attachments || undefined,
        
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

      if (!resend) {
        return res.status(500).json({ message: "Email service not configured. Please set RESEND_API_KEY." });
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

      const mailData: Parameters<typeof resend.emails.send>[0] = {
        to: emailTo,
        from: process.env.RESEND_FROM_EMAIL || "noreply@hubify.com",
        subject: `Invoice ${invoiceEmailData.invoiceNumber} from ${org.name}`,
        html: htmlContent,
        ...(pdfBuffer ? {
          attachments: [
            {
              filename: `invoice-${invoiceEmailData.invoiceNumber}.pdf`,
              content: pdfBuffer,
            },
          ],
        } : {}),
      };

      const { error: invoiceEmailError } = await resend.emails.send(mailData);
      if (invoiceEmailError) throw new Error(invoiceEmailError.message);
      
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
  app.get("/api/admin/import/history", isAuthenticated, isAdmin, async (req, res) => {
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

  app.post("/api/admin/import/execute", isAuthenticated, isAdmin, async (req, res) => {
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

  // ── Public inquiry form (no auth) ────────────────────────────────────────

  // Public: beta program slot status (no auth required)
  app.get("/api/public/beta-status", async (_req, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      const bp = settings.betaPricing as any | undefined;
      const tier1Cap = Number(bp?.tier1Cap ?? 10);
      const tier2Cap = Number(bp?.tier2Cap ?? 10);
      const totalCap = tier1Cap + tier2Cap;

      // Count active beta members by the durable isBetaMember flag (not stage)
      const [{ activeBetaCount }] = await db
        .select({ activeBetaCount: count() })
        .from(onboardingProspects)
        .where(
          and(
            eq(onboardingProspects.isBetaMember, true),
            isNull(onboardingProspects.betaRemovedAt)
          )
        );

      const tier1Filled = Math.min(activeBetaCount, tier1Cap);
      const tier2Filled = Math.max(0, Math.min(activeBetaCount - tier1Cap, tier2Cap));

      res.json({
        open: activeBetaCount < totalCap,
        activeBetaCount,
        tier1Filled,
        tier1Cap,
        tier1Remaining: Math.max(0, tier1Cap - tier1Filled),
        tier2Filled,
        tier2Cap,
        tier2Remaining: Math.max(0, tier2Cap - tier2Filled),
        totalCap,
        totalRemaining: Math.max(0, totalCap - activeBetaCount),
      });
    } catch (error) {
      console.error("Error fetching beta status:", error);
      res.status(500).json({ message: "Failed to fetch beta status" });
    }
  });

  // Public: current effective pricing (no auth required)
  app.get("/api/public/pricing", async (_req, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      const bp = settings.betaPricing as any | undefined;
      const basePrice = Number(bp?.basePrice ?? 199);
      const tier1DiscountPct = Number(bp?.tier1DiscountPct ?? bp?.discountPct ?? 50);
      const tier1Cap = Number(bp?.tier1Cap ?? 10);
      const tier2DiscountPct = Number(bp?.tier2DiscountPct ?? 25);
      const tier2Cap = Number(bp?.tier2Cap ?? 10);
      const totalCap = tier1Cap + tier2Cap;

      const [{ welcomeCount }] = await db
        .select({ welcomeCount: count() })
        .from(onboardingProspects)
        .where(eq(onboardingProspects.stage, "welcome"));

      const inTier1 = welcomeCount < tier1Cap;
      const inTier2 = !inTier1 && welcomeCount < totalCap;
      const isBetaOpen = welcomeCount < totalCap;
      const currentDiscountPct = inTier1 ? tier1DiscountPct : inTier2 ? tier2DiscountPct : 0;
      const effectivePrice = isBetaOpen
        ? Math.round(basePrice * (1 - currentDiscountPct / 100) * 100) / 100
        : basePrice;
      const currentTier = inTier1 ? 1 : inTier2 ? 2 : null;

      res.json({
        basePrice,
        tier1DiscountPct,
        tier1Cap,
        tier2DiscountPct,
        tier2Cap,
        totalCap,
        welcomeCount,
        isBetaOpen,
        currentTier,
        currentDiscountPct,
        effectivePrice,
        currency: "USD",
        label: inTier1
          ? `$${effectivePrice.toFixed(2)}/mo (${tier1DiscountPct}% off — Founding Member)`
          : inTier2
          ? `$${effectivePrice.toFixed(2)}/mo (${tier2DiscountPct}% off — Early Access)`
          : `$${basePrice.toFixed(2)}/mo`,
      });
    } catch (error) {
      console.error("Error fetching public pricing:", error);
      res.status(500).json({ message: "Failed to fetch pricing" });
    }
  });

  // ── Self-service org signup (public) ─────────────────────────────────────────
  app.get("/api/signup/config", async (_req, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      res.json({ enabled: !!settings.selfSignupEnabled });
    } catch {
      res.status(500).json({ message: "Failed to fetch signup config" });
    }
  });

  app.post("/api/signup", async (req: any, res) => {
    try {
      const { company, firstName, lastName, email, phone, website, discountCode: rawDiscountCode } = req.body;
      if (!company || !firstName || !lastName || !email) {
        return res.status(400).json({ message: "company, firstName, lastName, and email are required" });
      }

      const settings = await storage.getPlatformSettings();
      if (!settings.selfSignupEnabled) {
        return res.status(403).json({ message: "Self-signup is currently disabled" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const discountCodeStr: string | null = rawDiscountCode ? String(rawDiscountCode).toUpperCase().trim() : null;

      // Validate discount code if provided
      let discountCodeRow: Awaited<ReturnType<typeof storage.getDiscountCodeByCode>> | null = null;
      if (discountCodeStr) {
        discountCodeRow = await storage.getDiscountCodeByCode(discountCodeStr) ?? null;
        if (!discountCodeRow || !discountCodeRow.isActive) {
          return res.status(400).json({ message: "Invalid or inactive discount code" });
        }
        if (discountCodeRow.expiresAt && new Date(discountCodeRow.expiresAt) < new Date()) {
          return res.status(400).json({ message: "Discount code has expired" });
        }
        if (discountCodeRow.maxUses !== null && discountCodeRow.usedCount >= discountCodeRow.maxUses) {
          return res.status(400).json({ message: "Discount code has reached its usage limit" });
        }
      }

      const existing = await storage.getOrgSignupTokenByEmail(normalizedEmail);
      if (existing && existing.expiresAt > new Date()) {
        return res.status(409).json({ message: "An account with this email is already being set up. Check your inbox or log in." });
      }

      const { insertOrgSchema, insertOrgSubscriptionSchema } = await import("@shared/schema");

      const prospect = await storage.createOnboardingProspect({
        name: `${firstName} ${lastName}`,
        email: normalizedEmail,
        company,
        phone: phone || undefined,
        stage: "welcome",
        ...(discountCodeStr ? { discountCode: discountCodeStr } : {}),
      });

      const orgData = insertOrgSchema.parse({
        name: company,
        phone: phone || undefined,
        isActive: true,
      });
      const org = await storage.createOrg(orgData);

      const subData = insertOrgSubscriptionSchema.parse({
        orgId: org.id,
        tier: "starter",
        status: "trialing",
        setupFeeCents: Math.round(((prospect as any).setupFee ?? 0) * 100),
      });
      await storage.upsertOrgSubscription(org.id, subData);
      await storage.updateOnboardingProspect(prospect.id, { orgId: org.id });

      // Record discount code usage atomically (increment usedCount + log entry)
      if (discountCodeRow) {
        try {
          await storage.applyDiscountCode(discountCodeRow.id, {
            orgId: org.id,
            orgName: org.name,
            planName: "starter",
          });
        } catch (dcErr) {
          console.warn("[SIGNUP] Failed to record discount code usage:", dcErr);
        }
      }

      const { nanoid } = await import("nanoid");
      const token = nanoid(32);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await storage.createOrgSignupToken({ orgId: org.id, email: normalizedEmail, token, expiresAt });

      try {
        const { sendEmail } = await import("./email-service");
        const loginUrl = `${req.protocol}://${req.hostname}/staff/login`;
        await sendEmail({
          to: normalizedEmail,
          subject: `${company} is live on Hubify — here's how to get in`,
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
              <div style="background:#2563eb;padding:32px 40px;border-radius:12px 12px 0 0;">
                <h1 style="color:white;margin:0;font-size:24px;font-weight:700;">Welcome to Hubify, ${firstName}.</h1>
              </div>
              <div style="background:#ffffff;padding:32px 40px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;">
                <p style="font-size:16px;margin:0 0 20px;">Hi ${firstName},</p>
                <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px;">
                  Your organization <strong>${company}</strong> has been created and is ready to use.
                  Hubify is where your team will manage properties, assign tasks, coordinate schedules, and handle client billing — all in one place.
                </p>

                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px 24px;margin:0 0 28px;">
                  <p style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin:0 0 14px;">A few things to do first</p>
                  <table style="width:100%;border-collapse:collapse;">
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:#475569;vertical-align:top;width:24px;">1.</td>
                      <td style="padding:6px 0;font-size:14px;color:#475569;line-height:1.5;">
                        <strong style="color:#1e293b;">Add your properties</strong> — import your property list or add them one by one under Properties.
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:#475569;vertical-align:top;">2.</td>
                      <td style="padding:6px 0;font-size:14px;color:#475569;line-height:1.5;">
                        <strong style="color:#1e293b;">Invite your team</strong> — go to Team and add the staff and supervisors who'll be doing the work.
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:#475569;vertical-align:top;">3.</td>
                      <td style="padding:6px 0;font-size:14px;color:#475569;line-height:1.5;">
                        <strong style="color:#1e293b;">Create your first task</strong> — assign it to a property and a team member to see how the workflow feels.
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:#475569;vertical-align:top;">4.</td>
                      <td style="padding:6px 0;font-size:14px;color:#475569;line-height:1.5;">
                        <strong style="color:#1e293b;">Set up your client portal</strong> — give clients a way to view their property, tasks, and invoices (optional).
                      </td>
                    </tr>
                  </table>
                </div>

                <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 8px;">
                  To activate your account, log in with <strong style="color:#1e293b;">${normalizedEmail}</strong> — that email address is how Hubify links you to ${company}.
                </p>

                <p style="margin:28px 0 32px;text-align:center;">
                  <a href="${loginUrl}"
                     style="display:inline-block;background:#2563eb;color:white;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                    Log in to Hubify
                  </a>
                </p>

                <p style="font-size:13px;color:#94a3b8;margin:0;">
                  If you have questions, please email <a href="mailto:contact@hubifyhomes.com" style="color:#94a3b8">contact@hubifyhomes.com</a>
                </p>

                <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
                <p style="font-size:12px;color:#cbd5e1;margin:0;">
                  Hubify · <a href="https://hubify.com/privacy" style="color:#cbd5e1;">Privacy Policy</a>
                </p>
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        console.warn("[SIGNUP] Failed to send welcome email:", emailErr);
      }

      res.status(201).json({
        success: true,
        orgId: org.id,
        orgName: org.name,
        message: `Organization "${company}" created successfully.`,
      });
    } catch (error) {
      console.error("Error during self-signup:", error);
      res.status(500).json({ message: "Failed to complete signup" });
    }
  });

  app.post("/api/public/inquire", async (req, res) => {
    try {
      const { z } = await import("zod");
      const submissionSchema = z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        email: z.string().email("A valid email is required"),
        phone: z.string().optional(),
        preferredContactMethod: z.string().optional(),
        company: z.string().min(1, "Organization name is required"),
        website: z.string().optional(),
        businessType: z.string().optional(),
        serviceArea: z.string().optional(),
        estimatedHomes: z.coerce.number().min(1).optional(),
        currentMgmtMethod: z.string().optional(),
        teamSize: z.coerce.number().optional(),
        trialIntent: z.string().optional(),
        notes: z.string().optional(),
        // Beta application dedicated fields
        whyInterested: z.string().optional(),
        biggestChallenge: z.string().optional(),
        launchTimeframe: z.string().optional(),
      });
      const result = submissionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.errors });
      }
      const data = result.data;
      const intent = data.trialIntent;

      // Compute suggested tier from estimated homes
      const homes = data.estimatedHomes ?? 0;
      let suggestedTier = "";
      if (homes >= 1 && homes <= 10) suggestedTier = "Starter Portfolio";
      else if (homes <= 25) suggestedTier = "Growth Portfolio";
      else if (homes <= 50) suggestedTier = "Professional Portfolio";
      else if (homes <= 100) suggestedTier = "Operator Portfolio";
      else if (homes > 100) suggestedTier = "Enterprise Portfolio";

      // Map intent → stage + source
      let prospectStage: string;
      let prospectSource: string;
      if (intent === "need_demo") {
        prospectStage = "demo_requested";
        prospectSource = "demo_request";
      } else if (intent === "beta_application") {
        prospectStage = "inquiry";
        prospectSource = "beta_application";
      } else if (intent === "pricing_starter") {
        prospectStage = "inquiry";
        prospectSource = "pricing_starter";
      } else if (intent === "pricing_growth") {
        prospectStage = "inquiry";
        prospectSource = "pricing_growth";
      } else if (intent === "pricing_professional") {
        prospectStage = "inquiry";
        prospectSource = "pricing_professional";
      } else if (intent === "pricing_operator") {
        prospectStage = "inquiry";
        prospectSource = "pricing_operator";
      } else if (intent === "pricing_enterprise") {
        prospectStage = "inquiry";
        prospectSource = "pricing_enterprise";
      } else {
        prospectStage = "inquiry";
        prospectSource = "get_started";
      }

      // Beta application deduplication: reject if a non-dropped application
      // with the same email already exists.
      if (intent === "beta_application") {
        const { ilike: ilikeOp } = await import("drizzle-orm");
        const existing = await db
          .select({ id: onboardingProspects.id })
          .from(onboardingProspects)
          .where(
            and(
              ilikeOp(onboardingProspects.email, data.email),
              eq(onboardingProspects.source, "beta_application"),
              ne(onboardingProspects.stage, "dropped")
            )
          )
          .limit(1);
        if (existing.length > 0) {
          return res.status(409).json({
            message: "We already have your application on file. Our team will be in touch soon.",
          });
        }
      }

      // Build processedNotes — for beta applications, pack the question answers
      // into the notes field for backward compatibility alongside the dedicated columns.
      let processedNotes = data.notes ?? null;
      if (intent === "beta_application") {
        const betaParts = [
          data.whyInterested ? `Why interested: ${data.whyInterested}` : null,
          data.biggestChallenge ? `Biggest challenge: ${data.biggestChallenge}` : null,
          data.launchTimeframe ? `Launch timeframe: ${data.launchTimeframe}` : null,
        ].filter(Boolean).join("\n\n");
        if (betaParts) {
          processedNotes = processedNotes ? `${processedNotes}\n\n${betaParts}` : betaParts;
        }
      }

      const prospect = await storage.createOnboardingProspect({
        name: `${data.firstName} ${data.lastName}`.trim(),
        email: data.email,
        phone: data.phone ?? null,
        company: data.company,
        notes: processedNotes,
        stage: prospectStage,
        firstName: data.firstName,
        lastName: data.lastName,
        website: data.website ?? null,
        businessType: data.businessType ?? null,
        serviceArea: data.serviceArea ?? null,
        estimatedHomes: data.estimatedHomes ?? null,
        currentMgmtMethod: data.currentMgmtMethod ?? null,
        teamSize: data.teamSize ?? null,
        suggestedTier: suggestedTier || null,
        trialIntent: data.trialIntent ?? null,
        preferredContactMethod: data.preferredContactMethod ?? null,
        submissionStatus: "new",
        source: prospectSource,
        // Beta application question answers saved as dedicated columns
        whyInterested: data.whyInterested ?? null,
        biggestChallenge: data.biggestChallenge ?? null,
        launchTimeframe: data.launchTimeframe ?? null,
      } as any);

      // ── Beta application confirmation ─────────────────────────────────────
      if (intent === "beta_application") {
        const fromEmail = process.env.RESEND_FROM_EMAIL;
        if (resend && fromEmail) {
          try {
            const confirmResult = await resend.emails.send({
              from: fromEmail,
              to: data.email,
              replyTo: "contact@hubifyhomes.com",
              subject: `${data.firstName}, your Hubify beta application is in!`,
              html: `
              <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff">
                <div style="text-align:center;margin-bottom:28px">
                  <img src="${getHubifyHomesEmailLogoUrl()}" alt="Hubify Homes" width="180" style="width:180px;max-width:180px;height:auto;display:block;margin:0 auto;border:0;outline:none;text-decoration:none;">
                </div>
                <h1 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px">Hi ${data.firstName}, you're on the list!</h1>
                <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px">
                  We received your beta application for <strong>${data.company}</strong>. Our team will review your application and be in touch within one business day to confirm your spot and discount.
                </p>
                <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px">
                  We review each application to ensure beta participants are a good fit for the program and to maintain a high-quality testing experience while we continue refining the platform.
                </p>
                <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:20px;margin-bottom:28px">
                  <p style="font-size:14px;font-weight:700;color:#0d9488;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em">What happens next</p>
                  <ul style="font-size:14px;color:#475569;line-height:1.8;margin:0;padding-left:18px">
                    <li>Our team reviews your application (usually within 24 hours)</li>
                    <li>Your beta discount will be confirmed and assigned at the time of approval</li>
                    <li>You'll receive a welcome email with onboarding instructions</li>
                    <li>Your discount is locked in for the lifetime of your subscription</li>
                  </ul>
                </div>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px" />
                <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0">
                  If you have questions please email <a href="mailto:contact@hubifyhomes.com" style="color:#0d9488">contact@hubifyhomes.com</a>
                </p>
              </div>
            `,
            });
            if ((confirmResult as any)?.error) {
              const errMsg = (confirmResult as any).error?.message ?? JSON.stringify((confirmResult as any).error);
              console.warn("[beta-application] confirmation email Resend error:", errMsg);
              await storage.updateOnboardingProspect(prospect.id, {
                confirmationEmailStatus: `failed: ${errMsg}`,
                confirmationEmailSentAt: new Date(),
              } as any);
            } else {
              console.log(`[beta-application] confirmation sent resend_id=${(confirmResult as any)?.data?.id}`);
              await storage.updateOnboardingProspect(prospect.id, {
                confirmationEmailStatus: "sent",
                confirmationEmailSentAt: new Date(),
              } as any);
            }
          } catch (confirmErr: any) {
            const errMsg = confirmErr?.message ?? String(confirmErr);
            console.warn("[beta-application] confirmation email failed:", errMsg);
            await storage.updateOnboardingProspect(prospect.id, {
              confirmationEmailStatus: `failed: ${errMsg}`,
              confirmationEmailSentAt: new Date(),
            } as any);
          }
        }
        const alertTo = process.env.SUPPORT_EMAIL || process.env.ADMIN_EMAIL;
        if (resend && fromEmail && alertTo) {
          resend.emails.send({
            from: fromEmail,
            to: alertTo,
            replyTo: data.email,
            subject: `New beta application — ${data.firstName} ${data.lastName} (${data.company})`,
            html: `
              <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
                <h2 style="color:#0d9488;margin-bottom:4px">New Beta Application</h2>
                <p style="color:#64748b;font-size:14px;margin-top:0">Submitted via the Hubify Homes marketing site</p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"/>
                <table style="width:100%;border-collapse:collapse;font-size:14px">
                  <tr><td style="padding:6px 0;color:#64748b;width:150px">Name</td><td style="padding:6px 0;color:#0f172a;font-weight:600">${data.firstName} ${data.lastName}</td></tr>
                  <tr><td style="padding:6px 0;color:#64748b">Email</td><td style="padding:6px 0"><a href="mailto:${data.email}" style="color:#0d9488">${data.email}</a></td></tr>
                  ${data.phone ? `<tr><td style="padding:6px 0;color:#64748b">Phone</td><td style="padding:6px 0;color:#0f172a">${data.phone}</td></tr>` : ""}
                  <tr><td style="padding:6px 0;color:#64748b">Organization</td><td style="padding:6px 0;color:#0f172a">${data.company}</td></tr>
                  <tr><td style="padding:6px 0;color:#64748b">Beta Tier</td><td style="padding:6px 0;color:#0d9488;font-weight:600">${suggestedTier || "N/A"}</td></tr>
                  ${data.estimatedHomes ? `<tr><td style="padding:6px 0;color:#64748b">Est. Properties</td><td style="padding:6px 0;color:#0f172a">${data.estimatedHomes}</td></tr>` : ""}
                  ${data.teamSize ? `<tr><td style="padding:6px 0;color:#64748b">Staff Users</td><td style="padding:6px 0;color:#0f172a">${data.teamSize}</td></tr>` : ""}
                  ${data.serviceArea ? `<tr><td style="padding:6px 0;color:#64748b">Service Area</td><td style="padding:6px 0;color:#0f172a">${data.serviceArea}</td></tr>` : ""}
                  ${data.currentMgmtMethod ? `<tr><td style="padding:6px 0;color:#64748b">Current Software</td><td style="padding:6px 0;color:#0f172a">${data.currentMgmtMethod}</td></tr>` : ""}
                </table>
                ${data.whyInterested ? `<div style="margin-top:16px;padding:14px;background:#f0fdfa;border-radius:8px;border:1px solid #99f6e4"><p style="margin:0 0 6px;color:#0d9488;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Why Interested in Hubify Homes</p><p style="margin:0;color:#0f172a;font-size:14px;white-space:pre-wrap">${data.whyInterested}</p></div>` : ""}
                ${data.biggestChallenge ? `<div style="margin-top:10px;padding:14px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0"><p style="margin:0 0 6px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Biggest Operational Challenge</p><p style="margin:0;color:#0f172a;font-size:14px;white-space:pre-wrap">${data.biggestChallenge}</p></div>` : ""}
                ${data.launchTimeframe ? `<div style="margin-top:10px;padding:12px 14px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0"><p style="margin:0;color:#64748b;font-size:14px;">Preferred launch timeframe: <strong style="color:#0f172a">${data.launchTimeframe}</strong></p></div>` : ""}
              </div>
            `,
          }).catch((err: any) => console.warn("[beta-application] admin alert failed:", err));
        }
        return res.status(201).json({ id: prospect.id, message: "Beta application received" });
      }

      // ── Demo request flow ─────────────────────────────────────────────────
      if (data.trialIntent === "need_demo") {
        const fromEmail = process.env.RESEND_FROM_EMAIL;
        let demoEmailSent = false;
        let demoEmailError: string | null = null;

        if (resend && fromEmail) {
          try {
            await resend.emails.send({
              from: fromEmail,
              to: data.email,
              subject: `Your Hubify demo request has been received`,
              html: `
                <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff">
                  <div style="text-align:center;margin-bottom:28px">
                    <img src="${getHubifyHomesEmailLogoUrl()}" alt="Hubify Homes" width="180" style="width:180px;max-width:180px;height:auto;display:block;margin:0 auto;border:0;outline:none;text-decoration:none;">
  
                  </div>
                  <h1 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px">Hi ${data.firstName}, your demo request is in!</h1>
                  <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px">
                    Thanks for your interest in Hubify Homes. We received your demo request for <strong>${data.company}</strong>
                    and our team will be in touch within one business day to schedule a personalized walkthrough.
                  </p>
                  <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:20px;margin-bottom:28px">
                    <p style="font-size:14px;font-weight:700;color:#0d9488;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em">While you wait, try our shared demo</p>
                    <table style="width:100%;font-size:14px;border-collapse:collapse">
                      <tr>
                        <td style="padding:4px 0;color:#64748b;width:130px">Demo URL</td>
                        <td style="padding:4px 0"><a href="https://demo.hubifyhomesonline.com" style="color:#0d9488;font-weight:600">demo.hubifyhomesonline.com</a></td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#64748b">Staff login</td>
                        <td style="padding:4px 0;color:#0f172a;font-weight:600">demo@hubifyhomesonline.com</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#64748b">Password</td>
                        <td style="padding:4px 0;color:#0f172a;font-weight:600">Demo2026!</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#64748b;vertical-align:top">Portal client</td>
                        <td style="padding:4px 0;color:#0f172a">client@demo.hubifyhomesonline.com<br/>DemoClient2026!</td>
                      </tr>
                    </table>
                  </div>
                  <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 24px">
                    The shared demo environment includes 10 sample properties, real task and invoice workflows, staff scheduling, client portal access, and more — so you can explore Hubify at your own pace.
                  </p>
                  <div style="text-align:center;margin-bottom:32px">
                    <a href="https://demo.hubifyhomesonline.com" style="display:inline-block;background:#0d9488;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px">
                      Explore the Demo
                    </a>
                  </div>
                  <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px" />
                  <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0">
                    If you have questions please email <a href="mailto:contact@hubifyhomes.com" style="color:#0d9488">contact@hubifyhomes.com</a><br/>
                    You received this because you submitted a demo request at Hubify Homes.
                  </p>
                </div>
              `,
            });
            demoEmailSent = true;
          } catch (err: any) {
            console.warn("[demo-request] prospect email failed:", err);
            demoEmailError = `failed: ${err?.message ?? String(err)}`.slice(0, 255);
          }
        } else {
          demoEmailError = "failed: email service not configured";
        }

        // Internal alert to Drew
        const alertTo = process.env.SUPPORT_EMAIL || process.env.ADMIN_EMAIL;
        if (resend && fromEmail && alertTo) {
          resend.emails.send({
            from: fromEmail,
            to: alertTo,
            replyTo: data.email,
            subject: `New demo request — ${data.firstName} ${data.lastName} (${data.company})`,
            html: `
              <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
                <h2 style="color:#0d9488;margin-bottom:4px">New Demo Request</h2>
                <p style="color:#64748b;font-size:14px;margin-top:0">Submitted via the Hubify Homes marketing site</p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"/>
                <table style="width:100%;border-collapse:collapse;font-size:14px">
                  <tr><td style="padding:6px 0;color:#64748b;width:150px">Name</td><td style="padding:6px 0;color:#0f172a;font-weight:600">${data.firstName} ${data.lastName}</td></tr>
                  <tr><td style="padding:6px 0;color:#64748b">Email</td><td style="padding:6px 0"><a href="mailto:${data.email}" style="color:#0d9488">${data.email}</a></td></tr>
                  ${data.phone ? `<tr><td style="padding:6px 0;color:#64748b">Phone</td><td style="padding:6px 0;color:#0f172a">${data.phone}</td></tr>` : ""}
                  <tr><td style="padding:6px 0;color:#64748b">Organization</td><td style="padding:6px 0;color:#0f172a">${data.company}</td></tr>
                  ${data.estimatedHomes ? `<tr><td style="padding:6px 0;color:#64748b">Est. Homes</td><td style="padding:6px 0;color:#0f172a">${data.estimatedHomes}</td></tr>` : ""}
                  ${suggestedTier ? `<tr><td style="padding:6px 0;color:#64748b">Suggested Tier</td><td style="padding:6px 0;color:#0d9488;font-weight:600">${suggestedTier}</td></tr>` : ""}
                  <tr><td style="padding:6px 0;color:#64748b">Demo email</td><td style="padding:6px 0">${demoEmailSent ? '<span style="color:#16a34a;font-weight:600">Sent ✓</span>' : `<span style="color:#dc2626">Failed — ${demoEmailError ?? "unknown"}</span>`}</td></tr>
                </table>
                ${data.notes ? `<div style="margin-top:16px;padding:14px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0"><p style="margin:0 0 6px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Notes</p><p style="margin:0;color:#0f172a;font-size:14px;white-space:pre-wrap">${data.notes}</p></div>` : ""}
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"/>
                <p style="font-size:12px;color:#94a3b8">Lead added to the Hubify onboarding pipeline as <strong>Demo Requested</strong>. Log in to Super Admin → Onboarding to manage this lead.</p>
              </div>
            `,
          }).catch((err: any) => console.warn("[demo-request] admin alert failed:", err));
        }

        // Update prospect with email outcome
        await storage.updateOnboardingProspect(prospect.id, {
          stage: demoEmailSent ? "demo_sent" : "demo_requested",
          demoAccessSent: demoEmailSent,
          demoEmailSentAt: demoEmailSent ? new Date() : undefined,
          demoEmailError: demoEmailError ?? undefined,
        } as any).catch((e: any) => console.warn("[demo-request] failed to update prospect:", e));

        return res.status(201).json({ id: prospect.id, message: "Demo request received" });
      }

      // Start trial if intent qualifies
      const TRIAL_INTENTS = ["free_trial", "ready_onboarding"];
      if (data.trialIntent && TRIAL_INTENTS.includes(data.trialIntent)) {
        const now = new Date();
        const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        try {
          await storage.updateOnboardingProspect(prospect.id, {
            trialStartedAt: now,
            trialEndsAt,
            trialStatus: "active",
          } as any);
        } catch (err) {
          console.warn("[submission-form] Failed to set trial fields:", err);
        }

        // Welcome email — use shared builder from scheduledTasks.ts
        if (resend && process.env.RESEND_FROM_EMAIL) {
          const fromEmail = process.env.RESEND_FROM_EMAIL;
          const welcomeProspect = {
            name: `${data.firstName} ${data.lastName ?? ""}`.trim(),
            email: data.email,
            company: data.company ?? null,
            trialEndsAt,
          };
          const { subject: welcomeSubject, html: welcomeHtml } = buildTrialWelcomeEmail(welcomeProspect);
          resend.emails.send({ from: fromEmail, to: data.email, subject: welcomeSubject, html: welcomeHtml })
            .catch((err: any) => console.warn("[submission-form] trial welcome email failed:", err));
        }
      }

      // Admin notification email — only send when all three env vars are set
      if (resend && process.env.RESEND_FROM_EMAIL && process.env.SUPPORT_EMAIL) {
        const fromEmail = process.env.RESEND_FROM_EMAIL;
        const toEmail = process.env.SUPPORT_EMAIL;
        {
          resend.emails.send({
            from: fromEmail,
            to: toEmail,
            replyTo: data.email,
            subject: `New submission from ${data.firstName} ${data.lastName} — ${data.company}`,
            html: `
              <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
                <h2 style="color:#0d9488;margin-bottom:4px">New Client Submission</h2>
                <p style="color:#64748b;font-size:14px;margin-top:0">Submitted via the Hubify Homes submission form</p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"/>
                <table style="width:100%;border-collapse:collapse;font-size:14px">
                  <tr><td style="padding:6px 0;color:#64748b;width:150px">Name</td><td style="padding:6px 0;color:#0f172a;font-weight:600">${data.firstName} ${data.lastName}</td></tr>
                  <tr><td style="padding:6px 0;color:#64748b">Email</td><td style="padding:6px 0"><a href="mailto:${data.email}" style="color:#0d9488">${data.email}</a></td></tr>
                  ${data.phone ? `<tr><td style="padding:6px 0;color:#64748b">Phone</td><td style="padding:6px 0;color:#0f172a">${data.phone}</td></tr>` : ""}
                  <tr><td style="padding:6px 0;color:#64748b">Organization</td><td style="padding:6px 0;color:#0f172a">${data.company}</td></tr>
                  ${data.businessType ? `<tr><td style="padding:6px 0;color:#64748b">Business Type</td><td style="padding:6px 0;color:#0f172a">${data.businessType.replace(/_/g, " ")}</td></tr>` : ""}
                  ${data.estimatedHomes ? `<tr><td style="padding:6px 0;color:#64748b">Est. Homes</td><td style="padding:6px 0;color:#0f172a">${data.estimatedHomes}</td></tr>` : ""}
                  ${suggestedTier ? `<tr><td style="padding:6px 0;color:#64748b">Suggested Tier</td><td style="padding:6px 0;color:#0d9488;font-weight:600">${suggestedTier}</td></tr>` : ""}
                  ${data.trialIntent ? `<tr><td style="padding:6px 0;color:#64748b">Trial Intent</td><td style="padding:6px 0;color:#0f172a">${data.trialIntent.replace(/_/g, " ")}</td></tr>` : ""}
                </table>
                ${data.notes ? `<div style="margin-top:16px;padding:14px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0"><p style="margin:0 0 6px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Additional Notes</p><p style="margin:0;color:#0f172a;font-size:14px;white-space:pre-wrap">${data.notes}</p></div>` : ""}
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"/>
                <p style="font-size:12px;color:#94a3b8">This lead has been added to the Hubify onboarding pipeline as a <strong>Submission</strong>.</p>
              </div>
            `,
          }).catch((err: any) => console.warn("[submission-form] email send failed:", err));
        }
      }

      // Prospect confirmation email — always record delivery outcome on the prospect
      {
        let emailSentAt: Date | null = null;
        let emailStatus: string;

        if (!resend || !process.env.RESEND_FROM_EMAIL) {
          emailStatus = "failed: email service not configured";
        } else {
          const fromEmail = process.env.RESEND_FROM_EMAIL;

          // Check for a super-admin override template
          const customTpl = await storage.getProspectConfirmationEmailTemplate().catch(() => undefined);

          try {
            if (customTpl) {
              // Apply merge tags to the custom template
              const applyMergeTags = (text: string) =>
                text
                  .replace(/\{\{firstName\}\}/gi, data.firstName)
                  .replace(/\{\{lastName\}\}/gi, data.lastName)
                  .replace(/\{\{name\}\}/gi, `${data.firstName} ${data.lastName}`.trim())
                  .replace(/\{\{company\}\}/gi, data.company)
                  .replace(/\{\{email\}\}/gi, data.email)
                  .replace(/\{\{suggestedTier\}\}/gi, suggestedTier || "")
                  .replace(/\{\{estimatedHomes\}\}/gi, String(data.estimatedHomes ?? ""));

              const cTplResult = await resend.emails.send({
                from: fromEmail,
                to: data.email,
                subject: applyMergeTags(customTpl.subject),
                html: applyMergeTags(customTpl.body),
              });
              console.log(`[submission-form] confirmation sent (custom tpl) resend_id=${cTplResult?.data?.id}`);
            } else {
              const tierSection = suggestedTier
                ? `<tr>
                     <td style="padding:8px 0;color:#64748b;font-size:14px;width:160px;vertical-align:top">Suggested plan</td>
                     <td style="padding:8px 0;font-size:14px;vertical-align:top">
                       <span style="display:inline-block;background:#ccfbf1;color:#0d9488;font-weight:700;padding:3px 10px;border-radius:20px">${suggestedTier}</span>
                     </td>
                   </tr>`
                : "";
              await resend.emails.send({
                from: fromEmail,
                to: data.email,
                subject: `We received your Hubify inquiry — here's what happens next`,
                html: `
                  <div style="font-family:sans-serif;max-width:580px;margin:0 auto;padding:32px 24px;background:#ffffff">
                    <!-- Logo -->
                    <div style="text-align:center;margin-bottom:28px">
                      <img src="${getHubifyHomesEmailLogoUrl()}" alt="Hubify Homes" width="140" style="width:140px;max-width:140px;height:auto;display:block;margin:0 auto;border:0;outline:none;text-decoration:none;">
                    </div>

                    <!-- Greeting -->
                    <h1 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px">Hi ${data.firstName}, thanks for reaching out!</h1>
                    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px">
                      We've received your inquiry for <strong>${data.company}</strong> and our team will be in touch shortly.
                      Here's a summary of what you submitted:
                    </p>

                    <!-- Summary card -->
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:28px">
                      <table style="width:100%;border-collapse:collapse">
                        <tr>
                          <td style="padding:8px 0;color:#64748b;font-size:14px;width:160px;vertical-align:top">Name</td>
                          <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top">${data.firstName} ${data.lastName}</td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0;color:#64748b;font-size:14px;vertical-align:top">Organization</td>
                          <td style="padding:8px 0;color:#0f172a;font-size:14px;vertical-align:top">${data.company}</td>
                        </tr>
                        ${data.estimatedHomes ? `<tr>
                          <td style="padding:8px 0;color:#64748b;font-size:14px;vertical-align:top">Properties managed</td>
                          <td style="padding:8px 0;color:#0f172a;font-size:14px;vertical-align:top">${data.estimatedHomes}</td>
                        </tr>` : ""}
                        ${tierSection}
                      </table>
                    </div>

                    <!-- Next steps -->
                    <h2 style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 12px">What happens next?</h2>
                    <ol style="padding-left:20px;margin:0 0 28px;color:#475569;font-size:14px;line-height:1.8">
                      <li>A member of our team will review your submission — usually within one business day.</li>
                      <li>We'll reach out to schedule a short discovery call so we can tailor Hubify to your workflow.</li>
                      <li>You'll receive access to a personalized trial environment matched to your suggested plan.</li>
                    </ol>

                    <!-- CTA -->
                    <div style="text-align:center;margin-bottom:32px">
                      <a href="https://hubifyhomes.com"
                         style="display:inline-block;background:#0d9488;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px">
                        Learn more about Hubify
                      </a>
                    </div>

                    <!-- Footer -->
                    <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px" />
                    <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0">
                      You received this email because you submitted an inquiry at Hubify Homes.<br/>
                      If you didn't submit this form, you can safely ignore this message.
                    </p>
                  </div>
                `,
              });
            }
            emailSentAt = new Date();
            emailStatus = "sent";
            console.log(`[submission-form] confirmation email delivered to ${data.email} for source=${prospectSource}`);
          } catch (err: any) {
            console.warn("[submission-form] prospect confirmation email failed:", err);
            emailStatus = `failed: ${err?.message ?? String(err)}`.slice(0, 255);
          }
        }

        // Always persist the delivery outcome so super-admins can see it
        storage.updateOnboardingProspect(prospect.id, {
          confirmationEmailSentAt: emailSentAt ?? undefined,
          confirmationEmailStatus: emailStatus,
        }).catch((e: any) => console.warn("[submission-form] failed to record email status:", e));
      }

      res.status(201).json({ id: prospect.id, message: "Submission received" });
    } catch (error) {
      console.error("Error handling public submission:", error);
      res.status(500).json({ message: "Failed to submit" });
    }
  });

  app.post("/api/public/contact", async (req, res) => {
    try {
      const { insertOnboardingProspectSchema } = await import("@shared/schema");
      const schema = insertOnboardingProspectSchema.pick({ name: true, email: true, company: true, phone: true, notes: true });
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.errors });
      }
      const prospect = await storage.createOnboardingProspect({ ...result.data, stage: "contact", source: "contact_form" } as any);

      const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@hubifyhomes.com";
      const { name, email, company, phone, notes } = result.data;

      // Confirmation email to the submitter
      if (resend) {
        resend.emails.send({
          from: fromEmail,
          to: email,
          replyTo: "contact@hubifyhomes.com",
          subject: `We received your message — Hubify Homes`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff">
              <div style="text-align:center;margin-bottom:28px">
                <img src="${getHubifyHomesEmailLogoUrl()}" alt="Hubify Homes" width="180" style="width:180px;max-width:180px;height:auto;display:block;margin:0 auto;border:0;outline:none;text-decoration:none;">
              </div>
              <h1 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px">Thanks for reaching out${name ? `, ${name.split(" ")[0]}` : ""}!</h1>
              <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px">
                We received your message and our team will be in touch within one business day.
              </p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px" />
              <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0">
                You received this because you submitted a contact form at Hubify Homes.
              </p>
            </div>
          `,
        }).then((r: any) => console.log(`[contact-form] confirmation sent resend_id=${r?.data?.id}`)).catch((err: any) => console.warn("[contact-form] confirmation email failed:", err));
      }

      // Internal notification email to the Hubify Homes contact inbox
      if (resend) {
        await resend.emails.send({
          from: fromEmail,
          to: "contact@hubifyhomes.com",
          replyTo: email,
          subject: `New contact form submission from ${name}`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
              <h2 style="color:#0d9488;margin-bottom:4px">New Contact Submission</h2>
              <p style="color:#64748b;font-size:14px;margin-top:0">Submitted via the Hubify Homes contact form</p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"/>
              <table style="width:100%;border-collapse:collapse;font-size:14px">
                <tr><td style="padding:6px 0;color:#64748b;width:100px">Name</td><td style="padding:6px 0;color:#0f172a;font-weight:600">${name}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b">Email</td><td style="padding:6px 0"><a href="mailto:${email}" style="color:#0d9488">${email}</a></td></tr>
                ${company ? `<tr><td style="padding:6px 0;color:#64748b">Company</td><td style="padding:6px 0;color:#0f172a">${company}</td></tr>` : ""}
                ${phone ? `<tr><td style="padding:6px 0;color:#64748b">Phone</td><td style="padding:6px 0;color:#0f172a">${phone}</td></tr>` : ""}
              </table>
              ${notes ? `<div style="margin-top:16px;padding:14px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0"><p style="margin:0 0 6px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Message</p><p style="margin:0;color:#0f172a;font-size:14px;white-space:pre-wrap">${notes}</p></div>` : ""}
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"/>
              <p style="font-size:12px;color:#94a3b8">This lead has been added to your Hubify onboarding pipeline in the <strong>Contact</strong> stage.</p>
            </div>
          `,
        }).catch((err: any) => console.warn("[contact-form] email send failed:", err));
      }

      res.status(201).json({ id: prospect.id, message: "Message received" });
    } catch (error) {
      console.error("Error handling public contact form:", error);
      res.status(500).json({ message: "Failed to submit contact form" });
    }
  });

  // ── Public Onboarding (tokenized, no auth) ───────────────────────────────
  // GET /api/public/onboarding/:token
  // Returns approved prospect details needed to render the agreement screen.
  // No auth — gated only by the secure 64-hex onboarding token.
  app.get("/api/public/onboarding/:token", async (req, res) => {
    try {
      const { token } = req.params;
      if (!token || token.length !== 64 || !/^[0-9a-f]+$/.test(token)) {
        return res.status(400).json({ message: "Invalid onboarding link." });
      }
      const { eq } = await import("drizzle-orm");
      const rows = await db
        .select()
        .from(onboardingProspects)
        .where(eq(onboardingProspects.onboardingToken, token))
        .limit(1);
      const prospect = rows[0];
      if (!prospect) {
        return res.status(404).json({ message: "This onboarding link is not valid. Please contact support." });
      }
      if (!prospect.isBetaMember || !prospect.betaApprovedAt) {
        return res.status(403).json({ message: "This link is not associated with an approved beta application." });
      }
      if (prospect.onboardingTokenExpiresAt && new Date(prospect.onboardingTokenExpiresAt) < new Date()) {
        return res.status(410).json({ message: "This onboarding link has expired. Please email contact@hubifyhomes.com to request a new one." });
      }
      // Return safe subset — never expose internal UUID in this endpoint
      const p = prospect as any;
      res.json({
        alreadySigned: p.agreementStatus === "signed",
        agreementSignedAt: prospect.agreementSignedAt,
        agreementSignerName: p.agreementSignerName,
        name: prospect.name,
        firstName: p.firstName,
        lastName: p.lastName,
        email: prospect.email,
        phone: prospect.phone,
        company: prospect.company,
        estimatedHomes: p.estimatedHomes,
        teamSize: p.teamSize,
        portfolioTier: p.portfolioTier,
        originalMonthlyPrice: p.originalMonthlyPrice,
        discountPercentage: p.discountPercentage,
        discountedMonthlyPrice: p.discountedMonthlyPrice,
        setupFee: p.setupFee,
        betaCohortNumber: p.betaCohortNumber,
        agreementStatus: p.agreementStatus ?? "pending",
        paymentStatus: p.paymentStatus ?? null,
        paymentCompletedAt: p.paymentCompletedAt ?? null,
        stage: prospect.stage,
      });
    } catch (error) {
      console.error("Error fetching onboarding details:", error);
      res.status(500).json({ message: "Failed to load onboarding details." });
    }
  });

  // POST /api/public/onboarding/:token/accept-agreement
  // Records the applicant's agreement signature and advances stage to payment_pending.
  app.post("/api/public/onboarding/:token/accept-agreement", async (req, res) => {
    try {
      const { token } = req.params;
      if (!token || token.length !== 64 || !/^[0-9a-f]+$/.test(token)) {
        return res.status(400).json({ message: "Invalid onboarding link." });
      }
      const { z } = await import("zod");
      const bodySchema = z.object({
        signerName: z.string().min(1, "Signer name is required"),
        organizationName: z.string().min(1, "Organization name is required"),
        agreeToTerms: z.literal(true, { errorMap: () => ({ message: "You must agree to the Terms of Service" }) }),
        agreeToPrivacy: z.literal(true, { errorMap: () => ({ message: "You must agree to the Privacy Policy" }) }),
        agreeToBetaAgreement: z.literal(true, { errorMap: () => ({ message: "You must agree to the Beta Agreement" }) }),
        // Agreement engagement metadata (optional, recorded for audit trail)
        agreementVersion: z.string().optional(),
        tosVersion: z.string().optional(),
        privacyVersion: z.string().optional(),
        agreementViewedAt: z.string().datetime().optional(),
        agreementScrolledAt: z.string().datetime().optional(),
      });
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Please complete all required fields.", errors: parsed.error.errors });
      }
      const { signerName, organizationName } = parsed.data;

      const { eq } = await import("drizzle-orm");
      const rows = await db
        .select()
        .from(onboardingProspects)
        .where(eq(onboardingProspects.onboardingToken, token))
        .limit(1);
      const prospect = rows[0];
      if (!prospect) return res.status(404).json({ message: "Onboarding link not found." });
      if (!prospect.isBetaMember || !prospect.betaApprovedAt) {
        return res.status(403).json({ message: "Application not approved for beta." });
      }
      if (prospect.onboardingTokenExpiresAt && new Date(prospect.onboardingTokenExpiresAt) < new Date()) {
        return res.status(410).json({ message: "This onboarding link has expired. Please contact support for a new link." });
      }
      if ((prospect as any).agreementStatus === "signed") {
        return res.status(409).json({ message: "Agreement has already been signed." });
      }

      // Capture IP and user-agent for audit trail
      const acceptedIp =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
        req.socket?.remoteAddress ??
        null;
      const acceptedUserAgent = req.headers["user-agent"] ?? null;

      const now = new Date();
      const existingHistory: any[] = (prospect as any).stageHistory ?? [];
      const updatedHistory = [
        ...existingHistory,
        { stage: "payment_pending", enteredAt: now.toISOString(), note: "Beta agreement signed" },
      ];

      const { agreementVersion, tosVersion, privacyVersion, agreementViewedAt, agreementScrolledAt } = parsed.data;

      await storage.updateOnboardingProspect(prospect.id, {
        agreementStatus: "signed",
        agreementSignedAt: now,
        agreementSignerName: signerName,
        agreementOrganizationName: organizationName,
        agreementAcceptedIp: acceptedIp,
        agreementAcceptedUserAgent: acceptedUserAgent,
        agreementVersion: agreementVersion ?? null,
        agreementViewedAt: agreementViewedAt ? new Date(agreementViewedAt) : null,
        agreementScrolledAt: agreementScrolledAt ? new Date(agreementScrolledAt) : null,
        // Denormalized per-document acceptance timestamps
        tosAcceptedAt: now,
        tosVersion: tosVersion ?? null,
        privacyAcceptedAt: now,
        privacyVersion: privacyVersion ?? null,
        stage: "agreement_complete",
        stageHistory: updatedHistory,
      } as any);

      // Write immutable agreement_acceptances records — one per document
      const sharedFields = {
        prospectId: prospect.id,
        orgId: prospect.orgId ?? null,
        userId: null,
        ipAddress: acceptedIp,
        userAgent: acceptedUserAgent,
        signerName,
        organizationName,
        acceptedAt: now,
      };
      await Promise.all([
        storage.createAgreementAcceptance({
          ...sharedFields,
          agreementType: "terms_of_service",
          agreementVersion: tosVersion ?? "v1.1",
        }),
        storage.createAgreementAcceptance({
          ...sharedFields,
          agreementType: "privacy_policy",
          agreementVersion: privacyVersion ?? "v1.0",
        }),
        storage.createAgreementAcceptance({
          ...sharedFields,
          agreementType: "beta_participation_agreement",
          agreementVersion: agreementVersion ?? "v1.1",
        }),
      ]);

      // Send confirmation email (non-blocking — failures are logged but do not affect the response)
      if (resend) {
        const baseUrl = getAppBaseUrl();
        const onboardingUrl = `${baseUrl}/onboarding/${token}`;
        const signedAt = now.toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
        const versionLabel = agreementVersion ? ` (v${agreementVersion})` : "";
        const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@hubifyhomes.com";

        resend.emails.send({
          from: fromEmail,
          to: prospect.email,
          subject: "You've signed the Hubify Beta Agreement",
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff">
              <div style="text-align:center;margin-bottom:28px">
                <img src="${getHubifyHomesEmailLogoUrl()}" alt="Hubify Homes" width="180" style="width:180px;max-width:180px;height:auto;display:block;margin:0 auto;border:0;outline:none;text-decoration:none;">
              </div>
              <h1 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 16px">Agreement Signed — You're In!</h1>
              <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px">
                Hi ${signerName}, thanks for signing the Hubify Beta Agreement${versionLabel}. Your onboarding step has been recorded — here's a summary for your records.
              </p>
              <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 28px">
                <tr>
                  <td style="padding:8px 0;color:#64748b;width:160px;vertical-align:top">Signer name</td>
                  <td style="padding:8px 0;color:#0f172a;font-weight:600">${signerName}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#64748b;vertical-align:top">Organization</td>
                  <td style="padding:8px 0;color:#0f172a;font-weight:600">${organizationName}</td>
                </tr>
                ${agreementVersion ? `
                <tr>
                  <td style="padding:8px 0;color:#64748b;vertical-align:top">Agreement version</td>
                  <td style="padding:8px 0;color:#0f172a">${agreementVersion}</td>
                </tr>` : ""}
                <tr>
                  <td style="padding:8px 0;color:#64748b;vertical-align:top">Signed at</td>
                  <td style="padding:8px 0;color:#0f172a">${signedAt}</td>
                </tr>
              </table>
              <div style="text-align:center;margin:0 0 28px">
                <a href="${onboardingUrl}" style="display:inline-block;background:#0d9488;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:6px">Continue to Payment Setup</a>
              </div>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px">
              <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0">
                You received this because you signed the Hubify Beta Agreement. If you have questions please email <a href="mailto:contact@hubifyhomes.com" style="color:#0d9488">contact@hubifyhomes.com</a>.
              </p>
            </div>
          `,
        })
          .then((r: any) => {
            console.log(`[accept-agreement] confirmation email sent to ${prospect.email} resend_id=${r?.data?.id}`);
            storage.updateOnboardingProspect(prospect.id, {
              agreementEmailSentAt: new Date(),
              agreementEmailStatus: "sent",
            } as any).catch((dbErr: any) => console.warn("[accept-agreement] failed to record email sent status:", dbErr));
          })
          .catch((err: any) => {
            console.warn("[accept-agreement] confirmation email failed (non-fatal):", err);
            storage.updateOnboardingProspect(prospect.id, {
              agreementEmailSentAt: new Date(),
              agreementEmailStatus: "failed",
            } as any).catch((dbErr: any) => console.warn("[accept-agreement] failed to record email failed status:", dbErr));
          });
      }

      res.json({ success: true, message: "Agreement accepted. Proceeding to payment setup." });
    } catch (error) {
      console.error("Error accepting agreement:", error);
      res.status(500).json({ message: "Failed to record agreement acceptance." });
    }
  });

  // POST /api/public/onboarding/:token/create-checkout
  // Creates a Stripe Checkout session for the beta setup fee + first month subscription.
  app.post("/api/public/onboarding/:token/create-checkout", async (req, res) => {
    try {
      const { token } = req.params;
      if (!token || token.length !== 64 || !/^[0-9a-f]+$/.test(token)) {
        return res.status(400).json({ message: "Invalid onboarding link." });
      }

      const { eq } = await import("drizzle-orm");
      const rows = await db
        .select()
        .from(onboardingProspects)
        .where(eq(onboardingProspects.onboardingToken, token))
        .limit(1);
      const prospect = rows[0];
      if (!prospect) return res.status(404).json({ message: "Onboarding link not found." });
      if (!prospect.isBetaMember || !prospect.betaApprovedAt) {
        return res.status(403).json({ message: "Application not approved for beta." });
      }
      if (prospect.onboardingTokenExpiresAt && new Date(prospect.onboardingTokenExpiresAt) < new Date()) {
        return res.status(410).json({ message: "This onboarding link has expired. Please contact support for a new link." });
      }
      const p = prospect as any;
      if (p.agreementStatus !== "signed") {
        return res.status(409).json({ message: "Agreement must be signed before payment." });
      }
      if (p.paymentStatus === "paid") {
        return res.status(409).json({ message: "Payment has already been completed." });
      }

      const discountedMonthlyPriceCents = Math.round((p.discountedMonthlyPrice ?? 0) * 100);
      const setupFeeCents = Math.round((p.setupFee ?? 0) * 100);

      const lineItems: any[] = [];

      // Recurring monthly subscription
      if (discountedMonthlyPriceCents > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            unit_amount: discountedMonthlyPriceCents,
            product_data: {
              name: `Hubify Homes Beta — ${p.portfolioTier ?? "Standard"} Plan`,
              description: `Beta cohort #${p.betaCohortNumber ?? "?"} · ${p.discountPercentage ?? 0}% founding discount (locked for life)`,
            },
            recurring: { interval: "month" },
          },
          quantity: 1,
        });
      }

      // One-time setup fee (added to first invoice automatically in subscription mode)
      if (setupFeeCents > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            unit_amount: setupFeeCents,
            product_data: {
              name: "Platform Initialization Fee",
              description: "One-time database and platform setup fee",
            },
          },
          quantity: 1,
        });
      }

      // $0 total (e.g. 100% founding discount + no setup fee) — bypass Stripe entirely.
      if (lineItems.length === 0) {
        const now = new Date();
        await db.update(onboardingProspects).set({
          paymentStatus: "paid",
          paymentCompletedAt: now,
          stage: "platform_initializing",
          betaStripeCheckoutSessionId: "waived_100pct_discount",
        } as any).where(eq(onboardingProspects.id, prospect.id));
        return res.json({ free: true });
      }

      // Only require Stripe when there's an actual charge to collect.
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(503).json({ message: "Payment processing is not configured. Please contact support." });
      }

      const { getMasterStripe } = await import("./stripe");
      const stripe = getMasterStripe();

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const successUrl = `${baseUrl}/onboarding/${token}?payment=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/onboarding/${token}?payment=cancelled`;

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer_email: prospect.email ?? undefined,
        line_items: lineItems,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          prospect_token: token,
          prospect_email: prospect.email ?? "",
          org_name: prospect.company ?? "",
          portfolio_tier: p.portfolioTier ?? "",
          beta_cohort_number: String(p.betaCohortNumber ?? ""),
          discount_percentage: String(p.discountPercentage ?? 0),
        },
        subscription_data: {
          metadata: {
            prospect_token: token,
            hubify_beta: "true",
          },
        },
        payment_method_types: ["card"],
        billing_address_collection: "auto",
      });

      // Store checkout session ID on the prospect for audit
      await db.update(onboardingProspects).set({
        betaStripeCheckoutSessionId: session.id,
      } as any).where(eq(onboardingProspects.id, prospect.id));

      res.json({ checkoutUrl: session.url });
    } catch (error: any) {
      console.error("Error creating beta checkout session:", error);
      res.status(500).json({ message: error?.message ?? "Failed to create payment session." });
    }
  });

  // ── Onboarding Prospects ─────────────────────────────────────────────────
  app.post("/api/super-admin/onboarding-prospects/send-stuck-digest", isSuperAdmin, requireMFA, async (_req, res) => {
    try {
      const { runStuckProspectDigest } = await import("./scheduledTasks");
      const result = await runStuckProspectDigest();
      res.json(result);
    } catch (error) {
      console.error("Error sending stuck-prospect digest:", error);
      res.status(500).json({ message: "Failed to send digest", error: String(error) });
    }
  });

  app.get("/api/super-admin/onboarding-prospects", isSuperAdmin, requireMFA, async (_req, res) => {
    try {
      const prospects = await storage.listOnboardingProspects();
      res.json(prospects);
    } catch (error) {
      console.error("Error fetching onboarding prospects:", error);
      res.status(500).json({ message: "Failed to fetch onboarding prospects" });
    }
  });

  // ── Client Submissions (public-form leads, richly detailed) ──────────────
  app.get("/api/super-admin/submissions", isSuperAdmin, requireMFA, async (_req, res) => {
    try {
      const prospects = await storage.listOnboardingProspects();
      res.json(prospects);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  const VALID_SUBMISSION_STATUSES = ["new", "contacted", "demo_scheduled", "trial_started", "converted", "not_a_fit"] as const;

  app.patch("/api/super-admin/submissions/:id/status", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!VALID_SUBMISSION_STATUSES.includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      const updated = await storage.updateOnboardingProspect(id, { submissionStatus: status });
      res.json(updated);
    } catch (error) {
      console.error("Error updating submission status:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  app.patch("/api/super-admin/submissions/:id/notes", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      if (notes !== undefined && typeof notes !== "string" && notes !== null) {
        return res.status(400).json({ message: "notes must be a string or null" });
      }
      const updated = await storage.updateOnboardingProspect(id, { notes: notes ?? null });
      res.json(updated);
    } catch (error) {
      console.error("Error updating submission notes:", error);
      res.status(500).json({ message: "Failed to update notes" });
    }
  });

  app.post("/api/super-admin/onboarding-prospects", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { insertOnboardingProspectSchema, onboardingProspects } = await import("@shared/schema");
      const data = insertOnboardingProspectSchema.parse(req.body);
      const { ilike } = await import("drizzle-orm");
      const existing = await db
        .select({ id: onboardingProspects.id })
        .from(onboardingProspects)
        .where(ilike(onboardingProspects.email, data.email))
        .limit(1);
      if (existing.length > 0) {
        return res.status(409).json({ message: "A prospect with this email already exists in the pipeline." });
      }
      const prospect = await storage.createOnboardingProspect(data);
      res.status(201).json(prospect);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating onboarding prospect:", error);
      res.status(500).json({ message: "Failed to create onboarding prospect" });
    }
  });

  app.patch("/api/super-admin/onboarding-prospects/:id", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { id } = req.params;
      const { insertOnboardingProspectSchema } = await import("@shared/schema");
      const patchSchema = insertOnboardingProspectSchema.partial();
      const parseResult = patchSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid data", errors: parseResult.error.errors });
      }
      // Guard: once an agreement is signed, agreementContent is immutable via
      // generic PATCH. Changes must go through the dedicated sign-agreement
      // endpoint or an explicit admin override (future).
      if (parseResult.data.agreementContent !== undefined) {
        const existing = await storage.getOnboardingProspect(id);
        if (existing?.agreementSignedAt) {
          return res.status(422).json({
            message: "Agreement content cannot be modified after signing. Use the sign-agreement endpoint.",
          });
        }
      }

      // When stage is moved to beta_approved via the generic PATCH (e.g. the
      // kanban drag or stage dropdown), automatically mark the prospect as a
      // beta member so the resend-approval-email button becomes visible.
      // This does NOT send an email — the admin must use "Resend Approval Email"
      // to do that once any needed pricing fields are filled in.
      const patch: typeof parseResult.data = { ...parseResult.data };
      if (patch.stage === "beta_approved") {
        const existing = await storage.getOnboardingProspect(id);
        if (existing && !(existing as any).isBetaMember) {
          (patch as any).isBetaMember = true;
          (patch as any).betaApprovedAt = (patch as any).betaApprovedAt ?? new Date();
          (patch as any).approvalEmailSent = (existing as any).approvalEmailSent ?? false;
        }
      }

      const prospect = await storage.updateOnboardingProspect(id, patch);

      res.json(prospect);
    } catch (error) {
      console.error("Error updating onboarding prospect:", error);
      res.status(500).json({ message: "Failed to update onboarding prospect" });
    }
  });

  app.delete("/api/super-admin/onboarding-prospects/:id", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteOnboardingProspect(id);
      res.json({ message: "Prospect deleted" });
    } catch (error) {
      console.error("Error deleting onboarding prospect:", error);
      res.status(500).json({ message: "Failed to delete onboarding prospect" });
    }
  });

  // ── Beta Approval ─────────────────────────────────────────────────────────
  // POST /api/super-admin/onboarding-prospects/:id/approve-beta
  // Computes cohort slot, portfolio tier, and pricing from platform settings,
  // generates a unique onboarding token, sends the approval email, then —
  // only if the email succeeds — sets stage = "agreement_pending" and records
  // the email metadata. If the email fails, returns 502 and does NOT advance
  // the stage so the admin can retry via the resend endpoint.
  app.post("/api/super-admin/onboarding-prospects/:id/approve-beta", isSuperAdmin, requireMFA, async (req: any, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getOnboardingProspect(id);
      if (!existing) return res.status(404).json({ message: "Prospect not found" });
      if (existing.source !== "beta_application") {
        return res.status(400).json({ message: "This prospect is not a beta application." });
      }
      if ((existing as any).isBetaMember && !(existing as any).betaRemovedAt) {
        return res.status(409).json({ message: "This prospect is already an approved beta member." });
      }

      // Count CURRENTLY active beta members (isBetaMember = true, not removed)
      // — excludes the current prospect since we're approving them now.
      const [{ activeBetaCount }] = await db
        .select({ activeBetaCount: count() })
        .from(onboardingProspects)
        .where(
          and(
            eq(onboardingProspects.isBetaMember, true),
            isNull(onboardingProspects.betaRemovedAt),
            ne(onboardingProspects.id, id)
          )
        );

      // Load platform settings for caps and pricing
      const settings = await storage.getPlatformSettings();
      const bp = settings.betaPricing as any | undefined;
      const tier1DiscountPct = Number(bp?.tier1DiscountPct ?? bp?.discountPct ?? 50);
      const tier2DiscountPct = Number(bp?.tier2DiscountPct ?? 25);
      const tier1Cap = Number(bp?.tier1Cap ?? 10);
      const tier2Cap = Number(bp?.tier2Cap ?? 10);
      const totalCap = tier1Cap + tier2Cap;

      if (activeBetaCount >= totalCap) {
        return res.status(409).json({
          message: `Beta program is full (${totalCap} slots). Remove an existing beta member to free a slot.`,
        });
      }

      const cohortNumber = activeBetaCount + 1;
      const computedDiscountPct = cohortNumber <= tier1Cap ? tier1DiscountPct : tier2DiscountPct;

      // Determine portfolio tier from estimatedHomes
      const homes = (existing as any).estimatedHomes ?? 0;
      let portfolioTier: string;
      if (homes >= 101) portfolioTier = "Enterprise Portfolio";
      else if (homes >= 51) portfolioTier = "Operator Portfolio";
      else if (homes >= 26) portfolioTier = "Professional Portfolio";
      else if (homes >= 11) portfolioTier = "Growth Portfolio";
      else portfolioTier = "Starter Portfolio";

      // Look up pricing from pricingTiers (by homes range) or fall back to betaPricing.basePrice
      const pricingTiers = (settings.pricingTiers ?? []) as Array<{
        name: string; homesMin: number; homesMax: number;
        monthlyPrice: number; setupFee: number; startsAt?: boolean;
      }>;
      const matchedTier = pricingTiers.find(t => homes >= t.homesMin && homes <= t.homesMax);
      const computedMonthlyPrice = matchedTier
        ? Number(matchedTier.monthlyPrice)
        : Number(bp?.basePrice ?? 199);
      const computedSetupFee = matchedTier ? Number(matchedTier.setupFee) : 0;

      // ── Admin price overrides (optional — sent from approval dialog) ──────
      // Super Admin can override discount %, monthly price, and/or setup fee
      // on a per-user basis (e.g. 100% off for a free beta slot).
      const body = req.body as any;
      const discountPct = (typeof body.overrideDiscountPct === "number" && body.overrideDiscountPct >= 0 && body.overrideDiscountPct <= 100)
        ? body.overrideDiscountPct
        : computedDiscountPct;
      const originalMonthlyPrice = (typeof body.overrideListPrice === "number" && body.overrideListPrice >= 0)
        ? body.overrideListPrice
        : computedMonthlyPrice;
      const tierSetupFee = (typeof body.overrideSetupFee === "number" && body.overrideSetupFee >= 0)
        ? body.overrideSetupFee
        : computedSetupFee;
      // If a beta price is explicitly passed, use it; otherwise compute from list × discount
      const discountedMonthlyPrice = (typeof body.overrideBetaPrice === "number" && body.overrideBetaPrice >= 0)
        ? body.overrideBetaPrice
        : Math.round(originalMonthlyPrice * (1 - discountPct / 100) * 100) / 100;

      // Generate a cryptographically random URL-safe onboarding token (64 hex chars = 32 bytes).
      // The token expires in 7 days. We write it to the DB before attempting the email so the
      // token is available for the resend endpoint if the first email attempt fails.
      const crypto = await import("crypto");
      const onboardingToken = crypto.randomBytes(32).toString("hex");
      const tokenNow = new Date();
      const tokenExpiresAt = new Date(tokenNow.getTime() + 7 * 24 * 60 * 60 * 1000);
      const onboardingUrl = `https://hubifyhomesonline.com/onboarding/${onboardingToken}`;

      // Persist approval fields + token (stage stays unchanged until email succeeds)
      const now = new Date();
      const existingHistory: any[] = (existing as any).stageHistory ?? [];
      const newHistory = [
        ...existingHistory,
        { stage: "beta_approved", enteredAt: now.toISOString(), note: "Beta application approved" },
      ];

      await storage.updateOnboardingProspect(id, {
        isBetaMember: true,
        betaApprovedAt: now,
        betaCohortNumber: cohortNumber,
        portfolioTier,
        originalMonthlyPrice,
        discountPercentage: discountPct,
        discountedMonthlyPrice,
        setupFee: tierSetupFee,
        agreementStatus: "pending",
        onboardingToken,
        onboardingTokenCreatedAt: tokenNow,
        onboardingTokenExpiresAt: tokenExpiresAt,
        approvalEmailSent: false,
      } as any);

      // ── Send approval email ──────────────────────────────────────────────
      const fromEmail = process.env.RESEND_FROM_EMAIL;
      const recipientName = (existing as any).firstName ?? existing.name ?? "there";
      const orgName = existing.company ?? existing.name ?? "your organization";

      if (!resend || !fromEmail) {
        // Email not configured — treat as failure; do NOT advance the stage.
        return res.status(502).json({
          message: "Approval fields saved but email service is not configured (RESEND_FROM_EMAIL missing). Fix the configuration and use 'Resend Approval Email' to complete approval.",
        });
      }

      try {
        const sendResult = await resend.emails.send({
          from: fromEmail,
          to: existing.email,
          replyTo: "contact@hubifyhomes.com",
          subject: `${recipientName}, you've been approved for Hubify Beta!`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff">
              <div style="text-align:center;margin-bottom:28px">
                <img src="${getHubifyHomesEmailLogoUrl()}" alt="Hubify Homes" width="180" style="width:180px;max-width:180px;height:auto;display:block;margin:0 auto;border:0;outline:none;text-decoration:none;">
              </div>

              <h1 style="font-size:24px;font-weight:700;color:#0f172a;margin:0 0 8px">Congratulations, ${recipientName}!</h1>
              <p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 20px">
                We're excited to confirm that <strong>${orgName}</strong> has been approved for the Hubify Beta Program.
                Your spot is reserved — here are the details of your membership:
              </p>

              <!-- Approval details card -->
              <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:24px;margin-bottom:28px">
                <p style="font-size:12px;font-weight:700;color:#0d9488;margin:0 0 14px;text-transform:uppercase;letter-spacing:0.06em">Your Beta Membership Details</p>
                <table style="width:100%;border-collapse:collapse;font-size:14px">
                  <tr>
                    <td style="padding:7px 0;color:#64748b;width:200px;vertical-align:top">Organization</td>
                    <td style="padding:7px 0;color:#0f172a;font-weight:600">${orgName}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#64748b;vertical-align:top">Portfolio Tier</td>
                    <td style="padding:7px 0;color:#0f172a;font-weight:600">${portfolioTier}</td>
                  </tr>
                  ${homes > 0 ? `<tr>
                    <td style="padding:7px 0;color:#64748b;vertical-align:top">Properties</td>
                    <td style="padding:7px 0;color:#0f172a">${homes} properties</td>
                  </tr>` : ""}
                  <tr>
                    <td style="padding:7px 0;color:#64748b;vertical-align:top">Beta Cohort</td>
                    <td style="padding:7px 0;color:#0f172a">Member #${cohortNumber}</td>
                  </tr>
                  <tr><td colspan="2" style="padding:8px 0"><hr style="border:none;border-top:1px solid #ccfbf1;margin:0"/></td></tr>
                  <tr>
                    <td style="padding:7px 0;color:#64748b;vertical-align:top">List Price</td>
                    <td style="padding:7px 0;color:#94a3b8;text-decoration:line-through">$${originalMonthlyPrice.toFixed(2)}/mo</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#64748b;vertical-align:top">Beta Discount</td>
                    <td style="padding:7px 0;color:#0d9488;font-weight:600">${discountPct}% off — locked for life</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#64748b;vertical-align:top">Your Monthly Price</td>
                    <td style="padding:7px 0;color:#0f172a;font-weight:700;font-size:18px">$${discountedMonthlyPrice.toFixed(2)}<span style="font-size:13px;font-weight:400;color:#64748b">/mo</span></td>
                  </tr>
                  ${tierSetupFee > 0 ? `<tr>
                    <td style="padding:7px 0;color:#64748b;vertical-align:top">Database Init Fee</td>
                    <td style="padding:7px 0;color:#0f172a">$${tierSetupFee.toFixed(2)} one-time</td>
                  </tr>` : ""}
                </table>
              </div>

              <!-- Lifetime lock guarantee -->
              <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:16px;margin-bottom:28px">
                <p style="font-size:14px;color:#92400e;margin:0;line-height:1.6">
                  🔒 <strong>Your beta pricing is locked in for life</strong> — as long as your subscription remains in good standing, your rate will never increase.
                </p>
              </div>

              <!-- CTA -->
              <p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 24px">
                To get started, complete your Beta Agreement, set up payment, and initialize your platform. The button below will take you through the entire onboarding process step by step.
              </p>
              <div style="text-align:center;margin-bottom:32px">
                <a href="${onboardingUrl}"
                   style="display:inline-block;background:#0d9488;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:9px;letter-spacing:0.01em">
                  Start Onboarding →
                </a>
              </div>
              <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0 0 4px">
                This link expires in 7 days. If you need a new link, please email <a href="mailto:contact@hubifyhomes.com" style="color:#94a3b8">contact@hubifyhomes.com</a>
              </p>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 20px" />
              <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0">
                If you have questions please email <a href="mailto:contact@hubifyhomes.com" style="color:#0d9488">contact@hubifyhomes.com</a>
              </p>
            </div>
          `,
        });
        // Resend SDK can resolve with an error field instead of throwing
        if (sendResult.error) {
          const errMsg = (sendResult.error as any)?.message ?? JSON.stringify(sendResult.error);
          console.error("[approve-beta] Approval email returned error:", errMsg);
          return res.status(502).json({
            message: `Prospect approved but the approval email failed to send: ${errMsg}. Use "Resend Approval Email" to retry.`,
            emailError: errMsg,
          });
        }
      } catch (emailErr: any) {
        console.error("[approve-beta] Approval email failed:", emailErr?.message ?? emailErr);
        // Email failed — do NOT advance the stage. Return 502 so the admin sees the error.
        return res.status(502).json({
          message: `Prospect approved but the approval email failed to send: ${emailErr?.message ?? "Unknown error"}. Use "Resend Approval Email" to retry.`,
          emailError: emailErr?.message ?? String(emailErr),
        });
      }

      // ── Email succeeded — now commit the stage advance ───────────────────
      const updated = await storage.updateOnboardingProspect(id, {
        stage: "agreement_pending",
        stageHistory: newHistory,
        approvalEmailSent: true,
        approvalEmailSentAt: new Date(),
      } as any);

      await AuditLogger.log({
        req,
        action: "approve_beta_application",
        actionType: "update",
        resource: "onboarding_prospect",
        resourceId: id,
        severity: "info",
        success: true,
        metadata: { cohortNumber, portfolioTier, discountPct, originalMonthlyPrice, discountedMonthlyPrice, setupFee: tierSetupFee },
      });

      res.json(updated);
    } catch (error) {
      console.error("Error approving beta application:", error);
      res.status(500).json({ message: "Failed to approve beta application" });
    }
  });

  // POST /api/super-admin/onboarding-prospects/:id/resend-approval-email
  // Resends the approval email for a beta applicant whose first send failed.
  // Regenerates the onboarding URL from the stored token (or mints a fresh one
  // if the old token has expired) and advances stage to agreement_pending on success.
  app.post("/api/super-admin/onboarding-prospects/:id/resend-approval-email", isSuperAdmin, requireMFA, async (req: any, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getOnboardingProspect(id);
      if (!existing) return res.status(404).json({ message: "Prospect not found" });
      if (existing.source !== "beta_application") {
        return res.status(400).json({ message: "This prospect is not a beta application." });
      }
      if (!(existing as any).isBetaMember) {
        return res.status(400).json({ message: "Prospect has not been approved yet. Use 'Approve Beta Application' first." });
      }

      const fromEmail = process.env.RESEND_FROM_EMAIL;
      if (!resend || !fromEmail) {
        return res.status(503).json({ message: "Email service is not configured (RESEND_FROM_EMAIL missing)." });
      }

      // Always mint a fresh 7-day token on every resend
      const crypto = await import("crypto");
      const tokenNow = new Date();
      const onboardingToken = crypto.randomBytes(32).toString("hex");
      const tokenExpiresAt = new Date(tokenNow.getTime() + 7 * 24 * 60 * 60 * 1000);
      await storage.updateOnboardingProspect(id, {
        onboardingToken,
        onboardingTokenCreatedAt: tokenNow,
        onboardingTokenExpiresAt: tokenExpiresAt,
      } as any);

      const onboardingUrl = `https://hubifyhomesonline.com/onboarding/${onboardingToken}`;
      const recipientName = (existing as any).firstName ?? existing.name ?? "there";
      const orgName = existing.company ?? existing.name ?? "your organization";
      const portfolioTier = (existing as any).portfolioTier ?? "—";
      const originalMonthlyPrice = Number((existing as any).originalMonthlyPrice ?? 0);
      const discountPct = Number((existing as any).discountPercentage ?? 0);
      const discountedMonthlyPrice = Number((existing as any).discountedMonthlyPrice ?? 0);
      const tierSetupFee = Number((existing as any).setupFee ?? 0);
      const cohortNumber = (existing as any).betaCohortNumber ?? 1;
      const prospectHomes = (existing as any).estimatedHomes ?? 0;

      try {
        const resendResult = await resend.emails.send({
          from: fromEmail,
          to: existing.email,
          replyTo: "contact@hubifyhomes.com",
          subject: `${recipientName}, your Hubify Beta onboarding link is ready`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff">
              <div style="text-align:center;margin-bottom:28px">
                <img src="${getHubifyHomesEmailLogoUrl()}" alt="Hubify Homes" width="180" style="width:180px;max-width:180px;height:auto;display:block;margin:0 auto;border:0;outline:none;text-decoration:none;">
              </div>

              <h1 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px">Your onboarding link is ready</h1>
              <p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 20px">
                Hi ${recipientName} — here is your Hubify Beta onboarding link for <strong>${orgName}</strong>.
                We've generated a fresh link that expires in 7 days.
              </p>

              <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:24px;margin-bottom:28px">
                <p style="font-size:12px;font-weight:700;color:#0d9488;margin:0 0 14px;text-transform:uppercase;letter-spacing:0.06em">Your Beta Membership Details</p>
                <table style="width:100%;border-collapse:collapse;font-size:14px">
                  <tr>
                    <td style="padding:7px 0;color:#64748b;width:200px">Portfolio Tier</td>
                    <td style="padding:7px 0;color:#0f172a;font-weight:600">${portfolioTier}</td>
                  </tr>
                  ${prospectHomes > 0 ? `<tr><td style="padding:7px 0;color:#64748b">Properties</td><td style="padding:7px 0;color:#0f172a">${prospectHomes} properties</td></tr>` : ""}
                  <tr>
                    <td style="padding:7px 0;color:#64748b">Beta Cohort</td>
                    <td style="padding:7px 0;color:#0f172a">Member #${cohortNumber}</td>
                  </tr>
                  <tr><td colspan="2" style="padding:8px 0"><hr style="border:none;border-top:1px solid #ccfbf1;margin:0"/></td></tr>
                  <tr>
                    <td style="padding:7px 0;color:#64748b">List Price</td>
                    <td style="padding:7px 0;color:#94a3b8;text-decoration:line-through">$${originalMonthlyPrice.toFixed(2)}/mo</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#64748b">Beta Discount</td>
                    <td style="padding:7px 0;color:#0d9488;font-weight:600">${discountPct}% off — locked for life</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#64748b">Your Monthly Price</td>
                    <td style="padding:7px 0;color:#0f172a;font-weight:700;font-size:18px">$${discountedMonthlyPrice.toFixed(2)}<span style="font-size:13px;font-weight:400;color:#64748b">/mo</span></td>
                  </tr>
                  ${tierSetupFee > 0 ? `<tr><td style="padding:7px 0;color:#64748b">Database Init Fee</td><td style="padding:7px 0;color:#0f172a">$${tierSetupFee.toFixed(2)} one-time</td></tr>` : ""}
                </table>
              </div>

              <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:16px;margin-bottom:28px">
                <p style="font-size:14px;color:#92400e;margin:0;line-height:1.6">
                  🔒 <strong>Your beta pricing is locked in for life</strong> — as long as your subscription remains in good standing, your rate will never increase.
                </p>
              </div>

              <div style="text-align:center;margin-bottom:32px">
                <a href="${onboardingUrl}"
                   style="display:inline-block;background:#0d9488;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:9px;letter-spacing:0.01em">
                  Start Onboarding →
                </a>
              </div>
              <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0 0 4px">
                This link expires in 7 days. If you need another one, please email <a href="mailto:contact@hubifyhomes.com" style="color:#94a3b8">contact@hubifyhomes.com</a>
              </p>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 20px" />
              <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0">
                If you have questions please email <a href="mailto:contact@hubifyhomes.com" style="color:#0d9488">contact@hubifyhomes.com</a>
              </p>
            </div>
          `,
        });
        // Resend SDK can resolve with an error field instead of throwing
        if (resendResult.error) {
          const errMsg = (resendResult.error as any)?.message ?? JSON.stringify(resendResult.error);
          console.error("[resend-approval-email] Email returned error:", errMsg);
          await storage.updateOnboardingProspect(id, { approvalEmailSendError: errMsg } as any);
          return res.status(502).json({
            message: `Failed to send approval email: ${errMsg}. Please try again.`,
            emailError: errMsg,
          });
        }
      } catch (emailErr: any) {
        const errMsg = emailErr?.message ?? String(emailErr);
        console.error("[resend-approval-email] Email failed:", errMsg);
        await storage.updateOnboardingProspect(id, { approvalEmailSendError: errMsg } as any);
        return res.status(502).json({
          message: `Failed to send approval email: ${errMsg}. Please try again.`,
          emailError: errMsg,
        });
      }

      // Email succeeded — mark as sent, record resent timestamp, clear any prior error, advance stage
      const stageUpdate: any = {
        approvalEmailSent: true,
        approvalEmailLastResentAt: new Date(),
        approvalEmailSendError: null,
      };
      // Only set approvalEmailSentAt on the very first successful send
      if (!(existing as any).approvalEmailSent) {
        stageUpdate.approvalEmailSentAt = new Date();
      }
      if (existing.stage !== "agreement_pending") {
        const history: any[] = (existing as any).stageHistory ?? [];
        stageUpdate.stage = "agreement_pending";
        stageUpdate.stageHistory = [
          ...history,
          { stage: "agreement_pending", enteredAt: new Date().toISOString(), note: "Approval email resent" },
        ];
      }

      const updated = await storage.updateOnboardingProspect(id, stageUpdate);

      await AuditLogger.log({
        req,
        action: "resend_beta_approval_email",
        actionType: "update",
        resource: "onboarding_prospect",
        resourceId: id,
        severity: "info",
        success: true,
        metadata: { freshTokenMinted: true },
      });

      res.json(updated);
    } catch (error) {
      console.error("Error resending approval email:", error);
      res.status(500).json({ message: "Failed to resend approval email" });
    }
  });

  // GET /api/super-admin/onboarding-prospects/:id/approve-beta/preview
  // Returns the pricing that would be computed on approval WITHOUT committing anything.
  app.get("/api/super-admin/onboarding-prospects/:id/approve-beta/preview", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getOnboardingProspect(id);
      if (!existing) return res.status(404).json({ message: "Prospect not found" });
      if (existing.source !== "beta_application") {
        return res.status(400).json({ message: "Not a beta application." });
      }
      if ((existing as any).isBetaMember && !(existing as any).betaRemovedAt) {
        return res.status(409).json({ message: "Already an approved beta member." });
      }

      const [{ activeBetaCount }] = await db
        .select({ activeBetaCount: count() })
        .from(onboardingProspects)
        .where(
          and(
            eq(onboardingProspects.isBetaMember, true),
            isNull(onboardingProspects.betaRemovedAt),
            ne(onboardingProspects.id, id)
          )
        );

      const settings = await storage.getPlatformSettings();
      const bp = settings.betaPricing as any | undefined;
      const tier1DiscountPct = Number(bp?.tier1DiscountPct ?? bp?.discountPct ?? 50);
      const tier2DiscountPct = Number(bp?.tier2DiscountPct ?? 25);
      const tier1Cap = Number(bp?.tier1Cap ?? 10);
      const tier2Cap = Number(bp?.tier2Cap ?? 10);
      const totalCap = tier1Cap + tier2Cap;

      const slotsRemaining = totalCap - activeBetaCount;
      const cohortNumber = activeBetaCount + 1;
      const discountPct = cohortNumber <= tier1Cap ? tier1DiscountPct : tier2DiscountPct;

      const homes = (existing as any).estimatedHomes ?? 0;
      let portfolioTier: string;
      if (homes >= 101) portfolioTier = "Enterprise Portfolio";
      else if (homes >= 51) portfolioTier = "Operator Portfolio";
      else if (homes >= 26) portfolioTier = "Professional Portfolio";
      else if (homes >= 11) portfolioTier = "Growth Portfolio";
      else portfolioTier = "Starter Portfolio";

      const pricingTiers = (settings.pricingTiers ?? []) as Array<{
        name: string; homesMin: number; homesMax: number;
        monthlyPrice: number; setupFee: number;
      }>;
      const matchedTier = pricingTiers.find(t => homes >= t.homesMin && homes <= t.homesMax);
      const originalMonthlyPrice = matchedTier ? Number(matchedTier.monthlyPrice) : Number(bp?.basePrice ?? 199);
      const tierSetupFee = matchedTier ? Number(matchedTier.setupFee) : 0;
      const discountedMonthlyPrice = Math.round(originalMonthlyPrice * (1 - discountPct / 100) * 100) / 100;

      res.json({
        prospectId: id,
        prospectName: existing.name,
        company: existing.company,
        estimatedHomes: homes,
        cohortNumber,
        portfolioTier,
        discountPct,
        originalMonthlyPrice,
        discountedMonthlyPrice,
        setupFee: tierSetupFee,
        totalSlotsAvailable: totalCap,
        slotsRemaining,
        isFull: slotsRemaining <= 0,
        agreementStatus: "pending",
      });
    } catch (error) {
      console.error("Error previewing beta approval:", error);
      res.status(500).json({ message: "Failed to compute beta approval preview" });
    }
  });

  app.post("/api/super-admin/onboarding-prospects/:id/send-welcome-email", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { id } = req.params;
      const prospect = await storage.getOnboardingProspect(id);
      if (!prospect) return res.status(404).json({ message: "Prospect not found" });
      if (prospect.stage !== "welcome") {
        return res.status(400).json({ message: "Prospect must be in the Welcome stage to send the welcome email" });
      }

      if (!resend) {
        return res.status(503).json({
          message: "Email delivery is not configured (RESEND_API_KEY missing). Set the key and try again.",
          emailSent: false,
        });
      }

      const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.SUPPORT_EMAIL_FROM || "noreply@hubify.com";
      const { error: welcomeEmailError } = await resend.emails.send({
        to: prospect.email,
        from: fromEmail,
        subject: `Welcome to Hubify${prospect.company ? ` — ${prospect.company}` : ""}!`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#4F46E5;">Welcome to Hubify!</h2>
            <p>Hi ${prospect.name},</p>
            <p>We're thrilled to have you on board${prospect.company ? ` at <strong>${prospect.company}</strong>` : ""}. Your account is all set up and ready to go.</p>
            <p>Log in any time at <a href="https://hubify.com">hubify.com</a> to get started.</p>
            <p style="color:#6b7280;font-size:14px;margin-top:30px;">Best regards,<br>The Hubify Team</p>
          </div>
        `,
        text: `Hi ${prospect.name},\n\nWelcome to Hubify! Your account is all set up. Log in at https://hubify.com.\n\nBest regards,\nThe Hubify Team`,
      });
      if (welcomeEmailError) throw new Error(welcomeEmailError.message);

      const updated = await storage.updateOnboardingProspect(id, {
        welcomeEmailSentAt: new Date(),
      });
      res.json({ ...updated, emailSent: true });
    } catch (error) {
      console.error("Error sending welcome email:", error);
      res.status(500).json({ message: "Failed to send welcome email" });
    }
  });

  const confirmationEmailCooldowns = new Map<string, number>();
  const CONFIRMATION_EMAIL_COOLDOWN_MS = 60_000;

  app.post("/api/super-admin/onboarding-prospects/:id/send-confirmation-email", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { id } = req.params;

      const lastSent = confirmationEmailCooldowns.get(id);
      if (lastSent !== undefined) {
        const elapsed = Date.now() - lastSent;
        if (elapsed < CONFIRMATION_EMAIL_COOLDOWN_MS) {
          const remaining = Math.ceil((CONFIRMATION_EMAIL_COOLDOWN_MS - elapsed) / 1000);
          return res.status(429).json({
            message: `A confirmation email was just sent. Please wait ${remaining} more second${remaining === 1 ? "" : "s"} before sending again.`,
            retryAfterSeconds: remaining,
          });
        }
      }
      confirmationEmailCooldowns.set(id, Date.now());

      const prospect = await storage.getOnboardingProspect(id);
      if (!prospect) return res.status(404).json({ message: "Prospect not found" });

      const fromEmail = process.env.RESEND_FROM_EMAIL;
      const nameParts = (prospect.name || "").trim().split(/\s+/);
      const firstName = nameParts[0] || prospect.name || "there";
      const lastName = nameParts.slice(1).join(" ") || "";
      const company = prospect.company || "";
      const email = prospect.email;

      let emailStatus: string;
      let emailSentAt: Date | null = null;

      if (!resend || !fromEmail) {
        emailStatus = "failed: email service not configured";
        const updated = await storage.updateOnboardingProspect(id, {
          confirmationEmailStatus: emailStatus,
        });
        return res.json({ ...updated, emailSent: false, message: "Email delivery is not configured (RESEND_API_KEY or RESEND_FROM_EMAIL missing)." });
      }

      try {
        const customTpl = await storage.getProspectConfirmationEmailTemplate().catch(() => undefined);

        if (customTpl) {
          const applyMergeTags = (text: string) =>
            text
              .replace(/\{\{firstName\}\}/gi, firstName)
              .replace(/\{\{lastName\}\}/gi, lastName)
              .replace(/\{\{name\}\}/gi, prospect.name || "")
              .replace(/\{\{company\}\}/gi, company)
              .replace(/\{\{email\}\}/gi, email)
              .replace(/\{\{suggestedTier\}\}/gi, prospect.suggestedTier || "")
              .replace(/\{\{estimatedHomes\}\}/gi, String(prospect.estimatedHomes ?? ""));

          await resend.emails.send({
            from: fromEmail,
            to: email,
            subject: applyMergeTags(customTpl.subject),
            html: applyMergeTags(customTpl.body),
          });
        } else {
          const tierSection = prospect.suggestedTier
            ? `<tr>
                 <td style="padding:8px 0;color:#64748b;font-size:14px;width:160px;vertical-align:top">Suggested plan</td>
                 <td style="padding:8px 0;font-size:14px;vertical-align:top">
                   <span style="display:inline-block;background:#ccfbf1;color:#0d9488;font-weight:700;padding:3px 10px;border-radius:20px">${prospect.suggestedTier}</span>
                 </td>
               </tr>`
            : "";

          await resend.emails.send({
            from: fromEmail,
            to: email,
            subject: `We received your Hubify inquiry — here's what happens next`,
            html: `
              <div style="font-family:sans-serif;max-width:580px;margin:0 auto;padding:32px 24px;background:#ffffff">
                <div style="text-align:center;margin-bottom:28px">
                  <img src="${getHubifyHomesEmailLogoUrl()}" alt="Hubify Homes" width="140" style="width:140px;max-width:140px;height:auto;display:block;margin:0 auto;border:0;outline:none;text-decoration:none;">
                </div>
                <h1 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px">Hi ${firstName}, thanks for reaching out!</h1>
                <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px">
                  We've received your inquiry${company ? ` for <strong>${company}</strong>` : ""} and our team will be in touch shortly.
                  Here's a summary of what you submitted:
                </p>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:28px">
                  <table style="width:100%;border-collapse:collapse">
                    <tr>
                      <td style="padding:8px 0;color:#64748b;font-size:14px;width:160px;vertical-align:top">Name</td>
                      <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top">${prospect.name}</td>
                    </tr>
                    ${company ? `<tr>
                      <td style="padding:8px 0;color:#64748b;font-size:14px;vertical-align:top">Organization</td>
                      <td style="padding:8px 0;color:#0f172a;font-size:14px;vertical-align:top">${company}</td>
                    </tr>` : ""}
                    ${prospect.estimatedHomes ? `<tr>
                      <td style="padding:8px 0;color:#64748b;font-size:14px;vertical-align:top">Properties managed</td>
                      <td style="padding:8px 0;color:#0f172a;font-size:14px;vertical-align:top">${prospect.estimatedHomes}</td>
                    </tr>` : ""}
                    ${tierSection}
                  </table>
                </div>
                <h2 style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 12px">What happens next?</h2>
                <ol style="padding-left:20px;margin:0 0 28px;color:#475569;font-size:14px;line-height:1.8">
                  <li>A member of our team will review your submission — usually within one business day.</li>
                  <li>We'll reach out to schedule a short discovery call so we can tailor Hubify to your workflow.</li>
                  <li>You'll receive access to a personalized trial environment matched to your suggested plan.</li>
                </ol>
                <div style="text-align:center;margin-bottom:32px">
                  <a href="https://hubifyhomes.com"
                     style="display:inline-block;background:#0d9488;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px">
                    Learn more about Hubify
                  </a>
                </div>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px" />
                <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0">
                  You received this email because you submitted an inquiry at Hubify Homes.<br/>
                  If you didn't submit this form, you can safely ignore this message.
                </p>
              </div>
            `,
          });
        }

        emailSentAt = new Date();
        emailStatus = "sent";
      } catch (err: any) {
        console.warn("[send-confirmation-email] failed:", err);
        emailStatus = `failed: ${err?.message ?? String(err)}`.slice(0, 255);
        confirmationEmailCooldowns.delete(id);
      }

      const updated = await storage.updateOnboardingProspect(id, {
        confirmationEmailSentAt: emailSentAt ?? undefined,
        confirmationEmailStatus: emailStatus,
      });

      res.json({ ...updated, emailSent: emailStatus === "sent" });
    } catch (error) {
      console.error("Error sending confirmation email:", error);
      res.status(500).json({ message: "Failed to send confirmation email" });
    }
  });

  // ── Send demo access email (resend / first-time) ─────────────────────────
  app.post("/api/super-admin/onboarding-prospects/:id/send-demo-email", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { id } = req.params;
      const prospect = await storage.getOnboardingProspect(id);
      if (!prospect) return res.status(404).json({ message: "Prospect not found" });

      const fromEmail = process.env.RESEND_FROM_EMAIL;
      if (!resend || !fromEmail) {
        return res.status(503).json({ message: "Email service not configured", emailSent: false });
      }

      const firstName = (prospect.firstName ?? prospect.name?.split(" ")[0]) || "there";
      const company = prospect.company || "your company";

      try {
        await resend.emails.send({
          from: fromEmail,
          to: prospect.email,
          subject: `Your Hubify demo access`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff">
              <div style="text-align:center;margin-bottom:28px">
                <img src="${getHubifyHomesEmailLogoUrl()}" alt="Hubify Homes" width="180" style="width:180px;max-width:180px;height:auto;display:block;margin:0 auto;border:0;outline:none;text-decoration:none;">
              </div>
              <h1 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px">Hi ${firstName}, your demo is ready!</h1>
              <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px">
                Here are your credentials to explore the Hubify demo environment for <strong>${company}</strong>.
                Feel free to click around — everything is pre-loaded with sample data.
              </p>
              <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:20px;margin-bottom:28px">
                <p style="font-size:14px;font-weight:700;color:#0d9488;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.05em">Demo access credentials</p>
                <table style="width:100%;font-size:14px;border-collapse:collapse">
                  <tr>
                    <td style="padding:5px 0;color:#64748b;width:140px">Demo URL</td>
                    <td style="padding:5px 0"><a href="https://demo.hubifyhomesonline.com" style="color:#0d9488;font-weight:600">demo.hubifyhomesonline.com</a></td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;color:#64748b">Staff login</td>
                    <td style="padding:5px 0;color:#0f172a;font-weight:600">demo@hubifyhomesonline.com</td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;color:#64748b">Password</td>
                    <td style="padding:5px 0;color:#0f172a;font-weight:600">Demo2026!</td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;color:#64748b;vertical-align:top">Client portal</td>
                    <td style="padding:5px 0;color:#0f172a">client@demo.hubifyhomesonline.com<br/><span style="font-weight:600">DemoClient2026!</span></td>
                  </tr>
                </table>
              </div>
              <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 24px">
                The demo includes 10 FL properties, task and invoice workflows, client portal access, staff scheduling, and more. It's a shared environment — your session won't affect others.
              </p>
              <div style="text-align:center;margin-bottom:32px">
                <a href="https://demo.hubifyhomesonline.com" style="display:inline-block;background:#0d9488;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px">
                  Launch Demo
                </a>
              </div>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px" />
              <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0">
                If you have questions, please email <a href="mailto:contact@hubifyhomes.com" style="color:#94a3b8">contact@hubifyhomes.com</a><br/>
                You received this because you requested a demo at Hubify Homes.
              </p>
            </div>
          `,
        });
      } catch (err: any) {
        const errMsg = `failed: ${err?.message ?? String(err)}`.slice(0, 255);
        await storage.updateOnboardingProspect(id, { demoEmailError: errMsg } as any)
          .catch(() => {});
        return res.status(500).json({ message: "Failed to send demo email", emailSent: false });
      }

      const updated = await storage.updateOnboardingProspect(id, {
        demoAccessSent: true,
        demoEmailSentAt: new Date(),
        demoEmailError: null,
        stage: (prospect.stage === "demo_requested" ? "demo_sent" : prospect.stage) as any,
      } as any);
      res.json({ ...updated, emailSent: true });
    } catch (error) {
      console.error("Error sending demo email:", error);
      res.status(500).json({ message: "Failed to send demo email" });
    }
  });

  // ── Stage email templates ────────────────────────────────────────────────
  app.get("/api/super-admin/stage-email-templates", isSuperAdmin, requireMFA, async (_req, res) => {
    try {
      const templates = await storage.listOnboardingStageEmailTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching stage email templates:", error);
      res.status(500).json({ message: "Failed to fetch stage email templates" });
    }
  });

  app.put("/api/super-admin/stage-email-templates/:stage", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { stage } = req.params;
      const { insertOnboardingStageEmailTemplateSchema } = await import("@shared/schema");
      const result = insertOnboardingStageEmailTemplateSchema.safeParse({ ...req.body, stage });
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.errors });
      }
      const template = await storage.upsertOnboardingStageEmailTemplate(result.data);
      res.json(template);
    } catch (error) {
      console.error("Error upserting stage email template:", error);
      res.status(500).json({ message: "Failed to save stage email template" });
    }
  });

  app.delete("/api/super-admin/stage-email-templates/:stage", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      await storage.deleteOnboardingStageEmailTemplate(req.params.stage);
      res.json({ message: "Template deleted" });
    } catch (error) {
      console.error("Error deleting stage email template:", error);
      res.status(500).json({ message: "Failed to delete stage email template" });
    }
  });

  // ── Prospect confirmation email template ─────────────────────────────────
  app.get("/api/super-admin/prospect-confirmation-template", isSuperAdmin, requireMFA, async (_req, res) => {
    try {
      const template = await storage.getProspectConfirmationEmailTemplate();
      res.json(template ?? null);
    } catch (error) {
      console.error("Error fetching prospect confirmation template:", error);
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  app.put("/api/super-admin/prospect-confirmation-template", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const result = z.object({
        subject: z.string().min(1, "Subject is required"),
        body: z.string().min(1, "Body is required"),
      }).safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.errors });
      }
      const template = await storage.upsertProspectConfirmationEmailTemplate(result.data);
      res.json(template);
    } catch (error) {
      console.error("Error saving prospect confirmation template:", error);
      res.status(500).json({ message: "Failed to save template" });
    }
  });

  app.delete("/api/super-admin/prospect-confirmation-template", isSuperAdmin, requireMFA, async (_req, res) => {
    try {
      await storage.deleteProspectConfirmationEmailTemplate();
      res.json({ message: "Template reset to default" });
    } catch (error) {
      console.error("Error resetting prospect confirmation template:", error);
      res.status(500).json({ message: "Failed to reset template" });
    }
  });

  // ── Prospect email history ───────────────────────────────────────────────
  app.get("/api/super-admin/onboarding-prospects/:id/emails", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const emails = await storage.listOnboardingProspectEmails(req.params.id);
      res.json(emails);
    } catch (error) {
      console.error("Error fetching prospect emails:", error);
      res.status(500).json({ message: "Failed to fetch prospect emails" });
    }
  });

  app.post("/api/super-admin/onboarding-prospects/:id/send-stage-email", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { id } = req.params;
      const prospect = await storage.getOnboardingProspect(id);
      if (!prospect) return res.status(404).json({ message: "Prospect not found" });

      // Enum mirrors OnboardingStage exactly (shared/schema.ts)
      const ONBOARDING_STAGES = [
        "inquiry", "agreement", "payment_setup", "initial_payment", "welcome", "dropped",
      ] as const;
      const sendStageEmailSchema = z.object({
        stage: z.enum(ONBOARDING_STAGES),
        subject: z.string().min(1),
        body: z.string().min(1),
      });
      const parsed = sendStageEmailSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
      }
      const { stage, subject, body } = parsed.data;

      // Apply merge tags before sending.
      // Use the selected template stage for {{stage}} so the tag reflects the
      // stage the template is written for, not the prospect's current stage.
      const mergeContext = {
        name: prospect.name,
        email: prospect.email,
        company: prospect.company ?? "",
        phone: prospect.phone ?? "",
        stage: stage.replace(/_/g, " "),
      };
      const mergedSubject = applyProspectMergeTags(subject, mergeContext);
      const mergedBody = applyProspectMergeTags(body, mergeContext);

      if (!resend) {
        return res.status(503).json({
          message: "Email delivery is not configured (RESEND_API_KEY missing). Set the key and try again.",
          emailSent: false,
        });
      }

      const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.SUPPORT_EMAIL_FROM || "noreply@hubify.com";
      const { error: stageEmailError } = await resend.emails.send({
        to: prospect.email,
        from: fromEmail,
        subject: mergedSubject,
        html: mergedBody.replace(/\n/g, "<br>"),
        text: mergedBody,
      });
      if (stageEmailError) throw new Error(stageEmailError.message);

      // Only log after confirmed delivery
      const emailLog = await storage.createOnboardingProspectEmail({
        prospectId: id,
        stage,
        subject: mergedSubject,
        body: mergedBody,
        sentBy: "manual",
      });

      res.json({ ...emailLog, emailSent: true });
    } catch (error) {
      console.error("Error sending stage email:", error);
      res.status(500).json({ message: "Failed to send stage email" });
    }
  });

  app.post("/api/super-admin/onboarding-prospects/:id/sign-agreement", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { id } = req.params;
      const prospect = await storage.getOnboardingProspect(id);
      if (!prospect) return res.status(404).json({ message: "Prospect not found" });
      if (prospect.agreementSignedAt) {
        return res.status(409).json({ message: "Agreement already signed" });
      }
      // Only allow signing at agreement-or-later stages (matches UI eligibility)
      const AGREEMENT_ELIGIBLE: OnboardingStage[] = ["agreement", "payment_setup", "initial_payment", "welcome"];
      if (!AGREEMENT_ELIGIBLE.includes(prospect.stage)) {
        return res.status(422).json({ message: `Agreement can only be signed from the agreement stage or later (current: ${prospect.stage})` });
      }
      const { agreementContent } = req.body;
      const patch: Partial<InsertOnboardingProspect> = {
        agreementSignedAt: new Date(),
        // Persist any unsaved agreement text sent alongside the sign action
        ...(typeof agreementContent === "string" && agreementContent.trim()
          ? { agreementContent: agreementContent.trim() }
          : {}),
      };
      // Auto-advance from agreement to payment_setup
      if (prospect.stage === "agreement") {
        patch.stage = "payment_setup" as OnboardingStage;
      }
      const updated = await storage.updateOnboardingProspect(id, patch);
      res.json(updated);
    } catch (error) {
      console.error("Error signing agreement:", error);
      res.status(500).json({ message: "Failed to sign agreement" });
    }
  });

  app.post("/api/super-admin/onboarding-prospects/:id/convert-to-org", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const { id } = req.params;
      const prospect = await storage.getOnboardingProspect(id);
      if (!prospect) return res.status(404).json({ message: "Prospect not found" });
      if (prospect.orgId) {
        return res.status(409).json({ message: "Prospect is already linked to an organization", orgId: prospect.orgId });
      }

      const { insertOrgSchema, insertOrgSubscriptionSchema } = await import("@shared/schema");

      // Map suggestedTier (from public form) → org_subscriptions tier
      function mapToSubscriptionTier(suggested: string | null): "starter" | "pro" | "grow" | "enterprise" {
        if (!suggested) return "starter";
        const s = suggested.toLowerCase();
        if (s.includes("growth") || s === "grow" || s === "pricing_growth") return "grow";
        if (s.includes("professional") || s === "pro" || s === "pricing_professional") return "pro";
        if (s.includes("enterprise")) return "enterprise";
        return "starter";
      }

      const orgData = insertOrgSchema.parse({
        name: prospect.company || prospect.name,
        phone: prospect.phone || undefined,
        isActive: true,
        orgStatus: "onboarding",
      });
      const org = await storage.createOrg(orgData);

      // Create trial subscription (30-day trial)
      const trialStart = new Date();
      const trialEnd = new Date(trialStart);
      trialEnd.setDate(trialEnd.getDate() + 30);

      const subData = insertOrgSubscriptionSchema.parse({
        orgId: org.id,
        tier: mapToSubscriptionTier(prospect.suggestedTier),
        status: "trialing",
        currentPeriodStart: trialStart,
        currentPeriodEnd: trialEnd,
        setupFeeCents: Math.round(((prospect as any).setupFee ?? 0) * 100),
      });
      await storage.upsertOrgSubscription(subData);

      // Create setup progress record
      await storage.createOrgSetupProgress(org.id);

      // Update prospect: mark as converted, record timestamp
      const now = new Date();
      const updated = await storage.updateOnboardingProspect(id, {
        orgId: org.id,
        stage: "converted",
        convertedAt: now,
      } as any);

      // Send invite/welcome email to new org admin
      const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@hubifyhomes.com";
      const loginUrl = `${req.protocol}://${req.get("host")}/staff/login`;
      const trialEndFormatted = trialEnd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      const firstName = (prospect.firstName || prospect.name.split(" ")[0] || prospect.name);
      const orgName = org.name;

      if (resend) {
        try {
          await resend.emails.send({
            from: fromEmail,
            to: prospect.email,
            subject: `You're invited to Hubify — ${orgName} is ready`,
            html: `
              <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff">
                <div style="text-align:center;margin-bottom:28px">
                  <img src="${getHubifyHomesEmailLogoUrl()}" alt="Hubify Homes" width="180" style="width:180px;max-width:180px;height:auto;display:block;margin:0 auto;border:0;outline:none;text-decoration:none;">
                </div>
                <h1 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px">Welcome, ${firstName}! Your organization is ready.</h1>
                <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 20px">
                  Your Hubify organization <strong>${orgName}</strong> has been set up and is ready to use.
                  You have a <strong>30-day free trial</strong> — no credit card needed — running through <strong>${trialEndFormatted}</strong>.
                </p>
                <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:20px;margin-bottom:28px">
                  <p style="font-size:14px;font-weight:700;color:#0d9488;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em">What to do first</p>
                  <ol style="padding-left:18px;margin:0;color:#0f172a;font-size:14px;line-height:1.9">
                    <li>Sign in at the link below and set up your company profile.</li>
                    <li>Add your first property and invite a team member.</li>
                    <li>Explore the dashboard — tasks, billing, and scheduling are all ready for you.</li>
                  </ol>
                </div>
                <div style="text-align:center;margin-bottom:32px">
                  <a href="${loginUrl}" style="display:inline-block;background:#0d9488;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px">
                    Sign In to Hubify
                  </a>
                </div>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px" />
                <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0">
                  If you have questions, please email <a href="mailto:contact@hubifyhomes.com" style="color:#94a3b8">contact@hubifyhomes.com</a><br/>
                  Trial ends ${trialEndFormatted}. No charges until you upgrade.
                </p>
              </div>
            `,
          });
        } catch (emailErr) {
          console.error("[CONVERT] Failed to send invite email:", emailErr);
        }
      }

      res.status(201).json({
        prospect: updated,
        org,
        summary: {
          orgName,
          adminEmail: prospect.email,
          trialEndsAt: trialEnd.toISOString(),
          trialEndFormatted,
        },
      });
    } catch (error) {
      console.error("Error converting prospect to org:", error);
      res.status(500).json({ message: "Failed to convert prospect to organization" });
    }
  });

  // Org setup progress endpoints
  // Middleware that permits either a staff session (isAuthenticated) or an active super-admin session.
  const isAuthenticatedOrSuperAdmin = (req: any, res: any, next: any) => {
    const staffUser = (req.session as any)?.staffUser;
    if (staffUser?.id) {
      // Mimic what isAuthenticated does: attach req.user claims
      req.user = {
        claims: {
          sub: staffUser.id,
          orgId: staffUser.orgId,
          role: staffUser.role,
          email: staffUser.email,
          first_name: staffUser.firstName,
          last_name: staffUser.lastName,
        },
      };
      return next();
    }
    const superAdmin = (req.session as any)?.superAdmin;
    if (superAdmin?.authenticated) {
      req.user = { claims: { sub: "super_admin", orgId: null, role: "super_admin", email: superAdmin.username } };
      return next();
    }
    return res.status(401).json({ message: "Unauthorized" });
  };

  app.get("/api/orgs/:orgId/setup-progress", isAuthenticatedOrSuperAdmin, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      const user = req.user as any;
      const userOrgId = user?.claims?.orgId;
      const isSuperAdminUser = user?.claims?.role === "super_admin" || !!(req.session as any)?.superAdmin?.authenticated;
      if (!isSuperAdminUser && userOrgId !== orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const progress = await storage.getOrgSetupProgress(orgId);
      if (!progress) return res.status(404).json({ message: "Setup progress not found" });
      res.json(progress);
    } catch (error) {
      console.error("Error fetching setup progress:", error);
      res.status(500).json({ message: "Failed to fetch setup progress" });
    }
  });

  app.patch("/api/orgs/:orgId/setup-progress", isAuthenticatedOrSuperAdmin, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      const user = req.user as any;
      const userOrgId = user?.claims?.orgId;
      const isSuperAdminUser = user?.claims?.role === "super_admin" || !!(req.session as any)?.superAdmin?.authenticated;
      if (!isSuperAdminUser && userOrgId !== orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const allowed = ["hasAddedProperty", "hasInvitedStaff", "hasConnectedStripe", "hasImportedClients", "hasConfiguredService"];
      const patch: Record<string, boolean> = {};
      for (const key of allowed) {
        if (key in req.body) patch[key] = Boolean(req.body[key]);
      }
      const progress = await storage.updateOrgSetupProgress(orgId, patch as any);
      res.json(progress);
    } catch (error) {
      console.error("Error updating setup progress:", error);
      res.status(500).json({ message: "Failed to update setup progress" });
    }
  });

  // Custom Fields endpoints
  app.get("/api/custom-fields", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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
      const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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
      const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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
      const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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
      const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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
      const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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
      const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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
      const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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
      const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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
      const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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
      
      const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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
        const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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
      const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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
      const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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
      const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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
      const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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
  // Visit Report Routes
  // ============================================================

  // Get visit report for a task (creates one if none exists)
  app.get("/api/tasks/:taskId/visit-report", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      if (isNaN(taskId)) return res.status(400).json({ message: "Invalid task ID" });
      const orgId = req.user?.claims?.orgId || req.user?.orgId;
      if (!orgId) return res.status(400).json({ message: "Organization not found" });
      const { rows } = await (await import("./db")).pool.query(
        `SELECT * FROM visit_reports WHERE task_id = $1 AND org_id = $2 ORDER BY created_at DESC LIMIT 1`,
        [taskId, orgId]
      );
      if (rows.length === 0) return res.status(404).json({ message: "No visit report found" });
      res.json(rows[0]);
    } catch (err: any) {
      console.error("Error fetching visit report:", err);
      res.status(500).json({ message: "Failed to fetch visit report" });
    }
  });

  // Create or upsert visit report for a task
  app.post("/api/tasks/:taskId/visit-report", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      if (isNaN(taskId)) return res.status(400).json({ message: "Invalid task ID" });
      const orgId = req.user?.claims?.orgId || req.user?.orgId;
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!orgId) return res.status(400).json({ message: "Organization not found" });

      const task = await storage.getTask(taskId);
      if (!task) return res.status(404).json({ message: "Task not found" });
      if (task.orgId !== orgId) return res.status(403).json({ message: "Forbidden" });

      const { status = "draft", notes, recommendations, publishedToPortal } = req.body;
      const db = await import("./db");

      // Check for existing report
      const { rows: existing } = await db.pool.query(
        `SELECT id FROM visit_reports WHERE task_id = $1 AND org_id = $2 ORDER BY created_at DESC LIMIT 1`,
        [taskId, orgId]
      );

      let row;
      if (existing.length > 0) {
        const vrId = existing[0].id;
        const now = new Date();
        const { rows } = await db.pool.query(
          `UPDATE visit_reports SET
            status = $1, notes = COALESCE($2, notes), recommendations = COALESCE($3, recommendations),
            published_to_portal = COALESCE($4, published_to_portal),
            completed_at = CASE WHEN $1 IN ('completed','published') AND completed_at IS NULL THEN $5 ELSE completed_at END,
            completed_by = CASE WHEN $1 IN ('completed','published') AND completed_by IS NULL THEN $6 ELSE completed_by END,
            published_at = CASE WHEN $1 = 'published' AND published_at IS NULL THEN $5 ELSE published_at END,
            updated_at = $5
          WHERE id = $7 RETURNING *`,
          [status, notes ?? null, recommendations ?? null, publishedToPortal ?? null, now, userId, vrId]
        );
        row = rows[0];
      } else {
        const title = task.title || `Visit Report — ${new Date().toLocaleDateString()}`;
        const propertyId = (task as any).propertyId || null;
        const now = new Date();
        const { rows } = await db.pool.query(
          `INSERT INTO visit_reports (org_id, task_id, property_id, title, status, notes, recommendations,
            published_to_portal, completed_at, completed_by, published_at, created_by, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,
            CASE WHEN $5 IN ('completed','published') THEN $9 ELSE NULL END,
            CASE WHEN $5 IN ('completed','published') THEN $10 ELSE NULL END,
            CASE WHEN $5 = 'published' THEN $9 ELSE NULL END,
            $10,$9,$9) RETURNING *`,
          [orgId, taskId, propertyId, title, status, notes ?? null, recommendations ?? null,
           publishedToPortal ?? false, now, userId]
        );
        row = rows[0];
      }

      // If published, update checklist items' task to completed
      if (status === "completed" || status === "published") {
        const currentTask = await storage.getTask(taskId);
        if (currentTask && (currentTask as any).status !== "completed") {
          await storage.updateTask(taskId, { status: "completed", completedAt: new Date() } as any);
        }
      }

      res.status(201).json(row);
    } catch (err: any) {
      console.error("Error saving visit report:", err);
      res.status(500).json({ message: "Failed to save visit report" });
    }
  });

  // Update visit report by ID
  app.patch("/api/visit-reports/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const orgId = req.user?.claims?.orgId || req.user?.orgId;
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!orgId) return res.status(400).json({ message: "Organization not found" });
      const db = await import("./db");
      const { rows: existing } = await db.pool.query(
        `SELECT * FROM visit_reports WHERE id = $1 AND org_id = $2`, [id, orgId]
      );
      if (existing.length === 0) return res.status(404).json({ message: "Visit report not found" });
      const { status, notes, recommendations, publishedToPortal, overallResult } = req.body;
      const now = new Date();
      const { rows } = await db.pool.query(
        `UPDATE visit_reports SET
          status = COALESCE($1, status),
          notes = COALESCE($2, notes),
          recommendations = COALESCE($3, recommendations),
          published_to_portal = COALESCE($4, published_to_portal),
          overall_result = COALESCE($5, overall_result),
          completed_at = CASE WHEN $1 IN ('completed','published') AND completed_at IS NULL THEN $6 ELSE completed_at END,
          completed_by = CASE WHEN $1 IN ('completed','published') AND completed_by IS NULL THEN $7 ELSE completed_by END,
          published_at = CASE WHEN $1 = 'published' AND published_at IS NULL THEN $6 ELSE published_at END,
          updated_at = $6
        WHERE id = $8 RETURNING *`,
        [status ?? null, notes ?? null, recommendations ?? null, publishedToPortal ?? null, overallResult ?? null, now, userId, id]
      );
      res.json(rows[0]);
    } catch (err: any) {
      console.error("Error updating visit report:", err);
      res.status(500).json({ message: "Failed to update visit report" });
    }
  });

  // Get all visit reports for a property
  app.get("/api/properties/:propertyId/visit-reports", isAuthenticated, async (req: any, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) return res.status(400).json({ message: "Invalid property ID" });
      const orgId = req.user?.claims?.orgId || req.user?.orgId;
      if (!orgId) return res.status(400).json({ message: "Organization not found" });
      const db = await import("./db");
      const { rows } = await db.pool.query(
        `SELECT vr.*, u.first_name || ' ' || u.last_name AS completed_by_name,
          t.title AS task_title
        FROM visit_reports vr
        LEFT JOIN users u ON u.id = vr.completed_by
        LEFT JOIN tasks t ON t.id = vr.task_id
        WHERE vr.property_id = $1 AND vr.org_id = $2
        ORDER BY vr.created_at DESC`,
        [propertyId, orgId]
      );
      res.json(rows);
    } catch (err: any) {
      console.error("Error fetching property visit reports:", err);
      res.status(500).json({ message: "Failed to fetch visit reports" });
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
      const {
        text, completed, result, resultNote, photoUrl, photoUrls, required, notes, priority, sortOrder,
        // V2 inspection fields
        fieldType, beforePhotoUrls, afterPhotoUrls, recommendation, textAnswer, numberAnswer,
      } = req.body;
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
      // V2 fields
      if (fieldType !== undefined) updates.fieldType = fieldType;
      if (beforePhotoUrls !== undefined) updates.beforePhotoUrls = beforePhotoUrls;
      if (afterPhotoUrls !== undefined) updates.afterPhotoUrls = afterPhotoUrls;
      if (recommendation !== undefined) updates.recommendation = recommendation;
      if (textAnswer !== undefined) updates.textAnswer = textAnswer;
      if (numberAnswer !== undefined) updates.numberAnswer = numberAnswer;
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
      const items = (template.items as Array<{
        text: string; required?: boolean; category?: string;
        fieldType?: string; requiresRecommendation?: boolean; notes?: string;
      }>) || [];
      const created = [];
      for (let i = 0; i < items.length; i++) {
        const tmplItem = items[i];
        const item = await storage.createTaskChecklistItem({
          taskId,
          text: tmplItem.text,
          required: tmplItem.required || false,
          category: tmplItem.category || null,
          sortOrder: i,
          fieldType: (tmplItem.fieldType as any) || "pass_fail",
          notes: tmplItem.notes || null,
        } as any);
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

      // ── Recommendations ──
      const itemsWithRecommendations = checklistItems.filter((i: any) => i.recommendation && i.recommendation.trim());
      if (itemsWithRecommendations.length > 0) {
        if (doc.y > 680) doc.addPage();
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#e2e8f0").stroke();
        doc.moveDown(0.6);
        doc.fontSize(12).fillColor("#92400e").text(`Recommendations (${itemsWithRecommendations.length})`);
        doc.moveDown(0.4);
        for (const item of itemsWithRecommendations) {
          if (doc.y > 700) doc.addPage();
          const recommH = doc.heightOfString(item.recommendation, { fontSize: 9, width: 440 }) + 16;
          doc.rect(50, doc.y, 495, recommH).fillColor("#fffbeb").fill();
          doc.rect(50, doc.y, 495, recommH).strokeColor("#fde68a").stroke();
          const boxY = doc.y;
          doc.fontSize(8).fillColor("#78350f").text(item.text || "", 58, boxY + 6, { width: 430 });
          doc.fontSize(9).fillColor("#451a03").text(item.recommendation, 58, doc.y + 2, { width: 430 });
          doc.y = boxY + recommH + 4;
          doc.moveDown(0.2);
        }
        doc.moveDown(0.4);
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
      // Load visit report if one exists
      const dbMod = await import("./db");
      const { rows: vrRows } = await dbMod.pool.query(
        `SELECT * FROM visit_reports WHERE task_id = $1 AND org_id = $2 ORDER BY created_at DESC LIMIT 1`,
        [taskId, orgId]
      );
      const visitReport = vrRows.length > 0 ? vrRows[0] : null;
      res.json({ task, checklistItems, summary: { passCount, failCount, naCount, pendingCount }, visitReport });
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
      const orgId = req.user?.claims?.orgId || (req.user as any)?.orgId;
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

  // ── Error Log endpoints (Super Admin) ────────────────────────────────────────
  app.get("/api/super-admin/error-logs", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const level  = req.query.level  as string | undefined;
      const source = req.query.source as string | undefined;
      const search = req.query.search as string | undefined;
      const resolved = req.query.resolved === "true" ? true : req.query.resolved === "false" ? false : undefined;
      const limit  = Math.min(parseInt(req.query.limit  as string || "100", 10), 500);
      const offset = parseInt(req.query.offset as string || "0", 10);
      const from   = req.query.from ? new Date(req.query.from as string) : undefined;
      const logs   = await storage.getErrorLogs({ level, source, search, resolved, limit, offset, from });
      res.json(logs);
    } catch (error) {
      console.error("Error fetching error logs:", error);
      res.status(500).json({ message: "Failed to fetch error logs" });
    }
  });

  app.patch("/api/super-admin/error-logs/:id/resolve", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { resolved } = req.body;
      await storage.resolveErrorLog(id, resolved !== false);
      res.json({ success: true });
    } catch (error) {
      console.error("Error resolving error log:", error);
      res.status(500).json({ message: "Failed to update error log" });
    }
  });

  app.delete("/api/super-admin/error-logs", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const olderThanDays = req.query.olderThanDays ? parseInt(req.query.olderThanDays as string, 10) : undefined;
      const deleted = await storage.clearErrorLogs(olderThanDays);
      res.json({ deleted });
    } catch (error) {
      console.error("Error clearing error logs:", error);
      res.status(500).json({ message: "Failed to clear error logs" });
    }
  });

  // ── Public: validate a discount code (no auth required) ───────────────────
  app.get("/api/discount-codes/validate", async (req, res) => {
    try {
      const code = (req.query.code as string || "").trim();
      if (!code) return res.status(400).json({ message: "code is required" });

      const row = await storage.getDiscountCodeByCode(code);
      if (!row || !row.isActive) {
        return res.status(404).json({ message: "Invalid or inactive discount code" });
      }
      if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
        return res.status(410).json({ message: "This discount code has expired" });
      }
      if (row.maxUses !== null && row.usedCount >= row.maxUses) {
        return res.status(410).json({ message: "This discount code has reached its usage limit" });
      }

      res.json({
        code: row.code,
        description: row.description,
        discountType: row.discountType,
        discountValue: row.discountValue,
        applicableTiers: row.applicableTiers,
      });
    } catch (error) {
      console.error("Error validating discount code:", error);
      res.status(500).json({ message: "Failed to validate code" });
    }
  });

  // ── Super Admin: discount code CRUD ────────────────────────────────────────
  app.get("/api/super-admin/discount-codes", isSuperAdmin, requireMFA, async (_req, res) => {
    try {
      const codes = await storage.listDiscountCodes();
      res.json(codes);
    } catch (error) {
      console.error("Error fetching discount codes:", error);
      res.status(500).json({ message: "Failed to fetch discount codes" });
    }
  });

  app.post("/api/super-admin/discount-codes", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const schema = z.object({
        code:            z.string().min(1).max(64),
        description:     z.string().optional().nullable(),
        discountType:    z.enum(["percent", "fixed"]),
        discountValue:   z.number().int().min(0),
        applicableTiers: z.array(z.string()).default([]),
        maxUses:         z.number().int().min(1).optional().nullable(),
        expiresAt:       z.string().optional().nullable(),
        isActive:        z.boolean().default(true),
      }).superRefine((val, ctx) => {
        if (val.discountType === "percent" && val.discountValue > 100) {
          ctx.addIssue({ code: "too_big", maximum: 100, type: "number", inclusive: true, path: ["discountValue"], message: "Percent discount cannot exceed 100" });
        }
      });
      const result = schema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ message: "Invalid data", errors: result.error.errors });
      const { expiresAt, ...rest } = result.data;
      const code = await storage.createDiscountCode({
        ...rest,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });
      res.status(201).json(code);
    } catch (error) {
      const dbErr = error as { code?: string };
      if (dbErr?.code === "23505") return res.status(409).json({ message: "A code with that name already exists" });
      console.error("Error creating discount code:", error);
      res.status(500).json({ message: "Failed to create discount code" });
    }
  });

  app.patch("/api/super-admin/discount-codes/:id", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) return res.status(400).json({ message: "Invalid discount code id" });
      const schema = z.object({
        code:            z.string().min(1).max(64).optional(),
        description:     z.string().optional().nullable(),
        discountType:    z.enum(["percent", "fixed"]).optional(),
        discountValue:   z.number().int().min(0).optional(),
        applicableTiers: z.array(z.string()).optional(),
        maxUses:         z.number().int().min(1).optional().nullable(),
        expiresAt:       z.string().optional().nullable(),
        isActive:        z.boolean().optional(),
      }).superRefine((val, ctx) => {
        if (val.discountType === "percent" && val.discountValue !== undefined && val.discountValue > 100) {
          ctx.addIssue({ code: "too_big", maximum: 100, type: "number", inclusive: true, path: ["discountValue"], message: "Percent discount cannot exceed 100" });
        }
      });
      const result = schema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ message: "Invalid data", errors: result.error.errors });
      const { expiresAt, code: rawCode, ...rest } = result.data;
      const updates: Partial<InsertDiscountCode> = {
        ...rest,
        ...(rawCode !== undefined && { code: rawCode.toUpperCase().trim() }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      };
      const updated = await storage.updateDiscountCode(id, updates);
      res.json(updated);
    } catch (error) {
      const dbErr = error as { code?: string };
      if (dbErr?.code === "23505") return res.status(409).json({ message: "A code with that name already exists" });
      console.error("Error updating discount code:", error);
      res.status(500).json({ message: "Failed to update discount code" });
    }
  });

  app.delete("/api/super-admin/discount-codes/:id", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) return res.status(400).json({ message: "Invalid discount code id" });
      await storage.deleteDiscountCode(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting discount code:", error);
      res.status(500).json({ message: "Failed to delete discount code" });
    }
  });

  app.get("/api/super-admin/discount-codes/:id/usages", isSuperAdmin, requireMFA, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) return res.status(400).json({ message: "Invalid discount code id" });
      const usages = await storage.getDiscountCodeUsages(id);
      res.json(usages);
    } catch (error) {
      console.error("Error fetching discount code usages:", error);
      res.status(500).json({ message: "Failed to fetch usage history" });
    }
  });

  // ── Dispatch Center ────────────────────────────────────────────────────────────

  /** Helper: cascade-calculate scheduledStart/End for ordered stops given itinerary startTime + date */
  function calcStopTimes(
    isoDate: string | Date,
    startTime: string,
    stops: Array<{ estimatedWorkMinutes: number; travelMinutesFromPrevious: number; bufferMinutes: number }>
  ): Array<{ scheduledStart: Date; scheduledEnd: Date }> {
    // Normalize date — Drizzle may return a Date object or "YYYY-MM-DD" string
    const dateStr = isoDate instanceof Date
      ? isoDate.toISOString().split("T")[0]
      : String(isoDate).split("T")[0];
    const [hh, mm] = startTime.split(":").map(Number);
    let cursor = new Date(`${dateStr}T${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:00`);
    return stops.map((s) => {
      cursor = new Date(cursor.getTime() + (s.travelMinutesFromPrevious + s.bufferMinutes) * 60000);
      const scheduledStart = new Date(cursor.getTime());
      cursor = new Date(cursor.getTime() + s.estimatedWorkMinutes * 60000);
      return { scheduledStart, scheduledEnd: new Date(cursor.getTime()) };
    });
  }

  function dispatchAdminGuard(req: any, res: any): boolean {
    const role = (req.user as any)?.claims?.role ?? (req.user as any)?.role;
    if (role !== "admin" && role !== "supervisor") {
      res.status(403).json({ message: "Admin or supervisor role required." });
      return false;
    }
    return true;
  }

  // ── Templates CRUD ────────────────────────────────────────────────────────────

  app.get("/api/dispatch/templates", isAuthenticated, async (req: any, res) => {
    try {
      if (!dispatchAdminGuard(req, res)) return;
      const orgId = (req.user as any)?.claims?.orgId || (req.user as any)?.orgId;
      const { itineraryTemplates: tTable, itineraryTemplateStops: sTable } = await import("@shared/schema");
      const templates = await db.select().from(tTable).where(and(eq(tTable.orgId, orgId), ne(tTable.status, "deleted"))).orderBy(desc(tTable.createdAt));
      const templateIds = templates.map((t) => t.id);
      const stops = templateIds.length > 0
        ? await db.select().from(sTable).where(inArray(sTable.templateId, templateIds)).orderBy(sTable.stopOrder)
        : [];
      const stopsByTemplate: Record<string, typeof stops> = {};
      for (const s of stops) stopsByTemplate[s.templateId] = [...(stopsByTemplate[s.templateId] ?? []), s];
      res.json(templates.map((t) => ({ ...t, stops: stopsByTemplate[t.id] ?? [] })));
    } catch (err) {
      console.error("[dispatch] GET /templates", err);
      res.status(500).json({ message: "Failed to fetch itinerary templates" });
    }
  });

  app.post("/api/dispatch/templates", isAuthenticated, async (req: any, res) => {
    try {
      if (!dispatchAdminGuard(req, res)) return;
      const orgId = (req.user as any)?.claims?.orgId || (req.user as any)?.orgId;
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      const { itineraryTemplates: tTable, itineraryTemplateStops: sTable } = await import("@shared/schema");
      const { stops: rawStops, ...headerData } = req.body;
      const [template] = await db.insert(tTable).values({ ...headerData, orgId, createdBy: userId }).returning();
      const stopsToInsert = (rawStops ?? []).map((s: any, i: number) => ({ ...s, orgId, templateId: template.id, stopOrder: i }));
      const insertedStops = stopsToInsert.length > 0 ? await db.insert(sTable).values(stopsToInsert).returning() : [];
      res.status(201).json({ ...template, stops: insertedStops });
    } catch (err) {
      console.error("[dispatch] POST /templates", err);
      res.status(500).json({ message: "Failed to create itinerary template" });
    }
  });

  app.get("/api/dispatch/templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!dispatchAdminGuard(req, res)) return;
      const orgId = (req.user as any)?.claims?.orgId || (req.user as any)?.orgId;
      const { itineraryTemplates: tTable, itineraryTemplateStops: sTable } = await import("@shared/schema");
      const [template] = await db.select().from(tTable).where(and(eq(tTable.id, req.params.id), eq(tTable.orgId, orgId)));
      if (!template) return res.status(404).json({ message: "Template not found" });
      const stops = await db.select().from(sTable).where(eq(sTable.templateId, template.id)).orderBy(sTable.stopOrder);
      res.json({ ...template, stops });
    } catch (err) {
      console.error("[dispatch] GET /templates/:id", err);
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  app.patch("/api/dispatch/templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!dispatchAdminGuard(req, res)) return;
      const orgId = (req.user as any)?.claims?.orgId || (req.user as any)?.orgId;
      const { itineraryTemplates: tTable, itineraryTemplateStops: sTable } = await import("@shared/schema");
      const [existing] = await db.select().from(tTable).where(and(eq(tTable.id, req.params.id), eq(tTable.orgId, orgId)));
      if (!existing) return res.status(404).json({ message: "Template not found" });
      const { stops: rawStops, id: _id, orgId: _org, createdAt: _ca, ...patch } = req.body;
      const [updated] = await db.update(tTable).set({ ...patch, updatedAt: new Date() }).where(eq(tTable.id, existing.id)).returning();
      if (rawStops !== undefined) {
        await db.delete(sTable).where(eq(sTable.templateId, existing.id));
        const stopsToInsert = rawStops.map((s: any, i: number) => ({ ...s, id: undefined, orgId, templateId: existing.id, stopOrder: i }));
        const insertedStops = stopsToInsert.length > 0 ? await db.insert(sTable).values(stopsToInsert).returning() : [];
        return res.json({ ...updated, stops: insertedStops });
      }
      const stops = await db.select().from(sTable).where(eq(sTable.templateId, existing.id)).orderBy(sTable.stopOrder);
      res.json({ ...updated, stops });
    } catch (err) {
      console.error("[dispatch] PATCH /templates/:id", err);
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  app.delete("/api/dispatch/templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!dispatchAdminGuard(req, res)) return;
      const orgId = (req.user as any)?.claims?.orgId || (req.user as any)?.orgId;
      const { itineraryTemplates: tTable } = await import("@shared/schema");
      const [existing] = await db.select().from(tTable).where(and(eq(tTable.id, req.params.id), eq(tTable.orgId, orgId)));
      if (!existing) return res.status(404).json({ message: "Template not found" });
      await db.update(tTable).set({ status: "deleted", updatedAt: new Date() }).where(eq(tTable.id, existing.id));
      res.json({ success: true });
    } catch (err) {
      console.error("[dispatch] DELETE /templates/:id", err);
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  app.post("/api/dispatch/templates/:id/generate", isAuthenticated, async (req: any, res) => {
    try {
      if (!dispatchAdminGuard(req, res)) return;
      const orgId = (req.user as any)?.claims?.orgId || (req.user as any)?.orgId;
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      const { itineraryTemplates: tTable, itineraryTemplateStops: tsTable, dailyItineraries: diTable, dailyItineraryStops: disTable } = await import("@shared/schema");
      const [template] = await db.select().from(tTable).where(and(eq(tTable.id, req.params.id), eq(tTable.orgId, orgId)));
      if (!template) return res.status(404).json({ message: "Template not found" });
      const { date, assignedUserId, startTime } = req.body;
      if (!date) return res.status(400).json({ message: "date is required" });
      const effectiveStartTime = startTime ?? template.preferredStartTime ?? "08:00";
      const effectiveAssignedUser = assignedUserId ?? template.defaultAssignedUserId ?? null;
      const templateStops = await db.select().from(tsTable).where(eq(tsTable.templateId, template.id)).orderBy(tsTable.stopOrder);
      const times = calcStopTimes(date, effectiveStartTime, templateStops);
      const [itinerary] = await db.insert(diTable).values({
        orgId,
        date,
        assignedUserId: effectiveAssignedUser,
        templateId: template.id,
        name: `${template.name} — ${date}`,
        startTime: effectiveStartTime,
        status: "draft",
        totalWorkMinutes: templateStops.reduce((a, s) => a + s.estimatedWorkMinutes, 0),
        totalTravelMinutes: templateStops.reduce((a, s) => a + s.travelMinutesFromPrevious, 0),
        totalBufferMinutes: templateStops.reduce((a, s) => a + s.bufferMinutes, 0),
        totalDayMinutes: templateStops.reduce((a, s) => a + s.estimatedWorkMinutes + s.travelMinutesFromPrevious + s.bufferMinutes, 0),
        createdBy: userId,
      }).returning();
      const stops = templateStops.length > 0
        ? await db.insert(disTable).values(templateStops.map((s, i) => ({
            orgId,
            dailyItineraryId: itinerary.id,
            propertyId: s.propertyId,
            taskId: s.taskId,
            assignedUserId: effectiveAssignedUser,
            stopOrder: i,
            estimatedWorkMinutes: s.estimatedWorkMinutes,
            travelMinutesFromPrevious: s.travelMinutesFromPrevious,
            distanceFromPrevious: s.distanceFromPrevious,
            bufferMinutes: s.bufferMinutes,
            scheduledStart: times[i].scheduledStart,
            scheduledEnd: times[i].scheduledEnd,
            notes: s.notes,
          }))).returning()
        : [];
      res.status(201).json({ ...itinerary, stops });
    } catch (err) {
      console.error("[dispatch] POST /templates/:id/generate", err);
      res.status(500).json({ message: "Failed to generate itinerary from template" });
    }
  });

  // ── Daily Itineraries CRUD ────────────────────────────────────────────────────

  app.get("/api/dispatch/itineraries", isAuthenticated, async (req: any, res) => {
    try {
      if (!dispatchAdminGuard(req, res)) return;
      const orgId = (req.user as any)?.claims?.orgId || (req.user as any)?.orgId;
      const { dailyItineraries: diTable, dailyItineraryStops: disTable } = await import("@shared/schema");
      const { eq: eqOp, and: andOp } = await import("drizzle-orm");
      const conditions: any[] = [eqOp(diTable.orgId, orgId)];
      if (req.query.date) conditions.push(eqOp(diTable.date, req.query.date as string));
      if (req.query.assignedUserId) conditions.push(eqOp(diTable.assignedUserId, req.query.assignedUserId as string));
      const itineraries = await db.select().from(diTable).where(andOp(...conditions)).orderBy(desc(diTable.date));
      const ids = itineraries.map((i) => i.id);
      const stops = ids.length > 0
        ? await db.select().from(disTable).where(inArray(disTable.dailyItineraryId, ids)).orderBy(disTable.stopOrder)
        : [];
      const stopsByItin: Record<string, typeof stops> = {};
      for (const s of stops) stopsByItin[s.dailyItineraryId] = [...(stopsByItin[s.dailyItineraryId] ?? []), s];
      res.json(itineraries.map((i) => ({ ...i, stops: stopsByItin[i.id] ?? [] })));
    } catch (err) {
      console.error("[dispatch] GET /itineraries", err);
      res.status(500).json({ message: "Failed to fetch itineraries" });
    }
  });

  app.post("/api/dispatch/itineraries", isAuthenticated, async (req: any, res) => {
    try {
      if (!dispatchAdminGuard(req, res)) return;
      const orgId = (req.user as any)?.claims?.orgId || (req.user as any)?.orgId;
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      const { dailyItineraries: diTable } = await import("@shared/schema");
      const { date, name, assignedUserId, startTime, ...rest } = req.body;
      if (!date || !name) return res.status(400).json({ message: "date and name are required" });
      const [itinerary] = await db.insert(diTable).values({
        orgId,
        date,
        name,
        assignedUserId: assignedUserId ?? null,
        startTime: startTime ?? "08:00",
        status: "draft",
        createdBy: userId,
        ...rest,
      }).returning();
      res.status(201).json({ ...itinerary, stops: [] });
    } catch (err) {
      console.error("[dispatch] POST /itineraries", err);
      res.status(500).json({ message: "Failed to create itinerary" });
    }
  });

  app.get("/api/dispatch/itineraries/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!dispatchAdminGuard(req, res)) return;
      const orgId = (req.user as any)?.claims?.orgId || (req.user as any)?.orgId;
      const { dailyItineraries: diTable, dailyItineraryStops: disTable, properties: pTable, tasks: tTable } = await import("@shared/schema");
      const [itinerary] = await db.select().from(diTable).where(and(eq(diTable.id, req.params.id), eq(diTable.orgId, orgId)));
      if (!itinerary) return res.status(404).json({ message: "Itinerary not found" });
      const stops = await db.select().from(disTable).where(eq(disTable.dailyItineraryId, itinerary.id)).orderBy(disTable.stopOrder);
      const propIds = [...new Set(stops.map((s) => s.propertyId).filter(Boolean))] as number[];
      const taskIds = [...new Set(stops.map((s) => s.taskId).filter(Boolean))] as number[];
      const propMap: Record<number, any> = {};
      const taskMap: Record<number, any> = {};
      if (propIds.length > 0) {
        const props = await db.select().from(pTable).where(inArray(pTable.id, propIds));
        for (const p of props) propMap[p.id] = p;
      }
      if (taskIds.length > 0) {
        const tasks = await db.select().from(tTable).where(inArray(tTable.id, taskIds));
        for (const t of tasks) taskMap[t.id] = t;
      }
      const enrichedStops = stops.map((s) => ({
        ...s,
        property: s.propertyId ? propMap[s.propertyId] ?? null : null,
        task: s.taskId ? taskMap[s.taskId] ?? null : null,
      }));
      res.json({ ...itinerary, stops: enrichedStops });
    } catch (err) {
      console.error("[dispatch] GET /itineraries/:id", err);
      res.status(500).json({ message: "Failed to fetch itinerary" });
    }
  });

  app.patch("/api/dispatch/itineraries/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!dispatchAdminGuard(req, res)) return;
      const orgId = (req.user as any)?.claims?.orgId || (req.user as any)?.orgId;
      const { dailyItineraries: diTable, dailyItineraryStops: disTable } = await import("@shared/schema");
      const [existing] = await db.select().from(diTable).where(and(eq(diTable.id, req.params.id), eq(diTable.orgId, orgId)));
      if (!existing) return res.status(404).json({ message: "Itinerary not found" });
      const { id: _id, orgId: _org, createdAt: _ca, ...patch } = req.body;
      const wasPublished = existing.status === "published";
      const startTimeChanged = patch.startTime && patch.startTime !== existing.startTime;
      if (wasPublished && Object.keys(patch).some((k) => ["date","assignedUserId","startTime","status"].includes(k))) {
        patch.needsCalendarSync = true;
      }
      const [updated] = await db.update(diTable).set({ ...patch, updatedAt: new Date() }).where(eq(diTable.id, existing.id)).returning();
      if (startTimeChanged) {
        const stops = await db.select().from(disTable).where(eq(disTable.dailyItineraryId, existing.id)).orderBy(disTable.stopOrder);
        const times = calcStopTimes(updated.date as string, updated.startTime, stops);
        for (let i = 0; i < stops.length; i++) {
          await db.update(disTable).set({ scheduledStart: times[i].scheduledStart, scheduledEnd: times[i].scheduledEnd, updatedAt: new Date() }).where(eq(disTable.id, stops[i].id));
        }
      }
      res.json(updated);
    } catch (err) {
      console.error("[dispatch] PATCH /itineraries/:id", err);
      res.status(500).json({ message: "Failed to update itinerary" });
    }
  });

  app.delete("/api/dispatch/itineraries/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!dispatchAdminGuard(req, res)) return;
      const orgId = (req.user as any)?.claims?.orgId || (req.user as any)?.orgId;
      const { dailyItineraries: diTable, dailyItineraryStops: disTable } = await import("@shared/schema");
      const [existing] = await db.select().from(diTable).where(and(eq(diTable.id, req.params.id), eq(diTable.orgId, orgId)));
      if (!existing) return res.status(404).json({ message: "Itinerary not found" });
      const stops = await db.select().from(disTable).where(eq(disTable.dailyItineraryId, existing.id));
      const eventIds = stops.map((s) => s.calendarEventId).filter(Boolean) as string[];
      if (eventIds.length > 0) {
        await db.delete(events).where(inArray(events.id, eventIds));
      }
      await db.delete(diTable).where(eq(diTable.id, existing.id));
      res.json({ success: true });
    } catch (err) {
      console.error("[dispatch] DELETE /itineraries/:id", err);
      res.status(500).json({ message: "Failed to delete itinerary" });
    }
  });

  // ── Stops upsert / delete ─────────────────────────────────────────────────────

  app.patch("/api/dispatch/itineraries/:id/stops", isAuthenticated, async (req: any, res) => {
    try {
      if (!dispatchAdminGuard(req, res)) return;
      const orgId = (req.user as any)?.claims?.orgId || (req.user as any)?.orgId;
      const { dailyItineraries: diTable, dailyItineraryStops: disTable } = await import("@shared/schema");
      const [itinerary] = await db.select().from(diTable).where(and(eq(diTable.id, req.params.id), eq(diTable.orgId, orgId)));
      if (!itinerary) return res.status(404).json({ message: "Itinerary not found" });
      const rawStops: any[] = req.body.stops ?? [];
      const times = calcStopTimes(itinerary.date as string, itinerary.startTime, rawStops);
      await db.delete(disTable).where(eq(disTable.dailyItineraryId, itinerary.id));
      const inserted = rawStops.length > 0
        ? await db.insert(disTable).values(rawStops.map((s, i) => ({
            orgId,
            dailyItineraryId: itinerary.id,
            propertyId: s.propertyId ?? null,
            taskId: s.taskId ?? null,
            assignedUserId: s.assignedUserId ?? itinerary.assignedUserId ?? null,
            stopOrder: i,
            estimatedWorkMinutes: s.estimatedWorkMinutes ?? 60,
            travelMinutesFromPrevious: s.travelMinutesFromPrevious ?? 15,
            distanceFromPrevious: s.distanceFromPrevious ?? null,
            bufferMinutes: s.bufferMinutes ?? 0,
            scheduledStart: times[i].scheduledStart,
            scheduledEnd: times[i].scheduledEnd,
            status: s.status ?? "pending",
            calendarEventId: s.calendarEventId ?? null,
            notes: s.notes ?? null,
          }))).returning()
        : [];
      const totalWork = rawStops.reduce((a, s) => a + (s.estimatedWorkMinutes ?? 60), 0);
      const totalTravel = rawStops.reduce((a, s) => a + (s.travelMinutesFromPrevious ?? 15), 0);
      const totalBuffer = rawStops.reduce((a, s) => a + (s.bufferMinutes ?? 0), 0);
      const needsSync = itinerary.status === "published";
      await db.update(diTable).set({
        totalWorkMinutes: totalWork,
        totalTravelMinutes: totalTravel,
        totalBufferMinutes: totalBuffer,
        totalDayMinutes: totalWork + totalTravel + totalBuffer,
        needsCalendarSync: needsSync,
        updatedAt: new Date(),
      }).where(eq(diTable.id, itinerary.id));
      res.json(inserted);
    } catch (err) {
      console.error("[dispatch] PATCH /itineraries/:id/stops", err);
      res.status(500).json({ message: "Failed to update stops" });
    }
  });

  app.delete("/api/dispatch/itineraries/:id/stops/:stopId", isAuthenticated, async (req: any, res) => {
    try {
      if (!dispatchAdminGuard(req, res)) return;
      const orgId = (req.user as any)?.claims?.orgId || (req.user as any)?.orgId;
      const { dailyItineraries: diTable, dailyItineraryStops: disTable } = await import("@shared/schema");
      const [itinerary] = await db.select().from(diTable).where(and(eq(diTable.id, req.params.id), eq(diTable.orgId, orgId)));
      if (!itinerary) return res.status(404).json({ message: "Itinerary not found" });
      const [stop] = await db.select().from(disTable).where(and(eq(disTable.id, req.params.stopId), eq(disTable.dailyItineraryId, itinerary.id)));
      if (!stop) return res.status(404).json({ message: "Stop not found" });
      if (stop.calendarEventId) {
        await db.delete(events).where(eq(events.id, stop.calendarEventId));
      }
      await db.delete(disTable).where(eq(disTable.id, stop.id));
      const remaining = await db.select().from(disTable).where(eq(disTable.dailyItineraryId, itinerary.id)).orderBy(disTable.stopOrder);
      const times = calcStopTimes(itinerary.date as string, itinerary.startTime, remaining);
      for (let i = 0; i < remaining.length; i++) {
        await db.update(disTable).set({ stopOrder: i, scheduledStart: times[i].scheduledStart, scheduledEnd: times[i].scheduledEnd, updatedAt: new Date() }).where(eq(disTable.id, remaining[i].id));
      }
      const totalWork = remaining.reduce((a, s) => a + s.estimatedWorkMinutes, 0);
      const totalTravel = remaining.reduce((a, s) => a + s.travelMinutesFromPrevious, 0);
      const totalBuffer = remaining.reduce((a, s) => a + s.bufferMinutes, 0);
      await db.update(diTable).set({
        totalWorkMinutes: totalWork,
        totalTravelMinutes: totalTravel,
        totalBufferMinutes: totalBuffer,
        totalDayMinutes: totalWork + totalTravel + totalBuffer,
        needsCalendarSync: itinerary.status === "published",
        updatedAt: new Date(),
      }).where(eq(diTable.id, itinerary.id));
      res.json({ success: true });
    } catch (err) {
      console.error("[dispatch] DELETE /itineraries/:id/stops/:stopId", err);
      res.status(500).json({ message: "Failed to delete stop" });
    }
  });

  // ── Publish / Calendar Sync ───────────────────────────────────────────────────

  app.post("/api/dispatch/itineraries/:id/publish", isAuthenticated, async (req: any, res) => {
    try {
      if (!dispatchAdminGuard(req, res)) return;
      const orgId = (req.user as any)?.claims?.orgId || (req.user as any)?.orgId;
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      const { dailyItineraries: diTable, dailyItineraryStops: disTable, properties: pTable, tasks: tTable } = await import("@shared/schema");
      const [itinerary] = await db.select().from(diTable).where(and(eq(diTable.id, req.params.id), eq(diTable.orgId, orgId)));
      if (!itinerary) return res.status(404).json({ message: "Itinerary not found" });
      const stops = await db.select().from(disTable).where(eq(disTable.dailyItineraryId, itinerary.id)).orderBy(disTable.stopOrder);

      const propIds = [...new Set(stops.map((s) => s.propertyId).filter(Boolean))] as number[];
      const taskIds = [...new Set(stops.map((s) => s.taskId).filter(Boolean))] as number[];
      const propMap: Record<number, any> = {};
      const taskMap: Record<number, any> = {};
      if (propIds.length > 0) {
        const props = await db.select().from(pTable).where(inArray(pTable.id, propIds));
        for (const p of props) propMap[p.id] = p;
      }
      if (taskIds.length > 0) {
        const ts = await db.select().from(tTable).where(inArray(tTable.id, taskIds));
        for (const t of ts) taskMap[t.id] = t;
      }

      let created = 0, updated = 0, deleted = 0;
      const [defaultCalendar] = await db.select().from(await import("@shared/schema").then((m) => m.calendars)).where(and(eq((await import("@shared/schema")).calendars.orgId, orgId), eq((await import("@shared/schema")).calendars.isDefault, true))).limit(1);
      const calendarId = defaultCalendar?.id ?? null;

      for (const stop of stops) {
        const prop = stop.propertyId ? propMap[stop.propertyId] : null;
        const task = stop.taskId ? taskMap[stop.taskId] : null;
        const title = [prop?.name, task?.title ?? stop.notes].filter(Boolean).join(" — ") || itinerary.name;
        const location = prop ? [prop.address1, prop.address2, prop.city, prop.state, prop.zip].filter(Boolean).join(", ") : undefined;
        const description = [
          `Daily Itinerary: ${itinerary.name}`,
          prop ? `Property: ${prop.name}` : null,
          task ? `Task: ${task.title}` : null,
          stop.notes ? `Notes: ${stop.notes}` : null,
        ].filter(Boolean).join("\n");

        const eventData = {
          orgId,
          calendarId,
          title,
          description,
          location: location ?? null,
          allDay: false,
          start: stop.scheduledStart ?? new Date(),
          end: stop.scheduledEnd ?? new Date(),
          timezone: "UTC",
          organizerId: userId,
          createdById: userId,
          propertyId: stop.propertyId ?? null,
          taskId: stop.taskId ?? null,
          visibility: "org" as const,
        };

        if (stop.calendarEventId) {
          const [existingEvent] = await db.select().from(events).where(eq(events.id, stop.calendarEventId));
          if (existingEvent) {
            await db.update(events).set({ ...eventData, updatedAt: new Date() }).where(eq(events.id, stop.calendarEventId));
            updated++;
          } else {
            const [newEvent] = await db.insert(events).values(eventData).returning();
            await db.update(disTable).set({ calendarEventId: newEvent.id }).where(eq(disTable.id, stop.id));
            created++;
          }
        } else {
          const [newEvent] = await db.insert(events).values(eventData).returning();
          await db.update(disTable).set({ calendarEventId: newEvent.id }).where(eq(disTable.id, stop.id));
          created++;
        }
      }

      const now = new Date();
      await db.update(diTable).set({ status: "published", needsCalendarSync: false, publishedAt: now, updatedAt: now }).where(eq(diTable.id, itinerary.id));
      res.json({ success: true, eventsCreated: created, eventsUpdated: updated, eventsDeleted: deleted });
    } catch (err) {
      console.error("[dispatch] POST /itineraries/:id/publish", err);
      res.status(500).json({ message: "Failed to publish itinerary" });
    }
  });

  // ── Unscheduled tasks for dispatch ───────────────────────────────────────────

  app.get("/api/dispatch/unscheduled-tasks", isAuthenticated, async (req: any, res) => {
    try {
      if (!dispatchAdminGuard(req, res)) return;
      const orgId = (req.user as any)?.claims?.orgId || (req.user as any)?.orgId;
      const { tasks: tTable, properties: pTable, dailyItineraryStops: disTable, dailyItineraries: diTable } = await import("@shared/schema");
      const conditions: any[] = [eq(tTable.status, "pending"), eq((tTable as any).orgId || tTable.id, tTable.id)];
      if (req.query.assignedUserId) conditions.push(eq(tTable.assignedToId, req.query.assignedUserId as string));
      const allTasks = await db.select().from(tTable)
        .leftJoin(pTable, eq(tTable.propertyId, pTable.id))
        .where(and(
          or(eq(tTable.status, "pending"), eq(tTable.status, "in_progress")),
          req.query.assignedUserId ? eq(tTable.assignedToId, req.query.assignedUserId as string) : undefined,
          eq(pTable.orgId, orgId),
        ))
        .orderBy(tTable.dueDate);
      if (req.query.date) {
        const itinsOnDate = await db.select().from(diTable).where(and(eq(diTable.orgId, orgId), eq(diTable.date, req.query.date as string)));
        const itinIds = itinsOnDate.map((i) => i.id);
        const scheduledTaskIds = new Set<number>();
        if (itinIds.length > 0) {
          const stopsOnDate = await db.select().from(disTable).where(inArray(disTable.dailyItineraryId, itinIds));
          for (const s of stopsOnDate) if (s.taskId) scheduledTaskIds.add(s.taskId);
        }
        return res.json(allTasks.filter((r) => !r.tasks.id || !scheduledTaskIds.has(r.tasks.id)).map((r) => ({ ...r.tasks, property: r.properties })));
      }
      res.json(allTasks.map((r) => ({ ...r.tasks, property: r.properties })));
    } catch (err) {
      console.error("[dispatch] GET /unscheduled-tasks", err);
      res.status(500).json({ message: "Failed to fetch unscheduled tasks" });
    }
  });

  // ── Review Automation Routes ────────────────────────────────────────────────
  // Phase 1: email-only, manual-trigger only. Phase 2 auto-triggers are stubbed.

  function getReviewOrgId(req: any): string | null {
    return req.user?.claims?.orgId || req.user?.orgId || null;
  }
  function getReviewUserId(req: any): string | null {
    return req.user?.claims?.sub || req.user?.id || null;
  }
  function generateReviewToken(): string {
    return crypto.randomUUID();
  }

  const DEFAULT_SATISFACTION_EMAIL_SUBJECT = "How are we doing? Share your feedback";
  const DEFAULT_SATISFACTION_EMAIL_BODY = `Hi {{clientName}},

We hope you've been enjoying our service! We'd love to hear your thoughts.

It only takes 30 seconds to rate your experience. Your feedback helps us keep improving.

Click the button below to share your rating:
{{surveyLink}}

Thank you for being a valued client.

{{orgName}}`;

  const DEFAULT_REVIEW_EMAIL_SUBJECT = "Thank you! Would you share your experience?";
  const DEFAULT_REVIEW_EMAIL_BODY = `Hi {{clientName}},

Thank you so much for your kind feedback! We're thrilled to hear you've had a great experience.

If you have a moment, we'd be grateful if you could share your experience on a review platform. It helps others find us and means the world to our team.

{{reviewLink}}

Thank you for your continued support!

{{orgName}}`;

  const DEFAULT_REMINDER_EMAIL_SUBJECT = "A quick reminder — your review means a lot to us";
  const DEFAULT_REMINDER_EMAIL_BODY = `Hi {{clientName}},

We wanted to gently follow up on our request for a review. Your experience matters to us and to others looking for property management services they can trust.

{{reviewLink}}

If you've already left a review, please let us know by clicking "I already reviewed" on the page above, and we won't send any more reminders.

Thank you so much!

{{orgName}}`;

  async function getOrCreateReviewSettings(orgId: string) {
    const { eq } = await import("drizzle-orm");
    const { reviewAutomationSettings } = await import("@shared/schema");
    const rows = await db.select().from(reviewAutomationSettings).where(eq(reviewAutomationSettings.orgId, orgId)).limit(1);
    if (rows[0]) return rows[0];
    const inserted = await db.insert(reviewAutomationSettings).values({ orgId }).returning();
    return inserted[0];
  }

  // GET /api/reviews/settings
  app.get("/api/reviews/settings", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgId = getReviewOrgId(req);
      if (!orgId) return res.status(400).json({ message: "No org context" });
      const settings = await getOrCreateReviewSettings(orgId);
      res.json(settings);
    } catch (err) {
      console.error("GET /api/reviews/settings", err);
      res.status(500).json({ message: "Failed to load review settings" });
    }
  });

  // PATCH /api/reviews/settings
  app.patch("/api/reviews/settings", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgId = getReviewOrgId(req);
      if (!orgId) return res.status(400).json({ message: "No org context" });
      const { eq } = await import("drizzle-orm");
      const { reviewAutomationSettings } = await import("@shared/schema");
      await getOrCreateReviewSettings(orgId);
      const allowed = [
        "enabled","satisfactionThreshold","followUpDays","maxReminders",
        "googleReviewUrl","facebookReviewUrl","yelpReviewUrl","customReviewUrl","customReviewPlatformName",
        "lowRatingAlertEnabled","lowRatingCreateTask","testimonialCollectionEnabled","requireTestimonialApproval",
        "satisfactionEmailSubject","satisfactionEmailBody","reviewEmailSubject","reviewEmailBody",
      ];
      const patch: any = {};
      for (const k of allowed) if (k in req.body) patch[k] = req.body[k];
      patch.updatedAt = new Date();
      const updated = await db.update(reviewAutomationSettings).set(patch).where(eq(reviewAutomationSettings.orgId, orgId)).returning();
      res.json(updated[0]);
    } catch (err) {
      console.error("PATCH /api/reviews/settings", err);
      res.status(500).json({ message: "Failed to update review settings" });
    }
  });

  // GET /api/reviews/metrics
  app.get("/api/reviews/metrics", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgId = getReviewOrgId(req);
      if (!orgId) return res.status(400).json({ message: "No org context" });
      const { eq, and, isNotNull, avg, count, sql: sqlExpr } = await import("drizzle-orm");
      const { clientSentimentSurveys: cssTable, reviewRequests: rrTable, testimonials: testiTable, alerts: alertsTable } = await import("@shared/schema");
      const [surveyMetrics] = await db.select({
        totalSent: count(),
        completed: sqlExpr<number>`count(*) filter (where ${cssTable.status} in ('completed','review_requested','low_rating_followup_needed'))`,
        avgRating: avg(cssTable.rating),
        reviewRequested: sqlExpr<number>`count(*) filter (where ${cssTable.status} = 'review_requested')`,
      }).from(cssTable).where(eq(cssTable.orgId, orgId));
      const [testiMetrics] = await db.select({ total: count() }).from(testiTable).where(eq(testiTable.orgId, orgId));
      const [alertMetrics] = await db.select({ total: count() }).from(alertsTable).where(and(eq(alertsTable.orgId, orgId), eq(alertsTable.type, "client"), eq(alertsTable.isActive, true)));
      res.json({
        totalSurveySent: Number(surveyMetrics.totalSent) || 0,
        totalCompleted: Number(surveyMetrics.completed) || 0,
        avgRating: surveyMetrics.avgRating ? parseFloat(String(surveyMetrics.avgRating)).toFixed(1) : null,
        totalReviewRequested: Number(surveyMetrics.reviewRequested) || 0,
        totalTestimonials: Number(testiMetrics.total) || 0,
        totalLowRatingAlerts: Number(alertMetrics.total) || 0,
      });
    } catch (err) {
      console.error("GET /api/reviews/metrics", err);
      res.status(500).json({ message: "Failed to load review metrics" });
    }
  });

  // GET /api/reviews/sentiment
  app.get("/api/reviews/sentiment", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgId = getReviewOrgId(req);
      if (!orgId) return res.status(400).json({ message: "No org context" });
      const { eq, and, desc } = await import("drizzle-orm");
      const { clientSentimentSurveys: cssTable, contacts: contactsTable, clients: clientsTable } = await import("@shared/schema");
      const rows = await db
        .select({ survey: cssTable, contact: contactsTable, client: clientsTable })
        .from(cssTable)
        .leftJoin(contactsTable, eq(cssTable.contactId, contactsTable.id))
        .leftJoin(clientsTable, eq(cssTable.clientId, clientsTable.id))
        .where(eq(cssTable.orgId, orgId))
        .orderBy(desc(cssTable.createdAt))
        .limit(200);
      res.json(rows.map(r => ({ ...r.survey, contactName: r.contact ? `${r.contact.firstName} ${r.contact.lastName}`.trim() : r.client?.firstName || r.client?.email || "Client", clientEmail: r.client?.email })));
    } catch (err) {
      console.error("GET /api/reviews/sentiment", err);
      res.status(500).json({ message: "Failed to load sentiment surveys" });
    }
  });

  // POST /api/reviews/sentiment/send — manually send a satisfaction survey
  app.post("/api/reviews/sentiment/send", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgId = getReviewOrgId(req);
      const userId = getReviewUserId(req);
      if (!orgId) return res.status(400).json({ message: "No org context" });
      const { clientId, customMessage, propertyId } = req.body;
      if (!clientId) return res.status(400).json({ message: "clientId required" });
      const { eq } = await import("drizzle-orm");
      const { clientSentimentSurveys: cssTable, clients: clientsTable, contacts: contactsTable } = await import("@shared/schema");
      const settings = await getOrCreateReviewSettings(orgId);
      const clientRows = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId)).limit(1);
      const client = clientRows[0];
      if (!client || client.orgId !== orgId) return res.status(404).json({ message: "Client not found" });
      let contactEmail = client.email;
      let contactName = [client.firstName, client.lastName].filter(Boolean).join(" ") || client.email;
      let contactId: number | null = client.contactId ?? null;
      if (contactId) {
        const cRows = await db.select().from(contactsTable).where(eq(contactsTable.id, contactId)).limit(1);
        if (cRows[0]) {
          contactEmail = cRows[0].email || contactEmail;
          contactName = [cRows[0].firstName, cRows[0].lastName].filter(Boolean).join(" ") || contactName;
        }
      }
      if (!contactEmail) return res.status(400).json({ message: "Client has no email address" });
      const token = generateReviewToken();
      const baseUrl = getAppBaseUrl();
      const surveyLink = `${baseUrl}/r/satisfaction/${token}`;
      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const orgRows = await storage.getOrg(orgId);
      const orgName = orgRows?.name || "Your Property Manager";
      const emailSubject = (settings.satisfactionEmailSubject || DEFAULT_SATISFACTION_EMAIL_SUBJECT).replace(/\{\{orgName\}\}/g, orgName).replace(/\{\{clientName\}\}/g, contactName);
      const emailBody = (settings.satisfactionEmailBody || DEFAULT_SATISFACTION_EMAIL_BODY)
        .replace(/\{\{orgName\}\}/g, orgName)
        .replace(/\{\{clientName\}\}/g, contactName)
        .replace(/\{\{surveyLink\}\}/g, `<a href="${surveyLink}" style="display:inline-block;background:#0066cc;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">Rate Your Experience</a>`);
      const inserted = await db.insert(cssTable).values({
        orgId,
        clientId,
        contactId: contactId ?? undefined,
        sentByUserId: userId ?? undefined,
        token,
        expiresAt,
        triggerType: "manual",
        propertyId: propertyId ?? undefined,
        customMessage: customMessage ?? undefined,
        sentAt: new Date(),
      }).returning();
      const survey = inserted[0];
      try {
        const { sendEmail } = await import("./email-service");
        await sendEmail({ to: contactEmail, subject: emailSubject, body: emailBody, orgId });
      } catch (emailErr) {
        console.error("Failed to send satisfaction survey email:", emailErr);
      }
      res.json(survey);
    } catch (err) {
      console.error("POST /api/reviews/sentiment/send", err);
      res.status(500).json({ message: "Failed to send satisfaction survey" });
    }
  });

  // GET /api/reviews/requests
  app.get("/api/reviews/requests", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgId = getReviewOrgId(req);
      if (!orgId) return res.status(400).json({ message: "No org context" });
      const { eq, desc } = await import("drizzle-orm");
      const { reviewRequests: rrTable, contacts: contactsTable, clients: clientsTable } = await import("@shared/schema");
      const rows = await db
        .select({ rr: rrTable, contact: contactsTable, client: clientsTable })
        .from(rrTable)
        .leftJoin(contactsTable, eq(rrTable.contactId, contactsTable.id))
        .leftJoin(clientsTable, eq(rrTable.clientId, clientsTable.id))
        .where(eq(rrTable.orgId, orgId))
        .orderBy(desc(rrTable.createdAt))
        .limit(200);
      res.json(rows.map(r => ({ ...r.rr, contactName: r.contact ? `${r.contact.firstName} ${r.contact.lastName}`.trim() : r.client?.firstName || r.client?.email || "Client", clientEmail: r.client?.email })));
    } catch (err) {
      console.error("GET /api/reviews/requests", err);
      res.status(500).json({ message: "Failed to load review requests" });
    }
  });

  // POST /api/reviews/requests/:id/remind — manually send a reminder
  app.post("/api/reviews/requests/:id/remind", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgId = getReviewOrgId(req);
      if (!orgId) return res.status(400).json({ message: "No org context" });
      const { eq, and } = await import("drizzle-orm");
      const { reviewRequests: rrTable, clients: clientsTable, contacts: contactsTable } = await import("@shared/schema");
      const rows = await db.select().from(rrTable).where(and(eq(rrTable.id, req.params.id), eq(rrTable.orgId, orgId))).limit(1);
      const rr = rows[0];
      if (!rr) return res.status(404).json({ message: "Review request not found" });
      const settings = await getOrCreateReviewSettings(orgId);
      const clientRows = await db.select().from(clientsTable).where(eq(clientsTable.id, rr.clientId)).limit(1);
      const client = clientRows[0];
      let contactEmail = client?.email || "";
      let contactName = [client?.firstName, client?.lastName].filter(Boolean).join(" ") || client?.email || "Client";
      if (rr.contactId) {
        const cRows = await db.select().from(contactsTable).where(eq(contactsTable.id, rr.contactId)).limit(1);
        if (cRows[0]) { contactEmail = cRows[0].email || contactEmail; contactName = [cRows[0].firstName, cRows[0].lastName].filter(Boolean).join(" ") || contactName; }
      }
      const orgRow = await storage.getOrg(orgId);
      const orgName = orgRow?.name || "Your Property Manager";
      const baseUrl = getAppBaseUrl();
      const reviewLink = `${baseUrl}/r/review/${rr.token}`;
      const emailSubject = (settings.reviewEmailSubject || DEFAULT_REMINDER_EMAIL_SUBJECT).replace(/\{\{orgName\}\}/g, orgName).replace(/\{\{clientName\}\}/g, contactName);
      const emailBody = (settings.reviewEmailBody || DEFAULT_REMINDER_EMAIL_BODY)
        .replace(/\{\{orgName\}\}/g, orgName)
        .replace(/\{\{clientName\}\}/g, contactName)
        .replace(/\{\{reviewLink\}\}/g, `<a href="${reviewLink}" style="display:inline-block;background:#0066cc;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">Leave a Review</a>`);
      try {
        const { sendEmail } = await import("./email-service");
        await sendEmail({ to: contactEmail, subject: emailSubject, body: emailBody, orgId });
      } catch (emailErr) {
        console.error("Failed to send reminder email:", emailErr);
      }
      const now = new Date();
      const updated = await db.update(rrTable).set({ reminderCount: rr.reminderCount + 1, lastReminderSentAt: now, updatedAt: now }).where(eq(rrTable.id, rr.id)).returning();
      res.json(updated[0]);
    } catch (err) {
      console.error("POST /api/reviews/requests/:id/remind", err);
      res.status(500).json({ message: "Failed to send reminder" });
    }
  });

  // POST /api/reviews/requests/:id/mark-reviewed
  app.post("/api/reviews/requests/:id/mark-reviewed", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgId = getReviewOrgId(req);
      if (!orgId) return res.status(400).json({ message: "No org context" });
      const { eq, and } = await import("drizzle-orm");
      const { reviewRequests: rrTable } = await import("@shared/schema");
      const now = new Date();
      const updated = await db.update(rrTable).set({ status: "already_reviewed", alreadyReviewedAt: now, updatedAt: now }).where(and(eq(rrTable.id, req.params.id), eq(rrTable.orgId, orgId))).returning();
      if (!updated[0]) return res.status(404).json({ message: "Review request not found" });
      res.json(updated[0]);
    } catch (err) {
      console.error("POST /api/reviews/requests/:id/mark-reviewed", err);
      res.status(500).json({ message: "Failed to mark as reviewed" });
    }
  });

  // GET /api/reviews/testimonials
  app.get("/api/reviews/testimonials", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgId = getReviewOrgId(req);
      if (!orgId) return res.status(400).json({ message: "No org context" });
      const { eq, desc } = await import("drizzle-orm");
      const { testimonials: testiTable, contacts: contactsTable, clients: clientsTable } = await import("@shared/schema");
      const rows = await db
        .select({ testi: testiTable, contact: contactsTable, client: clientsTable })
        .from(testiTable)
        .leftJoin(contactsTable, eq(testiTable.contactId, contactsTable.id))
        .leftJoin(clientsTable, eq(testiTable.clientId, clientsTable.id))
        .where(eq(testiTable.orgId, orgId))
        .orderBy(desc(testiTable.createdAt))
        .limit(200);
      res.json(rows.map(r => ({ ...r.testi, contactName: r.contact ? `${r.contact.firstName} ${r.contact.lastName}`.trim() : r.client?.firstName || r.client?.email || "Client" })));
    } catch (err) {
      console.error("GET /api/reviews/testimonials", err);
      res.status(500).json({ message: "Failed to load testimonials" });
    }
  });

  // PATCH /api/reviews/testimonials/:id
  app.patch("/api/reviews/testimonials/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgId = getReviewOrgId(req);
      const userId = getReviewUserId(req);
      if (!orgId) return res.status(400).json({ message: "No org context" });
      const { eq, and } = await import("drizzle-orm");
      const { testimonials: testiTable } = await import("@shared/schema");
      const allowed = ["approvedForMarketing","clientDisplayName","text"];
      const patch: any = {};
      for (const k of allowed) if (k in req.body) patch[k] = req.body[k];
      if (req.body.approvedForMarketing === true) { patch.approvedAt = new Date(); patch.approvedBy = userId; }
      if (req.body.approvedForMarketing === false) { patch.approvedAt = null; patch.approvedBy = null; }
      patch.updatedAt = new Date();
      const updated = await db.update(testiTable).set(patch).where(and(eq(testiTable.id, req.params.id), eq(testiTable.orgId, orgId))).returning();
      if (!updated[0]) return res.status(404).json({ message: "Testimonial not found" });
      res.json(updated[0]);
    } catch (err) {
      console.error("PATCH /api/reviews/testimonials/:id", err);
      res.status(500).json({ message: "Failed to update testimonial" });
    }
  });

  // ── Public Review Routes (no auth — token-gated) ─────────────────────────

  // GET /api/public/r/satisfaction/:token — load survey data for the public page
  app.get("/api/public/r/satisfaction/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { eq } = await import("drizzle-orm");
      const { clientSentimentSurveys: cssTable, orgs: orgsTable, clients: clientsTable, contacts: contactsTable } = await import("@shared/schema");
      const rows = await db.select({ survey: cssTable }).from(cssTable).where(eq(cssTable.token, token)).limit(1);
      const survey = rows[0]?.survey;
      if (!survey) return res.status(410).json({ message: "This survey link is not valid or has expired." });
      if (new Date(survey.expiresAt) < new Date()) {
        await db.update(cssTable).set({ status: "expired" }).where(eq(cssTable.token, token));
        return res.status(410).json({ message: "This survey link has expired." });
      }
      if (survey.status === "completed" || survey.status === "review_requested" || survey.status === "low_rating_followup_needed") {
        return res.json({ alreadyCompleted: true, status: survey.status, rating: survey.rating });
      }
      if (survey.status === "sent") {
        await db.update(cssTable).set({ status: "opened", openedAt: new Date() }).where(eq(cssTable.token, token));
      }
      const orgRows = await db.select({ name: orgsTable.name }).from(orgsTable).where(eq(orgsTable.id, survey.orgId)).limit(1);
      const orgName = orgRows[0]?.name || "Your Property Manager";
      let clientName = "Client";
      if (survey.contactId) {
        const cRows = await db.select().from(contactsTable).where(eq(contactsTable.id, survey.contactId)).limit(1);
        if (cRows[0]) clientName = [cRows[0].firstName, cRows[0].lastName].filter(Boolean).join(" ") || clientName;
      } else {
        const clRows = await db.select().from(clientsTable).where(eq(clientsTable.id, survey.clientId)).limit(1);
        if (clRows[0]) clientName = [clRows[0].firstName, clRows[0].lastName].filter(Boolean).join(" ") || clRows[0].email || clientName;
      }
      const settings = await getOrCreateReviewSettings(survey.orgId);
      res.json({ orgName, clientName, status: survey.status, testimonialCollectionEnabled: settings.testimonialCollectionEnabled });
    } catch (err) {
      console.error("GET /api/public/r/satisfaction/:token", err);
      res.status(500).json({ message: "Failed to load survey" });
    }
  });

  // POST /api/public/r/satisfaction/:token — submit survey response
  app.post("/api/public/r/satisfaction/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { rating, feedbackText, improvementText, testimonialPermission } = req.body;
      if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: "Rating must be 1–5" });
      const { eq } = await import("drizzle-orm");
      const { clientSentimentSurveys: cssTable, reviewRequests: rrTable, testimonials: testiTable, alerts: alertsTable, contacts: contactsTable, clients: clientsTable, orgs: orgsTable } = await import("@shared/schema");
      const rows = await db.select({ survey: cssTable }).from(cssTable).where(eq(cssTable.token, token)).limit(1);
      const survey = rows[0]?.survey;
      if (!survey) return res.status(410).json({ message: "This survey link is not valid." });
      if (new Date(survey.expiresAt) < new Date()) return res.status(410).json({ message: "This survey link has expired." });
      if (["completed","review_requested","low_rating_followup_needed"].includes(survey.status)) return res.status(409).json({ message: "Survey already completed." });
      const settings = await getOrCreateReviewSettings(survey.orgId);
      const isPositive = rating >= settings.satisfactionThreshold;
      const now = new Date();
      await db.update(cssTable).set({ rating, feedbackText, improvementText, testimonialPermission: !!testimonialPermission, status: isPositive ? "review_requested" : "low_rating_followup_needed", completedAt: now }).where(eq(cssTable.token, token));
      const orgRows = await db.select({ name: orgsTable.name, branding: orgsTable.branding }).from(orgsTable).where(eq(orgsTable.id, survey.orgId)).limit(1);
      const orgName = orgRows[0]?.name || "Your Property Manager";
      let clientName = "Client";
      let contactEmail = "";
      if (survey.contactId) {
        const cRows = await db.select().from(contactsTable).where(eq(contactsTable.id, survey.contactId)).limit(1);
        if (cRows[0]) { clientName = [cRows[0].firstName, cRows[0].lastName].filter(Boolean).join(" ") || clientName; contactEmail = cRows[0].email || ""; }
      }
      if (!contactEmail) {
        const clRows = await db.select().from(clientsTable).where(eq(clientsTable.id, survey.clientId)).limit(1);
        if (clRows[0]) { contactEmail = clRows[0].email || ""; clientName = clientName === "Client" ? ([clRows[0].firstName, clRows[0].lastName].filter(Boolean).join(" ") || clRows[0].email || "Client") : clientName; }
      }
      if (isPositive) {
        const reviewToken = generateReviewToken();
        const baseUrl = getAppBaseUrl();
        const reviewLink = `${baseUrl}/r/review/${reviewToken}`;
        const followUpDays: number[] = (settings.followUpDays as number[]) || [3, 7, 14];
        const nextReminderAt = followUpDays[0] ? new Date(now.getTime() + followUpDays[0] * 24 * 60 * 60 * 1000) : null;
        const rrInserted = await db.insert(rrTable).values({ orgId: survey.orgId, surveyId: survey.id, clientId: survey.clientId, contactId: survey.contactId ?? undefined, token: reviewToken, nextReminderAt: nextReminderAt ?? undefined }).returning();
        const rr = rrInserted[0];
        if (testimonialPermission && settings.testimonialCollectionEnabled && feedbackText) {
          await db.insert(testiTable).values({ orgId: survey.orgId, clientId: survey.clientId, contactId: survey.contactId ?? undefined, surveyId: survey.id, reviewRequestId: rr.id, rating, text: feedbackText, source: "private_feedback", testimonialPermission: true, approvedForMarketing: settings.requireTestimonialApproval ? false : true });
        }
        if (contactEmail) {
          const emailSubject = (settings.reviewEmailSubject || DEFAULT_REVIEW_EMAIL_SUBJECT).replace(/\{\{orgName\}\}/g, orgName).replace(/\{\{clientName\}\}/g, clientName);
          const emailBody = (settings.reviewEmailBody || DEFAULT_REVIEW_EMAIL_BODY)
            .replace(/\{\{orgName\}\}/g, orgName)
            .replace(/\{\{clientName\}\}/g, clientName)
            .replace(/\{\{reviewLink\}\}/g, `<a href="${reviewLink}" style="display:inline-block;background:#0066cc;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">Leave a Review</a>`);
          try { const { sendEmail } = await import("./email-service"); await sendEmail({ to: contactEmail, subject: emailSubject, body: emailBody, orgId: survey.orgId }); } catch (_) {}
        }
        return res.json({ nextStep: "review", reviewToken, orgName, clientName, googleReviewUrl: settings.googleReviewUrl, facebookReviewUrl: settings.facebookReviewUrl, yelpReviewUrl: settings.yelpReviewUrl, customReviewUrl: settings.customReviewUrl, customReviewPlatformName: settings.customReviewPlatformName });
      } else {
        if (settings.lowRatingAlertEnabled && survey.contactId) {
          try {
            const { alerts: alertsTableInner } = await import("@shared/schema");
            const systemUserId = survey.sentByUserId;
            if (systemUserId) {
              await db.insert(alertsTableInner).values({ orgId: survey.orgId, type: "client", entityId: survey.contactId, message: `Low satisfaction rating (${rating}★) from client${clientName !== "Client" ? " " + clientName : ""}. Feedback: ${improvementText || feedbackText || "No specific feedback provided."}`, severity: rating <= 2 ? "critical" : "warning", isActive: true, targetType: "roles", targetRoles: ["admin", "supervisor"], createdBy: systemUserId });
            }
          } catch (alertErr) { console.error("Failed to create low-rating alert:", alertErr); }
        }
        if (settings.lowRatingCreateTask && survey.contactId) {
          try {
            const { tasks: tasksTable } = await import("@shared/schema");
            await db.insert(tasksTable).values({ title: `Follow up with ${clientName} — low satisfaction rating (${rating}★)`, description: `Client submitted a ${rating}★ satisfaction rating.\n\nFeedback: ${improvementText || feedbackText || "No specific feedback provided."}`, priority: rating <= 2 ? "urgent" : "high", status: "pending", contactId: survey.contactId, category: "administrative" } as any);
          } catch (taskErr) { console.error("Failed to create follow-up task:", taskErr); }
        }
        return res.json({ nextStep: "done", orgName, clientName });
      }
    } catch (err) {
      console.error("POST /api/public/r/satisfaction/:token", err);
      res.status(500).json({ message: "Failed to submit survey" });
    }
  });

  // GET /api/public/r/review/:token — load review request page data
  app.get("/api/public/r/review/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { eq } = await import("drizzle-orm");
      const { reviewRequests: rrTable, orgs: orgsTable, contacts: contactsTable, clients: clientsTable } = await import("@shared/schema");
      const rows = await db.select({ rr: rrTable }).from(rrTable).where(eq(rrTable.token, token)).limit(1);
      const rr = rows[0]?.rr;
      if (!rr) return res.status(410).json({ message: "This review link is not valid." });
      if (rr.optedOutAt) return res.json({ status: "opted_out", orgName: "" });
      const settings = await getOrCreateReviewSettings(rr.orgId);
      const orgRows = await db.select({ name: orgsTable.name }).from(orgsTable).where(eq(orgsTable.id, rr.orgId)).limit(1);
      const orgName = orgRows[0]?.name || "Your Property Manager";
      let clientName = "Client";
      if (rr.contactId) {
        const cRows = await db.select().from(contactsTable).where(eq(contactsTable.id, rr.contactId)).limit(1);
        if (cRows[0]) clientName = [cRows[0].firstName, cRows[0].lastName].filter(Boolean).join(" ") || clientName;
      } else {
        const clRows = await db.select().from(clientsTable).where(eq(clientsTable.id, rr.clientId)).limit(1);
        if (clRows[0]) clientName = [clRows[0].firstName, clRows[0].lastName].filter(Boolean).join(" ") || clRows[0].email || clientName;
      }
      if (rr.status === "sent" || rr.status === "clicked") {
        await db.update(rrTable).set({ status: "clicked", clickedAt: rr.clickedAt ?? new Date(), updatedAt: new Date() }).where(eq(rrTable.token, token));
      }
      res.json({ status: rr.status, orgName, clientName, googleReviewUrl: settings.googleReviewUrl, facebookReviewUrl: settings.facebookReviewUrl, yelpReviewUrl: settings.yelpReviewUrl, customReviewUrl: settings.customReviewUrl, customReviewPlatformName: settings.customReviewPlatformName, testimonialCollectionEnabled: settings.testimonialCollectionEnabled, alreadyReviewed: !!rr.alreadyReviewedAt, testimonialSubmitted: !!rr.testimonialSubmittedAt });
    } catch (err) {
      console.error("GET /api/public/r/review/:token", err);
      res.status(500).json({ message: "Failed to load review page" });
    }
  });

  // POST /api/public/r/review/:token/testimonial
  app.post("/api/public/r/review/:token/testimonial", async (req, res) => {
    try {
      const { token } = req.params;
      const { text, permission } = req.body;
      if (!text?.trim()) return res.status(400).json({ message: "Testimonial text is required" });
      const { eq } = await import("drizzle-orm");
      const { reviewRequests: rrTable, testimonials: testiTable, clientSentimentSurveys: cssTable } = await import("@shared/schema");
      const rows = await db.select({ rr: rrTable }).from(rrTable).where(eq(rrTable.token, token)).limit(1);
      const rr = rows[0]?.rr;
      if (!rr) return res.status(410).json({ message: "Review link not valid." });
      const settings = await getOrCreateReviewSettings(rr.orgId);
      let rating = 5;
      if (rr.surveyId) {
        const sRows = await db.select().from(cssTable).where(eq(cssTable.id, rr.surveyId)).limit(1);
        if (sRows[0]?.rating) rating = sRows[0].rating;
      }
      await db.insert(testiTable).values({ orgId: rr.orgId, clientId: rr.clientId, contactId: rr.contactId ?? undefined, surveyId: rr.surveyId ?? undefined, reviewRequestId: rr.id, rating, text: text.trim(), source: "review_page", testimonialPermission: !!permission, approvedForMarketing: settings.requireTestimonialApproval ? false : true });
      await db.update(rrTable).set({ testimonialSubmittedAt: new Date(), updatedAt: new Date() }).where(eq(rrTable.token, token));
      res.json({ success: true });
    } catch (err) {
      console.error("POST /api/public/r/review/:token/testimonial", err);
      res.status(500).json({ message: "Failed to submit testimonial" });
    }
  });

  // POST /api/public/r/review/:token/already-reviewed
  app.post("/api/public/r/review/:token/already-reviewed", async (req, res) => {
    try {
      const { eq } = await import("drizzle-orm");
      const { reviewRequests: rrTable } = await import("@shared/schema");
      const now = new Date();
      await db.update(rrTable).set({ alreadyReviewedAt: now, status: "already_reviewed", updatedAt: now }).where(eq(rrTable.token, req.params.token));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  // POST /api/public/r/review/:token/opt-out
  app.post("/api/public/r/review/:token/opt-out", async (req, res) => {
    try {
      const { eq } = await import("drizzle-orm");
      const { reviewRequests: rrTable } = await import("@shared/schema");
      const now = new Date();
      await db.update(rrTable).set({ optedOutAt: now, status: "opted_out", updatedAt: now }).where(eq(rrTable.token, req.params.token));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to opt out" });
    }
  });

  // Register the conflict detector for scheduled tasks
  const { setConflictDetector } = await import('./scheduledTasks');
  setConflictDetector(detectAndCreateEventConflicts);
  
  const httpServer = createServer(app);
  return httpServer;
}
