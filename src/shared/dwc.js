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
    terms: ['occurrenceID', 'catalogNumber', 'recordNumber', 'recordedBy', 'recordedByID', 'individualCount', 'organismQuantity', 'organismQuantityType', 'sex', 'lifeStage', 'reproductiveCondition', 'caste', 'behavior', 'vitality', 'establishmentMeans', 'degreeOfEstablishment', 'pathway', 'occurrenceStatus', 'otherCatalogNumbers', 'associatedMedia', 'associatedOccurrences', 'associatedReferences', 'associatedSequences', 'associatedTaxa', 'occurrenceRemarks']
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
    terms: ['materialEntityID', 'materialSampleID', 'preparations', 'disposition', 'verbatimLabel', 'materialEntityRemarks']
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
    about: 'GBIF\'s own identifiers, dates and quality flags. Not Darwin Core.',
    terms: ['gbifID', 'datasetKey', 'publishingOrgKey', 'installationKey', 'hostingOrganizationKey', 'publishingCountry', 'publishedByGbifRegion', 'gbifRegion', 'protocol', 'crawlId', 'lastCrawled', 'lastParsed', 'lastInterpreted', 'issues', 'taxonKey', 'acceptedTaxonKey', 'kingdomKey', 'phylumKey', 'classKey', 'orderKey', 'familyKey', 'genusKey', 'speciesKey', 'isSequenced', 'isInCluster', 'dnaSequenceID', 'projectId']
  },
  {
    key: 'other',
    label: 'Other terms',
    about: 'Terms the publisher used that are not part of Darwin Core, as published.',
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
const STRUCTURAL_KEYS = new Set(['extensions', 'media', 'facts', 'relations', 'identifiers', 'classifications', 'gadm', 'key']);

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
    return /InMeters$/.test(name) ? `${value} m` : String(value);
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
  const items = Array.isArray(value) && value.length && value.every(isScalar) ? value : typeof value === 'string' && value.includes('|') ? value.split('|') : null;
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

/** The same value, shown two ways: a number written differently, or a licence given as a label and as an address. */
function sameValue(a, b) {
  if (a.text.toLowerCase() === b.text.toLowerCase()) return true;
  // The same moment written two ways: `...46.000+00:00` and `...46Z`.
  // Only when both say which zone they are in, or both say none: a time with no zone could be any, and whether it
  // equals one in UTC would depend on the reader's own clock.
  const isInstant = (v) => /^\d{4}-\d{2}-\d{2}T/.test(v.text);
  const hasZone = (v) => /(Z|[+-]\d{2}:?\d{2})$/i.test(v.text);
  if (isInstant(a) && isInstant(b) && hasZone(a) === hasZone(b) && Date.parse(a.text) === Date.parse(b.text)) return true;
  const [x, y] = [Number(a.text.replace(/ m$/, '')), Number(b.text.replace(/ m$/, ''))];
  if (a.text !== '' && b.text !== '' && Number.isFinite(x) && Number.isFinite(y) && x === y) return true;
  const address = (v) => v.href?.replace(/^https?:/, '').replace(/\/(legalcode|deed\.[a-z]+)$/i, '').replace(/\/$/, '').toLowerCase();
  return !!a.href && !!b.href && address(a) === address(b);
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

  const verbatimByLocalName = new Map();
  if (verbatim && typeof verbatim === 'object') {
    for (const [uri, value] of Object.entries(verbatim)) {
      if (!uri.startsWith('http')) continue; // GBIF's own bookkeeping, not a term
      const name = knownName(uri) ?? uri;
      const shownValue = shown(localName(uri), value);
      if (!shownValue) continue;
      const row = entry(name, uri);
      if (!row.uri) row.uri = uri;
      row.published = shownValue;
      if (!knownName(uri)) verbatimByLocalName.set(localName(uri).toLowerCase(), row);
    }
  }

  // A term GBIF did not recognise is in the verbatim record under its real address as well: that is the same
  // term, so it is one row. Only a term with no verbatim twin stands on its own.
  for (const [key, shownValue] of unknownInterpreted) {
    const twin = verbatimByLocalName.get(localName(key).toLowerCase());
    (twin ?? entry(key, key)).value = shownValue;
  }

  const byGroup = new Map(DWC_GROUPS.map((group) => [group.key, []]));
  for (const row of terms.values()) {
    const placed = TERM_GROUP.get(row.name);
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
    const identifier = safeHttpUrl(item.identifier) ? item.identifier : null;
    if (!identifier) continue;
    const license = formatLicense(item.license);
    const media = {
      // The exact string from the API: GBIF names a cached image after a hash of it.
      identifier,
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

/** Where the record says it was, if it says so in a way a map can use. */
export function buildPoint(interpreted) {
  const lat = toNumber(interpreted?.decimalLatitude);
  const lng = toNumber(interpreted?.decimalLongitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const uncertainty = toNumber(interpreted.coordinateUncertaintyInMeters);
  return { lat, lng, uncertainty: Number.isFinite(uncertainty) && uncertainty > 0 ? uncertainty : null };
}
