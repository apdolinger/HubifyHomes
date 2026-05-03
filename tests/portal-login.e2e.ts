#!/usr/bin/env -S npx tsx
/**
 * Wire test for the portal login API after dropping the org-id field.
 *
 * Posts the seeded beta credentials to POST /api/portal/login and asserts
 * a 200 with a session token. Run by hand:
 *
 *   npx tsx tests/portal-login.e2e.ts
 *
 * Optional env: BASE_URL (default http://localhost:5000).
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const EMAIL = process.env.PORTAL_EMAIL || 'client@beta.hubify.test';
const PASSWORD = process.env.PORTAL_PASSWORD || 'HubifyBeta!2025';

async function main() {
  const url = `${BASE_URL.replace(/\/$/, '')}/api/portal/login`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const text = await res.text();
  let body: any = null;
  try { body = JSON.parse(text); } catch { body = text; }

  if (res.status !== 200) {
    console.error(`FAIL: expected 200, got ${res.status}`);
    console.error(body);
    process.exit(1);
  }
  if (!body || typeof body.token !== 'string' || body.token.length < 16) {
    console.error('FAIL: response missing valid session token');
    console.error(body);
    process.exit(1);
  }
  if (!body.user || body.user.email !== EMAIL) {
    console.error(`FAIL: response user.email mismatch (got ${body.user?.email})`);
    process.exit(1);
  }

  console.log(`PASS: portal login (${EMAIL}) -> 200, token len=${body.token.length}, orgId=${body.user.orgId}`);

  const badRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: 'wrong-password' }),
  });
  if (badRes.status !== 401) {
    console.error(`FAIL: bad password expected 401, got ${badRes.status}`);
    process.exit(1);
  }
  console.log('PASS: bad password -> 401');
}

main().catch((err) => {
  console.error('FAIL: unexpected error', err);
  process.exit(1);
});
