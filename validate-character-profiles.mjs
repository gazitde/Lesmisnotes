import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++};
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plain=v=>v.replace(/<[^>]*>/g,'').replace(/&(?:amp|lt|gt|quot|#39);/g,x=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[x]));
const context={URLSearchParams,window:{}};
for(const f of ['research','extras','character-profiles-data','character-profiles','seo','search'])vm.runInNewContext(fs.readFileSync('dist/'+f+'.js','utf8'),context);
const W=context.window,P=W.CharacterProfiles,D=W.CHARACTER_PROFILES,R={...W.RESEARCH,...W.EXTRA_CONTENT},catalog=R.chapterCompanion.chapters;
const expected=['valjean','javert','fantine','cosette','marius','eponine','enjolras','gavroche','thenardiers','bishop'];
check(D.profiles.length===10&&expected.every(id=>P.get(id)),'Exactly ten principal profiles');
for(const p of D.profiles){
 check(p.paragraphs.length===2&&p.novelAdds?.paragraphs.length===2,'Two retained and two novel-specific paragraphs '+p.id);
 check(catalog.some(c=>c.id===p.firstAppearance.chapterId&&c.url===p.firstAppearance.url),'Verified first-identity primary chapter '+p.id);
 check(p.songIds.every(id=>R.musical.songentries.some(s=>s.id===id)),'Existing song IDs '+p.id);
 check(p.relationshipIds.every(id=>R.relationships.some(r=>r.id===id)),'Existing relationship IDs '+p.id);
 check(p.references.length>=3&&p.references.every(r=>/^https:\/\//.test(r.url)&&r.label.he&&r.label.en),'Bilingual primary references '+p.id);
 for(const lang of ['he','en']){
  for(const field of [p.name,p.role,p.safeIntro,p.readerIdentity,...p.paragraphs,...p.novelAdds.paragraphs.map(x=>x.text)])check(typeof field[lang]==='string'&&field[lang].trim().length>0,'Complete bilingual field');
  check([p.safeIntro,...p.paragraphs,...p.novelAdds.paragraphs.map(x=>x.text)].every(x=>x[lang].split(/\s+/).length>=35),'Substantial original paragraphs '+p.id+lang);
  const base={id:p.id,lang,songs:R.musical.songentries,relationships:R.relationships},safe=P.page(base),full=P.page({...base,search:'?view=full'});
  check(safe.includes(esc(p.safeIntro[lang]))&&!safe.includes('profile-full-prose'),'Safe intro plus closed later detail '+p.id+lang);
  check(full.includes('profile-full-prose')&&full.includes('profile-references'),'Explicit full link opens all sections '+p.id+lang);
  for(const para of p.paragraphs){check(!safe.includes(esc(para[lang])),'Later prose not in safe rendering');check(full.includes(esc(para[lang])),'Full paragraph rendered');}
  const staticHTML=fs.readFileSync(`dist/${lang}/character-${p.id}/index.html`,'utf8');
  check(staticHTML.includes(esc(p.safeIntro[lang])),'Meaningful no-JS introductory HTML');
  check(staticHTML.includes(`/${lang}/character-${p.id}/`),'Unique canonical route');
  check(staticHTML.includes('reader-profile-pending'),'Prepaint reader-context guard');
  check(!staticHTML.includes('profile-full-prose'),'Static pages never contain later prose');
  const schema=JSON.parse(staticHTML.match(/<script id="page-structured-data" type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);check(!W.SITE_METADATA.origin||schema['@graph'].find(x=>x['@type']==='BreadcrumbList')?.itemListElement.length===3,'Home to Characters to profile schema trail when origin configured');
  const shell=fs.readFileSync(`dist/profile-readers/${lang}/${p.id}.html`,'utf8');check(!shell.includes('profile-intro')&&!shell.includes('profile-role')&&!shell.includes('profile-full-prose')&&!shell.includes('profile-references'),'No-JS reader shell is bounded');check(shell.includes('noindex, follow')&&shell.includes('reader-character-profile'),'No-JS reader shell has readable noindex fallback');check(shell.includes('/'+(lang==='he'?'en':'he')+'/character-'+p.id+'/?reader='),'No-JS language link cannot escape reader mode');
  const first=catalog.find(c=>c.id===p.firstAppearance.chapterId);
  for(const chapter of catalog){
   const html=P.page({...base,search:'?reader='+chapter.id,spoiler:true});
   check(html.includes('reader-character-profile')&&!html.includes('profile-full-prose')&&!html.includes('profile-intro')&&!html.includes('profile-role')&&!html.includes('profile-next')&&!html.includes('profile-references'),'Reader always bounded '+p.id+chapter.id+lang);
   check(html.includes('reader-character-identity')===(chapter.ordinal>=first.ordinal),'Exact known-identity boundary '+p.id+chapter.id+lang);
   check(html.includes(`/${lang}/novel/?focus=chapter%3A${chapter.id}`),'Return to exact reading chapter');
  }
  for(const invalid of ['','bogus','p99-b1-c1','p1-b1-c1&reader=p5-b9-c6']){
   const html=P.page({...base,search:'?reader='+invalid,spoiler:true});
   check(!html.includes('reader-character-identity')&&!html.includes('data-profile-id')&&!html.includes('?view=full'),'Malformed reader context fails closed');
  }
 }
}
check(Object.keys(D.chapterMentions).length===241&&Object.values(D.chapterMentions).reduce((n,a)=>n+a.length,0)===391,'Reviewed full-novel mention coverage preserved');
for(const [chapter,id] of [['p1-b6-c2','valjean'],['p1-b7-c10','valjean'],['p2-b3-c7','thenardiers'],['p2-b4-c5','javert']])check(!(D.chapterMentions[chapter]||[]).some(m=>m.id===id),'Ambiguous identity or family context excluded '+chapter);
// Only reviewed tokens and explicit contexts may turn into links. Original text is preserved.
for(const [chapter,mentions]of Object.entries(D.chapterMentions))for(const lang of ['he','en']){
 const part=JSON.parse(fs.readFileSync(`dist/reading/part-${catalog.find(c=>c.id===chapter).part}.json`)),summary=part.chapters.find(c=>c.id===chapter).summary[lang],html=P.chapterNames(summary,{lang,reader:chapter});
 check(plain(html)===summary,'Name wrapping never rewrites summary '+chapter+lang);
 for(const mention of mentions)check(html.includes(`/character-${mention.id}/?reader=${chapter}`),'Reviewed name has bounded profile link '+chapter+lang+mention.id);
}
check(P.inlineNames('<script>alert("x")</script> Valjean',{mentions:[{id:'valjean',name:'Valjean'}]}).startsWith('&lt;script&gt;'),'Raw prose escaped before wrapping');
check(P.inlineNames('Valjean',{mentions:[]})==='Valjean','No implicit auto-linking');
check(!P.inlineNames('Madeleine',{reader:'p1-b5-c1',mentions:[{id:'valjean',name:'Madeleine'}]}).includes('<a'),'No early alias-to-canonical URL');
check(!P.inlineNames('Madeleine',{reader:'p1-b7-c3',mentions:[{id:'valjean',name:'Madeleine'}]}).includes('<a'),'Unreviewed aliases stay plain even after revelation');
check(!P.inlineNames('Cosette',{reader:'p1-b1-c1',mentions:[{id:'cosette',name:'Cosette'}]}).includes('<a'),'Future character remains plain text');
check(P.inlineNames('ולמיריאל',{lang:'he',reader:'p1-b1-c12',mentions:[{id:'bishop',name:'מיריאל'}]}).includes('/character-bishop/'),'Hebrew name remains linked after a preposition');
check(P.inlineNames('שאֵפונין אפוניני',{lang:'he',reader:'p4-b14-c7',mentions:[{id:'eponine',name:'אפונין'}]})==='שאֵפונין אפוניני','No unreviewed embedded or suffixed name matching');
check(!P.inlineNames('5למיריאל',{lang:'he',reader:'p1-b1-c12',mentions:[{id:'bishop',name:'מיריאל'}]}).includes('<a'),'Attached Hebrew prefix cannot follow a numeric token');
check(P.href('unknown')===null&&P.href('cosette',{reader:'bad'})===null,'Unknown IDs and invalid reader values rejected');
for(const p of D.profiles){
 check(P.retainedHref('character-'+p.id,'?reader=p1-b1-c2','he')===`/he/character-${p.id}/?reader=p1-b1-c2`,'Language retains exact reader bound');
 check(P.retainedHref('character-'+p.id,'?view=full','he')===`/he/character-${p.id}/?view=full`,'Language retains explicit full view');
}
const savedOrigin=W.SITE_METADATA.origin;W.SITE_METADATA.origin='https://www.lesmisnotes.com';check(W.SiteSEO.structured('en','character-valjean')['@graph'].find(x=>x['@type']==='BreadcrumbList').itemListElement.length===3,'Canonical profile schema has three breadcrumb levels');W.SITE_METADATA.origin=savedOrigin;
const input={research:R,metadata:W.SITE_METADATA},safeIndex=W.SiteSearch.buildIndex(input,{spoiler:false}),fullIndex=W.SiteSearch.buildIndex(input,{spoiler:true});
for(const p of D.profiles){
 const safe=safeIndex.find(d=>d.id==='character:'+p.id),full=fullIndex.find(d=>d.id==='character:'+p.id);
 check(safe&&W.SiteSearch.hrefFor(safe,'en')===`/en/character-${p.id}/`,'Search opens dedicated profile');
 check(safe.body.en.includes(p.safeIntro.en),'Safe profile prose is locally searchable');
 for(const paragraph of p.paragraphs){check(!safe.body.en.includes(paragraph.en),'Safe search excludes full prose');check(full.body.en.includes(paragraph.en),'Consented search includes full prose');}
}
check(W.SiteSearch.search(safeIndex,'24601',{lang:'en'}).results[0]?.doc.id==='character:valjean','Existing character alias ranking retained');
for(const lang of ['he','en']){
 const typo=W.SiteSearch.search(safeIndex,'Cossette',{lang}).results[0]?.doc;
 check(W.SiteSearch.hrefFor(typo,lang)===`/${lang}/character-cosette/`,'Curated typo reaches dedicated profile');
 const oldNote=W.SiteSearch.search(fullIndex,'9430',{lang}).results[0]?.doc;
 check(oldNote?.id==='characterdetail:valjean'&&W.SiteSearch.hrefFor(oldNote,lang)===`/${lang}/characters/?focus=character%3Avaljean`,'Detailed old biography search reaches exact map content');
 check(!safeIndex.some(d=>d.kind==='characterdetail'),'Detailed relationship notes stay absent before permission');
 check(!fullIndex.find(d=>d.id==='character:valjean').body[lang].includes('9430'),'Profile index contains only its actual biography');
}
// Exercise actual app routing and language handling in one reusable runtime.
const nodes=new Map(),events={},app={innerHTML:'',addEventListener:(k,fn)=>events[k]=fn};
const node=id=>{if(!nodes.has(id))nodes.set(id,{style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},focus(){},scrollIntoView(){},addEventListener(){}});return nodes.get(id)};
const session=new Map([['barricade-spoilers','on']]),storage={getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)};
const C={console,URLSearchParams,localStorage:storage,sessionStorage:storage,history:{},location:{pathname:'/en/character-bishop/',search:'?reader=p1-b1-c2',hash:''},setTimeout:()=>1,clearTimeout(){},document:{cookie:'',head:{appendChild(){}},createElement:()=>({remove(){}}),addEventListener:(k,fn)=>events['doc-'+k]=fn,querySelectorAll:()=>[],querySelector:()=>node('query'),getElementById:id=>id==='app'?app:node(id),documentElement:{classList:{remove(){}}},title:''}};
C.window=C;C.scrollTo=()=>{};C.addEventListener=(k,fn)=>events[k]=fn;C.history.pushState=C.history.replaceState=(state,_,href)=>{const u=new URL(href,'https://example.test');Object.assign(C.location,{pathname:u.pathname,search:u.search,hash:u.hash});C.history.state=state};vm.createContext(C);
for(const f of ['research','extras','character-profiles-data','character-profiles','quiz-engine','seo','policies','privacy','site-config','analytics','places-data','places','recipes-data','recipes','contact','search'])vm.runInContext(fs.readFileSync('dist/'+f+'.js','utf8'),C);
vm.runInContext(fs.readFileSync('dist/app.js','utf8').replace('render();A.consent();','window.__profileTest={render,navigate,profileMentions,chapterProfileMentions};render();A.consent();'),C);
check(app.innerHTML.includes('reader-character-identity')&&!app.innerHTML.includes('profile-intro'),'Actual stored-spoiler reader route is bounded');
C.__profileTest.navigate('character-bishop','he');check(C.location.search==='?reader=p1-b1-c2'&&C.location.pathname==='/he/character-bishop/','Actual language navigation retains reader query');
for(const p of D.profiles){C.location.pathname='/en/character-'+p.id+'/';C.location.search='?reader='+p.firstAppearance.chapterId;C.__profileTest.render();check(app.innerHTML.includes(esc(p.readerIdentity.en))&&!app.innerHTML.includes('profile-intro'),'Actual application first-identity render '+p.id);}
C.location.pathname='/en/character-fantine/';C.location.search='?reader=p1-b1-c1';C.__profileTest.render();check(!C.document.title.includes('Fantine')&&C.document.title==='Reading companion character · LesMisNotes','Too-early reader metadata stays anonymous');
C.location.pathname='/en/characters/';C.location.search='?person=javert&view=all';C.__profileTest.render();check(app.innerHTML.indexOf('id="relationship-map"')<app.innerHTML.indexOf('profile-directory'),'Map remains before compact directory');check(app.innerHTML.includes('/en/character-javert/'),'Selected map person has prominent profile destination');
console.log(`PASS: ${checks} character-profile checks: ten bilingual routes, safe static HTML, metadata/search, all 365 chapter boundaries, explicit name wrapping, stored-spoiler isolation and language retention.`);
