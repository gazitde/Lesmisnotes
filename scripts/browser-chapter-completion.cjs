'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.SEARCH_TEST_URL||'http://localhost:8873',dir=process.env.SEARCH_ARTIFACT_DIR||'test-results';
const KEY='barricade-completed-chapters-v1',one='p1-b1-c1',two='p1-b1-c2',three='p1-b1-c3';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});let checks=0;
 const check=(value,message)=>{assert.ok(value,message);checks++};
 const same=(value,expected,message)=>{assert.deepEqual(value,expected,message);checks++};
 fs.mkdirSync(dir,{recursive:true});
 async function context(width=1365){const c=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});await c.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());return c}
 const ready=p=>p.locator('#reading-book-panel[data-reader-ready="true"]').waitFor();
 const count=p=>p.locator('[data-completion-progress]').evaluate(e=>e.value);
 const saved=p=>p.evaluate(key=>localStorage.getItem(key),KEY);
 const mark=(p,id)=>p.locator(`[data-completion-mark="${id}"]`);
 const undo=(p,id)=>p.locator(`[data-completion-undo="${id}"]`);
 async function choose(p,enabled){await p.locator('[data-action="privacy-open"]').first().click();await p.locator('#privacy-functional').setChecked(enabled);await p.locator('#privacy-analytics').uncheck();await p.locator('[data-action="privacy-save"]').click();}
 for(const lang of ['he','en'])for(const width of [1365,390,320]){
  const c=await context(width),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`${base}/${lang}/novel/?focus=chapter%3A${one}`);await ready(p);
  await p.locator('[data-action="privacy-reject"]').first().click();await ready(p);
  same(await count(p),0,'Opening a chapter marks nothing');same(await p.locator('[data-completion-progress]').getAttribute('max'),'365','Accessible native progress has the complete denominator');
  same(await p.locator('#chapter-completion-storage').count(),1,'One consent/storage disclosure, not one for each chapter');
  same(await p.locator('.chapter-progress-storage button[data-action="privacy-open"]').getAttribute('type'),'button','Saving settings are discoverable without an automatic prompt');
  check(await p.locator('.chapter-progress-storage').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=15),'Readable helper text');
  check((await p.locator('#chapter-completion-storage').textContent()).includes(lang==='he'?'נעלמים ברענון':'disappear on reload'),'Memory-only limit is clear after refusal');
  same(await mark(p,one).textContent(),lang==='he'?'סיימתי את הפרק':'Mark chapter read','Explicit localized marking action');
  const initialSession=await p.evaluate(()=>JSON.stringify({...sessionStorage}));
  await mark(p,one).focus();await p.keyboard.press('Enter');same(await count(p),1,'Keyboard marks the current chapter');check(await undo(p,one).evaluate(e=>e===document.activeElement),'Focus moves to this chapter’s undo');
  // Replaying the original hidden mark cannot toggle or double count.
  await mark(p,one).evaluate(e=>{e.click();e.click()});same(await count(p),1,'Repeated mark remains idempotent');same(await saved(p),null,'Refused functional storage remains untouched');
  await mark(p,two).click();same(await count(p),2,'Another explicit mark increments once');await undo(p,one).click();same(await count(p),1,'Undo removes only the chosen chapter');check(await mark(p,one).evaluate(e=>e===document.activeElement),'Undo returns focus to marking action');
  await p.locator('#reading-chapter').selectOption(three);await ready(p);same(await count(p),1,'Chapter navigation does not mark read');
  await p.locator('.reader-breadcrumbs a[href*="part%3Ap1"]').click();same(await count(p),1,'Part hierarchy rerender keeps explicit completion');await p.goBack();await ready(p);same(await count(p),1,'Back keeps explicit completion');await p.goForward();same(await count(p),1,'Forward keeps explicit completion');await p.goBack();await ready(p);
  await p.locator('[data-action="language"]').click();await ready(p);same(await count(p),1,'Language keeps IDs and count');check(await undo(p,two).isVisible(),'Marked chapter stays marked after language change');same(new URL(p.url()).searchParams.get('focus'),'chapter:'+three,'Completion does not alter current chapter URL');
  same(await p.evaluate(()=>JSON.stringify({...sessionStorage})),initialSession,'Completion never changes any spoiler choice');same(await p.locator('.chapter-wide-links .insight-link').count(),0,'Completion does not unlock future-story links');
  check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Completion controls fit viewport including RTL');
  if(width<=390){await p.locator('#toast.visible').waitFor({state:'hidden'});const displayedLanguage=await p.locator('html').getAttribute('lang');await p.locator('.chapter-progress').screenshot({path:path.join(dir,`chapter-completion-progress-${displayedLanguage}-${width}.png`)});await p.locator('#reader-chapter-'+two).screenshot({path:path.join(dir,`chapter-completion-marked-${displayedLanguage}-${width}.png`)});}
  await p.reload();await ready(p);same(await count(p),0,'Reload discards unconsented session-only completion');same(await saved(p),null,'Reload has no completion persistence');same(errors,[],'No runtime errors in completion and navigation');await c.close();
 }
 for(const lang of ['he','en']){
  const c=await context(390),p=await c.newPage();await p.goto(`${base}/${lang}/novel/?focus=chapter%3A${one}`);await ready(p);await p.locator('[data-action="privacy-reject"]').first().click();
  await mark(p,one).click();await choose(p,true);same(JSON.parse(await saved(p)),{version:1,completed:[one]},'Grant persists explicit in-memory choice');
  const readingBefore=await p.evaluate(()=>localStorage.getItem('barricade-last-reading'));await mark(p,two).click();same(await p.evaluate(()=>localStorage.getItem('barricade-last-reading')),readingBefore,'Marking stays separate from remembered reading position');
  await p.reload();await ready(p);same(await count(p),2,'Reload restores opted-in marks');check(await undo(p,one).isVisible()&&await undo(p,two).isVisible(),'Both restored controls show undo');
  await choose(p,false);same(await count(p),0,'Revocation stops using saved completion');same(JSON.parse(await saved(p)).completed,[one,two],'Revocation does not silently delete saved data');
  await mark(p,three).click();same(await count(p),1,'New memory-only marks work after withdrawal');same(JSON.parse(await saved(p)).completed,[one,two],'Withdrawal prevents saved data updates');
  await choose(p,true);same(await count(p),3,'Regrant merges stored and session marks only after consent');same(JSON.parse(await saved(p)).completed,[one,two,three],'Merged IDs are canonical and unique');
  await p.locator('[data-action="privacy-open"]').first().click();await p.locator('[data-action="privacy-erase-open"]').click();await p.locator('[data-action="privacy-erase-cancel"]').click();await p.locator('[data-action="privacy-close"]').click();same(await count(p),3,'Cancel erase preserves completion');
  await p.locator('[data-action="privacy-open"]').first().click();await p.locator('[data-action="privacy-erase-open"]').click();await p.locator('[data-action="privacy-erase-confirm"]').click();same(await count(p),0,'Existing erase confirmation clears completion state');same(await saved(p),null,'Existing erase also removes completion key');await p.reload();await ready(p);same(await count(p),0,'Erasure survives reload');await c.close();
 }
 for(const raw of ['broken',JSON.stringify({version:7,completed:[one]}),JSON.stringify({version:1,completed:[one,one,'unknown',42,null]})]){
  const c=await context(),p=await c.newPage();await c.addInitScript(({key,raw})=>{const now=Date.now();localStorage.setItem('barricade-consent-v1',JSON.stringify({version:3,savedAt:now,expiresAt:now+180*86400000,functional:true,analytics:false,media:false}));localStorage.setItem(key,raw)},{key:KEY,raw});await p.goto(base+'/en/novel/?focus=chapter%3A'+one);await ready(p);same(await count(p),raw.includes('"version":1')?1:0,'Malformed, unknown and duplicate storage is safely normalized');await mark(p,two).click();same(JSON.parse(await saved(p)).completed,raw.includes('"version":1')?[one,two]:[two],'Next explicit write contains only canonical IDs');await c.close();
 }
 {const c=await context(),p=await c.newPage();await p.goto(base+'/en/novel/?focus=chapter%3A'+one);await ready(p);await choose(p,true);await mark(p,one).click();const other=await c.newPage();await other.goto(base+'/en/home/');await other.evaluate(()=>{const key=window.SitePrivacy.key,c=JSON.parse(localStorage.getItem(key));c.functional=false;localStorage.setItem(key,JSON.stringify(c))});await p.waitForFunction(()=>document.querySelector('[data-completion-progress]')?.value===0);same(await count(p),0,'Cross-tab consent revocation clears displayed completion');same(JSON.parse(await saved(p)).completed,[one],'Cross-tab withdrawal preserves device record for deliberate erasure');await c.close();}
 // Two already-open tabs: sequential explicit intents preserve other tabs' chapter marks.
 {const c=await context(),a=await c.newPage(),b=await c.newPage();await a.goto(base+'/en/novel/?focus=chapter%3A'+one);await ready(a);await choose(a,true);await b.goto(base+'/en/novel/?focus=chapter%3A'+one);await ready(b);
  await mark(a,one).click();await b.waitForFunction(()=>document.querySelector('[data-completion-progress]').value===1);await mark(b,two).click();await a.waitForFunction(()=>document.querySelector('[data-completion-progress]').value===2);same(JSON.parse(await saved(a)).completed,[one,two],'Sequential tab marks merge current device IDs');await undo(a,one).click();await b.waitForFunction(()=>document.querySelector('[data-completion-progress]').value===1);same(JSON.parse(await saved(b)).completed,[two],'Undo in another tab preserves unrelated marks');
  await choose(a,false);await b.waitForFunction(()=>document.querySelector('[data-completion-progress]').value===0);await mark(b,three).click();same(JSON.parse(await saved(a)).completed,[two],'Refused tab marks cannot write completion');await choose(b,true);await a.waitForFunction(()=>document.querySelector('[data-completion-progress]').value===2);same(JSON.parse(await saved(a)).completed,[two,three],'Regrant merges session intents and current saved IDs');await undo(a,two).click();await b.waitForFunction(()=>document.querySelector('[data-completion-progress]').value===1);same(JSON.parse(await saved(b)).completed,[three],'Post-regrant undo affects only its own chapter');await c.close();}
 // No optional key exists: only the explicit erasure revision distinguishes erase from ordinary settings.
 {const c=await context(),a=await c.newPage(),b=await c.newPage();await a.goto(base+'/en/novel/?focus=chapter%3A'+one);await ready(a);await choose(a,false);await b.goto(base+'/en/novel/?focus=chapter%3A'+one);await ready(b);await mark(b,one).click();await choose(b,false);same(await count(b),1,'Ordinary false-to-false settings preserve memory marks');same(await saved(a),null,'Both tabs are memory-only with no completion key');
  await a.locator('[data-action="privacy-open"]').first().click();await a.locator('[data-action="privacy-erase-open"]').click();await a.locator('[data-action="privacy-erase-confirm"]').click();await b.waitForFunction(()=>document.querySelector('[data-completion-progress]').value===0);same(await count(b),0,'Explicit false-to-false erase clears the other tab even without a storage-key deletion event');await choose(b,true);same(await count(b),0,'A later grant cannot resurrect erased pending marks');same(await saved(b),null,'Erased marks remain absent');await mark(b,two).click();await b.reload();await ready(b);same(await count(b),1,'An old erasure revision does not clear newly saved marks on reload');await c.close();}
 await browser.close();console.log(`Chapter completion: ${checks} real-browser checks passed (HE/EN, 320/390/1365px, marking, undo, history, language, reload, consent, erasure, corruption, keyboard and spoiler separation).`);
})().catch(error=>{console.error(error);process.exit(1)});
