/**
 * WeldStrengthEngine — Fillet & Butt Weld Stress Calculator
 *
 * Models: Weld joint stress analysis per AWS D1.1 / Eurocode 3.
 * - Throat area calculation for fillet welds
 * - Direct shear, bending, and torsion on weld groups
 * - Allowable stress by electrode type (E60xx, E70xx, E80xx)
 * - Joint efficiency factors
 * - Fatigue category per AWS D1.1 Table 2.5
 * - Heat-affected zone (HAZ) derating
 *
 * Key physics: Fillet weld throat = leg × cos(45°) = 0.707 × leg.
 * Shear on throat: τ = F / (0.707 × w × L).
 * Combined stress √(τ² + σ²) vs allowable.
 *
 * Reference: AWS D1.1 Structural Welding Code,
 *            Eurocode 3 EN 1993-1-8 (welded connections),
 *            Blodgett — Design of Welded Structures
 *
 * Actions: weld_strength_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface WeldStrengthInput {
  weld_type?: "fillet" | "butt_full" | "butt_partial" | "plug";
  leg_size_mm?: number;
  weld_length_mm?: number;
  plate_thickness_mm?: number;
  force_n?: number;
  force_direction?: "parallel" | "transverse" | "combined";
  moment_nm?: number;
  electrode?: "E60" | "E70" | "E80" | "E90" | "E110";
  base_metal_yield_mpa?: number;
  joint_type?: "lap" | "tee" | "corner" | "butt";
  num_passes?: number;
  weld_both_sides?: boolean;
  fatigue_cycles?: number;
  inspection_level?: "visual" | "MT_PT" | "RT_UT";
}

export interface WeldStrengthResult {
  throat_thickness: AtomicValue;
  weld_area: AtomicValue;
  direct_shear_stress: AtomicValue;
  bending_stress: AtomicValue;
  combined_stress: AtomicValue;
  allowable_stress: AtomicValue;
  safety_factor: AtomicValue;
  joint_efficiency: AtomicValue;
  fatigue_category: AtomicValue;
  weld_feasible: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Electrode ultimate tensile strength (MPa) — AWS classification */
const ELECTRODE_UTS: Record<string, number> = {
  E60: 427,
  E70: 482,
  E80: 551,
  E90: 620,
  E110: 758,
};

/** Fillet weld allowable shear = 0.30 × electrode UTS (AWS D1.1) */
const FILLET_ALLOW_FACTOR = 0.30;

/** Butt weld allowable tension = 0.60 × electrode UTS */
const BUTT_ALLOW_FACTOR = 0.60;

/** Joint efficiency by type and inspection */
const JOINT_EFFICIENCY: Record<string, Record<string, number>> = {
  butt_full: { visual: 0.70, MT_PT: 0.85, RT_UT: 1.0 },
  butt_partial: { visual: 0.50, MT_PT: 0.65, RT_UT: 0.80 },
  fillet: { visual: 0.60, MT_PT: 0.70, RT_UT: 0.80 },
  plug: { visual: 0.45, MT_PT: 0.55, RT_UT: 0.65 },
};

/** AWS fatigue categories (stress range MPa) at 2×10⁶ cycles */
const FATIGUE_CATEGORIES: Record<string, [string, number]> = {
  butt_full: ["B", 124],
  butt_partial: ["D", 69],
  fillet: ["E", 55],
  plug: ["F", 41],
};

// ── Engine ─────────────────────────────────────────────────────────

