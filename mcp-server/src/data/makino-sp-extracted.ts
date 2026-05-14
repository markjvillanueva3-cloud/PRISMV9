/**
 * Makino SP43/SP64 Wire EDM Technology Data — Complete Extraction
 *
 * Source: H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/SharedDefaults/wire/Power/Makino (SP43,SP64).tech
 * Machine: Makino SP43, SP64
 * Control: MGW-S
 * Units: Inch (with mm conversions)
 *
 * Extraction Statistics:
 * - Total Header Blocks: 54
 * - Total Records: 822
 * - Wire Diameters: 0.004, 0.006, 0.008, 0.01, 0.012"
 * - Materials: AL, Cu, Gr, St, WC
 * - Methods: 10Deg. Taper, 20Deg. Taper, 30Deg. Taper, Booster 1.6, Both Away, Both Away-L, Fast Finish, HS Both Away, High Precision, High Speed 1.2, High Speed 1.6, Land, Precision, Varying Thickness
 * - Thickness Range: 0.05" to 12" (1.3mm to 304.8mm)
 * - E-pac Code Range: 1023 to 8113
 *
 * Generated: 2026-04-15T13:17:10.129Z
 */

// ============================================================================
// Type Definitions
// ============================================================================

/** Wire EDM cutting pass data */
export interface MakinoSPPass {
  /** Pass number (1 = roughing, subsequent = skim/finish) */
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
  /** Feed rates (0.0 = machine default) */
  feed: number[];
  /** Surface roughness Ra (microinches) — may include "+1" notation for extra passes */
  ra: string;
}

/** Wire EDM cutting record for a specific thickness */
export interface MakinoSPRecord {
  /** Record number in block */
  recordNum: number;
  /** Thickness in inches (original) */
  thicknessInch: number;
  /** Thickness in mm (converted: inch * 25.4) */
  thicknessMm: number;
  /** Taper specification (e.g., "0", "0~10", "0~20", "0~30") */
  taper: string;
  /** Total number of passes in this record */
  totalPasses: number;
  /** Pass data array */
  passes: MakinoSPPass[];
}

/** Wire EDM technology block (grouped by header) */
export interface MakinoSPBlock {
  /** Header number (1-54) */
  headerNum: number;
  /** Wire type: BS=Brass, HS=High Speed, T=Taper */
  type: 'BS' | 'HS' | 'T';
  /** Wire diameter (inches): "0.004", "0.006", "0.008", "0.01", "0.012" */
  wireDiameter: string;
  /** Material: AL=Aluminum, Cu=Copper, Gr=Graphite, St=Steel, WC=Tungsten Carbide */
  material: 'AL' | 'Cu' | 'Gr' | 'St' | 'WC';
  /** Cutting method */
  method: string;
  /** Number of records in this block */
  recordCount: number;
  /** All records in this block */
  records: MakinoSPRecord[];
}

/** Complete tech file structure */
export interface MakinoSPTechFile {
  manufacturer: string;
  machine: string;
  control: string;
  units: string;
  version: number;
  totalBlocks: number;
  totalRecords: number;
  blocks: MakinoSPBlock[];
}

// ============================================================================
// Material Code Reference
// ============================================================================

export const MAKINO_SP_MATERIALS = {
  AL: { code: 'AL', name: 'Aluminum', description: 'Aluminum and aluminum alloys' },
  Cu: { code: 'Cu', name: 'Copper', description: 'Copper and copper alloys' },
  Gr: { code: 'Gr', name: 'Graphite', description: 'EDM graphite electrodes' },
  St: { code: 'St', name: 'Steel', description: 'Steel, tool steel, stainless, hardened' },
  WC: { code: 'WC', name: 'Tungsten Carbide', description: 'Tungsten carbide, cemented carbide' },
} as const;

// ============================================================================
// Wire Type Reference
// ============================================================================

export const MAKINO_SP_WIRE_TYPES = {
  BS: { code: 'BS', name: 'Brass', description: 'Standard brass wire (most common)' },
  HS: { code: 'HS', name: 'High Speed', description: 'High speed coated wire' },
  T: { code: 'T', name: 'Taper', description: 'Taper cutting conditions' },
} as const;

// ============================================================================
// Method Reference
// ============================================================================

export const MAKINO_SP_METHODS = [
  '10Deg. Taper',
  '20Deg. Taper',
  '30Deg. Taper',
  'Booster 1.6',
  'Both Away',
  'Both Away-L',
  'Fast Finish',
  'HS Both Away',
  'High Precision',
  'High Speed 1.2',
  'High Speed 1.6',
  'Land',
  'Precision',
  'Varying Thickness',
] as const;

export type MakinoSPMethod = typeof MAKINO_SP_METHODS[number];

// ============================================================================
// Wire Diameter Reference
// ============================================================================

export const MAKINO_SP_WIRE_DIAMETERS = {
  '0.004': { inch: 0.004, mm: 0.1016, description: '0.004" (0.1mm) fine wire' },
  '0.006': { inch: 0.006, mm: 0.1524, description: '0.006" (0.15mm) fine wire' },
  '0.008': { inch: 0.008, mm: 0.2032, description: '0.008" (0.2mm) standard wire' },
  '0.01': { inch: 0.010, mm: 0.254, description: '0.010" (0.25mm) standard wire' },
  '0.012': { inch: 0.012, mm: 0.3048, description: '0.012" (0.3mm) heavy wire' },
} as const;

// ============================================================================
// E-pac Code Families
// ============================================================================

/**
 * E-pac codes control power settings on the Makino. They follow patterns:
 * - 1xxx: Roughing codes
 * - 2xxx: High Precision skim codes
 * - 3xxx: Taper cutting codes
 * - 4xxx: Aluminum cutting codes
 * - 5xxx: Carbide cutting codes
 * - 6xxx: Copper cutting codes
 * - 7xxx: 0.004" wire codes
 */
export const MAKINO_SP_EPAC_FAMILIES = {
  ROUGHING_1000: 'General roughing codes',
  SKIM_HIGH_PRECISION_2000: 'High precision skim passes',
  TAPER_3000: 'Taper cutting conditions',
  ALUMINUM_4000: 'Aluminum-specific codes',
  CARBIDE_5000: 'Tungsten carbide codes',
  COPPER_6000: 'Copper-specific codes',
  FINE_WIRE_7000: '0.004" wire codes',
} as const;

// ============================================================================
// Technology Record Blocks (54 blocks, 822 records)
// ============================================================================

/** Block 1: 0.004" Cu - High Precision */
const MAKINO_SP_BLOCK_1: MakinoSPBlock = {
  headerNum: 1,
  type: 'BS',
  wireDiameter: '0.004',
  material: 'Cu',
  method: 'High Precision',
  recordCount: 5,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7025], offsets: [0.0031], registers: [1], feed: [0], ra: '72' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7025, 7221], offsets: [0.0043, 0.0023], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 15', approach: 'N', epacCodes: [7025, 7221, 7222], offsets: [0.0045, 0.0026, 0.0023], registers: [1, 2, 3], feed: [0, 0, 0], ra: '12' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7035], offsets: [0.0032], registers: [1], feed: [0], ra: '72' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7035, 7231], offsets: [0.0044, 0.0024], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 15', approach: 'N', epacCodes: [7035, 7231, 7232], offsets: [0.0046, 0.0026, 0.0023], registers: [1, 2, 3], feed: [0, 0, 0], ra: '12' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7045], offsets: [0.0034], registers: [1], feed: [0], ra: '72' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7045, 7241], offsets: [0.0046, 0.0025], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 15', approach: 'N', epacCodes: [7045, 7241, 7242], offsets: [0.0048, 0.0027, 0.0023], registers: [1, 2, 3], feed: [0, 0, 0], ra: '12' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7055], offsets: [0.0034], registers: [1], feed: [0], ra: '72' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7055, 7251], offsets: [0.0047, 0.0026], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 15', approach: 'N', epacCodes: [7055, 7251, 7252], offsets: [0.0049, 0.0028, 0.0024], registers: [1, 2, 3], feed: [0, 0, 0], ra: '12' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7065], offsets: [0.0034], registers: [1], feed: [0], ra: '72' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7065, 7261], offsets: [0.0048, 0.0026], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 15', approach: 'N', epacCodes: [7065, 7261, 7262], offsets: [0.0049, 0.0028, 0.0023], registers: [1, 2, 3], feed: [0, 0, 0], ra: '12' },
      ],
    },
  ],
};

/** Block 2: 0.004" St - Both Away */
const MAKINO_SP_BLOCK_2: MakinoSPBlock = {
  headerNum: 2,
  type: 'BS',
  wireDiameter: '0.004',
  material: 'St',
  method: 'Both Away',
  recordCount: 3,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1026], offsets: [0.0025], registers: [1], feed: [0], ra: '72' },
        { passNum: 2, label: 'Finish 35', approach: 'N', epacCodes: [1026, 1421, 1422, 1423], offsets: [0.0037, 0.0027, 0.0023, 0.0022], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 15', approach: 'N', epacCodes: [1026, 1421, 1422, 1423, 1424], offsets: [0.0039, 0.0029, 0.0025, 0.0024, 0.0023], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15' },
        { passNum: 4, label: 'Finish 6', approach: 'N', epacCodes: [1026, 1421, 1422, 1423, 1424, 1425], offsets: [0.0039, 0.0029, 0.0025, 0.0024, 0.0024, 0.0023], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '6' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1036], offsets: [0.0026], registers: [1], feed: [0], ra: '72' },
        { passNum: 2, label: 'Finish 35', approach: 'N', epacCodes: [1036, 1431, 1432, 1433], offsets: [0.0037, 0.0027, 0.0023, 0.0022], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 15', approach: 'N', epacCodes: [1036, 1431, 1432, 1433, 1434], offsets: [0.0039, 0.0029, 0.0025, 0.0024, 0.0024], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15' },
        { passNum: 4, label: 'Finish 6', approach: 'N', epacCodes: [1036, 1431, 1432, 1433, 1434, 1435], offsets: [0.0039, 0.0029, 0.0026, 0.0024, 0.0024, 0.0024], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '6' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1046], offsets: [0.0029], registers: [1], feed: [0], ra: '72' },
        { passNum: 2, label: 'Finish 35', approach: 'N', epacCodes: [1046, 1441, 1442, 1443], offsets: [0.0039, 0.0027, 0.0023, 0.0022], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 15', approach: 'N', epacCodes: [1046, 1441, 1442, 1443, 1444], offsets: [0.004, 0.0029, 0.0025, 0.0024, 0.0024], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15' },
        { passNum: 4, label: 'Finish 6', approach: 'N', epacCodes: [1046, 1441, 1442, 1443, 1444, 1445], offsets: [0.0041, 0.0029, 0.0025, 0.0024, 0.0024, 0.0023], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '6' },
      ],
    },
  ],
};

/** Block 3: 0.004" St - High Precision */
const MAKINO_SP_BLOCK_3: MakinoSPBlock = {
  headerNum: 3,
  type: 'BS',
  wireDiameter: '0.004',
  material: 'St',
  method: 'High Precision',
  recordCount: 5,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1025], offsets: [0.0027], registers: [1], feed: [0], ra: '72' },
        { passNum: 2, label: 'Finish 35', approach: 'N', epacCodes: [1025, 1221, 1222, 1223], offsets: [0.0039, 0.0027, 0.0023, 0.0022], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 15', approach: 'N', epacCodes: [1025, 1221, 1222, 1223, 1224], offsets: [0.0041, 0.0029, 0.0025, 0.0024, 0.0023], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15' },
        { passNum: 4, label: 'Finish 6', approach: 'N', epacCodes: [1025, 1221, 1222, 1223, 1224, 1225], offsets: [0.0041, 0.0029, 0.0025, 0.0024, 0.0024, 0.0023], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '6' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1035], offsets: [0.0028], registers: [1], feed: [0], ra: '72' },
        { passNum: 2, label: 'Finish 35', approach: 'N', epacCodes: [1035, 1231, 1232, 1233], offsets: [0.0039, 0.0027, 0.0023, 0.0022], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 15', approach: 'N', epacCodes: [1035, 1231, 1232, 1233, 1234], offsets: [0.0041, 0.0029, 0.0025, 0.0024, 0.0024], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15' },
        { passNum: 4, label: 'Finish 6', approach: 'N', epacCodes: [1035, 1231, 1232, 1233, 1234, 1235], offsets: [0.0041, 0.0029, 0.0026, 0.0024, 0.0024, 0.0024], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '6' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1045], offsets: [0.0029], registers: [1], feed: [0], ra: '72' },
        { passNum: 2, label: 'Finish 35', approach: 'N', epacCodes: [1045, 1241, 1242, 1243], offsets: [0.0039, 0.0027, 0.0023, 0.0022], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 15', approach: 'N', epacCodes: [1045, 1241, 1242, 1243, 1244], offsets: [0.0041, 0.0029, 0.0025, 0.0024, 0.0024], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15' },
        { passNum: 4, label: 'Finish 6', approach: 'N', epacCodes: [1045, 1241, 1242, 1243, 1244, 1245], offsets: [0.0041, 0.0029, 0.0025, 0.0024, 0.0024, 0.0023], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '6' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1055], offsets: [0.0029], registers: [1], feed: [0], ra: '72' },
        { passNum: 2, label: 'Finish 35', approach: 'N', epacCodes: [1055, 1251, 1252, 1253], offsets: [0.004, 0.0028, 0.0024, 0.0023], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 15', approach: 'N', epacCodes: [1055, 1251, 1252, 1253, 1254], offsets: [0.0041, 0.0029, 0.0026, 0.0024, 0.0024], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [1055, 1251, 1252, 1253, 1254, 1255], offsets: [0.0042, 0.003, 0.0026, 0.0025, 0.0024, 0.0023], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10' },
        { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [1055, 1251, 1252, 1253, 1254, 1255, 1256], offsets: [0.0042, 0.003, 0.0026, 0.0025, 0.0024, 0.0023, 0.0023], registers: [1, 2, 3, 4, 5, 6, 7], feed: [0, 0, 0, 0, 0, 0, 0], ra: '6' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1065], offsets: [0.003], registers: [1], feed: [0], ra: '72' },
        { passNum: 2, label: 'Finish 35', approach: 'N', epacCodes: [1065, 1261, 1262, 1263], offsets: [0.004, 0.0029, 0.0025, 0.0024], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 15', approach: 'N', epacCodes: [1065, 1261, 1262, 1263, 1264], offsets: [0.0042, 0.003, 0.0026, 0.0025, 0.0024], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [1065, 1261, 1262, 1263, 1264, 1265], offsets: [0.0042, 0.003, 0.0026, 0.0025, 0.0024, 0.0024], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10' },
        { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [1065, 1261, 1262, 1263, 1264, 1265, 1266], offsets: [0.0042, 0.003, 0.0026, 0.0025, 0.0024, 0.0024, 0.0023], registers: [1, 2, 3, 4, 5, 6, 7], feed: [0, 0, 0, 0, 0, 0, 0], ra: '6' },
      ],
    },
  ],
};

/** Block 4: 0.004" WC - Both Away */
const MAKINO_SP_BLOCK_4: MakinoSPBlock = {
  headerNum: 4,
  type: 'BS',
  wireDiameter: '0.004',
  material: 'WC',
  method: 'Both Away',
  recordCount: 3,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5026], offsets: [0.0025], registers: [1], feed: [0], ra: '72' },
        { passNum: 2, label: 'Finish 35', approach: 'N', epacCodes: [5026, 5421, 5422, 5423], offsets: [0.0036, 0.0027, 0.0023, 0.0022], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [5026, 5421, 5422, 5423, 5424], offsets: [0.0038, 0.0029, 0.0025, 0.0024, 0.0023], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [5026, 5421, 5422, 5423, 5424, 5425], offsets: [0.0039, 0.0029, 0.0025, 0.0024, 0.0024, 0.0023], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5036], offsets: [0.0027], registers: [1], feed: [0], ra: '72' },
        { passNum: 2, label: 'Finish 35', approach: 'N', epacCodes: [5036, 5431, 5432, 5433], offsets: [0.0038, 0.0027, 0.0023, 0.0022], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [5036, 5431, 5432, 5433, 5434], offsets: [0.004, 0.0029, 0.0025, 0.0024, 0.0024], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [5036, 5431, 5432, 5433, 5434, 5435], offsets: [0.004, 0.0029, 0.0026, 0.0024, 0.0024, 0.0024], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5046], offsets: [0.0029], registers: [1], feed: [0], ra: '72' },
        { passNum: 2, label: 'Finish 35', approach: 'N', epacCodes: [5046, 5441, 5442, 5443], offsets: [0.004, 0.0028, 0.0024, 0.0023], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [5046, 5441, 5442, 5443, 5444], offsets: [0.0041, 0.0029, 0.0025, 0.0024, 0.0024], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [5046, 5441, 5442, 5443, 5444, 5445], offsets: [0.0041, 0.0029, 0.0026, 0.0024, 0.0024, 0.0024], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '4' },
      ],
    },
  ],
};

/** Block 5: 0.004" WC - High Precision */
const MAKINO_SP_BLOCK_5: MakinoSPBlock = {
  headerNum: 5,
  type: 'BS',
  wireDiameter: '0.004',
  material: 'WC',
  method: 'High Precision',
  recordCount: 8,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5025], offsets: [0.0027], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: 'Finish 35', approach: 'N', epacCodes: [5025, 5221, 5222, 5223], offsets: [0.0039, 0.0027, 0.0023, 0.0022], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [5025, 5221, 5222, 5223, 5224], offsets: [0.0041, 0.0029, 0.0025, 0.0024, 0.0023], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [5025, 5221, 5222, 5223, 5224, 5225], offsets: [0.0041, 0.0029, 0.0025, 0.0024, 0.0024, 0.0023], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5035], offsets: [0.0028], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: 'Finish 35', approach: 'N', epacCodes: [5035, 5231, 5232, 5233], offsets: [0.0039, 0.0027, 0.0023, 0.0022], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [5035, 5231, 5232, 5233, 5234], offsets: [0.0041, 0.0029, 0.0025, 0.0024, 0.0024], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [5035, 5231, 5232, 5233, 5234, 5235], offsets: [0.0041, 0.0029, 0.0026, 0.0024, 0.0024, 0.0024], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5045], offsets: [0.0029], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: 'Finish 35', approach: 'N', epacCodes: [5045, 5241, 5242, 5243], offsets: [0.004, 0.0028, 0.0024, 0.0023], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [5045, 5241, 5242, 5243, 5244], offsets: [0.0041, 0.0029, 0.0025, 0.0024, 0.0024], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [5045, 5241, 5242, 5243, 5244, 5245], offsets: [0.0041, 0.0029, 0.0026, 0.0024, 0.0024, 0.0024], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5055], offsets: [0.0029], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: 'Finish 35', approach: 'N', epacCodes: [5055, 5251, 5252, 5253], offsets: [0.004, 0.0028, 0.0024, 0.0023], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 15', approach: 'N', epacCodes: [5055, 5251, 5252, 5253, 5254], offsets: [0.0041, 0.0029, 0.0026, 0.0024, 0.0024], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5055, 5251, 5252, 5253, 5254, 5255], offsets: [0.0042, 0.003, 0.0026, 0.0025, 0.0024, 0.0023], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10' },
        { passNum: 5, label: 'Finish 4', approach: 'N', epacCodes: [5055, 5251, 5252, 5253, 5254, 5255, 5256], offsets: [0.0042, 0.003, 0.0026, 0.0025, 0.0024, 0.0023, 0.0023], registers: [1, 2, 3, 4, 5, 6, 7], feed: [0, 0, 0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5065], offsets: [0.003], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: 'Finish 35', approach: 'N', epacCodes: [5065, 5261, 5262, 5263], offsets: [0.004, 0.0028, 0.0024, 0.0023], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 15', approach: 'N', epacCodes: [5065, 5261, 5262, 5263, 5264], offsets: [0.0041, 0.0029, 0.0026, 0.0024, 0.0024], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5065, 5261, 5262, 5263, 5264, 5265], offsets: [0.0042, 0.003, 0.0026, 0.0025, 0.0024, 0.0023], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10' },
        { passNum: 5, label: 'Finish 4', approach: 'N', epacCodes: [5065, 5261, 5262, 5263, 5264, 5265, 5266], offsets: [0.0042, 0.003, 0.0026, 0.0025, 0.0024, 0.0023, 0.0023], registers: [1, 2, 3, 4, 5, 6, 7], feed: [0, 0, 0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Finish 15', approach: 'N', epacCodes: [5075, 5271, 5272, 5273, 5274], offsets: [0.0058, 0.0036, 0.0029, 0.0025, 0.0025], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Finish 15', approach: 'N', epacCodes: [5085, 5281, 5282, 5283, 5284], offsets: [0.0059, 0.0037, 0.0029, 0.0025, 0.0025], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Finish 15', approach: 'N', epacCodes: [5095, 5291, 5292, 5293, 5294], offsets: [0.0057, 0.0036, 0.0029, 0.0025, 0.0025], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15' },
      ],
    },
  ],
};

/** Block 6: 0.006" St - Both Away */
const MAKINO_SP_BLOCK_6: MakinoSPBlock = {
  headerNum: 6,
  type: 'BS',
  wireDiameter: '0.006',
  material: 'St',
  method: 'Both Away',
  recordCount: 6,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1026], offsets: [0.0038], registers: [1], feed: [0], ra: '64' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1026, 2421], offsets: [0.0048, 0.0032], registers: [1, 2], feed: [0, 0], ra: '46' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1026, 2421, 2422], offsets: [0.0051, 0.0035, 0.0032], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1026, 2421, 2422, 2423], offsets: [0.0053, 0.0037, 0.0034, 0.0033], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1026, 2421, 2422, 2423, 2424], offsets: [0.0054, 0.0038, 0.0035, 0.0033, 0.0033], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1036], offsets: [0.004], registers: [1], feed: [0], ra: '64' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1036, 2431], offsets: [0.0048, 0.0033], registers: [1, 2], feed: [0, 0], ra: '46' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1036, 2431, 2432], offsets: [0.0051, 0.0036, 0.0032], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1036, 2431, 2432, 2433], offsets: [0.0053, 0.0038, 0.0034, 0.0033], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1036, 2431, 2432, 2433, 2434], offsets: [0.0053, 0.0038, 0.0034, 0.0033, 0.0033], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1046], offsets: [0.0041], registers: [1], feed: [0], ra: '64' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1046, 2441], offsets: [0.005, 0.0034], registers: [1, 2], feed: [0, 0], ra: '46' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1046, 2441, 2442], offsets: [0.0054, 0.0037, 0.0032], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1046, 2441, 2442, 2443], offsets: [0.0055, 0.0039, 0.0034, 0.0032], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1046, 2441, 2442, 2443, 2444], offsets: [0.0056, 0.0039, 0.0035, 0.0033, 0.0032], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1056], offsets: [0.0042], registers: [1], feed: [0], ra: '64' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1056, 2451], offsets: [0.0051, 0.0034], registers: [1, 2], feed: [0, 0], ra: '46' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1056, 2451, 2452], offsets: [0.0055, 0.0038, 0.0033], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1056, 2451, 2452, 2453], offsets: [0.0057, 0.004, 0.0035, 0.0032], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1056, 2451, 2452, 2453, 2454], offsets: [0.0057, 0.004, 0.0035, 0.0033, 0.0032], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1066], offsets: [0.0042], registers: [1], feed: [0], ra: '64' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1066, 2461], offsets: [0.0052, 0.0034], registers: [1, 2], feed: [0, 0], ra: '46' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1066, 2461, 2462], offsets: [0.0055, 0.0038, 0.0033], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1066, 2461, 2462, 2463], offsets: [0.0057, 0.0039, 0.0034, 0.0032], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1066, 2461, 2462, 2463, 2464], offsets: [0.0057, 0.004, 0.0035, 0.0033, 0.0032], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1076], offsets: [0.0043], registers: [1], feed: [0], ra: '64' },
        { passNum: 2, label: 'Finish 35', approach: 'N', epacCodes: [1076, 2471, 2472, 2473], offsets: [0.0059, 0.0041, 0.0037, 0.0033], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 15', approach: 'N', epacCodes: [1076, 2471, 2472, 2473, 2474], offsets: [0.006, 0.0042, 0.0038, 0.0034, 0.0032], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [1076, 2471, 2472, 2473, 2474, 2475], offsets: [0.0061, 0.0042, 0.0038, 0.0034, 0.0033, 0.0032], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10' },
      ],
    },
  ],
};

/** Block 7: 0.006" St - High Precision */
const MAKINO_SP_BLOCK_7: MakinoSPBlock = {
  headerNum: 7,
  type: 'BS',
  wireDiameter: '0.006',
  material: 'St',
  method: 'High Precision',
  recordCount: 8,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1025], offsets: [0.0038], registers: [1], feed: [0], ra: '64' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1025, 2671], offsets: [0.0049, 0.0032], registers: [1, 2], feed: [0, 0], ra: '46' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1025, 2671, 2672], offsets: [0.0052, 0.0035, 0.0032], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1025, 2671, 2672, 2673], offsets: [0.0054, 0.0037, 0.0034, 0.0033], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1025, 2671, 2672, 2673, 2674], offsets: [0.0054, 0.0038, 0.0035, 0.0033, 0.0033], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1035], offsets: [0.0041], registers: [1], feed: [0], ra: '64' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1035, 2691], offsets: [0.005, 0.0033], registers: [1, 2], feed: [0, 0], ra: '46' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1035, 2691, 2692], offsets: [0.0053, 0.0036, 0.0032], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1035, 2691, 2692, 2693], offsets: [0.0055, 0.0038, 0.0034, 0.0033], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1035, 2691, 2692, 2693, 2694], offsets: [0.0055, 0.0038, 0.0034, 0.0033, 0.0033], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1045], offsets: [0.0042], registers: [1], feed: [0], ra: '64' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1045, 2701], offsets: [0.0051, 0.0034], registers: [1, 2], feed: [0, 0], ra: '46' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1045, 2701, 2702], offsets: [0.0054, 0.0037, 0.0033], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1045, 2701, 2702, 2703], offsets: [0.0057, 0.0039, 0.0035, 0.0033], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1045, 2701, 2702, 2703, 2704], offsets: [0.0057, 0.004, 0.0035, 0.0033, 0.0033], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1055], offsets: [0.0042], registers: [1], feed: [0], ra: '64' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1055, 2711], offsets: [0.0052, 0.0034], registers: [1, 2], feed: [0, 0], ra: '46' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1055, 2711, 2712], offsets: [0.0055, 0.0038, 0.0033], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1055, 2711, 2712, 2713], offsets: [0.0057, 0.004, 0.0035, 0.0032], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1055, 2711, 2712, 2713, 2714], offsets: [0.0058, 0.004, 0.0035, 0.0033, 0.0032], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1065], offsets: [0.0043], registers: [1], feed: [0], ra: '64' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1065, 2721], offsets: [0.0053, 0.0035], registers: [1, 2], feed: [0, 0], ra: '46' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1065, 2721, 2722], offsets: [0.0056, 0.0038, 0.0033], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1065, 2721, 2722, 2723], offsets: [0.0058, 0.004, 0.0034, 0.0032], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1065, 2721, 2722, 2723, 2724], offsets: [0.0058, 0.004, 0.0035, 0.0033, 0.0032], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1075], offsets: [0.0044], registers: [1], feed: [0], ra: '64' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1075, 2731], offsets: [0.0054, 0.0035], registers: [1, 2], feed: [0, 0], ra: '46' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1075, 2731, 2732], offsets: [0.0057, 0.0038, 0.0032], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1075, 2731, 2732, 2733], offsets: [0.0059, 0.004, 0.0034, 0.0033], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1075, 2731, 2732, 2733, 2734], offsets: [0.0059, 0.0041, 0.0035, 0.0033, 0.0033], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1085], offsets: [0.0045], registers: [1], feed: [0], ra: '64' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1085, 2741], offsets: [0.0055, 0.0035], registers: [1, 2], feed: [0, 0], ra: '46' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1085, 2741, 2742], offsets: [0.0058, 0.0038, 0.0032], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1085, 2741, 2742, 2743], offsets: [0.006, 0.004, 0.0034, 0.0033], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1085, 2741, 2742, 2743, 2744], offsets: [0.006, 0.0041, 0.0035, 0.0033, 0.0033], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1095], offsets: [0.0045], registers: [1], feed: [0], ra: '64' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1095, 2751], offsets: [0.0056, 0.0036], registers: [1, 2], feed: [0, 0], ra: '46' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1095, 2751, 2752], offsets: [0.0058, 0.0038, 0.0032], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1095, 2751, 2752, 2753], offsets: [0.006, 0.004, 0.0034, 0.0033], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1095, 2751, 2752, 2753, 2754], offsets: [0.0061, 0.0041, 0.0034, 0.0033, 0.0033], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
      ],
    },
  ],
};

/** Block 8: 0.006" WC - Both Away */
const MAKINO_SP_BLOCK_8: MakinoSPBlock = {
  headerNum: 8,
  type: 'BS',
  wireDiameter: '0.006',
  material: 'WC',
  method: 'Both Away',
  recordCount: 6,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5026], offsets: [0.004], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5026, 5426], offsets: [0.0049, 0.0033], registers: [1, 2], feed: [0, 0], ra: '44' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [5026, 5426, 5427], offsets: [0.0052, 0.0035, 0.0033], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5026, 5426, 5427, 5428], offsets: [0.0053, 0.0037, 0.0034, 0.0033], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '10' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5036], offsets: [0.0041], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5036, 5436], offsets: [0.005, 0.0034], registers: [1, 2], feed: [0, 0], ra: '44' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [5036, 5436, 5437], offsets: [0.0052, 0.0036, 0.0033], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5036, 5436, 5437, 5438], offsets: [0.0054, 0.0038, 0.0034, 0.0033], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '10' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5046], offsets: [0.0042], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5046, 5446], offsets: [0.0052, 0.0034], registers: [1, 2], feed: [0, 0], ra: '44' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [5046, 5446, 5447], offsets: [0.0054, 0.0037, 0.0032], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5046, 5446, 5447, 5448], offsets: [0.0056, 0.0039, 0.0034, 0.0033], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '10' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5056], offsets: [0.0043], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5056, 5456], offsets: [0.0054, 0.0034], registers: [1, 2], feed: [0, 0], ra: '44' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [5056, 5456, 5457], offsets: [0.0056, 0.0037, 0.0032], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5056, 5456, 5457, 5458], offsets: [0.0058, 0.0039, 0.0034, 0.0033], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '10' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5066], offsets: [0.0044], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5066, 5466], offsets: [0.0056, 0.0036], registers: [1, 2], feed: [0, 0], ra: '44' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [5066, 5466, 5467], offsets: [0.0059, 0.0039, 0.0033], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5066, 5466, 5467, 5468], offsets: [0.0061, 0.004, 0.0035, 0.0033], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '10' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5076], offsets: [0.0044], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5076, 5476], offsets: [0.0055, 0.0036], registers: [1, 2], feed: [0, 0], ra: '44' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [5076, 5476, 5477], offsets: [0.0058, 0.0038, 0.0033], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5076, 5476, 5477, 5478], offsets: [0.0059, 0.004, 0.0034, 0.0032], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '10' },
      ],
    },
  ],
};

/** Block 9: 0.006" WC - High Precision */
const MAKINO_SP_BLOCK_9: MakinoSPBlock = {
  headerNum: 9,
  type: 'BS',
  wireDiameter: '0.006',
  material: 'WC',
  method: 'High Precision',
  recordCount: 8,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5025], offsets: [0.004], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5025, 5421], offsets: [0.0049, 0.0033], registers: [1, 2], feed: [0, 0], ra: '44' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [5025, 5421, 5422], offsets: [0.0051, 0.0035, 0.0033], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5025, 5421, 5422, 5423], offsets: [0.0053, 0.0037, 0.0034, 0.0033], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '10' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5035], offsets: [0.004], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5035, 5431], offsets: [0.0049, 0.0034], registers: [1, 2], feed: [0, 0], ra: '44' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [5035, 5431, 5432], offsets: [0.0052, 0.0036, 0.0033], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5035, 5431, 5432, 5433], offsets: [0.0054, 0.0038, 0.0034, 0.0033], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '10' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5045], offsets: [0.0041], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5045, 5441], offsets: [0.005, 0.0034], registers: [1, 2], feed: [0, 0], ra: '44' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [5045, 5441, 5442], offsets: [0.0053, 0.0037, 0.0032], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5045, 5441, 5442, 5443], offsets: [0.0055, 0.0039, 0.0034, 0.0033], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '10' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5055], offsets: [0.0041], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5055, 5451], offsets: [0.005, 0.0034], registers: [1, 2], feed: [0, 0], ra: '44' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [5055, 5451, 5452], offsets: [0.0052, 0.0037, 0.0032], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5055, 5451, 5452, 5453], offsets: [0.0054, 0.0039, 0.0034, 0.0033], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '10' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5065], offsets: [0.0043], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5065, 5461], offsets: [0.0054, 0.0036], registers: [1, 2], feed: [0, 0], ra: '44' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [5065, 5461, 5462], offsets: [0.0058, 0.0039, 0.0033], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5065, 5461, 5462, 5463], offsets: [0.0059, 0.0041, 0.0035, 0.0033], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '10' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5075], offsets: [0.0043], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5075, 5471], offsets: [0.0054, 0.0036], registers: [1, 2], feed: [0, 0], ra: '44' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [5075, 5471, 5472], offsets: [0.0058, 0.0039, 0.0033], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5075, 5471, 5472, 5473], offsets: [0.0059, 0.0041, 0.0035, 0.0033], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '10' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5085], offsets: [0.0044], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5085, 5481], offsets: [0.0055, 0.0036], registers: [1, 2], feed: [0, 0], ra: '44' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [5085, 5481, 5482], offsets: [0.0058, 0.0039, 0.0033], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5085, 5481, 5482, 5483], offsets: [0.006, 0.0041, 0.0035, 0.0033], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '10' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2.222,
      thicknessMm: 56.44,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5095], offsets: [0.0044], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5095, 5491], offsets: [0.0056, 0.0036], registers: [1, 2], feed: [0, 0], ra: '44' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [5095, 5491, 5492], offsets: [0.0059, 0.0039, 0.0033], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5095, 5491, 5492, 5493], offsets: [0.006, 0.0041, 0.0035, 0.0033], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '10' },
      ],
    },
  ],
};

