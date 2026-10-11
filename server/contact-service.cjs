'use strict';

const { createHmac, randomUUID, randomBytes, timingSafeEqual } = require('node:crypto');
const { isIP } = require('node:net');
const serverRoute = require('./contact-route.cjs');
// Ephemeral privacy salt, not a credential or an authentication gate. It is never persisted.
const instanceSalt = randomBytes(32).toString('hex');

const MAX_BODY_BYTES = 16_384;
const TICKET_LIFETIME_MS = 23 * 60 * 60 * 1000;
const RETENTION_MS = 25 * 60 * 60 * 1000;
const CATEGORIES = Object.freeze({ comment: 'Comment', correction: 'Correction', feedback: 'Feedback', other: 'Other' });
const EMAIL = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const SINGLE_LINE_CONTROL = /[\u0000-\u001f\u007f\u2028\u2029]/;
const MESSAGE_CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const RATE_RULES = [{ scope: 'ip', limit: 5, seconds: 900 }, { scope: 'global-hour', limit: 60, seconds: 3600 }, { scope: 'global-day', limit: 200, seconds: 86400 }];

class ContactError extends Error {
  constructor(status, code, fields, retryAfter) { super(code); this.status = status; this.code = code; this.fields = fields; this.retryAfter = retryAfter; }
}
const error = (status, code, fields, retryAfter) => new ContactError(status, code, fields, retryAfter);
const hmac = (secret, value) => createHmac('sha256', secret).update(value).digest('hex');
const header = (req, name) => { const value = req.headers?.[name]; return typeof value === 'string' ? value : ''; };
const validEmail = value => typeof value === 'string' && value.length <= 254 && !SINGLE_LINE_CONTROL.test(value) && EMAIL.test(value);

function getConfig(env) {
  const provider = env.CONTACT_PROVIDER || 'formsubmit';
  const recipient = (env.CONTACT_RECIPIENT || '').trim();
  const sender = (env.CONTACT_FROM || '').trim();
  const apiKey = env.RESEND_API_KEY || '';
  const configuredSecret = env.CONTACT_SIGNING_SECRET || '';
  const secret = configuredSecret || instanceSalt;
  const mode = env.CONTACT_RATE_LIMIT_MODE || 'memory';
  let origins = [];
  try {
    const allowedOrigins = env.CONTACT_ALLOWED_ORIGINS === undefined ? serverRoute.allowedOrigins.join(',') : env.CONTACT_ALLOWED_ORIGINS;
    origins = allowedOrigins.split(',').map(x => x.trim()).filter(Boolean).map(value => {
      const url = new URL(value);
      const local = env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      if (url.origin !== value || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) throw Error();
      return value;
    });
  } catch { return null; }
  const enabled = env.CONTACT_ENABLED === undefined ? serverRoute.enabled === true : env.CONTACT_ENABLED === 'true';
  if (!enabled || !['formsubmit', 'resend'].includes(provider) || !origins.length || !['memory', 'redis'].includes(mode)) return null;
  // Only signed Resend tickets and the optional cross-instance Redis hashes need a persistent key.
  if ((provider === 'resend' || mode === 'redis') && configuredSecret.length < 32) return null;
  // This is a provider-issued public form-routing alias, not an archive API key.
  // Keep it server-only anyway; never accept a raw recipient address as a fallback.
  const formsubmitAlias = env.FORMSUBMIT_ALIAS === undefined ? serverRoute.formsubmitAlias : env.FORMSUBMIT_ALIAS;
  if (provider === 'formsubmit' && !/^[a-f0-9]{32}$/i.test(formsubmitAlias)) return null;
  if (provider === 'resend' && (!validEmail(recipient) || !validEmail(sender) || !apiKey || SINGLE_LINE_CONTROL.test(apiKey))) return null;
  const redisUrl = env.UPSTASH_REDIS_REST_URL || '';
  const redisToken = env.UPSTASH_REDIS_REST_TOKEN || '';
  if (mode === 'redis') {
    try {
      const url = new URL(redisUrl);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !/^[a-zA-Z0-9.-]+\.upstash\.io$/.test(url.hostname) || (url.pathname !== '/' && url.pathname !== '') || !redisToken || SINGLE_LINE_CONTROL.test(redisToken)) return null;
    } catch { return null; }
  }
  return { provider, formsubmitAlias, recipient, sender, apiKey, secret, origins, mode, redisUrl: redisUrl.replace(/\/$/, ''), redisToken };
}

