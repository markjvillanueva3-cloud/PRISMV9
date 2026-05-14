/**
 * Mitsubishi FA-S Series Wire EDM Technology Data
 *
 * Extracted from: Mastercam X8 Mitsubishi (FA-S).tech XML file
 * Source: H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/SharedDefaults/wire/Power/Mitsubishi (FA-S).tech
 *
 * Contains 12 records for thickness ranges 0.50" to 6.00" with up to 7 passes each.
 * All values are in INCH units as specified in the source file.
 *
 * Wire: 0.010" Brass
 * Material: STEEL
 * Method: Accuracy priority (ACU)
 * Control: Generic Mitsubishi FA-S
 *
 * @module data/mitsubishi-fa-s-extracted
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Single pass data extracted from Mitsubishi FA-S tech file
 */
export interface FASTechPass {
  /** Pass number (1 = rough cut) */
  passNum: number;
  /** Approach type ("Y" = yes approach, "N" = no approach) */
  approach: "Y" | "N";
  /** E-pac codes for this pass configuration (cumulative list) */
  epac: number[];
  /** Feed rates in inches/min for each pass (cumulative list) */
  feed: number[];
  /** Wire offsets in inches for each pass (cumulative list) */
  offsets: number[];
  /** Register numbers for each pass (cumulative list) */
  registers: number[];
  /** Target Ra (surface roughness) in microinches */
  ra: number;
}

/**
 * Single thickness record from Mitsubishi FA-S tech file
 */
export interface FASTechRecord {
  /** Record number (1-12) */
  recordNum: number;
  /** Workpiece thickness in inches */
  thickness: number;
  /** Maximum taper angle (degrees) */
  taper: number;
  /** Maximum number of passes available */
  maxPasses: number;
  /** Pass data for 1 to maxPasses configurations */
  passes: FASTechPass[];
}

/**
 * Complete record block from Mitsubishi FA-S tech file
 */
export interface FASTechBlock {
  /** Manufacturer */
  mfg: string;
  /** Machine series */
  machine: string;
  /** Control type */
  control: string;
  /** Units (Inch or Metric) */
  units: "Inch" | "Metric";
  /** Wire diameter */
  wireDiameter: string;
  /** Wire type */
  wireType: string;
  /** Material */
  material: string;
  /** Cutting method */
  method: string;
  /** Total number of records */
  recordCount: number;
  /** All thickness records */
  records: FASTechRecord[];
}

/**
 * E-code family mapping for material/thickness combinations
 */
export interface FASECodeFamily {
  /** Family base code (e.g., 56xx) */
  baseCode: number;
  /** Thickness range this family applies to */
  thicknessRange: { min: number; max: number };
  /** Material this family is for */
  material: string;
  /** E-codes for passes 1-7 */
  passCodes: number[];
  /** Description */
  description: string;
}

// ============================================================================
// EXTRACTED RECORD DATA — Mitsubishi FA-S Series
// ============================================================================

/**
 * Record 1: 0.50" thickness
 * E-pac family: 952 (approach), 5601-5607 (passes)
 * Feed range: 0.040-0.200 in/min
 * Ra range: 7-50 microinches
 */
const RECORD_1: FASTechRecord = {
  recordNum: 1,
  thickness: 0.50,
  taper: 0,
  maxPasses: 7,
  passes: [
    { passNum: 1, approach: "Y", epac: [952, 5601], feed: [0.040, 0.160], offsets: [0.00670], registers: [1], ra: 50 },
    { passNum: 2, approach: "Y", epac: [952, 5601, 5602], feed: [0.040, 0.160, 0.200], offsets: [0.00800, 0.00560], registers: [1, 2], ra: 38 },
    { passNum: 3, approach: "Y", epac: [952, 5601, 5602, 5603], feed: [0.040, 0.160, 0.200, 0.180], offsets: [0.00850, 0.00610, 0.00560], registers: [1, 2, 3], ra: 36 },
    { passNum: 4, approach: "Y", epac: [952, 5601, 5602, 5603, 5604], feed: [0.040, 0.160, 0.200, 0.180, 0.170], offsets: [0.00900, 0.00660, 0.00610, 0.00560], registers: [1, 2, 3, 4], ra: 34 },
    { passNum: 5, approach: "Y", epac: [952, 5601, 5602, 5603, 5604, 5605], feed: [0.040, 0.160, 0.200, 0.180, 0.170, 0.200], offsets: [0.00925, 0.00685, 0.00635, 0.00585, 0.00525], registers: [1, 2, 3, 4, 5], ra: 12 },
    { passNum: 6, approach: "Y", epac: [952, 5601, 5602, 5603, 5604, 5605, 5606], feed: [0.040, 0.160, 0.200, 0.180, 0.170, 0.200, 0.180], offsets: [0.00930, 0.00690, 0.00640, 0.00590, 0.00530, 0.00520], registers: [1, 2, 3, 4, 5, 6], ra: 9 },
    { passNum: 7, approach: "Y", epac: [952, 5601, 5602, 5603, 5604, 5605, 5606, 5607], feed: [0.040, 0.160, 0.200, 0.180, 0.170, 0.200, 0.180, 0.160], offsets: [0.00935, 0.00695, 0.00645, 0.00595, 0.00535, 0.00525, 0.00520], registers: [1, 2, 3, 4, 5, 6, 7], ra: 7 },
  ],
};

