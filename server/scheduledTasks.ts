import cron from 'node-cron';
import { storage } from './storage';
import { log } from './vite';
import { sendEmail, buildMergeFieldData, processMergeFields } from './email-service';
import { generateInvoicePDF } from './invoiceUtils';
import { generateInvoiceEmailHTML, sendGenericEmail } from './emailUtils';
import { chargeInvoice } from './stripe';
import type { StageHistoryEntry } from '@shared/schema';

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
            const invoiceSentSubject = `Invoice ${invoice.invoiceNumber} from ${org.name}`;
            try {
              const pdfBuffer = await generateInvoicePDF(invoice, client, org);
              const htmlContent = generateInvoiceEmailHTML(invoice, client, org);
              
              await sendGenericEmail({
                to: client.email,
                subject: invoiceSentSubject,
                htmlContent,
                attachments: [{
                  filename: `${invoice.invoiceNumber}.pdf`,
                  content: pdfBuffer,
                  contentType: 'application/pdf',
                }],
              });
              
              log(`[BILLING] Sent invoice ${invoice.invoiceNumber} to ${client.email}`);
              storage.createNotificationLog({
                orgId: org.id,
                type: 'invoice_sent',
                recipientEmail: client.email,
                recipientName: [client.firstName, client.lastName].filter(Boolean).join(' ') || undefined,
                subject: invoiceSentSubject,
                status: 'sent',
                relatedEntityType: 'invoice',
                relatedEntityId: String(invoice.id),
              }).catch((e: unknown) => log(`[BILLING] Failed to create notification log: ${e}`));
            } catch (emailErr) {
              log(`[BILLING] Failed to send invoice email to ${client.email}: ${emailErr}`);
              storage.createNotificationLog({
                orgId: org.id,
                type: 'invoice_sent',
                recipientEmail: client.email,
                recipientName: [client.firstName, client.lastName].filter(Boolean).join(' ') || undefined,
                subject: invoiceSentSubject,
                status: 'failed',
                errorMessage: String(emailErr),
                relatedEntityType: 'invoice',
                relatedEntityId: String(invoice.id),
              }).catch((e: unknown) => log(`[BILLING] Failed to create notification log: ${e}`));
            }
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

