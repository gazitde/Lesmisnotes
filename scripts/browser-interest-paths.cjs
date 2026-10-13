'use strict';

// Run after building and serving the site:
// SEARCH_TEST_URL=http://localhost:8873 node scripts/browser-interest-paths.cjs
// This standalone test follows the existing browser scripts; it is not part of
// npm test. External requests are always aborted, including map tiles/media.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const base=(process.env.SEARCH_TEST_URL||'http://localhost:8873').replace(/\/$/,'');
const origin=new URL(base).origin;
const dir=process.env.SEARCH_ARTIFACT_DIR||'test-results';
const routes={
  novel:['novel','characters','map','hugo'],
  musical:['before','musical','listening','screen'],
  both:['hugo','story','compare','musical']
};
const optionalKeys=[
  'barricade-lang','barricade-listening','barricade-quiz-run',
  'barricade-bookmarks','barricade-last-journey','barricade-last-reading','barricade-completed-chapters-v1'
];
const consentKey='barricade-consent-v1';
let checks=0,currentCase='startup';
const check=(value,message)=>{assert.ok(value,`${currentCase}: ${message}`);checks++};
const equal=(actual,expected,message)=>{
  assert.deepEqual(actual,expected,`${currentCase}: ${message}`);checks++;
};
const routePath=(lang,route)=>`/${lang}/${route}/`;
const journeyId=interest=>`interest-${interest}`;
const card=(page,interest)=>page.locator(`.path-card[data-interest="${interest}"]`);
const stateId=page=>page.evaluate(()=>history.state?.lesmisJourney||null);

async function makeContext(browser,lang,width,javaScriptEnabled=true){
  const context=await browser.newContext({
    viewport:{width,height:900},hasTouch:width<=390,
    reducedMotion:'reduce',javaScriptEnabled,serviceWorkers:'block'
  });
  const errors=[],external=[];
  await context.route('**/*',request=>{
    const url=request.request().url();
    if(new URL(url).origin===origin)return request.continue();
    external.push(url);
    return request.abort();
  });
  const page=await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror',error=>errors.push(error.message));
  return {context,page,errors,external};
}

async function noOverflow(page,label){
  const dimensions=await page.evaluate(()=>({
    viewport:document.documentElement.clientWidth,
    document:document.documentElement.scrollWidth,
    body:document.body.scrollWidth
  }));
  check(dimensions.document<=dimensions.viewport+1&&dimensions.body<=dimensions.viewport+1,
    `${label} has no horizontal overflow (${JSON.stringify(dimensions)})`);
}

async function touchTargets(page,selector,label){
  const targets=page.locator(selector);
  check(await targets.count()>0,`${label} has actionable targets`);
  for(const target of await targets.all()){
    await target.scrollIntoViewIfNeeded();
    const bounds=await target.boundingBox();
    const width=page.viewportSize().width;
    check(bounds&&bounds.width>=43.5&&bounds.height>=43.5,
      `${label} target is at least 44 CSS px: ${await target.innerText()}`);
    check(bounds&&bounds.x>=-1&&bounds.x+bounds.width<=width+1,
      `${label} target fits horizontally`);
  }
}

async function spoilersStayClosed(page,label){
  equal(await page.locator('.story-chapter, #show-slide, .novel-event, #compare-marius-politics, .char-detail').count(),
    0,`${label} does not open protected plot content`);
  const consent=await page.evaluate(()=>({
    global:sessionStorage.getItem('barricade-spoilers'),
    novel:sessionStorage.getItem('barricade-novel-consent'),
    after:sessionStorage.getItem('barricade-after-consent')
  }));
  check(Object.values(consent).every(value=>value!=='on'),`${label} does not grant spoiler consent`);
  equal(await page.locator('[data-action="spoilers"].on').count(),0,`${label} keeps spoiler control off`);
}

async function storageCheck(page,consented=false){
  const storage=await page.evaluate(()=>({
    keys:Object.keys(localStorage).sort(),
    registered:window.SitePrivacy.optionalKeys.slice().sort(),
    functional:window.SitePrivacy.allowed('functional'),
    analytics:window.SitePrivacy.allowed('analytics')
  }));
  equal(storage.registered,optionalKeys.slice().sort(),'interest paths add no optional storage key');
  equal(storage.functional,consented,'functional consent matches the deliberate choice');
  equal(storage.analytics,false,'analytics remains unapproved');
  if(consented){
    check(storage.keys.every(key=>[consentKey,...optionalKeys].includes(key)),
      `only existing approved keys are persisted: ${storage.keys.join(', ')}`);
  }else{
    equal(storage.keys,[],'no local storage is written before consent');
    equal(await page.locator('.home-memory').count(),0,'no persistent resume is offered before consent');
  }
}

