import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import { md5 } from '../../src/shared/md5.js';
import {
  FILTERS,
  normalizeFilter,
  normalizeQuery,
  mergeQuery,
  sameQuery,
  toParams,
  readUrlQuery,
  writeUrlQuery,
  countryName,
  filterProblem
} from '../../src/shared/filters.js';
import {
  COLUMNS,
  DEFAULT_COLUMNS,
  MAX_RESULTS,
  parseColumns,
  cellText,
  firstImage,
  thumbnailUrl,
  dateLabel,
  basisLabel,
  recordLicenseLabel,
  searchOccurrences,
  fetchFacets
} from '../../src/shared/occurrence.js';
import { clearCache } from '../../src/shared/api.js';

/* ---------- MD5 (names images for GBIF's image cache) ---------- */

test('md5 agrees with Node for short, long and padding-boundary strings', () => {
  const samples = ['', 'a', 'abc', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(63), 'x'.repeat(64), 'x'.repeat(65), 'x'.repeat(1000), 'Zürich ñ 日本語 🐆'];
  for (const text of samples) assert.equal(md5(text), crypto.createHash('md5').update(text).digest('hex'), JSON.stringify(text.slice(0, 20)));
});

test('md5 gives the name GBIF itself accepted for a real image', () => {
  // Checked against api.gbif.org: this image URL, under this occurrence, is served by the image cache.
  assert.equal(md5('https://inaturalist-open-data.s3.amazonaws.com/photos/604954105/original.jpg'), 'e6f3eeb32287d2908e6ed9ca197646c3');
});

/* ---------- filters ---------- */

test('country: two known letters, upper-cased; anything else is dropped', () => {
  assert.deepEqual(normalizeFilter('country', 'no'), ['NO']);
  assert.deepEqual(normalizeFilter('country', ['no', 'SE', 'no']), ['NO', 'SE']);
  assert.deepEqual(normalizeFilter('country', 'NO,SE'), ['NO', 'SE']);
  for (const bad of ['XX', 'NOR', '1', '', null, undefined, {}, [], ['XX', 'ZZ']]) assert.equal(normalizeFilter('country', bad), undefined, JSON.stringify(bad));
  assert.deepEqual(normalizeFilter('country', ['XX', 'NO']), ['NO'], 'a bad value does not spoil a good one');
});

test('countryName gives an English name and falls back to the code', () => {
  assert.equal(countryName('NO'), 'Norway');
  assert.equal(countryName('US'), 'United States');
  assert.equal(typeof countryName('ZZ'), 'string');
});

test('year: single years, ranges, open ranges, and reversed ranges are put right', () => {
  const y = (v) => normalizeFilter('year', v);
  assert.equal(y('2000'), '2000');
  assert.equal(y(2000), '2000');
  assert.equal(y('2000,2020'), '2000,2020');
  assert.equal(y('2000-2020'), '2000,2020');
  assert.equal(y('2000 – 2020'), '2000,2020');
  assert.equal(y('2020,2000'), '2000,2020', 'the API answers a reversed range with an error');
  assert.equal(y('2000,*'), '2000,*');
  assert.equal(y('*,1990'), '*,1990');
  assert.equal(y('007'), '7');
  for (const bad of ['abc', '*', '*,*', '1,2,3', '20000', '', ' ', null, undefined, {}, '-5', '2000,abc']) assert.equal(y(bad), undefined, JSON.stringify(bad));
});

test('basis of record and record licence: only known values, any case', () => {
  assert.deepEqual(normalizeFilter('basisOfRecord', ['human_observation', 'PRESERVED_SPECIMEN', 'nonsense']), ['HUMAN_OBSERVATION', 'PRESERVED_SPECIMEN']);
  assert.deepEqual(normalizeFilter('license', 'cc_by_4_0,CC0_1_0'), ['CC_BY_4_0', 'CC0_1_0']);
  assert.equal(normalizeFilter('license', 'GPL'), undefined);
});

