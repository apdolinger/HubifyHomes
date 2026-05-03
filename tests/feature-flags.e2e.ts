/**
 * Integration test for Task #32 feature flag resolution.
 *
 * Run: `npx tsx tests/feature-flags.e2e.ts`
 *
 * Toggles each of the six seeded flags ON/OFF on a temporary org and
 * verifies the `isFeatureEnabled` resolver returns the expected boolean.
 * The end-to-end UI + API verification (Super Admin → toggle flag →
 * UI hides + API rejects with 403, then toggle back) is performed by the
 * Playwright-based `tests/feature-flags.e2e.md` plan via the testing
 * skill.
 */
import { db } from "../server/db";
import { orgs } from "../shared/schema";
import { eq } from "drizzle-orm";
import { isFeatureEnabled } from "../server/featureFlags";

const FLAGS = [
  "task_cost_tracking",
  "community_profiles",
  "zapier_integration",
  "advanced_reporting",
  "mobile_push_notifications",
  "white_label_branding",
] as const;

const TEST_ORG_ID = "ffffffff-eeee-4444-8888-feeeeeeee032";

let failures = 0;
function assert(label: string, cond: boolean, detail?: unknown) {
  if (cond) console.log(`  ok   ${label}`);
  else {
    failures += 1;
    console.error(`  FAIL ${label}`, detail ?? "");
  }
}

async function setOrgFlags(state: Record<string, boolean>) {
  await db.update(orgs).set({ featureFlags: state }).where(eq(orgs.id, TEST_ORG_ID));
}

async function main() {
  await db
    .insert(orgs)
    .values({ id: TEST_ORG_ID, name: "Feature Flag Test Org" })
    .onConflictDoNothing();

  for (const flag of FLAGS) {
    console.log(`\n[${flag}]`);
    const off: Record<string, boolean> = {};
    for (const f of FLAGS) off[f] = false;
    await setOrgFlags(off);
    assert("resolves false when override OFF", (await isFeatureEnabled(TEST_ORG_ID, flag)) === false);
    await setOrgFlags({ ...off, [flag]: true });
    assert("resolves true when override ON", (await isFeatureEnabled(TEST_ORG_ID, flag)) === true);
  }

  await db.delete(orgs).where(eq(orgs.id, TEST_ORG_ID));
  console.log(`\n${failures === 0 ? "All assertions passed" : `${failures} failure(s)`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
