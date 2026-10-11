import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++};
const data=JSON.parse(fs.readFileSync('docs/recipe-source-audit.json','utf8'));
const callbacks={};let prints=0,focused='',scrolled='';
const nodes=new Map(data.recipes.map(r=>['recipe-'+r.id,{focus(){focused=r.id},scrollIntoView(){scrolled=r.id}}]));
const context={window:null,document:{body:{dataset:{}},getElementById:id=>nodes.get(id)}};
context.window=context;context.addEventListener=(t,f)=>callbacks[t]=f;context.print=()=>prints++;
vm.createContext(context);
for(const f of ['recipes-data.js','recipes.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),context);
assert.deepEqual(JSON.parse(JSON.stringify(context.RECIPE_CONTENT)),data);checks++;
ok(data.recipes.length===5,'Four dishes plus optional loaf');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('’','’').replaceAll("'",'&#39;');
for(const lang of ['he','en']){
 const html=context.InnKitchen.page(lang),prerender=fs.readFileSync(`dist/${lang}/recipes/index.html`,'utf8');
 ok(!html.includes('undefined'),'No undefined strings');ok(html.includes(esc(data.intro[lang])),'Complete intro');
 ok(html.includes(esc(data.accuracyNote[lang])),'Modern menu and source-only rating context');
 ok(html.includes(esc(data.timingNote[lang])),'Honest timing');ok(html.includes(data.inn.reference),'Inn source');
 ok((html.match(/data-recipe-card=/g)||[]).length===data.recipes.length,'All rendered recipes');
 ok((html.match(/class="inn-food-art"/g)||[]).length===data.recipes.length,'Original illustrations');
 ok((html.match(/data-recipe-print=/g)||[]).length===data.recipes.length,'Print each recipe');
 ok(html.includes('data-menu-print'),'Print menu');ok(!/<(?:img|iframe|script)\b/.test(html),'No remote media');
 for(const r of data.recipes){
  ok(html.includes(`id="recipe-${r.id}" tabindex="-1"`),'Focusable recipe');
  for(const key of ['title','novelFoodLabel','modernDishLabel','adaptation','servings','availability','allergens'])ok(html.includes(esc(r[key][lang])),key);
  ok(html.includes(esc(r.book[lang])),'Visible literary context');ok(html.includes(r.book.reference),'Exact reference');
  ok(html.includes(r.book.url),'Primary text');ok(html.includes(r.source.url),'Source recipe');
  if(Number.isFinite(r.source.rating)){ok(html.includes(r.source.voteCount+' '),'Vote count');ok(html.includes(r.source.rating+' / '+r.source.ratingMax),'Original rating');}else{ok(html.includes(r.ratingNote[lang]),'Honest unrated soup');ok(!html.includes('null / null'),'No invented rating');}
  ok(r.source.freeToRead&&r.source.verifiedAt===data.verifiedAt,'Verified accessible source date');
  ok(r.minutes>=r.activeMinutes,'Total exceeds active time');
  for(const item of [...r.ingredients[lang],...r.steps[lang]])ok(html.includes(esc(item)),'Full original instructions');
  ok(prerender.includes(esc(r.title[lang])),'Static content');
 }
 ok(html.includes(lang==='he'?'63 מעלות':'63°C'),'Fish temperature');
 ok(html.includes(lang==='he'?'עדיין לא נוסה במטבח':'has not been kitchen-tested'),'Specific experimental soup-variation note');
 ok(prerender.includes('recipes.js?v='),'Versioned module');ok(prerender.includes('recipes.css?v='),'Versioned CSS');
}
for(const r of data.recipes){
 let prevented=false;
 const handled=context.InnKitchen.handle({target:{closest:s=>s==='a[data-recipe-jump]'?{dataset:{recipeJump:r.id}}:null},preventDefault(){prevented=true}});
 ok(handled&&prevented&&focused===r.id&&scrolled===r.id,'Keyboard link transfers focus and scroll');
 context.InnKitchen.handle({target:{closest:s=>s==='button'?{dataset:{recipePrint:r.id}}:null}});
 ok(context.document.body.dataset.printRecipe===r.id,'Print target isolated');
 callbacks.afterprint();ok(!context.document.body.dataset.printRecipe,'Print cleanup');
}
context.InnKitchen.handle({target:{closest:s=>s==='button'?{dataset:{},hasAttribute:s=>s==='data-menu-print'}:null}});
ok(prints===data.recipes.length+1&&!context.document.body.dataset.printRecipe,'Whole menu printing');
ok(!context.InnKitchen.handle({target:{closest:()=>null}}),'Unrelated clicks unchanged');
ok(!context.InnKitchen.handle({ctrlKey:true,target:{closest:s=>s==='a[data-recipe-jump]'?{dataset:{recipeJump:'warm-brie'}}:null}}),'Modified links preserved');
context.document.body.dataset.printRecipe='warm-brie';context.InnKitchen.page('en');ok(!context.document.body.dataset.printRecipe,'Navigation resets print target');
for(const r of data.recipes){for(const kind of ['ingredient','step']){const key=r.id+':'+kind+':0';context.InnKitchen.change({target:{dataset:{recipeCheck:key},checked:true}});for(const lang of ['he','en'])ok(context.InnKitchen.page(lang).includes('data-recipe-check="'+key+'" checked'),'Checks survive language changes');context.InnKitchen.change({target:{dataset:{recipeCheck:key},checked:false}});ok(!context.InnKitchen.page('en').includes('data-recipe-check="'+key+'" checked'),'Unchecked state survives rendering');}}
ok(!context.InnKitchen.change({target:{dataset:{}}}),'Other form controls remain unaffected');
const code=fs.readFileSync('dist/recipes.js','utf8'),css=fs.readFileSync('dist/recipes.css','utf8');
ok(!/localStorage|sessionStorage|fetch\(|XMLHttpRequest|sendBeacon/.test(code),'No recipe storage or outbound requests');
ok(css.includes('@media print'),'Print layout');ok(css.includes(':focus-visible'),'Keyboard focus');
for(const r of data.recipes)ok(css.includes(`[data-print-recipe="${r.id}"]`),'Individual print selector');
for(const lang of ['he','en']){const html=context.InnKitchen.page(lang);ok(html.includes('data-recipe-jump="tahini-walnut-loaf"'),'Soup to optional bread');ok(html.includes(data.recipes[0].variation[lang]),'Full untested one-bowl variation');ok(html.includes(data.recipes[4].safety[lang]),'Egg safety');ok(html.includes(lang==='he'?'115 דקות':'115 minutes'),'Honest loaf cooling time');ok(!html.includes('source recipe is by Victor Hugo'),'Literary source not called a recipe');}
ok(!code.includes('AggregateRating'),'No misattributed recipe rating schema');
console.log(`PASS: ${checks} recipe checks: HE/EN, primary references, source ratings, original content, accessible checklists, print and privacy.`);
