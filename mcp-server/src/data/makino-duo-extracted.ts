/**
 * Makino DUO43/DUO64 Wire EDM Technology Data (V-Guide Series)
 * Extracted from Mastercam X8 tech file: Makino DUO-Ver6-METRIC-V Guide.TECH
 *
 * Source: H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/SharedDefaults/wire/Power/Makino DUO-Ver6-METRIC-V Guide.TECH
 * Machine: Makino DUO43, DUO64
 * Control: Generic Makino
 * Units: Metric (mm)
 * Version: 6 (V-Guide Library)
 *
 * Key Differences from SP43/SP64:
 * - More advanced DUO series with V-Guide technology
 * - Metric units (mm) vs Imperial in SP series
 * - Multi-material support: Steel (St), Carbide (WC), Copper (Cu), Aluminum (AL), Graphite (Gr)
 * - Extended thickness ranges per wire diameter
 * - Multiple cutting methods per material (High Speed, Speed, Precision, Both Away, etc.)
 *
 * E-Code Families (DUO Series):
 * - 10xx: Steel roughing codes
 * - 1xxx (E15xx series): Steel skim/finish passes
 * - 40xx: Copper roughing codes
 * - 42xx-43xx: Copper skim/finish passes
 * - 50xx: Carbide (WC) roughing codes
 * - 52xx-55xx: Carbide skim/finish passes
 * - 60xx: Aluminum roughing codes
 * - 62xx: Aluminum skim/finish passes
 * - 70xx: Graphite roughing codes
 *
 * Critical for Wire EDM AI hardening - physics-validated power settings
 */

// ============================================================================
// Type Definitions
// ============================================================================

/** Wire diameter in mm (DUO uses metric) */
export type DuoWireDiameter = 0.1 | 0.15 | 0.2 | 0.25 | 0.3;

/** Material codes in DUO tech file */
export type DuoMaterial = 'St' | 'WC' | 'Cu' | 'AL' | 'Al' | 'Gr';

/** Cutting methods available in DUO */
export type DuoCuttingMethod =
  | 'High Speed'
  | 'Speed'
  | 'Precision'
  | 'Both Away'
  | 'Both Away HS'
  | 'Both Away Precision'
  | 'Both Away Coreless'
  | 'Varying Thickness'
  | '1 Pass Surface';

export interface DuoTechPass {
  /** Pass number (1 = roughing, subsequent = skim/finish passes) */
  passNum: number;
  /** Pass label/description */
  label: string;
  /** Approach enabled (Y/N) */
  approach: 'Y' | 'N';
  /** E-pac codes for this pass (cumulative from previous passes) */
  epacCodes: number[];
  /** Offsets for each pass (mm) */
  offsets: number[];
  /** Register numbers */
  registers: number[];
  /** Surface roughness Ra (micrometers) - single value or range as string */
  ra: string;
  /** Parsed Ra minimum value (micrometers) */
  raMin: number;
  /** Parsed Ra maximum value (micrometers) */
  raMax: number;
}

export interface DuoTechRecord {
  /** Record number in block */
  recordNum: number;
  /** Thickness in mm */
  thicknessMm: number;
  /** Taper angle in degrees */
  taperAngle: number;
  /** Total number of passes in this record */
  totalPasses: number;
  /** Pass data array */
  passes: DuoTechPass[];
}

export interface DuoTechBlock {
  /** Wire diameter (mm) */
  wireDiameterMm: DuoWireDiameter;
  /** Wire type (BS = Brass) */
  wireType: string;
  /** Material type */
  material: DuoMaterial;
  /** Cutting method */
  method: DuoCuttingMethod;
  /** Number of records in this block */
  recordCount: number;
  /** All records in this block */
  records: DuoTechRecord[];
}

export interface DuoTechFile {
  /** Manufacturer */
  manufacturer: string;
  /** Machine model */
  machine: string;
  /** Control type */
  control: string;
  /** Units */
  units: 'Metric';
  /** File version */
  version: number;
  /** Comment/description */
  comment: string;
  /** V-Guide specific identifier */
  vGuide: true;
  /** All record blocks */
  recordBlocks: DuoTechBlock[];
}

// ============================================================================
// V-Guide Specific Parameters
// ============================================================================

/**
 * V-Guide technology parameters specific to DUO series
 * V-Guide provides improved wire positioning and reduced wire vibration
 */
export const DUO_VGUIDE_PARAMETERS = {
  /** V-Guide reduces wire deflection by approximately 40% vs standard guides */
  wireDeflectionReduction: 0.4,
  /** Improved corner accuracy (micrometers) */
  cornerAccuracyImprovement: 2,
  /** V-Guide allows tighter inside radii */
  minInsideRadiusFactor: 0.85, // 85% of standard guide min radius
  /** Better performance on thin materials due to reduced vibration */
  thinMaterialThreshold: 5, // mm - V-Guide excels below this
  /** V-Guide maintains accuracy at higher feed rates */
  feedRateBoostFactor: 1.15, // 15% faster with same accuracy
} as const;

// ============================================================================
// E-Code Reference (DUO Series)
// ============================================================================

/**
 * E-Code families for Makino DUO43/DUO64
 * Material-specific code ranges
 */
