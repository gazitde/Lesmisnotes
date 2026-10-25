'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=name=>fs.readFileSync(name,'utf8');
function boot(){const c={window:{}};vm.createContext(c);for(const file of ['research','extras','listening-pointers'])vm.runInContext(read('dist/'+file+'.js'),c);return {c,data:c.window.LISTENING_POINTERS,api:c.window.ListeningPointers,R:Object.assign(c.window.RESEARCH,c.window.EXTRA_CONTENT)}}
const {data,api,R}=boot();
test('every supported question has three original bilingual pointers',()=>{
 const expected={songs:R.musical.songentries.map(s=>s.id),spotlight:R.musical.spotlight.songs.map(s=>s.id),primer:R.musical.listeningPrimer.rows.map(s=>s.id),opening:['01','02','03'],recordings:R.recordingChooser.cards.map(s=>s.id),lenses:['voice','body','setting'],performances:['QBEGzbdKwo8','nPfd5-gS5IA','YKH4Vwb8xGg','xtTprJtCkdk'],groups:R.gallery.groups.filter(g=>g.category!=='coaching'&&g.id!=='stars-pair').map(g=>g.id)};
 expected.items=R.gallery.items.filter(item=>{const g=R.gallery.groups.find(g=>g.clipIds.includes(item.id));return g&&g.category!=='coaching'&&g.id!=='stars-pair'&&item.question&&['he','en'].some(lang=>item.question[lang]!==g.question?.[lang])}).map(x=>x.id);
 assert.deepEqual(Object.keys(data).sort(),Object.keys(expected).sort());
 const seen={he:new Set(),en:new Set()};
 for(const [scope,ids] of Object.entries(expected)){
  assert.deepEqual(Object.keys(data[scope]).sort(),Array.from(ids).sort(),scope+' exact coverage');
  for(const [id,points] of Object.entries(data[scope])){
   assert.equal(points.length,3,scope+':'+id);
   for(const point of points)for(const lang of ['he','en']){
    assert.equal(typeof point[lang],'string');assert.ok(point[lang].trim().length>25,scope+':'+id+' substantive '+lang);
    assert.ok(!/[<>]/.test(point[lang]),'plain editorial text');assert.ok(!seen[lang].has(point[lang]),'no copied boilerplate: '+scope+':'+id);seen[lang].add(point[lang]);
   }
  }
 }
});
for(const lang of ['he','en'])test('native disclosures are closed, localized and contain three list items ('+lang+')',()=>{
 for(const [scope,entries] of Object.entries(data))for(const id of Object.keys(entries)){
  const html=api.render(scope,id,lang);assert.match(html,/^<details class="listening-pointers"/);assert.ok(!/<details[^>]*\bopen(?:\s|=|>)/.test(html));assert.equal((html.match(/<li>/g)||[]).length,3);assert.match(html,/<summary>[^<]+<\/summary>/);assert.ok(html.includes(lang==='he'?'נקודות להקשבה ולמחשבה':'Pointers for listening and thinking'));assert.ok(html.includes(entries[id][0][lang]));
 }
});
test('safe fallback and escaping do not turn editorial content into executable HTML',()=>{
 const {data,api}=boot();assert.equal(api.render('missing','none','en'),'');assert.equal(api.render('songs','none','he'),'');
 data.songs['work-song'][0].en='<img src=x onerror=alert(1)>';const html=api.render('songs','work-song','en');assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));
 data.songs['work-song']=[];assert.equal(api.render('songs','work-song','en'),'');
});
test('gallery uses distinct item guidance when its question overrides the group',()=>{
 for(const item of R.gallery.items){const group=R.gallery.groups.find(g=>g.clipIds.includes(item.id));if(!group||group.category==='coaching'||group.id==='stars-pair')continue;const key=data.items[item.id]?'items:'+item.id:'groups:'+group.id;assert.ok(api.gallery(group,item,'en').includes('data-listening-pointers="'+key+'"'))}
});
test('both runtime and prerender load the same local hints before the application',()=>{
 const build=read('prerender.mjs');assert.ok(build.indexOf('src="/listening-pointers.js')<build.indexOf('src="/app.js'));assert.ok(build.includes('runCompiled(listeningPointers,context)'));assert.ok(!/fetch\(|localStorage|sessionStorage|sendBeacon|XMLHttpRequest/.test(read('dist/listening-pointers.js')));
 const app=read('dist/app.js');assert.ok(app.includes("if(hints)hints.innerHTML=globalThis.ListeningPointers?.render('lenses',currentLens,lang)||''"));
});
