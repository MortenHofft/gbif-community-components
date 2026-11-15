/**
 * Component behaviour tests in a real browser, against a STUBBED GBIF API.
 *
 * Unlike smoke.cjs this needs no network and does not depend on live data, so it
 * can reproduce edge cases on demand: races, failures, timeouts, hostile data,
 * hostile host-page CSS. Needs Playwright to be resolvable and a Chromium.
 *
 *   npm run test:browser:components
 */
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const PORT = 5198;
const PAGE_URL = `http://127.0.0.1:${PORT}/test/browser/fixture.html`;
const CK = '7ddf754f-d193-4cc9-b351-99906754a03b';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ---------- fixtures ---------- */

const taxon = (id, name, rank, extra = {}) => ({
  taxonID: id,
  scientificName: name,
  taxonRank: rank,
  label: `<i>${name}</i>`,
  taxonomicStatus: 'ACCEPTED',
  ...extra
});
const KINGDOM = taxon('N', 'Animalia', 'KINGDOM');
const FAMILY = taxon('623RM', 'Felidae', 'FAMILY', { parentNameUsageID: 'N' });
const PUMA = taxon('4QHKG', 'Puma concolor', 'SPECIES', { parentNameUsageID: '623RM', scientificNameAuthorship: '(Linnaeus, 1771)', label: '<i>Puma concolor</i> (Linnaeus, 1771)' });
const TAXA = {
  '4QHKG': PUMA,
  '623RM': FAMILY,
  MIS1: taxon('MIS1', 'Puma wrongus', 'SPECIES', { taxonomicStatus: 'MISAPPLIED', acceptedNameUsageID: '4QHKG' }),
  FIC1: taxon('FIC1', 'Ficus', 'GENUS', { parentNameUsageID: 'N' }),
  XSS1: taxon('XSS1', 'Xss', 'SPECIES', { label: '<i>Xss</i><img src=x onerror="window.__xss=1"><script>window.__xss=2</script>' })
};
const TREES = {
  '4QHKG': [KINGDOM, FAMILY, PUMA],
  '623RM': [KINGDOM, FAMILY],
  MIS1: [KINGDOM, FAMILY, PUMA],
  FIC1: [KINGDOM, TAXA.FIC1],
  XSS1: [KINGDOM, TAXA.XSS1]
};
const MATCHES = {
  'Puma concolor': { key: '4QHKG', type: 'EXACT', confidence: 99 },
  'Puma concolr': { key: '4QHKG', type: 'VARIANT', confidence: 95 },
  'Puma concolor concolor': { key: '4QHKG', type: 'HIGHERRANK', confidence: 99 },
  Ficus: { kingdom: 'Plantae', key: 'FIC1', type: 'EXACT', confidence: 95 }
};
const CC = 'http://creativecommons.org/licenses';
const image = (n, license = `${CC}/by/4.0/`, extra = {}) => ({ identifier: `https://img.test/${n}.png`, occurrenceKey: 100 + n, rightsHolder: `Holder ${n}`, license, ...extra });

/* A small occurrence dataset the stub can filter, facet and page like the real API does. */
const OCC_COUNTRIES = [['NO', 'Norway'], ['SE', 'Sweden'], ['US', 'United States of America'], ['CL', 'Chile']];
const OCC_BASES = ['HUMAN_OBSERVATION', 'PRESERVED_SPECIMEN', 'MACHINE_OBSERVATION'];
const OCC_LICENSES = ['CC0_1_0', 'CC_BY_4_0', 'CC_BY_NC_4_0'];
const OCC_LICENSE_URL = {
  CC0_1_0: 'http://creativecommons.org/publicdomain/zero/1.0/legalcode',
  CC_BY_4_0: 'http://creativecommons.org/licenses/by/4.0/legalcode',
  CC_BY_NC_4_0: 'http://creativecommons.org/licenses/by-nc/4.0/legalcode'
};
function makeRecords() {
  const imageLicenses = [`${CC}/by/4.0/`, `${CC}/by-nc/4.0/`, 'http://creativecommons.org/publicdomain/zero/1.0/'];
  return Array.from({ length: 60 }, (_, i) => {
    const [countryCode, country] = OCC_COUNTRIES[i % 4];
    return {
      key: 2000 + i,
      scientificName: `Puma concolor ${i}`,
      country,
      countryCode,
      eventDate: `${1990 + (i % 30)}-05-0${1 + (i % 9)}T10:00:00`,
      year: 1990 + (i % 30),
      basisOfRecord: OCC_BASES[i % 3],
      datasetName: `Dataset ${i % 2}`,
      institutionCode: 'INST',
      catalogNumber: String(i),
      recordedBy: `Collector ${i % 5}`,
      license: OCC_LICENSE_URL[OCC_LICENSES[(i >> 1) % 3]],
      _license: OCC_LICENSES[(i >> 1) % 3],
      _hasCoordinate: i % 2 === 0,
      media: i % 3 === 0 ? [{ type: 'StillImage', identifier: `https://img.test/occ-${i}.png`, license: imageLicenses[((i / 3) | 0) % 3], rightsHolder: `Photographer ${i}` }] : []
    };
  });
}
const FACET_FIELD = { COUNTRY: ['country', (r) => r.countryCode], BASIS_OF_RECORD: ['basisOfRecord', (r) => r.basisOfRecord], LICENSE: ['license', (r) => r._license] };

/** Why GBIF would answer this query with a 400, or null. */
function invalidQuery(q) {
  for (const c of q.getAll('country')) if (!['NO', 'SE', 'US', 'CL', 'AR', 'DK'].includes(c)) return `Cannot parse ${c} into a known Country`;
  for (const b of q.getAll('basisOfRecord')) if (!['HUMAN_OBSERVATION', 'PRESERVED_SPECIMEN', 'MACHINE_OBSERVATION', 'OCCURRENCE', 'OBSERVATION'].includes(b)) return `bad basisOfRecord ${b}`;
  for (const l of q.getAll('license')) if (!OCC_LICENSES.includes(l)) return `bad license ${l}`;
  const year = q.get('year');
  if (year !== null) {
    const m = /^(\*|\d+)(?:,(\*|\d+))?$/.exec(year);
    if (!m) return `Invalid integer range: ${year}`;
    if (m[2] && m[1] !== '*' && m[2] !== '*' && Number(m[1]) > Number(m[2])) return `Invalid range: (${year})`;
  }
  return null;
}

function matchesQuery(rec, q, skip) {
  const any = (name, value) => !q.getAll(name).length || skip === name || q.getAll(name).includes(value);
  if (!any('country', rec.countryCode) || !any('basisOfRecord', rec.basisOfRecord) || !any('license', rec._license)) return false;
  const year = q.get('year');
  if (year && skip !== 'year') {
    const [from, to] = year.split(',');
    if (from !== '*' && rec.year < Number(from)) return false;
    if ((to ?? from) !== '*' && rec.year > Number(to ?? from)) return false;
  }
  if (q.get('hasCoordinate') === 'true' && !rec._hasCoordinate) return false;
  const text = q.get('q');
  if (text && !`${rec.scientificName} ${rec.recordedBy}`.toLowerCase().includes(text.toLowerCase())) return false;
  if (q.get('mediaType') === 'StillImage' && !rec.media.length) return false;
  return true;
}

function freshState() {
  return {
    records: makeRecords(),
    searchHook: null, // async (query) => ({ status, body, delay }) | undefined
    thumbnails: 'ok', // 'ok' | 'missing' (404) | 'broken' (404, and the original fails too)
    images: [image(1), image(2), image(3, `${CC}/by-nc/4.0/`), image(4, `${CC}/by-nc-nd/4.0/`), image(5, 'http://creativecommons.org/publicdomain/zero/1.0/')],
    types: Array.from({ length: 23 }, (_, i) => ({ key: 1000 + i, typeStatus: 'Holotype', scientificName: `Puma concolor ${i}`, country: 'Chile', eventDate: '1940-01-03', institutionCode: 'FMNH', catalogNumber: String(i) })),
    failTypeOffsets: new Set(),
    hangDetail: false,
    multimediaDelay: 0,
    mapTotal: 100
  };
}

/* ---------- the stubbed network ---------- */

