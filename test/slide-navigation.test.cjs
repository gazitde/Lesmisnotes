'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../dist/slide-navigation.js'), 'utf8');

// Exercise the shipped event handlers, with a clock and a small DOM boundary.
// Actual touch dispatch, layout and application routing live in the browser suite.
function harness({ pointer = true, rtl = false, reducedMotion = false } = {}) {
  const listeners = new Map(), windowListeners = new Map(), moves = [], registrations = [];
  let clock = 1000, selection = '', dialog = null;
  const surface = { dataset: { slideSurface: 'chapter', chapterId: 'p1-b1-c1' }, isConnected: true };
  const target = { closest: selector => selector === '[data-slide-surface]' ? surface : null };
  const document = {
    documentElement: { clientWidth: 390, dir: rtl ? 'rtl' : 'ltr' },
    getSelection: () => ({ toString: () => selection }),
    querySelector: selector => selector === 'dialog[open]' ? dialog : null,
    addEventListener(name, fn, options) {
      registrations.push({ name, options });
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(fn);
    }
  };
  const window = {
    document, location: { href: 'https://example.test/en/novel/?focus=chapter%3Ap1-b1-c1' },
    matchMedia: () => ({ matches: reducedMotion }),
    addEventListener: (name, fn) => windowListeners.set(name, fn)
  };
  if (pointer) window.PointerEvent = function PointerEvent() {};
  vm.runInNewContext(source, { window, Date: { now: () => clock } });
  window.SlideNavigation.install({ document, onMove: (node, step) => moves.push({ node, step }) });
  function emit(name, options = {}) {
    const event = {
      target, pointerType: 'touch', pointerId: 1, isPrimary: true,
      clientX: 200, clientY: 200, preventDefault() { throw new Error('Native scrolling must not be prevented'); },
      ...options
    };
    for (const fn of listeners.get(name) || []) fn(event);
    return event;
  }
  function swipe(dx, dy = 0, options = {}) {
    emit('pointerdown', options);
    clock += 100;
    emit('pointermove', { ...options, clientX: 200 + dx, clientY: 200 + dy });
    emit('pointerup', { ...options, clientX: 200 + dx, clientY: 200 + dy });
  }
  return { api: window.SlideNavigation, window, document, surface, target, moves, registrations, emit, swipe,
    advance: ms => { clock += ms; }, select: text => { selection = text; },
    openDialog: () => { dialog = {}; }, windowEvent: name => windowListeners.get(name)?.() };
}

for (const rtl of [false, true]) {
  test(`horizontal direction follows ${rtl ? 'RTL' : 'LTR'} reading order`, () => {
    const { api } = harness();
    const next = rtl ? 1 : -1;
    assert.equal(api.direction(next * 64, 0, 700, rtl), 'next');
    assert.equal(api.direction(-next * 64, 0, 700, rtl), 'prev');
    assert.equal(api.direction(next * 80, 40, 100, rtl), 'next');
    for (const [dx, dy, elapsed] of [[next * 63, 0, 100], [next * 80, 41, 100], [0, 120, 100], [next * 100, 0, 701]]) {
      assert.equal(api.direction(dx, dy, elapsed, rtl), null);
    }
    const h = harness({ rtl });
    h.swipe(next * 100);
    assert.deepEqual(h.moves, [{ node: h.surface, step: 'next' }]);
    h.swipe(-next * 100);
    assert.equal(h.moves[1].step, 'prev');
  });
}

test('one horizontal gesture navigates once and all touch listeners remain passive', () => {
  const h = harness();
  h.swipe(-110, 10);
  h.emit('pointerup', { clientX: 90, clientY: 210 });
  assert.equal(h.moves.length, 1);
  for (const { name, options } of h.registrations.filter(x => x.name.startsWith('pointer'))) {
    assert.equal(options.passive, true, name);
  }
});

test('invalid coordinates and elapsed times are rejected', () => {
  const { api } = harness();
  for (const [dx, dy, elapsed] of [[NaN, 0, 100], [Infinity, 0, 100], [-100, NaN, 100], [-100, 0, -1], [-100, 0, Infinity]]) {
    assert.equal(api.direction(dx, dy, elapsed, false), null);
  }
});

test('vertical intent stays native even if the gesture later turns sideways', () => {
  const h = harness();
  h.emit('pointerdown');
  h.emit('pointermove', { clientX: 205, clientY: 220 });
  h.emit('pointermove', { clientX: 80, clientY: 220 });
  h.emit('pointerup', { clientX: 80, clientY: 220 });
  h.swipe(-90, 90);
  assert.equal(h.moves.length, 0);
});

