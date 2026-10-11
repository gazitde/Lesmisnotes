import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
let checks=0;
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function harness(lang='en'){
 const nodes=new Map(),icons=[],ms=[],scripts=[];let focused=null,removed=0,created=0,tiles=0,ready=false,mapOptions,tileOptions;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,innerHTML:'',hidden:false,style:{},dataset:{},attrs:{},events:{},classList:{toggle(){}},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},focus(){focused=id},scrollIntoView(){},addEventListener(k,f){this.events[k]=f}});return nodes.get(id)};
 const map={getZoom:()=>12,setView(){},fitBounds(){ready=true;for(const m of ms)if(!m.icon){m.icon=node('marker-'+ms.indexOf(m));icons.push(m.icon);m.handlers.add?.();}},removeLayer(){},remove(){removed++},dragging:{enable(){},disable(){}},touchZoom:{enable(){},disable(){}},attributionControl:{setPrefix(){}}};
 const L={map(root,options){created++;mapOptions=options;return map},control:{zoom:()=>({addTo(){}}),scale:()=>({addTo(){}})},tileLayer(url,options){tiles++;tileOptions=options;assert.equal(url,'https://tile.openstreetmap.org/{z}/{x}/{y}.png');return {addTo(){return this},on(){return this}}},divIcon:x=>x,marker(coords,options){return {icon:null,handlers:{},addTo(){ms.push(this);if(ready)this.icon=node('marker-'+ms.indexOf(this));return this},on(event,fn){this.handlers[event]=fn;return this},getElement(){return this.icon}}}};
 const ctx={console,URLSearchParams,Promise,location:{pathname:`/${lang}/map/`,search:''},history:{state:null,replaceState(a,b,url){this.url=url},pushState(a,b,url){this.url=url}},document:{getElementById:node,querySelector:s=>node(s),querySelectorAll:()=>[],createElement:()=>({remove(){this.removed=true}}),head:{appendChild(el){scripts.push(el)}}},matchMedia:()=>({matches:true}),L};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('dist/places-data.js','utf8'),ctx);vm.runInContext(fs.readFileSync('dist/places.js','utf8'),ctx);
 const opts={lang,spoiler:false,route:'map',rerender(){ctx.PlaceAtlas.cleanup();ctx.PlaceAtlas.mapSection({...opts,lang:lang==='en'?'he':'en'});ctx.PlaceAtlas.mount({...opts,lang:lang==='en'?'he':'en'});},reveal(){}};
 const html=ctx.PlaceAtlas.mapSection(opts);
 function tap(data){return ctx.PlaceAtlas.handle({target:{closest:s=>s==='button'?{dataset:data,hasAttribute:n=>Object.hasOwn(data,n.replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase()))}:null}},opts)}
 return {ctx,nodes,icons,node,tap,opts,html,scripts,L,stats:()=>({created,removed,focused,tiles,mapOptions,tileOptions})};
}
for(const lang of ['en','he']){
 const h=harness(lang);
 assert.equal(h.stats().tiles,0);assert.ok(!h.html.includes('data-geo-load'));assert.ok(!h.html.includes('data-geo-disconnect'));assert.ok(h.html.includes('geo-loading'));assert.ok(h.html.includes('geo-map-provider'));checks+=5;
 for(const route of ['home','places','recipes','listening','privacy'])h.ctx.PlaceAtlas.mount({...h.opts,route});await settle();assert.equal(h.stats().created,0);assert.equal(h.stats().tiles,0);checks+=2;
 h.ctx.PlaceAtlas.mount(h.opts);await settle();assert.equal(h.stats().created,1);assert.equal(h.stats().tiles,1);assert.equal(h.icons.length,8);assert.equal(h.stats().focused,null);assert.equal(h.node('geo-map').hidden,false);assert.equal(h.node('geo-load').innerHTML,'');checks+=6;
 assert.equal(h.stats().mapOptions.dragging,false);assert.equal(h.stats().mapOptions.touchZoom,false);assert.equal(h.stats().tileOptions.referrerPolicy,'origin');assert.ok(h.stats().tileOptions.attribution.includes('OpenStreetMap contributors'));checks+=4;
 for(const icon of h.icons){assert.ok(icon.attrs['aria-label']?.length>4);assert.equal(typeof icon.events.keydown,'function');checks+=2;}
 let prevented=false,stopped=false;h.icons[1].events.keydown({key:'Enter',preventDefault(){prevented=true},stopPropagation(){stopped=true}});assert.ok(prevented&&stopped);assert.equal(h.stats().focused,'geo-card-title');assert.ok(h.ctx.history.url.includes('place=rue-plumet'));checks+=3;
 h.icons[3].events.keydown({key:' ',preventDefault(){},stopPropagation(){}});assert.ok(h.ctx.history.url.includes('place=bastille'));checks++;
 h.tap({action:'language'});await settle();assert.equal(h.stats().focused,'[data-action="language"]');assert.equal(h.stats().created,2);assert.ok(h.ctx.history.url.includes('place=bastille'));checks+=3;
 h.ctx.PlaceAtlas.cleanup();h.ctx.PlaceAtlas.mount({...h.opts,route:'home'});await settle();assert.equal(h.stats().removed,2);assert.equal(h.stats().tiles,2);checks+=2;
 h.ctx.PlaceAtlas.mount(h.opts);await settle();assert.equal(h.stats().created,3);checks++;
}
const cancelled=harness();delete cancelled.ctx.L;cancelled.ctx.PlaceAtlas.mount(cancelled.opts);assert.equal(cancelled.scripts.length,1);checks++;cancelled.ctx.PlaceAtlas.cleanup();cancelled.ctx.PlaceAtlas.mount({...cancelled.opts,route:'home'});cancelled.ctx.L=cancelled.L;cancelled.scripts[0].onload();await settle();assert.equal(cancelled.stats().created,0);assert.equal(cancelled.stats().tiles,0);checks+=2;
const failed=harness();delete failed.ctx.L;failed.ctx.PlaceAtlas.mount(failed.opts);failed.scripts[0].onerror();await settle();assert.equal(failed.stats().tiles,0);assert.ok(failed.node('geo-load').innerHTML.includes('data-geo-load'));assert.ok(failed.node('geo-load').innerHTML.includes('Try again'));assert.equal(failed.node('geo-map').hidden,true);checks+=4;
failed.tap({geoLoad:''});assert.equal(failed.scripts.length,2);checks++;failed.ctx.L=failed.L;failed.scripts[1].onload();await settle();assert.equal(failed.stats().created,1);assert.equal(failed.stats().focused,'geo-map');checks+=2;
console.log(`PASS: ${checks} geographic runtime checks: route-only automatic loading, no gate or disconnect, HE/EN, no focus steal, keyboard markers, language/navigation, cleanup race, failure and explicit retry.`);
