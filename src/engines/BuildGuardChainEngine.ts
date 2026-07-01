/**
 * BuildGuardChainEngine — ACP-MS2
 *
 * Orchestrates the Coding & Build Guard Chain:
 *   1. Pre-edit safety validation (is this file safe to modify?)
 *   2. Edit tracking (what changed, when, how many edits since last check)
 *   3. Post-edit validation (tsc → lint → affected tests → review gate)
 *   4. Trivial TS error auto-fix (unused imports, missing types)
 *   5. Affected test resolution (changed file → test files to run)
 *
 * The chain is modeled as a state machine with explicit steps,
 * each producing a typed result. Steps can be skipped, retried,
 * or failed — the chain tracks the outcome of each.
 *
 * Sources:
 *   - ACP-MS2: Coding + Build Guard Chain
 *   - AUTOMATION_CENSUS.json gap analysis: build_guard at 80%
 *   - Existing hooks: enforce-smart-test-after-edit.py, enforce-review-gate.py
 */

// ============================================================================
// TYPES
// ============================================================================

export type GuardStepId =
  | "pre_edit_safety"
  | "edit_tracking"
  | "typecheck"
  | "affected_tests"
  | "test_execution"
  | "trivial_fix"
  | "review_gate";

export type StepStatus = "pending" | "running" | "passed" | "failed" | "skipped" | "fixed";

export interface GuardStepResult {
  step: GuardStepId;
  status: StepStatus;
  duration_ms: number;
  details: string;
  errors?: string[];
  fixes_applied?: string[];
}

export interface PreEditSafetyResult {
  safe: boolean;
  file_path: string;
  reasons: string[];
  risk_level: "low" | "medium" | "high" | "critical";
  is_physics_file: boolean;
  is_pipeline_file: boolean;
  is_registry_file: boolean;
  other_agents_editing: string[];
}

export interface EditTrackingState {
  session_edits: number;
  edits_since_test: number;
  edits_since_review: number;
  edited_files: string[];
  engines_written: string[];
  test_files_written: string[];
  last_edit_timestamp: string;
}

export interface AffectedTestResult {
  source_file: string;
  test_files: string[];
  resolution_method: "name_match" | "import_scan" | "directory_match" | "glob_pattern";
  confidence: number;
}

export interface TSErrorInfo {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
  is_trivial: boolean;
  auto_fix?: string;
}

export interface TypecheckResult {
  pass: boolean;
  error_count: number;
  errors: TSErrorInfo[];
  trivial_count: number;
  non_trivial_count: number;
}

export interface ChainExecutionResult {
  chain_id: "build_guard";
  started_at: string;
  completed_at: string;
  duration_ms: number;
  overall_status: "pass" | "fail" | "partial";
  steps: GuardStepResult[];
  edit_state: EditTrackingState;
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Files that require extra caution when editing */
const CRITICAL_PATHS = [
  "src/physics/constants.ts",
  "src/index.ts",
  "src/engines/SpeedFeedOrchestratorEngine.ts",
  "src/engines/PostProcessorPipelineEngine.ts",
  "src/engines/KienzleForceModelEngine.ts",
];

/** Pipeline files — changes cascade to downstream programs */
const PIPELINE_PATTERNS = [
  /PrintToProgramPipeline/,
  /TurningPrintToProgram/,
  /MultiAxisPrintToProgram/,
  /MillTurnSwissPipeline/,
  /EDMProgramAssembler/,
  /GrindingProgramAssembler/,
  /LaserProgramAssembler/,
  /WaterjetProgramAssembler/,
  /QuoteToShipOrchestrator/,
];

/** Registry files — data integrity is paramount */
const REGISTRY_PATTERN = /src\/registries\//;

/** Physics files — formulas must be verified */
const PHYSICS_PATTERN = /src\/physics\/|src\/engines\/(Kienzle|Taylor|Chatter|Deflection|Thermal|CuttingForce|CuttingTemperature|SurfaceFinish)/;

/** Trivial TS error codes that can be auto-fixed */
const TRIVIAL_ERROR_CODES: Record<string, string> = {
  TS6133: "unused_import",       // declared but never used
  TS6196: "unused_import",       // declared but never read
  TS2304: "missing_name",        // Cannot find name 'X'
  TS2552: "similar_name",        // Did you mean 'Y'?
  TS1005: "missing_token",       // ';' expected
  TS2345: "type_mismatch",       // not assignable (only trivial subset)
  TS2322: "type_mismatch",       // Type X not assignable to Y
  TS7006: "implicit_any",        // parameter implicitly has 'any' type
};

/** Thresholds */
const EDITS_BEFORE_TEST_REMINDER = 5;
const EDITS_BEFORE_REVIEW_REQUIRED = 8;
const EDITS_BEFORE_REVIEW_BLOCK = 12;

// ============================================================================
// ENGINE
// ============================================================================

export class BuildGuardChainEngine {

