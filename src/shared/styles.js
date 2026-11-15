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
 */
export const tokens = css`
  :host {
    display: block;
    box-sizing: border-box;
    font-family: var(--gbif-font-family, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);
    font-size: var(--gbif-font-size, 0.875rem);
    line-height: 1.45;
    color: var(--gbif-color-text, #1f2933);
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
    color: var(--gbif-color-link, var(--gbif-color-accent, #3f8326));
  }
`;

/** Card chrome shared by all components (BEM block: `gbif-card`). */
export const cardStyles = css`
  .gbif-card {
    background: var(--gbif-color-surface, #fff);
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
    background: var(--gbif-color-accent, #4c9c2e);
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
    color: var(--gbif-color-muted, #667085);
  }
  .gbif-card__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem var(--gbif-card-padding, 1rem);
    border-top: 1px solid var(--gbif-color-border, #d5dbe1);
    color: var(--gbif-color-muted, #667085);
    font-size: 0.75rem;
  }
  .gbif-button {
    display: inline-block;
    padding: 0.3rem 0.7rem;
    border: 1px solid var(--gbif-color-border, #d5dbe1);
    border-radius: 4px;
    background: var(--gbif-color-surface, #fff);
    color: inherit;
    font: inherit;
    font-size: 0.75rem;
    text-decoration: none;
    cursor: pointer;
  }
  .gbif-button:hover:not(:disabled) {
    background: var(--gbif-color-surface-hover, #f2f4f7);
  }
  .gbif-button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .gbif-button--primary {
    border-color: var(--gbif-color-accent, #4c9c2e);
    background: var(--gbif-color-accent, #4c9c2e);
    color: var(--gbif-color-accent-text, #fff);
  }
  .gbif-button--primary:hover:not(:disabled) {
    background: var(--gbif-color-accent-hover, #3f8326);
  }
  :focus-visible {
    outline: 2px solid var(--gbif-color-focus, #1d6fdc);
    outline-offset: 2px;
  }
`;
