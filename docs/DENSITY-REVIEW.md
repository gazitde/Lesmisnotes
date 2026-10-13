# Content-led layout tightening — 13 October 2026

The screen-adaptations page exposed a repeated layout problem: a separate save row, section padding, a full-width notice and another large explanatory panel before the useful comparison. The same stacked wrappers appeared on several other templates.

- Save actions now share the breadcrumb/header tools row. The mobile icon retains its accessible label and a 44px target.
- Screen-format explanations use three columns on desktop and compact rows on phones; all nine entries and the four-version comparison remain.
- Chapter completion and opening orientation share a row on desktop. Both remain fully visible on mobile, with explicit completion and storage wording intact.
- Music, dilemmas, history, profiles, About, recipes and places use shorter section intervals and content-height cards. Prose, source citations and media ratios are retained.
- The homepage retains its three interest choices and distinct visual hierarchy.

## Verification

`browser-density.cjs` checks 15 templates in Hebrew and English at 1365, 390 and 320 CSS pixels, including layout, retained content counts, reader structure and keyboard bookmark/preferences behavior. It writes screenshots and metrics to the CI artifact. The existing all-route screenshot and behavior suites continue to run.

Before screenshots were captured from revision `1fe456f12d47b20a3fde1943ffd922ea8f67502d`. Full-page visual comparisons are reviewed before promoting the candidate to main. Device-width browser testing is not a claim of physical-device testing.
