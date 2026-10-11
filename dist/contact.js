'use strict';
(() => {
  const MAX = 4000;
  const blank = () => ({ category: 'comment', name: '', email: '', message: '', website: '' });
  const state = { provider: 'formsubmit', uncertain: false, draft: blank(), ticket: null, fingerprint: '', phase: 'checking', code: '', available: false, busy: false, retryUntil: 0, errors: [] };
  let active = null;
  let generation = 0;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const words = {
    he: {
      eyebrow: 'הדואר שמאחורי הקלעים', title: 'יש לכם משהו להוסיף?', intro: 'הערה קטנה, תיקון חשוב, מחשבה שנשארה אחרי השיר. נשמח לקרוא.',
      sideTitle: 'גם פרט קטן יכול לפתוח דלת.', sideText: 'מצאתם טעות בשם, בתאריך או בקישור? יש ביצוע שכדאי להכיר? אפשר לכתוב כאן. לתיקון עובדתי, קישור למקור יעזור מאוד.',
      private: 'הפנייה פרטית ואינה מתפרסמת באתר. אין צורך להירשם.', optional: 'לא חובה', name: 'איך לפנות אליכם?', email: 'דואר לחזרה', emailHint: 'אפשר להשאיר ריק. בלי כתובת לא נוכל להשיב.', category: 'על מה הפנייה?',
      comment: 'הערה או מחשבה', correction: 'תיקון או מקור נוסף', feedback: 'משוב על האתר', other: 'משהו אחר', message: 'מה תרצו לספר?', messageHint: '10–4,000 תווים. בבקשה בלי מידע רגיש או פרטים אישיים של אחרים.',
      send: 'שליחת הפנייה', sending: 'שולחים…', retry: 'ניסיון נוסף', check: 'בדיקת זמינות מחדש', copy: 'העתקת הטקסט', copied: 'הטקסט הועתק. אפשר לשמור אותו אצלכם.', copyFailed: 'ההעתקה לא הצליחה. אפשר לסמן ולהעתיק את הטקסט מהשדות.',
      checking: 'בודקים אם שירות השליחה זמין…', ready: 'אפשר לשלוח. רק ההודעה והנושא הם שדות חובה.', unavailable: 'שירות השליחה עדיין לא זמין. אפשר להכין כאן טיוטה ולהעתיק אותה לשמירה אצלכם.',
      failed: 'לא התקבל אישור לשילוח. הטקסט נשאר כאן. אפשר לנסות שוב ידנית, אבל הניסיון הקודם אולי התקבל וניסיון נוסף עלול ליצור כפילות.', duplicateNotice: 'ייתכן שהניסיון הקודם התקבל; ניסיון חוזר ידני עלול ליצור הודעה כפולה.', limited: 'יש כרגע יותר מדי ניסיונות. הטיוטה נשארת כאן; המתינו מעט ונסו שוב.',
      inProgress: 'הבקשה הקודמת עדיין בטיפול. המתינו כמה שניות ונסו שוב עם אותה הודעה.', expired: 'פג תוקף הניסיון הקודם. בדקו שוב את הזמינות. אם השליחה נקטעה בעבר, ייתכן שההודעה כבר התקבלה.',
      rejected: 'לא הצלחנו לאמת את הבקשה. הטיוטה נשארת כאן. בדקו שוב את הזמינות ונסו שוב.', invalid: 'יש לתקן את השדות המסומנים לפני השליחה.', invalidName: 'עד 80 תווים, בלי ירידות שורה.', invalidEmail: 'נא לבדוק את כתובת הדואר.', invalidMessage: 'כתבו בין 10 ל־4,000 תווים.', invalidCategory: 'בחרו נושא מהרשימה.',
      success: 'תודה, הפנייה התקבלה לשילוח.', successDetail: 'שירות הדואר אישר שקיבל אותה. זהו אישור קבלה לשילוח, ולא אישור קריאה או מסירה לתיבה.', another: 'כתיבת פנייה נוספת',
      privacy: 'בלחיצה על שליחה, ההודעה והפרטים שבחרתם להוסיף יועברו לעורך האתר דרך {provider}. הטיוטה נשמרת בזיכרון הלשונית בלבד, ללא שמירה בדפדפן, ותימחק ברענון. בהסכמתכם למדידה נספרים רק ניסיונות שליחה ותוצאותיהם. שמות, כתובות ותוכן ההודעה אינם נשלחים לכלי המדידה.', privacyLink: 'עוד על פרטיות', noscript: 'לשליחה פרטית דרך האתר דרוש JavaScript. כרגע לא נשלחת שום הודעה.', remaining: n => `${n} / ${MAX} תווים`, changed: 'ערכתם את ההודעה אחרי ניסיון שליחה. השליחה הבאה תיחשב פנייה חדשה; ייתכן שהניסיון הקודם התקבל.'
    },
    en: {
      eyebrow: 'A note behind the scenes', title: 'Something to add?', intro: 'A small observation, an important correction, a thought that stayed after the song. We would love to read it.',
      sideTitle: 'Even a small detail can open a door.', sideText: 'Found a mistake in a name, date or link? Know a performance worth hearing? Tell us here. A source link is especially helpful for factual corrections.',
      private: 'Your message is private and will not be published on the site. No account needed.', optional: 'optional', name: 'What should we call you?', email: 'Email for a reply', emailHint: 'You can leave this blank. Without an address, we cannot reply.', category: 'What is it about?',
      comment: 'A comment or thought', correction: 'A correction or source', feedback: 'Feedback on the site', other: 'Something else', message: 'What would you like to tell us?', messageHint: '10–4,000 characters. Please leave out sensitive information and other people’s personal details.',
      send: 'Send your note', sending: 'Sending…', retry: 'Try again', check: 'Check availability again', copy: 'Copy your text', copied: 'Copied. You can save the text somewhere safe.', copyFailed: 'Copying did not work. You can select and copy the text from the fields.',
      checking: 'Checking whether sending is available…', ready: 'Ready to send. Only the message and topic are required.', unavailable: 'Sending is not available yet. You can prepare a draft here and copy it to keep.',
      failed: 'We could not confirm acceptance for sending. Your text is still here. You can retry manually, but the earlier attempt may have been accepted and another attempt may send a duplicate.', duplicateNotice: 'The earlier attempt may have been accepted; a manual retry may send a duplicate.', limited: 'There have been too many attempts. Your draft is still here; please wait a little and try again.',
      inProgress: 'Your earlier request is still being processed. Wait a few seconds and retry the same message.', expired: 'The earlier submission has expired. Check availability again. If sending was previously interrupted, that message may already have been accepted.',
      rejected: 'We could not verify the request. Your draft is still here. Check availability and try again.', invalid: 'Please fix the marked fields before sending.', invalidName: 'Use up to 80 characters, without line breaks.', invalidEmail: 'Please check the email address.', invalidMessage: 'Write between 10 and 4,000 characters.', invalidCategory: 'Choose one of the listed topics.',
      success: 'Thank you. Your note was accepted for sending.', successDetail: 'The email service confirmed acceptance. This does not confirm delivery to an inbox or that the note has been read.', another: 'Write another note',
      privacy: 'When you press Send, your message and any details you choose to add go to the site editor through {provider}. Your draft stays only in this tab’s memory, is not saved in browser storage, and disappears on reload. With analytics consent, only submission attempts and outcomes are counted. Names, addresses and message text are never sent to analytics.', privacyLink: 'More about privacy', noscript: 'JavaScript is needed to send a private message through this site. No message is being sent now.', remaining: n => `${n} / ${MAX} characters`, changed: 'You edited the message after a sending attempt. Sending again will create a new note; the earlier attempt may have been accepted.'
    }
  };
  const language = lang => lang === 'en' ? 'en' : 'he';
  const labels = lang => words[language(lang)];
  const providerName = () => state.provider === 'resend' ? 'Resend' : 'FormSubmit';
  const privacyText = w => w.privacy.replace('{provider}', providerName());

  function render({ lang = 'he' } = {}) {
    const w = labels(lang), d = state.draft;
    return `<div class="wrap contact-page"><header class="page-intro"><div class="eyebrow">${w.eyebrow}</div><h1>${w.title}</h1><p class="lede">${w.intro}</p></header><div class="contact-layout"><aside class="contact-aside"><div class="contact-postmark" aria-hidden="true"><b>1832</b><span>PARIS</span></div><h2>${w.sideTitle}</h2><p>${w.sideText}</p><p class="contact-private">${w.private}</p></aside><section class="contact-panel" aria-label="${escape(w.title)}"><div id="contact-success" class="contact-success" ${state.phase === 'sent' ? '' : 'hidden'}><h2 tabindex="-1" id="contact-success-title">${w.success}</h2><p>${w.successDetail}</p><button type="button" class="btn secondary" id="contact-another">${w.another}</button></div><form id="contact-form" class="contact-form" novalidate aria-describedby="contact-privacy" ${state.phase === 'sent' ? 'hidden' : ''}><div class="contact-field"><label for="contact-category">${w.category} <span aria-hidden="true">*</span></label><select id="contact-category" name="category" required aria-describedby="contact-category-error">${['comment', 'correction', 'feedback', 'other'].map(key => `<option value="${key}"${d.category === key ? ' selected' : ''}>${w[key]}</option>`).join('')}</select><p class="contact-error" id="contact-category-error" hidden></p></div><div class="contact-field"><label for="contact-name">${w.name} <small>${w.optional}</small></label><input id="contact-name" name="name" maxlength="80" autocomplete="name" value="${escape(d.name)}" aria-describedby="contact-name-error"><p class="contact-error" id="contact-name-error" hidden></p></div><div class="contact-field"><label for="contact-email">${w.email} <small>${w.optional}</small></label><input id="contact-email" name="email" type="email" inputmode="email" dir="ltr" maxlength="254" autocomplete="email" value="${escape(d.email)}" aria-describedby="contact-email-hint contact-email-error"><p class="contact-hint" id="contact-email-hint">${w.emailHint}</p><p class="contact-error" id="contact-email-error" hidden></p></div><div class="contact-field contact-full"><label for="contact-message">${w.message} <span aria-hidden="true">*</span></label><textarea id="contact-message" name="message" rows="8" required minlength="10" maxlength="4000" aria-describedby="contact-message-hint contact-count contact-message-error">${escape(d.message)}</textarea><p class="contact-count" id="contact-count">${w.remaining(d.message.length)}</p><p class="contact-hint" id="contact-message-hint">${w.messageHint}</p><p class="contact-error" id="contact-message-error" hidden></p></div><div class="contact-trap" aria-hidden="true"><label for="contact-website">Website</label><input id="contact-website" name="website" maxlength="200" tabindex="-1" autocomplete="off" value=""></div><div class="contact-actions contact-full"><button class="btn" id="contact-send" type="submit" disabled>${w.send}</button><button class="text-button" type="button" id="contact-check">${w.check}</button><button class="text-button" type="button" id="contact-copy">${w.copy}</button></div><p id="contact-status" class="contact-status contact-full" role="status" aria-live="polite" aria-atomic="true">${w.checking}</p><p id="contact-copy-status" class="contact-hint contact-full" role="status" aria-live="polite"></p></form><p id="contact-privacy" class="contact-privacy"><span id="contact-privacy-copy">${privacyText(w)}</span> <a href="/${language(lang)}/privacy/">${w.privacyLink}</a></p><noscript><p>${w.noscript}</p></noscript></section></div></div>`;
  }

  // Never pass draft/payload/response/error text into analytics; telemetry cannot break sending.
  function measure(name, lang, errorCategory) {
    try { window.SiteAnalytics?.track(name, { form_language: language(lang), ...(errorCategory ? { error_category: errorCategory } : {}) }); } catch {}
  }
  function errorCategory(code) {
    if (code === 'validation_failed') return 'validation';
    if (['not_configured', 'activation_required'].includes(code)) return 'unavailable';
    if (['rate_limited', 'too_fast', 'in_progress'].includes(code)) return 'rate_limited';
    if (['origin_rejected', 'invalid_ticket', 'expired_ticket', 'submission_changed', 'submission_rejected', 'body_too_large'].includes(code)) return 'rejected';
    return 'unconfirmed';
  }
  function capture() {
    if (!active?.form || state.phase === 'sent') return;
    for (const key of Object.keys(state.draft)) {
      const field = active.form.elements.namedItem(key);
      if (field) state.draft[key] = field.value;
    }
  }
  function message(w) {
    if (state.phase === 'checking') return w.checking;
    if (state.busy) return w.sending;
    if (state.phase === 'sent') return w.success;
    if (state.code === 'validation_failed') return w.invalid;
    if (state.available && state.fingerprint && state.fingerprint !== fingerprint()) return w.changed + (['rate_limited', 'too_fast'].includes(state.code) ? ' ' + w.limited : state.code === 'in_progress' ? ' ' + w.inProgress : '');
    if (state.code === 'rate_limited' || state.code === 'too_fast') return w.limited + (state.uncertain ? ' ' + w.duplicateNotice : '');
    if (state.code === 'in_progress') return w.inProgress + (state.uncertain ? ' ' + w.duplicateNotice : '');
    if (state.code === 'expired_ticket') return w.expired;
    if (['origin_rejected', 'invalid_ticket', 'submission_changed', 'submission_rejected', 'body_too_large'].includes(state.code)) return w.rejected;
    if (!state.available || state.code === 'not_configured') return w.unavailable + (state.uncertain ? ' ' + w.duplicateNotice : '');
    if (state.phase === 'failed' || state.uncertain) return w.failed;
    return w.ready;
  }
  function fingerprint() { return JSON.stringify({ category: state.draft.category, name: state.draft.name.trim(), email: state.draft.email.trim(), message: state.draft.message.trim() }); }
  function update() {
    if (!active) return;
    const w = labels(active.lang), form = active.form, status = document.getElementById('contact-status');
    const sent = state.phase === 'sent'; form.hidden = sent;
    document.getElementById('contact-success').hidden = !sent;
    form.setAttribute('aria-busy', String(state.busy));
    for (const field of form.querySelectorAll('input, textarea, select')) field.disabled = state.busy;
    const send = document.getElementById('contact-send');
    send.disabled = state.busy || !state.available || !state.ticket || state.retryUntil > Date.now() || state.phase === 'checking';
    send.textContent = state.busy ? w.sending : state.phase === 'failed' ? w.retry : w.send;
    document.getElementById('contact-check').disabled = state.busy || state.phase === 'checking';
    status.textContent = message(w); status.classList.toggle('is-error', state.phase === 'failed');
    document.getElementById('contact-count').textContent = w.remaining(state.draft.message.length);
    document.getElementById('contact-privacy-copy').textContent = privacyText(w);
    for (const key of ['category', 'name', 'email', 'message']) {
      const field = form.elements.namedItem(key), box = document.getElementById(`contact-${key}-error`), invalid = state.errors.includes(key);
      field.setAttribute('aria-invalid', String(invalid)); box.hidden = !invalid;
      box.textContent = invalid ? w[{ category: 'invalidCategory', name: 'invalidName', email: 'invalidEmail', message: 'invalidMessage' }[key]] : '';
    }
  }
  async function checkAvailability({ preserveAttempt = true } = {}) {
    if (state.busy) return false;
    const version = generation;
    if (active) active.check?.abort();
    const controller = new AbortController(); if (active) active.check = controller;
    state.phase = 'checking'; state.code = ''; update();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch('/api/contact', { credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store', signal: controller.signal });
      const body = await response.json();
      if (version !== generation) return false;
      if (['formsubmit', 'resend'].includes(body.provider)) state.provider = body.provider;
      state.available = response.ok && body.available === true && typeof body.ticket?.signature === 'string';
      if (state.available) {
        if (!preserveAttempt || !state.ticket || !state.fingerprint) { state.ticket = body.ticket; state.ticketReadyAt = Date.now() + 900; }
        state.phase = 'ready'; return true;
      }
      state.phase = 'unavailable'; state.code = 'not_configured'; return false;
    } catch {
      if (version !== generation) return false;
      state.available = false; state.phase = 'unavailable'; return false;
    } finally { clearTimeout(timer); if (version === generation) update(); }
  }
  function validate() {
    const d = state.draft, bad = [];
    if (!['comment', 'correction', 'feedback', 'other'].includes(d.category)) bad.push('category');
    if (d.name.trim().length > 80 || /[\u0000-\u001f\u007f\u2028\u2029]/.test(d.name)) bad.push('name');
    if (d.email.trim() && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim()) || d.email.length > 254 || !active.form.elements.namedItem('email').checkValidity())) bad.push('email');
    if (d.message.trim().length < 10 || d.message.trim().length > MAX) bad.push('message');
    state.errors = bad;
    if (bad.length) { state.phase = 'failed'; state.code = 'validation_failed'; update(); active.form.elements.namedItem(bad[0]).focus(); return false; }
    return true;
  }
  async function submit(event) {
    event.preventDefault();
    if (state.busy || state.phase === 'checking' || !active) return;
    capture();
    if (!validate()) { measure('contact_error', active.lang, 'validation'); return; }
    if (!state.available || state.retryUntil > Date.now()) return;
    let signature = fingerprint();
    if (state.fingerprint && state.fingerprint !== signature) { state.ticket = null; state.fingerprint = ''; }
    if (!state.ticket && !await checkAvailability({ preserveAttempt: false })) return;
    if (!active) return;
    // Fields may change while the availability request is pending. Validate and fingerprint
    // the exact draft we will send, not the earlier draft that started that request.
    capture(); if (!validate()) { measure('contact_error', active.lang, 'validation'); return; } signature = fingerprint();
    const payload = { ...state.draft, lang: active.lang, ticket: state.ticket };
    // Freeze the actual payload language across retries, including a later language switch.
    if (state.fingerprint === signature && state.attemptLanguage) payload.lang = state.attemptLanguage;
    else state.attemptLanguage = payload.lang;
    state.fingerprint = signature; state.busy = true; state.phase = 'sending'; state.code = ''; update();
    // A replacement ticket was just issued; give it time to satisfy the server's minimum age.
    // Measuring since receipt avoids assumptions about synchronization of client/server clocks.
    const ticketWait = Math.min(900, Math.max(0, (state.ticketReadyAt || 0) - Date.now()));
    if (ticketWait) await new Promise(resolve => setTimeout(resolve, ticketWait));
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 25000);
    measure('contact_submit', payload.lang);
    try {
      const response = await fetch('/api/contact', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
      const body = await response.json();
      if (response.ok && body.ok === true && body.code === 'accepted') {
        measure('contact_success', payload.lang);
        state.phase = 'sent'; state.uncertain = false; state.draft = blank(); state.ticket = null; state.fingerprint = ''; state.errors = []; state.code = ''; state.retryUntil = 0;
      } else {
        state.phase = 'failed'; state.code = typeof body.code === 'string' ? body.code : 'delivery_unconfirmed';
        measure('contact_error', payload.lang, errorCategory(state.code));
        if (['delivery_unconfirmed', 'activation_required'].includes(state.code)) state.uncertain = true;
        state.errors = Array.isArray(body.fields) ? body.fields.filter(x => ['category', 'name', 'email', 'message'].includes(x)) : [];
        if (['not_configured', 'activation_required'].includes(state.code)) state.available = false;
        if (['expired_ticket', 'invalid_ticket', 'submission_changed'].includes(state.code)) { state.ticket = null; state.fingerprint = ''; }
        const retry = Math.min(86400, Math.max(0, Number(response.headers.get('Retry-After')) || 0));
        state.retryUntil = Date.now() + retry * 1000;
        if (active && retry) { clearTimeout(active.retryTimer); active.retryTimer = setTimeout(update, retry * 1000 + 10); }
      }
    } catch { measure('contact_error', payload.lang, 'network'); state.phase = 'failed'; state.code = 'delivery_unconfirmed'; state.uncertain = true; }
    finally {
      clearTimeout(timer); state.busy = false; update();
      if (active && state.phase === 'sent') { active.form.reset(); for (const key of Object.keys(state.draft)) active.form.elements.namedItem(key).value = state.draft[key]; document.getElementById('contact-success-title').focus(); }
      if (active && state.errors[0]) active.form.elements.namedItem(state.errors[0]).focus();
    }
  }
  function cleanup() {
    capture(); generation++;
    if (active) { active.check?.abort(); clearTimeout(active.retryTimer); }
    active = null;
  }
  function mount({ lang = 'he', route = 'contact' } = {}) {
    if (route !== 'contact') return;
    const form = document.getElementById('contact-form'); if (!form?.addEventListener) return;
    active = { form, lang: language(lang) }; const w = labels(lang);
    form.addEventListener('input', () => { capture(); state.errors = []; if (state.code === 'validation_failed') state.code = ''; update(); });
    form.addEventListener('change', () => { capture(); update(); });
    form.addEventListener('submit', submit);
    document.getElementById('contact-check').addEventListener('click', () => checkAvailability({ preserveAttempt: true }));
    document.getElementById('contact-copy').addEventListener('click', async () => {
      capture(); const d = state.draft;
      const content = [w[d.category], d.message, d.name, d.email].filter(Boolean).join('\n\n');
      try { await navigator.clipboard.writeText(content); if (active) document.getElementById('contact-copy-status').textContent = labels(active.lang).copied; }
      catch { if (active) document.getElementById('contact-copy-status').textContent = labels(active.lang).copyFailed; }
    });
    document.getElementById('contact-another').addEventListener('click', () => {
      state.phase = 'ready'; state.uncertain = false; state.code = ''; state.ticket = null; state.fingerprint = ''; state.draft = blank(); form.reset(); for (const key of Object.keys(state.draft)) form.elements.namedItem(key).value = state.draft[key]; update();
      checkAvailability({ preserveAttempt: false }); form.elements.namedItem('message').focus();
    });
    if (state.busy || state.phase === 'sent') update();
    else if (state.phase === 'checking') checkAvailability();
    else if (state.available && state.ticket) { update(); if (state.retryUntil > Date.now()) active.retryTimer = setTimeout(update, state.retryUntil - Date.now() + 10); }
    else checkAvailability();
  }
  window.SiteContact = Object.freeze({ render, mount, cleanup });
})();