/** Block 10: 0.008" AL - High Precision */
const MAKINO_SP_BLOCK_10: MakinoSPBlock = {
  headerNum: 10,
  type: 'BS',
  wireDiameter: '0.008',
  material: 'AL',
  method: 'High Precision',
  recordCount: 28,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4025], offsets: [0.0054], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4025, 4424], offsets: [0.0065, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [4025, 4424, 4425], offsets: [0.0068, 0.0046, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [4025, 4424, 4424, 4425], offsets: [0.0074, 0.0052, 0.0046, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4035], offsets: [0.0057], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4035, 4434], offsets: [0.0068, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [4035, 4434, 4435], offsets: [0.0071, 0.0047, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [4035, 4434, 4434, 4435], offsets: [0.0076, 0.0052, 0.0047, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4045], offsets: [0.0059], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4045, 4444], offsets: [0.0068, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [4045, 4444, 4445], offsets: [0.0072, 0.0048, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [4045, 4444, 4445, 4446], offsets: [0.0072, 0.0049, 0.0043, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 25', approach: 'N', epacCodes: [4045, 4444, 4444, 4445], offsets: [0.0076, 0.0052, 0.0048, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [4045, 4444, 4444, 4445, 4446], offsets: [0.0077, 0.0053, 0.0049, 0.0043, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4055], offsets: [0.0057], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4055, 4454], offsets: [0.0066, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [4055, 4454, 4455], offsets: [0.0071, 0.0048, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [4055, 4454, 4455, 4456], offsets: [0.0072, 0.0049, 0.0044, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 25', approach: 'N', epacCodes: [4055, 4454, 4454, 4455], offsets: [0.0075, 0.0053, 0.0048, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [4055, 4454, 4454, 4455, 4456], offsets: [0.0076, 0.0053, 0.0049, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4065], offsets: [0.0059], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4065, 4464], offsets: [0.0068, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [4065, 4464, 4465], offsets: [0.0073, 0.0049, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [4065, 4464, 4465, 4466], offsets: [0.0074, 0.0049, 0.0044, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 25', approach: 'N', epacCodes: [4065, 4464, 4464, 4465], offsets: [0.0078, 0.0053, 0.0049, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [4065, 4464, 4464, 4465, 4466], offsets: [0.0078, 0.0054, 0.0049, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4075], offsets: [0.0059], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4075, 4474], offsets: [0.0069, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [4075, 4474, 4475], offsets: [0.0074, 0.0049, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [4075, 4474, 4475, 4476], offsets: [0.0074, 0.005, 0.0044, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 25', approach: 'N', epacCodes: [4075, 4474, 4474, 4475], offsets: [0.0078, 0.0054, 0.0049, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [4075, 4474, 4474, 4475, 4476], offsets: [0.0079, 0.0054, 0.005, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4085], offsets: [0.006], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4085, 4484], offsets: [0.007, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [4085, 4484, 4485], offsets: [0.0075, 0.0049, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [4085, 4484, 4485, 4486], offsets: [0.0076, 0.005, 0.0044, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 25', approach: 'N', epacCodes: [4085, 4484, 4484, 4485], offsets: [0.008, 0.0054, 0.0049, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [4085, 4484, 4484, 4485, 4486], offsets: [0.008, 0.0055, 0.005, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4095], offsets: [0.0061], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4095, 4494], offsets: [0.0072, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [4095, 4494, 4495], offsets: [0.0076, 0.0049, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [4095, 4494, 4495, 4496], offsets: [0.0077, 0.005, 0.0044, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 25', approach: 'N', epacCodes: [4095, 4494, 4494, 4495], offsets: [0.0081, 0.0054, 0.0049, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [4095, 4494, 4494, 4495, 4496], offsets: [0.0082, 0.0055, 0.005, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4105], offsets: [0.0061], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4105, 4504], offsets: [0.0072, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [4105, 4504, 4505], offsets: [0.0076, 0.0049, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [4105, 4504, 4505, 4506], offsets: [0.0077, 0.005, 0.0044, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 25', approach: 'N', epacCodes: [4105, 4504, 4504, 4505], offsets: [0.0082, 0.0054, 0.0049, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [4105, 4504, 4504, 4505, 4506], offsets: [0.0082, 0.0055, 0.005, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4115], offsets: [0.0062], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4115, 4514], offsets: [0.0072, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [4115, 4514, 4515], offsets: [0.0077, 0.0049, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [4115, 4514, 4515, 4516], offsets: [0.0078, 0.005, 0.0044, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 25', approach: 'N', epacCodes: [4115, 4514, 4514, 4515], offsets: [0.0082, 0.0055, 0.0049, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [4115, 4514, 4514, 4515, 4516], offsets: [0.0083, 0.0056, 0.005, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4125], offsets: [0.0061], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4125, 4524], offsets: [0.0073, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [4125, 4524, 4525], offsets: [0.0077, 0.005, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [4125, 4524, 4525, 4526], offsets: [0.0078, 0.0051, 0.0044, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 25', approach: 'N', epacCodes: [4125, 4524, 4524, 4525], offsets: [0.0083, 0.0056, 0.005, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [4125, 4524, 4524, 4525, 4526], offsets: [0.0084, 0.0057, 0.0051, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4135], offsets: [0.0061], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4135, 4534], offsets: [0.0073, 0.0046], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [4135, 4534, 4535], offsets: [0.0078, 0.0051, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [4135, 4534, 4535, 4536], offsets: [0.0079, 0.0051, 0.0044, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 25', approach: 'N', epacCodes: [4135, 4534, 4534, 4535], offsets: [0.0084, 0.0057, 0.0051, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [4135, 4534, 4534, 4535, 4536], offsets: [0.0085, 0.0058, 0.0051, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4145], offsets: [0.0062], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4145, 4544], offsets: [0.0074, 0.0046], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [4145, 4544, 4545], offsets: [0.0079, 0.0051, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [4145, 4544, 4545, 4546], offsets: [0.008, 0.0052, 0.0045, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 25', approach: 'N', epacCodes: [4145, 4544, 4544, 4545], offsets: [0.0085, 0.0057, 0.0051, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [4145, 4544, 4544, 4545, 4546], offsets: [0.0086, 0.0058, 0.0052, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4155], offsets: [0.0063], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4155, 4554], offsets: [0.0076, 0.0047], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [4155, 4554, 4555], offsets: [0.008, 0.0051, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [4155, 4554, 4555, 4556], offsets: [0.0081, 0.0052, 0.0045, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 25', approach: 'N', epacCodes: [4155, 4554, 4554, 4555], offsets: [0.0087, 0.0058, 0.0051, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [4155, 4554, 4554, 4555, 4556], offsets: [0.0088, 0.0059, 0.0052, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4165], offsets: [0.0064], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4165, 4564], offsets: [0.0078, 0.0047], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [4165, 4564, 4565], offsets: [0.0082, 0.0051, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [4165, 4564, 4565, 4566], offsets: [0.0083, 0.0052, 0.0045, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 25', approach: 'N', epacCodes: [4165, 4564, 4564, 4565], offsets: [0.0088, 0.0058, 0.0051, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [4165, 4564, 4564, 4565, 4566], offsets: [0.0089, 0.0059, 0.0052, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 16,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4175], offsets: [0.0065], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4175, 4574], offsets: [0.0079, 0.0048], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [4175, 4574, 4575], offsets: [0.0082, 0.0051, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [4175, 4574, 4575, 4576], offsets: [0.0084, 0.0053, 0.0045, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 25', approach: 'N', epacCodes: [4175, 4574, 4574, 4575], offsets: [0.009, 0.0059, 0.0051, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [4175, 4574, 4574, 4575, 4576], offsets: [0.0091, 0.006, 0.0053, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 17,
      thicknessInch: 4.5,
      thicknessMm: 114.3,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4185], offsets: [0.0065], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4185, 4584], offsets: [0.0079, 0.0048], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [4185, 4584, 4585], offsets: [0.0082, 0.0051, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [4185, 4584, 4585, 4586], offsets: [0.0083, 0.0052, 0.0044, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 25', approach: 'N', epacCodes: [4185, 4584, 4584, 4585], offsets: [0.009, 0.0059, 0.0051, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [4185, 4584, 4584, 4585, 4586], offsets: [0.0091, 0.006, 0.0052, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 18,
      thicknessInch: 5,
      thicknessMm: 127,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4195], offsets: [0.0064], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4195, 4594], offsets: [0.0078, 0.0048], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [4195, 4594, 4595], offsets: [0.0082, 0.0051, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [4195, 4594, 4595, 4596], offsets: [0.0083, 0.0052, 0.0044, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 25', approach: 'N', epacCodes: [4195, 4594, 4594, 4595], offsets: [0.009, 0.006, 0.0051, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [4195, 4594, 4594, 4595, 4596], offsets: [0.0091, 0.0061, 0.0052, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 19,
      thicknessInch: 5.5,
      thicknessMm: 139.7,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4205], offsets: [0.0062], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4205, 4604], offsets: [0.0077, 0.0048], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [4205, 4604, 4605], offsets: [0.0081, 0.0052, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [4205, 4604, 4605, 4606], offsets: [0.0082, 0.0053, 0.0045, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 25', approach: 'N', epacCodes: [4205, 4604, 4604, 4605], offsets: [0.009, 0.0061, 0.0052, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [4205, 4604, 4604, 4605, 4606], offsets: [0.0091, 0.0062, 0.0053, 0.0045, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 20,
      thicknessInch: 6,
      thicknessMm: 152.4,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4215], offsets: [0.0061], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4215, 4614], offsets: [0.0076, 0.0048], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [4215, 4614, 4615], offsets: [0.0081, 0.0053, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [4215, 4614, 4615, 4616], offsets: [0.0082, 0.0053, 0.0045, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 25', approach: 'N', epacCodes: [4215, 4614, 4614, 4615], offsets: [0.0091, 0.0062, 0.0053, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [4215, 4614, 4614, 4615, 4616], offsets: [0.0092, 0.0063, 0.0053, 0.0045, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 21,
      thicknessInch: 6.5,
      thicknessMm: 165.1,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4225], offsets: [0.0059], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4225, 4624], offsets: [0.0076, 0.0048], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [4225, 4624, 4625], offsets: [0.0081, 0.0054, 0.0045], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
      ],
    },
    {
      recordNum: 22,
      thicknessInch: 7,
      thicknessMm: 177.8,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4235], offsets: [0.0065], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [4235, 4634], offsets: [0.0073, 0.0045], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [4235, 4634, 4635], offsets: [0.0076, 0.0048, 0.0045], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 23,
      thicknessInch: 7.5,
      thicknessMm: 190.5,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4245], offsets: [0.0066], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [4245, 4644], offsets: [0.0074, 0.0046], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [4245, 4644, 4645], offsets: [0.0078, 0.005, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 24,
      thicknessInch: 8,
      thicknessMm: 203.2,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4255], offsets: [0.0066], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [4255, 4654], offsets: [0.0074, 0.0046], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [4255, 4654, 4655], offsets: [0.0078, 0.005, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 25,
      thicknessInch: 9,
      thicknessMm: 228.6,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4265], offsets: [0.0068], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [4265, 4664], offsets: [0.0074, 0.0047], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [4265, 4664, 4665], offsets: [0.0079, 0.0052, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 26,
      thicknessInch: 10,
      thicknessMm: 254,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4275], offsets: [0.0069], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [4275, 4674], offsets: [0.0074, 0.0048], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [4275, 4674, 4675], offsets: [0.008, 0.0054, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 27,
      thicknessInch: 11,
      thicknessMm: 279.4,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4285], offsets: [0.007], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [4285, 4684], offsets: [0.0075, 0.0048], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [4285, 4684, 4685], offsets: [0.0081, 0.0054, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 28,
      thicknessInch: 12,
      thicknessMm: 304.8,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4295], offsets: [0.0071], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [4295, 4694], offsets: [0.0075, 0.0048], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [4295, 4694, 4695], offsets: [0.0081, 0.0054, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
  ],
};

/** Block 11: 0.008" Cu - Both Away */
const MAKINO_SP_BLOCK_11: MakinoSPBlock = {
  headerNum: 11,
  type: 'BS',
  wireDiameter: '0.008',
  material: 'Cu',
  method: 'Both Away',
  recordCount: 10,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7026], offsets: [0.0057], registers: [1], feed: [0], ra: '96' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7026, 7424], offsets: [0.0066, 0.0043], registers: [1, 2], feed: [0, 0], ra: '51' },
        { passNum: 3, label: 'Finish 15', approach: 'N', epacCodes: [7026, 7424, 7425], offsets: [0.0068, 0.0046, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '15' },
        { passNum: 4, label: '+1 Finish 15', approach: 'N', epacCodes: [7026, 7424, 7424, 7425], offsets: [0.0076, 0.0053, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7036], offsets: [0.006], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7036, 7434], offsets: [0.0067, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7036, 7434, 7435], offsets: [0.0069, 0.0045, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7036, 7434, 7434, 7435], offsets: [0.0077, 0.0053, 0.0045, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7046], offsets: [0.0061], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7046, 7444], offsets: [0.0068, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7046, 7444, 7445], offsets: [0.007, 0.0046, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7046, 7444, 7444, 7445], offsets: [0.0078, 0.0054, 0.0046, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7056], offsets: [0.0063], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7056, 7454], offsets: [0.007, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7056, 7454, 7455], offsets: [0.0072, 0.0046, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7056, 7454, 7454, 7455], offsets: [0.008, 0.0053, 0.0046, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7066], offsets: [0.0064], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7066, 7464], offsets: [0.0072, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7066, 7464, 7465], offsets: [0.0074, 0.0047, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7066, 7464, 7464, 7465], offsets: [0.0082, 0.0055, 0.0047, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7076], offsets: [0.0065], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7076, 7474], offsets: [0.0073, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7076, 7474, 7475], offsets: [0.0075, 0.0047, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7076, 7474, 7474, 7475], offsets: [0.0083, 0.0055, 0.0047, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7086], offsets: [0.0066], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7086, 7484], offsets: [0.0074, 0.0046], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7086, 7484, 7485], offsets: [0.0077, 0.0048, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7086, 7484, 7484, 7485], offsets: [0.0085, 0.0056, 0.0048, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7096], offsets: [0.0067], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7096, 7494], offsets: [0.0076, 0.0046], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7096, 7494, 7495], offsets: [0.0078, 0.0049, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7096, 7494, 7494, 7495], offsets: [0.0086, 0.0057, 0.0049, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7106], offsets: [0.0068], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7106, 7504], offsets: [0.0076, 0.0047], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7106, 7504, 7505], offsets: [0.0078, 0.0049, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7106, 7504, 7504, 7505], offsets: [0.0086, 0.0057, 0.0049, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7116], offsets: [0.0069], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7116, 7514], offsets: [0.0077, 0.0047], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7116, 7514, 7515], offsets: [0.0079, 0.0049, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7116, 7514, 7514, 7515], offsets: [0.0087, 0.0057, 0.0049, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
  ],
};

/** Block 12: 0.008" Cu - Both Away-L */
const MAKINO_SP_BLOCK_12: MakinoSPBlock = {
  headerNum: 12,
  type: 'BS',
  wireDiameter: '0.008',
  material: 'Cu',
  method: 'Both Away-L',
  recordCount: 10,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7027], offsets: [0.0057], registers: [1], feed: [0], ra: '96' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7027, 7426], offsets: [0.0066, 0.0044], registers: [1, 2], feed: [0, 0], ra: '51' },
        { passNum: 3, label: 'Finish 15', approach: 'N', epacCodes: [7027, 7426, 7427], offsets: [0.0069, 0.0046, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '15' },
        { passNum: 4, label: '+1 Finish 15', approach: 'N', epacCodes: [7027, 7426, 7426, 7427], offsets: [0.0077, 0.0054, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7037], offsets: [0.006], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7037, 7436], offsets: [0.0068, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7037, 7436, 7437], offsets: [0.0071, 0.0046, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7037, 7436, 7436, 7437], offsets: [0.0078, 0.0054, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7047], offsets: [0.0061], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7047, 7446], offsets: [0.0069, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7047, 7446, 7447], offsets: [0.0071, 0.0046, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7047, 7446, 7446, 7447], offsets: [0.0079, 0.0054, 0.0046, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7057], offsets: [0.0063], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7057, 7456], offsets: [0.0071, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7057, 7456, 7457], offsets: [0.0073, 0.0046, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7057, 7456, 7456, 7457], offsets: [0.0081, 0.0054, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7067], offsets: [0.0064], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7067, 7466], offsets: [0.0072, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7067, 7466, 7467], offsets: [0.0075, 0.0047, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7067, 7466, 7466, 7467], offsets: [0.0082, 0.0055, 0.0047, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7077], offsets: [0.0065], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7077, 7476], offsets: [0.0073, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7077, 7476, 7477], offsets: [0.0076, 0.0047, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7077, 7476, 7476, 7477], offsets: [0.0083, 0.0055, 0.0047, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7087], offsets: [0.0066], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7087, 7486], offsets: [0.0075, 0.0046], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7087, 7486, 7487], offsets: [0.0077, 0.0048, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7087, 7486, 7486, 7487], offsets: [0.0085, 0.0056, 0.0048, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7097], offsets: [0.0067], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7097, 7496], offsets: [0.0076, 0.0047], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7097, 7496, 7497], offsets: [0.0078, 0.0049, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7097, 7496, 7496, 7497], offsets: [0.0086, 0.0057, 0.0049, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7107], offsets: [0.0067], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7107, 7506], offsets: [0.0076, 0.0047], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7107, 7506, 7507], offsets: [0.0078, 0.0049, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7107, 7506, 7506, 7507], offsets: [0.0086, 0.0057, 0.0049, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7117], offsets: [0.0067], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7117, 7516], offsets: [0.0076, 0.0047], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7117, 7516, 7517], offsets: [0.0078, 0.0049, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7117, 7516, 7516, 7517], offsets: [0.0086, 0.0057, 0.0049, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
  ],
};

/** Block 13: 0.008" Cu - High Precision */
const MAKINO_SP_BLOCK_13: MakinoSPBlock = {
  headerNum: 13,
  type: 'BS',
  wireDiameter: '0.008',
  material: 'Cu',
  method: 'High Precision',
  recordCount: 16,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7025], offsets: [0.0057], registers: [1], feed: [0], ra: '96' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7025, 7422], offsets: [0.0066, 0.0043], registers: [1, 2], feed: [0, 0], ra: '51' },
        { passNum: 3, label: 'Finish 15', approach: 'N', epacCodes: [7025, 7422, 7423], offsets: [0.0068, 0.0046, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '15' },
        { passNum: 4, label: '+1 Finish 15', approach: 'N', epacCodes: [7025, 7422, 7422, 7423], offsets: [0.0076, 0.0054, 0.0046, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7035], offsets: [0.0058], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7035, 7432], offsets: [0.0065, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7035, 7432, 7433], offsets: [0.0068, 0.0046, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7035, 7432, 7432, 7433], offsets: [0.0076, 0.0054, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7045], offsets: [0.0059], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7045, 7442], offsets: [0.0066, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7045, 7442, 7443], offsets: [0.0069, 0.0046, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7045, 7442, 7442, 7443], offsets: [0.0077, 0.0054, 0.0046, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7055], offsets: [0.006], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7055, 7452], offsets: [0.0068, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7055, 7452, 7453], offsets: [0.007, 0.0046, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7055, 7452, 7452, 7453], offsets: [0.0078, 0.0054, 0.0046, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7065], offsets: [0.0062], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7065, 7462], offsets: [0.007, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7065, 7462, 7463], offsets: [0.0072, 0.0048, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7065, 7462, 7462, 7463], offsets: [0.008, 0.0055, 0.0048, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7075], offsets: [0.0063], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7075, 7472], offsets: [0.0071, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7075, 7472, 7473], offsets: [0.0073, 0.0048, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7075, 7472, 7472, 7473], offsets: [0.0081, 0.0056, 0.0048, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7085], offsets: [0.0064], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7085, 7482], offsets: [0.0072, 0.0046], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7085, 7482, 7483], offsets: [0.0075, 0.0048, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7085, 7482, 7482, 7483], offsets: [0.0083, 0.0056, 0.0048, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7095], offsets: [0.0065], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7095, 7492], offsets: [0.0074, 0.0047], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7095, 7492, 7493], offsets: [0.0076, 0.0049, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7095, 7492, 7492, 7493], offsets: [0.0084, 0.0057, 0.0049, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7105], offsets: [0.0065], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7105, 7502], offsets: [0.0074, 0.0047], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7105, 7502, 7503], offsets: [0.0076, 0.0049, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7105, 7502, 7502, 7503], offsets: [0.0084, 0.0057, 0.0049, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7115], offsets: [0.0066], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7115, 7512], offsets: [0.0075, 0.0047], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7115, 7512, 7513], offsets: [0.0077, 0.0049, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7115, 7512, 7512, 7513], offsets: [0.0085, 0.0057, 0.0049, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7125], offsets: [0.0066], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7125, 7522], offsets: [0.0076, 0.0047], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7125, 7522, 7523], offsets: [0.0077, 0.0049, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7135], offsets: [0.0066], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7135, 7532], offsets: [0.0075, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7135, 7532, 7533], offsets: [0.008, 0.0049, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7145], offsets: [0.0066], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7145, 7542], offsets: [0.0076, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7145, 7542, 7543], offsets: [0.008, 0.0049, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7155], offsets: [0.0067], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7155, 7552], offsets: [0.0076, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7155, 7552, 7553], offsets: [0.0081, 0.0048, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7165], offsets: [0.0067], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7165, 7562], offsets: [0.0077, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7165, 7562, 7563], offsets: [0.0082, 0.0048, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
      ],
    },
    {
      recordNum: 16,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7175], offsets: [0.0067], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7175, 7572], offsets: [0.0078, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7175, 7572, 7573], offsets: [0.0082, 0.0048, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
      ],
    },
  ],
};

/** Block 14: 0.008" Gr - High Precision */
const MAKINO_SP_BLOCK_14: MakinoSPBlock = {
  headerNum: 14,
  type: 'BS',
  wireDiameter: '0.008',
  material: 'Gr',
  method: 'High Precision',
  recordCount: 19,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6034], offsets: [0.0054], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6044], offsets: [0.0054], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6054], offsets: [0.0055], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6064], offsets: [0.0057], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6074], offsets: [0.0058], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6084], offsets: [0.0058], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6094], offsets: [0.0059], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6104], offsets: [0.006], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6114], offsets: [0.0061], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6124], offsets: [0.0061], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6134], offsets: [0.0061], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6144], offsets: [0.0062], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6154], offsets: [0.0062], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6164], offsets: [0.0062], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6174], offsets: [0.0062], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 16,
      thicknessInch: 4.5,
      thicknessMm: 114.3,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6184], offsets: [0.0063], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 17,
      thicknessInch: 5,
      thicknessMm: 127,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6194], offsets: [0.0063], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 18,
      thicknessInch: 5.5,
      thicknessMm: 139.7,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6204], offsets: [0.0063], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 19,
      thicknessInch: 6,
      thicknessMm: 152.4,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6214], offsets: [0.0063], registers: [1], feed: [0], ra: '36' },
      ],
    },
  ],
};

/** Block 15: 0.008" St - Both Away */
const MAKINO_SP_BLOCK_15: MakinoSPBlock = {
  headerNum: 15,
  type: 'BS',
  wireDiameter: '0.008',
  material: 'St',
  method: 'Both Away',
  recordCount: 20,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1026], offsets: [0.0049], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1026, 2421], offsets: [0.006, 0.0042], registers: [1, 2], feed: [0, 0], ra: '51' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1026, 2421, 2422], offsets: [0.0062, 0.0045, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1026, 2421, 2422, 2423], offsets: [0.0065, 0.0047, 0.0045, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1026, 2421, 2422, 2423, 2424], offsets: [0.0066, 0.0048, 0.0046, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1026, 2421, 2421, 2422], offsets: [0.0068, 0.0051, 0.0045, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [1026, 2421, 2421, 2422, 2423], offsets: [0.0071, 0.0053, 0.0047, 0.0045, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1026, 2421, 2421, 2422, 2423, 2424], offsets: [0.0072, 0.0055, 0.0048, 0.0046, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1036], offsets: [0.005], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1036, 2431], offsets: [0.0061, 0.0043], registers: [1, 2], feed: [0, 0], ra: '51' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1036, 2431, 2432], offsets: [0.0063, 0.0045, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1036, 2431, 2432, 2433], offsets: [0.0066, 0.0048, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1036, 2431, 2432, 2433, 2434], offsets: [0.0067, 0.0049, 0.0047, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1036, 2431, 2431, 2432], offsets: [0.0071, 0.0052, 0.0045, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [1036, 2431, 2431, 2432, 2433], offsets: [0.0074, 0.0055, 0.0048, 0.0046, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1036, 2431, 2431, 2432, 2433, 2434], offsets: [0.0074, 0.0056, 0.0049, 0.0047, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1046], offsets: [0.0052], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1046, 2441], offsets: [0.0063, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1046, 2441, 2442], offsets: [0.0065, 0.0045, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1046, 2441, 2442, 2443], offsets: [0.0068, 0.0048, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1046, 2441, 2442, 2443, 2444], offsets: [0.0069, 0.0049, 0.0046, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1046, 2441, 2441, 2442], offsets: [0.0074, 0.0054, 0.0045, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [1046, 2441, 2441, 2442, 2443], offsets: [0.0077, 0.0056, 0.0048, 0.0046, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1046, 2441, 2441, 2442, 2443, 2444], offsets: [0.0077, 0.0057, 0.0049, 0.0046, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1056], offsets: [0.0053], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1056, 2451], offsets: [0.0064, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1056, 2451, 2452], offsets: [0.0067, 0.0046, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1056, 2451, 2452, 2453], offsets: [0.007, 0.0048, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1056, 2451, 2452, 2453, 2454], offsets: [0.0071, 0.0049, 0.0047, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '12' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1056, 2451, 2451, 2452], offsets: [0.0076, 0.0055, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [1056, 2451, 2451, 2452, 2453], offsets: [0.0079, 0.0057, 0.0048, 0.0046, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1056, 2451, 2451, 2452, 2453, 2454], offsets: [0.008, 0.0059, 0.0049, 0.0047, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '12 +1' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1066], offsets: [0.0054], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1066, 2461], offsets: [0.0065, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1066, 2461, 2462], offsets: [0.0068, 0.0046, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1066, 2461, 2462, 2463], offsets: [0.007, 0.0048, 0.0046, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 15', approach: 'N', epacCodes: [1066, 2461, 2462, 2463, 2464], offsets: [0.0072, 0.0049, 0.0047, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '12' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1066, 2461, 2461, 2462], offsets: [0.0077, 0.0055, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1066, 2461, 2461, 2462, 2463], offsets: [0.008, 0.0058, 0.0048, 0.0046, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 15', approach: 'N', epacCodes: [1066, 2461, 2461, 2462, 2463, 2464], offsets: [0.0081, 0.0059, 0.0049, 0.0047, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '12 +1' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1076], offsets: [0.0055], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1076, 2471], offsets: [0.0065, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1076, 2471, 2472], offsets: [0.0069, 0.0046, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1076, 2471, 2472, 2473], offsets: [0.0071, 0.0048, 0.0046, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 15', approach: 'N', epacCodes: [1076, 2471, 2472, 2473, 2474], offsets: [0.0072, 0.0049, 0.0047, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1076, 2471, 2471, 2472], offsets: [0.0078, 0.0055, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1076, 2471, 2471, 2472, 2473], offsets: [0.008, 0.0058, 0.0048, 0.0046, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 15', approach: 'N', epacCodes: [1076, 2471, 2471, 2472, 2473, 2474], offsets: [0.0082, 0.0059, 0.0049, 0.0047, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1086], offsets: [0.0056], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1086, 2481], offsets: [0.0067, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1086, 2481, 2482], offsets: [0.007, 0.0046, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1086, 2481, 2482, 2483], offsets: [0.0072, 0.0049, 0.0046, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 15', approach: 'N', epacCodes: [1086, 2481, 2482, 2483, 2484], offsets: [0.0073, 0.005, 0.0047, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1086, 2481, 2481, 2482], offsets: [0.0079, 0.0056, 0.0046, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1086, 2481, 2481, 2482, 2483], offsets: [0.0082, 0.0058, 0.0049, 0.0046, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 15', approach: 'N', epacCodes: [1086, 2481, 2481, 2482, 2483, 2484], offsets: [0.0083, 0.0059, 0.005, 0.0047, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1096], offsets: [0.0057], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1096, 2491], offsets: [0.0068, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1096, 2491, 2492], offsets: [0.0071, 0.0047, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1096, 2491, 2492, 2493], offsets: [0.0073, 0.0049, 0.0046, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 15', approach: 'N', epacCodes: [1096, 2491, 2492, 2493, 2494], offsets: [0.0074, 0.005, 0.0048, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1096, 2491, 2491, 2492], offsets: [0.0081, 0.0057, 0.0047, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1096, 2491, 2491, 2492, 2493], offsets: [0.0083, 0.0059, 0.0049, 0.0046, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 15', approach: 'N', epacCodes: [1096, 2491, 2491, 2492, 2493, 2494], offsets: [0.0084, 0.006, 0.005, 0.0048, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1106], offsets: [0.0058], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1106, 2501], offsets: [0.0069, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1106, 2501, 2502], offsets: [0.0072, 0.0048, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1106, 2501, 2502, 2503], offsets: [0.0074, 0.0049, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 15', approach: 'N', epacCodes: [1106, 2501, 2502, 2503, 2504], offsets: [0.0076, 0.0051, 0.0048, 0.0045, 0.0045], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1106, 2501, 2501, 2502], offsets: [0.0082, 0.0058, 0.0048, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1106, 2501, 2501, 2502, 2503], offsets: [0.0084, 0.0059, 0.0049, 0.0046, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 15', approach: 'N', epacCodes: [1106, 2501, 2501, 2502, 2503, 2504], offsets: [0.0086, 0.0061, 0.0051, 0.0048, 0.0045, 0.0045], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1116], offsets: [0.0059], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1116, 2511], offsets: [0.007, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1116, 2511, 2512], offsets: [0.0073, 0.0048, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1116, 2511, 2512, 2513], offsets: [0.0075, 0.005, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 15', approach: 'N', epacCodes: [1116, 2511, 2512, 2513, 2514], offsets: [0.0077, 0.0052, 0.0048, 0.0045, 0.0045], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '17' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1116, 2511, 2511, 2512], offsets: [0.0084, 0.0059, 0.0048, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1116, 2511, 2511, 2512, 2513], offsets: [0.0085, 0.006, 0.005, 0.0046, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 15', approach: 'N', epacCodes: [1116, 2511, 2511, 2512, 2513, 2514], offsets: [0.0087, 0.0062, 0.0052, 0.0048, 0.0045, 0.0045], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '17 +1' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1126], offsets: [0.006], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1126, 2521], offsets: [0.0071, 0.0046], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1126, 2521, 2522], offsets: [0.0075, 0.0049, 0.0045], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1126, 2521, 2522, 2523], offsets: [0.0075, 0.005, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 15', approach: 'N', epacCodes: [1126, 2521, 2522, 2523, 2524], offsets: [0.0078, 0.0053, 0.0048, 0.0046, 0.0045], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '17' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1126, 2521, 2521, 2522], offsets: [0.0085, 0.006, 0.0049, 0.0045], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1126, 2521, 2521, 2522, 2523], offsets: [0.0086, 0.006, 0.005, 0.0046, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 15', approach: 'N', epacCodes: [1126, 2521, 2521, 2522, 2523, 2524], offsets: [0.0089, 0.0063, 0.0053, 0.0048, 0.0046, 0.0045], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '17 +1' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1136], offsets: [0.0059], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1136, 2531], offsets: [0.0069, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1136, 2531, 2532], offsets: [0.0073, 0.0048, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1136, 2531, 2532, 2533], offsets: [0.0075, 0.005, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 15', approach: 'N', epacCodes: [1136, 2531, 2532, 2533, 2534], offsets: [0.0077, 0.0052, 0.0047, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '17' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1136, 2531, 2531, 2532], offsets: [0.0084, 0.0059, 0.0048, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1136, 2531, 2531, 2532, 2533], offsets: [0.0087, 0.0062, 0.005, 0.0046, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 15', approach: 'N', epacCodes: [1136, 2531, 2531, 2532, 2533, 2534], offsets: [0.0088, 0.0063, 0.0052, 0.0047, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '17 +1' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1146], offsets: [0.0059], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1146, 2541], offsets: [0.0069, 0.0044], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1146, 2541, 2542], offsets: [0.0074, 0.0048, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1146, 2541, 2542, 2543], offsets: [0.0076, 0.005, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1146, 2541, 2542, 2543, 2544], offsets: [0.0077, 0.0051, 0.0047, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1146, 2541, 2541, 2542], offsets: [0.0085, 0.006, 0.0048, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1146, 2541, 2541, 2542, 2543], offsets: [0.0087, 0.0062, 0.005, 0.0046, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1146, 2541, 2541, 2542, 2543, 2544], offsets: [0.0088, 0.0063, 0.0051, 0.0047, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1156], offsets: [0.0059], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1156, 2551], offsets: [0.007, 0.0044], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1156, 2551, 2552], offsets: [0.0074, 0.0048, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1156, 2551, 2552, 2553], offsets: [0.0076, 0.005, 0.0046, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1156, 2551, 2552, 2553, 2554], offsets: [0.0077, 0.0051, 0.0047, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1156, 2551, 2551, 2552], offsets: [0.0086, 0.006, 0.0048, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1156, 2551, 2551, 2552, 2553], offsets: [0.0088, 0.0062, 0.005, 0.0046, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1156, 2551, 2551, 2552, 2553, 2554], offsets: [0.0089, 0.0063, 0.0051, 0.0047, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1166], offsets: [0.006], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1166, 2561], offsets: [0.007, 0.0044], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1166, 2561, 2562], offsets: [0.0074, 0.0049, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1166, 2561, 2562, 2563], offsets: [0.0076, 0.0051, 0.0046, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1166, 2561, 2562, 2563, 2564], offsets: [0.0077, 0.0051, 0.0047, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1166, 2561, 2561, 2562], offsets: [0.0087, 0.0061, 0.0049, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1166, 2561, 2561, 2562, 2563], offsets: [0.0089, 0.0063, 0.0051, 0.0046, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1166, 2561, 2561, 2562, 2563, 2564], offsets: [0.009, 0.0064, 0.0051, 0.0047, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 16,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1176], offsets: [0.006], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1176, 2571], offsets: [0.007, 0.0044], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1176, 2571, 2572], offsets: [0.0075, 0.0049, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1176, 2571, 2572, 2573], offsets: [0.0076, 0.005, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1176, 2571, 2572, 2573, 2574], offsets: [0.0077, 0.0051, 0.0046, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1176, 2571, 2571, 2572], offsets: [0.0087, 0.0061, 0.0049, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1176, 2571, 2571, 2572, 2573], offsets: [0.0089, 0.0063, 0.005, 0.0046, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1176, 2571, 2571, 2572, 2573, 2574], offsets: [0.0089, 0.0063, 0.0051, 0.0046, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 17,
      thicknessInch: 4.5,
      thicknessMm: 114.3,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1186], offsets: [0.006], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1186, 2581], offsets: [0.0072, 0.0045], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1186, 2581, 2582], offsets: [0.0076, 0.0049, 0.0045], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1186, 2581, 2582, 2583], offsets: [0.0077, 0.005, 0.0046, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1186, 2581, 2582, 2583, 2584], offsets: [0.0078, 0.0051, 0.0047, 0.0045, 0.0045], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1186, 2581, 2581, 2582], offsets: [0.0089, 0.0063, 0.0049, 0.0045], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1186, 2581, 2581, 2582, 2583], offsets: [0.009, 0.0064, 0.005, 0.0046, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1186, 2581, 2581, 2582, 2583, 2584], offsets: [0.0091, 0.0064, 0.0051, 0.0047, 0.0045, 0.0045], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 18,
      thicknessInch: 5,
      thicknessMm: 127,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1196], offsets: [0.006], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1196, 2591], offsets: [0.0073, 0.0046], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1196, 2591, 2592], offsets: [0.0077, 0.005, 0.0046], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1196, 2591, 2592, 2593], offsets: [0.0078, 0.0051, 0.0047, 0.0045], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1196, 2591, 2592, 2593, 2594], offsets: [0.0078, 0.0051, 0.0047, 0.0045, 0.0045], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1196, 2591, 2591, 2592], offsets: [0.0092, 0.0064, 0.005, 0.0046], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1196, 2591, 2591, 2592, 2593], offsets: [0.0092, 0.0065, 0.0051, 0.0047, 0.0045], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1196, 2591, 2591, 2592, 2593, 2594], offsets: [0.0093, 0.0065, 0.0051, 0.0047, 0.0045, 0.0045], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 19,
      thicknessInch: 5.5,
      thicknessMm: 139.7,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1206], offsets: [0.006], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1206, 2601], offsets: [0.0075, 0.0047], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1206, 2601, 2602], offsets: [0.0079, 0.0051, 0.0047], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1206, 2601, 2602, 2603], offsets: [0.0079, 0.0051, 0.0047, 0.0045], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1206, 2601, 2602, 2603, 2604], offsets: [0.0079, 0.0052, 0.0048, 0.0046, 0.0045], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1206, 2601, 2601, 2602], offsets: [0.0094, 0.0066, 0.0051, 0.0047], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1206, 2601, 2601, 2602, 2603], offsets: [0.0094, 0.0066, 0.0051, 0.0047, 0.0045], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1206, 2601, 2601, 2602, 2603, 2604], offsets: [0.0094, 0.0066, 0.0052, 0.0048, 0.0046, 0.0045], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 20,
      thicknessInch: 6,
      thicknessMm: 152.4,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1216], offsets: [0.006], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1216, 2611], offsets: [0.0076, 0.0047], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1216, 2611, 2612], offsets: [0.008, 0.0051, 0.0047], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1216, 2611, 2612, 2613], offsets: [0.008, 0.0051, 0.0047, 0.0046], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1216, 2611, 2612, 2613, 2614], offsets: [0.008, 0.0052, 0.0048, 0.0046, 0.0046], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1216, 2611, 2611, 2612], offsets: [0.0095, 0.0067, 0.0051, 0.0047], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1216, 2611, 2611, 2612, 2613], offsets: [0.0095, 0.0067, 0.0051, 0.0047, 0.0046], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1216, 2611, 2611, 2612, 2613, 2614], offsets: [0.0096, 0.0067, 0.0052, 0.0048, 0.0046, 0.0046], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
  ],
};

