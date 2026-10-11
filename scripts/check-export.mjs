import fs from 'node:fs';
import path from 'node:path';
const excluded=new Set(['.git','node_modules','.vercel','.openai']);
const patterns=[/appgprj_[a-z0-9]+/i,/https?:\/\/[^\s"'<>]*\.chatgpt\.site/i,/\/workspace\/(?:scratch|shared)\//,/Sentinel_[a-z0-9]+/i,/codex:\/\/threads\//,/[A-Z0-9._%+-]+@gmail\.com/i,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}/,/\bsk_live_[A-Za-z0-9]{16,}/];
let checked=0;
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(excluded.has(e.name)||e.name.startsWith('.env')&&e.name!=='.env.example')continue;const p=path.join(dir,e.name);if(e.isDirectory()){walk(p);continue;}if(p==='scripts/check-export.mjs'||/\.(png|webp|ico|woff2?)$/.test(p))continue;const s=fs.readFileSync(p,'utf8');for(const re of patterns)if(re.test(s))throw new Error('Private data or credential pattern in '+p);checked++;}}
walk('.');console.log(`PASS: ${checked} text files checked for private deployment identifiers, recipient addresses, workspace paths and common secrets. This is an additional guard, not a complete security audit.`);