export const DUO_ECODE_FAMILIES = {
  /** Steel roughing codes by wire diameter */
  STEEL_ROUGHING: {
    0.1: { base: 1006, increment: 10 },  // 1006, 1016, 1026, 1036, 1046...
    0.15: { base: 1006, increment: 10 },
    0.2: { base: 1021, increment: 10 },  // Various methods
    0.25: { base: 1021, increment: 10 },
    0.3: { base: 1031, increment: 10 },
  },
  /** Steel skim pass families */
  STEEL_SKIM: {
    0.1: { base: 1505 }, // E1505, E1506, E1507, E1508
    0.15: { base: 1505 },
    0.2: { base: 1301 }, // High Speed uses E13xx
    0.25: { base: 1341 },
    0.3: { base: 1461 },
  },
  /** Carbide (WC) roughing codes */
  CARBIDE_ROUGHING: {
    0.1: { base: 5006, increment: 10 },
    0.15: { base: 5006, increment: 10 },
    0.2: { base: 5023, increment: 10 },
    0.25: { base: 5023, increment: 10 },
  },
  /** Carbide skim pass families */
  CARBIDE_SKIM: {
    0.1: { base: 5505 },
    0.15: { base: 5505 },
    0.2: { base: 5275 },
    0.25: { base: 5275 },
  },
  /** Copper roughing codes */
  COPPER_ROUGHING: {
    0.2: { base: 4022, increment: 10 },
    0.25: { base: 4022, increment: 10 },
    0.3: { base: 4031, increment: 10 },
  },
  /** Copper skim pass families */
  COPPER_SKIM: {
    0.2: { base: 4273 },
    0.25: { base: 4273 },
    0.3: { base: 4361 },
  },
  /** Aluminum roughing codes */
  ALUMINUM_ROUGHING: {
    0.2: { base: 6023, increment: 10 },
    0.25: { base: 6023, increment: 10 },
    0.3: { base: 6031, increment: 10 },
  },
  /** Graphite roughing codes (typically 1-pass only) */
  GRAPHITE_ROUGHING: {
    0.2: { base: 7032, increment: 20 },
    0.25: { base: 7032, increment: 20 },
  },
} as const;

// ============================================================================
// Helper to parse Ra range strings
// ============================================================================

function parseRaRange(ra: string): { raMin: number; raMax: number } {
  const cleanRa = ra.replace(/\+\d+/, '').trim();
  if (cleanRa.includes('~')) {
    const parts = cleanRa.split('~').map(p => parseFloat(p.trim()));
    return { raMin: parts[0] ?? 0, raMax: parts[1] ?? parts[0] ?? 0 };
  }
  const val = parseFloat(cleanRa);
  return { raMin: val, raMax: val };
}

// ============================================================================
// 0.1mm Brass Wire - Steel - Both Away Precision Records
// ============================================================================

const DUO_01MM_STEEL_PRECISION_RECORDS: DuoTechRecord[] = [
  {
    recordNum: 1,
    thicknessMm: 1,
    taperAngle: 0,
    totalPasses: 5,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1006], offsets: [0.055], registers: [1], ra: '12~13', ...parseRaRange('12~13') },
      { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [1006, 1505], offsets: [0.075, 0.055], registers: [1, 2], ra: '9~10', ...parseRaRange('9~10') },
      { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1006, 1505, 1506], offsets: [0.089, 0.069, 0.054], registers: [1, 2, 3], ra: '9~9.5', ...parseRaRange('9~9.5') },
      { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1006, 1505, 1506, 1507], offsets: [0.094, 0.074, 0.059, 0.055], registers: [1, 2, 3, 4], ra: '3~3.5', ...parseRaRange('3~3.5') },
      { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1006, 1505, 1506, 1507, 1508], offsets: [0.095, 0.075, 0.060, 0.056, 0.054], registers: [1, 2, 3, 4, 5], ra: '2.5~3', ...parseRaRange('2.5~3') },
    ],
  },
  {
    recordNum: 2,
    thicknessMm: 3,
    taperAngle: 0,
    totalPasses: 5,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1016], offsets: [0.064], registers: [1], ra: '12.5~13', ...parseRaRange('12.5~13') },
      { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [1016, 1515], offsets: [0.076, 0.057], registers: [1, 2], ra: '9~10', ...parseRaRange('9~10') },
      { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1016, 1515, 1516], offsets: [0.087, 0.068, 0.053], registers: [1, 2, 3], ra: '9~9.5', ...parseRaRange('9~9.5') },
      { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1016, 1515, 1516, 1517], offsets: [0.094, 0.075, 0.060, 0.056], registers: [1, 2, 3, 4], ra: '3~3.5', ...parseRaRange('3~3.5') },
      { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1016, 1515, 1516, 1517, 1518], offsets: [0.095, 0.076, 0.061, 0.057, 0.054], registers: [1, 2, 3, 4, 5], ra: '2.5~3', ...parseRaRange('2.5~3') },
    ],
  },
  {
    recordNum: 3,
    thicknessMm: 5,
    taperAngle: 0,
    totalPasses: 5,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1026], offsets: [0.064], registers: [1], ra: '12~13', ...parseRaRange('12~13') },
      { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [1026, 1525], offsets: [0.077, 0.057], registers: [1, 2], ra: '9~10', ...parseRaRange('9~10') },
      { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1026, 1525, 1526], offsets: [0.087, 0.067, 0.052], registers: [1, 2, 3], ra: '9~9.5', ...parseRaRange('9~9.5') },
      { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1026, 1525, 1526, 1527], offsets: [0.093, 0.073, 0.058, 0.054], registers: [1, 2, 3, 4], ra: '3.5~4', ...parseRaRange('3.5~4') },
      { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1026, 1525, 1526, 1527, 1528], offsets: [0.095, 0.075, 0.060, 0.056, 0.054], registers: [1, 2, 3, 4, 5], ra: '2.5~3', ...parseRaRange('2.5~3') },
    ],
  },
  {
    recordNum: 4,
    thicknessMm: 10,
    taperAngle: 0,
    totalPasses: 5,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1036], offsets: [0.069], registers: [1], ra: '12~13', ...parseRaRange('12~13') },
      { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [1036, 1535], offsets: [0.085, 0.058], registers: [1, 2], ra: '9~10', ...parseRaRange('9~10') },
      { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1036, 1535, 1536], offsets: [0.096, 0.069, 0.054], registers: [1, 2, 3], ra: '9~9.5', ...parseRaRange('9~9.5') },
      { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1036, 1535, 1536, 1537], offsets: [0.101, 0.074, 0.059, 0.055], registers: [1, 2, 3, 4], ra: '3.5~4', ...parseRaRange('3.5~4') },
      { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1036, 1535, 1536, 1537, 1538], offsets: [0.103, 0.076, 0.061, 0.057, 0.055], registers: [1, 2, 3, 4, 5], ra: '2.5~3', ...parseRaRange('2.5~3') },
    ],
  },
  {
    recordNum: 5,
    thicknessMm: 15,
    taperAngle: 0,
    totalPasses: 5,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1046], offsets: [0.070], registers: [1], ra: '12~13', ...parseRaRange('12~13') },
      { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1046, 1545], offsets: [0.089, 0.059], registers: [1, 2], ra: '11~12', ...parseRaRange('11~12') },
      { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1046, 1545, 1546], offsets: [0.100, 0.070, 0.055], registers: [1, 2, 3], ra: '9.5~10', ...parseRaRange('9.5~10') },
      { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1046, 1545, 1546, 1547], offsets: [0.107, 0.077, 0.062, 0.056], registers: [1, 2, 3, 4], ra: '3.5~4', ...parseRaRange('3.5~4') },
      { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1046, 1545, 1546, 1547, 1548], offsets: [0.108, 0.078, 0.063, 0.057, 0.055], registers: [1, 2, 3, 4, 5], ra: '2.5~3', ...parseRaRange('2.5~3') },
    ],
  },
  {
    recordNum: 6,
    thicknessMm: 20,
    taperAngle: 0,
    totalPasses: 5,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1056], offsets: [0.072], registers: [1], ra: '12~13', ...parseRaRange('12~13') },
      { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1056, 1555], offsets: [0.089, 0.059], registers: [1, 2], ra: '11~12', ...parseRaRange('11~12') },
      { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1056, 1555, 1556], offsets: [0.100, 0.070, 0.055], registers: [1, 2, 3], ra: '9.5~10', ...parseRaRange('9.5~10') },
      { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1056, 1555, 1556, 1557], offsets: [0.107, 0.077, 0.062, 0.056], registers: [1, 2, 3, 4], ra: '3.5~4', ...parseRaRange('3.5~4') },
      { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1056, 1555, 1556, 1557, 1558], offsets: [0.108, 0.078, 0.063, 0.057, 0.055], registers: [1, 2, 3, 4, 5], ra: '2.5~3', ...parseRaRange('2.5~3') },
    ],
  },
];

