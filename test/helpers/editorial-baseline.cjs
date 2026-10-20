'use strict';
// Historical snapshot checks still cover every untouched field. Normalize only
// this release's explicitly reviewed paths, after verifying the exact new value.
const fs=require('node:fs'),assert=require('node:assert/strict');
const changes=JSON.parse(fs.readFileSync('docs/editorial-changes-20261020.json','utf8'));
exports.beforeEditorial=(input,kind)=>{
 const x=JSON.parse(JSON.stringify(input));
 for(const change of changes){
  if(change.path==='app.copy'||change.path.startsWith('story.')!==(kind==='research'))continue;
  const keys=change.path.split('.');let owner=x;
  for(const key of keys.slice(0,-1))owner=owner[key];
  const key=keys.at(-1);assert.deepEqual(owner[key],change.after,`Reviewed editorial value: ${change.path}`);owner[key]=change.before;
 }
 return x;
};
