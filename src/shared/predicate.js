/**
 * Predicates: a page author's own subset of the occurrences, and the visitor's
 * filters expressed the same way, for GBIF's predicate search
 * (`POST /v1/occurrence/search/predicate`).
 *
 * A predicate can say what the plain filters cannot: `or`, `not`, a geometry, a long
 * list of dataset keys. The search element sends a request this way only when the
 * page gives it a `predicate`.
 *
 * What was checked against the API, and is relied on here:
 *   - Every filter means the same as its parameter in the plain search.
 *   - `checklistKey` belongs INSIDE a TAXON_KEY predicate. At the top of the request
 *     it is ignored, and the key is then read as a backbone key.
 *   - Free text is a top-level `q` beside the predicate. (A `fullTextSearch` predicate
 *     was refused whatever its field was called.)
 *   - `facetMultiselect` does nothing here: a facet is narrowed by every predicate,
 *     including one on its own field. Multiselect is done by leaving that filter out of
 *     the request for that facet (see `fetchFacetsByPredicate`).
 *   - A request without a predicate returns ALL of GBIF, so nothing here ever sends one.
 */

export const PREDICATE_TYPES = [
  'and',
  'equals',
  'fullTextSearch',
  'geoDistance',
  'greaterThan',
  'greaterThanOrEquals',
  'in',
  'isNotNull',
  'isNull',
  'lessThan',
  'lessThanOrEquals',
  'like',
  'not',
  'or',
  'range',
  'within'
];

const MAX_DEPTH = 10;
const MAX_NODES = 1000;
const MAX_TEXT = 100_000;
const COMPARISONS = ['equals', 'like', 'greaterThan', 'greaterThanOrEquals', 'lessThan', 'lessThanOrEquals'];
const isScalar = (v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Check the shape of a predicate. The API checks the rest (whether a key exists, what a
 * value may be) and says so with a 400; this catches what would otherwise be sent
 * badly or not at all. Returns a message, or `null` if the shape is fine.
 */
export function predicateProblem(node, depth = 0, counter = { nodes: 0 }) {
  if (++counter.nodes > MAX_NODES) return `it has more than ${MAX_NODES} parts`;
  if (depth > MAX_DEPTH) return `it is nested more than ${MAX_DEPTH} levels deep`;
  if (!isObject(node)) return 'a part of it is not an object';
  const { type } = node;
  if (!PREDICATE_TYPES.includes(type)) return `"${String(type)}" is not a predicate type (known: ${PREDICATE_TYPES.join(', ')})`;

  if (type === 'and' || type === 'or') {
    if (!Array.isArray(node.predicates) || !node.predicates.length) return `"${type}" needs a non-empty "predicates" list`;
    for (const child of node.predicates) {
      const problem = predicateProblem(child, depth + 1, counter);
      if (problem) return problem;
    }
    return null;
  }
  if (type === 'not') return predicateProblem(node.predicate, depth + 1, counter) ?? null;
  if (COMPARISONS.includes(type)) {
    if (typeof node.key !== 'string' || !node.key) return `"${type}" needs a "key"`;
    if (!isScalar(node.value)) return `"${type}" on ${node.key} needs a "value"`;
    return null;
  }
  if (type === 'in') {
    if (typeof node.key !== 'string' || !node.key) return '"in" needs a "key"';
    if (!Array.isArray(node.values) || !node.values.length || !node.values.every(isScalar)) return `"in" on ${node.key} needs a non-empty "values" list`;
    return null;
  }
  if (type === 'isNull' || type === 'isNotNull') return typeof node.parameter === 'string' && node.parameter ? null : `"${type}" needs a "parameter"`;
  if (type === 'within') return typeof node.geometry === 'string' && node.geometry ? null : '"within" needs a "geometry"';
  if (type === 'range') return typeof node.key === 'string' && node.key ? null : '"range" needs a "key"';
  return null; // geoDistance, fullTextSearch: left to the API
}

/** Read a predicate from the text of an attribute: `{ predicate }`, or `{ error }` that says what is wrong. */
export function parsePredicate(text) {
  if (typeof text !== 'string' || !text.trim()) return { error: 'it is empty' };
  if (text.length > MAX_TEXT) return { error: `it is longer than ${MAX_TEXT.toLocaleString()} characters` };
  let predicate;
  try {
    predicate = JSON.parse(text);
  } catch (error) {
    return { error: `it is not valid JSON (${error.message})` };
  }
  const problem = predicateProblem(predicate);
  return problem ? { error: problem } : { predicate };
}

/* ---------- the visitor's filters as predicates ---------- */

/** `a` or `a,b` where either end may be `*`, as `YEAR` comparisons. */
function yearPredicate(value) {
  const [from, to] = value.split(',');
  if (to === undefined) return { type: 'equals', key: 'YEAR', value: from };
  const parts = [];
  if (from !== '*') parts.push({ type: 'greaterThanOrEquals', key: 'YEAR', value: from });
  if (to !== '*') parts.push({ type: 'lessThanOrEquals', key: 'YEAR', value: to });
  return parts.length === 1 ? parts[0] : { type: 'and', predicates: parts };
}

const oneOrIn = (key, values) =>
  values.length === 1 ? { type: 'equals', key, value: values[0] } : { type: 'in', key, values };

/** How each filter becomes a predicate. `q` is not here: it is sent beside the predicate. */
const FILTER_PREDICATES = {
  country: (values) => oneOrIn('COUNTRY', values),
  basisOfRecord: (values) => oneOrIn('BASIS_OF_RECORD', values),
  license: (values) => oneOrIn('LICENSE', values),
  year: yearPredicate,
  hasCoordinate: () => ({ type: 'equals', key: 'HAS_COORDINATE', value: 'true' })
};

/**
 * Everything that narrows a search, as one predicate: the page author's subset, the taxon
 * and dataset it is about, the filters in force, and a media type. `without` names filters
 * to leave out (how multiselect facets are had). Returns `null` if nothing narrows it.
 */
export function buildPredicate({ base = null, taxonKey, datasetKey, checklistKey, query = {}, without = [], mediaType } = {}) {
  const parts = [];
  if (base) parts.push(base);
  if (taxonKey) parts.push({ type: 'equals', key: 'TAXON_KEY', value: taxonKey, checklistKey });
  if (datasetKey) parts.push({ type: 'equals', key: 'DATASET_KEY', value: datasetKey });
  for (const [key, value] of Object.entries(query)) {
    if (!without.includes(key) && FILTER_PREDICATES[key]) parts.push(FILTER_PREDICATES[key](value));
  }
  if (mediaType) parts.push({ type: 'equals', key: 'MEDIA_TYPE', value: mediaType });
  if (!parts.length) return null;
  return parts.length === 1 ? parts[0] : { type: 'and', predicates: parts };
}