test('text and flag filters', () => {
  assert.equal(normalizeFilter('q', '  jaguar  '), 'jaguar');
  assert.equal(normalizeFilter('q', '   '), undefined);
  assert.equal(normalizeFilter('q', 5), undefined);
  assert.equal(normalizeFilter('q', 'x'.repeat(500)).length, 200);
  assert.equal(normalizeFilter('hasCoordinate', true), true);
  assert.equal(normalizeFilter('hasCoordinate', 'true'), true);
  for (const off of [false, 'false', '', null, undefined, 0, 'yes']) assert.equal(normalizeFilter('hasCoordinate', off), undefined, String(off));
});

test('unknown filter names are ignored, including ones that look like built-ins', () => {
  assert.equal(normalizeFilter('taxonKey', 'X'), undefined);
  assert.equal(normalizeFilter('constructor', 'X'), undefined);
  assert.equal(normalizeFilter('__proto__', 'X'), undefined);
  assert.deepEqual(normalizeQuery({ country: 'NO', evil: '1', toString: 'x', limit: 5 }), { country: ['NO'] });
  assert.deepEqual(mergeQuery({}, { hasOwnProperty: 'x', __proto__: { country: 'NO' } }), {});
});

test('mergeQuery adds, replaces and removes; sameQuery ignores order', () => {
  let q = mergeQuery({}, { country: 'NO', year: '2000,2010' });
  assert.deepEqual(q, { country: ['NO'], year: '2000,2010' });
  q = mergeQuery(q, { country: ['NO', 'SE'], q: 'puma' });
  assert.deepEqual(q, { country: ['NO', 'SE'], year: '2000,2010', q: 'puma' });
  q = mergeQuery(q, { year: null, q: '', country: [] });
  assert.deepEqual(q, {}, 'null, empty text and an empty list all remove a filter');
  assert.equal(sameQuery({ a: 1, b: 2 }, { b: 2, a: 1 }), true);
  assert.equal(sameQuery({ country: ['NO'] }, { country: ['SE'] }), false);
});

test('toParams: arrays stay lists, flags become "true"', () => {
  assert.deepEqual(toParams({ country: ['NO', 'SE'], hasCoordinate: true, year: '2000,*', q: 'x' }), { country: ['NO', 'SE'], hasCoordinate: 'true', year: '2000,*', q: 'x' });
});

test('a query survives a trip through a URL, with a prefix, leaving other parameters alone', () => {
  const query = { country: ['NO', 'SE'], year: '2000,*', basisOfRecord: ['HUMAN_OBSERVATION'], hasCoordinate: true, q: 'puma concolor' };
  const url = new URL('https://site.example/page?keep=1&gbif_country=OLD#section');
  writeUrlQuery(url, query, 'gbif_');
  assert.equal(url.searchParams.get('keep'), '1');
  assert.deepEqual(url.searchParams.getAll('gbif_country'), ['NO', 'SE'], 'the old value is replaced');
  assert.equal(url.hash, '#section');
  assert.deepEqual(readUrlQuery(url.searchParams, 'gbif_'), query);
  assert.deepEqual(readUrlQuery(url.searchParams, 'other_'), {}, 'another prefix sees nothing');
  writeUrlQuery(url, {}, 'gbif_');
  assert.equal(url.search, '?keep=1', 'an empty query removes its parameters, and only its own');
});

test('junk in a URL is dropped, not sent to the API', () => {
  const params = new URLSearchParams('gbif_country=XX&gbif_country=no&gbif_year=abc&gbif_hasCoordinate=yes&gbif_q=%20%20&gbif_license=GPL&gbif_basisOfRecord=OBSERVATION');
  assert.deepEqual(readUrlQuery(params, 'gbif_'), { country: ['NO'], basisOfRecord: ['OBSERVATION'] });
});

