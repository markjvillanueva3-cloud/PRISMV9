/**
 * WEDMAwarenessAdoptionEngine tests — MS-P0.5-COORD U-P0.5-COORD-01
 */
import { describe, it, expect, beforeEach } from "vitest";
import { wedmAwarenessAdoptionEngine } from "../engines/WEDMAwarenessAdoptionEngine.js";
import { wedmCoordinationHooks } from "../hooks/WEDMCoordinationHooks.js";

describe("WEDMAwarenessAdoptionEngine", () => {
  beforeEach(() => {
    wedmAwarenessAdoptionEngine.resetForTests();
  });

  describe("extractKeywords", () => {
    it("splits action names on underscores", () => {
      const kw = wedmAwarenessAdoptionEngine.extractKeywords("wedm_neural_reason");
      expect(kw).toEqual(expect.arrayContaining(["wedm", "neural", "reason"]));
    });

    it("filters stopwords", () => {
      const kw = wedmAwarenessAdoptionEngine.extractKeywords("wedm_get_status");
      expect(kw).not.toContain("get");
      expect(kw).not.toContain("status");
      expect(kw).toContain("wedm");
    });

    it("includes string param values", () => {
      const kw = wedmAwarenessAdoptionEngine.extractKeywords("wedm_solve", { material: "D2", wire: "brass" });
      expect(kw).toContain("d2");
      expect(kw).toContain("brass");
    });

    it("caps at 6 keywords", () => {
      const kw = wedmAwarenessAdoptionEngine.extractKeywords(
        "wedm_a_b_c_d_e_f_g_h",
        { material: "Ti6Al4V" },
      );
      expect(kw.length).toBeLessThanOrEqual(6);
    });
  });

  describe("isWedmAction", () => {
    it("returns true for all actions on edm dispatcher", () => {
      expect(wedmAwarenessAdoptionEngine.isWedmAction("edm", "anything")).toBe(true);
      expect(wedmAwarenessAdoptionEngine.isWedmAction("prism_edm", "xyz")).toBe(true);
    });

    it("uses registered filter when available", () => {
      wedmAwarenessAdoptionEngine.registerDispatcher({
        dispatcher: "cam",
        actions: ["toolpath_generate", "edm_wire_program"],
        wedmActionFilter: (a) => a.includes("edm"),
      });
      expect(wedmAwarenessAdoptionEngine.isWedmAction("cam", "edm_wire_program")).toBe(true);
      expect(wedmAwarenessAdoptionEngine.isWedmAction("cam", "toolpath_generate")).toBe(false);
    });

    it("recognizes wedm keywords on unregistered dispatchers", () => {
      expect(wedmAwarenessAdoptionEngine.isWedmAction("other", "wedm_foo")).toBe(true);
      expect(wedmAwarenessAdoptionEngine.isWedmAction("other", "wire_edm_program")).toBe(true);
      expect(wedmAwarenessAdoptionEngine.isWedmAction("other", "random_action")).toBe(false);
    });
  });

  describe("recordAdoption + coverage", () => {
    it("tracks coverage across registered dispatchers", () => {
      wedmAwarenessAdoptionEngine.registerDispatcher({
        dispatcher: "edm",
        actions: ["wire_settings", "wedm_calc", "electrode_design"],
      });

      const empty = wedmAwarenessAdoptionEngine.getCoverageSummary();
      expect(empty.coveragePct).toBe(0);
      expect(empty.totalActions).toBe(3);

      wedmAwarenessAdoptionEngine.recordAdoption({
        dispatcher: "edm", action: "wire_settings", latencyMs: 12, cached: false, ok: true,
      });
      wedmAwarenessAdoptionEngine.recordAdoption({
        dispatcher: "edm", action: "wedm_calc", latencyMs: 8, cached: true, ok: true,
      });

      const partial = wedmAwarenessAdoptionEngine.getCoverageSummary();
      expect(partial.coveredActions).toBe(2);
      expect(partial.totalActions).toBe(3);
      expect(partial.coveragePct).toBeGreaterThan(60);
      expect(partial.coveragePct).toBeLessThan(70);

      wedmAwarenessAdoptionEngine.recordAdoption({
        dispatcher: "edm", action: "electrode_design", latencyMs: 5, cached: true, ok: true,
      });
      const full = wedmAwarenessAdoptionEngine.getCoverageSummary();
      expect(full.coveragePct).toBe(100);
      expect(full.wiredDispatchers).toBe(1);
    });

    it("flags budget breach on non-cached >50ms calls", () => {
      wedmAwarenessAdoptionEngine.registerDispatcher({
        dispatcher: "edm",
        actions: ["slow_action"],
      });
      wedmAwarenessAdoptionEngine.recordAdoption({
        dispatcher: "edm", action: "slow_action", latencyMs: 120, cached: false, ok: true,
      });
      const s = wedmAwarenessAdoptionEngine.getCoverageSummary();
      expect(s.budgetBreaches).toBe(1);
    });

    it("does not flag breach on cached calls even if slow", () => {
      wedmAwarenessAdoptionEngine.registerDispatcher({
        dispatcher: "edm",
        actions: ["cached_action"],
      });
      wedmAwarenessAdoptionEngine.recordAdoption({
        dispatcher: "edm", action: "cached_action", latencyMs: 200, cached: true, ok: true,
      });
      const s = wedmAwarenessAdoptionEngine.getCoverageSummary();
      expect(s.budgetBreaches).toBe(0);
    });

    it("respects wedmActionFilter when computing coverage", () => {
      wedmAwarenessAdoptionEngine.registerDispatcher({
        dispatcher: "cam",
        actions: ["toolpath_generate", "edm_wire_program", "edm_sinker_program", "mill_calc"],
        wedmActionFilter: (a) => a.includes("edm"),
      });
      const empty = wedmAwarenessAdoptionEngine.getCoverageSummary();
      expect(empty.totalActions).toBe(2);

      wedmAwarenessAdoptionEngine.recordAdoption({
        dispatcher: "cam", action: "edm_wire_program", latencyMs: 10, cached: false, ok: true,
      });
      wedmAwarenessAdoptionEngine.recordAdoption({
        dispatcher: "cam", action: "toolpath_generate", latencyMs: 10, cached: false, ok: true,
      });
      const s = wedmAwarenessAdoptionEngine.getCoverageSummary();
      expect(s.coveredActions).toBe(1);
      expect(s.totalActions).toBe(2);
    });
  });

  describe("wedm-awareness-coverage hook", () => {
    const hook = wedmCoordinationHooks.find(h => h.id === "wedm-awareness-coverage");

    it("is registered", () => {
      expect(hook).toBeDefined();
      expect(hook?.mode).toBe("blocking");
      expect(hook?.category).toBe("validation");
    });

    it("returns success on cold start (no actions registered)", () => {
      const result = hook!.handler({} as any);
      expect(result.success).toBe(true);
      expect(result.blocked).toBeFalsy();
    });

    it("blocks on structural bypass — dispatcher registered but never invoked consultAwareness", () => {
      // Dispatcher A is actively wired
      wedmAwarenessAdoptionEngine.registerDispatcher({
        dispatcher: "edm",
        actions: ["a"],
      });
      wedmAwarenessAdoptionEngine.recordAdoption({
        dispatcher: "edm", action: "a", latencyMs: 5, cached: false, ok: true,
      });
      // Dispatcher B registered but middleware never wired — silent = structural bypass
      wedmAwarenessAdoptionEngine.registerDispatcher({
        dispatcher: "cam",
        actions: ["wedm_silent_action"],
        wedmActionFilter: (a) => a.includes("wedm"),
      });
      const result = hook!.handler({} as any);
      expect(result.blocked).toBe(true);
      expect(result.message).toContain("cam");
    });

    it("passes on 100% coverage", () => {
      wedmAwarenessAdoptionEngine.registerDispatcher({
        dispatcher: "edm",
        actions: ["a", "b"],
      });
      wedmAwarenessAdoptionEngine.recordAdoption({
        dispatcher: "edm", action: "a", latencyMs: 5, cached: false, ok: true,
      });
      wedmAwarenessAdoptionEngine.recordAdoption({
        dispatcher: "edm", action: "b", latencyMs: 5, cached: false, ok: true,
      });
      const result = hook!.handler({} as any);
      expect(result.success).toBe(true);
      expect(result.blocked).toBeFalsy();
    });
  });
});
