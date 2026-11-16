import { setRequestTimeout } from './api.js';

/**
 * Defaults and configuration shared by all components.
 *
 * Every value can be set per element with an attribute (`api-base`,
 * `site-base`, `checklist-key`, `hide-source`) or once for the whole page, either
 * with an object `window.GbifComponentsConfig`, defined before the bundle loads (so
 * that the first requests already use it), or with `configure()` afterwards (which
 * makes components that have already asked ask again).
 * Precedence: element attribute > page configuration > built-in default.
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
const listeners = new Set();

/** The parts of the configuration that change what a component asks for or shows. */
const fingerprint = () => JSON.stringify(Object.keys(DEFAULTS).map((key) => overrides[key] ?? DEFAULTS[key]));

/**
 * Call `fn` when `configure()` changes something, so that components that have already asked can ask
 * again. Returns the function that stops listening.
 */
export function onConfigChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Set page-wide defaults, for example `configure({ siteBase: 'https://example.org' })`.
 * Passing `null` or `undefined` for a key removes its override.
 */
export function configure(values = {}) {
  const before = fingerprint();
  for (const key of Object.keys(DEFAULTS)) {
    if (!(key in values)) continue;
    if (values[key] === null || values[key] === undefined) delete overrides[key];
    else overrides[key] = values[key];
  }
  setRequestTimeout(overrides.timeoutMs ?? DEFAULTS.timeoutMs);
  // Components that have already asked (with the old settings) ask again.
  if (fingerprint() !== before) for (const fn of [...listeners]) fn();
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
