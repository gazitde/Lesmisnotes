// Category navigation regression: native modifiers, visit state and precise gallery focus.
// Run: node validate-category-navigation.mjs [repository]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const repo = process.argv[2] || process.cwd();
let assertions = 0;
function equal(actual, expected, label) {
  assert.deepEqual(actual, expected, label);
  assertions++;
}
const plain = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const exposed = `window.__review = {
  handleClick, render, navigate, galleryGo,
  primeVisit() {
    P.choose({ functional: false, analytics: false, media: false });
    checked = ['stars', 'prayer'];
    quizRun = Q.select(Q.start(R.quiz, 'story', 5), 2);
    quizInitialized = true;
    sourceSearch = 'gutenberg'; sourceTopic = 'all'; sourceLimit = 24;
    save('barricade-listening', JSON.stringify(checked));
    save('barricade-quiz-run', JSON.stringify(quizRun));
  },
  visit() { return { checked, quizRun, sourceSearch, sourceTopic,
    functional: P.allowed('functional'),
    memoryQuiz: P.get('barricade-quiz-run'),
    memoryChecks: P.get('barricade-listening'), spoiler }; },
  state() { return { lang, route, galleryCategory, galleryAudio, galleryClip }; }
};})();`;

function boot(language = 'en', route = 'home') {
  const localValues = new Map(), sessionValues = new Map(), transitions = [], analytics = [];
  const storage = values => ({ getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) });
  let activeId = null;
  const nodes = new Map(), app = { innerHTML: '', addEventListener() {} };
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { style: {}, classList: { add() {}, remove() {} },
      focus() { activeId = id; }, scrollIntoView() {}, setAttribute() {},
      querySelectorAll() { return []; }, addEventListener() {} });
    return nodes.get(id);
  };
  const ctx = { console, URLSearchParams, localStorage: storage(localValues),
    sessionStorage: storage(sessionValues), setTimeout: () => 1, clearTimeout() {},
    document: { documentElement: {}, title: '', addEventListener() {},
      querySelectorAll: () => [], getElementById: id => id === 'app' ? app : node(id),
      querySelector: selector => node(selector.startsWith('#') ? selector.slice(1) : selector) },
    location: { pathname: `/${language}/${route}/`, search: '', hash: '', origin: 'https://example.test' },
    history: { state: null } };
  for (const method of ['pushState', 'replaceState']) ctx.history[method] = (state, _, href) => {
    const u = new URL(href, ctx.location.origin);
    Object.assign(ctx.location, { pathname: u.pathname, search: u.search, hash: u.hash });
    ctx.history.state = state;
    transitions.push({ method, href, state: plain(state) });
  };
  ctx.window = ctx; ctx.scrollTo = () => {}; ctx.addEventListener = () => {};
  vm.createContext(ctx);
  for (const name of ['research', 'extras', 'quiz-engine', 'seo', 'policies', 'privacy',
    'site-config', 'analytics', 'places-data', 'places', 'recipes-data', 'recipes', 'search']) {
    vm.runInContext(fs.readFileSync(path.join(repo, `dist/${name}.js`), 'utf8'), ctx);
  }
  ctx.SiteAnalytics = { ...ctx.SiteAnalytics,
    track(event, detail) { analytics.push({ event, detail: plain(detail) }); return false; } };
  const original = fs.readFileSync(path.join(repo, 'dist/app.js'), 'utf8');
  const instrumented = original.replace(/\}\)\(\);\s*$/, exposed);
  assert.notEqual(original, instrumented, 'App test export was inserted');
  vm.runInContext(instrumented, ctx);
  transitions.length = 0; analytics.length = 0;
  return { ctx, api: ctx.__review, app, transitions, analytics, localValues,
    activeId: () => activeId };
}

function click(x, href, options = {}) {
  let prevented = false;
  const anchor = { dataset: {}, getAttribute: name => name === 'href' ? href : null };
  const target = { closest: selector => selector === 'a[href]' ? anchor : null };
  x.api.handleClick({ target, button: 0, preventDefault() { prevented = true; }, ...options });
  return prevented;
}

