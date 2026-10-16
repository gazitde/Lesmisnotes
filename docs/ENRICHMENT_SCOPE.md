# Combined enrichment scope and preservation checks

This candidate is based on `4a2f11bc4f81ea0b126a5cf26a64e2d217b2ee6a`, including the supplied uncommitted Drouet, Daubray and Stars archive additions. Existing profile work is retained. The implementation is local; no remote branch, deployment or external communication was made.

## Deliberate content changes

- `EXTRA_CONTENT.hugoStageObject`: add `image.thumbnail` and `works` for two further museum drawings. The original castle drawing, existing copy and destination are unchanged.
- `EXTRA_CONTENT.musical.creationStory.craft[id=hugo-art-onstage]`: clarify the general 2009–10 projection connection in the first sentence of `body.en/he`; append `hugo-59-projections` to `sourceIds`. This does not claim the exact displayed drawings were projected.
- `EXTRA_CONTENT.gallery.items`: append `9IP6aDolzAo` and `cJha5xHplr0`. `gallery.groups`: insert `dreamed-dream-habima`; change only `master-house.clipIds`, `.hook` and `.format`. The English clip remains first.
- `EXTRA_CONTENT.screenFamilyMap`: add `screen-2026: novel`.
- `EXTRA_CONTENT.musical.recordingTitleAliases`: add the eleven verified Cameri-1987 Hebrew album titles. Primary titles, song IDs and the 38-song inventory are unchanged.
- `EXTRA_CONTENT.extraSources`: append the ten source IDs below. Append them to the appropriate existing source groups. The source with ID `archive-stars-recollections` in `extraSources` and `musical.sources` has its existing English label converted to an explicit English/Hebrew label object; URL, date, claims and story prose are unchanged.
- `RESEARCH.adaptations`: append `screen-2026`; add only `screen-2012.filmOnlyNote` for *Suddenly*. All other research data is unchanged.
- `config/character-profiles.json.discovery`: add three introduction cards and one clearly labelled group. The ten existing profiles and graph characters are unchanged. Generated `dist/character-profiles-data.js` remains a build output, not a hand-edited source.
- `dist/reading/part-1.json`, chapter `p1-b5-c6.summary.en/he`: remove only “overturned” and “שהתהפכה”. Every other chapter field and all other chapter files are unchanged.

New source IDs: `hugo-ma-destinee-object`, `hugo-eddystone-object`, `hugo-59-projections`, `gallery-hebrew-9IP6aDolzAo`, `gallery-hebrew-cJha5xHplr0`, `screen-2026-ugc`, `screen-2026-cast`, `screen-2026-cnc`, `screen-suddenly-universal`, `screen-suddenly-oscar`.

## Preservation fixture

The original archive test's pre-story SHA-256 remains `728b1a5e2c53af8e11a6156a8228fa8093309d2ac48ccdf7c6fc3249768ca3d1`. It was not refreshed to absorb the enrichment.

`test/helpers/enrichment-baseline.cjs` reverses only the declared extras paths above before that original archive test runs. It removes the exact new source/clip/group IDs; restores only the two original art-context body strings and the three modified Master of the House fields from `test/fixtures/enrichment-baseline.json`; deletes the new fields; and restores the Stars label's original English string. The archive test then performs its original reversal of the three story additions and checks its unchanged baseline hash.

A separate full-object fingerprint compares the normalized extras with the complete supplied draft, including its three stories. The narrower original art test also remains. Feature tests independently check the new artwork, source labels, grouping, dates, film-only song, recording titles and discovery items. The existing Hugo question-mark/exclamation-mark anecdote is covered by unchanged-data fingerprints and is untouched.

## Runtime and presentation changes

Existing Hugo art gains in-place native thumbnail selection; screen cards gain an optional film-only note and link to an existing official trailer; existing gallery counts are updated; the character directory calls a bounded discovery renderer; and Hebrew expanded song views add secondary recording-specific titles. Styling is scoped to those components. No new route or navigation item is introduced.

Default English, 333-chapter reading mode, explicit 365-chapter opt-in, source links, consent gates, spoiler settings and lazy gallery player lifecycle remain under the existing automated suites. Browser regression scripts have been prepared and registered, but actual browser-layout and audiovisual playback verification could not be performed in the available environment.

See `ART_GALLERY_SCREEN_REVIEW.md`, `DISCOVERY_RECORDING_TITLES.md`, `hugo-art-gallery-licenses.json`, and `RIGHTS.md` for evidence, rights and verification boundaries.
