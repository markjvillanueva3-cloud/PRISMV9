/**
 * Mitsubishi FA-S Wire EDM Technology Data
 * Extracted from Mastercam X8 tech file: Mitsubishi (FA-S).tech
 *
 * Source: H:/prism/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/SharedDefaults/wire/Power/Mitsubishi (FA-S).tech
 * Machine: Mitsubishi FA-S Series
 * Control: Generic
 * Units: Originally in Inches (converted to mm where noted)
 *
 * E-Code Families:
 * - E952/E56xx: ACU (Accuracy Priority) 7-pass sequences for thin stock (0.5")
 * - E56xx: Standard ACU passes for various thicknesses
 * - E57xx: Higher thickness ranges (5.5-6.0")
 *
 * Critical for Wire EDM AI hardening - physics-validated power settings
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface MitsubishiFATechPass {
  /** Pass number (1 = roughing, subsequent = skim/finish passes) */
  passNum: number;
  /** Approach enabled (Y/N) */
  approach: 'Y' | 'N';
  /** E-pack codes for this pass sequence (comma-separated in original) */
  ePackCodes: number[];
  /** Feed rates for each pass (inches/min) */
  feedRates: number[];
  /** Offsets for each pass (inches) */
  offsets: number[];
  /** Register numbers */
  registers: number[];
  /** Surface roughness Ra (microinches) */
  ra: number;
}

export interface MitsubishiFATechRecord {
  /** Record number in file */
  recordNum: number;
  /** Thickness in inches (original) */
  thicknessInch: number;
  /** Thickness in mm (converted: inch * 25.4) */
  thicknessMm: number;
  /** Taper angle in degrees */
  taperAngle: number;
  /** Total number of passes in this record */
  totalPasses: number;
  /** Pass data array (indexed by pass number - 1) */
  passes: MitsubishiFATechPass[];
}

export interface MitsubishiFATechBlock {
  /** Wire diameter (inches) */
  wireDiameter: string;
  /** Wire type (Brass, etc.) */
  wireType: string;
  /** Material type */
  material: string;
  /** Cutting method */
  method: string;
  /** Number of records in this block */
  recordCount: number;
  /** All records in this block */
  records: MitsubishiFATechRecord[];
}

export interface MitsubishiFATechFile {
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
  recordBlocks: MitsubishiFATechBlock[];
}

// ============================================================================
// E-Code Reference
// ============================================================================

/**
 * E-Code families for Mitsubishi FA-S
 * These codes correspond to power settings in the machine's technology database
 */
export const MITSUBISHI_FA_ECODE_FAMILIES = {
  /** ACU roughing with approach for 0.5" stock */
  ACU_THIN_APPROACH: { roughing: 952, skimBase: 5601 },
  /** Standard ACU sequences by thickness range */
  ACU_BY_THICKNESS: {
    '0.50': { base: 5601, roughing: 952 },  // E952 + E5601-5607
    '1.00': { base: 5611, roughing: null }, // E5611-5617
    '1.50': { base: 5621, roughing: null }, // E5621-5627
    '2.00': { base: 5631, roughing: null }, // E5631-5637
    '2.50': { base: 5641, roughing: null }, // E5641-5647
    '3.00': { base: 5651, roughing: null }, // E5651-5657
    '3.50': { base: 5661, roughing: null }, // E5661-5667
    '4.00': { base: 5671, roughing: null }, // E5671-5677
    '4.50': { base: 5681, roughing: null }, // E5681-5687
    '5.00': { base: 5691, roughing: null }, // E5691-5697
    '5.50': { base: 5701, roughing: null }, // E5701-5707
    '6.00': { base: 5711, roughing: null }, // E5711-5717
  },
} as const;

// ============================================================================
// Extracted Records Data
// ============================================================================

/**
 * All extracted technology records from Mitsubishi FA-S tech file
 * Single record block: .010 Brass wire, STEEL material, ACU method
 */
