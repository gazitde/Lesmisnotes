import fs from 'node:fs';
import assert from 'node:assert/strict';
const css=fs.readFileSync('dist/editorial.css','utf8');
const art=fs.readFileSync('dist/assets/paris-frontispiece.svg','utf8');
assert.ok(Buffer.byteLength(css)<26000,'Editorial layer stays below 26KB uncompressed');
assert.ok(Buffer.byteLength(art)<10000,'Original illustration stays below 10KB');
assert.ok(!/(?:href|src)=["']https?:|<script|<foreignObject|onload=/i.test(art),'Illustration has no external dependencies or executable content');
assert.ok(/prefers-reduced-motion/.test(css)&&/forced-colors/.test(css),'Motion and contrast preferences are handled');
assert.ok(!/url\(/.test(css),'Editorial CSS adds no external asset or font requests');
for(const language of ['he','en'])for(const route of ['home','musical-journey','novel-journey','characters']){
 const html=fs.readFileSync(`dist/${language}/${route}/index.html`,'utf8');
 assert.equal((html.match(/href="\/editorial\.css\?/g)||[]).length,1,'Final stylesheet occurs once');
 assert.ok(html.indexOf('/editorial.css?')>html.indexOf('/journey-pages.css?'),'Presentation layer follows previous CSS');
 if(route==='home'){
  assert.ok(html.includes('src="/assets/paris-frontispiece.svg" width="600" height="660"'),'Hero intrinsic size prevents layout shift');
  for(const target of ['musical-journey','novel-journey','places','recipes','quiz','ideas'])assert.ok(html.includes(`href="/${language}/${target}/"`),'Existing destinations retained');
 }
}
console.log('Editorial presentation: local asset budget, safe SVG, motion/contrast preferences, stylesheet order, intrinsic image dimensions and bilingual destinations verified. Browser geometry is checked separately.');
