const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),{spawn}=require('node:child_process');
const base=process.env.SEARCH_TEST_URL||'http://127.0.0.1:8899',server=process.env.SEARCH_TEST_URL?null:spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'8899',CONTACT_ENABLED:'false'},stdio:'ignore'});
let browser,checks=0;const check=(value,message)=>{assert.ok(value,message);checks++};
(async()=>{
 for(let i=0;i<80;i++){try{if((await fetch(base+'/en/home/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 fs.mkdirSync('test-results/search-discovery',{recursive:true});
 for(const lang of ['en','he'])for(const width of [320,1365]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
  const page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.goto(base+`/${lang}/home/`);await page.locator('[data-action="privacy-reject"]').first().click();
  const open=async()=>{await page.locator('[data-site-search-open]').click();};
  const query=async text=>{await page.locator('#site-search-input').fill(text);await page.waitForTimeout(220);};
  await open();check(await page.locator('.site-search-destinations a').count()===6,'Six meaningful destinations in empty search');
  await page.locator(`.site-search-destinations a[href="/${lang}/special-events/"]`).click();
  check(new URL(page.url()).pathname===`/${lang}/special-events/`,'Hyphenated main destination navigates instead of silently failing');
  await open();await query('25th anniversary concert');
  check(await page.locator('.site-search-list a').first().getAttribute('href')===`/${lang}/special-events/?focus=event%3Aconcert-2010`,'Specific production intent opens precise event');
  check((await page.locator('.site-search-list a').first().innerText()).includes('2010'),'Result shows actual date context');
  check(await page.locator('.site-search-list a').first().locator('.site-search-breadcrumb').count()===1,'Destination breadcrumb present');
  await page.screenshot({path:`test-results/search-discovery/results-${lang}-${width}.png`});
  check(await page.locator('#site-search-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth&&e.getBoundingClientRect().width<=innerWidth),'No dialog horizontal overflow');
  await page.keyboard.press('Enter');check(await page.locator('.site-search-list a').first().evaluate(e=>document.activeElement===e),'Submit focuses first real result');
  await page.keyboard.press('Enter');check(await page.locator('#concert-2010').evaluate(e=>document.activeElement===e),'Event receives keyboard focus');
  await page.locator('[data-action="language"]').click();
  check(new URL(page.url()).searchParams.get('focus')==='event:concert-2010','Language switch preserves exact event');
  check(await page.locator('#concert-2010').evaluate(e=>document.activeElement===e),'Language switch preserves destination focus');
  await page.reload();check(await page.locator('#concert-2010').evaluate(e=>document.activeElement===e),'Reload restores exact focus');
  await page.goBack();check(new URL(page.url()).pathname===`/${lang}/special-events/`,'Back restores event route');
  await page.goto(base+`/${lang}/home/`);await open();await query('Cossette');
  check((await page.locator('.site-search-list a').first().innerText()).includes('Cossette'),'Curated alternate spelling visibly explains match');
  await query('cholera');if(lang==='he'){check(await page.locator('.site-search-list [lang="en"]').count()>0,'Cross-language evidence explicitly marked');check(await page.locator('.site-search-list mark').filter({hasText:'cholera'}).count()>0,'Actual matching passage highlighted');}
  await query('24601');
  if(width===320)await page.locator('.site-search-filter-disclosure>summary').click();
  await page.locator('.site-search-filters [data-site-search-category="recipes"]').click();
  check(await page.locator('.site-search-list').count()===0,'Wrong topic remains honest instead of silently removing filter');
  const recover=page.locator('.site-search-empty [data-site-search-category="all"]');check(await recover.count()===1,'Offers explicit all-topic recovery');await recover.click();
  check(await page.locator('.site-search-list a').first().getAttribute('href')===`/${lang}/character-valjean/`,'Recovery keeps query and restores exact result');
  await query('9430');check(await page.locator('.site-search-list').count()===0,'Concealed character outcome still absent');
  await query('<img src=x onerror=alert(1)>');check(await page.locator('#site-search-results img').count()===0,'Untrusted query cannot become markup');
  await page.keyboard.press('Escape');check(await page.locator('[data-site-search-open]').evaluate(e=>document.activeElement===e),'Escape returns focus');
  await page.keyboard.press('Control+k');check(await page.locator('#site-search-input').evaluate(e=>document.activeElement===e),'Keyboard shortcut reopens search');
  await page.evaluate(()=>{window.savedSearchSources=[RESEARCH,EXTRA_CONTENT,PLACE_CONTENT,RECIPE_CONTENT,SITE_METADATA];window.RESEARCH={};window.EXTRA_CONTENT={};window.PLACE_CONTENT={};window.RECIPE_CONTENT={};window.SITE_METADATA={};SiteSearch.mount({lang:document.documentElement.lang,novelConsent:true});SiteSearch.open(document.querySelector('[data-site-search-open]'));});
  check(await page.locator('[data-site-search-retry]').count()===1,'Missing index offers retry, not misleading zero matches');
  await page.evaluate(()=>{[window.RESEARCH,window.EXTRA_CONTENT,window.PLACE_CONTENT,window.RECIPE_CONTENT,window.SITE_METADATA]=window.savedSearchSources;delete window.savedSearchSources;});
  await page.locator('[data-site-search-retry]').click();await query('Valjean');check(await page.locator('.site-search-list a').count()>0,'Retry rebuilds recovered index');
  check(!requests.some(url=>/Cossette|cholera|24601|9430|25th%20anniversary/.test(url)),'No query content in requests');
  check(!(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).match(/Cossette|cholera|24601|9430|25th anniversary/),'No query content in storage');
  check(errors.length===0,'No runtime errors: '+errors.join('; '));await context.close();
 }
 console.log(`Search discovery: ${checks} checks passed (HE/EN, 320/1365px, exact events, keyboard, history, recovery, privacy, spoiler safety).`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server?.kill();});
