/**
 * CATIAIntegrationTestSuiteEngine — U-CAD-APP-06 (PHASE-48)
 *
 * Headless CAA-batch CATIA integration fixture runner. Holds a registry of
 * scenarios (one default per canonical part family — 10 total) and executes
 * each step through an injected ScenarioDriver. The driver may be backed by
 * an in-memory stub for CI or a real `CATStart.exe -env <env> -direnv <dir>
 * /batch` process for regression runs.
 *
 * Adds, beyond the Creo variant (U-CAD-APP-03):
 *   - CATIA env fixtures (version / locale / unit system / licenses)
 *   - Per-step timeout with `timedOut` propagation
 *   - Scenario retry budget
 *   - Full negative-test bookkeeping across every CATIA failure mode
 *     (update_error, constraint_over_defined, knowledge_formula_error,
 *      ekl_check_failed, plm_transition_blocked, license_unavailable …)
 *   - Tag-based filtering ("smoke", "nightly", "ekl", "plm", …)
 *   - p50 / p95 duration in the aggregate report
 *
 * @module engines/CATIAIntegrationTestSuiteEngine
 */

import {
  CatiaScenarioSchema,
  CatiaScenarioResultSchema,
  CatiaTestReportSchema,
  CATIA_PART_FAMILIES,
  CATIA_FAMILY_DEFAULT_KIND,
  type CatiaScenario,
  type CatiaScenarioStep,
  type CatiaScenarioResult,
  type CatiaTestReport,
  type CatiaFailureMode,
  type CatiaStepOutcome,
  type CatiaPartFamily,
  type CatiaEnvFixture,
  type CatiaScenarioStatus,
} from "../schemas/cadCatiaIntegrationTestSchema.js";

export interface CatiaTestClock {
  now(): string;
  monotonicMs(): number;
}

export interface CatiaScenarioDriver {
  /**
   * Execute a single step and return the outcome. Drivers must translate
   * thrown exceptions into `{ result: "fail", reason, failureMode }` rather
   * than bubbling.
   */
  runStep(
    step: CatiaScenarioStep,
    scenario: CatiaScenario,
  ): {
    result: "pass" | "fail" | "skip";
    reason?: string;
    failureMode?: CatiaFailureMode;
    timedOut?: boolean;
  };
}

export class CATIAIntegrationTestSuiteEngine {
  private scenarios = new Map<string, CatiaScenario>();
  private clock: CatiaTestClock;

  constructor(
    opts: { clock?: CatiaTestClock; seedWithDefaults?: boolean } = {},
  ) {
    this.clock = opts.clock ?? defaultClock();
    if (opts.seedWithDefaults ?? true) {
      for (const s of CATIAIntegrationTestSuiteEngine.defaultScenarios()) {
        this.register(s);
      }
    }
  }

  // ── Registry ──────────────────────────────────────────────────────────────

  register(scenario: CatiaScenario): CatiaScenario {
    const parsed = CatiaScenarioSchema.parse(scenario);
    this.scenarios.set(parsed.scenarioId, parsed);
    return parsed;
  }

  unregister(scenarioId: string): boolean {
    return this.scenarios.delete(scenarioId);
  }

  count(): number {
    return this.scenarios.size;
  }

  scenarioIds(): string[] {
    return [...this.scenarios.keys()];
  }

  byFamily(family: CatiaPartFamily): CatiaScenario[] {
    return [...this.scenarios.values()].filter((s) => s.family === family);
  }

  byTag(tag: string): CatiaScenario[] {
    return [...this.scenarios.values()].filter((s) => s.tags.includes(tag));
  }

  // ── Run ───────────────────────────────────────────────────────────────────

