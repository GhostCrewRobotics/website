import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { test } from 'node:test';
import { createWaitlistHandler, CONSENT_TEXT, HEADERS } from '../lib/waitlist.mjs';

// Ephemeral test credentials. No real emails, Sheet IDs, tokens, or network requests.
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const credentials = {
  type: 'service_account', client_email: 'test@example.invalid', private_key_id: 'test-key',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
};
const google = 'https://sheets.googleapis.com/v4/spreadsheets/test-sheet/values/';
const mailerlite = 'https://connect.mailerlite.com/api/subscribers';
const data = { name: 'Test Person', email: 'test@example.invalid', organization: 'Test Facility', role: 'Coach', fields: '4–7' };

function request(input = data, overrides = {}) {
  return new Request('https://www.ghostcrewrobotics.com/api/waitlist', {
    method: 'POST',
    headers: { Origin: 'https://www.ghostcrewrobotics.com', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(input),
    ...overrides,
  });
}

function fixture(options = {}) {
  const calls = [], logs = [], rows = [], updates = [];
  const env = {
    VERCEL_ENV: 'production', GOOGLE_SHEET_ID: 'test-sheet',
    GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify(credentials),
    MAILERLITE_API_TOKEN: 'not-a-real-token', MAILERLITE_GROUP_ID: '12345',
    ...options.env,
  };
  let clock = Date.parse('2026-10-21T12:00:00Z');
  let headerValues = options.headerValues || HEADERS.slice(0, 6);
  const fetchImpl = async (url, init = {}) => {
    url = String(url);
    const method = init.method || 'GET';
    calls.push({ url, ...init, method });
    if (url === 'https://oauth2.googleapis.com/token') {
      const assertion = init.body.get('assertion');
      const [header, payload, signature] = assertion.split('.');
      assert.ok(verify('RSA-SHA256', Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature, 'base64url')));
      const claims = JSON.parse(Buffer.from(payload, 'base64url'));
      assert.equal(claims.aud, url);
      assert.equal(claims.scope, 'https://www.googleapis.com/auth/spreadsheets');
      assert.equal(claims.iss, credentials.client_email);
      assert.equal(claims.exp - claims.iat, 3600);
      return Response.json({ access_token: 'fake-access-token', expires_in: 3600 });
    }
    if (url.startsWith(google)) {
      assert.equal(init.headers.Authorization, 'Bearer fake-access-token');
      const range = decodeURIComponent(url.slice(google.length).split('?')[0]);
      if (method === 'GET' && range === "'Waitlist'!A1:K1") {
        return Response.json({ values: [headerValues] });
      }
      if (method === 'PUT' && range === "'Waitlist'!A1:K1") {
        assert.equal(new URL(url).searchParams.get('valueInputOption'), 'RAW');
        headerValues = JSON.parse(init.body).values[0];
        return Response.json({ updatedCells: 11 });
      }
      if (method === 'POST' && range === "'Waitlist'!A:K:append") {
        assert.equal(new URL(url).searchParams.get('valueInputOption'), 'RAW');
        assert.equal(new URL(url).searchParams.get('insertDataOption'), 'INSERT_ROWS');
        if (options.sheetFailure) return Response.json({ secret: 'upstream details' }, { status: 403 });
        rows.push(JSON.parse(init.body).values[0]);
        const row = rows.length + 1;
        return Response.json(options.missingRange ? {} : { updates: { updatedRange: `Waitlist!A${row}:K${row}`, updatedRows: 1 } });
      }
      if (method === 'PUT' && /^'Waitlist'!I\d+:K\d+$/.test(range)) {
        if (options.statusFailure) throw new Error('private upstream failure');
        updates.push(JSON.parse(init.body).values[0]);
        return Response.json({ updatedCells: 3 });
      }
    }
    if (url === `${mailerlite}/${encodeURIComponent(data.email)}` && method === 'GET') {
      return Response.json({ data: { status: options.subscriberStatus || 'active' } }, { status: options.subscriberStatus ? 200 : 404 });
    }
    if (url === mailerlite && method === 'POST') {
      if (options.mailerFailure) return Response.json({ error: 'private upstream failure' }, { status: 429 });
      return Response.json({ data: { id: 'subscriber-1', status: 'active' } }, { status: 201 });
    }
    throw new Error(`Unexpected external operation in test: ${method} ${url}`);
  };
  const handler = createWaitlistHandler({ env, fetchImpl, now: () => clock, logger: { error: (...args) => logs.push(args) } });
  return { handler, calls, logs, rows, updates, advance: (ms) => { clock += ms; } };
}

