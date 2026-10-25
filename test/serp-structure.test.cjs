'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={window:{},URLSearchParams};vm.createContext(context);
for(const file of ['research','extras','character-profiles-data','character-profiles','seo'])vm.runInContext(fs.readFileSync(`dist/${file}.js`,'utf8'),context);
const app=fs.readFileSync('dist/app.js','utf8');
// Exercise the actual label catalogue and profile registration, not a second copy.
vm.runInContext(app.slice(app.indexOf('const labels ='),app.indexOf('function characterProfileContext()')),context);
const W=context.window,M=W.SITE_METADATA;
const decode=value=>value.replace(/&(?:amp|quot|#39|lt|gt);/g,char=>({'&amp;':'&','&quot;':'"','&#39;':"'",'&lt;':'<','&gt;':'>'}[char]));
const text=value=>decode(value.replace(/<[^>]*>/g,'')).trim();
const structured=html=>JSON.parse(html.match(/<script id="page-structured-data" type="application\/ld\+json">([^<]+)<\/script>/)[1])['@graph'];
function visibleTrail(html){
 const nav=html.match(/<nav\b[^>]*class="(?:breadcrumb|reader-breadcrumbs)(?:\s[^"]*)?"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
 return [...nav.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map(match=>({name:text(match[1]),href:decode(match[1].match(/href="([^"]*)"/)?.[1]||'')}));
}

test('every canonical localized page has a truthful, linked breadcrumb matching its visible trail',t=>{
 let routes=0,entries=0;const titles=new Set(),descriptions=new Set();
 for(const [route,p] of Object.entries(M.pages).filter(([,p])=>!p.canonicalRoute))for(const lang of ['en','he']){
  const label=`${lang}/${route}`,html=fs.readFileSync(`dist/${label}/index.html`,'utf8'),graph=structured(html),page=graph[0],trail=visibleTrail(html),breadcrumb=graph.find(node=>node['@type']==='BreadcrumbList');
  for(const [values,value] of [[titles,p.title[lang]],[descriptions,p.description[lang]]]){assert(!values.has(value),`Duplicate metadata: ${label}`);values.add(value);}
  assert.equal(page.name,p.title[lang],`Page title remains specific: ${label}`);
  if(M.origin){
   const canonical=`${M.origin}/${lang}/${route}/`;assert.equal(page.url,canonical);
   if(route==='home'){assert.equal(trail.length,0);assert.equal(breadcrumb,undefined);assert.equal(page.breadcrumb,undefined);}
   else{
    assert(breadcrumb,`Missing breadcrumb: ${label}`);assert.equal(breadcrumb['@id'],canonical+'#breadcrumb');assert.equal(page.breadcrumb?.['@id'],breadcrumb['@id']);
    assert.deepEqual(breadcrumb.itemListElement.map(item=>item.name),trail.map(item=>item.name),`Visible breadcrumb labels: ${label}`);
    for(const [index,item] of breadcrumb.itemListElement.entries()){
     assert.equal(item.position,index+1,`Position: ${label}`);assert.equal(item.item,trail[index].href?new URL(trail[index].href,M.origin).href:canonical,`Visible destination: ${label}`);
     const target=new URL(item.item);assert.equal(target.origin,M.origin);assert(fs.existsSync('dist'+target.pathname+'index.html'),`Missing destination: ${item.item}`);entries++;
    }
   }
  }
  routes++;
 }
 t.diagnostic(JSON.stringify({canonicalLocalizedRoutes:routes,uniqueTitles:titles.size,uniqueDescriptions:descriptions.size,breadcrumbEntries:entries}));
});

test('runtime schema reuses registered labels while retaining journey/profile parent wording',()=>{
 if(!M.origin)return;
 for(const lang of ['he','en']){
  const names=route=>Array.from(W.SiteSEO.structured(lang,route)['@graph'].find(node=>node['@type']==='BreadcrumbList').itemListElement,item=>item.name);
  assert.equal(names('history').at(-1),W.SiteSEO.labels.history[lang]);
  assert.equal(names('novel-journey')[1],lang==='he'?'הספר':'The novel');
  assert.equal(names('character-valjean')[1],lang==='he'?'הדמויות ומפת הקשרים':'Characters & connections');
  assert.equal(names('character-valjean').at(-1),W.CharacterProfiles.get('valjean').name[lang]);
 }
 const isolated={window:{SITE_METADATA:M}};vm.runInNewContext(fs.readFileSync('scripts/seo-runtime.js','utf8'),isolated);
 assert.equal(isolated.window.SiteSEO.structured('en','history')['@graph'].find(node=>node['@type']==='BreadcrumbList').itemListElement.at(-1).name,M.pages.history.title.en);
});

test('chapter-bounded profile trails retain their exact names and destinations',()=>{
 if(!M.origin)return;
 try{
  for(const profile of W.CharacterProfiles.all())for(const lang of ['he','en'])for(const search of ['?reader=','?reader=p1-b1-c1','?reader=p5-b9-c6&essays=all']){
   W.location={search};const route='character-'+profile.id,expected=W.CharacterProfiles.readerTrail(route,{lang,search});
   const graph=W.SiteSEO.structured(lang,route)['@graph'],actual=graph.find(node=>node['@type']==='BreadcrumbList');
   assert.deepEqual(Array.from(actual.itemListElement,item=>({name:item.name,item:item.item})),Array.from(expected,item=>({name:item.label,item:M.origin+item.href})));
   assert.equal(graph[0].breadcrumb['@id'],actual['@id']);
  }
 }finally{delete W.location;}
});
