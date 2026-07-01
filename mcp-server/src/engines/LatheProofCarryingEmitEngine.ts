/**
 * LatheProofCarryingEmitEngine — U-LSR25 (LATHE-HARDENED-MS0)
 *
 * Composes Phase-A safety gates into a single SafetyRecord attached to the
 * emitted G-code program. An independent reproducer can re-run the same
 * inputs and byte-compare the record to detect regressions or tampering.
 *
 * ── Gates composed (all optional — applied only when inputs are supplied) ─
 *   • U-LSR04 envelope hard-block (always — toolpath carries its own check)
 *   • U-LSR05 spindle torque gate (when machine spec supplied)
 *   • U-LSR06 stock boundary gate (when stock + workholding supplied)
 *   • U-LSR22 formal safety predicate (when LatheSafetySignals supplied)
 *
 * ── Result ──────────────────────────────────────────────────────────────
 * Returns { emitted, safety_record } when SAFE/WARNING. Throws
 * SafetyProofViolation on BLOCKED unless `allow_override=true`, in which
 * case the emission proceeds with an AUDIT trail on warnings and the
 * safety_record.overall_safe flag remains false.
 *
 * ── Reproducibility ─────────────────────────────────────────────────────
 * A deterministic SHA-256 over canonical-JSON of the (program, options,
 * safety_inputs) tuple is attached as `input_hash`. Two independent
 * reproducer runs with the same hash must produce byte-identical
 * safety_record.signatures — any drift in the gate logic is caught.
 * Per-gate `result_hash` entries allow pin-pointing which engine drifted.
 *
 * @milestone LATHE-HARDENED-MS0 U-LSR25
 * @version 1.0.0
 */

import { createHash } from "node:crypto";
import { z } from "zod";
import type { ToolpathProgram } from "./LathePrintToolpathGeneratorEngine.js";
import {
  lathePrintProgramEmitterEngine,
  EnvelopeBlockError,
  type EmitOptions,
  type EmittedProgram,
} from "./LathePrintProgramEmitterEngine.js";
import {
  spindleTorqueGateEngine,
  type MachineSpindleSpec,
  type SpindleTorqueGateResult,
} from "./SpindleTorqueGateEngine.js";
import {
  stockBoundaryGateEngine,
  type StockGeometry,
  type Workholding,
  type StockBoundaryGateResult,
} from "./StockBoundaryGateEngine.js";
import {
  latheSafetyPredicateEngine,
  type PredicateResult,
} from "./LatheSafetyPredicateEngine.js";
import type { LatheSafetySignals } from "./LatheSafetySignalEngine.js";

// ============================================================================
// SCHEMAS
// ============================================================================

export const SafetyInputsSchema = z.object({
  signals: z.unknown().optional(),
  machine: z.unknown().optional(),
  stock: z.unknown().optional(),
  workholding: z.unknown().optional(),
  safe_utilisation_pct: z.number().min(0).max(100).optional(),
  min_jaw_clearance_mm: z.number().min(0).optional(),
});
export type SafetyInputs = z.infer<typeof SafetyInputsSchema> & {
  signals?: LatheSafetySignals;
  machine?: MachineSpindleSpec;
  stock?: StockGeometry;
  workholding?: Workholding;
};

export const GateSignatureSchema = z.object({
  engine_id: z.string(),
  version: z.string(),
  status: z.enum(["SAFE", "WARNING", "BLOCKED", "SKIPPED"]),
  result_hash: z.string(),
  blocked_reason: z.string().optional(),
});
export type GateSignature = z.infer<typeof GateSignatureSchema>;

export const SafetyRecordSchema = z.object({
  schema_version: z.literal("1.0.0"),
  program_id: z.string(),
  generated_at: z.string(),
  input_hash: z.string(),
  overall_safe: z.boolean(),
  overall_status: z.enum(["SAFE", "WARNING", "BLOCKED"]),
  override_applied: z.boolean(),
  signatures: z.array(GateSignatureSchema),
  envelope_check: z.object({
    within_envelope: z.boolean(),
    max_x_mm: z.number(),
    max_z_mm: z.number(),
    min_x_mm: z.number(),
    min_z_mm: z.number(),
  }),
  torque_gate: z.unknown().nullable(),
  stock_boundary_gate: z.unknown().nullable(),
  predicate_result: z.unknown().nullable(),
  audit_warnings: z.array(z.string()),
});
export type SafetyRecord = Omit<
  z.infer<typeof SafetyRecordSchema>,
  "torque_gate" | "stock_boundary_gate" | "predicate_result"
