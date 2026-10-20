import fs from 'node:fs';
import path from 'node:path';
// Deliberately models Vercel's documented FILESYSTEM-FIRST precedence. This is
// the narrow supported rewrite subset in vercel.json, not a generic proxy.
export function fileAtPath(root,pathname){
  let file=path.resolve(root,'.'+decodeURIComponent(pathname));
  if(file!==root&&!file.startsWith(root+path.sep))return null;
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  return fs.existsSync(file)&&fs.statSync(file).isFile()?file:null;
}
function captures(source,pathname){
  const novel=['/:lang(he|en)/novel/','/:lang(he|en)/novel-journey/'].includes(source)?pathname.match(new RegExp('^/(he|en)/'+(source.includes('novel-journey')?'novel-journey':'novel')+'/?$')):null;
  if(novel)return {lang:novel[1]};
  const profile=source==='/:lang(he|en)/character-:id/'?pathname.match(/^\/(he|en)\/character-([a-z]+)\/?$/):null;
  return profile?{lang:profile[1],id:profile[2]}:null;
}
export function resolvePublishedRequest(input,{root=path.resolve('public-dist'),config=JSON.parse(fs.readFileSync('vercel.json','utf8'))}={}){
  const url=input instanceof URL?input:new URL(input,'https://example.test'),direct=fileAtPath(root,url.pathname);
  if(direct)return {file:direct,kind:'filesystem'};
  for(const rule of config.rewrites||[]){
    const params=captures(rule.source,url.pathname);if(!params)continue;
    const has=(rule.has||[]).every(h=>h.type==='query'&&h.value===undefined&&url.searchParams.has(h.key));
    const missing=(rule.missing||[]).every(h=>h.type==='query'&&h.value===undefined&&!url.searchParams.has(h.key));
    if(!has||!missing)continue;
    const destination=rule.destination.replace(/:([a-z]+)/g,(_,name)=>params[name]||''),file=fileAtPath(root,destination);
    if(file)return {file,kind:'rewrite',source:rule.source,destination};
    return null; // A matched missing target is a 404, never a broader fallback.
  }
  return null;
}
