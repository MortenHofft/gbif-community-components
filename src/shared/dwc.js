import { safeHttpUrl, formatLicense } from './format.js';

/**
 * An occurrence record, ordered by Darwin Core.
 *
 * Darwin Core (https://dwc.tdwg.org) sorts its terms into classes: the record itself, the
 * occurrence, the organism, the material entity, the event, the location, the geological
 * context, the identification and the taxon. A record page that follows them gives readers
 * the order they already know from the standard.
 *
 * GBIF serves a record twice. The *interpreted* record uses Darwin Core's simple names and
 * holds what GBIF made of the data (a country name for a code, coordinates as numbers).
 * The *verbatim* record uses full term URIs and holds the values as published, with the
 * extensions. A row shows the interpreted value, and the value as published when it differs.
 *
 * Terms that are not Darwin Core or Dublin Core go to "Other terms". GBIF's own fields (its
 * keys, the processing dates, the issue flags) go to "GBIF processing". Nothing is dropped
 * because it is unfamiliar. Everything from the API is untrusted text.
 */

/** Darwin Core classes, in the order the standard presents them, and their terms in that order. */
export const DWC_GROUPS = [
  {
    key: 'record-level',
    label: 'Record-level',
    about: 'The record itself, and who holds and licenses it.',
    terms: ['type', 'modified', 'language', 'license', 'rightsHolder', 'accessRights', 'bibliographicCitation', 'references', 'identifier', 'institutionID', 'collectionID', 'datasetID', 'institutionCode', 'collectionCode', 'datasetName', 'ownerInstitutionCode', 'basisOfRecord', 'informationWithheld', 'dataGeneralizations', 'dynamicProperties']
  },
  {
    key: 'occurrence',
    label: 'Occurrence',
    about: 'An organism at a place and time, as recorded.',
    terms: ['occurrenceID', 'catalogNumber', 'recordNumber', 'recordedBy', 'recordedByID', 'individualCount', 'organismQuantity', 'organismQuantityType', 'sex', 'lifeStage', 'reproductiveCondition', 'caste', 'behavior', 'vitality', 'establishmentMeans', 'degreeOfEstablishment', 'pathway', 'occurrenceStatus', 'otherCatalogNumbers', 'associatedMedia', 'associatedOccurrences', 'associatedReferences', 'associatedTaxa', 'occurrenceRemarks']
  },
  {
    key: 'organism',
    label: 'Organism',
    about: 'The individual organism, which may be recorded more than once.',
    terms: ['organismID', 'organismName', 'organismScope', 'associatedOrganisms', 'previousIdentifications', 'organismRemarks']
  },
  {
    key: 'material-entity',
    label: 'Material entity',
    about: 'The specimen or sample that was kept.',
    terms: ['materialEntityID', 'materialSampleID', 'preparations', 'disposition', 'verbatimLabel', 'associatedSequences', 'materialEntityRemarks']
  },
  {
    key: 'event',
    label: 'Event',
    about: 'When and how the organism was observed or collected.',
    terms: ['eventID', 'parentEventID', 'eventType', 'fieldNumber', 'eventDate', 'eventTime', 'startDayOfYear', 'endDayOfYear', 'year', 'month', 'day', 'verbatimEventDate', 'habitat', 'samplingProtocol', 'sampleSizeValue', 'sampleSizeUnit', 'samplingEffort', 'fieldNotes', 'eventRemarks']
  },
  {
    key: 'location',
    label: 'Location',
    about: 'Where it happened.',
    terms: ['locationID', 'higherGeographyID', 'higherGeography', 'continent', 'waterBody', 'islandGroup', 'island', 'country', 'countryCode', 'stateProvince', 'county', 'municipality', 'locality', 'verbatimLocality', 'verbatimElevation', 'verticalDatum', 'minimumElevationInMeters', 'maximumElevationInMeters', 'verbatimDepth', 'minimumDepthInMeters', 'maximumDepthInMeters', 'minimumDistanceAboveSurfaceInMeters', 'maximumDistanceAboveSurfaceInMeters', 'locationAccordingTo', 'locationRemarks', 'decimalLatitude', 'decimalLongitude', 'geodeticDatum', 'coordinateUncertaintyInMeters', 'coordinatePrecision', 'pointRadiusSpatialFit', 'verbatimCoordinates', 'verbatimLatitude', 'verbatimLongitude', 'verbatimCoordinateSystem', 'verbatimSRS', 'footprintWKT', 'footprintSRS', 'footprintSpatialFit', 'georeferencedBy', 'georeferencedDate', 'georeferenceProtocol', 'georeferenceSources', 'georeferenceRemarks', 'georeferenceVerificationStatus']
  },
  {
    key: 'geological-context',
    label: 'Geological context',
    about: 'Where the material sits in the geological record.',
    terms: ['geologicalContextID', 'earliestEonOrLowestEonothem', 'latestEonOrHighestEonothem', 'earliestEraOrLowestErathem', 'latestEraOrHighestErathem', 'earliestPeriodOrLowestSystem', 'latestPeriodOrHighestSystem', 'earliestEpochOrLowestSeries', 'latestEpochOrHighestSeries', 'earliestAgeOrLowestStage', 'latestAgeOrHighestStage', 'lowestBiostratigraphicZone', 'highestBiostratigraphicZone', 'lithostratigraphicTerms', 'group', 'formation', 'member', 'bed']
  },
  {
    key: 'identification',
    label: 'Identification',
    about: 'How the organism was identified, and by whom.',
    terms: ['identificationID', 'verbatimIdentification', 'identificationQualifier', 'typeStatus', 'identifiedBy', 'identifiedByID', 'dateIdentified', 'identificationReferences', 'identificationVerificationStatus', 'identificationRemarks']
  },
  {
    key: 'taxon',
    label: 'Taxon',
    about: 'The name it was identified as, and where that name sits.',
    terms: ['taxonID', 'scientificNameID', 'acceptedNameUsageID', 'parentNameUsageID', 'originalNameUsageID', 'nameAccordingToID', 'namePublishedInID', 'taxonConceptID', 'scientificName', 'acceptedNameUsage', 'parentNameUsage', 'originalNameUsage', 'nameAccordingTo', 'namePublishedIn', 'namePublishedInYear', 'higherClassification', 'kingdom', 'phylum', 'class', 'order', 'superfamily', 'family', 'subfamily', 'tribe', 'subtribe', 'genus', 'genericName', 'subgenus', 'infragenericEpithet', 'specificEpithet', 'infraspecificEpithet', 'cultivarEpithet', 'taxonRank', 'verbatimTaxonRank', 'scientificNameAuthorship', 'vernacularName', 'nomenclaturalCode', 'taxonomicStatus', 'nomenclaturalStatus', 'taxonRemarks', 'acceptedScientificName', 'species', 'iucnRedListCategory']
  },
  {
    key: 'gbif',
    label: 'GBIF processing',
    about: 'GBIF\'s own identifiers, dates, quality flags and derived values (elevation, depth, administrative areas). Not Darwin Core.',
    terms: ['gbifID', 'datasetKey', 'publishingOrgKey', 'installationKey', 'hostingOrganizationKey', 'publishingCountry', 'publishedByGbifRegion', 'gbifRegion', 'protocol', 'crawlId', 'lastCrawled', 'lastParsed', 'lastInterpreted', 'issues', 'taxonKey', 'acceptedTaxonKey', 'kingdomKey', 'phylumKey', 'classKey', 'orderKey', 'familyKey', 'genusKey', 'speciesKey', 'isSequenced', 'isInCluster', 'dnaSequenceID', 'projectId', 'networkKeys', 'repatriated', 'elevation', 'elevationAccuracy', 'depth', 'depthAccuracy', 'distanceFromCentroidInMeters', 'gadm.level0', 'gadm.level1', 'gadm.level2', 'gadm.level3']
  },
  {
    key: 'other',
    label: 'Other terms',
    about: 'Terms that are not part of Darwin Core or GBIF\'s own. Where the publisher used them, they are shown as published.',
    terms: []
  }
];

