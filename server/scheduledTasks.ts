import cron from 'node-cron';
import { storage } from './storage';
import { log } from './vite';

// Import conflict detection helper - we'll export this from routes
export let detectConflictsForEvent: ((event: any, orgId: string, userId: string) => Promise<number>) | null = null;

export function setConflictDetector(detector: (event: any, orgId: string, userId: string) => Promise<number>) {
  detectConflictsForEvent = detector;
}

export function startScheduledTasks() {
  // Run conflict scan every 12 hours (at 2am and 2pm)
  cron.schedule('0 2,14 * * *', async () => {
    try {
      log('[CRON] Starting automatic conflict scan...');
      
      // Get all organizations
      const orgs = await storage.getOrgs();
      let totalConflicts = 0;
      let totalEvents = 0;
      
      for (const org of orgs) {
        try {
          // Get all events for this org
          const events = await storage.getEvents(org.id);
          totalEvents += events.length;
          
          // For automatic scans, use a system user ID
          const systemUserId = 'system-auto-scanner';
          
          let orgConflicts = 0;
          
          // Scan each event for conflicts
          if (detectConflictsForEvent) {
            for (const event of events) {
              try {
                const count = await detectConflictsForEvent(event, org.id, systemUserId);
                orgConflicts += count;
              } catch (error) {
                // Continue scanning other events even if one fails
                log(`[CRON] Error scanning event ${event.id}: ${error}`);
              }
            }
          }
          
          totalConflicts += orgConflicts;
          log(`[CRON] Scanned ${events.length} events for org ${org.name || org.id}, found ${orgConflicts} conflicts`);
        } catch (error) {
          log(`[CRON] Error scanning org ${org.id}: ${error}`);
        }
      }
      
      log(`[CRON] Automatic conflict scan complete. Scanned ${totalEvents} events across ${orgs.length} organizations, detected ${totalConflicts} conflicts.`);
    } catch (error) {
      log(`[CRON] Error in scheduled conflict scan: ${error}`);
    }
  });
  
  log('[CRON] Scheduled tasks initialized - conflict scan will run every 12 hours at 2am and 2pm');
}
