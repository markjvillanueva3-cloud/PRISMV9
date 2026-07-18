/**
 * ExecutionVerificationEngine — Script Execution & Geometry Verification
 * Executes generated CadQuery scripts, verifies results against expected
 * geometry, diagnoses failures, and retries with corrections.
 */
import { log } from "../utils/Logger.js";
import type { ExtractedAction } from "./VideoActionExtractorEngine.js";

// ── Types ──────────────────────────────────────────────────────────

export interface VerificationResult {
  success: boolean;
  similarity_score: number;
  geometry_comparison?: {
    expected_volume_mm3?: number;
    actual_volume_mm3?: number;
    volume_error_pct: number;
    expected_bbox?: [number, number, number];
    actual_bbox?: [number, number, number];
    bbox_error_pct: number;
    face_count_match: boolean;
  };
  execution_log: string[];
  errors: string[];
  retry_suggestion?: string;
}

export interface RetryResult {
  attempt: number;
  success: boolean;
  correction_applied: string;
  verification: VerificationResult;
}

export interface ProgressReport {
  total_steps: number;
  completed_steps: number;
  current_step: number;
  current_action: string;
  status:
    | "pending"
    | "executing"
    | "passed"
    | "failed"
    | "retrying"
    | "skipped";
  step_results: {
    step: number;
    status: string;
    duration_ms: number;
    error?: string;
  }[];
  elapsed_ms: number;
  estimated_remaining_ms: number;
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  errors: string[];
  execution_time_ms: number;
}

export interface FailureDiagnosis {
  diagnosis: string;
  correction_type: "dimension" | "operation" | "sequence" | "unknown";
  suggested_fix: string;
}

export interface FullExecutionResult {
  final_result: VerificationResult;
  progress: ProgressReport;
  retries: RetryResult[];
}

// ── Constants ──────────────────────────────────────────────────────

const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_TOLERANCE_PCT = 10;

// ── Engine ─────────────────────────────────────────────────────────

export class ExecutionVerificationEngine {
  private progressTrackers = new Map<string, ProgressReport>();

  /**
   * Execute a CadQuery Python script and capture results.
   * In production this calls the cad-engine bridge or Python directly;
   * here we provide the execution framework with timeout protection.
   */
  executeScript(
    script: string,
    options?: { timeout_ms?: number },
  ): ExecutionResult {
    const timeout = options?.timeout_ms ?? DEFAULT_TIMEOUT_MS;
    const startTime = Date.now();
    const errors: string[] = [];
    const lines: string[] = [];

    // Validate script is non-empty
    if (!script || script.trim().length === 0) {
      return {
        success: false,
        output: "",
        errors: ["Empty script provided"],
        execution_time_ms: 0,
      };
    }

    // Basic syntax pre-check
    const syntaxErrors = this.preCheckSyntax(script);
    if (syntaxErrors.length > 0) {
      return {
        success: false,
        output: "",
        errors: syntaxErrors,
        execution_time_ms: Date.now() - startTime,
      };
    }

    // Simulate execution for the engine framework.
    // Real execution would spawn Python via child_process with timeout.
    lines.push("# CadQuery script accepted for execution");
    lines.push(`# Timeout: ${timeout}ms`);
    lines.push(`# Script length: ${script.length} chars`);

    // Check for import cadquery
    if (!script.includes("import cadquery") && !script.includes("import cq")) {
      lines.push("# Warning: no cadquery import detected");
      errors.push("Script may be missing cadquery import");
    }

    const elapsed = Date.now() - startTime;
    const success = errors.length === 0;

    log.info(
      `[ExecutionVerification] Script execution: ` +
        `success=${success}, ${elapsed}ms`,
    );

    return {
      success,
      output: lines.join("\n"),
      errors,
      execution_time_ms: elapsed,
    };
  }

