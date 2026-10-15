/* Stateless song-journey rendering. The host owns consent, navigation and players. */
(function (window) {
  'use strict';
  const data = window.WATCH_PATH_DATA;
  if (!data) throw new Error('Load watch-path-data.js before watch-path.js.');
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
  freeze(data);
  const clips = new Map(data.clips.map(clip => [clip.id, clip]));
  const stops = new Map(data.stops.map(stop => [stop.songId, stop]));
  const language = lang => lang === 'he' ? 'he' : 'en';
  const normalizeMode = mode => mode === 'sameProduction' ? 'sameProduction' : 'ourPicks';
  const translate = (value, lang) => typeof value === 'object' && value ? value[lang] || value.en || '' : value || '';
  const text = (lang, en, he) => lang === 'he' ? he : en;
  const idsFor = (stop, mode, lang) => mode === 'sameProduction' ? stop.sameProduction : stop.ourPicks[lang];
  const languageLabel = (code, lang) => {
    const labels = {en:['English','אנגלית'],he:['Hebrew','עברית'],fr:['French','צרפתית'],ja:['Japanese','יפנית'],de:['German','גרמנית'],es:['Spanish','ספרדית'],nl:['Dutch','הולנדית'],ko:['Korean','קוריאנית'],pl:['Polish','פולנית'],pt:['Portuguese','פורטוגזית'],mul:['Multiple languages','כמה שפות'],und:['Language not verified','השפה לא אומתה']};
    const label = labels[code] || labels.und;
    return text(lang, label[0], label[1]);
  };
  const direction = lang => lang === 'he' ? 'rtl' : 'ltr';
  const sourceHref = clip => /^[\w-]{11}$/.test(clip.id) && clip.url === 'https://www.youtube.com/watch?v=' + clip.id ? clip.url : '';
  let renderSequence = 0;

  function getSelection(options = {}) {
    const lang = language(options.lang), mode = normalizeMode(options.mode), stop = stops.get(options.songId);
    if (!stop) return null;
    const ids = idsFor(stop, mode, lang);
    const selected = ids.map(id => clips.get(id)).filter(Boolean);
    if (selected.length !== ids.length) throw new Error('Watch-path source missing for ' + stop.songId);
    const previous = data.stops.find(item => item.order === stop.order - 1);
    const previousIds = previous ? idsFor(previous, mode, lang) : [];
    const sharedWithPrevious = ids.length === previousIds.length && ids.every((id, i) => id === previousIds[i]);
    return freeze({
      songId: stop.songId, lang, mode, title: translate(stop.title, lang), order: stop.order, act: stop.act,
      kind: selected.every(clip => clip.productionId === 'tka-loveland-2017') ? 'same-production' : 'curated',
      clips: selected,
      alternatives: [...new Set([...(stop.alternatives || []), ...stop.ourPicks[lang], ...stop.ourPicks[lang === "he" ? "en" : "he"], ...stop.sameProduction])].filter(id => !ids.includes(id)).map(id => { if (!clips.has(id)) throw new Error("Alternative source missing: " + id); return clips.get(id); }).sort((a,b) => Number(b.language === lang) - Number(a.language === lang)),
      sharedWithPrevious,
      relatedLargerClip: Boolean(stop.relatedClipNote),
      note: translate(stop.relatedClipNote, lang),
      excerptNote: mode === 'ourPicks' ? translate(stop.selectedExcerptNote, lang) : '',
      twoParts: selected.length === 2,
      curtainCall: stop.songId === 'epilogue' ? clips.get(data.curtainCallId) : null
    });
  }

  function renderIntro(options = {}) {
    const lang = language(options.lang), mode = normalizeMode(options.mode);
    return `<section class="watch-path-intro" data-watch-intro lang="${lang}" dir="${direction(lang)}" aria-label="${text(lang, 'Watch along', 'צפייה לצד המסע')}"><div class="watch-path-intro-copy"><h3>${text(lang, 'Watch along', 'צפייה לצד המסע')}</h3><p>${escape(translate(data.introduction, lang))}</p></div><div class="watch-path-modes" id="watch-path-modes" role="group" aria-label="${text(lang, 'Choose performances', 'בחירת ביצועים')}">${['ourPicks', 'sameProduction'].map(value => `<button type="button" id="watch-mode-${value}" data-watch-mode="${value}" aria-pressed="${value === mode}"><span>${escape(translate(data.modeLabels[value], lang))}</span><small>${value === 'ourPicks' ? text(lang, 'Stage, concert & film', 'במה, קונצרטים וקולנוע') : '<bdi>The King’s Academy · 2017</bdi>'}</small></button>`).join('')}</div></section>`;
  }

  function sourceLink(clip, label, lang, className = 'watch-path-source-link') {
    const href = sourceHref(clip);
    if (!href) return '';
    return `<a class="${className}" href="${escape(href)}" target="_blank" rel="noopener noreferrer"><span>${escape(label)}</span><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 12 12 4M4 4h8v8" fill="none" stroke="currentColor" stroke-width="1.5"/></svg><span class="watch-path-sr-only">${text(lang, ' (opens in a new tab)', ' (נפתח בלשונית חדשה)')}</span></a>`;
  }

  function durationLabel(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return '';
    return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
  }

  function renderAlternatives(selection) {
    const {lang, songId, alternatives} = selection;
    if (!alternatives.length) return '';
    return `<details class="watch-alternatives" data-watch-alternatives><summary>${text(lang, 'Watch more performances', 'צפה בביצועים נוספים')} <span class="watch-alternatives-count">(${alternatives.length})</span></summary><div class="watch-alternatives-body"><p class="watch-alternatives-intro">${text(lang, 'Compare another cast or interpretation. Choose a performance to load its player; the main recording stays above.', 'השוו צוות אחר או פרשנות אחרת. בחרו ביצוע כדי לטעון את הנגן שלו; ההקלטה הראשית נשארת למעלה.')}</p><div class="watch-alternatives-list">${alternatives.map(clip => `<article class="watch-alternative" data-watch-alternative-card="${escape(clip.id)}"><div class="watch-path-meta"><span>${escape(languageLabel(clip.language, lang))}</span><span dir="auto">${escape(translate(clip.production, lang))}</span></div><h4 dir="auto">${escape(translate(clip.title, lang))}</h4><p dir="auto">${escape(translate(clip.sourceContext, lang))}</p>${clip.alternativeNote ? `<p class="watch-alternative-note">${escape(translate(clip.alternativeNote, lang))}</p>` : ''}<div class="watch-alternative-actions">${clip.delivery === 'embed-with-source-link' ? `<button type="button" data-watch-alternative="${escape(clip.id)}" aria-expanded="false" aria-controls="alternative-${escape(songId)}-${escape(clip.id)}">${text(lang, 'Watch here', 'צפייה כאן')}</button>` : ''}${sourceLink(clip, text(lang, 'Watch on YouTube', 'לצפייה ב־YouTube'), lang)}</div><small class="watch-path-uploader">${text(lang, 'Published by ', 'פורסם בידי ')}<bdi>${escape(clip.uploader)}</bdi></small><div class="watch-alternative-player" id="alternative-${escape(songId)}-${escape(clip.id)}" hidden></div></article>`).join('')}</div></div></details>`;
  }

  function renderStop(options = {}) {
    const selection = getSelection(options);
    if (!selection) return '';
    const { lang, mode, songId } = selection;
    const renderId = ++renderSequence;
    const label = selection.relatedLargerClip ? text(lang, 'Related larger clip', 'קטע רחב יותר הקשור לתחנה') : text(lang, 'Watch this stop', 'צפייה לצד התחנה');
    const shared = selection.sharedWithPrevious ? `<p class="watch-path-shared">${text(lang, 'This stop continues within the same recording as the previous stop. The player stays in place so you can keep watching.', 'התחנה ממשיכה בתוך אותה הקלטה כמו התחנה הקודמת. הנגן נשאר במקומו כדי שאפשר יהיה להמשיך לצפות.')}</p>` : '';
    const notes = selection.note ? `<p class="watch-path-note">${escape(selection.note)}</p>` : '';
    const ending = selection.twoParts ? `<p class="watch-path-ending">${text(lang, 'Watch Epilogue first, then Finale.', 'צפו קודם באפילוג, ואחריו בפינאלה.')}</p>` : '';
    const cards = selection.clips.map((clip, index) => {
      const canEmbed = clip.delivery === 'embed-with-source-link';
      const school = clip.productionId === 'tka-loveland-2017';
      const instance = `journey-${songId}-${mode}-${lang}-${clip.id}-${renderId}-${index}`;
      const player = canEmbed && typeof options.renderVideo === 'function' ? options.renderVideo(clip.id, instance) : '';
      if (player != null && typeof player !== 'string') throw new TypeError('renderVideo must return an HTML string.');
      const duration = durationLabel(clip.durationSeconds);
      const mediaLanguage = languageLabel(clip.language, lang);
      const heading = translate(clip.title, lang);
      const credit = translate(school ? clip.production : clip.sourceContext, lang);
      return `<div class="watch-path-clip${player ? ' watch-path-clip--embedded' : ' watch-path-clip--external'}" data-watch-clip="${escape(clip.id)}"><div class="watch-path-clip-head">${selection.twoParts ? `<span class="watch-path-part" aria-label="${text(lang, 'Part', 'חלק')} ${index + 1}">${index + 1}</span>` : ''}<div class="watch-path-clip-heading"><div class="watch-path-meta"><span>${escape(school ? text(lang, 'School production', 'הפקת בית ספר') : text(lang, 'Our pick', 'הבחירה שלנו'))}</span><span>${mediaLanguage}</span>${duration ? `<bdi>${duration}</bdi>` : ''}</div><h4 dir="auto">${escape(heading)}</h4><p class="watch-path-credit" dir="auto">${escape(credit)}</p></div></div><div class="watch-path-media">${player || `<div class="watch-path-external-frame"><span class="watch-path-external-label">YouTube · ${selection.sharedWithPrevious ? text(lang, 'same recording', 'אותה הקלטה') : text(lang, 'original upload', 'ההעלאה המקורית')}</span>${sourceLink(clip, text(lang, 'Watch on YouTube', 'לצפייה ב־YouTube'), lang)}</div><span class="watch-path-external-hint">${text(lang, 'Opens in a new tab · return here for the next stop', 'נפתח בלשונית חדשה · חוזרים לכאן לתחנה הבאה')}</span>`}</div>${canEmbed && !player ? `<p class="watch-path-uploader">${text(lang, 'Published by ', 'פורסם בידי ')}<bdi>${escape(clip.uploader)}</bdi></p>` : ''}</div>`;
    }).join('');
    const excerpt = selection.excerptNote ? `<p class="watch-path-note">${escape(selection.excerptNote)}</p>` : '';
    return `<section class="watch-path-stop" data-watch-stop="${escape(songId)}" data-watch-current-mode="${mode}" lang="${lang}" dir="${direction(lang)}" aria-label="${escape(label)}"><h3 class="watch-path-stop-label">${escape(label)}</h3>${ending}<div class="watch-path-clips${selection.twoParts ? ' watch-path-clips--two' : ''}">${cards}</div>${shared}${notes}${excerpt}${renderAlternatives(selection)}</section>`;
  }

  window.WatchPath = Object.freeze({ renderIntro, renderStop, getSelection, normalizeMode, defaultMode: data.defaultMode });
})(window);