function sameOrigin(req, config, method) {
  const origin = header(req, 'origin');
  const fetchSite = header(req, 'sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin') throw error(403, 'origin_rejected');
  // GET may omit Origin in browsers. Its signed ticket is not an authentication credential.
  if (!origin && method === 'GET') {
    if (!config.origins.some(value => new URL(value).host === header(req, 'host'))) throw error(403, 'origin_rejected');
    return;
  }
  if (!config.origins.includes(origin)) throw error(403, 'origin_rejected');
  const host = header(req, 'host');
  if (!host || new URL(origin).host !== host) throw error(403, 'origin_rejected');
}

function createTicket(config, now, id = randomUUID()) {
  const issued = now;
  // FormSubmit has no privileged browser capability here. This public timing marker and nonce
  // support UX and best-effort duplicate tracking; they are not proof of humanity or authentication.
  if (config.provider === 'formsubmit') return { id, issued, signature: 'public-form-v1' };
  return { id, issued, signature: hmac(config.secret, `contact:v1:${id}:${issued}`) };
}

function validateTicket(ticket, config, now) {
  if (!ticket || typeof ticket !== 'object' || Array.isArray(ticket) || !/^[a-f0-9-]{36}$/.test(ticket.id || '') || !Number.isSafeInteger(ticket.issued) || typeof ticket.signature !== 'string') throw error(400, 'invalid_ticket');
  if (config.provider === 'formsubmit') {
    if (ticket.signature !== 'public-form-v1') throw error(400, 'invalid_ticket');
  } else {
    if (!/^[a-f0-9]{64}$/.test(ticket.signature)) throw error(400, 'invalid_ticket');
    const expected = hmac(config.secret, `contact:v1:${ticket.id}:${ticket.issued}`);
    if (!timingSafeEqual(Buffer.from(ticket.signature, 'hex'), Buffer.from(expected, 'hex'))) throw error(400, 'invalid_ticket');
  }
  const age = now - ticket.issued;
  if (age < 0 || age > TICKET_LIFETIME_MS) throw error(409, 'expired_ticket');
  if (age < 800) throw error(429, 'too_fast', undefined, 2);
  return ticket;
}

async function readBody(req) {
  const length = header(req, 'content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) throw error(413, 'body_too_large');
  const contentType = header(req, 'content-type');
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(contentType)) throw error(415, 'json_required');
  const encoding = header(req, 'content-encoding');
  if (encoding && encoding !== 'identity') throw error(415, 'encoding_rejected');
  let raw;
  if (req.body !== undefined) {
    raw = typeof req.body === 'string' || Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body);
  } else {
    const chunks = []; let size = 0;
    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > MAX_BODY_BYTES) throw error(413, 'body_too_large');
      chunks.push(buffer);
    }
    raw = Buffer.concat(chunks);
  }
  if (!raw || Buffer.byteLength(raw) > MAX_BODY_BYTES) throw error(413, 'body_too_large');
  try { return JSON.parse(raw.toString()); } catch { throw error(400, 'invalid_json'); }
}

function validatePayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw error(400, 'invalid_payload');
  const allowed = new Set(['category', 'name', 'email', 'message', 'website', 'lang', 'ticket']);
  if (Object.keys(body).some(key => !allowed.has(key))) throw error(400, 'invalid_payload');
  const fields = [];
  for (const key of ['category', 'message', 'lang']) if (typeof body[key] !== 'string') fields.push(key);
  for (const key of ['name', 'email', 'website']) if (body[key] !== undefined && typeof body[key] !== 'string') fields.push(key);
  if (fields.length) throw error(400, 'validation_failed', fields);
  const name = (body.name || '').trim(); const email = (body.email || '').trim(); const message = body.message.trim();
  if (!Object.hasOwn(CATEGORIES, body.category)) fields.push('category');
  if (!['he', 'en'].includes(body.lang)) fields.push('lang');
  if (name.length > 80 || SINGLE_LINE_CONTROL.test(body.name || '')) fields.push('name');
  if (email && !validEmail(email) || SINGLE_LINE_CONTROL.test(body.email || '')) fields.push('email');
  if (message.length < 10 || message.length > 4000 || MESSAGE_CONTROL.test(message)) fields.push('message');
  if ((body.website || '').length > 200) fields.push('website');
  if (fields.length) throw error(400, 'validation_failed', [...new Set(fields)]);
  if ((body.website || '').trim()) throw error(400, 'submission_rejected');
  return { category: body.category, name, email, message, lang: body.lang };
}

function clientIdentity(ip) {
  if (isIP(ip) !== 6) return ip;
  const canonical = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
  const [left, right] = canonical.split('::');
  const first = left ? left.split(':') : [];
  const last = right ? right.split(':') : [];
  const parts = right !== undefined ? [...first, ...Array(8 - first.length - last.length).fill('0'), ...last] : first;
  const values = parts.map(value => Number.parseInt(value, 16));
  if (values.slice(0, 5).every(value => value === 0) && values[5] === 0xffff) return [values[6] >> 8, values[6] & 255, values[7] >> 8, values[7] & 255].join('.');
  return values.slice(0, 4).map(value => value.toString(16).padStart(4, '0')).join(':') + '::/64';
}

function getClientKey(req, env, secret) {
  // Only Vercel's overwritten header is trusted on Vercel; never trust arbitrary X-Forwarded-For elsewhere.
  const ip = env.VERCEL === '1' ? header(req, 'x-vercel-forwarded-for').split(',')[0].trim() : req.socket?.remoteAddress;
  if (!isIP(ip || '')) throw error(503, 'temporarily_unavailable');
  // Group IPv6 /64 addresses to reduce trivial privacy-address rotation.
  return hmac(secret, `ip:${clientIdentity(ip)}`);
}

function createMemoryStore({ now = Date.now, maxEntries = 4096 } = {}) {
  const entries = new Map();
  function prune() { const time = now(); for (const [key, value] of entries) if (value.expires <= time) entries.delete(key); }
  return {
    async begin(id, digest, client) {
      prune();
      const key = `submission:${id}`; const old = entries.get(key);
      if (old && old.digest !== digest) return { state: 'conflict' };
      if (old?.sent) return { state: 'sent' };
      if (old?.pendingUntil > now()) return { state: 'pending', retryAfter: 10 };
      const counters = RATE_RULES.map(rule => ({ ...rule, key: rule.scope === 'ip' ? `ip:${client}` : rule.scope }));
      for (const rule of counters) {
        const current = entries.get(rule.key);
        if ((current?.count || 0) >= rule.limit) return { state: 'limited', retryAfter: Math.max(1, Math.ceil((current.expires - now()) / 1000)) };
      }
      if (entries.size + 4 > maxEntries) return { state: 'limited', retryAfter: 60 };
      for (const rule of counters) {
        const current = entries.get(rule.key) || { count: 0, expires: now() + rule.seconds * 1000 };
        current.count++; entries.set(rule.key, current);
      }
      entries.set(key, { digest, pendingUntil: now() + 30_000, expires: old?.expires || now() + RETENTION_MS });
      return { state: 'started' };
    },
    async finish(id, digest, sent) {
      const entry = entries.get(`submission:${id}`);
      if (entry?.digest === digest) { entry.pendingUntil = 0; if (sent) entry.sent = true; }
    }
  };
}

