/**
 * CATIAIntegrationTestSuiteEngine.test.ts — U-CAD-APP-06 (PHASE-48)
 *
 * Exhaustive vitest coverage (≥10) of the headless CATIA CAA integration
 * suite runner. Covers: default scenario registration, driver execution,
 * per-step timeout enforcement, expected-failure bookkeeping, retry budget,
 * tag / family filtering, aggregate report with p50/p95.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CATIAIntegrationTestSuiteEngine,
  type CatiaScenarioDriver,
  type CatiaTestClock,
} from "../engines/CATIAIntegrationTestSuiteEngine.js";
import {
  CatiaScenarioSchema,
  CATIA_PART_FAMILIES,
  type CatiaScenario,
  type CatiaScenarioStep,
  type CatiaFailureMode,
} from "../schemas/cadCatiaIntegrationTestSchema.js";

function makeClock(): CatiaTestClock & { tickMs(ms: number): void } {
  let mono = 1_000_000;
  let iso = new Date("2026-04-20T00:00:00Z").getTime();
  return {
    now: () => new Date(iso).toISOString(),
    monotonicMs: () => mono,
    tickMs: (ms) => {
      mono += ms;
      iso += ms;
    },
  };
}

/**
 * Test-mode driver with per-step script: for each stepIndex the caller
 * registers an outcome, or falls back to "pass". Also ticks the injected
 * clock by `advance` ms before returning so `durationMs` is deterministic.
 */
function makeDriver(
  clock: ReturnType<typeof makeClock>,
  script: Array<{
    result: "pass" | "fail" | "skip";
    reason?: string;
    failureMode?: CatiaFailureMode;
    advance?: number;
    timedOut?: boolean;
  }> = [],
): CatiaScenarioDriver {
  let call = 0;
  return {
    runStep(step) {
      const entry = script[call++] ?? { result: "pass", advance: 1 };
      clock.tickMs(entry.advance ?? 1);
      return {
        result: entry.result,
        reason: entry.reason,
        failureMode: entry.failureMode,
        timedOut: entry.timedOut,
      };
    },
  };
}

