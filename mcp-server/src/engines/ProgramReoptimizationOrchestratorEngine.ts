/**
 * MS-PRINT-PROGRAM-LOOP / U-PPL-B1 — ProgramReoptimizationOrchestratorEngine
 *
 * Front-door orchestrator for Track B (closed-loop reoptimization).
 *
 * Pipeline:
 *   1. detect process (lathe / mill / unknown) from gcode markers
 *   2. route to LatheProgramOptimizerEngine (lathe path is fully wired here)
 *      or surface mill path as "deferred to U-PPL-B2" (mill optimizer takes
 *      a filePath, not content — wiring it cleanly needs a temp-file or
 *      content overload in U-PPL-B2's "Wire the optimizer engines" unit)
 *   3. run GCodeSafetyAnalyzerEngine over BOTH original AND optimized gcode
 *      to compute safety score delta + per-severity issue counts before/after
 *   4. emit unified line-diff + cycle-time-delta + safety-score-delta + per-
 *      stage timing
 *
 * Pure orchestration — composes the existing engines, never forks them:
 *   - LatheProgramOptimizerEngine.generateOptimizedProgram(content)
 *   - LatheProgramOptimizerEngine.estimateImprovements(content)
 *   - GCodeSafetyAnalyzerEngine.analyze(gcode, config)
 *
 * ProgramPhysicsOptimizerEngine integration is opt-in via the
 * `runPhysicsPass` flag — the physics optimizer requires resolved material
 * + tool registries which aren't available without caller-side context, so
 * v1 defaults it OFF and surfaces it as a deferred stage. U-PPL-B2 promotes
 * it to default-on once the material resolver is wired through.
 */

import type {
  OptimizedProgram,
  ImprovementEstimate,
} from "./LatheProgramOptimizerEngine.js";
import type {
  SafetyAnalysisResult,
  ControllerType,
  Strictness,
} from "./GCodeSafetyAnalyzerEngine.js";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Default safety analyzer config. SOURCE: PRISM safety doctrine —
 * `standard` strictness is the production default; aerospace/strict are
 * caller-supplied overrides for higher-tier shops. Controller defaults to
 * `fanuc` because it is the most common controller in the JM Die archive
 * (Okuma is a sibling family that lathe-routed programs target via OSP).
 */
export const DEFAULT_SAFETY_STRICTNESS: Strictness = "standard";
export const DEFAULT_CONTROLLER: ControllerType = "fanuc";

/**
 * Hard ceiling on single-program g-code size for the orchestrator.
 * SOURCE: the JM Die archive's largest single .MIN is ~14 KB; the largest
 * .mcx-derived program is ~120 KB. 2 MB is a 14× margin over any real
 * single program. Anything larger is pathological (concatenated archive,
 * fuzzing payload) and belongs in U-PPL-B2's ArchiveReoptimizationBatchEngine
 * (which streams file-by-file), NOT this single-program front door. The
 * lathe optimizer + dual safety pass are O(lines) with heavy per-line regex
 * — without this guard a multi-MB input hangs the pipeline for minutes
 * (observed 2026-05-16 with a 3.8 MB synthetic). Fail loud, not slow.
 */
export const MAX_GCODE_BYTES = 2 * 1024 * 1024;

/**
 * Process-detection markers. SOURCE: empirical analysis of the JM Die
 * archive (real Okuma OSP .MIN — verified against CASING_MACRO.MIN +
 * CBORE_CASING_MACRO.MIN 2026-05-16).
 *
 * KEY DIALECT FACT: Okuma OSP writes spindle speed as a VARIABLE
 * expression — `G50 S[V65]`, `G96 S[V45] M3`, `G97 S[V87] M3` — NOT the
 * Fanuc `G50 S3500` digit form. The earlier `S\d` regexes were Fanuc-only
 * and silently failed every real Okuma program (every JM Die lathe file).
 * Match `S` followed by ANY non-space token (`[V..]`, `#100`, digits).
 *
 * A program is "lathe" if it has ≥1 `G50 S…` clamp AND ≥1 `G96`/`G97`
 * spindle-mode toggle (CSS / constant-RPM are turning-exclusive). It is
 * "mill" if it has ≥1 `G43 H…` tool-length-comp block (milling-exclusive)
 * AND a `G54`-`G59` work offset AND explicit XY moves AND no lathe markers.
 */
