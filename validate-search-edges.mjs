// Run from the repository root; set SEARCH_ENGINE_PATH for an isolated candidate.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const ctx={window:{},URLSearchParams};vm.createContext(ctx);
for(const name of ['research','extras','character-profiles-data','character-profiles','places-data','recipes-data','seo'])vm.runInContext(fs.readFileSync(`dist/${name}.js`,'utf8'),ctx);
vm.runInContext(fs.readFileSync(process.env.SEARCH_ENGINE_PATH||'dist/search.js','utf8'),ctx);
const W=ctx.window,S=W.SiteSearch,source={research:W.RESEARCH,extra:W.EXTRA_CONTENT,places:W.PLACE_CONTENT,recipes:W.RECIPE_CONTENT,metadata:W.SITE_METADATA};
const safe=S.buildIndex(source),general=S.buildIndex(source,{spoiler:true}),full=S.buildIndex(source,{spoiler:true,novelConsent:true,afterConsent:true});
let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++};
const result=(q,lang='en',index=safe,category='all',limit=1000)=>S.search(index,q,{lang,category,limit});
const ids=(q,lang='en',index=safe)=>result(q,lang,index).results.map(x=>x.doc.id);
const romans=['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV'];
const hebrew=['','א','ב','ג','ד','ה','ו','ז','ח','ט','י','יא','יב','יג','יד','טו','טז','יז','יח','יט','כ','כא','כב','כג','כד'];
const marked=n=>hebrew[n].length===1?hebrew[n]+'׳':hebrew[n].slice(0,-1)+'״'+hebrew[n].slice(-1);
function exact(q,kind,key){for(const lang of ['en','he'])for(const index of [safe,general,full]){const r=result(q,lang,index);check(r.total===1&&r.results[0].doc.id===kind+':'+key,'One exact coordinate '+q+' '+lang);check(r.results[0].href===`/${lang}/novel/?focus=${encodeURIComponent(kind+':'+key)}`,'Localized exact reader route '+q);check(S.readTarget(new URL(r.results[0].href,'https://example.test').search,'novel')?.key===key,'Existing route contract '+q);}}
for(const p of W.EXTRA_CONTENT.readingLocator.parts){
 for(const q of ['p'+p.part,'Part '+p.part,'Part '+romans[p.part],'חלק '+marked(p.part)])exact(q,'part','p'+p.part);
 for(const b of p.books){
  for(const q of [b.id,`${b.part}.${b.book}`,`part ${b.part} book ${b.book}`,`חלק ${b.part} ספר ${b.book}`,`Part ${romans[b.part]}, Book ${romans[b.book]}`,`חלק ${marked(b.part)}, ספר ${marked(b.book)}`,`חלק ${hebrew[b.part]} ספר ${hebrew[b.book]}`,`PART 0${b.part} · BOOK 0${b.book}`])exact(q,'book',b.id);
  for(const index of [safe,general,full])for(const lang of ['en','he']){
   const doc=index.find(d=>d.id==='book:'+b.id);check(doc.title[lang]===b.label[lang],'Neutral Book title preserved');
   check(!doc.body[lang].includes(b.prompt[lang]),'Before-this-Book prompts excluded from global search in every permission partition');
  }
 }
}
for(const c of W.EXTRA_CONTENT.chapterCompanion.chapters){
 for(const q of [c.id,`${c.part}.${c.book}.${c.chapter}`,`part ${c.part} book ${c.book} chapter ${c.chapter}`,`חלק ${c.part} ספר ${c.book} פרק ${c.chapter}`,`Part ${romans[c.part]}, Book ${romans[c.book]}, Chapter ${romans[c.chapter]}`,`חלק ${marked(c.part)}, ספר ${marked(c.book)}, פרק ${marked(c.chapter)}`,`חלק ${hebrew[c.part]} ספר ${hebrew[c.book]} פרק ${hebrew[c.chapter]}`])exact(q,'chapter',c.id);
}
for(const q of [' p1 - b1 ',' 1 . 1 ','Part Ⅰ Book Ⅱ','חֵלֶק א׳ סֵפֶר ב׳','Part 1 Book II','חלק 1 ספר ב׳'])exact(q,'book',q.includes('b1')||q.includes('1 . 1')?'p1-b1':'p1-b2');
for(const q of ['Part Ⅰ Book Ⅰ Chapter Ⅱ','חֵלֶק א׳ סֵפֶר א׳ פֶּרֶק ב׳','Part 1 Book I Chapter 2'])exact(q,'chapter','p1-b1-c2');
for(const q of ['0.1','6.1','1.9','p0-b1','p1-b0','p1-b9','Part 1 Book 9','Part VI Book I','Part IIII Book I','Part I Book IIII','Part I Book IIV','חלק ו׳ ספר א׳','חלק א׳ ספר ט׳','חלק א׳ ספר א׳׳','חלק א׳ ספר יאא','Part 1 Book -1','Part 1 Book 1 extra','p1-b1<script>','1.1.1.1','1.1.15','Part I Book I Chapter XV','Part I Book I Chapter IIII','חלק א׳ ספר א׳ פרק ט״ו','5.6.1832','1832.6.5','9999999999999999999999.1','Part 1 Book 1 Chapter one'])for(const lang of ['en','he'])check(result(q,lang).total===0,'Malformed/out-of-range coordinate fails closed '+q);
for(const q of ['1.1','p1-b1','Part I Book I','חלק א׳ ספר א׳','Part I Book I Chapter II']){check(result(q,'en',safe,'songs').total===0,'Coordinate respects category');check(result(q,'en',safe,'story').total===1,'Coordinate in story category');check(result(q,'en',safe,'all',0).results.length===0,'Coordinate respects zero limit');check(S.search([],q).total===0,'No invented destination without indexed record');}
for(const [q,id]of [['June 5','history:1832'],['5 June','history:1832'],['5–6 June 1832','history:1832'],['5-6 June 1832','history:1832'],['5 ביוני','history:1832'],['June 18','history:1815'],['18 June 1815','history:1815'],['1814–1830','history:1814'],['1832','history:1832'],['2012','adaptation:compare-2012'],['24601','character:valjean']])for(const lang of ['en','he'])check(result(q,lang).results[0]?.doc.id===id,'Date/number first result '+q+' '+lang);
for(const q of ['June 5','5 June','5–6 June 1832'])check(result(q).total===1,'Days do not match interior digits in other years');
check(S.highlight('1815 1885 2025 5 5th 15.5','5')==='1815 1885 2025 <mark>5</mark> <mark>5</mark>th 15.<mark>5</mark>','Numeric highlighting obeys same boundaries');
check(S.highlight('1814–1830','1814 1830')==='<mark>1814</mark>–<mark>1830</mark>','Date range highlighting preserved');
for(const lang of ['en','he']){const r=result('5 June',lang);check(r.results[0].href===`/${lang}/history/?focus=history%3A1832`,'Correct dated event anchor');check(!S.resultsHTML(r,'5 June',lang).includes('history%3A1815'),'No misleading Waterloo result');}
for(const [id,queries]of [['valjean',['Jean-Valjean','Jean–Valjean','Jean Valjean',"ז'אן ולז'אן",'זָ׳אן וַלְזָ׳אן']],['bishop',['Charles-François-Bienvenu Myriel','Charles François Bienvenu Myriel','שארל-פרנסואה-ביאנוונו מיריאל']],['eponine',['Éponine','Éponine','EPONINE','אפונין']],['thenardiers',['Monsieur Thenardier','Madame Thénardier','טנארדייה','תנרדייה']],['marius',['Marius Pontmercy','מריוס פונמרסי']],['cosette',['Cossette','Cosset','קוסט']]])for(const q of queries)for(const lang of ['en','he']){const r=result(q,lang);check(r.results[0]?.doc.id==='character:'+id,'Reviewed name punctuation/alias '+q);check(r.results[0].href===`/${lang}/character-${id}/`,'Actual profile destination '+q);}
for(const q of ['Javert’s Soliloquy',"Javert's Soliloquy",'Javert‘s Soliloquy'])check(result(q).results[0]?.doc.id==='song:javert-soliloquy','Apostrophe song alias '+q);
// Real leaks: these only matched context-specific Book prompts before the fix.
for(const q of ['Marius alive','Marius rescue','ז׳אבר שבוי','marriage arrangements'])check(result(q).total===0,'No spoiler-off Book outcome match/count '+q);
for(const q of ['Javert prisoner','Javert release'])check(!ids(q).some(id=>id.startsWith('book:')),'No spoiler-off Book outcome result '+q);
// Mutate protected source fields. A byte-identical safe index proves no effect on
// titles, snippets, totals or ranking, including actual profile modules.
const probe=structuredClone(source);const pair={en:'HIDDENEDGEDETAIL',he:'סודפרטמוסתר'};
const R={...probe.research,...probe.extra};
for(const p of R.characterProfiles.profiles){p.paragraphs=[pair,pair];p.novelAdds={title:pair,paragraphs:[{text:pair}]};p.readerIdentity=pair;p.firstAppearance={chapterId:'HIDDENEDGEDETAIL',url:'https://example.test/HIDDENEDGEDETAIL'};}
for(const p of R.readingLocator.parts){p.overviewParagraphs=[pair];for(const b of p.books){b.prompt=pair;b.overviewParagraphs=[pair];b.sourceRefs=[{from:'https://example.test/HIDDENEDGEDETAIL'}];}}
for(const c of R.chapterCompanion.chapters){c.title=pair;c.summary=pair;c.url='https://example.test/HIDDENEDGEDETAIL';}
for(const c of R.characters){c.summary=pair;c.question=pair;c.context={sentences:pair};c.canonNotes=[{title:pair,paragraphs:[pair]}];c.connections=[{label:pair}];}
for(const s of R.musical.spotlight.songs){s.plot=pair;s.connection=pair;}
for(const s of R.musical.songentries){for(const k of ['scene','summary','characters','mood','question'])s[k]=pair;if(!R.musical.spotlight.songs.some(x=>x.id===s.id)){s.title=pair;s.catalogueTitle=pair;}}
for(const a of Object.values(R.musical.songAnalysis)){for(const b of a.blocks||[])if(b.spoilerLevel>=2){b.title=pair;b.body=pair;}for(const b of a.craftNotes||[]){b.title=pair;b.body=pair;}}
for(const s of R.novel.milestones){s.title=pair;s.summary=pair;s.details=pair;s.remember=pair;}
for(const s of probe.places.places)s.novel=pair;
for(const s of R.map.places){s.storyRole=pair;s.journey={event:pair,remember:pair};if(s.context?.spoilerLevel!==0)s.context={spoilerLevel:2,sentences:pair};}
for(const s of R.philosophy.dilemmas)s.deepening={title:pair,paragraphs:[pair]};
const protectedIndex=S.buildIndex(probe);
check(JSON.stringify(protectedIndex)===JSON.stringify(safe),'Protected fields cannot alter any spoiler-off record, title, body, alias or search data');
for(const q of ['HIDDENEDGEDETAIL','סודפרטמוסתר']){check(result(q,'en',protectedIndex).total===0,'No hidden canary counts');check(!JSON.stringify(protectedIndex).includes(q),'No hidden canary snippets or titles');}
for(const [q,kind,route] of [['1885','author','hugo'],['cholera','context','history']]){const row=result(q).results.find(x=>x.doc.kind===kind);check(Boolean(row),'Dated/context search result exists');for(const lang of ['en','he']){const href=S.hrefFor(row.doc,lang);check(href===`/${lang}/${route}/?focus=${encodeURIComponent(row.doc.id)}`,'Precise author/context destination');check(S.readTarget(new URL(href,'https://example.test').search,route)?.key===row.doc.key,'Author/context route contract');}}
console.log(`Search edge audit: ${checks} checks passed; 48 exact Books, 365 exact Chapters in numeric/Roman/Hebrew forms, number boundaries, actual profile aliases, neutral Book text and protected-field invariance.`);