async function installStubs(page, S) {
  const requests = [];
  page.requests = requests;
  const json = (route, body, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });

  const occurrenceSearch = async (route, q) => {
    if (S.searchHook) {
      const hooked = await S.searchHook(q);
      if (hooked?.delay) await sleep(hooked.delay);
      if (hooked?.status) return route.fulfill({ headers: { 'access-control-allow-origin': '*' }, status: hooked.status, body: hooked.body ?? 'error' });
    }
    const bad = invalidQuery(q);
    if (bad) {
      (page.badRequests ??= []).push(route.request().url());
      return route.fulfill({ headers: { 'access-control-allow-origin': '*' }, status: 400, body: bad });
    }
    const matching = S.records.filter((r) => matchesQuery(r, q));
    const strip = ({ _license, _hasCoordinate, ...rest }) => rest;
    const offset = Number(q.get('offset') || 0);
    const limit = Number(q.get('limit') || 20);
    const facets = q.getAll('facet').map((name) => {
      const [filterName, pick] = FACET_FIELD[name] ?? [];
      const counts = new Map();
      for (const r of S.records.filter((x) => matchesQuery(x, q, filterName))) counts.set(pick(r), (counts.get(pick(r)) ?? 0) + 1);
      const sorted = [...counts].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).slice(0, Number(q.get('facetLimit') || 10));
      return { field: name, counts: sorted.map(([n, c]) => ({ name: n, count: c })) };
    });
    return json(route, { count: matching.length, results: matching.slice(offset, offset + limit).map(strip), facets });
  };

  const api = async (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname.replace(/^\/gbif-proxy/, '');
    const q = url.searchParams;
    requests.push({ host: url.hostname, path: p, query: Object.fromEntries(q), full: url.href });

    if (p === '/v2/species/match') {
      const m = MATCHES[q.get('scientificName')];
      if (!m || (m.kingdom && m.kingdom !== q.get('kingdom'))) return json(route, { diagnostics: { matchType: 'NONE', note: 'Multiple equal matches' } });
      return json(route, { usage: { key: m.key }, diagnostics: { matchType: m.type, confidence: m.confidence } });
    }
    let m;
    if ((m = /^\/v2\/taxon\/tree\/[^/]+\/(\w+)$/.exec(p))) return TREES[m[1]] ? json(route, TREES[m[1]]) : route.fulfill({ headers: { 'access-control-allow-origin': '*' }, status: 404, body: 'nope' });
    if ((m = /^\/v2\/taxon\/checklist\/[^/]+$/.exec(p))) return json(route, { title: 'Catalogue of Life', version: '2026-10-16 XR', url: 'https://www.checklistbank.org/dataset/1' });
    if ((m = /^\/v2\/taxon\/[^/]+\/(\w+)$/.exec(p))) {
      if (S.hangDetail) return; // never answers
      return TAXA[m[1]] ? json(route, TAXA[m[1]]) : route.fulfill({ headers: { 'access-control-allow-origin': '*' }, status: 404, body: 'Taxon does not exist' });
    }
    if (p === '/v1/occurrence/search') {
      if (q.has('typeStatus')) {
        const offset = Number(q.get('offset') || 0);
        if (S.failTypeOffsets.has(offset)) return route.fulfill({ headers: { 'access-control-allow-origin': '*' }, status: 503, body: 'busy' });
        const limit = Number(q.get('limit'));
        return json(route, { count: S.types.length, results: S.types.slice(offset, offset + limit) });
      }
      return occurrenceSearch(route, q);
    }
    if (p.startsWith('/v1/occurrence/experimental/multimedia/species/')) {
      if (S.multimediaDelay) await sleep(S.multimediaDelay);
      return json(route, { count: S.images.length, results: S.images });
    }
    if (p === '/v2/map/occurrence/density/capabilities.json') return json(route, { total: S.mapTotal });
    if (p.startsWith('/v2/map/occurrence/density/')) return route.fulfill({ headers: { 'access-control-allow-origin': '*' }, status: 200, contentType: 'image/png', body: PNG });
    return route.fulfill({ headers: { 'access-control-allow-origin': '*' }, status: 404, body: 'unexpected stub request ' + p });
  };

  await page.route('https://api.gbif.org/**', api);
  await page.route('**/gbif-proxy/**', api);
  await page.route('https://tile.gbif.org/**', (route) => {
    const url = new URL(route.request().url());
    requests.push({ host: url.hostname, path: url.pathname, query: Object.fromEntries(url.searchParams), full: url.href });
    return route.fulfill({ headers: { 'access-control-allow-origin': '*' }, status: 200, contentType: 'image/png', body: PNG });
  });
  await page.route('https://img.test/**', (route) => {
    const url = new URL(route.request().url());
    requests.push({ host: url.hostname, path: url.pathname, query: {}, full: url.href });
    return S.thumbnails === 'broken' && /occ-/.test(url.pathname) ? route.fulfill({ headers: { 'access-control-allow-origin': '*' }, status: 404, body: 'gone' }) : route.fulfill({ headers: { 'access-control-allow-origin': '*' }, status: 200, contentType: 'image/png', body: PNG });
  });
  await page.route('https://api.gbif.org/v1/image/cache/**', (route) => {
    const url = new URL(route.request().url());
    requests.push({ host: url.hostname, path: url.pathname, query: {}, full: url.href });
    return S.thumbnails === 'ok' ? route.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: PNG }) : route.fulfill({ headers: { 'access-control-allow-origin': '*' }, status: 404, body: 'no thumbnail' });
  });
  await page.route('https://services.arcgisonline.com/**', (route) => {
    requests.push({ host: 'services.arcgisonline.com', path: '', query: {}, full: route.request().url() });
    return route.fulfill({ headers: { 'access-control-allow-origin': '*' }, status: 200, contentType: 'image/png', body: PNG });
  });
}

/* ---------- harness ---------- */

async function startServer() {
  const vite = path.resolve(__dirname, '../../node_modules/vite/bin/vite.js');
  const server = spawn(process.execPath, [vite, '--port', String(PORT), '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Vite did not start in time')), 30000);
    server.stdout.on('data', (chunk) => String(chunk).includes('Local') && (clearTimeout(timer), resolve()));
    server.on('exit', (code) => reject(new Error(`Vite exited early (${code})`)));
  });
  return server;
}

let browser;
async function newPage(S = freshState(), { width = 900, height = 900, init } = {}) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  page.S = S;
  page.errors = [];
  page.opened = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.warnings = [];
  page.on('console', (m) => m.type() === 'warning' && page.warnings.push(m.text()));
  if (init) await page.addInitScript(init);
  context.on('page', (p) => page.opened.push(p.url()));
  await page.addInitScript(() => {
    window.__events = [];
    for (const name of ['gbif-error', 'gbif-query-change', 'gbif-taxon-resolved', 'gbif-taxon-notfound', 'gbif-taxon-select', 'gbif-occurrence-select', 'gbif-occurrences-select', 'gbif-map-explore']) {
      document.addEventListener(name, (e) => window.__events.push({ name, detail: e.detail, tag: e.target.localName }));
    }
  });
  await installStubs(page, S);
  await page.goto(PAGE_URL);
  await page.waitForFunction(() => customElements.get('gbif-taxon-card') && customElements.get('gbif-occurrence-map'));
  page.mount = (markup) => page.evaluate((m) => (document.body.innerHTML = m), markup);
  page.events = (name) => page.evaluate((n) => window.__events.filter((e) => !n || e.name === n), name);
  return page;
}

/** Wait until the map element has a real Leaflet map on a canvas that is in the page. */
const mapReady = (page, selector = 'gbif-occurrence-map', timeout = 10000) =>
  page.waitForFunction(
    (sel) => {
      const map = document.querySelector(sel)?._map;
      return !!map && map.getContainer().isConnected && !!map.getContainer().querySelector('.leaflet-map-pane') && map.getSize().x > 100;
    },
    selector,
    { timeout }
  );

let step = 0;
const results = { passed: 0, failed: [] };
async function test(label, fn) {
  step += 1;
  // ONLY=<regex> runs just the matching tests (used to check that a test notices a regression).
  if (process.env.ONLY && !new RegExp(process.env.ONLY).test(label)) return;
  let page;
  try {
    await fn(async (...args) => (page = await newPage(...args)));
    results.passed += 1;
    console.log(`ok ${step} - ${label}`);
  } catch (error) {
    results.failed.push(label);
    console.log(`not ok ${step} - ${label}\n    ${String(error.message).split('\n').join('\n    ')}`);
  } finally {
    await page?.context().close();
  }
}
const T = { timeout: 10000 };

/* ---------- tests ---------- */

