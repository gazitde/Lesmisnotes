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
const profiles = JSON.parse(fs.readFileSync('config/character-profiles.json','utf8'));
for (const p of profiles.profiles) metadata.pages['character-'+p.id] = {
  title: {he:p.name.he+' בעלובי החיים: דמות מקרוב | LesMisNotes',en:p.name.en+' in Les Misérables: a character profile | LesMisNotes'},
  description: {he:p.name.he+': '+p.role.he+'. היכרות עם הדמות ברומן ובמחזמר, מקורות ומפת קשרים. פרטי העלילה והסיום נפתחים לבחירה.',en:p.name.en+': '+p.role.en+'. Explore the character in the novel and musical, with sources and a relationship map. Plot details and the ending open by choice.'}
};
fs.writeFileSync('dist/character-profiles-data.js','window.CHARACTER_PROFILES = '+JSON.stringify(profiles)+';\nwindow.EXTRA_CONTENT = window.EXTRA_CONTENT || {}; window.EXTRA_CONTENT.characterProfiles = window.CHARACTER_PROFILES;\n');
fs.writeFileSync('dist/seo.js', 'window.SITE_METADATA = '+JSON.stringify(metadata)+';\n'+fs.readFileSync('scripts/seo-runtime.js','utf8'));
export default metadata;
