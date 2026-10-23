'use strict';
// Runs only against the local test server, in fresh isolated contexts. No real user data or live media requests.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.SEARCH_TEST_URL||'http://127.0.0.1:8873',dir=process.env.SEARCH_ARTIFACT_DIR||'test-results';
const installQuizMediaFixtures=require('./helpers/quiz-media-init.cjs');
const RUN='barricade-quiz-run',CONSENT='barricade-consent-v1',QUIZ_CONSENT='barricade-quiz-consent';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});fs.mkdirSync(dir,{recursive:true});let checks=0;
 const check=(value,message)=>{assert.ok(value,message);checks++};
 const click=(page,action)=>page.locator(`[data-action="${action}"]`).click();
 const snapshot=page=>page.evaluate(()=>({disk:Object.fromEntries(Object.entries(localStorage).filter(([k])=>k!=='barricade-quiz-run')),session:Object.fromEntries(Object.entries(sessionStorage).filter(([k])=>k!=='barricade-quiz-consent'))}));
 const answer=async page=>{await page.locator('[data-quiz-option="0"]').click();await click(page,'quiz-submit');await click(page,'quiz-next')};
 try{
  for(const lang of ['he','en'])for(const width of [1280,390,320])for(const functional of [true,false]){
   const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),external=[];
   await ctx.route('**/*',r=>{if(new URL(r.request().url()).origin===new URL(base).origin)return r.continue();external.push(r.request().url());return r.abort()});
   await ctx.addInitScript(installQuizMediaFixtures,{functional,origin:new URL(base).origin});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`${base}/${lang}/quiz/`);check(await page.locator('[data-action="quiz-delete"]').isVisible(),'Reset visible in setup');
   await click(page,'quiz-start');await answer(page);const before=await snapshot(page);
   const question=await page.locator('#quiz-question-title').textContent();await click(page,'quiz-delete');
   check(await page.locator('#quiz-reset-dialog').evaluate(e=>e.open),'Confirmation dialog opens');
   check(await page.locator('[data-action="quiz-delete-cancel"]').evaluate(e=>e===document.activeElement),'Cancel receives initial focus');
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Dialog fits viewport');
   if(!functional&&width===390)await page.screenshot({path:path.join(dir,`quiz-reset-${lang}.png`)});
   await page.keyboard.press('Escape');check(await page.locator('#quiz-question-title').textContent()===question,'Escape preserves current question');
   check(await page.locator('[data-action="quiz-delete"]').evaluate(e=>e===document.activeElement),'Escape returns focus');
   await click(page,'quiz-delete');await click(page,'quiz-delete-cancel');assert.deepEqual(await snapshot(page),before);checks++;
   await click(page,'quiz-delete');await click(page,'quiz-delete-confirm');
   check(await page.locator('.quiz-setup').isVisible(),'Confirmed reset returns to setup');
   check(await page.evaluate(([run,consent])=>localStorage.getItem(run)===null&&sessionStorage.getItem(consent)===null,[RUN,QUIZ_CONSENT]),'Quiz storage removed');
   assert.deepEqual(await snapshot(page),before);checks++;
   await page.reload();check(await page.locator('[data-action="quiz-resume"]').count()===0,'Reload cannot resume reset round');
   await click(page,'quiz-start');for(let i=0;i<5;i++)await answer(page);
   check(await page.locator('.quiz-result').isVisible(),'Result reached');await click(page,'quiz-delete');await click(page,'quiz-delete-confirm');
   check(await page.locator('.quiz-result').count()===0,'Result and preview removed by reset');
   check(await page.locator('.quiz-setup').isVisible(),'Result reset returns to setup');
   // A dormant stored round remains independently clearable while remembering is off.
   await page.evaluate(([run,key])=>{localStorage.setItem(run,'{"test":"dormant"}');const c=JSON.parse(localStorage.getItem(key));c.functional=false;localStorage.setItem(key,JSON.stringify(c))},[RUN,CONSENT]);
   await page.reload();await click(page,'quiz-delete');await click(page,'quiz-delete-confirm');
   check(await page.evaluate(run=>localStorage.getItem(run)===null,RUN),'Dormant saved state removed without opting in');
   // Blocked deletion never reports success; retry is an explicit visitor action.
   await page.evaluate(run=>{localStorage.setItem(run,'{"test":"blocked"}');window.__remove=Storage.prototype.removeItem;Storage.prototype.removeItem=function(key){if(key===run)throw Error('Test storage block');return window.__remove.call(this,key)}},RUN);
   await click(page,'quiz-delete');await click(page,'quiz-delete-confirm');
   check((await page.locator('#quiz-reset-status').textContent()).includes(lang==='en'?'could not be cleared':'לא הצלחנו למחוק'),'Storage failure disclosed');
   await page.evaluate(()=>Storage.prototype.removeItem=window.__remove);await click(page,'quiz-delete');await click(page,'quiz-delete-confirm');
   // Inject only API callbacks, never issue a live request or click an external link.
   await page.goto(`${base}/${lang}/listening/?clip=_6nTyXcmgLc`);await page.waitForFunction(()=>window.__ytPlayers.length>0);
   const instance=await page.evaluate(()=>window.__ytPlayers[0].frame.id.slice(3));
   const direct=page.locator(`#video-${instance}`).locator('..').locator('.watch-link a');check(await direct.isVisible(),'Direct YouTube escape always visible');
   for(const code of [100,101,150,153,5]){
    await page.evaluate(code=>window.__ytPlayers[0].options.events.onError({data:code}),code);
    check(await page.locator(`#video-recovery-${instance}`).isVisible()===(code===100),'Search fallback only for missing/private video');
    check((await page.locator(`#video-status-${instance}`).textContent()).length>0,'Error has explanatory status');
    check(await direct.isVisible(),'Error never removes direct escape');
   }
   check(!external.some(url=>url.includes('/results?search_query=')),'Search URL never requested automatically');
   check(errors.length===0,'No runtime errors: '+errors.join('; '));await ctx.close();
  }
 }finally{await browser.close()}
 console.log(`Quiz/media recovery: ${checks} checks passed in isolated HE/EN desktop/mobile contexts.`);
})().catch(error=>{console.error(error);process.exit(1)});
