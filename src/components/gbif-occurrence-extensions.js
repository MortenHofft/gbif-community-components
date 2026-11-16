import { html, css, nothing } from 'lit';
import { GbifRecordConsumer } from '../shared/record-consumer.js';

/**
 * A list of names from an attribute. Names are separated by commas (or `|`), and may contain spaces ("Measurement or
 * fact"). A list with no commas may also be separated by spaces ("Multimedia Identification"), as the other list
 * attributes are, so each word of an entry counts as a name too.
 */
const names = (list) => {
  if (typeof list !== 'string') return [];
  const entries = list.split(/[,|]+/).map((n) => n.trim().toLowerCase()).filter(Boolean);
  return [...new Set(entries.flatMap((entry) => [entry, ...entry.split(/\s+/)]))];
};

/**
 * <gbif-occurrence-extensions record="#r"></gbif-occurrence-extensions>
 *
 * The extensions of the record, one card for each: the extra tables that a publisher
 * attaches to an occurrence (measurements, resource relationships, DNA-derived data,
 * audubon media and so on), each with the columns its records use. Values are shown
 * as published. A record without extensions shows nothing.
 *
 * Attributes: `record` (the record element), plus
 *   exclude   extensions to leave out, a list of their names such as "Multimedia, Identification"
 *             (separated by commas; spaces work too when the names are one word). Default: "Multimedia", because the images are
 *             shown by <gbif-occurrence-images>. Use `exclude=""` to show it too.
 *   only      show only these
 * A name is matched against the extension's name (`MeasurementOrFact`) or its label
 * (`Measurement or fact`), in any case. A long extension is cut at 100 rows, and says how many are left out.
 *
 * Also `heading` (only when a single extension is shown), `heading-level` and `hide-source`.
 */
export class GbifOccurrenceExtensions extends GbifRecordConsumer {
  static properties = {
    exclude: { type: String },
    only: { type: String }
  };

  static styles = [
    ...GbifRecordConsumer.styles,
    css`
      .gbif-extensions {
        display: grid;
        gap: 1rem;
      }
      .gbif-extensions__scroll {
        overflow-x: auto;
      }
      .gbif-extensions__table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8125rem;
      }
      .gbif-extensions__table th,
      .gbif-extensions__table td {
        padding: 0.4rem 0.6rem;
        border-bottom: 1px solid var(--gbif-color-border, #d5dbe1);
        text-align: left;
        vertical-align: top;
        overflow-wrap: anywhere;
        unicode-bidi: plaintext;
      }
      .gbif-extensions__table th {
        color: var(--gbif-color-muted, #596273);
        font-size: 0.7rem;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .gbif-extensions__note {
        margin: 0;
        color: var(--gbif-color-muted, #596273);
        font-family: var(--gbif-font-family, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);
        font-size: 0.75rem;
      }
      .gbif-extensions__omitted {
        margin: 0;
        padding: 0.5rem var(--gbif-card-padding, 1rem);
        color: var(--gbif-color-muted, #596273);
        font-size: 0.75rem;
      }
    `
  ];

  constructor() {
    super();
    this.exclude = 'Multimedia';
  }

  _chosen(all) {
    const left = names(this.exclude);
    const only = names(this.only);
    const is = (ext, list) => list.includes(ext.name.toLowerCase()) || list.includes(ext.label.toLowerCase());
    return all.filter((ext) => !is(ext, left) && (!only.length || is(ext, only)));
  }

  _renderCell(cell) {
    return html`<td>${cell.href ? html`<a href=${cell.href} target="_blank" rel="noopener">${cell.text}</a>` : cell.text}</td>`;
  }

  render() {
    const problem = this.renderRecordProblem();
    if (problem) return problem;
    if (!this.ready) return nothing;
    const extensions = this._chosen(this.view.extensions);
    if (!extensions.length) return nothing;

    return html`
      <div class="gbif-extensions" part="extensions">
        ${extensions.map(
          (ext) => html`<section class="gbif-card" part="card" data-extension=${ext.name}>
            <header class="gbif-card__header" part="header">
              <span class="gbif-card__badge">GBIF</span>
              ${this.renderTitle(extensions.length === 1 && this.heading ? this.heading : `${ext.label} (${ext.rows.length + ext.omitted})`)}
            </header>
            <div class="gbif-extensions__scroll" role="region" aria-label=${ext.label} tabindex="0">
              <table class="gbif-extensions__table" part="table">
                <caption class="gbif-visually-hidden">${ext.label}</caption>
                <thead>
                  <tr>${ext.columns.map((column) => html`<th scope="col" title=${column.term}>${column.label}</th>`)}</tr>
                </thead>
                <tbody>
                  ${ext.rows.map((row) => html`<tr>${row.map((cell) => this._renderCell(cell))}</tr>`)}
                </tbody>
              </table>
            </div>
            ${ext.omitted ? html`<p class="gbif-extensions__omitted">${ext.omitted.toLocaleString()} more rows are not shown.</p>` : nothing}
          </section>`
        )}
      </div>
      ${this.config.showSource ? html`<div class="gbif-extensions__note">${this.renderSource('Extension records as published, via GBIF.')}</div>` : nothing}
    `;
  }
}
