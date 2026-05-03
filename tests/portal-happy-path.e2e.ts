#!/usr/bin/env -S npx tsx
/**
 * Portal happy-path browser e2e.
 *
 * Drives Chromium against the local dev server and the seeded beta demo
 * org: sign in -> /portal -> see a property in My Properties -> see an
 * invoice in My Invoices (and assert BETA-DRAFT-0001 is NOT listed) ->
 * sign out -> revisiting /portal redirects to /portal/login.
 *
 * Run:
 *   npx tsx tests/portal-happy-path.e2e.ts
 *
 * Env:
 *   BASE_URL                  (default http://localhost:5000)
 *   PORTAL_EMAIL              (default client@beta.hubify.test)
 *   PORTAL_PASSWORD           (default HubifyBeta!2025)
 *   PLAYWRIGHT_CHROMIUM_PATH  (default `which chromium`)
 *   SKIP_SEED=1               skip running scripts/seed-beta-org.ts
 *   HEADED=1                  run headed
 */

import { spawnSync, execSync } from 'node:child_process';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

const BASE_URL = (process.env.BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
const EMAIL = process.env.PORTAL_EMAIL || 'client@beta.hubify.test';
const PASSWORD = process.env.PORTAL_PASSWORD || 'HubifyBeta!2025';
const HEADED = process.env.HEADED === '1';

function resolveChromium(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  try {
    return execSync('which chromium', { encoding: 'utf8' }).trim() || undefined;
  } catch {
    return undefined;
  }
}

let failures = 0;
function assert(label: string, cond: boolean, detail?: unknown) {
  if (cond) console.log(`  ok   ${label}`);
  else {
    failures += 1;
    console.error(`  FAIL ${label}`, detail ?? '');
  }
}

function ensureSeed() {
  if (process.env.SKIP_SEED === '1') return;
  const res = spawnSync('npx', ['tsx', 'scripts/seed-beta-org.ts'], {
    stdio: 'inherit',
    env: process.env,
  });
  if (res.status !== 0) {
    console.error('beta seed script exited with status', res.status);
    process.exit(2);
  }
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
  console.error(`server not reachable at ${BASE_URL} after ${timeoutMs}ms`);
  process.exit(2);
}

async function freshContext(browser: Browser): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
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
    throw new Error(`portal login POST returned ${loginResp.status()}: ${body}`);
  }
  await page.waitForFunction(() => !!localStorage.getItem('portal_token'), null, {
    timeout: 5000,
  });
  if (new URL(page.url()).pathname !== '/portal') {
    await page.goto(`${BASE_URL}/portal`, { waitUntil: 'domcontentloaded' });
  }
  await page.getByTestId('tab-properties').waitFor({ timeout: 20000 });
}

async function main() {
  ensureSeed();
  await waitForServer();

  const executablePath = resolveChromium();
  const browser = await chromium.launch({
    headless: !HEADED,
    executablePath,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    console.log('\n[A] sign in -> /portal -> My Properties -> My Invoices');
    {
      const { ctx, page } = await freshContext(browser);
      try {
        await signIn(page);
        assert(
          'lands on /portal after sign-in',
          new URL(page.url()).pathname === '/portal',
          page.url(),
        );

        const headingVisible = await page
          .locator('h1', { hasText: /Hubify Portal/i })
          .first()
          .isVisible()
          .catch(() => false);
        assert('portal header is rendered', headingVisible);

        await page.getByTestId('tab-properties').click();
        const seededPropertyNames = ['Bayshore Estate', 'Palmview Condo 12B'];
        const sawProperty = await Promise.race(
          seededPropertyNames.map((n) =>
            page
              .getByText(n, { exact: false })
              .first()
              .waitFor({ timeout: 15000 })
              .then(() => n)
              .catch(() => null),
          ),
        );
        assert('My Properties shows at least one seeded property', !!sawProperty, sawProperty);

        await page.getByTestId('tab-invoices').click();
        const expectedInvoices = [
          'BETA-SENT-0002',
          'BETA-PAID-0003',
          'BETA-OVERDUE-0004',
          'BETA-CONSOL-0005',
        ];
        const sawInvoice = await Promise.race(
          expectedInvoices.map((n) =>
            page
              .getByText(n, { exact: false })
              .first()
              .waitFor({ timeout: 15000 })
              .then(() => n)
              .catch(() => null),
          ),
        );
        assert('My Invoices shows at least one client-visible invoice', !!sawInvoice, sawInvoice);

        const bodyText = await page.locator('body').innerText();
        assert(
          'BETA-DRAFT-0001 is NOT visible on My Invoices',
          !bodyText.includes('BETA-DRAFT-0001'),
        );
      } finally {
        await ctx.close();
      }
    }

    console.log('\n[B] sign in -> Logout -> revisit /portal -> /portal/login');
    {
      const { ctx, page } = await freshContext(browser);
      try {
        await signIn(page);

        const logoutBtn = page.getByTestId('button-logout');
        await logoutBtn.waitFor({ timeout: 10000 });
        await logoutBtn.click();

        await page
          .waitForURL((u) => new URL(u).pathname === '/portal/login', { timeout: 10000 })
          .catch(() => null);

        await page.goto(`${BASE_URL}/portal`, { waitUntil: 'domcontentloaded' });
        await page.waitForURL((u) => new URL(u).pathname === '/portal/login', { timeout: 10000 });
        assert(
          'revisiting /portal after logout redirects to /portal/login',
          new URL(page.url()).pathname === '/portal/login',
          page.url(),
        );

        await page.getByTestId('input-email').waitFor({ timeout: 5000 });
        assert('login form is rendered after redirect', true);
      } finally {
        await ctx.close();
      }
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
