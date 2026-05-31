import { wrapInEmailTemplate } from "./email-service";
import { sendGenericEmail } from "./emailUtils";

interface PortalInvitationEmailParams {
  toEmail: string;
  orgName: string;
  orgBranding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  registrationUrl: string;
  expiresAt: Date;
  expiresInDays?: number;
  contactFirstName?: string;
}

export async function sendPortalInvitationEmail(params: PortalInvitationEmailParams): Promise<void> {
  const {
    toEmail,
    orgName,
    orgBranding = {},
    registrationUrl,
    expiresAt,
    contactFirstName,
  } = params;

  const primaryColor = orgBranding.primaryColor || "#0d9488";
  const greeting = contactFirstName ? `Hi ${contactFirstName},` : "Hello,";
  const expiryDateStr = expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const subject = `You're invited to the ${orgName} Client Portal`;

  const body = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#333333;line-height:1.6;">
  <p style="font-size:16px;margin:0 0 16px 0;">${greeting}</p>

  <p style="font-size:16px;margin:0 0 16px 0;">
    <strong>${orgName}</strong> has invited you to access your Client Portal — a private space where you can view your property details, tasks, invoices, and important documents.
  </p>

  <div style="text-align:center;margin:32px 0;">
    <a href="${registrationUrl}"
       style="display:inline-block;background-color:${primaryColor};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:600;">
      Set Up Your Account
    </a>
  </div>

  <p style="font-size:14px;color:#555555;margin:0 0 8px 0;">
    Or copy and paste this link into your browser:
  </p>
  <p style="font-size:13px;word-break:break-all;background-color:#f5f5f5;padding:10px 12px;border-radius:4px;margin:0 0 24px 0;">
    <a href="${registrationUrl}" style="color:${primaryColor};text-decoration:none;">${registrationUrl}</a>
  </p>

  <div style="background-color:#fff8e1;border:1px solid #ffe082;border-radius:6px;padding:12px 16px;margin:0 0 24px 0;">
    <p style="margin:0;font-size:14px;color:#7b5c00;">
      ⏳ <strong>This invitation expires on ${expiryDateStr}.</strong>
      If you need a new link, contact your property manager.
    </p>
  </div>

  <p style="font-size:13px;color:#777777;margin:0;">
    If you did not expect this invitation, you can safely ignore this email.
  </p>
</div>
`.trim();

  const htmlContent = wrapInEmailTemplate({
    body,
    subject,
    organizationName: orgName,
    organizationBranding: orgBranding,
  });

  await sendGenericEmail({
    to: toEmail,
    subject,
    htmlContent,
    fromName: orgName,
  });
}
