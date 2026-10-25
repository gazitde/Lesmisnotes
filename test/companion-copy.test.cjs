'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=process.env.LESMIS_SOURCE||path.resolve(__dirname,'..');
test('home has two focused audience routes while featured performances remain in the catalogue',()=>{
 for(const lang of ['en','he']){
  const page=fs.readFileSync(path.join(root,`dist/${lang}/home/index.html`),'utf8');
  assert.equal((page.match(/class="path-card"/g)||[]).length,2);
  assert.ok(page.includes('data-interest="musical"')&&page.includes('data-interest="novel"'));
  for(const token of ['data-interest="both"','data-home-journey=','class="vinyl"','stats-review-note','data-gallery-link="JMGMSgPHJoI"','data-gallery-link="_6nTyXcmgLc"'])assert.ok(!page.includes(token));
  const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'dist/extras.js'),'utf8'),ctx);
  for(const id of ['JMGMSgPHJoI','_6nTyXcmgLc'])assert.ok(ctx.window.EXTRA_CONTENT.gallery.items.some(item=>item.id===id),'Featured recording remains in catalogue '+id);
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
 assert.equal(w.checkedDate,'2026-10-11');assert.equal(n.checkedDate,'2026-10-25');
 assert.equal(n.status,'ended');assert.equal(n.statusLabel.en,'Runs ended');
 assert.match(n.paragraphs.en.join(' '),/Both local runs listed here have ended/);
 assert.match(n.paragraphs.he.join(' '),/שתי ההפקות המקומיות שצוינו כאן הסתיימו/);
 assert.match(n.paragraphs.en.join(' '),/15 July–18 October 2026/);assert.match(n.paragraphs.en.join(' '),/15 May–23 October 2026/);
 assert.equal(n.additionalLinks[1].url,'https://www.tuacahn.org/show/les-miserables-2026/');
 assert.ok(!w.cards.find(x=>x.id==='madrid').sourceIds.includes('watch-london-extension'));
 assert.ok(!fs.readFileSync(path.join(root,'dist/app.js'),'utf8').includes('איפה רואים עכשיו'));
 const fisher=o.israel.sections.find(x=>x.id==='beyond-israel');assert.match(fisher.paragraphs[0].en,/Friday evenings or at Saturday matinees/);assert.ok(fisher.sourceIds.includes('israel-dudu-shabbat-interview'));
});
