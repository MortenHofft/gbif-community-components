import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildUrl, getJson, postJson, clearCache, clearMemoryCache, setRequestTimeout, setRetryDelay, GbifApiError } from '../../src/shared/api.js';
import { configure, resolveConfig, DEFAULTS } from '../../src/shared/config.js';
import {
  safeHttpUrl,
  formatLicense,
  licenseKey,
  parseLicenseFilter,
  clampInt,
  statusLabel
} from '../../src/shared/format.js';
import { exploreGeometry } from '../../src/shared/geo.js';
import { resolveTaxon, getChecklistInfo, isConfidentMatch, pointsToAccepted } from '../../src/shared/taxon.js';

/* ---------- URLs and configuration ---------- */

test('buildUrl keeps a path prefix on the base (a same-origin proxy)', () => {
  assert.equal(buildUrl('https://example.org/gbif-proxy', '/v2/taxon/ck/K'), 'https://example.org/gbif-proxy/v2/taxon/ck/K');
  assert.equal(buildUrl('https://example.org/gbif-proxy/', 'v2/taxon/ck/K'), 'https://example.org/gbif-proxy/v2/taxon/ck/K');
  assert.equal(buildUrl('https://api.gbif.org', '/v2/x', { a: 1 }), 'https://api.gbif.org/v2/x?a=1');
});

test('buildUrl resolves a relative base against the page', () => {
  const realLocation = globalThis.location;
  globalThis.location = { href: 'https://site.example/section/page.html' };
  try {
    assert.equal(buildUrl('/gbif-proxy', '/v2/taxon/ck/K'), 'https://site.example/gbif-proxy/v2/taxon/ck/K');
  } finally {
    globalThis.location = realLocation;
  }
});

test('configure can set and reset every default, including booleans', () => {
  configure({ showSource: false, apiBase: 'https://p.example/x/' });
  assert.equal(resolveConfig({}).showSource, false);
  assert.equal(resolveConfig({}).apiBase, 'https://p.example/x');
  assert.equal(resolveConfig({ hideSource: true }).showSource, false);
  configure({ showSource: null, apiBase: undefined });
  assert.equal(resolveConfig({}).showSource, DEFAULTS.showSource);
  assert.equal(resolveConfig({}).apiBase, DEFAULTS.apiBase);
  assert.equal(resolveConfig({ hideSource: true }).showSource, false);
});

test('the default checklist is the Catalogue of Life key', () => {
  assert.equal(DEFAULTS.checklistKey, '7ddf754f-d193-4cc9-b351-99906754a03b');
});

/* ---------- Untrusted values ---------- */

test('safeHttpUrl accepts only http(s) strings', () => {
  assert.equal(safeHttpUrl('https://example.org/a.jpg'), 'https://example.org/a.jpg');
  assert.equal(safeHttpUrl('http://example.org/a.jpg'), 'http://example.org/a.jpg');
  for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'ftp://x.org/a', '//x.org/a', '', null, undefined, 5, {}, ['https://x.org']]) {
    assert.equal(safeHttpUrl(bad), null, `rejects ${String(bad)}`);
  }
});

test('formatLicense is not fooled by look-alike URLs and never throws', () => {
  assert.equal(formatLicense('javascript:alert(1)'), null);
  assert.equal(formatLicense({ not: 'a string' }), null);
  assert.equal(formatLicense(42), null);
  const spoof = formatLicense('https://evil.example/?u=creativecommons.org/licenses/by/4.0/');
  assert.equal(spoof.key, 'unknown');
  assert.notEqual(spoof.label, 'CC BY 4.0');
  assert.equal(formatLicense('https://creativecommons.org.evil.example/licenses/by/4.0/').key, 'unknown');
});

test('licence keys cover the Creative Commons family', () => {
  const cases = {
    'http://creativecommons.org/licenses/by/4.0/': 'cc-by',
    'https://creativecommons.org/licenses/by-nc/4.0/': 'cc-by-nc',
    'http://creativecommons.org/licenses/by-nc-nd/4.0/': 'cc-by-nc-nd',
    'http://creativecommons.org/licenses/by-sa/3.0/': 'cc-by-sa',
    'http://creativecommons.org/licenses/by-nd/4.0/': 'cc-by-nd',
    'http://creativecommons.org/licenses/by-nc-sa/4.0/': 'cc-by-nc-sa',
    'http://creativecommons.org/publicdomain/zero/1.0/': 'cc0',
    'http://creativecommons.org/publicdomain/mark/1.0/': 'pdm',
    'https://example.org/own-terms': 'unknown'
  };
  for (const [url, key] of Object.entries(cases)) assert.equal(licenseKey(url), key, url);
  assert.equal(licenseKey(undefined), 'unknown');
});

