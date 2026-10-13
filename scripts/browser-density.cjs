const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const base=process.env.SEARCH_TEST_URL||'http://localhost:8873';
const dir=path.join(process.env.SEARCH_ARTIFACT_DIR||'test-results','density');
(async()=>{
 fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
 const routes=['home','screen','musical','novel','ideas','history','hugo','before','characters','character-valjean','recipes','places','about','contact','listening'];
 const report=[],failures=[];let checks=0;
 const check=(v,label,detail)=>{checks++;if(!v)failures.push({label,detail});};
 for(const lang of ['he','en'])for(const width of [1365,390,320]){
  const c=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await c.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  const p=await c.newPage();
  for(const route of routes){
   await p.goto(`${base}/${lang}/${route}/`,{waitUntil:'domcontentloaded'});await p.evaluate(()=>document.fonts.ready);
   const data=await p.evaluate(()=>{
    const box=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,paddingTop:parseFloat(cs.paddingTop),paddingBottom:parseFloat(cs.paddingBottom)}};
    return {height:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth>innerWidth,top:box('.page-top'),section:box('.page-top + .wrap.section'),lineage:box('.screen-lineage'),branches:[...document.querySelectorAll('.screen-branches article')].map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}}),progress:box('.reader-setup .chapter-progress'),opening:box('.reader-setup .reading-opening-note'),utilityOutside:!!document.querySelector('.page-top + .page-utility'),text:[...document.querySelectorAll('.screen-branches p,.path-card p,.reader-overview p,.profile-prose p')].map(e=>parseFloat(getComputedStyle(e).fontSize))};
   });
   report.push({lang,width,route,...data});check(!data.overflow,`${lang}/${route}/${width} no overflow`,data);
   check(!data.utilityOutside,`${lang}/${route}/${width} no empty save row`);
   check(data.text.every(n=>n>=16),`${lang}/${route}/${width} body text remains readable`,data.text);
   if(data.section){check(data.section.paddingTop<=36,`${lang}/${route}/${width} bounded first section gap`,data.section);}
   const save=p.locator('.page-top .bookmark-control');
   if(await save.count()){const b=await save.boundingBox();check(b.width>=44&&b.height>=44,`${lang}/${route}/${width} usable bookmark target`,b);check((await save.getAttribute('aria-pressed'))!==null,`${lang}/${route}/${width} bookmark retains state semantics`);}
   if(route==='screen'){
    check(data.branches.length===3,`${lang}/${width} all three adaptation formats retained`);
    check(await p.locator('.page-top h1 br').evaluateAll(es=>es.every(e=>getComputedStyle(e).display!=='none')),`${lang}/${width} title words retain their separator`);
    if(width>900){check(Math.max(...data.branches.map(x=>x.y))-Math.min(...data.branches.map(x=>x.y))<2,`${lang}/${width} concise side-by-side formats`,data.branches);check(data.lineage.height<440,`${lang}/${width} bounded format panel`,data.lineage);}
    check(await p.locator('.adaptation-compare-card').count()===4,`${lang}/${width} four comparison versions preserved`);
    check(await p.locator('.screen-card').count()===9,`${lang}/${width} nine screen entries preserved`);
    await p.screenshot({path:path.join(dir,`${lang}-screen-${width}-full.png`),fullPage:true});
    await p.screenshot({path:path.join(dir,`${lang}-screen-${width}-entry.png`)});
   }
   if(route==='novel'){
    check(Boolean(data.progress&&data.opening),`${lang}/${width} reader orientation and explicit progress both present`);
    if(width>900)check(Math.abs(data.progress.y-data.opening.y)<2,`${lang}/${width} reader setup shares a row`,data);
    else check(data.opening.y>=data.progress.bottom,`${lang}/${width} reader setup stacks readably`,data);
    check(await p.locator('.reader-part-card').count()===5,`${lang}/${width} five novel Parts preserved`);
   }
   if(['home','novel','characters','ideas'].includes(route))await p.screenshot({path:path.join(dir,`${lang}-${route}-${width}-entry.png`)});
  }
  // The moved save button still opens preferences on demand and returns focus.
  await p.goto(`${base}/${lang}/screen/`);const save=p.locator('.page-top .bookmark-control');await save.focus();await p.keyboard.press('Enter');
  check(await p.locator('#privacy-dialog').isVisible(),`${lang}/${width} save without consent opens preferences`);
  await p.keyboard.press('Escape');check(await save.evaluate(e=>e===document.activeElement),`${lang}/${width} dismissed preferences restore save focus`);
  await c.close();
 }
 await browser.close();fs.writeFileSync(path.join(dir,'metrics.json'),JSON.stringify({checks,failures,report},null,2));
 console.log(`Density review: ${checks} checks; ${report.length} localized route/viewport combinations.`);
 if(failures.length){console.error(JSON.stringify(failures,null,2));process.exit(1)}
})().catch(e=>{console.error(e);process.exit(1)});