/**
 * Record 2: 1.00" thickness
 * E-pac family: 5611-5617
 * Feed range: 0.120-0.180 in/min
 * Ra range: 7-60 microinches
 */
const RECORD_2: FASTechRecord = {
  recordNum: 2,
  thickness: 1.00,
  taper: 0,
  maxPasses: 7,
  passes: [
    { passNum: 1, approach: "N", epac: [5611], feed: [0.120], offsets: [0.00680], registers: [1], ra: 60 },
    { passNum: 2, approach: "N", epac: [5611, 5612], feed: [0.120, 0.180], offsets: [0.00810, 0.00550], registers: [1, 2], ra: 46 },
    { passNum: 3, approach: "N", epac: [5611, 5612, 5613], feed: [0.120, 0.180, 0.160], offsets: [0.00990, 0.00730, 0.00550], registers: [1, 2, 3], ra: 42 },
    { passNum: 4, approach: "N", epac: [5611, 5612, 5613, 5614], feed: [0.120, 0.180, 0.160, 0.150], offsets: [0.01060, 0.00800, 0.00620, 0.00550], registers: [1, 2, 3, 4], ra: 38 },
    { passNum: 5, approach: "N", epac: [5611, 5612, 5613, 5614, 5615], feed: [0.120, 0.180, 0.160, 0.150, 0.180], offsets: [0.01090, 0.00830, 0.00650, 0.00580, 0.00520], registers: [1, 2, 3, 4, 5], ra: 12 },
    { passNum: 6, approach: "N", epac: [5611, 5612, 5613, 5614, 5615, 5616], feed: [0.120, 0.180, 0.160, 0.150, 0.180, 0.160], offsets: [0.01095, 0.00835, 0.00655, 0.00585, 0.00525, 0.00515], registers: [1, 2, 3, 4, 5, 6], ra: 9 },
    { passNum: 7, approach: "N", epac: [5611, 5612, 5613, 5614, 5615, 5616, 5617], feed: [0.120, 0.180, 0.160, 0.150, 0.180, 0.160, 0.140], offsets: [0.01100, 0.00840, 0.00660, 0.00590, 0.00530, 0.00520, 0.00515], registers: [1, 2, 3, 4, 5, 6, 7], ra: 7 },
  ],
};

/**
 * Record 3: 1.50" thickness
 * E-pac family: 5621-5627
 * Feed range: 0.090-0.170 in/min
 * Ra range: 7-60 microinches
 */
const RECORD_3: FASTechRecord = {
  recordNum: 3,
  thickness: 1.50,
  taper: 0,
  maxPasses: 7,
  passes: [
    { passNum: 1, approach: "N", epac: [5621], feed: [0.090], offsets: [0.00710], registers: [1], ra: 60 },
    { passNum: 2, approach: "N", epac: [5621, 5622], feed: [0.090, 0.170], offsets: [0.00830, 0.00550], registers: [1, 2], ra: 46 },
    { passNum: 3, approach: "N", epac: [5621, 5622, 5623], feed: [0.090, 0.170, 0.100], offsets: [0.00910, 0.00630, 0.00550], registers: [1, 2, 3], ra: 42 },
    { passNum: 4, approach: "N", epac: [5621, 5622, 5623, 5624], feed: [0.090, 0.170, 0.100, 0.100], offsets: [0.00970, 0.00690, 0.00610, 0.00550], registers: [1, 2, 3, 4], ra: 38 },
    { passNum: 5, approach: "N", epac: [5621, 5622, 5623, 5624, 5625], feed: [0.090, 0.170, 0.100, 0.100, 0.170], offsets: [0.01000, 0.00720, 0.00640, 0.00580, 0.00520], registers: [1, 2, 3, 4, 5], ra: 12 },
    { passNum: 6, approach: "N", epac: [5621, 5622, 5623, 5624, 5625, 5626], feed: [0.090, 0.170, 0.100, 0.100, 0.170, 0.150], offsets: [0.01005, 0.00725, 0.00645, 0.00585, 0.00525, 0.00515], registers: [1, 2, 3, 4, 5, 6], ra: 9 },
    { passNum: 7, approach: "N", epac: [5621, 5622, 5623, 5624, 5625, 5626, 5627], feed: [0.090, 0.170, 0.100, 0.100, 0.170, 0.150, 0.120], offsets: [0.01010, 0.00730, 0.00650, 0.00590, 0.00530, 0.00520, 0.00515], registers: [1, 2, 3, 4, 5, 6, 7], ra: 7 },
  ],
};

/**
 * Record 4: 2.00" thickness
 * E-pac family: 5631-5637
 * Feed range: 0.060-0.170 in/min
 * Ra range: 7-65 microinches
 */
