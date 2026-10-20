const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.SEARCH_TEST_URL||'http://localhost:8891';
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});let n=0;const check=(v,m)=>{assert.ok(v,m);n++};
for(const width of [390,500,1280])for(const lang of ['en','he']){
 const c=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await c.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
 await p.goto(`${base}/${lang}/home/`);await p.locator('[data-action="privacy-reject"]').click();await p.locator('[data-interest="novel"]').click();
 check(await p.locator('.path-card').count()===0,'Chosen cards collapse');check(await p.locator('h1').count()===1,'One H1');
 check((await p.locator('.interest-start').boundingBox()).y<844,'Primary first action in view');await p.locator('.interest-start').click();
 await p.locator('#reading-book-panel[data-reader-ready="true"]').waitFor();check(new URL(p.url()).pathname===`/${lang}/novel-journey/`,'Dedicated chapter route');check(await p.locator('.chapter-summary-text').count()===1,'One chapter summary');check(await p.locator('.reader-breadcrumbs li').count()===6,'Complete breadcrumb context');
 await p.locator('.chapter-slide-nav .slide-next').click();await p.locator('#reader-chapter-p1-b1-c2').waitFor();check(new URL(p.url()).searchParams.get('focus')==='chapter:p1-b1-c2','Next chapter');
 await p.goBack();await p.locator('#reader-chapter-p1-b1-c1').waitFor();check(await p.locator('.chapter-summary-text').count()===1,'Back restores focused chapter');
 await p.locator('[data-action="language"]').click();await p.locator('#reader-chapter-p1-b1-c1').waitFor();check(new URL(p.url()).searchParams.get('focus')==='chapter:p1-b1-c1','Language retains chapter');
 check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Chapter no horizontal overflow');
 await p.goto(`${base}/${lang}/musical-journey/`);check(await p.locator('.musical-journey-orientation').count()===1,'Safe orientation');check(await p.locator('#show-slide').count()===0,'Full scene hidden before consent');check(await p.locator('a[href="https://www.youtube.com/watch?v=5vnlCwsoKCs"]').count()===1,'Approved official opening excerpt');
 await p.locator('[data-action="show-open"]').click();await p.locator('#show-slide').waitFor();check(await p.locator('[data-slide-surface="show"]').count()===1,'Designated slide surface');
 await p.locator('.show-station-nav [data-show-move="next"]').click();check(new URL(p.url()).searchParams.get('focus')!=='song:work-song','Next scene updates URL');
 check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Musical no horizontal overflow');
 fs.mkdirSync('test-results',{recursive:true});await p.screenshot({path:`test-results/journey-musical-${lang}-${width}.png`});
 await p.goto(`${base}/${lang}/novel/?focus=chapter%3Ap1-b1-c1&essays=all`);await p.locator('#reader-chapter-p1-b1-c1').waitFor();check(new URL(p.url()).pathname.endsWith('/novel-journey/'),'Legacy route migrated');check(new URL(p.url()).searchParams.get('essays')==='all','Essay mode retained');await p.screenshot({path:`test-results/journey-novel-${lang}-${width}.png`});
 check(errors.length===0,errors.join(';'));await c.close();
}
await browser.close();console.log(`Journey pages: ${n} browser checks at 390, 500 and 1280 pixels in Hebrew and English.`)})().catch(e=>{console.error(e);process.exit(1)});
