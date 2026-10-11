# Public launch checklist

## Decisions and configuration

- [x] LesMisNotes display name and HTTPS domain verified: `lesmisnotes.com` redirects to `www.lesmisnotes.com`.
- [x] Vercel serves static routes and the Node contact API over verified HTTPS.
- [x] Public origin/indexing authorized in code configuration; Vercel preview noindex protection retained.
- [ ] Complete the operator identity and contact/retention statements in `dist/policies.js`; verify that the published statements match actual operation.
- [x] FormSubmit selected using the existing opaque routing alias, held server-side with exact approved origins.
- [ ] Verify one authorized technical message reaches the intended inbox.
- [ ] Configure production-grade abuse controls and a retention policy for provider logs and received correspondence.
- [ ] Keep analytics disabled unless a separate measurement configuration and consent review have been completed.

## Release validation

- [ ] `npm ci && npm run build && npm test && npm run check:export` passes from a fresh checkout.
- [ ] Verify HTTPS public routes, real 404 status, redirects, canonical URLs and both language alternates on the actual host.
- [ ] Check metadata/social-card previews and structured data using official validators. Do not assign publisher recipe ratings to these adaptations.
- [ ] Verify home, all five journeys, search keyboard controls, spelling variants, no-results state, spoiler-safe results, maps, image credits, recipe crosslinks and printing.
- [ ] Test feedback: unavailable, invalid, sending, success, provider failure, retry and rate-limit states; verify a real authorized message arrives before claiming delivery.
- [ ] Test relevant YouTube playback on a normal user browser and confirm unavailable-video fallback links.
- [ ] Review narrow mobile layouts and at least one real phone and screen reader; reduced-motion settings must remain respected.
- [ ] Review rights, privacy and terms for the actual audience and jurisdiction. The code is not legal certification.
- [ ] Submit the final sitemap in Search Console only after ownership verification and public-launch approval.

## SEO design notes

Content is prerendered into normal links and localized pages, with distinct titles and descriptions. The verified origin is in `config/site.json`; an explicit empty `SITE_ORIGIN` omits canonical links. Public builds use one HTTPS origin, self-language canonicals, reciprocal alternates, a canonical-only sitemap, and simple WebSite/WebPage/CollectionPage/BreadcrumbList data reflecting visible content. Spoiler-protected narrative content remains protected in static HTML and metadata.

No ranking promise, copied aggregate ratings, fabricated author identity, misleading video availability or search-engine-only content is used.

Primary guidance consulted:
- https://developers.google.com/search/docs/specialty/international/localized-versions
- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
- https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- https://vercel.com/docs/project-configuration