/** Block 16: 0.008" St - Both Away-L */
const MAKINO_SP_BLOCK_16: MakinoSPBlock = {
  headerNum: 16,
  type: 'BS',
  wireDiameter: '0.008',
  material: 'St',
  method: 'Both Away-L',
  recordCount: 20,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1027], offsets: [0.0049], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1027, 2426], offsets: [0.006, 0.0042], registers: [1, 2], feed: [0, 0], ra: '51' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1027, 2426, 2427], offsets: [0.0062, 0.0045, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1027, 2426, 2427, 2428], offsets: [0.0065, 0.0047, 0.0045, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1027, 2426, 2427, 2428, 2429], offsets: [0.0066, 0.0048, 0.0046, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1027, 2426, 2426, 2427], offsets: [0.0068, 0.0051, 0.0045, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [1027, 2426, 2426, 2427, 2428], offsets: [0.0071, 0.0053, 0.0047, 0.0045, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1027, 2426, 2426, 2427, 2428, 2429], offsets: [0.0072, 0.0055, 0.0048, 0.0046, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1037], offsets: [0.005], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1037, 2436], offsets: [0.0061, 0.0043], registers: [1, 2], feed: [0, 0], ra: '51' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1037, 2436, 2437], offsets: [0.0063, 0.0045, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1037, 2436, 2437, 2438], offsets: [0.0066, 0.0048, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1037, 2436, 2437, 2438, 2439], offsets: [0.0067, 0.0049, 0.0047, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1037, 2436, 2436, 2437], offsets: [0.0071, 0.0052, 0.0045, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [1037, 2436, 2436, 2437, 2438], offsets: [0.0074, 0.0055, 0.0048, 0.0046, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1037, 2436, 2436, 2437, 2438, 2439], offsets: [0.0074, 0.0056, 0.0049, 0.0047, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1047], offsets: [0.0052], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1047, 2446], offsets: [0.0063, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1047, 2446, 2447], offsets: [0.0065, 0.0045, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1047, 2446, 2447, 2448], offsets: [0.0068, 0.0048, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1047, 2446, 2447, 2448, 2449], offsets: [0.0069, 0.0049, 0.0046, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1047, 2446, 2446, 2447], offsets: [0.0074, 0.0054, 0.0045, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [1047, 2446, 2446, 2447, 2448], offsets: [0.0077, 0.0056, 0.0048, 0.0046, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1047, 2446, 2446, 2447, 2448, 2449], offsets: [0.0077, 0.0057, 0.0049, 0.0046, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1057], offsets: [0.0053], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1057, 2456], offsets: [0.0064, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1057, 2456, 2457], offsets: [0.0067, 0.0046, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1057, 2456, 2457, 2458], offsets: [0.007, 0.0048, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1057, 2456, 2457, 2458, 2459], offsets: [0.0071, 0.0049, 0.0047, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '12' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1057, 2456, 2456, 2457], offsets: [0.0076, 0.0055, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [1057, 2456, 2456, 2457, 2458], offsets: [0.0079, 0.0057, 0.0048, 0.0046, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1057, 2456, 2456, 2457, 2458, 2459], offsets: [0.008, 0.0059, 0.0049, 0.0047, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '12 +1' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1067], offsets: [0.0054], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1067, 2466], offsets: [0.0065, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1067, 2466, 2467], offsets: [0.0068, 0.0046, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1067, 2466, 2467, 2468], offsets: [0.007, 0.0048, 0.0046, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 15', approach: 'N', epacCodes: [1067, 2466, 2467, 2468, 2469], offsets: [0.0072, 0.0049, 0.0047, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '12' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1067, 2466, 2466, 2467], offsets: [0.0077, 0.0055, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1067, 2466, 2466, 2467, 2468], offsets: [0.008, 0.0058, 0.0048, 0.0046, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 15', approach: 'N', epacCodes: [1067, 2466, 2466, 2467, 2468, 2469], offsets: [0.0081, 0.0059, 0.0049, 0.0047, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '12 +1' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1077], offsets: [0.0055], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1077, 2476], offsets: [0.0065, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1077, 2476, 2477], offsets: [0.0069, 0.0046, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1077, 2476, 2477, 2478], offsets: [0.0071, 0.0048, 0.0046, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 15', approach: 'N', epacCodes: [1077, 2476, 2477, 2478, 2479], offsets: [0.0072, 0.0049, 0.0047, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1077, 2476, 2476, 2477], offsets: [0.0078, 0.0055, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1077, 2476, 2476, 2477, 2478], offsets: [0.008, 0.0058, 0.0048, 0.0046, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 15', approach: 'N', epacCodes: [1077, 2476, 2476, 2477, 2478, 2479], offsets: [0.0082, 0.0059, 0.0049, 0.0047, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1087], offsets: [0.0056], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1087, 2486], offsets: [0.0067, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1087, 2486, 2487], offsets: [0.007, 0.0046, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1087, 2486, 2487, 2488], offsets: [0.0072, 0.0049, 0.0046, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 15', approach: 'N', epacCodes: [1087, 2486, 2487, 2488, 2489], offsets: [0.0073, 0.005, 0.0047, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1087, 2486, 2486, 2487], offsets: [0.0079, 0.0056, 0.0046, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1087, 2486, 2486, 2487, 2488], offsets: [0.0082, 0.0058, 0.0049, 0.0046, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 15', approach: 'N', epacCodes: [1087, 2486, 2486, 2487, 2488, 2489], offsets: [0.0083, 0.0059, 0.005, 0.0047, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1097], offsets: [0.0057], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1097, 2496], offsets: [0.0068, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1097, 2496, 2497], offsets: [0.0071, 0.0047, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1097, 2496, 2497, 2498], offsets: [0.0073, 0.0049, 0.0046, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 15', approach: 'N', epacCodes: [1097, 2496, 2497, 2498, 2499], offsets: [0.0074, 0.005, 0.0048, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1097, 2496, 2496, 2497], offsets: [0.0081, 0.0057, 0.0047, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1097, 2496, 2496, 2497, 2498], offsets: [0.0083, 0.0059, 0.0049, 0.0046, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 15', approach: 'N', epacCodes: [1097, 2496, 2496, 2497, 2498, 2499], offsets: [0.0084, 0.006, 0.005, 0.0048, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1107], offsets: [0.0058], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1107, 2506], offsets: [0.0069, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1107, 2506, 2507], offsets: [0.0072, 0.0048, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1107, 2506, 2507, 2508], offsets: [0.0074, 0.0049, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 15', approach: 'N', epacCodes: [1107, 2506, 2507, 2508, 2509], offsets: [0.0076, 0.0051, 0.0048, 0.0045, 0.0045], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1107, 2506, 2506, 2507], offsets: [0.0082, 0.0058, 0.0048, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1107, 2506, 2506, 2507, 2508], offsets: [0.0084, 0.0059, 0.0049, 0.0046, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 15', approach: 'N', epacCodes: [1107, 2506, 2506, 2507, 2508, 2509], offsets: [0.0086, 0.0061, 0.0051, 0.0048, 0.0045, 0.0045], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1117], offsets: [0.0059], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1117, 2516], offsets: [0.007, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1117, 2516, 2517], offsets: [0.0073, 0.0048, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1117, 2516, 2517, 2518], offsets: [0.0075, 0.005, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 15', approach: 'N', epacCodes: [1117, 2516, 2517, 2518, 2519], offsets: [0.0077, 0.0052, 0.0048, 0.0045, 0.0045], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '17' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1117, 2516, 2516, 2517], offsets: [0.0084, 0.0059, 0.0048, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1117, 2516, 2516, 2517, 2518], offsets: [0.0085, 0.006, 0.005, 0.0046, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 15', approach: 'N', epacCodes: [1117, 2516, 2516, 2517, 2518, 2519], offsets: [0.0087, 0.0062, 0.0052, 0.0048, 0.0045, 0.0045], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '17 +1' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1127], offsets: [0.006], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1127, 2526], offsets: [0.0071, 0.0046], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1127, 2526, 2527], offsets: [0.0075, 0.0049, 0.0045], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1127, 2526, 2527, 2528], offsets: [0.0075, 0.005, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 15', approach: 'N', epacCodes: [1127, 2526, 2527, 2528, 2529], offsets: [0.0078, 0.0053, 0.0048, 0.0046, 0.0045], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '17' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1127, 2526, 2526, 2527], offsets: [0.0085, 0.006, 0.0049, 0.0045], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1127, 2526, 2526, 2527, 2528], offsets: [0.0086, 0.006, 0.005, 0.0046, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 15', approach: 'N', epacCodes: [1127, 2526, 2526, 2527, 2528, 2529], offsets: [0.0089, 0.0063, 0.0053, 0.0048, 0.0046, 0.0045], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '17 +1' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1137], offsets: [0.0059], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1137, 2536], offsets: [0.0069, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1137, 2536, 2537], offsets: [0.0073, 0.0048, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1137, 2536, 2537, 2538], offsets: [0.0075, 0.005, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 15', approach: 'N', epacCodes: [1137, 2536, 2537, 2538, 2539], offsets: [0.0077, 0.0052, 0.0047, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '17' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1137, 2536, 2536, 2537], offsets: [0.0084, 0.0059, 0.0048, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1137, 2536, 2536, 2537, 2538], offsets: [0.0087, 0.0062, 0.005, 0.0046, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 15', approach: 'N', epacCodes: [1137, 2536, 2536, 2537, 2538, 2539], offsets: [0.0088, 0.0063, 0.0052, 0.0047, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '17 +1' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1147], offsets: [0.0059], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1147, 2546], offsets: [0.0069, 0.0044], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1147, 2546, 2547], offsets: [0.0074, 0.0048, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1147, 2546, 2547, 2548], offsets: [0.0076, 0.005, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1147, 2546, 2547, 2548, 2549], offsets: [0.0077, 0.0051, 0.0047, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1147, 2546, 2546, 2547], offsets: [0.0085, 0.006, 0.0048, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1147, 2546, 2546, 2547, 2548], offsets: [0.0087, 0.0062, 0.005, 0.0046, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1147, 2546, 2546, 2547, 2548, 2549], offsets: [0.0088, 0.0063, 0.0051, 0.0047, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1157], offsets: [0.0059], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1157, 2556], offsets: [0.007, 0.0044], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1157, 2556, 2557], offsets: [0.0074, 0.0048, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1157, 2556, 2557, 2558], offsets: [0.0076, 0.005, 0.0046, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1157, 2556, 2557, 2558, 2559], offsets: [0.0077, 0.0051, 0.0047, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1157, 2556, 2556, 2557], offsets: [0.0086, 0.006, 0.0048, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1157, 2556, 2556, 2557, 2558], offsets: [0.0088, 0.0062, 0.005, 0.0046, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1157, 2556, 2556, 2557, 2558, 2559], offsets: [0.0089, 0.0063, 0.0051, 0.0047, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1167], offsets: [0.006], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1167, 2566], offsets: [0.007, 0.0044], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1167, 2566, 2567], offsets: [0.0074, 0.0049, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1167, 2566, 2567, 2568], offsets: [0.0076, 0.0051, 0.0046, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1167, 2566, 2567, 2568, 2569], offsets: [0.0077, 0.0051, 0.0047, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1167, 2566, 2566, 2567], offsets: [0.0087, 0.0061, 0.0049, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1167, 2566, 2566, 2567, 2568], offsets: [0.0089, 0.0063, 0.0051, 0.0046, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1167, 2566, 2566, 2567, 2568, 2569], offsets: [0.009, 0.0064, 0.0051, 0.0047, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 16,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1177], offsets: [0.006], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1177, 2576], offsets: [0.007, 0.0044], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1177, 2576, 2577], offsets: [0.0075, 0.0049, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1177, 2576, 2577, 2578], offsets: [0.0076, 0.005, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1177, 2576, 2577, 2578, 2579], offsets: [0.0077, 0.0051, 0.0046, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1177, 2576, 2576, 2577], offsets: [0.0087, 0.0061, 0.0049, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1177, 2576, 2576, 2577, 2578], offsets: [0.0089, 0.0063, 0.005, 0.0046, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1177, 2576, 2576, 2577, 2578, 2579], offsets: [0.0089, 0.0063, 0.0051, 0.0046, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 17,
      thicknessInch: 4.5,
      thicknessMm: 114.3,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1187], offsets: [0.006], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1187, 2586], offsets: [0.0072, 0.0045], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1187, 2586, 2587], offsets: [0.0076, 0.0049, 0.0045], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1187, 2586, 2587, 2588], offsets: [0.0077, 0.005, 0.0046, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1187, 2586, 2587, 2588, 2589], offsets: [0.0078, 0.0051, 0.0047, 0.0045, 0.0045], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1187, 2586, 2586, 2587], offsets: [0.0089, 0.0063, 0.0049, 0.0045], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1187, 2586, 2586, 2587, 2588], offsets: [0.009, 0.0064, 0.005, 0.0046, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1187, 2586, 2586, 2587, 2588, 2589], offsets: [0.0091, 0.0064, 0.0051, 0.0047, 0.0045, 0.0045], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 18,
      thicknessInch: 5,
      thicknessMm: 127,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1197], offsets: [0.006], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1197, 2596], offsets: [0.0073, 0.0046], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1197, 2596, 2597], offsets: [0.0077, 0.005, 0.0046], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1197, 2596, 2597, 2598], offsets: [0.0078, 0.0051, 0.0047, 0.0045], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1197, 2596, 2597, 2598, 2599], offsets: [0.0078, 0.0051, 0.0047, 0.0045, 0.0045], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1197, 2596, 2596, 2597], offsets: [0.0092, 0.0064, 0.005, 0.0046], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1197, 2596, 2596, 2597, 2598], offsets: [0.0092, 0.0065, 0.0051, 0.0047, 0.0045], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1197, 2596, 2596, 2597, 2598, 2599], offsets: [0.0093, 0.0065, 0.0051, 0.0047, 0.0045, 0.0045], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 19,
      thicknessInch: 5.5,
      thicknessMm: 139.7,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1207], offsets: [0.006], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1207, 2606], offsets: [0.0075, 0.0047], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1207, 2606, 2607], offsets: [0.0079, 0.0051, 0.0047], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1207, 2606, 2607, 2608], offsets: [0.0079, 0.0051, 0.0047, 0.0045], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1207, 2606, 2607, 2608, 2609], offsets: [0.0079, 0.0052, 0.0048, 0.0046, 0.0045], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1207, 2606, 2606, 2607], offsets: [0.0093, 0.0065, 0.0051, 0.0047], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1207, 2606, 2606, 2607, 2608], offsets: [0.0094, 0.0066, 0.0051, 0.0047, 0.0045], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1207, 2606, 2606, 2607, 2608, 2609], offsets: [0.0094, 0.0066, 0.0052, 0.0048, 0.0046, 0.0045], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 20,
      thicknessInch: 6,
      thicknessMm: 152.4,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1217], offsets: [0.006], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1217, 2616], offsets: [0.0076, 0.0047], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1217, 2616, 2617], offsets: [0.008, 0.0051, 0.0047], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1217, 2616, 2617, 2618], offsets: [0.008, 0.0051, 0.0047, 0.0046], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1217, 2616, 2617, 2618, 2619], offsets: [0.008, 0.0052, 0.0048, 0.0046, 0.0046], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1217, 2616, 2616, 2617], offsets: [0.0095, 0.0067, 0.0051, 0.0047], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1217, 2616, 2616, 2617, 2618], offsets: [0.0095, 0.0067, 0.0051, 0.0047, 0.0046], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1217, 2616, 2616, 2617, 2618, 2619], offsets: [0.0096, 0.0067, 0.0052, 0.0048, 0.0046, 0.0046], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
  ],
};

/** Block 17: 0.008" St - Fast Finish */
const MAKINO_SP_BLOCK_17: MakinoSPBlock = {
  headerNum: 17,
  type: 'BS',
  wireDiameter: '0.008',
  material: 'St',
  method: 'Fast Finish',
  recordCount: 28,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1023], offsets: [0.0048], registers: [1], feed: [0], ra: '96' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1023, 1424], offsets: [0.006, 0.0043], registers: [1, 2], feed: [0, 0], ra: '51' },
        { passNum: 3, label: 'Finish 15', approach: 'N', epacCodes: [1023, 1424, 1425], offsets: [0.0064, 0.0047, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '15' },
        { passNum: 4, label: '+1 Finish 15', approach: 'N', epacCodes: [1023, 1424, 1424, 1425], offsets: [0.0072, 0.0055, 0.0047, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1033], offsets: [0.0049], registers: [1], feed: [0], ra: '96' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1033, 1434], offsets: [0.0061, 0.0043], registers: [1, 2], feed: [0, 0], ra: '51' },
        { passNum: 3, label: 'Finish 15', approach: 'N', epacCodes: [1033, 1434, 1435], offsets: [0.0065, 0.0047, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '15' },
        { passNum: 4, label: '+1 Finish 15', approach: 'N', epacCodes: [1033, 1434, 1434, 1435], offsets: [0.0073, 0.0055, 0.0047, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1043], offsets: [0.005], registers: [1], feed: [0], ra: '96' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1043, 1444], offsets: [0.0062, 0.0043], registers: [1, 2], feed: [0, 0], ra: '51' },
        { passNum: 3, label: 'Finish 15', approach: 'N', epacCodes: [1043, 1444, 1445], offsets: [0.0066, 0.0047, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '15' },
        { passNum: 4, label: '+1 Finish 15', approach: 'N', epacCodes: [1043, 1444, 1444, 1445], offsets: [0.0074, 0.0055, 0.0047, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1053], offsets: [0.0052], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1053, 1454], offsets: [0.0063, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1053, 1454, 1455], offsets: [0.0067, 0.0047, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1053, 1454, 1454, 1455], offsets: [0.0075, 0.0055, 0.0047, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1063], offsets: [0.0052], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1063, 1464], offsets: [0.0063, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1063, 1464, 1465], offsets: [0.0067, 0.0047, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1063, 1464, 1464, 1465], offsets: [0.0075, 0.0055, 0.0047, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1073], offsets: [0.0052], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1073, 1474], offsets: [0.0064, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1073, 1474, 1475], offsets: [0.0067, 0.0047, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1073, 1474, 1474, 1475], offsets: [0.0076, 0.0056, 0.0047, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1083], offsets: [0.0053], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1083, 1484], offsets: [0.0064, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1083, 1484, 1485], offsets: [0.0068, 0.0047, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1083, 1484, 1484, 1485], offsets: [0.0077, 0.0056, 0.0047, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1093], offsets: [0.0054], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1093, 1494], offsets: [0.0065, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1093, 1494, 1495], offsets: [0.0069, 0.0047, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1093, 1494, 1494, 1495], offsets: [0.0078, 0.0057, 0.0047, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1103], offsets: [0.0054], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1103, 1504], offsets: [0.0066, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1103, 1504, 1505], offsets: [0.007, 0.0047, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1103, 1504, 1504, 1505], offsets: [0.0079, 0.0057, 0.0047, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1113], offsets: [0.0055], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1113, 1514], offsets: [0.0066, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1113, 1514, 1515], offsets: [0.007, 0.0047, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1113, 1514, 1514, 1515], offsets: [0.008, 0.0057, 0.0047, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1123], offsets: [0.0055], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1123, 1524], offsets: [0.0067, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1123, 1524, 1525], offsets: [0.007, 0.0047, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1123, 1524, 1524, 1525], offsets: [0.0081, 0.0057, 0.0047, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1133], offsets: [0.0055], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1133, 1534], offsets: [0.0067, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1133, 1534, 1535], offsets: [0.0071, 0.0047, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1133, 1534, 1534, 1535], offsets: [0.0081, 0.0058, 0.0047, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1143], offsets: [0.0056], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1143, 1544], offsets: [0.0068, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1143, 1544, 1545], offsets: [0.0071, 0.0047, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1143, 1544, 1544, 1545], offsets: [0.0082, 0.0058, 0.0047, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1153], offsets: [0.0056], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1153, 1554], offsets: [0.0068, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1153, 1554, 1555], offsets: [0.0072, 0.0047, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1153, 1554, 1554, 1555], offsets: [0.0083, 0.0058, 0.0047, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1163], offsets: [0.0057], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1163, 1564], offsets: [0.0069, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1163, 1564, 1565], offsets: [0.0073, 0.0047, 0.0045], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1163, 1564, 1564, 1565], offsets: [0.0084, 0.0059, 0.0047, 0.0045], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 16,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1173], offsets: [0.0057], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1173, 1574], offsets: [0.007, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1173, 1574, 1575], offsets: [0.0074, 0.0048, 0.0045], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1173, 1574, 1574, 1575], offsets: [0.0085, 0.0059, 0.0048, 0.0045], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 17,
      thicknessInch: 4.5,
      thicknessMm: 114.3,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1183], offsets: [0.0059], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1183, 1584], offsets: [0.0071, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1183, 1584, 1585], offsets: [0.0074, 0.0048, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1183, 1584, 1584, 1585], offsets: [0.0087, 0.0061, 0.0048, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 18,
      thicknessInch: 5,
      thicknessMm: 127,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1193], offsets: [0.006], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1193, 1594], offsets: [0.0072, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1193, 1594, 1595], offsets: [0.0075, 0.0048, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1193, 1594, 1594, 1595], offsets: [0.009, 0.0062, 0.0048, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 19,
      thicknessInch: 5.5,
      thicknessMm: 139.7,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1203], offsets: [0.0061], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1203, 1604], offsets: [0.0073, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1203, 1604, 1605], offsets: [0.0076, 0.0048, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1203, 1604, 1604, 1605], offsets: [0.0091, 0.0064, 0.0048, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 20,
      thicknessInch: 6,
      thicknessMm: 152.4,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1213], offsets: [0.0061], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1213, 1614], offsets: [0.0073, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1213, 1614, 1615], offsets: [0.0076, 0.0048, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1213, 1614, 1614, 1615], offsets: [0.0093, 0.0065, 0.0048, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 21,
      thicknessInch: 6.5,
      thicknessMm: 165.1,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1223], offsets: [0.0062], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1223, 1624], offsets: [0.0074, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1223, 1624, 1625], offsets: [0.0077, 0.0049, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1223, 1624, 1624, 1625], offsets: [0.0095, 0.0066, 0.0049, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 22,
      thicknessInch: 7,
      thicknessMm: 177.8,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1233], offsets: [0.0061], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1233, 1634], offsets: [0.0073, 0.0045], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1233, 1634, 1635], offsets: [0.0076, 0.0048, 0.0045], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 23,
      thicknessInch: 7.5,
      thicknessMm: 190.5,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1243], offsets: [0.0062], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1243, 1644], offsets: [0.0074, 0.0046], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1243, 1644, 1645], offsets: [0.0078, 0.005, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 24,
      thicknessInch: 8,
      thicknessMm: 203.2,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1253], offsets: [0.0062], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1253, 1654], offsets: [0.0074, 0.0046], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1253, 1654, 1655], offsets: [0.0078, 0.005, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 25,
      thicknessInch: 9,
      thicknessMm: 228.6,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1263], offsets: [0.0062], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1263, 1664], offsets: [0.0074, 0.0047], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1263, 1664, 1665], offsets: [0.0079, 0.0052, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 26,
      thicknessInch: 10,
      thicknessMm: 254,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1273], offsets: [0.0062], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1273, 1674], offsets: [0.0074, 0.0048], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1273, 1674, 1675], offsets: [0.008, 0.0054, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 27,
      thicknessInch: 11,
      thicknessMm: 279.4,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1283], offsets: [0.0063], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1283, 1684], offsets: [0.0075, 0.0048], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1283, 1684, 1685], offsets: [0.0081, 0.0054, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 28,
      thicknessInch: 12,
      thicknessMm: 304.8,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1293], offsets: [0.0063], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1293, 1694], offsets: [0.0075, 0.0048], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1293, 1694, 1695], offsets: [0.0081, 0.0054, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
  ],
};

/** Block 18: 0.008" St - High Precision */
const MAKINO_SP_BLOCK_18: MakinoSPBlock = {
  headerNum: 18,
  type: 'BS',
  wireDiameter: '0.008',
  material: 'St',
  method: 'High Precision',
  recordCount: 10,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1025], offsets: [0.0049], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1025, 2674], offsets: [0.006, 0.0042], registers: [1, 2], feed: [0, 0], ra: '51' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1025, 2674, 2675], offsets: [0.0063, 0.0046, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1025, 2674, 2675, 2676], offsets: [0.0064, 0.0047, 0.0043, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [1025, 2674, 2675, 2676, 2677], offsets: [0.0065, 0.0048, 0.0044, 0.0043, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '6' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1025, 2674, 2674, 2675], offsets: [0.0071, 0.0053, 0.0046, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [1025, 2674, 2674, 2675, 2676], offsets: [0.0072, 0.0054, 0.0047, 0.0043, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
        { passNum: 8, label: '+1 Finish 6', approach: 'N', epacCodes: [1025, 2674, 2674, 2675, 2676, 2677], offsets: [0.0072, 0.0055, 0.0048, 0.0044, 0.0043, 0.0043], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '6 +1' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1035], offsets: [0.005], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1035, 2694], offsets: [0.0061, 0.0043], registers: [1, 2], feed: [0, 0], ra: '51' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1035, 2694, 2695], offsets: [0.0065, 0.0046, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1035, 2694, 2695, 2696], offsets: [0.0066, 0.0048, 0.0044, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [1035, 2694, 2695, 2696, 2697], offsets: [0.0067, 0.0049, 0.0045, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '6' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1035, 2694, 2694, 2695], offsets: [0.0073, 0.0054, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [1035, 2694, 2694, 2695, 2696], offsets: [0.0075, 0.0056, 0.0048, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
        { passNum: 8, label: '+1 Finish 6', approach: 'N', epacCodes: [1035, 2694, 2694, 2695, 2696, 2697], offsets: [0.0075, 0.0057, 0.0049, 0.0045, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '6 +1' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1045], offsets: [0.0052], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1045, 2704], offsets: [0.0064, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1045, 2704, 2705], offsets: [0.0066, 0.0046, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1045, 2704, 2705, 2706], offsets: [0.0068, 0.0047, 0.0044, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [1045, 2704, 2705, 2706, 2707], offsets: [0.0069, 0.0048, 0.0045, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '6' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1045, 2704, 2704, 2705], offsets: [0.0075, 0.0054, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [1045, 2704, 2704, 2705, 2706], offsets: [0.0076, 0.0056, 0.0047, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
        { passNum: 8, label: '+1 Finish 6', approach: 'N', epacCodes: [1045, 2704, 2704, 2705, 2706, 2707], offsets: [0.0077, 0.0056, 0.0048, 0.0045, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '6 +1' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1055], offsets: [0.0053], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1055, 2714], offsets: [0.0064, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1055, 2714, 2715], offsets: [0.0067, 0.0046, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1055, 2714, 2715, 2716], offsets: [0.0068, 0.0047, 0.0044, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [1055, 2714, 2715, 2716, 2717], offsets: [0.0069, 0.0048, 0.0045, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '6' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1055, 2714, 2714, 2715], offsets: [0.0076, 0.0055, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [1055, 2714, 2714, 2715, 2716], offsets: [0.0078, 0.0056, 0.0047, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
        { passNum: 8, label: '+1 Finish 6', approach: 'N', epacCodes: [1055, 2714, 2714, 2715, 2716, 2717], offsets: [0.0078, 0.0057, 0.0048, 0.0045, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '6 +1' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1065], offsets: [0.0054], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1065, 2724], offsets: [0.0065, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1065, 2724, 2725], offsets: [0.0068, 0.0046, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1065, 2724, 2725, 2726], offsets: [0.0069, 0.0047, 0.0044, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [1065, 2724, 2725, 2726, 2727], offsets: [0.007, 0.0048, 0.0045, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '6' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1065, 2724, 2724, 2725], offsets: [0.0078, 0.0056, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [1065, 2724, 2724, 2725, 2726], offsets: [0.0079, 0.0057, 0.0047, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
        { passNum: 8, label: '+1 Finish 6', approach: 'N', epacCodes: [1065, 2724, 2724, 2725, 2726, 2727], offsets: [0.0079, 0.0057, 0.0048, 0.0045, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '6 +1' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1075], offsets: [0.0055], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1075, 2734], offsets: [0.0065, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1075, 2734, 2735], offsets: [0.0069, 0.0047, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1075, 2734, 2735, 2736], offsets: [0.007, 0.0047, 0.0044, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1075, 2734, 2735, 2736, 2737], offsets: [0.0071, 0.0048, 0.0045, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1075, 2734, 2734, 2735], offsets: [0.0079, 0.0056, 0.0047, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1075, 2734, 2734, 2735, 2736], offsets: [0.008, 0.0057, 0.0047, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1075, 2734, 2734, 2735, 2736, 2737], offsets: [0.008, 0.0058, 0.0048, 0.0045, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1085], offsets: [0.0056], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1085, 2744], offsets: [0.0066, 0.0043], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1085, 2744, 2745], offsets: [0.007, 0.0047, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1085, 2744, 2745, 2746], offsets: [0.0071, 0.0048, 0.0044, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1085, 2744, 2745, 2746, 2747], offsets: [0.0072, 0.0049, 0.0045, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1085, 2744, 2744, 2745], offsets: [0.008, 0.0057, 0.0047, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1085, 2744, 2744, 2745, 2746], offsets: [0.0081, 0.0058, 0.0048, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1085, 2744, 2744, 2745, 2746, 2747], offsets: [0.0082, 0.0059, 0.0049, 0.0045, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1095], offsets: [0.0057], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1095, 2754], offsets: [0.0067, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1095, 2754, 2755], offsets: [0.0071, 0.0048, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1095, 2754, 2755, 2756], offsets: [0.0073, 0.0049, 0.0045, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1095, 2754, 2755, 2756, 2757], offsets: [0.0073, 0.0049, 0.0045, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1095, 2754, 2754, 2755], offsets: [0.0082, 0.0058, 0.0048, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1095, 2754, 2754, 2755, 2756], offsets: [0.0083, 0.006, 0.0049, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1095, 2754, 2754, 2755, 2756, 2757], offsets: [0.0083, 0.006, 0.0049, 0.0045, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1105], offsets: [0.0057], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1105, 2764], offsets: [0.0068, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1105, 2764, 2765], offsets: [0.0072, 0.0048, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1105, 2764, 2765, 2766], offsets: [0.0074, 0.0049, 0.0045, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1105, 2764, 2765, 2766, 2767], offsets: [0.0074, 0.0049, 0.0045, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1105, 2764, 2764, 2765], offsets: [0.0083, 0.0058, 0.0048, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1105, 2764, 2764, 2765, 2766], offsets: [0.0084, 0.006, 0.0049, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1105, 2764, 2764, 2765, 2766, 2767], offsets: [0.0084, 0.006, 0.0049, 0.0045, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1115], offsets: [0.0058], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1115, 2774], offsets: [0.0068, 0.0044], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1115, 2774, 2775], offsets: [0.0073, 0.0048, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1115, 2774, 2775, 2776], offsets: [0.0074, 0.0049, 0.0045, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1115, 2774, 2775, 2776, 2777], offsets: [0.0074, 0.0049, 0.0045, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1115, 2774, 2774, 2775], offsets: [0.0083, 0.0058, 0.0048, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1115, 2774, 2774, 2775, 2776], offsets: [0.0085, 0.006, 0.0049, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1115, 2774, 2774, 2775, 2776, 2777], offsets: [0.0085, 0.006, 0.0049, 0.0045, 0.0044, 0.0043], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
  ],
};

/** Block 19: 0.008" St - Precision */
const MAKINO_SP_BLOCK_19: MakinoSPBlock = {
  headerNum: 19,
  type: 'BS',
  wireDiameter: '0.008',
  material: 'St',
  method: 'Precision',
  recordCount: 10,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1024], offsets: [0.0048], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1024, 2671], offsets: [0.0056, 0.0043], registers: [1, 2], feed: [0, 0], ra: '56' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1024, 2671, 2672], offsets: [0.006, 0.0046, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1024, 2671, 2672, 2673], offsets: [0.006, 0.0047, 0.0044, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 20', approach: 'N', epacCodes: [1024, 2671, 2671, 2672], offsets: [0.0067, 0.0054, 0.0046, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [1024, 2671, 2671, 2672, 2673], offsets: [0.0068, 0.0054, 0.0047, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1034], offsets: [0.0048], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1034, 2691], offsets: [0.0057, 0.0042], registers: [1, 2], feed: [0, 0], ra: '56' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1034, 2691, 2692], offsets: [0.0061, 0.0046, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1034, 2691, 2692, 2693], offsets: [0.0061, 0.0047, 0.0045, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 20', approach: 'N', epacCodes: [1034, 2691, 2691, 2692], offsets: [0.0068, 0.0054, 0.0046, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [1034, 2691, 2691, 2692, 2693], offsets: [0.0069, 0.0054, 0.0047, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1044], offsets: [0.0048], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1044, 2701], offsets: [0.0056, 0.0042], registers: [1, 2], feed: [0, 0], ra: '56' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1044, 2701, 2702], offsets: [0.0059, 0.0046, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1044, 2701, 2702, 2703], offsets: [0.006, 0.0047, 0.0044, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 20', approach: 'N', epacCodes: [1044, 2701, 2701, 2702], offsets: [0.0067, 0.0054, 0.0046, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [1044, 2701, 2701, 2702, 2703], offsets: [0.0068, 0.0054, 0.0047, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1054], offsets: [0.005], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1054, 2711], offsets: [0.0059, 0.0043], registers: [1, 2], feed: [0, 0], ra: '56' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1054, 2711, 2712], offsets: [0.0063, 0.0047, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1054, 2711, 2712, 2713], offsets: [0.0063, 0.0048, 0.0044, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 20', approach: 'N', epacCodes: [1054, 2711, 2711, 2712], offsets: [0.0072, 0.0056, 0.0047, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [1054, 2711, 2711, 2712, 2713], offsets: [0.0073, 0.0057, 0.0048, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1064], offsets: [0.005], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1064, 2721], offsets: [0.006, 0.0043], registers: [1, 2], feed: [0, 0], ra: '56' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1064, 2721, 2722], offsets: [0.0065, 0.0047, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1064, 2721, 2722, 2723], offsets: [0.0065, 0.0048, 0.0045, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 20', approach: 'N', epacCodes: [1064, 2721, 2721, 2722], offsets: [0.0074, 0.0057, 0.0047, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [1064, 2721, 2721, 2722, 2723], offsets: [0.0075, 0.0058, 0.0048, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1074], offsets: [0.0051], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1074, 2731], offsets: [0.0061, 0.0043], registers: [1, 2], feed: [0, 0], ra: '56' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1074, 2731, 2732], offsets: [0.0065, 0.0047, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1074, 2731, 2732, 2733], offsets: [0.0066, 0.0048, 0.0045, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 20', approach: 'N', epacCodes: [1074, 2731, 2731, 2732], offsets: [0.0075, 0.0057, 0.0047, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [1074, 2731, 2731, 2732, 2733], offsets: [0.0076, 0.0058, 0.0048, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1084], offsets: [0.0052], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1084, 2741], offsets: [0.0061, 0.0043], registers: [1, 2], feed: [0, 0], ra: '56' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1084, 2741, 2742], offsets: [0.0065, 0.0047, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1084, 2741, 2742, 2743], offsets: [0.0066, 0.0048, 0.0045, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 20', approach: 'N', epacCodes: [1084, 2741, 2741, 2742], offsets: [0.0076, 0.0058, 0.0047, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [1084, 2741, 2741, 2742, 2743], offsets: [0.0077, 0.0059, 0.0048, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1094], offsets: [0.0052], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1094, 2751], offsets: [0.0062, 0.0043], registers: [1, 2], feed: [0, 0], ra: '56' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1094, 2751, 2752], offsets: [0.0065, 0.0047, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1094, 2751, 2752, 2753], offsets: [0.0067, 0.0048, 0.0044, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 20', approach: 'N', epacCodes: [1094, 2751, 2751, 2752], offsets: [0.0078, 0.0059, 0.0047, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [1094, 2751, 2751, 2752, 2753], offsets: [0.0079, 0.0061, 0.0048, 0.0044, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1104], offsets: [0.0054], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1104, 2761], offsets: [0.0063, 0.0043], registers: [1, 2], feed: [0, 0], ra: '56' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1104, 2761, 2762], offsets: [0.0067, 0.0047, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1104, 2761, 2762, 2763], offsets: [0.0068, 0.0049, 0.0045, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 20', approach: 'N', epacCodes: [1104, 2761, 2761, 2762], offsets: [0.008, 0.006, 0.0047, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [1104, 2761, 2761, 2762, 2763], offsets: [0.0081, 0.0062, 0.0049, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1114], offsets: [0.0054], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1114, 2771], offsets: [0.0064, 0.0044], registers: [1, 2], feed: [0, 0], ra: '56' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1114, 2771, 2772], offsets: [0.0068, 0.0047, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1114, 2771, 2772, 2773], offsets: [0.0069, 0.0049, 0.0045, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 20', approach: 'N', epacCodes: [1114, 2771, 2771, 2772], offsets: [0.0082, 0.0061, 0.0047, 0.0044], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [1114, 2771, 2771, 2772, 2773], offsets: [0.0083, 0.0062, 0.0049, 0.0045, 0.0044], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
  ],
};

/** Block 20: 0.008" St - Varying Thickness */
const MAKINO_SP_BLOCK_20: MakinoSPBlock = {
  headerNum: 20,
  type: 'BS',
  wireDiameter: '0.008',
  material: 'St',
  method: 'Varying Thickness',
  recordCount: 3,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1069], offsets: [0.0057], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1149], offsets: [0.0061], registers: [1], feed: [0], ra: '136' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1219], offsets: [0.0062], registers: [1], feed: [0], ra: '136' },
      ],
    },
  ],
};