export const MITSUBISHI_FA_TECH_RECORDS: MitsubishiFATechRecord[] = [
  // Record 1: 0.50" (12.7mm) - 7 passes with approach
  {
    recordNum: 1,
    thicknessInch: 0.50,
    thicknessMm: 12.7,
    taperAngle: 0,
    totalPasses: 7,
    passes: [
      { passNum: 1, approach: 'Y', ePackCodes: [952, 5601], feedRates: [0.040, 0.160], offsets: [0.00670], registers: [1], ra: 50 },
      { passNum: 2, approach: 'Y', ePackCodes: [952, 5601, 5602], feedRates: [0.040, 0.160, 0.200], offsets: [0.00800, 0.00560], registers: [1, 2], ra: 38 },
      { passNum: 3, approach: 'Y', ePackCodes: [952, 5601, 5602, 5603], feedRates: [0.040, 0.160, 0.200, 0.180], offsets: [0.00850, 0.00610, 0.00560], registers: [1, 2, 3], ra: 36 },
      { passNum: 4, approach: 'Y', ePackCodes: [952, 5601, 5602, 5603, 5604], feedRates: [0.040, 0.160, 0.200, 0.180, 0.170], offsets: [0.00900, 0.00660, 0.00610, 0.00560], registers: [1, 2, 3, 4], ra: 34 },
      { passNum: 5, approach: 'Y', ePackCodes: [952, 5601, 5602, 5603, 5604, 5605], feedRates: [0.040, 0.160, 0.200, 0.180, 0.170, 0.200], offsets: [0.00925, 0.00685, 0.00635, 0.00585, 0.00525], registers: [1, 2, 3, 4, 5], ra: 12 },
      { passNum: 6, approach: 'Y', ePackCodes: [952, 5601, 5602, 5603, 5604, 5605, 5606], feedRates: [0.040, 0.160, 0.200, 0.180, 0.170, 0.200, 0.180], offsets: [0.00930, 0.00690, 0.00640, 0.00590, 0.00530, 0.00520], registers: [1, 2, 3, 4, 5, 6], ra: 9 },
      { passNum: 7, approach: 'Y', ePackCodes: [952, 5601, 5602, 5603, 5604, 5605, 5606, 5607], feedRates: [0.040, 0.160, 0.200, 0.180, 0.170, 0.200, 0.180, 0.160], offsets: [0.00935, 0.00695, 0.00645, 0.00595, 0.00535, 0.00525, 0.00520], registers: [1, 2, 3, 4, 5, 6, 7], ra: 7 },
    ],
  },
  // Record 2: 1.00" (25.4mm) - 7 passes
  {
    recordNum: 2,
    thicknessInch: 1.00,
    thicknessMm: 25.4,
    taperAngle: 0,
    totalPasses: 7,
    passes: [
      { passNum: 1, approach: 'N', ePackCodes: [5611], feedRates: [0.120], offsets: [0.00680], registers: [1], ra: 60 },
      { passNum: 2, approach: 'N', ePackCodes: [5611, 5612], feedRates: [0.120, 0.180], offsets: [0.00810, 0.00550], registers: [1, 2], ra: 46 },
      { passNum: 3, approach: 'N', ePackCodes: [5611, 5612, 5613], feedRates: [0.120, 0.180, 0.160], offsets: [0.00990, 0.00730, 0.00550], registers: [1, 2, 3], ra: 42 },
      { passNum: 4, approach: 'N', ePackCodes: [5611, 5612, 5613, 5614], feedRates: [0.120, 0.180, 0.160, 0.150], offsets: [0.01060, 0.00800, 0.00620, 0.00550], registers: [1, 2, 3, 4], ra: 38 },
      { passNum: 5, approach: 'N', ePackCodes: [5611, 5612, 5613, 5614, 5615], feedRates: [0.120, 0.180, 0.160, 0.150, 0.180], offsets: [0.01090, 0.00830, 0.00650, 0.00580, 0.00520], registers: [1, 2, 3, 4, 5], ra: 12 },
      { passNum: 6, approach: 'N', ePackCodes: [5611, 5612, 5613, 5614, 5615, 5616], feedRates: [0.120, 0.180, 0.160, 0.150, 0.180, 0.160], offsets: [0.01095, 0.00835, 0.00655, 0.00585, 0.00525, 0.00515], registers: [1, 2, 3, 4, 5, 6], ra: 9 },
      { passNum: 7, approach: 'N', ePackCodes: [5611, 5612, 5613, 5614, 5615, 5616, 5617], feedRates: [0.120, 0.180, 0.160, 0.150, 0.180, 0.160, 0.140], offsets: [0.01100, 0.00840, 0.00660, 0.00590, 0.00530, 0.00520, 0.00515], registers: [1, 2, 3, 4, 5, 6, 7], ra: 7 },
    ],
  },
  // Record 3: 1.50" (38.1mm) - 7 passes
  {
    recordNum: 3,
    thicknessInch: 1.50,
    thicknessMm: 38.1,
    taperAngle: 0,
    totalPasses: 7,
    passes: [
      { passNum: 1, approach: 'N', ePackCodes: [5621], feedRates: [0.090], offsets: [0.00710], registers: [1], ra: 60 },
      { passNum: 2, approach: 'N', ePackCodes: [5621, 5622], feedRates: [0.090, 0.170], offsets: [0.00830, 0.00550], registers: [1, 2], ra: 46 },
      { passNum: 3, approach: 'N', ePackCodes: [5621, 5622, 5623], feedRates: [0.090, 0.170, 0.100], offsets: [0.00910, 0.00630, 0.00550], registers: [1, 2, 3], ra: 42 },
      { passNum: 4, approach: 'N', ePackCodes: [5621, 5622, 5623, 5624], feedRates: [0.090, 0.170, 0.100, 0.100], offsets: [0.00970, 0.00690, 0.00610, 0.00550], registers: [1, 2, 3, 4], ra: 38 },
      { passNum: 5, approach: 'N', ePackCodes: [5621, 5622, 5623, 5624, 5625], feedRates: [0.090, 0.170, 0.100, 0.100, 0.170], offsets: [0.01000, 0.00720, 0.00640, 0.00580, 0.00520], registers: [1, 2, 3, 4, 5], ra: 12 },
      { passNum: 6, approach: 'N', ePackCodes: [5621, 5622, 5623, 5624, 5625, 5626], feedRates: [0.090, 0.170, 0.100, 0.100, 0.170, 0.150], offsets: [0.01005, 0.00725, 0.00645, 0.00585, 0.00525, 0.00515], registers: [1, 2, 3, 4, 5, 6], ra: 9 },
      { passNum: 7, approach: 'N', ePackCodes: [5621, 5622, 5623, 5624, 5625, 5626, 5627], feedRates: [0.090, 0.170, 0.100, 0.100, 0.170, 0.150, 0.120], offsets: [0.01010, 0.00730, 0.00650, 0.00590, 0.00530, 0.00520, 0.00515], registers: [1, 2, 3, 4, 5, 6, 7], ra: 7 },
    ],
  },
  // Record 4: 2.00" (50.8mm) - 7 passes
  {
    recordNum: 4,
    thicknessInch: 2.00,
    thicknessMm: 50.8,
    taperAngle: 0,
    totalPasses: 7,
    passes: [
      { passNum: 1, approach: 'N', ePackCodes: [5631], feedRates: [0.060], offsets: [0.00700], registers: [1], ra: 65 },
      { passNum: 2, approach: 'N', ePackCodes: [5631, 5632], feedRates: [0.060, 0.160], offsets: [0.00830, 0.00550], registers: [1, 2], ra: 46 },
      { passNum: 3, approach: 'N', ePackCodes: [5631, 5632, 5633], feedRates: [0.060, 0.160, 0.080], offsets: [0.00910, 0.00630, 0.00550], registers: [1, 2, 3], ra: 42 },
      { passNum: 4, approach: 'N', ePackCodes: [5631, 5632, 5633, 5634], feedRates: [0.060, 0.160, 0.080, 0.080], offsets: [0.00970, 0.00690, 0.00610, 0.00550], registers: [1, 2, 3, 4], ra: 38 },
      { passNum: 5, approach: 'N', ePackCodes: [5631, 5632, 5633, 5634, 5635], feedRates: [0.060, 0.160, 0.080, 0.080, 0.170], offsets: [0.01000, 0.00720, 0.00640, 0.00580, 0.00520], registers: [1, 2, 3, 4, 5], ra: 12 },
      { passNum: 6, approach: 'N', ePackCodes: [5631, 5632, 5633, 5634, 5635, 5636], feedRates: [0.060, 0.160, 0.080, 0.080, 0.170, 0.150], offsets: [0.01010, 0.00730, 0.00650, 0.00590, 0.00530, 0.00515], registers: [1, 2, 3, 4, 5, 6], ra: 9 },
      { passNum: 7, approach: 'N', ePackCodes: [5631, 5632, 5633, 5634, 5635, 5636, 5637], feedRates: [0.060, 0.160, 0.080, 0.080, 0.170, 0.150, 0.120], offsets: [0.01015, 0.00735, 0.00655, 0.00595, 0.00535, 0.00520, 0.00515], registers: [1, 2, 3, 4, 5, 6, 7], ra: 7 },
    ],
  },
  // Record 5: 2.50" (63.5mm) - 7 passes
  {
    recordNum: 5,
    thicknessInch: 2.50,
    thicknessMm: 63.5,
    taperAngle: 0,
    totalPasses: 7,
    passes: [
      { passNum: 1, approach: 'N', ePackCodes: [5641], feedRates: [0.045], offsets: [0.00710], registers: [1], ra: 65 },
      { passNum: 2, approach: 'N', ePackCodes: [5641, 5642], feedRates: [0.045, 0.150], offsets: [0.00850, 0.00550], registers: [1, 2], ra: 46 },
      { passNum: 3, approach: 'N', ePackCodes: [5641, 5642, 5643], feedRates: [0.045, 0.150, 0.080], offsets: [0.00930, 0.00630, 0.00550], registers: [1, 2, 3], ra: 42 },
      { passNum: 4, approach: 'N', ePackCodes: [5641, 5642, 5643, 5644], feedRates: [0.045, 0.150, 0.080, 0.080], offsets: [0.00990, 0.00690, 0.00610, 0.00550], registers: [1, 2, 3, 4], ra: 38 },
      { passNum: 5, approach: 'N', ePackCodes: [5641, 5642, 5643, 5644, 5645], feedRates: [0.045, 0.150, 0.080, 0.080, 0.165], offsets: [0.01020, 0.00720, 0.00640, 0.00580, 0.00520], registers: [1, 2, 3, 4, 5], ra: 12 },
      { passNum: 6, approach: 'N', ePackCodes: [5641, 5642, 5643, 5644, 5645, 5646], feedRates: [0.045, 0.150, 0.080, 0.080, 0.165, 0.145], offsets: [0.01030, 0.00730, 0.00650, 0.00590, 0.00530, 0.00515], registers: [1, 2, 3, 4, 5, 6], ra: 9 },
      { passNum: 7, approach: 'N', ePackCodes: [5641, 5642, 5643, 5644, 5645, 5646, 5647], feedRates: [0.045, 0.150, 0.080, 0.080, 0.165, 0.145, 0.120], offsets: [0.01035, 0.00735, 0.00655, 0.00595, 0.00535, 0.00520, 0.00515], registers: [1, 2, 3, 4, 5, 6, 7], ra: 7 },
    ],
  },
  // Record 6: 3.00" (76.2mm) - 7 passes
  {
    recordNum: 6,
    thicknessInch: 3.00,
    thicknessMm: 76.2,
    taperAngle: 0,
    totalPasses: 7,
    passes: [
      { passNum: 1, approach: 'N', ePackCodes: [5651], feedRates: [0.035], offsets: [0.00720], registers: [1], ra: 65 },
      { passNum: 2, approach: 'N', ePackCodes: [5651, 5652], feedRates: [0.035, 0.140], offsets: [0.00895, 0.00550], registers: [1, 2], ra: 46 },
      { passNum: 3, approach: 'N', ePackCodes: [5651, 5652, 5653], feedRates: [0.035, 0.140, 0.080], offsets: [0.00995, 0.00650, 0.00550], registers: [1, 2, 3], ra: 42 },
      { passNum: 4, approach: 'N', ePackCodes: [5651, 5652, 5653, 5654], feedRates: [0.035, 0.140, 0.080, 0.080], offsets: [0.01055, 0.00710, 0.00610, 0.00550], registers: [1, 2, 3, 4], ra: 38 },
      { passNum: 5, approach: 'N', ePackCodes: [5651, 5652, 5653, 5654, 5655], feedRates: [0.035, 0.140, 0.080, 0.080, 0.160], offsets: [0.01085, 0.00740, 0.00640, 0.00580, 0.00520], registers: [1, 2, 3, 4, 5], ra: 12 },
      { passNum: 6, approach: 'N', ePackCodes: [5651, 5652, 5653, 5654, 5655, 5656], feedRates: [0.035, 0.140, 0.080, 0.080, 0.160, 0.140], offsets: [0.01095, 0.00750, 0.00650, 0.00590, 0.00530, 0.00515], registers: [1, 2, 3, 4, 5, 6], ra: 9 },
      { passNum: 7, approach: 'N', ePackCodes: [5651, 5652, 5653, 5654, 5655, 5656, 5657], feedRates: [0.035, 0.140, 0.080, 0.080, 0.160, 0.140, 0.120], offsets: [0.01100, 0.00755, 0.00655, 0.00595, 0.00535, 0.00520, 0.00515], registers: [1, 2, 3, 4, 5, 6, 7], ra: 7 },
    ],
  },
  // Record 7: 3.50" (88.9mm) - 7 passes
  {
    recordNum: 7,
    thicknessInch: 3.50,
    thicknessMm: 88.9,
    taperAngle: 0,
    totalPasses: 7,
    passes: [
      { passNum: 1, approach: 'N', ePackCodes: [5661], feedRates: [0.030], offsets: [0.00720], registers: [1], ra: 65 },
      { passNum: 2, approach: 'N', ePackCodes: [5661, 5662], feedRates: [0.030, 0.120], offsets: [0.00880, 0.00550], registers: [1, 2], ra: 46 },
      { passNum: 3, approach: 'N', ePackCodes: [5661, 5662, 5663], feedRates: [0.030, 0.120, 0.075], offsets: [0.00980, 0.00650, 0.00550], registers: [1, 2, 3], ra: 42 },
      { passNum: 4, approach: 'N', ePackCodes: [5661, 5662, 5663, 5664], feedRates: [0.030, 0.120, 0.075, 0.075], offsets: [0.01040, 0.00710, 0.00610, 0.00550], registers: [1, 2, 3, 4], ra: 38 },
      { passNum: 5, approach: 'N', ePackCodes: [5661, 5662, 5663, 5664, 5665], feedRates: [0.030, 0.120, 0.075, 0.075, 0.150], offsets: [0.01070, 0.00740, 0.00640, 0.00580, 0.00520], registers: [1, 2, 3, 4, 5], ra: 14 },
      { passNum: 6, approach: 'N', ePackCodes: [5661, 5662, 5663, 5664, 5665, 5666], feedRates: [0.030, 0.120, 0.075, 0.075, 0.150, 0.130], offsets: [0.01080, 0.00750, 0.00650, 0.00590, 0.00530, 0.00515], registers: [1, 2, 3, 4, 5, 6], ra: 10 },
      { passNum: 7, approach: 'N', ePackCodes: [5661, 5662, 5663, 5664, 5665, 5666, 5667], feedRates: [0.030, 0.120, 0.075, 0.075, 0.150, 0.130, 0.110], offsets: [0.01085, 0.00755, 0.00655, 0.00595, 0.00535, 0.00520, 0.00515], registers: [1, 2, 3, 4, 5, 6, 7], ra: 8 },
    ],
  },
  // Record 8: 4.00" (101.6mm) - 7 passes
  {
    recordNum: 8,
    thicknessInch: 4.00,
    thicknessMm: 101.6,
    taperAngle: 0,
    totalPasses: 7,
    passes: [
      { passNum: 1, approach: 'N', ePackCodes: [5671], feedRates: [0.025], offsets: [0.00730], registers: [1], ra: 65 },
      { passNum: 2, approach: 'N', ePackCodes: [5671, 5672], feedRates: [0.025, 0.100], offsets: [0.00890, 0.00560], registers: [1, 2], ra: 46 },
      { passNum: 3, approach: 'N', ePackCodes: [5671, 5672, 5673], feedRates: [0.025, 0.100, 0.070], offsets: [0.00990, 0.00660, 0.00560], registers: [1, 2, 3], ra: 42 },
      { passNum: 4, approach: 'N', ePackCodes: [5671, 5672, 5673, 5674], feedRates: [0.025, 0.100, 0.070, 0.070], offsets: [0.01050, 0.00720, 0.00620, 0.00560], registers: [1, 2, 3, 4], ra: 38 },
      { passNum: 5, approach: 'N', ePackCodes: [5671, 5672, 5673, 5674, 5675], feedRates: [0.025, 0.100, 0.070, 0.070, 0.140], offsets: [0.01070, 0.00740, 0.00640, 0.00580, 0.00520], registers: [1, 2, 3, 4, 5], ra: 14 },
      { passNum: 6, approach: 'N', ePackCodes: [5671, 5672, 5673, 5674, 5675, 5676], feedRates: [0.025, 0.100, 0.070, 0.070, 0.140, 0.120], offsets: [0.01080, 0.00750, 0.00650, 0.00590, 0.00530, 0.00515], registers: [1, 2, 3, 4, 5, 6], ra: 10 },
      { passNum: 7, approach: 'N', ePackCodes: [5671, 5672, 5673, 5674, 5675, 5676, 5677], feedRates: [0.025, 0.100, 0.070, 0.070, 0.140, 0.120, 0.100], offsets: [0.01085, 0.00755, 0.00655, 0.00595, 0.00535, 0.00520, 0.00515], registers: [1, 2, 3, 4, 5, 6, 7], ra: 8 },
    ],
  },
  // Record 9: 4.50" (114.3mm) - 7 passes
  {
    recordNum: 9,
    thicknessInch: 4.50,
    thicknessMm: 114.3,
    taperAngle: 0,
    totalPasses: 7,
    passes: [
      { passNum: 1, approach: 'N', ePackCodes: [5681], feedRates: [0.020], offsets: [0.00730], registers: [1], ra: 65 },
      { passNum: 2, approach: 'N', ePackCodes: [5681, 5682], feedRates: [0.020, 0.100], offsets: [0.00890, 0.00560], registers: [1, 2], ra: 46 },
      { passNum: 3, approach: 'N', ePackCodes: [5681, 5682, 5683], feedRates: [0.020, 0.100, 0.065], offsets: [0.00990, 0.00660, 0.00560], registers: [1, 2, 3], ra: 42 },
      { passNum: 4, approach: 'N', ePackCodes: [5681, 5682, 5683, 5684], feedRates: [0.020, 0.100, 0.065, 0.065], offsets: [0.01050, 0.00720, 0.00620, 0.00560], registers: [1, 2, 3, 4], ra: 38 },
      { passNum: 5, approach: 'N', ePackCodes: [5681, 5682, 5683, 5684, 5685], feedRates: [0.020, 0.100, 0.065, 0.065, 0.130], offsets: [0.01070, 0.00740, 0.00640, 0.00580, 0.00520], registers: [1, 2, 3, 4, 5], ra: 14 },
      { passNum: 6, approach: 'N', ePackCodes: [5681, 5682, 5683, 5684, 5685, 5686], feedRates: [0.020, 0.100, 0.065, 0.065, 0.130, 0.110], offsets: [0.01080, 0.00750, 0.00650, 0.00590, 0.00530, 0.00515], registers: [1, 2, 3, 4, 5, 6], ra: 10 },
      { passNum: 7, approach: 'N', ePackCodes: [5681, 5682, 5683, 5684, 5685, 5686, 5687], feedRates: [0.020, 0.100, 0.065, 0.065, 0.130, 0.110, 0.090], offsets: [0.01085, 0.00755, 0.00655, 0.00595, 0.00535, 0.00520, 0.00515], registers: [1, 2, 3, 4, 5, 6, 7], ra: 8 },
    ],
  },
  // Record 10: 5.00" (127mm) - 7 passes
  {
    recordNum: 10,
    thicknessInch: 5.00,
    thicknessMm: 127.0,
    taperAngle: 0,
    totalPasses: 7,
    passes: [
      { passNum: 1, approach: 'N', ePackCodes: [5691], feedRates: [0.020], offsets: [0.00730], registers: [1], ra: 65 },
      { passNum: 2, approach: 'N', ePackCodes: [5691, 5692], feedRates: [0.020, 0.100], offsets: [0.00900, 0.00560], registers: [1, 2], ra: 46 },
      { passNum: 3, approach: 'N', ePackCodes: [5691, 5692, 5693], feedRates: [0.020, 0.100, 0.065], offsets: [0.01020, 0.00680, 0.00560], registers: [1, 2, 3], ra: 42 },
      { passNum: 4, approach: 'N', ePackCodes: [5691, 5692, 5693, 5694], feedRates: [0.020, 0.100, 0.065, 0.065], offsets: [0.01100, 0.00760, 0.00640, 0.00560], registers: [1, 2, 3, 4], ra: 38 },
      { passNum: 5, approach: 'N', ePackCodes: [5691, 5692, 5693, 5694, 5695], feedRates: [0.020, 0.100, 0.065, 0.065, 0.120], offsets: [0.01130, 0.00790, 0.00670, 0.00590, 0.00530], registers: [1, 2, 3, 4, 5], ra: 16 },
      { passNum: 6, approach: 'N', ePackCodes: [5691, 5692, 5693, 5694, 5695, 5696], feedRates: [0.020, 0.100, 0.065, 0.065, 0.120, 0.100], offsets: [0.01135, 0.00795, 0.00675, 0.00595, 0.00535, 0.00520], registers: [1, 2, 3, 4, 5, 6], ra: 12 },
      { passNum: 7, approach: 'N', ePackCodes: [5691, 5692, 5693, 5694, 5695, 5696, 5697], feedRates: [0.020, 0.100, 0.065, 0.065, 0.120, 0.100, 0.080], offsets: [0.01140, 0.00800, 0.00680, 0.00600, 0.00540, 0.00525, 0.00520], registers: [1, 2, 3, 4, 5, 6, 7], ra: 8 },
    ],
  },
  // Record 11: 5.50" (139.7mm) - 7 passes
  {
    recordNum: 11,
    thicknessInch: 5.50,
    thicknessMm: 139.7,
    taperAngle: 0,
    totalPasses: 7,
    passes: [
      { passNum: 1, approach: 'N', ePackCodes: [5701], feedRates: [0.015], offsets: [0.00730], registers: [1], ra: 65 },
      { passNum: 2, approach: 'N', ePackCodes: [5701, 5702], feedRates: [0.015, 0.100], offsets: [0.00890, 0.00550], registers: [1, 2], ra: 52 },
      { passNum: 3, approach: 'N', ePackCodes: [5701, 5702, 5703], feedRates: [0.015, 0.100, 0.065], offsets: [0.01010, 0.00670, 0.00550], registers: [1, 2, 3], ra: 46 },
      { passNum: 4, approach: 'N', ePackCodes: [5701, 5702, 5703, 5704], feedRates: [0.015, 0.100, 0.065, 0.065], offsets: [0.01090, 0.00750, 0.00630, 0.00550], registers: [1, 2, 3, 4], ra: 42 },
      { passNum: 5, approach: 'N', ePackCodes: [5701, 5702, 5703, 5704, 5705], feedRates: [0.015, 0.100, 0.065, 0.065, 0.110], offsets: [0.01130, 0.00790, 0.00670, 0.00590, 0.00530], registers: [1, 2, 3, 4, 5], ra: 16 },
      { passNum: 6, approach: 'N', ePackCodes: [5701, 5702, 5703, 5704, 5705, 5706], feedRates: [0.015, 0.100, 0.065, 0.065, 0.110, 0.100], offsets: [0.01135, 0.00795, 0.00675, 0.00595, 0.00535, 0.00520], registers: [1, 2, 3, 4, 5, 6], ra: 12 },
      { passNum: 7, approach: 'N', ePackCodes: [5701, 5702, 5703, 5704, 5705, 5706, 5707], feedRates: [0.015, 0.100, 0.065, 0.065, 0.110, 0.100, 0.080], offsets: [0.01140, 0.00800, 0.00680, 0.00600, 0.00540, 0.00525, 0.00520], registers: [1, 2, 3, 4, 5, 6, 7], ra: 8 },
    ],
  },
  // Record 12: 6.00" (152.4mm) - 7 passes
  {
    recordNum: 12,
    thicknessInch: 6.00,
    thicknessMm: 152.4,
    taperAngle: 0,
    totalPasses: 7,
    passes: [
      { passNum: 1, approach: 'N', ePackCodes: [5711], feedRates: [0.015], offsets: [0.00730], registers: [1], ra: 65 },
      { passNum: 2, approach: 'N', ePackCodes: [5711, 5712], feedRates: [0.015, 0.100], offsets: [0.00890, 0.00560], registers: [1, 2], ra: 52 },
      { passNum: 3, approach: 'N', ePackCodes: [5711, 5712, 5713], feedRates: [0.015, 0.100, 0.060], offsets: [0.01000, 0.00670, 0.00560], registers: [1, 2, 3], ra: 46 },
      { passNum: 4, approach: 'N', ePackCodes: [5711, 5712, 5713, 5714], feedRates: [0.015, 0.100, 0.060, 0.060], offsets: [0.01080, 0.00750, 0.00640, 0.00560], registers: [1, 2, 3, 4], ra: 42 },
      { passNum: 5, approach: 'N', ePackCodes: [5711, 5712, 5713, 5714, 5715], feedRates: [0.015, 0.100, 0.060, 0.060, 0.100], offsets: [0.01110, 0.00780, 0.00670, 0.00590, 0.00530], registers: [1, 2, 3, 4, 5], ra: 16 },
      { passNum: 6, approach: 'N', ePackCodes: [5711, 5712, 5713, 5714, 5715, 5716], feedRates: [0.015, 0.100, 0.060, 0.060, 0.100, 0.090], offsets: [0.01125, 0.00795, 0.00685, 0.00605, 0.00545, 0.00530], registers: [1, 2, 3, 4, 5, 6], ra: 12 },
      { passNum: 7, approach: 'N', ePackCodes: [5711, 5712, 5713, 5714, 5715, 5716, 5717], feedRates: [0.015, 0.100, 0.060, 0.060, 0.100, 0.090, 0.080], offsets: [0.01125, 0.00795, 0.00685, 0.00605, 0.00545, 0.00530, 0.00525], registers: [1, 2, 3, 4, 5, 6, 7], ra: 8 },
    ],
  },
];

