/* Dedicated character reading, with chapter-bounded identity views. No storage. */
(function(root){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const local=(v,lang)=>typeof v==='object'&&v?(v[lang]||v.en||''):v||'';
  const data=()=>root.CHARACTER_PROFILES||{profiles:[]};
  const all=()=>data().profiles||[];
  const get=id=>all().find(p=>p.id===id);
  const routeId=route=>typeof route==='string'&&route.startsWith('character-')&&get(route.slice(10))?route.slice(10):null;
  const chapters=()=>root.EXTRA_CONTENT?.chapterCompanion?.chapters||root.RESEARCH?.chapterCompanion?.chapters||[];
  function readerContext(route,search=''){
    if(!routeId(route))return null;
    const q=new URLSearchParams(search);if(!q.has('reader'))return null;
    const requested=q.get('reader'),chapter=q.getAll('reader').length===1?chapters().find(c=>c.id===requested):null;
    return {requested,chapter:chapter||null};
  }
  function reached(profile,chapter){
    const first=chapters().find(c=>c.id===profile?.firstAppearance?.chapterId);
    return Boolean(first&&chapter&&Number.isSafeInteger(chapter.ordinal)&&chapter.ordinal>=first.ordinal);
  }
  function href(id,{lang='en',reader=null,full=false}={}){
    if(!get(id))return null;
    if(reader!==null){const c=chapters().find(c=>c.id===reader);if(!reached(get(id),c))return null;}
    return `/${lang==='he'?'he':'en'}/character-${id}/`+(reader!==null?'?reader='+encodeURIComponent(reader):full?'?view=full':'');
  }
  function link(id,text,options={}){
    const u=href(id,options);return u?`<a class="${esc(options.className||'character-name-link')}" data-profile-link href="${esc(u)}">${esc(text||local(get(id).name,options.lang||'en'))}</a>`:esc(text||'');
  }
  // Only explicit reviewed name tokens are eligible. Never scan arbitrary people,
  // sources, actors, aliases or translated prose for guessed identities.
  function inlineNames(text,{lang='en',reader=null,mentions=[]}={}){
    const value=String(text??''),segments=[];const used=new Set();
    for(const item of mentions){
      if(!item||used.has(item.id)||typeof item.name!=='string'||!item.name||!get(item.id))continue;
      if(!(get(item.id).nameTokens?.[lang]||[local(get(item.id).name,lang)]).includes(item.name))continue;
      if(!href(item.id,{lang,reader}))continue;
      // This alias is a plot revelation even when the canonical person appeared earlier.
      if(item.id==='valjean'&&/madeleine|מדלן|מדליין/i.test(item.name)){
        const reveal=chapters().find(c=>c.id==='p1-b7-c3'),current=chapters().find(c=>c.id===reader);
        if(reader!==null&&(!current||!reveal||current.ordinal<reveal.ordinal))continue;
      }
      let start=value.indexOf(item.name);
      while(start!==-1){
        const before=value.slice(0,start).at(-1)||'',after=value.slice(start+item.name.length)[0]||'';
        // Hebrew prepositions attach to reviewed names; keep the prefix outside the link.
        const prefix=lang==='he'?(value.slice(0,start).match(/[\p{L}]+$/u)?.[0]||''):'';
        const boundary=!/[\p{L}\p{N}]/u.test(before)||(lang==='he'&&!/[\p{L}\p{N}]/u.test(value.slice(0,start-prefix.length).at(-1)||'')&&['ו','ב','ל','כ','מ','ש','ה','וב','ול','וכ','ומ','וש','וה','שה','של','כש','שב','שמ'].includes(prefix));
        if(boundary&&!/[\p{L}\p{N}]/u.test(after)&&!segments.some(s=>start<s.end&&start+item.name.length>s.start))break;
        start=value.indexOf(item.name,start+item.name.length);
      }
      if(start<0)continue;
      segments.push({start,end:start+item.name.length,id:item.id,name:item.name});used.add(item.id);
    }
    segments.sort((a,b)=>a.start-b.start);let cursor=0,out='';
    for(const s of segments){out+=esc(value.slice(cursor,s.start))+link(s.id,s.name,{lang,reader});cursor=s.end;}
    return out+esc(value.slice(cursor));
  }
  function chapterNames(text,{lang='en',reader}={}){
    return inlineNames(local(text,lang),{lang,reader,mentions:(data().chapterMentions?.[reader]||[]).map(m=>({id:m.id,name:local(m.name,lang)}))});
  }
  function retainedHref(route,search,lang){
    const id=routeId(route);if(!id)return null;
    const q=new URLSearchParams(search||''),base=`/${lang}/character-${id}/`;
    if(q.has('reader'))return base+'?'+q.getAll('reader').map(value=>'reader='+encodeURIComponent(value)).join('&');
    return base+(q.get('view')==='full'?'?view=full':'');
  }
  function readerTrail(route,{search='',lang='en'}={}){
    const ctx=readerContext(route,search);if(!ctx)return null;
    const p=get(routeId(route)),c=ctx.chapter,he=lang==='he';
    const trail=[{label:he?'בית':'Home',href:`/${lang}/home/`},{label:he?'הספר המקורי':'Novel',href:`/${lang}/novel/`}];
    if(c)trail.push(
      {label:he?'חלק '+c.part:'Part '+c.part,href:`/${lang}/novel/?focus=${encodeURIComponent('part:p'+c.part)}`},
      {label:he?'ספר '+c.book:'Book '+c.book,href:`/${lang}/novel/?focus=${encodeURIComponent('book:'+c.bookId)}`},
      {label:he?'פרק '+c.chapter:'Chapter '+c.chapter,href:`/${lang}/novel/?focus=${encodeURIComponent('chapter:'+c.id)}`}
    );
    trail.push({label:reached(p,c)?local(p.name,lang):(he?'דמות':'Character'),href:retainedHref(route,search,lang),current:true});
    return trail;
  }
  function readerBreadcrumbs(route,lang,search){
    const trail=readerTrail(route,{lang,search});if(!trail)return '';
    return `<nav class="breadcrumb" aria-label="${lang==='he'?'נתיב ניווט':'Breadcrumb'}"><ol>${trail.map(item=>`<li>${item.current?`<span aria-current="page">${esc(item.label)}</span>`:`<a data-profile-link href="${esc(item.href)}">${esc(item.label)}</a>`}</li>`).join('')}</ol></nav>`;
  }
  function metadata(route,search){
    const ctx=readerContext(route,search);if(!ctx)return null;
    const p=get(routeId(route)),known=reached(p,ctx.chapter);
    return {title:{he:(known?p.name.he:'דמות במלווה הקריאה')+' · LesMisNotes',en:(known?p.name.en:'Reading companion character')+' · LesMisNotes'},description:known?p.readerIdentity:{he:'זהות הדמות נשארת סגורה עד למקום שבו היא מופיעה ברומן.',en:'This character’s identity stays closed until their place in the novel.'}};
  }
  function directory(lang='en'){
    const he=lang==='he';return `<section class="profile-directory" aria-labelledby="profile-directory-title"><div><h2 id="profile-directory-title">${he?'דף אישי לכל דמות':'A page for each character'}</h2><p>${he?'מהמפה אל הסיפור האישי, עם עומק לבחירה.':'From the map to each person’s story, with optional deeper reading.'}</p></div><ul>${all().map(p=>`<li>${link(p.id,local(p.name,lang),{lang})}</li>`).join('')}</ul></section>`;
  }
  function novelAddition(p,lang){
    const n=p.novelAdds;if(!n)return '';const he=lang==='he',L=v=>esc(local(v,lang));
    return `<section class="profile-novel-adds" id="novel-adds" aria-labelledby="novel-adds-title"><h2 id="novel-adds-title">${L(n.title)}</h2>${n.paragraphs.map(x=>`<p>${L(x.text)}</p>`).join('')}<nav class="profile-chapter-links" aria-label="${he?'הפרקים הקשורים במלווה הקריאה':'Related reading-companion chapters'}"><h3>${he?'אל הפרקים בספר':'Explore these chapters'}</h3><ul>${n.references.map(r=>`<li><a data-profile-link href="${L(r.href)}">${L(r.label)}</a></li>`).join('')}</ul></nav><details class="profile-primary-sources"><summary>${he?'הפרקים בטקסט של הוגו':'Original chapters in Hugo’s text'}</summary><ul>${n.references.map(r=>`<li><a href="${esc(r.sourceUrl)}" target="_blank" rel="noopener noreferrer">${L(r.label)}<span class="sr-only">${he?' (נפתח בלשונית חדשה)':' (opens in a new tab)'}</span></a></li>`).join('')}</ul></details></section>`;
  }
  function page({id,lang='en',search='',spoiler=false,bookmark='',icon='',songs=[],relationships=[]}={}){
    const p=get(id);if(!p)return '';
    const he=lang==='he',t=(h,e)=>he?h:e,L=v=>esc(local(v,lang)),ctx=readerContext('character-'+id,search);
    if(ctx){
      const known=reached(p,ctx.chapter),chapter=ctx.chapter;
      const back=chapter?`/${lang}/novel/?focus=${encodeURIComponent('chapter:'+chapter.id)}`:`/${lang}/novel/`;
      const label=chapter?t(`חלק ${chapter.part} · ספר ${chapter.book} · פרק ${chapter.chapter}`,`Part ${chapter.part} · Book ${chapter.book} · Chapter ${chapter.chapter}`):t('מלווה הקריאה','the reading companion');
      return `<section class="page-top character-profile-reader-top"><div class="wrap">${readerBreadcrumbs('character-'+id,lang,search)}<div class="eyebrow">${t('לצד הפרק שקוראים','BESIDE YOUR CURRENT CHAPTER')}</div><h1>${known?L(p.name):chapter?t('עוד לא פגשנו את הדמות כאן','We have not met this person here yet'):t('היכרות לפי נקודת הקריאה','An introduction for your reading point')}</h1></div></section><div class="wrap section character-profile reader-character-profile" data-profile-reader="${esc(chapter?.id||'invalid')}">${known?`<p class="reader-character-identity">${L(p.readerIdentity)}</p>`:`<p>${chapter?t('פרטי הדמות נשארים סגורים לפי נקודת הקריאה הזאת.','This character’s details stay closed at this reading point.'):t('כדי להציג את הזהות הבטוחה לפרק, פתחו קישור תקין מן הפרק כשה־JavaScript פעיל. פרטי הדמות נשארים סגורים עד אז.','To show the identity that is safe for your chapter, open a valid chapter link with JavaScript enabled. Character details stay closed until then.')}</p>`}<p class="profile-scope-note">${t('רק הזהות והתפקיד בנקודת הקריאה הזאת. פרטים מאוחרים נשארים סגורים.','Only the identity and role known at this chapter. Later details stay hidden.')}</p><div class="button-row"><a class="btn" data-profile-link href="${back}">${t('חזרה אל ','Return to ')}${esc(label)}</a></div>${known?`<aside class="profile-reader-exit">${link(id,t('לפתוח את הדף המלא · כולל הסיום','Open the full profile · includes the ending'),{lang,full:true,className:'text-link'})}</aside>`:''}</div>`;
    }
    const full=spoiler||new URLSearchParams(search).get('view')==='full';
    const related=(p.relationshipIds||[]).map(id=>relationships.find(r=>r.id===id)).filter(Boolean).map(r=>get(r.from===p.id?r.to:r.from)).filter(Boolean);
    const map=`/${lang}/characters/?person=${encodeURIComponent(id)}&view=all#relationship-map`;
    return `<section class="page-top character-profile-top"><div class="wrap"><div class="page-top-tools"><nav class="breadcrumb" aria-label="${t('נתיב ניווט','Breadcrumb')}"><ol><li><a href="/${lang}/home/">${t('בית','Home')}</a></li><li><a href="/${lang}/characters/">${t('הדמויות ומפת הקשרים','Characters & connections')}</a></li><li><span aria-current="page">${L(p.name)}</span></li></ol></nav>${bookmark}</div><div class="eyebrow">${t('דמות מקרוב','A CHARACTER IN FOCUS')}</div><div class="profile-heading"><div><h1>${L(p.name)}</h1><p class="profile-role">${L(p.role)}</p></div>${icon?`<span class="profile-emblem" aria-hidden="true">${icon}</span>`:''}</div></div></section><div class="wrap section character-profile" data-profile-id="${esc(id)}"><a class="text-link profile-map-return" data-profile-link href="${map}">${t('למפת הקשרים של ','See the connections around ')}${L(p.name)} <span aria-hidden="true">${he?'←':'→'}</span></a><article class="profile-prose" aria-label="${t('על הדמות','About this character')}"><p class="profile-intro">${L(p.safeIntro)}</p>${full?`<div class="profile-spoiler-banner"><span>${t('המשך הדף כולל את העלילה המלאה ואת הסיום.','The rest of this profile includes the full plot and ending.')}</span><button class="text-button" data-profile-hide>${t('להסתיר את ההמשך','Hide the rest')}</button></div><div class="profile-full-prose">${p.paragraphs.map(x=>`<p>${L(x)}</p>`).join('')}</div>${novelAddition(p,lang)}`:`<div class="profile-gate"><h2>${t('רוצים להכיר לעומק?','Ready to look closer?')}</h2><p>${t('להעמיק בבחירות של הדמות ובמעבר מן הרומן לבמה.','Explore this person’s choices and the journey from novel to stage.')}</p>${link(id,t('לפתוח את הסיפור המלא · כולל הסיום','Read the full story · includes the ending'),{lang,full:true,className:'btn'})}</div>`}</article>${full?`<div class="profile-next"><section><h2>${t('הקשרים של הדמות','This person’s connections')}</h2><p><a data-profile-link href="${map}">${t('לפתוח את הדמות במפת הקשרים','Open this person in the relationship map')}</a></p><ul>${related.map(x=>`<li>${link(x.id,local(x.name,lang),{lang})}</li>`).join('')}</ul></section>${(p.songIds||[]).some(x=>songs.some(s=>s.id===x))?`<section><h2>${t('להקשיב לדמות','Listen to the character')}</h2><ul>${p.songIds.map(id=>songs.find(s=>s.id===id)).filter(Boolean).map(s=>`<li><a data-profile-link href="/${lang}/musical/?focus=${encodeURIComponent('song:'+s.id)}&view=journey">${L(s.title)}</a></li>`).join('')}</ul></section>`:''}<section class="profile-references"><h2>${t('מקורות להעמקה · כוללים ספוילרים','Read further · sources contain spoilers')}</h2><ul>${(p.references||[]).filter(r=>!/^https?:\/\/(?:www\.)?mtishows\.(?:com|co\.uk)(?:\/|$)/i.test(r.url)).map(r=>`<li><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${L(r.label)}<span class="sr-only">${t(' (נפתח בלשונית חדשה)',' (opens in a new tab)')}</span></a></li>`).join('')}</ul></section></div>`:''}</div>`;
  }
  root.CharacterProfiles={all,get,routeId,readerContext,reached,href,link,inlineNames,chapterNames,retainedHref,readerTrail,metadata,directory,page};
})(window);
