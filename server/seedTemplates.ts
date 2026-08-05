import { storage } from './storage.js';

// ── Default stage email templates ────────────────────────────────────────────
// Insert-only: never overwrites a template that already exists so customized
// content is preserved.
const DEFAULT_STAGE_EMAIL_TEMPLATES: Array<{
  stage: string;
  subject: string;
  body: string;
  sendAfterDays: number;
  isActive: boolean;
}> = [
  {
    stage: "contact",
    subject: "Thanks for reaching out, {{name}}!",
    body: `Hi {{name}},

Thanks for getting in touch with us! We've received your message and will be following up shortly.

We're excited to learn more about {{company}} and how Hubify can help streamline your property management operations.

In the meantime, feel free to reply to this email with any questions.

Looking forward to connecting,
The Hubify Team`,
    sendAfterDays: 0,
    isActive: true,
  },
  {
    stage: "inquiry",
    subject: "We received your inquiry, {{name}} — here's what's next",
    body: `Hi {{name}},

Thank you for submitting your inquiry about Hubify! We've received your information for {{company}} and our team is reviewing it now.

Here's what to expect next:
1. Our team will review your details and portfolio size
2. We'll reach out within 1–2 business days to discuss your needs
3. If it's a good fit, we'll move forward with an approval

If you have any questions in the meantime, just reply to this email.

Talk soon,
The Hubify Team`,
    sendAfterDays: 0,
    isActive: true,
  },
  {
    stage: "beta_approved",
    subject: "You're in, {{name}} — Founding Member approval confirmed 🎉",
    body: `Hi {{name}},

Great news — {{company}} has been approved as a Hubify Founding Member!

You should have received a separate email with your personal onboarding link. That link will walk you through setting up your workspace, reviewing your Founding Member pricing, and completing your agreement.

**Your Founding Member benefits:**
- Life-locked pricing (your rate never increases as long as you stay active)
- Priority onboarding support
- Direct access to our product roadmap

If you haven't received your onboarding link or it has expired, just reply to this email and we'll send a fresh one right away.

We're thrilled to have you on board.

The Hubify Team`,
    sendAfterDays: 0,
    isActive: true,
  },
  {
    stage: "agreement_pending",
    subject: "Action needed: Your Hubify agreement is ready to sign, {{name}}",
    body: `Hi {{name}},

Your Hubify Founding Member agreement is ready and waiting for your signature.

If your onboarding link has expired, just reply to this email and we'll send a fresh one immediately.

Once the agreement is signed, you'll move straight into payment setup and your workspace will be ready shortly after.

If you have any questions about the agreement terms or your Founding Member pricing, don't hesitate to reach out — we're happy to walk you through it.

The Hubify Team`,
    sendAfterDays: 0,
    isActive: true,
  },
  {
    stage: "agreement",
    subject: "Agreement signed — payment setup is next, {{name}}",
    body: `Hi {{name}},

Your Hubify agreement is signed and on file. 

The next step is completing your payment setup. You should have a link in your onboarding email to do this. The process takes just a few minutes and once it's done, your workspace will be provisioned automatically.

Your Founding Member pricing:
- Monthly subscription (life-locked)
- One-time setup fee

If you have any questions or need your payment link resent, just reply here.

Almost there!
The Hubify Team`,
    sendAfterDays: 0,
    isActive: true,
  },
  {
    stage: "payment_setup",
    subject: "Complete your payment setup, {{name}} — almost done!",
    body: `Hi {{name}},

You're one step away from getting your Hubify workspace up and running!

We noticed your payment setup hasn't been completed yet for {{company}}. This is the final step before your workspace is provisioned.

If you need your payment link resent or have any questions about billing, just reply to this email.

Your Founding Member pricing is locked in and waiting — let's get you across the finish line.

The Hubify Team`,
    sendAfterDays: 0,
    isActive: true,
  },
  {
    stage: "initial_payment",
    subject: "Payment confirmed — your Hubify workspace is being set up, {{name}}",
    body: `Hi {{name}},

Your payment has been received — thank you!

We're now setting up your Hubify workspace for {{company}}. This typically takes just a few minutes. You'll receive a separate email with your login credentials and workspace URL once everything is ready.

**What to expect next:**
1. Workspace provisioning (happening now)
2. Welcome email with login details
3. Onboarding call with your dedicated setup specialist

If anything feels off or you haven't heard from us within the hour, just reply here.

Welcome to Hubify — we're excited to have you!
The Hubify Team`,
    sendAfterDays: 0,
    isActive: true,
  },
  {
    stage: "welcome",
    subject: "Welcome to Hubify, {{name}} — your workspace is ready!",
    body: `Hi {{name}},

Your Hubify workspace for {{company}} is live and ready to go!

Here's how to get started:
1. Log in at your workspace URL (details in the provisioning email)
2. Add your properties and team members
3. Configure your settings and preferences
4. Check out our getting-started guide in the Help section

Our team is here to support you every step of the way. If you have any questions during setup, just reply to this email or reach out through the in-app support chat.

Welcome aboard!
The Hubify Team`,
    sendAfterDays: 0,
    isActive: true,
  },
  {
    stage: "dropped",
    subject: "Keeping the door open, {{name}}",
    body: `Hi {{name}},

I wanted to reach out one more time regarding your Hubify application for {{company}}.

We understand timing isn't always right, and we're holding your spot in case you'd like to revisit in the future.

If circumstances change or you have questions about how Hubify could fit your workflow, I'm happy to reconnect at any time — just reply to this email.

Wishing you and the {{company}} team all the best.

The Hubify Team`,
    sendAfterDays: 0,
    isActive: true,
  },
];