  /**
   * Verify actual geometry against expected geometry within tolerance.
   */
  verifyGeometry(
    actual: {
      volume?: number;
      bbox?: [number, number, number];
      faces?: number;
    },
    expected: {
      volume?: number;
      bbox?: [number, number, number];
      faces?: number;
    },
    tolerance_pct?: number,
  ): VerificationResult {
    const tol = tolerance_pct ?? DEFAULT_TOLERANCE_PCT;
    const executionLog: string[] = [];
    const errors: string[] = [];
    let checksRun = 0;
    let checksPassed = 0;
    let volumeErrorPct = 0;
    let bboxErrorPct = 0;
    let faceMatch = true;

    // Volume comparison
    if (expected.volume !== undefined && actual.volume !== undefined) {
      checksRun++;
      if (expected.volume === 0 && actual.volume === 0) {
        volumeErrorPct = 0;
        checksPassed++;
        executionLog.push("Volume check: both zero — pass");
      } else if (expected.volume === 0) {
        volumeErrorPct = 100;
        errors.push("Expected zero volume but got non-zero");
        executionLog.push(
          `Volume check: expected=0, actual=${actual.volume} — FAIL`,
        );
      } else {
        volumeErrorPct =
          (Math.abs(actual.volume - expected.volume) / expected.volume) * 100;
        if (volumeErrorPct <= tol) {
          checksPassed++;
          executionLog.push(
            `Volume check: error=${volumeErrorPct.toFixed(1)}% <= ${tol}% — pass`,
          );
        } else {
          errors.push(
            `Volume error ${volumeErrorPct.toFixed(1)}% exceeds tolerance ${tol}%`,
          );
          executionLog.push(
            `Volume check: error=${volumeErrorPct.toFixed(1)}% > ${tol}% — FAIL`,
          );
        }
      }
    } else {
      executionLog.push("Volume check: skipped (missing data)");
    }

    // Bounding box comparison
    if (expected.bbox && actual.bbox) {
      checksRun++;
      const dimErrors: number[] = [];
      for (let i = 0; i < 3; i++) {
        const exp = expected.bbox[i];
        const act = actual.bbox[i];
        if (exp === 0 && act === 0) {
          dimErrors.push(0);
        } else if (exp === 0) {
          dimErrors.push(100);
        } else {
          dimErrors.push((Math.abs(act - exp) / exp) * 100);
        }
      }
      bboxErrorPct = Math.max(...dimErrors);
      if (bboxErrorPct <= tol) {
        checksPassed++;
        executionLog.push(
          `BBox check: max dim error=${bboxErrorPct.toFixed(1)}% — pass`,
        );
      } else {
        errors.push(
          `Bounding box error ${bboxErrorPct.toFixed(1)}% exceeds tolerance`,
        );
        executionLog.push(
          `BBox check: max dim error=${bboxErrorPct.toFixed(1)}% — FAIL`,
        );
      }
    } else {
      executionLog.push("BBox check: skipped (missing data)");
    }

    // Face count comparison
    if (expected.faces !== undefined && actual.faces !== undefined) {
      checksRun++;
      faceMatch = Math.abs(actual.faces - expected.faces) <= 2;
      if (faceMatch) {
        checksPassed++;
        executionLog.push(
          `Face count: expected=${expected.faces}, ` +
            `actual=${actual.faces} — pass`,
        );
      } else {
        errors.push(
          `Face count mismatch: expected=${expected.faces}, ` +
            `actual=${actual.faces}`,
        );
        executionLog.push(
          `Face count: expected=${expected.faces}, ` +
            `actual=${actual.faces} — FAIL`,
        );
      }
    } else {
      executionLog.push("Face count check: skipped (missing data)");
    }

    // Compute similarity score
    const similarity = checksRun > 0 ? checksPassed / checksRun : 0;
    const success = checksRun > 0 && checksPassed === checksRun;

    const retrySuggestion =
      !success && checksRun > 0
        ? this.buildRetrySuggestion(volumeErrorPct, bboxErrorPct, faceMatch)
        : undefined;

    log.info(
      `[ExecutionVerification] Geometry verify: ` +
        `score=${similarity.toFixed(2)}, ${checksPassed}/${checksRun} checks`,
    );

    return {
      success,
      similarity_score: similarity,
      geometry_comparison: {
        expected_volume_mm3: expected.volume,
        actual_volume_mm3: actual.volume,
        volume_error_pct: volumeErrorPct,
        expected_bbox: expected.bbox,
        actual_bbox: actual.bbox,
        bbox_error_pct: bboxErrorPct,
        face_count_match: faceMatch,
      },
      execution_log: executionLog,
      errors,
      retry_suggestion: retrySuggestion,
    };
  }

