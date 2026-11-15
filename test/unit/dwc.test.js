import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DWC_GROUPS, humanize, sentenceCase, localName, groupOf, cleanOccurrenceKey, buildGroups, buildExtensions, buildMedia, buildPoint } from '../../src/shared/dwc.js';

const DWC = 'http://rs.tdwg.org/dwc/terms/';
const DC = 'http://purl.org/dc/terms/';
const group = (groups, key) => groups.find((g) => g.key === key);
const row = (groups, key, name) => group(groups, key)?.rows.find((r) => r.name === name);

test('terms are named for people, acronyms kept', () => {
  assert.equal(humanize('decimalLatitude'), 'Decimal latitude');
  assert.equal(humanize('occurrenceID'), 'Occurrence ID');
  assert.equal(humanize('DNADerivedData'), 'DNA derived data');
  assert.equal(humanize('MeasurementOrFact'), 'Measurement or fact');
  assert.equal(humanize('coordinateUncertaintyInMeters'), 'Coordinate uncertainty in meters');
  assert.equal(humanize('CONTINENT_DERIVED_FROM_COORDINATES'), 'CONTINENT DERIVED FROM COORDINATES');
  assert.equal(humanize('class'), 'Class');
  assert.equal(humanize('gbifID'), 'GBIF ID');
  assert.equal(humanize('projectId'), 'Project ID');
  assert.equal(humanize('iucnRedListCategory'), 'IUCN red list category');
  assert.equal(humanize('footprintWKT'), 'Footprint WKT');
  assert.equal(humanize(''), '');
  assert.equal(localName('http://rs.tdwg.org/dwc/terms/locality'), 'locality');
  assert.equal(localName('http://example.org/ns#thing'), 'thing');
  assert.equal(localName('plain'), 'plain');
});

test('issue flags read as sentences', () => {
  assert.equal(sentenceCase('CONTINENT_DERIVED_FROM_COORDINATES'), 'Continent derived from coordinates');
  assert.equal(sentenceCase('ZERO_COORDINATE'), 'Zero coordinate');
  assert.equal(sentenceCase(''), '');
});

test('the groups are Darwin Core\'s, in its order, and no term is in two of them', () => {
  assert.deepEqual(DWC_GROUPS.map((g) => g.key), ['record-level', 'occurrence', 'organism', 'material-entity', 'event', 'location', 'geological-context', 'identification', 'taxon', 'gbif', 'other']);
  const seen = new Map();
  for (const g of DWC_GROUPS) for (const t of g.terms) {
    assert.equal(seen.has(t), false, `${t} is in ${seen.get(t)} and ${g.key}`);
    seen.set(t, g.key);
  }
  for (const [term, expected] of Object.entries({ locality: 'location', decimalLatitude: 'location', eventDate: 'event', habitat: 'event', recordedBy: 'occurrence', scientificName: 'taxon', typeStatus: 'identification', preparations: 'material-entity', formation: 'geological-context', license: 'record-level', basisOfRecord: 'record-level', gbifID: 'gbif', issues: 'gbif', organismName: 'organism', nonsense: 'other' })) {
    assert.equal(groupOf(term), expected, term);
  }
});

test('an occurrence key is digits only', () => {
  assert.equal(cleanOccurrenceKey('5938145577'), '5938145577');
  assert.equal(cleanOccurrenceKey(5938145577), '5938145577');
  assert.equal(cleanOccurrenceKey(' 12 '), '12');
  for (const bad of ['', 'abc', '12a', '1/2', '../1', '1?x=1', '1#a', '-1', '1.5', '1e5', null, undefined, {}, '1'.repeat(20)]) assert.equal(cleanOccurrenceKey(bad), undefined, String(bad));
});

test('a record is sorted into Darwin Core groups, in order, with empty groups left out', () => {
  const groups = buildGroups({
    interpreted: { key: 1, scientificName: 'Puma concolor', country: 'Chile', countryCode: 'CL', locality: 'Torres del Paine', decimalLatitude: -51.1, eventDate: '2020-01-02', recordedBy: 'Ana', basisOfRecord: 'HUMAN_OBSERVATION', gbifID: '1', typeStatus: 'Holotype' }
  });
  assert.deepEqual(groups.map((g) => g.key), ['record-level', 'occurrence', 'event', 'location', 'identification', 'taxon', 'gbif']);
  assert.deepEqual(group(groups, 'location').rows.map((r) => r.name), ['country', 'countryCode', 'locality', 'decimalLatitude'], 'in the standard\'s order within a group');
  assert.equal(row(groups, 'location', 'country').label, 'Country');
  assert.equal(row(groups, 'location', 'decimalLatitude').text, '-51.1');
  assert.ok(groups.every((g) => g.rows.length && g.label && g.about));
});

