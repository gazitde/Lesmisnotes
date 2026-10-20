import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const research=fs.readFileSync('dist/research.js','utf8');
const extras=fs.readFileSync('dist/extras.js','utf8');
const engine=fs.readFileSync('dist/quiz-engine.js','utf8');
const seo=fs.readFileSync('dist/seo.js','utf8');
const appCode=fs.readFileSync('dist/app.js','utf8').replace('function render(){',`window.__interestAudit={plan(id){return interestPlan(interestPaths.find(d=>d.id===id))},song(id){featuredSong=id;return spotlightDetail()},gallery(id){galleryClip=id;return galleryDetail()},slide(i){showAct='all';showIndex=i;return showSlide()},dilemma(i){selectedDilemma=i;return dilemmaDetail()},pathCount(){return journeyPaths.length},stopCount(){return showStops().length}};function render(){`);
const privacyCode=fs.readFileSync('dist/privacy.js','utf8');
const configCode=fs.readFileSync('dist/site-config.js','utf8');
const analyticsCode=fs.readFileSync('dist/analytics.js','utf8');
const policiesCode=fs.readFileSync('dist/policies.js','utf8');
let tests=0;
const routeMetadata={window:{}};vm.runInNewContext(seo,routeMetadata);const routes=Object.keys(routeMetadata.window.SITE_METADATA.pages);
const renderScripts=[research,extras,...['character-profiles-data','character-profiles'].map(name=>fs.readFileSync('dist/'+name+'.js','utf8')),engine,seo,policiesCode,privacyCode,configCode,analyticsCode,...['places-data','places','recipes-data','recipes','watch-path-data','watch-path'].map(name=>fs.readFileSync('dist/'+name+'.js','utf8')),appCode].map(code=>new vm.Script(code));
function render(lang,route,spoilers){
 global.gc?.();
 const map=new Map([['barricade-spoilers',spoilers?'on':'off']]);
 const storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const callbacks={};
 const app={innerHTML:'',addEventListener(type,fn){callbacks[type]=fn}};
 const nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{classList:{add(){},remove(){}},focus(){},select(){},setAttribute(){},scrollIntoView(){},style:{}});return nodes.get(id)};
 const context={console,URLSearchParams,document:{cookie:'',createElement:()=>({remove(){}}),head:{appendChild(){}},addEventListener(type,fn){callbacks['document-'+type]=fn},querySelectorAll:()=>[],querySelector:()=>({focus(){},select(){},addEventListener(type,fn){callbacks['skip-'+type]=fn}}),getElementById:id=>id==='app'?app:node(id),documentElement:{},title:''},localStorage:storage,sessionStorage:storage,location:{hash:`#/${lang}/${route}`,pathname:'/'},history:{},setTimeout:()=>1,clearTimeout:()=>{}};
 context.history.replaceState=context.history.pushState=(a,b,path)=>{context.history.state=a;const u=new URL(path,'https://example.test');context.location.pathname=u.pathname;context.location.search=u.search;context.location.hash=''};
 context.window=context;context.window.scrollTo=()=>{};context.window.addEventListener=(type,fn)=>callbacks[type]=fn;
 vm.createContext(context);for(const script of renderScripts)script.runInContext(context);
 return {html:app.innerHTML,ctx:context,app,callbacks};
}
const check=(value,message)=>{assert.ok(value,message);tests++},escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function clean(html,label){check(!/mtishows\.(com|co\.uk)/i.test(html),'No licensing destination in visitor content '+label);check(!/\bMTI\b/.test(html.replace(/<[^>]*>/g,'')),'No repeated MTI prose '+label);check(!/<details class="source-disclosure"><summary>[^<]+<\/summary>\s*<\/details>/.test(html),'No empty source disclosure '+label)}
for(const lang of ['he','en']){
 for(const route of routes)for(const spoiler of [false,true]){const st=render(lang,route,spoiler);if(route==='about'){check(st.html.includes('mtishows.com'),'About retains original primary citations');continue}clean(st.html,lang+route+spoiler)}
 const st=render(lang,'musical',true),R=st.ctx.RESEARCH;check(st.ctx.__interestAudit.pathCount()===8,'Three interest paths plus five existing paths');
 for(const song of R.musical.spotlight.songs)clean(st.ctx.__interestAudit.song(song.id),lang+song.id);
 for(const item of R.gallery.items)clean(st.ctx.__interestAudit.gallery(item.id),lang+item.id);for(let i=0;i<st.ctx.__interestAudit.stopCount();i++)clean(st.ctx.__interestAudit.slide(i),lang+'stop'+i);
 for(let i=0;i<R.philosophy.dilemmas.length;i++)clean(st.ctx.__interestAudit.dilemma(i),lang+'dilemma'+i);
 for(const interest of ['musical','novel']){const plan=st.ctx.__interestAudit.plan(interest);check((plan.match(/class="btn interest-start/g)||[]).length===1,'One audience primary '+interest);const options=plan.match(/<div class="audience-option-grid">([\s\S]*?)<\/div>/)?.[1]||'';check((options.match(/<a href=/g)||[]).length===3,'Exactly three supporting links '+interest);for(const route of interest==='musical'?['before','listening','screen']:['characters','map','hugo'])check(options.includes('/'+lang+'/'+route+'/'),'Supporting destination '+route);check(plan.includes(interest==='musical'?'/'+lang+'/musical-journey/':'/'+lang+'/novel-journey/?focus=chapter%3Ap1-b1-c1'),'Audience primary destination '+interest);}
 const home=render(lang,'home',false);for(const id of ['novel','musical'])check(home.html.includes('data-interest="'+id+'"'),'Static interest fallback '+id);check((home.html.match(/class="path-card"/g)||[]).length===2,'Exactly two main cards');check(!home.html.includes('home-entry-choices'),'Old competing entry cards removed');for(const token of ['data-interest="both"','data-home-journey=','class="vinyl"','home-more-paths'])check(!home.html.includes(token),'Removed home clutter '+token);
}
console.log(`Interest home and technical-source cleanup: ${tests} source/render checks passed.`);
