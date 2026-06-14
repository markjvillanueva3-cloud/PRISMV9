/**
 * CADDrawAnyPartValidationHarnessEngine — CAD-DRAW-MAX-MS1/U-VALIDATION-50
 *
 * Validation harness for {@link CADDrawAnyPartOrchestratorEngine}. Takes a
 * fixed set of {@link ValidationTestCase}s (each a `DrawAnyPartInput` plus
 * pass/fail criteria), runs the orchestrator against each, scores the
 * outcome with a pluggable rubric, aggregates per-case verdicts into an
 * overall accuracy, and reports PASS/FAIL against an operator-set gate
 * (default 0.70 per CAD-COMPLETE-MS0 §PHASE-21 capstone goal).
 *
 * Scope (v1, this unit): binary-rubric scoring — case passes iff
 * `DrawAnyPartResult.exportedSuccessfully === true` AND any caller-supplied
 * post-checks (`expectedOpLogMin`, `mustNotStopFor`) hold. Richer geometry-
 * diff / GD&T-match scoring is the explicit follow-up unit
 * U-VALIDATION-50-SCORING — kept out of scope here so this v1 ships.
 *
 * Corpus loading is pluggable: callers pass `ValidationTestCase[]`. A real
 * 50-print JM Die corpus loader is the explicit follow-up unit
 * U-VALIDATION-50-CORPUS. Synthetic cases ship in tests as proof.
 *
 * **Determinism + injectability:**
 *   - The orchestrator is injected via `opts.orchestrator` (default = the
 *     live `cadDrawAnyPartOrchestratorEngine`) so tests run hermetically
 *     against a stub. The harness itself has zero I/O — pure aggregation.
 *   - `opts.now` is injectable so timestamp assertions are deterministic.
 *
 * **Failure handling:** if the orchestrator throws on a case, the harness
 * records `verdict: "fail"` + `error: "<msg>"` and continues — one bad
 * case does NOT poison the report (R12 fail-loud per case, never silent).
 *
 * Knobs (env-readable by callers; the harness itself is pure):
 *   PRISM_CDM_VALIDATION_GATE       default 0.70 (range 0..1)
 *   PRISM_CDM_VALIDATION_MAX_CASES  cap cases evaluated (debug)
 *
 * Refs: CADDrawAnyPartOrchestratorEngine (CAD-DRAW-MAX-MS0/P1-U10).
 */

import {
  cadDrawAnyPartOrchestratorEngine,
  type DrawAnyPartInput,
  type DrawAnyPartResult,
} from "./CADDrawAnyPartOrchestratorEngine.js";

// ── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_ACCURACY_GATE = 0.70;
export const MIN_ACCURACY_GATE = 0.0;
export const MAX_ACCURACY_GATE = 1.0;

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * A single validation case. `input` is the orchestrator call; the optional
 * post-checks let the test author assert *what* the orchestrator should
 * produce beyond just "it exported".
 */
export interface ValidationTestCase {
  /** Unique case id (used in the report). */
  id: string;
  /** Human-readable description (e.g. "OD pin 0.50 +/-0.001"). */
  description: string;
  /** Orchestrator input. */
  input: DrawAnyPartInput;
  /** Optional: minimum number of operations the op-log must contain. */
  expectedOpLogMin?: number;
  /** Optional: stop reasons that mark the case as failed (e.g. "decoder-null"). */
  mustNotStopFor?: ReadonlyArray<DrawAnyPartResult["stopReason"]>;
}

export interface ValidationCaseVerdict {
  id: string;
  description: string;
  verdict: "pass" | "fail";
  /** Why it failed (or "exported" / "passed" on success). */
  reason: string;
  /** Orchestrator stop reason, or "exception" if it threw. */
  stopReason: DrawAnyPartResult["stopReason"] | "exception";
  /** Iteration count from orchestrator (0 if it threw). */
  iterations: number;
  /** True iff the orchestrator returned `exportedSuccessfully: true`. */
  exported: boolean;
  /** Error message if the orchestrator threw. */
  error?: string;
}