/**
 * Complete tech file structure
 */
export const MITSUBISHI_FA_TECH_FILE: MitsubishiFATechFile = {
  manufacturer: 'Mitsubishi',
  machine: 'FA-S',
  control: 'Generic',
  units: 'Inch',
  version: 5,
  comment: 'Mitsubishi FA-S',
  recordBlocks: [
    {
      wireDiameter: '.010',
      wireType: 'Brass',
      material: 'STEEL',
      method: 'Accuracy priority (ACU)',
      recordCount: 12,
      records: MITSUBISHI_FA_TECH_RECORDS,
    },
  ],
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a record by thickness (in inches)
 * @param thicknessInch - Thickness in inches (0.50 to 6.00)
 * @returns The matching record or undefined
 */
export function getRecordByThickness(thicknessInch: number): MitsubishiFATechRecord | undefined {
  return MITSUBISHI_FA_TECH_RECORDS.find(r => Math.abs(r.thicknessInch - thicknessInch) < 0.001);
}

/**
 * Get a record by thickness (in mm)
 * @param thicknessMm - Thickness in mm (12.7 to 152.4)
 * @returns The matching record or undefined
 */
export function getRecordByThicknessMm(thicknessMm: number): MitsubishiFATechRecord | undefined {
  return MITSUBISHI_FA_TECH_RECORDS.find(r => Math.abs(r.thicknessMm - thicknessMm) < 0.1);
}

/**
 * Find the closest record for a given thickness
 * @param thicknessInch - Thickness in inches
 * @returns The closest matching record
 */
export function getClosestRecord(thicknessInch: number): MitsubishiFATechRecord {
  let closest = MITSUBISHI_FA_TECH_RECORDS[0];
  let minDiff = Math.abs(MITSUBISHI_FA_TECH_RECORDS[0].thicknessInch - thicknessInch);

  for (const record of MITSUBISHI_FA_TECH_RECORDS) {
    const diff = Math.abs(record.thicknessInch - thicknessInch);
    if (diff < minDiff) {
      minDiff = diff;
      closest = record;
    }
  }

  return closest;
}

/**
 * Get E-codes for a specific number of passes at a given thickness
 * @param thicknessInch - Thickness in inches
 * @param numPasses - Number of passes (1-7)
 * @returns Array of E-pack codes for all passes, or undefined if not found
 */
export function getECodesForPasses(thicknessInch: number, numPasses: number): number[] | undefined {
  const record = getRecordByThickness(thicknessInch);
  if (!record) return undefined;

  const passData = record.passes.find(p => p.passNum === numPasses);
  return passData?.ePackCodes;
}

/**
 * Get complete pass data for a specific pass count
 * @param thicknessInch - Thickness in inches
 * @param numPasses - Number of passes (1-7)
 * @returns The pass data or undefined
 */
export function getPassData(thicknessInch: number, numPasses: number): MitsubishiFATechPass | undefined {
  const record = getRecordByThickness(thicknessInch);
  if (!record) return undefined;

  return record.passes.find(p => p.passNum === numPasses);
}

/**
 * Get feed rates for a specific thickness and pass count
 * @param thicknessInch - Thickness in inches
 * @param numPasses - Number of passes (1-7)
 * @returns Array of feed rates (inches/min), or undefined
 */
export function getFeedRates(thicknessInch: number, numPasses: number): number[] | undefined {
  const passData = getPassData(thicknessInch, numPasses);
  return passData?.feedRates;
}

/**
 * Get offsets for a specific thickness and pass count
 * @param thicknessInch - Thickness in inches
 * @param numPasses - Number of passes (1-7)
 * @returns Array of offsets (inches), or undefined
 */
export function getOffsets(thicknessInch: number, numPasses: number): number[] | undefined {
  const passData = getPassData(thicknessInch, numPasses);
  return passData?.offsets;
}

/**
 * Get expected surface roughness Ra for a specific thickness and pass count
 * @param thicknessInch - Thickness in inches
 * @param numPasses - Number of passes (1-7)
 * @returns Ra value in microinches, or undefined
 */
export function getExpectedRa(thicknessInch: number, numPasses: number): number | undefined {
  const passData = getPassData(thicknessInch, numPasses);
  return passData?.ra;
}

/**
 * Get all available thicknesses in inches
 * @returns Array of available thicknesses
 */
export function getAvailableThicknesses(): number[] {
  return MITSUBISHI_FA_TECH_RECORDS.map(r => r.thicknessInch);
}

/**
 * Get all available thicknesses in mm
 * @returns Array of available thicknesses in mm
 */
export function getAvailableThicknessesMm(): number[] {
  return MITSUBISHI_FA_TECH_RECORDS.map(r => r.thicknessMm);
}

/**
 * Convert feed rate from inches/min to mm/min
 * @param feedInchPerMin - Feed rate in inches/min
 * @returns Feed rate in mm/min
 */
export function feedToMm(feedInchPerMin: number): number {
  return feedInchPerMin * 25.4;
}

/**
 * Convert offset from inches to mm
 * @param offsetInch - Offset in inches
 * @returns Offset in mm
 */
export function offsetToMm(offsetInch: number): number {
  return offsetInch * 25.4;
}

/**
 * Get interpolated parameters for a thickness not in the table
 * Uses linear interpolation between adjacent records
 * @param thicknessInch - Thickness in inches
 * @param numPasses - Number of passes (1-7)
 * @returns Interpolated pass data or undefined if out of range
 */
export function interpolatePassData(thicknessInch: number, numPasses: number): {
  feedRates: number[];
  offsets: number[];
  ra: number;
  ePackCodes: number[];
} | undefined {
  // Clamp to valid range
  if (thicknessInch < 0.50 || thicknessInch > 6.00) return undefined;

  // Find bounding records
  let lower: MitsubishiFATechRecord | undefined;
  let upper: MitsubishiFATechRecord | undefined;

  for (let i = 0; i < MITSUBISHI_FA_TECH_RECORDS.length - 1; i++) {
    if (MITSUBISHI_FA_TECH_RECORDS[i].thicknessInch <= thicknessInch &&
        MITSUBISHI_FA_TECH_RECORDS[i + 1].thicknessInch >= thicknessInch) {
      lower = MITSUBISHI_FA_TECH_RECORDS[i];
      upper = MITSUBISHI_FA_TECH_RECORDS[i + 1];
      break;
    }
  }

  if (!lower || !upper) {
    // Exact match or edge case
    const exact = getPassData(thicknessInch, numPasses);
    if (exact) {
      return {
        feedRates: exact.feedRates,
        offsets: exact.offsets,
        ra: exact.ra,
        ePackCodes: exact.ePackCodes,
      };
    }
    return undefined;
  }

  const lowerPass = lower.passes.find(p => p.passNum === numPasses);
  const upperPass = upper.passes.find(p => p.passNum === numPasses);

  if (!lowerPass || !upperPass) return undefined;

  // Calculate interpolation factor
  const t = (thicknessInch - lower.thicknessInch) / (upper.thicknessInch - lower.thicknessInch);

  // Interpolate arrays
  const feedRates = lowerPass.feedRates.map((f, i) => {
    const upperF = upperPass.feedRates[i] ?? f;
    return f + t * (upperF - f);
  });

  const offsets = lowerPass.offsets.map((o, i) => {
    const upperO = upperPass.offsets[i] ?? o;
    return o + t * (upperO - o);
  });

  const ra = lowerPass.ra + t * (upperPass.ra - lowerPass.ra);

  // For E-codes, use the closer record's codes (can't interpolate codes)
  const ePackCodes = t < 0.5 ? lowerPass.ePackCodes : upperPass.ePackCodes;

  return {
    feedRates,
    offsets,
    ra: Math.round(ra),
    ePackCodes,
  };
}

/**
 * Calculate estimated cutting time for a path length
 * @param thicknessInch - Thickness in inches
 * @param pathLengthInch - Path length in inches
 * @param numPasses - Number of passes
 * @returns Estimated time in minutes, or undefined
 */
export function estimateCuttingTime(
  thicknessInch: number,
  pathLengthInch: number,
  numPasses: number
): number | undefined {
  const passData = getPassData(thicknessInch, numPasses) ??
                   (interpolatePassData(thicknessInch, numPasses) ?
                    { feedRates: interpolatePassData(thicknessInch, numPasses)!.feedRates } : undefined);

  if (!passData) return undefined;

  // Sum up time for all passes (path length / feed rate for each pass)
  let totalTime = 0;
  for (let i = 0; i < numPasses; i++) {
    const feedRate = passData.feedRates[i];
    if (feedRate && feedRate > 0) {
      totalTime += pathLengthInch / feedRate;
    }
  }

  return totalTime;
}

/**
 * Get recommended pass count based on target Ra
 * @param thicknessInch - Thickness in inches
 * @param targetRa - Target surface roughness in microinches
 * @returns Recommended number of passes
 */
export function getRecommendedPassCount(thicknessInch: number, targetRa: number): number {
  const record = getClosestRecord(thicknessInch);

  // Find minimum passes that achieve target Ra
  for (const pass of record.passes) {
    if (pass.ra <= targetRa) {
      return pass.passNum;
    }
  }

  // If target Ra is very fine, return max passes
  return 7;
}

// ============================================================================
// Summary Statistics
// ============================================================================

export const MITSUBISHI_FA_TECH_SUMMARY = {
  totalRecords: MITSUBISHI_FA_TECH_RECORDS.length,
  thicknessRangeInch: { min: 0.50, max: 6.00 },
  thicknessRangeMm: { min: 12.7, max: 152.4 },
  passesPerRecord: 7,
  wireConfig: {
    diameter: '.010',
    type: 'Brass',
  },
  material: 'STEEL',
  method: 'Accuracy priority (ACU)',
  eCodeFamilies: {
    acuThinApproach: 'E952 + E5601-5607',
    standardRanges: 'E5611-5717 (by thickness)',
  },
  roughnessRange: {
    roughing: { min: 50, max: 65 }, // Ra microinches after 1 pass
    finish7Pass: { min: 7, max: 8 }, // Ra microinches after 7 passes
  },
  feedRateRange: {
    roughing: { min: 0.015, max: 0.120 }, // inches/min
    finish: { min: 0.080, max: 0.200 },   // inches/min
  },
} as const;

export default {
  MITSUBISHI_FA_TECH_RECORDS,
  MITSUBISHI_FA_TECH_FILE,
  MITSUBISHI_FA_ECODE_FAMILIES,
  MITSUBISHI_FA_TECH_SUMMARY,
  getRecordByThickness,
  getRecordByThicknessMm,
  getClosestRecord,
  getECodesForPasses,
  getPassData,
  getFeedRates,
  getOffsets,
  getExpectedRa,
  getAvailableThicknesses,
  getAvailableThicknessesMm,
  feedToMm,
  offsetToMm,
  interpolatePassData,
  estimateCuttingTime,
  getRecommendedPassCount,
};
