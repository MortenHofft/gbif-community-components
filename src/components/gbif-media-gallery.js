import { html, css, nothing } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import { GbifTaxonElement } from '../shared/taxon-element.js';
import { buildUrl, getJson } from '../shared/api.js';
import { emit, linkIntent } from '../shared/events.js';
import { clampInt, formatLicense, parseLicenseFilter, safeHttpUrl } from '../shared/format.js';
import { occurrenceUrl, occurrenceSearchUrl } from '../shared/links.js';
import { IMAGE_RANKS } from '../shared/ranks.js';

const MAX_LIMIT = 300;

/** A usable image from a raw API result, or `null`. Nothing from the API is trusted. */
function toImage(item) {
  if (!item || typeof item !== 'object') return null;
  const src = safeHttpUrl(item.identifier);
  if (!src) return null;
  const license = formatLicense(item.license);
  return {
    src,
    occurrenceKey: item.occurrenceKey == null ? undefined : String(item.occurrenceKey),
    rightsHolder: typeof item.rightsHolder === 'string' && item.rightsHolder.trim() ? item.rightsHolder.trim() : undefined,
    license,
    licenseKey: license?.key ?? 'unknown'
  };
}

/**
 * <gbif-media-gallery taxon-key="4QHKG" limit="12" licenses="commercial"></gbif-media-gallery>
 *
 * Images of a species or a higher taxon (family and below), one at a time,
 * with the rights holder and licence shown for each. They cannot be hidden.
 * The component renders nothing when there are no images to show.
 *
 * Attributes: the shared taxon inputs, plus
 *   limit      how many images to load (1-300, default 20)
 *   licenses   which licences to show: a comma-separated list of
 *              cc0, pdm, cc-by, cc-by-sa, cc-by-nd, cc-by-nc, cc-by-nc-sa,
 *              cc-by-nc-nd, unknown, or the shortcuts "commercial" (licences
 *              that allow commercial use) and "derivatives" (that allow
 *              adaptation). Default: all.
 *
 * Events: `gbif-occurrence-select` (cancelable, "details" link),
 * `gbif-occurrences-select` (cancelable, "all" link), `gbif-taxon-resolved`,
 * `gbif-error` (also when an image fails to load).
 */
export class GbifMediaGallery extends GbifTaxonElement {
  static properties = {
    ...GbifTaxonElement.properties,
    limit: { type: Number },
    licenses: { type: String },
    _images: { state: true },
    _index: { state: true },
    _imageState: { state: true },
    _failed: { state: true },
    _loaded: { state: true }
  };

  static dataProperties = ['limit', 'licenses'];

  static styles = [
    ...GbifTaxonElement.styles,
    css`
      .gbif-media-gallery__viewer {
        position: relative;
        height: var(--gbif-gallery-height, 20rem);
        background: var(--gbif-color-media-background, #101418);
        outline-offset: -2px;
      }
      .gbif-media-gallery__image {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: contain;
        transition: opacity 150ms;
      }
      .gbif-media-gallery__image--hidden {
        opacity: 0;
      }
      .gbif-media-gallery__status {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0;
        color: #fff;
        font-size: 0.8rem;
      }
      .gbif-media-gallery__nav {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 2rem;
        height: 2rem;
        padding: 0;
        border: 1px solid var(--gbif-color-control-border, #7d8794);
        border-radius: 50%;
        background: rgb(255 255 255 / 0.92);
        color: #1f2933;
        font-size: 1.2rem;
        line-height: 1;
        cursor: pointer;
      }
      .gbif-media-gallery__nav--prev {
        left: 0.5rem;
      }
      .gbif-media-gallery__nav--next {
        right: 0.5rem;
      }
      .gbif-media-gallery__details {
        position: absolute;
        right: 0.5rem;
        bottom: 0.5rem;
        background: rgb(255 255 255 / 0.92);
        color: #1f2933;
      }
      .gbif-media-gallery__credit {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .gbif-media-gallery__counter {
        flex: none;
      }
    `
  ];

  constructor() {
    super();
    this.limit = 20;
    this._images = [];
    this._index = 0;
    this._imageState = 'loading';
    this._failed = false;
    this._loaded = false;
  }

  onTaxonReset() {
    this._images = [];
    this._index = 0;
    this._failed = false;
    this._loaded = false;
  }

  async onTaxonReady(taxon, isCurrent) {
    if (!IMAGE_RANKS.has(taxon.target.rank)) {
      this._loaded = true;
      return;
    }

    const { apiBase, checklistKey } = this.config;
    const limit = clampInt(this.limit, { min: 1, max: MAX_LIMIT, fallback: 20 });
    const filter = parseLicenseFilter(this.licenses);
    const url = buildUrl(
      apiBase,
      `/v1/occurrence/experimental/multimedia/species/${encodeURIComponent(checklistKey)}/${encodeURIComponent(taxon.target.key)}`,
      // The API cannot filter by licence, so with a filter ask for as many as
      // possible and filter here, otherwise a page of mostly excluded images
      // would leave almost nothing to show.
      { mediaType: 'stillImage', limit: filter ? MAX_LIMIT : limit, offset: 0 }
    );
    try {
      const data = await getJson(url);
      if (!isCurrent()) return;
      const results = Array.isArray(data?.results) ? data.results : [];
      this._images = results
        .map(toImage)
        .filter((image) => image && (!filter || filter.has(image.licenseKey)))
        .slice(0, limit);
      this._imageState = 'loading';
      this._loaded = true;
    } catch (error) {
      if (!isCurrent()) return;
      this._failed = true;
      this._loaded = true;
      this.reportError(error);
    }
  }

