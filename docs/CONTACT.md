# Private contact form

## Files and integration

- `api/contact.js`: Vercel Node function; copy to repository root `api/`, never `dist/`.
- `server/contact-service.cjs`: private server implementation and built-in-only FormSubmit/Resend adapters.
- `server/contact-route.cjs`: the existing provider-issued public routing alias, used server-side only. It is not an API or archive-access credential.
- `dist/contact.js` and `dist/contact.css`: public bilingual form assets; no recipient or credentials.
- `test/contact.test.cjs` and `test/contact-client.test.cjs`: Node's built-in test runner; `node --test test/contact*.test.cjs`.
- `test/contact-browser.test.cjs`: opt-in real-Chromium DOM test with all requests mocked; run `RUN_CONTACT_BROWSER_TEST=1 node --test test/contact-browser.test.cjs` in a browser-enabled environment. It is deliberately skipped by the ordinary aggregate command. During preparation, Chromium could not launch because the executor denied its socket creation, so no real-browser pass is claimed.

Use a root package without `type: module`, or keep `api/` in a CommonJS package scope. `.mjs` build scripts can coexist. Node 20+ is required for native fetch, timeout signals, and crypto.

Load contact.js before app.js; include contact.css. Add `contact` to labels, page hints, SEO metadata, sitemap, page renderer, footer and prerendered routes in both languages. Renderer: `window.SiteContact.render({lang})`. Call `window.SiteContact.cleanup()` **before** replacing app.innerHTML. After rendering, call `window.SiteContact.mount({lang,route})`. The mount does nothing on other routes.

Do not apply a catch-all SPA rewrite to `/api/contact`. The function must run at that path; the status probe treats HTML/404 as unavailable. The local static server may keep contact disabled, or explicitly route `/api/contact` to the handler for integration tests. Never expose `server/`, `.env` files, or the repository root as a public static directory. Set a Vercel function maxDuration of at least 30 seconds if adding an override; remote calls have their own shorter deadlines.

## Activation status and server configuration

The approved default FormSubmit route is enabled for the exact production origins in `server/contact-route.cjs`: `https://www.lesmisnotes.com` and `https://lesmisnotes.com`. It needs no environment variables or signing secret. GET/POST on an unapproved preview host is rejected. `CONTACT_ENABLED=false` explicitly disables the service; invalid overrides fail closed. Configuration readiness does not prove provider activation or actual email delivery. No real submission has been made during module preparation; the one approved deployment test must be verified separately.

The non-secret production enable flag, exact origin allowlist and public provider-routing alias are server source configuration. Optional environment overrides below must stay server-side and be scoped to the intended environment. Never use a public prefix, commit values, echo values into a command/log, or put the live recipient in examples/tests/README:

| Variable | Required value |
| --- | --- |
| CONTACT_ENABLED | Optional override; `false` disables the already-approved default FormSubmit route |
| CONTACT_PROVIDER | `formsubmit` by default; `resend` is an optional explicit alternative |
| FORMSUBMIT_ALIAS | Optional override of the existing server-only public routing alias; 32 hexadecimal characters, never an email/address fallback or archive API key |
| CONTACT_RECIPIENT | Resend only: the operator's private destination, entered securely on the server only |
| CONTACT_FROM | Resend only: a bare sender email at an authorized, verified sending domain |
| RESEND_API_KEY | Resend only: an authorized sending credential, entered through a secure setup flow |
| CONTACT_SIGNING_SECRET | Required only for optional Resend or Redis modes; at least 32 private random characters. Default FormSubmit/memory mode uses only an ephemeral privacy salt, not a persistent credential |
| CONTACT_ALLOWED_ORIGINS | Optional replacement of the server-source origin allowlist; comma-separated exact HTTPS origins without paths, trailing slashes or wildcards |
| CONTACT_RATE_LIMIT_MODE | `memory` by default; `redis` optionally enables shared limits |
| UPSTASH_REDIS_REST_URL | Required only in Redis mode, an HTTPS `*.upstash.io` REST endpoint |
| UPSTASH_REDIS_REST_TOKEN | Required only in Redis mode; authorized REST credential |

