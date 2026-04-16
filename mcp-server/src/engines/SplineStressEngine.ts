/**
 * SplineStressEngine — Involute Spline Stress Calculator
 *
 * Models: Spline joint stress analysis per ANSI B92.1 / DIN 5480.
 * - Shear stress on spline teeth
 * - Compressive (bearing) stress on flanks
 * - Effective length and load sharing
 * - Misalignment derating
 * - Fretting fatigue assessment
 * - Torque capacity
 *
 * Key physics: Shear: τ = 2T/(D×h×n×L×Km).
 * Bearing: σ = 4T/(D×h×n×L×Km).
 * Where D=pitch diameter, h=tooth height, n=teeth, L=length,
 * Km=load distribution factor.
 *
 * Reference: ANSI B92.1 (involute splines),
 *            DIN 5480 (splined connections),
 *            SAE 960 (spline stress)
 *
 * Actions: spline_stress_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface SplineStressInput {
  pitch_diameter_mm?: number;
  num_teeth?: number;
  tooth_height_mm?: number;
  engagement_length_mm?: number;
  torque_nm?: number;
  power_kw?: number;
  rpm?: number;
  spline_type?: "fixed" | "sliding";
  fit_class?: "A" | "B" | "C";
  hardness_hrc?: number;
  misalignment_deg?: number;
  material_yield_mpa?: number;
  loading_type?: "static" | "alternating" | "shock";
}

export interface SplineStressResult {
  shear_stress: AtomicValue;
  bearing_stress: AtomicValue;
  shear_safety_factor: AtomicValue;
  bearing_safety_factor: AtomicValue;
  load_distribution_factor: AtomicValue;
  torque_capacity: AtomicValue;
  fretting_risk: AtomicValue;
  effective_teeth: AtomicValue;
  spline_feasible: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Load distribution Km by L/D ratio and fit class */
function calcKm(LD: number, fitClass: string, sliding: boolean): number {
  // Km increases with L/D (uneven load distribution)
  let km = 1.0;
  if (LD > 1.0) km = 1.0 + 0.2 * (LD - 1.0);
  if (LD > 2.0) km = 1.2 + 0.3 * (LD - 2.0);

  // Sliding splines have worse distribution
  if (sliding) km *= 1.1;

  // Loose fit = worse distribution
  if (fitClass === "C") km *= 1.15;
  if (fitClass === "A") km *= 0.9;

  return Math.min(km, 2.5);
}

/** Allowable stresses by application */
function allowableStresses(
  yieldMpa: number, loading: string, hardnessHrc: number
): { shear: number; bearing: number } {
  const baseFactor = loading === "static" ? 0.40 :
    loading === "alternating" ? 0.22 : 0.15; // shock

  const shear = yieldMpa * baseFactor * 0.577; // Von Mises
  const bearing = yieldMpa * baseFactor;

  // Hardened splines can take more bearing
  const hardFactor = hardnessHrc >= 58 ? 1.5 : hardnessHrc >= 45 ? 1.2 : 1.0;

  return { shear, bearing: bearing * hardFactor };
}

// ── Engine ─────────────────────────────────────────────────────────

