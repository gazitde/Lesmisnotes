'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={window:{},URLSearchParams};vm.createContext(context);
for(const file of ['research','extras','special-events-data','character-profiles-data','places-data','recipes-data','seo','search'])vm.runInContext(fs.readFileSync(`dist/${file}.js`,'utf8'),context);
const S=context.window.SiteSearch,index=S.buildIndex();
const find=(query,lang='en',category='all')=>S.search(index,query,{lang,category,limit:100});
for(const [query,id] of [['Jean Valjean','character:valjean'],['24601','character:valjean'],['זָ׳אן וַלְזָ׳אן','character:valjean'],['Cossette','character:cosette'],['Master of the House','song:master-house'],['On My Own','song:on-my-own'],['I Dreamed a Dream','song:dreamed-dream'],['25th anniversary','event:concert-2010'],['25th anniversary concert','event:concert-2010'],['40th anniversary album','event:album-2026'],['גאלת 40 השנים','event:gala-2025']])for(const lang of ['he','en'])test(`${lang}: exact intent leads to ${id}`,()=>assert.equal(find(query,lang).results[0]?.doc.id,id));
test('Actual event records expose source-derived, localized detail links, not external destinations',()=>{
 for(const event of context.window.EXTRA_CONTENT.specialEvents){const doc=index.find(d=>d.id==='event:'+event.id);assert(doc);for(const lang of ['en','he']){assert(doc.body[lang].includes(event.date[lang]));const href=S.hrefFor(doc,lang);assert.equal(href,`/${lang}/special-events/?focus=event%3A${event.id}`);assert.equal(S.readTarget(new URL(href,'https://example.test').search,'special-events').key,event.id);assert.equal(S.readTarget(new URL(href,'https://example.test').search,'screen'),null);}}
});
test('Bilingual preview shows and highlights the safe language that actually matched',()=>{
 const doc=index.find(d=>d.id==='history:1832');const preview=S.resultPreview(doc,'cholera','he');assert.equal(preview.lang,'en');assert(preview.text.toLowerCase().includes('cholera'));
 const html=S.resultsHTML(find('cholera','he'),'cholera','he');assert(html.includes('התאמה בשפה השנייה'));assert(html.includes('lang="en"'));assert(html.includes('<mark>cholera</mark>'));assert(html.includes('/he/history/'));
});
test('Hebrew niqqud preserves historical results and localized destinations without pinning body-match order',()=>{
 const plain=find('כולרה','he').results.map(({doc})=>doc.id),pointed=find('כּוֹלֵרָה','he').results.map(({doc})=>doc.id);
 assert.deepEqual(pointed,plain);assert(pointed.includes('history:1832'));assert(pointed.includes('context:1'));
 for(const {doc} of find('כּוֹלֵרָה','he').results)assert(S.hrefFor(doc,'he').startsWith('/he/'));
});
test('Part, Book and Chapter coordinate previews keep neutral help in the selected language',()=>{
 for(const lang of ['he','en'])for(const query of ['Part 1','חלק א׳','p1-b1','1.1','Part I Book I','חלק א׳ ספר א׳','Part I Book I Chapter II','חלק א׳ ספר א׳ פרק ב׳']){
  const result=find(query,lang);assert.equal(result.total,1);const doc=result.results[0].doc,preview=S.resultPreview(doc,query,lang);
  assert(['part','book','chapter'].includes(doc.kind));assert.equal(preview.lang,lang);assert.equal(preview.text,doc.body[lang]);assert.equal(preview.alternateTitle,'');
  if(doc.kind==='book')assert(preview.text.includes(lang==='he'?'בחרו פרק לקריאה':'choose a chapter'));
 }
});
test('Alias-only results explain why they matched without inventing a passage',()=>{const html=S.resultsHTML(find('Cossette'),'Cossette','en');assert(html.includes('Also known as'));assert(html.includes('<mark>Cossette</mark>'));assert(html.includes('site-search-breadcrumb'));});
test('Snippets choose a coherent multi-term passage and remain escaped',()=>{
 const html=S.snippet('Paris. '+('An unrelated paragraph. '.repeat(20))+'Paris and mercy meet here. <script>alert(1)</script>', 'Paris mercy');assert(html.includes('<mark>Paris</mark> and <mark>mercy</mark>'));assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));
 assert.equal(S.highlight('cœur Æneas','coeur aeneas'),'<mark>cœur</mark> <mark>Æneas</mark>');assert.equal(S.highlight('קֹ','ק'),'<mark>קֹ</mark>');
});
test('Whole-word title intent outranks coincidental substring hits',()=>{
 const synthetic=S.buildIndex({metadata:{pages:{a:{title:{en:'Art',he:'אמנות'},description:{en:'Art guide',he:'אמנות'}},b:{title:{en:'Starting here',he:'התחלה'},description:{en:'Intro',he:'פתיחה'}}}}});assert.equal(S.search(synthetic,'art',{lang:'en'}).results[0].doc.key,'a');
});
test('Safe search still excludes concealed character details and full chapter summaries',()=>{
 assert.equal(find('9430').total,0);const serialized=JSON.stringify(index);for(const part of [1,2,3,4,5]){for(const chapter of JSON.parse(fs.readFileSync(`dist/reading/part-${part}.json`)).chapters)for(const lang of ['en','he'])assert(!serialized.includes(chapter.summary[lang]));}
 const source=fs.readFileSync('dist/search.js','utf8');assert(!/\b(?:fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|gtag)\s*[.(]/.test(source));
});
test('Unknown query remains honest with sitemap fallback, no invented approximate match',()=>{const result=find('xyzcossetxyz');assert.equal(result.total,0);const html=S.resultsHTML(result,'xyzcossetxyz','en');assert(html.includes('No results'));assert(html.includes('/en/sitemap/'));});

test('Ambiguous fortieth-anniversary query keeps gala and album distinct',()=>{for(const lang of ['en','he']){const ids=find('40th anniversary',lang).results.slice(0,2).map(x=>x.doc.id);assert(ids.includes('event:gala-2025'));assert(ids.includes('event:album-2026'));}});

// Search restores useful reading context, but optional listening help is a
// separate reader choice, including after consent or a focused language change.
for(const lang of ['he','en'])for(const mode of ['journey','spotlight','gated'])test(`${lang}/${mode}: song focus preserves optional pointer state`,()=>{
 const spoiler=mode==='journey',key=mode==='gated'?'bargain':'stars';
 const selector=spoiler?'#show-current-title':mode==='spotlight'?'#spotlight-title':'#musical-journey';
 const makeDetails=(className,initial=false)=>{
  let open=initial,writes=0;
  return {get open(){return open},set open(value){open=value;writes++},get writes(){return writes},matches:selectors=>selectors.split(',').some(s=>s===`.${className}`)};
 };
 const hints=makeDetails('listening-pointers'),nestedHints=makeDetails('listening-pointers'),chosenHints=makeDetails('listening-pointers',true);
 const sourceNotes=makeDetails('reading-sources'),bookStage=makeDetails('book-stage'),ordinaryReading=makeDetails('song-reading');
 const details=[hints,nestedHints,chosenHints,sourceNotes,bookStage,ordinaryReading];
 const readingRoot={querySelectorAll:s=>{assert.equal(s,'details');return details}};
 let focusCalls=0,scrollCalls=0;
 const attributes={};
 const element={
  ...readingRoot,
  closest:s=>{assert.equal(s,'.show-slide,.spotlight-detail');return mode==='gated'?null:readingRoot},
  setAttribute:(name,value)=>{attributes[name]=value},
  focus:options=>{assert.equal(options.preventScroll,true);focusCalls++},
  scrollIntoView:options=>{assert.equal(options.block,'start');scrollCalls++}
 };
 const c={window:{EXTRA_CONTENT:{musical:{spotlight:{songs:[{id:'stars'}]}}},document:{querySelector:s=>{assert.equal(s,selector);return element}}},URLSearchParams};
 vm.createContext(c);vm.runInContext(fs.readFileSync('dist/search.js','utf8'),c);
 const api=c.window.SiteSearch;
 api.mount({lang,spoiler});api.focusTarget({kind:'song',key});
 // A retained song focus is applied again when changing the selected language.
 api.mount({lang:lang==='he'?'en':'he',spoiler});api.focusTarget({kind:'song',key});
 assert.equal(hints.open,false,'Closed song/spotlight hints stay closed');
 assert.equal(nestedHints.open,false,'Nested performance hints stay closed');
 assert.equal(chosenHints.open,true,'Hints explicitly opened by the reader are not closed');
 for(const hint of [hints,nestedHints,chosenHints])assert.equal(hint.writes,0,'Focus must not write optional hint state');
 assert.equal(sourceNotes.open,false,'Existing source disclosure stays optional');
 assert.equal(bookStage.open,false,'Existing book/stage disclosure stays optional');
 assert.equal(ordinaryReading.open,true,'Ordinary reading context still opens');
 assert.equal(attributes.tabindex,'-1');assert.equal(focusCalls,2);assert.equal(scrollCalls,2);
});
