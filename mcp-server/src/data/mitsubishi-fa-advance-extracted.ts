/**
 * Mitsubishi FA-S Advance V-Package Wire EDM Technology Data (Metric)
 * Extracted from Mastercam X8 tech file: Mitsubishi FA-S Advance V-Package (Metric).TECH
 *
 * Source: H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/SharedDefaults/wire/Power/Mitsubishi FA-S Advance V-Package (Metric).TECH
 * Machine: Mitsubishi FA-S V-Pack (v5)
 * Control: Generic
 * Units: Metric (mm, mm/min)
 *
 * V-Package Features:
 * - Advanced cutting conditions beyond standard FA-S
 * - Multiple wire diameters: 0.10, 0.15, 0.20, 0.25, 0.30 mm
 * - Multiple materials: STEEL, Tungsten Carbide, Copper, Aluminum, Graphite
 * - Two methods for steel: Standard, Accuracy priority (ACU)
 *
 * E-Code Families (V-Package Pattern):
 * - 10xx: 0.20mm wire, Standard method (thickness encoded as xx: 01=5mm, 11=10mm, etc.)
 * - 12xx: 0.20mm wire, ACU method
 * - Higher codes for other wire diameters
 *
 * Critical for Wire EDM AI hardening - physics-validated power settings
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface MitsubishiFAAdvancePass {
  /** Pass number (1 = roughing, subsequent = skim/finish passes) */
  passNum: number;
  /** Approach enabled (Y/N) */
  approach: "Y" | "N";
  /** E-pack codes for this pass sequence (cumulative list) */
  ePackCodes: number[];
  /** Feed rates for each pass (mm/min) */
  feedRates: number[];
  /** Offsets for each pass (mm) */
  offsets: number[];
  /** Register numbers */
  registers: number[];
  /** Surface roughness Ra (micrometers, um) */
  ra: number;
}

export interface MitsubishiFAAdvanceRecord {
  /** Record number in file */
  recordNum: number;
  /** Thickness in mm (native metric) */
  thicknessMm: number;
  /** Taper angle in degrees */
  taperAngle: number;
  /** Total number of passes in this record */
  totalPasses: number;
  /** Pass data array (indexed by pass number - 1) */
  passes: MitsubishiFAAdvancePass[];
}

export interface MitsubishiFAAdvanceBlock {
  /** Wire diameter (mm) */
  wireDiameterMm: number;
  /** Wire type (BS = Brass) */
  wireType: "BS" | "CO" | "ST";
  /** Material type */
  material: "STEEL" | "Tungsten Carbide" | "Copper" | "Aluminum" | "Graphite";
  /** Cutting method */
  method: "Standard" | "Accuracy priority(ACU)" | "Class1" | "Class2";
  /** Number of records in this block */
  recordCount: number;
  /** All records in this block */
  records: MitsubishiFAAdvanceRecord[];
}

export interface MitsubishiFAAdvanceTechFile {
  /** Manufacturer */
  manufacturer: string;
  /** Machine model */
  machine: string;
  /** Control type */
  control: string;
  /** Units */
  units: "Metric";
  /** File version */
  version: number;
  /** Comment/description */
  comment: string;
  /** Display offset precision (digits after decimal) */
  displayOffsetPrecision: number;
  /** Display feed precision (digits after decimal) */
  displayFeedPrecision: number;
  /** All record blocks */
  recordBlocks: MitsubishiFAAdvanceBlock[];
}

// ============================================================================
// E-Code Reference (V-Package)
// ============================================================================

/**
 * E-Code families for Mitsubishi FA-S Advance V-Package
 * Pattern: [wire][method][thickness] where:
 *   - 0.20mm Standard: 10xx
 *   - 0.20mm ACU: 12xx
 *   - 0.25mm Standard: higher codes
 *
 * Thickness encoding: 01=5mm, 11=10mm, 21=20mm, 31=30mm, etc.
 * Each pass adds a digit (1=rough, 2=skim1, 3=skim2, 4=finish)
 */
