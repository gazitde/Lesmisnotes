'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=JSON.parse(fs.readFileSync('docs/chapter-title-sources.json','utf8'));
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('dist/extras.js','utf8'),ctx);
const chapters=ctx.window.EXTRA_CONTENT.chapterCompanion.chapters;
test('all 365 lazy chapter headings match the audited Hapgood source anchor map',()=>{
 assert.equal(Object.keys(source.chapters).length,365);
 assert.equal(source.source,'https://www.gutenberg.org/cache/epub/135/pg135-images.html');
 assert.match(source.sourceSha256,/^[a-f0-9]{64}$/);
 for(let part=1;part<=5;part++)for(const c of JSON.parse(fs.readFileSync(`dist/reading/part-${part}.json`)).chapters){
  const meta=chapters.find(x=>x.id===c.id);assert.ok(meta);
  assert.equal(source.chapters[c.id].anchor,new URL(meta.url).hash.slice(1));
  assert.equal(c.sourceTitle,source.chapters[c.id].title);
  assert.match(c.sourceTitle,/^CHAPTER [IVXLCDM]+(?:[—.]|$)/);
 }
 assert.equal(source.chapters['p1-b1-c1'].title,'CHAPTER I—M. MYRIEL');
 assert.ok(Object.values(source.chapters).some(c=>c.title==='CHAPTER IV—THE IMMORTAL LIVER'));
});
