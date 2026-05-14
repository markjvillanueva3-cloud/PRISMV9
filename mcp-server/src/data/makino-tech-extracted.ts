/**
 * Makino SP43/SP64 Wire EDM Technology Data
 * Extracted from Mastercam X8 tech file: Makino (SP43,SP64).tech
 *
 * Source: H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/SharedDefaults/wire/Power/Makino (SP43,SP64).tech
 * Machine: Makino SP43, SP64
 * Control: MGW-S
 * Units: Originally in Inches (converted to mm where noted)
 *
 * E-Code Families:
 * - 10xx: Roughing codes (thickness-dependent, increments by 10 per 0.25" thickness)
 * - 14xx/15xx: High Speed skim passes
 * - 26xx/27xx: High Precision skim passes
 *
 * Critical for Wire EDM AI hardening - physics-validated power settings
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface MakinoTechPass {
  /** Pass number (1 = roughing, subsequent = skim/finish passes) */
  passNum: number;
  /** Pass label/description */
  label: string;
  /** Approach enabled (Y/N) */
  approach: 'Y' | 'N';
  /** E-pac codes for this pass (cumulative from previous passes) */
  epacCodes: number[];
  /** Offsets for each pass (inches) */
  offsets: number[];
  /** Register numbers */
  registers: number[];
  /** Surface roughness Ra (microinches) */
  ra: number;
}

export interface MakinoTechRecord {
  /** Record number in block */
  recordNum: number;
  /** Thickness in inches (original) */
  thicknessInch: number;
  /** Thickness in mm (converted: inch * 25.4) */
  thicknessMm: number;
  /** Taper angle in degrees */
  taperAngle: number;
  /** Total number of passes in this record */
  totalPasses: number;
  /** Pass data array */
  passes: MakinoTechPass[];
}

export interface MakinoTechBlock {
  /** Wire diameter (inches) */
  wireDiameter: string;
  /** Wire type (BS = Brass) */
  wireType: string;
  /** Material type */
  material: string;
  /** Cutting method */
  method: string;
  /** Number of records in this block */
  recordCount: number;
  /** All records in this block */
  records: MakinoTechRecord[];
}

export interface MakinoTechFile {
  /** Manufacturer */
  manufacturer: string;
  /** Machine model */
  machine: string;
  /** Control type */
  control: string;
  /** Original units */
  units: string;
  /** File version */
  version: number;
  /** Comment/description */
  comment: string;
  /** All record blocks */
  recordBlocks: MakinoTechBlock[];
}

// ============================================================================
// E-Code Reference
// ============================================================================

/**
 * E-Code families for Makino SP43/SP64
 * These codes correspond to power settings in the machine's technology database
 */
export const MAKINO_ECODE_FAMILIES = {
  /** Roughing codes by wire diameter and thickness */
  ROUGHING: {
    '0.006': {
      // 0.006" wire - roughing E-codes for High Precision
      '0.25': 1025,
      '0.50': 1035,
      '0.75': 1045,
      '1.00': 1055,
      '1.25': 1065,
      '1.50': 1075,
    },
    '0.008': {
      // 0.008" wire - roughing E-codes for High Precision
      '0.25': 1025,
      '0.50': 1035,
      '0.75': 1045,
      '1.00': 1055,
      '1.25': 1065,
      '1.50': 1075,
      '1.75': 1085,
      '2.00': 1095,
      '2.25': 1105,
      '2.50': 1115,
      '3.00': 1135,
    },
    '0.010': {
      // 0.010" wire - roughing E-codes for High Speed
      '0.75': 1042,
      '1.00': 1052,
      '1.25': 1062,
      '1.50': 1072,
      '1.75': 1082,
      '2.00': 1092,
      '2.25': 1102,
      '2.50': 1112,
      '2.75': 1122,
      '3.00': 1132,
    },
  },
  /** High Precision skim pass families (0.006" and 0.008" wire) */
  HIGH_PRECISION_SKIM: {
    '0.006': { base: 2671 }, // E2671-2674 sequence
    '0.008': { base: 2674 }, // E2674-2707 sequence by thickness
  },
  /** High Speed skim pass families (0.010" wire) */
  HIGH_SPEED_SKIM: {
    '0.010': { base: 1442 }, // E14xx/15xx sequence
  },
} as const;

// ============================================================================
// 0.006" Brass Wire - Steel - High Precision Records
// ============================================================================

