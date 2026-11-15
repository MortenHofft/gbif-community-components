import { setRequestTimeout } from './api.js';

/**
 * Defaults and configuration shared by all components.
 *
 * Every value can be set per element with an attribute (`api-base`,
 * `site-base`, `checklist-key`, `hide-source`) or once for the whole page with
 * `configure()`. Precedence: element attribute > configure() > built-in default.
 */

export const DEFAULTS = {
  /** Base URL of the GBIF API. May include a path (a same-origin proxy) or be relative. */
  apiBase: 'https://api.gbif.org',
  /** Base URL of the website that "view on GBIF" links point to. */
  siteBase: 'https://www.gbif.org',
  /**
   * Checklist used to match names and to decide which classification is shown.
   * The default is the Catalogue of Life checklist (GBIF's current COL edition).
   * One key is served by successive COL editions, so what it contains changes
   * over time. Pin another checklist key if you need a fixed taxonomy.
   */
  checklistKey: '7ddf754f-d193-4cc9-b351-99906754a03b',
  /** Give up on a request after this many milliseconds. */
  timeoutMs: 15000,
  /** Show "data from GBIF" source notes on cards. Licence and rights credits are never hidden. */
  showSource: true
};

const overrides = {};

/**
 * Set page-wide defaults, for example `configure({ siteBase: 'https://example.org' })`.
 * Passing `null` or `undefined` for a key removes its override.
 */
export function configure(values = {}) {
  for (const key of Object.keys(DEFAULTS)) {
    if (!(key in values)) continue;
    if (values[key] === null || values[key] === undefined) delete overrides[key];
    else overrides[key] = values[key];
  }
  setRequestTimeout(overrides.timeoutMs ?? DEFAULTS.timeoutMs);
}

const trimSlash = (url) => String(url).replace(/\/+$/, '');

/** Make a relative base (such as `/gbif-proxy`) absolute against the page. */
function absolutize(url) {
  try {
    return new URL(url, globalThis.location?.href).href;
  } catch {
    return url;
  }
}

/** Resolve the effective configuration for an element. */
export function resolveConfig(el = {}) {
  return {
    apiBase: trimSlash(absolutize(el.apiBase || overrides.apiBase || DEFAULTS.apiBase)),
    siteBase: trimSlash(absolutize(el.siteBase || overrides.siteBase || DEFAULTS.siteBase)),
    checklistKey: el.checklistKey || overrides.checklistKey || DEFAULTS.checklistKey,
    showSource: el.hideSource ? false : overrides.showSource ?? DEFAULTS.showSource
  };
}
