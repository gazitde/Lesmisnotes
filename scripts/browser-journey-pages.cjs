const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.SEARCH_TEST_URL||'http://localhost:8891';
async function settleLayout(page){await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))})}
async function checkChapterLanding(page,id,check,label){
 await settleLayout(page);
 const position=await page.evaluate(id=>{const card=document.getElementById('reader-chapter-'+id),heading=card.querySelector('h3'),crumb=document.querySelector('.reader-breadcrumbs');return {cardTop:card.getBoundingClientRect().top,headingTop:heading.getBoundingClientRect().top,headingBottom:heading.getBoundingClientRect().bottom,crumbBottom:crumb.getBoundingClientRect().bottom,viewport:innerHeight,focused:document.activeElement?.id}},id);
 check(position.focused==='reader-chapter-'+id,label+': chapter retains keyboard focus');
 check(position.cardTop>=position.crumbBottom-1,label+': card lands below sticky breadcrumb '+JSON.stringify(position));
 check(position.headingTop>=position.crumbBottom&&position.headingBottom<=position.viewport,label+': complete heading visible below breadcrumb '+JSON.stringify(position));
}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});let n=0;const check=(v,m)=>{assert.ok(v,m);n++};
for(const {width,height} of [{width:390,height:844},{width:500,height:844},{width:1180,height:757},{width:1280,height:844}])for(const lang of ['en','he']){
 const c=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await c.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
 let releasePart;const partReady=new Promise(resolve=>{releasePart=resolve});await c.route('**/reading/part-1.json',async r=>{await partReady;await r.continue()});
 await p.goto(`${base}/${lang}/home/`);await p.locator('.privacy-banner [data-action="privacy-reject"]').click();await p.locator('[data-interest="novel"]').click();
 check(await p.locator('.path-card').count()===0,'Chosen cards collapse');check(await p.locator('h1').count()===1,'One H1');
 check((await p.locator('.interest-start').boundingBox()).y<height,'Primary first action in view');await p.locator('.interest-start').click();
 await p.locator('#reading-book-panel[data-reader-ready="false"]').waitFor();await settleLayout(p);releasePart();
 await p.locator('#reading-book-panel[data-reader-ready="true"]').waitFor();check(new URL(p.url()).pathname===`/${lang}/novel-journey/`,'Dedicated chapter route');check(await p.locator('.chapter-summary-text').count()===1,'One chapter summary');check(await p.locator('.reader-breadcrumbs li').count()===6,'Complete breadcrumb context');await checkChapterLanding(p,'p1-b1-c1',check,'Cold first chapter');
 await p.locator('.chapter-slide-nav .slide-next').click();await p.locator('#reader-chapter-p1-b1-c2').waitFor();check(new URL(p.url()).searchParams.get('focus')==='chapter:p1-b1-c2','Next chapter');await checkChapterLanding(p,'p1-b1-c2',check,'Cached next chapter');
 await p.goBack();await p.locator('#reader-chapter-p1-b1-c1').waitFor();check(await p.locator('.chapter-summary-text').count()===1,'Back restores focused chapter');
 await p.locator('[data-action="language"]').click();await p.locator('#reader-chapter-p1-b1-c1').waitFor();check(new URL(p.url()).searchParams.get('focus')==='chapter:p1-b1-c1','Language retains chapter');
 check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Chapter no horizontal overflow');
 await p.goto(`${base}/${lang}/musical-journey/`);check(await p.locator('.musical-journey-orientation').count()===1,'Safe orientation');check(await p.locator('#show-slide').count()===0,'Full scene hidden before consent');check(await p.locator('a[href="https://www.youtube.com/watch?v=5vnlCwsoKCs"]').count()===1,'Approved official opening excerpt');
 check(!new URL(p.url()).searchParams.has('focus'),'Journey consent begins at the no-focus root');const beforeOpenHistory=await p.evaluate(()=>history.length);
 await p.locator('[data-action="show-open"]').click();await p.locator('#show-slide').waitFor();check(await p.locator('[data-slide-surface="show"]').count()===1,'Designated slide surface');
 const firstSceneURL=p.url(),firstSceneTitle=await p.locator('#show-current-title').textContent();check(new URL(firstSceneURL).searchParams.get('focus')==='song:work-song','Consent canonicalizes the actual first scene');check(await p.evaluate(()=>history.length)===beforeOpenHistory,'Consent replaces root without adding a Back step');
 await p.locator('.show-station-nav [data-show-move="next"]').click();const nextSceneURL=p.url(),nextSceneTitle=await p.locator('#show-current-title').textContent();check(new URL(nextSceneURL).searchParams.get('focus')==='song:valjean-forgiven','Next scene updates URL');
 await p.goBack();check(p.url()===firstSceneURL,'Back returns to canonical first scene URL');check(await p.locator('#show-current-title').textContent()===firstSceneTitle,'Back restores first scene content, not retained second scene');
 await p.goForward();check(p.url()===nextSceneURL,'Forward restores second scene URL');check(await p.locator('#show-current-title').textContent()===nextSceneTitle,'Forward restores second scene content');
 await p.goBack();await p.locator('[data-action="language"]').click();check(new URL(p.url()).searchParams.get('focus')==='song:work-song','Language after Back keeps the first scene');check(await p.locator('[data-action="show-open"]').count()===0,'History and language retain existing explicit consent');
 check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Musical no horizontal overflow');
 fs.mkdirSync('test-results',{recursive:true});await p.screenshot({path:`test-results/journey-musical-${lang}-${width}.png`});
 await p.goto(`${base}/${lang}/novel/?focus=chapter%3Ap1-b1-c1&essays=all`);await p.locator('#reader-chapter-p1-b1-c1').waitFor();check(new URL(p.url()).pathname.endsWith('/novel-journey/'),'Legacy route migrated');check(new URL(p.url()).searchParams.get('essays')==='all','Essay mode retained');await p.screenshot({path:`test-results/journey-novel-${lang}-${width}.png`});
 if(width===1180){
  let releaseDelayed;const delayed=new Promise(resolve=>{releaseDelayed=resolve});await p.route('**/reading/part-1.json',async r=>{await delayed;await r.continue()});
  await p.goto(`${base}/${lang}/home/?interest=novel`);await p.locator('.interest-start').click();await p.locator('#reading-book-panel[data-reader-ready="false"]').waitFor();await settleLayout(p);
  await p.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await settleLayout(p);releaseDelayed();
  await p.locator('#reading-book-panel[data-reader-ready="true"]').waitFor();await settleLayout(p);
  check(await p.evaluate(()=>scrollY<2),'Lazy response does not drag a moved-away reader back to the card');
  check(await p.evaluate(()=>document.activeElement?.id==='reader-chapter-p1-b1-c1'),'Moved-away reader still retains keyboard focus after replacement');
  await p.goBack();check(new URL(p.url()).pathname===`/${lang}/home/`,'Back remains on the selected home path');
 }
 check(errors.length===0,errors.join(';'));await c.close();
}
await browser.close();console.log(`Journey pages: ${n} browser checks at 390, 500, 1180 and 1280 pixels in Hebrew and English.`)})().catch(e=>{console.error(e);process.exit(1)});
