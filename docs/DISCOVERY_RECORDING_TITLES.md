# Character discovery and Hebrew recording titles

## Scope

The existing character directory adds four compact, closed native disclosures: Grantaire, Gillenormand, Fauchelevent, and the Friends of the ABC, explicitly marked as a group. They link to existing introduction chapters, not new profiles. Ten profiles and ten graph characters remain. The discovery module is not called on novel/chapter or reader-profile routes, and its renderer refuses an explicitly supplied reader context. It never changes consent or storage.

The expanded song journey and existing featured-song detail show an additional Hebrew-only title where verified. Existing song IDs, primary titles, routes and search remain unchanged. Each label says “באלבום הקאמרי (1987):”, credits Ehud Manor, and links to the album catalogue record. The metadata retains the recording, language, year, translator, checked date and catalogue field. The Who Am I? mapping applies to the song title, not Cart Crash. No mapping was added for Bring Him Home or the finale.

## Evidence

- Grantaire and the ABC: https://fr.wikisource.org/wiki/Les_Mis%C3%A9rables/Tome_3/Livre_4/01
- Gillenormand: https://fr.wikisource.org/wiki/Les_Mis%C3%A9rables/Tome_3/Livre_2/01
- Fauchelevent: https://fr.wikisource.org/wiki/Les_Mis%C3%A9rables/Tome_1/Livre_5/06
- Cameri 1987 album: https://www.nli.org.il/en/items/NNL_MUSIC_AL997013219803805171/NLI

The album’s “Content Note” supplies the eleven title labels. Its automatically generated player track metadata is inconsistent with the Content Note, so the title set does not infer mappings from that player. The record identifies Ehud Manor as translator. Labels describe this recording only.

Gillenormand’s new introduction is bounded to III.II.1: age, temper and earlier manners. It makes no family-outcome claim. The ABC wording uses the singular collective l’abaissé and gives Hugo’s nine principal names; it does not make Marius a member.

## Minimal correction in the existing chapter

In p1-b5-c6.summary.he, “נלכד מתחת לעגלתו שהתהפכה” becomes “נלכד מתחת לעגלתו”.
In p1-b5-c6.summary.en, “trapped beneath his overturned cart” becomes “trapped beneath his cart”.

The French opening says Fauchelevent fell under his cart after its horse fell. It does not say the cart overturned. Only the two unsupported words were removed; the rest of both summaries, and every other chapter, is unchanged.

## Existing essay coverage

The Book overviews already cover Waterloo, the convent, the Paris street-child essay, criminal society and the sewers. No new essay pages or reader-mode changes were needed. Waterloo remains in the default narrative route. The 333 default / 365 opt-in routes remain guarded by the existing optional-essay tests.

## Checks

- Focused deterministic integration coverage is in test/discovery-recording-titles.test.cjs.
- A browser regression is prepared in scripts/browser-discovery-recording-titles.cjs and included in the aggregate browser suite. It covers Hebrew/English, 1365/390/320 CSS widths, keyboard disclosures, exact chapter navigation, history, reader boundaries, all eleven aliases, unsupported mappings and language switching.
- Local browser execution was blocked before any page was tested: Chromium could not create its local singleton socket (“Operation not permitted”). No browser or visual pass is claimed. Use the existing authorized preview/browser workflow before publication.
