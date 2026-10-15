'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={window:{}};
for(const file of ['watch-path-data.js','watch-path.js'])vm.runInNewContext(fs.readFileSync('dist/'+file,'utf8'),context);
const {WATCH_PATH_DATA:data,WatchPath:api}=context.window;
let cases=0;
for(const lang of ['he','en'])for(const mode of ['ourPicks','sameProduction'])for(const stop of data.stops){
 const selection=api.getSelection({lang,mode,songId:stop.songId});let calls=0;
 const html=api.renderStop({lang,mode,songId:stop.songId,renderVideo:()=>{calls++;return '<div>Primary player</div>'}});
 assert.equal(calls,selection.clips.length,'Alternative players are not rendered upfront');
 assert.equal(new Set(selection.alternatives.map(c=>c.id)).size,selection.alternatives.length);
 assert.ok(selection.alternatives.every(c=>!selection.clips.some(p=>p.id===c.id)));
 assert.equal(html.includes('data-watch-alternatives'),selection.alternatives.length>0);
 assert.ok(!/<details[^>]*\bopen(?:\s|>)/.test(html),'Collapsed by default');
 assert.ok(!/<iframe|<img|<video/.test(html),'Alternatives cause no external media requests');
 for(const c of selection.alternatives){assert.ok(html.includes(c.url));assert.ok(html.includes('data-watch-alternative-card="'+c.id+'"'));assert.ok(c.production.en);assert.ok(c.uploader)}
 cases++;
}
assert.ok(api.getSelection({songId:'one-day-more',lang:'he'}).alternatives.some(c=>c.id==='wNNBrg4u9d0'));
assert.ok(api.getSelection({songId:'one-day-more',lang:'en'}).alternatives.some(c=>c.id==='HKRzlaQcfUI'));
assert.ok(api.renderStop({songId:'stars',lang:'he'}).includes('צפה בביצועים נוספים'));
assert.ok(api.renderStop({songId:'stars',lang:'en'}).includes('Watch more performances'));
console.log('PASS: '+cases+' alternative selections: uniqueness, primary exclusion, collapsed rendering, bilingual controls, no eager players.');
