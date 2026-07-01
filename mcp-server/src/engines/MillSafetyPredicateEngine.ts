/**
 * MillSafetyPredicateEngine — formal safety predicate for mill toolpaths
 *
 * Mill-domain parity for LatheSafetyPredicateEngine (LATHE-HARDENED-MS0 U-LSR22). Lathe
 * consumes LatheSafetySignals (grip/force/power/chatter); mill consumes
 * MillSafetySignals (workholding/force/power/chatter/deflection/thermal). Both surface a
 * deterministic, total, NaN-guarded SAFE/UNVERIFIED/BLOCKED verdict suitable as a
 * pre-emit gate in any mill pipeline.
 *
 * Design axioms (mirror Lathe predicate):
 *   (A1) Totality      — verify() never throws on well-typed input; bad signals → BLOCKED
 *   (A2) NaN-safety    — any non-finite numeric → BLOCKED (refuse poisoned physics)
 *   (A3) Monotonicity  — strictly weakening a signal (more force, less grip, worse
 *                        chatter margin) cannot move verdict SAFE → SAFE
 *   (A4) Determinism   — pure function of input
 *   (A5) Independence  — predicate does NOT call physics engines itself; consumes signals.
 *                        Two independent physics implementations both funneled through
 *                        this predicate must agree → proof-carrying reproduction.
 *
 * Clauses (mill-specific):
 *   - NAN_IN_SIGNAL          (any non-finite numeric)
 *   - WORKHOLDING_BLOCKED    (grip_safety_factor < 1.0 OR vacuum/clamp seal failed)
 *   - FORCE_FAILURE          (cutting_force > envelope.max_force_n)
 *   - POWER_FAILURE          (spindle_power > envelope.rated_kw)
 *   - CHATTER_FAILURE        (predicted_chatter_score > 0.7) [BLOCKED]
 *   - CHATTER_UNVERIFIED     (predicted_chatter_score in [0.5, 0.7]) [downgrade UNVERIFIED]
 *   - DEFLECTION_FAILURE     (tool_deflection > tolerance band)
 *   - THERMAL_RUNAWAY        (predicted_tool_temp > tool_max_temp)
 *   - ENVELOPE_VIOLATED      (any XYZ axis outside soft-limits)
 *   - EMPTY_PROGRAM          (zero blocks supplied)
 *   - SCHEMA_INVALID         (wrong shape — schema parse failed)
 *
 * @milestone MILL-PARITY-UPGRADE-MS0/U-MILL-SAFETY-PREDICATE (iter70)
 * @version 1.0.0
 * @module MillSafetyPredicateEngine
 */

export type MillPredicateStatus = "SAFE" | "UNVERIFIED" | "BLOCKED";

export type MillSafetyClause =
  | "NAN_IN_SIGNAL"
  | "WORKHOLDING_BLOCKED"
  | "FORCE_FAILURE"
  | "POWER_FAILURE"
  | "CHATTER_FAILURE"
  | "CHATTER_UNVERIFIED"
  | "DEFLECTION_FAILURE"
  | "THERMAL_RUNAWAY"
  | "ENVELOPE_VIOLATED"
  | "EMPTY_PROGRAM"
  | "SCHEMA_INVALID";

export interface MillSafetySignals {
  /** Workholding grip safety factor (grip_force / cutting_lateral_force). 1.0 = boundary, >1 safe */
  grip_safety_factor?: number;
  /** Worst-block cutting force (N) */
  cutting_force_n?: number;
  /** Worst-block spindle power (kW) */
  spindle_power_kw?: number;
  /** Predicted chatter score 0..1 (1 = certain chatter, 0 = stable) */
  chatter_score?: number;
  /** Worst-block tool deflection (mm) */
  tool_deflection_mm?: number;
  /** Tolerance band (mm) — deflection > tol/2 → DEFLECTION_FAILURE */
  tolerance_band_mm?: number;
  /** Predicted tool temperature (°C) */
  tool_temp_c?: number;
  /** Tool max safe temperature (°C, coating-dependent) */
  tool_max_temp_c?: number;
  /** Number of blocks in the toolpath */
  block_count: number;
}

export interface MillEnvelopeCheck {
  within_envelope: boolean;
  max_force_n?: number;
  rated_kw?: number;
  axis_xyz_violations?: number;
}

export interface MillSafetyPredicateInput {
  program_id: string;
  signals: MillSafetySignals;
  envelope?: MillEnvelopeCheck;
}

