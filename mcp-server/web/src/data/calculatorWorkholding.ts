import type { MachineMode, SelectionOption } from './calculatorWorkspace';

export interface WorkholdingPresetOption extends SelectionOption {
  modes: MachineMode[];
  categoryId: string;
  brandId: string;
  workholdingId: string;
  stabilityId: string;
}

export interface WorkholdingCatalogBundle {
  categoryOptions: SelectionOption[];
  brandOptions: SelectionOption[];
  presetOptions: WorkholdingPresetOption[];
  stabilityOptions: SelectionOption[];
}

export const WORKHOLDING_CATEGORY_OPTIONS: Record<MachineMode, SelectionOption[]> = {
  mill: [
    { id: 'all', label: 'All workholding', detail: 'Show vise, fixture, and rotary options together.' },
    { id: 'vise', label: 'Vise systems', detail: 'Standard, 5-axis, and self-centering vise packages.' },
    { id: 'fixture', label: 'Fixture systems', detail: 'Plate, modular, and repeatable fixture packages.' },
    { id: 'rotary', label: 'Rotary / trunnion', detail: '4th-axis and 3+2-ready workholding.' },
  ],
  lathe: [
    { id: 'all', label: 'All workholding', detail: 'Show chucking, collet, and Swiss support packages.' },
    { id: 'chucking', label: 'Chucking / collet', detail: 'Standard chuck, collet, and bar workholding.' },
    { id: 'support', label: 'Support systems', detail: 'Tailstock, sub-spindle, and Swiss support options.' },
  ],
  edm: [
    { id: 'all', label: 'All workholding', detail: 'Show pallet, reference, and cavity support packages.' },
    { id: 'reference', label: 'Reference systems', detail: 'EROWA / 3R reference pallets and locators.' },
    { id: 'fixture', label: 'Fixture systems', detail: 'Plate and custom cavity support options.' },
  ],
  wire_edm: [
    { id: 'all', label: 'All workholding', detail: 'Show low-profile and tab/slug-control fixture packages.' },
    { id: 'wire', label: 'Wire fixtures', detail: 'Low-profile locating and contour-support packages.' },
    { id: 'slug', label: 'Slug control', detail: 'Packages focused on slug retention and safe release.' },
  ],
  laser: [
    { id: 'all', label: 'All workholding', detail: 'Show sheet, nest, and support-table packages.' },
    { id: 'sheet', label: 'Sheet support', detail: 'Slat, table, and flat-sheet support options.' },
    { id: 'nesting', label: 'Nest control', detail: 'Microjoint and nest-retention support strategies.' },
  ],
  waterjet: [
    { id: 'all', label: 'All workholding', detail: 'Show plate support and pierce-safe support packages.' },
    { id: 'plate', label: 'Plate support', detail: 'Cold-cut plate support and slat packages.' },
    { id: 'pierce', label: 'Pierce-safe', detail: 'Entry-safe packages for fragile or brittle stock.' },
  ],
};

export const WORKHOLDING_BRAND_OPTIONS: Record<MachineMode, SelectionOption[]> = {
  mill: [
    { id: 'all', label: 'All brands', detail: 'Show every milling workholding brand.' },
    { id: 'kurt', label: 'Kurt', detail: 'General-purpose precision vise systems.' },
    { id: 'orange-vise', label: 'Orange Vise', detail: '5-axis and self-centering vise platforms.' },
    { id: '5th-axis', label: '5th Axis', detail: 'Modular and self-centering fixture systems.' },
    { id: 'chick', label: 'Chick', detail: 'Fixture plates and multi-part workholding.' },
  ],
  lathe: [
    { id: 'all', label: 'All brands', detail: 'Show all chucking and support brands.' },
    { id: 'hainbuch', label: 'Hainbuch', detail: 'Collet, chuck, and bar workholding.' },
    { id: 'smw', label: 'SMW Autoblok', detail: 'General chucking packages and jaw sets.' },
    { id: 'citizen', label: 'Citizen', detail: 'Swiss support and guide-bushing packages.' },
  ],
  edm: [
    { id: 'all', label: 'All brands', detail: 'Show all EDM fixture brands.' },
    { id: 'erowa', label: 'EROWA', detail: 'Reference pallets and EDM tooling.' },
    { id: 'three-r', label: '3R', detail: 'Reference tooling and repeatability packages.' },
  ],
  wire_edm: [
    { id: 'all', label: 'All brands', detail: 'Show all wire-fixture brands.' },
    { id: 'fanuc', label: 'FANUC', detail: 'General wire-fixture and guide support.' },
    { id: 'makino', label: 'Makino', detail: 'High-finish and taper support packages.' },
  ],
  laser: [
    { id: 'all', label: 'All brands', detail: 'Show all sheet-support brands.' },
    { id: 'trumpf', label: 'TRUMPF', detail: 'TruLaser sheet support and nesting support.' },
    { id: 'bystronic', label: 'Bystronic', detail: 'Sheet support and cut-quality support setups.' },
  ],
  waterjet: [
    { id: 'all', label: 'All brands', detail: 'Show all cold-cut support brands.' },
    { id: 'omax', label: 'OMAX', detail: 'Abrasive plate support packages.' },
    { id: 'flow', label: 'Flow', detail: 'Dynamic taper and support-table setups.' },
  ],
};

