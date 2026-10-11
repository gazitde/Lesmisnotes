'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const os = require('node:os');
const run = promisify(execFile);

test('real Chromium: bilingual form, fail-closed status, accessibility, interruption, retry, duplicates and reset', { timeout: 45000 }, async t => {
  if (process.env.RUN_CONTACT_BROWSER_TEST !== '1') { t.skip('Opt-in real browser test: RUN_CONTACT_BROWSER_TEST=1 node --test test/contact-browser.test.cjs'); return; }
  const browser = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
  if (!fs.existsSync(browser)) { t.skip('Chromium is not installed; run this UI test in browser-enabled QA before launch.'); return; }
  const code = fs.readFileSync(path.join(__dirname, '../dist/contact.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../dist/contact.css'), 'utf8');
  const script = String.raw`
  (async () => {
    const checks = [], calls = [], responses = []; let ticket = 0;
    const assert = (condition, message) => { if (!condition) throw Error(message); checks.push(message); };
    const turn = () => new Promise(resolve => setTimeout(resolve, 5));
    const response = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
    const available = () => response({ available: true, ticket: { id: 'test-ticket-' + (++ticket), issued: 1, signature: 'signed-for-ui-test' } });
    window.fetch = async (url, init = {}) => { calls.push({ url, init }); const next = responses.shift(); if (!next) return response({ available: false, code: 'not_configured' }, 503); return typeof next === 'function' ? next(url, init) : next; };
    Object.defineProperty(window, 'localStorage', { get() { throw Error('Contact must not touch localStorage'); } });
    Object.defineProperty(window, 'sessionStorage', { get() { throw Error('Contact must not touch sessionStorage'); } });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw Error('Clipboard unavailable'); } }, configurable: true });
    const root = document.getElementById('app');
    const get = id => document.getElementById('contact-' + id);
    function render(lang) { window.SiteContact.cleanup(); document.documentElement.lang = lang; document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'; root.innerHTML = window.SiteContact.render({ lang }); window.SiteContact.mount({ lang, route: 'contact' }); }
    function fill(key, value) { get(key).value = value; get(key).dispatchEvent(new Event('input', { bubbles: true })); }
    function submit() { get('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }
    render('he'); await turn();
    assert(get('send').disabled && get('status').textContent.includes('עדיין לא זמין'), 'unconfigured Hebrew form is disabled with honest status');
    assert(!get('name').required && !get('email').required && get('message').required, 'minimal optional identity and required message');
    assert(get('status').getAttribute('role') === 'status' && get('message').getAttribute('aria-describedby').includes('contact-message-error'), 'live status and linked field errors');
    fill('name', '<img src=x onerror=alert(1)>'); fill('message', 'A useful draft that must survive navigation.');
    render('en'); await turn();
    assert(get('message').value.includes('survive navigation'), 'draft survives navigation and language switching');
    assert(get('name').value.startsWith('<img') && !root.querySelector('img[src=x]'), 'draft values are escaped in generated HTML');
    get('copy').click(); await turn(); assert(get('copy-status').textContent.includes('did not work'), 'clipboard failure is visible without losing the draft');
    responses.push(available()); get('check').click(); await turn(); assert(!get('send').disabled, 'availability probe enables sending');
    fill('name', 'A reader'); fill('email', 'not an email'); fill('message', 'short'); submit();
    assert(document.activeElement === get('email') && get('email').getAttribute('aria-invalid') === 'true', 'invalid email receives focus and an accessible error');
    fill('email', 'reader@example.test'); fill('message', 'A useful message for the private site editor.');
    let release; responses.push(() => new Promise(resolve => { release = resolve; })); submit(); submit(); await new Promise(resolve => setTimeout(resolve, 950));
    assert(calls.filter(x => x.init.method === 'POST').length === 1 && get('send').disabled, 'double click creates one request while sending');
    render('he'); await turn(); assert(get('send').disabled && get('message').value.includes('private site editor'), 'language change while sending preserves and locks the current draft');
    release(response({ ok: false, code: 'delivery_unconfirmed' }, 502)); await turn();
    assert(get('message').value.includes('private site editor') && get('status').textContent.includes('לא התקבל אישור'), 'uncertain provider error keeps the draft and avoids claiming not sent');
    responses.push(response({ ok: true, code: 'accepted' }, 202)); submit(); await turn();
    const posts = calls.filter(x => x.init.method === 'POST');
    assert(posts.length === 2 && posts[0].init.body === posts[1].init.body, 'retry keeps identical payload, ticket and language across a language change');
    assert(!get('success').hidden && get('form').hidden && document.activeElement === get('success-title'), 'accepted state is visible and focused');
    assert(get('success-title').textContent.includes('לשילוח'), 'success says accepted for sending');
    responses.push(available()); get('another').click(); await turn();
    assert(!get('name').value && !get('email').value && !get('message').value, 'new-note action clears old DOM defaults after remount');
    fill('message', 'A new note that will be edited after failure.'); responses.push(response({ ok: false, code: 'delivery_unconfirmed' }, 502)); submit(); await new Promise(resolve => setTimeout(resolve, 950));
    fill('message', 'A new and materially different note after failure.');
    assert(get('status').textContent.includes('פנייה חדשה'), 'editing after uncertain delivery warns that the next send is a new note');
    responses.push(available(), response({ ok: true, code: 'accepted' }, 202)); submit(); await new Promise(resolve => setTimeout(resolve, 950));
    const newest = calls.filter(x => x.init.method === 'POST');
    assert(JSON.parse(newest.at(-1).init.body).ticket.id !== JSON.parse(newest.at(-2).init.body).ticket.id, 'changed content gets a fresh submission ticket');
    assert(calls.every(x => x.url === '/api/contact'), 'browser sends only to same-origin endpoint, never directly to a mail provider');
    document.getElementById('results').textContent = JSON.stringify({ ok: true, checks });
  })().catch(error => { document.getElementById('results').textContent = JSON.stringify({ ok: false, error: error.message, stack: error.stack }); });
  `;
  const html = '<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css + '</style><body><div id="app"></div><pre id="results">pending</pre><script>' + code + '</script><script>' + script + '</script></body></html>';
  const server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lesmis-contact-browser-'));
  try {
    const { stdout } = await run(browser, ['--headless', '--no-sandbox', '--disable-gpu', '--disable-background-networking', '--no-first-run', '--disable-dev-shm-usage', '--user-data-dir=' + profile, '--virtual-time-budget=10000', '--dump-dom', 'http://127.0.0.1:' + server.address().port], { timeout: 35000, maxBuffer: 4 * 1024 * 1024 });
    const match = stdout.match(/<pre id="results">([\s\S]*?)<\/pre>/);
    assert.ok(match, 'browser emitted test results');
    const result = JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>'));
    assert.equal(result.ok, true, result.error || 'Browser tests did not finish');
    assert.ok(result.checks.length >= 18); t.diagnostic(result.checks.join('\n'));
  } finally { await new Promise(resolve => server.close(resolve)); fs.rmSync(profile, { recursive: true, force: true }); }
});
