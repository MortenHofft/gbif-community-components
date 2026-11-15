import { test } from 'node:test';
import assert from 'node:assert/strict';

import { PREDICATE_TYPES, predicateProblem, parsePredicate, buildPredicate } from '../../src/shared/predicate.js';
import { postJson, getJson, clearCache, clearMemoryCache, setRetryDelay } from '../../src/shared/api.js';
import { searchOccurrencesByPredicate, fetchFacetsByPredicate, MAX_RESULTS } from '../../src/shared/occurrence.js';

const CK = 'cl-key';

/* ---------- reading a predicate from an attribute ---------- */

test('the predicate types are the ones the API lists', () => {
  assert.deepEqual([...PREDICATE_TYPES].sort(), ['and', 'equals', 'fullTextSearch', 'geoDistance', 'greaterThan', 'greaterThanOrEquals', 'in', 'isNotNull', 'isNull', 'lessThan', 'lessThanOrEquals', 'like', 'not', 'or', 'range', 'within']);
});

test('valid predicates are accepted whole, and the extra fields the API knows are passed through', () => {
  const good = [
    { type: 'equals', key: 'COUNTRY', value: 'NO' },
    { type: 'equals', key: 'TAXON_KEY', value: '4QHKG', checklistKey: CK },
    { type: 'in', key: 'DATASET_KEY', values: ['a', 'b'] },
    { type: 'and', predicates: [{ type: 'greaterThanOrEquals', key: 'YEAR', value: 2000 }, { type: 'not', predicate: { type: 'equals', key: 'COUNTRY', value: 'US' } }] },
    { type: 'or', predicates: [{ type: 'within', geometry: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))' }, { type: 'isNotNull', parameter: 'MEDIA_TYPE' }] },
    { type: 'like', key: 'RECORDED_BY', value: 'Smith*' },
    { type: 'range', key: 'YEAR', value: { gte: 2000 } },
    { type: 'geoDistance', latitude: '1', longitude: '2', distance: '5km' }
  ];
  for (const predicate of good) {
    assert.deepEqual(parsePredicate(JSON.stringify(predicate)), { predicate }, JSON.stringify(predicate).slice(0, 60));
  }
});

test('anything else is refused with a reason, never quietly dropped', () => {
  const bad = {
    '': 'empty',
    '   ': 'empty',
    'not json': 'JSON',
    '{"type":"banana"}': 'banana',
    '{}': 'is not a predicate type',
    '[]': 'not an object',
    'null': 'not an object',
    '{"type":"and"}': 'predicates',
    '{"type":"and","predicates":[]}': 'non-empty',
    '{"type":"and","predicates":[{"type":"nope"}]}': 'nope',
    '{"type":"and","predicates":[5]}': 'not an object',
    '{"type":"not"}': 'not an object',
    '{"type":"equals","value":"x"}': 'key',
    '{"type":"equals","key":"A"}': 'value',
    '{"type":"equals","key":"A","value":{"x":1}}': 'value',
    '{"type":"in","key":"A","values":[]}': 'values',
    '{"type":"in","key":"A","values":[{"x":1}]}': 'values',
    '{"type":"in","values":["a"]}': 'key',
    '{"type":"isNull"}': 'parameter',
    '{"type":"within"}': 'geometry',
    '{"type":"range"}': 'key'
  };
  for (const [text, reason] of Object.entries(bad)) {
    const result = parsePredicate(text);
    assert.equal(result.predicate, undefined, `${text} must not give a predicate`);
    assert.match(result.error, new RegExp(reason, 'i'), `${JSON.stringify(text)} -> ${result.error}`);
  }
  assert.equal(parsePredicate(undefined).error, 'it is empty');
  assert.equal(parsePredicate(42).error, 'it is empty');
});

test('a predicate that is too deep, too big or too long is refused', () => {
  let deep = { type: 'equals', key: 'A', value: 'x' };
  for (let i = 0; i < 12; i += 1) deep = { type: 'not', predicate: deep };
  assert.match(parsePredicate(JSON.stringify(deep)).error, /nested/);
  const wide = { type: 'or', predicates: Array.from({ length: 1001 }, () => ({ type: 'equals', key: 'A', value: 'x' })) };
  assert.match(parsePredicate(JSON.stringify(wide)).error, /more than 1000 parts/);
  assert.match(parsePredicate(`{"type":"equals","key":"A","value":"${'x'.repeat(100_001)}"}`).error, /longer than/);
  assert.equal(predicateProblem({ type: 'equals', key: 'A', value: 'x' }), null);
});

/* ---------- filters as predicates ---------- */

test('buildPredicate: nothing narrows it gives null, one part is itself, several are an "and"', () => {
  assert.equal(buildPredicate({}), null);
  assert.deepEqual(buildPredicate({ taxonKey: 'K', checklistKey: CK }), { type: 'equals', key: 'TAXON_KEY', value: 'K', checklistKey: CK });
  const both = buildPredicate({ taxonKey: 'K', checklistKey: CK, datasetKey: 'D' });
  assert.deepEqual(both, { type: 'and', predicates: [{ type: 'equals', key: 'TAXON_KEY', value: 'K', checklistKey: CK }, { type: 'equals', key: 'DATASET_KEY', value: 'D' }] });
});

test('buildPredicate: the checklist goes INSIDE the taxon predicate, never beside it', () => {
  const p = buildPredicate({ taxonKey: 'K', checklistKey: CK, query: { country: ['NO'] } });
  assert.equal(p.predicates[0].checklistKey, CK);
  assert.equal('checklistKey' in p, false, 'at the top of a request the API ignores it');
});

test('buildPredicate: each filter becomes the predicate the API was checked to agree on', () => {
  const only = (query) => buildPredicate({ query });
  assert.deepEqual(only({ country: ['NO'] }), { type: 'equals', key: 'COUNTRY', value: 'NO' });
  assert.deepEqual(only({ country: ['NO', 'SE'] }), { type: 'in', key: 'COUNTRY', values: ['NO', 'SE'] });
  assert.deepEqual(only({ basisOfRecord: ['HUMAN_OBSERVATION', 'OBSERVATION'] }), { type: 'in', key: 'BASIS_OF_RECORD', values: ['HUMAN_OBSERVATION', 'OBSERVATION'] });
  assert.deepEqual(only({ license: ['CC0_1_0'] }), { type: 'equals', key: 'LICENSE', value: 'CC0_1_0' });
  assert.deepEqual(only({ hasCoordinate: true }), { type: 'equals', key: 'HAS_COORDINATE', value: 'true' });
  assert.deepEqual(only({ year: '2015' }), { type: 'equals', key: 'YEAR', value: '2015' });
  assert.deepEqual(only({ year: '2000,*' }), { type: 'greaterThanOrEquals', key: 'YEAR', value: '2000' });
  assert.deepEqual(only({ year: '*,1990' }), { type: 'lessThanOrEquals', key: 'YEAR', value: '1990' });
  assert.deepEqual(only({ year: '2000,2010' }), { type: 'and', predicates: [{ type: 'greaterThanOrEquals', key: 'YEAR', value: '2000' }, { type: 'lessThanOrEquals', key: 'YEAR', value: '2010' }] });
  assert.equal(only({ q: 'jaguar' }), null, 'free text is sent beside the predicate, not in it');
});

test('buildPredicate: the page author\'s subset is always in, and "without" only removes the visitor\'s filters', () => {
  const base = { type: 'in', key: 'COUNTRY', values: ['NO', 'SE'] };
  const query = { country: ['NO'], year: '2000,*' };
  const all = buildPredicate({ base, query });
  assert.deepEqual(all.predicates.map((p) => p.key), ['COUNTRY', 'COUNTRY', 'YEAR']);
  const noCountry = buildPredicate({ base, query, without: ['country'] });
  assert.deepEqual(noCountry.predicates.map((p) => `${p.type}:${p.key}`), ['in:COUNTRY', 'greaterThanOrEquals:YEAR'], 'the subset stays');
  assert.deepEqual(buildPredicate({ base, without: ['country'] }), base);
  assert.deepEqual(buildPredicate({ base, query, mediaType: 'StillImage' }).predicates.at(-1), { type: 'equals', key: 'MEDIA_TYPE', value: 'StillImage' });
});

/* ---------- postJson ---------- */

class FakeStorage {
  getItem(key) { return key in this ? this[key] : null; }
  setItem(key, value) { this[key] = String(value); }
  removeItem(key) { delete this[key]; }
}

async function withFetch(handler, run) {
  clearCache();
  const realFetch = globalThis.fetch;
  const realStorage = globalThis.sessionStorage;
  globalThis.sessionStorage = new FakeStorage();
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, method: init.method ?? 'GET', headers: init.headers, body: init.body ? JSON.parse(init.body) : undefined });
    const out = await handler(calls.at(-1), calls.length);
    return { ok: out.status ? out.status < 400 : true, status: out.status ?? 200, headers: { get: (n) => (n === 'cache-control' ? out.cacheControl ?? null : null) }, json: async () => out.body ?? {} };
  };
  try {
    return await run(calls);
  } finally {
    globalThis.fetch = realFetch;
    globalThis.sessionStorage = realStorage;
    clearCache();
  }
}