const TERM_GROUP = new Map();
for (const group of DWC_GROUPS) group.terms.forEach((term, index) => TERM_GROUP.set(term, { group: group.key, order: index }));

/** Namespaces whose terms are Darwin Core, Dublin Core or GBIF's own, and so known by their plain name. */
const KNOWN_NAMESPACES = ['http://rs.tdwg.org/dwc/terms/', 'http://purl.org/dc/terms/', 'http://purl.org/dc/elements/1.1/', 'http://rs.gbif.org/terms/1.0/'];

/** What GBIF puts in front of a term it did not recognise, when it writes it into the interpreted record. */
const UNKNOWN_NAMESPACE = 'http://unknown.org/';

/** Keys of the interpreted record that are not single values, or are shown elsewhere. */
const STRUCTURAL_KEYS = new Set(['extensions', 'media', 'facts', 'relations', 'identifiers', 'classifications', 'key']);

/** The last part of a term URI: `http://rs.tdwg.org/dwc/terms/locality` -> `locality`. */
export function localName(uri) {
  const text = String(uri);
  return text.slice(Math.max(text.lastIndexOf('/'), text.lastIndexOf('#')) + 1) || text;
}

const ACRONYMS = { gbif: 'GBIF', iucn: 'IUCN', wkt: 'WKT', srs: 'SRS', url: 'URL', uri: 'URI', doi: 'DOI', dna: 'DNA', rna: 'RNA', id: 'ID', ids: 'IDs' };

