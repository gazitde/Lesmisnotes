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
const {ctx}=render('en','home',false);const R=ctx.RESEARCH;
const baseCoachCount=(page,spoilers)=>(page==='musical'?(R.coachVideos||[]).filter(v=>v.songId==='on-my-own'&&v.showWithSong!==false&&v.embeddable&&(spoilers||v.spoilerLevel<2)).length+(spoilers?1:0):0);
const coachCount=(clip,spoilers)=>{if(R.gallery.groups.find(g=>g.clipIds.includes(clip))?.category==='coaching')return 0;const songId=R.gallery.groups.find(g=>g.clipIds.includes(clip))?.songId;return (R.coachVideos||[]).filter(v=>v.songId===songId&&v.showWithSong!==false&&v.embeddable&&(spoilers||v.spoilerLevel<2)).length};
// Six sourced additions: five gated character close readings and one safe design note.
{
 const enriched=R.characters.filter(c=>c.canonNotes?.length),notes=enriched.flatMap(c=>c.canonNotes);
 assert.equal(R.characters.length,10);assert.equal(notes.length,5);assert.equal(new Set(notes.map(n=>n.id)).size,5);tests+=3;
 const escape=v=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 for(const n of notes){assert.equal(n.paragraphs.length,2);assert.ok(n.sourceIds.length);tests+=2;for(const sid of n.sourceIds){const ref=R.sources.find(s=>s.id===sid);assert.ok(ref?.url.startsWith('https://'));assert.ok(ref.label.he&&ref.label.en);tests+=2;}}
 for(const language of ['he','en']){
  const hidden=render(language,'characters',false);assert.ok(!hidden.html.includes('character-canon-note'));tests++;
  const topline=hidden.html.split('<header class="header">')[0];assert.ok(!topline.includes('ENGLISH +'));assert.ok(!topline.includes('עברית +'));assert.ok(hidden.html.includes('data-action="language"'));tests+=3;
  const state=render(language,'characters',true);
  for(const c of enriched){state.callbacks.click({target:{closest:selector=>selector==='a[href]'?null:{dataset:{character:c.id},classList:{contains:()=>false}}}});const html=state.ctx.document.getElementById('character-panel').innerHTML;
   assert.equal((html.match(/class="character-canon-note"/g)||[]).length,c.canonNotes.length);tests++;
   for(const n of c.canonNotes){assert.ok(html.includes(escape(n.title[language])));tests++;for(const text of n.paragraphs){assert.ok(html.includes(escape(text[language])));assert.ok(!hidden.html.includes(escape(text[language])));tests+=2;}}
  }
  const musical=render(language,'musical',false).html,craft=R.musical.creationStory.craft.find(c=>c.id==='hugo-art-onstage');assert.ok(musical.includes('id="craft-hugo-art-onstage"'));assert.ok(musical.includes(escape(craft.title[language])));assert.ok(musical.includes(escape(craft.body[language].split('\n\n')[0])));tests+=3;
 }
}

