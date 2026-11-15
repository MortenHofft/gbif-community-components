import { LitElement } from 'lit';
import { resolveConfig } from './config.js';
import { matchTaxon } from './match.js';
import { emit } from './events.js';
import { tokens, cardStyles } from './styles.js';

const RESOLVE_PROPERTIES = ['taxonKey', 'scientificName', 'checklistKey', 'apiBase'];

/**
 * Base class for every component that shows content about one taxon.
 *
 * It owns the shared inputs (`taxon-key` or `scientific-name`, plus the
 * `checklist-key`, `api-base` and `site-base` settings), resolves the taxon
 * through the shared match helper, and reports failures with a `gbif-error`
 * event. Subclasses implement:
 *
 *   onTaxonReset()                  clear any data from the previous taxon
 *   onTaxonReady(taxon, isCurrent)  fetch their own data for `taxon.target`;
 *                                   check `isCurrent()` after each await so a
 *                                   slow response for an old taxon is ignored
 *
 * `_taxon.status` is one of: idle | loading | ready | nomatch | error.
 */
export class GbifTaxonElement extends LitElement {
  static properties = {
    taxonKey: { type: String, attribute: 'taxon-key', reflect: true },
    scientificName: { type: String, attribute: 'scientific-name' },
    checklistKey: { type: String, attribute: 'checklist-key' },
    apiBase: { type: String, attribute: 'api-base' },
    siteBase: { type: String, attribute: 'site-base' },
    heading: { type: String },
    _taxon: { state: true }
  };

  static styles = [tokens, cardStyles];

  constructor() {
    super();
    this._taxon = { status: 'idle' };
    this._runId = 0;
  }

  /** Effective `apiBase`, `siteBase` and `checklistKey` for this element. */
  get config() {
    return resolveConfig(this);
  }

  willUpdate(changed) {
    if (RESOLVE_PROPERTIES.some((name) => changed.has(name))) this._resolve();
  }

  async _resolve() {
    const run = ++this._runId;
    const isCurrent = () => run === this._runId;

    this.onTaxonReset();

    const { taxonKey, scientificName } = this;
    if (!taxonKey && !scientificName) {
      this._taxon = { status: 'idle' };
      return;
    }

    this._taxon = { status: 'loading' };
    try {
      const taxon = await matchTaxon({ ...this.config, taxonKey, scientificName });
      if (!isCurrent()) return;

      if (!taxon.found) {
        this._taxon = { status: 'nomatch', query: taxonKey || scientificName };
        return;
      }

      this._taxon = { status: 'ready', ...taxon };
      emit(this, 'gbif-taxon-resolved', {
        taxonKey: taxon.target.key,
        scientificName: taxon.target.name,
        rank: taxon.target.rank,
        isSynonym: taxon.isSynonym,
        checklistKey: this.config.checklistKey
      });
      this.onTaxonReady(taxon, isCurrent);
    } catch (error) {
      if (!isCurrent()) return;
      this._taxon = { status: 'error' };
      this.reportError(error);
    }
  }

  /** Tell the host page that a request failed. */
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

  onTaxonReset() {}
  onTaxonReady() {}
}