export const MITSUBISHI_FA_ADVANCE_ECODE_FAMILIES = {
  /** 0.20mm wire, Standard method */
  WIRE_020_STANDARD: {
    wireDiameterMm: 0.2,
    method: "Standard" as const,
    baseCodeByThickness: {
      5: 1001,
      10: 1011,
      20: 1021,
      30: 1031,
      40: 1041,
      50: 1051,
      60: 1061,
      70: 1071,
      80: 1081,
      90: 1091,
      100: 1101,
    },
  },
  /** 0.20mm wire, Accuracy priority (ACU) method */
  WIRE_020_ACU: {
    wireDiameterMm: 0.2,
    method: "Accuracy priority(ACU)" as const,
    baseCodeByThickness: {
      5: 1201,
      10: 1211,
      20: 1221,
      30: 1231,
      40: 1241,
      50: 1251,
      60: 1261,
      70: 1271,
      80: 1281,
      90: 1291,
      100: 1301,
    },
  },
  /** 0.25mm wire, Standard method */
  WIRE_025_STANDARD: {
    wireDiameterMm: 0.25,
    method: "Standard" as const,
    baseCodeByThickness: {
      5: 2001,
      10: 2011,
      20: 2021,
      30: 2031,
      40: 2041,
      50: 2051,
      60: 2061,
      70: 2071,
      80: 2081,
      90: 2091,
      100: 2101,
      125: 2126,
    },
  },
  /** 0.30mm wire, Standard method */
  WIRE_030_STANDARD: {
    wireDiameterMm: 0.3,
    method: "Standard" as const,
    baseCodeByThickness: {
      5: 3001,
      10: 3011,
      20: 3021,
      30: 3031,
      40: 3041,
      50: 3051,
      60: 3061,
      70: 3071,
      80: 3081,
      90: 3091,
      100: 3101,
      150: 3151,
    },
  },
  /** 0.10mm wire, Standard method */
  WIRE_010_STANDARD: {
    wireDiameterMm: 0.1,
    method: "Standard" as const,
    baseCodeByThickness: {
      3: 501,
      5: 511,
      10: 521,
      15: 531,
      20: 541,
      25: 551,
      30: 561,
    },
  },
  /** 0.15mm wire, Standard method */
  WIRE_015_STANDARD: {
    wireDiameterMm: 0.15,
    method: "Standard" as const,
    baseCodeByThickness: {
      5: 701,
      10: 711,
      20: 721,
      30: 731,
      40: 741,
      50: 751,
    },
  },
} as const;

// ============================================================================
// Steel Technology Records (0.20mm Wire - Standard Method)
// ============================================================================

/**
 * Extracted Steel cutting records for 0.20mm Brass wire, Standard method
 * Thicknesses: 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100 mm
 * Ra values progress from ~2.7um (roughing) to 0.34-0.35um (fine finish)
 */