/** Block 21: 0.008" WC - Both Away */
const MAKINO_SP_BLOCK_21: MakinoSPBlock = {
  headerNum: 21,
  type: 'BS',
  wireDiameter: '0.008',
  material: 'WC',
  method: 'Both Away',
  recordCount: 10,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5026], offsets: [0.0051], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5026, 5426], offsets: [0.0062, 0.0042], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5026, 5426, 5427], offsets: [0.0065, 0.0045, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5026, 5426, 5427, 5428], offsets: [0.0066, 0.0047, 0.0044, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '9' },
        { passNum: 5, label: 'Finish 4', approach: 'N', epacCodes: [5026, 5426, 5427, 5428, 5429], offsets: [0.0067, 0.0048, 0.0045, 0.0043, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5036], offsets: [0.0053], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5036, 5436], offsets: [0.0064, 0.0043], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5036, 5436, 5437], offsets: [0.0067, 0.0046, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5036, 5436, 5437, 5438], offsets: [0.0068, 0.0047, 0.0044, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '9' },
        { passNum: 5, label: 'Finish 4', approach: 'N', epacCodes: [5036, 5436, 5437, 5438, 5439], offsets: [0.0069, 0.0048, 0.0045, 0.0043, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5046], offsets: [0.0054], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5046, 5446], offsets: [0.0065, 0.0043], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5046, 5446, 5447], offsets: [0.0068, 0.0046, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5046, 5446, 5447, 5448], offsets: [0.007, 0.0047, 0.0044, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '9' },
        { passNum: 5, label: 'Finish 4', approach: 'N', epacCodes: [5046, 5446, 5447, 5448, 5449], offsets: [0.007, 0.0048, 0.0045, 0.0043, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5056], offsets: [0.0056], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5056, 5456], offsets: [0.0067, 0.0043], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5056, 5456, 5457], offsets: [0.007, 0.0046, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5056, 5456, 5457, 5458], offsets: [0.0071, 0.0048, 0.0044, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '9' },
        { passNum: 5, label: 'Finish 4', approach: 'N', epacCodes: [5056, 5456, 5457, 5458, 5459], offsets: [0.0072, 0.0048, 0.0045, 0.0043, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5066], offsets: [0.0057], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5066, 5466], offsets: [0.0069, 0.0044], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5066, 5466, 5467], offsets: [0.0072, 0.0047, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5066, 5466, 5467, 5468], offsets: [0.0073, 0.0048, 0.0044, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '9' },
        { passNum: 5, label: 'Finish 4', approach: 'N', epacCodes: [5066, 5466, 5467, 5468, 5469], offsets: [0.0074, 0.0049, 0.0045, 0.0043, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5076], offsets: [0.0057], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5076, 5476], offsets: [0.0069, 0.0044], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5076, 5476, 5477], offsets: [0.0072, 0.0047, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [5076, 5476, 5477, 5478], offsets: [0.0073, 0.0048, 0.0044, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '12' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [5076, 5476, 5477, 5478, 5479], offsets: [0.0074, 0.0049, 0.0046, 0.0044, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '9' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5086], offsets: [0.0058], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5086, 5486], offsets: [0.0069, 0.0044], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5086, 5486, 5487], offsets: [0.0072, 0.0047, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [5086, 5486, 5487, 5488], offsets: [0.0073, 0.0048, 0.0044, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '12' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [5086, 5486, 5487, 5488, 5489], offsets: [0.0074, 0.0049, 0.0045, 0.0044, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '9' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5096], offsets: [0.0058], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5096, 5496], offsets: [0.0069, 0.0044], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5096, 5496, 5497], offsets: [0.0072, 0.0047, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [5096, 5496, 5497, 5498], offsets: [0.0073, 0.0048, 0.0044, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '12' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [5096, 5496, 5497, 5498, 5499], offsets: [0.0074, 0.0049, 0.0045, 0.0044, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '9' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5106], offsets: [0.0059], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5106, 5506], offsets: [0.0069, 0.0044], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5106, 5506, 5507], offsets: [0.0072, 0.0047, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [5106, 5506, 5507, 5508], offsets: [0.0074, 0.0048, 0.0044, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '12' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [5106, 5506, 5507, 5508, 5509], offsets: [0.0074, 0.0049, 0.0045, 0.0043, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '9' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5116], offsets: [0.006], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5116, 5516], offsets: [0.007, 0.0044], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5116, 5516, 5517], offsets: [0.0072, 0.0047, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [5116, 5516, 5517, 5518], offsets: [0.0074, 0.0048, 0.0044, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '12' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [5116, 5516, 5517, 5518, 5519], offsets: [0.0075, 0.0049, 0.0045, 0.0043, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '9' },
      ],
    },
  ],
};

/** Block 22: 0.008" WC - High Precision */
const MAKINO_SP_BLOCK_22: MakinoSPBlock = {
  headerNum: 22,
  type: 'BS',
  wireDiameter: '0.008',
  material: 'WC',
  method: 'High Precision',
  recordCount: 10,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5025], offsets: [0.0052], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5025, 5421], offsets: [0.0062, 0.0042], registers: [1, 2], feed: [0, 0], ra: '44' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [5025, 5421, 5422], offsets: [0.0065, 0.0045, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5025, 5421, 5422, 5423], offsets: [0.0066, 0.0046, 0.0044, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '9' },
        { passNum: 5, label: 'Finish 4', approach: 'N', epacCodes: [5025, 5421, 5422, 5423, 5424], offsets: [0.0067, 0.0047, 0.0045, 0.0043, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5035], offsets: [0.0054], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5035, 5431], offsets: [0.0064, 0.0042], registers: [1, 2], feed: [0, 0], ra: '44' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [5035, 5431, 5432], offsets: [0.0067, 0.0045, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5035, 5431, 5432, 5433], offsets: [0.0068, 0.0047, 0.0044, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '9' },
        { passNum: 5, label: 'Finish 4', approach: 'N', epacCodes: [5035, 5431, 5432, 5433, 5434], offsets: [0.0069, 0.0047, 0.0045, 0.0043, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5045], offsets: [0.0054], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5045, 5441], offsets: [0.0065, 0.0043], registers: [1, 2], feed: [0, 0], ra: '44' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [5045, 5441, 5442], offsets: [0.0067, 0.0045, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5045, 5441, 5442, 5443], offsets: [0.0069, 0.0047, 0.0044, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '9' },
        { passNum: 5, label: 'Finish 4', approach: 'N', epacCodes: [5045, 5441, 5442, 5443, 5444], offsets: [0.007, 0.0048, 0.0045, 0.0043, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5055], offsets: [0.0055], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5055, 5451], offsets: [0.0066, 0.0043], registers: [1, 2], feed: [0, 0], ra: '44' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [5055, 5451, 5452], offsets: [0.0068, 0.0046, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5055, 5451, 5452, 5453], offsets: [0.007, 0.0048, 0.0044, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '9' },
        { passNum: 5, label: 'Finish 4', approach: 'N', epacCodes: [5055, 5451, 5452, 5453, 5454], offsets: [0.0071, 0.0048, 0.0045, 0.0043, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5065], offsets: [0.0055], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5065, 5461], offsets: [0.0067, 0.0044], registers: [1, 2], feed: [0, 0], ra: '44' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [5065, 5461, 5462], offsets: [0.0069, 0.0046, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5065, 5461, 5462, 5463], offsets: [0.0071, 0.0048, 0.0044, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '9' },
        { passNum: 5, label: 'Finish 4', approach: 'N', epacCodes: [5065, 5461, 5462, 5463, 5464], offsets: [0.0072, 0.0049, 0.0045, 0.0043, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5075], offsets: [0.0056], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5075, 5471], offsets: [0.0068, 0.0044], registers: [1, 2], feed: [0, 0], ra: '44' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [5075, 5471, 5472], offsets: [0.007, 0.0047, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5075, 5471, 5472, 5473], offsets: [0.0072, 0.0048, 0.0044, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '10' },
        { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [5075, 5471, 5472, 5473, 5474], offsets: [0.0073, 0.0049, 0.0045, 0.0043, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '5' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5085], offsets: [0.0057], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5085, 5481], offsets: [0.0068, 0.0044], registers: [1, 2], feed: [0, 0], ra: '44' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [5085, 5481, 5482], offsets: [0.0071, 0.0047, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5085, 5481, 5482, 5483], offsets: [0.0072, 0.0048, 0.0044, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '10' },
        { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [5085, 5481, 5482, 5483, 5484], offsets: [0.0073, 0.0049, 0.0045, 0.0043, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '5' },
        { passNum: 6, label: '+1 Finish 30', approach: 'N', epacCodes: [5085, 5481, 5481, 5482], offsets: [0.0079, 0.0055, 0.0047, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '31 +1' },
        { passNum: 7, label: '+1 Finish 10', approach: 'N', epacCodes: [5085, 5481, 5481, 5482, 5483], offsets: [0.008, 0.0056, 0.0048, 0.0044, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10 +1' },
        { passNum: 8, label: '+1 Finish 6', approach: 'N', epacCodes: [5085, 5481, 5481, 5482, 5483, 5484], offsets: [0.0081, 0.0057, 0.0049, 0.0045, 0.0043, 0.0042], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '5 +1' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5095], offsets: [0.0058], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5095, 5491], offsets: [0.0068, 0.0044], registers: [1, 2], feed: [0, 0], ra: '44' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [5095, 5491, 5492], offsets: [0.0071, 0.0047, 0.0043], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5095, 5491, 5492, 5493], offsets: [0.0072, 0.0048, 0.0044, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '10' },
        { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [5095, 5491, 5492, 5493, 5494], offsets: [0.0073, 0.0049, 0.0045, 0.0043, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '5' },
        { passNum: 6, label: '+1 Finish 30', approach: 'N', epacCodes: [5095, 5491, 5491, 5492], offsets: [0.0079, 0.0055, 0.0047, 0.0043], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '31 +1' },
        { passNum: 7, label: '+1 Finish 10', approach: 'N', epacCodes: [5095, 5491, 5491, 5492, 5493], offsets: [0.008, 0.0056, 0.0048, 0.0044, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10 +1' },
        { passNum: 8, label: '+1 Finish 6', approach: 'N', epacCodes: [5095, 5491, 5491, 5492, 5493, 5494], offsets: [0.0081, 0.0057, 0.0049, 0.0045, 0.0043, 0.0042], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '5 +1' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5105], offsets: [0.0059], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5105, 5501], offsets: [0.0069, 0.0044], registers: [1, 2], feed: [0, 0], ra: '44' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [5105, 5501, 5502], offsets: [0.0072, 0.0046, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5105, 5501, 5502, 5503], offsets: [0.0073, 0.0048, 0.0044, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '10' },
        { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [5105, 5501, 5502, 5503, 5504], offsets: [0.0074, 0.0048, 0.0044, 0.0043, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '5' },
        { passNum: 6, label: '+1 Finish 30', approach: 'N', epacCodes: [5105, 5501, 5501, 5502], offsets: [0.008, 0.0054, 0.0046, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '31 +1' },
        { passNum: 7, label: '+1 Finish 10', approach: 'N', epacCodes: [5105, 5501, 5501, 5502, 5503], offsets: [0.0081, 0.0055, 0.0048, 0.0044, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10 +1' },
        { passNum: 8, label: '+1 Finish 6', approach: 'N', epacCodes: [5105, 5501, 5501, 5502, 5503, 5504], offsets: [0.0082, 0.0056, 0.0048, 0.0044, 0.0043, 0.0042], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '5 +1' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5115], offsets: [0.006], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5115, 5511], offsets: [0.007, 0.0044], registers: [1, 2], feed: [0, 0], ra: '44' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [5115, 5511, 5512], offsets: [0.0072, 0.0046, 0.0042], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5115, 5511, 5512, 5513], offsets: [0.0073, 0.0047, 0.0044, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '10' },
        { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [5115, 5511, 5512, 5513, 5514], offsets: [0.0074, 0.0048, 0.0044, 0.0043, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '5' },
        { passNum: 6, label: '+1 Finish 30', approach: 'N', epacCodes: [5115, 5511, 5511, 5512], offsets: [0.008, 0.0054, 0.0046, 0.0042], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '31 +1' },
        { passNum: 7, label: '+1 Finish 10', approach: 'N', epacCodes: [5115, 5511, 5511, 5512, 5513], offsets: [0.0081, 0.0055, 0.0047, 0.0044, 0.0042], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10 +1' },
        { passNum: 8, label: '+1 Finish 6', approach: 'N', epacCodes: [5115, 5511, 5511, 5512, 5513, 5514], offsets: [0.0082, 0.0056, 0.0048, 0.0044, 0.0043, 0.0042], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '5 +1' },
      ],
    },
  ],
};

/** Block 23: 0.01" AL - High Precision */
const MAKINO_SP_BLOCK_23: MakinoSPBlock = {
  headerNum: 23,
  type: 'BS',
  wireDiameter: '0.01',
  material: 'AL',
  method: 'High Precision',
  recordCount: 28,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4025], offsets: [0.0066], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4025, 4424], offsets: [0.0078, 0.0053], registers: [1, 2], feed: [0, 0], ra: '51' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [4025, 4424, 4425], offsets: [0.0083, 0.0057, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '17' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [4025, 4424, 4424, 4425], offsets: [0.009, 0.0064, 0.0057, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '17 +1' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4035], offsets: [0.0066], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4035, 4434], offsets: [0.0078, 0.0053], registers: [1, 2], feed: [0, 0], ra: '51' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [4035, 4434, 4435], offsets: [0.0083, 0.0057, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '17' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [4035, 4434, 4434, 4435], offsets: [0.0091, 0.0065, 0.0057, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '17 +1' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4045], offsets: [0.0066], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4045, 4444], offsets: [0.0078, 0.0053], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [4045, 4444, 4445], offsets: [0.0083, 0.0057, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [4045, 4444, 4445, 4446], offsets: [0.0085, 0.006, 0.0056, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '17' },
        { passNum: 5, label: '+1 Finish 35', approach: 'N', epacCodes: [4045, 4444, 4444, 4445], offsets: [0.0092, 0.0066, 0.0057, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 6, label: '+1 Finish 20', approach: 'N', epacCodes: [4045, 4444, 4444, 4445, 4446], offsets: [0.0094, 0.0068, 0.006, 0.0056, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '17 +1' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4055], offsets: [0.0067], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4055, 4454], offsets: [0.008, 0.0053], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [4055, 4454, 4455], offsets: [0.0084, 0.0057, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [4055, 4454, 4455, 4456], offsets: [0.0087, 0.006, 0.0055, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '17' },
        { passNum: 5, label: '+1 Finish 35', approach: 'N', epacCodes: [4055, 4454, 4454, 4455], offsets: [0.0093, 0.0067, 0.0057, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 6, label: '+1 Finish 20', approach: 'N', epacCodes: [4055, 4454, 4454, 4455, 4456], offsets: [0.0096, 0.0069, 0.006, 0.0055, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '17 +1' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4065], offsets: [0.0068], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4065, 4464], offsets: [0.0081, 0.0053], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [4065, 4464, 4465], offsets: [0.0085, 0.0058, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [4065, 4464, 4465, 4466], offsets: [0.0088, 0.006, 0.0055, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '17' },
        { passNum: 5, label: '+1 Finish 35', approach: 'N', epacCodes: [4065, 4464, 4464, 4465], offsets: [0.0095, 0.0067, 0.0058, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 6, label: '+1 Finish 20', approach: 'N', epacCodes: [4065, 4464, 4464, 4465, 4466], offsets: [0.0097, 0.007, 0.006, 0.0055, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '17 +1' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4075], offsets: [0.0068], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4075, 4474], offsets: [0.0081, 0.0054], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [4075, 4474, 4475], offsets: [0.0086, 0.0058, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [4075, 4474, 4475, 4476], offsets: [0.0088, 0.0061, 0.0055, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '17' },
        { passNum: 5, label: '+1 Finish 35', approach: 'N', epacCodes: [4075, 4474, 4474, 4475], offsets: [0.0096, 0.0068, 0.0058, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 6, label: '+1 Finish 20', approach: 'N', epacCodes: [4075, 4474, 4474, 4475, 4476], offsets: [0.0098, 0.0071, 0.0061, 0.0055, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '17 +1' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4085], offsets: [0.0069], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4085, 4484], offsets: [0.0082, 0.0054], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [4085, 4484, 4485], offsets: [0.0087, 0.0059, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [4085, 4484, 4485, 4486], offsets: [0.0089, 0.0061, 0.0055, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '17' },
        { passNum: 5, label: '+1 Finish 35', approach: 'N', epacCodes: [4085, 4484, 4484, 4485], offsets: [0.0097, 0.0069, 0.0059, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 6, label: '+1 Finish 20', approach: 'N', epacCodes: [4085, 4484, 4484, 4485, 4486], offsets: [0.0099, 0.0071, 0.0061, 0.0055, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '17 +1' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4095], offsets: [0.007], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4095, 4494], offsets: [0.0083, 0.0054], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [4095, 4494, 4495], offsets: [0.0087, 0.0059, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [4095, 4494, 4495, 4496], offsets: [0.0089, 0.0061, 0.0055, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '17' },
        { passNum: 5, label: '+1 Finish 35', approach: 'N', epacCodes: [4095, 4494, 4494, 4495], offsets: [0.0098, 0.0069, 0.0059, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 6, label: '+1 Finish 20', approach: 'N', epacCodes: [4095, 4494, 4494, 4495, 4496], offsets: [0.01, 0.0071, 0.0061, 0.0055, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '17 +1' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4105], offsets: [0.0072], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4105, 4504], offsets: [0.0085, 0.0054], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [4105, 4504, 4505], offsets: [0.0089, 0.0059, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [4105, 4504, 4505, 4506], offsets: [0.0092, 0.0061, 0.0055, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '17' },
        { passNum: 5, label: '+1 Finish 35', approach: 'N', epacCodes: [4105, 4504, 4504, 4505], offsets: [0.0101, 0.007, 0.0059, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 6, label: '+1 Finish 20', approach: 'N', epacCodes: [4105, 4504, 4504, 4505, 4506], offsets: [0.0103, 0.0072, 0.0061, 0.0055, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '17 +1' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4115], offsets: [0.0075], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4115, 4514], offsets: [0.0087, 0.0054], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [4115, 4514, 4515], offsets: [0.0091, 0.0059, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [4115, 4514, 4515, 4516], offsets: [0.0094, 0.0061, 0.0055, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '17' },
        { passNum: 5, label: '+1 Finish 35', approach: 'N', epacCodes: [4115, 4514, 4514, 4515], offsets: [0.0104, 0.0071, 0.0059, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 6, label: '+1 Finish 20', approach: 'N', epacCodes: [4115, 4514, 4514, 4515, 4516], offsets: [0.0106, 0.0073, 0.0061, 0.0055, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '17 +1' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4125], offsets: [0.0078], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4125, 4524], offsets: [0.0089, 0.0054], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [4125, 4524, 4525], offsets: [0.0093, 0.0059, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [4125, 4524, 4525, 4526], offsets: [0.0096, 0.0061, 0.0056, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '17' },
        { passNum: 5, label: '+1 Finish 35', approach: 'N', epacCodes: [4125, 4524, 4524, 4525], offsets: [0.0106, 0.0072, 0.0059, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 6, label: '+1 Finish 20', approach: 'N', epacCodes: [4125, 4524, 4524, 4525, 4526], offsets: [0.0109, 0.0074, 0.0061, 0.0056, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '17 +1' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4135], offsets: [0.0074], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [4135, 4534], offsets: [0.0081, 0.0054], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [4135, 4534, 4535], offsets: [0.0085, 0.0058, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [4135, 4534, 4535, 4536], offsets: [0.0088, 0.0061, 0.0057, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '17' },
        { passNum: 5, label: '+1 Finish 35', approach: 'N', epacCodes: [4135, 4534, 4534, 4535], offsets: [0.0096, 0.0069, 0.0058, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 6, label: '+1 Finish 20', approach: 'N', epacCodes: [4135, 4534, 4534, 4535, 4536], offsets: [0.0099, 0.0072, 0.0061, 0.0057, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '17 +1' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4145], offsets: [0.0074], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [4145, 4544], offsets: [0.0081, 0.0054], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [4145, 4544, 4545], offsets: [0.0086, 0.0058, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [4145, 4544, 4545, 4546], offsets: [0.0088, 0.0061, 0.0057, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: '+1 Finish 50', approach: 'N', epacCodes: [4145, 4544, 4544, 4545], offsets: [0.0097, 0.007, 0.0058, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 6, label: '+1 Finish 20', approach: 'N', epacCodes: [4145, 4544, 4544, 4545, 4546], offsets: [0.01, 0.0073, 0.0061, 0.0057, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4155], offsets: [0.0075], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [4155, 4554], offsets: [0.0082, 0.0054], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [4155, 4554, 4555], offsets: [0.0086, 0.0058, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [4155, 4554, 4555, 4556], offsets: [0.0089, 0.0061, 0.0057, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: '+1 Finish 50', approach: 'N', epacCodes: [4155, 4554, 4554, 4555], offsets: [0.0098, 0.007, 0.0058, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 6, label: '+1 Finish 20', approach: 'N', epacCodes: [4155, 4554, 4554, 4555, 4556], offsets: [0.0101, 0.0073, 0.0061, 0.0057, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4165], offsets: [0.0075], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [4165, 4564], offsets: [0.0082, 0.0054], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [4165, 4564, 4565], offsets: [0.0087, 0.0058, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [4165, 4564, 4565, 4566], offsets: [0.0089, 0.0061, 0.0056, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: '+1 Finish 50', approach: 'N', epacCodes: [4165, 4564, 4564, 4565], offsets: [0.0099, 0.0071, 0.0058, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 6, label: '+1 Finish 20', approach: 'N', epacCodes: [4165, 4564, 4564, 4565, 4566], offsets: [0.0101, 0.0073, 0.0061, 0.0056, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 16,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4175], offsets: [0.0075], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [4175, 4574], offsets: [0.0083, 0.0054], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [4175, 4574, 4575], offsets: [0.0087, 0.0058, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [4175, 4574, 4575, 4576], offsets: [0.0089, 0.0061, 0.0056, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: '+1 Finish 50', approach: 'N', epacCodes: [4175, 4574, 4574, 4575], offsets: [0.01, 0.0071, 0.0058, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 6, label: '+1 Finish 20', approach: 'N', epacCodes: [4175, 4574, 4574, 4575, 4576], offsets: [0.0102, 0.0073, 0.0061, 0.0056, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 17,
      thicknessInch: 4.5,
      thicknessMm: 114.3,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4185], offsets: [0.0075], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [4185, 4584], offsets: [0.0084, 0.0055], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [4185, 4584, 4585], offsets: [0.0088, 0.0059, 0.0055], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [4185, 4584, 4585, 4586], offsets: [0.009, 0.0061, 0.0057, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: '+1 Finish 50', approach: 'N', epacCodes: [4185, 4584, 4584, 4585], offsets: [0.0101, 0.0072, 0.0059, 0.0055], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 6, label: '+1 Finish 20', approach: 'N', epacCodes: [4185, 4584, 4584, 4585, 4586], offsets: [0.0104, 0.0075, 0.0061, 0.0057, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 18,
      thicknessInch: 5,
      thicknessMm: 127,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4195], offsets: [0.0076], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [4195, 4594], offsets: [0.0084, 0.0055], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [4195, 4594, 4595], offsets: [0.0088, 0.0059, 0.0055], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [4195, 4594, 4595, 4596], offsets: [0.0091, 0.0062, 0.0058, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: '+1 Finish 50', approach: 'N', epacCodes: [4195, 4594, 4594, 4595], offsets: [0.0103, 0.0073, 0.0059, 0.0055], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 6, label: '+1 Finish 20', approach: 'N', epacCodes: [4195, 4594, 4594, 4595, 4596], offsets: [0.0105, 0.0076, 0.0062, 0.0058, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 19,
      thicknessInch: 5.5,
      thicknessMm: 139.7,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4205], offsets: [0.0076], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [4205, 4604], offsets: [0.0085, 0.0055], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [4205, 4604, 4605], offsets: [0.0089, 0.006, 0.0056], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [4205, 4604, 4605, 4606], offsets: [0.0092, 0.0062, 0.0058, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: '+1 Finish 50', approach: 'N', epacCodes: [4205, 4604, 4604, 4605], offsets: [0.0104, 0.0074, 0.006, 0.0056], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 6, label: '+1 Finish 20', approach: 'N', epacCodes: [4205, 4604, 4604, 4605, 4606], offsets: [0.0107, 0.0077, 0.0062, 0.0058, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 20,
      thicknessInch: 6,
      thicknessMm: 152.4,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4215], offsets: [0.0077], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [4215, 4614], offsets: [0.0086, 0.0055], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [4215, 4614, 4615], offsets: [0.009, 0.006, 0.0056], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [4215, 4614, 4615, 4616], offsets: [0.0092, 0.0062, 0.0058, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: '+1 Finish 50', approach: 'N', epacCodes: [4215, 4614, 4614, 4615], offsets: [0.0106, 0.0075, 0.006, 0.0056], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 6, label: '+1 Finish 20', approach: 'N', epacCodes: [4215, 4614, 4614, 4615, 4616], offsets: [0.0108, 0.0077, 0.0062, 0.0058, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 21,
      thicknessInch: 6.5,
      thicknessMm: 165.1,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4225], offsets: [0.0077], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [4225, 4624], offsets: [0.0086, 0.0055], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [4225, 4624, 4625], offsets: [0.0091, 0.006, 0.0056], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
      ],
    },
    {
      recordNum: 22,
      thicknessInch: 7,
      thicknessMm: 177.8,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4235], offsets: [0.0078], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [4235, 4634], offsets: [0.0084, 0.0054], registers: [1, 2], feed: [0, 0], ra: '80' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [4235, 4634, 4635], offsets: [0.0089, 0.0059, 0.0056], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 23,
      thicknessInch: 7.5,
      thicknessMm: 190.5,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4245], offsets: [0.0079], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [4245, 4644], offsets: [0.0084, 0.0054], registers: [1, 2], feed: [0, 0], ra: '80' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [4245, 4644, 4645], offsets: [0.009, 0.006, 0.0056], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 24,
      thicknessInch: 8,
      thicknessMm: 203.2,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4255], offsets: [0.0079], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [4255, 4654], offsets: [0.0084, 0.0054], registers: [1, 2], feed: [0, 0], ra: '80' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [4255, 4654, 4655], offsets: [0.009, 0.006, 0.0056], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 25,
      thicknessInch: 9,
      thicknessMm: 228.6,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4265], offsets: [0.008], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [4265, 4664], offsets: [0.0085, 0.0054], registers: [1, 2], feed: [0, 0], ra: '80' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [4265, 4664, 4665], offsets: [0.0091, 0.0061, 0.0056], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 26,
      thicknessInch: 10,
      thicknessMm: 254,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4275], offsets: [0.0081], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [4275, 4674], offsets: [0.0085, 0.0055], registers: [1, 2], feed: [0, 0], ra: '80' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [4275, 4674, 4675], offsets: [0.0092, 0.0061, 0.0056], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 27,
      thicknessInch: 11,
      thicknessMm: 279.4,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4285], offsets: [0.0078], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [4285, 4684], offsets: [0.0084, 0.0053], registers: [1, 2], feed: [0, 0], ra: '80' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [4285, 4684, 4685], offsets: [0.0091, 0.006, 0.0057], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 28,
      thicknessInch: 12,
      thicknessMm: 304.8,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4295], offsets: [0.0075], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [4295, 4694], offsets: [0.0083, 0.0052], registers: [1, 2], feed: [0, 0], ra: '80' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [4295, 4694, 4695], offsets: [0.0091, 0.006, 0.0057], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
  ],
};

/** Block 24: 0.01" Cu - Both Away */
const MAKINO_SP_BLOCK_24: MakinoSPBlock = {
  headerNum: 24,
  type: 'BS',
  wireDiameter: '0.01',
  material: 'Cu',
  method: 'Both Away',
  recordCount: 10,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7026], offsets: [0.0067], registers: [1], feed: [0], ra: '96' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7026, 7424], offsets: [0.0075, 0.0053], registers: [1, 2], feed: [0, 0], ra: '51' },
        { passNum: 3, label: 'Finish 15', approach: 'N', epacCodes: [7026, 7424, 7425], offsets: [0.0077, 0.0055, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '15' },
        { passNum: 4, label: '+1 Finish 15', approach: 'N', epacCodes: [7026, 7424, 7424, 7425], offsets: [0.0085, 0.0063, 0.0055, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7036], offsets: [0.007], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7036, 7434], offsets: [0.0077, 0.0053], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7036, 7434, 7435], offsets: [0.0079, 0.0055, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7036, 7434, 7434, 7435], offsets: [0.0087, 0.0063, 0.0055, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7046], offsets: [0.0071], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7046, 7444], offsets: [0.0077, 0.0053], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7046, 7444, 7445], offsets: [0.008, 0.0055, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7046, 7444, 7444, 7445], offsets: [0.0087, 0.0063, 0.0055, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7056], offsets: [0.0073], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7056, 7454], offsets: [0.0079, 0.0053], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7056, 7454, 7455], offsets: [0.0082, 0.0056, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7056, 7454, 7454, 7455], offsets: [0.009, 0.0063, 0.0056, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7066], offsets: [0.0074], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7066, 7464], offsets: [0.0082, 0.0054], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7066, 7464, 7465], offsets: [0.0084, 0.0056, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7066, 7464, 7464, 7465], offsets: [0.0092, 0.0064, 0.0056, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7076], offsets: [0.0076], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7076, 7474], offsets: [0.0083, 0.0055], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7076, 7474, 7475], offsets: [0.0085, 0.0057, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7076, 7474, 7474, 7475], offsets: [0.0093, 0.0064, 0.0057, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7086], offsets: [0.0077], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7086, 7484], offsets: [0.0084, 0.0055], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7086, 7484, 7485], offsets: [0.0086, 0.0057, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7086, 7484, 7484, 7485], offsets: [0.0094, 0.0065, 0.0057, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7096], offsets: [0.0077], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7096, 7494], offsets: [0.0085, 0.0056], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7096, 7494, 7495], offsets: [0.0087, 0.0057, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7096, 7494, 7494, 7495], offsets: [0.0095, 0.0065, 0.0057, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7106], offsets: [0.0079], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7106, 7504], offsets: [0.0086, 0.0056], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7106, 7504, 7505], offsets: [0.0088, 0.0057, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7106, 7504, 7504, 7505], offsets: [0.0096, 0.0065, 0.0057, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7116], offsets: [0.0079], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7116, 7514], offsets: [0.0087, 0.0056], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7116, 7514, 7515], offsets: [0.0089, 0.0057, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7116, 7514, 7514, 7515], offsets: [0.0096, 0.0065, 0.0057, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
  ],
};

/** Block 25: 0.01" Cu - Both Away-L */
const MAKINO_SP_BLOCK_25: MakinoSPBlock = {
  headerNum: 25,
  type: 'BS',
  wireDiameter: '0.01',
  material: 'Cu',
  method: 'Both Away-L',
  recordCount: 10,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7027], offsets: [0.0066], registers: [1], feed: [0], ra: '96' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7027, 7426], offsets: [0.0075, 0.0053], registers: [1, 2], feed: [0, 0], ra: '51' },
        { passNum: 3, label: 'Finish 15', approach: 'N', epacCodes: [7027, 7426, 7427], offsets: [0.0077, 0.0055, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '15' },
        { passNum: 4, label: '+1 Finish 15', approach: 'N', epacCodes: [7027, 7426, 7426, 7427], offsets: [0.0085, 0.0063, 0.0055, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7037], offsets: [0.007], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7037, 7436], offsets: [0.0077, 0.0053], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7037, 7436, 7437], offsets: [0.0079, 0.0055, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7037, 7436, 7436, 7437], offsets: [0.0087, 0.0063, 0.0055, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7047], offsets: [0.0072], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7047, 7446], offsets: [0.0078, 0.0053], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7047, 7446, 7447], offsets: [0.0081, 0.0056, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7047, 7446, 7446, 7447], offsets: [0.0089, 0.0064, 0.0056, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7057], offsets: [0.0073], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7057, 7456], offsets: [0.0079, 0.0053], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7057, 7456, 7457], offsets: [0.0082, 0.0056, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7057, 7456, 7456, 7457], offsets: [0.009, 0.0063, 0.0056, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7067], offsets: [0.0074], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7067, 7466], offsets: [0.0082, 0.0054], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7067, 7466, 7467], offsets: [0.0084, 0.0056, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7067, 7466, 7466, 7467], offsets: [0.0092, 0.0064, 0.0056, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7077], offsets: [0.0075], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7077, 7476], offsets: [0.0083, 0.0055], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7077, 7476, 7477], offsets: [0.0085, 0.0057, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7077, 7476, 7476, 7477], offsets: [0.0093, 0.0065, 0.0057, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7087], offsets: [0.0076], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7087, 7486], offsets: [0.0084, 0.0055], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7087, 7486, 7487], offsets: [0.0087, 0.0057, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7087, 7486, 7486, 7487], offsets: [0.0094, 0.0065, 0.0057, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7097], offsets: [0.0077], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7097, 7496], offsets: [0.0085, 0.0055], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7097, 7496, 7497], offsets: [0.0088, 0.0057, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7097, 7496, 7496, 7497], offsets: [0.0095, 0.0065, 0.0057, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7107], offsets: [0.0078], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7107, 7506], offsets: [0.0086, 0.0055], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7107, 7506, 7507], offsets: [0.0089, 0.0057, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7107, 7506, 7506, 7507], offsets: [0.0096, 0.0065, 0.0057, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7117], offsets: [0.0079], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7117, 7516], offsets: [0.0087, 0.0056], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7117, 7516, 7517], offsets: [0.0089, 0.0057, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7117, 7516, 7516, 7517], offsets: [0.0097, 0.0065, 0.0057, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
  ],
};

