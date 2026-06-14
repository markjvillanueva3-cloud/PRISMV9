// 2026-05-27 (slot golf, GOAL-TSC-FIX iter7): + 'expert' for useCalculatorBridge.test.tsx
// (5 sites pass "expert"). Semantic alias of 'master' — both denote highest tier.
export type ExperienceLevel = 'beginner' | 'journeyman' | 'master' | 'expert';
export type MachineMode = 'mill' | 'lathe' | 'edm' | 'wire_edm' | 'laser' | 'waterjet';
export type CoolantOptionId = 'flood' | 'tsc' | 'through_air' | 'mist' | 'air' | 'dielectric';
export type MachinePackageSource = 'registry' | 'registry-merged' | 'fallback';
export type MachinePackageConfidence = 'published' | 'merged' | 'inferred' | 'fallback';
export type MachineAxisClass =
  | '2-axis'
  | '3-axis'
  | '4-axis'
  | '5-axis'
  | 'swiss'
  | 'turning'
  | 'xyuv'
  | '2d';
export type MachineOrientation =
  | 'vertical'
  | 'horizontal'
  | 'gantry'
  | 'turning'
  | 'swiss'
  | 'multitask'
  | 'vtl'
  | 'sinker'
  | 'wire'
  | 'laser'
  | 'waterjet';

export type MachineGuidewayType = 'box' | 'linear' | 'hydrostatic';

export interface MachineTaxonomyProfile {
  mode: MachineMode;
  familyId: string;
  familyLabel: string;
  machineTypeId: string;
  machineTypeLabel: string;
  axisClass: MachineAxisClass;
  orientation: MachineOrientation;
}

export interface MachinePackageProvenance {
  source: MachinePackageSource;
  confidence: MachinePackageConfidence;
  sourceRecordIds: string[];
  notes: string[];
}

export type MachineToolingLayoutKind =
  | 'magazine'
  | 'turret'
  | 'gang'
  | 'wire'
  | 'laser'
  | 'waterjet'
  | 'electrode';

export interface MachineToolingLayout {
  kind: MachineToolingLayoutKind;
  stations?: number;
  stationOptions?: number[];
  allowCustomStations?: boolean;
  interface?: string;
  interfaceId?: string;
  spindleConnectionTypeId?: string;
  spindleConnectionLabel?: string;
  turretTypeId?: string;
  turretTypeLabel?: string;
  turretCount?: number;
  hasSubSpindle?: boolean;
  hasMillingHead?: boolean;
  millingHeadLabel?: string;
  liveTooling?: boolean;
  liveRpm?: number;
}

export interface ExperienceProfile {
  id: ExperienceLevel;
  label: string;
  badge: string;
  accent: string;
  summary: string;
  guidance: string[];
}

export interface MachineCatalogItem {
  id: string;
  mode: MachineMode;
  manufacturer: string;
  model: string;
  machineTypeId: string;
  machineTypeLabel: string;
  family: string;
  spindleRpm: number;
  powerHp: number;
  envelope: string;
  axes: string;
  coolant: string;
  coolantOptionIds: CoolantOptionId[];
  controllerOptions: SelectionOption[];
  // 2026-05-27 (slot golf, iter8 — re-add after peer revert): resolved single
  // controller name (sister to controllerOptions[]). Used by CalculatorPage at
  // L3941/3962 for fast access without iterating the array. Optional —
  // call sites should default to controllerOptions[0]?.id when absent.
  controller?: string;
  // 2026-05-27 iter27: resolved single spindle name (sister to spindleOptions[]).
  // calculatorToolpathUniverseCoverage L185 reads this to seed the setup preview.
  spindleLabel?: string;
  spindleOptions: SelectionOption[];
  controllerCapabilityOptions?: MachineControllerCapabilityOption[];
  configurationOptions?: MachineConfigurationOption[];
  canonicalMachineId?: string;
  packageId?: string;
  taxonomy?: MachineTaxonomyProfile;
  packageProvenance?: MachinePackageProvenance;
  notes: string[];
  bestFor: string[];
  toolingLayout?: MachineToolingLayout;
  guidewayType?: MachineGuidewayType;
  naturalFrequencyHz?: number;
  axisAccelerationMps2?: number;
  axisJerkMps3?: number;
}

export interface MaterialCatalogItem {
  id: string;
  group: string;
  groupLabel?: string;
  subcategoryId?: string;
  subcategoryLabel?: string;
  conditionId?: string;
  conditionLabel?: string;
  familyLabel?: string;
  isoGroup?: string;
  name: string;
  hardness: string;
  baseSfm: number;
  machinability: string;
  chipControl: string;
  note: string;
  idealCoolant: string;
}

export interface ToolCatalogItem {
  id: string;
  mode: MachineMode;
  family: string;
  // 2026-05-26 (slot golf, tsc-fix): augmentation — some catalog rows ship a distinct `name` separate from `label`.
  name?: string;
  label: string;
  description: string;
  holder: string;
  coating: string;
  defaultDiameter: number;
  defaultFlutes: number;
  operation: string;
  vendor?: string;
  catalogNumber?: string;
  priceUsd?: number;
  confidence?: number;
  source?: 'database' | 'fallback';
  materialGroupIds?: string[];
  coolantThrough?: boolean;
  centerCutting?: boolean;
  variableHelix?: boolean;
  requiresLiveTooling?: boolean;
  bodyType?: 'solid' | 'indexable';
  insertType?: string;
  insertCount?: number;
  insertGrades?: string[];
  insertPriceUsd?: number;
  holderInterface?: string;
  maxApMm?: number;
  rampingCapable?: boolean;
  plungeCapable?: boolean;
  maxRpm?: number;
  supportedOperations?: string[];
  toolpathKeywords?: string[];
  toolMaterialClass?: 'carbide' | 'cermet' | 'pcd' | 'ceramic' | 'wire' | 'graphite' | 'electrode' | 'abrasive';
  geometryClass?:
    | 'endmill'
    | 'face-mill'
    | 'variable-helix-endmill'
    | 'square-endmill'
    | 'ball-endmill'
    | 'chamfer'
    | 'drill'
    | 'tap'
    | 'reamer'
    | 'roughing-insert'
    | 'finishing-insert'
    | 'grooving-insert'
    | 'threading-insert'
    | 'boring-bar'
    | 'live-tool-endmill'
    | 'wire'
    | 'electrode'
    | 'beam'
    | 'stream';
  edgePrep?: 'sharp' | 'honed' | 'reinforced' | 'wiper';
  cornerRadiusMm?: number;
  noseRadiusMm?: number;
  leadAngleDeg?: number;
  helixAngleDeg?: number;
  wiperGeometry?: boolean;
  fluteLengthMm?: number;
  overallLengthMm?: number;
  shankDiameterMm?: number;
}

export interface SelectionOption {
  id: string;
  label: string;
  detail: string;
}

export interface MachineControllerCapabilityOption extends SelectionOption {
  checkTip: string;
  defaultEnabled?: boolean;
}

export interface MachineConfigurationOption {
  id: string;
  label: string;
  detail: string;
  controllerOptions: SelectionOption[];
  spindleOptions: SelectionOption[];
  controllerCapabilityOptions?: MachineControllerCapabilityOption[];
  coolantOptionIds: CoolantOptionId[];
  sourceRecordIds?: string[];
  confidence?: MachinePackageConfidence;
}

function controllerOption(id: string, label: string, detail: string): SelectionOption {
  return { id, label, detail };
}

function spindleOption(id: string, label: string, detail: string): SelectionOption {
  return { id, label, detail };
}

function controllerCapabilityOption(
  id: string,
  label: string,
  detail: string,
  checkTip: string,
  defaultEnabled = false,
): MachineControllerCapabilityOption {
  return { id, label, detail, checkTip, defaultEnabled };
}

function coolantCapabilities(...ids: CoolantOptionId[]): CoolantOptionId[] {
  return ids;
}

function machineType(machineTypeId: string, machineTypeLabel: string) {
  return { machineTypeId, machineTypeLabel };
}

export type ProgrammingPackageKind = 'manual' | 'cam' | 'nesting';

export interface ProgrammingToolpathOption {
  id: string;
  label: string;
  path: string;
  // 2026-05-27 iter28: producer at CalculatorPage L13099 builds these from a
  // selection where some sources lack a summary (e.g. quick-pick links).
  summary?: string;
  operationId: string;
}

export interface ProgrammingEnvironmentOption {
  id: string;
  mode: MachineMode;
  label: string;
  vendor: string;
  kind: ProgrammingPackageKind;
  summary: string;
  badge: string;
  toolpaths: ProgrammingToolpathOption[];
}

export const EXPERIENCE_PROFILES: ExperienceProfile[] = [
  {
    id: 'beginner',
    label: 'Beginner',
    badge: 'Guided',
    accent: 'emerald',
    summary: 'Walk through the calculator one decision at a time with plain-language prompts.',
    guidance: [
      'Pick the machine family first so the calculator can narrow the right setup path.',
      'Choose material before tooling so spindle speed and coolant advice make sense.',
      'Use the setup summary on the right to verify confidence before posting numbers into CAM.',
    ],
  },
  {
    id: 'journeyman',
    label: 'Journeyman',
    badge: 'Balanced',
    accent: 'amber',
    summary: 'Keep the structure, trim the hand-holding, and surface the tradeoffs faster.',
    guidance: [
      'Work left to right: machine, material, tooling, then stock and workholding.',
      'Use the workflow notes to confirm the recommended order of operations.',
      'Compare the quick cards and formula deck when you want to sanity-check the live result.',
    ],
  },
  {
    id: 'master',
    label: 'Experienced',
    badge: 'Experienced',
    accent: 'rose',
    summary: 'Expose more process detail with fewer words and let the numbers lead the workflow.',
    guidance: [
      'Drive the page from the machine and material constraints, not generic defaults.',
      'Treat coolant, workholding, and stock geometry as first-order variables, not afterthoughts.',
      'Use the formula deck for direct validation before trusting any downstream automation.',
    ],
  },
];

export const MACHINE_MODE_OPTIONS: Array<{ id: MachineMode; label: string; icon: string; blurb: string }> = [
  { id: 'mill', label: 'Mill', icon: '⚙️', blurb: '3-axis through 3+2 setup planning' },
  { id: 'lathe', label: 'Lathe', icon: '🌀', blurb: 'Turning, boring, grooving, and threading' },
  { id: 'edm', label: 'Sinker EDM', icon: '⚡', blurb: 'Electrode and burn planning surface' },
  { id: 'wire_edm', label: 'Wire EDM', icon: '🧵', blurb: '2D contour, skim, and finish setup' },
  { id: 'laser', label: 'Laser', icon: '💠', blurb: 'Cut quality and assist-gas preparation' },
  { id: 'waterjet', label: 'Waterjet', icon: '💧', blurb: 'Abrasive path and taper-control prep' },
];