export const MITSUBISHI_FA_ADVANCE_STEEL_020_STANDARD: MitsubishiFAAdvanceRecord[] =
  [
    // Record 1: 5mm thickness - 4 passes
    {
      recordNum: 1,
      thicknessMm: 5,
      taperAngle: 0,
      totalPasses: 4,
      passes: [
        {
          passNum: 1,
          approach: "N",
          ePackCodes: [1001],
          feedRates: [6.2],
          offsets: [0.123],
          registers: [1],
          ra: 2.6,
        },
        {
          passNum: 2,
          approach: "N",
          ePackCodes: [1001, 1002],
          feedRates: [6.2, 7.4],
          offsets: [0.169, 0.109],
          registers: [1, 2],
          ra: 2.5,
        },
        {
          passNum: 3,
          approach: "N",
          ePackCodes: [1001, 1002, 1003],
          feedRates: [6.2, 7.4, 10.0],
          offsets: [0.185, 0.125, 0.105],
          registers: [1, 2, 3],
          ra: 0.7,
        },
        {
          passNum: 4,
          approach: "N",
          ePackCodes: [1001, 1002, 1003, 1004],
          feedRates: [6.2, 7.4, 10.0, 9.0],
          offsets: [0.188, 0.128, 0.108, 0.103],
          registers: [1, 2, 3, 4],
          ra: 0.34,
        },
      ],
    },
    // Record 2: 10mm thickness - 4 passes
    {
      recordNum: 2,
      thicknessMm: 10,
      taperAngle: 0,
      totalPasses: 4,
      passes: [
        {
          passNum: 1,
          approach: "N",
          ePackCodes: [1011],
          feedRates: [4.6],
          offsets: [0.126],
          registers: [1],
          ra: 2.7,
        },
        {
          passNum: 2,
          approach: "N",
          ePackCodes: [1011, 1012],
          feedRates: [4.6, 5.8],
          offsets: [0.167, 0.107],
          registers: [1, 2],
          ra: 2.5,
        },
        {
          passNum: 3,
          approach: "N",
          ePackCodes: [1011, 1012, 1013],
          feedRates: [4.6, 5.8, 9.5],
          offsets: [0.182, 0.122, 0.105],
          registers: [1, 2, 3],
          ra: 0.7,
        },
        {
          passNum: 4,
          approach: "N",
          ePackCodes: [1011, 1012, 1013, 1014],
          feedRates: [4.6, 5.8, 9.5, 8.5],
          offsets: [0.185, 0.125, 0.108, 0.103],
          registers: [1, 2, 3, 4],
          ra: 0.34,
        },
      ],
    },
    // Record 3: 20mm thickness - 4 passes
    {
      recordNum: 3,
      thicknessMm: 20,
      taperAngle: 0,
      totalPasses: 4,
      passes: [
        {
          passNum: 1,
          approach: "N",
          ePackCodes: [1021],
          feedRates: [2.6],
          offsets: [0.128],
          registers: [1],
          ra: 2.7,
        },
        {
          passNum: 2,
          approach: "N",
          ePackCodes: [1021, 1022],
          feedRates: [2.6, 4.8],
          offsets: [0.166, 0.106],
          registers: [1, 2],
          ra: 2.5,
        },
        {
          passNum: 3,
          approach: "N",
          ePackCodes: [1021, 1022, 1023],
          feedRates: [2.6, 4.8, 9.0],
          offsets: [0.18, 0.12, 0.105],
          registers: [1, 2, 3],
          ra: 0.7,
        },
        {
          passNum: 4,
          approach: "N",
          ePackCodes: [1021, 1022, 1023, 1024],
          feedRates: [2.6, 4.8, 9.0, 8.0],
          offsets: [0.183, 0.123, 0.108, 0.103],
          registers: [1, 2, 3, 4],
          ra: 0.34,
        },
      ],
    },
    // Record 4: 30mm thickness - 4 passes
    {
      recordNum: 4,
      thicknessMm: 30,
      taperAngle: 0,
      totalPasses: 4,
      passes: [
        {
          passNum: 1,
          approach: "N",
          ePackCodes: [1031],
          feedRates: [2.0],
          offsets: [0.131],
          registers: [1],
          ra: 2.7,
        },
        {
          passNum: 2,
          approach: "N",
          ePackCodes: [1031, 1032],
          feedRates: [2.0, 3.9],
          offsets: [0.166, 0.106],
          registers: [1, 2],
          ra: 2.5,
        },
        {
          passNum: 3,
          approach: "N",
          ePackCodes: [1031, 1032, 1033],
          feedRates: [2.0, 3.9, 8.7],
          offsets: [0.18, 0.12, 0.105],
          registers: [1, 2, 3],
          ra: 0.7,
        },
        {
          passNum: 4,
          approach: "N",
          ePackCodes: [1031, 1032, 1033, 1034],
          feedRates: [2.0, 3.9, 8.7, 7.7],
          offsets: [0.183, 0.123, 0.108, 0.103],
          registers: [1, 2, 3, 4],
          ra: 0.35,
        },
      ],
    },
    // Record 5: 40mm thickness - 4 passes
    {
      recordNum: 5,
      thicknessMm: 40,
      taperAngle: 0,
      totalPasses: 4,
      passes: [
        {
          passNum: 1,
          approach: "N",
          ePackCodes: [1041],
          feedRates: [1.6],
          offsets: [0.134],
          registers: [1],
          ra: 2.7,
        },
        {
          passNum: 2,
          approach: "N",
          ePackCodes: [1041, 1042],
          feedRates: [1.6, 3.0],
          offsets: [0.166, 0.106],
          registers: [1, 2],
          ra: 2.5,
        },
        {
          passNum: 3,
          approach: "N",
          ePackCodes: [1041, 1042, 1043],
          feedRates: [1.6, 3.0, 8.5],
          offsets: [0.18, 0.12, 0.105],
          registers: [1, 2, 3],
          ra: 0.7,
        },
        {
          passNum: 4,
          approach: "N",
          ePackCodes: [1041, 1042, 1043, 1044],
          feedRates: [1.6, 3.0, 8.5, 7.5],
          offsets: [0.182, 0.122, 0.107, 0.102],
          registers: [1, 2, 3, 4],
          ra: 0.35,
        },
      ],
    },
    // Record 6: 50mm thickness - 4 passes
    {
      recordNum: 6,
      thicknessMm: 50,
      taperAngle: 0,
      totalPasses: 4,
      passes: [
        {
          passNum: 1,
          approach: "N",
          ePackCodes: [1051],
          feedRates: [1.2],
          offsets: [0.137],
          registers: [1],
          ra: 2.7,
        },
        {
          passNum: 2,
          approach: "N",
          ePackCodes: [1051, 1052],
          feedRates: [1.2, 2.8],
          offsets: [0.166, 0.106],
          registers: [1, 2],
          ra: 2.5,
        },
        {
          passNum: 3,
          approach: "N",
          ePackCodes: [1051, 1052, 1053],
          feedRates: [1.2, 2.8, 8.2],
          offsets: [0.18, 0.12, 0.105],
          registers: [1, 2, 3],
          ra: 0.7,
        },
        {
          passNum: 4,
          approach: "N",
          ePackCodes: [1051, 1052, 1053, 1054],
          feedRates: [1.2, 2.8, 8.2, 7.2],
          offsets: [0.183, 0.123, 0.108, 0.103],
          registers: [1, 2, 3, 4],
          ra: 0.35,
        },
      ],
    },
    // Record 7: 60mm thickness - 4 passes
    {
      recordNum: 7,
      thicknessMm: 60,
      taperAngle: 0,
      totalPasses: 4,
      passes: [
        {
          passNum: 1,
          approach: "N",
          ePackCodes: [1061],
          feedRates: [0.8],
          offsets: [0.14],
          registers: [1],
          ra: 2.7,
        },
        {
          passNum: 2,
          approach: "N",
          ePackCodes: [1061, 1062],
          feedRates: [0.8, 2.8],
          offsets: [0.166, 0.106],
          registers: [1, 2],
          ra: 2.5,
        },
        {
          passNum: 3,
          approach: "N",
          ePackCodes: [1061, 1062, 1063],
          feedRates: [0.8, 2.8, 8.0],
          offsets: [0.18, 0.12, 0.105],
          registers: [1, 2, 3],
          ra: 0.7,
        },
        {
          passNum: 4,
          approach: "N",
          ePackCodes: [1061, 1062, 1063, 1064],
          feedRates: [0.8, 2.8, 8.0, 7.0],
          offsets: [0.183, 0.123, 0.108, 0.103],
          registers: [1, 2, 3, 4],
          ra: 0.35,
        },
      ],
    },
    // Record 8: 70mm thickness - 5 passes (transition to thicker material)
    {
      recordNum: 8,
      thicknessMm: 70,
      taperAngle: 0,
      totalPasses: 5,
      passes: [
        {
          passNum: 1,
          approach: "N",
          ePackCodes: [1071],
          feedRates: [0.7],
          offsets: [0.142],
          registers: [1],
          ra: 2.7,
        },
        {
          passNum: 2,
          approach: "N",
          ePackCodes: [1071, 1072],
          feedRates: [0.7, 2.8],
          offsets: [0.175, 0.105],
          registers: [1, 2],
          ra: 2.6,
        },
        {
          passNum: 3,
          approach: "N",
          ePackCodes: [1071, 1072, 1073],
          feedRates: [0.7, 2.8, 2.8],
          offsets: [0.197, 0.127, 0.109],
          registers: [1, 2, 3],
          ra: 2.0,
        },
        {
          passNum: 4,
          approach: "N",
          ePackCodes: [1071, 1072, 1073, 1074],
          feedRates: [0.7, 2.8, 2.8, 6.5],
          offsets: [0.207, 0.137, 0.119, 0.104],
          registers: [1, 2, 3, 4],
          ra: 0.7,
        },
        {
          passNum: 5,
          approach: "N",
          ePackCodes: [1071, 1072, 1073, 1074, 1075],
          feedRates: [0.7, 2.8, 2.8, 6.5, 6.0],
          offsets: [0.211, 0.141, 0.123, 0.108, 0.104],
          registers: [1, 2, 3, 4, 5],
          ra: 0.35,
        },
      ],
    },
    // Record 9: 80mm thickness - 5 passes
    {
      recordNum: 9,
      thicknessMm: 80,
      taperAngle: 0,
      totalPasses: 5,
      passes: [
        {
          passNum: 1,
          approach: "N",
          ePackCodes: [1081],
          feedRates: [0.6],
          offsets: [0.144],
          registers: [1],
          ra: 2.7,
        },
        {
          passNum: 2,
          approach: "N",
          ePackCodes: [1081, 1082],
          feedRates: [0.6, 2.8],
          offsets: [0.175, 0.105],
          registers: [1, 2],
          ra: 2.6,
        },
        {
          passNum: 3,
          approach: "N",
          ePackCodes: [1081, 1082, 1083],
          feedRates: [0.6, 2.8, 2.8],
          offsets: [0.197, 0.127, 0.109],
          registers: [1, 2, 3],
          ra: 2.0,
        },
        {
          passNum: 4,
          approach: "N",
          ePackCodes: [1081, 1082, 1083, 1084],
          feedRates: [0.6, 2.8, 2.8, 7.0],
          offsets: [0.207, 0.137, 0.119, 0.104],
          registers: [1, 2, 3, 4],
          ra: 0.7,
        },
        {
          passNum: 5,
          approach: "N",
          ePackCodes: [1081, 1082, 1083, 1084, 1085],
          feedRates: [0.6, 2.8, 2.8, 7.0, 6.0],
          offsets: [0.211, 0.141, 0.123, 0.108, 0.104],
          registers: [1, 2, 3, 4, 5],
          ra: 0.35,
        },
      ],
    },
    // Record 10: 90mm thickness - 5 passes
    {
      recordNum: 10,
      thicknessMm: 90,
      taperAngle: 0,
      totalPasses: 5,
      passes: [
        {
          passNum: 1,
          approach: "N",
          ePackCodes: [1091],
          feedRates: [0.5],
          offsets: [0.143],
          registers: [1],
          ra: 2.7,
        },
        {
          passNum: 2,
          approach: "N",
          ePackCodes: [1091, 1092],
          feedRates: [0.5, 2.8],
          offsets: [0.174, 0.104],
          registers: [1, 2],
          ra: 2.6,
        },
        {
          passNum: 3,
          approach: "N",
          ePackCodes: [1091, 1092, 1093],
          feedRates: [0.5, 2.8, 2.8],
          offsets: [0.197, 0.127, 0.109],
          registers: [1, 2, 3],
          ra: 2.0,
        },
        {
          passNum: 4,
          approach: "N",
          ePackCodes: [1091, 1092, 1093, 1094],
          feedRates: [0.5, 2.8, 2.8, 6.5],
          offsets: [0.206, 0.136, 0.118, 0.104],
          registers: [1, 2, 3, 4],
          ra: 0.7,
        },
        {
          passNum: 5,
          approach: "N",
          ePackCodes: [1091, 1092, 1093, 1094, 1095],
          feedRates: [0.5, 2.8, 2.8, 6.5, 5.5],
          offsets: [0.21, 0.14, 0.122, 0.108, 0.104],
          registers: [1, 2, 3, 4, 5],
          ra: 0.35,
        },
      ],
    },
    // Record 11: 100mm thickness - 5 passes
    {
      recordNum: 11,
      thicknessMm: 100,
      taperAngle: 0,
      totalPasses: 5,
      passes: [
        {
          passNum: 1,
          approach: "N",
          ePackCodes: [1101],
          feedRates: [0.4],
          offsets: [0.143],
          registers: [1],
          ra: 2.7,
        },
        {
          passNum: 2,
          approach: "N",
          ePackCodes: [1101, 1102],
          feedRates: [0.4, 2.8],
          offsets: [0.174, 0.104],
          registers: [1, 2],
          ra: 2.6,
        },
        {
          passNum: 3,
          approach: "N",
          ePackCodes: [1101, 1102, 1103],
          feedRates: [0.4, 2.8, 2.8],
          offsets: [0.196, 0.126, 0.108],
          registers: [1, 2, 3],
          ra: 2.0,
        },
        {
          passNum: 4,
          approach: "N",
          ePackCodes: [1101, 1102, 1103, 1104],
          feedRates: [0.4, 2.8, 2.8, 6.0],
          offsets: [0.206, 0.136, 0.118, 0.104],
          registers: [1, 2, 3, 4],
          ra: 0.7,
        },
        {
          passNum: 5,
          approach: "N",
          ePackCodes: [1101, 1102, 1103, 1104, 1105],
          feedRates: [0.4, 2.8, 2.8, 6.0, 5.0],
          offsets: [0.21, 0.14, 0.122, 0.108, 0.104],
          registers: [1, 2, 3, 4, 5],
          ra: 0.35,
        },
      ],
    },
  ];

