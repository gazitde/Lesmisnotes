# Editorial presentation

The field guide uses paper, midnight-blue ink, restrained red accents and thin rules to distinguish a reading companion from a theatre programme. The homepage pairs large bilingual typography with one original Paris frontispiece, then gives equal prominence to the novel and musical. The four existing discovery features retain their destinations in an editorial rather than dashboard layout.

`dist/editorial.css` is the final, presentation-only stylesheet. It covers the homepage, musical journey, reading journey and character directory, plus the shared masthead and footer. Existing state, routing, disclosures, search, privacy choices, reading progress and spoiler boundaries are unchanged. Hebrew continues to use the bundled Noto Sans Hebrew; English headings use system Georgia. No remote fonts or additional services are introduced.

`dist/assets/paris-frontispiece.svg` is an original vector drawing made for this guide. It is an imagined architectural stage picture, not a historical reconstruction, photograph or adaptation of a performer image. Its palette and linework evoke an engraved book frontispiece. The existing ten character portraits and their provenance remain unchanged.

## Verification

- `npm run build`, `npm test`, and `npm run check:export` cover generated routes, content and privacy preservation.
- `scripts/browser-visual-programme.cjs` covers Hebrew and English at 1440, 820, 720, 680, 390 and 320 CSS-pixel widths, with screenshots of the homepage, both journeys and characters. It checks overflow, heading fit, keyboard access, portraits and spoiler boundaries. It runs as part of the existing CI browser gate.
- Narrow-browser checks are not physical-device certification. Review the resulting screenshots before release; test outcomes alone do not establish visual quality.
