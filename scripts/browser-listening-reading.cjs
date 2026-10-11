const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
const base=process.env.SEARCH_TEST_URL||'http://localhost:8873',dir=process.env.SEARCH_ARTIFACT_DIR||'test-results';
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++};
for(const lang of ['he','en'])for(const width of [1365,390,320]){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());const page=await context.newPage();await page.goto(base+'/'+lang+'/listening/');
 const groups=await page.evaluate(()=>window.RESEARCH.gallery.groups.filter(g=>g.reading).map(g=>({id:g.id,clipIds:g.clipIds,title:g.reading.title,scene:g.reading.scene})));
 check(groups.length===4,'Four text-led scene notes');
 for(const group of groups){
  for(const id of group.clipIds){
   await page.goto(base+'/'+lang+'/listening/?clip='+id);
   if(await page.locator('[data-gallery-reveal]').count()){check(await page.locator('.gallery-reading').count()===0,'Gated recording withholds note before consent');await page.locator('[data-gallery-reveal]').click()}
   check(await page.locator('#gallery-reading-title').count()===1,'Single reading heading '+id+lang);
   check((await page.locator('#gallery-reading-title').innerText())===group.title[lang],'Translated reading title '+id+lang);
   check((await page.locator('.gallery-reading').innerText()).includes(group.scene[lang]),'Full scene is readable '+id+lang);
   check(await page.locator('.gallery-versions button').count()===group.clipIds.length,'All existing versions retained '+id+lang);
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'Reading page fits '+id+lang+width);
  }
  const first=page.locator('.gallery-versions button').first();await first.focus();await first.press('Enter');check(await first.getAttribute('aria-pressed')==='true','Keyboard selects first version '+group.id+lang);check(new URL(page.url()).searchParams.get('clip')===await first.getAttribute('data-gallery-clip'),'Keyboard keeps clip deep link '+group.id+lang);
  if(await page.locator('[data-gallery-reveal]').count())await page.locator('[data-gallery-reveal]').click();
  await page.locator('.gallery-reading').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(dir,'reading-'+group.id+'-'+lang+'-'+width+'.png'),fullPage:false});
 }
 await context.close();
}
await browser.close();console.log(`Text-led gallery: ${checks} real-browser checks passed, four scenes and every existing version in HE/EN at1365/390/320, spoiler-safe and no audio required.`)
})().catch(e=>{console.error(e);process.exit(1)});
