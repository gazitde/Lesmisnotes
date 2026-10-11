const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const base=process.env.SEARCH_TEST_URL||'http://localhost:8873';
const dir=path.join(process.env.SEARCH_ARTIFACT_DIR||'test-results','visual');
(async()=>{
 fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
 const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();
 const routes=Object.entries(JSON.parse(fs.readFileSync('config/metadata.json')).pages).filter(([,v])=>!v.canonicalRoute).map(([k])=>k);
 const report=[],failures=[];let checks=0;
 const check=(ok,name,detail)=>{checks++;if(!ok)failures.push({name,detail});};
 await page.goto(base+'/');await page.waitForURL('**/en/home/');check(await page.locator('html').getAttribute('lang')==='en','New visitor defaults to English');
 await page.goto(base+'/he/history/');check(await page.locator('html').getAttribute('lang')==='he','Explicit Hebrew route wins');
 await page.locator('[data-action="privacy-open"]').first().click();
 const functional=page.locator('#privacy-functional');await functional.check();await page.locator('[data-action="privacy-save"]').click();
 await page.goto(base+'/');await page.waitForURL('**/he/home/');check(await page.locator('html').getAttribute('lang')==='he','Saved Hebrew wins at root');
 await page.goto(base+'/en/home/');check(await page.locator('html').getAttribute('lang')==='en','Explicit English beats saved Hebrew');
 for(const lang of ['en','he'])for(const width of [1365,390,320]){
  await page.setViewportSize({width,height:900});
  for(const route of routes){
   await page.goto(base+'/'+lang+'/'+route+'/',{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(120);
   const layout=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,heading:document.querySelector('h1')?.textContent,overflow:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>document.documentElement.clientWidth+1||r.left< -1)&&!e.closest('svg,.vinyl,.hero-art,.graph-full,.leaflet-container')}).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent?.slice(0,80)}))}));
   check(layout.scroll<=layout.width,`${lang}/${route} ${width} whole page fit`,layout);
   check(Boolean(layout.heading),`${lang}/${route} ${width} main heading`);
   const language=await page.locator('[data-action="language"]').boundingBox();check(language&&language.width>=44&&language.height>=44&&language.x>=0&&language.x+language.width<=width,`${lang}/${route} ${width} visible touch language control`);
   report.push({lang,route,width,...layout});
   if(route==='before'&&width<681)check(await page.locator('.family-heading').evaluate(el=>el.querySelector('h2').getBoundingClientRect().width>=el.getBoundingClientRect().width*.8),`Family heading uses readable width ${lang} ${width}`);
   if(width!==320){
    for(const disclosure of await page.locator('.place-secondary-photo:not([open])>summary').all())await disclosure.click();
    for(const img of await page.locator('main img[loading="lazy"]').all()){
      await img.scrollIntoViewIfNeeded();await img.evaluate(el=>el.complete?Promise.resolve():new Promise(resolve=>{el.addEventListener('load',resolve,{once:true});el.addEventListener('error',resolve,{once:true});setTimeout(resolve,6000)}));
      check(await img.evaluate(el=>el.naturalWidth>0),`Local lazy image loaded ${lang}/${route} ${width}`);
    }
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:path.join(dir,`${lang}-${route}-${width}.png`),fullPage:true});
   }
   if(route==='home'||route==='contact'){
    for(const selector of route==='home'?['.poster-stamp','.vinyl-label']:['.contact-postmark']){
     const circle=await page.locator(selector).evaluate(el=>{
      const radius=el.clientWidth/2,border=parseFloat(getComputedStyle(el).borderLeftWidth)||0;
      const children=[...el.children].filter(e=>e.offsetWidth&&e.offsetHeight).map(e=>({text:e.textContent,left:e.offsetLeft,top:e.offsetTop,width:e.offsetWidth,height:e.offsetHeight}));
      return {radius,children,overflow:el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1};
     });
     check(!circle.overflow,`${selector} ${lang} ${width} content box fit`,circle);
     for(const child of circle.children){const x=Math.max(Math.abs(child.left-circle.radius),Math.abs(child.left+child.width-circle.radius));const y=Math.max(Math.abs(child.top-circle.radius),Math.abs(child.top+child.height-circle.radius));check(Math.hypot(x,y)<=circle.radius-2,`${selector} ${lang} ${width} circular safe area ${child.text}`,circle);}
    }
   }
  }
 }
 fs.writeFileSync(path.join(dir,'layout-report.json'),JSON.stringify({checks,failures,report},null,2));
 // Review rich gated layouts in their actual rendered state, not just the entry gates.
 for(const lang of ['en','he'])for(const width of [1365,390]){
  await page.setViewportSize({width,height:900});await page.goto(base+'/'+lang+'/story/');
  if(!await page.locator('[data-action="spoilers"]').evaluate(e=>e.classList.contains('on'))){await page.locator('[data-action="spoilers"]').click();if(await page.locator('[data-action="confirm-spoilers"]').isVisible())await page.locator('[data-action="confirm-spoilers"]').click();}
  for(const route of ['story','characters','compare','ideas','musical','novel','after','quiz']){
   await page.goto(base+'/'+lang+'/'+route+'/');
   for(const action of ['novel-open','after-open','show-open','director-open']){const e=page.locator(`[data-action="${action}"]`);if(await e.count())await e.first().click();}
   await page.evaluate(()=>document.fonts.ready);
   if(route==='story')check(await page.locator('.story-foot .btn.secondary').evaluate(el=>{
     const linear=c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4};
     const luminance=css=>{const c=css.match(/[0-9.]+/g).slice(0,3).map(Number);return .2126*linear(c[0])+.7152*linear(c[1])+.0722*linear(c[2])};
     const f=luminance(getComputedStyle(el).color),b=luminance(getComputedStyle(el.closest('.story-foot')).backgroundColor);return (Math.max(f,b)+.05)/(Math.min(f,b)+.05)>=4.5;
    }),`Story closing button contrast ${lang} ${width}`);
   if(route==='musical')check(await page.locator('.show-art').evaluate(el=>{const outer=el.getBoundingClientRect(),label=el.lastElementChild.getBoundingClientRect();return label.top>=outer.top+12&&label.bottom<=outer.bottom-12&&label.left>=outer.left+12&&label.right<=outer.right-12}),`Musical caption inside inset border ${lang} ${width}`);
   const markers={story:'.story-chapter',characters:'.relationship-graph',novel:'.novel-event',after:'.curtain-stop'};
   if(markers[route])check(await page.locator(markers[route]).count()>0,`Open ${lang}/${route} actually contains rich content`);
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),`Open ${lang}/${route} ${width} fit`);
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.screenshot({path:path.join(dir,`${lang}-${route}-open-${width}.png`),fullPage:true});
   if(route==='quiz'){
    if(await page.locator('[data-action="quiz-change"]').count())await page.locator('[data-action="quiz-change"]').first().click();
    await page.locator('[data-quiz-length="5"]').click();await page.locator('[data-action="quiz-start"]').click();
    check(await page.locator('.quiz-question-heading').count()>0,`Quiz question visible ${lang} ${width}`);
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),`Quiz question fits ${lang} ${width}`);
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:path.join(dir,`${lang}-quiz-question-${width}.png`),fullPage:true});
    for(let i=0;i<5;i++){await page.locator('[data-quiz-option]').first().click();await page.locator('[data-action="quiz-submit"]').click();await page.locator('[data-action="quiz-next"]').click();}
    check(await page.locator('.result-main').count()>0,`Quiz result visible ${lang} ${width}`);
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),`Quiz result fits ${lang} ${width}`);
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:path.join(dir,`${lang}-quiz-result-${width}.png`),fullPage:true});
   }

  }
 }
 fs.writeFileSync(path.join(dir,'layout-report.json'),JSON.stringify({checks,failures,report},null,2));
 await browser.close();console.log(`Visual regression: ${checks} checks across ${routes.length*2} localized pages, desktop/390/320, circle text, language preferences and open states.`);
 if(failures.length){console.error(JSON.stringify(failures,null,2));process.exit(1)}
})().catch(e=>{console.error(e);process.exit(1)});
