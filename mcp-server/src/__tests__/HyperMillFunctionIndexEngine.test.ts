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

    it("drilling catalog raw JSON has v2.0.0 schema and total_parameters=476 at top level", () => {
      const raw = HyperMillFunctionIndexEngine.getModuleRaw("drilling");
      if (!raw) throw new Error("drilling raw catalog failed to load");
      const r = raw as { schema_version: string; system_id: string; total_parameters: number };
      expect(r.schema_version).toBe("2.0.0");
      expect(r.system_id).toBe("hypermill");
      expect(r.total_parameters).toBe(476);
    });

    it("5axis catalog raw JSON has v1-nested shape: system_id=hypermill, module.module_id=5axis, 512 params, 15 ops", () => {
      const raw = HyperMillFunctionIndexEngine.getModuleRaw("5axis");
      if (!raw) throw new Error("5axis raw catalog failed to load");
      const r = raw as {
        system_id: string;
        module: { module_id: string; total_parameters: number; total_operations: number };
      };
      expect(r.system_id).toBe("hypermill");
      expect(r.module.module_id).toBe("5axis");
      expect(r.module.total_parameters).toBe(512);
      expect(r.module.total_operations).toBe(15);
    });

    it("millturn catalog raw JSON has internal module_id=millturn, 179 params, 10 ops", () => {
      const raw = HyperMillFunctionIndexEngine.getModuleRaw("millturn");
      if (!raw) throw new Error("millturn raw catalog failed to load");
      const r = raw as {
        module: { module_id: string; total_parameters: number; total_operations: number };
      };
      expect(r.module.module_id).toBe("millturn");
      expect(r.module.total_parameters).toBe(179);
      expect(r.module.total_operations).toBe(10);
    });

    it("maxx catalog raw JSON has internal module_id=maxx, 156 params, 3 ops", () => {
      const raw = HyperMillFunctionIndexEngine.getModuleRaw("maxx");
      if (!raw) throw new Error("maxx raw catalog failed to load");
      const r = raw as {
        module: { module_id: string; total_parameters: number; total_operations: number };
      };
      expect(r.module.module_id).toBe("maxx");
      expect(r.module.total_parameters).toBe(156);
      expect(r.module.total_operations).toBe(3);
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

  describe("CAM-EXHAUST-MS3-02 schema normalization adapter", () => {
    it("detectCatalogShape classifies tool_database as v1_menus", () => {
      const raw = HyperMillFunctionIndexEngine.getModuleRaw("tool_database");
      expect(HyperMillFunctionIndexEngine.detectCatalogShape(raw)).toBe("v1_menus");
    });

    it("detectCatalogShape classifies 5axis/millturn/maxx as v1_nested_module", () => {
      const fiveAxis = HyperMillFunctionIndexEngine.getModuleRaw("5axis");
      const millturn = HyperMillFunctionIndexEngine.getModuleRaw("millturn");
      const maxx = HyperMillFunctionIndexEngine.getModuleRaw("maxx");
      expect(HyperMillFunctionIndexEngine.detectCatalogShape(fiveAxis)).toBe("v1_nested_module");
      expect(HyperMillFunctionIndexEngine.detectCatalogShape(millturn)).toBe("v1_nested_module");
      expect(HyperMillFunctionIndexEngine.detectCatalogShape(maxx)).toBe("v1_nested_module");
    });

    it("detectCatalogShape classifies drilling as v2_categories", () => {
      const raw = HyperMillFunctionIndexEngine.getModuleRaw("drilling");
      expect(HyperMillFunctionIndexEngine.detectCatalogShape(raw)).toBe("v2_categories");
    });

    it("detectCatalogShape returns 'unknown' for non-catalog input", () => {
      expect(HyperMillFunctionIndexEngine.detectCatalogShape({})).toBe("unknown");
      expect(HyperMillFunctionIndexEngine.detectCatalogShape(null)).toBe("unknown");
      expect(HyperMillFunctionIndexEngine.detectCatalogShape("not an object")).toBe("unknown");
    });

    it("getModule on 5axis returns normalized canonical shape (top-level module_id, menus[], parameter_count)", () => {
      const mod = HyperMillFunctionIndexEngine.getModule("5axis");
      if (!mod) throw new Error("5axis normalized load failed");
      expect(mod.module_id).toBe("5axis");
      expect(mod.system_id).toBe("hypermill");
      expect(mod.parameter_count).toBe(512);
      expect(mod.menus.length).toBe(15);
    });

    it("getModule on millturn returns 10 menus (one per turning operation)", () => {
      const mod = HyperMillFunctionIndexEngine.getModule("millturn");
      if (!mod) throw new Error("millturn normalized load failed");
      expect(mod.module_id).toBe("millturn");
      expect(mod.parameter_count).toBe(179);
      expect(mod.menus.length).toBe(10);
    });

    it("getModule on maxx returns 3 menus (Finishing, Roughing, Pre-Finishing)", () => {
      const mod = HyperMillFunctionIndexEngine.getModule("maxx");
      if (!mod) throw new Error("maxx normalized load failed");
      expect(mod.module_id).toBe("maxx");
      expect(mod.parameter_count).toBe(156);
      expect(mod.menus.length).toBe(3);
      expect(mod.menus[0].id).toBe("maxx_finishing");
    });

    it("getModule on drilling returns shared menu + 15 drilling cycles + 8 probing cycles = 24 menus", () => {
      const mod = HyperMillFunctionIndexEngine.getModule("drilling");
      if (!mod) throw new Error("drilling normalized load failed");
      expect(mod.module_id).toBe("drilling_operations");
      expect(mod.parameter_count).toBe(476);
      expect(mod.menus.length).toBe(24);
      expect(mod.menus[0].id).toBe("_shared");
    });

    it("findParameter('SRFRES') now penetrates the 5axis v1-nested catalog", () => {
      const found = HyperMillFunctionIndexEngine.findParameter("SRFRES");
      if (!found) throw new Error("SRFRES not located after normalization");
      expect(found.module_id).toBe("5axis");
      expect(found.menu_id).toBe("5ax_swarf_cutting");
      expect(found.parameter.name).toBe("Surface Resolution");
      expect(found.parameter.value.type).toBe("formula");
      expect(found.parameter.value.default_value).toBe("mtol");
    });

    it("findParameter('BARREL_RADIUS') penetrates the maxx v1-nested catalog (maxx-unique barrel-cutter param)", () => {
      const found = HyperMillFunctionIndexEngine.findParameter("BARREL_RADIUS");
      if (!found) throw new Error("BARREL_RADIUS not located after normalization");
      expect(found.module_id).toBe("maxx");
      expect(found.parameter.name).toBe("Barrel Radius");
      expect(found.parameter.value.type).toBe("number");
      expect(found.parameter.value.unit).toBe("mm");
    });

    it("findParameter('TCUTTINGSPEED') penetrates the millturn v1-nested catalog", () => {
      const found = HyperMillFunctionIndexEngine.findParameter("TCUTTINGSPEED");
      if (!found) throw new Error("TCUTTINGSPEED not located after normalization");
      expect(found.module_id).toBe("millturn");
      expect(found.menu_id).toBe("turn_roughing");
      expect(found.parameter.name).toBe("Cutting Speed");
      expect(found.parameter.value.unit).toBe("m/min");
    });

    it("findParameter('spindle_speed') penetrates the v2 drilling catalog and lands in the _shared menu", () => {
      const found = HyperMillFunctionIndexEngine.findParameter("spindle_speed");
      if (!found) throw new Error("spindle_speed not located after normalization");
      expect(found.module_id).toBe("drilling");
      expect(found.menu_id).toBe("_shared");
      expect(found.parameter.value.type).toBe("number");
      expect(found.parameter.value.unit).toBe("rpm");
      expect(found.parameter.value.constraints).toEqual({ min: 1, max: 60000 });
    });

    it("findParameter('spot_angle') lands in the spot_drill cycle of v2 drilling with enum constraints", () => {
      const found = HyperMillFunctionIndexEngine.findParameter("spot_angle");
      if (!found) throw new Error("spot_angle not located after normalization");
      expect(found.module_id).toBe("drilling");
      expect(found.menu_id).toBe("spot_drill");
      expect(found.parameter.value.type).toBe("enum");
      expect(found.parameter.value.constraints).toEqual({
        enum_values: ["60", "90", "118", "120", "140"],
      });
    });

    it("totalParameterCount aggregates to exactly 1446 across all 9 normalized modules", () => {
      const result = HyperMillFunctionIndexEngine.totalParameterCount();
      expect(result.value).toBe(1446);
      expect(result.module_count).toBe(9);
      expect(result.source).toBe("hypermill_function_index");
    });

    it("getTribalTipsBySource('shop_floor') now finds drilling-cycle tips after normalization", () => {
      const tips = HyperMillFunctionIndexEngine.getTribalTipsBySource("shop_floor");
      const drillingTip = tips.find((t) => t.id === "hm-drill-tip-001");
      if (!drillingTip) throw new Error("hm-drill-tip-001 not found after normalization");
      expect(drillingTip.text).toContain("118° spot angle");
      expect(drillingTip.confidence).toBe(0.95);
    });

    it("getTribalTipsBySource('controller_manual') finds drilling G73/G83 tip via cycle-level normalization", () => {
      const tips = HyperMillFunctionIndexEngine.getTribalTipsBySource("controller_manual");
      const tip = tips.find((t) => t.id === "hm-drill-tip-004");
      if (!tip) throw new Error("hm-drill-tip-004 not found after normalization");
      expect(tip.text).toContain("G73");
      expect(tip.confidence).toBe(0.98);
    });

    it("backward compat: existing v1_menus tool_database queries still work unchanged", () => {
      const found = HyperMillFunctionIndexEngine.findParameter("cutting_speed_vc");
      if (!found) throw new Error("v1 backward compat broken: cutting_speed_vc not found");
      expect(found.module_id).toBe("tool_database");
      expect(found.parameter.value.unit).toBe("m_per_min");
    });

    it("backward compat: tool_database parameter_count still equals 39 (v1_menus passthrough)", () => {
      const mod = HyperMillFunctionIndexEngine.getModule("tool_database");
      if (!mod) throw new Error("tool_database failed to load");
      expect(mod.parameter_count).toBe(39);
    });

    it("getModuleRaw returns null for unknown module_id (no throw, no load error)", () => {
      const raw = HyperMillFunctionIndexEngine.getModuleRaw("nonexistent_module");
      expect(raw).toBeNull();
      expect(HyperMillFunctionIndexEngine.getLoadErrors()).toHaveLength(0);
    });
  });
});