export class SplineStressEngine {
  calculate(input: SplineStressInput): SplineStressResult {
    const warnings: string[] = [];
    const D = input.pitch_diameter_mm ?? 40;
    const n = input.num_teeth ?? 20;
    const h = input.tooth_height_mm ?? (D / n * 0.9); // module × 0.9 approx
    const L = input.engagement_length_mm ?? D;
    const rpm = input.rpm ?? 1500;
    const sliding = (input.spline_type ?? "fixed") === "sliding";
    const fitClass = input.fit_class ?? "B";
    const hardness = input.hardness_hrc ?? 30;
    const yieldMpa = input.material_yield_mpa ?? 600;
    const loading = input.loading_type ?? "static";
    const misalign = input.misalignment_deg ?? 0;

    // Torque
    let T: number; // N·mm
    if (input.torque_nm !== undefined) {
      T = input.torque_nm * 1000;
    } else {
      const P = input.power_kw ?? 10;
      T = (P * 1000 * 60) / (2 * Math.PI * rpm) * 1000;
    }

    // Load distribution
    const LD = L / D;
    let Km = calcKm(LD, fitClass, sliding);

    // Misalignment derating
    if (misalign > 0) {
      Km *= (1 + misalign * 0.5);
    }

    // Effective number of teeth (typically 75% engage evenly)
    const nEff = n * 0.75;

    // Shear stress: τ = 2T / (D × h × n_eff × L × (1/Km))
    const shearStress = (2 * T * Km) / (D * h * nEff * L);

    // Bearing stress: σ = 4T / (D × h × n_eff × L × (1/Km))
    const bearingStress = (4 * T * Km) / (D * h * nEff * L);

    // Allowable
    const allow = allowableStresses(yieldMpa, loading, hardness);

    const sfShear = allow.shear / Math.max(shearStress, 0.01);
    const sfBearing = allow.bearing / Math.max(bearingStress, 0.01);

    // Torque capacity at SF=2
    const tCapacity = (allow.bearing * D * h * nEff * L) / (4 * Km * 2) / 1000; // N·m

    // Fretting risk (0-1 scale)
    let frettingRisk = 0;
    if (sliding) frettingRisk += 0.3;
    if (loading === "alternating") frettingRisk += 0.3;
    if (loading === "shock") frettingRisk += 0.4;
    if (hardness < 40) frettingRisk += 0.2;
    frettingRisk = Math.min(1, frettingRisk);

    // Feasibility
    const feasible = sfShear >= 1.5 && sfBearing >= 1.5;

    // Warnings
    if (sfShear < 1.5) {
      warnings.push(`Shear SF=${r2(sfShear)} < 1.5 — increase engagement length or teeth`);
    }
    if (sfBearing < 1.5) {
      warnings.push(`Bearing SF=${r2(sfBearing)} < 1.5 — harden spline or increase size`);
    }
    if (LD > 2.5) {
      warnings.push(`L/D=${r1(LD)} > 2.5 — poor load distribution, consider crowned teeth`);
    }
    if (frettingRisk > 0.6) {
      warnings.push("High fretting risk — use surface treatment (phosphate, MoS₂ coating)");
    }
    if (misalign > 0.5) {
      warnings.push(`Misalignment ${misalign}° — use crowned spline or flexible coupling`);
    }
    if (sliding && hardness < 50) {
      warnings.push("Sliding spline with low hardness — wear will be accelerated");
    }

    const src = "SplineStressEngine (ANSI B92.1/DIN 5480)";

    return {
      shear_stress: mkAv(r1(shearStress), "MPa", shearStress * 0.1, src),
      bearing_stress: mkAv(r1(bearingStress), "MPa", bearingStress * 0.1, src),
      shear_safety_factor: mkAv(r2(sfShear), "×", 0.1,
        `${r0(allow.shear)}/${r1(shearStress)}`),
      bearing_safety_factor: mkAv(r2(sfBearing), "×", 0.1,
        `${r0(allow.bearing)}/${r1(bearingStress)}`),
      load_distribution_factor: mkAv(r2(Km), "Km", 0.1,
        `L/D=${r1(LD)}, ${fitClass}-fit`),
      torque_capacity: mkAv(r0(tCapacity), "N·m", tCapacity * 0.1,
        "At SF=2, bearing limit"),
      fretting_risk: mkAv(r2(frettingRisk), "0-1", 0.1,
        `${sliding ? "sliding" : "fixed"}, ${loading}`),
      effective_teeth: mkAv(r1(nEff), "teeth", 0, `75% of ${n}`),
      spline_feasible: mkAv(feasible ? 1 : 0, feasible ? "PASS" : "FAIL", 0, src),
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

export const splineStressEngine = new SplineStressEngine();
