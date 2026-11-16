import { LitElement, html, css, nothing } from 'lit';
import { onConfigChange, resolveConfig } from '../shared/config.js';
import { getChecklistInfo } from '../shared/taxon.js';
import { safeHttpUrl } from '../shared/format.js';
import { tokens } from '../shared/styles.js';

/**
 * <gbif-attribution></gbif-attribution>
 *
 * One source note for a whole page, for sites that show many GBIF cards and
 * would rather credit GBIF once, in the footer, than on every card. Pair it
 * with `hide-source` on the cards (or `configure({ showSource: false })`).
 *
 * Names the checklist the taxonomy comes from (`checklist-key`, with the same
 * default as the cards). Leave that out with `hide-taxonomy` on a page whose names are not
 * from that checklist: an occurrence record's names are GBIF's own, not the checklist's. Anything inside the element is shown after it, so a
 * page that mixes sources can add the others:
 *
 *   <gbif-attribution>Maps by Example Council.</gbif-attribution>
 *
 * Licences and rights holders of individual images stay on the cards: they
 * belong to each image and are never hidden.
 */
export class GbifAttribution extends LitElement {
  static properties = {
    checklistKey: { type: String, attribute: 'checklist-key' },
    hideTaxonomy: { type: Boolean, attribute: 'hide-taxonomy' },
    apiBase: { type: String, attribute: 'api-base' },
    siteBase: { type: String, attribute: 'site-base' },
    _checklist: { state: true }
  };

  static styles = [
    tokens,
    css`
      .gbif-attribution {
        margin: 0;
        color: var(--gbif-color-muted, #596273);
        font-family: var(--gbif-font-family, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);
        font-size: var(--gbif-font-size, 0.875rem);
        line-height: 1.45;
      }
    `
  ];

  constructor() {
    super();
    this._checklist = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this._stopWatchingConfig = onConfigChange(() => {
      if (this.hasUpdated) this._load();
      this.requestUpdate();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopWatchingConfig?.();
  }

  willUpdate(changed) {
    if (this.hideTaxonomy) return;
    if (this._checklist === null || changed.has('checklistKey') || changed.has('apiBase') || changed.has('hideTaxonomy')) this._load();
  }

  async _load() {
    const run = (this._run = (this._run || 0) + 1);
    const { apiBase, checklistKey } = resolveConfig(this);
    const info = await getChecklistInfo({ apiBase, checklistKey });
    // `{}` (not `null`) records that the lookup finished, even if it found nothing.
    if (run === this._run) this._checklist = info || {};
  }

  render() {
    const { siteBase } = resolveConfig(this);
    const info = this._checklist;
    const name = [info?.title, info?.version].filter(Boolean).join(' ');
    const url = safeHttpUrl(info?.url);

    return html`<p class="gbif-attribution">
      Biodiversity data from <a href=${siteBase} target="_blank" rel="noopener">GBIF</a>, the Global Biodiversity
      Information Facility.
      ${name && !this.hideTaxonomy
        ? html`Taxonomy:
            ${url ? html`<a href=${url} target="_blank" rel="noopener">${name}</a>` : name}.`
        : nothing}
      <slot></slot>
    </p>`;
  }
}
