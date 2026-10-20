'use strict';
// Real application integration in a deterministic VM; actual browser/layout checks are separate.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=process.env.LESMIS_SOURCE||path.resolve(__dirname,'..'),code=name=>fs.readFileSync(path.join(root,'dist',name+'.js'),'utf8');
const expose=`window.__completionTest={recordingSongTitle,spotlightDetail,showSlide,charactersPage,navigate,navigateReader,setConsent(s,a){spoiler=s;afterConsent=a},consent:()=>({spoiler,novelConsent,afterConsent}),setSong(id){showAct="all";showIndex=showStops().findIndex(s=>s.id===id)},setFeatured(id){featuredSong=id},cache(data){readingPartCache.set(data.part,data)}};})();`;
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




const expectedTitles={'end-of-day':'בסופו של היום','dreamed-dream':'חלום חלמתי','who-am-i':'מי אני','master-house':'בעל הפונדק','stars':'כוכבים','one-day-more':'רק עוד יום','red-black':'שחור ואדום','people-sing':'היי הקשיבו הם שרים','heart-love':'בלב מאוהב','on-my-own':'לבדי','empty-chairs':'שולחנות ריקים'};
const targets={grantaire:'p3-b4-c1',gillenormand:'p3-b2-c1',fauchelevent:'p1-b5-c6','friends-abc':'p3-b4-c1'};
for(const language of ['he','en']){
 test(`discovery has four bounded introductions and no additional profiles (${language})`,()=>{
  const {ctx,api,session,disk}=boot(language),P=ctx.CharacterProfiles,D=ctx.CHARACTER_PROFILES.discovery;
  assert.equal(P.all().length,10);assert.equal(ctx.RESEARCH.characters.length,10);
  assert.deepEqual(Array.from(D.items,item=>item.id),Object.keys(targets));
  assert.deepEqual(Array.from(D.items,item=>item.kind),['person','person','person','group']);
  const before=JSON.stringify(api.consent()),html=P.discovery(language);
  assert.equal((html.match(/<details /g)||[]).length,4);assert.equal(/<details\b[^>]*\sopen(?:[\s=>])/.test(html),false);
  assert.equal(/character-(?:grantaire|gillenormand|fauchelevent|friends-abc)/.test(html),false);
  for(const item of D.items){
   assert.ok(html.includes(item.name[language]));assert.ok(item.intro.he&&item.intro.en);
   assert.ok(item.intro[language].split(/\s+/).length<50,'Compact introduction');
   assert.equal(item.chapterId,targets[item.id]);
   assert.ok(html.includes(`/${language}/novel-journey/?focus=chapter%3A${item.chapterId}`));
   assert.match(item.source.url,/^https:\/\/fr\.wikisource\.org\/wiki\/Les_Mis%C3%A9rables\/Tome_[13]\/Livre_[245]\/(?:01|06)$/);
   assert.equal(P.get(item.id),undefined);assert.equal(P.href(item.id),null);
  }
  const abc=D.items.find(x=>x.kind==='group');assert.equal(abc.members.length,9);assert.ok(abc.intro.en.includes('l’abaissé'));assert.equal(abc.members.some(m=>m.en==='Marius'),false);
  assert.equal(/overturned|התהפכה/.test(D.items.find(x=>x.id==='fauchelevent').intro[language]),false);
  assert.equal(P.discovery(language,{readerContext:{chapter:{id:'p1-b1-c1'}}}),'');
  for(const reader of ['p1-b1-c1','p5-b9-c6','bogus'])assert.equal(P.page({id:'valjean',lang:language,search:'?reader='+reader,spoiler:true}).includes('character-discovery'),false);
  api.navigate('characters');assert.ok(api.charactersPage().includes('class="character-discovery"'));
  for(const item of D.items){api.navigateReader(`/${language}/novel-journey/?focus=chapter%3A${item.chapterId}`);assert.equal(new URLSearchParams(ctx.location.search).get('focus'),'chapter:'+item.chapterId);assert.equal(ctx.document.getElementById('app').innerHTML.includes('class="character-discovery"'),false);}
  assert.equal(JSON.stringify(api.consent()),before);assert.equal(session.get('barricade-spoilers'),undefined);assert.equal(disk.size,0);
 });
 test(`recording labels preserve primary titles and explicit scope (${language})`,()=>{
  const {ctx,api}=boot(language),musical=ctx.EXTRA_CONTENT.musical,aliases=musical.recordingTitleAliases;
  const canonical=JSON.stringify(musical.songentries.map(s=>({id:s.id,title:s.title}))),before=JSON.stringify(api.consent());
  assert.deepEqual(Object.fromEntries(Object.entries(aliases.songs).map(([id,item])=>[id,item.title])),expectedTitles);
  assert.equal(aliases.recordingId,'cameri-1987');assert.equal(aliases.translator.en,'Ehud Manor');assert.equal(aliases.source.field,'Content Note');
  assert.equal(aliases.source.url,'https://www.nli.org.il/en/items/NNL_MUSIC_AL997013219803805171/NLI');
  assert.equal(aliases.songs['who-am-i'].englishSongTitle,'Who Am I?');assert.equal(aliases.songs['who-am-i'].scope,'song-title');
  for(const song of musical.songentries){
   const label=api.recordingSongTitle(song.id),expected=language==='he'&&Object.hasOwn(expectedTitles,song.id);
   assert.equal(Boolean(label),expected);
   if(expected){assert.ok(label.includes('באלבום הקאמרי (1987):'));assert.ok(label.includes(expectedTitles[song.id]));assert.ok(label.includes('אהוד מנור'));assert.ok(label.includes(aliases.source.url));}
   api.setSong(song.id);const slide=api.showSlide();
   assert.ok(slide.includes(song.title[language].replaceAll('&','&amp;').replaceAll("'",'&#39;')));
   assert.equal(slide.includes('data-recording-title="'+song.id+'"'),expected);
  }
  for(const id of ['bring-him-home','epilogue','unknown'])assert.equal(api.recordingSongTitle(id),'');
  api.setFeatured('on-my-own');assert.equal(api.spotlightDetail().includes('data-recording-title="on-my-own"'),language==='he');assert.ok(api.spotlightDetail().includes('On My Own'));
  assert.equal(JSON.stringify(musical.songentries.map(s=>({id:s.id,title:s.title}))),canonical);assert.equal(JSON.stringify(api.consent()),before);
 });
}

test('Fauchelevent chapter describes a cart accident without inventing an overturn',()=>{
 const chapter=JSON.parse(fs.readFileSync(path.join(root,'dist/reading/part-1.json'),'utf8')).chapters.find(c=>c.id==='p1-b5-c6');
 assert.ok(chapter.summary.he.includes('נלכד מתחת לעגלתו, וגלגליה שוקעים באדמה הרטובה.'));
 assert.ok(chapter.summary.en.includes('is trapped beneath his cart as its wheels sink into wet ground.'));
 assert.equal(/overturned|התהפכה/.test(JSON.stringify(chapter.summary)),false);
});
