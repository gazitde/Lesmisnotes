'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/app.js','utf8');
const read=(lang,route)=>fs.readFileSync(`dist/${lang}/${route}/index.html`,'utf8');
const routes=['before','novel-journey','compare','screen'];
for(const lang of ['he','en'])for(const route of routes)test(`${lang}/${route}: useful entry text and crawlable clean next steps`,()=>{
 const html=read(lang,route),h1=html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1];
 assert(h1.includes(lang==='he'?'עלובי החיים':'Les Misérables'));
 const aside=html.match(/<aside class="link-box acquisition-next"[\s\S]*?<\/aside>/)[0];
 const links=[...aside.matchAll(/href="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(links.length,2);assert(links.every(x=>new RegExp(`^/${lang}/[a-z-]+/$`).test(x)));
 assert(links.every(x=>!x.includes('?')&&!x.includes('#')));
 assert(html.includes(`rel="canonical" href="https://www.lesmisnotes.com/${lang}/${route}/"`));
 assert(!html.includes('"@type":"FAQPage"'));
 if(route==='compare'){assert(html.includes('data-action="enable-spoilers"'));assert(!html.includes('class="adaptation-card"'));}
 if(route==='screen'){
  const answer=html.match(/<section class="intro-box film-stage-answer"[\s\S]*?<\/section>/)[0];
  assert(answer.includes('Suddenly'));assert(answer.includes('universal-music.de/les-miserables/news/'));
  assert(answer.includes(lang==='he'?'מקורות ההפקה עשויים לכלול פרטי עלילה':'Production sources may include plot details'));
  assert(!answer.includes('<iframe'));assert(!answer.includes('data-video-shell'));
 }
});
test('new crosslinks and answer have no state, media loading or measurement side effects',()=>{
 const start=source.indexOf('function acquisitionNext('),end=source.indexOf('function screenPage(',start),helpers=source.slice(start,end);
 for(const forbidden of ['localStorage','sessionStorage','fetch(','A.track','setSpoilers','<iframe','autoplay'])assert(!helpers.includes(forbidden),forbidden);
 assert(source.includes("readerSelection().level==='root'?acquisitionNext('novel-journey'):''"));
});
test('complete reading and musical collections remain intact',()=>{
 const w={};vm.runInNewContext(fs.readFileSync('dist/extras.js','utf8'),{window:w});
 assert.equal(w.EXTRA_CONTENT.musical.songentries.filter(x=>!x.interval).length,38);
 const chapters=[1,2,3,4,5].flatMap(i=>JSON.parse(fs.readFileSync(`dist/reading/part-${i}.json`,'utf8')).chapters);
 assert.equal(chapters.length,365);assert.equal(new Set(chapters.map(x=>x.id)).size,365);
});
test('historical normalization only accepts the exact bilingual acquisition title',()=>{
 const w={};vm.runInNewContext(fs.readFileSync('dist/extras.js','utf8'),{window:w});
 const normalize=require('./helpers/editorial-baseline.cjs').beforeEditorial;
 for(const lang of ['he','en']){
  const x=JSON.parse(JSON.stringify(w.EXTRA_CONTENT));x.curtain.before.title[lang]+=' MUTATION';
  assert.throws(()=>normalize(x,'extras'),/Reviewed October 28 acquisition title/);
 }
 const normalized=normalize(w.EXTRA_CONTENT,'extras');
 assert.deepEqual(normalized.curtain.before.title,{en:'Before the curtain',he:'לפני שהמסך עולה'});
 const changed=JSON.parse(JSON.stringify(w.EXTRA_CONTENT));changed.curtain.before.subtitle.en+=' MUTATION';changed.musical.songentries[0].acquisitionMutation='must remain detectable';
 const result=normalize(changed,'extras');assert(result.curtain.before.subtitle.en.endsWith(' MUTATION'));assert.equal(result.musical.songentries[0].acquisitionMutation,'must remain detectable');
});
