import { html, css, nothing } from 'lit';
import { GbifSearchConsumer } from '../shared/search-consumer.js';
import { linkIntent, emit } from '../shared/events.js';
import { clampInt } from '../shared/format.js';
import { occurrenceUrl } from '../shared/links.js';
import { COLUMNS, MAX_RESULTS, cellText, parseColumns } from '../shared/occurrence.js';

/**
 * <gbif-occurrence-table search="#s"></gbif-occurrence-table>
 *
 * The occurrences of an occurrence search, a page at a time. Going back to the
 * first page whenever the search's filters change. A search with no results says
 * so, as filters can easily produce none.
 *
 * Attributes: `search` (the search element), plus
 *   columns    which columns to show, a list chosen from: scientificName, country,
 *              eventDate, year, basisOfRecord, recordedBy, dataset, institution,
 *              license (default: scientificName country eventDate basisOfRecord dataset)
 *   page-size  rows per page (1-100, default 20)
 *
 * Events: `gbif-occurrence-select` (cancelable, a scientific name was clicked),
 * `gbif-error`. GBIF does not page past 100,000 results, and nor does the table.
 */
export class GbifOccurrenceTable extends GbifSearchConsumer {
  static properties = {
    columns: { type: String },
    pageSize: { type: Number, attribute: 'page-size' },
    _rows: { state: true },
    _total: { state: true },
    _page: { state: true },
    _status: { state: true },
    _pageError: { state: true },
    _loading: { state: true }
  };

  static styles = [
    ...GbifSearchConsumer.styles,
    css`
      .gbif-occurrence-table__scroll {
        overflow-x: auto;
      }
      .gbif-occurrence-table__table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8125rem;
      }
      .gbif-occurrence-table__table th,
      .gbif-occurrence-table__table td {
        padding: 0.4rem 0.6rem;
        border-bottom: 1px solid var(--gbif-color-border, #d5dbe1);
        text-align: left;
        vertical-align: top;
      }
      .gbif-occurrence-table__table th {
        color: var(--gbif-color-muted, #596273);
        font-size: 0.7rem;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .gbif-occurrence-table__name {
        font-style: italic;
      }
      .gbif-occurrence-table__nowrap {
        white-space: nowrap;
      }
      .gbif-occurrence-table__summary {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 0.5rem;
        padding: 0.5rem var(--gbif-card-padding, 1rem);
        color: var(--gbif-color-muted, #596273);
        font-size: 0.75rem;
      }
      .gbif-occurrence-table__pager {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.6rem var(--gbif-card-padding, 1rem);
        font-size: 0.75rem;
      }
      .gbif-occurrence-table__error {
        margin: 0;
        padding: 0 var(--gbif-card-padding, 1rem) 0.6rem;
        color: var(--gbif-color-error, #a32020);
        font-size: 0.8rem;
      }
    `
  ];

  constructor() {
    super();
    this.pageSize = 20;
    this._rows = [];
    this._total = 0;
    this._page = 0;
    this._status = 'idle';
    this._pageError = false;
    this._loading = false;
    this._run = 0;
  }

  get _size() {
    return clampInt(this.pageSize, { min: 1, max: 100, fallback: 20 });
  }

  get _pageCount() {
    return Math.max(1, Math.ceil(Math.min(this._total, MAX_RESULTS) / this._size));
  }

  get _columns() {
    return parseColumns(this.columns);
  }

  updated(changed) {
    super.updated(changed);
    // Any later change reloads, including the first value an attribute is given after the page has loaded.
    const first = !this._updatedOnce;
    this._updatedOnce = true;
    if (!first && changed.has('pageSize') && this.searchEl) this._load(0);
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
      this._rows = [];
      this._status = 'invalid';
      this._loading = false;
      return;
    }
    this._status = this._status === 'ready' ? 'ready' : 'loading';
    this._pageError = false;
    this._loading = true;
    try {
      const { count, results } = await this.searchEl.fetchPage({ limit: this._size, offset: page * this._size });
      if (run !== this._run) return;
      this._rows = results;
      this._total = count;
      this._page = page;
      this._status = 'ready';
    } catch (error) {
      if (run !== this._run) return;
      // Rows from an earlier search would be wrong for this one, so only a failed page of the same search keeps them.
      if (paging && this._status === 'ready') this._pageError = true;
      else {
        this._status = 'error';
        this._rows = [];
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

  _renderPager() {
    return html`<div class="gbif-occurrence-table__pager">
      <button type="button" class="gbif-button" aria-disabled=${this._page === 0 || this._loading ? 'true' : 'false'} @click=${() => this._goTo(this._page - 1)}>‹ Prev</button>
      <span>Page ${(this._page + 1).toLocaleString()} of ${this._pageCount.toLocaleString()}</span>
      <button type="button" class="gbif-button" aria-disabled=${this._page >= this._pageCount - 1 || this._loading ? 'true' : 'false'} @click=${() => this._goTo(this._page + 1)}>Next ›</button>
    </div>`;
  }

  _renderCell(column, row) {
    const text = cellText(column, row);
    if (column !== 'scientificName') {
      const short = column === 'eventDate' || column === 'year';
      return html`<td class=${short ? 'gbif-occurrence-table__nowrap' : ''}>${text}</td>`;
    }
    return html`<td class="gbif-occurrence-table__name">
      <a
        href=${occurrenceUrl(this.config.siteBase, row.key)}
        target="_blank"
        rel="noopener"
        @click=${(event) => linkIntent(this, event, 'gbif-occurrence-select', { occurrenceKey: String(row.key), source: 'table' })}
        >${text || 'Occurrence'}</a
      >
    </td>`;
  }

  _renderBody() {
    if (this._status === 'error') {
      return html`<div class="gbif-card__body"><p class="gbif-card__state" role="alert">Could not load occurrences from GBIF.</p></div>`;
    }
    if (this._status === 'loading') {
      return html`<div class="gbif-card__body"><p class="gbif-card__state" role="status">Loading…</p></div>`;
    }
    if (!this._rows.length) {
      return html`<div class="gbif-card__body"><p class="gbif-card__state" role="status">No occurrences match these filters.</p></div>`;
    }
    const columns = this._columns;
    return html`
      <div class="gbif-occurrence-table__summary">
        <span role="status">${this._total.toLocaleString()} occurrence${this._total === 1 ? '' : 's'}${this._total > MAX_RESULTS ? ` (the first ${MAX_RESULTS.toLocaleString()} can be paged through)` : ''}</span>
      </div>
      <div class="gbif-occurrence-table__scroll" role="region" aria-label="Occurrences" tabindex="0">
        <table class="gbif-occurrence-table__table" part="table">
          <thead>
            <tr>${columns.map((column) => html`<th scope="col">${COLUMNS[column].label}</th>`)}</tr>
          </thead>
          <tbody>
            ${this._rows.map((row) => html`<tr>${columns.map((column) => this._renderCell(column, row))}</tr>`)}
          </tbody>
        </table>
      </div>
      ${this._pageError ? html`<p class="gbif-occurrence-table__error" role="alert">Could not load that page. Showing the previous one.</p>` : nothing}
      ${this._pageCount > 1 ? this._renderPager() : nothing}
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
          ${this.renderTitle(this.heading || 'Occurrences')}
        </header>
        ${this._renderBody()}
        ${this.config.showSource ? html`<footer class="gbif-card__footer" part="footer">${this.renderSource('Occurrence data from GBIF.')}</footer>` : nothing}
      </section>
    `;
  }
}