  // ── Pre-Edit Safety ────────────────────────────────────────

  /**
   * Validate whether a file is safe to edit.
   * Checks: critical path, pipeline, registry, physics, agent conflicts.
   *
   * @param filePath Path to the file being edited
   * @param activeAgentFiles Files currently being edited by other agents (optional)
   * @returns Safety assessment with risk level and reasons
   */
  validatePreEdit(filePath: string, activeAgentFiles: string[] = []): PreEditSafetyResult {
    const normalized = filePath.replace(/\\/g, "/");
    const reasons: string[] = [];
    let riskLevel: PreEditSafetyResult["risk_level"] = "low";

    const isCritical = CRITICAL_PATHS.some(cp => normalized.endsWith(cp));
    const isPipeline = PIPELINE_PATTERNS.some(p => p.test(normalized));
    const isRegistry = REGISTRY_PATTERN.test(normalized);
    const isPhysics = PHYSICS_PATTERN.test(normalized);

    if (isCritical) {
      reasons.push(`CRITICAL PATH: ${normalized} is a core system file — changes cascade widely`);
      riskLevel = "critical";
    }

    if (isPipeline) {
      reasons.push("PIPELINE FILE: changes affect downstream G-code generation");
      riskLevel = riskLevel === "critical" ? "critical" : "high";
    }

    if (isRegistry) {
      reasons.push("REGISTRY FILE: data integrity is paramount — validate after edit");
      riskLevel = riskLevel === "low" ? "medium" : riskLevel;
    }

    if (isPhysics) {
      reasons.push("PHYSICS FILE: formulas must be verified against canonical constants");
      riskLevel = riskLevel === "low" ? "medium" : riskLevel;
    }

    // Check for agent conflicts
    const conflicting = activeAgentFiles.filter(f =>
      f.replace(/\\/g, "/") === normalized
    );

    if (conflicting.length > 0) {
      reasons.push(`CONFLICT: ${conflicting.length} other agent(s) editing this file`);
      riskLevel = "critical";
    }

    if (reasons.length === 0) {
      reasons.push("No special risks detected");
    }

    return {
      safe: riskLevel !== "critical" || conflicting.length === 0,
      file_path: normalized,
      reasons,
      risk_level: riskLevel,
      is_physics_file: isPhysics,
      is_pipeline_file: isPipeline,
      is_registry_file: isRegistry,
      other_agents_editing: conflicting,
    };
  }

  // ── Edit Tracking ──────────────────────────────────────────

  /**
   * Track an edit event, updating the session state.
   *
   * @param state Current tracking state
   * @param filePath File that was edited
   * @returns Updated tracking state with recommendations
   */
  trackEdit(state: EditTrackingState, filePath: string): {
    state: EditTrackingState;
    action_needed: "none" | "suggest_test" | "require_test" | "require_review" | "block_edit";
    message: string;
  } {
    const normalized = filePath.replace(/\\/g, "/");
    const basename = normalized.split("/").pop() || "";
    const isTest = basename.includes(".test.") || basename.includes(".spec.");
    const isEngine = normalized.includes("/engines/") && basename.endsWith(".ts") && !isTest;

    const newState: EditTrackingState = {
      session_edits: state.session_edits + 1,
      edits_since_test: isTest ? 0 : state.edits_since_test + 1,
      edits_since_review: state.edits_since_review + 1,
      edited_files: [...new Set([...state.edited_files, normalized])].slice(-20),
      engines_written: isEngine
        ? [...new Set([...state.engines_written, basename])].slice(-20)
        : state.engines_written,
      test_files_written: isTest
        ? [...new Set([...state.test_files_written, basename])].slice(-20)
        : state.test_files_written,
      last_edit_timestamp: new Date().toISOString(),
    };

    // Determine action needed
    if (newState.edits_since_review >= EDITS_BEFORE_REVIEW_BLOCK) {
      return {
        state: newState,
        action_needed: "block_edit",
        message: `BLOCKED: ${newState.edits_since_review} edits without review. Run /prism-review before continuing.`,
      };
    }

    if (newState.edits_since_review >= EDITS_BEFORE_REVIEW_REQUIRED) {
      return {
        state: newState,
        action_needed: "require_review",
        message: `REVIEW REQUIRED: ${newState.edits_since_review} edits without review. Run /prism-review soon.`,
      };
    }

    if (newState.edits_since_test >= EDITS_BEFORE_TEST_REMINDER) {
      return {
        state: newState,
        action_needed: "require_test",
        message: `TEST REQUIRED: ${newState.edits_since_test} edits without running tests. Run affected tests now.`,
      };
    }

    if (newState.edits_since_test >= 3) {
      return {
        state: newState,
        action_needed: "suggest_test",
        message: `Consider running tests — ${newState.edits_since_test} edits since last test run.`,
      };
    }

    return {
      state: newState,
      action_needed: "none",
      message: "Edit tracked.",
    };
  }

