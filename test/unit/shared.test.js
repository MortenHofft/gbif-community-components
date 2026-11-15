import { test } from 'node:test';
import assert from 'node:assert/strict';

import { safeNameHtml, formatLicense, rankLabel } from '../../src/shared/format.js';
import { buildUrl, getJson, clearCache, GbifApiError } from '../../src/shared/api.js';
import { resolveTaxon, isConfidentMatch, normalizeTaxon } from '../../src/shared/taxon.js';
import { configure, resolveConfig, DEFAULTS } from '../../src/shared/config.js';
import { linkIntent } from '../../src/shared/events.js';

test('safeNameHtml keeps italics and escapes everything else', () => {
  assert.equal(safeNameHtml('<i>Puma</i> <i>concolor</i> (Linnaeus, 1771)'), '<i>Puma</i> <i>concolor</i> (Linnaeus, 1771)');
  assert.equal(safeNameHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  // Tags carrying attributes never match the allow-list.
  assert.equal(safeNameHtml('<i onclick="x()">a</i>'), '&lt;i onclick=&quot;x()&quot;&gt;a</i>');
  assert.equal(safeNameHtml('<img src=x onerror=y>'), '&lt;img src=x onerror=y&gt;');
  assert.equal(safeNameHtml(), '');
  // Entities already encoded by the API are not double-escaped, but a lone & is escaped.
  assert.equal(safeNameHtml('Eukaryota (Chatton, 1925) Whittaker &amp; Margulis'), 'Eukaryota (Chatton, 1925) Whittaker &amp; Margulis');
  assert.equal(safeNameHtml('Whittaker & Margulis'), 'Whittaker &amp; Margulis');
  assert.equal(safeNameHtml('&lt;script&gt;'), '&lt;script&gt;', 'decodes to text, never to a tag');
  assert.equal(safeNameHtml('&amp;lt;b&amp;gt;'), '&amp;lt;b&amp;gt;');
});

test('formatLicense recognises Creative Commons licences', () => {
  assert.deepEqual(formatLicense('http://creativecommons.org/licenses/by-nc/4.0/'), {
    label: 'CC BY-NC 4.0',
    url: 'http://creativecommons.org/licenses/by-nc/4.0/'
  });
  assert.equal(formatLicense('http://creativecommons.org/publicdomain/zero/1.0/').label, 'CC0 1.0');
  assert.equal(formatLicense('https://example.org/terms').label, 'example.org/terms');
  assert.equal(formatLicense(undefined), null);
});

test('rankLabel makes ranks readable', () => {
  assert.equal(rankLabel('FORMA_SPECIALIS'), 'forma specialis');
});

test('buildUrl skips empty values and repeats array values', () => {
  const url = new URL(buildUrl('https://api.example.org', '/v1/search', { a: 1, b: undefined, c: '', d: null, t: ['x', 'y'] }));
  assert.equal(url.pathname, '/v1/search');
  assert.equal(url.searchParams.get('a'), '1');
  assert.equal(url.searchParams.has('b'), false);
  assert.equal(url.searchParams.has('c'), false);
  assert.equal(url.searchParams.has('d'), false);
  assert.deepEqual(url.searchParams.getAll('t'), ['x', 'y']);
});

/** Canned responses shaped like the real API output, served by a stubbed fetch. */
const CHECKLIST = 'cl';
const PUMA = { taxonID: '4QHKG', scientificName: 'Puma concolor', scientificNameAuthorship: '(Linnaeus, 1771)', taxonRank: 'SPECIES', label: '<i>Puma concolor</i> (Linnaeus, 1771)', taxonomicStatus: 'ACCEPTED', parentNameUsageID: '75F9' };
const FELIS = { taxonID: '3DXV5', scientificName: 'Felis concolor', taxonRank: 'SPECIES', label: '<i>Felis concolor</i> Linnaeus, 1771', taxonomicStatus: 'SYNONYM', acceptedNameUsageID: '4QHKG' };
const TREE = [
  { taxonID: 'N', scientificName: 'Animalia', taxonRank: 'KINGDOM', species: 10 },
  { taxonID: '75F9', scientificName: 'Puma', taxonRank: 'GENUS' },
  { taxonID: '4QHKG', scientificName: 'Puma concolor', taxonRank: 'SPECIES' }
];
const ROUTES = {
  [`/v2/taxon/${CHECKLIST}/4QHKG`]: PUMA,
  [`/v2/taxon/${CHECKLIST}/3DXV5`]: FELIS,
  [`/v2/taxon/tree/${CHECKLIST}/4QHKG`]: TREE,
  [`/v2/taxon/tree/${CHECKLIST}/3DXV5`]: TREE
};
const MATCHES = {
  'Puma concolor': { usage: { key: '4QHKG' }, diagnostics: { matchType: 'EXACT', confidence: 99 } },
  'Felis concolor': { usage: { key: '3DXV5', status: 'SYNONYM' }, acceptedUsage: { key: '4QHKG' }, diagnostics: { matchType: 'EXACT', confidence: 95 } },
  Pumx: { usage: { key: '4QHKG' }, diagnostics: { matchType: 'FUZZY', confidence: 40 } },
  nothing: { diagnostics: { matchType: 'NONE' } }
};

async function withApi(run) {
  clearCache();
  const realFetch = globalThis.fetch;
  const requested = [];
  globalThis.fetch = async (url) => {
    const { pathname, searchParams } = new URL(url);
    requested.push(pathname);
    const body = pathname === '/v2/species/match' ? MATCHES[searchParams.get('scientificName')] : ROUTES[pathname];
    return body
      ? { ok: true, json: async () => body }
      : { ok: false, status: 404 };
  };
  try {
    return await run(requested);
  } finally {
    globalThis.fetch = realFetch;
    clearCache();
  }
}

const base = { apiBase: 'https://api.test', checklistKey: CHECKLIST };

test('isConfidentMatch only trusts good matches', () => {
  assert.equal(isConfidentMatch(MATCHES['Puma concolor']), true);
  assert.equal(isConfidentMatch(MATCHES.Pumx), false, 'low confidence');
  assert.equal(isConfidentMatch(MATCHES.nothing), false, 'no match');
  assert.equal(isConfidentMatch({ usage: { key: 'A' }, diagnostics: { matchType: 'NONE', confidence: 99 } }), false);
});

test('normalizeTaxon maps Taxon API fields', () => {
  const t = normalizeTaxon(PUMA);
  assert.equal(t.key, '4QHKG');
  assert.equal(t.rank, 'SPECIES');
  assert.equal(t.formattedName, '<i>Puma concolor</i> (Linnaeus, 1771)');
  assert.equal(t.status, 'ACCEPTED');
});

test('resolveTaxon by key reads details and classification from the Taxon API, not the match API', async () => {
  await withApi(async (requested) => {
    const result = await resolveTaxon({ ...base, taxonKey: '4QHKG' });
    assert.equal(result.found, true);
    assert.equal(result.target.key, '4QHKG');
    assert.equal(result.isSynonym, false);
    assert.deepEqual(result.classification.map((c) => c.key), ['N', '75F9', '4QHKG']);
    assert.deepEqual([...requested].sort(), [`/v2/taxon/${CHECKLIST}/4QHKG`, `/v2/taxon/tree/${CHECKLIST}/4QHKG`].sort());
  });
});

test('resolveTaxon by name matches first, then reads details from the Taxon API', async () => {
  await withApi(async (requested) => {
    const result = await resolveTaxon({ ...base, scientificName: 'Puma concolor' });
    assert.equal(result.found, true);
    assert.equal(result.target.key, '4QHKG');
    assert.equal(result.matchType, 'EXACT');
    assert.equal(requested[0], '/v2/species/match');
    assert.ok(requested.includes(`/v2/taxon/${CHECKLIST}/4QHKG`));
  });
});

test('resolveTaxon refuses low-confidence and missing matches without touching the Taxon API', async () => {
  await withApi(async (requested) => {
    for (const name of ['Pumx', 'nothing']) {
      const result = await resolveTaxon({ ...base, scientificName: name });
      assert.equal(result.found, false);
    }
    assert.deepEqual(requested, ['/v2/species/match', '/v2/species/match']);
  });
});

test('resolveTaxon follows a synonym found by name to the accepted taxon', async () => {
  await withApi(async () => {
    const result = await resolveTaxon({ ...base, scientificName: 'Felis concolor' });
    assert.equal(result.isSynonym, true);
    assert.equal(result.usage.key, '3DXV5');
    assert.equal(result.target.key, '4QHKG');
    assert.equal(result.classification.at(-1).key, '4QHKG');
  });
});

test('resolveTaxon follows a synonym key to the accepted taxon', async () => {
  await withApi(async () => {
    const result = await resolveTaxon({ ...base, taxonKey: '3DXV5' });
    assert.equal(result.isSynonym, true);
    assert.equal(result.target.key, '4QHKG');
  });
});

test('resolveTaxon reports an unknown key as not found, not as an error', async () => {
  await withApi(async () => {
    assert.deepEqual(await resolveTaxon({ ...base, taxonKey: 'ZZZZZ' }), { found: false });
  });
});

test('resolveTaxon lets real failures through as errors', async () => {
  clearCache();
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 500 });
  try {
    await assert.rejects(resolveTaxon({ ...base, taxonKey: '4QHKG' }), (err) => err.status === 500);
  } finally {
    globalThis.fetch = realFetch;
    clearCache();
  }
});

