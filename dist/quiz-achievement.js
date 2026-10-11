/* Original, local-only LesMisNotes achievement artwork. No remote assets or storage. */
'use strict';
(function (root) {
  const SIZE = 1080;
  const COLORS = { paper: '#faf6ed', navy: '#142d48', red: '#c73645', line: '#d9d0bd', muted: '#526172' };
  const FONT = 'Arial, "Noto Sans Hebrew", sans-serif';
  const clean = value => String(value || '').replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '').replace(/\s+/g, ' ').trim().slice(0, 240);

  function normalize(input) {
    if (!input || !['he', 'en'].includes(input.language) || !['story', 'musical'].includes(input.track)) throw new TypeError('Invalid achievement');
    const { correct, total } = input;
    if (![5, 10, 25].includes(total) || !Number.isInteger(correct) || correct < 0 || correct > total) throw new TypeError('Invalid score');
    const trackTitle = clean(input.trackTitle), badgeName = clean(input.badgeName);
    if (!trackTitle || !badgeName) throw new TypeError('Missing achievement label');
    // Explicit whitelist: never retain answer details, a personal name, page URL, or user ID.
    return Object.freeze({ language: input.language, track: input.track, trackTitle, badgeName, correct, total, percent: Math.round(correct / total * 100) });
  }
  const keyOf = data => JSON.stringify(data);
  const shareText = input => { const d = normalize(input); return `LesMisNotes · ${d.trackTitle} · ${d.correct}/${d.total} (${d.percent}%) · ${d.badgeName}`; };
  const fileName = input => `lesmisnotes-${input.track}-${input.total}-${input.language}.png`;

  function font(ctx, size, weight = 400) { ctx.font = `${weight} ${size}px ${FONT}`; }
  function wrap(ctx, text, maxWidth) {
    const result = [];
    let line = '';
    for (const word of text.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth) { line = next; continue; }
      if (line) result.push(line);
      line = '';
      // Character splitting is only for a future overlong unbroken token.
      for (const char of Array.from(word)) {
        if (line && ctx.measureText(line + char).width > maxWidth) { result.push(line); line = ''; }
        line += char;
      }
    }
    if (line) result.push(line);
    return result;
  }
  function textBlock(ctx, text, { x = 540, y, width = 860, maxLines = 2, size = 54, minSize = 26, weight = 700, color = COLORS.navy, direction = 'ltr', lineHeight = 1.18 }) {
    minSize = Math.min(size, minSize);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = direction;
    let lines, actualSize = size;
    for (; actualSize >= minSize; actualSize -= 2) {
      font(ctx, actualSize, weight); lines = wrap(ctx, text, width);
      if (lines.length <= maxLines) break;
    }
    actualSize = Math.max(minSize, actualSize); font(ctx, actualSize, weight);
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      let last = lines[maxLines - 1];
      while (last && ctx.measureText(last + '…').width > width) last = Array.from(last).slice(0, -1).join('');
      lines[maxLines - 1] = last + '…';
    }
    ctx.fillStyle = color;
    const step = actualSize * lineHeight, start = y - ((lines.length - 1) * step) / 2;
    lines.forEach((line, i) => ctx.fillText(line, x, start + i * step));
    return { text, lines, size: actualSize, width, top: start - actualSize / 2, bottom: start + ((lines.length - 1) * step) + actualSize / 2, direction };
  }
  function path(ctx, points, fill) {
    ctx.beginPath(); points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }
  function circle(ctx, x, y, radius, fill, stroke, lineWidth = 1) {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }
  function emblem(ctx) {
    ctx.save(); ctx.translate(540, 277);
    path(ctx, [[-70,55],[-96,155],[-39,132],[-10,166],[13,78]], COLORS.red);
    path(ctx, [[24,67],[38,157],[70,130],[112,143],[82,53]], COLORS.red);
    const points = Array.from({length: 48}, (_, i) => { const a = i * Math.PI / 24, r = i % 2 ? 106 : 113; return [Math.cos(a) * r, Math.sin(a) * r]; });
    path(ctx, points, COLORS.navy); circle(ctx, 0, 0, 92, COLORS.paper); circle(ctx, 0, 0, 83, null, COLORS.line, 2);
    // An original folded banner, not a licensed show logo or poster asset.
    ctx.beginPath(); ctx.moveTo(-27, 42); ctx.lineTo(-27, -51); ctx.strokeStyle = COLORS.navy; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-24,-49); ctx.bezierCurveTo(2,-70,12,-26,47,-45); ctx.lineTo(47,9); ctx.bezierCurveTo(10,28,1,-16,-24,6); ctx.closePath(); ctx.fillStyle = COLORS.red; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-46,51); ctx.lineTo(40,51); ctx.strokeStyle = COLORS.navy; ctx.lineWidth = 4; ctx.stroke();
    circle(ctx, -27, -58, 5, COLORS.navy); ctx.restore();
  }
  function drawCard(canvas, input) {
    const d = normalize(input), rtl = d.language === 'he', direction = rtl ? 'rtl' : 'ltr';
    canvas.width = SIZE; canvas.height = SIZE;
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas is unavailable');
    const boxes = [];
    ctx.fillStyle = COLORS.paper; ctx.fillRect(0,0,SIZE,SIZE);
    ctx.strokeStyle = COLORS.line; ctx.lineWidth = 2; ctx.strokeRect(30,30,1020,1020);
    ctx.fillStyle = COLORS.navy; ctx.fillRect(30,30,340,9);
    ctx.fillStyle = COLORS.red; ctx.fillRect(710,30,340,9);
    boxes.push(textBlock(ctx, 'LesMisNotes', { y: 95, size: 40, maxLines: 1 }));
    boxes.push(textBlock(ctx, rtl ? 'עלובי החיים' : 'LES MISÉRABLES', { y: 137, size: 22, weight: 400, direction, maxLines: 1, color: COLORS.muted }));
    emblem(ctx);
    boxes.push(textBlock(ctx, rtl ? 'המקצה הושלם' : 'ROUND COMPLETE', { y: 461, size: 22, weight: 700, direction, color: COLORS.red, maxLines: 1 }));
    boxes.push(textBlock(ctx, d.badgeName, { y: 546, size: 56, minSize: 32, width: 850, maxLines: 2, direction }));
    ctx.fillStyle = COLORS.line; ctx.fillRect(426,628,228,2);
    // Set number direction independently, even when the canvas document is RTL.
    boxes.push(textBlock(ctx, `${d.correct} / ${d.total}`, { y: 720, size: 112, maxLines: 1, direction: 'ltr' }));
    boxes.push(textBlock(ctx, `${d.percent}%`, { y: 822, size: 44, color: COLORS.red, maxLines: 1, direction: 'ltr' }));
    boxes.push(textBlock(ctx, d.trackTitle, { y: 900, size: 32, minSize: 24, maxLines: 2, direction }));
    boxes.push(textBlock(ctx, rtl ? 'תג של חידון מעריצים עצמאי' : 'AN INDEPENDENT FAN-QUIZ BADGE', { y: 994, size: 20, weight: 400, direction, color: COLORS.muted, maxLines: 1 }));
    return { width: SIZE, height: SIZE, boxes, data: d };
  }
  async function renderPNG(input, { document: doc = root.document } = {}) {
    // This preparation happens when the result mounts, never inside the share click.
    if (doc.fonts?.ready) {
      let timer;
      try { await Promise.race([doc.fonts.ready, new Promise(resolve => { timer = setTimeout(resolve, 1200); })]); }
      finally { clearTimeout(timer); }
    }
    const canvas = doc.createElement('canvas'); drawCard(canvas, input);
    if (typeof canvas.toBlob !== 'function') throw new Error('PNG export is unavailable');
    return new Promise((resolve, reject) => canvas.toBlob(blob => {
      // Only a real, non-empty PNG can enter native file sharing.
      if (!blob || !blob.size || blob.type !== 'image/png') reject(new Error('PNG export failed'));
      else resolve(blob);
      canvas.width = 0; canvas.height = 0;
    }, 'image/png'));
  }

  function createController(options) {
    const doc = options.document || root.document, nav = options.navigator || root.navigator;
    const urls = options.URL || root.URL, FileType = options.File || root.File;
    const renderer = options.renderPNG || (data => renderPNG(data, { document: doc }));
    const setTimer = options.setTimeout || root.setTimeout.bind(root), clearTimer = options.clearTimeout || root.clearTimeout.bind(root);
    let current = null, generation = 0, sharing = null, disposed = false;
    const downloads = new Map();
    function read() {
      try { const input = options.getCurrent(); return input ? { round: input.round, data: normalize(input) } : null; } catch { return null; }
    }
    function matches(record) { const live = read(); return !disposed && current === record && live && live.round === record.round && keyOf(live.data) === record.key; }
    function state() { return { status: current?.status || 'idle', busy: Boolean(sharing), previewURL: current?.previewURL || null, canShareImage: Boolean(current?.file && supportsFile(current.file)) }; }
    function emit() { if (!disposed) options.onState?.(state()); }
    function feedback(code, record) { if (matches(record)) options.onFeedback?.(code); }
    function supportsFile(file) { try { return typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ files: [file] }); } catch { return false; } }
    function clear() {
      generation++;
      if (current?.previewURL) urls.revokeObjectURL(current.previewURL);
      current = null; emit();
    }
    function prepare() {
      if (disposed) return Promise.resolve(false);
      const live = read(); if (!live) { clear(); return Promise.resolve(false); }
      const key = keyOf(live.data);
      if (current && current.round === live.round && current.key === key) { emit(); return current.promise; }
      clear();
      const record = { ...live, key, generation, status: 'preparing', previewURL: null, blob: null, file: null, promise: null };
      current = record; emit();
      // Capture a read-only minimal snapshot before any asynchronous operation.
      record.promise = Promise.resolve().then(() => renderer(record.data)).then(blob => {
        if (!matches(record)) return false;
        if (!blob || blob.type !== 'image/png' || !blob.size) throw new Error('Invalid PNG');
        record.blob = blob;
        try { record.file = FileType ? new FileType([blob], fileName(record.data), { type: 'image/png', lastModified: 0 }) : null; } catch { record.file = null; }
        record.previewURL = urls.createObjectURL(blob); record.status = 'ready'; emit(); return true;
      }).catch(() => { if (matches(record)) { record.status = 'unavailable'; emit(); feedback('image-unavailable', record); } return false; });
      return record.promise;
    }
    async function shareImage() {
      const record = current;
      if (!record || !matches(record)) return { status: 'stale' };
      if (sharing) return { status: 'busy' };
      if (record.status !== 'ready') { feedback(record.status === 'preparing' ? 'image-preparing' : 'image-unavailable', record); return { status: record.status }; }
      if (!record.file || !supportsFile(record.file)) { feedback('share-unsupported', record); return { status: 'unsupported' }; }
      const operation = {}; sharing = operation; emit();
      try {
        // Deliberately no await, font loading, toBlob, or permission request before this call.
        await nav.share({ files: [record.file], title: 'LesMisNotes', text: shareText(record.data) });
        if (!matches(record)) return { status: 'stale' };
        options.onShared?.({ method: 'native', track: record.data.track, total: record.data.total });
        feedback('shared', record); return { status: 'shared' };
      } catch (error) {
        if (!matches(record)) return { status: 'stale' };
        if (error?.name === 'AbortError') return { status: 'cancelled' };
        feedback('share-failed', record); return { status: 'failed' };
      } finally { if (sharing === operation) sharing = null; emit(); }
    }
    function downloadImage() {
      const record = current;
      if (!record || !matches(record)) return { status: 'stale' };
      if (record.status !== 'ready') { feedback(record.status === 'preparing' ? 'image-preparing' : 'image-unavailable', record); return { status: record.status }; }
      let href;
      try {
        href = urls.createObjectURL(record.blob);
        const a = doc.createElement('a'); a.href = href; a.download = fileName(record.data); a.hidden = true;
        doc.body.appendChild(a); try { a.click(); } finally { a.remove(); }
        // Keep a download URL alive through immediate SPA navigation, then always revoke it.
        const timer = setTimer(() => { urls.revokeObjectURL(href); downloads.delete(href); }, 10000);
        downloads.set(href, timer);
        options.onDownload?.({ track: record.data.track, total: record.data.total });
        feedback('download-ready', record); return { status: 'downloaded' };
      } catch { if (href) urls.revokeObjectURL(href); feedback('download-failed', record); return { status: 'failed' }; }
    }
    function dispose() { if (disposed) return; clear(); disposed = true; for (const [href, timer] of downloads) { clearTimer(timer); urls.revokeObjectURL(href); } downloads.clear(); }
    return { prepare, clear, dispose, state, shareImage, downloadImage };
  }
  root.QuizAchievement = Object.freeze({ normalize, shareText, fileName, drawCard, renderPNG, createController, size: SIZE });
})(typeof window !== 'undefined' ? window : globalThis);
