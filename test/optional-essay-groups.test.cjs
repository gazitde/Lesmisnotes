'use strict';
// Real application integration in a deterministic VM; actual browser/layout checks are separate.
const crypto=require('node:crypto'),test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=process.env.LESMIS_SOURCE||path.resolve(__dirname,'..'),code=name=>fs.readFileSync(path.join(root,'dist',name+'.js'),'utf8');
const expose=`window.__completionTest={render,navigate,navigateReader,readingHref,readingHierarchyBody,isReaderEssayChapter,readerNavigationChapters,chapterSlideNav,moveSlide,readerEssayModeHref,chapterStageLinks,sceneBookLinks,setSpoilers,selectedReading,cache(data){readingPartCache.set(data.part,data)},spoiler:()=>spoiler};})();`;
function boot(language){
 const disk=new Map(),session=new Map(),listeners={},nodes=new Map();let focused='';
 const node=id=>{if(!nodes.has(id))nodes.set(id,{classList:{add(){},remove(){}},focus(){focused=id},setAttribute(){},scrollIntoView(){},querySelectorAll(){return[]},style:{}});return nodes.get(id)};
 const app={innerHTML:'',addEventListener(){}},storage=data=>({getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)});
 const ctx={console,URLSearchParams,localStorage:storage(disk),sessionStorage:storage(session),setTimeout:()=>1,clearTimeout(){},document:{documentElement:{},title:'',addEventListener(){},querySelectorAll:()=>[],getElementById:id=>id==='app'?app:node(id),querySelector:selector=>selector.startsWith('#')?node(selector.slice(1)):{...node(selector),addEventListener(){}}},location:{pathname:`/${language}/novel-journey/`,search:'',hash:'',origin:'https://example.test'},history:{state:null}};
 ctx.history.replaceState=ctx.history.pushState=(state,_,href)=>{const url=new URL(href,ctx.location.origin);Object.assign(ctx.location,{pathname:url.pathname,search:url.search,hash:url.hash});ctx.history.state=state};ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=(name,fn)=>listeners[name]=fn;vm.createContext(ctx);
 for(const name of ['research','extras','character-profiles-data','character-profiles','quiz-engine','seo','policies','privacy','site-config','analytics','places-data','places','recipes-data','recipes','search','chapter-completion','book-stage-data','book-stage'])vm.runInContext(code(name),ctx);
 vm.runInContext(code('app').replace(/\}\)\(\);\s*$/,expose),ctx);
 const api=ctx.__completionTest;for(let part=1;part<=5;part++)api.cache(JSON.parse(fs.readFileSync(path.join(root,`dist/reading/part-${part}.json`),'utf8')));
 return {ctx,api,app,disk,session,listeners,focused:()=>focused};
}