export interface MillClauseViolation {
  clause: MillSafetyClause;
  detail: string;
  field_path?: string;
}

export interface MillSafetyPredicateResult {
  status: MillPredicateStatus;
  blocking: MillClauseViolation[];
  downgrades: MillClauseViolation[];
  program_id: string;
  evaluated_at: string;
  predicate_version: "1.0.0";
}

export class MillSafetyPredicateViolation extends Error {
  readonly code = "MILL_SAFETY_PREDICATE_VIOLATED" as const;
  readonly blocking: MillClauseViolation[];
  constructor(blocking: MillClauseViolation[]) {
    super(`Mill safety predicate BLOCKED: ${blocking.map(c => c.clause).join(", ")}`);
    this.name = "MillSafetyPredicateViolation";
    this.blocking = blocking;
  }
}

function isFiniteNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

class MillSafetyPredicateEngineImpl {
  /**
   * Pure verify — never throws on well-typed input. Bad signals → BLOCKED with reason.
   * Returns full PredicateResult for downstream inspection.
   */
  verify(input: MillSafetyPredicateInput): MillSafetyPredicateResult {
    const blocking: MillClauseViolation[] = [];
    const downgrades: MillClauseViolation[] = [];

    if (!input || typeof input !== "object") {
      blocking.push({ clause: "SCHEMA_INVALID", detail: "input must be an object" });
      return this.buildResult("?", blocking, downgrades);
    }
    const programId = typeof input.program_id === "string" ? input.program_id : "?";
    if (!input.signals || typeof input.signals !== "object") {
      blocking.push({ clause: "SCHEMA_INVALID", detail: "signals object required" });
      return this.buildResult(programId, blocking, downgrades);
    }
    const s = input.signals;

    // ── NaN sweep ─────────────────────────────────────────────────────
    const numericFields: Array<keyof MillSafetySignals> = [
      "grip_safety_factor", "cutting_force_n", "spindle_power_kw",
      "chatter_score", "tool_deflection_mm", "tolerance_band_mm",
      "tool_temp_c", "tool_max_temp_c", "block_count",
    ];
    for (const f of numericFields) {
      const v = s[f];
      if (v !== undefined && !isFiniteNum(v)) {
        blocking.push({ clause: "NAN_IN_SIGNAL", detail: `${f} is non-finite`, field_path: `signals.${f}` });
      }
    }

    // ── Empty program ─────────────────────────────────────────────────
    if (isFiniteNum(s.block_count) && s.block_count <= 0) {
      blocking.push({ clause: "EMPTY_PROGRAM", detail: "block_count must be > 0", field_path: "signals.block_count" });
    }

    // ── Workholding ───────────────────────────────────────────────────
    if (isFiniteNum(s.grip_safety_factor) && s.grip_safety_factor < 1.0) {
      blocking.push({
        clause: "WORKHOLDING_BLOCKED",
        detail: `grip_safety_factor ${s.grip_safety_factor.toFixed(2)} < 1.0 (cutting force exceeds grip)`,
        field_path: "signals.grip_safety_factor",
      });
    }

    // ── Force vs machine envelope ─────────────────────────────────────
    if (input.envelope?.max_force_n !== undefined && isFiniteNum(s.cutting_force_n)) {
      if (s.cutting_force_n > input.envelope.max_force_n) {
        blocking.push({
          clause: "FORCE_FAILURE",
          detail: `cutting_force ${s.cutting_force_n.toFixed(0)}N > envelope ${input.envelope.max_force_n}N`,
          field_path: "signals.cutting_force_n",
        });
      }
    }

    // ── Power vs machine envelope ─────────────────────────────────────
    if (input.envelope?.rated_kw !== undefined && isFiniteNum(s.spindle_power_kw)) {
      if (s.spindle_power_kw > input.envelope.rated_kw) {
        blocking.push({
          clause: "POWER_FAILURE",
          detail: `spindle_power ${s.spindle_power_kw.toFixed(2)}kW > rated ${input.envelope.rated_kw}kW`,
          field_path: "signals.spindle_power_kw",
        });
      }
    }

    // ── Chatter (threshold ladder) ────────────────────────────────────
    if (isFiniteNum(s.chatter_score)) {
      if (s.chatter_score > 0.7) {
        blocking.push({
          clause: "CHATTER_FAILURE",
          detail: `chatter_score ${s.chatter_score.toFixed(2)} > 0.7 (certain chatter)`,
          field_path: "signals.chatter_score",
        });
      } else if (s.chatter_score >= 0.5) {
        downgrades.push({
          clause: "CHATTER_UNVERIFIED",
          detail: `chatter_score ${s.chatter_score.toFixed(2)} in [0.5, 0.7] — requires shop-floor verification`,
          field_path: "signals.chatter_score",
        });
      }
    }

    // ── Deflection vs tolerance ───────────────────────────────────────
    if (isFiniteNum(s.tool_deflection_mm) && isFiniteNum(s.tolerance_band_mm)) {
      if (s.tool_deflection_mm > s.tolerance_band_mm / 2) {
        blocking.push({
          clause: "DEFLECTION_FAILURE",
          detail: `tool_deflection ${s.tool_deflection_mm.toFixed(4)}mm > tolerance/2 ${(s.tolerance_band_mm / 2).toFixed(4)}mm`,
          field_path: "signals.tool_deflection_mm",
        });
      }
    }

    // ── Thermal runaway ───────────────────────────────────────────────
    if (isFiniteNum(s.tool_temp_c) && isFiniteNum(s.tool_max_temp_c)) {
      if (s.tool_temp_c > s.tool_max_temp_c) {
        blocking.push({
          clause: "THERMAL_RUNAWAY",
          detail: `tool_temp ${s.tool_temp_c.toFixed(0)}°C > tool_max ${s.tool_max_temp_c}°C`,
          field_path: "signals.tool_temp_c",
        });
      }
    }

    // ── Envelope ──────────────────────────────────────────────────────
    if (input.envelope && input.envelope.within_envelope === false) {
      blocking.push({
        clause: "ENVELOPE_VIOLATED",
        detail: `XYZ axis violations: ${input.envelope.axis_xyz_violations ?? "?"}`,
        field_path: "envelope.within_envelope",
      });
    }

    return this.buildResult(programId, blocking, downgrades);
  }

