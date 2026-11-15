import { html, css, nothing } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { GbifTaxonElement } from '../shared/taxon-element.js';
import { buildUrl, getJson } from '../shared/api.js';
import { linkIntent } from '../shared/events.js';
import { safeNameHtml, rankLabel } from '../shared/format.js';
import { taxonUrl, occurrenceSearchUrl } from '../shared/links.js';

/**
 * <gbif-taxon-card taxon-key="4QHKG"></gbif-taxon-card>
 * <gbif-taxon-card scientific-name="Puma concolor"></gbif-taxon-card>
 *
 * Name, classification and occurrence count for one taxon.
 *
 * The classification is interactive. Each ancestor is a link to its page on
 * GBIF, and a plain click first fires a cancelable `gbif-taxon-select` event:
 *
 *   card.addEventListener('gbif-taxon-select', (e) => {
 *     e.preventDefault();            // stop the link, the page takes over
 *     showTaxon(e.detail.taxonKey);  // detail: taxonKey, scientificName, rank, checklistKey
 *   });
 *
 * With the `follow-selection` attribute the card also loads the clicked taxon
 * itself, unless the page cancelled the event.
 *
 * Other events: `gbif-taxon-resolved` (a taxon was found) and `gbif-error`.
 */
export class GbifTaxonCard extends GbifTaxonElement {
  static properties = {
    ...GbifTaxonElement.properties,
    followSelection: { type: Boolean, attribute: 'follow-selection' },
    _count: { state: true }
  };

  static styles = [
    ...GbifTaxonElement.styles,
    css`
      .gbif-taxon-card__name {
        margin: 0 0 0.5rem;
        font-size: 1.15rem;
      }
      .gbif-taxon-card__synonym {
        margin: 0 0 0.5rem;
        color: var(--gbif-color-muted, #667085);
        font-size: 0.8rem;
      }
      .gbif-taxon-card__classification {
        display: flex;
        flex-wrap: wrap;
        gap: 0.2rem 0.1rem;
        margin: 0 0 0.75rem;
        padding: 0;
        list-style: none;
        font-size: 0.8rem;
      }
      .gbif-taxon-card__ancestor::after {
        content: '›';
        margin: 0 0.35rem;
        color: var(--gbif-color-muted, #667085);
      }
      .gbif-taxon-card__ancestor:last-child::after {
        content: '';
        margin: 0;
      }
      .gbif-taxon-card__rank-label {
        margin-right: 0.25rem;
        color: var(--gbif-color-muted, #667085);
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .gbif-taxon-card__rank-link {
        text-decoration: none;
      }
      .gbif-taxon-card__rank-link:hover .gbif-taxon-card__rank-name {
        text-decoration: underline;
      }
      .gbif-taxon-card__current {
        font-weight: 600;
      }
      .gbif-taxon-card__count {
        margin: 0;
        color: var(--gbif-color-muted, #667085);
      }
    `
  ];

  constructor() {
    super();
    this._count = null;
  }

  onTaxonReset() {
    this._count = null;
  }

  async onTaxonReady(taxon, isCurrent) {
    const { apiBase, checklistKey } = this.config;
    const url = buildUrl(apiBase, '/v1/occurrence/search', {
      taxonKey: taxon.target.key,
      checklistKey,
      limit: 0
    });
    try {
      const data = await getJson(url);
      if (isCurrent()) this._count = typeof data?.count === 'number' ? data.count : undefined;
    } catch (error) {
      if (!isCurrent()) return;
      this._count = undefined;
      this.reportError(error);
    }
  }

  _onRankClick(event, rank) {
    const intent = linkIntent(this, event, 'gbif-taxon-select', {
      taxonKey: rank.key,
      scientificName: rank.name,
      rank: rank.rank,
      checklistKey: this.config.checklistKey,
      source: 'classification'
    });
    if (intent && !intent.defaultPrevented && this.followSelection) {
      event.preventDefault();
      this.scientificName = undefined;
      this.taxonKey = rank.key;
    }
  }

