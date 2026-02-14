/**
 * PRISM MCP Server - Unified Thread Data (UNC/UNF/UNEF)
 * Session 7.1: Thread Calculations Engine
 * 
 * Standards: ASME B1.1
 * Thread angle: 60°
 * 
 * UNC = Unified National Coarse
 * UNF = Unified National Fine
 * UNEF = Unified National Extra Fine
 */

export interface UnifiedThread {
  designation: string;
  series: 'UNC' | 'UNF' | 'UNEF';
  size: string;
  tpi: number;
  majorDiameterInch: number;
  majorDiameterMM: number;
  minorDiameterInch: number;
  minorDiameterMM: number;
  pitchDiameterInch: number;
  pitchDiameterMM: number;
  tapDrill75: string;
  tapDrill75Decimal: number;
  tapDrill50: string;
  tapDrill50Decimal: number;
  pitchMM: number;
}

function calcU(size: string, tpi: number, major: number, series: 'UNC' | 'UNF' | 'UNEF', 
               tap75: string, tap75d: number, tap50: string, tap50d: number): UnifiedThread {
  const pitch = 25.4 / tpi;
  const pd = major - 0.6495 * (1 / tpi);
  const md = major - 1.0825 * (1 / tpi);
  return {
    designation: `${size}-${tpi} ${series}`,
    series, size, tpi,
    majorDiameterInch: major,
    majorDiameterMM: Math.round(major * 25.4 * 1000) / 1000,
    minorDiameterInch: Math.round(md * 10000) / 10000,
    minorDiameterMM: Math.round(md * 25.4 * 1000) / 1000,
    pitchDiameterInch: Math.round(pd * 10000) / 10000,
    pitchDiameterMM: Math.round(pd * 25.4 * 1000) / 1000,
    tapDrill75: tap75, tapDrill75Decimal: tap75d,
    tapDrill50: tap50, tapDrill50Decimal: tap50d,
    pitchMM: Math.round(pitch * 1000) / 1000
  };
}

export const UNC_THREADS: UnifiedThread[] = [
  // Number sizes
  calcU('#0', 80, 0.0600, 'UNC', '3/64', 0.0469, '#52', 0.0635),
  calcU('#1', 64, 0.0730, 'UNC', '#53', 0.0595, '#51', 0.0670),
  calcU('#2', 56, 0.0860, 'UNC', '#50', 0.0700, '#48', 0.0760),
  calcU('#3', 48, 0.0990, 'UNC', '#47', 0.0785, '#44', 0.0860),
  calcU('#4', 40, 0.1120, 'UNC', '#43', 0.0890, '#41', 0.0960),
  calcU('#5', 40, 0.1250, 'UNC', '#38', 0.1015, '#36', 0.1065),
  calcU('#6', 32, 0.1380, 'UNC', '#36', 0.1065, '#32', 0.1160),
  calcU('#8', 32, 0.1640, 'UNC', '#29', 0.1360, '#27', 0.1440),
  calcU('#10', 24, 0.1900, 'UNC', '#25', 0.1495, '#20', 0.1610),
  calcU('#12', 24, 0.2160, 'UNC', '#16', 0.1770, '#12', 0.1890),
  
  // Fractional sizes
  calcU('1/4', 20, 0.2500, 'UNC', '#7', 0.2010, '#3', 0.2130),
  calcU('5/16', 18, 0.3125, 'UNC', 'F', 0.2570, 'H', 0.2660),
  calcU('3/8', 16, 0.3750, 'UNC', '5/16', 0.3125, 'Q', 0.3320),
  calcU('7/16', 14, 0.4375, 'UNC', 'U', 0.3680, '25/64', 0.3906),
  calcU('1/2', 13, 0.5000, 'UNC', '27/64', 0.4219, '29/64', 0.4531),
  calcU('9/16', 12, 0.5625, 'UNC', '31/64', 0.4844, '33/64', 0.5156),
  calcU('5/8', 11, 0.6250, 'UNC', '17/32', 0.5312, '9/16', 0.5625),
  calcU('3/4', 10, 0.7500, 'UNC', '21/32', 0.6562, '11/16', 0.6875),
  calcU('7/8', 9, 0.8750, 'UNC', '49/64', 0.7656, '13/16', 0.8125),
  calcU('1', 8, 1.0000, 'UNC', '7/8', 0.8750, '59/64', 0.9219),
  calcU('1-1/8', 7, 1.1250, 'UNC', '63/64', 0.9844, '1-1/64', 1.0156),
  calcU('1-1/4', 7, 1.2500, 'UNC', '1-7/64', 1.1094, '1-9/64', 1.1406),
  calcU('1-3/8', 6, 1.3750, 'UNC', '1-7/32', 1.2188, '1-1/4', 1.2500),
  calcU('1-1/2', 6, 1.5000, 'UNC', '1-11/32', 1.3438, '1-3/8', 1.3750),
  calcU('1-3/4', 5, 1.7500, 'UNC', '1-35/64', 1.5469, '1-19/32', 1.5938),
  calcU('2', 4.5, 2.0000, 'UNC', '1-25/32', 1.7812, '1-13/16', 1.8125),
];