test('default pause saves opt-in and consent but never contacts MailerLite', async () => {
  const f = fixture();
  const response = await f.handler(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(f.rows.length, 1);
  assert.equal(f.rows[0][6], 'yes');
  assert.equal(f.rows[0][7], CONSENT_TEXT);
  assert.equal(f.rows[0][8], 'queued');
  assert.ok(!f.calls.some((c) => c.url.startsWith(mailerlite)));
});

test('every waitlist signup records email subscription without a separate newsletter field', async () => {
  const f = fixture({ env: { MAILERLITE_SYNC_ENABLED: 'true' } });
  assert.equal((await f.handler(request(data))).status, 200);
  assert.equal(f.rows[0][6], 'yes');
  assert.equal(f.rows[0][7], CONSENT_TEXT);
  assert.equal(f.updates[0][0], 'synced');
  assert.equal(f.calls.filter((c) => c.url === mailerlite && c.method === 'POST').length, 1);
});

test('enabled sync adds only the submitted email, and never imports the Sheet or sends a campaign', async () => {
  const f = fixture({ env: { MAILERLITE_SYNC_ENABLED: 'true' } });
  assert.equal((await f.handler(request())).status, 200);
  const post = f.calls.find((c) => c.url === mailerlite && c.method === 'POST');
  const payload = JSON.parse(post.body);
  assert.deepEqual(payload, {
    email: data.email, fields: { name: data.name, company: data.organization }, groups: ['12345'], resubscribe: false,
  });
  assert.equal(payload.status, undefined);
  assert.deepEqual(f.updates[0], ['synced', f.rows[0][9], '2026-10-21T12:00:00.000Z']);
  assert.ok(!f.calls.some((c) => /campaigns|automations|batch|import/.test(c.url)));
  assert.ok(f.calls.filter((c) => c.url.startsWith(google) && c.method === 'GET').every((c) => decodeURIComponent(c.url).endsWith("'Waitlist'!A1:K1")));
});

for (const status of ['unsubscribed', 'bounced', 'junk', 'unconfirmed']) {
  test(`existing ${status} subscriber is never reactivated or added to a group`, async () => {
    const f = fixture({ subscriberStatus: status, env: { MAILERLITE_SYNC_ENABLED: 'true' } });
    assert.equal((await f.handler(request())).status, 200);
    assert.ok(!f.calls.some((c) => c.url === mailerlite && c.method === 'POST'));
    assert.equal(f.updates[0][0], status);
  });
}

test('existing active subscriber can be updated without explicitly setting status', async () => {
  const f = fixture({ subscriberStatus: 'active', env: { MAILERLITE_SYNC_ENABLED: 'true' } });
  assert.equal((await f.handler(request())).status, 200);
  assert.equal(f.updates[0][0], 'synced');
});

test('Sheet failure never attempts MailerLite and never claims success', async () => {
  const f = fixture({ sheetFailure: true, env: { MAILERLITE_SYNC_ENABLED: 'true' } });
  const response = await f.handler(request());
  assert.equal(response.status, 503);
  assert.equal((await response.json()).ok, false);
  assert.ok(!f.calls.some((c) => c.url.startsWith(mailerlite)));
  assert.ok(!JSON.stringify(f.logs).includes('upstream details'));
});

test('newsletter sync failure preserves waitlist signup and records error for review', async () => {
  const f = fixture({ mailerFailure: true, env: { MAILERLITE_SYNC_ENABLED: 'true' } });
  assert.equal((await f.handler(request())).status, 200);
  assert.equal(f.rows.length, 1);
  assert.equal(f.updates[0][0], 'error');
  assert.ok(!JSON.stringify(f.logs).includes('private upstream failure'));
});

test('failed status write leaves original queued row and does not retry subscriber operations', async () => {
  const f = fixture({ statusFailure: true, env: { MAILERLITE_SYNC_ENABLED: 'true' } });
  assert.equal((await f.handler(request())).status, 200);
  assert.equal(f.rows[0][8], 'queued');
  assert.equal(f.calls.filter((c) => c.url === mailerlite && c.method === 'POST').length, 1);
  assert.equal(f.logs.at(-1)[0], 'mailerlite_status_save_failed');
});

test('missing saved row reference keeps consent queued without contacting MailerLite', async () => {
  const f = fixture({ missingRange: true, env: { MAILERLITE_SYNC_ENABLED: 'true' } });
  assert.equal((await f.handler(request())).status, 200);
  assert.equal(f.rows[0][8], 'queued');
  assert.ok(!f.calls.some((c) => c.url.startsWith(mailerlite)));
});

test('conflicting Sheet columns are never overwritten', async () => {
  const f = fixture({ headerValues: [...HEADERS.slice(0, 6), 'Owner notes'] });
  assert.equal((await f.handler(request())).status, 503);
  assert.ok(!f.calls.some((c) => c.url.startsWith(google) && c.method !== 'GET'));
});

test('cached Google access token is reused and refreshed before expiry', async () => {
  const f = fixture();
  await f.handler(request());
  await f.handler(request());
  assert.equal(f.calls.filter((c) => c.url === 'https://oauth2.googleapis.com/token').length, 1);
  f.advance(3_600_000);
  await f.handler(request());
  assert.equal(f.calls.filter((c) => c.url === 'https://oauth2.googleapis.com/token').length, 2);
  assert.equal(f.rows.length, 3);
});

test('formula-looking names are stored literally using RAW writes', async () => {
  const f = fixture();
  const name = '=1+1';
  assert.equal((await f.handler(request({ ...data, name }))).status, 200);
  assert.equal(f.rows[0][1], name);
});

test('honeypot accepts silently without any external request', async () => {
  const f = fixture();
  assert.equal((await f.handler(request({ _gotcha: 'bot' }))).status, 200);
  assert.equal(f.calls.length, 0);
});

for (const invalid of [
  { ...data, name: '' }, { ...data, email: 'not-an-email' }, { ...data, name: 'x'.repeat(121) },
  { ...data, organization: 'x'.repeat(201) }, { ...data, role: 'Admin' }, { ...data, fields: '1000' },
  { ...data, name: 'Name\nInjected' },
]) {
  test(`invalid input rejected without external requests: ${Object.keys(invalid).find((key) => invalid[key] !== data[key])}`, async () => {
    const f = fixture();
    assert.equal((await f.handler(request(invalid))).status, 400);
    assert.equal(f.calls.length, 0);
  });
}

test('wrong methods, foreign origins, missing origins, and unsupported payloads cannot submit', async () => {
  const f = fixture();
  assert.equal((await f.handler(new Request('https://www.ghostcrewrobotics.com/api/waitlist'))).status, 405);
  assert.equal((await f.handler(request(data, { headers: { Origin: 'https://other.example', 'Content-Type': 'application/json' } }))).status, 403);
  assert.equal((await f.handler(request(data, { headers: { 'Content-Type': 'application/json' } }))).status, 403);
  assert.equal((await f.handler(request(data, { headers: { Origin: 'https://www.ghostcrewrobotics.com', 'Content-Type': 'text/plain' } }))).status, 415);
  assert.equal(f.calls.length, 0);
});

test('oversized and malformed bodies rejected without external requests', async () => {
  const f = fixture();
  assert.equal((await f.handler(request({ name: 'x'.repeat(17000) }))).status, 413);
  assert.equal((await f.handler(request(data, { body: '{invalid', headers: { Origin: 'https://www.ghostcrewrobotics.com', 'Content-Type': 'application/json' } }))).status, 400);
  assert.equal(f.calls.length, 0);
});

test('JSON payloads work, and preview URLs are allowed only in preview', async () => {
  const preview = 'https://website-preview.example.vercel.app';
  const payload = { ...data };
  const req = () => request(data, { body: JSON.stringify(payload), headers: { Origin: preview, 'Content-Type': 'application/json' } });
  const production = fixture({ env: { VERCEL_URL: 'website-preview.example.vercel.app' } });
  assert.equal((await production.handler(req())).status, 403);
  const f = fixture({ env: { VERCEL_ENV: 'preview', VERCEL_URL: 'website-preview.example.vercel.app' } });
  assert.equal((await f.handler(req())).status, 200);
});

test('missing credentials return an actionable failure without leaking their contents', async () => {
  const f = fixture({ env: { GOOGLE_SERVICE_ACCOUNT_JSON: '{}' } });
  const response = await f.handler(request());
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes('GOOGLE_SERVICE_ACCOUNT_JSON'));
  assert.equal(f.calls.length, 0);
});
