/**
 * The one place that talks to the GBIF API.
 *
 * - Identical requests made at the same time share a single request.
 * - Successful responses are remembered for the life of the page, so repeated
 *   lookups (several cards for one taxon, paging back and forth) cost nothing.
 * - How long a response stays *fresh* is left to the browser's HTTP cache and
 *   the API's `Cache-Control` headers. This module sets no expiry of its own,
 *   so a new page load always revalidates according to those headers.
 * - Failures are never remembered.
 * - Memory is bounded: past MAX_ENTRIES the oldest responses are dropped, which
 *   only matters for long-lived pages. A dropped response is simply requested
 *   again, usually straight from the HTTP cache.
 */

const MAX_ENTRIES = 200;
const cache = new Map();

export class GbifApiError extends Error {
  constructor(message, { url, status = 0 } = {}) {
    super(message);
    this.name = 'GbifApiError';
    this.url = url;
    this.status = status;
  }
}

/**
 * Build a URL from a base, a path and a params object. `undefined`, `null` and
 * empty values are skipped, and array values produce repeated parameters.
 */
export function buildUrl(base, path, params = {}) {
  const url = new URL(path, base.endsWith('/') ? base : `${base}/`);
  for (const [name, value] of Object.entries(params)) {
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.append(name, String(v));
    }
  }
  return url.toString();
}

/** Fetch JSON, sharing identical in-flight requests and remembering successes. */
export function getJson(url) {
  const hit = cache.get(url);
  if (hit) return hit;

  const promise = fetch(url, { headers: { Accept: 'application/json' } })
    .then((res) => {
      if (!res.ok) throw new GbifApiError(`HTTP ${res.status}`, { url, status: res.status });
      return res.json();
    })
    .catch((err) => {
      // Only forget this request, not a newer one that replaced it for the same URL.
      if (cache.get(url) === promise) cache.delete(url);
      if (err instanceof GbifApiError) throw err;
      throw new GbifApiError(err.message || 'Network error', { url });
    });

  cache.set(url, promise);
  // Maps keep insertion order, so the first key is the oldest entry.
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value);
  return promise;
}

/** Forget all cached responses (mainly useful in tests). */
export function clearCache() {
  cache.clear();
}
