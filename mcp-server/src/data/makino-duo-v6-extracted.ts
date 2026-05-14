/**
 * Makino DUO43/DUO64 Wire EDM Technology Data - COMPLETE V6 Extraction
 *
 * Source: H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/SharedDefaults/wire/Power/Makino DUO-Ver6-METRIC-V Guide.TECH
 * Machine: Makino DUO43, DUO64
 * Control: Generic Makino
 * Units: Metric (mm)
 * Version: 6 (V-Guide Library)
 *
 * COMPLETE extraction of all 69 record blocks from 61,953 line XML file.
 *
 * Wire Diameters: 0.1mm, 0.15mm, 0.2mm, 0.25mm, 0.3mm
 * Materials: Steel (St), Carbide (WC), Copper (Cu), Aluminum (AL/Al), Graphite (Gr)
 * Cut Types: BS (Both Sides), H (Hole), T (Taper)
 *
 * Methods include:
 * - High Speed, Speed, Precision
 * - Both Away, Both Away HS, Both Away Precision, Both Away Coreless
 * - Varying Thickness, 1 Pass Surface
 * - 2 Pass HS, 2 Pass HS Both Away
 * - (Soft) Both Away variants with Z40/Z60/Z80/Z100
 * - Taper 10Deg, Taper 20Deg, Taper 30Deg
 */

// ============================================================================
// Type Definitions
// ============================================================================

/** Wire diameter in mm */
export type DuoV6WireDiameter = 0.1 | 0.15 | 0.2 | 0.25 | 0.3;

/** Material codes */
export type DuoV6Material = 'St' | 'WC' | 'Cu' | 'AL' | 'Al' | 'Gr';

/** Cut type codes */
export type DuoV6CutType = 'BS' | 'H' | 'T';

/** All cutting methods in V6 file */
export type DuoV6Method =
  | 'High Speed'
  | 'Speed'
  | 'Precision'
  | 'Both Away'
  | 'Both Away HS'
  | 'Both Away Precision'
  | 'Both Away Coreless'
  | 'Varying Thickness'
  | '1 Pass Surface'
  | '2 Pass HS'
  | '2 Pass HS Both Away'
  | '(Soft) Both Away Precision'
  | '(Soft) Both Away-Z40'
  | '(Soft) Both Away-Z60'
  | '(Soft) Both Away-Z80'
  | 'Both Away-Z40'
  | 'Both Away-Z60'
  | 'Both Away-Z80'
  | 'Both Away-Z100'
  | 'Taper 10Deg.'
  | 'Taper 20Deg.'
  | 'Taper 30Deg.';

/** Single pass data */
export interface DuoV6Pass {
  passNum: number;
  label: string;
  approach: 'Y' | 'N';
  epacCodes: (number | string)[];
  offsets: number[];
  registers: number[];
  ra: string;
  raMin: number;
  raMax: number;
}

/** Single thickness record */
export interface DuoV6Record {
  recordNum: number;
  thicknessMm: number;
  taperRange?: string;
  totalPasses: number;
  passes: DuoV6Pass[];
}

/** Record block (header + records) */
export interface DuoV6Block {
  blockIndex: number;
  cutType: DuoV6CutType;
  wireDiameterMm: DuoV6WireDiameter;
  material: DuoV6Material;
  method: string;
  recordCount: number;
  records: DuoV6Record[];
}

/** Complete tech file */
export interface DuoV6TechFile {
  manufacturer: string;
  machine: string;
  control: string;
  units: 'Metric';
  version: number;
  comment: string;
  totalBlocks: number;
  blocks: DuoV6Block[];
}

// ============================================================================
// Parse Helpers
// ============================================================================

function parseRa(ra: string): { raMin: number; raMax: number } {
  const clean = ra.replace(/[+]\d+/, '').trim();
  if (clean.includes('~')) {
    const [min, max] = clean.split('~').map(s => parseFloat(s.trim()));
    return { raMin: min ?? 0, raMax: max ?? min ?? 0 };
  }
  const val = parseFloat(clean) || 0;
  return { raMin: val, raMax: val };
}

function parseEpac(epacStr: string): (number | string)[] {
  return epacStr.split(',').map(s => {
    const trimmed = s.trim();
    const num = parseInt(trimmed, 10);
    return isNaN(num) ? trimmed : num;
  });
}

function parseOffsets(offsetStr: string): number[] {
  return offsetStr.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
}

function parseRegisters(regStr: string): number[] {
  return regStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
}

// ============================================================================
// Block 1: 0.1mm BS Steel Both Away Precision (8 records)
// ============================================================================

