'use strict';
// Real application integration in a deterministic VM; actual browser/layout checks are separate.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=process.env.LESMIS_SOURCE||path.resolve(__dirname,'..'),code=name=>fs.readFileSync(path.join(root,'dist',name+'.js'),'utf8');
const expose=`window.__completionTest={multilingualNote,hugoStories,hugoClusters,musicalCreationDepth,comparisonJourney,setConsent(s,a){spoiler=s;afterConsent=a},cache(data){readingPartCache.set(data.part,data)}};})();`;
function boot(language,search=''){
 const disk=new Map(),session=new Map(),listeners={},nodes=new Map();let focused='';
 const node=id=>{if(!nodes.has(id))nodes.set(id,{classList:{add(){},remove(){}},focus(){focused=id},setAttribute(){},scrollIntoView(){},querySelectorAll(){return[]},style:{}});return nodes.get(id)};
 const app={innerHTML:'',addEventListener(){}},storage=data=>({getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)});
 const ctx={console,URLSearchParams,localStorage:storage(disk),sessionStorage:storage(session),setTimeout:()=>1,clearTimeout(){},document:{documentElement:{},title:'',addEventListener(){},querySelectorAll:()=>[],getElementById:id=>id==='app'?app:node(id),querySelector:selector=>selector.startsWith('#')?node(selector.slice(1)):{...node(selector),addEventListener(){}}},location:{pathname:`/${language}/${search?'after':'novel'}/`,search,hash:'',origin:'https://example.test'},history:{state:null}};
 ctx.history.replaceState=ctx.history.pushState=(state,_,href)=>{const url=new URL(href,ctx.location.origin);Object.assign(ctx.location,{pathname:url.pathname,search:url.search,hash:url.hash});ctx.history.state=state};ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=(name,fn)=>listeners[name]=fn;vm.createContext(ctx);
 for(const name of ['research','extras','character-profiles-data','character-profiles','quiz-engine','seo','policies','privacy','site-config','analytics','places-data','places','recipes-data','recipes','search','chapter-completion','book-stage-data','book-stage'])vm.runInContext(code(name),ctx);
 vm.runInContext(code('app').replace(/\}\)\(\);\s*$/,expose),ctx);
 const api=ctx.__completionTest;api.cache(JSON.parse(fs.readFileSync(path.join(root,'dist/reading/part-1.json'),'utf8')));
 return {ctx,api,app,disk,session,listeners,focused:()=>focused};
}



for(const language of ['he','en'])test(`multilingual notes retain sources, native disclosures and consent (${language})`,()=>{
 const {ctx,api}=boot(language),notes=ctx.EXTRA_CONTENT.multilingualNotes;
 assert.deepEqual(Object.keys(notes).sort(),['arabic-conscience','catherine-return','german-translation','manuscript-name']);
 for(const note of Object.values(notes)){
  for(const key of ['title','lead','summary','body'])for(const lang of ['he','en'])assert.ok(note[key][lang].trim(),key+' '+lang);
  for(const ref of note.references){assert.match(ref.url,/^https:\/\//);assert.ok(ref.label.he&&ref.label.en);}
 }
 assert.equal(api.multilingualNote('unknown'),'');
 const direct=boot(language,'?focus=extra%3Acosette-catherine');
 assert.ok(!direct.app.innerHTML.includes(notes['catherine-return'].lead[language]),'Direct finale link does not grant spoiler consent');
 assert.equal(api.multilingualNote('catherine-return'),'');
 assert.equal(api.multilingualNote('arabic-conscience'),'');
 assert.ok(!api.hugoStories().includes('catherine-return'));
 for(const id of ['german-translation','manuscript-name']){
  const html=api.multilingualNote(id);assert.ok(html.includes(notes[id].lead[language]));
  assert.match(html,/<aside class="comparison-example multilingual-note"/);
  assert.match(html,/<details class="source-disclosure"><summary>/);
  assert.ok(!html.includes('<iframe')&&!html.includes('<img'),'No new media is loaded');
  assert.ok(!html.includes(' open'),'Depth starts closed');
 }
 assert.ok(api.musicalCreationDepth().includes('data-multilingual-note="german-translation"'));
 assert.ok(api.hugoClusters().includes('data-multilingual-note="manuscript-name"'));
 api.setConsent(true,false);
 assert.ok(api.comparisonJourney().includes('data-multilingual-note="arabic-conscience"'));
 assert.equal(api.multilingualNote('catherine-return'),'','General plot consent is insufficient for finale');
 assert.equal(api.hugoStories(),'');
 api.setConsent(false,true);
 assert.equal(api.multilingualNote('catherine-return'),'','After-page consent alone is insufficient');
 api.setConsent(true,true);
 const finale=api.multilingualNote('catherine-return');
 assert.ok(finale.includes(notes['catherine-return'].lead[language]));
 for(const target of ['p2-b3-c8','p5-b9-c5','epilogue'])assert.ok(finale.includes(target));
 assert.ok(api.hugoStories().includes('data-multilingual-note="catherine-return"'));
 for(const [id,note] of Object.entries(notes))for(const ref of note.references){
  const rendered=api.multilingualNote(id).includes(ref.url.replaceAll('&','&amp;'));
  const technical=/^https?:\/\/(?:www\.)?mtishows\.(?:com|co\.uk)(?:\/|$)/i.test(ref.url);
  assert.equal(rendered,!technical,'Existing technical-source filtering: '+ref.url);
 }
});
