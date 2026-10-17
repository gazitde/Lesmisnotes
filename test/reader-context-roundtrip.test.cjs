'use strict';
// Exercise the real app handlers in a deterministic VM. Browser layout is checked separately.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=process.env.LESMIS_SOURCE||path.resolve(__dirname,'..'),code=name=>fs.readFileSync(path.join(root,'dist',name+'.js'),'utf8');
const expose=`window.__readerContextTest={render,navigate,navigateReader,handleClick,setSpoilers,chapterCompletion,readingChapters,chapterSummary,chapterMapContext,placeAtlasOptions,selectedReading,cache(data){readingPartCache.set(data.part,data)},spoiler:()=>spoiler};})();`;
function boot(lang,initialPath=`/${lang}/novel/`){
 const disk=new Map(),session=new Map(),listeners={},nodes=new Map(),focuses=[],scrolls=[];
 const node=id=>{if(!nodes.has(id))nodes.set(id,{classList:{add(){},remove(){}},focus(){focuses.push(id)},setAttribute(){},scrollIntoView(){scrolls.push(id)},querySelectorAll:()=>[],style:{}});return nodes.get(id)};
 const app={innerHTML:'',addEventListener(){}},storage=data=>({getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)});
 const ctx={console,URLSearchParams,localStorage:storage(disk),sessionStorage:storage(session),setTimeout:()=>1,clearTimeout(){},document:{documentElement:{},title:'',addEventListener(){},querySelectorAll:()=>[],getElementById:id=>id==='app'?app:node(id),querySelector:selector=>selector.startsWith('#')?node(selector.slice(1)):{...node(selector),addEventListener(){}}},location:{pathname:`/${lang}/novel/`,search:'',hash:'',origin:'https://example.test'},history:{state:null}};
 const initialURL=new URL(initialPath,ctx.location.origin);Object.assign(ctx.location,{pathname:initialURL.pathname,search:initialURL.search,hash:initialURL.hash});
 ctx.history.replaceState=ctx.history.pushState=(state,_,href)=>{const url=new URL(href,ctx.location.origin);Object.assign(ctx.location,{pathname:url.pathname,search:url.search,hash:url.hash});ctx.history.state=state};ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=(name,fn)=>listeners[name]=fn;vm.createContext(ctx);
 for(const name of ['research','extras','character-profiles-data','character-profiles','quiz-engine','seo','policies','privacy','site-config','analytics','places-data','places','recipes-data','recipes','search','chapter-completion'])vm.runInContext(code(name),ctx);
 vm.runInContext(code('app').replace(/\}\)\(\);\s*$/,expose),ctx);
 const api=ctx.__readerContextTest;for(let part=1;part<=5;part++)api.cache(JSON.parse(fs.readFileSync(path.join(root,`dist/reading/part-${part}.json`),'utf8')));
 ctx.PlaceAtlas.mount=()=>{}; // Map network/Leaflet behavior is outside this state regression.
 function click(href,attribute){
  href=href.replaceAll('&amp;','&');let prevented=false;
  const anchor={getAttribute:name=>name==='href'?href:null,hasAttribute:name=>name===attribute,dataset:{}};
  api.handleClick({target:{closest:selector=>selector===`a[${attribute}]`||selector==='a[href]'?anchor:null},preventDefault(){prevented=true}});
  assert.equal(prevented,true,'Internal context links must stay in the current app visit');
 }
 function changeLanguage(){
  const button={dataset:{action:'language'},hasAttribute:()=>false};
  api.handleClick({target:{closest:selector=>selector==='button'?button:null},preventDefault(){}});
 }
 return {ctx,api,app,disk,listeners,click,changeLanguage,focuses,scrolls};
}
for(const lang of ['en','he'])for(const mode of ['main','all'])test(`chapter map round trip preserves ${mode} route, spoiler boundary and visit-only marks (${lang})`,()=>{
 const {ctx,api,app,disk,listeners,click,changeLanguage}=boot(lang),chapter='p2-b3-c11',other=lang==='en'?'he':'en';
 const start=`/${lang}/novel/?focus=chapter%3A${chapter}${mode==='all'?'&essays=all':''}`;
 api.navigateReader(start);api.setSpoilers(true);api.chapterCompletion.mark(chapter);
 const summary=api.chapterSummary(api.readingChapters().find(c=>c.id===chapter));
 const anchor=summary.match(/<a[^>]+href="([^\"]*\/map\/[^\"]+)"[^>]*>/)?.[0];
 assert(anchor?.includes('data-insight-link'));
 click(anchor.match(/href="([^"]+)"/)[1],'data-insight-link');
 assert.equal(api.chapterMapContext().chapter.id,chapter);assert.equal(api.placeAtlasOptions().spoiler,false);
 assert.equal(new URLSearchParams(ctx.location.search).get('essays'),mode==='all'?'all':null);
 assert.match(app.innerHTML,/chapter-map-view/);assert.ok(!app.innerHTML.includes('geo-novel-summary'));
 changeLanguage();
 assert.equal(api.chapterMapContext().chapter.id,chapter);assert.equal(api.placeAtlasOptions().spoiler,false);
 assert.equal(new URLSearchParams(ctx.location.search).get('place'),'montfermeil');
 assert.equal(new URLSearchParams(ctx.location.search).get('essays'),mode==='all'?'all':null);
 assert.match(app.innerHTML,/chapter-map-view/);assert.ok(!app.innerHTML.includes('geo-novel-summary'));
 click(app.innerHTML.match(/class="btn secondary" href="([^"]+)" data-insight-link/)[1],'data-insight-link');
 assert.equal(api.selectedReading().key,chapter);assert.equal(api.selectedReading().essays,mode);
 assert.equal(api.chapterCompletion.snapshot().count,1);assert.equal(api.spoiler(),true);
 assert.equal(disk.has('barricade-completed-chapters-v1'),false);assert.equal(disk.has('barricade-consent-v1'),false);
 ctx.history.replaceState(null,'',start);listeners.popstate();assert.equal(api.selectedReading().essays,mode);assert.equal(api.chapterCompletion.snapshot().count,1);
});
for(const lang of ['en','he'])for(const mode of ['main','all'])test(`chapter profile and its language switch preserve explicit ${mode} mode (${lang})`,()=>{
 const {ctx,api,app,click,changeLanguage}=boot(lang),chapter='p1-b1-c1',other=lang==='en'?'he':'en';
 api.navigateReader(`/${lang}/novel/?focus=chapter%3A${chapter}${mode==='all'?'&essays=all':''}`);api.setSpoilers(true);
 const summary=api.chapterSummary(api.readingChapters().find(c=>c.id===chapter));
 click(summary.match(/data-profile-link href="([^"]+)"/)[1],'data-profile-link');
 assert.equal(new URLSearchParams(ctx.location.search).get('essays'),mode==='all'?'all':null);
 changeLanguage();assert.ok(!app.innerHTML.includes('profile-full-prose'));
 const trail=ctx.CharacterProfiles.readerTrail('character-bishop',{lang:other,search:ctx.location.search});
 for(const step of trail.filter(x=>x.href.includes('/novel/')))assert.equal(new URLSearchParams(new URL(step.href,ctx.location.origin).search).get('essays'),mode==='all'?'all':null);
 click(app.innerHTML.match(/class="btn" data-profile-link href="([^"]+)"/)[1],'data-profile-link');
 assert.equal(api.selectedReading().key,chapter);assert.equal(api.selectedReading().essays,mode);assert.equal(api.spoiler(),true);
});
for(const lang of ['en','he'])test(`invalid essay values do not opt into all chapters (${lang})`,()=>{
 const {ctx,api,app,changeLanguage}=boot(lang);
 api.navigateReader(`/${lang}/map/?place=montfermeil&reader=p2-b3-c11&essays=invalid`);changeLanguage();
 assert.equal(new URLSearchParams(ctx.location.search).get('essays'),null);
 api.navigateReader(`/${lang}/character-bishop/?reader=p1-b1-c1&essays=invalid`);changeLanguage();
 assert.equal(new URLSearchParams(ctx.location.search).get('essays'),null);assert.ok(!app.innerHTML.includes('essays=all'));
});

