import { safeHttpUrl } from './format.js';

/**
 * What the maps share: Leaflet itself (downloaded only when a map is drawn), its
 * stylesheet (which has to live inside a shadow root to reach the map), and the
 * basemaps. The basemaps are GBIF's own, so no third-party map service is involved
 * unless the page asks for one.
 */

export const GBIF_BASEMAPS = {
  light: { label: 'Light', style: 'gbif-light' },
  classic: { label: 'Classic', style: 'gbif-classic' },
  dark: { label: 'Dark', style: 'gbif-dark' },
  geyser: { label: 'Geyser', style: 'gbif-geyser' },
  tuatara: { label: 'Tuatara', style: 'gbif-tuatara' },
  bright: { label: 'Bright', style: 'osm-bright' }
};

const BASEMAP_URL = 'https://tile.gbif.org/3857/omt/{z}/{x}/{y}@1x.png?style=';
export const BASEMAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
  '&copy; <a href="https://openmaptiles.org/">OpenMapTiles</a>';

let leafletPromise;

/** Leaflet and its stylesheet, as `[{ default: L }, { default: css }]`. A failed download can be tried again. */
export function loadLeaflet() {
  leafletPromise ??= Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css?inline')]).catch((error) => {
    leafletPromise = undefined;
    throw error;
  });
  return leafletPromise;
}

const adopted = new WeakSet();

/** Put Leaflet's stylesheet into a shadow root, once. */
export function adoptLeafletStyles(root, cssText) {
  if (adopted.has(root)) return;
  adopted.add(root);
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(cssText);
  root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
}

/** The basemap to draw: a GBIF one by name, or the page's own tile URL (`{z}/{x}/{y}`) with its attribution. */
export function basemapSource({ basemap, basemapUrl, basemapAttribution } = {}) {
  const custom = safeHttpUrl(basemapUrl?.replace(/\{[a-z]\}/gi, 'x'));
  if (custom) return { url: basemapUrl, attribution: basemapAttribution || '', custom: true };
  const style = (GBIF_BASEMAPS[basemap] || GBIF_BASEMAPS.light).style;
  return { url: `${BASEMAP_URL}${style}`, attribution: BASEMAP_ATTRIBUTION, custom: false };
}