async function plan(page,lang,interest){
  await page.waitForFunction(({lang,interest})=>
    location.pathname===`/${lang}/home/`&&
    new URLSearchParams(location.search).get('interest')===interest&&
    document.querySelector(`.path-card[data-interest="${interest}"]`)?.getAttribute('aria-current')==='true',
  {lang,interest});
  equal(await page.locator('.path-card[aria-current="true"]').count(),1,'exactly one interest is current');
  equal(await card(page,interest).getAttribute('aria-current'),'true','chosen card exposes its selected state');
  check(await page.locator('#interest-plan').isVisible(),'selected plan is visible');
  check((await page.locator('#interest-plan-title').innerText()).trim().length>0,'selected plan has a meaningful heading');
  const start=page.locator('#interest-plan .interest-start');
  equal(await start.count(),1,'plan has one Start action');
  equal(await start.evaluate(element=>element.tagName),'A','Start is a real link');
  equal(await start.getAttribute('href'),routePath(lang,routes[interest][0]),'Start links to the first route');
  equal(await start.getAttribute('data-enter-journey'),journeyId(interest),'Start enters the selected guided journey');
  const stops=page.locator('#interest-plan .interest-stops > li a');
  equal(await stops.evaluateAll(links=>links.map(link=>link.getAttribute('href'))),
    routes[interest].map(route=>routePath(lang,route)),'plan presents exactly the four promised stops in order');
  equal(await stops.evaluateAll(links=>links.map(link=>link.getAttribute('data-enter-journey'))),
    routes[interest].map(()=>journeyId(interest)),'each direct stop link joins the same selected path');
  equal(await stateId(page),null,'choosing a plan does not start the journey');
  equal(await page.locator('.journey-continuation').count(),0,'home selection has no active journey banner');
  await noOverflow(page,'selected plan');
  await spoilersStayClosed(page,'plan selection');
}

async function stop(page,lang,interest,index,{screenshot=false,width}={}){
  const route=routes[interest][index];
  await page.waitForFunction(({lang,route,id})=>
    location.pathname===`/${lang}/${route}/`&&history.state?.lesmisJourney===id&&
    document.querySelector('.journey-continuation'),
  {lang,route,id:journeyId(interest)});
  equal(await stateId(page),journeyId(interest),'the guided journey survives navigation');
  equal(await page.locator('.journey-continuation').count(),1,'one continuation is rendered');
  const continuation=page.locator('.journey-continuation');
  equal(await continuation.locator('.journey-current > span > bdi').getAttribute('dir'),'ltr','progress fraction keeps its canonical visual order in RTL');
  equal(await continuation.locator('.journey-current > span > bdi').innerText(),`${index+1} / 4`,'isolated progress identifies the actual stop');
  check(new RegExp(`\\b${index+1}\\s*/\\s*4\\b`).test(await continuation.innerText()),
    `continuation identifies stop ${index+1} of 4`);
  equal(await continuation.locator('.journey-switch').getAttribute('href'),
    routePath(lang,'home')+`?interest=${interest}#home-classic-heading`,
    'switch link returns to this interest on home');
  equal(await continuation.locator('[data-action="journey-exit"]').count(),1,'Browse freely is available');
  const next=routes[interest][index+1];
  if(next){
    equal(await continuation.locator('.journey-next').getAttribute('href'),routePath(lang,next),'Next points to the correct next stop');
  }else{
    equal(await continuation.locator('.journey-next').count(),0,'completion has no phantom next stop');
    check((await continuation.locator('p').innerText()).trim().length>0,'completion explains that the path is finished');
  }
  await spoilersStayClosed(page,`stop ${index+1}`);
  await noOverflow(page,`stop ${index+1}`);
  await touchTargets(page,'.journey-continuation a, .journey-continuation button','continuation');
  if(screenshot){
    await continuation.scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(dir,`interest-${interest}-stop-${index+1}-${route}-${lang}-${width}.png`)});
  }
}

