'use strict';
// Actual application and privacy code, with in-memory storage only. Never touches visitor data.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),code=name=>fs.readFileSync(path.join(root,'dist',name+'.js'),'utf8');
const RUN='barricade-quiz-run',QUIZ_CONSENT='barricade-quiz-consent';
const expose=`window.__quizTest={render,navigate,handleQuizAction,updateQuiz,quizRoomContent,quizResetDialog,initQuiz,run:()=>quizRun,consent:()=>quizConsent,select:i=>{quizRun=Q.select(quizRun,i)},spoiler:()=>spoiler};})();`;
function boot(language='en',{disk=new Map(),session=new Map(),functional=true}={}){
 const now=Date.now();if(functional!==undefined)disk.set('barricade-consent-v1',JSON.stringify({version:3,savedAt:now,expiresAt:now+180*86400000,functional,analytics:false,media:true}));
 const nodes=new Map();let focused='';
 const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',open:false,classList:{add(){},remove(){}},focus(){focused=id},setAttribute(){},scrollIntoView(){},showModal(){this.open=true},close(){this.open=false},querySelectorAll(){return[]},style:{}});return nodes.get(id)};
 const app={innerHTML:'',addEventListener(){}},storage=data=>({getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)});
 const ctx={console,URLSearchParams,localStorage:storage(disk),sessionStorage:storage(session),setTimeout:()=>1,clearTimeout(){},document:{documentElement:{},title:'',head:{appendChild(){}},createElement:()=>({setAttribute(){}}),addEventListener(){},querySelectorAll:()=>[],getElementById:id=>id==='app'?app:node(id),querySelector:selector=>({...node(selector),addEventListener(){}})},location:{pathname:`/${language}/quiz/`,search:'',hash:'',origin:'https://example.test'},history:{state:null}};
 ctx.history.replaceState=ctx.history.pushState=(state,_,href)=>{const url=new URL(href,ctx.location.origin);Object.assign(ctx.location,{pathname:url.pathname,search:url.search,hash:url.hash});ctx.history.state=state};ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=()=>{};vm.createContext(ctx);
 for(const name of ['research','extras','quiz-engine','seo','policies','privacy','site-config','analytics','places-data','places','recipes-data','recipes'])vm.runInContext(code(name),ctx);
 vm.runInContext(code('app').replace(/\}\)\(\);\s*$/,expose),ctx);
 const api=ctx.__quizTest;
 return {ctx,api,app,disk,session,nodes,focused:()=>focused,act:a=>api.handleQuizAction(a),html:()=>api.quizRoomContent()};
}
function finish(h){h.act('quiz-start');for(let i=0;i<5;i++){h.api.select(0);h.act('quiz-submit');h.act('quiz-next')}}
function confirm(h){h.act('quiz-delete');h.act('quiz-delete-confirm')}
const nonQuiz=map=>[...map].filter(([key])=>![RUN,QUIZ_CONSENT].includes(key));
for(const language of ['he','en']){
 test(`reset stays visible in setup, play and result; cancel preserves answers (${language})`,()=>{
  const h=boot(language);
  for(const state of ['setup','play','result']){
   if(state==='play')h.act('quiz-start');if(state==='result')finish(h);
   assert.equal((h.html().match(/data-action="quiz-delete"/g)||[]).length,1);
   const before=JSON.stringify(h.api.run()),disk=JSON.stringify([...h.disk]),session=JSON.stringify([...h.session]);
   h.act('quiz-delete');assert.equal(h.nodes.get('quiz-reset-dialog').open,true);assert.match(h.focused(),/quiz-delete-cancel/);
   assert.equal(JSON.stringify(h.api.run()),before);h.act('quiz-delete-cancel');
   assert.equal(h.nodes.get('quiz-reset-dialog').open,false);assert.match(h.focused(),/quiz-delete"/);
   assert.equal(JSON.stringify(h.api.run()),before);assert.equal(JSON.stringify([...h.disk]),disk);assert.equal(JSON.stringify([...h.session]),session);
  }
  assert.match(h.api.quizResetDialog(),language==='en'?/This cannot be undone/:/אין אפשרות לבטל את המחיקה/);
  assert.match(h.api.quizResetDialog(),/aria-describedby="quiz-reset-description"/);
 });
 for(const functional of [true,false])test(`quiz reset clears only quiz state with remembering ${functional?'on':'off'} (${language})`,()=>{
  const h=boot(language,{functional});
  h.act('quiz-start');h.api.select(1);h.act('quiz-submit');
  // A prior saved round may remain on disk after remembering is turned off.
  h.disk.set(RUN,JSON.stringify(h.api.run()));
  for(const [key,value]of [['barricade-last-reading','{"kind":"chapter","key":"p1-b1-c3"}'],['barricade-completed-chapters-v1','{"completed":["p1-b1-c1"]}'],['barricade-bookmarks','["novel"]'],['barricade-listening','["stars"]'],['barricade-last-journey','{"id":"novel"}'],['unrelated-key','untouched']]){h.disk.set(key,value);h.ctx.SitePrivacy.save(key,value)}
  const optional=h.ctx.SitePrivacy.optionalKeys.filter(key=>key!==RUN),memory=optional.map(key=>h.ctx.SitePrivacy.get(key));
  for(const key of ['barricade-spoilers','barricade-after-consent','barricade-novel-consent'])h.session.set(key,'on');
  const disk=nonQuiz(h.disk),session=nonQuiz(h.session),spoilers=h.api.spoiler();
  confirm(h);assert.equal(h.api.run(),null);assert.equal(h.api.consent(),false);
  assert.equal(h.disk.has(RUN),false);assert.equal(h.session.has(QUIZ_CONSENT),false);assert.equal(h.ctx.SitePrivacy.get(RUN),null);
  assert.deepEqual(nonQuiz(h.disk),disk);assert.deepEqual(nonQuiz(h.session),session);assert.equal(h.api.spoiler(),spoilers);
  assert.deepEqual(optional.map(key=>h.ctx.SitePrivacy.get(key)),memory,'Other optional visit memory remains untouched');
  assert.match(h.html(),language==='en'?/Quiz reset\./:/החידון אופס/);assert.match(h.focused(),/quiz-delete"/);
  h.api.updateQuiz();assert.equal(h.disk.has(RUN),false,'Rendering setup must not rewrite a null saved round');
  h.ctx.SitePrivacy.choose({functional:true,analytics:false,media:true});assert.equal(h.ctx.SitePrivacy.get(RUN),null,'Later remembering must not resurrect deleted memory');
  const again=boot(language,{disk:h.disk,session:h.session});assert.equal(again.api.run(),null,'Reload must not restore the reset round');
 });
 test(`setup can remove a dormant saved round without reading it or opting in (${language})`,()=>{
  const old=boot(language);finish(old);const disk=new Map([[RUN,JSON.stringify(old.api.run())]]);
  const h=boot(language,{disk,functional:false});assert.equal(h.api.run(),null);
  confirm(h);assert.equal(disk.has(RUN),false);assert.equal(h.ctx.SitePrivacy.allowed('functional'),false);
 });
}
test('confirmation is required and repeated stale confirmation cannot delete a new round',()=>{
 const h=boot();h.act('quiz-start');const run=h.api.run();h.act('quiz-delete-confirm');assert.equal(h.api.run(),run);
 confirm(h);h.act('quiz-start');const next=h.api.run();h.act('quiz-delete-confirm');assert.equal(h.api.run(),next);
});
test('blocked storage is reported and a later explicit reset can finish targeted deletion',()=>{
 const h=boot();finish(h);const before=h.disk.get(RUN),remove=h.ctx.localStorage.removeItem;
 h.ctx.localStorage.removeItem=()=>{throw Error('Storage blocked')};confirm(h);
 assert.equal(h.api.run(),null);assert.equal(h.disk.get(RUN),before);assert.equal(h.ctx.SitePrivacy.get(RUN),'null');
 assert.match(h.html(),/browser storage could not be cleared/);assert.doesNotMatch(h.html(),/Quiz reset\./);
 h.ctx.localStorage.removeItem=remove;confirm(h);assert.equal(h.disk.has(RUN),false);assert.match(h.html(),/Quiz reset\./);
});
test('targeted removal rejects unknown and wrong-store keys, including the privacy preference',()=>{
 const h=boot(),p=h.ctx.SitePrivacy,before=JSON.stringify([...h.disk]);
 for(const [key,session]of [[p.key,false],['unrelated-key',false],[QUIZ_CONSENT,false],[RUN,true]])assert.equal(p.remove(key,session),false);
 assert.equal(JSON.stringify([...h.disk]),before);
});

test('resetting a completed round removes its badge, review and resumable result',()=>{
 const h=boot();finish(h);assert.match(h.html(),/class="quiz-result"/);confirm(h);
 assert.doesNotMatch(h.html(),/class="quiz-result"|class="quiz-review"|id="quiz-achievement-preview"|data-action="quiz-resume"/);
 assert.match(h.html(),/class="quiz-setup/);assert.equal(h.disk.has(RUN),false);
});
