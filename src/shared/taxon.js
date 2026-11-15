import { buildUrl, getJson } from './api.js';

/**
 * Resolving a taxon.
 *
 * Details always come from the GBIF Taxon API (`/v2/taxon`): the name usage
 * itself and its classification. The species *match* API is only used to turn
 * a scientific name into a taxon key. A taxon key is scoped to a checklist, so
 * every lookup needs the checklist key as well.
 */

/**
 * Match types worth trusting. The v2 match API reports `EXACT`, `VARIANT` (a
 * spelling variant), `HIGHERRANK` (a higher taxon than the one asked for) and
 * `NONE`. `CANONICAL` and `FUZZY` are kept for older or other deployments.
 * Anything else, and anything below MIN_CONFIDENCE, is refused.
 */
const ACCEPTED_MATCH_TYPES = ['EXACT', 'VARIANT', 'CANONICAL', 'FUZZY', 'HIGHERRANK'];
const MIN_CONFIDENCE = 80;

/** A name match is only trusted if its type and confidence are good enough. */
export function isConfidentMatch(data) {
  const matchType = data?.diagnostics?.matchType;
  const confidence = data?.diagnostics?.confidence ?? 0;
  return !!data?.usage?.key && ACCEPTED_MATCH_TYPES.includes(matchType) && confidence >= MIN_CONFIDENCE;
}

/** Taxon API name usage -> the shape the components use. */
export function normalizeTaxon(taxon) {
  return {
    key: taxon.taxonID,
    name: taxon.scientificName,
    canonicalName: taxon.scientificName,
    authorship: taxon.scientificNameAuthorship,
    rank: taxon.taxonRank,
    status: taxon.taxonomicStatus,
    formattedName: taxon.label || taxon.scientificName,
    acceptedKey: taxon.acceptedNameUsageID,
    parentKey: taxon.parentNameUsageID
  };
}

/**
 * Is this usage a name that points to another, accepted, taxon? That is true of
 * every non-accepted status (synonym, heterotypic synonym, ambiguous synonym,
 * misapplied name, ...), so the test is the pointer, not the status text.
 */
export function pointsToAccepted(usage) {
  return !!usage.acceptedKey && usage.acceptedKey !== usage.key;
}

/** Taxon API classification (root first) -> list of `{ key, name, rank }`. */
export function normalizeClassification(list) {
  return (Array.isArray(list) ? list : [])
    .filter((taxon) => taxon && taxon.taxonID)
    .map((taxon) => ({
      key: taxon.taxonID,
      name: taxon.scientificName,
      rank: taxon.taxonRank,
      speciesCount: taxon.species
    }));
}

const detailPath = (checklistKey, taxonKey) =>
  `/v2/taxon/${encodeURIComponent(checklistKey)}/${encodeURIComponent(taxonKey)}`;
const treePath = (checklistKey, taxonKey) =>
  `/v2/taxon/tree/${encodeURIComponent(checklistKey)}/${encodeURIComponent(taxonKey)}`;

const NOT_FOUND = (extra = {}) => ({ found: false, ...extra });

/** Run a request, treating "404 Not Found" as `null` instead of an error. */
async function getJsonOrNull(url) {
  try {
    return await getJson(url);
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

/**
 * Resolve a taxon by key or by name within a checklist. A key takes precedence.
 * `kingdom` and `rank` narrow a name match, which is how homonyms such as
 * *Ficus* or *Oenanthe* are told apart.
 *
 * Returns `{ found: false }` when nothing (confident) is found, otherwise:
 *   usage           the taxon that was asked for
 *   target          the accepted taxon: `usage` itself, or what a synonym points to
 *   isSynonym       whether `usage` points to a different, accepted taxon
 *   classification  ancestors from the root down to `target`
 *   matchType       (names only) how the name was matched: EXACT, VARIANT, HIGHERRANK, ...
 */
export async function resolveTaxon({ apiBase, checklistKey, taxonKey, scientificName, kingdom, rank }) {
  let key = taxonKey;
  let matchInfo = {};

  if (!key) {
    const data = await getJson(
      buildUrl(apiBase, '/v2/species/match', { scientificName, kingdom, rank, checklistKey })
    );
    matchInfo = { matchType: data?.diagnostics?.matchType, confidence: data?.diagnostics?.confidence };
    if (!isConfidentMatch(data)) return NOT_FOUND(matchInfo);
    key = data.usage.key;
  }

  // The classification of a synonym is the classification of its accepted taxon,
  // so both requests can go out together.
  const detailUrl = buildUrl(apiBase, detailPath(checklistKey, key));
  const classificationRequest = getJsonOrNull(buildUrl(apiBase, treePath(checklistKey, key)));
  // Awaited later. This keeps an early return from leaving an unhandled rejection behind.
  classificationRequest.catch(() => {});

  const detail = await getJsonOrNull(detailUrl);
  if (!detail || !detail.taxonID) return NOT_FOUND(matchInfo);

  const usage = normalizeTaxon(detail);
  let target = usage;
  const isSynonym = pointsToAccepted(usage);
  if (isSynonym) {
    const accepted = await getJsonOrNull(buildUrl(apiBase, detailPath(checklistKey, usage.acceptedKey)));
    if (!accepted || !accepted.taxonID) return NOT_FOUND(matchInfo);
    target = normalizeTaxon(accepted);
  }

  return {
    found: true,
    url: detailUrl,
    isSynonym,
    usage,
    target,
    classification: normalizeClassification(await classificationRequest),
    ...matchInfo
  };
}

/**
 * Title, version and link of a checklist, for source notes. A failure here is
 * not worth showing an error for, so it returns `null`.
 */
export async function getChecklistInfo({ apiBase, checklistKey }) {
  try {
    const data = await getJson(buildUrl(apiBase, `/v2/taxon/checklist/${encodeURIComponent(checklistKey)}`));
    if (!data || typeof data !== 'object') return null;
    return {
      title: typeof data.title === 'string' ? data.title : undefined,
      version: typeof data.version === 'string' ? data.version : undefined,
      alias: typeof data.alias === 'string' ? data.alias : undefined,
      url: typeof data.url === 'string' ? data.url : undefined
    };
  } catch {
    return null;
  }
}
