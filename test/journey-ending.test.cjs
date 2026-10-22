'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/app.js','utf8');
function fn(name){const start=source.indexOf('function '+name+'(');assert.ok(start>=0);return source.slice(start,source.indexOf('\nfunction ',start+1));}
for(const lang of ['he','en'])test('Finale offers two optional internal next steps without completion claims: '+lang,()=>{
 const c={spoiler:true,R:{musical:{songentries:[{id:'opening'},{id:'finale'}]}},currentShowStop:()=>({id:'finale'}),t:(he,en)=>lang==='he'?he:en,url:p=>'/'+lang+'/'+p+'/',arrow:''};vm.createContext(c);vm.runInContext(fn('showJourneyEnding'),c);
 const html=c.showJourneyEnding();assert.match(html,/aria-labelledby="show-ending-title"/);assert.equal((html.match(/<a /g)||[]).length,2);assert.ok(html.includes('/'+lang+'/after/'));assert.ok(html.includes('/'+lang+'/compare/'));assert.ok(html.includes(lang==='he'?'באישור נפרד':'a separate choice'));assert.doesNotMatch(html,/<iframe|https:|localStorage|completed|finished reading/i);
 c.currentShowStop=()=>({id:'opening'});assert.equal(c.showJourneyEnding(),'');c.currentShowStop=()=>({id:'interval',interval:true});assert.equal(c.showJourneyEnding(),'');c.currentShowStop=()=>({id:'finale'});c.spoiler=false;assert.equal(c.showJourneyEnding(),'');
});
test('Ending updates with scene selection and keeps terminal navigation intact',()=>{assert.match(fn('showJourney'),/id="show-journey-ending"/);assert.match(fn('updateShow'),/ending.innerHTML=showJourneyEnding\(\)/);assert.match(fn('showMoveLabel'),/Journey complete/);assert.match(fn('showJourney'),/showIndex===stops.length-1\?'disabled'/);});
