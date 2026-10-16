'use strict';
// Reverse only the independently tested additions, preserving the pre-existing
// archive-story baseline and every unrelated field. See docs/ENRICHMENT_SCOPE.md.
const baseline=require('../fixtures/enrichment-baseline.json');
const newSources=new Set(['hugo-ma-destinee-object','hugo-eddystone-object','hugo-59-projections','gallery-hebrew-9IP6aDolzAo','gallery-hebrew-cJha5xHplr0','screen-2026-ugc','screen-2026-cast','screen-2026-cnc','screen-suddenly-universal','screen-suddenly-oscar']);
function normalizeAuthorizedAdditions(input){
 const x=structuredClone(input);
 delete x.musical.recordingTitleAliases;
 delete x.hugoStageObject.works;
 delete x.hugoStageObject.image.thumbnail;
 const craft=x.musical.creationStory.craft.find(c=>c.id==='hugo-art-onstage');
 craft.body=structuredClone(baseline.hugoArtCraftBody);
 craft.sourceIds=craft.sourceIds.filter(id=>id!=='hugo-59-projections');
 delete x.screenFamilyMap['screen-2026'];
 x.extraSources=x.extraSources.filter(s=>!newSources.has(s.id));
 for(const group of x.sourceGroups)group.sourceIds=group.sourceIds.filter(id=>!newSources.has(id));
 x.gallery.items=x.gallery.items.filter(i=>!['9IP6aDolzAo','cJha5xHplr0'].includes(i.id));
 x.gallery.groups=x.gallery.groups.filter(g=>g.id!=='dreamed-dream-habima');
 Object.assign(x.gallery.groups.find(g=>g.id==='master-house'),structuredClone(baseline.masterHouse));
 for(const list of [x.extraSources,x.musical.sources]){const source=list.find(s=>s.id==='archive-stars-recollections');if(typeof source.label==='object')source.label=source.label.en;}
 return x;
}
module.exports={normalizeAuthorizedAdditions,baseline};
