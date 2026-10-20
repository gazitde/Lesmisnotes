'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.SEARCH_TEST_URL || 'http://localhost:8873';
const dir = process.env.SEARCH_ARTIFACT_DIR || 'test-results';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] });
  let checks = 0;
  const check = (value, message) => { assert.ok(value, message); checks++; };
  const equal = (value, expected, message) => { assert.equal(value, expected, message); checks++; };
  fs.mkdirSync(dir, { recursive: true });
  const chapterReady = page => page.locator('#reading-book-panel[data-reader-ready="true"]').waitFor();
  const focus = page => new URL(page.url()).searchParams.get('focus');

  async function context(width, touch = true) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: touch, hasTouch: touch, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    // No external playback or network is required to check shared-player identity.
    await context.addInitScript(() => {
      window.YT = { PlayerState: { PLAYING: 1 }, Player: function (frame, options) {
        this.pauseVideo = () => {}; this.destroy = () => frame.remove();
        queueMicrotask(() => options.events.onReady({ target: this }));
      } };
    });
    return context;
  }

  async function swipe(page, cdp, locator, dx, dy = 0) {
    await locator.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    const box = await locator.boundingBox();
    assert.ok(box, 'Swipe target is displayed');
    const viewport = page.viewportSize();
    const x = Math.max(40, Math.min(viewport.width - 40, box.x + box.width / 2));
    const y = Math.max(100, Math.min(viewport.height - 150, box.y + Math.min(box.height / 2, 30)));
    const point = (x, y) => ({ x, y, radiusX: 4, radiusY: 4, force: 1, id: 1 });
    // Real browser touch input exercises touch-action, pointer cancellation and scrolling.
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(x, y)] });
    for (let step = 1; step <= 5; step++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(x + dx * step / 5, y + dy * step / 5)] });
      await page.waitForTimeout(20);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }

  try {
    for (const lang of ['en', 'he']) for (const width of [390, 320]) {
      const c = await context(width), page = await c.newPage(), cdp = await c.newCDPSession(page), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const next = lang === 'he' ? 100 : -100;
      const one = 'p1-b1-c1', two = 'p1-b1-c2';
      await page.goto(`${base}/${lang}/novel-journey/?focus=chapter%3A${one}`);
      await chapterReady(page);
      await page.locator('[data-action="privacy-reject"]').first().click();
      await chapterReady(page);
      const initialSpoilers = await page.evaluate(() => sessionStorage.getItem('barricade-spoilers'));
      equal(await page.locator(`#reader-chapter-${one}`).evaluate(e => getComputedStyle(e).touchAction), 'pan-y pinch-zoom', 'Vertical pan and zoom remain native');
      await swipe(page, cdp, page.locator(`#reader-chapter-${one} .chapter-reading-head`), next);
      await page.waitForURL(url => url.searchParams.get('focus') === 'chapter:' + two);
      await chapterReady(page);
      equal(focus(page), 'chapter:' + two, 'A real touch swipe opens the next canonical chapter');
      check(await page.locator(`#reader-chapter-${two}`).evaluate(e => document.activeElement === e), 'New chapter receives focus');
      equal(await page.locator('[data-completion-progress]').evaluate(e => e.value), 0, 'Swiping never marks a chapter read');
      equal(await page.evaluate(() => sessionStorage.getItem('barricade-spoilers')), initialSpoilers, 'Swiping keeps spoiler consent unchanged');
      equal(await page.locator('[data-novel-event]').count(), 0, 'Swiping does not open the full recap');
      await page.goBack(); await chapterReady(page);
      equal(focus(page), 'chapter:' + one, 'Back returns to the pre-swipe chapter');
      await swipe(page, cdp, page.locator(`#reader-chapter-${one} .chapter-reading-head`), -next);
      equal(focus(page), 'chapter:' + one, 'The first chapter does not wrap backwards');
      await swipe(page, cdp, page.locator(`#reader-chapter-${one} .chapter-reading-head`), next / 3);
      equal(focus(page), 'chapter:' + one, 'A short accidental drag does not navigate');
      await swipe(page, cdp, page.locator(`#reader-chapter-${one} .chapter-reading-head`), 5, -100);
      equal(focus(page), 'chapter:' + one, 'A vertical reading gesture does not navigate');
      await swipe(page, cdp, page.locator(`#reader-chapter-${one} .slide-next`), next);
      equal(focus(page), 'chapter:' + one, 'Swiping on a real chapter link does not hijack it');
      await page.locator(`#reader-chapter-${one} .slide-next`).focus();
      await page.keyboard.press('Enter'); await chapterReady(page);
      equal(focus(page), 'chapter:' + two, 'Next chapter remains keyboard accessible');
      for (const link of await page.locator(`#reader-chapter-${two} .chapter-slide-nav a`).all()) {
        const box = await link.boundingBox();
        check(box.height >= 44, 'Chapter navigation keeps a 44px touch target');
      }
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Chapter navigation fits narrow RTL/LTR screens');
      await page.locator(`#reader-chapter-${two} .chapter-slide-nav`).screenshot({ path: path.join(dir, `swipe-chapter-nav-${lang}-${width}.png`) });

      const crossing = await page.evaluate(() => {
        const chapters = window.EXTRA_CONTENT.chapterCompanion.chapters;
        const index = chapters.findIndex((chapter, i) => chapters[i + 1]?.bookId !== chapter.bookId);
        return { from: chapters[index].id, to: chapters[index + 1].id, book: chapters[index + 1].bookId };
      });
      await page.goto(`${base}/${lang}/novel-journey/?focus=chapter%3A${crossing.from}`); await chapterReady(page);
      await swipe(page, cdp, page.locator(`#reader-chapter-${crossing.from} .chapter-reading-head`), next);
      await page.waitForURL(url => url.searchParams.get('focus') === 'chapter:' + crossing.to); await chapterReady(page);
      equal(await page.locator('#reading-book-panel').getAttribute('data-book-id'), crossing.book, 'Next chapter crosses the Book boundary');

      await page.goto(`${base}/${lang}/musical-journey/?focus=song%3Awork-song&view=journey&watch=sameProduction`);
      await page.locator('[data-action="show-open"]').click();
      equal(await page.locator('[data-show-select]').inputValue(), '0', 'Journey begins at its first stop');
      const frame = await page.locator('#show-watch-stop iframe').elementHandle();
      await swipe(page, cdp, page.locator('#show-current-title'), next);
      equal(await page.locator('[data-show-select]').inputValue(), '1', 'A real touch swipe advances one scene');
      equal(new URL(page.url()).searchParams.get('watch'), 'sameProduction', 'Scene swipe retains the selected production');
      check(await frame.evaluate(e => e.isConnected), 'Adjacent scenes keep their shared player connected');
      check(await page.locator('#show-watch-stop iframe').evaluate((element, prior) => element === prior, frame), 'Swipe retains the exact shared iframe');
      check(await page.locator('#show-current-title').evaluate(e => document.activeElement === e), 'The new scene title receives focus');
      equal(await page.locator('#toast.visible').count(), 0, 'Scene navigation does not obscure content with a toast');
      await page.goBack();
      equal(await page.locator('[data-show-select]').inputValue(), '0', 'Back returns to the pre-swipe scene');
      await swipe(page, cdp, page.locator('#show-current-title'), -next);
      equal(await page.locator('[data-show-select]').inputValue(), '0', 'The first scene does not wrap backwards');
      await page.locator('.show-station-nav [data-show-move="next"]').focus();
      await page.keyboard.press('Enter');
      equal(await page.locator('[data-show-select]').inputValue(), '1', 'Existing scene buttons still work with the keyboard');
      await page.locator('[data-show-select]').selectOption('19');
      await swipe(page, cdp, page.locator('#show-current-title'), next);
      equal(await page.locator('.interval-slide').count(), 1, 'Swipe reaches the existing interval in order');
      await swipe(page, cdp, page.locator('#show-current-title'), next);
      equal(await page.locator('[data-show-select]').inputValue(), '21', 'Swipe continues from the interval into Act II');
      const last = await page.locator('[data-show-select] option').last().getAttribute('value');
      await page.locator('[data-show-select]').selectOption(last);
      await swipe(page, cdp, page.locator('#show-current-title'), next);
      equal(await page.locator('[data-show-select]').inputValue(), last, 'The last scene does not wrap');
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Scene navigation fits narrow RTL/LTR screens');
      await page.locator('.show-station-nav').screenshot({ path: path.join(dir, `swipe-scene-nav-${lang}-${width}.png`) });
      assert.deepEqual(errors, [], 'No runtime errors while swiping or traversing history'); checks++;
      await c.close();
    }

    // Desktop text dragging must never turn into a navigation gesture.
    const c = await context(1365, false), page = await c.newPage();
    await page.goto(base + '/en/novel-journey/?focus=chapter%3Ap1-b1-c1'); await chapterReady(page);
    const title = page.locator('#reader-title-p1-b1-c1');
    await title.scrollIntoViewIfNeeded();
    const box = await title.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 100, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    equal(focus(page), 'chapter:p1-b1-c1', 'Desktop mouse dragging does not navigate');
    await c.close();
  } finally {
    await browser.close();
  }
  console.log(`PASS: ${checks} swipe checks with real CDP touch input, HE/EN at 320/390px, chapter/scene order, boundaries, history, keyboard, consent, iframe continuity and desktop dragging.`);
})().catch(error => { console.error(error); process.exit(1); });
