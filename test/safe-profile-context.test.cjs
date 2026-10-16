const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C={window:{},URLSearchParams};
for(const f of ['research','extras','character-profiles-data','character-profiles','seo','search'])vm.runInNewContext(fs.readFileSync('dist/'+f+'.js','utf8'),C);
const W=C.window,R={...W.RESEARCH,...W.EXTRA_CONTENT},P=W.CharacterProfiles;
const esc=x=>x.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(const p of W.CHARACTER_PROFILES.profiles)for(const lang of ['en','he'])test(`${p.id} ${lang}: useful sourced static context without reader leaks`,()=>{
 const args={id:p.id,lang,songs:R.musical.songentries},html=P.page(args),staticHTML=fs.readFileSync(`dist/${lang}/character-${p.id}/index.html`,'utf8');
 assert(p.safeFacts.length>0);
 for(const f of p.safeFacts){
  assert(f.text[lang].split(/\s+/).length>=20);
  assert(p.references.some(r=>r.url===f.source.url));
  for(const output of [html,staticHTML]){assert(output.includes(esc(f.text[lang])));assert(output.includes(f.source.url));}
 }
 assert(html.includes('profile-source-warning'));
 for(const id of p.safeSongIds){assert(p.songIds.includes(id));assert(R.musical.songentries.some(s=>s.id===id));assert(html.includes('focus='+encodeURIComponent('song:'+id)));}
 assert(!html.includes('profile-full-prose'));
 for(const search of ['?reader=','?reader=bad','?reader=p1-b1-c1','?reader='+p.firstAppearance.chapterId,'?reader=p5-b9-c6&view=full']){
  const reader=P.page({...args,search,spoiler:true});assert(!reader.includes('profile-safe-context'));assert(!reader.includes('profile-safe-music'));
  for(const f of p.safeFacts)assert(!reader.includes(esc(f.text[lang])));
 }
 const shell=fs.readFileSync(`dist/profile-readers/${lang}/${p.id}.html`,'utf8');assert(!shell.includes('profile-safe-context'));
});
test('durable listening descriptions and English canonical policy',()=>{
 const m=JSON.parse(fs.readFileSync('config/metadata.json')).pages.listening;
 for(const lang of ['en','he']){assert(!/\d/.test(m.description[lang]));const html=fs.readFileSync(`dist/${lang}/listening/index.html`,'utf8');assert(html.includes(esc(m.description[lang])));}
 const site=JSON.parse(fs.readFileSync('config/site.json'));assert.equal(site.defaultLanguage,'en');assert.equal(site.origin,'https://www.lesmisnotes.com');
});
test('safe facts are searchable without full biography',()=>{
 const index=W.SiteSearch.buildIndex({research:R,metadata:W.SITE_METADATA},{spoiler:false});
 for(const p of W.CHARACTER_PROFILES.profiles){const doc=index.find(d=>d.id==='character:'+p.id);for(const lang of ['en','he'])for(const f of p.safeFacts)assert(doc.body[lang].includes(f.text[lang]));}
});
test('per-character original sharing cards and anonymous reader fallback',()=>{
 const images=new Set();
 for(const p of W.CHARACTER_PROFILES.profiles){
  const route='character-'+p.id,meta=W.SITE_METADATA.pages[route],image=W.SiteSEO.image(meta,'en');
  assert.equal(image.path,`/assets/characters/${p.id}.png`);assert(image.alt.includes(p.name.en));images.add(image.path);
  const png=fs.readFileSync('dist'+image.path);assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
  const reader=W.CharacterProfiles.metadata(route,'?reader=');assert.equal(W.SiteSEO.image(reader,'en').path,'/assets/social-card.png');
  for(const lang of ['en','he']){
   const html=fs.readFileSync(`dist/${lang}/${route}/index.html`,'utf8');
   if(W.SITE_METADATA.origin){assert(html.includes(`property="og:image" content="${W.SITE_METADATA.origin}${image.path}"`));assert(html.includes(`name="twitter:image" content="${W.SITE_METADATA.origin}${image.path}"`));assert(html.includes('"url":"'+W.SITE_METADATA.origin+image.path+'"'));}
   const shell=fs.readFileSync(`dist/profile-readers/${lang}/${p.id}.html`,'utf8');assert(!shell.includes(image.path));
  }
 }
 assert.equal(images.size,10);
});
test('client navigation updates sharing images and clears character identity in reader context',()=>{
 const line=fs.readFileSync('dist/app.js','utf8').split('\n').find(x=>x.startsWith('function updatePageMetadata()'));
 const attrs=new Map(),location={search:''},m={...W.SITE_METADATA,origin:'https://www.lesmisnotes.com'};
 const win={...W,SITE_METADATA:m,location};
 const scope={window:win,location,route:'character-valjean',lang:'en',URLSearchParams,url:p=>'/en/'+p+'/',document:{querySelector:s=>({setAttribute:(a,v)=>attrs.set(s+'|'+a,v)}),getElementById:()=>null}};
 vm.createContext(scope);vm.runInContext(line,scope);scope.updatePageMetadata();
 assert.equal(attrs.get('meta[property="og:image"]|content'),'https://www.lesmisnotes.com/assets/characters/valjean.png');
 location.search='?reader=';scope.updatePageMetadata();assert.equal(attrs.get('meta[property="og:image"]|content'),'https://www.lesmisnotes.com/assets/social-card.png');assert(!attrs.get('meta[property="og:image:alt"]|content').includes('Valjean'));
 scope.route='home';location.search='';scope.updatePageMetadata();assert.equal(attrs.get('meta[name="twitter:image"]|content'),'https://www.lesmisnotes.com/assets/social-card.png');
});
