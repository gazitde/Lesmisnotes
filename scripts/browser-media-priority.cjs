const {chromium}=require('playwright');
const fs=require('node:fs');
const base=process.env.SEARCH_TEST_URL||'http://localhost:8873';
const dir=(process.env.SEARCH_ARTIFACT_DIR||'test-results')+'/media-priority';
(async()=>{
 fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
 let checks=0;const report=[];const check=(ok,label)=>{checks++;if(!ok)throw new Error(label)};
 for(const lang of ['he','en'])for(const width of [320,390,750,1365]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),p=await context.newPage();
  await p.goto(base+'/'+lang+'/musical/');await p.evaluate(()=>document.fonts.ready);
  const layout=await p.evaluate(()=>{
   const top=s=>document.querySelector(s).getBoundingClientRect().top+scrollY;
   const media=document.querySelector('#featured-song-detail .coach-analysis iframe');
   return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,firstMediaTop:media.getBoundingClientRect().top+scrollY,spotlightTop:top('#musical-spotlight'),factsTop:top('.musical-facts'),coachTop:top('#featured-song-detail .coach-analysis'),readingTop:top('.song-reading-spotlight'),introTop:top('#featured-song-detail .coach-intro'),frames:document.querySelectorAll('#featured-song-detail iframe').length};
  });
  check(layout.scrollWidth<=width,`${lang} ${width}: no overflow`);
  check(layout.factsTop>layout.firstMediaTop,`${lang} ${width}: practical facts do not delay media`);
  check(layout.firstMediaTop<layout.readingTop&&layout.firstMediaTop<layout.introTop,`${lang} ${width}: player precedes extended analysis`);
  check(layout.frames===1,`${lang} ${width}: only existing spotlight player`);
  check(await p.locator('#show-slide').count()===0,`${lang} ${width}: journey stays spoiler-gated`);
  for(const a of await p.locator('.musical-index a').all())check((await a.innerText()).replace(/[0-9\s]/g,'').length>4,`${lang} ${width}: descriptive section label`);
  await p.screenshot({path:`${dir}/${lang}-${width}-entry.png`,fullPage:true});
  await p.locator('[data-action="show-open"]').click();
  check(await p.locator('#show-watch-stop iframe').count()>0,`${lang} ${width}: primary scene player`);
  check(await p.locator('.watch-alternatives iframe').count()===0,`${lang} ${width}: alternatives stay lazy`);
  const controls=await p.locator('.show-station-nav button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent.trim(),left:r.left,right:r.right,height:r.height,scroll:e.scrollWidth,client:e.clientWidth}}));
  check(controls.every(e=>e.text.length>1&&e.left>=0&&e.right<=width&&e.height>=44&&e.scroll<=e.client+1),`${lang} ${width}: readable scene controls`);
  check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${lang} ${width}: open journey fits`);
  await p.locator('#show-slide').screenshot({path:`${dir}/${lang}-${width}-scene.png`});
  const sceneCue=await p.locator('.show-station-nav [data-show-move="next"]').evaluate(e=>({content:getComputedStyle(e,'::after').content,width:getComputedStyle(e,'::after').width,transform:getComputedStyle(e,'::after').transform}));
  check(sceneCue.content==='""'&&sceneCue.width==='7px',`${lang} ${width}: subtle visible scene chevron`);
  await p.goto(base+'/'+lang+'/novel/?focus=chapter%3Ap1-b1-c2');
  await p.locator('#reading-book-panel[data-reader-ready="true"]').waitFor();
  const next=p.locator('.reader-chapter-card.is-current .slide-next');
  const chapterCue=await next.evaluate(e=>({content:getComputedStyle(e,'::after').content,width:getComputedStyle(e,'::after').width,transform:getComputedStyle(e,'::after').transform,height:e.getBoundingClientRect().height}));
  check(chapterCue.width==='7px'&&chapterCue.height>=44&&chapterCue.transform===sceneCue.transform,`${lang} ${width}: chapter cue matches scene direction with touch target`);
  await p.locator('.reader-chapter-card.is-current').screenshot({path:`${dir}/${lang}-${width}-chapter.png`});
  await next.click();
  await p.locator('#reader-chapter-p1-b1-c3.is-current').waitFor();
  check(new URL(p.url()).searchParams.get('focus')==='chapter:p1-b1-c3',`${lang} ${width}: chapter cue navigates`);
  report.push({lang,...layout,controls,sceneCue,chapterCue});await context.close();
 }
 fs.writeFileSync(dir+'/report.json',JSON.stringify({checks,report},null,2));
 await browser.close();console.log(`PASS: ${checks} media placement, labelled navigation and responsive checks.`);
})().catch(e=>{console.error(e);process.exit(1)});
