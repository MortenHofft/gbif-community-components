import { buildUrl } from './api.js';

/**
 * Links from components back to the GBIF website.
 *
 * All link building lives here so the paths can be corrected in one place.
 * The paths follow the TaxonPages prototype; they have not been verified
 * against the production website.
 */

export function taxonUrl(siteBase, taxonKey) {
  return `${siteBase}/taxon/${encodeURIComponent(taxonKey)}`;
}

export function occurrenceUrl(siteBase, occurrenceKey) {
  return `${siteBase}/occurrence/${encodeURIComponent(occurrenceKey)}`;
}

export function occurrenceSearchUrl(siteBase, params = {}) {
  return buildUrl(siteBase, '/occurrence/search', params);
}