const MAKINO_006_HIGH_PRECISION_RECORDS: MakinoTechRecord[] = [
  // Record 1: 0.25" (6.35mm) - 5 passes
  {
    recordNum: 1,
    thicknessInch: 0.25,
    thicknessMm: 6.35,
    taperAngle: 0,
    totalPasses: 5,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1025], offsets: [0.0038], registers: [1], ra: 64 },
      { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1025, 2671], offsets: [0.0049, 0.0032], registers: [1, 2], ra: 46 },
      { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1025, 2671, 2672], offsets: [0.0052, 0.0035, 0.0032], registers: [1, 2, 3], ra: 36 },
      { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1025, 2671, 2672, 2673], offsets: [0.0054, 0.0037, 0.0034, 0.0033], registers: [1, 2, 3, 4], ra: 15 },
      { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1025, 2671, 2672, 2673, 2674], offsets: [0.0054, 0.0038, 0.0035, 0.0033, 0.0033], registers: [1, 2, 3, 4, 5], ra: 10 },
    ],
  },
  // Record 2: 0.50" (12.7mm) - 5 passes
  {
    recordNum: 2,
    thicknessInch: 0.50,
    thicknessMm: 12.7,
    taperAngle: 0,
    totalPasses: 5,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1035], offsets: [0.0041], registers: [1], ra: 64 },
      { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1035, 2691], offsets: [0.0050, 0.0033], registers: [1, 2], ra: 46 },
      { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1035, 2691, 2692], offsets: [0.0053, 0.0036, 0.0032], registers: [1, 2, 3], ra: 36 },
      { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1035, 2691, 2692, 2693], offsets: [0.0055, 0.0038, 0.0034, 0.0033], registers: [1, 2, 3, 4], ra: 15 },
      { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1035, 2691, 2692, 2693, 2694], offsets: [0.0055, 0.0038, 0.0034, 0.0033, 0.0033], registers: [1, 2, 3, 4, 5], ra: 10 },
    ],
  },
  // Record 3: 0.75" (19.05mm) - 5 passes
  {
    recordNum: 3,
    thicknessInch: 0.75,
    thicknessMm: 19.05,
    taperAngle: 0,
    totalPasses: 5,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1045], offsets: [0.0042], registers: [1], ra: 64 },
      { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1045, 2701], offsets: [0.0051, 0.0033], registers: [1, 2], ra: 46 },
      { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1045, 2701, 2702], offsets: [0.0054, 0.0036, 0.0032], registers: [1, 2, 3], ra: 36 },
      { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1045, 2701, 2702, 2703], offsets: [0.0056, 0.0038, 0.0034, 0.0033], registers: [1, 2, 3, 4], ra: 15 },
      { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1045, 2701, 2702, 2703, 2704], offsets: [0.0056, 0.0038, 0.0034, 0.0033, 0.0033], registers: [1, 2, 3, 4, 5], ra: 10 },
    ],
  },
  // Record 4: 1.00" (25.4mm) - 5 passes
  {
    recordNum: 4,
    thicknessInch: 1.00,
    thicknessMm: 25.4,
    taperAngle: 0,
    totalPasses: 5,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1055], offsets: [0.0043], registers: [1], ra: 64 },
      { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1055, 2711], offsets: [0.0052, 0.0034], registers: [1, 2], ra: 46 },
      { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1055, 2711, 2712], offsets: [0.0055, 0.0037, 0.0033], registers: [1, 2, 3], ra: 36 },
      { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1055, 2711, 2712, 2713], offsets: [0.0057, 0.0039, 0.0035, 0.0033], registers: [1, 2, 3, 4], ra: 15 },
      { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1055, 2711, 2712, 2713, 2714], offsets: [0.0057, 0.0039, 0.0035, 0.0033, 0.0033], registers: [1, 2, 3, 4, 5], ra: 10 },
    ],
  },
];

// ============================================================================
// 0.008" Brass Wire - Steel - High Precision Records
// ============================================================================