Local HTTP origins are allowed only for localhost/loopback when NODE_ENV is not production. Unapproved preview hosts are rejected by the server-source origin allowlist. Do not add them casually. This implementation expects Vercel's overwritten client-IP header on Vercel; on another host it uses the socket IP, so a trusted proxy integration must be reviewed separately.

The default uses FormSubmit, the same service as the related sites, with the existing verified opaque routing alias kept server-side. No new FormSubmit account, archive API key, verified sender domain, Resend credential or Redis account is needed for this route. The new production domain may require its own one-time FormSubmit activation even though the destination worked on other sites. The provider confirmation link must only be used with the appropriate authorization. One authorized synthetic test on 2026-10-11 returned an unconfirmed outcome; actual delivery and new-domain activation are not yet verified. Do not repeat an uncertain live test without separate approval.

The provider describes the alias as a public replacement for the recipient address. Do not substitute an archive API key, raw email address, activation link or authentication token for it. Its AJAX endpoint is proxied using the same pattern already verified in the related Room for Peace site, including an exact `_url` and valid site Origin/Referer. The new domain remains unverified until an authorized real test.

Resend remains an optional explicit adapter. It requires an existing authorized account, verified sender and scoped sending key; do not create these by default. New credentials, persistent access, paid resources or new legal agreements need the applicable approval.

## Abuse and retry behavior

- JSON POST only; exact same-origin checks, no CORS, 16 KiB body maximum, allowlisted fields/categories, 10–4,000 message characters, 80-character optional name, validated optional reply email, and header/control-character rejection.
- Honeypot, short minimum fill time, random submission nonce and a 23-hour submission lifetime. The FormSubmit timing marker is deliberately public and is not authentication or proof of humanity; bots can forge timing, so do not treat it as strong anti-bot protection. Resend mode retains a signed ticket, whose 23-hour lifetime stays within Resend's 24-hour idempotency window.
- Fixed server-controlled provider destination. FormSubmit receives only the allowlisted named fields; Resend sends a plain-text email. User data never controls recipient, sender, custom headers or subject structure. No auto-response is sent to unverified visitor addresses.
- Per-IP 5 attempts/15 minutes; per-instance 60/hour and 200/day; bounded in-memory storage; provider timeouts. **Memory counters and accepted-state caching are best effort and reset on cold start or deployment. They are not a distributed rate limit or a guarantee of a total spending cap.**
- For stronger abuse protection or higher traffic, consider a verified Vercel edge/WAF rate-limit rule for POST `/api/contact` or the optional shared Redis mode, plus suitable provider limits. This preparation has not configured those controls. The optional REST Redis adapter has atomic shared limits and no package dependency. If chosen but unavailable, it fails closed rather than falling back to memory.
- The browser never retries automatically. Concurrent duplicates receive an in-progress response; accepted repeats can reuse stored acknowledgement. FormSubmit does not document an idempotency guarantee: after a timeout or a cold start, a manual retry can produce a second email, and the UI says so. The optional Redis store shares accepted status across instances but cannot make an uncertain provider response exactly-once. Resend mode additionally uses the same provider Idempotency-Key and identical payload on retries, including across cold starts. Changing content is a new submission, with a warning after an uncertain prior attempt.
- Successful status means the provider accepted a message for sending, not delivered/read. Provider response bodies and credentials are never logged or echoed. Timeout/failure keeps the draft and says acceptance is unconfirmed, because the remote provider may already have accepted it.
- Provider fetch and response-body reading share a bounded 15-second timeout. Failure responses may include only an allowlisted `diagnostic` category and numeric `upstreamStatus` (100–599). Categories distinguish timeout, network, HTTP, HTML/non-JSON, malformed success, provider decline, activation and rate limiting. They do not contain provider text, URLs, response headers or visitor fields; no extra diagnostic logs are written. An HTML response does not itself establish a CAPTCHA or access challenge. Diagnostics never trigger a resend or convert an uncertain result into success.

