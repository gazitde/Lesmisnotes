'use strict';
// Deterministic application integration; this does not claim browser layout or playback coverage.
const fs=require('node:fs'),vm=require('node:vm'),test=require('node:test'),assert=require('node:assert/strict');
function boot(language){
 const nodes=new Map(),callbacks={},storage=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',classList:{add(){},remove(){}},focus(){},select(){},setAttribute(){},scrollIntoView(){},style:{}});return nodes.get(id)};
 const app={innerHTML:'',addEventListener(k,f){callbacks[k]=f}},disk={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 const ctx={console,URLSearchParams,document:{documentElement:{},title:'',addEventListener(){},getElementById:id=>id==='app'?app:node(id),querySelectorAll:()=>[],querySelector:()=>({focus(){},select(){},setAttribute(){},addEventListener(){}})},localStorage:disk,sessionStorage:disk,location:{pathname:`/${language}/home/`,search:'',hash:'',origin:'https://example.test'},history:{state:null},setTimeout:()=>1,clearTimeout(){}};
 ctx.history.pushState=ctx.history.replaceState=(state,_,href)=>{const u=new URL(href,ctx.location.origin);Object.assign(ctx.location,{pathname:u.pathname,search:u.search,hash:u.hash});ctx.history.state=state};ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=(k,f)=>callbacks[k]=f;vm.createContext(ctx);
 for(const f of ['research','extras','quiz-engine','seo','policies','privacy','site-config','analytics','places-data','places','recipes-data','recipes'])vm.runInContext(fs.readFileSync('dist/'+f+'.js','utf8'),ctx);
 const expose='window.__screenCountTest={navigate,screenCollectionCount};})();';vm.runInContext(fs.readFileSync('dist/app.js','utf8').replace(/\}\)\(\);\s*$/,expose),ctx);
 return {ctx,app,api:ctx.__screenCountTest};
}
for(const language of ['en','he'])test(`Screen collection counts follow the data on home and screen pages (${language})`,()=>{
 const {api,app,ctx}=boot(language);
 const initial=ctx.RESEARCH.adaptations.length;
 for(const count of [initial,initial+1]){
  if(count!==initial)ctx.RESEARCH.adaptations.push({...ctx.RESEARCH.adaptations.at(-1),id:'screen-count-fixture'});
  assert.equal(api.screenCollectionCount(),count);
  api.navigate('home',language);
  assert(app.innerHTML.includes(count+(language==='en'?' selected screen versions':' גרסאות נבחרות למסך')));
  assert(!app.innerHTML.includes(language==='en'?'nine selected screen versions':'תשע גרסאות נבחרות למסך'));
  api.navigate('screen',language);
  assert(app.innerHTML.includes(count+(language==='en'?' selected stops in film':' תחנות נבחרות בקולנוע')));
  assert(app.innerHTML.includes(count+(language==='en'?' adaptation landmarks':' תחנות בעיבודים')));
  assert.equal((app.innerHTML.match(/class="screen-card"/g)||[]).length,count);
 }
});