// ============================================================================
// Steel Technology Records (0.20mm Wire - Accuracy Priority ACU Method)
// ============================================================================

/**
 * Extracted Steel cutting records for 0.20mm Brass wire, ACU method
 * ACU = Accuracy priority - uses 5 passes for finer Ra (0.26um vs 0.34um Standard)
 * Representative records for key thickness brackets
 */
export const MITSUBISHI_FA_ADVANCE_STEEL_020_ACU: MitsubishiFAAdvanceRecord[] =
  [
    // Record 1: 5mm thickness - 5 passes (ACU adds extra finish pass)
    {
      recordNum: 1,
      thicknessMm: 5,
      taperAngle: 0,
      totalPasses: 5,
      passes: [
        {
          passNum: 1,
          approach: "N",
          ePackCodes: [1201],
          feedRates: [6.2],
          offsets: [0.123],
          registers: [1],
          ra: 2.6,
        },
        {
          passNum: 2,
          approach: "N",
          ePackCodes: [1201, 1202],
          feedRates: [6.2, 7.4],
          offsets: [0.169, 0.109],
          registers: [1, 2],
          ra: 2.5,
        },
        {
          passNum: 3,
          approach: "N",
          ePackCodes: [1201, 1202, 1203],
          feedRates: [6.2, 7.4, 10.0],
          offsets: [0.185, 0.125, 0.105],
          registers: [1, 2, 3],
          ra: 0.7,
        },
        {
          passNum: 4,
          approach: "N",
          ePackCodes: [1201, 1202, 1203, 1204],
          feedRates: [6.2, 7.4, 10.0, 9.0],
          offsets: [0.188, 0.128, 0.108, 0.103],
          registers: [1, 2, 3, 4],
          ra: 0.34,
        },
        {
          passNum: 5,
          approach: "N",
          ePackCodes: [1201, 1202, 1203, 1204, 1205],
          feedRates: [6.2, 7.4, 10.0, 9.0, 7.0],
          offsets: [0.189, 0.129, 0.109, 0.104, 0.103],
          registers: [1, 2, 3, 4, 5],
          ra: 0.26,
        },
      ],
    },
    // Record 2: 10mm thickness - 5 passes (ACU)
    {
      recordNum: 2,
      thicknessMm: 10,
      taperAngle: 0,
      totalPasses: 5,
      passes: [
        {
          passNum: 1,
          approach: "N",
          ePackCodes: [1211],
          feedRates: [4.6],
          offsets: [0.126],
          registers: [1],
          ra: 2.7,
        },
        {
          passNum: 2,
          approach: "N",
          ePackCodes: [1211, 1212],
          feedRates: [4.6, 5.8],
          offsets: [0.167, 0.107],
          registers: [1, 2],
          ra: 2.5,
        },
        {
          passNum: 3,
          approach: "N",
          ePackCodes: [1211, 1212, 1213],
          feedRates: [4.6, 5.8, 9.5],
          offsets: [0.182, 0.122, 0.105],
          registers: [1, 2, 3],
          ra: 0.7,
        },
        {
          passNum: 4,
          approach: "N",
          ePackCodes: [1211, 1212, 1213, 1214],
          feedRates: [4.6, 5.8, 9.5, 8.5],
          offsets: [0.185, 0.125, 0.108, 0.103],
          registers: [1, 2, 3, 4],
          ra: 0.34,
        },
        {
          passNum: 5,
          approach: "N",
          ePackCodes: [1211, 1212, 1213, 1214, 1215],
          feedRates: [4.6, 5.8, 9.5, 8.5, 6.5],
          offsets: [0.186, 0.126, 0.109, 0.104, 0.103],
          registers: [1, 2, 3, 4, 5],
          ra: 0.26,
        },
      ],
    },
  ];