test('parseLicenseFilter: lists, shortcuts, and "no filter"', () => {
  assert.equal(parseLicenseFilter(undefined), null);
  assert.equal(parseLicenseFilter(''), null);
  assert.equal(parseLicenseFilter('all'), null);
  assert.equal(parseLicenseFilter('nonsense'), null, 'nothing valid means no filtering, not "show nothing"');
  assert.deepEqual([...parseLicenseFilter('cc0, CC-BY')].sort(), ['cc-by', 'cc0']);
  const commercial = parseLicenseFilter('commercial');
  assert.ok(commercial.has('cc-by') && commercial.has('cc0') && !commercial.has('cc-by-nc') && !commercial.has('cc-by-nc-nd'));
  const derivatives = parseLicenseFilter('derivatives');
  assert.ok(derivatives.has('cc-by-nc') && !derivatives.has('cc-by-nd'));
  assert.ok(parseLicenseFilter('cc-by unknown').has('unknown'));
});

test('clampInt keeps numbers inside their bounds and falls back for rubbish', () => {
  const opts = { min: 1, max: 300, fallback: 20 };
  assert.equal(clampInt(5, opts), 5);
  assert.equal(clampInt(-5, opts), 1);
  assert.equal(clampInt(0, opts), 1);
  assert.equal(clampInt(2.7, opts), 2);
  assert.equal(clampInt(999999, opts), 300);
  assert.equal(clampInt('abc', opts), 20);
  assert.equal(clampInt(undefined, opts), 20);
  assert.equal(clampInt(NaN, opts), 20);
  assert.equal(clampInt(Infinity, opts), 20);
});

test('statusLabel names every kind of non-accepted name', () => {
  assert.equal(statusLabel('SYNONYM'), 'Synonym');
  assert.equal(statusLabel('AMBIGUOUS_SYNONYM'), 'Ambiguous synonym');
  assert.equal(statusLabel('MISAPPLIED'), 'Misapplied');
});

/* ---------- Explore geometry ---------- */

test('exploreGeometry: a box inside the world is one polygon', () => {
  const { geometry, bounds } = exploreGeometry({ west: -10, east: 30, south: -20, north: 40 });
  assert.equal(geometry, 'POLYGON((-10 -20, 30 -20, 30 40, -10 40, -10 -20))');
  assert.deepEqual(bounds, { south: -20, north: 40, west: -10, east: 30 });
});

test('exploreGeometry: a box across the antimeridian becomes two polygons', () => {
  // Leaflet reports longitudes beyond 180 when the map is panned east across the dateline.
  const { geometry, bounds } = exploreGeometry({ west: 160, east: 200, south: -10, north: 10 });
  assert.equal(geometry, 'MULTIPOLYGON(((160 -10, 180 -10, 180 10, 160 10, 160 -10)),((-180 -10, -160 -10, -160 10, -180 10, -180 -10)))');
  assert.deepEqual(bounds, { south: -10, north: 10, west: 160, east: -160 });
});

test('exploreGeometry: bounds panned far past 180 are wrapped, not inverted', () => {
  const { geometry, bounds } = exploreGeometry({ west: 305, east: 365, south: 0, north: 10 });
  assert.equal(bounds.west, -55);
  assert.equal(bounds.east, 5);
  assert.match(geometry, /^POLYGON/);
});

test('exploreGeometry: a span of the whole world (or more) is the whole world', () => {
  const { geometry, bounds } = exploreGeometry({ west: -400, east: 400, south: -95, north: 95 });
  assert.equal(geometry, 'POLYGON((-180 -90, 180 -90, 180 90, -180 90, -180 -90))');
  assert.deepEqual(bounds, { south: -90, north: 90, west: -180, east: 180 });
});

/* ---------- Taxon resolution ---------- */

const CK = 'cl';
const base = { apiBase: 'https://api.test', checklistKey: CK };
const taxon = (id, over = {}) => ({ taxonID: id, scientificName: `Name ${id}`, taxonRank: 'SPECIES', taxonomicStatus: 'ACCEPTED', ...over });

