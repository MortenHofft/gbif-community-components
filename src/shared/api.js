/**
 * The one place that talks to the GBIF API.
 *
 * - Identical requests made at the same time share a single request.
 * - Successful responses are remembered for the life of the page (up to
 *   MAX_ENTRIES, oldest dropped first).
 * - Nothing is written to `sessionStorage` or any other storage that belongs to the host page. The browser's
 *   own HTTP cache is left to do what it does. (GBIF sends `Pragma: no-cache` along with its `max-age`, so
 *   browsers fetch again on a reload; a caching proxy in front of the API, set with `apiBase`, is the way to
 *   keep that traffic off GBIF.)
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

/**
 * One request: `call.url` and a `call.init` for fetch (method, body).
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
  return remembered(url, { url });
}

/**
 * POST a JSON body and read JSON back, with the same sharing, remembering and retrying as
 * `getJson`. The answer is remembered, for the life of the page, under the URL and the body.
 * The body must be built the same way each time for two requests to be recognised as one.
 */
export function postJson(url, body) {
  const text = JSON.stringify(body);
  return remembered(`POST ${url} ${text}`, {
    url,
    init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: text }
  });
}

/** Forget everything remembered (mainly for tests). */
export function clearCache() {
  cache.clear();
}

/** The same: there is nothing else to forget now (kept so that tests that name it still read well). */
export const clearMemoryCache = clearCache;