test('every filter has what the panel needs', () => {
  for (const [key, filter] of Object.entries(FILTERS)) {
    assert.ok(filter.label && typeof filter.normalize === 'function' && ['multi', 'range', 'text', 'flag'].includes(filter.type), key);
    if (filter.type === 'multi') assert.ok(filter.facet, `${key} needs a facet name`);
  }
});

/* ---------- occurrence helpers ---------- */

test('columns: chosen from a fixed list, in order, with a default', () => {
  assert.deepEqual(parseColumns(undefined), DEFAULT_COLUMNS);
  assert.deepEqual(parseColumns(''), DEFAULT_COLUMNS);
  assert.deepEqual(parseColumns('year, country scientificName country'), ['year', 'country', 'scientificName']);
  assert.deepEqual(parseColumns('nope, __proto__, constructor'), DEFAULT_COLUMNS, 'unknown names are ignored');
  assert.deepEqual(parseColumns('nope,year'), ['year']);
});

test('cells are always strings, whatever the API sent', () => {
  const hostile = { scientificName: { x: 1 }, country: 42, eventDate: ['2000'], year: '2000', basisOfRecord: null, recordedBy: {}, datasetName: undefined, institutionCode: 5, catalogNumber: 'A1', license: 7 };
  for (const column of Object.keys(COLUMNS)) assert.equal(typeof cellText(column, hostile), 'string', column);
  assert.equal(cellText('eventDate', { eventDate: '2026-01-02T12:30:25' }), '2026-01-02');
  assert.equal(cellText('basisOfRecord', { basisOfRecord: 'HUMAN_OBSERVATION' }), 'Human observation');
  assert.equal(cellText('institution', { institutionCode: 'FMNH', catalogNumber: '50048' }), 'FMNH 50048');
  assert.equal(cellText('license', { license: 'http://creativecommons.org/licenses/by-nc/4.0/legalcode' }), 'CC BY-NC 4.0');
  assert.equal(cellText('scientificName', { scientificName: '<img src=x onerror=alert(1)>' }), '<img src=x onerror=alert(1)>', 'text stays text; Lit escapes it when it is drawn');
});

test('label helpers', () => {
  assert.equal(dateLabel('1940-01-03'), '1940-01-03');
  assert.equal(dateLabel('1940'), '1940');
  assert.equal(dateLabel(null), '');
  assert.equal(basisLabel('PRESERVED_SPECIMEN'), 'Preserved specimen');
  assert.equal(basisLabel(undefined), '');
  assert.equal(recordLicenseLabel('CC_BY_NC_4_0'), 'CC BY-NC 4.0');
  assert.equal(recordLicenseLabel('CC0_1_0'), 'CC0 1.0');
  assert.equal(recordLicenseLabel('javascript:alert(1)'), '');
  assert.equal(MAX_RESULTS, 100000);
});

test('firstImage: the first usable still image, credited, from untrusted media', () => {
  const row = {
    key: 5938145577,
    scientificName: 'Puma concolor',
    country: 'Chile',
    media: [
      null,
      { type: 'Sound', identifier: 'https://x.org/a.mp3' },
      { type: 'StillImage', identifier: 'javascript:alert(1)' },
      { type: 'StillImage', identifier: 'https://img.example/1.jpg', license: 'http://creativecommons.org/licenses/by/4.0/', creator: 'Ana', rightsHolder: '  ' },
      { type: 'StillImage', identifier: 'https://img.example/2.jpg' }
    ]
  };
  const image = firstImage(row);
  assert.equal(image.identifier, 'https://img.example/1.jpg');
  assert.equal(image.occurrenceKey, '5938145577');
  assert.equal(image.rightsHolder, 'Ana', 'a blank rights holder falls back to the creator');
  assert.equal(image.licenseKey, 'cc-by');
  assert.equal(image.name, 'Puma concolor');
  assert.equal(firstImage({ key: 1, media: [{ type: 'StillImage', identifier: 'ftp://x/y.jpg' }] }), null);
  assert.equal(firstImage({ key: 1 }), null);
  assert.equal(firstImage({ key: 1, media: 'not a list' }), null);
  assert.equal(firstImage(null), null);
  const none = firstImage({ key: 2, media: [{ type: 'StillImage', identifier: 'https://img.example/3.jpg', license: { not: 'a string' } }] });
  assert.equal(none.license, null);
  assert.equal(none.licenseKey, 'unknown');
});