async function withRoutes(routes, run) {
  clearCache();
  const realFetch = globalThis.fetch;
  const log = [];
  globalThis.fetch = async (url) => {
    const u = new URL(url);
    log.push(u);
    const body = routes(u);
    return body === undefined ? { ok: false, status: 404 } : { ok: true, json: async () => body, headers: new Map() };
  };
  try {
    return await run(log);
  } finally {
    globalThis.fetch = realFetch;
    clearCache();
  }
}

test('every non-accepted status resolves to the accepted taxon, not just SYNONYM', async () => {
  const detail = {
    SYN: taxon('SYN', { taxonomicStatus: 'SYNONYM', acceptedNameUsageID: 'ACC' }),
    AMB: taxon('AMB', { taxonomicStatus: 'AMBIGUOUS_SYNONYM', acceptedNameUsageID: 'ACC' }),
    MIS: taxon('MIS', { taxonomicStatus: 'MISAPPLIED', acceptedNameUsageID: 'ACC' }),
    HET: taxon('HET', { taxonomicStatus: 'HETEROTYPIC_SYNONYM', acceptedNameUsageID: 'ACC' }),
    ACC: taxon('ACC')
  };
  await withRoutes(
    (u) => {
      const m = /^\/v2\/taxon\/cl\/(\w+)$/.exec(u.pathname);
      if (m) return detail[m[1]];
      if (u.pathname.startsWith('/v2/taxon/tree/')) return [taxon('ACC')];
    },
    async () => {
      for (const key of ['SYN', 'AMB', 'MIS', 'HET']) {
        const result = await resolveTaxon({ ...base, taxonKey: key });
        assert.equal(result.isSynonym, true, key);
        assert.equal(result.target.key, 'ACC', key);
        assert.equal(result.usage.key, key, key);
      }
      assert.equal((await resolveTaxon({ ...base, taxonKey: 'ACC' })).isSynonym, false);
    }
  );
});

test('pointsToAccepted ignores a usage that points to itself', () => {
  assert.equal(pointsToAccepted({ key: 'A', acceptedKey: 'A' }), false);
  assert.equal(pointsToAccepted({ key: 'A' }), false);
  assert.equal(pointsToAccepted({ key: 'A', acceptedKey: 'B' }), true);
});

test('the v2 match vocabulary is accepted: EXACT, VARIANT, HIGHERRANK', () => {
  const m = (matchType, confidence = 95) => ({ usage: { key: 'K' }, diagnostics: { matchType, confidence } });
  for (const type of ['EXACT', 'VARIANT', 'HIGHERRANK']) assert.equal(isConfidentMatch(m(type)), true, type);
  assert.equal(isConfidentMatch(m('NONE')), false);
  assert.equal(isConfidentMatch(m('EXACT', 79)), false);
  assert.equal(isConfidentMatch(m('SOMETHING_NEW')), false);
});

test('a spelling variant is resolved, and the match type is reported', async () => {
  await withRoutes(
    (u) => {
      if (u.pathname === '/v2/species/match') return { usage: { key: 'K' }, diagnostics: { matchType: 'VARIANT', confidence: 95 } };
      if (u.pathname === '/v2/taxon/cl/K') return taxon('K');
      if (u.pathname.startsWith('/v2/taxon/tree/')) return [taxon('K')];
    },
    async () => {
      const result = await resolveTaxon({ ...base, scientificName: 'Puma concolr' });
      assert.equal(result.found, true);
      assert.equal(result.matchType, 'VARIANT');
    }
  );
});

test('kingdom and rank are passed to the name match, and only then', async () => {
  await withRoutes(
    (u) => (u.pathname === '/v2/species/match' ? { diagnostics: { matchType: 'NONE' } } : undefined),
    async (log) => {
      await resolveTaxon({ ...base, scientificName: 'Ficus', kingdom: 'Plantae', rank: 'GENUS' });
      const params = log[0].searchParams;
      assert.equal(params.get('kingdom'), 'Plantae');
      assert.equal(params.get('rank'), 'GENUS');
      assert.equal(params.get('checklistKey'), CK);

      await resolveTaxon({ ...base, scientificName: 'Ficus' });
      assert.equal(log[1].searchParams.has('kingdom'), false);
    }
  );
});

test('a response without a taxon id is not a taxon', async () => {
  await withRoutes(
    (u) => (u.pathname.startsWith('/v2/taxon/tree/') ? [] : {}),
    async () => assert.equal((await resolveTaxon({ ...base, taxonKey: 'X' })).found, false)
  );
});

