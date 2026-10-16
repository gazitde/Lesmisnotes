# Art, Hebrew performances and screen enrichment

Prepared 16 October 2026 as a local candidate, based on `4a2f11bc4f81ea0b126a5cf26a64e2d217b2ee6a` with the previously prepared Drouet, Daubray and Stars additions retained. No publication or external communication was performed.

## Hugo's drawings

The existing art section now offers three native thumbnail buttons and one full-frame drawing at a time. Selection changes the picture, short caption, observation paragraph and exact museum source in place. It does not add a route, navigation item, history entry, automatic slideshow or third-party image request. The original castle drawing and its paragraph remain intact. The selected drawing survives an interface-language change.

- Original retained work: *Le burg à l'ange*, c. 1863, with its existing image and IIIF licence record.
- Added: *Ma destinée*, 1857, inventory 927. [Paris Musées record](https://www.parismuseescollections.paris.fr/en/node/210051). The image is Hugo's original drawing, not the later Méaulle engraving.
- Added: *Le phare d'Eddystone*, 1866, inventory 181. [Paris Musées record](https://parismuseescollections.paris.fr/fr/maison-de-victor-hugo/oeuvres/le-phare-d-eddystone).

Both added full-frame JPEGs are museum-provided renditions, copied without alteration. The three thumbnails are proportional reductions. Original image pixels were inspected visually. Exact downloads, dimensions, CC0 1.0 links, credits, thumbnail transformations and checksums are in `hugo-art-gallery-licenses.json`; the original castle licence remains in `hugo-art-license.json`.

[59 Studio's production record](https://59.studio/project/les-miserables/) supports the general connection between Hugo's artwork and the 2009–10 tour's projections. The text credits Matt Kinley and 59. It does not identify these three specific drawings as images projected in that production.

## Hebrew gallery selections

The gallery contains 38 groups and 54 clips, including six Hebrew clips. These two additions reuse identities and evidence already recorded in `alternative-performance-sources.json` and `watch-path-data.js`:

- [Miki Kam and Avi Kushnir, Master of the House](https://www.youtube.com/watch?v=9IP6aDolzAo), Habima, 2017. Added to the existing `master-house` group alongside the unchanged English King’s Academy performance. The group format describes both productions.
- [Miri Mesika, I Dreamed a Dream](https://www.youtube.com/watch?v=cJha5xHplr0), Habima, 2016; artist-page publication in 2023. Its compact `onstage` group is separate from Susan Boyle's audition.

Both entries preserve the established original-publisher credit, language metadata, lazy player lifecycle and early-story spoiler treatment. Publisher/embedding metadata was previously checked; actual audiovisual playback has not been established. No new Cameri or Dudu Fisher recording is claimed.

## Screen additions

- The new `screen-2026` card is a novel-based French film, using the existing STUDIOCANAL trailer `PyBTjrK43Hg`. The French opening date, 14 October 2026, is supported by [UGC's current release article and director interview](https://www.ugc.fr/news-les-miserables.html) and [CNC visa 167231](https://www.cnc.fr/professionnels/visas-et-classification?visa=167231). Vincent Lindon as Valjean and Tahar Rahim as Javert are identified by [STUDIOCANAL's production announcement](https://letterboxd.com/studiocanal/story/les-miserables-now-in-production/). That older announcement is used for casting, not its superseded release date. The comparison with *The Fugitive* is attributed to Cavayé's UGC interview. No runtime or viewing review is supplied.
- A compact *Suddenly* note sits within the existing 2012 film card. [Universal Music](https://www.universal-music.de/les-miserables/news/kinohit-les-miserables-glaenzt-mit-gesang-von-russell-crowe-co-211702) supports its composition for the film and Hugh Jackman's performance. The [2013 Academy Awards record](https://www.oscars.org/oscars/ceremonies/2013) supplies music by Claude-Michel Schönberg, lyrics by Herbert Kretzmer and Alain Boublil, and the Original Song nomination. No win is claimed. It has no invented Hebrew song title, copied lyric, stage-song number or addition to the 38 stage entries.

The screen collection now contains ten adaptations. Existing classifications, filters, trailer links and spoiler rules remain in use.

## Verification

`test/art-gallery-enrichment.test.cjs` checks exact data preservation outside the intended changes, source identities, image checksums, original castle preservation, gallery grouping, dates, classification and the unchanged stage-song inventory. It also checks a pre-existing issue fixed in the pending Stars source: its label is now explicitly English/Hebrew, while the evidence and prose are unchanged.

`test/art-gallery-render.test.cjs` exercises the actual application in a deterministic VM in both languages: image switching, repeated/invalid choices, ARIA selection state, language retention, navigation stability, screen cards and no eager screen video. These are source/render checks, not actual browser-layout results.

`scripts/browser-art-gallery-enrichment.cjs` adds actual-browser coverage for English/Hebrew at 1365, 390 and 320 CSS pixels, keyboard selection, image aspect ratios, gallery close/history, filters and screen classification. It is registered in the normal browser suite. It could not run in this environment: the local Chromium launch failed before opening the app, and the cloud browser could not reach the executor's local preview. UI layout, physical devices and video playback therefore remain unverified for this candidate.
