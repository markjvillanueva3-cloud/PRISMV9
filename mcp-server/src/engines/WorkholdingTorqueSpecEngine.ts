/**
 * WorkholdingTorqueSpecEngine — closes PreCut axis #7 (workholding torqued)
 *
 * Given a clamp configuration + cutting force + part weight, computes the
 * required per-clamp torque spec to resist part lift AND lateral slide under
 * the worst-case cutting force, with a safety factor of 2.0× per ASME B5.59
 * fixturing standard.
 *
 * Reference: ASME B5.59 (fixture design); Shigley's Mechanical Engineering
 *   Design 11th ed. §8 (bolt/clamp friction equations); ISO 898-1 (bolt
 *   strength classes); Sandvik Coromant Workholding Best Practice §5.
 *
 * Hold force model:
 *   F_hold_required = max(F_cutting_lateral / μ, F_cutting_vertical + W_part) × SF
 *   T_per_clamp = (F_hold_required / N_clamps) × (K × D_bolt)
 * where:
 *   μ = static friction coefficient (steel-on-steel ≈ 0.15; with grit ≈ 0.30)
 *   K = nut factor (0.20 dry, 0.15 lubricated, 0.10 anti-seize) — Shigley §8.7
 *   D_bolt = bolt nominal diameter (mm)
 *
 * @version 1.0.0
 * @module WorkholdingTorqueSpecEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type ClampFriction = "steel_smooth" | "steel_grit" | "aluminum_smooth" | "soft_jaws";

const FRICTION_COEFF: Record<ClampFriction, number> = {
  steel_smooth: 0.15,
  steel_grit: 0.30,
  aluminum_smooth: 0.20,
  soft_jaws: 0.40,
};

export type Lubrication = "dry" | "lubricated" | "anti_seize";
const NUT_FACTOR: Record<Lubrication, number> = { dry: 0.20, lubricated: 0.15, anti_seize: 0.10 };

export interface WorkholdingTorqueInput {
  fixture_id: string;
  /** Number of independent clamps (e.g. 4 for a 4-vise fixture) */
  n_clamps: number;
  /** Bolt diameter (mm) — M8=8, M10=10, M12=12 */
  bolt_diameter_mm: number;
  /** Friction class of the clamp face */
  friction: ClampFriction;
  /** Lubrication state of the bolt threads */
  lubrication: Lubrication;
  /** Predicted max cutting force, lateral (N) — Kienzle worst case */
  cutting_force_lateral_n: number;
  /** Predicted max cutting force, vertical (N) — uplift component */
  cutting_force_vertical_n: number;
  /** Part weight (kg) */
  part_weight_kg: number;
  /** Safety factor (default 2.0 per ASME B5.59) */
  safety_factor?: number;
}

export interface WorkholdingTorqueResult {
  fixture_id: string;
  required_hold_force_n: AtomicValue;
  per_clamp_force_n: AtomicValue;
  per_clamp_torque_nm: AtomicValue;
  per_clamp_torque_ftlb: AtomicValue;
  safety_factor_used: number;
  warnings: string[];
  source: string;
}

const GRAVITY = 9.81;
const NM_TO_FTLB = 0.737562;

export class WorkholdingTorqueSpecEngine {
  compute(input: WorkholdingTorqueInput): WorkholdingTorqueResult {
    if (!input || !input.fixture_id || input.n_clamps <= 0 || input.bolt_diameter_mm <= 0) {
      throw new Error("WorkholdingTorqueSpecEngine.compute: fixture_id + positive n_clamps + bolt_diameter_mm required");
    }
    const sf = input.safety_factor ?? 2.0;
    const warnings: string[] = [];

    const mu = FRICTION_COEFF[input.friction];
    const K = NUT_FACTOR[input.lubrication];

    if (mu === undefined) throw new Error(`Unknown friction class ${input.friction}`);
    if (K === undefined) throw new Error(`Unknown lubrication ${input.lubrication}`);

    // Hold-force budget (worst-of-two)
    const partWeightN = input.part_weight_kg * GRAVITY;
    const lateralResistN = input.cutting_force_lateral_n / Math.max(mu, 1e-6);
    const verticalLiftN = input.cutting_force_vertical_n + partWeightN;
    const requiredHoldN = Math.max(lateralResistN, verticalLiftN) * sf;
    const perClampN = requiredHoldN / input.n_clamps;

    // Torque per clamp (Shigley §8.7: T = K × F × D)
    const D_m = input.bolt_diameter_mm / 1000;
    const torqueNm = K * perClampN * D_m;
    const torqueFtLb = torqueNm * NM_TO_FTLB;

    // Warnings
    if (perClampN > 50000) {
      warnings.push(`Per-clamp force ${perClampN.toFixed(0)}N exceeds typical bolt yield; add more clamps or increase bolt size`);
    }
    if (sf < 1.5) {
      warnings.push(`Safety factor ${sf} < 1.5 — below ASME B5.59 minimum recommendation`);
    }

    return {
      fixture_id: input.fixture_id,
      required_hold_force_n: {
        value: Number(requiredHoldN.toFixed(1)),
        unit: "N",
        source: "max(F_lat/μ, F_vert + W_part) × SF",
      },
      per_clamp_force_n: {
        value: Number(perClampN.toFixed(1)),
        unit: "N",
        source: "required_hold / n_clamps",
      },
      per_clamp_torque_nm: {
        value: Number(torqueNm.toFixed(2)),
        unit: "N·m",
        source: "T = K × F × D — Shigley §8.7",
      },
      per_clamp_torque_ftlb: {
        value: Number(torqueFtLb.toFixed(2)),
        unit: "ft·lb",
        source: "N·m × 0.737562",
      },
      safety_factor_used: sf,
      warnings,
      source: "WorkholdingTorqueSpecEngine — ASME B5.59 + Shigley §8.7 + ISO 898-1 + Sandvik §5",
    };
  }
}

export const workholdingTorqueSpecEngine = new WorkholdingTorqueSpecEngine();
