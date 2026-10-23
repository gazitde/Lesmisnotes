const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs');
const ids=['valjean','javert','bishop','fantine','cosette','marius','eponine','thenardiers','enjolras','gavroche'];
test('ten original character portraits are bounded, inert local SVGs',()=>{
 for(const id of ids){const s=fs.readFileSync(`dist/assets/portraits/${id}.svg`,'utf8');assert.match(s,/<svg\b/);assert.match(s,/viewBox="0 0 320 320"/);assert.ok(Buffer.byteLength(s)<12000);assert.doesNotMatch(s,/<(?:script|foreignObject|image)\b|\bon\w+=|(?:href|src)="(?:https?:|data:|javascript:)/i);}
 assert.match(fs.readFileSync('docs/CHARACTER_PORTRAITS.md','utf8'),/original/i);
});
test('both language entrances and profiles expose portrait-backed accessible character names',()=>{
 for(const lang of ['he','en']){const s=fs.readFileSync(`dist/${lang}/characters/index.html`,'utf8');for(const id of ids)assert.ok(s.includes(`/assets/portraits/${id}.svg`));assert.match(s,/relationship-map/);assert.match(s,/safe-character-overview/);}
 const app=fs.readFileSync('dist/app.js','utf8');assert.match(app,/characterPortrait\(id,'profile-portrait'\)/);assert.match(app,/alt="" loading="lazy" decoding="async"/);
});
