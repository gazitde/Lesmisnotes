'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/app.js','utf8');
function fn(name){const start=source.indexOf('function '+name+'(');assert.ok(start>=0);const end=source.indexOf('\nfunction ',start+1);return source.slice(start,end)}
test('song selection follows its rendered route, preserving journey settings and rejecting cross-surface drift',()=>{
 const c={URLSearchParams,route:'musical-journey',location:{search:'?focus=song:stars&view=spotlight&act=1&watch=sameProduction'},validReading:()=>true};vm.createContext(c);vm.runInContext(fn('selectedReading'),c);
 assert.equal(c.selectedReading().view,'journey');assert.equal(c.selectedReading().watch,'sameProduction');assert.equal(c.selectedReading().act,'1');
 for(const value of ['', '&view=unknown', '&view=spotlight']){c.route='musical';c.location.search='?focus=song:stars'+value;assert.equal(c.selectedReading().view,'spotlight')}
 c.route='musical-journey';c.location.search='?focus=song:stars';assert.equal(c.selectedReading().view,'journey');
});
test('legacy saved song choices preserve spotlight versus journey meaning without expanding consent',()=>{
 let allowed=true,record={kind:'song',key:'stars',view:''},reads=0;
 const c={P:{allowed:()=>allowed},getStored:()=>{reads++;return JSON.stringify(record)},validReading:()=>true,R:{musical:{spotlight:{songs:[{id:'stars'}]}}}};vm.createContext(c);vm.runInContext(fn('savedReading'),c);
 assert.equal(c.savedReading().view,'spotlight');record.key='work-song';assert.equal(c.savedReading().view,'journey');
 record={kind:'song',key:'stars',view:'journey',watch:'sameProduction',act:'2'};assert.equal(c.savedReading().view,'journey');assert.equal(c.savedReading().watch,'sameProduction');assert.equal(c.savedReading().act,'2');
 record.view='spotlight';assert.equal(c.savedReading().view,'spotlight');allowed=false;const before=reads;assert.equal(c.savedReading(),null);assert.equal(reads,before);
});
test('watch mode refresh updates canonical and legacy exact journey links without touching spotlight or other pages',()=>{
 const links=[{href:'https://example.test/en/musical-journey/?focus=song%3Astars&view=journey&act=1'},{href:'https://example.test/en/musical/?focus=song%3Astars&view=journey'},{href:'https://example.test/en/musical/?focus=song%3Astars&view=spotlight'},{href:'https://example.test/en/novel-journey/?focus=chapter%3Ap1-b1-c1'}];
 const c={URL,location:{href:'https://example.test/en/musical-journey/'},url:p=>'/en/'+p+'/',watchMode:'sameProduction',document:{getElementById:()=>null,querySelectorAll:()=>links,querySelector:()=>({focus(){}})},mountPlayers(){}};vm.createContext(c);vm.runInContext(fn('refreshWatchSelection'),c);c.refreshWatchSelection();
 for(const a of links.slice(0,2)){const u=new URL(a.href,c.location.href);assert.equal(u.searchParams.get('watch'),'sameProduction');assert.equal(u.searchParams.get('focus'),'song:stars')}
 assert.equal(new URL(links[0].href,c.location.href).searchParams.get('act'),'1');assert.ok(!links[2].href.includes('watch='));assert.ok(!links[3].href.includes('watch='));
 c.watchMode='ourPicks';c.refreshWatchSelection();for(const a of links.slice(0,2))assert.equal(new URL(a.href,c.location.href).searchParams.has('watch'),false);
});
