'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync('dist/analytics.js', 'utf8');
const privacy = fs.readFileSync('dist/privacy.js', 'utf8');
function harness({verified = true, realPrivacy = false} = {}) {
  let permission = false, now = Date.now(); const scripts = [], listeners = {}, disk = new Map(), writes = [];
  const storage = {getItem:k=>disk.get(k)||null,setItem:(k,v)=>disk.set(k,v),removeItem:k=>disk.delete(k)};
  const c = { SITE_CONFIG:{gaMeasurementId:'G-TEST123',gaEnhancedMeasurementDisabled:verified},
    SITE_METADATA:{origin:'https://www.lesmisnotes.com',pages:{home:{},quiz:{},map:{},contact:{},listening:{},tribute:{canonicalRoute:'listening'}}},
    location:{href:'https://secret.example/unknown/?q=reader@example.com#private-message',search:'?q=reader@example.com',hash:'#private-message'},
    document:{referrer:'https://private.example/?token=secret',title:'Private user text',createElement:()=>({remove(){this.removed=true}}),head:{appendChild:s=>scripts.push(s)},addEventListener:(n,f)=>listeners[n]=f},
    localStorage:storage,sessionStorage:storage,Date:class extends Date {static now(){return now}},
    setTimeout:fn=>{listeners.timer=fn;return 1},clearTimeout(){},addEventListener:(n,f)=>listeners[n]=f,
    SitePrivacy:{allowed:()=>permission} };
  Object.defineProperty(c.document,'cookie',{get:()=> 'lesmis_ga=123; lesmis_ga_TEST123=456; unrelated=keep',set:v=>writes.push(v)});
  c.window=c;vm.createContext(c);if(realPrivacy)vm.runInContext(privacy,c);vm.runInContext(code,c);
  const A=c.SiteAnalytics;
  A.initialize({videos:['curated-video'],places:{story:['paris'],geographic:['luxembourg']},content:{character:['valjean']}});
  const choose=allowed=>{permission=allowed;if(realPrivacy)c.SitePrivacy.choose({analytics:allowed,functional:false,media:false});A.consent()};
  return {c,A,scripts,writes,listeners,disk,choose,load:()=>scripts.at(-1).onload(),advance:ms=>now+=ms,events:()=>Array.from(c.dataLayer||[]).filter(a=>a[0]==='event').map(a=>[a[1],JSON.parse(JSON.stringify(a[2]))])};
}
test('analytics: no Google script, queue or event before explicit consent; unverified stream stays off',()=>{
  for(const verified of [true,false]) { const h=harness({verified}); h.A.context('home','en');h.A.consent();assert.equal(h.scripts.length,0);assert.equal(h.c.dataLayer,undefined);assert.equal(h.A.track('search_open'),false); if(!verified){h.choose(true);assert.equal(h.scripts.length,0);assert.equal(h.A.configured,false)} }
});
test('analytics: slow script queues only post-consent sanitized events and preserves pageview order exactly once',()=>{
  const h=harness();h.A.context('home','en');h.choose(true);assert.equal(h.scripts.length,1);assert.equal(h.events().length,0);
  h.A.context('home','en');h.A.context('quiz','en','play');assert.equal(h.A.track('quiz_start',{quiz_track:'story',question_count:5}),true);h.load();
  assert.deepEqual(h.events().map(e=>e[0]),['page_view','page_view','quiz_start']);h.A.context('quiz','en','play');assert.equal(h.events().length,3);
  h.A.context('quiz','he','play');assert.equal(h.events().length,4);assert.equal(h.events().at(-1)[1].active_journey,'play');
  h.A.context('map','he','play');h.A.context('quiz','he','play');assert.equal(h.events().length,6);
  for(const [_,p]of h.events()){assert.match(p.page_location,/^https:\/\/www\.lesmisnotes\.com\/(en|he)\/(home|quiz|map)\/$/);assert.equal(p.page_referrer,'');assert.ok(!JSON.stringify(p).includes('private'));assert.ok(!JSON.stringify(p).includes('reader@'));}
});
test('analytics: alias is canonical; invalid route, language and journey cannot escape allowlist',()=>{
  const h=harness();h.A.context('listening','en');h.choose(true);h.load();h.A.context('tribute','en');assert.equal(h.events().length,1);
  h.A.context('unknown?q=private','en','person@example.com');h.A.context('quiz','private');assert.equal(h.events().length,1);
  h.A.context('quiz','he','person@example.com');assert.equal(h.events().at(-1)[1].active_journey,'none');
});
test('analytics: withdrawal disables Google before removing script, drops pending queue, deletes only owned cookies',()=>{
  const h=harness();h.choose(true);const late=h.scripts[0].onload;h.A.track('search_open');h.choose(false);late();
  assert.equal(h.c['ga-disable-G-TEST123'],true);assert.equal(h.A.active(),false);assert.equal(h.events().length,0);assert.equal(h.scripts[0].removed,true);
  assert.equal(h.A.track('search_open'),false);h.c.gtag('event','unsafe',{text:'private'});assert.equal(h.events().length,0);
  assert.equal(h.writes.length,2);assert.ok(h.writes.every(x=>x.startsWith('lesmis_ga')&&!x.includes('unrelated')));
  h.choose(true);late();assert.equal(h.A.active(),false);h.load();assert.equal(h.events().length,1);
});
test('analytics: reconsent reuses loaded tag/queue and does not replay prior activity',()=>{
  const h=harness();h.choose(true);h.load();const queue=h.c.dataLayer;h.A.track('search_open');h.choose(false);h.A.context('map','he');h.choose(true);
  assert.equal(h.c.dataLayer,queue);assert.equal(h.scripts.length,1);assert.equal(h.A.active(),true);assert.deepEqual(h.events().map(e=>e[0]),['page_view']);assert.equal(h.events()[0][1].page_id,'map');
});
test('analytics: expiry, cross-tab rejection and upgraded consent invalidate measurement',()=>{
  const h=harness({realPrivacy:true});h.c.SitePrivacy.subscribe(()=>h.A.consent());h.choose(true);h.load();h.advance(181*86400000);h.listeners.timer();assert.equal(h.A.active(),false);assert.equal(h.c['ga-disable-G-TEST123'],true);
  h.choose(true);const choice=h.c.SitePrivacy.choice();h.disk.set(h.c.SitePrivacy.key,JSON.stringify({...choice,analytics:false}));h.listeners.storage({key:h.c.SitePrivacy.key});assert.equal(h.A.track('search_open'),false);
  h.disk.set(h.c.SitePrivacy.key,JSON.stringify({...choice,version:2}));h.c.SitePrivacy.refresh();assert.equal(h.c.SitePrivacy.allowed('analytics'),false);assert.equal(h.c.SitePrivacy.choice().version,3);
});
test('analytics: advertising stays denied; config disables automatic pageview, signal and personalization',()=>{
  const h=harness();h.choose(true);const config=Array.from(h.c.dataLayer).find(x=>x[0]==='config')[2];assert.equal(config.send_page_view,false);assert.equal(config.allow_google_signals,false);assert.equal(config.allow_ad_personalization_signals,false);assert.equal(config.cookie_expires,15552000);assert.equal(config.cookie_update,false);assert.equal(config.cookie_domain,'none');for(const key of ['campaign_id','campaign_source','campaign_medium','campaign_name','campaign_term','campaign_content'])assert.equal(config[key],'not_collected');
  const consent=Array.from(h.c.dataLayer).filter(x=>x[0]==='consent');for(const x of consent)for(const key of ['ad_storage','ad_user_data','ad_personalization'])assert.equal(x[2][key],'denied');
});
test('analytics: schema rejects arbitrary text, unknown IDs, inconsistent counts and free-form errors',()=>{
  const h=harness();h.choose(true);h.load();
  for(const [name,p]of [['search_results',{search_category:'all',result_count:2,query:'private'}],['contact_error',{form_language:'en',error_category:'reader@example.com'}],['video_play',{video_id:'unknown'}],['map_selection',{map_kind:'geographic',place_id:'private'}],['quiz_step',{quiz_track:'story',question_count:5,step_index:6}],['quiz_complete',{quiz_track:'story',question_count:5,correct_count:6}],['language_change',{from_language:'en',to_language:'en'}],['journey_next',{journey_id:'first',from_step:1,to_step:4}],['search_results',{search_category:'all',result_count:NaN}],['unrecognized',{}]])assert.equal(h.A.track(name,p),false,name);
  for(const [name,p]of [['search_results',{search_category:'songs',result_count:4}],['contact_error',{form_language:'he',error_category:'network'}],['map_selection',{map_kind:'geographic',place_id:'luxembourg'}],['bookmark_change',{content_id:'map',bookmark_action:'add'}],['share',{content_type:'quiz_achievement',method:'clipboard'}]])assert.equal(h.A.track(name,p),true,name);
});
test('analytics: load failure is fail-closed and a later explicit consent call can retry',()=>{const h=harness();h.choose(true);h.scripts[0].onerror();assert.equal(h.A.active(),false);assert.equal(h.c['ga-disable-G-TEST123'],true);h.choose(true);assert.equal(h.scripts.length,2);h.load();assert.equal(h.events().length,1)});

