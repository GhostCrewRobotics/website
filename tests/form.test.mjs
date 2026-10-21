import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { CONSENT_TEXT } from '../lib/waitlist.mjs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const code = html.split('/* ---------- waitlist form ---------- */')[1].split('</script>')[0];

function fixture(fetchImpl) {
  const label = { textContent: 'Request Early Pilot Access' };
  const btn = { disabled: false, querySelector: () => label, setAttribute() {}, removeAttribute() {}, focus() {} };
  const error = { hidden: true };
  let submit, replacement, focusCount = 0, validity = true;
  const form = {
    reportValidity: () => validity,
    getAttribute: () => '/api/waitlist',
    addEventListener: (event, listener) => { assert.equal(event, 'submit'); submit = listener; },
    replaceWith: (node) => { replacement = node; },
  };
  const fields = { name: 'Test Person', email: 'test@example.invalid', newsletter: 'yes' };
  class FakeFormData { constructor() { return Object.entries(fields); } }
  const nodes = { 'waitlist-form': form, 'waitlist-submit': btn, 'form-error': error };
  const context = vm.createContext({
    document: {
      getElementById: (id) => nodes[id],
      createElement: () => ({ setAttribute() {}, focus() { focusCount++; } }),
    },
    window: { setTimeout, clearTimeout },
    FormData: FakeFormData, URLSearchParams, AbortController,
    fetch: fetchImpl,
  });
  vm.runInContext(`(function () {${code}`, context);
  return {
    btn, label, error,
    submit: async () => { submit({ preventDefault() {} }); await new Promise(setImmediate); await new Promise(setImmediate); },
    invalid: () => { validity = false; },
    replacement: () => replacement,
    focusCount: () => focusCount,
  };
}

test('form success requires explicit JSON confirmation from the endpoint', async () => {
  let call;
  const f = fixture(async (url, init) => { call = { url, init }; return Response.json({ ok: true }); });
  await f.submit();
  assert.equal(call.url, '/api/waitlist');
  assert.equal(call.init.body.get('newsletter'), 'yes');
  assert.equal(call.init.body.get('email'), 'test@example.invalid');
  assert.ok(!('mode' in call.init));
  assert.ok(f.replacement());
  assert.equal(f.focusCount(), 1);
});

for (const [name, response] of [
  ['failed Sheet save', () => Response.json({ ok: false }, { status: 503 })],
  ['200 with false success', () => Response.json({ ok: false })],
  ['unreadable response', () => new Response('<html>unexpected</html>')],
  ['network failure', () => { throw new Error('Network unavailable'); }],
]) {
  test(`${name} keeps the form, shows error, and restores the submit button`, async () => {
    const f = fixture(async () => response());
    await f.submit();
    assert.equal(f.replacement(), undefined);
    assert.equal(f.error.hidden, false);
    assert.equal(f.btn.disabled, false);
    assert.equal(f.label.textContent, 'Request Early Pilot Access');
  });
}

test('double submissions are ignored while a request is in flight', async () => {
  let finish, count = 0;
  const f = fixture(() => { count++; return new Promise((resolve) => { finish = resolve; }); });
  await f.submit();
  await f.submit();
  assert.equal(count, 1);
  finish(Response.json({ ok: true }));
  await new Promise(setImmediate);
});

test('invalid browser input never reaches the endpoint', async () => {
  let count = 0;
  const f = fixture(async () => { count++; return Response.json({ ok: true }); });
  f.invalid();
  await f.submit();
  assert.equal(count, 0);
});

test('newsletter consent is optional and stored with the exact checkbox wording', () => {
  const checkbox = html.match(/<input\b[^>]*id="wl-newsletter"[^>]*>/)[0];
  assert.ok(!/\bchecked\b|\brequired\b/.test(checkbox));
  assert.ok(html.includes(`<span>${CONSENT_TEXT}</span>`));
});
