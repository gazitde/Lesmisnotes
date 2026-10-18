/* Local bilingual content search. Queries never leave this module or enter URLs/storage. Optional analytics receives only fixed categories and result counts. */
(function (root) {
  'use strict';
  const LANGS = ['he', 'en'];
  const CATEGORIES = {
    all: { he: 'הכול', en: 'All' }, pages: { he: 'עמודים', en: 'Pages' },
    story: { he: 'הסיפור והספר', en: 'Story & novel' }, characters: { he: 'דמויות', en: 'Characters' },
    songs: { he: 'שירים וביצועים', en: 'Songs & performances' }, places: { he: 'מקומות', en: 'Places' },
    history: { he: 'היסטוריה והוגו', en: 'History & Hugo' }, recipes: { he: 'מתכונים', en: 'Recipes' },
    ideas: { he: 'דילמות', en: 'Dilemmas' }
  };
  const COPY = {
    he: { open: 'חיפוש באתר', title: 'מה מסקרן אתכם?', label: 'חיפוש במדריך', placeholder: 'דמות, שיר, מקום או שאלה…', close: 'סגירת החיפוש', clear: 'ניקוי החיפוש', filters: 'סינון לפי נושא', local: 'החיפוש פועל כאן בדפדפן. השאילתות אינן נשמרות או נשלחות.', safe: 'ספוילרים מוסתרים. החיפוש אינו משתמש בפרטי עלילה נעולים.', spoilers: 'ספוילרים פתוחים. אזורי הקריאה הנפרדים נפתחים לפי הבחירות שלכם.', start: 'חפשו גם בתוך ההסברים, ההיסטוריה והמתכונים.', examples: 'אפשר להתחיל כאן', empty: 'לא נמצאו תוצאות בבחירה הזאת.', help: 'נסו פחות מילים, איות אחר או נושא אחר. אפשר לחפש בעברית ובאנגלית.', unavailable: 'החיפוש המקומי לא נטען. אפשר להמשיך דרך מפת האתר.', retry: 'לנסות שוב', sitemap: 'למפת האתר', count: n => n === 1 ? '1 תוצאה' : `${n} תוצאות`, showing: (n, total) => `מוצגות ${n} מתוך ${total} תוצאות`, more: 'עוד תוצאות', locked: 'פרטי העלילה נפתחים רק לפי בחירת הספוילרים שלכם.', titleOnly: 'התאמה בשם. המשיכו לעמוד כדי לקרוא לפי בחירת הספוילרים שלכם.', keyboard: 'Tab למעבר בין האפשרויות. חץ למטה לתוצאות. Escape לסגירה.', otherLanguage: 'התאמה גם בשפה השנייה', noneAvailable: 'אין כרגע תוכן לחיפוש בנושא הזה.', prompt: 'הקלידו מילה או שתיים כדי להתחיל.' },
    en: { open: 'Search the guide', title: 'What are you curious about?', label: 'Search this guide', placeholder: 'A character, song, place or question…', close: 'Close search', clear: 'Clear search', filters: 'Filter by topic', local: 'Search runs in your browser. Queries are never stored or sent.', safe: 'Spoilers are hidden. Search does not use locked plot details.', spoilers: 'Spoilers are on. Separate reading areas still follow your choices.', start: 'Search inside the explanations, history and recipes, too.', examples: 'Try a starting point', empty: 'No results in this selection.', help: 'Try fewer words, a different spelling or another topic. Hebrew and English both work.', unavailable: 'Local search could not load. You can still use the site map.', retry: 'Try again', sitemap: 'Open the site map', count: n => n === 1 ? '1 result' : `${n} results`, showing: (n, total) => `Showing ${n} of ${total} results`, more: 'More results', locked: 'Plot details open only according to your spoiler choice.', titleOnly: 'Name match. Continue to the page to read according to your spoiler choice.', keyboard: 'Tab through the controls. Down arrow moves to results. Escape closes.', otherLanguage: 'Also matched in the other language', noneAvailable: 'There is no searchable content in this topic yet.', prompt: 'Type a word or two to start.' }
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Geresh/apostrophes join transliterated names; other punctuation separates words.
  function folded(value, offsets = false) {
    let text = '', positions = [], original = String(value ?? ''), offset = 0;
    for (const char of original) {
      const start = offset; offset += char.length;
      let fragment = char.normalize('NFKD').toLowerCase().replace(/[\p{M}]/gu, '').replace(/[\u05f3\u05f4'’‘"`]/gu, '');
      fragment = fragment.replace(/[^\p{L}\p{N}]/gu, ' ');
      for (const part of fragment) {
        if (part === ' ' && (!text || text.endsWith(' '))) continue;
        text += part;
        if (offsets) positions.push([start, offset]);
      }
    }
    return { text: text.trim(), positions };
  }
  const normalize = value => folded(value).text;
  const local = (value, lang) => {
    if (Array.isArray(value)) return value.map(v => local(v, lang)).filter(Boolean).join(' ');
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (value && typeof value === 'object') return local(value[lang] ?? value.en ?? '', lang);
    return '';
  };
  const pair = (...values) => Object.fromEntries(LANGS.map(lang => [lang, values.map(v => local(v, lang)).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()]));
  const CHARACTER_ALIASES = {
    valjean: ['24601', 'Jean Valjean', 'Valjean', 'ז׳אן ולז׳אן', 'ולזאן'],
    javert: ['Javert', 'ז׳אבר', 'זאבר'], eponine: ['Éponine', 'Eponine', 'אפונין'],
    thenardiers: ['Thénardier', 'Thénardiers', 'Thenardier', 'טנארדייה', 'תנרדייה', 'ת׳נרדייה'],
    bishop: ['Bishop of Digne', 'Myriel', 'בישוף', 'דיניה'],
    cosette: ['Cosette', 'Cosset', 'Cossette', 'קוזט', 'קוסט']
  };
  // Editorially reviewed song names only. Do not derive safe titles or aliases
  // from scene headings: some combine a song name with an arrest, death or outcome.
  // Unknown/new song IDs fail closed until their bilingual names are reviewed.
  const SAFE_SONG_NAMES = {
    'work-song': ['Prologue: Overture / Work Song', 'פרולוג: פתיחה ושיר העבודה'],
    'what-have-i-done': ['What Have I Done? · Valjean’s Soliloquy', 'מה עשיתי? · המונולוג של ולז׳אן'],
    'end-of-day': ['At the End of the Day', 'בסוף היום'],
    'dreamed-dream': ['I Dreamed a Dream', 'חלמתי חלום'],
    'docks': ['The Docks · Lovely Ladies', 'הרציפים · Lovely Ladies'],
    'who-am-i': ['Who Am I?', 'מי אני?'],
    'come-to-me': ['Come to Me', 'בואי אליי'],
    'confrontation': ['The Confrontation', 'העימות'],
    'castle-cloud': ['Little Cosette · Castle on a Cloud', 'קוזט הקטנה · טירה על ענן'],
    'master-house': ['The Innkeeper’s Song · Master of the House', 'שיר הפונדקאי · אדון הבית'],
    'bargain': ['The Bargain · Thénardier Waltz of Treachery', 'העסקה · הוואלס של בני הזוג תנרדייה'],
    'beggars': ['The Beggars · Look Down', 'הקבצנים · Look Down'],
    'stars': ['Stars', 'כוכבים'],
    'red-black': ['The ABC Café · Red and Black', 'קפה ABC · אדום ושחור'],
    'people-sing': ['The People’s Song · Do You Hear the People Sing?', 'שיר העם · האם אתם שומעים את העם שר?'],
    'in-my-life': ['Rue Plumet · In My Life', 'רחוב פלומה · בחיי'],
    'heart-love': ['A Heart Full of Love', 'לב מלא אהבה'],
    'attack-rue-plumet': ['Attack on Rue Plumet', 'ההתקפה ברחוב פלומה'],
    'one-day-more': ['One Day More', 'עוד יום אחד'],
    'building-barricade': ['Building the Barricade · Upon These Stones', 'בניית המתרס · על האבנים האלה'],
    'on-my-own': ['On My Own', 'לבדי'],
    'javert-barricade': ['Little People', 'Little People'],
    'little-fall-rain': ['A Little Fall of Rain', 'מעט גשם'],
    'first-attack': ['The First Attack', 'ההתקפה הראשונה'],
    'drink-with-me': ['Drink With Me', 'שתו איתי'],
    'bring-him-home': ['Bring Him Home', 'השב אותו הביתה'],
    'second-attack': ['Dawn / The Second Attack', 'שחר וההתקפה השנייה'],
    'final-battle': ['The Final Battle', 'הקרב האחרון'],
    'sewers': ['The Sewers · Dog Eats Dog', 'הביוב · Dog Eats Dog'],
    'javert-soliloquy': ['Javert’s Soliloquy', 'המונולוג של ז׳אבר'],
    'turning': ['Turning', 'מסתובב שוב'],
    'empty-chairs': ['The Café Song · Empty Chairs at Empty Tables', 'שיר בית הקפה · כיסאות ריקים ליד שולחנות ריקים'],
    'every-day': ['Every Day / A Heart Full of Love · Reprise', 'מדי יום / לב מלא אהבה · חזרה'],
    'valjean-confession': ['Valjean’s Confession', 'וידויו של ולז׳אן'],
    'wedding': ['Wedding Chorale · The Wedding', 'מקהלת החתונה · החתונה'],
    'beggars-feast': ['Beggars at the Feast', 'קבצנים במשתה'],
    'epilogue': ['Epilogue / Finale', 'אפילוג וסיום']
  };
  function safeSongTitle(song) {
    const names = song && Object.hasOwn(SAFE_SONG_NAMES, song.id) ? SAFE_SONG_NAMES[song.id] : null;
    return names ? { en: names[0], he: names[1] } : null;
  }
  // Reader coordinates have a separate exact-match path. Only the canonical
  // numeral spellings used by this 365-chapter edition are accepted (1–24).
  // Existence is checked against the actual indexed Part, Book or Chapter.
  const ROMAN_COORDINATES = ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx', 'xxi', 'xxii', 'xxiii', 'xxiv'];
  const HEBREW_COORDINATES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'יא', 'יב', 'יג', 'יד', 'טו', 'טז', 'יז', 'יח', 'יט', 'כ', 'כא', 'כב', 'כג', 'כד'];
  function coordinateNumber(token) {
    if (/^\d+$/.test(token)) { const n = Number(token); return Number.isSafeInteger(n) && n > 0 ? n : null; }
    const roman = ROMAN_COORDINATES.indexOf(token);
    if (roman > 0) return roman;
    if (!/^(?:[א-ת]+|[א-ת]['׳]|[א-ת]+["״][א-ת])$/u.test(token)) return null;
    const hebrew = HEBREW_COORDINATES.indexOf(token.replace(/['׳"״]/g, ''));
    return hebrew > 0 ? hebrew : null;
  }
  function readerQuery(query) {
    const raw = String(query ?? '').normalize('NFKC').toLowerCase().replace(/[\u0591-\u05bd\u05bf-\u05c7\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').trim();
    const patterns = [
      ['chapter', /^p(\d+)\s*-\s*b(\d+)\s*-\s*c(\d+)$/],
      ['chapter', /^part\s+([^\s,·]+)\s*[,·]?\s+book\s+([^\s,·]+)\s*[,·]?\s+chapter\s+([^\s,·]+)$/],
      ['chapter', /^חלק\s+([^\s,·]+)\s*[,·]?\s+ספר\s+([^\s,·]+)\s*[,·]?\s+פרק\s+([^\s,·]+)$/],
      ['chapter', /^(\d+)\s*\.\s*(\d+)\s*\.\s*(\d+)$/],
      ['book', /^p(\d+)\s*-\s*b(\d+)$/],
      ['book', /^part\s+([^\s,·]+)\s*[,·]?\s+book\s+([^\s,·]+)$/],
      ['book', /^חלק\s+([^\s,·]+)\s*[,·]?\s+ספר\s+([^\s,·]+)$/],
      ['book', /^(\d+)\s*\.\s*(\d+)$/],
      ['part', /^p(\d+)$/],
      ['part', /^(?:part|חלק)\s*(\d+)$/],
      ['part', /^part\s+([ivxlcdm]+)$/],
      ['part', /^חלק\s+([א-ת'׳"״]+)$/u]
    ];
    for (const [kind, pattern] of patterns) {
      const match = raw.length <= 180 && raw.match(pattern);
      if (match) {
        const numbers = match.slice(1).map(coordinateNumber);
        return { kind, key: numbers.every(n => n !== null) ? numbers.map((n, i) => ['p', 'b', 'c'][i] + n).join('-') : null };
      }
    }
    const looksLikeCoordinate = /^p\s*[+-]?\d/.test(raw)
      || /^(?:part|חלק)\s*[:+-]?\d/.test(raw)
      || /^(?:part|חלק)(?:\s|:).*(?:book|ספר)(?:\s|:)/.test(raw)
      || /^[+-]?\d[\d\s.+-]*\./.test(raw)
      || /^part\s+[ivxlcdm]+(?:\s|$)/.test(raw)
      || /^חלק\s+[א-ת'׳"״]+(?:\s|$)/u.test(raw);
    return looksLikeCoordinate ? { key: null } : null;
  }
  const routeKinds = { character: 'characters', story: 'story', novel: 'novel', part: 'novel', book: 'novel', chapter:'novel', recording:'musical', adaptation:'screen', song: 'musical', atlas: 'map', history: 'history', context: 'history', author: 'hugo', recipe: 'recipes', dilemma: 'ideas', hugo: 'hugo', craft: 'musical', israel: 'israel', watch: 'watch', extra: 'after' };
  function hrefFor(doc, lang) {
    if (doc.kind === 'characterdetail') return `/${lang}/characters/?focus=${encodeURIComponent('character:'+doc.key)}`;
    if (doc.kind === 'character' && doc.route === 'character-'+doc.key) return `/${lang}/character-${encodeURIComponent(doc.key)}/`;
    if (doc.kind === 'place') return `/${lang}/places/?place=${encodeURIComponent(doc.key)}`;
    if (doc.kind === 'performance') return `/${lang}/listening/?clip=${encodeURIComponent(doc.key)}`;
    return `/${lang}/${doc.route}/` + (routeKinds[doc.kind] ? `?focus=${encodeURIComponent(doc.kind + ':' + doc.key)}` : '');
  }
  function sourceBundle() { return { research: root.RESEARCH, extra: root.EXTRA_CONTENT, places: root.PLACE_CONTENT, recipes: root.RECIPE_CONTENT, metadata: root.SITE_METADATA }; }
  // Explicit field selection is intentional. Never recursively index source records:
  // they also contain hidden outcomes, quiz answers, editorial notes and credit URLs.
  function buildIndex(input = sourceBundle(), permissions = {}) {
    const R = { ...(input.research || {}), ...(input.extra || {}) }, out = [];
    const spoilers = permissions.spoiler === true, novel = spoilers && permissions.novelConsent === true, after = spoilers && permissions.afterConsent === true;
    function add(kind, key, route, category, title, body, aliases = [], locked = false, titleOnly = false) {
      if (!title || !local(title, 'en')) return;
      const doc = { id: `${kind}:${key}`, kind, key: String(key), route, category, title: pair(title), body: pair(body), aliases: aliases.map(v => local(v, 'en')).join(' '), locked, titleOnly };
      doc.search = Object.fromEntries(LANGS.map(lang => [lang, { title: normalize(doc.title[lang]), body: normalize(doc.body[lang]) }]));
      doc.aliasSearch = normalize(doc.aliases);
      out.push(doc);
    }
    for (const [route, page] of Object.entries(input.metadata?.pages || {})) {
      if (page.canonicalRoute || route.startsWith('character-')) continue;
      add('page', route, route, 'pages', input.labels?.[route] || page.title, route === 'special-events' ? pair(page.description, (R.specialEvents || []).map(e => pair(e.title, e.date, e.format, e.paragraphs, e.cast)), '10th 25th 40th anniversary concert album') : input.pageHints?.[route] || page.description);
    }
    const characterProfile=id=>R.characterProfiles?.profiles?.find(p=>p.id===id);
    for (const c of R.characters || []) {
      const profile=characterProfile(c.id), details=pair(c.role,c.summary,c.question,c.context?.sentences,(c.canonNotes||[]).map(n=>pair(n.title,n.paragraphs)),(c.connections||[]).map(x=>x.label),(R.relationships||[]).filter(e=>e.from===c.id||e.to===c.id).map(e=>pair(e.label,e.context,e.canonNote)));
      add('character',c.id,profile?'character-'+c.id:'characters','characters',c.name,
        profile ? pair(profile.safeIntro,(profile.safeFacts||[]).map(f=>pair(f.title,f.text)),spoilers?pair(profile.paragraphs,profile.novelAdds?.title,(profile.novelAdds?.paragraphs||[]).map(x=>x.text)):[]) : spoilers ? details : pair(c.safeIntro,c.id==='valjean'?R.safe24601?.body:'',(R.relationships||[]).filter(e=>e.spoilerLevel===0&&(e.from===c.id||e.to===c.id)).map(e=>pair(e.safeLabel,e.safeContext))),
        [c.id,...(CHARACTER_ALIASES[c.id]||[]),...(profile?.nameTokens?.en||[]),...(profile?.nameTokens?.he||[])],false);
      if(profile&&spoilers)add('characterdetail',c.id,'characters','characters',{en:local(c.name,'en')+' · Connections and context',he:local(c.name,'he')+' · קשרים והקשר'},details);
    }
    if (spoilers) for (const s of R.story || []) add('story', s.id, 'story', 'story', s.title, pair(s.period, s.summary, s.detail, s.songs));
    for(const p of R.readingLocator?.parts||[])if(Number.isSafeInteger(p.part)&&p.part>=1&&p.part<=5)add('part','p'+p.part,'novel','story',p.label,{en:'Open this Part and choose one of its Books.',he:'עברו לחלק הזה ובחרו את הספר שתרצו לקרוא.'},['part '+p.part,'חלק '+p.part]);
    for(const p of R.readingLocator?.parts||[])for(const b of p.books)add('book',b.id,'novel','story',b.label,{en:'Open this Book and choose a chapter.',he:'עברו לספר הזה ובחרו פרק לקריאה.'},['reading alongside','מלווה קריאה']);
    for (const c of R.chapterCompanion?.chapters || []) {
      if (![c.part, c.book, c.chapter].every(n => Number.isSafeInteger(n) && n > 0) || c.id !== `p${c.part}-b${c.book}-c${c.chapter}`) continue;
      add('chapter', c.id, 'novel', 'story', { en: `Part ${c.part} · Book ${c.book} · Chapter ${c.chapter}`, he: `חלק ${c.part} · ספר ${c.book} · פרק ${c.chapter}` },
        { en: 'Open the reading companion at this chapter.', he: 'עברו למלווה הקריאה בפרק הזה.' });
    }
    if (novel) for (const s of R.novel?.milestones || []) add('novel', s.id, 'novel', 'story', s.title, pair(s.dateLabel, s.summary, s.details, s.remember));
    for(const c of R.adaptationComparison?.cards||[])add('adaptation',c.id,'screen','songs',pair(c.year,c.title),pair(c.format,c.cast.map(x=>pair(x.role,x.performer)),c.difference),[c.id]);
    for(const c of R.recordingChooser?.cards||[])add('recording',c.id,'musical','songs',c.title,pair(c.year,c.format,c.cast,c.paragraphs||c.reason,c.prompt,(c.options||[]).map(o=>pair(o.format,o.access,o.storefront,o.note))),[c.id]);
    for (const c of R.musical?.creationStory?.craft || []) add('craft', c.id, 'musical', 'songs', c.title, c.body, [c.id]);
    for (const c of R.israel?.sections || []) add('israel', c.id, 'israel', 'songs', c.title, c.paragraphs, ['Israel','ישראל']);
    for (const g of R.israel?.castGroups || []) for (const c of g.cards) add('israel', 'cast-'+c.id, 'israel', 'songs', c.name, pair(c.role,g.title), ['Israel','ישראל']);
    for (const c of R.israel?.novelTranslations?.items || []) add('israel', 'book-'+c.id, 'israel', 'story', c.name, pair(c.edition,c.body), ['Hebrew','עברית']);
    for (const c of R.watch?.cards || []) add('watch', c.id, 'watch', 'songs', c.title, pair(c.paragraphs,c.statusLabel,c.location), [c.id]);
    const spotlight = R.musical?.spotlight?.songs || [], songEntries = R.musical?.songentries || [];
    const coachReading=id=>pair((R.coachVideos||[]).filter(v=>v.songId===id&&v.showWithSong!==false).map(v=>pair(v.title,v.coach.name,v.coach.credential,spoilers||v.spoilerLevel<2?pair(v.body,v.watchFor):'')));
    const songReading=(id,kind=null)=>{const r=R.musical?.songAnalysis?.[id];return pair((r?.blocks||[]).filter(b=>(spoilers||b.spoilerLevel<2)&&(!kind||b.kind===kind)).map(b=>pair(b.title,b.body)),spoilers?(r?.craftNotes||[]).map(b=>pair(b.title,b.body)):'')};
    for (const s of spotlight) {
      const entry = songEntries.find(x => x.id === s.id);
      add('song', s.id, 'musical', 'songs', entry ? { he: local(!spoilers ? safeSongTitle(entry) || entry.title : entry.title, 'he'), en: s.title } : s.title,
        pair(s.hook, s.background, s.question, songReading(s.id),coachReading(s.id), spoilers ? pair(s.plot, s.connection, entry?.scene, entry?.summary, entry?.characters, entry?.question) : ''), [s.id, s.title]);
    }
    for (const s of songEntries.filter(s => !spotlight.some(x => x.id === s.id))) {
      if (spoilers) add('song', s.id, 'musical', 'songs', s.title, pair(s.scene, s.summary, s.characters, s.mood, s.question,songReading(s.id),coachReading(s.id)), [s.catalogueTitle, s.id]);
      else if (safeSongTitle(s)) add('song', s.id, 'musical', 'songs', safeSongTitle(s), '', [s.id], true, true);
    }
    for (const item of R.gallery?.items || []) {
      const group = R.gallery.groups?.find(g => g.clipIds.includes(item.id));
      const allowed = spoilers || item.spoilerLevel !== 2;
      const songId=Array.isArray(item.songIds)?item.songIds[0]:group?.songId;
      const reading = spoilers || !(group?.reading?.spoilerLevel > 1) ? group?.reading : null;
      if(group?.category==='coaching'){const v=(R.coachVideos||[]).find(v=>v.id===item.id);add('performance',item.id,'listening','songs',item.title,pair(v?.coach?.name,v?.coach?.credential,allowed?pair(v?.introParagraphs,v?.body,v?.watchFor,group.hook):''),['vocal coach','vocal coaching','voice teacher','מורה לפיתוח קול','ניתוח ביצוע'],!allowed);continue;}
      add('performance', item.id, 'listening', 'songs', item.title,
        pair(item.shortLabel, item.label, item.language, allowed ? pair(item.context, item.editorialParagraphs, item.question, group?.hook, group?.question, reading?.title, reading?.scene, reading?.structure, reading?.watchFor,songReading(songId,'listening'),coachReading(songId)) : ''), [group?.title, ...(item.songIds || [])], !allowed);
    }
    for (const p of input.places?.places || []) add('place', p.id, 'places', 'places', p.name, pair(p.shortIntro, p.region, p.statusLabel, p.history, p.mapNote, spoilers ? p.novel : ''), [p.id]);
    for (const p of R.map?.places || []) add('atlas', p.id, 'map', 'places', p.name, pair(p.region, spoilers || p.context?.spoilerLevel === 0 ? p.context?.sentences : '', spoilers ? pair(p.storyRole, p.journey?.event, p.journey?.remember) : ''), [p.id]);
    for (const s of R.history?.timeline || []) if (spoilers || s.spoilerLevel < 2) add('history', s.id, 'history', 'history', pair(s.date, s.title), pair(s.body, s.importance, s.storyConnection, s.context?.title, s.context?.body));
    for (const [i, s] of (R.history?.contextCards || []).entries()) add('context', String(i), 'history', 'history', s.title, s.body);
    if (spoilers && R.history?.outcome) add('context', 'outcome', 'history', 'history', R.history.outcome.title, pair(R.history.outcome.body, R.history.outcome.reflection));
    for (const s of R.hugo?.sections || []) add('hugo', s.id, 'hugo', 'history', s.title, s.body, ['Victor Hugo', 'ויקטור הוגו']);
    for (const [i, s] of (R.hugo?.timeline || []).entries()) add('author', String(i), 'hugo', 'history', pair(s.year, s.title), s.body, ['Victor Hugo', 'ויקטור הוגו']);
    for (const s of input.recipes?.recipes || []) add('recipe', s.id, 'recipes', 'recipes', s.title,
      pair(s.course, s.modernDishLabel, s.ingredients, s.steps, s.adaptation, s.allergens, s.availability, s.servings, s.timeNote, s.variation), [s.id]);
    for (const s of R.philosophy?.dilemmas || []) {
      const allowed = spoilers || s.spoilerLevel < 2;
      add('dilemma', s.id, 'ideas', 'ideas', s.title, allowed ? pair(s.vignette,s.contextParagraphs,spoilers?pair(s.deepening?.title,s.deepening?.paragraphs):'', ...(s.perspectives || []).map(p => pair(p.title, p.argument, p.challenge)), s.askYourself) : '', [], !allowed);
    }
    if(after)for(const s of R.hugoExtras?.stories||[])add('extra',s.id,'after','story',s.title,pair(s.kicker,s.paragraphs));
    return out;
  }
  // A date's day or year must not match the middle of a different number.
  // Keep ordinary text substring matching and ordinal forms such as 5th.
  function termIndex(text, term, from = 0) {
    let at = text.indexOf(term, from);
    if (!/^\p{N}+$/u.test(term)) return at;
    while (at >= 0 && (/\p{N}/u.test(text[at - 1] || '') || /\p{N}/u.test(text[at + term.length] || ''))) at = text.indexOf(term, at + term.length);
    return at;
  }
  function queryTerms(query) { return [...new Set(normalize(String(query).slice(0, 180)).split(' ').filter(Boolean))].slice(0, 16); }
  function search(index, query, { lang = 'he', category = 'all', limit = 12 } = {}) {
    const coordinate = readerQuery(query);
    if (coordinate) {
      const doc = coordinate.key && (category === 'all' || category === 'story') && index.find(d => d.kind === coordinate.kind && d.key === coordinate.key);
      return doc ? { results: limit > 0 ? [{ doc, score: 1000, href: hrefFor(doc, lang) }] : [], total: 1 } : { results: [], total: 0 };
    }
    const terms = queryTerms(query), phrase = normalize(query).slice(0, 180);
    if (!terms.length) return { results: [], total: 0 };
    const hits = [];
    for (const doc of index) {
      if (doc.kind === 'chapter' || category !== 'all' && doc.category !== category) continue;
      const chosen = doc.search[lang], other = doc.search[lang === 'he' ? 'en' : 'he'];
      let score = 0, matched = true;
      for (const term of terms) {
        const scores = [termIndex(chosen.title, term) >= 0 ? 24 : 0, termIndex(other.title, term) >= 0 ? 21 : 0,
          doc.aliasSearch.split(' ').includes(term) ? 27 : termIndex(doc.aliasSearch, term) >= 0 ? 16 : 0,
          termIndex(chosen.body, term) >= 0 ? 5 : 0, termIndex(other.body, term) >= 0 ? 4 : 0];
        const best = Math.max(...scores); if (!best) { matched = false; break; } score += best;
      }
      if (!matched) continue;
      if (chosen.title === phrase || other.title === phrase) score += 95;
      else if (termIndex(chosen.title, phrase) >= 0 || termIndex(other.title, phrase) >= 0) score += 40;
      if (doc.aliasSearch.split(' ').includes(phrase)) score += 70;
      // A bare song name leads to its guide before individual performance choices.
      if(doc.kind==='song'&&(SAFE_SONG_NAMES[doc.key]||[]).some(title=>title.split(/[·/]/).some(part=>normalize(part)===phrase)))score+=110;
      if (doc.category === 'pages') score -= 10;
      hits.push({ doc, score, href: hrefFor(doc, lang) });
    }
    hits.sort((a, b) => b.score - a.score || a.doc.title[lang].localeCompare(b.doc.title[lang], lang));
    return { results: hits.slice(0, Math.max(0, limit)), total: hits.length };
  }
  function matchRanges(text, query) {
    const value = folded(text, true), ranges = [];
    for (const term of queryTerms(query)) {
      let at = termIndex(value.text, term), guard = 0;
      while (at >= 0 && guard++ < 50) {
        const start = value.positions[at]?.[0], end = value.positions[at + term.length - 1]?.[1];
        if (start !== undefined && end !== undefined) ranges.push([start, end]);
        at = termIndex(value.text, term, at + term.length);
      }
    }
    ranges.sort((a, b) => a[0] - b[0]);
    return ranges.reduce((acc, range) => { const last = acc[acc.length - 1]; if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]); else acc.push(range); return acc; }, []);
  }
  function highlight(text, query) {
    let start = 0, html = '';
    for (const [a, b] of matchRanges(text, query)) { html += esc(text.slice(start, a)) + '<mark>' + esc(text.slice(a, b)) + '</mark>'; start = b; }
    return html + esc(text.slice(start));
  }
  function snippet(text, query, length = 190) {
    text = String(text || '').replace(/\s+/g, ' ').trim();
    const first = matchRanges(text, query)[0]?.[0] ?? 0;
    let start = Math.max(0, first - 55), end = Math.min(text.length, start + length);
    if (start) { const boundary = text.indexOf(' ', start); if (boundary >= 0 && boundary < first) start = boundary + 1; }
    if (end < text.length) { const boundary = text.lastIndexOf(' ', end); if (boundary > first) end = boundary; }
    return (start ? '…' : '') + highlight(text.slice(start, end), query) + (end < text.length ? '…' : '');
  }
  function resultsHTML(result, query, lang) {
    const c = COPY[lang];
    if (!result.total) return `<div class="site-search-empty"><h3>${c.empty}</h3><p>${c.help}</p></div>`;
    return `<ul class="site-search-list">${result.results.map(({ doc, href }) => `<li><a data-site-search-result href="${esc(hrefFor(doc, lang))}" data-result-category="${esc(doc.category)}"><span class="site-search-category">${esc(CATEGORIES[doc.category][lang])}${doc.locked ? ` · ${lang === 'he' ? 'פרטי עלילה באישור' : 'Plot details by consent'}` : ''}</span><h3 dir="auto">${highlight(doc.title[lang], query)}</h3><p dir="auto">${snippet(doc.body[lang] || (doc.titleOnly ? c.titleOnly : c.locked), query)}</p><span class="site-search-arrow" aria-hidden="true">${lang === 'he' ? '←' : '→'}</span></a></li>`).join('')}</ul>${result.results.length < result.total ? `<button class="btn secondary site-search-more" data-site-search-more>${c.more}</button>` : ''}`;
  }
  function button(lang = 'he') { return `<button type="button" class="site-search-trigger" data-site-search-open aria-haspopup="dialog" aria-controls="site-search-dialog" aria-label="${COPY[lang].open}"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m15.5 15.5 5 5" stroke="currentColor" stroke-width="1.8"/></svg><span>${lang === 'he' ? 'חיפוש' : 'Search'}</span></button>`; }
  let context = { lang: 'he', spoiler: false, novelConsent: false, afterConsent: false }, panel = null, installed = false;
  let query = '', category = 'all', limit = 12, timer = null, composing = false, returnFocus = null, cached = null, cacheKey = '';
  function getIndex() {
    const key = `${context.spoiler === true}:${context.novelConsent === true}:${context.afterConsent === true}`;
    if (!cached || key !== cacheKey) { cached = buildIndex(sourceBundle(), context); cacheKey = key; }
    return cached;
  }
  function panelHTML() {
    const lang = context.lang, c = COPY[lang];
    return `<div class="site-search-head"><div><span class="eyebrow">${lang === 'he' ? 'מילה אחת יכולה לפתוח דלת' : 'ONE WORD CAN OPEN A DOOR'}</span><h2 id="site-search-title">${c.title}</h2></div><button type="button" data-site-search-close aria-label="${c.close}">×</button></div><form role="search" aria-label="${c.label}" autocomplete="off"><label for="site-search-input">${c.label}</label><div class="site-search-field"><input id="site-search-input" type="search" maxlength="180" placeholder="${c.placeholder}" value="${esc(query)}" dir="auto" autocomplete="off" spellcheck="false" aria-controls="site-search-results" aria-describedby="site-search-privacy site-search-spoilers"><button type="button" data-site-search-clear>${c.clear}</button></div></form><p id="site-search-privacy" class="site-search-privacy">${c.local}</p><details class="site-search-filter-disclosure" ${root.matchMedia?.('(max-width:600px)').matches?'':'open'}><summary>${c.filters}<span data-site-search-filter-label>${CATEGORIES[category][lang]}</span></summary><div class="site-search-filters" role="group" aria-label="${c.filters}">${Object.entries(CATEGORIES).map(([id, label]) => `<button type="button" data-site-search-category="${id}" aria-pressed="${category === id}">${label[lang]}</button>`).join('')}</div></details><p id="site-search-spoilers" class="site-search-spoilers">${context.spoiler ? c.spoilers : c.safe}</p><p class="site-search-status" id="site-search-status" role="status" aria-live="polite" aria-atomic="true"></p><div id="site-search-results" aria-busy="false"></div><p class="site-search-keyboard">${c.keyboard}</p>`;
  }
  function input() { return panel?.querySelector('#site-search-input'); }
  let searchRevision = 0, measuredRevision = -1;
  function measure(name, values = {}) { try { return root.SiteAnalytics?.track(name, values); } catch { return false; } }
  function renderResults() {
    if (!panel?.open) return;
    clearTimeout(timer); timer = null; const lang = context.lang, c = COPY[lang], target = panel.querySelector('#site-search-results'), status = panel.querySelector('#site-search-status');
    try {
      const index = getIndex();
      if (!index.length) throw new Error('empty-index');
      if (!normalize(query)) {
        target.innerHTML = `<div class="site-search-start"><h3>${c.start}</h3><p>${c.prompt}</p><div class="site-search-examples" role="group" aria-label="${c.examples}">${(lang === 'he' ? ['ולז׳אן', '24601', 'On My Own', '1832', 'טחינה'] : ['Valjean', '24601', 'On My Own', '1832', 'tahini']).map(q => `<button type="button" data-site-search-example="${esc(q)}" dir="auto">${esc(q)}</button>`).join('')}</div><a href="/${lang}/sitemap/" data-site-search-result>${c.sitemap}</a></div>`;
        status.textContent = ''; return;
      }
      const result = search(index, query, { lang, category, limit });
      if (measuredRevision !== searchRevision && measure('search_results', { search_category: category, result_count: Math.min(1000, result.total) })) measuredRevision = searchRevision;
      target.innerHTML = resultsHTML(result, query, lang);
      status.textContent = result.results.length === result.total ? c.count(result.total) : c.showing(result.results.length, result.total);
    } catch (_) {
      target.innerHTML = `<div class="site-search-empty"><h3>${c.unavailable}</h3><a href="/${lang}/sitemap/" data-site-search-result>${c.sitemap}</a><button type="button" class="text-button" data-site-search-retry>${c.retry}</button></div>`;
      status.textContent = c.unavailable;
    } finally { target.setAttribute('aria-busy', 'false'); }
  }
  function schedule() { searchRevision++; clearTimeout(timer); limit = 12; panel?.querySelector('#site-search-results')?.setAttribute('aria-busy', 'true'); timer = setTimeout(renderResults, 140); }
  function open(opener) {
    if (!panel || root.document.querySelector('dialog[open]') && !panel.open) return;
    returnFocus = opener || root.document.activeElement;
    panel.innerHTML = panelHTML(); panel.lang = context.lang; panel.dir = context.lang === 'he' ? 'rtl' : 'ltr';
    if (!panel.open) { panel.showModal(); measure('search_open'); } renderResults(); input()?.focus();
  }
  function close(restore = true) {
    clearTimeout(timer); if (!panel?.open) return;
    panel.close(); panel.innerHTML = ''; composing = false;
    if (restore && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  }
  function isTyping(node) { return !!node?.closest?.('input,textarea,select,[contenteditable="true"],[role="textbox"]'); }
  function keydown(event) {
    if (!panel?.open) {
      if (event.defaultPrevented || event.isComposing || root.document.querySelector('dialog[open]')) return;
      if (((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') || (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !isTyping(event.target))) { event.preventDefault(); open(root.document.querySelector('[data-site-search-open]')); }
      return;
    }
    if (event.isComposing || composing) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const links = [...panel.querySelectorAll('.site-search-list a')], at = links.indexOf(event.target);
    if (event.key === 'ArrowDown' && (event.target === input() || at >= 0)) { event.preventDefault(); if (timer) renderResults(); const current = [...panel.querySelectorAll('.site-search-list a')]; current[Math.min(at + 1, current.length - 1)]?.focus(); }
    else if (event.key === 'ArrowUp' && at >= 0) { event.preventDefault(); (links[at - 1] || input())?.focus(); }
    else if ((event.key === 'Home' || event.key === 'End') && at >= 0) { event.preventDefault(); links[event.key === 'Home' ? 0 : links.length - 1]?.focus(); }
  }
  function mount(next = {}) {
    const previous = context; context = { ...context, ...next, lang: next.lang === 'en' ? 'en' : 'he' };
    if (previous.spoiler !== context.spoiler || previous.novelConsent !== context.novelConsent || previous.afterConsent !== context.afterConsent) { cached = null; cacheKey = ''; }
    // Source-render tests and prerenderers have no DOM. Search remains progressively enhanced.
    const document = root.document; if (!document?.createElement || !document.body?.appendChild) return;
    if (!installed) {
      installed = true; panel = document.createElement('dialog'); panel.id = 'site-search-dialog'; panel.className = 'site-search-dialog'; panel.setAttribute('aria-labelledby', 'site-search-title'); document.body.appendChild(panel);
      panel.addEventListener('cancel', e => { e.preventDefault(); close(); });
      panel.addEventListener('click', e => { if (e.target === panel) { const r = panel.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close(); } });
      panel.addEventListener('submit', e => { e.preventDefault(); query = input().value; renderResults(); panel.querySelector('.site-search-list a')?.focus(); });
      panel.addEventListener('input', e => { if (e.target === input()) { query = e.target.value; if (!composing) schedule(); } });
      panel.addEventListener('search', e => { if (e.target === input()) { query = e.target.value; schedule(); } });
      panel.addEventListener('compositionstart', () => { composing = true; clearTimeout(timer); });
      panel.addEventListener('compositionend', e => { composing = false; query = e.target.value; schedule(); });
      document.addEventListener('keydown', keydown);
      document.addEventListener('click', e => {
        const opener = e.target.closest?.('[data-site-search-open]'); if (opener) { e.preventDefault(); open(opener); return; }
        if (!panel.open || !panel.contains(e.target)) return;
        const button = e.target.closest('button'), link = e.target.closest('a[data-site-search-result]');
        if (link && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && (!e.button || e.button === 0)) { if (context.onNavigate) { e.preventDefault(); const href = link.getAttribute('href'); if (link.dataset.resultCategory) measure('search_select', { search_category: category, result_category: link.dataset.resultCategory }); close(false); context.onNavigate(href); } return; }
        if (!button) return;
        if (button.hasAttribute('data-site-search-close')) close();
        else if (button.hasAttribute('data-site-search-clear')) { query = ''; searchRevision++; limit = 12; input().value = ''; renderResults(); input().focus(); }
        else if (button.hasAttribute('data-site-search-category')) { category = button.dataset.siteSearchCategory; const filterLabel=panel.querySelector('[data-site-search-filter-label]');if(filterLabel)filterLabel.textContent=CATEGORIES[category][context.lang];searchRevision++; limit = 12; panel.querySelectorAll('[data-site-search-category]').forEach(b => b.setAttribute('aria-pressed', b.dataset.siteSearchCategory === category)); renderResults(); }
        else if (button.hasAttribute('data-site-search-example')) { query = button.dataset.siteSearchExample; searchRevision++; input().value = query; limit = 12; renderResults(); input().focus(); }
        else if (button.hasAttribute('data-site-search-more')) { const oldCount = panel.querySelectorAll('.site-search-list a').length; limit += 12; renderResults(); panel.querySelectorAll('.site-search-list a')[oldCount]?.focus(); }
        else if (button.hasAttribute('data-site-search-retry')) { cached = null; renderResults(); }
      });
    }
    if (panel.open) close(false); // App rerenders/navigation must remove stale spoiler text immediately.
  }
  function readTarget(searchString, route) {
    const match = new URLSearchParams(searchString || '').get('focus')?.match(/^([a-z]+):([A-Za-z0-9_-]{1,80})$/);
    return match && routeKinds[match[1]] === route ? { kind: match[1], key: match[2] } : null;
  }
  function focusTarget(target) {
    if (!target || !root.document?.querySelector) return;
    const featuredSong = (root.EXTRA_CONTENT?.musical || root.RESEARCH?.musical)?.spotlight?.songs?.some(s => s.id === target.key);
    const key = target.key, selector = { part:'#reader-part-panel', chapter:'#reader-chapter-'+key, book: '#reading-book-panel', recording: '#recording-'+key, adaptation: '#adaptation-'+key, character: context.spoiler ? '#character-detail' : '#character-intro-' + key, story: '#story-' + key, novel: `[data-novel-event="${key}"]`, song: context.spoiler ? '#show-current-title' : featuredSong ? '#spotlight-title' : '#musical-journey', atlas: '#place-detail', history: `[data-history-event="${key}"]`, context: `[data-history-context="${key}"]`, author: `[data-hugo-date="${key}"]`, recipe: '#recipe-' + key, dilemma: '#dilemma-content', hugo: `[data-hugo-section="${key}"]`, craft: `[data-craft-id="${key}"]`, israel: `[data-israel-id="${key}"]`, watch: `[data-watch-id="${key}"]`, extra: key==='collection'?'#hugo-extra-stories':'#extra-story-'+key }[target.kind];
    const element = selector && (root.document.querySelector(selector)||(target.kind==='chapter'?root.document.querySelector('#reading-book-panel'):null)); if (!element) return;
    if (['story', 'novel', 'history','song','dilemma'].includes(target.kind)||(target.kind==='extra'&&key!=='collection')) {const readingRoot=target.kind==='song'?(element.closest?.('.show-slide,.spotlight-detail')||element):element;readingRoot.querySelectorAll?.('details').forEach(details => { if(!details.matches?.('.source-disclosure,.song-reading-sources,.coach-sources,.reading-sources,.added-media-credits,.watch-alternatives,.book-stage'))details.open = true; });}
    if(target.kind==='craft'||target.kind==='israel'){let notebook=element.closest?.('details');while(notebook){notebook.open=true;notebook=notebook.parentElement?.closest?.('details');}}
    element.setAttribute?.('tabindex', '-1'); element.focus?.({ preventScroll: true }); element.scrollIntoView?.({ block: 'start' });
  }
  root.SiteSearch = { normalize, safeSongTitle, buildIndex, search, highlight, snippet, resultsHTML, hrefFor, button, mount, open, close, readTarget, focusTarget, categories: CATEGORIES };
})(typeof window !== 'undefined' ? window : globalThis);
