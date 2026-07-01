/**
 * WireRopeEngine — Wire Rope Selection & Analysis Calculator
 *
 * Models: Wire rope load capacity and service life.
 * - Minimum breaking load from diameter and grade
 * - Working load limit with design factor
 * - D/d ratio for sheave/drum sizing
 * - Bending fatigue life estimation
 * - Efficiency loss over sheaves
 * - Fleet angle and reeving analysis
 *
 * Key physics: MBL = K × d². WLL = MBL / DF.
 * Bend life ∝ (D/d)². Efficiency = η^n sheaves.
 *
 * Reference: Wire Rope Technical Board — Wire Rope Users Manual,
 *            ASME B30.5 — Crawler/Truck Cranes,
 *            ISO 4309 — Wire Rope Inspection
 *
 * Actions: wire_rope_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface WireRopeInput {
  rope_diameter_mm?: number;
  rope_grade?: "1570" | "1770" | "1960" | "2160";
  construction?: "6x19" | "6x37" | "8x19" | "19x7";
  num_sheaves?: number;
  sheave_diameter_mm?: number;
  drum_diameter_mm?: number;
  fleet_angle_deg?: number;
  applied_load_kn?: number;
  num_parts?: number; // reeving parts
  service?: "normal" | "heavy" | "severe";
}

export interface WireRopeResult {
  minimum_breaking_load: AtomicValue;
  working_load_limit: AtomicValue;
  design_factor: AtomicValue;
  safety_factor: AtomicValue;
  d_d_ratio_sheave: AtomicValue;
  d_d_ratio_drum: AtomicValue;
  system_efficiency: AtomicValue;
  line_pull: AtomicValue;
  bend_life_factor: AtomicValue;
  fleet_angle_check: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Grade → K factor (MBL = K × d² in kN, d in mm) */
const GRADE_K: Record<string, number> = {
  "1570": 0.0446, "1770": 0.0503, "1960": 0.0557, "2160": 0.0614,
};

/** Construction → fill factor (affects MBL) */
const FILL_FACTOR: Record<string, number> = {
  "6x19": 0.40, "6x37": 0.38, "8x19": 0.36, "19x7": 0.46,
};

/** Min D/d ratios by construction */
const MIN_DD: Record<string, number> = {
  "6x19": 34, "6x37": 18, "8x19": 21, "19x7": 51,
};

/** Service design factors */
const SERVICE_DF: Record<string, number> = {
  normal: 5, heavy: 6, severe: 8,
};

// ── Engine ─────────────────────────────────────────────────────────

export class WireRopeEngine {
  calculate(input: WireRopeInput): WireRopeResult {
    const warnings: string[] = [];
    const d = input.rope_diameter_mm ?? 16;
    const grade = input.rope_grade ?? "1770";
    const constr = input.construction ?? "6x37";
    const nSheaves = input.num_sheaves ?? 2;
    const Dsheave = input.sheave_diameter_mm ?? d * 25;
    const Ddrum = input.drum_diameter_mm ?? d * 20;
    const fleet = input.fleet_angle_deg ?? 1.5;
    const Fapplied = input.applied_load_kn ?? 50;
    const nParts = input.num_parts ?? 4;
    const service = input.service ?? "normal";

    const K = GRADE_K[grade] ?? 0.0503;
    const fill = FILL_FACTOR[constr] ?? 0.38;
    const minDd = MIN_DD[constr] ?? 18;
    const df = SERVICE_DF[service] ?? 5;

    // Minimum breaking load
    const MBL = K * d * d * (fill / 0.40); // adjusted for construction

    // Working load limit
    const WLL = MBL / df;

    // D/d ratios
    const ddSheave = Dsheave / d;
    const ddDrum = Ddrum / d;

    // System efficiency (η per sheave ≈ 0.98 for roller bearing)
    const etaPerSheave = 0.98;
    const sysEff = Math.pow(etaPerSheave, nSheaves);

    // Line pull (force per rope part)
    const linePull = Fapplied / (nParts * sysEff);

    // Safety factor
    const SF = MBL / Math.max(linePull, 0.01);

    // Bend life factor (relative to ideal D/d)
    const bendLife = Math.pow(ddSheave / minDd, 2);

    // Fleet angle check (max 1.5° for smooth drum, 2° for grooved)
    const fleetOk = fleet <= 2.0 ? 1 : 0;

    // Warnings
    if (SF < df) {
      warnings.push(`Safety factor ${r1(SF)} < design factor ${df} — upsize rope`);
    }
    if (ddSheave < minDd) {
      warnings.push(`Sheave D/d ${r0(ddSheave)} < min ${minDd} for ${constr} — accelerated wear`);
    }
    if (ddDrum < minDd * 0.8) {
      warnings.push(`Drum D/d ${r0(ddDrum)} < ${r0(minDd * 0.8)} — severe bending fatigue`);
    }
    if (fleet > 2.0) {
      warnings.push(`Fleet angle ${fleet}° > 2° — rope tracking and wear issues`);
    }
    if (fleet > 4.0) {
      warnings.push(`Fleet angle ${fleet}° > 4° — rope will jump sheave groove`);
    }
    if (linePull > MBL * 0.5) {
      warnings.push(`Line pull ${r1(linePull)}kN > 50% MBL — near elastic limit`);
    }

    const src = "WireRopeEngine (WRTB/ASME B30.5)";

    return {
      minimum_breaking_load: mkAv(r1(MBL), "kN", MBL * 0.05, `K×d² grade ${grade}`),
      working_load_limit: mkAv(r1(WLL), "kN", WLL * 0.05, `MBL/DF`),
      design_factor: mkAv(df, "×", 0, service),
      safety_factor: mkAv(r1(SF), "×", SF * 0.05, `MBL/line_pull`),
      d_d_ratio_sheave: mkAv(r0(ddSheave), "×", 0, `min ${minDd}`),
      d_d_ratio_drum: mkAv(r0(ddDrum), "×", 0, `min ${r0(minDd * 0.8)}`),
      system_efficiency: mkAv(r2(sysEff), "×", sysEff * 0.02, `η^${nSheaves}`),
      line_pull: mkAv(r1(linePull), "kN", linePull * 0.05, `F/(n×η)`),
      bend_life_factor: mkAv(r2(bendLife), "×", bendLife * 0.1, `(D/d / min)²`),
      fleet_angle_check: mkAv(fleetOk, fleetOk ? "OK" : "FAIL", 0, src),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mkAv(value: number, unit: string, uncertainty: number, source: string): AtomicValue {
  return { value, unit, uncertainty, source };
}
function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }

export const wireRopeEngine = new WireRopeEngine();
