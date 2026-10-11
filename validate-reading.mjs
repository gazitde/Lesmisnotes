import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const ctx={window:{}};for(const f of ['research','extras','seo','search'])vm.runInNewContext(fs.readFileSync('dist/'+f+'.js','utf8'),ctx);
const R=ctx.window.RESEARCH,E=ctx.window.EXTRA_CONTENT,M=ctx.window.SITE_METADATA,S=ctx.window.SiteSearch,sources=[...R.sources,...E.extraSources],ids=new Set(sources.map(s=>s.id));let n=0;
const check=(v,label)=>{assert.ok(v,label);n++};
check(R.characters.length===10,'Ten established characters retained');check(R.introConnections.length===5,'Five directional introductory relations');
for(const c of R.characters)for(const lang of ['he','en'])check(typeof c.safeIntro[lang]==='string'&&c.safeIntro[lang].length>80,'Substantive safe intro '+c.id+' '+lang);
for(const x of R.introConnections)check(R.characters.some(c=>c.id===x.from)&&R.characters.some(c=>c.id===x.to),'Valid initial relation');
check(E.israel.sections.length===6,'Six Israeli history sections');check(E.israel.novelTranslations.items.length===3,'Three Hebrew translator entries');check(E.israel.media.items.length===3,'Three existing performances reused');
check(!E.israel.factEvidence,'Internal research evidence excluded from public data');
for(const m of E.israel.media.items)check(E.gallery.items.some(v=>v.id===m.galleryId),'Curated existing media only');
const habima=E.israel.castGroups.find(x=>x.id==='habima-cast');check(habima.cards.find(x=>x.id==='skaat').role.en==='Marius','Harel Skaat role');check(habima.cards.find(x=>x.id==='dalumi').role.en==='Éponine','Roni Dalumi role');check(habima.cards.find(x=>x.id==='kushnir').role.en==='Thénardier','Avi Kushnir role');
const fields=x=>{if(!x||typeof x!=='object')return;if(x.sourceIds)for(const id of x.sourceIds)check(ids.has(id),'Existing primary source '+id);for(const v of Object.values(x))if(v&&typeof v==='object')fields(v)};fields(E.israel);fields(E.watch);
check(E.watch.checkedDate==='2026-10-11','Viewing guide genuinely dated');check(E.watch.cards.length===6,'Six destinations');check(E.watch.cards.find(x=>x.id==='japan').status==='announced','Japan is announced, not current');check(E.watch.cards.find(x=>x.id==='israel').status==='no-current-listing-verified','No invented Israeli show');
for(const lang of ['he','en']){
 const chars=fs.readFileSync(`dist/${lang}/characters/index.html`,'utf8'),story=fs.readFileSync(`dist/${lang}/story/index.html`,'utf8'),israel=fs.readFileSync(`dist/${lang}/israel/index.html`,'utf8'),watch=fs.readFileSync(`dist/${lang}/watch/index.html`,'utf8'),home=fs.readFileSync(`dist/${lang}/home/index.html`,'utf8');
 for(const c of R.characters){check(chars.includes(`id="character-intro-${c.id}"`),'Static character '+c.id);check(chars.includes(c.safeIntro[lang].replaceAll('&','&amp;').replaceAll("'",'&#39;')),'Actual safe prose in HTML '+c.id);check(!chars.includes(c.summary[lang]),'Gated complete bio absent '+c.id)}
 check((chars.match(/id="valjean-24601"/g)||[]).length===1,'Stable single number anchor');check(chars.includes(R.safe24601.title[lang]),'Number title in raw HTML');check(!chars.includes('9430'),'Later number kept gated');check(!chars.includes('class="char-detail"')&&!chars.includes('class="graph-node'),'No interactive full-map leak');
 check(story.includes('story-first-look'),'Static story premise retained');check(story.includes('#valjean-24601'),'Story links to single number explanation');check(!story.includes('class="story-chapter"'),'Timeline outcomes stay gated');
 for(const h of [chars,story,israel,watch]){const allIds=[...h.matchAll(/\bid="([^\"]+)"/g)].map(m=>m[1]);check(new Set(allIds).size===allIds.length,'No duplicate static IDs');check(h.includes('no-js-nav'),'Native no-JS navigation');}
 for(const section of E.israel.sections)check(israel.includes(`id="israel-${section.id}"`),'Israel anchor '+section.id);
 check(israel.includes('benyehuda.org/read/43076')&&israel.includes('benyehuda.org/read/43194'),'Actual Hebrew reading links');check(!israel.includes('<iframe'),'Israel intro does not bypass video spoiler choice');
 for(const c of E.watch.cards)check(watch.includes(`id="watch-${c.id}"`),'Watch anchor '+c.id);
 const banner=home.match(/<section class="privacy-banner"[\s\S]*?<\/section>/)?.[0]||'';check((banner.match(/<button/g)||[]).length===3,'Three initial privacy buttons');for(const action of ['accept','reject','open'])check(banner.includes('data-action="privacy-'+action+'"'),'Initial '+action+' choice');
 check(!home.includes('Cumulative producer figure'),'No producer-process clutter');check(home.includes('about-provenance'),'Detailed provenance remains reachable');if(lang==='he'){check(!home.includes('PAGE → STAGE')&&!home.includes('STAGE → SCREEN'),'Hebrew format labels translated');}
}
const index=S.buildIndex({research:R,extra:E,metadata:M},{spoiler:false});for(const q of ['Harel Skaat','דודו פישר','Yaakov Steinberg','Madrid'])check(S.search(index,q,{lang:'en',limit:100}).total>0,'New safe searchable content '+q);
check(index.find(x=>x.id==='character:valjean').body.en.includes('24601'),'Number explanation indexed before spoilers');check(!JSON.stringify(index).includes('9430'),'Search remains protected');
console.log(`PASS: ${n} reading-release checks: substantive no-JS HTML, 24601, semantic relations, Israeli cast/translations, dated official viewing links, source references, three privacy choices and localization.`);
