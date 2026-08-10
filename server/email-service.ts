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

  // Use org branding colors; default to Hubify teal
  const primaryColor = organizationBranding.primaryColor || '#0097BD';
  // Only show a logo if the org has explicitly set one
  const orgLogo = organizationBranding.logo || null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <!--[if mso]><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f2f5;min-width:100%;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!-- Card -->
        <table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;background-color:#ffffff;border-radius:10px;border:1px solid #dde1e7;overflow:hidden;">

          <!-- Accent bar -->
          <tr>
            <td style="background-color:${primaryColor};height:4px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Logo / Brand header -->
          <tr>
            <td align="center" style="padding:32px 40px 24px;">
              ${orgLogo
                ? `<img src="${orgLogo}" alt="${organizationName}" width="140" style="display:block;margin:0 auto;max-width:140px;height:auto;border:0;">`
                : `<p style="margin:0;font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">${organizationName}</p>`}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="border-top:1px solid #e8eaed;font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px 28px;">
              <div style="color:#1e293b;font-size:15px;line-height:1.7;">${body}</div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;border-top:1px solid #e8eaed;padding:18px 40px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">
                This message was sent by <strong style="color:#64748b;">${organizationName}</strong>
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</body>
</html>`;
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
