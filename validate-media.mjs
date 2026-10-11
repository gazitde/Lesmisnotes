import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// Read-only application regression test. All DOM, storage, timers, analytics,
// and YouTube behavior below are in-memory stubs. No browser or network is used.
// Usage: node lesmis-media-race-test.mjs /path/to/lesmis [--prove-regression]
const args = process.argv.slice(2);
const root = path.resolve(args.find(arg => !arg.startsWith('--')) || process.cwd());
const appSource = fs.readFileSync(path.join(root, 'dist/app.js'), 'utf8');
const start = appSource.indexOf('const players = new Map();');
const end = appSource.indexOf('\nfunction performerCredits', start);
assert.ok(start >= 0 && end > start, 'Cannot locate the application media implementation');
const mediaSource = appSource.slice(start, end);
let checks = 0;

function mediaHarness(source = mediaSource, { apiReady = true, autoReady = true } = {}) {
  const nodes = new Map(), instances = [], tracks = [], scripts = [];
  const context = {
    console, Map, Promise,
    setTimeout: () => 1,
    clearTimeout: () => {},
    videos: ['old', 'new'].map(id => ({ id, title: id, channel: 'Test publisher' })),
    document: {
      getElementById: id => nodes.get(id),
      querySelectorAll: () => ['old','new'].map(id=>nodes.get('video-'+id)),
      createElement: tag => ({ tag, isConnected: false }),
      head: { append: script => scripts.push(script) },
    },
    window: { location: { origin: 'https://example.invalid' } },
    A: { track: (...event) => { tracks.push(event); return true; } },
    t: (_he, en) => en,
  };
  for (const id of ['old', 'new']) {
    nodes.set('video-' + id, {
      iframe: null, dataset: {videoShell:id},
      querySelector() { return this.iframe?.isConnected ? this.iframe : null; },
      replaceChildren(iframe) {
        if (this.iframe) this.iframe.isConnected = false;
        this.iframe = iframe;
        iframe.isConnected = true;
      },
    });
    nodes.set('video-status-' + id, { textContent: '' });
  }
  const YT = {
    PlayerState: { PLAYING: 1 },
    Player: function (iframe, config) {
      const player = {
        iframe, config, paused: 0, destroyed: 0,
        pauseVideo() { this.paused++; },
        destroy() { this.destroyed++; iframe.isConnected = false; },
        ready() { config.events.onReady({ target: this }); },
        playEvent() { config.events.onStateChange({ data: 1, target: this }); },
        errorEvent() { config.events.onError({ data: 100, target: this }); },
      };
      instances.push(player);
      if (autoReady) player.ready();
      return player;
    },
  };
  if (apiReady) context.window.YT = YT;
  vm.createContext(context);
  vm.runInContext(source + '\nObject.assign(window, { loadPlayer, clearPlayers, mountPlayers });', context);
  return { ...context.window, context, nodes, instances, tracks, scripts, YT };
}

async function staleStateCase(source = mediaSource) {
  const state = mediaHarness(source);
  await state.loadPlayer('old');
  state.clearPlayers();
  await state.loadPlayer('new');
  state.instances[0].playEvent();
  assert.equal(state.instances[0].destroyed, 1, 'The old player must be destroyed');
  assert.equal(state.instances[1].paused, 0, 'A stale PLAYING event must not pause the newly selected player');
  assert.equal(state.tracks.length, 0, 'A stale PLAYING event must not attempt analytics');
}