const MAKINO_008_HIGH_PRECISION_RECORDS: MakinoTechRecord[] = [
  // Record 1: 0.25" (6.35mm) - 8 passes (includes +1 finish variants)
  {
    recordNum: 1,
    thicknessInch: 0.25,
    thicknessMm: 6.35,
    taperAngle: 0,
    totalPasses: 8,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1025], offsets: [0.0049], registers: [1], ra: 106 },
      { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1025, 2674], offsets: [0.0060, 0.0042], registers: [1, 2], ra: 51 },
      { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1025, 2674, 2675], offsets: [0.0063, 0.0046, 0.0042], registers: [1, 2, 3], ra: 36 },
      { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1025, 2674, 2675, 2676], offsets: [0.0064, 0.0047, 0.0043, 0.0042], registers: [1, 2, 3, 4], ra: 15 },
      { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [1025, 2674, 2675, 2676, 2677], offsets: [0.0065, 0.0048, 0.0044, 0.0043, 0.0043], registers: [1, 2, 3, 4, 5], ra: 6 },
    ],
  },
  // Record 2: 0.50" (12.7mm) - 8 passes
  {
    recordNum: 2,
    thicknessInch: 0.50,
    thicknessMm: 12.7,
    taperAngle: 0,
    totalPasses: 8,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1035], offsets: [0.0050], registers: [1], ra: 106 },
      { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1035, 2694], offsets: [0.0061, 0.0043], registers: [1, 2], ra: 51 },
      { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1035, 2694, 2695], offsets: [0.0065, 0.0046, 0.0043], registers: [1, 2, 3], ra: 36 },
      { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1035, 2694, 2695, 2696], offsets: [0.0066, 0.0047, 0.0044, 0.0043], registers: [1, 2, 3, 4], ra: 15 },
      { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [1035, 2694, 2695, 2696, 2697], offsets: [0.0067, 0.0048, 0.0045, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], ra: 6 },
    ],
  },
  // Record 3: 1.00" (25.4mm) - 8 passes
  {
    recordNum: 3,
    thicknessInch: 1.00,
    thicknessMm: 25.4,
    taperAngle: 0,
    totalPasses: 8,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1055], offsets: [0.0053], registers: [1], ra: 106 },
      { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1055, 2714], offsets: [0.0064, 0.0043], registers: [1, 2], ra: 64 },
      { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1055, 2714, 2715], offsets: [0.0067, 0.0046, 0.0043], registers: [1, 2, 3], ra: 36 },
      { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1055, 2714, 2715, 2716], offsets: [0.0068, 0.0047, 0.0044, 0.0043], registers: [1, 2, 3, 4], ra: 15 },
      { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [1055, 2714, 2715, 2716, 2717], offsets: [0.0069, 0.0048, 0.0045, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], ra: 6 },
    ],
  },
  // Record 4: 1.50" (38.1mm) - 8 passes
  {
    recordNum: 4,
    thicknessInch: 1.50,
    thicknessMm: 38.1,
    taperAngle: 0,
    totalPasses: 8,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1075], offsets: [0.0055], registers: [1], ra: 106 },
      { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1075, 2734], offsets: [0.0065, 0.0043], registers: [1, 2], ra: 64 },
      { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1075, 2734, 2735], offsets: [0.0069, 0.0047, 0.0043], registers: [1, 2, 3], ra: 36 },
      { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1075, 2734, 2735, 2736], offsets: [0.0070, 0.0047, 0.0044, 0.0043], registers: [1, 2, 3, 4], ra: 20 },
      { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1075, 2734, 2735, 2736, 2737], offsets: [0.0071, 0.0048, 0.0045, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], ra: 10 },
    ],
  },
  // Record 5: 2.00" (50.8mm) - 8 passes
  {
    recordNum: 5,
    thicknessInch: 2.00,
    thicknessMm: 50.8,
    taperAngle: 0,
    totalPasses: 8,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1095], offsets: [0.0056], registers: [1], ra: 106 },
      { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1095, 2754], offsets: [0.0067, 0.0043], registers: [1, 2], ra: 64 },
      { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1095, 2754, 2755], offsets: [0.0071, 0.0047, 0.0043], registers: [1, 2, 3], ra: 36 },
      { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1095, 2754, 2755, 2756], offsets: [0.0072, 0.0048, 0.0044, 0.0043], registers: [1, 2, 3, 4], ra: 20 },
      { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1095, 2754, 2755, 2756, 2757], offsets: [0.0073, 0.0048, 0.0045, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], ra: 10 },
    ],
  },
  // Record 6: 2.50" (63.5mm) - 8 passes
  {
    recordNum: 6,
    thicknessInch: 2.50,
    thicknessMm: 63.5,
    taperAngle: 0,
    totalPasses: 8,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1115], offsets: [0.0057], registers: [1], ra: 106 },
      { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1115, 2774], offsets: [0.0068, 0.0044], registers: [1, 2], ra: 64 },
      { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1115, 2774, 2775], offsets: [0.0072, 0.0048, 0.0044], registers: [1, 2, 3], ra: 36 },
      { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1115, 2774, 2775, 2776], offsets: [0.0074, 0.0049, 0.0045, 0.0044], registers: [1, 2, 3, 4], ra: 20 },
      { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1115, 2774, 2775, 2776, 2777], offsets: [0.0074, 0.0049, 0.0045, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], ra: 10 },
    ],
  },
  // Record 7: 3.00" (76.2mm) - 8 passes
  {
    recordNum: 7,
    thicknessInch: 3.00,
    thicknessMm: 76.2,
    taperAngle: 0,
    totalPasses: 8,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1135], offsets: [0.0058], registers: [1], ra: 106 },
      { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1135, 2794], offsets: [0.0069, 0.0044], registers: [1, 2], ra: 64 },
      { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1135, 2794, 2795], offsets: [0.0073, 0.0048, 0.0044], registers: [1, 2, 3], ra: 36 },
      { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1135, 2794, 2795, 2796], offsets: [0.0075, 0.0050, 0.0046, 0.0044], registers: [1, 2, 3, 4], ra: 20 },
      { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1135, 2794, 2795, 2796, 2797], offsets: [0.0075, 0.0050, 0.0046, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], ra: 10 },
    ],
  },
];