  _go(step) {
    const count = this._images.length;
    this._index = (this._index + step + count) % count;
    this._imageState = 'loading';
  }

  _onKeydown(event) {
    if (this._images.length < 2) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this._go(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this._go(1);
    }
  }

  _onImageError(image) {
    this._imageState = 'error';
    emit(this, 'gbif-error', { component: this.localName, url: image.src, status: 0, message: 'Image failed to load' });
  }

  _renderCredit(image) {
    return html`
      ${image.rightsHolder || 'Rights holder not stated'} ·
      ${image.license
        ? html`<a href=${image.license.url} target="_blank" rel="noopener">${image.license.label}</a>`
        : 'Licence not stated'}
    `;
  }

  render() {
    const taxon = this._taxon;
    const loading = taxon.status === 'loading' || (taxon.status === 'ready' && !this._loaded);

    if (taxon.status === 'ready' && this._failed) {
      return html`<section class="gbif-card" part="card">
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>${this.renderTitle(this.heading || 'Images')}
        </header>
        <div class="gbif-card__body"><p class="gbif-card__state" role="alert">Could not load images from GBIF.</p></div>
      </section>`;
    }
    if (taxon.status !== 'ready' || !this._images.length) {
      return this.renderReserved('var(--gbif-gallery-height, 20rem)', loading);
    }

    const { siteBase, checklistKey } = this.config;
    const image = this._images[this._index];
    const many = this._images.length > 1;
    const name = this.displayName;
    const alt = `${name ? `Image of ${name}` : 'Image'}${image.rightsHolder ? ` by ${image.rightsHolder}` : ''}`;
    const allUrl = occurrenceSearchUrl(siteBase, { taxonKey: taxon.target.key, checklistKey, view: 'gallery' });

    return html`
      <section class="gbif-card" part="card">
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>
          ${this.renderTitle(this.heading || 'Images')}
        </header>
        <div
          class="gbif-media-gallery__viewer"
          part="viewer"
          role="group"
          aria-roledescription="carousel"
          aria-label=${name ? `Images of ${name}` : 'Images'}
          tabindex=${many ? '0' : nothing}
          @keydown=${this._onKeydown}
        >
          ${keyed(
            `${this._index}:${image.src}`,
            html`<img
              class="gbif-media-gallery__image ${this._imageState === 'loaded' ? '' : 'gbif-media-gallery__image--hidden'}"
              src=${image.src}
              alt=${alt}
              loading="lazy"
              referrerpolicy="no-referrer"
              @load=${() => (this._imageState = 'loaded')}
              @error=${() => this._onImageError(image)}
            />`
          )}
          ${this._imageState === 'loading' ? html`<p class="gbif-media-gallery__status">Loading image…</p>` : nothing}
          ${this._imageState === 'error' ? html`<p class="gbif-media-gallery__status" role="alert">Image failed to load</p>` : nothing}
          ${many
            ? html`
                <button type="button" class="gbif-media-gallery__nav gbif-media-gallery__nav--prev" aria-label="Previous image" @click=${() => this._go(-1)}>‹</button>
                <button type="button" class="gbif-media-gallery__nav gbif-media-gallery__nav--next" aria-label="Next image" @click=${() => this._go(1)}>›</button>
              `
            : nothing}
          ${image.occurrenceKey
            ? html`<a
                class="gbif-button gbif-media-gallery__details"
                href=${occurrenceUrl(siteBase, image.occurrenceKey)}
                target="_blank"
                rel="noopener"
                @click=${(event) => linkIntent(this, event, 'gbif-occurrence-select', { occurrenceKey: image.occurrenceKey, source: 'media' })}
                >See details on GBIF.org</a
              >`
            : nothing}
        </div>
        <footer class="gbif-card__footer" part="footer">
          <span class="gbif-media-gallery__credit">${this._renderCredit(image)}</span>
          <span class="gbif-media-gallery__counter">
            ${this._index + 1} / ${this._images.length}
            <a
              href=${allUrl}
              target="_blank"
              rel="noopener"
              @click=${(event) => linkIntent(this, event, 'gbif-occurrences-select', { taxonKey: taxon.target.key, checklistKey, url: allUrl, source: 'gallery' })}
              >all</a
            >
          </span>
          ${this.renderSource('Images from GBIF occurrence records.')}
        </footer>
        <span class="gbif-visually-hidden" aria-live="polite">Image ${this._index + 1} of ${this._images.length}</span>
      </section>
    `;
  }
}
