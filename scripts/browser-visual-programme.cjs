'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.SEARCH_TEST_URL||'http://localhost:8873',dir=path.join(process.env.SEARCH_ARTIFACT_DIR||'test-results','visual-programme');
(async()=>{
 fs.mkdirSync(dir,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});let checks=0;
 const check=(v,m)=>{assert.ok(v,m);checks++};
 for(const lang of ['en','he'])for(const width of [1440,820,720,680,390,320]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const route of ['home','novel-journey','musical-journey','characters']){
   await page.goto(`${base}/${lang}/${route}/`);await page.evaluate(()=>document.fonts.ready);
   if(await page.locator('.privacy-banner [data-action="privacy-reject"]').isVisible())await page.locator('.privacy-banner [data-action="privacy-reject"]').click();
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${lang}/${route}/${width} no horizontal overflow`);
   check(await page.locator('h1').count()===1,'One primary heading');
   check(await page.locator('link[href^="/editorial.css?"]').count()===1,'Editorial presentation is included once');
   check(await page.locator('.nav-group-button').count()===6,'Six navigation hubs remain available');
   if(route==='home'){
    check(await page.locator('.hero-art img').isVisible(),'Hero artwork visible on desktop and mobile');
    check(await page.locator('.hero-art img').evaluate(e=>e.complete&&e.naturalWidth>0),'Local artwork loads');
    check(await page.locator('.path-card').count()===2,'Two audience doors remain');
    check(await page.locator('.hero-art img').getAttribute('src')==='/assets/paris-frontispiece.svg','Original local frontispiece loads');
    check(await page.locator('.home-discovery-door').count()===4,'All four discovery features remain');
    for(const selector of ['.hero-copy h1','.path-card h3','.home-discovery-door h3']){
     for(const item of await page.locator(selector).all())check(await item.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'Editorial headings fit their columns');
    }
    for(const card of await page.locator('.path-card').all()){await card.focus();check(await card.evaluate(e=>e===document.activeElement),'Keyboard focus reaches each door');}
   }
   if(route==='musical-journey'){
    check(await page.locator('#show-slide').count()===0,'New masthead cannot reveal plot');
    check(await page.locator('.show-gate [data-action="show-open"]').isVisible(),'Explicit spoiler decision retained');
    const colors=await page.locator('.musical-journey-opening').evaluate(e=>({color:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor}));
    check(colors.color==='rgb(24, 41, 64)'&&colors.bg==='rgb(246, 240, 230)','Opening text retains explicit contrast');
   }
   if(route==='characters'){
    check(await page.locator('.safe-character-card .character-portrait').count()===10,'All ten original portraits remain');
    check(await page.locator('.graph-node.selected').first().getAttribute('data-character')==='valjean','Character map selection is retained');
    const selectedColors=await page.locator('.graph-node.selected strong').first().evaluate(e=>({text:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor}));
    check(selectedColors.text==='rgb(255, 253, 247)'&&selectedColors.background==='rgb(23, 43, 59)','Selected character retains readable contrast');
    check(await page.locator('.graph-zone').first().evaluate(e=>getComputedStyle(e).opacity)==='1','Category opacity does not fade its text');
   }
   await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(dir,`${lang}-${route}-${width}.png`),fullPage:route==='home'});
  }
  check(errors.length===0,'No JavaScript exceptions');await context.close();
 }
 await browser.close();console.log(`Visual programme: ${checks} HE/EN checks at 1440/820/720/680/390/320; artwork, editorial headings, four discovery features, ten portraits, contrast, keyboard focus, overflow and spoiler boundary.`);
})().catch(e=>{console.error(e);process.exit(1)});
