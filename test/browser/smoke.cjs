/**
 * End-to-end smoke test. Starts the Vite dev server, opens examples/index.html
 * in Chromium and checks that each component renders real GBIF data and that
 * the classification fires events the page can react to.
 *
 * It talks to the live GBIF API, so it needs network access. Requires
 * Playwright to be resolvable (`require('playwright')`).
 *
 *   SCREENSHOT_DIR=/some/dir npm run test:browser
 */
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const PORT = 5199;
const URL = `http://127.0.0.1:${PORT}/examples/index.html`;
const SEARCH_URL = `http://127.0.0.1:${PORT}/examples/search.html`;
const DETAIL_URL = `http://127.0.0.1:${PORT}/examples/occurrence.html?key=5938145577`;
const SHOTS = process.env.SCREENSHOT_DIR || os.tmpdir();

async function startServer() {
  // Run Vite directly (not through npx) so killing it leaves no orphan process.
  const vite = path.resolve(__dirname, '../../node_modules/vite/bin/vite.js');
  const server = spawn(process.execPath, [vite, '--port', String(PORT), '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Vite did not start in time')), 30000);
    server.stdout.on('data', (chunk) => {
      if (String(chunk).includes('Local')) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.on('exit', (code) => reject(new Error(`Vite exited early (${code})`)));
  });
  return server;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let step = 0;
const check = async (label, fn) => {
  step += 1;
  await fn();
  console.log(`ok ${step} - ${label}`);
};

