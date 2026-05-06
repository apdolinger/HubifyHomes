#!/usr/bin/env -S npx tsx
/**
 * Portal in-app "Pay Now" e2e (Playwright + Stripe test mode).
 *
 * Drives the embedded Stripe Elements Pay Now flow added in task #59:
 *
 *   1. Sign in to /portal as the seeded beta client (real browser).
 *   2. Open My Invoices, click "Pay Now" on BETA-OVERDUE-0004.
 *   3. The Pay dialog opens. The portal calls
 *      POST /api/portal/invoices/:id/pay-intent which creates a real
 *      PaymentIntent on the org's Stripe account; Stripe Elements
 *      mounts inside the dialog using its client_secret.
 *   4. Fill the live Stripe Elements card form with 4242 4242 4242 4242
 *      and submit (stripe.confirmPayment with redirect:'if_required').
 *   5. Forward a signed payment_intent.succeeded event to the local
 *      org webhook (real Stripe webhooks can't reach localhost in CI).
 *   6. The portal's polling refetch flips the same row to Paid in
 *      place — assert without a manual reload.
 *   7. Confirm payment_method=card and payment_status=succeeded on
 *      the persisted DB row.
 *
 * Why two env vars (both required, otherwise SKIP):
 *   - STRIPE_SECRET_KEY: needed to talk to Stripe test mode at all and
 *     to seed the org_stripe_connections row used by the new endpoint.
 *   - STRIPE_ORG_WEBHOOK_SECRET: needed to sign the webhook delivered
 *     to /api/stripe/webhooks/org/:orgId. Without it the server's
 *     `stripe.webhooks.constructEvent` rejects the request, the
 *     invoice never flips to Paid, and the test would always fail.
 *
 * Run:  npx tsx tests/portal-pay-now.e2e.ts
 *
 * Optional env:
 *   BASE_URL                 default http://localhost:5000
 *   PORTAL_EMAIL             default client@beta.hubify.test
 *   PORTAL_PASSWORD          default HubifyBeta!2025
 *   PLAYWRIGHT_CHROMIUM_PATH default `which chromium`
 *   SKIP_SEED=1              skip running scripts/seed-beta-org.ts
 *   HEADED=1                 run headed
 */

import { spawnSync, execSync } from 'node:child_process';
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
  type FrameLocator,
  type Locator,
} from 'playwright';

