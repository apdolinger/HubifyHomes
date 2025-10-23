import sgMail from "@sendgrid/mail";
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
  eventData: EventInvitationData
): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn("SendGrid API key not configured. Skipping event invitation email.");
    return;
  }

  try {
    const htmlContent = generateEventInvitationHTML(eventData);
    const icalContent = generateICalendarFile(eventData, recipientEmail);
    
    const msg = {
      to: recipientEmail,
      from: process.env.SENDGRID_FROM_EMAIL || "noreply@hubify.com",
      subject: `Event Invitation: ${eventData.eventTitle}`,
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
