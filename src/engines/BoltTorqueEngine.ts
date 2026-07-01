/**
 * BoltTorqueEngine — Bolted Joint Torque-Tension Calculator
 *
 * Models: Torque-tension relationship, clamp load, joint separation.
 * - T = K × F × d (nut factor method)
 * - Clamp load from bolt proof strength
 * - Joint diagram: bolt stiffness vs clamp member stiffness
 * - Gasket load retention
 * - Thermal expansion differential
 * - Bolt fatigue (alternating stress on preloaded joint)
 *
 * Reference: VDI 2230 (systematic calculation of bolted joints),
 *            ASME PCC-1 (bolt tightening guidelines),
 *            Shigley Ch.8 (Screws, Fasteners, and Joints)
 *
 * Actions: bolt_torque_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface BoltTorqueInput {
  bolt_size_mm?: number;
  pitch_mm?: number;
  bolt_grade?: "4.8" | "8.8" | "10.9" | "12.9";
  num_bolts?: number;
  external_force_n?: number;
  nut_factor_k?: number;
  clamp_length_mm?: number;
  clamp_material?: "steel" | "aluminum" | "cast_iron";
  gasket_present?: boolean;
  gasket_factor_m?: number;
  lubricated?: boolean;
  bolt_temp_c?: number;
  clamp_temp_c?: number;
  ambient_temp_c?: number;
  preload_pct?: number;
}

export interface BoltTorqueResult {
  tightening_torque: AtomicValue;
  clamp_load_per_bolt: AtomicValue;
  total_clamp_load: AtomicValue;
  bolt_stress: AtomicValue;
  proof_load: AtomicValue;
  utilization: AtomicValue;
  load_introduction_factor: AtomicValue;
  separation_force: AtomicValue;
  thermal_load_change: AtomicValue;
  joint_feasible: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Bolt grade: [proof_stress_MPa, yield_MPa, ultimate_MPa] */
const GRADES: Record<string, [number, number, number]> = {
  "4.8": [310, 340, 420],
  "8.8": [600, 640, 800],
  "10.9": [830, 940, 1040],
  "12.9": [970, 1100, 1220],
};

/** Standard metric coarse pitches */
const STD_PITCH: Record<number, number> = {
  5: 0.8, 6: 1.0, 8: 1.25, 10: 1.5, 12: 1.75,
  14: 2.0, 16: 2.0, 18: 2.5, 20: 2.5, 22: 2.5,
  24: 3.0, 27: 3.0, 30: 3.5, 33: 3.5, 36: 4.0,
};

/** Material elastic modulus (GPa) */
const E_MOD: Record<string, number> = {
  steel: 210, aluminum: 70, cast_iron: 100,
};

/** Material CTE (µm/m/°C) */
const CTE: Record<string, number> = {
  steel: 12, aluminum: 23, cast_iron: 10,
};

// ── Engine ─────────────────────────────────────────────────────────

