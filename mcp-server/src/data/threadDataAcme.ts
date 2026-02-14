/**
 * PRISM MCP Server - ACME & Trapezoidal Thread Data
 * Session 7.1: Thread Calculations Engine
 * 
 * ACME: 29° thread angle (American standard for power transmission)
 * Trapezoidal: 30° thread angle (ISO metric power threads)
 */

export interface ACMEThread {
  designation: string;
  type: 'ACME' | 'STUB-ACME';
  nominalSizeInch: number;
  tpi: number;
  pitch: number;
  majorDiameter: number;
  pitchDiameter: number;
  minorDiameter: number;
  threadDepth: number;
  threadAngle: number;
  rootWidth: number;
  crestWidth: number;
}

export interface TrapezoidalThread {
  designation: string;
  nominalDiameter: number;
  pitch: number;
  majorDiameter: number;
  pitchDiameter: number;
  minorDiameter: number;
  threadDepth: number;
  threadAngle: number;
}

function calcACME(size: number, tpi: number): ACMEThread {
  const pitch = 1 / tpi;
  const h = pitch / 2; // Thread depth for ACME
  const pd = size - h;
  const md = size - 2 * h;
  return {
    designation: `${size}-${tpi} ACME`,
    type: 'ACME',
    nominalSizeInch: size, tpi, pitch,
    majorDiameter: size,
    pitchDiameter: Math.round(pd * 10000) / 10000,
    minorDiameter: Math.round(md * 10000) / 10000,
    threadDepth: Math.round(h * 10000) / 10000,
    threadAngle: 29,
    rootWidth: Math.round(0.3707 * pitch * 10000) / 10000,
    crestWidth: Math.round(0.3707 * pitch * 10000) / 10000
  };
}

function calcTr(d: number, p: number): TrapezoidalThread {
  const h = p / 2;
  const pd = d - h;
  const md = d - 2 * h;
  return {
    designation: `Tr${d}x${p}`,
    nominalDiameter: d, pitch: p,
    majorDiameter: d,
    pitchDiameter: Math.round(pd * 1000) / 1000,
    minorDiameter: Math.round(md * 1000) / 1000,
    threadDepth: Math.round(h * 1000) / 1000,
    threadAngle: 30
  };
}

export const ACME_THREADS: ACMEThread[] = [
  calcACME(0.250, 16), calcACME(0.3125, 14), calcACME(0.375, 12),
  calcACME(0.4375, 12), calcACME(0.500, 10), calcACME(0.625, 8),
  calcACME(0.750, 6), calcACME(0.875, 6), calcACME(1.000, 5),
  calcACME(1.125, 5), calcACME(1.250, 5), calcACME(1.375, 4),
  calcACME(1.500, 4), calcACME(1.750, 4), calcACME(2.000, 4),
  calcACME(2.250, 3), calcACME(2.500, 3), calcACME(2.750, 3),
  calcACME(3.000, 2), calcACME(3.500, 2), calcACME(4.000, 2),
  calcACME(4.500, 2), calcACME(5.000, 2),
];

export const STUB_ACME_THREADS: ACMEThread[] = ACME_THREADS.map(t => ({
  ...t,
  designation: t.designation.replace('ACME', 'STUB-ACME'),
  type: 'STUB-ACME' as const,
  threadDepth: Math.round(t.threadDepth * 0.6 * 10000) / 10000,
  minorDiameter: Math.round((t.majorDiameter - 2 * t.threadDepth * 0.6) * 10000) / 10000
}));

export const TRAPEZOIDAL_THREADS: TrapezoidalThread[] = [
  calcTr(8, 1.5), calcTr(9, 1.5), calcTr(10, 2), calcTr(11, 2),
  calcTr(12, 3), calcTr(14, 3), calcTr(16, 4), calcTr(18, 4),
  calcTr(20, 4), calcTr(22, 5), calcTr(24, 5), calcTr(26, 5),
  calcTr(28, 5), calcTr(30, 6), calcTr(32, 6), calcTr(34, 6),
  calcTr(36, 6), calcTr(38, 6), calcTr(40, 7), calcTr(42, 7),
  calcTr(44, 7), calcTr(46, 8), calcTr(48, 8), calcTr(50, 8),
  calcTr(52, 8), calcTr(55, 9), calcTr(60, 9), calcTr(65, 10),
  calcTr(70, 10), calcTr(75, 10), calcTr(80, 10), calcTr(85, 12),
  calcTr(90, 12), calcTr(95, 12), calcTr(100, 12),
];

// Thread tolerance classes
export interface ThreadTolerance {
  class: string;
  type: 'internal' | 'external';
  description: string;
  application: string;
}

export const UNIFIED_TOLERANCES: ThreadTolerance[] = [
  { class: '1A', type: 'external', description: 'Loose fit', application: 'Easy assembly, dirty conditions' },
  { class: '2A', type: 'external', description: 'Standard fit', application: 'General purpose (default)' },
  { class: '3A', type: 'external', description: 'Tight fit', application: 'Close tolerance, precision' },
  { class: '1B', type: 'internal', description: 'Loose fit', application: 'Easy assembly, dirty conditions' },
  { class: '2B', type: 'internal', description: 'Standard fit', application: 'General purpose (default)' },
  { class: '3B', type: 'internal', description: 'Tight fit', application: 'Close tolerance, precision' },
];

export const METRIC_TOLERANCES: ThreadTolerance[] = [
  { class: '4g6g', type: 'external', description: 'Medium fit', application: 'General mechanical' },
  { class: '6g', type: 'external', description: 'Standard fit', application: 'General purpose (default)' },
  { class: '8g', type: 'external', description: 'Loose fit', application: 'Easy assembly' },
  { class: '4H5H', type: 'internal', description: 'Medium fit', application: 'General mechanical' },
  { class: '6H', type: 'internal', description: 'Standard fit', application: 'General purpose (default)' },
  { class: '7H', type: 'internal', description: 'Loose fit', application: 'Easy assembly' },
];

export function findACMEThread(designation: string): ACMEThread | null {
  const norm = designation.toUpperCase();
  return [...ACME_THREADS, ...STUB_ACME_THREADS].find(t => 
    t.designation.toUpperCase().includes(norm) || norm.includes(t.designation.toUpperCase())
  ) || null;
}

export function findTrapezoidalThread(designation: string): TrapezoidalThread | null {
  const norm = designation.toUpperCase().replace(/\s/g, '');
  return TRAPEZOIDAL_THREADS.find(t => 
    t.designation.toUpperCase() === norm
  ) || null;
}

console.log(`[ThreadDataAcme] Loaded ${ACME_THREADS.length + STUB_ACME_THREADS.length} ACME + ${TRAPEZOIDAL_THREADS.length} Trapezoidal threads`);
