# Original character portraits

The ten SVG illustrations in `dist/assets/portraits/` were drawn for LesMisNotes on 23 October 2026. They are original editorial interpretations of fictional characters, not photographs, actor likenesses, reproductions of historical illustrations, or portraits authenticated by Victor Hugo. No third-party visual source was traced or copied.

## Visual system

All illustrations have a 320 × 320 viewBox. Navy, warm paper, muted slate and red accents connect them to the site's existing original theatrical/Paris illustration. Clothing, hair, age cues and restrained expressions distinguish the people without depicting later plot outcomes. The Thénardiers share a paired illustration. Gavroche is represented as a child; Cosette is represented as a young adult.

- `valjean.svg`: mature face, grey hair and beard, blue coat.
- `javert.svg`: dark formal hat, sideburns, upright collar, stern expression.
- `bishop.svg`: elderly face, pale hair and beard, clerical stole and small cross.
- `fantine.svg`: brown curls, slate dress and cream collar.
- `cosette.svg`: long chestnut hair, ribbon and blue dress.
- `marius.svg`: dark tousled hair, blue coat and red cravat.
- `eponine.svg`: plain cap, brown coat and red scarf.
- `thenardiers.svg`: two innkeepers, in separate silhouettes.
- `enjolras.svg`: fair hair, red coat and white collar.
- `gavroche.svg`: child's proportions, broad cap, braces and scarf.

The existing `dist/assets/characters/` social-sharing covers remain unchanged. These portrait assets must not replace historical photographs or be described as source evidence.

## Accessibility and implementation

When a portrait sits beside the person's visible name or inside a link whose text already identifies the person, embed it with `alt=""` to avoid redundant screen-reader announcements. If used alone to identify a person, provide a localized character name as the alt text. Preserve visible text labels in relationship diagrams; imagery and color must not be the sole cues. Use native image dimensions to prevent layout shifts and lazy loading below the fold.

## Verification

All ten files were parsed as XML and rendered with Inkscape into a contact sheet for direct visual review. The set contains no external resources, scripts, embedded fonts or raster imagery. Existing source/copyright attribution elsewhere on the site is unaffected. These are illustrations, not claims that the characters' appearance or costume matches every detail of the novel or a particular adaptation.
