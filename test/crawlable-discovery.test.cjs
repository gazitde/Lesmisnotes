const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ctx = {window:{}};
vm.runInNewContext(fs.readFileSync('dist/seo.js','utf8'),ctx);
const metadata = ctx.window.SITE_METADATA;
const appSource=fs.readFileSync('dist/app.js','utf8');
const groups=vm.runInNewContext('('+appSource.match(/^const navGroups=(.*);$/m)[1]+')');
const hubs=['novel-journey','musical-journey','characters','listening','map','ideas'];
test('six clearly named navigation hubs partition real canonical guide pages without duplicates',()=>{
  assert.deepEqual(Object.values(groups).map(g=>g.hub),hubs);
  const pages=Object.values(groups).flatMap(g=>g.pages);
  assert.equal(new Set(pages).size,pages.length);
  for(const group of Object.values(groups)){
    assert.ok(group.title.he && group.title.en);
    assert.ok(group.pages.includes(group.hub));
    for(const page of group.pages) assert.ok(metadata.pages[page]&&!metadata.pages[page].canonicalRoute,page);
  }
  assert.deepEqual(Object.values(groups).map(g=>g.title.en),['Read','Musical','Characters','Watch & listen','Explore','Ideas & history']);
});
test('all canonical pages expose six localized crawlable hubs and the complete sitemap', () => {
  for (const lang of ['en','he']) for (const [route, meta] of Object.entries(metadata.pages)) {
    if (meta.canonicalRoute) continue;
    const html = fs.readFileSync(`dist/${lang}/${route}/index.html`,'utf8');
    const directory = html.match(/<nav class="footer-hubs"[^>]*>([\s\S]*?)<\/nav>/);
    assert.ok(directory, `${lang}/${route}: compact guide navigation exists`);
    for (const target of [...hubs,'sitemap']) {
      assert.ok(directory[1].includes(`href="/${lang}/${target}/"`), `${lang}/${route} links to ${target}`);
      assert.ok(fs.existsSync(`dist/${lang}/${target}/index.html`));
    }
    assert.equal((directory[1].match(/<a /g)||[]).length,7);
    assert.ok(!directory[1].includes('href="#/'));
    assert.ok(!directory[1].includes('character-'), 'Chapter-bound readers must not expose character names through navigation');
  }
});
test('sitemap preserves crawlable access to every canonical page including utility and profile pages',()=>{
  for(const lang of ['en','he']){
    const html=fs.readFileSync(`dist/${lang}/sitemap/index.html`,'utf8');
    for(const [route,meta] of Object.entries(metadata.pages)){
      if(meta.canonicalRoute)continue;
      assert.ok(html.includes(`href="/${lang}/${route}/"`),`${lang} sitemap reaches ${route}`);
    }
  }
});
test('home discovery presents quizzes and dilemmas as direct localized destinations',()=>{
  for(const lang of ['en','he']){
    const html=fs.readFileSync(`dist/${lang}/home/index.html`,'utf8');
    const discovery=html.match(/<section class="home-discovery"[\s\S]*?<\/section>/)?.[0];
    assert.ok(discovery);
    for(const route of ['places','recipes','quiz','ideas'])assert.ok(discovery.includes(`href="/${lang}/${route}/"`));
  }
});
test('language landing aliases permanently redirect to existing canonical homes', () => {
  const config = JSON.parse(fs.readFileSync('vercel.json','utf8'));
  for (const source of ['/:lang(en|he)','/:lang(en|he)/']) {
    const rule = config.redirects.find(r=>r.source===source);
    assert.equal(rule?.destination,'/:lang/home/');
    assert.equal(rule?.permanent,true);
  }
  for(const lang of ['en','he'])assert.ok(fs.existsSync(`dist/${lang}/home/index.html`));
});
