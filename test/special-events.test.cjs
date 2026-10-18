'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('dist/extras.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('dist/special-events-data.js','utf8'),ctx);
const events=ctx.window.EXTRA_CONTENT.specialEvents;
test('special events distinguish five documented recordings and occasions',()=>{
 assert.deepEqual(Array.from(events,e=>e.id),['concert-1995','concert-2010','concert-2019','gala-2025','album-2026']);
 for(const e of events){for(const lang of ['en','he']){assert.ok(e.title[lang]);assert.ok(e.cast[lang]);assert.ok(e.paragraphs.reduce((n,p)=>n+p[lang].split(/\s+/).length,0)>85)}for(const l of e.links)assert.match(l.url,/^https:\/\//);}
 const album=events.find(e=>e.id==='album-2026');assert.match(album.date.en,/29 May 2026/);assert.match(album.paragraphs[0].en,/43-track/);assert.match(album.cast.en,/James D. Gish/);
 assert.match(events.find(e=>e.id==='concert-2019').format.en,/2019.*2020/);
 assert.match(events.find(e=>e.id==='gala-2025').cast.en,/separate event/);
});
for(const lang of ['en','he'])test(`special events prerender, discovery and metadata (${lang})`,()=>{
 const html=fs.readFileSync(`dist/${lang}/special-events/index.html`,'utf8');
 assert.match(html,new RegExp(`<html[^>]+lang="${lang}"`));
 if(lang==='he')assert.match(html,/dir="rtl"/);
 for(const e of events)assert.ok(html.includes(`id="${e.id}"`));
 assert.equal((html.match(/<article class="special-event"/g)||[]).length,5);
 assert.match(html, /property="og:title"/);
 assert.ok(html.includes('https://w.lnk.to/lesmis40PR'));
 assert.equal(/<iframe\b|<video\b|<audio\b/.test(html),false);
 for(const route of ['musical','screen','resources','sitemap'])assert.ok(fs.readFileSync(`dist/${lang}/${route}/index.html`,'utf8').includes(`/${lang}/special-events/`));
 if(fs.existsSync('dist/sitemap.xml')&&fs.readFileSync('dist/sitemap.xml','utf8').includes('<loc>'))assert.ok(fs.readFileSync('dist/sitemap.xml','utf8').includes(`/${lang}/special-events/`));
});
test('special event performers are discoverable in local search without spoilers',()=>{
 const c={window:{EXTRA_CONTENT:ctx.window.EXTRA_CONTENT,SITE_METADATA:JSON.parse(fs.readFileSync('config/metadata.json','utf8'))}};vm.createContext(c);vm.runInContext(fs.readFileSync('dist/search.js','utf8'),c);
 const docs=c.window.SiteSearch.buildIndex();const d=docs.find(d=>d.route==='special-events');assert.ok(d);assert.match(d.body.en,/Killian Donnelly/);assert.match(d.body.he,/קיליאן דונלי/);assert.equal(d.locked,false);assert.match(d.body.en,/40th anniversary/);
});
for(const lang of ['en','he'])test(`recording chooser includes the new album and its discovery link (${lang})`,()=>{
 const D=ctx.window.EXTRA_CONTENT.recordingChooser;
 assert.equal(D.cards.length,6);
 assert.equal(D.cards.filter(c=>c.category==='audio').length,2);
 assert.equal(D.cards.filter(c=>c.category==='concert').length,3);
 const card=D.cards.find(c=>c.id==='album-2026');assert.ok(card);
 assert.equal(card.paragraphs,events.find(e=>e.id==='album-2026').paragraphs);
 assert.equal(card.options[0].url,'https://w.lnk.to/lesmis40PR');
 assert.equal(card.options[0].checkedAt,'2026-10-18');
 const html=fs.readFileSync(`dist/${lang}/musical/index.html`,'utf8');
 assert.equal((html.match(/class="recording-card"/g)||[]).length,6);
 assert.ok(html.includes('id="recording-album-2026"'));
 assert.match(html,new RegExp(`class="text-link recording-events-link" href="/${lang}/special-events/"`));
 assert.ok(html.includes(lang==='he'?'כל הגרסאות (6)':'All editions (6)'));
 assert.equal(html.includes(lang==='he'?'כל החמש':'All five'),false);
});