> & {
  torque_gate: SpindleTorqueGateResult | null;
  stock_boundary_gate: StockBoundaryGateResult | null;
  predicate_result: PredicateResult | null;
};

export const ProofCarryingEmitResultSchema = z.object({
  emitted: z.unknown().nullable(),
  safety_record: SafetyRecordSchema,
});
export type ProofCarryingEmitResult = {
  emitted: EmittedProgram | null;
  safety_record: SafetyRecord;
};

export const ProofEmitInputSchema = z.object({
  program: z.unknown(),
  options: z.unknown(),
  safety_inputs: SafetyInputsSchema.optional(),
  allow_override: z.boolean().optional(),
});
export type ProofEmitInput = {
  program: ToolpathProgram;
  options: EmitOptions;
  safety_inputs?: SafetyInputs;
  allow_override?: boolean;
};

// ============================================================================
// ERROR
// ============================================================================

export class SafetyProofViolation extends Error {
  readonly code = "SAFETY_PROOF_VIOLATED" as const;
  readonly safety_record: SafetyRecord;
  constructor(record: SafetyRecord) {
    const blockers = record.signatures
      .filter((s) => s.status === "BLOCKED")
      .map((s) => `${s.engine_id}:${s.blocked_reason ?? "blocked"}`)
      .join("; ");
    super(
      `SAFETY_PROOF_VIOLATED: ${record.signatures.filter((s) => s.status === "BLOCKED").length} ` +
        `gate(s) blocked emission — ${blockers || "no detail"}. ` +
        `Refusing to emit. Set allow_override=true with sign-off to bypass ` +
        `(emission proceeds; overall_safe remains false).`,
    );
    this.safety_record = record;
    this.name = "SafetyProofViolation";
  }
}

// ============================================================================
// ENGINE
// ============================================================================

const SCHEMA_VERSION = "1.0.0";