test('interpreted values are shown, and the value as published only when it differs', () => {
  const groups = buildGroups({
    interpreted: { decimalLatitude: 44.59237, eventDate: '2026-01-02T12:30:25', license: 'http://creativecommons.org/licenses/by-nc/4.0/legalcode', scientificName: 'Puma concolor (Linnaeus, 1771)', countryCode: 'US', year: 2026 },
    verbatim: {
      [`${DWC}decimalLatitude`]: '44.592370',
      [`${DWC}eventDate`]: '2026-01-02T12:30:25-08:00',
      [`${DC}license`]: 'http://creativecommons.org/licenses/by-nc/4.0/',
      [`${DWC}scientificName`]: 'Puma concolor',
      [`${DWC}countryCode`]: 'US',
      [`${DWC}year`]: '2026',
      [`${DWC}habitat`]: 'forest edge'
    }
  });
  assert.equal(row(groups, 'location', 'decimalLatitude').published, undefined, 'the same number written differently is not a difference');
  assert.equal(row(groups, 'record-level', 'license').published, undefined, 'a licence as a label and as an address is the same licence');
  assert.equal(row(groups, 'location', 'countryCode').published, undefined);
  assert.equal(row(groups, 'event', 'year').published, undefined);
  assert.equal(row(groups, 'event', 'eventDate').published, '2026-01-02T12:30:25-08:00');
  assert.equal(row(groups, 'taxon', 'scientificName').published, 'Puma concolor');
  assert.equal(row(groups, 'taxon', 'scientificName').text, 'Puma concolor (Linnaeus, 1771)');
  assert.equal(row(groups, 'event', 'habitat').text, 'forest edge', 'a term only in the verbatim record is shown as it was published');
  assert.equal(row(groups, 'event', 'habitat').published, undefined);
});

test('the licence is shown as a label with a link', () => {
  const groups = buildGroups({ interpreted: { license: 'http://creativecommons.org/licenses/by/4.0/legalcode' } });
  const license = row(groups, 'record-level', 'license');
  assert.equal(license.text, 'CC BY 4.0');
  assert.equal(license.href, 'http://creativecommons.org/licenses/by/4.0/legalcode');
});

test('values are formatted: units, booleans, lists, issue flags, empty values dropped', () => {
  const groups = buildGroups({
    interpreted: {
      coordinateUncertaintyInMeters: 30,
      minimumElevationInMeters: 2300,
      decimalLongitude: -72.123456789,
      isSequenced: false,
      isInCluster: true,
      issues: ['CONTINENT_DERIVED_FROM_COORDINATES', 'TAXON_ID_NOT_FOUND'],
      recordedBy: ['A', 'B'],
      locality: '   ',
      habitat: null,
      sex: '',
      lifeStage: [],
      individualCount: 0
    }
  });
  assert.equal(row(groups, 'location', 'coordinateUncertaintyInMeters').text, '30 m');
  assert.equal(row(groups, 'location', 'minimumElevationInMeters').text, '2300 m');
  assert.equal(row(groups, 'location', 'decimalLongitude').text, '-72.123457');
  assert.equal(row(groups, 'gbif', 'isSequenced').text, 'No');
  assert.equal(row(groups, 'gbif', 'isInCluster').text, 'Yes');
  assert.equal(row(groups, 'gbif', 'issues').text, 'Continent derived from coordinates, Taxon id not found', 'flags are sentences, not capitals');
  assert.equal(row(groups, 'occurrence', 'recordedBy').text, 'A | B');
  assert.deepEqual(row(groups, 'occurrence', 'recordedBy').parts, [{ text: 'A' }, { text: 'B' }], 'several values are shown one to a line');
  assert.equal(row(groups, 'occurrence', 'individualCount').text, '0', 'a zero is a value');
  for (const empty of ['locality', 'habitat', 'sex', 'lifeStage']) assert.equal(groups.flatMap((g) => g.rows).some((r) => r.name === empty), false, empty);
});

