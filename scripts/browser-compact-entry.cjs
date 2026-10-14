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
  await p.goto(`${base}/${lang}/home/`);await p.evaluate(()=>document.fonts.ready);
  await p.locator('[data-action="privacy-reject"]').first().click();
  const record=await p.locator('.vinyl').boundingBox();
  check(width>680?record.width>300:record.width>=180&&record.width<=210,`${lang}/${width} proportional record`);
  const geometry=await p.locator('.vinyl-label').evaluate(el=>({radius:el.clientWidth/2,overflow:el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1,children:[...el.children].map(e=>({left:e.offsetLeft,top:e.offsetTop,width:e.offsetWidth,height:e.offsetHeight,text:e.textContent,font:parseFloat(getComputedStyle(e).fontSize)}))}));
  check(!geometry.overflow,`${lang}/${width} label box fits`);
  for(const r of geometry.children){const x=Math.max(Math.abs(r.left-geometry.radius),Math.abs(r.left+r.width-geometry.radius)),y=Math.max(Math.abs(r.top-geometry.radius),Math.abs(r.top+r.height-geometry.radius));check(Math.hypot(x,y)<=geometry.radius-2,`${lang}/${width} label inside circle: ${r.text}`);if(r.text)check(r.font>=12,`${lang}/${width} readable decorative label`)}
  check(await p.locator('.vinyl').getAttribute('aria-hidden')==='true','Decorative record adds no keyboard stop');
  await p.locator('.feature-copy a[data-gallery-link]').focus();check(await p.locator('.feature-copy a[data-gallery-link]').evaluate(e=>e===document.activeElement),'Listening action remains keyboard reachable');
  await p.locator('.feature-split').screenshot({path:path.join(dir,`${lang}-listening-${width}.png`)});
  await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:path.join(dir,`${lang}-home-${width}.png`),fullPage:true});
  await p.goto(`${base}/${lang}/novel/`);await p.evaluate(()=>document.fonts.ready);
  const nav=p.locator('[data-reader-part-shortcuts]');check(await nav.locator('a').count()===5,'All five Parts have early direct entry');
  const pos=await nav.evaluate(e=>({top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,header:document.querySelector('.reading-locator>header').getBoundingClientRect().bottom,setup:document.querySelector('.reader-setup').getBoundingClientRect().top}));
  check(pos.top>=pos.header&&pos.bottom<=pos.setup,'Direct entry precedes all long orientation and summaries');
  for(const a of await nav.locator('a').all()){const b=await a.boundingBox();check(b.width>=44&&b.height>=44,'44px reading target')}
  check(await p.locator('.reader-part-card').count()===5,'All substantial Part overviews remain');
  await p.screenshot({path:path.join(dir,`${lang}-novel-${width}-entry.png`)});
  await p.screenshot({path:path.join(dir,`${lang}-novel-${width}.png`),fullPage:true});
  report.push({lang,width,record,nav:pos});
  for(let part=1;part<=5;part++){
   await nav.locator(`a[href*="part%3Ap${part}"]`).focus();await p.keyboard.press('Enter');
   check(new URL(p.url()).searchParams.get('focus')===`part:p${part}`,'Exact Part focus URL');
   check(await p.locator('#reader-part-panel').evaluate(e=>e===document.activeElement),'Selected Part receives keyboard focus');
   check(await nav.locator('a[aria-current="location"]').getAttribute('href').then(x=>x.includes(`part%3Ap${part}`)),'Selected Part is indicated');
   check(await p.locator('[data-novel-event]').count()===0,'Whole-novel recap remains closed');
  }
  await p.goBack();check(new URL(p.url()).searchParams.get('focus')==='part:p4','Back returns to previous Part');await p.goForward();check(new URL(p.url()).searchParams.get('focus')==='part:p5','Forward restores Part');
  await p.locator('[data-action="language"]').click();check(new URL(p.url()).searchParams.get('focus')==='part:p5','Language keeps selected Part');
  check(await p.locator('[data-reader-part-shortcuts] a[aria-current="location"]').count()===1,'Translated current Part indicated');
  await p.reload();check(new URL(p.url()).searchParams.get('focus')==='part:p5','Reload keeps shareable Part');
  check(await p.locator('[data-completion-progress]').evaluate(e=>e.value)===0,'Navigation never marks chapters complete');
  for(const route of ['screen','map']){await p.goto(`${base}/${lang}/${route}/`);await p.evaluate(()=>document.fonts.ready);check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Representative route fits viewport');await p.screenshot({path:path.join(dir,`${lang}-${route}-${width}.png`),fullPage:true});}
  check(errors.length===0,'No browser exceptions');await c.close();
 }
 for(const lang of ['he','en']){
  const c=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}}),p=await c.newPage();
  await p.goto(`${base}/${lang}/novel/`);check(await p.locator('[data-reader-part-shortcuts] a').count()===5,'No-JS direct Part links exist');
  await p.locator('[data-reader-part-shortcuts] a').last().click();check(await p.locator('#reader-part-overview-p5').evaluate(e=>e.getBoundingClientRect().top>=-2&&e.getBoundingClientRect().top<innerHeight),'No-JS fragment reaches requested Part overview');
  await c.close();
 }
 await browser.close();fs.writeFileSync(path.join(dir,'metrics.json'),JSON.stringify({checks,report},null,2));console.log(`Compact entry: ${checks} HE/EN desktop/390/360/320 checks, circle geometry, early Part links, keyboard/history/language and no-JS.`);
})().catch(e=>{console.error(e);process.exit(1)});