export interface ValidationReport {
  /** Per-case verdicts in input order. */
  cases: ValidationCaseVerdict[];
  /** Count of cases that passed. */
  passedCount: number;
  /** Count of cases that failed. */
  failedCount: number;
  /** Total cases evaluated. */
  totalCount: number;
  /** passedCount / totalCount, 0 if totalCount === 0. */
  accuracy: number;
  /** Gate threshold applied. */
  gate: number;
  /** True iff `accuracy >= gate` AND `totalCount > 0`. */
  passedGate: boolean;
  /** ISO timestamp when the harness ran. */
  ranAtIso: string;
}

export interface ValidationOptions {
  /** Accuracy gate (default 0.70, clamped [0..1]). */
  gate?: number;
  /**
   * Inject a different orchestrator (for hermetic tests). The contract is
   * the public surface of {@link cadDrawAnyPartOrchestratorEngine} — only
   * `drawAnyPart` is called.
   */
  orchestrator?: { drawAnyPart: (input: DrawAnyPartInput) => Promise<DrawAnyPartResult> };
  /** Inject the current time (for deterministic report assertions). */
  now?: () => Date;
  /** Max cases to evaluate (truncates the input array if set). */
  maxCases?: number;
}

// ── Pure helpers ─────────────────────────────────────────────────────────────

/** Clamp an accuracy gate to [0..1]; non-finite or absent → default. */
export function clampAccuracyGate(g: unknown, def = DEFAULT_ACCURACY_GATE): number {
  if (g === null || g === undefined) return def;
  const n = Number(g);
  if (!Number.isFinite(n)) return def;
  return Math.max(MIN_ACCURACY_GATE, Math.min(MAX_ACCURACY_GATE, n));
}

/**
 * Pure rubric: given a {@link DrawAnyPartResult} and the case's optional
 * post-checks, return the per-case verdict. Exported for direct testing.
 */
export function scoreCase(
  testCase: ValidationTestCase,
  result: DrawAnyPartResult,
): ValidationCaseVerdict {
  const base: Omit<ValidationCaseVerdict, "verdict" | "reason"> = {
    id: testCase.id,
    description: testCase.description,
    stopReason: result.stopReason,
    iterations: result.iterations,
    exported: result.exportedSuccessfully,
  };

  // Rule 1: orchestrator must have exported (the binary pass criterion).
  if (!result.exportedSuccessfully) {
    return {
      ...base,
      verdict: "fail",
      reason: `did not export (stopReason=${result.stopReason}, iter=${result.iterations})`,
    };
  }

  // Rule 2: forbidden stop reasons (defensive — if exported, stopReason is
  // "exported" so this branch is dead-but-harmless for the v1 rubric).
  if (testCase.mustNotStopFor && testCase.mustNotStopFor.includes(result.stopReason)) {
    return {
      ...base,
      verdict: "fail",
      reason: `forbidden stopReason=${result.stopReason}`,
    };
  }

  // Rule 3: op-log minimum length (catches "exported but only 1 op" suspicious passes).
  if (typeof testCase.expectedOpLogMin === "number" && Number.isFinite(testCase.expectedOpLogMin)) {
    const min = Math.max(0, Math.floor(testCase.expectedOpLogMin));
    if (result.opLog.length < min) {
      return {
        ...base,
        verdict: "fail",
        reason: `opLog length ${result.opLog.length} < expectedOpLogMin ${min}`,
      };
    }
  }

  return {
    ...base,
    verdict: "pass",
    reason: `exported in ${result.iterations} iter(s), ${result.opLog.length} op(s)`,
  };
}

/**
 * Build the failure-class verdict when the orchestrator throws. Pure —
 * exported for testing.
 */
export function exceptionVerdict(
  testCase: ValidationTestCase,
  err: unknown,
): ValidationCaseVerdict {
  const msg = err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string"
    ? (err as { message: string }).message
    : String(err);
  return {
    id: testCase.id,
    description: testCase.description,
    verdict: "fail",
    reason: `orchestrator threw: ${msg.slice(0, 200)}`,
    stopReason: "exception",
    iterations: 0,
    exported: false,
    error: msg.slice(0, 500),
  };
}

/**
 * Aggregate per-case verdicts into a {@link ValidationReport}. Pure.
 */
