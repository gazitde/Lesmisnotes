# Song-by-song watch path

The existing 38-stop musical journey offers two modes after its existing story-spoiler choice:

- **Our picks:** six stop positions use the guide’s existing publisher/professional recordings. The localized union is nine videos, including three Hebrew Habima alternatives. The other 32 positions use original school-production clips, embedded in the same viewing area.
- **Same production:** original uploads from The King’s Academy’s 2017 production in West Palm Beach. They use the same privacy-enhanced inline player as the other recordings, with an original YouTube link below.

The 36 school source records include a curtain call, which is not displayed in the main sequence. Several stops share a source; the ending has separate Epilogue and Finale links. Every stop has a title-level source association. This does not establish complete coverage of every scene or connecting passage. Eight subsection-sensitive positions carry a specific related-larger-clip label. No unverified timestamps, continuous-show claim, edited compilation, downloaded recording or reupload is introduced.

## Evidence and source selection

Production year/location are supported by the school’s Summer 2017 Chronicle and 2016–2017 annual report, linked in the source catalogue. Individual source links use original playlist video IDs. Professional selections reuse the existing curated source/credit records. Two other professional uploads were not selected because their isolated song segments were not verified.

The choice is editorial, based on source identity, scene fit and known recording context. It is not a claim that every clip has undergone end-to-end playback testing or a ranking based on unreviewed sound quality.

## State and accessibility

Mode, exact song and act travel in the shareable URL. Browser history and language changes restore them. The existing optional functional preference permits the last-reading record to retain the mode; no additional storage key is used. Without that choice, mode remains URL/in-memory state. Withdrawal removes the saved reading record.

Mode buttons are native controls with `aria-pressed`; scoped updates retain keyboard focus and open reading disclosures. Disconnected players use the existing teardown/race protection. No autoplay. The interval retains its own stop and does not acquire a video.

## Verification

`test/watch-path.test.cjs` checks all 152 localized mode/stop renderings, source IDs, inline school and professional delivery, per-clip disabled-embed fallback, ending order and escaping. `scripts/browser-watch-path.cjs` is part of the full CI browser suite: HE/EN at 1365, 390 and 320 pixels, all stops/modes, exact links, focus, history, language, no-JS gates, teardown and consent-bound resume. Third-party requests are blocked in those browser tests; actual external playback is a separate limitation.

## Consistent station transitions

A compact sticky navigation bar shows the canonical song number out of 38 (the interval is separately named). Discrete Next, Previous and outline jumps focus and instantly align the new heading below the bar. Range and select changes preserve control focus for repeated keyboard operation. All enabled recordings occupy the same 16:9 viewing region. Adjacent stops using the same video keep its existing iframe connected, preserving playback position. A changed clip or mode uses normal teardown. Shared-source notes identify longer recordings without inventing scene timestamps.

The browser suite reproduces opening stops 1–4 in both modes, HE/EN at 1365/390/320 pixels, captures the first three, and asserts viewport landing, numbered state, bottom navigation and repeated range-key interaction.

Screenshot follow-up: station changes no longer show a redundant overlay toast. The complete station header aligns below the navigation bar, and detailed shared/larger-source notes follow the viewing frame. Shared-source notes identify the common recording below the frame.

## School embed eligibility, 13 October 2026

The earlier blanket link-only decision was editorial, not a demonstrated YouTube restriction. A new check of all 36 originals returned HTTP 200 oEmbed HTML, watch status `OK`, and `playableInEmbed: true`; all identify the school’s original channel. Public metadata lists both Israel and the US as available countries. The two matching gallery entries now also use inline players.

[YouTube’s embedding guide](https://support.google.com/youtube/answer/171780?hl=en) supports privacy-enhanced players and uploader-controlled embed restrictions. This site uses those ordinary players; it neither downloads nor republishes the recordings. Metadata is a point-in-time eligibility check, not proof of actual playback or an independent audit of underlying music rights. The existing API error message and direct YouTube link remain available for regional, owner or network restrictions. A record can still be set to `source-link` individually.

The browser suite checks all 38 stops in both languages and modes, exact source URLs, no autoplay, shared-iframe identity, disconnection on changed clips, keyboard/history and mobile layout. External requests are mocked in CI; that establishes application behavior, not YouTube playback.

## Collapsed alternative performances, 15 October 2026

Stops with another curated recording now have a native bilingual “Watch more performances” disclosure below the unchanged main player. Alternatives combine explicit song mappings with the other existing language/mode selections, exclude the current primary IDs and remove duplicates. The interval and stops without a supported alternative have no empty control.

Opening the disclosure displays text credits and original-source links only. A separate “Watch here” choice creates one secondary privacy-enhanced iframe without autoplay. Choosing another recording, closing the player/disclosure, changing stops/modes, hiding spoilers or leaving the page removes that secondary player. The primary stays connected when opening, closing or switching alternatives. Native summary/button semantics, keyboard controls, visible focus, logical CSS and narrow layouts support Hebrew RTL and English.

New source evidence is in `alternative-performance-sources.json`. Titles, credited performers, production years, publishers and embed eligibility were checked against original YouTube metadata. Upload years are kept separate from performance years. One concert excerpt serves In My Life and A Heart Full of Love and is identified as a shared clip. Official audio-only tracks were considered but excluded from this watch-specific feature. Metadata eligibility does not prove advancing playback or regional availability; direct source links remain available.

`test/watch-alternatives.test.cjs` checks all 152 language/mode/stop combinations for primary exclusion, uniqueness, bilingual labels, initial collapse and zero eager alternative players. `scripts/browser-watch-alternatives.cjs` covers keyboard opening, choosing and switching players, repeated clicks, collapse teardown, primary preservation, stop/mode changes, spoiler withdrawal and 1365/390/320-pixel reflow. It runs with the existing complete browser suite; external services are blocked in these app-behavior tests.

The initial expansion adds 26 filmed performances to the journey’s data; 19 of the 38 stops have supported alternatives in either mode. All 45 original clip records and all primary selections remain unchanged. The full journey catalogue now includes seven Hebrew records (official Habima or performer uploads) and three French broadcaster performances, alongside English recordings. Every primary and alternative labels its audio language; changing the interface language does not translate the recording. Matching-language alternatives appear first. Television promotions, benefit sketches, artist music videos and piano-accompanied broadcaster concerts are identified accurately; upload dates are not substituted for unknown performance dates.

Pending YouTube API objects are registered before readiness so closing an initializing secondary player tears it down immediately. Six focused lifecycle tests cover pending/ready destruction, primary preservation, stale callbacks and API-await cancellation.
