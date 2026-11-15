/** Small formatting and safety helpers shared by the components. */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(text = '') {
  return String(text).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/**
 * GBIF returns scientific names as HTML with italics (`<i>Puma</i> <i>concolor</i>`).
 * That string comes from an external API and is shown on someone else's site,
 * so everything is escaped and only plain `<i>` and `<em>` tags are let back in.
 * Tags with attributes never match and stay escaped.
 */
export function safeNameHtml(html = '') {
  return escapeHtml(html).replace(/&lt;(\/?)(i|em)&gt;/gi, '<$1$2>');
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
