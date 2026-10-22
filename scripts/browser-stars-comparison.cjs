const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
const base=process.env.SEARCH_TEST_URL||'http://localhost:8873',dir=process.env.SEARCH_ARTIFACT_DIR||'test-results';
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});let n=0;const check=(v,m)=>{assert.ok(v,m);n++};
for(const lang of ['he','en'])for(const width of [1365,390,320]){
 const c=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});const requests=[];await c.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin===new URL(base).origin)return r.continue();requests.push(u.href);return r.abort()});const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/'+lang+'/musical-journey/?focus=song%3Astars&view=journey');
 const card=p.locator('[data-journey-performance="QBEGzbdKwo8"]');check(await card.count()===0,'Spoiler gate hides comparison');
 check((await p.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'),'Focused reading remains noindex');
 await p.locator('[data-action="show-open"]').click();check(await card.count()===1,'One comparison at Stars');check(await card.getAttribute('open')===null,'Starts collapsed');
 const mainIds=await p.locator('#show-watch-stop [data-video-shell]').evaluateAll(es=>es.map(e=>e.dataset.videoShell));check(mainIds.length>0&&!mainIds.includes('QBEGzbdKwo8'),'Main Stars performance retained');
 await card.locator('summary').click();check(await card.locator('h3').isVisible(),'Disclosure opens');const content=await card.innerText();check(content.includes('Thomas H. Smith')&&content.includes('3:26'),'Editor and duration');check(content.includes(lang==='he'?'ביצועים נפרדים':'separate performances'),'Fan-edit scope');
 check(await card.locator('iframe,img').count()===0,'No embedded media or third-party image');check(await card.locator('a').getAttribute('href')==='https://www.youtube.com/watch?v=QBEGzbdKwo8','Exact user source');check((await card.locator('a').getAttribute('rel')).includes('noopener'),'Safe external link');
 check(!requests.some(u=>u.includes('QBEGzbdKwo8')),'No requests for fan edit before leaving');check(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'Fits viewport');
 await card.scrollIntoViewIfNeeded();await p.screenshot({path:path.join(dir,`stars-comparison-${lang}-${width}.png`)});
 await card.locator('summary').click();check(await card.getAttribute('open')===null,'Closes');await card.locator('summary').click();check(await card.locator('h3').isVisible(),'Reopens');
 await p.locator('[data-show-move="next"]').first().click();check(await card.count()===0,'Absent at next stop');await p.locator('[data-show-move="prev"]').first().click();check(await card.count()===1&&await card.getAttribute('open')===null,'Returning resets disclosure');
 check(errors.length===0,'No runtime errors');await c.close();
}await browser.close();console.log(`Stars comparison: ${n} checks passed, HE/EN desktop/390/320.`)})().catch(e=>{console.error(e);process.exit(1)});
