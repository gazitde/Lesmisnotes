'use strict';
// Real application integration in a deterministic VM; actual browser/layout checks are separate.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=process.env.LESMIS_SOURCE||path.resolve(__dirname,'..'),code=name=>fs.readFileSync(path.join(root,'dist',name+'.js'),'utf8');
const expose=`window.__completionTest={chapterCompletion,render,navigate,navigateReader,readingHref,updateReadingChapter,privacyAction,applyPrivacy,readingHierarchyBody,selectedReading,savedReading,rememberReading,homeMemory,cache(data){readingPartCache.set(data.part,data)},spoiler:()=>spoiler};})();`;
function boot(language){
 const disk=new Map(),session=new Map(),listeners={},nodes=new Map();let focused='';
 const node=id=>{if(!nodes.has(id))nodes.set(id,{classList:{add(){},remove(){}},focus(){focused=id},setAttribute(){},scrollIntoView(){},querySelectorAll(){return[]},style:{}});return nodes.get(id)};
 const app={innerHTML:'',addEventListener(){}},storage=data=>({getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)});
 const ctx={console,URLSearchParams,localStorage:storage(disk),sessionStorage:storage(session),setTimeout:()=>1,clearTimeout(){},document:{documentElement:{},title:'',addEventListener(){},querySelectorAll:()=>[],getElementById:id=>id==='app'?app:node(id),querySelector:selector=>selector.startsWith('#')?node(selector.slice(1)):{...node(selector),addEventListener(){}}},location:{pathname:`/${language}/novel/`,search:'',hash:'',origin:'https://example.test'},history:{state:null}};
 ctx.history.replaceState=ctx.history.pushState=(state,_,href)=>{const url=new URL(href,ctx.location.origin);Object.assign(ctx.location,{pathname:url.pathname,search:url.search,hash:url.hash});ctx.history.state=state};ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=(name,fn)=>listeners[name]=fn;vm.createContext(ctx);
 for(const name of ['research','extras','character-profiles-data','character-profiles','quiz-engine','seo','policies','privacy','site-config','analytics','places-data','places','recipes-data','recipes','search','chapter-completion'])vm.runInContext(code(name),ctx);
 vm.runInContext(code('app').replace(/\}\)\(\);\s*$/,expose),ctx);
 const api=ctx.__completionTest;for(let part=1;part<=5;part++)api.cache(JSON.parse(fs.readFileSync(path.join(root,`dist/reading/part-${part}.json`),'utf8')));
 return {ctx,api,app,disk,session,listeners,focused:()=>focused};
}

for(const language of ['en','he'])for(const mode of ['main','all'])for(const chapter of ['p1-b1-c1','p3-b1-c1'])test(`Home resumes ${mode} route and ${chapter} (${language})`,()=>{
 const {ctx,api,app,disk}=boot(language);
 api.applyPrivacy({functional:true,analytics:false,media:false});
 const href=`/${language}/novel/?focus=chapter%3A${chapter}${mode==='all'?'&essays=all':''}`;
 api.navigateReader(href);api.rememberReading();
 assert.equal(api.savedReading().essays,mode);
 assert.equal(JSON.parse(disk.get('barricade-last-reading')).essays,mode);
 api.navigate('home');assert.equal(ctx.location.search,'');
 const resume=api.homeMemory().match(/href="([^"]+focus=[^"]+)"/)[1];
 assert.equal(resume.includes('essays=all'),mode==='all');
 api.navigateReader(resume);assert.equal(api.selectedReading().key,chapter);assert.equal(api.selectedReading().essays,mode);
 assert.match(app.innerHTML,mode==='all'?/365/:/333/);
});
for(const language of ['en','he'])test(`legacy resume stays main and rejected privacy cannot persist (${language})`,()=>{
 const {ctx,api,disk}=boot(language);
 api.applyPrivacy({functional:true,analytics:false,media:false});
 disk.set('barricade-last-reading',JSON.stringify({kind:'chapter',key:'p3-b1-c1'}));
 api.navigate('home');assert.equal(api.savedReading().essays,'main');
 assert.ok(!api.homeMemory().includes('essays=all'));
 api.applyPrivacy({functional:false,analytics:false,media:false});
 const before=disk.get('barricade-last-reading');
 api.navigateReader(`/${language}/novel/?focus=chapter%3Ap1-b1-c1&essays=all`);api.rememberReading();
 assert.equal(disk.get('barricade-last-reading'),before);assert.equal(api.savedReading(),null);assert.equal(api.homeMemory(),'');
});