const RECORD_4: FASTechRecord = {
  recordNum: 4,
  thickness: 2.00,
  taper: 0,
  maxPasses: 7,
  passes: [
    { passNum: 1, approach: "N", epac: [5631], feed: [0.060], offsets: [0.00700], registers: [1], ra: 65 },
    { passNum: 2, approach: "N", epac: [5631, 5632], feed: [0.060, 0.160], offsets: [0.00830, 0.00550], registers: [1, 2], ra: 46 },
    { passNum: 3, approach: "N", epac: [5631, 5632, 5633], feed: [0.060, 0.160, 0.080], offsets: [0.00910, 0.00630, 0.00550], registers: [1, 2, 3], ra: 42 },
    { passNum: 4, approach: "N", epac: [5631, 5632, 5633, 5634], feed: [0.060, 0.160, 0.080, 0.080], offsets: [0.00970, 0.00690, 0.00610, 0.00550], registers: [1, 2, 3, 4], ra: 38 },
    { passNum: 5, approach: "N", epac: [5631, 5632, 5633, 5634, 5635], feed: [0.060, 0.160, 0.080, 0.080, 0.170], offsets: [0.01000, 0.00720, 0.00640, 0.00580, 0.00520], registers: [1, 2, 3, 4, 5], ra: 12 },
    { passNum: 6, approach: "N", epac: [5631, 5632, 5633, 5634, 5635, 5636], feed: [0.060, 0.160, 0.080, 0.080, 0.170, 0.150], offsets: [0.01010, 0.00730, 0.00650, 0.00590, 0.00530, 0.00515], registers: [1, 2, 3, 4, 5, 6], ra: 9 },
    { passNum: 7, approach: "N", epac: [5631, 5632, 5633, 5634, 5635, 5636, 5637], feed: [0.060, 0.160, 0.080, 0.080, 0.170, 0.150, 0.120], offsets: [0.01015, 0.00735, 0.00655, 0.00595, 0.00535, 0.00520, 0.00515], registers: [1, 2, 3, 4, 5, 6, 7], ra: 7 },
  ],
};

/**
 * Record 5: 2.50" thickness
 * E-pac family: 5641-5647
 * Feed range: 0.045-0.165 in/min
 * Ra range: 7-65 microinches
 */
const RECORD_5: FASTechRecord = {
  recordNum: 5,
  thickness: 2.50,
  taper: 0,
  maxPasses: 7,
  passes: [
    { passNum: 1, approach: "N", epac: [5641], feed: [0.045], offsets: [0.00710], registers: [1], ra: 65 },
    { passNum: 2, approach: "N", epac: [5641, 5642], feed: [0.045, 0.150], offsets: [0.00850, 0.00550], registers: [1, 2], ra: 46 },
    { passNum: 3, approach: "N", epac: [5641, 5642, 5643], feed: [0.045, 0.150, 0.080], offsets: [0.00930, 0.00630, 0.00550], registers: [1, 2, 3], ra: 42 },
    { passNum: 4, approach: "N", epac: [5641, 5642, 5643, 5644], feed: [0.045, 0.150, 0.080, 0.080], offsets: [0.00990, 0.00690, 0.00610, 0.00550], registers: [1, 2, 3, 4], ra: 38 },
    { passNum: 5, approach: "N", epac: [5641, 5642, 5643, 5644, 5645], feed: [0.045, 0.150, 0.080, 0.080, 0.165], offsets: [0.01020, 0.00720, 0.00640, 0.00580, 0.00520], registers: [1, 2, 3, 4, 5], ra: 12 },
    { passNum: 6, approach: "N", epac: [5641, 5642, 5643, 5644, 5645, 5646], feed: [0.045, 0.150, 0.080, 0.080, 0.165, 0.145], offsets: [0.01030, 0.00730, 0.00650, 0.00590, 0.00530, 0.00515], registers: [1, 2, 3, 4, 5, 6], ra: 9 },
    { passNum: 7, approach: "N", epac: [5641, 5642, 5643, 5644, 5645, 5646, 5647], feed: [0.045, 0.150, 0.080, 0.080, 0.165, 0.145, 0.120], offsets: [0.01035, 0.00735, 0.00655, 0.00595, 0.00535, 0.00520, 0.00515], registers: [1, 2, 3, 4, 5, 6, 7], ra: 7 },
  ],
};

/**
 * Record 6: 3.00" thickness
 * E-pac family: 5651-5657
 * Feed range: 0.035-0.160 in/min
 * Ra range: 7-65 microinches
 */
