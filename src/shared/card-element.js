import { LitElement, html, nothing } from 'lit';
import { resolveConfig } from './config.js';
import { clampInt } from './format.js';
import { tokens, cardStyles } from './styles.js';

/**
 * What every component that draws a card has in common: the title (with a heading
 * level the page author chooses), the source note that can be hidden, and the
 * effective configuration.
 *
 * Attributes: `heading`, `heading-level` (1-6, default 2), `hide-source`.
 */
export class GbifCardElement extends LitElement {
  static properties = {
    heading: { type: String },
    headingLevel: { type: Number, attribute: 'heading-level' },
    hideSource: { type: Boolean, attribute: 'hide-source' }
  };

  static styles = [tokens, cardStyles];

  /** Effective `apiBase`, `siteBase`, `checklistKey` and `showSource` for this element. */
  get config() {
    return resolveConfig(this);
  }

  /** The card title. Its heading level is the page author's to choose (default 2). */
  renderTitle(text) {
    const level = clampInt(this.headingLevel, { min: 1, max: 6, fallback: 2 });
    return html`<div class="gbif-card__title" role="heading" aria-level=${level} part="title">${text}</div>`;
  }

  /** "Data from GBIF" style note. Hidden with `hide-source`; licence credits never use this. */
  renderSource(content) {
    return this.config.showSource ? html`<p class="gbif-card__source" part="source">${content}</p>` : nothing;
  }
}