export const LATHE_REGEX_G50 = /\bG50\s+S\S/;
export const LATHE_REGEX_CSS = /\bG9[67]\b/;
export const MILL_REGEX_G43 = /\bG43\s+H\d/;
export const MILL_REGEX_WORK_OFFSET = /\bG5[4-9]\b/;
export const MILL_REGEX_XY = /\bX[-\d.\[][\s\S]*?\bY[-\d.\[]/;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type DetectedProcess = "lathe" | "mill" | "unknown";

export interface ReoptimizeInput {
  /** Raw G-code text. Required. */
  gcode: string;
  /** Forced process classification. `"auto"` runs `detectProcess()`. */
  process?: "auto" | "lathe" | "mill";
  /** CNC controller type for safety analysis. */
  controller?: ControllerType;
  /** Safety strictness tier. */
  strictness?: Strictness;
  /** Optional filename for engine traceability. */
  filename?: string;
  /**
   * Whether to run the per-block physics S/F pass.
   * Default false — see file-level JSDoc rationale.
   */
  runPhysicsPass?: boolean;
}

export interface ReoptimizeStage {
  name: "detect" | "optimizer" | "safety_before" | "safety_after" | "physics" | "diff";
  status: "ok" | "skipped" | "error";
  notes?: string;
  durationMs?: number;
}

export interface SafetyIssueCounts {
  critical: number;
  high: number;
  medium: number;
}

export type ReoptimizeResult =
  | {
      ok: true;
      detectedProcess: DetectedProcess;
      /** Re-optimized G-code. Equal to input if no autofixes applied. */
      optimizedGcode: string;
      /** Unified line-diff (added/removed lines only). */
      diff: string;
      /** Estimated cycle-time delta in seconds (positive = saving). */
      cycleTimeDeltaSec: number;
      /** Lathe S(x) safety score (0-100) before and after. */
      safetyScoreBefore: number;
      safetyScoreAfter: number;
      safetyScoreDelta: number;
      /** Issue counts at each severity before and after. */
      safetyIssuesBefore: SafetyIssueCounts;
      safetyIssuesAfter: SafetyIssueCounts;
      /** Per-stage execution log (success / skip / error). */
      stages: ReoptimizeStage[];
      /** Surfaced detail from the lathe optimizer (when used). */
      latheMetrics?: OptimizedProgram["metrics"];
      latheImprovements?: ImprovementEstimate;
    }
  | {
      ok: false;
      reason:
        | "no_gcode"
        | "gcode_too_large"
        | "no_process_detected"
        | "mill_path_deferred"
        | "optimizer_error";
      detail?: string;
      detectedProcess: DetectedProcess;
      stages: ReoptimizeStage[];
    };

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export class ProgramReoptimizationOrchestratorEngine {
  /**
   * Pure: detect process classification from g-code markers.
   *
   * Returns:
   *   "lathe"   when ≥1 G50-S clamp AND ≥1 G96-S toggle is present
   *   "mill"    when ≥1 G43-H tool-length-compensation block AND ≥1 G54-XY
   *             work-offset block are present, AND no lathe markers
   *   "unknown" otherwise (caller should surface via the `unknown` branch)
   */
  static detectProcess(gcode: string): DetectedProcess {
    if (!gcode || gcode.length === 0) return "unknown";
    // Lathe is checked FIRST and wins ties — G50-S clamp + a G96/G97
    // spindle-mode toggle is turning-exclusive (mills have no constant
    // surface speed). Lathes do use G54-G59 work offsets too, so a
    // mill-first check would mis-route turning programs.
    const hasLatheMarkers =
      LATHE_REGEX_G50.test(gcode) && LATHE_REGEX_CSS.test(gcode);
    if (hasLatheMarkers) return "lathe";
    const hasMillMarkers =
      MILL_REGEX_G43.test(gcode) &&
      MILL_REGEX_WORK_OFFSET.test(gcode) &&
      MILL_REGEX_XY.test(gcode);
    if (hasMillMarkers) return "mill";
    return "unknown";
  }

  /**
   * Pure: line-by-line unified diff in the canonical `- old` / `+ new`
   * format used by the rest of PRISM's diff-emitting engines (no header
   * lines, no hunk markers — callers wrap into a full unified diff if they
   * need one). Only lines that differ between the two inputs appear; equal
   * lines are dropped.
   */
  static unifiedLineDiff(originalGcode: string, optimizedGcode: string): string {
    const origLines = originalGcode.split(/\r?\n/);
    const optLines = optimizedGcode.split(/\r?\n/);
    const maxLen = Math.max(origLines.length, optLines.length);
    const diffLines: string[] = [];
    for (let i = 0; i < maxLen; i++) {
      const a = origLines[i] ?? "";
      const b = optLines[i] ?? "";
      if (a !== b) {
        if (a) diffLines.push(`- ${a}`);
        if (b) diffLines.push(`+ ${b}`);
      }
    }
    return diffLines.join("\n");
  }

  /**
   * Full pipeline. Async because the dep engines may do async work in the
   * future (notably the mill arm); v1 lathe path is synchronous internally
   * but the public API is async-compatible to keep the contract stable.
   *
   * Lazy-imports its dep engines so module loading stays fast — the lathe
   * optimizer pulls in ~50 KB of registry data.
   */
  static async reoptimize(input: ReoptimizeInput): Promise<ReoptimizeResult> {
    const stages: ReoptimizeStage[] = [];

    // 0. Input validation
    if (!input.gcode || input.gcode.trim().length === 0) {
      return {
        ok: false,
        reason: "no_gcode",
        detail: "input.gcode is empty or whitespace-only",
        detectedProcess: "unknown",
        stages,
      };
    }
    // Resource-exhaustion guard — fail loud on pathological size rather than
    // hanging the pipeline for minutes (see MAX_GCODE_BYTES rationale).
    const byteLen = Buffer.byteLength(input.gcode, "utf8");
    if (byteLen > MAX_GCODE_BYTES) {
      return {
        ok: false,
        reason: "gcode_too_large",
        detail:
          `input.gcode is ${byteLen} bytes — exceeds the ${MAX_GCODE_BYTES}-byte ` +
          `single-program ceiling. Concatenated archives / fuzzing payloads must ` +
          `go through U-PPL-B2 ArchiveReoptimizationBatchEngine (streams file-by-file).`,
        detectedProcess: "unknown",
        stages,
      };
    }

    // 1. Detect process
    const detectStart = Date.now();
    const detected =
      input.process === "lathe" || input.process === "mill"
        ? input.process
        : this.detectProcess(input.gcode);
    stages.push({
      name: "detect",
      status: detected === "unknown" ? "error" : "ok",
      notes: `detected=${detected}`,
      durationMs: Date.now() - detectStart,
    });
    if (detected === "unknown") {
      return {
        ok: false,
        reason: "no_process_detected",
        detail:
          "G-code lacks both lathe (G50+G96) and mill (G43+G54+XY) marker pairs. " +
          "Caller must pass input.process explicitly.",
        detectedProcess: detected,
        stages,
      };
    }

    // 2. Route — lathe only in v1; mill is a deferred stage with a clean
    //    surface for U-PPL-B2.
    if (detected === "mill") {
      stages.push({
        name: "optimizer",
        status: "skipped",
        notes: "mill path requires filePath-based MillProgramOptimizer.optimizeProgram — deferred to U-PPL-B2 (Wire the optimizer engines unit)",
      });
      return {
        ok: false,
        reason: "mill_path_deferred",
        detail:
          "MillProgramOptimizerEngine.optimizeProgram(filePath) needs a content-based " +
          "overload before the orchestrator can route mill programs without temp-file " +
          "writes. Tracked by U-PPL-B2.",
        detectedProcess: detected,
        stages,
      };
    }

    // 3. Lathe optimizer pass
    const optimizerStart = Date.now();
    let optimized: OptimizedProgram;
    let improvements: ImprovementEstimate;
    try {
      const { latheProgramOptimizerEngine } = await import("./LatheProgramOptimizerEngine.js");
      optimized = latheProgramOptimizerEngine.generateOptimizedProgram(
        input.gcode,
        input.filename,
      );
      improvements = latheProgramOptimizerEngine.estimateImprovements(
        input.gcode,
        input.filename,
      );
    } catch (err) {
      stages.push({
        name: "optimizer",
        status: "error",
        notes: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - optimizerStart,
      });
      return {
        ok: false,
        reason: "optimizer_error",
        detail: err instanceof Error ? err.message : String(err),
        detectedProcess: detected,
        stages,
      };
    }
    stages.push({
      name: "optimizer",
      status: "ok",
      notes: `${optimized.changes.length} changes applied, ${optimized.warnings.length} warnings`,
      durationMs: Date.now() - optimizerStart,
    });

    // 4. Safety analyzer — runs on both original AND optimized to compute deltas.
    const safetyConfig = {
      controller: input.controller ?? DEFAULT_CONTROLLER,
      strictness: input.strictness ?? DEFAULT_SAFETY_STRICTNESS,
    };

    // Lazy-import ONCE — the singleton is `gcSafetyAnalyzer` (the only
    // export of GCodeSafetyAnalyzerEngine.ts). A prior edit left the
    // safety_after arm importing a non-existent `gcodeSafetyAnalyzerEngine`,
    // which silently zeroed every after-score (caught by 3-of-3 reviewers B+C
    // 2026-05-16 — the asymmetric-binding silent-degradation class).
    let gcSafetyAnalyzerRef:
      | { analyze: (g: string, c: typeof safetyConfig) => SafetyAnalysisResult }
      | null = null;
    try {
      const mod = await import("./GCodeSafetyAnalyzerEngine.js");
      gcSafetyAnalyzerRef = mod.gcSafetyAnalyzer;
    } catch {
      gcSafetyAnalyzerRef = null;
    }

    const safetyBeforeStart = Date.now();
    let safetyBefore: SafetyAnalysisResult;
    let safetyBeforeStatus: ReoptimizeStage["status"] = "ok";
    try {
      if (!gcSafetyAnalyzerRef) throw new Error("gcSafetyAnalyzer import failed");
      safetyBefore = gcSafetyAnalyzerRef.analyze(input.gcode, safetyConfig);
    } catch (err) {
      safetyBeforeStatus = "error";
      // Non-blocking: orchestrator still returns the optimizer's gcode, but
      // the score delta is meaningless — surface the failure LOUDLY via the
      // stage status + notes so a consumer never trusts a phantom 0 score.
      safetyBefore = emptyEmptyAnalysis();
      safetyBefore.summary =
        "safety_before FAILED: " + (err instanceof Error ? err.message : String(err));
    }
    stages.push({
      name: "safety_before",
      status: safetyBeforeStatus,
      notes:
        safetyBeforeStatus === "error"
          ? safetyBefore.summary
          : `score=${safetyBefore.score}`,
      durationMs: Date.now() - safetyBeforeStart,
    });

    const safetyAfterStart = Date.now();
    let safetyAfter: SafetyAnalysisResult;
    let safetyAfterStatus: ReoptimizeStage["status"] = "ok";
    try {
      if (!gcSafetyAnalyzerRef) throw new Error("gcSafetyAnalyzer import failed");
      safetyAfter = gcSafetyAnalyzerRef.analyze(optimized.optimized, safetyConfig);
    } catch (err) {
      safetyAfterStatus = "error";
      safetyAfter = emptyEmptyAnalysis();
      safetyAfter.summary =
        "safety_after FAILED: " + (err instanceof Error ? err.message : String(err));
    }
    stages.push({
      name: "safety_after",
      status: safetyAfterStatus,
      notes:
        safetyAfterStatus === "error"
          ? safetyAfter.summary
          : `score=${safetyAfter.score}`,
      durationMs: Date.now() - safetyAfterStart,
    });

    // 5. Physics pass — opt-in. The brief calls for ProgramPhysicsOptimizerEngine
    //    per-block S/F, but it requires resolved material + tool context that
    //    isn't part of this engine's input. Surface as a deferred stage when
    //    not requested, "skipped" (not "error") so callers can ask for it
    //    later with the required context.
    if (input.runPhysicsPass) {
      stages.push({
        name: "physics",
        status: "skipped",
        notes:
          "ProgramPhysicsOptimizerEngine requires {program, customer_name, " +
          "unit_system} parsed-program context. Pending U-PPL-B2 wire-up of " +
          "materialResolverForProgramsEngine + toolResolverForProgramsEngine " +
          "into the orchestrator boundary.",
      });
    } else {
      stages.push({
        name: "physics",
        status: "skipped",
        notes: "runPhysicsPass=false (default)",
      });
    }

    // 6. Diff
    const diffStart = Date.now();
    const diff = this.unifiedLineDiff(input.gcode, optimized.optimized);
    stages.push({
      name: "diff",
      status: "ok",
      notes: `${diff.split("\n").length} diff lines`,
      durationMs: Date.now() - diffStart,
    });

    return {
      ok: true,
      detectedProcess: detected,
      optimizedGcode: optimized.optimized,
      diff,
      cycleTimeDeltaSec: improvements.estimatedCycleTimeReduction,
      safetyScoreBefore: safetyBefore.score,
      safetyScoreAfter: safetyAfter.score,
      safetyScoreDelta: safetyAfter.score - safetyBefore.score,
      safetyIssuesBefore: {
        critical: safetyBefore.critical.length,
        high: safetyBefore.high.length,
        medium: safetyBefore.medium.length,
      },
      safetyIssuesAfter: {
        critical: safetyAfter.critical.length,
        high: safetyAfter.high.length,
        medium: safetyAfter.medium.length,
      },
      stages,
      latheMetrics: optimized.metrics,
      latheImprovements: improvements,
    };
  }
}

export const programReoptimizationOrchestratorEngine = ProgramReoptimizationOrchestratorEngine;

// ═══════════════════════════════════════════════════════════════════════════
// PRIVATE
// ═══════════════════════════════════════════════════════════════════════════

function emptyEmptyAnalysis(): SafetyAnalysisResult {
  return {
    safe: false,
    critical: [],
    high: [],
    medium: [],
    score: 0,
    summary: "safety analyzer error — score defaulted to 0",
  };
}