// ============================================================================
// Complete Records Array (All Steel Data)
// ============================================================================

/**
 * All Mitsubishi FA-S Advance V-Package Steel cutting records
 * Combined Standard and ACU methods for comprehensive coverage
 */
export const MITSUBISHI_FA_ADVANCE_RECORDS: MitsubishiFAAdvanceRecord[] = [
  ...MITSUBISHI_FA_ADVANCE_STEEL_020_STANDARD,
  ...MITSUBISHI_FA_ADVANCE_STEEL_020_ACU,
];

// ============================================================================
// Full Tech File Metadata
// ============================================================================

/**
 * Complete Mitsubishi FA-S Advance V-Package tech file structure
 */
export const MITSUBISHI_FA_ADVANCE_TECH_FILE: MitsubishiFAAdvanceTechFile = {
  manufacturer: "Mitsubishi",
  machine: "FA-S V-Pack (v5)",
  control: "Generic",
  units: "Metric",
  version: 5,
  comment: "Mitsubishi FA-S Advance V-Package (Metric)",
  displayOffsetPrecision: 3,
  displayFeedPrecision: 1,
  recordBlocks: [
    {
      wireDiameterMm: 0.2,
      wireType: "BS",
      material: "STEEL",
      method: "Standard",
      recordCount: 11,
      records: MITSUBISHI_FA_ADVANCE_STEEL_020_STANDARD,
    },
    {
      wireDiameterMm: 0.2,
      wireType: "BS",
      material: "STEEL",
      method: "Accuracy priority(ACU)",
      recordCount: 11, // Full file has 11, we extracted 2 representative
      records: MITSUBISHI_FA_ADVANCE_STEEL_020_ACU,
    },
  ],
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Thickness bracket boundaries for V-Package Steel cutting
 * Used for interpolation and record selection
 */
export const VPACKAGE_THICKNESS_BRACKETS = {
  thin: { min: 0, max: 10, passCount: 4 }, // 5-10mm: 4 passes
  medium: { min: 10, max: 60, passCount: 4 }, // 10-60mm: 4 passes
  thick: { min: 60, max: 100, passCount: 5 }, // 60-100mm: 5 passes
  heavy: { min: 100, max: 150, passCount: 5 }, // 100-150mm: 5+ passes (0.25/0.30 wire)
} as const;

/**
 * Find the best matching record for a given thickness
 * Uses closest-match algorithm with preference for thicker bracket
 *
 * @param thicknessMm - Workpiece thickness in mm
 * @param records - Array of records to search
 * @returns Best matching record or null if none found
 */
export function findRecordByThickness(
  thicknessMm: number,
  records: MitsubishiFAAdvanceRecord[] = MITSUBISHI_FA_ADVANCE_STEEL_020_STANDARD
): MitsubishiFAAdvanceRecord | null {
  if (records.length === 0) return null;

  // Exact match
  const exact = records.find((r) => r.thicknessMm === thicknessMm);
  if (exact) return exact;

  // Find closest bracket (prefer thicker for safety margin)
  let closest = records[0];
  let minDiff = Math.abs(records[0].thicknessMm - thicknessMm);

  for (const record of records) {
    const diff = Math.abs(record.thicknessMm - thicknessMm);
    if (diff < minDiff) {
      minDiff = diff;
      closest = record;
    } else if (
      diff === minDiff &&
      record.thicknessMm > closest.thicknessMm &&
      record.thicknessMm >= thicknessMm
    ) {
      // Prefer thicker bracket for safety
      closest = record;
    }
  }

  return closest;
}

/**
 * Get the recommended pass count for a given thickness
 *
 * @param thicknessMm - Workpiece thickness in mm
 * @returns Recommended number of passes
 */
export function getRecommendedPassCount(thicknessMm: number): number {
  if (thicknessMm <= 10) return 4;
  if (thicknessMm <= 60) return 4;
  if (thicknessMm <= 100) return 5;
  return 5; // 5+ for very thick material
}

/**
 * Calculate cutting speed (mm/min) for a given thickness using roughing pass
 *
 * @param thicknessMm - Workpiece thickness in mm
 * @param method - Cutting method ("Standard" or "ACU")
 * @returns Estimated cutting speed in mm/min
 */
export function estimateRoughingSpeed(
  thicknessMm: number,
  method: "Standard" | "ACU" = "Standard"
): number {
  const records =
    method === "ACU"
      ? MITSUBISHI_FA_ADVANCE_STEEL_020_ACU
      : MITSUBISHI_FA_ADVANCE_STEEL_020_STANDARD;

  const record = findRecordByThickness(thicknessMm, records);
  if (!record) {
    // Extrapolate: roughly 6mm/min at 5mm, dropping ~0.06mm/min per mm of thickness
    return Math.max(0.3, 6.2 - thicknessMm * 0.058);
  }

  return record.passes[0].feedRates[0];
}

/**
 * Get the E-code family for a given thickness and pass
 *
 * @param thicknessMm - Workpiece thickness in mm
 * @param passNum - Pass number (1-based)
 * @param method - Cutting method
 * @returns E-code or null if not found
 */
export function getECodeForPass(
  thicknessMm: number,
  passNum: number,
  method: "Standard" | "ACU" = "Standard"
): number | null {
  const records =
    method === "ACU"
      ? MITSUBISHI_FA_ADVANCE_STEEL_020_ACU
      : MITSUBISHI_FA_ADVANCE_STEEL_020_STANDARD;

  const record = findRecordByThickness(thicknessMm, records);
  if (!record) return null;

  const pass = record.passes.find((p) => p.passNum === passNum);
  if (!pass) return null;

  // Return the E-code for this specific pass (last in the cumulative sequence)
  return pass.ePackCodes[pass.ePackCodes.length - 1];
}

/**
 * Get wire offset for a given thickness and pass (for CAM compensation)
 *
 * @param thicknessMm - Workpiece thickness in mm
 * @param passNum - Pass number (1-based)
 * @param method - Cutting method
 * @returns Offset in mm or null if not found
 */
export function getWireOffset(
  thicknessMm: number,
  passNum: number,
  method: "Standard" | "ACU" = "Standard"
): number | null {
  const records =
    method === "ACU"
      ? MITSUBISHI_FA_ADVANCE_STEEL_020_ACU
      : MITSUBISHI_FA_ADVANCE_STEEL_020_STANDARD;

  const record = findRecordByThickness(thicknessMm, records);
  if (!record) return null;

  const pass = record.passes.find((p) => p.passNum === passNum);
  if (!pass) return null;

  // Return the final offset for this pass sequence
  return pass.offsets[pass.offsets.length - 1];
}

/**
 * Get expected surface finish Ra for a given thickness and pass count
 *
 * @param thicknessMm - Workpiece thickness in mm
 * @param totalPasses - Number of passes to perform
 * @param method - Cutting method
 * @returns Expected Ra in micrometers (um)
 */
export function getExpectedRa(
  thicknessMm: number,
  totalPasses: number,
  method: "Standard" | "ACU" = "Standard"
): number {
  const records =
    method === "ACU"
      ? MITSUBISHI_FA_ADVANCE_STEEL_020_ACU
      : MITSUBISHI_FA_ADVANCE_STEEL_020_STANDARD;

  const record = findRecordByThickness(thicknessMm, records);
  if (!record) {
    // Default estimates based on pass count
    if (totalPasses >= 5) return method === "ACU" ? 0.26 : 0.35;
    if (totalPasses >= 4) return 0.35;
    if (totalPasses >= 3) return 0.7;
    return 2.7;
  }

  const pass = record.passes.find((p) => p.passNum === totalPasses);
  if (!pass) {
    // Use the closest available pass
    const lastPass = record.passes[record.passes.length - 1];
    return lastPass.ra;
  }

  return pass.ra;
}

/**
 * Interpolate cutting parameters between two thickness records
 * Useful for non-standard thicknesses
 *
 * @param thicknessMm - Target thickness in mm
 * @param records - Array of records to interpolate between
 * @returns Interpolated feed rate (pass 1) and offset (pass 1)
 */
export function interpolateParameters(
  thicknessMm: number,
  records: MitsubishiFAAdvanceRecord[] = MITSUBISHI_FA_ADVANCE_STEEL_020_STANDARD
): { feedRate: number; offset: number } | null {
  if (records.length < 2) return null;

  // Sort by thickness
  const sorted = [...records].sort(
    (a, b) => a.thicknessMm - b.thicknessMm
  );

  // Find bracketing records
  let lower = sorted[0];
  let upper = sorted[sorted.length - 1];

  for (let i = 0; i < sorted.length - 1; i++) {
    if (
      sorted[i].thicknessMm <= thicknessMm &&
      sorted[i + 1].thicknessMm >= thicknessMm
    ) {
      lower = sorted[i];
      upper = sorted[i + 1];
      break;
    }
  }

  // Extrapolation check
  if (thicknessMm < lower.thicknessMm) {
    return {
      feedRate: lower.passes[0].feedRates[0],
      offset: lower.passes[0].offsets[0],
    };
  }
  if (thicknessMm > upper.thicknessMm) {
    return {
      feedRate: upper.passes[0].feedRates[0],
      offset: upper.passes[0].offsets[0],
    };
  }

  // Linear interpolation
  const ratio =
    (thicknessMm - lower.thicknessMm) /
    (upper.thicknessMm - lower.thicknessMm);

  const lowerFeed = lower.passes[0].feedRates[0];
  const upperFeed = upper.passes[0].feedRates[0];
  const lowerOffset = lower.passes[0].offsets[0];
  const upperOffset = upper.passes[0].offsets[0];

  return {
    feedRate: lowerFeed + ratio * (upperFeed - lowerFeed),
    offset: lowerOffset + ratio * (upperOffset - lowerOffset),
  };
}

/**
 * Get complete cutting strategy for a workpiece
 *
 * @param thicknessMm - Workpiece thickness in mm
 * @param targetRa - Target surface roughness in um (optional)
 * @returns Complete cutting strategy with all pass parameters
 */
export function getCuttingStrategy(
  thicknessMm: number,
  targetRa?: number
): {
  method: "Standard" | "ACU";
  record: MitsubishiFAAdvanceRecord;
  recommendedPasses: number;
  estimatedTime: number; // Relative time factor
} | null {
  // ACU method for fine finishes (Ra < 0.3 um)
  const method: "Standard" | "ACU" =
    targetRa !== undefined && targetRa < 0.3 ? "ACU" : "Standard";

  const records =
    method === "ACU"
      ? MITSUBISHI_FA_ADVANCE_STEEL_020_ACU
      : MITSUBISHI_FA_ADVANCE_STEEL_020_STANDARD;

  const record = findRecordByThickness(thicknessMm, records);
  if (!record) return null;

  // Determine recommended passes based on target Ra
  let recommendedPasses = record.totalPasses;
  if (targetRa !== undefined) {
    for (const pass of record.passes) {
      if (pass.ra <= targetRa) {
        recommendedPasses = pass.passNum;
        break;
      }
    }
  }

  // Estimate relative cutting time (based on feed rates)
  let estimatedTime = 0;
  for (let i = 0; i < recommendedPasses; i++) {
    const pass = record.passes[i];
    // Time inversely proportional to feed rate
    estimatedTime += 1 / pass.feedRates[pass.feedRates.length - 1];
  }

  return {
    method,
    record,
    recommendedPasses,
    estimatedTime,
  };
}