test('classification entries that are not objects are skipped', async () => {
  await withRoutes(
    (u) => (u.pathname.startsWith('/v2/taxon/tree/') ? [null, 5, { taxonID: 'A', scientificName: 'A', taxonRank: 'KINGDOM' }, {}] : taxon('A')),
    async () => {
      const result = await resolveTaxon({ ...base, taxonKey: 'A' });
      assert.deepEqual(result.classification.map((c) => c.key), ['A']);
    }
  );
});

test('getChecklistInfo returns title and version, and null on failure', async () => {
  await withRoutes(
    () => ({ title: 'Catalogue of Life', version: '2026-10-16 XR', url: 'https://www.checklistbank.org/dataset/1', secret: 'x' }),
    async () => {
      const info = await getChecklistInfo(base);
      assert.deepEqual(info, { title: 'Catalogue of Life', version: '2026-10-16 XR', alias: undefined, url: 'https://www.checklistbank.org/dataset/1' });
    }
  );
  await withRoutes(() => undefined, async () => assert.equal(await getChecklistInfo(base), null));
});

/* ---------- Caching and timeouts ---------- */

class WatchedStorage {
  constructor() { this.touched = []; }
  getItem(key) { this.touched.push(['get', key]); return null; }
  setItem(key) { this.touched.push(['set', key]); }
  removeItem(key) { this.touched.push(['remove', key]); }
  key() { this.touched.push(['key']); return null; }
  get length() { this.touched.push(['length']); return 0; }
}

test('nothing is written to the host page\'s storage, whatever the API says about caching', async () => {
  clearCache();
  const realFetch = globalThis.fetch;
  const realSession = globalThis.sessionStorage;
  const realLocal = globalThis.localStorage;
  const session = new WatchedStorage();
  const local = new WatchedStorage();
  globalThis.sessionStorage = session;
  globalThis.localStorage = local;
  globalThis.fetch = async () => ({ ok: true, headers: { get: () => 'public, max-age=600' }, json: async () => ({ ok: 1 }) });
  try {
    await getJson('https://x.test/a');
    await postJson('https://x.test/b', { limit: 1 });
    assert.deepEqual(session.touched, []);
    assert.deepEqual(local.touched, []);
    // Within the page, the answer is remembered: the same request is not made again.
    let calls = 0;
    globalThis.fetch = async () => ({ ok: true, headers: { get: () => null }, json: async () => ({ calls: ++calls }) });
    await getJson('https://x.test/c');
    await getJson('https://x.test/c');
    assert.equal(calls, 1);
    clearMemoryCache(); // a new page view
    await getJson('https://x.test/c');
    assert.equal(calls, 2, 'a new page view asks again');
  } finally {
    globalThis.fetch = realFetch;
    globalThis.sessionStorage = realSession;
    globalThis.localStorage = realLocal;
    clearCache();
  }
});

test('a request that never answers ends in a timeout error, which is not remembered', async () => {
  clearCache();
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (url, { signal }) => {
    calls += 1;
    return new Promise((resolve, reject) => {
      if (calls === 1) signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      else resolve({ ok: true, headers: { get: () => null }, json: async () => ({ ok: true }) });
    });
  };
  setRequestTimeout(30);
  try {
    await assert.rejects(getJson('https://x.test/hang'), (err) => err instanceof GbifApiError && /timed out/i.test(err.message) && err.url === 'https://x.test/hang');
    assert.deepEqual(await getJson('https://x.test/hang'), { ok: true }, 'the failure was not cached');
  } finally {
    setRequestTimeout(15000);
    globalThis.fetch = realFetch;
    clearCache();
  }
});

