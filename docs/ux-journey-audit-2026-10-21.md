# Journey entrance and shared-layout audit

Base: `61f7e8352eb4b316317c60ef8f84eeb182c70324`.

## Confirmed defect and correction

The dedicated musical journey inherited a 790px maximum width from `.gate`, while its unlayered `.show-gate` rule reset automatic margins to zero. This left the card against the right edge in Hebrew and the left edge in English. The journey panel now explicitly fills its section and uses a responsive two-column layout, stacked below 760px. Changes are scoped to this page rather than altering every spoiler gate.

## Value-first entrance

Both journey invitations now describe their existing value rather than emphasizing counts. The closed musical journey offers a short, spoiler-safe book/stage comparison before the explicit full-plot consent choice. Optional opening viewing follows the in-site action. It opens inline only after expanding its disclosure, uses the existing no-autoplay player, and removes the iframe when closed. An external link remains available. Pace/structure guidance remains available in a separate disclosure. No scene reading or ending is exposed before consent.

## Audit evidence and limits

- Live cloud-browser geometry sweep: 30 core routes in each language at desktop and narrow widths (60 localized routes at each width). No persistent document overflow found. A transient history-page measurement before CSS loaded was rechecked after load and did not reproduce.
- Actual visual inspection included the reported Hebrew journey, English journey, Hebrew novel journey, Hebrew relationship map, English history, recipe and viewing-choice templates. The audit is not a claim that every pixel or every interactive state on every page was inspected.
- Independent shared-template source review covered journey, profile, search, places, recipe, contact, chapter-completion, viewing and book/stage layouts. No additional source-proven global alignment defect justified speculative CSS changes.
- Added a regression for explicit panel width and bilingual value/consent/media order, plus disclosure lifecycle and video-registry compatibility.
- Extended the browser journey script to check the closed panel's edge alignment and optional iframe mount/removal before entering the existing journey navigation checks.
- Local browser automation is not claimed: Chromium is absent in this workspace, and the cloud browser cannot reach its localhost server. Rendered changed-page checks require the deployed preview and separately authorized access.

Existing approved narrative text, spoiler consent, swipe/navigation behavior, source credits and media rights are preserved. No hosting protections, analytics or social accounts were changed.