/** Escape a string for safe insertion into an HTML context. */
function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function runStuckProspectDigest(): Promise<{ sent: boolean; stuckCount: number; message: string }> {
  const settings = await storage.getPlatformSettings();
  const rawThreshold = Number(settings.stuckProspectThresholdDays);
  // Clamp to a sane integer range; fall back to 7 if the stored value is invalid.
  const thresholdDays: number =
    Number.isFinite(rawThreshold) && rawThreshold >= 1
      ? Math.min(Math.floor(rawThreshold), 365)
      : 7;

  const prospects = await storage.listOnboardingProspects();
  const activeProspects = prospects.filter(p => p.stage !== 'dropped');

  const now = Date.now();
  const stuckProspects: Array<{ name: string; company: string | null; stage: string; daysSince: number }> = [];

  for (const prospect of activeProspects) {
    const history: StageHistoryEntry[] = prospect.stageHistory ?? [];
    const lastEntry = [...history].reverse().find(e => e.stage === prospect.stage);
    const enteredAtRaw: string | Date | null = lastEntry?.enteredAt ?? prospect.updatedAt ?? prospect.createdAt;
    const enteredAt = enteredAtRaw instanceof Date ? enteredAtRaw.toISOString() : (enteredAtRaw ?? new Date().toISOString());
    const daysSince = Math.floor((now - new Date(enteredAt).getTime()) / 86400000);
    if (daysSince >= thresholdDays) {
      stuckProspects.push({
        name: prospect.name,
        company: prospect.company ?? null,
        stage: prospect.stage,
        daysSince,
      });
    }
  }

  if (stuckProspects.length === 0) {
    return { sent: false, stuckCount: 0, message: 'No stuck prospects — digest skipped.' };
  }

  const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.SUPPORT_EMAIL_FROM || 'noreply@hubify.com';
  const toEmail = process.env.SUPPORT_EMAIL_FROM || process.env.SENDGRID_FROM_EMAIL || fromEmail;

  const STAGE_LABELS: Record<string, string> = {
    inquiry: 'Inquiry',
    agreement: 'Agreement',
    payment_setup: 'Payment Setup',
    initial_payment: 'Initial Payment',
    welcome: 'Welcome',
  };

  const rows = stuckProspects
    .map(
      p =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(p.name)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${p.company ? escapeHtml(p.company) : '—'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(STAGE_LABELS[p.stage] ?? p.stage)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#d97706;font-weight:600;">${p.daysSince}d ⚠</td>
        </tr>`
    )
    .join('');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;">
      <h2 style="color:#4F46E5;margin-bottom:4px;">Stuck Prospect Alert</h2>
      <p style="color:#6b7280;margin-top:0;">Daily digest — ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p>${stuckProspects.length} prospect${stuckProspects.length !== 1 ? 's have' : ' has'} been in the same stage for <strong>${thresholdDays}+ days</strong> and may need attention.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #d1d5db;">Name</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #d1d5db;">Company</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #d1d5db;">Stage</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #d1d5db;">Days Stuck</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#6b7280;font-size:13px;margin-top:24px;">Review these prospects in the <a href="https://hubify.com/super-admin" style="color:#4F46E5;">Super Admin panel</a>.</p>
    </div>
  `;

  await sendGenericEmail({
    to: toEmail,
    fromEmail,
    subject: `⚠ ${stuckProspects.length} Stuck Prospect${stuckProspects.length !== 1 ? 's' : ''} Need Attention`,
    htmlContent: html,
  });

  return { sent: true, stuckCount: stuckProspects.length, message: `Digest sent to ${toEmail} — ${stuckProspects.length} stuck prospect(s).` };
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
        // Run billing automation and capture results
        const results = await runBillingAutomation();
        
        // Send summary email immediately after billing run (if configured)
        const supportEmail = process.env.SUPPORT_EMAIL_FROM;
        if (supportEmail && (results.invoicesCreated > 0 || results.invoicesCharged > 0 || results.invoicesFailed > 0)) {
          try {
            // Collect org-level summaries for detailed reporting
            const orgSummaries: Array<{ orgName: string; created: number; charged: number; failed: number }> = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const allOrgs = await storage.getOrgs();
            for (const org of allOrgs) {
              try {
                const clients = await storage.getClients(org.id);
                let orgCreated = 0;
                let orgCharged = 0;
                let orgFailed = 0;
                
                for (const client of clients) {
                  const allInvoices = await storage.getClientInvoices(client.id);
                  const todayAutomatedInvoices = allInvoices.filter((inv: any) => {
                    if (inv.source !== 'automated') return false;
                    const createdAt = new Date(inv.issuedAt || inv.createdAt);
                    return createdAt >= today && createdAt < tomorrow;
                  });
                  
                  orgCreated += todayAutomatedInvoices.length;
                  todayAutomatedInvoices.forEach((inv: any) => {
                    if (inv.status === 'paid') orgCharged++;
                    else if (inv.status === 'failed') orgFailed++;
                  });
                }
                
                if (orgCreated > 0) {
                  orgSummaries.push({ orgName: org.name, created: orgCreated, charged: orgCharged, failed: orgFailed });
                }
              } catch (error) {
                log(`[BILLING] Error collecting org summary for ${org.id}: ${error}`);
              }
            }
            
            // Generate and send summary email
            const summaryHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">
                  Daily Billing Automation Summary
                </h2>
                <p style="color: #666; margin-bottom: 20px;">
                  ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                
                <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="margin-top: 0; color: #374151;">Overall Metrics</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #6B7280;">Invoices Created:</td>
                      <td style="padding: 8px 0; font-weight: bold; color: #10B981;">${results.invoicesCreated}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6B7280;">Invoices Charged:</td>
                      <td style="padding: 8px 0; font-weight: bold; color: #3B82F6;">${results.invoicesCharged}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6B7280;">Invoices Failed:</td>
                      <td style="padding: 8px 0; font-weight: bold; color: #EF4444;">${results.invoicesFailed}</td>
                    </tr>
                  </table>
                </div>
                
                ${results.errors.length > 0 ? `
                  <div style="background: #FEE2E2; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #EF4444;">
                    <h3 style="margin-top: 0; color: #991B1B;">Errors (${results.errors.length})</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      ${results.errors.slice(0, 10).map((error: any, index: number) => `
                        <tr style="${index % 2 === 0 ? '' : 'background: rgba(255,255,255,0.5);'}">
                          <td style="padding: 8px; font-size: 14px; color: #991B1B; font-weight: 600;">${error.clientName}</td>
                          <td style="padding: 8px; font-size: 13px; color: #7F1D1D;">${error.error}</td>
                        </tr>
                      `).join('')}
                      ${results.errors.length > 10 ? `
                        <tr>
                          <td colspan="2" style="padding: 8px; text-align: center; font-style: italic; color: #991B1B;">
                            ... and ${results.errors.length - 10} more errors
                          </td>
                        </tr>
                      ` : ''}
                    </table>
                  </div>
                ` : ''}
                
                ${orgSummaries.length > 0 ? `
                  <h3 style="color: #374151; margin-bottom: 15px;">By Organization</h3>
                  <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #E5E7EB;">
                    <thead>
                      <tr style="background: #F9FAFB;">
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-weight: 600;">Organization</th>
                        <th style="padding: 12px; text-align: center; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-weight: 600;">Created</th>
                        <th style="padding: 12px; text-align: center; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-weight: 600;">Charged</th>
                        <th style="padding: 12px; text-align: center; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-weight: 600;">Failed</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${orgSummaries.map((summary, index) => `
                        <tr style="${index % 2 === 0 ? '' : 'background: #F9FAFB;'}">
                          <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; color: #374151;">${summary.orgName}</td>
                          <td style="padding: 12px; text-align: center; border-bottom: 1px solid #E5E7EB; color: #10B981; font-weight: 600;">${summary.created}</td>
                          <td style="padding: 12px; text-align: center; border-bottom: 1px solid #E5E7EB; color: #3B82F6; font-weight: 600;">${summary.charged}</td>
                          <td style="padding: 12px; text-align: center; border-bottom: 1px solid #E5E7EB; color: #EF4444; font-weight: 600;">${summary.failed}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                ` : ''}
                
                <div style="margin-top: 30px; padding: 15px; background: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 4px;">
                  <p style="margin: 0; color: #92400E; font-size: 14px;">
                    <strong>Note:</strong> This is an automated summary of billing activity. 
                    Failed invoices may require manual review.
                  </p>
                </div>
              </div>
            `;
            
            const billingSummarySubject = `[Hubify] Daily Billing Automation Summary - ${new Date().toLocaleDateString()}`;
            await sendGenericEmail({
              to: supportEmail,
              subject: billingSummarySubject,
              htmlContent: summaryHtml,
            });
            
            log(`[BILLING] Sent summary email to ${supportEmail} - ${results.summary}`);

            // Log billing summary email — attribute to first active org (or first org in list)
            // so the entry is always recorded regardless of whether any org had activity
            const summaryOrg =
              (orgSummaries.length > 0
                ? allOrgs.find(o => o.name === orgSummaries[0].orgName)
                : null) ?? allOrgs[0];
            if (summaryOrg) {
              storage.createNotificationLog({
                orgId: summaryOrg.id,
                type: 'billing_summary',
                recipientEmail: supportEmail,
                subject: billingSummarySubject,
                status: 'sent',
              }).catch((e: unknown) => log(`[BILLING] Failed to create notification log: ${e}`));
            }
          } catch (emailError) {
            log(`[BILLING] Error sending summary email: ${emailError}`);
          }
        }
      } catch (error) {
        log(`[CRON] Error in scheduled billing automation: ${error}`);
      }
    });
    
    log('[CRON] Billing automation scheduled - will run daily at 3am with immediate summary email');
    
    // REMOVED: Separate 3:15 AM summary email job - now integrated into 3 AM run
    
  } else {
    log('[CRON] Billing automation DISABLED (BILLING_AUTOMATION_ENABLED not set to "true")');
  }
  
  // REMOVED: Old separate billing automation code below - now using runBillingAutomation() function
  
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

  // Retry failed webhook deliveries every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const { retryFailedWebhookDeliveries } = await import('./webhookDispatcher');
      await retryFailedWebhookDeliveries();
    } catch (error) {
      log(`[CRON] Error in webhook retry job: ${error}`);
    }
  });

  log('[CRON] Webhook retry job initialized - will run every 5 minutes');

  // ── In-app notifications: overdue tasks ──────────────────────────────────
  // Runs hourly — creates a notification for each org member whose assigned
  // task is past due. Dedup via daily notification check prevents repeat sends.
  // Respects org-level forceEnableAll to override individual preferences.
  cron.schedule('0 * * * *', async () => {
    try {
      log('[CRON] Running overdue-task notification job...');
      const orgs = await storage.getOrgs();
      let notificationsCreated = 0;
      let emailsSent = 0;

      // Fetch all tasks and properties once for efficient org-scoped filtering
      const allTasks = await storage.getTasks();
      const allProperties = await storage.getProperties(true);

      for (const org of orgs) {
        const orgId = org.id;
        const orgDefaults = (org.notificationDefaults as Record<string, unknown>) || {};
        const forceEnableAll = orgDefaults.forceEnableAll === true;
        // taskOverdueHours: minimum hours a task must be past due before sending reminder
        const taskOverdueHours = (orgDefaults.taskOverdueHours as number) ?? 0;
        const now = Date.now();

        // Scope tasks to this org via propertyId → property.orgId, OR assignee's orgId for unlinked tasks
        const orgPropertyIds = new Set(
          (allProperties as Array<{ id: number | string; orgId: string }>)
            .filter((p) => p.orgId === orgId)
            .map((p) => String(p.id))
        );
        const orgUsers = await storage.getUsersByOrg(orgId);
        const orgUserIds = new Set(orgUsers.map((u) => u.id));

        // Pre-filter: tasks that are past due and belong to this org
        // Per-user threshold (taskOverdueHoursOffset) is checked inside the loop
        const overdueTasks = allTasks.filter((t) => {
          if (!t.dueDate || t.status === 'completed' || t.isArchived) return false;
          if (!t.assignedToId) return false;
          // Scope to this org: via propertyId (property → org) OR assignee is in this org
          const belongsToOrg = t.propertyId ? orgPropertyIds.has(String(t.propertyId)) : orgUserIds.has(t.assignedToId);
          if (!belongsToOrg) return false;
          const dueMs = new Date(t.dueDate).getTime();
          // Pre-filter: task must be past due (at least 0 hours); per-user threshold applied in loop
          return now - dueMs >= 0;
        });

        for (const task of overdueTasks) {
          if (!task.assignedToId) continue;
          // Avoid duplicate: check if notification for this task already sent today
          const existing = await storage.getNotifications(task.assignedToId, orgId, 200);
          const alreadySent = existing.some(
            (n) =>
              n.type === 'task_overdue' &&
              n.linkUrl === `/task-profile/${task.id}` &&
              new Date(n.createdAt).toDateString() === new Date().toDateString()
          );
          if (alreadySent) continue;

          const prefs = await storage.getUserNotificationPreferences(task.assignedToId);
          // Effective threshold: user override (taskOverdueHoursOffset) → org default (taskOverdueHours)
          const effectiveHours = prefs?.taskOverdueHoursOffset ?? taskOverdueHours;
          const dueMs = new Date(task.dueDate!).getTime();
          if (now - dueMs < effectiveHours * 3600 * 1000) continue; // not past user's threshold yet

          const inAppEnabled = forceEnableAll || !prefs || prefs.inAppEnabled !== false;
          const emailEnabled = forceEnableAll || !prefs || prefs.emailOnTaskOverdue !== false;

          // Always create notification record for dedup tracking; mark as read if in-app is disabled
          const overdueNotif = await storage.createNotification({
            orgId,
            userId: task.assignedToId,
            type: 'task_overdue',
            title: 'Task Overdue',
            body: `"${task.title}" was due on ${new Date(task.dueDate).toLocaleDateString()} and is still open.`,
            linkUrl: `/task-profile/${task.id}`,
          });
          notificationsCreated++;
          if (!inAppEnabled) {
            await storage.markNotificationRead(overdueNotif.id, task.assignedToId);
          }

          if (emailEnabled) {
            const assignee = await storage.getUser(task.assignedToId);
            if (assignee?.email) {
              const emailSubject = `Overdue Task: ${task.title}`;
              try {
                await sendEmail({
                  to: assignee.email,
                  subject: emailSubject,
                  body: `Your task "${task.title}" was due on ${new Date(task.dueDate).toLocaleDateString()} and is still open.\n\nPlease complete or update this task as soon as possible.`,
                  orgId,
                  fromName: org.name,
                });
                emailsSent++;
                storage.createNotificationLog({
                  orgId,
                  type: 'task_overdue',
                  recipientEmail: assignee.email,
                  recipientName: [assignee.firstName, assignee.lastName].filter(Boolean).join(' ') || undefined,
                  subject: emailSubject,
                  status: 'sent',
                  relatedEntityType: 'task',
                  relatedEntityId: String(task.id),
                }).catch((e: unknown) => log(`[CRON] Failed to create notification log: ${e}`));
              } catch (emailErr) {
                log(`[CRON] Failed to send overdue task email to ${assignee.email}: ${emailErr}`);
                storage.createNotificationLog({
                  orgId,
                  type: 'task_overdue',
                  recipientEmail: assignee.email,
                  recipientName: [assignee.firstName, assignee.lastName].filter(Boolean).join(' ') || undefined,
                  subject: emailSubject,
                  status: 'failed',
                  errorMessage: String(emailErr),
                  relatedEntityType: 'task',
                  relatedEntityId: String(task.id),
                }).catch((e: unknown) => log(`[CRON] Failed to create notification log: ${e}`));
              }
            }
          }
        }
      }
      log(`[CRON] Overdue-task notifications complete. Created ${notificationsCreated} in-app, sent ${emailsSent} emails.`);
    } catch (error) {
      log(`[CRON] Error in overdue-task notification job: ${error}`);
    }
  });

  log('[CRON] Overdue-task notification job initialized - will run hourly');

  // ── Invoice due reminders ─────────────────────────────────────────────────
  // Runs hourly — emails portal users whose linked client has an open invoice
  // due within 3 days (configurable per org). Portal user must have opted in.
  cron.schedule('0 * * * *', async () => {
    try {
      log('[CRON] Running invoice-due reminder job...');
      const orgs = await storage.getOrgs();
      let emailsSent = 0;

      for (const org of orgs) {
        try {
          const orgDefaults = (org.notificationDefaults as Record<string, unknown>) || {};
          const forceEnableAll = orgDefaults.forceEnableAll === true;
          const invoiceDueDays = (orgDefaults.invoiceDueDays as number) ?? 3;
          const dueInvoices = await storage.getClientInvoicesDueSoon(invoiceDueDays);
          const orgInvoices = dueInvoices.filter((inv) => inv.orgId === org.id);

          for (const invoice of orgInvoices) {
            if (!invoice.clientEmail) continue;

            // Find portal user with matching email (opt-in check)
            const portalUsersForOrg = await storage.getPortalUsersByOrg(org.id);
            const portalUser = portalUsersForOrg.find(
              (pu) => pu.email.toLowerCase() === (invoice.clientEmail as string).toLowerCase()
            );

            // Skip if portal user explicitly opted out (unless org forces all notifications)
            if (!forceEnableAll && portalUser && portalUser.emailInvoiceReminders === false) continue;

            // Dedup: check invoice metadata for last reminder sent date
            type InvoiceReminderMeta = { lastReminderSentAt?: string; [key: string]: unknown };
            const meta: InvoiceReminderMeta = (invoice.metadata as InvoiceReminderMeta | null) ?? {};
            const lastSentDate = meta.lastReminderSentAt ? new Date(meta.lastReminderSentAt).toDateString() : null;
            if (lastSentDate === new Date().toDateString()) continue;

            const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'soon';
            const amount = invoice.amountCents
              ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoice.amountCents / 100)
              : '';

            const invoiceReminderSubject = `Payment Reminder: Invoice ${invoice.invoiceNumber || ''} Due ${dueDate}`;
            try {
              await sendEmail({
                to: invoice.clientEmail,
                subject: invoiceReminderSubject,
                body: `This is a friendly reminder that your invoice${invoice.invoiceNumber ? ` #${invoice.invoiceNumber}` : ''} for ${amount} is due on ${dueDate}.\n\nPlease log in to the portal to view and pay your invoice.\n\nThank you!`,
                orgId: org.id,
                fromName: org.name,
              });
              emailsSent++;
              log(`[CRON] Sent invoice reminder to ${invoice.clientEmail} for invoice ${invoice.id}`);

              // Record that reminder was sent today in invoice metadata (dedup marker)
              const updatedMeta: InvoiceReminderMeta = { ...meta, lastReminderSentAt: new Date().toISOString() };
              await storage.updateClientInvoice(invoice.id, {
                metadata: updatedMeta as Record<string, unknown>,
              });

              storage.createNotificationLog({
                orgId: org.id,
                type: 'invoice_due',
                recipientEmail: invoice.clientEmail,
                subject: invoiceReminderSubject,
                status: 'sent',
                relatedEntityType: 'invoice',
                relatedEntityId: String(invoice.id),
              }).catch((e: unknown) => log(`[CRON] Failed to create notification log: ${e}`));
            } catch (emailErr) {
              log(`[CRON] Failed to send invoice reminder to ${invoice.clientEmail}: ${emailErr}`);
              storage.createNotificationLog({
                orgId: org.id,
                type: 'invoice_due',
                recipientEmail: invoice.clientEmail,
                subject: invoiceReminderSubject,
                status: 'failed',
                errorMessage: String(emailErr),
                relatedEntityType: 'invoice',
                relatedEntityId: String(invoice.id),
              }).catch((e: unknown) => log(`[CRON] Failed to create notification log: ${e}`));
            }
          }
          // Staff in-app notifications: per-user invoiceAdvanceDays window
          const allOrgUsers = await storage.getUsersByOrg(org.id);
          const broadInvoices = await storage.getClientInvoicesDueSoon(30);
          const orgBroadInvoices = broadInvoices.filter((inv) => inv.orgId === org.id);
          const nowMs = Date.now();
          for (const staffUser of allOrgUsers) {
            const staffPrefs = await storage.getUserNotificationPreferences(staffUser.id);
            const staffInAppEnabled = forceEnableAll || !staffPrefs || staffPrefs.inAppEnabled !== false;
            const staffNotifEnabled = forceEnableAll || !staffPrefs || staffPrefs.emailOnInvoiceDue !== false;
            if (!staffNotifEnabled) continue;
            const effectiveDays = staffPrefs?.invoiceAdvanceDays ?? invoiceDueDays;
            for (const invoice of orgBroadInvoices) {
              if (!invoice.dueDate) continue;
              const daysUntilDue = (new Date(invoice.dueDate).getTime() - nowMs) / 86400000;
              if (daysUntilDue < 0 || daysUntilDue > effectiveDays) continue;
              const staffExisting = await storage.getNotifications(staffUser.id, org.id, 200);
              const alreadySent = staffExisting.some(
                (n) => n.type === 'invoice_due' && n.linkUrl?.includes(String(invoice.id)) && new Date(n.createdAt).toDateString() === new Date().toDateString()
              );
              if (alreadySent) continue;
              const notif = await storage.createNotification({
                orgId: org.id,
                userId: staffUser.id,
                type: 'invoice_due',
                title: 'Invoice Due Soon',
                body: `Invoice${invoice.invoiceNumber ? ` #${invoice.invoiceNumber}` : ''} is due on ${new Date(invoice.dueDate).toLocaleDateString()}.`,
                linkUrl: `/invoices/${invoice.id}`,
              });
              if (!staffInAppEnabled) await storage.markNotificationRead(notif.id, staffUser.id);
            }
          }
        } catch (orgErr) {
          log(`[CRON] Error processing org ${org.id} invoice reminders: ${orgErr}`);
        }
      }
      log(`[CRON] Invoice-due reminder job complete. Sent ${emailsSent} emails.`);
    } catch (error) {
      log(`[CRON] Error in invoice-due reminder job: ${error}`);
    }
  });

  log('[CRON] Invoice-due reminder job initialized - will run hourly');

  // ── Calendar event reminders ──────────────────────────────────────────────
  // Runs hourly — creates in-app + email notifications for events starting
  // within the configured advance window (default 60 minutes).
  cron.schedule('15 * * * *', async () => {
    try {
      log('[CRON] Running calendar-event reminder job...');
      const orgs = await storage.getOrgs();
      let notificationsCreated = 0;

      for (const org of orgs) {
        try {
          const orgDefaults = (org.notificationDefaults as Record<string, unknown>) || {};
          const forceEnableAll = orgDefaults.forceEnableAll === true;
          const calendarEventMinutes = (orgDefaults.calendarEventMinutes as number) ?? 60;
          // Query with a wide window (24h) so per-user overrides are always captured
          const upcomingEvents = await storage.getEventsStartingSoon(org.id, 24);

          for (const event of upcomingEvents) {
            if (!event.calendarOwnerId) continue;

            const prefs = await storage.getUserNotificationPreferences(event.calendarOwnerId);
            const inAppEnabled = forceEnableAll || !prefs || prefs.inAppEnabled !== false;
            // Effective advance window: user override → org default
            const userAdvanceMinutes = prefs?.calendarAdvanceMinutes ?? calendarEventMinutes;
            // Only notify if event is within user's window or started within the past 60 min (missed run catch)
            const minutesUntilEvent = (new Date(event.start).getTime() - Date.now()) / 60000;
            if (minutesUntilEvent > userAdvanceMinutes || minutesUntilEvent < -60) continue;

            // Avoid duplicate (check within user's advance window + 5min buffer)
            const existing = await storage.getNotifications(event.calendarOwnerId, org.id, 200);
            const alreadySent = existing.some(
              (n) =>
                n.type === 'general' &&
                n.linkUrl?.includes(event.id) &&
                n.title?.includes('Event Reminder') &&
                new Date(n.createdAt) > new Date(Date.now() - userAdvanceMinutes * 60 * 1000 - 5 * 60 * 1000)
            );
            if (alreadySent) continue;

            const eventStart = new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const notifBody = `"${event.title}" starts at ${eventStart}.`;

            // Always create notification for dedup tracking; mark as read if in-app is disabled
            const calendarNotif = await storage.createNotification({
              orgId: org.id,
              userId: event.calendarOwnerId,
              type: 'general',
              title: 'Event Reminder',
              body: notifBody,
              linkUrl: `/calendar?event=${event.id}`,
            });
            notificationsCreated++;
            if (!inAppEnabled) {
              await storage.markNotificationRead(calendarNotif.id, event.calendarOwnerId);
            }

            // Email reminder — use emailOnCalendarEvent preference (independent of in-app toggle)
            const emailEnabled = forceEnableAll || !prefs || prefs.emailOnCalendarEvent !== false;
            if (emailEnabled) {
              const user = await storage.getUser(event.calendarOwnerId);
              if (user?.email) {
                const calReminderSubject = `Reminder: ${event.title} starting soon`;
                try {
                  await sendEmail({
                    to: user.email,
                    subject: calReminderSubject,
                    body: `This is a reminder that "${event.title}" is starting in approximately ${userAdvanceMinutes} minutes at ${eventStart}.\n\n${event.description || ''}`,
                    orgId: org.id,
                    fromName: org.name,
                  });
                  storage.createNotificationLog({
                    orgId: org.id,
                    type: 'calendar_reminder',
                    recipientEmail: user.email,
                    recipientName: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
                    subject: calReminderSubject,
                    status: 'sent',
                    relatedEntityType: 'event',
                    relatedEntityId: String(event.id),
                  }).catch((e: unknown) => log(`[CRON] Failed to create notification log: ${e}`));
                } catch (emailErr) {
                  log(`[CRON] Failed to send event reminder email: ${emailErr}`);
                  storage.createNotificationLog({
                    orgId: org.id,
                    type: 'calendar_reminder',
                    recipientEmail: user.email,
                    recipientName: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
                    subject: calReminderSubject,
                    status: 'failed',
                    errorMessage: String(emailErr),
                    relatedEntityType: 'event',
                    relatedEntityId: String(event.id),
                  }).catch((e: unknown) => log(`[CRON] Failed to create notification log: ${e}`));
                }
              }
            }
          }
        } catch (orgErr) {
          log(`[CRON] Error processing org ${org.id} event reminders: ${orgErr}`);
        }
      }
      log(`[CRON] Calendar-event reminder job complete. Created ${notificationsCreated} notifications.`);
    } catch (error) {
      log(`[CRON] Error in calendar-event reminder job: ${error}`);
    }
  });

  log('[CRON] Calendar-event reminder job initialized - will run hourly at :15');

  // ── Inspection-due reminders ──────────────────────────────────────────────
  // Runs hourly at :30 — sends in-app + email reminders to inspectors for
  // upcoming scheduled inspections. Uses org's inspectionDueDays window.
  // Dedup via notification check prevents repeat sends on the same day.
  cron.schedule('30 * * * *', async () => {
    try {
      log('[CRON] Running inspection-due reminder job...');
      const orgs = await storage.getOrgs();
      let notificationsCreated = 0;
      let emailsSent = 0;

      for (const org of orgs) {
        try {
          const orgDefaults = (org.notificationDefaults as Record<string, unknown>) || {};
          const forceEnableAll = orgDefaults.forceEnableAll === true;
          const inspectionDueDays = (orgDefaults.inspectionDueDays as number) ?? 7;
          // Query with generous window (30 days) so per-user overrides are captured
          const upcomingSchedules = await storage.getUpcomingInspectionSchedules(30);
          const orgSchedules = upcomingSchedules.filter((s) => s.orgId === org.id);

          for (const schedule of orgSchedules) {
            if (!schedule.inspectorUserId) continue;

            const prefs = await storage.getUserNotificationPreferences(schedule.inspectorUserId);
            const inAppEnabled = forceEnableAll || !prefs || prefs.inAppEnabled !== false;
            const emailEnabled = forceEnableAll || !prefs || prefs.emailOnInspectionDue !== false;
            // Effective advance window: user override → org default
            const userInspectionDays = prefs?.inspectionAdvanceDays ?? inspectionDueDays;
            // Only notify if inspection is upcoming and within this user's advance window
            const daysUntilDue = (new Date(schedule.nextDueDate).getTime() - Date.now()) / (1000 * 86400);
            if (daysUntilDue < 0 || daysUntilDue > userInspectionDays) continue;

            // Dedup: check if reminder already sent today for this schedule
            const existing = await storage.getNotifications(schedule.inspectorUserId, org.id, 200);
            const dueDateStr = new Date(schedule.nextDueDate).toLocaleDateString();
            const scheduleIdStr = String(schedule.id);
            const alreadySent = existing.some(
              (n) =>
                n.type === 'inspection_due' &&
                n.linkUrl?.includes(scheduleIdStr) &&
                new Date(n.createdAt).toDateString() === new Date().toDateString()
            );
            if (alreadySent) continue;

            const property = await storage.getProperty(schedule.propertyId);
            const frequencyLabel = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', annually: 'Annual' }[schedule.frequency] ?? schedule.frequency;
            const label = `${frequencyLabel} Inspection${property ? ` - ${property.name}` : ''}`;

            // Always create notification for dedup tracking; mark as read if in-app is disabled
            const inspectionNotif = await storage.createNotification({
              orgId: org.id,
              userId: schedule.inspectorUserId as string,
              type: 'inspection_due',
              title: 'Inspection Due Soon',
              body: `${label} is scheduled for ${dueDateStr}.`,
              linkUrl: `/properties/${schedule.propertyId}?tab=inspections&scheduleId=${scheduleIdStr}`,
            });
            notificationsCreated++;
            if (!inAppEnabled) {
              await storage.markNotificationRead(inspectionNotif.id, schedule.inspectorUserId as string);
            }

            if (emailEnabled) {
              const inspector = await storage.getUser(schedule.inspectorUserId);
              if (inspector?.email) {
                const inspectionReminderSubject = `Upcoming Inspection: ${label}`;
                try {
                  await sendEmail({
                    to: inspector.email,
                    subject: inspectionReminderSubject,
                    body: `You have an upcoming inspection scheduled:\n\nInspection: ${label}\nDue: ${dueDateStr}\n\nPlease review and prepare accordingly.`,
                    orgId: org.id,
                    fromName: org.name,
                  });
                  emailsSent++;
                  storage.createNotificationLog({
                    orgId: org.id,
                    type: 'inspection_reminder',
                    recipientEmail: inspector.email,
                    recipientName: [inspector.firstName, inspector.lastName].filter(Boolean).join(' ') || undefined,
                    subject: inspectionReminderSubject,
                    status: 'sent',
                    relatedEntityType: 'inspection_schedule',
                    relatedEntityId: String(schedule.id),
                  }).catch((e: unknown) => log(`[CRON] Failed to create notification log: ${e}`));
                } catch (emailErr) {
                  log(`[CRON] Failed to send inspection reminder email: ${emailErr}`);
                  storage.createNotificationLog({
                    orgId: org.id,
                    type: 'inspection_reminder',
                    recipientEmail: inspector.email,
                    recipientName: [inspector.firstName, inspector.lastName].filter(Boolean).join(' ') || undefined,
                    subject: inspectionReminderSubject,
                    status: 'failed',
                    errorMessage: String(emailErr),
                    relatedEntityType: 'inspection_schedule',
                    relatedEntityId: String(schedule.id),
                  }).catch((e: unknown) => log(`[CRON] Failed to create notification log: ${e}`));
                }
              }
            }
          }
        } catch (orgErr) {
          log(`[CRON] Error processing org ${org.id} inspection reminders: ${orgErr}`);
        }
      }
      log(`[CRON] Inspection-due reminder job complete. Created ${notificationsCreated} in-app, sent ${emailsSent} emails.`);
    } catch (error) {
      log(`[CRON] Error in inspection-due reminder job: ${error}`);
    }
  });

  log('[CRON] Inspection-due reminder job initialized - will run hourly at :30');

  // ── Automated inspection task generation ─────────────────────────────────
  // Runs daily at 6am — creates inspection tasks for schedules due within 7 days
  cron.schedule('0 6 * * *', async () => {
    try {
      log('[CRON] Running automated inspection task generation...');
      let tasksCreated = 0;
      const upcomingSchedules = await storage.getUpcomingInspectionSchedules(7);
      log(`[CRON] Found ${upcomingSchedules.length} inspection schedules due within 7 days`);

      for (const schedule of upcomingSchedules) {
        try {
          // Check if a task was already created for this schedule's nextDueDate
          const dueDateStr = schedule.nextDueDate.toString().substring(0, 10);
          const existingTask = await storage.getInspectionTaskByScheduleAndDueDate(schedule.id, dueDateStr);
          const alreadyCreated = !!existingTask;

          if (alreadyCreated) {
            log(`[CRON] Inspection task already exists for schedule ${schedule.id} due ${schedule.nextDueDate}`);
          } else {
            // Determine task title
            const property = await storage.getProperty(schedule.propertyId);
            const frequencyLabel = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', annually: 'Annual' }[schedule.frequency] ?? schedule.frequency;
            const taskTitle = `${frequencyLabel} Inspection${property ? ` - ${property.name}` : ''}`;

            // Create the inspection task
            const newTask = await storage.createTask({
              title: taskTitle,
              description: `Automated ${frequencyLabel.toLowerCase()} inspection generated from schedule.`,
              status: 'pending',
              priority: 'normal',
              category: 'inspection',
              propertyId: schedule.propertyId,
              assignedToId: schedule.inspectorUserId ?? undefined,
              dueDate: new Date(schedule.nextDueDate),
              inspectionScheduleId: schedule.id,
            });

            // Apply checklist template items if configured
            if (schedule.templateId) {
              const template = await storage.getChecklistTemplate(schedule.templateId);
              if (template && Array.isArray(template.items) && template.items.length > 0) {
                for (let i = 0; i < template.items.length; i++) {
                  const item = template.items[i] as any;
                  await storage.createTaskChecklistItem({
                    taskId: newTask.id,
                    text: item.text || item.label || '',
                    completed: false,
                    required: item.required ?? false,
                    sortOrder: i,
                  });
                }
              }
            }

            tasksCreated++;
            log(`[CRON] Created inspection task ${newTask.id} for schedule ${schedule.id} due ${schedule.nextDueDate}`);

            // Notify the assigned inspector (in-app + email)
            if (newTask.assignedToId && schedule.orgId) {
              try {
                const orgRecord = await storage.getOrg(schedule.orgId);
                const orgForceAll = (orgRecord?.notificationDefaults as Record<string, unknown>)?.forceEnableAll === true;
                const inspectorPrefs = await storage.getUserNotificationPreferences(newTask.assignedToId);
                const inAppEnabled = orgForceAll || !inspectorPrefs || inspectorPrefs.inAppEnabled !== false;
                if (inAppEnabled) {
                  await storage.createNotification({
                    orgId: schedule.orgId,
                    userId: newTask.assignedToId,
                    type: 'inspection_due',
                    title: 'Inspection Due Soon',
                    body: `${taskTitle} is scheduled for ${new Date(schedule.nextDueDate).toLocaleDateString()}.`,
                    linkUrl: `/task-profile/${newTask.id}`,
                  });
                }
                if (orgForceAll || !inspectorPrefs || inspectorPrefs.emailOnInspectionDue !== false) {
                  const inspector = await storage.getUser(newTask.assignedToId);
                  if (inspector?.email) {
                    const appBaseUrl = process.env.REPLIT_DOMAINS
                      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
                      : 'http://localhost:5000';
                    const taskUrl = `${appBaseUrl}/task-profile/${newTask.id}`;
                    const propertyAddress = property
                      ? [property.address1, property.address2, property.city, property.state, property.zip]
                          .filter(Boolean)
                          .join(', ')
                      : null;
                    const emailBody = [
                      `You have a new inspection task assigned to you.`,
                      ``,
                      `Task: ${taskTitle}`,
                      propertyAddress ? `Property Address: ${propertyAddress}` : null,
                      `Due: ${new Date(schedule.nextDueDate).toLocaleDateString()}`,
                      ``,
                      `View Task: <a href="${taskUrl}">${taskUrl}</a>`,
                    ].filter((line) => line !== null).join('\n');
                    const inspectionTaskSubject = `Upcoming Inspection: ${taskTitle}`;
                    sendEmail({
                      to: inspector.email,
                      subject: inspectionTaskSubject,
                      body: emailBody,
                      orgId: schedule.orgId,
                      fromName: orgRecord?.name || 'Hubify',
                    }).then(() => {
                      storage.createNotificationLog({
                        orgId: schedule.orgId,
                        type: 'inspection_reminder',
                        recipientEmail: inspector.email!,
                        recipientName: [inspector.firstName, inspector.lastName].filter(Boolean).join(' ') || undefined,
                        subject: inspectionTaskSubject,
                        status: 'sent',
                        relatedEntityType: 'task',
                        relatedEntityId: String(newTask.id),
                      }).catch((e: unknown) => log(`[CRON] Failed to create notification log: ${e}`));
                    }).catch((e: unknown) => {
                      log(`[CRON] Failed to send inspection email: ${e}`);
                      storage.createNotificationLog({
                        orgId: schedule.orgId,
                        type: 'inspection_reminder',
                        recipientEmail: inspector.email!,
                        recipientName: [inspector.firstName, inspector.lastName].filter(Boolean).join(' ') || undefined,
                        subject: inspectionTaskSubject,
                        status: 'failed',
                        errorMessage: String(e),
                        relatedEntityType: 'task',
                        relatedEntityId: String(newTask.id),
                      }).catch((le: unknown) => log(`[CRON] Failed to create notification log: ${le}`));
                    });
                  }
                }
              } catch (notifErr) {
                log(`[CRON] Error creating inspection notification: ${notifErr}`);
              }
            }
          }

          // Advance nextDueDate to next occurrence
          const nextDate = new Date(schedule.nextDueDate);
          switch (schedule.frequency) {
            case 'weekly':
              nextDate.setDate(nextDate.getDate() + 7);
              break;
            case 'monthly':
              nextDate.setMonth(nextDate.getMonth() + 1);
              break;
            case 'quarterly':
              nextDate.setMonth(nextDate.getMonth() + 3);
              break;
            case 'annually':
              nextDate.setFullYear(nextDate.getFullYear() + 1);
              break;
          }
          await storage.updateInspectionSchedule(schedule.id, {
            nextDueDate: nextDate.toISOString().split('T')[0],
          });
          log(`[CRON] Advanced schedule ${schedule.id} nextDueDate to ${nextDate.toISOString().split('T')[0]}`);
        } catch (err) {
          log(`[CRON] Error processing inspection schedule ${schedule.id}: ${err}`);
        }
      }

      log(`[CRON] Automated inspection task generation complete. Created ${tasksCreated} tasks.`);
    } catch (error) {
      log(`[CRON] Error in automated inspection task generation: ${error}`);
    }
  });

  log('[CRON] Automated inspection task generation initialized - will run daily at 6am');

  // Run stuck-prospect digest daily at 8am
  cron.schedule('0 8 * * *', async () => {
    try {
      log('[CRON] Running stuck-prospect digest...');
      const result = await runStuckProspectDigest();
      log(`[CRON] Stuck-prospect digest complete: ${result.message}`);
    } catch (error) {
      log(`[CRON] Error in stuck-prospect digest: ${error}`);
    }
  });

  log('[CRON] Stuck-prospect digest initialized - will run daily at 8am');
}