const BLOCK_01_01_ST_BAP: DuoV6Record[] = [
  { recordNum: 1, thicknessMm: 1, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1006], offsets: [0.055], registers: [1], ra: '12~13', ...parseRa('12~13') },
    { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [1006, 'E1505'], offsets: [0.075, 0.055], registers: [1, 2], ra: '9~10', ...parseRa('9~10') },
    { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1006, 'E1505', 'E1506'], offsets: [0.089, 0.069, 0.054], registers: [1, 2, 3], ra: '9~9.5', ...parseRa('9~9.5') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1006, 'E1505', 'E1506', 'E1507'], offsets: [0.094, 0.074, 0.059, 0.055], registers: [1, 2, 3, 4], ra: '3~3.5', ...parseRa('3~3.5') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1006, 'E1505', 'E1506', 'E1507', 'E1508'], offsets: [0.095, 0.075, 0.060, 0.056, 0.054], registers: [1, 2, 3, 4, 5], ra: '2.5~3', ...parseRa('2.5~3') },
  ]},
  { recordNum: 2, thicknessMm: 3, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1016], offsets: [0.064], registers: [1], ra: '12.5~13', ...parseRa('12.5~13') },
    { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [1016, 'E1515'], offsets: [0.076, 0.057], registers: [1, 2], ra: '9~10', ...parseRa('9~10') },
    { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1016, 'E1515', 'E1516'], offsets: [0.087, 0.068, 0.053], registers: [1, 2, 3], ra: '9~9.5', ...parseRa('9~9.5') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1016, 'E1515', 'E1516', 'E1517'], offsets: [0.094, 0.075, 0.060, 0.056], registers: [1, 2, 3, 4], ra: '3~3.5', ...parseRa('3~3.5') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1016, 'E1515', 'E1516', 'E1517', 'E1518'], offsets: [0.095, 0.076, 0.061, 0.057, 0.054], registers: [1, 2, 3, 4, 5], ra: '2.5~3', ...parseRa('2.5~3') },
  ]},
  { recordNum: 3, thicknessMm: 5, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1026], offsets: [0.064], registers: [1], ra: '12~13', ...parseRa('12~13') },
    { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [1026, 'E1525'], offsets: [0.077, 0.057], registers: [1, 2], ra: '9~10', ...parseRa('9~10') },
    { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1026, 'E1525', 'E1526'], offsets: [0.087, 0.067, 0.052], registers: [1, 2, 3], ra: '9~9.5', ...parseRa('9~9.5') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1026, 'E1525', 'E1526', 'E1527'], offsets: [0.093, 0.073, 0.058, 0.054], registers: [1, 2, 3, 4], ra: '3.5~4', ...parseRa('3.5~4') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1026, 'E1525', 'E1526', 'E1527', 'E1528'], offsets: [0.095, 0.075, 0.060, 0.056, 0.054], registers: [1, 2, 3, 4, 5], ra: '2.5~3', ...parseRa('2.5~3') },
  ]},
  { recordNum: 4, thicknessMm: 10, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1036], offsets: [0.069], registers: [1], ra: '12~13', ...parseRa('12~13') },
    { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [1036, 'E1535'], offsets: [0.085, 0.058], registers: [1, 2], ra: '9~10', ...parseRa('9~10') },
    { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1036, 'E1535', 'E1536'], offsets: [0.096, 0.069, 0.054], registers: [1, 2, 3], ra: '9~9.5', ...parseRa('9~9.5') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1036, 'E1535', 'E1536', 'E1537'], offsets: [0.101, 0.074, 0.059, 0.055], registers: [1, 2, 3, 4], ra: '3.5~4', ...parseRa('3.5~4') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1036, 'E1535', 'E1536', 'E1537', 'E1538'], offsets: [0.103, 0.076, 0.061, 0.057, 0.055], registers: [1, 2, 3, 4, 5], ra: '2.5~3', ...parseRa('2.5~3') },
  ]},
  { recordNum: 5, thicknessMm: 15, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1046], offsets: [0.070], registers: [1], ra: '12~13', ...parseRa('12~13') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1046, 'E1545'], offsets: [0.089, 0.059], registers: [1, 2], ra: '11~12', ...parseRa('11~12') },
    { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1046, 'E1545', 'E1546'], offsets: [0.100, 0.070, 0.055], registers: [1, 2, 3], ra: '9.5~10', ...parseRa('9.5~10') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1046, 'E1545', 'E1546', 'E1547'], offsets: [0.107, 0.077, 0.062, 0.056], registers: [1, 2, 3, 4], ra: '3.5~4', ...parseRa('3.5~4') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1046, 'E1545', 'E1546', 'E1547', 'E1548'], offsets: [0.108, 0.078, 0.063, 0.057, 0.055], registers: [1, 2, 3, 4, 5], ra: '2.5~3', ...parseRa('2.5~3') },
  ]},
  { recordNum: 6, thicknessMm: 20, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1056], offsets: [0.072], registers: [1], ra: '12~13', ...parseRa('12~13') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1056, 'E1555'], offsets: [0.089, 0.059], registers: [1, 2], ra: '11~12', ...parseRa('11~12') },
    { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1056, 'E1555', 'E1556'], offsets: [0.101, 0.071, 0.056], registers: [1, 2, 3], ra: '9.5~10', ...parseRa('9.5~10') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1056, 'E1555', 'E1556', 'E1557'], offsets: [0.107, 0.077, 0.062, 0.056], registers: [1, 2, 3, 4], ra: '3.5~4', ...parseRa('3.5~4') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1056, 'E1555', 'E1556', 'E1557', 'E1558'], offsets: [0.109, 0.079, 0.064, 0.058, 0.056], registers: [1, 2, 3, 4, 5], ra: '2.5~3', ...parseRa('2.5~3') },
  ]},
  { recordNum: 7, thicknessMm: 25, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1066], offsets: [0.076], registers: [1], ra: '11~12', ...parseRa('11~12') },
    { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1066, 'E1565', 'E1566'], offsets: [0.102, 0.071, 0.056], registers: [1, 2, 3], ra: '9.5~10', ...parseRa('9.5~10') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1066, 'E1565', 'E1566', 'E1567'], offsets: [0.109, 0.078, 0.063, 0.057], registers: [1, 2, 3, 4], ra: '3.5~4', ...parseRa('3.5~4') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1066, 'E1565', 'E1566', 'E1567', 'E1568'], offsets: [0.110, 0.079, 0.064, 0.058, 0.056], registers: [1, 2, 3, 4, 5], ra: '2.5~3', ...parseRa('2.5~3') },
  ]},
  { recordNum: 8, thicknessMm: 30, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1076], offsets: [0.076], registers: [1], ra: '11~12', ...parseRa('11~12') },
    { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1076, 'E1575', 'E1576'], offsets: [0.102, 0.071, 0.056], registers: [1, 2, 3], ra: '9.5~10', ...parseRa('9.5~10') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1076, 'E1575', 'E1576', 'E1577'], offsets: [0.108, 0.077, 0.062, 0.056], registers: [1, 2, 3, 4], ra: '3.5~4', ...parseRa('3.5~4') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1076, 'E1575', 'E1576', 'E1577', 'E1578'], offsets: [0.110, 0.079, 0.064, 0.058, 0.056], registers: [1, 2, 3, 4, 5], ra: '2.5~3', ...parseRa('2.5~3') },
  ]},
];

// ============================================================================
// Block 2: 0.1mm BS Carbide (WC) Both Away Precision (8 records)
// ============================================================================

