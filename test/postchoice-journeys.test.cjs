'use strict';
// Real application navigation and rendering in a deterministic VM.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const code = name => fs.readFileSync(path.join(root, 'dist', name + '.js'), 'utf8');
const expose = `window.__swipeTest={render,navigate,interestPlan,interestPaths,migrateJourneyLocation,setSpoilers,moveSlide,chapterSlideNav,readingChapters,navigateReader,readingHref,selectedReading,readerChapterCard,showJourney,showStops,filteredShowStops,currentShowStop,spoiler:()=>spoiler,cache(data){readingPartCache.set(data.part,data)},setShow(index,act='all',mode='ourPicks'){showIndex=index;showAct=act;watchMode=mode}};})();`;
function boot(language,initial="novel-journey/") {
  const disk = new Map(), session = new Map(), nodes = new Map(), animations = [], pushes = [];
  let focused = '';
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { id, classList: { add() {}, remove() {} }, focus() { focused = id; }, setAttribute() {}, scrollIntoView() {}, querySelectorAll() { return []; }, style: {} });
    return nodes.get(id);
  };
  const app = { innerHTML: '', addEventListener() {} };
  const storage = data => ({ getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) });
  const ctx = { console, URLSearchParams, localStorage: storage(disk), sessionStorage: storage(session), setTimeout: () => 1, clearTimeout() {},
    document: { documentElement: {}, title: '', addEventListener() {}, querySelectorAll: () => [], getElementById: id => id === 'app' ? app : node(id), querySelector: selector => selector.startsWith('#') ? node(selector.slice(1)) : { ...node(selector), addEventListener() {} } },
    location: { pathname: `/${language}/${initial.split("?")[0]}`, search: initial.includes("?")?"?"+initial.split("?")[1]:"", hash: '', origin: 'https://example.test' }, history: { state: null } };
  const applyURL = (state, _, href) => { const url = new URL(href, ctx.location.origin); Object.assign(ctx.location, { pathname: url.pathname, search: url.search, hash: url.hash }); ctx.history.state = state; };
  ctx.history.replaceState = applyURL;
  ctx.history.pushState = (...args) => { pushes.push(args[2]); applyURL(...args); };
  ctx.window = ctx; ctx.scrollTo = () => {}; ctx.addEventListener = () => {};
  ctx.SlideNavigation = { install() {}, animate: (...args) => animations.push(args) };
  vm.createContext(ctx);
  for (const name of ['research', 'extras', 'character-profiles-data', 'character-profiles', 'quiz-engine', 'seo', 'policies', 'privacy', 'site-config', 'analytics', 'places-data', 'places', 'recipes-data', 'recipes', 'search', 'chapter-completion', 'book-stage-data', 'book-stage']) vm.runInContext(code(name), ctx);
  vm.runInContext(code('app').replace(/\}\)\(\);\s*$/, expose), ctx);
  const api = ctx.__swipeTest;
  for (let part = 1; part <= 5; part++) api.cache(JSON.parse(fs.readFileSync(path.join(root, `dist/reading/part-${part}.json`), 'utf8')));
  return { ctx, api, app, disk, session, animations, pushes, focused: () => focused };
}


for(const lang of ['en','he']){
 test(`dedicated journeys keep focus, language and explicit spoiler consent (${lang})`,()=>{
  const h=boot(lang,'novel/?focus=chapter%3Ap1-b1-c1&essays=all'),{api,ctx}=h;
  assert.equal(ctx.location.pathname,`/${lang}/novel-journey/`);
  api.render();
  assert.equal((h.app.innerHTML.match(/class="chapter-summary-text"/g)||[]).length,1);
  assert.ok(h.app.innerHTML.includes('reader-chapter-p1-b1-c1'));
  assert.ok(!h.app.innerHTML.includes('reader-chapter-p1-b1-c2'));
  assert.equal(api.spoiler(),false);
  api.navigate('novel-journey',lang==='en'?'he':'en');
  assert.equal(new URLSearchParams(ctx.location.search).get('focus'),'chapter:p1-b1-c1');
  assert.equal(new URLSearchParams(ctx.location.search).get('essays'),'all');
  const musical=boot(lang,'musical/?focus=song%3Awork-song&view=journey');
  assert.equal(musical.ctx.location.pathname,`/${lang}/musical-journey/`);
  assert.ok(musical.app.innerHTML.includes('data-action="show-open"'));
  assert.ok(!musical.app.innerHTML.includes('id="show-slide"'));
  assert.ok(!musical.app.innerHTML.includes('data-show-select'));
  musical.api.setSpoilers(true);
  assert.ok(musical.app.innerHTML.includes('id="show-slide" data-slide-surface="show"'));
  assert.ok(musical.app.innerHTML.includes('data-show-select'));
 });
 test(`choice becomes a compact selected path with a direct meaningful first action (${lang})`,()=>{
  const h=boot(lang,'home/?interest=novel');
  assert.equal((h.app.innerHTML.match(/class="path-card"/g)||[]).length,0);
  assert.ok(h.app.innerHTML.includes('class="interest-selection"'));
  assert.ok(h.app.innerHTML.includes('novel-journey/?focus=chapter%3Ap1-b1-c1'));
  assert.ok(h.app.innerHTML.includes('?interest=choose#home-classic-heading'));
  assert.equal((h.app.innerHTML.match(/<h1 /g)||[]).length,1);
  assert.ok(!h.app.innerHTML.includes('class="hero"'));
  const intro=boot(lang,'musical-journey/');
  assert.ok(intro.app.innerHTML.includes('musical-journey-orientation'));
  assert.ok(!intro.app.innerHTML.includes('id="show-slide"'));
  assert.ok(!intro.app.innerHTML.includes('class="audience-wayfinding wrap"'));
 });
}

for(const lang of ['en','he'])test(`legacy anchors and spotlight URLs retain their intended destinations (${lang})`,()=>{
 const h=boot(lang),{api,ctx}=h;
 ctx.history.replaceState(null,'',`/${lang}/novel/#reader-chapter-p1-b1-c2`);api.render();
 assert.equal(ctx.location.pathname,`/${lang}/novel-journey/`);assert.equal(api.selectedReading().key,'p1-b1-c2');
 ctx.history.replaceState(null,'',`/${lang}/musical/#musical-journey`);api.render();
 assert.equal(ctx.location.pathname,`/${lang}/musical-journey/`);assert.equal(api.selectedReading().key,'work-song');assert.equal(api.spoiler(),false);
 const id=ctx.RESEARCH.musical.spotlight.songs[0].id;
 ctx.history.replaceState(null,'',`/${lang}/musical/?focus=song%3A${id}&view=spotlight`);api.render();
 assert.equal(ctx.location.pathname,`/${lang}/musical/`);assert.equal(api.selectedReading().view,'spotlight');
 const intro=boot(lang,'musical-journey/');assert.ok(intro.app.innerHTML.includes('https://www.youtube.com/watch?v=5vnlCwsoKCs'));assert.equal((intro.app.innerHTML.match(/<iframe /g)||[]).length,0);
});
