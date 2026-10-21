'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,'dist',name+'.js'),'utf8');
const app=read('app');
function functionSource(name){const start=app.indexOf('function '+name+'(');assert.ok(start>=0,name+' exists');const next=app.slice(start+1).search(/\n(?:function |const Q =)/);return next<0?app.slice(start):app.slice(start,start+1+next)}
function boot(lang='en',spoiler=false){
 const c={lang,spoiler,window:{},Math,String};vm.createContext(c);
 vm.runInContext(read('extras'),c);vm.runInContext(read('watch-path-data'),c);
 c.R=c.window.EXTRA_CONTENT;c.esc=String;c.tr=x=>typeof x==='object'?x[c.lang]:x;c.h=c.tr;c.t=(he,en)=>c.lang==='he'?he:en;c.arrow='';c.url=route=>'/'+c.lang+'/'+route+'/';
 c.galleryHref=(id,category,locale)=>'/'+locale+'/listening/?clip='+id+'&category='+category;
 c.external=(url,label)=>'<a href="'+url+'" target="_blank" rel="noopener noreferrer">'+label+'</a>';
 c.bookmarkControl=()=>'';c.top=()=>'';c.selectedReading=()=>null;c.musicFormPrimer=()=>'';c.sourceDisclosure=()=>'';c.banner=()=>'<p>spoilers on</p>';
 c.showJourney=()=>c.musicalJourneyHebrewPick('one-day-more')+['bring-him-home','dreamed-dream','empty-chairs'].map(id=>c.musicalJourneyPerformanceComparison(id)).join('');
 for(const name of ['hebrewRadioPerformance','musicalJourneyHebrewPick','musicalJourneyPerformanceComparison','musicalJourneyOrientation','musicalJourneyOpening','musicalJourneyPage'])vm.runInContext(functionSource(name),c);
 return c;
}
for(const lang of ['he','en']){
 test('existing festival gallery doorway preserves consent and media inventory ('+lang+')',()=>{
  const c=boot(lang),html=c.musicalJourneyPage();
  assert.ok(html.includes('/'+lang+'/listening/?clip=doObm92RaSw&category=onstage'));
  assert.ok(html.includes('data-gallery-link="doObm92RaSw"'));
  assert.ok(html.includes('data-action="show-open"'));
  assert.equal(c.spoiler,false);
  assert.equal(c.R.gallery.items.filter(x=>x.id==='doObm92RaSw').length,1);
  assert.equal(c.R.gallery.groups.filter(x=>x.clipIds.includes('doObm92RaSw')).length,1);
  assert.ok(!/<iframe|data-video-shell|data-journey-performance|data-journey-hebrew-pick/.test(html));
  assert.ok(!/nPfd5-gS5IA|YKH4Vwb8xGg|xtTprJtCkdk|85arWfDjWyY/.test(html));
 });
 test('new comparison links are contextual, collapsed and globally gated ('+lang+')',()=>{
  const c=boot(lang);
  for(const [song,id] of [['bring-him-home','nPfd5-gS5IA'],['dreamed-dream','YKH4Vwb8xGg'],['empty-chairs','xtTprJtCkdk']]){
   assert.equal(c.musicalJourneyPerformanceComparison(song),'');c.spoiler=true;
   const html=c.musicalJourneyPerformanceComparison(song);
   assert.ok(html.startsWith('<details '));assert.ok(!/<details[^>]*\bopen/.test(html));
   assert.ok(html.includes('data-journey-performance="'+id+'"'));
   assert.equal((html.match(/<a /g)||[]).length,1);
   assert.ok(html.includes('href="https://www.youtube.com/watch?v='+id+'"'));
   assert.ok(!/<iframe|data-video-shell|data-action|\d+:\d{2}/.test(html));
   c.spoiler=false;assert.equal(c.musicalJourneyPerformanceComparison(song),'');
  }
  c.spoiler=true;assert.equal(c.musicalJourneyPerformanceComparison('work-song'),'');
 });
}
test('Habima prompt reuses the existing source, only at its Hebrew gated scene',()=>{
 const c=boot('he');assert.equal(c.musicalJourneyHebrewPick('one-day-more'),'');c.spoiler=true;
 const html=c.musicalJourneyHebrewPick('one-day-more');
 assert.ok(html.includes('data-journey-hebrew-pick="1qwY7eMI5kQ"'));assert.ok(html.includes('2:51'));
 assert.ok(html.includes('צפה בביצועים נוספים'));assert.ok(!/<a |<iframe|data-video-shell|data-watch-alternative=/.test(html));
 assert.equal(c.window.WATCH_PATH_DATA.clips.filter(x=>x.id==='1qwY7eMI5kQ').length,1);
 assert.equal(c.musicalJourneyHebrewPick('stars'),'');c.lang='en';assert.equal(c.musicalJourneyHebrewPick('one-day-more'),'');
 const slide=functionSource('showSlide');assert.ok(slide.includes('${musicalJourneyHebrewPick(s.id)}'));assert.ok(slide.includes('${musicalJourneyPerformanceComparison(s.id)}'));
 assert.ok(app.includes('85arWfDjWyY'));
});

test('requested Hebrew radio link is contextual, external-only and gated in the journey',()=>{
 const c=boot('he');
 assert.equal(c.musicalJourneyHebrewPick('bring-him-home'),'');
 c.spoiler=true;const html=c.musicalJourneyHebrewPick('bring-him-home');
 assert.ok(html.includes('https://www.youtube.com/watch?v=85arWfDjWyY'));
 assert.ok(html.includes('Rom Finckelshtein'));
 assert.ok(html.includes('קישור חיצוני'));
 assert.ok(html.includes('שאלה להקשבה'));
 assert.ok(!/<iframe|<img|data-video-shell/.test(html));
 c.lang='en';assert.equal(c.musicalJourneyHebrewPick('bring-him-home'),'');
 assert.ok(c.hebrewRadioPerformance().includes('External link to the upload by Rom Finckelshtein'));
 assert.ok(functionSource('israelPage').includes('${hebrewRadioPerformance()}'));
});
