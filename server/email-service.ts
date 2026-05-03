import { sendGenericEmail } from "./emailUtils";
import { storage } from "./storage";
import { getHubifyHomesLogoUrl } from "./brandAsset";

// Merge field data type
export interface MergeFieldData {
  // Contact fields
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  
  // Property fields
  propertyName?: string;
  propertyAddress?: string;
  propertyCity?: string;
  
  // Sender fields
  senderName?: string;
  senderEmail?: string;
  
  // Organization fields
  organizationName?: string;
  
  // Additional custom fields
  [key: string]: string | undefined;
}

/**
 * Process merge fields in text by replacing {{fieldName}} with actual values
 */
export function processMergeFields(text: string, data: MergeFieldData): string {
  let processed = text;
  
  // Replace each merge field with its value or empty string if not found
  const mergeFieldPattern = /\{\{(\w+)\}\}/g;
  
  processed = processed.replace(mergeFieldPattern, (match, fieldName) => {
    const value = data[fieldName];
    return value !== undefined && value !== null ? value : '';
  });
  
  return processed;
}

/**
 * Build merge field data from contact, property, sender, and org information
 */
export async function buildMergeFieldData(params: {
  contactId?: number;
  propertyId?: number;
  senderId?: string;
  orgId: string;
  additionalData?: Partial<MergeFieldData>;
}): Promise<MergeFieldData> {
  const { contactId, propertyId, senderId, orgId, additionalData = {} } = params;
  const data: MergeFieldData = { ...additionalData };
  
  // Get contact data
  if (contactId) {
    const contact = await storage.getContact(contactId);
    if (contact) {
      data.firstName = contact.firstName || '';
      data.lastName = contact.lastName || '';
      data.fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ');
      data.email = contact.email || '';
      data.phone = contact.phone || '';
    }
  }
  
  // Get property data
  if (propertyId) {
    const property = await storage.getProperty(propertyId);
    if (property) {
      data.propertyName = property.name || '';
      data.propertyAddress = property.address1 || '';
      data.propertyCity = property.city || '';
    }
  }
  
  // Get sender data
  if (senderId) {
    const sender = await storage.getUser(senderId);
    if (sender) {
      data.senderName = [sender.firstName, sender.lastName].filter(Boolean).join(' ') || sender.email || '';
      data.senderEmail = sender.email || '';
    }
  }
  
  // Get organization data
  const org = await storage.getOrg(orgId);
  if (org) {
    data.organizationName = org.name || 'Hubify';
  }
  
  return data;
}

/**
 * Wrap email body in branded HTML template
 */
export function wrapInEmailTemplate(params: {
  body: string;
  subject: string;
  organizationName: string;
  organizationBranding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
}): string {
  const { body, subject, organizationName, organizationBranding = {} } = params;
  
  const primaryColor = organizationBranding.primaryColor || '#0066cc';
  const secondaryColor = organizationBranding.secondaryColor || '#004499';
  const orgLogo = organizationBranding.logo;
  const logo = orgLogo || getHubifyHomesLogoUrl();
  const logoAlt = orgLogo ? organizationName : 'Hubify Homes';
  
  return `
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
      background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
      padding: 30px 20px;
      text-align: center;
    }
    ${logo ? `
    .logo {
      max-width: 200px;
      max-height: 80px;
      margin-bottom: 15px;
    }
    ` : ''}
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
      ${logo ? `<img src="${logo}" alt="${logoAlt}" width="200" height="60" class="logo" style="max-width:200px;max-height:80px;height:auto;width:auto;">` : ''}
      <p class="header-text">${organizationName}</p>
    </div>
    <div class="content">
      <div class="message">${body}</div>
    </div>
    <div class="footer">
      <p class="footer-text">This message was sent from ${organizationName}</p>
    </div>
  </div>
</body>
</html>
`.trim();
}

/**
 * Send an email with branding and merge field support
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
  orgId: string;
  fromName?: string;
  fromEmail?: string;
}): Promise<void> {
  const { to, subject, body, orgId, fromName, fromEmail } = params;
  
  // Get organization details for branding
  const org = await storage.getOrg(orgId);
  const organizationName = org?.name || 'Hubify';
  const organizationBranding = org?.branding || {};
  
  // Wrap body in HTML template
  const htmlContent = wrapInEmailTemplate({
    body,
    subject,
    organizationName,
    organizationBranding,
  });
  
  // Send email using sendGenericEmail
  await sendGenericEmail({
    to,
    subject,
    htmlContent,
    fromName: fromName || organizationName,
    fromEmail,
  });
}
