import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
let n=0;const check=(v,m)=>{assert.ok(v,m);n++},c={URLSearchParams,window:{location:{search:''}}};for(const f of ['research','extras','character-profiles-data','character-profiles','seo','search'])vm.runInNewContext(fs.readFileSync('dist/'+f+'.js','utf8'),c);const W=c.window,P=W.CharacterProfiles,chapters=W.EXTRA_CONTENT.chapterCompanion.chapters;W.SITE_METADATA.origin='https://www.lesmisnotes.com';
const plain=s=>String(s).replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&#39;/g,"'");
for(const lang of ['he','en'])for(const p of W.CHARACTER_PROFILES.profiles){
 const route='character-'+p.id;
 for(const chapter of chapters){
  const search='?reader='+chapter.id,trail=P.readerTrail(route,{lang,search}),known=P.reached(p,chapter);
  check(trail.length===6,'Six-level valid chapter ancestry');check(trail.filter(x=>x.current).length===1&&trail[5].current,'One current item');
  check(trail[2].label===(lang==='he'?'חלק ':'Part ')+chapter.part&&trail[3].label===(lang==='he'?'ספר ':'Book ')+chapter.book&&trail[4].label===(lang==='he'?'פרק ':'Chapter ')+chapter.chapter,'Numeric labels only, no later Part/Book titles');
  check(trail[5].label===(known?p.name[lang]:lang==='he'?'דמות':'Character'),'Current identity obeys reading boundary');
  for(const [i,kind,key]of [[2,'part','p'+chapter.part],[3,'book',chapter.bookId],[4,'chapter',chapter.id]])check(trail[i].href===`/${lang}/novel-journey/?focus=${encodeURIComponent(kind+':'+key)}`,'Real bounded reader ancestor');
 }
 for(const search of ['?reader='+p.firstAppearance.chapterId,'?reader=p1-b1-c1','?reader=invalid','?reader=','?reader=p1-b1-c1&reader=p5-b9-c6']){
  W.location.search=search;const trail=P.readerTrail(route,{lang,search}),html=P.page({id:p.id,lang,search,spoiler:true}),nav=html.match(/<nav class="breadcrumb"[\s\S]*?<\/nav>/)?.[0]||'',schema=W.SiteSEO.structured(lang,route)['@graph'].find(x=>x['@type']==='BreadcrumbList');
  check(Boolean(nav),'One visible semantic reader breadcrumb');check((html.match(/<nav class="breadcrumb"/g)||[]).length===1,'No duplicate visible trail');check((nav.match(/<li>/g)||[]).length===trail.length,'DOM and trail lengths agree');check((nav.match(/aria-current="page"/g)||[]).length===1,'One visible current crumb');
  check(schema.itemListElement.length===trail.length&&schema.itemListElement.every((x,i)=>x.name===trail[i].label&&x.item===W.SITE_METADATA.origin+trail[i].href&&x.position===i+1),'Dynamic schema matches visible bounded trail');
  check(!html.includes('profile-full-prose')&&!html.includes('profile-intro')&&!html.includes('profile-role')&&!html.includes('profile-references'),'Breadcrumbs do not widen reader biography');
  check((html.match(/class="profile-scope-note"/g)||[]).length===1,'Single concise scope note');check(!/<aside class="profile-reader-exit"><p>/.test(html),'Duplicate exit disclosure removed');
 }
 const shell=fs.readFileSync(`dist/profile-readers/${lang}/${p.id}.html`,'utf8'),nav=shell.match(/<nav class="breadcrumb"[\s\S]*?<\/nav>/)?.[0]||'';
 check((nav.match(/<li>/g)||[]).length===3,'Anonymous no-JS shell only has known ancestors');check(plain(nav).endsWith(lang==='he'?'דמות':'Character'),'Anonymous shell current label');check(!nav.includes(p.name[lang]),'No character identity in shell breadcrumb');
}
W.location.search='';check(P.readerTrail('character-bishop',{lang:'en',search:''})===null,'General profile keeps ordinary trail');check(W.SiteSEO.structured('en','character-bishop')['@graph'].find(x=>x['@type']==='BreadcrumbList').itemListElement.length===3,'General profile schema remains three levels');
const css=fs.readFileSync('dist/character-profiles.css','utf8');check(css.includes('.character-profile-reader-top .breadcrumb ol{display:flex;flex-wrap:wrap'),'Reader breadcrumb wraps at narrow widths');check(css.includes('.character-profile-reader-top .breadcrumb li{display:flex;align-items:center;gap:.6rem;min-width:0;max-width:100%}'),'Long labels cannot force row overflow');check(css.includes('.reader-character-profile .profile-reader-exit a{display:inline-flex;min-height:44px'),'Compact explicit full-profile link remains touchable');
console.log(`PASS: ${n} profile-reader breadcrumb checks: numeric bounded ancestry, known/generic identity, matching dynamic schema, anonymous static shells, concise disclosures and narrow-layout guards.`);
