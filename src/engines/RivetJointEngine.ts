/**
 * RivetJointEngine — Riveted Joint Strength Calculator
 *
 * Models: Single/double lap and butt riveted joints.
 * - Rivet shear strength
 * - Plate bearing strength
 * - Plate tearing (net section)
 * - Joint efficiency
 * - Rivet pattern and pitch
 * - Failure mode prediction
 *
 * Key physics: P_shear = n×(π/4)×d²×τ_allow.
 * P_bearing = n×d×t×σ_br. P_tearing = (p-d)×t×σ_t.
 * Efficiency η = P_weakest / (p×t×σ_t).
 *
 * Reference: Machinery's Handbook — Riveted Joints,
 *            ASME Boiler & Pressure Vessel Code (Section VIII),
 *            IS 800 — Steel Structures
 *
 * Actions: rivet_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface RivetJointInput {
  joint_type?: "single_lap" | "double_lap" | "single_butt" | "double_butt";
  rivet_diameter_mm?: number;
  plate_thickness_mm?: number;
  pitch_mm?: number;
  num_rivets_per_pitch?: number;
  plate_material?: "mild_steel" | "stainless" | "aluminum";
  rivet_material?: "mild_steel" | "high_strength" | "aluminum";
  applied_load_n?: number;
}

export interface RivetJointResult {
  shear_strength: AtomicValue;
  bearing_strength: AtomicValue;
  tearing_strength: AtomicValue;
  joint_strength: AtomicValue;
  joint_efficiency: AtomicValue;
  failure_mode: AtomicValue;
  safety_factor: AtomicValue;
  rivet_shear_stress: AtomicValue;
  bearing_stress: AtomicValue;
  plate_tensile_stress: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** [tensile_MPa, shear_allow_MPa, bearing_allow_MPa] */
const PLATE_MAT: Record<string, [number, number, number]> = {
  mild_steel: [400, 100, 300],
  stainless:  [515, 130, 400],
  aluminum:   [250, 70,  200],
};

const RIVET_MAT: Record<string, [number]> = {
  mild_steel:    [100],
  high_strength: [150],
  aluminum:      [65],
};

// ── Engine ─────────────────────────────────────────────────────────

export class RivetJointEngine {
  calculate(input: RivetJointInput): RivetJointResult {
    const warnings: string[] = [];
    const jType = input.joint_type ?? "single_lap";
    const d = input.rivet_diameter_mm ?? 16;
    const t = input.plate_thickness_mm ?? 10;
    const p = input.pitch_mm ?? 3 * d;
    const nRivets = input.num_rivets_per_pitch ?? 1;
    const pMat = input.plate_material ?? "mild_steel";
    const rMat = input.rivet_material ?? "mild_steel";
    const Fapplied = input.applied_load_n ?? 50000;

    const [sigT, tauAllow, sigBr] = PLATE_MAT[pMat] ?? PLATE_MAT.mild_steel;
    const [tauRivet] = RIVET_MAT[rMat] ?? RIVET_MAT.mild_steel;

    // Number of shear planes
    const shearPlanes = jType.includes("double") ? 2 : 1;

    // Rivet shear strength per pitch
    const Ps = nRivets * shearPlanes * (Math.PI / 4) * d * d * tauRivet;

    // Bearing strength per pitch
    const Pb = nRivets * d * t * sigBr;

    // Tearing (net section) strength per pitch
    const Pt = (p - d) * t * sigT;

    // Solid plate strength per pitch
    const Psolid = p * t * sigT;

    // Joint strength (weakest link)
    const Pjoint = Math.min(Ps, Pb, Pt);

    // Joint efficiency
    const efficiency = Psolid > 0 ? Pjoint / Psolid : 0;

    // Failure mode
    let failMode: string;
    if (Pjoint === Ps) failMode = "rivet_shear";
    else if (Pjoint === Pb) failMode = "bearing";
    else failMode = "plate_tearing";

    // Safety factor
    const SF = Pjoint / Math.max(Fapplied, 1);

    // Actual stresses
    const rivetArea = (Math.PI / 4) * d * d * nRivets * shearPlanes;
    const tauActual = rivetArea > 0 ? Fapplied / rivetArea : 0;
    const sigBearing = (nRivets * d * t) > 0 ? Fapplied / (nRivets * d * t) : 0;
    const sigTensile = ((p - d) * t) > 0 ? Fapplied / ((p - d) * t) : 0;

    // Warnings
    if (SF < 2) {
      warnings.push(`Safety factor ${r1(SF)} < 2.0 — increase rivet size or count`);
    }
    if (efficiency < 0.5) {
      warnings.push(`Joint efficiency ${r0(efficiency * 100)}% < 50% — redesign pattern`);
    }
    if (p < 2.5 * d) {
      warnings.push(`Pitch ${p}mm < 2.5d — rivets too close, plate splitting risk`);
    }
    if (d > 3 * t) {
      warnings.push(`Rivet d=${d}mm > 3t — rivet too large for plate thickness`);
    }
    if (jType === "single_lap") {
      warnings.push("Single lap joint — eccentric loading causes bending");
    }

    const src = "RivetJointEngine (Machinery's HB/ASME)";

    return {
      shear_strength: mkAv(r0(Ps), "N", Ps * 0.05,
        `${nRivets}×${shearPlanes}×πd²/4×τ`),
      bearing_strength: mkAv(r0(Pb), "N", Pb * 0.05, `n×d×t×σ_br`),
      tearing_strength: mkAv(r0(Pt), "N", Pt * 0.05, `(p-d)×t×σ_t`),
      joint_strength: mkAv(r0(Pjoint), "N", Pjoint * 0.05, failMode),
      joint_efficiency: mkAv(r0(efficiency * 100), "%", efficiency * 100 * 0.03,
        `P_min/P_solid`),
      failure_mode: mkAv(
        failMode === "rivet_shear" ? 1 : failMode === "bearing" ? 2 : 3,
        failMode, 0, src),
      safety_factor: mkAv(r1(SF), "×", SF * 0.05,
        `P_joint/F_applied`),
      rivet_shear_stress: mkAv(r0(tauActual), "MPa", tauActual * 0.05,
        `F/A_shear`),
      bearing_stress: mkAv(r0(sigBearing), "MPa", sigBearing * 0.05,
        `F/(n×d×t)`),
      plate_tensile_stress: mkAv(r0(sigTensile), "MPa", sigTensile * 0.05,
        `F/((p-d)×t)`),
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

export const rivetJointEngine = new RivetJointEngine();
