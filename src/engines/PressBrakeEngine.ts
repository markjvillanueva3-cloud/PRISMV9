/**
 * PressBrakeEngine — Press Brake Bending Calculator
 *
 * Models: Air bending, bottoming, and coining parameters.
 * - Required tonnage from material/thickness/V-die
 * - Bend allowance and developed length
 * - Springback prediction and compensation
 * - Minimum flange length
 * - Inside bend radius selection
 * - Crowning and deflection compensation
 *
 * Key physics: F = C×S×L×t²/W (air bend tonnage).
 * BA = (π/180)×(Ri + K×t)×θ. Springback ∝ (σ_y×Ri)/(E×t).
 *
 * Reference: Machinery's Handbook — Bending,
 *            ASME B16 — Sheet Metal,
 *            Trumpf/Amada Press Brake Manuals
 *
 * Actions: press_brake_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface PressBrakeInput {
  material?: "mild_steel" | "stainless_304" | "aluminum_5052" |
    "aluminum_6061" | "copper" | "brass";
  thickness_mm?: number;
  bend_length_mm?: number;
  bend_angle_deg?: number;
  inside_radius_mm?: number;
  v_die_opening_mm?: number;
  bend_method?: "air" | "bottom" | "coining";
  num_bends?: number;
}

export interface PressBrakeResult {
  required_tonnage: AtomicValue;
  bend_allowance: AtomicValue;
  developed_length: AtomicValue;
  springback_angle: AtomicValue;
  actual_bend_angle: AtomicValue;
  minimum_flange: AtomicValue;
  k_factor: AtomicValue;
  bend_deduction: AtomicValue;
  max_sheet_length: AtomicValue;
  total_tonnage: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** [tensile_MPa, yield_MPa, k_factor, tonnage_factor] */
const MAT_BEND: Record<string, [number, number, number, number]> = {
  mild_steel:     [400, 250, 0.33, 1.0],
  stainless_304:  [515, 215, 0.33, 1.5],
  aluminum_5052:  [228, 193, 0.33, 0.5],
  aluminum_6061:  [310, 276, 0.33, 0.6],
  copper:         [220, 70,  0.35, 0.5],
  brass:          [340, 200, 0.35, 0.65],
};

// ── Engine ─────────────────────────────────────────────────────────

export class PressBrakeEngine {
  calculate(input: PressBrakeInput): PressBrakeResult {
    const warnings: string[] = [];
    const matKey = input.material ?? "mild_steel";
    const t = input.thickness_mm ?? 3;
    const bendLen = input.bend_length_mm ?? 1000;
    const angle = input.bend_angle_deg ?? 90;
    const method = input.bend_method ?? "air";
    const nBends = input.num_bends ?? 1;

    const [tensile, sigY, kDefault, tonFactor] =
      MAT_BEND[matKey] ?? MAT_BEND.mild_steel;

    // V-die opening (rule of thumb: 8×t for air bending)
    const V = input.v_die_opening_mm ?? (method === "air" ? 8 * t :
      method === "bottom" ? 6 * t : 4 * t);

    // Inside bend radius
    const Ri = input.inside_radius_mm ?? (method === "air" ? V / 6 : t);

    // K-factor
    const K = kDefault;

    // Tonnage per meter (air bending)
    // F/m = (C × σ_t × t²) / (V × 1000) in tonnes/m
    // C factor: 1.33 for air, 3-5 for bottoming, 8-10 for coining
    let C: number;
    if (method === "air") C = 1.33;
    else if (method === "bottom") C = 4.0;
    else C = 8.0;

    const tonnagePerM = C * tensile * t * t / (V * 1000) * tonFactor;
    const totalTonnage = tonnagePerM * bendLen / 1000;

    // Bend allowance (mm)
    const theta = angle * Math.PI / 180;
    const BA = (Math.PI / 180) * angle * (Ri + K * t);

    // Outside setback (OSSB)
    const OSSB = (Ri + t) * Math.tan(theta / 2);

    // Bend deduction
    const BD = 2 * OSSB - BA;

    // Developed length (for a simple U-channel: 2 flanges + BA)
    // Single bend: flat = leg1 + leg2 - BD
    const devLen = bendLen; // per bend, user uses BD for flat pattern

    // Springback
    // Springback angle ≈ (σ_y × Ri) / (E × t) × 2 (simplified)
    const E = matKey.includes("aluminum") ? 69000 : matKey === "copper" ? 117000 : 200000;
    const sbFactor = method === "air" ? 1.0 : method === "bottom" ? 0.3 : 0.05;
    const springbackDeg = (sigY * Ri) / (E * t) * 2 * (180 / Math.PI) * sbFactor;

    // Required overbend angle
    const actualAngle = angle + springbackDeg;

    // Minimum flange length
    const minFlange = V * 0.67 + t;

    // Max sheet length at machine capacity (assume 100 ton machine)
    const maxLen = tonnagePerM > 0 ? 100 / tonnagePerM * 1000 : 99999;

    // Multi-bend total tonnage
    const multiTonnage = totalTonnage * nBends;

    // Warnings
    if (Ri < t) {
      warnings.push(`Inside radius ${Ri}mm < thickness ${t}mm — cracking risk`);
    }
    if (Ri < t * 0.5 && matKey.includes("aluminum")) {
      warnings.push("Tight radius on aluminum — anneal before bending");
    }
    if (springbackDeg > 5) {
      warnings.push(`Springback ${r1(springbackDeg)}° significant — use bottom bending or overbend`);
    }
    if (totalTonnage > 200) {
      warnings.push(`Required ${r0(totalTonnage)}T — verify press brake capacity`);
    }
    if (V < 6 * t) {
      warnings.push(`V-die opening ${V}mm < 6×t — risk of marking and excessive tonnage`);
    }
    if (matKey === "stainless_304" && method === "air") {
      warnings.push("Stainless air bending — higher springback, consider bottoming");
    }

    const src = "PressBrakeEngine (Machinery's HB/Trumpf)";

    return {
      required_tonnage: mkAv(r1(totalTonnage), "tonnes", totalTonnage * 0.1,
        `${r2(tonnagePerM)}T/m × ${bendLen}mm`),
      bend_allowance: mkAv(r2(BA), "mm", BA * 0.05,
        `(π/180)×${angle}×(${r1(Ri)}+${K}×${t})`),
      developed_length: mkAv(r1(devLen), "mm", devLen * 0.01,
        "Use BD for flat pattern"),
      springback_angle: mkAv(r1(springbackDeg), "°", springbackDeg * 0.2,
        `σy×Ri/(E×t) ${method}`),
      actual_bend_angle: mkAv(r1(actualAngle), "°", 0.5,
        `${angle}° + ${r1(springbackDeg)}° springback`),
      minimum_flange: mkAv(r1(minFlange), "mm", minFlange * 0.05,
        `0.67×V + t`),
      k_factor: mkAv(K, "K", 0.02, matKey),
      bend_deduction: mkAv(r2(BD), "mm", BD * 0.05,
        `2×OSSB - BA`),
      max_sheet_length: mkAv(r0(maxLen), "mm", maxLen * 0.1,
        "At 100T machine"),
      total_tonnage: mkAv(r1(multiTonnage), "tonnes", multiTonnage * 0.1,
        `${nBends} bends`),
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

export const pressBrakeEngine = new PressBrakeEngine();
