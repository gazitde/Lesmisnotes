'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { createContactHandler, createMemoryStore, createRedisStore, getConfig, createTicket, clientIdentity, TICKET_LIFETIME_MS } = require('../server/contact-service.cjs');

// Synthetic addresses only. Never copy the live destination or provider credential into tests.
const fixture = () => ({ CONTACT_ENABLED: 'true', CONTACT_PROVIDER: 'resend', CONTACT_RECIPIENT: 'recipient@example.test', CONTACT_FROM: 'sender@example.test', RESEND_API_KEY: 'unit-test-only', CONTACT_SIGNING_SECRET: 'a-unit-test-key-that-is-not-a-real-secret', CONTACT_ALLOWED_ORIGINS: 'https://guide.example.test', NODE_ENV: 'production', VERCEL: '1' });
const valid = ticket => ({ category: 'correction', lang: 'he', name: '', email: '', message: 'This is a useful factual correction.', website: '', ticket });
function response(status = 200, body = { id: 'provider-test-message' }) { return { ok: status >= 200 && status < 300, status, json: async () => body }; }
function harness(options = {}) {
  let time = 1800000000000; const calls = [], env = { ...fixture(), ...options.env };
  const fetchImpl = options.fetchImpl || (async (url, init) => { calls.push({ url, init }); return response(); });
  const handler = createContactHandler({ env, now: () => time, fetchImpl, store: options.store });
  async function request(body, overrides = {}) {
    const headers = { host: 'guide.example.test', origin: 'https://guide.example.test', 'sec-fetch-site': 'same-origin', 'content-type': 'application/json', 'x-vercel-forwarded-for': '192.0.2.1', ...overrides.headers };
    const req = overrides.stream ? Readable.from(overrides.stream) : {};
    Object.assign(req, { method: body === undefined ? 'GET' : 'POST', headers, socket: { remoteAddress: '127.0.0.1' }, ...overrides });
    req.headers = headers;
    if (!overrides.stream && body !== undefined) req.body = body;
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(text) { this.body = JSON.parse(text); } };
    await handler(req, res); return res;
  }
  async function ticket() { const r = await request(); assert.equal(r.statusCode, 200); time += 1000; return r.body.ticket; }
  return { request, ticket, calls, env, advance: value => { time += value; }, now: () => time };
}

