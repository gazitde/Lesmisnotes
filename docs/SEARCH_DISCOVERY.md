# Search discovery and precise destinations

This pass extends the existing browser-only bilingual search. It does not add a service, query URL, query storage, tracking event field, or third-party request.

## Matching and useful evidence

- Existing Hebrew niqqud, apostrophe, dash, French accent and case normalization is preserved. French ligatures are folded as well; original display offsets remain intact for highlights.
- Whole words and exact curated alias phrases rank above incidental substring matches. A bare reviewed song name leads to its guide before individual performances. Numeric edges apply to phrases too, so a day such as `18` cannot receive an exact-phrase boost from `1815`.
- Every query term still needs an actual match in the permitted index. There is no unrestricted fuzzy rewriting or invented result.
- Snippets prefer a short passage containing more query terms. When the matching evidence is only in the other language, that safe original passage is visibly labelled and marked with its language; navigation keeps the visitor's selected site language.
- An alias-only match explains the alternate spelling. Result destination labels distinguish the guide page or collection from a performance or individual event.

## Navigation and recovery

The five existing special-event records now have their own source-derived results and validated focus targets. Their production dates, performers and context come from the existing reviewed records. Current event aliases cover the tenth/twenty-fifth anniversary concerts, Staged Concert, fortieth gala and album. No new event facts were added.

Search navigation now validates against the actual metadata route catalogue, rather than rejecting the hyphenated `special-events` route. Event links retain their precise destination on language changes. Unknown destinations, unexpected query parameters and external URLs are rejected.

Empty search offers six main destinations. A filtered search with matches elsewhere offers an explicit all-topics action without silently discarding the chosen filter. True empty results retain a sitemap link. The existing retry, keyboard focus, native dialog, IME, reduced-motion, load-more and spoiler-revocation behavior remains.

## Spoiler and privacy boundaries

Protected source fields are not indexed and cannot influence totals, ranking or previews. Novel and after-show consent remain separate from the general spoiler setting. Full chapter summaries are never searched; the existing exact 365-chapter coordinate path remains metadata-only. Character aliases and safe song titles are still reviewed allowlists. The source bibliography finder is unchanged.

## Checks

- `npm test`: aggregate content, static output, unit and simulated-DOM checks, including `validate-search-edges.mjs`, `validate-search-events.mjs` and `test/search-discovery.test.cjs`.
- `npm run check:export`: repository export/privacy guard.
- `scripts/browser-search-discovery.cjs`: added actual-browser regressions for English/Hebrew at 320/1365 CSS pixels, precise event navigation, focus, language/history, topic recovery, missing-index retry, injection, spoiler safety and query privacy.
- `scripts/browser-sharing-metadata.cjs`: actual-browser metadata/asset checks. Both are registered in `npm run test:browser`.

The initial cloud session could not execute Chromium because of local process restrictions, and its separate browser could not reach the local preview server. Thus the new browser scripts are prepared, not proof of a passed browser run. Full browser, physical-device, screen-reader, hosted-preview and platform-specific sharing checks must be reported separately. No production publication or third-party preview submission is implied by these changes.
