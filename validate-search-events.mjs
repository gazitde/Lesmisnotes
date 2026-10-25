import fs from 'node:fs';import vm from'node:vm';import assert from'node:assert/strict';
let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++};
function boot(lang){const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};let active=null;const nodes=new Map(),app={innerHTML:'',addEventListener(){}};const node=id=>{if(!nodes.has(id))nodes.set(id,{style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},focus(){active=id},scrollIntoView(){},querySelectorAll(){return[]},addEventListener(){}});return nodes.get(id)};
const C={console,URLSearchParams,localStorage:storage,sessionStorage:storage,setTimeout:()=>1,clearTimeout(){},document:{documentElement:{classList:{remove(){}}},title:'',addEventListener(){},querySelectorAll:()=>[],getElementById:id=>id==='app'?app:node(id),querySelector(selector){const m=selector.match(/^\[(data-[a-z-]+)="([A-Za-z0-9_-]+)"\]$/);if(m&&!app.innerHTML.includes(`${m[1]}="${m[2]}"`))return null;return node(selector)}},location:{pathname:`/${lang}/home/`,search:'',hash:'',origin:'https://example.test'},history:{state:null}};
C.history.replaceState=C.history.pushState=(state,_,path)=>{const u=new URL(path,C.location.origin);Object.assign(C.location,{pathname:u.pathname,search:u.search,hash:u.hash});C.history.state=state};C.window=C;C.scrollTo=()=>{};C.addEventListener=()=>{};vm.createContext(C);
for(const name of ['research','extras','special-events-data','character-profiles-data','character-profiles','quiz-engine','seo','policies','privacy','site-config','analytics','places-data','places','recipes-data','recipes','search'])vm.runInContext(fs.readFileSync(`dist/${name}.js`,'utf8'),C);
vm.runInContext(fs.readFileSync('dist/app.js','utf8').replace(/\}\)\(\);\s*$/,'window.__anchorAudit={navigate,navigateSearchResult,render,setSpoilers,retainedFocusHref,applySearchSelection,getState(){return{lang,route,spoiler,novelConsent}}};})();'),C);
return{C,app,api:C.__anchorAudit,active:()=>active};}
for(const lang of ['en','he']){
 const {C,app,api,active}=boot(lang),S=C.SiteSearch;
 api.navigateSearchResult(`/${lang}/special-events/`);
 check(C.location.pathname===`/${lang}/special-events/`,'Hyphenated canonical destination is navigable');
 for(const event of C.EXTRA_CONTENT.specialEvents){
  const href=`/${lang}/special-events/?focus=event%3A${event.id}`;
  api.navigateSearchResult(href);
  check(C.location.pathname===`/${lang}/special-events/`&&C.location.search==='?focus=event%3A'+event.id,'Exact event destination');
  check(app.innerHTML.includes(`id="${event.id}"`),'Destination exists in actual rendered source');
  check(active()==='#'+event.id,'Exact source event receives focus');
  check(!api.getState().spoiler&&!api.getState().novelConsent,'Event navigation preserves spoiler settings');
  const other=lang==='en'?'he':'en';api.navigate('special-events',other);
  check(C.location.pathname===`/${other}/special-events/`&&C.location.search==='?focus=event%3A'+event.id,'Language retains event');
  check(active()==='#'+event.id,'Language retains focus');
  api.render();check(active()==='#'+event.id,'Rerender retains event focus');
 }
 for(const target of ['unknown','__proto__']){api.navigateSearchResult(`/${lang}/special-events/?focus=event%3A${target}`);check(api.applySearchSelection()===null,'Unknown event rejected');check(api.retainedFocusHref()===null,'Unknown event not retained');}
 const original=C.location.pathname+C.location.search;
 for(const href of ['https://evil.example/en/home/','//evil.example/en/home/',`/${lang}/unknown-route/`,`/${lang}/special-events/?q=private`,`/${lang}/special-events/?focus=event%3Aconcert-2010&spoilers=true`]){api.navigateSearchResult(href);check(C.location.pathname+C.location.search===original,'Unrecognized destinations/queries cannot navigate');}
}
console.log(`Event search navigation: ${checks} simulated-DOM checks passed; real targets, bilingual focus, unknown route/query rejection, unchanged spoiler controls.`);
