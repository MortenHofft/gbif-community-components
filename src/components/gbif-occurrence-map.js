import { html, css, nothing } from 'lit';
import { GbifTaxonElement } from '../shared/taxon-element.js';
import { buildUrl, getJson } from '../shared/api.js';
import { emit } from '../shared/events.js';
import { safeHttpUrl } from '../shared/format.js';
import { exploreGeometry } from '../shared/geo.js';
import { occurrenceSearchUrl } from '../shared/links.js';

/** GBIF's own raster basemaps, so no third-party map host is involved by default. */
const GBIF_BASEMAPS = {
  light: { label: 'Light', style: 'gbif-light' },
  classic: { label: 'Classic', style: 'gbif-classic' },
  dark: { label: 'Dark', style: 'gbif-dark' },
  geyser: { label: 'Geyser', style: 'gbif-geyser' },
  tuatara: { label: 'Tuatara', style: 'gbif-tuatara' },
  bright: { label: 'Bright', style: 'osm-bright' }
};
const BASEMAP_URL = 'https://tile.gbif.org/3857/omt/{z}/{x}/{y}@1x.png?style=';
const BASEMAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
  '&copy; <a href="https://openmaptiles.org/">OpenMapTiles</a>';

/** Leaflet and its stylesheet are only downloaded when a map is actually drawn. */
let leafletPromise;
function loadLeaflet() {
  leafletPromise ??= Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css?inline')]).catch((error) => {
    leafletPromise = undefined; // allow a retry later
    throw error;
  });
  return leafletPromise;
}

/**
 * <gbif-occurrence-map taxon-key="4QHKG"></gbif-occurrence-map>
 *
 * A map of where GBIF has georeferenced occurrences of a taxon. The component
 * renders nothing when there are none.
 *
 * Attributes: the shared taxon inputs, plus
 *   basemap              light (default), classic, dark, geyser, tuatara or bright
 *   basemap-url          your own tile URL template ({z}/{x}/{y}); replaces the GBIF basemaps
 *   basemap-attribution  attribution text for basemap-url
 * Height: `--gbif-map-height` (default 24rem).
 *
 * Events: `gbif-map-explore` (cancelable, "Explore on GBIF.org"; detail has the
 * visible `bounds`, a WKT `geometry` and the search `url`),
 * `gbif-taxon-resolved`, `gbif-error`.
 */
export class GbifOccurrenceMap extends GbifTaxonElement {
  static properties = {
    ...GbifTaxonElement.properties,
    basemap: { type: String },
    basemapUrl: { type: String, attribute: 'basemap-url' },
    basemapAttribution: { type: String, attribute: 'basemap-attribution' },
    _total: { state: true },
    _failed: { state: true }
  };

  static styles = [
    ...GbifTaxonElement.styles,
    css`
      .gbif-occurrence-map__viewport {
        position: relative;
        height: var(--gbif-map-height, 24rem);
        isolation: isolate;
        background: var(--gbif-color-media-background, #e6ebf0);
      }
      .gbif-occurrence-map__canvas {
        position: absolute;
        inset: 0;
      }
      .gbif-occurrence-map__explore,
      .gbif-occurrence-map__basemap {
        position: absolute;
        z-index: 1000;
        background: var(--gbif-color-surface, #fff);
        color: var(--gbif-color-text, #1f2933);
      }
      .gbif-occurrence-map__explore {
        left: 0.5rem;
        bottom: 1.6rem;
      }
      .gbif-occurrence-map__basemap {
        top: 0.5rem;
        right: 0.5rem;
        padding: 0.25rem;
        border: 1px solid var(--gbif-color-control-border, #7d8794);
        border-radius: 4px;
        font: inherit;
        font-size: 0.75rem;
      }
    `
  ];

  constructor() {
    super();
    this.basemap = 'light';
    this._total = null;
    this._failed = false;
    this._map = null;
    this._leaflet = null;
    this._occurrenceLayer = null;
    this._basemapLayer = null;
    this._layerKey = null;
    this._resizeObserver = null;
    this._initializing = false;
    this._stylesAdopted = false;
  }

