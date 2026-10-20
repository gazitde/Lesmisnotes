'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.SEARCH_TEST_URL||'http://localhost:8873',dir=path.join(process.env.SEARCH_ARTIFACT_DIR||'test-results','part-search');
(async()=>{fs.mkdirSync(dir,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++};
for(const lang of ['en','he'])for(const width of [1365,390,320]){
 const c=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});await c.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());const p=await c.newPage();
 await p.goto(`${base}/${lang}/home/`);await p.locator('[data-action="privacy-reject"]').first().click();
 const fill=async q=>{await p.locator('#site-search-input').fill(q);await p.locator('#site-search-results[aria-busy="false"]').waitFor();};
 const q=lang==='he'?'חלק 5':'Part 5';await p.locator('[data-site-search-open]').click();await fill(q);
 const target=p.locator(`.site-search-list a[href="/${lang}/novel-journey/?focus=part%3Ap5"]`);await target.waitFor();check(await p.locator('.site-search-list a').count()===1,'Numeric Part query has exactly one safe destination');check(await p.locator('#site-search-status').innerText()===(lang==='he'?'1 תוצאה':'1 result'),'Single-result count uses correct localized singular');
 check(!(await p.locator('#site-search-results').innerText()).includes(lang==='he'?'המתרס':'barricade'),'No Part overview leaked into result');
 await p.locator('#site-search-dialog').screenshot({path:path.join(dir,`${lang}-${width}-result.png`)});
 await target.focus();await p.keyboard.press('Enter');check(new URL(p.url()).searchParams.get('focus')==='part:p5','Exact Part route opens');
 check(await p.locator('#reader-part-panel').evaluate(e=>e===document.activeElement),'Part panel receives focus');check(await p.locator('.reader-book-card').count()===8,'Fifth Part shows eight main-route Books; essay Book remains optional');
 check(await p.locator('[data-novel-event]').count()===0,'Whole-novel recap remains gated');check(await p.locator('.reader-breadcrumbs [aria-current="page"]').count()===1,'Breadcrumb identifies the searched Part');
 await p.locator('[data-reader-book="p5-b1"] [data-reader-link]').click();await p.locator('#reading-book-panel[data-reader-ready="true"]').waitFor();check(await p.locator('#reading-book-panel').getAttribute('data-book-id')==='p5-b1','Part result leads into selected Book');
 await p.goBack();check(new URL(p.url()).searchParams.get('focus')==='part:p5','Back returns to searched Part');
 await p.locator('[data-action="language"]').click();check(new URL(p.url()).searchParams.get('focus')==='part:p5','Language preserves searched Part');check(await p.locator('.reader-book-card').count()===8,'Translated Part keeps the same main-route Books');
 await p.reload();check(new URL(p.url()).searchParams.get('focus')==='part:p5','Reload preserves Part');
 await p.locator('[data-site-search-open]').click();await fill('Part 6');await p.locator('.site-search-empty').waitFor();check(await p.locator('.site-search-list a').count()===0,'Invalid Part gives an honest empty state');
 // All searches here remain in spoiler-off mode, including after reader navigation.
 const uiLang=lang==='he'?'en':'he';
 for(const [query,id] of [['Jean–Valjean','valjean'],['Éponine','eponine'],["ז'אן ולז'אן",'valjean'],['Cosset','cosette']]){await fill(query);check(await p.locator('.site-search-list a').first().getAttribute('href')===`/${uiLang}/character-${id}/`,'Name punctuation/alias leads to the actual profile');}
 await fill('June 5');check(await p.locator('.site-search-list a').count()===1,'Day query cannot match digits inside other years');check(await p.locator('.site-search-list a').first().getAttribute('href')===`/${uiLang}/history/?focus=history%3A1832`,'Date selects the uprising, not Waterloo');
 for(const query of ['Marius alive','Marius rescue','ז׳אבר שבוי']){await fill(query);check(await p.locator('.site-search-list a').count()===0,'Earlier-Book outcome cannot affect safe results/counts');check((await p.locator('#site-search-status').innerText()).startsWith('0 '),'Honest zero count for protected Book outcome');}
 for(const query of ['p1-b1','1.1','Part I Book I','חלק א׳ ספר א׳']){await fill(query);check(await p.locator('.site-search-list a').count()===1,'Book variants resolve to one precise destination');check(await p.locator('.site-search-list a').first().getAttribute('href')===`/${uiLang}/novel-journey/?focus=book%3Ap1-b1`,'Exact Book URL');check((await p.locator('.site-search-list').innerText()).includes(uiLang==='he'?'בחרו פרק לקריאה':'choose a chapter'),'Book result has neutral navigation snippet');}
 await p.locator('.site-search-list a').first().focus();await p.keyboard.press('Enter');await p.locator('#reading-book-panel[data-reader-ready="true"]').waitFor();check(await p.locator('#reading-book-panel').getAttribute('data-book-id')==='p1-b1','Book result lands in first Book');
 await p.locator('[data-site-search-open]').click();await fill(uiLang==='he'?'חלק א׳ ספר א׳ פרק ב׳':'Part I Book I Chapter II');check(await p.locator('.site-search-list a').count()===1,'Roman/Hebrew Chapter gives one result');
 await p.keyboard.press('ArrowDown');check(await p.locator('.site-search-list a').evaluate(e=>document.activeElement===e),'Arrow key selects precise Chapter result');await p.keyboard.press('Enter');await p.locator('#reader-chapter-p1-b1-c2').waitFor();check(new URL(p.url()).searchParams.get('focus')==='chapter:p1-b1-c2','Chapter route retains exact coordinate');check(await p.locator('#reader-chapter-p1-b1-c2').evaluate(e=>e===document.activeElement),'Chapter destination receives keyboard focus');
 await p.locator('[data-site-search-open]').click();await fill('Part I Book I Chapter XV');check(await p.locator('.site-search-list a').count()===0,'Out-of-range Chapter has no invented destination');
 await p.keyboard.press('Escape');check(await p.locator('[data-site-search-open]').evaluate(e=>e===document.activeElement),'Escape restores focus to search opener');check(await p.locator('[data-novel-event]').count()===0,'Search never unlocks whole-novel recap');
 await p.locator('[data-site-search-open]').click();await fill('1885');const author=p.locator('.site-search-list a[href*="focus=author%3A"]');await author.click();check(await p.locator('[data-hugo-date="6"]').evaluate(e=>e===document.activeElement),'Author date search focuses its exact timeline entry');check((await p.locator('[data-hugo-date="6"]').innerText()).includes('1885'),'Author date destination contains searched year');
 await p.locator('[data-action="language"]').click();check(new URL(p.url()).searchParams.get('focus')==='author:6','Language retains exact author date');check(await p.locator('[data-hugo-date="6"]').evaluate(e=>e===document.activeElement),'Translated author date keeps focus');
 await c.close();
}
await browser.close();console.log(`Part search browser: ${checks} checks, HE/EN1365/390/320, exact Part/Book/Chapter results, names/dates, protected Book outcomes, keyboard, history, language, reload and invalid input.`);
})().catch(e=>{console.error(e);process.exit(1)});
