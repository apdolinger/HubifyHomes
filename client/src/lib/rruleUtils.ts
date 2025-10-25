import { RRule } from 'rrule';

/**
 * Converts an RRULE string to human-readable text
 * @param rruleString - The RRULE string (without "RRULE:" prefix)
 * @returns Human-readable recurrence description
 */
export function formatRecurrenceRule(rruleString: string | null): string {
  if (!rruleString) return '';
  
  try {
    // Parse the RRULE
    const rrule = RRule.fromString(rruleString);
    
    // Use RRule's built-in toText() method for human-readable format
    return rrule.toText();
  } catch (error) {
    console.error('Failed to parse RRULE:', error);
    return 'Invalid recurrence pattern';
  }
}