export const MACHINE_CATALOG: MachineCatalogItem[] = [
  {
    id: 'haas-vf2ss',
    mode: 'mill',
    manufacturer: 'Haas',
    model: 'VF-2SS',
    ...machineType('mill_vertical_3', '3-Axis Vertical'),
    family: '3-Axis Vertical Machining Center',
    spindleRpm: 12000,
    powerHp: 30,
    envelope: '30 x 16 x 20 in',
    axes: '3-axis + optional TRT210',
    coolant: 'Flood + TSC capable',
    coolantOptionIds: coolantCapabilities('flood', 'tsc'),
    controllerOptions: [
      controllerOption('haas-ngc', 'Haas NGC', 'Next Generation Control with probing, macro, and rotary-ready workflow support.'),
    ],
    spindleOptions: [
      spindleOption('vf2ss-inline-12k', '12,000 RPM CAT40', 'Inline direct-drive package with flood and through-spindle coolant readiness.'),
    ],
    notes: ['Strong benchmark VMC', 'Fast for aluminum and mixed steel work'],
    bestFor: ['Facing', 'Pocketing', 'General-purpose 2.5D'],
    toolingLayout: {
      kind: 'magazine',
      stations: 30,
      interface: 'CAT40',
      interfaceId: 'cat40',
      spindleConnectionTypeId: 'cat40',
      spindleConnectionLabel: 'CAT40',
      liveTooling: false,
    },
  },
  {
    id: 'haas-vf2',
    mode: 'mill',
    manufacturer: 'Haas',
    model: 'VF-2',
    ...machineType('mill_vertical_3', '3-Axis Vertical'),
    family: '3-Axis Vertical Machining Center',
    spindleRpm: 8100,
    powerHp: 30.04,
    envelope: '762 x 406 x 508 mm',
    axes: '3-axis',
    coolant: 'Flood + air blast ready',
    coolantOptionIds: coolantCapabilities('flood', 'air'),
    controllerOptions: [
      controllerOption('haas-pre-ngc', 'Haas Classic / Pre-NGC', 'JM Die VF-2 control posture for legacy Haas G-code, probing macros when installed, and conservative 3-axis VMC workflows.'),
    ],
    spindleOptions: [
      spindleOption('vf2-cat40-8100', '8,100 RPM CT40 / CAT40', '22.4 kW / 30 hp CT40/CAT40 spindle with 122 Nm peak torque for mixed steel, aluminum, and fixture work.'),
    ],
    notes: ['JM Die VMC-03 canonical VF-2', 'Use conservative acceleration assumptions for older Haas motion control'],
    bestFor: ['General 2.5D', 'Fixture work', 'Mixed steel and aluminum milling'],
    toolingLayout: {
      kind: 'magazine',
      stations: 24,
      interface: 'CAT40',
      interfaceId: 'cat40',
      spindleConnectionTypeId: 'cat40',
      spindleConnectionLabel: 'CAT40',
      liveTooling: false,
    },
    guidewayType: 'box',
    naturalFrequencyHz: 600,
    axisAccelerationMps2: 3.5,
    axisJerkMps3: 8,
  },
  {
    id: 'mazak-vcn530c',
    mode: 'mill',
    manufacturer: 'Mazak',
    model: 'VCN-530C',
    ...machineType('mill_vertical_3', '3-Axis Vertical'),
    family: '3-Axis Vertical Machining Center',
    spindleRpm: 12000,
    powerHp: 25,
    envelope: '41.3 x 20.1 x 20.1 in',
    axes: '3-axis',
    coolant: 'Flood + through-tool ready',
    coolantOptionIds: coolantCapabilities('flood', 'tsc'),
    controllerOptions: [
      controllerOption('smoothg', 'Mazatrol SmoothG', 'Mazak conversational and EIA-ready controller posture for fixture-heavy VMC work.'),
    ],
    spindleOptions: [
      spindleOption('vcn530c-12k', '12,000 RPM CAT40', 'Integral spindle package balanced for steel plate work, adaptive roughing, and through-tool coolant.'),
    ],
    notes: ['Stable casting', 'Good blend of envelope and rigidity'],
    bestFor: ['Steel roughing', 'Plate work', 'Fixture-heavy jobs'],
    toolingLayout: {
      kind: 'magazine',
      stations: 30,
      interface: 'CAT40',
      interfaceId: 'cat40',
      spindleConnectionTypeId: 'cat40',
      spindleConnectionLabel: 'CAT40',
      liveTooling: false,
    },
  },
  {
    id: 'hurco-vmx30i',
    mode: 'mill',
    manufacturer: 'Hurco',
    model: 'VMX30i',
    ...machineType('mill_vertical_3', '3-Axis Vertical'),
    family: '3-Axis Vertical Machining Center',
    spindleRpm: 12000,
    powerHp: 24,
    envelope: '40 x 20 x 24 in',
    axes: '3-axis',
    coolant: 'Flood + through-tool ready',
    coolantOptionIds: coolantCapabilities('flood', 'tsc', 'air'),
    controllerOptions: [
      controllerOption('hurco-winmax', 'Hurco WinMax', 'Hurco conversational and NC workflow posture for job-shop plate work, probing, and quick setup edits at the machine.'),
    ],
    spindleOptions: [
      spindleOption('vmx30i-cat40-12k', '12,000 RPM CAT40', 'CAT40 spindle package tuned for mixed steel and aluminum work with flood, air blast, and through-tool coolant readiness.'),
    ],
    controllerCapabilityOptions: [
      controllerCapabilityOption(
        'hurco-probing',
        'WinMax probing',
        'Hurco probing workflow for stock pickup, tool setter checks, and setup verification directly at the control.',
        'Verify the probe package is installed, calibrated, and enabled in the active WinMax profile before trusting setup automation.',
        true,
      ),
      controllerCapabilityOption(
        'hurco-ultimotion',
        'UltiMotion smoothing',
        'Hurco motion-smoothing option for tighter contour tracking and better finish quality on 3D paths.',
        'Confirm the smoothing option is enabled and the current program is posted for the intended motion mode.',
        true,
      ),
    ],
    notes: ['Flexible job-shop VMC', 'Strong fit for mixed plate, bracket, and fixture work'],
    bestFor: ['General 2.5D', 'Plate work', 'Prototype and short-run parts'],
    toolingLayout: {
      kind: 'magazine',
      stations: 24,
      interface: 'CAT40',
      interfaceId: 'cat40',
      spindleConnectionTypeId: 'cat40',
      spindleConnectionLabel: 'CAT40',
      liveTooling: false,
    },
  },
  {
    id: 'hurco-vm30i',
    mode: 'mill',
    manufacturer: 'Hurco',
    model: 'VM30i',
    ...machineType('mill_vertical_3', '3-Axis Vertical'),
    family: '3-Axis Vertical Machining Center',
    spindleRpm: 12000,
    powerHp: 20,
    envelope: '40 x 20 x 24 in',
    axes: '3-axis',
    coolant: 'Flood + through-tool ready + air blast ready',
    coolantOptionIds: coolantCapabilities('flood', 'tsc', 'air'),
    controllerOptions: [
      controllerOption('hurco-winmax-v10', 'Hurco WinMax v10', 'JM Die VM30i conversational and NC workflow posture for short-run plate work, probing, and quick setup edits.'),
    ],
    spindleOptions: [
      spindleOption('vm30i-cat40-big-plus-12k', '12,000 RPM CAT 40 Big+', '15.0 kW / 20 hp CAT 40 Big Plus spindle with 100 ft-lb (135.6 Nm) peak torque for mixed plate, die, and fixture work.'),
    ],
    controllerCapabilityOptions: [
      controllerCapabilityOption(
        'hurco-vm30i-probing',
        'WinMax probing',
        'Hurco probing workflow for stock pickup, tool setter checks, and setup verification directly at the control.',
        'Verify the probe package is installed, calibrated, and enabled in the active WinMax profile before trusting setup automation.',
        true,
      ),
      controllerCapabilityOption(
        'hurco-vm30i-ultimotion',
        'UltiMotion smoothing',
        'Hurco motion-smoothing option for tighter contour tracking and better finish quality on 3D paths.',
        'Confirm the smoothing option is enabled and the current program is posted for the intended motion mode.',
        true,
      ),
    ],
    notes: ['JM Die VMC-01 canonical VM30i', 'Big Plus CAT40 spindle; use WinMax v10 specific setup and smoothing checks'],
    bestFor: ['General 2.5D', 'Plate work', 'Prototype and short-run die details'],
    toolingLayout: {
      kind: 'magazine',
      stations: 24,
      interface: 'CAT 40 Big+',
      interfaceId: 'cat40-big-plus',
      spindleConnectionTypeId: 'cat40-big-plus',
      spindleConnectionLabel: 'CAT 40 Big+',
      liveTooling: false,
    },
    guidewayType: 'box',
    naturalFrequencyHz: 600,
    axisAccelerationMps2: 3.5,
    axisJerkMps3: 8,
  },
  {
    id: 'haas-om-2',
    mode: 'mill',
    manufacturer: 'Haas',
    model: 'OM-2',
    ...machineType('mill_vertical_3', '3-Axis Vertical'),
    family: 'Office / Compact High-Speed Mill',
    spindleRpm: 30000,
    powerHp: 5,
    envelope: '305 x 254 x 305 mm',
    axes: '3-axis',
    coolant: 'Flood + air blast ready',
    coolantOptionIds: coolantCapabilities('flood', 'air', 'mist'),
    controllerOptions: [
      controllerOption('haas-pre-ngc-om2', 'Haas Classic / Pre-NGC', 'JM Die OM-2 compact high-speed control posture for small parts, electrodes, and light engraving work.'),
    ],
    spindleOptions: [
      spindleOption('om2-iso20-30k', '30,000 RPM ISO20', '2.2 kW / 3 hp continuous, 3.7 kW / 5 hp peak ISO20 high-speed spindle; use small tools and light radial engagement.'),
    ],
    notes: ['JM Die VMC-04 canonical OM-2', 'Avoid large shell mills and heavy roughing on this ISO20 high-speed office mill'],
    bestFor: ['Small parts', 'Engraving', 'Micro finishing', 'Electrode details'],
    toolingLayout: {
      kind: 'magazine',
      stations: 20,
      interface: 'ISO20',
      interfaceId: 'iso20',
      spindleConnectionTypeId: 'iso20',
      spindleConnectionLabel: 'ISO20',
      liveTooling: false,
    },
    guidewayType: 'linear',
    naturalFrequencyHz: 720,
    axisAccelerationMps2: 4.5,
    axisJerkMps3: 10,
  },
  {
    id: 'roku-roku-hc658ii',
    mode: 'mill',
    manufacturer: 'Roku-Roku',
    model: 'HC 658-II',
    ...machineType('mill_vertical_3', '3-Axis Vertical'),
    family: 'High-Speed Die / Electrode Machining Center',
    spindleRpm: 32000,
    powerHp: 8.4,
    envelope: '600 x 500 x 400 mm',
    axes: '3-axis',
    coolant: 'Air blast + flood ready',
    coolantOptionIds: coolantCapabilities('air', 'flood'),
    controllerOptions: [
      controllerOption('fanuc-31ib5-rokuroku', 'FANUC 31i-B5', 'JM Die Roku-Roku high-speed Fanuc posture for die sinking, graphite, electrode milling, and fine detail work.'),
    ],
    spindleOptions: [
      spindleOption('hc658ii-hsk-c40-32k', '32,000 RPM HSK-C40', '6.3 kW / 8.4 hp HSK-C40 high-speed spindle for graphite, electrodes, and fine die details.'),
    ],
    controllerCapabilityOptions: [
      controllerCapabilityOption(
        'rokuroku-aicc',
        'Fanuc high-speed contour control',
        'Fanuc high-speed contouring and lookahead support for short-segment die, electrode, and graphite programs.',
        'Confirm the active post and control options match the Roku-Roku high-speed contouring mode before trusting dense finishing paths.',
        true,
      ),
    ],
    notes: ['JM Die VMC-05 canonical Roku-Roku HC 658-II', 'Static catalog exposes no-post-available risk separately from cutting physics'],
    bestFor: ['Graphite electrode milling', 'High-speed finishing', 'Die details', 'Micro tools'],
    toolingLayout: {
      kind: 'magazine',
      stations: 30,
      interface: 'HSK-C40',
      interfaceId: 'hsk-c40',
      spindleConnectionTypeId: 'hsk-c40',
      spindleConnectionLabel: 'HSK-C40',
      liveTooling: false,
    },
    guidewayType: 'box',
    naturalFrequencyHz: 760,
    axisAccelerationMps2: 6.9,
    axisJerkMps3: 25,
  },
  {
    id: 'haas-vf4-trt210',
    mode: 'mill',
    manufacturer: 'Haas',
    model: 'VF-4 + TRT210',
    ...machineType('mill_vertical_4', '4-Axis Vertical'),
    family: '4-Axis Vertical Machining Center',
    spindleRpm: 12000,
    powerHp: 30,
    envelope: '50 x 20 x 25 in',
    axes: '4-axis',
    coolant: 'Flood + TSC capable',
    coolantOptionIds: coolantCapabilities('flood', 'tsc'),
    controllerOptions: [
      controllerOption('haas-ngc-trt', 'Haas NGC', 'Next Generation Control with rotary indexing, probing, and macro-driven 4-axis workflow support.'),
    ],
    spindleOptions: [
      spindleOption('vf4-inline-12k', '12,000 RPM CAT40', 'Inline spindle package paired with TRT210 rotary workholding and through-spindle coolant readiness.'),
    ],
    notes: ['Rotary-ready vertical platform', 'Strong bridge between 3-axis fixtures and indexed work'],
    bestFor: ['Indexed 4th-axis work', 'Wrap features', 'Multi-face setups'],
    toolingLayout: {
      kind: 'magazine',
      stations: 30,
      interface: 'CAT40',
      interfaceId: 'cat40',
      spindleConnectionTypeId: 'cat40',
      spindleConnectionLabel: 'CAT40',
      liveTooling: false,
    },
  },
  {
    id: 'kuraki-kbt11w',
    mode: 'mill',
    manufacturer: 'Kuraki',
    model: 'KBT-11W',
    ...machineType('mill_horizontal_3', '3-Axis Horizontal'),
    family: '3-Axis Horizontal Machining Center',
    spindleRpm: 6000,
    powerHp: 35,
    envelope: '1500 x 1200 x 1450 mm',
    axes: '3-axis',
    coolant: 'Flood + air blast ready',
    coolantOptionIds: coolantCapabilities('flood', 'air'),
    controllerOptions: [
      controllerOption('fanuc-31ib5', 'FANUC 31i-B5', 'Horizontal boring and drilling workflow with probing, large-work-envelope offsets, and macro support.'),
    ],
    spindleOptions: [
      spindleOption('kbt11w-bt50-6k', '6,000 RPM BT50', 'Heavy-duty horizontal spindle for large-part roughing, boring, and fixture plate work with flood or air blast support.'),
    ],
    notes: ['Horizontal boring profile for large castings', 'Useful fallback when the live registry is unavailable'],
    bestFor: ['Large castings', 'Boring work', 'Fixture plate machining'],
    toolingLayout: {
      kind: 'magazine',
      stations: 40,
      interface: 'BT50',
      interfaceId: 'bt50',
      spindleConnectionTypeId: 'bt50',
      spindleConnectionLabel: 'BT50',
      liveTooling: false,
    },
  },
  {
    id: 'okuma-m460v-5ax',
    mode: 'mill',
    manufacturer: 'Okuma',
    model: 'GENOS M460V-5AX',
    ...machineType('mill_vertical_5', '5-Axis Vertical'),
    family: '5-Axis Vertical Machining Center',
    spindleRpm: 15000,
    powerHp: 29.5,
    envelope: '762 x 508 x 508 mm',
    axes: '5-axis',
    coolant: 'Flood + through-spindle coolant + through-air + air blast ready',
    coolantOptionIds: coolantCapabilities('flood', 'tsc', 'through_air', 'air'),
    controllerOptions: [
      controllerOption('osp-p300ma-h', 'Okuma OSP-P300MA-H', 'Okuma multiaxis control posture with simultaneous 5-axis workflow, probing, and collision-avoidance support.'),
    ],
    spindleOptions: [
      spindleOption('m460v-5ax-main', '15,000 RPM CAT 40 Big+', '22 kW CAT 40 Big+ spindle with 88 Nm peak torque for trunnion-style simultaneous 5-axis work with through-spindle coolant support.'),
    ],
    controllerCapabilityOptions: [
      controllerCapabilityOption(
        'okuma-cas',
        'CAS collision avoidance',
        'Okuma Collision Avoidance System for 3D machine-model collision checks during prove-out and multiaxis motion.',
        'Confirm CAS license status, active machine model, and collision-check settings on the OSP control.',
        true,
      ),
      controllerCapabilityOption(
        'okuma-machining-navi',
        'Machining Navi',
        'Okuma cutting-condition optimization and chatter suppression support for spindle/load-driven tuning.',
        'Check Machining Navi pages on the control and verify the option is unlocked for the active machine package.',
        true,
      ),
      controllerCapabilityOption(
        'okuma-hsm',
        'High-speed machining mode',
        'OSP high-speed smoothing package for finer multiaxis motion and faster surface finishing.',
        'Check G131 / quality smoothing availability and confirm the current post or template is using the licensed mode.',
        true,
      ),
      controllerCapabilityOption(
        'okuma-hpcc',
        'High-precision contour control',
        'Contour-control option for tighter tolerance tracking and smoother path execution on complex 3D surfaces.',
        'Verify the contour-control option is active and the current program/post is calling the intended high-precision mode.',
        true,
      ),
      controllerCapabilityOption(
        'okuma-tcp',
        'TCP / 5-axis kinematics',
        'Tool-center-point compensation and multiaxis kinematic transforms for simultaneous 5-axis work.',
        'Confirm TCP/kinematic compensation is active for the trunnion and matched to the post configuration.',
        true,
      ),
      controllerCapabilityOption(
        'okuma-tilted-plane',
        'Tilted workplane',
        'Workplane transformation support for indexed and simultaneous 5-axis setups.',
        'Check the active kinematic package, workplane transform support, and post output for the current setup.',
        true,
      ),
      controllerCapabilityOption(
        'okuma-probing',
        'Probing macros',
        'Touch probe and tool-setter macros for setup validation and in-process checks.',
        'Verify probe hardware, receiver, and protected offset-write macros are enabled on the control.',
      ),
      controllerCapabilityOption(
        'okuma-ssv',
        'Spindle speed variation',
        'Oscillating spindle-speed mode to suppress chatter on harder materials and longer tool overhang.',
        'Check the OSP spindle variation option and confirm the process plan calls for it on the active operation.',
      ),
    ],
    notes: ['Compact trunnion 5-axis platform', 'Useful fallback profile for simultaneous and 3+2 work'],
    bestFor: ['Simultaneous 5-axis', '3+2 indexing', 'Complex aerospace / medical parts'],
    toolingLayout: {
      kind: 'magazine',
      stations: 48,
      stationOptions: [30, 48, 60],
      allowCustomStations: true,
      interface: 'CAT 40 Big+',
      interfaceId: 'cat40-big-plus',
      spindleConnectionTypeId: 'cat40-big-plus',
      spindleConnectionLabel: 'CAT 40 Big+',
      liveTooling: false,
    },
  },
  {
    id: 'hurco-vc500i',
    mode: 'mill',
    manufacturer: 'Hurco',
    model: 'VC500i',
    ...machineType('mill_vertical_5', '5-Axis Vertical'),
    family: '5-Axis Vertical Machining Center',
    spindleRpm: 18000,
    powerHp: 25,
    envelope: '24.4 x 20.5 x 18.1 in',
    axes: '5-axis trunnion',
    coolant: 'Flood + through-tool coolant + air blast ready',
    coolantOptionIds: coolantCapabilities('flood', 'tsc', 'air'),
    controllerOptions: [
      controllerOption('hurco-winmax-5ax', 'Hurco WinMax', 'Hurco 5-axis WinMax posture with conversational plus NC blending, probing, and trunnion workplane support.'),
    ],
    spindleOptions: [
      spindleOption('vc500i-hsk-a63-18k', '18,000 RPM HSK-A63', 'High-speed 5-axis spindle package for trunnion work, fine finishing, and through-tool coolant support on shorter tools.'),
    ],
    controllerCapabilityOptions: [
      controllerCapabilityOption(
        'hurco-5ax-tool-center-point',
        'Tool-center-point control',
        'Hurco 5-axis kinematic compensation for simultaneous trunnion motion and indexed workplane transforms.',
        'Confirm the 5-axis transform package is active and matched to the post for the current VC500i setup.',
        true,
      ),
      controllerCapabilityOption(
        'hurco-probing-5ax',
        '5-axis probing',
        'Probing support for trunnion setup pickup, rotary centerline checks, and in-process validation.',
        'Verify probe calibration and rotary-frame probing routines before relying on the setup values.',
        true,
      ),
      controllerCapabilityOption(
        'hurco-ultimotion-5ax',
        'UltiMotion finish mode',
        'Hurco smoothing mode for denser surfacing paths and better 5-axis contour quality.',
        'Check the finish-mode option and confirm the active NC program is using the intended tolerance / smoothing posture.',
        true,
      ),
    ],
    notes: ['Compact trunnion 5-axis platform', 'Useful benchmark for Hurco simultaneous and indexed work'],
    bestFor: ['Simultaneous 5-axis', 'Indexed 3+2', 'Small complex prismatic parts'],
    toolingLayout: {
      kind: 'magazine',
      stations: 40,
      interface: 'HSK-A63',
      interfaceId: 'hsk-a63',
      spindleConnectionTypeId: 'hsk-a63',
      spindleConnectionLabel: 'HSK-A63',
      liveTooling: false,
    },
  },
  {
    id: 'makino-a61nx',
    mode: 'mill',
    manufacturer: 'Makino',
    model: 'A61NX',
    ...machineType('mill_horizontal_4', '4-Axis Horizontal'),
    family: '4-Axis Horizontal Machining Center',
    spindleRpm: 14000,
    powerHp: 50,
    envelope: '730 x 730 x 800 mm',
    axes: '4-axis',
    coolant: 'Flood + TSC ready',
    coolantOptionIds: coolantCapabilities('flood', 'tsc'),
    controllerOptions: [
      controllerOption('makino-pro6', 'Makino Professional 6', 'Makino horizontal control posture with pallet, tombstone, and production monitoring support.'),
    ],
    spindleOptions: [
      spindleOption('a61nx-hsk-a63', '14,000 RPM HSK-A63', 'Horizontal production spindle package tuned for tombstone work, deep-pocket roughing, and through-spindle coolant.'),
    ],
    notes: ['Production-focused HMC', 'Good offline reference for tombstone and pallet workflows'],
    bestFor: ['Tombstone work', 'Palletized production', 'Horizontal roughing and finishing'],
    toolingLayout: {
      kind: 'magazine',
      stations: 60,
      interface: 'HSK-A63',
      interfaceId: 'hsk-a63',
      spindleConnectionTypeId: 'hsk-a63',
      spindleConnectionLabel: 'HSK-A63',
      liveTooling: false,
    },
  },
  {
    id: 'makino-a500z',
    mode: 'mill',
    manufacturer: 'Makino',
    model: 'a500Z',
    ...machineType('mill_horizontal_5', '5-Axis Horizontal'),
    family: '5-Axis Horizontal Machining Center',
    spindleRpm: 14000,
    powerHp: 50,
    envelope: '730 x 750 x 500 mm',
    axes: '5-axis',
    coolant: 'Flood + TSC ready',
    coolantOptionIds: coolantCapabilities('flood', 'tsc', 'air'),
    controllerOptions: [
      controllerOption('makino-pro6-5ax', 'Makino Professional 6', '5-axis horizontal control posture with TCP, pallet workflow support, and production-ready probing.'),
    ],
    spindleOptions: [
      spindleOption('a500z-hsk-a63-14k', '14,000 RPM HSK-A63', '5-axis horizontal spindle package tuned for simultaneous tombstone work, deep pockets, and through-spindle coolant.'),
    ],
    notes: ['Simultaneous 5-axis horizontal profile', 'Strong fallback for compound-angle production work'],
    bestFor: ['5-axis tombstone work', 'Compound-angle roughing', 'Aerospace production cells'],
    toolingLayout: {
      kind: 'magazine',
      stations: 120,
      interface: 'HSK-A63',
      interfaceId: 'hsk-a63',
      spindleConnectionTypeId: 'hsk-a63',
      spindleConnectionLabel: 'HSK-A63',
      liveTooling: false,
    },
  },
  {
    id: 'okuma-genos-l3000',
    mode: 'lathe',
    manufacturer: 'Okuma',
    model: 'GENOS L3000',
    ...machineType('lathe_2axis', '2-Axis Turning Center'),
    family: 'Turning Center',
    spindleRpm: 3800,
    powerHp: 30,
    envelope: '15.75 in max swing',
    axes: '2-axis + live tooling options',
    coolant: 'Flood + high-pressure optional',
    coolantOptionIds: coolantCapabilities('flood', 'tsc'),
    controllerOptions: [
      controllerOption('osp-p300l', 'Okuma OSP-P300L', 'Turning-first Okuma control with strong canned-cycle and spindle/load visibility.'),
    ],
    spindleOptions: [
      spindleOption('genos-chucking-spindle', '3,800 RPM A2-6 chucking spindle', 'Heavy turning spindle package tuned for OD roughing, finish passes, and high-pressure coolant add-ons.'),
    ],
    notes: ['Heavy turning platform', 'Good chucking lathe reference'],
    bestFor: ['OD roughing', 'Finish passes', 'General chucking work'],
    toolingLayout: {
      kind: 'turret',
      stations: 12,
      interface: 'VDI40',
      interfaceId: 'vdi40',
      turretTypeId: 'vdi40',
      turretTypeLabel: 'VDI40',
      turretCount: 1,
      liveTooling: false,
    },
  },
  {
    id: 'hurco-tm10i',
    mode: 'lathe',
    manufacturer: 'Hurco',
    model: 'TM10i',
    ...machineType('lathe_2axis', '2-Axis Turning Center'),
    family: 'Turning Center',
    spindleRpm: 4000,
    powerHp: 24,
    envelope: '10 in max turning dia',
    axes: '2-axis',
    coolant: 'Flood + air blast ready',
    coolantOptionIds: coolantCapabilities('flood', 'air'),
    controllerOptions: [
      controllerOption('hurco-winmax-turn', 'Hurco WinMax', 'Hurco turning control posture with conversational cycles, hand-edit workflow, and job-shop turning support.'),
    ],
    spindleOptions: [
      spindleOption('tm10i-main-spindle', '4,000 RPM chucking spindle', 'General chucking spindle package for OD roughing, finish turning, grooving, and drill support on lighter turning work.'),
    ],
    notes: ['Compact job-shop turning center', 'Good fallback for straightforward chucking work'],
    bestFor: ['OD roughing', 'Finish turning', 'Small chucking parts'],
    toolingLayout: {
      kind: 'turret',
      stations: 12,
      interface: 'VDI40',
      interfaceId: 'vdi40',
      turretTypeId: 'vdi40',
      turretTypeLabel: 'VDI40',
      turretCount: 1,
      liveTooling: false,
    },
  },
  {
    id: 'haas-st20y',
    mode: 'lathe',
    manufacturer: 'Haas',
    model: 'ST-20Y',
    ...machineType('lathe_y_axis', 'Y-Axis / Live Tool'),
    family: 'Y-axis Turning Center',
    spindleRpm: 4000,
    powerHp: 20,
    envelope: '10.3 in max cutting dia',
    axes: 'C/Y live-tool capable',
    coolant: 'Flood + TSC ready',
    coolantOptionIds: coolantCapabilities('flood', 'tsc'),
    controllerOptions: [
      controllerOption('haas-ngc-turn', 'Haas NGC', 'Y-axis turning control with live-tool, C-axis, and probing-ready workflow support.'),
    ],
    spindleOptions: [
      spindleOption('st20y-main-spindle', '4,000 RPM A2-6 spindle', 'Main spindle package paired with live-tool BMT65 turret support and coolant-through turning posture.'),
    ],
    notes: ['Good mill-turn bridge machine', 'Compact with live tooling'],
    bestFor: ['Mill-turn prep', 'Small shaft work', 'Secondary milling'],
    toolingLayout: {
      kind: 'turret',
      stations: 12,
      interface: 'BMT65',
      interfaceId: 'bmt65',
      turretTypeId: 'bmt65',
      turretTypeLabel: 'BMT65',
      turretCount: 1,
      liveTooling: true,
      liveRpm: 6000,
    },
  },
  {
    id: 'nakamura-wt150ii',
    mode: 'lathe',
    manufacturer: 'Nakamura-Tome',
    model: 'WT-150II',
    ...machineType('lathe_subspindle', 'Sub-Spindle Turning Center'),
    family: 'Sub-Spindle Turning Center',
    spindleRpm: 5000,
    powerHp: 25,
    envelope: '8.0 in max turning dia',
    axes: 'Dual-spindle turning center',
    coolant: 'Flood + high-pressure ready',
    coolantOptionIds: coolantCapabilities('flood', 'tsc'),
    controllerOptions: [
      controllerOption('fanuc-31ia-nakamura', 'FANUC 31i-A', 'Twin-spindle, twin-turret turning control with synchronized transfer and sub-spindle workflow support.'),
    ],
    spindleOptions: [
      spindleOption('wt150ii-main-sub', '5,000 RPM dual A2-5 spindle set', 'Main and sub-spindle package for part transfer, balanced finish work, and high-pressure coolant support.'),
    ],
    notes: ['Twin-spindle production turning platform', 'Useful fallback for handoff and pinch-turn workflows'],
    bestFor: ['Part transfer', 'Balanced twin-spindle work', 'Production shaft families'],
    toolingLayout: {
      kind: 'turret',
      stations: 24,
      interface: 'VDI30',
      interfaceId: 'vdi30',
      turretTypeId: 'vdi30',
      turretTypeLabel: 'VDI30',
      turretCount: 2,
      hasSubSpindle: true,
      liveTooling: false,
    },
  },
  {
    id: 'okuma-multus-u3000',
    mode: 'lathe',
    manufacturer: 'Okuma',
    model: 'MULTUS U3000',
    ...machineType('lathe_multitask', 'Mill-Turn / Multi-Tasking'),
    family: 'Mill-Turn / Multi-Tasking Center',
    spindleRpm: 5000,
    powerHp: 40,
    envelope: '25.6 in max swing',
    axes: 'Multi-task / live-tool capable',
    coolant: 'Flood + TSC ready',
    coolantOptionIds: coolantCapabilities('flood', 'tsc', 'air'),
    controllerOptions: [
      controllerOption('osp-p300sa', 'Okuma OSP-P300SA', 'Okuma multitasking control with B-axis milling, synchronized turning, and collision-avoidance workflow support.'),
    ],
    spindleOptions: [
      spindleOption('multus-main-baxis', '5,000 RPM main + 12,000 RPM milling spindle', 'Main spindle and B-axis milling package for full mill-turn workflows with through-spindle coolant support.'),
    ],
    notes: ['True multitasking profile', 'Bridges turning and 5-axis milling workflows in one setup'],
    bestFor: ['Mill-turn workflow', 'Done-in-one parts', 'Complex turned prismatic parts'],
    toolingLayout: {
      kind: 'turret',
      stations: 40,
      interface: 'CAPTO C6',
      interfaceId: 'capto-c6',
      turretTypeId: 'capto-c6',
      turretTypeLabel: 'CAPTO C6',
      turretCount: 1,
      hasSubSpindle: true,
      hasMillingHead: true,
      millingHeadLabel: 'B-axis milling head',
      liveTooling: true,
      liveRpm: 12000,
    },
  },
  {
    id: 'citizen-l20',
    mode: 'lathe',
    manufacturer: 'Citizen',
    model: 'Cincom L20',
    ...machineType('lathe_swiss', 'Swiss-Type Lathe'),
    family: 'Swiss-Type',
    spindleRpm: 10000,
    powerHp: 7.5,
    envelope: '20 mm max bar',
    axes: 'Swiss / gang tooling',
    coolant: 'High-pressure oil or flood',
    coolantOptionIds: coolantCapabilities('flood', 'tsc'),
    controllerOptions: [
      controllerOption('cincom-meldas', 'Cincom / Mitsubishi Meldas', 'Swiss control posture with synchronized sub-spindle and guide-bushing workflow awareness.'),
    ],
    spindleOptions: [
      spindleOption('l20-main-sub-spindles', '10,000 RPM Swiss spindle set', 'Main and sub-spindle package for long-part support, bar-fed repetition, and gang-tool discipline.'),
    ],
    notes: ['Gang tooling layout', 'Excellent for long small-diameter parts'],
    bestFor: ['Swiss parts', 'Small diameter shafts', 'Lights-out repeat work'],
    toolingLayout: {
      kind: 'gang',
      stations: 8,
      interface: 'Gang tooling',
      interfaceId: 'gang-tooling',
      turretTypeId: 'gang-tooling',
      turretTypeLabel: 'Gang tooling',
      turretCount: 1,
      hasSubSpindle: true,
      liveTooling: true,
      liveRpm: 8000,
    },
  },
  {
    id: 'dnsolutions-puma-v8300',
    mode: 'lathe',
    manufacturer: 'DN Solutions',
    model: 'PUMA V8300',
    ...machineType('lathe_vtl', 'Vertical Turret Lathe'),
    family: 'Vertical Turret Lathe',
    spindleRpm: 1800,
    powerHp: 60,
    envelope: '31.5 in max turning dia',
    axes: 'Vertical turning center',
    coolant: 'Flood + air blast ready',
    coolantOptionIds: coolantCapabilities('flood', 'air'),
    controllerOptions: [
      controllerOption('fanuc-i-plus-vtl', 'FANUC i Plus', 'Vertical turning control posture for heavy chucking work, large diameters, and crane-loaded parts.'),
    ],
    spindleOptions: [
      spindleOption('puma-v8300-main', '1,800 RPM heavy-duty chuck spindle', 'Vertical chucking spindle package for large-diameter roughing, interrupted cuts, and flood-ready turning work.'),
    ],
    notes: ['Vertical turning profile for large diameters', 'Useful fallback for heavy chucking and large flange work'],
    bestFor: ['Large flange work', 'Heavy chucking', 'Interrupted cuts'],
    toolingLayout: {
      kind: 'turret',
      stations: 12,
      interface: 'VDI50',
      interfaceId: 'vdi50',
      turretTypeId: 'vdi50',
      turretTypeLabel: 'VDI50',
      turretCount: 1,
      liveTooling: false,
    },
  },
  {
    id: 'makino-edge3',
    mode: 'edm',
    manufacturer: 'Makino',
    model: 'EDGE3',
    ...machineType('edm_sinker', 'Sinker EDM'),
    family: 'Sinker EDM',
    spindleRpm: 0,
    powerHp: 0,
    envelope: '21.6 x 15.7 x 14.1 in tank',
    axes: '3-axis burn platform',
    coolant: 'Dielectric and flushing setup',
    coolantOptionIds: coolantCapabilities('dielectric'),
    controllerOptions: [
      controllerOption('hyper-i', 'Makino Hyper-i', 'EDM-first control with burn strategy, electrode offsets, and finish cavity workflow support.'),
    ],
    spindleOptions: [
      spindleOption('edge3-burn-package', 'Precision burn package', 'Process-driven sinker package with dielectric flushing, orbit control, and electrode reference staging.'),
    ],
    notes: ['Precision cavity work', 'Electrode quality matters more than spindle'],
    bestFor: ['Finishing burns', 'Ribs', 'Sharp internal corners'],
    toolingLayout: { kind: 'electrode', stations: 6, interface: 'EROWA / 3R', liveTooling: false },
  },
  {
    id: 'fanuc-c600ib',
    mode: 'wire_edm',
    manufacturer: 'FANUC',
    model: 'C600iB',
    ...machineType('wire_edm_wire', 'Wire EDM'),
    family: 'Wire EDM',
    spindleRpm: 0,
    powerHp: 0,
    envelope: '23.6 x 15.7 x 12.2 in work zone',
    axes: 'XYUV wire path',
    coolant: 'DI water and flushing',
    coolantOptionIds: coolantCapabilities('dielectric'),
    controllerOptions: [
      controllerOption('fanuc-31iwb', 'FANUC 31i-WB', 'Wire EDM controller with taper, skim-pass, and slug-management workflow support.'),
    ],
    spindleOptions: [
      spindleOption('c600ib-wire-package', '0.25 mm wire package', 'Wire-feed, guide, and skim-pass process package for tight contouring and medical detail work.'),
    ],
    notes: ['Strong contouring reference', 'Skim-pass planning focus'],
    bestFor: ['Tight contouring', 'Punch/die work', 'Medical detail'],
    toolingLayout: { kind: 'wire', stations: 4, interface: '0.25 mm standard', liveTooling: false },
  },
  {
    id: 'trulaser-3030',
    mode: 'laser',
    manufacturer: 'TRUMPF',
    model: 'TruLaser 3030',
    ...machineType('laser_fiber', 'Fiber Laser'),
    family: 'Fiber Laser',
    spindleRpm: 0,
    powerHp: 0,
    envelope: '120 x 60 in sheet',
    axes: '2D cutting platform',
    coolant: 'Assist gas only',
    coolantOptionIds: coolantCapabilities('air'),
    controllerOptions: [
      controllerOption('trucontrol', 'TRUMPF TruControl', 'Sheet-cutting control with nest, nozzle, and assist-gas workflow visibility.'),
    ],
    spindleOptions: [
      spindleOption('3030-fiber-head', 'Fiber cutting head package', 'Lens, nozzle, and assist-gas stack for thin-to-medium sheet profiling and clean-edge work.'),
    ],
    notes: ['Thin to medium sheet speed reference', 'Nitrogen/O2 process planning'],
    bestFor: ['Sheet profiling', 'Nested work', 'Clean edge work'],
    toolingLayout: { kind: 'laser', stations: 3, interface: 'Nozzle / lens stack', liveTooling: false },
  },
  {
    id: 'omax-55100',
    mode: 'waterjet',
    manufacturer: 'OMAX',
    model: '55100',
    ...machineType('waterjet_abrasive', 'Abrasive Waterjet'),
    family: 'Abrasive Waterjet',
    spindleRpm: 0,
    powerHp: 0,
    envelope: '200 x 100 in table',
    axes: '2D + taper control',
    coolant: 'Water + abrasive',
    coolantOptionIds: coolantCapabilities('dielectric'),
    controllerOptions: [
      controllerOption('intellimax', 'OMAX IntelliMAX', 'Waterjet controller tuned for taper control, pierce strategy, and nested plate throughput.'),
    ],
    spindleOptions: [
      spindleOption('55100-abrasive-head', 'Abrasive jet package', 'Orifice, mixing tube, and abrasive-feed package for thick plate, composites, and cold-cut process planning.'),
    ],
    notes: ['Large envelope', 'Cold-cut process planning'],
    bestFor: ['Heat-sensitive material', 'Thick plate', 'Composite trim'],
    toolingLayout: { kind: 'waterjet', stations: 3, interface: 'Orifice / tube / abrasive', liveTooling: false },
  },
];

