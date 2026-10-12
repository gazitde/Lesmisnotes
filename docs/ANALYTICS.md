# GA4 analytics: deployment and event reference

Public measurement ID: `G-FWWTDG9CHN`. This is a public identifier, not a credential.

## Activation status and mandatory GA Admin check

The ID is configured in `dist/site-config.js` and `gaEnhancedMeasurementDisabled` is **true** following an authorized GA Admin change and reload verification on 11 October 2026 at 16:01:54 UTC. The entire Enhanced Measurement switch was confirmed OFF for the matching stream. Collection still requires a separate visitor opt-in.

Retention was read back at 16:02:29 UTC without changes: event data 2 months; user data 14 months; reset on new activity ON. These controls do not affect most aggregate reports. The site’s own analytics cookies separately expire after 180 days without automatic renewal.

Data collection was also inspected: Google Signals and user-provided-data collection were not activated. Property-level ads personalization and granular location/device collection remained ON; those account settings were not changed. The site’s tag separately denies advertising consent and sets `allow_google_signals:false` and `allow_ad_personalization_signals:false`. Do not describe all property-level advertising switches as disabled.

In Google Analytics, choose the matching property, then **Admin → Data collection and modification → Data streams → the Web stream with measurement ID G-FWWTDG9CHN → Enhanced measurement**. Turn the **entire Enhanced measurement switch OFF** and save. In particular, automatic page changes based on browser history, site search, form interactions, outbound clicks, downloads and video events must not run alongside this allowlisted implementation. A setting in this repository cannot change that server-side configuration. The `send_page_view:false` option suppresses the initial config pageview, but does **not** suppress Enhanced Measurement history pageviews.

For future configuration changes:

1. Record verification and set `gaEnhancedMeasurementDisabled:true` in `dist/site-config.js`.
2. Verify the property's retention setting and disclose its actual value; do not infer it from cookie expiry. Confirm Google Signals and advertising/user-provided-data collection remain off. Do not enable extra connected destinations or tag rules.
3. Update the bilingual `analytics-status` and retention disclosure in `dist/policies.js` to reflect the verified settings. The implementation's privacy controls are not a legal-compliance certification.
4. Run `npm run build`, `npm test` and `node scripts/browser-analytics.cjs`. Then deploy through the normal review/release process.
5. Verify the public deployment first without consent, then with consent, then after withdrawal. Use an explicitly authorized test/debug session if inspecting live GA receipt. A passing mocked test is not proof that data appears in the GA dashboard.

Do not paste an unconditional Google tag into the HTML. Do not set the verification guard merely to make the tag load. Keep the one existing loader.

## Consent, collection and URL boundaries

- Basic consent mode: analytics is entirely off before analytics-specific opt-in. Functional storage and spoilers are independent choices. Privacy consent version 3 requires a new analytics choice after this expanded, disclosed event scope. Valid unexpired version-2 records are normalized in memory with their existing functional/media choices and exact expiry preserved, so saved language and bookmarks still work; analytics is forced off. Migration neither persists a new grant nor extends its lifetime.
- Opt-in queues only post-consent events while the tag loads, up to 100 events in memory. Earlier activity is never replayed. Script load failure clears the queue and leaves collection disabled.
- Withdrawal sets Google's `ga-disable-G-FWWTDG9CHN` flag first, blocks application calls, drops pending events, removes the loader and the owned `lesmis_ga` cookies. A loaded third-party library cannot be unloaded merely by removing its script. Information already transmitted or requests already in flight cannot be recalled. Consent expiry and cross-tab updates use the same shutdown path.
- Reconsent starts with one current-page pageview, never replays the withdrawn period, and reuses an already-loaded tag without inserting another script.
- Pageviews use the build-validated public canonical origin, allowlisted route and `en`/`he` language. Query strings, fragments, document titles, inbound referrers and arbitrary browser URLs are never passed to our GA calls. Alias routes resolve to their canonical route. All six documented campaign fields are explicitly fixed to `not_collected`, overriding inbound UTM values rather than collecting marketing attribution.
- One manual pageview is emitted per distinct localized canonical route transition. Rerenders, search, map selections and gallery query changes do not count again. A language route, Back/Forward or leaving and returning to a route does count.
- Every event has `page_id`, `ui_language`, `language`, canonical `page_location`, empty `page_referrer`, fixed `page_title`, `active_journey` (one of five IDs or `none`) and `send_to`.
- Schemas reject extra keys, unknown event names/IDs, arbitrary strings and inconsistent counts. There are no names, emails, free-text answers, search queries, contact contents, submission identifiers, access URLs, user IDs or custom fingerprinting. Google's own basic events, pseudonymous browser identifier and standard connection/device information can still exist after opt-in; analytics is not anonymous.
- `ad_storage`, `ad_user_data` and `ad_personalization` stay denied; `allow_google_signals` and `allow_ad_personalization_signals` are false. First-party host-only analytics cookies expire after 180 days without sliding renewal. Google-side report retention is a separate account setting.

## Event taxonomy

