import { randomUUID, sign } from 'node:crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const MAILERLITE_URL = 'https://connect.mailerlite.com/api/subscribers';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const MAX_BODY_BYTES = 16_384;
export const CONSENT_TEXT = 'Send me occasional GhostCrew news, product updates, and pilot announcements.';
export const HEADERS = [
  'Timestamp', 'Name', 'Email', 'Facility / organization', 'Role', 'Number of fields',
  'Newsletter opt-in', 'Newsletter consent text', 'MailerLite status', 'Signup ID', 'Sync updated at',
];
const ROLES = new Set(['', 'Facility director', 'Tournament director', 'Coach', 'Parks & recreation', 'Other']);
const FIELDS = new Set(['', '1–3', '4–7', '8+']);

class UpstreamError extends Error {
  constructor(service, status) {
    super(`${service} request failed`);
    this.service = service;
    this.status = status;
  }
}

function reply(status, body, extraHeaders = {}) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', ...extraHeaders },
  });
}

function isSameSite(request, env) {
  const origin = request.headers.get('origin');
  if (!origin || request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const allowed = new Set(['https://ghostcrewrobotics.com', 'https://www.ghostcrewrobotics.com']);
  if (env.VERCEL_ENV === 'preview') {
    for (const host of [env.VERCEL_URL, env.VERCEL_BRANCH_URL]) {
      if (host) allowed.add(`https://${host}`);
    }
  }
  if (!env.VERCEL_ENV && ['localhost', '127.0.0.1'].includes(new URL(request.url).hostname)) {
    allowed.add(new URL(request.url).origin);
  }
  return allowed.has(origin);
}

function validate(input) {
  const limits = { name: 120, email: 254, organization: 200, role: 80, fields: 10 };
  const data = {};
  for (const [field, max] of Object.entries(limits)) {
    const value = input[field] ?? '';
    if (typeof value !== 'string' || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) return null;
    data[field] = value.trim();
  }
  data.email = data.email.toLowerCase();
  if (!data.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return null;
  if (!ROLES.has(data.role) || !FIELDS.has(data.fields)) return null;
  if (input.newsletter !== undefined && ![true, false, 'yes', ''].includes(input.newsletter)) return null;
  data.newsletter = input.newsletter === true || input.newsletter === 'yes';
  return data;
}

// Dependencies are injectable so tests never contact real services or use real keys.
export function createWaitlistHandler({ env = process.env, fetchImpl = globalThis.fetch, now = Date.now, logger = console } = {}) {
  let tokenCache;
  let headersReady;

  async function fetchJson(url, init, service) {
    const response = await fetchImpl(url, {
      ...init,
      redirect: 'error',
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new UpstreamError(service, response.status);
    return response.json();
  }

  async function accessToken(credentials) {
    if (tokenCache && tokenCache.expires > now() + 60_000) return tokenCache.value;
    const issuedAt = Math.floor(now() / 1000);
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${encode({ alg: 'RS256', typ: 'JWT', kid: credentials.private_key_id })}.${encode({
      iss: credentials.client_email, scope: SCOPE, aud: TOKEN_URL, iat: issuedAt, exp: issuedAt + 3600,
    })}`;
    const assertion = `${unsigned}.${sign('RSA-SHA256', Buffer.from(unsigned), credentials.private_key).toString('base64url')}`;
    const result = await fetchJson(TOKEN_URL, {
      method: 'POST',
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    }, 'google_auth');
    if (typeof result.access_token !== 'string' || !result.access_token) throw new UpstreamError('google_auth', 502);
    tokenCache = { value: result.access_token, expires: now() + (Number(result.expires_in) || 3600) * 1000 };
    return tokenCache.value;
  }

  function configuration() {
    const credentials = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}');
    if (credentials.type !== 'service_account' || !credentials.client_email || !credentials.private_key ||
      !/^[a-zA-Z0-9_-]+$/.test(env.GOOGLE_SHEET_ID || '')) throw new Error('Missing Google configuration');
    const sheetName = env.GOOGLE_SHEET_NAME || 'Waitlist';
    const quotedSheet = `'${sheetName.replaceAll("'", "''")}'`;
    const base = `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/values/`;
    return { credentials, base, quotedSheet };
  }

  function sheets(config, token, range, method = 'GET', values, suffix = '') {
    return fetchJson(`${config.base}${encodeURIComponent(range)}${suffix}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(values ? { body: JSON.stringify({ values, majorDimension: 'ROWS' }) } : {}),
    }, 'google_sheets');
  }

  async function ensureHeaders(config, token) {
    if (!headersReady) {
      headersReady = (async () => {
        const result = await sheets(config, token, `${config.quotedSheet}!A1:K1`);
        const existing = result.values?.[0] || [];
        // Never overwrite an owner's different columns, or edit existing signup rows.
        if (HEADERS.some((header, i) => existing[i] && existing[i] !== header)) {
          throw new Error('Waitlist columns do not match the expected layout');
        }
        if (HEADERS.some((header, i) => existing[i] !== header)) {
          await sheets(config, token, `${config.quotedSheet}!A1:K1`, 'PUT', [HEADERS], '?valueInputOption=RAW');
        }
      })().catch((error) => { headersReady = undefined; throw error; });
    }
    return headersReady;
  }

  async function syncSubscriber(data) {
    if (!env.MAILERLITE_API_TOKEN || !/^\d+$/.test(env.MAILERLITE_GROUP_ID || '')) {
      throw new Error('Missing MailerLite configuration');
    }
    const headers = { Authorization: `Bearer ${env.MAILERLITE_API_TOKEN}`, 'Content-Type': 'application/json', Accept: 'application/json' };
    const existing = await fetchImpl(`${MAILERLITE_URL}/${encodeURIComponent(data.email)}`, {
      headers, redirect: 'error', signal: AbortSignal.timeout(5_000),
    });
    if (existing.ok) {
      const status = (await existing.json()).data?.status;
      // Never reactivate unsubscribed, bounced, junk, or unconfirmed subscribers.
      if (['unsubscribed', 'bounced', 'junk', 'unconfirmed'].includes(status)) return status;
      if (status !== 'active') throw new UpstreamError('mailerlite', 502);
    } else if (existing.status !== 404) {
      throw new UpstreamError('mailerlite', existing.status);
    }
    const result = await fetchJson(MAILERLITE_URL, {
      method: 'POST', headers,
      body: JSON.stringify({
        email: data.email,
        fields: { name: data.name, ...(data.organization ? { company: data.organization } : {}) },
        groups: [env.MAILERLITE_GROUP_ID], resubscribe: false,
      }),
    }, 'mailerlite');
    if (!result.data?.id || !result.data?.status) throw new UpstreamError('mailerlite', 502);
    return result.data.status === 'active' ? 'synced' : result.data.status;
  }

  return async function handle(request) {
    if (request.method !== 'POST') return reply(405, { ok: false }, { Allow: 'POST' });
    if (!isSameSite(request, env)) return reply(403, { ok: false });
    const contentType = request.headers.get('content-type')?.split(';')[0].trim();
    if (!['application/json', 'application/x-www-form-urlencoded'].includes(contentType)) return reply(415, { ok: false });
    if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) return reply(413, { ok: false });
    let input;
    try {
      const text = await request.text();
      if (Buffer.byteLength(text) > MAX_BODY_BYTES) return reply(413, { ok: false });
      input = contentType === 'application/json' ? JSON.parse(text) : Object.fromEntries(new URLSearchParams(text));
      if (!input || typeof input !== 'object' || Array.isArray(input)) return reply(400, { ok: false });
    } catch {
      return reply(400, { ok: false });
    }
    if (input._gotcha) return reply(200, { ok: true });
    const data = validate(input);
    if (!data) return reply(400, { ok: false, error: 'Please check your name, email, and selected options.' });

    const signupId = randomUUID();
    let config, token, saved;
    try {
      config = configuration();
      token = await accessToken(config.credentials);
      await ensureHeaders(config, token);
      saved = await sheets(config, token, `${config.quotedSheet}!A:K`, 'POST', [[
        new Date(now()).toISOString(), data.name, data.email, data.organization, data.role, data.fields,
        data.newsletter ? 'yes' : 'no', data.newsletter ? CONSENT_TEXT : '',
        data.newsletter ? 'queued' : 'not_requested', signupId, '',
      ]], ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS');
    } catch (error) {
      // Never log credentials, submitted personal data, or raw upstream errors.
      logger.error('waitlist_save_failed', { signupId, service: error.service, status: error.status });
      return reply(503, { ok: false, error: 'We could not save your signup. Please try again.' });
    }

    // OFF by default: deployment alone must not import contacts or trigger emails.
    // Enabling this affects only future submissions; it never processes the Sheet's contacts.
    if (data.newsletter && env.MAILERLITE_SYNC_ENABLED === 'true') {
      const row = /!A(\d+):K\1$/.exec(saved.updates?.updatedRange || '')?.[1];
      if (row) {
        let status;
        try {
          status = await syncSubscriber(data);
        } catch (error) {
          status = 'error';
          logger.error('mailerlite_sync_failed', { signupId, service: error.service, status: error.status });
        }
        try {
          await sheets(config, token, `${config.quotedSheet}!I${row}:K${row}`, 'PUT', [[
            status, signupId, new Date(now()).toISOString(),
          ]], '?valueInputOption=RAW');
        } catch {
          logger.error('mailerlite_status_save_failed', { signupId });
        }
      } else {
        logger.error('waitlist_saved_range_missing', { signupId });
      }
    }
    // A confirmed Google Sheets write is sufficient for the pilot request to succeed.
    return reply(200, { ok: true });
  };
}
