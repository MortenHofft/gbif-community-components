import { html, nothing } from 'lit';
import { GbifLinkedElement } from './linked-element.js';
import { resolveConfig } from './config.js';

/**
 * Base class for the components that show part of an occurrence search: the
 * filter panel, the table and the gallery.
 *
 * It finds the `<gbif-occurrence-search>` it belongs to (see `GbifLinkedElement`): the
 * one named by its `search` attribute, or else the one it is inside. It listens for
 * `gbif-query-change` and calls `onQueryChange()`; subclasses read `this.searchEl.params`
 * and friends.
 */
export class GbifSearchConsumer extends GbifLinkedElement {
  static linkTag = 'gbif-occurrence-search';
  static linkProperty = 'search';
  static linkEvent = 'gbif-query-change';
  static linkReady = 'fetchPage';

  static properties = {
    search: { type: String }
  };

  /** The search this component follows. */
  get searchEl() {
    return this.linked;
  }

  get _searchStatus() {
    return this._linkStatus;
  }

  /** The search's `apiBase`, `siteBase` and `checklistKey`, with this component's own `hide-source`. */
  get config() {
    const own = resolveConfig({ hideSource: this.hideSource });
    return { ...(this.searchEl?.config ?? own), showSource: own.showSource };
  }

  onLinked() {
    this.onSearchBound();
  }

  onLinkedChange(detail) {
    this.onQueryChange(detail);
  }

  /**
   * What to draw instead of the component when there is no usable search: a message if none was
   * found, or if its predicate is not valid; nothing while it is still being looked for.
   * Returns `null` when the component can draw itself.
   */
  renderSearchProblem() {
    if (this._searchStatus === 'missing') {
      return html`<p class="gbif-card__state" role="alert">No occurrence search was found for this component.</p>`;
    }
    if (this._searchStatus !== 'bound') return nothing;
    if (!this.searchEl.valid) {
      return html`<p class="gbif-card__state" role="alert">
        This search cannot be shown: its predicate is not valid (${this.searchEl.predicateError}).
      </p>`;
    }
    return null;
  }

  /** Called once a search element has been found. */
  onSearchBound() {}

  /** Called when the search's query changed. */
  onQueryChange() {}
}