/**
 * `decimalLatitude` -> `Decimal latitude`, `occurrenceID` -> `Occurrence ID`,
 * `gbifID` -> `GBIF ID`, `DNADerivedData` -> `DNA derived data`. Acronyms stay as they are.
 */
export function humanize(name) {
  const words = String(name)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim()
    .split(/\s+/);
  const text = words
    .map((word, i) => {
      if (ACRONYMS[word.toLowerCase()]) return ACRONYMS[word.toLowerCase()];
      if (word === word.toUpperCase() && word.length > 1) return word;
      return i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word.toLowerCase();
    })
    .join(' ');
  return text || String(name);
}

/** `CONTINENT_DERIVED_FROM_COORDINATES` -> `Continent derived from coordinates` (GBIF's flags are in capitals, not acronyms). */
export function sentenceCase(flag) {
  const text = String(flag).replace(/[_-]+/g, ' ').trim().toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Which group a term (by plain name) belongs to. Unknown terms are `other`. */
export function groupOf(name) {
  return TERM_GROUP.get(name)?.group ?? 'other';
}

/** An occurrence key (GBIF's `gbifID`): digits only, so it can only ever be one path segment. */
export function cleanOccurrenceKey(value) {
  const text = typeof value === 'number' ? String(value) : value;
  return typeof text === 'string' && /^\d{1,19}$/.test(text.trim()) ? text.trim() : undefined;
}

/** Terms that hold several values in one text, separated by `|` (Darwin Core's recommended way to write a list). */
const LIST_TERMS = new Set(['recordedBy', 'recordedByID', 'identifiedBy', 'identifiedByID', 'georeferencedBy', 'georeferenceSources', 'otherCatalogNumbers', 'associatedMedia', 'associatedOccurrences', 'associatedReferences', 'associatedSequences', 'associatedTaxa', 'associatedOrganisms', 'previousIdentifications', 'preparations', 'typeStatus', 'lithostratigraphicTerms', 'establishmentMeans', 'identificationQualifier', 'issues', 'networkKeys', 'projectId']);

/** GBIF's own fields that are lengths in metres without saying so in their name. */
const METRE_TERMS = new Set(['elevation', 'elevationAccuracy', 'depth', 'depthAccuracy']);

const isScalar = (v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';

/** GBIF's enumerations, which it writes in capitals: `HUMAN_OBSERVATION`. Shown as a sentence, or as a name. */
const ENUM_SENTENCE = new Set(['basisOfRecord', 'occurrenceStatus', 'taxonRank', 'taxonomicStatus', 'nomenclaturalStatus', 'protocol', 'establishmentMeans', 'degreeOfEstablishment', 'pathway', 'typeStatus']);
const ENUM_NAME = new Set(['continent', 'gbifRegion', 'publishedByGbifRegion']);
const isEnum = (value) => /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/.test(value) && value.length > 2;

/** `NORTH_AMERICA` -> `North America` */
function titleCase(flag) {
  return String(flag).replace(/[_-]+/g, ' ').trim().toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

/** One value as text; `null` if there is nothing to show. `interpreted` values get GBIF's enumerations made readable. */
function asText(name, value, interpreted = false) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    if (name === 'decimalLatitude' || name === 'decimalLongitude') return String(Number(value.toFixed(6)));
    return /InMeters$/.test(name) || METRE_TERMS.has(name) ? `${value} m` : String(value);
  }
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return null;
    if (interpreted && isEnum(text)) {
      if (ENUM_SENTENCE.has(name)) return sentenceCase(text);
      if (ENUM_NAME.has(name)) return titleCase(text);
    }
    return text;
  }
  return null;
}

