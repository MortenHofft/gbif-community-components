import { html, css, nothing } from 'lit';
import { GbifTaxonElement } from '../shared/taxon-element.js';
import { buildUrl, getJson } from '../shared/api.js';
import { emit } from '../shared/events.js';
import { occurrenceSearchUrl } from '../shared/links.js';

const BASEMAPS = {
  topo: {
    label: 'Topographic',
    url: 'https://services.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri'
  },
  dark: {
    label: 'Dark Gray',
    url: 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri'
  }
};

/**
 * <gbif-occurrence-map taxon-key="4QHKG"></gbif-occurrence-map>
 *
 * A map of where GBIF has georeferenced occurrences of a taxon. The component
 * renders nothing when there are none. Leaflet is only downloaded when there
 * is a map to draw.
 *
 * Attributes: the shared taxon inputs, plus `basemap` ("topo" or "dark").
 * Height: `--gbif-map-height` (default 24rem).
 * Events: `gbif-map-explore` (cancelable, when "Explore on GBIF.org" is
 * clicked; detail has the visible `bounds`, a WKT `geometry` and the search
 * `url`), `gbif-taxon-resolved`, `gbif-error`.
 */
export class GbifOccurrenceMap extends GbifTaxonElement {
  static properties = {
    ...GbifTaxonElement.properties,
    basemap: { type: String },
    _total: { state: true }
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
      }
      .gbif-occurrence-map__explore {
        left: 0.5rem;
        bottom: 1.6rem;
      }
      .gbif-occurrence-map__basemap {
        top: 0.5rem;
        right: 0.5rem;
        padding: 0.25rem;
        border: 1px solid var(--gbif-color-border, #d5dbe1);
        border-radius: 4px;
        font: inherit;
        font-size: 0.75rem;
      }
    `
  ];

  constructor() {
    super();
    this.basemap = 'topo';
    this._total = null;
    this._map = null;
    this._leaflet = null;
    this._occurrenceLayer = null;
    this._basemapLayer = null;
    this._layerKey = null;
    this._initializing = false;
  }

  onTaxonReset() {
    this._total = null;
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
      this.reportError(error);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._destroyMap();
  }

  updated(changed) {
    if (!(this._total > 0) || this._taxon.status !== 'ready') return;
    if (changed.has('basemap') && this._map) this._applyBasemap();
    this._syncMap();
  }

  async _syncMap() {
    const canvas = this.renderRoot.querySelector('.gbif-occurrence-map__canvas');
    const key = this._taxon.target?.key;
    if (!canvas || !key) return;

    if (this._map) {
      if (this._layerKey !== key) this._applyOccurrenceLayer();
      return;
    }
    if (this._initializing) return;

    this._initializing = true;
    const runId = this._runId;
    try {
      const [{ default: L }, { default: leafletCss }] = await Promise.all([
        import('leaflet'),
        import('leaflet/dist/leaflet.css?inline')
      ]);
      // The taxon may have changed, or the element been removed, while Leaflet loaded.
      if (runId !== this._runId || !this.isConnected) return;

      this._adoptStyles(leafletCss);
      this._leaflet = L;
      this._map = L.map(canvas, {
        center: [20, 0],
        zoom: 1,
        minZoom: 1,
        worldCopyJump: true,
        // Do not hijack page scrolling on a page that embeds the map.
        scrollWheelZoom: false
      });
      this._applyBasemap();
      this._applyOccurrenceLayer();
      new ResizeObserver(() => this._map?.invalidateSize()).observe(canvas);
    } catch (error) {
      this.reportError(error);
    } finally {
      this._initializing = false;
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

  _applyBasemap() {
    const L = this._leaflet;
    const config = BASEMAPS[this.basemap] || BASEMAPS.topo;
    this._basemapLayer?.remove();
    this._basemapLayer = L.tileLayer(config.url, { attribution: config.attribution, maxZoom: 18 }).addTo(this._map);
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
    this._map?.remove();
    this._map = null;
    this._occurrenceLayer = null;
    this._basemapLayer = null;
    this._layerKey = null;
  }

  _onExplore() {
    if (!this._map) return;
    const bounds = this._map.getBounds();
    const south = Math.max(-90, bounds.getSouth());
    const north = Math.min(90, bounds.getNorth());
    const west = Math.max(-180, bounds.getWest());
    const east = Math.min(180, bounds.getEast());
    const ring = [
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south]
    ]
      .map(([lng, lat]) => `${lng} ${lat}`)
      .join(', ');
    const geometry = `POLYGON((${ring}))`;
    const url = occurrenceSearchUrl(this.config.siteBase, {
      taxonKey: this._taxon.target.key,
      checklistKey: this.config.checklistKey,
      geometry
    });

    const event = emit(
      this,
      'gbif-map-explore',
      { bounds: { south, north, west, east }, geometry, url },
      { cancelable: true }
    );
    if (!event.defaultPrevented) window.open(url, '_blank', 'noopener');
  }

  render() {
    if (!(this._total > 0) || this._taxon.status !== 'ready') return nothing;
    const name = this.displayName;

    return html`
      <section class="gbif-card" part="card">
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>
          <h2 class="gbif-card__title">${this.heading || 'Occurrence map'}</h2>
        </header>
        <div class="gbif-occurrence-map__viewport" part="viewport">
          <div
            class="gbif-occurrence-map__canvas"
            role="application"
            aria-label=${name ? `Map of GBIF occurrences of ${name}` : 'Map of GBIF occurrences'}
          ></div>
          <button type="button" class="gbif-button gbif-occurrence-map__explore" @click=${this._onExplore}>
            Explore on GBIF.org
          </button>
          <select
            class="gbif-occurrence-map__basemap"
            aria-label="Basemap"
            @change=${(event) => (this.basemap = event.target.value)}
          >
            ${Object.entries(BASEMAPS).map(
              ([key, config]) =>
                html`<option value=${key} ?selected=${key === this.basemap}>${config.label}</option>`
            )}
          </select>
        </div>
        <footer class="gbif-card__footer" part="footer">
          <span>${this._total.toLocaleString()} georeferenced occurrences</span>
          <span>Data from GBIF</span>
        </footer>
      </section>
    `;
  }
}
