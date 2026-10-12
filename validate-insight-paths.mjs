import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const research=fs.readFileSync('dist/research.js','utf8');
const extras=fs.readFileSync('dist/extras.js','utf8');
const engine=fs.readFileSync('dist/quiz-engine.js','utf8');
const seo=fs.readFileSync('dist/seo.js','utf8');
const appCode=fs.readFileSync('dist/app.js','utf8').replace(/\}\)\(\);\s*$/, 'window.__insights={insightBridges,sourceInsights,readingHref,selectedReading,validReading,setReadingLocation,gallerySongLinks,savedReading};})();');
const privacyCode=fs.readFileSync('dist/privacy.js','utf8');
const configCode=fs.readFileSync('dist/site-config.js','utf8');
const analyticsCode=fs.readFileSync('dist/analytics.js','utf8');
const policiesCode=fs.readFileSync('dist/policies.js','utf8');
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


let checks=0;const check=(x,m)=>{assert.ok(x,m);checks++};
for(const lang of ['he','en'])for(const spoilers of [false,true]){const st=render(lang,'musical',spoilers),R=st.ctx.RESEARCH,H=st.ctx.__insights;check(R.insightBridges.length===6,'Six curated question paths');for(const b of R.insightBridges){check(R.philosophy.dilemmas.some(d=>d.id===b.dilemma),'Dilemma exists');check(R.relationships.some(r=>r.id===b.relationship),'Exact relationship exists');check(b.songs.every(id=>R.musical.songentries.some(s=>s.id===id)),'All song IDs real');check(b.characters.every(id=>R.characters.some(c=>c.id===id)),'All characters real');check(b.prompt.he&&b.prompt.en,'Matched prompt');for(const id of b.songs){const html=H.insightBridges('song',id);check(spoilers?html.includes('data-insight-context'):html==='','Bridge text follows spoiler choice');}}
for(const id of ['stars','on-my-own','bring-him-home']){const html=H.gallerySongLinks(id);check((html.match(/song-gallery-kind/g)||[]).length===2,'Separate kinds');check(!html.includes('undefined'),'Complete labels');}H.setReadingLocation('song','stars','spotlight');check(st.ctx.location.search==='?focus=song%3Astars&view=spotlight','Exact URL');check(H.selectedReading().key==='stars','Allowlisted selection');check(H.savedReading()===null,'No opt-out resume');H.setReadingLocation('song','not-real');check(H.selectedReading().key==='stars','Invalid ID ignored');}
console.log(`PASS: ${checks} contextual bridges and exact reading URL checks.`);

{const st=render('en','novel',false),R=st.ctx.RESEARCH,D=R.readingLocator,books=D.parts.flatMap(p=>p.books);check(books.length===48,'48 books');check(new Set(books.map(b=>b.startUrl)).size===48,'Distinct chapter anchors');for(const b of books){check(b.safeBeforeBook&&b.prompt.he&&b.prompt.en,'Safe bilingual prompt');check(b.label.en===`Part ${['','I','II','III','IV','V'][b.part]}, Book ${['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV'][b.book]}`,'Neutral nonplot labels');}check(!st.html.includes('data-novel-event='),'No synopsis outside consent');check(!st.html.includes('reading-name-grid'),'No future character reminders at start');for(const a of R.recordingChooser.cards){check(a.reason.he&&a.reason.en&&a.prompt.he&&a.prompt.en,'Bilingual chooser');check(a.destination.url.startsWith('https://'),'Official outbound destination');}check(R.hugoStageObject.image.license==='CC0 1.0','Image license');check(!JSON.stringify(R.hugoStageObject).includes('/tmp/'),'No internal asset path');}
console.log(`PASS: ${checks} total connected reading, source, recording and asset assertions.`);

{const st=render('en','musical',true);check(st.ctx.__insights.readingHref('song','stars','he','journey','1').endsWith('&act=1'),'Act selection is shareable');}
