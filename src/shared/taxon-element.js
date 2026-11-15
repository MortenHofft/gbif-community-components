import { LitElement, html, nothing } from 'lit';
import { resolveConfig } from './config.js';
import { resolveTaxon } from './taxon.js';
import { emit } from './events.js';
import { clampInt } from './format.js';
import { tokens, cardStyles } from './styles.js';

const RESOLVE_PROPERTIES = ['taxonKey', 'scientificName', 'kingdom', 'rank', 'checklistKey', 'apiBase'];

/**
 * Base class for every component that shows content about one taxon.
 *
 * It owns the shared inputs (`taxon-key`, or `scientific-name` with optional
 * `kingdom` and `rank`, plus `checklist-key`, `api-base`, `site-base`,
 * `hide-source`, `heading`, `heading-level`, `reserve-space`), resolves the
 * taxon through the shared helper, and reports problems with events.
 * Subclasses implement:
 *
 *   onTaxonReset()                  clear any data from the previous taxon
 *   onTaxonReady(taxon, isCurrent)  fetch their own data for `taxon.target`;
 *                                   check `isCurrent()` after each await so a
 *                                   slow response for an old taxon is ignored
 *
 * and list in `static dataProperties` the attributes that, when changed, only
 * require their own data to be fetched again (not the taxon to be resolved).
 *
 * `_taxon.status` is one of: idle | loading | ready | nomatch | error.
 */
export class GbifTaxonElement extends LitElement {
  static properties = {
    taxonKey: { type: String, attribute: 'taxon-key', reflect: true },
    scientificName: { type: String, attribute: 'scientific-name' },
    kingdom: { type: String },
    rank: { type: String },
    checklistKey: { type: String, attribute: 'checklist-key' },
    apiBase: { type: String, attribute: 'api-base' },
    siteBase: { type: String, attribute: 'site-base' },
    heading: { type: String },
    headingLevel: { type: Number, attribute: 'heading-level' },
    hideSource: { type: Boolean, attribute: 'hide-source' },
    reserveSpace: { type: Boolean, attribute: 'reserve-space' },
    _taxon: { state: true }
  };

  static styles = [tokens, cardStyles];

  /** Attributes that only need this component's own data fetched again. */
  static dataProperties = [];

  constructor() {
    super();
    this._taxon = { status: 'idle' };
    this._runId = 0;
  }

  /** Effective `apiBase`, `siteBase`, `checklistKey` and `showSource` for this element. */
  get config() {
    return resolveConfig(this);
  }

  willUpdate(changed) {
    if (RESOLVE_PROPERTIES.some((name) => changed.has(name))) {
      this._resolve();
    } else if (this.constructor.dataProperties.some((name) => changed.has(name)) && this._taxon.status === 'ready') {
      const run = this._runId;
      this.onTaxonReset();
      this.onTaxonReady(this._taxon, () => run === this._runId);
    }
  }

  async _resolve() {
    const run = ++this._runId;
    const isCurrent = () => run === this._runId;

    this.onTaxonReset();

    const { taxonKey, scientificName, kingdom, rank } = this;
    if (!taxonKey && !scientificName) {
      this._taxon = { status: 'idle' };
      return;
    }

    this._taxon = { status: 'loading' };
    try {
      const taxon = await resolveTaxon({ ...this.config, taxonKey, scientificName, kingdom, rank });
      if (!isCurrent()) return;

      if (!taxon.found) {
        const query = taxonKey || scientificName;
        this._taxon = { status: 'nomatch', query, byKey: !!taxonKey };
        emit(this, 'gbif-taxon-notfound', {
          query,
          byKey: !!taxonKey,
          matchType: taxon.matchType,
          confidence: taxon.confidence,
          checklistKey: this.config.checklistKey
        });
        return;
      }

      this._taxon = { status: 'ready', ...taxon };
      emit(this, 'gbif-taxon-resolved', {
        taxonKey: taxon.target.key,
        scientificName: taxon.target.name,
        rank: taxon.target.rank,
        isSynonym: taxon.isSynonym,
        matchType: taxon.matchType,
        confidence: taxon.confidence,
        checklistKey: this.config.checklistKey
      });
      this.onTaxonReady(this._taxon, isCurrent);
    } catch (error) {
      if (!isCurrent()) return;
      this._taxon = { status: 'error' };
      this.reportError(error);
    }
  }

  /** Tell the host page that something failed. */
  reportError(error) {
    emit(this, 'gbif-error', {
      component: this.localName,
      url: error.url,
      status: error.status ?? 0,
      message: error.message
    });
  }

  /** Name used in alt text and labels. */
  get displayName() {
    return this._taxon.target?.canonicalName || this._taxon.target?.name || this.scientificName || '';
  }

  /** The card title. Its heading level is the page author's to choose (default 2). */
  renderTitle(text) {
    const level = clampInt(this.headingLevel, { min: 1, max: 6, fallback: 2 });
    return html`<div class="gbif-card__title" role="heading" aria-level=${level} part="title">${text}</div>`;
  }

  /** "Data from GBIF" style note. Hidden with `hide-source`; licence credits never use this. */
  renderSource(content) {
    return this.config.showSource ? html`<p class="gbif-card__source" part="source">${content}</p>` : nothing;
  }

  /**
   * An empty box of the right size while content is loading, for pages that
   * want to avoid layout shift (`reserve-space`).
   */
  renderReserved(heightCss, loading) {
    return this.reserveSpace && loading
      ? html`<div class="gbif-card" part="card" style=${`min-height: ${heightCss}`} aria-hidden="true"></div>`
      : nothing;
  }

  onTaxonReset() {}
  onTaxonReady() {}
}
