'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const changes = require('../docs/editorial-refresh-20261025.json');
const { beforeEditorialRefresh } = require('./helpers/editorial-refresh-baseline.cjs');
const c = { window: {} };
for (const name of ['research', 'extras']) vm.runInNewContext(fs.readFileSync(`dist/${name}.js`, 'utf8'), c);
const data = JSON.parse(JSON.stringify({ research: c.window.RESEARCH, extras: c.window.EXTRA_CONTENT }));
const get = (o, path) => path.split('.').reduce((value, key) => value[key], o);

test('the new editorial manifest matches all 12 paired passages exactly', () => {
  assert.equal(changes.length, 12);
  assert.equal(new Set(changes.map(x => `${x.kind}.${x.path}`)).size, 12);
  for (const change of changes) {
    assert.deepEqual(get(data[change.kind], change.path), change.after);
    assert.deepEqual(Object.keys(change.after).sort(), ['en', 'he']);
    for (const lang of ['he', 'en']) {
      assert.ok(change.after[lang].trim());
      assert.notEqual(change.after[lang], change.before[lang]);
      assert.equal(change.after[lang].includes('<'), false, 'Plain prose, not markup');
    }
  }
});

test('the manifest is confined to the agreed introductions and context prose', () => {
  assert.equal(changes.filter(x => x.kind === 'research').length, 7);
  const allowedResearch = new Set([0, 1, 2, 3, 7, 8, 9].map(i => `characters.${i}.safeIntro`));
  const allowedExtras = new Set([
    'hugo.sections.0.body', 'musical.creationStory.craft.0.body',
    ...['first-attack', 'second-attack', 'who-am-i'].map(id => `musical.songAnalysis.${id}.blocks.0.body`)
  ]);
  for (const change of changes) {
    if (change.kind === 'research') assert(allowedResearch.has(change.path));
    else { assert.equal(change.kind, 'extras'); assert(allowedExtras.has(change.path)); }
  }
  for (const character of data.research.characters) {
    for (const lang of ['he', 'en']) assert(character.safeIntro[lang].split(/\s+/).length <= 65, character.id);
  }
});

test('historical normalization rejects unreviewed changes to the new prose', () => {
  for (const kind of ['research', 'extras']) {
    const altered = structuredClone(data[kind]);
    const change = changes.find(x => x.kind === kind);
    get(altered, change.path).he += ' unreviewed';
    assert.throws(() => beforeEditorialRefresh(altered, kind), /Reviewed October 25 prose/);
  }
});

test('historical normalization restores only manifest paths and never hides question changes', () => {
  for (const kind of ['research', 'extras']) {
    const expected = structuredClone(data[kind]);
    for (const change of changes.filter(x => x.kind === kind)) {
      const keys = change.path.split('.');
      const owner = keys.slice(0, -1).reduce((o, k) => o[k], expected);
      owner[keys.at(-1)] = change.before;
    }
    assert.deepEqual(beforeEditorialRefresh(data[kind], kind), expected);
  }
  const altered = structuredClone(data.extras);
  altered.musical.songentries[0].question.he += ' unreviewed';
  assert.equal(beforeEditorialRefresh(altered, 'extras').musical.songentries[0].question.he,
    altered.musical.songentries[0].question.he);
});