// Both localized categories, including a cross-language link and repeated clicks.
for (const from of ['home', 'screen', 'listening']) for (const language of ['en', 'he'])
for (const category of ['together', 'humor']) {
  const x = boot(language === 'he' ? 'en' : 'he', from);
  x.api.primeVisit();
  const before = plain(x.api.visit()), href = `/${language}/listening/?category=${category}`;
  equal(before.functional, false, 'Memory-only mode');
  for (let repeat = 0; repeat < 2; repeat++) {
    equal(click(x, href), true, 'Category link is intercepted');
    equal(x.ctx.location.pathname + x.ctx.location.search, href, 'Exact localized category destination');
    equal(plain(x.api.state()), { lang: language, route: 'listening', galleryCategory: category,
      galleryAudio: 'all', galleryClip: null }, 'Correct category and route state');
    equal(plain(x.api.visit()), before, 'All memory-only visit state preserved');
    equal(x.activeId(), 'gallery-choices', 'Gallery choices receive focus');
  }
  equal(x.transitions.filter(t => t.method === 'pushState').length, 1, 'Repeated current-category link does not add an invisible history step');
  equal(x.localValues.has('barricade-quiz-run'), false, 'No persistent quiz storage introduced');
  equal(x.localValues.has('barricade-listening'), false, 'No persistent checkmark storage introduced');
}

// Modified and non-primary clicks must remain native browser navigation.
for (const language of ['en', 'he']) for (const category of ['together', 'humor'])
for (const options of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true },
  { altKey: true }, { button: 1 }, { button: 2 }]) {
  const x = boot(language); x.api.primeVisit(); const before = plain(x.api.visit());
  equal(click(x, `/${language}/listening/?category=${category}`, options), false, 'Modified click remains native');
  equal(x.transitions.length, 0, 'Modified click does not touch history');
  equal(x.ctx.location.pathname, `/${language}/home/`, 'Modified click does not change current route');
  equal(plain(x.api.visit()), before, 'Modified click leaves visit memory unchanged');
}

// The new branch must not consume arbitrary routes or extra query parameters.
for (const href of ['/en/listening/?category=unknown', '/fr/listening/?category=humor',
  '/en/listening/?category=together&extra=1', '/en/listening/?category=humor#details',
  '/en/listening/?category=humor&clip=DXgCrhIevwU', '/en/listening/?category=humorous',
  'https://example.test/en/listening/?category=humor', '//elsewhere.test/en/listening/?category=humor']) {
  const x = boot();
  equal(click(x, href), false, 'Unmatched category URL remains native: ' + href);
  equal(x.transitions.length, 0, 'Unmatched URL does not alter history');
}

// Existing journeys continue only where the listening route belongs.
for (const [journey, from, remains] of [['voices', 'screen', true], ['after', 'compare', true],
  ['first', 'before', false], ['play', 'history', false]]) {
  const x = boot('en', from); x.ctx.history.state = { lesmisJourney: journey };
  equal(click(x, '/en/listening/?category=together'), true, 'Journey category click intercepted');
  equal(plain(x.ctx.history.state), { ...(remains ? {lesmisJourney:journey} : {}), lesmisGalleryFocus:{kind:'choices'} }, 'Journey membership and bounded focus state retained correctly');
  equal(x.analytics.filter(e => e.event === 'journey_step').length, remains ? 1 : 0, 'Valid journey arrival tracked exactly once');
  equal(x.analytics.filter(e => e.event === 'journey_offroute').length, remains ? 0 : 1, 'Off-route exit tracked exactly once');
  equal(x.activeId(), 'gallery-choices', 'Journey tracking preserves destination focus');
}

// Existing clip routing remains functional alongside the new branch.
const clip = boot('en');
equal(click(clip, '/en/listening/?clip=_6nTyXcmgLc'), true, 'Existing clip link remains intercepted');
equal(clip.api.state().galleryClip, '_6nTyXcmgLc', 'Existing clip selection preserved');
equal(clip.activeId(), 'gallery-detail', 'Clip destination retains its detail focus');

console.log(`PASS: ${assertions} independent category-navigation assertions; bounded HE/EN routing, repeat/modified clicks, visit memory, focus, history, journeys and existing clip links.`);
