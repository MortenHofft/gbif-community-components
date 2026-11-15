import { html, css, nothing } from 'lit';
import { GbifTaxonElement } from '../shared/taxon-element.js';
import { buildUrl, getJson } from '../shared/api.js';
import { linkIntent } from '../shared/events.js';
import { formatLicense } from '../shared/format.js';
import { occurrenceUrl, occurrenceSearchUrl } from '../shared/links.js';
import { IMAGE_RANKS } from '../shared/ranks.js';

/**
 * <gbif-media-gallery taxon-key="4QHKG" limit="12"></gbif-media-gallery>
 *
 * Images of a species or a higher taxon (family and below), one at a time,
 * with the rights holder and licence shown for each. The component renders
 * nothing when no images are found.
 *
 * Attributes: the shared taxon inputs, plus `limit` (default 20).
 * Events: `gbif-occurrence-select` (cancelable, when the "details" link is
 * clicked), `gbif-taxon-resolved`, `gbif-error`.
 */
export class GbifMediaGallery extends GbifTaxonElement {
  static properties = {
    ...GbifTaxonElement.properties,
    limit: { type: Number },
    _images: { state: true },
    _index: { state: true },
    _imageState: { state: true }
  };

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
        border: 1px solid var(--gbif-color-border, #d5dbe1);
        border-radius: 50%;
        background: rgb(255 255 255 / 0.9);
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
        background: rgb(255 255 255 / 0.9);
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
  }

  onTaxonReset() {
    this._images = [];
    this._index = 0;
  }

  async onTaxonReady(taxon, isCurrent) {
    if (!IMAGE_RANKS.has(taxon.target.rank)) return;

    const { apiBase, checklistKey } = this.config;
    const url = buildUrl(apiBase, `/v1/occurrence/experimental/multimedia/species/${checklistKey}/${taxon.target.key}`, {
      mediaType: 'stillImage',
      limit: this.limit || 20,
      offset: 0
    });
    try {
      const data = await getJson(url);
      if (!isCurrent()) return;
      this._images = (data?.results || []).filter((item) => item.identifier);
      this._imageState = 'loading';
    } catch (error) {
      if (isCurrent()) this.reportError(error);
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

  _onDetailsClick(event, image) {
    linkIntent(this, event, 'gbif-occurrence-select', {
      occurrenceKey: image.occurrenceKey,
      source: 'media'
    });
  }

  render() {
    if (!this._images.length) return nothing;

    const { siteBase, checklistKey } = this.config;
    const image = this._images[this._index];
    const license = formatLicense(image.license);
    const many = this._images.length > 1;
    const name = this.displayName;
    const alt = `${name ? `Image of ${name}` : 'Image'}${image.rightsHolder ? ` by ${image.rightsHolder}` : ''}`;
    const galleryUrl = occurrenceSearchUrl(siteBase, {
      taxonKey: this._taxon.target.key,
      checklistKey,
      view: 'gallery'
    });

    return html`
      <section class="gbif-card" part="card">
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>
          <h2 class="gbif-card__title">${this.heading || 'Images'}</h2>
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
          <img
            class="gbif-media-gallery__image ${this._imageState === 'loaded' ? '' : 'gbif-media-gallery__image--hidden'}"
            .src=${image.identifier}
            alt=${alt}
            loading="lazy"
            @load=${() => (this._imageState = 'loaded')}
            @error=${() => (this._imageState = 'error')}
          />
          ${this._imageState === 'loading'
            ? html`<p class="gbif-media-gallery__status" role="status">Loading image…</p>`
            : nothing}
          ${this._imageState === 'error'
            ? html`<p class="gbif-media-gallery__status" role="alert">Image failed to load</p>`
            : nothing}
          ${many
            ? html`
                <button
                  type="button"
                  class="gbif-media-gallery__nav gbif-media-gallery__nav--prev"
                  aria-label="Previous image"
                  @click=${() => this._go(-1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  class="gbif-media-gallery__nav gbif-media-gallery__nav--next"
                  aria-label="Next image"
                  @click=${() => this._go(1)}
                >
                  ›
                </button>
              `
            : nothing}
          ${image.occurrenceKey
            ? html`<a
                class="gbif-button gbif-media-gallery__details"
                href=${occurrenceUrl(siteBase, image.occurrenceKey)}
                target="_blank"
                rel="noopener"
                @click=${(event) => this._onDetailsClick(event, image)}
                >See details on GBIF.org</a
              >`
            : nothing}
        </div>
        <footer class="gbif-card__footer" part="footer">
          <span class="gbif-media-gallery__credit">
            ${image.rightsHolder || 'Unknown rights holder'}
            ${license
              ? html`· <a href=${license.url} target="_blank" rel="noopener">${license.label}</a>`
              : nothing}
          </span>
          <span class="gbif-media-gallery__counter">
            ${this._index + 1} / ${this._images.length}
            <a href=${galleryUrl} target="_blank" rel="noopener">all</a>
          </span>
        </footer>
      </section>
    `;
  }
}
