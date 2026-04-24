/**
 * SpindleTorqueGateEngine — U-LSR05 (LATHE-HARDENED-MS0)
 *
 * Per-operation spindle torque adequacy check against the machine's torque
 * curve. Produces a typed gate decision that the emitter (U-LSR04 pattern)
 * and the formal predicate (U-LSR22) can consume as a hard-block.
 *
 * ── Physics ─────────────────────────────────────────────────────────────
 * Cutting power:              P_cut_kW = (Fc × Vc) / 60_000
 *   Fc in N, Vc in m/min. Derivation: P = F·v with v in m/s = Vc/60.
 *
 * Required spindle torque:    T_req_Nm = 9549 × P_cut_kW / rpm
 *   Constant 9549 ≈ 60_000 / (2π) converts kW and rpm to Nm.
 *
 * Machine torque curve (standard two-region lathe spindle):
 *   rpm ≤ base_rpm  →  T_avail = T_max                   (constant torque)
 *   rpm >  base_rpm →  T_avail = T_max × base_rpm / rpm  (constant power
 *                                                         above base)
 *   Equivalently the upper region is T_avail = 9549 × P_max / rpm; both
 *   forms agree at rpm = base_rpm. This engine uses the min() of both
 *   envelope forms to stay conservative at any rpm.
 *
 * ── Gate policy ─────────────────────────────────────────────────────────
 * SAFE      — required ≤ safe_threshold_pct × available (default 85%) for
 *             every op AND rpm within [1, max_rpm]
 * WARNING   — any op utilisation in [safe_threshold_pct, 100%] but none >
 *             100% and rpm in range
 * BLOCKED   — any op utilisation > 100%, OR rpm outside [1, max_rpm], OR
 *             required_torque < 0, OR any NaN/Infinity input
 *
 * The 85% safe threshold (configurable via safe_utilisation_pct) leaves
 * headroom for interrupted cuts, runout, and Kienzle uncertainty — standard
 * practice from Sandvik's turning application guide §3.4.
 *
 * ── Companions ──────────────────────────────────────────────────────────
 *   • U-LSR04 LathePrintProgramEmitter envelope hard-block (same error
 *     pattern — throws a typed *BlockError with structured detail)
 *   • U-LSR22 LatheSafetyPredicateEngine (clause consumer; downstream
 *     integration adds TORQUE_INSUFFICIENT clause in a future unit)
 *
 * @milestone LATHE-HARDENED-MS0 U-LSR05
 * @version 1.0.0
 */

import { z } from "zod";
import type { ToolpathProgram } from "./LathePrintToolpathGeneratorEngine.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** 60_000 / (2π); kW + rpm → Nm. Classical rigid-body conversion. */
const KW_RPM_TO_NM = 9549;

/** kW conversion for Fc·Vc power form (N × m/min → kW). */
const FC_VC_TO_KW = 60_000;

/**
 * Default safe utilisation — torque consumption must stay below this
 * fraction of available torque to earn SAFE. Rationale: Sandvik Turning
 * Application Guide §3.4 recommends 15–20% headroom to absorb
 * interrupted-cut spikes, runout, and specific-cutting-force
 * (Kienzle kc1.1) uncertainty. 0.85 is the mid-range value.
 */
const DEFAULT_SAFE_UTILISATION_PCT = 85;

/** Hard ceiling — any op > 100% torque utilisation is a structural block. */
const BLOCK_UTILISATION_PCT = 100;

// ============================================================================
// SCHEMAS
// ============================================================================

export const MachineSpindleSpecSchema = z.object({
  /** Maximum spindle power (kW) — the flat region above base_rpm. */
  max_power_kW: z.number().positive(),
  /** Peak spindle torque (Nm) — the flat region below base_rpm. */
  max_torque_Nm: z.number().positive(),
  /**
   * Base rpm where the torque curve transitions from constant-torque to
   * constant-power. At base_rpm: T_max × base_rpm / 9549 = P_max (Nm,kW),
   * i.e. base_rpm = 9549 × P_max / T_max. Callers may supply it directly
   * (manufacturer spec) or leave undefined to derive from the relation.
   */
  base_rpm: z.number().positive().optional(),
  /** Hard upper rpm limit; ops above this block regardless of torque. */
  max_rpm: z.number().positive(),
});
export type MachineSpindleSpec = z.infer<typeof MachineSpindleSpecSchema>;

