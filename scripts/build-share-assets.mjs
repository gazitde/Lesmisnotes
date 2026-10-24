// Optional asset authoring only. Production builds serve the committed PNGs.
// Original vector artwork, composed from the site's existing illustrations.
// Requires Inkscape CLI; no network, fonts, packages or external images are fetched.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
const metadata=JSON.parse(fs.readFileSync('config/metadata.json','utf8'));
const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const root='dist';
const embed=(file,x,y,width,height)=>fs.readFileSync(file,'utf8').replace(/<svg\b[^>]*>/,open=>open.replace(/ (?:width|height)="[^"]*"/g,'').replace('<svg ',`<svg x="${x}" y="${y}" width="${width}" height="${height}" `));
const fontCache=fs.mkdtempSync(path.join(os.tmpdir(),'lesmis-art-'));
function rasterize(source,target,size){
 const args=[source,'--export-type=png','--export-filename='+target];if(size)args.push('--export-width='+size,'--export-height='+size);
 const result=spawnSync(process.env.INKSCAPE_PATH||'inkscape',args,{encoding:'utf8',env:{...process.env,XDG_CACHE_HOME:fontCache}});
 if(result.status!==0)throw Error(result.stderr||'Inkscape export failed');
}
function card(route,{heading,artwork}){
 const english=heading.en,hebrew=heading.he;
 const englishSize=english.some(line=>line.length>21)?51:56;
 const hebrewSize=hebrew.some(line=>line.length>22)?32:36;
 const safeTitle=esc(english.join(' ')+' / '+hebrew.join(' '));
 let art=embed('dist/assets/paris-frontispiece.svg',770,45,365,490);
 if(artwork==='book')art=`<rect x="770" y="45" width="365" height="490" fill="#eae2d1"/><rect x="786" y="61" width="333" height="458" fill="none" stroke="#b8a789"/><text x="952" y="153" text-anchor="middle" font-family="Georgia, serif" font-size="23" letter-spacing="5" fill="#665744">I · II · III · IV · V</text>${embed('dist/assets/novel-frontispiece.svg',783,200,339,210)}<path d="M876 447h153" stroke="#a33443"/><path d="m952 438 9 9-9 9-9-9z" fill="#a33443"/>`;
 if(artwork==='portraits')art=`<rect x="770" y="45" width="365" height="490" fill="#eae2d1"/>${embed('dist/assets/portraits/valjean.svg',792,69,205,205)}${embed('dist/assets/portraits/javert.svg',907,206,205,205)}${embed('dist/assets/portraits/cosette.svg',792,307,205,205)}`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title"><title id="title">LesMisNotes · ${safeTitle}</title>
<rect width="1200" height="630" fill="#f8f5ee"/><path d="M0 0h1200v7H0z" fill="#172b3b"/>
<text x="64" y="92" font-family="Georgia, serif" font-size="43" font-weight="bold" letter-spacing="-2" fill="#172b3b">LesMis<tspan fill="#a33443">Notes</tspan></text>
<text x="65" y="155" font-family="DejaVu Sans, sans-serif" font-size="17" letter-spacing="2" fill="#7d5147">LES MISÉRABLES · עלובי החיים</text>
<g font-family="Georgia, serif" font-size="${englishSize}" fill="#172b3b">${english.map((line,i)=>`<text x="63" y="${235+i*66}">${esc(line)}</text>`).join('')}</g>
<g font-family="Noto Sans Hebrew, DejaVu Sans, sans-serif" font-size="${hebrewSize}" fill="#a33443" direction="rtl" text-anchor="start">${hebrew.map((line,i)=>`<text x="688" y="${366+i*48}">${esc(line)}</text>`).join('')}</g>
<path d="M64 466h628" stroke="#c5beae"/><text x="64" y="510" font-family="DejaVu Sans, sans-serif" font-size="18" fill="#596166">An independent guide · English &amp; Hebrew</text>
<text x="64" y="559" font-family="DejaVu Sans, sans-serif" font-size="18" fill="#172b3b">lesmisnotes.com</text>${art}
<path d="M64 597h1071" stroke="#d8d3c7"/>
</svg>\n`;
}
try{
 fs.mkdirSync('dist/assets/share',{recursive:true});
 for(const [route,page] of Object.entries(metadata.pages)){
  if(!page.shareCard)continue;
  const base=route==='home'?'dist/assets/social-card':'dist/assets/share/'+route;
  fs.writeFileSync(base+'.svg',card(route,page.shareCard));rasterize(base+'.svg',base+'.png');
 }
 const icon='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><title>LesMisNotes</title><rect width="64" height="64" rx="12" fill="#172b3b"/><path d="M15 51h34M22 51V13" fill="none" stroke="#fff5df" stroke-width="4" stroke-linecap="round"/><path d="M25 15c10-7 14 9 26 1v21c-12 8-16-8-26-1z" fill="#b34849" stroke="#fff5df" stroke-width="2.5" stroke-linejoin="round"/></svg>\n';
 fs.writeFileSync('dist/favicon.svg',icon);
 for(const [name,size] of [['favicon-16x16',16],['favicon-32x32',32],['favicon-48x48',48],['favicon-96x96',96],['apple-touch-icon',180],['icon-192',192],['icon-512',512]])rasterize('dist/favicon.svg','dist/'+name+'.png',size);
 // ICO entries contain PNG payloads, supported by current icon consumers.
 const sizes=[16,32,48],images=sizes.map(size=>fs.readFileSync(`dist/favicon-${size}x${size}.png`));
 const header=Buffer.alloc(6+16*sizes.length);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);let offset=header.length;
 sizes.forEach((size,i)=>{const at=6+16*i;header[at]=size;header[at+1]=size;header.writeUInt16LE(1,at+4);header.writeUInt16LE(32,at+6);header.writeUInt32LE(images[i].length,at+8);header.writeUInt32LE(offset,at+12);offset+=images[i].length;});
 fs.writeFileSync('dist/favicon.ico',Buffer.concat([header,...images]));
 const manifest={id:'/',name:'LesMisNotes · Les Misérables',short_name:'LesMisNotes',description:'An independent English and Hebrew guide to Les Misérables, the novel and the musical.',lang:'en',dir:'ltr',start_url:'/',scope:'/',display:'browser',background_color:'#f8f5ee',theme_color:'#172b3b',icons:[{src:'/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'}]};
 fs.writeFileSync('dist/site.webmanifest',JSON.stringify(manifest,null,2)+'\n');
 console.log('Generated '+Object.values(metadata.pages).filter(p=>p.shareCard).length+' bilingual sharing cards, favicon variants, touch icons and browser-mode manifest.');
}finally{fs.rmSync(fontCache,{recursive:true,force:true});}
