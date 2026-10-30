# Search and reader entry points

Fresh local reconstruction, 28 October 2026, based on production commit
`8f4463ae9be20ad35aebdcce883f141fd1c55f06`. This is not a recovery of the
unavailable 27 October working draft, and it is not published.

## Scope

- Name Les Misérables in the before-show, reading-companion and comparison H1s.
- Explain that each selected chapter summary includes that chapter's events.
- Add two contextual, same-language, canonical links to each of four existing
  entry pages: `before`, `novel-journey`, `compare` and `screen`.
- Answer the 2012 film versus stage question in visible Hebrew and English
  prose, without character outcomes. Distinguish a film adaptation from a
  filmed concert, explain on-set singing and identify *Suddenly* as a new
  song for the film. This does not add it to the 38-scene stage journey.
- Align the screen page title and description with that visible content.

No new route, external service, campaign parameter, analytics field, storage,
automatic player, schema type or spoiler permission is introduced. Chapter
views do not receive the generic next-step panel. The complete 365-chapter
collection and the default optional-essay behavior remain unchanged.

## Evidence

The production sources already used for the 2012 film and 2010 concert are
linked alongside [Universal Music's production article](https://www.universal-music.de/les-miserables/news/kinohit-les-miserables-glaenzt-mit-gesang-von-russell-crowe-co-211702),
checked on 28 October 2026. It supports on-set singing and *Suddenly* being
written for the film. The camera/breathing question is explicitly an editorial
listening prompt, not a factual performance ranking. External sources carry a
plot-detail warning.

## Verification contract

`test/acquisition-entry.test.cjs` checks all eight static localized entries,
clean links, source visibility, consent concealment, side-effect-free helpers,
38 scenes, 365 unique chapters and the historical snapshot allowlist.

The historical adapter asserts the exact new bilingual before-show title
before restoring only its two scalar values for older snapshots. Existing
fingerprints stay unchanged; altered titles fail, and unrelated changes remain
visible to those fingerprints.

`scripts/browser-acquisition-entry.cjs` is wired into the existing browser
runner. It covers HE/EN at 320, 390 and 1365 CSS pixels, keyboard links,
Back navigation, spoiler consent and withdrawal, no-JS content and no automatic
media. External requests are blocked and contact sending is disabled.

The pinned Playwright 1.64 Chromium v1248 download failed during reconstruction.
No browser pass or visual approval is claimed for this candidate. Local static
checks are not a replacement for the full pinned-browser release gate.

No Search Console measurements, indexing requests or public promotion were
performed. Better entry content does not establish more visits or rankings.