const REDIS_BEGIN = `
local old = redis.call('GET', KEYS[1])
if old then
  if string.sub(old,1,64) ~= ARGV[1] then return {'conflict',0} end
  if string.sub(old,65) == ':sent' then return {'sent',0} end
end
if redis.call('EXISTS',KEYS[2]) == 1 then return {'pending',10} end
for i=3,5 do
  local count=tonumber(redis.call('GET',KEYS[i]) or '0')
  if count >= tonumber(ARGV[(i-3)*2+3]) then return {'limited',math.max(1,redis.call('TTL',KEYS[i]))} end
end
for i=3,5 do
  local n=redis.call('INCR',KEYS[i])
  if n == 1 then redis.call('EXPIRE',KEYS[i],ARGV[(i-3)*2+4]) end
end
if not old then redis.call('SET',KEYS[1],ARGV[1],'EX',90000) end
redis.call('SET',KEYS[2],ARGV[2],'EX',30)
return {'started',0}`;
const REDIS_FINISH = `
if redis.call('GET',KEYS[2]) ~= ARGV[2] then return 0 end
if ARGV[3] == '1' then redis.call('SET',KEYS[1],ARGV[1]..':sent','EX',90000) end
redis.call('DEL',KEYS[2])
return 1`;

function createRedisStore(config, fetchImpl) {
  const prefix = 'lesmis-contact:v1:';
  const locks = new Map();
  async function command(args) {
    const response = await fetchImpl(config.redisUrl, { method: 'POST', headers: { Authorization: `Bearer ${config.redisToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args), signal: AbortSignal.timeout(4000), redirect: 'error' });
    if (!response.ok) throw error(503, 'temporarily_unavailable');
    const body = await response.json();
    if (body.error || body.result === undefined) throw error(503, 'temporarily_unavailable');
    return body.result;
  }
  return {
    async begin(id, digest, client) {
      const lock = randomUUID();
      const result = await command(['EVAL', REDIS_BEGIN, 5, `${prefix}submission:${id}`, `${prefix}lock:${id}`, `${prefix}ip:${client}`, `${prefix}hour`, `${prefix}day`, digest, lock, ...RATE_RULES.flatMap(x => [x.limit, x.seconds])]);
      if (!Array.isArray(result) || !['started', 'sent', 'pending', 'limited', 'conflict'].includes(result[0])) throw error(503, 'temporarily_unavailable');
      if (result[0] === 'started') locks.set(id, lock);
      return { state: result[0], retryAfter: Number(result[1]) || 0 };
    },
    async finish(id, digest, sent) {
      const lock = locks.get(id); locks.delete(id);
      if (lock) await command(['EVAL', REDIS_FINISH, 2, `${prefix}submission:${id}`, `${prefix}lock:${id}`, digest, lock, sent ? '1' : '0']);
    }
  };
}

function emailPayload(data, config) {
  return {
    from: config.sender, to: [config.recipient],
    subject: `Beyond the Barricade: ${CATEGORIES[data.category]}`,
    text: [`Category: ${CATEGORIES[data.category]}`, `Language: ${data.lang}`, `Name: ${data.name || '(not provided)'}`, `Reply address: ${data.email || '(not provided)'}`, '', data.message].join('\n'),
    ...(data.email ? { reply_to: data.email } : {})
  };
}

function formsubmitPayload(data, origin) {
  return {
    name: data.name || '(not provided)',
    ...(data.email ? { email: data.email, _replyto: data.email } : {}),
    message: data.message, topic: CATEGORIES[data.category], language: data.lang,
    _subject: `Beyond the Barricade: ${CATEGORIES[data.category]}`,
    _url: `${origin}/${data.lang}/contact/`, _template: 'table', _captcha: 'false'
  };
}

function createContactHandler({ env = process.env, fetchImpl = globalThis.fetch, now = Date.now, store } = {}) {
  const memory = createMemoryStore({ now });
  return async function contact(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Vary', 'Origin');
    const respond = (status, body) => { res.statusCode = status; res.end(JSON.stringify(body)); };
    try {
      const method = req.method || 'GET';
      if (!['GET', 'POST'].includes(method)) { res.setHeader('Allow', 'GET, POST'); throw error(405, 'method_not_allowed'); }
      const config = getConfig(env);
      if (!config) return respond(503, { ok: false, available: false, code: 'not_configured', ...(method === 'GET' ? { provider: env.CONTACT_PROVIDER === 'resend' ? 'resend' : 'formsubmit' } : {}) });
      sameOrigin(req, config, method);
      if (method === 'GET') return respond(200, { ok: true, available: true, provider: config.provider, ticket: createTicket(config, now()) });
      const body = await readBody(req);
      const data = validatePayload(body);
      const ticket = validateTicket(body.ticket, config, now());
      const client = getClientKey(req, env, config.secret);
      const payload = config.provider === 'formsubmit' ? formsubmitPayload(data, header(req, 'origin')) : emailPayload(data, config);
      const digest = hmac(config.secret, JSON.stringify(payload));
      const stateStore = store || (config.mode === 'redis' ? createRedisStore(config, fetchImpl) : memory);
      const result = await stateStore.begin(ticket.id, digest, client);
      if (result.state === 'sent') return respond(200, { ok: true, code: 'accepted' });
      if (result.state === 'conflict') throw error(409, 'submission_changed');
      if (result.state === 'pending') throw error(409, 'in_progress', undefined, result.retryAfter);
      if (result.state === 'limited') throw error(429, 'rate_limited', undefined, result.retryAfter);
      if (result.state !== 'started') throw error(503, 'temporarily_unavailable');
      let accepted = false;
      try {
        const isFormSubmit = config.provider === 'formsubmit';
        const endpoint = isFormSubmit ? `https://formsubmit.co/ajax/${config.formsubmitAlias}` : 'https://api.resend.com/emails';
        const headers = isFormSubmit
          ? { 'Content-Type': 'application/json', Accept: 'application/json', Origin: header(req, 'origin'), Referer: payload._url }
          : { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `lesmis-contact/${ticket.id}` };
        const response = await fetchImpl(endpoint, {
          method: 'POST', headers,
          body: JSON.stringify(payload), signal: AbortSignal.timeout(8000), redirect: 'error'
        });
        // Provider errors are deliberately not echoed or logged: they may include private addresses.
        const result = await response.json().catch(() => null);
        if (isFormSubmit && /activat|confirm|verif|disabled|inactive|captcha/i.test(typeof result?.message === 'string' ? result.message : '')) throw error(503, 'activation_required');
        if (!response.ok) throw error(response.status === 429 ? 429 : 502, response.status === 429 ? 'rate_limited' : 'delivery_unconfirmed', undefined, response.status === 429 ? 60 : undefined);
        if (isFormSubmit) {
          if (result?.success !== true && result?.success !== 'true') throw error(502, 'delivery_unconfirmed');
        } else if (typeof result?.id !== 'string' || !result.id) throw error(502, 'delivery_unconfirmed');
        accepted = true;
      } catch (problem) {
        if (problem instanceof ContactError) throw problem;
        throw error(502, 'delivery_unconfirmed');
      } finally {
        // Resend has provider-side deduplication. FormSubmit does not document it;
        // its uncertain outcomes are never retried automatically and may duplicate on manual retry.
        try { await stateStore.finish(ticket.id, digest, accepted); } catch { /* Never log message data or credentials. */ }
      }
      return respond(202, { ok: true, code: 'accepted' });
    } catch (problem) {
      const safe = problem instanceof ContactError ? problem : error(503, 'temporarily_unavailable');
      if (safe.retryAfter) res.setHeader('Retry-After', String(safe.retryAfter));
      return respond(safe.status, { ok: false, code: safe.code, ...(safe.fields ? { fields: safe.fields } : {}) });
    }
  };
}

module.exports = { createContactHandler, createMemoryStore, createRedisStore, createTicket, getConfig, validatePayload, validateTicket, emailPayload, formsubmitPayload, clientIdentity, MAX_BODY_BYTES, TICKET_LIFETIME_MS };
