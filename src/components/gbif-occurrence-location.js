import { html, css, nothing } from 'lit';
import { GbifRecordConsumer } from '../shared/record-consumer.js';
import { emit } from '../shared/events.js';
import { adoptLeafletStyles, basemapSource, loadLeaflet } from '../shared/leaflet.js';
import { buildLocationNotes } from '../shared/dwc.js';

/** Circles of uncertainty up to this many metres are drawn. */
const MAX_DRAWN_UNCERTAINTY = 2_000_000;
/** How far in the map goes on a point that is not the exact place. */
const APPROXIMATE_MAX_ZOOM = 8;

/** `-51.1` -> `51.1° S`, `72.9` -> `72.9° E`. */
const degrees = (value, positive, negative) => `${Math.abs(value)}° ${value < 0 ? negative : positive}`;

/**
 * <gbif-occurrence-location record="#r"></gbif-occurrence-location>
 *
 * A map of where the record says the occurrence was: a point, and a circle for the
 * coordinate uncertainty when the record gives one. Leaflet is only downloaded when there
 * is a map to draw.
 *
 * The card is always there, and says how far to trust the location. When the location was made less
 * exact on purpose (a sensitive species), or the coordinates are rounded, very uncertain or flagged by GBIF
 * as unreliable, a notice above the map says so, the point is drawn as an approximate one, and the map
 * does not zoom in past what the coordinates support. A record with no usable coordinates says that,
 * with whatever place name the record has, and any notice (such as that the location was withheld).
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
      .gbif-location__notes {
        margin: 0;
        padding: 0.6rem 1rem;
        list-style: none;
        border-bottom: 1px solid var(--gbif-color-border, #d5dbe1);
        background: var(--gbif-color-notice-background, #fff4d6);
        color: var(--gbif-color-notice-text, #5c3b00);
        font-size: 0.8rem;
      }
      .gbif-location__notes li + li {
        margin-top: 0.3rem;
      }
      .gbif-location__notes strong {
        font-weight: 700;
      }
      .gbif-location__place {
        margin: 0.5rem 0 0;
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
    // An uncertainty so large that the circle would cover a continent says nothing a map can show: it is in the text.
    const drawCircle = point.uncertainty && point.uncertainty <= MAX_DRAWN_UNCERTAINTY;
    if (drawCircle) {
      L.circle(center, { radius: point.uncertainty, color: '#357a1f', weight: 2, fillColor: '#4c9c2e', fillOpacity: 0.2 }).addTo(this._layers);
    }
    // A circle marker, not Leaflet's pin: the pin is an image file that a page would have to serve. An approximate
    // point is drawn dashed and in the warning colour, so that it is not read as an exact place.
    L.circleMarker(center, point.approximate
      ? { radius: 9, color: '#8a4b00', weight: 2, dashArray: '4 3', fillColor: '#f7c873', fillOpacity: 0.7 }
      : { radius: 6, color: '#1f2933', weight: 2, fillColor: '#fff', fillOpacity: 1 }).addTo(this._layers);
    // Zooming in on an approximate point would make it look exact: stop at a regional view.
    this._map.setMaxZoom(point.approximate ? APPROXIMATE_MAX_ZOOM : 18);
    // The view is worked out from the point and the radius. A circle cannot give its bounds until the map has
    // a view, which is what is being set here.
    const maxZoom = point.approximate ? APPROXIMATE_MAX_ZOOM : 14;
    if (drawCircle) this._map.fitBounds(L.latLng(center).toBounds(point.uncertainty * 2), { maxZoom, padding: [24, 24], animate: false });
    else this._map.setView(center, point.approximate || point.uncertainty ? Math.min(6, maxZoom) : 9, { animate: false });
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

  _renderNotes(notes) {
    if (!notes.length) return nothing;
    const LABELS = { generalized: 'Generalised location.', withheld: 'Withheld.', flagged: 'Unreliable location.', coarse: 'Approximate location.' };
    return html`<ul class="gbif-location__notes" part="notes" role="note" aria-label="About this location">
      ${notes.map((note) => html`<li><strong>${LABELS[note.kind] ?? 'Note.'}</strong> ${note.text}</li>`)}
    </ul>`;
  }

  render() {
    const problem = this.renderRecordProblem();
    if (problem) return problem;
    if (!this.ready) return nothing;
    const record = this.recordEl?.interpreted;
    const point = this.view.point;
    const header = html`<header class="gbif-card__header" part="header"><span class="gbif-card__badge">GBIF</span>${this.renderTitle(this.heading || 'Location')}</header>`;

    // No usable coordinates: say so, with the place the record names and anything it says about the location.
    if (!point) {
      const place = ['locality', 'municipality', 'county', 'stateProvince', 'country']
        .map((term) => (typeof record?.[term] === 'string' ? record[term].trim() : ''))
        .filter(Boolean);
      return html`<section class="gbif-card" part="card">
        ${header}
        ${this._renderNotes(buildLocationNotes(record))}
        <div class="gbif-card__body" part="body">
          <p class="gbif-card__state">This record has no usable coordinates, so there is no map.</p>
          ${place.length ? html`<p class="gbif-location__place">Place named in the record: ${[...new Set(place)].join(', ')}</p>` : nothing}
        </div>
      </section>`;
    }

    if (this._failed) {
      return html`<section class="gbif-card" part="card">
        ${header}
        ${this._renderNotes(point.notes)}
        <div class="gbif-card__body"><p class="gbif-card__state" role="alert">Could not load the map.</p>${this._renderCoordinates(point)}</div>
      </section>`;
    }

    const name = record?.scientificName;
    return html`
      <section class="gbif-card" part="card">
        ${header}
        ${this._renderNotes(point.notes)}
        <div class="gbif-location__viewport" part="viewport">
          <div
            class="gbif-location__canvas"
            role="region"
            aria-label=${typeof name === 'string' && name ? `Map of where ${name} was recorded${point.approximate ? ' (approximate)' : ''}` : `Map of where it was recorded${point.approximate ? ' (approximate)' : ''}`}
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
