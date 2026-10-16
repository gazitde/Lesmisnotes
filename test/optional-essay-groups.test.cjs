'use strict';
// Real application integration in a deterministic VM; actual browser/layout checks are separate.
const crypto=require('node:crypto'),test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=process.env.LESMIS_SOURCE||path.resolve(__dirname,'..'),code=name=>fs.readFileSync(path.join(root,'dist',name+'.js'),'utf8');
const expose=`window.__completionTest={render,navigate,navigateReader,readingHref,readingHierarchyBody,readerNavigationChapters,chapterSlideNav,moveSlide,readerEssayModeHref,chapterStageLinks,sceneBookLinks,setSpoilers,selectedReading,cache(data){readingPartCache.set(data.part,data)},spoiler:()=>spoiler};})();`;
function boot(language){
 const disk=new Map(),session=new Map(),listeners={},nodes=new Map();let focused='';
 const node=id=>{if(!nodes.has(id))nodes.set(id,{classList:{add(){},remove(){}},focus(){focused=id},setAttribute(){},scrollIntoView(){},querySelectorAll(){return[]},style:{}});return nodes.get(id)};
 const app={innerHTML:'',addEventListener(){}},storage=data=>({getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)});
 const ctx={console,URLSearchParams,localStorage:storage(disk),sessionStorage:storage(session),setTimeout:()=>1,clearTimeout(){},document:{documentElement:{},title:'',addEventListener(){},querySelectorAll:()=>[],getElementById:id=>id==='app'?app:node(id),querySelector:selector=>selector.startsWith('#')?node(selector.slice(1)):{...node(selector),addEventListener(){}}},location:{pathname:`/${language}/novel/`,search:'',hash:'',origin:'https://example.test'},history:{state:null}};
 ctx.history.replaceState=ctx.history.pushState=(state,_,href)=>{const url=new URL(href,ctx.location.origin);Object.assign(ctx.location,{pathname:url.pathname,search:url.search,hash:url.hash});ctx.history.state=state};ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=(name,fn)=>listeners[name]=fn;vm.createContext(ctx);
 for(const name of ['research','extras','character-profiles-data','character-profiles','quiz-engine','seo','policies','privacy','site-config','analytics','places-data','places','recipes-data','recipes','search','chapter-completion','book-stage-data','book-stage'])vm.runInContext(code(name),ctx);
 vm.runInContext(code('app').replace(/\}\)\(\);\s*$/,expose),ctx);
 const api=ctx.__completionTest;for(let part=1;part<=5;part++)api.cache(JSON.parse(fs.readFileSync(path.join(root,`dist/reading/part-${part}.json`),'utf8')));
 return {ctx,api,app,disk,session,listeners,focused:()=>focused};
}

