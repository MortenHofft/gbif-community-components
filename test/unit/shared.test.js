import { test } from 'node:test';
import assert from 'node:assert/strict';

import { safeNameHtml, formatLicense, rankLabel } from '../../src/shared/format.js';
import { buildUrl, getJson, clearCache, GbifApiError } from '../../src/shared/api.js';
import { describeMatch } from '../../src/shared/match.js';
import { configure, resolveConfig, DEFAULTS } from '../../src/shared/config.js';
import { linkIntent } from '../../src/shared/events.js';

test('safeNameHtml keeps italics and escapes everything else', () => {
  assert.equal(safeNameHtml('<i>Puma</i> <i>concolor</i> (Linnaeus, 1771)'), '<i>Puma</i> <i>concolor</i> (Linnaeus, 1771)');
  assert.equal(safeNameHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  // Tags carrying attributes never match the allow-list.
  assert.equal(safeNameHtml('<i onclick="x()">a</i>'), '&lt;i onclick=&quot;x()&quot;&gt;a</i>');
  assert.equal(safeNameHtml('<img src=x onerror=y>'), '&lt;img src=x onerror=y&gt;');
  assert.equal(safeNameHtml(), '');
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

test('describeMatch only trusts confident matches', () => {
  const good = { usage: { key: 'A', status: 'ACCEPTED' }, classification: [{ key: 'A' }], diagnostics: { matchType: 'EXACT', confidence: 99 } };
  assert.equal(describeMatch(good).found, true);
  assert.equal(describeMatch(good).target.key, 'A');

  assert.equal(describeMatch({ ...good, diagnostics: { matchType: 'EXACT', confidence: 40 } }).found, false);
  assert.equal(describeMatch({ ...good, diagnostics: { matchType: 'NONE', confidence: 99 } }).found, false);
  assert.equal(describeMatch({ diagnostics: { matchType: 'NONE' } }).found, false);
  assert.deepEqual(describeMatch({ diagnostics: { matchType: 'NONE' } }).classification, []);
});

test('describeMatch follows synonyms to the accepted taxon', () => {
  const synonym = {
    usage: { key: 'S', status: 'SYNONYM' },
    acceptedUsage: { key: 'A', status: 'ACCEPTED' },
    diagnostics: { matchType: 'EXACT', confidence: 95 }
  };
  const result = describeMatch(synonym);
  assert.equal(result.isSynonym, true);
  assert.equal(result.target.key, 'A');
  assert.equal(result.usage.key, 'S');
});

test('describeMatch for a lookup by key does not require a confidence', () => {
  assert.equal(describeMatch({ usage: { key: 'A' }, diagnostics: { matchType: 'NONE' } }, { byKey: true }).found, true);
  assert.equal(describeMatch({ diagnostics: {} }, { byKey: true }).found, false);
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
