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
 * It is looked for again when the page changes: one added after this element (a framework
 * that builds the page in script) is found when it appears, and if the one it follows is
 * removed or replaced by another with the same selector, it follows the new one.
 * Subclasses that override updated() must call super.updated(changed).
 */

/**
 * One observer for every element that follows another, so that a page with many of them
 * does not run many. It looks only when something in the page changed, and only at elements
 * that are not following a connected target.
 */
const watchers = new Set();
let observer = null;
let scheduled = false;

function check() {
  scheduled = false;
  for (const watcher of [...watchers]) watcher._recheck();
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(check);
}

function watch(element) {
  watchers.add(element);
  observer ??= new MutationObserver(schedule);
  observer.observe(document, { childList: true, subtree: true });
  const root = element.getRootNode();
  if (root !== document && root instanceof ShadowRoot) observer.observe(root, { childList: true, subtree: true });
}

function unwatch(element) {
  watchers.delete(element);
  if (!watchers.size) {
    observer?.disconnect();
    observer = null;
  }
}

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
    this._bindRun += 1; // anything still waiting to bind is not wanted any more
    unwatch(this);
    this._unbind();
  }

  /** The page changed: has the element I follow gone, or has the one I was looking for come? */
  _recheck() {
    if (!this.isConnected) return;
    if (this._linkStatus === 'bound') {
      if (!this.linked?.isConnected) this._bind();
    } else if (this._linkStatus === 'missing') {
      const el = this._find();
      if (el && el.localName === this.constructor.linkTag) this._bind();
    }
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
    watch(this);

    // One tick, so that a page that sets things up right after the bundle loads (`configure()`, the
    // attributes of the elements it follows) does so before this asks anything.
    await null;
    if (run !== this._bindRun || !this.isConnected) return;

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
    if (run !== this._bindRun || !this.isConnected) return;

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
