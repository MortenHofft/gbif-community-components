import { GbifTaxonCard } from './components/gbif-taxon-card.js';
import { GbifMediaGallery } from './components/gbif-media-gallery.js';
import { GbifOccurrenceMap } from './components/gbif-occurrence-map.js';
import { GbifTypeSpecimens } from './components/gbif-type-specimens.js';

export { configure } from './shared/config.js';
export { GbifTaxonCard, GbifMediaGallery, GbifOccurrenceMap, GbifTypeSpecimens };

const ELEMENTS = {
  'gbif-taxon-card': GbifTaxonCard,
  'gbif-media-gallery': GbifMediaGallery,
  'gbif-occurrence-map': GbifOccurrenceMap,
  'gbif-type-specimens': GbifTypeSpecimens
};

// Register every component, skipping any tag the page has already defined.
for (const [tag, element] of Object.entries(ELEMENTS)) {
  if (!customElements.get(tag)) customElements.define(tag, element);
}
