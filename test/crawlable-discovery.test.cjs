const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ctx = {window:{}};
vm.runInNewContext(fs.readFileSync('dist/seo.js','utf8'),ctx);
const metadata = ctx.window.SITE_METADATA;
test('all canonical pages expose crawlable, localized guide navigation before interaction', () => {
  const routes = ['novel','story','characters','hugo','compare','history','musical','before','listening','screen','watch','special-events','israel','after','map','places','recipes','ideas','quiz','resources','contact','sitemap'];
  for (const lang of ['en','he']) for (const [route, meta] of Object.entries(metadata.pages)) {
    if (meta.canonicalRoute) continue;
    const html = fs.readFileSync(`dist/${lang}/${route}/index.html`,'utf8');
    const directory = html.match(/<details class="footer-directory">([\s\S]*?)<\/details>/);
    assert.ok(directory, `${lang}/${route}: native guide disclosure exists`);
    for (const target of routes) {
      assert.ok(directory[1].includes(`href="/${lang}/${target}/"`), `${lang}/${route} links to ${target}`);
      assert.ok(fs.existsSync(`dist/${lang}/${target}/index.html`));
    }
    assert.ok(!directory[1].includes('href="#/'));
    assert.ok(!directory[1].includes('character-'), 'Chapter-bound readers must not expose character names through the new navigation');
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
