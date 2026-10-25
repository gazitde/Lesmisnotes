# Search appearance audit

Audit date: 24 October 2026. Scope: 38 canonical page subjects in Hebrew and English (76 localized URLs), four legacy alias URLs, the root home page and query-sensitive reading shells.

## What is implemented

- Every canonical localized page retains its existing unique, descriptive title and description. These already distinguish the novel, reading companion, musical journey, characters, history and other destinations without revealing protected outcomes. This pass does not mass-rewrite good metadata.
- The root home page contains the `WebSite` name `LesMisNotes`, an alternate name and the canonical origin. Consistent branding, crawlable square favicon variants and a 96-pixel PNG support site identification.
- Every non-home canonical page has a visible semantic breadcrumb and corresponding `BreadcrumbList`. Schema now uses the same short navigation or character label as the visible trail, rather than repeating the full SEO title. Journey parents and the distinct Hebrew character-directory parent wording are preserved. The page node links to its breadcrumb node by ID.
- Ordinary pages use `WebPage`; actual collections use `CollectionPage`, with `AboutPage` and `ContactPage` where appropriate. No invented reviews, ratings, FAQ answers, event availability or video metadata are added.
- Canonicals, reciprocal Hebrew/English/x-default alternates, robots directives and the canonical-only sitemap remain aligned. Legacy URLs point to their real destination. Reader-specific and preview views remain noindex, and chapter-bounded character metadata stays anonymous where required.

## Evidence and verification

`node validate-seo.mjs` verifies all 80 localized routes, unique metadata, canonical and alternate URLs, indexing separation, schema presence, local assets and sitemap reachability. Before this consistency fix it passed 7,746 checks; the remaining gap was the full-title-versus-visible-label mismatch in all 74 non-home canonical localized breadcrumbs.

`node --test test/serp-structure.test.cjs` compares every canonical page's actual rendered breadcrumb text, order and links with its JSON-LD, checks the page-to-breadcrumb relationship, exercises the runtime shared label source and isolated fallback, and preserves chapter-bounded profile trails. The test emits route, metadata and breadcrumb-entry counts. Existing sharing checks cover actual icon/image dimensions, complete social metadata, preview builds and anonymous reader image behavior.

This is implementation verification, not proof of Google's current indexed output. After an authorized deployment, use Search Console URL Inspection and the appropriate rich-result/schema validators on the live URLs. Site-name markup is not supported by Google's Rich Results Test; validate its syntax separately and inspect the root URL. No Search Console submission, deployment or third-party inspection upload is implied by these local tests.

## Boundaries and potential follow-up

Google chooses title links, snippets, sitelinks and rich-result appearances automatically. Correct markup does not guarantee a specific layout, inclusion or ranking; there is no fixed title or description character limit that guarantees an untruncated display. Breadcrumb presentation is currently documented for desktop results.

Repeated consent-interface text is present in the HTML, but this audit has no evidence that Google currently chooses it as a snippet. If preventing that is desired, `data-nosnippet` can be applied narrowly to the existing privacy-banner `section`; do not exclude meaningful page content or spoiler-safe introductions. Google supports this attribute on `div`, `span` and `section`, not directly on `dialog`. No snippet-length restriction is needed.

Do not attach unsupported rich-result types merely to make results look richer. Recipe markup needs an actual completed-dish image; the existing collection should not use a generic book cover as a substitute. Video features generally require a dedicated watch page where one video is the main content, not the current multi-video collections. Any such expansion needs its own content and eligibility review.

## Primary guidance checked

- [Title links](https://developers.google.com/search/docs/appearance/title-link) and [snippets](https://developers.google.com/search/docs/appearance/snippet)
- [Site names](https://developers.google.com/search/docs/appearance/site-names) and [favicons](https://developers.google.com/search/docs/appearance/favicon-in-search)
- [Breadcrumbs](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb) and [structured-data quality](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [Localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions), [canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) and [sitelinks](https://developers.google.com/search/docs/appearance/sitelinks)
- [Snippet controls](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag#data-nosnippet-attr), [recipe eligibility](https://developers.google.com/search/docs/appearance/structured-data/recipe) and [video eligibility](https://developers.google.com/search/docs/appearance/video)
