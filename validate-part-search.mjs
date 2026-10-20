import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const c={window:{},URLSearchParams};vm.createContext(c);
for(const name of ['research','extras','places-data','recipes-data','seo'])vm.runInContext(fs.readFileSync(`dist/${name}.js`,'utf8'),c);
vm.runInContext(fs.readFileSync(process.env.SEARCH_ENGINE_PATH||'dist/search.js','utf8'),c);
const W=c.window,S=W.SiteSearch,input={research:W.RESEARCH,extra:W.EXTRA_CONTENT,places:W.PLACE_CONTENT,recipes:W.RECIPE_CONTENT,metadata:W.SITE_METADATA};
const safe=S.buildIndex(input),full=S.buildIndex(input,{spoiler:true,novelConsent:true,afterConsent:true});let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++};
const roman=['I','II','III','IV','V'],he=['א','ב','ג','ד','ה'];
check(safe.filter(x=>x.kind==='part').length===5,'Five safe Part metadata records');
for(let n=1;n<=5;n++)for(const lang of ['he','en'])for(const query of [`Part ${n}`,`part${n}`,`Part 0${n}`,`Part ${roman[n-1]}`,`חלק ${n}`,`חלק${n}`,`חלק ${he[n-1]}׳`,`חֵלֶק ${he[n-1]}`,'p'+n]){
 for(const index of [safe,full]){const r=S.search(index,query,{lang,limit:12});check(r.total===1&&r.results[0].doc.id===`part:p${n}`,'One exact result '+query);check(r.results[0].href===`/${lang}/novel-journey/?focus=part%3Ap${n}`,'Exact localized existing route');check(S.readTarget(new URL(r.results[0].href,'https://example.test').search,'novel').key==='p'+n,'Existing reader target contract');}
}
for(const query of ['Part 0','Part 6','Part VI','Part 999999999999999999','חלק 0','חלק 6','חלק ו׳','p0','p6','part -1','Part 5 extra','p5<script>'])check(S.search(safe,query).total===0,'Malformed or out-of-range Part fails closed: '+query);
check(S.search(safe,'Part 5',{category:'songs'}).total===0,'Part respects topic filter');check(S.search(safe,'Part V',{category:'story'}).total===1,'Part is in story category');check(S.search(safe,'Part 5',{limit:0}).results.length===0,'Part respects zero result limit');
for(const query of ['1.1.2','part 1 book 1 chapter 2','חלק 1 ספר 1 פרק 2','p1-b1-c2'])check(S.search(safe,query).results[0]?.doc.id==='chapter:p1-b1-c2','Exact chapter handling unchanged');
for(const query of ['1.1.999','p1-b1-c999','Part 1 Book 1 Chapter 999'])check(S.search(safe,query).total===0,'Invalid chapter handling unchanged');
const altered=structuredClone(input);for(const p of altered.extra.readingLocator.parts){p.overviewParagraphs=[{he:'סודסקירתהחלק',en:'HIDDENPARTOVERVIEW'}];p.sourceRefs=[{from:'https://example.test/HIDDENPARTURL'}];}
const probe=S.buildIndex(altered);for(const token of ['סודסקירתהחלק','HIDDENPARTOVERVIEW','HIDDENPARTURL']){check(!JSON.stringify(probe).includes(token),'Part overview/source payload is absent');check(S.search(probe,token).total===0,'Hidden payload cannot influence matching');}
for(const query of ['pi','piv','חלקה'])check(!S.search(safe,query).results.some(x=>x.doc.kind==='part'),'Ordinary words are not hijacked as Part shorthand');
check(S.search(safe,'24601').results[0]?.doc.id==='character:valjean','Existing prisoner-number alias preserved');
console.log(`Part search: ${checks} checks passed; five precise HE/EN Part destinations, Roman/letter forms, safe metadata, invalid input, filters and existing chapter coordinates.`);