const RECORD_6: FASTechRecord = {
  recordNum: 6,
  thickness: 3.00,
  taper: 0,
  maxPasses: 7,
  passes: [
    { passNum: 1, approach: "N", epac: [5651], feed: [0.035], offsets: [0.00720], registers: [1], ra: 65 },
    { passNum: 2, approach: "N", epac: [5651, 5652], feed: [0.035, 0.140], offsets: [0.00895, 0.00550], registers: [1, 2], ra: 46 },
    { passNum: 3, approach: "N", epac: [5651, 5652, 5653], feed: [0.035, 0.140, 0.080], offsets: [0.00995, 0.00650, 0.00550], registers: [1, 2, 3], ra: 42 },
    { passNum: 4, approach: "N", epac: [5651, 5652, 5653, 5654], feed: [0.035, 0.140, 0.080, 0.080], offsets: [0.01055, 0.00710, 0.00610, 0.00550], registers: [1, 2, 3, 4], ra: 38 },
    { passNum: 5, approach: "N", epac: [5651, 5652, 5653, 5654, 5655], feed: [0.035, 0.140, 0.080, 0.080, 0.160], offsets: [0.01085, 0.00740, 0.00640, 0.00580, 0.00520], registers: [1, 2, 3, 4, 5], ra: 12 },
    { passNum: 6, approach: "N", epac: [5651, 5652, 5653, 5654, 5655, 5656], feed: [0.035, 0.140, 0.080, 0.080, 0.160, 0.140], offsets: [0.01095, 0.00750, 0.00650, 0.00590, 0.00530, 0.00515], registers: [1, 2, 3, 4, 5, 6], ra: 9 },
    { passNum: 7, approach: "N", epac: [5651, 5652, 5653, 5654, 5655, 5656, 5657], feed: [0.035, 0.140, 0.080, 0.080, 0.160, 0.140, 0.120], offsets: [0.01100, 0.00755, 0.00655, 0.00595, 0.00535, 0.00520, 0.00515], registers: [1, 2, 3, 4, 5, 6, 7], ra: 7 },
  ],
};

/**
 * Record 7: 3.50" thickness
 * E-pac family: 5661-5667
 * Feed range: 0.030-0.150 in/min
 * Ra range: 8-65 microinches
 */
const RECORD_7: FASTechRecord = {
  recordNum: 7,
  thickness: 3.50,
  taper: 0,
  maxPasses: 7,
  passes: [
    { passNum: 1, approach: "N", epac: [5661], feed: [0.030], offsets: [0.00720], registers: [1], ra: 65 },
    { passNum: 2, approach: "N", epac: [5661, 5662], feed: [0.030, 0.120], offsets: [0.00880, 0.00550], registers: [1, 2], ra: 46 },
    { passNum: 3, approach: "N", epac: [5661, 5662, 5663], feed: [0.030, 0.120, 0.075], offsets: [0.00980, 0.00650, 0.00550], registers: [1, 2, 3], ra: 42 },
    { passNum: 4, approach: "N", epac: [5661, 5662, 5663, 5664], feed: [0.030, 0.120, 0.075, 0.075], offsets: [0.01040, 0.00710, 0.00610, 0.00550], registers: [1, 2, 3, 4], ra: 38 },
    { passNum: 5, approach: "N", epac: [5661, 5662, 5663, 5664, 5665], feed: [0.030, 0.120, 0.075, 0.075, 0.150], offsets: [0.01070, 0.00740, 0.00640, 0.00580, 0.00520], registers: [1, 2, 3, 4, 5], ra: 14 },
    { passNum: 6, approach: "N", epac: [5661, 5662, 5663, 5664, 5665, 5666], feed: [0.030, 0.120, 0.075, 0.075, 0.150, 0.130], offsets: [0.01080, 0.00750, 0.00650, 0.00590, 0.00530, 0.00515], registers: [1, 2, 3, 4, 5, 6], ra: 10 },
    { passNum: 7, approach: "N", epac: [5661, 5662, 5663, 5664, 5665, 5666, 5667], feed: [0.030, 0.120, 0.075, 0.075, 0.150, 0.130, 0.110], offsets: [0.01085, 0.00755, 0.00655, 0.00595, 0.00535, 0.00520, 0.00515], registers: [1, 2, 3, 4, 5, 6, 7], ra: 8 },
  ],
};

/**
 * Record 8: 4.00" thickness
 * E-pac family: 5671-5677
 * Feed range: 0.025-0.140 in/min
 * Ra range: 8-65 microinches
 */
const RECORD_8: FASTechRecord = {
  recordNum: 8,
  thickness: 4.00,
  taper: 0,
  maxPasses: 7,
  passes: [
    { passNum: 1, approach: "N", epac: [5671], feed: [0.025], offsets: [0.00730], registers: [1], ra: 65 },
    { passNum: 2, approach: "N", epac: [5671, 5672], feed: [0.025, 0.100], offsets: [0.00890, 0.00560], registers: [1, 2], ra: 46 },
    { passNum: 3, approach: "N", epac: [5671, 5672, 5673], feed: [0.025, 0.100, 0.070], offsets: [0.00990, 0.00660, 0.00560], registers: [1, 2, 3], ra: 42 },
    { passNum: 4, approach: "N", epac: [5671, 5672, 5673, 5674], feed: [0.025, 0.100, 0.070, 0.070], offsets: [0.01050, 0.00720, 0.00620, 0.00560], registers: [1, 2, 3, 4], ra: 38 },
    { passNum: 5, approach: "N", epac: [5671, 5672, 5673, 5674, 5675], feed: [0.025, 0.100, 0.070, 0.070, 0.140], offsets: [0.01070, 0.00740, 0.00640, 0.00580, 0.00520], registers: [1, 2, 3, 4, 5], ra: 14 },
    { passNum: 6, approach: "N", epac: [5671, 5672, 5673, 5674, 5675, 5676], feed: [0.025, 0.100, 0.070, 0.070, 0.140, 0.120], offsets: [0.01080, 0.00750, 0.00650, 0.00590, 0.00530, 0.00515], registers: [1, 2, 3, 4, 5, 6], ra: 10 },
    { passNum: 7, approach: "N", epac: [5671, 5672, 5673, 5674, 5675, 5676, 5677], feed: [0.025, 0.100, 0.070, 0.070, 0.140, 0.120, 0.100], offsets: [0.01085, 0.00755, 0.00655, 0.00595, 0.00535, 0.00520, 0.00515], registers: [1, 2, 3, 4, 5, 6, 7], ra: 8 },
  ],
};

