'use strict';
// Actual player callbacks and rendered escape links. Every frame/API/storage object is fake.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/app.js','utf8');
function between(start,end){return source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)))}
function harness(language='en',{api=true}={}){
 const status={textContent:''},recovery={hidden:true},frame={src:'https://example.test/frame',isConnected:true},scripts=[],players=[],events=[],timers=[];
 const shell={querySelector:()=>frame};
 const ctx={window:{location:{origin:'https://example.test'}},document:{getElementById:id=>id==='video-test'?shell:id==='video-status-test'?status:id==='video-recovery-test'?recovery:null,createElement:()=>({}),head:{append:s=>scripts.push(s)}},videos:[{id:'clip',title:'Title',channel:'Uploader'}],A:{track:(...e)=>events.push(e)},t:(he,en)=>language==='he'?he:en,setTimeout:fn=>{timers.push(fn);return 1},clearTimeout(){}};
 if(api)ctx.window.YT={PlayerState:{PLAYING:1},Player:function(f,config){this.config=config;this.destroy=()=>{f.isConnected=false};players.push(this)}};
 vm.createContext(ctx);vm.runInContext(between('const players = new Map();','function playerFrame(')+'\nwindow.api={loadPlayer,clearPlayers};',ctx);
 return {ctx,status,recovery,frame,scripts,players,events,timers,...ctx.window.api};
}
for(const language of ['he','en']){
 for(const code of [100,101,150,153,2,5,999])test(`YouTube error ${code} gives an accurate manual escape (${language})`,async()=>{
  const h=harness(language);await h.loadPlayer('clip','test');h.players[0].config.events.onError({data:code});
  const expected=language==='en'?(code===100?/removed or made private/:code===101||code===150?/does not allow embedded playback/:code===153?/could not identify.*153/:/could not load/):(code===100?/הוסר או הוגדר כפרטי/:code===101||code===150?/אינו מאפשר צפייה בנגן מוטמע/:code===153?/לא הצליח לזהות.*153/:/לא הצליח לטעון/);
  assert.match(h.status.textContent,expected);assert.equal(h.recovery.hidden,code!==100);assert.equal(h.events.length,0);assert.equal(h.scripts.length,0);
  h.players[0].config.events.onError({data:153});assert.equal(h.recovery.hidden,true,'An identification error does not imply removal');
 });
 test(`API script failure and timeout preserve the native iframe without automatic retries (${language})`,async()=>{
  for(const mode of ['error','timeout']){
   const h=harness(language,{api:false}),pending=h.loadPlayer('clip','test');
   assert.equal(h.scripts.length,1);if(mode==='error')h.scripts[0].onerror();else h.timers[0]();await pending;
   assert.equal(h.frame.isConnected,true);assert.match(h.status.textContent,language==='en'?/Player coordination did not load/:/תיאום הנגנים לא נטען/);
   assert.equal(h.scripts.length,1);assert.equal(h.players.length,0);assert.equal(h.events.length,0);
  }
 });
}
test('stale missing-video events cannot expose recovery links after player cleanup',async()=>{
 const h=harness();await h.loadPlayer('clip','test');h.clearPlayers();h.players[0].config.events.onError({data:100});
 assert.equal(h.recovery.hidden,true);assert.equal(h.status.textContent,'');
});
test('all video instances retain a direct link and safely encoded, initially hidden search fallback',()=>{
 const ctx={lang:'en',window:{location:{origin:'https://example.test'}},videoBackground:()=>'',tr:v=>typeof v==='object'?v.en:v,t:(he,en)=>en};
 vm.createContext(ctx);
 vm.runInContext(between('const esc =','const P=')+between('const isTechnicalSource =','const sourceMap =')+between('function playerFrame(','function performerCredits')+between('function videoRecovery(','function resourceGroup(')+'\nglobalThis.renderVideo=video;',ctx);
 const title='Les Mis "quoted" & <script>alert(1)</script> / שלום?',channel='Publisher #1 & friends',html=ctx.renderVideo({id:'safe_id',title,channel},'instance-one');
 assert.match(html,/https:\/\/www.youtube.com\/watch\?v=safe_id/);assert.match(html,/id="video-recovery-instance-one" hidden/);
 assert.ok(html.includes('https://www.youtube.com/results?search_query='+encodeURIComponent(title+' '+channel)));
 assert.doesNotMatch(html,/<script>/);assert.match(html,/target="_blank" rel="noopener noreferrer"/);assert.match(html,/autoplay=0/);
 assert.doesNotMatch(html,/autoplay=1|fetch\(|ping=/);
});