test('unconfigured or disabled endpoint fails closed without a provider request or private values', async () => {
  for (const key of ['CONTACT_ENABLED', 'CONTACT_RECIPIENT', 'CONTACT_FROM', 'RESEND_API_KEY', 'CONTACT_SIGNING_SECRET', 'CONTACT_ALLOWED_ORIGINS']) {
    const h = harness({ env: { [key]: '' } });
    for (const body of [undefined, valid({})]) {
      const r = await h.request(body); assert.equal(r.statusCode, 503); assert.equal(r.body.available, false);
      assert.equal(h.calls.length, 0); assert.ok(!JSON.stringify(r).includes(h.env.CONTACT_RECIPIENT || 'never-match'));
    }
  }
});
test('bad origins, newline config, non-HTTPS production and incomplete Redis configuration fail closed', () => {
  for (const env of [{ CONTACT_ALLOWED_ORIGINS: 'https://guide.example.test/' }, { CONTACT_ALLOWED_ORIGINS: '*' }, { CONTACT_ALLOWED_ORIGINS: 'http://guide.example.test' }, { CONTACT_FROM: 'sender@example.test\r\nBcc: other@example.test' }, { CONTACT_RECIPIENT: 'one@example.test,two@example.test' }, { CONTACT_SIGNING_SECRET: 'short' }, { CONTACT_RATE_LIMIT_MODE: 'redis' }]) assert.equal(getConfig({ ...fixture(), ...env }), null);
});
test('GET reports availability and opaque ticket only; every response is uncacheable', async () => {
  const h = harness(), r = await h.request(); assert.equal(r.statusCode, 200); assert.equal(r.body.available, true);
  assert.equal(r.body.ticket.signature.length, 64); assert.deepEqual(Object.keys(r.body).sort(), ['available', 'ok', 'provider', 'ticket']);
  assert.match(r.headers['Cache-Control'], /no-store/); assert.equal(r.headers['X-Content-Type-Options'], 'nosniff');
  for (const value of [h.env.CONTACT_FROM, h.env.CONTACT_RECIPIENT, h.env.RESEND_API_KEY, h.env.CONTACT_SIGNING_SECRET]) assert.ok(!JSON.stringify(r.body).includes(value));
});
test('server-only fixed recipient, plain text and optional reply-to; no private data in success', async () => {
  const h = harness(); const data = { ...valid(await h.ticket()), name: 'קוראת', email: 'reader@example.test', message: 'תיקון קטן: <script>alert(1)</script>' };
  const r = await h.request(data); assert.equal(r.statusCode, 202); assert.deepEqual(r.body, { ok: true, code: 'accepted' });
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0].url, 'https://api.resend.com/emails');
  const sent = JSON.parse(h.calls[0].init.body); assert.deepEqual(sent.to, [h.env.CONTACT_RECIPIENT]); assert.equal(sent.from, h.env.CONTACT_FROM);
  assert.equal(sent.reply_to, data.email); assert.ok(sent.text.includes(data.message)); assert.equal(sent.html, undefined); assert.ok(!sent.subject.includes(data.name));
  assert.equal(h.calls[0].init.redirect, 'error'); assert.match(h.calls[0].init.headers['Idempotency-Key'], /^lesmis-contact\//);
});
test('anonymous feedback is allowed without invented sender details or reply address', async () => {
  const h = harness(); const r = await h.request(valid(await h.ticket())); assert.equal(r.statusCode, 202);
  assert.equal(JSON.parse(h.calls[0].init.body).reply_to, undefined);
});
test('malformed JSON, wrong types, arrays, empty message, unknown fields and header injection never reach provider', async () => {
  const h = harness(), t = await h.ticket();
  const bad = ['{broken', 'null', [], { ...valid(t), message: '' }, { ...valid(t), message: 'short' }, { ...valid(t), message: 'x'.repeat(4001) }, { ...valid(t), email: 'x@example.test\r\nBcc:spam@example.test' }, { ...valid(t), name: 'name\nInjected' }, { ...valid(t), name: 'x'.repeat(81) }, { ...valid(t), email: ['a@example.test'] }, { ...valid(t), category: '__proto__' }, { ...valid(t), lang: 'other' }, { ...valid(t), to: 'attacker@example.test' }, { ...valid(t), message: 'control\u0000 bytes rejected' }];
  for (const body of bad) assert.equal((await h.request(body)).statusCode, 400);
  assert.equal(h.calls.length, 0);
});
test('body size enforcement handles parsed JSON, Content-Length and unparsed streams', async () => {
  const h = harness();
  assert.equal((await h.request({ message: 'x'.repeat(20000) })).statusCode, 413);
  assert.equal((await h.request({}, { headers: { 'content-length': '17000' } })).statusCode, 413);
  assert.equal((await h.request({}, { stream: [Buffer.alloc(9000), Buffer.alloc(9000)] })).statusCode, 413);
  assert.equal(h.calls.length, 0);
});
test('method, content type, compression, cross-site, missing origin and host mismatch are rejected', async () => {
  const h = harness(), data = valid(await h.ticket());
  const cases = [ [{ method: 'DELETE' }, 405], [{ headers: { 'content-type': 'text/plain' } }, 415], [{ headers: { 'content-encoding': 'gzip' } }, 415], [{ headers: { origin: 'https://evil.example.test' } }, 403], [{ headers: { origin: '' } }, 403], [{ headers: { 'sec-fetch-site': 'cross-site' } }, 403], [{ headers: { host: 'other.example.test' } }, 403] ];
  for (const [overrides, status] of cases) assert.equal((await h.request(data, overrides)).statusCode, status);
  assert.equal(h.calls.length, 0);
});
test('honeypot, forged, future, too-fast and expired tickets never reach provider', async () => {
  const h = harness(); const first = (await h.request()).body.ticket;
  assert.equal((await h.request(valid(first))).body.code, 'too_fast'); h.advance(1000);
  assert.equal((await h.request({ ...valid(first), website: 'spam' })).body.code, 'submission_rejected');
  assert.equal((await h.request(valid({ ...first, signature: 'a'.repeat(64) }))).body.code, 'invalid_ticket');
  const future = createTicket(getConfig(h.env), h.now() + 5000);
  assert.equal((await h.request(valid(future))).body.code, 'expired_ticket');
  h.advance(TICKET_LIFETIME_MS); assert.equal((await h.request(valid(first))).body.code, 'expired_ticket');
  assert.equal(h.calls.length, 0);
});
test('repeat success is cached, changed payload on same ticket conflicts, and simultaneous requests cannot duplicate', async () => {
  let resolve; let count = 0; const waiting = new Promise(r => { resolve = r; });
  const h = harness({ fetchImpl: async () => { count++; await waiting; return response(); } });
  const data = valid(await h.ticket()), inFlight = h.request(data);
  await new Promise(r => setImmediate(r));
  const duplicate = await h.request(data); assert.equal(duplicate.body.code, 'in_progress'); assert.equal(count, 1);
  resolve(); assert.equal((await inFlight).statusCode, 202);
  assert.equal((await h.request(data)).statusCode, 200); assert.equal(count, 1);
  assert.equal((await h.request({ ...data, message: 'A different message using an old ticket.' })).body.code, 'submission_changed');
});
test('provider timeout/failure preserves retry idempotency and hides all provider error detail', async () => {
  const calls = []; const h = harness({ fetchImpl: async (url, init) => {
    calls.push(init); if (calls.length === 1) throw Error('Private upstream details must not be echoed');
    if (calls.length === 2) return response(500, { message: 'Provider private details' });
    return response();
  } });
  const data = valid(await h.ticket());
  for (let i = 0; i < 2; i++) assert.deepEqual((await h.request(data)).body, { ok: false, code: 'delivery_unconfirmed' });
  assert.equal((await h.request(data)).statusCode, 202);
  assert.equal(new Set(calls.map(x => x.headers['Idempotency-Key'])).size, 1);
  assert.equal(new Set(calls.map(x => x.body)).size, 1);
});
test('provider 429 or malformed success is not reported as accepted', async () => {
  for (const result of [response(429, {}), response(200, {}), response(401, {})]) {
    const h = harness({ fetchImpl: async () => result }); const r = await h.request(valid(await h.ticket()));
    assert.equal(r.body.ok, false); assert.ok([429, 502].includes(r.statusCode));
  }
});
test('best-effort memory limiter applies per IP, global bounds and bounded memory, then recovers after expiry', async () => {
  const h = harness();
  for (let i = 0; i < 5; i++) assert.equal((await h.request(valid(await h.ticket()))).statusCode, 202);
  const blocked = await h.request(valid(await h.ticket())); assert.equal(blocked.statusCode, 429); assert.ok(Number(blocked.headers['Retry-After']) > 0);
  h.advance(901000); assert.equal((await h.request(valid(await h.ticket()))).statusCode, 202);
  const small = createMemoryStore({ now: () => h.now(), maxEntries: 4 });
  assert.equal((await small.begin('one', 'digest', 'ip')).state, 'started');
  assert.equal((await small.begin('two', 'digest', 'ip2')).state, 'limited');
  const global = createMemoryStore();
  for (let i = 0; i < 60; i++) assert.equal((await global.begin(String(i), 'digest', String(i))).state, 'started');
  assert.equal((await global.begin('last', 'digest', 'new-client')).state, 'limited');
});
test('missing trusted Vercel IP fails closed; untrusted proxy headers are ignored off Vercel', async () => {
  const h = harness(); assert.equal((await h.request(valid(await h.ticket()), { headers: { 'x-vercel-forwarded-for': '' } })).statusCode, 503);
  const local = harness({ env: { VERCEL: '0' } });
  assert.equal((await local.request(valid(await local.ticket()), { headers: { 'x-forwarded-for': 'invalid' } })).statusCode, 202);
});
test('IPv6 compression and privacy addresses map consistently to /64; IPv4-mapped addresses stay distinct', () => {
  assert.equal(clientIdentity('2001:db8:1::1'), clientIdentity('2001:0db8:0001:0000:ffff:1:2:3'));
  assert.notEqual(clientIdentity('2001:db8:1::1'), clientIdentity('2001:db8:2::1'));
  assert.equal(clientIdentity('::ffff:192.0.2.1'), '192.0.2.1');
  assert.equal(clientIdentity('::ffff:c000:201'), '192.0.2.1');
  assert.notEqual(clientIdentity('::ffff:192.0.2.1'), clientIdentity('::ffff:192.0.2.2'));
});
test('Redis is optional; configured Redis failure is fail-closed and never falls back silently', async () => {
  const h = harness({ env: { CONTACT_RATE_LIMIT_MODE: 'redis', UPSTASH_REDIS_REST_URL: 'https://test.upstash.io', UPSTASH_REDIS_REST_TOKEN: 'test-only' }, fetchImpl: async () => response(503, {}) });
  const r = await h.request(valid(await h.ticket())); assert.equal(r.statusCode, 503); assert.equal(r.body.code, 'temporarily_unavailable');
});
test('Redis adapter uses atomic EVAL and transmits only hashes, counts and random IDs', async () => {
  const calls = [];
  const store = createRedisStore({ redisUrl: 'https://test.upstash.io', redisToken: 'test-only' }, async (url, init) => {
    calls.push({ url, args: JSON.parse(init.body) }); return response(200, { result: calls.length === 1 ? ['started', 0] : 1 });
  });
  const result = await store.begin('random-id', 'a'.repeat(64), 'b'.repeat(64)); assert.equal(result.state, 'started');
  await store.finish('random-id', 'a'.repeat(64), true);
  assert.equal(calls[0].args[0], 'EVAL'); assert.equal(calls[0].args[2], 5); assert.equal(calls[1].args[0], 'EVAL'); assert.equal(calls[1].args.at(-1), '1');
});
test('a confirmed provider acceptance survives a state-store write failure without exposing details', async () => {
  const h = harness({ store: { begin: async () => ({ state: 'started' }), finish: async () => { throw Error('private storage error'); } } });
  assert.deepEqual((await h.request(valid(await h.ticket()))).body, { ok: true, code: 'accepted' });
});

