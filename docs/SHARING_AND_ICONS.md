# Sharing cards, icons and crawler metadata

## Source of truth

- `config/metadata.json` holds the original bilingual page titles/descriptions and the short bilingual `shareCard` headings. Existing source-specific character and anniversary cards remain distinct.
- `scripts/build-share-assets.mjs` composes the 27 major-page covers from the site's original Paris/book frontispieces and character portraits, in the current paper/navy/burgundy visual system. No third-party imagery, raster editing, remote generation service or new dependency is used. These illustrations are editorial, not historical evidence.
- PNG covers are 1200 × 630 pixels. Both languages are visible on each cover so the same stable URL works for either localized page. Every cover retains the LesMisNotes brand and an identifiable page subject, without revealing plot outcomes.
- `scripts/build-config.mjs` converts authoring headings into local image metadata, validates the PNG header and dimensions, and excludes authoring-only fields from the browser bundle. Deprecated `tribute` and `humor` routes share their canonical listening cover.
- Anonymous chapter-bounded character views retain the generic home cover. Their images never disclose a character name or reading position. Existing specialized character PNG URLs are intentionally preserved.

## Icons

The flag silhouette remains recognizable and now uses the editorial palette. The asset authoring script writes the vector favicon to `dist/favicon.svg` and emits 16, 32, 48 and 96 pixel PNGs, a multi-size ICO, a 180 pixel Apple touch icon, and 192/512 pixel browser icons. Every generated page, including the root and 404, declares the icons and manifest.

`site.webmanifest` is a browser-mode manifest, not an offline-app claim. It adds no service worker, background process, permission request or tracking. Its icons use `purpose: any`, not a misleading maskable declaration.

## Regeneration and checks

Production builds do not require an image tool. Assets are committed, self-hosted and need no external request.

To intentionally regenerate assets, install the official Inkscape CLI and run:

```sh
node scripts/build-share-assets.mjs
npm run build
node --test test/sharing-metadata.test.cjs
node validate-seo.mjs
node scripts/check-sharing-http.mjs
```

The authoring task uses the installed Georgia-compatible serif and Noto Hebrew/DejaVu fallback fonts. Inspect all output after regeneration if fonts or Inkscape change. Hebrew text uses explicit RTL direction. Both vector source and PNG are retained for review.

Metadata checks cover every localized route, root/404 icon declarations, actual PNG/ICO dimensions, image MIME type, absolute canonical/OG URLs, reciprocal hreflang, runtime image/alias changes, anonymous reader safety and production-versus-preview configuration. No invented SearchAction, review, rating or social-account identity is added. Site search remains local and private.

## Release verification

After an authorized deployment:

1. Fetch the live root plus representative Hebrew and English deep links without JavaScript. Check canonical, localized descriptions, full Open Graph/Twitter fields and image URLs.
2. Fetch the ICO, PNG, Apple icon, manifest and each selected social image. Expect HTTP 200 with an appropriate content type, no login and no crawler block.
3. Test deep links in the sharing surfaces important to the owner. Platform caches may preserve earlier previews; their refresh/inspection tools are service-specific.
4. Keep preview deployments noindex. Do not advertise a preview sitemap as production.

The implementation follows the [Open Graph structured-image fields](https://ogp.me/#structured) and [Google favicon guidance](https://developers.google.com/search/docs/appearance/favicon-in-search). Correct metadata makes the site eligible for previews and icons; neither an exact appearance on every service nor search ranking/indexing can be guaranteed. No third-party debugger submission or production publication is performed by these local checks.
