/**
 * simulate-change-wiring.test.ts — PP-0.18-SKILL-SIMULATE-CHANGE
 *
 * Verifies that PredictiveWorldSimulatorEngine is reachable through
 * aiReasoningDispatcher and that the signal-aggregation math matches
 * what the `/simulate-change` skill promises (kind multipliers, critical +
 * public-api bumps, dependent cap, missing-test penalty, risk tiers).
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  predictiveWorldSimulatorEngine,
  DEFAULT_SIMULATOR_WEIGHTS,
} from "../engines/PredictiveWorldSimulatorEngine.js";

const DISPATCHER_PATH = path.join(__dirname, "..", "tools", "dispatchers", "aiReasoningDispatcher.ts");

describe("/simulate-change skill wiring (PP-0.18)", () => {
  const dispatcherSrc = fs.readFileSync(DISPATCHER_PATH, "utf8");

  describe("dispatcher z.enum + switch wires the action", () => {
    it("z.enum declares predictive_world_simulate", () => {
      expect(dispatcherSrc).toContain('"predictive_world_simulate"');
    });
    it("switch has case 'predictive_world_simulate'", () => {
      expect(dispatcherSrc).toContain('case "predictive_world_simulate"');
    });
  });

  describe("engine singleton contract", () => {
    it("exposes simulate()", () => {
      expect(typeof predictiveWorldSimulatorEngine.simulate).toBe("function");
    });

    it("low-risk: small leaf edit with tests returns risk='low'", () => {
      const r = predictiveWorldSimulatorEngine.simulate({
        path: "src/engines/LeafEngine.ts",
        kind: "edit",
        sizeDeltaLines: 20,
        testFiles: ["src/__tests__/LeafEngine.test.ts"],
      });
      expect(r.risk).toBe("low");
      expect(r.breakProbability).toBeLessThan(0.2);
      expect(r.recommendation).toMatch(/low risk/);
    });

    it("high-risk: critical + public API + 12 deps + no tests returns risk='high'", () => {
      const r = predictiveWorldSimulatorEngine.simulate({
        path: "src/physics/constants.ts",
        kind: "edit",
        criticalFile: true,
        touchesPublicApi: true,
        sizeDeltaLines: 150,
        dependents: Array.from({ length: 12 }, (_, i) => `file${i}.ts`),
      });
      expect(r.risk).toBe("high");
      expect(r.breakProbability).toBeGreaterThanOrEqual(0.5);
      expect(r.warnings).toContain("touches critical-classified file");
      expect(r.warnings).toContain("touches public API surface");
      expect(r.warnings).toContain("no tests found for this path");
    });

    it("dependent boost is capped at dependentCap", () => {
      const hugeDeps = predictiveWorldSimulatorEngine.simulate({
        path: "a.ts",
        kind: "edit",
        dependents: Array.from({ length: 1000 }, (_, i) => `d${i}.ts`),
        testFiles: ["t.ts"],
      });
      const w = DEFAULT_SIMULATOR_WEIGHTS;
      // baseline 0.05 + capped dep boost, * edit multiplier 1, then rounded
      const expectedMax = (0.05 + w.dependentCap) * w.kindMultipliers.edit;
      expect(hugeDeps.breakProbability).toBeLessThanOrEqual(expectedMax + 0.0001);
    });

    it("likelyAffected lists tests first then deps, deduped, capped at 10", () => {
      const r = predictiveWorldSimulatorEngine.simulate({
        path: "a.ts",
        kind: "edit",
        testFiles: ["t1.ts", "t2.ts", "shared.ts"],
        dependents: ["shared.ts", "d1.ts", "d2.ts", "d3.ts", "d4.ts", "d5.ts", "d6.ts", "d7.ts", "d8.ts", "d9.ts", "d10.ts"],
      });
      expect(r.likelyAffected.length).toBe(10);
      expect(r.likelyAffected[0]).toBe("t1.ts");
      expect(r.likelyAffected[1]).toBe("t2.ts");
      expect(r.likelyAffected[2]).toBe("shared.ts");
      // Dedup: shared.ts appears in both, only once
      expect(r.likelyAffected.filter((p) => p === "shared.ts").length).toBe(1);
    });

    it("delete kind doesn't charge missing-tests penalty", () => {
      const del = predictiveWorldSimulatorEngine.simulate({
        path: "orphan.ts",
        kind: "delete",
        sizeDeltaLines: 50,
      });
      expect(del.warnings).not.toContain("no tests found for this path");
    });

    it("large-delta penalty fires over 100 lines", () => {
      const small = predictiveWorldSimulatorEngine.simulate({
        path: "a.ts", kind: "edit", sizeDeltaLines: 80, testFiles: ["t.ts"],
      });
      const big = predictiveWorldSimulatorEngine.simulate({
        path: "a.ts", kind: "edit", sizeDeltaLines: 400, testFiles: ["t.ts"],
      });
      expect(big.breakProbability).toBeGreaterThan(small.breakProbability);
      expect(big.warnings.some((w) => w.includes("large delta"))).toBe(true);
    });

    it("kind multipliers change the final probability", () => {
      const base = { path: "a.ts", criticalFile: true, testFiles: ["t.ts"] } as const;
      const del = predictiveWorldSimulatorEngine.simulate({ ...base, kind: "delete" });
      const wr = predictiveWorldSimulatorEngine.simulate({ ...base, kind: "write" });
      // delete multiplier 1.2 > write multiplier 0.8
      expect(del.breakProbability).toBeGreaterThan(wr.breakProbability);
    });

    it("probability is clamped to [0, 1]", () => {
      const r = predictiveWorldSimulatorEngine.simulate({
        path: "a.ts",
        kind: "delete",
        criticalFile: true,
        touchesPublicApi: true,
        sizeDeltaLines: 10000,
        dependents: Array.from({ length: 10000 }, (_, i) => `d${i}.ts`),
      });
      expect(r.breakProbability).toBeLessThanOrEqual(1);
      expect(r.breakProbability).toBeGreaterThanOrEqual(0);
    });

    it("rejects malformed change descriptors", () => {
      expect(() => predictiveWorldSimulatorEngine.simulate({ path: "", kind: "edit" } as any)).toThrow();
      expect(() => predictiveWorldSimulatorEngine.simulate({ path: "a.ts", kind: "nope" } as any)).toThrow();
      expect(() =>
        predictiveWorldSimulatorEngine.simulate({ path: "a.ts", kind: "edit", sizeDeltaLines: -5 } as any),
      ).toThrow();
    });
  });

  describe("skill file is present and well-formed", () => {
    const candidates = [
      path.join("H:", ".claude", "commands", "simulate-change.md"),
      path.join("h:", ".claude", "commands", "simulate-change.md"),
      "/h/.claude/commands/simulate-change.md",
    ];
    const skillPath = candidates.find((p) => fs.existsSync(p));

    it("skill file exists on H: drive", () => {
      expect(skillPath).toBeDefined();
    });

    it("skill frontmatter declares engine + action", () => {
      if (!skillPath) return;
      const body = fs.readFileSync(skillPath, "utf8");
      expect(body).toContain("name: simulate-change");
      expect(body).toContain("PredictiveWorldSimulatorEngine");
      expect(body).toContain("predictive_world_simulate");
    });
  });
});