export const UNF_THREADS: UnifiedThread[] = [
  // Number sizes
  calcU('#0', 80, 0.0600, 'UNF', '3/64', 0.0469, '#52', 0.0635),
  calcU('#1', 72, 0.0730, 'UNF', '#53', 0.0595, '#52', 0.0635),
  calcU('#2', 64, 0.0860, 'UNF', '#50', 0.0700, '#49', 0.0730),
  calcU('#3', 56, 0.0990, 'UNF', '#45', 0.0820, '#44', 0.0860),
  calcU('#4', 48, 0.1120, 'UNF', '#42', 0.0935, '#41', 0.0960),
  calcU('#5', 44, 0.1250, 'UNF', '#37', 0.1040, '#35', 0.1100),
  calcU('#6', 40, 0.1380, 'UNF', '#33', 0.1130, '#31', 0.1200),
  calcU('#8', 36, 0.1640, 'UNF', '#29', 0.1360, '#28', 0.1405),
  calcU('#10', 32, 0.1900, 'UNF', '#21', 0.1590, '#19', 0.1660),
  calcU('#12', 28, 0.2160, 'UNF', '#14', 0.1820, '#11', 0.1910),
  
  // Fractional sizes
  calcU('1/4', 28, 0.2500, 'UNF', '#3', 0.2130, '#1', 0.2280),
  calcU('5/16', 24, 0.3125, 'UNF', 'I', 0.2720, 'J', 0.2770),
  calcU('3/8', 24, 0.3750, 'UNF', 'Q', 0.3320, 'R', 0.3390),
  calcU('7/16', 20, 0.4375, 'UNF', '25/64', 0.3906, 'W', 0.3860),
  calcU('1/2', 20, 0.5000, 'UNF', '29/64', 0.4531, '15/32', 0.4688),
  calcU('9/16', 18, 0.5625, 'UNF', '33/64', 0.5156, '17/32', 0.5312),
  calcU('5/8', 18, 0.6250, 'UNF', '37/64', 0.5781, '19/32', 0.5938),
  calcU('3/4', 16, 0.7500, 'UNF', '11/16', 0.6875, '45/64', 0.7031),
  calcU('7/8', 14, 0.8750, 'UNF', '13/16', 0.8125, '53/64', 0.8281),
  calcU('1', 12, 1.0000, 'UNF', '15/16', 0.9375, '61/64', 0.9531),
  calcU('1-1/8', 12, 1.1250, 'UNF', '1-3/64', 1.0469, '1-1/16', 1.0625),
  calcU('1-1/4', 12, 1.2500, 'UNF', '1-11/64', 1.1719, '1-3/16', 1.1875),
  calcU('1-3/8', 12, 1.3750, 'UNF', '1-19/64', 1.2969, '1-5/16', 1.3125),
  calcU('1-1/2', 12, 1.5000, 'UNF', '1-27/64', 1.4219, '1-7/16', 1.4375),
];

export const UNEF_THREADS: UnifiedThread[] = [
  calcU('#12', 32, 0.2160, 'UNEF', '#13', 0.1850, '#10', 0.1935),
  calcU('1/4', 32, 0.2500, 'UNEF', '#7', 0.2010, '#4', 0.2090),
  calcU('5/16', 32, 0.3125, 'UNEF', '9/32', 0.2812, 'L', 0.2900),
  calcU('3/8', 32, 0.3750, 'UNEF', '11/32', 0.3438, 'T', 0.3580),
  calcU('7/16', 28, 0.4375, 'UNEF', '13/32', 0.4062, 'Y', 0.4040),
  calcU('1/2', 28, 0.5000, 'UNEF', '15/32', 0.4688, '31/64', 0.4844),
  calcU('9/16', 24, 0.5625, 'UNEF', '33/64', 0.5156, '17/32', 0.5312),
  calcU('5/8', 24, 0.6250, 'UNEF', '37/64', 0.5781, '19/32', 0.5938),
  calcU('3/4', 20, 0.7500, 'UNEF', '45/64', 0.7031, '23/32', 0.7188),
  calcU('7/8', 20, 0.8750, 'UNEF', '53/64', 0.8281, '27/32', 0.8438),
  calcU('1', 20, 1.0000, 'UNEF', '61/64', 0.9531, '31/32', 0.9688),
];

export const ALL_UNIFIED = [...UNC_THREADS, ...UNF_THREADS, ...UNEF_THREADS];

export function findUnifiedThread(designation: string): UnifiedThread | null {
  const norm = designation.toUpperCase().replace(/\s+/g, ' ').trim();
  return ALL_UNIFIED.find(t => t.designation.toUpperCase() === norm) || null;
}

export function getUnifiedThreadsForSize(size: string): UnifiedThread[] {
  return ALL_UNIFIED.filter(t => t.size === size);
}

console.log(`[ThreadDataUnified] Loaded ${ALL_UNIFIED.length} Unified threads`);
