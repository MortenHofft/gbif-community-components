import { html, css, nothing } from 'lit';
import { GbifTaxonElement } from '../shared/taxon-element.js';
import { buildUrl, getJson } from '../shared/api.js';
import { linkIntent } from '../shared/events.js';
import { clampInt } from '../shared/format.js';
import { occurrenceUrl } from '../shared/links.js';
import { TYPE_RANKS, TYPE_STATUSES } from '../shared/ranks.js';

/**
 * <gbif-type-specimens taxon-key="4QHKG" page-size="10"></gbif-type-specimens>
 *
 * A paged list of type specimens for a species or genus. The component renders
 * nothing for other ranks, or when there are no type specimens. If a request
 * fails it says so, and a failed page keeps the page already on screen.
 *
 * Attributes: the shared taxon inputs, plus `page-size` (1-300, default 10).
 * Events: `gbif-occurrence-select` (cancelable, when a specimen is clicked;
 * detail has the `occurrenceKey`), `gbif-taxon-resolved`, `gbif-error`.
 */
export class GbifTypeSpecimens extends GbifTaxonElement {
  static properties = {
    ...GbifTaxonElement.properties,
    pageSize: { type: Number, attribute: 'page-size' },
    _rows: { state: true },
    _total: { state: true },
    _page: { state: true },
    _loading: { state: true },
    _failed: { state: true },
    _pageError: { state: true }
  };

  static dataProperties = ['pageSize'];

  static styles = [
    ...GbifTaxonElement.styles,
    css`
      .gbif-type-specimens__list {
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .gbif-type-specimens__item + .gbif-type-specimens__item {
        border-top: 1px solid var(--gbif-color-border, #d5dbe1);
      }
      .gbif-type-specimens__link {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0.25rem 0.6rem;
        padding: 0.4rem 0;
        color: inherit;
        text-decoration: none;
      }
      .gbif-type-specimens__link:hover .gbif-type-specimens__name {
        text-decoration: underline;
      }
      .gbif-type-specimens__status {
        flex: none;
        padding: 0.05rem 0.4rem;
        border: 1px solid var(--gbif-color-control-border, #7d8794);
        border-radius: 4px;
        background: var(--gbif-color-surface-hover, #f2f4f7);
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .gbif-type-specimens__name {
        flex: 1;
      }
      .gbif-type-specimens__meta {
        flex: none;
        color: var(--gbif-color-muted, #596273);
        font-size: 0.75rem;
      }
      .gbif-type-specimens__pager {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 0.6rem;
        font-size: 0.75rem;
      }
      .gbif-type-specimens__error {
        margin: 0.5rem 0 0;
        color: var(--gbif-color-error, #a32020);
        font-size: 0.8rem;
      }
    `
  ];

  constructor() {
    super();
    this.pageSize = 10;
    this._rows = [];
    this._total = 0;
    this._page = 0;
    this._loading = false;
    this._failed = false;
    this._pageError = false;
  }

  get _size() {
    return clampInt(this.pageSize, { min: 1, max: 300, fallback: 10 });
  }

  get _pageCount() {
    return Math.max(1, Math.ceil(this._total / this._size));
  }

  onTaxonReset() {
    this._rows = [];
    this._total = 0;
    this._page = 0;
    this._loading = false;
    this._failed = false;
    this._pageError = false;
  }

  onTaxonReady(taxon, isCurrent) {
    if (!TYPE_RANKS.has(taxon.target.rank)) return;
    return this._loadPage(0, isCurrent);
  }

  async _loadPage(page, isCurrent = () => true) {
    const { apiBase, checklistKey } = this.config;
    const size = this._size;
    const url = buildUrl(apiBase, '/v1/occurrence/search', {
      checklistKey,
      taxonKey: this._taxon.target.key,
      limit: size,
      offset: page * size,
      typeStatus: TYPE_STATUSES
    });

    this._loading = true;
    this._pageError = false;
    try {
      const data = await getJson(url);
      if (!isCurrent()) return;
      this._rows = (Array.isArray(data?.results) ? data.results : []).filter((row) => row && typeof row === 'object');
      this._total = typeof data?.count === 'number' ? data.count : 0;
      this._page = page;
    } catch (error) {
      if (!isCurrent()) return;
      // Keep what is on screen if there is something; only a failed first load shows an error card.
      if (this._rows.length) this._pageError = true;
      else this._failed = true;
      this.reportError(error);
    } finally {
      if (isCurrent()) this._loading = false;
    }
  }

