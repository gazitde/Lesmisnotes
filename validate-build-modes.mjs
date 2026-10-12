import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const base={...process.env,SITE_ORIGIN:'',PUBLIC_SITE:'false',VERCEL_ENV:''};
const run=(env={})=>spawnSync(process.execPath,['--max-old-space-size=512','prerender.mjs'],{env:{...base,...env},encoding:'utf8'});
let checks=0;
try{
  for(const [env,publicMode,hasOrigin] of [
    [{},false,false],
    [{SITE_ORIGIN:'https://example.org'},false,true],
    [{SITE_ORIGIN:'https://example.org',PUBLIC_SITE:'true'},true,true],
    [{SITE_ORIGIN:'https://example.org',PUBLIC_SITE:'true',VERCEL_ENV:'preview'},false,true]
  ]){
    const r=run(env);assert.equal(r.status,0,JSON.stringify({stderr:r.stderr,signal:r.signal,error:r.error?.message}));
    const html=fs.readFileSync('dist/en/home/index.html','utf8');
    assert.equal(html.includes('content="index, follow, max-image-preview:large"'),publicMode);
    assert.equal(html.includes('content="noindex, follow"'),!publicMode);
    assert.equal(html.includes('rel="canonical"'),hasOrigin);
    assert.equal(fs.readFileSync('dist/robots.txt','utf8').includes('Sitemap:'),publicMode);
    const schema=spawnSync(process.execPath,['validate-seo.mjs'],{encoding:'utf8'});assert.equal(schema.status,0,schema.stderr);checks+=6;
  }
  const configured=JSON.parse(fs.readFileSync('config/site.json','utf8'));
  for(const stage of ['production','preview']){
    const r=run({SITE_ORIGIN:undefined,PUBLIC_SITE:undefined,VERCEL_ENV:stage});assert.equal(r.status,0,JSON.stringify({stderr:r.stderr,signal:r.signal,error:r.error?.message}));
    const html=fs.readFileSync('dist/en/home/index.html','utf8');
    assert.ok(html.includes(`href="${configured.origin}/en/home/"`));
    assert.equal(html.includes('content="index, follow, max-image-preview:large"'),configured.indexable===true&&stage==='production');
    assert.equal(html.includes('content="noindex, follow"'),!(configured.indexable===true&&stage==='production'));checks+=4;
  }
  for(const origin of ['http://example.org','https://example.org/path','https://user:pass@example.org','https://example.org/?a=1','https://localhost']){assert.notEqual(run({SITE_ORIGIN:origin,PUBLIC_SITE:'true'}).status,0);checks++;}
  assert.notEqual(run({PUBLIC_SITE:'true'}).status,0);checks++;
}finally{const r=run();assert.equal(r.status,0,JSON.stringify({stderr:r.stderr,signal:r.signal,error:r.error?.message}));}
console.log(`PASS: ${checks} build-mode checks, including public origin validation and preview noindex protection; restored safe default output.`);
