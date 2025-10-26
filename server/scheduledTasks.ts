import cron from 'node-cron';
import { storage } from './storage';
import { log } from './vite';

// Import conflict detection helper - we'll export this from routes
export let detectConflictsForEvent: ((event: any, orgId: string, userId: string) => Promise<number>) | null = null;

export function setConflictDetector(detector: (event: any, orgId: string, userId: string) => Promise<number>) {
  detectConflictsForEvent = detector;
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
          
          // Get all tasks for this org
          const tasks = await storage.getTasks();
          const orgTasks = tasks.filter((t: any) => {
            // Filter tasks belonging to this org (via property or assigned user)
            // For now, we'll check if task has a property and that property belongs to this org
            return !t.isArchived; // Only process non-archived tasks
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
                await storage.archiveTask(task.id);
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

  // TODO: Re-enable billing automation after fixing email imports
  // Run billing automation daily at 3am
  /* TEMPORARILY DISABLED - NEEDS EMAIL IMPORT FIX
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
                const mailService = new MailService();
                await mailService.sendInvoiceEmail({
                  to: client.email,
                  subject: `Invoice ${invoice.invoiceNumber} from ${org.name}`,
                  invoiceNumber: invoice.invoiceNumber,
                  amountCents: invoice.amountCents,
                  dueDate: invoice.dueDate!,
                  customMessage: 'This is an automated billing invoice based on your billing schedule.',
                  pdfBuffer,
                  organizationName: org.name,
                });
                
                // Update invoice as sent
                await storage.updateClientInvoice(invoice.id, {
                  sentAt: new Date()
                });
                
                totalInvoicesCreated++;
                log(`[CRON] Successfully created and sent automated invoice ${invoice.invoiceNumber} to ${client.email}`);
              } else {
                log(`[CRON] Warning: Client ${client.firstName} ${client.lastName} has no email address, invoice created but not sent`);
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
  */
  
  // log('[CRON] Billing automation scheduled - will run daily at 3am');
}
