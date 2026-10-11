# Private contact form

## Files and integration

- `api/contact.js`: Vercel Node function; copy to repository root `api/`, never `dist/`.
- `server/contact-service.cjs`: private server implementation and built-in-only adapters.
- `dist/contact.js` and `dist/contact.css`: public bilingual form assets; no recipient or credentials.
- `test/contact.test.cjs` and `test/contact-client.test.cjs`: Node's built-in test runner; `node --test test/contact*.test.cjs`.
- `test/contact-browser.test.cjs`: opt-in real-Chromium DOM test with all requests mocked; run `RUN_CONTACT_BROWSER_TEST=1 node --test test/contact-browser.test.cjs` in a browser-enabled environment. It is deliberately skipped by the ordinary aggregate command. During preparation, Chromium could not launch because the executor denied its socket creation, so no real-browser pass is claimed.

Use a root package without `type: module`, or keep `api/` in a CommonJS package scope. `.mjs` build scripts can coexist. Node 20+ is required for native fetch, timeout signals, and crypto.

Load contact.js before app.js; include contact.css. Add `contact` to labels, page hints, SEO metadata, sitemap, page renderer, footer and prerendered routes in both languages. Renderer: `window.SiteContact.render({lang})`. Call `window.SiteContact.cleanup()` **before** replacing app.innerHTML. After rendering, call `window.SiteContact.mount({lang,route})`. The mount does nothing on other routes.

Do not apply a catch-all SPA rewrite to `/api/contact`. The function must run at that path; the status probe treats HTML/404 as unavailable. The local static server may keep contact disabled, or explicitly route `/api/contact` to the handler for integration tests. Never expose `server/`, `.env` files, or the repository root as a public static directory. Set a Vercel function maxDuration of at least 30 seconds if adding an override; remote calls have their own shorter deadlines.

## Activation: intentionally not performed

`GET /api/contact` returns `503 {available:false, code:"not_configured"}` until configuration is complete. The form keeps Send disabled and offers draft copying. A safe build/deployment does not mean mail delivery is active. No account, credential, sender verification, infrastructure setting, or real email was created or tested while preparing this module.

Add only server-side environment variables in the authorized hosting project, scoped to the intended environment. Never use a public prefix, commit values, echo values into a command/log, or put the live recipient in examples/tests/README:

| Variable | Required value |
| --- | --- |
| CONTACT_ENABLED | `true` only after the delivery and abuse configuration is approved |
| CONTACT_RECIPIENT | The operator's private destination, entered securely on the server only |
| CONTACT_FROM | A bare sender email at an authorized, verified Resend sending domain |
| RESEND_API_KEY | An authorized sending credential, entered through a secure setup flow |
| CONTACT_SIGNING_SECRET | A stable, private, random value of at least 32 characters, entered securely |
| CONTACT_ALLOWED_ORIGINS | Comma-separated exact HTTPS origins, without paths or trailing slashes; no wildcards |
| CONTACT_RATE_LIMIT_MODE | `memory` by default; `redis` optionally enables shared limits |
| UPSTASH_REDIS_REST_URL | Required only in Redis mode, an HTTPS `*.upstash.io` REST endpoint |
| UPSTASH_REDIS_REST_TOKEN | Required only in Redis mode; authorized REST credential |

Local HTTP origins are allowed only for localhost/loopback when NODE_ENV is not production. Leave mail disabled on unapproved previews. This implementation expects Vercel's overwritten client-IP header on Vercel; on another host it uses the socket IP, so a trusted proxy integration must be reviewed separately.

The least-friction activation needs an existing authorized Resend account, verified sender and scoped sending key. Do not assume these exist. New credentials, persistent service access, account creation, DNS changes, paid resources and acceptance of new terms need the appropriate owner approval. The server adapter can be replaced if the owner already has another approved mail service. Browser FormSubmit/mailto patterns used by other sites disclose the recipient and do not satisfy this feature's privacy requirement.