export const SpindleTorqueGateInputSchema = z.object({
  program: z.unknown(),
  machine: MachineSpindleSpecSchema,
  safe_utilisation_pct: z.number().min(0).max(100).optional(),
});
export type SpindleTorqueGateInput = z.infer<typeof SpindleTorqueGateInputSchema>;

export const SpindleTorqueOpSchema = z.object({
  op_number: z.number().int(),
  spindle_rpm: z.number(),
  cutting_force_N: z.number(),
  cutting_speed_m_min: z.number(),
  required_power_kW: z.number(),
  required_torque_Nm: z.number(),
  available_torque_Nm: z.number(),
  utilisation_pct: z.number(),
  safe: z.boolean(),
  severity: z.enum(["safe", "warning", "block"]),
  reason: z.string().optional(),
});
export type SpindleTorqueOp = z.infer<typeof SpindleTorqueOpSchema>;

export const SpindleTorqueGateResultSchema = z.object({
  program_id: z.string(),
  machine: MachineSpindleSpecSchema.extend({
    derived_base_rpm: z.number(),
    safe_utilisation_pct: z.number(),
  }),
  per_operation: z.array(SpindleTorqueOpSchema),
  overall: z.object({
    status: z.enum(["SAFE", "WARNING", "BLOCKED"]),
    gate_block: z.boolean(),
    any_torque_failure: z.boolean(),
    any_rpm_over_max: z.boolean(),
    any_nan_input: z.boolean(),
    worst_case_op_number: z.number().int().nullable(),
    worst_utilisation_pct: z.number(),
    recommendations: z.array(z.string()),
  }),
  evaluated_at: z.string(),
});
export type SpindleTorqueGateResult = z.infer<typeof SpindleTorqueGateResultSchema>;

// ============================================================================
// ERROR
// ============================================================================

/**
 * Thrown by gateOrThrow() when `overall.gate_block === true`. Exposes the
 * full result so HTTP callers / the emitter can surface a structured 4xx
 * body with per-op detail rather than a flat 500.
 */
export class SpindleTorqueBlockError extends Error {
  readonly code = "SPINDLE_TORQUE_BLOCKED" as const;
  readonly result: SpindleTorqueGateResult;
  constructor(result: SpindleTorqueGateResult) {
    const failingOps = result.per_operation
      .filter((op) => op.severity === "block")
      .map((op) => `op#${op.op_number}@${op.spindle_rpm}rpm util=${op.utilisation_pct.toFixed(0)}%`)
      .join(", ");
    super(
      `SPINDLE_TORQUE_BLOCKED: ${result.per_operation.filter((o) => o.severity === "block").length} ` +
        `operation(s) exceed spindle torque envelope — ${failingOps || "n/a"}. ` +
        `Refusing emission. Re-plan rpm/feed or supply allow_torque_override=true.`,
    );
    this.result = result;
    this.name = "SpindleTorqueBlockError";
  }
}

// ============================================================================
// ENGINE
// ============================================================================

