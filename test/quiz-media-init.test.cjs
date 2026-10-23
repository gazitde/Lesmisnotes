'use strict';
// Executes the same serialized initializer used by Playwright, never a browser or real storage.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const install=require('../scripts/helpers/quiz-media-init.cjs');
const ORIGIN='http://127.0.0.1:8873',KEY='barricade-consent-v1';
function harness({origin=ORIGIN,child=false,denyStorage=false,functional=true}={}){
 const disk=new Map(),session=new Map(),reads=[];
 const store=map=>({getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,String(value))});
 const window={location:{origin}};window.top=child?{}:window;
 const context={window,options:{functional,origin:ORIGIN}};
 for(const [key,map]of [['localStorage',disk],['sessionStorage',session]])Object.defineProperty(window,key,{get(){reads.push(key);if(denyStorage)throw new Error('Storage access denied');return store(map)}});
 vm.createContext(context);
 return {window,disk,session,reads,run:()=>vm.runInContext(`(${install.toString()})(options)`,context)};
}
for(const fixture of [
 {name:'blocked third-party child',child:true,origin:'https://www.youtube-nocookie.com'},
 {name:'opaque child frame',child:true,origin:'null'},
 {name:'same-origin child frame',child:true,origin:ORIGIN},
 {name:'initial top-level about:blank',origin:'null'},
 {name:'unexpected top-level origin',origin:'https://example.invalid'}
])test(`quiz/media fixtures skip ${fixture.name} before reading storage`,()=>{
 const h=harness({...fixture,denyStorage:true});assert.doesNotThrow(h.run);
 assert.deepEqual(h.reads,[]);assert.equal(h.disk.size,0);assert.equal(h.session.size,0);
 assert.equal(Object.hasOwn(h.window,'YT'),false);assert.equal(Object.hasOwn(h.window,'__ytPlayers'),false);
});
for(const functional of [true,false])test(`intended top-level document seeds isolated fixtures with remembering ${functional?'on':'off'}`,()=>{
 const h=harness({functional});h.run();assert.equal(JSON.parse(h.disk.get(KEY)).functional,functional);
 assert.equal(h.session.get('quiz-test-seeded'),'1');assert.equal(h.session.get('barricade-novel-consent'),'on');
 assert.equal(h.disk.get('barricade-bookmarks'),'["novel"]');assert.ok(Array.isArray(h.window.__ytPlayers));
 const frame={},options={};const player=new h.window.YT.Player(frame,options);
 assert.equal(player.frame,frame);assert.equal(player.options,options);assert.equal(h.window.__ytPlayers[0],player);
 h.disk.set(KEY,'changed by test interaction');h.disk.delete('barricade-bookmarks');h.session.delete('barricade-novel-consent');
 h.run();assert.equal(h.disk.get(KEY),'changed by test interaction');assert.equal(h.disk.has('barricade-bookmarks'),false);
 assert.equal(h.session.has('barricade-novel-consent'),false,'Reload must not re-grant spoiler choices');
 assert.equal(h.window.__ytPlayers.length,0,'Only per-document player mocks are renewed');
});
test('storage errors in the intended document are still surfaced, never swallowed',()=>{
 const h=harness({denyStorage:true});assert.throws(h.run,/Storage access denied/);
 assert.deepEqual(h.reads,['sessionStorage']);
});