export const MATERIAL_GROUPS = [
  { id: 'steel', label: 'Carbon / Alloy Steel' },
  { id: 'tool_steel', label: 'Tool Steel / Mold Steel' },
  { id: 'stainless', label: 'Stainless / Corrosion Resistant' },
  { id: 'cast', label: 'Cast Iron / Cast Alloys' },
  { id: 'aluminum', label: 'Aluminum / Light Alloys' },
  { id: 'copper', label: 'Copper / Brass / Bronze' },
  { id: 'titanium', label: 'Titanium Alloys' },
  { id: 'superalloy', label: 'Nickel / Cobalt Superalloy' },
  { id: 'exotic_alloy', label: 'Exotic / Reactive Alloys' },
  { id: 'polymer_composite', label: 'Polymers / Composites' },
  { id: 'graphite_ceramic', label: 'Graphite / Ceramic / Glass' },
  { id: 'nontraditional', label: 'EDM / Additive / Process Stock' },
];

function normalizeMaterialTaxonomyId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function humanizeMaterialTaxonomyLabel(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bQt\b/g, 'Q&T')
    .replace(/\bSta\b/g, 'STA')
    .replace(/\bPh\b/g, 'PH');
}

function deriveStaticMaterialSubcategory(item: MaterialCatalogItem) {
  const signature = `${item.name} ${item.note} ${item.hardness}`.toLowerCase();
  const group = item.group;

  const fromGroup = (id: string, label: string) => ({ id, label });

  switch (group) {
    case 'steel':
      if (/free[- ]?machining|12l14|11l17|leaded/.test(signature)) return fromGroup('free_machining', 'Free-Machining');
      if (/bearing|52100/.test(signature)) return fromGroup('bearing_steel', 'Bearing Steel');
      if (/structural|a36|a572|plate/.test(signature)) return fromGroup('structural', 'Structural');
      if (/carburiz|8620|9310|case/.test(signature)) return fromGroup('case_hardening', 'Case Hardening');
      if (/4140|4340|4130|alloy|chromoly/.test(signature)) return fromGroup('alloy_steel', 'Alloy Steel');
      return fromGroup('carbon_alloy', 'Carbon / Alloy');
    case 'tool_steel':
      if (/hot[- ]?work|h13|h11/.test(signature)) return fromGroup('hot_work', 'Hot Work');
      if (/cold[- ]?work|a2|d2|o1|o2|dc53/.test(signature)) return fromGroup('cold_work', 'Cold Work');
      if (/high[- ]?speed|m2|m4|t15/.test(signature)) return fromGroup('high_speed', 'High Speed');
      if (/shock|s7/.test(signature)) return fromGroup('shock_resisting', 'Shock Resisting');
      if (/mold|p20|plastic mold/.test(signature)) return fromGroup('mold_steel', 'Mold Steel');
      return fromGroup('tool_steel', 'General Tool Steel');
    case 'stainless':
      if (/super[- ]?duplex/.test(signature)) return fromGroup('super_duplex', 'Super Duplex');
      if (/duplex/.test(signature)) return fromGroup('duplex', 'Duplex');
      if (/17-4|15-5|13-8|precipitation/.test(signature)) return fromGroup('precipitation_hardening', 'Precipitation Hardening');
      if (/416|420|martensitic/.test(signature)) return fromGroup('martensitic', 'Martensitic');
      if (/430|409|ferritic/.test(signature)) return fromGroup('ferritic', 'Ferritic');
      return fromGroup('austenitic', 'Austenitic');
    case 'cast':
      if (/gray|grey/.test(signature)) return fromGroup('gray_iron', 'Gray Iron');
      if (/ductile/.test(signature)) return fromGroup('ductile_iron', 'Ductile Iron');
      if (/austempered|adi/.test(signature)) return fromGroup('austempered_ductile', 'ADI');
      if (/malleable/.test(signature)) return fromGroup('malleable_iron', 'Malleable Iron');
      if (/compacted graphite|cgi/.test(signature)) return fromGroup('cgi', 'Compacted Graphite');
      return fromGroup('cast_alloy', 'Cast Alloy');
    case 'aluminum':
      if (/cast/.test(signature)) return fromGroup('cast_aluminum', 'Cast Aluminum');
      if (/2xxx|2024/.test(signature)) return fromGroup('series_2xxx', '2xxx');
      if (/5xxx|5052|5083/.test(signature)) return fromGroup('series_5xxx', '5xxx');
      if (/6xxx|6061|6082/.test(signature)) return fromGroup('series_6xxx', '6xxx');
      if (/7xxx|7050|7075/.test(signature)) return fromGroup('series_7xxx', '7xxx');
      return fromGroup('aluminum_alloy', 'General Aluminum');
    case 'copper':
      if (/brass/.test(signature)) return fromGroup('brass', 'Brass');
      if (/bronze/.test(signature)) return fromGroup('bronze', 'Bronze');
      if (/beryllium copper|be[- ]?cu/.test(signature)) return fromGroup('beryllium_copper', 'Beryllium Copper');
      if (/cupronickel|copper nickel/.test(signature)) return fromGroup('cupronickel', 'Cupronickel');
      return fromGroup('copper_alloy', 'Copper Alloy');
    case 'titanium':
      if (/alpha[- ]?beta|grade 5|grade 23|ti-6al-4v|ti64/.test(signature)) return fromGroup('alpha_beta', 'Alpha-Beta');
      if (/grade 2|cp titanium|commercially pure/.test(signature)) return fromGroup('commercially_pure', 'Commercially Pure');
      if (/\bbeta\b/.test(signature)) return fromGroup('beta', 'Beta');
      return fromGroup('titanium_alloy', 'Titanium Alloy');
    case 'superalloy':
      if (/cobalt/.test(signature)) return fromGroup('cobalt_base', 'Cobalt Base');
      return fromGroup('nickel_base', 'Nickel Base');
    case 'exotic_alloy':
      if (/zirconium/.test(signature)) return fromGroup('zirconium', 'Zirconium');
      if (/nitinol|shape memory/.test(signature)) return fromGroup('shape_memory', 'Shape-Memory');
      if (/tantalum|niobium/.test(signature)) return fromGroup('reactive_refractory', 'Reactive / Refractory');
      if (/molybdenum|tungsten/.test(signature)) return fromGroup('refractory_metal', 'Refractory Metal');
      return fromGroup('exotic_alloy', 'General Exotic Alloy');
    case 'polymer_composite':
      if (/composite|carbon fiber|fiberglass|g10|fr4/.test(signature)) return fromGroup('composite', 'Composite');
      if (/phenolic|thermoset/.test(signature)) return fromGroup('thermoset', 'Thermoset');
      return fromGroup('thermoplastic', 'Thermoplastic');
    case 'graphite_ceramic':
      if (/graphite/.test(signature)) return fromGroup('graphite', 'Graphite');
      if (/glass|quartz/.test(signature)) return fromGroup('glass', 'Glass');
      return fromGroup('ceramic', 'Ceramic');
    case 'nontraditional':
      if (/slm|dmls|binder jet|additive/.test(signature)) return fromGroup('additive_feedstock', 'Additive Feedstock');
      if (/mim/.test(signature)) return fromGroup('mim', 'MIM');
      return fromGroup('process_stock', 'Process Stock');
    default:
      return fromGroup('general', 'General');
  }
}

function deriveStaticMaterialCondition(item: MaterialCatalogItem) {
  const signature = `${item.name} ${item.note} ${item.hardness}`.toLowerCase();
  if (/annealed|anneal/.test(signature)) return { id: 'annealed', label: 'Annealed' };
  if (/q&t|qt|quenched.*tempered|prehard|pre-hard|ph\b/.test(signature)) return { id: 'prehardened_qt', label: 'Prehardened / Q&T' };
  if (/aged|h900|h1025|h1150|sta/.test(signature)) return { id: 'aged_sta', label: 'Aged / STA' };
  if (/t6|t651|t6511/.test(signature)) return { id: 't6', label: 'T6' };
  if (/cold worked|cold-worked|half hard/.test(signature)) return { id: 'cold_worked', label: 'Cold Worked' };
  if (/blackheart/.test(signature)) return { id: 'blackheart', label: 'Blackheart' };
  if (/commercially pure|grade 2/.test(signature)) return { id: 'commercially_pure', label: 'Commercially Pure' };
  return undefined;
}

function deriveStaticMaterialIsoGroup(item: MaterialCatalogItem): string | undefined {
  switch (item.group) {
    case 'steel':
      return 'P';
    case 'tool_steel':
      return 'H';
    case 'stainless':
      return 'M';
    case 'cast':
      return 'K';
    case 'aluminum':
    case 'copper':
      return 'N';
    case 'titanium':
    case 'superalloy':
    case 'exotic_alloy':
      return 'S';
    case 'nontraditional':
      return 'X';
    default:
      return undefined;
  }
}

function enrichStaticMaterialCatalogItem(item: MaterialCatalogItem): MaterialCatalogItem {
  const subcategory = item.subcategoryId || item.subcategoryLabel
    ? {
        id: normalizeMaterialTaxonomyId(item.subcategoryId ?? item.subcategoryLabel ?? 'general'),
        label: item.subcategoryLabel ?? humanizeMaterialTaxonomyLabel(item.subcategoryId ?? 'general'),
      }
    : deriveStaticMaterialSubcategory(item);
  const condition = item.conditionId || item.conditionLabel
    ? {
        id: normalizeMaterialTaxonomyId(item.conditionId ?? item.conditionLabel ?? 'condition'),
        label: item.conditionLabel ?? humanizeMaterialTaxonomyLabel(item.conditionId ?? 'condition'),
      }
    : deriveStaticMaterialCondition(item);

  return {
    ...item,
    groupLabel: item.groupLabel ?? MATERIAL_GROUPS.find((group) => group.id === item.group)?.label,
    subcategoryId: subcategory.id,
    subcategoryLabel: subcategory.label,
    conditionId: condition?.id,
    conditionLabel: condition?.label,
    familyLabel: item.familyLabel ?? subcategory.label,
    isoGroup: item.isoGroup?.trim() || deriveStaticMaterialIsoGroup(item),
  };
}

export const MATERIAL_CATALOG: MaterialCatalogItem[] = [
  {
    id: '4140',
    group: 'steel',
    name: '4140 Steel',
    hardness: '197-235 HB',
    baseSfm: 280,
    machinability: 'Medium',
    chipControl: 'Moderate segmentation',
    note: 'Reliable annealed alloy-steel benchmark for roughing and finishing.',
    idealCoolant: 'Flood or TSC',
  },
  {
    id: '4140-ph',
    group: 'steel',
    name: '4140 PH / Prehard',
    hardness: '28-32 HRC',
    baseSfm: 220,
    machinability: 'Medium-low',
    chipControl: 'Shorter chips with higher edge stress than annealed 4140',
    note: 'Common mold-base and fixture condition where rigidity and insert grade matter more.',
    idealCoolant: 'Flood or TSC',
  },
  {
    id: '4340',
    group: 'steel',
    name: '4340 Alloy Steel',
    hardness: '217-269 HB',
    baseSfm: 210,
    machinability: 'Medium-low',
    chipControl: 'Tough alloy chips that reward steady edge prep',
    note: 'Use this for tougher alloy-steel shafts, pins, and highly stressed components.',
    idealCoolant: 'Flood or TSC',
  },
  {
    id: '4130',
    group: 'steel',
    name: '4130 Chromoly',
    hardness: '163-197 HB',
    baseSfm: 300,
    machinability: 'Medium-high',
    chipControl: 'Predictable chip formation with stable feed pressure',
    note: 'Good baseline for welded structures, tube work, and aerospace bracket stock.',
    idealCoolant: 'Flood',
  },
  {
    id: '8620',
    group: 'steel',
    name: '8620 Alloy Steel',
    hardness: '149-187 HB',
    baseSfm: 320,
    machinability: 'High',
    chipControl: 'Friendly chips before case hardening',
    note: 'Useful baseline for pre-heat-treat gears, pinions, and carburized components.',
    idealCoolant: 'Flood',
  },
  {
    id: '12l14',
    group: 'steel',
    name: '12L14 Free-Machining Steel',
    hardness: '140-170 HB',
    baseSfm: 500,
    machinability: 'Very high',
    chipControl: 'Excellent short-chip behavior',
    note: 'Lathe-friendly free-machining grade for fittings, bushings, and quick-turn parts.',
    idealCoolant: 'Flood or mist',
  },
  {
    id: 'a36',
    group: 'steel',
    name: 'A36 Structural Steel',
    hardness: '119-159 HB',
    baseSfm: 340,
    machinability: 'Medium-high',
    chipControl: 'Can string if the insert is too sharp',
    note: 'Practical baseline for plate, weldments, and general fab work.',
    idealCoolant: 'Flood or TSC',
  },
  {
    id: '1018',
    group: 'steel',
    name: '1018 Steel',
    hardness: '120-180 HB',
    baseSfm: 360,
    machinability: 'High',
    chipControl: 'Stringy without chipbreaker discipline',
    note: 'Good baseline for general-purpose production work.',
    idealCoolant: 'Flood',
  },
  {
    id: '1020',
    group: 'steel',
    name: '1020 Steel',
    hardness: '126-163 HB',
    baseSfm: 340,
    machinability: 'High',
    chipControl: 'Mild-steel stringing unless chipbreakers stay engaged',
    note: 'Common low-carbon shaft and plate grade for both milling and turning.',
    idealCoolant: 'Flood',
  },
  {
    id: '1045',
    group: 'steel',
    name: '1045 Steel',
    hardness: '170-210 HB',
    baseSfm: 300,
    machinability: 'Medium-high',
    chipControl: 'More cooperative chip break than 1018/1020 once the load is up.',
    note: 'Common medium-carbon turning and shaft material that bridges mild steels and tougher alloy grades.',
    idealCoolant: 'Flood or TSC',
  },
  {
    id: '52100',
    group: 'steel',
    name: '52100 Bearing Steel',
    hardness: '197-229 HB',
    baseSfm: 180,
    machinability: 'Low-medium',
    chipControl: 'Dense alloy chips with higher heat concentration',
    note: 'Use an annealed baseline for bearing races, rollers, and wear parts before heat treat.',
    idealCoolant: 'Flood or TSC',
  },
  {
    id: 'h13',
    group: 'tool_steel',
    name: 'H13 Tool Steel',
    hardness: '235-285 HB annealed',
    baseSfm: 110,
    machinability: 'Low',
    chipControl: 'Hot-hard tool-steel chips that punish weak edges',
    note: 'Hot-work die steel that needs conservative engagement and strong cutter prep.',
    idealCoolant: 'Flood or TSC',
  },
  {
    id: 'a2',
    group: 'tool_steel',
    name: 'A2 Tool Steel',
    hardness: '200-235 HB annealed',
    baseSfm: 140,
    machinability: 'Low-medium',
    chipControl: 'Tighter curled chips than D2, but still edge-demanding',
    note: 'Cold-work tool steel baseline for die components and wear plates.',
    idealCoolant: 'Flood or TSC',
  },
  {
    id: 's7',
    group: 'tool_steel',
    name: 'S7 Tool Steel',
    hardness: '210-240 HB annealed',
    baseSfm: 150,
    machinability: 'Low-medium',
    chipControl: 'Tough shock-resistant chips with steady load',
    note: 'Good baseline for impact-resistant tooling, punches, and shear blades.',
    idealCoolant: 'Flood or TSC',
  },
  {
    id: 'o2',
    group: 'tool_steel',
    name: 'O2 Tool Steel',
    hardness: '210-235 HB annealed',
    baseSfm: 135,
    machinability: 'Low-medium',
    chipControl: 'Stable chip formation but lower speed tolerance than plain alloy steel',
    note: 'Oil-hardening tool steel used for punches, gauges, and smaller die details.',
    idealCoolant: 'Flood',
  },
  {
    id: 'd2',
    group: 'tool_steel',
    name: 'D2 Tool Steel',
    hardness: '220-255 HB annealed',
    baseSfm: 90,
    machinability: 'Low',
    chipControl: 'Abrasive high-chromium chips with strong edge wear pressure',
    note: 'High-wear cold-work tool steel that needs rigid setup and conservative finish strategy.',
    idealCoolant: 'Flood or TSC',
  },
  {
    id: 'p20',
    group: 'tool_steel',
    name: 'P20 Mold Steel',
    hardness: '28-32 HRC',
    baseSfm: 180,
    machinability: 'Medium',
    chipControl: 'Prehard mold-steel chip with more heat than normalized alloy steels.',
    note: 'Common mold-base and cavity steel where polishability and dimensional stability matter.',
    idealCoolant: 'Flood or TSC',
  },
  {
    id: '303',
    group: 'stainless',
    name: '303 Stainless',
    hardness: '150-190 HB',
    baseSfm: 260,
    machinability: 'Medium-high',
    chipControl: 'Much friendlier stainless chip control than 304/316',
    note: 'Free-machining stainless baseline for turned components, fittings, and fasteners.',
    idealCoolant: 'Flood',
  },
  {
    id: '304',
    group: 'stainless',
    name: '304 Stainless',
    hardness: '150-190 HB',
    baseSfm: 180,
    machinability: 'Low',
    chipControl: 'Work-hardening / gummy',
    note: 'Rewards aggressive chip thinning and stable coolant delivery.',
    idealCoolant: 'TSC or high-pressure flood',
  },
  {
    id: '316',
    group: 'stainless',
    name: '316 Stainless',
    hardness: '150-190 HB',
    baseSfm: 160,
    machinability: 'Low',
    chipControl: 'Gummy and work-hardening with more heat than 303/304',
    note: 'Corrosion-resistant stainless baseline for medical, marine, and process hardware.',
    idealCoolant: 'TSC or high-pressure flood',
  },
  {
    id: '17-4ph',
    group: 'stainless',
    name: '17-4 PH Stainless',
    hardness: '28-36 HRC typical aged condition',
    baseSfm: 145,
    machinability: 'Low-medium',
    chipControl: 'Shorter chips than austenitic stainless, but harder on edges',
    note: 'Precipitation-hardening stainless for aerospace, valve, and structural components.',
    idealCoolant: 'Flood or TSC',
  },
  {
    id: '15-5ph',
    group: 'stainless',
    name: '15-5 PH Stainless',
    hardness: '30-38 HRC typical aged condition',
    baseSfm: 150,
    machinability: 'Low-medium',
    chipControl: 'Stable but edge-demanding chips in aged condition',
    note: 'PH stainless cousin to 17-4 used in aerospace hardware and higher-toughness parts.',
    idealCoolant: 'Flood or TSC',
  },
  {
    id: '420',
    group: 'stainless',
    name: '420 Stainless',
    hardness: '180-220 HB annealed',
    baseSfm: 120,
    machinability: 'Low-medium',
    chipControl: 'Martensitic stainless chips with more heat than carbon steel',
    note: 'Blade, valve, and wear-part baseline before hardening or final grinding.',
    idealCoolant: 'Flood or TSC',
  },
  {
    id: '416',
    group: 'stainless',
    name: '416 Stainless',
    hardness: '140-190 HB',
    baseSfm: 240,
    machinability: 'Medium-high',
    chipControl: 'Cleaner chip control than 304/316 with better lathe-friendly behavior',
    note: 'Free-machining martensitic stainless baseline for shafts, valve parts, and turned hardware.',
    idealCoolant: 'Flood',
  },
  {
    id: '6061',
    group: 'aluminum',
    name: '6061-T6 Aluminum',
    hardness: '95 HB',
    baseSfm: 850,
    machinability: 'Very high',
    chipControl: 'Free-cutting but edge buildup possible',
    note: 'Great speed-feed demo material for finishing and adaptive roughing.',
    idealCoolant: 'Mist or flood',
  },
  {
    id: '7075',
    group: 'aluminum',
    name: '7075-T6 Aluminum',
    hardness: '150 HB',
    baseSfm: 700,
    machinability: 'High',
    chipControl: 'Excellent chip control',
    note: 'Supports high-speed finishing while holding tighter surfaces.',
    idealCoolant: 'Mist, air blast, or flood',
  },
  {
    id: 'ti64',
    group: 'titanium',
    name: 'Ti-6Al-4V',
    hardness: '34 HRC equivalent',
    baseSfm: 120,
    machinability: 'Very low',
    chipControl: 'Heat-sensitive, not chip-friendly',
    note: 'Low thermal conductivity pushes coolant and engagement strategy to the front.',
    idealCoolant: 'High-pressure flood',
  },
  {
    id: 'in718',
    group: 'superalloy',
    name: 'Inconel 718',
    hardness: '35-45 HRC',
    baseSfm: 75,
    machinability: 'Very low',
    chipControl: 'Heat-loaded and strain hardening',
    note: 'Use short gauge length, conservative engagement, and stable workholding.',
    idealCoolant: 'High-pressure flood',
  },
  {
    id: 'cp-ti-g2',
    group: 'titanium',
    name: 'CP Titanium Grade 2',
    hardness: '145-185 HB',
    baseSfm: 160,
    machinability: 'Low',
    chipControl: 'Smeary chips with strong heat concentration and low conductivity',
    note: 'Commercially pure titanium for corrosion-resistant process hardware and formed sheet details.',
    idealCoolant: 'High-pressure flood',
  },
  {
    id: 'hastelloy-c276',
    group: 'superalloy',
    name: 'Hastelloy C-276',
    hardness: '28-35 HRC equivalent',
    baseSfm: 55,
    machinability: 'Very low',
    chipControl: 'Work-hardening nickel-base chips that punish dwell and weak edge prep',
    note: 'Corrosion-resistant nickel alloy that needs short gauge, stable chip thinning, and disciplined heat control.',
    idealCoolant: 'High-pressure flood',
  },
  {
    id: 'c360-brass',
    group: 'copper',
    name: 'C360 Free-Cutting Brass',
    hardness: '78-100 HB',
    baseSfm: 520,
    machinability: 'Very high',
    chipControl: 'Excellent short-chip behavior',
    note: 'High-machinability brass baseline for valve bodies, fittings, and turned connectors.',
    idealCoolant: 'Flood or mist',
  },
  {
    id: 'c932-bronze',
    group: 'copper',
    name: 'C932 Bearing Bronze',
    hardness: '65-90 HB',
    baseSfm: 360,
    machinability: 'Medium-high',
    chipControl: 'Shorter chips than pure copper alloys but still benefits from polished edges',
    note: 'Bearing bronze baseline for bushings, wear sleeves, and sliding hardware.',
    idealCoolant: 'Flood',
  },
  {
    id: 'zirconium-702',
    group: 'exotic_alloy',
    name: 'Zirconium 702',
    hardness: '150-180 HB',
    baseSfm: 70,
    machinability: 'Very low',
    chipControl: 'Reactive chips with heavy smearing and strong heat sensitivity',
    note: 'Reactive corrosion-resistant alloy that rewards light radial engagement and clean edge prep.',
    idealCoolant: 'High-pressure flood',
  },
  {
    id: 'nitinol-55',
    group: 'exotic_alloy',
    name: 'Nitinol 55',
    hardness: '30-38 HRC equivalent',
    baseSfm: 45,
    machinability: 'Very low',
    chipControl: 'Elastic heat-loaded chips with rapid work hardening',
    note: 'Shape-memory alloy baseline for medical and motion components where heat input must stay controlled.',
    idealCoolant: 'High-pressure flood',
  },
  {
    id: 'peek',
    group: 'polymer_composite',
    name: 'PEEK',
    hardness: 'Shore D 85-90',
    baseSfm: 900,
    machinability: 'High',
    chipControl: 'Clean chips if heat stays under control',
    note: 'High-performance thermoplastic used for seals, electrical fixtures, and medical components.',
    idealCoolant: 'Air blast or mist',
  },
  {
    id: 'g10-fr4',
    group: 'polymer_composite',
    name: 'G10 / FR4 Laminate',
    hardness: 'Composite laminate',
    baseSfm: 650,
    machinability: 'Medium',
    chipControl: 'Abrasive dust and splintering without proper support',
    note: 'Glass-fiber laminate that needs dust control, support, and abrasive-resistant tooling.',
    idealCoolant: 'Air blast or dry',
  },
  {
    id: 'edm-graphite',
    group: 'graphite_ceramic',
    name: 'EDM Graphite',
    hardness: 'Grade-dependent',
    baseSfm: 1400,
    machinability: 'Medium-high',
    chipControl: 'Dry powder and brittle dust, not ductile chips',
    note: 'Graphite electrode stock that prefers dust extraction, sharp edges, and light radial pressure.',
    idealCoolant: 'Dry or air blast',
  },
  {
    id: 'alumina-ceramic',
    group: 'graphite_ceramic',
    name: 'Alumina Ceramic',
    hardness: 'Ceramic',
    baseSfm: 0,
    machinability: 'Process-dependent',
    chipControl: 'Brittle fracture, not conventional chip formation',
    note: 'Ceramic stock reference for grinding, abrasive trimming, or nontraditional process planning.',
    idealCoolant: 'Process-specific',
  },
  {
    id: 'cast-iron',
    group: 'cast',
    name: 'Gray Cast Iron',
    hardness: '180-240 HB',
    baseSfm: 320,
    machinability: 'Medium-high',
    chipControl: 'Short, dusty chips',
    note: 'Often favors dry or air-blast machining depending on cleanliness goals.',
    idealCoolant: 'Dry or air blast',
  },
  {
    id: 'tool-steel-plate',
    group: 'nontraditional',
    name: 'Generic Tool Steel Plate',
    hardness: 'Annealed',
    baseSfm: 0,
    machinability: 'Process-dependent',
    chipControl: 'Depends on selected cutting process',
    note: 'Generic nontraditional stock reference for EDM, laser prep, and waterjet edge planning.',
    idealCoolant: 'Process-specific',
  },
].map((item) => enrichStaticMaterialCatalogItem(item));

