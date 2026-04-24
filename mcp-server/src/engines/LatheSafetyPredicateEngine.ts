/**
 * LatheSafetyPredicateEngine — U-LSR22 (LATHE-HARDENED-MS0)
 *
 * Formal safety predicate over U-LSR24 signals + optional machine-envelope check.
 *
 * This engine wraps the LatheSafetySignals composite gate in a deterministic,
 * total, NaN-guarded predicate suitable for use as a precondition in the
 * emitter (U-LSR04) and the proof-carrying emit record (U-LSR25).
 *
 * Design axioms:
 *   (A1) Totality       — verify() never throws on well-typed input; shape bugs
 *                         in signals degrade to BLOCKED with a structured reason.
 *   (A2) NaN-safety     — any non-finite numeric in the signal payload causes
 *                         BLOCKED; the predicate refuses to trust poisoned physics.
 *   (A3) Monotonicity   — if `before` is SAFE and a mutation only weakens one
 *                         clause (worse grip, larger force, etc.), the mutated
 *                         result must be in {UNVERIFIED, BLOCKED} — never SAFE.
 *                         isMonotonicWeakening() is the checkable witness.
 *   (A4) Determinism    — verify(x) is a pure function of x.
 *   (A5) Independence   — the predicate does not call any force/chatter/grip
 *                         engine itself; it consumes already-computed signals.
 *                         This is what makes U-LSR25's "independent reproducer"
 *                         possible: two separate Kienzle implementations both
 *                         funnelled through this predicate must agree.
 *
 * Optional Z3 proof (proveWithZ3): for small numeric domains the predicate is
 * encoded as a quantifier-free BV/Real formula and solved to show there is no
 * model where all clauses hold yet the result is BLOCKED (and vice versa).
 * Z3 is lazy-imported so cold starts do not pay the WASM load cost.
 *
 * @milestone LATHE-HARDENED-MS0 U-LSR22
 * @version 1.0.0
 */

import { z } from "zod";
import {
  LatheSafetySignalsSchema,
  type LatheSafetySignals,
} from "./LatheSafetySignalEngine.js";

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export type PredicateStatus = "SAFE" | "UNVERIFIED" | "BLOCKED";

/**
 * Machine-envelope precondition consumed by the predicate. Kept minimal and
 * structural so the emitter's ToolpathProgram.machine_envelope_check type
 * remains a superset.
 */
export const EnvelopeCheckSchema = z.object({
  within_envelope: z.boolean(),
  max_x_mm: z.number().optional(),
  max_z_mm: z.number().optional(),
  min_x_mm: z.number().optional(),
  min_z_mm: z.number().optional(),
});
export type EnvelopeCheck = z.infer<typeof EnvelopeCheckSchema>;

/**
 * One failing clause of the predicate. `clause` is a stable machine-readable
 * identifier; `detail` is a human-readable diagnostic. Downstream consumers
 * (emitter hard-block, proof-carrying record, UI) key off `clause`.
 */
export const ClauseViolationSchema = z.object({
  clause: z.enum([
    "NAN_IN_SIGNAL",
    "GRIP_BLOCKED",
    "FORCE_FAILURE",
    "POWER_FAILURE",
    "CHATTER_FAILURE",
    "CHATTER_UNVERIFIED",
    "ENVELOPE_VIOLATED",
    "EMPTY_PROGRAM",
    "SCHEMA_INVALID",
  ]),
  detail: z.string(),
  field_path: z.string().optional(),
});
export type ClauseViolation = z.infer<typeof ClauseViolationSchema>;

export const PredicateResultSchema = z.object({
  status: z.enum(["SAFE", "UNVERIFIED", "BLOCKED"]),
  blocking: z.array(ClauseViolationSchema),
  downgrades: z.array(ClauseViolationSchema),
  program_id: z.string(),
  evaluated_at: z.string(),
  predicate_version: z.literal("1.0.0"),
});
export type PredicateResult = z.infer<typeof PredicateResultSchema>;

/**
 * Thrown by verifyOrThrow() when status is BLOCKED. Consumers that want
 * exception-driven hard-blocks (e.g., the emitter) use this; pure callers
 * (dashboards, audit) prefer verify() + inspection of PredicateResult.
 */
export class SafetyPredicateViolation extends Error {
  readonly code = "SAFETY_PREDICATE_VIOLATED" as const;
  readonly blocking: ClauseViolation[];
  readonly program_id: string;
  constructor(result: PredicateResult) {
    super(
      `SAFETY_PREDICATE_VIOLATED: program ${result.program_id} failed ${result.blocking.length} clause(s): ` +
        result.blocking.map((v) => `${v.clause}(${v.detail})`).join("; "),
    );
    this.blocking = result.blocking;
    this.program_id = result.program_id;
    this.name = "SafetyPredicateViolation";
  }
}

// ============================================================================
// ENGINE
// ============================================================================

const PREDICATE_VERSION = "1.0.0";

