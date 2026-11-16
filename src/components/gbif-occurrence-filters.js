import { html, css, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { GbifSearchConsumer } from '../shared/search-consumer.js';
import { FILTERS, RECORD_LICENSES, countryName, normalizeFilter } from '../shared/filters.js';
import { basisLabel } from '../shared/occurrence.js';
import { clampInt } from '../shared/format.js';
import { emit } from '../shared/events.js';

const ALL_FILTERS = ['q', 'country', 'basisOfRecord', 'year', 'license', 'hasCoordinate'];
const kebabToCamel = (name) => name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

/** What a facet value is called on screen. */
const VALUE_LABELS = {
  country: countryName,
  basisOfRecord: basisLabel,
  license: (value) => RECORD_LICENSES[value] ?? value
};

/** A year filter (`2000`, `2000,2020`, `2000,*`, `*,1990`) as the two boxes' contents. */
function yearBounds(year) {
  if (typeof year !== 'string') return { from: '', to: '' };
  const [from, to] = year.split(',');
  if (to === undefined) return { from, to: from };
  return { from: from === '*' ? '' : from, to: to === '*' ? '' : to };
}

/**
 * <gbif-occurrence-filters search="#s"></gbif-occurrence-filters>
 *
 * A filter panel for an occurrence search: free text, country, basis of record,
 * year range, the licence of the record, and "only records with coordinates". The
 * lists show how many occurrences each value would give under the other filters.
 *
 * Attributes: `search` (the search element), plus
 *   filters      which filters to offer, a list of names: q, country, basis-of-record,
 *                year, license, has-coordinate (default: all). Filters the page author
 *                has fixed on the search element are never offered.
 *   facet-limit  how many values to list for each (1-100, default 15)
 *
 * It only changes the search's query; the table and gallery follow the search.
 */
export class GbifOccurrenceFilters extends GbifSearchConsumer {
  static properties = {
    filters: { type: String },
    facetLimit: { type: Number, attribute: 'facet-limit' },
    _query: { state: true },
    _facets: { state: true },
    _total: { state: true },
    _facetStatus: { state: true },
    _yearInvalid: { state: true }
  };

  static styles = [
    ...GbifSearchConsumer.styles,
    css`
      .gbif-occurrence-filters__form {
        display: grid;
        gap: 1rem;
      }
      .gbif-occurrence-filters__group {
        min-width: 0;
        margin: 0;
        padding: 0;
        border: 0;
      }
      .gbif-occurrence-filters__legend {
        padding: 0;
        margin-bottom: 0.25rem;
        font-weight: 600;
      }
      .gbif-occurrence-filters__list {
        max-height: 14rem;
        margin: 0;
        padding: 0;
        overflow: auto;
        list-style: none;
      }
      .gbif-occurrence-filters__option {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        padding: 0.1rem 0;
        cursor: pointer;
      }
      .gbif-occurrence-filters__option-label {
        flex: 1;
        min-width: 0;
      }
      .gbif-occurrence-filters__count {
        flex: none;
        color: var(--gbif-color-muted, #596273);
        font-size: 0.75rem;
      }
      .gbif-occurrence-filters__input {
        width: 100%;
        padding: 0.35rem 0.5rem;
        border: 1px solid var(--gbif-color-control-border, #7d8794);
        border-radius: 4px;
        background: var(--gbif-color-surface, #fff);
        color: var(--gbif-color-text, #1f2933);
        font: inherit;
      }
      .gbif-occurrence-filters__years {
        display: flex;
        gap: 0.5rem;
      }
      .gbif-occurrence-filters__years label {
        flex: 1;
        font-size: 0.75rem;
      }
      .gbif-occurrence-filters__total {
        margin: 0 0 0.75rem;
        font-weight: 600;
      }
    `
  ];

  constructor() {
    super();
    this.facetLimit = 15;
    this._query = {};
    this._facets = {};
    this._total = null;
    this._facetStatus = 'idle';
    this._yearInvalid = false;
    this._run = 0;
    this._typing = 0;
  }

  /** The filters to offer: the ones asked for that the page author has not fixed. */
  get _offered() {
    const asked =
      typeof this.filters === 'string' && this.filters.trim()
        ? this.filters.split(/[\s,]+/).map(kebabToCamel).filter((name) => ALL_FILTERS.includes(name))
        : ALL_FILTERS;
    const fixed = this.searchEl?.fixed ?? [];
    return [...new Set(asked)].filter((name) => !fixed.includes(name));
  }

  onSearchBound() {
    this._query = this.searchEl.userQuery;
    this._load();
  }

  updated(changed) {
    super.updated(changed);
    // Offering other filters, or a different number of values, needs the counts for them.
    const first = !this._updatedOnce;
    this._updatedOnce = true;
    if (!first && this.searchEl && (changed.has('filters') || changed.has('facetLimit'))) this._load();
  }

  onQueryChange() {
    this._query = this.searchEl.userQuery;
    this._load();
  }

  async _load() {
    const run = ++this._run;
    if (!this.searchEl.valid) {
      // Nothing is asked: an invalid predicate must never turn into a request for everything.
      this._facetStatus = 'idle';
      this._total = null;
      return;
    }
    this._facetStatus = 'loading';
    try {
      const { count, facets: byField } = await this.searchEl.fetchFacets({
        filters: this._offered.filter((name) => FILTERS[name].facet),
        facetLimit: clampInt(this.facetLimit, { min: 1, max: 100, fallback: 15 })
      });
      if (run !== this._run) return;
      this._total = count;
      this._facets = byField;
      this._facetStatus = 'ready';
    } catch (error) {
      if (run !== this._run) return;
      this._facetStatus = 'error';
      emit(this, 'gbif-error', { component: this.localName, url: error.url, status: error.status ?? 0, message: error.message });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._typing);
  }

  /* ---------- what the visitor does ---------- */

  _toggle(key, value, on) {
    const current = this._query[key] ?? [];
    this.searchEl.setFilters({ [key]: on ? [...current, value] : current.filter((v) => v !== value) });
  }

  /**
   * What the search box should hold. The search keeps the text trimmed, so writing it back would delete the
   * space the visitor has just typed ("puma " becoming "puma"). While the box holds the same text plus
   * spaces around it, leave it alone.
   */
  _textValue() {
    const shown = this._query.q ?? '';
    const input = this.renderRoot?.querySelector('#gbif-filter-q');
    return input && normalizeFilter('q', input.value) === (shown || undefined) ? input.value : shown;
  }

  _onText(event, immediately) {
    const value = event.target.value;
    clearTimeout(this._typing);
    if (immediately) this.searchEl.setFilters({ q: value });
    else this._typing = setTimeout(() => this.searchEl.setFilters({ q: value }), 400);
  }

  _onYear() {
    const from = this.renderRoot.querySelector('[name=year-from]').value.trim();
    const to = this.renderRoot.querySelector('[name=year-to]').value.trim();
    const year = from || to ? `${from || '*'},${to || '*'}` : null;
    // A year that is not one (12345, or 2020 to 1990 typed as text) leaves the filter as it was and says so;
    // it does not silently remove the year that was in force.
    this._yearInvalid = year !== null && normalizeFilter('year', year) === undefined;
    if (!this._yearInvalid) this.searchEl.setFilters({ year });
  }

  _reset() {
    if (Object.keys(this._query).length) this.searchEl.reset();
  }

  /* ---------- drawing ---------- */

  _renderMulti(key) {
    const selected = this._query[key] ?? [];
    const facet = FILTERS[key].facet;
    const counted = this._facets[facet] ?? [];
    const rows = [
      // A value the filter would refuse to apply is not offered: ticking it would do nothing.
      ...counted.filter(({ name }) => normalizeFilter(key, name) !== undefined).map(({ name, count }) => ({ name, count })),
      // A value that is chosen but not in the list (it has no matches now) must stay visible, to be unchosen.
      ...selected.filter((name) => !counted.some((c) => c.name === name)).map((name) => ({ name, count: 0 }))
    ];
    const label = VALUE_LABELS[key];

    return html`<fieldset class="gbif-occurrence-filters__group">
      <legend class="gbif-occurrence-filters__legend">${FILTERS[key].label}</legend>
      ${!rows.length
        ? html`<p class="gbif-card__state">${this._facetStatus === 'loading' ? 'Loading…' : 'No values.'}</p>`
        : html`<ul class="gbif-occurrence-filters__list">
            ${rows.map(
              ({ name, count }) => html`<li>
                <label class="gbif-occurrence-filters__option">
                  <input
                    type="checkbox"
                    .checked=${live(selected.includes(name))}
                    @change=${(event) => this._toggle(key, name, event.target.checked)}
                  />
                  <span class="gbif-occurrence-filters__option-label">${label(name)}</span>
                  <span class="gbif-occurrence-filters__count">${count.toLocaleString()}</span>
                </label>
              </li>`
            )}
          </ul>`}
    </fieldset>`;
  }

  _renderControl(key) {
    switch (key) {
      case 'q':
        return html`<div class="gbif-occurrence-filters__group">
          <label class="gbif-occurrence-filters__legend" for="gbif-filter-q">${FILTERS.q.label}</label>
          <input
            id="gbif-filter-q"
            class="gbif-occurrence-filters__input"
            type="search"
            .value=${this._textValue()}
            @input=${(event) => this._onText(event, false)}
            @keydown=${(event) => event.key === 'Enter' && this._onText(event, true)}
          />
        </div>`;
      case 'year': {
        const { from, to } = yearBounds(this._query.year);
        return html`<fieldset class="gbif-occurrence-filters__group">
          <legend class="gbif-occurrence-filters__legend">${FILTERS.year.label}</legend>
          <div class="gbif-occurrence-filters__years">
            <label>From
              <input class="gbif-occurrence-filters__input" name="year-from" type="number" min="0" max="9999" step="1" aria-invalid=${this._yearInvalid ? 'true' : 'false'} .value=${from} @change=${this._onYear} />
            </label>
            <label>To
              <input class="gbif-occurrence-filters__input" name="year-to" type="number" min="0" max="9999" step="1" aria-invalid=${this._yearInvalid ? 'true' : 'false'} .value=${to} @change=${this._onYear} />
            </label>
          </div>
          ${this._yearInvalid ? html`<p class="gbif-card__state" role="alert">Enter a year from 0 to 9999.</p>` : nothing}
        </fieldset>`;
      }
      case 'hasCoordinate':
        return html`<label class="gbif-occurrence-filters__option">
          <input
            type="checkbox"
            .checked=${live(this._query.hasCoordinate === true)}
            @change=${(event) => this.searchEl.setFilters({ hasCoordinate: event.target.checked })}
          />
          <span class="gbif-occurrence-filters__option-label">${FILTERS.hasCoordinate.label}</span>
        </label>`;
      default:
        return this._renderMulti(key);
    }
  }

  render() {
    const problem = this.renderSearchProblem();
    if (problem) return problem;

    const active = Object.keys(this._query).length > 0;
    return html`
      <section class="gbif-card" part="card" aria-busy=${this._facetStatus === 'loading' ? 'true' : 'false'}>
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>
          ${this.renderTitle(this.heading || 'Filters')}
        </header>
        <div class="gbif-card__body" part="body">
          ${this._total !== null
            ? html`<p class="gbif-occurrence-filters__total" role="status">
                ${this._total.toLocaleString()} occurrence${this._total === 1 ? '' : 's'}
              </p>`
            : nothing}
          ${this._facetStatus === 'error'
            ? html`<p class="gbif-card__state" role="alert">Could not load the filter options from GBIF.</p>`
            : nothing}
          <form class="gbif-occurrence-filters__form" @submit=${(event) => event.preventDefault()}>
            ${this._offered.map((key) => this._renderControl(key))}
            <div>
              <button type="button" class="gbif-button" aria-disabled=${active ? 'false' : 'true'} @click=${this._reset}>
                Clear filters
              </button>
            </div>
          </form>
        </div>
        ${this.config.showSource
          ? html`<footer class="gbif-card__footer" part="footer">${this.renderSource('Occurrence data from GBIF.')}</footer>`
          : nothing}
      </section>
    `;
  }
}