for(const lang of ['en','he'])test(`direct selected-performance entry lands on its detail without changing spoiler or playback state (${lang})`,()=>{
 const href=`/${lang}/listening/?clip=JMGMSgPHJoI`,{ctx,api,app,focuses,scrolls,listeners}=boot(lang,href);
 assert.equal(ctx.location.pathname+ctx.location.search,href);
 assert.equal(focuses.at(-1),'gallery-detail');assert.equal(scrolls.at(-1),'gallery-detail');
 assert.ok(app.innerHTML.includes('data-added-media="JMGMSgPHJoI"'));assert.equal(api.spoiler(),false);
 assert.ok(!app.innerHTML.includes('autoplay=1'));assert.equal(ctx.history.state,null);
 ctx.history.replaceState(null,'',`/${lang}/listening/`);listeners.popstate();
 assert.equal(focuses.at(-1),'gallery-choices');assert.ok(!app.innerHTML.includes('id="gallery-detail"'));
 ctx.history.replaceState(null,'',href);listeners.popstate();assert.equal(focuses.at(-1),'gallery-detail');assert.equal(api.spoiler(),false);
});
for(const lang of ['en','he'])test(`gallery landing does not focus a nonexistent or unselected performance (${lang})`,()=>{
 for(const suffix of ['','?clip=unknown-video','?category=coaching']){
  const {api,focuses}=boot(lang,`/${lang}/listening/${suffix}`);assert.ok(!focuses.includes('gallery-detail'));assert.equal(api.spoiler(),false);
 }
});
for(const lang of ['en','he'])test(`direct plot-sensitive performance lands on the closed spoiler gate (${lang})`,()=>{
 const {ctx,api,app,focuses}=boot(lang,`/${lang}/listening/?clip=Ln7ZSyv9lSE`);
 assert.equal(focuses.at(-1),'gallery-detail');assert.equal(api.spoiler(),false);assert.equal(ctx.history.state,null);
 assert.ok(app.innerHTML.includes('data-gallery-reveal'));
 assert.ok(!app.innerHTML.includes('data-added-media="Ln7ZSyv9lSE"'));
 assert.ok(!app.innerHTML.includes('youtube-nocookie.com/embed/Ln7ZSyv9lSE'));
});
