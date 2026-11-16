/**
 * The occurrence filters that visitors can set, and how each is validated.
 *
 * A filter value can come from a visitor's input, from the page's URL or from an
 * attribute, and the GBIF API answers an invalid value with an error (a country
 * it does not know, a year that is not a number, a reversed range). Every value
 * therefore passes through `normalize` before it reaches a request or a URL, and
 * an invalid value is dropped instead of being sent.
 *
 * Names are GBIF's own parameter names, so one query object becomes an API
 * request, a page URL and a link to GBIF.org without translation.
 */

/** Values of GBIF's basis-of-record vocabulary. */
export const BASIS_OF_RECORD = [
  'PRESERVED_SPECIMEN',
  'FOSSIL_SPECIMEN',
  'LIVING_SPECIMEN',
  'OBSERVATION',
  'HUMAN_OBSERVATION',
  'MACHINE_OBSERVATION',
  'MATERIAL_SAMPLE',
  'MATERIAL_CITATION',
  'LITERATURE',
  'OCCURRENCE',
  'UNKNOWN'
];

/** The licences a record can carry (this is the record's licence, not an image's). */
export const RECORD_LICENSES = {
  CC0_1_0: 'CC0 1.0',
  CC_BY_4_0: 'CC BY 4.0',
  CC_BY_NC_4_0: 'CC BY-NC 4.0'
};

/**
 * The country codes GBIF accepts: its own enumeration (GET /v1/enumeration/country) plus XZ, which the
 * occurrence search takes for international waters. This is not ISO 3166 as a whole: GBIF refuses codes such as
 * UK and EU, and takes XK (Kosovo) and XZ. A code outside this list is a request that GBIF answers with an error.
 */
export const COUNTRY_CODES = new Set(
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK XZ YE YT ZA ZM ZW'.split(' ')
);

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    return null;
  }
})();

const isKnownCountry = (code) => COUNTRY_CODES.has(code);

/** Display name of a country code, in English. Falls back to the code. */
export function countryName(code) {
  if (code === 'XZ') return 'International waters';
  try {
    return regionNames?.of(code) || code;
  } catch {
    return code;
  }
}

const toList = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') return raw.split(/[,\s]+/);
  return raw === null || raw === undefined ? [] : [raw];
};

/** A normalizer for filters that take a list of values of one kind. */
const multi = (parseValue) => {
  const normalize = (raw) => {
    const values = [...new Set(toList(raw).map((v) => parseValue(String(v).trim())).filter(Boolean))];
    return values.length ? values : undefined;
  };
  normalize.parseValue = parseValue;
  return normalize;
};

/** Years: `2000`, `2000,2020`, `2000,*` or `*,1990` (also `2000-2020`). Reversed ranges are put right. */
function normalizeYear(raw) {
  const text = typeof raw === 'number' ? String(raw) : raw;
  if (typeof text !== 'string') return undefined;
  const parts = text
    .trim()
    .replace(/^(\d{1,4}|\*)\s*[-–]\s*(\d{1,4}|\*)$/, '$1,$2')
    .split(/\s*,\s*/);
  if (parts.length > 2 || parts.some((p) => !/^(\*|\d{1,4})$/.test(p))) return undefined;
  if (parts.length === 1) return parts[0] === '*' ? undefined : String(Number(parts[0]));
  const [from, to] = parts;
  if (from === '*' && to === '*') return undefined;
  if (from !== '*' && to !== '*') {
    const [low, high] = Number(from) <= Number(to) ? [from, to] : [to, from];
    return `${Number(low)},${Number(high)}`;
  }
  return `${from === '*' ? '*' : Number(from)},${to === '*' ? '*' : Number(to)}`;
}

/**
 * The filters. `type` decides how the panel shows them and how they go into a
 * URL: `multi` (several values), `range`, `text`, `flag`. `facet` is the API's
 * name for the counts shown next to a multi filter's values.
 */
