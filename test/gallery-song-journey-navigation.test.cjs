'use strict';
// Real app click, render, language and popstate handlers; no browser or external requests.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),code=name=>fs.readFileSync(path.join(root,'dist',name+'.js'),'utf8');
function boot(lang,spoilers=false){
 const disk=new Map(),session=new Map(spoilers?[['barricade-spoilers','on']]:[]),listeners={},nodes=new Map();let renders=0,html='';
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,classList:{add(){},remove(){}},focus(){},setAttribute(){},scrollIntoView(){},querySelectorAll:()=>[],style:{}});return nodes.get(id)};
 const app={get innerHTML(){return html},set innerHTML(value){renders++;html=value},addEventListener(){}},storage=data=>({getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)});
 const initial=`/${lang}/listening/?clip=_6nTyXcmgLc`,ctx={console,URLSearchParams,localStorage:storage(disk),sessionStorage:storage(session),setTimeout:()=>1,clearTimeout(){},document:{documentElement:{},title:'',addEventListener(){},querySelectorAll:()=>[],getElementById:id=>id==='app'?app:node(id),querySelector:selector=>selector.startsWith('#')?node(selector.slice(1)):{...node(selector),addEventListener(){}}},location:{pathname:`/${lang}/listening/`,search:'?clip=_6nTyXcmgLc',hash:'',origin:'https://example.test'},history:{state:null}};
 const entries=[{href:initial,state:null}];let index=0,pushes=0;
 const apply=entry=>{const url=new URL(entry.href,ctx.location.origin);Object.assign(ctx.location,{pathname:url.pathname,search:url.search,hash:url.hash});ctx.history.state=entry.state};
 ctx.history.replaceState=(state,unused,href)=>{entries[index]={state,href};apply(entries[index])};
 ctx.history.pushState=(state,unused,href)=>{pushes++;entries.splice(index+1);entries.push({state,href});index++;apply(entries[index])};
 const go=delta=>{assert.ok(entries[index+delta]);index+=delta;apply(entries[index]);listeners.popstate()};
 ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=(name,fn)=>listeners[name]=fn;vm.createContext(ctx);
 for(const name of ['research','extras','character-profiles-data','character-profiles','quiz-engine','seo','policies','privacy','site-config','analytics','places-data','places','recipes-data','recipes','search','chapter-completion','book-stage-data','book-stage'])vm.runInContext(code(name),ctx);
 vm.runInContext(code('app').replace(/\}\)\(\);\s*$/,`window.__galleryJourneyTest={handleClick,currentShowStop,selectedReading,spoiler:()=>spoiler};})();`),ctx);
 const click=dataset=>{const button={dataset,hasAttribute:()=>false};ctx.__galleryJourneyTest.handleClick({target:{closest:selector=>selector==='button'?button:null},preventDefault(){}})};
 return {ctx,api:ctx.__galleryJourneyTest,app,session,click,go,renders:()=>renders,pushes:()=>pushes,href:()=>ctx.location.pathname+ctx.location.search,initial};
}
function assertJourney(h,lang,spoilers){
 assert.equal(h.ctx.location.pathname,`/${lang}/musical-journey/`);
 assert.equal(new URLSearchParams(h.ctx.location.search).get('focus'),'song:stars');
 assert.equal(new URLSearchParams(h.ctx.location.search).get('view'),'journey');
 assert.equal(h.api.selectedReading().key,'stars');assert.equal(h.api.currentShowStop().id,'stars');
 assert.ok(h.app.innerHTML.includes('class="musical-journey-page"'),'The URL has a matching rendered journey page');
 assert.ok(!h.app.innerHTML.includes('id="featured-song-detail"'),'Reference spotlight DOM is not left behind');
 assert.equal(h.app.innerHTML.includes('data-action="show-open"'),!spoilers,'Existing global spoiler choice is preserved');
 assert.equal(h.app.innerHTML.includes('id="show-slide"'),spoilers,'Only previously consented journeys render scene content');
 assert.equal(h.api.spoiler(),spoilers);assert.ok(!h.app.innerHTML.includes('autoplay=1'));
}
for(const lang of ['he','en'])for(const spoilers of [false,true])test(`gallery song click renders the final journey once and retains consent/history (${lang}, spoilers ${spoilers})`,()=>{
 const h=boot(lang,spoilers),stored=h.session.get('barricade-spoilers'),renders=h.renders(),pushes=h.pushes();
 assert.ok(h.app.innerHTML.includes('data-gallery-song="stars"'),'Exercise an actual rendered gallery action');
 h.click({gallerySong:'stars'});assert.equal(h.renders()-renders,1,'One render at the final URL');assert.equal(h.pushes()-pushes,1,'One new history entry');assertJourney(h,lang,spoilers);
 h.go(-1);assert.equal(h.href(),h.initial);assert.ok(h.app.innerHTML.includes('id="gallery-detail"'));assert.ok(!h.app.innerHTML.includes('id="show-slide"'));
 h.go(1);assertJourney(h,lang,spoilers);
 const other=lang==='he'?'en':'he';h.click({action:'language'});assertJourney(h,other,spoilers);
 h.go(-1);assertJourney(h,lang,spoilers);assert.equal(h.session.get('barricade-spoilers'),stored,'Navigation does not grant or withdraw consent');
});
for(const lang of ['he','en'])test(`invalid gallery song cannot change URL, DOM, consent or history (${lang})`,()=>{
 const h=boot(lang),before={href:h.href(),html:h.app.innerHTML,renders:h.renders(),pushes:h.pushes()};h.click({gallerySong:'not-a-song'});
 assert.equal(h.href(),before.href);assert.equal(h.app.innerHTML,before.html);assert.equal(h.renders(),before.renders);assert.equal(h.pushes(),before.pushes);assert.equal(h.api.spoiler(),false);
});
