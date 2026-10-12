'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..', 'dist');
const dataContext={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'watch-path-data.js'),'utf8'),dataContext);
const data=JSON.parse(JSON.stringify(dataContext.window.WATCH_PATH_DATA));
const source = fs.readFileSync(path.join(root, 'watch-path.js'), 'utf8');
function load(customData = JSON.parse(JSON.stringify(data))) {
  const context = vm.createContext({ window: { WATCH_PATH_DATA: customData } });
  vm.runInContext(source, context);
  return context.window.WatchPath;
}
const api = load();
const calls = [];
const callback = (id, instance) => {
  calls.push({ id, instance });
  return `<div data-test-player="${id}" id="video-${instance}"><a href="https://www.youtube.com/watch?v=${id}">Original source</a></div>`;
};
assert.equal(data.stops.length, 38);
assert.equal(new Set(data.stops.map(s => s.songId)).size, 38);
assert.equal(data.clips.length, 45);
assert.equal(data.clips.filter(c => c.productionId === 'tka-loveland-2017').length, 36);
assert.equal(data.clips.filter(c => c.delivery === 'embed-with-source-link').length, 9);
assert.deepEqual(data.clips.filter(c => c.language === 'he').map(c => c.id).sort(), ['HKRzlaQcfUI', 'Mea49KwLiMg', 'u_eCLahh91s'].sort());
assert.ok(data.clips.filter(c => c.productionId === 'tka-loveland-2017').every(c => c.language === 'en'));
assert.equal(api.getSelection({ songId: 'stars', lang: 'xx', mode: 'xx' }).lang, 'en');
assert.equal(api.getSelection({ songId: 'stars', lang: 'xx', mode: 'xx' }).mode, 'ourPicks');
assert.equal(api.defaultMode, 'ourPicks');
assert.equal(api.normalizeMode('sameProduction'), 'sameProduction');
assert.equal(api.normalizeMode('<x>'), 'ourPicks');
assert.equal(api.getSelection({ songId: 'interval' }), null);
assert.equal(api.renderStop({ songId: 'interval' }), '');
const instanceIds = new Set();
let renderedCases = 0;
for (const lang of ['en', 'he']) {
  for (const mode of ['ourPicks', 'sameProduction']) {
    let curatedStops = 0;
    const intro = api.renderIntro({ lang, mode });
    assert.equal((intro.match(/data-watch-mode=/g) || []).length, 2);
    assert.equal((intro.match(/aria-pressed="true"/g) || []).length, 1);
    assert.ok(intro.includes(`id="watch-mode-${mode}" data-watch-mode="${mode}" aria-pressed="true"`));
    assert.ok(intro.includes('id="watch-path-modes"'));
    assert.ok(intro.includes('2017'));
    for (const stop of data.stops) {
      const selected = api.getSelection({ lang, mode, songId: stop.songId });
      const before = calls.length;
      const html = api.renderStop({ lang, mode, songId: stop.songId, renderVideo: callback });
      renderedCases++;
      assert.ok(html.includes(`data-watch-stop="${stop.songId}"`));
      assert.ok(html.includes(`dir="${lang === 'he' ? 'rtl' : 'ltr'}"`));
      assert.ok(!html.includes('undefined'));
      assert.ok(!/autoplay|youtube-nocookie|<iframe|<video|<img/i.test(html));
      assert.ok(Object.isFrozen(selected));
      assert.ok(Object.isFrozen(selected.clips));
      assert.ok(selected.clips.every(c => Object.isFrozen(c)));
      for (const clip of selected.clips) assert.ok(html.includes(`https://www.youtube.com/watch?v=${clip.id}`));
      if (selected.kind === 'curated') { curatedStops++; assert.equal(calls.length, before + 1); }
      else { assert.equal(calls.length, before); assert.ok(!html.includes('watch-path-media')); }
      if (selected.relatedLargerClip) assert.ok(html.includes(lang === 'en' ? 'Related larger clip' : 'קטע רחב יותר הקשור לתחנה'));
      if (selected.sharedWithPrevious) assert.ok(html.includes(lang === 'en' ? 'Same source link as the previous stop.' : 'אותו קישור מקור כמו בתחנה הקודמת.'));
    }
    assert.equal(curatedStops, mode === 'ourPicks' ? 6 : 0);
  }
}
for (const call of calls) {
  assert.ok(call.instance.startsWith('journey-'));
  assert.ok(!instanceIds.has(call.instance));
  instanceIds.add(call.instance);
  const clip = data.clips.find(c => c.id === call.id);
  assert.notEqual(clip.productionId, 'tka-loveland-2017');
  assert.equal(clip.delivery, 'embed-with-source-link');
}
assert.equal(new Set(calls.map(c => c.id)).size, 9);
for (let i = 0; i < 3; i++) api.renderStop({ songId: 'stars', renderVideo: callback });
assert.equal(new Set(calls.map(c => c.instance)).size, calls.length);
assert.equal(api.getSelection({ songId: 'valjean-forgiven', mode: 'ourPicks' }).sharedWithPrevious, false);
assert.equal(api.getSelection({ songId: 'valjean-forgiven', mode: 'sameProduction' }).sharedWithPrevious, true);
for (const mode of ['ourPicks', 'sameProduction']) {
  for (const id of ['what-have-i-done', 'confrontation', 'beggars-feast']) assert.equal(api.getSelection({ songId: id, mode }).sharedWithPrevious, true);
  const ending = api.getSelection({ songId: 'epilogue', mode });
  assert.deepEqual(Array.from(ending.clips, c => c.id), ['VMnd382Fu1M', 'H8HDWeoa7Ag']);
  const html = api.renderStop({ songId: 'epilogue', mode, renderVideo: callback });
  assert.ok(html.indexOf('VMnd382Fu1M') < html.indexOf('H8HDWeoa7Ag'));
  assert.equal((html.match(/class="watch-path-part"/g) || []).length, 2);
  assert.ok(!html.includes('Ln7ZSyv9lSE'));
  assert.ok(!html.includes('-jlbp-4CVNg'));
}
for (const [id, expected] of [['one-day-more', 'HKRzlaQcfUI'], ['on-my-own', 'Mea49KwLiMg'], ['bring-him-home', 'u_eCLahh91s']]) assert.equal(api.getSelection({ songId: id, lang: 'he' }).clips[0].id, expected);
for (const id of ['dreamed-dream', 'people-sing', 'epilogue']) assert.equal(api.getSelection({ songId: id }).kind, 'same-production');
const fallbackHtml = api.renderStop({ songId: 'stars' });
assert.ok(fallbackHtml.includes('https://www.youtube.com/watch?v=_6nTyXcmgLc'));
assert.ok(!fallbackHtml.includes('watch-path-media'));
assert.throws(() => api.renderStop({ songId: 'stars', renderVideo: () => ({}) }), /HTML string/);
const malicious = JSON.parse(JSON.stringify(data));
malicious.clips.find(c => c.id === 'MfVlDf6iFss').title.en = '<script>bad()</script> & "quote"';
const escaped = load(malicious).renderStop({ songId: 'end-of-day' });
assert.ok(escaped.includes('&lt;script&gt;bad()&lt;/script&gt; &amp; &quot;quote&quot;'));
assert.ok(!escaped.includes('<script>'));
const unsafeURL = JSON.parse(JSON.stringify(data));
unsafeURL.clips.find(c => c.id === 'MfVlDf6iFss').url = 'javascript:bad()';
assert.ok(!load(unsafeURL).renderStop({ songId: 'end-of-day' }).includes('javascript:'));
const publicJSON = JSON.stringify(data);
assert.ok(!/checkedAt|verification|Verified|ReviewNeeded|reviewReasons|technicalEmbedEligibility|contextNote|guessedTimestamps|startSeconds|endSeconds|sourceIds|rights|legal|audit/i.test(publicJSON));
assert.ok(!/fetch\(|localStorage|sessionStorage|XMLHttpRequest|history\.|location\.|addEventListener/.test(source));
assert.ok(!source.includes('autoplay='));
console.log(`PASS: ${renderedCases} localized mode/stop renderings; 38 stops, 45 clips, nine approved callback IDs; school links only; shared sources, epilogue order, defaults, escaping, immutability and unique player instances.`);
