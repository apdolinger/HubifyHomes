#!/usr/bin/env -S npx tsx
/**
 * Wire test for GET /api/portal/invoices.
 *
 * Asserts the seeded portal user can list invoices and that draft invoices
 * are filtered out server-side (they must never leak to the client).
 *
 *   npx tsx tests/portal-invoices.e2e.ts
 *
 * Optional env: BASE_URL (default http://localhost:5000).
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const EMAIL = process.env.PORTAL_EMAIL || 'client@beta.hubify.test';
const PASSWORD = process.env.PORTAL_PASSWORD || 'HubifyBeta!2025';

async function main() {
  const loginRes = await fetch(`${BASE_URL}/api/portal/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (loginRes.status !== 200) {
    console.error(`FAIL: login expected 200, got ${loginRes.status}`);
    process.exit(1);
  }
  const { token } = (await loginRes.json()) as { token: string };

  const res = await fetch(`${BASE_URL}/api/portal/invoices`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status !== 200) {
    console.error(`FAIL: invoices expected 200, got ${res.status}`);
    process.exit(1);
  }
  const invoices = (await res.json()) as Array<{
    invoiceNumber: string | null;
    status: string;
  }>;
  if (!Array.isArray(invoices)) {
    console.error('FAIL: invoices response is not an array');
    process.exit(1);
  }

  const drafts = invoices.filter((i) => i.status === 'draft');
  if (drafts.length > 0) {
    console.error(`FAIL: drafts leaked to portal (${drafts.length} found)`);
    console.error(drafts);
    process.exit(1);
  }
  if (invoices.some((i) => i.invoiceNumber === 'BETA-DRAFT-0001')) {
    console.error('FAIL: BETA-DRAFT-0001 visible to portal user');
    process.exit(1);
  }

  const expected = ['BETA-SENT-0002', 'BETA-PAID-0003', 'BETA-OVERDUE-0004', 'BETA-CONSOL-0005'];
  const numbers = new Set(invoices.map((i) => i.invoiceNumber));
  const missing = expected.filter((n) => !numbers.has(n));
  if (missing.length > 0) {
    console.error(`FAIL: expected invoices missing: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log(
    `PASS: /api/portal/invoices -> ${invoices.length} invoice(s), 0 drafts; expected non-drafts present`,
  );
}

main().catch((err) => {
  console.error('FAIL: unexpected error', err);
  process.exit(1);
});
