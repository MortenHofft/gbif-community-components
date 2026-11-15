/**
 * Events are how a component tells the host page what happened, and how the
 * page gets a say before a component does something on its own.
 *
 * All events bubble and are composed, so a page can listen on the element, on
 * a wrapper, or on `document`, even though the components use Shadow DOM.
 */
export function emit(el, name, detail, { cancelable = false } = {}) {
  const event = new CustomEvent(name, { detail, bubbles: true, composed: true, cancelable });
  el.dispatchEvent(event);
  return event;
}

/**
 * Handle a click on a link that is also a "navigation intent".
 *
 * Plain left clicks fire a cancelable event first. If the page calls
 * `preventDefault()`, the link is not followed and the page decides what to do.
 * Clicks with a modifier key (open in new tab, etc.) are left to the browser.
 *
 * Returns the event that was fired, or `null` if the click was left alone.
 */
export function linkIntent(el, clickEvent, name, detail) {
  const plain =
    !clickEvent.defaultPrevented &&
    clickEvent.button === 0 &&
    !clickEvent.metaKey &&
    !clickEvent.ctrlKey &&
    !clickEvent.shiftKey &&
    !clickEvent.altKey;
  if (!plain) return null;

  const event = emit(el, name, detail, { cancelable: true });
  if (event.defaultPrevented) clickEvent.preventDefault();
  return event;
}