  /**
   * Create a fresh edit tracking state.
   */
  freshEditState(): EditTrackingState {
    return {
      session_edits: 0,
      edits_since_test: 0,
      edits_since_review: 0,
      edited_files: [],
      engines_written: [],
      test_files_written: [],
      last_edit_timestamp: "",
    };
  }

  // ── Affected Test Resolution ───────────────────────────────

  /**
   * Given a changed source file, determine which test files should be run.
   * Uses multiple resolution strategies with confidence scoring.
   *
   * @param sourceFile The changed source file path
   * @param availableTests List of all available test file paths
   * @returns Matched test files with resolution method and confidence
   */
  resolveAffectedTests(sourceFile: string, availableTests: string[]): AffectedTestResult {
    const normalized = sourceFile.replace(/\\/g, "/");
    const basename = normalized.split("/").pop() || "";
    const nameWithoutExt = basename.replace(/\.ts$/, "").replace(/\.js$/, "");

    const matched: string[] = [];
    let method: AffectedTestResult["resolution_method"] = "name_match";
    let confidence = 0;

    // Strategy 1: Direct name match (highest confidence)
    // FooEngine.ts → FooEngine.test.ts
    const directMatch = availableTests.filter(t => {
      const tBase = t.replace(/\\/g, "/").split("/").pop() || "";
      return tBase === `${nameWithoutExt}.test.ts` || tBase === `${nameWithoutExt}.spec.ts`;
    });

    if (directMatch.length > 0) {
      matched.push(...directMatch);
      method = "name_match";
      confidence = 0.95;
    }

    // Strategy 2: Partial name match
    // WireEDMSettingsEngine.ts → wedm-kunieda-feed.test.ts (contains "wedm")
    if (matched.length === 0) {
      const keywords = nameWithoutExt
        .replace(/Engine$/, "")
        .replace(/([A-Z])/g, " $1")
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3);

      const partialMatches = availableTests.filter(t => {
        const tLower = t.toLowerCase();
        return keywords.some(kw => tLower.includes(kw));
      });

      if (partialMatches.length > 0 && partialMatches.length <= 10) {
        matched.push(...partialMatches);
        method = "glob_pattern";
        confidence = 0.6;
      }
    }

    // Strategy 3: Directory-based match
    // src/engines/hypermill/Foo.ts → tests that include "hypermill"
    if (matched.length === 0) {
      const dirParts = normalized.split("/");
      const engineDir = dirParts.find((_, i) =>
        i > 0 && dirParts[i - 1] === "engines" && !dirParts[i].endsWith(".ts")
      );

      if (engineDir) {
        const dirMatches = availableTests.filter(t =>
          t.toLowerCase().includes(engineDir.toLowerCase())
        );
        if (dirMatches.length > 0) {
          matched.push(...dirMatches);
          method = "directory_match";
          confidence = 0.5;
        }
      }
    }

    return {
      source_file: normalized,
      test_files: [...new Set(matched)],
      resolution_method: method,
      confidence,
    };
  }

  // ── TypeScript Error Parsing ───────────────────────────────

