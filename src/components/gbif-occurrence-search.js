import { LitElement, css, html } from 'lit';
import { resolveConfig } from '../shared/config.js';
import { emit } from '../shared/events.js';
import { mergeQuery, normalizeQuery, readUrlQuery, sameQuery, toParams, writeUrlQuery } from '../shared/filters.js';

const BASE_FILTER_PROPERTIES = ['country', 'year', 'basisOfRecord', 'license', 'hasCoordinate', 'q'];
const SCOPE_PROPERTIES = ['taxonKey', 'datasetKey', 'checklistKey', 'apiBase', 'siteBase'];

/** A key from an attribute: a short plain string, or nothing. */
const cleanKey = (value) => (typeof value === 'string' && /^[\w.-]{1,64}$/.test(value.trim()) ? value.trim() : undefined);

/**
 * <gbif-occurrence-search id="s" taxon-key="4QHKG" sync-url></gbif-occurrence-search>
 *
 * The shared query behind a set of occurrence components. It draws nothing of its
 * own (components placed inside it are shown as usual). It holds the filters, and the filter panel, table and gallery that point at it
 * (`search="#s"`, or placed inside it) read and change them through it. They never
 * talk to each other, so there are no loops and every component sees the same query.
 *
 * Two kinds of filter:
 *   - the page author's, set as attributes: `taxon-key`, `dataset-key`, `country`,
 *     `year`, `basis-of-record`, `license`, `has-coordinate`, `q`. Visitors cannot
 *     change or remove these, the filter panel does not offer them, and they are
 *     never written to the URL.
 *   - the visitor's, set through `setFilters()` or by the filter panel.
 *
 * `sync-url` keeps the visitor's filters in the page's address, as
 * `?gbif_country=NO&gbif_year=2000,2020`, so a search can be shared and the back
 * button works. The prefix is `url-prefix` (default `gbif_`; use another for a
 * second search on the same page, or an empty one for none). A change by the
 * visitor adds a history entry; `url-history="replace"` replaces the current one.
 *
 * Properties: `query` (all filters in force), `userQuery`, `params` (the request
 * parameters), `fixed` (names of the author's filters), `config`.
 * Methods: `setFilters(patch)` (a value of `null`, `''` or `[]` removes a filter), `reset()`.
 * Event: `gbif-query-change`, detail `{ query, userQuery, params, source }`, where
 * `source` is `update`, `reset`, `url` or `attributes`.
 */
export class GbifOccurrenceSearch extends LitElement {
  static properties = {
    taxonKey: { type: String, attribute: 'taxon-key' },
    datasetKey: { type: String, attribute: 'dataset-key' },
    checklistKey: { type: String, attribute: 'checklist-key' },
    apiBase: { type: String, attribute: 'api-base' },
    siteBase: { type: String, attribute: 'site-base' },
    country: { type: String },
    year: { type: String },
    basisOfRecord: { type: String, attribute: 'basis-of-record' },
    license: { type: String },
    hasCoordinate: { type: Boolean, attribute: 'has-coordinate' },
    q: { type: String },
    syncUrl: { type: Boolean, attribute: 'sync-url' },
    urlPrefix: { type: String, attribute: 'url-prefix' },
    urlHistory: { type: String, attribute: 'url-history' }
  };

  // It draws nothing itself, but shows whatever is placed inside it (the components that use it).
  static styles = css`
    :host {
      display: contents;
    }
  `;

  constructor() {
    super();
    this.urlPrefix = 'gbif_';
    this.urlHistory = 'push';
    this._userQuery = {};
    this._syncing = false;
    this._ready = false;
    this._onPopState = () => this._readUrl('url');
  }

  /** The page author's filters, validated. */
  get fixedFilters() {
    return normalizeQuery({
      country: this.country,
      year: this.year,
      basisOfRecord: this.basisOfRecord,
      license: this.license,
      hasCoordinate: this.hasCoordinate,
      q: this.q
    });
  }

  /** Names of the filters the page author has fixed. */
  get fixed() {
    return Object.keys(this.fixedFilters);
  }

  /** The visitor's filters. */
  get userQuery() {
    return this._userQuery;
  }

  /** Every filter in force. The page author's win over the visitor's. */
  get query() {
    return { ...this._userQuery, ...this.fixedFilters };
  }

  /** The query as occurrence search request parameters. */
  get params() {
    const params = toParams(this.query);
    const taxonKey = cleanKey(this.taxonKey);
    const datasetKey = cleanKey(this.datasetKey);
    if (taxonKey) {
      params.taxonKey = taxonKey;
      params.checklistKey = this.config.checklistKey;
    }
    if (datasetKey) params.datasetKey = datasetKey;
    return params;
  }

  /** Effective `apiBase`, `siteBase` and `checklistKey`, which the components that use this search follow. */
  get config() {
    return resolveConfig(this);
  }

  /** Change the visitor's filters. Filters the page author has fixed are left alone. */
  setFilters(patch = {}, source = 'update') {
    const allowed = Object.fromEntries(Object.entries(patch).filter(([key]) => !this.fixed.includes(key)));
    const next = mergeQuery(this._userQuery, allowed);
    if (sameQuery(next, this._userQuery)) return false;
    this._userQuery = next;
    this._changed(source);
    return true;
  }

  /** Remove all of the visitor's filters. */
  reset() {
    if (!Object.keys(this._userQuery).length) return false;
    this._userQuery = {};
    this._changed('reset');
    return true;
  }

  _changed(source) {
    if (this.syncUrl && (source === 'update' || source === 'reset')) this._writeUrl();
    emit(this, 'gbif-query-change', { query: this.query, userQuery: this._userQuery, params: this.params, source });
  }

  /* ---------- the page address ---------- */

  connectedCallback() {
    super.connectedCallback();
    if (this.syncUrl) this._startSync();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopSync();
  }

  updated(changed) {
    if (changed.has('syncUrl') && this._ready) {
      if (this.syncUrl) this._startSync();
      else this._stopSync();
    }
    if (this._ready && [...BASE_FILTER_PROPERTIES, ...SCOPE_PROPERTIES].some((name) => changed.has(name))) {
      this._changed('attributes');
    }
    this._ready = true;
  }

  _startSync() {
    if (this._syncing) return;
    this._syncing = true;
    globalThis.addEventListener('popstate', this._onPopState);
    this._readUrl(this._ready ? 'url' : null);
  }

  _stopSync() {
    if (!this._syncing) return;
    this._syncing = false;
    globalThis.removeEventListener('popstate', this._onPopState);
  }

  /** Take the visitor's filters from the address. `source` is null for the first read, which tells no one. */
  _readUrl(source) {
    const fromUrl = readUrlQuery(new URL(globalThis.location.href).searchParams, this.urlPrefix ?? '');
    const next = Object.fromEntries(Object.entries(fromUrl).filter(([key]) => !this.fixed.includes(key)));
    if (sameQuery(next, this._userQuery)) return;
    this._userQuery = next;
    if (source) this._changed(source);
  }

  _writeUrl() {
    const url = writeUrlQuery(new URL(globalThis.location.href), this._userQuery, this.urlPrefix ?? '');
    if (url.href === globalThis.location.href) return;
    globalThis.history[this.urlHistory === 'replace' ? 'replaceState' : 'pushState'](globalThis.history.state, '', url);
  }

  render() {
    return html`<slot></slot>`;
  }
}