test('a 429 or 503 is tried again, up to twice; other failures are not', async () => {
  clearCache();
  const realFetch = globalThis.fetch;
  setRetryDelay(5);
  const run = async (statuses) => {
    let calls = 0;
    globalThis.fetch = async () => {
      const status = statuses[Math.min(calls, statuses.length - 1)];
      calls += 1;
      return status === 200 ? { ok: true, headers: { get: () => null }, json: async () => ({ ok: calls }) } : { ok: false, status };
    };
    clearCache();
    const result = await getJson(`https://x.test/retry-${statuses.join('-')}`).then((data) => ({ data }), (error) => ({ error }));
    return { ...result, calls };
  };
  try {
    assert.deepEqual(await run([429, 200]), { data: { ok: 2 }, calls: 2 }, '429 then success');
    assert.deepEqual(await run([503, 200]), { data: { ok: 2 }, calls: 2 }, '503 then success');
    assert.deepEqual(await run([429, 429, 200]), { data: { ok: 3 }, calls: 3 }, 'two turned away, the third gets through');
    const thrice = await run([429, 429, 429, 200]);
    assert.equal(thrice.calls, 3, 'one try and two retries, no more');
    assert.equal(thrice.error.status, 429);
    const missing = await run([404, 200]);
    assert.equal(missing.calls, 1, 'a 404 is not retried');
    assert.equal(missing.error.status, 404);
    assert.equal((await run([500, 200])).calls, 1, 'a 500 is not retried');

    // No answer a browser can read (a dropped connection, or a 429 without CORS headers): tried again.
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      if (calls === 1) throw new TypeError('Failed to fetch');
      return { ok: true, headers: { get: () => null }, json: async () => ({ ok: calls }) };
    };
    clearCache();
    assert.deepEqual(await getJson('https://x.test/network'), { ok: 2 });
    assert.equal(calls, 2);

    // A timeout has waited long enough already.
    calls = 0;
    setRequestTimeout(20);
    globalThis.fetch = (url, { signal }) => {
      calls += 1;
      return new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
    };
    clearCache();
    await assert.rejects(getJson('https://x.test/slow'), (err) => err.timedOut === true);
    assert.equal(calls, 1, 'not retried');
    setRequestTimeout(15000);
  } finally {
    setRetryDelay(1200);
    globalThis.fetch = realFetch;
    clearCache();
  }
});

test('at most four requests are in flight at once, and all of them are answered', async () => {
  clearCache();
  const realFetch = globalThis.fetch;
  let inFlight = 0;
  let peak = 0;
  globalThis.fetch = async () => {
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 15));
    inFlight -= 1;
    return { ok: true, headers: { get: () => null }, json: async () => ({ ok: true }) };
  };
  try {
    const answers = await Promise.all(Array.from({ length: 20 }, (_, i) => getJson(`https://x.test/burst-${i}`)));
    assert.equal(answers.length, 20);
    assert.ok(answers.every((a) => a.ok));
    assert.equal(peak, 4, `peak was ${peak}`);
  } finally {
    globalThis.fetch = realFetch;
    clearCache();
  }
});

test('waiting for a turn does not count against a request\'s time limit', async () => {
  clearCache();
  const realFetch = globalThis.fetch;
  setRequestTimeout(60);
  globalThis.fetch = (url, { signal }) =>
    // Like a real fetch, it gives up when told to.
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve({ ok: true, headers: { get: () => null }, json: async () => ({ ok: true }) }), 40);
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('aborted', 'AbortError'));
      });
    });
  try {
    // Twelve requests of 40 ms through four turns take about 120 ms, so the last ones wait well over
    // the 60 ms limit. If the clock started when they were asked for, they would time out.
    const answers = await Promise.all(Array.from({ length: 12 }, (_, i) => getJson(`https://x.test/queued-${i}`)));
    assert.equal(answers.length, 12);
  } finally {
    setRequestTimeout(15000);
    globalThis.fetch = realFetch;
    clearCache();
  }
});

test('requests beyond the limit wait in the order they were asked, and a retry waits longer each time', async () => {
  clearCache();
  const realFetch = globalThis.fetch;
  try {
    const started = [];
    const finish = [];
    globalThis.fetch = (url) => new Promise((resolve) => {
      started.push(url);
      finish.push(() => resolve({ ok: true, status: 200, headers: { get: () => null }, json: async () => ({}) }));
    });
    const urls = Array.from({ length: 8 }, (_, i) => `https://q.test/${i}`);
    const all = urls.map((u) => getJson(u));
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(started, urls.slice(0, 4), 'four at a time');
    finish.slice(0, 4).forEach((f) => f());
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(started.slice(4), urls.slice(4), 'the rest start first come, first served');
    finish.slice(4).forEach((f) => f());
    await Promise.all(all);

    // The pause before each retry doubles.
    clearCache();
    setRetryDelay(40);
    const times = [];
    let headers;
    globalThis.fetch = async (url, init) => {
      times.push(Date.now());
      headers = init.headers;
      return { ok: false, status: 429, headers: { get: () => null }, json: async () => ({}) };
    };
    await assert.rejects(getJson('https://q.test/retry'), (e) => e.status === 429);
    assert.equal(times.length, 3, 'tried again twice');
    assert.ok(times[2] - times[1] > times[1] - times[0], `the second pause (${times[2] - times[1]} ms) is longer than the first (${times[1] - times[0]} ms)`);
    assert.equal(headers.Accept, 'application/json');
  } finally {
    setRetryDelay(1200);
    globalThis.fetch = realFetch;
    clearCache();
  }
});
