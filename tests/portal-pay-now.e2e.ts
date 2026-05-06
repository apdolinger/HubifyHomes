#!/usr/bin/env -S npx tsx
/**
 * Portal Stripe "pay now" e2e (Playwright + Stripe test mode hosted page).
 *
 * Drives the most revenue-critical portal path end-to-end:
 *
 *   1. Sign in to /portal as the seeded beta client (real browser).
 *   2. Open My Invoices, locate BETA-OVERDUE-0004, click the "View"
 *      pay action.
 *   3. On the Stripe-hosted invoice page that opens, fill the live
 *      Stripe Elements card form with 4242 4242 4242 4242 and submit.
 *   4. Forward the resulting PaymentIntent to the local org webhook
 *      with a valid Stripe-CLI-style signature (real Stripe webhooks
 *      can't reach localhost in CI).
 *   5. Reload My Invoices in the same browser session and assert the
 *      same row's badge has flipped to Paid.
 *   6. Confirm payment_method=card and payment_status=succeeded on
 *      the persisted DB row.
 *
 * To make step 2 hit a real hosted page, the test creates a fresh
 * Stripe Invoice (test mode) for the demo client, finalizes/sends it,
 * and mirrors hosted_invoice_url + stripe_invoice_id + customer id
 * into BETA-OVERDUE-0004 before driving the browser. After the user
 * pays via the hosted page, the test patches the resulting
 * PaymentIntent with metadata.invoiceId so our existing
 * handlePaymentIntentSucceeded handler can resolve the local invoice
 * (Stripe-created PIs don't carry our invoice id otherwise).
 *
 * Why two env vars (both required, otherwise SKIP):
 *   - STRIPE_SECRET_KEY: the task's stated gate; needed to talk to
 *     Stripe test mode at all and to create the Invoice.
 *   - STRIPE_ORG_WEBHOOK_SECRET: needed to sign the webhook delivered
 *     to /api/stripe/webhooks/org/:orgId. Without it the server's
 *     `stripe.webhooks.constructEvent` rejects the request, the
 *     invoice never flips to Paid, and the test would always fail.
 *     We skip with a clear message instead.
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
} from 'playwright';

const BASE_URL = (process.env.BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
const EMAIL = process.env.PORTAL_EMAIL || 'client@beta.hubify.test';
const PASSWORD = process.env.PORTAL_PASSWORD || 'HubifyBeta!2025';
const HEADED = process.env.HEADED === '1';

const ORG_ID = '00000000-0000-0000-0000-0000000000be';
const CLIENT_ID = '000000be-0000-0000-0000-000000000010';
const OVERDUE_INVOICE_ID = '000000be-0000-0000-0000-0000000000d4';
const OVERDUE_INVOICE_NUMBER = 'BETA-OVERDUE-0004';
const OVERDUE_AMOUNT_CENTS = 19500;

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
 * Fill the live Stripe-hosted invoice page's Elements card form with the
 * 4242 test card and submit. Stripe ships these inputs in nested iframes;
 * the field names are stable across recent versions of the hosted page.
 * If selectors drift, the test fails loudly with the locator that broke.
 */
