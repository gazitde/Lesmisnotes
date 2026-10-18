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
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let tests=0;
const routes=['humor','home','story','characters','listening','compare','screen','tribute','resources','about','map','history','ideas','quiz','musical','novel','hugo','before','after','sitemap','terms','privacy'];
function render(lang,route,spoilers){
 const map=new Map([['barricade-spoilers',spoilers?'on':'off']]);
 const storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const callbacks={};
 const app={innerHTML:'',addEventListener(type,fn){callbacks[type]=fn}};
 const nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{classList:{add(){},remove(){}},focus(){},select(){},setAttribute(){},scrollIntoView(){},style:{}});return nodes.get(id)};
 const context={console,URLSearchParams,document:{addEventListener(type,fn){callbacks['document-'+type]=fn},querySelectorAll:()=>[],querySelector:()=>({focus(){},select(){},setAttribute(){},addEventListener(type,fn){callbacks['skip-'+type]=fn}}),getElementById:id=>id==='app'?app:node(id),documentElement:{},title:''},localStorage:storage,sessionStorage:storage,location:{hash:`#/${lang}/${route}`,pathname:'/'},history:{},setTimeout:()=>1,clearTimeout:()=>{}};
 context.history.replaceState=context.history.pushState=(a,b,path)=>{context.history.state=a;const u=new URL(path,'https://example.test');context.location.pathname=u.pathname;context.location.search=u.search;context.location.hash=''};
 context.window=context;context.window.scrollTo=()=>{};context.window.addEventListener=(type,fn)=>callbacks[type]=fn;
 vm.createContext(context);vm.runInContext(research,context);vm.runInContext(extras,context);vm.runInContext(engine,context);vm.runInContext(seo,context);vm.runInContext(policiesCode,context);vm.runInContext(privacyCode,context);vm.runInContext(configCode,context);vm.runInContext(analyticsCode,context);vm.runInContext(fs.readFileSync('dist/places-data.js','utf8'),context);vm.runInContext(fs.readFileSync('dist/places.js','utf8'),context);vm.runInContext(fs.readFileSync('dist/recipes-data.js','utf8'),context);vm.runInContext(fs.readFileSync('dist/recipes.js','utf8'),context);vm.runInContext(appCode,context);
 return {html:app.innerHTML,ctx:context,app,callbacks};
}

const R=render('en','home',false).ctx.RESEARCH;
const tap=(st,data)=>st.callbacks.click({target:{closest:selector=>selector==='button'?{dataset:data,hasAttribute:n=>Object.hasOwn(data,n.replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase()))}:null}});
let checks=0;
assert.equal(R.moments.moments.length,3);
const sourceIds=new Set(R.sources.map(s=>s.id));
for(const m of R.moments.moments){assert.equal(m.views.length,2);assert.ok(m.sourceIds.every(id=>sourceIds.has(id)));assert.ok(R.musical.songentries.some(s=>s.id===m.links.songId));assert.ok(m.links.characterIds.every(id=>R.characters.some(c=>c.id===id)));checks+=4;}
for(const locale of ['he','en']){
 const hidden=render(locale,'ideas',false);assert.ok(hidden.html.includes('id="another-view"'));assert.ok(!hidden.html.includes('class="moment-reading"'));assert.ok(!hidden.html.includes('data-moment-view='));for(const m of R.moments.moments)assert.ok(!hidden.html.includes(m.scene[locale]));checks+=6;
 tap(hidden,{momentOpen:''});assert.ok(hidden.app.innerHTML.includes('class="moment-reading"'));assert.equal((hidden.app.innerHTML.match(/data-moment="/g)||[]).length,3);checks+=2;
 for(let i=0;i<3;i++){
  tap(hidden,{moment:String(i)});const m=R.moments.moments[i];const body=hidden.ctx.document.getElementById('moment-body').innerHTML;assert.ok(body.includes(esc(m.scene[locale])));assert.ok(body.includes('aria-pressed="true"'));assert.equal((body.match(/data-moment-view=/g)||[]).length,2);checks+=3;
  for(let v=0;v<2;v++){tap(hidden,{momentView:String(v)});const panel=hidden.ctx.document.getElementById('moment-view-panel').innerHTML;assert.ok(panel.includes(m.views[v].title[locale]));assert.ok(panel.includes(esc(m.views[v].body[locale])));assert.ok(body.includes('aria-live="polite"'));assert.ok(body.includes('data-gallery-song="'+m.links.songId+'"'));assert.ok(!panel.includes('<iframe'));assert.ok(!panel.includes('undefined'));checks+=6;}
 }
 // UI-language change keeps selected moment/view, but still requires the existing session spoiler consent.
 tap(hidden,{moment:'2'});tap(hidden,{momentView:'1'});tap(hidden,{action:'language'});assert.ok(hidden.app.innerHTML.includes(R.moments.moments[2].views[1].title[locale==='he'?'en':'he']));checks++;
 tap(hidden,{action:'hide-spoilers'});assert.ok(!hidden.app.innerHTML.includes('class="moment-reading"'));assert.ok(!hidden.app.innerHTML.includes('data-moment-view='));checks+=2;
 tap(hidden,{moment:'1'});tap(hidden,{momentView:'1'});assert.ok(!hidden.app.innerHTML.includes('class="moment-reading"'));checks++;
 const fresh=render(locale,'ideas',false);assert.ok(!fresh.html.includes('class="moment-reading"'));checks++;
 const home=render(locale,'home',false);assert.ok(!home.html.includes('data-moment-entry'));assert.equal((home.html.match(/class="path-card/g)||[]).length,2);tap(home,{momentEntry:''});assert.equal(home.ctx.location.pathname,'/'+locale+'/ideas/');assert.ok(!home.app.innerHTML.includes('class="moment-reading"'));checks+=4;
}
console.log(`PASS: ${checks} editorial-moment checks: sources, six perspectives, HE/EN, opt-in spoilers, session reset, language continuity and contextual entry.`);
