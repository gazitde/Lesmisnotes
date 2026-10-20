'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.SEARCH_TEST_URL||'http://localhost:8873',dir=path.join(process.env.SEARCH_ARTIFACT_DIR||'test-results','visual-programme');
(async()=>{
 fs.mkdirSync(dir,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});let checks=0;
 const check=(v,m)=>{assert.ok(v,m);checks++};
 for(const lang of ['en','he'])for(const width of [1440,820,680,390,320]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const route of ['home','novel-journey','musical-journey']){
   await page.goto(`${base}/${lang}/${route}/`);await page.evaluate(()=>document.fonts.ready);
   if(await page.locator('.privacy-banner [data-action="privacy-reject"]').isVisible())await page.locator('.privacy-banner [data-action="privacy-reject"]').click();
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${lang}/${route}/${width} no horizontal overflow`);
   check(await page.locator('h1').count()===1,'One primary heading');
   if(route==='home'){
    check(await page.locator('.hero-art img').isVisible(),'Hero artwork visible on desktop and mobile');
    check(await page.locator('.hero-art img').evaluate(e=>e.complete&&e.naturalWidth>0),'Local artwork loads');
    check(await page.locator('.path-frontispiece').count()===2,'Two original visual doors');
    for(const card of await page.locator('.path-card').all()){await card.focus();check(await card.evaluate(e=>e===document.activeElement),'Keyboard focus reaches each door');}
   }
   if(route==='musical-journey'){
    check(await page.locator('#show-slide').count()===0,'New masthead cannot reveal plot');
    check(await page.locator('.show-gate [data-action="show-open"]').isVisible(),'Explicit spoiler decision retained');
    const colors=await page.locator('.musical-journey-opening').evaluate(e=>({color:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor}));
    check(colors.color==='rgb(24, 41, 64)'&&colors.bg==='rgb(246, 240, 230)','Opening text retains explicit contrast');
   }
   await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(dir,`${lang}-${route}-${width}.png`),fullPage:route==='home'});
  }
  check(errors.length===0,'No JavaScript exceptions');await context.close();
 }
 await browser.close();console.log(`Visual programme: ${checks} HE/EN checks at 1440/820/680/390/320; artwork, contrast, keyboard focus, overflow and spoiler boundary.`);
})().catch(e=>{console.error(e);process.exit(1)});