test('resolveConfig: element > configure() > defaults', () => {
  assert.equal(resolveConfig({}).apiBase, DEFAULTS.apiBase);
  configure({ apiBase: 'https://proxy.example.org///' });
  assert.equal(resolveConfig({}).apiBase, 'https://proxy.example.org');
  assert.equal(resolveConfig({ apiBase: 'https://el.example.org' }).apiBase, 'https://el.example.org');
  configure({ apiBase: DEFAULTS.apiBase });
});

test('getJson shares in-flight requests, caches successes and never caches failures', async () => {
  clearCache();
  const realFetch = globalThis.fetch;
  let calls = 0;
  let fail = true;
  globalThis.fetch = async () => {
    calls += 1;
    return fail ? { ok: false, status: 503 } : { ok: true, json: async () => ({ calls }) };
  };

  try {
    await assert.rejects(getJson('https://x.test/a'), (err) => err instanceof GbifApiError && err.status === 503 && err.url === 'https://x.test/a');
    fail = false;
    const [one, two] = await Promise.all([getJson('https://x.test/a'), getJson('https://x.test/a')]);
    assert.strictEqual(one, two);
    await getJson('https://x.test/a');
    assert.equal(calls, 2, 'one failed call, then one shared successful call');
  } finally {
    globalThis.fetch = realFetch;
    clearCache();
  }
});