// ============================================================================
// 0.1mm Brass Wire - Carbide (WC) - Both Away Precision Records
// ============================================================================

const DUO_01MM_CARBIDE_PRECISION_RECORDS: DuoTechRecord[] = [
  {
    recordNum: 1,
    thicknessMm: 1,
    taperAngle: 0,
    totalPasses: 5,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5006], offsets: [0.054], registers: [1], ra: '13~14', ...parseRaRange('13~14') },
      { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [5006, 5505], offsets: [0.076, 0.055], registers: [1, 2], ra: '7~8', ...parseRaRange('7~8') },
      { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [5006, 5505, 5506], offsets: [0.087, 0.066, 0.054], registers: [1, 2, 3], ra: '7~7.5', ...parseRaRange('7~7.5') },
      { passNum: 4, label: 'Finish 3', approach: 'N', epacCodes: [5006, 5505, 5506, 5507], offsets: [0.093, 0.072, 0.060, 0.058], registers: [1, 2, 3, 4], ra: '2.5~3', ...parseRaRange('2.5~3') },
      { passNum: 5, label: 'Finish 2', approach: 'N', epacCodes: [5006, 5505, 5506, 5507, 5508], offsets: [0.095, 0.074, 0.062, 0.060, 0.058], registers: [1, 2, 3, 4, 5], ra: '1.5~2', ...parseRaRange('1.5~2') },
    ],
  },
  {
    recordNum: 2,
    thicknessMm: 3,
    taperAngle: 0,
    totalPasses: 5,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5016], offsets: [0.061], registers: [1], ra: '12~13', ...parseRaRange('12~13') },
      { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [5016, 5515], offsets: [0.081, 0.055], registers: [1, 2], ra: '8~9', ...parseRaRange('8~9') },
      { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [5016, 5515, 5516], offsets: [0.090, 0.064, 0.052], registers: [1, 2, 3], ra: '7~7.5', ...parseRaRange('7~7.5') },
      { passNum: 4, label: 'Finish 3', approach: 'N', epacCodes: [5016, 5515, 5516, 5517], offsets: [0.094, 0.068, 0.056, 0.054], registers: [1, 2, 3, 4], ra: '2.5~3', ...parseRaRange('2.5~3') },
      { passNum: 5, label: 'Finish 2', approach: 'N', epacCodes: [5016, 5515, 5516, 5517, 5518], offsets: [0.096, 0.070, 0.058, 0.056, 0.054], registers: [1, 2, 3, 4, 5], ra: '1.5~2', ...parseRaRange('1.5~2') },
    ],
  },
  {
    recordNum: 3,
    thicknessMm: 5,
    taperAngle: 0,
    totalPasses: 5,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5026], offsets: [0.063], registers: [1], ra: '12~13', ...parseRaRange('12~13') },
      { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [5026, 5525], offsets: [0.083, 0.055], registers: [1, 2], ra: '8~9', ...parseRaRange('8~9') },
      { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [5026, 5525, 5526], offsets: [0.091, 0.063, 0.051], registers: [1, 2, 3], ra: '7~7.5', ...parseRaRange('7~7.5') },
      { passNum: 4, label: 'Finish 3', approach: 'N', epacCodes: [5026, 5525, 5526, 5527], offsets: [0.096, 0.068, 0.056, 0.054], registers: [1, 2, 3, 4], ra: '2.5~3', ...parseRaRange('2.5~3') },
      { passNum: 5, label: 'Finish 2', approach: 'N', epacCodes: [5026, 5525, 5526, 5527, 5528], offsets: [0.098, 0.070, 0.058, 0.056, 0.054], registers: [1, 2, 3, 4, 5], ra: '1.5~2', ...parseRaRange('1.5~2') },
    ],
  },
];

// ============================================================================
// 0.2mm Brass Wire - Steel - High Speed Records
// ============================================================================