(async () => {
  const server = await startServer();
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined;
  const browser = await chromium.launch({ proxy });
  const page = await browser.newPage({ viewport: { width: 1200, height: 1400 }, deviceScaleFactor: 1 });

  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const gbifRequests = [];
  page.on('request', (request) => {
    const url = new globalThis.URL(request.url());
    if (url.hostname === 'api.gbif.org') gbifRequests.push(url.pathname);
  });

  const card = page.locator('#main-card');
  const gallery = page.locator('gbif-media-gallery').first();
  const map = page.locator('gbif-occurrence-map');
  const types = page.locator('gbif-type-specimens');
  const log = page.locator('#event-log');

  try {
    await page.goto(URL);

    await check('taxon card shows the name, classification and an occurrence count', async () => {
      await card.locator('.gbif-taxon-card__name').filter({ hasText: 'Puma' }).waitFor({ timeout: 30000 });
      assert.ok((await card.locator('.gbif-taxon-card__ancestor').count()) > 5, 'classification is listed');
      await card.locator('.gbif-taxon-card__count strong').waitFor({ timeout: 30000 });
    });

    await check('gallery shows an image with its rights holder and licence', async () => {
      await gallery.locator('.gbif-media-gallery__image').waitFor({ timeout: 30000 });
      const alt = await gallery.locator('.gbif-media-gallery__image').getAttribute('alt');
      assert.match(alt, /^Image of Puma concolor/);
      const credit = await gallery.locator('.gbif-media-gallery__credit').innerText();
      assert.match(credit, /CC/);
    });

    await check('map renders a Leaflet map with tiles', async () => {
      await map.locator('.leaflet-container').waitFor({ timeout: 30000 });
      // Check a GBIF density tile, not the Esri basemap, which some networks block.
      await map.locator('img.leaflet-tile-loaded[src*="/v2/map/occurrence/density/"]').first().waitFor({ state: 'attached', timeout: 30000 });
      const width = await map.locator('.leaflet-container').evaluate((el) => el.getBoundingClientRect().width);
      assert.ok(width > 100, 'map has a size, so Leaflet CSS reached the shadow root');
    });

    await check('type specimens list loads', async () => {
      await types.locator('.gbif-type-specimens__item').first().waitFor({ timeout: 30000 });
    });

    await page.screenshot({ path: path.join(SHOTS, 'examples-puma.png'), fullPage: true });

    await check('clicking a classification entry fires gbif-taxon-select and the page follows', async () => {
      await card.locator('.gbif-taxon-card__rank-link', { hasText: 'Felidae' }).click();
      await card.locator('.gbif-taxon-card__name').filter({ hasText: 'Felidae' }).waitFor({ timeout: 30000 });

      const events = await log.innerText();
      assert.match(events, /gbif-taxon-card\s+gbif-taxon-select\s+\{"taxonKey":"623RM","scientificName":"Felidae","rank":"FAMILY"/);

      // The other components were pointed at the same taxon by the page's listener.
      await gallery.locator('.gbif-media-gallery__image').waitFor({ timeout: 30000 });
      assert.equal(await gallery.getAttribute('taxon-key'), '623RM');
      assert.match(await gallery.locator('.gbif-media-gallery__image').getAttribute('alt'), /^Image of Felidae/);
      // Type specimens are only shown for species and genus, so the card disappears.
      await types.locator('.gbif-card').waitFor({ state: 'detached', timeout: 30000 });
    });

    await check('a name with no confident match says so and fires no error', async () => {
      await page.getByRole('button', { name: 'No match' }).click();
      await card.locator('.gbif-card__state').filter({ hasText: 'No confident match' }).waitFor({ timeout: 30000 });
      assert.equal(await gallery.locator('.gbif-card').count(), 0);
      assert.equal(await map.locator('.gbif-card').count(), 0);
    });

    await check('a synonym resolves to the accepted taxon and says so', async () => {
      await page.getByRole('button', { name: 'Felis concolor (synonym)' }).click();
      await card.locator('.gbif-taxon-card__note').filter({ hasText: 'Synonym' }).filter({ hasText: 'Felis concolor' }).waitFor({ timeout: 30000 });
      assert.match(await card.locator('.gbif-taxon-card__name').innerText(), /^Puma concolor/);
      await gallery.locator('.gbif-media-gallery__image').waitFor({ timeout: 30000 });
      assert.match(await gallery.locator('.gbif-media-gallery__image').getAttribute('alt'), /^Image of Puma concolor/);
    });

    await check('the themed card picks up host-page custom properties', async () => {
      const themed = page.locator('.themed gbif-taxon-card');
      await themed.locator('.gbif-taxon-card__name').waitFor({ timeout: 30000 });
      const badge = await themed.locator('.gbif-card__badge').evaluate((el) => getComputedStyle(el).backgroundColor);
      assert.equal(badge, 'rgb(138, 75, 8)');
      const title = await themed.locator('.gbif-card__title').innerText();
      assert.equal(title, 'Mountain lion');
    });

    // The search components have their own example page, so that each page makes a reasonable number of requests.
    // The live API limits clients by volume over time, and the checks above have used a good deal of it, so wait
    // a little before the next page (SMOKE_PAUSE_MS=0 to skip).
    await sleep(Number(process.env.SMOKE_PAUSE_MS ?? 45000));
    await page.goto(SEARCH_URL);

    // A check on this page that fails is tried again from a fresh load after a pause: when the API's limit has been
    // reached, components show an error until it recovers, which is the right behaviour but not a failure of the code.
    const liveRetry = async (fn, tries = 3, url = SEARCH_URL) => {
      for (let attempt = 1; ; attempt += 1) {
        try {
          return await fn();
        } catch (error) {
          if (attempt >= tries) throw error;
          console.log(`  (attempt ${attempt} failed: ${String(error.message).split('\n')[0]}; trying again from a fresh load)`);
          await sleep(Number(process.env.SMOKE_PAUSE_MS ?? 45000));
          await page.goto(url);
        }
      }
    };

    await check('one search drives the filter panel, the table, the gallery and the address', () => liveRetry(async () => {
      const table = page.locator('gbif-occurrence-table');
      const images = page.locator('gbif-occurrence-gallery');
      await table.locator('tbody tr').first().waitFor({ timeout: 60000 });
      await images.locator('img').first().waitFor({ timeout: 60000 });
      await page.locator('gbif-occurrence-filters .gbif-occurrence-filters__option', { hasText: 'Argentina' }).first().locator('input').check();
      await page.waitForFunction(() => /gbif_country=AR/.test(location.search), null, { timeout: 30000 });
      await page.waitForFunction(
        () => {
          const cells = [...document.querySelector('gbif-occurrence-table').shadowRoot.querySelectorAll('tbody tr td:nth-child(2)')];
          return cells.length > 0 && cells.every((cell) => cell.textContent.trim() === 'Argentina');
        },
        null,
        { timeout: 60000 }
      );
      // The gallery follows too, and its pictures come from GBIF's image cache, not the publishers.
      await page.waitForFunction(
        () => {
          const imgs = [...document.querySelector('gbif-occurrence-gallery').shadowRoot.querySelectorAll('img')];
          return imgs.length > 0 && imgs.every((img) => img.complete && img.naturalWidth > 0 && img.src.includes('/v1/image/cache/'));
        },
        null,
        { timeout: 60000 }
      );
    }));

    await check('a subset given as a predicate matches the plain search, and keeps the other countries listed', () => liveRetry(async () => {
      const panel = page.locator('gbif-occurrence-filters[search="#subset"]');
      const subsetTable = page.locator('gbif-occurrence-table[search="#subset"]');
      const key = '7ddf754f-d193-4cc9-b351-99906754a03b';
      await subsetTable.locator('tbody tr').first().waitFor({ timeout: 60000 });
      await panel.locator('.gbif-occurrence-filters__option', { hasText: 'Argentina' }).first().waitFor({ timeout: 60000 });
      const live = (query) =>
        page.evaluate(async (q) => (await (await fetch(`https://api.gbif.org/v1/occurrence/search?taxonKey=4QHKG&checklistKey=${q.key}&limit=0${q.query}`)).json()).count, { key, query });
      const shown = async (locator) => Number((await locator.first().innerText()).replace(/[^\d]/g, '').match(/^\d+/)[0]);

      // The panel's total is the plain search's count for the same subset.
      const both = await live('&country=AR&country=CL');
      await page.waitForFunction((n) => document.querySelector('gbif-occurrence-filters[search="#subset"]').shadowRoot.querySelector('.gbif-occurrence-filters__total')?.textContent.replace(/,/g, '').includes(String(n)), both, { timeout: 60000 });
      assert.equal(await shown(panel.locator('.gbif-occurrence-filters__total')), both);
      const countries = await panel.locator('fieldset', { hasText: 'Country' }).first().locator('.gbif-occurrence-filters__option-label').allInnerTexts();
      assert.deepEqual(countries.sort(), ['Argentina', 'Chile'], 'only what the subset leaves');

      // Choosing Argentina narrows the table, and Chile stays listed, with its own count.
      await panel.locator('.gbif-occurrence-filters__option', { hasText: 'Argentina' }).first().locator('input').check();
      const argentina = await live('&country=AR');
      const chile = await live('&country=CL');
      await page.waitForFunction((n) => document.querySelector('gbif-occurrence-table[search="#subset"]').shadowRoot.querySelector('.gbif-occurrence-table__summary')?.textContent.replace(/,/g, '').includes(String(n)), argentina, { timeout: 60000 });
      await page.waitForFunction(
        (n) => [...document.querySelector('gbif-occurrence-filters[search="#subset"]').shadowRoot.querySelectorAll('.gbif-occurrence-filters__option')].some((o) => o.textContent.includes('Chile') && o.textContent.replace(/,/g, '').includes(String(n))),
        chile,
        { timeout: 60000 }
      );
    }));

    await check('an occurrence page shows the record in Darwin Core groups, with its image and a map, each term once', () =>
      liveRetry(async () => {
        await page.goto(DETAIL_URL);
        await page.locator('gbif-occurrence-groups section').first().waitFor({ timeout: 60000 });
        const titles = await page.locator('gbif-occurrence-groups [role=heading]').allInnerTexts();
        const order = ['Record-level', 'Occurrence', 'Event', 'Location', 'Identification', 'Taxon', 'GBIF processing'];
        assert.deepEqual(titles.filter((t) => order.includes(t)), order.filter((t) => titles.includes(t)), 'in the standard\'s order');
        for (const wanted of ['Record-level', 'Event', 'Location', 'Taxon']) assert.ok(titles.includes(wanted), `${wanted} in ${titles}`);

        // No term twice in a card: GBIF writes some terms twice (its own rewrite and the publisher's).
        const duplicates = await page.evaluate(() =>
          [...document.querySelector('gbif-occurrence-groups').shadowRoot.querySelectorAll('section')].flatMap((card) => {
            const labels = [...card.querySelectorAll('.gbif-groups__term')].map((dt) => dt.textContent.trim());
            return labels.filter((label, i) => labels.indexOf(label) !== i).map((label) => `${card.dataset.group}: ${label}`);
          })
        );
        assert.deepEqual(duplicates, []);

        // The picture comes from GBIF's image cache, and there is a map of the location.
        await page.waitForFunction(
          () => {
            const imgs = [...document.querySelector('gbif-occurrence-images').shadowRoot.querySelectorAll('img')];
            return imgs.length > 0 && imgs.every((img) => img.complete && img.naturalWidth > 0 && img.src.includes('/v1/image/cache/'));
          },
          null,
          { timeout: 60000 }
        );
        await page.locator('gbif-occurrence-location .leaflet-container').waitFor({ timeout: 60000 });
        assert.match(await page.locator('#title').innerText(), /Puma concolor/);
      }, 3, DETAIL_URL)
    );

    await check('details come from the Taxon API, never the deprecated Species API', async () => {
      assert.ok(gbifRequests.some((p) => p.startsWith('/v2/taxon/tree/')), 'classification from /v2/taxon/tree');
      assert.ok(gbifRequests.some((p) => /^\/v2\/taxon\/[^/]+\/[^/]+$/.test(p)), 'name usage from /v2/taxon');
      assert.deepEqual(gbifRequests.filter((p) => p.startsWith('/v1/species')), []);
    });

    await check('no uncaught page errors', async () => {
      assert.deepEqual(pageErrors, []);
    });

    await page.screenshot({ path: path.join(SHOTS, 'examples-final.png'), fullPage: true });
    console.log('\nAll browser checks passed.');
  } catch (error) {
    await page.screenshot({ path: path.join(SHOTS, 'examples-failure.png'), fullPage: true }).catch(() => {});
    console.error('\nFAILED:', error.message);
    console.error('Event log:\n' + (await log.innerText().catch(() => '(unavailable)')));
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.kill();
    process.exit(process.exitCode ?? 0);
  }
})();