export const TOOL_CATALOG: ToolCatalogItem[] = [
  {
    id: 'face-mill',
    mode: 'mill',
    family: 'Indexable Face Mill',
    label: '3 in face mill',
    description: 'Fast surfacing and reference-plane cleanup.',
    holder: 'CAT40 shell mill arbor',
    coating: 'PVD multi-layer',
    defaultDiameter: 76.2,
    defaultFlutes: 6,
    operation: 'face_milling',
    supportedOperations: ['face_milling'],
    toolpathKeywords: ['face'],
    toolMaterialClass: 'carbide',
    geometryClass: 'face-mill',
    edgePrep: 'wiper',
    cornerRadiusMm: 0.8,
    leadAngleDeg: 45,
    wiperGeometry: true,
  },
  {
    id: 'adaptive-endmill',
    mode: 'mill',
    family: 'Variable-Flute End Mill',
    label: '0.5 in high-performance rougher',
    description: 'Adaptive roughing with chip thinning and better chatter margin.',
    holder: 'Hydraulic or shrink-fit',
    coating: 'AlTiN / TiSiN',
    defaultDiameter: 12.7,
    defaultFlutes: 5,
    operation: 'roughing',
    supportedOperations: ['roughing', 'pocket_milling'],
    toolpathKeywords: ['adaptive', 'dynamic', 'rough', 'pocket', 'opti', 'waveform', 'volumill', 'vortex'],
    toolMaterialClass: 'carbide',
    geometryClass: 'variable-helix-endmill',
    edgePrep: 'reinforced',
    cornerRadiusMm: 0.5,
    helixAngleDeg: 42,
  },
  {
    id: 'shoulder-mill',
    mode: 'mill',
    family: 'Indexable Shoulder Mill',
    label: '0.5 in shoulder mill',
    description: 'General-purpose contouring, wall work, and shoulder cleanup.',
    holder: 'Weldon side-lock or shrink-fit',
    coating: 'TiAlN / AlCrN',
    defaultDiameter: 12.7,
    defaultFlutes: 4,
    operation: 'shoulder_milling',
    supportedOperations: ['shoulder_milling'],
    toolpathKeywords: ['contour', 'profile', 'shoulder'],
    toolMaterialClass: 'carbide',
    geometryClass: 'square-endmill',
    edgePrep: 'reinforced',
    cornerRadiusMm: 0.8,
    leadAngleDeg: 90,
  },
  {
    id: 'slot-endmill',
    mode: 'mill',
    family: 'Center-Cutting End Mill',
    label: '0.375 in slotting end mill',
    description: 'Slotting and keyway work with center-cutting entry support.',
    holder: 'ER collet or hydraulic chuck',
    coating: 'AlTiN',
    defaultDiameter: 9.525,
    defaultFlutes: 4,
    operation: 'slot_milling',
    supportedOperations: ['slot_milling', 'pocket_milling'],
    toolpathKeywords: ['slot', 'keyway'],
    toolMaterialClass: 'carbide',
    geometryClass: 'square-endmill',
    edgePrep: 'sharp',
    cornerRadiusMm: 0.2,
    helixAngleDeg: 35,
  },
  {
    id: 'finisher',
    mode: 'mill',
    family: 'Finish End Mill',
    label: '0.375 in finishing end mill',
    description: 'Tighter wall and floor finish in aluminum or steel.',
    holder: 'Shrink-fit',
    coating: 'TiB2 for aluminum / AlCrN for steel',
    defaultDiameter: 9.525,
    defaultFlutes: 4,
    operation: 'finishing',
    supportedOperations: ['finishing', 'face_milling'],
    toolpathKeywords: ['finish pass', 'finish', 'profile', 'wall', 'floor', 'face', 'contour', 'pencil', 'sweep', 'recovery', 'probe'],
    toolMaterialClass: 'carbide',
    geometryClass: 'square-endmill',
    edgePrep: 'sharp',
    cornerRadiusMm: 0.2,
    helixAngleDeg: 40,
  },
  {
    id: 'ball-endmill',
    mode: 'mill',
    family: 'Ball Nose End Mill',
    label: '0.5 in ball nose finisher',
    description: 'Surface finishing on 3D geometry, blends, and sculpted features.',
    holder: 'Shrink-fit or hydraulic chuck',
    coating: 'AlCrN / nACo',
    defaultDiameter: 12.7,
    defaultFlutes: 4,
    operation: 'finishing',
    supportedOperations: ['finishing'],
    toolpathKeywords: [
      'parallel',
      'scallop',
      'flow',
      'surface',
      'z-level',
      'steep',
      'multiaxis',
      'multi-axis',
      '5-axis',
      'simultaneous',
      'swarf',
      'variable contour',
      'contour',
      'pencil',
      'sweep',
      'sweeping',
    ],
    toolMaterialClass: 'carbide',
    geometryClass: 'ball-endmill',
    edgePrep: 'sharp',
    noseRadiusMm: 6.35,
    helixAngleDeg: 35,
  },
  {
    id: 'micro-endmill',
    mode: 'mill',
    family: 'Micro Carbide End Mill',
    label: '0.5 mm micro end mill',
    description: 'High-speed micro milling for electrodes, engraving, fine die details, and small-part finishing.',
    holder: 'High-speed micro collet',
    coating: 'DLC / diamond-like for graphite, TiAlN for steels',
    defaultDiameter: 0.5,
    defaultFlutes: 2,
    operation: 'finishing',
    supportedOperations: ['finishing', 'pocket_milling', 'slot_milling'],
    toolpathKeywords: ['micro', 'engrave', 'mark', 'finish', 'pencil', 'graphite', 'electrode', 'slot', 'pocket'],
    toolMaterialClass: 'carbide',
    geometryClass: 'square-endmill',
    edgePrep: 'sharp',
    cornerRadiusMm: 0.02,
    helixAngleDeg: 30,
    fluteLengthMm: 1.5,
    overallLengthMm: 38,
    shankDiameterMm: 3,
    maxRpm: 30000,
  },
  {
    id: 'chamfer-mill',
    mode: 'mill',
    family: 'Chamfer / Engraving Mill',
    label: '90 degree chamfer mill',
    description: 'Light chamfering, engraving, and marking passes.',
    holder: 'ER collet',
    coating: 'TiAlN',
    defaultDiameter: 12,
    defaultFlutes: 2,
    operation: 'finishing',
    supportedOperations: ['finishing'],
    toolpathKeywords: ['engrave', 'mark', 'chamfer'],
    toolMaterialClass: 'carbide',
    geometryClass: 'chamfer',
    edgePrep: 'sharp',
  },
  {
    id: 'carbide-drill',
    mode: 'mill',
    family: 'Solid Carbide Drill',
    label: '10 mm carbide drill',
    description: 'General holemaking with peck, through-spindle, or chip-break cycles.',
    holder: 'Hydraulic drill chuck',
    coating: 'TiAlN / AlCrN',
    defaultDiameter: 10,
    defaultFlutes: 2,
    operation: 'drilling',
    supportedOperations: ['drilling'],
    toolpathKeywords: ['drill', 'bolt', 'hole'],
    toolMaterialClass: 'carbide',
    geometryClass: 'drill',
    edgePrep: 'sharp',
  },
  {
    id: 'turn-rough',
    mode: 'lathe',
    family: 'CNMG Roughing Tool',
    label: 'CNMG 80° roughing holder',
    description: 'General OD roughing insert with stronger edge security.',
    holder: 'PCLNR / DCLNR style',
    coating: 'CVD steel grade',
    defaultDiameter: 25,
    defaultFlutes: 1,
    operation: 'turning_rough',
    supportedOperations: ['turning_rough'],
    toolpathKeywords: ['rough'],
    toolMaterialClass: 'carbide',
    geometryClass: 'roughing-insert',
    edgePrep: 'reinforced',
    noseRadiusMm: 0.8,
    leadAngleDeg: 95,
  },
  {
    id: 'turn-finish',
    mode: 'lathe',
    family: 'VNMG Finishing Tool',
    label: 'VNMG finishing insert',
    description: 'Lower cutting pressure and better finish access.',
    holder: 'SVJBR style',
    coating: 'PVD stainless / finishing grade',
    defaultDiameter: 12,
    defaultFlutes: 1,
    operation: 'turning_finish',
    supportedOperations: ['turning_finish'],
    toolpathKeywords: ['finish', 'profile', 'wave'],
    toolMaterialClass: 'carbide',
    geometryClass: 'finishing-insert',
    edgePrep: 'wiper',
    noseRadiusMm: 0.4,
    leadAngleDeg: 35,
    wiperGeometry: true,
  },
  {
    id: 'turn-groove',
    mode: 'lathe',
    family: 'Grooving / Parting Tool',
    label: '3 mm grooving insert tool',
    description: 'OD/face grooving, recessing, and cutoff work.',
    holder: 'MGEHR / cut-off blade',
    coating: 'PVD grooving grade',
    defaultDiameter: 3,
    defaultFlutes: 1,
    operation: 'grooving',
    supportedOperations: ['grooving'],
    toolpathKeywords: ['groove', 'cutoff', 'part'],
    toolMaterialClass: 'carbide',
    geometryClass: 'grooving-insert',
    edgePrep: 'honed',
    noseRadiusMm: 0.2,
  },
  {
    id: 'turn-thread',
    mode: 'lathe',
    family: 'Laydown Threading Insert',
    label: 'Laydown threading insert',
    description: 'Single-point external and internal thread generation.',
    holder: 'SER / SEL laydown holder',
    coating: 'PVD threading grade',
    defaultDiameter: 16,
    defaultFlutes: 1,
    operation: 'turning_finish',
    supportedOperations: ['turning_finish'],
    toolpathKeywords: ['thread'],
    toolMaterialClass: 'carbide',
    geometryClass: 'threading-insert',
    edgePrep: 'sharp',
    noseRadiusMm: 0.05,
  },
  {
    id: 'bore-bar',
    mode: 'lathe',
    family: 'Carbide Boring Bar',
    label: '0.75 in carbide boring bar',
    description: 'Internal profile cleanup and centerline boring.',
    holder: 'SCLCR / A boring bar',
    coating: 'PVD steel grade',
    defaultDiameter: 19.05,
    defaultFlutes: 1,
    operation: 'boring',
    supportedOperations: ['boring'],
    toolpathKeywords: ['bore', 'centerline'],
    toolMaterialClass: 'carbide',
    geometryClass: 'boring-bar',
    edgePrep: 'sharp',
    noseRadiusMm: 0.4,
    leadAngleDeg: 95,
  },
  {
    id: 'turn-drill',
    mode: 'lathe',
    family: 'Turret Drill',
    label: '0.5 in turret carbide drill',
    description: 'Centerline drilling from the main or sub-spindle turret.',
    holder: 'VDI / BMT drill holder',
    coating: 'TiAlN drill grade',
    defaultDiameter: 12.7,
    defaultFlutes: 2,
    operation: 'boring',
    supportedOperations: ['boring'],
    toolpathKeywords: ['drill', 'centerline'],
    toolMaterialClass: 'carbide',
    geometryClass: 'drill',
    edgePrep: 'sharp',
  },
  {
    id: 'live-tool-endmill',
    mode: 'lathe',
    family: 'Live Tool End Mill',
    label: '0.375 in live-tool end mill',
    description: 'Driven-tool milling for mill-turn and Y-axis features.',
    holder: 'VDI / BMT live holder',
    coating: 'AlTiN / TiSiN',
    defaultDiameter: 9.525,
    defaultFlutes: 4,
    operation: 'turning_finish',
    supportedOperations: ['turning_finish'],
    toolpathKeywords: ['live', 'mill-turn', 'sync'],
    toolMaterialClass: 'carbide',
    geometryClass: 'live-tool-endmill',
    edgePrep: 'sharp',
    cornerRadiusMm: 0.2,
    helixAngleDeg: 38,
  },
  {
    id: 'wire-standard',
    mode: 'wire_edm',
    family: 'Brass Wire',
    label: '0.25 mm brass wire',
    description: 'General contouring with balanced speed and finish.',
    holder: 'Upper/lower guides',
    coating: 'Coated wire consumable',
    defaultDiameter: 0.25,
    defaultFlutes: 1,
    operation: 'wire_profile',
    supportedOperations: ['wire_profile', 'wire_skims'],
    toolpathKeywords: ['profile', 'taper', 'skim', 'tab', 'slug', 'wire'],
    toolMaterialClass: 'wire',
    geometryClass: 'wire',
  },
  {
    id: 'edm-electrode',
    mode: 'edm',
    family: 'Graphite Electrode',
    label: 'Fine-grain graphite electrode',
    description: 'Good cavity detail with stable wear performance.',
    holder: 'Electrode chuck',
    coating: 'None',
    defaultDiameter: 10,
    defaultFlutes: 1,
    operation: 'burn_finishing',
    supportedOperations: ['burn_roughing', 'burn_finishing'],
    toolpathKeywords: ['electrode', 'cavity', 'burn', 'orbit', 'detail', 'rough', 'finish', 'sequence'],
    toolMaterialClass: 'graphite',
    geometryClass: 'electrode',
  },
  {
    id: 'laser-nozzle',
    mode: 'laser',
    family: 'Fiber Nozzle',
    label: '1.5 mm single nozzle',
    description: 'Nitrogen-assisted sheet cutting setup.',
    holder: 'Standard nozzle pack',
    coating: 'Consumable',
    defaultDiameter: 1.5,
    defaultFlutes: 1,
    operation: 'laser_cut',
    supportedOperations: ['laser_cut', 'laser_edge'],
    toolpathKeywords: ['profile', 'cut', 'edge', 'microtab', 'micro-joint', 'mark', 'quality', 'common'],
    toolMaterialClass: 'abrasive',
    geometryClass: 'beam',
  },
  {
    id: 'waterjet-nozzle',
    mode: 'waterjet',
    family: 'Abrasive Nozzle',
    label: '0.030 in orifice + 0.040 in mixing tube',
    description: 'General abrasive cutting baseline.',
    holder: 'Mixing head',
    coating: 'Consumable',
    defaultDiameter: 0.76,
    defaultFlutes: 1,
    operation: 'abrasive_cut',
    supportedOperations: ['abrasive_cut', 'taper_control'],
    toolpathKeywords: ['contour', 'quality', 'taper', 'pierce', 'dynamic', 'bevel', 'stack'],
    toolMaterialClass: 'abrasive',
    geometryClass: 'stream',
  },
];

export const COOLANT_OPTIONS: SelectionOption[] = [
  { id: 'flood', label: 'Flood', detail: 'Default high-volume coolant for stable milling and turning.' },
  { id: 'tsc', label: 'Through-spindle', detail: 'Best for deep pockets, drilling, and stainless/titanium.' },
  { id: 'through_air', label: 'Through-air', detail: 'Air through the spindle or tool path for dry chip evacuation and lighter 5-axis work.' },
  { id: 'mist', label: 'Mist / MQL', detail: 'Lighter chip evacuation and great for aluminum or cleaner parts.' },
  { id: 'air', label: 'Air blast', detail: 'Dry chip clearing for cast iron, graphite, or light aluminum work.' },
  { id: 'dielectric', label: 'Dielectric / process fluid', detail: 'EDM and wire setups rely on flushing, not spindle coolant.' },
];

export const COOLANT_OPTION_IDS_BY_MODE: Record<MachineMode, CoolantOptionId[]> = {
  mill: ['flood', 'tsc', 'through_air', 'mist', 'air'],
  lathe: ['flood', 'tsc', 'through_air', 'mist', 'air'],
  edm: ['dielectric'],
  wire_edm: ['dielectric'],
  laser: ['air'],
  waterjet: ['dielectric'],
};

export function filterCoolantOptionIds(
  ids: readonly string[] | undefined,
  mode: MachineMode,
): CoolantOptionId[] {
  const allowed = new Set(COOLANT_OPTION_IDS_BY_MODE[mode]);
  const normalized = new Set<CoolantOptionId>();
  for (const id of ids ?? []) {
    if (allowed.has(id as CoolantOptionId)) {
      normalized.add(id as CoolantOptionId);
    }
  }
  return COOLANT_OPTION_IDS_BY_MODE[mode].filter((id) => normalized.has(id));
}

export function toolSupportsToolpath(
  tool: Pick<ToolCatalogItem, 'operation' | 'supportedOperations' | 'toolpathKeywords'>,
  toolpath: Pick<ProgrammingToolpathOption, 'operationId' | 'label' | 'path'>,
) {
  const supportedOperations = tool.supportedOperations ?? [tool.operation];
  const matchesOperation = supportedOperations.includes(toolpath.operationId);
  const keywords = tool.toolpathKeywords?.map((keyword) => keyword.toLowerCase()) ?? [];
  if (keywords.length === 0) {
    return matchesOperation;
  }

  const signature = `${toolpath.label} ${toolpath.path}`.toLowerCase();
  const matchesKeyword = keywords.some((keyword) => signature.includes(keyword));

  if (toolpath.operationId === 'finishing' || toolpath.operationId === 'turning_finish') {
    return matchesOperation && matchesKeyword;
  }

  return matchesOperation || matchesKeyword;
}

export function coolantOptionsForMode(mode: MachineMode): SelectionOption[] {
  const allowed = new Set(COOLANT_OPTION_IDS_BY_MODE[mode]);
  return COOLANT_OPTIONS.filter((option) => allowed.has(option.id as CoolantOptionId));
}

export const WORKHOLDING_OPTIONS: SelectionOption[] = [
  { id: 'vise-soft-jaw', label: 'Vise + soft jaws', detail: 'Fast and rigid for plate and block work.' },
  { id: 'fixture-plate', label: 'Fixture plate', detail: 'Best for repeatability and multiple-part setups.' },
  { id: 'collet-chuck', label: 'Collet / chucking', detail: 'Good concentricity for lathe and mill-turn work.' },
  { id: 'three-jaw-chuck', label: '3-jaw chuck', detail: 'Fast general-purpose lathe workholding for turned blanks.' },
  { id: 'soft-jaw-chuck', label: 'Soft-jaw chuck', detail: 'Best when clamping needs to match the real turned part geometry.' },
  { id: 'between-centers', label: 'Between centers', detail: 'Supports long shafts and concentric turning with tailstock support.' },
  { id: 'steady-rest', label: 'Steady rest / follow support', detail: 'Adds support for long or flexible turned parts.' },
  { id: 'sub-spindle-support', label: 'Sub-spindle handoff', detail: 'Use when the second spindle is part of the real turning setup.' },
  { id: 'rotary-trunnion', label: 'Rotary / trunnion', detail: 'Needed when you are staging 4th-axis or 3+2 work.' },
  { id: 'wire-fixture', label: 'Wire / EDM fixture', detail: 'Low-profile locating and flush access take priority.' },
];

