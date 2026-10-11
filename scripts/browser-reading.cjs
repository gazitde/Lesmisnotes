const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.SEARCH_TEST_URL||'http://localhost:8873',dir=process.env.SEARCH_ARTIFACT_DIR||'test-results';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});let checks=0;const check=(v,msg)=>{assert.ok(v,msg);checks++};
 for(const lang of ['he','en']){
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),page=await context.newPage();
  for(const route of ['story','characters','israel','watch']){
   await page.goto(base+'/'+lang+'/'+route+'/');
   check((await page.locator('main').innerText()).length>900,lang+'/'+route+' meaningful no-JS reading');
   check(await page.locator('h1').count()===1,lang+'/'+route+' one page heading');
   check(await page.locator('.no-js-nav a').count()===7,lang+'/'+route+' usable no-JS navigation');
   if(route==='characters'){
    check(await page.locator('.safe-character-card').count()===10,'Ten static people '+lang);
    check(await page.locator('.safe-relations li').count()===5,'Five semantic relations '+lang);
    check(await page.locator('#valjean-24601').count()===1,'24601 exactly once '+lang);
    check(!/9430|firing squad|כיתת יורים/.test(await page.locator('main').innerText()),'No protected character outcomes '+lang);
    await page.locator('.safe-character-index a[href="#character-intro-javert"]').click();
    check(page.url().endsWith('#character-intro-javert'),'Native character fragment works '+lang);
    check(await page.locator('.char-detail,.graph-node').count()===0,'Full relationship explorer stays gated '+lang);
   }
   if(route==='watch'){
    check(await page.locator('.reading-card').count()===6,'Six static viewing destinations '+lang);
    await page.locator('.reading-index a[href="#watch-japan"]').click();check(page.url().endsWith('#watch-japan'),'Native destination link '+lang);
   }
  }
  await page.screenshot({path:path.join(dir,'reading-no-js-'+lang+'.png'),fullPage:true});await context.close();
 }
 for(const lang of ['en','he']){
  const context=await browser.newContext({viewport:{width:390,height:844}});let external=0;
  await context.route('**/*',r=>{if(new URL(r.request().url()).origin===new URL(base).origin)return r.continue();external++;return r.abort()});
  const page=await context.newPage();await page.goto(base+'/'+lang+'/characters/');
  check(await page.locator('.privacy-banner button:visible').count()===3,'Only three initial privacy choices '+lang);
  check(await page.locator('.privacy-modal:visible').count()===0,'Granular settings start closed '+lang);
  check(external===0,'No external service on character reading before choice '+lang);
  await page.locator('.privacy-banner [data-action="privacy-open"]').click();
  check(await page.locator('#privacy-functional').isVisible()&&await page.locator('#privacy-analytics').isVisible(),'Settings retain separate choices '+lang);
  await page.locator('[data-action="privacy-close"]').click();await page.locator('.privacy-banner [data-action="privacy-reject"]').click();
  check(await page.evaluate(()=>{const c=window.SitePrivacy.choice();return !c.functional&&!c.analytics}),'Reject disables both options '+lang);
  check(await page.locator('.safe-character-card').count()===10,'Ten hydrated safe cards '+lang);
  await page.locator('.safe-character-index a[href="#character-intro-javert"]').click();
  await page.waitForFunction(()=>{const r=document.getElementById('character-intro-javert').getBoundingClientRect();return r.top>=0&&r.top<200},null,{timeout:4000}).catch(async error=>{console.error('Anchor geometry',await page.locator('#character-intro-javert').evaluate(e=>({top:e.getBoundingClientRect().top,y:scrollY,hash:location.hash})));await page.screenshot({path:path.join(dir,'fragment-failure-'+lang+'.png'),fullPage:false});throw error});
  check(page.url().endsWith('#character-intro-javert'),'Hydrated native fragment URL '+lang);
  check(await page.locator('#character-intro-javert').evaluate(e=>e.getBoundingClientRect().top>=0&&e.getBoundingClientRect().top<200),'Hydrated anchor does not reset to page top '+lang);
  await page.goBack();await page.goForward();await page.waitForFunction(()=>location.hash==='#character-intro-javert'&&scrollY>300,null,{timeout:4000});
  check(page.url().endsWith('#character-intro-javert')&&await page.evaluate(()=>scrollY>300),'Native fragment Back/Forward keeps its landing '+lang);
  await page.goto(base+'/'+lang+'/characters/?focus=character%3Avaljean');
  check(await page.locator('#character-intro-valjean').evaluate(e=>document.activeElement===e),'Safe search target receives focus '+lang);
  await page.locator('[data-action="spoilers"]').click();await page.locator('[data-action="confirm-spoilers"]').click();
  check(await page.locator('.char-detail').count()===1,'Full character detail after permission '+lang);
  check(await page.locator('#valjean-24601').count()===1,'Fact anchor survives permission '+lang);
  check(await page.locator('.safe-character-card').count()===0,'No duplicate shallow/full cards '+lang);
  await page.locator('[data-action="spoilers"]').click();
  check(await page.locator('.safe-character-card').count()===10,'Safe content returns after hiding '+lang);
  check(!(await page.locator('main').innerText()).includes('9430'),'Hide removes protected content '+lang);
  await context.close();
  const fresh=await browser.newContext({viewport:{width:320,height:844}});await fresh.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());const p=await fresh.newPage();await p.goto(base+'/'+lang+'/home/');
  await p.locator('.privacy-banner [data-action="privacy-accept"]').click();
  check(await p.evaluate(()=>{const c=window.SitePrivacy.choice();return c.functional&&c.analytics}),'Accept explicitly enables both options '+lang);
  check(!await p.locator('[data-action="spoilers"]').evaluate(e=>e.classList.contains('on')),'Privacy choice never reveals spoilers '+lang);
  check(await p.locator('.privacy-banner').count()===0,'Choice dismisses initial banner '+lang);await fresh.close();
 }
 await browser.close();console.log(`Reading and privacy: ${checks} browser checks passed, HE/EN, no-JS reading/native fragments, hydration, safe search focus, spoiler round trips and three-choice consent.`);
})().catch(e=>{console.error(e);process.exit(1)});
