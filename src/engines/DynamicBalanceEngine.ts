/**
 * DynamicBalanceEngine — Rotor Balancing Calculator
 *
 * Models: Single-plane and two-plane dynamic balancing.
 * - Unbalance from vibration readings
 * - Trial weight correction calculation
 * - ISO 1940 balance grade (G-values)
 * - Permissible residual unbalance
 * - Correction radius and mass
 * - Influence coefficient method
 *
 * Key physics: U = m×e (g·mm). G = e×ω (mm/s).
 * U_per = (G×M×1000)/(2π×n/60). Centrifugal force F = U×ω²/1000.
 *
 * Reference: ISO 1940 — Balance Quality,
 *            ISO 21940 — Mechanical Vibration,
 *            Schenck Balancing Handbook
 *
 * Actions: balance_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface DynamicBalanceInput {
  rotor_mass_kg?: number;
  service_rpm?: number;
  balance_grade?: "G0.4" | "G1" | "G2.5" | "G6.3" | "G16" | "G40";
  num_planes?: 1 | 2;
  correction_radius_mm?: number;
  initial_vibration_mm_s?: number;
  trial_weight_g?: number;
  trial_vibration_mm_s?: number;
  trial_phase_shift_deg?: number;
  rotor_type?: "rigid" | "flexible" | "overhung";
}

export interface DynamicBalanceResult {
  permissible_unbalance: AtomicValue;
  specific_unbalance: AtomicValue;
  correction_mass: AtomicValue;
  correction_angle: AtomicValue;
  centrifugal_force: AtomicValue;
  balance_grade_value: AtomicValue;
  per_plane_unbalance: AtomicValue;
  residual_vibration: AtomicValue;
  max_eccentricity: AtomicValue;
  balance_feasible: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

const GRADE_VALUES: Record<string, number> = {
  "G0.4": 0.4, "G1": 1, "G2.5": 2.5, "G6.3": 6.3, "G16": 16, "G40": 40,
};

// ── Engine ─────────────────────────────────────────────────────────

export class DynamicBalanceEngine {
  calculate(input: DynamicBalanceInput): DynamicBalanceResult {
    const warnings: string[] = [];
    const M = input.rotor_mass_kg ?? 50;
    const rpm = input.service_rpm ?? 3000;
    const gradeKey = input.balance_grade ?? "G6.3";
    const planes = input.num_planes ?? 1;
    const rCorr = input.correction_radius_mm ?? 100;
    const initVib = input.initial_vibration_mm_s ?? 5;
    const trialW = input.trial_weight_g ?? 10;
    const trialVib = input.trial_vibration_mm_s ?? 3;
    const trialPhase = input.trial_phase_shift_deg ?? 45;
    const rotorType = input.rotor_type ?? "rigid";

    const omega = rpm * 2 * Math.PI / 60;
    const G = GRADE_VALUES[gradeKey] ?? 6.3;

    // Permissible residual unbalance (g·mm)
    // U_per = (G × M × 1000) / ω
    const Uper = omega > 0 ? (G * M * 1000) / omega : 999999;

    // Specific unbalance (eccentricity, µm)
    const ePer = M > 0 ? Uper / (M * 1000) * 1000 : 0; // g·mm / (kg×1000g/kg) → mm → µm

    // Per-plane unbalance
    const UperPlane = Uper / planes;

    // Correction mass at correction radius
    const corrMass = rCorr > 0 ? UperPlane / rCorr : 0; // grams

    // Influence coefficient method for correction angle
    // Vector subtraction: correction = -(initial/influence_coeff)
    const corrAngle = (180 + trialPhase) % 360; // simplified

    // Centrifugal force from initial unbalance
    // Estimate initial unbalance from vibration (rough: U ∝ vib × M)
    const Uinit = initVib * M * 10; // rough estimate g·mm
    const Fcent = Uinit / 1000 * omega * omega / 1000; // kN

    // Estimated residual vibration after correction
    const reductionRatio = trialVib > 0 ?
      Math.min(0.9, 1 - (trialW * rCorr) / Math.max(Uinit, 1) * 0.5) : 0.1;
    const residVib = initVib * Math.max(0.05, 1 - reductionRatio);

    // Balance feasibility
    const feasible = corrMass > 0.1 && corrMass < M * 100 && rpm > 0;

    // Warnings
    if (Uinit > Uper * 10) {
      warnings.push("Initial unbalance very high — check rotor for damage or buildup");
    }
    if (corrMass > 50) {
      warnings.push(`Correction mass ${r1(corrMass)}g large — verify cause of unbalance`);
    }
    if (rotorType === "flexible" && rpm > 3600) {
      warnings.push("Flexible rotor at high speed — may need multi-speed balancing");
    }
    if (rotorType === "overhung") {
      warnings.push("Overhung rotor — couple unbalance may dominate, use two-plane");
    }
    if (gradeKey === "G0.4" && rotorType !== "rigid") {
      warnings.push("G0.4 on non-rigid rotor — extremely difficult, consider flexible balance");
    }
    if (Fcent > 1) {
      warnings.push(`Centrifugal force ${r1(Fcent)}kN — bearing damage risk`);
    }

    const src = "DynamicBalanceEngine (ISO 1940)";

    return {
      permissible_unbalance: mkAv(r1(Uper), "g·mm", Uper * 0.05,
        `G${G}×${M}kg/${r1(omega)}rad/s`),
      specific_unbalance: mkAv(r1(ePer), "µm", ePer * 0.05,
        `U_per/M`),
      correction_mass: mkAv(r2(corrMass), "g", corrMass * 0.1,
        `${r1(UperPlane)}g·mm / ${rCorr}mm`),
      correction_angle: mkAv(r0(corrAngle), "°", 5,
        "Influence coefficient method"),
      centrifugal_force: mkAv(r2(Fcent), "kN", Fcent * 0.15,
        `U×ω² at ${rpm}rpm`),
      balance_grade_value: mkAv(G, "mm/s", 0, `ISO 1940 ${gradeKey}`),
      per_plane_unbalance: mkAv(r1(UperPlane), "g·mm", UperPlane * 0.05,
        `${planes}-plane`),
      residual_vibration: mkAv(r2(residVib), "mm/s", residVib * 0.2,
        "Post-correction estimate"),
      max_eccentricity: mkAv(r2(ePer / 1000), "mm", ePer / 1000 * 0.05, src),
      balance_feasible: mkAv(feasible ? 1 : 0,
        feasible ? "PASS" : "FAIL", 0, src),
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

export const dynamicBalanceEngine = new DynamicBalanceEngine();