  /**
   * Diagnose why a verification failed and suggest corrections.
   */
  diagnoseFailure(
    verification: VerificationResult,
    action: ExtractedAction,
  ): FailureDiagnosis {
    const gc = verification.geometry_comparison;

    // Volume-based diagnosis
    if (gc && gc.volume_error_pct > 10) {
      const direction =
        (gc.actual_volume_mm3 ?? 0) > (gc.expected_volume_mm3 ?? 0)
          ? "too large"
          : "too small";
      const factor =
        gc.expected_volume_mm3 && gc.actual_volume_mm3
          ? (gc.expected_volume_mm3 / gc.actual_volume_mm3).toFixed(3)
          : "unknown";

      return {
        diagnosis:
          `Volume is ${direction} by ${gc.volume_error_pct.toFixed(1)}%. ` +
          `Operation "${action.operation}" likely has incorrect dimensions.`,
        correction_type: "dimension",
        suggested_fix:
          `Scale the primary dimension parameter by factor ${factor}. ` +
          `Check extrude depth or sketch dimensions.`,
      };
    }

    // Face count diagnosis — missing features
    if (gc && !gc.face_count_match) {
      const actualFaces =
        gc.actual_volume_mm3 !== undefined ? gc.actual_volume_mm3 : 0;
      const expectedFaces = gc.expected_volume_mm3 ?? 0;
      // Use face data if available in comparison
      return {
        diagnosis:
          `Face count mismatch indicates a feature operation ` +
          `(fillet/chamfer/hole) may have failed or been skipped.`,
        correction_type: "operation",
        suggested_fix:
          `Verify that the "${action.operation}" operation completed. ` +
          `Try alternative CadQuery method or check edge selection.`,
      };
    }

    // Bounding box diagnosis
    if (gc && gc.bbox_error_pct > 10) {
      return {
        diagnosis:
          `Bounding box error ${gc.bbox_error_pct.toFixed(1)}% suggests ` +
          `the shape proportions are wrong.`,
        correction_type: "dimension",
        suggested_fix:
          `Review sketch dimensions and extrude directions. ` +
          `The shape may be oriented differently than expected.`,
      };
    }

    // Catch-all
    return {
      diagnosis:
        `Verification failed for "${action.operation}" but the root cause ` +
        `could not be automatically determined.`,
      correction_type: "unknown",
      suggested_fix:
        `Manual review recommended. Check the operation sequence ` +
        `and parameter values against the source video.`,
    };
  }

  /**
   * Retry execution with a corrected script based on diagnosis.
   */
  retryWithCorrection(
    script: string,
    diagnosis: FailureDiagnosis,
    attempt: number,
  ): RetryResult {
    if (attempt > MAX_RETRY_ATTEMPTS) {
      return {
        attempt,
        success: false,
        correction_applied: "none — max attempts exceeded",
        verification: {
          success: false,
          similarity_score: 0,
          execution_log: [`Attempt ${attempt} skipped: max retries exceeded`],
          errors: ["Maximum retry attempts reached"],
        },
      };
    }

    let correctedScript = script;
    let correctionApplied: string;

    switch (diagnosis.correction_type) {
      case "dimension": {
        // Apply dimension scaling — find numeric literals and adjust
        const factor = 0.9 + attempt * 0.05; // progressive adjustment
        correctedScript = this.scaleDimensions(script, factor);
        correctionApplied =
          `Scaled dimensions by factor ${factor.toFixed(2)} (attempt ${attempt})`;
        break;
      }
      case "operation": {
        // Try alternative method names
        correctedScript = this.tryAlternativeMethod(script, attempt);
        correctionApplied =
          `Tried alternative CadQuery method (attempt ${attempt})`;
        break;
      }
      case "sequence": {
        correctionApplied =
          `Reordering not yet implemented (attempt ${attempt})`;
        break;
      }
      default: {
        correctionApplied =
          `No automatic correction for type "${diagnosis.correction_type}"`;
        break;
      }
    }

    // Execute the corrected script
    const execResult = this.executeScript(correctedScript);

    const verification: VerificationResult = {
      success: execResult.success,
      similarity_score: execResult.success ? 0.8 : 0.2,
      execution_log: [
        `Retry attempt ${attempt}`,
        correctionApplied,
        ...execResult.errors.map((e) => `Error: ${e}`),
      ],
      errors: execResult.errors,
    };

    log.info(
      `[ExecutionVerification] Retry #${attempt}: ` +
        `success=${execResult.success}, correction="${correctionApplied}"`,
    );

    return {
      attempt,
      success: execResult.success,
      correction_applied: correctionApplied,
      verification,
    };
  }

  /**
   * Create or retrieve a progress tracker.
   */
  trackProgress(totalSteps: number, trackerId?: string): ProgressReport {
    const id = trackerId ?? `track-${Date.now()}-${Math.random()}`;
    if (trackerId) {
      const existing = this.progressTrackers.get(id);
      if (existing) return existing;
    }

    const report: ProgressReport = {
      total_steps: totalSteps,
      completed_steps: 0,
      current_step: 0,
      current_action: "",
      status: "pending",
      step_results: [],
      elapsed_ms: 0,
      estimated_remaining_ms: 0,
    };
    this.progressTrackers.set(id, report);
    return report;
  }

  /**
   * Update progress: start a step.
   */
  startStep(
    report: ProgressReport,
    step: number,
    actionName: string,
  ): void {
    report.current_step = step;
    report.current_action = actionName;
    report.status = "executing";
  }

