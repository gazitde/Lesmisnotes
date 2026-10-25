# Optional listening pointers

This additive editorial feature keeps every existing question intact and offers three optional points alongside it: something concrete to hear or notice, a possible interpretation, and a comparison or check. The points are suggestions, not an answer key or claims about an unheard recording.

## Coverage

`dist/listening-pointers.js` contains 103 Hebrew/English sets, with three points in each (309 bilingual pairs):

| Context | Sets |
| --- | ---: |
| Song-by-song journey | 38 |
| Seven-song spotlight | 7 |
| Musical-form primer | 4 |
| Spoiler-safe opening | 3 |
| Recording chooser | 5 |
| Additional performance comparisons | 4 |
| Gallery group fallbacks | 27 |
| Distinct gallery item questions | 12 |
| Stars comparison lenses | 3 |

The gallery uses the item-specific set when its question overrides the group. Existing vocal-coach guides are unchanged; they already provide their own listening points. Literary discussion questions and quiz answers are outside this change.

## Interaction and boundaries

- Native `<details>` disclosures start closed and retain standard keyboard behavior. Readers can hear the performance before opening the suggestions.
- Existing plot-consent gates surround the new content. Public spotlight, primer and opening points avoid late-story revelations.
- Changing a song, performance or comparison lens produces the corresponding closed disclosure; hints are not saved as a preference.
- Pointers are original text, with no lyrics, new media, external links, requests, tracking or storage. Existing source and rights notices remain intact.
- Prerender and the browser load the same local module. Safe disclosures remain usable without JavaScript.

## Source and verification

Prepared against source commit `46c85cf5017c54611d48907471331aad83c3197d` (PR35), tree `736f54c4eccf1629cadf56a6da718072e1eb5d98`. The relevant research and question data also match main at `060ac68a82006c52d2b710462f09ec18410bb965`. This change does not replace or claim to recover any separate unpublished editorial draft.

`test/listening-pointers.test.cjs` checks exact coverage, bilingual shape, nonduplicated point text, escaping, closed native disclosures, item overrides and both loading paths. `scripts/browser-listening-pointers.cjs` exercises real interactions at desktop, 390 and 320 CSS pixels in both languages as an opt-in test. It is not registered in the default browser runner until it has executed in a usable browser environment.

Local candidate only. Build, test and browser evidence belong to the accompanying verification report; source inclusion of a browser test is not a claim that it has run. No production merge, deployment or publication is implied.
