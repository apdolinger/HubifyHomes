import cron from 'node-cron';
import { storage } from './storage';
import { log } from './vite';
import { sendEmail, buildMergeFieldData, processMergeFields } from './email-service';
import { generateInvoicePDF } from './invoiceUtils';
import { generateInvoiceEmailHTML, sendGenericEmail } from './emailUtils';
import { chargeInvoice } from './stripe';

// Import conflict detection helper - we'll export this from routes
export let detectConflictsForEvent: ((event: any, orgId: string, userId: string) => Promise<number>) | null = null;

export function setConflictDetector(detector: (event: any, orgId: string, userId: string) => Promise<number>) {
  detectConflictsForEvent = detector;
}

/**
 * Run billing automation manually or via cron job
 * Generates consolidated invoices for clients based on billing schedules
 * and optionally auto-charges their default payment methods
 * 
 * @returns Summary of billing run (invoices created, charged, failed, errors)
 */
export async function runBillingAutomation(): Promise<{
  invoicesCreated: number;
  invoicesCharged: number;
  invoicesFailed: number;
  errors: Array<{ clientId: string; clientName: string; error: string }>;
  summary: string;
}> {
  const startTime = Date.now();
  log('[BILLING] Starting automated billing invoice generation...');
  
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dayOfMonth = today.getDate();
  
  const billingAutomationEnabled = process.env.BILLING_AUTOMATION_ENABLED === 'true';
  
  // Get all clients with auto-send enabled
  const allOrgs = await storage.getOrgs();
  let totalInvoicesCreated = 0;
  let totalInvoicesCharged = 0;
  let totalInvoicesFailed = 0;
  const errors: Array<{ clientId: string; clientName: string; error: string }> = [];
  
  for (const org of allOrgs) {
    try {
      // Get all clients for this org with auto-send enabled
      const clients = await storage.getClients(org.id);
      
      for (const client of clients) {
        try {
          // Skip if auto-send is not enabled
          if (!client.autoSendInvoices) {
            continue;
          }
          
          // Skip if no billing frequency is set
          if (!client.invoiceFrequency || client.invoiceFrequency === 'manual') {
            continue;
          }
          
          // Check if invoice should be generated today based on frequency
          let shouldGenerateInvoice = false;
          
          if (client.invoiceFrequency === 'weekly') {
            // Weekly billing on specified day of week
            shouldGenerateInvoice = client.billingDay !== null && dayOfWeek === client.billingDay;
          } else if (client.invoiceFrequency === 'biweekly') {
            // Bi-weekly billing on specified day of week
            if (client.billingDay !== null && dayOfWeek === client.billingDay) {
              // Check if it's been at least 13 days since last invoice
              if (client.lastInvoiceDate) {
                const daysSinceLastInvoice = Math.floor(
                  (today.getTime() - new Date(client.lastInvoiceDate).getTime()) / (1000 * 60 * 60 * 24)
                );
                shouldGenerateInvoice = daysSinceLastInvoice >= 13;
              } else {
                // First invoice
                shouldGenerateInvoice = true;
              }
            }
          } else if (client.invoiceFrequency === 'monthly') {
            // Monthly billing on specified day of month
            shouldGenerateInvoice = client.billingDayOfMonth !== null && dayOfMonth === client.billingDayOfMonth;
          }
          
          if (!shouldGenerateInvoice) {
            continue;
          }
          
          // Get all pending billing submissions for this client
          const allSubmissions = await storage.getBillingSubmissions(org.id);
          const pendingSubmissions = allSubmissions.filter(
            (s: any) => s.clientId === client.id && s.status === 'pending'
          );
          
          if (pendingSubmissions.length === 0) {
            log(`[BILLING] No pending submissions for client ${client.firstName} ${client.lastName} (${client.id})`);
            continue;
          }
          
          log(`[BILLING] Generating consolidated invoice for ${client.firstName} ${client.lastName} with ${pendingSubmissions.length} submissions`);
          
          // Authorize all pending submissions
          const systemUserId = 'system-auto-billing';
          await Promise.all(
            pendingSubmissions.map((s: any) => storage.authorizeBillingSubmission(s.id, systemUserId))
          );
          
          // Create consolidated invoice with idempotency
          const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
          
          // Generate idempotency key: ensures one invoice per day per client per frequency
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, '0');
          const day = String(today.getDate()).padStart(2, '0');
          const idempotencyKey = `inv-auto-${year}${month}${day}-${client.id}-${client.invoiceFrequency}`;
          
          // Check if invoice with this idempotency key already exists
          const existingInvoices = await storage.getClientInvoices(client.id);
          const duplicateInvoice = existingInvoices.find((inv: any) => 
            inv.metadata?.idempotencyKey === idempotencyKey
          );
          
          if (duplicateInvoice) {
            log(`[BILLING] Skipping invoice creation for ${client.firstName} ${client.lastName}: Invoice already exists with idempotency key ${idempotencyKey} (${duplicateInvoice.invoiceNumber})`);
            continue;
          }
          
          // Consolidate line items, notes, and attachments
          const allLineItems: any[] = [];
          const allNotes: string[] = [];
          const allAttachments: any[] = [];
          let totalAmountCents = 0;
          
          pendingSubmissions.forEach((submission: any) => {
            const submissionLineItems = (submission.lineItems || []).map((item: any) => ({
              description: item.description,
              quantity: item.quantity,
              unitAmountCents: item.rateCents,
              totalCents: item.amountCents
            }));
            
            allLineItems.push(...submissionLineItems);
            
            if (submission.notes) {
              allNotes.push(`[${submission.description}]: ${submission.notes}`);
            }
            
            if (submission.attachments && Array.isArray(submission.attachments)) {
              allAttachments.push(...submission.attachments);
            }
            
            totalAmountCents += submission.amountCents;
          });
          
          const consolidatedDescription = `Automated consolidated invoice for ${pendingSubmissions.length} submission(s):\n` + 
            pendingSubmissions.map((s: any, i: number) => `${i + 1}. ${s.description}`).join('\n');
          
          const consolidatedNotes = allNotes.length > 0 ? allNotes.join('\n\n') : undefined;
          
          const invoice = await storage.createClientInvoice({
            orgId: org.id,
            clientId: client.id,
            source: 'automated',
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
              submissionIds: pendingSubmissions.map((s: any) => s.id),
              authorizedBy: systemUserId,
              generatedAt: new Date().toISOString(),
              idempotencyKey, // Store for duplicate detection
            },
          });
          
          totalInvoicesCreated++;
          
          // Update client's last invoice date
          await storage.updateClient(client.id, { lastInvoiceDate: new Date() });
          
          // Mark submissions as invoiced
          await Promise.all(
            pendingSubmissions.map((s: any) => 
              storage.updateBillingSubmission(s.id, { status: 'invoiced', invoiceId: invoice.id })
            )
          );
          
          log(`[BILLING] Created invoice ${invoice.invoiceNumber} for $${(totalAmountCents / 100).toFixed(2)}`);
          
          // Send invoice email if client has an email
          if (client.email) {
            const pdfBuffer = await generateInvoicePDF(invoice, client, org);
            const htmlContent = generateInvoiceEmailHTML(invoice, client, org);
            
            await sendGenericEmail({
              to: client.email,
              subject: `Invoice ${invoice.invoiceNumber} from ${org.name}`,
              htmlContent,
              attachments: [{
                filename: `${invoice.invoiceNumber}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
              }],
            });
            
            log(`[BILLING] Sent invoice ${invoice.invoiceNumber} to ${client.email}`);
          } else {
            log(`[BILLING] Warning: Client ${client.firstName} ${client.lastName} has no email address, invoice created but not sent`);
          }
          
          // Auto-charge if enabled (and billing automation is enabled)
          if (billingAutomationEnabled) {
            try {
              // Get client billing preferences to check if auto-charge is enabled
              const billingPrefs = await storage.getClientBillingPrefs(client.id);
              
              if (billingPrefs && billingPrefs.autoChargeInvoices) {
                // Get client's default payment method
                const paymentMethods = await storage.getClientPaymentMethods(client.id);
                const defaultPaymentMethod = paymentMethods.find(pm => pm.isDefault);
                
                if (defaultPaymentMethod) {
                  log(`[BILLING] Auto-charging invoice ${invoice.invoiceNumber} for ${client.firstName} ${client.lastName} using payment method ending in ${defaultPaymentMethod.last4}`);
                  
                  const result = await chargeInvoice(
                    invoice.id,
                    org.id,
                    client.id,
                    defaultPaymentMethod.stripePaymentMethodId,
                    invoice.amountCents,
                    `Automated billing charge for invoice ${invoice.invoiceNumber}`
                  );
                  
                  log(`[BILLING] Auto-charge initiated for invoice ${invoice.invoiceNumber}, PaymentIntent: ${result.paymentIntentId}, Status: ${result.status}`);
                  totalInvoicesCharged++;
                } else {
                  log(`[BILLING] Auto-charge skipped for invoice ${invoice.invoiceNumber}: No default payment method found for client ${client.firstName} ${client.lastName}`);
                }
              }
            } catch (error) {
              log(`[BILLING] Error auto-charging invoice ${invoice.invoiceNumber}: ${error}`);
              totalInvoicesFailed++;
              errors.push({
                clientId: client.id,
                clientName: `${client.firstName} ${client.lastName}`,
                error: `Auto-charge failed: ${error}`,
              });
              // Don't fail the entire billing automation if one charge fails
            }
          } else {
            log(`[BILLING] Auto-charge disabled globally (BILLING_AUTOMATION_ENABLED=${process.env.BILLING_AUTOMATION_ENABLED})`);
          }
        } catch (error) {
          log(`[BILLING] Error processing client ${client.id}: ${error}`);
          errors.push({
            clientId: client.id,
            clientName: `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.email,
            error: String(error),
          });
        }
      }
    } catch (error) {
      log(`[BILLING] Error processing org ${org.id}: ${error}`);
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const summary = `Automated billing complete in ${duration}s. Created: ${totalInvoicesCreated}, Charged: ${totalInvoicesCharged}, Failed: ${totalInvoicesFailed}`;
  log(`[BILLING] ${summary}`);
  
  return {
    invoicesCreated: totalInvoicesCreated,
    invoicesCharged: totalInvoicesCharged,
    invoicesFailed: totalInvoicesFailed,
    errors,
    summary,
  };
}

export function startScheduledTasks() {
  // Run conflict scan every 12 hours (at 2am and 2pm)
  cron.schedule('0 2,14 * * *', async () => {
    try {
      log('[CRON] Starting automatic conflict scan...');
      
      // Get all organizations
      const orgs = await storage.getOrgs();
      let totalConflicts = 0;
      let totalEvents = 0;
      
      for (const org of orgs) {
        try {
          // Get all events for this org
          const events = await storage.getEvents(org.id);
          totalEvents += events.length;
          
          // For automatic scans, use a system user ID
          const systemUserId = 'system-auto-scanner';
          
          let orgConflicts = 0;
          
          // Scan each event for conflicts
          if (detectConflictsForEvent) {
            for (const event of events) {
              try {
                const count = await detectConflictsForEvent(event, org.id, systemUserId);
                orgConflicts += count;
              } catch (error) {
                // Continue scanning other events even if one fails
                log(`[CRON] Error scanning event ${event.id}: ${error}`);
              }
            }
          }
          
          totalConflicts += orgConflicts;
          log(`[CRON] Scanned ${events.length} events for org ${org.name || org.id}, found ${orgConflicts} conflicts`);
        } catch (error) {
          log(`[CRON] Error scanning org ${org.id}: ${error}`);
        }
      }
      
      log(`[CRON] Automatic conflict scan complete. Scanned ${totalEvents} events across ${orgs.length} organizations, detected ${totalConflicts} conflicts.`);
    } catch (error) {
      log(`[CRON] Error in scheduled conflict scan: ${error}`);
    }
  });
  
  log('[CRON] Scheduled tasks initialized - conflict scan will run every 12 hours at 2am and 2pm');

  // Run task archiving daily at 4am
  cron.schedule('0 4 * * *', async () => {
    try {
      log('[CRON] Starting automatic task archiving...');
      
      const now = new Date();
      const orgs = await storage.getOrgs();
      let totalArchived = 0;
      
      for (const org of orgs) {
        try {
          const completedRetentionDays = org.completedTaskRetentionDays ?? 60;
          const cancelledRetentionDays = org.cancelledTaskRetentionDays ?? 60;
          
          // Get all non-archived tasks
          const allTasks = await storage.getTasks();
          
          // Get all properties for this org to identify org's tasks
          const allProperties = await storage.getProperties(true);
          const orgProperties = allProperties.filter((p: any) => p.orgId === org.id);
          const orgPropertyIds = new Set(orgProperties.map((p: any) => p.id));
          
          // Filter to only this org's tasks (tasks assigned to org properties) and not archived
          const orgTasks = allTasks.filter((t: any) => {
            return !t.isArchived && t.propertyId && orgPropertyIds.has(t.propertyId);
          });
          
          let orgArchivedCount = 0;
          
          for (const task of orgTasks) {
            let shouldArchive = false;
            
            // Check if completed task should be archived
            if (task.status === 'completed' && task.completedAt) {
              const daysSinceCompleted = Math.floor(
                (now.getTime() - new Date(task.completedAt).getTime()) / (1000 * 60 * 60 * 24)
              );
              shouldArchive = daysSinceCompleted >= completedRetentionDays;
            }
            
            // Check if cancelled task should be archived
            if (task.status === 'cancelled' && task.updatedAt) {
              const daysSinceCancelled = Math.floor(
                (now.getTime() - new Date(task.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
              );
              shouldArchive = daysSinceCancelled >= cancelledRetentionDays;
            }
            
            if (shouldArchive) {
              try {
                await storage.archiveTask(task.id, 'system-auto-archiver');
                orgArchivedCount++;
              } catch (error) {
                log(`[CRON] Error archiving task ${task.id}: ${error}`);
              }
            }
          }
          
          if (orgArchivedCount > 0) {
            log(`[CRON] Archived ${orgArchivedCount} tasks for org ${org.name || org.id}`);
          }
          totalArchived += orgArchivedCount;
        } catch (error) {
          log(`[CRON] Error processing org ${org.id} for task archiving: ${error}`);
        }
      }
      
      log(`[CRON] Automatic task archiving complete. Archived ${totalArchived} tasks across ${orgs.length} organizations.`);
    } catch (error) {
      log(`[CRON] Error in scheduled task archiving: ${error}`);
    }
  });
  
  log('[CRON] Task archiving scheduled - will run daily at 4am');

  // Run billing automation daily at 3am (only if BILLING_AUTOMATION_ENABLED is true)
  const billingAutomationEnabled = process.env.BILLING_AUTOMATION_ENABLED === 'true';
  
  if (billingAutomationEnabled) {
    cron.schedule('0 3 * * *', async () => {
      try {
        log('[CRON] Starting automated billing invoice generation...');
      
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayOfMonth = today.getDate();
      
      // Get all clients with auto-send enabled
      const allOrgs = await storage.getOrgs();
      let totalInvoicesCreated = 0;
      
      for (const org of allOrgs) {
        try {
          // Get all clients for this org with auto-send enabled
          const clients = await storage.getClients(org.id);
          
          for (const client of clients) {
            try {
              // Skip if auto-send is not enabled
              if (!client.autoSendInvoices) {
                continue;
              }
              
              // Skip if no billing frequency is set
              if (!client.invoiceFrequency || client.invoiceFrequency === 'manual') {
                continue;
              }
              
              // Check if invoice should be generated today based on frequency
              let shouldGenerateInvoice = false;
              
              if (client.invoiceFrequency === 'weekly') {
                // Weekly billing on specified day of week
                shouldGenerateInvoice = client.billingDay !== null && dayOfWeek === client.billingDay;
              } else if (client.invoiceFrequency === 'biweekly') {
                // Bi-weekly billing on specified day of week
                if (client.billingDay !== null && dayOfWeek === client.billingDay) {
                  // Check if it's been at least 13 days since last invoice
                  if (client.lastInvoiceDate) {
                    const daysSinceLastInvoice = Math.floor(
                      (today.getTime() - new Date(client.lastInvoiceDate).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    shouldGenerateInvoice = daysSinceLastInvoice >= 13;
                  } else {
                    // First invoice
                    shouldGenerateInvoice = true;
                  }
                }
              } else if (client.invoiceFrequency === 'monthly') {
                // Monthly billing on specified day of month
                shouldGenerateInvoice = client.billingDayOfMonth !== null && dayOfMonth === client.billingDayOfMonth;
              }
              
              if (!shouldGenerateInvoice) {
                continue;
              }
              
              // Get all pending billing submissions for this client
              const allSubmissions = await storage.getBillingSubmissions(org.id);
              const pendingSubmissions = allSubmissions.filter(
                (s: any) => s.clientId === client.id && s.status === 'pending'
              );
              
              if (pendingSubmissions.length === 0) {
                log(`[CRON] No pending submissions for client ${client.firstName} ${client.lastName} (${client.id})`);
                continue;
              }
              
              log(`[CRON] Generating consolidated invoice for ${client.firstName} ${client.lastName} with ${pendingSubmissions.length} submissions`);
              
              // Authorize all pending submissions
              const systemUserId = 'system-auto-billing';
              await Promise.all(
                pendingSubmissions.map((s: any) => storage.authorizeBillingSubmission(s.id, systemUserId))
              );
              
              // Create consolidated invoice
              const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
              
              // Consolidate line items, notes, and attachments
              const allLineItems: any[] = [];
              const allNotes: string[] = [];
              const allAttachments: any[] = [];
              let totalAmountCents = 0;
              
              pendingSubmissions.forEach((submission: any) => {
                const submissionLineItems = (submission.lineItems || []).map((item: any) => ({
                  description: item.description,
                  quantity: item.quantity,
                  unitAmountCents: item.rateCents,
                  totalCents: item.amountCents
                }));
                
                allLineItems.push(...submissionLineItems);
                
                if (submission.notes) {
                  allNotes.push(`[${submission.description}]: ${submission.notes}`);
                }
                
                if (submission.attachments && Array.isArray(submission.attachments)) {
                  allAttachments.push(...submission.attachments);
                }
                
                totalAmountCents += submission.amountCents;
              });
              
              const consolidatedDescription = `Automated consolidated invoice for ${pendingSubmissions.length} submission(s):\n` + 
                pendingSubmissions.map((s: any, i: number) => `${i + 1}. ${s.description}`).join('\n');
              
              const consolidatedNotes = allNotes.length > 0 ? allNotes.join('\n\n') : undefined;
              
              const invoice = await storage.createClientInvoice({
                orgId: org.id,
                clientId: client.id,
                source: 'automated',
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
                  submissionIds: pendingSubmissions.map((s: any) => s.id),
                  authorizedBy: systemUserId,
                  consolidatedInvoice: true,
                  submissionCount: pendingSubmissions.length,
                  automatedBilling: true,
                  notes: consolidatedNotes || null
                },
                createdBy: systemUserId
              });
              
              // Link all submissions to invoice and mark as invoiced
              await Promise.all(
                pendingSubmissions.map((s: any) => 
                  storage.updateBillingSubmission(s.id, { 
                    status: 'invoiced',
                    invoiceId: invoice.id
                  })
                )
              );
              
              // Update client's last invoice date
              await storage.updateClient(client.id, {
                lastInvoiceDate: new Date()
              });
              
              // Generate PDF
              const pdfBuffer = await generateInvoicePDF(invoice, client, org);
              
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
                  automated: 'true'
                }
              });
              
              // Update invoice with PDF key
              await storage.updateClientInvoice(invoice.id, {
                pdfStorageKey: pdfKey
              });
              
              // Send email to client
              if (client.email) {
                // Generate invoice email HTML
                const htmlContent = generateInvoiceEmailHTML({
                  invoiceNumber: invoice.invoiceNumber,
                  invoiceDate: invoice.issuedAt || new Date(),
                  dueDate: invoice.dueDate,
                  total: invoice.amountCents,
                  amountDue: invoice.amountCents,
                  currency: invoice.currency,
                  clientName: `${client.firstName} ${client.lastName}`,
                  organizationName: org.name,
                  organizationBranding: org.branding || {},
                  notes: 'This is an automated billing invoice based on your billing schedule.',
                });
                
                // Send email with PDF attachment
                const sgMail = (await import('@sendgrid/mail')).default;
                const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
                
                if (SENDGRID_API_KEY) {
                  sgMail.setApiKey(SENDGRID_API_KEY);
                  
                  await sgMail.send({
                    to: client.email,
                    from: process.env.SUPPORT_EMAIL_FROM || 'noreply@hubify.app',
                    subject: `Invoice ${invoice.invoiceNumber} from ${org.name}`,
                    html: htmlContent,
                    attachments: [
                      {
                        content: pdfBuffer.toString('base64'),
                        filename: `invoice-${invoice.invoiceNumber}.pdf`,
                        type: 'application/pdf',
                        disposition: 'attachment',
                      },
                    ],
                  });
                  
                  // Update invoice as sent
                  await storage.updateClientInvoice(invoice.id, {
                    sentAt: new Date()
                  });
                  
                  totalInvoicesCreated++;
                  log(`[CRON] Successfully created and sent automated invoice ${invoice.invoiceNumber} to ${client.email}`);
                } else {
                  log(`[CRON] Warning: SENDGRID_API_KEY not configured, invoice created but not sent`);
                }
              } else {
                log(`[CRON] Warning: Client ${client.firstName} ${client.lastName} has no email address, invoice created but not sent`);
              }
              
              // Auto-charge if enabled (and billing automation is enabled)
              const billingAutomationEnabled = process.env.BILLING_AUTOMATION_ENABLED === 'true';
              
              if (billingAutomationEnabled) {
                try {
                  // Get client billing preferences to check if auto-charge is enabled
                  const billingPrefs = await storage.getClientBillingPrefs(client.id);
                  
                  if (billingPrefs && billingPrefs.autoChargeInvoices) {
                  // Get client's default payment method
                  const paymentMethods = await storage.getClientPaymentMethods(client.id);
                  const defaultPaymentMethod = paymentMethods.find(pm => pm.isDefault);
                  
                  if (defaultPaymentMethod) {
                    log(`[CRON] Auto-charging invoice ${invoice.invoiceNumber} for ${client.firstName} ${client.lastName} using payment method ending in ${defaultPaymentMethod.last4}`);
                    
                    const result = await chargeInvoice(
                      invoice.id,
                      org.id,
                      client.id,
                      defaultPaymentMethod.stripePaymentMethodId,
                      invoice.amountCents,
                      `Automated billing charge for invoice ${invoice.invoiceNumber}`
                    );
                    
                    log(`[CRON] Auto-charge initiated for invoice ${invoice.invoiceNumber}, PaymentIntent: ${result.paymentIntentId}, Status: ${result.status}`);
                  } else {
                    log(`[CRON] Auto-charge skipped for invoice ${invoice.invoiceNumber}: No default payment method found for client ${client.firstName} ${client.lastName}`);
                  }
                  }
                } catch (error) {
                  log(`[CRON] Error auto-charging invoice ${invoice.invoiceNumber}: ${error}`);
                  // Don't fail the entire billing automation if one charge fails
                }
              } else {
                log(`[CRON] Auto-charge disabled globally (BILLING_AUTOMATION_ENABLED=${process.env.BILLING_AUTOMATION_ENABLED})`);
              }
            } catch (error) {
              log(`[CRON] Error processing client ${client.id}: ${error}`);
            }
          }
        } catch (error) {
          log(`[CRON] Error processing org ${org.id}: ${error}`);
        }
      }
      
      log(`[CRON] Automated billing complete. Created and sent ${totalInvoicesCreated} invoices.`);
    } catch (error) {
      log(`[CRON] Error in scheduled billing automation: ${error}`);
    }
    });
    
    log('[CRON] Billing automation scheduled - will run daily at 3am');
  } else {
    log('[CRON] Billing automation DISABLED (BILLING_AUTOMATION_ENABLED not set to "true")');
  }
  
  // Process scheduled emails every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      log('[CRON] Checking for pending scheduled emails...');
      
      // Get all pending scheduled emails that are due
      const pendingEmails = await storage.getPendingScheduledEmails();
      
      if (pendingEmails.length === 0) {
        return; // No emails to send
      }
      
      log(`[CRON] Found ${pendingEmails.length} scheduled emails to send`);
      
      for (const scheduledEmail of pendingEmails) {
        try {
          // Build merge field data if we have contactId
          let mergeFieldData = {};
          if (scheduledEmail.recipientContactId) {
            mergeFieldData = await buildMergeFieldData({
              contactId: scheduledEmail.recipientContactId,
              senderId: scheduledEmail.senderId,
              orgId: scheduledEmail.orgId,
            });
          }
          
          // Process merge fields in subject and body
          const processedSubject = processMergeFields(scheduledEmail.subject, mergeFieldData);
          const processedBody = processMergeFields(scheduledEmail.body, mergeFieldData);
          
          // Send the email
          await sendEmail({
            to: scheduledEmail.recipientEmail,
            subject: processedSubject,
            body: processedBody,
            orgId: scheduledEmail.orgId,
            fromName: scheduledEmail.senderName,
            fromEmail: scheduledEmail.senderEmail,
          });
          
          // Mark as sent in scheduled_emails
          await storage.markScheduledEmailSent(scheduledEmail.id, new Date());
          
          // Create email history record
          await storage.createEmailHistory({
            orgId: scheduledEmail.orgId,
            senderId: scheduledEmail.senderId,
            senderName: scheduledEmail.senderName,
            senderEmail: scheduledEmail.senderEmail,
            recipientContactId: scheduledEmail.recipientContactId || undefined,
            recipientEmail: scheduledEmail.recipientEmail,
            recipientName: scheduledEmail.recipientName || undefined,
            subject: processedSubject,
            body: processedBody,
            templateId: scheduledEmail.templateId || undefined,
            status: 'sent',
            sentAt: new Date(),
          });
          
          log(`[CRON] Successfully sent scheduled email ${scheduledEmail.id} to ${scheduledEmail.recipientEmail}`);
        } catch (error: any) {
          log(`[CRON] Error sending scheduled email ${scheduledEmail.id}: ${error.message}`);
          
          // Mark as failed
          await storage.markScheduledEmailFailed(scheduledEmail.id, error.message || 'Unknown error');
          
          // Create failed email history record
          await storage.createEmailHistory({
            orgId: scheduledEmail.orgId,
            senderId: scheduledEmail.senderId,
            senderName: scheduledEmail.senderName,
            senderEmail: scheduledEmail.senderEmail,
            recipientContactId: scheduledEmail.recipientContactId || undefined,
            recipientEmail: scheduledEmail.recipientEmail,
            recipientName: scheduledEmail.recipientName || undefined,
            subject: scheduledEmail.subject,
            body: scheduledEmail.body,
            templateId: scheduledEmail.templateId || undefined,
            status: 'failed',
            errorMessage: error.message || 'Unknown error',
          });
        }
      }
      
      log(`[CRON] Scheduled email processing complete. Sent ${pendingEmails.length} emails.`);
    } catch (error) {
      log(`[CRON] Error in scheduled email processing: ${error}`);
    }
  });
  
  log('[CRON] Scheduled email processor initialized - will run every 5 minutes');
}
