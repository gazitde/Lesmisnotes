'use strict';
const assert = require('node:assert/strict');
const changes = require('../../docs/editorial-refresh-20261025.json');

// Retain the historic full-content checks. Restore only the reviewed prose,
// after checking its exact new value; no keys, URLs or questions are ignored.
exports.beforeEditorialRefresh = (input, kind) => {
  const copy = JSON.parse(JSON.stringify(input));
  for (const change of changes.filter(x => x.kind === kind)) {
    const keys = change.path.split('.');
    const owner = keys.slice(0, -1).reduce((o, k) => o[k], copy);
    const key = keys.at(-1);
    assert.deepEqual(owner[key], change.after, `Reviewed October 25 prose: ${kind}.${change.path}`);
    owner[key] = JSON.parse(JSON.stringify(change.before));
  }
  return copy;
};
