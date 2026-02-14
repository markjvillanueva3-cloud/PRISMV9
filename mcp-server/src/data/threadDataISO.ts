/**
 * PRISM MCP Server - ISO Metric Thread Data
 * Complete specifications for M1 through M100
 * Session 7.1: Thread Calculations Engine
 * 
 * Standards: ISO 261, ISO 262, ISO 965
 * Thread angle: 60°
 * 
 * Formulas:
 * - Pitch diameter (d2) = d - 0.6495 × P
 * - Minor diameter (d1) = d - 1.0825 × P
 * - Thread depth (H) = 0.6134 × P
 * - Tap drill = d - P (for ~75% engagement)
 * - Tensile stress area = π/4 × (d2 - 0.9382×P)²
 */

export interface ISOMetricThread {
  designation: string;
  nominalDiameter: number;
  pitch: number;
  majorDiameter: number;
  minorDiameter: number;
  pitchDiameter: number;
  tapDrill: number;
  tapDrill50: number;
  threadDepth: number;
  tensileArea: number;
  isFinePitch: boolean;
}

function calc(d: number, p: number, fine: boolean): ISOMetricThread {
  const pd = d - 0.6495 * p;
  const md = d - 1.0825 * p;
  const td = 0.6134 * p;
  const ta = (Math.PI / 4) * Math.pow(pd - 0.9382 * p, 2);
  return {
    designation: fine ? `M${d}x${p}` : `M${d}`,
    nominalDiameter: d, pitch: p, majorDiameter: d,
    minorDiameter: Math.round(md * 1000) / 1000,
    pitchDiameter: Math.round(pd * 1000) / 1000,
    tapDrill: Math.round((d - p) * 100) / 100,
    tapDrill50: Math.round((d - 0.5 * p) * 100) / 100,
    threadDepth: Math.round(td * 1000) / 1000,
    tensileArea: Math.round(ta * 100) / 100,
    isFinePitch: fine
  };
}

export const ISO_METRIC_COARSE: ISOMetricThread[] = [
  calc(1, 0.25, false), calc(1.1, 0.25, false), calc(1.2, 0.25, false),
  calc(1.4, 0.3, false), calc(1.6, 0.35, false), calc(1.8, 0.35, false),
  calc(2, 0.4, false), calc(2.2, 0.45, false), calc(2.5, 0.45, false),
  calc(3, 0.5, false), calc(3.5, 0.6, false), calc(4, 0.7, false),
  calc(4.5, 0.75, false), calc(5, 0.8, false), calc(5.5, 0.9, false),
  calc(6, 1, false), calc(7, 1, false), calc(8, 1.25, false),
  calc(9, 1.25, false), calc(10, 1.5, false), calc(11, 1.5, false),
  calc(12, 1.75, false), calc(14, 2, false), calc(16, 2, false),
  calc(18, 2.5, false), calc(20, 2.5, false), calc(22, 2.5, false),
  calc(24, 3, false), calc(27, 3, false), calc(30, 3.5, false),
  calc(33, 3.5, false), calc(36, 4, false), calc(39, 4, false),
  calc(42, 4.5, false), calc(45, 4.5, false), calc(48, 5, false),
  calc(52, 5, false), calc(56, 5.5, false), calc(60, 5.5, false),
  calc(64, 6, false), calc(68, 6, false), calc(72, 6, false),
  calc(76, 6, false), calc(80, 6, false), calc(85, 6, false),
  calc(90, 6, false), calc(95, 6, false), calc(100, 6, false),
];

