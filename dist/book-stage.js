/* One evidence-backed map, read in both directions. No media or network side effects. */
(function (window) {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text = (lang,en,he) => lang === 'he' ? he : en;
  const tr = (value,lang) => typeof value === 'object' && value ? value[lang] || value.en || '' : value || '';
  const kinds = {direct:['Direct adaptation','עיבוד ישיר'],compressed:['Condensed','מקוצר'],shifted:['Reordered','בסדר אחר'],composite:['Composite scene','סצנה משולבת'],thematic:['Thematic connection','קשר רעיוני']};
  const data = () => window.BOOK_STAGE_DATA;
  const label = (kind,lang) => text(lang,...(kinds[kind] || kinds.thematic));
  function reference(id,lang) {
    const m = /^p([1-5])-b(\d+)-c(\d+)$/.exec(id);
    if (!m) return '';
    return text(lang,`Part ${['I','II','III','IV','V'][+m[1]-1]} · Book ${m[2]} · Chapter ${m[3]}`,`חלק ${['א׳','ב׳','ג׳','ד׳','ה׳'][+m[1]-1]} · ספר ${m[2]} · פרק ${m[3]}`);
  }
  function method(lang) {
    return `<p class="book-stage-method">${escape(tr(data()?.scope?.note,lang) || text(lang,'A reading map to the licensed stage musical. Connections describe adaptation, not identical dialogue; the musical’s songs are new writing. Part / Book / Chapter numbers follow the complete novel, not page numbers.','מפת קריאה למחזמר הבימתי המורשה. הקשרים מתארים עיבוד, לא דיאלוג זהה; השירים נכתבו למחזמר. המספור הוא חלק / ספר / פרק ברומן המלא, ולא מספרי עמודים.'))}</p><div class="book-stage-links"><a href="https://www.mtishows.co.uk/print/node/1293" target="_blank" rel="noopener noreferrer">${text(lang,'Stage synopsis · MTI','תקציר הבמה · MTI')}</a><a href="https://www.gutenberg.org/files/135/135-h/135-h.htm" target="_blank" rel="noopener noreferrer">${text(lang,'Complete novel · Gutenberg','הרומן המלא · גוטנברג')}</a></div>`;
  }
  function renderScene({songId,lang='en',chapterHref}) {
    const scene=data()?.scenes.find(s=>s.songId===songId);
    if(!scene)return '';
    const relations=scene.relations||[], ids=[...new Set(relations.flatMap(r=>r.chapterIds))];
    return `<details class="book-stage" data-scene-book="${escape(songId)}"><summary><span>${text(lang,'In the novel','ברומן')}</span><small>${ids.length?text(lang,`${ids.length} chapter${ids.length===1?'':'s'}`,`${ids.length} פרקים`):text(lang,'Written for the stage','נכתב לבמה')}</small></summary><div class="book-stage-body"><p class="book-stage-method">${text(lang,'This comparison includes events across the novel, including later chapters.','ההשוואה כוללת אירועים מכל הרומן, גם מפרקים מאוחרים.')}</p>${scene.note?`<p>${escape(tr(scene.note,lang))}</p>`:''}${scene.musicalOnly?`<p class="book-stage-original">${text(lang,'This musical number has no direct chapter equivalent. Related passages below, if any, are context rather than the same scene.','לשיר הזה אין מקבילה ישירה בפרקי הרומן. הקטעים המקושרים כאן, אם ישנם, מספקים הקשר ואינם אותה סצנה.')}</p>`:''}${relations.map(r=>`<section class="book-stage-relation"><span class="book-stage-kind">${escape(label(r.kind,lang))}</span><p>${escape(tr(r.note,lang))}</p><div class="book-stage-links">${r.chapterIds.map(id=>`<a data-reader-link href="${escape(chapterHref(id))}">${escape(reference(id,lang))}<span aria-hidden="true"> ↗</span></a>`).join('')}</div></section>`).join('')}${!relations.length&&!scene.musicalOnly?`<p>${text(lang,'No direct chapter equivalent is identified.','לא זוהתה מקבילה ישירה בפרקי הרומן.')}</p>`:''}${method(lang)}</div></details>`;
  }
  function renderChapter({chapterId,lang='en',spoiler=false,sceneHref,sceneTitle}) {
    const D=data();if(!D)return '';
    const relations=D.scenes.flatMap(s=>(s.relations||[]).filter(r=>r.chapterIds.includes(chapterId)).map(r=>({scene:s,relation:r})));
    const adapted=relations.some(r=>r.relation.kind!=='thematic');
    const status=adapted?text(lang,'Adapted on stage','עובד לבמה'):relations.length?text(lang,'Background connection','קשר רקע'):text(lang,'Not directly staged','לא עובד ישירות לבמה');
    return `<details class="book-stage book-stage-chapter" data-chapter-stage="${escape(chapterId)}"><summary><span>${text(lang,'In the musical','במחזמר')}</span><small>${status}</small></summary><div class="book-stage-body">${relations.length?(spoiler?relations.map(({scene,relation})=>`<section class="book-stage-relation"><a data-insight-link href="${escape(sceneHref(scene.songId))}">${escape(sceneTitle(scene.songId))}<span aria-hidden="true"> ↗</span></a><span class="book-stage-kind">${escape(label(relation.kind,lang))}</span><p>${escape(tr(relation.note,lang))}</p></section>`).join(''):`<p>${text(lang,'Scene titles and adaptation notes can reveal later events. Open wider-story spoilers to see the connections.','שמות הסצנות והערות העיבוד עשויים לחשוף אירועים מאוחרים. פתחו ספוילרים לסיפור הרחב כדי לראות את הקשרים.')}</p><button class="text-button" data-stage-reveal="${escape(chapterId)}">${text(lang,'Reveal stage connections · spoilers','הצגת הקשרים לבמה · ספוילרים')}</button>`):`<p>${text(lang,'This chapter is not directly represented by a scene in the stage version mapped here. Its characters or themes may still shape the wider story.','הפרק הזה אינו מיוצג ישירות בסצנה בגרסת הבמה הממופה כאן. הדמויות או הנושאים שלו עשויים להשפיע על הסיפור הרחב.')}</p>`}${method(lang)}</div></details>`;
  }
  window.BookStage=Object.freeze({renderScene,renderChapter,reference});
})(window);
