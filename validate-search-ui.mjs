// Interaction-contract tests with a tiny DOM double. This is not a layout/browser audit.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
let active=null,panel=null,opener=null;
const documentHandlers={};
class Element {
 constructor(kind,attrs={},parent=null){this.kind=kind;this.attrs=attrs;this.parent=parent;this.handlers={};this.children=[];this.isConnected=true;this.open=false;this.value='';this.dataset={};for(const [k,v] of Object.entries(attrs))if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]=v;}
 set innerHTML(html){this.html=html;this.children=[];
  if(this===panel&&html.includes('site-search-input')){
   for(const [id,kind] of [['site-search-input','input'],['site-search-status','p'],['site-search-results','div']])this.children.push(new Element(kind,{id},this));
   this.querySelector('#site-search-input').value=html.match(/value="([^"]*)"/)?.[1]||'';
   for(const m of html.matchAll(/data-site-search-category="([^"]+)" aria-pressed="([^"]+)"/g))this.children.push(new Element('button',{'data-site-search-category':m[1],'aria-pressed':m[2]},this));
  }
  for(const m of html.matchAll(/<a data-site-search-result href="([^"]+)"/g))this.children.push(new Element('a',{'data-site-search-result':'',href:m[1]},this));
 }
 get innerHTML(){return this.html||''}setAttribute(k,v){this.attrs[k]=String(v)}getAttribute(k){return this.attrs[k]??null}hasAttribute(k){return k in this.attrs}
 addEventListener(type,fn){(this.handlers[type]??=[]).push(fn)}emit(type,e){for(const fn of this.handlers[type]||[])fn(e)}
 focus(){active=this}showModal(){this.open=true}close(){this.open=false}scrollIntoView(){}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null}
 querySelectorAll(selector){let result=[];const all=[];const visit=e=>{for(const c of e.children){all.push(c);visit(c)}};visit(this);
  if(selector==='.site-search-list a')return all.filter(x=>x.kind==='a'&&x.hasAttribute('data-site-search-result'));
  return all.filter(e=>e.matches(selector));}
 matches(s){if(s.startsWith('#'))return this.attrs.id===s.slice(1);if(s.startsWith('['))return this.hasAttribute(s.slice(1,-1));return s.split(',').includes(this.kind)}
 closest(s){if(s==='a[data-site-search-result]')return this.kind==='a'&&this.hasAttribute('data-site-search-result')?this:null;if(this.matches(s))return this;return this.parent?.closest(s)||null}
 contains(e){for(let x=e;x;x=x.parent)if(x===this)return true;return false}
}
const doc={createElement:k=>{const e=new Element(k);if(k==='dialog')panel=e;return e},body:{appendChild(){}},get activeElement(){return active},querySelector:s=>s==='dialog[open]'?(panel?.open?panel:null):s==='[data-site-search-open]'?opener:null,addEventListener:(t,f)=>(documentHandlers[t]??=[]).push(f)};
const ctx={window:{document:doc},URLSearchParams,setTimeout,clearTimeout};vm.createContext(ctx);
for(const f of ['research','extras','places-data','recipes-data','seo','search'])vm.runInContext(fs.readFileSync('dist/'+f+'.js','utf8'),ctx);
const S=ctx.window.SiteSearch;opener=new Element('button',{'data-site-search-open':''});opener.focus();
let selectedHref='',checks=0;const check=(v,m)=>{assert.ok(v,m);checks++};
const event=(target,other={})=>({target,key:'',defaultPrevented:false,preventDefault(){this.defaultPrevented=true},...other});
const global=(type,e)=>{for(const f of documentHandlers[type]||[])f(e)};
const key=k=>global('keydown',event(active,{key:k}));
const input=()=>panel.querySelector('#site-search-input');
const type=async q=>{input().value=q;panel.emit('input',event(input()));await new Promise(r=>setTimeout(r,170))};
const results=()=>panel.querySelector('#site-search-results');
S.mount({lang:'en',spoiler:false,novelConsent:false,onNavigate:h=>{selectedHref=h}});
global('click',event(opener));check(panel.open,'Header action opens native dialog');check(active===input(),'Focus goes to input');
check(panel.innerHTML.includes('role="search"')&&panel.innerHTML.includes('aria-controls="site-search-results"'),'Search input accessible association');
await type('24601');check(results().innerHTML.includes('Jean Valjean'),'Debounced search renders');
key('ArrowDown');check(active.kind==='a','ArrowDown enters results');key('ArrowUp');check(active===input(),'ArrowUp returns to input');
key('Escape');check(!panel.open&&active===opener,'Escape closes and restores focus');
global('keydown',event(opener,{key:'k',ctrlKey:true}));check(panel.open,'Control K opens search');
await type('9430');check(!results().innerHTML.includes('Jean Valjean'),'Safe mode excludes hidden details');
S.mount({lang:'en',spoiler:true});check(!panel.open&&panel.innerHTML==='','Permission transition immediately removes old UI');
S.open(opener);await type('9430');check(results().innerHTML.includes('9430'),'Consented text indexed');
S.mount({lang:'en',spoiler:false});S.open(opener);await type('9430');check(!results().innerHTML.includes('9430'),'Permission revocation invalidates index');
await type('dockyards');panel.emit('submit',event(input()));check(active.kind==='a','Submit moves focus to first result');
global('click',event(active));check(selectedHref==='/en/map/?focus=atlas%3Atoulon'&&!panel.open,'Result activation delegates localized deep link and closes');
S.mount({lang:'he'});S.open(opener);await type('כוֹלֵרָה');check(results().innerHTML.includes('/he/history/'),'Language context preserved');
await type('Valjean');panel.emit('compositionstart',event(input()));input().value='sesame';panel.emit('input',event(input()));await new Promise(r=>setTimeout(r,170));check(!results().innerHTML.includes('tahini-walnut-loaf'),'IME composition delays search');panel.emit('compositionend',event(input()));await new Promise(r=>setTimeout(r,170));check(results().innerHTML.includes('tahini-walnut-loaf'),'IME completion runs search');
S.mount({lang:'en',spoiler:true,afterConsent:false});S.open(opener);await type('handkerchief');check(!results().innerHTML.includes('marius-handkerchief'),'General spoilers alone do not index separate after-show stories');
S.mount({lang:'en',spoiler:true,afterConsent:true});S.open(opener);await type('handkerchief');check(results().innerHTML.includes('marius-handkerchief'),'After-show consent rebuilds index with new stories');
S.mount({lang:'en',spoiler:true,afterConsent:false});check(!panel.open&&panel.innerHTML==='','Closing after-show immediately clears old result DOM');S.open(opener);await type('handkerchief');check(!results().innerHTML.includes('marius-handkerchief'),'After-show withdrawal invalidates cached index');
await type('<img src=x onerror=alert(1)>');check(!results().innerHTML.includes('<img'),'Arbitrary query not inserted as markup');
ctx.window.RESEARCH={};ctx.window.EXTRA_CONTENT={};ctx.window.PLACE_CONTENT={};ctx.window.RECIPE_CONTENT={};ctx.window.SITE_METADATA={};S.mount({lang:'en',spoiler:false});S.open(opener);await type('test');check(results().innerHTML.includes('Local search could not load')&&results().innerHTML.includes('/en/sitemap/'),'Empty local index offers safe fallback');
console.log(`Search UI contract: ${checks} simulated-DOM checks passed (keyboard, focus, debounce, IME, state revocation, deep links, injection, empty index). Actual layout/browser QA is separate.`);
