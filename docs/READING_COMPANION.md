# Novel reading hierarchy

The reader at `/en/novel/` and `/he/novel/` follows Hugo’s five Parts, 48 Books and 365 chapters. Numbering follows the complete novel, independent of an edition’s page count or physical volumes. Every chapter source link targets its exact passage in Isabel F. Hapgood’s public-domain English translation, hosted by Project Gutenberg.

## Three levels

- The entrance shows five Part cards, each with two bilingual overview paragraphs.
- Choosing a Part shows only its Books: 8, 8, 8, 15 and 9 respectively. Each Book has two bilingual overview paragraphs.
- Choosing a Book shows all its chapter summaries in canonical order. Summaries are visible immediately, on desktop and mobile. Supporting cues, earlier-event reminders and contextual notes are optional details beneath the prose.
- A single notice at each level explains its spoiler scope. The Part entrance covers the whole novel; a Part view covers its Books; a Book view covers its chapters. No additional per-summary reveal click is required.
- Each chapter summary remains confined to that chapter. Reminder references must precede it. Character lookup stays conservatively bounded by the start of the Book. Wider-story connections retain the existing spoiler consent. The separate 14-milestone full-novel recap retains its own consent.
- Global search indexes neutral chapter coordinates and navigation text, never chapter summary prose. Search navigation opens the appropriate Book and focuses the exact requested chapter.
- The no-JavaScript version provides the five Part overviews and all 365 exact primary-text links.

## Data and navigation

The 53 reviewed overview records use `overviewParagraphs: [{he,en},{he,en}]` on `readingLocator.parts[]` and each Part’s `books[]`. `sourceRefs` provides exact primary chapter ranges. Optional `title` labels supply original Book headings while neutral Part/Book numbering remains available.

`dist/reading/part-1.json` through `part-5.json` retain the reviewed chapter notes. Root and Part views download no chapter payload. Entering a Book fetches only its Part, reused in memory for that visit. Failed loads offer retry and full-text links without erasing the requested position. Late responses cannot replace a newer Book or hierarchy level.

Exact URLs use `?focus=part:p2`, `?focus=book:p2-b3` and `?focus=chapter:p2-b3-c5`. Chapter links enter their Book’s list and focus the exact article. Breadcrumbs, browser Back/Forward, reload and language changes preserve the appropriate level. Resume uses the existing optional functional-preference consent; no reading position is persisted without it.

## Opening orientation and evidence

Checked 12 October 2026:

- Hugo’s novel opens with Bishop Myriel, the bishop of Digne, in Part I, Book I, Chapter I. [French primary text](https://www.gutenberg.org/files/17489/17489-h/17489-h.htm); [Hapgood’s exact chapter](https://www.gutenberg.org/cache/epub/135/pg135-images.html#link2HCH0001).
- The stage musical opens with a chain gang doing hard labor and identifies Jean Valjean as prisoner 24601. [Official Music Theatre International synopsis](https://www.mtishows.com/full-synopsis/1293), Act One opening paragraph; [MTI show page and opening number](https://www.mtishows.com/les-miserables).
- The 2012 musical film’s shooting screenplay opens at Toulon with the imprisoned Jean Valjean among the convicts hauling a ship. [Primary screenplay, opening scene on PDF page 2](https://screenplayed.com/s/lesmiserables.pdf). The film’s identity/year is corroborated by [Universal’s official film page](https://www.universalpicturesathome.com/movies/les-miserables-2012).

The orientation explains only this difference in openings. It does not reorder the novel or introduce a later plot outcome. The first chapter introduces him as “הבישוף מיריאל / Bishop Myriel” before giving his longer name.

## Regression checks

`validate-chapter-reader.mjs` retains every record/count/reminder/source/search/prerender check. `validate-reader-hierarchy.mjs` exercises the real app renderer across all 5/48/365 locations in Hebrew and English, checks exactly two substantive bilingual paragraphs per overview, unique chapter IDs, scope boundaries, exact URL/focus and independent full-recap consent.

`scripts/browser-chapter-companion.cjs` exercises every chapter in both languages, all hierarchy levels, browser history, narrow layouts, immediate summaries, failure/retry/race, language/reload, exact focus, opt-in resume and scoped maps. Updated reading-companion and search browser suites retain their existing non-reader coverage. These browser tests run in the normal CI workflow.

Local process policy blocks Chromium sockets in the task environment. A local syntax/static/render test pass is not a claim that browser layout, keyboard, screenshots or physical devices were verified. Browser screenshots and interaction results must be reviewed from CI before release.
