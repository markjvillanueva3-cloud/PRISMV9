/**
 * BalancingMachineEngine — Rotor balancing analysis
 *
 * Models: ISO 1940 balance quality grades, influence coefficients,
 *         single/two-plane correction, residual unbalance, trial weight
 * References: ISO 1940-1, ISO 21940, API 684
 */

export type BalanceGrade = "G0.4" | "G1" | "G2.5" | "G6.3" | "G16" | "G40";
export type RotorType = "rigid" | "flexible" | "overhung" | "multi_span";
export type BalanceMethod = "single_plane" | "two_plane" | "modal" | "influence_coefficient";

export interface BalancingMachineInput {
  grade?: BalanceGrade;
  rotor_type?: RotorType;
  method?: BalanceMethod;
  rotor_mass_kg: number;
  operating_speed_rpm: number;
  correction_radius_mm?: number;     // default 100
  initial_vibration_um?: number;     // default 50
  bearing_span_mm?: number;          // default 500
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface BalancingMachineResult {
  permissible_unbalance_g_mm: AtomicValue;
  permissible_per_plane_g_mm: AtomicValue;
  correction_mass_g: AtomicValue;
  residual_vibration_um: AtomicValue;
  balance_quality_mm_s: AtomicValue;
  trial_weight_g: AtomicValue;
  sensitivity_um_per_g: AtomicValue;
  num_runs_required: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

const GRADE_VALUES: Record<BalanceGrade, number> = {
  "G0.4": 0.4, "G1": 1, "G2.5": 2.5, "G6.3": 6.3, "G16": 16, "G40": 40,
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class BalancingMachineEngine {
  calculate(input: BalancingMachineInput): BalancingMachineResult {
    const {
      grade = "G6.3",
      rotor_type = "rigid",
      method = "two_plane",
      rotor_mass_kg: m,
      operating_speed_rpm: N,
      correction_radius_mm: R = 100,
      initial_vibration_um: V0 = 50,
      bearing_span_mm: L = 500,
    } = input;

    const recs: string[] = [];
    const G = GRADE_VALUES[grade];
    const omega = 2 * Math.PI * N / 60;

    // ISO 1940: e_per = G / ω (mm/s → mm)
    const ePer = G / omega * 1000; // μm (specific unbalance in g·mm/kg)
    const Uper = ePer * m; // g·mm total permissible

    // Per-plane allocation (50/50 for two-plane, 100% for single)
    const nPlanes = method === "single_plane" ? 1 : 2;
    const UperPlane = Uper / nPlanes;

    // Correction mass at given radius
    const corrMass = UperPlane / R; // g

    // Trial weight (rule: produce ~50% of initial vibration)
    const sensitivity = V0 / (m * 0.1 + 0.001); // μm per g (estimate)
    const trialWeight = V0 / (2 * sensitivity + 0.001); // g

    // Residual vibration after balancing (typically 10-20% of initial)
    const balancingAccuracy = rotor_type === "rigid" ? 0.1 :
      rotor_type === "flexible" ? 0.2 : 0.15;
    const residualVib = V0 * balancingAccuracy;

    // Balance quality achieved
    const achievedG = residualVib / 1000 * omega; // mm/s

    // Number of runs
    const nRuns = method === "single_plane" ? 3 :
      method === "two_plane" ? 4 :
      method === "influence_coefficient" ? 5 : 6;

    const isSafe = achievedG <= G && corrMass < m * 10;

    if (N > 50000) recs.push(`Very high speed ${N}rpm — use G0.4 or G1 grade`);
    if (corrMass > m * 5) recs.push(`Large correction ${corrMass.toFixed(1)}g — check initial balance, possible bent shaft`);
    if (rotor_type === "flexible" && method === "single_plane") recs.push(`Flexible rotor needs modal or influence coefficient method`);
    if (G > 6.3 && N > 3000) recs.push(`Grade ${grade} may be insufficient for ${N}rpm — consider tighter grade`);
    if (V0 > 100) recs.push(`High initial vibration ${V0}μm — may need multiple correction iterations`);
    if (recs.length === 0) recs.push(`Balance nominal — Uper=${Uper.toFixed(1)}g·mm, correction=${corrMass.toFixed(2)}g at ${R}mm`);

    return {
      permissible_unbalance_g_mm: mkAv(Math.round(Uper * 10) / 10, "g·mm", Uper * 0.05, "ISO_1940"),
      permissible_per_plane_g_mm: mkAv(Math.round(UperPlane * 10) / 10, "g·mm", UperPlane * 0.05, "50_50_split"),
      correction_mass_g: mkAv(Math.round(corrMass * 100) / 100, "g", corrMass * 0.10, "U_R"),
      residual_vibration_um: mkAv(Math.round(residualVib * 10) / 10, "μm", residualVib * 0.20, "accuracy_factor"),
      balance_quality_mm_s: mkAv(Math.round(achievedG * 100) / 100, "mm/s", achievedG * 0.15, "e_omega"),
      trial_weight_g: mkAv(Math.round(trialWeight * 100) / 100, "g", trialWeight * 0.25, "50pct_rule"),
      sensitivity_um_per_g: mkAv(Math.round(sensitivity * 100) / 100, "μm/g", sensitivity * 0.20, "V0_mass"),
      num_runs_required: mkAv(nRuns, "count", 0, "method"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const balancingMachineEngine = new BalancingMachineEngine();