/**
 * Record 9: 4.50" thickness
 * E-pac family: 5681-5687
 * Feed range: 0.020-0.130 in/min
 * Ra range: 8-65 microinches
 */
const RECORD_9: FASTechRecord = {
  recordNum: 9,
  thickness: 4.50,
  taper: 0,
  maxPasses: 7,
  passes: [
    { passNum: 1, approach: "N", epac: [5681], feed: [0.020], offsets: [0.00730], registers: [1], ra: 65 },
    { passNum: 2, approach: "N", epac: [5681, 5682], feed: [0.020, 0.100], offsets: [0.00890, 0.00560], registers: [1, 2], ra: 46 },
    { passNum: 3, approach: "N", epac: [5681, 5682, 5683], feed: [0.020, 0.100, 0.065], offsets: [0.00990, 0.00660, 0.00560], registers: [1, 2, 3], ra: 42 },
    { passNum: 4, approach: "N", epac: [5681, 5682, 5683, 5684], feed: [0.020, 0.100, 0.065, 0.065], offsets: [0.01050, 0.00720, 0.00620, 0.00560], registers: [1, 2, 3, 4], ra: 38 },
    { passNum: 5, approach: "N", epac: [5681, 5682, 5683, 5684, 5685], feed: [0.020, 0.100, 0.065, 0.065, 0.130], offsets: [0.01070, 0.00740, 0.00640, 0.00580, 0.00520], registers: [1, 2, 3, 4, 5], ra: 14 },
    { passNum: 6, approach: "N", epac: [5681, 5682, 5683, 5684, 5685, 5686], feed: [0.020, 0.100, 0.065, 0.065, 0.130, 0.110], offsets: [0.01080, 0.00750, 0.00650, 0.00590, 0.00530, 0.00515], registers: [1, 2, 3, 4, 5, 6], ra: 10 },
    { passNum: 7, approach: "N", epac: [5681, 5682, 5683, 5684, 5685, 5686, 5687], feed: [0.020, 0.100, 0.065, 0.065, 0.130, 0.110, 0.090], offsets: [0.01085, 0.00755, 0.00655, 0.00595, 0.00535, 0.00520, 0.00515], registers: [1, 2, 3, 4, 5, 6, 7], ra: 8 },
  ],
};

/**
 * Record 10: 5.00" thickness
 * E-pac family: 5691-5697
 * Feed range: 0.020-0.120 in/min
 * Ra range: 8-65 microinches
 */
const RECORD_10: FASTechRecord = {
  recordNum: 10,
  thickness: 5.00,
  taper: 0,
  maxPasses: 7,
  passes: [
    { passNum: 1, approach: "N", epac: [5691], feed: [0.020], offsets: [0.00730], registers: [1], ra: 65 },
    { passNum: 2, approach: "N", epac: [5691, 5692], feed: [0.020, 0.100], offsets: [0.00900, 0.00560], registers: [1, 2], ra: 46 },
    { passNum: 3, approach: "N", epac: [5691, 5692, 5693], feed: [0.020, 0.100, 0.065], offsets: [0.01020, 0.00680, 0.00560], registers: [1, 2, 3], ra: 42 },
    { passNum: 4, approach: "N", epac: [5691, 5692, 5693, 5694], feed: [0.020, 0.100, 0.065, 0.065], offsets: [0.01100, 0.00760, 0.00640, 0.00560], registers: [1, 2, 3, 4], ra: 38 },
    { passNum: 5, approach: "N", epac: [5691, 5692, 5693, 5694, 5695], feed: [0.020, 0.100, 0.065, 0.065, 0.120], offsets: [0.01130, 0.00790, 0.00670, 0.00590, 0.00530], registers: [1, 2, 3, 4, 5], ra: 16 },
    { passNum: 6, approach: "N", epac: [5691, 5692, 5693, 5694, 5695, 5696], feed: [0.020, 0.100, 0.065, 0.065, 0.120, 0.100], offsets: [0.01135, 0.00795, 0.00675, 0.00595, 0.00535, 0.00520], registers: [1, 2, 3, 4, 5, 6], ra: 12 },
    { passNum: 7, approach: "N", epac: [5691, 5692, 5693, 5694, 5695, 5696, 5697], feed: [0.020, 0.100, 0.065, 0.065, 0.120, 0.100, 0.080], offsets: [0.01140, 0.00800, 0.00680, 0.00600, 0.00540, 0.00525, 0.00520], registers: [1, 2, 3, 4, 5, 6, 7], ra: 8 },
  ],
};

/**
 * Record 11: 5.50" thickness
 * E-pac family: 5701-5707
 * Feed range: 0.015-0.110 in/min
 * Ra range: 8-65 microinches
 */
