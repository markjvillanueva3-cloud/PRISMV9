// WIRE-EXEMPT: integration-test harness (runs scenario suites -> TestReport), not an MCP dispatcher action.
/**
 * CreoIntegrationTestSuiteEngine — U-CAD-APP-03 (PHASE-48)
 *
 * Headless Creo integration fixture runner. Holds a registry of scenarios
 * (one default per canonical part type) and executes each step via an
 * injected ScenarioDriver. Emits ScenarioResult + aggregated TestReport.
 *
 * A scenario marked `expectedFailure: "regen_fail"` (etc.) passes when the
 * corresponding failure mode occurs and fails if the scenario unexpectedly
 * succeeds — this catches regression-by-accident where a bug that was
 * supposed to throw stops throwing.
 *
 * @module engines/CreoIntegrationTestSuiteEngine
 */

import {
  ScenarioSchema,
  ScenarioResultSchema,
  TestReportSchema,
  CREO_PART_TYPES,
  type Scenario,
  type ScenarioStep,
  type ScenarioResult,
  type TestReport,
  type CreoFailureMode,
  type StepOutcome,
  type CreoPartType,
} from "../schemas/cadCreoIntegrationTestSchema.js";

export interface TestClock {
  now(): string;
  monotonicMs(): number;
}

export interface ScenarioDriver {
  /**
   * Execute a single step and return the outcome. Drivers are free to
   * short-circuit the remaining steps by returning `fail`. Runtime
   * exceptions must be caught and reported as `fail`.
   */
  runStep(step: ScenarioStep, scenario: Scenario): {
    result: "pass" | "fail" | "skip";
    reason?: string;
    failureMode?: CreoFailureMode;
  };
}

export class CreoIntegrationTestSuiteEngine {
  private scenarios = new Map<string, Scenario>();
  private clock: TestClock;

  constructor(opts: { clock?: TestClock; seedWithDefaults?: boolean } = {}) {
    this.clock = opts.clock ?? defaultClock();
    if (opts.seedWithDefaults ?? true) {
      for (const s of CreoIntegrationTestSuiteEngine.defaultScenarios()) {
        this.register(s);
      }
    }
  }

  register(scenario: Scenario): Scenario {
    const parsed = ScenarioSchema.parse(scenario);
    this.scenarios.set(parsed.scenarioId, parsed);
    return parsed;
  }

  count(): number {
    return this.scenarios.size;
  }

  scenarioIds(): string[] {
    return [...this.scenarios.keys()];
  }

  byPartType(pt: CreoPartType): Scenario[] {
    return [...this.scenarios.values()].filter((s) => s.partType === pt);
  }

  runOne(scenarioId: string, driver: ScenarioDriver): ScenarioResult {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) throw new Error(`Unknown scenario ${scenarioId}`);
    return this.executeScenario(scenario, driver);
  }

  runAll(driver: ScenarioDriver, opts: { filter?: (s: Scenario) => boolean } = {}): TestReport {
    const started = this.clock.monotonicMs();
    const startedAt = this.clock.now();
    const all = [...this.scenarios.values()].filter(opts.filter ?? (() => true));
    const results: ScenarioResult[] = all.map((s) => this.executeScenario(s, driver));
    const summary = {
      total: results.length,
      passed: results.filter((r) => r.status === "pass").length,
      failed: results.filter((r) => r.status === "fail").length,
      skipped: results.filter((r) => r.status === "skip").length,
      expectedFailures: results.filter((r) => r.status === "expected_failure").length,
    };
    const byPartType: Partial<Record<CreoPartType, number>> = {};
    for (const r of results) {
      byPartType[r.partType] = (byPartType[r.partType] ?? 0) + 1;
    }
    return TestReportSchema.parse({
      reportId: `rep-${started}`,
      startedAt,
      endedAt: this.clock.now(),
      results,
      summary,
      byPartType,
    });
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private executeScenario(scenario: Scenario, driver: ScenarioDriver): ScenarioResult {
    const t0 = this.clock.monotonicMs();
    const outcomes: StepOutcome[] = [];
    let failureMode: CreoFailureMode = "none";
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
        });
        continue;
      }
      const stepStart = this.clock.monotonicMs();
      let outcome: ReturnType<ScenarioDriver["runStep"]>;
      try {
        outcome = driver.runStep(step, scenario);
      } catch (err) {
        outcome = {
          result: "fail",
          reason: err instanceof Error ? err.message : String(err),
          failureMode: "regen_fail",
        };
      }
      const durationMs = this.clock.monotonicMs() - stepStart;
      outcomes.push({
        stepIndex: i,
        description: step.description,
        result: outcome.result,
        reason: outcome.reason,
        durationMs,
      });
      if (outcome.result === "fail") {
        shortCircuited = true;
        failureMode = outcome.failureMode ?? "regen_fail";
        firstFailReason = outcome.reason;
      }
    }

    const totalDurationMs = this.clock.monotonicMs() - t0;
    const hasFailure = outcomes.some((o) => o.result === "fail");
    const hasSkipOnly = outcomes.length > 0 && outcomes.every((o) => o.result === "skip");
    let status: ScenarioResult["status"];
    if (hasSkipOnly) {
      status = "skip";
    } else if (scenario.expectedFailure !== "none") {
      if (hasFailure && failureMode === scenario.expectedFailure) {
        status = "expected_failure";
      } else if (!hasFailure) {
        status = "fail";
        firstFailReason = `Scenario was expected to fail with ${scenario.expectedFailure} but did not`;
        failureMode = "none";
      } else {
        status = "fail";
        firstFailReason = `Scenario failed with ${failureMode} but expected ${scenario.expectedFailure}`;
      }
    } else {
      status = hasFailure ? "fail" : "pass";
    }

    return ScenarioResultSchema.parse({
      scenarioId: scenario.scenarioId,
      partType: scenario.partType,
      status,
      outcomes,
      totalDurationMs,
      failureMode: status === "pass" || status === "skip" ? "none" : failureMode,
      reason: firstFailReason,
    });
  }

  // ── Default scenarios ─────────────────────────────────────────────────────

  static defaultScenarios(): Scenario[] {
    return CREO_PART_TYPES.map((partType) =>
      ScenarioSchema.parse({
        scenarioId: `default.${partType}`,
        title: `Default ${partType} smoke test`,
        partType,
        modelName: `${partType.toUpperCase()}.PRT`,
        expectedFeatures: ["sketch", "extrude"],
        steps: [
          {
            kind: "load_model",
            args: {},
            description: `Load ${partType} model`,
          },
          {
            kind: "assert_regen_succeeds",
            args: {},
            description: `Regenerate ${partType}`,
          },
          {
            kind: "assert_feature_count",
            args: { min: 2 },
            description: `${partType} has at least 2 features`,
          },
          {
            kind: "save",
            args: {},
            description: `Save ${partType}`,
          },
        ],
        expectedFailure: "none",
      }),
    );
  }
}

function defaultClock(): TestClock {
  return {
    now: () => new Date().toISOString(),
    monotonicMs: () => Date.now(),
  };
}

export const creoIntegrationTestSuiteEngine = new CreoIntegrationTestSuiteEngine();
