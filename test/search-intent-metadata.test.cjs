'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C={window:{},URLSearchParams};
for(const file of ['research','extras','character-profiles-data','character-profiles','seo'])vm.runInNewContext(fs.readFileSync(`dist/${file}.js`,'utf8'),C);
const W=C.window,profiles=W.CHARACTER_PROFILES.profiles,metadata=W.SITE_METADATA;
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(lang,route)=>fs.readFileSync(`dist/${lang}/${route}/index.html`,'utf8');
const schema=html=>JSON.parse(html.match(/<script id="page-structured-data" type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);

for(const id of ['javert','gavroche','eponine'])for(const lang of ['en','he'])test(`${id}/${lang}: distinct snippets agree across static and client surfaces`,()=>{
 const p=profiles.find(p=>p.id===id),route='character-'+id,meta=metadata.pages[route],html=read(lang,route);
 assert.equal(meta.title[lang],p.seo.title[lang]);assert.equal(meta.description[lang],p.seo.description[lang]);
 assert(html.includes(`<title>${escape(meta.title[lang])}</title>`));
 for(const tag of ['name="description"','property="og:description"','name="twitter:description"'])assert(html.includes(`${tag} content="${escape(meta.description[lang])}"`));
 const page=schema(html)['@graph'][0];assert.equal(page.name,meta.title[lang]);assert.equal(page.description,meta.description[lang]);
 assert(html.includes(escape(p.safeIntro[lang])));assert(!html.includes('profile-full-prose'));
 for(const para of p.paragraphs)assert(!html.includes(escape(para[lang])));
 const reader=W.CharacterProfiles.metadata(route,'?reader=');assert.notEqual(reader.title[lang],meta.title[lang]);assert.notEqual(reader.description[lang],meta.description[lang]);
 const shell=fs.readFileSync(`dist/profile-readers/${lang}/${id}.html`,'utf8');assert(!shell.includes(escape(meta.description[lang])));assert(shell.includes('noindex, follow'));
 assert(!schema(html)['@graph'].some(x=>['FAQPage','Review','AggregateRating'].includes(x['@type'])));
});

test('Javert answers the inspector question in visible introductory prose',()=>{
 assert(read('he','character-javert').includes('<p class="profile-intro">ז׳אבר (Javert) הוא מפקח המשטרה בעלובי החיים.'));
 assert(read('en','character-javert').includes('<p class="profile-intro">Javert is the police inspector in Les Misérables.'));
});

for(const lang of ['en','he'])test(`${lang}: character hub names its subject and links to roles without interaction`,()=>{
 const html=read(lang,'characters'),directory=html.match(/<section class="profile-directory"[\s\S]*?<\/section>/)[0];
 assert(html.includes(`<h1>${lang==='he'?'הדמויות של עלובי החיים':'Les Misérables characters'}</h1>`));
 assert.equal((directory.match(/class="profile-directory-role"/g)||[]).length,10);
 for(const p of profiles)assert(directory.includes(`href="/${lang}/character-${p.id}/"><span>${escape(p.name[lang])}</span> <span class="profile-directory-role">${escape(p.role[lang])}</span></a>`));
 assert(html.indexOf('id="relationship-map"')<html.indexOf('class="profile-directory"'),'Map remains the primary view');
 const history=read(lang,'history');assert(history.includes(`<h1>${lang==='he'?'עלובי החיים:<br>ההיסטוריה האמיתית.':'Les Misérables:<br>the real history.'}</h1>`));
 for(const date of ['1789','1832'])assert(metadata.pages.history.description[lang].includes(date));
 assert(history.includes('class="historical-outcome"'));assert(history.includes('data-action="enable-spoilers"'));assert(!history.includes('class="history-outcome-reflection"'),'Historical outcome stays gated');
});

test('runtime navigation uses the same bespoke metadata and retains anonymous reader mode',()=>{
 const line=fs.readFileSync('dist/app.js','utf8').split('\n').find(x=>x.startsWith('function updatePageMetadata()'));
 for(const lang of ['en','he']){
  const attrs=new Map(),location={search:''},scope={window:{...W,location},location,lang,route:'character-javert',URLSearchParams,url:r=>`/${lang}/${r}/`,document:{querySelector:s=>({setAttribute:(a,v)=>attrs.set(s+'|'+a,v)}),getElementById:()=>null}};
  vm.createContext(scope);vm.runInContext(line,scope);scope.updatePageMetadata();
  assert.equal(scope.document.title,metadata.pages['character-javert'].title[lang]);assert.equal(attrs.get('meta[name=description]|content'),metadata.pages['character-javert'].description[lang]);
  location.search='?reader=';scope.updatePageMetadata();assert(!scope.document.title.includes('Javert'));assert(!scope.document.title.includes('ז׳אבר'));assert.equal(attrs.get('meta[name=robots]|content'),'noindex, follow');
 }
});