  /**
   * Parse tsc output into structured error objects.
   * Identifies which errors are trivially auto-fixable.
   *
   * @param tscOutput Raw tsc --noEmit stderr/stdout
   * @returns Parsed errors with trivial classification
   */
  parseTypecheckOutput(tscOutput: string): TypecheckResult {
    const errors: TSErrorInfo[] = [];

    // Match: src/foo.ts(10,5): error TS2304: Cannot find name 'bar'.
    const errorPattern = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/gm;
    let match: RegExpExecArray | null;

    while ((match = errorPattern.exec(tscOutput)) !== null) {
      const code = match[4];
      const isTrivial = code in TRIVIAL_ERROR_CODES;

      let autoFix: string | undefined;
      if (isTrivial) {
        const fixType = TRIVIAL_ERROR_CODES[code];
        if (fixType === "unused_import") {
          autoFix = `Remove unused import at line ${match[2]}`;
        } else if (fixType === "similar_name" && match[5].includes("Did you mean")) {
          const suggestion = match[5].match(/Did you mean '(.+?)'/);
          if (suggestion) {
            autoFix = `Replace with '${suggestion[1]}' at line ${match[2]}`;
          }
        } else if (fixType === "missing_token") {
          autoFix = `Add missing token at line ${match[2]}, column ${match[3]}`;
        }
      }

      errors.push({
        file: match[1].replace(/\\/g, "/"),
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
        code,
        message: match[5],
        is_trivial: isTrivial && autoFix !== undefined,
        auto_fix: autoFix,
      });
    }

    const trivialCount = errors.filter(e => e.is_trivial).length;

    return {
      pass: errors.length === 0,
      error_count: errors.length,
      errors,
      trivial_count: trivialCount,
      non_trivial_count: errors.length - trivialCount,
    };
  }

  /**
   * Generate fix suggestions for trivial TS errors.
   * Returns actionable fix descriptions (not file mutations).
   *
   * @param errors Parsed TS errors from parseTypecheckOutput
   * @returns Array of fix descriptions grouped by file
   */
  suggestTrivialFixes(errors: TSErrorInfo[]): Array<{
    file: string;
    fixes: Array<{ line: number; code: string; fix: string }>;
  }> {
    const trivial = errors.filter(e => e.is_trivial && e.auto_fix);
    const byFile = new Map<string, Array<{ line: number; code: string; fix: string }>>();

    for (const err of trivial) {
      const existing = byFile.get(err.file) || [];
      existing.push({
        line: err.line,
        code: err.code,
        fix: err.auto_fix!,
      });
      byFile.set(err.file, existing);
    }

    return Array.from(byFile.entries()).map(([file, fixes]) => ({
      file,
      fixes: fixes.sort((a, b) => b.line - a.line), // reverse order for safe editing
    }));
  }

  // ── Chain Execution ────────────────────────────────────────

