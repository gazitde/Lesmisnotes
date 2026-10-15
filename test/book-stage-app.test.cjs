'use strict';
// Real application integration in a deterministic VM; actual browser/layout checks are separate.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=process.env.LESMIS_SOURCE||path.resolve(__dirname,'..'),code=name=>fs.readFileSync(path.join(root,'dist',name+'.js'),'utf8');
const expose=`window.__completionTest={render,navigate,navigateReader,readingHref,chapterStageLinks,sceneBookLinks,setSpoilers,selectedReading,cache(data){readingPartCache.set(data.part,data)},spoiler:()=>spoiler};})();`;
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

for(const language of ['he','en'])test(`book-stage app navigation and spoiler boundaries (${language})`,()=>{
 const {ctx,api,app,session}=boot(language),id='p1-b2-c12';
 api.navigateReader(api.readingHref('chapter',id));
 assert.match(app.innerHTML,new RegExp('data-chapter-stage="'+id+'"'));
 const chapter=ctx.EXTRA_CONTENT.chapterCompanion.chapters.find(c=>c.id===id);
 const safe=api.chapterStageLinks(chapter);assert.ok(!safe.includes('data-insight-link'));assert.equal(api.spoiler(),false);
 api.setSpoilers(true);const full=api.chapterStageLinks(chapter);assert.ok(full.includes('/'+language+'/musical/?focus=song%3A'));assert.ok(full.includes('&amp;view=journey'));assert.ok(!full.includes('/journey/'));
 const scene=ctx.BOOK_STAGE_DATA.scenes.find(s=>s.relations.some(r=>r.chapterIds.includes(id)));
 assert.ok(api.sceneBookLinks(scene.songId).includes('/'+language+'/novel/?focus=chapter%3A'+id));
 api.navigate('novel',language==='he'?'en':'he');assert.equal(api.selectedReading().key,id);assert.ok(api.chapterStageLinks(chapter).includes('/'+(language==='he'?'en':'he')+'/musical/'));
 api.setSpoilers(false);assert.ok(!api.chapterStageLinks(chapter).includes('data-insight-link'));assert.equal(session.get('barricade-spoilers'),'off');
});
