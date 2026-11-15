/** Small formatting and safety helpers shared by the components. */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(text = '') {
  return String(text).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/**
 * GBIF returns name labels as HTML with italics and already-encoded entities
 * (`<i>Puma concolor</i> Whittaker &amp; Margulis`). That string comes from an
 * external API and is shown on someone else's site, so everything is escaped
 * and only these are let back in:
 *   - plain `<i>` and `<em>` tags (tags with attributes never match),
 *   - the entities `&amp; &lt; &gt; &quot; &#39;`, which decode to text, never markup.
 * A lone `&` stays escaped.
 */
export function safeNameHtml(html = '') {
  return escapeHtml(html)
    .replace(/&lt;(\/?)(i|em)&gt;/gi, '<$1$2>')
    .replace(/&amp;(amp|lt|gt|quot|#39);/g, '&$1;');
}

/** Turn a licence URL into a short label and a link. */
export function formatLicense(url) {
  if (!url) return null;

  const cc = url.match(/creativecommons\.org\/licenses\/([a-z-]+)\/([0-9.]+)/i);
  if (cc) return { label: `CC ${cc[1].toUpperCase()} ${cc[2]}`, url };

  const cc0 = url.match(/creativecommons\.org\/publicdomain\/zero\/([0-9.]+)/i);
  if (cc0) return { label: `CC0 ${cc0[1]}`, url };

  const mark = url.match(/creativecommons\.org\/publicdomain\/mark\/([0-9.]+)/i);
  if (mark) return { label: `Public Domain ${mark[1]}`, url };

  return { label: url.replace(/^https?:\/\//, ''), url };
}

/** `FORMA_SPECIALIS` -> `forma specialis` */
export function rankLabel(rank = '') {
  return rank.toLowerCase().replace(/_/g, ' ');
}
