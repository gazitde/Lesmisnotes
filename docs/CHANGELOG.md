# Migration release

## Included

- Complete bilingual guide and licensed local assets, preserving all 20 viewing cards / 29 versions, five journeys, nine geographic places and five recipe cards.
- Local weighted Hebrew/English search over explicit content fields, aliases and transliterations, with spoiler-aware result partitions, topic filters, keyboard navigation and contextual links.
- Bilingual contact page and a server-only fixed-recipient mail endpoint. Sending is disabled until authorized server configuration is complete. Drafts stay in tab memory; provider errors do not discard the text or claim delivery.
- Portable build, clean repository, pinned test dependencies, local server and Vercel deployment preset.
- Distinct localized metadata, canonical-origin validation, preview noindex protection, public sitemap/hreflang, breadcrumb/page structured data and original social artwork.

## Validation

The final source passes core rendering/content (7,332 assertions), static SEO (2,984 checks), build-mode validation (30), search engine (49), search interaction harness (19), contact/server-client (29; one opt-in native-browser test skipped), and all About, gallery, media, map, places, recipes and source-label regression suites. An independent fresh-copy build/test/export scan also passed.

Browser checks are included in CI for keyboard behavior, Hebrew/English layouts, 390px/320px reflow, deep links, history, spoiler revocation and mocked contact retry states. Their actual CI result, actual host deployment and real email receipt must be verified separately. The development cloud browser could not reach the local executor server; no local browser pass is claimed.

No hosting account, mail credential, sender domain, analytics identifier or final public canonical domain was created or activated by the source migration.
