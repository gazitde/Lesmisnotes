'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=process.env.LESMIS_SOURCE||path.resolve(__dirname,'..');
test('home has clear routes and a performer-led feature without losing Stars',()=>{
 for(const lang of ['en','he']){
  const page=fs.readFileSync(path.join(root,`dist/${lang}/home/index.html`),'utf8');
  assert.equal((page.match(/class="path-card"/g)||[]).length,3);
  assert.ok(page.includes('333')&&page.includes('365'));
  const boe=page.indexOf('data-gallery-link="JMGMSgPHJoI"'),stars=page.indexOf('data-gallery-link="_6nTyXcmgLc"');
  assert.ok(boe>0&&stars>boe);
 }
});
test('Israel prose separates performer and translator and offers one optional listening prompt',()=>{
 const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'dist/extras.js'),'utf8'),ctx);const i=ctx.window.EXTRA_CONTENT.israel;
 assert.ok(!JSON.stringify(i).includes('הקלטת צוות'));
 assert.match(i.hero.dek.he,/שר דודו פישר.*בתרגום לעברית של אהוד מנור/);
 assert.ok(i.listeningPrompt.paragraphs.length===1);
 for(const id of ['cameri-1987','beyond-israel','hebrew-words'])assert.ok(i.sections.find(x=>x.id===id).paragraphs.length>=1);
 for(const lang of ['en','he']){
  const page=fs.readFileSync(path.join(root,`dist/${lang}/israel/index.html`),'utf8');
  assert.equal((page.match(/class="reading-sources israel-listening-prompt"/g)||[]).length,1);
  assert.match(page,/<details class="reading-sources israel-listening-prompt"><summary>/);
 }
});
test('watch copy uses bounded verification dates and relevant production sources',()=>{
 const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'dist/extras.js'),'utf8'),ctx);const o=ctx.window.EXTRA_CONTENT,w=o.watch,n=w.cards.find(x=>x.id==='north-america');
 assert.equal(w.checkedDate,'2026-10-11');assert.equal(n.checkedDate,'2026-10-16');
 assert.match(n.paragraphs.en.join(' '),/15 July–18 October 2026/);assert.match(n.paragraphs.en.join(' '),/15 May–23 October 2026/);
 assert.equal(n.additionalLinks[1].url,'https://www.tuacahn.org/show/les-miserables-2026/');
 assert.ok(!w.cards.find(x=>x.id==='madrid').sourceIds.includes('watch-london-extension'));
 assert.ok(!fs.readFileSync(path.join(root,'dist/app.js'),'utf8').includes('איפה רואים עכשיו'));
 const fisher=o.israel.sections.find(x=>x.id==='beyond-israel');assert.match(fisher.paragraphs[0].en,/Friday evenings or at Saturday matinees/);assert.ok(fisher.sourceIds.includes('israel-dudu-shabbat-interview'));
});