export const WORKHOLDING_PRESET_LIBRARY: WorkholdingPresetOption[] = [
  {
    id: 'kurt-vise-parallels',
    label: 'Kurt vise + parallels',
    detail: 'Classic plate/block setup that matches the old default mill setup callout.',
    modes: ['mill'],
    categoryId: 'vise',
    brandId: 'kurt',
    workholdingId: 'vise-soft-jaw',
    stabilityId: 'production-stable',
  },
  {
    id: 'orange-vise-5axis',
    label: 'Orange Vise 5-axis',
    detail: 'Tall vise posture for tombstone-style or 3+2 prep work.',
    modes: ['mill'],
    categoryId: 'vise',
    brandId: 'orange-vise',
    workholdingId: 'vise-soft-jaw',
    stabilityId: 'aggressive-rigid',
  },
  {
    id: 'chick-one-lok',
    label: 'Chick One-Lok fixture',
    detail: 'Repeatable multi-part fixture plate setup for production runs.',
    modes: ['mill'],
    categoryId: 'fixture',
    brandId: 'chick',
    workholdingId: 'fixture-plate',
    stabilityId: 'production-stable',
  },
  {
    id: '5th-axis-rocklock',
    label: '5th Axis RockLock',
    detail: 'Quick-change modular fixture system for denser setup changes.',
    modes: ['mill'],
    categoryId: 'fixture',
    brandId: '5th-axis',
    workholdingId: 'fixture-plate',
    stabilityId: 'aggressive-rigid',
  },
  {
    id: 'haas-trt-package',
    label: 'TRT trunnion package',
    detail: 'Rotary / trunnion posture for index work and multiaxis staging.',
    modes: ['mill'],
    categoryId: 'rotary',
    brandId: '5th-axis',
    workholdingId: 'rotary-trunnion',
    stabilityId: 'index-ready',
  },
  {
    id: 'hainbuch-collet',
    label: 'Hainbuch collet chuck',
    detail: 'High-concentricity lathe workholding for bar and chucking work.',
    modes: ['lathe'],
    categoryId: 'chucking',
    brandId: 'hainbuch',
    workholdingId: 'collet-chuck',
    stabilityId: 'production-stable',
  },
  {
    id: 'smw-jaw-chuck',
    label: 'SMW jaw chuck',
    detail: 'General turning chuck package for OD roughing and finishing.',
    modes: ['lathe'],
    categoryId: 'chucking',
    brandId: 'smw',
    workholdingId: 'collet-chuck',
    stabilityId: 'production-stable',
  },
  {
    id: 'citizen-guide-bushing',
    label: 'Swiss guide-bushing support',
    detail: 'Swiss support posture for long, small-diameter parts.',
    modes: ['lathe'],
    categoryId: 'support',
    brandId: 'citizen',
    workholdingId: 'collet-chuck',
    stabilityId: 'swiss-support',
  },
  {
    id: 'erowa-reference-pallet',
    label: 'EROWA reference pallet',
    detail: 'Repeatable sinker EDM reference pallet and locator package.',
    modes: ['edm'],
    categoryId: 'reference',
    brandId: 'erowa',
    workholdingId: 'wire-fixture',
    stabilityId: 'detail-control',
  },
  {
    id: '3r-cavity-fixture',
    label: '3R cavity fixture',
    detail: 'Fine-detail cavity support posture for EDM burn setups.',
    modes: ['edm'],
    categoryId: 'fixture',
    brandId: 'three-r',
    workholdingId: 'wire-fixture',
    stabilityId: 'detail-control',
  },
  {
    id: 'system3r-reference-pallet',
    label: 'System 3R reference pallet',
    detail: 'System 3R electrode pallet and locator package that keeps Roku-Roku machining datums aligned with sinker setup.',
    modes: ['edm'],
    categoryId: 'reference',
    brandId: 'three-r',
    workholdingId: 'wire-fixture',
    stabilityId: 'detail-control',
  },
  {
    id: 'fanuc-low-profile',
    label: 'Low-profile wire fixture',
    detail: 'Contour-ready wire setup with low obstruction and easy flushing.',
    modes: ['wire_edm'],
    categoryId: 'wire',
    brandId: 'fanuc',
    workholdingId: 'wire-fixture',
    stabilityId: 'detail-control',
  },
  {
    id: 'makino-slug-retention',
    label: 'Slug-retention wire fixture',
    detail: 'Fixture posture biased toward safe slug control and finish skim passes.',
    modes: ['wire_edm'],
    categoryId: 'slug',
    brandId: 'makino',
    workholdingId: 'wire-fixture',
    stabilityId: 'detail-control',
  },
  {
    id: 'trumpf-sheet-support',
    label: 'TRUMPF sheet support',
    detail: 'Stable flat-sheet support for contour and quality cutting.',
    modes: ['laser'],
    categoryId: 'sheet',
    brandId: 'trumpf',
    workholdingId: 'fixture-plate',
    stabilityId: 'sheet-flat',
  },
  {
    id: 'bystronic-nest-support',
    label: 'Bystronic nest support',
    detail: 'Nest-focused support posture with microjoint retention in mind.',
    modes: ['laser'],
    categoryId: 'nesting',
    brandId: 'bystronic',
    workholdingId: 'fixture-plate',
    stabilityId: 'sheet-flat',
  },
  {
    id: 'omax-standard-slats',
    label: 'OMAX slat support',
    detail: 'Standard plate support for abrasive contour work.',
    modes: ['waterjet'],
    categoryId: 'plate',
    brandId: 'omax',
    workholdingId: 'fixture-plate',
    stabilityId: 'cold-cut-stable',
  },
  {
    id: 'flow-pierce-safe',
    label: 'Flow pierce-safe support',
    detail: 'Support posture tuned for pierce scheduling and brittle stock.',
    modes: ['waterjet'],
    categoryId: 'pierce',
    brandId: 'flow',
    workholdingId: 'fixture-plate',
    stabilityId: 'cold-cut-stable',
  },
];