/** Block 26: 0.01" Cu - Fast Finish */
const MAKINO_SP_BLOCK_26: MakinoSPBlock = {
  headerNum: 26,
  type: 'BS',
  wireDiameter: '0.01',
  material: 'Cu',
  method: 'Fast Finish',
  recordCount: 15,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7033], offsets: [0.007], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7043], offsets: [0.0072], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7053], offsets: [0.0073], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7063], offsets: [0.0074], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7073], offsets: [0.0076], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7083], offsets: [0.0077], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7093], offsets: [0.0077], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7103], offsets: [0.0077], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7113], offsets: [0.0077], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7123], offsets: [0.0079], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7133], offsets: [0.008], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7143], offsets: [0.0081], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7153], offsets: [0.0081], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7163], offsets: [0.0081], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7173], offsets: [0.0082], registers: [1], feed: [0], ra: '120' },
      ],
    },
  ],
};

/** Block 27: 0.01" Cu - High Precision */
const MAKINO_SP_BLOCK_27: MakinoSPBlock = {
  headerNum: 27,
  type: 'BS',
  wireDiameter: '0.01',
  material: 'Cu',
  method: 'High Precision',
  recordCount: 24,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7025], offsets: [0.0066], registers: [1], feed: [0], ra: '96' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7025, 7422], offsets: [0.0075, 0.0053], registers: [1, 2], feed: [0, 0], ra: '51' },
        { passNum: 3, label: 'Finish 15', approach: 'N', epacCodes: [7025, 7422, 7423], offsets: [0.0076, 0.0055, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '15' },
        { passNum: 4, label: '+1 Finish 15', approach: 'N', epacCodes: [7025, 7422, 7422, 7423], offsets: [0.0084, 0.0063, 0.0055, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7035], offsets: [0.0069], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7035, 7432], offsets: [0.0075, 0.0053], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7035, 7432, 7433], offsets: [0.0078, 0.0055, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7035, 7432, 7432, 7433], offsets: [0.0086, 0.0063, 0.0055, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7045], offsets: [0.007], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7045, 7442], offsets: [0.0076, 0.0053], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7045, 7442, 7443], offsets: [0.0078, 0.0056, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7045, 7442, 7442, 7443], offsets: [0.0086, 0.0063, 0.0056, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7055], offsets: [0.007], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7055, 7452], offsets: [0.0077, 0.0053], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7055, 7452, 7453], offsets: [0.0079, 0.0056, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7055, 7452, 7452, 7453], offsets: [0.0087, 0.0063, 0.0056, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7065], offsets: [0.0072], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7065, 7462], offsets: [0.0079, 0.0054], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7065, 7462, 7463], offsets: [0.0081, 0.0056, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7065, 7462, 7462, 7463], offsets: [0.0089, 0.0064, 0.0056, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7075], offsets: [0.0073], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7075, 7472], offsets: [0.008, 0.0055], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7075, 7472, 7473], offsets: [0.0082, 0.0057, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7075, 7472, 7472, 7473], offsets: [0.009, 0.0064, 0.0057, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7085], offsets: [0.0073], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7085, 7482], offsets: [0.0081, 0.0055], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7085, 7482, 7483], offsets: [0.0083, 0.0057, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7085, 7482, 7482, 7483], offsets: [0.0091, 0.0065, 0.0057, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7095], offsets: [0.0074], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7095, 7492], offsets: [0.0082, 0.0055], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7095, 7492, 7493], offsets: [0.0084, 0.0057, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7095, 7492, 7492, 7493], offsets: [0.0092, 0.0065, 0.0057, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7105], offsets: [0.0074], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7105, 7502], offsets: [0.0083, 0.0055], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7105, 7502, 7503], offsets: [0.0085, 0.0058, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [7105, 7502, 7502, 7503], offsets: [0.0093, 0.0066, 0.0058, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7115], offsets: [0.0075], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7115, 7512], offsets: [0.0084, 0.0056], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7115, 7512, 7513], offsets: [0.0087, 0.0058, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7125], offsets: [0.0076], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7125, 7522], offsets: [0.0086, 0.0056], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7125, 7522, 7523], offsets: [0.0089, 0.0059, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7135], offsets: [0.0073], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7135, 7532], offsets: [0.0085, 0.0056], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7135, 7532, 7533], offsets: [0.0088, 0.0059, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7145], offsets: [0.0075], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7145, 7542], offsets: [0.0087, 0.0056], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7145, 7542, 7543], offsets: [0.0091, 0.006, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7155], offsets: [0.0077], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7155, 7552], offsets: [0.009, 0.0056], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7155, 7552, 7553], offsets: [0.0095, 0.0061, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7165], offsets: [0.0078], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [7165, 7562], offsets: [0.01, 0.0062], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [7165, 7562, 7563], offsets: [0.0105, 0.0066, 0.0055], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
      ],
    },
    {
      recordNum: 16,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7175], offsets: [0.008], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [7175, 7572], offsets: [0.0101, 0.0062], registers: [1, 2], feed: [0, 0], ra: '80' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [7175, 7572, 7573], offsets: [0.0106, 0.0067, 0.0055], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
      ],
    },
    {
      recordNum: 17,
      thicknessInch: 4.5,
      thicknessMm: 114.3,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7185], offsets: [0.008], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [7185, 7582], offsets: [0.0101, 0.0062], registers: [1, 2], feed: [0, 0], ra: '80' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [7185, 7582, 7583], offsets: [0.0106, 0.0067, 0.0055], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
      ],
    },
    {
      recordNum: 18,
      thicknessInch: 5,
      thicknessMm: 127,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7195], offsets: [0.008], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [7195, 7592], offsets: [0.0101, 0.0062], registers: [1, 2], feed: [0, 0], ra: '80' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [7195, 7592, 7593], offsets: [0.0106, 0.0067, 0.0055], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
      ],
    },
    {
      recordNum: 19,
      thicknessInch: 5.5,
      thicknessMm: 139.7,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7205], offsets: [0.008], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [7205, 7602], offsets: [0.0101, 0.0062], registers: [1, 2], feed: [0, 0], ra: '80' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [7205, 7602, 7603], offsets: [0.0107, 0.0067, 0.0055], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
      ],
    },
    {
      recordNum: 20,
      thicknessInch: 6,
      thicknessMm: 152.4,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7215], offsets: [0.008], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [7215, 7612], offsets: [0.0101, 0.0062], registers: [1, 2], feed: [0, 0], ra: '80' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [7215, 7612, 7613], offsets: [0.0106, 0.0067, 0.0056], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
      ],
    },
    {
      recordNum: 21,
      thicknessInch: 6.5,
      thicknessMm: 165.1,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7225], offsets: [0.008], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [7225, 7622], offsets: [0.0099, 0.0061], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 22,
      thicknessInch: 7,
      thicknessMm: 177.8,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7235], offsets: [0.008], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [7235, 7632], offsets: [0.0098, 0.006], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 23,
      thicknessInch: 7.5,
      thicknessMm: 190.5,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7245], offsets: [0.008], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [7245, 7642], offsets: [0.0095, 0.0059], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 24,
      thicknessInch: 8,
      thicknessMm: 203.2,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7255], offsets: [0.008], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [7255, 7652], offsets: [0.0095, 0.0059], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
  ],
};

/** Block 28: 0.01" Gr - Fast Finish */
const MAKINO_SP_BLOCK_28: MakinoSPBlock = {
  headerNum: 28,
  type: 'BS',
  wireDiameter: '0.01',
  material: 'Gr',
  method: 'Fast Finish',
  recordCount: 19,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6033], offsets: [0.0067], registers: [1], feed: [0], ra: '46' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6043], offsets: [0.0067], registers: [1], feed: [0], ra: '46' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6053], offsets: [0.0068], registers: [1], feed: [0], ra: '46' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6063], offsets: [0.0068], registers: [1], feed: [0], ra: '46' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6073], offsets: [0.0069], registers: [1], feed: [0], ra: '46' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6083], offsets: [0.007], registers: [1], feed: [0], ra: '46' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6093], offsets: [0.0071], registers: [1], feed: [0], ra: '46' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6103], offsets: [0.0072], registers: [1], feed: [0], ra: '46' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6113], offsets: [0.0073], registers: [1], feed: [0], ra: '46' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6123], offsets: [0.0073], registers: [1], feed: [0], ra: '46' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6133], offsets: [0.0073], registers: [1], feed: [0], ra: '46' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6143], offsets: [0.0074], registers: [1], feed: [0], ra: '46' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6153], offsets: [0.0074], registers: [1], feed: [0], ra: '46' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6163], offsets: [0.0074], registers: [1], feed: [0], ra: '46' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6173], offsets: [0.0074], registers: [1], feed: [0], ra: '46' },
      ],
    },
    {
      recordNum: 16,
      thicknessInch: 4.5,
      thicknessMm: 114.3,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6183], offsets: [0.0075], registers: [1], feed: [0], ra: '46' },
      ],
    },
    {
      recordNum: 17,
      thicknessInch: 5,
      thicknessMm: 127,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6193], offsets: [0.0076], registers: [1], feed: [0], ra: '46' },
      ],
    },
    {
      recordNum: 18,
      thicknessInch: 5.5,
      thicknessMm: 139.7,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6203], offsets: [0.0076], registers: [1], feed: [0], ra: '46' },
      ],
    },
    {
      recordNum: 19,
      thicknessInch: 6,
      thicknessMm: 152.4,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6213], offsets: [0.0077], registers: [1], feed: [0], ra: '46' },
      ],
    },
  ],
};

/** Block 29: 0.01" Gr - High Precision */
const MAKINO_SP_BLOCK_29: MakinoSPBlock = {
  headerNum: 29,
  type: 'BS',
  wireDiameter: '0.01',
  material: 'Gr',
  method: 'High Precision',
  recordCount: 19,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6034], offsets: [0.0066], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6044], offsets: [0.0066], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6054], offsets: [0.0067], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6064], offsets: [0.0069], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6074], offsets: [0.007], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6084], offsets: [0.007], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6094], offsets: [0.0071], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6104], offsets: [0.0072], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6114], offsets: [0.0073], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6124], offsets: [0.0073], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6134], offsets: [0.0073], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6144], offsets: [0.0074], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6154], offsets: [0.0074], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6164], offsets: [0.0074], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6174], offsets: [0.0074], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 16,
      thicknessInch: 4.5,
      thicknessMm: 114.3,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6184], offsets: [0.0075], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 17,
      thicknessInch: 5,
      thicknessMm: 127,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6194], offsets: [0.0075], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 18,
      thicknessInch: 5.5,
      thicknessMm: 139.7,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6204], offsets: [0.0075], registers: [1], feed: [0], ra: '36' },
      ],
    },
    {
      recordNum: 19,
      thicknessInch: 6,
      thicknessMm: 152.4,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [6214], offsets: [0.0075], registers: [1], feed: [0], ra: '36' },
      ],
    },
  ],
};

/** Block 30: 0.01" St - Both Away */
const MAKINO_SP_BLOCK_30: MakinoSPBlock = {
  headerNum: 30,
  type: 'BS',
  wireDiameter: '0.01',
  material: 'St',
  method: 'Both Away',
  recordCount: 20,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1026], offsets: [0.0064], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1026, 2421], offsets: [0.0073, 0.0052], registers: [1, 2], feed: [0, 0], ra: '51' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1026, 2421, 2422], offsets: [0.0076, 0.0055, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1026, 2421, 2422, 2423], offsets: [0.0077, 0.0056, 0.0054, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1026, 2421, 2422, 2423, 2424], offsets: [0.0078, 0.0057, 0.0054, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1026, 2421, 2421, 2422], offsets: [0.0082, 0.0062, 0.0055, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [1026, 2421, 2421, 2422, 2423], offsets: [0.0083, 0.0062, 0.0056, 0.0054, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1026, 2421, 2421, 2422, 2423, 2424], offsets: [0.0084, 0.0063, 0.0057, 0.0054, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1036], offsets: [0.0064], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1036, 2431], offsets: [0.0073, 0.0052], registers: [1, 2], feed: [0, 0], ra: '51' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1036, 2431, 2432], offsets: [0.0076, 0.0055, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1036, 2431, 2432, 2433], offsets: [0.0077, 0.0056, 0.0053, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1036, 2431, 2432, 2433, 2434], offsets: [0.0077, 0.0056, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1036, 2431, 2431, 2432], offsets: [0.0084, 0.0063, 0.0055, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [1036, 2431, 2431, 2432, 2433], offsets: [0.0084, 0.0063, 0.0056, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1036, 2431, 2431, 2432, 2433, 2434], offsets: [0.0085, 0.0064, 0.0056, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1046], offsets: [0.0065], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1046, 2441], offsets: [0.0074, 0.0052], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1046, 2441, 2442], offsets: [0.0077, 0.0055, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1046, 2441, 2442, 2443], offsets: [0.0078, 0.0056, 0.0053, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1046, 2441, 2442, 2443, 2444], offsets: [0.0078, 0.0057, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1046, 2441, 2441, 2442], offsets: [0.0085, 0.0063, 0.0055, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [1046, 2441, 2441, 2442, 2443], offsets: [0.0086, 0.0064, 0.0056, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1046, 2441, 2441, 2442, 2443, 2444], offsets: [0.0087, 0.0065, 0.0057, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1056], offsets: [0.0066], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1056, 2451], offsets: [0.0076, 0.0052], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1056, 2451, 2452], offsets: [0.0078, 0.0055, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1056, 2451, 2452, 2453], offsets: [0.0079, 0.0056, 0.0053, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1056, 2451, 2452, 2453, 2454], offsets: [0.008, 0.0056, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1056, 2451, 2451, 2452], offsets: [0.0088, 0.0064, 0.0055, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [1056, 2451, 2451, 2452, 2453], offsets: [0.0088, 0.0065, 0.0056, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1056, 2451, 2451, 2452, 2453, 2454], offsets: [0.0089, 0.0065, 0.0056, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1066], offsets: [0.0068], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1066, 2461], offsets: [0.0078, 0.0052], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1066, 2461, 2462], offsets: [0.0081, 0.0055, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1066, 2461, 2462, 2463], offsets: [0.0081, 0.0056, 0.0053, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1066, 2461, 2462, 2463, 2464], offsets: [0.0082, 0.0057, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1066, 2461, 2461, 2462], offsets: [0.009, 0.0065, 0.0055, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [1066, 2461, 2461, 2462, 2463], offsets: [0.0091, 0.0065, 0.0056, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1066, 2461, 2461, 2462, 2463, 2464], offsets: [0.0092, 0.0066, 0.0057, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1076], offsets: [0.0068], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1076, 2471], offsets: [0.0079, 0.0053], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1076, 2471, 2472], offsets: [0.0082, 0.0055, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1076, 2471, 2472, 2473], offsets: [0.0082, 0.0056, 0.0053, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1076, 2471, 2472, 2473, 2474], offsets: [0.0083, 0.0057, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1076, 2471, 2471, 2472], offsets: [0.0091, 0.0065, 0.0055, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1076, 2471, 2471, 2472, 2473], offsets: [0.0092, 0.0066, 0.0056, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1076, 2471, 2471, 2472, 2473, 2474], offsets: [0.0093, 0.0066, 0.0057, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1086], offsets: [0.0069], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1086, 2481], offsets: [0.0081, 0.0053], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1086, 2481, 2482], offsets: [0.0083, 0.0055, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1086, 2481, 2482, 2483], offsets: [0.0084, 0.0056, 0.0053, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1086, 2481, 2482, 2483, 2484], offsets: [0.0084, 0.0057, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1086, 2481, 2481, 2482], offsets: [0.0093, 0.0065, 0.0055, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1086, 2481, 2481, 2482, 2483], offsets: [0.0094, 0.0066, 0.0056, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1086, 2481, 2481, 2482, 2483, 2484], offsets: [0.0094, 0.0067, 0.0057, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1096], offsets: [0.007], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1096, 2491], offsets: [0.0082, 0.0053], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1096, 2491, 2492], offsets: [0.0084, 0.0055, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1096, 2491, 2492, 2493], offsets: [0.0085, 0.0056, 0.0053, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1096, 2491, 2492, 2493, 2494], offsets: [0.0086, 0.0057, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1096, 2491, 2491, 2492], offsets: [0.0095, 0.0066, 0.0055, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1096, 2491, 2491, 2492, 2493], offsets: [0.0095, 0.0067, 0.0056, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1096, 2491, 2491, 2492, 2493, 2494], offsets: [0.0096, 0.0067, 0.0057, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1106], offsets: [0.0071], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1106, 2501], offsets: [0.0083, 0.0053], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1106, 2501, 2502], offsets: [0.0086, 0.0056, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1106, 2501, 2502, 2503], offsets: [0.0086, 0.0056, 0.0053, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1106, 2501, 2502, 2503, 2504], offsets: [0.0087, 0.0057, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1106, 2501, 2501, 2502], offsets: [0.0096, 0.0066, 0.0056, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1106, 2501, 2501, 2502, 2503], offsets: [0.0097, 0.0067, 0.0056, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1106, 2501, 2501, 2502, 2503, 2504], offsets: [0.0098, 0.0068, 0.0057, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1116], offsets: [0.0072], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1116, 2511], offsets: [0.0084, 0.0053], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1116, 2511, 2512], offsets: [0.0087, 0.0056, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1116, 2511, 2512, 2513], offsets: [0.0088, 0.0057, 0.0054, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1116, 2511, 2512, 2513, 2514], offsets: [0.0089, 0.0058, 0.0054, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1116, 2511, 2511, 2512], offsets: [0.0098, 0.0067, 0.0056, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1116, 2511, 2511, 2512, 2513], offsets: [0.0098, 0.0068, 0.0057, 0.0054, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1116, 2511, 2511, 2512, 2513, 2514], offsets: [0.0099, 0.0068, 0.0058, 0.0054, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1126], offsets: [0.0073], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1126, 2521], offsets: [0.0085, 0.0053], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1126, 2521, 2522], offsets: [0.0089, 0.0057, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1126, 2521, 2522, 2523], offsets: [0.0089, 0.0057, 0.0054, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1126, 2521, 2522, 2523, 2524], offsets: [0.009, 0.0058, 0.0055, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1126, 2521, 2521, 2522], offsets: [0.0099, 0.0067, 0.0057, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1126, 2521, 2521, 2522, 2523], offsets: [0.01, 0.0068, 0.0057, 0.0054, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1126, 2521, 2521, 2522, 2523, 2524], offsets: [0.0101, 0.0069, 0.0058, 0.0055, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1136], offsets: [0.0073], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1136, 2531], offsets: [0.0085, 0.0055], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1136, 2531, 2532], offsets: [0.0089, 0.0059, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1136, 2531, 2532, 2533], offsets: [0.009, 0.006, 0.0056, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1136, 2531, 2532, 2533, 2534], offsets: [0.0092, 0.0062, 0.0057, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1136, 2531, 2531, 2532], offsets: [0.01, 0.007, 0.0059, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1136, 2531, 2531, 2532, 2533], offsets: [0.0102, 0.0072, 0.006, 0.0056, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1136, 2531, 2531, 2532, 2533, 2534], offsets: [0.0103, 0.0073, 0.0062, 0.0057, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1146], offsets: [0.0073], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1146, 2541], offsets: [0.0085, 0.0055], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1146, 2541, 2542], offsets: [0.0089, 0.0059, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1146, 2541, 2542, 2543], offsets: [0.0091, 0.006, 0.0056, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1146, 2541, 2542, 2543, 2544], offsets: [0.0092, 0.0061, 0.0057, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1146, 2541, 2541, 2542], offsets: [0.0101, 0.007, 0.0059, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1146, 2541, 2541, 2542, 2543], offsets: [0.0102, 0.0072, 0.006, 0.0056, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1146, 2541, 2541, 2542, 2543, 2544], offsets: [0.0103, 0.0073, 0.0061, 0.0057, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1156], offsets: [0.0073], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1156, 2551], offsets: [0.0086, 0.0055], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1156, 2551, 2552], offsets: [0.0089, 0.0058, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1156, 2551, 2552, 2553], offsets: [0.0091, 0.006, 0.0056, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1156, 2551, 2552, 2553, 2554], offsets: [0.0092, 0.0061, 0.0057, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1156, 2551, 2551, 2552], offsets: [0.0101, 0.007, 0.0058, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1156, 2551, 2551, 2552, 2553], offsets: [0.0103, 0.0072, 0.006, 0.0056, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1156, 2551, 2551, 2552, 2553, 2554], offsets: [0.0104, 0.0073, 0.0061, 0.0057, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1166], offsets: [0.0073], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1166, 2561], offsets: [0.0086, 0.0055], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1166, 2561, 2562], offsets: [0.009, 0.0058, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1166, 2561, 2562, 2563], offsets: [0.0091, 0.006, 0.0056, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1166, 2561, 2562, 2563, 2564], offsets: [0.0092, 0.0061, 0.0057, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1166, 2561, 2561, 2562], offsets: [0.0102, 0.0071, 0.0058, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1166, 2561, 2561, 2562, 2563], offsets: [0.0104, 0.0073, 0.006, 0.0056, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1166, 2561, 2561, 2562, 2563, 2564], offsets: [0.0105, 0.0073, 0.0061, 0.0057, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 16,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1176], offsets: [0.0074], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1176, 2571], offsets: [0.0086, 0.0055], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1176, 2571, 2572], offsets: [0.009, 0.0058, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1176, 2571, 2572, 2573], offsets: [0.0092, 0.006, 0.0056, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1176, 2571, 2572, 2573, 2574], offsets: [0.0093, 0.0061, 0.0057, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1176, 2571, 2571, 2572], offsets: [0.0103, 0.0071, 0.0058, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1176, 2571, 2571, 2572, 2573], offsets: [0.0105, 0.0073, 0.006, 0.0056, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1176, 2571, 2571, 2572, 2573, 2574], offsets: [0.0105, 0.0074, 0.0061, 0.0057, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 17,
      thicknessInch: 4.5,
      thicknessMm: 114.3,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1186], offsets: [0.0074], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1186, 2581], offsets: [0.0087, 0.0055], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1186, 2581, 2582], offsets: [0.0091, 0.0059, 0.0055], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1186, 2581, 2582, 2583], offsets: [0.0093, 0.0061, 0.0057, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1186, 2581, 2582, 2583, 2584], offsets: [0.0093, 0.0061, 0.0057, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1186, 2581, 2581, 2582], offsets: [0.0104, 0.0072, 0.0059, 0.0055], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1186, 2581, 2581, 2582, 2583], offsets: [0.0106, 0.0074, 0.0061, 0.0057, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1186, 2581, 2581, 2582, 2583, 2584], offsets: [0.0107, 0.0075, 0.0061, 0.0057, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 18,
      thicknessInch: 5,
      thicknessMm: 127,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1196], offsets: [0.0074], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1196, 2591], offsets: [0.0088, 0.0056], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1196, 2591, 2592], offsets: [0.0092, 0.006, 0.0056], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1196, 2591, 2592, 2593], offsets: [0.0093, 0.0061, 0.0057, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1196, 2591, 2592, 2593, 2594], offsets: [0.0094, 0.0062, 0.0058, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1196, 2591, 2591, 2592], offsets: [0.0106, 0.0074, 0.006, 0.0056], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1196, 2591, 2591, 2592, 2593], offsets: [0.0107, 0.0075, 0.0061, 0.0057, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1196, 2591, 2591, 2592, 2593, 2594], offsets: [0.0108, 0.0076, 0.0062, 0.0058, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 19,
      thicknessInch: 5.5,
      thicknessMm: 139.7,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1206], offsets: [0.0075], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1206, 2601], offsets: [0.0089, 0.0056], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1206, 2601, 2602], offsets: [0.0093, 0.006, 0.0056], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1206, 2601, 2602, 2603], offsets: [0.0094, 0.0061, 0.0057, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1206, 2601, 2602, 2603, 2604], offsets: [0.0095, 0.0062, 0.0058, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1206, 2601, 2601, 2602], offsets: [0.0107, 0.0075, 0.006, 0.0056], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1206, 2601, 2601, 2602, 2603], offsets: [0.0108, 0.0076, 0.0061, 0.0057, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1206, 2601, 2601, 2602, 2603, 2604], offsets: [0.0109, 0.0077, 0.0062, 0.0058, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 20,
      thicknessInch: 6,
      thicknessMm: 152.4,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1216], offsets: [0.0075], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1216, 2611], offsets: [0.0089, 0.0056], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1216, 2611, 2612], offsets: [0.0093, 0.006, 0.0056], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1216, 2611, 2612, 2613], offsets: [0.0094, 0.0061, 0.0057, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1216, 2611, 2612, 2613, 2614], offsets: [0.0095, 0.0062, 0.0058, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
      ],
    },
  ],
};

/** Block 31: 0.01" St - Both Away-L */
const MAKINO_SP_BLOCK_31: MakinoSPBlock = {
  headerNum: 31,
  type: 'BS',
  wireDiameter: '0.01',
  material: 'St',
  method: 'Both Away-L',
  recordCount: 20,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1027], offsets: [0.0064], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1027, 2426], offsets: [0.0073, 0.0052], registers: [1, 2], feed: [0, 0], ra: '51' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1027, 2426, 2427], offsets: [0.0076, 0.0055, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1027, 2426, 2427, 2428], offsets: [0.0077, 0.0056, 0.0054, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1027, 2426, 2427, 2428, 2429], offsets: [0.0078, 0.0057, 0.0054, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1027, 2426, 2426, 2427], offsets: [0.0082, 0.0062, 0.0055, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [1027, 2426, 2426, 2427, 2428], offsets: [0.0083, 0.0062, 0.0056, 0.0054, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1027, 2426, 2426, 2427, 2428, 2429], offsets: [0.0084, 0.0063, 0.0057, 0.0054, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1037], offsets: [0.0064], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1037, 2436], offsets: [0.0073, 0.0052], registers: [1, 2], feed: [0, 0], ra: '51' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1037, 2436, 2437], offsets: [0.0076, 0.0055, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1037, 2436, 2437, 2438], offsets: [0.0077, 0.0056, 0.0053, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1037, 2436, 2437, 2438, 2439], offsets: [0.0077, 0.0056, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1037, 2436, 2436, 2437], offsets: [0.0084, 0.0063, 0.0055, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [1037, 2436, 2436, 2437, 2438], offsets: [0.0084, 0.0063, 0.0056, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1037, 2436, 2436, 2437, 2438, 2439], offsets: [0.0085, 0.0064, 0.0056, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1047], offsets: [0.0065], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1047, 2446], offsets: [0.0074, 0.0052], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1047, 2446, 2447], offsets: [0.0077, 0.0055, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1047, 2446, 2447, 2448], offsets: [0.0078, 0.0056, 0.0053, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1047, 2446, 2447, 2448, 2449], offsets: [0.0078, 0.0057, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1047, 2446, 2446, 2447], offsets: [0.0085, 0.0063, 0.0055, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [1047, 2446, 2446, 2447, 2448], offsets: [0.0086, 0.0064, 0.0056, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1047, 2446, 2446, 2447, 2448, 2449], offsets: [0.0087, 0.0065, 0.0057, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1057], offsets: [0.0066], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1057, 2456], offsets: [0.0076, 0.0052], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1057, 2456, 2457], offsets: [0.0078, 0.0055, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1057, 2456, 2457, 2458], offsets: [0.0079, 0.0056, 0.0053, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1057, 2456, 2457, 2458, 2459], offsets: [0.008, 0.0056, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1057, 2456, 2456, 2457], offsets: [0.0088, 0.0064, 0.0055, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [1057, 2456, 2456, 2457, 2458], offsets: [0.0088, 0.0065, 0.0056, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1057, 2456, 2456, 2457, 2458, 2459], offsets: [0.0089, 0.0065, 0.0056, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1067], offsets: [0.0068], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1067, 2466], offsets: [0.0078, 0.0052], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1067, 2466, 2467], offsets: [0.0081, 0.0055, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1067, 2466, 2467, 2468], offsets: [0.0081, 0.0056, 0.0053, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1067, 2466, 2467, 2468, 2469], offsets: [0.0082, 0.0057, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1067, 2466, 2466, 2467], offsets: [0.009, 0.0065, 0.0055, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [1067, 2466, 2466, 2467, 2468], offsets: [0.0091, 0.0065, 0.0056, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1067, 2466, 2466, 2467, 2468, 2469], offsets: [0.0092, 0.0066, 0.0057, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1077], offsets: [0.0068], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1077, 2476], offsets: [0.0079, 0.0053], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1077, 2476, 2477], offsets: [0.0082, 0.0055, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1077, 2476, 2477, 2478], offsets: [0.0082, 0.0056, 0.0053, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1077, 2476, 2477, 2478, 2479], offsets: [0.0083, 0.0057, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1077, 2476, 2476, 2477], offsets: [0.0091, 0.0065, 0.0055, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1077, 2476, 2476, 2477, 2478], offsets: [0.0092, 0.0066, 0.0056, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1077, 2476, 2476, 2477, 2478, 2479], offsets: [0.0093, 0.0066, 0.0057, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1087], offsets: [0.0069], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1087, 2486], offsets: [0.0081, 0.0053], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1087, 2486, 2487], offsets: [0.0083, 0.0055, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1087, 2486, 2487, 2488], offsets: [0.0084, 0.0056, 0.0053, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1087, 2486, 2487, 2488, 2489], offsets: [0.0084, 0.0057, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1087, 2486, 2486, 2487], offsets: [0.0093, 0.0065, 0.0055, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1087, 2486, 2486, 2487, 2488], offsets: [0.0094, 0.0066, 0.0056, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1087, 2486, 2486, 2487, 2488, 2489], offsets: [0.0094, 0.0067, 0.0057, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1097], offsets: [0.007], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1097, 2496], offsets: [0.0082, 0.0053], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1097, 2496, 2497], offsets: [0.0084, 0.0055, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1097, 2496, 2497, 2498], offsets: [0.0085, 0.0056, 0.0053, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1097, 2496, 2497, 2498, 2499], offsets: [0.0086, 0.0057, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1097, 2496, 2496, 2497], offsets: [0.0095, 0.0066, 0.0055, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1097, 2496, 2496, 2497, 2498], offsets: [0.0095, 0.0067, 0.0056, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1097, 2496, 2496, 2497, 2498, 2499], offsets: [0.0096, 0.0067, 0.0057, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1107], offsets: [0.0071], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1107, 2506], offsets: [0.0083, 0.0053], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1107, 2506, 2507], offsets: [0.0086, 0.0056, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1107, 2506, 2507, 2508], offsets: [0.0086, 0.0056, 0.0053, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1107, 2506, 2507, 2508, 2509], offsets: [0.0087, 0.0057, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1107, 2506, 2506, 2507], offsets: [0.0096, 0.0066, 0.0056, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1107, 2506, 2506, 2507, 2508], offsets: [0.0097, 0.0067, 0.0056, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1107, 2506, 2506, 2507, 2508, 2509], offsets: [0.0098, 0.0068, 0.0057, 0.0054, 0.0053, 0.0053], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1117], offsets: [0.0072], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1117, 2516], offsets: [0.0084, 0.0053], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1117, 2516, 2517], offsets: [0.0087, 0.0056, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1117, 2516, 2517, 2518], offsets: [0.0088, 0.0057, 0.0054, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1117, 2516, 2517, 2518, 2519], offsets: [0.0089, 0.0058, 0.0054, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1117, 2516, 2516, 2517], offsets: [0.0098, 0.0067, 0.0056, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1117, 2516, 2516, 2517, 2518], offsets: [0.0098, 0.0068, 0.0057, 0.0054, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1117, 2516, 2516, 2517, 2518, 2519], offsets: [0.0099, 0.0068, 0.0058, 0.0054, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1127], offsets: [0.0073], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1127, 2526], offsets: [0.0085, 0.0053], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1127, 2526, 2527], offsets: [0.0089, 0.0057, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1127, 2526, 2527, 2528], offsets: [0.0089, 0.0057, 0.0054, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1127, 2526, 2527, 2528, 2529], offsets: [0.009, 0.0058, 0.0055, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1127, 2526, 2526, 2527], offsets: [0.0099, 0.0067, 0.0057, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1127, 2526, 2526, 2527, 2528], offsets: [0.01, 0.0068, 0.0057, 0.0054, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1127, 2526, 2526, 2527, 2528, 2529], offsets: [0.0101, 0.0069, 0.0058, 0.0055, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1137], offsets: [0.0073], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1137, 2536], offsets: [0.0085, 0.0055], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1137, 2536, 2537], offsets: [0.0089, 0.0059, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
        { passNum: 4, label: 'Finish 20', approach: 'N', epacCodes: [1137, 2536, 2537, 2538], offsets: [0.009, 0.006, 0.0056, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 10', approach: 'N', epacCodes: [1137, 2536, 2537, 2538, 2539], offsets: [0.0092, 0.0062, 0.0057, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '10' },
        { passNum: 6, label: '+1 Finish 35', approach: 'N', epacCodes: [1137, 2536, 2536, 2537], offsets: [0.01, 0.007, 0.0059, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36 +1' },
        { passNum: 7, label: '+1 Finish 20', approach: 'N', epacCodes: [1137, 2536, 2536, 2537, 2538], offsets: [0.0102, 0.0072, 0.006, 0.0056, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20 +1' },
        { passNum: 8, label: '+1 Finish 10', approach: 'N', epacCodes: [1137, 2536, 2536, 2537, 2538, 2539], offsets: [0.0103, 0.0073, 0.0062, 0.0057, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '10 +1' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1147], offsets: [0.0073], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1147, 2546], offsets: [0.0085, 0.0055], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1147, 2546, 2547], offsets: [0.0089, 0.0059, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1147, 2546, 2547, 2548], offsets: [0.0091, 0.006, 0.0056, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1147, 2546, 2547, 2548, 2549], offsets: [0.0092, 0.0061, 0.0057, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1147, 2546, 2546, 2547], offsets: [0.0101, 0.007, 0.0059, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1147, 2546, 2546, 2547, 2548], offsets: [0.0102, 0.0072, 0.006, 0.0056, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1147, 2546, 2546, 2547, 2548, 2549], offsets: [0.0103, 0.0073, 0.0061, 0.0057, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1157], offsets: [0.0073], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1157, 2556], offsets: [0.0086, 0.0055], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1157, 2556, 2557], offsets: [0.0089, 0.0058, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1157, 2556, 2557, 2558], offsets: [0.0091, 0.006, 0.0056, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1157, 2556, 2557, 2558, 2559], offsets: [0.0092, 0.0061, 0.0057, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1157, 2556, 2556, 2557], offsets: [0.0101, 0.007, 0.0058, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1157, 2556, 2556, 2557, 2558], offsets: [0.0103, 0.0072, 0.006, 0.0056, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1157, 2556, 2556, 2557, 2558, 2559], offsets: [0.0104, 0.0073, 0.0061, 0.0057, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1167], offsets: [0.0073], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1167, 2566], offsets: [0.0086, 0.0055], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1167, 2566, 2567], offsets: [0.009, 0.0058, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1167, 2566, 2567, 2568], offsets: [0.0091, 0.006, 0.0056, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1167, 2566, 2567, 2568, 2569], offsets: [0.0092, 0.0061, 0.0057, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1167, 2566, 2566, 2567], offsets: [0.0102, 0.0071, 0.0058, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1167, 2566, 2566, 2567, 2568], offsets: [0.0104, 0.0073, 0.006, 0.0056, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1167, 2566, 2566, 2567, 2568, 2569], offsets: [0.0105, 0.0073, 0.0061, 0.0057, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 16,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1177], offsets: [0.0074], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1177, 2576], offsets: [0.0086, 0.0055], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1177, 2576, 2577], offsets: [0.009, 0.0058, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1177, 2576, 2577, 2578], offsets: [0.0092, 0.006, 0.0056, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1177, 2576, 2577, 2578, 2579], offsets: [0.0093, 0.0061, 0.0057, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1177, 2576, 2576, 2577], offsets: [0.0103, 0.0071, 0.0058, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1177, 2576, 2576, 2577, 2578], offsets: [0.0105, 0.0073, 0.006, 0.0056, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1177, 2576, 2576, 2577, 2578, 2579], offsets: [0.0105, 0.0074, 0.0061, 0.0057, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 17,
      thicknessInch: 4.5,
      thicknessMm: 114.3,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1187], offsets: [0.0074], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1187, 2586], offsets: [0.0087, 0.0055], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1187, 2586, 2587], offsets: [0.0091, 0.0059, 0.0055], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1187, 2586, 2587, 2588], offsets: [0.0093, 0.0061, 0.0057, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1187, 2586, 2587, 2588, 2589], offsets: [0.0093, 0.0061, 0.0057, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1187, 2586, 2586, 2587], offsets: [0.0104, 0.0072, 0.0059, 0.0055], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1187, 2586, 2586, 2587, 2588], offsets: [0.0106, 0.0074, 0.0061, 0.0057, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1187, 2586, 2586, 2587, 2588, 2589], offsets: [0.0107, 0.0075, 0.0061, 0.0057, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 18,
      thicknessInch: 5,
      thicknessMm: 127,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1197], offsets: [0.0074], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1197, 2596], offsets: [0.0088, 0.0056], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1197, 2596, 2597], offsets: [0.0092, 0.006, 0.0056], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1197, 2596, 2597, 2598], offsets: [0.0093, 0.0061, 0.0057, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1197, 2596, 2597, 2598, 2599], offsets: [0.0094, 0.0062, 0.0058, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1197, 2596, 2596, 2597], offsets: [0.0106, 0.0074, 0.006, 0.0056], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1197, 2596, 2596, 2597, 2598], offsets: [0.0107, 0.0075, 0.0061, 0.0057, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1197, 2596, 2596, 2597, 2598, 2599], offsets: [0.0108, 0.0076, 0.0062, 0.0058, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 19,
      thicknessInch: 5.5,
      thicknessMm: 139.7,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1207], offsets: [0.0075], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1207, 2606], offsets: [0.0089, 0.0056], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1207, 2606, 2607], offsets: [0.0093, 0.006, 0.0056], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1207, 2606, 2607, 2608], offsets: [0.0094, 0.0061, 0.0057, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1207, 2606, 2607, 2608, 2609], offsets: [0.0095, 0.0062, 0.0058, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
        { passNum: 6, label: '+1 Finish 50', approach: 'N', epacCodes: [1207, 2606, 2606, 2607], offsets: [0.0107, 0.0075, 0.006, 0.0056], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '51 +1' },
        { passNum: 7, label: '+1 Finish 35', approach: 'N', epacCodes: [1207, 2606, 2606, 2607, 2608], offsets: [0.0108, 0.0076, 0.0061, 0.0057, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '36 +1' },
        { passNum: 8, label: '+1 Finish 20', approach: 'N', epacCodes: [1207, 2606, 2606, 2607, 2608, 2609], offsets: [0.0109, 0.0077, 0.0062, 0.0058, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 20,
      thicknessInch: 6,
      thicknessMm: 152.4,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1217], offsets: [0.0075], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1217, 2616], offsets: [0.0089, 0.0056], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1217, 2616, 2617], offsets: [0.0093, 0.006, 0.0056], registers: [1, 2, 3], feed: [0, 0, 0], ra: '51' },
        { passNum: 4, label: 'Finish 35', approach: 'N', epacCodes: [1217, 2616, 2617, 2618], offsets: [0.0094, 0.0061, 0.0057, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '36' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1217, 2616, 2617, 2618, 2619], offsets: [0.0095, 0.0062, 0.0058, 0.0055, 0.0055], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
      ],
    },
  ],
};

