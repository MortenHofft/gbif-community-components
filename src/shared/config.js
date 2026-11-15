/**
 * Defaults and configuration shared by all components.
 *
 * Every value can be set per element with an attribute (`api-base`,
 * `site-base`, `checklist-key`) or once for the whole page with `configure()`.
 * Precedence: element attribute > configure() > built-in default.
 */

export const DEFAULTS = {
  /** Base URL of the GBIF API. */
  apiBase: 'https://api.gbif.org',
  /** Base URL of the website that "view on GBIF" links point to. */
  siteBase: 'https://www.gbif.org',
  /**
   * Checklist used to match names and to decide which classification is shown.
   * This default is the Catalogue of Life checklist used in the TaxonPages
   * prototype. Sites should set their own if they need a different one.
   */
  checklistKey: '7ddf754f-d193-4cc9-b351-99906754a03b'
};

const overrides = {};

/** Set page-wide defaults, for example `configure({ siteBase: 'https://example.org' })`. */
export function configure(values = {}) {
  for (const key of Object.keys(DEFAULTS)) {
    if (values[key]) overrides[key] = values[key];
  }
}

const trimSlash = (url) => String(url).replace(/\/+$/, '');

/** Resolve the effective configuration for an element. */
export function resolveConfig(el = {}) {
  return {
    apiBase: trimSlash(el.apiBase || overrides.apiBase || DEFAULTS.apiBase),
    siteBase: trimSlash(el.siteBase || overrides.siteBase || DEFAULTS.siteBase),
    checklistKey: el.checklistKey || overrides.checklistKey || DEFAULTS.checklistKey
  };
}
