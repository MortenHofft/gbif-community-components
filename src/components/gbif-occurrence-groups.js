import { html, css, nothing } from 'lit';
import { GbifRecordConsumer } from '../shared/record-consumer.js';

/** Group names a page may use: the key (`geological-context`) or the label (`Geological context`), in any case. */
const normalize = (name) => String(name).toLowerCase().replace(/[\s_]+/g, '-');

/**
 * <gbif-occurrence-groups record="#r"></gbif-occurrence-groups>
 *
 * The record sorted into Darwin Core's groups, one card for each: Record-level, Occurrence,
 * Organism, Material entity, Event, Location, Geological context, Identification and Taxon,
 * then what GBIF added (GBIF processing) and the publisher's own terms that are not Darwin
 * Core (Other terms). Groups with nothing in them are left out. A row shows the interpreted
 * value, and the value as published when it differs.
 *
 * Attributes: `record` (the record element), plus
 *   groups   which groups to show and in what order: a list of group names such as
 *            "location event". Default: every group that has something, in Darwin Core's order.
 *            Several elements, each with its own `groups`, put the cards wherever the page wants them.
 *
 * Also `heading` (only when a single group is shown), `heading-level` and `hide-source`.
 * Layout: the cards fill the width in columns at least `--gbif-group-min-width` wide (default 22rem).
 */
export class GbifOccurrenceGroups extends GbifRecordConsumer {
  static properties = {
    groups: { type: String }
  };

  static styles = [
    ...GbifRecordConsumer.styles,
    css`
      /* Columns, not a grid, so that short cards do not leave gaps under them. The cards run down the first
         column and then the next, in Darwin Core's order. */
      .gbif-groups {
        columns: var(--gbif-group-min-width, 22rem) auto;
        column-gap: 1rem;
      }
      .gbif-groups > .gbif-card {
        break-inside: avoid;
        margin-bottom: 1rem;
      }
      .gbif-groups__part {
        display: block;
      }
      .gbif-groups__note {
        margin: 0;
        color: var(--gbif-color-muted, #596273);
        font-family: var(--gbif-font-family, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);
        font-size: 0.75rem;
      }
      .gbif-groups__about {
        margin: 0 0 0.75rem;
        color: var(--gbif-color-muted, #596273);
        font-size: 0.8rem;
      }
      .gbif-groups__list {
        display: grid;
        gap: 0.5rem 0;
        margin: 0;
      }
      .gbif-groups__row {
        display: grid;
        grid-template-columns: minmax(7rem, 38%) 1fr;
        gap: 0.5rem;
        padding-bottom: 0.4rem;
        border-bottom: 1px solid var(--gbif-color-border, #d5dbe1);
      }
      .gbif-groups__row:last-child {
        border-bottom: 0;
        padding-bottom: 0;
      }
      .gbif-groups__term {
        margin: 0;
        color: var(--gbif-color-muted, #596273);
        font-size: 0.78rem;
      }
      .gbif-groups__value {
        margin: 0;
        min-width: 0;
        overflow-wrap: anywhere;
      }
      .gbif-groups__published {
        display: block;
        margin-top: 0.15rem;
        color: var(--gbif-color-muted, #596273);
        font-size: 0.75rem;
      }
    `
  ];

  /** The groups to show, in the order to show them. */
  _chosen(all) {
    if (typeof this.groups !== 'string' || !this.groups.trim()) return all;
    const wanted = this.groups.split(/[\s,]+/).filter(Boolean).map(normalize);
    return [...new Set(wanted)].map((name) => all.find((g) => g.key === name || normalize(g.label) === name)).filter(Boolean);
  }

  _renderRow(row) {
    return html`<div class="gbif-groups__row">
      <dt class="gbif-groups__term" title=${row.uri ?? ''}>${row.label}</dt>
      <dd class="gbif-groups__value">
        ${row.parts
          ? row.parts.map((part) => html`<span class="gbif-groups__part">${part.href ? html`<a href=${part.href} target="_blank" rel="noopener">${part.text}</a>` : part.text}</span>`)
          : row.href
            ? html`<a href=${row.href} target="_blank" rel="noopener">${row.text}</a>`
            : row.text}
        ${row.published ? html`<span class="gbif-groups__published">As published: ${row.published}</span>` : nothing}
      </dd>
    </div>`;
  }

  render() {
    if (!this.ready) return nothing;
    const groups = this._chosen(this.view.groups);
    if (!groups.length) return nothing;

    return html`
      <div class="gbif-groups" part="groups">
        ${groups.map(
          (group) => html`<section class="gbif-card" part="card" data-group=${group.key}>
            <header class="gbif-card__header" part="header">
              <span class="gbif-card__badge">GBIF</span>
              ${this.renderTitle(groups.length === 1 && this.heading ? this.heading : group.label)}
            </header>
            <div class="gbif-card__body" part="body">
              <p class="gbif-groups__about">${group.about}</p>
              <dl class="gbif-groups__list">${group.rows.map((row) => this._renderRow(row))}</dl>
            </div>
          </section>`
        )}
      </div>
      ${this.config.showSource ? html`<div class="gbif-groups__note">${this.renderSource('Occurrence record from GBIF, sorted into Darwin Core groups.')}</div>` : nothing}
    `;
  }
}