async function chooseAndStart(page,lang,interest){
  await page.goto(base+routePath(lang,'home'));
  await card(page,interest).click();
  await plan(page,lang,interest);
  await page.locator('#interest-plan .interest-start').click();
  await stop(page,lang,interest,0);
}

async function initialHome(page,lang,width){
  await page.goto(base+routePath(lang,'home'));
  equal(await page.locator('.path-card[data-interest]').count(),3,'three interest entrances');
  equal(await page.locator('.path-card[aria-current="true"]').count(),0,'fresh home does not silently choose an interest');
  for(const interest of Object.keys(routes)){
    equal(await card(page,interest).evaluate(element=>element.tagName),'A','interest choice is anchor-backed');
    equal(await card(page,interest).getAttribute('href'),routePath(lang,routes[interest][0]),'card has the correct no-JS destination');
  }
  const more=page.locator('details.home-more-paths');
  equal(await more.count(),1,'older journeys live in one native disclosure');
  equal(await more.getAttribute('open'),null,'older journeys are collapsed initially');
  equal(await page.locator('[data-home-journey]').count(),5,'all five older journeys remain');
  equal(await more.locator('[data-home-journey]').count(),5,'all older journey controls are inside the disclosure');
  await noOverflow(page,'fresh home');
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:path.join(dir,`interest-home-first-${lang}-${width}.png`)});
  await page.locator('.home-classic-paths').screenshot({path:path.join(dir,`interest-home-cards-${lang}-${width}.png`)});
  await touchTargets(page,'.path-card[data-interest], details.home-more-paths > summary','home choices');
  await more.locator(':scope > summary').click();
  check(await more.evaluate(element=>element.open),'native disclosure opens');
  await touchTargets(page,'details.home-more-paths [data-home-journey]','older journeys');
  await more.locator(':scope > summary').click();
  check(!await more.evaluate(element=>element.open),'native disclosure closes again');
  await storageCheck(page);
}

async function exerciseInterest(page,lang,width,interest){
  currentCase=`${lang}/${width}/${interest}`;
  const otherLang=lang==='he'?'en':'he';
  await page.goto(base+routePath(lang,'home'));
  await card(page,interest).click();
  await plan(page,lang,interest);
  await touchTargets(page,'#interest-plan a','selected plan');
  await page.locator('#interest-plan').screenshot({path:path.join(dir,`interest-plan-${interest}-${lang}-${width}.png`)});
  await page.reload();
  await plan(page,lang,interest);
  await page.locator('[data-action="language"]').click();
  await plan(page,otherLang,interest);
  await page.goBack();
  await plan(page,lang,interest);

  await page.locator('#interest-plan .interest-start').click();
  await stop(page,lang,interest,0);
  await page.reload();
  await stop(page,lang,interest,0);
  await page.locator('[data-action="language"]').click();
  await stop(page,otherLang,interest,0);
  await page.goBack();
  await stop(page,lang,interest,0);
  await page.goForward();
  await stop(page,otherLang,interest,0);
  await page.locator('[data-action="language"]').click();
  await stop(page,lang,interest,0);
  await page.locator('.journey-next').click();
  await stop(page,lang,interest,1);
  await page.goBack();
  await stop(page,lang,interest,0);
  await page.goForward();
  await stop(page,lang,interest,1);
  await page.reload();
  await stop(page,lang,interest,1);

  await page.locator('.journey-switch').click();
  await plan(page,lang,interest);
  equal(new URL(page.url()).hash,'#home-classic-heading','switch lands at the interest chooser');
  // Change the selection in-place, then switch back before restarting this path.
  const alternative=Object.keys(routes).find(value=>value!==interest);
  await card(page,alternative).click();
  await plan(page,lang,alternative);
  await card(page,interest).click();
  await plan(page,lang,interest);
  await page.locator('#interest-plan .interest-start').click();
  for(let index=0;index<routes[interest].length;index++){
    await stop(page,lang,interest,index,{screenshot:true,width});
    await storageCheck(page);
    if(index<routes[interest].length-1)await page.locator('.journey-next').click();
  }
  await page.reload();
  await stop(page,lang,interest,3);

  // A deliberate query/hash fixture isolates Browse freely's URL-preservation
  // contract without opening story content or depending on route-specific UI.
  const beforeExit=await page.evaluate(()=>{
    history.replaceState(history.state,'',location.pathname+'?interest-test=preserved#main');
    return location.href;
  });
  await page.locator('[data-action="journey-exit"]').click();
  await page.waitForFunction(()=>!document.querySelector('.journey-continuation'));
  equal(page.url(),beforeExit,'Browse freely preserves the current route, query and fragment');
  equal(await stateId(page),null,'Browse freely clears active journey state');
  await page.reload();
  equal(await page.locator('.journey-continuation').count(),0,'reload does not revive an exited journey');
  equal(page.url(),beforeExit,'exited URL survives reload');
  await spoilersStayClosed(page,'completed path and exit');
  await storageCheck(page);
}

