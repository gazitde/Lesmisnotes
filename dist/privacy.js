'use strict';
(() => {
 const KEY='barricade-consent-v1',VERSION=3,DAYS=180;
 const OPTIONAL=['barricade-lang','barricade-listening','barricade-quiz-run','barricade-bookmarks','barricade-last-journey','barricade-last-reading','barricade-completed-chapters-v1'];
 const SESSION=['barricade-spoilers','barricade-after-consent','barricade-novel-consent','barricade-quiz-consent'];
 const memory=new Map(),subscribers=[];
 const raw=(key,session=false)=>{try{return (session?sessionStorage:localStorage).getItem(key)}catch{return null}};
 const write=(key,value,session=false)=>{try{(session?sessionStorage:localStorage).setItem(key,value);return true}catch{return false}};
 function readConsent(){try{const c=JSON.parse(raw(KEY)||'null');if(c&&(c.version===VERSION||c.version===2)&&Number.isFinite(c.savedAt)&&Number.isFinite(c.expiresAt)&&c.savedAt<=Date.now()&&c.expiresAt>Date.now()&&c.expiresAt-c.savedAt===DAYS*86400000&&['functional','analytics','media'].every(k=>typeof c[k]==='boolean'))return c.version===2?{...c,version:VERSION,analytics:false,analyticsChoiceRequired:c.analytics===true}:c}catch{}return null}
 let consent=readConsent(),timer,optionalErasedAt=Number.isSafeInteger(consent?.optionalErasedAt)?consent.optionalErasedAt:0;
 const allowed=purpose=>Boolean(consent&&consent.expiresAt>Date.now()&&consent[purpose]);
 function flush(){if(!allowed('functional'))return;for(const [k,value]of memory){let v=value;if(k==='barricade-listening'){try{const prior=JSON.parse(raw(k)||'[]'),next=JSON.parse(value);if(Array.isArray(prior)&&Array.isArray(next))v=JSON.stringify([...new Set([...prior,...next].filter(x=>['stars','prayer','ensemble'].includes(x)))])}catch{}}memory.set(k,v);write(k,v)}}
 function schedule(){if(typeof clearTimeout==='function')clearTimeout(timer);if(consent&&typeof setTimeout==='function')timer=setTimeout(refresh,Math.max(1,Math.min(consent.expiresAt-Date.now(),86400000)))}
 function refresh(){const previous=consent;consent=readConsent();optionalErasedAt=Math.max(optionalErasedAt,Number.isSafeInteger(consent?.optionalErasedAt)?consent.optionalErasedAt:0);if(JSON.stringify(previous)!==JSON.stringify(consent)){if(consent?.functional&&!previous?.functional)flush();for(const notify of subscribers)notify({previous,current:consent?{...consent}:null})}schedule()}
 window.SitePrivacy={key:KEY,optionalKeys:OPTIONAL.slice(),sessionKeys:SESSION.slice(),days:DAYS,
  choice:()=>consent&&consent.expiresAt>Date.now()?{...consent}:null,allowed,refresh,subscribe:fn=>subscribers.push(fn),
  readFreshOptional(key){if(!OPTIONAL.includes(key)||!allowed('functional'))return {available:false,value:null};try{const value=localStorage.getItem(key);memory.delete(key);return {available:true,value}}catch{return {available:false,value:null}}},
  get(key,session=false){if(session)return SESSION.includes(key)?raw(key,true):null;if(!OPTIONAL.includes(key))return null;if(memory.has(key))return memory.get(key);return allowed('functional')?raw(key):null},
  save(key,value,session=false){if(session){if(SESSION.includes(key))write(key,value,true);return}if(!OPTIONAL.includes(key))return;memory.set(key,String(value));return allowed('functional')?write(key,value):false},
  choose(values,options={}){const now=Date.now(),previous=this.choice(),latest=readConsent();optionalErasedAt=Math.max(optionalErasedAt,Number.isSafeInteger(latest?.optionalErasedAt)?latest.optionalErasedAt:0);const next={version:VERSION,savedAt:now,expiresAt:now+DAYS*86400000,functional:values.functional===true,analytics:values.analytics===true,media:values.media===true,...(optionalErasedAt?{optionalErasedAt}:{})};const persisted=write(KEY,JSON.stringify(next));if(options.requirePersistence&&!persisted)return {previous,current:previous,persisted:false};consent=next;if(!previous?.functional&&consent.functional)flush();schedule();return {previous,current:{...consent},persisted}},
  forgetMemory(){memory.clear()},
  eraseOptional(){const latest=readConsent();optionalErasedAt=Math.max(Date.now(),optionalErasedAt+1,(Number.isSafeInteger(latest?.optionalErasedAt)?latest.optionalErasedAt:0)+1);memory.clear();for(const key of OPTIONAL){try{localStorage.removeItem(key)}catch{}}},
  eraseSessionChoices(){for(const key of SESSION){try{sessionStorage.removeItem(key)}catch{}}}
 };
 window.addEventListener?.('storage',e=>{if(e.key===KEY||e.key===null)refresh()});
 window.addEventListener?.('focus',refresh);
 if(typeof document!=='undefined')document.addEventListener?.('visibilitychange',()=>{if(document.visibilityState==='visible')refresh()});
 schedule();
})();