  runOne(scenarioId: string, driver: CatiaScenarioDriver): CatiaScenarioResult {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) throw new Error(`Unknown CATIA scenario: ${scenarioId}`);
    return this.executeWithRetries(scenario, driver);
  }

  runAll(
    driver: CatiaScenarioDriver,
    opts: {
      filter?: (s: CatiaScenario) => boolean;
      tags?: string[];
      family?: CatiaPartFamily;
    } = {},
  ): CatiaTestReport {
    const started = this.clock.monotonicMs();
    const startedAt = this.clock.now();

    const filters: Array<(s: CatiaScenario) => boolean> = [];
    if (opts.filter) filters.push(opts.filter);
    if (opts.tags && opts.tags.length > 0) {
      filters.push((s) => opts.tags!.some((t) => s.tags.includes(t)));
    }
    if (opts.family) filters.push((s) => s.family === opts.family);

    const all = [...this.scenarios.values()].filter((s) =>
      filters.every((f) => f(s)),
    );

    const results = all.map((s) => this.executeWithRetries(s, driver));

    const summary = {
      total: results.length,
      passed: results.filter((r) => r.status === "pass").length,
      failed: results.filter((r) => r.status === "fail").length,
      skipped: results.filter((r) => r.status === "skip").length,
      expectedFailures: results.filter((r) => r.status === "expected_failure")
        .length,
    };

    const byFamily: Partial<Record<CatiaPartFamily, number>> = {};
    for (const r of results) {
      byFamily[r.family] = (byFamily[r.family] ?? 0) + 1;
    }
    const byStatus: Record<CatiaScenarioStatus, number> = {
      pass: summary.passed,
      fail: summary.failed,
      skip: summary.skipped,
      expected_failure: summary.expectedFailures,
    };

    const durations = results
      .map((r) => r.totalDurationMs)
      .sort((a, b) => a - b);
    const p50 = percentile(durations, 0.5);
    const p95 = percentile(durations, 0.95);

    return CatiaTestReportSchema.parse({
      reportId: `catia-rep-${started}`,
      startedAt,
      endedAt: this.clock.now(),
      results,
      summary,
      byFamily,
      byStatus,
      p50DurationMs: p50,
      p95DurationMs: p95,
    });
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private executeWithRetries(
    scenario: CatiaScenario,
    driver: CatiaScenarioDriver,
  ): CatiaScenarioResult {
    let result = this.executeScenario(scenario, driver);
    let retries = 0;
    // Retry only if scenario *unexpectedly* failed and budget remains.
    while (
      result.status === "fail" &&
      scenario.expectedFailure === "none" &&
      retries < scenario.maxRetries
    ) {
      retries++;
      result = this.executeScenario(scenario, driver);
    }
    return { ...result, retryCount: retries };
  }

  private executeScenario(
    scenario: CatiaScenario,
    driver: CatiaScenarioDriver,
  ): CatiaScenarioResult {
    const t0 = this.clock.monotonicMs();
    const outcomes: CatiaStepOutcome[] = [];
    let failureMode: CatiaFailureMode = "none";
    let firstFailReason: string | undefined;
    let shortCircuited = false;

    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i]!;
      if (shortCircuited) {
        outcomes.push({
          stepIndex: i,
          description: step.description,
          result: "skip",
          reason: "Earlier step failed",
          durationMs: 0,
          timedOut: false,
        });
        continue;
      }
      const stepStart = this.clock.monotonicMs();
      let outcome: ReturnType<CatiaScenarioDriver["runStep"]>;
      try {
        outcome = driver.runStep(step, scenario);
      } catch (err) {
        outcome = {
          result: "fail",
          reason: err instanceof Error ? err.message : String(err),
          failureMode: "update_error",
        };
      }
      const durationMs = this.clock.monotonicMs() - stepStart;
      const timedOutInferred =
        outcome.timedOut === true || durationMs > step.timeoutMs;
      const resolvedResult: "pass" | "fail" | "skip" = timedOutInferred
        ? "fail"
        : outcome.result;
      const resolvedFailureMode: CatiaFailureMode | undefined = timedOutInferred
        ? "timeout"
        : outcome.failureMode;
      outcomes.push({
        stepIndex: i,
        description: step.description,
        result: resolvedResult,
        reason:
          resolvedResult === "fail" && timedOutInferred
            ? `Step exceeded timeout ${step.timeoutMs}ms`
            : outcome.reason,
        durationMs,
        timedOut: timedOutInferred,
      });
      if (resolvedResult === "fail") {
        shortCircuited = true;
        failureMode = resolvedFailureMode ?? "update_error";
        firstFailReason =
          timedOutInferred
            ? `Step exceeded timeout ${step.timeoutMs}ms`
            : outcome.reason;
      }
    }

    const totalDurationMs = this.clock.monotonicMs() - t0;
    const hasFailure = outcomes.some((o) => o.result === "fail");
    const hasSkipOnly =
      outcomes.length > 0 && outcomes.every((o) => o.result === "skip");

    let status: CatiaScenarioStatus;
    if (hasSkipOnly) {
      status = "skip";
    } else if (scenario.expectedFailure !== "none") {
      if (hasFailure && failureMode === scenario.expectedFailure) {
        status = "expected_failure";
      } else if (!hasFailure) {
        status = "fail";
        firstFailReason = `Scenario expected to fail with ${scenario.expectedFailure} but did not`;
        failureMode = "none";
      } else {
        status = "fail";
        firstFailReason = `Scenario failed with ${failureMode} but expected ${scenario.expectedFailure}`;
      }
    } else {
      status = hasFailure ? "fail" : "pass";
    }

    return CatiaScenarioResultSchema.parse({
      scenarioId: scenario.scenarioId,
      family: scenario.family,
      modelKind: scenario.modelKind,
      status,
      outcomes,
      totalDurationMs,
      failureMode:
        status === "pass" || status === "skip" ? "none" : failureMode,
      reason: firstFailReason,
      retryCount: 0,
    });
  }

  // ── Default scenarios (one per CATIA family = 10) ─────────────────────────

  static defaultEnv(): CatiaEnvFixture {
    return {
      envName: "PRISM_CATIA_V5_6R2021",
      envDir: "C:/ProgramData/DassaultSystemes/CATEnv",
      catiaVersion: "V5-6R2021",
      locale: "en_US",
      unitSystem: "mmks",
      licenses: ["MD2", "PR1", "AS1"],
      envVars: {
        CNEXT_ERROR_LEVEL: "WARN",
        CATIA_HEADLESS: "1",
      },
    };
  }

  static defaultScenarios(): CatiaScenario[] {
    return CATIA_PART_FAMILIES.map((family) =>
      CatiaScenarioSchema.parse({
        scenarioId: `default.${family}`,
        title: `Default ${family} CAA smoke test`,
        family,
        modelKind: CATIA_FAMILY_DEFAULT_KIND[family],
        modelName: `${family.toUpperCase()}.${CATIA_FAMILY_DEFAULT_KIND[family]}`,
        expectedFeatures: ["Sketch", "Pad"],
        env: CATIAIntegrationTestSuiteEngine.defaultEnv(),
        steps: [
          {
            kind: "load_model",
            args: {},
            description: `Load ${family} model`,
            timeoutMs: 60_000,
          },
          {
            kind: "assert_update_succeeds",
            args: {},
            description: `Update ${family}`,
            timeoutMs: 90_000,
          },
          {
            kind: "assert_feature_count",
            args: { min: 2 },
            description: `${family} has at least 2 features`,
            timeoutMs: 5_000,
          },
          {
            kind: "run_ekl_relation",
            args: { relation: "CheckMinLength" },
            description: `Run EKL CheckMinLength on ${family}`,
            timeoutMs: 10_000,
          },
          {
            kind: "save",
            args: {},
            description: `Save ${family}`,
            timeoutMs: 30_000,
          },
        ],
        expectedFailure: "none",
        tags: ["smoke", "default"],
        maxRetries: 0,
      }),
    );
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function percentile(sortedAsc: readonly number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.max(0, Math.ceil(sortedAsc.length * p) - 1),
  );
  return sortedAsc[idx] ?? 0;
}

function defaultClock(): CatiaTestClock {
  return {
    now: () => new Date().toISOString(),
    monotonicMs: () => Date.now(),
  };
}

export const catiaIntegrationTestSuiteEngine =
  new CATIAIntegrationTestSuiteEngine();
