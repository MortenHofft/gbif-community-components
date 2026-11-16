import { html, css, nothing } from 'lit';
import { GbifRecordConsumer } from '../shared/record-consumer.js';
import { buildUrl, getJson } from '../shared/api.js';
import { emit } from '../shared/events.js';
import { formatLicense, safeHttpUrl } from '../shared/format.js';
import { occurrenceUrl } from '../shared/links.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DOI = /^10\.\d{4,9}\/\S+$/;
const text = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/** What is kept of a dataset, from a response that is large (it lists every contact and endpoint). */
export function pickDataset(data) {
  if (!data || typeof data !== 'object') return null;
  const doi = text(data.doi)?.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  return {
    title: text(data.title),
    doi: doi && DOI.test(doi) ? doi : undefined,
    citation: text(data.citation?.text),
    homepage: safeHttpUrl(data.homepage) ?? undefined
  };
}

/**
 * <gbif-occurrence-citation record="#r"></gbif-occurrence-citation>
 *
 * Where the record comes from and how to credit it: the dataset (linked to its page on GBIF.org), the record
 * on GBIF.org, the record's licence and rights holder, and the dataset's own citation with its DOI. The names
 * and the links come from the record, so they are there at once. The citation comes from the dataset, which
 * is asked for once the record has arrived; if that fails, the rest is still shown.
 *
 * Attributes: `record` (the record element). Also `heading`, `heading-level` and `hide-source`.
 * Links to GBIF.org use the record element's `site-base`.
 */
export class GbifOccurrenceCitation extends GbifRecordConsumer {
  static properties = {
    _dataset: { state: true },
    _datasetFailed: { state: true }
  };

  static styles = [
    ...GbifRecordConsumer.styles,
    css`
      .gbif-citation__list {
        display: grid;
        gap: 0.5rem 0;
        margin: 0;
      }
      .gbif-citation__row {
        display: grid;
        grid-template-columns: minmax(6rem, 30%) 1fr;
        gap: 0.5rem;
      }
      .gbif-citation__term {
        margin: 0;
        color: var(--gbif-color-muted, #596273);
        font-size: 0.78rem;
      }
      .gbif-citation__value {
        margin: 0;
        unicode-bidi: plaintext;
        min-width: 0;
        overflow-wrap: anywhere;
      }
      @container (max-width: 18rem) {
        .gbif-citation__row {
          grid-template-columns: 1fr;
          gap: 0;
        }
      }
      .gbif-citation__body {
        container-type: inline-size;
      }
    `
  ];

  constructor() {
    super();
    this._dataset = null;
    this._datasetFailed = false;
    this._run = 0;
  }

  get _datasetKey() {
    const key = this.recordEl?.interpreted?.datasetKey;
    return typeof key === 'string' && UUID.test(key.trim()) ? key.trim() : undefined;
  }

  onRecordChange() {
    this._loadDataset();
  }

  async _loadDataset() {
    const run = ++this._run;
    this._dataset = null;
    this._datasetFailed = false;
    const key = this.ready ? this._datasetKey : undefined;
    if (!key) return;
    try {
      const data = await getJson(buildUrl(this.config.apiBase, `/v1/dataset/${key}`));
      if (run === this._run) this._dataset = pickDataset(data);
    } catch (error) {
      if (run !== this._run) return;
      this._datasetFailed = true;
      emit(this, 'gbif-error', { component: this.localName, url: error.url, status: error.status ?? 0, message: error.message });
    }
  }

  _row(term, content) {
    return html`<div class="gbif-citation__row"><dt class="gbif-citation__term">${term}</dt><dd class="gbif-citation__value">${content}</dd></div>`;
  }

  render() {
    const problem = this.renderRecordProblem();
    if (problem) return problem;
    if (!this.ready) return nothing;
    const record = this.recordEl.interpreted;
    const { siteBase } = this.config;
    const key = this._datasetKey;
    const occurrenceKey = typeof record.gbifID === 'string' ? record.gbifID : String(record.key ?? this.recordEl.occurrenceKey);
    const license = formatLicense(record.license);
    const datasetName = this._dataset?.title ?? text(record.datasetName) ?? key;
    const doi = this._dataset?.doi;

    return html`
      <section class="gbif-card" part="card">
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>
          ${this.renderTitle(this.heading || 'Source and citation')}
        </header>
        <div class="gbif-card__body gbif-citation__body" part="body">
          <dl class="gbif-citation__list">
            ${datasetName ? this._row('Dataset', key ? html`<a href=${`${siteBase}/dataset/${key}`} target="_blank" rel="noopener">${datasetName}</a>` : datasetName) : nothing}
            ${this._row('Record', html`<a href=${occurrenceUrl(siteBase, occurrenceKey)} target="_blank" rel="noopener">GBIF occurrence ${occurrenceKey}</a>`)}
            ${license ? this._row('Licence', html`<a href=${license.url} target="_blank" rel="noopener">${license.label}</a>`) : nothing}
            ${text(record.rightsHolder) ? this._row('Rights holder', text(record.rightsHolder)) : nothing}
            ${this._dataset?.citation
              ? this._row('Cite the dataset', html`${this._dataset.citation}`)
              : doi
                ? nothing
                : this._datasetFailed
                  ? this._row('Cite the dataset', 'The dataset\'s citation could not be loaded from GBIF.')
                  : nothing}
            ${doi ? this._row('DOI', html`<a href=${`https://doi.org/${encodeURI(doi)}`} target="_blank" rel="noopener">${doi}</a>`) : nothing}
          </dl>
        </div>
        ${this.config.showSource ? html`<footer class="gbif-card__footer" part="footer">${this.renderSource('Dataset and record details from GBIF.')}</footer>` : nothing}
      </section>
    `;
  }
}
