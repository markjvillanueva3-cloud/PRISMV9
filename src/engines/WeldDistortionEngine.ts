/**
 * WeldDistortionEngine — Welding Distortion Prediction & Mitigation
 *
 * Models: Thermal distortion from welding processes.
 * - Angular distortion from fillet/butt welds
 * - Longitudinal shrinkage
 * - Transverse shrinkage
 * - Buckling distortion for thin plates
 * - Preheat temperature recommendation
 * - Restraint and sequence optimization
 *
 * Key physics: δ_trans = C×Aw/t. θ = C×q/(v×t²).
 * Longitudinal shrinkage ∝ heat input × cross-section ratio.
 * Preheat from carbon equivalent CE = C + Mn/6 + (Cr+Mo+V)/5 + (Cu+Ni)/15.
 *
 * Reference: Masubuchi — Analysis of Welded Structures,
 *            AWS D1.1 — Structural Welding,
 *            TWI Distortion Guidelines
 *
 * Actions: weld_distortion_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface WeldDistortionInput {
  joint_type?: "butt" | "fillet_t" | "fillet_lap" | "corner";
  plate_thickness_mm?: number;
  weld_length_mm?: number;
  leg_size_mm?: number;
  heat_input_kj_mm?: number;
  material?: "mild_steel" | "stainless" | "aluminum" | "high_strength";
  restraint_level?: "free" | "moderate" | "rigid";
  num_passes?: number;
  joint_gap_mm?: number;
}

export interface WeldDistortionResult {
  angular_distortion: AtomicValue;
  transverse_shrinkage: AtomicValue;
  longitudinal_shrinkage: AtomicValue;
  buckling_risk: AtomicValue;
  preheat_temp: AtomicValue;
  carbon_equivalent: AtomicValue;
  interpass_temp: AtomicValue;
  residual_stress: AtomicValue;
  mitigation_score: AtomicValue;
  recommended_sequence: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** [CTE×10⁶ /°C, yield_MPa, carbon_equiv, thermal_conductivity W/(m·K)] */
const MAT_WELD: Record<string, [number, number, number, number]> = {
  mild_steel:    [12, 250, 0.35, 50],
  stainless:     [17, 215, 0.20, 16],
  aluminum:      [23, 150, 0,    237],
  high_strength: [12, 500, 0.45, 50],
};

// ── Engine ─────────────────────────────────────────────────────────