// These fixed baseline signatures guard the unchanged canonical inventory and adaptation mapping.
// An intentional editorial mapping revision should update the signature with its own reviewed evidence.
const groups={'p2-b7':8,'p4-b7':4,'p5-b2':6};
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
  api.navigateReader(`/${language}/novel/?essays=all`);
  const allRendered=[];
  for(const book of ctx.EXTRA_CONTENT.readingLocator.parts.flatMap(p=>p.books)){
   api.navigateReader(api.readingHref('book',book.id));const html=api.readingHierarchyBody(),tags=groupTags(html);
   assert.deepEqual(chapterIds(html),Array.from(catalog.filter(c=>c.bookId===book.id),c=>c.id));
   allRendered.push(...chapterIds(html));
   assert.equal(tags.length,groups[book.id]?1:0,`Only the three selected essay Books are grouped: ${book.id}`);
   if(tags.length){assert.match(tags[0],new RegExp(`data-essay-book="${book.id}"`));assert.equal(hasOpen(tags[0]),true,'Full mode exposes the essay Book');}
   for(const chapter of catalog.filter(c=>c.bookId===book.id)){
    assert.ok(html.includes(`id="reader-chapter-${chapter.id}"`));
    assert.ok(html.includes(chapter.url),'Exact primary chapter URL survives');
   }
  }
  assert.deepEqual(allRendered,Array.from(catalog,c=>c.id));
  let defaultBooks=0,fullBooks=0;
  for(const part of [1,2,3,4,5]){
   api.navigateReader(`/${language}/novel/?focus=part%3Ap${part}`);
   const defaultHtml=api.readingHierarchyBody();
   defaultBooks+=(defaultHtml.match(/class="reader-book-card"/g)||[]).length;
   assert.equal(defaultHtml.includes('reader-essay-badge'),false,'Default Part view omits the essay Books');
   api.navigateReader(`/${language}/novel/?focus=part%3Ap${part}&essays=all`);
   api.navigateReader(api.readingHref('part','p'+part));const html=api.readingHierarchyBody();
   const cards=[...html.matchAll(/<article class="reader-book-card"[\s\S]*?<\/article>/g)].map(m=>m[0]);
   fullBooks+=cards.length;
   for(const card of cards){const id=card.match(/data-reader-book="([^"]+)"/)[1];assert.equal(card.includes('reader-essay-badge'),!!groups[id],`Part card badge is limited to essay Book ${id}`);}
  }
  assert.equal(defaultBooks,45);assert.equal(fullBooks,48);
  api.setSpoilers(true);
  for(const id of linked){api.navigateReader(api.readingHref('chapter',id));const html=api.readingHierarchyBody();assert.equal(groupTags(html).length,0);assert.ok(html.includes(`id="reader-chapter-${id}"`));const chapter=catalog.find(c=>c.id===id);assert.match(api.chapterStageLinks(chapter),/focus=song%3Asewers/);assert.ok(api.sceneBookLinks('sewers').includes('focus=chapter%3A'+id));}
 });
 test(`optional essay exact chapter opening is separate from spoilers (${language})`,()=>{
  const {api,session,focused}=boot(language);
  for(const [book,count] of Object.entries(groups)){
   api.navigateReader(api.readingHref('book',book));const before=JSON.stringify([...session]);
   assert.equal(hasOpen(groupTags(api.readingHierarchyBody())[0]),false);
   for(let n=1;n<=count;n++){
    const id=book+'-c'+n;api.navigateReader(api.readingHref('chapter',id));const html=api.readingHierarchyBody(),tags=groupTags(html);
    assert.equal(tags.length,1);assert.ok(hasOpen(tags[0]),'Exact chapter opens its containing essay group');assert.equal(focused(),'reader-chapter-'+id);
    assert.equal(api.selectedReading().key,id);assert.equal(api.spoiler(),false);assert.equal(JSON.stringify([...session]),before);
    assert.equal(/data-novel-event/.test(html),false);assert.equal(/class="chapter-wide-links"/.test(html),false);
   }
   api.setSpoilers(true);api.navigateReader(api.readingHref('book',book));assert.equal(hasOpen(groupTags(api.readingHierarchyBody())[0]),false,'Spoilers on does not expand a generic Book');
   api.navigateReader(api.readingHref('chapter',book+'-c1'));assert.ok(hasOpen(groupTags(api.readingHierarchyBody())[0]));api.setSpoilers(false);assert.ok(hasOpen(groupTags(api.readingHierarchyBody())[0]),'Hiding wider spoilers preserves the exact chapter request');
  }
 });
 test(`streamlined chapter links and swipes skip only the 18 essay chapters (${language})`,()=>{
  const {ctx,api,app,disk,session}=boot(language),catalog=ctx.EXTRA_CONTENT.chapterCompanion.chapters;
  const streamlined=Array.from(catalog.filter(c=>!groups[c.bookId]));assert.equal(streamlined.length,347);
  assert.match(app.innerHTML,/class="reader-essay-mode"/);
  assert.ok(api.readerEssayModeHref(true).includes('essays=all'));
  for(const full of [false,true]){
   api.navigateReader(`/${language}/novel/`+(full?'?essays=all':''));
   const expected=full?Array.from(catalog):streamlined;
   assert.match(app.innerHTML,new RegExp('<h1>[^]*?'+(full?'365':'347')+'[^]*?</h1>'),'First screen names the current route size');
   assert.match(app.innerHTML,new RegExp('id="reading-along-title">[^<]*'+(full?'365':'347')),'Reader heading matches mode');
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
    const first=catalog.findIndex(c=>c.bookId===book),last=catalog.findLastIndex(c=>c.bookId===book),before=catalog[first-1],after=catalog[last+1];
    for(const [from,step,to] of [[before,'next',full?catalog[first]:after],[after,'prev',full?catalog[last]:before]]){
     api.navigateReader(`/${language}/novel/?focus=chapter%3A${from.id}`+(full?'&essays=all':''));
     api.moveSlide({dataset:{slideSurface:'chapter',chapterId:from.id}},step);
     assert.equal(api.selectedReading().key,to.id);assert.equal(new URLSearchParams(ctx.location.search).get('essays'),full?'all':null);
    }
   }
  }
  api.navigateReader(`/${language}/novel/?focus=chapter%3Ap2-b7-c1`);
  assert.equal(api.readerNavigationChapters(catalog.find(c=>c.id==='p2-b7-c1')).length,365,'Explicit essay chapter remains readable in canonical sequence');
  api.moveSlide({dataset:{slideSurface:'chapter',chapterId:'p2-b7-c1'}},'next');assert.equal(api.selectedReading().key,'p2-b7-c2');
  assert.equal(api.spoiler(),false);assert.equal(session.get('barricade-spoilers'),undefined);assert.equal(disk.size,0,'Mode preference is URL-only');
 });

}