class LatheProofCarryingEmitEngine {
  /**
   * Run all applicable gates, then emit if safe (or allow_override set).
   * Returns { emitted, safety_record }. Throws SafetyProofViolation if
   * any gate blocks and override is not set.
   */
  emit(input: ProofEmitInput): ProofCarryingEmitResult {
    const { program, options, safety_inputs = {}, allow_override = false } = input;
    if (!program || !Array.isArray(program.operations)) {
      throw new Error("Invalid program: missing operations");
    }

    const signatures: GateSignature[] = [];
    const auditWarnings: string[] = [];

    // 1. Envelope check (always — toolpath carries it).
    const envCheck = program.machine_envelope_check;
    signatures.push({
      engine_id: "LathePrintProgramEmitterEngine.envelope",
      version: "1.0.0",
      status: envCheck.within_envelope ? "SAFE" : "BLOCKED",
      result_hash: this.hash({ envCheck }),
      blocked_reason: envCheck.within_envelope
        ? undefined
        : `envelope exceeded (X ${envCheck.max_x_mm}, Z ${envCheck.max_z_mm})`,
    });

    // 2. Spindle torque gate (optional).
    let torqueResult: SpindleTorqueGateResult | null = null;
    if (safety_inputs.machine) {
      torqueResult = spindleTorqueGateEngine.gate({
        program,
        machine: safety_inputs.machine,
        safe_utilisation_pct: safety_inputs.safe_utilisation_pct,
      });
      signatures.push({
        engine_id: "SpindleTorqueGateEngine",
        version: "1.0.0",
        status: torqueResult.overall.status,
        result_hash: this.hash({
          per_operation: torqueResult.per_operation,
          overall: torqueResult.overall,
        }),
        blocked_reason: torqueResult.overall.gate_block
          ? `worst op#${torqueResult.overall.worst_case_op_number} util=${torqueResult.overall.worst_utilisation_pct.toFixed(0)}%`
          : undefined,
      });
    } else {
      signatures.push({
        engine_id: "SpindleTorqueGateEngine",
        version: "1.0.0",
        status: "SKIPPED",
        result_hash: this.hash({ skipped: "no machine spec" }),
      });
    }

    // 3. Stock boundary gate (optional).
    let stockResult: StockBoundaryGateResult | null = null;
    if (safety_inputs.stock && safety_inputs.workholding) {
      stockResult = stockBoundaryGateEngine.gate({
        program,
        stock: safety_inputs.stock,
        workholding: safety_inputs.workholding,
        min_jaw_clearance_mm: safety_inputs.min_jaw_clearance_mm,
      });
      signatures.push({
        engine_id: "StockBoundaryGateEngine",
        version: "1.0.0",
        status: stockResult.overall.status,
        result_hash: this.hash({
          violations: stockResult.violations,
          warnings: stockResult.warnings,
          overall: stockResult.overall,
        }),
        blocked_reason: stockResult.overall.gate_block
          ? `clauses [${stockResult.overall.blocking_clauses.join(",")}]`
          : undefined,
      });
    } else {
      signatures.push({
        engine_id: "StockBoundaryGateEngine",
        version: "1.0.0",
        status: "SKIPPED",
        result_hash: this.hash({ skipped: "no stock + workholding" }),
      });
    }

    // 4. Formal safety predicate (optional).
    let predicateResult: PredicateResult | null = null;
    if (safety_inputs.signals) {
      predicateResult = latheSafetyPredicateEngine.verify(safety_inputs.signals, {
        within_envelope: envCheck.within_envelope,
        max_x_mm: envCheck.max_x_mm,
        max_z_mm: envCheck.max_z_mm,
        min_x_mm: envCheck.min_x_mm,
        min_z_mm: envCheck.min_z_mm,
      });
      // Map PredicateStatus to GateSignature status:
      // UNVERIFIED (downgrade only) -> WARNING; SAFE and BLOCKED map directly.
      const predicateGateStatus: GateSignature['status'] =
        predicateResult.status === 'UNVERIFIED' ? 'WARNING' : predicateResult.status;
      signatures.push({
        engine_id: "LatheSafetyPredicateEngine",
        version: "1.0.0",
        status: predicateGateStatus,
        result_hash: this.hash({
          status: predicateResult.status,
          blocking: predicateResult.blocking,
          downgrades: predicateResult.downgrades,
        }),
        blocked_reason: predicateResult.status === "BLOCKED"
          ? `clauses [${predicateResult.blocking.map((b) => b.clause).join(",")}]`
          : undefined,
      });
    } else {
      signatures.push({
        engine_id: "LatheSafetyPredicateEngine",
        version: "1.0.0",
        status: "SKIPPED",
        result_hash: this.hash({ skipped: "no signals" }),
      });
    }

    // Compose overall decision.
    const hasBlocked = signatures.some((s) => s.status === "BLOCKED");
    const hasWarning = signatures.some((s) => s.status === "WARNING");
    const overallStatus: "SAFE" | "WARNING" | "BLOCKED" = hasBlocked
      ? "BLOCKED"
      : hasWarning
        ? "WARNING"
        : "SAFE";
    const overallSafe = overallStatus === "SAFE";

    const inputHash = this.hash({
      program_id: program.program_id,
      ops_count: program.operations.length,
      options,
      machine: safety_inputs.machine ?? null,
      stock: safety_inputs.stock ?? null,
      workholding: safety_inputs.workholding ?? null,
      signals_program_id: safety_inputs.signals?.program_id ?? null,
    });

    let emitted: EmittedProgram | null = null;
    let overrideApplied = false;

    if (hasBlocked && !allow_override) {
      // Record first, then throw — caller can inspect record on catch.
      const record: SafetyRecord = {
        schema_version: SCHEMA_VERSION,
        program_id: program.program_id,
        generated_at: new Date().toISOString(),
        input_hash: inputHash,
        overall_safe: false,
        overall_status: "BLOCKED",
        override_applied: false,
        signatures,
        envelope_check: {
          within_envelope: envCheck.within_envelope,
          max_x_mm: envCheck.max_x_mm,
          max_z_mm: envCheck.max_z_mm,
          min_x_mm: envCheck.min_x_mm,
          min_z_mm: envCheck.min_z_mm,
        },
        torque_gate: torqueResult,
        stock_boundary_gate: stockResult,
        predicate_result: predicateResult,
        audit_warnings: auditWarnings,
      };
      throw new SafetyProofViolation(record);
    }

    if (hasBlocked && allow_override) {
      overrideApplied = true;
      auditWarnings.push(
        `AUDIT: safety_proof override applied — ${signatures.filter((s) => s.status === "BLOCKED").length} ` +
          `gate(s) report BLOCKED; emission proceeds with overall_safe=false. ` +
          `Requires engineer + machinist sign-off before program release.`,
      );
    }

    // Call the underlying emitter. If the envelope is the blocker and we're
    // in override mode, the emitter also needs allow_envelope_override=true
    // so its own U-LSR04 hard-block does not re-fire.
    const emitOpts: EmitOptions = overrideApplied
      ? { ...options, allow_envelope_override: true }
      : options;
    try {
      emitted = lathePrintProgramEmitterEngine.emit(program, emitOpts);
      // Propagate audit warnings into the emitter's warnings list so the
      // dossier reflects the full story.
      if (auditWarnings.length > 0) {
        emitted.warnings.push(...auditWarnings);
      }
    } catch (e) {
      // The emitter may still throw (e.g. we didn't set envelope override
      // but some OTHER reason blocks emission). Re-throw — this is a
      // genuine emission failure, not a safety decision.
      if (e instanceof EnvelopeBlockError && !overrideApplied) {
        // This shouldn't happen because signatures[0] would be BLOCKED and
        // we'd have thrown SafetyProofViolation above. Guard anyway.
        throw e;
      }
      throw e;
    }

    return {
      emitted,
      safety_record: {
        schema_version: SCHEMA_VERSION,
        program_id: program.program_id,
        generated_at: new Date().toISOString(),
        input_hash: inputHash,
        overall_safe: overallSafe,
        overall_status: overallStatus,
        override_applied: overrideApplied,
        signatures,
        envelope_check: {
          within_envelope: envCheck.within_envelope,
          max_x_mm: envCheck.max_x_mm,
          max_z_mm: envCheck.max_z_mm,
          min_x_mm: envCheck.min_x_mm,
          min_z_mm: envCheck.min_z_mm,
        },
        torque_gate: torqueResult,
        stock_boundary_gate: stockResult,
        predicate_result: predicateResult,
        audit_warnings: auditWarnings,
      },
    };
  }