export function aggregateReport(
  cases: ValidationCaseVerdict[],
  gate: number,
  ranAtIso: string,
): ValidationReport {
  const total = cases.length;
  const passed = cases.filter(c => c.verdict === "pass").length;
  const failed = total - passed;
  const accuracy = total === 0 ? 0 : passed / total;
  return {
    cases,
    passedCount: passed,
    failedCount: failed,
    totalCount: total,
    accuracy,
    gate,
    passedGate: total > 0 && accuracy >= gate,
    ranAtIso,
  };
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class CADDrawAnyPartValidationHarnessEngine {
  /**
   * Run the validation harness against a set of test cases.
   * Throws ONLY on contract violation (non-array `cases`); per-case errors
   * are recorded as fail verdicts and never thrown.
   */
  async validate(
    cases: ReadonlyArray<ValidationTestCase>,
    opts: ValidationOptions = {},
  ): Promise<ValidationReport> {
    if (!Array.isArray(cases)) {
      throw new TypeError("validate: cases must be an array");
    }
    const gate = clampAccuracyGate(opts.gate);
    const orchestrator = opts.orchestrator ?? cadDrawAnyPartOrchestratorEngine;
    const now = opts.now ?? (() => new Date());

    // Apply maxCases cap (debug knob); preserves input order.
    const capped = typeof opts.maxCases === "number" && Number.isFinite(opts.maxCases)
      ? cases.slice(0, Math.max(0, Math.floor(opts.maxCases)))
      : cases.slice();

    const verdicts: ValidationCaseVerdict[] = [];
    for (const tc of capped) {
      if (!tc || typeof tc !== "object" || typeof tc.id !== "string" || typeof tc.description !== "string" || !tc.input) {
        // Malformed case → skip with explicit fail verdict (R12 fail-loud).
        verdicts.push({
          id: typeof tc?.id === "string" ? tc.id : "<malformed>",
          description: typeof tc?.description === "string" ? tc.description : "<malformed test case>",
          verdict: "fail",
          reason: "malformed test case (missing id/description/input)",
          stopReason: "exception",
          iterations: 0,
          exported: false,
          error: "ValidationTestCase shape invalid",
        });
        continue;
      }
      try {
        const result = await orchestrator.drawAnyPart(tc.input);
        verdicts.push(scoreCase(tc, result));
      } catch (err) {
        verdicts.push(exceptionVerdict(tc, err));
      }
    }
    return aggregateReport(verdicts, gate, now().toISOString());
  }

  /**
   * Render the report as plain-markdown for operator-readable output.
   * Pure — no I/O. Writes nothing; caller can fs.writeFile if desired.
   */
  renderMarkdown(report: ValidationReport): string {
    const lines: string[] = [];
    const pct = (report.accuracy * 100).toFixed(1);
    const gatePct = (report.gate * 100).toFixed(1);
    const verdict = report.passedGate ? "PASS" : "FAIL";
    lines.push(`# CAD-DRAW-MAX-MS1 — Validation Report`);
    lines.push("");
    lines.push(`**Verdict: ${verdict}** — accuracy ${pct}% vs gate ${gatePct}%`);
    lines.push("");
    lines.push(`- Total cases: ${report.totalCount}`);
    lines.push(`- Passed: ${report.passedCount}`);
    lines.push(`- Failed: ${report.failedCount}`);
    lines.push(`- Ran at: ${report.ranAtIso}`);
    lines.push("");
    lines.push("## Per-case verdicts");
    lines.push("");
    lines.push("| ID | Verdict | Iter | Ops | Stop | Description | Reason |");
    lines.push("|---|---|---:|---:|---|---|---|");
    for (const c of report.cases) {
      const desc = c.description.replace(/\|/g, "\\|");
      const reason = c.reason.replace(/\|/g, "\\|");
      lines.push(`| ${c.id} | ${c.verdict} | ${c.iterations} | ${c.exported ? "✓" : "✗"} | ${c.stopReason} | ${desc} | ${reason} |`);
    }
    return lines.join("\n") + "\n";
  }
}

export const cadDrawAnyPartValidationHarnessEngine = new CADDrawAnyPartValidationHarnessEngine();
