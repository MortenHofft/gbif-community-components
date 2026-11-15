import { html, css, nothing } from 'lit';
import { GbifRecordConsumer } from '../shared/record-consumer.js';
import { emit } from '../shared/events.js';
import { adoptLeafletStyles, basemapSource, loadLeaflet } from '../shared/leaflet.js';

/** `-51.1` -> `51.1° S`, `72.9` -> `72.9° E`. */
const degrees = (value, positive, negative) => `${Math.abs(value)}° ${value < 0 ? negative : positive}`;

/**
 * <gbif-occurrence-location record="#r"></gbif-occurrence-location>
 *
 * A map of where the record says the occurrence was: a point, and a circle for the
 * coordinate uncertainty when the record gives one. A record without usable coordinates
 * shows nothing. Leaflet is only downloaded when there is a map to draw.
 *
 * Attributes: `record` (the record element), plus
 *   basemap              light (default), classic, dark, geyser, tuatara or bright (GBIF's own)
 *   basemap-url          your own tile URL template ({z}/{x}/{y}); replaces the GBIF basemaps
 *   basemap-attribution  attribution text for basemap-url
 * Also `heading`, `heading-level` and `hide-source`. Height: `--gbif-map-height` (default 20rem).
 * Event: `gbif-error` when the map cannot be loaded.
 */
export class GbifOccurrenceLocation extends GbifRecordConsumer {
  static properties = {
    basemap: { type: String },
    basemapUrl: { type: String, attribute: 'basemap-url' },
    basemapAttribution: { type: String, attribute: 'basemap-attribution' },
    _failed: { state: true }
  };

  static styles = [
    ...GbifRecordConsumer.styles,
    css`
      .gbif-location__viewport {
        position: relative;
        height: var(--gbif-map-height, 20rem);
        isolation: isolate;
        background: var(--gbif-color-media-background, #e6ebf0);
      }
      .gbif-location__canvas {
        position: absolute;
        inset: 0;
      }
      .gbif-location__coordinates {
        margin: 0;
        font-variant-numeric: tabular-nums;
      }
    `
  ];

  constructor() {
    super();
    this.basemap = 'light';
    this._failed = false;
    this._map = null;
    this._leaflet = null;
    this._layers = null;
    this._basemapLayer = null;
    this._resizeObserver = null;
    this._initializing = false;
  }

  onRecordChange() {
    this._failed = false;
  }

  connectedCallback() {
    super.connectedCallback();
    // A moved element is disconnected and reconnected, which tears the map down; Lit does not draw again by itself.
    if (this.hasUpdated) this.requestUpdate();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._destroyMap();
  }

  updated(changed) {
    super.updated(changed);
    if (!this.ready || !this.view.point) {
      this._destroyMap();
      return;
    }
    if (this._map && (changed.has('basemap') || changed.has('basemapUrl') || changed.has('basemapAttribution'))) this._applyBasemap();
    this._syncMap();
  }

  async _syncMap() {
    const point = this.view.point;
    const canvas = this.renderRoot.querySelector('.gbif-location__canvas');
    if (!point || !canvas) return;

    if (this._map && this._map.getContainer() !== canvas) this._destroyMap();
    if (this._map) {
      this._drawPoint(point);
      return;
    }
    if (this._initializing) return;

    this._initializing = true;
    try {
      const [{ default: L }, { default: leafletCss }] = await loadLeaflet();
      // The record may have changed, or the element been removed, while Leaflet loaded.
      const current = this.renderRoot.querySelector('.gbif-location__canvas');
      if (!this.isConnected || !current || this._map || !this.view.point) return;

      adoptLeafletStyles(this.renderRoot, leafletCss);
      this._leaflet = L;
      const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      this._map = L.map(current, { scrollWheelZoom: false, zoomAnimation: !reduceMotion, fadeAnimation: !reduceMotion });
      this._applyBasemap();
      this._drawPoint(this.view.point);
      this._resizeObserver = new ResizeObserver(() => this._map?.invalidateSize());
      this._resizeObserver.observe(current);
    } catch (error) {
      this._failed = true;
      emit(this, 'gbif-error', { component: this.localName, url: error.url, status: error.status ?? 0, message: error.message });
    } finally {
      this._initializing = false;
      if (!this._map && !this._failed && this.isConnected && this.view.point) this.requestUpdate();
    }
  }

  _applyBasemap() {
    const { url, attribution } = basemapSource(this);
    this._basemapLayer?.remove();
    this._basemapLayer = this._leaflet.tileLayer(url, { attribution, maxZoom: 18 }).addTo(this._map);
    this._basemapLayer.bringToBack();
  }

  /** The point, and a circle for its uncertainty, with the view fitted to them. */
  _drawPoint(point) {
    const L = this._leaflet;
    this._layers?.remove();
    const center = [point.lat, point.lng];
    this._layers = L.layerGroup().addTo(this._map);
    if (point.uncertainty) {
      L.circle(center, { radius: point.uncertainty, color: '#357a1f', weight: 2, fillColor: '#4c9c2e', fillOpacity: 0.2 }).addTo(this._layers);
    }
    // A circle marker, not Leaflet's pin: the pin is an image file that a page would have to serve.
    L.circleMarker(center, { radius: 6, color: '#1f2933', weight: 2, fillColor: '#fff', fillOpacity: 1 }).addTo(this._layers);
    // The view is worked out from the point and the radius. A circle cannot give its bounds until the map has
    // a view, which is what is being set here.
    if (point.uncertainty) this._map.fitBounds(L.latLng(center).toBounds(point.uncertainty * 2), { maxZoom: 14, padding: [24, 24], animate: false });
    else this._map.setView(center, 9, { animate: false });
  }

  _destroyMap() {
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    this._map?.remove();
    this._map = null;
    this._layers = null;
    this._basemapLayer = null;
  }

  _renderCoordinates(point) {
    const datum = this.recordEl?.interpreted?.geodeticDatum;
    return html`<p class="gbif-location__coordinates">
      ${degrees(point.lat, 'N', 'S')}, ${degrees(point.lng, 'E', 'W')}${point.uncertainty ? html` · ± ${Math.round(point.uncertainty).toLocaleString()} m` : nothing}${typeof datum === 'string' && datum ? html` · ${datum}` : nothing}
    </p>`;
  }

  render() {
    if (!this.ready) return nothing;
    const point = this.view.point;
    if (!point) return nothing;

    if (this._failed) {
      return html`<section class="gbif-card" part="card">
        <header class="gbif-card__header" part="header"><span class="gbif-card__badge">GBIF</span>${this.renderTitle(this.heading || 'Location')}</header>
        <div class="gbif-card__body"><p class="gbif-card__state" role="alert">Could not load the map.</p>${this._renderCoordinates(point)}</div>
      </section>`;
    }

    const name = this.recordEl?.interpreted?.scientificName;
    return html`
      <section class="gbif-card" part="card">
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>
          ${this.renderTitle(this.heading || 'Location')}
        </header>
        <div class="gbif-location__viewport" part="viewport">
          <div
            class="gbif-location__canvas"
            role="region"
            aria-label=${typeof name === 'string' && name ? `Map of where ${name} was recorded` : 'Map of where it was recorded'}
          ></div>
        </div>
        <footer class="gbif-card__footer" part="footer">
          ${this._renderCoordinates(point)}
          ${this.renderSource('Location from the occurrence record, via GBIF.')}
        </footer>
      </section>
    `;
  }
}
