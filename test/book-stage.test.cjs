'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c={window:{}};for(const f of ['extras.js','watch-path-data.js','book-stage-data.js','book-stage.js'])vm.runInNewContext(fs.readFileSync('dist/'+f,'utf8'),c);
const {BOOK_STAGE_DATA:data,BookStage:api,EXTRA_CONTENT:R,WATCH_PATH_DATA:watch}=c.window;
const chapters=R.chapterCompanion.chapters,ids=new Set(chapters.map(x=>x.id)),songs=new Set(watch.stops.map(s=>s.songId));
assert.equal(ids.size,365);assert.equal(data.scenes.length,38);assert.equal(new Set(data.scenes.map(s=>s.songId)).size,38);
const audit=JSON.parse(fs.readFileSync('docs/book-stage-mapping.json','utf8'));assert.deepEqual(JSON.parse(JSON.stringify(data.scenes)),audit.scenes);assert.equal(audit.chapters.length,365);
let edges=0;
for(const s of data.scenes){assert.ok(songs.has(s.songId),s.songId);for(const r of s.relations){assert.ok(['direct','compressed','shifted','composite','thematic'].includes(r.kind),r.kind);assert.ok(r.note.en&&r.note.he);assert.ok(r.chapterIds.length);assert.equal(new Set(r.chapterIds).size,r.chapterIds.length);for(const id of r.chapterIds){assert.ok(ids.has(id),id);edges++}}
 for(const lang of ['en','he']){const html=api.renderScene({songId:s.songId,lang,chapterHref:id=>'/'+lang+'/novel/?focus=chapter%3A'+id});assert.ok(html.includes('data-scene-book="'+s.songId+'"'));assert.ok(!/<details[^>]*\bopen(?:\s|>)/.test(html));assert.ok(!/<iframe|<img|<video/.test(html));for(const id of s.relations.flatMap(r=>r.chapterIds))assert.ok(html.includes('chapter%3A'+id))}}
for(const chapter of chapters)for(const lang of ['en','he'])for(const spoiler of [false,true]){const html=api.renderChapter({chapterId:chapter.id,lang,spoiler,sceneHref:id=>'/'+lang+'/musical/?focus=song%3A'+id+'&view=journey',sceneTitle:id=>'SCENE-TITLE-'+id});assert.ok(html.includes('data-chapter-stage="'+chapter.id+'"'));assert.ok(!/<details[^>]*\bopen(?:\s|>)/.test(html));if(!spoiler)assert.ok(!html.includes('SCENE-TITLE-'),'Gate hides titles');else for(const s of data.scenes.filter(s=>s.relations.some(r=>r.chapterIds.includes(chapter.id))))assert.ok(html.includes('song%3A'+s.songId),'Every relation is reciprocal');}
assert.equal(api.renderScene({songId:'not-a-song'}),'');assert.ok(api.reference('p5-b9-c6','en').includes('Part V · Book 9 · Chapter 6'));
console.log('PASS: 365 chapter statuses, 38 scenes, '+edges+' reciprocal chapter references; EN/HE, spoiler gate, collapsed/no-media rendering.');
