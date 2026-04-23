/**
 * HyperMillFunctionIndexEngine — Tests
 * CAM-EXHAUST-MS0 U-CAM13: Unified hyperMILL function/parameter index.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { HyperMillFunctionIndexEngine } from "../engines/HyperMillFunctionIndexEngine.js";

describe("HyperMillFunctionIndexEngine", () => {
  beforeEach(() => {
    HyperMillFunctionIndexEngine.resetCache();
  });

  describe("getIndex()", () => {
    it("loads the function-index.json without throwing", () => {
      const idx = HyperMillFunctionIndexEngine.getIndex();
      expect(idx.schema_version).toBe("1.0.0");
      expect(idx.system_id).toBe("hypermill");
      expect(idx.module_id).toBe("function_index");
    });

    it("declares at least the 6 PHASE-1-completion modules (U-CAM08..U-CAM13)", () => {
      const ids = HyperMillFunctionIndexEngine.listModules();
      for (const required of [
        "tool_database",
        "stock_fixture",
        "simulation",
        "automation_center",
        "post_processor",
      ]) {
        expect(ids).toContain(required);
      }
    });

    it("caches the index (second read returns the same object identity)", () => {
      const a = HyperMillFunctionIndexEngine.getIndex();
      const b = HyperMillFunctionIndexEngine.getIndex();
      expect(a).toBe(b);
    });
  });

  describe("getModule()", () => {
    it("loads tool_database with known parameter count 39", () => {
      const mod = HyperMillFunctionIndexEngine.getModule("tool_database");
      expect(mod).not.toBeNull();
      expect(mod!.parameter_count).toBe(39);
      expect(mod!.module_id).toBe("tool_database");
    });

    it("returns null for an unknown module_id (no throw, no load error)", () => {
      const mod = HyperMillFunctionIndexEngine.getModule("nonexistent_module");
      expect(mod).toBeNull();
      expect(HyperMillFunctionIndexEngine.getLoadErrors()).toHaveLength(0);
    });

    it("caches individual module loads (second call returns same reference)", () => {
      const a = HyperMillFunctionIndexEngine.getModule("simulation");
      const b = HyperMillFunctionIndexEngine.getModule("simulation");
      expect(a).toBe(b);
    });
  });

  describe("findParameter()", () => {
    it("locates 'cutting_speed_vc' inside tool_database cutting data table", () => {
      const found = HyperMillFunctionIndexEngine.findParameter("cutting_speed_vc");
      expect(found).not.toBeNull();
      expect(found!.module_id).toBe("tool_database");
      expect(found!.parameter.value.unit).toBe("m_per_min");
    });

    it("locates 'overhang' in tool_database holder assembly", () => {
      const found = HyperMillFunctionIndexEngine.findParameter("overhang");
      expect(found).not.toBeNull();
      expect(found!.module_id).toBe("tool_database");
      expect(found!.menu_id).toBe("tool_holder");
    });

    it("returns null for an unknown parameter id", () => {
      const found = HyperMillFunctionIndexEngine.findParameter("not_a_real_parameter");
      expect(found).toBeNull();
    });
  });

  describe("getParametersByFormula()", () => {
    it("returns at least one Kienzle-linked parameter from tool_database", () => {
      const hits = HyperMillFunctionIndexEngine.getParametersByFormula("KIENZLE_FORCE");
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.some((h) => h.module_id === "tool_database")).toBe(true);
    });

    it("returns TAYLOR_TOOL_LIFE inputs from tool_database wear limits", () => {
      const hits = HyperMillFunctionIndexEngine.getParametersByFormula("TAYLOR_TOOL_LIFE");
      expect(hits.length).toBeGreaterThan(0);
      const vb = hits.find((h) => h.parameter.id === "flank_wear_limit_vb");
      expect(vb).toBeDefined();
    });

    it("returns an empty array for an unknown formula id", () => {
      const hits = HyperMillFunctionIndexEngine.getParametersByFormula("NO_SUCH_FORMULA");
      expect(hits).toHaveLength(0);
    });
  });

  describe("getParametersByDispatcher()", () => {
    it("finds prism_cam-bound parameters across modules", () => {
      const hits = HyperMillFunctionIndexEngine.getParametersByDispatcher("prism_cam");
      expect(hits.length).toBeGreaterThan(0);
    });

    it("finds prism_safety-bound parameters (workholding / gate scoring)", () => {
      const hits = HyperMillFunctionIndexEngine.getParametersByDispatcher("prism_safety");
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.some((h) => h.parameter.id === "clamping_force_n")).toBe(true);
    });
  });

  describe("getTribalTipsBySource()", () => {
    it("returns JM Die shop-floor-derived tips", () => {
      const tips = HyperMillFunctionIndexEngine.getTribalTipsBySource("jm_die");
      expect(tips.length).toBeGreaterThan(0);
      for (const tip of tips) {
        expect(tip.confidence).toBeGreaterThan(0);
        expect(tip.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("returns Open Mind documentation-derived tips", () => {
      const tips = HyperMillFunctionIndexEngine.getTribalTipsBySource("open_mind_docs");
      expect(tips.length).toBeGreaterThan(0);
    });

    it("returns [] for an unknown tribal-knowledge source", () => {
      const tips = HyperMillFunctionIndexEngine.getTribalTipsBySource("unknown_source_xyz");
      expect(tips).toHaveLength(0);
    });
  });

  describe("resolveDependencies()", () => {
    it("puts dependencies before the module itself (topological order)", () => {
      const result = HyperMillFunctionIndexEngine.resolveDependencies("simulation");
      const order = result.value;
      expect(order[order.length - 1]).toBe("simulation");
      // tool_database and stock_fixture must appear before "simulation"
      const sim = order.indexOf("simulation");
      expect(order.indexOf("tool_database")).toBeLessThan(sim);
      expect(order.indexOf("stock_fixture")).toBeLessThan(sim);
      expect(result.warning).toBeUndefined();
    });

    it("returns a single-element closure for a leaf module (no deps)", () => {
      const result = HyperMillFunctionIndexEngine.resolveDependencies("tool_database");
      expect(result.value).toEqual(["tool_database"]);
      expect(result.module_count).toBe(1);
    });

    it("returns an empty closure for an unknown module", () => {
      const result = HyperMillFunctionIndexEngine.resolveDependencies("no_such_module");
      expect(result.value).toHaveLength(0);
    });
  });

  describe("totalParameterCount()", () => {
    it("aggregates a positive parameter count across modules", () => {
      const result = HyperMillFunctionIndexEngine.totalParameterCount();
      expect(result.value).toBeGreaterThan(100);
      expect(result.module_count).toBeGreaterThan(0);
      expect(result.source).toBe("hypermill_function_index");
    });
  });
});