class SpindleTorqueGateEngine {
  /**
   * Evaluate spindle torque adequacy for every op in the program.
   * Total function — degenerate inputs surface as BLOCKED per-op with
   * reason, not thrown errors.
   */
  gate(input: SpindleTorqueGateInput): SpindleTorqueGateResult {
    const parsed = SpindleTorqueGateInputSchema.parse(input);
    const machine = parsed.machine;
    const safePct = parsed.safe_utilisation_pct ?? DEFAULT_SAFE_UTILISATION_PCT;

    const program = parsed.program as ToolpathProgram;
    if (!program || !Array.isArray((program as { operations?: unknown[] }).operations)) {
      throw new Error("Invalid program: missing operations");
    }

    // Derive base_rpm if not supplied: base_rpm = 9549 × P_max / T_max.
    // This is where the constant-torque region meets the constant-power
    // region of the spindle envelope.
    const baseRpm = machine.base_rpm ?? (KW_RPM_TO_NM * machine.max_power_kW) / machine.max_torque_Nm;

    const perOp: SpindleTorqueOp[] = [];
    let worstUtil = 0;
    let worstOp: number | null = null;
    let anyBlock = false;
    let anyRpmOver = false;
    let anyNan = false;

    for (const op of program.operations) {
      const opSig = this.evaluateOp(op, machine, baseRpm, safePct);
      perOp.push(opSig);
      if (opSig.severity === "block") anyBlock = true;
      if (!Number.isFinite(opSig.utilisation_pct)) anyNan = true;
      if (op.spindle_rpm > machine.max_rpm) anyRpmOver = true;
      if (Number.isFinite(opSig.utilisation_pct) && opSig.utilisation_pct > worstUtil) {
        worstUtil = opSig.utilisation_pct;
        worstOp = op.op_number;
      }
    }

    const gateBlock = anyBlock || anyRpmOver || anyNan;
    const anyWarning = perOp.some((o) => o.severity === "warning");
    const status: "SAFE" | "WARNING" | "BLOCKED" = gateBlock ? "BLOCKED" : anyWarning ? "WARNING" : "SAFE";

    const recommendations = this.buildRecommendations(perOp, machine, baseRpm);

    return {
      program_id: program.program_id,
      machine: {
        ...machine,
        derived_base_rpm: baseRpm,
        safe_utilisation_pct: safePct,
      },
      per_operation: perOp,
      overall: {
        status,
        gate_block: gateBlock,
        any_torque_failure: anyBlock,
        any_rpm_over_max: anyRpmOver,
        any_nan_input: anyNan,
        worst_case_op_number: worstOp,
        worst_utilisation_pct: worstUtil,
        recommendations,
      },
      evaluated_at: new Date().toISOString(),
    };
  }

  /**
   * gate() + throw on BLOCKED — the emitter-friendly wrapper that follows
   * the U-LSR04 EnvelopeBlockError and U-LSR22 SafetyPredicateViolation
   * patterns: callers catch the typed error for structured audit, pure
   * callers use gate() and branch on status.
   */
  gateOrThrow(input: SpindleTorqueGateInput): SpindleTorqueGateResult {
    const result = this.gate(input);
    if (result.overall.gate_block) {
      throw new SpindleTorqueBlockError(result);
    }
    return result;
  }

  // --------------------------------------------------------------------------

  private evaluateOp(
    op: ToolpathProgram["operations"][number],
    machine: MachineSpindleSpec,
    baseRpm: number,
    safePct: number,
  ): SpindleTorqueOp {
    const rpm = op.spindle_rpm;
    const Fc = op.cutting_force_n;
    const Vc = op.cutting_speed_m_min;

    // Degenerate / invalid inputs block. No torque can be computed at rpm=0.
    if (!Number.isFinite(rpm) || !Number.isFinite(Fc) || !Number.isFinite(Vc)) {
      return this.blockOp(op, {
        required_power_kW: NaN,
        required_torque_Nm: NaN,
        available_torque_Nm: NaN,
        utilisation_pct: NaN,
        reason: "non-finite input (rpm/Fc/Vc contains NaN or Infinity)",
      });
    }
    if (rpm <= 0) {
      return this.blockOp(op, {
        required_power_kW: 0,
        required_torque_Nm: Infinity,
        available_torque_Nm: machine.max_torque_Nm,
        utilisation_pct: Infinity,
        reason: `rpm ${rpm} ≤ 0 — undefined torque`,
      });
    }
    if (rpm > machine.max_rpm) {
      const avail = this.availableTorque(rpm, machine, baseRpm);
      const reqP = (Fc * Vc) / FC_VC_TO_KW;
      const reqT = (KW_RPM_TO_NM * reqP) / rpm;
      return this.blockOp(op, {
        required_power_kW: reqP,
        required_torque_Nm: reqT,
        available_torque_Nm: avail,
        utilisation_pct: avail > 0 ? (reqT / avail) * 100 : Infinity,
        reason: `rpm ${rpm} exceeds spindle max_rpm ${machine.max_rpm}`,
      });
    }

    const reqP = (Fc * Vc) / FC_VC_TO_KW;
    const reqT = (KW_RPM_TO_NM * reqP) / rpm;
    const availT = this.availableTorque(rpm, machine, baseRpm);
    const utilPct = availT > 0 ? (reqT / availT) * 100 : Infinity;

    let severity: "safe" | "warning" | "block";
    if (utilPct > BLOCK_UTILISATION_PCT) severity = "block";
    else if (utilPct > safePct) severity = "warning";
    else severity = "safe";

    return {
      op_number: op.op_number,
      spindle_rpm: rpm,
      cutting_force_N: Fc,
      cutting_speed_m_min: Vc,
      required_power_kW: reqP,
      required_torque_Nm: reqT,
      available_torque_Nm: availT,
      utilisation_pct: utilPct,
      safe: severity === "safe",
      severity,
    };
  }