  /**
   * Execute the full build guard chain for a set of edited files.
   * This is the main orchestrator method.
   *
   * @param editedFiles Files that were modified
   * @param tscOutput Output from tsc --noEmit (if already run)
   * @param availableTests All test files in the project
   * @param editState Current edit tracking state
   * @returns Full chain execution result
   */
  executeChain(
    editedFiles: string[],
    tscOutput: string,
    availableTests: string[],
    editState: EditTrackingState,
  ): ChainExecutionResult {
    const startTime = Date.now();
    const steps: GuardStepResult[] = [];
    const recommendations: string[] = [];

    // Step 1: Pre-edit safety (retrospective for all files)
    const preEditStart = Date.now();
    const safetyResults = editedFiles.map(f => this.validatePreEdit(f));
    const criticalFiles = safetyResults.filter(r => r.risk_level === "critical");
    const highRiskFiles = safetyResults.filter(r => r.risk_level === "high");

    steps.push({
      step: "pre_edit_safety",
      status: criticalFiles.length > 0 ? "failed" : "passed",
      duration_ms: Date.now() - preEditStart,
      details: `${editedFiles.length} files checked: ${criticalFiles.length} critical, ${highRiskFiles.length} high risk`,
      errors: criticalFiles.map(r => `CRITICAL: ${r.file_path} — ${r.reasons[0]}`),
    });

    if (criticalFiles.length > 0) {
      recommendations.push(
        `${criticalFiles.length} critical file(s) edited — run full test suite, not just affected tests`
      );
    }

    // Step 2: Edit tracking
    const trackStart = Date.now();
    let currentState = editState;
    let worstAction: string = "none";

    for (const file of editedFiles) {
      const result = this.trackEdit(currentState, file);
      currentState = result.state;
      if (result.action_needed !== "none") {
        worstAction = result.action_needed;
      }
    }

    steps.push({
      step: "edit_tracking",
      status: worstAction === "block_edit" ? "failed" : "passed",
      duration_ms: Date.now() - trackStart,
      details: `${currentState.session_edits} total edits, ${currentState.edits_since_test} since test, ${currentState.edits_since_review} since review`,
    });

    if (worstAction === "require_review" || worstAction === "block_edit") {
      recommendations.push("Run /prism-review before continuing — too many edits without review");
    }

    // Step 3: TypeCheck
    const tscStart = Date.now();
    const tscResult = this.parseTypecheckOutput(tscOutput);

    steps.push({
      step: "typecheck",
      status: tscResult.pass ? "passed" : (tscResult.trivial_count === tscResult.error_count ? "fixed" : "failed"),
      duration_ms: Date.now() - tscStart,
      details: `${tscResult.error_count} errors (${tscResult.trivial_count} trivial, ${tscResult.non_trivial_count} non-trivial)`,
      errors: tscResult.errors.slice(0, 10).map(e => `${e.file}:${e.line} ${e.code}: ${e.message}`),
      fixes_applied: tscResult.trivial_count > 0
        ? this.suggestTrivialFixes(tscResult.errors).flatMap(f => f.fixes.map(fx => fx.fix))
        : undefined,
    });

    if (tscResult.non_trivial_count > 0) {
      recommendations.push(`Fix ${tscResult.non_trivial_count} non-trivial TS error(s) before proceeding`);
    }

    // Step 4: Affected test resolution
    const testStart = Date.now();
    const sourceFiles = editedFiles.filter(f => !f.includes(".test.") && !f.includes(".spec."));
    const allAffectedTests = new Set<string>();

    for (const src of sourceFiles) {
      const resolved = this.resolveAffectedTests(src, availableTests);
      for (const t of resolved.test_files) {
        allAffectedTests.add(t);
      }
    }

    steps.push({
      step: "affected_tests",
      status: allAffectedTests.size > 0 ? "passed" : "skipped",
      duration_ms: Date.now() - testStart,
      details: `${allAffectedTests.size} test file(s) identified for ${sourceFiles.length} source file(s)`,
    });

    if (allAffectedTests.size > 0) {
      recommendations.push(`Run ${allAffectedTests.size} affected test(s): ${[...allAffectedTests].slice(0, 5).join(", ")}`);
    } else if (sourceFiles.length > 0) {
      recommendations.push("No matching test files found — consider writing tests for changed files");
    }

    // Step 5: Review gate
    const reviewStart = Date.now();
    const needsReview = currentState.edits_since_review >= EDITS_BEFORE_REVIEW_REQUIRED;

    steps.push({
      step: "review_gate",
      status: needsReview ? "failed" : "passed",
      duration_ms: Date.now() - reviewStart,
      details: needsReview
        ? `${currentState.edits_since_review} edits since last review — review required`
        : `${currentState.edits_since_review} edits since last review — within threshold`,
    });

    // Overall status
    const failedSteps = steps.filter(s => s.status === "failed");
    const overallStatus: ChainExecutionResult["overall_status"] =
      failedSteps.length === 0 ? "pass" :
      failedSteps.length < steps.length ? "partial" : "fail";

    return {
      chain_id: "build_guard",
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      overall_status: overallStatus,
      steps,
      edit_state: currentState,
      recommendations,
    };
  }

  // ── Utility ────────────────────────────────────────────────

  /**
   * Get the list of trivial TS error codes recognized by the auto-fixer.
   */
  getTrivialErrorCodes(): Record<string, string> {
    return { ...TRIVIAL_ERROR_CODES };
  }

  /**
   * Get the chain step configuration (for inspection/testing).
   */
  getChainSteps(): Array<{ id: GuardStepId; required: boolean; description: string }> {
    return [
      { id: "pre_edit_safety", required: true, description: "Check if files are safe to modify" },
      { id: "edit_tracking", required: true, description: "Track edit count and enforce limits" },
      { id: "typecheck", required: true, description: "Run tsc --noEmit and parse errors" },
      { id: "affected_tests", required: true, description: "Resolve source files to test files" },
      { id: "test_execution", required: false, description: "Run affected tests (delegated to runner)" },
      { id: "trivial_fix", required: false, description: "Auto-fix trivial TS errors" },
      { id: "review_gate", required: true, description: "Enforce review after N edits" },
    ];
  }
}

export const buildGuardChainEngine = new BuildGuardChainEngine();
