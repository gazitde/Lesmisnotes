const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const css=fs.readFileSync('dist/journey-pages.css','utf8');
const app=fs.readFileSync('dist/app.js','utf8');
test('programme artwork stays local, decorative and bounded',()=>{
 assert.match(app,/class="path-frontispiece path-frontispiece-\$\{d.id\}" aria-hidden="true"/);
 assert.match(app,/img fetchpriority="high" src="\/scene.svg" width="920" height="920" alt=/);
 assert.match(css,/path-frontispiece-novel\{background-image:url\('\/assets\/novel-frontispiece.svg'\)\}/);
 const svg=fs.readFileSync('dist/assets/novel-frontispiece.svg','utf8');
 assert.ok(Buffer.byteLength(svg)<5000);
 assert.doesNotMatch(svg,/<script|<foreignObject|href=|<text/i);
 assert.match(svg,/viewBox="0 0 760 360"/);
});
test('refresh contains explicit mobile, motion and contrast fallbacks',()=>{
 const refresh=css.slice(css.indexOf('/* A theatre programme'));
 assert.match(refresh,/@media\(max-width:680px\)/);
 assert.match(refresh,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(refresh,/@media\(forced-colors:active\)/);
 assert.match(refresh,/musical-journey-opening\{background:#f6f0e6;color:#182940/);
 assert.match(refresh,/musical-opening-credit\{color:#4b5667/);
 assert.match(refresh,/bookmark-control.saved svg\{fill:currentColor\}/);
 assert.doesNotMatch(refresh,/animation:|@import|https?:/);
});