| Event | Trigger and allowed event parameters |
| --- | --- |
| `page_view` | Initial consent or a different canonical language/route; common parameters only |
| `journey_start` | Explicit entry to one of `first`, `after`, `book`, `voices`, `play`; `journey_id`, `step_index` (1–4) |
| `journey_resume` | Explicit saved-path resume; `journey_id`, `step_index` |
| `journey_step` | Arriving at a path stop; `journey_id`, `step_index`, `entry_method` (`start`, `next`, `direct`, `history`) |
| `journey_next` | Following the next-stop link; `journey_id`, adjacent `from_step`, `to_step` |
| `journey_offroute` | Leaving a path for an unrelated page; `journey_id`, allowlisted `from_page`, `to_page` |
| `journey_exit` | Clicking Leave this path; `journey_id`, `step_index` |
| `journey_complete` | Arriving at stop 4; `journey_id`, `step_index:4`. This replaces `journey_final_stop`. It means final-stop arrival, not proof of reading or visiting every earlier stop. A later return through history is a new arrival. |
| `quiz_start` | A new round; `quiz_track` (`story`/`musical`), `question_count` (5/10/25) |
| `quiz_resume` | Explicit resume; track, question count, current `step_index` |
| `quiz_step` | First accepted submission of a question; track, question count, `step_index`. No answer ID, choice, text or per-question correctness. |
| `quiz_complete` | First transition to finished; track, question count, aggregate `correct_count` |
| `video_open` | Explicit gallery/video-version selection; curated `video_id`. It is not a play event. |
| `video_play` | YouTube IFrame API reports PLAYING for a connected current player; curated `video_id`. Once per mounted player, never inferred from opening/clicking. |
| `map_selection` | Story-atlas or geographic selection; `map_kind` and curated `place_id` |
| `content_open` | Existing curated chapter/character/map/novel/musical disclosure; fixed `content_type`, curated `content_id` |
| `search_open` | Opening the local search dialog; common parameters only |
| `search_results` | First settled result render per local query/filter revision; fixed `search_category`, `result_count` (capped at 1000). Neither query nor query hash is sent. |
| `search_select` | Opening an actual result; fixed `search_category`, `result_category`. No query, title or destination URL. |
| `contact_submit` | Each actual POST attempt; fixed `form_language` only. Retry is another attempt. |
| `contact_success` | Service explicitly accepts that attempt for sending; `form_language`. Not inbox delivery or reading. |
| `contact_error` | Validation rejection or actual failed POST; `form_language`, `error_category` (`validation`, `unavailable`, `rate_limited`, `rejected`, `network`, `unconfirmed`). No form fields, category entered by the visitor, response text or ticket. Availability checks/rerenders do not emit events. |
| `language_change` | Explicit switch; `from_language`, `to_language`. Selection/journey state remains controlled by the existing UI. |
| `share` | Native share promise or clipboard write succeeds; `content_type:quiz_achievement`, `method:native`/`clipboard`. Cancel/fallback is not success. This does not prove delivery to someone. |
| `badge_download` | Local badge download requested; `quiz_track`, `question_count`. Does not prove file retention. |
| `bookmark_change` | Bookmark actually added/removed with functional-storage permission; allowlisted page `content_id`, `bookmark_action:add`/`remove` |

For GA reports/explorations, register the needed event-scoped custom dimensions (for example `journey_id`, `step_index`, `entry_method`, `quiz_track`, `map_kind`, `place_id`, `search_category`, `result_category`, `error_category`, `ui_language`, `active_journey`, `bookmark_action`) and custom metrics for counts only as needed. Do not mark every navigation or pageview as a key event; choose conversion definitions deliberately.

## Tests and evidence

`test/analytics.test.cjs` uses an inert VM, fake storage/time and a mock script loader. It covers opt-in, inactive verification guard, delayed loading, pageview deduplication, canonical aliases, arbitrary-data rejection, ad settings, cookie ownership, expiry, cross-tab revocation, stale callbacks, reconsent and load failure.

`test/contact-client.test.cjs` stubs the service and verifies the analytics boundary receives only fixed outcome/language metadata. It never sends email.

`node scripts/browser-analytics.cjs` starts a local server on port 8886 and uses Playwright. It replaces site config with **G-TEST123**, fulfills the Google tag locally, mocks contact POSTs and the YouTube API, and blocks every other external request. It exercises all five paths, real UI consent, HE/EN and Back/Forward, search, map, quiz, video callbacks, bookmarks, sharing, contact and withdrawal. No production GA events or real email are produced. Set `CHROMIUM_PATH` if the runner needs an explicit executable.

Local VM/source tests were run during implementation. The restricted local executor cannot launch Chromium (`socket() Operation not permitted`); the browser suite must run in the existing GitHub CI browser environment before declaring browser acceptance passed.

## Official references (checked 11 October 2026)

- [Google: manual pageviews and Enhanced Measurement history warning](https://developers.google.com/analytics/devguides/collection/ga4/views)
- [Google: basic versus advanced consent mode](https://developers.google.com/tag-platform/security/concepts/consent-mode)
- [Google: consent default/update](https://developers.google.com/tag-platform/security/guides/consent)
- [Google: disabling the Google tag](https://developers.google.com/tag-platform/security/guides/privacy)
- [Google: GA4 configuration reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/config)

### Interest-led paths and legacy renewal

The three fixed journey identifiers `interest-novel`, `interest-musical`, and `interest-both` use the same four-stop event schema. No free-text interests or URL query values are sent. Valid version-2 analytics grants require one renewed choice for the expanded version-3 scope; prior refusals remain refused, and saved functional preferences are retained. The renewal marker is in memory until a new explicit choice replaces the consent record.
