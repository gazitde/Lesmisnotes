/* Portable browser coverage. It deliberately never calls real OS sharing,
   WhatsApp, clipboard, email, or any third-party network endpoint. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const source = process.env.LESMIS_SOURCE || path.resolve(__dirname, '..');
const localRequire = createRequire(path.join(source, 'package.json'));
const { chromium } = localRequire('playwright');
const modulePath = process.env.QUIZ_ACHIEVEMENT_MODULE || path.join(source, 'dist/quiz-achievement.js');
const output = process.env.QUIZ_ARTIFACT_DIR || path.join(process.env.SEARCH_ARTIFACT_DIR || 'test-results', 'quiz-cards');
const context = { window: {} }; vm.createContext(context);
for (const name of ['research.js','extras.js']) vm.runInContext(fs.readFileSync(path.join(source,'dist',name),'utf8'),context);
const quiz = context.window.EXTRA_CONTENT.quiz || context.window.RESEARCH.quiz;
const cases = [];
for(const language of ['he','en']) for(const track of ['story','musical']) for(const correct of [0,10,17,22,25]) {
  const percent = Math.round(correct/25*100), badge = quiz.badgeTiers.find(x => percent >= x.minPercent && percent < x.maxPercentExclusive);
  cases.push({language,track,trackTitle:quiz.trackInfo[track].title[language],badgeName:badge.name[language],correct,total:25});
}
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}}), errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>route.abort());
    await page.setContent('<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#fff}img{display:block;width:100%;height:auto}button{font:18px Arial;padding:15px}</style><img id="preview" alt="Achievement preview"><button id="share">Share image</button><button id="download">Download image</button><output id="feedback"></output>');
    await page.addScriptTag({path:modulePath});
    for(const data of cases) {
      const result=await page.evaluate(async data=>{
        document.documentElement.dir=data.language==='he'?'rtl':'ltr';
        const canvas=document.createElement('canvas'),layout=QuizAchievement.drawCard(canvas,data),ctx=canvas.getContext('2d');
        for(const box of layout.boxes) {
          ctx.font=`700 ${box.size}px Arial, "Noto Sans Hebrew", sans-serif`;
          if(box.lines.some(line=>ctx.measureText(line).width>box.width+1)) throw new Error('Text overflow: '+box.text);
        }
        const blob=await QuizAchievement.renderPNG(data),url=URL.createObjectURL(blob),img=document.getElementById('preview');
        const old=img.getAttribute('src'); img.src=url; await img.decode(); if(old)URL.revokeObjectURL(old);
        return {type:blob.type,size:blob.size,width:img.naturalWidth,height:img.naturalHeight,overflow:document.documentElement.scrollWidth>innerWidth};
      },data);
      assert.equal(result.type,'image/png');assert.ok(result.size>10000);assert.equal(result.width,1080);assert.equal(result.height,1080);assert.equal(result.overflow,false);
      if(data.track==='story' && [17,25].includes(data.correct)) await page.screenshot({path:path.join(output,`${data.language}-${data.correct}-mobile.png`),fullPage:true});
    }
    await page.evaluate(async data=>{
      window.fixture={...data,round:{}};window.nativeCalls=[];window.feedback=[];
      window.fakeNavigator={canShare:({files})=>files[0] instanceof File,share(payload){if(!navigator.userActivation.isActive)throw new Error('User activation lost');nativeCalls.push({type:payload.files[0].type,name:payload.files[0].name,text:payload.text,keys:Object.keys(payload)});return Promise.resolve();}};
      window.controller=QuizAchievement.createController({getCurrent:()=>fixture,navigator:fakeNavigator,onFeedback:code=>feedback.push(code)});
      await controller.prepare();
      document.getElementById('share').onclick=()=>{window.shareResult=controller.shareImage();};
      document.getElementById('download').onclick=()=>controller.downloadImage();
    },cases.find(c=>c.language==='en'&&c.correct===17));
    await page.click('#share');
    assert.equal(await page.evaluate(async()=>(await shareResult).status),'shared');
    const calls=await page.evaluate(()=>nativeCalls);assert.equal(calls.length,1);assert.equal(calls[0].type,'image/png');assert.ok(!calls[0].keys.includes('url'));
    await page.evaluate(()=>{feedback=[];fakeNavigator.share=()=>Promise.reject(new DOMException('Dismissed','AbortError'));});
    await page.click('#share');assert.equal(await page.evaluate(async()=>(await shareResult).status),'cancelled');assert.deepEqual(await page.evaluate(()=>feedback),[]);
    await page.evaluate(()=>{fakeNavigator.canShare=()=>false;});
    await page.click('#share');assert.equal(await page.evaluate(async()=>(await shareResult).status),'unsupported');assert.deepEqual(await page.evaluate(()=>feedback),['share-unsupported']);
    const event=page.waitForEvent('download');await page.click('#download');const download=await event;assert.equal(download.suggestedFilename(),'lesmisnotes-story-25-en.png');
    await download.saveAs(path.join(output,download.suggestedFilename()));
    const bytes=fs.readFileSync(path.join(output,download.suggestedFilename()));assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),1080);assert.equal(bytes.readUInt32BE(20),1080);
    await page.evaluate(()=>controller.dispose());assert.deepEqual(errors,[]);
    console.log('PASS: 20 real-data card exports, HE/EN wrapping, mobile layout, synchronous activation with mocked native share, silent cancel, unsupported fallback, explicit real PNG download. No external sharing performed.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
