import { html, css, nothing } from 'lit';
import { GbifRecordConsumer } from '../shared/record-consumer.js';
import { emit } from '../shared/events.js';
import { cleanOccurrenceKey } from '../shared/dwc.js';
import { parseLicenseFilter } from '../shared/format.js';
import { thumbnailUrl } from '../shared/occurrence.js';

/**
 * <gbif-occurrence-images record="#r"></gbif-occurrence-images>
 *
 * The images of the record, each with its credit: who made it, who holds the rights, who
 * published it, and its licence, which cannot be hidden. A click goes to the publisher's page
 * for the image, or to the image itself. Media that are not still images (sound, video) are
 * listed below as links. A record without media shows nothing.
 *
 * Attributes: `record` (the record element), plus
 *   images   "gbif" (default) shows versions from GBIF's image cache (600 px wide), so visitors'
 *            browsers contact GBIF and not the publisher's server. If the cache has no picture,
 *            the publisher's file is tried, and then a message is shown with the credit.
 *            "original" shows the publishers' full-size files.
 *   licenses which image licences to show, as on <gbif-media-gallery>: "cc0, cc-by", or "commercial".
 *            An image whose licence is not stated is not shown when this is set. Default: all.
 *   limit    the most images to show (1-200). Default: all.
 *
 * Also `heading`, `heading-level` and `hide-source`. The image size is `--gbif-record-image-min` (default 14rem).
 * Event: `gbif-error` when an image fails to load.
 */
export class GbifOccurrenceImages extends GbifRecordConsumer {
  static properties = {
    images: { type: String },
    licenses: { type: String },
    limit: { type: Number },
    _fallback: { state: true },
    _broken: { state: true }
  };

  static styles = [
    ...GbifRecordConsumer.styles,
    css`
      .gbif-images__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--gbif-record-image-min, 14rem)), 1fr));
        gap: 1rem;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .gbif-images__figure {
        margin: 0;
      }
      .gbif-images__link {
        display: block;
        overflow: hidden;
        border-radius: 4px;
        background: var(--gbif-color-media-background, #101418);
      }
      .gbif-images__image {
        display: block;
        width: 100%;
        height: auto;
        max-height: 24rem;
        object-fit: contain;
      }
      .gbif-images__broken {
        display: block;
        padding: 2rem 0.5rem;
        color: #fff;
        font-size: 0.8rem;
        text-align: center;
      }
      .gbif-images__caption {
        margin-top: 0.35rem;
        color: var(--gbif-color-muted, #596273);
        font-size: 0.75rem;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }
      .gbif-images__title {
        display: block;
        color: var(--gbif-color-text, #1f2933);
        font-weight: 600;
      }
      .gbif-images__other {
        margin: 1rem 0 0;
        padding: 0;
        list-style: none;
        font-size: 0.8rem;
      }
    `
  ];

  constructor() {
    super();
    this.images = 'gbif';
    this._fallback = new Set();
    this._broken = new Set();
  }

  onRecordChange() {
    this._fallback = new Set();
    this._broken = new Set();
  }

  _src(image) {
    const key = cleanOccurrenceKey(this.recordEl?.occurrenceKey);
    const original = this.images === 'original' || this._fallback.has(image.identifier) || !key;
    return original ? image.url : thumbnailUrl({ apiBase: this.config.apiBase, occurrenceKey: key, identifier: image.identifier, width: 600 });
  }

  _onError(image) {
    const alreadyOriginal = this.images === 'original' || this._fallback.has(image.identifier);
    if (!alreadyOriginal) {
      this._fallback = new Set([...this._fallback, image.identifier]);
      return;
    }
    this._broken = new Set([...this._broken, image.identifier]);
    emit(this, 'gbif-error', { component: this.localName, url: image.url, status: 0, message: 'Image failed to load' });
  }

  _renderCredit(image) {
    const parts = [
      image.creator ? html`By ${image.creator}` : nothing,
      image.rightsHolder && image.rightsHolder !== image.creator ? html`Rights holder: ${image.rightsHolder}` : nothing,
      image.publisher ? html`Published by ${image.publisher}` : nothing,
      image.license ? html`<a href=${image.license.url} target="_blank" rel="noopener">${image.license.label}</a>` : html`Licence not stated`,
      image.created ? html`${image.created.slice(0, 10)}` : nothing
    ].filter((part) => part !== nothing);
    return parts.map((part, i) => html`${i ? ' · ' : ''}${part}`);
  }

  _renderImage(image) {
    const name = this.recordEl?.interpreted?.scientificName;
    const alt = image.description ?? image.title ?? `${typeof name === 'string' && name ? `Image of ${name}` : 'Image'}${image.creator ? ` by ${image.creator}` : ''}`;
    const href = image.references ?? image.url;
    return html`<li>
      <figure class="gbif-images__figure">
        <a class="gbif-images__link" href=${href} target="_blank" rel="noopener" aria-label=${`Open this image at its publisher: ${alt}`}>
          ${this._broken.has(image.identifier)
            ? html`<span class="gbif-images__broken">Image failed to load</span>`
            : html`<img class="gbif-images__image" src=${this._src(image)} alt=${alt} loading="lazy" referrerpolicy="no-referrer" @error=${() => this._onError(image)} />`}
        </a>
        <figcaption class="gbif-images__caption">
          ${image.title ? html`<span class="gbif-images__title">${image.title}</span>` : nothing}
          ${this._renderCredit(image)}
        </figcaption>
      </figure>
    </li>`;
  }

  /** The images to show: those the licence filter lets through, and no more than `limit`. */
  _shown(all) {
    const filter = parseLicenseFilter(this.licenses);
    const allowed = filter ? all.filter((image) => filter.has(image.license?.key ?? 'unknown')) : all;
    const limit = Number.isInteger(this.limit) && this.limit > 0 ? Math.min(this.limit, 200) : Infinity;
    return { images: allowed.slice(0, limit), hidden: all.length - allowed.length };
  }

  render() {
    const problem = this.renderRecordProblem();
    if (problem) return problem;
    if (!this.ready) return nothing;
    const { other } = this.view.media;
    const { images, hidden } = this._shown(this.view.media.images);
    if (!images.length && !other.length) return nothing;

    return html`
      <section class="gbif-card" part="card">
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>
          ${this.renderTitle(this.heading || (images.length ? 'Images' : 'Media'))}
        </header>
        <div class="gbif-card__body" part="body">
          ${images.length ? html`<ul class="gbif-images__grid" part="grid">${images.map((image) => this._renderImage(image))}</ul>` : nothing}
          ${hidden ? html`<p class="gbif-images__caption">${hidden} image${hidden === 1 ? '' : 's'} not shown, because of the licence filter.</p>` : nothing}
          ${other.length
            ? html`<ul class="gbif-images__other">
                ${other.map(
                  (media) => html`<li>
                    <a href=${media.url} target="_blank" rel="noopener">${media.title ?? media.type ?? 'Media'}${media.format ? ` (${media.format})` : ''}</a>
                    ${media.type ? html`<span class="gbif-images__caption"> · ${media.type}</span>` : nothing}
                    ${media.license ? html` · <a class="gbif-images__caption" href=${media.license.url} target="_blank" rel="noopener">${media.license.label}</a>` : nothing}
                  </li>`
                )}
              </ul>`
            : nothing}
        </div>
        ${this.config.showSource ? html`<footer class="gbif-card__footer" part="footer">${this.renderSource('Media from the occurrence record, via GBIF.')}</footer>` : nothing}
      </section>
    `;
  }
}
