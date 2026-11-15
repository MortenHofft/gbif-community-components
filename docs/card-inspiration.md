# Card inspiration: the TaxonPages GBIF panels

Design notes on four existing GBIF "panel" cards, used as inspiration for the first components in this repository. They live in [MortenHofft/taxonpages](https://github.com/MortenHofft/taxonpages) under `panels/`. They were written as Vue panels for a TaxonWorks-driven taxon page (read at commit `a06a1c1`). The API usage and the card structure carry over. The Vue, Tailwind and host-app specifics do not.

I read the code but did not run it or check the endpoints against the live API. Verify the endpoints and parameters below before building on them.

## The four cards

| Card | What it shows | GBIF API used |
| --- | --- | --- |
| **Taxon** | Formatted name, synonym note, classification breadcrumb, occurrence count, "View on GBIF.org" link | `v2/species/match`, `v1/occurrence/search` (with `limit=0`, only for `count`) |
| **Images** | Carousel of images with rights holder, licence link, position counter and a link to the GBIF gallery | `v1/occurrence/experimental/multimedia/species/{checklistKey}/{taxonKey}` |
| **Map** | Leaflet map with GBIF occurrence density hexagons, a basemap switcher and an "Explore on GBIF.org" button that opens the current map bounds as a polygon search | `v2/map/occurrence/density/capabilities.json` and the `v2/map/occurrence/density/{z}/{x}/{y}@2x.png` tiles |
| **Type specimens** | Paged list of type specimens (type status, name, date), each linking to its occurrence page | `v1/occurrence/search` with repeated `typeStatus` parameters |

## Shared pattern worth keeping

All four cards depend on one helper, `useGbifMatch`, which resolves a scientific name to a GBIF usage and then feeds every card.

- **Match once, share the result.** Name matching happens in one place, and a module-level cache of in-flight promises means several cards for the same name make one request. This is the same idea as the shared API client described in the README.
- **Confidence gating.** A match only counts if the match type is `EXACT`, `FUZZY` or `HIGHERRANK` and its confidence is at least 80. Otherwise the card says "No confident match could be found" instead of showing something wrong.
- **Synonyms resolve to the accepted taxon.** If the match is a synonym, the card follows the accepted usage for all further requests and notes the synonym.
- **Explicit states.** Each card handles loading, error and "nothing found" separately.
- **Cards hide themselves when empty.** Images, map and type specimens render nothing if there is no data, so a page does not fill up with empty boxes.
- **Rank eligibility.** Images are only requested for ranks that make sense (family down), and type specimens only for species and genus.
- **Common card chrome.** A header with the GBIF mark and a title, and links back to gbif.org in the footer or header.
- **Attribution is built in.** The image card shows rights holder and a formatted licence label with a link (CC BY, CC0, Public Domain Mark), which matches the principles in the README.
- **Embed-friendly map.** Scroll-wheel zoom is off so the map does not trap page scrolling, and Leaflet is loaded lazily only when there is something to show.

## What to change for web components

- **Input.** The panels take host-specific props (`otuId`, `taxonId`, `taxon`). Components should take `taxon-key` (skips matching) or `scientific-name` (does the match) as plain attributes.
- **Checklist key.** `CHECKLIST_KEY` is hard-coded. It should be an attribute with a documented default, since it decides which classification is used.
- **Links.** The panels link to `demo.gbif-staging.org`. Components should link to production GBIF by default, with the base URL configurable.
- **Rendering names.** The taxon card inserts GBIF's `formattedName` with `v-html`. The equivalent in Lit must sanitise the HTML, or only allow the few tags (such as `<i>`) that formatted names use, because this is markup from an external API placed on someone else's site.
- **Experimental endpoint.** The images card uses an `experimental` multimedia endpoint. Decide whether to depend on it and what to do if it changes.
- **Image alt text.** Alt text is currently "Occurrence {key}", which is not useful for screen readers. Build it from the taxon name and any available image description.
- **Styling.** Replace the Tailwind utility classes and the host app's `VCard` components with hand-written CSS using BEM names and `--gbif-*` custom properties, as set out in the README.
- **Map in the encapsulated build.** Leaflet needs its CSS. Inside a Shadow DOM, a stylesheet in the host page does not reach it, so the map card has to inject Leaflet's CSS into its own shadow root.
- **Silent errors.** The panels swallow errors and only show a generic message. Components should also emit an event with the failed URL and status so host pages can react.
- **"Show the request" idea.** The panels record each request URL and response so the host app can show what API call produced the data. A component could expose that through an event or a small "view API request" link, which suits a project about transparent GBIF-mediated content.

## Suggested first components

1. `gbif-taxon-card`: name, classification, occurrence count and links.
2. `gbif-media-gallery`: images with rights holder and licence.
3. `gbif-occurrence-map`: density map for a taxon.
4. `gbif-type-specimens`: paged list of type specimens.

A shared `shared/gbif-match` module (name to usage, with caching and confidence gating) and a shared `shared/api` client would support all four.
