/**
 * CrossProcessSymbolicConstraintEnforcerEngine — XPROC-NEURAL Tier 8 (T8-01)
 *
 * The neuro-symbolic safety primitive: projects an arbitrary cutting-condition
 * prediction (typically from CrossProcessNeuralLearningEngine T1-02 or any
 * caller) onto the feasible region defined by physics-backed envelopes and
 * machine specs. Returns the nearest feasible point + structured violations.
 *
 * Why "projection" not "validation":
 *   PPPhysicsConstraintValidatorEngine and MachineEnvelopeGuardEngine VALIDATE
 *   (boolean pass/fail). T8-01 PROJECTS (returns nearest feasible point), so
 *   neural recommendations that exceed envelopes can still be salvaged into a
 *   safe shop-floor-actionable answer rather than rejected outright.
 *
 * Constraints enforced (see CLAUDE.md tiered-omega and src/physics/constants.ts):
 *   1. Kienzle envelope        — Fc = kc1_1 · ap · fz^(1-mc) bounded by spindle power
 *   2. Taylor tool-life floor  — T = (C/Vc)^(1/n) ≥ T_min_min
 *   3. Spindle RPM ceiling     — rpm = Vc·1000 / (π·D) ≤ machine.maxSpindleRpm
 *   4. Axis rapid feed ceiling — feed = fz·teeth·rpm ≤ machine.maxRapidMmPerMin
 *
 * Projection strategy (lexicographic, safety-first):
 *   - Power violation: reduce vc until Pkw = max (vc is the most direct lever).
 *   - Tool-life violation: reduce vc until T = T_min.
 *   - RPM violation: reduce vc (rpm ∝ vc at fixed D).
 *   - Rapid violation: reduce fz (feed ∝ fz at fixed rpm·teeth).
 *
 * Constraints are applied IN ORDER; later constraints see the projected vc/fz
 * from earlier constraints. The result is guaranteed feasible if T_min, max
 * spindle power, max rpm, and max rapid are all positive (the typical case).
 *
 * Per-engine references:
 *   Kienzle (1957) — "Bestimmung von Kräften und Leistungen an spanenden
 *                    Werkzeugen und Werkzeugmaschinen"
 *   Taylor (1907)  — "On the Art of Cutting Metals"
 *
 * Per CLAUDE.md "wire to all sources": this engine is consumed by
 * `prism_intelligence` (xproc namespace) AND `prism_safety` (validate_physics).
 * Wiring to prism_intelligence is in the same commit; prism_safety integration
 * is delegated to T8-03 (CrossProcessNeuroSymbolicSafetyVerifierEngine).
 *
 * @module CrossProcessSymbolicConstraintEnforcerEngine
 */

import { z } from "zod";
import { getKienzle, getTaylor, kienzleForce, type ISOGroup } from "../physics/constants.js";

/**
 * Input prediction — partial cutting conditions to project. Any field may be
 * omitted; missing fields are computed from defaults or skipped from
 * constraint checks where the math can't proceed.
 */
const PredictionSchema = z.object({
  vc_m_min: z.number().positive().finite().optional(),  // surface speed m/min
  fz_mm_tooth: z.number().positive().finite().optional(), // feed per tooth mm
  ap_mm: z.number().positive().finite().optional(),       // depth of cut mm
  rpm: z.number().positive().finite().optional(),         // can be derived from vc + D
});

const ToolSchema = z.object({
  diameter_mm: z.number().positive().finite(),
  flutes: z.number().int().positive(),
});

const MachineSchema = z.object({
  maxSpindleRpm: z.number().positive().finite(),
  maxSpindlePowerKw: z.number().positive().finite(),
  maxRapidMmPerMin: z.number().positive().finite(),
});

const ProjectionInputSchema = z.object({
  prediction: PredictionSchema,
  state: z.object({
    material: z.string().min(1),  // ISO group letter or full alias (resolved by getKienzle)
    tool: ToolSchema,
    machine: MachineSchema,
    operation: z.enum(["mill", "turn", "drill"]),
    minToolLifeMin: z.number().positive().finite().default(15),
  }),
});

export type ProjectionInput = z.infer<typeof ProjectionInputSchema>;

export type ConstraintName =
  | "spindle_power"
  | "taylor_tool_life"
  | "spindle_rpm"
  | "axis_rapid";

export type ConstraintSeverity = "minor" | "major" | "critical";

