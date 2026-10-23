'use strict';
// Real application integration in a deterministic VM; actual browser/layout checks are separate.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=process.env.LESMIS_SOURCE||path.resolve(__dirname,'..'),code=name=>fs.readFileSync(path.join(root,'dist',name+'.js'),'utf8');
const expose=`window.__completionTest={render,navigate,navigateReader,readingHref,readingHierarchyBody,readerOverview,focusMusicalSection,musicalPage,setSpoilers,selectedReading,cache(data){readingPartCache.set(data.part,data)},spoiler:()=>spoiler};})();`;
function boot(language){
 const disk=new Map(),session=new Map(),listeners={},nodes=new Map();let focused='';
 const node=id=>{if(!nodes.has(id))nodes.set(id,{classList:{add(){},remove(){}},focus(){focused=id},setAttribute(){},scrollIntoView(){},querySelectorAll(){return[]},style:{}});return nodes.get(id)};
 const app={innerHTML:'',addEventListener(){}},storage=data=>({getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)});
 const ctx={console,URLSearchParams,localStorage:storage(disk),sessionStorage:storage(session),setTimeout:()=>1,clearTimeout(){},document:{documentElement:{},title:'',addEventListener(){},querySelectorAll:()=>[],getElementById:id=>id==='app'?app:node(id),querySelector:selector=>selector.startsWith('#')?node(selector.slice(1)):{...node(selector),addEventListener(){}}},location:{pathname:`/${language}/novel/`,search:'',hash:'',origin:'https://example.test'},history:{state:null}};
 ctx.history.replaceState=ctx.history.pushState=(state,_,href)=>{const url=new URL(href,ctx.location.origin);Object.assign(ctx.location,{pathname:url.pathname,search:url.search,hash:url.hash});ctx.history.state=state};ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=(name,fn)=>listeners[name]=fn;vm.createContext(ctx);
 for(const name of ['research','extras','character-profiles-data','character-profiles','quiz-engine','seo','policies','privacy','site-config','analytics','places-data','places','recipes-data','recipes','search','chapter-completion','book-stage-data','book-stage'])vm.runInContext(code(name),ctx);
 vm.runInContext(code('app').replace(/\}\)\(\);\s*$/,expose),ctx);
 const api=ctx.__completionTest;api.cache(JSON.parse(fs.readFileSync(path.join(root,'dist/reading/part-1.json'),'utf8')));
 return {ctx,api,app,disk,session,listeners,focused:()=>focused};
}


for(const language of ['he','en'])test(`long-page choices preserve content and spoiler boundaries (${language})`,()=>{
 const {ctx,api,app}=boot(language),parts=ctx.EXTRA_CONTENT.readingLocator.parts;
 const rootHtml=api.readingHierarchyBody();
 assert.equal((rootHtml.match(/class="reader-overview-disclosure" data-overview-spoilers /g)||[]).length,5);
 assert.ok(!rootHtml.includes('data-overview-spoilers open'));
 api.navigateReader(`/${language}/novel/?essays=all`);
 for(const part of parts){
  const html=api.readerOverview(part,'part');assert.equal((html.match(/<details/g)||[]).length,1,'Overview sources do not add a nested disclosure');
  assert.ok(!html.includes(part.overviewParagraphs[0][language]),'Full overview is absent before explicit choice');
  api.navigateReader(api.readingHref('part','p'+part.part));const section=api.readingHierarchyBody();
  assert.equal((section.match(/data-overview-spoilers/g)||[]).length,part.books.length);
  for(const book of part.books){const card=section.split('data-reader-book="'+book.id+'"')[1].split('</article>')[0];assert.ok(card.indexOf('data-reader-link')<card.indexOf('data-overview-spoilers'),'Direct Book choice precedes plot detail');}
 }
 assert.equal(api.spoiler(),false);assert.ok(!app.innerHTML.includes('data-novel-event'));
 api.navigate('musical');const musical=api.musicalPage();
 assert.equal((musical.match(/class="musical-section musical-background"/g)||[]).length,3);
 assert.equal((musical.match(/data-page-section="/g)||[]).length,10,'Seven reference section anchors and three return links; journey has its own page');
 for(const id of ['musical-genesis','musical-creators','musical-stages'])assert.match(musical,new RegExp('<details class="musical-section musical-background" id="'+id+'">'));
 assert.equal(api.focusMusicalSection('novel-room'),false,'Unknown fragment cannot open other material');
 assert.equal(api.focusMusicalSection('musical-journey'),true);assert.equal(api.spoiler(),false);
 assert.ok(!app.innerHTML.includes('id="show-slide"'),'Section navigation does not consent to the plot');
});

for(const language of ['he','en'])test(`overview reveal is local, reversible, and reset by global hide (${language})`,()=>{
 const {ctx,api}=boot(language),part=ctx.EXTRA_CONTENT.readingLocator.parts[4];
 const start=code('app').indexOf('function toggleReaderOverview('),end=code('app').indexOf("\napp.addEventListener('toggle',toggleReaderOverview",start);
 const revealContext={R:ctx.EXTRA_CONTENT,readerParagraphs:item=>item.overviewParagraphs.map(p=>`<p>${p[language]}</p>`).join(''),readerOverviewSources:()=>'<a>Source</a>'};vm.createContext(revealContext);vm.runInContext(code('app').slice(start,end),revealContext);
 const host={innerHTML:'',replaceChildren(){this.innerHTML=''}},detail={open:false,dataset:{overviewKey:'p5'},matches:()=>true,querySelector:()=>host};
 assert.ok(!api.readerOverview(part,'part').includes(part.overviewParagraphs[0][language]));
 detail.open=true;revealContext.toggleReaderOverview({target:detail});assert.ok(host.innerHTML.includes(part.overviewParagraphs[0][language]));assert.equal(api.spoiler(),false);
 detail.open=false;revealContext.toggleReaderOverview({target:detail});assert.equal(host.innerHTML,'');
 api.setSpoilers(true);assert.ok(api.readerOverview(part,'part').includes(part.overviewParagraphs[0][language]));api.setSpoilers(false);assert.ok(!api.readerOverview(part,'part').includes(part.overviewParagraphs[0][language]));
});
