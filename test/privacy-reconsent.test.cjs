'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const privacyCode=fs.readFileSync('dist/privacy.js','utf8'),appCode=fs.readFileSync('dist/app.js','utf8');
const ui=appCode.slice(appCode.indexOf('function privacyUI()'),appCode.indexOf('function privacyTransition('));
const action=appCode.slice(appCode.indexOf('function privacyAction('),appCode.indexOf('\nfunction dialogs('));
function harness(lang, prior, disk){
 disk=disk||new Map([['barricade-consent-v1',JSON.stringify(prior)],['barricade-lang','he'],['barricade-bookmarks','["map"]']]);
 const nodes={'privacy-functional':{checked:true},'privacy-analytics':{checked:false},'privacy-dialog':{close(){},showModal(){}}};
 const c={window:{addEventListener(){},SiteAnalytics:{configured:true}},localStorage:{getItem:k=>disk.get(k)||null,setItem:(k,v)=>disk.set(k,v)},document:{getElementById:k=>nodes[k],addEventListener(){}},Date,Map,pendingBookmark:null,t:(he,en)=>lang==='he'?he:en,url:r=>'/'+lang+'/'+r+'/'};
 vm.createContext(c);vm.runInContext(privacyCode,c);c.P=c.window.SitePrivacy;c.applyPrivacy=v=>c.P.choose(v);vm.runInContext(ui+'\n'+action,c);return {c,disk,nodes,html:()=>c.privacyUI(),act:a=>c.privacyAction(a)};
}
const now=Date.now(),prior=(analytics=true)=>({version:2,savedAt:now-86400000,expiresAt:now+179*86400000,functional:true,analytics,media:true});
for(const lang of ['en','he']){
 test(`v2 analytics grant requires a visible renewed choice (${lang})`,()=>{
 const p=prior(),h=harness(lang,p),c=h.c.P.choice();assert.equal(c.analytics,false);assert.equal(c.analyticsChoiceRequired,true);assert.equal(c.functional,true);assert.equal(c.media,true);assert.equal(c.expiresAt,p.expiresAt);assert.equal(h.disk.get(h.c.P.key),JSON.stringify(p));assert.match(h.html(),/class="privacy-banner"/);assert.match(h.html(),lang==='en'?/Analytics is off until you choose again/:/המדידה כבויה עד שתבחרו שוב/);assert.match(h.html(),/id="privacy-analytics" ><span>/);assert.equal(h.c.P.get('barricade-bookmarks'),'["map"]');
 h.act('privacy-close');assert.match(h.html(),/class="privacy-banner"/);assert.match(harness(lang,null,h.disk).html(),/class="privacy-banner"/);
 });
 for(const [act,grant] of [['privacy-accept',true],['privacy-reject',false],['privacy-save',false]])test(`renewed ${act} persists without a repeated prompt (${lang})`,()=>{
 const h=harness(lang,prior());h.act(act);assert.equal(h.c.P.allowed('analytics'),grant);assert.equal(h.c.P.choice().analyticsChoiceRequired,undefined);assert.doesNotMatch(h.html(),/class="privacy-banner"/);const again=harness(lang,null,h.disk);assert.equal(again.c.P.allowed('analytics'),grant);assert.doesNotMatch(again.html(),/class="privacy-banner"/);assert.equal(h.disk.get('barricade-bookmarks'),'["map"]');if(act==='privacy-save')assert.equal(again.c.P.allowed('functional'),true);
 });
 test(`prior rejection remains respected without renewed prompt (${lang})`,()=>{const h=harness(lang,prior(false));assert.equal(h.c.P.allowed('analytics'),false);assert.doesNotMatch(h.html(),/class="privacy-banner"/)});
}