export const FILTERS = {
  q: {
    type: 'text',
    label: 'Search',
    normalize: (raw) => (typeof raw === 'string' && raw.trim() ? [...raw.trim()].slice(0, 200).join('') : undefined)
  },
  country: {
    type: 'multi',
    label: 'Country',
    facet: 'COUNTRY',
    normalize: multi((v) => (/^[A-Za-z]{2}$/.test(v) && isKnownCountry(v.toUpperCase()) ? v.toUpperCase() : null))
  },
  basisOfRecord: {
    type: 'multi',
    label: 'Basis of record',
    facet: 'BASIS_OF_RECORD',
    normalize: multi((v) => (BASIS_OF_RECORD.includes(v.toUpperCase()) ? v.toUpperCase() : null))
  },
  year: { type: 'range', label: 'Year', normalize: normalizeYear },
  license: {
    type: 'multi',
    label: 'Record licence',
    facet: 'LICENSE',
    normalize: multi((v) => (RECORD_LICENSES[v.toUpperCase()] ? v.toUpperCase() : null))
  },
  hasCoordinate: {
    type: 'flag',
    label: 'Only records with coordinates',
    normalize: (raw) => (raw === true || raw === 'true' ? true : undefined)
  }
};

/** Normalize one filter's value. `undefined` means "no filter". */
export function normalizeFilter(key, raw) {
  return Object.hasOwn(FILTERS, key) ? FILTERS[key].normalize(raw) : undefined;
}

/**
 * What is wrong with a filter value that was given, or `undefined` if it is fine or not given. For a list, any
 * value that cannot be used counts: `country="NO XX"` is a mistake, not a request for Norway. Used for the
 * page author's own attributes, where dropping a value would silently widen the search.
 */
export function filterProblem(key, raw) {
  if (!Object.hasOwn(FILTERS, key)) return undefined;
  if (raw === undefined || raw === null || raw === false) return undefined;
  const given = typeof raw === 'string' ? raw.trim() : raw;
  if (given === '' || (Array.isArray(given) && !given.length)) return undefined;
  const filter = FILTERS[key];
  if (filter.normalize.parseValue) {
    const bad = toList(given).map((v) => String(v).trim()).filter((v) => v && !filter.normalize.parseValue(v));
    return bad.length ? `${filter.label}: "${bad.join('", "')}" is not a value GBIF accepts` : undefined;
  }
  return filter.normalize(given) === undefined ? `${filter.label}: "${given}" is not a value GBIF accepts` : undefined;
}

/** Keep only known filters, each normalized. */
export function normalizeQuery(raw = {}) {
  const query = {};
  for (const key of Object.keys(FILTERS)) {
    if (!(key in raw)) continue;
    const value = normalizeFilter(key, raw[key]);
    if (value !== undefined) query[key] = value;
  }
  return query;
}

/** Apply a patch to a query; a value that normalizes to nothing removes that filter. */
export function mergeQuery(query, patch = {}) {
  const next = { ...query };
  for (const [key, value] of Object.entries(patch)) {
    if (!Object.hasOwn(FILTERS, key)) continue;
    const normalized = normalizeFilter(key, value);
    if (normalized === undefined) delete next[key];
    else next[key] = normalized;
  }
  return next;
}

export function sameQuery(a, b) {
  const sorted = (q) => JSON.stringify(Object.keys(q).sort().map((k) => [k, q[k]]));
  return sorted(a) === sorted(b);
}

/** A query as request parameters (arrays become repeated parameters). */
export function toParams(query) {
  const params = {};
  for (const [key, value] of Object.entries(query)) params[key] = value === true ? 'true' : value;
  return params;
}

/** Read a query out of a page's URL, where each filter is named `<prefix><filter>`. */
export function readUrlQuery(searchParams, prefix = '') {
  const raw = {};
  for (const [key, filter] of Object.entries(FILTERS)) {
    const values = searchParams.getAll(prefix + key);
    if (!values.length) continue;
    raw[key] = filter.type === 'multi' ? values : values[values.length - 1];
  }
  return normalizeQuery(raw);
}

/**
 * Write a query into a URL, replacing whatever filters were there. Every other parameter is kept exactly as
 * it was written (no re-encoding, no added `=`), because a router on the host page may read the raw text.
 */
export function writeUrlQuery(url, query, prefix = '') {
  const ours = new Set(Object.keys(FILTERS).map((key) => prefix + key));
  const nameOf = (segment) => {
    const raw = segment.split('=', 1)[0].replace(/\+/g, ' ');
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  };
  const kept = url.search
    .replace(/^\?/, '')
    .split('&')
    .filter((segment) => segment && !ours.has(nameOf(segment)));
  const added = new URLSearchParams();
  for (const [key, value] of Object.entries(toParams(query))) {
    for (const v of Array.isArray(value) ? value : [value]) added.append(prefix + key, v);
  }
  const text = added.toString();
  const all = text ? [...kept, text] : kept;
  url.search = all.join('&');
  return url;
}
