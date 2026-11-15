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
 *   full, requests simply go to the network.
 * - Failures are never remembered.
 * - Requests time out, so a hung connection ends in an error, not an endless
 *   "Loading".
 */

const MAX_ENTRIES = 200;
const MAX_STORED_BYTES = 200_000;
const MAX_FRESH_SECONDS = 3600;
const STORAGE_PREFIX = 'gbif-components:v1:';

const cache = new Map();
let requestTimeoutMs = 15000;

export function setRequestTimeout(ms) {
  requestTimeoutMs = Number.isFinite(ms) && ms > 0 ? ms : 15000;
}

export class GbifApiError extends Error {
  constructor(message, { url, status = 0 } = {}) {
    super(message);
    this.name = 'GbifApiError';
    this.url = url;
    this.status = status;
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
    const raw = JSON.stringify({ expires: Date.now() + seconds * 1000, data });
    if (raw.length > MAX_STORED_BYTES) return;
    sessionStorage.setItem(STORAGE_PREFIX + url, raw);
  } catch {
    clearStored(); // most likely full: start over rather than fail
  }
}

async function request(url) {
  const stored = readStored(url);
  if (stored !== undefined) return stored;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!res.ok) throw new GbifApiError(`HTTP ${res.status}`, { url, status: res.status });
    const data = await res.json();
    writeStored(url, data, freshSeconds(res.headers?.get?.('cache-control')));
    return data;
  } catch (err) {
    if (err instanceof GbifApiError) throw err;
    if (controller.signal.aborted) throw new GbifApiError('Request timed out', { url });
    throw new GbifApiError(err.message || 'Network error', { url });
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch JSON, sharing identical in-flight requests and remembering successes. */
export function getJson(url) {
  const hit = cache.get(url);
  if (hit) return hit;

  const promise = request(url).catch((err) => {
    // Only forget this request, not a newer one that replaced it for the same URL.
    if (cache.get(url) === promise) cache.delete(url);
    throw err;
  });

  cache.set(url, promise);
  // Maps keep insertion order, so the first key is the oldest entry.
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value);
  return promise;
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
