import { db } from '../server/db';
import { activityLog } from '../shared/schema';
import { ilike } from 'drizzle-orm';

async function run() {
  const deleted = await db.delete(activityLog)
    .where(ilike(activityLog.description, '%Dolinger%'))
    .returning({ id: activityLog.id, description: activityLog.description });
  console.log('Deleted:', JSON.stringify(deleted));
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
