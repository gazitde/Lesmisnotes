import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const port='8873',base='http://127.0.0.1:'+port;
const env={...process.env,PORT:port,SEARCH_TEST_URL:base,SEARCH_ARTIFACT_DIR:'test-results',CHROMIUM_PATH:chromium.executablePath(),RUN_CONTACT_BROWSER_TEST:'1',CONTACT_ENABLED:'false'};
fs.mkdirSync('test-results',{recursive:true});
const server=spawn(process.execPath,['scripts/serve.mjs'],{env,stdio:'inherit'});
async function run(args){const code=await new Promise(resolve=>{const p=spawn(process.execPath,args,{env,stdio:'inherit'});p.on('exit',resolve);p.on('error',()=>resolve(1));});if(code!==0)throw new Error('Browser suite failed: '+args.join(' '));}
try{
  let ready=false;
  for(let i=0;i<40;i++){try{const r=await fetch(base+'/en/home/');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
  if(!ready)throw new Error('Local browser-test server did not start');
  await run(['scripts/browser-search.cjs']);
  await run(['--test','test/contact-browser.test.cjs']);
}finally{server.kill();}