const formsubmitEnv = () => ({ CONTACT_PROVIDER: 'formsubmit', FORMSUBMIT_ALIAS: 'f'.repeat(32), CONTACT_RECIPIENT: '', CONTACT_FROM: '', RESEND_API_KEY: '' });
test('FormSubmit needs no Resend credential, sender or recipient; raw email aliases and unknown providers fail closed', () => {
  const config = getConfig({ ...fixture(), ...formsubmitEnv() }); assert.equal(config.provider, 'formsubmit');
  for (const bad of ['recipient@example.test', 'https://formsubmit.co/alias', '../route', '', 'not-an-archive-key']) assert.equal(getConfig({ ...fixture(), ...formsubmitEnv(), FORMSUBMIT_ALIAS: bad }), null);
  assert.equal(getConfig({ ...fixture(), CONTACT_PROVIDER: 'unsupported' }), null);
  assert.equal(getConfig({ ...fixture(), ...formsubmitEnv(), CONTACT_PROVIDER: undefined }).provider, 'formsubmit');
});
test('FormSubmit stays server-only and forwards allowlisted fields to opaque route with no invented idempotency guarantee', async () => {
  const calls = []; const h = harness({ env: formsubmitEnv(), fetchImpl: async (url, init) => { calls.push({ url, init }); return response(200, { success: 'true', message: 'Form submitted successfully.' }); } });
  const status = await h.request(); assert.equal(status.body.provider, 'formsubmit'); assert.ok(!JSON.stringify(status.body).includes('f'.repeat(32)));
  h.advance(1000); const data = { ...valid(status.body.ticket), name: 'Reader', email: 'reader@example.test' };
  const sent = await h.request(data); assert.equal(sent.statusCode, 202); assert.deepEqual(sent.body, { ok: true, code: 'accepted' });
  assert.equal(calls[0].url, 'https://formsubmit.co/ajax/' + 'f'.repeat(32));
  const payload = JSON.parse(calls[0].init.body);
  assert.deepEqual(Object.keys(payload).sort(), ['_captcha', '_replyto', '_subject', '_template', '_url', 'email', 'language', 'message', 'name', 'topic'].sort());
  assert.equal(payload._url, 'https://guide.example.test/he/contact/'); assert.equal(payload._replyto, data.email); assert.equal(payload._captcha, 'false');
  assert.equal(calls[0].init.headers.Origin, 'https://guide.example.test'); assert.equal(calls[0].init.headers.Referer, payload._url);
  assert.equal(calls[0].init.headers.Authorization, undefined); assert.equal(calls[0].init.headers['Idempotency-Key'], undefined);
  assert.equal((await h.request(data)).statusCode, 200); assert.equal(calls.length, 1, 'known acceptance is cached in warm instance');
});
test('FormSubmit activation, CAPTCHA or verification messages never produce fake success regardless of HTTP success', async () => {
  for (const status of [200, 400, 503]) {
    for (const message of ['Activate Form to continue', 'Please confirm your form', 'Verification required', 'CAPTCHA required', 'This form is inactive']) {
      const h = harness({ env: formsubmitEnv(), fetchImpl: async () => response(status, { success: true, message }) });
      const r = await h.request(valid(await h.ticket())); assert.equal(r.statusCode, 503); assert.deepEqual(r.body, { ok: false, code: 'activation_required' });
    }
  }
});
test('FormSubmit uncertain outcomes are not automatically retried and private upstream errors are suppressed', async () => {
  for (const upstream of [response(200, { success: false, message: 'Private route error' }), response(200, {}), response(502, { success: true }), { ok: true, status: 200, json: async () => { throw Error('HTML with private details'); } }]) {
    let calls = 0; const h = harness({ env: formsubmitEnv(), fetchImpl: async () => { calls++; return upstream; } });
    const r = await h.request(valid(await h.ticket())); assert.equal(r.body.ok, false); assert.equal(r.body.code, 'delivery_unconfirmed'); assert.equal(calls, 1);
    assert.ok(!JSON.stringify(r.body).includes('Private')); assert.ok(!JSON.stringify(r.body).includes('f'.repeat(32)));
  }
});
test('FormSubmit production defaults need no secret; explicit disable and preview host still fail closed', async () => {
  const config = getConfig({ NODE_ENV: 'production' }); assert.equal(config.provider, 'formsubmit');
  assert.deepEqual(config.origins, ['https://www.lesmisnotes.com', 'https://lesmisnotes.com']);
  assert.equal(createTicket(config, Date.now()).signature, 'public-form-v1');
  assert.equal(getConfig({ CONTACT_ENABLED: 'false' }), null);
  assert.equal(getConfig({ CONTACT_RATE_LIMIT_MODE: 'redis' }), null, 'cross-instance Redis mode still needs explicit private configuration');
  let calls = 0; const handler = createContactHandler({ env: { NODE_ENV: 'production' }, fetchImpl: async () => { calls++; return response(200, { success: true }); } });
  const res = { setHeader() {}, end(body) { this.body = JSON.parse(body); } };
  await handler({ method: 'GET', headers: { host: 'unapproved-preview.vercel.app', 'sec-fetch-site': 'same-origin' } }, res);
  assert.equal(res.statusCode, 403); assert.equal(calls, 0);
});
test('FormSubmit public timing marker retains input-age guards without pretending to be signed authentication', async () => {
  const h = harness({ env: { ...formsubmitEnv(), CONTACT_SIGNING_SECRET: '' } });
  const ticket = (await h.request()).body.ticket; assert.equal(ticket.signature, 'public-form-v1');
  assert.equal((await h.request(valid(ticket))).body.code, 'too_fast'); h.advance(1000);
  assert.equal((await h.request(valid({ ...ticket, signature: 'different-marker' }))).body.code, 'invalid_ticket');
  assert.equal((await h.request(valid({ ...ticket, issued: h.now() + 1000 }))).body.code, 'expired_ticket');
  assert.equal(h.calls.length, 0);
});