/** A value ready to show: its text, a link if it is a web address or a licence, or `parts` if it is several values. */
function shown(name, value, interpreted = false) {
  // Several values: a list, or one text with `|` between them (the way GBIF and publishers write them).
  const items = Array.isArray(value) && value.length && value.every(isScalar) ? value : typeof value === 'string' && value.includes('|') && LIST_TERMS.has(name) ? value.split('|') : null;
  if (items) {
    const parts = items.map((v) => asText(name, typeof v === 'string' ? v.trim() : v, interpreted)).filter(Boolean);
    if (!parts.length) return null;
    if (name === 'issues') return { text: parts.map(sentenceCase).join(', ') };
    if (parts.length === 1) return shown(name, items.find((v) => asText(name, typeof v === 'string' ? v.trim() : v, interpreted)), interpreted);
    return { text: parts.join(' | '), parts: parts.map((part) => ({ text: part, ...(safeHttpUrl(part) ? { href: safeHttpUrl(part) } : {}) })) };
  }

  const text = asText(name, value, interpreted);
  if (text === null) return null;
  if (name === 'license') {
    const license = formatLicense(text);
    if (license) return { text: license.label, href: license.url };
  }
  const href = typeof value === 'string' && /^\S+$/.test(text) ? safeHttpUrl(text) : null;
  return href ? { text, href } : { text };
}

/** A web address with its scheme and the case of its host ignored, which are not part of what it points to. */
function addressKey(href) {
  try {
    const url = new URL(href);
    return `${url.host.toLowerCase()}${url.pathname.replace(/\/$/, '')}${url.search}`;
  } catch {
    return href;
  }
}

/** A plain decimal number (not `0x10`, `1e3` or ` `, which `Number()` would take). */
const DECIMAL = /^[+-]?\d+(\.\d+)?$/;

/** The same value, shown two ways: a number written differently, or a licence given as a label and as an address. */
function sameValue(a, b) {
  if (a.text.toLowerCase() === b.text.toLowerCase()) return true;
  // The same moment written two ways: `...46.000+00:00` and `...46Z`.
  // Only when both say which zone they are in, or both say none: a time with no zone could be any, and whether it
  // equals one in UTC would depend on the reader's own clock.
  const isInstant = (v) => /^\d{4}-\d{2}-\d{2}T/.test(v.text);
  const hasZone = (v) => /(Z|[+-]\d{2}:?\d{2})$/i.test(v.text);
  if (isInstant(a) && isInstant(b) && hasZone(a) === hasZone(b) && Date.parse(a.text) === Date.parse(b.text)) return true;
  const plain = (v) => v.text.replace(/ m$/, '');
  if (DECIMAL.test(plain(a)) && DECIMAL.test(plain(b)) && Number(plain(a)) === Number(plain(b))) return true;
  return !!a.href && !!b.href && addressKey(a.href) === addressKey(b.href);
}

/** `dcterms`, `dc`, `dwc`, `gbif` or the host, for telling apart two terms that share a name. */
function namespaceLabel(uri) {
  if (uri.startsWith('http://purl.org/dc/terms/')) return 'dcterms';
  if (uri.startsWith('http://purl.org/dc/elements/1.1/')) return 'dc';
  if (uri.startsWith('http://rs.tdwg.org/dwc/terms/')) return 'dwc';
  if (uri.startsWith('http://rs.gbif.org/terms/')) return 'gbif';
  try {
    return new URL(uri).host;
  } catch {
    return 'other';
  }
}

