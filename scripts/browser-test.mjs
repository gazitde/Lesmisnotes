import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const port='8873',base='http://127.0.0.1:'+port;
const env={...process.env,PORT:port,SEARCH_TEST_URL:base,SEARCH_ARTIFACT_DIR:'test-results',CHROMIUM_PATH:chromium.executablePath(),RUN_CONTACT_BROWSER_TEST:'1',CONTACT_ENABLED:'false'};
fs.mkdirSync('test-results',{recursive:true});
const failures=[];
const server=spawn(process.execPath,['scripts/serve.mjs'],{env,stdio:'inherit'});
async function run(args){const code=await new Promise(resolve=>{const p=spawn(process.execPath,args,{env,stdio:'inherit'});p.on('exit',resolve);p.on('error',()=>resolve(1));});if(code!==0){failures.push(args.join(' '));console.error('Browser suite failed:',args.join(' '));}}
try{
  let ready=false;
  for(let i=0;i<40;i++){try{const r=await fetch(base+'/en/home/');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
  if(!ready)throw new Error('Local browser-test server did not start');
  await run(['scripts/browser-density.cjs']);
  await run(['scripts/browser-relationships.cjs']);
  await run(['scripts/browser-review-gaps.cjs']);
  await run(['scripts/browser-interest-paths.cjs']);
  await run(['scripts/browser-insight-paths.cjs']);
  if(failures.length)throw new Error('Contextual-navigation regression: '+failures.join('; '));
  await run(['scripts/browser-navigation-clarity.cjs']);
  await run(['scripts/browser-reading-query-shell.cjs']);
  await run(['scripts/browser-character-profiles.cjs']);
  await run(['scripts/browser-profile-novel-additions.cjs']);
  await run(['scripts/browser-coach-gallery.cjs']);
  await run(['scripts/browser-gallery-controls.cjs']);
  await run(['scripts/browser-gallery-expansion.cjs']);
  await run(['scripts/browser-editorial-entry.cjs']);
  await run(['scripts/browser-voice-depth.cjs']);
  await run(['scripts/browser-context-depth.cjs']);
  await run(['scripts/browser-mobile-polish.cjs']);
  await run(['scripts/browser-search-polish.cjs']);
  await run(['scripts/browser-chapter-companion.cjs']);
  await run(['scripts/browser-chapter-completion.cjs']);
  await run(['scripts/browser-history-recordings.cjs']);
  await run(['scripts/browser-reading-companion.cjs']);
  await run(['scripts/browser-hugo-stories.cjs']);
  await run(['scripts/browser-coach-videos.cjs']);
  await run(['scripts/browser-act-transitions.cjs']);
  await run(['scripts/browser-watch-path.cjs']);
  await run(['scripts/browser-analytics.cjs']);
  await run(['scripts/browser-search.cjs']);
  await run(['scripts/browser-reading.cjs']);
  await run(['scripts/browser-enriched-reading.cjs']);
  await run(['scripts/browser-home-entry.cjs']);
  await run(['scripts/browser-quiz-achievement.cjs']);
  await run(['scripts/browser-quiz-site.cjs']);
  await run(['scripts/browser-listening-reading.cjs']);
  await run(['scripts/browser-visual.cjs']);
  await run(['--test','test/contact-browser.test.cjs']);
}finally{server.kill();}

if(failures.length)throw new Error('Browser suites failed: '+failures.join('; '));