const DUO_02MM_STEEL_HIGHSPEED_RECORDS: DuoTechRecord[] = [
  {
    recordNum: 1,
    thicknessMm: 20,
    taperAngle: 0,
    totalPasses: 3,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1051], offsets: [0.123], registers: [1], ra: '18~20', ...parseRaRange('18~20') },
      { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1051, 1301], offsets: [0.147, 0.110], registers: [1, 2], ra: '13~15', ...parseRaRange('13~15') },
      { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1051, 1301, 1302], offsets: [0.161, 0.121, 0.110], registers: [1, 2, 3], ra: '8~10', ...parseRaRange('8~10') },
    ],
  },
  {
    recordNum: 2,
    thicknessMm: 25,
    taperAngle: 0,
    totalPasses: 3,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1061], offsets: [0.128], registers: [1], ra: '18~20', ...parseRaRange('18~20') },
      { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1061, 1311], offsets: [0.149, 0.110], registers: [1, 2], ra: '13~15', ...parseRaRange('13~15') },
      { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1061, 1311, 1312], offsets: [0.161, 0.122, 0.110], registers: [1, 2, 3], ra: '8~10', ...parseRaRange('8~10') },
    ],
  },
  {
    recordNum: 3,
    thicknessMm: 30,
    taperAngle: 0,
    totalPasses: 3,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1071], offsets: [0.131], registers: [1], ra: '18~20', ...parseRaRange('18~20') },
      { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1071, 1321], offsets: [0.155, 0.110], registers: [1, 2], ra: '13~15', ...parseRaRange('13~15') },
      { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1071, 1321, 1322], offsets: [0.167, 0.122, 0.110], registers: [1, 2, 3], ra: '8~10', ...parseRaRange('8~10') },
    ],
  },
  {
    recordNum: 4,
    thicknessMm: 40,
    taperAngle: 0,
    totalPasses: 3,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1091], offsets: [0.137], registers: [1], ra: '18~20', ...parseRaRange('18~20') },
      { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1091, 1341], offsets: [0.159, 0.110], registers: [1, 2], ra: '13~15', ...parseRaRange('13~15') },
      { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1091, 1341, 1342], offsets: [0.171, 0.122, 0.110], registers: [1, 2, 3], ra: '8~10', ...parseRaRange('8~10') },
    ],
  },
  {
    recordNum: 5,
    thicknessMm: 50,
    taperAngle: 0,
    totalPasses: 3,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1111], offsets: [0.140], registers: [1], ra: '18~20', ...parseRaRange('18~20') },
      { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1111, 1361], offsets: [0.166, 0.112], registers: [1, 2], ra: '13~15', ...parseRaRange('13~15') },
      { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1111, 1361, 1362], offsets: [0.178, 0.124, 0.112], registers: [1, 2, 3], ra: '8~10', ...parseRaRange('8~10') },
    ],
  },
];

// ============================================================================
// 0.2mm Brass Wire - Copper (Cu) - Speed Records
// ============================================================================

const DUO_02MM_COPPER_SPEED_RECORDS: DuoTechRecord[] = [
  {
    recordNum: 1,
    thicknessMm: 5,
    taperAngle: 0,
    totalPasses: 4,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4022], offsets: [0.143], registers: [1], ra: '10', ...parseRaRange('10') },
      { passNum: 3, label: 'Finish 3', approach: 'N', epacCodes: [4022, 4273, 4274], offsets: [0.172, 0.114, 0.106], registers: [1, 2, 3], ra: '3', ...parseRaRange('3') },
      { passNum: 4, label: '+1 Finish 3', approach: 'N', epacCodes: [4022, 4273, 4273, 4274], offsets: [0.192, 0.134, 0.114, 0.106], registers: [1, 2, 3, 4], ra: '3 +1', ...parseRaRange('3') },
    ],
  },
  {
    recordNum: 2,
    thicknessMm: 10,
    taperAngle: 0,
    totalPasses: 4,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4032], offsets: [0.146], registers: [1], ra: '10', ...parseRaRange('10') },
      { passNum: 3, label: 'Finish 3', approach: 'N', epacCodes: [4032, 4283, 4284], offsets: [0.171, 0.116, 0.107], registers: [1, 2, 3], ra: '3', ...parseRaRange('3') },
      { passNum: 4, label: '+1 Finish 3', approach: 'N', epacCodes: [4032, 4283, 4283, 4284], offsets: [0.191, 0.136, 0.116, 0.107], registers: [1, 2, 3, 4], ra: '3 +1', ...parseRaRange('3') },
    ],
  },
  {
    recordNum: 3,
    thicknessMm: 20,
    taperAngle: 0,
    totalPasses: 4,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4052], offsets: [0.150], registers: [1], ra: '10', ...parseRaRange('10') },
      { passNum: 3, label: 'Finish 3', approach: 'N', epacCodes: [4052, 4303, 4304], offsets: [0.180, 0.120, 0.109], registers: [1, 2, 3], ra: '3', ...parseRaRange('3') },
      { passNum: 4, label: '+1 Finish 3', approach: 'N', epacCodes: [4052, 4303, 4303, 4304], offsets: [0.200, 0.140, 0.120, 0.109], registers: [1, 2, 3, 4], ra: '3 +1', ...parseRaRange('3') },
    ],
  },
  {
    recordNum: 4,
    thicknessMm: 30,
    taperAngle: 0,
    totalPasses: 4,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4072], offsets: [0.154], registers: [1], ra: '10', ...parseRaRange('10') },
      { passNum: 3, label: 'Finish 3', approach: 'N', epacCodes: [4072, 4323, 4324], offsets: [0.185, 0.124, 0.113], registers: [1, 2, 3], ra: '3', ...parseRaRange('3') },
      { passNum: 4, label: '+1 Finish 3', approach: 'N', epacCodes: [4072, 4323, 4323, 4324], offsets: [0.205, 0.144, 0.124, 0.113], registers: [1, 2, 3, 4], ra: '3 +1', ...parseRaRange('3') },
    ],
  },
];