test('getJson sets no expiry of its own: a remembered response is reused, whatever its age', async () => {
  clearCache();
  const realFetch = globalThis.fetch;
  const realNow = Date.now;
  let calls = 0;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ calls: ++calls }) });
  try {
    await getJson('https://x.test/fresh');
    Date.now = () => realNow() + 24 * 60 * 60 * 1000; // a day later
    await getJson('https://x.test/fresh');
    assert.equal(calls, 1, 'freshness is the HTTP cache\'s job, not this module\'s');
  } finally {
    Date.now = realNow;
    globalThis.fetch = realFetch;
    clearCache();
  }
});

test('getJson keeps memory bounded by dropping the oldest responses', async () => {
  clearCache();
  const realFetch = globalThis.fetch;
  const calls = new Map();
  globalThis.fetch = async (url) => {
    calls.set(url, (calls.get(url) || 0) + 1);
    return { ok: true, json: async () => ({}) };
  };
  try {
    for (let i = 0; i < 205; i += 1) await getJson(`https://x.test/${i}`);
    await getJson('https://x.test/204'); // newest: still remembered
    await getJson('https://x.test/0'); // oldest: was dropped, requested again
    assert.equal(calls.get('https://x.test/204'), 1);
    assert.equal(calls.get('https://x.test/0'), 2);
  } finally {
    globalThis.fetch = realFetch;
    clearCache();
  }
});

test('linkIntent fires a cancelable event and respects preventDefault', () => {
  const el = new EventTarget();
  const seen = [];
  el.addEventListener('gbif-taxon-select', (event) => {
    seen.push(event.detail);
    event.preventDefault();
  });

  let prevented = false;
  const click = { button: 0, defaultPrevented: false, preventDefault: () => (prevented = true) };
  const event = linkIntent(el, click, 'gbif-taxon-select', { taxonKey: 'A' });

  assert.deepEqual(seen, [{ taxonKey: 'A' }]);
  assert.equal(event.defaultPrevented, true);
  assert.equal(prevented, true, 'the link click is cancelled when the page cancels the event');
});

test('linkIntent leaves modified clicks to the browser', () => {
  const el = new EventTarget();
  let fired = 0;
  el.addEventListener('gbif-taxon-select', () => (fired += 1));

  for (const modifier of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey']) {
    const click = { button: 0, [modifier]: true, preventDefault() {} };
    assert.equal(linkIntent(el, click, 'gbif-taxon-select', {}), null);
  }
  assert.equal(linkIntent(el, { button: 1, preventDefault() {} }, 'gbif-taxon-select', {}), null);
  assert.equal(fired, 0);
});
