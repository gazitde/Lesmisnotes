// App/DOM-double integration contracts. Browser interactions are checked separately.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
let checks = 0;
const check = (v, m) => { assert.ok(v, m); checks++; };
const expose = 'window.__searchPolish={navigateSearchResult,setSpoilers,render,sourceMatches,sourceResults,setSourceFilter(q,topic="all"){sourceSearch=q;sourceTopic=topic;sourceLimit=24},getState(){return{lang,route,spoiler,novelConsent,showId:currentShowStop()?.id,readingChapter,readingBook}}};})();';
function boot(lang, route = 'home', focus = '') {
  const values = new Map(), storage = { getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
  let activeId = null;
  const app = { innerHTML: '', addEventListener() {} }, nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { classList: { add() {}, remove() {} }, focus() { activeId = id; }, setAttribute() {}, scrollIntoView() {}, querySelectorAll() { return []; }, style: {} });
    return nodes.get(id);
  };
  const ctx = { console, URLSearchParams, localStorage: storage, sessionStorage: storage, setTimeout: () => 1, clearTimeout() {},
    document: { documentElement: {}, title: '', addEventListener() {}, querySelectorAll: () => [], getElementById: id => id === 'app' ? app : node(id), querySelector: selector => selector.startsWith('#') ? node(selector.slice(1)) : { ...node(selector), addEventListener() {} } },
    location: { pathname: `/${lang}/${route}/`, search: focus ? `?focus=${encodeURIComponent(focus)}` : '', hash: '', origin: 'https://example.test' }, history: { state: null }
  };
  ctx.history.replaceState = ctx.history.pushState = (state, _, path) => { const u = new URL(path, ctx.location.origin); Object.assign(ctx.location, { pathname: u.pathname, search: u.search, hash: u.hash }); ctx.history.state = state; };
  ctx.window = ctx; ctx.scrollTo = () => {}; ctx.addEventListener = () => {};
  vm.createContext(ctx);
  for (const f of ['research', 'extras', 'quiz-engine', 'seo', 'policies', 'privacy', 'site-config', 'analytics', 'places-data', 'places', 'recipes-data', 'recipes', 'search']) vm.runInContext(fs.readFileSync(`dist/${f}.js`, 'utf8'), ctx);
  vm.runInContext(fs.readFileSync('dist/app.js', 'utf8').replace(/\}\)\(\);\s*$/, expose), ctx);
  return { ctx, app, api: ctx.__searchPolish, activeId: () => activeId, values };
}
for (const lang of ['en', 'he']) {
  const x = boot(lang), { api, ctx, app } = x;
  const index = ctx.SiteSearch.buildIndex({ research: ctx.RESEARCH, extra: ctx.EXTRA_CONTENT });
  for (const query of ['Master of the House', 'Come to Me', 'Javert’s Soliloquy', 'Little People']) {
    const hit = ctx.SiteSearch.search(index, query, { lang }).results[0];
    api.navigateSearchResult(hit.href);
    check(api.getState().showId === hit.doc.key && !api.getState().spoiler, 'Search selects exact gated song ' + query);
    check(x.activeId() === 'musical-journey', 'Non-featured song focuses gate ' + query);
    check(app.innerHTML.includes(`<h2>${hit.doc.title[lang]}</h2>`), 'Gate names safe current title ' + query);
    check(!app.innerHTML.includes('id="show-current-title"') && !app.innerHTML.includes('class="show-slide"'), 'Safe deep link does not render journey details');
    api.setSpoilers(true);
    check(app.innerHTML.includes('id="show-current-title"') && api.getState().showId === hit.doc.key, 'Explicit consent renders selected current entry');
    api.setSpoilers(false);
    check(!app.innerHTML.includes('id="show-current-title"') && api.getState().showId === hit.doc.key, 'Revocation removes scene and preserves target');
  }
  api.navigateSearchResult(`/${lang}/musical/?focus=song%3Astars`);
  check(x.activeId() === 'spotlight-title', 'Safe featured song retains spotlight destination');
  check(app.innerHTML.includes('<h3 id="spotlight-title" dir="ltr">Stars</h3>'), 'Correct existing featured song selected');
  api.navigateSearchResult(`/${lang}/novel/?focus=chapter%3Ap1-b1-c2`);
  check(api.getState().readingChapter === 'p1-b1-c2' && api.getState().readingBook === 'p1-b1', 'Existing adapter selects actual coordinate and parent Book');
  check(!api.getState().spoiler && !api.getState().novelConsent, 'Chapter navigation does not broaden spoiler or novel consent');
  check(x.activeId() === 'reader-chapter-p1-b1-c2', 'Exact chapter focuses its own article when available');
  check(!app.innerHTML.includes('class="chapter-summary-text"'), 'Unloaded chapter content stays absent until its Part payload arrives');
  const plain = boot(lang, 'about'); plain.api.setSourceFilter('gutenberg');
  const before = plain.api.sourceResults(), beforeIds = JSON.stringify(plain.api.sourceMatches().map(s => s.url));
  check(plain.api.sourceMatches().length > 0, 'Existing source catalogue returns Gutenberg results');
  const source = { research: plain.ctx.RESEARCH, extra: plain.ctx.EXTRA_CONTENT };
  const sourceIndex = plain.ctx.SiteSearch.buildIndex(source);
  for (const query of ['1.1.2', 'Master of the House', 'Cossette', '1.1.999']) plain.ctx.SiteSearch.search(sourceIndex, query, { lang });
  check(plain.api.sourceResults() === before && JSON.stringify(plain.api.sourceMatches().map(s => s.url)) === beforeIds, 'Site-search changes cannot mutate source-finder query/results');
  const fresh = boot(lang, 'musical', 'song:master-house');
  check(fresh.api.getState().showId === 'master-house' && !fresh.api.getState().spoiler && fresh.activeId() === 'musical-journey', 'Fresh direct load selects requested safe song and gate');
  check(fresh.app.innerHTML.includes(lang === 'en' ? 'Master of the House' : 'אדון הבית'), 'Fresh load has safe song title');
  check(![...fresh.values.values()].some(v => /Master of the House|Cossette/.test(v)), 'No free-text query storage through adapter');
}
console.log(`Search polish adapter: ${checks} simulated-DOM integration checks passed (canonical selections, safe heading, gate focus, explicit reveal/revocation, source results).`);
