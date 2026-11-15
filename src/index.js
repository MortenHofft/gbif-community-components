import { GbifTaxonCard } from './components/gbif-taxon-card.js';
import { GbifMediaGallery } from './components/gbif-media-gallery.js';
import { GbifOccurrenceMap } from './components/gbif-occurrence-map.js';
import { GbifTypeSpecimens } from './components/gbif-type-specimens.js';
import { GbifAttribution } from './components/gbif-attribution.js';
import { GbifOccurrenceSearch } from './components/gbif-occurrence-search.js';
import { GbifOccurrenceFilters } from './components/gbif-occurrence-filters.js';
import { GbifOccurrenceTable } from './components/gbif-occurrence-table.js';
import { GbifOccurrenceGallery } from './components/gbif-occurrence-gallery.js';
import { GbifOccurrenceRecord } from './components/gbif-occurrence-record.js';
import { GbifOccurrenceGroups } from './components/gbif-occurrence-groups.js';
import { GbifOccurrenceImages } from './components/gbif-occurrence-images.js';
import { GbifOccurrenceLocation } from './components/gbif-occurrence-location.js';
import { GbifOccurrenceExtensions } from './components/gbif-occurrence-extensions.js';
import { configure } from './shared/config.js';

export { configure };
export {
  GbifTaxonCard,
  GbifMediaGallery,
  GbifOccurrenceMap,
  GbifTypeSpecimens,
  GbifAttribution,
  GbifOccurrenceSearch,
  GbifOccurrenceFilters,
  GbifOccurrenceTable,
  GbifOccurrenceGallery,
  GbifOccurrenceRecord,
  GbifOccurrenceGroups,
  GbifOccurrenceImages,
  GbifOccurrenceLocation,
  GbifOccurrenceExtensions
};

/** Version of this build, replaced at build time. */
export const version = typeof __VERSION__ === 'undefined' ? 'dev' : __VERSION__;

const ELEMENTS = {
  'gbif-taxon-card': GbifTaxonCard,
  'gbif-media-gallery': GbifMediaGallery,
  'gbif-occurrence-map': GbifOccurrenceMap,
  'gbif-type-specimens': GbifTypeSpecimens,
  'gbif-attribution': GbifAttribution,
  'gbif-occurrence-search': GbifOccurrenceSearch,
  'gbif-occurrence-filters': GbifOccurrenceFilters,
  'gbif-occurrence-table': GbifOccurrenceTable,
  'gbif-occurrence-gallery': GbifOccurrenceGallery,
  'gbif-occurrence-record': GbifOccurrenceRecord,
  'gbif-occurrence-groups': GbifOccurrenceGroups,
  'gbif-occurrence-images': GbifOccurrenceImages,
  'gbif-occurrence-location': GbifOccurrenceLocation,
  'gbif-occurrence-extensions': GbifOccurrenceExtensions
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
