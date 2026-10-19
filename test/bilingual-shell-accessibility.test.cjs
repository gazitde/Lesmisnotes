'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function htmlFiles(dir) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? htmlFiles(file) : entry.name.endsWith('.html') ? [file] : [];
  });
}

test('bilingual skip links declare each phrase language and direction in every published shell', () => {
  const files = htmlFiles('public-dist').filter(file => path.basename(file) !== '404.html');
  assert.ok(files.length >= 90, 'canonical pages, reading shells and root are included');
  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    const skip = html.match(/<a class="skip" href="#main">([\s\S]*?)<\/a>/)?.[1];
    assert.ok(skip, file + ': keyboard skip link exists');
    assert.match(skip, /<span lang="he" dir="rtl">דלגו לתוכן<\/span>/, file);
    assert.match(skip, /<span lang="en" dir="ltr">Skip to content<\/span>/, file);
    assert.match(html, /<main id="main" class="main" tabindex="-1">/, file + ': skip target remains focusable');
  }
});

test('the shared real-404 page labels English recovery copy and navigation', () => {
  const html = fs.readFileSync('public-dist/404.html', 'utf8');
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /<span lang="en" dir="ltr">Page not found\.<\/span>/);
  assert.match(html, /<span lang="en" dir="ltr">You can return to the site map\.<\/span>/);
  assert.match(html, /href="\/en\/sitemap\/" lang="en" dir="ltr">Site map<\/a>/);
  assert.equal((html.match(/<h1>/g) || []).length, 1);
});
