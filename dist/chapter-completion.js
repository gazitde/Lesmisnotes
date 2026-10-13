'use strict';
/* Explicit chapter completion. Reading position, spoiler consent and analytics are separate. */
(() => {
  const KEY = 'barricade-completed-chapters-v1';
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function create({privacy, chapters, document, getLanguage = () => 'en'}) {
    const ordered = [...new Set((chapters || []).map(c => c.id).filter(id => /^p[1-5]-b\d+-c\d+$/.test(id)))];
    const valid = new Set(ordered), pending = new Map();
    let functional = privacy.allowed('functional'), completed = new Set();
    const eraseRevision = () => { const value = privacy.choice()?.optionalErasedAt; return Number.isSafeInteger(value) && value > 0 ? value : 0; };
    let erasedAt = eraseRevision();
    const words = (he, en) => getLanguage() === 'he' ? he : en;
    function decode(raw) {
      if (typeof raw !== 'string' || raw.length > 20000) return new Set();
      try {
        const data = JSON.parse(raw);
        if (!data || data.version !== 1 || !Array.isArray(data.completed) || data.completed.length > ordered.length) return new Set();
        return new Set(data.completed.filter(id => typeof id === 'string' && valid.has(id)));
      } catch { return new Set(); }
    }
    const readSaved = () => {
      if (!privacy.allowed('functional')) return new Set();
      const fresh = privacy.readFreshOptional(KEY);
      return fresh.available ? decode(fresh.value) : new Set(completed);
    };
    const ids = () => ordered.filter(id => completed.has(id));
    const applyPending = () => { for (const [id, done] of pending) done ? completed.add(id) : completed.delete(id); };
    const save = () => {
      if (privacy.allowed('functional') && privacy.save(KEY, JSON.stringify({version:1, completed:ids()}))) pending.clear();
    };
    completed = readSaved();
    function syncPrivacy() {
      const next = privacy.allowed('functional'), revision = eraseRevision();
      if (revision > erasedAt) { completed.clear(); pending.clear(); erasedAt = revision; if (next) completed = readSaved(); }
      if (next === functional) return;
      functional = next;
      if (!next) { completed.clear(); pending.clear(); return; }
      // Do not inspect old device data until consent. Merge explicit session choices only after granting it.
      completed = readSaved();
      applyPending();
      if (pending.size) save();
    }
    function snapshot() {
      syncPrivacy();
      return {completed:ids(), count:completed.size, total:ordered.length, functional};
    }
    function set(id, done) {
      if (!valid.has(id)) return false;
      privacy.refresh();
      syncPrivacy();
      // A tab's remembered set can be stale. Apply this one intent to the latest consented device state.
      if (functional) { completed = readSaved(); applyPending(); }
      const changed = completed.has(id) !== done;
      done ? completed.add(id) : completed.delete(id);
      // Keep intents separate from inaccessible device data, including an undo before granting consent.
      if (changed || !functional) pending.set(id, done);
      if (functional && pending.size) save();
      return changed;
    }
    function countText() { return words(`${completed.size} מתוך ${ordered.length} פרקים סומנו כנקראו`, `${completed.size} of ${ordered.length} chapters marked read`); }
    function storageText() {
      return functional
        ? words('הסימונים נשמרים במכשיר הזה באישור זכירת העדפות, אם הדפדפן מאפשר שמירה.', 'Marks are saved on this device with remembering permission, if browser storage is available.')
        : words('ללא אישור זכירה, הסימונים נעלמים ברענון או בסגירת העמוד.', 'Without remembering permission, marks disappear on reload or close.');
    }
    function progressHTML() {
      syncPrivacy();
      return `<section class="chapter-progress" aria-labelledby="chapter-progress-title"><div class="chapter-progress-heading"><h3 id="chapter-progress-title">${words('ההתקדמות שלי בקריאה','My reading progress')}</h3><p data-completion-count>${escape(countText())}</p></div><progress data-completion-progress max="${ordered.length}" value="${completed.size}" aria-labelledby="chapter-progress-title" aria-valuetext="${escape(countText())}">${completed.size} / ${ordered.length}</progress><p class="chapter-progress-explanation">${words('נספרים רק פרקים שסימנתם כנקראו.','Only chapters you mark read count.')}</p><div class="chapter-progress-storage"><p id="chapter-completion-storage">${storageText()}</p><button type="button" class="text-button" data-action="privacy-open">${words('הגדרות פרטיות','Privacy settings')}</button></div><div class="sr-only" data-completion-status role="status" aria-live="polite" aria-atomic="true"></div></section>`;
    }
    function chapterHTML(id) {
      syncPrivacy();
      if (!valid.has(id)) return '';
      const done = completed.has(id), safe = escape(id);
      return `<div class="chapter-completion" data-chapter-completion="${safe}"><button type="button" class="btn secondary chapter-completion-mark" data-completion-mark="${safe}"${done?' hidden':''}>${words('סיימתי את הפרק','Mark chapter read')}</button><span class="chapter-completion-label" data-completion-label${done?'':' hidden'}>${words('הפרק סומן כנקרא','Chapter marked read')}</span><button type="button" class="text-button" data-completion-undo="${safe}"${done?'':' hidden'}>${words('ביטול הסימון','Undo')}</button></div>`;
    }
    function updateDOM(message = '') {
      syncPrivacy();
      for (const group of document?.querySelectorAll?.('[data-chapter-completion]') || []) {
        const done = completed.has(group.dataset.chapterCompletion);
        const mark = group.querySelector('[data-completion-mark]'), undo = group.querySelector('[data-completion-undo]'), label = group.querySelector('[data-completion-label]');
        if (mark) mark.hidden = done;
        if (undo) undo.hidden = !done;
        if (label) label.hidden = !done;
      }
      for (const node of document?.querySelectorAll?.('[data-completion-count]') || []) node.textContent = countText();
      for (const node of document?.querySelectorAll?.('[data-completion-progress]') || []) { node.value = completed.size; node.textContent = `${completed.size} / ${ordered.length}`; node.setAttribute('aria-valuetext', countText()); }
      const note = document?.getElementById?.('chapter-completion-storage');
      if (note) note.textContent = storageText();
      if (message) { const live = document?.querySelector?.('[data-completion-status]'); if (live) live.textContent = message + ' ' + countText(); }
    }
    function handleClick(event) {
      const button = event.target?.closest?.('[data-completion-mark],[data-completion-undo]');
      if (!button) return false;
      event.preventDefault();
      if (button.hidden || button.disabled) return true;
      const mark = button.hasAttribute('data-completion-mark'), id = mark ? button.dataset.completionMark : button.dataset.completionUndo;
      if (!valid.has(id)) return true;
      const changed = set(id, mark);
      updateDOM(changed ? (mark ? words('הפרק סומן כנקרא.','Chapter marked read.') : words('סימון הפרק בוטל.','Chapter mark removed.')) : '');
      document?.querySelector?.(`[data-chapter-completion="${id}"]`)?.querySelector?.(mark ? '[data-completion-undo]' : '[data-completion-mark]')?.focus({preventScroll:true});
      return true;
    }
    function clear() { completed.clear(); pending.clear(); functional = privacy.allowed('functional'); erasedAt = eraseRevision(); }
    window.addEventListener?.('storage', event => {
      if (event.key !== KEY && event.key !== null) return;
      privacy.refresh();
      syncPrivacy();
      if (event.newValue === null || event.key === null) { completed.clear(); pending.clear(); }
      else if (privacy.allowed('functional')) { completed = readSaved(); applyPending(); }
      // Never parse an optional storage event's payload while remembering is off.
      updateDOM();
    });
    return {snapshot, mark:id => set(id,true), undo:id => set(id,false), progressHTML, chapterHTML, handleClick, syncPrivacy, clear};
  }
  window.ChapterCompletion = Object.freeze({key:KEY, create});
})();
