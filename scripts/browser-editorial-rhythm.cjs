'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.SEARCH_TEST_URL||'http://localhost:8873',dir=path.join(process.env.SEARCH_ARTIFACT_DIR||'test-results','editorial-rhythm');
(async()=>{
 fs.mkdirSync(dir,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});let checks=0;
 const check=(v,m)=>{assert.ok(v,m);checks++};
 for(const lang of ['he','en'])for(const width of [1365,390,320]){
  const c=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await c.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  const page=await c.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const route of ['history','hugo','listening','story']){
   await page.goto(`${base}/${lang}/${route}/`);await page.evaluate(()=>document.fonts.ready);
   const reject=page.locator('[data-action="privacy-reject"]');if(await reject.count()&&await reject.first().isVisible())await reject.first().click();
   if(route==='story'){
    check(await page.locator('.story-chapter').count()===0,'Scene outcomes absent before consent');
    await page.locator('.gate [data-action="enable-spoilers"]').click();
    check(await page.locator('.story-chapter').count()===8,'Eight scenes after consent');
    const details=page.locator('.story-chapter details').first();await details.locator('summary').focus();await page.keyboard.press('Enter');
    check(await details.locator('.detail-body>p').count()===3,'Scene detail has three paragraphs');
    check(await details.locator('.detail-body>p').first().isVisible(),'Native disclosure opens by keyboard');
    check(await details.locator('.detail-body>p').nth(1).evaluate(e=>parseFloat(getComputedStyle(e).marginBlockStart)>=12),'Paragraph pause is visually present after CSS reset');
    await details.locator('summary').press('Enter');check(!(await details.locator('.detail-body>p').first().isVisible()),'Detail closes again');
    await details.locator('summary').press('Enter');
   }
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${lang}/${route}/${width} no overflow`);
   await page.screenshot({path:path.join(dir,`${lang}-${route}-${width}.png`),fullPage:route==='hugo'||route==='history'});
  }
  check(errors.length===0,'No runtime errors');await c.close();
 }
 await browser.close();console.log(`Editorial rhythm: ${checks} HE/EN checks; 1365/390/320, screenshots, disclosure keyboard and spoiler boundaries.`);
})().catch(e=>{console.error(e);process.exit(1)});
