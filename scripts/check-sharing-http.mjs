// Exercise the publish directory and real local HTTP routing without a browser.
// Network requests are restricted to this child server; no third-party inspection service.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const context={window:{}};vm.runInNewContext(fs.readFileSync('dist/seo.js','utf8'),context);
const metadata=context.window.SITE_METADATA,port=process.env.SHARING_HTTP_PORT||'8898',base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:port,CONTACT_ENABLED:'false'},stdio:['ignore','pipe','pipe']});
let output='',checks=0;server.stdout.on('data',chunk=>output+=chunk);server.stderr.on('data',chunk=>output+=chunk);
try{
 let ready=false;for(let i=0;i<40;i++){try{ready=(await fetch(base+'/')).ok;if(ready)break;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}
 assert(ready,'Local HTTP server did not become reachable: '+output);
 const assets=new Map([['/favicon.ico','image/x-icon'],['/favicon.svg','image/svg+xml'],['/favicon-16x16.png','image/png'],['/favicon-32x32.png','image/png'],['/favicon-48x48.png','image/png'],['/favicon-96x96.png','image/png'],['/apple-touch-icon.png','image/png'],['/icon-192.png','image/png'],['/icon-512.png','image/png'],['/site.webmanifest','application/manifest+json']]);
 for(const page of Object.values(metadata.pages))assets.set(context.window.SiteSEO.image(page,'en').path,'image/png');
 for(const [asset,type] of assets){const response=await fetch(base+asset);assert.equal(response.status,200,asset);assert(response.headers.get('content-type')?.startsWith(type),'MIME '+asset);checks+=2;}
 for(const [route,page] of Object.entries(metadata.pages))for(const lang of ['he','en']){
  const response=await fetch(`${base}/${lang}/${route}/`),html=await response.text();
  assert.equal(response.status,200,lang+'/'+route);assert(response.headers.get('content-type')?.startsWith('text/html'));assert(html.includes('href="/favicon.ico"'));checks+=3;
  if(metadata.origin){
   assert(html.includes(`rel="canonical" href="${metadata.origin}/${lang}/${page.canonicalRoute||route}/"`));
   assert(html.includes(`property="og:image:secure_url" content="${metadata.origin}${context.window.SiteSEO.image(page,lang).path}"`));checks+=2;
  }
 }
 const root=await fetch(base+'/');assert.equal(root.status,200);assert((await root.text()).includes('href="/favicon.ico"'));checks+=2;
 const missing=await fetch(base+'/not-a-route/');assert.equal(missing.status,404);assert((await missing.text()).includes('href="/favicon.ico"'));checks+=2;
 console.log(`PASS: ${checks} local HTTP sharing checks, ${assets.size} local icon/manifest/image assets, and ${Object.keys(metadata.pages).length*2} localized URLs. ${metadata.origin?'Absolute metadata verified.':'Unconfigured preview: absolute metadata intentionally absent.'}`);
}finally{server.kill();}
