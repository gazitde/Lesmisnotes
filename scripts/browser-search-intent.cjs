'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const {spawn}=require('node:child_process');
const base=process.env.SEARCH_TEST_URL||'http://127.0.0.1:8891';
const server=process.env.SEARCH_TEST_URL?null:spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'8891',CONTACT_ENABLED:'false'},stdio:'ignore'});
let browser,checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
const profiles=JSON.parse(fs.readFileSync('config/character-profiles.json','utf8')).profiles;
(async()=>{
 for(let attempt=0;attempt<80;attempt++){try{if((await fetch(base+'/en/characters/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 for(const lang of ['en','he'])for(const width of [320,1365]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+`/${lang}/characters/`);
  await page.locator('[data-action="privacy-reject"]').first().click();
  check(await page.locator('h1').innerText()===(lang==='he'?'הדמויות של עלובי החיים':'Les Misérables characters'),'Hub H1 names its subject');
  const directory=page.locator('.profile-directory');
  check(await directory.locator('a').count()===10,'Ten visible profile links');
  for(const profile of profiles){
   const link=directory.getByRole('link',{name:profile.name[lang]+' '+profile.role[lang],exact:true});
   check(await link.count()===1,'Name and role form the accessible link label: '+profile.id);
   check(await link.getAttribute('href')===`/${lang}/character-${profile.id}/`,'Role link has a canonical destination');
   check((await link.boundingBox()).height>=44,'Role link preserves touch target size');
  }
  await directory.scrollIntoViewIfNeeded();
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow at '+width);
  fs.mkdirSync('test-results/search-intent',{recursive:true});
  await page.screenshot({path:`test-results/search-intent/characters-${lang}-${width}.png`});
  const javert=profiles.find(p=>p.id==='javert');
  await directory.getByRole('link',{name:javert.name[lang]+' '+javert.role[lang],exact:true}).click();
  await page.locator('.profile-intro').waitFor();
  check(await page.title()===javert.seo.title[lang],'Profile title survives client navigation');
  check(await page.locator('meta[name="description"]').getAttribute('content')===javert.seo.description[lang],'Profile description survives client navigation');
  check(await page.locator('.profile-full-prose').count()===0,'Deep plot stays closed');
  await page.goBack();await directory.waitFor();
  check(await page.locator('h1').innerText()===(lang==='he'?'הדמויות של עלובי החיים':'Les Misérables characters'),'Back restores hub');
  await page.goto(base+`/${lang}/history/`);
  check((await page.locator('h1').innerText()).includes(lang==='he'?'עלובי החיים':'Les Misérables'),'History heading names the work');
  check(await page.locator('.history-outcome-reflection').count()===0,'History outcome stays closed');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'History heading fits viewport');
  await page.screenshot({path:`test-results/search-intent/history-${lang}-${width}.png`});
  check(errors.length===0,'No runtime errors: '+errors.join('; '));
  await context.close();
 }
 console.log(`Search-intent browser: ${checks} checks passed across English/Hebrew, mobile/desktop, accessible role links, navigation and spoiler gates.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();server?.kill();});
