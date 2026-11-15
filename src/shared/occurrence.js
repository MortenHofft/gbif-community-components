import { buildUrl, getJson, postJson } from './api.js';
import { md5 } from './md5.js';
import { formatLicense, safeHttpUrl } from './format.js';
import { FILTERS, RECORD_LICENSES } from './filters.js';

/**
 * Occurrence search: the requests behind the filter panel, the table and the
 * gallery, and the helpers that turn what comes back into something to show.
 * Everything from the API is treated as untrusted.
 */

/**
 * GBIF does not page past this many results: a request is refused when `offset + limit`
 * goes beyond 100,001 (checked: 99,981 + 20 is accepted, 99,990 + 20 is a 400). The
 * table and gallery stop at 100,000.
 */
export const MAX_RESULTS = 100000;

/** One page of occurrence search results for a set of request parameters. */
export async function searchOccurrences({ apiBase, params, limit, offset }) {
  // The last page the API allows may be shorter than the others.
  const allowed = Math.max(0, Math.min(limit, MAX_RESULTS - offset));
  const data = await getJson(buildUrl(apiBase, '/v1/occurrence/search', { ...params, limit: allowed, offset }));
  return {
    count: typeof data?.count === 'number' ? data.count : 0,
    results: (Array.isArray(data?.results) ? data.results : []).filter((row) => row && typeof row === 'object')
  };
}

/**
 * Counts for the values of some filters, under the current filters. A filter's own
 * values are counted as if it were not set (`facetMultiselect`), so choosing one
 * country still shows the others.
 */
export async function fetchFacets({ apiBase, params, facets, facetLimit = 15 }) {
  const data = await getJson(
    buildUrl(apiBase, '/v1/occurrence/search', {
      ...params,
      limit: 0,
      facet: facets,
      facetLimit,
      facetMincount: 1,
      facetMultiselect: true
    })
  );
  const byField = {};
  for (const facet of Array.isArray(data?.facets) ? data.facets : []) {
    if (!facet || typeof facet.field !== 'string') continue;
    byField[facet.field] = (Array.isArray(facet?.counts) ? facet.counts : [])
      .filter((c) => c && typeof c.name === 'string' && typeof c.count === 'number')
      .map((c) => ({ name: c.name, count: c.count }));
  }
  return { count: typeof data?.count === 'number' ? data.count : 0, facets: byField };
}

/* ---------- the same questions, asked with a predicate ---------- */

const PREDICATE_URL = '/v1/occurrence/search/predicate';

function pageFrom(data) {
  return {
    count: typeof data?.count === 'number' ? data.count : 0,
    results: (Array.isArray(data?.results) ? data.results : []).filter((row) => row && typeof row === 'object')
  };
}

/**
 * One page of results for a predicate (`q`, if there is one, goes beside it). Never sent without a
 * predicate: the API would answer with everything it has.
 */
export async function searchOccurrencesByPredicate({ apiBase, predicate, q, limit, offset }) {
  if (!predicate) throw new Error('A predicate search needs a predicate.');
  const allowed = Math.max(0, Math.min(limit, MAX_RESULTS - offset));
  const body = { limit: allowed, offset, predicate, ...(q ? { q } : {}) };
  return pageFrom(await postJson(buildUrl(apiBase, PREDICATE_URL), body));
}

/**
 * Counts for the values of some filters, like `fetchFacets`, but for a predicate search. There
 * `facetMultiselect` has no effect: a facet is narrowed by every part of the predicate, its own
 * filter's included. So a facet whose filter the visitor has set is asked for in a request that
 * leaves that filter out, and the others share one request with the total. The page author's
 * subset is part of every request, so it always applies in full.
 *
 * `build(without)` gives `{ predicate, q }` for the filters in force except those named.
 * `filters` are the filter names to count, and `active` the ones the visitor has set.
 */