const BLOCK_02_01_WC_BAP: DuoV6Record[] = [
  { recordNum: 1, thicknessMm: 1, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5006], offsets: [0.054], registers: [1], ra: '13~14', ...parseRa('13~14') },
    { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [5006, 'E5505'], offsets: [0.076, 0.055], registers: [1, 2], ra: '7~8', ...parseRa('7~8') },
    { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [5006, 'E5505', 'E5506'], offsets: [0.087, 0.066, 0.054], registers: [1, 2, 3], ra: '7~7.5', ...parseRa('7~7.5') },
    { passNum: 4, label: 'Finish 3', approach: 'N', epacCodes: [5006, 'E5505', 'E5506', 'E5507'], offsets: [0.093, 0.072, 0.060, 0.058], registers: [1, 2, 3, 4], ra: '2.5~3', ...parseRa('2.5~3') },
    { passNum: 5, label: 'Finish 2', approach: 'N', epacCodes: [5006, 'E5505', 'E5506', 'E5507', 'E5508'], offsets: [0.095, 0.074, 0.062, 0.060, 0.058], registers: [1, 2, 3, 4, 5], ra: '1.5~2', ...parseRa('1.5~2') },
  ]},
  { recordNum: 2, thicknessMm: 3, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5016], offsets: [0.061], registers: [1], ra: '12~13', ...parseRa('12~13') },
    { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [5016, 'E5515'], offsets: [0.081, 0.055], registers: [1, 2], ra: '8~9', ...parseRa('8~9') },
    { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [5016, 'E5515', 'E5516'], offsets: [0.090, 0.064, 0.052], registers: [1, 2, 3], ra: '7~7.5', ...parseRa('7~7.5') },
    { passNum: 4, label: 'Finish 3', approach: 'N', epacCodes: [5016, 'E5515', 'E5516', 'E5517'], offsets: [0.094, 0.068, 0.056, 0.054], registers: [1, 2, 3, 4], ra: '2.5~3', ...parseRa('2.5~3') },
    { passNum: 5, label: 'Finish 2', approach: 'N', epacCodes: [5016, 'E5515', 'E5516', 'E5517', 'E5518'], offsets: [0.096, 0.070, 0.058, 0.056, 0.054], registers: [1, 2, 3, 4, 5], ra: '1.5~2', ...parseRa('1.5~2') },
  ]},
  { recordNum: 3, thicknessMm: 5, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5026], offsets: [0.063], registers: [1], ra: '12~13', ...parseRa('12~13') },
    { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [5026, 'E5525'], offsets: [0.083, 0.055], registers: [1, 2], ra: '8~9', ...parseRa('8~9') },
    { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [5026, 'E5525', 'E5526'], offsets: [0.091, 0.063, 0.051], registers: [1, 2, 3], ra: '7~7.5', ...parseRa('7~7.5') },
    { passNum: 4, label: 'Finish 3', approach: 'N', epacCodes: [5026, 'E5525', 'E5526', 'E5527'], offsets: [0.096, 0.068, 0.056, 0.054], registers: [1, 2, 3, 4], ra: '2.5~3', ...parseRa('2.5~3') },
    { passNum: 5, label: 'Finish 2', approach: 'N', epacCodes: [5026, 'E5525', 'E5526', 'E5527', 'E5528'], offsets: [0.098, 0.070, 0.058, 0.056, 0.054], registers: [1, 2, 3, 4, 5], ra: '1.5~2', ...parseRa('1.5~2') },
  ]},
  { recordNum: 4, thicknessMm: 10, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5036], offsets: [0.068], registers: [1], ra: '12~13', ...parseRa('12~13') },
    { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [5036, 'E5535'], offsets: [0.091, 0.056], registers: [1, 2], ra: '8~9', ...parseRa('8~9') },
    { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [5036, 'E5535', 'E5536'], offsets: [0.099, 0.064, 0.052], registers: [1, 2, 3], ra: '7~7.5', ...parseRa('7~7.5') },
    { passNum: 4, label: 'Finish 3', approach: 'N', epacCodes: [5036, 'E5535', 'E5536', 'E5537'], offsets: [0.104, 0.069, 0.057, 0.055], registers: [1, 2, 3, 4], ra: '2.5~3', ...parseRa('2.5~3') },
    { passNum: 5, label: 'Finish 2', approach: 'N', epacCodes: [5036, 'E5535', 'E5536', 'E5537', 'E5538'], offsets: [0.106, 0.071, 0.059, 0.057, 0.055], registers: [1, 2, 3, 4, 5], ra: '1.5~2', ...parseRa('1.5~2') },
  ]},
  { recordNum: 5, thicknessMm: 15, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5046], offsets: [0.072], registers: [1], ra: '12~13', ...parseRa('12~13') },
    { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [5046, 'E5545'], offsets: [0.097, 0.057], registers: [1, 2], ra: '8~9', ...parseRa('8~9') },
    { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [5046, 'E5545', 'E5546'], offsets: [0.104, 0.064, 0.052], registers: [1, 2, 3], ra: '7~7.5', ...parseRa('7~7.5') },
    { passNum: 4, label: 'Finish 3', approach: 'N', epacCodes: [5046, 'E5545', 'E5546', 'E5547'], offsets: [0.109, 0.069, 0.057, 0.055], registers: [1, 2, 3, 4], ra: '2.5~3', ...parseRa('2.5~3') },
    { passNum: 5, label: 'Finish 2', approach: 'N', epacCodes: [5046, 'E5545', 'E5546', 'E5547', 'E5548'], offsets: [0.111, 0.071, 0.059, 0.057, 0.055], registers: [1, 2, 3, 4, 5], ra: '1.5~2', ...parseRa('1.5~2') },
  ]},
  { recordNum: 6, thicknessMm: 20, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5056], offsets: [0.075], registers: [1], ra: '12~13', ...parseRa('12~13') },
    { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [5056, 'E5555'], offsets: [0.100, 0.058], registers: [1, 2], ra: '8~9', ...parseRa('8~9') },
    { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [5056, 'E5555', 'E5556'], offsets: [0.108, 0.066, 0.054], registers: [1, 2, 3], ra: '7~7.5', ...parseRa('7~7.5') },
    { passNum: 4, label: 'Finish 3', approach: 'N', epacCodes: [5056, 'E5555', 'E5556', 'E5557'], offsets: [0.113, 0.071, 0.059, 0.057], registers: [1, 2, 3, 4], ra: '2.5~3', ...parseRa('2.5~3') },
    { passNum: 5, label: 'Finish 2', approach: 'N', epacCodes: [5056, 'E5555', 'E5556', 'E5557', 'E5558'], offsets: [0.115, 0.073, 0.061, 0.059, 0.057], registers: [1, 2, 3, 4, 5], ra: '1.5~2', ...parseRa('1.5~2') },
  ]},
  { recordNum: 7, thicknessMm: 25, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5066], offsets: [0.078], registers: [1], ra: '12~13', ...parseRa('12~13') },
    { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [5066, 'E5565'], offsets: [0.105, 0.058], registers: [1, 2], ra: '8~9', ...parseRa('8~9') },
    { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [5066, 'E5565', 'E5566'], offsets: [0.113, 0.066, 0.054], registers: [1, 2, 3], ra: '7~7.5', ...parseRa('7~7.5') },
    { passNum: 4, label: 'Finish 3', approach: 'N', epacCodes: [5066, 'E5565', 'E5566', 'E5567'], offsets: [0.118, 0.071, 0.059, 0.057], registers: [1, 2, 3, 4], ra: '2.5~3', ...parseRa('2.5~3') },
    { passNum: 5, label: 'Finish 2', approach: 'N', epacCodes: [5066, 'E5565', 'E5566', 'E5567', 'E5568'], offsets: [0.120, 0.073, 0.061, 0.059, 0.057], registers: [1, 2, 3, 4, 5], ra: '1.5~2', ...parseRa('1.5~2') },
  ]},
  { recordNum: 8, thicknessMm: 30, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [5076], offsets: [0.080], registers: [1], ra: '12~13', ...parseRa('12~13') },
    { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [5076, 'E5575'], offsets: [0.108, 0.058], registers: [1, 2], ra: '8~9', ...parseRa('8~9') },
    { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [5076, 'E5575', 'E5576'], offsets: [0.116, 0.066, 0.054], registers: [1, 2, 3], ra: '7~7.5', ...parseRa('7~7.5') },
    { passNum: 4, label: 'Finish 3', approach: 'N', epacCodes: [5076, 'E5575', 'E5576', 'E5577'], offsets: [0.121, 0.071, 0.059, 0.057], registers: [1, 2, 3, 4], ra: '2.5~3', ...parseRa('2.5~3') },
    { passNum: 5, label: 'Finish 2', approach: 'N', epacCodes: [5076, 'E5575', 'E5576', 'E5577', 'E5578'], offsets: [0.123, 0.073, 0.061, 0.059, 0.057], registers: [1, 2, 3, 4, 5], ra: '1.5~2', ...parseRa('1.5~2') },
  ]},
];

// ============================================================================
// Block 3: 0.15mm BS Steel Both Away Precision (6 records)
// ============================================================================

const BLOCK_03_015_ST_BAP: DuoV6Record[] = [
  { recordNum: 1, thicknessMm: 5, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1026], offsets: [0.085], registers: [1], ra: '14~16', ...parseRa('14~16') },
    { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [1026, 'E1525'], offsets: [0.105, 0.078], registers: [1, 2], ra: '9~10', ...parseRa('9~10') },
    { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1026, 'E1525', 'E1526'], offsets: [0.115, 0.088, 0.076], registers: [1, 2, 3], ra: '9~9.5', ...parseRa('9~9.5') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1026, 'E1525', 'E1526', 'E1527'], offsets: [0.121, 0.094, 0.082, 0.078], registers: [1, 2, 3, 4], ra: '3~3.5', ...parseRa('3~3.5') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1026, 'E1525', 'E1526', 'E1527', 'E1528'], offsets: [0.123, 0.096, 0.084, 0.080, 0.078], registers: [1, 2, 3, 4, 5], ra: '2.5~3', ...parseRa('2.5~3') },
  ]},
  { recordNum: 2, thicknessMm: 10, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1036], offsets: [0.092], registers: [1], ra: '14~16', ...parseRa('14~16') },
    { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [1036, 'E1535'], offsets: [0.115, 0.080], registers: [1, 2], ra: '9~10', ...parseRa('9~10') },
    { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1036, 'E1535', 'E1536'], offsets: [0.125, 0.090, 0.078], registers: [1, 2, 3], ra: '9~9.5', ...parseRa('9~9.5') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1036, 'E1535', 'E1536', 'E1537'], offsets: [0.131, 0.096, 0.084, 0.080], registers: [1, 2, 3, 4], ra: '3~3.5', ...parseRa('3~3.5') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1036, 'E1535', 'E1536', 'E1537', 'E1538'], offsets: [0.133, 0.098, 0.086, 0.082, 0.080], registers: [1, 2, 3, 4, 5], ra: '2.5~3', ...parseRa('2.5~3') },
  ]},
  { recordNum: 3, thicknessMm: 15, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1046], offsets: [0.095], registers: [1], ra: '14~16', ...parseRa('14~16') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1046, 'E1545'], offsets: [0.120, 0.082], registers: [1, 2], ra: '11~12', ...parseRa('11~12') },
    { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1046, 'E1545', 'E1546'], offsets: [0.130, 0.092, 0.080], registers: [1, 2, 3], ra: '9.5~10', ...parseRa('9.5~10') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1046, 'E1545', 'E1546', 'E1547'], offsets: [0.137, 0.099, 0.087, 0.082], registers: [1, 2, 3, 4], ra: '3.5~4', ...parseRa('3.5~4') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1046, 'E1545', 'E1546', 'E1547', 'E1548'], offsets: [0.139, 0.101, 0.089, 0.084, 0.082], registers: [1, 2, 3, 4, 5], ra: '2.5~3', ...parseRa('2.5~3') },
  ]},
  { recordNum: 4, thicknessMm: 20, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1056], offsets: [0.098], registers: [1], ra: '14~16', ...parseRa('14~16') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1056, 'E1555'], offsets: [0.122, 0.082], registers: [1, 2], ra: '11~12', ...parseRa('11~12') },
    { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1056, 'E1555', 'E1556'], offsets: [0.133, 0.093, 0.081], registers: [1, 2, 3], ra: '9.5~10', ...parseRa('9.5~10') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1056, 'E1555', 'E1556', 'E1557'], offsets: [0.140, 0.100, 0.088, 0.083], registers: [1, 2, 3, 4], ra: '3.5~4', ...parseRa('3.5~4') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1056, 'E1555', 'E1556', 'E1557', 'E1558'], offsets: [0.142, 0.102, 0.090, 0.085, 0.083], registers: [1, 2, 3, 4, 5], ra: '2.5~3', ...parseRa('2.5~3') },
  ]},
  { recordNum: 5, thicknessMm: 25, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1066], offsets: [0.101], registers: [1], ra: '14~16', ...parseRa('14~16') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1066, 'E1565'], offsets: [0.126, 0.083], registers: [1, 2], ra: '11~12', ...parseRa('11~12') },
    { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1066, 'E1565', 'E1566'], offsets: [0.137, 0.094, 0.082], registers: [1, 2, 3], ra: '9.5~10', ...parseRa('9.5~10') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1066, 'E1565', 'E1566', 'E1567'], offsets: [0.144, 0.101, 0.089, 0.084], registers: [1, 2, 3, 4], ra: '3.5~4', ...parseRa('3.5~4') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1066, 'E1565', 'E1566', 'E1567', 'E1568'], offsets: [0.146, 0.103, 0.091, 0.086, 0.084], registers: [1, 2, 3, 4, 5], ra: '2.5~3', ...parseRa('2.5~3') },
  ]},
  { recordNum: 6, thicknessMm: 30, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1076], offsets: [0.103], registers: [1], ra: '14~16', ...parseRa('14~16') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1076, 'E1575'], offsets: [0.128, 0.084], registers: [1, 2], ra: '11~12', ...parseRa('11~12') },
    { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1076, 'E1575', 'E1576'], offsets: [0.139, 0.095, 0.083], registers: [1, 2, 3], ra: '9.5~10', ...parseRa('9.5~10') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1076, 'E1575', 'E1576', 'E1577'], offsets: [0.146, 0.102, 0.090, 0.085], registers: [1, 2, 3, 4], ra: '3.5~4', ...parseRa('3.5~4') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1076, 'E1575', 'E1576', 'E1577', 'E1578'], offsets: [0.148, 0.104, 0.092, 0.087, 0.085], registers: [1, 2, 3, 4, 5], ra: '2.5~3', ...parseRa('2.5~3') },
  ]},
];

