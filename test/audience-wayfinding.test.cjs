'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
for(const lang of ['en','he'])test(`direct arrivals distinguish novel and musical journeys (${lang})`,()=>{
 const musical=['before','musical','story','listening','screen','watch','special-events','israel'];
 for(const route of [...musical,'novel','hugo','compare']){
  const html=fs.readFileSync(`dist/${lang}/${route}/index.html`,'utf8');
  const nav=html.match(/<nav class="audience-wayfinding wrap"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(nav,route);
  assert.ok(nav.includes(musical.includes(route)?(lang==='en'?'Musical guide':'מסלול המחזמר'):route==='compare'?(lang==='en'?'From novel to stage':'מהספר אל הבמה'):(lang==='en'?'Novel guide':'מסלול הספר')),route);
  for(const [,target] of nav.matchAll(/href="([^\"]+)"/g)){
   assert.ok(target.startsWith(`/${lang}/`));
   assert.ok(fs.existsSync('dist'+target.split('?')[0]+'index.html'),target);
  }
  assert.ok(nav.includes(`?interest=${musical.includes(route)?'novel':'musical'}#home-classic-heading`));
  assert.doesNotMatch(nav,/data-action="enable-spoilers"|data-profile-link|character-/);
 }
 const home=fs.readFileSync(`dist/${lang}/home/index.html`,'utf8');
 assert.ok(home.includes(lang==='en'?'I’m here for the novel':'אני כאן בשביל הספר'));
 assert.ok(home.includes(lang==='en'?'I’m here for the musical':'אני כאן בשביל המחזמר'));
});
test('route groups put the musical plot in the musical section, with book-only entry unchanged',()=>{
 const app=fs.readFileSync('dist/app.js','utf8');
 assert.match(app,/learn:\{title:.*?pages:\['novel','characters','hugo','compare','history'\]/);
 assert.match(app,/watch:\{title:.*?pages:\['musical','before','story'/);
 const meta=JSON.parse(fs.readFileSync('config/metadata.json','utf8')).pages;
 assert.match(meta.novel.title.en,/chapter summaries.*novel/);
 assert.match(meta.story.title.en,/musical plot summary/);
});