  _renderClassification(taxon, siteBase) {
    if (!taxon.classification.length) return nothing;
    return html`
      <ol class="gbif-taxon-card__classification" aria-label="Classification">
        ${taxon.classification.map((rank) => {
          const label = html`<span class="gbif-taxon-card__rank-label">${rankLabel(rank.rank)}</span>`;
          return rank.key === taxon.target.key
            ? html`<li class="gbif-taxon-card__ancestor">
                <span class="gbif-taxon-card__current" aria-current="true"
                  >${label}<span class="gbif-taxon-card__rank-name">${rank.name}</span></span
                >
              </li>`
            : html`<li class="gbif-taxon-card__ancestor">
                <a
                  class="gbif-taxon-card__rank-link"
                  href=${taxonUrl(siteBase, rank.key)}
                  target="_blank"
                  rel="noopener"
                  @click=${(event) => this._onRankClick(event, rank)}
                  >${label}<span class="gbif-taxon-card__rank-name">${rank.name}</span></a
                >
              </li>`;
        })}
      </ol>
    `;
  }

  _renderOccurrenceCount(taxon, config) {
    if (this._count === null) return html`<p class="gbif-taxon-card__count">Loading occurrences…</p>`;
    if (this._count === undefined) return html`<p class="gbif-taxon-card__count">Occurrence count unavailable.</p>`;
    const href = occurrenceSearchUrl(config.siteBase, {
      taxonKey: taxon.target.key,
      checklistKey: config.checklistKey
    });
    return html`<p class="gbif-taxon-card__count">
      <a href=${href} target="_blank" rel="noopener"
        ><strong>${this._count.toLocaleString()}</strong> occurrence${this._count === 1 ? '' : 's'}</a
      >
      in GBIF
    </p>`;
  }

  _renderBody() {
    const taxon = this._taxon;
    const config = this.config;

    switch (taxon.status) {
      case 'idle':
        return html`<p class="gbif-card__state">Set <code>taxon-key</code> or <code>scientific-name</code>.</p>`;
      case 'loading':
        return html`<p class="gbif-card__state" role="status">Loading…</p>`;
      case 'error':
        return html`<p class="gbif-card__state" role="alert">Could not load this taxon from GBIF.</p>`;
      case 'nomatch':
        return html`<p class="gbif-card__state">
          ${taxon.byKey
            ? html`No taxon with key <em>${taxon.query}</em> was found in this checklist.`
            : html`No confident match could be found on GBIF for <em>${taxon.query}</em>.`}
        </p>`;
      default:
        return html`
          <p class="gbif-taxon-card__name">${unsafeHTML(safeNameHtml(taxon.target.formattedName || taxon.target.name))}</p>
          ${taxon.isSynonym
            ? html`<p class="gbif-taxon-card__synonym">
                Synonym: ${unsafeHTML(safeNameHtml(taxon.usage.formattedName || taxon.usage.name))}
              </p>`
            : nothing}
          ${this._renderClassification(taxon, config.siteBase)} ${this._renderOccurrenceCount(taxon, config)}
        `;
    }
  }

  render() {
    const taxon = this._taxon;
    return html`
      <section class="gbif-card" part="card" aria-busy=${taxon.status === 'loading' ? 'true' : 'false'}>
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>
          <h2 class="gbif-card__title">${this.heading || 'This taxon in GBIF'}</h2>
        </header>
        <div class="gbif-card__body" part="body">${this._renderBody()}</div>
        ${taxon.status === 'ready'
          ? html`<footer class="gbif-card__footer" part="footer">
              <span>Data from GBIF</span>
              <a
                class="gbif-button gbif-button--primary"
                href=${taxonUrl(this.config.siteBase, taxon.target.key)}
                target="_blank"
                rel="noopener"
                >View on GBIF.org</a
              >
            </footer>`
          : nothing}
      </section>
    `;
  }
}