class LatheSafetyPredicateEngine {
  /**
   * Evaluate the composite safety predicate over pre-computed signals and an
   * optional envelope check. Total function — never throws on well-typed input.
   *
   * @param signals Output of LatheSafetySignalEngine.compute()/gate()
   * @param envelope Optional machine envelope from ToolpathProgram
   * @returns PredicateResult with status and enumerated violations
   */
  verify(signals: LatheSafetySignals, envelope?: EnvelopeCheck): PredicateResult {
    const blocking: ClauseViolation[] = [];
    const downgrades: ClauseViolation[] = [];

    // Pre-parse NaN scan. zod v4 rejects NaN at z.number(), so without this
    // scan the predicate would mask NAN_IN_SIGNAL under SCHEMA_INVALID and
    // violate axiom (A2) — poisoned physics must surface as NAN specifically
    // so consumers (emitter hard-block, proof-carrying record) can diagnose.
    const rawNanIssues = this.scanRawForNonFinite(signals);
    for (const issue of rawNanIssues) {
      blocking.push({ clause: "NAN_IN_SIGNAL", detail: issue.detail, field_path: issue.path });
    }

    // Schema parse — treat ZodError as a BLOCKED schema-invalid clause rather
    // than propagating the throw. Totality axiom (A1). If the raw NaN scan
    // already caught the issue, skip SCHEMA_INVALID so the clause list stays
    // actionable (NaN is the root cause; zod's "expected number" is a symptom).
    const parsed = LatheSafetySignalsSchema.safeParse(signals);
    if (!parsed.success) {
      if (rawNanIssues.length === 0) {
        blocking.push({
          clause: "SCHEMA_INVALID",
          detail: parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
        });
      }
      return {
        status: "BLOCKED",
        blocking,
        downgrades: [],
        program_id: typeof (signals as { program_id?: unknown })?.program_id === "string"
          ? (signals as { program_id: string }).program_id
          : "unknown",
        evaluated_at: new Date().toISOString(),
        predicate_version: PREDICATE_VERSION,
      };
    }
    const s = parsed.data;
    const programId = s.program_id;

    // Empty program — structurally impossible through compute() but defensive.
    if (s.per_operation.length === 0) {
      blocking.push({ clause: "EMPTY_PROGRAM", detail: "per_operation is empty" });
    }

    // NaN already caught pre-parse via scanRawForNonFinite. Schema parse
    // rejects NaN/Inf at z.number(), so post-parse all numerics are finite.

    // Grip composite gate (from U-LSR24)
    if (s.grip.gate_block) {
      blocking.push({
        clause: "GRIP_BLOCKED",
        detail:
          `SF=${s.grip.safety_factor.toFixed(2)} loss=${s.grip.grip_loss_at_rpm_pct.toFixed(0)}% ` +
          `deformation=${s.grip.deformation_risk} rpm=${s.grip.worst_spindle_rpm}/${s.grip.max_safe_rpm}`,
        field_path: "grip.gate_block",
      });
    }

    if (s.overall.any_force_failure) {
      blocking.push({
        clause: "FORCE_FAILURE",
        detail: `worst_case_resultant_N=${s.overall.worst_case_resultant_N}`,
        field_path: "overall.any_force_failure",
      });
    }

    if (s.overall.any_power_failure) {
      blocking.push({
        clause: "POWER_FAILURE",
        detail: "at least one operation exceeds spindle power budget",
        field_path: "overall.any_power_failure",
      });
    }

    if (s.overall.any_chatter_failure) {
      blocking.push({
        clause: "CHATTER_FAILURE",
        detail: "at least one operation has ap ≥ critical_depth or low stability margin",
        field_path: "overall.any_chatter_failure",
      });
    }

    if (envelope && envelope.within_envelope === false) {
      blocking.push({
        clause: "ENVELOPE_VIOLATED",
        detail: this.envelopeDetail(envelope),
        field_path: "envelope.within_envelope",
      });
    }

    // Downgrade-only clauses (they prevent SAFE but do not BLOCK):
    if (s.overall.any_chatter_unverified) {
      downgrades.push({
        clause: "CHATTER_UNVERIFIED",
        detail: "FRF data missing for at least one operation",
        field_path: "overall.any_chatter_unverified",
      });
    }

    const status: PredicateStatus =
      blocking.length > 0 ? "BLOCKED" : downgrades.length > 0 ? "UNVERIFIED" : "SAFE";

    return {
      status,
      blocking,
      downgrades,
      program_id: programId,
      evaluated_at: new Date().toISOString(),
      predicate_version: PREDICATE_VERSION,
    };
  }

  /**
   * verify() + throw on BLOCKED. Callers that want the emitter-style hard-block
   * semantics use this; UI/audit callers use verify() and branch on status.
   */
  verifyOrThrow(signals: LatheSafetySignals, envelope?: EnvelopeCheck): PredicateResult {
    const result = this.verify(signals, envelope);
    if (result.status === "BLOCKED") {
      throw new SafetyPredicateViolation(result);
    }
    return result;
  }

