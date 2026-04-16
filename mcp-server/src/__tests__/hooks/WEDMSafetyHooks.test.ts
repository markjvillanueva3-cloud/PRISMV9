/**
 * WEDM Safety Hooks Tests — Phase 0.3 of WEDM AGI Roadmap
 * Tests all 16 WEDM safety hooks
 */

import { describe, it, expect } from "vitest";
import { wedmSafetyHooks } from "../../hooks/WEDMSafetyHooks.js";
import type { HookContext } from "../../engines/HookExecutor.js";

function createContext(overrides: Partial<HookContext> = {}): HookContext {
  return {
    target: { action: "", data: {} },
    session: { userId: "test-user", workflowId: "test-workflow" },
    ...overrides,
  } as HookContext;
}

describe("WEDM Safety Hooks", () => {
  describe("Hook Registry", () => {
    it("should export all 16 hooks", () => {
      expect(wedmSafetyHooks).toHaveLength(16);
    });

    it("should have unique IDs", () => {
      const ids = wedmSafetyHooks.map((h) => h.id);
      expect(new Set(ids).size).toBe(16);
    });

    it("should have required properties", () => {
      for (const hook of wedmSafetyHooks) {
        expect(hook.id).toBeDefined();
        expect(hook.name).toBeDefined();
        expect(hook.handler).toBeInstanceOf(Function);
      }
    });
  });

  describe("Blocking Hooks (6)", () => {
    const calibrationHook = wedmSafetyHooks.find((h) => h.id === "wedm-calibration-validate")!;
    const neuralHook = wedmSafetyHooks.find((h) => h.id === "wedm-neural-sanity")!;
    const gcodeHook = wedmSafetyHooks.find((h) => h.id === "wedm-gcode-injection")!;
    const taperHook = wedmSafetyHooks.find((h) => h.id === "wedm-taper-limits")!;
    const tensionHook = wedmSafetyHooks.find((h) => h.id === "wedm-tension-safety")!;

    it("calibration-validate blocks on missing fields", () => {
      const ctx = createContext({ target: { action: "wedm_feedback_submit", data: {} } });
      const result = calibrationHook.handler(ctx);
      expect(result.blocked).toBe(true);
    });

    it("calibration-validate passes valid data", () => {
      const ctx = createContext({
        target: { action: "wedm_feedback_submit", data: { programId: "O1234", material: "D2", actualRa: 0.8, actualMrr: 50 } },
      });
      expect(calibrationHook.handler(ctx).blocked).toBeFalsy();
    });

    it("neural-sanity blocks impossible Ra", () => {
      const ctx = createContext({ target: { action: "wedm_neural_predict", data: { ra_um: -1 } } });
      expect(neuralHook.handler(ctx).blocked).toBe(true);
    });

    it("gcode-injection blocks shell injection", () => {
      const ctx = createContext({ target: { action: "wedm_generate_gcode", data: { content: "G00 $(rm -rf /)" } } });
      expect(gcodeHook.handler(ctx).blocked).toBe(true);
    });

    it("taper-limits blocks angle exceeding max", () => {
      const ctx = createContext({ target: { action: "wedm_solve_taper", data: { taperAngle: 45, machineMaxTaper: 30 } } });
      expect(taperHook.handler(ctx).blocked).toBe(true);
    });

    it("tension-safety blocks unsafe tension", () => {
      const ctx = createContext({ target: { action: "wedm_set_params", data: { wireTension: 300 } } });
      expect(tensionHook.handler(ctx).blocked).toBe(true);
    });
  });

  describe("Warning Hooks (5)", () => {
    const costHook = wedmSafetyHooks.find((h) => h.id === "wedm-cost-confidence")!;
    const batchHook = wedmSafetyHooks.find((h) => h.id === "wedm-batch-deps")!;
    const oodHook = wedmSafetyHooks.find((h) => h.id === "wedm-ood-detector")!;

    it("cost-confidence warns on low confidence (mode=warning)", () => {
      const ctx = createContext({ target: { action: "wedm_estimate_cost", data: { confidence: 0.5 } } });
      const result = costHook.handler(ctx);
      expect(result.blocked).toBe(false);
      expect(result.message).toContain("below 70%");
    });

    it("batch-deps blocks circular dependencies", () => {
      const ctx = createContext({
        target: { action: "wedm_batch_run", data: { jobs: [{ id: "A", requires: ["B"] }, { id: "B", requires: ["A"] }] } },
      });
      expect(batchHook.handler(ctx).blocked).toBe(true);
    });

    it("ood-detector warns on unknown material (mode=warning)", () => {
      const ctx = createContext({ target: { action: "wedm_predict", data: { material: "Unobtainium" } } });
      const result = oodHook.handler(ctx);
      expect(result.blocked).toBe(false);
      expect(result.message).toContain("not in training distribution");
    });
  });

  describe("S(x) Safety Scoring", () => {
    const sxHook = wedmSafetyHooks.find((h) => h.id === "wedm-sx-safety")!;

    it("blocks when S(x) below 0.70", () => {
      const ctx = createContext({
        target: { action: "wedm_execute_cut", data: { parameterValidated: false, machineValidated: false } },
      });
      expect(sxHook.handler(ctx).blocked).toBe(true);
    });

    it("passes when all validations true", () => {
      const ctx = createContext({
        target: {
          action: "wedm_execute_cut",
          data: { parameterValidated: true, machineValidated: true, materialKnown: true, operatorCertified: true, programValidated: true },
        },
      });
      const result = sxHook.handler(ctx);
      expect(result.blocked).toBe(false);
    });
  });

  describe("Mode Distribution", () => {
    it("has correct mode distribution totaling 16", () => {
      const blocking = wedmSafetyHooks.filter((h) => h.mode === "blocking").length;
      const warning = wedmSafetyHooks.filter((h) => h.mode === "warning").length;
      const logging = wedmSafetyHooks.filter((h) => h.mode === "logging").length;
      expect(blocking + warning + logging).toBe(16);
    });
  });
});
