'use strict';
const {chromium}=require('playwright'),{spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const dir='test-results/nojs-diagnostic';fs.mkdirSync(dir,{recursive:true});const base='http://127.0.0.1:8887';
 const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'8887'},stdio:'inherit'});
 let browser;try{
  for(let i=0;i<50;i++){try{if((await fetch(base+'/en/novel/')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});const records=[];
  for(const lang of ['he','en'])for(const motion of ['no-preference','reduce']){
   const c=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900},reducedMotion:motion}),p=await c.newPage();
   await p.goto(`${base}/${lang}/novel/`);const link=p.locator('[data-reader-part-shortcuts] a').last();const href=await link.getAttribute('href');
   await link.click();
   for(const ms of [0,500,1500]){
    if(ms)await new Promise(r=>setTimeout(r,ms));
    const data=await p.evaluate(()=>{const e=document.getElementById('reader-part-overview-p5'),rect=e?.getBoundingClientRect();return{url:location.href,hash:location.hash,scrollY,innerHeight,height:document.documentElement.scrollHeight,targetCount:document.querySelectorAll('#reader-part-overview-p5').length,rect:rect?{top:rect.top,bottom:rect.bottom,height:rect.height}:null,heading:e?.querySelector('h3')?.textContent,visibility:e?getComputedStyle(e).visibility:null,scrollBehavior:getComputedStyle(document.documentElement).scrollBehavior,ancestors:e?[...function*(el){while(el){yield el;el=el.parentElement}}(e)].map(x=>({tag:x.tagName,id:x.id,position:getComputedStyle(x).position,overflow:getComputedStyle(x).overflow})):[]}});
    records.push({lang,motion,ms,href,...data});console.log('NATIVE_FRAGMENT',JSON.stringify(records.at(-1)));
   }
   try{await p.waitForFunction(()=>true,null,{timeout:1000});console.log('WAIT_FOR_FUNCTION',lang,motion,'works')}catch(e){console.log('WAIT_FOR_FUNCTION',lang,motion,e.name)}
   await p.screenshot({path:path.join(dir,`${lang}-${motion}-part5.png`)});fs.writeFileSync(path.join(dir,`${lang}-${motion}.html`),await p.content());await c.close();
  }
  fs.writeFileSync(path.join(dir,'geometry.json'),JSON.stringify(records,null,2));
 }finally{await browser?.close();server.kill()}
})().catch(e=>{console.error(e);process.exit(1)});