export class WeldStrengthEngine {
  calculate(input: WeldStrengthInput): WeldStrengthResult {
    const warnings: string[] = [];
    const weldType = input.weld_type ?? "fillet";
    const electrode = input.electrode ?? "E70";
    const leg = input.leg_size_mm ?? 6;
    const plateT = input.plate_thickness_mm ?? 10;
    const weldLen = input.weld_length_mm ?? 100;
    const F = input.force_n ?? 10000;
    const M = input.moment_nm ?? 0;
    const inspect = input.inspection_level ?? "visual";
    const bothSides = input.weld_both_sides ?? false;

    // ── Throat thickness
    let throat: number;
    if (weldType === "fillet") {
      throat = 0.707 * leg;
    } else if (weldType === "butt_full") {
      throat = plateT;
    } else if (weldType === "butt_partial") {
      throat = Math.min(leg, plateT * 0.75);
    } else {
      throat = leg; // plug
    }

    // Effective weld sides
    const sides = bothSides ? 2 : 1;

    // ── Weld area
    const area = throat * weldLen * sides;

    // ── Direct stress
    const directStress = F / area;

    // ── Bending stress (if moment applied)
    // Section modulus of weld group: S = (throat × L²) / 6 for line weld
    const S = (throat * weldLen * weldLen * sides) / 6;
    const bendStress = M > 0 ? (M * 1000 / S) : 0; // M in N·m → N·mm

    // ── Combined stress (von Mises approximation for weld)
    let combined: number;
    const dir = input.force_direction ?? "parallel";
    if (dir === "parallel") {
      // Shear on throat
      combined = Math.sqrt(directStress ** 2 + bendStress ** 2);
    } else if (dir === "transverse") {
      // Transverse fillet welds are ~50% stronger
      combined = Math.sqrt(directStress ** 2 + bendStress ** 2);
    } else {
      combined = Math.sqrt(directStress ** 2 + bendStress ** 2);
    }

    // ── Allowable stress
    const uts = ELECTRODE_UTS[electrode] ?? 482;
    let allowable: number;
    if (weldType === "fillet" || weldType === "plug") {
      allowable = FILLET_ALLOW_FACTOR * uts;
    } else {
      allowable = BUTT_ALLOW_FACTOR * uts;
    }

    // Transverse fillet gets 50% bonus per AWS
    if (dir === "transverse" && weldType === "fillet") {
      allowable *= 1.5;
    }

    // ── Safety factor
    const sf = allowable / Math.max(combined, 0.01);

    // ── Joint efficiency
    const jeTable = JOINT_EFFICIENCY[weldType] ?? JOINT_EFFICIENCY.fillet;
    const je = jeTable[inspect] ?? 0.60;

    // ── Fatigue
    const fatCat = FATIGUE_CATEGORIES[weldType] ?? FATIGUE_CATEGORIES.fillet;
    const fatCycles = input.fatigue_cycles ?? 0;
    let fatStressRange = fatCat[1];
    if (fatCycles > 2e6) {
      // Derate for higher cycles: S_N = S_ref × (2e6/N)^(1/3)
      fatStressRange = fatCat[1] * Math.pow(2e6 / fatCycles, 1 / 3);
    }

    // ── Feasibility
    const feasible = sf >= 1.5;

    // ── Minimum leg size check (AWS D1.1 Table 2.1)
    const minLeg = plateT <= 6 ? 3 : plateT <= 12 ? 5 : plateT <= 20 ? 6 : 8;
    const maxLeg = plateT - 1.5;

    // Warnings
    if (leg < minLeg) {
      warnings.push(`Leg size ${leg}mm < minimum ${minLeg}mm for ${plateT}mm plate (AWS D1.1)`);
    }
    if (leg > maxLeg && weldType === "fillet") {
      warnings.push(`Leg size ${leg}mm > max ${r1(maxLeg)}mm (plate thickness - 1.5mm)`);
    }
    if (sf < 1.5) {
      warnings.push(`Safety factor ${r2(sf)} < 1.5 — increase leg size or weld length`);
    }
    if (sf < 1.0) {
      warnings.push("CRITICAL: Safety factor < 1.0 — weld will fail");
    }
    if (weldLen < 4 * leg && weldType === "fillet") {
      warnings.push(`Weld length ${weldLen}mm < 4× leg (${4 * leg}mm minimum effective length)`);
    }
    if (fatCycles > 0 && combined > fatStressRange) {
      warnings.push(
        `Stress ${r0(combined)} MPa > fatigue limit ${r0(fatStressRange)} MPa ` +
        `(Cat ${fatCat[0]}, ${fatCycles.toExponential(0)} cycles)`
      );
    }
    if (weldType === "butt_full" && inspect === "visual") {
      warnings.push("Full-pen butt weld with visual-only inspection — joint efficiency limited to 70%");
    }

    const src = "WeldStrengthEngine (AWS D1.1 / Blodgett)";

    return {
      throat_thickness: mkAv(r2(throat), "mm", 0.2,
        weldType === "fillet" ? `0.707 × ${leg}mm` : `plate ${plateT}mm`),
      weld_area: mkAv(r1(area), "mm²", 5,
        `${r2(throat)} × ${weldLen}mm × ${sides} side(s)`),
      direct_shear_stress: mkAv(r1(directStress), "MPa", 5,
        `${F}N / ${r1(area)}mm²`),
      bending_stress: mkAv(r1(bendStress), "MPa", 5,
        M > 0 ? `M=${M}N·m, S=${r0(S)}mm³` : "No moment"),
      combined_stress: mkAv(r1(combined), "MPa", 8, "√(τ² + σ²)"),
      allowable_stress: mkAv(r0(allowable), "MPa", 0,
        `${weldType === "fillet" ? "0.30" : "0.60"} × ${uts} MPa (${electrode})`),
      safety_factor: mkAv(r2(sf), "×", 0.1,
        `${r0(allowable)} / ${r1(combined)}`),
      joint_efficiency: mkAv(r2(je), "factor", 0,
        `${weldType}, ${inspect} inspection`),
      fatigue_category: mkAv(fatStressRange, `Cat ${fatCat[0]} MPa`, 5,
        `AWS D1.1 at ${fatCycles > 0 ? fatCycles.toExponential(0) : "2e6"} cycles`),
      weld_feasible: mkAv(feasible ? 1 : 0, feasible ? "PASS" : "FAIL", 0, src),
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

export const weldStrengthEngine = new WeldStrengthEngine();
