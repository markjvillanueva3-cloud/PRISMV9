/**
 * WEDMProgramVerificationEngine — End-of-pipeline verification for WEDM programs
 *
 * Composes the results of upstream WEDM pipeline stages into a single PASS/BLOCK
 * verdict before a program may be emitted to the shop floor. Consumes:
 *
 *   1. Post-processor output (WEDMPostDialectRouterEngine)
 *   2. Collision check (WEDMWirePathCollisionEngine)
 *   3. Capability manifest (WEDM_CAPABILITY_MANIFEST.json)
 *   4. Controller dialect support list
 *   5. Optional safety envelope / head-clearance results
 *
 * This engine does not recompute upstream work — it verifies that the
 * upstream outputs are internally consistent and meet the gating criteria
 * for program emission.
 *
 * Gating rules (S(x) contributions):
 *   - Controller supported       → +0.10, else HARD BLOCK
 *   - Process type in manifest    → +0.05, else HARD BLOCK
 *   - Collision check PASS        → +0.15 (already from collision engine)
 *   - Post-processor success=true → +0.05, else HARD BLOCK
 *   - G-code line count > 0       → +0.05, else HARD BLOCK
 *   - Operation count matches     → +0.05, else WARNING
 *   - Safety envelope PASS (opt)  → +0.10
 *   - No critical warnings        → +0.05, else WARNING
 *
 * Maximum contribution: 0.60 (of a 1.0 safety score).
 * Any HARD BLOCK condition drives the aggregate score to 0.
 *
 * MS-P1.5-ONESHOT/U-P1.5-OS-06
 *
 * @see WEDMPostDialectRouterEngine
 * @see WEDMWirePathCollisionEngine
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type VerificationStatus = "pass" | "warn" | "block";

export interface PostOutputSummary {
  success: boolean;
  controller: string;
  dialect_name?: string;
  line_count: number;
  operation_count: number;
  warnings?: string[];
}

export interface CollisionResultSummary {
  pass: boolean;
  hard_block: boolean;
  collision_count: number;
  critical_count: number;
  min_clearance_mm: number;
}

export interface SafetyEnvelopeSummary {
  pass: boolean;
  violations: string[];
}

export interface CapabilityManifestSummary {
  process_type: string;
  supported_controllers: string[];
  entry_points: string[];
}

export interface VerificationInput {
  program_id: string;
  requested_process_type: string;
  expected_operation_count: number;
  post_output: PostOutputSummary;
  collision_result: CollisionResultSummary;
  capability: CapabilityManifestSummary;
  safety_envelope?: SafetyEnvelopeSummary;
}

export interface VerificationCheck {
  name: string;
  status: VerificationStatus;
  score_contribution: number;
  message: string;
  hard_block: boolean;
}

export interface VerificationResult {
  program_id: string;
  status: VerificationStatus;
  pass: boolean;
  hard_block: boolean;
  checks: VerificationCheck[];
  pass_count: number;
  warn_count: number;
  block_count: number;
  aggregate_score: number;
  max_possible_score: number;
  summary: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ══════════════════════════════════════════════════════════════════════════════

const SUPPORTED_WEDM_CONTROLLERS = new Set([
  "mitsubishi_fa", "mitsubishi_mv",
  "sodick_aq", "sodick_al",
  "makino_u", "makino_eu",
  "agie_cut", "agie_charm",
  "fanuc_robocut",
]);

const CONTRIB = {
  controller: 0.10,
  process_type: 0.05,
  collision: 0.15,
  post_success: 0.05,
  gcode_nonempty: 0.05,
  op_count_match: 0.05,
  safety_envelope: 0.10,
  no_critical_warnings: 0.05,
} as const;

export class WEDMProgramVerificationEngine {
  readonly engineId = "WEDMProgramVerificationEngine";
  readonly version = "1.0.0";

  verify(input: VerificationInput): VerificationResult {
    const checks: VerificationCheck[] = [];

    checks.push(this.checkController(input));
    checks.push(this.checkProcessType(input));
    checks.push(this.checkCollision(input));
    checks.push(this.checkPostSuccess(input));
    checks.push(this.checkGCodeNonEmpty(input));
    checks.push(this.checkOperationCountMatches(input));
    if (input.safety_envelope) {
      checks.push(this.checkSafetyEnvelope(input.safety_envelope));
    }
    checks.push(this.checkNoCriticalWarnings(input));

    const pass_count = checks.filter((c) => c.status === "pass").length;
    const warn_count = checks.filter((c) => c.status === "warn").length;
    const block_count = checks.filter((c) => c.status === "block").length;
    const hard_block = checks.some((c) => c.hard_block);

    const aggregate_score = hard_block
      ? 0
      : checks
          .filter((c) => c.status === "pass")
          .reduce((sum, c) => sum + c.score_contribution, 0);

    const max_possible_score = checks.reduce(
      (sum, c) => sum + c.score_contribution,
      0,
    );

    const status: VerificationStatus = hard_block
      ? "block"
      : warn_count > 0
        ? "warn"
        : "pass";

    return {
      program_id: input.program_id,
      status,
      pass: status !== "block",
      hard_block,
      checks,
      pass_count,
      warn_count,
      block_count,
      aggregate_score,
      max_possible_score,
      summary: this.buildSummary(status, pass_count, warn_count, block_count),
    };
  }

  // ─── Individual checks ─────────────────────────────────────────────────────

  private checkController(input: VerificationInput): VerificationCheck {
    const controller = input.post_output.controller;
    const supported =
      SUPPORTED_WEDM_CONTROLLERS.has(controller) ||
      input.capability.supported_controllers.includes(controller);
    return {
      name: "controller_supported",
      status: supported ? "pass" : "block",
      score_contribution: CONTRIB.controller,
      message: supported
        ? `Controller '${controller}' is supported`
        : `Controller '${controller}' is NOT in supported list`,
      hard_block: !supported,
    };
  }

  private checkProcessType(input: VerificationInput): VerificationCheck {
    const match =
      input.requested_process_type === input.capability.process_type;
    return {
      name: "process_type_in_manifest",
      status: match ? "pass" : "block",
      score_contribution: CONTRIB.process_type,
      message: match
        ? `Process type '${input.requested_process_type}' matches manifest`
        : `Process type '${input.requested_process_type}' does not match manifest '${input.capability.process_type}'`,
      hard_block: !match,
    };
  }

  private checkCollision(input: VerificationInput): VerificationCheck {
    const { pass, hard_block, collision_count, critical_count } =
      input.collision_result;
    return {
      name: "collision_check",
      status: hard_block ? "block" : pass ? "pass" : "warn",
      score_contribution: CONTRIB.collision,
      message: hard_block
        ? `Collision HARD BLOCK: ${critical_count} critical collisions`
        : pass
          ? `No collisions detected (${collision_count} events)`
          : `Non-critical collisions reported: ${collision_count}`,
      hard_block,
    };
  }

  private checkPostSuccess(input: VerificationInput): VerificationCheck {
    const ok = input.post_output.success === true;
    return {
      name: "post_processor_success",
      status: ok ? "pass" : "block",
      score_contribution: CONTRIB.post_success,
      message: ok
        ? "Post processor reported success"
        : "Post processor did not complete successfully",
      hard_block: !ok,
    };
  }

  private checkGCodeNonEmpty(input: VerificationInput): VerificationCheck {
    const ok = input.post_output.line_count > 0;
    return {
      name: "gcode_non_empty",
      status: ok ? "pass" : "block",
      score_contribution: CONTRIB.gcode_nonempty,
      message: ok
        ? `Program has ${input.post_output.line_count} lines`
        : "Program emitted zero G-code lines",
      hard_block: !ok,
    };
  }

  private checkOperationCountMatches(
    input: VerificationInput,
  ): VerificationCheck {
    const expected = input.expected_operation_count;
    const actual = input.post_output.operation_count;
    const ok = expected === actual;
    return {
      name: "operation_count_matches",
      status: ok ? "pass" : "warn",
      score_contribution: CONTRIB.op_count_match,
      message: ok
        ? `Operation count matches (${actual})`
        : `Operation count mismatch: expected ${expected}, got ${actual}`,
      hard_block: false,
    };
  }

  private checkSafetyEnvelope(
    envelope: SafetyEnvelopeSummary,
  ): VerificationCheck {
    return {
      name: "safety_envelope",
      status: envelope.pass ? "pass" : "warn",
      score_contribution: CONTRIB.safety_envelope,
      message: envelope.pass
        ? "Safety envelope OK"
        : `Safety envelope violations: ${envelope.violations.join("; ")}`,
      hard_block: false,
    };
  }

  private checkNoCriticalWarnings(
    input: VerificationInput,
  ): VerificationCheck {
    const warnings = input.post_output.warnings ?? [];
    const critical = warnings.filter((w) =>
      /critical|fatal|error/i.test(w),
    );
    const ok = critical.length === 0;
    return {
      name: "no_critical_warnings",
      status: ok ? "pass" : "warn",
      score_contribution: CONTRIB.no_critical_warnings,
      message: ok
        ? "No critical warnings from post"
        : `Critical post warnings: ${critical.join("; ")}`,
      hard_block: false,
    };
  }

  private buildSummary(
    status: VerificationStatus,
    pass: number,
    warn: number,
    block: number,
  ): string {
    if (status === "block") {
      return `BLOCKED (${block} hard-block check(s), ${warn} warning(s), ${pass} passing)`;
    }
    if (status === "warn") {
      return `PASS WITH WARNINGS (${pass} passing, ${warn} warning(s))`;
    }
    return `PASS (${pass}/${pass + warn + block} checks)`;
  }
}

export const wedmProgramVerificationEngine = new WEDMProgramVerificationEngine();