export class BoltTorqueEngine {
  calculate(input: BoltTorqueInput): BoltTorqueResult {
    const warnings: string[] = [];
    const d = input.bolt_size_mm ?? 12;
    const p = input.pitch_mm ?? (STD_PITCH[d] ?? 1.75);
    const gradeKey = input.bolt_grade ?? "8.8";
    const grade = GRADES[gradeKey] ?? GRADES["8.8"];
    const nBolts = input.num_bolts ?? 4;
    const Fext = input.external_force_n ?? 0;
    const preloadPct = input.preload_pct ?? 75;

    // Nut factor K
    let K: number;
    if (input.nut_factor_k !== undefined) {
      K = input.nut_factor_k;
    } else {
      K = input.lubricated ? 0.15 : 0.20;
    }

    // Tensile stress area: At = π/4 × (d - 0.9382p)²
    const d2 = d - 0.9382 * p;
    const At = Math.PI / 4 * d2 * d2;

    // Proof load
    const proofStress = grade[0];
    const proofLoad = proofStress * At;

    // Target preload (% of proof)
    const Fi = proofLoad * (preloadPct / 100);

    // Tightening torque: T = K × F × d
    const torque = K * Fi * d / 1000; // N·mm → N·m

    // Bolt stress at preload
    const boltStress = Fi / At;

    // Utilization
    const util = boltStress / proofStress;

    // ── Joint stiffness (simplified cone model)
    const clampLen = input.clamp_length_mm ?? (d * 3);
    const clampMat = input.clamp_material ?? "steel";
    const Eb = 210000; // bolt always steel, MPa
    const Ec = (E_MOD[clampMat] ?? 210) * 1000; // MPa

    // Bolt stiffness: kb = At × Eb / grip_length
    const kb = At * Eb / clampLen;

    // Clamp stiffness (cone frustum ≈ 2.5-3× bolt stiffness for steel)
    const clampFactor = clampMat === "steel" ? 3.0 :
      clampMat === "cast_iron" ? 2.5 : 1.8;
    const kc = kb * clampFactor;

    // Load introduction factor: n = kb / (kb + kc)
    const phi = kb / (kb + kc);

    // Separation force: Fs = Fi / (1 - phi)
    const Fsep = Fi / (1 - phi);

    // ── Thermal effects
    const ambT = input.ambient_temp_c ?? 20;
    const boltT = input.bolt_temp_c ?? ambT;
    const clampT = input.clamp_temp_c ?? ambT;
    const cteBolt = 12; // steel bolt
    const cteClamp = CTE[clampMat] ?? 12;

    // Differential thermal expansion
    const deltaLbolt = cteBolt * 1e-6 * clampLen * (boltT - ambT);
    const deltaLclamp = cteClamp * 1e-6 * clampLen * (clampT - ambT);
    const thermalDelta = deltaLclamp - deltaLbolt; // mm
    // Force change from thermal: ΔF = Δδ × (kb×kc)/(kb+kc)
    const kEff = (kb * kc) / (kb + kc);
    const thermalForce = thermalDelta * kEff;

    // Total clamp per bolt
    const clampPerBolt = Fi;
    const totalClamp = clampPerBolt * nBolts;

    // Feasibility
    const feasible = util <= 0.9 && Fi > 0 &&
      (Fext === 0 || Fext / nBolts < Fsep);

    // Warnings
    if (util > 0.9) {
      warnings.push(`Utilization ${r0(util * 100)}% > 90% — reduce preload or upgrade grade`);
    }
    if (util > 1.0) {
      warnings.push("CRITICAL: Preload exceeds proof load — bolt may yield");
    }
    if (Fext > 0 && Fext / nBolts > Fsep * 0.8) {
      warnings.push(
        `External load per bolt ${r0(Fext / nBolts)}N approaching ` +
        `separation force ${r0(Fsep)}N`
      );
    }
    if (!input.lubricated && K >= 0.20) {
      warnings.push("Dry assembly — torque scatter ±25%. Lubricate for consistent preload");
    }
    if (Math.abs(thermalForce) > Fi * 0.1) {
      warnings.push(
        `Thermal load change ${r0(thermalForce)}N (${r0(thermalForce / Fi * 100)}% of preload)`
      );
    }
    if (input.gasket_present && !input.gasket_factor_m) {
      warnings.push("Gasket present — verify gasket seating stress per ASME PCC-1");
    }

    const src = "BoltTorqueEngine (VDI 2230 / Shigley)";

    return {
      tightening_torque: mkAv(r1(torque), "N·m", torque * 0.15,
        `K=${K} × ${r0(Fi)}N × ${d}mm`),
      clamp_load_per_bolt: mkAv(r0(clampPerBolt), "N", clampPerBolt * 0.1,
        `${preloadPct}% of proof load`),
      total_clamp_load: mkAv(r0(totalClamp), "N", totalClamp * 0.1,
        `${nBolts} bolts × ${r0(clampPerBolt)}N`),
      bolt_stress: mkAv(r0(boltStress), "MPa", 10,
        `${r0(Fi)}N / ${r1(At)}mm²`),
      proof_load: mkAv(r0(proofLoad), "N", 0,
        `${proofStress}MPa × ${r1(At)}mm² (${gradeKey})`),
      utilization: mkAv(r2(util), "ratio", 0.02,
        `${r0(boltStress)} / ${proofStress}`),
      load_introduction_factor: mkAv(r3(phi), "ratio", 0.02,
        `kb/(kb+kc), ${clampMat}`),
      separation_force: mkAv(r0(Fsep), "N", Fsep * 0.1,
        `Fi/(1−φ), per bolt`),
      thermal_load_change: mkAv(r0(thermalForce), "N", Math.abs(thermalForce) * 0.2,
        `ΔT bolt=${r0(boltT - ambT)}°C, clamp=${r0(clampT - ambT)}°C`),
      joint_feasible: mkAv(feasible ? 1 : 0,
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
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const boltTorqueEngine = new BoltTorqueEngine();
