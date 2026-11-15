# GBIF Community Components

A community-driven collection of **web components** that expose content from [GBIF](https://www.gbif.org) (the Global Biodiversity Information Facility) in a form that can be dropped into any website.

The goal is to make it easy to show GBIF-mediated biodiversity data on custom sites: a museum page about a species, a national park's checklist, a university course site, a conservation NGO's news page, or a citizen-science project. Instead of each site re-implementing GBIF API calls, layout and attribution, a site author adds a single HTML element and gets a working, styled, accessible component.

> **Status:** early stage. This README describes the intended scope and conventions. There are no published components yet.

## Why web components?

- **Framework-agnostic.** They work in plain HTML, WordPress, Drupal, Hugo/Jekyll, static site generators, React/Vue/Svelte apps, and so on.
- **Standard browser APIs.** Custom elements, Shadow DOM and HTML templates are supported natively in all evergreen browsers. No build step is required to *use* a component.
- **Encapsulated.** Styles and markup do not leak into the host page, and host page styles can be customised through documented CSS custom properties.

## Technology choices

- **[Lit](https://lit.dev)** (from Google) for building the components. Lit is a small layer over the standard web component APIs. It provides reactive properties, efficient rendering and a convenient way to write templates and styles, without the weight of a full framework.
- **Plain, hand-written CSS** for styling. No utility-class framework such as Tailwind.
- **BEM naming** for CSS class names, such as `gbif-taxon-card__title` and `gbif-taxon-card--compact`. This keeps class names predictable and avoids collisions, which matters most in the light-DOM build.
- **CSS custom properties** as the theming interface, so site authors can restyle components from their own stylesheets. Each component reads them with a fallback, so it looks right without any configuration.
- **Two build outputs:**
  - **Encapsulated** (Shadow DOM): the default and the starting point. Styles are fully isolated from the host page.
  - **Light DOM**: for authors who need detailed styling control. Planned as a second build over the same shared code, and not yet implemented.

## Example usage

The exact element names and attributes are not final. The following illustrates the intended style:

```html
<script type="module" src="https://cdn.example.org/gbif-components/index.js"></script>

<!-- A taxon summary card -->
<gbif-taxon-card taxon-key="2435099" language="en"></gbif-taxon-card>

<!-- Images for a species or higher-rank taxon -->
<gbif-media-gallery taxon-key="212" license="cc-by,cc0" limit="12"></gbif-media-gallery>

<!-- A small occurrence search embedded in a page -->
<gbif-occurrence-search country="NO" taxon-key="212" map="true"></gbif-occurrence-search>
```

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
| Reusable building blocks | Attribution footer, pagination, loading and error states, GBIF logo / "Data from GBIF" badge |

This list is illustrative, not exhaustive. Anything that can be sensibly built from the [GBIF APIs](https://techdocs.gbif.org/en/openapi/) and is useful to people publishing biodiversity content is in scope.

## Principles

1. **Use GBIF's public APIs.** Components talk to the official GBIF REST APIs and do not depend on private endpoints or scraped data.
2. **Show attribution.** Data and media must carry their licence and rights holder information wherever it is shown. Components should never strip attribution.
3. **Respect licences.** Media and data have varying licences (CC0, CC BY, CC BY-NC, and others). Components that display media should allow filtering by licence and should not hide the licence.
4. **Accessible by default.** Keyboard navigation, sensible ARIA roles, alt text from source metadata, and sufficient colour contrast are requirements, not nice-to-haves.
5. **Lightweight and dependency-free to consume.** A consumer should be able to use a component with one `<script type="module">` tag. Avoid requiring a particular framework or bundler.
6. **Customisable, not configurable to death.** Expose the attributes needed for common use and theme everything else through CSS custom properties and named slots / parts.
7. **Graceful failure.** If the GBIF API is slow or unavailable, show a clear message rather than breaking the host page.
8. **Documented and demoable.** Each component should come with a short description, its attributes and events, and a working example.

## Conventions (proposed)

These are starting points for discussion and may change as the project matures.

- **Naming:** all elements use the `gbif-` prefix, as required by the custom elements spec, followed by a descriptive, hyphenated name (for example `gbif-taxon-card`).
- **Attributes:** use kebab-case HTML attributes (`taxon-key`, `country`, `page-size`). Use the GBIF identifiers and parameter names where practical so that people familiar with the API can guess them.
- **Language:** a `language` attribute for localised labels, with English as the default. Translations should be contributed as data, not hard-coded.
- **Events:** components emit `CustomEvent`s with a `gbif-` prefix for meaningful user actions (for example `gbif-taxon-select`) so host pages can react.
- **Styling:** write plain CSS with BEM class names. Expose theming through CSS custom properties such as `--gbif-font-family` and `--gbif-accent-color`, each with a sensible fallback, plus `::part()` where useful.
- **No global side effects.** Components should not add global CSS or mutate `window` beyond registering their own custom element.

## Repository layout (proposed)

```
gbif-community-components/
├── README.md
├── LICENSE
├── components/          # one folder per component
│   └── gbif-taxon-card/
│       ├── README.md    # usage, attributes, events, CSS properties
│       ├── gbif-taxon-card.js
│       └── example.html
├── shared/              # shared helpers (API client, formatting, attribution)
├── examples/            # pages combining several components
└── docs/                # contribution guide and design notes
```

This is a suggestion. The first contributions will help settle the actual structure.

## Contributing

Contributions of any kind are welcome: new components, improvements to existing ones, translations, documentation, bug reports and usage examples.

A rough process:

1. Open an issue describing the component and the GBIF data it will show, or pick up an existing one.
2. Create a folder under `components/` with a `README.md` that describes its purpose, attributes, events and CSS custom properties.
3. Include an `example.html` that loads the component directly so reviewers can see it working.
4. Keep the component self-contained, and reuse shared helpers from `shared/` rather than duplicating API code.
5. Make sure attribution and licence information are displayed wherever the component shows GBIF data or media.

Detailed contribution guidelines will live in `docs/` as the project develops.

## Using GBIF data responsibly

- Follow the [GBIF terms of use](https://www.gbif.org/terms) and the licence of each dataset or media item.
- Cite GBIF and the original data publishers. The components should make this easy and visible.
- Be mindful of API rate limits. Prefer paging and caching over repeated identical requests.

## License

This project is licensed under the [Apache License 2.0](LICENSE).

## Acknowledgements

Built on the open data and APIs provided by [GBIF](https://www.gbif.org) and the many data publishers who make biodiversity data available.
