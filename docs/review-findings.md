# Independent review: findings and what became of them

Three reviewers looked at the first prototype independently, each with a different angle: the concept and architecture, the implementation code, and the components embedded in real host pages (using the built bundle). They were told to find what is wrong and to prove it. This note records what they found and what was done, so that open items are not lost.

Decisions taken in response, by the project owner:

- **Default checklist: the Catalogue of Life**, kept as the default. Its rolling-edition nature is now documented, and cards show the edition.
- **Image licences: every filter is offered**, and nothing is excluded by default. The gallery has a `licenses` attribute with every licence, and shortcuts for commercial use and for derivatives.
- **Light-DOM build: kept open**, not built, to be dropped if it turns out to cause problems. The costs the reviewer named are written into the README.
- **Source notes: on by default, optional.** `hide-source`, `configure({ showSource: false })` and a `<gbif-attribution>` element for a page footer.
- **No Esri basemap by default.** The map uses GBIF's own basemaps, with `basemap-url` for any other tiles.
- **The experimental image endpoint is accepted.**

## Fixed

Each of these has a test that was checked to fail when the fix is removed (see "Tests").

| Area | Finding | Fix |
| --- | --- | --- |
| Identity | Match types were the v1 vocabulary; a typo (`VARIANT`) was refused | `EXACT`, `VARIANT`, `HIGHERRANK` accepted; the card says when a name was matched as a variant or to a higher rank; the match type is in `gbif-taxon-resolved` |
| Identity | Homonyms (*Ficus*, *Oenanthe*) gave no match and could not be fixed | `kingdom` and `rank` attributes |
| Identity | Only status `SYNONYM` was treated as a synonym; `MISAPPLIED`, `AMBIGUOUS_SYNONYM` and others showed the wrong taxon and loaded the wrong images, map and specimens | Any usage that points to a different accepted taxon is resolved to it |
| Identity | Keys from gbif.org (backbone keys) do not exist in the default checklist, with no explanation | README section "Which taxon do I get?"; the not-found message says "in this checklist"; `gbif-taxon-notfound` event |
| Licences | No licence filter, although the README promised one | `licenses` attribute with every licence and two shortcuts |
| Licences | Missing rights holder or licence was hidden or shown as "Unknown rights holder" | Always shown, or "not stated" |
| Credit | "Data from GBIF" while the taxonomy is Catalogue of Life | Source note names the checklist and its edition |
| Safety | Licence and image URLs from the API went into `href` and `src` unchecked; the CC regexes were fooled by look-alike URLs; a non-string licence or a `null` result removed the gallery | http(s) only, anchored host check, defensive parsing, `referrerpolicy="no-referrer"` on images |
| Safety | Gallery path segments were not URL-encoded | Encoded |
| Map | Blank after the element was moved in the DOM | Rebuilt on reconnect |
| Map | Blank if the taxon changed while Leaflet was loading | Re-checked and retried after the download |
| Map | Dead grey card when Leaflet failed to load | Error message and `gbif-error` |
| Map | "Explore" sent the wrong area near the antimeridian, or an inverted polygon | `exploreGeometry()`: wraps the span, multipolygon when it crosses, whole world when it covers it |
| Map | `ResizeObserver` never disconnected | Disconnected |
| Map | Esri as the default basemap (privacy, terms) | GBIF basemaps by default |
| Type list | A failed page deleted the whole list | Keeps the page, says so, tells the page |
| Type list | Changing `page-size` skipped rows; no clamping | Reloads from page one; whole numbers from 1 to 300 |
| Type list | Keyboard focus lost on Next/Prev; no announcement | `aria-disabled` instead of `disabled`; live region |
| Gallery | Stuck on "Loading image…" when neighbouring images share a URL | Image element is keyed |
| Gallery | `limit` not validated and not reactive | Clamped, and reloads |
| Resilience | No request timeout: "Loading…" forever | 15 s timeout, configurable, ends in an error and `gbif-error` |
| Resilience | `api-base` with a path or a relative value broke | Path prefixes and relative bases work |
| Caching | The README said a second page view makes no request. The API's `Pragma: no-cache` and `Expires: 0` made browsers refetch anyway | Responses are kept in `sessionStorage` for the API's own `max-age`; README corrected |
| Styling | Dark or `*`-coloured host themes made text unreadable (colour set on `:host` only) | Colour, font and line height set on the card |
| Styling | Contrast: 3.44:1 on the badge and primary button | Accent darkened to 5.3:1; control borders 3.6:1 |
| Styling | Unreadable print; animations ignored `prefers-reduced-motion` | Print styles; reduced-motion handling, including Leaflet |
| Accessibility | `role="application"` on the map; fixed `h2` in every card; developer text in an empty card; list semantics lost | `role="region"`; `heading-level`; empty card renders nothing; `role="list"` |
| Events | Not every link was an intent; `occurrenceKey` was sometimes a number | Count, "View on GBIF.org" and "all" links are cancelable events; keys are strings |
| Events | Failures of images and Leaflet, and "not found", were silent | `gbif-error`, `gbif-taxon-notfound` |
| Layout | Large layout shift | `reserve-space` attribute |
| Packaging | Hashed chunk names broke hand-copied files; no version; a second definition of a tag was silent | Fixed chunk names; `GbifComponents.version`; console warning |
| Docs | README claims that were not true (fetch controllers, `language`, caching, CSP, indexing of light DOM) | Corrected, and what is not built is said so |