export const STABILITY_OPTIONS: SelectionOption[] = [
  { id: 'production-stable', label: 'Production stable', detail: 'Balanced default for repeatable day-to-day machining.' },
  { id: 'aggressive-rigid', label: 'Aggressive / rigid', detail: 'Pushes harder on removal rate and clamping confidence.' },
  { id: 'index-ready', label: 'Index-ready', detail: 'Biases the setup toward rotary or multiaxis indexing stability.' },
  { id: 'swiss-support', label: 'Swiss support', detail: 'Long-part support and guide-bushing discipline comes first.' },
  { id: 'detail-control', label: 'Detail control', detail: 'Favor finer support and reduced obstruction for detail work.' },
  { id: 'sheet-flat', label: 'Sheet-flat', detail: 'Keep sheet or plate flatness and support consistency visible.' },
  { id: 'cold-cut-stable', label: 'Cold-cut stable', detail: 'Bias toward thick-plate stability and safer entry behavior.' },
];

export function getWorkholdingCatalogBundle(mode: MachineMode): WorkholdingCatalogBundle {
  return {
    categoryOptions: WORKHOLDING_CATEGORY_OPTIONS[mode] ?? [],
    brandOptions: WORKHOLDING_BRAND_OPTIONS[mode] ?? [],
    presetOptions: WORKHOLDING_PRESET_LIBRARY.filter((item) => item.modes.includes(mode)),
    stabilityOptions: STABILITY_OPTIONS,
  };
}
