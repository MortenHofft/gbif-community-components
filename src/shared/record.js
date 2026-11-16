import { buildUrl, getJson } from './api.js';
import { cleanOccurrenceKey } from './dwc.js';

/**
 * One occurrence record, as GBIF serves it twice: interpreted (what GBIF made of it) and
 * verbatim (as published, with the extensions). The interpreted record is what a page
 * cannot do without, so its failure is the record's. The verbatim one adds the published
 * values and the extensions, so without it the record is still shown, and the failure is
 * reported as `verbatimError`.
 *
 * Resolves to `{ found: false }` for a key that does not exist, otherwise
 * `{ found: true, interpreted, verbatim, verbatimError }`.
 */
export async function fetchRecord({ apiBase, key }) {
  const safe = cleanOccurrenceKey(key);
  if (!safe) throw new Error('An occurrence key is digits only.');

  // Both go out together. A failure of the verbatim one is not allowed to be an unhandled rejection.
  const verbatimRequest = getJson(buildUrl(apiBase, `/v1/occurrence/${safe}/verbatim`)).then(
    (data) => ({ data }),
    (error) => ({ error })
  );

  let interpreted;
  try {
    interpreted = await getJson(buildUrl(apiBase, `/v1/occurrence/${safe}`));
  } catch (error) {
    // 404: no such record. 410: it was there and has been removed. Either way there is nothing to show.
    if (error.status === 404 || error.status === 410) return { found: false };
    throw error;
  }
  if (!interpreted || typeof interpreted !== 'object' || Array.isArray(interpreted)) return { found: false };

  const { data, error } = await verbatimRequest;
  const verbatim = data && typeof data === 'object' && !Array.isArray(data) ? data : null;
  return { found: true, interpreted, verbatim, verbatimError: error && error.status !== 404 && error.status !== 410 ? error : undefined };
}