// These fixed baseline signatures guard the unchanged canonical inventory and adaptation mapping.
// An intentional editorial mapping revision should update the signature with its own reviewed evidence.
const wholeBooks={'p2-b7':8,'p4-b7':4,'p5-b2':6};
const groups={...wholeBooks,'p3-b1':12,'p3-b7':2};
const optionalIds=new Set(Object.entries(groups).flatMap(([book,count])=>Array.from({length:count},(_,i)=>book+'-c'+(i+1))));
const linked=['p5-b3-c1','p5-b3-c4','p5-b3-c6','p5-b3-c7','p5-b3-c8','p2-b1-c19'];
const signature=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const groupTags=html=>[...html.matchAll(/<details\b[^>]*class="[^"]*\breader-essay-chapters\b[^"]*"[^>]*>/g)].map(m=>m[0]);
const hasOpen=tag=>/\sopen(?:\s|=|>)/.test(tag);
const chapterIds=html=>[...html.matchAll(/data-chapter-id="([^"]+)"/g)].map(m=>m[1]);
for(const language of ['he','en']){
 test(`optional essay inventory and unchanged source/musical coordinates (${language})`,()=>{
  const {ctx,api}=boot(language),catalog=ctx.EXTRA_CONTENT.chapterCompanion.chapters;
  assert.equal(catalog.length,365);assert.equal(new Set(catalog.map(c=>c.id)).size,365);
  assert.equal(signature(catalog.map(({id,ordinal,url})=>({id,ordinal,url}))),'c749c5f13d91b6ad1fdf12640e047c786f6126fec9826bee1c899c89fd974ca2');
  assert.equal(signature(ctx.BOOK_STAGE_DATA.scenes.map(({songId,relations})=>({songId,relations}))),'82386476d712452d31569318437f471c7ec68af864d858f05eda201976411cf6');
  api.navigateReader(`/${language}/novel-journey/?essays=all`);
  const allRendered=[];
  for(const book of ctx.EXTRA_CONTENT.readingLocator.parts.flatMap(p=>p.books)){
   api.navigateReader(api.readingHref('book',book.id));const html=api.readingHierarchyBody(),tags=groupTags(html);
   assert.deepEqual(chapterIds(html),Array.from(catalog.filter(c=>c.bookId===book.id),c=>c.id));
   allRendered.push(...chapterIds(html));
   assert.equal(tags.length,groups[book.id]?1:0,`Only the five selected essay blocks are grouped: ${book.id}`);
   if(tags.length){assert.match(tags[0],new RegExp(`data-essay-book="${book.id}"`));assert.equal(hasOpen(tags[0]),true,'Full mode exposes the essay Book');}
   if(tags.length){
    const context=html.match(/<p class="reader-essay-context">[^]*?<\/p>/)?.[0]||'';
    const groupIntro=html.slice(html.indexOf(tags[0]),html.indexOf(context)+context.length);
    if(book.id==='p3-b7'){
     assert.ok(context.includes(language==='he'?'בחירה עריכתית':'an editorial choice'),'III.VII1–2 is explicitly identified as an editorial selection');
     assert.ok(groupIntro.includes(language==='he'?'הרחבת רקע לבחירה':'Optional background'),'III.VII has an optional-background summary');
     assert.equal(/omitted|abridgments|הושמט|השמטה|מהדורות מקוצרות/i.test(groupIntro),false,'III.VII must not claim verified abridgment omission');
     assert.equal(html.includes('reader-essay-sources'),false,'Editorial selection has no misleading abridgment source panel');
     assert.equal(html.includes('https://www.loc.gov/item/15015099/'),false);assert.equal(html.includes('https://benyehuda.org/collections/9966'),false);
    }else{
     assert.ok(groupIntro.includes(language==='he'?'הושמטה בכמה מהדורות מקוצרות':'Omitted in some abridged editions'),'Other four groups retain evidence-backed omission label');
     assert.ok(context.includes(language==='he'?'שתי מהדורות מקוצרות שנבדקו':'two checked abridgments'),'Omission claim remains bounded to the checked editions');
     assert.ok(html.includes('https://www.loc.gov/item/15015099/'),'Verified English edition source remains');assert.ok(html.includes('https://benyehuda.org/collections/9966'),'Verified Hebrew edition source remains');
    }
   }
   for(const chapter of catalog.filter(c=>c.bookId===book.id)){
    assert.ok(html.includes(`id="reader-chapter-${chapter.id}"`));
    assert.ok(html.includes(chapter.url),'Exact primary chapter URL survives');
   }
  }
  assert.deepEqual(allRendered,Array.from(catalog,c=>c.id));
  let defaultBooks=0,fullBooks=0;
  for(const part of [1,2,3,4,5]){
   api.navigateReader(`/${language}/novel-journey/?focus=part%3Ap${part}`);
   const defaultHtml=api.readingHierarchyBody();
   defaultBooks+=(defaultHtml.match(/class="reader-book-card"/g)||[]).length;
   assert.equal(defaultHtml.includes('reader-essay-badge'),false,'Default Part view omits the essay Books');
   api.navigateReader(`/${language}/novel-journey/?focus=part%3Ap${part}&essays=all`);
   api.navigateReader(api.readingHref('part','p'+part));const html=api.readingHierarchyBody();
   const cards=[...html.matchAll(/<article class="reader-book-card"[\s\S]*?<\/article>/g)].map(m=>m[0]);
   fullBooks+=cards.length;
   for(const card of cards){const id=card.match(/data-reader-book="([^"]+)"/)[1];assert.equal(card.includes('reader-essay-badge'),!!wholeBooks[id],`Part card badge is limited to essay Book ${id}`);}
  }
  assert.equal(defaultBooks,45);assert.equal(fullBooks,48);
  api.setSpoilers(true);
  for(const id of linked){api.navigateReader(api.readingHref('chapter',id));const html=api.readingHierarchyBody();assert.equal(groupTags(html).length,0);assert.ok(html.includes(`id="reader-chapter-${id}"`));const chapter=catalog.find(c=>c.id===id);assert.match(api.chapterStageLinks(chapter),/focus=song%3Asewers/);assert.ok(api.sceneBookLinks('sewers').includes('focus=chapter%3A'+id));}
 });
 test(`optional essay exact chapter opening is separate from spoilers (${language})`,()=>{
  const {api,session,focused}=boot(language);
  for(const [book,count] of Object.entries(groups)){
   api.navigateReader(api.readingHref('book',book));const before=JSON.stringify([...session]);
   if(wholeBooks[book])assert.equal(hasOpen(groupTags(api.readingHierarchyBody())[0]),false);else assert.equal(groupTags(api.readingHierarchyBody()).length,0,'Default partial Book has no optional chapter group');
   for(let n=1;n<=count;n++){
    const id=book+'-c'+n;api.navigateReader(api.readingHref('chapter',id));const html=api.readingHierarchyBody(),tags=groupTags(html);
    assert.equal(tags.length,0);assert.ok(html.includes('reader-focused-essay'),'Exact chapter labels its essay context without exposing other chapters');assert.deepEqual(chapterIds(html),[id]);assert.equal(focused(),'reader-chapter-'+id);
    assert.equal(api.selectedReading().key,id);assert.equal(api.spoiler(),false);assert.equal(JSON.stringify([...session]),before);
    assert.equal(/data-novel-event/.test(html),false);assert.equal(/class="chapter-wide-links"/.test(html),false);
   }
   api.setSpoilers(true);api.navigateReader(api.readingHref('book',book));if(wholeBooks[book])assert.equal(hasOpen(groupTags(api.readingHierarchyBody())[0]),false,'Spoilers on does not expand a generic Book');else assert.equal(groupTags(api.readingHierarchyBody()).length,0,'Spoilers do not reinsert omitted partial chapters');
   api.navigateReader(api.readingHref('chapter',book+'-c1'));assert.ok(api.readingHierarchyBody().includes('reader-focused-essay'));api.setSpoilers(false);assert.deepEqual(chapterIds(api.readingHierarchyBody()),[book+'-c1'],'Hiding wider spoilers preserves the exact chapter request');
  }
 });
 test(`partial essay Books retain narrative chapters and spoiler-safe bridge (${language})`,()=>{
  const {ctx,api,session}=boot(language),catalog=ctx.EXTRA_CONTENT.chapterCompanion.chapters;
  for(const [book,kept] of [['p3-b1',['p3-b1-c13']],['p3-b7',['p3-b7-c3','p3-b7-c4']]]){
   api.navigateReader(`/${language}/novel-journey/?focus=book%3A${book}`);let html=api.readingHierarchyBody();
   assert.deepEqual(chapterIds(html),kept);assert.equal(groupTags(html).length,0);
   const select=html.match(/<select id="reading-chapter"[^]*?<\/select>/)[0];
   assert.deepEqual([...select.matchAll(/<option value="([^"]+)"/g)].map(m=>m[1]),kept,'Default dropdown excludes optional chapters too');
   const bridge=html.match(/<p class="reader-essay-bridge"[^>]*>[^]*?<\/p>/)?.[0];
   assert.ok(bridge);assert.match(bridge,new RegExp(`data-before-chapter="${kept[0]}"`));
   assert.ok(html.indexOf(bridge)<html.indexOf(`id="reader-chapter-${kept[0]}"`),'Brief bridge precedes retained narrative');
   assert.ok(bridge.length<600,'Bridge remains a short orientation');assert.equal(/<a |data-insight-link|data-novel-event/.test(bridge),false);
   for(const id of kept){api.navigateReader(api.readingHref('chapter',id));assert.deepEqual(chapterIds(api.readingHierarchyBody()),[id]);assert.equal(groupTags(api.readingHierarchyBody()).length,0);}
   const target=book+'-c'+groups[book];api.navigateReader(`/${language}/novel-journey/?focus=chapter%3A${target}`);
   html=api.readingHierarchyBody();assert.equal(groupTags(html).length,0);assert.ok(html.includes('reader-focused-essay'));
   assert.deepEqual(chapterIds(html),[target],'Direct optional target shows only the requested chapter');
   api.navigateReader(api.readerEssayModeHref(true));assert.equal(new URLSearchParams(ctx.location.search).get('essays'),'all');
   assert.equal(api.readingHierarchyBody().includes('reader-essay-bridge'),false,'Full text needs no skipped-section bridge');
   api.navigateReader(api.readerEssayModeHref(false));assert.equal(api.selectedReading().kind,'book');assert.equal(api.selectedReading().key,book);assert.deepEqual(chapterIds(api.readingHierarchyBody()),kept);
   assert.equal(session.get('barricade-spoilers'),undefined);assert.equal(api.spoiler(),false);
  }
 });
 test(`streamlined chapter links and swipes skip only the 32 essay chapters (${language})`,()=>{
  const {ctx,api,app,disk,session}=boot(language),catalog=ctx.EXTRA_CONTENT.chapterCompanion.chapters;
  const streamlined=Array.from(catalog.filter(c=>!optionalIds.has(c.id)));assert.equal(streamlined.length,333);
  assert.equal(optionalIds.size,32);
  assert.deepEqual(Array.from(catalog.filter(c=>api.isReaderEssayChapter(c)),c=>c.id),Array.from(catalog.filter(c=>optionalIds.has(c.id)),c=>c.id),'Exact authorized optional scope, no other chapter');
  assert.match(app.innerHTML,/class="reader-essay-mode"/);
  assert.ok(api.readerEssayModeHref(true).includes('essays=all'));
  for(const full of [false,true]){
   api.navigateReader(`/${language}/novel-journey/`+(full?'?essays=all':''));
   const expected=full?Array.from(catalog):streamlined;
   assert.match(app.innerHTML,language==='he'?/מלווה קריאה/:/reading companion/i,'Dedicated page identifies itself as a companion');
   assert.match(app.innerHTML,/id="reading-along-title"/,'Reader heading remains accessible');
   assert.ok(app.innerHTML.includes(language==='he'?'פרקי הרומן המלא':'chapters in the full novel'),'Progress clearly measures the complete novel');
   assert.deepEqual(Array.from(api.readerNavigationChapters(catalog[0]),c=>c.id),expected.map(c=>c.id));
   for(let i=0;i<expected.length;i++){
    const html=api.chapterSlideNav(expected[i]);
    for(const [step,target] of [['prev',expected[i-1]],['next',expected[i+1]]]){
     const anchor=html.match(new RegExp(`<a class="slide-${step}"[^>]*href="([^"]+)"`));
     if(!target){assert.equal(anchor,null);continue;}
     assert.ok(anchor,`${step} link for ${expected[i].id}`);
     const query=new URL(anchor[1].replaceAll('&amp;','&'),ctx.location.origin).searchParams;
     assert.equal(query.get('focus'),'chapter:'+target.id);assert.equal(query.get('essays'),full?'all':null);
    }
   }
   for(const book of Object.keys(groups)){
    const first=catalog.findIndex(c=>c.bookId===book),last=first+groups[book]-1,before=catalog[first-1],after=catalog[last+1];
    for(const [from,step,to] of [[before,'next',full?catalog[first]:after],[after,'prev',full?catalog[last]:before]]){
     api.navigateReader(`/${language}/novel-journey/?focus=chapter%3A${from.id}`+(full?'&essays=all':''));
     api.moveSlide({dataset:{slideSurface:'chapter',chapterId:from.id}},step);
     assert.equal(api.selectedReading().key,to.id);assert.equal(new URLSearchParams(ctx.location.search).get('essays'),full?'all':null);
    }
   }
  }
  api.navigateReader(`/${language}/novel-journey/?focus=chapter%3Ap2-b7-c1`);
  assert.equal(api.readerNavigationChapters(catalog.find(c=>c.id==='p2-b7-c1')).length,365,'Explicit essay chapter remains readable in canonical sequence');
  api.moveSlide({dataset:{slideSurface:'chapter',chapterId:'p2-b7-c1'}},'next');assert.equal(api.selectedReading().key,'p2-b7-c2');
  assert.equal(api.spoiler(),false);assert.equal(session.get('barricade-spoilers'),undefined);assert.equal(disk.size,0,'Mode preference is URL-only');
 });

}
