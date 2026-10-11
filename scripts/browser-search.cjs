const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const base=process.env.SEARCH_TEST_URL||'http://localhost:8873';
const artifactDir=process.env.SEARCH_ARTIFACT_DIR||process.cwd();
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1365,height:900}});const errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
let checks=0;const check=(v,label)=>{assert.ok(v,label);checks++};
const search=async q=>{await page.locator('#site-search-input').fill(q);await page.waitForTimeout(190)};
await page.goto(base+'/en/home/');
await page.locator('[data-action="privacy-reject"]').first().click();
await page.locator('[data-site-search-open]').click();
check(await page.locator('#site-search-dialog').evaluate(e=>e.open),'Search opens');
check(await page.locator('#site-search-input').evaluate(e=>document.activeElement===e),'Input gets focus');
await search('24601');check(await page.locator('.site-search-list h3').first().innerText()==='Jean Valjean','Alias gives character first');
check(!(await page.locator('#site-search-results').innerText()).includes('guardian'),'No protected biography in safe results');
await page.keyboard.press('ArrowDown');check(await page.locator('.site-search-list a').first().evaluate(e=>document.activeElement===e),'ArrowDown focuses first result');
await page.keyboard.press('ArrowUp');check(await page.locator('#site-search-input').evaluate(e=>document.activeElement===e),'ArrowUp returns to input');
await page.keyboard.press('Escape');check(!await page.locator('#site-search-dialog').evaluate(e=>e.open),'Escape closes');check(await page.locator('[data-site-search-open]').evaluate(e=>document.activeElement===e),'Focus restored');
await page.keyboard.press('Control+k');await search('positivism');await page.locator('.site-search-list a').first().click();
check(page.url().endsWith('/en/ideas/?focus=dilemma%3Alaw-mercy'),'Result deep link');
check((await page.locator('#dilemma-content').innerText()).includes('Legal positivism'),'Correct argument rendered');
await page.goBack();check(page.url().endsWith('/en/home/'),'Back restores previous route');
await page.locator('[data-site-search-open]').click();await search('sesame');await page.locator('[data-site-search-category="recipes"]').click();check((await page.locator('.site-search-list').innerText()).includes('Tahini'),'Category and body search');
await search('<img src=x onerror=alert(123)>');check(await page.locator('#site-search-results img').count()===0,'No query HTML injection');
await search('nothingshouldmatchthisstring');check((await page.locator('#site-search-results').innerText()).includes('No results'),'Empty state');
await page.locator('[data-site-search-clear]').click();check(await page.locator('#site-search-input').inputValue()==='','Clear search');
await page.locator('[data-site-search-category="all"]').click();await search('9430');check(await page.locator('.site-search-list').count()===0,'Hidden query cannot match');
await page.keyboard.press('Escape');await page.locator('[data-action="spoilers"]').click();await page.locator('[data-action="confirm-spoilers"]').click();
await page.locator('[data-site-search-open]').click();await search('9430');check((await page.locator('.site-search-list').innerText()).includes('9430'),'Consented biography searchable');
await page.locator('.site-search-list a').first().click();check((await page.locator('#character-detail').innerText()).includes('9430'),'Consented result opens correct character');
await page.locator('[data-action="spoilers"]').click();await page.locator('[data-site-search-open]').click();await search('9430');check(await page.locator('.site-search-list').count()===0,'Revocation removes cached plot');
check(!requests.some(url=>url.includes('9430')||url.includes('positivism')||url.includes('sesame')||url.includes('24601')),'No query network transmission');
check(!(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).match(/24601|positivism|sesame|9430/),'No query storage');
await page.keyboard.press('Escape');await page.goto(base+'/he/home/');await page.setViewportSize({width:390,height:844});
check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Mobile header no horizontal overflow');
await page.locator('[data-site-search-open]').click();await search('כּוֹלֵרָה');check((await page.locator('.site-search-list').innerText()).includes('1832'),'Niqqud query matches Hebrew historical body');
check(await page.locator('.site-search-list a').first().getAttribute('href')==='/he/history/?focus=history%3A1832','Explicit Hebrew choice retained');
check(await page.locator('#site-search-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth),'Mobile panel no horizontal overflow');
check(await page.locator('#site-search-dialog').evaluate(e=>e.getBoundingClientRect().width<=window.innerWidth),'Panel fits viewport');
await page.screenshot({path:path.join(artifactDir,'search-he-mobile.png'),fullPage:false});
await page.keyboard.press('Escape');await page.setViewportSize({width:1365,height:900});await page.goto(base+'/en/home/');await page.locator('[data-site-search-open]').click();await search('Haussmann');await page.screenshot({path:path.join(artifactDir,'search-en-desktop.png'),fullPage:false});
await page.keyboard.press('Escape');
await page.goto(base+'/en/contact/');
await page.locator('#contact-status').filter({hasText:'not available'}).waitFor();
check(await page.locator('#contact-send').isDisabled(),'Unconfigured contact remains disabled');
await page.locator('#contact-message').fill('A local UI test draft, never submitted.');
await page.locator('[data-action="language"]').click();
check(await page.locator('#contact-message').inputValue()==='A local UI test draft, never submitted.','Contact draft survives language change');
check(await page.locator('html').getAttribute('lang')==='he','Contact language actually switches to Hebrew');
for(const width of [390,320]){
 await page.setViewportSize({width,height:844});
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Contact/header no overflow at '+width);
 await page.locator('[data-site-search-open]').click();
 check(await page.locator('#site-search-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth&&e.getBoundingClientRect().width<=window.innerWidth),'Search fits '+width);
 await page.keyboard.press('Escape');
}
await page.screenshot({path:path.join(artifactDir,'contact-he-narrow.png'),fullPage:false});
for(const language of ['en','he'])for(const width of [1365,960,680,390,320]){
 await page.setViewportSize({width,height:900});await page.goto(base+'/'+language+'/home/');
 const geometry=await page.locator('.poster-stamp').evaluate(stamp=>{
   const r=stamp.clientWidth/2;
   return {overflow:stamp.scrollWidth>stamp.clientWidth||stamp.scrollHeight>stamp.clientHeight,children:[...stamp.children].map(e=>({text:e.textContent,width:e.offsetWidth,height:e.offsetHeight,left:e.offsetLeft,top:e.offsetTop})),radius:r};
 });
 check(!geometry.overflow,'Stamp does not overflow '+language+' '+width);
 for(const child of geometry.children){
   const farX=Math.max(Math.abs(child.left-geometry.radius),Math.abs(child.left+child.width-geometry.radius));
   const farY=Math.max(Math.abs(child.top-geometry.radius),Math.abs(child.top+child.height-geometry.radius));
   check(Math.hypot(farX,farY)<=geometry.radius-2,'Stamp text inside circle: '+language+' '+width+' '+child.text);
 }
}
check(errors.length===0,'No browser runtime errors: '+errors.join('; '));
console.log(`Browser search: ${checks} checks passed, desktop + 390px mobile, bilingual, keyboard, history, content/permission/security.`);
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