test('what GBIF adds goes to its own group, and what is not Darwin Core to "Other terms", nothing dropped', () => {
  const groups = buildGroups({
    interpreted: { gbifID: '5', taxonKey: 12, lastInterpreted: '2026-01-01', 'http://unknown.org/nick': 'wifeofplaid', someNewThing: 'x' },
    verbatim: { key: 5, datasetKey: 'ignored', lastCrawled: 'ignored', extensions: {}, 'http://xmlns.com/foaf/0.1/nick': 'wifeofplaid', 'https://www.inaturalist.org/terminology/captive_cultivated': 'false' }
  });
  assert.deepEqual(group(groups, 'gbif').rows.map((r) => r.name), ['gbifID', 'lastInterpreted', 'taxonKey']);
  const other = group(groups, 'other').rows;
  assert.deepEqual(other.map((r) => r.label).sort(), ['Captive cultivated', 'Nick', 'Some new thing'], 'GBIF\'s rewrite of a term and the term itself are one row');
  assert.ok(other.find((r) => r.uri === 'http://xmlns.com/foaf/0.1/nick'), 'the term\'s real address is kept');
  assert.equal(group(groups, 'gbif').rows.some((r) => r.name === 'datasetKey' && r.text === 'ignored'), false, 'GBIF\'s bookkeeping in the verbatim record is not a term');
});

test('structural parts of the record are not rows', () => {
  const groups = buildGroups({ interpreted: { key: 1, media: [{}], extensions: { a: [] }, facts: [], relations: [], identifiers: [{ identifier: '1' }], classifications: { x: {} }, gadm: { level0: {} }, scientificName: 'X' } });
  assert.deepEqual(groups.flatMap((g) => g.rows.map((r) => r.name)), ['scientificName']);
});

test('hostile values stay text, and only web addresses become links', () => {
  const groups = buildGroups({
    interpreted: { references: 'javascript:alert(1)', occurrenceID: 'https://example.org/occ/1', locality: '<img src=x onerror=alert(1)>', rightsHolder: { not: 'a string' } },
    verbatim: { [`${DC}references`]: 'data:text/html,x' }
  });
  assert.equal(row(groups, 'record-level', 'references').href, undefined, 'javascript: is not a link');
  assert.equal(row(groups, 'record-level', 'references').text, 'javascript:alert(1)');
  assert.equal(row(groups, 'occurrence', 'occurrenceID').href, 'https://example.org/occ/1');
  assert.equal(row(groups, 'location', 'locality').text, '<img src=x onerror=alert(1)>');
  assert.equal(row(groups, 'record-level', 'rightsHolder'), undefined, 'an object is not a value');
});

test('either record may be missing, and nonsense is tolerated', () => {
  assert.deepEqual(buildGroups(), []);
  assert.deepEqual(buildGroups({ interpreted: null, verbatim: null }), []);
  assert.deepEqual(buildGroups({ interpreted: 5, verbatim: 'x' }), []);
  assert.equal(buildGroups({ verbatim: { [`${DWC}locality`]: 'Here' } })[0].rows[0].text, 'Here');
  assert.equal(buildGroups({ interpreted: { locality: 'There' } })[0].rows[0].text, 'There');
});

/* ---------- extensions ---------- */

test('extensions: one entry each, with the columns their records use, in the order seen', () => {
  const extensions = {
    'http://rs.tdwg.org/dwc/terms/MeasurementOrFact': [
      { [`${DWC}measurementType`]: 'body mass', [`${DWC}measurementValue`]: 4.5, [`${DWC}measurementUnit`]: 'kg' },
      { [`${DWC}measurementType`]: 'length', [`${DWC}measurementValue`]: '1.2', [`${DWC}measurementRemarks`]: 'tip to tail' }
    ],
    'http://rs.gbif.org/terms/1.0/DNADerivedData': [{ [`${DWC}marker`]: 'COI' }],
    'http://rs.tdwg.org/dwc/terms/ResourceRelationship': [],
    'http://example.org/Empty': [{ a: '', b: null }],
    'http://example.org/NotAList': 5
  };
  const result = buildExtensions(extensions);
  assert.deepEqual(result.map((e) => e.label), ['Measurement or fact', 'DNA derived data']);
  const [mof] = result;
  assert.deepEqual(mof.columns.map((c) => c.label), ['Measurement type', 'Measurement value', 'Measurement unit', 'Measurement remarks']);
  assert.deepEqual(mof.rows[0].map((c) => c.text), ['body mass', '4.5', 'kg', '']);
  assert.deepEqual(mof.rows[1].map((c) => c.text), ['length', '1.2', '', 'tip to tail'], 'a record without a term leaves the cell empty');
  assert.equal(mof.omitted, 0);
});

