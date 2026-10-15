const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.SEARCH_TEST_URL||'http://127.0.0.1:8875',out=(process.env.SEARCH_ARTIFACT_DIR||'test-results')+'/compact-entry/alternatives';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++};
for(const lang of ['he','en'])for(const width of [1365,390,320]){
 console.log('Alternative browser viewport:',lang,width);
 const c=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});await c.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/'+lang+'/musical/?focus=song%3Aone-day-more&view=journey');
 check(await p.locator('[data-watch-alternatives]').count()===0,'Spoiler gate hides alternatives');
 await p.locator('[data-action="show-open"]').click();
 const panel=p.locator('[data-watch-alternatives]'),summary=panel.locator(':scope > summary');
 check(!(await panel.evaluate(e=>e.open)),'Initially collapsed');check(await panel.locator('iframe').count()===0,'No lazy frames before expansion');
 const primary=await p.locator('.watch-path-clips iframe').elementHandle();
 await summary.focus();await p.keyboard.press('Enter');check(await panel.evaluate(e=>e.open),'Keyboard expands');check(await panel.locator('iframe').count()===0,'Expansion alone does not load media');
 const buttons=panel.locator('[data-watch-alternative]');const click=async locator=>{await locator.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await locator.click()};await buttons.first().focus();await p.keyboard.press('Space');
 check(await panel.locator('iframe').count()===1,'Explicit choice creates one iframe');check(await buttons.first().getAttribute('aria-expanded')==='true','Player state announced');
 check(await panel.locator('iframe').getAttribute('src').then(x=>x.includes('youtube-nocookie.com/embed/')&&x.includes('autoplay=0')),'Privacy enhanced, no autoplay');
 const first=await panel.locator('iframe').elementHandle();await click(buttons.nth(1));check(await first.evaluate(e=>!e.isConnected),'Switch tears down previous alternative');check(await panel.locator('iframe').count()===1,'Only one secondary player');
 check(await primary.evaluate(e=>e.isConnected),'Primary stays connected');
 check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
 await summary.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await p.screenshot({path:out+'/'+lang+'-'+width+'-open.png'});
 await summary.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await click(summary);check(!(await panel.evaluate(e=>e.open)),'Pointer closes disclosure: '+errors.join(';'));await p.waitForFunction(()=>!document.querySelector('[data-watch-alternatives] iframe'));check(await panel.locator('iframe').count()===0,'Closing disclosure stops and removes player');
 await click(summary);check(await panel.locator('iframe').count()===0,'Reopening does not start a player');await click(buttons.first());check(await panel.locator('iframe').count()===1,'Repeated-click setup opens one player');await click(buttons.first());check(await panel.locator('iframe').count()===0,'Repeated click closes player');
 await click(buttons.first());await p.locator('.show-station-nav [data-show-move="next"]').click();check(await p.locator('[data-watch-alternatives] iframe').count()===0,'Next tears down alternatives');
 await p.locator('.show-station-nav [data-show-move="prev"]').click();check(!(await p.locator('[data-watch-alternatives]').evaluate(e=>e.open)),'Returning starts collapsed');
 await click(p.locator('[data-watch-alternatives] > summary'));await click(p.locator('[data-watch-alternative]').first());const modeFrame=await p.locator('[data-watch-alternatives] iframe').elementHandle();
 await click(p.locator('[data-watch-mode="sameProduction"]'));check(await modeFrame.evaluate(e=>!e.isConnected),'Mode change removes active secondary player');check(!(await p.locator('[data-watch-alternatives]').evaluate(e=>e.open)),'Mode changes collapse alternatives');
 await click(p.locator('[data-watch-alternatives] > summary'));await click(p.locator('[data-watch-alternative]').first());const spoilerFrame=await p.locator('[data-watch-alternatives] iframe').elementHandle();
 await p.evaluate(()=>scrollTo(0,0));await p.locator('[data-action="spoilers"]').click();check(await p.locator('[data-watch-alternatives]').count()===0,'Spoiler withdrawal removes alternatives');check(await spoilerFrame.evaluate(e=>!e.isConnected),'Spoiler withdrawal removes active secondary player');await p.locator('[data-action="show-open"]').click();
 for(let index=0;index<39;index++){await p.locator('[data-show-select]').selectOption(String(index));const details=p.locator('[data-watch-alternatives]');if(await details.count()){await click(details.locator(':scope > summary'));check(await details.locator('iframe').count()===0,'Every stop stays lazy');check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Expanded alternatives fit '+lang+' '+width+' stop '+index);check(await details.locator('.watch-path-meta').count()===await details.locator('[data-watch-alternative-card]').count(),'Every alternative has language/production metadata')}}
 check(errors.length===0,'No page errors: '+errors.join(';'));await c.close();
}
await browser.close();console.log('PASS: '+checks+' alternative browser assertions, HE/EN at desktop/390/320.');})().catch(e=>{console.error(e);process.exit(1)});
