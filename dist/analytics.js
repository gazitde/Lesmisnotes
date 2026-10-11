'use strict';
/* Basic consent mode. Only curated identifiers, enumerations and counts may cross this boundary. */
(() => {
  const C = window.SITE_CONFIG || {}, M = window.SITE_METADATA || {}, P = window.SitePrivacy;
  const id = /^G-[A-Z0-9]+$/.test(C.gaMeasurementId || '') ? C.gaMeasurementId : '';
  // This flag records a verified GA Admin setting; send_page_view:false alone is insufficient.
  const configured = Boolean(id && C.gaEnhancedMeasurementDisabled === true);
  const routes = Object.keys(M.pages || {}), journeys = ['first', 'after', 'book', 'voices', 'play'];
  const steps = [1, 2, 3, 4], lengths = [5, 10, 25], tracks = ['story', 'musical'];
  const categories = ['all', 'pages', 'story', 'characters', 'songs', 'places', 'history', 'recipes', 'ideas'];
  const count = max => value => Number.isInteger(value) && value >= 0 && value <= max;
  const schemas = {
    journey_start: { journey_id: journeys, step_index: steps },
    journey_resume: { journey_id: journeys, step_index: steps },
    journey_step: { journey_id: journeys, step_index: steps, entry_method: ['start', 'next', 'direct', 'history'] },
    journey_next: { journey_id: journeys, from_step: [1, 2, 3], to_step: [2, 3, 4] },
    journey_offroute: { journey_id: journeys, from_page: routes, to_page: routes },
    journey_exit: { journey_id: journeys, step_index: steps },
    journey_complete: { journey_id: journeys, step_index: [4] },
    quiz_start: { quiz_track: tracks, question_count: lengths },
    quiz_resume: { quiz_track: tracks, question_count: lengths, step_index: count(25) },
    quiz_step: { quiz_track: tracks, question_count: lengths, step_index: count(25) },
    quiz_complete: { quiz_track: tracks, question_count: lengths, correct_count: count(25) },
    video_open: { video_id: [] }, video_play: { video_id: [] },
    map_selection: { map_kind: ['story', 'geographic'], place_id: [] },
    search_open: {}, search_results: { search_category: categories, result_count: count(1000) },
    search_select: { search_category: categories, result_category: categories },
    contact_submit: { form_language: ['he', 'en'] }, contact_success: { form_language: ['he', 'en'] },
    contact_error: { form_language: ['he', 'en'], error_category: ['validation', 'unavailable', 'rate_limited', 'rejected', 'network', 'unconfirmed'] },
    language_change: { from_language: ['he', 'en'], to_language: ['he', 'en'] },
    share: { content_type: ['quiz_achievement'], method: ['native', 'clipboard'] },
    badge_download: { quiz_track: tracks, question_count: lengths },
    bookmark_change: { content_id: routes, bookmark_action: ['add', 'remove'] },
    content_open: { content_type: ['story_chapter', 'character', 'map_place', 'novel_part', 'musical_stop'], content_id: [] }
  };
  let active = false, ready = false, loaded = false, script = null, generation = 0, lastPage = '';
  let page = { route: 'home', lang: 'en', journey: 'none' }, pending = [], videoIds = [], contentIds = {}, placeIds = {};
  // The origin comes only from build-validated static metadata, never location, query, hash or referrer.
  const origin = /^https:\/\/[a-z0-9.-]+(?::[0-9]+)?$/i.test(M.origin || '') ? M.origin : 'https://lesmis-guide.invalid';
  function safe() {
    const canonical = M.pages?.[page.route]?.canonicalRoute;
    const route = routes.includes(canonical) ? canonical : page.route;
    return { page_location: `${origin}/${page.lang}/${route}/`, page_referrer: '', page_title: `LesMisNotes | ${route}`, page_id: route, ui_language: page.lang, language: page.lang, active_journey: page.journey, campaign_id: 'not_collected', campaign_source: 'not_collected', campaign_medium: 'not_collected', campaign_name: 'not_collected', campaign_term: 'not_collected', campaign_content: 'not_collected' };
  }
  const allowed = () => configured && Boolean(P?.allowed('analytics'));
  function publish(name, values) {
    if (!active || !allowed()) return false;
    const event = { ...safe(), ...values, send_to: id };
    if (ready) { window.gtag('set', safe()); window.gtag('event', name, event); }
    else { if (pending.length >= 100) return false; pending.push([name, event]); }
    return true;
  }
  function track(name, values = {}) {
    if (active && !allowed()) withdraw(true);
    if (!active || !allowed() || !values || typeof values !== 'object' || Array.isArray(values)) return false;
    const schema = schemas[name];
    if (!schema || Object.keys(values).some(k => !Object.hasOwn(schema, k)) || Object.keys(schema).some(k => !Object.hasOwn(values, k))) return false;
    for (const [key, value] of Object.entries(values)) {
      if (key === 'video_id') { if (!videoIds.includes(value)) return false; }
      else if (key === 'place_id') { if (!placeIds[values.map_kind]?.includes(value)) return false; }
      else if (key === 'content_id' && name === 'content_open') { if (!contentIds[values.content_type]?.includes(value)) return false; }
      else if (typeof schema[key] === 'function' ? !schema[key](value) : !schema[key].includes(value)) return false;
    }
    if (name === 'quiz_complete' && values.correct_count > values.question_count) return false;
    if (['quiz_step', 'quiz_resume'].includes(name) && (values.step_index < 1 || values.step_index > values.question_count)) return false;
    if (name === 'journey_next' && values.to_step !== values.from_step + 1) return false;
    if (name === 'language_change' && values.from_language === values.to_language) return false;
    return publish(name, values);
  }
  function pageView() {
    if (!active || !allowed()) return;
    const key = safe().page_location;
    if (lastPage !== key && publish('page_view', {})) lastPage = key;
  }
  function removeCookies() {
    if (typeof document.cookie !== 'string') return;
    const names = document.cookie.split(';').map(x => x.trim().split('=')[0]).filter(n => n === 'lesmis_ga' || n === `lesmis_ga_${id.slice(2)}`);
    for (const name of names) document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
  }
  function withdraw(clearCookies = false) {
    // Disable first: a previously loaded Google library cannot be unloaded by removing a script.
    if (id) window['ga-disable-' + id] = true;
    active = false; ready = false; lastPage = ''; pending = []; generation++;
    if (script) { script.onload = null; script.onerror = null; script.remove(); script = null; }
    if (configured && clearCookies) removeCookies();
    if (Array.isArray(window.dataLayer)) window.dataLayer.length = 0;
  }
  function finish(version) {
    if (version !== generation || !active || !allowed()) return;
    loaded = true; ready = true;
    const queue = pending; pending = [];
    for (const [name, event] of queue) {
      if (!active || !allowed()) { withdraw(true); return; }
      window.gtag('event', name, event);
    }
    window.gtag('set', safe());
  }
  function start() {
    if (!allowed()) { withdraw(active || ready); return; }
    if (active) return;
    active = true; const version = ++generation;
    window['ga-disable-' + id] = false;
    // Keep the same array after withdrawal so a loaded Google tag retains its queue integration.
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { if (active && allowed()) window.dataLayer.push(arguments); };
    const denied = { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };
    window.gtag('consent', 'default', denied);
    window.gtag('consent', 'update', { ...denied, analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', id, { ...safe(), send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, ignore_referrer: true, cookie_prefix: 'lesmis', cookie_domain: 'none', cookie_path: '/', cookie_expires: 15552000, cookie_update: false, cookie_flags: 'SameSite=Lax;Secure' });
    pageView();
    if (loaded) { finish(version); return; }
    script = document.createElement('script'); script.id = 'lesmis-analytics-tag'; script.async = true;
    script.referrerPolicy = 'no-referrer'; script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    script.onload = () => finish(version);
    script.onerror = () => { if (version === generation) withdraw(false); };
    document.head.appendChild(script);
  }
  if (id) window['ga-disable-' + id] = true;
  window.SiteAnalytics = Object.freeze({
    configured, active: () => active && ready && allowed(),
    initialize(catalogue) { videoIds = catalogue.videos || []; contentIds = catalogue.content || {}; placeIds = catalogue.places || { story: contentIds.map_place || [], geographic: [] }; },
    context(route, lang, journey = null) {
      if (active && !allowed()) withdraw(true);
      if (!routes.includes(route) || !['he', 'en'].includes(lang)) return;
      page = { route, lang, journey: journeys.includes(journey) ? journey : 'none' };
      if (active && ready) window.gtag('set', safe());
      pageView();
    }, consent: start, track, withdraw
  });
})();
