import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context = { window: {}, URLSearchParams };
vm.createContext(context);
for (const name of ['research', 'extras', 'places-data', 'recipes-data', 'seo', 'search']) vm.runInContext(fs.readFileSync(`dist/${name}.js`, 'utf8'), context);
const W = context.window, S = W.SiteSearch;
const source = { research: W.RESEARCH, extra: W.EXTRA_CONTENT, places: W.PLACE_CONTENT, recipes: W.RECIPE_CONTENT, metadata: W.SITE_METADATA };
const safe = S.buildIndex(source), full = S.buildIndex(source, { spoiler: true, novelConsent: true, afterConsent: true });
const chapters = W.EXTRA_CONTENT.chapterCompanion.chapters;
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const results = (query, lang = 'en', index = safe, category = 'all') => S.search(index, query, { lang, category, limit: 1000 });
check(chapters.length === 365 && safe.filter(d => d.kind === 'chapter').length === 365, 'All actual chapter coordinates have metadata-only records');
for (const c of chapters) for (const lang of ['en', 'he']) {
  const queries = [c.id, `part ${c.part} book ${c.book} chapter ${c.chapter}`, `חלק ${c.part} ספר ${c.book} פרק ${c.chapter}`, `${c.part}.${c.book}.${c.chapter}`];
  for (const query of queries) {
    const found = results(query, lang);
    check(found.total === 1 && found.results[0].doc.id === 'chapter:' + c.id, `Exact coordinate ${lang} ${query}`);
    check(found.results[0].href === `/${lang}/novel-journey/?focus=chapter%3A${c.id}`, `Localized exact coordinate link ${query}`);
    check(S.readTarget(new URL(found.results[0].href, 'https://example.test').search, 'novel')?.key === c.id, 'Chapter links retain current route contract');
  }
}
for (const q of ['PART 01, BOOK 01, CHAPTER 002', 'Part 1 · Book 1 · Chapter 2', 'חֵלֶק 1, סֵפֶר 1, פֶּרֶק 2', '1 . 1 . 2', ' p1-b1-c2 ', 'p1 - b1 - c2']) check(results(q).results[0]?.doc.id === 'chapter:p1-b1-c2', 'Bounded coordinate formatting ' + q);
for (const q of ['0.1.1', '6.1.1', '1.9.1', '1.1.15', 'p1-b1-c0', 'p1-b1-c999', 'p999-b1-c1', 'p1-b999-c1', 'part 1 book 0 chapter 1', 'part 1 book -1 chapter 2', 'חלק 1 ספר 99 פרק 2', '1.1.2.3', 'p1-b1-c2 extra', 'p1-b1-c2<script>', 'part one book one chapter two', '9999999999999999999999.1.2']) for (const lang of ['he', 'en']) check(results(q, lang).total === 0, 'Invalid coordinates never degrade to substrings ' + q);
check(results('1.1.2', 'en', safe, 'songs').total === 0, 'Song category excludes exact chapter');
check(results('1.1.2', 'he', safe, 'story').total === 1, 'Story category includes exact chapter');
check(S.search(safe, '1.1.2', { limit: 0 }).results.length === 0, 'Coordinate result respects zero limit');
check(results('24601').results[0]?.doc.id === 'character:valjean', 'Plain numeric alias keeps existing ranking');
check(!results('1').results.some(h => h.doc.kind === 'chapter'), 'Generic numeric search is not swamped by chapter metadata');
check(!results('book').results.some(h => h.doc.kind === 'chapter'), 'Generic text search is not swamped by coordinate-only records');
for (const [query, id] of [['Master of the House', 'master-house'], ['אדון הבית', 'master-house'], ['Who Am I?', 'who-am-i'], ['מי אני', 'who-am-i'], ['Come to Me', 'come-to-me'], ['Javert’s Soliloquy', 'javert-soliloquy'], ['Little People', 'javert-barricade'], ['Drink With Me', 'drink-with-me'], ['The Docks', 'docks']]) for (const lang of ['he', 'en']) {
  const hit = results(query, lang).results[0];
  check(hit?.doc.id === 'song:' + id, 'Reviewed song title ranks first ' + query);
  check(hit.href === `/${lang}/${W.EXTRA_CONTENT.musical.spotlight.songs.some(s=>s.id===id)?'musical':'musical-journey'}/?focus=song%3A${id}`, 'Reviewed song keeps localized current-entry link');
  check(hit.doc.locked && hit.doc.titleOnly && hit.doc.body.en === '' && hit.doc.body.he === '', 'New song is title-only and consent-labelled');
}
for (const song of W.EXTRA_CONTENT.musical.songentries) {
  const title = S.safeSongTitle(song), doc = safe.find(d => d.id === 'song:' + song.id);
  check(title ? !!doc : !doc, 'Every reviewed title is present; outcome-only names fail closed: ' + song.id);
}
check(safe.filter(d => d.kind === 'song').length === 37, '37 reviewed song-name entries; outcome-only Arrested/Forgiven remains gated');
check(!JSON.stringify(safe.filter(d => d.kind === 'song')).match(/Fantine’s Death|Fantine's Death|Javert’s Suicide|Javert's Suicide|Valjean releases Javert|התאבדותו|משחרר את ז׳אבר/), 'Outcome-bearing headings absent from safe song records');
check(full.some(d => d.id === 'song:valjean-forgiven'), 'Existing fully consented song remains available');
for (const q of ['Cosset', 'Cossette', 'Cosette', 'קוזט', 'קוסט']) for (const lang of ['he', 'en']) check(results(q, lang).results[0]?.doc.id === 'character:cosette', 'Curated Cosette variant ranks first ' + q);
for (const q of ['Cozzete', 'Coesettte', 'xyzcossetxyz']) check(!results(q).results.some(h => h.doc.id === 'character:cosette'), 'No unrestricted fuzzy/typo search ' + q);
const probe = structuredClone(source);
for (const c of probe.extra.chapterCompanion.chapters) { c.title = { en: 'HIDDENCHAPTERTITLE', he: 'סודכותרתפרק' }; c.summary = { en: 'HIDDENCHAPTERSUMMARY', he: 'סודתוכןפרק' }; c.url += '#HIDDENCHAPTERURL'; }
for (const s of probe.extra.musical.songentries) if (!probe.extra.musical.spotlight.songs.some(x => x.id === s.id)) {
  for (const field of ['title', 'catalogueTitle', 'scene', 'summary', 'mood', 'question', 'characters']) s[field] = { en: 'HIDDENSONGDEPTH', he: 'סודתוכןשיר' };
}
probe.extra.musical.songentries.push({ id: 'unreviewed-future-song', title: { en: 'HIDDENNEWSONG', he: 'סודשירחדש' } });
const protectedIndex = S.buildIndex(probe);
for (const q of ['HIDDENCHAPTERTITLE', 'סודכותרתפרק', 'HIDDENCHAPTERSUMMARY', 'סודתוכןפרק', 'HIDDENCHAPTERURL', 'HIDDENSONGDEPTH', 'סודתוכןשיר', 'HIDDENNEWSONG']) {
  check(results(q, 'en', protectedIndex).total === 0, 'Hidden fields cannot influence matching ' + q);
  check(!JSON.stringify(protectedIndex).includes(q), 'Hidden fields absent from complete index ' + q);
}
check(results('Master of the House', 'en', protectedIndex).results[0]?.doc.id === 'song:master-house', 'Safe catalogue names do not derive from later changed outcome headings');
for (let part = 1; part <= 5; part++) for (const c of JSON.parse(fs.readFileSync(`dist/reading/part-${part}.json`)).chapters) for (const lang of ['en', 'he']) check(!JSON.stringify(full).includes(c.summary[lang]), 'No full chapter summary in any permission partition');
check(S.resultsHTML(results('Master of the House'), 'Master of the House', 'en').replace(/<[^>]+>/g, '').includes('Name match. Continue to the page'), 'Title-only result explains consent');
check(S.resultsHTML(results('1.1.2'), '1.1.2', 'en').includes('Open the reading companion at this chapter.'), 'Chapter result uses only a neutral reading invitation');
check(!S.resultsHTML(results('1.1.2'), '1.1.2', 'en').includes('Plot details by consent'), 'Chapter result does not advertise an obsolete reveal gate');
// This must remain a pure local feature; chapter payloads are never fetched by search.
const code = fs.readFileSync('dist/search.js', 'utf8');
check(!/\b(?:fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|gtag)\s*[.(]/.test(code), 'No query networking, storage, analytics or chapter fetches');
check(S.buildIndex({}).length === 0 && S.search([], '1.1.2').total === 0, 'Missing sources produce honest no results');
// The source catalogue is a separate search. Its existing implementation must be unchanged.
const app = fs.readFileSync('dist/app.js', 'utf8');
check(app.includes("function sourceMatches(){const q=sourceSearch.trim().toLocaleLowerCase();return bibliography().filter(x=>(sourceTopic==='all'||x.groups.includes(sourceTopic))&&(!q||x.search.includes(q)||x.url.toLocaleLowerCase().includes(q)))}"), 'Source finder matching untouched');
console.log(`Search polish: ${checks} checks passed; all 365 coordinates × 4 formats × 2 languages, safe title coverage, ranking, aliases, canaries and source-finder isolation.`);
