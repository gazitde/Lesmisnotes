'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.SEARCH_TEST_URL||'http://127.0.0.1:8897',dir=process.env.SEARCH_ARTIFACT_DIR||'test-results';fs.mkdirSync(dir,{recursive:true});
let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++};
const targets={grantaire:'p3-b4-c1',gillenormand:'p3-b2-c1',fauchelevent:'p1-b5-c6','friends-abc':'p3-b4-c1'};
const aliases=['end-of-day','dreamed-dream','who-am-i','master-house','stars','one-day-more','red-black','people-sing','heart-love','on-my-own','empty-chairs'];
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
for(const lang of ['he','en'])for(const width of [1365,390,320]){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
 await page.goto(`${base}/${lang}/characters/`);await page.locator('.character-discovery').waitFor();
 check(await page.locator('.character-discovery-card').count()===4,'Four discovery cards');check(await page.locator('.character-discovery-card[open]').count()===0,'All discovery starts collapsed');
 check(await page.locator('.profile-directory a').count()===10,'Ten canonical profiles remain');
 const flags=()=>page.evaluate(()=>Object.fromEntries(Object.entries(sessionStorage).filter(([key])=>/spoiler|consent/.test(key))));const before=JSON.stringify(await flags());
 for(const [id,target]of Object.entries(targets)){
  const card=page.locator(`[data-discovery-id="${id}"]`),summary=card.locator('summary');await summary.focus();await page.keyboard.press('Enter');check(await card.evaluate(el=>el.open),'Keyboard expands '+id);
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No discovery overflow '+lang+width+id);
  check(await card.locator('.character-discovery-chapter').getAttribute('href')===`/${lang}/novel/?focus=chapter%3A${target}`,'Exact chapter link');
  check(await card.locator('a').evaluateAll(es=>es.every(e=>e.getBoundingClientRect().height>=44)),'Touchable links');
  if(id==='friends-abc'&&width!==1365)await page.locator('.character-discovery').screenshot({path:path.join(dir,`discovery-${lang}-${width}.png`)});
  await card.locator('.character-discovery-chapter').focus();await page.keyboard.press('Enter');await page.locator('#reader-chapter-'+target).waitFor();
  check(new URL(page.url()).searchParams.get('focus')==='chapter:'+target,'Chapter navigation lands correctly');check(await page.locator('.character-discovery').count()===0,'No directory module in chapter context');check(JSON.stringify(await flags())===before,'Discovery never grants consent');
  await page.goBack();await page.locator('.character-discovery').waitFor();await page.goForward();await page.locator('#reader-chapter-'+target).waitFor();check(JSON.stringify(await flags())===before,'Forward does not grant consent');await page.goBack();await page.locator('.character-discovery').waitFor();
 }
 for(const query of ['reader=p1-b1-c1','reader=p5-b9-c6','reader=bogus&view=full']){await page.goto(`${base}/${lang}/character-valjean/?${query}`);await page.locator('.reader-character-profile').waitFor();check(await page.locator('.character-discovery').count()===0,'Bounded profile excludes discovery');}
 for(const id of aliases){
  await page.goto(`${base}/${lang}/musical/?focus=song%3A${id}&view=journey`);const reveal=page.locator('#musical-journey [data-action="enable-spoilers"]');if(await reveal.count())await reveal.click();await page.locator('#show-current-title').waitFor();
  const label=page.locator('#show-slide [data-recording-title]');check(await label.count()===(lang==='he'?1:0),'HE-only alias '+id);if(lang==='he'){check((await label.textContent()).includes('באלבום הקאמרי (1987):'),'Album-specific label');check(await label.locator('a').getAttribute('href')==='https://www.nli.org.il/en/items/NNL_MUSIC_AL997013219803805171/NLI','Exact source link');check((await page.locator('#show-slide .show-original-title').textContent()).length>0,'English primary reference remains');}
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No song overflow '+lang+width+id);
  if(id==='who-am-i'&&lang==='he'&&width===320)await page.locator('#show-slide').screenshot({path:path.join(dir,`recording-title-${lang}-${width}.png`)});
 }
 for(const id of ['bring-him-home','epilogue']){await page.goto(`${base}/${lang}/musical/?focus=song%3A${id}&view=journey`);await page.locator('#show-current-title').waitFor();check(await page.locator('#show-slide [data-recording-title]').count()===0,'No unsupported alias '+id);}
 await page.goto(`${base}/${lang}/musical/?focus=song%3Aon-my-own&view=journey`);await page.locator('#show-current-title').waitFor();await page.locator('[data-action="language"]').click();check(new URL(page.url()).searchParams.get('focus')==='song:on-my-own','Language keeps song target');check(await page.locator('#show-slide [data-recording-title]').count()===(lang==='en'?1:0),'Language switches alias visibility');
 check(errors.length===0,'No page errors '+JSON.stringify(errors));await context.close();
}
await browser.close();console.log(`Discovery and recording titles: ${checks} browser checks passed across HE/EN, desktop/390/320, keyboard, history, chapter boundaries, source links and language.`);
})().catch(e=>{console.error(e);process.exit(1)});
