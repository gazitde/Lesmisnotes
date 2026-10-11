'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname, '../dist/contact.js'), 'utf8');
const decode = value => value.replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
const turn = () => new Promise(resolve => setImmediate(resolve));
const result = (body, status = 200, retry = '') => ({ ok: status >= 200 && status < 300, status, json: async () => body, headers: { get: () => retry } });

function harness({ fetchImpl, realDelays = false } = {}) {
  let nodes = new Map(), serial = 0; const calls = [], replies = [], analytics = [], timers = new Map();
  class Node {
    constructor(id) { this.id = id; this.value = ''; this.defaultValue = ''; this.textContent = ''; this.hidden = false; this.disabled = false; this.attrs = {}; this.listeners = {}; this.classList = { toggle() {} }; }
    setAttribute(key, value) { this.attrs[key] = value; }
    addEventListener(type, callback) { this.listeners[type] = callback; }
    emit(type) { return this.listeners[type]?.({ preventDefault() {}, target: this }); }
    focus() { document.activeElement = this; }
    checkValidity() { return !this.value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value); }
  }
  const document = { activeElement: null, getElementById: id => nodes.get(id) };
  const context = { document, console, AbortController, Date, SiteAnalytics: { track(name, values) { analytics.push({name, values}); return true; } }, navigator: { clipboard: { writeText: async () => { throw Error('Clipboard blocked'); } } },
    setTimeout(fn, delay) { const id = ++serial; const timer = { fn, delay }; timers.set(id, timer); if (delay <= 1000) { if (realDelays) timer.real = setTimeout(fn, delay); else setImmediate(fn); } return id; }, clearTimeout(id) { const timer = timers.get(id); if (timer?.real) clearTimeout(timer.real); timers.delete(id); },
    async fetch(url, init = {}) { calls.push({ url, init }); if (fetchImpl) return fetchImpl(url, init); const next = replies.shift(); return typeof next === 'function' ? next() : next || result({ available: false, code: 'not_configured' }, 503); }
  };
  Object.defineProperty(context, 'localStorage', { get() { throw Error('Unexpected browser storage'); } });
  Object.defineProperty(context, 'sessionStorage', { get() { throw Error('Unexpected browser storage'); } });
  context.window = context; vm.createContext(context); vm.runInContext(code, context);
  const get = id => nodes.get('contact-' + id);
  const available = () => result({ ok: true, available: true, ticket: { id: 'ticket-' + (++serial), issued: 1, signature: 'ui-fixture' } });
  function render(lang) {
    context.SiteContact.cleanup(); const html = context.SiteContact.render({ lang }); nodes = new Map();
    for (const match of html.matchAll(/\bid="(contact-[^"]+)"/g)) nodes.set(match[1], new Node(match[1]));
    for (const key of ['name', 'email', 'website']) {
      const value = html.match(new RegExp('<input id="contact-' + key + '"[^>]*value="([^"]*)"'))?.[1] || '';
      get(key).value = get(key).defaultValue = decode(value);
    }
    const message = html.match(/<textarea id="contact-message"[^>]*>([\s\S]*?)<\/textarea>/)?.[1] || '';
    get('message').value = get('message').defaultValue = decode(message);
    get('category').value = get('category').defaultValue = html.match(/<option value="([^"]+)" selected/)?.[1] || 'comment';
    const fields = ['name', 'email', 'message', 'website', 'category'].map(get);
    get('form').elements = { namedItem: key => get(key) };
    get('form').querySelectorAll = () => fields;
    get('form').reset = () => { for (const field of fields) field.value = field.defaultValue; };
    get('success-title').textContent = html.match(/id="contact-success-title">([^<]*)/)?.[1] || '';
    context.SiteContact.mount({ lang, route: 'contact' }); return html;
  }
  function fill(key, value) { get(key).value = value; get('form').emit('input'); }
  return { get, context, document, calls, replies, analytics, available, render, fill, timers, submit: () => get('form').emit('submit'), click: id => get(id).emit('click') };
}

