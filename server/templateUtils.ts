/**
 * Template processing utilities for variable replacement
 */

export interface TemplateVariables {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Replaces template variables in the format {{variableName}} with actual values
 * @param template - The template string containing variables
 * @param variables - Object containing variable names and their values
 * @returns The processed template with variables replaced
 */
export function replaceTemplateVariables(
  template: string,
  variables: TemplateVariables
): string {
  if (!template) return '';
  
  let result = template;
  
  // Replace all {{variableName}} occurrences with actual values
  Object.keys(variables).forEach(key => {
    const value = variables[key];
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value !== null && value !== undefined ? String(value) : '');
  });
  
  // Remove any remaining unreplaced variables (optional - could also leave them as-is)
  // result = result.replace(/\{\{[^}]+\}\}/g, '');
  
  return result;
}

/**
 * Processes a complete template including subject and HTML content
 * @param template - Template object with subject and htmlContent
 * @param variables - Variables to replace
 * @returns Processed template with variables replaced
 */
export function processTemplate(
  template: { subject: string; htmlContent: string },
  variables: TemplateVariables
): { subject: string; htmlContent: string } {
  return {
    subject: replaceTemplateVariables(template.subject, variables),
    htmlContent: replaceTemplateVariables(template.htmlContent, variables),
  };
}

/**
 * Validates that all required variables are present
 * @param template - Template string
 * @param variables - Provided variables
 * @returns Array of missing variable names
 */
export function getMissingVariables(
  template: string,
  variables: TemplateVariables
): string[] {
  const requiredVars = extractVariableNames(template);
  const providedVars = Object.keys(variables);
  
  return requiredVars.filter(varName => !providedVars.includes(varName));
}

/**
 * Extracts all variable names from a template
 * @param template - Template string
 * @returns Array of variable names found in the template
 */
export function extractVariableNames(template: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches: string[] = [];
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    const varName = match[1].trim();
    if (!matches.includes(varName)) {
      matches.push(varName);
    }
  }
  
  return matches;
}

/**
 * Creates default template variables for event invitations
 */
export function createEventInvitationVariables(data: {
  organizationName: string;
  organizationLogoUrl?: string | null;
  eventTitle: string;
  eventDescription?: string | null;
  eventLocation?: string | null;
  eventStartTime: Date;
  eventEndTime?: Date;
  recipientName?: string;
  organizerName: string;
}): TemplateVariables {
  return {
    organizationName: data.organizationName,
    organizationLogoUrl: data.organizationLogoUrl || '',
    eventTitle: data.eventTitle,
    eventDescription: data.eventDescription || '',
    eventLocation: data.eventLocation || 'Location TBD',
    eventStartTime: data.eventStartTime.toLocaleString(),
    eventStartDate: data.eventStartTime.toLocaleDateString(),
    eventStartTimeOnly: data.eventStartTime.toLocaleTimeString(),
    eventEndTime: data.eventEndTime ? data.eventEndTime.toLocaleString() : '',
    recipientName: data.recipientName || 'there',
    organizerName: data.organizerName,
    currentYear: new Date().getFullYear(),
  };
}
