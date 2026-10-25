'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.SEARCH_TEST_URL||'http://localhost:8873',dir=process.env.SEARCH_ARTIFACT_DIR||'test-results';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});let checks=0;
 const check=(value,message)=>{assert(value,message);checks++;};
 try{
  const context=await browser.newContext({viewport:{width:1200,height:800},reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
  const page=await context.newPage();
  for(const lang of ['he','en']){
   for(const route of ['home','novel','novel-journey','musical-journey','characters','history','listening','watch','recipes','special-events']){
    await page.goto(`${base}/${lang}/${route}/`);
    const privacy=page.locator('[data-action="privacy-reject"]').first();if(await privacy.isVisible())await privacy.click();
    const m=await page.evaluate(({lang,route})=>{const metadata=window.SITE_METADATA,p=metadata.pages[route],meta=key=>document.querySelector(`meta[property="${key}"],meta[name="${key}"]`)?.content;return {title:document.title,expectedTitle:p.title[lang],canonical:document.querySelector('link[rel=canonical]')?.href,expectedCanonical:metadata.origin+'/'+lang+'/'+(p.canonicalRoute||route)+'/',image:meta('og:image'),secureImage:meta('og:image:secure_url'),twitterImage:meta('twitter:image'),expectedImage:metadata.origin+window.SiteSEO.image(p,lang).path,type:meta('og:image:type'),width:meta('og:image:width'),height:meta('og:image:height'),alts:['he','en','x-default'].map(key=>document.querySelector(`link[hreflang="${key}"]`)?.href)};},{lang,route});
    check(m.title===m.expectedTitle,'Localized title '+lang+'/'+route);
    assert.match(m.expectedCanonical,/^https:\/\//,'Sharing checks require a configured HTTPS origin; build with the intended SITE_ORIGIN before running this suite.');
    assert.equal(m.canonical,m.expectedCanonical,'Absolute canonical '+lang+'/'+route);checks++;
    check([m.image,m.secureImage,m.twitterImage].every(image=>image===m.expectedImage),'Consistent image '+lang+'/'+route);check(m.type==='image/png'&&m.width==='1200'&&m.height==='630','Image dimensions/type '+route);
    check(m.alts.every(href=>href?.startsWith('https://www.lesmisnotes.com/')),'Absolute language alternates');
   }
   // A genuine in-app click must clear the previous route's cover, not merely the title.
   await page.locator('.header a.brand').click();
   check(new URL(page.url()).pathname===`/${lang}/home/`,'SPA brand link');
   check((await page.locator('meta[property="og:image:secure_url"]').getAttribute('content')).endsWith('/assets/social-card.png'),'SPA restores anonymous home cover');
   await page.locator('[data-action=language]').click();
   check((await page.locator('link[rel=canonical]').getAttribute('href')).endsWith(`/${lang==='en'?'he':'en'}/home/`),'SPA locale canonical');
   await page.goto(`${base}/${lang}/character-valjean/?reader=`);
   check(!/Valjean|ולז/.test(await page.title()),'Reader context keeps title anonymous');
   check((await page.locator('meta[property="og:image:secure_url"]').getAttribute('content')).endsWith('/assets/social-card.png'),'Reader secure image stays anonymous');
   check(await page.locator('meta[name=robots]').getAttribute('content')==='noindex, follow','Reader route noindex');
  }
  for(const [asset,type] of [['/favicon.ico','image/x-icon'],['/favicon.svg','image/svg+xml'],['/favicon-96x96.png','image/png'],['/apple-touch-icon.png','image/png'],['/icon-192.png','image/png'],['/icon-512.png','image/png'],['/site.webmanifest','application/manifest+json']]){
   const response=await context.request.get(base+asset);check(response.ok(),'Asset 200 '+asset);check(response.headers()['content-type']?.startsWith(type),'Asset MIME '+asset);
  }
  const metadata=JSON.parse(fs.readFileSync('config/metadata.json','utf8'));
  for(const [route,p] of Object.entries(metadata.pages).filter(([,p])=>p.shareCard)){
   const asset=route==='home'?'/assets/social-card':'/assets/share/'+route;
   const response=await context.request.get(base+asset+'.png');check(response.ok(),'Share PNG 200 '+route);check(response.headers()['content-type']?.startsWith('image/png'),'Share PNG MIME '+route);
   await page.goto(base+asset+'.svg');await page.evaluate(()=>document.fonts.ready);
   const overflow=await page.evaluate(()=>[...document.querySelectorAll('text')].filter(text=>{const box=text.getBBox();return box.x<35||box.x+box.width>1150||box.y<0||box.y+box.height>600;}).map(text=>text.textContent));
   check(!overflow.length,'Share text fits artboard '+route+': '+overflow.join(' / '));
  }
  fs.mkdirSync(dir,{recursive:true});await page.setViewportSize({width:1200,height:630});await page.goto(base+'/assets/social-card.svg');await page.screenshot({path:path.join(dir,'sharing-home-card.png')});await page.goto(base+'/assets/share/novel-journey.svg');await page.screenshot({path:path.join(dir,'sharing-reading-card.png')});
  await context.close();console.log('PASS: '+checks+' browser sharing checks; localized metadata, SPA changes, private reader covers, icon/manifest MIME, and all bilingual card text bounds.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