const WORKHOLDING_OPTION_IDS_BY_MODE: Record<MachineMode, string[]> = {
  mill: ['vise-soft-jaw', 'fixture-plate', 'collet-chuck', 'rotary-trunnion'],
  lathe: ['collet-chuck', 'three-jaw-chuck', 'soft-jaw-chuck', 'between-centers', 'steady-rest', 'sub-spindle-support'],
  edm: ['wire-fixture', 'fixture-plate'],
  wire_edm: ['wire-fixture', 'fixture-plate'],
  laser: ['fixture-plate'],
  waterjet: ['fixture-plate'],
};

export function workholdingOptionsForMode(mode: MachineMode): SelectionOption[] {
  const allowed = new Set(WORKHOLDING_OPTION_IDS_BY_MODE[mode]);
  return WORKHOLDING_OPTIONS.filter((option) => allowed.has(option.id));
}

export const STOCK_SHAPES: SelectionOption[] = [
  { id: 'plate', label: 'Plate', detail: 'Rectangular stock with X/Y/Z dimensions.' },
  { id: 'round', label: 'Round', detail: 'Bar or billet with diameter and length.' },
  { id: 'tube', label: 'Tube', detail: 'OD/ID stock for hollow parts or turn work.' },
  { id: 'sheet', label: 'Sheet', detail: 'Laser and waterjet style flat stock.' },
];

const BASIC_TOOLPATH_ENVIRONMENTS: ProgrammingEnvironmentOption[] = [
  {
    id: 'basic-mill',
    mode: 'mill',
    label: 'Basic Toolpaths',
    vendor: 'Foundation Library',
    kind: 'manual',
    badge: 'Core Ops',
    summary: 'Core milling operations that should always be available even before choosing a brand-specific CAM workflow.',
    toolpaths: [
      { id: 'basic-face-mill', label: 'Face Mill', path: 'Basic > Mill > Face', summary: 'Simple facing passes for top-of-stock cleanup and datum prep.', operationId: 'face_milling' },
      { id: 'basic-pocket-mill', label: 'Pocket Mill', path: 'Basic > Mill > Pocket', summary: 'General 2.5D pocket clearing for rectangular and circular cavities.', operationId: 'pocket_milling' },
      { id: 'basic-profile-mill', label: 'Profile Mill', path: 'Basic > Mill > Profile', summary: 'Perimeter contouring and edge definition around the part boundary.', operationId: 'shoulder_milling' },
      { id: 'basic-slot-mill', label: 'Slot Mill', path: 'Basic > Mill > Slot', summary: 'Straight slotting and keyway-style full-width engagement.', operationId: 'slot_milling' },
      { id: 'basic-finish-mill', label: 'Finish Pass', path: 'Basic > Mill > Finish', summary: 'Low-engagement finishing pass for wall cleanup and floor refinement.', operationId: 'finishing' },
      { id: 'basic-drill-mill', label: 'Drill', path: 'Basic > Mill > Drill', summary: 'Basic drilling cycle selection for holes and spot-drill sequencing.', operationId: 'drilling' },
    ],
  },
  {
    id: 'basic-lathe',
    mode: 'lathe',
    label: 'Basic Toolpaths',
    vendor: 'Foundation Library',
    kind: 'manual',
    badge: 'Core Ops',
    summary: 'Core turning operations that stay available without committing to a specific CAM or control brand.',
    toolpaths: [
      { id: 'basic-face-turn', label: 'Face + Turn', path: 'Basic > Lathe > Face + Turn', summary: 'Face the part then establish the first OD passes with a simple rough/finish flow.', operationId: 'turning_rough' },
      { id: 'basic-od-finish', label: 'OD Finish', path: 'Basic > Lathe > OD Finish', summary: 'Finish contouring for standard OD work and shoulder cleanup.', operationId: 'turning_finish' },
      { id: 'basic-groove', label: 'Groove', path: 'Basic > Lathe > Groove', summary: 'Straight grooving and cutoff preparation for retaining-ring or part-off features.', operationId: 'grooving' },
      { id: 'basic-thread', label: 'Thread Turn', path: 'Basic > Lathe > Thread', summary: 'Single-point thread planning for common OD and ID thread forms.', operationId: 'turning_finish' },
      { id: 'basic-bore', label: 'Bore', path: 'Basic > Lathe > Bore', summary: 'Centerline drilling and boring for ID features and internal shoulders.', operationId: 'boring' },
    ],
  },
  {
    id: 'basic-edm',
    mode: 'edm',
    label: 'Basic Toolpaths',
    vendor: 'Foundation Library',
    kind: 'manual',
    badge: 'Core Ops',
    summary: 'Simple sinker EDM burn patterns covering roughing, orbit finish, and detail cleanup.',
    toolpaths: [
      { id: 'basic-burn-rough', label: 'Cavity Rough Burn', path: 'Basic > EDM > Rough Burn', summary: 'Primary stock-removal burn plan for the first cavity pass.', operationId: 'burn_roughing' },
      { id: 'basic-burn-finish', label: 'Orbit Finish Burn', path: 'Basic > EDM > Finish Burn', summary: 'Orbit-style finishing pass to bring size and surface closer to target.', operationId: 'burn_finishing' },
      { id: 'basic-burn-detail', label: 'Detail Burn', path: 'Basic > EDM > Detail Burn', summary: 'Small-feature or corner-detail cleanup with a dedicated electrode intent.', operationId: 'burn_finishing' },
    ],
  },
  {
    id: 'basic-wire',
    mode: 'wire_edm',
    label: 'Basic Toolpaths',
    vendor: 'Foundation Library',
    kind: 'manual',
    badge: 'Core Ops',
    summary: 'Base wire EDM operations for profile, taper, skim, and tab-controlled release work.',
    toolpaths: [
      { id: 'basic-wire-profile', label: 'Profile Cut', path: 'Basic > Wire > Profile', summary: 'Standard 2-axis profile cut for through features and contour work.', operationId: 'wire_profile' },
      { id: 'basic-wire-taper', label: 'Taper Cut', path: 'Basic > Wire > Taper', summary: 'Taper-capable profile cut with ruled-wall control.', operationId: 'wire_profile' },
      { id: 'basic-wire-skim', label: 'Skim Passes', path: 'Basic > Wire > Skim', summary: 'Finish-pass ladder for size control and edge quality.', operationId: 'wire_skims' },
      { id: 'basic-wire-tab', label: 'Slug / Tab Control', path: 'Basic > Wire > Tab', summary: 'Slug retention and release planning for safe contour completion.', operationId: 'wire_profile' },
    ],
  },
  {
    id: 'basic-laser',
    mode: 'laser',
    label: 'Basic Toolpaths',
    vendor: 'Foundation Library',
    kind: 'manual',
    badge: 'Core Ops',
    summary: 'Base laser operations for contour cutting, hole arrays, etching, and common edge cleanup.',
    toolpaths: [
      { id: 'basic-laser-contour', label: 'Contour Cut', path: 'Basic > Laser > Contour', summary: 'General perimeter cutting for simple sheet profiles.', operationId: 'laser_cut' },
      { id: 'basic-laser-array', label: 'Hole Array Cut', path: 'Basic > Laser > Hole Array', summary: 'Repeated hole and slot arrays for production sheet layouts.', operationId: 'laser_cut' },
      { id: 'basic-laser-quality', label: 'Edge Cleanup', path: 'Basic > Laser > Edge Cleanup', summary: 'Quality-focused pass settings for cleaner cut faces.', operationId: 'laser_edge' },
      { id: 'basic-laser-mark', label: 'Mark / Etch', path: 'Basic > Laser > Mark', summary: 'Low-energy marking or etching path for part identification.', operationId: 'laser_edge' },
    ],
  },
  {
    id: 'basic-waterjet',
    mode: 'waterjet',
    label: 'Basic Toolpaths',
    vendor: 'Foundation Library',
    kind: 'manual',
    badge: 'Core Ops',
    summary: 'Base waterjet operations for profile, taper, pierce, and remnant-friendly cutting.',
    toolpaths: [
      { id: 'basic-wj-contour', label: 'Contour Cut', path: 'Basic > Waterjet > Contour', summary: 'Straight abrasive contour cut for standard plate and sheet work.', operationId: 'abrasive_cut' },
      { id: 'basic-wj-pierce', label: 'Pierce Strategy', path: 'Basic > Waterjet > Pierce', summary: 'Basic pierce-first path planning for fragile or thick material.', operationId: 'abrasive_cut' },
      { id: 'basic-wj-taper', label: 'Taper Compensation', path: 'Basic > Waterjet > Taper', summary: 'Simple taper-control posture for straighter cut walls.', operationId: 'taper_control' },
      { id: 'basic-wj-remnant', label: 'Remnant Cut', path: 'Basic > Waterjet > Remnant', summary: 'Conservative remnant sequencing to keep leftover stock useful.', operationId: 'abrasive_cut' },
    ],
  },
];

const CONVERSATIONAL_PROGRAMMING_ENVIRONMENTS: ProgrammingEnvironmentOption[] = [
  {
    id: 'conversational-mill',
    mode: 'mill',
    label: 'Conversational Programming',
    vendor: 'Control-native',
    kind: 'manual',
    badge: 'Conversational',
    summary: 'Control-side conversational milling cycles in the style of Haas VPS, Siemens ShopMill, and Hurco WinMax workflows.',
    toolpaths: [
      { id: 'conv-mill-face', label: 'Face Cycle', path: 'Conversational > Mill > Face Cycle', summary: 'Wizard-style facing cycle with stock allowance and overlap controls.', operationId: 'face_milling' },
      { id: 'conv-mill-pocket', label: 'Pocket Cycle', path: 'Conversational > Mill > Pocket Cycle', summary: 'Conversational pocketing with island, finish stock, and entry prompts.', operationId: 'pocket_milling' },
      { id: 'conv-mill-profile', label: 'Profile Cycle', path: 'Conversational > Mill > Profile Cycle', summary: 'Profile contour cycle with lead-in, finish pass, and spring-cut options.', operationId: 'shoulder_milling' },
      { id: 'conv-mill-slot', label: 'Slot Cycle', path: 'Conversational > Mill > Slot Cycle', summary: 'Simple slot and keyway cycle driven from width, depth, and pitch prompts.', operationId: 'slot_milling' },
      { id: 'conv-mill-bolt', label: 'Bolt Circle Drill', path: 'Conversational > Mill > Bolt Circle', summary: 'Pattern-based conversational drilling for circular bolt-hole arrays.', operationId: 'drilling' },
      { id: 'conv-mill-engrave', label: 'Engrave / Mark', path: 'Conversational > Mill > Engrave', summary: 'Control-native engraving path for labels, serials, and datum marks.', operationId: 'finishing' },
    ],
  },
  {
    id: 'conversational-lathe',
    mode: 'lathe',
    label: 'Conversational Programming',
    vendor: 'Control-native',
    kind: 'manual',
    badge: 'Conversational',
    summary: 'Conversational turning cycles modeled after Mazatrol, Okuma IGF, and Fanuc Manual Guide style workflows.',
    toolpaths: [
      { id: 'conv-lathe-face-od', label: 'Face + OD Cycle', path: 'Conversational > Lathe > Face + OD', summary: 'Combined face and OD turning wizard for fast first-part setup.', operationId: 'turning_rough' },
      { id: 'conv-lathe-finish', label: 'Finish Profile Cycle', path: 'Conversational > Lathe > Finish Profile', summary: 'Control-driven finish contour cycle with spring pass and taper prompts.', operationId: 'turning_finish' },
      { id: 'conv-lathe-groove', label: 'Groove Cycle', path: 'Conversational > Lathe > Groove', summary: 'Width-first groove wizard with dwell and chip-break options.', operationId: 'grooving' },
      { id: 'conv-lathe-thread', label: 'Thread Cycle', path: 'Conversational > Lathe > Thread', summary: 'Thread wizard for pitch, pass depth, pullout, and infeed pattern.', operationId: 'turning_finish' },
      { id: 'conv-lathe-bore', label: 'Drill / Bore Cycle', path: 'Conversational > Lathe > Drill / Bore', summary: 'Centerline drilling and boring wizard driven from depth and diameter prompts.', operationId: 'boring' },
      { id: 'conv-lathe-cutoff', label: 'Part-Off Cycle', path: 'Conversational > Lathe > Part-Off', summary: 'Cutoff and handoff cycle with dwell and breakoff planning.', operationId: 'grooving' },
    ],
  },
  {
    id: 'conversational-edm',
    mode: 'edm',
    label: 'Conversational Programming',
    vendor: 'Control-native',
    kind: 'manual',
    badge: 'Conversational',
    summary: 'Conversational sinker EDM burn patterns for roughing, orbit finishing, and electrode wear compensation.',
    toolpaths: [
      { id: 'conv-edm-rough', label: 'Cavity Rough Wizard', path: 'Conversational > EDM > Cavity Rough', summary: 'Wizard-driven rough burn with spark gap and flushing prompts.', operationId: 'burn_roughing' },
      { id: 'conv-edm-orbit', label: 'Orbit Finish Wizard', path: 'Conversational > EDM > Orbit Finish', summary: 'Conversational orbit finish path with wear offset and finish grade controls.', operationId: 'burn_finishing' },
      { id: 'conv-edm-wear', label: 'Wear Compensation Wizard', path: 'Conversational > EDM > Wear Compensation', summary: 'Electrode wear-offset planning for repeat cavity burns.', operationId: 'burn_finishing' },
    ],
  },
  {
    id: 'conversational-wire',
    mode: 'wire_edm',
    label: 'Conversational Programming',
    vendor: 'Control-native',
    kind: 'manual',
    badge: 'Conversational',
    summary: 'Control-native wire EDM dialogs for profile, taper, skim, and slug-retention work.',
    toolpaths: [
      { id: 'conv-wire-profile', label: 'Profile Wizard', path: 'Conversational > Wire > Profile', summary: 'Wizard-driven 2-axis contour cut based on feature geometry prompts.', operationId: 'wire_profile' },
      { id: 'conv-wire-taper', label: 'Taper Wizard', path: 'Conversational > Wire > Taper', summary: 'Conversational taper routine with UV-offset and wall-angle prompts.', operationId: 'wire_profile' },
      { id: 'conv-wire-skim', label: 'Skim Wizard', path: 'Conversational > Wire > Skim', summary: 'Finish skim-pass ladder driven from tolerance and finish target prompts.', operationId: 'wire_skims' },
      { id: 'conv-wire-slug', label: 'Slug Hold Wizard', path: 'Conversational > Wire > Slug Hold', summary: 'Slug and tab strategy prompts for safe release and contour completion.', operationId: 'wire_profile' },
    ],
  },
  {
    id: 'conversational-laser',
    mode: 'laser',
    label: 'Conversational Programming',
    vendor: 'Control-native',
    kind: 'manual',
    badge: 'Conversational',
    summary: 'Conversational laser cutting routines for profiles, arrays, marking, and common-line batch work.',
    toolpaths: [
      { id: 'conv-laser-profile', label: 'Profile Wizard', path: 'Conversational > Laser > Profile', summary: 'Profile cut wizard driven from geometry, assist gas, and thickness prompts.', operationId: 'laser_cut' },
      { id: 'conv-laser-array', label: 'Array Wizard', path: 'Conversational > Laser > Hole Array', summary: 'Repeated hole and slot array wizard for quick production layouts.', operationId: 'laser_cut' },
      { id: 'conv-laser-commonline', label: 'Common-Line Wizard', path: 'Conversational > Laser > Common Line', summary: 'Conversational batch-cut wizard for shared edges and throughput.', operationId: 'laser_cut' },
      { id: 'conv-laser-mark', label: 'Marking Wizard', path: 'Conversational > Laser > Mark', summary: 'Simple conversational marking pass for IDs, bend marks, and setup references.', operationId: 'laser_edge' },
    ],
  },
  {
    id: 'conversational-waterjet',
    mode: 'waterjet',
    label: 'Conversational Programming',
    vendor: 'Control-native',
    kind: 'manual',
    badge: 'Conversational',
    summary: 'Conversational waterjet routines for contouring, taper compensation, pierce control, and remnant layouts.',
    toolpaths: [
      { id: 'conv-wj-profile', label: 'Contour Wizard', path: 'Conversational > Waterjet > Contour', summary: 'Wizard-style contour cut based on thickness, kerf, and finish prompts.', operationId: 'abrasive_cut' },
      { id: 'conv-wj-pierce', label: 'Pierce Wizard', path: 'Conversational > Waterjet > Pierce', summary: 'Pierce routine planner for brittle, layered, or thick stock.', operationId: 'abrasive_cut' },
      { id: 'conv-wj-taper', label: 'Taper Wizard', path: 'Conversational > Waterjet > Taper', summary: 'Conversational taper compensation for straighter walls and cleaner corners.', operationId: 'taper_control' },
      { id: 'conv-wj-remnant', label: 'Remnant Layout Wizard', path: 'Conversational > Waterjet > Remnant Layout', summary: 'Control-side remnant layout wizard for nested reuse and cut order safety.', operationId: 'abrasive_cut' },
    ],
  },
];

const PRISM_NOVEL_PROGRAMMING_ENVIRONMENTS: ProgrammingEnvironmentOption[] = [
  {
    id: 'prism-mill',
    mode: 'mill',
    label: 'PRISM Adaptive',
    vendor: 'PRISM',
    kind: 'cam',
    badge: 'Novel Strategies',
    summary: 'PRISM-native milling strategies that blend feature intent, recovery planning, and aggressive adaptive motion.',
    toolpaths: [
      { id: 'prism-featureflow-rough', label: 'FeatureFlow Adaptive Roughing', path: 'PRISM > Mill > FeatureFlow Adaptive Roughing', summary: 'Intent-aware adaptive roughing that sequences pockets and walls from feature priority.', operationId: 'roughing' },
      { id: 'prism-rest-stitch-pocket', label: 'Rest-Stitch Pocketing', path: 'PRISM > Mill > Rest-Stitch Pocketing', summary: 'Pocket strategy that reconnects leftover regions instead of restarting full clearing loops.', operationId: 'pocket_milling' },
      { id: 'prism-thermalguard-profile', label: 'ThermalGuard Profile', path: 'PRISM > Mill > ThermalGuard Profile', summary: 'Contour strategy that spaces edge engagement to reduce heat drift on thin walls.', operationId: 'shoulder_milling' },
      { id: 'prism-surfaceweave-finish', label: 'SurfaceWeave Finish', path: 'PRISM > Mill > SurfaceWeave Finish', summary: 'Hybrid finish pass that blends raster, flowline, and rest cleanup into one surface lane.', operationId: 'finishing' },
      { id: 'prism-probe-recover', label: 'Probe-Guided Recovery', path: 'PRISM > Mill > Probe-Guided Recovery', summary: 'Recovery toolpath that re-enters from measured stock deviation instead of assuming nominal.', operationId: 'finishing' },
      { id: 'prism-drill-cluster', label: 'Drill Cluster Sequencer', path: 'PRISM > Mill > Drill Cluster Sequencer', summary: 'Groups drilling features by tool, orientation, and retraction stability.', operationId: 'drilling' },
    ],
  },
  {
    id: 'prism-lathe',
    mode: 'lathe',
    label: 'PRISM Adaptive',
    vendor: 'PRISM',
    kind: 'cam',
    badge: 'Novel Strategies',
    summary: 'PRISM-native turning strategies that emphasize synchronization, chip control, and first-pass recovery logic.',
    toolpaths: [
      { id: 'prism-syncguard-rough', label: 'SyncGuard Rough Turn', path: 'PRISM > Lathe > SyncGuard Rough Turn', summary: 'Rough turning tuned to keep spindle, turret, and live-tool readiness in sync.', operationId: 'turning_rough' },
      { id: 'prism-wave-finish', label: 'Wave Finish Turn', path: 'PRISM > Lathe > Wave Finish Turn', summary: 'Finish turning strategy that smooths chip load and blends shoulder transitions.', operationId: 'turning_finish' },
      { id: 'prism-chipbreak-groove', label: 'Chip-Break Groove', path: 'PRISM > Lathe > Chip-Break Groove', summary: 'Grooving strategy with deliberate interrupt cadence for better chip evacuation.', operationId: 'grooving' },
      { id: 'prism-thread-recover', label: 'Thread Recovery Pass', path: 'PRISM > Lathe > Thread Recovery', summary: 'Threading routine that preserves pass context after interrupted prove-out or insert wear.', operationId: 'turning_finish' },
      { id: 'prism-centerline-bore', label: 'Centerline Bore Stabilizer', path: 'PRISM > Lathe > Centerline Bore Stabilizer', summary: 'Boring strategy that eases into ID work to protect slender bars and small diameters.', operationId: 'boring' },
      { id: 'prism-live-handshake', label: 'Live-Tool Handshake', path: 'PRISM > Lathe > Live-Tool Handshake', summary: 'Mill-turn handoff routine coordinating spindle orientation, live-tool entry, and cut order.', operationId: 'turning_finish' },
    ],
  },
  {
    id: 'prism-edm',
    mode: 'edm',
    label: 'PRISM Adaptive',
    vendor: 'PRISM',
    kind: 'cam',
    badge: 'Novel Strategies',
    summary: 'PRISM-native EDM strategies focused on wear mapping, flushing intelligence, and cavity rescue flows.',
    toolpaths: [
      { id: 'prism-edm-flushrough', label: 'Flush-Aware Rough Burn', path: 'PRISM > EDM > Flush-Aware Rough Burn', summary: 'Rough burn that changes step-down posture around expected debris bottlenecks.', operationId: 'burn_roughing' },
      { id: 'prism-edm-orbitweave', label: 'OrbitWeave Finish', path: 'PRISM > EDM > OrbitWeave Finish', summary: 'Orbit finishing path that blends wear, finish, and edge fidelity goals.', operationId: 'burn_finishing' },
      { id: 'prism-edm-wearmap', label: 'Electrode Wear Map', path: 'PRISM > EDM > Electrode Wear Map', summary: 'Adaptive wear-compensation path based on burn stage and electrode condition.', operationId: 'burn_finishing' },
      { id: 'prism-edm-ribrescue', label: 'Rib Rescue Detail Burn', path: 'PRISM > EDM > Rib Rescue', summary: 'Detail-burn recovery path for narrow ribs and corner cleanup after primary finishing.', operationId: 'burn_finishing' },
    ],
  },
  {
    id: 'prism-wire',
    mode: 'wire_edm',
    label: 'PRISM Adaptive',
    vendor: 'PRISM',
    kind: 'cam',
    badge: 'Novel Strategies',
    summary: 'PRISM-native wire EDM strategies for slug retention, tapered accuracy, and skim-pass recovery.',
    toolpaths: [
      { id: 'prism-wire-slugsafe', label: 'SlugSafe Contour', path: 'PRISM > Wire > SlugSafe Contour', summary: 'Profile path that stages tab release around part mass and exit stability.', operationId: 'wire_profile' },
      { id: 'prism-wire-taperguard', label: 'TaperGuard Profile', path: 'PRISM > Wire > TaperGuard Profile', summary: 'Taper profile path with wall-angle stability prioritized through corners and breakouts.', operationId: 'wire_profile' },
      { id: 'prism-wire-skimladder', label: 'Adaptive Skim Ladder', path: 'PRISM > Wire > Adaptive Skim Ladder', summary: 'Variable skim schedule that preserves cycle time while holding finish on critical walls.', operationId: 'wire_skims' },
      { id: 'prism-wire-release', label: 'Release Planner', path: 'PRISM > Wire > Release Planner', summary: 'Cut completion strategy that coordinates slug bridges, stops, and final release order.', operationId: 'wire_profile' },
    ],
  },
  {
    id: 'prism-laser',
    mode: 'laser',
    label: 'PRISM Adaptive',
    vendor: 'PRISM',
    kind: 'nesting',
    badge: 'Novel Strategies',
    summary: 'PRISM-native laser strategies for heat management, nesting throughput, and edge-quality balancing.',
    toolpaths: [
      { id: 'prism-laser-heatsmart', label: 'Heat-Smart Contour', path: 'PRISM > Laser > Heat-Smart Contour', summary: 'Contour cut that spaces thermal load around thin webs and clustered features.', operationId: 'laser_cut' },
      { id: 'prism-laser-nestflow', label: 'NestFlow Common-Line', path: 'PRISM > Laser > NestFlow Common-Line', summary: 'Throughput-biased shared-edge cutting for dense production nests.', operationId: 'laser_cut' },
      { id: 'prism-laser-edgecal', label: 'EdgeCal Finish', path: 'PRISM > Laser > EdgeCal Finish', summary: 'Edge-quality path tuned to slow selectively around visible or sealing surfaces.', operationId: 'laser_edge' },
      { id: 'prism-laser-tracemark', label: 'Trace Mark', path: 'PRISM > Laser > Trace Mark', summary: 'Low-energy trace and mark pass coordinated with the main cut sequence.', operationId: 'laser_edge' },
    ],
  },
  {
    id: 'prism-waterjet',
    mode: 'waterjet',
    label: 'PRISM Adaptive',
    vendor: 'PRISM',
    kind: 'nesting',
    badge: 'Novel Strategies',
    summary: 'PRISM-native waterjet strategies for pierce protection, taper locking, and remnant-aware sequencing.',
    toolpaths: [
      { id: 'prism-wj-pierceguard', label: 'PierceGuard Contour', path: 'PRISM > Waterjet > PierceGuard Contour', summary: 'Contour cut that stages low-risk pierce entry before committing to the full profile.', operationId: 'abrasive_cut' },
      { id: 'prism-wj-qualityladder', label: 'Quality Ladder', path: 'PRISM > Waterjet > Quality Ladder', summary: 'Adaptive quality-level changes along the same path for visible and hidden surfaces.', operationId: 'abrasive_cut' },
      { id: 'prism-wj-taperlock', label: 'Dynamic Taper Lock', path: 'PRISM > Waterjet > Dynamic Taper Lock', summary: 'Taper-control pass that prioritizes straightness around walls, tabs, and corners.', operationId: 'taper_control' },
      { id: 'prism-wj-remnantsync', label: 'Remnant Sync', path: 'PRISM > Waterjet > Remnant Sync', summary: 'Remnant-aware cut ordering that keeps valuable offcuts stable and reusable.', operationId: 'abrasive_cut' },
    ],
  },
];

