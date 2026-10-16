'use strict';
window.SiteSEO = {
  image(page,lang='en') {
    return {path:page.socialImage?.path||'/assets/social-card.png',alt:page.socialImage?.alt?.[lang]||(lang==='he'?'LesMisNotes: איור מקורי של דגל אדום מעל פריז':'LesMisNotes: original red-flag illustration above Paris')};
  },
  structured(lang, route) {
    const m = window.SITE_METADATA, p = window.CharacterProfiles?.metadata(route,window.location?.search||'') || m.pages[route];
    const r = p.canonicalRoute || route;
    const origin = m.origin, canonical = origin ? `${origin}/${lang}/${r}/` : '';
    const type = route === 'about' ? 'AboutPage' : route === 'contact' ? 'ContactPage' : ['watch', 'listening', 'places', 'recipes', 'resources', 'screen', 'sitemap'].includes(route) ? 'CollectionPage' : 'WebPage';
    const page = {'@type':type, name:p.title[lang], description:p.description[lang], inLanguage:lang};
    if (origin) Object.assign(page, {'@id':canonical+'#page', url:canonical, isPartOf:{'@id':origin+'/#website'}, primaryImageOfPage:{'@type':'ImageObject', url:origin+this.image(p,lang).path, width:1200, height:630}});
    const graph = [page];
    if (origin) {
      graph.push({'@type':'WebSite','@id':origin+'/#website',url:origin+'/',name:'LesMisNotes',alternateName:'Les Mis Notes',inLanguage:['he','en'],description:'An independent bilingual fan guide to Victor Hugo’s Les Misérables and the stage musical.'});
      const readerTrail=window.CharacterProfiles?.readerTrail(route,{lang,search:window.location?.search||''});
      if(readerTrail)graph.push({'@type':'BreadcrumbList',itemListElement:readerTrail.map((item,index)=>({'@type':'ListItem',position:index+1,name:item.label,item:origin+item.href}))});
      else if (r !== 'home') graph.push({'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:lang==='he'?'בית':'Home',item:origin+'/'+lang+'/home/'},...(route.startsWith('character-')?[{'@type':'ListItem',position:2,name:lang==='he'?'הדמויות ומפת הקשרים':'Characters & connections',item:origin+'/'+lang+'/characters/'}]:[]),{'@type':'ListItem',position:route.startsWith('character-')?3:2,name:p.title[lang],item:canonical}]});
    }
    return {'@context':'https://schema.org','@graph':graph};
  }
};
