import { md5 } from './md5.js';

/**
 * The one place that talks to the GBIF API.
 *
 * - Identical requests made at the same time share a single request.
 * - Successful responses are remembered for the life of the page (up to
 *   MAX_ENTRIES, oldest dropped first).
 * - They are also kept in `sessionStorage` for as long as the API's own
 *   `Cache-Control: max-age` says they are fresh. The API also sends
 *   `Pragma: no-cache` and `Expires: 0`, which makes browsers ignore the
 *   max-age and fetch again on every page view; this layer restores the
 *   freshness the API actually asks for. It is per tab, holds nothing
 *   personal, and every part of it is optional: if storage is unavailable or
 *   full, requests simply go to the network. It never uses more than
 *   MAX_STORED_TOTAL characters (the oldest entries go first), so it cannot
 *   crowd out what the host page keeps there.
 * - Failures are never remembered.
 * - Requests time out, so a hung connection ends in an error, not an endless
 *   "Loading".
 * - At most MAX_CONCURRENT requests are in flight at once, the rest wait their turn. A browser
 *   will send dozens at once over HTTP/2, and a page of many components does, which the API
 *   answers with 429s ("too many requests").
 * - A 429 or 503 answer, or a request that got no readable answer at all, is tried again after
 *   a pause that doubles (up to MAX_RETRIES times). The API does not let browsers read
 *   `Retry-After`, so the pause is a guess. Anything else, and a timeout, is an error.
 */

const MAX_ENTRIES = 200;
// session storage belongs to the host page's origin and is shared with the page's own code (its quota is
// about 5 MB for everyone), so this layer keeps to a small budget of its own and drops its oldest entries first.
const MAX_STORED_ENTRY = 100_000;
const MAX_STORED_TOTAL = 1_000_000;
const MAX_FRESH_SECONDS = 3600;
const STORAGE_PREFIX = 'gbif-components:v1:';

const cache = new Map();
let requestTimeoutMs = 15000;
let retryDelayMs = 1200;
const RETRY_STATUSES = [429, 503];
const MAX_RETRIES = 2;
const MAX_CONCURRENT = 4;

let running = 0;
const waiting = [];

/** Wait for a turn; resolves to the function that gives it back. */
function takeTurn() {
  return new Promise((resolve) => {
    const start = () => {
      running += 1;
      resolve(() => {
        running -= 1;
        waiting.shift()?.();
      });
    };
    if (running < MAX_CONCURRENT) start();
    else waiting.push(start);
  });
}

/**
 * Worth one more try: the API is busy or unavailable, or the request never got an answer
 * a browser can read. A rate limiter in front of the API may answer 429 without the CORS
 * headers that let a page see the status, which looks just like a dropped connection.
 * A timeout is not retried: it has already waited long enough.
 */
const shouldRetry = (err) => RETRY_STATUSES.includes(err.status) || (err.status === 0 && !err.timedOut);

/** How long to wait before the first retry; each next one waits twice as long (mainly for tests). */
export function setRetryDelay(ms) {
  retryDelayMs = Number.isFinite(ms) && ms >= 0 ? ms : 1200;
}

export function setRequestTimeout(ms) {
  requestTimeoutMs = Number.isFinite(ms) && ms > 0 ? ms : 15000;
}

export class GbifApiError extends Error {
  constructor(message, { url, status = 0, timedOut = false } = {}) {
    super(message);
    this.name = 'GbifApiError';
    this.url = url;
    this.status = status;
    this.timedOut = timedOut;
  }
}

/**
 * Build a URL from a base, a path and a params object. The base may include a
 * path prefix (a proxy) or be relative to the page. `undefined`, `null` and
 * empty values are skipped, and array values produce repeated parameters.
 */
export function buildUrl(base, path, params = {}) {
  const root = new URL(base.endsWith('/') ? base : `${base}/`, globalThis.location?.href);
  const url = new URL(path.replace(/^\/+/, ''), root);
  for (const [name, value] of Object.entries(params)) {
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.append(name, String(v));
    }
  }
  return url.toString();
}

/** Seconds a response may be reused, from its `Cache-Control` header (0 if none). */
export function freshSeconds(cacheControl) {
  if (!cacheControl || /no-store|private/i.test(cacheControl)) return 0;
  const match = /max-age=(\d+)/i.exec(cacheControl);
  return match ? Math.min(Number(match[1]), MAX_FRESH_SECONDS) : 0;
}

function readStored(url) {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + url);
    if (!raw) return undefined;
    const { expires, data } = JSON.parse(raw);
    if (Date.now() < expires) return data;
    sessionStorage.removeItem(STORAGE_PREFIX + url);
  } catch {
    // Storage unavailable or entry unreadable: fall back to the network.
  }
  return undefined;
}

