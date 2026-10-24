'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
const C={window:{},URLSearchParams};
for(const name of ['research','extras','character-profiles-data','character-profiles','seo'])vm.runInNewContext(fs.readFileSync(`dist/${name}.js`,'utf8'),C);
const W=C.window,M=W.SITE_METADATA,source=JSON.parse(fs.readFileSync('config/metadata.json','utf8'));
const decode=text=>text.replace(/&(?:amp|quot|#39|lt|gt);/g,char=>({'&amp;':'&','&quot;':'"','&#39;':"'",'&lt;':'<','&gt;':'>'}[char]));
const meta=(html,key)=>{const result=html.match(new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)">`));assert(result,`Missing ${key}`);return decode(result[1]);};
const png=file=>{const bytes=fs.readFileSync(file);assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),bytes:bytes.length};};

test('every localized route has complete, consistent crawler-readable sharing metadata',()=>{
 for(const [route,page] of Object.entries(M.pages))for(const lang of ['he','en']){
  const html=fs.readFileSync(`dist/${lang}/${route}/index.html`,'utf8'),image=W.SiteSEO.image(page,lang),canonical=`${M.origin}/${lang}/${page.canonicalRoute||route}/`;
  assert.equal(meta(html,'og:title'),page.title[lang]);assert.equal(meta(html,'twitter:title'),page.title[lang]);
  assert.equal(meta(html,'description'),page.description[lang]);assert.equal(meta(html,'og:description'),page.description[lang]);assert.equal(meta(html,'twitter:description'),page.description[lang]);
  assert.equal(meta(html,'twitter:card'),'summary_large_image');assert.equal(meta(html,'og:site_name'),'LesMisNotes');
  if(M.origin){
   assert.equal(meta(html,'og:url'),canonical);assert(html.includes(`rel="canonical" href="${canonical}"`));
   for(const field of ['og:image','og:image:secure_url','twitter:image'])assert.equal(meta(html,field),M.origin+image.path);
   assert.equal(meta(html,'og:image:type'),'image/png');assert.equal(meta(html,'og:image:width'),'1200');assert.equal(meta(html,'og:image:height'),'630');
   assert.equal(meta(html,'og:image:alt'),image.alt);assert.equal(meta(html,'twitter:image:alt'),image.alt);
   for(const alternate of ['he','en','x-default'])assert(html.includes(`hreflang="${alternate}" href="${M.origin}/${alternate==='x-default'?'en':alternate}/${page.canonicalRoute||route}/"`));
  }
  assert.deepEqual({...png('dist'+image.path),bytes:0},{width:1200,height:630,bytes:0});
  assert(png('dist'+image.path).bytes<600000,'Sharing cover stays lightweight: '+route);
  assert(!/character-|reader=|focus=/.test(image.path)||route.startsWith('character-'));
 }
});

test('central pages have distinct bilingual covers and aliases reuse their real destination',()=>{
 const cards=Object.entries(source.pages).filter(([,p])=>p.shareCard),paths=new Set();
 assert(cards.length>=25);
 for(const [route,p] of cards){
  const image=M.pages[route].socialImage;paths.add(image.path);
  const svg=fs.readFileSync('dist'+image.path.replace(/\.png$/,'.svg'),'utf8');
  for(const lang of ['en','he'])for(const line of p.shareCard.heading[lang])assert(svg.includes(line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')));
  assert(svg.includes('direction="rtl"'));assert(!/<script\b|href="https?:|<foreignObject\b/i.test(svg));
  assert(!Object.hasOwn(M.pages[route],'shareCard'),'Authoring data is not shipped in runtime metadata');
 }
 assert.equal(paths.size,cards.length);
 for(const route of ['tribute','humor'])assert.equal(M.pages[route].socialImage.path,M.pages.listening.socialImage.path);
});

test('browser, search and home-screen icons are real, crawlable local files',()=>{
 for(const [name,size] of [['favicon-16x16',16],['favicon-32x32',32],['favicon-48x48',48],['favicon-96x96',96],['apple-touch-icon',180],['icon-192',192],['icon-512',512]]){
  const image=png(`dist/${name}.png`);assert.equal(image.width,size);assert.equal(image.height,size);
 }
 const ico=fs.readFileSync('dist/favicon.ico');assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),3);
 for(let i=0;i<3;i++){const start=6+i*16,size=ico[start],bytes=ico.readUInt32LE(start+8),offset=ico.readUInt32LE(start+12);assert([16,32,48].includes(size));assert.equal(ico.readUInt32BE(offset+16),size);assert.equal(ico.readUInt32BE(offset+20),size);assert(offset+bytes<=ico.length);}
 const manifest=JSON.parse(fs.readFileSync('dist/site.webmanifest','utf8'));
 assert.equal(manifest.name,'LesMisNotes · Les Misérables');assert.equal(manifest.start_url,'/');assert.equal(manifest.scope,'/');assert.equal(manifest.display,'browser');
 for(const icon of manifest.icons){assert(fs.existsSync('dist'+icon.src));assert.equal(icon.purpose,'any');assert.equal(icon.type,'image/png');}
 for(const file of ['dist/index.html','dist/404.html',...Object.keys(M.pages).flatMap(route=>['he','en'].map(lang=>`dist/${lang}/${route}/index.html`))]){
  const html=fs.readFileSync(file,'utf8');for(const icon of ['/favicon.ico','/favicon.svg','/favicon-96x96.png','/apple-touch-icon.png','/site.webmanifest'])assert(html.includes(`href="${icon}"`),file+' missing '+icon);
  assert.equal(meta(html,'theme-color'),'#172b3b');
 }
});

test('reader-mode metadata stays anonymous, including secure image URL after navigation',()=>{
 const update=fs.readFileSync('dist/app.js','utf8').split('\n').find(line=>line.startsWith('function updatePageMetadata()'));
 for(const lang of ['en','he']){
  const attrs=new Map(),location={search:''},scope={window:{...W,location},location,lang,route:'character-valjean',URLSearchParams,url:route=>`/${lang}/${route}/`,document:{querySelector:selector=>({setAttribute:(name,value)=>attrs.set(selector+'|'+name,value)}),getElementById:()=>null}};
  vm.createContext(scope);vm.runInContext(update,scope);scope.updatePageMetadata();
  if(M.origin)assert.equal(attrs.get('meta[property="og:image:secure_url"]|content'),M.origin+'/assets/characters/valjean.png');
  location.search='?reader=';scope.updatePageMetadata();assert(!/Valjean|ולז/.test(scope.document.title));
  if(M.origin)assert.equal(attrs.get('meta[property="og:image:secure_url"]|content'),M.origin+'/assets/social-card.png');
  assert.equal(attrs.get('meta[name=robots]|content'),'noindex, follow');
  scope.route='tribute';location.search='';scope.updatePageMetadata();
  if(M.origin)for(const alternate of ['he','en','x-default'])assert.equal(attrs.get(`link[hreflang=${alternate}]|href`),`${M.origin}/${alternate==='x-default'?'en':alternate}/listening/`);
 }
});

test('preview, unconfigured and invalid-origin builds stay separated from production indexing',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lesmis-seo-'));
 try{
  fs.cpSync('config',path.join(dir,'config'),{recursive:true});fs.mkdirSync(path.join(dir,'scripts'));fs.copyFileSync('scripts/seo-runtime.js',path.join(dir,'scripts/seo-runtime.js'));fs.cpSync('dist',path.join(dir,'dist'),{recursive:true});
  const run=overrides=>spawnSync(process.execPath,[path.resolve('scripts/build-config.mjs')],{cwd:dir,encoding:'utf8',env:{...process.env,SITE_ORIGIN:'https://www.lesmisnotes.com',PUBLIC_SITE:'true',VERCEL_ENV:'production',...overrides}});
  const read=()=>{const c={window:{}};vm.runInNewContext(fs.readFileSync(path.join(dir,'dist/seo.js'),'utf8'),c);return c.window.SITE_METADATA;};
  let result=run({VERCEL_ENV:'preview'});assert.equal(result.status,0,result.stderr);assert.equal(read().private,true);assert.equal(read().origin,'https://www.lesmisnotes.com');
  result=run({PUBLIC_SITE:'false',SITE_ORIGIN:''});assert.equal(result.status,0,result.stderr);assert.equal(read().private,true);assert.equal(read().origin,'');
  result=run({SITE_ORIGIN:''});assert.notEqual(result.status,0);assert(result.stderr.includes('Public builds require'));
  for(const origin of ['http://www.lesmisnotes.com','https://www.lesmisnotes.com/path','https://localhost','https://example.test','https://user:pass@www.lesmisnotes.com']){result=run({SITE_ORIGIN:origin});assert.notEqual(result.status,0);assert(result.stderr.includes('SITE_ORIGIN must be'));}
  result=run({});assert.equal(result.status,0,result.stderr);assert.equal(read().private,false);assert.equal(read().origin,'https://www.lesmisnotes.com');
  const prerender=overrides=>spawnSync(process.execPath,[path.resolve('prerender.mjs')],{cwd:dir,encoding:'utf8',env:{...process.env,SITE_ORIGIN:'https://www.lesmisnotes.com',PUBLIC_SITE:'true',VERCEL_ENV:'preview',...overrides}});
  result=prerender({});assert.equal(result.status,0,result.stderr);
  let html=fs.readFileSync(path.join(dir,'dist/en/home/index.html'),'utf8');assert(html.includes('name="robots" content="noindex, follow"'));assert(html.includes('rel="canonical" href="https://www.lesmisnotes.com/en/home/"'));
  assert(!fs.readFileSync(path.join(dir,'dist/robots.txt'),'utf8').includes('Sitemap:'));assert(!fs.readFileSync(path.join(dir,'dist/sitemap.xml'),'utf8').includes('<loc>'));
  result=prerender({SITE_ORIGIN:'',PUBLIC_SITE:'false'});assert.equal(result.status,0,result.stderr);
  html=fs.readFileSync(path.join(dir,'dist/en/home/index.html'),'utf8');assert(html.includes('name="robots" content="noindex, follow"'));assert(!html.includes('rel="canonical"'));assert(!html.includes('property="og:image"'));assert(!html.includes('hreflang='));
  assert(fs.existsSync(path.join(dir,'public-dist/favicon.ico')));assert(fs.existsSync(path.join(dir,'public-dist/site.webmanifest')));

 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