test('privacy upgrade: valid v2 remembering/language/bookmarks survive while analytics requires a new choice',()=>{
  const h=harness({realPrivacy:true}), now=Date.now();
  const prior={version:2,savedAt:now-86400000,expiresAt:now+179*86400000,functional:true,analytics:true,media:true};
  h.disk.set(h.c.SitePrivacy.key,JSON.stringify(prior));h.disk.set('barricade-lang','he');h.disk.set('barricade-bookmarks','["map","novel"]');
  h.c.SitePrivacy.refresh();const choice=h.c.SitePrivacy.choice();
  assert.equal(choice.version,3);assert.equal(choice.functional,true);assert.equal(choice.media,true);assert.equal(choice.analytics,false);
  assert.equal(choice.savedAt,prior.savedAt);assert.equal(choice.expiresAt,prior.expiresAt);
  assert.equal(h.c.SitePrivacy.get('barricade-lang'),'he');assert.equal(h.c.SitePrivacy.get('barricade-bookmarks'),'["map","novel"]');
  assert.equal(h.disk.get(h.c.SitePrivacy.key),JSON.stringify(prior),'Migration does not persist a new grant or extend expiry');
  h.A.consent();assert.equal(h.scripts.length,0);
  h.advance(181*86400000);h.c.SitePrivacy.refresh();assert.equal(h.c.SitePrivacy.choice(),null);assert.equal(h.c.SitePrivacy.allowed('functional'),false);
});
