
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
for(const lang of ['he','en'])test(`documentary context is bilingual and timestamped (${lang})`,()=>{
 const musical=fs.readFileSync(`dist/${lang}/musical/index.html`,'utf8'),israel=fs.readFileSync(`dist/${lang}/israel/index.html`,'utf8');
 for(const [id,time] of [['recording',560],['words',1053],['barricade',1881]]){assert.equal((musical.match(new RegExp(`data-documentary-moment="${id}"`,'g'))||[]).length,1);assert.ok(musical.includes(`fPLBPiF18k0&amp;t=${time}s`));}
 assert.ok(israel.includes('data-documentary-moment="fisher"'));assert.ok(israel.includes('fPLBPiF18k0&amp;t=430s'));
 assert.ok(musical.includes('cb38434343v'));assert.ok(musical.includes('johnnapierstages.com/shows-plays/les-miserables'));assert.ok(musical.includes('songwriter.co.uk/page706.html'));
 for(const time of [148,301,1118,2305,2376])assert.ok(musical.includes(`fPLBPiF18k0&amp;t=${time}s`));
 assert.equal((musical.match(/data-documentary-history/g)||[]).length,1);assert.equal((musical.match(/data-documentary-opening/g)||[]).length,1);
 assert.ok(musical.includes('johncaird.com/les-miserables-rsc-palace/'));
 assert.ok(musical.includes('2025'));assert.ok(musical.includes('Stage by Stage (1988)'));assert.ok(!musical.includes('youtube.com/embed/fPLBPiF18k0'));
});