/** What this layer has stored: `{ key, size, at, expires }` for each entry, read cheaply from the front of each. */
function storedEntries() {
  const entries = [];
  for (const key of Object.keys(sessionStorage)) {
    if (!key.startsWith(STORAGE_PREFIX)) continue;
    const raw = sessionStorage.getItem(key) ?? '';
    const head = /^\{"at":(\d+),"expires":(\d+)/.exec(raw);
    entries.push({ key, size: key.length + raw.length, at: head ? Number(head[1]) : 0, expires: head ? Number(head[2]) : 0 });
  }
  return entries;
}

function clearStored() {
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(STORAGE_PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

function writeStored(url, data, seconds) {
  if (!(seconds > 0)) return;
  try {
    const now = Date.now();
    const raw = JSON.stringify({ at: now, expires: now + seconds * 1000, data });
    const key = STORAGE_PREFIX + url;
    if (key.length + raw.length > MAX_STORED_ENTRY) return;

    // Make room: expired entries first, then the oldest, until this one fits the budget.
    const others = storedEntries().filter((entry) => entry.key !== key);
    others.sort((a, b) => (a.expires < now ? -1 : 0) - (b.expires < now ? -1 : 0) || a.at - b.at);
    let used = others.reduce((sum, entry) => sum + entry.size, 0);
    while (others.length && used + key.length + raw.length > MAX_STORED_TOTAL) {
      const oldest = others.shift();
      sessionStorage.removeItem(oldest.key);
      used -= oldest.size;
    }
    sessionStorage.setItem(key, raw);
  } catch {
    clearStored(); // most likely full (the host page's own data may fill it): give back all of ours
  }
}

/**
 * One request: `call.url`, a `call.init` for fetch (method, body), and `call.storageKey`
 * under which the answer is kept in session storage.
 */
async function attempt(call) {
  const { url, init } = call;
  const release = await takeTurn();
  // The time limit starts when the request does, not while it waits its turn.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const res = await fetch(url, { ...init, headers: { Accept: 'application/json', ...init?.headers }, signal: controller.signal });
    if (!res.ok) throw new GbifApiError(`HTTP ${res.status}`, { url, status: res.status });
    let data;
    try {
      data = await res.json();
    } catch {
      // An answer that is not JSON will not be JSON next time either: not worth a retry (status is the answer's, not 0).
      throw new GbifApiError('The answer was not JSON', { url, status: res.status || 200 });
    }
    writeStored(call.storageKey, data, freshSeconds(res.headers?.get?.('cache-control')));
    return data;
  } catch (err) {
    if (err instanceof GbifApiError) throw err;
    if (controller.signal.aborted) throw new GbifApiError('Request timed out', { url, timedOut: true });
    throw new GbifApiError(err.message || 'Network error', { url });
  } finally {
    clearTimeout(timer);
    release();
  }
}

async function request(call) {
  const stored = readStored(call.storageKey);
  if (stored !== undefined) return stored;
  for (let tried = 0; ; tried += 1) {
    try {
      return await attempt(call);
    } catch (err) {
      if (tried >= MAX_RETRIES || !shouldRetry(err)) throw err;
      // The pause grows each time, with a little randomness so that requests turned away together
      // do not all come back together. It is spent waiting, not holding a turn.
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs * 2 ** tried * (1 + Math.random() * 0.5)));
    }
  }
}

/** Share identical in-flight requests and remember successes, under `key`. */
function remembered(key, call) {
  const hit = cache.get(key);
  if (hit) return hit;

  const promise = request(call).catch((err) => {
    // Only forget this request, not a newer one that replaced it for the same key.
    if (cache.get(key) === promise) cache.delete(key);
    throw err;
  });

  cache.set(key, promise);
  // Maps keep insertion order, so the first key is the oldest entry.
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value);
  return promise;
}

/** Fetch JSON, sharing identical in-flight requests and remembering successes. */
export function getJson(url) {
  return remembered(url, { url, storageKey: url });
}

/**
 * POST a JSON body and read JSON back, with the same sharing, remembering and retrying as
 * `getJson`. A browser caches no POST, and the API's own `max-age` is honoured here instead:
 * the answer is remembered under the URL and the body (a hash of it, in session storage).
 * The body must be built the same way each time for two requests to be recognised as one.
 */
export function postJson(url, body) {
  const text = JSON.stringify(body);
  return remembered(`POST ${url} ${text}`, {
    url,
    init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: text },
    storageKey: `${url}#${md5(text)}`
  });
}

/**
 * Forget what is remembered in memory only, as a new page view would (mainly for tests).
 * Responses kept in session storage survive.
 */
export function clearMemoryCache() {
  cache.clear();
}

/** Forget everything remembered, in memory and in session storage (mainly for tests). */
export function clearCache() {
  cache.clear();
  clearStored();
}