async function run() {
  /* The map */

  await test('map: survives being removed and added back (moved in the DOM)', async (make) => {
    const page = await make();
    await page.mount('<gbif-occurrence-map taxon-key="4QHKG"></gbif-occurrence-map>');
    await mapReady(page);
    await page.evaluate(() => {
      const el = document.querySelector('gbif-occurrence-map');
      window.__firstMap = el._map;
      el.remove();
      document.body.append(el);
    });
    await mapReady(page);
    assert.ok(await page.evaluate(() => document.querySelector('gbif-occurrence-map')._map !== window.__firstMap), 'a new map was built');
    assert.deepEqual(page.errors, []);
  });

  await test('map: is drawn even if the taxon changes while Leaflet is still downloading', async (make) => {
    const page = await make();
    await page.route(/\/leaflet[^/]*(\.js|\.css)?(\?|$)/, async (route) => {
      await sleep(1500);
      await route.continue();
    });
    await page.mount('<gbif-occurrence-map taxon-key="4QHKG"></gbif-occurrence-map>');
    await page.locator('gbif-occurrence-map .gbif-occurrence-map__canvas').waitFor(T);
    await page.evaluate(() => (document.querySelector('gbif-occurrence-map').taxonKey = '623RM'));
    await mapReady(page, 'gbif-occurrence-map', 15000);
  });

  await test('map: says so, and tells the page, when Leaflet cannot be loaded', async (make) => {
    const page = await make();
    await page.route(/\/leaflet[^/]*(\.js|\.css)?(\?|$)/, (route) => route.abort());
    await page.mount('<gbif-occurrence-map taxon-key="4QHKG"></gbif-occurrence-map>');
    await page.locator('gbif-occurrence-map [role=alert]').filter({ hasText: 'Could not load the occurrence map' }).waitFor(T);
    assert.ok((await page.events('gbif-error')).some((e) => e.tag === 'gbif-occurrence-map'));
  });

  await test('map: "Explore" sends the whole visible area across the antimeridian', async (make) => {
    const page = await make();
    await page.mount('<gbif-occurrence-map taxon-key="4QHKG"></gbif-occurrence-map>');
    await mapReady(page);
    await page.evaluate(() => {
      const el = document.querySelector('gbif-occurrence-map');
      el.addEventListener('gbif-map-explore', (e) => e.preventDefault());
      el._map.setView([0, 170], 2, { animate: false });
    });
    await page.locator('gbif-occurrence-map button', { hasText: 'Explore on GBIF.org' }).click();
    const [event] = await page.events('gbif-map-explore');
    assert.match(event.detail.geometry, /^MULTIPOLYGON/, event.detail.geometry);
    assert.ok(event.detail.bounds.east < event.detail.bounds.west, 'east is west of west once wrapped');
    assert.deepEqual(page.opened, [], 'cancelling the event stops the window opening');
  });

  await test('map: uses GBIF basemaps and never asks Esri', async (make) => {
    const page = await make();
    await page.mount('<gbif-occurrence-map taxon-key="4QHKG"></gbif-occurrence-map>');
    await page.locator('gbif-occurrence-map .leaflet-tile-loaded').first().waitFor(T);
    await page.locator('gbif-occurrence-map select').selectOption('dark');
    await sleep(600);
    const hosts = [...new Set(page.requests.map((r) => r.host))];
    assert.ok(!hosts.some((h) => /arcgisonline/.test(h)), `hosts: ${hosts}`);
    const styles = page.requests.filter((r) => r.host === 'tile.gbif.org').map((r) => r.query.style);
    assert.ok(styles.includes('gbif-light') && styles.includes('gbif-dark'), `styles: ${styles}`);
  });

  await test('map: a custom basemap-url replaces the GBIF basemaps (and the picker)', async (make) => {
    const page = await make();
    await page.route('https://tiles.example/**', (route) => route.fulfill({ headers: { 'access-control-allow-origin': '*' }, status: 200, contentType: 'image/png', body: PNG }));
    await page.mount('<gbif-occurrence-map taxon-key="4QHKG" basemap-url="https://tiles.example/{z}/{x}/{y}.png" basemap-attribution="Tiles by Example"></gbif-occurrence-map>');
    await mapReady(page);
    await page.locator('gbif-occurrence-map .leaflet-control-attribution', { hasText: 'Tiles by Example' }).waitFor(T);
    assert.equal(await page.locator('gbif-occurrence-map select').count(), 0);
    assert.equal(page.requests.filter((r) => r.host === 'tile.gbif.org').length, 0);
  });

  await test('map: renders nothing when there are no georeferenced occurrences', async (make) => {
    const S = freshState();
    S.mapTotal = 0;
    const page = await make(S);
    await page.mount('<gbif-occurrence-map taxon-key="4QHKG"></gbif-occurrence-map>');
    await page.locator('gbif-occurrence-map').evaluate(() => new Promise((r) => setTimeout(r, 500)));
    assert.equal(await page.locator('gbif-occurrence-map .gbif-card').count(), 0);
  });

  /* The type specimens list */

  await test('type list: Next keeps keyboard focus, announces the page, and reacts to page-size', async (make) => {
    const page = await make();
    await page.mount('<gbif-type-specimens taxon-key="4QHKG" page-size="5"></gbif-type-specimens>');
    const rows = page.locator('gbif-type-specimens .gbif-type-specimens__item');
    await rows.first().waitFor(T);
    assert.equal(await rows.count(), 5);
    await page.locator('gbif-type-specimens button', { hasText: 'Next' }).focus();
    await page.keyboard.press('Enter');
    await page.locator('gbif-type-specimens', { hasText: 'Page 2 of 5' }).waitFor(T);
    const focused = await page.evaluate(() => document.querySelector('gbif-type-specimens').shadowRoot.activeElement?.textContent.trim());
    assert.match(focused, /Next/, `focus stays on the button that was pressed, got: ${focused}`);
    assert.match(await page.locator('gbif-type-specimens [aria-live=polite]').textContent(), /Page 2 of 5/);

    await page.evaluate(() => (document.querySelector('gbif-type-specimens').pageSize = 10));
    await page.locator('gbif-type-specimens', { hasText: 'Page 1 of 3' }).waitFor(T);
    assert.equal(await rows.count(), 10);
    assert.match(await rows.first().textContent(), /Puma concolor 0/, 'starts again from the first row');
  });

  await test('type list: a failed page keeps the list and says so', async (make) => {
    const S = freshState();
    S.failTypeOffsets.add(5);
    const page = await make(S);
    await page.mount('<gbif-type-specimens taxon-key="4QHKG" page-size="5"></gbif-type-specimens>');
    const rows = page.locator('gbif-type-specimens .gbif-type-specimens__item');
    await rows.first().waitFor(T);
    await page.locator('gbif-type-specimens button', { hasText: 'Next' }).click();
    await page.locator('gbif-type-specimens [role=alert]', { hasText: 'Could not load that page' }).waitFor(T);
    assert.equal(await rows.count(), 5, 'the previous page is still there');
    assert.ok((await page.events('gbif-error')).length >= 1);
    S.failTypeOffsets.clear();
    await page.locator('gbif-type-specimens button', { hasText: 'Next' }).click();
    await page.locator('gbif-type-specimens', { hasText: 'Page 2 of 5' }).waitFor(T);
  });

  await test('type list: a failed first load shows an error card, and page-size is clamped', async (make) => {
    const S = freshState();
    S.failTypeOffsets.add(0);
    const page = await make(S);
    await page.mount('<gbif-type-specimens taxon-key="4QHKG" page-size="-3"></gbif-type-specimens>');
    await page.locator('gbif-type-specimens [role=alert]', { hasText: 'Could not load type specimens' }).waitFor(T);
    assert.equal(page.requests.find((r) => r.query.typeStatus).query.limit, '1');
  });

  /* The gallery */

  await test('gallery: Next works when two neighbouring images share a URL', async (make) => {
    const S = freshState();
    S.images = [image(1), image(1), image(2)];
    const page = await make(S);
    await page.mount('<gbif-media-gallery taxon-key="4QHKG"></gbif-media-gallery>');
    const img = page.locator('gbif-media-gallery .gbif-media-gallery__image');
    await img.waitFor(T);
    await page.waitForFunction(() => !document.querySelector('gbif-media-gallery').shadowRoot.querySelector('.gbif-media-gallery__image--hidden'));
    await page.locator('gbif-media-gallery button[aria-label="Next image"]').click();
    await page.locator('gbif-media-gallery', { hasText: '2 / 3' }).waitFor(T);
    await page.waitForFunction(() => !document.querySelector('gbif-media-gallery').shadowRoot.querySelector('.gbif-media-gallery__image--hidden'), null, T);
    assert.equal(await page.locator('gbif-media-gallery .gbif-media-gallery__status').count(), 0, 'no stuck "Loading image…"');
  });

  await test('gallery: hostile and malformed API data cannot break it or inject a link', async (make) => {
    const S = freshState();
    S.images = [
      null,
      42,
      { identifier: 'javascript:alert(1)', license: `${CC}/by/4.0/` },
      image(1, 'javascript:window.__pwned=1'),
      image(2, { not: 'a string' }),
      image(3, 'https://evil.example/?u=creativecommons.org/licenses/by/4.0/'),
      { identifier: 'https://img.test/9.png' }
    ];
    const page = await make(S);
    await page.mount('<gbif-media-gallery taxon-key="4QHKG"></gbif-media-gallery>');
    await page.locator('gbif-media-gallery .gbif-media-gallery__image').waitFor(T);
    assert.match(await page.locator('gbif-media-gallery .gbif-card__footer').textContent(), /1 \/ 4/, 'only the four usable images are counted');
    for (let i = 0; i < 4; i += 1) {
      const hrefs = await page.locator('gbif-media-gallery a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
      assert.ok(hrefs.every((h) => /^https?:/.test(h)), `unsafe href in ${hrefs}`);
      assert.doesNotMatch(await page.locator('gbif-media-gallery .gbif-card__footer').textContent(), /^\s*CC BY 4\.0 evil/);
      await page.locator('gbif-media-gallery button[aria-label="Next image"]').click();
    }
    assert.deepEqual(page.errors, []);
    assert.equal(await page.evaluate(() => window.__pwned), undefined);
  });

  await test('gallery: always credits the rights holder and licence, or says it is not stated', async (make) => {
    const S = freshState();
    S.images = [{ identifier: 'https://img.test/1.png' }, image(2)];
    const page = await make(S);
    await page.mount('<gbif-media-gallery taxon-key="4QHKG" hide-source></gbif-media-gallery>');
    const credit = page.locator('gbif-media-gallery .gbif-media-gallery__credit');
    await credit.waitFor(T);
    assert.match(await credit.textContent(), /Rights holder not stated.*Licence not stated/s);
    await page.locator('gbif-media-gallery button[aria-label="Next image"]').click();
    assert.match(await credit.textContent(), /Holder 2.*CC BY 4\.0/s);
  });

  await test('gallery: the licences filter keeps only the licences asked for', async (make) => {
    const page = await make();
    await page.mount(`
      <gbif-media-gallery id="all" taxon-key="4QHKG"></gbif-media-gallery>
      <gbif-media-gallery id="commercial" taxon-key="4QHKG" licenses="commercial"></gbif-media-gallery>
      <gbif-media-gallery id="cc0" taxon-key="4QHKG" licenses="cc0, pdm"></gbif-media-gallery>
      <gbif-media-gallery id="none" taxon-key="4QHKG" licenses="cc-by-nd"></gbif-media-gallery>`);
    const total = (id) => page.locator(`#${id} .gbif-media-gallery__counter`).textContent().then((t) => t.trim().split(/\s+/).slice(0, 3).join(' '));
    await page.locator('#all .gbif-media-gallery__counter').waitFor(T);
    assert.equal(await total('all'), '1 / 5');
    await page.locator('#commercial .gbif-media-gallery__counter').waitFor(T);
    assert.equal(await total('commercial'), '1 / 3', 'CC BY, CC BY and CC0; the two non-commercial images are gone');
    await page.locator('#cc0 .gbif-media-gallery__counter').waitFor(T);
    assert.equal(await total('cc0'), '1 / 1');
    await sleep(400);
    assert.equal(await page.locator('#none .gbif-card').count(), 0, 'nothing matches, so nothing is shown');
    assert.ok(page.requests.filter((r) => r.path.includes('multimedia')).every((r) => r.query.limit === '300' || r.query.limit === '20'));
  });

  await test('gallery: limit is clamped and changing it reloads', async (make) => {
    const page = await make();
    const limits = () => page.requests.filter((r) => r.path.includes('multimedia')).map((r) => r.query.limit);
    await page.mount('<gbif-media-gallery taxon-key="4QHKG" limit="-5"></gbif-media-gallery>');
    await page.locator('gbif-media-gallery .gbif-media-gallery__image').waitFor(T);
    assert.deepEqual(limits(), ['1']);
    await page.evaluate(() => (document.querySelector('gbif-media-gallery').limit = 3));
    await page.waitForFunction(() => document.querySelector('gbif-media-gallery').shadowRoot.textContent.includes('/ 3'), null, T);
    assert.deepEqual(limits(), ['1', '3']);
    await page.evaluate(() => (document.querySelector('gbif-media-gallery').limit = 'abc'));
    await page.waitForFunction(() => document.querySelector('gbif-media-gallery').shadowRoot.textContent.includes('/ 5'), null, T);
    assert.equal(limits().at(-1), '20');
  });

  await test('gallery: reserve-space holds the room while loading', async (make) => {
    const S = freshState();
    S.multimediaDelay = 800;
    const page = await make(S);
    await page.mount('<gbif-media-gallery taxon-key="4QHKG" reserve-space></gbif-media-gallery>');
    await page.locator('gbif-media-gallery .gbif-card[aria-hidden=true]').waitFor(T);
    const reserved = await page.locator('gbif-media-gallery').evaluate((e) => e.getBoundingClientRect().height);
    assert.ok(reserved > 200, `reserved ${reserved}px`);
    await page.locator('gbif-media-gallery .gbif-media-gallery__image').waitFor(T);
    assert.equal(await page.locator('gbif-media-gallery .gbif-card[aria-hidden=true]').count(), 0);
  });

  /* Names, matching and synonyms */

  await test('card: names from the API cannot inject markup', async (make) => {
    const page = await make();
    await page.mount('<gbif-taxon-card taxon-key="XSS1"></gbif-taxon-card>');
    await page.locator('gbif-taxon-card .gbif-taxon-card__name').waitFor(T);
    await sleep(300);
    assert.equal(await page.locator('gbif-taxon-card .gbif-taxon-card__name img, gbif-taxon-card .gbif-taxon-card__name script').count(), 0);
    assert.equal(await page.evaluate(() => window.__xss), undefined);
    assert.match(await page.locator('gbif-taxon-card .gbif-taxon-card__name').textContent(), /<img/, 'shown as text instead');
  });

  await test('card: a misapplied name resolves to the accepted taxon and says what it was', async (make) => {
    const page = await make();
    await page.mount('<gbif-taxon-card taxon-key="MIS1"></gbif-taxon-card><gbif-media-gallery taxon-key="MIS1"></gbif-media-gallery>');
    await page.locator('gbif-taxon-card .gbif-taxon-card__note', { hasText: 'Misapplied' }).waitFor(T);
    assert.match(await page.locator('gbif-taxon-card .gbif-taxon-card__name').textContent(), /^Puma concolor/);
    await page.locator('gbif-media-gallery .gbif-media-gallery__image').waitFor(T);
    assert.ok(page.requests.some((r) => r.path.includes('multimedia') && r.path.endsWith('/4QHKG')), 'images are asked for the ACCEPTED taxon');
    assert.ok(!page.requests.some((r) => r.path.includes('multimedia') && r.path.endsWith('/MIS1')));
  });

  await test('card: a spelling variant and a higher-rank match are called what they are', async (make) => {
    const page = await make();
    await page.mount('<gbif-taxon-card id="v" scientific-name="Puma concolr"></gbif-taxon-card><gbif-taxon-card id="h" scientific-name="Puma concolor concolor"></gbif-taxon-card>');
    await page.locator('#v .gbif-taxon-card__note', { hasText: 'spelling variant' }).waitFor(T);
    await page.locator('#h .gbif-taxon-card__note', { hasText: 'nearest higher taxon' }).waitFor(T);
    const resolved = await page.events('gbif-taxon-resolved');
    assert.deepEqual(resolved.map((e) => e.detail.matchType).sort(), ['HIGHERRANK', 'VARIANT']);
  });

  await test('card: kingdom tells homonyms apart, and "no match" is reported as an event', async (make) => {
    const page = await make();
    await page.mount('<gbif-taxon-card id="a" scientific-name="Ficus"></gbif-taxon-card><gbif-taxon-card id="b" scientific-name="Ficus" kingdom="Plantae"></gbif-taxon-card>');
    await page.locator('#b .gbif-taxon-card__name').waitFor(T);
    await page.locator('#a .gbif-card__state', { hasText: 'No confident match' }).waitFor(T);
    assert.ok(page.requests.some((r) => r.path === '/v2/species/match' && r.query.kingdom === 'Plantae'));
    const nf = await page.events('gbif-taxon-notfound');
    assert.equal(nf.length, 1);
    assert.equal(nf[0].detail.query, 'Ficus');
  });

  await test('card: renders nothing until it is told what to show', async (make) => {
    const page = await make();
    await page.mount('<gbif-taxon-card></gbif-taxon-card>');
    await sleep(300);
    assert.equal(await page.locator('gbif-taxon-card .gbif-card').count(), 0);
    assert.equal((await page.locator('gbif-taxon-card').evaluate((e) => e.shadowRoot.textContent)).trim(), '');
  });

  await test('card: heading level is the page author\'s choice', async (make) => {
    const page = await make();
    await page.mount('<gbif-taxon-card taxon-key="4QHKG" heading-level="3" heading="Cat"></gbif-taxon-card>');
    const heading = page.locator('gbif-taxon-card [role=heading]');
    await heading.waitFor(T);
    assert.equal(await heading.getAttribute('aria-level'), '3');
    assert.equal(await heading.textContent(), 'Cat');
  });

  /* Sources and attribution */

  await test('source notes: shown by default, hidden by hide-source, and one note can serve a page', async (make) => {
    const page = await make();
    await page.mount(`
      <gbif-taxon-card id="shown" taxon-key="4QHKG"></gbif-taxon-card>
      <gbif-taxon-card id="hidden" taxon-key="4QHKG" hide-source></gbif-taxon-card>
      <gbif-media-gallery id="gal" taxon-key="4QHKG" hide-source></gbif-media-gallery>
      <gbif-attribution>Maps by Example Council.</gbif-attribution>`);
    await page.locator('#shown .gbif-card__source', { hasText: 'Catalogue of Life 2026-10-16 XR' }).waitFor(T);
    await page.locator('#hidden .gbif-taxon-card__name').waitFor(T);
    await page.locator('#gal .gbif-media-gallery__credit').waitFor(T);
    assert.equal(await page.locator('#hidden .gbif-card__source').count(), 0);
    assert.equal(await page.locator('#gal .gbif-card__source').count(), 0);
    assert.match(await page.locator('#gal .gbif-media-gallery__credit').textContent(), /CC BY/, 'licence credit is never hidden');
    await page.locator('gbif-attribution', { hasText: 'Catalogue of Life' }).waitFor(T);
    const text = await page.locator('gbif-attribution').evaluate((e) => e.shadowRoot.textContent + e.textContent);
    assert.match(text, /GBIF/);
    assert.match(text, /Maps by Example Council/);
  });

  await test('source notes: configure({ showSource: false }) hides them everywhere', async (make) => {
    const page = await make();
    await page.evaluate(() => GbifComponents.configure({ showSource: false }));
    await page.mount('<gbif-taxon-card taxon-key="4QHKG"></gbif-taxon-card>');
    await page.locator('gbif-taxon-card .gbif-taxon-card__name').waitFor(T);
    assert.equal(await page.locator('gbif-taxon-card .gbif-card__source').count(), 0);
    assert.equal(page.requests.filter((r) => r.path.startsWith('/v2/taxon/checklist')).length, 0, 'and it does not fetch the checklist for nothing');
  });

  /* Events */

  await test('events: every link that opens GBIF.org is an intent the page can cancel', async (make) => {
    const page = await make();
    await page.mount('<gbif-taxon-card taxon-key="4QHKG"></gbif-taxon-card>');
    await page.locator('gbif-taxon-card .gbif-taxon-card__count a').waitFor(T);
    await page.evaluate(() => document.addEventListener('gbif-taxon-select', (e) => e.preventDefault()));
    await page.evaluate(() => document.addEventListener('gbif-occurrences-select', (e) => e.preventDefault()));
    await page.locator('gbif-taxon-card .gbif-taxon-card__count a').click();
    await page.locator('gbif-taxon-card a', { hasText: 'View on GBIF.org' }).click();
    await page.locator('gbif-taxon-card .gbif-taxon-card__rank-link', { hasText: 'Felidae' }).click();
    await sleep(300);
    assert.deepEqual(page.opened, [], 'nothing opened');
    const names = (await page.events()).map((e) => `${e.name}:${e.detail?.source ?? ''}`).filter((n) => /select/.test(n));
    assert.deepEqual(names, ['gbif-occurrences-select:count', 'gbif-taxon-select:gbif-link', 'gbif-taxon-select:classification']);
  });

  /* Resilience */

  await test('requests that never answer end in an error, and the page is told', async (make) => {
    const S = freshState();
    S.hangDetail = true;
    const page = await make(S);
    await page.evaluate(() => GbifComponents.configure({ timeoutMs: 400 }));
    await page.mount('<gbif-taxon-card taxon-key="4QHKG"></gbif-taxon-card>');
    await page.locator('gbif-taxon-card [role=alert]', { hasText: 'Could not load this taxon' }).waitFor(T);
    assert.ok((await page.events('gbif-error')).some((e) => /timed out/i.test(e.detail.message)));
  });

  await test('api-base may carry a path prefix (a same-origin proxy)', async (make) => {
    const page = await make();
    await page.mount('<gbif-taxon-card taxon-key="4QHKG" api-base="/gbif-proxy"></gbif-taxon-card>');
    await page.locator('gbif-taxon-card .gbif-taxon-card__name').waitFor(T);
    await page.locator('gbif-taxon-card .gbif-taxon-card__count a').waitFor(T);
    const gbifHost = page.requests.filter((r) => r.host === 'api.gbif.org');
    assert.deepEqual(gbifHost, [], 'nothing went to api.gbif.org directly');
    assert.ok(page.requests.length >= 3 && page.requests.every((r) => r.host === '127.0.0.1'));
  });

  await test('the same taxon on one page costs one request per URL', async (make) => {
    const page = await make();
    await page.mount(`
      <gbif-taxon-card taxon-key="4QHKG"></gbif-taxon-card>
      <gbif-media-gallery taxon-key="4QHKG"></gbif-media-gallery>
      <gbif-occurrence-map taxon-key="4QHKG"></gbif-occurrence-map>
      <gbif-type-specimens taxon-key="4QHKG"></gbif-type-specimens>`);
    await page.locator('gbif-type-specimens .gbif-type-specimens__item').first().waitFor(T);
    await mapReady(page);
    const api = page.requests.filter((r) => r.host === 'api.gbif.org' && !/\.png|\/\d+\/\d+\/\d+/.test(r.path));
    const urls = api.map((r) => r.full);
    assert.equal(new Set(urls).size, urls.length, `duplicates in:\n${urls.join('\n')}`);
  });

  /* The host page */

  await test('a dark host theme (body * { color: light }) cannot make card text unreadable', async (make) => {
    const page = await make();
    await page.addStyleTag({ content: 'body { background: #141414 } body * { color: #e8e8e8; font-family: "Comic Sans MS", cursive }' });
    await page.mount('<gbif-taxon-card taxon-key="4QHKG"></gbif-taxon-card><gbif-type-specimens taxon-key="4QHKG"></gbif-type-specimens>');
    await page.locator('gbif-taxon-card .gbif-taxon-card__name').waitFor(T);
    await page.locator('gbif-type-specimens .gbif-type-specimens__item').first().waitFor(T);
    const style = (sel) => page.locator(sel).first().evaluate((e) => ({ color: getComputedStyle(e).color, font: getComputedStyle(e).fontFamily, bg: getComputedStyle(e.closest('.gbif-card')).backgroundColor }));
    for (const sel of ['gbif-taxon-card .gbif-card__title', 'gbif-taxon-card .gbif-taxon-card__name', 'gbif-type-specimens .gbif-type-specimens__name']) {
      const s = await style(sel);
      assert.equal(s.color, 'rgb(31, 41, 51)', `${sel} colour ${s.color}`);
      assert.equal(s.bg, 'rgb(255, 255, 255)');
      assert.doesNotMatch(s.font, /Comic/);
    }
  });

  await test('theming: --gbif-* variables still reach the cards', async (make) => {
    const page = await make();
    await page.mount('<div style="--gbif-color-accent:#8a4b08;--gbif-color-text:#112233"><gbif-taxon-card taxon-key="4QHKG"></gbif-taxon-card></div>');
    await page.locator('gbif-taxon-card .gbif-taxon-card__name').waitFor(T);
    assert.equal(await page.locator('gbif-taxon-card .gbif-card__badge').evaluate((e) => getComputedStyle(e).backgroundColor), 'rgb(138, 75, 8)');
    assert.equal(await page.locator('gbif-taxon-card .gbif-card__title').evaluate((e) => getComputedStyle(e).color), 'rgb(17, 34, 51)');
  });

  await test('default colours meet WCAG AA contrast', async (make) => {
    const page = await make();
    await page.mount('<gbif-taxon-card taxon-key="4QHKG"></gbif-taxon-card>');
    await page.locator('gbif-taxon-card .gbif-card__badge').waitFor(T);
    await page.locator('gbif-taxon-card a.gbif-button--primary').waitFor(T);
    const ratio = await page.evaluate(() => {
      const lum = (rgb) => {
        const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const root = document.querySelector('gbif-taxon-card').shadowRoot;
      const pair = (sel) => {
        const s = getComputedStyle(root.querySelector(sel));
        const [a, b] = [lum(s.color), lum(s.backgroundColor)].sort((x, y) => y - x);
        return (a + 0.05) / (b + 0.05);
      };
      return { badge: pair('.gbif-card__badge'), button: pair('a.gbif-button--primary'), muted: pair('.gbif-taxon-card__count') };
    });
    assert.ok(ratio.badge >= 4.5, `badge ${ratio.badge}`);
    assert.ok(ratio.button >= 4.5, `button ${ratio.button}`);
  });

  await test('the bundle announces its version and warns when a tag was already taken', async (make) => {
    // Another script (or another copy of a different build) defines a tag first.
    const page = await make(freshState(), {
      init: () => {
        class Other extends HTMLElement {}
        window.__other = Other;
        customElements.define('gbif-type-specimens', Other);
      }
    });
    assert.match(await page.evaluate(() => GbifComponents.version), /^\d+\.\d+\.\d+|^dev$/);
    assert.ok(page.warnings.some((m) => /gbif-type-specimens/.test(m) && /already defined/.test(m)), `warnings: ${page.warnings.join(' | ')}`);
    assert.equal(await page.evaluate(() => customElements.get('gbif-type-specimens') === window.__other), true, 'the page\'s own definition is left alone');
    assert.equal(await page.evaluate(() => customElements.get('gbif-taxon-card') !== undefined), true, 'the other tags are still defined');
  });

  /* ---------- One search, several views ---------- */

  const crypto = require('node:crypto');
  const ALL_VIEWS = (searchAttrs = '', extra = '') => `
    <gbif-occurrence-search id="s" taxon-key="4QHKG" ${searchAttrs}></gbif-occurrence-search>
    <gbif-occurrence-filters search="#s"></gbif-occurrence-filters>
    <gbif-occurrence-table search="#s" page-size="10" ${extra}></gbif-occurrence-table>
    <gbif-occurrence-gallery search="#s" page-size="12"></gbif-occurrence-gallery>`;
  const searches = (page) =>
    page.requests.filter((r) => r.path === '/v1/occurrence/search' && !/typeStatus/.test(r.full)).map((r) => new URL(r.full).searchParams);
  const tableReqs = (page) => searches(page).filter((p) => !p.has('facet') && p.get('limit') !== '0' && !p.has('mediaType'));
  const facetReqs = (page) => searches(page).filter((p) => p.has('facet'));
  const galleryReqs = (page) => searches(page).filter((p) => p.get('mediaType') === 'StillImage');
  const total = (page, sel) => page.locator(sel).first().textContent().then((t) => t.replace(/\s+/g, ' ').trim());
  const settle = (page, ms = 700) => sleep(ms);
  const expectedTotal = (S, fn) => S.records.filter(fn).length;
  const waitTotal = (page, n) =>
    page.waitForFunction((count) => document.querySelector('gbif-occurrence-table')?.shadowRoot.querySelector('.gbif-occurrence-table__summary')?.textContent.trim().startsWith(`${count.toLocaleString()} occurrence`), n, T);
  const checkbox = (page, name) => page.locator('gbif-occurrence-filters .gbif-occurrence-filters__option', { hasText: name }).first().locator('input');

  await test('search: the panel, table and gallery show one search', async (make) => {
    const page = await make();
    await page.mount(ALL_VIEWS());
    await page.locator('gbif-occurrence-table tbody tr').first().waitFor(T);
    await page.locator('gbif-occurrence-gallery img').first().waitFor(T);
    await page.locator('gbif-occurrence-filters .gbif-occurrence-filters__option').first().waitFor(T);
    assert.equal(await page.locator('gbif-occurrence-table tbody tr').count(), 10);
    assert.equal(await total(page, 'gbif-occurrence-filters .gbif-occurrence-filters__total'), '60 occurrences');
    assert.match(await total(page, 'gbif-occurrence-table .gbif-occurrence-table__summary'), /^60 occurrences/);
    assert.match(await total(page, 'gbif-occurrence-gallery .gbif-occurrence-gallery__summary'), /^20 occurrences with images/);
    assert.deepEqual(await page.locator('gbif-occurrence-table th').allTextContents(), ['Scientific name', 'Country', 'Date', 'Basis of record', 'Dataset']);
    assert.equal(await page.locator('gbif-occurrence-gallery .gbif-occurrence-gallery__tile').count(), 12);
    assert.deepEqual(page.errors, []);
  });

  await test('search: choosing countries changes every view, and the other values stay listed', async (make) => {
    const S = freshState();
    const page = await make(S);
    await page.mount(ALL_VIEWS());
    await page.locator('gbif-occurrence-filters .gbif-occurrence-filters__option').first().waitFor(T);
    await checkbox(page, 'Norway').check();
    await waitTotal(page, 15);
    assert.deepEqual([...new Set(await page.locator('gbif-occurrence-table tbody tr td:nth-child(2)').allTextContents())], ['Norway']);
    await page.waitForFunction(() => document.querySelector('gbif-occurrence-gallery').shadowRoot.textContent.includes('5 occurrences with images'), null, T);
    assert.equal(await total(page, 'gbif-occurrence-filters .gbif-occurrence-filters__total'), '15 occurrences');
    // Sweden is still offered, with the count it would give on its own, because a filter's own values are not narrowed by itself.
    const sweden = await page.locator('gbif-occurrence-filters .gbif-occurrence-filters__option', { hasText: 'Sweden' }).first().textContent();
    assert.match(sweden, /15/);
    await checkbox(page, 'Sweden').check();
    await waitTotal(page, 30);
    await checkbox(page, 'Norway').uncheck();
    await checkbox(page, 'Sweden').uncheck();
    await waitTotal(page, 60);
    assert.deepEqual(page.badRequests ?? [], []);
    const sources = (await page.events('gbif-query-change')).map((e) => e.detail.source);
    assert.ok(sources.every((s) => s === 'update'), sources.join());
    assert.equal(sources.length, 4);
  });

  await test('search: year, text and coordinate filters, with the values the API accepts', async (make) => {
    const S = freshState();
    const page = await make(S);
    await page.mount(ALL_VIEWS());
    await page.locator('gbif-occurrence-filters input[name=year-from]').waitFor(T);
    await page.locator('gbif-occurrence-filters input[name=year-from]').fill('1995');
    await page.locator('gbif-occurrence-filters input[name=year-from]').blur();
    await waitTotal(page, expectedTotal(S, (r) => r.year >= 1995));
    assert.ok(tableReqs(page).some((p) => p.get('year') === '1995,*'), 'an open range');
    // A reversed range is put right before it is sent: the API answers one with an error.
    await page.locator('gbif-occurrence-filters input[name=year-from]').fill('2005');
    await page.locator('gbif-occurrence-filters input[name=year-to]').fill('1995');
    await page.locator('gbif-occurrence-filters input[name=year-to]').blur();
    await waitTotal(page, expectedTotal(S, (r) => r.year >= 1995 && r.year <= 2005));
    assert.ok(tableReqs(page).some((p) => p.get('year') === '1995,2005'));
    assert.deepEqual(page.badRequests ?? [], []);

    await page.locator('gbif-occurrence-filters input[name=year-from]').fill('');
    await page.locator('gbif-occurrence-filters input[name=year-to]').fill('');
    await page.locator('gbif-occurrence-filters input[name=year-to]').blur();
    await waitTotal(page, 60);

    const before = tableReqs(page).length;
    await page.locator('#gbif-filter-q, gbif-occurrence-filters input[type=search]').first().pressSequentially('collector 1', { delay: 30 });
    await waitTotal(page, expectedTotal(S, (r) => `${r.scientificName} ${r.recordedBy}`.toLowerCase().includes('collector 1')));
    assert.equal(tableReqs(page).length - before, 1, 'typing is one request, not one per key');
    await page.locator('gbif-occurrence-filters input[type=search]').fill('');
    await page.locator('gbif-occurrence-filters input[type=search]').press('Enter');
    await waitTotal(page, 60);

    await checkbox(page, 'Only records with coordinates').check();
    await waitTotal(page, 30);
  });

  await test('search: "Clear filters" clears them, and is disabled when there are none', async (make) => {
    const page = await make();
    await page.mount(ALL_VIEWS());
    const clear = page.locator('gbif-occurrence-filters button', { hasText: 'Clear filters' });
    await clear.waitFor(T);
    assert.equal(await clear.getAttribute('aria-disabled'), 'true');
    await checkbox(page, 'Norway').check();
    await waitTotal(page, 15);
    assert.equal(await clear.getAttribute('aria-disabled'), 'false');
    await clear.click();
    await waitTotal(page, 60);
    assert.equal(await checkbox(page, 'Norway').isChecked(), false);
    assert.equal(await clear.getAttribute('aria-disabled'), 'true');
  });

  await test('search: filters the page author fixed cannot be changed and are not offered', async (make) => {
    const page = await make();
    await page.mount(ALL_VIEWS('country="NO" year="1990,2000"'));
    await page.locator('gbif-occurrence-table tbody tr').first().waitFor(T);
    const legends = await page.locator('gbif-occurrence-filters legend, gbif-occurrence-filters label.gbif-occurrence-filters__legend').allTextContents();
    assert.ok(!legends.includes('Country') && !legends.includes('Year'), legends.join());
    assert.ok(legends.includes('Basis of record'));
    const changed = await page.evaluate(() => {
      const s = document.querySelector('#s');
      return [s.setFilters({ country: 'SE' }), s.setFilters({ year: '2010' }), JSON.stringify(s.query), s.fixed.join()];
    });
    assert.deepEqual(changed.slice(0, 2), [false, false], 'ignored');
    assert.deepEqual(JSON.parse(changed[2]), { country: ['NO'], year: '1990,2000' });
    const params = tableReqs(page).at(-1);
    assert.deepEqual(params.getAll('country'), ['NO']);
    assert.equal(params.get('year'), '1990,2000');
    await checkbox(page, 'Preserved specimen').check();
    await sleep(700);
    const last = tableReqs(page).at(-1);
    assert.deepEqual([last.getAll('country'), last.get('year'), last.getAll('basisOfRecord')], [['NO'], '1990,2000', ['PRESERVED_SPECIMEN']]);
  });

  await test('search: invalid filter values are dropped before they can reach the API', async (make) => {
    const page = await make();
    await page.mount(ALL_VIEWS());
    await page.locator('gbif-occurrence-table tbody tr').first().waitFor(T);
    const result = await page.evaluate(() => {
      const s = document.querySelector('#s');
      return [s.setFilters({ country: 'XX' }), s.setFilters({ year: 'abc' }), s.setFilters({ basisOfRecord: 'NOPE' }), s.setFilters({ taxonKey: 'X', limit: 1, evil: 1 }), JSON.stringify(s.userQuery)];
    });
    assert.deepEqual(result, [false, false, false, false, '{}']);
    await sleep(400);
    assert.deepEqual(page.badRequests ?? [], []);
  });

  /* ---------- the page address ---------- */

  await test('url: filters are read from the address, shown, and applied', async (make) => {
    const S = freshState();
    const page = await make(S);
    await page.goto(`${PAGE_URL}?keep=1&gbif_country=SE&gbif_year=1990,1995&gbif_country=NO#top`);
    await page.waitForFunction(() => customElements.get('gbif-taxon-card'));
    await page.mount(ALL_VIEWS('sync-url'));
    const want = expectedTotal(S, (r) => ['SE', 'NO'].includes(r.countryCode) && r.year >= 1990 && r.year <= 1995);
    await waitTotal(page, want);
    await page.locator('gbif-occurrence-filters .gbif-occurrence-filters__option').first().waitFor(T);
    assert.equal(await checkbox(page, 'Sweden').isChecked(), true);
    assert.equal(await checkbox(page, 'Norway').isChecked(), true);
    assert.equal(await page.locator('gbif-occurrence-filters input[name=year-from]').inputValue(), '1990');
    assert.equal(await page.locator('gbif-occurrence-filters input[name=year-to]').inputValue(), '1995');
    assert.ok(page.url().includes('keep=1') && page.url().endsWith('#top'), 'nothing was rewritten just by reading');
  });

  await test('url: a change adds a history entry, other parameters stay, and back and forward work', async (make) => {
    const page = await make();
    await page.goto(`${PAGE_URL}?keep=1`);
    await page.waitForFunction(() => customElements.get('gbif-taxon-card'));
    await page.mount(ALL_VIEWS('sync-url'));
    await page.locator('gbif-occurrence-filters .gbif-occurrence-filters__option').first().waitFor(T);
    const entries = await page.evaluate(() => history.length);
    await checkbox(page, 'Norway').check();
    await waitTotal(page, 15);
    const url = new URL(page.url());
    assert.equal(url.searchParams.get('keep'), '1');
    assert.deepEqual(url.searchParams.getAll('gbif_country'), ['NO']);
    assert.equal(await page.evaluate(() => history.length), entries + 1);

    await page.goBack();
    await waitTotal(page, 60);
    assert.equal(await checkbox(page, 'Norway').isChecked(), false, 'the panel follows the address back');
    assert.equal(new URL(page.url()).searchParams.has('gbif_country'), false);
    await page.goForward();
    await waitTotal(page, 15);
    assert.equal(await checkbox(page, 'Norway').isChecked(), true);
    const sources = (await page.events('gbif-query-change')).map((e) => e.detail.source);
    assert.deepEqual(sources, ['update', 'url', 'url']);
  });

  await test('url: the page author\'s filters are never written, and url-history="replace" adds no entry', async (make) => {
    const page = await make();
    await page.mount(ALL_VIEWS('sync-url url-history="replace" country="NO"'));
    await page.locator('gbif-occurrence-filters input[name=year-from]').waitFor(T);
    const entries = await page.evaluate(() => history.length);
    await page.locator('gbif-occurrence-filters input[name=year-from]').fill('2000');
    await page.locator('gbif-occurrence-filters input[name=year-from]').blur();
    await page.waitForFunction(() => location.search.includes('gbif_year'), null, T);
    const params = new URL(page.url()).searchParams;
    assert.equal(params.get('gbif_year'), '2000,*');
    assert.equal(params.has('gbif_country'), false, 'country is fixed by the page, so it is not in the address');
    assert.equal(await page.evaluate(() => history.length), entries, 'replaced, not added');
  });

  await test('url: junk in the address is ignored and never sent to the API', async (make) => {
    const page = await make();
    await page.goto(`${PAGE_URL}?gbif_country=XX&gbif_year=abc&gbif_basisOfRecord=NOPE&gbif_hasCoordinate=yes&gbif_q=%20%20`);
    await page.waitForFunction(() => customElements.get('gbif-taxon-card'));
    await page.mount(ALL_VIEWS('sync-url'));
    await waitTotal(page, 60);
    assert.deepEqual(page.badRequests ?? [], []);
    assert.deepEqual(await page.evaluate(() => document.querySelector('#s').userQuery), {});
  });

  await test('url: two searches on one page use their own prefixes, and no sync touches nothing', async (make) => {
    const page = await make();
    await page.goto(`${PAGE_URL}?a_country=SE&b_country=US`);
    await page.waitForFunction(() => customElements.get('gbif-taxon-card'));
    await page.mount(`
      <gbif-occurrence-search id="a" taxon-key="4QHKG" sync-url url-prefix="a_"></gbif-occurrence-search>
      <gbif-occurrence-search id="b" taxon-key="4QHKG" sync-url url-prefix="b_"></gbif-occurrence-search>
      <gbif-occurrence-search id="c" taxon-key="4QHKG"></gbif-occurrence-search>
      <gbif-occurrence-table id="ta" search="#a" page-size="5"></gbif-occurrence-table>
      <gbif-occurrence-table id="tb" search="#b" page-size="5"></gbif-occurrence-table>
      <gbif-occurrence-table id="tc" search="#c" page-size="5"></gbif-occurrence-table>`);
    for (const id of ['ta', 'tb', 'tc']) await page.locator(`#${id} tbody tr`).first().waitFor(T);
    const countries = async (id) => [...new Set(await page.locator(`#${id} tbody tr td:nth-child(2)`).allTextContents())];
    assert.deepEqual(await countries('ta'), ['Sweden']);
    assert.deepEqual(await countries('tb'), ['United States of America']);
    assert.ok((await countries('tc')).length > 1, 'a search without sync-url ignores the address');
    await page.evaluate(() => document.querySelector('#c').setFilters({ country: 'CL' }));
    await page.evaluate(() => document.querySelector('#a').setFilters({ country: 'NO' }));
    await page.waitForFunction(() => location.search.includes('a_country=NO'));
    const params = new URL(page.url()).searchParams;
    assert.deepEqual([params.get('a_country'), params.get('b_country'), [...params.keys()].filter((k) => k.startsWith('c')).length], ['NO', 'US', 0]);
  });

  /* ---------- paging, failures and races ---------- */

  await test('table: paging keeps focus, a filter change goes back to page one, and a failed page keeps the rows', async (make) => {
    const S = freshState();
    const page = await make(S);
    await page.mount(ALL_VIEWS());
    const rows = page.locator('gbif-occurrence-table tbody tr');
    await rows.first().waitFor(T);
    await page.locator('gbif-occurrence-table button', { hasText: 'Next' }).focus();
    await page.keyboard.press('Enter');
    await page.locator('gbif-occurrence-table', { hasText: 'Page 2 of 6' }).waitFor(T);
    assert.match(await rows.first().textContent(), /Puma concolor 10/);
    const focused = await page.evaluate(() => document.querySelector('gbif-occurrence-table').shadowRoot.activeElement?.textContent.trim());
    assert.match(focused, /Next/);

    await checkbox(page, 'Norway').check();
    await page.locator('gbif-occurrence-table', { hasText: 'Page 1 of 2' }).waitFor(T);

    // A page that cannot be loaded leaves the one on screen, and says so.
    S.searchHook = async (q) => (q.get('offset') === '10' && !q.has('mediaType') ? { status: 500 } : undefined);
    await page.locator('gbif-occurrence-table button', { hasText: 'Next' }).click();
    await page.locator('gbif-occurrence-table [role=alert]', { hasText: 'Could not load that page' }).waitFor(T);
    assert.equal(await rows.count(), 10);
    assert.ok((await page.events('gbif-error')).some((e) => e.tag === 'gbif-occurrence-table'));
  });

  await test('table: page-size and columns are validated, and a bad page-size does not break paging', async (make) => {
    const page = await make();
    await page.mount(`
      <gbif-occurrence-search id="s" taxon-key="4QHKG"></gbif-occurrence-search>
      <gbif-occurrence-table search="#s" page-size="-3" columns="year country nope __proto__"></gbif-occurrence-table>`);
    await page.locator('gbif-occurrence-table tbody tr').first().waitFor(T);
    assert.equal(await page.locator('gbif-occurrence-table tbody tr').count(), 1);
    assert.deepEqual(await page.locator('gbif-occurrence-table th').allTextContents(), ['Year', 'Country']);
    assert.equal(tableReqs(page)[0].get('limit'), '1');
    await page.evaluate(() => (document.querySelector('gbif-occurrence-table').pageSize = 500));
    await page.waitForFunction(() => document.querySelectorAll('gbif-occurrence-table')[0].shadowRoot.querySelectorAll('tbody tr').length === 60 || document.querySelector('gbif-occurrence-table').shadowRoot.querySelectorAll('tbody tr').length === 60, null, T).catch(() => {});
    assert.equal(tableReqs(page).at(-1).get('limit'), '100', 'at most 100 rows a page');
  });

  await test('table: text from the records is shown as text, never as markup', async (make) => {
    const S = freshState();
    S.records[0].scientificName = '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script>';
    S.records[0].country = { not: 'a string' };
    S.records[0].eventDate = ['2000'];
    S.records[0].recordedBy = 42;
    S.records[0].key = '1/../../evil?x=1#y';
    const page = await make(S);
    await page.mount(ALL_VIEWS('', 'columns="scientificName country eventDate recordedBy"'));
    await page.locator('gbif-occurrence-table tbody tr').first().waitFor(T);
    await sleep(300);
    assert.equal(await page.locator('gbif-occurrence-table tbody img, gbif-occurrence-table tbody script').count(), 0);
    assert.equal(await page.evaluate(() => window.__xss), undefined);
    assert.match(await page.locator('gbif-occurrence-table tbody tr').first().textContent(), /<img src=x/);
    const href = await page.locator('gbif-occurrence-table tbody tr').first().locator('a').getAttribute('href');
    assert.match(href, /^https:\/\/www\.gbif\.org\/occurrence\/[^/?#]+$/, `the key stays one path segment: ${href}`);
    assert.deepEqual(page.errors, []);
  });

  await test('table and panel: a slow answer for an old query never replaces a newer one', async (make) => {
    const S = freshState();
    S.searchHook = async (q) => (!q.has('country') && !q.has('mediaType') && !q.has('facet') ? { delay: 1500 } : undefined);
    const page = await make(S);
    await page.mount(ALL_VIEWS());
    await page.locator('gbif-occurrence-filters', { hasText: 'Country' }).waitFor(T);
    await page.evaluate(() => document.querySelector('#s').setFilters({ country: 'NO' }));
    await waitTotal(page, 15);
    await sleep(2200);
    assert.match(await total(page, 'gbif-occurrence-table .gbif-occurrence-table__summary'), /^15 occurrences/, 'the slow first answer arrived later and was ignored');
  });

  await test('search: a change to the search\'s own attributes reaches the views', async (make) => {
    const page = await make();
    await page.mount(ALL_VIEWS());
    await page.locator('gbif-occurrence-table tbody tr').first().waitFor(T);
    await page.evaluate(() => (document.querySelector('#s').taxonKey = 'OTHER'));
    await page.waitForFunction(() => window.__events.some((e) => e.name === 'gbif-query-change' && e.detail.source === 'attributes'), null, T);
    await sleep(500);
    assert.equal(tableReqs(page).at(-1).get('taxonKey'), 'OTHER');
    assert.equal(facetReqs(page).at(-1).get('taxonKey'), 'OTHER');
    assert.equal(galleryReqs(page).at(-1).get('taxonKey'), 'OTHER');
    const detail = (await page.events('gbif-query-change')).at(-1).detail;
    assert.deepEqual(Object.keys(detail).sort(), ['params', 'query', 'source', 'userQuery']);
  });

  await test('search: a 429 is tried again, and a real failure is shown where it happened', async (make) => {
    const S = freshState();
    let turnedAway = 0;
    S.searchHook = async (q) => (q.has('facet') && turnedAway++ === 0 ? { status: 429 } : undefined);
    const page = await make(S);
    await page.mount(ALL_VIEWS());
    await checkbox(page, 'Norway').waitFor({ timeout: 15000 }); // a real facet value: this only appears once the retry has worked
    assert.ok(facetReqs(page).length >= 2, `the panel asked again (facet requests: ${facetReqs(page).length}; hook calls: ${turnedAway}; search requests: ${searches(page).map((p) => (p.has('facet') ? 'facet' : p.get('mediaType') ? 'gallery' : 'table')).join(',')})`);

    S.searchHook = async (q) => (!q.has('facet') ? { status: 500 } : undefined);
    await checkbox(page, 'Norway').check();
    await page.locator('gbif-occurrence-table [role=alert]', { hasText: 'Could not load occurrences' }).waitFor(T);
    await page.locator('gbif-occurrence-gallery [role=alert], gbif-occurrence-gallery .gbif-card__state').first().waitFor(T);
    assert.ok(await checkbox(page, 'Norway').isEnabled(), 'the panel still works');
    S.searchHook = null;
    await checkbox(page, 'Norway').uncheck();
    await page.locator('gbif-occurrence-table tbody tr').first().waitFor(T);
  });

  await test('search: no results is said plainly, in every view', async (make) => {
    const page = await make();
    await page.mount(ALL_VIEWS('q="zzzzz"'));
    await page.locator('gbif-occurrence-table', { hasText: 'No occurrences match these filters.' }).waitFor(T);
    await page.locator('gbif-occurrence-gallery', { hasText: 'No images match these filters.' }).waitFor(T);
    assert.equal(await total(page, 'gbif-occurrence-filters .gbif-occurrence-filters__total'), '0 occurrences');
  });

  /* ---------- the gallery ---------- */

  await test('gallery: small images come from GBIF\'s image cache, named by a hash of the image URL', async (make) => {
    const page = await make();
    await page.mount(ALL_VIEWS());
    await page.locator('gbif-occurrence-gallery img').first().waitFor(T);
    await page.waitForFunction(() => document.querySelector('gbif-occurrence-gallery').shadowRoot.querySelector('img')?.complete);
    await sleep(300);
    const first = page.requests.find((r) => r.path.startsWith('/v1/image/cache/'));
    const hash = crypto.createHash('md5').update('https://img.test/occ-0.png').digest('hex');
    assert.equal(first.path, `/v1/image/cache/fit-in/400x/occurrence/2000/media/${hash}`);
    assert.equal(page.requests.filter((r) => r.host === 'img.test').length, 0, 'the publisher\'s server is not contacted');
    assert.equal(await page.locator('gbif-occurrence-gallery img').first().evaluate((i) => i.referrerPolicy), 'no-referrer');
  });

  await test('gallery: falls back to the publisher\'s file, and then to a message', async (make) => {
    const S = freshState();
    S.thumbnails = 'missing';
    const page = await make(S);
    await page.mount(ALL_VIEWS());
    await page.waitForFunction(() => {
      const img = document.querySelector('gbif-occurrence-gallery')?.shadowRoot.querySelector('img');
      return img && img.complete && img.naturalWidth > 0 && img.src.startsWith('https://img.test/');
    }, null, T);
    assert.ok(page.requests.some((r) => r.host === 'img.test'));

    const S2 = freshState();
    S2.thumbnails = 'broken';
    const page2 = await make(S2);
    await page2.mount(ALL_VIEWS());
    await page2.locator('gbif-occurrence-gallery .gbif-occurrence-gallery__broken').first().waitFor(T);
    assert.ok((await page2.events('gbif-error')).some((e) => e.detail.message === 'Image failed to load'));
    assert.match(await page2.locator('gbif-occurrence-gallery .gbif-occurrence-gallery__caption').first().textContent(), /Photographer/, 'the credit stays');
  });

  await test('gallery: images="original" skips the cache; credits and licences are always shown', async (make) => {
    const page = await make();
    await page.mount(`
      <gbif-occurrence-search id="s" taxon-key="4QHKG"></gbif-occurrence-search>
      <gbif-occurrence-gallery search="#s" page-size="6" images="original" hide-source></gbif-occurrence-gallery>`);
    await page.locator('gbif-occurrence-gallery img').first().waitFor(T);
    await sleep(300);
    assert.equal(page.requests.filter((r) => r.path.startsWith('/v1/image/cache/')).length, 0);
    assert.ok(page.requests.some((r) => r.host === 'img.test'));
    assert.equal(await page.locator('gbif-occurrence-gallery .gbif-card__source').count(), 0, 'the source note is hidden');
    const captions = await page.locator('gbif-occurrence-gallery .gbif-occurrence-gallery__caption').allTextContents();
    assert.ok(captions.length >= 1 && captions.every((c) => /Photographer \d+/.test(c) && /CC/.test(c)), captions.join(' | '));
    const hrefs = await page.locator('gbif-occurrence-gallery a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    assert.ok(hrefs.every((h) => /^https?:/.test(h)));
  });

  await test('gallery: the licences attribute filters the image licences, and a record licence is a different thing', async (make) => {
    const S = freshState();
    const page = await make(S);
    await page.mount(`
      <gbif-occurrence-search id="s" taxon-key="4QHKG"></gbif-occurrence-search>
      <gbif-occurrence-gallery id="all" search="#s" page-size="12"></gbif-occurrence-gallery>
      <gbif-occurrence-gallery id="commercial" search="#s" page-size="12" licenses="commercial"></gbif-occurrence-gallery>`);
    await page.locator('#all img').first().waitFor(T);
    await page.locator('#commercial img').first().waitFor(T);
    const nonCommercial = (r) => r.media[0].license.includes('/by-nc/');
    const firstPage = S.records.filter((r) => r.media.length).slice(0, 12);
    assert.equal(await page.locator('#all .gbif-occurrence-gallery__tile').count(), 12);
    assert.equal(await page.locator('#commercial .gbif-occurrence-gallery__tile').count(), firstPage.filter((r) => !nonCommercial(r)).length);
    assert.doesNotMatch((await page.locator('#commercial .gbif-occurrence-gallery__caption').allTextContents()).join(' '), /NC/);
  });

  await test('gallery and table: clicks are intents the page can cancel', async (make) => {
    const page = await make();
    await page.mount(ALL_VIEWS());
    await page.locator('gbif-occurrence-gallery .gbif-occurrence-gallery__link').first().waitFor(T);
    await page.evaluate(() => document.addEventListener('gbif-occurrence-select', (e) => e.preventDefault()));
    await page.locator('gbif-occurrence-gallery .gbif-occurrence-gallery__link').first().click();
    await page.locator('gbif-occurrence-table tbody tr a').first().click();
    await sleep(300);
    assert.deepEqual(page.opened, []);
    assert.deepEqual((await page.events('gbif-occurrence-select')).map((e) => [e.tag, e.detail.source, e.detail.occurrenceKey]), [
      ['gbif-occurrence-gallery', 'gallery', '2000'],
      ['gbif-occurrence-table', 'table', '2000']
    ]);
  });

  /* ---------- finding the search ---------- */

  await test('finding the search: by id, by position, late, missing, and when set from script', async (make) => {
    const page = await make();
    page.on('console', () => {});
    await page.mount(`
      <gbif-occurrence-table id="byId" search="#s" page-size="3"></gbif-occurrence-table>
      <gbif-occurrence-search id="s" taxon-key="4QHKG"></gbif-occurrence-search>
      <gbif-occurrence-search id="outer" taxon-key="4QHKG" country="NO">
        <gbif-occurrence-table id="inside" page-size="3"></gbif-occurrence-table>
      </gbif-occurrence-search>
      <gbif-occurrence-table id="missing" search="#nope"></gbif-occurrence-table>
      <gbif-occurrence-table id="bad" search="##??"></gbif-occurrence-table>`);
    await page.locator('#byId tbody tr').first().waitFor(T);
    await page.locator('#inside tbody tr').first().waitFor(T);
    assert.deepEqual([...new Set(await page.locator('#inside tbody tr td:nth-child(2)').allTextContents())], ['Norway'], 'the one it is inside');
    await page.locator('#missing [role=alert]', { hasText: 'No occurrence search was found' }).waitFor(T);
    await page.locator('#bad [role=alert]', { hasText: 'No occurrence search was found' }).waitFor(T);
    assert.ok(page.warnings.some((w) => /found no <gbif-occurrence-search>/.test(w) && /#nope/.test(w)), page.warnings.join('|'));

    await page.evaluate(() => {
      const late = document.createElement('gbif-occurrence-table');
      late.id = 'late';
      late.setAttribute('page-size', '3');
      document.body.append(late);
      late.search = '#s';
    });
    await page.locator('#late tbody tr').first().waitFor(T);
  });

  await test('finding the search: a table written before its search, while the page is still being read', async (make) => {
    const page = await make(freshState(), {
      init: () => {
        // As if the bundle ran while the page was still being parsed.
        Object.defineProperty(document, 'readyState', { get: () => (window.__parsed ? 'complete' : 'loading'), configurable: true });
      }
    });
    await page.evaluate(() => {
      document.body.innerHTML = '<gbif-occurrence-table id="t" search="#s" page-size="3"></gbif-occurrence-table>';
    });
    await sleep(300);
    assert.equal(await page.locator('#t tbody tr').count(), 0, 'nothing yet, and no complaint yet');
    assert.equal(page.warnings.filter((w) => /found no/.test(w)).length, 0);
    await page.evaluate(() => {
      document.body.insertAdjacentHTML('beforeend', '<gbif-occurrence-search id="s" taxon-key="4QHKG"></gbif-occurrence-search>');
      window.__parsed = true;
      document.dispatchEvent(new Event('DOMContentLoaded'));
    });
    await page.locator('#t tbody tr').first().waitFor(T);
  });

  /* ---------- structure, looks and defaults ---------- */

  await test('accessibility: a labelled table, grouped fields, and checkboxes that work from the keyboard', async (make) => {
    const page = await make();
    await page.mount(ALL_VIEWS());
    await page.locator('gbif-occurrence-table tbody tr').first().waitFor(T);
    await page.locator('gbif-occurrence-filters .gbif-occurrence-filters__option').first().waitFor(T);
    assert.equal(await page.locator('gbif-occurrence-table th[scope=col]').count(), 5);
    const region = page.locator('gbif-occurrence-table [role=region]');
    assert.equal(await region.getAttribute('aria-label'), 'Occurrences');
    assert.equal(await region.getAttribute('tabindex'), '0', 'a wide table can be scrolled from the keyboard');
    assert.ok((await page.locator('gbif-occurrence-filters fieldset > legend').count()) >= 3);
    assert.equal(await page.locator('gbif-occurrence-filters label[for=gbif-filter-q]').count(), 1);
    const norway = page.getByRole('checkbox', { name: /Norway/ });
    await norway.focus();
    await page.keyboard.press('Space');
    await waitTotal(page, 15);
    assert.equal(await page.locator('gbif-occurrence-filters [role=status]').first().textContent().then((t) => t.trim()), '15 occurrences');
    assert.deepEqual(await page.locator('gbif-occurrence-filters [role=heading]').getAttribute('aria-level'), '2');
  });

  await test('look: headings, source notes and themes behave like the other components', async (make) => {
    const page = await make();
    await page.addStyleTag({ content: 'body { background: #141414 } body * { color: #e8e8e8 }' });
    await page.mount(`
      <gbif-occurrence-search id="s" taxon-key="4QHKG"></gbif-occurrence-search>
      <div style="--gbif-color-accent:#8a4b08">
        <gbif-occurrence-filters search="#s" heading="Narrow down" heading-level="3"></gbif-occurrence-filters>
      </div>
      <gbif-occurrence-table id="shown" search="#s" page-size="3"></gbif-occurrence-table>
      <gbif-occurrence-table id="hidden" search="#s" page-size="3" hide-source heading="Records"></gbif-occurrence-table>`);
    await page.locator('#shown tbody tr').first().waitFor(T);
    await page.locator('#hidden tbody tr').first().waitFor(T);
    assert.equal(await page.locator('gbif-occurrence-filters [role=heading]').getAttribute('aria-level'), '3');
    assert.equal(await page.locator('gbif-occurrence-filters [role=heading]').textContent(), 'Narrow down');
    assert.equal(await page.locator('#shown .gbif-card__source').count(), 1);
    assert.equal(await page.locator('#hidden .gbif-card__source').count(), 0);
    assert.equal(await page.locator('#hidden [role=heading]').textContent(), 'Records');
    const colour = (sel) => page.locator(sel).first().evaluate((e) => getComputedStyle(e).color);
    assert.equal(await colour('#shown tbody td'), 'rgb(31, 41, 51)', 'a dark page cannot turn the table text pale');
    assert.equal(await colour('gbif-occurrence-filters .gbif-occurrence-filters__legend'), 'rgb(31, 41, 51)');
    assert.equal(await page.locator('gbif-occurrence-filters .gbif-card__badge').evaluate((e) => getComputedStyle(e).backgroundColor), 'rgb(138, 75, 8)');
  });

  await test('search: it is one place for the whole query, so a card for the same taxon costs nothing extra', async (make) => {
    const page = await make();
    await page.mount(ALL_VIEWS() + '<gbif-taxon-card taxon-key="4QHKG"></gbif-taxon-card>');
    await page.locator('gbif-occurrence-table tbody tr').first().waitFor(T);
    await page.locator('gbif-taxon-card .gbif-taxon-card__name').waitFor(T);
    await sleep(500);
    const urls = page.requests.filter((r) => r.host === 'api.gbif.org' && !/\/image\//.test(r.path)).map((r) => r.full);
    assert.equal(new Set(urls).size, urls.length, `duplicate requests:\n${urls.join('\n')}`);
    // Panel, table and gallery are three different questions (counts and values, rows, images), so three requests.
    assert.equal(facetReqs(page).length, 1);
    assert.equal(tableReqs(page).length + galleryReqs(page).length, 2);
  });
}

(async () => {
  const server = await startServer();
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined;
  browser = await chromium.launch({ proxy });
  try {
    await run();
  } finally {
    await browser.close();
    server.kill();
  }
  console.log(`\n${results.passed} passed, ${results.failed.length} failed`);
  if (results.failed.length) console.log('Failed:\n - ' + results.failed.join('\n - '));
  process.exit(results.failed.length ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