/** Block 32: 0.01" St - High Speed 1.2 */
const MAKINO_SP_BLOCK_32: MakinoSPBlock = {
  headerNum: 32,
  type: 'BS',
  wireDiameter: '0.01',
  material: 'St',
  method: 'High Speed 1.2',
  recordCount: 26,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1042], offsets: [0.0058], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1042, 1442], offsets: [0.0067, 0.0051], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1042, 1442, 1443], offsets: [0.0071, 0.0055, 0.0051], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1052], offsets: [0.006], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1052, 1452], offsets: [0.0072, 0.0052], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1052, 1452, 1453], offsets: [0.0077, 0.0057, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1062], offsets: [0.0063], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1062, 1462], offsets: [0.0073, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1062, 1462, 1463], offsets: [0.0078, 0.0058, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1072], offsets: [0.0064], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1072, 1472], offsets: [0.0074, 0.0054], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1072, 1472, 1473], offsets: [0.0079, 0.0059, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1082], offsets: [0.0065], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1082, 1482], offsets: [0.0076, 0.0054], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1082, 1482, 1483], offsets: [0.0081, 0.0059, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1092], offsets: [0.0066], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1092, 1492], offsets: [0.0078, 0.0054], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1092, 1492, 1493], offsets: [0.0083, 0.0059, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1102], offsets: [0.0067], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1102, 1502], offsets: [0.0078, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1102, 1502, 1503], offsets: [0.0083, 0.0059, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1112], offsets: [0.0068], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1112, 1512], offsets: [0.0078, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1112, 1512, 1513], offsets: [0.0084, 0.0058, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1122], offsets: [0.0068], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1122, 1522], offsets: [0.0079, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1122, 1522, 1523], offsets: [0.0084, 0.0058, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1132], offsets: [0.0069], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1132, 1532], offsets: [0.008, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1132, 1532, 1533], offsets: [0.0085, 0.0058, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1142], offsets: [0.007], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1142, 1542], offsets: [0.0081, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1142, 1542, 1543], offsets: [0.0086, 0.0058, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1152], offsets: [0.0071], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1152, 1552], offsets: [0.0082, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1152, 1552, 1553], offsets: [0.0087, 0.0058, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1162], offsets: [0.0071], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1162, 1562], offsets: [0.0082, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1162, 1562, 1563], offsets: [0.0087, 0.0058, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1172], offsets: [0.0072], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1172, 1572], offsets: [0.0083, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1172, 1572, 1573], offsets: [0.0088, 0.0058, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 4.5,
      thicknessMm: 114.3,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1182], offsets: [0.0073], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1182, 1582], offsets: [0.0084, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1182, 1582, 1583], offsets: [0.0089, 0.0058, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 16,
      thicknessInch: 5,
      thicknessMm: 127,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1192], offsets: [0.0075], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1192, 1592], offsets: [0.0085, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1192, 1592, 1593], offsets: [0.009, 0.0058, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 17,
      thicknessInch: 5.5,
      thicknessMm: 139.7,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1202], offsets: [0.0076], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1202, 1602], offsets: [0.0087, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1202, 1602, 1603], offsets: [0.0092, 0.0058, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 18,
      thicknessInch: 6,
      thicknessMm: 152.4,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1212], offsets: [0.0078], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1212, 1612], offsets: [0.0088, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1212, 1612, 1613], offsets: [0.0093, 0.0058, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 19,
      thicknessInch: 6.5,
      thicknessMm: 165.1,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1222], offsets: [0.0078], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1222, 1622], offsets: [0.0089, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1222, 1622, 1623], offsets: [0.0094, 0.0058, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 20,
      thicknessInch: 7,
      thicknessMm: 177.8,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1232], offsets: [0.0079], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1232, 1632], offsets: [0.0089, 0.0054], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1232, 1632, 1633], offsets: [0.0094, 0.0059, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '44' },
      ],
    },
    {
      recordNum: 21,
      thicknessInch: 7.5,
      thicknessMm: 190.5,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1242], offsets: [0.008], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1242, 1642], offsets: [0.009, 0.0054], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1242, 1642, 1643], offsets: [0.0095, 0.0059, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '44' },
      ],
    },
    {
      recordNum: 22,
      thicknessInch: 8,
      thicknessMm: 203.2,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1252], offsets: [0.008], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1252, 1652], offsets: [0.009, 0.0054], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1252, 1652, 1653], offsets: [0.0095, 0.0059, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '44' },
      ],
    },
    {
      recordNum: 23,
      thicknessInch: 9,
      thicknessMm: 228.6,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1262], offsets: [0.0083], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1262, 1662], offsets: [0.0093, 0.0055], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1262, 1662, 1663], offsets: [0.0098, 0.0059, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '44' },
      ],
    },
    {
      recordNum: 24,
      thicknessInch: 10,
      thicknessMm: 254,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1272], offsets: [0.0086], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1272, 1672], offsets: [0.0096, 0.0055], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1272, 1672, 1673], offsets: [0.0101, 0.0059, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '44' },
      ],
    },
    {
      recordNum: 25,
      thicknessInch: 11,
      thicknessMm: 279.4,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1282], offsets: [0.0087], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1282, 1682], offsets: [0.0098, 0.0055], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1282, 1682, 1683], offsets: [0.0102, 0.0059, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '44' },
      ],
    },
    {
      recordNum: 26,
      thicknessInch: 12,
      thicknessMm: 304.8,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1292], offsets: [0.0087], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1292, 1692], offsets: [0.0099, 0.0056], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1292, 1692, 1693], offsets: [0.0102, 0.0059, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '44' },
      ],
    },
  ],
};

/** Block 33: 0.01" St - High Speed 1.6 */
const MAKINO_SP_BLOCK_33: MakinoSPBlock = {
  headerNum: 33,
  type: 'BS',
  wireDiameter: '0.01',
  material: 'St',
  method: 'High Speed 1.6',
  recordCount: 24,
  records: [
    {
      recordNum: 1,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1061], offsets: [0.0063], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1061, 1462], offsets: [0.0073, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1071], offsets: [0.0064], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1071, 1472], offsets: [0.0074, 0.0054], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1081], offsets: [0.0065], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1081, 1482], offsets: [0.0076, 0.0054], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1091], offsets: [0.0066], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1091, 1492], offsets: [0.0078, 0.0054], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1101], offsets: [0.0067], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1101, 1502], offsets: [0.0078, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1111], offsets: [0.0068], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1111, 1512], offsets: [0.0078, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1121], offsets: [0.0068], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1121, 1522], offsets: [0.0079, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1131], offsets: [0.0069], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1131, 1532], offsets: [0.008, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1141], offsets: [0.007], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1141, 1542], offsets: [0.0081, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1151], offsets: [0.0071], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1151, 1552], offsets: [0.0082, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1161], offsets: [0.0071], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1161, 1562], offsets: [0.0082, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1171], offsets: [0.0072], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1171, 1572], offsets: [0.0083, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 4.5,
      thicknessMm: 114.3,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1181], offsets: [0.0073], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1181, 1582], offsets: [0.0084, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 5,
      thicknessMm: 127,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1191], offsets: [0.0075], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1191, 1592], offsets: [0.0085, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 5.5,
      thicknessMm: 139.7,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1201], offsets: [0.0076], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1201, 1602], offsets: [0.0087, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 16,
      thicknessInch: 6,
      thicknessMm: 152.4,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1211], offsets: [0.0078], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1211, 1612], offsets: [0.0088, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 17,
      thicknessInch: 6.5,
      thicknessMm: 165.1,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1221], offsets: [0.0078], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1221, 1622], offsets: [0.0089, 0.0053], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 18,
      thicknessInch: 7,
      thicknessMm: 177.8,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1231], offsets: [0.0079], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1231, 1632], offsets: [0.0089, 0.0054], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 19,
      thicknessInch: 7.5,
      thicknessMm: 190.5,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1241], offsets: [0.008], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1241, 1642], offsets: [0.009, 0.0054], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 20,
      thicknessInch: 8,
      thicknessMm: 203.2,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1251], offsets: [0.008], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1251, 1652], offsets: [0.009, 0.0054], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 21,
      thicknessInch: 9,
      thicknessMm: 228.6,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1261], offsets: [0.0083], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1261, 1662], offsets: [0.0093, 0.0055], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 22,
      thicknessInch: 10,
      thicknessMm: 254,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1271], offsets: [0.0086], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1271, 1672], offsets: [0.0096, 0.0055], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 23,
      thicknessInch: 11,
      thicknessMm: 279.4,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1281], offsets: [0.0087], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1281, 1682], offsets: [0.0098, 0.0055], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 24,
      thicknessInch: 12,
      thicknessMm: 304.8,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1291], offsets: [0.0087], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1291, 1692], offsets: [0.0099, 0.0056], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
  ],
};

/** Block 34: 0.01" St - Land */
const MAKINO_SP_BLOCK_34: MakinoSPBlock = {
  headerNum: 34,
  type: 'BS',
  wireDiameter: '0.01',
  material: 'St',
  method: 'Land',
  recordCount: 22,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.05,
      thicknessMm: 1.27,
      taper: '0.25',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1841], offsets: [0.0055], registers: [1], feed: [0], ra: '17' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.05,
      thicknessMm: 1.27,
      taper: '0.5',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1843], offsets: [0.0054], registers: [1], feed: [0], ra: '17' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.05,
      thicknessMm: 1.27,
      taper: '0.75',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1845], offsets: [0.0054], registers: [1], feed: [0], ra: '17' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 0.05,
      thicknessMm: 1.27,
      taper: '1',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1847], offsets: [0.0054], registers: [1], feed: [0], ra: '17' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 0.1,
      thicknessMm: 2.54,
      taper: '0.25',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1851], offsets: [0.0054], registers: [1], feed: [0], ra: '17' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 0.1,
      thicknessMm: 2.54,
      taper: '0.5',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1853], offsets: [0.0054], registers: [1], feed: [0], ra: '31' },
        { passNum: 2, label: '2nd 25uinRa', approach: 'N', epacCodes: [1853, 1854], offsets: [0.0057, 0.0054], registers: [1, 2], feed: [0, 0], ra: '17' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 0.1,
      thicknessMm: 2.54,
      taper: '0.75',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1855], offsets: [0.0054], registers: [1], feed: [0], ra: '31' },
        { passNum: 2, label: '2nd 25uinRa', approach: 'N', epacCodes: [1855, 1856], offsets: [0.0057, 0.0054], registers: [1, 2], feed: [0, 0], ra: '17' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 0.1,
      thicknessMm: 2.54,
      taper: '1',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1857], offsets: [0.0054], registers: [1], feed: [0], ra: '31' },
        { passNum: 2, label: '2nd 25uinRa', approach: 'N', epacCodes: [1857, 1858], offsets: [0.0057, 0.0054], registers: [1, 2], feed: [0, 0], ra: '17' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 0.15,
      thicknessMm: 3.81,
      taper: '0.25',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1861], offsets: [0.0054], registers: [1], feed: [0], ra: '31' },
        { passNum: 2, label: '2nd 25uinRa', approach: 'N', epacCodes: [1861, 1862], offsets: [0.0057, 0.0054], registers: [1, 2], feed: [0, 0], ra: '17' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 0.15,
      thicknessMm: 3.81,
      taper: '0.5',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1863], offsets: [0.0053], registers: [1], feed: [0], ra: '31' },
        { passNum: 2, label: '2nd 25uinRa', approach: 'N', epacCodes: [1863, 1864], offsets: [0.0056, 0.0054], registers: [1, 2], feed: [0, 0], ra: '17' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 0.15,
      thicknessMm: 3.81,
      taper: '0.75',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1865], offsets: [0.0053], registers: [1], feed: [0], ra: '41' },
        { passNum: 2, label: '2nd 25uinRa', approach: 'N', epacCodes: [1865, 1866], offsets: [0.0056, 0.0053], registers: [1, 2], feed: [0, 0], ra: '17' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 0.15,
      thicknessMm: 3.81,
      taper: '1',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1867], offsets: [0.0053], registers: [1], feed: [0], ra: '41' },
        { passNum: 2, label: '2nd 25uinRa', approach: 'N', epacCodes: [1867, 1868], offsets: [0.0056, 0.0054], registers: [1, 2], feed: [0, 0], ra: '17' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 0.2,
      thicknessMm: 5.08,
      taper: '0.25',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1871], offsets: [0.0054], registers: [1], feed: [0], ra: '31' },
        { passNum: 2, label: '2nd 25uinRa', approach: 'N', epacCodes: [1871, 1872], offsets: [0.0057, 0.0054], registers: [1, 2], feed: [0, 0], ra: '17' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 0.2,
      thicknessMm: 5.08,
      taper: '0.5',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1873], offsets: [0.0053], registers: [1], feed: [0], ra: '41' },
        { passNum: 2, label: '2nd 25uinRa', approach: 'N', epacCodes: [1873, 1874], offsets: [0.0056, 0.0053], registers: [1, 2], feed: [0, 0], ra: '17' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 0.2,
      thicknessMm: 5.08,
      taper: '0.75',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1875], offsets: [0.0053], registers: [1], feed: [0], ra: '41' },
        { passNum: 2, label: '2nd 25uinRa', approach: 'N', epacCodes: [1875, 1876], offsets: [0.0056, 0.0053], registers: [1, 2], feed: [0, 0], ra: '17' },
      ],
    },
    {
      recordNum: 16,
      thicknessInch: 0.2,
      thicknessMm: 5.08,
      taper: '1',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1877], offsets: [0.0053], registers: [1], feed: [0], ra: '41' },
        { passNum: 2, label: '2nd 25uinRa', approach: 'N', epacCodes: [1877, 1878], offsets: [0.0056, 0.0053], registers: [1, 2], feed: [0, 0], ra: '17' },
      ],
    },
    {
      recordNum: 17,
      thicknessInch: 0.4,
      thicknessMm: 10.16,
      taper: '0.25',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1881], offsets: [0.0053], registers: [1], feed: [0], ra: '41' },
        { passNum: 2, label: '2nd 25uinRa', approach: 'N', epacCodes: [1881, 1882], offsets: [0.0056, 0.0053], registers: [1, 2], feed: [0, 0], ra: '17' },
      ],
    },
    {
      recordNum: 18,
      thicknessInch: 0.4,
      thicknessMm: 10.16,
      taper: '0.5',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1883], offsets: [0.0053], registers: [1], feed: [0], ra: '56' },
        { passNum: 2, label: '2nd 25uinRa', approach: 'N', epacCodes: [1883, 1884], offsets: [0.0056, 0.0053], registers: [1, 2], feed: [0, 0], ra: '17' },
      ],
    },
    {
      recordNum: 19,
      thicknessInch: 0.4,
      thicknessMm: 10.16,
      taper: '0.75',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1885], offsets: [0.0053], registers: [1], feed: [0], ra: '56' },
        { passNum: 2, label: '2nd 25uinRa', approach: 'N', epacCodes: [1885, 1886], offsets: [0.0056, 0.0053], registers: [1, 2], feed: [0, 0], ra: '17' },
      ],
    },
    {
      recordNum: 20,
      thicknessInch: 0.4,
      thicknessMm: 10.16,
      taper: '1',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1887], offsets: [0.0053], registers: [1], feed: [0], ra: '56' },
        { passNum: 2, label: '2nd 25uinRa', approach: 'N', epacCodes: [1887, 1888], offsets: [0.0056, 0.0053], registers: [1, 2], feed: [0, 0], ra: '17' },
      ],
    },
    {
      recordNum: 21,
      thicknessInch: 0.6,
      thicknessMm: 15.24,
      taper: '0.25',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1891], offsets: [0.0053], registers: [1], feed: [0], ra: '56' },
        { passNum: 2, label: '2nd 25uinRa', approach: 'N', epacCodes: [1891, 1892], offsets: [0.0056, 0.0053], registers: [1, 2], feed: [0, 0], ra: '17' },
      ],
    },
    {
      recordNum: 22,
      thicknessInch: 0.6,
      thicknessMm: 15.24,
      taper: '0.5',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1893], offsets: [0.0053], registers: [1], feed: [0], ra: '56' },
        { passNum: 2, label: '2nd 25uinRa', approach: 'N', epacCodes: [1893, 1894], offsets: [0.0056, 0.0053], registers: [1, 2], feed: [0, 0], ra: '17' },
      ],
    },
  ],
};

/** Block 35: 0.01" St - Precision */
const MAKINO_SP_BLOCK_35: MakinoSPBlock = {
  headerNum: 35,
  type: 'BS',
  wireDiameter: '0.01',
  material: 'St',
  method: 'Precision',
  recordCount: 20,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1024], offsets: [0.0061], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1024, 2671], offsets: [0.0071, 0.0052], registers: [1, 2], feed: [0, 0], ra: '56' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1024, 2671, 2672], offsets: [0.0075, 0.0056, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1024, 2671, 2672, 2673], offsets: [0.0075, 0.0056, 0.0054, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 20', approach: 'N', epacCodes: [1024, 2671, 2671, 2672], offsets: [0.0082, 0.0063, 0.0056, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [1024, 2671, 2671, 2672, 2673], offsets: [0.0082, 0.0063, 0.0056, 0.0054, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1034], offsets: [0.0059], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1034, 2691], offsets: [0.0069, 0.0052], registers: [1, 2], feed: [0, 0], ra: '56' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1034, 2691, 2692], offsets: [0.0072, 0.0056, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1034, 2691, 2692, 2693], offsets: [0.0073, 0.0056, 0.0054, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 20', approach: 'N', epacCodes: [1034, 2691, 2691, 2692], offsets: [0.0079, 0.0062, 0.0056, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [1034, 2691, 2691, 2692, 2693], offsets: [0.0079, 0.0062, 0.0056, 0.0054, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1044], offsets: [0.0058], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1044, 2701], offsets: [0.0068, 0.0052], registers: [1, 2], feed: [0, 0], ra: '56' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1044, 2701, 2702], offsets: [0.0071, 0.0056, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1044, 2701, 2702, 2703], offsets: [0.0072, 0.0056, 0.0054, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 20', approach: 'N', epacCodes: [1044, 2701, 2701, 2702], offsets: [0.0079, 0.0063, 0.0056, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [1044, 2701, 2701, 2702, 2703], offsets: [0.008, 0.0064, 0.0056, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1054], offsets: [0.0059], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1054, 2711], offsets: [0.0069, 0.0052], registers: [1, 2], feed: [0, 0], ra: '56' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1054, 2711, 2712], offsets: [0.0072, 0.0056, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1054, 2711, 2712, 2713], offsets: [0.0073, 0.0056, 0.0054, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 20', approach: 'N', epacCodes: [1054, 2711, 2711, 2712], offsets: [0.008, 0.0063, 0.0056, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [1054, 2711, 2711, 2712, 2713], offsets: [0.0081, 0.0064, 0.0056, 0.0054, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1064], offsets: [0.0061], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1064, 2721], offsets: [0.0071, 0.0053], registers: [1, 2], feed: [0, 0], ra: '56' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1064, 2721, 2722], offsets: [0.0075, 0.0057, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1064, 2721, 2722, 2723], offsets: [0.0075, 0.0057, 0.0054, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 20', approach: 'N', epacCodes: [1064, 2721, 2721, 2722], offsets: [0.0083, 0.0064, 0.0057, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [1064, 2721, 2721, 2722, 2723], offsets: [0.0083, 0.0065, 0.0057, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1074], offsets: [0.0062], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1074, 2731], offsets: [0.0072, 0.0053], registers: [1, 2], feed: [0, 0], ra: '56' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1074, 2731, 2732], offsets: [0.0075, 0.0056, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1074, 2731, 2732, 2733], offsets: [0.0076, 0.0057, 0.0054, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 20', approach: 'N', epacCodes: [1074, 2731, 2731, 2732], offsets: [0.0083, 0.0064, 0.0056, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [1074, 2731, 2731, 2732, 2733], offsets: [0.0084, 0.0065, 0.0057, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1084], offsets: [0.0063], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1084, 2741], offsets: [0.0073, 0.0053], registers: [1, 2], feed: [0, 0], ra: '56' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1084, 2741, 2742], offsets: [0.0076, 0.0057, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1084, 2741, 2742, 2743], offsets: [0.0077, 0.0057, 0.0054, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 20', approach: 'N', epacCodes: [1084, 2741, 2741, 2742], offsets: [0.0086, 0.0066, 0.0057, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [1084, 2741, 2741, 2742, 2743], offsets: [0.0086, 0.0066, 0.0057, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1094], offsets: [0.0064], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1094, 2751], offsets: [0.0074, 0.0054], registers: [1, 2], feed: [0, 0], ra: '56' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1094, 2751, 2752], offsets: [0.0078, 0.0057, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1094, 2751, 2752, 2753], offsets: [0.0078, 0.0057, 0.0054, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 20', approach: 'N', epacCodes: [1094, 2751, 2751, 2752], offsets: [0.0089, 0.0068, 0.0057, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [1094, 2751, 2751, 2752, 2753], offsets: [0.0089, 0.0069, 0.0057, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1104], offsets: [0.0065], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1104, 2761], offsets: [0.0075, 0.0054], registers: [1, 2], feed: [0, 0], ra: '56' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1104, 2761, 2762], offsets: [0.0079, 0.0057, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1104, 2761, 2762, 2763], offsets: [0.0079, 0.0057, 0.0054, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 20', approach: 'N', epacCodes: [1104, 2761, 2761, 2762], offsets: [0.0091, 0.0069, 0.0057, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [1104, 2761, 2761, 2762, 2763], offsets: [0.0092, 0.007, 0.0057, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 6,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1114], offsets: [0.0067], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1114, 2771], offsets: [0.0077, 0.0054], registers: [1, 2], feed: [0, 0], ra: '56' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1114, 2771, 2772], offsets: [0.008, 0.0057, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [1114, 2771, 2772, 2773], offsets: [0.0081, 0.0057, 0.0054, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '15' },
        { passNum: 5, label: '+1 Finish 20', approach: 'N', epacCodes: [1114, 2771, 2771, 2772], offsets: [0.0093, 0.007, 0.0057, 0.0054], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
        { passNum: 6, label: '+1 Finish 15', approach: 'N', epacCodes: [1114, 2771, 2771, 2772, 2773], offsets: [0.0093, 0.007, 0.0057, 0.0054, 0.0054], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '15 +1' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1125], offsets: [0.0065], registers: [1], feed: [0], ra: '109' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1125, 2781], offsets: [0.0077, 0.0053], registers: [1, 2], feed: [0, 0], ra: '58' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1125, 2781, 2782], offsets: [0.0081, 0.0058, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '41' },
        { passNum: 4, label: 'Finish 25', approach: 'N', epacCodes: [1125, 2781, 2782, 2783], offsets: [0.0084, 0.0061, 0.0055, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1125, 2781, 2782, 2783, 2784], offsets: [0.0085, 0.0062, 0.0056, 0.0054, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '16' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1135], offsets: [0.0065], registers: [1], feed: [0], ra: '109' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1135, 2791], offsets: [0.0077, 0.0053], registers: [1, 2], feed: [0, 0], ra: '58' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1135, 2791, 2792], offsets: [0.0081, 0.0058, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '41' },
        { passNum: 4, label: 'Finish 25', approach: 'N', epacCodes: [1135, 2791, 2792, 2793], offsets: [0.0084, 0.0061, 0.0055, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1135, 2791, 2792, 2793, 2794], offsets: [0.0085, 0.0062, 0.0056, 0.0054, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '16' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1145], offsets: [0.0065], registers: [1], feed: [0], ra: '109' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1145, 2801], offsets: [0.0077, 0.0053], registers: [1, 2], feed: [0, 0], ra: '58' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1145, 2801, 2802], offsets: [0.0082, 0.0058, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '41' },
        { passNum: 4, label: 'Finish 25', approach: 'N', epacCodes: [1145, 2801, 2802, 2803], offsets: [0.0085, 0.0061, 0.0055, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1145, 2801, 2802, 2803, 2804], offsets: [0.0086, 0.0062, 0.0056, 0.0054, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '16' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1155], offsets: [0.0067], registers: [1], feed: [0], ra: '109' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1155, 2811], offsets: [0.0079, 0.0053], registers: [1, 2], feed: [0, 0], ra: '58' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1155, 2811, 2812], offsets: [0.0084, 0.0058, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '41' },
        { passNum: 4, label: 'Finish 25', approach: 'N', epacCodes: [1155, 2811, 2812, 2813], offsets: [0.0086, 0.0061, 0.0055, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1155, 2811, 2812, 2813, 2814], offsets: [0.0087, 0.0062, 0.0056, 0.0054, 0.0053], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '16' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1165], offsets: [0.0068], registers: [1], feed: [0], ra: '109' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1165, 2821], offsets: [0.008, 0.0053], registers: [1, 2], feed: [0, 0], ra: '58' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1165, 2821, 2822], offsets: [0.0085, 0.0058, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '41' },
        { passNum: 4, label: 'Finish 25', approach: 'N', epacCodes: [1165, 2821, 2822, 2823], offsets: [0.0087, 0.0061, 0.0055, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1165, 2821, 2822, 2823, 2824], offsets: [0.0088, 0.0061, 0.0056, 0.0054, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '16' },
      ],
    },
    {
      recordNum: 16,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1175], offsets: [0.0069], registers: [1], feed: [0], ra: '109' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1175, 2831], offsets: [0.0081, 0.0053], registers: [1, 2], feed: [0, 0], ra: '58' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1175, 2831, 2832], offsets: [0.0086, 0.0058, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '41' },
        { passNum: 4, label: 'Finish 25', approach: 'N', epacCodes: [1175, 2831, 2832, 2833], offsets: [0.0088, 0.0061, 0.0055, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1175, 2831, 2832, 2833, 2834], offsets: [0.0089, 0.0062, 0.0055, 0.0054, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '16' },
      ],
    },
    {
      recordNum: 17,
      thicknessInch: 4.5,
      thicknessMm: 114.3,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1185], offsets: [0.007], registers: [1], feed: [0], ra: '109' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1185, 2841], offsets: [0.0083, 0.0054], registers: [1, 2], feed: [0, 0], ra: '58' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1185, 2841, 2842], offsets: [0.0088, 0.0059, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '41' },
        { passNum: 4, label: 'Finish 25', approach: 'N', epacCodes: [1185, 2841, 2842, 2843], offsets: [0.009, 0.0062, 0.0055, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1185, 2841, 2842, 2843, 2844], offsets: [0.0091, 0.0062, 0.0055, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '16' },
      ],
    },
    {
      recordNum: 18,
      thicknessInch: 5,
      thicknessMm: 127,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1195], offsets: [0.0071], registers: [1], feed: [0], ra: '109' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1195, 2851], offsets: [0.0084, 0.0054], registers: [1, 2], feed: [0, 0], ra: '58' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1195, 2851, 2852], offsets: [0.009, 0.006, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '41' },
        { passNum: 4, label: 'Finish 25', approach: 'N', epacCodes: [1195, 2851, 2852, 2853], offsets: [0.0092, 0.0063, 0.0055, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '24' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1195, 2851, 2852, 2853, 2854], offsets: [0.0093, 0.0063, 0.0055, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
      ],
    },
    {
      recordNum: 19,
      thicknessInch: 5.5,
      thicknessMm: 139.7,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1205], offsets: [0.0072], registers: [1], feed: [0], ra: '109' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1205, 2861], offsets: [0.0086, 0.0054], registers: [1, 2], feed: [0, 0], ra: '58' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1205, 2861, 2862], offsets: [0.0091, 0.006, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '41' },
        { passNum: 4, label: 'Finish 25', approach: 'N', epacCodes: [1205, 2861, 2862, 2863], offsets: [0.0094, 0.0062, 0.0054, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '24' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1205, 2861, 2862, 2863, 2864], offsets: [0.0095, 0.0063, 0.0055, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
      ],
    },
    {
      recordNum: 20,
      thicknessInch: 6,
      thicknessMm: 152.4,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1215], offsets: [0.0073], registers: [1], feed: [0], ra: '109' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1215, 2871], offsets: [0.0088, 0.0054], registers: [1, 2], feed: [0, 0], ra: '58' },
        { passNum: 3, label: 'Finish 50', approach: 'N', epacCodes: [1215, 2871, 2872], offsets: [0.0093, 0.0059, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '41' },
        { passNum: 4, label: 'Finish 25', approach: 'N', epacCodes: [1215, 2871, 2872, 2873], offsets: [0.0096, 0.0062, 0.0054, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '24' },
        { passNum: 5, label: 'Finish 20', approach: 'N', epacCodes: [1215, 2871, 2872, 2873, 2874], offsets: [0.0096, 0.0063, 0.0055, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '20' },
      ],
    },
  ],
};

/** Block 36: 0.01" St - Varying Thickness */
const MAKINO_SP_BLOCK_36: MakinoSPBlock = {
  headerNum: 36,
  type: 'BS',
  wireDiameter: '0.01',
  material: 'St',
  method: 'Varying Thickness',
  recordCount: 3,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1069], offsets: [0.0069], registers: [1], feed: [0], ra: '149' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1149], offsets: [0.0073], registers: [1], feed: [0], ra: '149' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1219], offsets: [0.0074], registers: [1], feed: [0], ra: '149' },
      ],
    },
  ],
};

