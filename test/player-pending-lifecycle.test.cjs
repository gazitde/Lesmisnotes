'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

// Exercise the actual application helpers with controllable API callbacks.
// No browser, network request, iframe playback, or copied lifecycle code is used.
const source = fs.readFileSync(path.join(__dirname, '../dist/app.js'), 'utf8');
const start = source.indexOf('const players = new Map();');
const end = source.indexOf('function playerFrame(', start);
assert.ok(start >= 0 && end > start, 'Application player-helper boundaries exist');
const lifecycleSource = source.slice(start, end);

function harness() {
  const nodes = new Map();
  const shells = new Set();
  const constructed = [];
  const tracked = [];
  const YT = {
    PlayerState: { PLAYING: 1 },
    Player: function Player(frame, options) {
      this.frame = frame;
      this.options = options;
      this.destroyCalls = 0;
      this.pauseCalls = 0;
      this.destroy = () => {
        this.destroyCalls++;
        frame.isConnected = false;
      };
      this.pauseVideo = () => { this.pauseCalls++; };
      this.ready = () => options.events.onReady({ target: this });
      this.play = () => options.events.onStateChange({ target: this, data: 1 });
      this.error = () => options.events.onError({ target: this, data: 150 });
      constructed.push(this);
    }
  };
  const context = {
    window: { YT, location: { origin: 'https://example.test' } },
    document: {
      getElementById: id => nodes.get(id),
      querySelectorAll: selector => {
        assert.equal(selector, '[data-video-shell]');
        return [...shells].filter(shell => shell.frame.isConnected);
      }
    },
    videos: [
      { id: 'primary', title: 'Primary', channel: 'Publisher' },
      { id: 'alternative', title: 'Alternative', channel: 'Publisher' }
    ],
    t: (he, en) => en,
    A: { track: (...args) => { tracked.push(args); return true; } },
    setTimeout,
    clearTimeout
  };
  vm.createContext(context);
  vm.runInContext(lifecycleSource + '\n' +
    'globalThis.lifecycle = { mountPlayers, clearPlayers, players, playerFrames };', context);

  function add(id, instance) {
    const frame = { isConnected: true, src: 'https://example.test/existing-frame' };
    const status = { textContent: '' };
    const shell = {
      frame,
      dataset: { videoShell: id, videoInstance: instance },
      querySelector: selector => {
        assert.equal(selector, 'iframe');
        return frame;
      }
    };
    shells.add(shell);
    nodes.set('video-' + instance, shell);
    nodes.set('video-status-' + instance, status);
    return {
      frame,
      status,
      remove() {
        frame.isConnected = false;
        shells.delete(shell);
        // Do not accidentally remove a later replacement with the same instance.
        if (nodes.get('video-' + instance) === shell) {
          nodes.delete('video-' + instance);
          nodes.delete('video-status-' + instance);
        }
      }
    };
  }

  return { ...context.lifecycle, add, constructed, tracked };
}

for (const readyBeforeClose of [false, true]) {
  test('closing ' + (readyBeforeClose ? 'ready' : 'pending') +
    ' alternative destroys its API object and preserves the primary', async () => {
    const h = harness();
    const primary = h.add('primary', 'journey-primary');
    const alternative = h.add('alternative', 'alternative-stop-clip');
    await h.mountPlayers();
    const [primaryPlayer, alternativePlayer] = h.constructed;
    primaryPlayer.ready();
    if (readyBeforeClose) alternativePlayer.ready();
    assert.equal(h.players.get('alternative-stop-clip'), alternativePlayer,
      'The API object is tracked even before onReady');

    alternative.remove();
    await h.mountPlayers();
    assert.equal(alternativePlayer.destroyCalls, 1);
    assert.equal(h.players.has('alternative-stop-clip'), false);
    assert.equal(h.playerFrames.has('alternative-stop-clip'), false);
    assert.equal(primaryPlayer.destroyCalls, 0);
    assert.equal(primary.frame.isConnected, true);
    assert.equal(h.players.get('journey-primary'), primaryPlayer);
    assert.equal(h.constructed.length, 2, 'Remounting does not recreate the primary');

    alternativePlayer.ready();
    assert.equal(h.players.has('alternative-stop-clip'), false,
      'A stale onReady cannot register the removed alternative again');
  });
}

test('rapid close/reopen with the same instance ID ignores stale callbacks', async () => {
  const h = harness();
  const primary = h.add('primary', 'journey-primary');
  const previous = h.add('alternative', 'alternative-stop-clip');
  await h.mountPlayers();
  const [primaryPlayer, previousPlayer] = h.constructed;
  primaryPlayer.ready();
  previous.remove();
  const replacement = h.add('alternative', 'alternative-stop-clip');
  await h.mountPlayers();
  const replacementPlayer = h.constructed[2];
  assert.equal(previousPlayer.destroyCalls, 1);
  assert.equal(h.players.get('alternative-stop-clip'), replacementPlayer);
  replacementPlayer.ready();

  previousPlayer.ready();
  previousPlayer.error();
  previousPlayer.play();
  assert.equal(h.players.get('alternative-stop-clip'), replacementPlayer);
  assert.equal(h.playerFrames.get('alternative-stop-clip'), replacement.frame);
  assert.equal(replacementPlayer.destroyCalls, 0);
  assert.equal(replacement.frame.isConnected, true);
  assert.equal(replacement.status.textContent, '');
  assert.equal(primaryPlayer.pauseCalls, 0, 'Stale playback must not pause the primary');
  assert.equal(h.tracked.length, 0, 'Stale playback must not emit analytics');
  assert.equal(primary.frame.isConnected, true);
});

test('clearPlayers destroys pending objects without waiting for onReady', async () => {
  const h = harness();
  h.add('primary', 'journey-primary');
  h.add('alternative', 'alternative-stop-clip');
  await h.mountPlayers();
  h.clearPlayers();
  assert.equal(h.players.size, 0);
  assert.equal(h.playerFrames.size, 0);
  for (const player of h.constructed) {
    assert.equal(player.destroyCalls, 1);
    player.ready();
    player.play();
    player.error();
  }
  assert.equal(h.players.size, 0, 'Old-generation callbacks cannot repopulate the registry');
  assert.equal(h.tracked.length, 0);
});

test('removal while awaiting the API prevents constructing a detached player', async () => {
  const h = harness();
  const alternative = h.add('alternative', 'alternative-stop-clip');
  const mounting = h.mountPlayers();
  // getYouTubeAPI resolves asynchronously even when YT is already available.
  alternative.remove();
  await mounting;
  assert.equal(h.constructed.length, 0);
  assert.equal(h.players.size, 0);
});

test('generation change while awaiting the API prevents stale construction', async () => {
  const h = harness();
  h.add('alternative', 'alternative-stop-clip');
  const mounting = h.mountPlayers();
  h.clearPlayers();
  await mounting;
  assert.equal(h.constructed.length, 0);
  assert.equal(h.players.size, 0);
});
