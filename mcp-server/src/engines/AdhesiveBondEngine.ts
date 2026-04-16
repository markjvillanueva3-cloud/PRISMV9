/**
 * AdhesiveBondEngine — Adhesive Joint Strength Calculator
 *
 * Models: Structural adhesive bond design and analysis.
 * - Lap shear strength from overlap and adhesive
 * - Peel stress at bond edges (Goland-Reissner)
 * - Shear lag factor for long overlaps
 * - Temperature and environmental derating
 * - Creep and fatigue derating
 * - Surface preparation quality effect
 *
 * Key physics: τ_avg = F/(b×L). τ_max = τ_avg × (βL/2)/tanh(βL/2).
 * β = √(Ga/(ta×E×t)). Peel: σ_peel ∝ τ × √(Et/Ea×ta).
 *
 * Reference: Adams — Structural Adhesive Joints,
 *            ASTM D1002 — Lap Shear Test,
 *            da Silva — Handbook of Adhesion Technology
 *
 * Actions: adhesive_bond_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface AdhesiveBondInput {
  adhesive_type?: "epoxy" | "acrylic" | "polyurethane" | "cyanoacrylate" | "silicone";
  joint_type?: "single_lap" | "double_lap" | "scarf" | "butt";
  overlap_mm?: number;
  bond_width_mm?: number;
  adherend_thickness_mm?: number;
  bondline_thickness_mm?: number;
  applied_load_n?: number;
  temperature_c?: number;
  surface_prep?: "grit_blast" | "chemical_etch" | "solvent_wipe" | "plasma";
  service_environment?: "indoor" | "outdoor" | "submerged" | "chemical";
}

export interface AdhesiveBondResult {
  average_shear_stress: AtomicValue;
  peak_shear_stress: AtomicValue;
  peel_stress: AtomicValue;
  shear_lag_factor: AtomicValue;
  bond_strength: AtomicValue;
  safety_factor: AtomicValue;
  optimal_overlap: AtomicValue;
  temperature_derating: AtomicValue;
  environment_derating: AtomicValue;
  failure_mode: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** [shear_strength_MPa, peel_strength_MPa, shear_modulus_MPa, max_temp_C, Tg_C] */
const ADH_DATA: Record<string, [number, number, number, number, number]> = {
  epoxy:          [25, 8,  1200, 150, 120],
  acrylic:        [20, 6,  800,  120, 100],
  polyurethane:   [12, 10, 200,  80,  60],
  cyanoacrylate:  [18, 3,  2000, 80,  100],
  silicone:       [3,  2,  10,   250, -60],
};

/** Surface prep factor (multiplier on strength) */
const PREP_FACTOR: Record<string, number> = {
  grit_blast: 0.95, chemical_etch: 1.0, solvent_wipe: 0.60, plasma: 1.0,
};

const ENV_FACTOR: Record<string, number> = {
  indoor: 1.0, outdoor: 0.85, submerged: 0.60, chemical: 0.50,
};

// ── Engine ─────────────────────────────────────────────────────────

