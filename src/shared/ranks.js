/** Ranks for which it makes sense to look for images (family and below). */
export const IMAGE_RANKS = new Set([
  'FAMILY', 'SUBFAMILY', 'INFRAFAMILY', 'SUPERTRIBE', 'TRIBE', 'SUBTRIBE', 'INFRATRIBE',
  'SUPERGENUS', 'GENUS', 'SUBGENUS', 'INFRAGENUS', 'SECTION', 'SUBSECTION', 'SERIES',
  'SUBSERIES', 'SPECIES_AGGREGATE', 'SPECIES', 'SUBSPECIES', 'INFRASUBSPECIFIC_NAME',
  'VARIETY', 'SUBVARIETY', 'FORM', 'SUBFORM', 'CULTIVAR', 'CULTIVAR_GROUP', 'CONVARIETY',
  'GREX', 'STRAIN', 'PATHOVAR', 'BIOVAR', 'CHEMOVAR', 'MORPHOVAR', 'PHAGOVAR', 'SEROVAR',
  'FORMA_SPECIALIS', 'ABERRATION', 'RACE', 'NATIO', 'PROLES'
]);

/** Ranks for which the type specimen list is shown. */
export const TYPE_RANKS = new Set(['SPECIES', 'GENUS']);

/** Type status values used to filter occurrences down to type specimens. */
export const TYPE_STATUSES = [
  'Paratype', 'Holotype', 'Type', 'Isotype', 'Syntype', 'OriginalMaterial', 'Lectotype',
  'Isolectotype', 'Paralectotype', 'Isosyntype', 'Plastoisotype', 'Plastoneotype', 'Exsyntype',
  'Exneotype', 'Exlectotype', 'Exepitype', 'Plastolectotype', 'Exparatype', 'Allolectotype',
  'Exisotype', 'Exholotype', 'Plastosyntype', 'Clonotype', 'SupplementaryType', 'Plastoparatype',
  'Metatype', 'Hapantotype', 'Isoepitype', 'Plastotype', 'Plastoholotype', 'Paraneotype', 'Extype',
  'Alloneotype', 'Isoparatype', 'Paratopotype', 'Epitype', 'Plesiotype', 'Isoneotype',
  'SecondaryType', 'TypeStrain', 'TypeSeries', 'Homeotype', 'Neotype', 'Cotype', 'Topotype',
  'Allotype', 'Hypotype', 'Iconotype'
];
