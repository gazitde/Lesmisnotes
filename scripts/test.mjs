import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
const scripts=fs.readdirSync('.').filter(n=>/^validate.*\.mjs$/.test(n)).sort();
for (const file of scripts) {
  const result=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=512',file],{stdio:'inherit'});
  if(result.status!==0){console.error('Validation process failed:',{file,status:result.status,signal:result.signal,error:result.error?.message});process.exit(result.status||1);}
}
if(fs.existsSync('test')) {
  const result=spawnSync(process.execPath,['--test',...fs.readdirSync('test').filter(n=>/\.test\.(?:cjs|mjs|js)$/.test(n)).map(n=>'test/'+n)],{stdio:'inherit'});
  if(result.status!==0){console.error('Validation process failed:',{status:result.status,signal:result.signal,error:result.error?.message});process.exit(result.status||1);}
}
