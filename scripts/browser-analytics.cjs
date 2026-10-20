'use strict';
// All external requests are intercepted. This suite NEVER emits a real GA event or contact email.
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const base = 'http://127.0.0.1:8886';
const server = spawn(process.execPath, ['scripts/serve.mjs'], {env:{...process.env,PORT:'8886',CONTACT_ENABLED:'false'},stdio:'pipe'});
let browser, checks=0, tagRequests=0, forbiddenRequests=0;
const ok=(condition,message)=>{assert.ok(condition,message);checks++};
const equal=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++};
(async()=>{
  for(let i=0;i<50;i++){try{if((await fetch(base+'/en/home/')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
  browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || (require('node:fs').existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),args:['--no-sandbox']});
  const context = await browser.newContext({viewport:{width:1280,height:900}});
  let contactResult = 'success';
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin===base){
      if(url.pathname==='/site-config.js')return route.fulfill({contentType:'application/javascript',body:"window.SITE_CONFIG=Object.freeze({gaMeasurementId:'G-TEST123',gaEnhancedMeasurementDisabled:true});"});
      if(url.pathname==='/api/contact'){
        if(route.request().method()==='GET')return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,available:true,provider:'formsubmit',ticket:{id:'test-only',signature:'not-real',issued:1}})});
        return route.fulfill({status:contactResult==='success'?202:502,contentType:'application/json',body:JSON.stringify(contactResult==='success'?{ok:true,code:'accepted'}:{ok:false,code:'delivery_unconfirmed'})});
      }
      return route.continue();
    }
    if(url.hostname==='www.googletagmanager.com'){
      tagRequests++;equal(url.searchParams.get('id'),'G-TEST123','QA must never load the production tag');
      return route.fulfill({contentType:'application/javascript',body:'window.__mockTagLoaded=(window.__mockTagLoaded||0)+1;'});
    }
    if(/google-analytics\.com$/.test(url.hostname)){forbiddenRequests++;return route.abort()}
    if(url.hostname==='www.youtube.com'&&url.pathname==='/iframe_api')return route.fulfill({contentType:'application/javascript',body:'window.__testPlayers=[];window.YT={PlayerState:{PLAYING:1},Player:function(f,o){window.__testPlayers.push({id:f.id,frame:f,options:o});queueMicrotask(()=>o.events.onReady({target:{pauseVideo(){},destroy(){}}}));}};window.onYouTubeIframeAPIReady?.();'});
    return route.abort();
  });
  const page=await context.newPage();
  const events=()=>page.evaluate(()=>Array.from(window.dataLayer||[]).filter(e=>e[0]==='event').map(e=>({name:e[1],...e[2]})));
  const named=async name=>(await events()).filter(e=>e.name===name);
  const count=async name=>(await named(name)).length;
  const go=async route=>{await page.evaluate(route=>{const a=document.createElement('a');a.href='/'+document.documentElement.lang+'/'+route+'/';document.getElementById('app').append(a);a.click();a.remove()},route);await page.waitForFunction(route=>location.pathname.endsWith('/'+route+'/'),route)};
  const consent=async enabled=>{await page.locator('[data-action="privacy-open"]').last().click();await page.locator('#privacy-analytics').setChecked(enabled);await page.locator('#privacy-functional').setChecked(true);await page.locator('[data-action="privacy-save"]').click()};
  // Legacy routes still accept saved/resume journey state; fixture links avoid restoring their removed home chooser.
  const enterLegacy=async(id,route)=>page.evaluate(({id,route})=>{const a=document.createElement('a');a.href='/'+document.documentElement.lang+'/'+route+'/';a.dataset.enterJourney=id;document.getElementById('app').append(a);a.click();a.remove()},{id,route});
  await page.goto(base+'/en/home/?q=reader%40example.com#private-message');await page.waitForFunction(()=>window.SiteAnalytics);
  equal(tagRequests,0,'No Google tag before choice');ok(await page.evaluate(()=>!window.dataLayer),'No pre-consent queue');
  await enterLegacy('first','before');equal(tagRequests,0,'Navigation without consent remains silent');
  await consent(true);await page.waitForFunction(()=>window.SiteAnalytics.active());equal(tagRequests,1,'Exactly one post-consent tag');equal(await count('page_view'),1,'One pageview on initial consent');equal(await count('journey_start'),0,'No replay of pre-consent journey');
  let before=await count('page_view');await page.evaluate(()=>SiteAnalytics.context('before','en','first'));equal(await count('page_view'),before,'Rerender same route does not duplicate pageview');
  const paths={first:['before','story','map','musical'],after:['after','listening','compare','ideas'],book:['hugo','novel','compare','musical'],voices:['listening','musical','screen','after'],play:['quiz','characters','map','history']};
  for(const [id,path]of Object.entries(paths)){
    await go('home');
    const starts=await count('journey_start'),steps=await count('journey_step'),complete=await count('journey_complete');
    await enterLegacy(id,path[0]);
    for(let i=0;i<path.length;i++){ok((await page.url()).includes('/'+path[i]+'/'),'Journey '+id+' step '+(i+1));if(i<3)await page.locator('.journey-next').click()}
    equal(await count('journey_start'),starts+1,id+' start');equal(await count('journey_step'),steps+4,id+' four steps');equal(await count('journey_complete'),complete+1,id+' final-stop completion');equal((await named('journey_start')).slice(starts).map(e=>e.step_index),[1],id+' starts at step one');equal((await named('journey_step')).slice(steps).map(e=>e.step_index),[1,2,3,4],id+' exact ordered steps');equal((await named('journey_complete')).slice(complete).map(e=>e.step_index),[4],id+' completes at step four');
  }
  for(const [interest,pages] of Object.entries({novel:['novel','characters','map','hugo'],musical:['before','musical','listening','screen'],both:['hugo','story','compare','musical']})){
    await go('home');
    const starts=await count('journey_start'),steps=await count('journey_step'),complete=await count('journey_complete');
    await enterLegacy('interest-'+interest,pages[0]);
    for(let i=0;i<4;i++){ok(page.url().endsWith('/'+pages[i]+'/'),'Interest '+interest+' step '+(i+1));if(i<3)await page.locator('.journey-next').click()}
    equal(await count('journey_start'),starts+1,interest+' start');equal(await count('journey_step'),steps+4,interest+' steps');equal(await count('journey_complete'),complete+1,interest+' completion');equal((await named('journey_start')).slice(starts).map(e=>e.step_index),[1],interest+' starts at step one');equal((await named('journey_step')).slice(steps).map(e=>e.step_index),[1,2,3,4],interest+' exact ordered steps');equal((await named('journey_complete')).slice(complete).map(e=>e.step_index),[4],interest+' completes at step four');
    ok((await named('journey_start')).some(e=>e.journey_id==='interest-'+interest),'Fixed interest identifier');
  }
  // Query/fragment-only state changes are content selections, not additional pages.
  await go('map');before=await count('page_view');await page.locator('[data-geo-place="rue-plumet"]').click();equal(await count('page_view'),before,'Map state does not double-count pageview');ok((await named('map_selection')).some(e=>e.place_id==='rue-plumet'),'Geographic map selection');
  const changes=await count('language_change');await page.locator('[data-action="language"]').click();equal(await count('language_change'),changes+1,'Exactly one language event through map handler');equal(await count('page_view'),before+1,'Language route has one pageview');ok(page.url().includes('/he/map/')&&page.url().includes('place=rue-plumet'),'Map place survives language change');
  before=await count('page_view');await page.goBack();equal(await count('page_view'),before+1,'Back tracks one pageview');await page.goForward();equal(await count('page_view'),before+2,'Forward tracks one pageview');
  await go('before');await page.locator('[data-action="bookmark-toggle"]').click();ok((await named('bookmark_change')).some(e=>e.content_id==='before'&&e.bookmark_action==='add'),'Bookmark is measured only after applied');
  await page.locator('[data-site-search-open]').click();await page.locator('#site-search-input').fill('reader@example.com confidential message');await page.waitForTimeout(250);
  ok((await named('search_results')).some(e=>e.result_count===0),'Search result count is measured');await page.locator('#site-search-input').fill('Valjean');await page.waitForTimeout(250);await page.locator('[data-site-search-result][data-result-category]').first().click();ok(await count('search_select')>0,'Search selection category measured');
  // User text must be absent from every command, not merely event payloads.
  let serialized=await page.evaluate(()=>JSON.stringify(window.dataLayer));ok(!/reader|confidential|private-message|q=|focus=|\?place=|\?clip=/i.test(serialized),'No query, fragment or private search text in GA commands');
  await go('quiz');await page.locator('[data-action="quiz-start"]').click();
  for(let i=0;i<5;i++){await page.locator('[data-quiz-option="0"]').click();await page.locator('[data-action="quiz-submit"]').click();await page.locator('[data-action="quiz-next"]').click()}
  equal(await count('quiz_step'),5,'Only submitted quiz steps');equal(await count('quiz_complete'),1,'Quiz completion exactly once');
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{}}}));await page.locator('[data-action="quiz-copy"]').click();await page.waitForTimeout(20);equal(await count('share'),1,'Confirmed clipboard share');
  await go('listening');await page.locator('[data-gallery-link]').first().click();ok(await count('video_open')>0,'Video detail open tracked');equal(await count('video_play'),0,'Opening video is not playback');
  await page.waitForFunction(()=>window.__testPlayers?.some(p=>p.frame.isConnected));await page.evaluate(()=>{const p=window.__testPlayers.find(p=>p.frame.isConnected);p.options.events.onStateChange({data:1});p.options.events.onStateChange({data:1})});equal(await count('video_play'),1,'Only actual PLAYING callback, deduped for mounted player');
  await go('contact');await page.waitForFunction(()=>!document.getElementById('contact-send').disabled);await page.locator('#contact-name').fill('Private Person');await page.locator('#contact-email').fill('reader@example.com');await page.locator('#contact-message').fill('A confidential message that must never be measured.');await page.locator('#contact-send').click();await page.locator('#contact-success').waitFor({state:'visible'});equal(await count('contact_submit'),1,'One accepted submission attempt');equal(await count('contact_success'),1,'One service-acceptance result');
  await page.locator('#contact-another').click();await page.waitForFunction(()=>!document.getElementById('contact-send').disabled);contactResult='failure';await page.locator('#contact-message').fill('Another confidential message for a stubbed failure.');await page.locator('#contact-send').click();await page.waitForFunction(()=>document.getElementById('contact-form').getAttribute('aria-busy')==='false');equal(await count('contact_error'),1,'One broad contact failure');
  serialized=await page.evaluate(()=>JSON.stringify(window.dataLayer));ok(!/Private Person|reader@|confidential|signature|not-real|test-only/.test(serialized),'No contact fields, ticket, or server response data');
  const stalePlayer=await page.evaluate(()=>{window.__oldPlayer=window.__testPlayers?.[0];return !!window.__oldPlayer});
  await consent(false);equal(await page.evaluate(()=>window['ga-disable-G-TEST123']),true,'Withdrawal disables tag');equal((await events()).length,0,'Withdrawal clears pending/history queue');await go('map');await page.locator('[data-geo-place="bastille"]').click();if(stalePlayer)await page.evaluate(()=>window.__oldPlayer.options.events.onStateChange({data:1}));equal((await events()).length,0,'Route, map and stale player remain silent after withdrawal');equal(tagRequests,1,'Withdrawal never reloads tag');
  equal(forbiddenRequests,0,'No real GA collection request attempted');
  await context.close();
  console.log(`PASS: ${checks} analytics browser assertions; all five journeys, HE/EN/Back/Forward, search, map, quiz, media, bookmarks, sharing, contact and withdrawal. All external requests mocked/blocked; zero real analytics or mail traffic.`);
})().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{await browser?.close();server.kill()});
