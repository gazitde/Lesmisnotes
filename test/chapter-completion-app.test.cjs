'use strict';
// Real application integration in a deterministic VM; actual browser/layout checks are separate.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=process.env.LESMIS_SOURCE||path.resolve(__dirname,'..'),code=name=>fs.readFileSync(path.join(root,'dist',name+'.js'),'utf8');
const expose=`window.__completionTest={chapterCompletion,render,navigate,navigateReader,readingHref,updateReadingChapter,privacyAction,applyPrivacy,readingHierarchyBody,selectedReading,cache(data){readingPartCache.set(data.part,data)},spoiler:()=>spoiler};})();`;
function boot(language){
 const disk=new Map(),session=new Map(),listeners={},nodes=new Map();let focused='';
 const node=id=>{if(!nodes.has(id))nodes.set(id,{classList:{add(){},remove(){}},focus(){focused=id},setAttribute(){},scrollIntoView(){},querySelectorAll(){return[]},style:{}});return nodes.get(id)};
 const app={innerHTML:'',addEventListener(){}},storage=data=>({getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)});
 const ctx={console,URLSearchParams,localStorage:storage(disk),sessionStorage:storage(session),setTimeout:()=>1,clearTimeout(){},document:{documentElement:{},title:'',head:{appendChild(){}},createElement:()=>({setAttribute(){}}),addEventListener(){},querySelectorAll:()=>[],getElementById:id=>id==='app'?app:node(id),querySelector:selector=>selector.startsWith('#')?node(selector.slice(1)):{...node(selector),addEventListener(){}}},location:{pathname:`/${language}/novel-journey/`,search:'',hash:'',origin:'https://example.test'},history:{state:null}};
 ctx.history.replaceState=ctx.history.pushState=(state,_,href)=>{const url=new URL(href,ctx.location.origin);Object.assign(ctx.location,{pathname:url.pathname,search:url.search,hash:url.hash});ctx.history.state=state};ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=(name,fn)=>listeners[name]=fn;vm.createContext(ctx);
 for(const name of ['research','extras','character-profiles-data','character-profiles','quiz-engine','seo','policies','privacy','site-config','analytics','places-data','places','recipes-data','recipes','search','chapter-completion'])vm.runInContext(code(name),ctx);
 vm.runInContext(code('app').replace(/\}\)\(\);\s*$/,expose),ctx);
 const api=ctx.__completionTest;api.cache(JSON.parse(fs.readFileSync(path.join(root,'dist/reading/part-1.json'),'utf8')));
 return {ctx,api,app,disk,session,listeners,focused:()=>focused};
}
for(const language of ['he','en'])test(`real app reader, language, history and privacy transitions preserve explicit semantics (${language})`,()=>{
 const {ctx,api,app,disk,session,listeners}=boot(language),tracker=api.chapterCompletion,first='p1-b1-c1',second='p1-b1-c2';
 assert.equal(tracker.snapshot().total,365);assert.equal(tracker.snapshot().count,0);assert.match(app.innerHTML,/data-completion-progress max="365" value="0"/);
 api.navigateReader(api.readingHref('chapter',first));assert.equal(tracker.snapshot().count,0);assert.match(app.innerHTML,new RegExp('data-completion-mark="'+first+'"'));
 tracker.mark(first);tracker.mark(first);api.render();assert.equal(tracker.snapshot().count,1);assert.match(app.innerHTML,/data-completion-progress max="365" value="1"/);assert.match(app.innerHTML,new RegExp('data-completion-undo="'+first+'">'));
 api.updateReadingChapter(second);assert.equal(tracker.snapshot().count,1);api.navigate('novel-journey',language==='he'?'en':'he');assert.equal(tracker.snapshot().count,1);assert.equal(api.selectedReading().key,second);assert.match(app.innerHTML,language==='he'?/Mark chapter read/:/סיימתי את הפרק/);
 const previous=`/${language}/novel-journey/?focus=chapter%3A${first}`;ctx.history.pushState(null,'',previous);listeners.popstate?.();assert.equal(api.selectedReading().key,first);assert.equal(tracker.snapshot().count,1);assert.equal(disk.has('barricade-completed-chapters-v1'),false);
 api.applyPrivacy({functional:true,analytics:false,media:false});assert.equal(JSON.parse(disk.get('barricade-completed-chapters-v1')).completed[0],first);
 const lastReading=disk.get('barricade-last-reading'),spoilerBefore=JSON.stringify([...session]);tracker.mark(second);assert.equal(disk.get('barricade-last-reading'),lastReading);assert.equal(JSON.stringify([...session]),spoilerBefore);assert.equal(api.spoiler(),false);assert.ok(!app.innerHTML.includes('class="chapter-wide-links"'));
 api.applyPrivacy({functional:false,analytics:false,media:false});assert.equal(tracker.snapshot().count,0);assert.match(app.innerHTML,/data-completion-progress max="365" value="0"/);assert.equal(JSON.parse(disk.get('barricade-completed-chapters-v1')).completed.length,2);
 api.applyPrivacy({functional:true,analytics:false,media:false});assert.equal(tracker.snapshot().count,2);api.privacyAction('privacy-erase-confirm');assert.equal(tracker.snapshot().count,0);assert.equal(disk.has('barricade-completed-chapters-v1'),false);assert.match(app.innerHTML,/data-completion-progress max="365" value="0"/);
});

