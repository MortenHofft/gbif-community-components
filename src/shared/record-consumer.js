import { html } from 'lit';
import { GbifLinkedElement } from './linked-element.js';
import { resolveConfig } from './config.js';

/**
 * Base class for the cards of a record page: the Darwin Core groups, the images, the map
 * of the location and the extensions.
 *
 * It finds the `<gbif-occurrence-record>` it belongs to (see `GbifLinkedElement`): the one
 * named by its `record` attribute, or else the one it is inside. It asks that element for
 * the `view` of the record (`groups`, `extensions`, `media`, `point`) and draws itself
 * from it, or draws nothing while there is nothing to show. A record that is missing or
 * failed is reported once, by the record element, not by every card.
 */
export class GbifRecordConsumer extends GbifLinkedElement {
  static linkTag = 'gbif-occurrence-record';
  static linkProperty = 'record';
  static linkEvent = 'gbif-record-change';
  static linkReady = 'getView';

  static properties = {
    record: { type: String },
    _version: { state: true }
  };

  /** The record element this card follows. */
  get recordEl() {
    return this.linked;
  }

  /** What there is to show: empty until the record has arrived. */
  get view() {
    return this.recordEl?.getView() ?? { groups: [], extensions: [], media: { images: [], other: [] }, point: null };
  }

  get ready() {
    return this._linkStatus === 'bound' && this.recordEl?.status === 'ready';
  }

  /** The record's `apiBase`, `siteBase` and `checklistKey`, with this card's own `hide-source`. */
  get config() {
    const own = resolveConfig({ hideSource: this.hideSource });
    return { ...(this.recordEl?.config ?? own), showSource: own.showSource };
  }

  /**
   * What to draw when no record element was found: a message, as the search components give. `null` otherwise. (A record
   * that is not found, not valid or failed is reported once, by the record element.)
   */
  renderRecordProblem() {
    if (this._linkStatus !== 'missing') return null;
    return html`<p class="gbif-card__state" role="alert">No occurrence record was found for this component.</p>`;
  }

  onLinked() {
    this._version = (this._version ?? 0) + 1;
    this.onRecordChange();
  }

  onLinkedChange() {
    this._version = (this._version ?? 0) + 1; // draw again
    this.onRecordChange();
  }

  /** Called when the record, or what it holds, changed (and when the card first finds it). */
  onRecordChange() {}
}
