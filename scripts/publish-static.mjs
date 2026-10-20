import fs from 'node:fs';
import path from 'node:path';
// Vercel checks public files before high-level rewrites. Keep canonical HTML
// in dist for source validation, but never publish colliding novel/profile files.
export function publishStatic(routes){
  const source=path.resolve('dist'),output=path.resolve('public-dist');
  fs.rmSync(output,{recursive:true,force:true});
  fs.cpSync(source,output,{recursive:true});
  for(const route of routes.filter(r=>['novel','novel-journey'].includes(r)||/^character-[a-z]+$/.test(r)))for(const lang of ['he','en']){
    const original=path.join(source,lang,route,'index.html'),internal=path.join(output,'route-pages',lang,route+'.html');
    if(!fs.existsSync(original))throw Error('Missing canonical page '+lang+'/'+route);
    fs.mkdirSync(path.dirname(internal),{recursive:true});fs.copyFileSync(original,internal);
    fs.rmSync(path.join(output,lang,route),{recursive:true,force:true});
    if(fs.existsSync(path.join(output,lang,route,'index.html')))throw Error('Public rewrite collision '+lang+'/'+route);
  }
}
