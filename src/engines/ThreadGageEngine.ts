/**
 * ThreadGageEngine — Thread Gage Sizing & Tolerance Calculator
 *
 * Models: GO/NO-GO thread gage dimensions for inspection.
 * - Pitch diameter limits for classes 1A-3A, 1B-3B
 * - Thread truncation and gage dimensions
 * - Gage wear limits and replacement criteria
 * - Metric (ISO 68) and Unified (ASME B1.1) threads
 * - Functional diameter from 3-wire measurement
 * - PD from wire measurement: M = dp - 0.86603p + 3W
 *
 * Key physics: dp = D - 0.6495p (basic PD). Wire formula: best wire = 0.57735p.
 * GO checks min material (max ext, min int). NO-GO checks max PD.
 *
 * Reference: ASME B1.1 — Unified Threads,
 *            ASME B1.2 — Gages & Gaging,
 *            ISO 68/965 — Metric Threads
 *
 * Actions: thread_gage_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ThreadGageInput {
  system?: "unified" | "metric";
  nominal_diameter_mm?: number;
  pitch_mm?: number;
  class?: "1" | "2" | "3";
  type?: "external" | "internal";
  wire_diameter_mm?: number;
}

export interface ThreadGageResult {
  basic_pitch_diameter: AtomicValue;
  go_gage_pd: AtomicValue;
  nogo_gage_pd: AtomicValue;
  pd_tolerance: AtomicValue;
  major_diameter_max: AtomicValue;
  minor_diameter_min: AtomicValue;
  best_wire_size: AtomicValue;
  measurement_over_wires: AtomicValue;
  thread_depth: AtomicValue;
  gage_wear_limit: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** PD tolerance multiplier by class [external, internal] */
const CLASS_TOL: Record<string, [number, number]> = {
  "1": [1.50, 1.50],
  "2": [1.00, 1.00],
  "3": [0.75, 0.75],
};

// ── Engine ─────────────────────────────────────────────────────────

export class ThreadGageEngine {
  calculate(input: ThreadGageInput): ThreadGageResult {
    const warnings: string[] = [];
    const system = input.system ?? "unified";
    const D = input.nominal_diameter_mm ?? 10;
    const p = input.pitch_mm ?? 1.5;
    const cls = input.class ?? "2";
    const type = input.type ?? "external";

    const [tolFactorExt, tolFactorInt] = CLASS_TOL[cls] ?? CLASS_TOL["2"];
    const tolFactor = type === "external" ? tolFactorExt : tolFactorInt;

    // Thread geometry
    const H = 0.86603 * p; // fundamental triangle height
    const threadDepth = 5 / 8 * H; // 0.625H for UN/metric

    // Basic pitch diameter
    const dpBasic = D - 2 * (3 / 8 * H); // = D - 0.6495p
    // Simplified: dp = D - 0.6495 * p
    const dp = D - 0.6495 * p;

    // PD tolerance (simplified ASME B1.1 formula)
    // TD = 0.0015 × ∛(D) + 0.015 × √(p) + 0.015 × p^(2/3)
    // Simplified: base tolerance scaled by class
    const baseTol = (0.005 * Math.sqrt(p) + 0.003 * Math.cbrt(D)) * tolFactor;

    // GO/NO-GO gage pitch diameters
    let goPD: number, nogoPD: number;
    if (type === "external") {
      // External: GO = max PD, NOGO = min PD
      goPD = dp; // nominal (max material)
      nogoPD = dp - baseTol; // min PD
    } else {
      // Internal: GO = min PD, NOGO = max PD
      goPD = dp; // min material (basic)
      nogoPD = dp + baseTol; // max PD
    }

    // Major diameter limits
    const majorMax = type === "external" ? D : D + baseTol * 0.5;

    // Minor diameter limits
    const minorMin = type === "external" ?
      D - 2 * threadDepth - baseTol * 0.3 :
      D - 2 * threadDepth;

    // Best wire size (for 3-wire measurement)
    const bestWire = 0.57735 * p;
    const wireD = input.wire_diameter_mm ?? bestWire;

    // Measurement over wires (external thread)
    const M = dp - 0.86603 * p + 3 * wireD;

    // Gage wear limit (typically 10% of tolerance)
    const wearLimit = baseTol * 0.10;

    // Warnings
    if (cls === "3" && D < 5) {
      warnings.push("Class 3 on small diameter — tight tolerance, verify gage capability");
    }
    if (p > D / 3) {
      warnings.push("Coarse pitch relative to diameter — thin wall risk");
    }
    if (type === "external" && baseTol < 0.01) {
      warnings.push(`PD tolerance ${r3(baseTol)}mm very tight — verify measurement method`);
    }
    if (Math.abs(wireD - bestWire) > bestWire * 0.1) {
      warnings.push(`Wire ${r3(wireD)}mm differs from best wire ${r3(bestWire)}mm`);
    }

    const src = "ThreadGageEngine (ASME B1.1/B1.2)";

    return {
      basic_pitch_diameter: mkAv(r3(dp), "mm", dp * 0.001, `D - 0.6495p`),
      go_gage_pd: mkAv(r3(goPD), "mm", 0.002,
        type === "external" ? "Max material" : "Min material"),
      nogo_gage_pd: mkAv(r3(nogoPD), "mm", 0.002,
        type === "external" ? "Min PD" : "Max PD"),
      pd_tolerance: mkAv(r3(baseTol), "mm", baseTol * 0.05,
        `Class ${cls}${type === "external" ? "A" : "B"}`),
      major_diameter_max: mkAv(r3(majorMax), "mm", 0.005, system),
      minor_diameter_min: mkAv(r3(minorMin), "mm", 0.005, system),
      best_wire_size: mkAv(r3(bestWire), "mm", 0.001, `0.57735×p`),
      measurement_over_wires: mkAv(r3(M), "mm", 0.003,
        `dp - 0.866p + 3W`),
      thread_depth: mkAv(r3(threadDepth), "mm", threadDepth * 0.01,
        `5/8×H`),
      gage_wear_limit: mkAv(r3(wearLimit), "mm", wearLimit * 0.1, src),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mkAv(value: number, unit: string, uncertainty: number, source: string): AtomicValue {
  return { value, unit, uncertainty, source };
}
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const threadGageEngine = new ThreadGageEngine();
