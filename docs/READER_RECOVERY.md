# Reading choices and recovery paths

This change is stacked on the reviewed visual revision `5675abbc0f41d6ea11e0fe9c55fe5932387b8b69`. It preserves the four existing home discoveries and the visual design.

## Hebrew reading

The reader now surfaces the existing Yaakov Steinberg translation directly, using Project Ben-Yehuda's verified [volume I](https://benyehuda.org/read/43076), [volume II](https://benyehuda.org/read/43194) and [contents](https://benyehuda.org/read/43193). A visible caveat identifies it as abridged and explains that its chapter structure differs from the complete novel. No one-to-one mapping to the companion's 365 chapters is asserted. Exact Hapgood chapter links remain unchanged.

The entry is visible at the start of the reading journey; the selected chapter has a compact disclosure. No third-party content is fetched by opening the disclosure. The external links remain ordinary user-initiated navigation.

## Source catalogue

Supported topics are the existing curated IDs, for example `/he/about/?topic=history-ideas#about-sources` and `/en/about/?topic=screen-video#about-sources`. Invalid, empty and duplicate topic parameters fall back to all sources. Topic navigation integrates with Back/Forward, language switching and reload. Free-text searches stay only in application memory, never URL parameters, browser history state, local storage or analytics. Reload clears a free-text search while retaining the curated topic.

## Quiz-only reset

The explicit reset control is present in setup, play and results. A confirmation explains the irreversible loss of the quiz round, answers and local badge; Cancel receives initial focus. The narrow deletion operates on quiz storage even when remembering is off. Reading position, completed chapters, bookmarks, listening checks, privacy choices and other spoiler choices are not erased. Storage failures are disclosed rather than reported as success.

## Video recovery

The existing YouTube IFrame API's error handler differentiates missing/private videos (100), embedding restrictions (101/150), client identification errors (153) and unknown errors. A missing-video error exposes a manual title/uploader search link. The original direct YouTube link remains available regardless of API status. No search request is made automatically and no new telemetry is added. Error semantics follow the [official IFrame API reference](https://developers.google.com/youtube/iframe_api_reference#Events).

## Verification

The repository's aggregate Node/VM tests and focused browser scripts cover localized behavior, state isolation, deep links, focus, synthetic storage failures and fake player error callbacks. Browser tests use isolated contexts and do not modify a visitor's data or claim real external-video playback. Full browser verification is run by the existing GitHub CI, including 1280/390/320 CSS-pixel coverage for the new recovery controls. Local browser execution may be unavailable in restricted runtimes; a Node-only pass is not presented as browser certification.