export interface ConstraintViolation {
  constraint: ConstraintName;
  field: "vc_m_min" | "fz_mm_tooth" | "rpm";
  original: number;
  projected: number;
  severity: ConstraintSeverity;
  rationale: string;
}

export interface ProjectionResult {
  projected: {
    vc_m_min: number;
    fz_mm_tooth: number;
    ap_mm: number;
    rpm: number;
  };
  violations: ConstraintViolation[];
  feasible: boolean;
  inputCompleteness: number;  // 0..1: how many prediction fields were populated
}

const PI = Math.PI;
const POWER_KW_FROM_FC_VC = (fc_N: number, vc_m_min: number): number =>
  (fc_N * vc_m_min) / (60 * 1000);  // P [kW] = F [N] × v [m/s] / 1000; v_m/s = vc/60

/** Severity bucketing by relative magnitude of projection. */
function classifySeverity(original: number, projected: number): ConstraintSeverity {
  if (original <= 0 || projected <= 0) return "critical";
  const ratio = original / projected;
  if (ratio > 2.0) return "critical";
  if (ratio > 1.25) return "major";
  return "minor";
}

/** Resolve material string → ISO group + Kienzle/Taylor coefficients. */
function resolveMaterial(material: string): {
  iso: ISOGroup;
  kc1_1: number;
  mc: number;
  taylor_C: number;
  taylor_n: number;
} {
  // Try direct ISO letter first
  const upper = material.trim().toUpperCase();
  if (["P", "M", "K", "N", "S", "H"].includes(upper)) {
    const k = getKienzle(upper);
    const t = getTaylor(upper);
    return { iso: upper as ISOGroup, kc1_1: k.kc1_1, mc: k.mc, taylor_C: t.C, taylor_n: t.n };
  }
  // Otherwise let getKienzle/getTaylor resolve (they handle aliases)
  const k = getKienzle(material);
  const t = getTaylor(material);
  // Default ISO to P if alias resolution can't determine (most common)
  return { iso: "P", kc1_1: k.kc1_1, mc: k.mc, taylor_C: t.C, taylor_n: t.n };
}

