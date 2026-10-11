# Visual and language refresh

- LesMisNotes branding, locally hosted Hebrew type, balanced hero/navigation and prominent language choice.
- English first-visit root; saved consented Hebrew and explicit language links still take priority.
- Both circular compositions use deliberate safe-area line breaks and responsive sizes.
- Verified www canonical destination, approved production indexing and full46-URL sitemap; Vercel previews retain noindex.
- FormSubmit enabled for the approved domain through the existing opaque server-side route, with no new credential setup; actual delivery is verified separately.
- Removed or rewrote195 defensive copy passages in Hebrew and English, retaining sources, useful scene context, food safety and specific experimental guidance.
- Added full bilingual route visual/reflow coverage and screenshot artifacts.

# Migration release

## Included

- Complete bilingual guide and licensed local assets, preserving all 20 viewing cards / 29 versions, five journeys, nine geographic places and five recipe cards.
- Local weighted Hebrew/English search over explicit content fields, aliases and transliterations, with spoiler-aware result partitions, topic filters, keyboard navigation and contextual links.
- Bilingual contact page and a server-only fixed-recipient mail endpoint. Sending is disabled until authorized server configuration is complete. Drafts stay in tab memory; provider errors do not discard the text or claim delivery.
- Portable build, clean repository, pinned test dependencies, local server and Vercel deployment preset.
- Distinct localized metadata, canonical-origin validation, preview noindex protection, public sitemap/hreflang, breadcrumb/page structured data and original social artwork.

## Validation

The final source passes core rendering/content (7,332 assertions), static SEO (2,984 checks), build-mode validation (30), search engine (49), search interaction harness (19), contact/server-client (29; one opt-in native-browser test skipped), and all About, gallery, media, map, places, recipes and source-label regression suites. An independent fresh-copy build/test/export scan also passed.

Browser checks are included in CI for keyboard behavior, Hebrew/English layouts, 390px/320px reflow, deep links, history, spoiler revocation and mocked contact retry states. The initial migration CI passed all 33 browser checks and the separate real-Chromium mocked contact test. The Vercel deployment served the root and localized pages successfully; actual email receipt still requires authorized configuration. The development cloud browser could not reach the local executor server, but hosted search, contact availability, language switching and narrow reflow were checked separately.

No hosting account, mail credential, sender domain, analytics identifier or final public canonical domain was created or activated by the source migration.

## Hero-stamp correction

The circular Paris/1832 stamp now has explicit city/date/caption lines and a larger safe text area at desktop and narrow widths. Full words remain visible without overflow clipping. Added bilingual circle-boundary browser regression coverage at five viewport widths.

The footer wraps its expanded link list at desktop widths. Added whole-page horizontal-fit checks in both languages at 1365, 1180, 960, 680, 390 and 320 pixels. The selected future domain is documented without activating indexing or modifying DNS.
