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
  const gallery = page.locator('gbif-media-gallery');
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
      await card.locator('.gbif-taxon-card__synonym').filter({ hasText: 'Felis concolor' }).waitFor({ timeout: 30000 });
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
