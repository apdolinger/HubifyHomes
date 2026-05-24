/**
 * Hubify Demo Tenant Seeder
 *
 * Idempotent — safe to run multiple times.
 *
 * Usage:
 *   npx tsx scripts/seed-demo-tenant.ts           # local / staging
 *   npx tsx scripts/seed-demo-tenant.ts --force   # required in production
 *   npx tsx scripts/seed-demo-tenant.ts --reset   # wipe and reseed
 *
 * Credentials:
 *   Staff admin:   demo@hubifyhomesonline.com  /  Demo2026!
 *   Portal client: client@demo.hubifyhomesonline.com  /  DemoClient2026!
 *
 * Org:    Hubify Demo Portfolio
 * Org ID: 00000000-0000-0000-0000-000000000de0
 * Domain: demo.hubifyhomesonline.com
 */

import { pool } from "../server/db";
import { seedDemoTenant, resetDemoTenant } from "../server/demoSeed";

function guardProduction() {
  const isProd = process.env.NODE_ENV === "production";
  const force = process.argv.includes("--force");
  if (isProd && !force) {
    console.error(
      "REFUSING to run demo seed in production. Re-run with --force if you really mean it."
    );
    process.exit(1);
  }
  if (isProd && force) {
    console.warn("⚠️  --force given: running demo seed against PRODUCTION DB.");
  }
}

async function main() {
  guardProduction();

  const doReset = process.argv.includes("--reset");

  if (doReset) {
    console.log("=== Demo Tenant RESET ===");
    const { created, skipped } = await resetDemoTenant();
    console.log(`\n=== Reset complete — ${created} created, ${skipped} skipped ===`);
  } else {
    console.log("=== Demo Tenant Seed ===");
    const { created, skipped } = await seedDemoTenant();
    console.log(`\n=== Seed complete — ${created} created, ${skipped} skipped ===`);
  }

  console.log(`
Org:          Hubify Demo Portfolio
Org ID:       00000000-0000-0000-0000-000000000de0
Staff login:  /staff/login
  email:      demo@hubifyhomesonline.com
  password:   Demo2026!
Portal login: /portal/login
  email:      client@demo.hubifyhomesonline.com
  password:   DemoClient2026!
Demo site:    https://demo.hubifyhomesonline.com
`);
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Demo seed failed:", err);
    try { await pool.end(); } catch {}
    process.exit(1);
  });
