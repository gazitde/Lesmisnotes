const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.SEARCH_TEST_URL||'http://localhost:8873';
const dir=process.env.SEARCH_ARTIFACT_DIR||'test-results';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
 let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++};
 fs.mkdirSync(dir,{recursive:true});
 for(const lang of ['en','he'])for(const width of [1365,390,320]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  const page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  const active=()=>page.locator('[data-source-topic][aria-pressed="true"]').getAttribute('data-source-topic');
  const sourceState=()=>page.evaluate(()=>history.state.lesmisSources);
  const topicURL=topic=>`/${lang}/about/${topic?'?topic='+topic:''}#about-sources`;
  const atCatalogue=async(label)=>{
   try{
    await page.waitForFunction(()=>document.activeElement?.id==='about-sources'&&Math.abs(document.getElementById('about-sources')?.getBoundingClientRect().top)<200);
    const position=await page.locator('#about-sources').evaluate(e=>({top:e.getBoundingClientRect().top,focused:document.activeElement===e}));
    check(position.focused&&Math.abs(position.top)<200,`Catalogue is focused and in view (${lang}/${width}, ${label}, top=${position.top})`);
   }catch(error){
    const state=await page.evaluate(()=>({focus:document.activeElement?.id,top:document.getElementById('about-sources')?.getBoundingClientRect().top,href:location.href}));
    await page.screenshot({path:path.join(dir,`sources-failure-${lang}-${width}-${label}.png`)}).catch(()=>{});
    throw new Error(`Catalogue arrival failed (${lang}/${width}, ${label}): ${JSON.stringify(state)}`,{cause:error});
   }
  };
  await page.goto(base+'/'+lang+'/history/');
  await page.locator('[data-source-catalogue]').click();
  check(page.url().endsWith(topicURL('history-ideas')),'History opens its source topic');
  check(await active()==='history-ideas','History chip is selected');await atCatalogue('history-entry');
  const total=await page.evaluate(()=>new Set(window.RESEARCH.sources.map(s=>s.url)).size);
  check((await page.locator('#source-result-count').textContent()).includes(String(total)),'Full source count remains visible');
  check(await page.locator('.spoiler-switch.on').count()===0,'Topic navigation does not reveal spoilers');
  await page.screenshot({path:path.join(dir,`sources-history-${lang}-${width}.png`)});
  await page.locator('[data-source-topic="screen-video"]').click();
  check(await active()==='screen-video','Topic button filters results');
  const historyLength=await page.evaluate(()=>history.length);
  await page.locator('[data-source-topic="screen-video"]').click();
  check(await page.evaluate(()=>history.length)===historyLength,'Repeated topic clicks create no history noise');
  await page.goBack();check(await active()==='history-ideas','Back restores topic');await atCatalogue('back');
  await page.goForward();check(await active()==='screen-video','Forward restores topic');await atCatalogue('forward');
  await page.locator('#source-search').fill('Gutenberg');
  check(!page.url().includes('Gutenberg'),'Search text is not in the address');
  check(!JSON.stringify(await sourceState()).includes('Gutenberg')&&!Object.hasOwn(await sourceState(),'search'),'Search never enters browser history state');
  await page.reload();
  check(await active()==='screen-video'&&await page.locator('#source-search').inputValue()==='','Reload restores topic and clears private search');
  await page.locator('#source-search').fill('Gutenberg');
  await page.locator('[data-action="language"]').click();
  check(page.url().includes('/'+(lang==='he'?'en':'he')+'/about/?topic=screen-video'),'Language switch retains topic');
  check(await page.locator('#source-search').inputValue()==='Gutenberg','Language switch retains private search');await atCatalogue('language');
  await page.locator('.source-clear').click();
  check(await active()==='all'&&await page.locator('#source-search').inputValue()==='','Reset clears both filters');
  check(!new URL(page.url()).search,'Reset removes topic from address');
  await page.locator('#source-search').fill('Hugo');
  await page.locator('.source-clear').click();
  await page.goBack();check(await page.locator('#source-search').inputValue()==='Hugo','Same-URL Back restores private search');
  await page.goForward();check(await page.locator('#source-search').inputValue()==='','Same-URL Forward restores reset');
  await page.locator('[data-source-expand="all"]').click();
  check(await page.locator('#source-results .source-result-topics').count()===total,'All original sources are reachable');
  await page.reload();check(await page.locator('#source-results .source-result-topics').count()===total,'Reload retains expanded catalogue');
  await page.goto(base+topicURL('not-a-real-topic'));
  check(await active()==='all'&&!new URL(page.url()).search,'Invalid topic recovers to all and repairs URL');
  await page.goto(base+'/'+lang+'/about/?topic=history-ideas&topic=screen-video#about-sources');
  check(await active()==='all'&&!new URL(page.url()).search,'Ambiguous duplicate topics recover safely');
  await page.goto(base+'/'+lang+'/about/?topic=history-ideas');
  check(await active()==='history-ideas'&&new URL(page.url()).hash==='#about-sources','Topic-only direct URL lands at catalogue');await atCatalogue('topic-only');
  await page.goto(base+'/'+lang+'/screen/');
  await page.locator('[data-source-catalogue]').click();
  check(await active()==='screen-video','Screen opens the screen/video catalogue');await atCatalogue('screen-entry');
  check(await page.locator('#source-search').inputValue()==='','Fresh contextual visit does not inherit an old search');
  await page.goBack();check(new URL(page.url()).pathname==='/'+lang+'/screen/','Back returns to the originating section');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'No narrow-screen overflow');
  check(requests.every(url=>!url.includes('Gutenberg')&&!url.includes('Hugo')),'No private search text is transmitted');
  check(await page.evaluate(()=>!Object.keys(localStorage).some(k=>/source/i.test(k))&&!Object.keys(sessionStorage).some(k=>/source/i.test(k))),'No persistent application search storage');
  check(errors.length===0,'No runtime errors: '+errors.join('; '));await context.close();
 }
 for(const lang of ['en','he']){
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}});
  const page=await context.newPage();await page.goto(base+'/'+lang+'/history/');
  check(await page.locator('[data-source-catalogue]').getAttribute('href')===`/${lang}/about/?topic=history-ideas#about-sources`,'Contextual link works without JavaScript');
  await page.locator('[data-source-catalogue]').click();check(await page.locator('.source-static-fallback li').count()>=212,'Complete no-JS catalogue remains available');await context.close();
 }
 await browser.close();console.log(`Source navigation: ${checks} browser checks passed across HE/EN desktop, 390px and 320px; deep links, history, reload, language, invalid topics, memory-only search, complete catalogue and no-JS fallback.`);
})().catch(e=>{console.error(e);process.exit(1)});
