// Optional asset-authoring task, not part of production build. Requires the Inkscape CLI.
// Original site's vector artwork + character labels only; no portraits or third-party images.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const esc=x=>x.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
(async()=>{
 const base=fs.readFileSync('dist/assets/social-card.svg','utf8'),dir='dist/assets/characters';fs.mkdirSync(dir,{recursive:true});
 for(const p of JSON.parse(fs.readFileSync('config/character-profiles.json')).profiles){
  const svg=base.replace('font-size="72">A big story.','font-size="62">'+esc(p.name.en)).replace('font-size="72">An open heart.','font-size="52">Character guide.');
  fs.writeFileSync(path.join(dir,p.id+'.svg'),svg);
  const result=spawnSync('inkscape',[path.join(dir,p.id+'.svg'),'--export-type=png','--export-filename='+path.join(dir,p.id+'.png')],{encoding:'utf8'});
  if(result.status!==0)throw new Error(result.stderr||'Inkscape export failed');
 }
})().catch(e=>{console.error(e);process.exitCode=1});
