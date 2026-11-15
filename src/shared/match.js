import { buildUrl, getJson } from './api.js';

const ACCEPTED_MATCH_TYPES = ['EXACT', 'FUZZY', 'HIGHERRANK'];
const MIN_CONFIDENCE = 80;

/** A name match is only trusted if its type and confidence are good enough. */
export function isConfidentMatch(data) {
  const matchType = data?.diagnostics?.matchType;
  const confidence = data?.diagnostics?.confidence ?? 0;
  return !!data?.usage?.key && ACCEPTED_MATCH_TYPES.includes(matchType) && confidence >= MIN_CONFIDENCE;
}

/**
 * Turn a raw `v2/species/match` response into what the cards need.
 * `byKey` lookups return the usage with the given key, so there is no
 * confidence to judge and any response with a usage counts as found.
 */
export function describeMatch(data, { byKey = false } = {}) {
  const found = byKey ? !!data?.usage?.key : isConfidentMatch(data);
  const isSynonym = !!(data?.usage?.status === 'SYNONYM' && data?.acceptedUsage);
  const usage = data?.usage ?? null;
  const target = found ? (isSynonym ? data.acceptedUsage : usage) : null;

  return {
    found,
    isSynonym,
    usage,
    target,
    classification: found ? data.classification || [] : [],
    matchType: data?.diagnostics?.matchType,
    confidence: data?.diagnostics?.confidence,
    raw: data
  };
}

/**
 * Resolve a taxon by key or by name against a checklist.
 * A key takes precedence over a name when both are given.
 */
export async function matchTaxon({ apiBase, checklistKey, taxonKey, scientificName }) {
  const byKey = !!taxonKey;
  const url = buildUrl(apiBase, '/v2/species/match', {
    usageKey: byKey ? taxonKey : undefined,
    scientificName: byKey ? undefined : scientificName,
    verbose: true,
    checklistKey
  });
  const data = await getJson(url);
  return { url, ...describeMatch(data, { byKey }) };
}