for(const language of ['he','en'])test(`contextual remembering changes only functional consent and preserves exact reader and spoilers (${language})`,()=>{
 const {ctx,api,app,disk,session}=boot(language),tracker=api.chapterCompletion,first='p1-b1-c1';
 for(const analytics of [false,true]){
  api.applyPrivacy({functional:false,analytics,media:true});
  api.navigateReader(api.readingHref('chapter',first));tracker.mark(first);api.render();
  const href=ctx.location.pathname+ctx.location.search,spoilerKeys=['barricade-spoilers','barricade-novel-consent','barricade-after-consent'],spoilers=spoilerKeys.map(k=>session.get(k));
  assert.equal(ctx.SitePrivacy.allowed('functional'),false);
  assert.equal(api.privacyAction('privacy-remember-progress'),true);
  assert.equal(ctx.SitePrivacy.allowed('functional'),true);
  assert.equal(ctx.SitePrivacy.allowed('analytics'),analytics);
  assert.equal(ctx.SitePrivacy.allowed('media'),true);
  assert.deepEqual(JSON.parse(disk.get('barricade-completed-chapters-v1')).completed,[first]);
  assert.equal(ctx.location.pathname+ctx.location.search,href);
  assert.deepEqual(spoilerKeys.map(k=>session.get(k)),spoilers);assert.notEqual(session.get('barricade-quiz-consent'),'on');
  assert.match(app.innerHTML,/data-completion-temporary hidden/);
 }
});

test('contextual grant with blocked storage leaves session marks and temporary disclosure intact',()=>{
 const {ctx,api,app,disk}=boot('en'),tracker=api.chapterCompletion;
 api.applyPrivacy({functional:false,analytics:false,media:false});
 api.navigateReader(api.readingHref('chapter','p1-b1-c1'));tracker.mark('p1-b1-c1');api.render();
 ctx.localStorage.setItem=()=>{throw Error('Storage unavailable')};
 api.privacyAction('privacy-remember-progress');
 assert.equal(ctx.SitePrivacy.allowed('functional'),false);
 assert.equal(disk.has('barricade-completed-chapters-v1'),false);
 assert.match(app.innerHTML,/data-completion-temporary>/);
 tracker.mark('p1-b1-c2');assert.equal(tracker.snapshot().count,2);
});

test('contextual remembering from a book-level chapter restores the acted-on control without changing scope',()=>{
 const {ctx,api,focused}=boot('en');
 api.navigateReader(api.readingHref('book','p1-b1'));api.chapterCompletion.mark('p1-b1-c2');api.render();
 const href=ctx.location.pathname+ctx.location.search;
 api.privacyAction('privacy-remember-progress',{closest:()=>({dataset:{chapterCompletion:'p1-b1-c2'}})});
 assert.equal(ctx.location.pathname+ctx.location.search,href);
 assert.match(focused(),/data-completion-undo="p1-b1-c2"/);
});

test('ordinary rejection still applies in-memory privacy cleanup when consent persistence fails',()=>{
 const {ctx,api,app}=boot('en');
 api.applyPrivacy({functional:true,analytics:false,media:false});
 api.chapterCompletion.mark('p1-b1-c1');api.render();
 ctx.localStorage.setItem=()=>{throw Error('Storage unavailable')};
 api.privacyAction('privacy-reject');
 assert.equal(ctx.SitePrivacy.allowed('functional'),false);
 assert.equal(api.chapterCompletion.snapshot().count,0);
 assert.match(app.innerHTML,/data-completion-progress max="365" value="0"/);
});