export class WeldDistortionEngine {
  calculate(input: WeldDistortionInput): WeldDistortionResult {
    const warnings: string[] = [];
    const joint = input.joint_type ?? "butt";
    const t = input.plate_thickness_mm ?? 10;
    const wLen = input.weld_length_mm ?? 500;
    const leg = input.leg_size_mm ?? (joint === "butt" ? t : 6);
    const HI = input.heat_input_kj_mm ?? 1.5;
    const matKey = input.material ?? "mild_steel";
    const restraint = input.restraint_level ?? "free";
    const passes = input.num_passes ?? (leg > 8 ? 3 : 1);
    const gap = input.joint_gap_mm ?? 1;

    const [cte, sigY, CE, k] = MAT_WELD[matKey] ?? MAT_WELD.mild_steel;

    // Restraint factor
    const Rf = restraint === "free" ? 1.0 : restraint === "moderate" ? 0.5 : 0.2;

    // Weld cross-section area (mm²)
    let Aw: number;
    if (joint === "butt") {
      Aw = t * gap + 0.5 * t * 2; // root gap + reinforcement
    } else {
      Aw = 0.5 * leg * leg; // fillet triangle
    }

    // Transverse shrinkage (mm)
    // δ = C × Aw / t (Masubuchi)
    const Ct = joint === "butt" ? 0.2 : 0.15;
    const transShrink = Ct * Aw / Math.max(t, 1) * Rf;

    // Angular distortion (degrees)
    // θ ∝ HI / t² (simplified Okerblom)
    const Ca = joint === "butt" ? 0.015 : 0.025;
    const angularDeg = Ca * HI * 1000 / (t * t) * Rf;

    // Longitudinal shrinkage (mm)
    // δL ∝ HI × L × α / (ρ × Cp × t)
    const longShrink = cte * 1e-6 * HI * 1000 * wLen / (t * k * 0.01) * Rf;

    // Buckling risk (thin plate)
    const buckleRatio = wLen / t;
    let buckleRisk: string;
    if (buckleRatio > 100 && t < 6) buckleRisk = "high";
    else if (buckleRatio > 50) buckleRisk = "moderate";
    else buckleRisk = "low";

    // Carbon equivalent and preheat
    let preheat = 0;
    if (CE > 0.45) preheat = 150;
    else if (CE > 0.40) preheat = 100;
    else if (CE > 0.35 && t > 25) preheat = 75;

    // Interpass temperature
    const interpass = matKey === "stainless" ? 150 :
      matKey === "high_strength" ? 250 : 300;

    // Residual stress (approx yield level near weld)
    const residStress = sigY * (restraint === "rigid" ? 0.9 : 0.7);

    // Mitigation score (1-10, higher = less distortion expected)
    let mitScore = 5;
    if (restraint === "rigid") mitScore += 2;
    if (restraint === "moderate") mitScore += 1;
    if (passes > 1) mitScore += 1; // multi-pass allows balancing
    if (HI < 1.0) mitScore += 1;
    if (t > 20) mitScore += 1;
    mitScore = Math.min(10, mitScore);

    // Sequence recommendation
    let seqRec: string;
    if (wLen > 1000) seqRec = "backstep";
    else if (joint === "butt" && t > 15) seqRec = "balanced";
    else seqRec = "continuous";

    // Warnings
    if (angularDeg > 5) {
      warnings.push(`Angular distortion ${r1(angularDeg)}° — pre-set or clamp`);
    }
    if (transShrink > 2) {
      warnings.push(`Transverse shrinkage ${r1(transShrink)}mm — allow gap compensation`);
    }
    if (buckleRisk === "high") {
      warnings.push("High buckling risk — use skip welding or strongbacks");
    }
    if (CE > 0.45) {
      warnings.push(`CE=${r2(CE)} — preheat ${preheat}°C and low-hydrogen electrodes required`);
    }
    if (matKey === "stainless" && interpass > 150) {
      warnings.push("Stainless — keep interpass ≤150°C to avoid sensitization");
    }
    if (HI > 3) {
      warnings.push(`Heat input ${HI}kJ/mm high — increases distortion and HAZ`);
    }

    const src = "WeldDistortionEngine (Masubuchi/TWI)";

    return {
      angular_distortion: mkAv(r2(angularDeg), "°", angularDeg * 0.2,
        `${Ca}×HI/t² × Rf=${Rf}`),
      transverse_shrinkage: mkAv(r2(transShrink), "mm", transShrink * 0.2,
        `${Ct}×Aw/t`),
      longitudinal_shrinkage: mkAv(r2(longShrink), "mm", longShrink * 0.3,
        `α×HI×L/(t×k)`),
      buckling_risk: mkAv(
        buckleRisk === "low" ? 1 : buckleRisk === "moderate" ? 2 : 3,
        buckleRisk, 0, `L/t=${r0(buckleRatio)}`),
      preheat_temp: mkAv(preheat, "°C", 10, `CE=${r2(CE)}`),
      carbon_equivalent: mkAv(r2(CE), "CE", 0.02, matKey),
      interpass_temp: mkAv(interpass, "°C", 25, matKey),
      residual_stress: mkAv(r0(residStress), "MPa", residStress * 0.1,
        `~${r0(restraint === "rigid" ? 90 : 70)}% σ_y`),
      mitigation_score: mkAv(mitScore, "/10", 1, src),
      recommended_sequence: mkAv(
        seqRec === "continuous" ? 1 : seqRec === "backstep" ? 2 : 3,
        seqRec, 0, src),
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

export const weldDistortionEngine = new WeldDistortionEngine();
