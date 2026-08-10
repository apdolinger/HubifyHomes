import { sendGenericEmail } from "./emailUtils";
import { storage } from "./storage";
import { getHubifyHomesEmailLogoUrl } from "./brandAsset";

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
  
  // Use org branding colors; default to Hubify teal (not the old blue)
  const primaryColor = organizationBranding.primaryColor || '#0097BD';
  const secondaryColor = organizationBranding.secondaryColor || '#007a99';
  // Only show a logo if the org has explicitly set one — never fall back to the Hubify Homes logo
  const orgLogo = organizationBranding.logo || null;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%);padding:${orgLogo ? '24px 32px' : '28px 32px'};text-align:center;">
              ${orgLogo
                ? `<img src="${orgLogo}" alt="${organizationName}" style="display:block;margin:0 auto 12px;max-width:160px;max-height:60px;width:auto;height:auto;object-fit:contain;"><p style="margin:0;color:#ffffff;font-size:14px;font-weight:500;opacity:0.9;">${organizationName}</p>`
                : `<p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">${organizationName}</p>`}
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 32px;">
              <div style="color:#1e293b;font-size:15px;line-height:1.7;">${body}</div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 40px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:13px;">This message was sent from ${organizationName}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
