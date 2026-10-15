/* Deliberate, one-finger navigation. Scrolling, zooming and interactive content stay native. */
(function (root) {
  'use strict';
  const surfaceSelector = '[data-slide-surface]';
  const interactiveSelector = 'a,button,input,select,textarea,label,summary,details,iframe,video,audio,[contenteditable]:not([contenteditable="false"]),[role="button"],[role="slider"],[data-no-swipe]';
  function direction(dx, dy, elapsed, rtl) {
    if (![dx, dy, elapsed].every(Number.isFinite) || elapsed < 0 || elapsed > 700 || Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 2) return null;
    return (rtl ? dx > 0 : dx < 0) ? 'next' : 'prev';
  }
  function install({ document: doc = root.document, onMove }) {
    let gesture = null;
    const selected = () => !!doc.getSelection?.()?.toString();
    const cancel = () => { gesture = null; };
    function start(e, point, id) {
      const target = e.target;
      const surface = target.closest?.(surfaceSelector);
      const viewport = doc.documentElement.clientWidth;
      if (!surface || target.closest(interactiveSelector) || selected() || doc.querySelector('dialog[open]') || point.clientX < 32 || point.clientX > viewport - 32) return cancel();
      gesture = { surface, id, x: point.clientX, y: point.clientY, time: Date.now(), rtl: doc.documentElement.dir === 'rtl', href: root.location?.href };
    }
    function move(point) {
      if (!gesture) return;
      const dx = Math.abs(point.clientX - gesture.x), dy = Math.abs(point.clientY - gesture.y);
      // Lock out a vertical intention even if the finger later turns sideways.
      if (dy > 12 && dy >= dx || selected()) cancel();
    }
    function end(point, id) {
      const g = gesture;
      cancel();
      if (!g || g.id !== id || !g.surface.isConnected || selected() || doc.querySelector('dialog[open]') || g.href !== root.location?.href) return;
      const step = direction(point.clientX - g.x, point.clientY - g.y, Date.now() - g.time, g.rtl);
      if (step) onMove(g.surface, step);
    }
    if (root.PointerEvent) {
      doc.addEventListener('pointerdown', e => {
        if (!e.isPrimary) return cancel();
        if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
        start(e, e, e.pointerId);
      }, { passive: true });
      doc.addEventListener('pointermove', e => { if (gesture?.id === e.pointerId) move(e); }, { passive: true });
      doc.addEventListener('pointerup', e => end(e, e.pointerId), { passive: true });
      doc.addEventListener('pointercancel', cancel, { passive: true });
    } else {
      doc.addEventListener('touchstart', e => { if (e.touches.length !== 1) return cancel(); start(e, e.touches[0], e.touches[0].identifier); }, { passive: true });
      doc.addEventListener('touchmove', e => { if (e.touches.length !== 1) return cancel(); move(e.touches[0]); }, { passive: true });
      doc.addEventListener('touchend', e => { if (e.changedTouches.length === 1) end(e.changedTouches[0], e.changedTouches[0].identifier); else cancel(); }, { passive: true });
      doc.addEventListener('touchcancel', cancel, { passive: true });
    }
    doc.addEventListener('selectionchange', () => { if (selected()) cancel(); });
    root.addEventListener?.('blur', cancel);
    root.addEventListener?.('popstate', cancel);
  }
  function animate(element, step, rtl) {
    if (!element?.animate || root.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const offset = (step === 'next' ? 1 : -1) * (rtl ? -1 : 1) * 18;
    element.animate([{ transform: `translateX(${offset}px)`, opacity: .75 }, { transform: 'translateX(0)', opacity: 1 }], { duration: 180, easing: 'ease-out' });
  }
  root.SlideNavigation = { direction, install, animate };
})(typeof window === 'undefined' ? globalThis : window);