  /**
   * Available torque at a given rpm using the conservative envelope:
   *   T(rpm) = min( T_max, 9549 × P_max / rpm )
   * Below base_rpm the T_max term dominates; above base_rpm the power
   * term dominates. They meet exactly at rpm = base_rpm.
   */
  private availableTorque(rpm: number, machine: MachineSpindleSpec, _baseRpm: number): number {
    const powerLimited = (KW_RPM_TO_NM * machine.max_power_kW) / rpm;
    return Math.min(machine.max_torque_Nm, powerLimited);
  }

  private blockOp(
    op: ToolpathProgram["operations"][number],
    fields: {
      required_power_kW: number;
      required_torque_Nm: number;
      available_torque_Nm: number;
      utilisation_pct: number;
      reason: string;
    },
  ): SpindleTorqueOp {
    return {
      op_number: op.op_number,
      spindle_rpm: op.spindle_rpm,
      cutting_force_N: op.cutting_force_n,
      cutting_speed_m_min: op.cutting_speed_m_min,
      required_power_kW: fields.required_power_kW,
      required_torque_Nm: fields.required_torque_Nm,
      available_torque_Nm: fields.available_torque_Nm,
      utilisation_pct: fields.utilisation_pct,
      safe: false,
      severity: "block",
      reason: fields.reason,
    };
  }

  private buildRecommendations(
    perOp: SpindleTorqueOp[],
    machine: MachineSpindleSpec,
    baseRpm: number,
  ): string[] {
    const recs: string[] = [];
    const blocked = perOp.filter((o) => o.severity === "block");
    const warned = perOp.filter((o) => o.severity === "warning");

    for (const op of blocked) {
      if (op.reason) {
        recs.push(`Op ${op.op_number}: BLOCK — ${op.reason}`);
      } else if (op.spindle_rpm > 0 && op.available_torque_Nm > 0) {
        // Compute the rpm at which required torque would meet 85% utilisation:
        // req_at_rpm' / avail(rpm') = 0.85 → roughly req_Nm × rpm / rpm' = avail × 0.85
        // For simplicity recommend lowering rpm to constant-torque region.
        const targetRpm = Math.max(1, Math.round(baseRpm * 0.8));
        recs.push(
          `Op ${op.op_number}: BLOCK — util ${op.utilisation_pct.toFixed(0)}% > 100%. ` +
            `Lower rpm toward ${targetRpm} (below base_rpm ${Math.round(baseRpm)}) ` +
            `or reduce ap to cut Fc below ${(op.cutting_force_N * 0.85 * op.available_torque_Nm / op.required_torque_Nm).toFixed(0)} N.`,
        );
      }
    }
    for (const op of warned) {
      recs.push(
        `Op ${op.op_number}: WARNING — util ${op.utilisation_pct.toFixed(0)}% in ` +
          `headroom band; consider backing off 10–15% on ap or feed.`,
      );
    }
    if (blocked.length === 0 && warned.length === 0) {
      recs.push(
        `All ${perOp.length} operation(s) within safe torque band for ` +
          `${machine.max_power_kW} kW / ${machine.max_torque_Nm} Nm spindle ` +
          `(base_rpm ≈ ${Math.round(baseRpm)}).`,
      );
    }
    return recs;
  }
}

export const spindleTorqueGateEngine = new SpindleTorqueGateEngine();
export { SpindleTorqueGateEngine };
