'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/app.js','utf8');
function fn(name){const start=source.indexOf('function '+name+'(');assert.ok(start>=0);const end=source.indexOf('\nfunction ',start+1);return source.slice(start,end)}
function reader(){
 const calls=[],c={window:{scrollX:0,scrollY:200},location:{pathname:'/he/novel-journey/',search:'?focus=chapter%3Ap1-b1-c1'},readerFocusLanding:null,readerSelection:()=>({chapter:'p1-b1-c1',level:'book'}),Math};
 let card={id:'reader-chapter-p1-b1-c1',style:{},getBoundingClientRect(){calls.push('layout');return {top:100}},focus(options){assert.equal(options.preventScroll,true);calls.push('focus');c.document.activeElement=card},scrollIntoView(options){assert.equal(options.behavior,'instant');calls.push('scroll');c.window.scrollY=200}};
 const panel={contains:element=>element===card};c.document={activeElement:card,querySelector:()=>({getBoundingClientRect:()=>({height:114})}),getElementById:id=>id==='reading-current'?panel:card};c.refreshReadingPanel=()=>calls.push('refresh');vm.createContext(c);
 for(const name of ['readerLandingPosition','focusReaderSelection','refreshLoadedReadingPanel'])vm.runInContext(fn(name),c);
 return {c,calls,card};
}
test('lazy refresh flushes layout and preserves an untouched explicit reader landing',()=>{
 const {c,calls}=reader();c.focusReaderSelection();assert.equal(c.document.activeElement.style.scrollMarginTop,'138px');assert.deepEqual(calls,['layout','focus','scroll']);calls.length=0;c.refreshLoadedReadingPanel();assert.deepEqual(calls,['refresh','layout','focus','scroll']);
});
test('lazy refresh restores keyboard focus without dragging a reader who scrolled away',()=>{
 const {c,calls}=reader();c.focusReaderSelection();calls.length=0;c.window.scrollY=0;c.refreshLoadedReadingPanel();assert.deepEqual(calls,['refresh','layout','focus']);assert.equal(c.window.scrollY,0);
});
test('lazy refresh does not steal focus outside the reader or scroll a different history position',()=>{
 const {c,calls}=reader();c.focusReaderSelection();calls.length=0;c.document.activeElement={id:'footer-link'};c.refreshLoadedReadingPanel();assert.deepEqual(calls,['refresh']);
 const other=reader();other.c.focusReaderSelection();other.calls.length=0;other.c.location.search='?focus=chapter%3Ap1-b1-c2';other.c.refreshLoadedReadingPanel();assert.deepEqual(other.calls,['refresh','layout','focus']);
});
test('dynamic-reader anchoring exclusion stays scoped to the journey surface',()=>{
 const css=fs.readFileSync('dist/journey-pages.css','utf8');assert.match(css,/\.novel-journey-page #reading-current\{overflow-anchor:none\}/);
 const mount=fn('mountReadingPart');assert.equal((mount.match(/refreshLoadedReadingPanel\(\)/g)||[]).length,2,'Success and error responses follow the same focus guard');
});
test('explicit musical consent replaces root with the current scene before opening, without a new history step',()=>{
 const calls=[],c={route:'musical-journey',lang:'en',showAct:'all',location:{pathname:'/en/musical-journey/',search:''},history:{state:{existing:true},replaceState(state,unused,href){calls.push(['replace',state,href]);const u=new URL(href,'https://example.test');c.location.search=u.search}},validReading:()=>true,readingHref:(kind,key,lang,view)=>`/${lang}/musical-journey/?focus=${encodeURIComponent(kind+':'+key)}&view=${view}`,rememberReading(){},updatePageMetadata(){},currentShowStop:()=>({id:'work-song'}),setSpoilers(value){calls.push(['consent',value])},landOnShowStop(){calls.push(['land'])}};
 vm.createContext(c);for(const name of ['setReadingLocation','openMusicalJourney'])vm.runInContext(fn(name),c);assert.equal(c.location.search,'');c.openMusicalJourney();assert.equal(calls[0][0],'replace');assert.equal(new URLSearchParams(c.location.search).get('focus'),'song:work-song');assert.deepEqual(calls.slice(1),[['consent',true],['land']]);assert.equal(calls.filter(x=>x[0]==='replace').length,1);
});
