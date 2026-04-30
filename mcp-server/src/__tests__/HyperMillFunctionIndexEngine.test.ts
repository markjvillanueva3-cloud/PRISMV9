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

  describe("CAM-EXHAUST-MS3-01 integrity restoration", () => {
    it("modules array contains exactly the 9 expected module ids in registration order", () => {
      const idx = HyperMillFunctionIndexEngine.getIndex();
      const ids = idx.modules.map((m) => m.module_id);
      expect(ids).toEqual([
        "tool_database",
        "stock_fixture",
        "simulation",
        "automation_center",
        "post_processor",
        "drilling",
        "5axis",
        "millturn",
        "maxx",
      ]);
    });

    it("drilling entry resolves to drilling-operations.json with 476 params and tool_database dep", () => {
      const idx = HyperMillFunctionIndexEngine.getIndex();
      const entry = idx.modules.find((m) => m.module_id === "drilling");
      if (!entry) throw new Error("drilling entry missing");
      expect(entry.path).toBe("cam-functions/hypermill/drilling-operations.json");
      expect(entry.parameter_count_estimate).toBe(476);
      expect(entry.covered_units).toEqual(["U-CAM06"]);
      expect(entry.dependencies).toEqual(["tool_database"]);
    });

    it("5axis entry resolves to 5axis-operations.json with 512 params and dual dep", () => {
      const idx = HyperMillFunctionIndexEngine.getIndex();
      const entry = idx.modules.find((m) => m.module_id === "5axis");
      if (!entry) throw new Error("5axis entry missing");
      expect(entry.path).toBe("cam-functions/hypermill/5axis-operations.json");
      expect(entry.parameter_count_estimate).toBe(512);
      expect(entry.dependencies).toEqual(["tool_database", "stock_fixture"]);
    });

    it("millturn entry resolves to turning-operations.json with 179 params (file-vs-module-id mismatch documented)", () => {
      const idx = HyperMillFunctionIndexEngine.getIndex();
      const entry = idx.modules.find((m) => m.module_id === "millturn");
      if (!entry) throw new Error("millturn entry missing");
      expect(entry.path).toBe("cam-functions/hypermill/turning-operations.json");
      expect(entry.parameter_count_estimate).toBe(179);
    });

    it("maxx entry resolves to maxx-machining.json with 156 params (hyperMILL-unique signature module)", () => {
      const idx = HyperMillFunctionIndexEngine.getIndex();
      const entry = idx.modules.find((m) => m.module_id === "maxx");
      if (!entry) throw new Error("maxx entry missing");
      expect(entry.path).toBe("cam-functions/hypermill/maxx-machining.json");
      expect(entry.parameter_count_estimate).toBe(156);
    });

    it("drilling catalog loads from disk with v2.0.0 schema and total_parameters=476 at top level", () => {
      const mod = HyperMillFunctionIndexEngine.getModule("drilling");
      if (!mod) throw new Error("drilling catalog failed to load");
      const raw = mod as unknown as { schema_version: string; system_id: string; total_parameters: number };
      expect(raw.schema_version).toBe("2.0.0");
      expect(raw.system_id).toBe("hypermill");
      expect(raw.total_parameters).toBe(476);
    });

    it("5axis catalog loads with v1-nested shape: system_id=hypermill, module.module_id=5axis, 512 params, 15 ops", () => {
      const mod = HyperMillFunctionIndexEngine.getModule("5axis");
      if (!mod) throw new Error("5axis catalog failed to load");
      const raw = mod as unknown as {
        system_id: string;
        module: { module_id: string; total_parameters: number; total_operations: number };
      };
      expect(raw.system_id).toBe("hypermill");
      expect(raw.module.module_id).toBe("5axis");
      expect(raw.module.total_parameters).toBe(512);
      expect(raw.module.total_operations).toBe(15);
    });

    it("millturn catalog loads with internal module_id=millturn, 179 params, 10 ops", () => {
      const mod = HyperMillFunctionIndexEngine.getModule("millturn");
      if (!mod) throw new Error("millturn catalog failed to load");
      const raw = mod as unknown as {
        module: { module_id: string; total_parameters: number; total_operations: number };
      };
      expect(raw.module.module_id).toBe("millturn");
      expect(raw.module.total_parameters).toBe(179);
      expect(raw.module.total_operations).toBe(10);
    });

    it("maxx catalog loads with internal module_id=maxx, 156 params, 3 ops", () => {
      const mod = HyperMillFunctionIndexEngine.getModule("maxx");
      if (!mod) throw new Error("maxx catalog failed to load");
      const raw = mod as unknown as {
        module: { module_id: string; total_parameters: number; total_operations: number };
      };
      expect(raw.module.module_id).toBe("maxx");
      expect(raw.module.total_parameters).toBe(156);
      expect(raw.module.total_operations).toBe(3);
    });

    it("loading drilling+5axis+millturn+maxx produces zero load errors", () => {
      HyperMillFunctionIndexEngine.getModule("drilling");
      HyperMillFunctionIndexEngine.getModule("5axis");
      HyperMillFunctionIndexEngine.getModule("millturn");
      HyperMillFunctionIndexEngine.getModule("maxx");
      expect(HyperMillFunctionIndexEngine.getLoadErrors()).toHaveLength(0);
    });

    it("coverage_summary.total_modules equals 9 and matches modules.length exactly", () => {
      const idx = HyperMillFunctionIndexEngine.getIndex();
      expect(idx.coverage_summary.total_modules).toBe(9);
      expect(idx.coverage_summary.total_modules).toBe(idx.modules.length);
    });

    it("coverage_summary.estimated_parameter_total equals 1446 and matches sum of per-entry estimates", () => {
      const idx = HyperMillFunctionIndexEngine.getIndex();
      expect(idx.coverage_summary.estimated_parameter_total).toBe(1446);
      const sumFromEntries = idx.modules.reduce(
        (acc, m) => acc + (m.parameter_count_estimate ?? 0),
        0,
      );
      expect(sumFromEntries).toBe(1446);
    });

    it("covered_units list contains exactly the 7 expected unit tags in canonical order", () => {
      const idx = HyperMillFunctionIndexEngine.getIndex();
      expect(idx.coverage_summary.total_units_covered).toEqual([
        "U-CAM06",
        "U-CAM08",
        "U-CAM09",
        "U-CAM10",
        "U-CAM11",
        "U-CAM12",
        "U-CAM-MS3-01",
      ]);
    });

    it("drilling resolveDependencies returns tool_database before drilling and reports no cycle warning", () => {
      const result = HyperMillFunctionIndexEngine.resolveDependencies("drilling");
      expect(result.value).toEqual(["tool_database", "drilling"]);
      expect(result.module_count).toBe(2);
      expect(result.warning ?? "no_warning").toBe("no_warning");
    });

    it("5axis resolveDependencies puts tool_database AND stock_fixture before 5axis", () => {
      const result = HyperMillFunctionIndexEngine.resolveDependencies("5axis");
      expect(result.value).toEqual(["tool_database", "stock_fixture", "5axis"]);
      expect(result.module_count).toBe(3);
    });
  });
});