/** Plain-name key of a term URI if it is Darwin Core or Dublin Core, else `null`. */
function knownName(uri) {
  const namespace = KNOWN_NAMESPACES.find((ns) => uri.startsWith(ns));
  return namespace ? uri.slice(namespace.length) : null;
}

/**
 * Sort a record into Darwin Core groups. Returns the groups that have something to show, in
 * the standard's order. Each is `{ key, label, about, rows }`, and each row is
 * `{ name, label, text, href?, published?, uri? }`. `published` is the value as published,
 * given only when it differs from the interpreted one. Either record may be missing.
 */
export function buildGroups({ interpreted, verbatim } = {}) {
  const terms = new Map(); // name (or full URI for terms outside the namespaces above) -> { name, label, value, published, uri }
  const byLowerName = new Map(); // so that `projectId` and `projectID` are one row

  const entry = (key, uri) => {
    const existing = byLowerName.get(key.toLowerCase());
    if (existing) return terms.get(existing);
    terms.set(key, { name: key, label: humanize(localName(key)), value: null, published: null, uri });
    byLowerName.set(key.toLowerCase(), key);
    return terms.get(key);
  };

  const unknownInterpreted = []; // GBIF's rewrites of terms it did not recognise, dealt with once the verbatim terms are known

  if (interpreted && typeof interpreted === 'object') {
    for (const [key, value] of Object.entries(interpreted)) {
      if (STRUCTURAL_KEYS.has(key)) continue;
      const shownValue = shown(localName(key), value, true);
      if (!shownValue) continue;
      if (key.startsWith(UNKNOWN_NAMESPACE)) {
        unknownInterpreted.push([key, shownValue]);
        continue;
      }
      // Interpreted keys are plain names, except for terms GBIF does not know, which keep their URI.
      const name = key.startsWith('http') ? knownName(key) ?? key : key;
      entry(name, key.startsWith('http') ? key : undefined).value = shownValue;
    }
  }

  // GBIF's administrative areas (GADM), one row for each level it gives.
  if (interpreted?.gadm && typeof interpreted.gadm === 'object') {
    for (let level = 0; level <= 3; level += 1) {
      const area = interpreted.gadm[`level${level}`];
      const name = typeof area?.name === 'string' ? area.name.trim() : '';
      if (!name) continue;
      const row = entry(`gadm.level${level}`);
      row.label = `Administrative area, level ${level} (GADM)`;
      row.value = { text: typeof area.gid === 'string' && area.gid.trim() ? `${name} (${area.gid.trim()})` : name };
    }
  }

  const verbatimByLocalName = new Map(); // local name -> the rows of terms outside the known namespaces
  const publishedFrom = new Map(); // row -> the address of the term its published value came from
  if (verbatim && typeof verbatim === 'object') {
    for (const [uri, value] of Object.entries(verbatim)) {
      if (!uri.startsWith('http')) continue; // GBIF's own bookkeeping, not a term
      const shownValue = shown(localName(uri), value);
      if (!shownValue) continue;
      let name = knownName(uri) ?? uri;
      let row = entry(name, uri);
      // Two terms with one plain name (`dc:type` and `dcterms:type`) are two rows, not one with the second's value.
      if (publishedFrom.has(row) && publishedFrom.get(row) !== uri) {
        name = uri;
        row = entry(uri, uri);
        row.label = `${humanize(localName(uri))} (${namespaceLabel(uri)})`;
      }
      if (!row.uri) row.uri = uri;
      row.published = shownValue;
      publishedFrom.set(row, uri);
      if (!knownName(uri)) {
        const list = verbatimByLocalName.get(localName(uri).toLowerCase()) ?? [];
        list.push(row);
        verbatimByLocalName.set(localName(uri).toLowerCase(), list);
      }
    }
  }

  // A term GBIF did not recognise is in the verbatim record under its real address as well: that is the same
  // term, so it is one row. Only a term with no verbatim twin stands on its own, and where two terms in different
  // namespaces share a name there is no telling which is the twin, so it stands on its own too.
  for (const [key, shownValue] of unknownInterpreted) {
    const twins = verbatimByLocalName.get(localName(key).toLowerCase()) ?? [];
    (twins.length === 1 ? twins[0] : entry(key, key)).value = shownValue;
  }

  const byGroup = new Map(DWC_GROUPS.map((group) => [group.key, []]));
  for (const row of terms.values()) {
    // A term in a known namespace is placed by its plain name even when its row is keyed by its address.
    const placed = TERM_GROUP.get(row.name) ?? (row.name.startsWith('http') ? TERM_GROUP.get(knownName(row.name) ?? '') : undefined);
    const groupKey = placed ? placed.group : 'other';
    // Nothing interpreted: the value is what was published.
    const value = row.value ?? row.published;
    const published = row.value && row.published && !sameValue(row.value, row.published) ? row.published.text : undefined;
    byGroup.get(groupKey).push({
      name: row.name,
      label: row.label,
      text: value.text,
      ...(value.href ? { href: value.href } : {}),
      ...(value.parts ? { parts: value.parts } : {}),
      ...(published ? { published } : {}),
      ...(row.uri ? { uri: row.uri } : {}),
      _order: placed ? placed.order : Number.MAX_SAFE_INTEGER
    });
  }

  return DWC_GROUPS.map((group) => {
    const rows = byGroup.get(group.key).sort((a, b) => a._order - b._order || a.label.localeCompare(b.label)).map(({ _order, ...row }) => row);
    return { key: group.key, label: group.label, about: group.about, rows };
  }).filter((group) => group.rows.length);
}

