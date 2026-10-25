import fs from 'node:fs';
const site = JSON.parse(fs.readFileSync('config/site.json','utf8'));
const originInput = (process.env.SITE_ORIGIN ?? site.origin ?? '').trim();
const wantsPublic = process.env.PUBLIC_SITE === undefined ? site.indexable === true : process.env.PUBLIC_SITE === 'true';
let origin = '';
if (originInput) {
  const url = new URL(originInput);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || (!url.hostname.includes('.') || url.hostname === 'localhost' || url.hostname.endsWith('.localhost') || /^[0-9.]+$/.test(url.hostname) || url.hostname.includes(':')) || /\.(?:local|test|invalid)$/.test(url.hostname)) throw new Error('SITE_ORIGIN must be a bare public HTTPS origin, without a path, credentials, query or fragment.');
  origin = url.origin;
}
const isPublic = wantsPublic && (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'production');
if (isPublic && !origin) throw new Error('Public builds require an explicitly configured SITE_ORIGIN.');
const metadata = {...JSON.parse(fs.readFileSync('config/metadata.json','utf8')), origin, private:!isPublic};
// Use the same committed, bilingual cover for both language variants. No plot
// details or reading progress are encoded into image names or public metadata.
for (const [route, page] of Object.entries(metadata.pages)) {
  if (page.shareCard) {
    const card=page.shareCard, illustration=card.artwork==='book'?{en:'an open book',he:'ספר פתוח'}:card.artwork==='portraits'?{en:'original character portraits',he:'דיוקנאות מקוריים של דמויות'}:{en:'an original Paris illustration',he:'איור מקורי של פריז'};
    page.socialImage={path:route==='home'?'/assets/social-card.png':`/assets/share/${route}.png`,width:1200,height:630,type:'image/png',alt:{en:`LesMisNotes cover: ${card.heading.en.join(' ')} With ${illustration.en}.`,he:`שער LesMisNotes: ${card.heading.he.join(' ')} עם ${illustration.he}.`}};
    delete page.shareCard;
  }
}
// Retired page URLs share their destination's cover and canonical identity.
for (const page of Object.values(metadata.pages)) if(page.canonicalRoute) page.socialImage=metadata.pages[page.canonicalRoute].socialImage;
const profiles = JSON.parse(fs.readFileSync('config/character-profiles.json','utf8'));
for (const p of profiles.profiles) metadata.pages['character-'+p.id] = {
  socialImage: {path:'/assets/characters/'+p.id+'.png',alt:{en:p.name.en+' character guide · LesMisNotes original illustration',he:'מדריך לדמות '+p.name.he+' · איור מקורי של LesMisNotes'}},
  title: p.seo?.title || {he:p.name.he+' בעלובי החיים: דמות מקרוב | LesMisNotes',en:p.name.en+' in Les Misérables: a character profile | LesMisNotes'},
  description: p.seo?.description || {he:p.name.he+': '+p.role.he+'. היכרות עם הדמות ברומן ובמחזמר, מקורות ומפת קשרים. פרטי העלילה והסיום נפתחים לבחירה.',en:p.name.en+': '+p.role.en+'. Explore the character in the novel and musical, with sources and a relationship map. Plot details and the ending open by choice.'}
};
for (const [route, page] of Object.entries(metadata.pages)) {
  const image=page.socialImage;
  if (!image) continue;
  if (!/^\/assets\/[a-z0-9/-]+\.png$/.test(image.path)) throw Error('Invalid local sharing image for '+route);
  const bytes=fs.readFileSync('dist'+image.path);
  if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a') throw Error('Sharing image must be PNG: '+route);
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  if(width!==1200||height!==630) throw Error('Sharing image must be 1200 by 630: '+route);
  Object.assign(image,{width,height,type:'image/png'});
  for(const lang of ['he','en']) if(!image.alt?.[lang]?.trim()) throw Error('Missing localized image description: '+route+'/'+lang);
}
fs.writeFileSync('dist/character-profiles-data.js','window.CHARACTER_PROFILES = '+JSON.stringify(profiles)+';\nwindow.EXTRA_CONTENT = window.EXTRA_CONTENT || {}; window.EXTRA_CONTENT.characterProfiles = window.CHARACTER_PROFILES;\n');
fs.writeFileSync('dist/seo.js', 'window.SITE_METADATA = '+JSON.stringify(metadata)+';\n'+fs.readFileSync('scripts/seo-runtime.js','utf8'));
export default metadata;
