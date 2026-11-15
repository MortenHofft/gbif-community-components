import { html, css, nothing } from 'lit';
import { GbifSearchConsumer } from '../shared/search-consumer.js';
import { linkIntent, emit } from '../shared/events.js';
import { clampInt, parseLicenseFilter } from '../shared/format.js';
import { occurrenceUrl } from '../shared/links.js';
import { MAX_RESULTS, firstImage, thumbnailUrl } from '../shared/occurrence.js';

/**
 * <gbif-occurrence-gallery search="#s"></gbif-occurrence-gallery>
 *
 * The images of the occurrences of an occurrence search, as a grid, a page at a
 * time. Only occurrences that have a still image are asked for. Each image is shown
 * with its rights holder and licence, which cannot be hidden.
 *
 * Attributes: `search` (the search element), plus
 *   page-size   images per page (1-100, default 24)
 *   licenses    which image licences to show, as on <gbif-media-gallery>:
 *               cc0, pdm, cc-by, cc-by-sa, cc-by-nd, cc-by-nc, cc-by-nc-sa,
 *               cc-by-nc-nd, unknown, "commercial", "derivatives" (default: all).
 *               This is the licence of each image, not of the record (the filter
 *               panel's licence). A page can show fewer images than its size.
 *   images      "gbif" (default) shows small versions from GBIF's image cache, so
 *               visitors' browsers contact GBIF and not the publishers' servers.
 *               "original" shows the publishers' full-size files instead.
 *
 * Events: `gbif-occurrence-select` (cancelable, an image was clicked), `gbif-error`
 * (also when an image fails to load).
 */
export class GbifOccurrenceGallery extends GbifSearchConsumer {
  static properties = {
    pageSize: { type: Number, attribute: 'page-size' },
    licenses: { type: String },
    images: { type: String },
    _tiles: { state: true },
    _total: { state: true },
    _page: { state: true },
    _status: { state: true },
    _pageError: { state: true },
    _loading: { state: true },
    _fallback: { state: true },
    _broken: { state: true }
  };

  static styles = [
    ...GbifSearchConsumer.styles,
    css`
      .gbif-occurrence-gallery__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(var(--gbif-gallery-tile, 10rem), 1fr));
        gap: 0.75rem;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .gbif-occurrence-gallery__tile {
        margin: 0;
        min-width: 0;
      }
      .gbif-occurrence-gallery__link {
        display: block;
        aspect-ratio: 1;
        overflow: hidden;
        border-radius: 4px;
        background: var(--gbif-color-media-background, #101418);
      }
      .gbif-occurrence-gallery__image {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .gbif-occurrence-gallery__broken {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 0.5rem;
        color: #fff;
        font-size: 0.75rem;
        text-align: center;
      }
      .gbif-occurrence-gallery__caption {
        margin-top: 0.25rem;
        font-size: 0.7rem;
        line-height: 1.3;
        color: var(--gbif-color-muted, #596273);
        overflow-wrap: anywhere;
      }
      .gbif-occurrence-gallery__name {
        display: block;
        font-style: italic;
        color: var(--gbif-color-text, #1f2933);
      }
      .gbif-occurrence-gallery__summary {
        margin: 0 0 0.75rem;
        color: var(--gbif-color-muted, #596273);
        font-size: 0.75rem;
      }
      .gbif-occurrence-gallery__pager {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 0.75rem;
        font-size: 0.75rem;
      }
      .gbif-occurrence-gallery__error {
        margin: 0.5rem 0 0;
        color: var(--gbif-color-error, #a32020);
        font-size: 0.8rem;
      }
    `
  ];

  constructor() {
    super();
    this.pageSize = 24;
    this.images = 'gbif';
    this._tiles = [];
    this._total = 0;
    this._page = 0;
    this._status = 'idle';
    this._pageError = false;
    this._loading = false;
    this._fallback = new Set();
    this._broken = new Set();
    this._run = 0;
  }

  get _size() {
    return clampInt(this.pageSize, { min: 1, max: 100, fallback: 24 });
  }

  get _pageCount() {
    return Math.max(1, Math.ceil(Math.min(this._total, MAX_RESULTS) / this._size));
  }

  updated(changed) {
    super.updated(changed);
    if (this.searchEl && ['pageSize', 'licenses'].some((n) => changed.has(n) && changed.get(n) !== undefined)) this._load(0);
  }

  onSearchBound() {
    this._load(0);
  }

  onQueryChange() {
    this._load(0);
  }

  /** `paging`: moving within the same search. A failure then keeps the page on screen; a failed new search does not. */
  async _load(page, { paging = false } = {}) {
    const run = ++this._run;
    if (!this.searchEl.valid) {
      // Nothing is asked: an invalid predicate must never turn into a request for everything.
      this._tiles = [];
      this._status = 'invalid';
      this._loading = false;
      return;
    }
    this._status = this._status === 'ready' ? 'ready' : 'loading';
    this._pageError = false;
    this._loading = true;
    try {
      const { count, results } = await this.searchEl.fetchPage({ limit: this._size, offset: page * this._size, mediaType: 'StillImage' });
      if (run !== this._run) return;
      const filter = parseLicenseFilter(this.licenses);
      this._tiles = results.map(firstImage).filter((tile) => tile && (!filter || filter.has(tile.licenseKey)));
      this._total = count;
      this._page = page;
      this._fallback = new Set();
      this._broken = new Set();
      this._status = 'ready';
    } catch (error) {
      if (run !== this._run) return;
      // Tiles from an earlier search would be wrong for this one, so only a failed page of the same search keeps them.
      if (paging && this._status === 'ready') this._pageError = true;
      else {
        this._status = 'error';
        this._tiles = [];
      }
      emit(this, 'gbif-error', { component: this.localName, url: error.url, status: error.status ?? 0, message: error.message });
    } finally {
      if (run === this._run) this._loading = false;
    }
  }

