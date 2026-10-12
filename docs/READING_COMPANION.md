# Chapter companion

The reader at `/en/novel/` and `/he/novel/` follows Hugo’s five Parts, 48 Books and 365 chapters. Numbering follows the complete novel, independent of an edition’s page count or physical volumes. Every source link targets the exact chapter in Isabel F. Hapgood’s public-domain English translation, hosted by Project Gutenberg.

## Reading boundaries

- A neutral Part → Book → chapter selector opens a before-reading cue and, where useful, a reminder of earlier events.
- Chapter summaries require an explicit click and close when the selected chapter changes. Reload retains the selected location, with its summary closed.
- Whole-Book summaries have a separate, clearly labelled reveal because they include later chapters within that Book.
- Reminder references must precede the current chapter. Character lookup is conservatively bounded by the start of the selected Book.
- Wider-story links appear only after the existing spoiler choice. Two early geographic links use a single-place view with no later novel essay, future source references or full-story atlas.
- Global search does not index chapter summary prose. The no-JavaScript version provides all 365 exact primary-text links without revealing outcomes.

## Data and navigation

`dist/reading/part-1.json` through `part-5.json` contain the bilingual notes. Only the selected Part is fetched, on the reading route; it is reused in memory for that visit. Failed loads provide a retry and keep the selected chapter. A late response cannot replace a newer selection.

Exact position URLs use `?focus=chapter:p2-b3-c5`. Language changes retain the position. Resume uses the existing optional functional-preference consent; no reading position is persisted without it.

## Editorial and regression checks

The prose was checked in both languages against primary chapter boundaries, with targeted primary-text checks for facts, delayed identities and reminders. Independent review identified and corrected several early identity/reveal cues. These checks support the stated boundaries; they are not a claim that every possible interpretive or translation issue has been eliminated.

`validate-chapter-reader.mjs` validates every record, count, reminder order, source link, public field and default search/prerender boundary. `scripts/browser-chapter-companion.cjs` exercises every chapter in both languages, plus narrow layouts, explicit reveals, cross-Part navigation, loading errors/races, opt-in resume and scoped maps. Both run in the normal CI workflow.
