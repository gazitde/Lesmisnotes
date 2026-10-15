'use strict';
// Real application navigation and rendering in a deterministic VM.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const code = name => fs.readFileSync(path.join(root, 'dist', name + '.js'), 'utf8');
const expose = `window.__swipeTest={moveSlide,chapterSlideNav,readingChapters,navigateReader,readingHref,selectedReading,readerChapterCard,showJourney,showStops,filteredShowStops,currentShowStop,spoiler:()=>spoiler,cache(data){readingPartCache.set(data.part,data)},setShow(index,act='all',mode='ourPicks'){showIndex=index;showAct=act;watchMode=mode}};})();`;
function boot(language) {
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
    location: { pathname: `/${language}/novel/`, search: '', hash: '', origin: 'https://example.test' }, history: { state: null } };
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

for (const language of ['en', 'he']) {
  test(`chapter swipe follows canonical order across Books and Parts (${language})`, () => {
    const h = boot(language), { api, ctx } = h, chapters = api.readingChapters();
    const surface = id => ({ dataset: { slideSurface: 'chapter', chapterId: id } });
    const transitions = [chapters[0], chapters.find((c, i) => chapters[i + 1]?.bookId !== c.bookId), chapters.find((c, i) => chapters[i + 1]?.part !== c.part)];
    for (const chapter of transitions) {
      const index = chapters.findIndex(c => c.id === chapter.id), next = chapters[index + 1];
      api.navigateReader(api.readingHref('chapter', chapter.id));
      const before = h.pushes.length;
      api.moveSlide(surface(chapter.id), 'next');
      assert.equal(api.selectedReading().key, next.id);
      assert.equal(new URLSearchParams(ctx.location.search).get('focus'), 'chapter:' + next.id);
      assert.equal(h.pushes.length, before + 1, 'One history entry per step');
      assert.equal(h.focused(), 'reader-chapter-' + next.id);
      assert.equal(h.animations.at(-1)[0].id, 'reader-chapter-' + next.id);
      assert.equal(h.animations.at(-1)[2], language === 'he');
      api.moveSlide(surface(next.id), 'prev');
      assert.equal(api.selectedReading().key, chapter.id);
    }
    assert.equal(api.spoiler(), false);
    assert.equal(h.session.get('barricade-spoilers'), undefined);
    assert.equal(h.disk.get('barricade-last-reading'), undefined);
    assert.ok(!h.app.innerHTML.includes('data-novel-event'), 'Swiping cannot unlock the full recap');
  });

  test(`chapter boundaries and fallback links are safe (${language})`, () => {
    const h = boot(language), { api } = h, chapters = api.readingChapters();
    for (const [chapter, step] of [[chapters[0], 'prev'], [chapters.at(-1), 'next']]) {
      api.navigateReader(api.readingHref('chapter', chapter.id));
      const before = h.pushes.length;
      api.moveSlide({ dataset: { slideSurface: 'chapter', chapterId: chapter.id } }, step);
      assert.equal(h.pushes.length, before);
      assert.equal(api.selectedReading().key, chapter.id);
      assert.match(api.chapterSlideNav(chapter), new RegExp('class="slide-' + step + '" aria-disabled="true"'));
    }
    const html = api.readerChapterCard(chapters[1], chapters[1].id);
    assert.match(html, /data-slide-surface="chapter"/);
    assert.ok(html.includes(api.readingHref('chapter', chapters[0].id)));
    assert.ok(html.includes(api.readingHref('chapter', chapters[2].id)));
    assert.ok(html.includes(language === 'he' ? 'אפשר להחליק לצדדים' : 'Swipe to move'));
    const before = h.pushes.length;
    api.moveSlide({ dataset: { slideSurface: 'chapter', chapterId: 'unknown' } }, 'next');
    assert.equal(h.pushes.length, before);
  });

  test(`scene swipes retain mode, act, focus and one history step (${language})`, () => {
    const h = boot(language), { api, ctx } = h, surface = { dataset: { slideSurface: 'show' } };
    api.setShow(0, '1', 'sameProduction');
    const stops = api.filteredShowStops(), before = h.pushes.length;
    api.moveSlide(surface, 'prev');
    assert.equal(h.pushes.length, before, 'The first scene cannot wrap');
    api.moveSlide(surface, 'next');
    const query = new URLSearchParams(ctx.location.search);
    assert.equal(query.get('focus'), 'song:' + stops[1].id);
    assert.equal(query.get('act'), '1');
    assert.equal(query.get('watch'), 'sameProduction');
    assert.equal(h.pushes.length, before + 1);
    assert.equal(h.focused(), 'show-current-title');
    assert.equal(h.animations.at(-1)[0].id, 'show-slide');
    api.moveSlide(surface, 'prev');
    assert.equal(api.currentShowStop().id, stops[0].id);
    api.setShow(stops.length - 1, '1', 'sameProduction');
    const last = h.pushes.length;
    api.moveSlide(surface, 'next');
    assert.equal(h.pushes.length, last, 'The last filtered scene cannot wrap');
    assert.match(api.showJourney(), /id="show-slide" data-slide-surface="show"/);
  });
}