/* ---------- extensions ---------- */

const MAX_EXTENSION_ROWS = 100;

/**
 * The extensions of a verbatim record: `{ rowType: [ { termURI: value } ] }` becomes one entry per
 * extension with its columns and rows. Rows and cells that are not plain values are dropped.
 */
export function buildExtensions(extensions) {
  if (!extensions || typeof extensions !== 'object' || Array.isArray(extensions)) return [];
  const result = [];
  for (const [rowType, records] of Object.entries(extensions)) {
    const rows = (Array.isArray(records) ? records : []).filter((r) => r && typeof r === 'object' && !Array.isArray(r));
    if (!rows.length) continue;

    const columns = [];
    const seen = new Set();
    for (const row of rows) {
      for (const [term, value] of Object.entries(row)) {
        if (!seen.has(term) && shown(localName(term), value) !== null) {
          seen.add(term);
          columns.push({ term, label: humanize(localName(term)) });
        }
      }
    }
    if (!columns.length) continue;

    result.push({
      rowType,
      name: localName(rowType),
      label: humanize(localName(rowType)),
      columns,
      rows: rows.slice(0, MAX_EXTENSION_ROWS).map((row) => columns.map(({ term }) => shown(localName(term), row[term]) ?? { text: '' })),
      omitted: Math.max(0, rows.length - MAX_EXTENSION_ROWS)
    });
  }
  return result;
}

/* ---------- media and location ---------- */

const text = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/** The images and other media of an interpreted record. The addresses must be http(s): the publisher chooses them. */
export function buildMedia(interpreted) {
  const images = [];
  const other = [];
  for (const item of Array.isArray(interpreted?.media) ? interpreted.media : []) {
    if (!item || typeof item !== 'object') continue;
    const url = safeHttpUrl(item.identifier);
    if (!url) continue;
    const license = formatLicense(item.license);
    const media = {
      // The exact string from the API: GBIF names a cached image after a hash of it.
      identifier: item.identifier,
      // The address to link to and to load: the same, checked, trimmed and written out in full.
      url,
      type: text(item.type),
      format: text(item.format),
      title: text(item.title),
      description: text(item.description),
      creator: text(item.creator),
      rightsHolder: text(item.rightsHolder),
      publisher: text(item.publisher),
      created: text(item.created),
      references: safeHttpUrl(item.references) ?? undefined,
      license
    };
    (item.type === 'StillImage' ? images : other).push(media);
  }
  return { images, other };
}

/** A number from a number or a numeric string. Not from an empty string, `null` or anything else: `Number('')` is 0. */
const toNumber = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);

