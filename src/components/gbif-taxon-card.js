import { html, css, nothing } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { GbifTaxonElement } from '../shared/taxon-element.js';
import { buildUrl, getJson } from '../shared/api.js';
import { linkIntent } from '../shared/events.js';
import { safeNameHtml, safeHttpUrl, rankLabel, statusLabel } from '../shared/format.js';
import { getChecklistInfo } from '../shared/taxon.js';
import { taxonUrl, occurrenceSearchUrl } from '../shared/links.js';

/**
 * <gbif-taxon-card taxon-key="4QHKG"></gbif-taxon-card>
 * <gbif-taxon-card scientific-name="Ficus" kingdom="Plantae"></gbif-taxon-card>
 *
 * Name, classification and occurrence count for one taxon.
 *
 * The classification is interactive. Each ancestor is a link to its page on
 * GBIF, and a plain click first fires a cancelable `gbif-taxon-select` event:
 *
 *   card.addEventListener('gbif-taxon-select', (e) => {
 *     e.preventDefault();            // stop the link, the page takes over
 *     showTaxon(e.detail.taxonKey);  // detail: taxonKey, scientificName, rank, checklistKey, source
 *   });
 *
 * With the `follow-selection` attribute the card also loads a taxon clicked in
 * the classification itself, unless the page cancelled the event.
 *
 * Other events: `gbif-taxon-select` also fires (source "gbif-link") for the
 * "View on GBIF.org" button, `gbif-occurrences-select` for the occurrence
 * count link, `gbif-taxon-resolved`, `gbif-taxon-notfound` and `gbif-error`.
 */
export class GbifTaxonCard extends GbifTaxonElement {
  static properties = {
    ...GbifTaxonElement.properties,
    followSelection: { type: Boolean, attribute: 'follow-selection' },
    _count: { state: true },
    _checklist: { state: true }
  };

  static styles = [
    ...GbifTaxonElement.styles,
    css`
      .gbif-taxon-card__name {
        margin: 0 0 0.5rem;
        font-size: 1.15rem;
      }
      .gbif-taxon-card__note {
        margin: 0 0 0.5rem;
        color: var(--gbif-color-muted, #596273);
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
        color: var(--gbif-color-muted, #596273);
      }
      .gbif-taxon-card__ancestor:last-child::after {
        content: '';
        margin: 0;
      }
      .gbif-taxon-card__rank-label {
        margin-right: 0.25rem;
        color: var(--gbif-color-muted, #596273);
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
        color: var(--gbif-color-muted, #596273);
      }
      .gbif-taxon-card__view {
        margin-left: auto;
      }
    `
  ];

  constructor() {
    super();
    this._count = null;
    this._checklist = null;
  }

  onTaxonReset() {
    this._count = null;
    this._checklist = null;
  }

  async onTaxonReady(taxon, isCurrent) {
    const { apiBase, checklistKey, showSource } = this.config;

    if (showSource) {
      getChecklistInfo({ apiBase, checklistKey }).then((info) => {
        if (isCurrent()) this._checklist = info;
      });
    }

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

  /** Detail shared by every "this taxon was chosen" event. */
  _taxonDetail(taxon, source) {
    return {
      taxonKey: taxon.key,
      scientificName: taxon.name,
      rank: taxon.rank,
      checklistKey: this.config.checklistKey,
      source
    };
  }

  _onRankClick(event, rank) {
    const intent = linkIntent(this, event, 'gbif-taxon-select', this._taxonDetail(rank, 'classification'));
    if (intent && !intent.defaultPrevented && this.followSelection) {
      event.preventDefault();
      this.scientificName = undefined;
      this.taxonKey = rank.key;
    }
  }

  _renderMatchNote(taxon) {
    if (taxon.matchType === 'HIGHERRANK') {
      return html`<p class="gbif-taxon-card__note">
        Matched to the nearest higher taxon found for “${this.scientificName}”.
      </p>`;
    }
    if (taxon.matchType === 'VARIANT') {
      return html`<p class="gbif-taxon-card__note">Matched “${this.scientificName}” as a spelling variant.</p>`;
    }
    return nothing;
  }

  _renderClassification(taxon, siteBase) {
    if (!taxon.classification.length) return nothing;
    return html`
      <ol class="gbif-taxon-card__classification" role="list" aria-label="Classification">
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
    const onClick = (event) =>
      linkIntent(this, event, 'gbif-occurrences-select', {
        taxonKey: taxon.target.key,
        checklistKey: config.checklistKey,
        url: href,
        source: 'count'
      });
    return html`<p class="gbif-taxon-card__count">
      <a href=${href} target="_blank" rel="noopener" @click=${onClick}
        ><strong>${this._count.toLocaleString()}</strong> occurrence${this._count === 1 ? '' : 's'}</a
      >
      in GBIF
    </p>`;
  }

  _renderSource() {
    const info = this._checklist;
    const checklistUrl = safeHttpUrl(info?.url);
    const checklistName = [info?.title, info?.version].filter(Boolean).join(' ');
    return this.renderSource(html`
      ${checklistName
        ? html`Taxonomy:
            ${checklistUrl
              ? html`<a href=${checklistUrl} target="_blank" rel="noopener">${checklistName}</a>`
              : checklistName}.`
        : nothing}
      Occurrence data from GBIF.
    `);
  }

  _renderBody() {
    const taxon = this._taxon;
    const config = this.config;

    switch (taxon.status) {
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
          ${this._renderMatchNote(taxon)}
          ${taxon.isSynonym
            ? html`<p class="gbif-taxon-card__note">
                ${statusLabel(taxon.usage.status || 'synonym')}:
                ${unsafeHTML(safeNameHtml(taxon.usage.formattedName || taxon.usage.name))}
              </p>`
            : nothing}
          ${this._renderClassification(taxon, config.siteBase)} ${this._renderOccurrenceCount(taxon, config)}
        `;
    }
  }

  render() {
    const taxon = this._taxon;
    if (taxon.status === 'idle') return nothing;

    const config = this.config;
    return html`
      <section class="gbif-card" part="card" aria-busy=${taxon.status === 'loading' ? 'true' : 'false'}>
        <header class="gbif-card__header" part="header">
          <span class="gbif-card__badge">GBIF</span>
          ${this.renderTitle(this.heading || 'This taxon in GBIF')}
        </header>
        <div class="gbif-card__body" part="body">${this._renderBody()}</div>
        ${taxon.status === 'ready'
          ? html`<footer class="gbif-card__footer" part="footer">
              <a
                class="gbif-button gbif-button--primary gbif-taxon-card__view"
                href=${taxonUrl(config.siteBase, taxon.target.key)}
                target="_blank"
                rel="noopener"
                @click=${(event) => linkIntent(this, event, 'gbif-taxon-select', this._taxonDetail(taxon.target, 'gbif-link'))}
                >View on GBIF.org</a
              >
              ${this._renderSource()}
            </footer>`
          : nothing}
      </section>
    `;
  }
}