  _goTo(page) {
    if (page < 0 || page >= this._pageCount || this._loading) return;
    this._load(page, { paging: true });
  }

  /** The cached small version at first; the publisher's file if that fails; a message if both do. */
  _src(tile) {
    const useOriginal = this.images === 'original' || this._fallback.has(tile.identifier);
    return useOriginal
      ? tile.identifier
      : thumbnailUrl({ apiBase: this.config.apiBase, occurrenceKey: tile.occurrenceKey, identifier: tile.identifier });
  }

  _onImageError(tile) {
    const alreadyOriginal = this.images === 'original' || this._fallback.has(tile.identifier);
    if (!alreadyOriginal) {
      this._fallback = new Set([...this._fallback, tile.identifier]);
      return;
    }
    this._broken = new Set([...this._broken, tile.identifier]);
    emit(this, 'gbif-error', { component: this.localName, url: tile.identifier, status: 0, message: 'Image failed to load' });
  }

  _renderTile(tile) {
    const siteBase = this.config.siteBase;
    const by = tile.rightsHolder ? `, photo by ${tile.rightsHolder}` : '';
    const alt = `${tile.name ?? 'Occurrence image'}${tile.country ? ` (${tile.country})` : ''}${by}`;
    return html`<li class="gbif-occurrence-gallery__tile">
      <figure style="margin:0">
        <a
          class="gbif-occurrence-gallery__link"
          href=${occurrenceUrl(siteBase, tile.occurrenceKey)}
          target="_blank"
          rel="noopener"
          aria-label=${`Open this occurrence on GBIF.org: ${alt}`}
          @click=${(event) => linkIntent(this, event, 'gbif-occurrence-select', { occurrenceKey: tile.occurrenceKey, source: 'gallery' })}
        >
          ${this._broken.has(tile.identifier)
            ? html`<span class="gbif-occurrence-gallery__broken">Image failed to load</span>`
            : html`<img
                class="gbif-occurrence-gallery__image"
                src=${this._src(tile)}
                alt=${alt}
                loading="lazy"
                referrerpolicy="no-referrer"
                @error=${() => this._onImageError(tile)}
              />`}
        </a>
        <figcaption class="gbif-occurrence-gallery__caption">
          ${tile.name ? html`<span class="gbif-occurrence-gallery__name">${tile.name}</span>` : nothing}
          ${tile.rightsHolder ?? 'Rights holder not stated'} ·
          ${tile.license ? html`<a href=${tile.license.url} target="_blank" rel="noopener">${tile.license.label}</a>` : 'Licence not stated'}
        </figcaption>
      </figure>
    </li>`;
  }

  _renderBody() {
    if (this._status === 'error') {
      return html`<p class="gbif-card__state" role="alert">Could not load images from GBIF.</p>`;
    }
    if (this._status === 'loading') return html`<p class="gbif-card__state" role="status">Loading…</p>`;
    if (!this._tiles.length) {
      return html`<p class="gbif-card__state" role="status">No images match these filters.</p>`;
    }
    return html`
      <p class="gbif-occurrence-gallery__summary" role="status">${this._total.toLocaleString()} occurrence${this._total === 1 ? '' : 's'} with images</p>
      <ul class="gbif-occurrence-gallery__grid" part="grid">${this._tiles.map((tile) => this._renderTile(tile))}</ul>
      ${this._pageError ? html`<p class="gbif-occurrence-gallery__error" role="alert">Could not load that page. Showing the previous one.</p>` : nothing}
      ${this._pageCount > 1
        ? html`<div class="gbif-occurrence-gallery__pager">
            <button type="button" class="gbif-button" aria-disabled=${this._page === 0 || this._loading ? 'true' : 'false'} @click=${() => this._goTo(this._page - 1)}>‹ Prev</button>
            <span>Page ${(this._page + 1).toLocaleString()} of ${this._pageCount.toLocaleString()}</span>
            <button type="button" class="gbif-button" aria-disabled=${this._page >= this._pageCount - 1 || this._loading ? 'true' : 'false'} @click=${() => this._goTo(this._page + 1)}>Next ›</button>
          </div>`
        : nothing}
      <span class="gbif-visually-hidden" aria-live="polite">Page ${this._page + 1} of ${this._pageCount}</span>
    `;
  }

  render() {
    const problem = this.renderSearchProblem();
    if (problem) return problem;
    return html`
      <section class="gbif-card" part="card" aria-busy=${this._loading ? 'true' : 'false'}>
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>
          ${this.renderTitle(this.heading || 'Images')}
        </header>
        <div class="gbif-card__body" part="body">${this._renderBody()}</div>
        ${this.config.showSource ? html`<footer class="gbif-card__footer" part="footer">${this.renderSource('Images from GBIF occurrence records.')}</footer>` : nothing}
      </section>
    `;
  }
}