describe("CATIAIntegrationTestSuiteEngine (U-CAD-APP-06)", () => {
  let clock: ReturnType<typeof makeClock>;
  let eng: CATIAIntegrationTestSuiteEngine;

  beforeEach(() => {
    clock = makeClock();
    eng = new CATIAIntegrationTestSuiteEngine({ clock });
  });

  describe("registry", () => {
    it("seeds one default scenario per CATIA part family (10 total)", () => {
      expect(eng.count()).toBe(CATIA_PART_FAMILIES.length);
      expect(eng.count()).toBe(10);
    });

    it("byFamily(bracket) returns exactly one default scenario", () => {
      const list = eng.byFamily("bracket");
      expect(list).toHaveLength(1);
      expect(list[0].modelName).toBe("BRACKET.CATPart");
    });

    it("byTag('smoke') returns all 10 defaults", () => {
      expect(eng.byTag("smoke")).toHaveLength(10);
    });

    it("register + unregister updates count", () => {
      const scenario = CatiaScenarioSchema.parse({
        scenarioId: "custom.bracket",
        title: "Custom bracket",
        family: "bracket",
        modelKind: "CATPart",
        modelName: "CUSTOM.CATPart",
        env: CATIAIntegrationTestSuiteEngine.defaultEnv(),
        steps: [{ kind: "load_model", args: {}, description: "load", timeoutMs: 1000 }],
      });
      eng.register(scenario);
      expect(eng.count()).toBe(11);
      expect(eng.unregister("custom.bracket")).toBe(true);
      expect(eng.count()).toBe(10);
      expect(eng.unregister("custom.bracket")).toBe(false);
    });

    it("scenarios validate family → modelKind mapping (housing → CATProduct)", () => {
      expect(eng.byFamily("housing")[0].modelKind).toBe("CATProduct");
      expect(eng.byFamily("bracket")[0].modelKind).toBe("CATPart");
    });
  });

  describe("runOne scenario execution", () => {
    it("pass status when all steps succeed", () => {
      const driver = makeDriver(clock);
      const result = eng.runOne("default.bracket", driver);
      expect(result.status).toBe("pass");
      expect(result.failureMode).toBe("none");
      expect(result.outcomes.every((o) => o.result === "pass")).toBe(true);
    });

    it("fails with driver-reported failure mode", () => {
      const driver = makeDriver(clock, [
        { result: "pass", advance: 2 },
        {
          result: "fail",
          reason: "Update diverged",
          failureMode: "update_error",
        },
      ]);
      const result = eng.runOne("default.bracket", driver);
      expect(result.status).toBe("fail");
      expect(result.failureMode).toBe("update_error");
      expect(result.reason).toBe("Update diverged");
    });

    it("short-circuits remaining steps with skip after a failure", () => {
      const driver = makeDriver(clock, [
        { result: "pass" },
        { result: "fail", reason: "x", failureMode: "update_error" },
      ]);
      const result = eng.runOne("default.bracket", driver);
      const skipped = result.outcomes.filter((o) => o.result === "skip");
      expect(skipped.length).toBeGreaterThanOrEqual(1);
      expect(skipped.every((o) => o.reason === "Earlier step failed")).toBe(
        true,
      );
    });

    it("enforces per-step timeout via excessive advance", () => {
      // Step 0 has timeoutMs=60000 by default; advance 70000.
      const driver = makeDriver(clock, [
        { result: "pass", advance: 70_000 },
      ]);
      const result = eng.runOne("default.bracket", driver);
      expect(result.status).toBe("fail");
      expect(result.failureMode).toBe("timeout");
      expect(result.outcomes[0].timedOut).toBe(true);
    });

    it("converts thrown exceptions into update_error fail", () => {
      const driver: CatiaScenarioDriver = {
        runStep(): never {
          throw new Error("daemon died");
        },
      };
      const result = eng.runOne("default.bracket", driver);
      expect(result.status).toBe("fail");
      expect(result.failureMode).toBe("update_error");
      expect(result.reason).toBe("daemon died");
    });
  });

  describe("expected-failure scenarios", () => {
    function register(failureMode: CatiaFailureMode): void {
      eng.register({
        scenarioId: `neg.${failureMode}`,
        title: `Negative ${failureMode}`,
        family: "bracket",
        modelKind: "CATPart",
        modelName: "NEG.CATPart",
        env: CATIAIntegrationTestSuiteEngine.defaultEnv(),
        expectedFeatures: [],
        steps: [
          {
            kind: "assert_update_fails",
            args: {},
            description: "should fail",
            timeoutMs: 5_000,
          },
        ],
        expectedFailure: failureMode,
        tags: ["negative"],
        maxRetries: 0,
      });
    }

    it("marks scenario as expected_failure when driver fails with matching mode", () => {
      register("knowledge_formula_error");
      const driver = makeDriver(clock, [
        {
          result: "fail",
          reason: "Bad formula",
          failureMode: "knowledge_formula_error",
        },
      ]);
      const result = eng.runOne("neg.knowledge_formula_error", driver);
      expect(result.status).toBe("expected_failure");
    });

    it("marks scenario as fail when driver fails with mismatched mode", () => {
      register("ekl_check_failed");
      const driver = makeDriver(clock, [
        { result: "fail", reason: "something else", failureMode: "io_error" },
      ]);
      const result = eng.runOne("neg.ekl_check_failed", driver);
      expect(result.status).toBe("fail");
      expect(result.reason).toMatch(/expected ekl_check_failed/);
    });

    it("marks scenario as fail when driver unexpectedly succeeds", () => {
      register("plm_transition_blocked");
      const driver = makeDriver(clock, [{ result: "pass" }]);
      const result = eng.runOne("neg.plm_transition_blocked", driver);
      expect(result.status).toBe("fail");
      expect(result.reason).toMatch(/expected to fail/);
    });
  });

  describe("retry budget", () => {
    it("retries unexpected failures up to maxRetries times", () => {
      const retryScenario: CatiaScenario = CatiaScenarioSchema.parse({
        scenarioId: "flaky.bracket",
        title: "Flaky daemon",
        family: "bracket",
        modelKind: "CATPart",
        modelName: "FLAKY.CATPart",
        env: CATIAIntegrationTestSuiteEngine.defaultEnv(),
        steps: [
          {
            kind: "load_model",
            args: {},
            description: "load",
            timeoutMs: 1_000,
          },
        ],
        maxRetries: 2,
      });
      eng.register(retryScenario);

      let attempts = 0;
      const driver: CatiaScenarioDriver = {
        runStep(): {
          result: "pass" | "fail" | "skip";
          reason?: string;
          failureMode?: CatiaFailureMode;
        } {
          attempts++;
          clock.tickMs(1);
          // Fail first two attempts, then pass.
          if (attempts < 3) {
            return {
              result: "fail",
              reason: "transient",
              failureMode: "io_error",
            };
          }
          return { result: "pass" };
        },
      };
      const result = eng.runOne("flaky.bracket", driver);
      expect(result.status).toBe("pass");
      expect(result.retryCount).toBe(2);
    });

    it("does not retry scenarios that are *expected* to fail", () => {
      eng.register({
        scenarioId: "neg.budget",
        title: "Negative with budget",
        family: "bracket",
        modelKind: "CATPart",
        modelName: "NB.CATPart",
        env: CATIAIntegrationTestSuiteEngine.defaultEnv(),
        expectedFeatures: [],
        steps: [
          {
            kind: "assert_update_fails",
            args: {},
            description: "x",
            timeoutMs: 5_000,
          },
        ],
        expectedFailure: "update_error",
        tags: ["negative"],
        maxRetries: 3,
      });
      let calls = 0;
      const driver: CatiaScenarioDriver = {
        runStep(): { result: "pass" | "fail" | "skip"; failureMode?: CatiaFailureMode } {
          calls++;
          clock.tickMs(1);
          return { result: "fail", failureMode: "update_error" };
        },
      };
      const result = eng.runOne("neg.budget", driver);
      expect(result.status).toBe("expected_failure");
      expect(result.retryCount).toBe(0);
      expect(calls).toBe(1);
    });
  });

  describe("runAll + aggregate report", () => {
    it("runs all scenarios and reports summary counts", () => {
      const driver = makeDriver(clock);
      const report = eng.runAll(driver);
      expect(report.summary.total).toBe(10);
      expect(report.summary.passed).toBe(10);
      expect(report.summary.failed).toBe(0);
      expect(report.byFamily.bracket).toBe(1);
      expect(report.byFamily.housing).toBe(1);
    });

    it("tag filter narrows the run set", () => {
      const custom: CatiaScenario = CatiaScenarioSchema.parse({
        scenarioId: "nightly.bracket",
        title: "Nightly bracket",
        family: "bracket",
        modelKind: "CATPart",
        modelName: "N.CATPart",
        env: CATIAIntegrationTestSuiteEngine.defaultEnv(),
        steps: [
          { kind: "load_model", args: {}, description: "load", timeoutMs: 1_000 },
        ],
        tags: ["nightly"],
      });
      eng.register(custom);
      const driver = makeDriver(clock);
      const report = eng.runAll(driver, { tags: ["nightly"] });
      expect(report.summary.total).toBe(1);
      expect(report.results[0].scenarioId).toBe("nightly.bracket");
    });

    it("family filter narrows the run set", () => {
      const driver = makeDriver(clock);
      const report = eng.runAll(driver, { family: "impeller" });
      expect(report.summary.total).toBe(1);
      expect(report.results[0].family).toBe("impeller");
    });

    it("computes p50 + p95 from per-scenario durations", () => {
      // Script: each scenario's 5 steps advance clock by 10ms each → 50ms per scenario.
      const driver = makeDriver(clock, []);
      // override: we want runs to have increasing duration
      let call = 0;
      const varied: CatiaScenarioDriver = {
        runStep(_step: CatiaScenarioStep): {
          result: "pass";
        } {
          // Advance increasing amounts to vary totalDurationMs
          clock.tickMs(10 * ((call++ % 5) + 1));
          return { result: "pass" };
        },
      };
      void driver;
      const report = eng.runAll(varied);
      expect(report.p50DurationMs).toBeGreaterThan(0);
      expect(report.p95DurationMs).toBeGreaterThanOrEqual(
        report.p50DurationMs,
      );
    });

    it("byStatus aggregates pass/fail/skip counts", () => {
      const driver = makeDriver(clock);
      const report = eng.runAll(driver);
      expect(report.byStatus.pass).toBe(10);
      expect(report.byStatus.fail).toBe(0);
      expect(report.byStatus.skip).toBe(0);
      expect(report.byStatus.expected_failure).toBe(0);
    });
  });

  describe("environment fixture", () => {
    it("default env declares CATIA V5-6R2021 with mmks + MD2/PR1/AS1", () => {
      const env = CATIAIntegrationTestSuiteEngine.defaultEnv();
      expect(env.catiaVersion).toBe("V5-6R2021");
      expect(env.unitSystem).toBe("mmks");
      expect(env.licenses).toEqual(["MD2", "PR1", "AS1"]);
      expect(env.envVars.CATIA_HEADLESS).toBe("1");
    });

    it("every default scenario carries the shared env fixture", () => {
      for (const s of CATIAIntegrationTestSuiteEngine.defaultScenarios()) {
        expect(s.env.envName).toBe("PRISM_CATIA_V5_6R2021");
      }
    });
  });

  describe("runOne error path", () => {
    it("throws on unknown scenario id", () => {
      const driver = makeDriver(clock);
      expect(() => eng.runOne("nonexistent", driver)).toThrow(
        /Unknown CATIA scenario/,
      );
    });
  });
});