// ============================================================================
// 0.010" Brass Wire - Steel - High Speed Records
// ============================================================================

const MAKINO_010_HIGH_SPEED_RECORDS: MakinoTechRecord[] = [
  // Record 1: 0.75" (19.05mm) - 3 passes (High Speed 1.2)
  {
    recordNum: 1,
    thicknessInch: 0.75,
    thicknessMm: 19.05,
    taperAngle: 0,
    totalPasses: 3,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1042], offsets: [0.0058], registers: [1], ra: 120 },
      { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1042, 1442], offsets: [0.0067, 0.0051], registers: [1, 2], ra: 74 },
      { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1042, 1442, 1443], offsets: [0.0071, 0.0055, 0.0051], registers: [1, 2, 3], ra: 33 },
    ],
  },
  // Record 2: 1.00" (25.4mm) - 3 passes (High Speed 1.2)
  {
    recordNum: 2,
    thicknessInch: 1.00,
    thicknessMm: 25.4,
    taperAngle: 0,
    totalPasses: 3,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1052], offsets: [0.0060], registers: [1], ra: 120 },
      { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1052, 1452], offsets: [0.0072, 0.0052], registers: [1, 2], ra: 74 },
      { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1052, 1452, 1453], offsets: [0.0077, 0.0057, 0.0052], registers: [1, 2, 3], ra: 33 },
    ],
  },
  // Record 3: 1.50" (38.1mm) - 3 passes (High Speed 1.2)
  {
    recordNum: 3,
    thicknessInch: 1.50,
    thicknessMm: 38.1,
    taperAngle: 0,
    totalPasses: 3,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1072], offsets: [0.0064], registers: [1], ra: 120 },
      { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1072, 1472], offsets: [0.0074, 0.0054], registers: [1, 2], ra: 74 },
      { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1072, 1472, 1473], offsets: [0.0079, 0.0059, 0.0054], registers: [1, 2, 3], ra: 33 },
    ],
  },
  // Record 4: 2.00" (50.8mm) - 3 passes (High Speed 1.2)
  {
    recordNum: 4,
    thicknessInch: 2.00,
    thicknessMm: 50.8,
    taperAngle: 0,
    totalPasses: 3,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1092], offsets: [0.0066], registers: [1], ra: 120 },
      { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1092, 1492], offsets: [0.0078, 0.0054], registers: [1, 2], ra: 74 },
      { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1092, 1492, 1493], offsets: [0.0083, 0.0059, 0.0054], registers: [1, 2, 3], ra: 33 },
    ],
  },
  // Record 5: 2.50" (63.5mm) - 3 passes (High Speed 1.2)
  {
    recordNum: 5,
    thicknessInch: 2.50,
    thicknessMm: 63.5,
    taperAngle: 0,
    totalPasses: 3,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1112], offsets: [0.0068], registers: [1], ra: 120 },
      { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1112, 1512], offsets: [0.0078, 0.0053], registers: [1, 2], ra: 74 },
      { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1112, 1512, 1513], offsets: [0.0084, 0.0058, 0.0053], registers: [1, 2, 3], ra: 33 },
    ],
  },
  // Record 6: 3.00" (76.2mm) - 3 passes (High Speed 1.2)
  {
    recordNum: 6,
    thicknessInch: 3.00,
    thicknessMm: 76.2,
    taperAngle: 0,
    totalPasses: 3,
    passes: [
      { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1132], offsets: [0.0069], registers: [1], ra: 120 },
      { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1132, 1532], offsets: [0.0080, 0.0053], registers: [1, 2], ra: 74 },
      { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1132, 1532, 1533], offsets: [0.0085, 0.0058, 0.0053], registers: [1, 2, 3], ra: 33 },
    ],
  },
];