async function optedInResume(page,lang,width){
  currentCase=`${lang}/${width}/functional-opt-in`;
  await page.goto(base+routePath(lang,'home'));
  await page.locator('.privacy-banner [data-action="privacy-open"]').click();
  await page.locator('#privacy-functional').check();
  await page.locator('#privacy-analytics').uncheck();
  await page.locator('[data-action="privacy-save"]').click();
  await storageCheck(page,true);
  for(const interest of Object.keys(routes)){
    currentCase=`${lang}/${width}/${interest}/resume`;
    await chooseAndStart(page,lang,interest);
    await page.locator('.journey-next').click();
    await stop(page,lang,interest,1);
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('barricade-last-journey')));
    equal({id:saved?.id,route:saved?.route},{id:journeyId(interest),route:routes[interest][1]},
      'existing last-journey record saves the actual interest stop');
    await page.locator('.header .brand').click();
    await page.reload();
    const resume=page.locator(`.home-memory [data-resume-journey="${journeyId(interest)}"]`);
    equal(await resume.count(),1,'opted-in journey is resumable after a home reload');
    equal(await resume.getAttribute('href'),routePath(lang,routes[interest][1]),'resume href is the actual saved stop');
    await page.locator('.home-memory').screenshot({path:path.join(dir,`interest-resume-${interest}-${lang}-${width}.png`)});
    await resume.click();
    await stop(page,lang,interest,1);
    await page.reload();
    await stop(page,lang,interest,1);
    await storageCheck(page,true);
  }
}

async function withoutJavaScript(browser,lang,width){
  currentCase=`${lang}/${width}/no-js`;
  const {context,page}=await makeContext(browser,lang,width,false);
  try{
    for(const interest of Object.keys(routes)){
      await page.goto(base+routePath(lang,'home'));
      equal(await page.locator('.path-card[data-interest]').count(),3,'static HTML retains all three interest anchors');
      equal(await card(page,interest).getAttribute('href'),routePath(lang,routes[interest][0]),'static anchor has a useful first-route fallback');
      equal(await page.locator('details.home-more-paths [data-home-journey]').count(),5,'static HTML retains all older journeys');
      await card(page,interest).click();
      equal(new URL(page.url()).pathname,routePath(lang,routes[interest][0]),'card works without JavaScript');
      equal(await page.locator('h1').count(),1,'fallback destination has its page heading');
      equal(await page.locator('.story-chapter, #show-slide, .novel-event').count(),0,'no-JS fallback does not expose protected plot content');
      await noOverflow(page,'no-JS fallback');
    }
  }finally{await context.close();}
}

(async()=>{
  fs.mkdirSync(dir,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
  try{
    for(const lang of ['he','en'])for(const width of [1365,390,320]){
      currentCase=`${lang}/${width}/home`;
      const {context,page,errors}=await makeContext(browser,lang,width);
      try{
        await initialHome(page,lang,width);
        for(const interest of Object.keys(routes))await exerciseInterest(page,lang,width,interest);
        await optedInResume(page,lang,width);
        equal(errors,[],'no uncaught browser errors');
      }catch(error){
        if(!page.isClosed()){
          await page.screenshot({path:path.join(dir,`interest-failure-${lang}-${width}.png`)}).catch(()=>{});
          fs.writeFileSync(path.join(dir,`interest-failure-${lang}-${width}.json`),JSON.stringify({
            case:currentCase,url:page.url(),error:error.stack,errors,
            state:await page.evaluate(()=>history.state).catch(()=>null)
          },null,2));
        }
        throw error;
      }finally{await context.close();}
      await withoutJavaScript(browser,lang,width);
    }
  }finally{
    await browser.close();
  }
  console.log(`Interest paths: ${checks} browser checks passed; HE/EN at 1365/390/320, all three four-stop paths, selection, Start, Next, Back/Forward, language, reload, switch, completion, URL-safe exit, spoiler boundaries, no-consent storage, opted-in resume and no-JS anchors.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