test('postJson sends JSON, and identical requests share one call; a different body is a different request', async () => {
  await withFetch(() => ({ body: { count: 1 }, cacheControl: 'public, max-age=600' }), async (calls) => {
    const a = { limit: 0, predicate: { type: 'equals', key: 'COUNTRY', value: 'NO' } };
    const [one, two] = await Promise.all([postJson('https://api.test/p', a), postJson('https://api.test/p', structuredClone(a))]);
    assert.strictEqual(one, two);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'POST');
    assert.equal(calls[0].headers['Content-Type'], 'application/json');
    assert.deepEqual(calls[0].body, a);
    await postJson('https://api.test/p', { ...a, limit: 5 });
    assert.equal(calls.length, 2, 'another body is another request');
    await postJson('https://api.test/other', a);
    assert.equal(calls.length, 3, 'another URL is another request');
  });
});

test('postJson answers are kept for the API\'s max-age under a key made of the URL and the body', async () => {
  await withFetch(() => ({ body: { count: 7 }, cacheControl: 'public, max-age=600' }), async (calls) => {
    const body = { limit: 0, predicate: { type: 'equals', key: 'A', value: 'x' } };
    await postJson('https://api.test/p', body);
    const keys = Object.keys(globalThis.sessionStorage);
    assert.equal(keys.length, 1);
    assert.match(keys[0], /^gbif-components:v1:https:\/\/api\.test\/p#[0-9a-f]{32}$/, 'a hash of the body, not the body');
    clearMemoryCache(); // a new page view in the same tab
    assert.deepEqual(await postJson('https://api.test/p', body), { count: 7 });
    assert.equal(calls.length, 1, 'read from storage');
    clearMemoryCache();
    await postJson('https://api.test/p', { ...body, limit: 1 });
    assert.equal(calls.length, 2, 'a different body is not found there');
  });
});

test('postJson: failures are not remembered, and a 429 is tried once more, as with getJson', async () => {
  setRetryDelay(5);
  try {
    await withFetch((call, n) => (n === 1 ? { status: 429 } : { body: { ok: true } }), async (calls) => {
      assert.deepEqual(await postJson('https://api.test/p', { limit: 0 }), { ok: true });
      assert.equal(calls.length, 2);
      assert.equal(calls[1].method, 'POST');
      assert.deepEqual(calls[1].body, { limit: 0 }, 'the body is sent again');
    });
    await withFetch(() => ({ status: 400, body: {} }), async (calls) => {
      await assert.rejects(postJson('https://api.test/p', { limit: 0 }), (e) => e.status === 400 && e.url === 'https://api.test/p');
      await assert.rejects(postJson('https://api.test/p', { limit: 0 }));
      assert.equal(calls.length, 2, 'a 400 is not retried, and not remembered');
    });
  } finally {
    setRetryDelay(1200);
  }
});

test('getJson still works the same way beside postJson', async () => {
  await withFetch(() => ({ body: { g: 1 } }), async (calls) => {
    assert.deepEqual(await getJson('https://api.test/g'), { g: 1 });
    assert.equal(calls[0].method, 'GET');
    assert.equal(calls[0].body, undefined);
  });
});

/* ---------- predicate searches ---------- */

const NO = { type: 'equals', key: 'COUNTRY', value: 'NO' };

test('a predicate page is a POST with the predicate, the paging, and q beside it; the last page is trimmed', async () => {
  await withFetch(() => ({ body: { count: 3, results: [{ key: 1 }, null, { key: 2 }] } }), async (calls) => {
    const page = await searchOccurrencesByPredicate({ apiBase: 'https://api.test', predicate: NO, q: 'jaguar', limit: 24, offset: 99984 });
    assert.deepEqual(page, { count: 3, results: [{ key: 1 }, { key: 2 }] });
    assert.equal(calls[0].url, 'https://api.test/v1/occurrence/search/predicate');
    assert.deepEqual(calls[0].body, { limit: 16, offset: 99984, predicate: NO, q: 'jaguar' });
    assert.equal(calls[0].body.limit + calls[0].body.offset, MAX_RESULTS);
    await searchOccurrencesByPredicate({ apiBase: 'https://api.test', predicate: NO, limit: 10, offset: 0 });
    assert.equal('q' in calls[1].body, false, 'no empty q');
  });
});

test('a request without a predicate is never sent: the API would answer with all of GBIF', async () => {
  await withFetch(() => ({ body: { count: 3894101988 } }), async (calls) => {
    await assert.rejects(searchOccurrencesByPredicate({ apiBase: 'https://api.test', predicate: null, limit: 1, offset: 0 }), /needs a predicate/);
    await assert.rejects(searchOccurrencesByPredicate({ apiBase: 'https://api.test', predicate: undefined, q: 'x', limit: 1, offset: 0 }), /needs a predicate/);
    await assert.rejects(fetchFacetsByPredicate({ apiBase: 'https://api.test', build: () => ({ predicate: null }), filters: ['country'], active: new Set() }), /needs a predicate/);
    assert.equal(calls.length, 0);
  });
});

test('facets by predicate: filters not set share one request with the total; each set filter is counted without itself', async () => {
  const base = { type: 'in', key: 'COUNTRY', values: ['NO', 'SE'] };
  const query = { country: ['NO'], basisOfRecord: ['HUMAN_OBSERVATION'], year: '2000,*', q: 'jaguar' };
  const build = (without) => {
    const { q, ...filters } = Object.fromEntries(Object.entries(query).filter(([k]) => !without.includes(k)));
    return { predicate: buildPredicate({ base, query: filters }), q };
  };
  await withFetch(
    (call) => {
      const facets = (call.body.facets ?? []).map((field) => ({ field, counts: [{ name: `${field}-v`, count: call.body.predicate.type === 'and' ? call.body.predicate.predicates.length : 1 }] }));
      return { body: { count: call.body.facets ? 100 + (call.body.facets.length) : 999, facets } };
    },
    async (calls) => {
      const result = await fetchFacetsByPredicate({ apiBase: 'https://api.test', build, filters: ['country', 'basisOfRecord', 'license', 'year', 'hasCoordinate', 'q'], active: new Set(['country', 'basisOfRecord', 'year', 'q']), facetLimit: 7 });

      // facets exist for country, basisOfRecord, license: license is not set (shared request), the other two are
      assert.equal(calls.length, 3);
      const [shared, ownCountry, ownBasis] = calls.map((c) => c.body);
      assert.deepEqual(shared.facets, ['LICENSE'], 'the filter that is not set shares the total\'s request');
      assert.deepEqual(ownCountry.facets, ['COUNTRY']);
      assert.deepEqual(ownBasis.facets, ['BASIS_OF_RECORD']);
      for (const body of [shared, ownCountry, ownBasis]) {
        assert.equal(body.q, 'jaguar', 'free text applies to every request');
        assert.equal(body.facetLimit, 7);
        assert.equal(body.facetMincount, 1);
        assert.equal(body.limit, 0);
        assert.ok(JSON.stringify(body.predicate).includes('"values":["NO","SE"]'), 'the page author\'s subset is in every request, in full');
      }
      const has = (body, key, type) => JSON.stringify(body.predicate).includes(`"type":"${type}","key":"${key}"`);
      assert.ok(has(shared, 'COUNTRY', 'equals') && has(shared, 'BASIS_OF_RECORD', 'equals'), 'the total keeps every filter');
      assert.ok(!has(ownCountry, 'COUNTRY', 'equals') && has(ownCountry, 'BASIS_OF_RECORD', 'equals'), 'country counted without the visitor\'s country');
      assert.ok(!has(ownBasis, 'BASIS_OF_RECORD', 'equals') && has(ownBasis, 'COUNTRY', 'equals'), 'basis counted without the visitor\'s basis');
      assert.equal(result.count, 101, 'the total comes from the request with every filter');
      assert.deepEqual(Object.keys(result.facets).sort(), ['BASIS_OF_RECORD', 'COUNTRY', 'LICENSE']);
    }
  );
});

test('facets by predicate: with nothing set there is one request, and with every facet set there is still one for the total', async () => {
  const build = (without) => ({ predicate: buildPredicate({ query: { country: ['NO'], basisOfRecord: ['OBSERVATION'], license: ['CC0_1_0'] } , without }) , q: undefined });
  await withFetch(() => ({ body: { count: 5, facets: [] } }), async (calls) => {
    await fetchFacetsByPredicate({ apiBase: 'https://api.test', build: () => ({ predicate: NO }), filters: ['country', 'basisOfRecord'], active: new Set() });
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].body.facets, ['COUNTRY', 'BASIS_OF_RECORD']);
  });
  await withFetch(() => ({ body: { count: 5, facets: [] } }), async (calls) => {
    await fetchFacetsByPredicate({ apiBase: 'https://api.test', build, filters: ['country', 'basisOfRecord', 'license'], active: new Set(['country', 'basisOfRecord', 'license']) });
    assert.equal(calls.length, 4);
    assert.equal('facets' in calls[0].body, false, 'the total\'s request has no facets');
  });
});
