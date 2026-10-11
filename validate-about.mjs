import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const research=fs.readFileSync('dist/research.js','utf8');
const extras=fs.readFileSync('dist/extras.js','utf8');
const engine=fs.readFileSync('dist/quiz-engine.js','utf8');
const seo=fs.readFileSync('dist/seo.js','utf8');
const appCode=fs.readFileSync('dist/app.js','utf8');
const privacyCode=fs.readFileSync('dist/privacy.js','utf8');
const configCode=fs.readFileSync('dist/site-config.js','utf8');
const analyticsCode=fs.readFileSync('dist/analytics.js','utf8');
const policiesCode=fs.readFileSync('dist/policies.js','utf8');
let tests=0;
const routeMetadata={window:{}};vm.runInNewContext(seo,routeMetadata);const routes=Object.keys(routeMetadata.window.SITE_METADATA.pages);
function render(lang,route,spoilers){
 const map=new Map([['barricade-spoilers',spoilers?'on':'off']]);
 const storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const callbacks={};
 const app={innerHTML:'',addEventListener(type,fn){callbacks[type]=fn}};
 const nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{classList:{add(){},remove(){}},focus(){},select(){},setAttribute(){},scrollIntoView(){},style:{}});return nodes.get(id)};
 const context={console,URLSearchParams,document:{addEventListener(type,fn){callbacks['document-'+type]=fn},querySelectorAll:()=>[],querySelector:()=>({focus(){},select(){},scrollIntoView(){},addEventListener(type,fn){callbacks['skip-'+type]=fn}}),getElementById:id=>id==='app'?app:node(id),documentElement:{},title:''},localStorage:storage,sessionStorage:storage,location:{hash:`#/${lang}/${route}`,pathname:'/'},history:{},setTimeout:()=>1,clearTimeout:()=>{}};
 context.history.replaceState=context.history.pushState=(a,b,path)=>{context.history.state=a;const u=new URL(path,'https://example.test');context.location.pathname=u.pathname;context.location.search=u.search;context.location.hash=''};
 context.window=context;context.window.scrollTo=()=>{};context.window.addEventListener=(type,fn)=>callbacks[type]=fn;
 vm.createContext(context);vm.runInContext(research,context);vm.runInContext(extras,context);vm.runInContext(engine,context);vm.runInContext(seo,context);vm.runInContext(policiesCode,context);vm.runInContext(privacyCode,context);vm.runInContext(configCode,context);vm.runInContext(analyticsCode,context);vm.runInContext(fs.readFileSync('dist/places-data.js','utf8'),context);vm.runInContext(fs.readFileSync('dist/places.js','utf8'),context);vm.runInContext(fs.readFileSync('dist/recipes-data.js','utf8'),context);vm.runInContext(fs.readFileSync('dist/recipes.js','utf8'),context);vm.runInContext(appCode,context);
 return {html:app.innerHTML,ctx:context,app,callbacks};
}

let checks=0;
for(const lang of ['he','en']){
 const state=render(lang,'about',false),tap=data=>state.callbacks.click({target:{closest:()=>({dataset:data})}}),input=value=>state.callbacks.input({target:{matches:()=>true,value}});
 const total=new Set(state.ctx.RESEARCH.sources.map(x=>x.url)).size;assert.ok(total>=212);checks++;
 const count=html=>(html.match(/class="source-result-topics"/g)||[]).length;
 assert.equal(count(state.html),24);checks++;
 for(const id of ['about-guide','about-history','about-numbers','privacy','about-sources']){assert.ok(state.html.includes('id="'+id+'"'));assert.ok(state.html.includes('data-jump="'+id+'"'));checks+=2;}
 tap({sourceExpand:'more'});assert.equal(count(state.ctx.document.getElementById('source-results').innerHTML),48);checks++;
 tap({sourceExpand:'all'});let all=state.ctx.document.getElementById('source-results').innerHTML;assert.equal(count(all),total);checks++;
 for(const u of new Set(state.ctx.RESEARCH.sources.map(x=>x.url))){assert.ok(all.includes(u.replaceAll('&','&amp;')));checks++;}
 tap({sourceExpand:'less'});assert.equal(count(state.ctx.document.getElementById('source-results').innerHTML),24);checks++;
 for(const source of state.ctx.RESEARCH.sources){input(source.url);assert.ok(state.ctx.document.getElementById('source-results').innerHTML.includes(source.url.replaceAll('&','&amp;')));checks++;}
 input('no-such-source-zzzzz');assert.ok(state.ctx.document.getElementById('source-results').innerHTML.includes('source-empty'));checks++;
 tap({action:'source-clear'});assert.equal(count(state.ctx.document.getElementById('source-results').innerHTML),24);checks++;
 for(const g of state.ctx.RESEARCH.sourceGroups){tap({sourceTopic:g.id});const h=state.ctx.document.getElementById('source-results').innerHTML;assert.ok(count(h)>0&&count(h)<=24);checks++;}
 assert.ok(!state.html.includes('<</section>'));checks++;
 const fallback=state.html.match(/<noscript><div class="source-static-fallback">([\s\S]*?)<\/noscript>/)?.[1];assert.ok(fallback);assert.equal((fallback.match(/<li>/g)||[]).length,total);checks+=2;
 const h=render(lang,'home',false).html;assert.ok(h.includes('data-action="privacy-accept"')); assert.ok(h.includes('data-action="privacy-open"'));assert.ok(h.includes('stats-review-note'));checks+=3;
 const recipes=render(lang,'recipes',false).html;assert.equal((recipes.match(/class="recipe-test-note"/g)||[]).length,5);assert.equal((recipes.match(/class="recipe-source-rating"/g)||[]).length,5);assert.ok(recipes.includes('recipe-tahini-walnut-loaf'));assert.ok(recipes.includes('recipe-bishops-bread-soup'));checks+=4;
 const chars=render(lang,'characters',true).html;assert.ok(chars.includes('24601'));checks++;
 const policy=render(lang,'privacy',false).html;assert.ok(policy.includes(lang==='he'?'פועל רק לאחר אישור מפורש למדידה':'runs only after an explicit analytics opt-in'));checks++;
}
console.log(`PASS: ${checks} About and polish checks: all sources, 24-entry reveal, every source search, topics/reset, no-JS fallback, privacy controls, printed recipe status and24601.`);