const BASE_URL = (process.env.BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
const EMAIL = process.env.PORTAL_EMAIL || 'client@beta.hubify.test';
const PASSWORD = process.env.PORTAL_PASSWORD || 'HubifyBeta!2025';
const HEADED = process.env.HEADED === '1';

const ORG_ID = '00000000-0000-0000-0000-0000000000be';
const CLIENT_ID = '000000be-0000-0000-0000-000000000010';
const OVERDUE_INVOICE_ID = '000000be-0000-0000-0000-0000000000d4';
const OVERDUE_INVOICE_NUMBER = 'BETA-OVERDUE-0004';

function skip(reason: string): never {
  console.log(`SKIP: ${reason}`);
  process.exit(0);
}

function fail(msg: string, detail?: unknown): never {
  console.error(`FAIL: ${msg}`, detail ?? '');
  process.exit(1);
}

function resolveChromium(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  try {
    return execSync('which chromium', { encoding: 'utf8' }).trim() || undefined;
  } catch {
    return undefined;
  }
}

function ensureSeed() {
  if (process.env.SKIP_SEED === '1') return;
  const res = spawnSync('npx', ['tsx', 'scripts/seed-beta-org.ts'], {
    stdio: 'inherit',
    env: process.env,
  });
  if (res.status !== 0) fail(`beta seed exited with status ${res.status}`);
}

async function waitForServer(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${BASE_URL}/api/portal/login`, { method: 'OPTIONS' });
      if (r.status < 500) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  fail(`server not reachable at ${BASE_URL} after ${timeoutMs}ms`);
}

async function freshContext(browser: Browser): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (err) => console.error('  [pageerror]', err.message));
  return { ctx, page };
}

async function signIn(page: Page) {
  await page.goto(`${BASE_URL}/portal/login`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('input-email').fill(EMAIL);
  await page.getByTestId('input-password').fill(PASSWORD);
  await page.waitForFunction(
    ({ e, p }) => {
      const eEl = document.querySelector<HTMLInputElement>('[data-testid="input-email"]');
      const pEl = document.querySelector<HTMLInputElement>('[data-testid="input-password"]');
      return eEl?.value === e && pEl?.value === p;
    },
    { e: EMAIL, p: PASSWORD },
    { timeout: 5000 },
  );
  const loginRespPromise = page.waitForResponse(
    (r) => r.url().includes('/api/portal/login') && r.request().method() === 'POST',
    { timeout: 15000 },
  );
  await page.getByTestId('button-login').click();
  const loginResp = await loginRespPromise;
  if (loginResp.status() !== 200) {
    const body = await loginResp.text().catch(() => '');
    fail(`portal login POST returned ${loginResp.status()}: ${body}`);
  }
  await page.waitForFunction(() => !!localStorage.getItem('portal_token'), null, {
    timeout: 5000,
  });
  if (new URL(page.url()).pathname !== '/portal') {
    await page.goto(`${BASE_URL}/portal`, { waitUntil: 'domcontentloaded' });
  }
  await page.getByTestId('tab-properties').waitFor({ timeout: 20000 });
}

async function openInvoicesTab(page: Page) {
  await page.getByTestId('tab-invoices').click();
  await page
    .getByText(OVERDUE_INVOICE_NUMBER, { exact: false })
    .first()
    .waitFor({ timeout: 15000 });
}

/**
 * Fill the embedded Stripe PaymentElement card form mounted inside the
 * portal Pay dialog with the 4242 test card. PaymentElement loads its
 * inputs in nested iframes; the field names are stable across recent
 * versions. If selectors drift, the test fails loudly.
 */
async function fillPaymentElement(dialog: Locator) {
  // Wait for at least one Stripe iframe to appear inside the dialog.
  await dialog.locator('iframe[name^="__privateStripeFrame"]').first().waitFor({ timeout: 20000 });

  const findFrame = async (
    inputName: 'number' | 'expiry' | 'cvc' | 'postalCode',
  ): Promise<FrameLocator> => {
    const frames = dialog.page().frames();
    for (const frame of frames) {
      const handle = await frame.$(`input[name="${inputName}"]`).catch(() => null);
      if (handle) return dialog.page().frameLocator(`iframe[name="${frame.name()}"]`);
    }
    throw new Error(`Stripe Elements input "${inputName}" not found in Pay dialog`);
  };

  // PaymentElement may need a moment to mount fields after iframe creation.
  const start = Date.now();
  while (Date.now() - start < 15000) {
    const frames = dialog.page().frames();
    const haveNumber = await Promise.any(
      frames.map(async (f) => {
        const h = await f.$('input[name="number"]').catch(() => null);
        if (!h) throw new Error('no');
        return true;
      }),
    ).catch(() => false);
    if (haveNumber) break;
    await new Promise((r) => setTimeout(r, 250));
  }

  const numberFrame = await findFrame('number');
  await numberFrame.locator('input[name="number"]').fill('4242 4242 4242 4242');

  const expFrame = await findFrame('expiry');
  await expFrame.locator('input[name="expiry"]').fill('12 / 34');

  const cvcFrame = await findFrame('cvc');
  await cvcFrame.locator('input[name="cvc"]').fill('123');

  // Postal/ZIP only renders for some locales/billing setups. Best-effort.
  try {
    const zipFrame = await findFrame('postalCode');
    await zipFrame.locator('input[name="postalCode"]').fill('10001');
  } catch {
    /* postal field not shown */
  }
}

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    skip('STRIPE_SECRET_KEY not set — Stripe-test-mode pay-now e2e cannot run');
  }
  if (!process.env.STRIPE_ORG_WEBHOOK_SECRET) {
    skip(
      'STRIPE_ORG_WEBHOOK_SECRET not set — cannot sign the webhook delivered ' +
        'to /api/stripe/webhooks/org/:orgId',
    );
  }

  ensureSeed();
  await waitForServer();

  const Stripe = (await import('stripe')).default;
  const { db } = await import('../server/db');
  const { clientInvoices, orgStripeConnections } = await import('../shared/schema');
  const { eq } = await import('drizzle-orm');
  type SchemaTypes = typeof import('../shared/schema');
  type InsertOrgStripeConnection = SchemaTypes['InsertOrgStripeConnection'] extends never
    ? never
    : import('../shared/schema').InsertOrgStripeConnection;
  type InsertClientInvoice = import('../shared/schema').InsertClientInvoice;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-11-20.acacia',
  });

  // 1. Ensure org_stripe_connections (direct mode) for the demo org so the
  //    new /api/portal/invoices/:id/pay-intent route can talk to Stripe.
  const existingConn = await db
    .select()
    .from(orgStripeConnections)
    .where(eq(orgStripeConnections.orgId, ORG_ID));
  if (existingConn.length === 0) {
    const insert: InsertOrgStripeConnection = {
      orgId: ORG_ID,
      accountType: 'direct',
      stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_seed',
      isActive: true,
    };
    await db.insert(orgStripeConnections).values(insert);
    console.log('  +    seeded org_stripe_connections row (direct mode)');
  } else if (!existingConn[0].isActive || !existingConn[0].stripeSecretKey) {
    await db
      .update(orgStripeConnections)
      .set({
        isActive: true,
        stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
        stripePublishableKey:
          existingConn[0].stripePublishableKey ||
          process.env.STRIPE_PUBLISHABLE_KEY ||
          'pk_test_seed',
      })
      .where(eq(orgStripeConnections.orgId, ORG_ID));
  }

  // 2. Reset the local invoice row so the test is idempotent across re-runs
  //    (clear any prior PI/Stripe customer so the new endpoint creates a
  //    fresh PaymentIntent we can confirm).
  const reset: Partial<InsertClientInvoice> = {
    status: 'open',
    paymentStatus: null,
    paymentMethod: null,
    paymentDate: null,
    stripePaymentIntentId: null,
    stripeCustomerId: null,
    paymentError: null,
    stripeInvoiceId: null,
    hostedInvoiceUrl: null,
  };
  await db.update(clientInvoices).set(reset).where(eq(clientInvoices.id, OVERDUE_INVOICE_ID));

  const executablePath = resolveChromium();
  const browser = await chromium.launch({
    headless: !HEADED,
    executablePath,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  let failures = 0;
  const ok = (label: string) => console.log(`  ok   ${label}`);
  const bad = (label: string, detail?: unknown) => {
    failures += 1;
    console.error(`  FAIL ${label}`, detail ?? '');
  };

  try {
    const { ctx, page } = await freshContext(browser);
    try {
      // 3. Real browser sign-in + navigate to invoices.
      await signIn(page);
      await openInvoicesTab(page);
      const row = page.getByTestId(`invoice-${OVERDUE_INVOICE_NUMBER}`);
      await row.waitFor({ timeout: 10000 });

      const beforeText = (await row.innerText()).toLowerCase();
      if (!beforeText.includes('overdue')) {
        bad('row shows Overdue badge before payment', beforeText);
      } else {
        ok('row shows Overdue badge before payment');
      }

      // 4. Click in-app "Pay Now" — opens the embedded Stripe Elements dialog.
      const payIntentRespPromise = page.waitForResponse(
        (r) => r.url().includes(`/api/portal/invoices/${OVERDUE_INVOICE_ID}/pay-intent`) &&
          r.request().method() === 'POST',
        { timeout: 15000 },
      );
      await row.getByTestId(`button-pay-${OVERDUE_INVOICE_NUMBER}`).click();
      const payIntentResp = await payIntentRespPromise;
      if (payIntentResp.status() !== 200) {
        const body = await payIntentResp.text().catch(() => '');
        fail(`pay-intent POST returned ${payIntentResp.status()}: ${body}`);
      }
      const payIntentBody = await payIntentResp.json();
      if (!payIntentBody?.clientSecret || !payIntentBody?.paymentIntentId) {
        fail('pay-intent response missing clientSecret/paymentIntentId', payIntentBody);
      }
      ok('portal POST /pay-intent returned a Stripe client secret');

      const dialog = page.getByTestId('dialog-pay-invoice');
      await dialog.waitFor({ timeout: 10000 });

      // 5. Drive the embedded PaymentElement with 4242 and confirm.
      await fillPaymentElement(dialog);
      ok('embedded Stripe Elements form filled with 4242 card');

      const confirmBtn = page.getByTestId('button-confirm-pay');
      await confirmBtn.click();

      // 6. Wait for the Stripe PaymentIntent to actually reach succeeded.
      //    stripe.confirmPayment with automatic_payment_methods + a card
      //    typically resolves without needing 3DS for 4242, so the dialog
      //    closes via onPaid() once confirmation returns.
      const piId: string = payIntentBody.paymentIntentId;
      let piStatus = 'unknown';
      const piDeadline = Date.now() + 30000;
      while (Date.now() < piDeadline) {
        const pi = await stripe.paymentIntents.retrieve(piId);
        piStatus = pi.status;
        if (piStatus === 'succeeded') break;
        await new Promise((r) => setTimeout(r, 500));
      }
      if (piStatus !== 'succeeded') {
        bad(`Stripe PaymentIntent did not reach succeeded; last status=${piStatus}`);
      } else {
        ok(`Stripe PaymentIntent ${piId} succeeded`);
      }

      // 7. Forward a signed payment_intent.succeeded webhook to the local
      //    server so handlePaymentIntentSucceeded persists status=paid.
      const succeededPi = await stripe.paymentIntents.retrieve(piId);
      const event = {
        id: `evt_test_${Date.now()}`,
        object: 'event',
        api_version: '2024-11-20.acacia',
        created: Math.floor(Date.now() / 1000),
        type: 'payment_intent.succeeded',
        livemode: false,
        pending_webhooks: 0,
        request: { id: null, idempotency_key: null },
        data: { object: succeededPi },
      };
      const payload = JSON.stringify(event);
      const header = stripe.webhooks.generateTestHeaderString({
        payload,
        secret: process.env.STRIPE_ORG_WEBHOOK_SECRET!,
      });
      const webhookRes = await fetch(`${BASE_URL}/api/stripe/webhooks/org/${ORG_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'stripe-signature': header },
        body: payload,
      });
      if (webhookRes.status !== 200) {
        const body = await webhookRes.text().catch(() => '');
        fail(`org webhook expected 200, got ${webhookRes.status}: ${body}`);
      }
      ok('org webhook accepted signed payment_intent.succeeded event');

      // 8. The portal's polling refetch should flip the row to Paid in
      //    place, without a manual reload.
      const rowAfter = page.getByTestId(`invoice-${OVERDUE_INVOICE_NUMBER}`);
      await rowAfter.getByText(/^paid$/i).first().waitFor({ timeout: 30000 });
      ok('portal UI flipped the same row to Paid without a manual refresh');

      // 9. Confirm the persisted DB row reflects the same.
      const [persisted] = await db
        .select({
          status: clientInvoices.status,
          paymentMethod: clientInvoices.paymentMethod,
          paymentStatus: clientInvoices.paymentStatus,
        })
        .from(clientInvoices)
        .where(eq(clientInvoices.id, OVERDUE_INVOICE_ID));
      if (persisted?.status !== 'paid') {
        bad(`invoice row status=paid persisted, got ${persisted?.status}`);
      } else {
        ok('invoice row status=paid persisted');
      }
      if (persisted?.paymentMethod !== 'card') {
        bad(`invoice row payment_method=card persisted, got ${persisted?.paymentMethod}`);
      } else {
        ok('invoice row payment_method=card persisted');
      }
      if (persisted?.paymentStatus !== 'succeeded') {
        bad(
          `invoice row payment_status=succeeded persisted, got ${persisted?.paymentStatus}`,
        );
      } else {
        ok('invoice row payment_status=succeeded persisted');
      }
    } finally {
      await ctx.close();
    }
  } finally {
    await browser.close();
  }

  console.log(`\n${failures === 0 ? 'PASS' : `${failures} failure(s)`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('FAIL: unexpected error', err);
  process.exit(2);
});
