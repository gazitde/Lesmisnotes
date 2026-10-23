'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.SEARCH_TEST_URL||'http://127.0.0.1:8873',dir=process.env.SEARCH_ARTIFACT_DIR||'test-results';
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++};fs.mkdirSync(dir,{recursive:true});
for(const lang of ['he','en'])for(const width of [1280,390,320]){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],outside=[];
 page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',r=>{if(new URL(r.request().url()).origin===new URL(base).origin)return r.continue();outside.push(r.request().url());return r.abort()});
 await page.goto(base+'/'+lang+'/novel-journey/');
 const root=page.locator('.reader-start .reader-hebrew-edition');check(await root.isVisible(),'Root reading entry is visible');
 for(const id of ['43076','43194','43193'])check(await root.locator('a[href="https://benyehuda.org/read/'+id+'"]').isVisible(),'Verified Hebrew volume or contents link is visible');
 check((await root.textContent()).includes(lang==='he'?'מקוצר':'abridged'),'Abridgment caveat is visible');
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Root fits viewport');
 if(width===390)await root.screenshot({path:path.join(dir,'hebrew-edition-root-'+lang+'.png')});
 await page.goto(base+'/'+lang+'/novel-journey/?focus=chapter%3Ap1-b1-c1');await page.locator('[data-reader-ready="true"]').waitFor();
 const card=page.locator('#reader-chapter-p1-b1-c1'),choice=card.locator('.reader-hebrew-compact');check(await choice.count()===1,'One compact choice in focused chapter');check(!(await choice.evaluate(e=>e.open)),'Chapter edition choice starts folded');
 await choice.locator('summary').focus();await page.keyboard.press('Enter');check(await choice.evaluate(e=>e.open),'Keyboard opens edition choice');
 check(await choice.locator('a[href="https://benyehuda.org/read/43076"]').isVisible(),'Hebrew link visible in chapter');check(await card.locator('.reading-book-source a[href$="#link2HCH0001"]').count()===1,'Exact English source remains');
 check(await page.evaluate(()=>localStorage.getItem('barricade-last-reading')===null&&sessionStorage.getItem('barricade-spoilers')!=='on'),'Edition disclosure does not save reading or grant spoilers');
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Chapter edition choice fits viewport');
 if(width===390)await choice.screenshot({path:path.join(dir,'hebrew-edition-chapter-'+lang+'.png')});
 check(!outside.some(u=>u.includes('benyehuda.org')),'No Hebrew-provider request before choosing an external link');check(errors.length===0,'No runtime errors');await context.close();
}
const context=await browser.newContext({javaScriptEnabled:false}),page=await context.newPage();for(const lang of ['he','en']){await page.goto(base+'/'+lang+'/novel-journey/');check(await page.locator('.reader-start a[href="https://benyehuda.org/read/43076"]').isVisible(),'No-JS reader has direct Hebrew link')}await context.close();await browser.close();console.log('Hebrew reading edition: '+checks+' browser checks passed.');})().catch(error=>{console.error(error);process.exit(1)});