test('extensions: long ones are cut, the number left out is said, and bad input is tolerated', () => {
  const many = { 'http://example.org/Big': Array.from({ length: 130 }, (_, i) => ({ 'http://example.org/n': i })) };
  const [big] = buildExtensions(many);
  assert.equal(big.rows.length, 100);
  assert.equal(big.omitted, 30);
  for (const bad of [null, undefined, [], 'x', 5, { a: 'x' }, { a: [null, 5, 'x', []] }]) assert.deepEqual(buildExtensions(bad), [], JSON.stringify(bad));
  const linked = buildExtensions({ 'http://example.org/Links': [{ 'http://example.org/ref': 'https://example.org/a', 'http://example.org/bad': 'javascript:alert(1)' }] })[0];
  assert.equal(linked.rows[0][0].href, 'https://example.org/a');
  assert.equal(linked.rows[0][1].href, undefined);
});

/* ---------- media and location ---------- */

test('media: usable still images with their credit, other media apart, nothing unsafe', () => {
  const { images, other } = buildMedia({
    media: [
      null,
      5,
      { type: 'StillImage', identifier: 'javascript:alert(1)' },
      { type: 'StillImage', identifier: 'https://img.example/1.jpg', creator: ' Ana ', rightsHolder: '', publisher: 'iNaturalist', license: 'http://creativecommons.org/licenses/by/4.0/', references: 'https://www.inaturalist.org/photos/1', created: '2025-01-01', format: 'image/jpeg' },
      { type: 'StillImage', identifier: 'https://img.example/2.jpg', references: 'javascript:alert(2)', license: { x: 1 } },
      { type: 'Sound', identifier: 'https://img.example/a.mp3', title: 'Call' },
      { type: 'MovingImage', identifier: 'ftp://img.example/v.mp4' }
    ]
  });
  assert.equal(images.length, 2);
  assert.equal(images[0].identifier, 'https://img.example/1.jpg');
  assert.equal(images[0].creator, 'Ana');
  assert.equal(images[0].rightsHolder, undefined);
  assert.equal(images[0].license.key, 'cc-by');
  assert.equal(images[0].references, 'https://www.inaturalist.org/photos/1');
  assert.equal(images[1].references, undefined, 'an unsafe address is not kept');
  assert.equal(images[1].license, null);
  assert.deepEqual(other.map((m) => [m.type, m.title]), [['Sound', 'Call']]);
  assert.deepEqual(buildMedia({}), { images: [], other: [] });
  assert.deepEqual(buildMedia({ media: 'x' }), { images: [], other: [] });
});

test('a point is only made from usable coordinates', () => {
  assert.deepEqual(buildPoint({ decimalLatitude: -51.1, decimalLongitude: -72.9, coordinateUncertaintyInMeters: 30 }), { lat: -51.1, lng: -72.9, uncertainty: 30 });
  assert.deepEqual(buildPoint({ decimalLatitude: '10.5', decimalLongitude: '20' }), { lat: 10.5, lng: 20, uncertainty: null });
  assert.deepEqual(buildPoint({ decimalLatitude: 0, decimalLongitude: 0 }), { lat: 0, lng: 0, uncertainty: null }, 'zero is a place');
  assert.equal(buildPoint({ decimalLatitude: 1, decimalLongitude: 2, coordinateUncertaintyInMeters: 0 }).uncertainty, null);
  assert.equal(buildPoint({ decimalLatitude: 1, decimalLongitude: 2, coordinateUncertaintyInMeters: -5 }).uncertainty, null);
  for (const bad of [{}, null, undefined, { decimalLatitude: 91, decimalLongitude: 0 }, { decimalLatitude: 0, decimalLongitude: 181 }, { decimalLatitude: '', decimalLongitude: '' }, { decimalLatitude: null, decimalLongitude: null }, { decimalLatitude: 'north', decimalLongitude: 1 }, { decimalLatitude: 1 }, { decimalLatitude: NaN, decimalLongitude: 1 }, { decimalLatitude: [1], decimalLongitude: 1 }]) {
    assert.equal(buildPoint(bad), null, JSON.stringify(bad));
  }
});

/* ---------- what the first look at real data showed ---------- */

test('GBIF\'s own terms in the verbatim record are the same rows as in the interpreted one, and a term in two spellings is one row', () => {
  const groups = buildGroups({
    interpreted: { gbifID: '5938145577', projectId: 'https://example.org/p1' },
    verbatim: { 'http://rs.gbif.org/terms/1.0/gbifID': '5938145577', [`${DWC}projectID`]: 'https://example.org/p1' }
  });
  assert.deepEqual(groups.map((g) => g.key), ['gbif'], 'nothing left over in "Other terms"');
  assert.deepEqual(group(groups, 'gbif').rows.map((r) => [r.name, r.label]), [['gbifID', 'GBIF ID'], ['projectId', 'Project ID']]);
  assert.equal(group(groups, 'gbif').rows.some((r) => r.published), false);
});

