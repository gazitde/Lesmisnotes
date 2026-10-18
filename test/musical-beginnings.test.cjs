'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
for(const lang of ['he','en'])test(`difficult beginnings is visible, sourced and navigable (${lang})`,()=>{
 const html=fs.readFileSync(`dist/${lang}/musical/index.html`,'utf8');
 const start=html.indexOf('<section class="musical-section creation-reception musical-beginnings"');
 assert.ok(start>0);
 const story=html.slice(start,html.indexOf('</section>',start));
 assert.ok(story.includes(lang==='he'?'כל ההתחלות קשות':'Every beginning is difficult'));
 assert.ok(story.includes(lang==='he'?'שיחת הטלפון לקופה':'telephone call to the box office'));
 assert.ok(story.includes(lang==='he'?'4 בדצמבר 1985':'4 December 1985'));
 assert.ok(story.includes('1980'));
 assert.equal(story.includes('<details'),false);
 assert.equal((html.match(/id="musical-beginnings"/g)||[]).length,1);
 assert.ok(html.indexOf('id="musical-genesis"')>start);
 assert.ok(html.includes('data-page-section="musical-beginnings"'));
 assert.ok(story.includes('les-mis-study-guide-pt1.pdf'));
 assert.ok(story.includes('cameronmackintosh.com/about/history/1981-1990'));
 assert.ok(!html.includes(lang==='he'?'הסיפור המוכר שלפיו':'The familiar story that'));
});
