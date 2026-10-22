'use strict';
const assert=require('node:assert/strict');
exports.beforeContentAudit=(input,kind)=>{
 const x=JSON.parse(JSON.stringify(input));
 if(kind!=='extras')return x;
 const milestone=x.novel.milestones.find(x=>x.id==='trial-fantine');
 const ref={label:{en:'Part I, book 8, chapter 4',he:'חלק I, ספר 8, פרק 4'},url:'https://www.gutenberg.org/files/135/135-h/135-h.htm#link2HCH0069'};
 assert.deepEqual(milestone.references.at(-1),ref);assert.equal(milestone.references.length,3);milestone.references.pop();
 const book=x.readingLocator.parts.flatMap(x=>x.books).find(x=>x.id==='p4-b11');
 const pairs=[['en','Gavroche sets out toward the fighting with a pistol whose hammer is missing.','Gavroche sets out toward the fighting with a pistol that has no trigger.'],['he','גברוש יוצא לעבר הלחימה עם אקדח שחסר בו הפטיש של מנגנון הירי.','גברוש יוצא לעבר הלחימה עם אקדח שאין בו הדק.']];
 for(const [lang,after,before]of pairs){assert(book.overviewParagraphs[0][lang].startsWith(after));book.overviewParagraphs[0][lang]=book.overviewParagraphs[0][lang].replace(after,before);}
 return x;
};