test('client: unconfigured service is honest, Send stays disabled, optional identity and ARIA are present', async () => {
  const h = harness(), html = h.render('he'); await turn();
  assert.ok(h.get('send').disabled); assert.match(h.get('status').textContent, /עדיין לא זמין/);
  assert.match(html, /name="message"[^>]*required/); assert.ok(!/name="name"[^>]*required/.test(html)); assert.ok(!/name="email"[^>]*required/.test(html));
  assert.match(html, /aria-describedby="contact-message-hint contact-count contact-message-error"/); assert.match(html, /role="status" aria-live="polite"/);
  assert.ok(!html.includes('mailto:')); assert.ok(!html.includes('recipient@example.test'));
});
test('client: drafts survive cleanup, language switch and unavailable service; rendered user data is escaped', async () => {
  const h = harness(); h.render('he'); await turn(); h.fill('name', '<img src=x onerror=alert(1)>'); h.fill('message', 'A draft that survives language changes.');
  const html = h.render('en'); await turn(); assert.equal(h.get('name').value, '<img src=x onerror=alert(1)>'); assert.match(h.get('message').value, /survives/);
  assert.ok(!html.includes('<img src=x')); assert.match(html, /&lt;img/); assert.match(h.get('status').textContent, /not available yet/);
  await h.click('copy'); assert.match(h.get('copy-status').textContent, /did not work/); assert.match(h.get('message').value, /survives/);
});
test('client: validation marks and focuses the first invalid field without calling POST', async () => {
  const h = harness(); h.replies.push(h.available()); h.render('en'); await turn(); h.fill('email', 'bad'); h.fill('message', 'short'); await h.submit();
  assert.equal(h.document.activeElement, h.get('email')); assert.equal(h.get('email').attrs['aria-invalid'], 'true'); assert.equal(h.get('message-error').hidden, false);
  assert.equal(h.calls.filter(x => x.init.method === 'POST').length, 0);
});
test('client: double submit, language change while sending, uncertain failure and retry preserve one identical payload', async () => {
  const h = harness(); h.replies.push(h.available()); h.render('en'); await turn(); h.fill('message', 'A complete message that we should retry safely.'); h.fill('email', 'reader@example.test');
  let release; h.replies.push(() => new Promise(resolve => { release = resolve; })); const first = h.submit(); h.submit();
  await turn();
  assert.equal(h.calls.filter(x => x.init.method === 'POST').length, 1); assert.ok(h.get('send').disabled);
  h.render('he'); assert.ok(h.get('send').disabled); assert.match(h.get('message').value, /retry safely/);
  release(result({ ok: false, code: 'delivery_unconfirmed' }, 502)); await first;
  assert.match(h.get('status').textContent, /לא התקבל אישור/); assert.match(h.get('message').value, /retry safely/);
  h.replies.push(result({ ok: true, code: 'accepted' }, 202)); await h.submit();
  const posts = h.calls.filter(x => x.init.method === 'POST'); assert.equal(posts.length, 2); assert.equal(posts[0].init.body, posts[1].init.body);
  assert.equal(h.get('success').hidden, false); assert.equal(h.get('form').hidden, true); assert.equal(h.document.activeElement, h.get('success-title')); assert.match(h.get('success-title').textContent, /לשילוח/);
  h.replies.push(h.available()); h.click('another'); await turn();
  for (const key of ['name', 'email', 'message']) assert.equal(h.get(key).value, '');
});
test('client: edited uncertain submission gives warning and obtains a fresh ticket', async () => {
  const h = harness(); h.replies.push(h.available()); h.render('en'); await turn(); h.fill('message', 'An original message that gets a timeout.');
  h.replies.push(result({ ok: false, code: 'delivery_unconfirmed' }, 502)); await h.submit();
  h.fill('message', 'A different and updated message after the timeout.'); assert.match(h.get('status').textContent, /new note/);
  h.replies.push(h.available(), result({ ok: true, code: 'accepted' }, 202)); await h.submit();
  const posts = h.calls.filter(x => x.init.method === 'POST'); assert.notEqual(JSON.parse(posts[0].init.body).ticket.id, JSON.parse(posts[1].init.body).ticket.id);
});
test('client: rate limit keeps draft and temporarily disables retry; unsupported success does not clear draft', async () => {
  const h = harness(); h.replies.push(h.available()); h.render('en'); await turn(); h.fill('message', 'Please preserve this note when rate limited.');
  h.replies.push(result({ ok: false, code: 'rate_limited' }, 429, '30')); await h.submit();
  assert.ok(h.get('send').disabled); assert.match(h.get('status').textContent, /too many attempts/); assert.match(h.get('message').value, /preserve/);
  const h2 = harness(); h2.replies.push(h2.available()); h2.render('en'); await turn(); h2.fill('message', 'A note with a malformed success response.');
  h2.replies.push(result({ success: true }, 200)); await h2.submit(); assert.match(h2.get('message').value, /malformed/); assert.equal(h2.get('success').hidden, true);
});
test('client: network rejection leaves draft, no personal storage or external provider request occurs', async () => {
  const h = harness(); h.replies.push(h.available()); h.render('en'); await turn(); h.fill('message', 'Network interruptions must never erase this draft.');
  h.replies.push(() => Promise.reject(Error('offline'))); await h.submit(); assert.match(h.get('status').textContent, /could not confirm/); assert.match(h.get('message').value, /never erase/);
  assert.ok(h.calls.every(x => x.url === '/api/contact')); assert.ok(!/localStorage|sessionStorage|gtag\(/.test(code));
  assert.deepEqual(h.analytics.map(x => ({name:x.name, values:JSON.parse(JSON.stringify(x.values))})), [{name:'contact_submit',values:{form_language:'en'}},{name:'contact_error',values:{form_language:'en',error_category:'network'}}]);
  assert.ok(!JSON.stringify(h.analytics).includes('Network interruptions'));
});
test('client: changes made during replacement-ticket GET are revalidated and retries keep their exact identity', async () => {
  const h = harness(); h.replies.push(h.available()); h.render('en'); await turn(); h.fill('message', 'Message A has an uncertain earlier result.');
  h.replies.push(result({ ok: false, code: 'delivery_unconfirmed' }, 502)); await h.submit();
  h.fill('message', 'Message B is being prepared for a new submission.');
  let release; h.replies.push(() => new Promise(resolve => { release = resolve; }));
  const pending = h.submit(); await turn();
  h.fill('message', 'Message C was edited while the GET was pending.');
  h.replies.push(result({ ok: false, code: 'delivery_unconfirmed' }, 502)); release(h.available()); await pending;
  h.replies.push(result({ ok: true, code: 'accepted' }, 202)); await h.submit();
  const posts = h.calls.filter(x => x.init.method === 'POST'); assert.equal(posts.length, 3);
  assert.equal(posts[1].init.body, posts[2].init.body); assert.match(JSON.parse(posts[1].init.body).message, /Message C/);
  assert.ok([...h.timers.values()].some(timer => timer.delay > 0 && timer.delay <= 900), 'fresh tickets wait before sending');
});
test('client: interrupting an explicit availability check cannot deadlock Send and Check after navigation', async () => {
  const h = harness(); h.replies.push(h.available()); h.render('en'); await turn(); h.fill('message', 'The draft must survive an interrupted probe.');
  let release; h.replies.push(() => new Promise(resolve => { release = resolve; })); const pending = h.click('check'); await turn();
  h.replies.push(h.available()); h.render('he'); await turn();
  assert.equal(h.get('send').disabled, false); assert.equal(h.get('check').disabled, false); assert.match(h.get('message').value, /interrupted probe/);
  release(result({ available: false }, 503)); await pending; await turn();
  assert.equal(h.get('send').disabled, false); assert.equal(h.get('check').disabled, false);
});
test('client: editing after a rate-limited uncertain attempt retains the duplicate-risk warning', async () => {
  const h = harness(); h.replies.push(h.available()); h.render('en'); await turn(); h.fill('message', 'Original message that may already be accepted.');
  h.replies.push(result({ ok: false, code: 'delivery_unconfirmed' }, 502)); await h.submit();
  h.replies.push(result({ ok: false, code: 'rate_limited' }, 429, '30')); await h.submit();
  h.fill('message', 'Changed message after a rate-limited retry.'); assert.match(h.get('status').textContent, /new note/); assert.match(h.get('status').textContent, /too many attempts/);
});
test('integration: client fresh-ticket wait satisfies the real handler on initial and edited retry submissions', async () => {
  const { createContactHandler } = require('../server/contact-service.cjs');
  const responses = [], providerCalls = [];
  const env = { CONTACT_ENABLED: 'true', CONTACT_PROVIDER: 'resend', CONTACT_RECIPIENT: 'recipient@example.test', CONTACT_FROM: 'sender@example.test', RESEND_API_KEY: 'test-only', CONTACT_SIGNING_SECRET: 'not-a-real-secret-only-an-integration-fixture', CONTACT_ALLOWED_ORIGINS: 'https://guide.example.test', NODE_ENV: 'production' };
  const handler = createContactHandler({ env, fetchImpl: async (url, init) => { providerCalls.push(init); return providerCalls.length === 1 ? result({}, 500) : result({ id: 'synthetic-provider-id' }, 200); } });
  const h = harness({ realDelays: true, fetchImpl: async (url, init) => {
    const req = { method: init.method || 'GET', headers: { host: 'guide.example.test', origin: 'https://guide.example.test', 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' }, socket: { remoteAddress: '127.0.0.1' }, ...(init.body ? { body: init.body } : {}) };
    const res = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(body) { this.body = JSON.parse(body); } };
    await handler(req, res); responses.push(res.body); return result(res.body, res.statusCode, res.headers['Retry-After'] || '');
  } });
  h.render('en'); await turn(); h.fill('message', 'The original note receives an uncertain provider reply.'); await h.submit();
  assert.match(h.get('status').textContent, /could not confirm/);
  h.fill('message', 'An edited note receives a newly issued ticket and must wait.'); await h.submit();
  assert.equal(h.get('success').hidden, false); assert.equal(providerCalls.length, 2); assert.ok(responses.every(body => body.code !== 'too_fast'));
});
test('client: FormSubmit activation failure keeps draft and disables sending; privacy identifies selected provider', async () => {
  const h = harness(); const ready = h.available(); ready.json = async () => ({ available: true, provider: 'formsubmit', ticket: { id: 'a', signature: 'fixture' } });
  h.replies.push(ready); h.render('en'); await turn(); assert.match(h.get('privacy-copy').textContent, /FormSubmit/);
  h.fill('message', 'Keep this note while the new domain awaits activation.'); h.replies.push(result({ ok: false, code: 'activation_required' }, 503)); await h.submit();
  assert.equal(h.get('send').disabled, true); assert.match(h.get('message').value, /awaits activation/); assert.equal(h.get('success').hidden, true);
  assert.match(h.get('status').textContent, /not available/);
});
test('client: uncertain FormSubmit failure explicitly warns that manual retry may duplicate a message', async () => {
  const h = harness(); h.replies.push(h.available()); h.render('en'); await turn(); h.fill('message', 'This message may already have been accepted.');
  h.replies.push(result({ ok: false, code: 'delivery_unconfirmed' }, 502)); await h.submit();
  assert.match(h.get('status').textContent, /manually/); assert.match(h.get('status').textContent, /duplicate/);
});
test('client: availability recheck and later rate limit cannot erase uncertain-submission duplicate warning', async () => {
  const h = harness(); h.replies.push(h.available()); h.render('en'); await turn(); h.fill('message', 'Keep uncertainty visible for this attempted note.');
  h.replies.push(result({ ok: false, code: 'delivery_unconfirmed' }, 502)); await h.submit();
  h.replies.push(h.available()); await h.click('check'); assert.match(h.get('status').textContent, /duplicate/); assert.equal(h.get('send').disabled, false);
  h.replies.push(result({ ok: false, code: 'rate_limited' }, 429, '30')); await h.submit(); assert.match(h.get('status').textContent, /too many/); assert.match(h.get('status').textContent, /duplicate/);
});

test('client: safe provider diagnostics do not change unknown-outcome warnings or trigger a retry', async () => {
  for (const diagnostic of ['provider_timeout', 'provider_network', 'provider_http', 'provider_html_response', 'provider_invalid_response', 'provider_declined']) {
    const h = harness(); h.replies.push(h.available()); h.render('en'); await turn();
    h.fill('message', 'Preserve the note while provider acceptance is unknown.');
    h.replies.push(result({ ok: false, code: 'delivery_unconfirmed', diagnostic, upstreamStatus: 503 }, 502));
    await h.submit();
    assert.match(h.get('status').textContent, /could not confirm/);
    assert.match(h.get('status').textContent, /duplicate/);
    assert.equal(h.get('message').value, 'Preserve the note while provider acceptance is unknown.');
    assert.equal(h.get('success').hidden, true);
    assert.equal(h.calls.filter(call => call.init.method === 'POST').length, 1);
  }
});