export async function fetchFacetsByPredicate({ apiBase, build, filters, active, facetLimit = 15 }) {
  const url = buildUrl(apiBase, PREDICATE_URL);
  const asked = filters.filter((key) => FILTERS[key]?.facet);
  const own = asked.filter((key) => active.has(key));
  const shared = asked.filter((key) => !active.has(key));

  const ask = (without, keys) => {
    const { predicate, q } = build(without);
    if (!predicate) throw new Error('A predicate search needs a predicate.');
    return postJson(url, {
      limit: 0,
      predicate,
      ...(q ? { q } : {}),
      ...(keys.length ? { facets: keys.map((key) => FILTERS[key].facet), facetLimit, facetMincount: 1, facetMultiselect: false } : {})
    });
  };

  // The first request has the filters in force, so its count is the total. It also carries the
  // facets of filters that are not set. Each facet of a filter that is set gets its own request.
  const answers = await Promise.all([ask([], shared), ...own.map((key) => ask([key], [key]))]);
  const byField = {};
  for (const data of answers) {
    for (const facet of Array.isArray(data?.facets) ? data.facets : []) {
      if (!facet || typeof facet.field !== 'string') continue;
      byField[facet.field] = (Array.isArray(facet.counts) ? facet.counts : [])
        .filter((c) => c && typeof c.name === 'string' && typeof c.count === 'number')
        .map((c) => ({ name: c.name, count: c.count }));
    }
  }
  return { count: typeof answers[0]?.count === 'number' ? answers[0].count : 0, facets: byField };
}

/** `HUMAN_OBSERVATION` -> `Human observation` */
export function basisLabel(basis) {
  if (typeof basis !== 'string' || !basis) return '';
  const text = basis.toLowerCase().replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The label of a record licence, from the facet value (`CC_BY_4_0`) or the record's URL. */
export function recordLicenseLabel(value) {
  if (typeof value !== 'string' || !value) return '';
  if (RECORD_LICENSES[value]) return RECORD_LICENSES[value];
  return formatLicense(value)?.label ?? '';
}

/** `2026-01-02T12:30:25` -> `2026-01-02`; other forms (a range, a bare year) are shown as given. */
export function dateLabel(value) {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  return /^\d{4}-\d{2}-\d{2}T/.test(text) ? text.slice(0, 10) : text;
}

/** The columns the table can show. A `columns` attribute chooses from these, in order. */
export const COLUMNS = {
  scientificName: { label: 'Scientific name', value: (r) => r.scientificName },
  country: { label: 'Country', value: (r) => r.country },
  eventDate: { label: 'Date', value: (r) => dateLabel(r.eventDate) },
  year: { label: 'Year', value: (r) => (typeof r.year === 'number' ? String(r.year) : '') },
  basisOfRecord: { label: 'Basis of record', value: (r) => basisLabel(r.basisOfRecord) },
  recordedBy: { label: 'Recorded by', value: (r) => (typeof r.recordedBy === 'string' ? r.recordedBy : '') },
  dataset: { label: 'Dataset', value: (r) => r.datasetName },
  institution: {
    label: 'Institution',
    value: (r) => [r.institutionCode, r.catalogNumber].filter((x) => typeof x === 'string' && x).join(' ')
  },
  license: { label: 'Licence', value: (r) => recordLicenseLabel(r.license) }
};
export const DEFAULT_COLUMNS = ['scientificName', 'country', 'eventDate', 'basisOfRecord', 'dataset'];

/** Turn a `columns` attribute into a list of known column keys (unknown names are ignored). */
export function parseColumns(attribute) {
  const keys = typeof attribute === 'string' ? attribute.split(/[\s,]+/).filter((k) => Object.hasOwn(COLUMNS, k)) : [];
  return keys.length ? [...new Set(keys)] : DEFAULT_COLUMNS;
}

/** A cell's text: always a string, whatever the API sent. */
export function cellText(column, row) {
  const value = COLUMNS[column].value(row);
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * The first still image of an occurrence that can be shown, or `null`. The image
 * and licence URLs must be http(s), because the publisher chooses them.
 */
export function firstImage(row) {
  const item = (Array.isArray(row?.media) ? row.media : []).find(
    (m) => m && typeof m === 'object' && m.type === 'StillImage' && safeHttpUrl(m.identifier)
  );
  if (!item) return null;
  const license = formatLicense(item.license);
  const text = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  return {
    // The exact string from the API: GBIF names the image after a hash of it.
    identifier: item.identifier,
    occurrenceKey: String(row.key),
    rightsHolder: text(item.rightsHolder) ?? text(item.creator),
    license,
    licenseKey: license?.key ?? 'unknown',
    name: text(row.scientificName),
    country: text(row.country)
  };
}

/**
 * A small version of an image from GBIF's image cache, which is addressed by the
 * occurrence and a hash of the image's own URL. Visitors' browsers then ask GBIF
 * for the picture instead of the publisher's server, and get a fraction of the bytes.
 */
export function thumbnailUrl({ apiBase, occurrenceKey, identifier, width = 400 }) {
  return buildUrl(apiBase, `/v1/image/cache/fit-in/${width}x/occurrence/${encodeURIComponent(occurrenceKey)}/media/${md5(identifier)}`);
}