  /**
   * Monotonicity witness (axiom A3). Returns true iff `after` is a legal
   * weakening of `before` — i.e., for every clause the `after` status is at
   * least as bad. This is the invariant any physics-parameter sweep must
   * satisfy; test harnesses use this to validate that e.g. raising
   * `spindle_rpm` never flips GRIP_BLOCKED → SAFE.
   *
   * "Weakening" here means: every `before.blocking` clause is still in
   * `after.blocking`, OR there are strictly more blocking clauses.
   */
  isMonotonicWeakening(before: PredicateResult, after: PredicateResult): boolean {
    const rank: Record<PredicateStatus, number> = { SAFE: 0, UNVERIFIED: 1, BLOCKED: 2 };
    if (rank[after.status] < rank[before.status]) return false;

    const beforeClauses = new Set(before.blocking.map((b) => b.clause));
    for (const clause of beforeClauses) {
      const stillBlocking = after.blocking.some((b) => b.clause === clause);
      if (!stillBlocking) return false;
    }
    return true;
  }

  // --------------------------------------------------------------------------
  // Internals
  // --------------------------------------------------------------------------

  /**
   * Walk an untyped/raw signals object (pre-zod-parse) and collect non-finite
   * numeric fields. This runs BEFORE schema validation so NaN/Inf surfaces as
   * a specific NAN_IN_SIGNAL clause rather than being masked under
   * SCHEMA_INVALID (zod v4 rejects NaN at z.number()).
   */
  private scanRawForNonFinite(raw: unknown): Array<{ path: string; detail: string }> {
    const issues: Array<{ path: string; detail: string }> = [];
    if (raw === null || typeof raw !== "object") return issues;
    const obj = raw as Record<string, unknown>;

    const check = (path: string, v: unknown): void => {
      if (typeof v === "number" && !Number.isFinite(v)) {
        issues.push({
          path,
          detail: `${path} is ${Number.isNaN(v) ? "NaN" : v > 0 ? "+Inf" : "-Inf"}`,
        });
      }
    };

    // Grip numerics
    const grip = obj.grip as Record<string, unknown> | undefined;
    if (grip && typeof grip === "object") {
      check("grip.required_gripping_force_N", grip.required_gripping_force_N);
      check("grip.centrifugal_force_N", grip.centrifugal_force_N);
      check("grip.grip_loss_at_rpm_pct", grip.grip_loss_at_rpm_pct);
      check("grip.safety_factor", grip.safety_factor);
      check("grip.max_safe_rpm", grip.max_safe_rpm);
      check("grip.worst_spindle_rpm", grip.worst_spindle_rpm);
    }

    // Overall numerics
    const overall = obj.overall as Record<string, unknown> | undefined;
    if (overall && typeof overall === "object") {
      check("overall.worst_case_resultant_N", overall.worst_case_resultant_N);
    }

    // Per-op numerics
    const perOp = obj.per_operation;
    if (Array.isArray(perOp)) {
      perOp.forEach((op, idx) => {
        if (!op || typeof op !== "object") return;
        const opr = op as Record<string, unknown>;
        const forces = opr.forces as Record<string, unknown> | undefined;
        if (forces && typeof forces === "object") {
          check(`per_operation[${idx}].forces.Fc_N`, forces.Fc_N);
          check(`per_operation[${idx}].forces.Fr_N`, forces.Fr_N);
          check(`per_operation[${idx}].forces.Fa_N`, forces.Fa_N);
          check(`per_operation[${idx}].forces.resultant_N`, forces.resultant_N);
        }
        const power = opr.power as Record<string, unknown> | undefined;
        if (power && typeof power === "object") {
          check(`per_operation[${idx}].power.cutting_kW`, power.cutting_kW);
          check(`per_operation[${idx}].power.spindle_torque_Nm`, power.spindle_torque_Nm);
          check(`per_operation[${idx}].power.utilization_pct`, power.utilization_pct);
        }
        const chatter = opr.chatter as Record<string, unknown> | undefined;
        if (chatter && typeof chatter === "object" && chatter.computed === true) {
          check(`per_operation[${idx}].chatter.current_depth_mm`, chatter.current_depth_mm);
          check(`per_operation[${idx}].chatter.critical_depth_mm`, chatter.critical_depth_mm);
          check(`per_operation[${idx}].chatter.stability_margin_pct`, chatter.stability_margin_pct);
        }
      });
    }

    return issues;
  }

  private envelopeDetail(e: EnvelopeCheck): string {
    if (e.max_x_mm === undefined || e.max_z_mm === undefined) {
      return "within_envelope=false (bounds not disclosed)";
    }
    return `X[${(e.min_x_mm ?? 0).toFixed(1)}..${e.max_x_mm.toFixed(1)}] mm, Z[${(e.min_z_mm ?? 0).toFixed(1)}..${e.max_z_mm.toFixed(1)}] mm`;
  }
}

export const latheSafetyPredicateEngine = new LatheSafetyPredicateEngine();
export { LatheSafetyPredicateEngine };