## Tests

The reviewers mutated the code and found the original browser test missed 9 of 14 breakages (including raw HTML in names), and that unit tests used a match vocabulary the API does not use. Since then:

- `test/unit/behaviour.test.js` covers URL building, configuration, licence parsing and filtering, number clamping, geometry, taxon resolution (all statuses, match types, `kingdom`), caching, storage and timeouts.
- `test/browser/components.cjs` runs 32 cases in a real browser against a **stubbed** API, so races, failures, hostile data and hostile host CSS can be reproduced on demand.
- Seven deliberate regressions were applied one at a time (unkeyed gallery image, no map reconnect, names as raw HTML, colour only on `:host`, only `SYNONYM`, no timeout, `disabled` pager). Each is caught by the test written for it.
- `test/browser/smoke.cjs` still runs against the live API.

## Open

Not done, and not claimed in the README:

- **A `language` attribute** and **pre-fetched data and children as fallback content** (the cheap part of server-side rendering). The README described the first as if it existed.
- **A reference caching proxy** for busy sites. (Since this review: URL-state syncing exists, on `<gbif-occurrence-search>`; the client sends at most four requests at a time and tries a 429, a 503 or a dropped connection again, up to twice, with growing pauses. GBIF limits a client by volume over time and answered this project's own repeated test runs with 429, so a proxy remains the answer for busy sites.)
- **A classic-script (non-module) build**, **publishing** to npm or a CDN, **Subresource Integrity** for the lazy chunk.
- **Contribution structure**: one registered bundle means every contributed component grows it for everyone. No per-component entry points, no base class beyond taxon-based components, no contract test suite, no CI, no stability or deprecation policy, no `CONTRIBUTING`.
- **Trusted Types**: the map does not render under `require-trusted-types-for 'script'`, because Leaflet assigns HTML.
- **Narrow containers** (about 150 px): the map's buttons overlap its zoom control and the specimen metadata clips.
- **Full-size images** are loaded into the gallery (the API returns originals); no thumbnails or `srcset`.
- **The "GBIF" badge on every card** could be read as endorsement by GBIF; check GBIF's brand guidance. Each card's header badge is not yet optional.
- **Who owns the relationship with GBIF**: API change notices, traffic and abuse from sites without keys.
- **Open questions**: vernacular names (a common need, and the Taxon API's `/info` endpoint has them), sensitive-species handling on the map, and what a site should do when a taxon is renamed or merged in the checklist.

## Not verified

These could not be checked from the environment the work was done in: the paths of the gbif.org links (the site blocks the sandbox), Esri's terms, GBIF's published rate limits, behaviour in Firefox and Safari, and whether gbif.org accepts a multipolygon in the `geometry` parameter that "Explore on GBIF.org" sends when the map crosses the antimeridian.