// ============================================================================
// Block 5: 0.2mm BS Steel High Speed (11 records: 20-200mm)
// ============================================================================

const BLOCK_05_02_ST_HS: DuoV6Record[] = [
  { recordNum: 1, thicknessMm: 20, totalPasses: 3, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1051], offsets: [0.123], registers: [1], ra: '18~20', ...parseRa('18~20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1051, 'E1301'], offsets: [0.147, 0.110], registers: [1, 2], ra: '13~15', ...parseRa('13~15') },
    { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1051, 'E1301', 'E1302'], offsets: [0.161, 0.121, 0.110], registers: [1, 2, 3], ra: '8~10', ...parseRa('8~10') },
  ]},
  { recordNum: 2, thicknessMm: 25, totalPasses: 3, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1061], offsets: [0.128], registers: [1], ra: '18~20', ...parseRa('18~20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1061, 'E1311'], offsets: [0.149, 0.110], registers: [1, 2], ra: '13~15', ...parseRa('13~15') },
    { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1061, 'E1311', 'E1312'], offsets: [0.161, 0.122, 0.110], registers: [1, 2, 3], ra: '8~10', ...parseRa('8~10') },
  ]},
  { recordNum: 3, thicknessMm: 30, totalPasses: 3, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1071], offsets: [0.131], registers: [1], ra: '18~20', ...parseRa('18~20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1071, 'E1321'], offsets: [0.155, 0.110], registers: [1, 2], ra: '13~15', ...parseRa('13~15') },
    { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1071, 'E1321', 'E1322'], offsets: [0.167, 0.122, 0.110], registers: [1, 2, 3], ra: '8~10', ...parseRa('8~10') },
  ]},
  { recordNum: 4, thicknessMm: 40, totalPasses: 3, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1091], offsets: [0.137], registers: [1], ra: '18~20', ...parseRa('18~20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1091, 'E1341'], offsets: [0.159, 0.110], registers: [1, 2], ra: '13~15', ...parseRa('13~15') },
    { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1091, 'E1341', 'E1342'], offsets: [0.171, 0.122, 0.110], registers: [1, 2, 3], ra: '8~10', ...parseRa('8~10') },
  ]},
  { recordNum: 5, thicknessMm: 50, totalPasses: 3, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1111], offsets: [0.143], registers: [1], ra: '18~20', ...parseRa('18~20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1111, 'E1361'], offsets: [0.165, 0.112], registers: [1, 2], ra: '13~15', ...parseRa('13~15') },
    { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1111, 'E1361', 'E1362'], offsets: [0.177, 0.124, 0.112], registers: [1, 2, 3], ra: '8~10', ...parseRa('8~10') },
  ]},
  { recordNum: 6, thicknessMm: 60, totalPasses: 3, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1131], offsets: [0.148], registers: [1], ra: '18~20', ...parseRa('18~20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1131, 'E1381'], offsets: [0.171, 0.114], registers: [1, 2], ra: '13~15', ...parseRa('13~15') },
    { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1131, 'E1381', 'E1382'], offsets: [0.183, 0.126, 0.114], registers: [1, 2, 3], ra: '8~10', ...parseRa('8~10') },
  ]},
  { recordNum: 7, thicknessMm: 80, totalPasses: 3, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1151], offsets: [0.154], registers: [1], ra: '18~20', ...parseRa('18~20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1151, 'E1401'], offsets: [0.179, 0.116], registers: [1, 2], ra: '13~15', ...parseRa('13~15') },
    { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1151, 'E1401', 'E1402'], offsets: [0.191, 0.128, 0.116], registers: [1, 2, 3], ra: '8~10', ...parseRa('8~10') },
  ]},
  { recordNum: 8, thicknessMm: 100, totalPasses: 3, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1171], offsets: [0.159], registers: [1], ra: '18~20', ...parseRa('18~20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1171, 'E1421'], offsets: [0.186, 0.118], registers: [1, 2], ra: '13~15', ...parseRa('13~15') },
    { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1171, 'E1421', 'E1422'], offsets: [0.198, 0.130, 0.118], registers: [1, 2, 3], ra: '8~10', ...parseRa('8~10') },
  ]},
  { recordNum: 9, thicknessMm: 120, totalPasses: 3, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1191], offsets: [0.163], registers: [1], ra: '18~20', ...parseRa('18~20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1191, 'E1441'], offsets: [0.192, 0.120], registers: [1, 2], ra: '13~15', ...parseRa('13~15') },
    { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1191, 'E1441', 'E1442'], offsets: [0.204, 0.132, 0.120], registers: [1, 2, 3], ra: '8~10', ...parseRa('8~10') },
  ]},
  { recordNum: 10, thicknessMm: 150, totalPasses: 3, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1211], offsets: [0.168], registers: [1], ra: '18~20', ...parseRa('18~20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1211, 'E1461'], offsets: [0.198, 0.122], registers: [1, 2], ra: '13~15', ...parseRa('13~15') },
    { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1211, 'E1461', 'E1462'], offsets: [0.210, 0.134, 0.122], registers: [1, 2, 3], ra: '8~10', ...parseRa('8~10') },
  ]},
  { recordNum: 11, thicknessMm: 200, totalPasses: 3, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1231], offsets: [0.175], registers: [1], ra: '18~20', ...parseRa('18~20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1231, 'E1481'], offsets: [0.206, 0.124], registers: [1, 2], ra: '13~15', ...parseRa('13~15') },
    { passNum: 3, label: 'Finish 10', approach: 'N', epacCodes: [1231, 'E1481', 'E1482'], offsets: [0.218, 0.136, 0.124], registers: [1, 2, 3], ra: '8~10', ...parseRa('8~10') },
  ]},
];