  onTaxonReset() {
    this._total = null;
    this._failed = false;
    this._destroyMap();
  }

  async onTaxonReady(taxon, isCurrent) {
    const { apiBase, checklistKey } = this.config;
    const url = buildUrl(apiBase, '/v2/map/occurrence/density/capabilities.json', {
      taxonKey: taxon.target.key,
      checklistKey
    });
    try {
      const data = await getJson(url);
      if (isCurrent()) this._total = typeof data?.total === 'number' ? data.total : 0;
    } catch (error) {
      if (!isCurrent()) return;
      this._total = 0;
      this._failed = true;
      this.reportError(error);
    }
  }

  connectedCallback() {
    super.connectedCallback();
    // Moving an element in the DOM disconnects and reconnects it, which tears the map
    // down (see below). Lit does not re-render on reconnect, so ask for it.
    if (this.hasUpdated) this.requestUpdate();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._destroyMap();
  }

  updated(changed) {
    if (!(this._total > 0) || this._taxon.status !== 'ready') return;
    if (this._map && (changed.has('basemap') || changed.has('basemapUrl') || changed.has('basemapAttribution'))) {
      this._applyBasemap();
    }
    this._syncMap();
  }

  async _syncMap() {
    const canvas = this.renderRoot.querySelector('.gbif-occurrence-map__canvas');
    const key = this._taxon.target?.key;
    if (!canvas || !key) return;

    // Lit may have replaced the canvas (for example after a failure state); a map on a
    // detached canvas is of no use.
    if (this._map && this._map.getContainer() !== canvas) this._destroyMap();

    if (this._map) {
      if (this._layerKey !== key) this._applyOccurrenceLayer();
      return;
    }
    if (this._initializing) return;

    this._initializing = true;
    const run = this._runId;
    try {
      const [{ default: L }, { default: leafletCss }] = await loadLeaflet();

      // The taxon may have changed, or the element been removed, while Leaflet loaded.
      // Look the canvas up again, because it may be a different element by now.
      const current = this.renderRoot.querySelector('.gbif-occurrence-map__canvas');
      if (run !== this._runId || !this.isConnected || !current || this._map) return;

      this._adoptStyles(leafletCss);
      this._leaflet = L;
      const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      this._map = L.map(current, {
        center: [20, 0],
        zoom: 1,
        minZoom: 1,
        worldCopyJump: true,
        // Do not hijack page scrolling on a page that embeds the map.
        scrollWheelZoom: false,
        zoomAnimation: !reduceMotion,
        fadeAnimation: !reduceMotion
      });
      this._applyBasemap();
      this._applyOccurrenceLayer();
      this._resizeObserver = new ResizeObserver(() => this._map?.invalidateSize());
      this._resizeObserver.observe(current);
    } catch (error) {
      this._failed = true;
      this.reportError(error);
    } finally {
      this._initializing = false;
      // If the work above was skipped because things changed underneath it, try again.
      if (!this._map && !this._failed && this.isConnected && this._total > 0) this.requestUpdate();
    }
  }

  /** Leaflet's stylesheet has to live inside the shadow root to reach the map. */
  _adoptStyles(cssText) {
    if (this._stylesAdopted) return;
    this._stylesAdopted = true;
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    this.renderRoot.adoptedStyleSheets = [...this.renderRoot.adoptedStyleSheets, sheet];
  }

  /** The basemap tile URL and its attribution. */
  _basemapSource() {
    const custom = safeHttpUrl(this.basemapUrl?.replace(/\{[a-z]\}/gi, 'x'));
    if (custom) return { url: this.basemapUrl, attribution: this.basemapAttribution || '', custom: true };
    const style = (GBIF_BASEMAPS[this.basemap] || GBIF_BASEMAPS.light).style;
    return { url: `${BASEMAP_URL}${style}`, attribution: BASEMAP_ATTRIBUTION, custom: false };
  }