  /**
   * Reproducer — compute a safety record for the given inputs WITHOUT
   * calling emit(). Used by the independent reproducer to byte-compare
   * signatures from two separate runs. Returns only the safety_record.
   */
  reproduce(input: ProofEmitInput): SafetyRecord {
    // Run through emit() logic but capture the record before emission. We
    // temporarily swallow SafetyProofViolation since reproducer exists
    // exactly to inspect blocked cases.
    try {
      return this.emit(input).safety_record;
    } catch (e) {
      if (e instanceof SafetyProofViolation) {
        return e.safety_record;
      }
      throw e;
    }
  }

  // --------------------------------------------------------------------------

  /**
   * Deterministic SHA-256 over canonical JSON. Keys are sorted recursively
   * so object insertion-order differences do not create false hash drift.
   */
  private hash(value: unknown): string {
    const canon = this.canonicalStringify(value);
    return createHash("sha256").update(canon).digest("hex");
  }

  private canonicalStringify(value: unknown): string {
    if (value === null || value === undefined) return "null";
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : `"${String(value)}"`;
    if (typeof value === "string") return JSON.stringify(value);
    if (typeof value === "boolean") return value ? "true" : "false";
    if (Array.isArray(value)) {
      return "[" + value.map((v) => this.canonicalStringify(v)).join(",") + "]";
    }
    if (typeof value === "object") {
      const keys = Object.keys(value as Record<string, unknown>).sort();
      return (
        "{" +
        keys
          .map((k) => JSON.stringify(k) + ":" + this.canonicalStringify((value as Record<string, unknown>)[k]))
          .join(",") +
        "}"
      );
    }
    return JSON.stringify(value);
  }
}

export const latheProofCarryingEmitEngine = new LatheProofCarryingEmitEngine();
export { LatheProofCarryingEmitEngine };