const RECORD_11: FASTechRecord = {
  recordNum: 11,
  thickness: 5.50,
  taper: 0,
  maxPasses: 7,
  passes: [
    { passNum: 1, approach: "N", epac: [5701], feed: [0.015], offsets: [0.00730], registers: [1], ra: 65 },
    { passNum: 2, approach: "N", epac: [5701, 5702], feed: [0.015, 0.100], offsets: [0.00890, 0.00550], registers: [1, 2], ra: 52 },
    { passNum: 3, approach: "N", epac: [5701, 5702, 5703], feed: [0.015, 0.100, 0.065], offsets: [0.01010, 0.00670, 0.00550], registers: [1, 2, 3], ra: 46 },
    { passNum: 4, approach: "N", epac: [5701, 5702, 5703, 5704], feed: [0.015, 0.100, 0.065, 0.065], offsets: [0.01090, 0.00750, 0.00630, 0.00550], registers: [1, 2, 3, 4], ra: 42 },
    { passNum: 5, approach: "N", epac: [5701, 5702, 5703, 5704, 5705], feed: [0.015, 0.100, 0.065, 0.065, 0.110], offsets: [0.01130, 0.00790, 0.00670, 0.00590, 0.00530], registers: [1, 2, 3, 4, 5], ra: 16 },
    { passNum: 6, approach: "N", epac: [5701, 5702, 5703, 5704, 5705, 5706], feed: [0.015, 0.100, 0.065, 0.065, 0.110, 0.100], offsets: [0.01135, 0.00795, 0.00675, 0.00595, 0.00535, 0.00520], registers: [1, 2, 3, 4, 5, 6], ra: 12 },
    { passNum: 7, approach: "N", epac: [5701, 5702, 5703, 5704, 5705, 5706, 5707], feed: [0.015, 0.100, 0.065, 0.065, 0.110, 0.100, 0.080], offsets: [0.01140, 0.00800, 0.00680, 0.00600, 0.00540, 0.00525, 0.00520], registers: [1, 2, 3, 4, 5, 6, 7], ra: 8 },
  ],
};

/**
 * Record 12: 6.00" thickness
 * E-pac family: 5711-5717
 * Feed range: 0.015-0.100 in/min
 * Ra range: 8-65 microinches
 */
const RECORD_12: FASTechRecord = {
  recordNum: 12,
  thickness: 6.00,
  taper: 0,
  maxPasses: 7,
  passes: [
    { passNum: 1, approach: "N", epac: [5711], feed: [0.015], offsets: [0.00730], registers: [1], ra: 65 },
    { passNum: 2, approach: "N", epac: [5711, 5712], feed: [0.015, 0.100], offsets: [0.00890, 0.00560], registers: [1, 2], ra: 52 },
    { passNum: 3, approach: "N", epac: [5711, 5712, 5713], feed: [0.015, 0.100, 0.060], offsets: [0.01000, 0.00670, 0.00560], registers: [1, 2, 3], ra: 46 },
    { passNum: 4, approach: "N", epac: [5711, 5712, 5713, 5714], feed: [0.015, 0.100, 0.060, 0.060], offsets: [0.01080, 0.00750, 0.00640, 0.00560], registers: [1, 2, 3, 4], ra: 42 },
    { passNum: 5, approach: "N", epac: [5711, 5712, 5713, 5714, 5715], feed: [0.015, 0.100, 0.060, 0.060, 0.100], offsets: [0.01110, 0.00780, 0.00670, 0.00590, 0.00530], registers: [1, 2, 3, 4, 5], ra: 16 },
    { passNum: 6, approach: "N", epac: [5711, 5712, 5713, 5714, 5715, 5716], feed: [0.015, 0.100, 0.060, 0.060, 0.100, 0.090], offsets: [0.01125, 0.00795, 0.00685, 0.00605, 0.00545, 0.00530], registers: [1, 2, 3, 4, 5, 6], ra: 12 },
    { passNum: 7, approach: "N", epac: [5711, 5712, 5713, 5714, 5715, 5716, 5717], feed: [0.015, 0.100, 0.060, 0.060, 0.100, 0.090, 0.080], offsets: [0.01125, 0.00795, 0.00685, 0.00605, 0.00545, 0.00530, 0.00525], registers: [1, 2, 3, 4, 5, 6, 7], ra: 8 },
  ],
};

// ============================================================================
// COMPLETE RECORD BLOCK
// ============================================================================

/**
 * Complete Mitsubishi FA-S tech data block
 */
export const MITSUBISHI_FAS_TECH_BLOCK: FASTechBlock = {
  mfg: "Mitsubishi",
  machine: "FA-S",
  control: "Generic",
  units: "Inch",
  wireDiameter: ".010",
  wireType: "Brass",
  material: "STEEL",
  method: "Accuracy priority (ACU)",
  recordCount: 12,
  records: [
    RECORD_1, RECORD_2, RECORD_3, RECORD_4, RECORD_5, RECORD_6,
    RECORD_7, RECORD_8, RECORD_9, RECORD_10, RECORD_11, RECORD_12,
  ],
};

// ============================================================================
// E-CODE FAMILY MAPPINGS
// ============================================================================

/**
 * E-code families organized by thickness range
 */