export class AdhesiveBondEngine {
  calculate(input: AdhesiveBondInput): AdhesiveBondResult {
    const warnings: string[] = [];
    const adhType = input.adhesive_type ?? "epoxy";
    const jType = input.joint_type ?? "single_lap";
    const L = input.overlap_mm ?? 25;
    const b = input.bond_width_mm ?? 25;
    const t = input.adherend_thickness_mm ?? 2;
    const ta = input.bondline_thickness_mm ?? 0.2;
    const F = input.applied_load_n ?? 5000;
    const temp = input.temperature_c ?? 25;
    const prep = input.surface_prep ?? "grit_blast";
    const env = input.service_environment ?? "indoor";

    const [tauUlt, sigPeel, Ga, maxTemp, Tg] =
      ADH_DATA[adhType] ?? ADH_DATA.epoxy;
    const prepFactor = PREP_FACTOR[prep] ?? 0.8;
    const envFactor = ENV_FACTOR[env] ?? 1.0;

    // Adherend modulus (assume steel)
    const E = 200000; // MPa

    // Average shear stress
    const tauAvg = F / (b * L);

    // Shear lag parameter
    const beta = Math.sqrt(Ga / (ta * E * t));
    const betaL = beta * L;

    // Peak shear stress (Volkersen)
    const shearLagFactor = betaL > 0.1 ?
      (betaL / 2) / Math.tanh(betaL / 2) : 1.0;
    const tauPeak = tauAvg * shearLagFactor;

    // Peel stress (simplified Goland-Reissner)
    const sigP = tauPeak * Math.sqrt(E * t / (Ga * ta)) * 0.3;

    // Temperature derating
    let tempDerate = 1.0;
    if (temp > Tg) tempDerate = 0.3;
    else if (temp > Tg * 0.8) tempDerate = 0.6;
    else if (temp > Tg * 0.6) tempDerate = 0.85;

    // Effective strength
    const effectiveShear = tauUlt * prepFactor * envFactor * tempDerate;
    const effectivePeel = sigPeel * prepFactor * envFactor * tempDerate;

    // Bond strength (force to fail)
    const Pshear = effectiveShear * b * L / shearLagFactor;
    const Ppeel = effectivePeel * b * L * 0.5; // peel over edge zone

    const bondStrength = Math.min(Pshear, Ppeel);

    // Safety factor
    const SF = bondStrength / Math.max(F, 1);

    // Optimal overlap (where shear lag plateau begins)
    const optOverlap = beta > 0 ? 5 / beta : 50;

    // Failure mode
    let failMode: string;
    if (Ppeel < Pshear) failMode = "peel";
    else if (prepFactor < 0.7) failMode = "adhesive (interface)";
    else failMode = "cohesive (shear)";

    // Double lap adjustment
    const lapFactor = jType === "double_lap" ? 2 : 1;

    // Warnings
    if (SF < 2) {
      warnings.push(`Safety factor ${r1(SF)} < 2.0 — increase overlap or width`);
    }
    if (temp > maxTemp) {
      warnings.push(`Temperature ${temp}°C exceeds max ${maxTemp}°C for ${adhType}`);
    }
    if (temp > Tg * 0.8) {
      warnings.push(`Temperature ${temp}°C near Tg ${Tg}°C — significant strength loss`);
    }
    if (L > optOverlap * 2) {
      warnings.push(`Overlap ${L}mm >> optimal ${r0(optOverlap)}mm — diminishing returns`);
    }
    if (prep === "solvent_wipe") {
      warnings.push("Solvent wipe only — poor durability, use grit blast or etch");
    }
    if (failMode === "peel" && jType === "single_lap") {
      warnings.push("Peel failure dominant — use double lap or add peel stoppers");
    }
    if (ta > 0.5) {
      warnings.push(`Bondline ${ta}mm > 0.5mm — strength reduces with thick bondlines`);
    }

    const src = "AdhesiveBondEngine (Adams/ASTM D1002)";

    return {
      average_shear_stress: mkAv(r1(tauAvg), "MPa", tauAvg * 0.05,
        `F/(b×L)`),
      peak_shear_stress: mkAv(r1(tauPeak), "MPa", tauPeak * 0.1,
        `Volkersen shear lag`),
      peel_stress: mkAv(r1(sigP), "MPa", sigP * 0.15,
        "Goland-Reissner"),
      shear_lag_factor: mkAv(r2(shearLagFactor), "×", shearLagFactor * 0.05,
        `βL/2 / tanh(βL/2)`),
      bond_strength: mkAv(r0(bondStrength * lapFactor), "N",
        bondStrength * lapFactor * 0.15, `${jType} ${adhType}`),
      safety_factor: mkAv(r1(SF * lapFactor), "×", SF * lapFactor * 0.1,
        `P_bond/F`),
      optimal_overlap: mkAv(r0(optOverlap), "mm", optOverlap * 0.1,
        `5/β`),
      temperature_derating: mkAv(r2(tempDerate), "factor", tempDerate * 0.05,
        `Tg=${Tg}°C`),
      environment_derating: mkAv(r2(envFactor), "factor", 0, env),
      failure_mode: mkAv(
        failMode === "peel" ? 1 : failMode.includes("interface") ? 2 : 3,
        failMode, 0, src),
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

export const adhesiveBondEngine = new AdhesiveBondEngine();