// ============================================================================
// 0.2mm Brass Wire - Carbide (WC) - Precision Records
// ============================================================================

const DUO_02MM_CARBIDE_PRECISION_RECORDS: DuoTechRecord[] = [
  {
    recordNum: 1,
    thicknessMm: 5,
    taperAngle: 0,
    totalPasses: 5,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5023], offsets: [0.129], registers: [1], ra: '9.5~10', ...parseRaRange('9.5~10') },
      { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [5023, 5275], offsets: [0.154, 0.106], registers: [1, 2], ra: '8.5~9', ...parseRaRange('8.5~9') },
      { passNum: 3, label: 'Finish 6', approach: 'N', epacCodes: [5023, 5275, 5276], offsets: [0.161, 0.112, 0.107], registers: [1, 2, 3], ra: '5.5~6', ...parseRaRange('5.5~6') },
      { passNum: 4, label: 'Finish 3', approach: 'N', epacCodes: [5023, 5275, 5276, 5277], offsets: [0.165, 0.116, 0.111, 0.106], registers: [1, 2, 3, 4], ra: '2~2.5', ...parseRaRange('2~2.5') },
      { passNum: 5, label: 'Finish 2', approach: 'N', epacCodes: [5023, 5275, 5276, 5277, 5278], offsets: [0.166, 0.117, 0.112, 0.107, 0.105], registers: [1, 2, 3, 4, 5], ra: '1.5~2', ...parseRaRange('1.5~2') },
    ],
  },
  {
    recordNum: 2,
    thicknessMm: 10,
    taperAngle: 0,
    totalPasses: 5,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5033], offsets: [0.135], registers: [1], ra: '9.5~10', ...parseRaRange('9.5~10') },
      { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [5033, 5285], offsets: [0.161, 0.106], registers: [1, 2], ra: '8.5~9', ...parseRaRange('8.5~9') },
      { passNum: 3, label: 'Finish 6', approach: 'N', epacCodes: [5033, 5285, 5286], offsets: [0.168, 0.113, 0.107], registers: [1, 2, 3], ra: '5.5~6', ...parseRaRange('5.5~6') },
      { passNum: 4, label: 'Finish 3', approach: 'N', epacCodes: [5033, 5285, 5286, 5287], offsets: [0.172, 0.117, 0.111, 0.106], registers: [1, 2, 3, 4], ra: '2~2.5', ...parseRaRange('2~2.5') },
      { passNum: 5, label: 'Finish 2', approach: 'N', epacCodes: [5033, 5285, 5286, 5287, 5288], offsets: [0.173, 0.118, 0.112, 0.107, 0.105], registers: [1, 2, 3, 4, 5], ra: '1.5~2', ...parseRaRange('1.5~2') },
    ],
  },
  {
    recordNum: 3,
    thicknessMm: 20,
    taperAngle: 0,
    totalPasses: 5,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5053], offsets: [0.141], registers: [1], ra: '9.5~10', ...parseRaRange('9.5~10') },
      { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [5053, 5305], offsets: [0.168, 0.107], registers: [1, 2], ra: '8.5~9', ...parseRaRange('8.5~9') },
      { passNum: 3, label: 'Finish 6', approach: 'N', epacCodes: [5053, 5305, 5306], offsets: [0.175, 0.114, 0.107], registers: [1, 2, 3], ra: '5.5~6', ...parseRaRange('5.5~6') },
      { passNum: 4, label: 'Finish 3', approach: 'N', epacCodes: [5053, 5305, 5306, 5307], offsets: [0.179, 0.118, 0.111, 0.106], registers: [1, 2, 3, 4], ra: '2~2.5', ...parseRaRange('2~2.5') },
      { passNum: 5, label: 'Finish 2', approach: 'N', epacCodes: [5053, 5305, 5306, 5307, 5308], offsets: [0.180, 0.119, 0.112, 0.107, 0.105], registers: [1, 2, 3, 4, 5], ra: '1.5~2', ...parseRaRange('1.5~2') },
    ],
  },
  {
    recordNum: 4,
    thicknessMm: 30,
    taperAngle: 0,
    totalPasses: 5,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5073], offsets: [0.145], registers: [1], ra: '9.5~10', ...parseRaRange('9.5~10') },
      { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [5073, 5325], offsets: [0.173, 0.108], registers: [1, 2], ra: '8.5~9', ...parseRaRange('8.5~9') },
      { passNum: 3, label: 'Finish 6', approach: 'N', epacCodes: [5073, 5325, 5326], offsets: [0.181, 0.116, 0.108], registers: [1, 2, 3], ra: '5.5~6', ...parseRaRange('5.5~6') },
      { passNum: 4, label: 'Finish 3', approach: 'N', epacCodes: [5073, 5325, 5326, 5327], offsets: [0.185, 0.120, 0.112, 0.107], registers: [1, 2, 3, 4], ra: '2~2.5', ...parseRaRange('2~2.5') },
      { passNum: 5, label: 'Finish 2', approach: 'N', epacCodes: [5073, 5325, 5326, 5327, 5328], offsets: [0.186, 0.121, 0.113, 0.108, 0.106], registers: [1, 2, 3, 4, 5], ra: '1.5~2', ...parseRaRange('1.5~2') },
    ],
  },
];

// ============================================================================
// 0.2mm Brass Wire - Aluminum (AL) - Precision Records
// ============================================================================

