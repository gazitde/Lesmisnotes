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
    he: { open: 'חיפוש באתר', title: 'מה מסקרן אתכם?', label: 'חיפוש במדריך', placeholder: 'דמות, שיר, מקום או שאלה…', close: 'סגירת החיפוש', clear: 'ניקוי החיפוש', filters: 'סינון לפי נושא', local: 'החיפוש פועל כאן בדפדפן. השאילתות אינן נשמרות או נשלחות.', safe: 'ספוילרים מוסתרים. החיפוש אינו משתמש בפרטי עלילה נעולים.', spoilers: 'ספוילרים פתוחים. תקציר הרומן עדיין כפוף לאישור הנפרד שלכם.', start: 'חפשו גם בתוך ההסברים, ההיסטוריה והמתכונים.', examples: 'אפשר להתחיל כאן', empty: 'לא נמצאו תוצאות בבחירה הזאת.', help: 'נסו פחות מילים, איות אחר או נושא אחר. אפשר לחפש בעברית ובאנגלית.', unavailable: 'החיפוש המקומי לא נטען. אפשר להמשיך דרך מפת האתר.', retry: 'לנסות שוב', sitemap: 'למפת האתר', count: n => `${n} תוצאות`, showing: (n, total) => `מוצגות ${n} מתוך ${total} תוצאות`, more: 'עוד תוצאות', locked: 'פרטי העלילה נפתחים רק לפי בחירת הספוילרים שלכם.', titleOnly: 'התאמה בשם. המשיכו לעמוד כדי לקרוא לפי בחירת הספוילרים שלכם.', keyboard: 'Tab למעבר בין האפשרויות. חץ למטה לתוצאות. Escape לסגירה.', otherLanguage: 'התאמה גם בשפה השנייה', noneAvailable: 'אין כרגע תוכן לחיפוש בנושא הזה.', prompt: 'הקלידו מילה או שתיים כדי להתחיל.' },
    en: { open: 'Search the guide', title: 'What are you curious about?', label: 'Search this guide', placeholder: 'A character, song, place or question…', close: 'Close search', clear: 'Clear search', filters: 'Filter by topic', local: 'Search runs in your browser. Queries are never stored or sent.', safe: 'Spoilers are hidden. Search does not use locked plot details.', spoilers: 'Spoilers are on. The novel recap still follows your separate permission.', start: 'Search inside the explanations, history and recipes, too.', examples: 'Try a starting point', empty: 'No results in this selection.', help: 'Try fewer words, a different spelling or another topic. Hebrew and English both work.', unavailable: 'Local search could not load. You can still use the site map.', retry: 'Try again', sitemap: 'Open the site map', count: n => `${n} results`, showing: (n, total) => `Showing ${n} of ${total} results`, more: 'More results', locked: 'Plot details open only according to your spoiler choice.', titleOnly: 'Name match. Continue to the page to read according to your spoiler choice.', keyboard: 'Tab through the controls. Down arrow moves to results. Escape closes.', otherLanguage: 'Also matched in the other language', noneAvailable: 'There is no searchable content in this topic yet.', prompt: 'Type a word or two to start.' }
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
    bishop: ['Bishop of Digne', 'Myriel', 'בישוף', 'דיניה']
  };
  const routeKinds = { character: 'characters', story: 'story', novel: 'novel', song: 'musical', atlas: 'map', history: 'history', recipe: 'recipes', dilemma: 'ideas', hugo: 'hugo', craft: 'musical', israel: 'israel', watch: 'watch' };
  function hrefFor(doc, lang) {
    if (doc.kind === 'place') return `/${lang}/places/?place=${encodeURIComponent(doc.key)}`;
    if (doc.kind === 'performance') return `/${lang}/listening/?clip=${encodeURIComponent(doc.key)}`;
    return `/${lang}/${doc.route}/` + (routeKinds[doc.kind] ? `?focus=${encodeURIComponent(doc.kind + ':' + doc.key)}` : '');
  }
  function sourceBundle() { return { research: root.RESEARCH, extra: root.EXTRA_CONTENT, places: root.PLACE_CONTENT, recipes: root.RECIPE_CONTENT, metadata: root.SITE_METADATA }; }
  // Explicit field selection is intentional. Never recursively index source records:
  // they also contain hidden outcomes, quiz answers, editorial notes and credit URLs.
  function buildIndex(input = sourceBundle(), permissions = {}) {
    const R = { ...(input.research || {}), ...(input.extra || {}) }, out = [];
    const spoilers = permissions.spoiler === true, novel = spoilers && permissions.novelConsent === true;
    function add(kind, key, route, category, title, body, aliases = [], locked = false) {
      if (!title || !local(title, 'en')) return;
      const doc = { id: `${kind}:${key}`, kind, key: String(key), route, category, title: pair(title), body: pair(body), aliases: aliases.map(v => local(v, 'en')).join(' '), locked };
      doc.search = Object.fromEntries(LANGS.map(lang => [lang, { title: normalize(doc.title[lang]), body: normalize(doc.body[lang]) }]));
      doc.aliasSearch = normalize(doc.aliases);
      out.push(doc);
    }
    for (const [route, page] of Object.entries(input.metadata?.pages || {})) {
      if (page.canonicalRoute) continue;
      add('page', route, route, 'pages', input.labels?.[route] || page.title, input.pageHints?.[route] || page.description);
    }
    for (const c of R.characters || []) add('character', c.id, 'characters', 'characters', c.name,
      spoilers ? pair(c.role, c.summary, c.question, c.context?.sentences, (c.canonNotes||[]).map(n=>pair(n.title,n.paragraphs)), (c.connections || []).map(x => x.label)) : pair(c.safeIntro,c.id==='valjean'?R.safe24601?.body:''),
      [c.id, ...(CHARACTER_ALIASES[c.id] || [])], false);
    if (spoilers) for (const s of R.story || []) add('story', s.id, 'story', 'story', s.title, pair(s.period, s.summary, s.detail, s.songs));
    if (novel) for (const s of R.novel?.milestones || []) add('novel', s.id, 'novel', 'story', s.title, pair(s.dateLabel, s.summary, s.details, s.remember));
    for (const c of R.musical?.creationStory?.craft || []) add('craft', c.id, 'musical', 'songs', c.title, c.body, [c.id]);
    for (const c of R.israel?.sections || []) add('israel', c.id, 'israel', 'songs', c.title, c.paragraphs, ['Israel','ישראל']);
    for (const g of R.israel?.castGroups || []) for (const c of g.cards) add('israel', 'cast-'+c.id, 'israel', 'songs', c.name, pair(c.role,g.title), ['Israel','ישראל']);
    for (const c of R.israel?.novelTranslations?.items || []) add('israel', 'book-'+c.id, 'israel', 'story', c.name, pair(c.edition,c.body), ['Hebrew','עברית']);
    for (const c of R.watch?.cards || []) add('watch', c.id, 'watch', 'songs', c.title, pair(c.paragraphs,c.statusLabel,c.location), [c.id]);
    const spotlight = R.musical?.spotlight?.songs || [], songEntries = R.musical?.songentries || [];
    for (const s of spotlight) {
      const entry = songEntries.find(x => x.id === s.id);
      add('song', s.id, 'musical', 'songs', entry ? { he: local(entry.title, 'he'), en: s.title } : s.title,
        pair(s.hook, s.background, s.question, spoilers ? pair(s.plot, s.connection, entry?.scene, entry?.summary, entry?.characters, entry?.question) : ''), [s.id, s.title]);
    }
    if (spoilers) for (const s of songEntries.filter(s => !spotlight.some(x => x.id === s.id))) add('song', s.id, 'musical', 'songs', s.title, pair(s.scene, s.summary, s.characters, s.mood, s.question), [s.catalogueTitle, s.id]);
    for (const item of R.gallery?.items || []) {
      const group = R.gallery.groups?.find(g => g.clipIds.includes(item.id));
      const allowed = spoilers || item.spoilerLevel !== 2;
      add('performance', item.id, 'listening', 'songs', item.title,
        pair(item.shortLabel, item.label, item.language, allowed ? pair(item.context, group?.hook, group?.question) : ''), [group?.title, ...(item.songIds || [])], !allowed);
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
      add('dilemma', s.id, 'ideas', 'ideas', s.title, allowed ? pair(s.vignette, ...(s.perspectives || []).map(p => pair(p.title, p.argument, p.challenge)), s.askYourself) : '', [], !allowed);
    }
    return out;
  }
  function queryTerms(query) { return [...new Set(normalize(String(query).slice(0, 180)).split(' ').filter(Boolean))].slice(0, 16); }
  function search(index, query, { lang = 'he', category = 'all', limit = 12 } = {}) {
    const terms = queryTerms(query), phrase = normalize(query).slice(0, 180);
    if (!terms.length) return { results: [], total: 0 };
    const hits = [];
    for (const doc of index) {
      if (category !== 'all' && doc.category !== category) continue;
      const chosen = doc.search[lang], other = doc.search[lang === 'he' ? 'en' : 'he'];
      let score = 0, matched = true;
      for (const term of terms) {
        const scores = [chosen.title.includes(term) ? 24 : 0, other.title.includes(term) ? 21 : 0,
          doc.aliasSearch.split(' ').includes(term) ? 27 : doc.aliasSearch.includes(term) ? 16 : 0,
          chosen.body.includes(term) ? 5 : 0, other.body.includes(term) ? 4 : 0];
        const best = Math.max(...scores); if (!best) { matched = false; break; } score += best;
      }
      if (!matched) continue;
      if (chosen.title === phrase || other.title === phrase) score += 95;
      else if (chosen.title.includes(phrase) || other.title.includes(phrase)) score += 40;
      if (doc.aliasSearch.split(' ').includes(phrase)) score += 70;
      if (doc.category === 'pages') score -= 10;
      hits.push({ doc, score, href: hrefFor(doc, lang) });
    }
    hits.sort((a, b) => b.score - a.score || a.doc.title[lang].localeCompare(b.doc.title[lang], lang));
    return { results: hits.slice(0, Math.max(0, limit)), total: hits.length };
  }
  function matchRanges(text, query) {
    const value = folded(text, true), ranges = [];
    for (const term of queryTerms(query)) {
      let at = value.text.indexOf(term), guard = 0;
      while (at >= 0 && guard++ < 50) {
        const start = value.positions[at]?.[0], end = value.positions[at + term.length - 1]?.[1];
        if (start !== undefined && end !== undefined) ranges.push([start, end]);
        at = value.text.indexOf(term, at + term.length);
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
    return `<ul class="site-search-list">${result.results.map(({ doc, href }) => `<li><a data-site-search-result href="${esc(hrefFor(doc, lang))}" data-result-category="${esc(doc.category)}"><span class="site-search-category">${esc(CATEGORIES[doc.category][lang])}${doc.locked ? ` · ${lang === 'he' ? 'פרטי עלילה באישור' : 'Plot details by consent'}` : ''}</span><h3 dir="auto">${highlight(doc.title[lang], query)}</h3><p dir="auto">${snippet(doc.body[lang] || c.locked, query)}</p><span class="site-search-arrow" aria-hidden="true">${lang === 'he' ? '←' : '→'}</span></a></li>`).join('')}</ul>${result.results.length < result.total ? `<button class="btn secondary site-search-more" data-site-search-more>${c.more}</button>` : ''}`;
  }
  function button(lang = 'he') { return `<button type="button" class="site-search-trigger" data-site-search-open aria-haspopup="dialog" aria-controls="site-search-dialog" aria-label="${COPY[lang].open}"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m15.5 15.5 5 5" stroke="currentColor" stroke-width="1.8"/></svg><span>${lang === 'he' ? 'חיפוש' : 'Search'}</span></button>`; }
  let context = { lang: 'he', spoiler: false, novelConsent: false }, panel = null, installed = false;
  let query = '', category = 'all', limit = 12, timer = null, composing = false, returnFocus = null, cached = null, cacheKey = '';
  function getIndex() {
    const key = `${context.spoiler === true}:${context.novelConsent === true}`;
    if (!cached || key !== cacheKey) { cached = buildIndex(sourceBundle(), context); cacheKey = key; }
    return cached;
  }
  function panelHTML() {
    const lang = context.lang, c = COPY[lang];
    return `<div class="site-search-head"><div><span class="eyebrow">${lang === 'he' ? 'מילה אחת יכולה לפתוח דלת' : 'ONE WORD CAN OPEN A DOOR'}</span><h2 id="site-search-title">${c.title}</h2></div><button type="button" data-site-search-close aria-label="${c.close}">×</button></div><form role="search" aria-label="${c.label}" autocomplete="off"><label for="site-search-input">${c.label}</label><div class="site-search-field"><input id="site-search-input" type="search" maxlength="180" placeholder="${c.placeholder}" value="${esc(query)}" dir="auto" autocomplete="off" spellcheck="false" aria-controls="site-search-results" aria-describedby="site-search-privacy site-search-spoilers"><button type="button" data-site-search-clear>${c.clear}</button></div></form><p id="site-search-privacy" class="site-search-privacy">${c.local}</p><div class="site-search-filters" role="group" aria-label="${c.filters}">${Object.entries(CATEGORIES).map(([id, label]) => `<button type="button" data-site-search-category="${id}" aria-pressed="${category === id}">${label[lang]}</button>`).join('')}</div><p id="site-search-spoilers" class="site-search-spoilers">${context.spoiler ? c.spoilers : c.safe}</p><p class="site-search-status" id="site-search-status" role="status" aria-live="polite" aria-atomic="true"></p><div id="site-search-results" aria-busy="false"></div><p class="site-search-keyboard">${c.keyboard}</p>`;
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
    if (previous.spoiler !== context.spoiler || previous.novelConsent !== context.novelConsent) { cached = null; cacheKey = ''; }
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
        else if (button.hasAttribute('data-site-search-category')) { category = button.dataset.siteSearchCategory; searchRevision++; limit = 12; panel.querySelectorAll('[data-site-search-category]').forEach(b => b.setAttribute('aria-pressed', b.dataset.siteSearchCategory === category)); renderResults(); }
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
    const key = target.key, selector = { character: context.spoiler ? '#character-detail' : '#character-intro-' + key, story: '#story-' + key, novel: `[data-novel-event="${key}"]`, song: context.spoiler ? '#show-current-title' : '#spotlight-title', atlas: '#place-detail', history: `[data-history-event="${key}"]`, recipe: '#recipe-' + key, dilemma: '#dilemma-content', hugo: `[data-hugo-section="${key}"]`, craft: `[data-craft-id="${key}"]`, israel: `[data-israel-id="${key}"]`, watch: `[data-watch-id="${key}"]` }[target.kind];
    const element = selector && root.document.querySelector(selector); if (!element) return;
    if (['story', 'novel', 'history'].includes(target.kind)) element.querySelectorAll?.('details').forEach(details => { details.open = true; });
    if(target.kind==='craft'||target.kind==='israel'){const notebook=element.closest?.('details');if(notebook)notebook.open=true;}
    element.setAttribute?.('tabindex', '-1'); element.focus?.({ preventScroll: true }); element.scrollIntoView?.({ block: 'start' });
  }
  root.SiteSearch = { normalize, buildIndex, search, highlight, snippet, resultsHTML, hrefFor, button, mount, open, close, readTarget, focusTarget, categories: CATEGORIES };
})(typeof window !== 'undefined' ? window : globalThis);