/**
 * Seeds default stage email templates (insert-only, never overwrites existing).
 */
export async function seedDefaultStageEmailTemplates() {
  console.log('[SEED] Seeding default stage email templates…');
  let seeded = 0;
  let skipped = 0;
  for (const tpl of DEFAULT_STAGE_EMAIL_TEMPLATES) {
    try {
      const existing = await storage.getOnboardingStageEmailTemplate(tpl.stage);
      if (!existing) {
        await storage.upsertOnboardingStageEmailTemplate(tpl as any);
        console.log(`[SEED] Created stage template: ${tpl.stage}`);
        seeded++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`[SEED] Error seeding stage template "${tpl.stage}":`, err);
    }
  }
  console.log(`[SEED] Stage email templates: ${seeded} created, ${skipped} already existed.`);
}

/**
 * Seeds default platform templates
 * This should be called once during initial setup or when resetting templates
 */
export async function seedDefaultTemplates() {
  console.log('Seeding default platform templates...');

  const defaultTemplates = [
    {
      type: 'email_invitation',
      name: 'Event Invitation Email',
      subject: '{{organizationName}} - You\'re Invited: {{eventTitle}}',
      variables: [
        'organizationName',
        'organizationLogoUrl',
        'eventTitle',
        'eventDescription',
        'eventLocation',
        'eventStartDate',
        'eventStartTimeOnly',
        'recipientName',
        'organizerName',
        'currentYear'
      ],
      htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 40px; text-align: center;">
              <img src="{{organizationLogoUrl}}" alt="{{organizationName}}" style="max-width: 200px; max-height: 60px; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                You're Invited!
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear {{recipientName}},
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                You're invited to join us for the following event:
              </p>

              <!-- Event Details Card -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
                <tr>
                  <td>
                    <h2 style="color: #667eea; margin: 0 0 15px 0; font-size: 22px;">
                      {{eventTitle}}
                    </h2>
                    
                    <p style="color: #555555; font-size: 15px; line-height: 1.6; margin: 0 0 15px 0;">
                      {{eventDescription}}
                    </p>

                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #333333; font-size: 14px;">📅 Date:</strong>
                          <span style="color: #555555; font-size: 14px; margin-left: 10px;">{{eventStartDate}}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #333333; font-size: 14px;">🕐 Time:</strong>
                          <span style="color: #555555; font-size: 14px; margin-left: 10px;">{{eventStartTimeOnly}}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #333333; font-size: 14px;">📍 Location:</strong>
                          <span style="color: #555555; font-size: 14px; margin-left: 10px;">{{eventLocation}}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                This event has been added to your calendar. We look forward to seeing you there!
              </p>

              <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0;">
                Best regards,<br>
                <strong>{{organizerName}}</strong><br>
                {{organizationName}}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 40px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © {{currentYear}} {{organizationName}}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim(),
      isActive: true,
    },
  ];

  for (const template of defaultTemplates) {
    try {
      // Check if template already exists
      const existing = await storage.getPlatformTemplateByType(template.type);
      
      if (!existing) {
        await storage.createPlatformTemplate(template);
        console.log(`✓ Created template: ${template.name}`);
      } else {
        console.log(`- Template already exists: ${template.name}`);
      }
    } catch (error) {
      console.error(`Error seeding template ${template.name}:`, error);
    }
  }

  console.log('Default templates seeded successfully!');
}

/**
 * Call this function when the server starts (in development) or via a manual endpoint
 */
export async function initializeTemplates() {
  try {
    await seedDefaultTemplates();
  } catch (error) {
    console.error('Error initializing templates:', error);
  }
}

/**
 * Initializes default stage email templates at startup (insert-only, safe to call repeatedly).
 */
export async function initializeStageEmailTemplates() {
  try {
    await seedDefaultStageEmailTemplates();
  } catch (error) {
    console.error('Error initializing stage email templates:', error);
  }
}
