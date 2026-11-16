import { css } from 'lit';

/**
 * Theming interface. Every visual choice reads a `--gbif-*` custom property
 * with a fallback, so components look right with no configuration and sites
 * can restyle them from their own stylesheet:
 *
 *   gbif-taxon-card { --gbif-color-accent: #0a5; }
 *
 * Custom properties inherit through the shadow boundary, so they can also be
 * set on `:root` or any wrapper element.
 *
 * Colour, font and line height are set on the card itself rather than on
 * `:host`. A host page rule such as `body * { color: #eee }` matches the host
 * element and would otherwise beat `:host`, leaving light text on the card's
 * own light surface.
 */
export const tokens = css`
  :host {
    display: block;
    box-sizing: border-box;
    /* In a grid or flex layout a wide table would otherwise stretch its column (and the page) instead of scrolling. */
    min-width: 0;
    /* The labels are English, so they read left to right even on a right-to-left page. Values the publisher wrote
       (names, places, remarks) take their own direction: see \`unicode-bidi: plaintext\` on the cells. */
    direction: ltr;
  }
  :host([hidden]) {
    display: none;
  }
  *,
  *::before,
  *::after {
    box-sizing: inherit;
  }
  a {
    color: var(--gbif-color-link, var(--gbif-color-accent, #357a1f));
  }
  .gbif-visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
`;

/** Card chrome shared by all components (BEM block: `gbif-card`). */
export const cardStyles = css`
  .gbif-card {
    display: block;
    background: var(--gbif-color-surface, #fff);
    color: var(--gbif-color-text, #1f2933);
    font-family: var(--gbif-font-family, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);
    font-size: var(--gbif-font-size, 0.875rem);
    line-height: 1.45;
    border: 1px solid var(--gbif-color-border, #d5dbe1);
    border-radius: var(--gbif-radius, 8px);
    overflow: hidden;
  }
  .gbif-card__header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.7rem var(--gbif-card-padding, 1rem);
    border-bottom: 1px solid var(--gbif-color-border, #d5dbe1);
  }
  .gbif-card__badge {
    flex: none;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    background: var(--gbif-color-accent, #357a1f);
    color: var(--gbif-color-accent-text, #fff);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  .gbif-card__title {
    flex: 1;
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }
  .gbif-card__body {
    padding: var(--gbif-card-padding, 1rem);
  }
  .gbif-card__state {
    margin: 0;
    color: var(--gbif-color-muted, #596273);
  }
  .gbif-card__footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 0.25rem 0.75rem;
    padding: 0.5rem var(--gbif-card-padding, 1rem);
    border-top: 1px solid var(--gbif-color-border, #d5dbe1);
    color: var(--gbif-color-muted, #596273);
    font-size: 0.75rem;
  }
  .gbif-card__source {
    flex-basis: 100%;
    margin: 0;
  }
  .gbif-button {
    display: inline-block;
    padding: 0.3rem 0.7rem;
    border: 1px solid var(--gbif-color-control-border, #7d8794);
    border-radius: 4px;
    background: var(--gbif-color-surface, #fff);
    color: var(--gbif-color-text, #1f2933);
    font: inherit;
    font-size: 0.75rem;
    text-decoration: none;
    cursor: pointer;
  }
  .gbif-button:hover:not([aria-disabled='true']) {
    background: var(--gbif-color-surface-hover, #f2f4f7);
  }
  .gbif-button[aria-disabled='true'] {
    opacity: 0.45;
    cursor: default;
  }
  .gbif-button--primary {
    border-color: var(--gbif-color-accent, #357a1f);
    background: var(--gbif-color-accent, #357a1f);
    color: var(--gbif-color-accent-text, #fff);
  }
  .gbif-button--primary:hover:not([aria-disabled='true']) {
    background: var(--gbif-color-accent-hover, #2c6a1a);
  }
  .gbif-card__retry {
    margin-top: 0.5rem;
  }
  :focus-visible {
    outline: 2px solid var(--gbif-color-focus, #1d6fdc);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      transition: none !important;
      animation: none !important;
    }
  }

  /* Printers drop backgrounds by default, which would leave white text on white. */
  @media print {
    .gbif-card__badge,
    .gbif-button--primary {
      background: none;
      color: #000;
      border: 1px solid #000;
    }
  }
`;