/** What GBIF's location flags mean, for the ones that say the coordinates cannot be taken at face value. */
const LOCATION_ISSUES = {
  ZERO_COORDINATE: 'the coordinates are 0°, 0°',
  COORDINATE_OUT_OF_RANGE: 'the coordinates are outside the valid range',
  COORDINATE_INVALID: 'the coordinates could not be read',
  COUNTRY_COORDINATE_MISMATCH: 'the coordinates are outside the stated country',
  PRESUMED_NEGATED_LATITUDE: 'the sign of the latitude looks reversed',
  PRESUMED_NEGATED_LONGITUDE: 'the sign of the longitude looks reversed',
  PRESUMED_SWAPPED_COORDINATE: 'latitude and longitude look swapped',
  COORDINATE_REPROJECTION_FAILED: 'the coordinates could not be converted to WGS84',
  COORDINATE_REPROJECTION_SUSPICIOUS: 'the conversion of the coordinates to WGS84 looks wrong',
  COORDINATE_UNCERTAINTY_METERS_INVALID: 'the coordinate uncertainty is not valid',
  COORDINATE_PRECISION_INVALID: 'the coordinate precision is not valid'
};

/** Degrees of latitude are about this many kilometres. */
const KM_PER_DEGREE = 111;

/**
 * What a reader should be told about how far to trust the location of a record. Each note is
 * `{ kind, text }`, where `kind` is `generalized` (the location was made less exact on purpose, by the publisher
 * or by GBIF, usually to protect a sensitive species), `withheld` (the publisher held something back),
 * `flagged` (GBIF found a problem with the coordinates) or `coarse` (the coordinates are exact only to a wide area).
 * These are there even when there is no point to draw.
 */
export function buildLocationNotes(interpreted) {
  const notes = [];
  const r = interpreted && typeof interpreted === 'object' ? interpreted : {};
  const limited = (v) => (text(v) && text(v).length > 400 ? `${text(v).slice(0, 400)}…` : text(v));

  if (limited(r.dataGeneralizations)) notes.push({ kind: 'generalized', text: `The location was made less exact on purpose: ${limited(r.dataGeneralizations)}` });
  if (limited(r.informationWithheld)) notes.push({ kind: 'withheld', text: `Information was withheld: ${limited(r.informationWithheld)}` });

  const issues = (Array.isArray(r.issues) ? r.issues : []).filter((flag) => typeof flag === 'string');
  const problems = issues.filter((flag) => Object.hasOwn(LOCATION_ISSUES, flag)).map((flag) => LOCATION_ISSUES[flag]);
  const lat = toNumber(r.decimalLatitude);
  const lng = toNumber(r.decimalLongitude);
  if (lat === 0 && lng === 0 && !issues.includes('ZERO_COORDINATE')) problems.unshift(LOCATION_ISSUES.ZERO_COORDINATE);
  if (problems.length) notes.push({ kind: 'flagged', text: `Do not rely on this location: ${problems.join('; ')}.` });

  const precision = toNumber(r.coordinatePrecision);
  if (issues.includes('COORDINATE_ROUNDED') || (Number.isFinite(precision) && precision >= 0.01)) {
    const about = Number.isFinite(precision) && precision >= 0.01 ? ` to ${precision}° (about ${Math.round(precision * KM_PER_DEGREE)} km)` : '';
    notes.push({ kind: 'coarse', text: `The coordinates are rounded${about}, so the point is only roughly where it happened.` });
  }
  const uncertainty = toNumber(r.coordinateUncertaintyInMeters);
  if (Number.isFinite(uncertainty) && uncertainty >= 100_000) {
    notes.push({ kind: 'coarse', text: `The location is uncertain by ${Math.round(uncertainty / 1000).toLocaleString('en')} km.` });
  }
  return notes;
}

/**
 * Where the record says it was, if it says so in a way a map can use, with the notes on how far to trust it.
 * `approximate` is true when the point is not the exact place (generalised, rounded or very uncertain).
 */
export function buildPoint(interpreted) {
  const lat = toNumber(interpreted?.decimalLatitude);
  const lng = toNumber(interpreted?.decimalLongitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const uncertainty = toNumber(interpreted.coordinateUncertaintyInMeters);
  const notes = buildLocationNotes(interpreted);
  return {
    lat,
    lng,
    uncertainty: Number.isFinite(uncertainty) && uncertainty > 0 ? uncertainty : null,
    notes,
    approximate: notes.some((note) => note.kind === 'generalized' || note.kind === 'coarse' || note.kind === 'flagged')
  };
}