test('a term GBIF did not recognise is one row, and stands alone only if the verbatim record does not have it', () => {
  const groups = buildGroups({
    interpreted: { 'http://unknown.org/nick': 'ann', 'http://unknown.org/only_here': 'x' },
    verbatim: { 'http://xmlns.com/foaf/0.1/nick': 'ann' }
  });
  const other = group(groups, 'other').rows;
  assert.deepEqual(other.map((r) => r.label).sort(), ['Nick', 'Only here']);
  assert.equal(other.find((r) => r.label === 'Nick').uri, 'http://xmlns.com/foaf/0.1/nick');
  assert.equal(other.find((r) => r.label === 'Nick').published, undefined);
});

test('values separated by "|" or given as a list are shown one to a line, each linked if it is an address', () => {
  const groups = buildGroups({
    interpreted: { projectId: 'https://example.org/a|https://example.org/b', recordedBy: 'Ana | Ben', identifiedBy: ['Cy'], references: 'https://example.org/one' }
  });
  const project = row(groups, 'gbif', 'projectId');
  assert.deepEqual(project.parts, [{ text: 'https://example.org/a', href: 'https://example.org/a' }, { text: 'https://example.org/b', href: 'https://example.org/b' }]);
  assert.equal(project.href, undefined, 'not one link over two addresses');
  assert.deepEqual(row(groups, 'occurrence', 'recordedBy').parts.map((p) => p.text), ['Ana', 'Ben']);
  assert.equal(row(groups, 'identification', 'identifiedBy').parts, undefined, 'one value is just a value');
  assert.equal(row(groups, 'identification', 'identifiedBy').text, 'Cy');
  assert.equal(row(groups, 'record-level', 'references').href, 'https://example.org/one');
  assert.equal(buildGroups({ interpreted: { recordedBy: '|' } }).length, 0);
  // Something that is not an address, with a space in it, is text and not a link.
  assert.equal(row(buildGroups({ interpreted: { references: 'https://example.org/a b' } }), 'record-level', 'references').href, undefined);
});

test('GBIF\'s capitals are made readable in the interpreted values, and the published value shows what was sent', () => {
  const groups = buildGroups({
    interpreted: { basisOfRecord: 'HUMAN_OBSERVATION', continent: 'NORTH_AMERICA', occurrenceStatus: 'DETECTED', taxonRank: 'SPECIES', iucnRedListCategory: 'LC', typeStatus: 'Holotype', scientificName: 'PUMA' },
    verbatim: { [`${DWC}basisOfRecord`]: 'HumanObservation', [`${DWC}continent`]: 'North America' }
  });
  assert.equal(row(groups, 'record-level', 'basisOfRecord').text, 'Human observation');
  assert.equal(row(groups, 'record-level', 'basisOfRecord').published, 'HumanObservation');
  assert.equal(row(groups, 'location', 'continent').text, 'North America', 'a name keeps its capitals');
  assert.equal(row(groups, 'location', 'continent').published, undefined, 'and then it is what was published');
  assert.equal(row(groups, 'occurrence', 'occurrenceStatus').text, 'Detected');
  assert.equal(row(groups, 'taxon', 'taxonRank').text, 'Species');
  assert.equal(row(groups, 'taxon', 'iucnRedListCategory').text, 'LC', 'a code is not a sentence');
  assert.equal(row(groups, 'identification', 'typeStatus').text, 'Holotype');
  assert.equal(row(groups, 'taxon', 'scientificName').text, 'PUMA', 'text the publisher wrote is not touched');
  const verbatimOnly = buildGroups({ verbatim: { [`${DWC}basisOfRecord`]: 'HUMAN_OBSERVATION' } });
  assert.equal(row(verbatimOnly, 'record-level', 'basisOfRecord').text, 'HUMAN_OBSERVATION', 'a published value is shown as published');
});

test('the same moment written two ways is not a difference, a different moment is', () => {
  const groups = buildGroups({
    interpreted: { modified: '2026-07-01T16:12:46.000+00:00', dateIdentified: '2026-01-03T03:06:07', eventDate: '2026-01-02T12:30:25' },
    verbatim: { [`${DC}modified`]: '2026-07-01T16:12:46Z', [`${DWC}dateIdentified`]: '2026-01-03T03:06:07Z', [`${DWC}eventDate`]: '2026-01-02T12:30:25-08:00' }
  });
  assert.equal(row(groups, 'record-level', 'modified').published, undefined);
  assert.equal(row(groups, 'identification', 'dateIdentified').published, '2026-01-03T03:06:07Z');
  assert.equal(row(groups, 'event', 'eventDate').published, '2026-01-02T12:30:25-08:00');
});
