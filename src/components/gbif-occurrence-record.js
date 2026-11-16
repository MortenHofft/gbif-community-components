import { LitElement, css, html, nothing } from 'lit';
import { onConfigChange, resolveConfig } from '../shared/config.js';
import { emit } from '../shared/events.js';
import { buildExtensions, buildGroups, buildMedia, buildPoint, cleanOccurrenceKey } from '../shared/dwc.js';
import { fetchRecord } from '../shared/record.js';
import { tokens } from '../shared/styles.js';

/**
 * <gbif-occurrence-record id="r" occurrence-key="5938145577"></gbif-occurrence-record>
 *
 * The record behind a set of cards: the Darwin Core groups, the images, the map of the
 * location and the extensions. It holds one occurrence record, and the components that
 * point at it (`record="#r"`, or placed inside it) show parts of it. It fetches the
 * record once, however many cards there are.
 *
 * It draws nothing of its own except one message when the record cannot be shown (not
 * found, not a valid key, a failed request), so that the cards need not each say so.
 * Cards placed inside it are shown as usual.
 *
 * Attributes: `occurrence-key` (GBIF's occurrence key: digits only), `api-base`, `site-base`.
 * Events: `gbif-record-load` (the record arrived; detail has `occurrenceKey`, `scientificName`, `kingdom`,
 * `basisOfRecord`, `datasetName`, `country`, `eventDate`), `gbif-record-notfound`, `gbif-error`,
 * and `gbif-record-change`, which the cards listen to (detail `{ status, occurrenceKey }`).
 */
export class GbifOccurrenceRecord extends LitElement {
  static properties = {
    occurrenceKey: { type: String, attribute: 'occurrence-key', reflect: true },
    apiBase: { type: String, attribute: 'api-base' },
    siteBase: { type: String, attribute: 'site-base' },
    _status: { state: true }
  };

  static styles = [
    tokens,
    css`
      :host {
        display: contents;
      }
      .gbif-record__state {
        margin: 0 0 1rem;
        padding: 0.75rem 1rem;
        border: 1px solid var(--gbif-color-border, #d5dbe1);
        border-radius: var(--gbif-radius, 8px);
        background: var(--gbif-color-surface, #fff);
        color: var(--gbif-color-text, #1f2933);
        font-family: var(--gbif-font-family, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);
        font-size: var(--gbif-font-size, 0.875rem);
      }
    `
  ];

  constructor() {
    super();
    this._status = 'idle';
    this._data = null;
    this._view = null;
    this._run = 0;
  }

  /** `idle`, `loading`, `ready`, `notfound`, `invalid` (not a usable key) or `error`. */
  get status() {
    return this._status;
  }

  get config() {
    return resolveConfig(this);
  }

  get interpreted() {
    return this._data?.interpreted ?? null;
  }

  get verbatim() {
    return this._data?.verbatim ?? null;
  }

  /**
   * What the cards show, worked out from the record once: `{ groups, extensions, media, point }`.
   * (Its name is also how a card knows that this element has been upgraded.)
   */
  getView() {
    if (this._status !== 'ready') return { groups: [], extensions: [], media: { images: [], other: [] }, point: null };
    this._view ??= {
      groups: buildGroups({ interpreted: this.interpreted, verbatim: this.verbatim }),
      extensions: buildExtensions(this.verbatim?.extensions),
      media: buildMedia(this.interpreted),
      point: buildPoint(this.interpreted)
    };
    return this._view;
  }

  willUpdate(changed) {
    if (changed.has('occurrenceKey') || changed.has('apiBase')) this._load();
  }

  connectedCallback() {
    super.connectedCallback();
    this._stopWatchingConfig = onConfigChange(() => this.hasUpdated && this._load());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopWatchingConfig?.();
  }

  _set(status) {
    this._status = status;
    emit(this, 'gbif-record-change', { status, occurrenceKey: cleanOccurrenceKey(this.occurrenceKey) });
  }

  async _load() {
    const run = ++this._run;
    this._data = null;
    this._view = null;

    if (!this.occurrenceKey) {
      this._set('idle');
      return;
    }
    const key = cleanOccurrenceKey(this.occurrenceKey);
    if (!key) {
      // Nothing is asked: a key that is not digits would be part of an address.
      this._set('invalid');
      emit(this, 'gbif-error', { component: this.localName, url: undefined, status: 0, message: 'An occurrence key is digits only.' });
      return;
    }

    this._set('loading');
    try {
      const result = await fetchRecord({ apiBase: this.config.apiBase, key });
      if (run !== this._run) return;
      if (!result.found) {
        this._set('notfound');
        emit(this, 'gbif-record-notfound', { occurrenceKey: key });
        return;
      }
      this._data = result;
      this._set('ready');
      const r = result.interpreted;
      const text = (v) => (typeof v === 'string' ? v : undefined);
      emit(this, 'gbif-record-load', {
        occurrenceKey: key,
        scientificName: text(r.scientificName),
        kingdom: text(r.kingdom),
        basisOfRecord: text(r.basisOfRecord),
        datasetName: text(r.datasetName),
        country: text(r.country),
        eventDate: text(r.eventDate)
      });
      if (result.verbatimError) {
        const { url, status, message } = result.verbatimError;
        emit(this, 'gbif-error', { component: this.localName, url, status: status ?? 0, message: `The record as published could not be loaded (${message}).` });
      }
    } catch (error) {
      if (run !== this._run) return;
      this._set('error');
      emit(this, 'gbif-error', { component: this.localName, url: error.url, status: error.status ?? 0, message: error.message });
    }
  }

  render() {
    const message = {
      notfound: html`Occurrence <strong>${this.occurrenceKey}</strong> was not found.`,
      invalid: html`<strong>${this.occurrenceKey}</strong> is not an occurrence key. A key is made of digits only.`,
      error: html`Could not load this occurrence from GBIF.`
    }[this._status];
    return html`${message ? html`<p class="gbif-record__state" role="alert">${message}</p>` : nothing}<slot></slot>`;
  }
}
