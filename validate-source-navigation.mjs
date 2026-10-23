// Source-catalogue URL state, privacy and contextual discovery regression.
// Run: node validate-source-navigation.mjs [repository]
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
  handleClick, render, navigate, bibliography, sourceMatches,
  search(value){sourceSearch=value;sourceLimit=sourcePageSize;rememberSourceLocation();updateSources()},
  sources(){return {topic:sourceTopic,search:sourceSearch,limit:sourceLimit}}
};})();`;

function boot(language = 'en', route = 'about', query = '', state = null) {
  const localValues = new Map(), sessionValues = new Map(), transitions = [], analytics = [], callbacks = {};
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
    location: { pathname: `/${language}/${route}/`, search: query, hash: '#about-sources', origin: 'https://example.test' },
    history: { state } };
  for (const method of ['pushState', 'replaceState']) ctx.history[method] = (state, _, href) => {
    const u = new URL(href, ctx.location.origin);
    Object.assign(ctx.location, { pathname: u.pathname, search: u.search, hash: u.hash });
    ctx.history.state = state;
    transitions.push({ method, href, state: plain(state) });
  };
  ctx.window = ctx; ctx.scrollTo = () => {}; ctx.addEventListener = (type,fn) => {callbacks[type]=fn};
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
  return { callbacks, ctx, api: ctx.__review, app, transitions, analytics, localValues,
    activeId: () => activeId };
}

function click(x, href, options = {}) {
  let prevented = false;
  const anchor = { dataset: {}, getAttribute: name => name === 'href' ? href : null };
  const target = { closest: selector => ['a[href]', 'a[data-source-catalogue]'].includes(selector) ? anchor : null };
  x.api.handleClick({ target, button: 0, preventDefault() { prevented = true; }, ...options });
  return prevented;
}

function press(x,dataset){x.api.handleClick({target:{closest:selector=>selector==='button'?{dataset}:null}})}
function restore(x,transition){const u=new URL(transition.href,x.ctx.location.origin);Object.assign(x.ctx.location,{pathname:u.pathname,search:u.search,hash:u.hash});x.ctx.history.state=plain(transition.state);x.callbacks.popstate();}
for(const lang of ['he','en']){
 const x=boot(lang);
 const total=x.api.bibliography().length;
 equal(total,new Set(x.ctx.RESEARCH.sources.map(s=>s.url)).size,'Full deduplicated source count preserved');
 for(const g of x.ctx.RESEARCH.sourceGroups){
  const entry=boot(lang,'about','?topic='+g.id);
  equal(entry.api.sources().topic,g.id,'Every valid topic loads');
  equal(entry.api.sourceMatches().length,entry.api.bibliography().filter(s=>s.groups.includes(g.id)).length,'Exact topic matches');
  equal(entry.app.innerHTML.includes('data-source-topic="'+g.id+'" aria-controls="source-results" aria-pressed="true"'),true,'Topic chip matches URL');
 }
 for(const query of ['?topic=not-a-topic','?topic=','?topic=all','?topic=history-ideas&topic=screen-video','?topic=%3Cscript%3E']){
  const invalid=boot(lang,'about',query);
  equal(invalid.api.sources().topic,'all','Invalid or ambiguous topic falls back to all');
  equal(invalid.ctx.location.search,'','Invalid topic is removed without adding history');
  equal(invalid.api.sourceMatches().length,total,'Invalid topic cannot hide sources');
 }
 const unsafe=boot(lang,'about','?topic=screen-video',{lesmisSources:{topic:'screen-video',search:'<script>bad</script>',limit:-10}});
 equal(unsafe.api.sources().search,'','Search text in history state is ignored');
 equal(Object.hasOwn(unsafe.ctx.history.state.lesmisSources,'search'),false,'Legacy persisted search field is removed');
 equal(unsafe.api.sources().limit,24,'Malformed reveal state is bounded');
 const stale=boot(lang,'about','?topic=history-ideas',{lesmisSources:{topic:'screen-video',search:'stale',limit:9999}});
 equal(plain(stale.api.sources()),{topic:'history-ideas',search:'',limit:24},'URL topic wins over stale history state');
 const shared=boot(lang,'about','?topic=history-ideas');
 shared.ctx.location.hash='';shared.api.render();equal(shared.ctx.location.hash,'#about-sources','Topic-only direct link lands at catalogue');
 const ignored=boot(lang,'about','?topic=invalid&keep=1');equal(ignored.ctx.location.search,'?keep=1','Unrelated query is retained on repair');
 press(x,{sourceTopic:'history-ideas'});
 equal(x.ctx.location.search,'?topic=history-ideas','Topic click has a shareable URL');
 equal(x.ctx.location.hash,'#about-sources','Filter stays at the catalogue');
 const count=x.transitions.length;press(x,{sourceTopic:'history-ideas'});equal(x.transitions.length,count,'Repeated filter creates no history step');
 x.api.search('Gutenberg');equal(x.ctx.location.search,'?topic=history-ideas','Private search never enters URL');
 equal(Object.hasOwn(x.ctx.history.state.lesmisSources,'search'),false,'Search never enters history state');
 equal(JSON.stringify(x.ctx.history.state).includes('Gutenberg'),false,'History state contains no query string');
 const searched=x.transitions.at(-1);press(x,{sourceTopic:'screen-video'});const second=x.transitions.at(-1);
 restore(x,searched);equal(plain(x.api.sources()),{topic:'history-ideas',search:'Gutenberg',limit:24},'Back restores filter and search');
 restore(x,second);equal(plain(x.api.sources()),{topic:'screen-video',search:'Gutenberg',limit:24},'Forward restores filter and search');
 const reloaded=boot(lang,'about',x.ctx.location.search,plain(x.ctx.history.state));
 equal(plain(reloaded.api.sources()),{topic:'screen-video',search:'',limit:24},'Reload retains topic but clears private search');
 x.api.navigate('about',lang==='he'?'en':'he');
 equal(x.ctx.location.pathname,'/'+(lang==='he'?'en':'he')+'/about/','Language switch keeps the route');
 equal(x.ctx.location.search,'?topic=screen-video','Language switch keeps the topic');
 equal(x.api.sources().search,'Gutenberg','Language switch keeps the private query');
 press(x,{action:'source-clear'});
 equal(plain(x.api.sources()),{topic:'all',search:'',limit:24},'Reset clears all filters');
 equal(x.ctx.location.search,'','Reset removes topic');
 x.api.search('Hugo');const privateSearch=x.transitions.at(-1);press(x,{action:'source-clear'});const cleared=x.transitions.at(-1);
 restore(x,privateSearch);equal(x.api.sources().search,'Hugo','Back restores same-URL search state');
 restore(x,cleared);equal(x.api.sources().search,'','Forward restores same-URL cleared state');
 equal(x.localValues.has('lesmisSources'),false,'No persistent search storage');
 equal(x.analytics.some(e=>JSON.stringify(e).includes('Gutenberg')),false,'No query analytics');
 press(x,{sourceTopic:'invented'});equal(x.api.sources().topic,'all','Unrecognized button values are ignored');
 for(const [route,topic] of [['history','history-ideas'],['screen','screen-video']]){
  const entry=boot(lang,route);const href=`/${lang}/about/?topic=${topic}#about-sources`;
  equal(entry.app.innerHTML.includes('data-source-catalogue href="'+href+'"'),true,'Contextual topic link exists');
  equal(click(entry,href),true,'Contextual source link uses visit-preserving navigation');
  equal(entry.api.sources().topic,topic,'Contextual link applies correct topic');
  equal(entry.activeId(),'about-sources','Catalogue receives keyboard focus');
  const before=entry.transitions.filter(t=>t.method==='pushState').length;equal(click(entry,href),true,'Repeated contextual link works');equal(entry.transitions.filter(t=>t.method==='pushState').length,before,'Repeated contextual link does not push history');
  for(const options of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1}])equal(click(entry,href,options),false,'Native modified click remains native');
 }
}
console.log(`PASS: ${assertions} source-navigation assertions; validated HE/EN topics, all sources, reset, history, reload, language, private search and contextual links.`);
