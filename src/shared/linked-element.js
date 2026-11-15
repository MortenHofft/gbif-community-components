import { GbifCardElement } from './card-element.js';

/**
 * Base class for components that show part of something another element holds: the
 * search that the filter panel, table and gallery share, or the record that the
 * cards of a record page share.
 *
 * It finds the element it belongs to: the one named by its own attribute (a CSS
 * selector such as `#s`, which may be anywhere on the page), or else the one it is
 * inside. It listens for that element's change event. Subclasses say which with:
 *
 *   static linkTag       the tag to find, such as 'gbif-occurrence-record'
 *   static linkProperty  the attribute that names it, such as 'record'
 *   static linkEvent     the event that tells of a change
 *   static linkReady     the name of a method the element has once it is upgraded
 *
 * and implement `onLinked()` (found) and `onLinkedChange(detail)` (it changed). The linked
 * element is `this.linked`. If none is found, `_linkStatus` is `missing`.
 *
 * It has to exist once the page has been parsed; one added later is not looked for.
 * Subclasses that override updated() must call super.updated(changed).
 */
export class GbifLinkedElement extends GbifCardElement {
  static properties = {
    _linkStatus: { state: true }
  };

  constructor() {
    super();
    this.linked = null;
    this._linkStatus = 'looking';
    this._bindRun = 0;
    this._onLinkedChange = (event) => {
      if (event.target === this.linked) this.onLinkedChange(event.detail);
    };
  }

  get _selector() {
    return this[this.constructor.linkProperty];
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
    if (changed.has(this.constructor.linkProperty) && this._selector !== this._boundSelector) this._bind();
  }

  _find() {
    try {
      if (this._selector) {
        return this.getRootNode().querySelector?.(this._selector) ?? document.querySelector(this._selector);
      }
      return this.closest(this.constructor.linkTag);
    } catch {
      return null; // not a valid selector
    }
  }

  _unbind() {
    this.linked?.removeEventListener(this.constructor.linkEvent, this._onLinkedChange);
    this.linked = null;
  }

  async _bind() {
    const { linkTag, linkEvent, linkReady } = this.constructor;
    const run = ++this._bindRun;
    this._boundSelector = this._selector;
    this._unbind();
    this._linkStatus = 'looking';

    let el = this._find();
    // A page being parsed: the element may simply not have been reached yet.
    if (!el && document.readyState === 'loading') {
      await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
      if (run !== this._bindRun) return;
      el = this._find();
    }
    if (el && typeof el[linkReady] !== 'function') {
      // Found, but not upgraded yet (it comes later in a page being parsed, or the bundle is still loading).
      // Asking an element that is not upgraded for what it holds gets nothing, which would show the wrong thing.
      if (customElements.get(linkTag)) customElements.upgrade(el);
      else await customElements.whenDefined(linkTag);
    }
    if (run !== this._bindRun) return;

    if (!el || el.localName !== linkTag || typeof el[linkReady] !== 'function') {
      this._linkStatus = 'missing';
      const what = el ? `matched <${el.localName}>, which is not a <${linkTag}>` : `found no <${linkTag}>${this._selector ? ` for "${this._selector}"` : ' around it'}`;
      console.warn(`[gbif-components] <${this.localName}> ${what}.`);
      return;
    }
    this.linked = el;
    el.addEventListener(linkEvent, this._onLinkedChange);
    this._linkStatus = 'bound';
    this.onLinked();
  }

  /** Called once the element has been found. */
  onLinked() {}

  /** Called when the element it follows has changed. */
  onLinkedChange() {}
}