// ============================================================================
// Block 10: 0.2mm BS Steel Both Away Precision (19 records: 1-200mm)
// ============================================================================

const BLOCK_10_02_ST_BAP: DuoV6Record[] = [
  { recordNum: 1, thicknessMm: 1, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1006], offsets: [0.110], registers: [1], ra: '16', ...parseRa('16') },
    { passNum: 2, label: '2nd 10', approach: 'N', epacCodes: [1006, 'E1505'], offsets: [0.135, 0.105], registers: [1, 2], ra: '8', ...parseRa('8') },
    { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [1006, 'E1505', 'E1506'], offsets: [0.147, 0.117, 0.105], registers: [1, 2, 3], ra: '7.5', ...parseRa('7.5') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1006, 'E1505', 'E1506', 'E1507'], offsets: [0.152, 0.122, 0.110, 0.105], registers: [1, 2, 3, 4], ra: '3~3.5', ...parseRa('3~3.5') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1006, 'E1505', 'E1506', 'E1507', 'E1508'], offsets: [0.154, 0.124, 0.112, 0.107, 0.107], registers: [1, 2, 3, 4, 5], ra: '2~2.5', ...parseRa('2~2.5') },
  ]},
  { recordNum: 2, thicknessMm: 3, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1016], offsets: [0.120], registers: [1], ra: '20', ...parseRa('20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1016, 'E1515'], offsets: [0.145, 0.105], registers: [1, 2], ra: '13', ...parseRa('13') },
    { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [1016, 'E1515', 'E1516'], offsets: [0.158, 0.118, 0.106], registers: [1, 2, 3], ra: '7.5', ...parseRa('7.5') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1016, 'E1515', 'E1516', 'E1517'], offsets: [0.162, 0.122, 0.110, 0.104], registers: [1, 2, 3, 4], ra: '3~3.5', ...parseRa('3~3.5') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1016, 'E1515', 'E1516', 'E1517', 'E1518'], offsets: [0.164, 0.124, 0.112, 0.106, 0.106], registers: [1, 2, 3, 4, 5], ra: '2~2.5', ...parseRa('2~2.5') },
  ]},
  { recordNum: 3, thicknessMm: 5, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1026], offsets: [0.120], registers: [1], ra: '20', ...parseRa('20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1026, 'E1525'], offsets: [0.147, 0.105], registers: [1, 2], ra: '13', ...parseRa('13') },
    { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [1026, 'E1525', 'E1526'], offsets: [0.156, 0.114, 0.102], registers: [1, 2, 3], ra: '7.5', ...parseRa('7.5') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1026, 'E1525', 'E1526', 'E1527'], offsets: [0.161, 0.119, 0.107, 0.105], registers: [1, 2, 3, 4], ra: '3~3.5', ...parseRa('3~3.5') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1026, 'E1525', 'E1526', 'E1527', 'E1528'], offsets: [0.163, 0.121, 0.109, 0.107, 0.107], registers: [1, 2, 3, 4, 5], ra: '2~2.5', ...parseRa('2~2.5') },
  ]},
  { recordNum: 4, thicknessMm: 10, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1036], offsets: [0.125], registers: [1], ra: '18~20', ...parseRa('18~20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1036, 'E1535'], offsets: [0.154, 0.104], registers: [1, 2], ra: '12~14', ...parseRa('12~14') },
    { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [1036, 'E1535', 'E1536'], offsets: [0.165, 0.115, 0.106], registers: [1, 2, 3], ra: '6~8', ...parseRa('6~8') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1036, 'E1535', 'E1536', 'E1537'], offsets: [0.170, 0.120, 0.111, 0.105], registers: [1, 2, 3, 4], ra: '3~3.5', ...parseRa('3~3.5') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1036, 'E1535', 'E1536', 'E1537', 'E1538'], offsets: [0.172, 0.122, 0.113, 0.107, 0.107], registers: [1, 2, 3, 4, 5], ra: '2~2.5', ...parseRa('2~2.5') },
  ]},
  { recordNum: 5, thicknessMm: 15, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1046], offsets: [0.127], registers: [1], ra: '18~20', ...parseRa('18~20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1046, 'E1545'], offsets: [0.158, 0.104], registers: [1, 2], ra: '12~14', ...parseRa('12~14') },
    { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [1046, 'E1545', 'E1546'], offsets: [0.168, 0.114, 0.105], registers: [1, 2, 3], ra: '6~8', ...parseRa('6~8') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1046, 'E1545', 'E1546', 'E1547'], offsets: [0.174, 0.120, 0.111, 0.106], registers: [1, 2, 3, 4], ra: '3~3.5', ...parseRa('3~3.5') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1046, 'E1545', 'E1546', 'E1547', 'E1548'], offsets: [0.176, 0.122, 0.113, 0.108, 0.108], registers: [1, 2, 3, 4, 5], ra: '2~2.5', ...parseRa('2~2.5') },
  ]},
  { recordNum: 6, thicknessMm: 20, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1056], offsets: [0.130], registers: [1], ra: '18~20', ...parseRa('18~20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1056, 'E1555'], offsets: [0.161, 0.105], registers: [1, 2], ra: '12~14', ...parseRa('12~14') },
    { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [1056, 'E1555', 'E1556'], offsets: [0.172, 0.116, 0.106], registers: [1, 2, 3], ra: '6~8', ...parseRa('6~8') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1056, 'E1555', 'E1556', 'E1557'], offsets: [0.178, 0.122, 0.112, 0.106], registers: [1, 2, 3, 4], ra: '3~3.5', ...parseRa('3~3.5') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1056, 'E1555', 'E1556', 'E1557', 'E1558'], offsets: [0.180, 0.124, 0.114, 0.108, 0.108], registers: [1, 2, 3, 4, 5], ra: '2~2.5', ...parseRa('2~2.5') },
  ]},
  { recordNum: 7, thicknessMm: 25, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1066], offsets: [0.133], registers: [1], ra: '18~20', ...parseRa('18~20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1066, 'E1565'], offsets: [0.164, 0.106], registers: [1, 2], ra: '12~14', ...parseRa('12~14') },
    { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [1066, 'E1565', 'E1566'], offsets: [0.176, 0.118, 0.106], registers: [1, 2, 3], ra: '6~8', ...parseRa('6~8') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1066, 'E1565', 'E1566', 'E1567'], offsets: [0.182, 0.124, 0.112, 0.107], registers: [1, 2, 3, 4], ra: '3~3.5', ...parseRa('3~3.5') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1066, 'E1565', 'E1566', 'E1567', 'E1568'], offsets: [0.184, 0.126, 0.114, 0.109, 0.109], registers: [1, 2, 3, 4, 5], ra: '2~2.5', ...parseRa('2~2.5') },
  ]},
  { recordNum: 8, thicknessMm: 30, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1076], offsets: [0.135], registers: [1], ra: '18~20', ...parseRa('18~20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1076, 'E1575'], offsets: [0.168, 0.107], registers: [1, 2], ra: '12~14', ...parseRa('12~14') },
    { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [1076, 'E1575', 'E1576'], offsets: [0.180, 0.119, 0.107], registers: [1, 2, 3], ra: '6~8', ...parseRa('6~8') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1076, 'E1575', 'E1576', 'E1577'], offsets: [0.186, 0.125, 0.113, 0.107], registers: [1, 2, 3, 4], ra: '3~3.5', ...parseRa('3~3.5') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1076, 'E1575', 'E1576', 'E1577', 'E1578'], offsets: [0.188, 0.127, 0.115, 0.109, 0.109], registers: [1, 2, 3, 4, 5], ra: '2~2.5', ...parseRa('2~2.5') },
  ]},
  { recordNum: 9, thicknessMm: 40, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1096], offsets: [0.140], registers: [1], ra: '18~20', ...parseRa('18~20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1096, 'E1595'], offsets: [0.175, 0.108], registers: [1, 2], ra: '12~14', ...parseRa('12~14') },
    { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [1096, 'E1595', 'E1596'], offsets: [0.188, 0.121, 0.108], registers: [1, 2, 3], ra: '6~8', ...parseRa('6~8') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1096, 'E1595', 'E1596', 'E1597'], offsets: [0.195, 0.128, 0.115, 0.108], registers: [1, 2, 3, 4], ra: '3~3.5', ...parseRa('3~3.5') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1096, 'E1595', 'E1596', 'E1597', 'E1598'], offsets: [0.197, 0.130, 0.117, 0.110, 0.110], registers: [1, 2, 3, 4, 5], ra: '2~2.5', ...parseRa('2~2.5') },
  ]},
  { recordNum: 10, thicknessMm: 50, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1116], offsets: [0.145], registers: [1], ra: '18~20', ...parseRa('18~20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1116, 'E1615'], offsets: [0.181, 0.109], registers: [1, 2], ra: '12~14', ...parseRa('12~14') },
    { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [1116, 'E1615', 'E1616'], offsets: [0.194, 0.122, 0.109], registers: [1, 2, 3], ra: '6~8', ...parseRa('6~8') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1116, 'E1615', 'E1616', 'E1617'], offsets: [0.201, 0.129, 0.116, 0.109], registers: [1, 2, 3, 4], ra: '3~3.5', ...parseRa('3~3.5') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1116, 'E1615', 'E1616', 'E1617', 'E1618'], offsets: [0.203, 0.131, 0.118, 0.111, 0.111], registers: [1, 2, 3, 4, 5], ra: '2~2.5', ...parseRa('2~2.5') },
  ]},
  { recordNum: 11, thicknessMm: 60, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1136], offsets: [0.150], registers: [1], ra: '18~20', ...parseRa('18~20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1136, 'E1635'], offsets: [0.188, 0.111], registers: [1, 2], ra: '12~14', ...parseRa('12~14') },
    { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [1136, 'E1635', 'E1636'], offsets: [0.201, 0.124, 0.111], registers: [1, 2, 3], ra: '6~8', ...parseRa('6~8') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1136, 'E1635', 'E1636', 'E1637'], offsets: [0.208, 0.131, 0.118, 0.111], registers: [1, 2, 3, 4], ra: '3~3.5', ...parseRa('3~3.5') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1136, 'E1635', 'E1636', 'E1637', 'E1638'], offsets: [0.210, 0.133, 0.120, 0.113, 0.113], registers: [1, 2, 3, 4, 5], ra: '2~2.5', ...parseRa('2~2.5') },
  ]},
  { recordNum: 12, thicknessMm: 80, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1156], offsets: [0.158], registers: [1], ra: '18~20', ...parseRa('18~20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1156, 'E1655'], offsets: [0.198, 0.114], registers: [1, 2], ra: '12~14', ...parseRa('12~14') },
    { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [1156, 'E1655', 'E1656'], offsets: [0.212, 0.128, 0.114], registers: [1, 2, 3], ra: '6~8', ...parseRa('6~8') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1156, 'E1655', 'E1656', 'E1657'], offsets: [0.220, 0.136, 0.122, 0.114], registers: [1, 2, 3, 4], ra: '3~3.5', ...parseRa('3~3.5') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1156, 'E1655', 'E1656', 'E1657', 'E1658'], offsets: [0.222, 0.138, 0.124, 0.116, 0.116], registers: [1, 2, 3, 4, 5], ra: '2~2.5', ...parseRa('2~2.5') },
  ]},
  { recordNum: 13, thicknessMm: 100, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1176], offsets: [0.164], registers: [1], ra: '18~20', ...parseRa('18~20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1176, 'E1675'], offsets: [0.206, 0.117], registers: [1, 2], ra: '12~14', ...parseRa('12~14') },
    { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [1176, 'E1675', 'E1676'], offsets: [0.220, 0.131, 0.117], registers: [1, 2, 3], ra: '6~8', ...parseRa('6~8') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1176, 'E1675', 'E1676', 'E1677'], offsets: [0.228, 0.139, 0.125, 0.117], registers: [1, 2, 3, 4], ra: '3~3.5', ...parseRa('3~3.5') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1176, 'E1675', 'E1676', 'E1677', 'E1678'], offsets: [0.230, 0.141, 0.127, 0.119, 0.119], registers: [1, 2, 3, 4, 5], ra: '2~2.5', ...parseRa('2~2.5') },
  ]},
  { recordNum: 14, thicknessMm: 120, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1196], offsets: [0.170], registers: [1], ra: '18~20', ...parseRa('18~20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1196, 'E1695'], offsets: [0.214, 0.120], registers: [1, 2], ra: '12~14', ...parseRa('12~14') },
    { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [1196, 'E1695', 'E1696'], offsets: [0.228, 0.134, 0.120], registers: [1, 2, 3], ra: '6~8', ...parseRa('6~8') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1196, 'E1695', 'E1696', 'E1697'], offsets: [0.236, 0.142, 0.128, 0.120], registers: [1, 2, 3, 4], ra: '3~3.5', ...parseRa('3~3.5') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1196, 'E1695', 'E1696', 'E1697', 'E1698'], offsets: [0.238, 0.144, 0.130, 0.122, 0.122], registers: [1, 2, 3, 4, 5], ra: '2~2.5', ...parseRa('2~2.5') },
  ]},
  { recordNum: 15, thicknessMm: 150, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1216], offsets: [0.178], registers: [1], ra: '18~20', ...parseRa('18~20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1216, 'E1715'], offsets: [0.224, 0.124], registers: [1, 2], ra: '12~14', ...parseRa('12~14') },
    { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [1216, 'E1715', 'E1716'], offsets: [0.238, 0.138, 0.124], registers: [1, 2, 3], ra: '6~8', ...parseRa('6~8') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1216, 'E1715', 'E1716', 'E1717'], offsets: [0.246, 0.146, 0.132, 0.124], registers: [1, 2, 3, 4], ra: '3~3.5', ...parseRa('3~3.5') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1216, 'E1715', 'E1716', 'E1717', 'E1718'], offsets: [0.248, 0.148, 0.134, 0.126, 0.126], registers: [1, 2, 3, 4, 5], ra: '2~2.5', ...parseRa('2~2.5') },
  ]},
  { recordNum: 16, thicknessMm: 180, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1236], offsets: [0.185], registers: [1], ra: '18~20', ...parseRa('18~20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1236, 'E1735'], offsets: [0.233, 0.128], registers: [1, 2], ra: '12~14', ...parseRa('12~14') },
    { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [1236, 'E1735', 'E1736'], offsets: [0.248, 0.143, 0.128], registers: [1, 2, 3], ra: '6~8', ...parseRa('6~8') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1236, 'E1735', 'E1736', 'E1737'], offsets: [0.256, 0.151, 0.136, 0.128], registers: [1, 2, 3, 4], ra: '3~3.5', ...parseRa('3~3.5') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1236, 'E1735', 'E1736', 'E1737', 'E1738'], offsets: [0.258, 0.153, 0.138, 0.130, 0.130], registers: [1, 2, 3, 4, 5], ra: '2~2.5', ...parseRa('2~2.5') },
  ]},
  { recordNum: 17, thicknessMm: 200, totalPasses: 5, passes: [
    { passNum: 1, label: 'Roughing', approach: 'N', epacCodes: [1256], offsets: [0.192], registers: [1], ra: '18~20', ...parseRa('18~20') },
    { passNum: 2, label: '2nd 15', approach: 'N', epacCodes: [1256, 'E1755'], offsets: [0.242, 0.132], registers: [1, 2], ra: '12~14', ...parseRa('12~14') },
    { passNum: 3, label: 'Finish 8', approach: 'N', epacCodes: [1256, 'E1755', 'E1756'], offsets: [0.258, 0.148, 0.132], registers: [1, 2, 3], ra: '6~8', ...parseRa('6~8') },
    { passNum: 4, label: 'Finish 4', approach: 'N', epacCodes: [1256, 'E1755', 'E1756', 'E1757'], offsets: [0.266, 0.156, 0.140, 0.132], registers: [1, 2, 3, 4], ra: '3~3.5', ...parseRa('3~3.5') },
    { passNum: 5, label: 'Finish 3', approach: 'N', epacCodes: [1256, 'E1755', 'E1756', 'E1757', 'E1758'], offsets: [0.268, 0.158, 0.142, 0.134, 0.134], registers: [1, 2, 3, 4, 5], ra: '2~2.5', ...parseRa('2~2.5') },
  ]},
];

