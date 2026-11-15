import { GbifTaxonCard } from './components/gbif-taxon-card.js';
import { GbifMediaGallery } from './components/gbif-media-gallery.js';
import { GbifOccurrenceMap } from './components/gbif-occurrence-map.js';
import { GbifTypeSpecimens } from './components/gbif-type-specimens.js';
import { GbifAttribution } from './components/gbif-attribution.js';
import { configure } from './shared/config.js';

export { configure };
export { GbifTaxonCard, GbifMediaGallery, GbifOccurrenceMap, GbifTypeSpecimens, GbifAttribution };

/** Version of this build, replaced at build time. */
export const version = typeof __VERSION__ === 'undefined' ? 'dev' : __VERSION__;

const ELEMENTS = {
  'gbif-taxon-card': GbifTaxonCard,
  'gbif-media-gallery': GbifMediaGallery,
  'gbif-occurrence-map': GbifOccurrenceMap,
  'gbif-type-specimens': GbifTypeSpecimens,
  'gbif-attribution': GbifAttribution
};

// Register every component. A tag the page has already defined is left alone, and
// the page is told, because the components for that tag will not be the ones it expects.
for (const [tag, element] of Object.entries(ELEMENTS)) {
  const existing = customElements.get(tag);
  if (!existing) customElements.define(tag, element);
  else if (existing !== element) {
    console.warn(`[gbif-components ${version}] <${tag}> was already defined, so this copy was not used.`);
  }
}

// The one global, so that plain-HTML pages can configure the components without a module import:
//   <script>GbifComponents.configure({ showSource: false })</script>
// The first copy loaded wins, like the tags.
globalThis.GbifComponents ??= { version, configure };