/** Block 37: 0.01" WC - Both Away */
const MAKINO_SP_BLOCK_37: MakinoSPBlock = {
  headerNum: 37,
  type: 'BS',
  wireDiameter: '0.01',
  material: 'WC',
  method: 'Both Away',
  recordCount: 10,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5026], offsets: [0.0063], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5026, 5426], offsets: [0.0073, 0.0052], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5026, 5426, 5427], offsets: [0.0076, 0.0055, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5026, 5426, 5427, 5428], offsets: [0.0078, 0.0057, 0.0054, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '9' },
        { passNum: 5, label: 'Finish 4', approach: 'N', epacCodes: [5026, 5426, 5427, 5428, 5429], offsets: [0.0078, 0.0057, 0.0055, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5036], offsets: [0.0064], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5036, 5436], offsets: [0.0074, 0.0052], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5036, 5436, 5437], offsets: [0.0077, 0.0055, 0.0052], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5036, 5436, 5437, 5438], offsets: [0.0079, 0.0057, 0.0054, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '9' },
        { passNum: 5, label: 'Finish 4', approach: 'N', epacCodes: [5036, 5436, 5437, 5438, 5439], offsets: [0.0079, 0.0057, 0.0055, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5046], offsets: [0.0066], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5046, 5446], offsets: [0.0076, 0.0053], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5046, 5446, 5447], offsets: [0.0079, 0.0055, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5046, 5446, 5447, 5448], offsets: [0.008, 0.0057, 0.0054, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '9' },
        { passNum: 5, label: 'Finish 4', approach: 'N', epacCodes: [5046, 5446, 5447, 5448, 5449], offsets: [0.0081, 0.0057, 0.0055, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5056], offsets: [0.0068], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5056, 5456], offsets: [0.0079, 0.0053], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5056, 5456, 5457], offsets: [0.0082, 0.0056, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5056, 5456, 5457, 5458], offsets: [0.0083, 0.0058, 0.0054, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '9' },
        { passNum: 5, label: 'Finish 4', approach: 'N', epacCodes: [5056, 5456, 5457, 5458, 5459], offsets: [0.0084, 0.0058, 0.0055, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5066], offsets: [0.0069], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5066, 5466], offsets: [0.008, 0.0054], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5066, 5466, 5467], offsets: [0.0083, 0.0057, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5066, 5466, 5467, 5468], offsets: [0.0085, 0.0058, 0.0054, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '9' },
        { passNum: 5, label: 'Finish 4', approach: 'N', epacCodes: [5066, 5466, 5467, 5468, 5469], offsets: [0.0085, 0.0059, 0.0055, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5076], offsets: [0.0069], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5076, 5476], offsets: [0.0081, 0.0054], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5076, 5476, 5477], offsets: [0.0084, 0.0057, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [5076, 5476, 5477, 5478], offsets: [0.0085, 0.0058, 0.0054, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '12' },
        { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [5076, 5476, 5477, 5478, 5479], offsets: [0.0086, 0.0059, 0.0055, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '5' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5086], offsets: [0.0069], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5086, 5486], offsets: [0.0081, 0.0054], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5086, 5486, 5487], offsets: [0.0084, 0.0056, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [5086, 5486, 5487, 5488], offsets: [0.0085, 0.0058, 0.0054, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '12' },
        { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [5086, 5486, 5487, 5488, 5489], offsets: [0.0086, 0.0058, 0.0055, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '5' },
        { passNum: 6, label: '+1 Finish 25', approach: 'N', epacCodes: [5086, 5486, 5486, 5487], offsets: [0.0092, 0.0064, 0.0056, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [5086, 5486, 5486, 5487, 5488], offsets: [0.0093, 0.0066, 0.0058, 0.0054, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '12 +1' },
        { passNum: 8, label: '+1 Finish 6', approach: 'N', epacCodes: [5086, 5486, 5486, 5487, 5488, 5489], offsets: [0.0094, 0.0066, 0.0058, 0.0055, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '5 +1' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5096], offsets: [0.007], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5096, 5496], offsets: [0.0081, 0.0053], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5096, 5496, 5497], offsets: [0.0083, 0.0056, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [5096, 5496, 5497, 5498], offsets: [0.0085, 0.0057, 0.0054, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '12' },
        { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [5096, 5496, 5497, 5498, 5499], offsets: [0.0085, 0.0058, 0.0055, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '6' },
        { passNum: 6, label: '+1 Finish 25', approach: 'N', epacCodes: [5096, 5496, 5496, 5497], offsets: [0.0091, 0.0064, 0.0056, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [5096, 5496, 5496, 5497, 5498], offsets: [0.0093, 0.0065, 0.0057, 0.0054, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '12 +1' },
        { passNum: 8, label: '+1 Finish 6', approach: 'N', epacCodes: [5096, 5496, 5496, 5497, 5498, 5499], offsets: [0.0093, 0.0066, 0.0058, 0.0055, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '6 +1' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5106], offsets: [0.0071], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5106, 5506], offsets: [0.0081, 0.0053], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5106, 5506, 5507], offsets: [0.0083, 0.0056, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [5106, 5506, 5507, 5508], offsets: [0.0085, 0.0057, 0.0054, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '12' },
        { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [5106, 5506, 5507, 5508, 5509], offsets: [0.0085, 0.0058, 0.0054, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '6' },
        { passNum: 6, label: '+1 Finish 25', approach: 'N', epacCodes: [5106, 5506, 5506, 5507], offsets: [0.0091, 0.0064, 0.0056, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [5106, 5506, 5506, 5507, 5508], offsets: [0.0093, 0.0065, 0.0057, 0.0054, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '12 +1' },
        { passNum: 8, label: '+1 Finish 6', approach: 'N', epacCodes: [5106, 5506, 5506, 5507, 5508, 5509], offsets: [0.0093, 0.0065, 0.0058, 0.0054, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '6 +1' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5116], offsets: [0.0072], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5116, 5516], offsets: [0.0081, 0.0053], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5116, 5516, 5517], offsets: [0.0083, 0.0056, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [5116, 5516, 5517, 5518], offsets: [0.0085, 0.0057, 0.0054, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '12' },
        { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [5116, 5516, 5517, 5518, 5519], offsets: [0.0085, 0.0057, 0.0054, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '6' },
        { passNum: 6, label: '+1 Finish 25', approach: 'N', epacCodes: [5116, 5516, 5516, 5517], offsets: [0.0091, 0.0064, 0.0056, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [5116, 5516, 5516, 5517, 5518], offsets: [0.0093, 0.0065, 0.0057, 0.0054, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '12 +1' },
        { passNum: 8, label: '+1 Finish 6', approach: 'N', epacCodes: [5116, 5516, 5516, 5517, 5518, 5519], offsets: [0.0093, 0.0065, 0.0057, 0.0054, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '6 +1' },
      ],
    },
  ],
};

/** Block 38: 0.01" WC - High Precision */
const MAKINO_SP_BLOCK_38: MakinoSPBlock = {
  headerNum: 38,
  type: 'BS',
  wireDiameter: '0.01',
  material: 'WC',
  method: 'High Precision',
  recordCount: 11,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5025], offsets: [0.0063], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5025, 5421], offsets: [0.0073, 0.0052], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5025, 5421, 5422], offsets: [0.0076, 0.0055, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5025, 5421, 5422, 5423], offsets: [0.0078, 0.0057, 0.0054, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '9' },
        { passNum: 5, label: 'Finish 4', approach: 'N', epacCodes: [5025, 5421, 5422, 5423, 5424], offsets: [0.0079, 0.0058, 0.0055, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5035], offsets: [0.0064], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5035, 5431], offsets: [0.0075, 0.0053], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5035, 5431, 5432], offsets: [0.0078, 0.0055, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5035, 5431, 5432, 5433], offsets: [0.0079, 0.0057, 0.0054, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '9' },
        { passNum: 5, label: 'Finish 4', approach: 'N', epacCodes: [5035, 5431, 5432, 5433, 5434], offsets: [0.008, 0.0057, 0.0055, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5045], offsets: [0.0066], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5045, 5441], offsets: [0.0077, 0.0053], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5045, 5441, 5442], offsets: [0.0079, 0.0056, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5045, 5441, 5442, 5443], offsets: [0.0081, 0.0057, 0.0054, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '9' },
        { passNum: 5, label: 'Finish 4', approach: 'N', epacCodes: [5045, 5441, 5442, 5443, 5444], offsets: [0.0081, 0.0058, 0.0055, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5055], offsets: [0.0068], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5055, 5451], offsets: [0.0079, 0.0053], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5055, 5451, 5452], offsets: [0.0082, 0.0056, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5055, 5451, 5452, 5453], offsets: [0.0083, 0.0058, 0.0054, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '9' },
        { passNum: 5, label: 'Finish 4', approach: 'N', epacCodes: [5055, 5451, 5452, 5453, 5454], offsets: [0.0084, 0.0058, 0.0055, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5065], offsets: [0.007], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5065, 5461], offsets: [0.0081, 0.0054], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5065, 5461, 5462], offsets: [0.0084, 0.0057, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 10', approach: 'N', epacCodes: [5065, 5461, 5462, 5463], offsets: [0.0086, 0.0058, 0.0054, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '9' },
        { passNum: 5, label: 'Finish 4', approach: 'N', epacCodes: [5065, 5461, 5462, 5463, 5464], offsets: [0.0086, 0.0059, 0.0055, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '4' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 5,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5075], offsets: [0.007], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5075, 5471], offsets: [0.0081, 0.0053], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5075, 5471, 5472], offsets: [0.0084, 0.0056, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [5075, 5471, 5472, 5473], offsets: [0.0085, 0.0057, 0.0054, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '12' },
        { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [5075, 5471, 5472, 5473, 5474], offsets: [0.0086, 0.0058, 0.0055, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '5' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5085], offsets: [0.007], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5085, 5481], offsets: [0.0081, 0.0053], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5085, 5481, 5482], offsets: [0.0083, 0.0056, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [5085, 5481, 5482, 5483], offsets: [0.0085, 0.0057, 0.0054, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '12' },
        { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [5085, 5481, 5482, 5483, 5484], offsets: [0.0085, 0.0058, 0.0055, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '5' },
        { passNum: 6, label: '+1 Finish 25', approach: 'N', epacCodes: [5085, 5481, 5481, 5482], offsets: [0.0091, 0.0064, 0.0056, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [5085, 5481, 5481, 5482, 5483], offsets: [0.0093, 0.0065, 0.0057, 0.0054, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '12 +1' },
        { passNum: 8, label: '+1 Finish 6', approach: 'N', epacCodes: [5085, 5481, 5481, 5482, 5483, 5484], offsets: [0.0093, 0.0066, 0.0058, 0.0055, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '5 +1' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5095], offsets: [0.0071], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5095, 5491], offsets: [0.0081, 0.0053], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5095, 5491, 5492], offsets: [0.0084, 0.0056, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [5095, 5491, 5492, 5493], offsets: [0.0085, 0.0057, 0.0054, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '12' },
        { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [5095, 5491, 5492, 5493, 5494], offsets: [0.0085, 0.0058, 0.0055, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '5' },
        { passNum: 6, label: '+1 Finish 25', approach: 'N', epacCodes: [5095, 5491, 5491, 5492], offsets: [0.0091, 0.0064, 0.0056, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [5095, 5491, 5491, 5492, 5493], offsets: [0.0093, 0.0065, 0.0057, 0.0054, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '12 +1' },
        { passNum: 8, label: '+1 Finish 6', approach: 'N', epacCodes: [5095, 5491, 5491, 5492, 5493, 5494], offsets: [0.0093, 0.0066, 0.0058, 0.0055, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '5 +1' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5105], offsets: [0.0071], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5105, 5501], offsets: [0.0081, 0.0054], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5105, 5501, 5502], offsets: [0.0084, 0.0056, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [5105, 5501, 5502, 5503], offsets: [0.0085, 0.0058, 0.0054, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '12' },
        { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [5105, 5501, 5502, 5503, 5504], offsets: [0.0086, 0.0058, 0.0054, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '5' },
        { passNum: 6, label: '+1 Finish 25', approach: 'N', epacCodes: [5105, 5501, 5501, 5502], offsets: [0.0092, 0.0064, 0.0056, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [5105, 5501, 5501, 5502, 5503], offsets: [0.0093, 0.0066, 0.0058, 0.0054, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '12 +1' },
        { passNum: 8, label: '+1 Finish 6', approach: 'N', epacCodes: [5105, 5501, 5501, 5502, 5503, 5504], offsets: [0.0094, 0.0066, 0.0058, 0.0054, 0.0053, 0.0052], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '5 +1' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5115], offsets: [0.0072], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5115, 5511], offsets: [0.0082, 0.0054], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5115, 5511, 5512], offsets: [0.0085, 0.0057, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [5115, 5511, 5512, 5513], offsets: [0.0086, 0.0059, 0.0054, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '12' },
        { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [5115, 5511, 5512, 5513, 5514], offsets: [0.0086, 0.0058, 0.0054, 0.0052, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '6' },
        { passNum: 6, label: '+1 Finish 25', approach: 'N', epacCodes: [5115, 5511, 5511, 5512], offsets: [0.0092, 0.0065, 0.0057, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [5115, 5511, 5511, 5512, 5513], offsets: [0.0094, 0.0067, 0.0059, 0.0054, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '12 +1' },
        { passNum: 8, label: '+1 Finish 6', approach: 'N', epacCodes: [5115, 5511, 5511, 5512, 5513, 5514], offsets: [0.0094, 0.0066, 0.0058, 0.0054, 0.0052, 0.0052], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '6 +1' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 8,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5125], offsets: [0.0072], registers: [1], feed: [0], ra: '51' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [5125, 5521], offsets: [0.0082, 0.0055], registers: [1, 2], feed: [0, 0], ra: '36' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [5125, 5521, 5522], offsets: [0.0085, 0.0057, 0.0053], registers: [1, 2, 3], feed: [0, 0, 0], ra: '25' },
        { passNum: 4, label: 'Finish 15', approach: 'N', epacCodes: [5125, 5521, 5522, 5523], offsets: [0.0087, 0.0059, 0.0055, 0.0052], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '12' },
        { passNum: 5, label: 'Finish 6', approach: 'N', epacCodes: [5125, 5521, 5522, 5523, 5524], offsets: [0.0086, 0.0059, 0.0054, 0.0052, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '6' },
        { passNum: 6, label: '+1 Finish 25', approach: 'N', epacCodes: [5125, 5521, 5521, 5522], offsets: [0.0093, 0.0065, 0.0057, 0.0053], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '25 +1' },
        { passNum: 7, label: '+1 Finish 15', approach: 'N', epacCodes: [5125, 5521, 5521, 5522, 5523], offsets: [0.0095, 0.0067, 0.0059, 0.0055, 0.0052], registers: [1, 2, 3, 4, 5], feed: [0, 0, 0, 0, 0], ra: '12 +1' },
        { passNum: 8, label: '+1 Finish 6', approach: 'N', epacCodes: [5125, 5521, 5521, 5522, 5523, 5524], offsets: [0.0094, 0.0067, 0.0059, 0.0054, 0.0052, 0.0052], registers: [1, 2, 3, 4, 5, 6], feed: [0, 0, 0, 0, 0, 0], ra: '6 +1' },
      ],
    },
  ],
};

/** Block 39: 0.012" AL - Fast Finish */
const MAKINO_SP_BLOCK_39: MakinoSPBlock = {
  headerNum: 39,
  type: 'BS',
  wireDiameter: '0.012',
  material: 'AL',
  method: 'Fast Finish',
  recordCount: 27,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4033], offsets: [0.0078], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4043], offsets: [0.0081], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4053], offsets: [0.0082], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4063], offsets: [0.0083], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4073], offsets: [0.0084], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4083], offsets: [0.0086], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4093], offsets: [0.0087], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4103], offsets: [0.0089], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4113], offsets: [0.009], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4123], offsets: [0.0091], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4133], offsets: [0.0093], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4143], offsets: [0.0094], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4153], offsets: [0.0095], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4163], offsets: [0.0096], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4173], offsets: [0.0098], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 16,
      thicknessInch: 4.5,
      thicknessMm: 114.3,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4183], offsets: [0.0099], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 17,
      thicknessInch: 5,
      thicknessMm: 127,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4193], offsets: [0.0101], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 18,
      thicknessInch: 5.5,
      thicknessMm: 139.7,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4203], offsets: [0.0104], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 19,
      thicknessInch: 6,
      thicknessMm: 152.4,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4213], offsets: [0.0107], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 20,
      thicknessInch: 6.5,
      thicknessMm: 165.1,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4223], offsets: [0.0109], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 21,
      thicknessInch: 7,
      thicknessMm: 177.8,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4233], offsets: [0.0112], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 22,
      thicknessInch: 7.5,
      thicknessMm: 190.5,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4243], offsets: [0.0117], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 23,
      thicknessInch: 8,
      thicknessMm: 203.2,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4253], offsets: [0.0117], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 24,
      thicknessInch: 9,
      thicknessMm: 228.6,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4263], offsets: [0.0118], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 25,
      thicknessInch: 10,
      thicknessMm: 254,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4273], offsets: [0.0121], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 26,
      thicknessInch: 11,
      thicknessMm: 279.4,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4283], offsets: [0.0123], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 27,
      thicknessInch: 12,
      thicknessMm: 304.8,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [4293], offsets: [0.0125], registers: [1], feed: [0], ra: '106' },
      ],
    },
  ],
};

/** Block 40: 0.012" Cu - Fast Finish */
const MAKINO_SP_BLOCK_40: MakinoSPBlock = {
  headerNum: 40,
  type: 'BS',
  wireDiameter: '0.012',
  material: 'Cu',
  method: 'Fast Finish',
  recordCount: 15,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7033], offsets: [0.0084], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7043], offsets: [0.0087], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7053], offsets: [0.0089], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7063], offsets: [0.009], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7073], offsets: [0.0091], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7083], offsets: [0.0092], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7093], offsets: [0.0094], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7103], offsets: [0.0096], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7113], offsets: [0.0098], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7123], offsets: [0.0098], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7133], offsets: [0.0098], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7143], offsets: [0.0099], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7153], offsets: [0.01], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7163], offsets: [0.0101], registers: [1], feed: [0], ra: '120' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [7173], offsets: [0.0102], registers: [1], feed: [0], ra: '120' },
      ],
    },
  ],
};

/** Block 41: 0.012" St - Both Away */
const MAKINO_SP_BLOCK_41: MakinoSPBlock = {
  headerNum: 41,
  type: 'BS',
  wireDiameter: '0.012',
  material: 'St',
  method: 'Both Away',
  recordCount: 20,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.25,
      thicknessMm: 6.35,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1026], offsets: [0.0075], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1026, 2422], offsets: [0.0086, 0.0063], registers: [1, 2], feed: [0, 0], ra: '51' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1026, 2422, 2423], offsets: [0.009, 0.0067, 0.0064], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1026, 2422, 2422, 2423], offsets: [0.0098, 0.0075, 0.0067, 0.0064], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1036], offsets: [0.0078], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1036, 2432], offsets: [0.009, 0.0063], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1036, 2432, 2433], offsets: [0.0094, 0.0067, 0.0064], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1036, 2432, 2432, 2433], offsets: [0.0102, 0.0075, 0.0067, 0.0064], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1046], offsets: [0.008], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1046, 2442], offsets: [0.0093, 0.0063], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1046, 2442, 2443], offsets: [0.0096, 0.0066, 0.0064], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1046, 2442, 2442, 2443], offsets: [0.0103, 0.0074, 0.0066, 0.0064], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1056], offsets: [0.0082], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1056, 2452], offsets: [0.0094, 0.0064], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [1056, 2452, 2453], offsets: [0.0098, 0.0067, 0.0064], registers: [1, 2, 3], feed: [0, 0, 0], ra: '22' },
        { passNum: 4, label: '+1 Finish 25', approach: 'N', epacCodes: [1056, 2452, 2452, 2453], offsets: [0.0105, 0.0075, 0.0067, 0.0064], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '22 +1' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1066], offsets: [0.0084], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1066, 2462], offsets: [0.0095, 0.0063], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [1066, 2462, 2463], offsets: [0.0099, 0.0067, 0.0064], registers: [1, 2, 3], feed: [0, 0, 0], ra: '22' },
        { passNum: 4, label: '+1 Finish 25', approach: 'N', epacCodes: [1066, 2462, 2462, 2463], offsets: [0.0107, 0.0075, 0.0067, 0.0064], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '22 +1' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1076], offsets: [0.0085], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1076, 2472], offsets: [0.0096, 0.0063], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [1076, 2472, 2473], offsets: [0.01, 0.0067, 0.0064], registers: [1, 2, 3], feed: [0, 0, 0], ra: '22' },
        { passNum: 4, label: '+1 Finish 25', approach: 'N', epacCodes: [1076, 2472, 2472, 2473], offsets: [0.0107, 0.0075, 0.0067, 0.0064], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '22 +1' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1086], offsets: [0.0086], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1086, 2482], offsets: [0.0098, 0.0064], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [1086, 2482, 2483], offsets: [0.0101, 0.0067, 0.0064], registers: [1, 2, 3], feed: [0, 0, 0], ra: '22' },
        { passNum: 4, label: '+1 Finish 25', approach: 'N', epacCodes: [1086, 2482, 2482, 2483], offsets: [0.0109, 0.0075, 0.0067, 0.0064], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '22 +1' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1096], offsets: [0.0088], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1096, 2492], offsets: [0.01, 0.0064], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [1096, 2492, 2493], offsets: [0.0103, 0.0067, 0.0064], registers: [1, 2, 3], feed: [0, 0, 0], ra: '22' },
        { passNum: 4, label: '+1 Finish 25', approach: 'N', epacCodes: [1096, 2492, 2492, 2493], offsets: [0.0111, 0.0074, 0.0067, 0.0064], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '22 +1' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1106], offsets: [0.0089], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1106, 2502], offsets: [0.0101, 0.0064], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [1106, 2502, 2503], offsets: [0.0104, 0.0067, 0.0064], registers: [1, 2, 3], feed: [0, 0, 0], ra: '22' },
        { passNum: 4, label: '+1 Finish 25', approach: 'N', epacCodes: [1106, 2502, 2502, 2503], offsets: [0.0112, 0.0075, 0.0067, 0.0064], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '22 +1' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1116], offsets: [0.009], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1116, 2512], offsets: [0.0102, 0.0064], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [1116, 2512, 2513], offsets: [0.0105, 0.0067, 0.0064], registers: [1, 2, 3], feed: [0, 0, 0], ra: '22' },
        { passNum: 4, label: '+1 Finish 25', approach: 'N', epacCodes: [1116, 2512, 2512, 2513], offsets: [0.0113, 0.0075, 0.0067, 0.0064], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '22 +1' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1126], offsets: [0.0091], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1126, 2522], offsets: [0.0103, 0.0064], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [1126, 2522, 2523], offsets: [0.0106, 0.0067, 0.0065], registers: [1, 2, 3], feed: [0, 0, 0], ra: '22' },
        { passNum: 4, label: '+1 Finish 25', approach: 'N', epacCodes: [1126, 2522, 2522, 2523], offsets: [0.0114, 0.0075, 0.0067, 0.0065], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '22 +1' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1136], offsets: [0.0091], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1136, 2532], offsets: [0.0103, 0.0064], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [1136, 2532, 2533], offsets: [0.0106, 0.0067, 0.0065], registers: [1, 2, 3], feed: [0, 0, 0], ra: '22' },
        { passNum: 4, label: '+1 Finish 25', approach: 'N', epacCodes: [1136, 2532, 2532, 2533], offsets: [0.0114, 0.0075, 0.0067, 0.0065], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '22 +1' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1146], offsets: [0.0092], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1146, 2542], offsets: [0.0104, 0.0064], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 25', approach: 'N', epacCodes: [1146, 2542, 2543], offsets: [0.0107, 0.0068, 0.0065], registers: [1, 2, 3], feed: [0, 0, 0], ra: '22' },
        { passNum: 4, label: '+1 Finish 25', approach: 'N', epacCodes: [1146, 2542, 2542, 2543], offsets: [0.0115, 0.0075, 0.0068, 0.0065], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '22 +1' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1156], offsets: [0.0094], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1156, 2552], offsets: [0.0104, 0.0065], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1166], offsets: [0.0095], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1166, 2562], offsets: [0.0105, 0.0065], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 16,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1176], offsets: [0.0096], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1176, 2572], offsets: [0.0105, 0.0065], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 17,
      thicknessInch: 4.5,
      thicknessMm: 114.3,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1186], offsets: [0.0097], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1186, 2582], offsets: [0.0107, 0.0067], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 18,
      thicknessInch: 5,
      thicknessMm: 127,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1196], offsets: [0.0098], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1196, 2592], offsets: [0.0108, 0.0068], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 19,
      thicknessInch: 5.5,
      thicknessMm: 139.7,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1206], offsets: [0.0098], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1206, 2602], offsets: [0.0108, 0.0067], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 20,
      thicknessInch: 6,
      thicknessMm: 152.4,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1216], offsets: [0.0098], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1216, 2612], offsets: [0.0107, 0.0067], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
  ],
};

/** Block 42: 0.012" St - Fast Finish */
const MAKINO_SP_BLOCK_42: MakinoSPBlock = {
  headerNum: 42,
  type: 'BS',
  wireDiameter: '0.012',
  material: 'St',
  method: 'Fast Finish',
  recordCount: 26,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1043], offsets: [0.0078], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1043, 1444], offsets: [0.009, 0.0064], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1043, 1444, 1445], offsets: [0.0092, 0.0067, 0.0063], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1043, 1444, 1444, 1445], offsets: [0.01, 0.0075, 0.0067, 0.0063], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1053], offsets: [0.0079], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1053, 1454], offsets: [0.0089, 0.0063], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1053, 1454, 1455], offsets: [0.0093, 0.0067, 0.0063], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1053, 1454, 1454, 1455], offsets: [0.0101, 0.0075, 0.0067, 0.0063], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1063], offsets: [0.008], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1063, 1464], offsets: [0.0089, 0.0063], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1063, 1464, 1465], offsets: [0.0093, 0.0067, 0.0063], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1063, 1464, 1464, 1465], offsets: [0.0101, 0.0075, 0.0067, 0.0063], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1073], offsets: [0.0081], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1073, 1474], offsets: [0.0091, 0.0064], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1073, 1474, 1475], offsets: [0.0094, 0.0067, 0.0064], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1073, 1474, 1474, 1475], offsets: [0.0102, 0.0075, 0.0067, 0.0064], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1083], offsets: [0.0081], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1083, 1484], offsets: [0.0091, 0.0064], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1083, 1484, 1485], offsets: [0.0094, 0.0067, 0.0064], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1083, 1484, 1484, 1485], offsets: [0.0102, 0.0075, 0.0067, 0.0064], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1093], offsets: [0.0082], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1093, 1494], offsets: [0.0091, 0.0064], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1093, 1494, 1495], offsets: [0.0094, 0.0067, 0.0064], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1093, 1494, 1494, 1495], offsets: [0.0102, 0.0075, 0.0067, 0.0064], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1103], offsets: [0.0084], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1103, 1504], offsets: [0.0093, 0.0064], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1103, 1504, 1505], offsets: [0.0096, 0.0067, 0.0064], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1103, 1504, 1504, 1505], offsets: [0.0104, 0.0075, 0.0067, 0.0064], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1113], offsets: [0.0085], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1113, 1514], offsets: [0.0094, 0.0064], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1113, 1514, 1515], offsets: [0.0098, 0.0068, 0.0064], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1113, 1514, 1514, 1515], offsets: [0.0106, 0.0076, 0.0068, 0.0064], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1123], offsets: [0.0087], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1123, 1524], offsets: [0.0096, 0.0065], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1123, 1524, 1525], offsets: [0.01, 0.0068, 0.0065], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1123, 1524, 1524, 1525], offsets: [0.0107, 0.0076, 0.0068, 0.0065], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1133], offsets: [0.0089], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1133, 1534], offsets: [0.0098, 0.0065], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1133, 1534, 1535], offsets: [0.0102, 0.0069, 0.0066], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1133, 1534, 1534, 1535], offsets: [0.011, 0.0077, 0.0069, 0.0066], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1143], offsets: [0.009], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1143, 1544], offsets: [0.01, 0.0066], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1143, 1544, 1545], offsets: [0.0103, 0.0069, 0.0066], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1143, 1544, 1544, 1545], offsets: [0.0111, 0.0077, 0.0069, 0.0066], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1153], offsets: [0.0091], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1153, 1554], offsets: [0.0101, 0.0066], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1153, 1554, 1555], offsets: [0.0104, 0.0069, 0.0066], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1153, 1554, 1554, 1555], offsets: [0.0112, 0.0077, 0.0069, 0.0066], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1163], offsets: [0.0093], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1163, 1564], offsets: [0.0101, 0.0066], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1163, 1564, 1565], offsets: [0.0105, 0.007, 0.0067], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1163, 1564, 1564, 1565], offsets: [0.0113, 0.0078, 0.007, 0.0067], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1173], offsets: [0.0094], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1173, 1574], offsets: [0.0102, 0.0066], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1173, 1574, 1575], offsets: [0.0106, 0.007, 0.0067], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1173, 1574, 1574, 1575], offsets: [0.0113, 0.0077, 0.007, 0.0067], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 4.5,
      thicknessMm: 114.3,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1183], offsets: [0.0095], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1183, 1584], offsets: [0.0102, 0.0066], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 20', approach: 'N', epacCodes: [1183, 1584, 1585], offsets: [0.0106, 0.0069, 0.0067], registers: [1, 2, 3], feed: [0, 0, 0], ra: '20' },
        { passNum: 4, label: '+1 Finish 20', approach: 'N', epacCodes: [1183, 1584, 1584, 1585], offsets: [0.0112, 0.0075, 0.0069, 0.0067], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '20 +1' },
      ],
    },
    {
      recordNum: 16,
      thicknessInch: 5,
      thicknessMm: 127,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1193], offsets: [0.0097], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1193, 1594], offsets: [0.0102, 0.0065], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [1193, 1594, 1595], offsets: [0.0106, 0.0069, 0.0066], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: '+1 Finish 30', approach: 'N', epacCodes: [1193, 1594, 1594, 1595], offsets: [0.0111, 0.0074, 0.0069, 0.0066], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '31 +1' },
      ],
    },
    {
      recordNum: 17,
      thicknessInch: 5.5,
      thicknessMm: 139.7,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1203], offsets: [0.0101], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1203, 1604], offsets: [0.0105, 0.0065], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [1203, 1604, 1605], offsets: [0.0109, 0.0068, 0.0066], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: '+1 Finish 30', approach: 'N', epacCodes: [1203, 1604, 1604, 1605], offsets: [0.0114, 0.0074, 0.0068, 0.0066], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '31 +1' },
      ],
    },
    {
      recordNum: 18,
      thicknessInch: 6,
      thicknessMm: 152.4,
      taper: '0',
      totalPasses: 4,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1213], offsets: [0.0106], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1213, 1614], offsets: [0.0108, 0.0065], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [1213, 1614, 1615], offsets: [0.0111, 0.0068, 0.0066], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
        { passNum: 4, label: '+1 Finish 30', approach: 'N', epacCodes: [1213, 1614, 1614, 1615], offsets: [0.0118, 0.0075, 0.0068, 0.0066], registers: [1, 2, 3, 4], feed: [0, 0, 0, 0], ra: '31 +1' },
      ],
    },
    {
      recordNum: 19,
      thicknessInch: 6.5,
      thicknessMm: 165.1,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1223], offsets: [0.0107], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [1223, 1624], offsets: [0.0111, 0.0066], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 30', approach: 'N', epacCodes: [1223, 1624, 1625], offsets: [0.0114, 0.0069, 0.0066], registers: [1, 2, 3], feed: [0, 0, 0], ra: '31' },
      ],
    },
    {
      recordNum: 20,
      thicknessInch: 7,
      thicknessMm: 177.8,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1233], offsets: [0.0108], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1233, 1634], offsets: [0.0113, 0.0066], registers: [1, 2], feed: [0, 0], ra: '80' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1233, 1634, 1635], offsets: [0.0116, 0.007, 0.0066], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 21,
      thicknessInch: 7.5,
      thicknessMm: 190.5,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1243], offsets: [0.0111], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1243, 1644], offsets: [0.0118, 0.0067], registers: [1, 2], feed: [0, 0], ra: '80' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1243, 1644, 1645], offsets: [0.0121, 0.0071, 0.0067], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 22,
      thicknessInch: 8,
      thicknessMm: 203.2,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1253], offsets: [0.0111], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1253, 1654], offsets: [0.0118, 0.0068], registers: [1, 2], feed: [0, 0], ra: '80' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1253, 1654, 1655], offsets: [0.0121, 0.0071, 0.0067], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 23,
      thicknessInch: 9,
      thicknessMm: 228.6,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1263], offsets: [0.0112], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1263, 1664], offsets: [0.0119, 0.0067], registers: [1, 2], feed: [0, 0], ra: '80' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1263, 1664, 1665], offsets: [0.0123, 0.0071, 0.0067], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 24,
      thicknessInch: 10,
      thicknessMm: 254,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1273], offsets: [0.0113], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1273, 1674], offsets: [0.0122, 0.0068], registers: [1, 2], feed: [0, 0], ra: '80' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1273, 1674, 1675], offsets: [0.0125, 0.0071, 0.0067], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 25,
      thicknessInch: 11,
      thicknessMm: 279.4,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1283], offsets: [0.0116], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1283, 1684], offsets: [0.0128, 0.0073], registers: [1, 2], feed: [0, 0], ra: '80' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1283, 1684, 1685], offsets: [0.0131, 0.0076, 0.007], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 26,
      thicknessInch: 12,
      thicknessMm: 304.8,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1293], offsets: [0.0117], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1293, 1694], offsets: [0.0133, 0.0076], registers: [1, 2], feed: [0, 0], ra: '80' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1293, 1694, 1695], offsets: [0.0136, 0.008, 0.0073], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
  ],
};

/** Block 43: 0.012" St - High Speed 1.2 */
const MAKINO_SP_BLOCK_43: MakinoSPBlock = {
  headerNum: 43,
  type: 'BS',
  wireDiameter: '0.012',
  material: 'St',
  method: 'High Speed 1.2',
  recordCount: 24,
  records: [
    {
      recordNum: 1,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1062], offsets: [0.0077], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1062, 1462], offsets: [0.0086, 0.0064], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1062, 1462, 1463], offsets: [0.0091, 0.0068, 0.0063], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1072], offsets: [0.0078], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1072, 1472], offsets: [0.0088, 0.0064], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1072, 1472, 1473], offsets: [0.0093, 0.0069, 0.0063], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1082], offsets: [0.0078], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1082, 1482], offsets: [0.0088, 0.0064], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1082, 1482, 1483], offsets: [0.0093, 0.0068, 0.0062], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1092], offsets: [0.0079], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1092, 1492], offsets: [0.0088, 0.0064], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1092, 1492, 1493], offsets: [0.0092, 0.0068, 0.0062], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1102], offsets: [0.0079], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1102, 1502], offsets: [0.0089, 0.0064], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1102, 1502, 1503], offsets: [0.0093, 0.0068, 0.0062], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1112], offsets: [0.008], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1112, 1512], offsets: [0.0089, 0.0064], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1112, 1512, 1513], offsets: [0.0093, 0.0068, 0.0062], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1122], offsets: [0.008], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1122, 1522], offsets: [0.0089, 0.0064], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1122, 1522, 1523], offsets: [0.0093, 0.0068, 0.0062], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1132], offsets: [0.008], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1132, 1532], offsets: [0.0089, 0.0064], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1132, 1532, 1533], offsets: [0.0093, 0.0068, 0.0062], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1142], offsets: [0.008], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1142, 1542], offsets: [0.009, 0.0064], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1142, 1542, 1543], offsets: [0.0094, 0.0068, 0.0062], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1152], offsets: [0.0082], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1152, 1552], offsets: [0.0091, 0.0064], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1152, 1552, 1553], offsets: [0.0095, 0.0068, 0.0062], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1162], offsets: [0.0083], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1162, 1562], offsets: [0.0092, 0.0064], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1162, 1562, 1563], offsets: [0.0096, 0.0068, 0.0062], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1172], offsets: [0.0084], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1172, 1572], offsets: [0.0094, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1172, 1572, 1573], offsets: [0.0098, 0.0067, 0.0062], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 4.5,
      thicknessMm: 114.3,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1182], offsets: [0.0086], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1182, 1582], offsets: [0.0096, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1182, 1582, 1583], offsets: [0.0099, 0.0067, 0.0062], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 5,
      thicknessMm: 127,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1192], offsets: [0.0089], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1192, 1592], offsets: [0.0097, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1192, 1592, 1593], offsets: [0.0101, 0.0066, 0.0062], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 5.5,
      thicknessMm: 139.7,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1202], offsets: [0.009], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1202, 1602], offsets: [0.0099, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1202, 1602, 1603], offsets: [0.0103, 0.0067, 0.0062], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 16,
      thicknessInch: 6,
      thicknessMm: 152.4,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1212], offsets: [0.0092], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1212, 1612], offsets: [0.0101, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1212, 1612, 1613], offsets: [0.0105, 0.0067, 0.0062], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 17,
      thicknessInch: 6.5,
      thicknessMm: 165.1,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1222], offsets: [0.0094], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1222, 1622], offsets: [0.0104, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [1222, 1622, 1623], offsets: [0.0107, 0.0067, 0.0062], registers: [1, 2, 3], feed: [0, 0, 0], ra: '33' },
      ],
    },
    {
      recordNum: 18,
      thicknessInch: 7,
      thicknessMm: 177.8,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1232], offsets: [0.0097], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1232, 1632], offsets: [0.0106, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 40', approach: 'N', epacCodes: [1232, 1632, 1633], offsets: [0.011, 0.0067, 0.0062], registers: [1, 2, 3], feed: [0, 0, 0], ra: '44' },
      ],
    },
    {
      recordNum: 19,
      thicknessInch: 7.5,
      thicknessMm: 190.5,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1242], offsets: [0.0101], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1242, 1642], offsets: [0.0111, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 40', approach: 'N', epacCodes: [1242, 1642, 1643], offsets: [0.0114, 0.0067, 0.0062], registers: [1, 2, 3], feed: [0, 0, 0], ra: '44' },
      ],
    },
    {
      recordNum: 20,
      thicknessInch: 8,
      thicknessMm: 203.2,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1252], offsets: [0.0101], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1252, 1652], offsets: [0.0111, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 40', approach: 'N', epacCodes: [1252, 1652, 1653], offsets: [0.0114, 0.0067, 0.0062], registers: [1, 2, 3], feed: [0, 0, 0], ra: '44' },
      ],
    },
    {
      recordNum: 21,
      thicknessInch: 9,
      thicknessMm: 228.6,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1262], offsets: [0.0102], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1262, 1662], offsets: [0.0112, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 40', approach: 'N', epacCodes: [1262, 1662, 1663], offsets: [0.0115, 0.0067, 0.0062], registers: [1, 2, 3], feed: [0, 0, 0], ra: '44' },
      ],
    },
    {
      recordNum: 22,
      thicknessInch: 10,
      thicknessMm: 254,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1272], offsets: [0.0102], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1272, 1672], offsets: [0.0113, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 40', approach: 'N', epacCodes: [1272, 1672, 1673], offsets: [0.0116, 0.0067, 0.0062], registers: [1, 2, 3], feed: [0, 0, 0], ra: '44' },
      ],
    },
    {
      recordNum: 23,
      thicknessInch: 11,
      thicknessMm: 279.4,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1282], offsets: [0.0104], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1282, 1682], offsets: [0.0114, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 40', approach: 'N', epacCodes: [1282, 1682, 1683], offsets: [0.0117, 0.0067, 0.0062], registers: [1, 2, 3], feed: [0, 0, 0], ra: '44' },
      ],
    },
    {
      recordNum: 24,
      thicknessInch: 12,
      thicknessMm: 304.8,
      taper: '0',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1292], offsets: [0.0105], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1292, 1692], offsets: [0.0114, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
        { passNum: 3, label: 'Finish 40', approach: 'N', epacCodes: [1292, 1692, 1693], offsets: [0.0118, 0.0067, 0.0062], registers: [1, 2, 3], feed: [0, 0, 0], ra: '44' },
      ],
    },
  ],
};

