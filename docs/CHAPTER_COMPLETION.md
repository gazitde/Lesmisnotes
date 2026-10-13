# Explicit chapter completion

The reader counts only chapters explicitly marked with **Mark chapter read** / **סיימתי את הפרק**. Every chapter has an undo action. The progress summary uses a native labelled progress element with the canonical 365-chapter denominator and a plain-language count. All controls work with keyboard input; marking moves focus to undo, and undo returns focus to marking. A polite live region announces an explicit change once.

Opening a chapter, reading its summary, following a link, changing language, selecting another chapter, or navigating Back/Forward never marks a chapter read. The controller survives the app’s partial and full renders. Completion does not change the selected reading position, URLs, spoiler choices, recap consent, or content visibility.

## Storage and privacy

- Optional key: `barricade-completed-chapters-v1`.
- Format: `{ "version": 1, "completed": ["p1-b1-c1"] }`.
- Only canonical chapter IDs are accepted. IDs are unique and stored in canonical order. Invalid JSON, unsupported versions, oversized values, unknown IDs, and non-string entries cannot create false progress.
- The existing functional-consent helper owns all reads and writes. Without consent the controller uses page memory, surviving app navigation but disappearing on reload or close. It never reads or writes previously stored completion while remembering is off.
- A single concise storage notice accompanies progress. Its Privacy settings button opens the existing privacy dialog on request, without prompting automatically.
- Granting remembering permission merges prior saved IDs with current page-session choices. A session undo remains an explicit removal during that merge.
- Withdrawal or expiry clears completion from active use. The existing site policy deliberately retains old device storage until the visitor uses the separate erase control. That control now also erases this completion key and clears its in-memory state. Cross-tab consent withdrawal uses the existing privacy subscription.
- No account, free text, network request, analytics event, or spoiler-consent write is introduced. If browser storage is unavailable, marking still works in page memory; the notice qualifies persistence accordingly.
- The JavaScript control is not placed in no-JavaScript prerendered HTML. Existing static chapter/source links remain available.

## Tests

`npm test` automatically includes `test/chapter-completion.test.cjs` and `test/chapter-completion-app.test.cjs`. These cover the controller and actual application inside the deterministic VM, including all 365 canonical IDs, repeated marking, undo, rendering, language, history, refusal, reload, consent grant/revocation/expiry/erase, corrupted values, unavailable storage, live announcements, focus, and separation from reading position and spoilers.

`npm run test:browser` includes `scripts/browser-chapter-completion.cjs` through the existing CI browser runner. It covers real HE/EN controls at 320, 390, and 1365 CSS pixels, keyboard marking, focus, history, language, reload, consent flows, erasure cancellation, corrupted data, cross-tab withdrawal, and narrow-screen screenshots. Run after building and installing the supported Playwright Chromium version. A VM pass is not a real-browser or physical-device certification.