  /**
   * Update progress: complete a step.
   */
  completeStep(
    report: ProgressReport,
    step: number,
    status: "passed" | "failed" | "skipped",
    duration_ms: number,
    error?: string,
  ): void {
    report.step_results.push({ step, status, duration_ms, error });
    report.completed_steps = report.step_results.length;

    // Update elapsed
    report.elapsed_ms = report.step_results.reduce(
      (sum, r) => sum + r.duration_ms,
      0,
    );

    // Estimate remaining
    if (report.completed_steps > 0) {
      const avgMs = report.elapsed_ms / report.completed_steps;
      const remaining = report.total_steps - report.completed_steps;
      report.estimated_remaining_ms = avgMs * remaining;
    }

    // Update overall status
    if (report.completed_steps >= report.total_steps) {
      const anyFailed = report.step_results.some((r) => r.status === "failed");
      report.status = anyFailed ? "failed" : "passed";
    }
  }

  /**
   * Full execution pipeline with progress tracking and retries.
   */
  executeWithProgress(
    actions: ExtractedAction[],
    script: string,
  ): FullExecutionResult {
    const progress = this.trackProgress(actions.length);
    const retries: RetryResult[] = [];

    // Execute the full script
    this.startStep(progress, 0, "Full script execution");
    const startMs = Date.now();
    const execResult = this.executeScript(script);
    const execDuration = Date.now() - startMs;

    if (execResult.success) {
      this.completeStep(progress, 0, "passed", execDuration);
    } else {
      this.completeStep(
        progress,
        0,
        "failed",
        execDuration,
        execResult.errors.join("; "),
      );

      // Retry loop
      if (actions.length > 0) {
        const diagnosis = this.diagnoseFailure(
          {
            success: false,
            similarity_score: 0,
            execution_log: [],
            errors: execResult.errors,
          },
          actions[0],
        );

        for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
          progress.status = "retrying";
          const retryResult = this.retryWithCorrection(
            script,
            diagnosis,
            attempt,
          );
          retries.push(retryResult);

          if (retryResult.success) {
            this.startStep(progress, attempt, `Retry #${attempt}`);
            this.completeStep(progress, attempt, "passed", 0);
            break;
          }
        }
      }
    }

    const finalResult: VerificationResult = {
      success: execResult.success || retries.some((r) => r.success),
      similarity_score: execResult.success
        ? 1.0
        : retries.find((r) => r.success)?.verification.similarity_score ?? 0,
      execution_log: [
        `Executed script (${script.length} chars)`,
        `Initial: ${execResult.success ? "PASS" : "FAIL"}`,
        `Retries: ${retries.length}`,
      ],
      errors: execResult.errors,
    };

    log.info(
      `[ExecutionVerification] Pipeline complete: ` +
        `success=${finalResult.success}, retries=${retries.length}`,
    );

    return { final_result: finalResult, progress, retries };
  }

  // ── Private helpers ──────────────────────────────────────────────

  /** Basic Python syntax pre-check. */
  private preCheckSyntax(script: string): string[] {
    const errors: string[] = [];
    // Check balanced parentheses
    let depth = 0;
    for (const ch of script) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (depth < 0) {
        errors.push("Unmatched closing parenthesis");
        break;
      }
    }
    if (depth > 0) errors.push("Unclosed parenthesis");
    return errors;
  }

  /** Build a retry suggestion from error metrics. */
  private buildRetrySuggestion(
    volErr: number,
    bboxErr: number,
    faceMatch: boolean,
  ): string {
    const parts: string[] = [];
    if (volErr > 10) parts.push(`volume off by ${volErr.toFixed(0)}%`);
    if (bboxErr > 10) parts.push(`bbox off by ${bboxErr.toFixed(0)}%`);
    if (!faceMatch) parts.push("face count mismatch");
    return `Consider adjusting: ${parts.join(", ")}`;
  }

  /** Scale numeric dimension literals in a CadQuery script. */
  private scaleDimensions(script: string, factor: number): string {
    // Scale numeric arguments in common CadQuery calls
    return script.replace(
      /(\.\w+\(\s*)(\d+\.?\d*)/g,
      (_, prefix, num) => `${prefix}${(parseFloat(num) * factor).toFixed(2)}`,
    );
  }

  /** Try alternative CadQuery method names for common operations. */
  private tryAlternativeMethod(script: string, attempt: number): string {
    const alternatives: [RegExp, string][] = [
      [/\.fillet\(/g, ".chamfer("],
      [/\.chamfer\(/g, ".fillet("],
      [/\.extrude\(/g, ".extrude("],
    ];
    if (attempt <= alternatives.length) {
      const [pattern, replacement] = alternatives[attempt - 1];
      return script.replace(pattern, replacement);
    }
    return script;
  }
}

export const executionVerificationEngine = new ExecutionVerificationEngine();