/** Block 44: 0.012" St - High Speed 1.6 */
const MAKINO_SP_BLOCK_44: MakinoSPBlock = {
  headerNum: 44,
  type: 'BS',
  wireDiameter: '0.012',
  material: 'St',
  method: 'High Speed 1.6',
  recordCount: 21,
  records: [
    {
      recordNum: 1,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1091], offsets: [0.008], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1091, 1492], offsets: [0.0089, 0.0064], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1101], offsets: [0.0079], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1101, 1502], offsets: [0.0089, 0.0064], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1111], offsets: [0.008], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1111, 1512], offsets: [0.0089, 0.0064], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1121], offsets: [0.008], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1121, 1522], offsets: [0.009, 0.0064], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1131], offsets: [0.0081], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1131, 1532], offsets: [0.009, 0.0064], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1141], offsets: [0.0081], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1141, 1542], offsets: [0.0091, 0.0064], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1151], offsets: [0.0082], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1151, 1552], offsets: [0.0091, 0.0064], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1161], offsets: [0.0083], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1161, 1562], offsets: [0.0092, 0.0064], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1171], offsets: [0.0084], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1171, 1572], offsets: [0.0093, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 4.5,
      thicknessMm: 114.3,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1181], offsets: [0.0086], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1181, 1582], offsets: [0.0095, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 5,
      thicknessMm: 127,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1191], offsets: [0.0089], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1191, 1592], offsets: [0.0098, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 5.5,
      thicknessMm: 139.7,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1201], offsets: [0.009], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1201, 1602], offsets: [0.0099, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 6,
      thicknessMm: 152.4,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1211], offsets: [0.0091], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1211, 1612], offsets: [0.01, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 6.5,
      thicknessMm: 165.1,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1221], offsets: [0.0094], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1221, 1622], offsets: [0.0103, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 7,
      thicknessMm: 177.8,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1231], offsets: [0.0096], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1231, 1632], offsets: [0.0106, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 16,
      thicknessInch: 7.5,
      thicknessMm: 190.5,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1241], offsets: [0.0101], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1241, 1642], offsets: [0.011, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 17,
      thicknessInch: 8,
      thicknessMm: 203.2,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1251], offsets: [0.0101], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1251, 1652], offsets: [0.011, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 18,
      thicknessInch: 9,
      thicknessMm: 228.6,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1261], offsets: [0.0102], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1261, 1662], offsets: [0.0111, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 19,
      thicknessInch: 10,
      thicknessMm: 254,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1271], offsets: [0.0102], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1271, 1672], offsets: [0.0112, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 20,
      thicknessInch: 11,
      thicknessMm: 279.4,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1281], offsets: [0.0104], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1281, 1682], offsets: [0.0113, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
    {
      recordNum: 21,
      thicknessInch: 12,
      thicknessMm: 304.8,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1291], offsets: [0.0105], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [1291, 1692], offsets: [0.0114, 0.0063], registers: [1, 2], feed: [0, 0], ra: '74' },
      ],
    },
  ],
};

/** Block 45: 0.01" St - HS Both Away */
const MAKINO_SP_BLOCK_45: MakinoSPBlock = {
  headerNum: 45,
  type: 'BS',
  wireDiameter: '0.01',
  material: 'St',
  method: 'HS Both Away',
  recordCount: 25,
  records: [
    {
      recordNum: 1,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2054], offsets: [0.0064], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2054, 1456], offsets: [0.0075, 0.005], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2064], offsets: [0.0064], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2064, 1466], offsets: [0.0076, 0.005], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2074], offsets: [0.0065], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2074, 1476], offsets: [0.0077, 0.0051], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2084], offsets: [0.0065], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2084, 1486], offsets: [0.0078, 0.0051], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2094], offsets: [0.0066], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2094, 1496], offsets: [0.0079, 0.0051], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2104], offsets: [0.0067], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2104, 1506], offsets: [0.0079, 0.0051], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2114], offsets: [0.0068], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2114, 1516], offsets: [0.0079, 0.0051], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2124], offsets: [0.0068], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2124, 1526], offsets: [0.0079, 0.0052], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2134], offsets: [0.0069], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2134, 1536], offsets: [0.008, 0.0052], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2144], offsets: [0.0069], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2144, 1546], offsets: [0.008, 0.0052], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2154], offsets: [0.007], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2154, 1556], offsets: [0.008, 0.0052], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2164], offsets: [0.007], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2164, 1566], offsets: [0.0081, 0.0052], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2174], offsets: [0.0071], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2174, 1576], offsets: [0.0081, 0.0052], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 4.5,
      thicknessMm: 114.3,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2184], offsets: [0.0071], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2184, 1586], offsets: [0.0081, 0.0052], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 5,
      thicknessMm: 127,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2194], offsets: [0.0072], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2194, 1596], offsets: [0.0081, 0.0052], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 16,
      thicknessInch: 5.5,
      thicknessMm: 139.7,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2204], offsets: [0.0072], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2204, 1606], offsets: [0.0081, 0.0052], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 17,
      thicknessInch: 6,
      thicknessMm: 152.4,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2214], offsets: [0.0073], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2214, 1616], offsets: [0.0082, 0.0052], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 18,
      thicknessInch: 6.5,
      thicknessMm: 165.1,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2224], offsets: [0.0073], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2224, 1626], offsets: [0.0082, 0.0052], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 19,
      thicknessInch: 7,
      thicknessMm: 177.8,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2234], offsets: [0.0073], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2234, 1636], offsets: [0.0082, 0.0052], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 20,
      thicknessInch: 7.5,
      thicknessMm: 190.5,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2244], offsets: [0.0074], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2244, 1646], offsets: [0.0083, 0.0052], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 21,
      thicknessInch: 8,
      thicknessMm: 203.2,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2254], offsets: [0.0074], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2254, 1656], offsets: [0.0083, 0.0052], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 22,
      thicknessInch: 9,
      thicknessMm: 228.6,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2264], offsets: [0.0074], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2264, 1666], offsets: [0.0084, 0.0053], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 23,
      thicknessInch: 10,
      thicknessMm: 254,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2274], offsets: [0.0075], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2274, 1676], offsets: [0.0085, 0.0053], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 24,
      thicknessInch: 11,
      thicknessMm: 279.4,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2284], offsets: [0.0077], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2284, 1686], offsets: [0.0086, 0.0054], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 25,
      thicknessInch: 12,
      thicknessMm: 304.8,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2294], offsets: [0.0079], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2294, 1696], offsets: [0.0087, 0.0054], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
  ],
};

/** Block 46: 0.012" St - HS Both Away */
const MAKINO_SP_BLOCK_46: MakinoSPBlock = {
  headerNum: 46,
  type: 'BS',
  wireDiameter: '0.012',
  material: 'St',
  method: 'HS Both Away',
  recordCount: 25,
  records: [
    {
      recordNum: 1,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2054], offsets: [0.008], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2054, 1456], offsets: [0.009, 0.0062], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2064], offsets: [0.0081], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2064, 1466], offsets: [0.009, 0.0062], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2074], offsets: [0.0081], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2074, 1476], offsets: [0.0091, 0.0062], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2084], offsets: [0.0082], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2084, 1486], offsets: [0.0092, 0.0062], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2094], offsets: [0.0082], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2094, 1496], offsets: [0.0093, 0.0062], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2104], offsets: [0.0083], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2104, 1506], offsets: [0.0094, 0.0062], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2114], offsets: [0.0083], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2114, 1516], offsets: [0.0094, 0.0062], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2124], offsets: [0.0084], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2124, 1526], offsets: [0.0095, 0.0062], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2134], offsets: [0.0085], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2134, 1536], offsets: [0.0095, 0.0062], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2144], offsets: [0.0085], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2144, 1546], offsets: [0.0095, 0.0062], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2154], offsets: [0.0085], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2154, 1556], offsets: [0.0096, 0.0062], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2164], offsets: [0.0086], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2164, 1566], offsets: [0.0097, 0.0062], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2174], offsets: [0.0086], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2174, 1576], offsets: [0.0097, 0.0062], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 4.5,
      thicknessMm: 114.3,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2184], offsets: [0.0086], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2184, 1586], offsets: [0.0097, 0.0062], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 5,
      thicknessMm: 127,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2194], offsets: [0.0086], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2194, 1596], offsets: [0.0097, 0.0062], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 16,
      thicknessInch: 5.5,
      thicknessMm: 139.7,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2204], offsets: [0.0087], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2204, 1606], offsets: [0.0098, 0.0062], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 17,
      thicknessInch: 6,
      thicknessMm: 152.4,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2214], offsets: [0.0089], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2214, 1616], offsets: [0.0099, 0.0062], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 18,
      thicknessInch: 6.5,
      thicknessMm: 165.1,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2224], offsets: [0.0091], registers: [1], feed: [0], ra: '120' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2224, 1626], offsets: [0.01, 0.0063], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 19,
      thicknessInch: 7,
      thicknessMm: 177.8,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2234], offsets: [0.0093], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2234, 1636], offsets: [0.0101, 0.0064], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 20,
      thicknessInch: 7.5,
      thicknessMm: 190.5,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2244], offsets: [0.0095], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2244, 1646], offsets: [0.0102, 0.0064], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 21,
      thicknessInch: 8,
      thicknessMm: 203.2,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2254], offsets: [0.0096], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2254, 1656], offsets: [0.0103, 0.0065], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 22,
      thicknessInch: 9,
      thicknessMm: 228.6,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2264], offsets: [0.0097], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2264, 1666], offsets: [0.0105, 0.0065], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 23,
      thicknessInch: 10,
      thicknessMm: 254,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2274], offsets: [0.0098], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2274, 1676], offsets: [0.0106, 0.0065], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 24,
      thicknessInch: 11,
      thicknessMm: 279.4,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2284], offsets: [0.0099], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2284, 1686], offsets: [0.0107, 0.0066], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
    {
      recordNum: 25,
      thicknessInch: 12,
      thicknessMm: 304.8,
      taper: '0',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2294], offsets: [0.01], registers: [1], feed: [0], ra: '125' },
        { passNum: 2, label: '2nd 80uinRa', approach: 'N', epacCodes: [2294, 1696], offsets: [0.0108, 0.0066], registers: [1, 2], feed: [0, 0], ra: '80' },
      ],
    },
  ],
};

/** Block 47: 0.012" St - Booster 1.6 */
const MAKINO_SP_BLOCK_47: MakinoSPBlock = {
  headerNum: 47,
  type: 'HS',
  wireDiameter: '0.012',
  material: 'St',
  method: 'Booster 1.6',
  recordCount: 13,
  records: [
    {
      recordNum: 1,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2075], offsets: [0.0085], registers: [1], feed: [0], ra: '125' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2085], offsets: [0.0086], registers: [1], feed: [0], ra: '125' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2095], offsets: [0.0086], registers: [1], feed: [0], ra: '125' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2105], offsets: [0.0088], registers: [1], feed: [0], ra: '125' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2115], offsets: [0.0089], registers: [1], feed: [0], ra: '125' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2125], offsets: [0.009], registers: [1], feed: [0], ra: '125' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2135], offsets: [0.0091], registers: [1], feed: [0], ra: '125' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2145], offsets: [0.0092], registers: [1], feed: [0], ra: '125' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2155], offsets: [0.0093], registers: [1], feed: [0], ra: '125' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2165], offsets: [0.0094], registers: [1], feed: [0], ra: '125' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2175], offsets: [0.0094], registers: [1], feed: [0], ra: '125' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 4.5,
      thicknessMm: 114.3,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2185], offsets: [0.0095], registers: [1], feed: [0], ra: '125' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 5,
      thicknessMm: 127,
      taper: '0',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [2195], offsets: [0.0093], registers: [1], feed: [0], ra: '125' },
      ],
    },
  ],
};

/** Block 48: 0.008" St - 10Deg. Taper */
const MAKINO_SP_BLOCK_48: MakinoSPBlock = {
  headerNum: 48,
  type: 'T',
  wireDiameter: '0.008',
  material: 'St',
  method: '10Deg. Taper',
  recordCount: 15,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3031], offsets: [0.0052], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3031, 3432], offsets: [0.007, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3031, 3432, 3433], offsets: [0.0075, 0.005, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3041], offsets: [0.0053], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3041, 3442], offsets: [0.0071, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3041, 3442, 3443], offsets: [0.0076, 0.005, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3051], offsets: [0.0054], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3051, 3452], offsets: [0.0072, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3051, 3452, 3453], offsets: [0.0077, 0.005, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3061], offsets: [0.0054], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3061, 3462], offsets: [0.0072, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3061, 3462, 3463], offsets: [0.0077, 0.005, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3071], offsets: [0.0055], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3071, 3472], offsets: [0.0073, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3071, 3472, 3473], offsets: [0.0078, 0.0051, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3081], offsets: [0.0055], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3081, 3482], offsets: [0.0073, 0.0046], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3081, 3482, 3483], offsets: [0.0078, 0.0051, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3091], offsets: [0.0056], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3091, 3492], offsets: [0.0074, 0.0046], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3091, 3492, 3493], offsets: [0.0079, 0.0051, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3101], offsets: [0.0056], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3101, 3502], offsets: [0.0074, 0.0046], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3101, 3502, 3503], offsets: [0.008, 0.0052, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3111], offsets: [0.0057], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3111, 3512], offsets: [0.0075, 0.0046], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3111, 3512, 3513], offsets: [0.0081, 0.0053, 0.0044], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3121], offsets: [0.0058], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3121, 3522], offsets: [0.0075, 0.0046], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3121, 3522, 3523], offsets: [0.0081, 0.0053, 0.0045], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3131], offsets: [0.0058], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3131, 3532], offsets: [0.0075, 0.0047], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3131, 3532, 3533], offsets: [0.0082, 0.0053, 0.0045], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3141], offsets: [0.0059], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3141, 3542], offsets: [0.0075, 0.0047], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3141, 3542, 3543], offsets: [0.0082, 0.0053, 0.0045], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3151], offsets: [0.0059], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3151, 3552], offsets: [0.0076, 0.0047], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3151, 3552, 3553], offsets: [0.0083, 0.0054, 0.0045], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3161], offsets: [0.0059], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3161, 3562], offsets: [0.0076, 0.0047], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3161, 3562, 3563], offsets: [0.0083, 0.0054, 0.0045], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3171], offsets: [0.006], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3171, 3572], offsets: [0.0077, 0.0047], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3171, 3572, 3573], offsets: [0.0084, 0.0054, 0.0045], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
  ],
};

/** Block 49: 0.008" St - 20Deg. Taper */
const MAKINO_SP_BLOCK_49: MakinoSPBlock = {
  headerNum: 49,
  type: 'T',
  wireDiameter: '0.008',
  material: 'St',
  method: '20Deg. Taper',
  recordCount: 15,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3032], offsets: [0.0052], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3032, 3431], offsets: [0.007, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3042], offsets: [0.0053], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3042, 3441], offsets: [0.0071, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3052], offsets: [0.0054], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3052, 3451], offsets: [0.0072, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3062], offsets: [0.0055], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3062, 3461], offsets: [0.0073, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3072], offsets: [0.0056], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3072, 3471], offsets: [0.0073, 0.0045], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3082], offsets: [0.0057], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3082, 3481], offsets: [0.0074, 0.0046], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3092], offsets: [0.0058], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3092, 3491], offsets: [0.0076, 0.0046], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3102], offsets: [0.0059], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3102, 3501], offsets: [0.0076, 0.0046], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3112], offsets: [0.0059], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3112, 3511], offsets: [0.0076, 0.0046], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3122], offsets: [0.006], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3122, 3521], offsets: [0.0077, 0.0046], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3132], offsets: [0.006], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3132, 3531], offsets: [0.0077, 0.0047], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3142], offsets: [0.0061], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3142, 3541], offsets: [0.0077, 0.0047], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3152], offsets: [0.0061], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3152, 3551], offsets: [0.0078, 0.0047], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3162], offsets: [0.0061], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3162, 3561], offsets: [0.0078, 0.0047], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3172], offsets: [0.0062], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3172, 3571], offsets: [0.0078, 0.0047], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
  ],
};

/** Block 50: 0.008" St - 30Deg. Taper */
const MAKINO_SP_BLOCK_50: MakinoSPBlock = {
  headerNum: 50,
  type: 'T',
  wireDiameter: '0.008',
  material: 'St',
  method: '30Deg. Taper',
  recordCount: 15,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3033], offsets: [0.0052], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3043], offsets: [0.0054], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3053], offsets: [0.0055], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3063], offsets: [0.0056], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3073], offsets: [0.0057], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3083], offsets: [0.0059], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3093], offsets: [0.006], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3103], offsets: [0.0061], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3113], offsets: [0.0062], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3123], offsets: [0.0063], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3133], offsets: [0.0063], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3143], offsets: [0.0064], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3153], offsets: [0.0064], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3163], offsets: [0.0065], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3173], offsets: [0.0065], registers: [1], feed: [0], ra: '106' },
      ],
    },
  ],
};

/** Block 51: 0.01" Cu - 30Deg. Taper */
const MAKINO_SP_BLOCK_51: MakinoSPBlock = {
  headerNum: 51,
  type: 'T',
  wireDiameter: '0.01',
  material: 'Cu',
  method: '30Deg. Taper',
  recordCount: 9,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [8033], offsets: [0.0073], registers: [1], feed: [0], ra: '96' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [8043], offsets: [0.0075], registers: [1], feed: [0], ra: '96' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [8053], offsets: [0.0077], registers: [1], feed: [0], ra: '96' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [8063], offsets: [0.0078], registers: [1], feed: [0], ra: '96' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [8073], offsets: [0.008], registers: [1], feed: [0], ra: '96' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [8083], offsets: [0.008], registers: [1], feed: [0], ra: '96' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [8093], offsets: [0.0081], registers: [1], feed: [0], ra: '96' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [8103], offsets: [0.0082], registers: [1], feed: [0], ra: '96' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [8113], offsets: [0.0082], registers: [1], feed: [0], ra: '96' },
      ],
    },
  ],
};

/** Block 52: 0.01" St - 10Deg. Taper */
const MAKINO_SP_BLOCK_52: MakinoSPBlock = {
  headerNum: 52,
  type: 'T',
  wireDiameter: '0.01',
  material: 'St',
  method: '10Deg. Taper',
  recordCount: 15,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3031], offsets: [0.0062], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3031, 3432], offsets: [0.0079, 0.0055], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3031, 3432, 3433], offsets: [0.0084, 0.006, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3041], offsets: [0.0064], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3041, 3442], offsets: [0.008, 0.0055], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3041, 3442, 3443], offsets: [0.0085, 0.006, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3051], offsets: [0.0064], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3051, 3452], offsets: [0.0081, 0.0055], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3051, 3452, 3453], offsets: [0.0086, 0.006, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3061], offsets: [0.0065], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3061, 3462], offsets: [0.0082, 0.0055], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3061, 3462, 3463], offsets: [0.0087, 0.006, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3071], offsets: [0.0066], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3071, 3472], offsets: [0.0083, 0.0055], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3071, 3472, 3473], offsets: [0.0088, 0.0061, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3081], offsets: [0.0067], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3081, 3482], offsets: [0.0084, 0.0056], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3081, 3482, 3483], offsets: [0.0089, 0.0061, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3091], offsets: [0.0068], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3091, 3492], offsets: [0.0086, 0.0056], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3091, 3492, 3493], offsets: [0.0091, 0.0061, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3101], offsets: [0.0069], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3101, 3502], offsets: [0.0086, 0.0056], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3101, 3502, 3503], offsets: [0.0091, 0.0061, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3111], offsets: [0.0069], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3111, 3512], offsets: [0.0086, 0.0056], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3111, 3512, 3513], offsets: [0.0092, 0.0061, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3121], offsets: [0.0069], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3121, 3522], offsets: [0.0086, 0.0056], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3121, 3522, 3523], offsets: [0.0092, 0.0062, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3131], offsets: [0.007], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3131, 3532], offsets: [0.0086, 0.0056], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3131, 3532, 3533], offsets: [0.0092, 0.0062, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3141], offsets: [0.007], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3141, 3542], offsets: [0.0086, 0.0056], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3141, 3542, 3543], offsets: [0.0092, 0.0062, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3151], offsets: [0.0071], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3151, 3552], offsets: [0.0086, 0.0057], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3151, 3552, 3553], offsets: [0.0092, 0.0063, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3161], offsets: [0.0071], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3161, 3562], offsets: [0.0087, 0.0057], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3161, 3562, 3563], offsets: [0.0093, 0.0063, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0~10',
      totalPasses: 3,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3171], offsets: [0.0072], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3171, 3572], offsets: [0.0087, 0.0057], registers: [1, 2], feed: [0, 0], ra: '64' },
        { passNum: 3, label: 'Finish 35', approach: 'N', epacCodes: [3171, 3572, 3573], offsets: [0.0093, 0.0063, 0.0054], registers: [1, 2, 3], feed: [0, 0, 0], ra: '36' },
      ],
    },
  ],
};

/** Block 53: 0.01" St - 20Deg. Taper */
const MAKINO_SP_BLOCK_53: MakinoSPBlock = {
  headerNum: 53,
  type: 'T',
  wireDiameter: '0.01',
  material: 'St',
  method: '20Deg. Taper',
  recordCount: 15,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3032], offsets: [0.0062], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3032, 3431], offsets: [0.0079, 0.0055], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3042], offsets: [0.0064], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3042, 3441], offsets: [0.0082, 0.0055], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3052], offsets: [0.0064], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3052, 3451], offsets: [0.0082, 0.0055], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3062], offsets: [0.0065], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3062, 3461], offsets: [0.0082, 0.0055], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3072], offsets: [0.0066], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3072, 3471], offsets: [0.0083, 0.0055], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3082], offsets: [0.0067], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3082, 3481], offsets: [0.0084, 0.0056], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3092], offsets: [0.0068], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3092, 3491], offsets: [0.0086, 0.0056], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3102], offsets: [0.0069], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3102, 3501], offsets: [0.0086, 0.0056], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3112], offsets: [0.0069], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3112, 3511], offsets: [0.0086, 0.0056], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3122], offsets: [0.0069], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3122, 3521], offsets: [0.0086, 0.0056], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3132], offsets: [0.007], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3132, 3531], offsets: [0.0086, 0.0056], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3142], offsets: [0.007], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3142, 3541], offsets: [0.0086, 0.0056], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3152], offsets: [0.0071], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3152, 3551], offsets: [0.0086, 0.0057], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3162], offsets: [0.0071], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3162, 3561], offsets: [0.0087, 0.0057], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0~20',
      totalPasses: 2,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3172], offsets: [0.0072], registers: [1], feed: [0], ra: '106' },
        { passNum: 2, label: '2nd 50uinRa', approach: 'N', epacCodes: [3172, 3571], offsets: [0.0087, 0.0057], registers: [1, 2], feed: [0, 0], ra: '64' },
      ],
    },
  ],
};

/** Block 54: 0.01" St - 30Deg. Taper */
const MAKINO_SP_BLOCK_54: MakinoSPBlock = {
  headerNum: 54,
  type: 'T',
  wireDiameter: '0.01',
  material: 'St',
  method: '30Deg. Taper',
  recordCount: 15,
  records: [
    {
      recordNum: 1,
      thicknessInch: 0.5,
      thicknessMm: 12.7,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3033], offsets: [0.0067], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 2,
      thicknessInch: 0.75,
      thicknessMm: 19.05,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3043], offsets: [0.0069], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 3,
      thicknessInch: 1,
      thicknessMm: 25.4,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3053], offsets: [0.007], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 4,
      thicknessInch: 1.25,
      thicknessMm: 31.75,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3063], offsets: [0.0072], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 5,
      thicknessInch: 1.5,
      thicknessMm: 38.1,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3073], offsets: [0.0073], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 6,
      thicknessInch: 1.75,
      thicknessMm: 44.45,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3083], offsets: [0.0074], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 7,
      thicknessInch: 2,
      thicknessMm: 50.8,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3093], offsets: [0.0074], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 8,
      thicknessInch: 2.25,
      thicknessMm: 57.15,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3103], offsets: [0.0075], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 9,
      thicknessInch: 2.5,
      thicknessMm: 63.5,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3113], offsets: [0.0076], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 10,
      thicknessInch: 2.75,
      thicknessMm: 69.85,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3123], offsets: [0.0077], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 11,
      thicknessInch: 3,
      thicknessMm: 76.2,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3133], offsets: [0.0077], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 12,
      thicknessInch: 3.25,
      thicknessMm: 82.55,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3143], offsets: [0.0078], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 13,
      thicknessInch: 3.5,
      thicknessMm: 88.9,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3153], offsets: [0.0078], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 14,
      thicknessInch: 3.75,
      thicknessMm: 95.25,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3163], offsets: [0.0079], registers: [1], feed: [0], ra: '106' },
      ],
    },
    {
      recordNum: 15,
      thicknessInch: 4,
      thicknessMm: 101.6,
      taper: '0~30',
      totalPasses: 1,
      passes: [
        { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [3173], offsets: [0.0079], registers: [1], feed: [0], ra: '106' },
      ],
    },
  ],
};

// ============================================================================
// Combined Exports
// ============================================================================

/** All technology blocks */
export const MAKINO_SP_BLOCKS: MakinoSPBlock[] = [
  MAKINO_SP_BLOCK_1,
  MAKINO_SP_BLOCK_2,
  MAKINO_SP_BLOCK_3,
  MAKINO_SP_BLOCK_4,
  MAKINO_SP_BLOCK_5,
  MAKINO_SP_BLOCK_6,
  MAKINO_SP_BLOCK_7,
  MAKINO_SP_BLOCK_8,
  MAKINO_SP_BLOCK_9,
  MAKINO_SP_BLOCK_10,
  MAKINO_SP_BLOCK_11,
  MAKINO_SP_BLOCK_12,
  MAKINO_SP_BLOCK_13,
  MAKINO_SP_BLOCK_14,
  MAKINO_SP_BLOCK_15,
  MAKINO_SP_BLOCK_16,
  MAKINO_SP_BLOCK_17,
  MAKINO_SP_BLOCK_18,
  MAKINO_SP_BLOCK_19,
  MAKINO_SP_BLOCK_20,
  MAKINO_SP_BLOCK_21,
  MAKINO_SP_BLOCK_22,
  MAKINO_SP_BLOCK_23,
  MAKINO_SP_BLOCK_24,
  MAKINO_SP_BLOCK_25,
  MAKINO_SP_BLOCK_26,
  MAKINO_SP_BLOCK_27,
  MAKINO_SP_BLOCK_28,
  MAKINO_SP_BLOCK_29,
  MAKINO_SP_BLOCK_30,
  MAKINO_SP_BLOCK_31,
  MAKINO_SP_BLOCK_32,
  MAKINO_SP_BLOCK_33,
  MAKINO_SP_BLOCK_34,
  MAKINO_SP_BLOCK_35,
  MAKINO_SP_BLOCK_36,
  MAKINO_SP_BLOCK_37,
  MAKINO_SP_BLOCK_38,
  MAKINO_SP_BLOCK_39,
  MAKINO_SP_BLOCK_40,
  MAKINO_SP_BLOCK_41,
  MAKINO_SP_BLOCK_42,
  MAKINO_SP_BLOCK_43,
  MAKINO_SP_BLOCK_44,
  MAKINO_SP_BLOCK_45,
  MAKINO_SP_BLOCK_46,
  MAKINO_SP_BLOCK_47,
  MAKINO_SP_BLOCK_48,
  MAKINO_SP_BLOCK_49,
  MAKINO_SP_BLOCK_50,
  MAKINO_SP_BLOCK_51,
  MAKINO_SP_BLOCK_52,
  MAKINO_SP_BLOCK_53,
  MAKINO_SP_BLOCK_54,
];

/** Complete tech file structure */
export const MAKINO_SP_TECH_FILE: MakinoSPTechFile = {
  manufacturer: 'Makino',
  machine: 'SP43, SP64',
  control: 'MGW-S',
  units: 'Inch',
  version: 5,
  totalBlocks: 54,
  totalRecords: 822,
  blocks: MAKINO_SP_BLOCKS,
};

// ============================================================================
// Lookup Functions
// ============================================================================

/**
 * Find technology records matching criteria
 */
export function findMakinoSPRecords(criteria: {
  wireDiameter?: string;
  material?: string;
  method?: string;
  thicknessInch?: number;
  thicknessMm?: number;
  taper?: string;
}): MakinoSPRecord[] {
  const results: MakinoSPRecord[] = [];

  for (const block of MAKINO_SP_BLOCKS) {
    // Filter by block-level criteria
    if (criteria.wireDiameter && block.wireDiameter !== criteria.wireDiameter) continue;
    if (criteria.material && block.material !== criteria.material) continue;
    if (criteria.method && block.method !== criteria.method) continue;

    // Filter by record-level criteria
    for (const record of block.records) {
      if (criteria.thicknessInch !== undefined && record.thicknessInch !== criteria.thicknessInch) continue;
      if (criteria.thicknessMm !== undefined && Math.abs(record.thicknessMm - criteria.thicknessMm) > 0.1) continue;
      if (criteria.taper && record.taper !== criteria.taper) continue;

      results.push(record);
    }
  }

  return results;
}

/**
 * Find the closest thickness match for given parameters
 */
export function findClosestThickness(params: {
  wireDiameter: string;
  material: string;
  method?: string;
  thicknessInch: number;
}): MakinoSPRecord | null {
  let closest: MakinoSPRecord | null = null;
  let minDiff = Infinity;

  for (const block of MAKINO_SP_BLOCKS) {
    if (block.wireDiameter !== params.wireDiameter) continue;
    if (block.material !== params.material) continue;
    if (params.method && block.method !== params.method) continue;

    for (const record of block.records) {
      const diff = Math.abs(record.thicknessInch - params.thicknessInch);
      if (diff < minDiff) {
        minDiff = diff;
        closest = record;
      }
    }
  }

  return closest;
}

/**
 * Get E-pac code for roughing pass
 */
export function getRoughingEpac(params: {
  wireDiameter: string;
  material: string;
  thicknessInch: number;
  method?: string;
}): number | null {
  const record = findClosestThickness(params);
  if (!record || record.passes.length === 0) return null;

  // First pass is always roughing
  const roughingPass = record.passes[0];
  return roughingPass.epacCodes[0] || null;
}

/**
 * Get all available methods for a wire/material combination
 */
export function getAvailableMethods(wireDiameter: string, material: string): string[] {
  const methods = new Set<string>();

  for (const block of MAKINO_SP_BLOCKS) {
    if (block.wireDiameter === wireDiameter && block.material === material) {
      methods.add(block.method);
    }
  }

  return Array.from(methods).sort();
}

/**
 * Get all available thicknesses for given parameters
 */
export function getAvailableThicknesses(wireDiameter: string, material: string, method?: string): number[] {
  const thicknesses = new Set<number>();

  for (const block of MAKINO_SP_BLOCKS) {
    if (block.wireDiameter !== wireDiameter) continue;
    if (block.material !== material) continue;
    if (method && block.method !== method) continue;

    for (const record of block.records) {
      thicknesses.add(record.thicknessInch);
    }
  }

  return Array.from(thicknesses).sort((a, b) => a - b);
}

/**
 * Calculate expected offset for a specific pass count and quality target
 */
export function getOffsetForPasses(params: {
  wireDiameter: string;
  material: string;
  thicknessInch: number;
  passCount: number;
  method?: string;
}): number | null {
  const record = findClosestThickness({
    wireDiameter: params.wireDiameter,
    material: params.material,
    thicknessInch: params.thicknessInch,
    method: params.method,
  });

  if (!record) return null;

  // Find pass with matching pass count
  const pass = record.passes.find(p => p.passNum === params.passCount);
  if (!pass) return null;

  // Return the first offset (roughing offset)
  return pass.offsets[0] || null;
}

/**
 * Get surface finish (Ra) achievable with given pass count
 */
export function getRaForPasses(params: {
  wireDiameter: string;
  material: string;
  thicknessInch: number;
  passCount: number;
  method?: string;
}): string | null {
  const record = findClosestThickness({
    wireDiameter: params.wireDiameter,
    material: params.material,
    thicknessInch: params.thicknessInch,
    method: params.method,
  });

  if (!record) return null;

  const pass = record.passes.find(p => p.passNum === params.passCount);
  return pass?.ra || null;
}

/**
 * Interpolate offset for non-standard thickness
 */
export function interpolateOffset(params: {
  wireDiameter: string;
  material: string;
  thicknessInch: number;
  passNum: number;
  method?: string;
}): number | null {
  // Get all records for this wire/material combination
  const records = findMakinoSPRecords({
    wireDiameter: params.wireDiameter,
    material: params.material,
    method: params.method,
  });

  if (records.length === 0) return null;

  // Sort by thickness
  records.sort((a, b) => a.thicknessInch - b.thicknessInch);

  // Find bracketing records
  let lower: MakinoSPRecord | null = null;
  let upper: MakinoSPRecord | null = null;

  for (const record of records) {
    if (record.thicknessInch <= params.thicknessInch) {
      lower = record;
    }
    if (record.thicknessInch >= params.thicknessInch && !upper) {
      upper = record;
    }
  }

  // If exact match or only one bound
  if (lower && lower.thicknessInch === params.thicknessInch) {
    const pass = lower.passes.find(p => p.passNum === params.passNum);
    return pass?.offsets[0] || null;
  }

  if (!lower || !upper) {
    // Use closest available
    const closest = lower || upper;
    if (!closest) return null;
    const pass = closest.passes.find(p => p.passNum === params.passNum);
    return pass?.offsets[0] || null;
  }

  // Linear interpolation
  const lowerPass = lower.passes.find(p => p.passNum === params.passNum);
  const upperPass = upper.passes.find(p => p.passNum === params.passNum);

  if (!lowerPass || !upperPass) return null;

  const lowerOffset = lowerPass.offsets[0];
  const upperOffset = upperPass.offsets[0];

  const ratio = (params.thicknessInch - lower.thicknessInch) / (upper.thicknessInch - lower.thicknessInch);
  return lowerOffset + ratio * (upperOffset - lowerOffset);
}

/**
 * Get summary statistics for this tech file
 */
export function getMakinoSPStats(): {
  totalBlocks: number;
  totalRecords: number;
  wireDiameters: string[];
  materials: string[];
  methods: string[];
  thicknessRange: { min: number; max: number; minMm: number; maxMm: number };
  epacRange: { min: number; max: number };
} {
  const wireDiameters = new Set<string>();
  const materials = new Set<string>();
  const methods = new Set<string>();
  let minThickness = Infinity;
  let maxThickness = 0;
  let minEpac = Infinity;
  let maxEpac = 0;

  for (const block of MAKINO_SP_BLOCKS) {
    wireDiameters.add(block.wireDiameter);
    materials.add(block.material);
    methods.add(block.method);

    for (const record of block.records) {
      if (record.thicknessInch < minThickness) minThickness = record.thicknessInch;
      if (record.thicknessInch > maxThickness) maxThickness = record.thicknessInch;

      for (const pass of record.passes) {
        for (const epac of pass.epacCodes) {
          if (epac < minEpac) minEpac = epac;
          if (epac > maxEpac) maxEpac = epac;
        }
      }
    }
  }

  return {
    totalBlocks: MAKINO_SP_BLOCKS.length,
    totalRecords: MAKINO_SP_BLOCKS.reduce((sum, b) => sum + b.records.length, 0),
    wireDiameters: Array.from(wireDiameters).sort(),
    materials: Array.from(materials).sort(),
    methods: Array.from(methods).sort(),
    thicknessRange: {
      min: minThickness,
      max: maxThickness,
      minMm: minThickness * 25.4,
      maxMm: maxThickness * 25.4,
    },
    epacRange: { min: minEpac, max: maxEpac },
  };
}

// Export all for convenience
export default {
  MAKINO_SP_TECH_FILE,
  MAKINO_SP_BLOCKS,
  MAKINO_SP_MATERIALS,
  MAKINO_SP_WIRE_TYPES,
  MAKINO_SP_METHODS,
  MAKINO_SP_WIRE_DIAMETERS,
  MAKINO_SP_EPAC_FAMILIES,
  findMakinoSPRecords,
  findClosestThickness,
  getRoughingEpac,
  getAvailableMethods,
  getAvailableThicknesses,
  getOffsetForPasses,
  getRaForPasses,
  interpolateOffset,
  getMakinoSPStats,
};
