'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('dist/app.js','utf8');
function setup(lang='en'){
 let focused=null;
 const node=(id)=>({id,attrs:{},dataset:{},hidden:false,setAttribute(k,v){this.attrs[k]=v},focus(){focused=id}});
 const groups=['learn','watch','people','listen','explore','context'].map(id=>Object.assign(node(id),{dataset:{navGroup:id}}));
 const link=node('first-link'),toggle=node('toggle'),panel=node('panel');panel.hidden=true;panel.querySelector=()=>link;
 const classes=new Set(),nav=node('nav');nav.classList={toggle(k,v){v?classes.add(k):classes.delete(k)},contains:k=>classes.has(k)};
 nav.querySelector=s=>s.includes('aria-current')?groups.find(g=>g.attrs['aria-current']==='location'):groups[0];
 const ctx={lang,menuGroup:null,navGroups:Object.fromEntries(groups.map(g=>[g.id,{}])),navMenu:id=>id,syncNavState(){},t:(he,en)=>lang==='he'?he:en,
  document:{getElementById:id=>id==='navigation'?nav:panel,querySelector:s=>s==='dialog[open]'?ctx.dialog||null:s.includes('data-action')?toggle:groups.find(g=>g.attrs['aria-expanded']==='true'),querySelectorAll:()=>groups}};
 vm.createContext(ctx);
 for(const name of ['closeExplore','openExplore','setNavigationOpen','handleNavigationKey'])vm.runInContext(app.match(new RegExp('function '+name+'\\([^\\n]+'))[0],ctx);
 const key=(key,group)=>{let prevented=false;ctx.handleNavigationKey({key,target:{closest:()=>group||null},preventDefault(){prevented=true}});return prevented};
 return {ctx,groups,panel,toggle,nav,focus:()=>focused,key};
}
for(const lang of ['en','he']){
 test(`menu opening focuses a usable group, prioritizing the current section (${lang})`,()=>{
  const h=setup(lang);h.ctx.setNavigationOpen(true);assert.equal(h.focus(),'learn');assert.equal(h.toggle.attrs['aria-expanded'],'true');assert.equal(h.toggle.textContent,'×');
  h.groups[1].attrs['aria-current']='location';h.ctx.setNavigationOpen(true);assert.equal(h.focus(),'watch');
  h.ctx.setNavigationOpen(false);assert.equal(h.focus(),'toggle');assert.equal(h.toggle.attrs['aria-expanded'],'false');assert.equal(h.toggle.textContent,'☰');
  assert.equal(h.toggle.attrs['aria-label'],lang==='he'?'פתיחת תפריט':'Open menu');
 });
 test(`submenu links are immediately reachable and close returns to the correct group (${lang})`,()=>{
  const h=setup(lang);h.ctx.openExplore('watch',{focusFirst:true});assert.equal(h.focus(),'first-link');assert.equal(h.panel.hidden,false);
  assert.equal(h.groups.filter(g=>g.attrs['aria-expanded']==='true').length,1);
  h.ctx.closeExplore();assert.equal(h.focus(),'watch');assert.equal(h.panel.hidden,true);assert.equal(h.ctx.menuGroup,null);
  h.ctx.openExplore('learn');h.ctx.openExplore('watch');h.ctx.closeExplore();assert.equal(h.focus(),'watch');
 });
 test(`Escape closes one menu level at a time and preserves the page (${lang})`,()=>{
  const h=setup(lang);h.ctx.setNavigationOpen(true);assert.equal(h.key('ArrowDown',h.groups[4]),true);assert.equal(h.focus(),'first-link');
  assert.equal(h.key('Escape'),true);assert.equal(h.panel.hidden,true);assert.equal(h.nav.classList.contains('open'),true);assert.equal(h.focus(),'explore');
  assert.equal(h.key('Escape'),true);assert.equal(h.nav.classList.contains('open'),false);assert.equal(h.focus(),'toggle');assert.equal(h.key('Escape'),false);
 });
 test(`closing the whole menu does not focus hidden groups or override a dialog (${lang})`,()=>{
  const h=setup(lang);h.ctx.setNavigationOpen(true);h.ctx.openExplore('watch',{focusFirst:true});h.ctx.setNavigationOpen(false);assert.equal(h.focus(),'toggle');assert.equal(h.panel.hidden,true);
  h.ctx.setNavigationOpen(true);h.ctx.openExplore('watch',{focusFirst:true});h.ctx.dialog={};assert.equal(h.key('Escape'),false);assert.equal(h.panel.hidden,false);
  h.ctx.setNavigationOpen(false,{restoreFocus:false});assert.equal(h.focus(),'first-link');
 });
}
test('the click handlers use shared focus-safe navigation helpers',()=>{
 assert.match(app,/case 'menu':setNavigationOpen\(/);
 assert.match(app,/if\(menuGroup===id&&!panel.hidden\)closeExplore\(\);else openExplore\(id,\{focusFirst:true\}\)/);
 assert.match(app,/document.addEventListener\('keydown',e=>\{if\(e.key==='Escape'\)pendingBookmark=null;handleNavigationKey\(e\)\}\)/);
});
