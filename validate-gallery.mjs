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
const routes=['humor','home','story','characters','listening','compare','screen','tribute','resources','about','map','history','ideas','quiz','musical','novel','hugo','before','after','sitemap','terms','privacy'];
const renderScripts=[research,extras,engine,seo,policiesCode,privacyCode,configCode,analyticsCode,...['places-data','places','recipes-data','recipes'].map(name=>fs.readFileSync('dist/'+name+'.js','utf8')),appCode].map(code=>new vm.Script(code));
function render(lang,route,spoilers){
 global.gc?.();
 const map=new Map([['barricade-spoilers',spoilers?'on':'off']]);
 const storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const callbacks={};
 const app={innerHTML:'',addEventListener(type,fn){callbacks[type]=fn}};
 const nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{classList:{add(){},remove(){}},focus(){},select(){},setAttribute(){},scrollIntoView(){},style:{}});return nodes.get(id)};
 const context={console,URLSearchParams,document:{addEventListener(type,fn){callbacks['document-'+type]=fn},querySelectorAll:()=>[],querySelector:()=>({focus(){},select(){},setAttribute(){},addEventListener(type,fn){callbacks['skip-'+type]=fn}}),getElementById:id=>id==='app'?app:node(id),documentElement:{},title:''},localStorage:storage,sessionStorage:storage,location:{hash:`#/${lang}/${route}`,pathname:'/'},history:{},setTimeout:()=>1,clearTimeout:()=>{}};
 context.history.replaceState=context.history.pushState=(a,b,path)=>{context.history.state=a;const u=new URL(path,'https://example.test');context.location.pathname=u.pathname;context.location.search=u.search;context.location.hash=''};
 context.window=context;context.window.scrollTo=()=>{};context.window.addEventListener=(type,fn)=>callbacks[type]=fn;
 vm.createContext(context);for(const script of renderScripts)script.runInContext(context);
 return {html:app.innerHTML,ctx:context,app,callbacks};
}