const DUO_02MM_ALUMINUM_PRECISION_RECORDS: DuoTechRecord[] = [
  {
    recordNum: 1,
    thicknessMm: 5,
    taperAngle: 0,
    totalPasses: 3,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6023], offsets: [0.135], registers: [1], ra: '20', ...parseRaRange('20') },
      { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [6023, 6275], offsets: [0.163, 0.108], registers: [1, 2], ra: '12', ...parseRaRange('12') },
      { passNum: 3, label: 'Finish 4', approach: 'N', epacCodes: [6023, 6275, 6276], offsets: [0.170, 0.115, 0.105], registers: [1, 2, 3], ra: '4', ...parseRaRange('4') },
    ],
  },
  {
    recordNum: 2,
    thicknessMm: 10,
    taperAngle: 0,
    totalPasses: 3,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6033], offsets: [0.140], registers: [1], ra: '20', ...parseRaRange('20') },
      { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [6033, 6285], offsets: [0.168, 0.108], registers: [1, 2], ra: '12', ...parseRaRange('12') },
      { passNum: 3, label: 'Finish 4', approach: 'N', epacCodes: [6033, 6285, 6286], offsets: [0.176, 0.116, 0.106], registers: [1, 2, 3], ra: '4', ...parseRaRange('4') },
    ],
  },
  {
    recordNum: 3,
    thicknessMm: 15,
    taperAngle: 0,
    totalPasses: 3,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6043], offsets: [0.143], registers: [1], ra: '20', ...parseRaRange('20') },
      { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [6043, 6295], offsets: [0.172, 0.108], registers: [1, 2], ra: '12', ...parseRaRange('12') },
      { passNum: 3, label: 'Finish 4', approach: 'N', epacCodes: [6043, 6295, 6296], offsets: [0.180, 0.116, 0.106], registers: [1, 2, 3], ra: '4', ...parseRaRange('4') },
    ],
  },
  {
    recordNum: 4,
    thicknessMm: 20,
    taperAngle: 0,
    totalPasses: 3,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6053], offsets: [0.146], registers: [1], ra: '20', ...parseRaRange('20') },
      { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [6053, 6305], offsets: [0.176, 0.109], registers: [1, 2], ra: '12', ...parseRaRange('12') },
      { passNum: 3, label: 'Finish 4', approach: 'N', epacCodes: [6053, 6305, 6306], offsets: [0.184, 0.117, 0.107], registers: [1, 2, 3], ra: '4', ...parseRaRange('4') },
    ],
  },
  {
    recordNum: 5,
    thicknessMm: 30,
    taperAngle: 0,
    totalPasses: 3,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6073], offsets: [0.150], registers: [1], ra: '20', ...parseRaRange('20') },
      { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [6073, 6325], offsets: [0.182, 0.110], registers: [1, 2], ra: '12', ...parseRaRange('12') },
      { passNum: 3, label: 'Finish 4', approach: 'N', epacCodes: [6073, 6325, 6326], offsets: [0.190, 0.118, 0.108], registers: [1, 2, 3], ra: '4', ...parseRaRange('4') },
    ],
  },
];

// ============================================================================
// 0.2mm Brass Wire - Graphite (Gr) - Speed Records (1-pass only)
// ============================================================================

const DUO_02MM_GRAPHITE_SPEED_RECORDS: DuoTechRecord[] = [
  {
    recordNum: 1,
    thicknessMm: 10,
    taperAngle: 0,
    totalPasses: 1,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7032], offsets: [0.135], registers: [1], ra: '7', ...parseRaRange('7') },
    ],
  },
  {
    recordNum: 2,
    thicknessMm: 20,
    taperAngle: 0,
    totalPasses: 1,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7052], offsets: [0.135], registers: [1], ra: '7', ...parseRaRange('7') },
    ],
  },
  {
    recordNum: 3,
    thicknessMm: 30,
    taperAngle: 0,
    totalPasses: 1,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7072], offsets: [0.142], registers: [1], ra: '7', ...parseRaRange('7') },
    ],
  },
  {
    recordNum: 4,
    thicknessMm: 40,
    taperAngle: 0,
    totalPasses: 1,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7092], offsets: [0.146], registers: [1], ra: '7', ...parseRaRange('7') },
    ],
  },
  {
    recordNum: 5,
    thicknessMm: 50,
    taperAngle: 0,
    totalPasses: 1,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7112], offsets: [0.150], registers: [1], ra: '7', ...parseRaRange('7') },
    ],
  },
];

// ============================================================================
// Exported Record Arrays (Multi-Material Support)
// ============================================================================

/** All DUO tech records indexed by key */
export const MAKINO_DUO_RECORDS = {
  // 0.1mm wire
  '0.1_St_BothAwayPrecision': DUO_01MM_STEEL_PRECISION_RECORDS,
  '0.1_WC_BothAwayPrecision': DUO_01MM_CARBIDE_PRECISION_RECORDS,

  // 0.2mm wire
  '0.2_St_HighSpeed': DUO_02MM_STEEL_HIGHSPEED_RECORDS,
  '0.2_Cu_Speed': DUO_02MM_COPPER_SPEED_RECORDS,
  '0.2_WC_Precision': DUO_02MM_CARBIDE_PRECISION_RECORDS,
  '0.2_AL_Precision': DUO_02MM_ALUMINUM_PRECISION_RECORDS,
  '0.2_Gr_Speed': DUO_02MM_GRAPHITE_SPEED_RECORDS,
} as const;

/** Record key type for type-safe access */
export type DuoRecordKey = keyof typeof MAKINO_DUO_RECORDS;

// ============================================================================
// Complete Tech File Structure
// ============================================================================

