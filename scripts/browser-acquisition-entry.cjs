'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),{spawn}=require('node:child_process');
const base=process.env.SEARCH_TEST_URL||'http://127.0.0.1:8896';
const server=process.env.SEARCH_TEST_URL?null:spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'8896',CONTACT_ENABLED:'false'},stdio:'ignore'});
let browser,checks=0;const check=(v,m)=>{assert.ok(v,m);checks++;};
(async()=>{
 for(let i=0;i<80;i++){try{if((await fetch(base+'/en/before/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
 for(const lang of ['he','en'])for(const width of [320,390,1365]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const route of ['before','novel-journey','compare','screen']){
   await page.goto(`${base}/${lang}/${route}/`);
   await page.locator('.acquisition-next').waitFor();
   const reject=page.locator('.privacy-banner [data-action="privacy-reject"]');if(await reject.isVisible())await reject.click();
   check((await page.locator('h1').innerText()).includes(lang==='he'?'עלובי החיים':'Les Misérables'),`${lang}/${route} H1`);
   check(await page.locator('.acquisition-next a').count()===2,'Two next-step choices');
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`No overflow ${lang}/${route}/${width}`);
   check(await page.locator('iframe').count()===0,'No automatically embedded media');
   const link=page.locator('.acquisition-next a').first(),href=await link.getAttribute('href');
   check(!/[?#]/.test(href)&&href.startsWith(`/${lang}/`),'Clean same-language link');
   await link.focus();await page.keyboard.press('Enter');await page.waitForURL(base+href);
   check((await page.locator('html').getAttribute('lang'))===lang,'Keyboard navigation retains language');
   await page.goBack();await page.waitForURL(`${base}/${lang}/${route}/`);await page.locator('.acquisition-next').waitFor();
   check(await page.locator('meta[name="robots"]').getAttribute('content')==='index, follow, max-image-preview:large','Base guide retains production indexing and image-preview policy');
   if(route==='compare'){
    check(await page.locator('.adaptation-card').count()===0,'Protected comparison absent');
    await page.locator('[data-action="enable-spoilers"]').click();check(await page.locator('.adaptation-card').count()===6,'Consent opens six comparisons');
    await page.locator('[data-action="hide-spoilers"]').click();check(await page.locator('.adaptation-card').count()===0,'Withdrawal conceals comparisons again');
   }
   if(route==='screen'){
    check((await page.locator('.film-stage-answer').innerText()).includes('Suddenly'),'Sourced film answer present');
    await page.locator('.film-stage-answer').scrollIntoViewIfNeeded();
    fs.mkdirSync('test-results/acquisition-entry',{recursive:true});await page.screenshot({path:`test-results/acquisition-entry/screen-${lang}-${width}.png`});
   }
  }
  check(errors.length===0,'No JS errors: '+errors.join('; '));await context.close();
 }
 for(const lang of ['he','en']){
  const context=await browser.newContext({javaScriptEnabled:false});await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());const page=await context.newPage();
  for(const route of ['before','novel-journey','compare','screen']){await page.goto(`${base}/${lang}/${route}/`);check(await page.locator('.acquisition-next a').count()===2,'No-JS next steps');if(route==='screen')check((await page.locator('.film-stage-answer').innerText()).includes('Suddenly'),'No-JS film answer');if(route==='compare')check(await page.locator('.adaptation-card').count()===0,'No-JS protected comparisons absent');}
  await context.close();
 }
 console.log(`Acquisition-entry browser: ${checks} checks passed. Browser: ${await browser.version()}.`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server?.kill();});
