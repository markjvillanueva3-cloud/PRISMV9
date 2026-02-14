/**
 * PRISM MCP Server - Pipe Thread Data (NPT/BSP/BSPT)
 * Session 7.1: Thread Calculations Engine
 * 
 * Standards: ASME B1.20.1 (NPT), BS 21 (BSP)
 * NPT: 60° thread angle, 1:16 taper (0.75"/ft)
 * BSP: 55° thread angle (Whitworth form)
 */

export interface PipeThread {
  designation: string;
  type: 'NPT' | 'NPTF' | 'NPS' | 'BSP' | 'BSPT';
  nominalSize: string;
  tpi: number;
  majorDiameterInch: number;
  majorDiameterMM: number;
  pitchDiameterInch: number;
  minorDiameterInch: number;
  tapDrill: string;
  tapDrillDecimal: number;
  tapDrillMM: number;
  taperPerInch: number;
  threadAngle: number;
  effectiveLength: number;
  handTightTurns: number;
}

function calcNPT(size: string, tpi: number, major: number, tap: string, tapDec: number, effLen: number): PipeThread {
  const pitch = 1 / tpi;
  const pd = major - 0.8 * pitch;
  const md = major - 1.3 * pitch;
  return {
    designation: `${size}-${tpi} NPT`,
    type: 'NPT', nominalSize: size, tpi,
    majorDiameterInch: major,
    majorDiameterMM: Math.round(major * 25.4 * 100) / 100,
    pitchDiameterInch: Math.round(pd * 10000) / 10000,
    minorDiameterInch: Math.round(md * 10000) / 10000,
    tapDrill: tap, tapDrillDecimal: tapDec,
    tapDrillMM: Math.round(tapDec * 25.4 * 100) / 100,
    taperPerInch: 0.0625,
    threadAngle: 60,
    effectiveLength: effLen,
    handTightTurns: Math.round(effLen * tpi * 10) / 10
  };
}

function calcBSP(size: string, tpi: number, major: number, tap: string, tapDec: number, isTaper: boolean): PipeThread {
  const pitch = 1 / tpi;
  const pd = major - 0.6403 * pitch;
  const md = major - 1.2806 * pitch;
  return {
    designation: `${size} ${isTaper ? 'BSPT' : 'BSP'}`,
    type: isTaper ? 'BSPT' : 'BSP',
    nominalSize: size, tpi,
    majorDiameterInch: major,
    majorDiameterMM: Math.round(major * 25.4 * 100) / 100,
    pitchDiameterInch: Math.round(pd * 10000) / 10000,
    minorDiameterInch: Math.round(md * 10000) / 10000,
    tapDrill: tap, tapDrillDecimal: tapDec,
    tapDrillMM: Math.round(tapDec * 25.4 * 100) / 100,
    taperPerInch: isTaper ? 0.0625 : 0,
    threadAngle: 55,
    effectiveLength: 0.4,
    handTightTurns: 4
  };
}

export const NPT_THREADS: PipeThread[] = [
  calcNPT('1/16', 27, 0.3125, 'C', 0.242, 0.160),
  calcNPT('1/8', 27, 0.405, '21/64', 0.3281, 0.180),
  calcNPT('1/4', 18, 0.540, '7/16', 0.4375, 0.200),
  calcNPT('3/8', 18, 0.675, '37/64', 0.5781, 0.240),
  calcNPT('1/2', 14, 0.840, '23/32', 0.7188, 0.320),
  calcNPT('3/4', 14, 1.050, '59/64', 0.9219, 0.339),
  calcNPT('1', 11.5, 1.315, '1-5/32', 1.1562, 0.400),
  calcNPT('1-1/4', 11.5, 1.660, '1-1/2', 1.5000, 0.420),
  calcNPT('1-1/2', 11.5, 1.900, '1-47/64', 1.7344, 0.420),
  calcNPT('2', 11.5, 2.375, '2-7/32', 2.2188, 0.436),
  calcNPT('2-1/2', 8, 2.875, '2-5/8', 2.6250, 0.682),
  calcNPT('3', 8, 3.500, '3-1/4', 3.2500, 0.766),
  calcNPT('4', 8, 4.500, '4-1/4', 4.2500, 0.844),
  calcNPT('5', 8, 5.563, '5-9/32', 5.2812, 0.937),
  calcNPT('6', 8, 6.625, '6-11/32', 6.3438, 0.958),
];

export const NPTF_THREADS: PipeThread[] = NPT_THREADS.map(t => ({
  ...t,
  designation: t.designation.replace('NPT', 'NPTF'),
  type: 'NPTF' as const
}));

export const BSP_THREADS: PipeThread[] = [
  calcBSP('1/8', 28, 0.383, '8.8mm', 0.346, false),
  calcBSP('1/4', 19, 0.518, '11.5mm', 0.453, false),
  calcBSP('3/8', 19, 0.656, '15mm', 0.591, false),
  calcBSP('1/2', 14, 0.825, '19mm', 0.748, false),
  calcBSP('3/4', 14, 1.041, '24mm', 0.945, false),
  calcBSP('1', 11, 1.309, '30mm', 1.181, false),
  calcBSP('1-1/4', 11, 1.650, '39mm', 1.535, false),
  calcBSP('1-1/2', 11, 1.882, '45mm', 1.772, false),
  calcBSP('2', 11, 2.347, '57mm', 2.244, false),
];

export const BSPT_THREADS: PipeThread[] = BSP_THREADS.map(t => ({
  ...t,
  designation: t.designation.replace('BSP', 'BSPT'),
  type: 'BSPT' as const,
  taperPerInch: 0.0625
}));

export const ALL_PIPE_THREADS = [...NPT_THREADS, ...NPTF_THREADS, ...BSP_THREADS, ...BSPT_THREADS];

export function findPipeThread(designation: string): PipeThread | null {
  const norm = designation.toUpperCase().replace(/\s+/g, ' ').trim();
  return ALL_PIPE_THREADS.find(t => 
    t.designation.toUpperCase().includes(norm) ||
    norm.includes(t.designation.toUpperCase())
  ) || null;
}

console.log(`[ThreadDataPipe] Loaded ${ALL_PIPE_THREADS.length} pipe threads`);