## Privacy and retention

Browser drafts use in-memory state only, surviving SPA navigation/language changes but not reload/closing. They are cleared after acceptance. No form text or email address is sent to analytics by this module. Sender name and reply email are optional. There is no contact database or public posting.

The email provider receives message text, category, UI language and optional name/reply address. FormSubmit also receives the canonical form URL and documents a 30-day submissions archive. No archive API access is requested or configured. The receiving mailbox retains emails under its own settings; that mailbox retention is not controlled by this module. If using optional Resend mode, review its separate retention settings and update the published provider disclosure accordingly.

Anti-abuse state stores a keyed IP hash (not a plain IP), keyed payload digest (not message text), random submission ID, counters and status. Per-IP counters expire after 15 minutes; global counters after at most 24 hours; submission records after 25 hours. In memory mode expired data is removed on the next POST or earlier on process teardown. Redis mode uses expiry. Hosting/provider infrastructure may retain its own request and operational logs under its policies; this module does not control their retention.

Suggested privacy policy copy is in `contact-privacy-copy.json`. Review actual hosting, email provider, optional Redis mode and operator mailbox practices before publishing final policy language. The provided copy is a technical description, not a legal compliance determination.

## Verification and launch checklist

1. Run `node --test test/contact*.test.cjs` and existing regression/build checks. All test addresses/overridden routing aliases/credentials are synthetic; mock fetch prevents real mail.
2. Test explicit disabled/invalid configuration and unapproved preview origins: requests must fail closed; the form must preserve entered text and offer copy. Confirm only the approved production origins can enable the default route.
3. Confirm server files are not downloadable and private values are absent from built assets, HTML, source maps, repository history, API response/error bodies and public logs.
4. The approved source configuration uses canonical origin `https://www.lesmisnotes.com`; the apex `https://lesmisnotes.com` redirects there. Confirm exact origin checks, FormSubmit domain activation and reasonable abuse monitoring. Strong distributed protection is an optional operator decision, not a guarantee of warm-memory limits. In Resend mode, separately configure credentials and sender verification after approval.
5. With explicit authorization, send one clearly labelled test and verify actual receipt in the intended mailbox. A 202 alone is insufficient. For an accepted same-ticket retry, check that the local/shared accepted-state path does not send again. Do not claim provider-level deduplication for FormSubmit, and do not retry an uncertain live test without reviewing the inbox first.
6. Exercise keyboard/RTL/LTR, mobile, anonymous/no-reply submissions, malformed email, empty/long text, rate limits, offline and timeout, double-click, navigation/language change while sending, retry and new-note reset.

## Authorized synthetic test to request

One proposed message, to be sent only after explicit approval: “LesMis Notes technical delivery check. This is an authorized synthetic test of the private contact form, not a visitor message. No reply needed.” Do not send real visitor data while testing. Check both the provider response and the intended mailbox. An activation-required response is not successful sending. Do not follow unrelated activation links from older sites.

## Verified technical references

- https://formsubmit.co/documentation
- https://formsubmit.co/ajax-documentation
- https://formsubmit.co/help
- https://formsubmit.co/privacy.pdf

- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/dashboard/emails/idempotency-keys
- https://resend.com/legal/privacy-policy
- https://vercel.com/docs/functions/runtimes/node-js
- https://vercel.com/docs/headers/request-headers
- https://upstash.com/docs/redis/features/restapi

## Optional contact outcome analytics

With separate analytics consent and a verified active GA configuration, the client counts `contact_submit`, `contact_success` and `contact_error`. The only parameters are a fixed form-language code and, for errors, a broad allowlisted error category. No names, email addresses, form category/content, ticket/submission identifiers, fingerprints or response/error text enter analytics. Availability checks and rerenders do not create these events. Success means provider acceptance, not inbox delivery. The analytics boundary is exception-safe and cannot prevent a submission. See [ANALYTICS.md](ANALYTICS.md).
