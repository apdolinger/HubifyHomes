import { storage } from './storage.js';

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
