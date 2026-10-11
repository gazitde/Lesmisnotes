'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Blob, File } = require('node:buffer');
const SOURCE = process.env.LESMIS_SOURCE || path.resolve(__dirname, '..');
const box = { window: {}, setTimeout, clearTimeout }; vm.createContext(box);
vm.runInContext(fs.readFileSync(path.join(SOURCE, 'dist/quiz-achievement.js'), 'utf8'), box);
const API = box.window.QuizAchievement;
const content = { window: {} }; vm.createContext(content);
for (const name of ['research.js', 'extras.js']) vm.runInContext(fs.readFileSync(path.join(SOURCE, 'dist', name), 'utf8'), content);
const quiz = content.window.EXTRA_CONTENT.quiz || content.window.RESEARCH.quiz;
function input(overrides = {}) { return { round: {}, language: 'en', track: 'story', trackTitle: 'The story', badgeName: 'Behind-the-scenes connections', correct: 3, total: 5, ...overrides }; }
function canvasMock() {
  const text = [], noop = () => {};
  const ctx = new Proxy({ font: '', measureText(s) { const size = Number(this.font.match(/([\d.]+)px/)?.[1] || 10); return { width: Array.from(s).reduce((sum, c) => sum + (/\s/.test(c) ? .32 : /[ilI.,']/u.test(c) ? .29 : /[MW]/u.test(c) ? .9 : .62) * size, 0) }; }, fillText(s, x, y) { text.push({ text: s, x, y, width: this.measureText(s).width, direction: this.direction, font: this.font }); } }, { get(target, key) { return key in target ? target[key] : noop; } });
  return { width: 0, height: 0, getContext: () => ctx, ctx, text, toBlob(callback) { callback(new Blob(['PNG bytes'], { type: 'image/png' })); } };
}
function fixture(extra = {}) {
  let live = input(), created = [], revoked = [], clicks = [], notices = [], events = [], renderData = [];
  const timers = new Map(); let timerId = 0;
  const nav = { canShare: () => true, share: async () => {}, ...extra.navigator };
  const controller = API.createController({
    getCurrent: () => live, document: { body: { appendChild() {} }, createElement() { const a = { remove() {}, click() { clicks.push({ href: a.href, name: a.download }); } }; return a; } }, navigator: nav, File,
    URL: { createObjectURL(blob) { const u = `blob:local-${created.length}`; created.push({ u, blob }); return u; }, revokeObjectURL(u) { revoked.push(u); } },
    setTimeout(fn) { timers.set(++timerId, fn); return timerId; }, clearTimeout(id) { timers.delete(id); },
    renderPNG: data => { renderData.push(data); return extra.renderPNG ? extra.renderPNG(data) : new Blob(['PNG'], { type: 'image/png' }); },
    onFeedback: code => notices.push(code), onShared: event => events.push(event), onDownload: event => events.push(event),
  });
  return { controller, nav, created, revoked, clicks, notices, events, timers, renderData, live: () => live, set: value => { live = value; } };
}
const turn = () => new Promise(resolve => setImmediate(resolve));
const defer = () => { let resolve, reject; const promise = new Promise((res, rej) => { resolve = res; reject = rej; }); return { promise, resolve, reject }; };

test('actual data: every score, track and language lays out safely, including longest badge', () => {
  let count = 0;
  for (const language of ['he', 'en']) for (const track of ['story','musical']) for (const total of [5,10,25]) for (let correct = 0; correct <= total; correct++) {
    const percent = Math.round(correct / total * 100), badge = quiz.badgeTiers.find(b => percent >= b.minPercent && percent < b.maxPercentExclusive);
    const d = input({ language, track, correct, total, trackTitle: quiz.trackInfo[track].title[language], badgeName: badge.name[language] });
    const c = canvasMock(), result = API.drawCard(c, d);
    assert.equal(c.width, 1080); assert.equal(c.height, 1080); assert.equal(result.data.percent, percent);
    result.boxes.forEach(b => { assert.ok(b.top > 39 && b.bottom < 1050); assert.ok(b.lines.every(line => line.length > 0)); });
    c.text.forEach(t => { assert.ok(t.x - t.width / 2 >= 40, JSON.stringify(t)); assert.ok(t.x + t.width / 2 <= 1040, JSON.stringify(t)); });
    const score = c.text.find(t => t.text === `${correct} / ${total}`); assert.equal(score.direction, 'ltr');
    assert.equal(result.boxes[3].direction, language === 'he' ? 'rtl' : 'ltr');
    assert.equal(result.boxes[1].text, language === 'he' ? 'עלובי החיים' : 'LES MISÉRABLES');
    assert.ok(result.boxes[3].bottom < 628); assert.ok(result.boxes[6].bottom < result.boxes[7].top);
    count++;
  }
  assert.equal(count, 172);
});
test('future long labels wrap or ellipsize without leaving their boxes', () => {
  for (const language of ['he','en']) {
    const c = canvasMock(), result = API.drawCard(c, input({ language, badgeName: ('Very-long-בדיקה '+ 'W'.repeat(80)).repeat(3), trackTitle: 'תיאטרון המחזמר '.repeat(20) }));
    assert.ok(result.boxes[3].lines.length <= 2); assert.ok(result.boxes[6].lines.length <= 2);
    for (const t of c.text) assert.ok(t.width <= 860, `${t.width}: ${t.text}`);
  }
});
test('minimal whitelist excludes private fields, controls, answers and URLs', () => {
  const d = API.normalize(input({ name: 'Private Name', answers: { secret: true }, url: 'https://private.test', badgeName: 'Test\u202e\n badge', percent: 99 }));
  assert.deepEqual(Object.keys(d).sort(), ['badgeName','correct','language','percent','total','track','trackTitle'].sort());
  assert.equal(d.badgeName, 'Test badge'); assert.equal(d.percent, 60);
  assert.ok(!API.shareText(d).includes('Private')); assert.ok(!API.shareText(d).includes('http'));
  for (const invalid of [{ correct: -1 }, { correct: 6 }, { total: 0 }, { total: '5' }, { language: 'fr' }, { track: 'private' }, { badgeName: '' }]) assert.throws(() => API.normalize(input(invalid)));
});
test('renderPNG is local, produces a PNG blob and releases canvas backing memory', async () => {
  const c = canvasMock(); const blob = await API.renderPNG(input(), { document: { fonts: { ready: Promise.resolve() }, createElement: () => c } });
  assert.equal(blob.type, 'image/png'); assert.ok(blob.size); assert.equal(c.width, 0); assert.equal(c.height, 0);
  await assert.rejects(API.renderPNG(input(), { document: { createElement: () => ({ getContext: () => null }) } }));
});
test('prepares before click; native sharing starts synchronously with only the prepared file', async () => {
  const f = fixture(); let called = false;
  await f.controller.prepare(); assert.equal(f.controller.state().status, 'ready');
  f.nav.share = payload => { called = true; assert.equal(payload.files.length, 1); assert.equal(payload.files[0].type, 'image/png'); assert.equal(payload.files[0].name, 'lesmisnotes-story-5-en.png'); assert.equal(payload.files[0].lastModified, 0); assert.ok(!('url' in payload)); return Promise.resolve(); };
  const result = f.controller.shareImage(); assert.equal(called, true, 'must call within the click activation');
  assert.equal((await result).status, 'shared'); assert.equal(f.renderData.length, 1); assert.equal(f.events[0].method, 'native');
  assert.ok(!('round' in f.renderData[0])); f.controller.dispose(); assert.equal(f.revoked.length, 1);
});
test('double clicks cannot create two native share sheets', async () => {
  const pending = defer(); const f = fixture({ navigator: { share: () => pending.promise } }); await f.controller.prepare();
  const first = f.controller.shareImage(); assert.equal(f.controller.state().busy, true); assert.equal((await f.controller.shareImage()).status, 'busy');
  pending.resolve(); assert.equal((await first).status, 'shared'); assert.equal(f.controller.state().busy, false);
});
test('cancel is silent: no fallback copy, navigation, download or success analytics', async () => {
  const f = fixture({ navigator: { share: async () => { const e = new Error('Cancelled'); e.name = 'AbortError'; throw e; }, clipboard: { writeText() { assert.fail('clipboard must stay untouched'); } } } });
  await f.controller.prepare(); assert.equal((await f.controller.shareImage()).status, 'cancelled'); assert.equal(f.notices.length, 0); assert.equal(f.events.length, 0); assert.equal(f.clicks.length, 0);
});
test('unsupported or failed native file share offers explicit alternatives only', async () => {
  for (const nav of [{ canShare: () => false }, { canShare: () => { throw new Error('Blocked'); } }, { share: undefined }, { share: async () => { throw new Error('Unavailable'); } }]) {
    const f = fixture({ navigator: { ...nav, clipboard: { writeText() { assert.fail('automatic copy'); } } } });
    await f.controller.prepare(); const result = await f.controller.shareImage(); assert.ok(['unsupported','failed'].includes(result.status));
    assert.equal(f.clicks.length, 0); assert.equal(f.events.length, 0); assert.equal(f.notices.length, 1);
  }
});
test('rapid re-prepare reuses the pending image for the exact round', async () => {
  const pending = defer(), f = fixture({ renderPNG: () => pending.promise });
  const first = f.controller.prepare(), second = f.controller.prepare(); assert.equal(first, second);
  assert.equal((await f.controller.shareImage()).status, 'preparing'); await turn(); assert.equal(f.renderData.length, 1);
  pending.resolve(new Blob(['PNG'], {type:'image/png'})); assert.equal(await first, true); assert.equal(f.clicks.length, 0);
});
test('late image completion cannot overwrite a new language, new round, or navigation', async () => {
  for (const mode of ['language','round','navigation']) {
    const pending = defer(), f = fixture({ renderPNG: data => data.language === 'he' ? new Blob(['he'], { type:'image/png' }) : pending.promise });
    const old = f.controller.prepare(); await turn();
    f.set(mode === 'navigation' ? null : { ...f.live(), round: mode === 'round' ? {} : f.live().round, language: 'he', badgeName: 'קשרים מאחורי הקלעים', trackTitle:'הסיפור' });
    await f.controller.prepare(); pending.resolve(new Blob(['en'], {type:'image/png'})); assert.equal(await old, false);
    assert.equal(f.controller.state().status, mode === 'navigation' ? 'idle' : 'ready');
    assert.equal(f.created.length, mode === 'navigation' ? 0 : 1);
  }
});
test('a changed score cannot share a stale ready card even before the next mount', async () => {
  const f = fixture(); await f.controller.prepare(); f.set({ ...f.live(), correct: 5 });
  assert.equal((await f.controller.shareImage()).status, 'stale'); assert.equal(f.controller.downloadImage().status, 'stale');
  await f.controller.prepare(); assert.equal(f.revoked.length, 1); assert.equal(f.renderData.length, 2);
});
test('share completion after navigation does not write stale feedback, and busy lasts until settlement', async () => {
  const pending = defer(), f = fixture({ navigator: { share: () => pending.promise } }); await f.controller.prepare();
  const first = f.controller.shareImage(); f.set(null); await f.controller.prepare();
  f.set(input({ language: 'he' })); await f.controller.prepare(); assert.equal((await f.controller.shareImage()).status, 'busy');
  pending.resolve(); assert.equal((await first).status, 'stale'); assert.equal(f.notices.length, 0); assert.equal(f.events.length, 0); assert.equal(f.controller.state().busy, false);
});
test('explicit PNG download survives SPA cleanup and revokes every temporary URL', async () => {
  const f = fixture(); await f.controller.prepare(); assert.equal(f.clicks.length, 0);
  assert.equal(f.controller.downloadImage().status, 'downloaded'); assert.equal(f.clicks.length, 1); assert.ok(f.clicks[0].name.endsWith('.png'));
  f.set(null); await f.controller.prepare(); assert.deepEqual(f.revoked, ['blob:local-0']);
  for (const fn of [...f.timers.values()]) fn(); assert.ok(f.revoked.includes('blob:local-1'));
  f.controller.dispose(); assert.equal(new Set(f.revoked).size, f.created.length);
});
test('null PNG, wrong format and renderer rejection fail safely without native share', async () => {
  for (const renderPNG of [() => null, () => new Blob(['x'], {type:'image/svg+xml'}), () => { throw new Error('No canvas'); }]) {
    const f = fixture({ renderPNG, navigator: { share() { assert.fail('must not share'); } } });
    assert.equal(await f.controller.prepare(), false); assert.equal(f.controller.state().status, 'unavailable');
    assert.equal(f.created.length, 0); assert.equal(f.clicks.length, 0);
  }
});
test('disposed controller cannot be resurrected by a delayed renderer', async () => {
  const pending = defer(), f = fixture({ renderPNG: () => pending.promise }); const ready = f.controller.prepare(); await turn();
  f.controller.dispose(); pending.resolve(new Blob(['PNG'],{type:'image/png'})); assert.equal(await ready, false); assert.equal(await f.controller.prepare(), false); assert.equal(f.created.length, 0);
});