test('small movement, a slow gesture and mouse dragging do not navigate', () => {
  const h = harness();
  h.swipe(-40);
  h.emit('pointerdown'); h.advance(701); h.emit('pointerup', { clientX: 80 });
  h.swipe(-100, 0, { pointerType: 'mouse' });
  assert.equal(h.moves.length, 0);
  h.swipe(-100, 0, { pointerType: 'pen' });
  assert.equal(h.moves.length, 1, 'A deliberate pen gesture is supported');
});

test('browser edge gestures and content outside a swipe surface are ignored', () => {
  const h = harness();
  for (const clientX of [0, 31, 359, 389]) {
    h.emit('pointerdown', { clientX });
    h.emit('pointerup', { clientX: clientX < 32 ? clientX + 100 : clientX - 100 });
  }
  h.swipe(-100, 0, { target: { closest: () => null } });
  assert.equal(h.moves.length, 0);
});

test('links, form controls, media, disclosures and opt-out regions keep their own gestures', () => {
  for (const selector of ['a', 'button', 'input', 'select', 'textarea', 'label', 'summary', 'details', 'iframe', 'video', 'audio', '[contenteditable]:not([contenteditable="false"])', '[role="button"]', '[role="slider"]', '[data-no-swipe]']) {
    const h = harness();
    const target = { closest: query => query === '[data-slide-surface]' ? h.surface : query.split(',').includes(selector) ? target : null };
    h.swipe(-100, 0, { target });
    assert.equal(h.moves.length, 0, selector);
  }
});

test('selection before or during a swipe and an already open dialog block navigation', () => {
  const h = harness();
  h.select('Selected chapter prose'); h.swipe(-100); h.select('');
  h.emit('pointerdown'); h.select('New selection'); h.emit('selectionchange'); h.select('');
  h.emit('pointerup', { clientX: 80 });
  h.openDialog(); h.swipe(-100);
  assert.equal(h.moves.length, 0);
});

test('cancel, multiple pointers, blur, history and disconnected/replaced surfaces invalidate a gesture', () => {
  const interruptions = [
    h => h.emit('pointercancel'),
    h => h.emit('pointerdown', { pointerId: 2, isPrimary: false }),
    h => h.windowEvent('blur'),
    h => h.windowEvent('popstate'),
    h => h.openDialog(),
    h => { h.surface.isConnected = false; },
    h => { h.window.location.href = 'https://example.test/en/home/'; }
  ];
  for (const interrupt of interruptions) {
    const h = harness(); h.emit('pointerdown'); interrupt(h); h.emit('pointerup', { clientX: 80 });
    assert.equal(h.moves.length, 0);
  }
});

test('unrelated pointer movement cannot complete the active gesture', () => {
  const h = harness();
  h.emit('pointerdown', { pointerId: 1 });
  h.emit('pointermove', { pointerId: 2, clientX: 80 });
  h.emit('pointerup', { pointerId: 2, clientX: 80 });
  assert.equal(h.moves.length, 0);
});

test('the touch-event fallback supports a swipe and cancels pinch/multi-touch', () => {
  const h = harness({ pointer: false });
  const point = (x, identifier = 4) => ({ clientX: x, clientY: 200, identifier });
  h.emit('touchstart', { touches: [point(200)] });
  h.emit('touchmove', { touches: [point(100)] });
  h.emit('touchend', { changedTouches: [point(100)] });
  assert.deepEqual(h.moves, [{ node: h.surface, step: 'next' }]);
  for (const interruption of ['touchstart', 'touchmove']) {
    h.emit('touchstart', { touches: [point(200)] });
    h.emit(interruption, { touches: [point(200), point(240, 5)] });
    h.emit('touchend', { changedTouches: [point(100)] });
  }
  h.emit('touchstart', { touches: [point(200)] }); h.emit('touchcancel');
  h.emit('touchend', { changedTouches: [point(100)] });
  assert.equal(h.moves.length, 1);
  for (const { name, options } of h.registrations.filter(x => x.name.startsWith('touch'))) {
    assert.equal(options.passive, true, name);
  }
});

test('animation mirrors reading direction and respects reduced motion', () => {
  const calls = [], element = { animate: (...args) => calls.push(args) };
  const h = harness();
  for (const rtl of [false, true]) for (const step of ['next', 'prev']) {
    h.api.animate(element, step, rtl);
    const offset = (step === 'next' ? 1 : -1) * (rtl ? -1 : 1) * 18;
    assert.equal(calls.at(-1)[0][0].transform, `translateX(${offset}px)`);
    assert.equal(calls.at(-1)[0][1].transform, 'translateX(0)');
    assert.equal(calls.at(-1)[1].duration, 180);
  }
  harness({ reducedMotion: true }).api.animate(element, 'next', false);
  h.api.animate(null, 'next', false);
  h.api.animate({}, 'next', false);
  assert.equal(calls.length, 4);
});
