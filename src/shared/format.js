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

/**
 * Only http(s) URLs may reach an `href` or `src`, whatever the API returned.
 * Returns the normalised URL, or `null` for anything else (including non-strings).
 */
export function safeHttpUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Licence keys used for filtering, and what they are called on screen.
 * `unknown` stands for a missing or unrecognised licence.
 */
export const LICENSES = {
  cc0: 'CC0',
  pdm: 'Public Domain',
  'cc-by': 'CC BY',
  'cc-by-sa': 'CC BY-SA',
  'cc-by-nd': 'CC BY-ND',
  'cc-by-nc': 'CC BY-NC',
  'cc-by-nc-sa': 'CC BY-NC-SA',
  'cc-by-nc-nd': 'CC BY-NC-ND',
  unknown: 'Unknown licence'
};

/** Shortcuts for the two questions most sites actually have. */
export const LICENSE_GROUPS = {
  /** Licences that allow commercial use. */
  commercial: ['cc0', 'pdm', 'cc-by', 'cc-by-sa', 'cc-by-nd'],
  /** Licences that allow adapting the work. */
  derivatives: ['cc0', 'pdm', 'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa']
};

const CC_HOSTS = new Set(['creativecommons.org', 'www.creativecommons.org']);

/** Identify a Creative Commons licence from its URL. */
function parseCreativeCommons(url) {
  const parsed = safeHttpUrl(url) && new URL(url.trim());
  if (!parsed || !CC_HOSTS.has(parsed.hostname)) return null;

  const licence = /^\/licenses\/([a-z-]+)\/([0-9.]+)\/?/i.exec(parsed.pathname);
  if (licence) {
    const type = licence[1].toLowerCase();
    return { key: LICENSES[`cc-${type}`] ? `cc-${type}` : 'unknown', label: `CC ${type.toUpperCase()} ${licence[2]}`, url: parsed.href };
  }
  const zero = /^\/publicdomain\/zero\/([0-9.]+)\/?/i.exec(parsed.pathname);
  if (zero) return { key: 'cc0', label: `CC0 ${zero[1]}`, url: parsed.href };
  const mark = /^\/publicdomain\/mark\/([0-9.]+)\/?/i.exec(parsed.pathname);
  if (mark) return { key: 'pdm', label: `Public Domain ${mark[1]}`, url: parsed.href };
  return null;
}

/** Turn a licence URL into `{ key, label, url }`, or `null` if it is not a usable URL. */
export function formatLicense(value) {
  const safe = safeHttpUrl(value);
  if (!safe) return null;
  const cc = parseCreativeCommons(safe);
  if (cc) return cc;
  const parsed = new URL(safe);
  return { key: 'unknown', label: `${parsed.host}${parsed.pathname}`.replace(/\/$/, ''), url: safe };
}

/** The filter key for a licence URL (`unknown` if missing or unrecognised). */
export function licenseKey(value) {
  return formatLicense(value)?.key ?? 'unknown';
}

/**
 * Parse a `licenses` attribute such as "cc0, cc-by" or "commercial" into a Set
 * of keys. Returns `null` (no filtering) for an empty value or the word `all`.
 * Unknown words are ignored; if nothing valid is left, nothing is filtered out
 * wrongly and `null` is returned.
 */
export function parseLicenseFilter(attribute) {
  if (!attribute || typeof attribute !== 'string') return null;
  const wanted = new Set();
  for (const word of attribute.toLowerCase().split(/[\s,]+/).filter(Boolean)) {
    if (word === 'all') return null;
    if (LICENSE_GROUPS[word]) LICENSE_GROUPS[word].forEach((key) => wanted.add(key));
    else if (LICENSES[word]) wanted.add(word);
  }
  return wanted.size ? wanted : null;
}

/** `FORMA_SPECIALIS` -> `forma specialis` */
export function rankLabel(rank = '') {
  return String(rank).toLowerCase().replace(/_/g, ' ');
}

/** `AMBIGUOUS_SYNONYM` -> `Ambiguous synonym` */
export function statusLabel(status = '') {
  const text = rankLabel(status);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Read a number attribute defensively: whole numbers only, within bounds. */
export function clampInt(value, { min = 1, max = 300, fallback }) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