export class CrossProcessSymbolicConstraintEnforcerEngine {
  /**
   * Project a cutting-condition prediction onto the physics-feasible region.
   *
   * @param input - prediction + state (material, tool, machine, operation)
   * @returns projected conditions + structured violations + feasibility flag
   * @throws Zod validation error on malformed input (per engines.md: never silentCatch)
   */
  static project(input: ProjectionInput): ProjectionResult {
    const parsed = ProjectionInputSchema.parse(input);
    const { prediction, state } = parsed;
    const { material, tool, machine, operation, minToolLifeMin } = state;

    const mat = resolveMaterial(material);

    // Inflate prediction with derived fields. If vc and rpm are inconsistent,
    // trust vc (the speed the operator intends) and recompute rpm.
    const vc0 = prediction.vc_m_min ?? (
      prediction.rpm !== undefined
        ? (prediction.rpm * PI * tool.diameter_mm) / 1000
        : 100  // fallback m/min when nothing supplied
    );
    const fz0 = prediction.fz_mm_tooth ?? 0.05;  // conservative default
    const ap0 = prediction.ap_mm ?? 1.0;
    const rpm0 = prediction.rpm ?? (vc0 * 1000) / (PI * tool.diameter_mm);

    // Track input completeness (used by callers for trust scoring)
    const supplied = [prediction.vc_m_min, prediction.fz_mm_tooth, prediction.ap_mm, prediction.rpm]
      .filter((v) => v !== undefined).length;
    const inputCompleteness = supplied / 4;

    let vc = vc0;
    let fz = fz0;
    const ap = ap0;  // depth not currently projected (operator commits this)
    const violations: ConstraintViolation[] = [];

    // ---- Constraint 1: Spindle power (Kienzle + machine.maxSpindlePowerKw) ----
    const fc0 = kienzleForce(mat.kc1_1, mat.mc, ap, fz);
    const power0 = POWER_KW_FROM_FC_VC(fc0, vc);
    if (power0 > machine.maxSpindlePowerKw) {
      // P = Fc · vc / 60000; Fc constant at this fz/ap → reduce vc to max-allowed
      const vcMax = (machine.maxSpindlePowerKw * 60 * 1000) / fc0;
      const vcProjected = Math.max(1, vcMax * 0.95);  // 5% safety margin
      violations.push({
        constraint: "spindle_power",
        field: "vc_m_min",
        original: vc,
        projected: vcProjected,
        severity: classifySeverity(vc, vcProjected),
        rationale: `Kienzle Fc=${fc0.toFixed(0)}N at ap=${ap}mm fz=${fz}mm/tooth gives P=${power0.toFixed(2)}kW; machine cap ${machine.maxSpindlePowerKw}kW. Reduce vc.`,
      });
      vc = vcProjected;
    }

    // ---- Constraint 2: Taylor tool-life floor ----
    // T = (C/vc)^(1/n) ≥ T_min  ⟹  vc ≤ C / T_min^n
    const taylorVcMax = mat.taylor_C / Math.pow(minToolLifeMin, mat.taylor_n);
    if (vc > taylorVcMax) {
      const vcProjected = taylorVcMax * 0.98;  // small safety margin
      violations.push({
        constraint: "taylor_tool_life",
        field: "vc_m_min",
        original: vc,
        projected: vcProjected,
        severity: classifySeverity(vc, vcProjected),
        rationale: `Taylor C=${mat.taylor_C} n=${mat.taylor_n}: T_min=${minToolLifeMin}min requires vc ≤ ${taylorVcMax.toFixed(1)} m/min.`,
      });
      vc = vcProjected;
    }

    // ---- Constraint 3: Spindle RPM ceiling ----
    let rpm = (vc * 1000) / (PI * tool.diameter_mm);
    if (rpm > machine.maxSpindleRpm) {
      const vcProjected = (machine.maxSpindleRpm * PI * tool.diameter_mm) / 1000;
      violations.push({
        constraint: "spindle_rpm",
        field: "rpm",
        original: rpm,
        projected: machine.maxSpindleRpm,
        severity: classifySeverity(rpm, machine.maxSpindleRpm),
        rationale: `RPM=${rpm.toFixed(0)} exceeds machine cap ${machine.maxSpindleRpm}. Reduced vc to ${vcProjected.toFixed(1)} m/min.`,
      });
      vc = vcProjected;
      rpm = machine.maxSpindleRpm;
    }

    // ---- Constraint 4: Axis rapid feed ceiling ----
    const feedMmMin = fz * tool.flutes * rpm;
    if (feedMmMin > machine.maxRapidMmPerMin) {
      const fzProjected = machine.maxRapidMmPerMin / (tool.flutes * rpm);
      violations.push({
        constraint: "axis_rapid",
        field: "fz_mm_tooth",
        original: fz,
        projected: fzProjected,
        severity: classifySeverity(fz, fzProjected),
        rationale: `Feed=${feedMmMin.toFixed(0)} mm/min exceeds rapid cap ${machine.maxRapidMmPerMin}. Reduced fz.`,
      });
      fz = fzProjected;
    }

    return {
      projected: {
        vc_m_min: vc,
        fz_mm_tooth: fz,
        ap_mm: ap,
        rpm,
      },
      violations,
      feasible: violations.every((v) => v.severity !== "critical"),
      inputCompleteness,
    };
  }

  /**
   * Convenience: returns just the violations without projecting.
   * Useful for audit-only callers and pre-flight gates.
   */
  static violations(input: ProjectionInput): ConstraintViolation[] {
    return CrossProcessSymbolicConstraintEnforcerEngine.project(input).violations;
  }

  /** Engine identifier for telemetry / logging. */
  static readonly engineId = "CrossProcessSymbolicConstraintEnforcerEngine";
  static readonly version = "1.0.0";
  static readonly tier = "T8-01";
}

export const crossProcessSymbolicConstraintEnforcerEngine =
  CrossProcessSymbolicConstraintEnforcerEngine;

/**
 * Dispatcher convenience wrapper — matches the (action, params) signature used
 * by intelligenceDispatcher CORE_ROUTING. Throws on unknown action so callers
 * see a clear error rather than silent undefined.
 */
export function crossProcessSymbolicEnforcer(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_symbolic_project":
      return CrossProcessSymbolicConstraintEnforcerEngine.project(params as ProjectionInput);
    case "xproc_symbolic_violations":
      return { violations: CrossProcessSymbolicConstraintEnforcerEngine.violations(params as ProjectionInput) };
    default:
      throw new Error(`crossProcessSymbolicEnforcer: unknown action '${action}'`);
  }
}