// ============================================================================
// Combined Records Export
// ============================================================================

/**
 * All extracted technology records organized by wire diameter and method
 */
export const MAKINO_TECH_RECORDS: {
  '0.006_HIGH_PRECISION': MakinoTechRecord[];
  '0.008_HIGH_PRECISION': MakinoTechRecord[];
  '0.010_HIGH_SPEED': MakinoTechRecord[];
} = {
  '0.006_HIGH_PRECISION': MAKINO_006_HIGH_PRECISION_RECORDS,
  '0.008_HIGH_PRECISION': MAKINO_008_HIGH_PRECISION_RECORDS,
  '0.010_HIGH_SPEED': MAKINO_010_HIGH_SPEED_RECORDS,
};

/**
 * Complete tech file structure
 */
export const MAKINO_TECH_FILE: MakinoTechFile = {
  manufacturer: 'Makino',
  machine: 'SP43, SP64',
  control: 'MGW-S',
  units: 'Inch',
  version: 5,
  comment: 'Makino SP43,SP64 w/ MGW-S Library',
  recordBlocks: [
    {
      wireDiameter: '0.006',
      wireType: 'BS',
      material: 'St',
      method: 'High Precision',
      recordCount: MAKINO_006_HIGH_PRECISION_RECORDS.length,
      records: MAKINO_006_HIGH_PRECISION_RECORDS,
    },
    {
      wireDiameter: '0.008',
      wireType: 'BS',
      material: 'St',
      method: 'High Precision',
      recordCount: MAKINO_008_HIGH_PRECISION_RECORDS.length,
      records: MAKINO_008_HIGH_PRECISION_RECORDS,
    },
    {
      wireDiameter: '0.010',
      wireType: 'BS',
      material: 'St',
      method: 'High Speed 1.2',
      recordCount: MAKINO_010_HIGH_SPEED_RECORDS.length,
      records: MAKINO_010_HIGH_SPEED_RECORDS,
    },
  ],
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Find the closest matching record for a given thickness and wire diameter
 * @param wireDiameter Wire diameter string (e.g., '0.008')
 * @param method Cutting method ('HIGH_PRECISION' or 'HIGH_SPEED')
 * @param thicknessInch Stock thickness in inches
 * @returns Matching record or undefined
 */
export function findMakinoRecord(
  wireDiameter: '0.006' | '0.008' | '0.010',
  method: 'HIGH_PRECISION' | 'HIGH_SPEED',
  thicknessInch: number
): MakinoTechRecord | undefined {
  const key = `${wireDiameter}_${method}` as keyof typeof MAKINO_TECH_RECORDS;
  const records = MAKINO_TECH_RECORDS[key];

  if (!records) return undefined;

  // Find exact match or closest lower thickness
  let bestMatch: MakinoTechRecord | undefined;
  for (const record of records) {
    if (record.thicknessInch === thicknessInch) {
      return record;
    }
    if (record.thicknessInch < thicknessInch) {
      bestMatch = record;
    }
  }

  return bestMatch;
}

/**
 * Get recommended offset for roughing pass
 * @param wireDiameter Wire diameter string
 * @param thicknessInch Stock thickness in inches
 * @param method Cutting method
 * @returns Roughing offset in inches or undefined
 */
export function getMakinoRoughingOffset(
  wireDiameter: '0.006' | '0.008' | '0.010',
  thicknessInch: number,
  method: 'HIGH_PRECISION' | 'HIGH_SPEED' = 'HIGH_PRECISION'
): number | undefined {
  const record = findMakinoRecord(wireDiameter, method, thicknessInch);
  if (!record || !record.passes[0]) return undefined;
  return record.passes[0].offsets[0];
}

/**
 * Get final achievable surface roughness Ra
 * @param wireDiameter Wire diameter string
 * @param thicknessInch Stock thickness in inches
 * @param method Cutting method
 * @returns Best Ra achievable (microinches) or undefined
 */
export function getMakinoBestRa(
  wireDiameter: '0.006' | '0.008' | '0.010',
  thicknessInch: number,
  method: 'HIGH_PRECISION' | 'HIGH_SPEED' = 'HIGH_PRECISION'
): number | undefined {
  const record = findMakinoRecord(wireDiameter, method, thicknessInch);
  if (!record || record.passes.length === 0) return undefined;
  // Return Ra from the last (finest) pass
  return record.passes[record.passes.length - 1].ra;
}
