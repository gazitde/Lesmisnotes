const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.SEARCH_TEST_URL||'http://localhost:8896';
const dir=process.env.SEARCH_ARTIFACT_DIR||'test-results/listening-pointers';

(async()=>{
 fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
 let checks=0;
 const matrix=[];
 const check=(value,message)=>{assert.ok(value,message);checks++};
 try {
  for(const lang of ['he','en']) for(const width of [1365,390,320]) {
   const start=checks;
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
   const requests=[],blocked=[],errors=[],toggleRequestObservations=[];
   await context.route('**/*',r=>{
    requests.push(r.request().url());
    if(new URL(r.request().url()).origin===new URL(base).origin)return r.continue();
    blocked.push(r.request().url());return r.abort();
   });
   const page=await context.newPage();
   page.on('pageerror',e=>errors.push(e.message));
   page.setDefaultTimeout(10000);
   const fit=async(label)=>check(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),`${lang}/${width}: ${label} fits viewport`);
   const capture=async(name,locator)=>{await locator.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(dir,`${name}-${lang}-${width}.png`)});};
   const goto=async(route,query='')=>{await page.goto(`${base}/${lang}/${route}/${query}`);await page.waitForFunction(()=>Boolean(window.ListeningPointers));};
   async function backTo(route,locale,clip=null){
    await Promise.all([
     page.waitForURL(url=>url.pathname===`/${locale}/${route}/`&&(clip===null||url.searchParams.get('clip')===clip)),
     page.goBack()
    ]);
    await page.waitForFunction(l=>document.documentElement.lang===l,locale);
   }
   async function pointers(scope,id,{keyboard=true,locale=lang}={}) {
    const label=`${scope}:${id}`;
    const box=page.locator(`[data-listening-pointers="${label}"]`);
    check(await box.count()===1,`${lang}/${width}: exactly one ${label}`);
    check(await box.evaluate(e=>e.tagName==='DETAILS'),`${label}: native disclosure`);
    check(await box.getAttribute('open')===null,`${label}: collapsed by default`);
    check(await box.locator('li').count()===3,`${label}: three points`);
    const expected=await page.evaluate(({scope,id,locale})=>window.LISTENING_POINTERS[scope][id].map(p=>p[locale]),{scope,id,locale});
    assert.deepEqual(await box.locator('li').allTextContents(),expected,`${label}: exact ${locale} content`);checks++;
    const activeContent='iframe,img,video,audio,script,source,embed,object,a,button,input,[data-video-shell]';
    check(await box.locator(activeContent).count()===0,`${label}: text only`);
    const summary=box.locator(':scope > summary');
    check((await summary.textContent())===(locale==='he'?'נקודות להקשבה ולמחשבה':'Pointers for listening and thinking'),`${label}: localized summary`);
    await summary.scrollIntoViewIfNeeded();await summary.focus();
    // Observe requests without attributing unrelated lazy-media work to a hint toggle.
    // The assertions are scoped to this disclosure; the module's no-network/no-storage
    // implementation is checked separately by the unit suite.
    const beforeRequests=requests.length;
    if(keyboard)await page.keyboard.press('Enter');else await summary.click();
    check(await box.evaluate(e=>e.open),`${label}: opens`);
    check(await box.locator('li').first().isVisible(),`${label}: points visible after opening`);
    check(await summary.evaluate(e=>document.activeElement===e),`${label}: native keyboard focus retained`);
    check(await box.locator(activeContent).count()===0,`${label}: opening keeps the disclosure text-only`);
    const requestsDuringToggle=requests.slice(beforeRequests);
    if(requestsDuringToggle.length)toggleRequestObservations.push({label,requests:requestsDuringToggle});
    await fit(label);
    if(keyboard){
     await page.keyboard.press('Space');check(!await box.evaluate(e=>e.open),`${label}: Space closes`);
     await page.keyboard.press('Enter');check(await box.evaluate(e=>e.open),`${label}: Enter reopens`);
     await page.keyboard.press('Space');check(!await box.evaluate(e=>e.open),`${label}: repeated close`);
    }else await summary.click();
    return box;
   }

   await goto('musical-journey','?focus=song%3Astars');
   const moduleCounts=await page.evaluate(()=>Object.fromEntries(Object.entries(window.LISTENING_POINTERS).map(([k,v])=>[k,Object.keys(v).length])));
   check(await page.locator('[data-listening-pointers^="songs:"]').count()===0,'Story pointers absent before consent');
   check(await page.locator('#show-journey').count()===0,'Full journey absent before consent');
   for(const id of ['01','02','03'])await pointers('opening',id);
   await page.locator('.music-primer-disclosure > summary').click();
   for(const id of ['solo','dialogue','ensemble','reprise'])await pointers('primer',id);
   await page.locator('.music-primer-disclosure > summary').click();
   await page.locator('[data-action="show-open"]').click();
   const options=await page.locator('[data-show-select] option').evaluateAll(es=>es.map(e=>({value:e.value,text:e.textContent})));
   check(options.length===39,'38 song options plus an actual interval');
   const songIds=await page.evaluate(()=>window.RESEARCH.musical.songentries.map(s=>s.id));
   check(songIds.length===38,'38 source songs');
   let songsSeen=0;
   const performancesSeen=[];
   for(const option of options) {
    await page.locator('[data-show-select]').selectOption(option.value);
    if(await page.locator('.interval-slide').count()){
     check(await page.locator('[data-listening-pointers^="songs:"]').count()===0,'Interval has no stale song pointers');continue;
    }
    await pointers('songs',songIds[songsSeen++]);
    const comparison=page.locator('[data-journey-performance]');
    if(await comparison.count()){
     check(await comparison.count()===1,'Only the current song comparison is present');
     const id=await comparison.getAttribute('data-journey-performance');
     await comparison.locator(':scope > summary').click();
     await pointers('performances',id);
     await comparison.locator(':scope > summary').click();
     performancesSeen.push(id);
    }
   }
   check(songsSeen===38,'All 38 song disclosures exercised');
   assert.deepEqual(performancesSeen.slice().sort(),['QBEGzbdKwo8','nPfd5-gS5IA','YKH4Vwb8xGg','xtTprJtCkdk'].sort(),'All four nested performance questions exercised');checks++;
   await page.locator('[data-show-select]').selectOption('13');
   let stars=page.locator('[data-listening-pointers="songs:stars"]');
   await stars.locator('summary').click();await capture('pointers-song',stars);
   await page.locator('[data-show-select]').selectOption('14');
   check(await stars.count()===0,'Changing song removes old disclosure');
   await page.locator('[data-show-select]').selectOption('13');
   check(await stars.getAttribute('open')===null,'Returning to song resets disclosure');
   await stars.locator('summary').click();
   await page.locator('[data-action="language"]').click();
   const other=lang==='he'?'en':'he';
   await page.waitForURL(url=>url.pathname===`/${other}/musical-journey/`);
   await page.waitForFunction(l=>document.documentElement.lang===l,other);
   await pointers('songs','stars',{locale:other});
   await backTo('musical-journey',lang);
   await page.locator('[data-listening-pointers="songs:stars"]').waitFor({state:'visible'});
   await pointers('songs','stars');
   await page.locator('[data-action="spoilers"]').click();
   check(await page.locator('[data-listening-pointers^="songs:"]').count()===0,'Withdrawing consent removes song pointers');
   check(await page.locator('[data-listening-pointers^="performances:"]').count()===0,'Withdrawing consent removes protected performance pointers');

   await goto('musical');
   const spotIds=await page.evaluate(()=>Object.keys(window.LISTENING_POINTERS.spotlight));
   check(spotIds.length===7,'Seven spotlight songs');
   for(const id of spotIds){await page.locator(`[data-featured-song="${id}"]`).click();await pointers('spotlight',id);}
   const spotlight=page.locator('[data-listening-pointers^="spotlight:"]');
   await spotlight.locator('summary').click();await capture('pointers-spotlight',spotlight);
   const recordingIds=await page.evaluate(()=>Object.keys(window.LISTENING_POINTERS.recordings));
   for(const id of recordingIds){
    const outer=page.locator(`[data-recording="${id}"] .recording-notes`);
    await outer.locator(':scope > summary').click();await pointers('recordings',id);await outer.locator(':scope > summary').click();
   }

   await goto('listening','?clip=JMGMSgPHJoI');
   await pointers('groups','bring-home');
   await page.locator('[data-listening-pointers="groups:bring-home"] > summary').click();
   await page.locator('.gallery-versions [data-gallery-clip="u_eCLahh91s"]').click();
   check(await page.locator('[data-listening-pointers="groups:bring-home"]').getAttribute('open')===null,'Version switch resets group hints');
   await backTo('listening',lang,'JMGMSgPHJoI');
   await page.locator('[data-listening-pointers="groups:bring-home"]').waitFor({state:'visible'});
   check(new URL(page.url()).searchParams.get('clip')==='JMGMSgPHJoI','Back restores selected gallery clip');
   await pointers('groups','bring-home');
   await goto('listening','?clip=5mJ08-pyDLg');
   check(await page.locator('[data-listening-pointers="groups:piano"]').count()===0,'Item-specific question replaces generic group hints');
   await pointers('items','5mJ08-pyDLg');

   await goto('listening','?clip=_6nTyXcmgLc');
   for(const id of ['voice','body','setting']){
    await page.locator(`.gallery-lesson [data-lens="${id}"]`).click();await pointers('lenses',id);
    const current=page.locator(`[data-listening-pointers="lenses:${id}"]`);await current.locator('summary').click();
   }
   await page.locator('.gallery-lesson [data-lens="voice"]').click();
   check(await page.locator('#lens-pointers [data-listening-pointers]').count()===1,'Lens switch leaves just one current disclosure');
   await pointers('lenses','voice');
   await page.locator('[data-listening-pointers="lenses:voice"] > summary').click();
   await capture('pointers-gallery',page.locator('#lens-pointers'));
   await page.locator('[data-gallery-close]').click();
   check(await page.locator('#gallery-detail [data-listening-pointers]').count()===0,'Closing gallery removes hints');
   await backTo('listening',lang,'_6nTyXcmgLc');
   await page.locator('#lens-pointers details').waitFor({state:'visible'});
   check(new URL(page.url()).searchParams.get('clip')==='_6nTyXcmgLc','Back reopens matching gallery');
   check(await page.locator('#lens-pointers details').getAttribute('open')===null,'Back does not revive stale open hints');

   await goto('listening','?clip=0BM-Q3BDrkw');
   check(await page.locator('[data-gallery-reveal]').count()===1,'Major-spoiler gallery gate present');
   check(await page.locator('#gallery-detail [data-listening-pointers]').count()===0,'No major-spoiler hints before consent');
   await page.locator('[data-gallery-reveal]').click();await pointers('groups','empty-chairs');
   await page.locator('.gallery-versions [data-gallery-clip="6YF0XNMpyoM"]').click();
   check(await page.locator('[data-listening-pointers="groups:empty-chairs"]').count()===0,'Major-spoiler item overrides group question');
   await pointers('items','6YF0XNMpyoM');
   await page.locator('[data-action="spoilers"]').click();
   check(await page.locator('#gallery-detail [data-listening-pointers]').count()===0,'Withdrawing consent removes gallery item hints');
   check(await page.locator('[data-gallery-reveal]').count()===1,'Withdrawing restores gallery gate');
   await fit('withdrawn gallery');
   check(errors.length===0,`No page errors: ${errors.join('; ')}`);
   matrix.push({lang,width,checks:checks-start,moduleCounts,blockedExternalRequests:blocked.length,toggleRequestObservations,songsExercised:songsSeen,performancesExercised:performancesSeen.length,spotlightsExercised:spotIds.length,recordingsExercised:recordingIds.length});
   await context.close();
   console.log(`Listening pointers: ${lang}/${width} passed (${checks-start} checks).`);
  }
  fs.writeFileSync(path.join(dir,'listening-pointers-results.json'),JSON.stringify({checks,base,matrix,limits:['External requests blocked; no audio playback verified.','Request observations during toggles may include unrelated lazy-media activity; no causal network claim is made.','No physical device or screen-reader testing.']},null,2)+'\n');
  console.log(`Listening pointers: ${checks} browser checks passed across HE/EN desktop/390/320.`);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
