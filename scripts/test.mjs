import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
const scripts=fs.readdirSync('.').filter(n=>/^validate.*\.mjs$/.test(n)).sort();
for (const file of scripts) {
  const result=spawnSync(process.execPath,[file],{stdio:'inherit'});
  if(result.status!==0)process.exit(result.status||1);
}
if(fs.existsSync('test')) {
  const result=spawnSync(process.execPath,['--test',...fs.readdirSync('test').filter(n=>/\.test\.(?:cjs|mjs|js)$/.test(n)).map(n=>'test/'+n)],{stdio:'inherit'});
  if(result.status!==0)process.exit(result.status||1);
}
