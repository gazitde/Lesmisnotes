import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const c={window:{}};
for(const file of ['research.js','extras.js'])vm.runInNewContext(fs.readFileSync('dist/'+file,'utf8'),c);
const sources=[...c.window.RESEARCH.sources,...c.window.EXTRA_CONTENT.extraSources],ids=new Set();
let checks=0;
for(const s of sources){
 assert.ok(!ids.has(s.id),'Duplicate source ID: '+s.id);ids.add(s.id);
 assert.equal(typeof s.label,'object','Source label must have explicit languages: '+s.id);
 assert.ok(typeof s.label.he==='string'&&/[\u0590-\u05ff]/.test(s.label.he),'Hebrew source context missing: '+s.id);
 assert.ok(typeof s.label.en==='string'&&s.label.en.trim(),'English source label missing: '+s.id);
 assert.ok(/^https:\/\//.test(s.url),'Source URL must use HTTPS: '+s.id);checks+=5;
}
console.log(`PASS: ${checks} source-label checks for ${sources.length} unique bilingual sources, Hebrew context and HTTPS destinations.`);