export const ISO_METRIC_FINE: ISOMetricThread[] = [
  // M1-M3
  calc(1, 0.2, true), calc(1.2, 0.2, true), calc(1.4, 0.2, true),
  calc(1.6, 0.2, true), calc(1.8, 0.2, true), calc(2, 0.25, true),
  calc(2.5, 0.35, true), calc(3, 0.35, true),
  // M4-M6
  calc(4, 0.5, true), calc(5, 0.5, true),
  calc(6, 0.5, true), calc(6, 0.75, true),
  // M8
  calc(8, 0.5, true), calc(8, 0.75, true), calc(8, 1, true),
  // M10
  calc(10, 0.5, true), calc(10, 0.75, true), calc(10, 1, true), calc(10, 1.25, true),
  // M12
  calc(12, 1, true), calc(12, 1.25, true), calc(12, 1.5, true),
  // M14
  calc(14, 1, true), calc(14, 1.25, true), calc(14, 1.5, true),
  // M16
  calc(16, 1, true), calc(16, 1.25, true), calc(16, 1.5, true),
  // M18
  calc(18, 1, true), calc(18, 1.5, true), calc(18, 2, true),
  // M20
  calc(20, 1, true), calc(20, 1.5, true), calc(20, 2, true),
  // M22
  calc(22, 1, true), calc(22, 1.5, true), calc(22, 2, true),
  // M24
  calc(24, 1, true), calc(24, 1.5, true), calc(24, 2, true),
  // M27
  calc(27, 1, true), calc(27, 1.5, true), calc(27, 2, true),
  // M30
  calc(30, 1, true), calc(30, 1.5, true), calc(30, 2, true), calc(30, 3, true),
  // M33
  calc(33, 1.5, true), calc(33, 2, true), calc(33, 3, true),
  // M36
  calc(36, 1.5, true), calc(36, 2, true), calc(36, 3, true),
  // M39
  calc(39, 1.5, true), calc(39, 2, true), calc(39, 3, true),
  // M42
  calc(42, 1.5, true), calc(42, 2, true), calc(42, 3, true), calc(42, 4, true),
  // M45
  calc(45, 1.5, true), calc(45, 2, true), calc(45, 3, true), calc(45, 4, true),
  // M48
  calc(48, 1.5, true), calc(48, 2, true), calc(48, 3, true), calc(48, 4, true),
  // M52-M100
  calc(52, 1.5, true), calc(52, 2, true), calc(52, 3, true), calc(52, 4, true),
  calc(56, 1.5, true), calc(56, 2, true), calc(56, 3, true), calc(56, 4, true),
  calc(60, 1.5, true), calc(60, 2, true), calc(60, 3, true), calc(60, 4, true),
  calc(64, 2, true), calc(64, 3, true), calc(64, 4, true),
  calc(68, 2, true), calc(68, 3, true), calc(68, 4, true),
  calc(72, 2, true), calc(72, 3, true), calc(72, 4, true),
  calc(76, 2, true), calc(76, 3, true), calc(76, 4, true),
  calc(80, 2, true), calc(80, 3, true), calc(80, 4, true),
  calc(90, 2, true), calc(90, 3, true), calc(90, 4, true),
  calc(100, 2, true), calc(100, 3, true), calc(100, 4, true),
];

export const ALL_ISO_METRIC = [...ISO_METRIC_COARSE, ...ISO_METRIC_FINE];

export function findISOMetricThread(designation: string): ISOMetricThread | null {
  const norm = designation.toUpperCase().replace(/\s/g, '');
  // Try exact match first
  const exact = ALL_ISO_METRIC.find(t => t.designation.toUpperCase() === norm);
  if (exact) return exact;
  
  // Fallback: parse M{d}x{p} and match by diameter+pitch (handles coarse pitch with explicit notation e.g. M10x1.5 → M10)
  const match = norm.match(/^M(\d+(?:\.\d+)?)(?:X(\d+(?:\.\d+)?))?$/);
  if (match) {
    const d = parseFloat(match[1]);
    const p = match[2] ? parseFloat(match[2]) : null;
    if (p !== null) {
      const byParams = ALL_ISO_METRIC.find(t => t.nominalDiameter === d && t.pitch === p);
      if (byParams) return byParams;
    } else {
      return getISOCoarsePitch(d);
    }
  }
  return null;
}

export function getISOCoarsePitch(diameter: number): ISOMetricThread | null {
  return ISO_METRIC_COARSE.find(t => t.nominalDiameter === diameter) || null;
}

console.log(`[ThreadDataISO] Loaded ${ALL_ISO_METRIC.length} ISO metric threads`);
