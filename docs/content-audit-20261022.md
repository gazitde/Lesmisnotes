# LesMisNotes content audit, 22 October 2026

## Scope and honest coverage

Audited production revision: 21815c4796988dc7959d4f30f2db1a1a1641cdca. Direct HTTP retrieval of the live domain confirmed byte-identical `extras.js`, `research.js`, `book-stage-data.js`, and `reading/part-4.json`. All five local reading datasets were independently matched to the GitHub blobs at this revision.

This is a first full narrative-coherence pass with targeted primary-source verification and an independent second review of corrections. It is not a claim that every sentence on the website, every source, or every video has been independently verified.

- Read all 365 English chapter summaries, spanning 70/76/76/76/67 chapters in Parts I–V. Checked narrative order, speaker/actor identity, novel/stage contamination, dates and conspicuous unsupported specificity. Hebrew was sampled, not exhaustively retranslated.
- Read the 38 English book-to-stage scene mappings and their 146 reciprocal chapter links. No additional factual correction established in this pass.
- Read the novel chronology and substantial book-level overview coverage, plus all ten screen-adaptation records and musical opening-history records. Separate deferred Book summaries exist in the five JSON files and are not all covered by this first reading pass.
- Checked all 365 chapter anchors against the actual Project Gutenberg primary-text HTML. All exist, with 365 unique chapter IDs.
- Checked all sourceIds in RESEARCH and EXTRA_CONTENT against the combined source registry: 463 unique sources, no unresolved IDs. This establishes referential integrity, not the truth or current availability of 463 sources.
- Checked every chapter reminder points to an earlier chapter, and every book-stage spoiler boundary matches the highest referenced chapter ordinal.
- Screened paired Hebrew/English numeric strings. Differences examined were number spelling, date formatting, time conventions or a longer source label, not confirmed numerical contradictions.
- Independent second pass checked the two fixes below and sampled Stars/Bring Him Home creation accounts and Hugo biography/archive claims. Those cleared samples are not a substitute for remaining page-by-page research.

## Confirmed corrections

### 1. Fantine timeline: incomplete pinpoint citation

Severity: minor source-precision defect; high confidence. The narrative itself is correct.

Location: `dist/extras.js`, `EXTRA_CONTENT.novel.milestones[id=trial-fantine].references`; novel full recap in Hebrew and English.

Before: court identification I.VII.11 and Javert's arrival I.VIII.3 are cited, but the accompanying claim includes Fantine's death. The death occurs in I.VIII.4.

Correction: retain both existing references and add I.VIII.4, anchor `link2HCH0069`.

Primary evidence: https://www.gutenberg.org/files/135/135-h/135-h.htm#link2HCH0069 . Adjacent chapter III introduces the arrest context, so it should not be removed.

Independent second review: confirmed against the original chapter structure.

### 2. Gavroche's pistol: inherited translation discrepancy

Severity: minor factual/translation precision defect; high confidence. Does not change the plot.

Locations: `dist/reading/part-4.json`, chapter `p4-b11-c1`, and `dist/extras.js`, readingLocator Book `p4-b11` overview, both languages.

Before: the pistol lacks a trigger / הדק. This accurately repeats Isabel F. Hapgood's English rendering, but not the mechanical detail in Hugo's French.

Original: “le pistolet n’avait pas de chien.” Here chien is the hammer/cock of the firearm, not the trigger. Corrected to missing hammer / הפטיש של מנגנון הירי. A reader-facing note explicitly explains the difference from Hapgood rather than suggesting that the English primary-text link says something it does not.

Primary evidence:
- French IV.XI.I: https://fr.wikisource.org/wiki/Les_Mis%C3%A9rables/Tome_4/Livre_11/01
- Hapgood IV.XI.I: https://www.gutenberg.org/cache/epub/135/pg135-images.html#link2HCH0271
- Historical Académie terminology: https://www.dictionnaire-academie.fr/article/A7F1274 (fusil: the flint is held in the chien; percussion version describes a hammer-shaped chien).

Independent second review: French text, terminology and accessible bilingual wording confirmed. Primary translations themselves are not altered.

The factual note links to the original French with an explicit French label. Other chapter notes retain their English-source label; the small renderer addition supports a source-specific label rather than falsely labelling French as English.

## Selected evidence checks that did not require correction

- Musical Paris September 1980, Barbican 8 October 1985 and Broadway 12 March 1987: https://www.mtishows.com/show-history/1293 . The site's milestone dates match. Other dated/global claims on the historical MTI page should not automatically be treated as current.
- Current official reach and venue: over 150 million viewers, 57 countries, 455 cities, 22 languages, Sondheim Theatre. Confirmed at https://london.lesmis.com/about-the-show/ . The site correctly attributes these as production-reported cumulative figures.
- Cavayé adaptation opening in France on 14 October 2026 and Tahar Rahim as Javert: https://www.ugc.fr/news-les-miserables.html . Current source confirms these details; the modern film's own plot choices must not be substituted for Hugo's novel.
- Stage-specific factory dismissal and sequence: https://www.mtishows.com/full-synopsis/1293 . Site distinguishes male foreman on stage from female superintendent in the novel.
- Food-related literary references: Bishop's soup, figs and rye in I.II.III; stuffed carp at Corinthe IV.XII.I; Grantaire smelling Brie IV.XII.II; Gavroche's unaffordable apple turnover IV.XI.I. Checked against actual primary chapters. Modern recipe adaptations are explicitly identified rather than attributed to Hugo.
- Wedding date, 16 February 1833: V.VI.I explicitly gives it. Site follows the novel and does not silently replace its internal calendar with a reconstructed historical one.
- Thénardier's later slave dealing: V.IX.IV explicitly states it. Correctly distinguished from the musical's comic wedding ending.
- V.I.XVI: the bourgeois father himself throws his son's brioche into the basin; the summary's actor was checked and is correct. Do not “correct” this to the son throwing it.
- Independent-review samples: https://michaelcassel.com/how-we-made-les-miserables/ supports Allam's request for Stars, Kretzmer writing its lyrics first, and the jealousy-to-prayer development of Bring Him Home. Museum material supports the six-quills object and checked Hugo manuscript history.

## Remaining coverage

Not yet exhaustively verified: all Hebrew phrasing against French; every one of the 463 source documents; full audiovisual identification and licensed usage for every clip; all performers and all recording-release metadata; complete historical/geographic essays and quiz answer rationales; every original interpretation in philosophy/song analysis; practical opening times and access details. Interpretive statements should continue to be distinguished from documentary claims. A linked primary source and passing automated checks alone do not settle those questions.
