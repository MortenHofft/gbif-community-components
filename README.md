# GBIF Community Components

A community-driven collection of **web components** that expose content from [GBIF](https://www.gbif.org) (the Global Biodiversity Information Facility) in a form that can be dropped into any website.

The goal is to make it easy to show GBIF-mediated biodiversity data on custom sites: a museum page about a species, a national park's checklist, a university course site, a conservation NGO's news page, or a citizen-science project. Instead of each site re-implementing GBIF API calls, layout and attribution, a site author adds a single HTML element and gets a working, styled, accessible component.

> **Status:** early prototype. Fourteen elements exist: for one taxon (taxon card, media gallery, occurrence map, type specimens), for searching occurrences (search, filter panel, table, image gallery), for one occurrence (record, Darwin Core groups, images, location map, extensions), and a page-footer attribution. They try out the approach. They are not published anywhere yet, and names, attributes and events may still change.

## Why web components?

- **Framework-agnostic.** They work in plain HTML, WordPress, Drupal, Hugo/Jekyll, static site generators, React/Vue/Svelte apps, and so on.
- **Standard browser APIs.** Custom elements, Shadow DOM and HTML templates are supported natively in all evergreen browsers. No build step is required to *use* a component.
- **Encapsulated.** Styles and markup do not leak into the host page, and host page styles can be customised through documented CSS custom properties.

## Benefits and limitations

Please weigh these before adopting the components on a site.

**Benefits**

- **Easy to integrate.** One script tag and one HTML element, with no framework or build step required on the host site.
- **Credit built in.** Every image is shown with its rights holder and licence, and neither can be hidden. Source notes ("data from GBIF", the checklist and its version) are on by default, and can be moved to one note in your page footer.
- **Live data.** Content comes from GBIF's APIs, so it stays current without anyone maintaining a copy.
- **Isolated by default.** The encapsulated build does not clash with the host site's CSS or scripts.
- **Shared maintenance.** Fixes and improvements in one component benefit every site that uses it.

**Limitations**

- **Not server-side rendered.** Content is fetched and drawn in the visitor's browser. Visitors without JavaScript see nothing, and search engines or other crawlers that do not run JavaScript will not index the content. The same goes for print previews of a page that has not finished loading and for CMS editors that do not run scripts. If search visibility of this content matters, fetch the data yourself and render it on your server, or treat these components as a complement to your own pages.
- **Content appears after load.** There is a short delay while data is fetched. Components show loading states and, unless you add `reserve-space`, may shift the page layout when they fill in.
- **Dependent on the GBIF API.** If the API is slow, unavailable or rate limiting, components show an error and fire a `gbif-error` event. GBIF limits how many requests a client may send over time, and answers the excess with 429 (this project's own testing reached the limit). A page of many components sends many requests at once, so the client sends at most four at a time, and tries a rate-limited or unavailable answer (429, 503) or a dropped connection again, up to twice, with growing pauses. Requests give up after 15 seconds. The occurrence search components make several requests for every change to the filters, and a page with many of them can still be throttled: on a busy site put a caching proxy in front and point `api-base` at it. Sites with very high traffic should put a caching proxy in front of the API and point `api-base` at it. The image gallery uses an endpoint whose path contains `experimental`; it can change without notice.
- **Visitors' browsers contact several servers directly** (see [Privacy and security policies](#privacy-and-security-policies)). That exposes visitors' IP addresses, and the page's address as referrer, to GBIF and to the hosts of the images shown. Mention this in your privacy notice where it applies.
- **Content you do not control.** Data, names, classifications and images change as publishers update their datasets, and not every record has media. By default the taxonomy comes from the Catalogue of Life, whose content changes with every edition (see [Which taxon do I get?](#which-taxon-do-i-get)).
- **Styling limits in the encapsulated build.** Theming is done through documented CSS custom properties and `::part()`. Anything beyond that needs the light-DOM build, which does not exist yet.

## Which taxon do I get?

A taxon key only means something **inside a checklist**: the same key can be a different taxon, or nothing, in another one. Every lookup therefore uses a checklist, set with `checklist-key` (or once for the page, see [Configuration](#configuration)).

- **The default checklist is the Catalogue of Life**, the key `7ddf754f-d193-4cc9-b351-99906754a03b`. GBIF serves successive Catalogue of Life editions under that one key, so what it contains changes about monthly: names get accepted, merged or deleted, and opaque keys such as `4QHKG` are not promised to stay the same. Taxon cards show which edition they used ("Taxonomy: Catalogue of Life 2026-10-16 XR"). If you need a fixed taxonomy, pin another checklist key.
- **Keys copied from a gbif.org species page are GBIF *backbone* keys** (for example `2435099`) and do not exist in the Catalogue of Life. To use them, set `checklist-key` to the backbone's key. A key that is not found gives "No taxon with key … was found in this checklist" and a `gbif-taxon-notfound` event.
- **`scientific-name` is matched against the checklist**, and only a confident match is used: confidence of at least 80, and a match type of `EXACT`, `VARIANT` (a spelling variant) or `HIGHERRANK`. A card says when a name was matched as a variant, or to a higher taxon than the one asked for (for example a subspecies name that GBIF only knows at species level). Other components use the matched taxon without comment, so use `taxon-key` when you need exactly one taxon.
- **Homonyms need help.** Names such as *Ficus* or *Oenanthe* match several taxa and give no match at all. Add `kingdom` (and, if needed, `rank`) to say which one you mean: `<gbif-taxon-card scientific-name="Ficus" kingdom="Plantae">`.
- **Synonyms and other non-accepted names** (synonym, ambiguous synonym, misapplied name, and so on) resolve to the accepted taxon. The card names what the name was ("Misapplied: …"), and the other components use the accepted taxon.

## Technology choices

- **[Lit](https://lit.dev)** (from Google) for building the components. Lit is a small layer over the standard web component APIs. It provides reactive properties, efficient rendering and a convenient way to write templates and styles, without the weight of a full framework.
- **Plain, hand-written CSS** for styling. No utility-class framework such as Tailwind.
- **BEM naming** for CSS class names, such as `gbif-taxon-card__title`. Inside the Shadow DOM build it does not matter for isolation, but it keeps markup predictable for contributors and prepares the light-DOM build.
- **CSS custom properties** as the theming interface, so site authors can restyle components from their own stylesheets. Each component reads them with a fallback, so it looks right without any configuration.
- **Two build outputs:**
  - **Encapsulated** (Shadow DOM): the default, and the only one that exists.
  - **Light DOM**: for authors who need detailed styling control. **Kept open, not built.** To be decided before building it: the card styles use `:host` and shadow-only features, `<slot>` and `::part()` do not exist without a shadow root, and the shared `.gbif-card` styles would have to become scoped global CSS that the host page's own rules can reach. It stays on the plan unless that turns out to cost more than the extra styling control is worth. More `::part()`s may cover most of the need instead.

## Data fetching and URL state

Components share one data layer instead of each doing its own thing.

- **A shared API client** (`src/shared/api.js`) is the only code that talks to the GBIF APIs. Components never call `fetch` directly. It builds URLs (the API base may carry a path prefix or be relative to the page, for a same-origin proxy), shares identical in-flight requests, sends at most four at a time, gives up on a request after 15 seconds, tries a throttled one again (up to twice), and never remembers a failure. Components also ignore a response that arrives after their taxon has changed.
- **Caching follows what the API says.** GBIF sends `Cache-Control` with `max-age` (10 minutes for occurrence searches, 20 minutes for map capabilities, about an hour for taxon data, 2 days for basemap tiles), but the API also sends `Pragma: no-cache` and `Expires: 0`, and browsers then fetch again on every page view, ignoring the max-age. So the client keeps successful responses in `sessionStorage` for the `max-age` the API gave (at most an hour), and in memory for the life of the page (up to 200 entries). The storage is per tab, holds only public API responses, is cleaned of everything it wrote when it fills up, and is optional: if storage is blocked, requests go to the network. A strict privacy policy may still want to list it.
- **URL state is opt-in, and belongs to the search element.** Components do not touch the page's URL, except `<gbif-occurrence-search sync-url>`, which keeps the visitor's filters in namespaced query parameters (see [Searching occurrences](#searching-occurrences)).
- **Components on the same page** coordinate in two ways. Components about one taxon use events (see [Events](#events)): the page listens and sets attributes. Components that show one *search* (filter panel, table, gallery) share a query through `<gbif-occurrence-search>` and never talk to each other. No state-management library is planned.

## Server-side rendering

Components are **client-side rendered**: the browser loads the script, the component fetches its data from GBIF and draws itself. Crawlers and visitors that do not run JavaScript see an empty element.

Server-side rendering (SSR) is possible in principle, since Lit has experimental SSR support and browsers support Declarative Shadow DOM, but it is not a goal of the first versions. Neither build would be easier to index by itself: client-rendered light DOM is as invisible to a crawler without JavaScript as client-rendered Shadow DOM. Two things would keep the option open, and **neither is done yet**: accepting pre-fetched data (an inline JSON attribute) so a site can render the content itself, and using the element's children as fallback content.

## Components

```html
<script type="module" src="gbif-components.js"></script>

<gbif-taxon-card scientific-name="Puma concolor"></gbif-taxon-card>
<gbif-media-gallery taxon-key="4QHKG" limit="12" licenses="commercial"></gbif-media-gallery>
<gbif-occurrence-map taxon-key="4QHKG"></gbif-occurrence-map>
<gbif-type-specimens taxon-key="4QHKG" page-size="5"></gbif-type-specimens>

<gbif-attribution></gbif-attribution>
```

| Element | Shows | Own attributes |
| --- | --- | --- |
| `gbif-taxon-card` | Name, how it was matched, synonym note, clickable classification, occurrence count, link to GBIF.org | `follow-selection` |
| `gbif-media-gallery` | Images with rights holder and licence. Renders nothing if there are none. | `limit` (1–300, default 20), `licenses` |
| `gbif-occurrence-map` | Density map of georeferenced occurrences. Renders nothing if there are none. | `basemap`, `basemap-url`, `basemap-attribution` |
| `gbif-type-specimens` | Paged list of type specimens (species and genus only). Renders nothing if there are none. | `page-size` (1–300, default 10) |
| `gbif-attribution` | One source note for the whole page, for a footer. Anything inside the element is shown after it. | `checklist-key`, `api-base`, `site-base` |

The first four share these attributes:

| Attribute | Meaning |
| --- | --- |
| `taxon-key` | A taxon key **in the checklist** (see [Which taxon do I get?](#which-taxon-do-i-get)). Takes precedence over `scientific-name`. |
| `scientific-name` | A name to match against the checklist. |
| `kingdom`, `rank` | Narrow a name match, to tell homonyms apart. |
| `checklist-key` | The checklist used for matching, details and classification. Defaults to the Catalogue of Life. |
| `api-base` | GBIF API base URL (default `https://api.gbif.org`). May have a path (`https://example.org/gbif-proxy`) or be relative to the page (`/gbif-proxy`), for a caching proxy. |
| `site-base` | Website that links point to (default `https://www.gbif.org`). |
| `heading` | Replaces the card title. |
| `heading-level` | Level of the card title, 1–6 (default 2), so it fits your page's outline. |
| `hide-source` | Hide the "data from GBIF" source note (see [Source notes](#source-notes)). |
| `reserve-space` | Keep the room free while loading, to avoid layout shift. The space is released if the card turns out to have nothing to show. |

Changing `taxon-key`, `scientific-name`, `kingdom`, `rank`, `checklist-key` or `api-base` after the page has loaded reloads the component. Changing `limit`, `licenses` or `page-size` reloads only that component's own data.

A card without `taxon-key` or `scientific-name` renders nothing.

### Image licences

The gallery shows every licence by default. To show only some, list them in `licenses`:

| Value | Shows |
| --- | --- |
| `cc0`, `pdm` | CC0, Public Domain Mark |
| `cc-by`, `cc-by-sa`, `cc-by-nd` | CC BY, BY-SA, BY-ND |
| `cc-by-nc`, `cc-by-nc-sa`, `cc-by-nc-nd` | the non-commercial licences |
| `unknown` | images with no, or an unrecognised, licence |
| `commercial` | shortcut: every licence that allows commercial use (`cc0`, `pdm`, `cc-by`, `cc-by-sa`, `cc-by-nd`) |
| `derivatives` | shortcut: every licence that allows adapting the work (`cc0`, `pdm`, `cc-by`, `cc-by-sa`, `cc-by-nc`, `cc-by-nc-sa`) |
| `all` | no filter (the default) |

Values are separated by commas or spaces: `licenses="cc0, cc-by"`. The API cannot filter by licence, so the gallery asks for up to 300 images and filters in the browser. Without a filter, a large share of the images for many species are non-commercial: **check the licences against what your site does**. The rights holder and licence of each image are always shown, and a missing one is shown as "not stated".

### Map

The map uses GBIF's own basemaps by default, so no third-party map service is involved: `basemap` is `light` (default), `classic`, `dark`, `geyser`, `tuatara` or `bright`. To use another tile service, give `basemap-url` (a `{z}/{x}/{y}` template) and `basemap-attribution`; the basemap picker is then hidden. Basemap tiles carry their own attribution, which is always shown. Height is `--gbif-map-height`.

### Source notes

Cards say where their data comes from ("Taxonomy: Catalogue of Life 2026-10-16 XR. Occurrence data from GBIF."). With many GBIF cards on one page, or data from several sources, that is better said once. Either put `hide-source` on the cards, or hide them page-wide, and add `<gbif-attribution>` to your footer:

```html
<gbif-taxon-card taxon-key="4QHKG" hide-source></gbif-taxon-card>
...
<footer>
  <gbif-attribution>Maps by Example Council.</gbif-attribution>
</footer>
```

Source notes are the only credit that can be hidden. Each image's rights holder and licence, and the basemap's attribution, stay.

### Configuration

Set defaults once for the page instead of on every element. A plain HTML page can use the one global the bundle defines (the first copy of the bundle loaded wins):

```html
<script>
  GbifComponents.configure({
    apiBase: '/gbif-proxy',          // your caching proxy
    siteBase: 'https://www.gbif.org',
    checklistKey: '…',               // your checklist
    showSource: false,               // you use <gbif-attribution> instead
    timeoutMs: 15000
  });
  console.log(GbifComponents.version);
</script>
```

Passing `null` for a key removes the override. An attribute on an element beats `configure()`, which beats the built-in default. In a module, import `configure` from the bundle instead.

### Events

Components tell the page what happened through DOM events. All of them bubble and cross the Shadow DOM boundary, so a page can listen on the element, on a wrapper, or on `document`.

| Event | When | `detail` |
| --- | --- | --- |
| `gbif-taxon-resolved` | A taxon was found | `taxonKey`, `scientificName`, `rank`, `isSynonym`, `matchType`, `confidence`, `checklistKey` |
| `gbif-taxon-notfound` | No taxon (or no confident match) was found | `query`, `byKey`, `matchType`, `confidence`, `checklistKey` |
| `gbif-taxon-select` | A visitor clicked a taxon in the classification, or "View on GBIF.org" (cancelable) | `taxonKey`, `scientificName`, `rank`, `checklistKey`, `source` (`classification` or `gbif-link`) |
| `gbif-occurrence-select` | A visitor clicked an image's "details" link, a type specimen, a name in the table, or a picture in the occurrence gallery (cancelable) | `occurrenceKey`, `source` (`media`, `type-specimens`, `table`, `gallery`) |
| `gbif-occurrences-select` | A visitor clicked the occurrence count, or the gallery's "all" link (cancelable) | `taxonKey`, `checklistKey`, `url`, `source` |
| `gbif-map-explore` | A visitor clicked "Explore on GBIF.org" (cancelable) | `bounds`, `geometry` (WKT), `url` |
| `gbif-query-change` | An occurrence search's filters, or its own attributes (including `predicate`), changed. Fired by `gbif-occurrence-search`. | `query` (all filters in force), `userQuery`, `params` (the plain search's request parameters), `predicate` (everything that narrows the search as one predicate, `q` apart, or `null`), `source` (`update`, `reset`, `url` for back and forward, `attributes`) |
| `gbif-error` | A request failed or timed out, an image or the map could not load, or a search's `predicate` is not valid | `component`, `url`, `status`, `message` |

**Cancelable events are navigation intents.** Links in the components point at GBIF.org, but a plain click first fires the event. If the page calls `preventDefault()`, nothing is opened and the page decides what to do, for example show the taxon on its own pages. Clicks with a modifier key (open in a new tab) are left to the browser. The licence link, the link to the checklist and the basemap's attribution links are not intents: they are credit.

```js
const card = document.querySelector('gbif-taxon-card');

card.addEventListener('gbif-taxon-select', (event) => {
  event.preventDefault(); // do not open GBIF.org
  const { taxonKey, scientificName, rank } = event.detail;
  document.querySelector('gbif-media-gallery').taxonKey = taxonKey;
  history.pushState({}, '', `/taxa/${taxonKey}`);
});
```

Add `follow-selection` to the card to let it load a taxon clicked in the classification itself, if the page did not cancel the event. A page can still listen to keep other components in step. [`examples/index.html`](examples/index.html) does this with all four components. The `geometry` in `gbif-map-explore` is a polygon, or a multipolygon when the visible area crosses the antimeridian.

### GBIF APIs used

| Need | API |
| --- | --- |
| Turn a name into a taxon key | `v2/species/match` (only when `scientific-name` is used) |
| Taxon details | `v2/taxon/{checklistKey}/{taxonKey}` ([Taxon API](https://techdocs.gbif.org/en/openapi/v2/taxon)) |
| Classification | `v2/taxon/tree/{checklistKey}/{taxonKey}` |
| Checklist title and version (source notes) | `v2/taxon/checklist/{checklistKey}` |
| Occurrence count, type specimens | `v1/occurrence/search` |
| Filter panel, table, gallery | `v1/occurrence/search`, with `facet` (counts for the panel), and `mediaType=StillImage` (gallery) |
| The same, for a search with a `predicate` | `POST v1/occurrence/search/predicate` |
| One occurrence, interpreted and as published | `v1/occurrence/{key}`, `v1/occurrence/{key}/verbatim` |
| Small versions of images | `v1/image/cache/fit-in/400x/occurrence/{occurrenceKey}/media/{md5 of the image URL}` |
| Images | `v1/occurrence/experimental/multimedia/species/{checklistKey}/{taxonKey}` |
| Map | `v2/map/occurrence/density/…` |
| Basemap | `tile.gbif.org` |

Taxon details always come from the Taxon API, which replaces the deprecated v1 Species API. The Species API is not used. The Taxon API is currently served under `/v2/experimental/taxon` as well, and both paths return the same data today. The components use the documented `/v2/taxon` path.

### Privacy and security policies

A visitor's browser contacts these hosts directly. Your own `api-base` replaces only the API host, and `basemap-url` the basemap.

| Host | For |
| --- | --- |
| `api.gbif.org` | All data, and the occurrence layer of the map |
| `tile.gbif.org` | The default map basemap (carries OpenStreetMap and OpenMapTiles data) |
| **Whatever hosts the images** | Images in `<gbif-media-gallery>`. GBIF returns links to the publishers' own servers, so this is not a fixed list: many are on `inaturalist-open-data.s3.amazonaws.com`, others are anywhere. Images are requested with `referrerpolicy="no-referrer"`, so your page's address is not sent to them. `<gbif-occurrence-gallery>` avoids this: it asks GBIF's image cache (`api.gbif.org`) and only falls back to the publisher if that has no picture. |

For a **Content Security Policy** the smallest working policy that was tested is `script-src` for the bundle's origin, `connect-src https://api.gbif.org`, and `img-src https: data:`, with no `style-src` needed. Because image hosts cannot be listed in advance, a strict `img-src` blocks the images in `<gbif-media-gallery>` ("Image failed to load", and a `gbif-error` event). The occurrence gallery needs only `api.gbif.org` while the image cache has the picture, and `https:` for its fallback. A stricter `img-src` works if you proxy images yourself, or leave the gallery out. With `require-trusted-types-for 'script'` the map does not render, because Leaflet assigns HTML; the other components work. Responses are kept in `sessionStorage` (see above). If the bundle is served from another origin than the page, that origin must send CORS headers for the bundle file and its chunks.

## Searching occurrences

Occurrence search is not one component but a set that share one query, so that a filter panel, a table and a gallery of images always agree, and the page needs no glue code:

```html
<gbif-occurrence-search id="s" taxon-key="4QHKG" sync-url></gbif-occurrence-search>

<gbif-occurrence-filters search="#s"></gbif-occurrence-filters>
<gbif-occurrence-table   search="#s" page-size="20"></gbif-occurrence-table>
<gbif-occurrence-gallery search="#s" page-size="24"></gbif-occurrence-gallery>
```

`<gbif-occurrence-search>` draws nothing. It holds the **filters**, and the other three read and change them through it: choosing a country in the panel makes the table and gallery load again, from the first page. They never talk to each other, so there are no event loops and no component is out of step. A component finds its search by `search="#s"` (a CSS selector, so it can be anywhere on the page: a sidebar, a footer) or by being placed **inside** the search element. The search element must exist once the page has been read; one added later is not looked for. A component that finds none says so. [`examples/index.html`](examples/index.html) shows all of it.

| Element | Shows | Own attributes |
| --- | --- | --- |
| `gbif-occurrence-search` | Nothing. Holds the filters. | `taxon-key`, `dataset-key`, `predicate`, the author's filters below, `sync-url`, `url-prefix`, `url-history`; `checklist-key`, `api-base`, `site-base` |
| `gbif-occurrence-filters` | A panel: free text, country, basis of record, year range, the licence of the record, "only records with coordinates". Lists show how many occurrences each value gives. | `filters`, `facet-limit` (1–100, default 15) |
| `gbif-occurrence-table` | The occurrences, a page at a time. A search with no results says so. | `columns`, `page-size` (1–100, default 20) |
| `gbif-occurrence-gallery` | The occurrences that have a still image, as a grid, with each image's rights holder and licence. | `page-size` (1–100, default 24), `licenses`, `images` |

All three also take `heading`, `heading-level` and `hide-source`, like the other components.

### Filters

The names are GBIF's own occurrence search parameters, so one query is also an API request, a page address, and a link to GBIF.org.

| Filter | Value | Notes |
| --- | --- | --- |
| `country` | one or more ISO codes (`NO`, `SE`) | Shown with country names |
| `basisOfRecord` | one or more of GBIF's values (`HUMAN_OBSERVATION`, …) | |
| `year` | `2000`, `2000,2020`, `2000,*` or `*,1990` | A reversed range is put right |
| `license` | `CC0_1_0`, `CC_BY_4_0`, `CC_BY_NC_4_0` | The licence of the **record** |
| `hasCoordinate` | `true` | |
| `q` | text | Up to 200 characters |

Every value is checked before it is sent or written to an address, and an invalid one (a country GBIF does not know, a year that is not a number) is dropped, because the API answers those with an error. The same goes for values taken from the page's address.

**The page author's filters.** Set filters as attributes on the search element: `<gbif-occurrence-search taxon-key="4QHKG" country="NO" year="2000,*">`. Visitors cannot change or remove these, the filter panel does not offer them, and they are never written to the address. Filters a visitor chooses are separate, and `setFilters()` ignores an attempt to change a fixed one.

**From script.** `search.setFilters({ country: ['NO'], year: '2000,*' })` changes the visitor's filters (`null`, `''` or `[]` removes one), `search.reset()` clears them, and `search.query`, `search.userQuery` and `search.params` read them. A change fires `gbif-query-change`.

### A subset as a predicate

A page author's subset can be a GBIF **predicate**, which says what the plain filters cannot: `or`, `not`, a geometry, a long list of datasets or taxa. The visitor still searches within it.

```html
<gbif-occurrence-search id="s" predicate='{
  "type": "and",
  "predicates": [
    { "type": "equals", "key": "TAXON_KEY", "value": "4QHKG", "checklistKey": "7ddf754f-d193-4cc9-b351-99906754a03b" },
    { "type": "in", "key": "COUNTRY", "values": ["AR", "CL"] },
    { "type": "not", "predicate": { "type": "equals", "key": "BASIS_OF_RECORD", "value": "FOSSIL_SPECIMEN" } }
  ]
}'></gbif-occurrence-search>
```

The predicate types are `and`, `or`, `not`, `equals`, `in`, `like`, `range`, `greaterThan`, `greaterThanOrEquals`, `lessThan`, `lessThanOrEquals`, `isNull`, `isNotNull`, `within` and `geoDistance`, with GBIF's own keys (`COUNTRY`, `DATASET_KEY`, `YEAR`, …). See GBIF's [occurrence API documentation](https://techdocs.gbif.org/en/openapi/). (The API also lists a `fullTextSearch` type, but it refused every form tried here. Use the search's `q` filter for free text; it is sent beside the predicate.) Of these, `and`, `or`, `not`, `equals`, `in`, `like`, `within`, `isNotNull` and year comparisons were checked against the live API; the others are passed through for the API to judge.

- **The subset applies in full to everything.** The table, the gallery and the panel's counts all see it, so the panel lists only the countries (and so on) that the subset leaves. The visitor's filters narrow it further, and `taxon-key` and `dataset-key` are added to it.
- **Multiselect still works.** On a predicate search a facet is narrowed by every filter, including its own, so choosing Argentina would hide Chile. The panel therefore asks for a filter's own counts in a request that leaves *that visitor's filter* out (and keeps the subset), so the other values stay listed.
- **Free text** (`q`) is sent beside the predicate, as GBIF's API wants.
- **An invalid predicate is never ignored.** Dropping it would search *everything* GBIF has: a predicate request without a predicate returns all 3.9 billion occurrences. So a predicate that is not valid JSON, has an unknown type or lacks a part it needs, makes the components that use the search show an error, fires `gbif-error`, and sends no request until it is fixed. An empty `predicate` attribute is the same as none.
- **The predicate comes from the page, never from the address.** The address only holds the visitor's own filters, and the predicate is never written to it.
- **`checklistKey` goes inside a `TAXON_KEY` part** (as above). At the top of the request GBIF ignores it and reads the key as a backbone key, which finds nothing for a Catalogue of Life key. Components do this for `taxon-key` themselves.
- **What it costs.** A predicate search is a POST. Browsers cache no POST, and each one is preceded by a CORS preflight request (the API accepts only `application/json`, so it cannot be avoided). The client keeps each answer for as long as the API says, under the body of the request, as it does for other requests, and never asks the same thing twice. A change to the filters sends the table's request, the gallery's, one for the panel's counts of filters that are not set, and one more for each of the panel's filters that is: three requests at first and about four more for each change that sets a country, against three for plain filters. Plain filters are used when there is no `predicate`, because a GET is cheaper and cacheable.
- **Not a GBIF "download".** A predicate here is a search, with the same limits (at most 100,000 results can be paged through).

### The page address

With `sync-url`, the visitor's filters are kept in the address: `?gbif_country=NO&gbif_country=SE&gbif_year=2000,*`.

- The filters are read from the address when the page loads, so a copied address gives the same search.
- A change by the visitor adds a history entry, so **back and forward** work (`url-history="replace"` replaces the current entry instead).
- Other parameters and the `#fragment` are left alone.
- The prefix is `url-prefix` (default `gbif_`). Give each search on a page its own, and `url-prefix=""` for none. A search without `sync-url` ignores the address.
- Paging is not in the address.

Anything in the address is untrusted: it is validated like every other filter value.

### Table and gallery

The table's `columns` is a list chosen from `scientificName`, `country`, `eventDate`, `year`, `basisOfRecord`, `recordedBy`, `dataset`, `institution`, `license` (default: `scientificName country eventDate basisOfRecord dataset`); names not in the list are ignored. Values from the records are shown as text. GBIF does not page past 100,000 results, and nor do these two.

The gallery asks only for occurrences with a still image, and shows the first image of each. Its `licenses` works like the one on `<gbif-media-gallery>` (see [Image licences](#image-licences)) and filters **each image's** licence. That is not the panel's licence filter, which is about the licence of the *record*. A page can show fewer images than its `page-size` when `licenses` hides some. `images` is `gbif` (default) or `original`:

- `gbif` shows small versions (400 px wide) from GBIF's image cache. Visitors' browsers then contact GBIF for the pictures and not the publishers' servers, and download a fraction of the bytes (a few kilobytes instead of a few hundred). If the cache has no picture, the publisher's file is tried, and then a message is shown with the credit.
- `original` shows the publishers' full-size files.

A failed page of the same search keeps what is on screen and says so. A failed new search (the visitor changed a filter) clears it, since the old rows would be wrong for the new filters.

## Occurrence pages

A page about one occurrence: its record sorted into Darwin Core's groups, its images, a map of where it was, and its extensions, **one card for each**. Like the search components, they share one element that holds the data:

```html
<gbif-occurrence-record id="r" occurrence-key="5938145577"></gbif-occurrence-record>

<gbif-occurrence-images     record="#r"></gbif-occurrence-images>
<gbif-occurrence-location   record="#r"></gbif-occurrence-location>
<gbif-occurrence-groups     record="#r"></gbif-occurrence-groups>
<gbif-occurrence-extensions record="#r"></gbif-occurrence-extensions>
```

`<gbif-occurrence-record>` draws nothing but one message when the record cannot be shown. It fetches the record once, however many cards there are, and the cards follow it. A card finds its record by `record="#r"` (a selector, so it can be anywhere on the page) or by being placed inside it, exactly as the search components find their search. [`examples/occurrences.html`](examples/occurrences.html) is a search whose results open [`examples/occurrence.html`](examples/occurrence.html), which shows all of it. (A page's own code cancels `gbif-occurrence-select` and opens its own page: see the example.)

| Element | Shows | Own attributes |
| --- | --- | --- |
| `gbif-occurrence-record` | Nothing. Holds the record. | `occurrence-key`, `api-base`, `site-base` |
| `gbif-occurrence-groups` | The record sorted into Darwin Core groups, a card for each. | `groups` |
| `gbif-occurrence-images` | The images, each with its credit and licence. Other media (sound, video) as links. | `images` |
| `gbif-occurrence-location` | A map of the location, with the coordinate uncertainty drawn. | `basemap`, `basemap-url`, `basemap-attribution` |
| `gbif-occurrence-extensions` | A card for each extension, as a table. | `exclude`, `only` |

The cards also take `heading`, `heading-level` and `hide-source`.

### Darwin Core groups

Darwin Core sorts its terms into classes. The groups follow the standard's order, and a group the record has nothing for is left out:

| Group | What it holds |
| --- | --- |
| Record-level | The record itself: licence, rights holder, institution and dataset, basis of record |
| Occurrence | Catalogue number, who recorded it, life stage, occurrence status |
| Organism | The individual organism |
| Material entity | The specimen or sample: preparations, disposition |
| Event | Date, habitat, sampling |
| Location | Country, locality, coordinates, uncertainty, elevation and depth |
| Geological context | Formation, member, bed, geological time |
| Identification | Type status, who identified it and when |
| Taxon | The name and its classification |
| GBIF processing | GBIF's own: keys, processing dates, the issue flags. Not Darwin Core. |
| Other terms | Terms the publisher used that are not Darwin Core, as published |

GBIF serves each record twice: **interpreted** (what GBIF made of it: a country name for a code, coordinates as numbers, enumerations such as `HUMAN_OBSERVATION`) and **verbatim** (as published, with the extensions). A row shows the interpreted value, made readable, and *As published:* beneath it when the published value differs. A formatting difference is not a difference: `44.59237` and `44.592370`, a licence as a label and as an address, and the same moment written two ways are one value. A term only the publisher gave is shown as published. Values with several parts (`a|b`) are one to a line, and an address is a link only if it is a web address.

The grouping is a fixed table of Darwin Core's terms, so a term added to the standard later is in "Other terms" until the table is updated. A term GBIF did not recognise is in the interpreted record under its own `unknown.org` rewrite as well as in the verbatim one; it is shown once.

`groups` chooses which cards, and in what order, so a page can put them where it likes: `<gbif-occurrence-groups groups="location event">`. With one group, `heading` replaces the title. The cards fill the width in columns at least `--gbif-group-min-width` wide (default 22rem), running down one column and then the next.

### Images, location and extensions

- **Images** come from GBIF's image cache, 600 px wide, so visitors' browsers contact GBIF and not the publisher; if the cache has no picture the publisher's file is tried, then a message with the credit (`images="original"` skips the cache). Each shows its title, who made it, the rights holder, the publisher and its licence, which cannot be hidden, and links to the publisher's page for the image. The record's `media` are used, and only `http(s)` addresses.
- **Location** draws the point and, when the record gives a coordinate uncertainty, a circle of that radius, fitted to the view. A record without usable coordinates shows no map card (and Leaflet is not downloaded). Basemaps are GBIF's, as for the other maps.
- **Extensions** are the extra tables a publisher attaches to a record (measurements, resource relationships, DNA-derived data, …), one card each, with the columns its records use, as published. `Multimedia` is left out by default, because the images card shows it (`exclude=""` shows it too, `exclude="Multimedia, Identification"` leaves more out, `only="measurement or fact"` shows just those). A long extension is cut at 100 rows and says how many are left. The extension cards were checked with test records (measurements, resource relationships, DNA-derived data); the live record the example uses has only Multimedia.

### What is shown when it goes wrong

The record element says it once, so the cards need not each say it: **not found** (and a `gbif-record-notfound` event), **not a key** (a key is digits only, and anything else is never put into an address), or **could not load** (and a `gbif-error`). If only the published record fails, the interpreted one is still shown, without "As published", and a `gbif-error` tells the page. While a record loads, or after its key changes, the cards show nothing of the previous one.

Events: `gbif-record-load` (`occurrenceKey`, `scientificName`, `basisOfRecord`, `datasetName`, `country`, `eventDate`, enough for a page title), `gbif-record-notfound`, `gbif-error`, and `gbif-record-change` (`status`, `occurrenceKey`), which the cards listen to.

## Getting started

```bash
npm install
npm run dev                       # example page with live reload
npm run build                     # writes dist/
npm test                          # unit tests (no network)
npm run test:browser:components   # browser tests against a stubbed API (no network)
npm run test:browser              # end-to-end test against the live GBIF API
npm run test:all                  # unit tests and the stubbed browser tests
```

The two browser tests need [Playwright](https://playwright.dev) to be resolvable and a Chromium browser installed.

The build writes `dist/gbif-components.js` (Lit and all fourteen components, about 40 KB gzipped) and, in `dist/chunks/`, Leaflet (about 54 KB gzipped, only downloaded when a map is drawn). **Serve the whole `dist/` directory**, not just the one file: the entry loads its chunks by relative path. The chunk names are fixed, so a directory can be copied to a CDN under a versioned path. There is no classic-script build, so load the bundle with `<script type="module">`. Content Management Systems that rewrite or concatenate scripts may need that to be turned off for this one. Nothing is published to npm or a CDN yet.

If another script has already defined one of the tags, the bundle leaves it alone and warns in the console.

## Scope

The long-term aim is to cover the GBIF entities and the content built on them. Examples of components that would fit:

| Area | Example components |
| --- | --- |
| Taxonomy | Taxon card, classification / breadcrumb, child-taxa list, synonyms, vernacular names, species profile |
| Media | Image gallery for a taxon, single image with attribution, licence badge |
| Occurrences | Occurrence search, occurrence map, occurrence count, recent observations feed |
| Datasets & publishers | Dataset card, publisher / installation listing, dataset citation |
| Checklists & networks | Checklist viewer, country or region species list, network membership |
| Literature & publications | GBIF-mediated publications list, citation formatter |
| Maps & metrics | Species distribution map, occurrence counts by country or year, key statistics |
| Reusable building blocks | Attribution footer, pagination, loading and error states |

This list is illustrative, not exhaustive. Anything that can be sensibly built from the [GBIF APIs](https://techdocs.gbif.org/en/openapi/) and is useful to people publishing biodiversity content is in scope.

## Principles

1. **Use GBIF's public APIs.** Components talk to the official GBIF REST APIs and do not depend on private endpoints or scraped data. (One image endpoint is labelled experimental; see the limitations.)
2. **Show attribution.** Images and data carry their licence and rights holder wherever they are shown, and that cannot be turned off. Source notes ("data from GBIF") can be moved into a page footer.
3. **Respect licences.** Media have varying licences (CC0, CC BY, CC BY-NC, and others). Components that display media let the site choose which licences to show, and never hide the licence of what is shown.
4. **Accessible by default.** Keyboard navigation, sensible ARIA roles, alt text from source metadata, and sufficient colour contrast are requirements, not nice-to-haves.
5. **Lightweight to consume.** A consumer should be able to use a component with one `<script type="module">` tag and no framework or bundler.
6. **Customisable, not configurable to death.** Expose the attributes needed for common use and theme everything else through CSS custom properties and parts.
7. **Graceful failure.** If the GBIF API is slow or unavailable, show a clear message rather than breaking the host page, and tell the page with an event. A component that has nothing to show renders nothing; one that failed says so.
8. **Documented and demoable.** Each component should come with a short description, its attributes and events, and a working example.

## Conventions

The prototype follows these. They are open for discussion and may change as the project matures.

- **Naming:** all elements use the `gbif-` prefix, as required by the custom elements spec, followed by a descriptive, hyphenated name (for example `gbif-taxon-card`).
- **Attributes:** use kebab-case HTML attributes (`taxon-key`, `page-size`). Use the GBIF identifiers and parameter names where practical so that people familiar with the API can guess them. Numbers are read defensively: whole numbers within bounds, otherwise the default.
- **Language:** labels are English only for now. A `language` attribute with translations contributed as data is planned, and is not implemented.
- **Events:** components emit `CustomEvent`s with a `gbif-` prefix for meaningful user actions and outcomes so host pages can react. Events that would otherwise open a link are cancelable (see [Events](#events)).
- **Styling:** write plain CSS with BEM class names. Expose theming through CSS custom properties with a `--gbif-` prefix, each with a sensible fallback. The current set is `--gbif-font-family`, `--gbif-font-size`, `--gbif-color-text`, `--gbif-color-muted`, `--gbif-color-link`, `--gbif-color-accent`, `--gbif-color-accent-hover`, `--gbif-color-accent-text`, `--gbif-color-surface`, `--gbif-color-surface-hover`, `--gbif-color-border`, `--gbif-color-control-border`, `--gbif-color-media-background`, `--gbif-color-error`, `--gbif-color-focus`, `--gbif-radius`, `--gbif-card-padding`, `--gbif-gallery-height`, `--gbif-gallery-tile` (the occurrence gallery's tile size) and `--gbif-map-height`. Main elements are also exposed as `::part()` (`card`, `header`, `title`, `body`, `footer`, `source`, and `viewer` or `viewport` where present). Text colour and font are set on the card itself, so a host rule such as `body * { color: … }` cannot make a card unreadable.
- **Safe markup and links:** text from the API is escaped. The italic markup GBIF puts in scientific names is the only HTML let through, and only as plain `<i>` and `<em>` tags. Links and image sources from API data are only used if they are `http` or `https`.
- **Few global side effects.** Components add no global CSS. The bundle registers its custom elements, defines one global, `GbifComponents` (for `configure` and `version`), and uses `sessionStorage` for responses.
- **Contrast and motion:** default colours meet WCAG AA. Animations stop under `prefers-reduced-motion`, and print styles keep the badge and buttons readable.

## Repository layout

```
gbif-community-components/
├── src/
│   ├── index.js             # registers every component, defines GbifComponents
│   ├── components/          # one file per component
│   └── shared/
│       ├── api.js           # the only code that calls GBIF: URLs, de-duplication, cache, timeout, one retry
│       ├── taxon.js         # name or key -> taxon: Taxon API for details, match only for names
│       ├── card-element.js  # base class of every card: title, source note, configuration
│       ├── taxon-element.js # base class for one taxon: shared inputs, resolving, events
│       ├── search-consumer.js # base class for the parts of an occurrence search
│       ├── filters.js       # the occurrence filters: validation, URLs
│       ├── dwc.js           # Darwin Core: the groups, an occurrence record sorted into them, extensions, media, the point
│       ├── record.js        # fetches one record, interpreted and verbatim
│       ├── leaflet.js       # what the maps share: Leaflet, its styles, the basemaps
│       ├── linked-element.js # finds the element a component follows (a search, a record)
│       ├── record-consumer.js # base class for the cards of a record page
│       ├── predicate.js     # a page author's predicate: validation; the filters as a predicate
│       ├── occurrence.js    # occurrence search and facets, table columns, images and thumbnails
│       ├── md5.js           # names images for GBIF's image cache
│       ├── events.js        # emit() and cancelable "navigation intent" clicks
│       ├── config.js        # defaults and configure()
│       ├── styles.js        # theming variables and card styles
│       ├── format.js        # safe names and URLs, licences and the licence filter, number clamping
│       ├── geo.js           # map bounds -> search geometry across the antimeridian
│       ├── links.js         # links back to gbif.org (kept in one place)
│       └── ranks.js         # rank and type-status lists
├── examples/                # pages combining several components
├── test/
│   ├── unit/                # pure logic, no network
│   └── browser/             # in a real browser: stubbed API (components.cjs), live API (smoke.cjs)
└── docs/                    # design notes
```

## Contributing

Contributions of any kind are welcome: new components, improvements to existing ones, translations, documentation, bug reports and usage examples.

A rough process:

1. Open an issue describing the component and the GBIF data it will show, or pick up an existing one.
2. Add a file under `src/components/`, extend `GbifTaxonElement` if the component is about one taxon, and register it in `src/index.js`. Document its attributes and events in this README.
3. Add it to `examples/index.html` so reviewers can see it working.
4. Reuse the helpers in `src/shared/` rather than duplicating API code. Never call `fetch` directly, and never put a value from the API into `href`, `src` or `unsafeHTML` without the helpers in `format.js`.
5. Make sure licence and rights information is displayed wherever the component shows media.
6. Add tests: unit tests for logic, and a case in `test/browser/components.cjs` for behaviour. A test that still passes when you break the code it covers is not a test, so try removing your fix.

Detailed contribution guidelines will live in `docs/` as the project develops.

## Using GBIF data responsibly

- Follow the [GBIF terms of use](https://www.gbif.org/terms) and the licence of each dataset or media item.
- Cite GBIF and the original data publishers. The components make this visible, but they cannot choose the right licence for your site: check it.
- Be mindful of API rate limits. A page with all four components on one taxon makes about ten API requests the first time it is viewed in a tab, and fewer after that. Put a caching proxy in front for busy sites.
