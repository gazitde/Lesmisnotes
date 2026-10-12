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
const R=render('en','home',false).ctx.RESEARCH;
const records=[['hugo',R.hugo.sections.find(x=>x.id==='reading')],['after',R.curtain.after.stops.find(x=>x.id==='mercy-travels')],['after',R.curtain.after.stops.find(x=>x.id==='defend-the-other-side')],['compare',R.differences.find(x=>x.id==='marius-politics').closeLook],['musical',R.musical.creationStory.craft.find(x=>x.id==='composer-and-words')],['ideas',R.peoplePower.historicalContext]];
for(const lang of ['en','he']){
 for(const [route,record] of records){const paragraphs=record.body[lang].split(/\n\s*\n/);check(paragraphs.length===2,'Two substantive paragraphs '+route+lang);for(const p of paragraphs)check(p.length>170,'Developed paragraph '+route+lang);
  const state=render(lang,route,route==='compare');if(route==='after')state.callbacks.click({target:{closest:selector=>selector.startsWith('a')?null:{dataset:{action:'after-open'},hasAttribute:()=>false}}});
  const html=state.app.innerHTML;for(const p of paragraphs)check(html.includes('<p>'+escape(p)+'</p>'),'Separate escaped paragraph rendered '+route+lang+' '+p.slice(0,70));
  if(['after','compare'].includes(route)){const closed=render(lang,route,false).html;for(const p of paragraphs)check(!closed.includes(escape(p)),'Protected paragraph not in closed HTML '+route+lang)}
 }
 const sources=R.sources.filter(s=>s.id.startsWith('context-hugo-chapter-'));check(sources.length===8,'Eight exact Hugo sources');for(const s of sources){check(s.url.includes('#link2HCH'),'Exact chapter anchor');check(!/memorandum|death|release|father|שחרור|מותו|המזכר|אביו/.test(s.label[lang]),'Global labels do not reveal later story')}
 const html=render(lang,'about',false).html;check(!html.includes('context-hugo-chapter-0341')||html.includes(escape(sources.find(s=>s.id==='context-hugo-chapter-0341').label[lang])),'Neutral source catalogue');
}
const sourceContext={window:{},URLSearchParams};vm.createContext(sourceContext);for(const f of ['research','extras','places-data','recipes-data','seo','search'])vm.runInContext(fs.readFileSync('dist/'+f+'.js','utf8'),sourceContext);const W=sourceContext.window,S=W.SiteSearch,index=S.buildIndex({research:W.RESEARCH,extra:W.EXTRA_CONTENT,places:W.PLACE_CONTENT,recipes:W.RECIPE_CONTENT,metadata:W.SITE_METADATA},{spoiler:false});
for(const lang of ['en','he']){const search=q=>S.search(index,q,{lang,limit:500}).results.map(x=>x.doc.id);check(search(lang==='en'?'hospital':'בית חולים').includes('hugo:reading'),'New safe Hugo detail searchable');check(search('PRS').includes('craft:composer-and-words'),'Lyric history searchable');for(const r of records.filter(x=>['after','compare'].includes(x[0])))check(!JSON.stringify(index).includes(r[1].body[lang].split('\n\n')[0]),'Closed index excludes new later-story paragraphs')}
check(!appCode.includes('Our viewing prompt.'),'Redundant viewing qualification removed');check(!appCode.includes('This guide uses original writing; modern translations'),'Repeated Hugo rights footer removed');check(appCode.includes('Modern translations')||fs.readFileSync('dist/policies.js','utf8').includes('translations'),'Underlying rights policy retained');
console.log(`Context depth: ${tests} checks passed; six bilingual two-paragraph readings, exact primary chapters, neutral global labels, protected outcomes, safe search and retained policy.`);
