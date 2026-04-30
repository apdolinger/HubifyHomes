import sgMail, { MailDataRequired } from "@sendgrid/mail";
import type { AttachmentData } from "@sendgrid/helpers/classes/attachment";
import ICAL from "ical.js";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

interface OrgBranding {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

interface EventInvitationData {
  eventTitle: string;
  eventDescription?: string;
  eventLocation?: string;
  eventStart: Date;
  eventEnd: Date;
  organizationName: string;
  organizationBranding?: OrgBranding;
  propertyName?: string;
  taskTitle?: string;
  clientName?: string;
}

export function generateEventInvitationHTML(data: EventInvitationData): string {
  const {
    eventTitle,
    eventDescription,
    eventLocation,
    eventStart,
    eventEnd,
    organizationName,
    organizationBranding = {},
    propertyName,
    taskTitle,
    clientName,
  } = data;

  const primaryColor = organizationBranding.primaryColor || '#0066cc';
  const secondaryColor = organizationBranding.secondaryColor || '#004499';
  const accentColor = organizationBranding.accentColor || '#00aaff';
  const logo = organizationBranding.logo;

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    }).format(date);
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Invitation</title>
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
      background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo {
      max-width: 200px;
      max-height: 80px;
      margin-bottom: 20px;
    }
    .header-text {
      color: #ffffff;
      font-size: 24px;
      font-weight: 600;
      margin: 0;
    }
    .content {
      padding: 40px 30px;
    }
    .event-title {
      font-size: 28px;
      font-weight: 700;
      color: ${primaryColor};
      margin: 0 0 30px 0;
      text-align: center;
    }
    .divider {
      height: 2px;
      background: linear-gradient(to right, transparent, ${accentColor}, transparent);
      margin: 30px 0;
    }
    .detail-row {
      display: flex;
      margin-bottom: 20px;
      align-items: flex-start;
    }
    .detail-icon {
      font-size: 20px;
      margin-right: 12px;
      color: ${accentColor};
      min-width: 24px;
    }
    .detail-content {
      flex: 1;
    }
    .detail-label {
      font-weight: 600;
      color: #555555;
      margin-bottom: 4px;
    }
    .detail-value {
      color: #333333;
      line-height: 1.5;
    }
    .description-box {
      background-color: #f9f9f9;
      border-left: 4px solid ${accentColor};
      padding: 20px;
      margin: 30px 0;
      border-radius: 4px;
    }
    .description-text {
      margin: 0;
      line-height: 1.6;
      color: #555555;
    }
    .calendar-button {
      display: inline-block;
      background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
      color: #ffffff;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
      margin: 30px 0;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .footer {
      background-color: #f5f5f5;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e0e0e0;
    }
    .footer-text {
      color: #777777;
      font-size: 14px;
      margin: 5px 0;
    }
    .attachment-note {
      background-color: #fffbf0;
      border: 1px solid #ffe9a0;
      border-radius: 4px;
      padding: 15px;
      margin: 20px 0;
      text-align: center;
      color: #8b6914;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${logo ? `<img src="${logo}" alt="${organizationName}" class="logo">` : ''}
      <p class="header-text">You're Invited to an Event</p>
    </div>
    
    <div class="content">
      <h1 class="event-title">${eventTitle}</h1>
      
      <div class="divider"></div>
      
      <div class="detail-row">
        <div class="detail-icon">📅</div>
        <div class="detail-content">
          <div class="detail-label">Date</div>
          <div class="detail-value">${formatDateTime(eventStart)}</div>
        </div>
      </div>
      
      <div class="detail-row">
        <div class="detail-icon">🕐</div>
        <div class="detail-content">
          <div class="detail-label">Time</div>
          <div class="detail-value">${formatTime(eventStart)} - ${formatTime(eventEnd)}</div>
        </div>
      </div>
      
      ${eventLocation ? `
      <div class="detail-row">
        <div class="detail-icon">📍</div>
        <div class="detail-content">
          <div class="detail-label">Location</div>
          <div class="detail-value">${eventLocation}</div>
        </div>
      </div>
      ` : ''}
      
      ${propertyName ? `
      <div class="detail-row">
        <div class="detail-icon">🏢</div>
        <div class="detail-content">
          <div class="detail-label">Property</div>
          <div class="detail-value">${propertyName}</div>
        </div>
      </div>
      ` : ''}
      
      ${taskTitle ? `
      <div class="detail-row">
        <div class="detail-icon">✓</div>
        <div class="detail-content">
          <div class="detail-label">Related Task</div>
          <div class="detail-value">${taskTitle}</div>
        </div>
      </div>
      ` : ''}
      
      ${clientName ? `
      <div class="detail-row">
        <div class="detail-icon">👤</div>
        <div class="detail-content">
          <div class="detail-label">Client</div>
          <div class="detail-value">${clientName}</div>
        </div>
      </div>
      ` : ''}
      
      ${eventDescription ? `
      <div class="divider"></div>
      <div class="description-box">
        <p class="description-text">${eventDescription.replace(/\n/g, '<br>')}</p>
      </div>
      ` : ''}
      
      <div class="divider"></div>
      
      <div class="attachment-note">
        📎 This event has been added as a calendar file attachment (.ics) that you can import to your preferred calendar application.
      </div>
    </div>
    
    <div class="footer">
      <p class="footer-text">Sent by <strong>${organizationName}</strong></p>
      <p class="footer-text">This is an automated event invitation from your property management team.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generateICalendarFile(data: EventInvitationData, attendeeEmail: string): string {
  const {
    eventTitle,
    eventDescription,
    eventLocation,
    eventStart,
    eventEnd,
    organizationName,
  } = data;

  // Create iCalendar component
  const cal = new ICAL.Component(['vcalendar', [], []]);
  cal.updatePropertyWithValue('prodid', '-//Hubify//Event Invitation//EN');
  cal.updatePropertyWithValue('version', '2.0');
  cal.updatePropertyWithValue('method', 'REQUEST');

  // Create event component
  const vevent = new ICAL.Component('vevent');
  const event = new ICAL.Event(vevent);

  // Set basic properties
  event.summary = eventTitle;
  event.description = eventDescription || '';
  event.location = eventLocation || '';
  
  // Set times (convert to UTC)
  event.startDate = ICAL.Time.fromJSDate(eventStart, true);
  event.endDate = ICAL.Time.fromJSDate(eventEnd, true);
  
  // Set DTSTAMP (required by RFC 5545)
  vevent.updatePropertyWithValue('dtstamp', ICAL.Time.fromJSDate(new Date(), true));
  
  // Set sequence for versioning
  vevent.updatePropertyWithValue('sequence', '0');
  
  // Set organizer with proper parameters
  const organizer = vevent.addPropertyWithValue('organizer', 'mailto:noreply@hubify.com');
  organizer.setParameter('cn', organizationName);
  
  // Set attendee with proper parameters
  const attendee = vevent.addPropertyWithValue('attendee', `mailto:${attendeeEmail}`);
  attendee.setParameter('role', 'REQ-PARTICIPANT');
  attendee.setParameter('partstat', 'NEEDS-ACTION');
  attendee.setParameter('rsvp', 'TRUE');
  
  // Generate unique ID
  event.uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@hubify.com`;
  
  // Set status
  vevent.updatePropertyWithValue('status', 'CONFIRMED');
  
  // Add event to calendar
  cal.addSubcomponent(vevent);

  return cal.toString();
}

export async function sendEventInvitationEmail(
  recipientEmail: string,
  recipientName: string,
  eventData: EventInvitationData,
  organizerName?: string
): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn("SendGrid API key not configured. Skipping event invitation email.");
    return;
  }

  try {
    const { storage } = await import('./storage.js');
    const { processTemplate } = await import('./templateUtils.js');
    const { createEventInvitationVariables } = await import('./templateUtils.js');
    
    let htmlContent: string;
    let subject: string;
    
    // Try to load the template from database
    const template = await storage.getPlatformTemplateByType('email_invitation');
    
    if (template) {
      // Use stored template with variable replacement
      const variables = createEventInvitationVariables({
        organizationName: eventData.organizationName,
        organizationLogoUrl: eventData.organizationBranding?.logo || null,
        eventTitle: eventData.eventTitle,
        eventDescription: eventData.eventDescription || null,
        eventLocation: eventData.eventLocation || null,
        eventStartTime: eventData.eventStart,
        eventEndTime: eventData.eventEnd,
        recipientName: recipientName,
        organizerName: organizerName || eventData.organizationName,
      });
      
      const processed = processTemplate({
        subject: template.subject,
        htmlContent: template.htmlContent,
      }, variables);
      
      htmlContent = processed.htmlContent;
      subject = processed.subject;
      
      console.log(`Using stored template: ${template.name}`);
    } else {
      // Fall back to hardcoded template
      htmlContent = generateEventInvitationHTML(eventData);
      subject = `Event Invitation: ${eventData.eventTitle}`;
      console.log('No stored template found, using fallback HTML generation');
    }
    
    const icalContent = generateICalendarFile(eventData, recipientEmail);
    
    const msg = {
      to: recipientEmail,
      from: process.env.SENDGRID_FROM_EMAIL || "noreply@hubify.com",
      subject,
      html: htmlContent,
      attachments: [
        {
          content: Buffer.from(icalContent).toString('base64'),
          filename: 'event.ics',
          type: 'text/calendar',
          disposition: 'attachment',
        },
      ],
    };

    await sgMail.send(msg);
    console.log(`Event invitation email sent to ${recipientEmail} (${recipientName})`);
  } catch (error) {
    console.error("Error sending event invitation email:", error);
    throw error;
  }
}

interface InvoiceEmailData {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date | null;
  total: number;
  amountDue: number;
  currency: string;
  clientName: string;
  organizationName: string;
  organizationBranding?: OrgBranding;
  paymentUrl?: string;
  notes?: string;
}

export function generateInvoiceEmailHTML(data: InvoiceEmailData): string {
  const {
    invoiceNumber,
    invoiceDate,
    dueDate,
    total,
    amountDue,
    currency,
    clientName,
    organizationName,
    organizationBranding = {},
    paymentUrl,
    notes,
  } = data;

  const primaryColor = organizationBranding.primaryColor || '#667eea';
  const secondaryColor = organizationBranding.secondaryColor || '#764ba2';
  const logo = organizationBranding.logo;

  const formatCurrency = (amount: number, curr: string): string => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr.toUpperCase(),
    });
    return formatter.format(amount / 100);
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceNumber}</title>
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
      background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo {
      max-width: 200px;
      max-height: 80px;
      margin-bottom: 20px;
    }
    .header-text {
      color: #ffffff;
      font-size: 28px;
      font-weight: 600;
      margin: 0;
    }
    .invoice-number {
      color: #ffffff;
      font-size: 16px;
      margin: 10px 0 0 0;
      opacity: 0.9;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 16px;
      color: #333333;
      margin-bottom: 20px;
    }
    .invoice-details {
      background-color: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin: 25px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 14px;
    }
    .detail-label {
      color: #666666;
      font-weight: 500;
    }
    .detail-value {
      color: #000000;
      font-weight: 600;
    }
    .total-row {
      border-top: 2px solid #e0e0e0;
      padding-top: 12px;
      margin-top: 12px;
      font-size: 18px;
    }
    .total-row .detail-value {
      color: ${primaryColor};
      font-size: 20px;
    }
    .amount-due {
      background: linear-gradient(135deg, ${primaryColor}15 0%, ${secondaryColor}15 100%);
      border-left: 4px solid ${primaryColor};
      border-radius: 6px;
      padding: 15px 20px;
      margin: 25px 0;
      text-align: center;
    }
    .amount-due-label {
      font-size: 14px;
      color: #666666;
      margin-bottom: 5px;
    }
    .amount-due-value {
      font-size: 32px;
      font-weight: bold;
      color: ${primaryColor};
      margin: 0;
    }
    .due-date-notice {
      background-color: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 6px;
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
      color: #856404;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      text-align: center;
    }
    .notes {
      background-color: #f8f9fa;
      border-radius: 6px;
      padding: 15px;
      margin: 25px 0;
      font-size: 14px;
      color: #666666;
    }
    .notes-title {
      font-weight: 600;
      color: #333333;
      margin-bottom: 8px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #999999;
      font-size: 13px;
    }
    .divider {
      height: 2px;
      background: linear-gradient(to right, transparent, ${primaryColor}30, transparent);
      margin: 30px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      ${logo ? `<img src="${logo}" alt="${organizationName}" class="logo">` : ''}
      <h1 class="header-text">Invoice</h1>
      <p class="invoice-number">#${invoiceNumber}</p>
    </div>
    
    <!-- Content -->
    <div class="content">
      <p class="greeting">Dear ${clientName},</p>
      
      <p style="font-size: 15px; color: #666666; line-height: 1.6;">
        Thank you for your business! Please find your invoice details below. 
        ${dueDate ? `Payment is due by <strong>${dueDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>.` : ''}
      </p>
      
      <!-- Invoice Details -->
      <div class="invoice-details">
        <div class="detail-row">
          <span class="detail-label">Invoice Number:</span>
          <span class="detail-value">${invoiceNumber}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Invoice Date:</span>
          <span class="detail-value">${invoiceDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        ${dueDate ? `
        <div class="detail-row">
          <span class="detail-label">Due Date:</span>
          <span class="detail-value">${dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        ` : ''}
        <div class="detail-row total-row">
          <span class="detail-label">Total Amount:</span>
          <span class="detail-value">${formatCurrency(total, currency)}</span>
        </div>
      </div>
      
      <!-- Amount Due -->
      ${amountDue > 0 ? `
      <div class="amount-due">
        <div class="amount-due-label">Amount Due</div>
        <div class="amount-due-value">${formatCurrency(amountDue, currency)}</div>
      </div>
      ` : `
      <div style="text-align: center; padding: 20px; color: #22c55e; font-size: 16px; font-weight: 600;">
        ✓ This invoice has been paid in full
      </div>
      `}
      
      <!-- Due Date Notice -->
      ${dueDate && amountDue > 0 ? `
      <div class="due-date-notice">
        <strong>⏰ Payment Reminder:</strong> Please ensure payment is received by ${dueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} to avoid late fees.
      </div>
      ` : ''}
      
      <!-- Payment Button -->
      ${paymentUrl && amountDue > 0 ? `
      <div style="text-align: center;">
        <a href="${paymentUrl}" class="cta-button">Pay Now</a>
      </div>
      ` : ''}
      
      <div class="divider"></div>
      
      <!-- Notes -->
      ${notes ? `
      <div class="notes">
        <div class="notes-title">Additional Notes:</div>
        <div>${notes}</div>
      </div>
      ` : ''}
      
      <p style="font-size: 14px; color: #666666; margin-top: 30px;">
        The attached PDF contains the complete invoice details including itemized charges.
        If you have any questions about this invoice, please contact us.
      </p>
      
      <p style="font-size: 14px; color: #666666; margin-top: 20px;">
        Thank you for your business!<br>
        <strong>${organizationName}</strong>
      </p>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p style="margin: 0 0 10px 0;">This is an automated invoice notification from ${organizationName}</p>
      <p style="margin: 0;">Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
`;
}

// Generic function to send simple HTML emails
export async function sendGenericEmail({
  to,
  subject,
  htmlContent,
  fromEmail,
  fromName,
  attachments,
}: {
  to: string;
  subject: string;
  htmlContent: string;
  fromEmail?: string;
  fromName?: string;
  attachments?: AttachmentData[];
}): Promise<void> {
  if (!SENDGRID_API_KEY) {
    throw new Error("SENDGRID_API_KEY is not configured. Email sending is disabled.");
  }

  const msg: MailDataRequired = {
    to,
    from: {
      email: fromEmail || process.env.SUPPORT_EMAIL_FROM || "noreply@hubify.app",
      name: fromName || "Hubify",
    },
    subject,
    html: htmlContent,
    ...(attachments && attachments.length > 0 ? { attachments } : {}),
  };

  try {
    await sgMail.send(msg);
  } catch (error: any) {
    console.error("Error sending email:", error.response?.body || error.message);
    throw new Error("Failed to send email. Please try again later.");
  }
}