test('thumbnailUrl names the image as GBIF\'s image cache expects', () => {
  assert.equal(
    thumbnailUrl({ apiBase: 'https://api.gbif.org', occurrenceKey: '5938145577', identifier: 'https://inaturalist-open-data.s3.amazonaws.com/photos/604954105/original.jpg' }),
    'https://api.gbif.org/v1/image/cache/fit-in/400x/occurrence/5938145577/media/e6f3eeb32287d2908e6ed9ca197646c3'
  );
  assert.equal(
    thumbnailUrl({ apiBase: 'https://example.org/proxy', occurrenceKey: '1', identifier: 'https://x/y.jpg', width: 200 }).startsWith('https://example.org/proxy/v1/image/cache/fit-in/200x/occurrence/1/media/'),
    true,
    'works through a proxy path'
  );
});

async function withFetch(body, run) {
  clearCache();
  const realFetch = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(new URL(url));
    return { ok: true, headers: { get: () => null }, json: async () => body };
  };
  try {
    return await run(urls);
  } finally {
    globalThis.fetch = realFetch;
    clearCache();
  }
}

test('searchOccurrences sends the filters, the page, and survives odd responses', async () => {
  await withFetch({ count: 7, results: [{ key: 1 }, null, 'x', { key: 2 }] }, async (urls) => {
    const page = await searchOccurrences({ apiBase: 'https://api.test', params: { taxonKey: 'K', country: ['NO', 'SE'], year: '2000,*' }, limit: 20, offset: 40 });
    assert.deepEqual(page, { count: 7, results: [{ key: 1 }, { key: 2 }] });
    const q = urls[0].searchParams;
    assert.equal(urls[0].pathname, '/v1/occurrence/search');
    assert.deepEqual(q.getAll('country'), ['NO', 'SE']);
    assert.equal(q.get('year'), '2000,*');
    assert.equal(q.get('limit'), '20');
    assert.equal(q.get('offset'), '40');
  });
  await withFetch(null, async () => assert.deepEqual(await searchOccurrences({ apiBase: 'https://api.test', params: {}, limit: 1, offset: 0 }), { count: 0, results: [] }));
});

test('the last page GBIF allows is trimmed, so offset + limit never passes the cap', async () => {
  await withFetch({ count: 2268126852, results: [] }, async (urls) => {
    // 24 a page: the last page starts at 99,984, and 99,984 + 24 would be a 400 from the API.
    await searchOccurrences({ apiBase: 'https://api.test', params: {}, limit: 24, offset: 99984 });
    await searchOccurrences({ apiBase: 'https://api.test', params: {}, limit: 24, offset: 0 });
    await searchOccurrences({ apiBase: 'https://api.test', params: {}, limit: 20, offset: 99980 });
    const [last, first, exact] = urls.map((u) => [Number(u.searchParams.get('offset')), Number(u.searchParams.get('limit'))]);
    assert.deepEqual(last, [99984, 16]);
    assert.equal(last[0] + last[1], MAX_RESULTS);
    assert.deepEqual(first, [0, 24], 'ordinary pages are untouched');
    assert.deepEqual(exact, [99980, 20]);
  });
});