## Abuse and retry behavior

- JSON POST only; exact same-origin checks, no CORS, 16 KiB body maximum, allowlisted fields/categories, 10–4,000 message characters, 80-character optional name, validated optional reply email, and header/control-character rejection.
- Honeypot plus signed server-issued ticket, a short minimum fill time, and a 23-hour ticket lifetime. Expired attempts cannot be automatically resent past the provider's 24-hour idempotency window.
- Plain-text email to a fixed server-configured destination. User data never controls recipient, sender, custom headers or subject structure. No auto-response is sent to unverified visitor addresses.
- Per-IP 5 attempts/15 minutes; per-instance 60/hour and 200/day; bounded in-memory storage; provider timeouts. **Memory counters and accepted-state caching are best effort and reset on cold start or deployment. They are not a distributed rate limit or a guarantee of a total spending cap.**
- Before broad production launch, configure and verify a Vercel edge/WAF rate-limit rule for POST `/api/contact` and suitable provider spending limits, or select Redis mode. This preparation has not configured those controls. The optional REST Redis adapter has atomic shared limits and no package dependency. If chosen but unavailable, it fails closed rather than falling back to memory.
- Retries use the same Resend Idempotency-Key and identical payload. Concurrent duplicates receive an in-progress response; accepted repeats receive the same generic acknowledgement. Provider-side deduplication still applies across cold starts. Changing content is a new submission; the UI warns after an uncertain prior attempt.
- Successful status means the provider accepted a message for sending, not delivered/read. Provider response bodies and credentials are never logged or echoed. Timeout/failure keeps the draft and says acceptance is unconfirmed, because the remote provider may already have accepted it.

## Privacy and retention

Browser drafts use in-memory state only, surviving SPA navigation/language changes but not reload/closing. They are cleared after acceptance. No form text or email address is sent to analytics by this module. Sender name and reply email are optional. There is no contact database or public posting.

The email provider receives message text, category, UI language and optional name/reply address. The receiving mailbox also retains the email under its own settings. This code does not claim a fixed provider/mailbox retention period.

Anti-abuse state stores a keyed IP hash (not a plain IP), keyed payload digest (not message text), random submission ID, counters and status. Per-IP counters expire after 15 minutes; global counters after at most 24 hours; submission records after 25 hours. In memory mode expired data is removed on the next POST or earlier on process teardown. Redis mode uses expiry. Hosting/provider infrastructure may retain its own request and operational logs under its policies; this module does not control their retention.

Suggested privacy policy copy is in `contact-privacy-copy.json`. Review actual hosting, email provider, optional Redis mode and operator mailbox practices before publishing final policy language. The provided copy is a technical description, not a legal compliance determination.

## Verification and launch checklist

1. Run `node --test test/contact*.test.cjs` and existing regression/build checks. All test addresses and credentials are synthetic; mock fetch prevents real mail.
2. Deploy without config: GET and POST must fail closed; form must show unavailable, preserve entered text and offer copy.
3. Confirm server files are not downloadable and private values are absent from built assets, HTML, source maps, repository history, API response/error bodies and public logs.
4. Configure only after approval. Confirm exact origin checks, provider sender verification, abuse controls and spending bounds.
5. With explicit authorization, send one clearly labelled test and verify actual receipt in the intended mailbox. A 202 alone is insufficient. Repeating its same submission must not send a second email.
6. Exercise keyboard/RTL/LTR, mobile, anonymous/no-reply submissions, malformed email, empty/long text, rate limits, offline and timeout, double-click, navigation/language change while sending, retry and new-note reset.

## Verified technical references

- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/dashboard/emails/idempotency-keys
- https://resend.com/legal/privacy-policy
- https://vercel.com/docs/functions/runtimes/node-js
- https://vercel.com/docs/headers/request-headers
- https://upstash.com/docs/redis/features/restapi

