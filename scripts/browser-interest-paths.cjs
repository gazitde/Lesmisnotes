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

const primaryHref=(lang,interest)=>interest==='musical'?routePath(lang,'musical-journey'):routePath(lang,'novel-journey')+'?focus=chapter%3Ap1-b1-c1';
const entranceHref=(lang,interest)=>routePath(lang,interest==='musical'?'musical-journey':'novel-journey');
async function plan(page,lang,interest){
  await page.waitForFunction(({lang,interest})=>location.pathname===`/${lang}/home/`&&new URLSearchParams(location.search).get('interest')===interest&&document.querySelector('.home-selected #interest-plan'),{lang,interest});
  equal(await page.locator('.path-card,.home-opening .hero').count(),0,'selected home removes the previous chooser and promotional hero');
  equal(await page.locator('h1').count(),1,'selected home has one heading');
  equal(await page.locator('#interest-plan').count(),1,'exactly one audience plan');
  check(await page.locator('#interest-plan-title').isVisible(),'plan heading visible');
  equal(await page.locator('#interest-plan .interest-start').count(),1,'one primary action');
  equal(await page.locator('#interest-plan .interest-start').getAttribute('href'),primaryHref(lang,interest),'primary dedicated journey destination');
  const supporting=interest==='musical'?['before','listening','screen']:['characters','map','hugo'];
  equal(await page.locator('.audience-option-grid a').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href'))),supporting.map(route=>routePath(lang,route)),'three supporting destinations remain available');
  equal(await page.locator('.interest-selection .journey-switch').count(),1,'one clear switch action');
  equal(await stateId(page),null,'selection does not begin an unrelated guided tour');
  await noOverflow(page,'audience plan');await spoilersStayClosed(page,'audience plan');
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
  equal(await continuation.locator('.journey-current > span > bdi').innerText(),`${index+1} / ${routes[interest].length}`,'isolated progress identifies the actual stop');
  check(new RegExp(`\\b${index+1}\\s*/\\s*${routes[interest].length}\\b`).test(await continuation.innerText()),
    `continuation identifies stop ${index+1} of ${routes[interest].length}`);
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


async function initialHome(page,lang,width){
  await page.goto(base+routePath(lang,'home'));
  equal(await page.locator('.path-card[data-interest]').count(),2,'exactly two audience entrances');
  equal(await page.locator('.path-card[aria-current="true"]').count(),0,'fresh home makes no silent selection');
  for(const interest of Object.keys(routes))equal(await card(page,interest).getAttribute('href'),entranceHref(lang,interest),'useful no-JS destination');
  equal(await page.locator('[data-interest="both"], [data-home-journey], .home-more-paths, .vinyl, .hero-band, [data-moment-entry]').count(),0,'no old chooser or promotional clutter');
  await noOverflow(page,'fresh home');
  await page.screenshot({path:path.join(dir,`interest-home-first-${lang}-${width}.png`)});
  await touchTargets(page,'.path-card[data-interest]','audience choices');
  await storageCheck(page);
}

async function exerciseInterest(page,lang,width,interest){
  currentCase=`${lang}/${width}/${interest}`;
  const otherLang=lang==='he'?'en':'he';
  await page.goto(base+routePath(lang,'home'));await card(page,interest).click();await plan(page,lang,interest);
  await touchTargets(page,'#interest-plan .interest-start','primary action');
  await page.locator('.audience-more > summary').click();await touchTargets(page,'.audience-option-grid a','supporting actions');
  await page.locator('#interest-plan').screenshot({path:path.join(dir,`interest-plan-${interest}-${lang}-${width}.png`)});
  await page.reload();await plan(page,lang,interest);
  await page.locator('[data-action="language"]').click();await plan(page,otherLang,interest);
  await page.goBack();await plan(page,lang,interest);
  const alternative=interest==='musical'?'novel':'musical';
  await page.locator('.interest-selection .journey-switch').click();
  equal(await page.locator('.path-card').count(),2,'Switch returns to both choices');
  await card(page,alternative).click();await plan(page,lang,alternative);
  await page.goBack();equal(await page.locator('.path-card').count(),2,'Back restores chooser');
  await page.goBack();await plan(page,lang,interest);
  await page.goForward();equal(await page.locator('.path-card').count(),2,'Forward restores chooser');
  await card(page,interest).click();await plan(page,lang,interest);
  await page.locator('#interest-plan .interest-start').click();
  equal(new URL(page.url()).pathname,entranceHref(lang,interest),'primary opens the dedicated journey');
  equal(await page.locator('.journey-continuation').count(),0,'No competing guided-tour bar above dedicated journey');
  if(interest==='musical'){
    equal(await page.locator('.musical-journey-orientation').count(),1,'Musical starts with safe listening orientation');
    equal(await page.locator('#show-slide').count(),0,'Full musical stays gated');
    equal(await page.locator('iframe[src*="autoplay=1"]').count(),0,'no autoplay');
  }else{
    await page.locator('#reading-book-panel[data-reader-ready="true"]').waitFor();
    equal(new URL(page.url()).searchParams.get('focus'),'chapter:p1-b1-c1','Novel primary opens the first chapter');
    equal(await page.locator('.chapter-summary-text').count(),1,'Novel primary presents one chapter');
    await page.locator('.chapter-slide-nav .slide-next').click();await page.locator('#reader-chapter-p1-b1-c2').waitFor();
    await page.goBack();await page.locator('#reader-chapter-p1-b1-c1').waitFor();
    await page.goForward();await page.locator('#reader-chapter-p1-b1-c2').waitFor();
    await page.locator('[data-action="language"]').click();await page.locator('#reader-chapter-p1-b1-c2').waitFor();
    equal(new URL(page.url()).searchParams.get('focus'),'chapter:p1-b1-c2','Language keeps actual chapter');
    await page.reload();await page.locator('#reader-chapter-p1-b1-c2').waitFor();
    equal(await page.locator('.chapter-summary-text').count(),1,'Reload remains focused');
  }
  await spoilersStayClosed(page,'primary destination');await storageCheck(page);
}

async function optedInResume(page,lang,width){
  currentCase=`${lang}/${width}/functional-opt-in`;
  await page.goto(base+routePath(lang,'home')+'?interest=choose');
  await page.locator('.privacy-banner [data-action="privacy-open"]').click();
  await page.locator('#privacy-functional').check();await page.locator('#privacy-analytics').uncheck();
  await page.locator('[data-action="privacy-save"]').click();await storageCheck(page,true);
  // Existing guided-tour records stay supported, independently of the new chapter-first entry.
  const interest='novel';
  await page.evaluate(()=>localStorage.setItem('barricade-last-journey',JSON.stringify({id:'interest-novel',route:'characters',updatedAt:Date.now()})));
  await page.goto(base+routePath(lang,'home')+'?interest=choose');
  const resume=page.locator('.home-memory [data-resume-journey="interest-novel"]');
  equal(await resume.count(),1,'Existing opted-in guided-tour record remains resumable');
  equal(await resume.getAttribute('href'),routePath(lang,'characters'),'Legacy resume points to its actual stop');
  await resume.click();await stop(page,lang,interest,1);await page.reload();await stop(page,lang,interest,1);
  await page.locator('.journey-next').click();await stop(page,lang,interest,2);
  await page.locator('.journey-next').click();await stop(page,lang,interest,3);
  const beforeExit=await page.evaluate(()=>{history.replaceState(history.state,'',location.pathname+'?interest-test=preserved#main');return location.href;});
  await page.locator('[data-action="journey-exit"]').click();equal(page.url(),beforeExit,'Browse freely preserves URL');
  equal(await stateId(page),null,'Browse freely clears legacy journey state');
  await page.reload();equal(await page.locator('.journey-continuation').count(),0,'Exit survives reload');
  await page.goto(base+routePath(lang,'novel-journey')+'?focus=part%3Ap2');
  await page.goto(base+routePath(lang,'home')+'?interest=novel');
  const readingStart=page.locator('#interest-plan .interest-start');
  equal(await readingStart.getAttribute('href'),routePath(lang,'novel-journey')+'?focus=part%3Ap2','Novel primary resumes the saved reading location');
  await readingStart.click();equal(new URL(page.url()).searchParams.get('focus'),'part:p2','Saved reading opens actual Part');
  await spoilersStayClosed(page,'saved reading primary');await storageCheck(page,true);
}

async function withoutJavaScript(browser,lang,width){
  currentCase=`${lang}/${width}/no-js`;
  const {context,page}=await makeContext(browser,lang,width,false);
  try{
    for(const interest of Object.keys(routes)){
      await page.goto(base+routePath(lang,'home'));
      equal(await page.locator('.path-card[data-interest]').count(),2,'static HTML retains both interest anchors');
      equal(await card(page,interest).getAttribute('href'),entranceHref(lang,interest),'static anchor has a useful dedicated-journey fallback');
      equal(await page.locator('details.home-more-paths [data-home-journey]').count(),0,'static HTML omits the older chooser');
      await card(page,interest).click();
      equal(new URL(page.url()).pathname,entranceHref(lang,interest),'card works without JavaScript');
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
  console.log(`Interest paths: ${checks} browser checks passed; HE/EN at 1365/390/320, two audience plans, musical viewing primary, novel continuation, Back/Forward, language, reload, switch, completion, URL-safe exit, spoiler boundaries, no-consent storage, opted-in resume and no-JS anchors.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
