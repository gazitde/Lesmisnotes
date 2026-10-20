'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={window:{}};
for(const file of ['research','extras'])vm.runInNewContext(fs.readFileSync(`dist/${file}.js`,'utf8'),context);
const changes=JSON.parse(fs.readFileSync('docs/editorial-changes-20261020.json','utf8'));
const normalize=s=>s.replace(/\s+/g,' ').trim();
test('editorial paragraph breaks preserve every word in both languages',()=>{
 for(const change of changes.filter(c=>c.kind==='paragraph rhythm only'))for(const lang of ['he','en'])assert.equal(normalize(change.after[lang]),normalize(change.before[lang]),`${change.path}/${lang}`);
});
test('all eight optional scene details have paired readable paragraphs',()=>{
 assert.equal(context.window.RESEARCH.story.length,8);
 for(const scene of context.window.RESEARCH.story){
  const en=scene.detail.en.split(/\n\s*\n/),he=scene.detail.he.split(/\n\s*\n/);
  assert.equal(en.length,he.length,scene.id);assert.ok(en.length>=2,scene.id);
  for(const paragraph of en)assert.ok(paragraph.split(/\s+/).length<=85,scene.id);
  assert.ok(scene.sourceIds.length);assert.equal(scene.spoilers,true);
 }
});
test('reader-facing introductions are bilingual and compact without hiding core history',()=>{
 const e=context.window.EXTRA_CONTENT;
 for(const value of [e.history.intro,e.hugo.lead,e.curtain.before.intro,e.curtain.after.intro,e.musical.spotlight.intro])for(const lang of ['he','en']){
  assert.ok(value[lang].trim());assert.ok(value[lang].split(/\s+/).length<=50);
 }
 assert.match(e.history.intro.en,/1832/);assert.match(e.history.intro.he,/1832/);
 assert.match(e.hugo.lead.en,/without revealing the ending/);
 assert.match(e.hugo.lead.he,/בלי לחשוף את הסוף/);
});