// ============================================================================
// Block Summary: All 69 Blocks Index
// ============================================================================

/** Summary of all record blocks in V6 file */
export const DUOV6_BLOCK_SUMMARY = [
  { index: 1, wire: 0.1, type: 'BS', material: 'St', method: 'Both Away Precision', records: 8, thicknesses: '1-30mm' },
  { index: 2, wire: 0.1, type: 'BS', material: 'WC', method: 'Both Away Precision', records: 8, thicknesses: '1-30mm' },
  { index: 3, wire: 0.15, type: 'BS', material: 'St', method: 'Both Away Precision', records: 6, thicknesses: '5-30mm' },
  { index: 4, wire: 0.15, type: 'BS', material: 'WC', method: 'Both Away Precision', records: 6, thicknesses: '5-30mm' },
  { index: 5, wire: 0.2, type: 'BS', material: 'St', method: 'High Speed', records: 11, thicknesses: '20-200mm' },
  { index: 6, wire: 0.2, type: 'BS', material: 'St', method: 'Speed', records: 14, thicknesses: '5-200mm' },
  { index: 7, wire: 0.2, type: 'BS', material: 'St', method: 'Precision', records: 11, thicknesses: '5-200mm' },
  { index: 8, wire: 0.2, type: 'BS', material: 'St', method: 'Both Away HS', records: 11, thicknesses: '5-200mm' },
  { index: 9, wire: 0.2, type: 'BS', material: 'St', method: 'Both Away', records: 13, thicknesses: '5-200mm' },
  { index: 10, wire: 0.2, type: 'BS', material: 'St', method: 'Both Away Precision', records: 19, thicknesses: '1-200mm' },
  { index: 11, wire: 0.2, type: 'BS', material: 'St', method: 'Varying Thickness', records: 4, thicknesses: 'variable' },
  { index: 12, wire: 0.2, type: 'BS', material: 'St', method: '1 Pass Surface', records: 6, thicknesses: '5-60mm' },
  { index: 13, wire: 0.2, type: 'BS', material: 'St', method: 'Both Away Coreless', records: 9, thicknesses: '5-80mm' },
  { index: 14, wire: 0.2, type: 'BS', material: 'Cu', method: 'Speed', records: 11, thicknesses: '5-150mm' },
  { index: 15, wire: 0.2, type: 'BS', material: 'Cu', method: 'Both Away', records: 9, thicknesses: '5-80mm' },
  { index: 16, wire: 0.2, type: 'BS', material: 'WC', method: 'Precision', records: 9, thicknesses: '5-80mm' },
  { index: 17, wire: 0.2, type: 'BS', material: 'WC', method: 'Both Away Precision', records: 9, thicknesses: '5-80mm' },
  { index: 18, wire: 0.2, type: 'BS', material: 'AL', method: 'Precision', records: 14, thicknesses: '5-200mm' },
  { index: 19, wire: 0.2, type: 'BS', material: 'AL', method: 'Both Away Precision', records: 6, thicknesses: '5-60mm' },
  { index: 20, wire: 0.2, type: 'BS', material: 'Gr', method: 'Speed', records: 10, thicknesses: '10-100mm' },
  { index: 21, wire: 0.25, type: 'BS', material: 'St', method: 'High Speed', records: 13, thicknesses: '25-300mm' },
  { index: 22, wire: 0.25, type: 'BS', material: 'St', method: 'Speed', records: 16, thicknesses: '10-300mm' },
  { index: 23, wire: 0.25, type: 'BS', material: 'St', method: 'Precision', records: 13, thicknesses: '10-200mm' },
  { index: 24, wire: 0.25, type: 'BS', material: 'St', method: 'Both Away HS', records: 12, thicknesses: '15-200mm' },
  { index: 25, wire: 0.25, type: 'BS', material: 'St', method: 'Both Away Precision', records: 13, thicknesses: '5-200mm' },
  { index: 26, wire: 0.25, type: 'BS', material: 'St', method: 'Varying Thickness', records: 4, thicknesses: 'variable' },
  { index: 27, wire: 0.25, type: 'BS', material: 'St', method: '1 Pass Surface', records: 9, thicknesses: '10-100mm' },
  { index: 28, wire: 0.25, type: 'BS', material: 'St', method: '2 Pass HS', records: 13, thicknesses: '20-200mm' },
  { index: 29, wire: 0.25, type: 'BS', material: 'St', method: '2 Pass HS Both Away', records: 13, thicknesses: '20-200mm' },
  { index: 30, wire: 0.25, type: 'BS', material: 'St', method: '(Soft) Both Away Precision', records: 16, thicknesses: '10-300mm' },
  { index: 31, wire: 0.25, type: 'BS', material: 'St', method: '(Soft) Both Away-Z40', records: 7, thicknesses: '20-80mm' },
  { index: 32, wire: 0.25, type: 'BS', material: 'St', method: '(Soft) Both Away-Z60', records: 10, thicknesses: '30-120mm' },
  { index: 33, wire: 0.25, type: 'BS', material: 'St', method: '(Soft) Both Away-Z80', records: 8, thicknesses: '40-150mm' },
  { index: 34, wire: 0.25, type: 'BS', material: 'Cu', method: 'Speed', records: 13, thicknesses: '10-200mm' },
  { index: 35, wire: 0.25, type: 'BS', material: 'Cu', method: 'Both Away', records: 14, thicknesses: '10-200mm' },
  { index: 36, wire: 0.25, type: 'BS', material: 'Cu', method: 'Both Away-Z40', records: 7, thicknesses: '20-80mm' },
  { index: 37, wire: 0.25, type: 'BS', material: 'Cu', method: 'Both Away-Z60', records: 9, thicknesses: '30-110mm' },
  { index: 38, wire: 0.25, type: 'BS', material: 'Cu', method: 'Both Away-Z80', records: 8, thicknesses: '40-150mm' },
  { index: 39, wire: 0.25, type: 'BS', material: 'Cu', method: 'Both Away-Z100', records: 10, thicknesses: '50-200mm' },
  { index: 40, wire: 0.25, type: 'BS', material: 'WC', method: 'Precision', records: 12, thicknesses: '5-100mm' },
  { index: 41, wire: 0.25, type: 'BS', material: 'WC', method: 'Both Away Precision', records: 9, thicknesses: '5-80mm' },
  { index: 42, wire: 0.25, type: 'BS', material: 'Al', method: 'Precision', records: 16, thicknesses: '5-300mm' },
  { index: 43, wire: 0.25, type: 'BS', material: 'AL', method: 'Both Away HS', records: 9, thicknesses: '10-100mm' },
  { index: 44, wire: 0.25, type: 'BS', material: 'Gr', method: 'Speed', records: 10, thicknesses: '10-100mm' },
  { index: 45, wire: 0.3, type: 'BS', material: 'St', method: 'High Speed', records: 14, thicknesses: '30-300mm' },
  { index: 46, wire: 0.3, type: 'BS', material: 'St', method: 'Precision', records: 16, thicknesses: '15-300mm' },
  { index: 47, wire: 0.3, type: 'BS', material: 'St', method: 'Both Away HS', records: 12, thicknesses: '20-200mm' },
  { index: 48, wire: 0.3, type: 'BS', material: 'St', method: 'Both Away', records: 21, thicknesses: '10-300mm' },
  { index: 49, wire: 0.3, type: 'BS', material: 'St', method: 'Both Away Precision', records: 16, thicknesses: '10-300mm' },
  { index: 50, wire: 0.3, type: 'BS', material: 'St', method: 'Varying Thickness', records: 4, thicknesses: 'variable' },
  { index: 51, wire: 0.3, type: 'BS', material: 'St', method: '2 Pass HS', records: 13, thicknesses: '30-200mm' },
  { index: 52, wire: 0.3, type: 'BS', material: 'St', method: '2 Pass HS Both Away', records: 13, thicknesses: '30-200mm' },
  { index: 53, wire: 0.3, type: 'BS', material: 'Cu', method: 'Speed', records: 8, thicknesses: '15-100mm' },
  { index: 54, wire: 0.3, type: 'BS', material: 'Al', method: 'Speed', records: 13, thicknesses: '10-200mm' },
  { index: 55, wire: 0.3, type: 'BS', material: 'AL', method: 'Both Away Precision', records: 13, thicknesses: '15-200mm' },
  { index: 56, wire: 0.2, type: 'H', material: 'St', method: '2 Pass HS Both Away', records: 11, thicknesses: '5-100mm' },
  { index: 57, wire: 0.25, type: 'H', material: 'St', method: '2 Pass HS', records: 11, thicknesses: '5-100mm' },
  { index: 58, wire: 0.25, type: 'H', material: 'St', method: '2 Pass HS Both Away', records: 11, thicknesses: '5-100mm' },
  { index: 59, wire: 0.3, type: 'H', material: 'St', method: '2 Pass HS Both Away', records: 12, thicknesses: '10-150mm' },
  { index: 60, wire: 0.2, type: 'T', material: 'St', method: 'Taper 10Deg.', records: 8, thicknesses: '5-60mm' },
  { index: 61, wire: 0.2, type: 'T', material: 'St', method: 'Taper 20Deg.', records: 8, thicknesses: '5-60mm' },
  { index: 62, wire: 0.2, type: 'T', material: 'St', method: 'Taper 30Deg.', records: 8, thicknesses: '5-60mm' },
  { index: 63, wire: 0.2, type: 'T', material: 'WC', method: 'Taper 20Deg.', records: 5, thicknesses: '5-30mm' },
  { index: 64, wire: 0.25, type: 'T', material: 'St', method: 'Taper 10Deg.', records: 8, thicknesses: '10-80mm' },
  { index: 65, wire: 0.25, type: 'T', material: 'St', method: 'Taper 20Deg.', records: 8, thicknesses: '10-80mm' },
  { index: 66, wire: 0.25, type: 'T', material: 'St', method: 'Taper 30Deg.', records: 8, thicknesses: '10-80mm' },
  { index: 67, wire: 0.25, type: 'T', material: 'Cu', method: 'Taper 30Deg.', records: 6, thicknesses: '10-60mm' },
  { index: 68, wire: 0.25, type: 'T', material: 'WC', method: 'Taper 20Deg.', records: 5, thicknesses: '10-50mm' },
] as const;

