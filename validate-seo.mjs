import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('dist/seo.js','utf8'),ctx);const M=ctx.window.SITE_METADATA;
vm.runInNewContext(fs.readFileSync('dist/extras.js','utf8'),ctx);const defaultCoaches=(ctx.window.EXTRA_CONTENT.coachVideos||[]).filter(v=>v.songId==='on-my-own'&&v.showWithSong!==false&&v.embeddable&&v.spoilerLevel<2);
let checks=0;const titles=new Set(),descriptions=new Set();
for(const [route,meta] of Object.entries(M.pages))for(const lang of ['he','en']){
 const canonicalRoute=meta.canonicalRoute||route;const file=`dist/${lang}/${route}/index.html`,html=fs.readFileSync(file,'utf8');
 assert.ok(html.includes(`<html lang="${lang}" dir="${lang==='he'?'rtl':'ltr'}">`));
 assert.equal((html.match(/<title>/g)||[]).length,1);assert.ok(html.includes(meta.title[lang]));
 assert.equal((html.match(/rel="canonical"/g)||[]).length,M.origin?1:0);if(M.origin)assert.ok(html.includes(`rel="canonical" href="${M.origin}/${lang}/${canonicalRoute}/"`));
 for(const locale of (M.origin?['he','en','x-default']:[])){assert.ok(html.includes(`hreflang="${locale}" href="${M.origin}/${locale==='x-default'?'en':locale}/${canonicalRoute}/"`));checks++}
 assert.ok(html.includes(`<meta name="robots" content="${M.private?'noindex, follow':'index, follow, max-image-preview:large'}">`));assert.ok(html.includes('<main id="main"'));assert.ok(html.includes('<h1>'));assert.equal((html.match(/<iframe /g)||[]).length,route==='musical'?defaultCoaches.length:0);
 assert.ok(!html.includes('src="scene.svg"'));assert.ok(html.includes('src="/app.js?v='));assert.ok(html.includes('href="/style.css?v='));assert.ok(!html.includes('href="#/'));
 for(const match of html.matchAll(/(?:src|href)="(\/(?:he|en)\/[^"#?]+\/|\/[^"#?]+\.(?:js|css|svg))(?:\?v=[a-f0-9]+)?"/g)){const asset='dist'+match[1]+(match[1].endsWith('/')?'index.html':'');assert.ok(fs.existsSync(asset),`Missing ${asset}`);checks++}
 for(const match of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)){const schema=JSON.parse(match[1]);assert.ok(schema['@graph'].length);assert.ok(!match[1].includes('aggregateRating'));if(M.origin&&canonicalRoute!=='home')assert.ok(schema['@graph'].some(x=>x['@type']==='BreadcrumbList'));checks+=3;}if(M.origin){assert.ok(html.includes('/assets/social-card.png'));checks++;}
 assert.ok(!titles.has(meta.title[lang]));titles.add(meta.title[lang]);assert.ok(!descriptions.has(meta.description[lang]));descriptions.add(meta.description[lang]);checks+=15;
 if(['novel','after','compare','characters','quiz','ideas'].includes(route)){assert.ok(!html.includes('class="novel-event"'));assert.ok(!html.includes('class="adaptation-card"'));assert.ok(!html.includes('class="curtain-stop"'));assert.equal(html.includes('class="graph-node'),route==='characters');assert.ok(!html.includes('data-quiz-option'));checks+=5}
}
for(const lang of ['he','en']){const html=fs.readFileSync(`dist/${lang}/sitemap/index.html`,'utf8');for(const route of Object.keys(M.pages).filter(r=>!M.pages[r].canonicalRoute)){assert.ok(html.includes(`href="/${lang}/${route}/"`),`${route} missing from visual sitemap`);checks++}}
const xml=fs.readFileSync('dist/sitemap.xml','utf8');assert.equal((xml.match(/<loc>/g)||[]).length,M.origin&&!M.private?Object.values(M.pages).filter(p=>!p.canonicalRoute).length*2:0);assert.equal(fs.readFileSync('dist/robots.txt','utf8').includes('Sitemap:'),Boolean(M.origin&&!M.private));checks+=2;
console.log(`PASS: ${checks} static SEO/route checks across ${Object.values(M.pages).filter(p=>!p.canonicalRoute).length*2} canonical localized pages + ${Object.values(M.pages).filter(p=>p.canonicalRoute).length*2} compatibility pages. Unique safe metadata, reciprocal hreflang, environment-aware indexing, static content, local assets and visual-sitemap reachability.`);