await staleStateCase(); checks++;
{
  const state = mediaHarness();
  await state.loadPlayer('old');
  await state.loadPlayer('new');
  state.instances[1].playEvent();
  assert.equal(state.instances[0].paused, 1, 'A current PLAYING event must still pause another current player');
  assert.equal(state.tracks.length, 1, 'A current PLAYING event still reaches the analytics gate');
  state.instances[1].playEvent();
  assert.equal(state.tracks.length, 1, 'One player records its first accepted play only once');
  checks++;
}
{
  const state = mediaHarness();
  await state.loadPlayer('old');
  state.clearPlayers();
  await state.loadPlayer('new');
  const status = state.nodes.get('video-status-old');
  status.textContent = 'unchanged';
  state.instances[0].errorEvent();
  assert.equal(status.textContent, 'unchanged', 'A stale error must not write a status message');
  state.instances[1].errorEvent();
  assert.match(state.nodes.get('video-status-new').textContent, /could not load/, 'A current error must still provide its fallback');
  checks++;
}
{
  const state = mediaHarness();
  await state.loadPlayer('old');
  await state.loadPlayer('new');
  state.instances[0].iframe.isConnected = false;
  state.instances[0].playEvent();
  state.instances[0].errorEvent();
  assert.equal(state.instances[1].paused, 0, 'A disconnected iframe in the same generation must not pause another player');
  assert.equal(state.tracks.length, 0, 'A disconnected iframe must not attempt analytics');
  assert.equal(state.nodes.get('video-status-old').textContent, '', 'A disconnected iframe must not write an error');
  checks++;
}
{
  const state = mediaHarness(mediaSource, { apiReady: false });
  const pending = state.loadPlayer('old');
  const frame = state.nodes.get('video-old').iframe;
  assert.match(frame.src, /youtube-nocookie\.com\/embed\/old\?autoplay=0&/);
  assert.equal(state.scripts.length, 1, 'A single deferred API script should be requested');
  state.clearPlayers();
  frame.isConnected = false; // Full render removes the old iframe during withdrawal/navigation.
  state.context.window.YT = state.YT;
  state.context.window.onYouTubeIframeAPIReady();
  await pending;
  assert.equal(state.instances.length, 0, 'A late API resolution must not construct a withdrawn player');
  checks++;
}
{
  const state = mediaHarness(mediaSource, { autoReady: false });
  await state.loadPlayer('old');
  state.clearPlayers();
  await state.loadPlayer('new');
  state.instances[1].ready();
  state.instances[0].ready();
  assert.equal(state.instances[0].destroyed, 1, 'A player becoming ready after a generation change must destroy itself');
  state.instances[0].playEvent();
  assert.equal(state.instances[1].paused, 0, 'Late ready/state callbacks must leave the current player alone');
  checks++;
}

// Failed API requests must not poison later explicit player loads.
{
 const state=mediaHarness(mediaSource,{apiReady:false});
 const first=state.loadPlayer('old');
 state.scripts[0].onerror();await first;
 state.clearPlayers();
 const next=state.loadPlayer('new');
 assert.equal(state.scripts.length,2,'A failed API request must permit a fresh request');
 state.context.window.YT=state.YT;state.context.window.onYouTubeIframeAPIReady();await next;
 assert.equal(state.instances.length,1,'The retried API must construct the new player');checks+=2;
}
// Direct mounts initialize each rendered player exactly once, without autoplay or analytics.
{
 const state=mediaHarness();await state.mountPlayers();
 assert.equal(state.instances.length,2);await state.mountPlayers();
 assert.equal(state.instances.length,2);assert.equal(state.tracks.length,0);
 for(const p of state.instances){assert.match(p.iframe.src,/autoplay=0/);assert.equal(p.iframe.loading,'lazy');assert.ok(p.iframe.title);}
 checks+=9;
}
{
 const state=mediaHarness(mediaSource,{autoReady:false});await state.loadPlayer('old');
 state.instances[0].iframe.isConnected=false;state.instances[0].ready();
 assert.equal(state.instances[0].destroyed,1);checks++;
}
{
 const state=mediaHarness(mediaSource,{apiReady:false});const first=state.loadPlayer('old');
 state.scripts[0].onerror();await first;
 const again=state.loadPlayer('old');assert.equal(state.scripts.length,2);
 state.context.window.YT=state.YT;state.context.window.onYouTubeIframeAPIReady();await again;
 assert.equal(state.instances.length,1);checks+=2;
}
console.log(`PASS: ${checks} isolated media race, coordination, withdrawal, and no-autoplay checks.`);

if (args.includes('--prove-regression')) {
  const guard = 'onStateChange:e=>{if(generation!==videoGeneration||!f.isConnected)return;';
  assert.ok(mediaSource.includes(guard), 'Cannot construct the previous-state-handler mutant: guard text changed');
  const previousStateHandler = mediaSource.replace(guard, 'onStateChange:e=>{');
  await assert.rejects(staleStateCase(previousStateHandler), /stale PLAYING event must not pause/);
  console.log('PASS: removing the new state-handler guard reproduces the previous-source failure.');
}

// Full gallery rendering and spoiler gates are exercised by validate.mjs and validate-gallery.mjs.