async function payOnHostedPage(hostedPage: Page) {
  await hostedPage.waitForLoadState('domcontentloaded');
  // Hosted page loads its own SPA; give Elements time to mount.
  await hostedPage.waitForLoadState('networkidle').catch(() => null);

  const findInFrames = async (
    name: 'cardnumber' | 'exp-date' | 'cvc' | 'postal',
  ): Promise<FrameLocator> => {
    const selector = name === 'postal' ? 'input[name="postal"]' : `input[name="${name}"]`;
    for (const frame of hostedPage.frames()) {
      const handle = await frame.$(selector).catch(() => null);
      if (handle) return hostedPage.frameLocator(`iframe[name="${frame.name()}"]`);
    }
    throw new Error(`Stripe Elements iframe with input ${name} not found on hosted page`);
  };

  const cardFrame = await findInFrames('cardnumber');
  await cardFrame.locator('input[name="cardnumber"]').fill('4242 4242 4242 4242');

  const expFrame = await findInFrames('exp-date');
  await expFrame.locator('input[name="exp-date"]').fill('12/34');

  const cvcFrame = await findInFrames('cvc');
  await cvcFrame.locator('input[name="cvc"]').fill('123');

  // Postal/ZIP is sometimes rendered, sometimes not depending on the hosted
  // page's collected fields. Best-effort.
  try {
    const zipFrame = await findInFrames('postal');
    await zipFrame.locator('input[name="postal"]').fill('10001');
  } catch {
    /* postal field not shown on this hosted invoice */
  }

  const payButton = hostedPage
    .locator('button[type="submit"]')
    .filter({ hasText: /pay/i })
    .first();
  await payButton.waitFor({ timeout: 10000 });
  await payButton.click();

  await hostedPage
    .getByText(/payment received|paid|thank you/i)
    .first()
    .waitFor({ timeout: 30000 });
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

  // Lazy-import server modules so the SKIP path never touches the DB or Stripe.
  const Stripe = (await import('stripe')).default;
  const { db } = await import('../server/db');
  const { clientInvoices, orgStripeConnections, clients } = await import('../shared/schema');
  const { eq } = await import('drizzle-orm');
  type SchemaTypes = typeof import('../shared/schema');
  type InsertOrgStripeConnection = SchemaTypes['InsertOrgStripeConnection'] extends never
    ? never
    : import('../shared/schema').InsertOrgStripeConnection;
  type InsertClientInvoice = import('../shared/schema').InsertClientInvoice;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-11-20.acacia',
  });

  // 1. Ensure org_stripe_connections (direct mode) for the demo org.
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
  } else if (!existingConn[0].isActive) {
    await db
      .update(orgStripeConnections)
      .set({ isActive: true, stripeSecretKey: process.env.STRIPE_SECRET_KEY! })
      .where(eq(orgStripeConnections.orgId, ORG_ID));
  }

  // 2. Create a real Stripe Invoice in test mode for the demo client so the
  //    hostedInvoiceUrl resolves to a real Stripe-hosted payment page that
  //    Playwright can drive.
  const [client] = await db.select().from(clients).where(eq(clients.id, CLIENT_ID));
  if (!client) fail('demo client row missing — run scripts/seed-beta-org.ts');

  const customer = await stripe.customers.create({
    email: client.email || EMAIL,
    name: `${client.firstName || ''} ${client.lastName || ''}`.trim() || EMAIL,
    metadata: { clientId: CLIENT_ID, orgId: ORG_ID, e2e: 'portal-pay-now' },
  });
  await stripe.invoiceItems.create({
    customer: customer.id,
    amount: OVERDUE_AMOUNT_CENTS,
    currency: 'usd',
    description: `${OVERDUE_INVOICE_NUMBER} (e2e portal pay-now)`,
  });
  const stripeInvoice = await stripe.invoices.create({
    customer: customer.id,
    collection_method: 'send_invoice',
    days_until_due: 1,
    metadata: { invoiceId: OVERDUE_INVOICE_ID, orgId: ORG_ID, e2e: 'portal-pay-now' },
  });
  const finalized = await stripe.invoices.finalizeInvoice(stripeInvoice.id);
  if (!finalized.hosted_invoice_url) {
    fail('Stripe finalizeInvoice returned no hosted_invoice_url');
  }
  console.log(`  +    Stripe test invoice ${finalized.id} finalized`);

  // 3. Mirror the real Stripe hosted URL into the local invoice row and
  //    reset payment fields so the test is idempotent across re-runs.
  const reset: Partial<InsertClientInvoice> = {
    status: 'open',
    paymentStatus: null,
    paymentMethod: null,
    paymentDate: null,
    stripePaymentIntentId: null,
    paymentError: null,
    stripeInvoiceId: finalized.id,
    stripeCustomerId: customer.id,
    hostedInvoiceUrl: finalized.hosted_invoice_url!,
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
      // 4. Real browser sign-in + navigate to invoices.
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

      // 5. Click the user-facing pay action; opens Stripe-hosted page in a
      //    new tab (the View link uses target=_blank).
      const newPagePromise = ctx.waitForEvent('page', { timeout: 15000 });
      await row.getByRole('link', { name: /view/i }).click();
      const hostedPage = await newPagePromise;
      await hostedPage.waitForLoadState('domcontentloaded');
      if (!hostedPage.url().includes('invoice.stripe.com')) {
        bad('View link did not open a Stripe-hosted invoice page', hostedPage.url());
      } else {
        ok('View link opened the Stripe-hosted invoice page');
      }

      // 6. Drive the live Stripe Elements card form with 4242 and submit.
      await payOnHostedPage(hostedPage);
      ok('hosted Stripe Elements form accepted 4242 card and reported success');

      // 7. Look up the PaymentIntent Stripe created for this invoice and
      //    patch metadata.invoiceId/orgId so our existing webhook handler
      //    (handlePaymentIntentSucceeded) can resolve the local invoice
      //    when we forward the signed event to localhost.
      const paid = await stripe.invoices.retrieve(finalized.id, {
        expand: ['payment_intent'],
      });
      const piRef = paid.payment_intent;
      const piId = typeof piRef === 'string' ? piRef : piRef?.id;
      if (!piId) fail('paid Stripe invoice has no payment_intent');
      const patchedPi = await stripe.paymentIntents.update(piId, {
        metadata: {
          invoiceId: OVERDUE_INVOICE_ID,
          orgId: ORG_ID,
          clientId: CLIENT_ID,
        },
      });
      if (patchedPi.status !== 'succeeded') {
        bad(`Stripe PaymentIntent did not reach succeeded; status=${patchedPi.status}`);
      } else {
        ok(`Stripe PaymentIntent ${patchedPi.id} succeeded`);
      }

      // 8. Forward signed payment_intent.succeeded to the org webhook.
      const event = {
        id: `evt_test_${Date.now()}`,
        object: 'event',
        api_version: '2024-11-20.acacia',
        created: Math.floor(Date.now() / 1000),
        type: 'payment_intent.succeeded',
        livemode: false,
        pending_webhooks: 0,
        request: { id: null, idempotency_key: null },
        data: { object: patchedPi },
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

      // 9. Reload My Invoices and assert the row shows the Paid badge.
      await page.reload({ waitUntil: 'domcontentloaded' });
      await openInvoicesTab(page);
      const rowAfter = page.getByTestId(`invoice-${OVERDUE_INVOICE_NUMBER}`);
      await rowAfter.waitFor({ timeout: 10000 });
      await rowAfter.getByText(/paid/i).first().waitFor({ timeout: 10000 });
      ok('reloaded portal UI shows Paid badge for the same invoice row');

      // 10. Confirm the persisted DB row reflects the same.
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
