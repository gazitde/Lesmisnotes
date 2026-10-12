# Song-by-song watch path

The existing 38-stop musical journey offers two modes after its existing story-spoiler choice:

- **Our picks:** six stop positions use the guide’s existing publisher/professional recordings. The localized union is nine videos, including three Hebrew Habima alternatives. The other 32 positions use original school-production links.
- **Same production:** original links from The King’s Academy’s 2017 production in West Palm Beach. These open on YouTube and are never passed to the embedded-player callback.

The 36 school source records include a curtain call, which is not displayed in the main sequence. Several stops share a source; the ending has separate Epilogue and Finale links. Every stop has a title-level source association. This does not establish complete coverage of every scene or connecting passage. Eight subsection-sensitive positions carry a specific related-larger-clip label. No unverified timestamps, continuous-show claim, edited compilation, downloaded recording or reupload is introduced.

## Evidence and source selection

Production year/location are supported by the school’s Summer 2017 Chronicle and 2016–2017 annual report, linked in the source catalogue. Individual source links use original playlist video IDs. Professional selections reuse the existing curated source/credit records. Two other professional uploads were not selected because their isolated song segments were not verified.

The choice is editorial, based on source identity, scene fit and known recording context. It is not a claim that every clip has undergone end-to-end playback testing or a ranking based on unreviewed sound quality.

## State and accessibility

Mode, exact song and act travel in the shareable URL. Browser history and language changes restore them. The existing optional functional preference permits the last-reading record to retain the mode; no additional storage key is used. Without that choice, mode remains URL/in-memory state. Withdrawal removes the saved reading record.

Mode buttons are native controls with `aria-pressed`; scoped updates retain keyboard focus and open reading disclosures. Disconnected players use the existing teardown/race protection. No autoplay. The interval retains its own stop and does not acquire a video.

## Verification

`test/watch-path.test.cjs` checks all 152 localized mode/stop renderings, source IDs, source-link-only school delivery, ending order and escaping. `scripts/browser-watch-path.cjs` is part of the full CI browser suite: HE/EN at 1365, 390 and 320 pixels, all stops/modes, exact links, focus, history, language, no-JS gates, teardown and consent-bound resume. Third-party requests are blocked in those browser tests; actual external playback is a separate limitation.

## Consistent station transitions

A compact sticky navigation bar shows the canonical song number out of 38 (the interval is separately named). Discrete Next, Previous and outline jumps focus and instantly align the new heading below the bar. Range and select changes preserve control focus for repeated keyboard operation. Both embedded performances and external school sources occupy the same viewing region; external cards explicitly say they open YouTube in a new tab. Shared-source notes identify longer recordings without inventing scene timestamps or restarting a player.

The browser suite reproduces opening stops 1–4 in both modes, HE/EN at 1365/390/320 pixels, captures the first three, and asserts viewport landing, numbered state, bottom navigation and repeated range-key interaction.
