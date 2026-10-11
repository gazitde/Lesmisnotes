'use strict';
window.SiteSEO = {
  structured(lang, route) {
    const m = window.SITE_METADATA, p = m.pages[route];
    const r = p.canonicalRoute || route;
    const origin = m.origin, canonical = origin ? `${origin}/${lang}/${r}/` : '';
    const type = route === 'about' ? 'AboutPage' : route === 'contact' ? 'ContactPage' : ['watch', 'listening', 'places', 'recipes', 'resources', 'screen', 'sitemap'].includes(route) ? 'CollectionPage' : 'WebPage';
    const page = {'@type':type, name:p.title[lang], description:p.description[lang], inLanguage:lang};
    if (origin) Object.assign(page, {'@id':canonical+'#page', url:canonical, isPartOf:{'@id':origin+'/#website'}, primaryImageOfPage:{'@type':'ImageObject', url:origin+'/assets/social-card.png', width:1200, height:630}});
    const graph = [page];
    if (origin) {
      graph.push({'@type':'WebSite','@id':origin+'/#website',url:origin+'/',name:'LesMisNotes',alternateName:'Les Mis Notes',inLanguage:['he','en'],description:'An independent bilingual fan guide to Victor Hugo’s Les Misérables and the stage musical.'});
      if (r !== 'home') graph.push({'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:lang==='he'?'בית':'Home',item:origin+'/'+lang+'/home/'},{'@type':'ListItem',position:2,name:p.title[lang],item:canonical}]});
    }
    return {'@context':'https://schema.org','@graph':graph};
  }
};