  _goTo(page) {
    if (page < 0 || page >= this._pageCount || this._loading) return;
    const run = this._runId;
    this._loadPage(page, () => run === this._runId);
  }

  _onRowClick(event, row) {
    linkIntent(this, event, 'gbif-occurrence-select', { occurrenceKey: String(row.key), source: 'type-specimens' });
  }

  _rowName(row) {
    const { checklistKey } = this.config;
    const name = row.classifications?.[checklistKey]?.usage?.name || row.scientificName || row.verbatimScientificName;
    return typeof name === 'string' && name ? name : '—';
  }

  _rowStatus(row) {
    return Array.isArray(row.typeStatus) ? row.typeStatus.join(', ') : row.typeStatus;
  }

  _renderPager() {
    const last = this._pageCount - 1;
    // aria-disabled, not disabled: a disabled button drops keyboard focus.
    return html`<div class="gbif-type-specimens__pager">
      <button
        type="button"
        class="gbif-button"
        aria-disabled=${this._page === 0 || this._loading ? 'true' : 'false'}
        @click=${() => this._goTo(this._page - 1)}
      >
        ‹ Prev
      </button>
      <span>Page ${this._page + 1} of ${this._pageCount}</span>
      <button
        type="button"
        class="gbif-button"
        aria-disabled=${this._page >= last || this._loading ? 'true' : 'false'}
        @click=${() => this._goTo(this._page + 1)}
      >
        Next ›
      </button>
    </div>`;
  }

  render() {
    const taxon = this._taxon;
    if (taxon.status !== 'ready' || !TYPE_RANKS.has(taxon.target.rank)) return nothing;

    if (this._failed) {
      return html`<section class="gbif-card" part="card">
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>${this.renderTitle(this.heading || 'Type specimens')}
        </header>
        <div class="gbif-card__body"><p class="gbif-card__state" role="alert">Could not load type specimens from GBIF.</p></div>
      </section>`;
    }
    // Nothing until results arrive, so taxa without type specimens never flash an empty card.
    if (!this._rows.length) return nothing;

    const { siteBase } = this.config;

    return html`
      <section class="gbif-card" part="card" aria-busy=${this._loading ? 'true' : 'false'}>
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>
          ${this.renderTitle(`${this.heading || 'Type specimens'} (${this._total.toLocaleString()})`)}
        </header>
        <div class="gbif-card__body" part="body">
          <ul class="gbif-type-specimens__list">
            ${this._rows.map((row) => {
              const meta = [
                row.country,
                row.institutionCode && `${row.institutionCode} ${row.catalogNumber ?? ''}`.trim(),
                row.eventDate
              ]
                .filter((part) => typeof part === 'string' && part)
                .join(' · ');
              return html`<li class="gbif-type-specimens__item">
                <a
                  class="gbif-type-specimens__link"
                  href=${occurrenceUrl(siteBase, row.key)}
                  target="_blank"
                  rel="noopener"
                  @click=${(event) => this._onRowClick(event, row)}
                >
                  <span class="gbif-type-specimens__status">${this._rowStatus(row)}</span>
                  <span class="gbif-type-specimens__name">${this._rowName(row)}</span>
                  ${meta ? html`<span class="gbif-type-specimens__meta">${meta}</span>` : nothing}
                </a>
              </li>`;
            })}
          </ul>
          ${this._pageError
            ? html`<p class="gbif-type-specimens__error" role="alert">Could not load that page. Showing the previous one.</p>`
            : nothing}
          ${this._pageCount > 1 ? this._renderPager() : nothing}
          <span class="gbif-visually-hidden" aria-live="polite">Page ${this._page + 1} of ${this._pageCount}</span>
        </div>
        ${this.config.showSource
          ? html`<footer class="gbif-card__footer" part="footer">${this.renderSource('Occurrence data from GBIF.')}</footer>`
          : nothing}
      </section>
    `;
  }
}
