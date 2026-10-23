'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.SEARCH_TEST_URL||'http://localhost:8873',dir=path.join(process.env.SEARCH_ARTIFACT_DIR||'test-results','compact-entry');
(async()=>{
 fs.mkdirSync(dir,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
 let checks=0;const report=[];const check=(v,m)=>{assert.ok(v,m);checks++};
 for(const lang of ['he','en'])for(const width of [1365,390,360,320]){
  const c=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await c.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`${base}/${lang}/home/`);await p.evaluate(()=>document.fonts.ready);await p.locator('[data-action="privacy-reject"]').first().click();
  check(await p.locator('.vinyl,.feature-split,.feature-copy a[data-gallery-link]').count()===0,'Removed promotional clutter stays absent');
  check(await p.locator('.path-card').count()===2,'Two focused audience entrances');
  for(const action of await p.locator('.path-card').all()){await action.focus();check(await action.evaluate(e=>e===document.activeElement),'Audience entrances remain keyboard reachable')}
  await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:path.join(dir,`${lang}-home-${width}.png`),fullPage:true});
  await p.goto(`${base}/${lang}/novel-journey/`);await p.evaluate(()=>document.fonts.ready);
  const first=p.locator('.reader-start .btn').first();
  check(await first.getAttribute('href')===`/${lang}/novel-journey/?focus=chapter%3Ap1-b1-c1`,'First-chapter primary is exact');
  const pos=await first.evaluate(e=>({top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,parts:document.querySelector('#reader-parts-panel').getBoundingClientRect().top,settings:document.querySelector('.reader-settings').getBoundingClientRect().top}));
  check(pos.bottom<=pos.parts&&pos.bottom<pos.settings,'Primary reading action precedes hierarchy and optional settings');
  const b=await first.boundingBox();check(b.width>=44&&b.height>=44,'Primary has a usable 44px target');
  check(await p.locator('.reader-part-card').count()===5,'All five substantial Part overviews remain');
  check(await p.locator('[data-overview-spoilers][open],.reader-settings[open]').count()===0,'Overviews and secondary settings start closed');
  await p.screenshot({path:path.join(dir,`${lang}-novel-${width}-entry.png`)});await p.screenshot({path:path.join(dir,`${lang}-novel-${width}.png`),fullPage:true});report.push({lang,width,primary:pos});
  for(let part=1;part<=5;part++){
   if(part>1)await p.locator(`.reader-breadcrumbs a[href="/${lang}/novel-journey/"]`).click();
   const choice=p.locator(`[data-reader-part="p${part}"] > a[data-reader-link]`);await choice.focus();await p.keyboard.press('Enter');
   check(new URL(p.url()).searchParams.get('focus')===`part:p${part}`,'Exact Part focus URL');
   check(await p.locator('#reader-part-panel').evaluate(e=>e===document.activeElement),'Selected Part receives keyboard focus');
   check(await p.locator('.reader-breadcrumbs [aria-current="page"]').count()===1,'One exact current breadcrumb');
   check(await p.locator('[data-novel-event]').count()===0,'Whole-novel recap remains closed');
  }
  await p.goBack();check(await p.locator('.reader-part-card').count()===5,'Back restores Part chooser');await p.goBack();check(new URL(p.url()).searchParams.get('focus')==='part:p4','Back restores the previous Part');await p.goForward();await p.goForward();check(new URL(p.url()).searchParams.get('focus')==='part:p5','Forward restores exact Part');
  await p.locator('[data-action="language"]').click();check(new URL(p.url()).searchParams.get('focus')==='part:p5','Language keeps selected Part');check(await p.locator('.reader-breadcrumbs [aria-current="page"]').count()===1,'Translated current Part indicated');
  await p.reload();check(new URL(p.url()).searchParams.get('focus')==='part:p5','Reload keeps shareable Part');check(await p.locator('[data-completion-progress]').evaluate(e=>e.value)===0,'Navigation never marks chapters complete');
  for(const route of ['screen','map']){await p.goto(`${base}/${lang}/${route}/`);await p.evaluate(()=>document.fonts.ready);check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Representative route fits viewport');await p.screenshot({path:path.join(dir,`${lang}-${route}-${width}.png`),fullPage:true});}
  check(errors.length===0,'No browser exceptions');await c.close();
 }
 // Native fragment and disclosure behavior remain available without client JavaScript.
 for(const lang of ['he','en'])for(const motion of ['no-preference','reduce']){
  const c=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900},reducedMotion:motion}),p=await c.newPage();
  await p.goto(`${base}/${lang}/novel-journey/`);check(await p.locator('.reader-part-card').count()===5,'No-JS retains five Part choices');
  await p.locator('.reader-start a[href="#reader-parts-panel"]').click();
  let geometry,previous,settled=false;const deadline=Date.now()+5000;
  do{geometry=await p.locator('#reader-parts-panel').evaluate(e=>{const r=e.getBoundingClientRect();return{top:r.top,bottom:r.bottom,height:innerHeight,scrollY,hash:location.hash,targets:document.querySelectorAll('#reader-parts-panel').length}});settled=geometry.top>=-2&&geometry.top<geometry.height&&previous&&Math.abs(geometry.top-previous.top)<.5;if(settled)break;previous=geometry;await new Promise(resolve=>setTimeout(resolve,100));}while(Date.now()<deadline);
  check(settled,'Native choose-place fragment settles at the Part chooser');check(geometry.hash==='#reader-parts-panel'&&geometry.targets===1,'No-JS retains one exact chooser target');
  const overview=p.locator('[data-reader-part="p5"] [data-overview-spoilers]');await overview.locator(':scope > summary').click();check(await overview.locator('.reader-overview>p').count()===0,'No-JS retains spoiler-safe overview');check(await overview.locator('noscript').isVisible(),'No-JS explains optional overview');
  check(await p.locator('.reading-locator noscript article details a').count()===365,'All exact original-text chapter destinations remain available');
  fs.writeFileSync(path.join(dir,`${lang}-novel-nojs-${motion}.json`),JSON.stringify(geometry,null,2));await p.screenshot({path:path.join(dir,`${lang}-novel-nojs-${motion}.png`)});await c.close();
 }
 await browser.close();fs.writeFileSync(path.join(dir,'metrics.json'),JSON.stringify({checks,report},null,2));console.log(`Compact entry: ${checks} HE/EN desktop/390/360/320 checks, chapter-first entry, Part hierarchy, keyboard/history/language and native no-JS navigation.`);
})().catch(e=>{console.error(e);process.exit(1)});
