# Search and mobile discovery

Global search is local to the browser. Search text is neither stored nor included in navigation or analytics. Existing consent-safe analytics may record a fixed category and result count, never the query.

## Exact reading coordinates

The 365 chapter positions accept `p1-b1-c2`, `part 1 book 1 chapter 2`, `חלק 1 ספר 1 פרק 2`, and `1.1.2`. Coordinates are validated against the novel's real hierarchy. Invalid coordinates give an empty result rather than numeric substring matches. Results use neutral Part/Book/chapter labels and exact reader URLs; chapter summary prose is never indexed.

## Song discovery

Thirty-seven reviewed song names are searchable before spoiler consent. For non-spotlight songs, a result selects the correct song behind the existing story gate. Full scene context and later outcomes remain protected. The outcome-bearing combined Arrested/Forgiven entry remains gated. Typo assistance uses a small explicit alias list, not unrestricted approximate search over plot text.

## Layout and canonical navigation

Phone layouts use a shorter hero, compact number/category rows in the three existing cards, reduced browsing-section spacing and 44px-or-larger utility controls. Reading passages retain their comfortable line-height. Search topics use native disclosure controls on small screens.

Legacy tribute and humor routes permanently redirect to the corresponding listening categories. Canonical, hreflang, metadata and the 50-entry localized sitemap remain generated at build time; previews retain noindex. Exact chapter query URLs canonicalize to the novel page.

Reference patterns: [official Les Mis London](https://london.lesmis.com/) for a clear primary action, [V&A](https://www.vam.ac.uk/) for concise editorial cards, and [Vercel configuration redirects](https://vercel.com/docs/routing/redirects/configuration-redirects) for permanent aliases.

The chapter companion loads only the selected local Part. A single production transfer sample on 12 October 2026 measured extras.js at 298,139 compressed bytes and app.js at 110,734 compressed bytes. These are transfer observations, not Core Web Vitals or a guarantee of mobile speed. Broader bundle splitting remains a profiling-led future task.
