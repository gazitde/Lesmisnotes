'use strict';
// CI runs actual native <details>, focus, history, and RTL/LTR layout behavior.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.SEARCH_TEST_URL||'http://localhost:8873',dir=process.env.SEARCH_ARTIFACT_DIR||'test-results';
const groups={'p2-b7':8,'p4-b7':4,'p5-b2':6},linked=['p5-b3-c1','p5-b3-c4','p5-b3-c6','p5-b3-c7','p5-b3-c8','p2-b1-c19'];
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});let checks=0;
 const check=(value,message)=>{assert.ok(value,message);checks++},same=(value,expected,message)=>{assert.deepEqual(value,expected,message);checks++};
 const ready=p=>p.locator('#reading-book-panel[data-reader-ready="true"]').waitFor();
 const group=(p,id)=>p.locator(`details.reader-essay-chapters[data-essay-book="${id}"]`);
 const opened=g=>g.evaluate(e=>e.open);
 const storage=p=>p.evaluate(()=>JSON.stringify({...sessionStorage}));
 const noOverflow=p=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
 fs.mkdirSync(dir,{recursive:true});
 try{
 for(const lang of ['he','en'])for(const width of [320,390,750,1365]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  // Count the whole hierarchy in each URL-selected mode, without hidden essay cards.
  for(const full of [false,true]){
   let books=0;
   for(let part=1;part<=5;part++){
    await p.goto(`${base}/${lang}/novel/?focus=part%3Ap${part}${full?'&essays=all':''}`);
    await p.locator('#reader-part-panel').waitFor();
    check((await p.locator('h1').textContent()).includes(full?'365':'347'),'Opening heading names the current route');
    check((await p.locator('#reading-along-title').textContent()).includes(full?'365':'347'),'Reader heading stays mode-aware');
    const reject=p.locator('[data-action="privacy-reject"]').first();if(await reject.isVisible())await reject.click();
    books+=await p.locator('.reader-book-card').count();
    same(await p.locator('.reader-book-card .reader-essay-badge').count(),full&&[2,4,5].includes(part)?1:0,'Essay cards exist only in full mode');
    check(await p.locator('.reader-essay-mode a[data-reader-link]').isVisible(),'Global view link is visible in each Part');
    check(await noOverflow(p),'Mode selection and Part cards fit viewport');
   }
   same(books,full?48:45,'Global mode restores the complete Book inventory');
  }
  for(const [book,count] of Object.entries(groups)){
   await p.goto(`${base}/${lang}/novel/?focus=book%3A${book}`);await ready(p);
   const reject=p.locator('[data-action="privacy-reject"]').first();if(await reject.isVisible())await reject.click();await ready(p);
   const g=group(p,book),ids=Array.from({length:count},(_,i)=>`${book}-c${i+1}`),first=p.locator('#reader-chapter-'+ids[0]);
   same(await g.count(),1,'Exactly one native essay group in the Book view');same(await opened(g),false,'Generic Book URL starts closed');
   same(await g.locator('[data-chapter-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.chapterId)),ids,'Canonical chapter order and IDs remain in the DOM');
   same(await first.isVisible(),false,'Closed essay contents are actually hidden');
   check(await noOverflow(p),`Closed ${book} fits ${lang} ${width}`);
   await g.scrollIntoViewIfNeeded();await g.screenshot({path:path.join(dir,`essay-${book}-${lang}-${width}-closed.png`)});
   const before=await storage(p),url=p.url(),summary=g.locator(':scope > summary');
   await summary.focus();await p.keyboard.press('Enter');same(await opened(g),true,'Enter opens native disclosure');check(await first.isVisible(),'Opening exposes retained chapter');
   same(await summary.evaluate(e=>e===document.activeElement),true,'Keyboard focus stays on summary');same(p.url(),url,'Disclosure does not replace the canonical Book URL');same(await storage(p),before,'Disclosure does not change spoiler state');
   check(await noOverflow(p),`Open ${book} fits ${lang} ${width}`);
   await summary.focus();await p.keyboard.press('Space');same(await opened(g),false,'Space closes native disclosure');
   // A real application navigation, followed by Back/Forward, exercises popstate.
   const target=ids.at(-1);await p.locator('#reading-chapter').selectOption(target);await ready(p);
   same(new URL(p.url()).searchParams.get('focus'),'chapter:'+target,'Chapter selector keeps the original exact URL');same(await opened(group(p,book)),true,'Exact target automatically opens its own group');
   check(await p.locator('#reader-chapter-'+target).isVisible(),'Requested chapter is visible');same(await p.locator('.reader-essay-chapters[open]').count(),1,'Only target essay group opens');
   same(await storage(p),before,'Chapter deep link does not change spoiler state');same(await p.locator('[data-novel-event]').count(),0,'Chapter jump does not unlock full recap');same(await p.locator('.chapter-wide-links .insight-link').count(),0,'Chapter jump does not unlock wider-story links');
   await p.goBack();await ready(p);same(new URL(p.url()).searchParams.get('focus'),'book:'+book,'Back restores Book coordinate');same(await opened(group(p,book)),false,'Back to generic Book restores closed state');
   await p.goForward();await ready(p);same(await opened(group(p,book)),true,'Forward restores exact chapter opening');
   await p.reload();await ready(p);same(await opened(group(p,book)),true,'Cold direct exact chapter URL opens the group');check(await noOverflow(p),'Direct chapter view fits viewport');
   await p.locator('.reader-breadcrumbs a[href*="part%3A"]').click();
   const card=p.locator(`[data-reader-book="${book}"]`);same(await card.count(),0,'Default Part view omits the essay Book entirely');
   const mode=p.locator('.reader-essay-mode a[data-reader-link]');check(await mode.isVisible(),'One global mode link is discoverable');
   await mode.click();same(new URL(p.url()).searchParams.get('essays'),'all','Global mode is expressed in URL');
   same(await card.locator('.reader-essay-badge').count(),1,'Full-mode Part card labels restored essay Book');
   await p.goBack();same(new URL(p.url()).searchParams.get('essays'),null,'Back restores streamlined mode');same(await card.count(),0,'Back removes essay card');
   await p.goForward();same(new URL(p.url()).searchParams.get('essays'),'all','Forward restores full mode');
   await card.locator('a[data-reader-link]').first().click();await ready(p);same(await opened(group(p,book)),true,'Full-mode Book opens its essay group');
   same(new URL(p.url()).searchParams.get('essays'),'all','Book navigation retains full mode');
   same(await storage(p),before,'Global mode is independent of spoiler storage');
   check(await noOverflow(p),'Full mode fits viewport');
   await p.locator('.reader-essay-mode a[data-reader-link]').click();
   same(new URL(p.url()).searchParams.get('essays'),null,'Returning to streamlined mode clears URL preference');same(await card.count(),0,'Leaving an essay Book returns to Part without essay cards');
  }
  // The adjacent escape chapters and the Waterloo thematic connection are never collapsed as essays.
  for(const id of linked){
   await p.goto(`${base}/${lang}/novel/?focus=chapter%3A${id}`);await ready(p);
   const target=p.locator('#reader-chapter-'+id);check(await target.isVisible(),`Linked narrative chapter remains visible: ${id}`);
   same(await target.evaluate(e=>!!e.closest('.reader-essay-chapters')),false,'Musical-linked narrative chapter is outside essay groups');same(await p.locator('.reader-essay-chapters').count(),0,'Narrative Book has no essay wrapper');
   same(await p.locator(`[data-chapter-stage="${id}"]`).count(),1,'Musical comparison panel retained');check(await noOverflow(p),'Linked narrative chapter fits viewport');
  }
  same(errors,[],`No runtime errors (${lang}, ${width})`);await context.close();
 }
 // Real touch events exercise the same boundary policy as previous/next chapter links.
 // HE/EN are both tested; the full viewport matrix above covers layout separately.
 const catalog=[1,2,3,4,5].flatMap(n=>JSON.parse(fs.readFileSync(path.join(__dirname,`../dist/reading/part-${n}.json`),'utf8')).chapters);
 const boundaries=Object.keys(groups).map(book=>{const first=catalog.findIndex(c=>c.id===book+'-c1'),last=first+groups[book]-1;return{before:catalog[first-1].id,first:catalog[first].id,last:catalog[last].id,after:catalog[last+1].id}});
 async function swipe(p,cdp,id,dx){
  const heading=p.locator(`#reader-chapter-${id} .chapter-reading-head`);await heading.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
  const box=await heading.boundingBox();check(!!box,'Chapter heading is available for real touch input');
  const x=Math.max(110,Math.min(p.viewportSize().width-110,box.x+box.width/2)),y=Math.max(100,Math.min(750,box.y+box.height/2));
  const point=(x,y)=>({x,y,radiusX:4,radiusY:4,force:1,id:1});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(x,y)]});
  for(let step=1;step<=5;step++){
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(x+dx*step/5,y)]});
   await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>resolve())));
  }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }
 for(const lang of ['he','en']){
  const context=await browser.newContext({viewport:{width:390,height:900},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  const p=await context.newPage(),cdp=await context.newCDPSession(p),errors=[];p.on('pageerror',e=>errors.push(e.message));
  try{
   for(const full of [false,true])for(const edge of boundaries)for(const step of ['next','prev']){
    const from=step==='next'?edge.before:edge.after,to=full?(step==='next'?edge.first:edge.last):(step==='next'?edge.after:edge.before);
    await p.goto(`${base}/${lang}/novel/?focus=chapter%3A${from}${full?'&essays=all':''}`);await ready(p);
    const reject=p.locator('[data-action="privacy-reject"]').first();if(await reject.isVisible())await reject.click();await ready(p);
    const before=await storage(p),link=p.locator(`#reader-chapter-${from} .slide-${step}`),query=new URL(await link.getAttribute('href'),base).searchParams;
    same(query.get('focus'),'chapter:'+to,'Previous/next link follows the selected chapter route');same(query.get('essays'),full?'all':null,'Boundary link retains selected mode');
    // Follow the ordinary link, then return before exercising touch separately.
    await link.click();await ready(p);same(new URL(p.url()).searchParams.get('focus'),'chapter:'+to,'Chapter link reaches expected side of essay boundary');
    await p.goBack();await ready(p);same(new URL(p.url()).searchParams.get('focus'),'chapter:'+from,'Back restores boundary source');
    await swipe(p,cdp,from,(lang==='he'?100:-100)*(step==='next'?1:-1));
    await p.waitForURL(url=>url.searchParams.get('focus')==='chapter:'+to);await ready(p);
    same(new URL(p.url()).searchParams.get('essays'),full?'all':null,'Real swipe retains URL mode');
    check(await p.locator('#reader-chapter-'+to).isVisible(),'Swipe target is visible, including full-mode essays');
    same(await storage(p),before,'Link and swipe leave spoiler state unchanged');
   }
   same(errors,[],`No real-swipe boundary errors (${lang})`);
  }finally{await context.close()}
 }
 // A reader may open the disclosure while chapter JSON is still in flight.
 // Hold the response explicitly rather than relying on network timing or sleeps.
 for(const lang of ['he','en']){
  const context=await browser.newContext({viewport:{width:390,height:900},reducedMotion:'reduce'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  let release,requested;
  const gate=new Promise(resolve=>{release=resolve}),requestSeen=new Promise(resolve=>{requested=resolve});
  await context.route('**/reading/part-2.json',async route=>{requested();await gate;await route.continue()});
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  try{
   // DOMContentLoaded does not wait for the deliberately held chapter-data response.
   await p.goto(`${base}/${lang}/novel/?focus=book%3Ap2-b7`,{waitUntil:'domcontentloaded'});
   await requestSeen;
   const reject=p.locator('[data-action="privacy-reject"]').first();if(await reject.isVisible())await reject.click();
   const g=group(p,'p2-b7');same(await opened(g),false,'Deferred generic Book is initially closed');
   same(await p.locator('#reading-book-panel').getAttribute('data-reader-ready'),'false','Chapter response is still pending');
   const before=await storage(p);await g.locator(':scope > summary').focus();await p.keyboard.press('Enter');
   same(await opened(g),true,'Reader can open essay disclosure before chapter data arrives');
   release();await ready(p);
   same(await opened(group(p,'p2-b7')),true,'Deferred chapter render preserves the manually opened essay');
   check(await p.locator('#reader-chapter-p2-b7-c1').isVisible(),'Loaded chapter becomes visible in the preserved disclosure');
   same(await storage(p),before,'Deferred render preserves spoiler settings');
   same(new URL(p.url()).searchParams.get('focus'),'book:p2-b7','Deferred render preserves generic Book URL');
   same(errors,[],`No deferred essay-load errors (${lang})`);
  }finally{release();await context.close()}
 }
 console.log(`Optional essay groups: ${checks} browser checks passed across HE/EN at 320, 390, 750, and 1365px.`);
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
