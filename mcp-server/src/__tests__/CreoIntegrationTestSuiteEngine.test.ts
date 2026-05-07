/**
 * CreoIntegrationTestSuiteEngine.test.ts — U-CAD-APP-03 (PHASE-48)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CreoIntegrationTestSuiteEngine,
  type ScenarioDriver,
  type TestClock,
} from "../engines/CreoIntegrationTestSuiteEngine.js";
import type { Scenario } from "../schemas/cadCreoIntegrationTestSchema.js";

function makeClock(): TestClock & { tickMs(ms: number): void } {
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

function happyDriver(clock: ReturnType<typeof makeClock>): ScenarioDriver {
  return {
    runStep: (_step) => {
      clock.tickMs(2);
      return { result: "pass" as const };
    },
  };
}

function flakyDriver(clock: ReturnType<typeof makeClock>, failAt: number): ScenarioDriver {
  let calls = 0;
  return {
    runStep: (_step) => {
      const cur = calls;
      calls++;
      clock.tickMs(1);
      if (cur === failAt) {
        return {
          result: "fail" as const,
          reason: "stub failure",
          failureMode: "regen_fail" as const,
        };
      }
      return { result: "pass" as const };
    },
  };
}

function throwingDriver(): ScenarioDriver {
  return {
    runStep: () => {
      throw new Error("daemon crashed");
    },
  };
}

describe("CreoIntegrationTestSuiteEngine (U-CAD-APP-03)", () => {
  let eng: CreoIntegrationTestSuiteEngine;
  let clock: ReturnType<typeof makeClock>;

  beforeEach(() => {
    clock = makeClock();
    eng = new CreoIntegrationTestSuiteEngine({ clock, seedWithDefaults: true });
  });

  describe("defaults", () => {
    it("seeds 10 scenarios — one per canonical part type", () => {
      expect(eng.count()).toBe(10);
    });

    it("byPartType filters correctly", () => {
      expect(eng.byPartType("bracket").length).toBe(1);
      expect(eng.byPartType("bracket")[0].modelName).toBe("BRACKET.PRT");
    });

    it("scenarioIds lists each default", () => {
      const ids = eng.scenarioIds();
      expect(ids).toContain("default.bracket");
      expect(ids).toContain("default.impeller");
    });
  });

  describe("runOne", () => {
    it("passes when every step passes", () => {
      const r = eng.runOne("default.bracket", happyDriver(clock));
      expect(r.status).toBe("pass");
      expect(r.outcomes.every((o) => o.result === "pass")).toBe(true);
      expect(r.failureMode).toBe("none");
    });

    it("short-circuits after fail; later steps are skipped", () => {
      const r = eng.runOne("default.bracket", flakyDriver(clock, 1));
      expect(r.status).toBe("fail");
      expect(r.outcomes[0].result).toBe("pass");
      expect(r.outcomes[1].result).toBe("fail");
      expect(r.outcomes[2].result).toBe("skip");
      expect(r.failureMode).toBe("regen_fail");
    });

    it("runtime exception becomes a fail outcome", () => {
      const r = eng.runOne("default.bracket", throwingDriver());
      expect(r.status).toBe("fail");
      expect(r.outcomes[0].reason).toMatch(/crashed/);
    });
  });

  describe("expected failure", () => {
    it("scenario with expectedFailure passes when that mode fires", () => {
      eng.register({
        scenarioId: "x.expected",
        title: "Bad regen",
        partType: "bracket",
        modelName: "BRACKET.PRT",
        expectedFeatures: ["sketch"],
        steps: [
          {
            kind: "load_model",
            args: {},
            description: "Load",
          },
          {
            kind: "assert_regen_fails",
            args: {},
            description: "Regen must fail",
          },
        ],
        expectedFailure: "regen_fail",
      });
      const r = eng.runOne("x.expected", flakyDriver(clock, 1));
      expect(r.status).toBe("expected_failure");
    });

    it("expected failure that doesn't fire is a fail", () => {
      eng.register({
        scenarioId: "x.expected2",
        title: "Bad regen 2",
        partType: "bracket",
        modelName: "BRACKET.PRT",
        expectedFeatures: [],
        steps: [
          {
            kind: "assert_regen_fails",
            args: {},
            description: "Regen must fail",
          },
        ],
        expectedFailure: "regen_fail",
      });
      const r = eng.runOne("x.expected2", happyDriver(clock));
      expect(r.status).toBe("fail");
      expect(r.reason).toMatch(/expected to fail/);
    });

    it("wrong failure mode is a fail", () => {
      eng.register({
        scenarioId: "x.expected3",
        title: "Bad mode",
        partType: "bracket",
        modelName: "BRACKET.PRT",
        expectedFeatures: [],
        steps: [
          {
            kind: "assert_regen_fails",
            args: {},
            description: "Regen must fail",
          },
        ],
        expectedFailure: "timeout",
      });
      const r = eng.runOne("x.expected3", flakyDriver(clock, 0));
      expect(r.status).toBe("fail");
      expect(r.reason).toMatch(/expected timeout/);
    });
  });

  describe("runAll + filters", () => {
    it("aggregates across all scenarios", () => {
      const report = eng.runAll(happyDriver(clock));
      expect(report.summary.total).toBe(10);
      expect(report.summary.passed).toBe(10);
      expect(report.summary.failed).toBe(0);
      expect(report.byPartType.bracket).toBe(1);
    });

    it("filter runs a subset", () => {
      const report = eng.runAll(happyDriver(clock), {
        filter: (s: Scenario) => s.partType === "gear" || s.partType === "shaft",
      });
      expect(report.summary.total).toBe(2);
    });

    it("mixed pass/fail counted correctly", () => {
      // A driver that passes scenarios 0-4 steps and then fails on the 2nd step
      // across all 10 scenarios.
      let callsInScenario = 0;
      const mixed: ScenarioDriver = {
        runStep: (_step, scenario) => {
          if (scenario.scenarioId.endsWith("gear")) {
            callsInScenario++;
            if (callsInScenario === 2) {
              callsInScenario = 0;
              return { result: "fail", reason: "gear boom", failureMode: "regen_fail" };
            }
          }
          return { result: "pass" };
        },
      };
      const report = eng.runAll(mixed);
      expect(report.summary.failed).toBeGreaterThanOrEqual(1);
      expect(report.summary.passed).toBeLessThan(10);
    });
  });

  describe("register", () => {
    it("overwrites an existing scenario id", () => {
      const custom: Scenario = {
        scenarioId: "default.bracket",
        title: "Custom bracket",
        partType: "bracket",
        modelName: "CUSTOM.PRT",
        expectedFeatures: [],
        steps: [{ kind: "save", args: {}, description: "just save" }],
        expectedFailure: "none",
      };
      eng.register(custom);
      expect(eng.byPartType("bracket")[0].title).toBe("Custom bracket");
    });
  });
});