export const MAKINO_DUO_TECH_FILE: DuoTechFile = {
  manufacturer: 'Makino',
  machine: 'DUO43,DUO64',
  control: 'Generic Makino',
  units: 'Metric',
  version: 6,
  comment: 'DUO-Ver6-METRIC-V Guide Library',
  vGuide: true,
  recordBlocks: [
    {
      wireDiameterMm: 0.1,
      wireType: 'BS',
      material: 'St',
      method: 'Both Away Precision',
      recordCount: DUO_01MM_STEEL_PRECISION_RECORDS.length,
      records: DUO_01MM_STEEL_PRECISION_RECORDS,
    },
    {
      wireDiameterMm: 0.1,
      wireType: 'BS',
      material: 'WC',
      method: 'Both Away Precision',
      recordCount: DUO_01MM_CARBIDE_PRECISION_RECORDS.length,
      records: DUO_01MM_CARBIDE_PRECISION_RECORDS,
    },
    {
      wireDiameterMm: 0.2,
      wireType: 'BS',
      material: 'St',
      method: 'High Speed',
      recordCount: DUO_02MM_STEEL_HIGHSPEED_RECORDS.length,
      records: DUO_02MM_STEEL_HIGHSPEED_RECORDS,
    },
    {
      wireDiameterMm: 0.2,
      wireType: 'BS',
      material: 'Cu',
      method: 'Speed',
      recordCount: DUO_02MM_COPPER_SPEED_RECORDS.length,
      records: DUO_02MM_COPPER_SPEED_RECORDS,
    },
    {
      wireDiameterMm: 0.2,
      wireType: 'BS',
      material: 'WC',
      method: 'Precision',
      recordCount: DUO_02MM_CARBIDE_PRECISION_RECORDS.length,
      records: DUO_02MM_CARBIDE_PRECISION_RECORDS,
    },
    {
      wireDiameterMm: 0.2,
      wireType: 'BS',
      material: 'AL',
      method: 'Precision',
      recordCount: DUO_02MM_ALUMINUM_PRECISION_RECORDS.length,
      records: DUO_02MM_ALUMINUM_PRECISION_RECORDS,
    },
    {
      wireDiameterMm: 0.2,
      wireType: 'BS',
      material: 'Gr',
      method: 'Speed',
      recordCount: DUO_02MM_GRAPHITE_SPEED_RECORDS.length,
      records: DUO_02MM_GRAPHITE_SPEED_RECORDS,
    },
  ],
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Find the closest matching DUO record for given parameters
 * @param wireDiameterMm Wire diameter in mm (0.1, 0.15, 0.2, 0.25, 0.3)
 * @param material Material code ('St', 'WC', 'Cu', 'AL', 'Gr')
 * @param method Cutting method
 * @param thicknessMm Stock thickness in mm
 * @returns Matching record or undefined
 */
export function findDuoRecord(
  wireDiameterMm: DuoWireDiameter,
  material: DuoMaterial,
  method: DuoCuttingMethod,
  thicknessMm: number
): DuoTechRecord | undefined {
  // Find matching block
  const block = MAKINO_DUO_TECH_FILE.recordBlocks.find(
    (b) => b.wireDiameterMm === wireDiameterMm && b.material === material && b.method === method
  );

  if (!block) return undefined;

  // Find exact match or closest lower thickness
  let bestMatch: DuoTechRecord | undefined;
  for (const record of block.records) {
    if (record.thicknessMm === thicknessMm) {
      return record;
    }
    if (record.thicknessMm < thicknessMm) {
      bestMatch = record;
    }
  }

  return bestMatch;
}

/**
 * Find any DUO record matching material and thickness (auto-selects method)
 * @param material Material code
 * @param thicknessMm Stock thickness in mm
 * @param preferredWireMm Preferred wire diameter (optional, defaults to 0.2)
 * @returns Best matching record and block info, or undefined
 */
export function findDuoRecordAuto(
  material: DuoMaterial,
  thicknessMm: number,
  preferredWireMm: DuoWireDiameter = 0.2
): { record: DuoTechRecord; block: DuoTechBlock } | undefined {
  // Try preferred wire first
  let matchingBlocks = MAKINO_DUO_TECH_FILE.recordBlocks.filter(
    (b) => b.material === material && b.wireDiameterMm === preferredWireMm
  );

  // Fall back to any wire size
  if (matchingBlocks.length === 0) {
    matchingBlocks = MAKINO_DUO_TECH_FILE.recordBlocks.filter((b) => b.material === material);
  }

  if (matchingBlocks.length === 0) return undefined;

  // Find best match across all matching blocks
  let bestMatch: { record: DuoTechRecord; block: DuoTechBlock } | undefined;
  let bestThicknessDiff = Infinity;

  for (const block of matchingBlocks) {
    for (const record of block.records) {
      const diff = Math.abs(record.thicknessMm - thicknessMm);
      if (diff < bestThicknessDiff) {
        bestThicknessDiff = diff;
        bestMatch = { record, block };
      }
      // Exact match, return immediately
      if (diff === 0) {
        return bestMatch;
      }
    }
  }

  return bestMatch;
}

/**
 * Get recommended roughing offset for DUO machines
 * @param material Material code
 * @param thicknessMm Stock thickness in mm
 * @param wireDiameterMm Wire diameter in mm
 * @returns Roughing offset in mm or undefined
 */
export function getDuoRoughingOffset(
  material: DuoMaterial,
  thicknessMm: number,
  wireDiameterMm: DuoWireDiameter = 0.2
): number | undefined {
  const result = findDuoRecordAuto(material, thicknessMm, wireDiameterMm);
  if (!result || !result.record.passes[0]) return undefined;
  return result.record.passes[0].offsets[0];
}

/**
 * Get best achievable surface roughness Ra for DUO
 * @param material Material code
 * @param thicknessMm Stock thickness in mm
 * @param wireDiameterMm Wire diameter in mm
 * @returns Best Ra achievable (micrometers) as { min, max } or undefined
 */
export function getDuoBestRa(
  material: DuoMaterial,
  thicknessMm: number,
  wireDiameterMm: DuoWireDiameter = 0.2
): { min: number; max: number } | undefined {
  const result = findDuoRecordAuto(material, thicknessMm, wireDiameterMm);
  if (!result || result.record.passes.length === 0) return undefined;

  // Return Ra from the last (finest) pass
  const lastPass = result.record.passes[result.record.passes.length - 1];
  return { min: lastPass.raMin, max: lastPass.raMax };
}

/**
 * Get E-pac codes for a specific pass sequence
 * @param material Material code
 * @param thicknessMm Stock thickness in mm
 * @param numPasses Number of passes to include
 * @param wireDiameterMm Wire diameter in mm
 * @returns Array of E-pac codes or undefined
 */
export function getDuoEpacCodes(
  material: DuoMaterial,
  thicknessMm: number,
  numPasses: number,
  wireDiameterMm: DuoWireDiameter = 0.2
): number[] | undefined {
  const result = findDuoRecordAuto(material, thicknessMm, wireDiameterMm);
  if (!result) return undefined;

  const passIndex = Math.min(numPasses - 1, result.record.passes.length - 1);
  return result.record.passes[passIndex]?.epacCodes;
}

/**
 * Get all offsets for a specific pass configuration
 * @param material Material code
 * @param thicknessMm Stock thickness in mm
 * @param numPasses Number of passes
 * @param wireDiameterMm Wire diameter in mm
 * @returns Array of offsets in mm or undefined
 */
export function getDuoOffsets(
  material: DuoMaterial,
  thicknessMm: number,
  numPasses: number,
  wireDiameterMm: DuoWireDiameter = 0.2
): number[] | undefined {
  const result = findDuoRecordAuto(material, thicknessMm, wireDiameterMm);
  if (!result) return undefined;

  const passIndex = Math.min(numPasses - 1, result.record.passes.length - 1);
  return result.record.passes[passIndex]?.offsets;
}

/**
 * Get complete pass data for optimal surface finish
 * @param material Material code
 * @param thicknessMm Stock thickness in mm
 * @param targetRa Target surface roughness in micrometers
 * @param wireDiameterMm Wire diameter in mm
 * @returns Pass data that achieves target Ra or best available
 */
export function getDuoPassesForRa(
  material: DuoMaterial,
  thicknessMm: number,
  targetRa: number,
  wireDiameterMm: DuoWireDiameter = 0.2
): DuoTechPass[] | undefined {
  const result = findDuoRecordAuto(material, thicknessMm, wireDiameterMm);
  if (!result) return undefined;

  // Find the minimum number of passes that achieves target Ra
  for (let i = 0; i < result.record.passes.length; i++) {
    const pass = result.record.passes[i];
    if (pass.raMax <= targetRa) {
      // Return all passes up to and including this one
      return result.record.passes.slice(0, i + 1);
    }
  }

  // If target can't be achieved, return all passes (best available)
  return result.record.passes;
}

/**
 * Compare DUO performance to SP43/SP64 for a given scenario
 * @param thicknessMm Material thickness
 * @param material Material type
 * @returns Performance comparison metrics
 */
export function compareDuoToSP(
  thicknessMm: number,
  material: DuoMaterial
): {
  duoAdvantages: string[];
  vGuideImpact: string;
  recommendedMachine: 'DUO' | 'SP' | 'EITHER';
} {
  const advantages: string[] = [];

  // V-Guide advantages on thin materials
  if (thicknessMm < DUO_VGUIDE_PARAMETERS.thinMaterialThreshold) {
    advantages.push(
      `V-Guide excels on thin material (${thicknessMm}mm < ${DUO_VGUIDE_PARAMETERS.thinMaterialThreshold}mm threshold)`
    );
    advantages.push(
      `${(DUO_VGUIDE_PARAMETERS.wireDeflectionReduction * 100).toFixed(0)}% wire deflection reduction`
    );
  }

  // Carbide-specific advantages
  if (material === 'WC') {
    advantages.push('DUO has extensive carbide (WC) technology database');
    advantages.push('Better surface finish achievable on carbide (Ra 1.5-2um)');
  }

  // Multi-material capability
  if (['Cu', 'AL', 'Gr'].includes(material)) {
    advantages.push(`DUO has native ${material} cutting parameters`);
  }

  const vGuideImpact =
    thicknessMm < 10
      ? 'High impact - V-Guide significantly improves accuracy on thin sections'
      : thicknessMm < 30
        ? 'Moderate impact - V-Guide provides better corner accuracy'
        : 'Lower impact - standard guides sufficient for thick sections';

  const recommendedMachine =
    advantages.length > 2
      ? 'DUO'
      : thicknessMm > 50 && material === 'St'
        ? 'SP'
        : 'EITHER';

  return { duoAdvantages: advantages, vGuideImpact, recommendedMachine };
}

/**
 * Get available wire diameters for a material
 * @param material Material code
 * @returns Array of available wire diameters in mm
 */
export function getAvailableWireDiameters(material: DuoMaterial): DuoWireDiameter[] {
  const wireSizes = new Set<DuoWireDiameter>();

  for (const block of MAKINO_DUO_TECH_FILE.recordBlocks) {
    if (block.material === material) {
      wireSizes.add(block.wireDiameterMm);
    }
  }

  return Array.from(wireSizes).sort((a, b) => a - b);
}

/**
 * Get available cutting methods for a material and wire size
 * @param material Material code
 * @param wireDiameterMm Wire diameter in mm
 * @returns Array of available cutting methods
 */
export function getAvailableMethods(
  material: DuoMaterial,
  wireDiameterMm: DuoWireDiameter
): DuoCuttingMethod[] {
  const methods = new Set<DuoCuttingMethod>();

  for (const block of MAKINO_DUO_TECH_FILE.recordBlocks) {
    if (block.material === material && block.wireDiameterMm === wireDiameterMm) {
      methods.add(block.method);
    }
  }

  return Array.from(methods);
}

/**
 * Get thickness range for a specific configuration
 * @param material Material code
 * @param wireDiameterMm Wire diameter in mm
 * @param method Cutting method
 * @returns Min/max thickness or undefined
 */
export function getDuoThicknessRange(
  material: DuoMaterial,
  wireDiameterMm: DuoWireDiameter,
  method?: DuoCuttingMethod
): { minMm: number; maxMm: number } | undefined {
  let matchingBlocks = MAKINO_DUO_TECH_FILE.recordBlocks.filter(
    (b) => b.material === material && b.wireDiameterMm === wireDiameterMm
  );

  if (method) {
    matchingBlocks = matchingBlocks.filter((b) => b.method === method);
  }

  if (matchingBlocks.length === 0) return undefined;

  let minMm = Infinity;
  let maxMm = -Infinity;

  for (const block of matchingBlocks) {
    for (const record of block.records) {
      minMm = Math.min(minMm, record.thicknessMm);
      maxMm = Math.max(maxMm, record.thicknessMm);
    }
  }

  return { minMm, maxMm };
}