export const PROGRAMMING_ENVIRONMENTS: ProgrammingEnvironmentOption[] = [
  {
    id: 'mastercam-mill',
    mode: 'mill',
    label: 'Mastercam',
    vendor: 'CNC Software',
    kind: 'cam',
    badge: 'Production CAM',
    summary: 'Use the exact Mastercam toolpath name so the calculator can match the process rhythm you are actually programming.',
    toolpaths: [
      { id: 'mc-dynamic-mill', label: 'Dynamic Mill', path: 'Mill Toolpaths > Dynamic Motion > Dynamic Mill', summary: 'Constant-engagement roughing for deep or enclosed pockets.', operationId: 'roughing' },
      { id: 'mc-pocket', label: '2D Pocket', path: 'Mill Toolpaths > 2D > Pocket', summary: 'Classic 2.5D pocket clearing for shallow or straightforward features.', operationId: 'pocket_milling' },
      { id: 'mc-contour', label: '2D Contour', path: 'Mill Toolpaths > 2D > Contour', summary: 'Perimeter/profile cutting with finish allowances and lead control.', operationId: 'shoulder_milling' },
      { id: 'mc-slot', label: 'Slot Mill', path: 'Mill Toolpaths > 2D > Slot Mill', summary: 'Slot-focused motion for channels and full-width engagement.', operationId: 'slot_milling' },
      { id: 'mc-optirough', label: 'OptiRough / Area Roughing', path: 'Mill Toolpaths > 3D > OptiRough / Area Roughing', summary: '3D volumetric roughing for cavities, molds, and sculpted stock.', operationId: 'roughing' },
      { id: 'mc-parallel', label: 'Surface Finish Parallel', path: 'Mill Toolpaths > 3D > Surface Finish Parallel', summary: 'Parallel finishing passes for floor or shallow surface refinement.', operationId: 'finishing' },
      { id: 'mc-flowline', label: 'Surface Finish Flowline', path: 'Mill Toolpaths > 3D > Surface Finish Flowline', summary: 'Surface-driven finishing that follows model flow and curvature.', operationId: 'finishing' },
      { id: 'mc-drill', label: 'Drill', path: 'Mill Toolpaths > Drill', summary: 'Holemaking with peck, chip-break, and multi-depth cycle control.', operationId: 'drilling' },
    ],
  },
  {
    id: 'hypermill-mill',
    mode: 'mill',
    label: 'hyperMILL',
    vendor: 'OPEN MIND',
    kind: 'cam',
    badge: 'Expert CAM',
    summary: 'hyperMILL-specific cycle names let the page reflect 2.5D, MAXX, and 5-axis strategy intent directly.',
    toolpaths: [
      { id: 'hm-pocket', label: 'Pocket Milling', path: '2.5D > Pocket Milling', summary: 'General 2.5D pocket work with contour-aware rest regions.', operationId: 'pocket_milling' },
      { id: 'hm-contour', label: 'Contour Milling', path: '2.5D > Contour Milling', summary: 'Wall and profile cutting with explicit stock and finish controls.', operationId: 'shoulder_milling' },
      { id: 'hm-optimized-rough', label: 'Optimized Roughing', path: '3D > Optimized Roughing', summary: 'Adaptive-style roughing for complex stock and stable engagement.', operationId: 'roughing' },
      { id: 'hm-zlevel', label: 'Z-Level Finishing', path: '3D > Z-Level Finishing', summary: 'Steep-wall finishing with constant-Z passes.', operationId: 'finishing' },
      { id: 'hm-maxx-rough', label: 'MAXX Roughing', path: 'MAXX Machining > Roughing', summary: 'Trochoidal high-efficiency roughing for hard materials and deep cuts.', operationId: 'roughing' },
      { id: 'hm-maxx-finish', label: 'MAXX Finishing', path: 'MAXX Machining > Finishing', summary: 'Barrel/lens-finishing style path for faster surface coverage.', operationId: 'finishing' },
      { id: 'hm-5x-swarf', label: '5X Swarf Milling', path: '5-Axis > Swarf Milling', summary: 'Flank-cutting ruled walls with tilt-aware multiaxis control.', operationId: 'finishing' },
      { id: 'hm-drilling', label: 'Drilling Package', path: 'Hole Machining > Drilling', summary: 'Cycle-driven drilling, pecking, and deep-hole process selection.', operationId: 'drilling' },
    ],
  },
  {
    id: 'fusion360-mill',
    mode: 'mill',
    label: 'Fusion 360',
    vendor: 'Autodesk',
    kind: 'cam',
    badge: 'Cloud CAM',
    summary: 'Fusion strategy names mirror what programmers see in Manufacture so the calculator can align with the chosen toolpath.',
    toolpaths: [
      { id: 'f360-2d-adaptive', label: '2D Adaptive Clearing', path: 'Manufacture > Milling > 2D > Adaptive Clearing', summary: 'Adaptive roughing for pockets and prismatic stock.', operationId: 'roughing' },
      { id: 'f360-2d-pocket', label: '2D Pocket', path: 'Manufacture > Milling > 2D > Pocket', summary: 'Standard pocketing with order and finish-pass control.', operationId: 'pocket_milling' },
      { id: 'f360-2d-contour', label: '2D Contour', path: 'Manufacture > Milling > 2D > Contour', summary: 'Profile finishing and sidewall cleanup.', operationId: 'shoulder_milling' },
      { id: 'f360-3d-adaptive', label: '3D Adaptive Clearing', path: 'Manufacture > Milling > 3D > Adaptive Clearing', summary: '3D roughing for contoured cavities and stock leftovers.', operationId: 'roughing' },
      { id: 'f360-parallel', label: 'Parallel', path: 'Manufacture > Milling > 3D > Parallel', summary: 'Linear finishing on broad surfaces.', operationId: 'finishing' },
      { id: 'f360-scallop', label: 'Scallop', path: 'Manufacture > Milling > 3D > Scallop', summary: 'Constant cusp finishing for blended curvature.', operationId: 'finishing' },
      { id: 'f360-flow', label: 'Flow', path: 'Manufacture > Milling > 3D > Flow', summary: 'Surface-following finish path with cleaner flowline control.', operationId: 'finishing' },
      { id: 'f360-swarf', label: 'Swarf', path: 'Manufacture > Milling > Multi-Axis > Swarf', summary: 'Simultaneous wall cutting on ruled geometry.', operationId: 'finishing' },
    ],
  },
  {
    id: 'nx-mill',
    mode: 'mill',
    label: 'NX CAM',
    vendor: 'Siemens',
    kind: 'cam',
    badge: 'Enterprise CAM',
    summary: 'NX toolpaths skew toward feature-rich production programming and large process plans.',
    toolpaths: [
      { id: 'nx-cavity', label: 'Cavity Mill', path: 'Operation Navigator > Milling > Roughing > Cavity Mill', summary: 'General roughing for prismatic cavities.', operationId: 'roughing' },
      { id: 'nx-floor-wall', label: 'Floor/Wall', path: 'Operation Navigator > Milling > Area Milling > Floor/Wall', summary: 'Floor and wall machining with separate finish control.', operationId: 'pocket_milling' },
      { id: 'nx-planar', label: 'Planar Mill', path: 'Operation Navigator > Milling > Finishing > Planar Mill', summary: 'Planar finishing on broad faces and floors.', operationId: 'finishing' },
      { id: 'nx-zlevel', label: 'Z-Level Profile', path: 'Operation Navigator > Milling > Finishing > Z-Level Profile', summary: 'Steep-wall and step-over finishing.', operationId: 'finishing' },
      { id: 'nx-streamline', label: 'Streamline', path: 'Operation Navigator > Milling > Surface > Streamline', summary: 'Surface-driven finish path with directional control.', operationId: 'finishing' },
      { id: 'nx-variable-contour', label: 'Variable Contour', path: 'Operation Navigator > Milling > Multi-Axis > Variable Contour', summary: 'Multi-axis contour path for shaped walls and transitions.', operationId: 'finishing' },
      { id: 'nx-swarf', label: 'Swarf', path: 'Operation Navigator > Milling > Multi-Axis > Swarf', summary: 'Ruled-surface flank cutting in simultaneous 5-axis.', operationId: 'finishing' },
      { id: 'nx-drilling', label: 'Hole Making', path: 'Operation Navigator > Hole Making', summary: 'Feature-based drilling, boring, and cycle selection.', operationId: 'drilling' },
    ],
  },
  {
    id: 'manual-mill',
    mode: 'mill',
    label: 'Manual Programming',
    vendor: 'Hand Code',
    kind: 'manual',
    badge: 'G-code',
    summary: 'Use this when you are hand-coding or verifying canned-cycle / contour assumptions before CAM.',
    toolpaths: [
      { id: 'manual-profile', label: 'Hand-coded profile', path: 'G01/G02/G03 contour block', summary: 'Straight and arc-profile motion for 2D contour work.', operationId: 'shoulder_milling' },
      { id: 'manual-pocket-helix', label: 'Helical pocket entry', path: 'Manual contour + helical interpolation', summary: 'Pocketing by helix and contour loops without a CAM-generated adaptive path.', operationId: 'pocket_milling' },
      { id: 'manual-drill', label: 'Canned drilling cycle', path: 'G81/G83/G84 cycle block', summary: 'Drilling, pecking, or tapping through standard canned cycles.', operationId: 'drilling' },
      { id: 'manual-face', label: 'Face milling pattern', path: 'Manual raster / zigzag facing', summary: 'Simple facing passes for setup stock cleanup.', operationId: 'face_milling' },
    ],
  },
  {
    id: 'mastercam-lathe',
    mode: 'lathe',
    label: 'Mastercam',
    vendor: 'CNC Software',
    kind: 'cam',
    badge: 'Turning CAM',
    summary: 'Lathe workflow names stay aligned with the actual operation family in Mastercam Lathe / Mill-Turn.',
    toolpaths: [
      { id: 'mc-lathe-rough', label: 'Lathe Rough', path: 'Lathe Toolpaths > Rough', summary: 'General OD/ID roughing with stock recognition.', operationId: 'turning_rough' },
      { id: 'mc-lathe-finish', label: 'Lathe Finish', path: 'Lathe Toolpaths > Finish', summary: 'Finish contouring and spring-pass style cleanups.', operationId: 'turning_finish' },
      { id: 'mc-lathe-groove', label: 'Lathe Groove', path: 'Lathe Toolpaths > Groove', summary: 'Grooving, recess, and parting-style toolpath family.', operationId: 'grooving' },
      { id: 'mc-lathe-thread', label: 'Lathe Thread', path: 'Lathe Toolpaths > Thread', summary: 'Single-point threading with pullout and pass control.', operationId: 'turning_finish' },
      { id: 'mc-lathe-drill', label: 'Centerline Drill/Bore', path: 'Lathe Toolpaths > Drill/Bore', summary: 'Centerline drilling and boring operations from the turret.', operationId: 'boring' },
      { id: 'mc-lathe-cutoff', label: 'Lathe Cutoff', path: 'Lathe Toolpaths > Cutoff', summary: 'Part-off and separation path planning.', operationId: 'grooving' },
      { id: 'mc-lathe-live', label: 'C/Y Live Tooling', path: 'Mill-Turn Toolpaths > C/Y Milling', summary: 'Driven-tool milling on Y-axis or C-axis-capable lathes.', operationId: 'turning_finish' },
    ],
  },
  {
    id: 'esprit-lathe',
    mode: 'lathe',
    label: 'ESPRIT',
    vendor: 'Hexagon',
    kind: 'cam',
    badge: 'Mill-Turn / Swiss',
    summary: 'ESPRIT is especially useful when the turning workflow crosses into Swiss or synchronized mill-turn work.',
    toolpaths: [
      { id: 'esprit-profitturn-rough', label: 'ProfitTurning Rough', path: 'Turning > ProfitTurning > Rough', summary: 'Efficient rough turning with load-aware motion.', operationId: 'turning_rough' },
      { id: 'esprit-profitturn-finish', label: 'ProfitTurning Finish', path: 'Turning > ProfitTurning > Finish', summary: 'Finishing path with better entry/exit and surface control.', operationId: 'turning_finish' },
      { id: 'esprit-groove', label: 'Groove / Cutoff', path: 'Turning > Groove / Cutoff', summary: 'Grooving and part-off style operations from the turret.', operationId: 'grooving' },
      { id: 'esprit-thread', label: 'Thread Turning', path: 'Turning > Thread', summary: 'Single-point threading for OD/ID features.', operationId: 'turning_finish' },
      { id: 'esprit-swiss-sync', label: 'Swiss Sync', path: 'Swiss > Synchronization', summary: 'Swiss pickoff, guide-bushing, and synchronized channel planning.', operationId: 'turning_rough' },
      { id: 'esprit-live-tool', label: 'Mill-Turn Live Milling', path: 'Mill-Turn > Live Tooling', summary: 'Driven-tool milling, drilling, and cross operations from the lathe.', operationId: 'turning_finish' },
    ],
  },
  {
    id: 'gibbscam-lathe',
    mode: 'lathe',
    label: 'GibbsCAM',
    vendor: 'CAMBRIO',
    kind: 'cam',
    badge: 'Production Turning',
    summary: 'GibbsCAM keeps the turning flow compact and production-focused, especially for multi-channel work.',
    toolpaths: [
      { id: 'gibbs-rough', label: 'Turning Rough', path: 'Operations > Turning > Rough', summary: 'Primary rough turning with stock and retract control.', operationId: 'turning_rough' },
      { id: 'gibbs-finish', label: 'Turning Finish', path: 'Operations > Turning > Finish', summary: 'Finish contouring for OD/ID geometry.', operationId: 'turning_finish' },
      { id: 'gibbs-groove', label: 'Groove', path: 'Operations > Turning > Groove', summary: 'Grooving and cutoff-style lathe motion.', operationId: 'grooving' },
      { id: 'gibbs-thread', label: 'Thread', path: 'Operations > Turning > Thread', summary: 'Thread passes with insert geometry-aware settings.', operationId: 'turning_finish' },
      { id: 'gibbs-millturn', label: 'Mill/Turn Sync', path: 'Operations > Mill/Turn > Sync Manager', summary: 'Synchronizes live-tooling and spindle events across channels.', operationId: 'turning_finish' },
    ],
  },
  {
    id: 'manual-lathe',
    mode: 'lathe',
    label: 'Manual Programming',
    vendor: 'Hand Code',
    kind: 'manual',
    badge: 'G-code',
    summary: 'Best for hand-coded cycles, lathe training, or proving out turret logic before CAM output.',
    toolpaths: [
      { id: 'manual-g71', label: 'G71 roughing cycle', path: 'Manual turning > G71', summary: 'Stock-removal roughing cycle for OD/ID contouring.', operationId: 'turning_rough' },
      { id: 'manual-g70', label: 'G70 finish cycle', path: 'Manual turning > G70', summary: 'Finishing cycle using the roughing profile blocks.', operationId: 'turning_finish' },
      { id: 'manual-g76', label: 'G76 threading cycle', path: 'Manual turning > G76', summary: 'Multi-pass threading cycle with infeed and pullout control.', operationId: 'turning_finish' },
      { id: 'manual-g75', label: 'G75 groove / peck cycle', path: 'Manual turning > G75', summary: 'Peck grooving or cutoff-style canned cycle.', operationId: 'grooving' },
      { id: 'manual-centerline', label: 'Centerline drill / bore', path: 'Manual turning > G74/G83 style centerline work', summary: 'Hand-coded centerline drilling or boring from the turret.', operationId: 'boring' },
    ],
  },
  {
    id: 'mastercam-wire',
    mode: 'wire_edm',
    label: 'Mastercam Wire',
    vendor: 'CNC Software',
    kind: 'cam',
    badge: 'Wire CAM',
    summary: 'Pick the exact wire operation family so skim-pass and taper assumptions stay aligned.',
    toolpaths: [
      { id: 'mc-wire-2axis', label: '2-Axis Contour', path: 'Wire > 2-Axis', summary: 'Standard profile cutting in XY with skim-pass follow-up.', operationId: 'wire_profile' },
      { id: 'mc-wire-4axis', label: '4-Axis Taper', path: 'Wire > 4-Axis', summary: 'Tapered or ruled contour cutting with UV control.', operationId: 'wire_profile' },
      { id: 'mc-wire-skim', label: 'Skim Passes', path: 'Wire > Skim Passes', summary: 'Finish-pass scheduling for edge quality and size control.', operationId: 'wire_skims' },
      { id: 'mc-wire-tab', label: 'Tab / Slug Retention', path: 'Wire > Tabs / Stop Moves', summary: 'Slug and tab management for safe contour release.', operationId: 'wire_profile' },
    ],
  },
  {
    id: 'esprit-wire',
    mode: 'wire_edm',
    label: 'ESPRIT EDM',
    vendor: 'Hexagon',
    kind: 'cam',
    badge: 'Wire CAM',
    summary: 'Useful for wire workflows with taper, multi-skim, and detailed contour-control options.',
    toolpaths: [
      { id: 'esprit-wire-profile', label: 'Wire Profile', path: 'EDM > Wire > Profile', summary: 'Primary profile cutting path for standard wire work.', operationId: 'wire_profile' },
      { id: 'esprit-wire-taper', label: 'Taper Cut', path: 'EDM > Wire > Taper', summary: '4-axis taper or ruled-wall wire cutting.', operationId: 'wire_profile' },
      { id: 'esprit-wire-skim', label: 'Multi-Skim Finish', path: 'EDM > Wire > Finish / Skim', summary: 'Multi-skim finish scheduling for size and finish.', operationId: 'wire_skims' },
      { id: 'esprit-wire-tab', label: 'Glue Stop / Tab', path: 'EDM > Wire > Slug / Tab Control', summary: 'Slug retention, stop moves, and release logic.', operationId: 'wire_profile' },
    ],
  },
  {
    id: 'manual-wire',
    mode: 'wire_edm',
    label: 'Manual Programming',
    vendor: 'Setup Sheet',
    kind: 'manual',
    badge: 'Process Plan',
    summary: 'Use this when you are manually staging wire class, skim count, and slug strategy before output.',
    toolpaths: [
      { id: 'manual-wire-profile', label: 'Profile cut plan', path: 'Wire setup > 2-axis profile', summary: 'Manual planning for contour class, offsets, and stops.', operationId: 'wire_profile' },
      { id: 'manual-wire-taper', label: 'Taper cut plan', path: 'Wire setup > 4-axis taper', summary: 'Manual definition of UV/taper intent before programming.', operationId: 'wire_profile' },
      { id: 'manual-wire-skim', label: 'Skim schedule', path: 'Wire setup > Skim-pass schedule', summary: 'Manual skim-count and finish sequence planning.', operationId: 'wire_skims' },
    ],
  },
  {
    id: 'nx-edm',
    mode: 'edm',
    label: 'NX CAM',
    vendor: 'Siemens',
    kind: 'cam',
    badge: 'EDM CAM',
    summary: 'Sinker EDM planning stays focused on burn intent, orbiting, and electrode compensation.',
    toolpaths: [
      { id: 'nx-cavity-burn', label: 'Cavity Burn', path: 'EDM > Cavity Burn', summary: 'Primary cavity burn planning for rough or finish passes.', operationId: 'burn_roughing' },
      { id: 'nx-orbit-finish', label: 'Orbit Finish', path: 'EDM > Orbit / Finish Burn', summary: 'Orbit-style finishing for size and surface refinement.', operationId: 'burn_finishing' },
      { id: 'nx-rib-burn', label: 'Rib / Detail Burn', path: 'EDM > Rib / Detail', summary: 'Narrow-feature or rib-focused electrode pathing.', operationId: 'burn_finishing' },
    ],
  },
  {
    id: 'manual-edm',
    mode: 'edm',
    label: 'Manual Programming',
    vendor: 'Process Plan',
    kind: 'manual',
    badge: 'Burn Plan',
    summary: 'Best for electrode, flushing, and burn-sequence planning before pushing into EDM-specific output.',
    toolpaths: [
      { id: 'manual-burn-rough', label: 'Rough burn schedule', path: 'EDM setup > Rough burn', summary: 'Manual planning for primary stock-removal burns.', operationId: 'burn_roughing' },
      { id: 'manual-burn-finish', label: 'Finish burn schedule', path: 'EDM setup > Finish burn', summary: 'Manual finish-pass and orbit plan definition.', operationId: 'burn_finishing' },
      { id: 'manual-electrode-wear', label: 'Electrode wear compensation', path: 'EDM setup > Electrode wear offsets', summary: 'Manual wear-offset and redress planning.', operationId: 'burn_finishing' },
    ],
  },
  {
    id: 'bysoft-laser',
    mode: 'laser',
    label: 'BySoft',
    vendor: 'Bystronic',
    kind: 'nesting',
    badge: 'Laser CAM',
    summary: 'BySoft focuses the flow on nesting, lead behavior, and cut-quality choices for laser work.',
    toolpaths: [
      { id: 'bysoft-contour', label: 'Contour cut', path: 'BySoft > Cut > Contour', summary: 'Standard perimeter cutting with lead and cut-condition control.', operationId: 'laser_cut' },
      { id: 'bysoft-common-line', label: 'Common-line cutting', path: 'BySoft > Cut > Common Line', summary: 'Shared-edge nesting cuts for sheet efficiency.', operationId: 'laser_cut' },
      { id: 'bysoft-microtab', label: 'Microtab / tab hold', path: 'BySoft > Cut > Microtabs', summary: 'Part retention for small nested components.', operationId: 'laser_edge' },
      { id: 'bysoft-edge', label: 'Edge-quality pass', path: 'BySoft > Cut > Quality / Finish', summary: 'Quality-biased cut conditions for cleaner edges.', operationId: 'laser_edge' },
    ],
  },
  {
    id: 'trutops-laser',
    mode: 'laser',
    label: 'TruTops Boost',
    vendor: 'TRUMPF',
    kind: 'nesting',
    badge: 'Laser CAM',
    summary: 'TruTops names reflect pierce, flyline, and quality-oriented laser decisions directly.',
    toolpaths: [
      { id: 'trutops-contour', label: 'Contour cut', path: 'TruTops Boost > Cut > Contour', summary: 'Baseline contour cutting for sheet and profile work.', operationId: 'laser_cut' },
      { id: 'trutops-flyline', label: 'FlyLine', path: 'TruTops Boost > Cut > FlyLine', summary: 'Fast line-cutting for part families and nests.', operationId: 'laser_cut' },
      { id: 'trutops-mark', label: 'Mark / etch', path: 'TruTops Boost > Marking', summary: 'Laser marking, etch, or identification passes.', operationId: 'laser_edge' },
      { id: 'trutops-microjoint', label: 'Microjoint', path: 'TruTops Boost > Cut > Microjoints', summary: 'Retention joints for nested parts.', operationId: 'laser_edge' },
    ],
  },
  {
    id: 'manual-laser',
    mode: 'laser',
    label: 'Manual Programming',
    vendor: 'Nest Plan',
    kind: 'manual',
    badge: 'Cut Plan',
    summary: 'Use this when you are manually staging lead-ins, pierce posture, and cut-quality assumptions.',
    toolpaths: [
      { id: 'manual-laser-profile', label: 'Profile cut plan', path: 'Laser setup > Profile cut', summary: 'Manual contour, lead-in, and direction planning.', operationId: 'laser_cut' },
      { id: 'manual-laser-common-line', label: 'Common-line plan', path: 'Laser setup > Common-line / nest plan', summary: 'Shared-edge and nesting posture before programming.', operationId: 'laser_cut' },
      { id: 'manual-laser-quality', label: 'Edge-quality pass', path: 'Laser setup > Quality pass', summary: 'Finish-focused gas, speed, and lead strategy planning.', operationId: 'laser_edge' },
    ],
  },
  {
    id: 'omax-waterjet',
    mode: 'waterjet',
    label: 'OMAX Layout / Make',
    vendor: 'OMAX',
    kind: 'nesting',
    badge: 'Waterjet CAM',
    summary: 'Waterjet package selection should reflect quality level, pierce strategy, and taper-control assumptions.',
    toolpaths: [
      { id: 'omax-contour', label: 'Contour cut', path: 'Layout / Make > Tool Path > Contour', summary: 'Standard abrasive contour cutting path.', operationId: 'abrasive_cut' },
      { id: 'omax-quality', label: 'Quality level cut', path: 'Layout / Make > Tool Path > Quality Level', summary: 'Speed versus edge-quality tradeoff selection.', operationId: 'abrasive_cut' },
      { id: 'omax-taper', label: 'Taper compensation', path: 'Layout / Make > Tool Path > Taper Compensation', summary: 'Compensated pathing for squarer walls.', operationId: 'taper_control' },
      { id: 'omax-pierce', label: 'Low-pressure pierce', path: 'Layout / Make > Tool Path > Pierce Strategy', summary: 'Pierce-safe entry planning for brittle or thick stock.', operationId: 'abrasive_cut' },
    ],
  },
  {
    id: 'flowxpert-waterjet',
    mode: 'waterjet',
    label: 'FlowXpert',
    vendor: 'Flow',
    kind: 'nesting',
    badge: 'Waterjet CAM',
    summary: 'FlowXpert emphasizes taper management and cut-quality posture within the waterjet setup.',
    toolpaths: [
      { id: 'flow-contour', label: 'Contour cut', path: 'FlowXpert > Contour', summary: 'Primary contour-cut setup for abrasive waterjet work.', operationId: 'abrasive_cut' },
      { id: 'flow-dynamic', label: 'Dynamic taper control', path: 'FlowXpert > Dynamic Taper Compensation', summary: 'Active taper compensation for straighter walls.', operationId: 'taper_control' },
      { id: 'flow-pierce', label: 'Pierce strategy', path: 'FlowXpert > Pierce', summary: 'Entry scheduling for fragile or thick parts.', operationId: 'abrasive_cut' },
      { id: 'flow-bevel', label: 'Bevel / angle cut', path: 'FlowXpert > Bevel Cutting', summary: 'Angled-edge cutting and bevel posture.', operationId: 'taper_control' },
    ],
  },
  {
    id: 'manual-waterjet',
    mode: 'waterjet',
    label: 'Manual Programming',
    vendor: 'Cut Plan',
    kind: 'manual',
    badge: 'Cold-Cut Plan',
    summary: 'Best for manually staging abrasive, taper, and pierce assumptions before output.',
    toolpaths: [
      { id: 'manual-waterjet-contour', label: 'Abrasive contour plan', path: 'Waterjet setup > Contour cut', summary: 'Manual contour and edge-quality planning.', operationId: 'abrasive_cut' },
      { id: 'manual-waterjet-pierce', label: 'Pierce schedule', path: 'Waterjet setup > Pierce strategy', summary: 'Pierce sequencing for fragile or thick stock.', operationId: 'abrasive_cut' },
      { id: 'manual-waterjet-taper', label: 'Taper-comp plan', path: 'Waterjet setup > Taper control', summary: 'Manual taper-compensation and quality planning.', operationId: 'taper_control' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // ADDITIONAL MILL CAM SOFTWARE
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'solidcam-mill',
    mode: 'mill',
    label: 'SolidCAM',
    vendor: 'SolidCAM Ltd',
    kind: 'cam',
    badge: 'SolidWorks CAM',
    summary: 'SolidCAM iMachining toolpath names so the calculator matches the patented constant-chip-thickness strategy.',
    toolpaths: [
      { id: 'sc-imachining-2d', label: 'iMachining 2D', path: 'SolidCAM > Milling > iMachining 2D', summary: 'Patented constant-chip-load roughing with morphing spiral.', operationId: 'roughing' },
      { id: 'sc-imachining-3d', label: 'iMachining 3D', path: 'SolidCAM > Milling > iMachining 3D', summary: '3D adaptive roughing with automatic rest detection.', operationId: 'roughing' },
      { id: 'sc-pocket', label: 'Pocket', path: 'SolidCAM > 2.5D Milling > Pocket', summary: 'Standard 2.5D pocket clearing with islands.', operationId: 'pocket_milling' },
      { id: 'sc-profile', label: 'Profile', path: 'SolidCAM > 2.5D Milling > Profile', summary: 'Wall profiling and contour finishing.', operationId: 'shoulder_milling' },
      { id: 'sc-hsr', label: 'HSR Roughing', path: 'SolidCAM > HSS/HSR > Roughing', summary: 'High-speed roughing for 3D cavity work.', operationId: 'roughing' },
      { id: 'sc-hsm', label: 'HSM Finishing', path: 'SolidCAM > HSS/HSR > HSM Finishing', summary: 'High-speed machining finish passes.', operationId: 'finishing' },
      { id: 'sc-sim5x', label: 'Sim. 5-Axis', path: 'SolidCAM > Multi-Axis > Simultaneous 5-Axis', summary: 'Simultaneous 5-axis contouring and swarf milling.', operationId: 'finishing' },
      { id: 'sc-drill', label: 'Drilling', path: 'SolidCAM > Drilling', summary: 'Cycle-based drilling, pecking, and tapping.', operationId: 'drilling' },
    ],
  },
  {
    id: 'powermill-mill',
    mode: 'mill',
    label: 'PowerMill',
    vendor: 'Autodesk',
    kind: 'cam',
    badge: 'High-End 5-Axis',
    summary: 'PowerMill strategy names for complex mold/die and aerospace 5-axis work.',
    toolpaths: [
      { id: 'pm-roughing', label: 'Roughing', path: 'Toolpaths > Roughing > Model Area Clearance', summary: 'Offset or raster volumetric roughing.', operationId: 'roughing' },
      { id: 'pm-vortex', label: 'Vortex Roughing', path: 'Toolpaths > Roughing > Vortex', summary: 'High-efficiency constant-engagement roughing.', operationId: 'roughing' },
      { id: 'pm-raster', label: 'Raster Finishing', path: 'Toolpaths > Finishing > Raster Finishing', summary: 'Linear raster finishing on broad surfaces.', operationId: 'finishing' },
      { id: 'pm-steep-shallow', label: 'Steep and Shallow', path: 'Toolpaths > Finishing > Steep and Shallow', summary: 'Automatic split between Z-level (steep) and raster (shallow).', operationId: 'finishing' },
      { id: 'pm-flowline', label: 'Flowline Finishing', path: 'Toolpaths > Finishing > Flowline', summary: 'Surface-following finish path with flow-direction control.', operationId: 'finishing' },
      { id: 'pm-swarf', label: 'Swarf Finishing', path: 'Toolpaths > 5-Axis > Swarf Finishing', summary: 'Flank-cutting ruled walls with 5-axis tilt control.', operationId: 'finishing' },
      { id: 'pm-pattern', label: 'Pattern Finishing', path: 'Toolpaths > Finishing > Pattern Finishing', summary: 'User-defined pattern-based finishing paths.', operationId: 'finishing' },
      { id: 'pm-drilling', label: 'Drilling', path: 'Toolpaths > Drilling', summary: 'Feature-based drilling, boring, and cycle selection.', operationId: 'drilling' },
    ],
  },
  {
    id: 'esprit-mill',
    mode: 'mill',
    label: 'ESPRIT',
    vendor: 'Hexagon',
    kind: 'cam',
    badge: 'Multi-Axis CAM',
    summary: 'ESPRIT ProfitMilling and multi-axis cycle names for production milling.',
    toolpaths: [
      { id: 'esprit-profitmill', label: 'ProfitMilling', path: 'Milling > ProfitMilling', summary: 'Trochoidal high-efficiency roughing with load control.', operationId: 'roughing' },
      { id: 'esprit-pocket', label: 'Pocket', path: 'Milling > 2.5D > Pocket', summary: 'Standard pocket clearing with rest machining.', operationId: 'pocket_milling' },
      { id: 'esprit-contour', label: 'Contouring', path: 'Milling > 2.5D > Contouring', summary: 'Profile contouring with lead and overlap control.', operationId: 'shoulder_milling' },
      { id: 'esprit-freeform-rough', label: 'FreeForm Roughing', path: 'Milling > 3D > FreeForm Roughing', summary: '3D roughing for complex cavities and mold cores.', operationId: 'roughing' },
      { id: 'esprit-freeform-finish', label: 'FreeForm Finishing', path: 'Milling > 3D > FreeForm Finishing', summary: '3D finishing with parallel, pencil, and Z-level options.', operationId: 'finishing' },
      { id: 'esprit-5x-swarf', label: '5-Axis Swarf', path: 'Milling > Multi-Axis > Swarf', summary: 'Flank cutting on ruled walls with multi-axis control.', operationId: 'finishing' },
      { id: 'esprit-mill-drill', label: 'Drilling', path: 'Milling > Drilling', summary: 'Drilling, pecking, boring, and tapping cycles.', operationId: 'drilling' },
    ],
  },
  {
    id: 'gibbscam-mill',
    mode: 'mill',
    label: 'GibbsCAM',
    vendor: 'CAMBRIO',
    kind: 'cam',
    badge: 'Production CAM',
    summary: 'GibbsCAM operation names for production-focused milling shops.',
    toolpaths: [
      { id: 'gc-volumill', label: 'VoluMill Roughing', path: 'Operations > Milling > VoluMill', summary: 'Constant-engagement trochoidal roughing.', operationId: 'roughing' },
      { id: 'gc-2d-pocket', label: '2D Pocket', path: 'Operations > Milling > 2D > Pocket', summary: 'Standard 2D pocket clearing.', operationId: 'pocket_milling' },
      { id: 'gc-2d-profile', label: '2D Profile', path: 'Operations > Milling > 2D > Profile', summary: 'Profile contouring with stock allowance control.', operationId: 'shoulder_milling' },
      { id: 'gc-3d-rough', label: '3D Roughing', path: 'Operations > Milling > 3D > Roughing', summary: 'Volumetric 3D roughing for cavities and molds.', operationId: 'roughing' },
      { id: 'gc-3d-finish', label: '3D Finishing', path: 'Operations > Milling > 3D > Finishing', summary: 'Surface finishing with Z-level, parallel, and flow options.', operationId: 'finishing' },
      { id: 'gc-5x-swarf', label: '5-Axis Swarf', path: 'Operations > Multi-Axis > Swarf', summary: 'Flank milling on ruled geometry.', operationId: 'finishing' },
      { id: 'gc-drill', label: 'Drilling', path: 'Operations > Hole Making', summary: 'Drilling, boring, and cycle-based holemaking.', operationId: 'drilling' },
    ],
  },
  {
    id: 'bobcad-mill',
    mode: 'mill',
    label: 'BobCAD-CAM',
    vendor: 'BobCAD-CAM',
    kind: 'cam',
    badge: 'Shop CAM',
    summary: 'BobCAD toolpath names for small and mid-size shop programming.',
    toolpaths: [
      { id: 'bc-adaptive', label: 'Adaptive Roughing', path: 'CAM Tree > Mill > Adaptive Roughing', summary: 'Constant-engagement adaptive roughing.', operationId: 'roughing' },
      { id: 'bc-pocket', label: '2D Pocket', path: 'CAM Tree > Mill > 2D > Pocket', summary: 'Standard pocket clearing with island detection.', operationId: 'pocket_milling' },
      { id: 'bc-profile', label: '2D Profile', path: 'CAM Tree > Mill > 2D > Profile', summary: 'Perimeter contouring and wall finishing.', operationId: 'shoulder_milling' },
      { id: 'bc-adv-rough', label: 'Advanced Roughing', path: 'CAM Tree > Mill > 3-Axis > Advanced Rough', summary: '3D stock roughing with rest detection.', operationId: 'roughing' },
      { id: 'bc-zlevel', label: 'Z-Level Finish', path: 'CAM Tree > Mill > 3-Axis > Z-Level Finish', summary: 'Steep-wall finishing at constant Z intervals.', operationId: 'finishing' },
      { id: 'bc-planar', label: 'Planar Finish', path: 'CAM Tree > Mill > 3-Axis > Planar Finish', summary: 'Linear raster finishing for broad surfaces.', operationId: 'finishing' },
      { id: 'bc-drill', label: 'Drilling', path: 'CAM Tree > Mill > Drilling', summary: 'Drill, peck, tap, and bore cycle creation.', operationId: 'drilling' },
    ],
  },
  {
    id: 'edgecam-mill',
    mode: 'mill',
    label: 'EDGECAM',
    vendor: 'Hexagon',
    kind: 'cam',
    badge: 'Production CAM',
    summary: 'EDGECAM Waveform and production-style cycle names for milling.',
    toolpaths: [
      { id: 'ec-waveform', label: 'Waveform Roughing', path: 'Milling > Roughing > Waveform', summary: 'Trochoidal constant-chip-load roughing strategy.', operationId: 'roughing' },
      { id: 'ec-rough', label: 'Rough Cycle', path: 'Milling > Roughing > Rough Cycle', summary: 'Standard offset or raster volumetric roughing.', operationId: 'roughing' },
      { id: 'ec-profile', label: 'Profile', path: 'Milling > Finishing > Profile', summary: 'Wall profiling with approach and retract control.', operationId: 'shoulder_milling' },
      { id: 'ec-finish', label: 'Finish Cycle', path: 'Milling > Finishing > Finish Cycle', summary: '3D finishing with Z-level and raster options.', operationId: 'finishing' },
      { id: 'ec-rest', label: 'Rest Roughing', path: 'Milling > Roughing > Rest Roughing', summary: 'Rest-material cleanup after larger tool roughing.', operationId: 'roughing' },
      { id: 'ec-face', label: 'Face Milling', path: 'Milling > Face Mill', summary: 'Top-face cleanup and stock leveling.', operationId: 'face_milling' },
      { id: 'ec-drill', label: 'Drilling', path: 'Milling > Drilling', summary: 'Cycle-based drilling and holemaking.', operationId: 'drilling' },
    ],
  },
  {
    id: 'featurecam-mill',
    mode: 'mill',
    label: 'FeatureCAM',
    vendor: 'Autodesk',
    kind: 'cam',
    badge: 'Feature-Based CAM',
    summary: 'FeatureCAM feature-based strategy names for quick setup programming.',
    toolpaths: [
      { id: 'fc-pocket', label: '2.5D Pocket', path: 'Features > 2.5D > Pocket', summary: 'Feature-recognized pocket clearing.', operationId: 'pocket_milling' },
      { id: 'fc-side', label: '2.5D Side', path: 'Features > 2.5D > Side', summary: 'Wall profiling and shoulder work.', operationId: 'shoulder_milling' },
      { id: 'fc-3d-rough', label: '3D Roughing', path: 'Features > 3D > Z-Level Roughing', summary: 'Z-level-based volumetric roughing.', operationId: 'roughing' },
      { id: 'fc-3d-finish', label: '3D Finishing', path: 'Features > 3D > Z-Level Finishing', summary: 'Z-level finishing on steep walls.', operationId: 'finishing' },
      { id: 'fc-pencil', label: '3D Pencil', path: 'Features > 3D > Pencil Trace', summary: 'Corner and fillet cleanup trace path.', operationId: 'finishing' },
      { id: 'fc-face', label: 'Face', path: 'Features > 2.5D > Face', summary: 'Automatic face milling from feature.', operationId: 'face_milling' },
      { id: 'fc-drill', label: 'Drilling', path: 'Features > Hole', summary: 'Feature-recognized drilling and tapping.', operationId: 'drilling' },
    ],
  },
  {
    id: 'solidworks-cam-mill',
    mode: 'mill',
    label: 'SolidWorks CAM',
    vendor: 'Dassault',
    kind: 'cam',
    badge: 'Integrated CAM',
    summary: 'SolidWorks CAM (CAMWorks-based) strategy names for in-platform programming.',
    toolpaths: [
      { id: 'sw-volumill', label: 'VoluMill', path: 'CAMWorks > Mill > VoluMill', summary: 'Constant-engagement adaptive roughing.', operationId: 'roughing' },
      { id: 'sw-rough', label: 'Rough Mill', path: 'CAMWorks > Mill > Rough Mill', summary: 'Standard offset-style roughing.', operationId: 'roughing' },
      { id: 'sw-contour', label: 'Contour Mill', path: 'CAMWorks > Mill > Contour Mill', summary: 'Profile contouring and sidewall finishing.', operationId: 'shoulder_milling' },
      { id: 'sw-face', label: 'Face Mill', path: 'CAMWorks > Mill > Face Mill', summary: 'Top-face cleanup milling.', operationId: 'face_milling' },
      { id: 'sw-3d-rough', label: '3-Axis Rough', path: 'CAMWorks > Multi Surface > 3-Axis Rough', summary: '3D volumetric roughing for freeform geometry.', operationId: 'roughing' },
      { id: 'sw-3d-finish', label: '3-Axis Finish', path: 'CAMWorks > Multi Surface > 3-Axis Finish', summary: '3D surface finishing with pattern control.', operationId: 'finishing' },
      { id: 'sw-drill', label: 'Drilling', path: 'CAMWorks > Hole > Drill', summary: 'Feature-based drilling cycle generation.', operationId: 'drilling' },
    ],
  },
  {
    id: 'cimatron-mill',
    mode: 'mill',
    label: 'Cimatron',
    vendor: '3D Systems',
    kind: 'cam',
    badge: 'Mold/Die CAM',
    summary: 'Cimatron toolpath names tuned for mold, die, and electrode manufacturing.',
    toolpaths: [
      { id: 'ci-volume', label: 'Volume Milling', path: 'NC > Milling > Volume Milling', summary: 'Adaptive roughing for cavities and core pockets.', operationId: 'roughing' },
      { id: 'ci-pocket', label: 'Pocket Milling', path: 'NC > Milling > Pocket', summary: '2.5D pocket clearing with island support.', operationId: 'pocket_milling' },
      { id: 'ci-profile', label: 'Profile Finishing', path: 'NC > Milling > Profile', summary: 'Contour finishing for mold cavity walls.', operationId: 'shoulder_milling' },
      { id: 'ci-rest', label: 'Rest Milling', path: 'NC > Milling > Rest Milling', summary: 'Rest-material cleanup with smaller cutters.', operationId: 'roughing' },
      { id: 'ci-pencil', label: 'Pencil Trace', path: 'NC > Finishing > Pencil', summary: 'Corner cleanup and fillet trace finishing.', operationId: 'finishing' },
      { id: 'ci-geodesic', label: 'Geodesic Finishing', path: 'NC > Finishing > Geodesic', summary: 'Surface-following geodesic finish paths for complex molds.', operationId: 'finishing' },
      { id: 'ci-drill', label: 'Drilling', path: 'NC > Drilling', summary: 'Cycle-based drilling for mold cooling holes.', operationId: 'drilling' },
    ],
  },
  {
    id: 'topsolid-mill',
    mode: 'mill',
    label: 'TopSolid',
    vendor: 'Missler Software',
    kind: 'cam',
    badge: 'Integrated CAD/CAM',
    summary: 'TopSolid integrated CAD/CAM cycle names for production milling.',
    toolpaths: [
      { id: 'ts-rough', label: 'Roughing Cycle', path: 'Machining > Milling > Roughing', summary: 'Offset or spiral roughing with rest detection.', operationId: 'roughing' },
      { id: 'ts-pocket', label: 'Pocket', path: 'Machining > Milling > Pocket', summary: '2.5D pocket clearing with contour-aware islands.', operationId: 'pocket_milling' },
      { id: 'ts-profile', label: 'Profile', path: 'Machining > Milling > Profile', summary: 'Wall and perimeter contouring.', operationId: 'shoulder_milling' },
      { id: 'ts-3d-finish', label: '3D Finishing', path: 'Machining > 3D > Finishing', summary: 'Z-level, parallel, and flow-based surface finishing.', operationId: 'finishing' },
      { id: 'ts-zlevel', label: 'Z-Level', path: 'Machining > 3D > Z-Level', summary: 'Constant-Z steep-wall finishing.', operationId: 'finishing' },
      { id: 'ts-drill', label: 'Drilling', path: 'Machining > Drilling', summary: 'Feature-based drilling, pecking, and tapping.', operationId: 'drilling' },
    ],
  },
  {
    id: 'worknc-mill',
    mode: 'mill',
    label: 'WorkNC',
    vendor: 'Hexagon',
    kind: 'cam',
    badge: 'Auto 5-Axis CAM',
    summary: 'WorkNC auto-5-axis and mold-focused strategy names.',
    toolpaths: [
      { id: 'wn-global-rough', label: 'Global Roughing', path: 'WorkNC > Roughing > Global Roughing', summary: 'Full-stock volumetric roughing with auto tool selection.', operationId: 'roughing' },
      { id: 'wn-rerough', label: 'Re-Roughing', path: 'WorkNC > Roughing > Re-Roughing', summary: 'Rest-material roughing with smaller tool.', operationId: 'roughing' },
      { id: 'wn-waveform', label: 'Waveform', path: 'WorkNC > Roughing > Waveform', summary: 'Constant-engagement trochoidal roughing.', operationId: 'roughing' },
      { id: 'wn-zlevel', label: 'Z-Level Finishing', path: 'WorkNC > Finishing > Z-Level', summary: 'Steep-wall Z-level finishing passes.', operationId: 'finishing' },
      { id: 'wn-planar', label: 'Planar Finishing', path: 'WorkNC > Finishing > Planar', summary: 'Linear raster finishing on shallow areas.', operationId: 'finishing' },
      { id: 'wn-5x-finish', label: 'Auto 5-Axis Finishing', path: 'WorkNC > 5-Axis > Auto 5-Axis', summary: 'Automatic tilt-angle 5-axis finishing.', operationId: 'finishing' },
      { id: 'wn-drill', label: 'Drilling', path: 'WorkNC > Drilling', summary: 'Hole feature recognition and cycle creation.', operationId: 'drilling' },
    ],
  },
  {
    id: 'tebis-mill',
    mode: 'mill',
    label: 'Tebis',
    vendor: 'Tebis AG',
    kind: 'cam',
    badge: 'Automotive CAM',
    summary: 'Tebis strategy names for automotive mold, die, and model manufacturing.',
    toolpaths: [
      { id: 'tb-roughing', label: 'Roughing', path: 'NC > Milling > Roughing', summary: 'Offset-based roughing for large cavity work.', operationId: 'roughing' },
      { id: 'tb-zconst', label: 'Z-Constant', path: 'NC > Finishing > Z-Constant', summary: 'Constant-Z finishing for steep walls.', operationId: 'finishing' },
      { id: 'tb-equidistant', label: 'Equidistant', path: 'NC > Finishing > Equidistant', summary: 'Surface-equidistant scallop finishing.', operationId: 'finishing' },
      { id: 'tb-drivecurve', label: 'Drive Curve', path: 'NC > Finishing > Drive Curve', summary: 'User-guided curve-following finish path.', operationId: 'finishing' },
      { id: 'tb-5x', label: '5-Axis Simultaneous', path: 'NC > 5-Axis > Simultaneous', summary: 'Full simultaneous 5-axis contour milling.', operationId: 'finishing' },
      { id: 'tb-drill', label: 'Drilling', path: 'NC > Drilling', summary: 'Deep-hole and standard drilling cycles.', operationId: 'drilling' },
    ],
  },
  {
    id: 'catia-mill',
    mode: 'mill',
    label: 'CATIA',
    vendor: 'Dassault Systemes',
    kind: 'cam',
    badge: 'Enterprise CAM',
    summary: 'CATIA V5/3DEXPERIENCE machining workbench strategy names for aerospace-grade programming.',
    toolpaths: [
      { id: 'ca-prism-rough', label: 'Prismatic Roughing', path: 'Prismatic Machining > Pocketing > Roughing', summary: 'Prismatic pocket roughing with contour-aware passes.', operationId: 'roughing' },
      { id: 'ca-prism-pocket', label: 'Prismatic Pocketing', path: 'Prismatic Machining > Pocketing', summary: 'Standard prismatic pocket clearing.', operationId: 'pocket_milling' },
      { id: 'ca-prism-profile', label: 'Profile Contouring', path: 'Prismatic Machining > Profile Contouring', summary: 'Wall profiling with multi-pass stock control.', operationId: 'shoulder_milling' },
      { id: 'ca-surf-rough', label: 'Surface Roughing', path: 'Surface Machining > Roughing', summary: 'Freeform surface roughing for complex geometry.', operationId: 'roughing' },
      { id: 'ca-sweeping', label: 'Sweeping', path: 'Surface Machining > Sweeping', summary: 'Linear or geodesic surface finishing sweeps.', operationId: 'finishing' },
      { id: 'ca-multi-sweep', label: 'Multi-Axis Sweeping', path: 'Multi-Axis Machining > Multi-Axis Sweeping', summary: 'Simultaneous multi-axis surface sweeping.', operationId: 'finishing' },
      { id: 'ca-drill', label: 'Drilling', path: 'Prismatic Machining > Drilling', summary: 'Feature-based drilling and boring in prismatic context.', operationId: 'drilling' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // ADDITIONAL LATHE CAM SOFTWARE
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'nx-lathe',
    mode: 'lathe',
    label: 'NX CAM',
    vendor: 'Siemens',
    kind: 'cam',
    badge: 'Enterprise Turning',
    summary: 'NX turning operation names for enterprise-grade lathe and mill-turn programming.',
    toolpaths: [
      { id: 'nx-turn-rough', label: 'Rough Turn', path: 'Operation Navigator > Turning > Rough Turning', summary: 'OD/ID stock-removal roughing with auto retract.', operationId: 'turning_rough' },
      { id: 'nx-turn-finish', label: 'Finish Turn', path: 'Operation Navigator > Turning > Finish Turning', summary: 'Finish contouring with spring-pass control.', operationId: 'turning_finish' },
      { id: 'nx-turn-groove', label: 'Groove', path: 'Operation Navigator > Turning > Grooving', summary: 'Groove and cutoff-style lathe operations.', operationId: 'grooving' },
      { id: 'nx-turn-thread', label: 'Thread Turn', path: 'Operation Navigator > Turning > Threading', summary: 'Single-point threading with infeed control.', operationId: 'turning_finish' },
      { id: 'nx-turn-drill', label: 'Centerline Drill', path: 'Operation Navigator > Turning > Centerline Drilling', summary: 'Centerline drilling and boring from turret.', operationId: 'boring' },
      { id: 'nx-turn-profile', label: 'Turn Profile', path: 'Operation Navigator > Turning > Teach Mode', summary: 'Teach-mode profile turning for complex contours.', operationId: 'turning_finish' },
    ],
  },
  {
    id: 'fusion360-lathe',
    mode: 'lathe',
    label: 'Fusion 360',
    vendor: 'Autodesk',
    kind: 'cam',
    badge: 'Cloud Turning',
    summary: 'Fusion 360 turning strategy names in the Manufacture workspace.',
    toolpaths: [
      { id: 'f360-turn-rough', label: 'Turning Profile Roughing', path: 'Manufacture > Turning > Turning Profile > Roughing', summary: 'OD/ID profile roughing with stock allowance.', operationId: 'turning_rough' },
      { id: 'f360-turn-finish', label: 'Turning Profile Finishing', path: 'Manufacture > Turning > Turning Profile > Finishing', summary: 'Profile finish contouring with spring passes.', operationId: 'turning_finish' },
      { id: 'f360-turn-groove', label: 'Turning Grooving', path: 'Manufacture > Turning > Turning Groove', summary: 'Grooving and parting operations.', operationId: 'grooving' },
      { id: 'f360-turn-thread', label: 'Turning Thread', path: 'Manufacture > Turning > Turning Thread', summary: 'Single-point threading with multi-pass infeed.', operationId: 'turning_finish' },
      { id: 'f360-turn-drill', label: 'Turning Drilling', path: 'Manufacture > Turning > Secondary Spindle Drilling', summary: 'Centerline drilling and boring.', operationId: 'boring' },
    ],
  },
  {
    id: 'solidcam-lathe',
    mode: 'lathe',
    label: 'SolidCAM',
    vendor: 'SolidCAM Ltd',
    kind: 'cam',
    badge: 'SolidWorks Turning',
    summary: 'SolidCAM turning operations including iTurning for SolidWorks-integrated lathe work.',
    toolpaths: [
      { id: 'sc-turn-rough', label: 'Turning Roughing', path: 'SolidCAM > Turning > Roughing', summary: 'OD/ID roughing with stock recognition.', operationId: 'turning_rough' },
      { id: 'sc-turn-finish', label: 'Turning Finishing', path: 'SolidCAM > Turning > Finishing', summary: 'Finish contouring and cleanup passes.', operationId: 'turning_finish' },
      { id: 'sc-turn-groove', label: 'Grooving', path: 'SolidCAM > Turning > Grooving', summary: 'Grooving, cutoff, and recess operations.', operationId: 'grooving' },
      { id: 'sc-turn-thread', label: 'Threading', path: 'SolidCAM > Turning > Threading', summary: 'Single-point and multi-start threading.', operationId: 'turning_finish' },
      { id: 'sc-turn-drill', label: 'Drilling', path: 'SolidCAM > Turning > Drilling', summary: 'Centerline drilling and boring from turret.', operationId: 'boring' },
      { id: 'sc-millturn', label: 'Mill-Turn', path: 'SolidCAM > Mill-Turn > Synchronization', summary: 'Mill-turn live-tooling and channel sync.', operationId: 'turning_finish' },
    ],
  },
  {
    id: 'edgecam-lathe',
    mode: 'lathe',
    label: 'EDGECAM',
    vendor: 'Hexagon',
    kind: 'cam',
    badge: 'Production Turning',
    summary: 'EDGECAM turning cycle names for production lathe programming.',
    toolpaths: [
      { id: 'ec-turn-rough', label: 'Rough Cycle', path: 'Turning > Rough Cycle', summary: 'Standard OD/ID rough turning cycle.', operationId: 'turning_rough' },
      { id: 'ec-turn-finish', label: 'Finish Cycle', path: 'Turning > Finish Cycle', summary: 'Finish contouring for OD/ID profiles.', operationId: 'turning_finish' },
      { id: 'ec-turn-groove', label: 'Grooving', path: 'Turning > Grooving', summary: 'Groove and cutoff-style operations.', operationId: 'grooving' },
      { id: 'ec-turn-thread', label: 'Threading', path: 'Turning > Threading', summary: 'Thread cutting with infeed and pullout control.', operationId: 'turning_finish' },
      { id: 'ec-turn-drill', label: 'Drilling', path: 'Turning > Drilling', summary: 'Centerline drilling and boring.', operationId: 'boring' },
    ],
  },
  {
    id: 'topsolid-lathe',
    mode: 'lathe',
    label: 'TopSolid',
    vendor: 'Missler Software',
    kind: 'cam',
    badge: 'Integrated Turning',
    summary: 'TopSolid integrated turning cycle names for production lathe work.',
    toolpaths: [
      { id: 'ts-turn-rough', label: 'Roughing', path: 'Machining > Turning > Roughing', summary: 'OD/ID profile roughing with retract control.', operationId: 'turning_rough' },
      { id: 'ts-turn-finish', label: 'Finishing', path: 'Machining > Turning > Finishing', summary: 'Profile finishing and cleanup contouring.', operationId: 'turning_finish' },
      { id: 'ts-turn-groove', label: 'Grooving', path: 'Machining > Turning > Grooving', summary: 'Grooving, parting, and recess operations.', operationId: 'grooving' },
      { id: 'ts-turn-thread', label: 'Threading', path: 'Machining > Turning > Threading', summary: 'Thread turning with pass scheduling.', operationId: 'turning_finish' },
      { id: 'ts-turn-drill', label: 'Drilling', path: 'Machining > Turning > Drilling', summary: 'Turret-based drilling and boring.', operationId: 'boring' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // ADDITIONAL WIRE EDM CAM SOFTWARE
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'peps-wire',
    mode: 'wire_edm',
    label: 'PEPS',
    vendor: 'Hexagon',
    kind: 'cam',
    badge: 'Wire EDM CAM',
    summary: 'PEPS dedicated wire EDM strategy names for precision contouring and skim-pass scheduling.',
    toolpaths: [
      { id: 'peps-wire-2axis', label: '2-Axis Profile', path: 'PEPS Wire > 2-Axis > Profile', summary: 'Standard XY profile cutting with skim follow-up.', operationId: 'wire_profile' },
      { id: 'peps-wire-4axis', label: '4-Axis Taper', path: 'PEPS Wire > 4-Axis > Taper', summary: 'UV-controlled taper and ruled-surface cutting.', operationId: 'wire_profile' },
      { id: 'peps-wire-skim', label: 'Skim Passes', path: 'PEPS Wire > Finishing > Skim Schedule', summary: 'Multi-skim finish scheduling for size and surface.', operationId: 'wire_skims' },
      { id: 'peps-wire-tab', label: 'Tab / Slug', path: 'PEPS Wire > Slug Control > Tab', summary: 'Tab placement and slug retention management.', operationId: 'wire_profile' },
    ],
  },
  {
    id: 'cimatron-wire',
    mode: 'wire_edm',
    label: 'Cimatron',
    vendor: '3D Systems',
    kind: 'cam',
    badge: 'Mold Wire CAM',
    summary: 'Cimatron wire EDM for mold and die contour cutting with integrated electrode design.',
    toolpaths: [
      { id: 'ci-wire-profile', label: 'Wire Profile', path: 'NC > Wire EDM > Profile', summary: 'Standard wire contour cutting.', operationId: 'wire_profile' },
      { id: 'ci-wire-taper', label: 'Wire Taper', path: 'NC > Wire EDM > Taper', summary: '4-axis taper cutting for angled cavities.', operationId: 'wire_profile' },
      { id: 'ci-wire-skim', label: 'Multi-Skim', path: 'NC > Wire EDM > Multi-Skim', summary: 'Automated skim-pass scheduling for finish.', operationId: 'wire_skims' },
      { id: 'ci-wire-tab', label: 'Tab Management', path: 'NC > Wire EDM > Tab / Glue Stop', summary: 'Slug retention and tab placement logic.', operationId: 'wire_profile' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // ADDITIONAL SINKER EDM CAM SOFTWARE
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'cimatron-edm',
    mode: 'edm',
    label: 'Cimatron',
    vendor: '3D Systems',
    kind: 'cam',
    badge: 'Electrode CAM',
    summary: 'Cimatron electrode design and burn sequencing for mold and die EDM work.',
    toolpaths: [
      { id: 'ci-electrode', label: 'Electrode Design', path: 'NC > EDM > Electrode Design', summary: 'Automated electrode extraction and offset generation.', operationId: 'burn_roughing' },
      { id: 'ci-burn-seq', label: 'Burn Sequence', path: 'NC > EDM > Burn Sequence', summary: 'Multi-electrode burn sequencing with wear offsets.', operationId: 'burn_roughing' },
      { id: 'ci-orbit', label: 'Orbit Finish', path: 'NC > EDM > Orbit Finishing', summary: 'Orbiting finish burns for size and surface refinement.', operationId: 'burn_finishing' },
    ],
  },
  {
    id: 'peps-edm',
    mode: 'edm',
    label: 'PEPS',
    vendor: 'Hexagon',
    kind: 'cam',
    badge: 'Sinker EDM CAM',
    summary: 'PEPS sinker EDM cycle names for cavity burning and electrode compensation.',
    toolpaths: [
      { id: 'peps-cavity', label: 'Cavity Burn', path: 'PEPS EDM > Cavity > Burn', summary: 'Primary cavity-burn planning for rough passes.', operationId: 'burn_roughing' },
      { id: 'peps-orbit', label: 'Orbit Finish', path: 'PEPS EDM > Finish > Orbit', summary: 'Orbiting finish burns for detail and surface quality.', operationId: 'burn_finishing' },
      { id: 'peps-detail', label: 'Detail Burn', path: 'PEPS EDM > Detail > Fine Burn', summary: 'Fine-detail burning for ribs and thin features.', operationId: 'burn_finishing' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // ADDITIONAL LASER CAM / NESTING SOFTWARE
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'sigmanest-laser',
    mode: 'laser',
    label: 'SigmaNEST',
    vendor: 'SigmaTEK',
    kind: 'nesting',
    badge: 'Universal Nesting',
    summary: 'SigmaNEST universal nesting for multi-process laser cutting and sheet optimization.',
    toolpaths: [
      { id: 'sigma-laser-part', label: 'Part Cut', path: 'SigmaNEST > Cutting > Part Cut', summary: 'Standard part-contour cutting from nested sheet.', operationId: 'laser_cut' },
      { id: 'sigma-laser-common', label: 'Common Line', path: 'SigmaNEST > Cutting > Common Line', summary: 'Shared-edge cutting for material savings.', operationId: 'laser_cut' },
      { id: 'sigma-laser-chain', label: 'Chain Cut', path: 'SigmaNEST > Cutting > Chain Cutting', summary: 'Bridge-linked part-to-part cutting for throughput.', operationId: 'laser_cut' },
      { id: 'sigma-laser-tab', label: 'Micro-Tab', path: 'SigmaNEST > Retention > Micro-Tab', summary: 'Part retention tabs for small or thin parts.', operationId: 'laser_edge' },
    ],
  },
  {
    id: 'lantek-laser',
    mode: 'laser',
    label: 'Lantek Expert',
    vendor: 'Lantek',
    kind: 'nesting',
    badge: 'Sheet Metal CAM',
    summary: 'Lantek Expert nesting and cutting strategy names for sheet metal laser work.',
    toolpaths: [
      { id: 'lk-profile', label: 'Profile Cut', path: 'Lantek Expert > Cutting > Profile', summary: 'Standard perimeter cutting with lead control.', operationId: 'laser_cut' },
      { id: 'lk-bridge', label: 'Bridge Nesting', path: 'Lantek Expert > Nesting > Bridge', summary: 'Bridge-linked cutting for nested throughput.', operationId: 'laser_cut' },
      { id: 'lk-common', label: 'Common Edge', path: 'Lantek Expert > Cutting > Common Edge', summary: 'Shared-edge nesting for material optimization.', operationId: 'laser_cut' },
      { id: 'lk-microjoint', label: 'Micro-Joint', path: 'Lantek Expert > Retention > Micro-Joint', summary: 'Part retention joints for automated unloading.', operationId: 'laser_edge' },
      { id: 'lk-mark', label: 'Marking', path: 'Lantek Expert > Marking', summary: 'Laser marking and part identification passes.', operationId: 'laser_edge' },
    ],
  },
  {
    id: 'radan-laser',
    mode: 'laser',
    label: 'RADAN',
    vendor: 'Hexagon',
    kind: 'nesting',
    badge: 'Sheet Metal CAM',
    summary: 'RADAN nesting and cutting cycle names for laser sheet metalworking.',
    toolpaths: [
      { id: 'rd-profile', label: 'Profile', path: 'RADAN > Cutting > Profile', summary: 'Standard contour cutting with pierce control.', operationId: 'laser_cut' },
      { id: 'rd-nest', label: 'Nesting', path: 'RADAN > Nesting > Auto Nest', summary: 'Automatic nesting optimization for sheet utilization.', operationId: 'laser_cut' },
      { id: 'rd-common', label: 'Common Cut', path: 'RADAN > Cutting > Common Cut', summary: 'Shared-edge cutting for reduced waste.', operationId: 'laser_cut' },
      { id: 'rd-quality', label: 'Quality Pass', path: 'RADAN > Cutting > Quality', summary: 'Edge-quality-biased cut conditions.', operationId: 'laser_edge' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // ADDITIONAL WATERJET CAM / NESTING SOFTWARE
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'sigmanest-waterjet',
    mode: 'waterjet',
    label: 'SigmaNEST',
    vendor: 'SigmaTEK',
    kind: 'nesting',
    badge: 'Universal Nesting',
    summary: 'SigmaNEST universal nesting adapted for waterjet quality levels and taper compensation.',
    toolpaths: [
      { id: 'sigma-wj-contour', label: 'Contour Cut', path: 'SigmaNEST > Waterjet > Contour', summary: 'Standard abrasive contour cutting.', operationId: 'abrasive_cut' },
      { id: 'sigma-wj-quality', label: 'Quality Level', path: 'SigmaNEST > Waterjet > Quality Level', summary: 'Speed-quality tradeoff selection per part.', operationId: 'abrasive_cut' },
      { id: 'sigma-wj-taper', label: 'Taper Compensation', path: 'SigmaNEST > Waterjet > Taper Comp', summary: 'Active taper compensation for straighter walls.', operationId: 'taper_control' },
      { id: 'sigma-wj-pierce', label: 'Pierce Strategy', path: 'SigmaNEST > Waterjet > Pierce', summary: 'Low-pressure pierce for brittle or thick stock.', operationId: 'abrasive_cut' },
    ],
  },
  {
    id: 'pronest-waterjet',
    mode: 'waterjet',
    label: 'ProNest',
    vendor: 'Hypertherm',
    kind: 'nesting',
    badge: 'Cutting Nesting',
    summary: 'ProNest cutting nesting optimized for waterjet quality settings and path optimization.',
    toolpaths: [
      { id: 'pn-profile', label: 'Profile Cut', path: 'ProNest > Cutting > Profile', summary: 'Standard contour-cut path for waterjet.', operationId: 'abrasive_cut' },
      { id: 'pn-interior', label: 'Interior Cut', path: 'ProNest > Cutting > Interior', summary: 'Interior feature cutout with lead optimization.', operationId: 'abrasive_cut' },
      { id: 'pn-bridge', label: 'Bridge Cut', path: 'ProNest > Nesting > Bridge', summary: 'Bridge-linked cutting for nested throughput.', operationId: 'abrasive_cut' },
      { id: 'pn-quality', label: 'Quality Settings', path: 'ProNest > Process > Quality Level', summary: 'Speed-versus-edge-quality selection.', operationId: 'abrasive_cut' },
    ],
  },
  {
    id: 'wardjet-waterjet',
    mode: 'waterjet',
    label: 'Wardjet',
    vendor: 'Wardjet Inc',
    kind: 'nesting',
    badge: 'Waterjet CAM',
    summary: 'Wardjet-native CAM software for Wardjet cutting systems with integrated nesting and stack-cut support.',
    toolpaths: [
      { id: 'wj-contour', label: 'Contour', path: 'Wardjet > Contour', summary: 'Standard abrasive contour cut with kerf compensation and corner deceleration.', operationId: 'abrasive_cut' },
      { id: 'wj-quality', label: 'Quality Level', path: 'Wardjet > Quality', summary: 'Edge quality designation from rough separation to fine finish controlling traverse rate.', operationId: 'abrasive_cut' },
      { id: 'wj-taper', label: 'Taper Compensation', path: 'Wardjet > Taper', summary: 'Dynamic head tilt for jet-taper elimination on thick material.', operationId: 'taper_control' },
      { id: 'wj-pierce', label: 'Pierce Strategy', path: 'Wardjet > Pierce', summary: 'Configurable pierce routines including low-pressure ramp for fragile materials.', operationId: 'abrasive_cut' },
      { id: 'wj-stack', label: 'Stack Cut', path: 'Wardjet > Stack Cut', summary: 'Multi-layer stack cutting for thin sheet materials.', operationId: 'abrasive_cut' },
    ],
  },
  ...BASIC_TOOLPATH_ENVIRONMENTS,
  ...CONVERSATIONAL_PROGRAMMING_ENVIRONMENTS,
  ...PRISM_NOVEL_PROGRAMMING_ENVIRONMENTS,
];

export const MODE_NOTES: Record<MachineMode, { title: string; detail: string; livePhysics: boolean }> = {
  mill: {
    title: 'Live milling physics',
    detail: 'This mode drives the current speed-feed engine and formula deck directly.',
    livePhysics: true,
  },
  lathe: {
    title: 'Live turning physics',
    detail: 'Turning operations feed the same quick-engine path with lathe-focused defaults.',
    livePhysics: true,
  },
  edm: {
    title: 'Setup-first EDM workspace',
    detail: 'Use this surface to stage electrodes, flushing, and setup truth before EDM-specific toolpaths.',
    livePhysics: false,
  },
  wire_edm: {
    title: 'Live wire EDM physics',
    detail: 'Wire EDM calculator drives the 6-engine orchestrator (settings, multipass, cutting params, corners, surface integrity, cost) for physics-backed process planning.',
    livePhysics: true,
  },
  laser: {
    title: 'Laser prep workspace',
    detail: 'Use this surface to stage material, gas, and nozzle choices before dedicated laser program generation.',
    livePhysics: false,
  },
  waterjet: {
    title: 'Waterjet prep workspace',
    detail: 'Use this surface to stage abrasive and taper-control assumptions before waterjet-specific program outputs.',
    livePhysics: false,
  },
};