const R=render('en','home',false).ctx.RESEARCH;
const coachCount=(clip,spoilers)=>{if(R.gallery.groups.find(g=>g.clipIds.includes(clip))?.category==='coaching')return 0;const songId=R.gallery.groups.find(g=>g.clipIds.includes(clip))?.songId;return (R.coachVideos||[]).filter(v=>v.songId===songId&&v.showWithSong!==false&&v.embeddable&&(spoilers||v.spoilerLevel<2)).length};
const tap=(st,data)=>st.callbacks.click({target:{closest:selector=>selector==='button'?{dataset:data,hasAttribute:n=>Object.hasOwn(data,n.replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase()))}:null}});
let checks=0;
for(const language of ['he','en']){
 for(const spoilerState of [false,true])for(const item of R.gallery.items){const st=render(language,'listening',spoilerState);tap(st,{galleryClip:item.id});const html=st.app.innerHTML,ids=[...html.matchAll(/(?:^|\s)id="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length,item.id);assert.equal((html.match(/<iframe /g)||[]).length,item.spoilerLevel===2&&!spoilerState?0:(item.embeddable&&!item.externalUrl?1:0)+coachCount(item.id,spoilerState));assert.ok(!html.includes('undefined'));assert.equal((html.match(/data-video-shell=/g)||[]).length,item.spoilerLevel===2&&!spoilerState?0:(item.embeddable?1:0)+coachCount(item.id,spoilerState));assert.ok(html.includes('gallery-detail'));checks+=5;}
 const st=render(language,'listening',false);tap(st,{galleryCategory:'humor'});const first={...st.ctx.location};tap(st,{galleryClip:'wdcS0Nbo7Ng'});const second={...st.ctx.location};assert.ok(st.app.innerHTML.includes('data-added-media="wdcS0Nbo7Ng"'));tap(st,{action:'language'});assert.ok(st.ctx.location.search.includes('wdcS0Nbo7Ng'));assert.ok(st.ctx.location.search.includes('humor'));Object.assign(st.ctx.location,first);st.callbacks.popstate();assert.ok(!st.app.innerHTML.includes('id="gallery-detail"'));assert.equal((st.app.innerHTML.match(/class="gallery-card /g)||[]).length,R.gallery.groups.filter(x=>x.category==='humor').length);Object.assign(st.ctx.location,second);st.callbacks.popstate();assert.ok(st.app.innerHTML.includes('data-added-media="wdcS0Nbo7Ng"'));checks+=6;
 // Exact per-song links target one known gallery version and leave full-story details gated.
 const m=render(language,'musical',false);for(const song of R.musical.spotlight.songs){tap(m,{featuredSong:song.id});const html=m.ctx.document.getElementById('featured-song-detail').innerHTML;const match=html.match(/href="([^"]+)" data-gallery-link="([^"]+)"/);assert.ok(match);const a={dataset:{galleryLink:match[2]},getAttribute:()=>match[1].replace(/&amp;/g,'&')};m.callbacks.click({preventDefault(){},target:{closest:sel=>sel==='a[data-gallery-link]'?a:null}});assert.equal(m.ctx.location.pathname,`/${language}/listening/`);assert.ok(m.ctx.location.search.includes(match[2]));checks+=3;const link={getAttribute:()=>`/${language}/musical/`,dataset:{}};m.callbacks.click({preventDefault(){},target:{closest:sel=>sel==='a[href]'?link:null}});}
 const bad=render(language,'listening',false);bad.ctx.location.search='?clip=unrecognized&category=unknown';bad.callbacks.popstate();assert.ok(!bad.app.innerHTML.includes('id="gallery-detail"'));assert.equal((bad.app.innerHTML.match(/class="gallery-card /g)||[]).length,R.gallery.groups.length);checks+=2;
}
console.log(`PASS: ${checks} gallery checks: ${R.gallery.items.length*4} bilingual/spoiler/version render states, unique IDs, direct performance and coach players, language, Back/Forward, exact song links and invalid-query fallback.`);

{const st=render('en','listening',false);tap(st,{galleryClip:'_6nTyXcmgLc'});const original=st.ctx.document.getElementById;st.ctx.document.getElementById=id=>['progress-text','progress-fill'].includes(id)?null:original(id);st.callbacks.change({target:{matches:sel=>sel==='[data-check]',dataset:{check:'stars'},checked:true}});assert.ok(st.ctx.SitePrivacy.get('barricade-listening').includes('stars'));console.log('PASS: selected listening checkbox works without legacy progress elements.');}

// An external provider never gets a YouTube fallback or an eager embed, even if bad metadata asks for one.
for(const language of ['he','en']){const st=render(language,'listening',false),G=st.ctx.RESEARCH.gallery;const id='external-provider-test';G.items.push({id,title:{he:'בדיקת מקור',en:'Source test'},label:{he:'פרסום מקורי',en:'Original publication'},context:{he:'הקשר לדוגמה לבדיקה בלבד.',en:'Test-only context.'},notice:{he:'קישור חיצוני',en:'External link'},language:{he:'אנגלית',en:'English'},provider:{he:'מקור לדוגמה',en:'Example provider'},externalUrl:'https://example.org/original-video',embeddable:true,credits:[],sourceIds:[]});G.groups.push({id:'test-group',category:'unexpected',clipIds:[id],title:{he:'בדיקה',en:'Test'},hook:{he:'בדיקה',en:'Test'},format:{he:'בדיקה',en:'Test'},question:{he:'בדיקה',en:'Test'}});tap(st,{galleryClip:id});const html=st.app.innerHTML;assert.ok(html.includes('href="https://example.org/original-video"'));assert.ok(html.includes('media-provider'));assert.ok(!html.includes('youtube.com/watch?v='+id));assert.ok(!html.includes('data-video-shell='));assert.ok(!html.includes('<iframe'));}
console.log('PASS: external-provider fail-closed rendering in both languages.');

for(const language of ['he','en']){const st=render(language,'listening',false);for(const g of R.gallery.groups){const escaped=g.title[language].replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));assert.ok(st.html.includes('aria-label="'+escaped+' — '));}const story=render(language,'story',false).html;assert.ok(story.includes('story-first-look'));assert.ok(story.includes('curtain-mti-synopsis')||story.includes('mtishows'));assert.ok(!story.includes('story-chapter'));}
console.log('PASS: informative selection names and sourced spoiler-safe story entry.');
// Closing the narrow navigation also dismisses its expanded group and restores trigger focus.
{const st=render('en','home',false);let focused=false;const panel=st.ctx.document.getElementById('explore-menu');panel.hidden=false;st.ctx.document.getElementById('navigation').classList={toggle:()=>false};const button={dataset:{action:'menu'},setAttribute(){},focus(){focused=true}};st.callbacks.click({target:{closest:sel=>sel==='button'?button:null}});assert.equal(panel.hidden,true);assert.equal(focused,true);}
console.log('PASS: narrow navigation and overlay close as one control.');
for(const language of ['he','en']){const st=render(language,'home',false);tap(st,{homeJourney:'voices'});const html=st.ctx.document.getElementById('home-journey-content').innerHTML;assert.ok(html.includes('/listening/?clip=_6nTyXcmgLc'));const a={getAttribute:()=>'/'+language+'/listening/?clip=_6nTyXcmgLc',dataset:{enterJourney:'voices'}};st.callbacks.click({preventDefault(){},target:{closest:sel=>sel==='a[href]'?a:null}});assert.equal(st.ctx.history.state.lesmisJourney,'voices');assert.ok(st.ctx.location.search.includes('_6nTyXcmgLc'));assert.ok(st.app.innerHTML.includes('gallery-lesson'));}
console.log('PASS: explicit performance-journey entry opens its guided Stars comparison.');

// Original audio filtering is independent from translated UI and explicit clip choices.
let languageChecks=0;
for(const language of ['he','en']){
 const st=render(language,'listening',false);
 const G=st.ctx.RESEARCH.gallery;
 for(const category of ['all',...G.categories.map(c=>c.id)]){
  tap(st,{galleryCategory:category});
  for(const audio of ['all','en','he','other','zxx']){
   tap(st,{galleryAudio:audio});
   const match=i=>audio==='all'||(audio==='other'?!['en','he','zxx'].includes(i.languageCode):i.languageCode===audio);
   const groups=G.groups.filter(g=>(category==='all'||g.category===category)&&g.clipIds.some(id=>match(G.items.find(i=>i.id===id))));
   assert.equal((st.app.innerHTML.match(/class="gallery-card /g)||[]).length,groups.length);
   assert.equal(st.app.innerHTML.includes('gallery-empty'),groups.length===0);
   assert.ok(!st.app.innerHTML.includes('<iframe'));
   const links=[...st.app.innerHTML.matchAll(/class="gallery-card-link"[^>]*data-gallery-link="([^"]+)"/g)].map(m=>m[1]);
   for(const id of links)assert.ok(match(G.items.find(i=>i.id===id)),id+' matches '+audio);
   assert.equal(links.length,groups.length);
   languageChecks+=4+links.length;
  }
 }
 tap(st,{galleryReset:''});assert.equal(st.ctx.location.search,'');assert.equal((st.app.innerHTML.match(/class="gallery-card /g)||[]).length,R.gallery.groups.length);languageChecks+=2;
 for(const song of ['on-my-own','one-day-more','bring-home']){
  const g=G.groups.find(g=>g.id===song),expected=g.clipIds.find(id=>G.items.find(i=>i.id===id).languageCode===language);
  assert.ok(expected,'counterpart '+song+' '+language);
  assert.ok(st.app.innerHTML.includes('data-listen-video="'+expected+'"'));
  const card=st.app.innerHTML.split('<article class="gallery-card ').find(chunk=>chunk.includes(g.title[language]));assert.ok(card.includes('data-gallery-link="'+expected+'"'));
  languageChecks+=3;
 }
 // Explicit Hebrew selection survives UI switch and Back/Forward with its audio filter.
 tap(st,{galleryAudio:'he'});tap(st,{galleryClip:'Mea49KwLiMg'});const chosen={...st.ctx.location};tap(st,{action:'language'});assert.ok(st.ctx.location.search.includes('clip=Mea49KwLiMg'));assert.ok(st.ctx.location.search.includes('audio=he'));assert.ok(st.app.innerHTML.includes('data-added-media="Mea49KwLiMg"'));Object.assign(st.ctx.location,chosen);st.callbacks.popstate();assert.ok(st.ctx.location.search.includes('audio=he'));
 // Selecting an explicitly different-language version removes only the incompatible filter.
 tap(st,{galleryClip:'6yRGaY4UU04'});assert.ok(!st.ctx.location.search.includes('audio='));assert.ok(st.app.innerHTML.includes('data-added-media="6yRGaY4UU04"'));languageChecks+=6;
 const invalid=render(language,'listening',false);invalid.ctx.location.search='?clip=Mea49KwLiMg&audio=en';invalid.callbacks.popstate();assert.ok(invalid.app.innerHTML.includes('data-added-media="Mea49KwLiMg"'));assert.ok(invalid.app.innerHTML.includes('data-gallery-audio="all" aria-pressed="true"'));languageChecks+=2;
}
console.log(`PASS: ${languageChecks} original-audio, paired-default, filter-intersection, empty-state and explicit-link checks.`);

// Ordinary players need no media-permission UI; functional choices remain separate.
let directChecks=0;
for(const lang of ['he','en'])for(const legacyMedia of [false,true]){
 const st=render(lang,'listening',false);st.ctx.SitePrivacy.choose({functional:false,analytics:false,media:legacyMedia});
 tap(st,{galleryClip:'I_h5FnO2Eds'});
 const html=st.app.innerHTML;assert.equal((html.match(/<iframe /g)||[]).length,1);
 assert.ok(html.includes('youtube-nocookie.com/embed/I_h5FnO2Eds?autoplay=0&amp;'));
 assert.ok(html.includes('loading="lazy"'));assert.ok(html.includes('referrerpolicy="strict-origin-when-cross-origin"'));
 assert.ok(!html.includes('data-video="'));assert.ok(!html.includes('id="privacy-media"'));directChecks+=6;
 st.ctx.document.getElementById('privacy-functional').checked=true;
 st.ctx.document.getElementById('privacy-analytics').checked=false;
 tap(st,{action:'privacy-save'});assert.equal(st.ctx.SitePrivacy.choice().media,legacyMedia);assert.equal(st.ctx.SitePrivacy.allowed('functional'),true);directChecks+=2;
 tap(st,{action:'privacy-reject'});assert.equal(st.ctx.SitePrivacy.choice().media,legacyMedia);assert.equal(st.ctx.SitePrivacy.allowed('functional'),false);directChecks+=2;
 tap(st,{galleryClose:''});assert.ok(!st.app.innerHTML.includes('<iframe'));directChecks++;
 const hidden=R.gallery.items.find(x=>x.spoilerLevel===2&&x.embeddable);
 tap(st,{galleryClip:hidden.id});assert.ok(!st.app.innerHTML.includes('<iframe'));
 tap(st,{galleryReveal:''});assert.equal((st.app.innerHTML.match(/<iframe /g)||[]).length,1+coachCount(hidden.id,true));
 tap(st,{action:'hide-spoilers'});assert.ok(!st.app.innerHTML.includes('<iframe'));directChecks+=3;
}
console.log(`PASS: ${directChecks} direct-player, legacy-choice preservation, close and spoiler-removal checks.`);

// Lucy Thomas is the English On My Own default; explicit alternatives remain stable.
let lucyChecks=0;
for(const language of ['he','en']){
 const st=render(language,'listening',false),g=st.ctx.RESEARCH.gallery.groups.find(g=>g.id==='on-my-own');
 assert.deepEqual([...g.clipIds],['Mea49KwLiMg','d4sPDLqMxDs','wCnn89ZJpeE']);lucyChecks++;
 const preferred=language==='en'?'d4sPDLqMxDs':'Mea49KwLiMg';
 assert.ok(st.app.innerHTML.includes('data-listen-video="'+preferred+'"'));
 const card=st.app.innerHTML.split('<article class="gallery-card ').find(chunk=>chunk.includes(g.title[language]));assert.ok(card.includes('data-gallery-link="'+preferred+'"'));lucyChecks+=2;
 for(const id of g.clipIds){
  tap(st,{galleryClip:id});assert.ok(st.app.innerHTML.includes('youtube-nocookie.com/embed/'+id+'?autoplay=0'));
  assert.equal((st.app.innerHTML.match(/data-gallery-clip=/g)||[]).length,3);
  tap(st,{action:'language'});assert.ok(st.ctx.location.search.includes('clip='+id));assert.ok(st.app.innerHTML.includes('data-added-media="'+id+'"'));lucyChecks+=4;
 }
 const song=render(language,'musical',false);tap(song,{featuredSong:'on-my-own'});const links=song.ctx.document.getElementById('featured-song-detail').innerHTML;
 for(const id of g.clipIds){assert.ok(links.includes('data-gallery-link="'+id+'"'));lucyChecks++;}
 const direct=render(language,'listening',false);direct.ctx.location.search='?clip=d4sPDLqMxDs';direct.callbacks.popstate();assert.ok(direct.app.innerHTML.includes('data-added-media="d4sPDLqMxDs"'));assert.equal((direct.app.innerHTML.match(/<iframe /g)||[]).length,1+coachCount('d4sPDLqMxDs',false));lucyChecks+=2;
}
console.log(`PASS: ${lucyChecks} Lucy Thomas defaults, three-version preservation, language retention, musical links and deep-link checks.`);

let readingChecks=0;
for(const language of ['he','en'])for(const group of R.gallery.groups.filter(g=>g.reading)){
 assert.ok(group.reading.sourceIds.every(id=>R.sources.some(s=>s.id===id)));readingChecks++;
 for(const id of group.clipIds){const st=render(language,'listening',false);tap(st,{galleryClip:id});const item=R.gallery.items.find(x=>x.id===id),html=st.app.innerHTML;
  if(item.spoilerLevel===2){assert.ok(!html.includes('id="gallery-reading-title"'));readingChecks++;continue;}
  const esc=x=>x.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  for(const field of ['title','scene','structure','watchFor']){assert.ok(html.includes(esc(group.reading[field][language])),group.id+' readable '+field);readingChecks++;}
  assert.equal((html.match(/id="gallery-reading-title"/g)||[]).length,1);assert.ok(!/[?&](?:start|t)=\d/.test(html));readingChecks+=2;
 }
}
assert.equal(R.gallery.groups.filter(g=>g.reading).length,4);readingChecks++;
console.log(`PASS: ${readingChecks} text-led performance-reading checks: four HE/EN scene notes, existing versions, sourced context, no invented timestamps and spoiler gates.`);
// The dedicated coach shelf contains exactly nine analyses, preserving the original performance collection.
{
 let n=0;assert.equal(R.coachVideos.length,9);assert.equal(R.gallery.groups.filter(g=>g.category==='coaching').length,9);assert.equal(R.gallery.groups.filter(g=>g.category!=='coaching').length,20);assert.equal(R.gallery.items.filter(x=>x.kind!=='coach').length,29);assert.equal(R.coachVideos.filter(x=>x.showWithSong).length,2);n+=5;
 for(const v of R.coachVideos){assert.equal(v.introParagraphs.length,3);assert.ok(Array.isArray(v.chapters));assert.equal(v.listeningGuide.length,3);if(v.id==='MDKukQFxilY'){assert.ok(!v.durationLabel&&!v.durationSeconds&&!v.suggestedChapter)}assert.ok(!('verification'in v)&&!('verifiedChapters'in v));n+=3;for(const l of ['he','en'])for(const p of v.introParagraphs){assert.ok(p[l].split(/\s+/).length>=30);n++;}for(const chapter of v.chapters){assert.ok(chapter.seconds>0&&chapter.seconds<v.durationSeconds);assert.ok(chapter.url.startsWith('https://www.youtube.com/watch?v='+v.id+'&t='));n+=2;}}
 for(const l of ['he','en']){const st=render(l,'listening',false);tap(st,{galleryCategory:'coaching'});assert.equal((st.app.innerHTML.match(/class="gallery-card /g)||[]).length,9);assert.ok(st.app.innerHTML.includes('gallery-coach-introduction'));assert.ok(!st.app.innerHTML.includes('hebrew-performance-doorways'));n+=3;
  for(const v of R.coachVideos){tap(st,{galleryClip:v.id});if(v.spoilerLevel>=2&&!st.app.innerHTML.includes('data-video-instance="coach-collection-'+v.id+'"')){assert.ok(!st.app.innerHTML.includes(v.introParagraphs[0][l]));tap(st,{galleryReveal:''});n++;}const html=st.app.innerHTML;assert.equal((html.match(/<iframe /g)||[]).length,1);assert.equal((html.match(/data-coach-analysis=/g)||[]).length,1);assert.ok(html.includes('data-video-instance="coach-collection-'+v.id+'"'));assert.ok(html.includes(v.coach.name));assert.ok(html.includes('gallery-coach-intro'));n+=5;tap(st,{galleryClose:''});assert.ok(!st.app.innerHTML.includes('<iframe'));n++;}
  tap(st,{galleryAudio:'he'});assert.ok(st.app.innerHTML.includes('gallery-empty'));assert.equal((st.app.innerHTML.match(/class="gallery-card /g)||[]).length,0);n+=2;tap(st,{galleryAudio:'en'});assert.equal((st.app.innerHTML.match(/class="gallery-card /g)||[]).length,9);n++;
 }
 const c={window:{}};vm.runInNewContext(fs.readFileSync('dist/search.js','utf8'),c);const idx=c.window.SiteSearch.buildIndex({research:R},{spoiler:false});for(const v of R.coachVideos){const doc=idx.find(x=>x.id==='performance:'+v.id);assert.ok(doc);for(const l of ['he','en']){assert.equal(doc.body[l].includes(v.introParagraphs[1][l]),v.spoilerLevel<2);assert.ok(doc.body[l].includes(v.coach.name));n+=2;}}
 console.log(`PASS: ${n} dedicated coach-gallery checks: nine analyses, 20 original performance cards, rich HE/EN context, verified chapters, separate song placements, filters, single players and search.`);
}
