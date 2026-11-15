/**
 * The one place that talks to the GBIF API.
 *
 * - Identical requests made while one is in flight share a single request.
 * - Successful responses are kept for a short time so repeated lookups (for
 *   example several cards for the same taxon) cost one request.
 * - Failures are never cached.
 */

const CACHE_TTL_MS = 5 * 60 * 1000;
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

/** Fetch JSON with in-flight de-duplication and a short-lived cache. */
export function getJson(url) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.time < CACHE_TTL_MS) return hit.promise;

  const promise = fetch(url, { headers: { Accept: 'application/json' } })
    .then((res) => {
      if (!res.ok) throw new GbifApiError(`HTTP ${res.status}`, { url, status: res.status });
      return res.json();
    })
    .catch((err) => {
      cache.delete(url);
      if (err instanceof GbifApiError) throw err;
      throw new GbifApiError(err.message || 'Network error', { url });
    });

  cache.set(url, { time: Date.now(), promise });
  return promise;
}

/** Forget all cached responses (mainly useful in tests). */
export function clearCache() {
  cache.clear();
}
