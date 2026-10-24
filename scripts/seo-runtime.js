'use strict';
window.SiteSEO = {
  image(page,lang='en') {
    const image=page.socialImage||window.SITE_METADATA.pages.home.socialImage;
    return {path:image?.path||'/assets/social-card.png',width:image?.width||1200,height:image?.height||630,type:image?.type||'image/png',alt:image?.alt?.[lang]||(lang==='he'?'LesMisNotes: מדריך עצמאי לעלובי החיים, עם איור מקורי של פריז':'LesMisNotes: an independent Les Misérables guide with an original Paris illustration')};
  },
  structured(lang, route) {
    const m = window.SITE_METADATA, p = window.CharacterProfiles?.metadata(route,window.location?.search||'') || m.pages[route];
    const r = p.canonicalRoute || route;
    const origin = m.origin, canonical = origin ? `${origin}/${lang}/${r}/` : '';
    const type = route === 'about' ? 'AboutPage' : route === 'contact' ? 'ContactPage' : ['watch', 'listening', 'places', 'recipes', 'resources', 'screen', 'special-events', 'sitemap'].includes(route) ? 'CollectionPage' : 'WebPage';
    const image=this.image(p,lang);
    const page = {'@type':type, name:p.title[lang], description:p.description[lang], inLanguage:lang};
    if (origin) Object.assign(page, {'@id':canonical+'#page', url:canonical, isPartOf:{'@id':origin+'/#website'}, primaryImageOfPage:{'@type':'ImageObject', url:origin+image.path, contentUrl:origin+image.path, width:image.width, height:image.height, encodingFormat:image.type, caption:image.alt}});
    const graph = [page];
    if (origin) {
      graph.push({'@type':'WebSite','@id':origin+'/#website',url:origin+'/',name:'LesMisNotes',alternateName:'Les Mis Notes',inLanguage:['he','en'],description:'An independent bilingual fan guide to Victor Hugo’s Les Misérables and the stage musical.', image:origin+'/icon-512.png'});
      const readerTrail=window.CharacterProfiles?.readerTrail(route,{lang,search:window.location?.search||''});
      if(readerTrail)graph.push({'@type':'BreadcrumbList',itemListElement:readerTrail.map((item,index)=>({'@type':'ListItem',position:index+1,name:item.label,item:origin+item.href}))});
      else if (r !== 'home') graph.push({'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:lang==='he'?'בית':'Home',item:origin+'/'+lang+'/home/'},...(['novel-journey','musical-journey'].includes(route)?[{'@type':'ListItem',position:2,name:route==='novel-journey'?(lang==='he'?'הספר':'The novel'):(lang==='he'?'המחזמר':'The musical'),item:origin+'/'+lang+'/'+(route==='novel-journey'?'novel':'musical')+'/'}]:[]),...(route.startsWith('character-')?[{'@type':'ListItem',position:2,name:lang==='he'?'הדמויות ומפת הקשרים':'Characters & connections',item:origin+'/'+lang+'/characters/'}]:[]),{'@type':'ListItem',position:route.startsWith('character-')||route.endsWith('-journey')?3:2,name:p.title[lang],item:canonical}]});
    }
    return {'@context':'https://schema.org','@graph':graph};
  }
};
