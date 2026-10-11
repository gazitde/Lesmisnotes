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
const routes=['places','humor','home','story','characters','listening','compare','screen','tribute','resources','about','map','history','ideas','quiz','musical','novel','hugo','before','after','sitemap','terms','privacy'];
function render(lang,route,spoilers,query=''){
 const map=new Map([['barricade-spoilers',spoilers?'on':'off']]);
 const storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const callbacks={};
 const app={innerHTML:'',addEventListener(type,fn){callbacks[type]=fn}};
 const nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{classList:{add(){},remove(){}},focus(){},select(){},setAttribute(){},scrollIntoView(){},style:{}});return nodes.get(id)};
 const context={console,URLSearchParams,document:{addEventListener(type,fn){callbacks['document-'+type]=fn},querySelectorAll:()=>[],querySelector:()=>({focus(){},select(){},setAttribute(){},addEventListener(type,fn){callbacks['skip-'+type]=fn}}),getElementById:id=>id==='app'?app:node(id),documentElement:{},title:''},localStorage:storage,sessionStorage:storage,location:{hash:'',pathname:`/${lang}/${route}/`,search:query},history:{},setTimeout:()=>1,clearTimeout:()=>{}};
 context.history.replaceState=context.history.pushState=(a,b,path)=>{context.history.state=a;const u=new URL(path,'https://example.test');context.location.pathname=u.pathname;context.location.search=u.search;context.location.hash=''};
 context.window=context;context.window.scrollTo=()=>{};context.window.addEventListener=(type,fn)=>callbacks[type]=fn;
 vm.createContext(context);vm.runInContext(research,context);vm.runInContext(extras,context);vm.runInContext(engine,context);vm.runInContext(seo,context);vm.runInContext(policiesCode,context);vm.runInContext(privacyCode,context);vm.runInContext(configCode,context);vm.runInContext(analyticsCode,context);vm.runInContext(fs.readFileSync('dist/places-data.js','utf8'),context);vm.runInContext(fs.readFileSync('dist/places.js','utf8'),context);vm.runInContext(appCode,context);
 return {html:app.innerHTML,ctx:context,app,callbacks};
}


const sample=render('en','places',false),D=sample.ctx.PLACE_CONTENT;
let checks=0;
assert.equal(D.places.length,9);checks++;
const ids=new Set();
for(const p of D.places){
 assert.ok(!ids.has(p.id));ids.add(p.id);assert.ok(p.coordinates.length===2&&p.coordinates.every(Number.isFinite));assert.ok(p.coordinates[0]>48&&p.coordinates[0]<50&&p.coordinates[1]>2&&p.coordinates[1]<3);checks+=3;
 for(const lang of ['he','en'])for(const field of ['name','history','novel','shortIntro','mapNote','precisionLabel']){assert.ok(typeof p[field][lang]==='string'&&p[field][lang].length>3,`${p.id} ${field} ${lang}`);checks++;}
 for(const field of ['history','novel']){assert.ok(p[field].en.split(/\s+/).length>=45,`${p.id} ${field} must be substantive`);checks++;}
 assert.ok(p.novelRefs.length>0&&p.historySources.length>0);for(const ref of [...p.novelRefs,...p.historySources]){assert.ok(ref.url.startsWith('https://'));checks++;}
 assert.ok(p.photo.src.startsWith('/assets/places/'));assert.ok(fs.existsSync('dist'+p.photo.src));assert.ok(p.photo.sourceUrl.startsWith('https://commons.wikimedia.org/wiki/File:'));assert.ok(p.photo.licenseUrl.startsWith('https://creativecommons.org/'));assert.ok(p.photo.author);checks+=5;
}
const tap=(st,data)=>st.callbacks.click({target:{closest:selector=>selector==='button'?{dataset:data,hasAttribute:n=>Object.hasOwn(data,n.replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase()))}:null}});
for(const lang of ['en','he'])for(const spoiler of [false,true]){
 const essay=render(lang,'places',spoiler),map=render(lang,'map',spoiler);
 assert.equal((essay.html.match(/class="place-essay"/g)||[]).length,9);assert.ok(essay.html.includes('places-index'));assert.ok(map.html.includes('id="geographic-map"'));assert.ok(!map.html.includes('data-geo-load'));assert.ok(!map.html.includes('data-geo-disconnect'));assert.ok(map.html.includes('geo-loading'));assert.ok(map.html.includes('geo-map-provider'));assert.ok(map.html.includes('data-map-scope="france"'));assert.ok(map.html.includes('data-map-scope="paris"'));assert.ok(map.html.includes('id="atlas-drawing"'));assert.ok(!essay.html.includes('undefined'));assert.ok(!map.html.includes('undefined'));checks+=12;
 for(const p of D.places){assert.ok(essay.html.includes(p.history[lang].replace(/&/g,'&amp;')));assert.equal(essay.html.includes(p.novel[lang].replace(/&/g,'&amp;')),spoiler);assert.ok(essay.html.includes(`data-place-map="${p.id}"`));assert.ok(essay.html.includes(`?place=${p.id}`));checks+=4;}
 assert.ok(!/<(?:img|script|iframe)[^>]+src="https?:/.test(essay.html));assert.ok(!/<(?:img|script|iframe)[^>]+src="https?:/.test(map.html));checks+=2;
 for(const p of D.places){tap(map,{geoPlace:p.id});assert.ok(map.ctx.document.getElementById('geo-card').innerHTML.includes(p.name[lang].replace(/&/g,'&amp;')));assert.equal(map.ctx.location.search,'?place='+p.id);checks+=2;}
 tap(map,{geoScope:'paris'});assert.ok(!map.ctx.document.getElementById('geo-place-list').innerHTML.includes('data-geo-place="montfermeil"'));tap(map,{geoScope:'all'});assert.ok(map.ctx.document.getElementById('geo-place-list').innerHTML.includes('data-geo-place="montfermeil"'));checks+=2;
}
for(const lang of ['he','en']){
 const page=render(lang,'places',false,'?place=chanvrerie');tap(page,{placeSpoilers:'chanvrerie'});assert.ok(page.app.innerHTML.includes(D.places.find(p=>p.id==='chanvrerie').novel[lang]));tap(page,{action:'hide-spoilers'});assert.ok(!page.app.innerHTML.includes('class="place-novel-paragraph"'));checks+=2;
 const map=render(lang,'map',false,'?place=montfermeil');assert.ok(map.html.includes('data-geo-scope="all" aria-pressed="true"'));tap(map,{action:'language'});assert.equal(map.ctx.location.pathname,'/'+(lang==='he'?'en':'he')+'/map/');assert.equal(map.ctx.location.search,'?place=montfermeil');checks+=3;
}
const code=fs.readFileSync('dist/places.js','utf8');assert.ok(!code.includes('localStorage'));assert.ok(!code.includes('sessionStorage'));assert.ok(!code.includes('geolocation'));assert.ok(code.includes("referrerPolicy:'origin'"));assert.ok(code.includes('keepBuffer:0'));assert.ok(code.includes('token!==epoch'));assert.ok(code.includes("map.remove()"));checks+=7;
console.log(`PASS: ${checks} place-essay and geographic-map checks: bilingual prose, exact references, images and licences, spoiler gating, all selectors, area filters, language/deep links and privacy safeguards.`);