export const FAS_ECODE_FAMILIES: FASECodeFamily[] = [
  {
    baseCode: 5600,
    thicknessRange: { min: 0.50, max: 0.50 },
    material: "STEEL",
    passCodes: [952, 5601, 5602, 5603, 5604, 5605, 5606, 5607],
    description: "0.50\" thin stock with approach (952 prefix)",
  },
  {
    baseCode: 5610,
    thicknessRange: { min: 1.00, max: 1.00 },
    material: "STEEL",
    passCodes: [5611, 5612, 5613, 5614, 5615, 5616, 5617],
    description: "1.00\" standard stock",
  },
  {
    baseCode: 5620,
    thicknessRange: { min: 1.50, max: 1.50 },
    material: "STEEL",
    passCodes: [5621, 5622, 5623, 5624, 5625, 5626, 5627],
    description: "1.50\" stock",
  },
  {
    baseCode: 5630,
    thicknessRange: { min: 2.00, max: 2.00 },
    material: "STEEL",
    passCodes: [5631, 5632, 5633, 5634, 5635, 5636, 5637],
    description: "2.00\" stock",
  },
  {
    baseCode: 5640,
    thicknessRange: { min: 2.50, max: 2.50 },
    material: "STEEL",
    passCodes: [5641, 5642, 5643, 5644, 5645, 5646, 5647],
    description: "2.50\" stock",
  },
  {
    baseCode: 5650,
    thicknessRange: { min: 3.00, max: 3.00 },
    material: "STEEL",
    passCodes: [5651, 5652, 5653, 5654, 5655, 5656, 5657],
    description: "3.00\" stock",
  },
  {
    baseCode: 5660,
    thicknessRange: { min: 3.50, max: 3.50 },
    material: "STEEL",
    passCodes: [5661, 5662, 5663, 5664, 5665, 5666, 5667],
    description: "3.50\" stock",
  },
  {
    baseCode: 5670,
    thicknessRange: { min: 4.00, max: 4.00 },
    material: "STEEL",
    passCodes: [5671, 5672, 5673, 5674, 5675, 5676, 5677],
    description: "4.00\" stock",
  },
  {
    baseCode: 5680,
    thicknessRange: { min: 4.50, max: 4.50 },
    material: "STEEL",
    passCodes: [5681, 5682, 5683, 5684, 5685, 5686, 5687],
    description: "4.50\" stock",
  },
  {
    baseCode: 5690,
    thicknessRange: { min: 5.00, max: 5.00 },
    material: "STEEL",
    passCodes: [5691, 5692, 5693, 5694, 5695, 5696, 5697],
    description: "5.00\" stock",
  },
  {
    baseCode: 5700,
    thicknessRange: { min: 5.50, max: 5.50 },
    material: "STEEL",
    passCodes: [5701, 5702, 5703, 5704, 5705, 5706, 5707],
    description: "5.50\" stock",
  },
  {
    baseCode: 5710,
    thicknessRange: { min: 6.00, max: 6.00 },
    material: "STEEL",
    passCodes: [5711, 5712, 5713, 5714, 5715, 5716, 5717],
    description: "6.00\" thick stock",
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Find the closest matching FAS record for a given thickness
 * @param thickness - Workpiece thickness in inches
 * @param material - Material type (currently only STEEL supported)
 * @param method - Cutting method (currently only ACU supported)
 * @returns Matching record or null if no match
 */
export function findFASRecord(
  thickness: number,
  material = "STEEL",
  method = "ACU"
): FASTechRecord | null {
  if (material !== "STEEL" || method !== "ACU") {
    // This tech file only has STEEL/ACU data
    return null;
  }

  // Find exact match first
  const exactMatch = MITSUBISHI_FAS_TECH_BLOCK.records.find(
    (r) => Math.abs(r.thickness - thickness) < 0.001
  );
  if (exactMatch) return exactMatch;

  // Find closest match
  let closestRecord: FASTechRecord | null = null;
  let closestDiff = Infinity;

  for (const record of MITSUBISHI_FAS_TECH_BLOCK.records) {
    const diff = Math.abs(record.thickness - thickness);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestRecord = record;
    }
  }

  return closestRecord;
}

/**
 * Get the maximum pass count available for a thickness
 * @param thickness - Workpiece thickness in inches
 * @returns Maximum number of passes available (1-7)
 */
export function getFASPassCount(thickness: number): number {
  const record = findFASRecord(thickness);
  return record ? record.maxPasses : 7;
}

/**
 * Get E-pac code sequence for a given thickness and pass count
 * @param thickness - Workpiece thickness in inches
 * @param passes - Number of passes (1-7)
 * @returns Array of E-pac codes for the pass configuration
 */
export function getFASEpacSequence(thickness: number, passes: number): number[] {
  const record = findFASRecord(thickness);
  if (!record) return [];

  const passData = record.passes.find((p) => p.passNum === passes);
  return passData ? passData.epac : [];
}

/**
 * Get feed rate sequence for a given thickness and pass count
 * @param thickness - Workpiece thickness in inches
 * @param passes - Number of passes (1-7)
 * @returns Array of feed rates in inches/min for each pass
 */
export function getFASFeedSequence(thickness: number, passes: number): number[] {
  const record = findFASRecord(thickness);
  if (!record) return [];

  const passData = record.passes.find((p) => p.passNum === passes);
  return passData ? passData.feed : [];
}

/**
 * Get wire offset sequence for a given thickness and pass count
 * @param thickness - Workpiece thickness in inches
 * @param passes - Number of passes (1-7)
 * @returns Array of wire offsets in inches for each pass
 */
export function getFASOffsets(thickness: number, passes: number): number[] {
  const record = findFASRecord(thickness);
  if (!record) return [];

  const passData = record.passes.find((p) => p.passNum === passes);
  return passData ? passData.offsets : [];
}

/**
 * Get target Ra (surface roughness) for a given thickness and pass count
 * @param thickness - Workpiece thickness in inches
 * @param passes - Number of passes (1-7)
 * @returns Target Ra in microinches, or null if not found
 */
export function getFASTargetRa(thickness: number, passes: number): number | null {
  const record = findFASRecord(thickness);
  if (!record) return null;

  const passData = record.passes.find((p) => p.passNum === passes);
  return passData ? passData.ra : null;
}

/**
 * Interpolate FAS parameters for thicknesses between defined records
 * @param thickness - Workpiece thickness in inches
 * @returns Interpolated parameters or null if out of range
 */
export function interpolateFASParameters(thickness: number): {
  roughFeed: number;
  roughOffset: number;
  skimFeed: number;
  skimOffset: number;
  estimatedRa: { passes1: number; passes5: number; passes7: number };
} | null {
  const records = MITSUBISHI_FAS_TECH_BLOCK.records;

  // Check bounds
  if (thickness < records[0].thickness || thickness > records[records.length - 1].thickness) {
    return null;
  }

  // Find bracketing records
  let lowerRecord: FASTechRecord | null = null;
  let upperRecord: FASTechRecord | null = null;

  for (let i = 0; i < records.length - 1; i++) {
    if (records[i].thickness <= thickness && records[i + 1].thickness >= thickness) {
      lowerRecord = records[i];
      upperRecord = records[i + 1];
      break;
    }
  }

  if (!lowerRecord || !upperRecord) {
    // Exact match case
    const exactRecord = findFASRecord(thickness);
    if (!exactRecord) return null;

    const pass1 = exactRecord.passes[0];
    const pass5 = exactRecord.passes[4];
    const pass7 = exactRecord.passes[6];

    return {
      roughFeed: pass1.feed[0],
      roughOffset: pass1.offsets[0],
      skimFeed: pass5.feed[pass5.feed.length - 1],
      skimOffset: pass5.offsets[pass5.offsets.length - 1],
      estimatedRa: {
        passes1: pass1.ra,
        passes5: pass5.ra,
        passes7: pass7.ra,
      },
    };
  }

  // Interpolation factor
  const t = (thickness - lowerRecord.thickness) / (upperRecord.thickness - lowerRecord.thickness);

  // Linear interpolation helper
  const lerp = (a: number, b: number) => a + t * (b - a);

  // Get pass data from both records
  const lower1 = lowerRecord.passes[0];
  const upper1 = upperRecord.passes[0];
  const lower5 = lowerRecord.passes[4];
  const upper5 = upperRecord.passes[4];
  const lower7 = lowerRecord.passes[6];
  const upper7 = upperRecord.passes[6];

  return {
    roughFeed: lerp(lower1.feed[0], upper1.feed[0]),
    roughOffset: lerp(lower1.offsets[0], upper1.offsets[0]),
    skimFeed: lerp(
      lower5.feed[lower5.feed.length - 1],
      upper5.feed[upper5.feed.length - 1]
    ),
    skimOffset: lerp(
      lower5.offsets[lower5.offsets.length - 1],
      upper5.offsets[upper5.offsets.length - 1]
    ),
    estimatedRa: {
      passes1: Math.round(lerp(lower1.ra, upper1.ra)),
      passes5: Math.round(lerp(lower5.ra, upper5.ra)),
      passes7: Math.round(lerp(lower7.ra, upper7.ra)),
    },
  };
}

/**
 * Get all available thickness values
 * @returns Array of thickness values in inches
 */
export function getFASThicknessValues(): number[] {
  return MITSUBISHI_FAS_TECH_BLOCK.records.map((r) => r.thickness);
}

/**
 * Get the E-code family for a given thickness
 * @param thickness - Workpiece thickness in inches
 * @returns E-code family info or null if not found
 */
export function getFASECodeFamily(thickness: number): FASECodeFamily | null {
  return FAS_ECODE_FAMILIES.find(
    (f) => thickness >= f.thicknessRange.min && thickness <= f.thicknessRange.max
  ) || null;
}

/**
 * Summary statistics for the FAS tech data
 */
export const FAS_TECH_SUMMARY = {
  manufacturer: "Mitsubishi",
  machine: "FA-S Series",
  wireSize: 0.010,
  wireType: "Brass",
  material: "STEEL",
  method: "Accuracy priority (ACU)",
  thicknessRange: { min: 0.50, max: 6.00 },
  thicknessCount: 12,
  maxPasses: 7,
  raRange: { min: 7, max: 65 },
  feedRange: { min: 0.015, max: 0.200 },
  offsetRange: { min: 0.00515, max: 0.01140 },
  ecodeRange: { min: 952, max: 5717 },
};