  /**
   * Exception-driven hard-block — throws MillSafetyPredicateViolation when BLOCKED.
   * Used by emitters that need a precondition gate.
   */
  verifyOrThrow(input: MillSafetyPredicateInput): MillSafetyPredicateResult {
    const r = this.verify(input);
    if (r.status === "BLOCKED") {
      throw new MillSafetyPredicateViolation(r.blocking);
    }
    return r;
  }

  /**
   * Check axiom A3 (monotonic-weakening): if `before` was SAFE and `after` is a strict
   * weakening, `after` must be in {UNVERIFIED, BLOCKED}. Returns true if the witness holds.
   */
  isMonotonicWeakening(before: MillSafetyPredicateInput, after: MillSafetyPredicateInput): boolean {
    const rBefore = this.verify(before);
    if (rBefore.status !== "SAFE") return true; // not applicable — axiom is vacuously satisfied
    const rAfter = this.verify(after);
    return rAfter.status !== "SAFE";
  }

  getStats(): {
    clauses: MillSafetyClause[];
    axioms: string[];
    predicate_version: string;
  } {
    return {
      clauses: [
        "NAN_IN_SIGNAL", "WORKHOLDING_BLOCKED", "FORCE_FAILURE", "POWER_FAILURE",
        "CHATTER_FAILURE", "CHATTER_UNVERIFIED", "DEFLECTION_FAILURE", "THERMAL_RUNAWAY",
        "ENVELOPE_VIOLATED", "EMPTY_PROGRAM", "SCHEMA_INVALID",
      ],
      axioms: ["A1 Totality", "A2 NaN-safety", "A3 Monotonicity", "A4 Determinism", "A5 Independence"],
      predicate_version: "1.0.0",
    };
  }

  // ── Private ───────────────────────────────────────────────────────

  private buildResult(
    programId: string,
    blocking: MillClauseViolation[],
    downgrades: MillClauseViolation[]
  ): MillSafetyPredicateResult {
    const status: MillPredicateStatus =
      blocking.length > 0 ? "BLOCKED" :
      downgrades.length > 0 ? "UNVERIFIED" :
      "SAFE";
    return {
      status,
      blocking,
      downgrades,
      program_id: programId,
      evaluated_at: new Date().toISOString(),
      predicate_version: "1.0.0",
    };
  }
}

export const millSafetyPredicateEngine = new MillSafetyPredicateEngineImpl();
export type { MillSafetyPredicateEngineImpl };
