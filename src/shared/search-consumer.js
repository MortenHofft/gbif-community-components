import { GbifCardElement } from './card-element.js';
import { resolveConfig } from './config.js';

const SEARCH_TAG = 'gbif-occurrence-search';

/**
 * Base class for the components that show part of an occurrence search: the
 * filter panel, the table and the gallery.
 *
 * It finds the `<gbif-occurrence-search>` it belongs to: the one named by its
 * `search` attribute (a CSS selector such as `#s`, which may be anywhere on the
 * page), or else the one it is inside. It listens for `gbif-query-change` and
 * calls `onQueryChange()`; subclasses read `this.searchEl.params` and friends.
 *
 * The search element has to exist by the time the page has been parsed; one added
 * later is not looked for. If none is found the component says so.
 */
export class GbifSearchConsumer extends GbifCardElement {
  static properties = {
    search: { type: String },
    _searchStatus: { state: true }
  };

  constructor() {
    super();
    this.searchEl = null;
    this._searchStatus = 'looking';
    this._bindRun = 0;
    this._onQueryChange = (event) => {
      if (event.target === this.searchEl) this.onQueryChange(event.detail);
    };
  }

  /** The search's `apiBase`, `siteBase` and `checklistKey`, with this component's own `hide-source`. */
  get config() {
    const own = resolveConfig({ hideSource: this.hideSource });
    return { ...(this.searchEl?.config ?? own), showSource: own.showSource };
  }

  connectedCallback() {
    super.connectedCallback();
    this._bind();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unbind();
  }

  updated(changed) {
    // Subclasses that override updated() must call super.updated(changed).
    if (changed.has('search') && this.search !== this._boundSelector) this._bind();
  }

  _find() {
    try {
      if (this.search) {
        return this.getRootNode().querySelector?.(this.search) ?? document.querySelector(this.search);
      }
      return this.closest(SEARCH_TAG);
    } catch {
      return null; // not a valid selector
    }
  }

  _unbind() {
    this.searchEl?.removeEventListener('gbif-query-change', this._onQueryChange);
    this.searchEl = null;
  }

  async _bind() {
    const run = ++this._bindRun;
    this._boundSelector = this.search;
    this._unbind();
    this._searchStatus = 'looking';

    let el = this._find();
    // A page being parsed: the search element may simply not have been reached yet.
    if (!el && document.readyState === 'loading') {
      await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
      if (run !== this._bindRun) return;
      el = this._find();
    }
    if (el && !customElements.get(SEARCH_TAG)) await customElements.whenDefined(SEARCH_TAG);
    if (run !== this._bindRun) return;

    if (!el) {
      this._searchStatus = 'missing';
      console.warn(`[gbif-components] <${this.localName}> found no <${SEARCH_TAG}>${this.search ? ` for "${this.search}"` : ' around it'}.`);
      return;
    }
    this.searchEl = el;
    el.addEventListener('gbif-query-change', this._onQueryChange);
    this._searchStatus = 'bound';
    this.onSearchBound();
  }

  /** Called once a search element has been found. */
  onSearchBound() {}

  /** Called when the search's query changed. */
  onQueryChange() {}
}