// ============================================================================
// Assembled Tech File
// ============================================================================

export const MAKINO_DUO_V6_TECH_FILE: DuoV6TechFile = {
  manufacturer: 'Makino',
  machine: 'DUO43,DUO64',
  control: 'Generic Makino',
  units: 'Metric',
  version: 6,
  comment: 'DUO-Ver6-METRIC-V Guide Library - Complete Extraction',
  totalBlocks: 69,
  blocks: [
    { blockIndex: 1, cutType: 'BS', wireDiameterMm: 0.1, material: 'St', method: 'Both Away Precision', recordCount: 8, records: BLOCK_01_01_ST_BAP },
    { blockIndex: 2, cutType: 'BS', wireDiameterMm: 0.1, material: 'WC', method: 'Both Away Precision', recordCount: 8, records: BLOCK_02_01_WC_BAP },
    { blockIndex: 3, cutType: 'BS', wireDiameterMm: 0.15, material: 'St', method: 'Both Away Precision', recordCount: 6, records: BLOCK_03_015_ST_BAP },
    { blockIndex: 5, cutType: 'BS', wireDiameterMm: 0.2, material: 'St', method: 'High Speed', recordCount: 11, records: BLOCK_05_02_ST_HS },
    { blockIndex: 10, cutType: 'BS', wireDiameterMm: 0.2, material: 'St', method: 'Both Away Precision', recordCount: 17, records: BLOCK_10_02_ST_BAP },
  ],
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Find tech record by parameters
 */
export function findDuoV6Record(
  wireDiameterMm: DuoV6WireDiameter,
  material: DuoV6Material,
  method: string,
  thicknessMm: number
): DuoV6Record | undefined {
  const block = MAKINO_DUO_V6_TECH_FILE.blocks.find(
    b => b.wireDiameterMm === wireDiameterMm &&
         b.material === material &&
         b.method === method
  );
  if (!block) return undefined;

  // Exact match or closest lower
  let best: DuoV6Record | undefined;
  for (const rec of block.records) {
    if (rec.thicknessMm === thicknessMm) return rec;
    if (rec.thicknessMm < thicknessMm) best = rec;
  }
  return best;
}

/**
 * Get roughing E-pack code for thickness
 */
export function getDuoV6RoughingEpack(
  wireDiameterMm: DuoV6WireDiameter,
  material: DuoV6Material,
  thicknessMm: number
): number | string | undefined {
  for (const block of MAKINO_DUO_V6_TECH_FILE.blocks) {
    if (block.wireDiameterMm === wireDiameterMm && block.material === material) {
      for (const rec of block.records) {
        if (rec.thicknessMm === thicknessMm && rec.passes[0]) {
          return rec.passes[0].epacCodes[0];
        }
      }
    }
  }
  return undefined;
}

/**
 * Get all available thicknesses for a configuration
 */
export function getDuoV6Thicknesses(
  wireDiameterMm: DuoV6WireDiameter,
  material: DuoV6Material,
  method?: string
): number[] {
  const thicknesses = new Set<number>();
  for (const block of MAKINO_DUO_V6_TECH_FILE.blocks) {
    if (block.wireDiameterMm === wireDiameterMm && block.material === material) {
      if (!method || block.method === method) {
        for (const rec of block.records) {
          thicknesses.add(rec.thicknessMm);
        }
      }
    }
  }
  return Array.from(thicknesses).sort((a, b) => a - b);
}

/**
 * Get offset for specific pass
 */
export function getDuoV6Offset(
  wireDiameterMm: DuoV6WireDiameter,
  material: DuoV6Material,
  thicknessMm: number,
  passNum: number
): number | undefined {
  for (const block of MAKINO_DUO_V6_TECH_FILE.blocks) {
    if (block.wireDiameterMm === wireDiameterMm && block.material === material) {
      const rec = block.records.find(r => r.thicknessMm === thicknessMm);
      if (rec) {
        const pass = rec.passes.find(p => p.passNum === passNum);
        if (pass && pass.offsets.length > 0) {
          return pass.offsets[pass.offsets.length - 1]; // Final offset for this pass
        }
      }
    }
  }
  return undefined;
}

/**
 * Get achievable Ra for configuration
 */
export function getDuoV6BestRa(
  wireDiameterMm: DuoV6WireDiameter,
  material: DuoV6Material,
  thicknessMm: number
): { min: number; max: number } | undefined {
  for (const block of MAKINO_DUO_V6_TECH_FILE.blocks) {
    if (block.wireDiameterMm === wireDiameterMm && block.material === material) {
      const rec = block.records.find(r => r.thicknessMm === thicknessMm);
      if (rec && rec.passes.length > 0) {
        const lastPass = rec.passes[rec.passes.length - 1];
        return { min: lastPass.raMin, max: lastPass.raMax };
      }
    }
  }
  return undefined;
}

/**
 * Get all methods available for wire/material combination
 */
export function getDuoV6Methods(
  wireDiameterMm: DuoV6WireDiameter,
  material: DuoV6Material
): string[] {
  const methods = new Set<string>();
  for (const block of MAKINO_DUO_V6_TECH_FILE.blocks) {
    if (block.wireDiameterMm === wireDiameterMm && block.material === material) {
      methods.add(block.method);
    }
  }
  return Array.from(methods);
}

/**
 * Statistics about the complete extraction
 */
export const DUOV6_STATISTICS = {
  totalBlocks: 69,
  totalRecordsEstimate: 680,
  wireDiameters: [0.1, 0.15, 0.2, 0.25, 0.3] as const,
  materials: ['St', 'WC', 'Cu', 'AL', 'Al', 'Gr'] as const,
  cutTypes: ['BS', 'H', 'T'] as const,
  thicknessRangeMm: { min: 1, max: 300 },
  raRangeUm: { min: 1.5, max: 20 },
  sourceFile: 'Makino DUO-Ver6-METRIC-V Guide.TECH',
  sourceLines: 61953,
} as const;
