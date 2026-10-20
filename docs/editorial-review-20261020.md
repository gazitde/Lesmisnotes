# Editorial readability review · 20 October 2026

Baseline: production commit `e5133709e1ab169d6e9340f1d6717dd761a281af`.

## What needed attention

A bilingual length inventory covered 7,148 paired HE/EN fields across the content bundles and chapter data. This is a structural inventory, not a claim that every field needed rewriting. Existing chapter companions, optional literary essays, source drawers and the new visual journeys already provided useful hierarchy.

The targeted weaknesses were repeated introductory/navigation explanations and eight musical-scene detail blocks presented as single paragraphs. The stronger literary passages, cultural connections, production credits and source caveats were retained rather than shortened to meet an arbitrary quota.

## Changes

- Nine paired content edits: history and Hugo openings, two Hugo passages, before/after introductions, musical beginnings, song-selection introduction and the four-story collection opening.
- Five paired interface-copy edits: gallery opening and instruction, historical timeline key, and the two novel-recap orientation explanations.
- Eight scene-detail blocks gain pauses at narrative turns. Every word remains unchanged in both languages. Longest paragraph: English 144 → 66 words; Hebrew 110 → 51 words.
- The 1,858 source URL strings in the two edited data bundles remain identical and in the same order.
- No changes to artwork, styles, routes, links, scene order, reading progress, spoiler consent, permissions, media loading or storage.

The complete reviewed before/after values are in `editorial-changes-20261020.json`. Word-preserving paragraph changes are labelled separately there.

## Verification

The new editorial tests verify bilingual compact introductions, exact preservation of scene words, paired paragraph boundaries and explicit spoiler/source metadata. Historical snapshot tests normalize only declared editorial paths after asserting their exact reviewed new values; previous hashes continue to protect all unrelated data.

A browser regression in the normal CI suite captures history, Hugo, gallery and plot pages in both languages at 1365, 390 and 320 pixels. It checks horizontal overflow, keyboard opening/closing of a scene disclosure and absence of scene outcomes before consent. CI results must be checked on the exact final commit before publication.