  _applyBasemap() {
    const { url, attribution } = this._basemapSource();
    this._basemapLayer?.remove();
    this._basemapLayer = this._leaflet.tileLayer(url, { attribution, maxZoom: 18 }).addTo(this._map);
    this._occurrenceLayer?.bringToFront();
  }

  _applyOccurrenceLayer() {
    const L = this._leaflet;
    const { apiBase, checklistKey } = this.config;
    const key = this._taxon.target.key;
    const params = new URLSearchParams({
      style: 'classic.poly',
      bin: 'hex',
      hexPerTile: '70',
      taxonKey: key,
      checklistKey,
      srs: 'EPSG:3857'
    });
    this._occurrenceLayer?.remove();
    this._occurrenceLayer = L.tileLayer(`${apiBase}/v2/map/occurrence/density/{z}/{x}/{y}@2x.png?${params}`, {
      attribution: 'Occurrences &copy; <a href="https://www.gbif.org">GBIF</a>',
      maxZoom: 18
    }).addTo(this._map);
    this._layerKey = key;
  }

  _destroyMap() {
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    this._map?.remove();
    this._map = null;
    this._occurrenceLayer = null;
    this._basemapLayer = null;
    this._layerKey = null;
  }

  _onExplore() {
    if (!this._map) return;
    const b = this._map.getBounds();
    const { geometry, bounds } = exploreGeometry({
      west: b.getWest(),
      east: b.getEast(),
      south: b.getSouth(),
      north: b.getNorth()
    });
    const url = occurrenceSearchUrl(this.config.siteBase, {
      taxonKey: this._taxon.target.key,
      checklistKey: this.config.checklistKey,
      geometry
    });

    const event = emit(this, 'gbif-map-explore', { bounds, geometry, url }, { cancelable: true });
    if (!event.defaultPrevented) window.open(url, '_blank', 'noopener');
  }

  render() {
    const taxon = this._taxon;
    const loading = taxon.status === 'loading' || (taxon.status === 'ready' && this._total === null);

    if (taxon.status === 'ready' && this._failed) {
      return html`<section class="gbif-card" part="card">
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>${this.renderTitle(this.heading || 'Occurrence map')}
        </header>
        <div class="gbif-card__body"><p class="gbif-card__state" role="alert">Could not load the occurrence map from GBIF.</p></div>
      </section>`;
    }
    if (taxon.status !== 'ready' || !(this._total > 0)) {
      return this.renderReserved('var(--gbif-map-height, 24rem)', loading);
    }

    const name = this.displayName;
    const customBasemap = this._basemapSource().custom;

    return html`
      <section class="gbif-card" part="card">
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>
          ${this.renderTitle(this.heading || 'Occurrence map')}
        </header>
        <div class="gbif-occurrence-map__viewport" part="viewport">
          <div
            class="gbif-occurrence-map__canvas"
            role="region"
            aria-label=${name ? `Map of GBIF occurrences of ${name}` : 'Map of GBIF occurrences'}
          ></div>
          <button type="button" class="gbif-button gbif-occurrence-map__explore" @click=${this._onExplore}>
            Explore on GBIF.org
          </button>
          ${customBasemap
            ? nothing
            : html`<select
                class="gbif-occurrence-map__basemap"
                aria-label="Basemap"
                @change=${(event) => (this.basemap = event.target.value)}
              >
                ${Object.entries(GBIF_BASEMAPS).map(
                  ([key, config]) => html`<option value=${key} ?selected=${key === this.basemap}>${config.label}</option>`
                )}
              </select>`}
        </div>
        <footer class="gbif-card__footer" part="footer">
          <span>${this._total.toLocaleString()} georeferenced occurrences</span>
          ${this.renderSource('Occurrence data from GBIF.')}
        </footer>
      </section>
    `;
  }
}