test('fetchFacets asks for counts that ignore a filter\'s own choice, and cleans the answer', async () => {
  const body = { count: 100, facets: [{ field: 'COUNTRY', counts: [{ name: 'NO', count: 5 }, { name: 7, count: 1 }, null, { name: 'SE', count: 'x' }] }, { field: 'LICENSE' }, null] };
  await withFetch(body, async (urls) => {
    const result = await fetchFacets({ apiBase: 'https://api.test', params: { taxonKey: 'K', country: 'NO' }, facets: ['COUNTRY', 'LICENSE'], facetLimit: 15 });
    assert.deepEqual(result, { count: 100, facets: { COUNTRY: [{ name: 'NO', count: 5 }], LICENSE: [] } });
    const q = urls[0].searchParams;
    assert.equal(q.get('limit'), '0');
    assert.deepEqual(q.getAll('facet'), ['COUNTRY', 'LICENSE']);
    assert.equal(q.get('facetMultiselect'), 'true');
    assert.equal(q.get('facetMincount'), '1');
    assert.equal(q.get('facetLimit'), '15');
  });
});

test('countries are the ones GBIF accepts, not whatever ISO or Intl knows', () => {
  // Checked live: GBIF answers country=UK and country=EU with 400, and country=XZ (international waters) with 200.
  for (const code of ['UK', 'EU', 'UN', 'AN', 'CS', 'YU', 'EA', 'IC', 'XX', 'ZZ']) {
    assert.equal(normalizeFilter('country', code), undefined, `${code} is refused`);
  }
  for (const code of ['NO', 'XK', 'XZ', 'GB', 'US', 'TF']) {
    assert.deepEqual(normalizeFilter('country', code.toLowerCase()), [code], `${code} is accepted`);
  }
  assert.equal(countryName('XZ'), 'International waters');
  assert.equal(countryName('NO'), 'Norway');
});

test('filterProblem says when a filter the page author gave would be dropped', () => {
  assert.equal(filterProblem('country', undefined), undefined, 'not given');
  assert.equal(filterProblem('country', '  '), undefined, 'blank is not given');
  assert.equal(filterProblem('country', 'NO SE'), undefined);
  assert.match(filterProblem('country', 'XX'), /Country: "XX"/);
  assert.match(filterProblem('country', 'NO XX'), /"XX"/, 'one bad value among good ones is still a mistake');
  assert.match(filterProblem('basisOfRecord', 'PRESERVED SPECIMEN'), /"PRESERVED", "SPECIMEN"/);
  assert.equal(filterProblem('basisOfRecord', 'PRESERVED_SPECIMEN human_observation'), undefined);
  assert.match(filterProblem('year', 'abc'), /Year/);
  assert.match(filterProblem('year', '*,*'), /Year/);
  assert.equal(filterProblem('year', '2000-2010'), undefined);
  assert.equal(filterProblem('hasCoordinate', false), undefined);
  assert.equal(filterProblem('nonsense', 'x'), undefined);
});

test('year ranges take an open start as well as an open end', () => {
  assert.equal(normalizeFilter('year', '*-2000'), '*,2000');
  assert.equal(normalizeFilter('year', '2000-*'), '2000,*');
  assert.equal(normalizeFilter('year', '2010-2000'), '2000,2010');
});

test('free text is cut by characters, never in the middle of one', () => {
  const q = normalizeFilter('q', '😀'.repeat(300));
  assert.equal([...q].length, 200);
  assert.equal(q, '😀'.repeat(200));
});

test('writing the address leaves other parameters exactly as they were written', () => {
  const url = new URL('https://site.example/p?gbif_country=UK&ref=a%20b&flag&semi=a;b&x=%E2%9C%93&gbif_year=1999&last=1#h');
  writeUrlQuery(url, { country: ['NO'] }, 'gbif_');
  assert.equal(url.search, '?ref=a%20b&flag&semi=a;b&x=%E2%9C%93&last=1&gbif_country=NO');
  writeUrlQuery(url, {}, 'gbif_');
  assert.equal(url.search, '?ref=a%20b&flag&semi=a;b&x=%E2%9C%93&last=1');
  assert.equal(url.hash, '#h');
  // Another search's parameters (a different prefix) are not ours to remove.
  const two = new URL('https://site.example/p?b_country=SE&gbif_country=NO');
  writeUrlQuery(two, {}, 'gbif_');
  assert.equal(two.search, '?b_country=SE');
});