for(const language of ['he','en'])test(`reader counts distinguish the selected route from Hugo's complete structure (${language})`,()=>{
 const {api,app}=boot(language);
 for(const [part,selected,total] of [[2,7,8],[4,14,15],[5,8,9]]){
  api.navigateReader(`/${language}/novel-journey/?focus=part%3Ap${part}`);
  assert.match(app.innerHTML,new RegExp(language==='he'?`${selected} מתוך ${total} ספרים`:`${selected} OF ${total} BOOKS`));
  api.navigateReader(`/${language}/novel-journey/?focus=part%3Ap${part}&essays=all`);
  assert.match(app.innerHTML,new RegExp(language==='he'?`${total} ספרים ברומן המלא`:`${total} BOOKS IN THE COMPLETE NOVEL`));
 }
});

for(const language of ['he','en'])test(`reading progress is visible before chapter selection, without duplicate controls (${language})`,()=>{
 const {api,app}=boot(language);
 for(const href of [`/${language}/novel-journey/`,`/${language}/novel-journey/?focus=chapter%3Ap1-b1-c1`]){
  api.navigateReader(href);
  const html=app.innerHTML;
  assert.equal((html.match(/id="chapter-progress-title"/g)||[]).length,1);
  assert.ok(html.indexOf('class="chapter-progress"') < html.indexOf('id="reading-current"'));
  assert.ok(html.indexOf('data-completion-progress') < html.indexOf('class="reader-settings"'));
 }
});

for(const language of ['he','en'])test(`exact English source heading enriches only the selected chapter (${language})`,()=>{
 const {api,app}=boot(language);
 api.navigateReader(api.readingHref('chapter','p1-b1-c1'));
 assert.match(app.innerHTML,/<span lang="en" dir="ltr">CHAPTER I—M\. MYRIEL<\/span>/);
 assert.ok(app.innerHTML.includes(language==='he'?'שם הפרק בתרגום האנגלי':'Chapter heading in Isabel Hapgood'));
 assert.equal((app.innerHTML.match(/class="chapter-source-title"/g)||[]).length,1);
 api.navigateReader(api.readingHref('book','p1-b1'));
 assert.ok(!app.innerHTML.includes('class="chapter-source-title"'),'Opening a Book does not silently expose future source headings');
});

for(const language of ['he','en'])test(`Hebrew reading links are discoverable, accurately scoped and do not replace exact English chapters (${language})`,()=>{
 const {api,app,disk,session}=boot(language);
 const volumes=['https://benyehuda.org/read/43076','https://benyehuda.org/read/43194'];
 for(const href of [`/${language}/novel-journey/`,api.readingHref('chapter','p1-b1-c1')]){
  api.navigateReader(href);
  const html=app.innerHTML;
  for(const url of [...volumes,'https://benyehuda.org/read/43193']){
   assert.ok(html.includes(`href="${url}" target="_blank" rel="noopener noreferrer"`));
   assert.ok(!html.includes(url+'#'),'No guessed chapter anchors');
  }
  assert.ok(html.includes(language==='he'?'מקוצר, וחלוקת הפרקים ומספורם שונים':'abridged, with chapter divisions and numbering that differ'));
  assert.ok(html.includes(`href="/${language}/israel/#israel-read-in-hebrew"`));
  assert.equal((html.match(/class="reader-hebrew-edition(?: reader-hebrew-compact)?"/g)||[]).length,1);
  assert.equal(api.spoiler(),false);
  assert.equal(disk.has('barricade-last-reading'),false);
  assert.notEqual(session.get('barricade-spoilers'),'on');
 }
 assert.match(app.innerHTML,/<details class="reader-hebrew-edition reader-hebrew-compact">/,'A focused chapter keeps the edition choice compact');
 assert.match(app.innerHTML,/href="https:\/\/www\.gutenberg\.org\/cache\/epub\/135\/pg135-images\.html#link2HCH0001"/);
 api.navigateReader(api.readingHref('book','p1-b1'));
 assert.equal((app.innerHTML.match(/reader-hebrew-compact/g)||[]).length,0,'Do not repeat an edition panel for every chapter in a Book');
});