for(const k of ['story','characters','differences','adaptations']) for(const record of R[k]){
 for(const [key,value] of Object.entries(record)) if(value&&typeof value==='object'&&!Array.isArray(value)&&('he'in value||'en'in value)){assert.ok(value.he&&value.en,`${k}.${record.id}.${key} must be fully bilingual`);tests++}
 for(const sid of record.sourceIds||[]){assert.ok(R.sources.some(s=>s.id===sid),`Missing source ${sid}`);tests++}
}
for(const c of R.characters)for(const x of c.connections){assert.ok(R.characters.some(y=>y.id===x.id),`Unknown character ${x.id}`);tests++}
for(const lang of ['he','en'])for(const route of routes)for(const spoilers of [false,true]){
 const {html,ctx}=render(lang,route,spoilers);
 assert.ok(html.includes('<main id="main"'),`${lang}/${route} must render`);
 assert.equal(ctx.document.documentElement.lang,lang);assert.equal(ctx.document.documentElement.dir,lang==='he'?'rtl':'ltr');
 const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,`${lang}/${route}: duplicate element IDs`);
 for(const ref of html.matchAll(/\saria-(?:labelledby|describedby|controls)="([^"]+)"/g))for(const id of ref[1].split(/\s+/)){assert.ok(ids.includes(id),`${lang}/${route}: missing ARIA target ${id}`);tests++;}
 for(const anchor of html.matchAll(/href="#([^"]+)"/g)){assert.ok(ids.includes(anchor[1]),`${lang}/${route}: missing anchor ${anchor[1]}`);tests++;}
 tests++;
 assert.ok(!html.includes('undefined'));assert.equal((html.match(/<iframe /g)||[]).length,baseCoachCount(route,spoilers),`Only displayed song coaches and the current journey selection may contain players`);
 if(!spoilers&&['story','characters','compare'].includes(route)){
 assert.ok(html.includes(route==='characters'?'data-action="relationship-reveal"':'class="gate"'));assert.ok(!html.includes('class="story-chapter"'));assert.ok(!html.includes('class="char-detail"'));assert.ok(!html.includes('class="adaptation-card"'));
 }
 if(spoilers&&route==='story')assert.equal((html.match(/class="story-chapter"/g)||[]).length,8);
 if(spoilers&&route==='characters')assert.equal((html.match(/class="char-button /g)||[]).length,10);
 if(spoilers&&route==='compare')assert.equal((html.match(/class="adaptation-card"/g)||[]).length,6);
 if(route==='screen')assert.equal((html.match(/class="screen-card"/g)||[]).length,9);
 if(route==='tribute')assert.equal((html.match(/class="gallery-card /g)||[]).length,R.gallery.groups.filter(g=>g.category==='together').length);
 if(route==='resources')assert.equal((html.match(/class="resource-card /g)||[]).length,14);
 tests+=6;
}
// Exercise state changes through the application's real delegated handlers.
{
 const state=render('he','story',false);
 const click=action=>state.callbacks.click({target:{closest:()=>({dataset:{action}})}});
 click('enable-spoilers'); assert.equal((state.app.innerHTML.match(/class="story-chapter"/g)||[]).length,8);
 click('hide-spoilers'); assert.ok(state.app.innerHTML.includes('class="gate"')); assert.ok(!state.app.innerHTML.includes('class="story-chapter"'));
 click('language'); assert.equal(state.ctx.location.pathname,'/en/story/');state.callbacks.hashchange(); assert.equal(state.ctx.document.documentElement.lang,'en');assert.ok(state.app.innerHTML.includes('Follow the musical'));
 let prevented=false;const previousHash=state.ctx.location.hash;state.callbacks['skip-click']({preventDefault(){prevented=true}});assert.ok(prevented);assert.equal(state.ctx.location.hash,previousHash);
 tests+=8;
}
for(const lang of ['he','en']){const st=render(lang,'listening',false);assert.equal((st.html.match(/class="gallery-card /g)||[]).length,R.gallery.groups.length);assert.equal((st.html.match(/data-video-shell=/g)||[]).length,0);st.callbacks.click({target:{closest:()=>({dataset:{galleryClip:'_6nTyXcmgLc'}})}});const html=st.app.innerHTML;assert.ok(html.includes('data-gallery-clip="_6nTyXcmgLc"')&&html.includes('data-gallery-clip="I_h5FnO2Eds"'));assert.ok(html.includes('data-lens="voice"')&&html.includes('data-lens="body"')&&html.includes('data-lens="setting"'));assert.equal((html.match(/data-video-shell=/g)||[]).length,1);tests+=5;}
for(const [id,c] of Object.entries(R.performerCredits))for(const p of c.performers){assert.ok(p.nameHe&&p.nameEn&&p.bioHe&&p.bioEn&&p.roleHe&&p.roleEn&&p.bioUrl);assert.ok(!JSON.stringify(p).includes('confirm the specific'));tests+=2}
assert.ok(appCode.includes('p.pauseVideo()'));assert.ok(appCode.includes('enablejsapi=1&origin='));assert.ok(!appCode.includes('playVideo()'));tests+=3;
const all=fs.readFileSync('dist/index.html','utf8')+fs.readFileSync('dist/style.css','utf8');
assert.ok(!all.match(/https?:\/\//g)||!all.includes('fonts.googleapis'));assert.ok(!all.includes('preconnect'));
assert.ok(appCode.includes('youtube-nocookie.com/embed/'));assert.ok(appCode.includes('strict-origin-when-cross-origin'));
assert.ok(!appCode.includes('autoplay=1'));
// Additional expanded-module checks.
const Q=ctx.QuizEngine,C=R.quiz;
assert.equal(C.questions.length,50);tests++;
for(const track of ['story','musical']){assert.equal(C.questions.filter(q=>q.track===track).length,25);tests++;for(const length of [5,10,25]){let run=Q.start(C,track,length);assert.equal(Q.score(run).answered,0);assert.equal(Q.score(run).correct,0);assert.equal(Q.score(run).percent,0);assert.equal(Q.next(run),run);tests+=4;for(let i=0;i<length;i++){const q=Q.question(C,run.ids[i]);run=Q.select(run,q.correctIndex);run=Q.submit(C,run);assert.equal(Q.score(run).correct,i+1);assert.equal(Q.select(run,(q.correctIndex+1)%4),run);tests+=2;run=Q.next(run)}assert.ok(run.finished);assert.equal(Q.score(run).percent,100);assert.ok(Q.valid(C,run));assert.equal(Q.normalize(C,run).finished,true);tests+=4}}
for(const q of C.questions){assert.equal(q.options.length,4);assert.equal(new Set(q.options.map(x=>x.text.en)).size,4);assert.equal(new Set(q.options.map(x=>x.text.he)).size,4);assert.ok(q.question.en&&q.question.he&&q.explanation.en&&q.explanation.he);assert.ok(q.sources.length&&q.sources.every(s=>/^https:\/\//.test(s.url)));assert.ok(q.correctIndex>=0&&q.correctIndex<4);tests+=6}
for(const lang of ['he','en']){const no=render(lang,'history',false).html,yes=render(lang,'history',true).html;assert.ok(!no.includes(R.history.outcome.body[lang]));assert.ok(yes.includes(R.history.outcome.body[lang]));const quiz=render(lang,'quiz',false).html;assert.ok(!quiz.includes('data-quiz-option'));assert.ok(quiz.includes('quiz-warning'));const graphNo=render(lang,'characters',false).html,graphYes=render(lang,'characters',true).html;assert.ok(graphNo.includes('class="graph-node'));assert.ok(!graphNo.includes('class="char-detail"'));assert.ok(graphYes.includes('class="graph-node'));tests+=6}
for(const group of [R.history.timeline,R.history.contextCards,R.map.places,R.philosophy.dilemmas])for(const r of group){for(const id of r.sourceIds){assert.ok(R.sources.some(s=>s.id===id));tests++}}
for(const lang of ['he','en']){const hidden=render(lang,'musical',false).html,open=render(lang,'musical',true).html;assert.ok(!hidden.includes('id="show-journey"'));assert.ok(open.includes('id="show-journey"'));assert.ok(open.includes('2009'));assert.equal((open.match(/data-show-stop=/g)||[]).length,39);tests+=4;for(const spoiler of [false,true]){const novel=render(lang,'novel',spoiler).html;assert.ok(!novel.includes('class="novel-event"'));tests++}}
for(const lang of ['he','en']){const before=render(lang,'before',false).html;assert.equal((before.match(/class="curtain-stop"/g)||[]).length,5);assert.ok(before.includes('safe-character-intros'));tests+=2;for(const spoiler of [false,true]){const after=render(lang,'after',spoiler).html;assert.ok(after.includes('curtain-gate'));assert.ok(!after.includes('class="curtain-stop"'));const ideas=render(lang,'ideas',spoiler).html;assert.ok(ideas.includes('director-gate'));assert.ok(!ideas.includes('class="director-scene"'));tests+=4}}
for(const q of R.musical.songentries){assert.ok(q.title.he&&q.title.en&&q.summary.he&&q.summary.en);for(const sid of q.sourceIds)assert.ok(R.sources.some(s=>s.id===sid));tests+=2}
assert.equal(new Set(R.musical.songentries.map(s=>s.id)).size,38);assert.equal(R.novel.milestones.length,14);tests+=2;
function walkContent(value){if(!value||typeof value!=='object')return;if(!Array.isArray(value)&&('he' in value||'en' in value)){assert.ok(value.he&&value.en);tests++}if(Array.isArray(value.sourceIds))for(const id of value.sourceIds){assert.ok(R.sources.some(s=>s.id===id),'Unresolved source: '+id);tests++}for(const v of Object.values(value))walkContent(v)}
for(const data of [R.hugo,R.novel,R.musical,R.curtain,R.beforePractical,R.differences,R.history])walkContent(data);
for(const lang of ['he','en']){const html=render(lang,'before',false).html;assert.equal((html.match(/class="fact-/g)||[]).length,4);assert.ok(html.includes('data-seat-choice="whole-stage"'));assert.ok(html.includes('data-seat-choice="close-up"'));assert.ok(html.includes('data-seat-choice="value-overview"'));assert.ok(html.includes(R.beforePractical.family.editorialContentNote.body[lang]));tests+=5}
assert.equal(R.trailers.items.length,7);assert.equal(new Set(R.trailers.items.map(t=>t.youtubeId)).size,7);tests+=2;for(const lang of ['he','en']){const html=render(lang,'screen',false).html;assert.ok(html.includes('trailer-source-notes'));assert.equal((html.match(/data-video-shell=/g)||[]).length,0);assert.ok(html.includes('tubitv.com/movies/560804/les-miserables'));assert.ok(!html.includes('MWdQO5_XMNc'));tests+=3}
assert.equal(R.relatedWorks.items.length,4);tests++;walkContent(R.relatedWorks);
for(const item of R.relatedWorks.items){assert.ok(['TRIBUTE','DIRECT_ADAPTATION'].includes(item.relationship));assert.ok(item.sources.every(u=>/^https:\/\//.test(u)));assert.ok(item.sourceLanguages.length);tests+=3}
for(const lang of ['he','en']){const html=render(lang,'resources',false).html;assert.equal((html.match(/related-work-card /g)||[]).length,4);assert.ok(html.includes('https://www.beyondthebarricade.com/'));assert.ok(html.includes(R.relatedWorks.items[0].relationshipNote[lang]));assert.ok(html.includes(R.relatedWorks.items[1].relationshipLabel[lang]));assert.ok(!html.includes('verificationNotes'));tests+=5}
for(const lang of ['he','en']){const st=render(lang,'before',false);assert.ok(st.html.includes('aria-expanded="false" aria-controls="before-primer-body"'));assert.ok(!st.html.includes(R.curtain.before.primer.paragraphs[0][lang]));assert.ok(st.html.includes('family-themes')&&st.html.includes('family-preparation'));tests+=3;const click=action=>st.callbacks.click({target:{closest:()=>({dataset:{action}})}});click('before-primer');const opened=st.ctx.document.getElementById('before-primer').outerHTML;assert.ok(opened.includes('aria-expanded="true"'));assert.ok(opened.includes('primer-next'));assert.equal(st.ctx.sessionStorage.getItem('barricade-spoilers'),'off');tests+=3;click('language');st.callbacks.hashchange();assert.ok(st.app.innerHTML.includes('aria-expanded="true"'));assert.ok(st.app.innerHTML.includes('primer-next'));tests+=2;click('before-primer');assert.ok(!st.ctx.document.getElementById('before-primer').outerHTML.includes('primer-next'));tests++;const aft=render(lang,'after',false);assert.ok(!aft.html.includes('curtain-extra'));aft.callbacks.click({target:{closest:()=>({dataset:{action:'after-open'}})}});assert.equal((aft.app.innerHTML.match(/class="curtain-extra"/g)||[]).length,5);aft.callbacks.click({target:{closest:()=>({dataset:{action:'hide-spoilers'}})}});assert.ok(!aft.app.innerHTML.includes('curtain-extra'));tests+=3}
for(const lang of ['he','en']){const n=render(lang,'novel',true);assert.ok(!n.html.includes('novel-parts-overviews'));assert.ok(!n.html.includes('novel-remember'));const click=data=>n.callbacks.click({target:{closest:()=>({dataset:data})}});click({action:'novel-open'});assert.equal((n.app.innerHTML.match(/class="novel-event"/g)||[]).length,14);assert.equal((n.app.innerHTML.match(/class="novel-remember"/g)||[]).length,14);assert.equal((n.app.innerHTML.match(/<details><summary><span>/g)||[]).length,5);tests+=5;for(const [id,count] of [['p1',4],['p2',3],['p3',2],['p4',3],['p5',4]]){click({novelPart:id});const html=n.ctx.document.getElementById('novel-timeline-container').innerHTML;assert.equal((html.match(/class="novel-event"/g)||[]).length,count);assert.ok(html.includes('novel-result-count'));assert.equal(html.includes('data-novel-event="bread-prison"'),id==='p1');assert.equal(html.includes('data-novel-event="bishop-silver"'),id==='p1');if(id==='p5')assert.ok(html.includes('novel-filter-example'));tests+=4}click({novelPart:'all'});assert.equal((n.ctx.document.getElementById('novel-timeline-container').innerHTML.match(/class="novel-event"/g)||[]).length,14);tests++;const c=render(lang,'compare',true).html;assert.equal((c.match(/class="adaptation-card"/g)||[]).length,6);assert.equal((c.match(/class="adaptation-side /g)||[]).length,12);assert.equal((c.match(/class="adaptation-depth"/g)||[]).length,6);assert.equal((c.match(/class="adaptation-question"/g)||[]).length,6);assert.ok(!render(lang,'compare',false).html.includes('adaptation-card'));tests+=5}
for(const lang of ['he','en']){const hidden=render(lang,'history',false).html,open=render(lang,'history',true).html;assert.equal((hidden.match(/class="history-depth"/g)||[]).length,5);assert.equal((open.match(/class="history-depth"/g)||[]).length,6);assert.ok(!hidden.includes('data-history-event="1848"'));assert.ok(open.includes('data-history-event="1848"'));assert.ok(!hidden.includes('history-outcome-reflection'));assert.ok(open.includes('history-outcome-reflection'));tests+=6}
for(const lang of ['he','en']){const map=render(lang,'map',false);assert.ok(map.html.includes('place-plot-gate'));assert.ok(!map.html.includes('class="place-plot"'));const click=data=>map.callbacks.click({target:{closest:()=>({dataset:data})}});click({mapStep:'next'});assert.ok(map.ctx.document.getElementById('place-detail').innerHTML.includes(lang==='he'?'דיניה':'Digne'));click({mapScope:'paris'});assert.equal((map.ctx.document.getElementById('atlas-drawing').innerHTML.match(/class="place-node /g)||[]).length,3);click({place:'chanvrerie'});assert.ok(!map.ctx.document.getElementById('place-detail').innerHTML.includes('class="place-plot"'));click({action:'enable-spoilers'});assert.ok(map.app.innerHTML.includes('class="place-plot"'));click({mapNovel:'p4'});assert.equal(map.ctx.location.pathname,`/${lang}/novel/`);assert.ok(map.app.innerHTML.includes('novel-gate'));tests+=8;const home=render(lang,'home',false);assert.equal((home.html.match(/data-home-journey=/g)||[]).length,5);for(const id of ['first','after','book','voices','play']){home.callbacks.click({target:{closest:()=>({dataset:{homeJourney:id}})}});assert.equal((home.ctx.document.getElementById('home-journey-content').innerHTML.match(/class="journey-step"/g)||[]).length,4);tests++}tests++}
for(const p of R.map.places){assert.ok(p.journey.dateLabel.he&&p.journey.dateLabel.en&&p.journey.event.he&&p.journey.event.en);for(const id of p.journey.characterIds){assert.ok(R.characters.some(c=>c.id===id));tests++}assert.ok(p.journey.references.every(r=>r.url.startsWith('https://')));tests+=2}
walkContent(R.loveLine);
for(const lang of ['he','en']){const st=render(lang,'ideas',false);assert.ok(st.html.includes(R.loveLine.userProvidedQuotation));assert.ok(st.html.includes('class="love-lenses"'));assert.ok(st.html.includes('data-action="love-open"'));assert.ok(!st.html.includes('class="love-context"'));assert.ok(!st.html.includes(R.loveLine.novelParallel.french));assert.ok(!st.html.includes(R.loveLine.body[lang][0]));tests+=6;st.callbacks.click({target:{closest:()=>({dataset:{action:'love-open'}})}});assert.ok(st.app.innerHTML.includes('class="love-context"'));assert.ok(st.app.innerHTML.includes(R.loveLine.novelParallel.french));assert.ok(st.app.innerHTML.includes(R.loveLine.body[lang][0]));assert.equal(st.ctx.sessionStorage.getItem('barricade-spoilers'),'on');tests+=4;st.callbacks.click({target:{closest:()=>({dataset:{action:'language'}})}});assert.ok(st.app.innerHTML.includes('class="love-context"'));assert.equal(st.ctx.location.pathname,`/${lang==='he'?'en':'he'}/ideas/`);tests+=2;st.callbacks.click({target:{closest:()=>({dataset:{action:'hide-spoilers'}})}});assert.ok(!st.app.innerHTML.includes('class="love-context"'));assert.ok(st.app.innerHTML.includes('data-action="love-open"'));tests+=2;}
walkContent(R.peoplePower);
for(const lang of ['he','en']){const st=render(lang,'ideas',false);assert.ok(st.html.includes('id="people-power"'));assert.equal((st.html.match(/data-people-lens=/g)||[]).length,3);assert.equal((st.html.match(/data-idea-jump=/g)||[]).length,5);assert.ok(!st.html.includes(R.peoplePower.outcome.body[lang]));assert.ok(!st.html.includes(R.peoplePower.timeline[3].body[lang]));tests+=5;for(const l of R.peoplePower.lenses){st.callbacks.click({target:{closest:()=>({dataset:{peopleLens:l.id}})}});assert.ok(st.ctx.document.getElementById('people-lens-detail').innerHTML.includes(l.body[lang]));tests++}st.callbacks.click({target:{closest:()=>({dataset:{action:'people-open'}})}});assert.ok(st.app.innerHTML.includes(R.peoplePower.outcome.body[lang]));assert.ok(st.app.innerHTML.includes(R.peoplePower.timeline[3].body[lang]));tests+=2;st.callbacks.click({target:{closest:()=>({dataset:{action:'hide-spoilers'}})}});assert.ok(!st.app.innerHTML.includes(R.peoplePower.outcome.body[lang]));tests++;}
for(const lang of ['he','en']){const st=render(lang,'home',false);assert.equal((st.html.match(/class="path-card"/g)||[]).length,3);assert.equal((st.html.match(/data-home-journey=/g)||[]).length,5);for(const id of ['novel','musical','both'])assert.ok(st.html.includes(`class="path-card" data-interest="${id}"`));assert.ok(st.html.indexOf('home-classic-paths')<st.html.indexOf('home-journeys'));tests+=6;}
// Component-enrichment regression checks. All persistence and sharing below use local test doubles.
for(const lang of ['he','en']){
 const c=render(lang,'characters',true);const click=data=>c.callbacks.click({target:{closest:()=>({dataset:data,classList:{contains:()=>false}})}});
 for(const person of R.characters){click({character:person.id});const html=c.ctx.document.getElementById('relationship-graph').innerHTML;const neighbors=new Set([...person.connections.map(x=>x.id),...R.characters.filter(x=>x.connections.some(y=>y.id===person.id)).map(x=>x.id)]);assert.equal((html.match(/data-connection-person=/g)||[]).length,neighbors.size);for(const id of neighbors)assert.ok(html.includes(`data-connection-person="${id}"`));tests+=1+neighbors.size;}
 for(const filter of ['care','love','barricade','all']){click({relationshipFilter:filter});assert.ok(c.ctx.document.getElementById('relationship-graph').innerHTML.includes('graph-connection-list'));tests++;}
 assert.ok(render(lang,'characters',false).html.includes('graph-connections'));tests++;
 const n=render(lang,'novel',false);assert.ok(!n.html.includes('novel-edition'));n.callbacks.click({target:{closest:()=>({dataset:{action:'novel-open'}})}});assert.ok(n.app.innerHTML.includes(R.novel.sourceNote[lang]));for(const x of R.novel.primarySources)assert.ok(n.app.innerHTML.includes(x.url));n.callbacks.click({target:{closest:()=>({dataset:{action:'novel-hide'}})}});assert.ok(!n.app.innerHTML.includes('novel-edition'));tests+=5;
 for(const kind of ['before','after']){const st=render(lang,kind,false);if(kind==='after'){assert.ok(!st.html.includes('curtain-chooser'));st.callbacks.click({target:{closest:()=>({dataset:{action:'after-open'}})}});tests++;}assert.ok(st.app.innerHTML.includes('curtain-chooser'));for(const stop of R.curtain[kind].stops){assert.ok(st.app.innerHTML.includes(`id="curtain-${kind}-${stop.id}"`));assert.ok(st.app.innerHTML.includes(`data-jump="curtain-${kind}-${stop.id}"`));tests+=2;}tests++;}
 const story=render(lang,'story',true).html;assert.ok(story.includes('story-orientation'));for(const id of ['release','fantine','barricade'])assert.ok(story.includes(`data-jump="story-${id}"`));assert.ok(!render(lang,'story',false).html.includes('story-orientation'));tests+=5;
 const hugo=render(lang,'hugo',false).html;assert.equal((hugo.match(/class="hugo-cluster /g)||[]).length,3);for(const sec of R.hugo.sections)assert.ok(hugo.includes(`data-hugo-section="${sec.id}"`));tests+=8;
 const musical=render(lang,'musical',false).html;assert.equal((musical.match(/<dt>/g)||[]).length,4);assert.ok(musical.includes('music-form-primer'));assert.ok(!musical.includes('data-show-select'));tests+=3;
 const screen=render(lang,'screen',false).html;assert.equal((screen.match(/class="screen-family"/g)||[]).length,9);assert.equal((screen.match(/class="branch-number"/g)||[]).length,3);tests+=2;
 const tribute=render(lang,'tribute',false);assert.ok(tribute.ctx.location.search.includes('category=together'));const listen=render(lang,'listening',false);assert.equal((listen.html.match(/data-listen-video=/g)||[]).length,3);tests+=2;
 const ab=render(lang,'about',false);const total=new Set(R.sources.map(x=>x.url)).size;assert.equal((ab.html.match(/class="source-result-topics"/g)||[]).length,24);ab.callbacks.click({target:{closest:()=>({dataset:{sourceTopic:'hugo'}})}});assert.ok(ab.ctx.document.getElementById('source-results').innerHTML.includes('gutenberg'));ab.callbacks.input({target:{matches:()=>true,value:'no-such-zzzzzzzz-source'}});assert.ok(ab.ctx.document.getElementById('source-results').innerHTML.includes('source-empty'));ab.callbacks.click({target:{closest:()=>({dataset:{action:'source-clear'}})}});assert.equal((ab.ctx.document.getElementById('source-results').innerHTML.match(/class="source-result-topics"/g)||[]).length,24);ab.callbacks.input({target:{matches:()=>true,value:'Kretzmer'}});assert.ok(ab.ctx.document.getElementById('source-results').innerHTML.includes('kretzmer'));tests+=5;
 const quiz=render(lang,'quiz',false),qclick=data=>quiz.callbacks.click({target:{closest:()=>({dataset:data})}});let copied='',shared=null,download='';quiz.ctx.navigator={clipboard:{writeText:async text=>{copied=text}},share:async payload=>{shared=payload}};quiz.ctx.Blob=class {constructor(parts){download=parts.join('')}};quiz.ctx.URL={createObjectURL:()=> 'blob:test-local',revokeObjectURL(){}};quiz.ctx.document.createElement=()=>({click(){}});qclick({action:'quiz-start'});for(let i=0;i<5;i++){const run=JSON.parse(quiz.ctx.SitePrivacy.get('barricade-quiz-run')),question=quiz.ctx.QuizEngine.question(R.quiz,run.ids[run.index]);qclick({quizOption:String(question.correctIndex)});qclick({action:'quiz-submit'});qclick({action:'quiz-next'});}assert.ok(quiz.ctx.document.getElementById('quiz-room').innerHTML.includes('quiz-result'));qclick({action:'quiz-copy'});await Promise.resolve();assert.ok(copied.includes('5/5'));assert.ok(!copied.includes('https://'));qclick({action:'quiz-share'});assert.equal(shared,null);assert.ok(quiz.ctx.document.getElementById('share-feedback').innerHTML.includes('wa.me/'));qclick({action:'quiz-share-text'});await Promise.resolve();assert.equal(shared.text,copied);assert.ok(!('url' in shared));qclick({action:'quiz-download'});assert.ok(download.startsWith('<svg'));assert.ok(download.includes('5 / 5'));qclick({action:'quiz-change'});assert.ok(quiz.ctx.document.getElementById('quiz-room').innerHTML.includes('quiz-setup'));tests+=8;
}
for(const source of R.sources){assert.ok(R.sourceGroups.some(g=>g.sourceIds.includes(source.id)));assert.ok(source.label&&(typeof source.label==='string'||source.label.he&&source.label.en),'Each source needs a visible bilingual label');tests+=2;}
// Six adaptation examples remain inside opt-in, progressive disclosure.
for(const difference of R.differences){assert.equal(difference.enrichment.sentences.length,2);assert.ok(difference.enrichment.references.length>0);tests+=2;for(const sentence of difference.enrichment.sentences){assert.ok(sentence.he&&sentence.en);tests++;}for(const ref of difference.enrichment.references){assert.ok(ref.url.startsWith('https://')&&ref.label.he&&ref.label.en);tests++;}}
for(const language of ['he','en']){const closed=render(language,'compare',false).html,opened=render(language,'compare',true).html;assert.ok(!closed.includes('comparison-example'));assert.equal((opened.match(/class="comparison-example"/g)||[]).length,6);assert.equal((opened.match(/<details class="adaptation-depth">/g)||[]).length,6);assert.equal((opened.match(/class="adaptation-pair"/g)||[]).length,6);tests+=4;for(const difference of R.differences)for(const sentence of difference.enrichment.sentences){const escaped=sentence[language].replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));assert.ok(opened.includes(escaped));assert.ok(!closed.includes(escaped));tests+=2;}}
// Context remains sourced; Valjean also explains the later prisoner number.
for(const [kind,items] of [['place',R.map.places],['character',R.characters]])for(const record of items){
 assert.equal(record.context.sentences.length,kind==='character'&&record.id==='valjean'?3:2);assert.ok(record.context.references.length>0);tests+=2;
 for(const sentence of record.context.sentences){assert.ok(sentence.he&&sentence.en);tests++;}
 for(const ref of record.context.references){assert.ok(ref.url.startsWith('https://')&&ref.label.he&&ref.label.en);tests++;}
 if(kind==='place'){assert.equal(record.context.spoilerLevel,0);tests++;}
}
for(const language of ['he','en']){
 const chars=render(language,'characters',true),clickChar=data=>chars.callbacks.click({target:{closest:()=>({dataset:data,classList:{contains:()=>false}})}});
 for(const character of R.characters){clickChar({character:character.id});const html=chars.ctx.document.getElementById('character-panel').innerHTML;assert.ok(html.includes('character-depth'));for(const sentence of character.context.sentences){assert.ok(html.includes(sentence[language].replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))));tests++;}tests++;}
 assert.ok(!render(language,'characters',false).html.includes('character-depth'));tests++;
 const places=render(language,'map',false),clickPlace=data=>places.callbacks.click({target:{closest:()=>({dataset:data,classList:{contains:()=>false}})}});
 for(const scope of ['france','paris']){clickPlace({mapScope:scope});for(const place of R.map.places.filter(p=>scope==='paris'?p.scope==='paris':p.scope!=='paris')){clickPlace({place:place.id});const html=places.ctx.document.getElementById('place-detail').innerHTML;assert.ok(html.includes('place-background'));assert.ok(!html.includes('class="place-plot"'));for(const sentence of place.context.sentences){assert.ok(html.includes(sentence[language].replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))));tests++;}tests+=2;}}
}
// Enriched maps: no invented pairs, complete incoming/outgoing relationships and synchronized selection.
{
 const edgeCode=appCode.slice(appCode.indexOf('const graphPositions='),appCode.indexOf('function graphSet()'));
 const model=vm.runInNewContext(edgeCode+';({edgeKinds,edgeKindPairs,edgeKind,graphPositions})');
 const pairs=new Set(R.characters.flatMap(c=>c.connections.map(e=>[c.id,e.id].sort().join('-'))));
 const typed=Object.values(model.edgeKindPairs).flat();assert.equal(pairs.size,19);assert.equal(typed.length,19);assert.equal(new Set(typed).size,19);tests+=3;
 for(const pair of typed){assert.ok(pairs.has(pair));const [a,b]=pair.split('-');assert.ok(model.edgeKinds[model.edgeKind(a,b)]);tests+=2;}
 const filters={all:R.characters.map(c=>c.id),care:['bishop','valjean','javert','fantine','cosette','thenardiers'],love:['marius','cosette','eponine'],barricade:['marius','enjolras','gavroche']};
 for(const language of ['he','en'])for(const [filter,ids] of Object.entries(filters)){
  const state=render(language,'characters',true),click=data=>state.callbacks.click({target:{closest:()=>({dataset:data,classList:{contains:()=>false}})}});
  click({relationshipFilter:filter});
  for(const id of ids){click({character:id});const html=state.ctx.document.getElementById('relationship-graph').innerHTML;
   const records=R.characters.flatMap(c=>c.connections.map(e=>({owner:c.id,target:e.id,label:e.label}))).filter(e=>(e.owner===id||e.target===id)&&ids.includes(e.owner)&&ids.includes(e.target));
   const friends=new Set(records.map(e=>e.owner===id?e.target:e.owner));
   assert.equal((html.match(/data-connection-person=/g)||[]).length,friends.size);
   for(const friend of friends)assert.ok(html.includes(`data-connection-person="${friend}"`));
   for(const record of records){const escaped=record.label[language].replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));assert.ok(html.includes(escaped));}
   assert.ok(html.includes('graph-focus-heading')&&html.includes('graph-legend'));tests+=2+friends.size+records.length;
  }
 }
 for(const language of ['he','en']){
  const state=render(language,'map',false),click=data=>state.callbacks.click({target:{closest:()=>({dataset:data,classList:{contains:()=>false}})}});
  for(const scope of ['france','paris']){click({mapScope:scope});const places=R.map.places.filter(p=>scope==='paris'?p.scope==='paris':p.scope!=='paris');
   for(const place of places){click({place:place.id});const drawing=state.ctx.document.getElementById('atlas-drawing').innerHTML,detail=state.ctx.document.getElementById('place-detail').innerHTML;
    assert.ok(drawing.includes(`data-place="${place.id}" aria-label=`));assert.ok(drawing.includes('atlas-reading-key'));assert.ok(!detail.includes('class="place-plot"'));assert.ok(detail.includes('place-plot-gate'));
    if(place.id==='waterloo')assert.ok(!drawing.includes('atlas-reading-line active'));tests+=4+(place.id==='waterloo'?1:0);
   }
  }
  assert.ok(render(language,'characters',false).html.includes('graph-legend'));const facts=render(language,'musical',false).html;
  assert.ok(facts.includes('455')&&facts.includes('150m+')&&facts.includes('london.lesmis.com/about-the-show/'));assert.ok(facts.includes('london-snapshot'));tests+=3;
 }
 assert.ok(render('he','map',false).html.includes('<bdi dir="ltr">1796–1815</bdi>'));tests++;assert.ok(appCode.includes('not a map of historical borders'));assert.ok(appCode.includes("plumet:[24,64]"));assert.ok(appCode.includes("luxembourg:[60,74]"));tests+=3;
}
const stylesheet=fs.readFileSync('dist/style.css','utf8');let cssDepth=0;for(const line of stylesheet.split('\n')){if(line.startsWith('@layer'))assert.equal(cssDepth,0,'Named CSS layers must not accidentally nest');cssDepth+=(line.match(/\{/g)||[]).length-(line.match(/\}/g)||[]).length;}assert.equal(cssDepth,0,'CSS braces must balance');tests+=2;
// Explicit journey entry, history continuity and exit never need URL parameters or stored identity.
for(const l of ['he','en']){
 const state=render(l,'home',false);const button=data=>state.callbacks.click({target:{closest:selector=>selector==='a[href]'?null:{dataset:data}}});
 button({homeJourney:'book'});assert.ok(!state.ctx.history.state?.lesmisJourney);tests++;
 const routeLink=(p,journey=null,next=false)=>{const a={getAttribute:()=>`/${l}/${p}/`,dataset:journey?{enterJourney:journey}:{},classList:{contains:k=>next&&k==='journey-next'}};state.callbacks.click({preventDefault(){},target:{closest:selector=>selector==='a[href]'?a:null}})};
 routeLink('hugo','book');assert.equal(state.ctx.history.state.lesmisJourney,'book');assert.ok(state.app.innerHTML.includes('class="journey-continuation"'));assert.ok(state.app.innerHTML.includes(`class="journey-next" href="/${l}/novel/"`));
 routeLink('novel',null,true);assert.equal(state.ctx.history.state.lesmisJourney,'book');assert.ok(!state.app.innerHTML.includes('class="novel-event"'));button({action:'language'});assert.equal(state.ctx.history.state.lesmisJourney,'book');assert.equal(state.ctx.location.pathname,`/${l==='he'?'en':'he'}/novel/`);
 state.ctx.history.replaceState({lesmisJourney:'book'},'',`/${l}/compare/`);state.callbacks.popstate();assert.ok(state.app.innerHTML.includes(`class="journey-next" href="/${l}/musical/"`));button({action:'journey-exit'});assert.equal(state.ctx.history.state,null);assert.ok(!state.app.innerHTML.includes('class="journey-continuation"'));
 routeLink('hugo');assert.ok(!state.app.innerHTML.includes('class="journey-continuation"'));assert.ok(!state.ctx.location.pathname.includes('?'));tests+=11;
 const html=render(l,'musical',false).html,anchor=html.indexOf('id="musical-journey"');assert.ok(anchor>html.indexOf('class="music-primer-disclosure"'));assert.ok(html.slice(anchor).includes('class="gate show-gate"'));assert.ok(!html.slice(anchor).includes('class="music-form-primer"'));tests+=3;
 const home=render(l,'home',false).html;assert.ok(home.indexOf('home-classic-paths')<home.indexOf('class="vinyl"'));assert.ok(!home.includes('class="hero-band"'));assert.ok(home.includes('class="spoiler-label"'));const quiz=render(l,'quiz',false).html;assert.ok(quiz.includes('compact-quiz'));assert.ok(quiz.indexOf('data-action="quiz-start"')<quiz.indexOf('class="quiz-setup-details"'));assert.ok(!quiz.includes('class="quiz-play"'));tests+=5;
}
// Storage tests use isolated fake stores, never a visitor's real browser data.
{
 const disk=new Map([['barricade-lang','en'],['barricade-quiz-run','legacy-quiz'],['unrelated-account','keep']]),reads=[];const store={getItem:k=>{reads.push(k);return disk.get(k)||null},setItem:(k,v)=>disk.set(k,v),removeItem:k=>disk.delete(k)};const c={localStorage:store,sessionStorage:store};c.window=c;vm.createContext(c);vm.runInContext(privacyCode,c);const P=c.SitePrivacy;
 assert.equal(P.get('barricade-lang'),null);assert.equal(P.get('barricade-quiz-run'),null);assert.deepEqual(reads,['barricade-consent-v1']);P.save('barricade-listening','["stars"]');assert.equal(disk.has('barricade-listening'),false);assert.equal(P.get('barricade-listening'),'["stars"]');P.choose({functional:true,analytics:false,media:false});assert.equal(P.get('barricade-lang'),'en');assert.equal(disk.get('barricade-listening'),'["stars"]');assert.equal(P.choice().expiresAt-P.choice().savedAt,180*86400000);
 P.choose({functional:false,analytics:false,media:false});P.forgetMemory();assert.equal(P.get('barricade-quiz-run'),null);assert.equal(disk.get('barricade-quiz-run'),'legacy-quiz');P.eraseOptional();assert.equal(disk.get('unrelated-account'),'keep');assert.ok(disk.has('barricade-consent-v1'));assert.equal(disk.has('barricade-quiz-run'),false);tests+=13;
 const expired={version:1,savedAt:Date.now()-181*86400000,expiresAt:Date.now()-86400000,functional:true,analytics:true,media:true};disk.set('barricade-consent-v1',JSON.stringify(expired));vm.runInContext(privacyCode,c);assert.equal(c.SitePrivacy.choice(),null);assert.equal(c.SitePrivacy.allowed('analytics'),false);tests+=2;
}
// Storage refusal survives blocked APIs; existing progress hydrates only after opt-in.
{
 const c={};c.window=c;for(const key of ['localStorage','sessionStorage'])Object.defineProperty(c,key,{get(){throw new Error('SecurityError')}});vm.createContext(c);vm.runInContext(privacyCode,c);assert.equal(c.SitePrivacy.get('barricade-lang'),null);assert.equal(c.SitePrivacy.get('barricade-spoilers',true),null);c.SitePrivacy.save('barricade-lang','en');c.SitePrivacy.choose({functional:true});tests+=2;
 const state=render('en','listening',false);state.callbacks.click({target:{closest:()=>({dataset:{galleryClip:'_6nTyXcmgLc'}})}});state.ctx.localStorage.setItem('barricade-listening','["stars"]');assert.ok(!state.app.innerHTML.includes('data-check="stars" checked'));state.callbacks.click({target:{closest:selector=>selector==='a[href]'?null:{dataset:{action:'privacy-accept'}}}});assert.ok(state.app.innerHTML.includes('data-check="stars" checked'));assert.notEqual(state.ctx.SitePrivacy.get('barricade-spoilers',true),'on');tests+=3;
}
// Two inert tabs share fake storage; choice changes and expiry notify the other runtime.
{
 let now=Date.now();const disk=new Map(),shared={getItem:k=>disk.get(k)||null,setItem:(k,v)=>disk.set(k,v),removeItem:k=>disk.delete(k)};
 function tab(){const listeners={},c={localStorage:shared,sessionStorage:shared,Date:class extends Date{static now(){return now}},setTimeout:()=>1,clearTimeout(){},addEventListener:(n,fn)=>listeners[n]=fn};c.window=c;vm.createContext(c);vm.runInContext(privacyCode,c);return {c,listeners}}
 const a=tab(),b=tab();a.c.SitePrivacy.choose({functional:true,analytics:true,media:false});b.listeners.storage({key:'barricade-consent-v1'});assert.equal(b.c.SitePrivacy.allowed('analytics'),true);let changes=0;b.c.SitePrivacy.subscribe(()=>changes++);a.c.SitePrivacy.choose({functional:false,analytics:false,media:false});b.listeners.storage({key:'barricade-consent-v1'});assert.equal(b.c.SitePrivacy.allowed('analytics'),false);assert.equal(changes,1);a.c.SitePrivacy.choose({functional:true,analytics:true,media:true});b.listeners.storage({key:'barricade-consent-v1'});now+=181*86400000;b.listeners.focus();assert.equal(b.c.SitePrivacy.choice(),null);assert.equal(changes,3);tests+=5;
}
// No real network calls: the analytics loader is tested against an inert DOM stub.
{
 let permission=false,append=0,script;const c={SITE_CONFIG:{gaMeasurementId:'G-TEST123',gaEnhancedMeasurementDisabled:true},SITE_METADATA:{pages:{home:{},quiz:{},ideas:{}}},SitePrivacy:{allowed:()=>permission},document:{cookie:'unrelated=keep',head:{appendChild:s=>{append++;script=s}},createElement:()=>({remove(){}})}};c.window=c;vm.createContext(c);vm.runInContext(analyticsCode,c);const A=c.SiteAnalytics;A.initialize({videos:['verified-video'],content:{character:['valjean']}});A.context('home','he');A.consent();assert.equal(append,0);assert.equal(c.dataLayer,undefined);assert.equal(A.track('video_play',{video_id:'verified-video'}),false);
 permission=true;A.consent();assert.equal(append,1);assert.equal(A.track('unapproved',{text:'private'}),false);script.onload();const events=()=>c.dataLayer.filter(a=>a[0]==='event');assert.equal(events().length,1);A.context('home','he');assert.equal(events().length,1);A.context('quiz','he');assert.equal(events().length,2);assert.equal(A.track('unapproved',{text:'private'}),false);assert.equal(A.track('quiz_complete',{quiz_track:'story',question_count:5,correct_count:6}),false);assert.equal(A.track('quiz_complete',{quiz_track:'story',question_count:5,correct_count:4}),true);assert.equal(A.track('video_play',{video_id:'unknown'}),false);assert.equal(A.track('video_play',{video_id:'verified-video',free_text:'not allowed'}),false);assert.equal(A.track('video_play',{video_id:'verified-video'}),true);assert.equal(A.track('content_open',{content_type:'character',content_id:'valjean'}),true);
 for(const e of events()){assert.ok(e[2].page_location.startsWith('https://lesmis-guide.invalid/'));assert.equal(e[2].page_referrer,'');assert.ok(!JSON.stringify(e).includes('gazitde'));}permission=false;A.consent();assert.equal(c['ga-disable-G-TEST123'],true);assert.equal(A.active(),false);assert.equal(A.track('video_play',{video_id:'verified-video'}),false);tests+=21;
 const unconfigured={...c,SITE_CONFIG:{gaMeasurementId:'',gaEnhancedMeasurementDisabled:false}};unconfigured.window=unconfigured;vm.createContext(unconfigured);vm.runInContext(analyticsCode,unconfigured);permission=true;unconfigured.SiteAnalytics.consent();assert.equal(unconfigured.SiteAnalytics.configured,false);assert.equal(append,1);tests+=2;
}
// All five paths expose the correct next stop without tracking ordinary browsing.
for(const [journey,pages]of Object.entries({first:['before','story','map','musical'],after:['after','listening','compare','ideas'],book:['hugo','novel','compare','musical'],voices:['listening','musical','screen','after'],play:['quiz','characters','map','history']}))for(const lang of ['he','en']){
 const state=render(lang,'home',false);for(let i=0;i<pages.length;i++){const a={getAttribute:()=>`/${lang}/${pages[i]}/`,dataset:i?{}:{enterJourney:journey},classList:{contains:k=>i>0&&k==='journey-next'}};state.callbacks.click({preventDefault(){},target:{closest:sel=>sel==='a[href]'?a:null}});assert.equal(state.ctx.history.state.lesmisJourney,journey);if(pages[i+1])assert.ok(state.app.innerHTML.includes(`class="journey-next" href="/${lang}/${pages[i+1]}/"`));else assert.ok(!state.app.innerHTML.includes('class="journey-next"'));tests+=2;}
}
// Consent-only returning-visitor features use fake data and never restore plot permission.
for(const lang of ['he','en']){
 const state=render(lang,'home',false),click=data=>state.callbacks.click({target:{closest:sel=>sel==='a[href]'?null:{dataset:data}}});state.ctx.localStorage.setItem('barricade-bookmarks','["history"]');state.ctx.localStorage.setItem('barricade-last-journey',JSON.stringify({id:'book',route:'hugo',updatedAt:1}));assert.ok(!state.app.innerHTML.includes('class="home-memory"'));click({action:'privacy-accept'});assert.ok(state.app.innerHTML.includes('class="home-memory"'));assert.ok(state.app.innerHTML.includes('data-resume-journey="book"'));assert.ok(state.app.innerHTML.includes('class="saved-pages"'));assert.notEqual(state.ctx.SitePrivacy.get('barricade-spoilers',true),'on');
 const link=(p,dataset={})=>state.callbacks.click({preventDefault(){},target:{closest:sel=>sel==='a[href]'?{getAttribute:()=>`/${lang}/${p}/`,dataset,classList:{contains:()=>false}}:null}});link('hugo',{resumeJourney:'book'});assert.equal(state.ctx.history.state.lesmisJourney,'book');click({action:'bookmark-toggle'});assert.ok(JSON.parse(state.ctx.SitePrivacy.get('barricade-bookmarks')).includes('hugo'));link('novel');assert.equal(JSON.parse(state.ctx.SitePrivacy.get('barricade-last-journey')).route,'novel');assert.ok(!state.app.innerHTML.includes('class="novel-event"'));link('home');assert.ok(state.app.innerHTML.includes(`href="/${lang}/novel/" data-resume-journey="book"`));click({action:'privacy-reject'});assert.ok(!state.app.innerHTML.includes('class="home-memory"'));assert.ok(JSON.parse(state.ctx.localStorage.getItem('barricade-bookmarks')).includes('hugo'));tests+=12;
}
// A requested save is idempotent, and abandoning the consent flow abandons the save.
for(const abandonment of ['none','navigate','cancel','erase']){
 const state=render('en','history',false);state.ctx.localStorage.setItem('barricade-bookmarks','["history"]');for(const id of ['privacy-dialog','privacy-erase-dialog']){const n=state.ctx.document.getElementById(id);n.showModal=()=>{};n.close=()=>{}}const click=data=>state.callbacks.click({target:{closest:sel=>sel==='a[href]'?null:{dataset:data}}});click({action:'bookmark-toggle'});
 if(abandonment==='navigate'){const a={getAttribute:()=>'/en/privacy/',dataset:{},classList:{contains:()=>false}};state.callbacks.click({preventDefault(){},target:{closest:sel=>sel==='a[href]'?a:null}})}
 if(abandonment==='cancel')state.callbacks.cancel();if(abandonment==='erase')click({action:'privacy-erase-open'});
 if(abandonment!=='none')state.ctx.localStorage.setItem('barricade-bookmarks','[]');click({action:'privacy-accept'});const list=JSON.parse(state.ctx.SitePrivacy.get('barricade-bookmarks')||'[]');assert.deepEqual(list,abandonment==='none'?['history']:[]);tests++;
}
{
 const now=Date.now(),old={version:1,savedAt:now,expiresAt:now+180*86400000,functional:true,analytics:false,media:false},c={localStorage:{getItem:()=>JSON.stringify(old)},sessionStorage:{getItem:()=>null}};c.window=c;vm.createContext(c);vm.runInContext(privacyCode,c);assert.equal(c.SitePrivacy.choice(),null);assert.equal(c.SitePrivacy.allowed('functional'),false);tests+=2;
}
// Six editorial music spotlights: safe background, gated plot, exact journey targets.
{
 const F=R.musical.spotlight,C=R.musical.creationStory,ids=F.songs.map(s=>s.id);
 assert.equal(F.songs.length,7);assert.equal(new Set(ids).size,7);assert.equal(C.panels.length,3);assert.equal(C.craft.length,5);tests+=4;
 for(const song of F.songs){assert.ok(R.musical.songentries.some(x=>x.id===song.id));assert.equal(song.spoilerLevel,0);assert.equal(song.plotSpoilerLevel,2);for(const k of ['hook','background','question','plot'])assert.ok(song[k].he&&song[k].en);for(const sid of [...song.sourceIds,...song.plotSourceIds])assert.ok(R.sources.some(s=>s.id===sid));tests+=7+song.sourceIds.length+song.plotSourceIds.length;}
 const escaped=t=>t.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 for(const language of ['he','en']){
  const state=render(language,'musical',false);state.ctx.matchMedia=()=>({matches:true});
  const click=data=>state.callbacks.click({target:{closest:selector=>selector==='a[href]'?null:{dataset:data}}});
  assert.equal((state.html.match(/data-featured-song=/g)||[]).length,7);assert.ok(state.html.includes('creation-reception'));assert.ok(state.html.includes('composition-notebook'));assert.ok(!state.html.includes('class="spotlight-context"'));assert.ok(!state.html.includes('id="show-slide"'));tests+=5;
  for(const song of F.songs){click({featuredSong:song.id});const detail=state.ctx.document.getElementById('featured-song-detail').innerHTML;assert.ok(detail.replace(/<[^>]*>/g,'').includes(escaped(song.background[language])));assert.ok(detail.includes(escaped(song.question[language])));assert.ok(!detail.includes(escaped(song.plot[language])));if(song.connection)assert.ok(!detail.includes(escaped(song.connection[language])));assert.ok(detail.includes(`data-song-journey="${song.id}"`));click({songJourney:song.id});assert.ok(!state.app.innerHTML.includes('id="show-slide"'));tests+=5+(song.connection?1:0);}
  click({action:'show-open'});assert.ok(state.app.innerHTML.includes('id="show-current-title" dir="auto">'+escaped(R.musical.songentries.find(s=>s.id===F.songs.at(-1).id).title[language])));assert.ok(state.app.innerHTML.includes('featured-song-badge'));tests+=2;
  for(const song of F.songs){click({featuredSong:song.id});const detail=state.ctx.document.getElementById('featured-song-detail').innerHTML;assert.ok(detail.includes(escaped(song.plot[language])));if(song.connection)assert.ok(detail.includes(escaped(song.connection[language])));click({songJourney:song.id});const journey=state.ctx.document.getElementById('show-journey').outerHTML;assert.ok(journey.includes('id="show-current-title" dir="auto">'+escaped(R.musical.songentries.find(s=>s.id===song.id).title[language])));assert.ok(journey.includes('featured-song-badge'));tests+=3+(song.connection?1:0);}
  click({action:'hide-spoilers'});assert.ok(!state.app.innerHTML.includes('class="spotlight-context"'));assert.ok(!state.app.innerHTML.includes('id="show-slide"'));tests+=2;
 }
 assert.ok(!JSON.stringify(C).includes('500,000'));assert.ok(!JSON.stringify(C).includes('lemonde'));tests+=2;
}
// Single curated gallery: source integrity, progressive details, aliases and navigation.
{
 const G=R.gallery;assert.equal(G.groups.length,37);assert.equal(G.items.length,52);assert.equal(G.categories.length,6);tests+=3;
 const ids=new Set(G.items.map(x=>x.id));assert.equal(ids.size,52);for(const removed of ['GyYZfSmwH3c','__d2FMCtgi4','KPpkTgMbhRU'])assert.ok(!ids.has(removed));tests+=4;
 for(const x of G.items){if(x.externalUrl){assert.ok(x.id.startsWith('external-'));assert.ok(x.externalUrl.startsWith('https://'));assert.equal(x.embeddable,false);assert.ok(x.provider.he&&x.provider.en)}else assert.match(x.id,/^[A-Za-z0-9_-]{11}$/);for(const f of ['title','label','context','notice','language']){assert.ok(x[f]?.he&&x[f]?.en,`${x.id}/${f}`);tests++;}assert.ok(x.sourceIds.length||x.existingCredits);for(const sid of x.sourceIds)assert.ok(R.sources.some(s=>s.id===sid),sid);if(!x.existingCredits){assert.ok(x.credits.length);for(const c of x.credits){assert.ok(c.name.he&&c.name.en&&c.role.he&&c.role.en&&c.url);if(c.bio)assert.ok(c.bio.he&&c.bio.en);}}tests+=3;}
 for(const g of G.groups){for(const id of g.clipIds)assert.ok(ids.has(id));if(g.songId)assert.ok(R.musical.songentries.some(x=>x.id===g.songId));for(const f of ['title','hook','format','question'])assert.ok(g[f].he&&g[f].en);tests+=5;}
 for(const language of ['he','en']){
  const st=render(language,'listening',false),click=data=>st.callbacks.click({target:{closest:()=>({dataset:data,hasAttribute:n=>Object.hasOwn(data,n.replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase()))})}});
  for(const c of ['all',...G.categories.map(x=>x.id)]){click({galleryCategory:c});assert.equal((st.app.innerHTML.match(/class="gallery-card /g)||[]).length,G.groups.filter(x=>c==='all'||x.category===c).length);assert.equal((st.app.innerHTML.match(/data-video-shell=/g)||[]).length,0);tests+=2;}
  click({galleryCategory:'all'});
  for(const x of G.items){click({galleryClip:x.id});let html=st.app.innerHTML;assert.ok(st.ctx.location.search.includes('clip='+x.id));assert.equal((html.match(/<iframe /g)||[]).length,x.spoilerLevel===2?0:(x.embeddable&&!x.externalUrl?1:0)+coachCount(x.id,false));assert.equal((html.match(/data-video-shell=/g)||[]).length,x.spoilerLevel===2?0:(x.embeddable?1:0)+coachCount(x.id,false));if(x.spoilerLevel===2){assert.ok(html.includes('gallery-spoiler-gate'));assert.ok(!html.includes(x.context[language].replace(/&/g,'&amp;')));click({galleryReveal:''});html=st.app.innerHTML;assert.equal((html.match(/data-video-shell=/g)||[]).length,(x.embeddable?1:0)+coachCount(x.id,true));click({action:'hide-spoilers'});}else assert.ok(html.includes('added-media-credits'));tests+=5;}
  click({galleryClip:'I_h5FnO2Eds'});click({action:'language'});assert.ok(st.ctx.location.search.includes('I_h5FnO2Eds'));assert.ok(st.app.innerHTML.includes('data-video-shell="I_h5FnO2Eds"'));click({galleryClose:''});assert.ok(!st.ctx.location.search.includes('clip='));assert.equal((st.app.innerHTML.match(/data-video-shell=/g)||[]).length,0);tests+=4;
  for(const [alias,cat]of [['humor','humor'],['tribute','together']]){const a=render(language,alias,false);assert.equal(a.ctx.location.pathname,`/${language}/listening/`);assert.equal(a.ctx.location.search,'?category='+cat);assert.equal((a.html.match(/class="gallery-card /g)||[]).length,G.groups.filter(x=>x.category===cat).length);tests+=3;}
  const m=render(language,'musical',false),mc=data=>m.callbacks.click({target:{closest:()=>({dataset:data})}});for(const song of R.musical.spotlight.songs){mc({featuredSong:song.id});const html=m.ctx.document.getElementById('featured-song-detail').innerHTML;assert.ok(html.includes('data-gallery-link='));assert.equal((html.match(/data-video-shell=/g)||[]).length,(R.coachVideos||[]).filter(v=>v.songId===song.id&&v.showWithSong!==false&&v.embeddable&&v.spoilerLevel<2).length);tests+=2;}
  for(const p of routes){const html=render(language,p,false).html;assert.equal((html.match(/data-video-shell=/g)||[]).length,baseCoachCount(p,false));assert.equal((html.match(/<iframe /g)||[]).length,baseCoachCount(p,false));tests+=2;}
 }
 for(const [id,v]of Object.entries(R.videoReach)){assert.ok(Number.isSafeInteger(v.views)&&v.views>0);assert.equal(v.liveCounter,false);assert.ok(v.sourceUrl.endsWith(id));tests+=3;}
 assert.equal(G.items.find(x=>x.id==='Cn8PiqIXEjQ').embeddable,false);assert.equal(G.items.find(x=>x.id==='YL8gH0yELbk').embeddable,false);tests+=2;
}
console.log(`PASS: ${tests+4} assertions; ${routes.filter(route=>!routeMetadata.window.SITE_METADATA.pages[route].canonicalRoute).length} primary routes + 2 aliases × 2 languages × 2 spoiler states, all ${R.gallery.items.length} curated versions, source references, privacy, quizzes and map regressions.`);
console.log('This is source/render QA, not browser playback or mobile interaction QA.');

for(const language of ['he','en']){
 const state=render(language,'home',false);assert.equal((state.html.match(/class="path-card" data-interest=/g)||[]).length,3);assert.ok(state.html.includes('data-enter-journey="first"'));assert.ok(state.html.includes('data-home-journey="voices"'));assert.ok(!state.html.includes('class="home-memory"'));
 state.ctx.localStorage.setItem('barricade-last-journey',JSON.stringify({id:'first',route:'story',updatedAt:1}));state.callbacks.click({target:{closest:sel=>sel==='a[href]'?null:{dataset:{action:'privacy-accept'}}}});
 assert.ok(state.app.innerHTML.indexOf('class="home-memory"')<state.app.innerHTML.indexOf('class="home-opening interest-home"'));assert.equal((state.app.innerHTML.match(/class="home-memory"/g)||[]).length,1);assert.ok(state.app.innerHTML.includes(`href="/${language}/story/" data-resume-journey="first"`));
}
console.log('PASS: 14 clear-home-entry and opt-in early-resume render checks.');
// Relationships are a first-class safe entry; the richer full-story layer stays optional.
{
 const pair=(a,b)=>[a,b].sort().join('-');const safe=R.relationships.filter(e=>e.spoilerLevel===0);let n=0;
 assert.equal(R.relationships.length,16);assert.equal(safe.length,6);n+=2;
 for(const e of R.relationships){assert.ok(R.characters.some(c=>c.id===e.from)&&R.characters.some(c=>c.id===e.to));for(const l of ['he','en']){assert.ok(e.label[l]&&e.context[l]);if(e.spoilerLevel===0)assert.ok(e.safeLabel[l]&&e.safeContext[l]&&e.safeKind)}for(const r of e.references)assert.ok(/^https:\/\/www\.gutenberg\.org\//.test(r.url)||/^https:\/\/www\.mtishows/.test(r.url));n+=4;}
 const escaped=x=>x.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 for(const lang of ['he','en'])for(const spoilers of [false,true]){
  const st=render(lang,'characters',spoilers);assert.ok(st.html.indexOf('id="relationship-map"')<st.html.indexOf(spoilers?'id="character-detail"':'class="safe-character-overview"'));assert.ok(st.html.includes('id="relationship-person"'));n+=2;
  for(const c of R.characters){st.callbacks.click({target:{closest:()=>({dataset:{character:c.id},classList:{contains:()=>false}})}});const html=st.ctx.document.getElementById('relationship-graph').innerHTML;
   assert.equal((html.match(/data-edge=/g)||[]).length,spoilers?19:6);assert.ok(html.includes('graph-dot'));n+=2;
   for(const e of R.relationships){if(!spoilers){assert.ok(!html.includes(escaped(e.context[lang])));n++;}if([e.from,e.to].includes(c.id)&&(spoilers||e.spoilerLevel===0)){assert.ok(html.includes(escaped((spoilers?e.context:e.safeContext)[lang])));for(const r of spoilers?e.references:e.safeReferences)assert.equal(html.includes(r.url),!/^https:\/\/(?:www\.)?mtishows\./.test(r.url));n+=2;}}
  }
 }
 console.log(`PASS: ${n} additional relationship-map checks: all people, 6 safe / 19 full pairs, 16 source-backed HE/EN contexts, optional plot layer and visible first entry.`);
}
// Substantial bilingual reading, with permission filtering before rendering and indexing.
{
 let n=0;const data=R.musical.songAnalysis,ids=Object.keys(data),anchors=ids.filter(id=>data[id].blocks.some(b=>b.spoilerLevel<2));assert.equal(ids.length,38);assert.equal(anchors.length,7);assert.equal(ids.reduce((n,id)=>n+data[id].blocks.length,0),114);n+=3;
 const escaped=x=>x.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 for(const id of ids){assert.ok(R.musical.songentries.some(s=>s.id===id));for(const b of data[id].blocks){assert.ok(b.title.he&&b.title.en&&b.body.he&&b.body.en);for(const locale of ['he','en'])assert.ok(b.body[locale].trim().length>=60,'Complete editorial block '+id+locale);assert.ok([0,2].includes(b.spoilerLevel));n+=3;}for(const sid of data[id].sourceIds){assert.ok(R.sources.some(s=>s.id===sid));n++;}}
 for(const lang of ['he','en']){
  const safe=render(lang,'musical',false),open=render(lang,'musical',true);safe.ctx.matchMedia=open.ctx.matchMedia=()=>({matches:true});
  const click=(s,data)=>s.callbacks.click({target:{closest:selector=>selector==='a[href]'?null:{dataset:data}}});
  for(const id of anchors){click(safe,{featuredSong:id});const html=safe.ctx.document.getElementById('featured-song-detail').innerHTML;for(const b of data[id].blocks){assert.equal(html.includes(escaped(b.body[lang])),b.spoilerLevel<2);assert.equal(html.includes(escaped(b.title[lang])),b.spoilerLevel<2);n+=2;}assert.ok(!html.includes('song-reading-related'));assert.ok(!html.includes('song-craft-note'));n+=2;}
  for(const id of ids){click(open,{songJourney:id});const html=open.ctx.document.getElementById('show-journey').outerHTML;for(const b of data[id].blocks){assert.ok(html.includes(escaped(b.title[lang])));assert.ok(html.includes(escaped(b.body[lang])));n+=2;}}
  const d=render(lang,'ideas',false),yes=render(lang,'ideas',true);
  for(const [i,item]of R.philosophy.dilemmas.entries()){click(d,{dilemma:String(i)});click(yes,{dilemma:String(i)});const no=d.ctx.document.getElementById('dilemma-content').innerHTML,full=yes.ctx.document.getElementById('dilemma-content').innerHTML;
   for(const p of item.contextParagraphs){assert.ok(no.includes(escaped(p[lang]))&&full.includes(escaped(p[lang])));n++;}
   for(const p of item.deepening.paragraphs){assert.ok(!no.includes(escaped(p[lang]))&&full.includes(escaped(p[lang])));n++;}
   assert.ok(!no.includes(escaped(item.deepening.title[lang]))&&full.includes(escaped(item.deepening.title[lang])));assert.equal((no.match(/class="perspective"/g)||[]).length,3);n+=2;
  }
 }
 const searchContext={window:{}};vm.runInNewContext(fs.readFileSync('dist/search.js','utf8'),searchContext);const S=searchContext.window.SiteSearch;const safeIndex=S.buildIndex({research:R},{spoiler:false}),fullIndex=S.buildIndex({research:R},{spoiler:true});
 for(const id of ids)for(const lang of ['he','en']){const no=safeIndex.find(d=>d.id==='song:'+id),yes=fullIndex.find(d=>d.id==='song:'+id);assert.ok(yes);for(const b of data[id].blocks){assert.equal(Boolean(no?.body[lang].includes(b.body[lang])),b.spoilerLevel<2);assert.ok(yes.body[lang].includes(b.body[lang]));n+=2;}}
 for(const item of R.philosophy.dilemmas)for(const lang of ['he','en']){const no=safeIndex.find(d=>d.id==='dilemma:'+item.id),yes=fullIndex.find(d=>d.id==='dilemma:'+item.id);for(const p of item.contextParagraphs){assert.ok(no.body[lang].includes(p[lang]));n++;}for(const p of item.deepening.paragraphs){assert.ok(!no.body[lang].includes(p[lang])&&yes.body[lang].includes(p[lang]));n++;}}
 console.log(`PASS: ${n} enriched-reading assertions; 38 song entries, 114 HE/EN blocks, seven safe anchors, five developed dilemmas, exact source IDs and no gated text in safe HTML/search.`);
}
{
 const c={window:{}};vm.runInNewContext(fs.readFileSync('dist/search.js','utf8'),c);const index=c.window.SiteSearch.buildIndex({research:R},{spoiler:true});let n=0;
 for(const g of R.gallery.groups.filter(g=>g.category!=='coaching')){for(const id of g.clipIds){const item=R.gallery.items.find(i=>i.id===id),songId=Array.isArray(item.songIds)?item.songIds[0]:g.songId,reading=R.musical.songAnalysis[songId];if(!reading)continue;const doc=index.find(d=>d.id==='performance:'+id);if(!doc)continue;for(const b of reading.blocks)for(const lang of ['he','en']){assert.equal(doc.body[lang].includes(b.body[lang]),b.kind==='listening');n++;}}}
 assert.ok(R.musical.songentries.find(s=>s.id==='javert-soliloquy').sourceIds.includes('iconic-aversa-analysis'));n++;
 console.log(`PASS: ${n} performance-search parity and original-source preservation checks.`);
}
// Original coach commentaries remain separate from curated performances and share safe player plumbing.
{
 let n=0;const list=R.coachVideos;assert.equal(list.length,10);assert.equal(new Set(list.map(v=>v.id)).size,list.length);n+=2;
 const escaped=x=>x.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 for(const v of list){assert.match(v.id,/^[\w-]{11}$/);assert.ok(R.musical.spotlight.songs.some(s=>s.id===v.songId));assert.ok(R.gallery.items.some(x=>x.id===v.id&&x.kind==='coach'));assert.ok(v.coach.url.startsWith('https://'));assert.equal(v.language,'en');assert.equal(v.embeddable,true);if(v.durationSeconds){assert.ok(v.durationSeconds>0);assert.match(v.durationLabel,/^\d+:\d{2}$/)}else{assert.ok(!v.durationLabel)}assert.ok(!('verification'in v));n+=9;for(const sid of v.sourceIds){assert.ok(R.sources.some(s=>s.id===sid));n++;}for(const field of [v.title,v.body,v.watchFor,v.coach.credential])for(const l of ['he','en']){assert.ok(field[l]?.length>15);n++;}if(v.suggestedChapter){assert.ok(v.suggestedChapter.seconds<v.durationSeconds);assert.ok(v.suggestedChapter.url.startsWith('https://www.youtube.com/watch?v='+v.id+'&t='))}n+=2;}
 for(const language of ['he','en'])for(const spoilers of [false,true]){
  const st=render(language,'musical',spoilers),click=data=>st.callbacks.click({target:{closest:selector=>selector==='a[href]'?null:{dataset:data}}});st.ctx.matchMedia=()=>({matches:true});
  for(const v of list.filter(v=>v.showWithSong!==false)){click({featuredSong:v.songId});const html=st.ctx.document.getElementById('featured-song-detail').innerHTML,ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);assert.equal((html.match(/data-coach-analysis=/g)||[]).length,1);assert.ok(html.includes(escaped(v.introParagraphs[0][language])));assert.ok(html.includes(escaped(v.listeningGuide[0].body[language])));assert.ok(html.includes('autoplay=0'));assert.ok(html.includes('data-video-instance="coach-spotlight-'+v.id+'"'));assert.ok(html.includes('youtube.com/watch?v='+v.id));if(v.suggestedChapter)assert.ok(html.includes(escaped(v.suggestedChapter.label[language])));n+=8;}
 }
 // Synthetic protected copy exercises the same gate without classifying the real safe choices as spoilers.
 for(const language of ['he','en']){const st=render(language,'musical',false),v=st.ctx.RESEARCH.coachVideos[0];v.spoilerLevel=2;const click=data=>st.callbacks.click({target:{closest:selector=>selector==='a[href]'?null:{dataset:data}}});click({featuredSong:v.songId});let html=st.ctx.document.getElementById('featured-song-detail').innerHTML;assert.ok(!html.includes(escaped(v.introParagraphs[0][language])));assert.ok(!html.includes('<iframe'));assert.ok(html.includes('data-coach-reveal='));click({coachReveal:'coach-spotlight-'+v.id});assert.ok(st.app.innerHTML.includes(escaped(v.introParagraphs[0][language])));assert.ok(st.app.innerHTML.includes('youtube-nocookie.com/embed/'+v.id));click({action:'hide-spoilers'});assert.ok(!st.app.innerHTML.includes(escaped(v.introParagraphs[0][language])));assert.ok(!st.app.innerHTML.includes('youtube-nocookie.com/embed/'+v.id));n+=7;}
 console.log(`PASS: ${n} vocal-coach data, bilingual context, source, player-instance and synthetic spoiler-gate checks.`);
}
// Act structure remains legible without altering the canonical song sequence.
{
 let n=0;const entries=R.musical.songentries;assert.equal(entries.filter(s=>s.act===1).length,20);assert.equal(entries.filter(s=>s.act===2).length,18);assert.equal(entries[19].id,'one-day-more');assert.equal(entries[20].id,'building-barricade');n+=4;
 for(const lang of ['he','en']){const st=render(lang,'musical',true),click=data=>st.callbacks.click({target:{closest:selector=>selector==='a[href]'?null:{dataset:data}}});assert.equal((st.html.match(/<optgroup /g)||[]).length,3);assert.equal((st.html.match(/<option value=/g)||[]).length,39);assert.ok(st.html.includes('show-act-ribbon'));n+=3;
  for(const i of [19,20,21,20,19]){click({showStop:String(i)});const html=st.ctx.document.getElementById('show-slide').innerHTML,ribbon=st.ctx.document.getElementById('show-act-ribbon').innerHTML;assert.ok(ribbon.includes('aria-current="step"'));assert.equal(html.includes('interval-slide'),i===20);assert.equal(html.includes('data-act-boundary="end-one"'),i===19);assert.equal(html.includes('data-act-boundary="begin-two"'),i===21);n+=4;}
  click({showAct:'1'});let html=st.ctx.document.getElementById('show-journey').outerHTML;assert.equal((html.match(/<option value=/g)||[]).length,21);n++;click({showStop:'20'});assert.ok(st.ctx.document.getElementById('show-slide').innerHTML.includes('data-show-open-act="2"'));n++;click({showOpenAct:'2'});html=st.ctx.document.getElementById('show-journey').outerHTML;assert.equal((html.match(/<option value=/g)||[]).length,18);assert.ok(html.includes('data-act-boundary="begin-two"'));n+=2;
  const safe=render(lang,'musical',false).html;assert.ok(!safe.includes('data-act-boundary='));assert.ok(safe.includes(lang==='he'?'שתי מערכות. הפסקה אחת.':'Two acts. One interval.'));n+=2;
 }
 console.log(`PASS: ${n} act-boundary order, HE/EN selector, forward/back state, filtered transition and safe-static-structure checks.`);
}
// Novel side-stories follow the separate after-show permission, including search.
{
 let n=0;const d=R.hugoExtras,escape=x=>x.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));assert.equal(d.stories.length,4);assert.equal(new Set(d.stories.map(x=>x.id)).size,4);assert.ok(!JSON.stringify(d).includes('noveltyAudit'));n+=3;
 for(const x of d.stories){assert.equal(x.spoilerLevel,2);assert.equal(x.paragraphs.length,3);assert.ok(!('noveltyAudit'in x));n+=3;for(const l of ['he','en']){assert.ok(x.title[l]&&x.kicker[l]);assert.ok(x.paragraphs.every(p=>p[l].split(/\s+/).length>=35));n+=2;}for(const r of x.references){assert.match(r.url,/^https:\/\/www\.gutenberg\.org\/files\/135\/135-h\/135-h.htm#link2HCH\d+$/);assert.ok(R.sources.some(s=>s.url===r.url));n+=2;}}
 for(const l of ['he','en'])for(const spoilers of [false,true]){const st=render(l,'after',spoilers),click=action=>st.callbacks.click({target:{closest:()=>({dataset:{action}})}});for(const x of d.stories){assert.ok(!st.html.includes(escape(x.title[l])));assert.ok(!st.html.includes(escape(x.paragraphs[0][l])));n+=2;}click('after-open');const full=st.app.innerHTML;assert.equal((full.match(/class="hugo-extra-card"/g)||[]).length,4);assert.equal((full.match(/class="curtain-stop"/g)||[]).length,5);assert.ok(full.includes('data-jump="hugo-extra-stories"'));assert.ok(!full.includes('noveltyAudit'));n+=4;for(const x of d.stories){assert.ok(full.includes(escape(x.title[l])));for(const p of x.paragraphs){assert.ok(full.includes(escape(p[l])));n++;}n++;}click('after-hide');for(const x of d.stories){assert.ok(!st.app.innerHTML.includes(escape(x.title[l])));n++;}click('after-open');click('hide-spoilers');assert.ok(!st.app.innerHTML.includes('hugo-extra-card'));n++;}
 const c={window:{}};vm.runInNewContext(fs.readFileSync('dist/search.js','utf8'),c);const S=c.window.SiteSearch;
 for(const spoiler of [false,true])for(const afterConsent of [false,true])for(const novelConsent of [false,true]){const idx=S.buildIndex({research:R},{spoiler,afterConsent,novelConsent});const docs=idx.filter(x=>x.kind==='extra');assert.equal(docs.length,spoiler&&afterConsent?4:0);n++;for(const x of docs)for(const l of ['he','en']){assert.equal(S.hrefFor(x,l),`/${l}/after/?focus=extra%3A${x.key}`);assert.ok(x.body[l].includes(d.stories.find(s=>s.id===x.key).paragraphs[2][l]));n+=2;}}
 for(const l of ['he','en']){const html=fs.readFileSync(`dist/${l}/after/index.html`,'utf8');for(const x of d.stories){assert.ok(!html.includes(escape(x.title[l])));assert.ok(!html.includes(escape(x.paragraphs[0][l])));n+=2;}}
 console.log(`PASS: ${n} Hugo side-story checks: four original HE/EN episodes, nine exact chapter references, all five existing stops, separate after-show gating, search boundaries and safe static HTML.`);
}
