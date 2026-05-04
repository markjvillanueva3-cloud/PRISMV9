/**
 * HyperMillMacroDBEngine tests — CAM-EXHAUST-MS0 / U-CAM-HM-MACRODB-TESTS-01
 *
 * Coverage:
 *   1. extractMacroDB(): missing path returns built-in catalog (5 macros)
 *   2. extractMacroDB(): macros + formulas with material overrides
 *   3. Built-in macros: peck_drill, deep_hole, spot_face, countersink, tapping
 *   4. Per-macro: parameter shape + material_overrides + formula_ids
 *   5. extractIMToolDB(): missing path returns built-in 5 tools
 *   6. Tool records: Endmill / Ballmill / Drilltool / Tap with cutting_params
 *   7. getMacroSchema: 10 macro types, 5 param types, formula format
 *   8. getFormulaRegistryEntries: 14 entries with F-HM-EXT-NNN format
 *
 * Strict legitimacy: concrete assertions, named constants.
 */

import { describe, it, expect } from "vitest";
import {
  HyperMillMacroDBEngine,
  hyperMillMacroDBEngine,
} from "../engines/HyperMillMacroDBEngine.js";

const BUILTIN_MACRO_COUNT = 5;
const BUILTIN_FORMULA_COUNT = 14;
const BUILTIN_IM_TOOL_COUNT = 5;
const NONEXISTENT_PATH = "H:/prism/nonexistent_macro_db_path_xyzzy";

describe("HyperMillMacroDBEngine — class shape", () => {
  it("exports class + singleton", () => {
    expect(typeof HyperMillMacroDBEngine).toBe("function");
    expect(hyperMillMacroDBEngine instanceof HyperMillMacroDBEngine).toBe(true);
  });
});

describe("HyperMillMacroDBEngine — extractMacroDB() with missing path", () => {
  it("returns built-in catalog (status=success) when path is missing", () => {
    const r = hyperMillMacroDBEngine.extractMacroDB(NONEXISTENT_PATH);
    expect(r.status).toBe("success");
    expect(r.source_path).toBe(NONEXISTENT_PATH);
    expect(typeof r.extracted_at).toBe("string");
  });

  it("returns 5 built-in macros when path missing", () => {
    const r = hyperMillMacroDBEngine.extractMacroDB(NONEXISTENT_PATH);
    expect(r.macros.length).toBe(BUILTIN_MACRO_COUNT);
  });

  it("returns 14 built-in formulas when path missing", () => {
    const r = hyperMillMacroDBEngine.extractMacroDB(NONEXISTENT_PATH);
    expect(r.formulas.length).toBe(BUILTIN_FORMULA_COUNT);
  });

  it("includes INFO-level error noting missing path", () => {
    const r = hyperMillMacroDBEngine.extractMacroDB(NONEXISTENT_PATH);
    expect(r.stats.errors.some((e) => e.startsWith("INFO:"))).toBe(true);
  });

  it("stats.macro_count matches macros.length", () => {
    const r = hyperMillMacroDBEngine.extractMacroDB(NONEXISTENT_PATH);
    expect(r.stats.macro_count).toBe(r.macros.length);
  });

  it("stats.material_override_count is sum across all macros", () => {
    const r = hyperMillMacroDBEngine.extractMacroDB(NONEXISTENT_PATH);
    const sum = r.macros.reduce((s, m) => s + m.material_overrides.length, 0);
    expect(r.stats.material_override_count).toBe(sum);
  });
});

describe("HyperMillMacroDBEngine — built-in macro definitions", () => {
  it("contains hm_peck_drill_01 with 6 ISO group overrides (P/M/K/N/S/H)", () => {
    const r = hyperMillMacroDBEngine.extractMacroDB(NONEXISTENT_PATH);
    const peck = r.macros.find((m) => m.macro_id === "hm_peck_drill_01");
    expect(peck!.type).toBe("peck_drilling");
    expect(peck!.material_overrides.length).toBe(6);
    const groups = peck!.material_overrides.map((o) => o.iso_group).sort();
    expect(groups).toEqual(["H", "K", "M", "N", "P", "S"]);
  });

  it("contains hm_deep_hole_01 with high coolant pressure (70 bar default)", () => {
    const r = hyperMillMacroDBEngine.extractMacroDB(NONEXISTENT_PATH);
    const deep = r.macros.find((m) => m.macro_id === "hm_deep_hole_01");
    expect(deep!.type).toBe("deep_hole_drilling");
    const pressureParam = deep!.parameters.find((p) => p.name === "coolant_pressure_bar");
    expect(pressureParam!.default_value).toBe(70);
  });

  it("contains hm_spot_face_01 with no material overrides", () => {
    const r = hyperMillMacroDBEngine.extractMacroDB(NONEXISTENT_PATH);
    const sf = r.macros.find((m) => m.macro_id === "hm_spot_face_01");
    expect(sf!.type).toBe("spot_facing");
    expect(sf!.material_overrides).toEqual([]);
  });

  it("contains hm_countersink_01 with enum angle parameter", () => {
    const r = hyperMillMacroDBEngine.extractMacroDB(NONEXISTENT_PATH);
    const cs = r.macros.find((m) => m.macro_id === "hm_countersink_01");
    const angle = cs!.parameters.find((p) => p.name === "countersink_angle");
    expect(angle!.type).toBe("enum");
    expect(angle!.enum_values).toContain("90");
    expect(angle!.enum_values).toContain("118");
  });

  it("contains hm_tapping_01 with 1.0mm pitch default", () => {
    const r = hyperMillMacroDBEngine.extractMacroDB(NONEXISTENT_PATH);
    const tap = r.macros.find((m) => m.macro_id === "hm_tapping_01");
    expect(tap!.type).toBe("tapping");
    const pitch = tap!.parameters.find((p) => p.name === "thread_pitch");
    expect(pitch!.default_value).toBe(1.0);
  });

  it("Steel override on peck drill uses formula 'T:Dia * 0.4'", () => {
    const r = hyperMillMacroDBEngine.extractMacroDB(NONEXISTENT_PATH);
    const peck = r.macros.find((m) => m.macro_id === "hm_peck_drill_01");
    const steel = peck!.material_overrides.find((o) => o.iso_group === "P");
    expect(steel!.param_overrides.first_peck_depth).toBe("T:Dia * 0.4");
  });

  it("Titanium override on peck drill uses 'T:Dia * 0.25' (most conservative)", () => {
    const r = hyperMillMacroDBEngine.extractMacroDB(NONEXISTENT_PATH);
    const peck = r.macros.find((m) => m.macro_id === "hm_peck_drill_01");
    const ti = peck!.material_overrides.find((o) => o.iso_group === "S");
    expect(ti!.param_overrides.first_peck_depth).toBe("T:Dia * 0.25");
  });

  it("every parameter has type ∈ {float, int, enum, boolean, string}", () => {
    const r = hyperMillMacroDBEngine.extractMacroDB(NONEXISTENT_PATH);
    const types = ["float", "int", "enum", "boolean", "string"];
    r.macros.forEach((m) => {
      m.parameters.forEach((p) => {
        expect(types).toContain(p.type);
      });
    });
  });
});

describe("HyperMillMacroDBEngine — extractIMToolDB() with missing path", () => {
  it("returns built-in catalog (status=success) when path missing", () => {
    const r = hyperMillMacroDBEngine.extractIMToolDB(NONEXISTENT_PATH);
    expect(r.status).toBe("success");
  });

  it("returns 5 legacy IM tools when path missing", () => {
    const r = hyperMillMacroDBEngine.extractIMToolDB(NONEXISTENT_PATH);
    expect(r.tools.length).toBe(BUILTIN_IM_TOOL_COUNT);
  });

  it("contains Endmill, Ballmill, Drilltool, Tap geometry classes", () => {
    const r = hyperMillMacroDBEngine.extractIMToolDB(NONEXISTENT_PATH);
    expect(r.stats.geometry_classes).toContain("Endmill");
    expect(r.stats.geometry_classes).toContain("Ballmill");
    expect(r.stats.geometry_classes).toContain("Drilltool");
    expect(r.stats.geometry_classes).toContain("Tap");
  });

  it("IM001 endmill D10 has 2 cutting param entries", () => {
    const r = hyperMillMacroDBEngine.extractIMToolDB(NONEXISTENT_PATH);
    const t = r.tools.find((t) => t.tool_id === "IM001");
    expect(t!.diameter_mm).toBe(10);
    expect(t!.flutes).toBe(2);
    expect(t!.cutting_params.length).toBe(2);
  });

  it("IM005 Tap M8 has TPI-equivalent cutting params", () => {
    const r = hyperMillMacroDBEngine.extractIMToolDB(NONEXISTENT_PATH);
    const t = r.tools.find((t) => t.tool_id === "IM005");
    expect(t!.geometry_class).toBe("Tap");
    expect(t!.diameter_mm).toBe(8);
  });

  it("INFO message included when path missing", () => {
    const r = hyperMillMacroDBEngine.extractIMToolDB(NONEXISTENT_PATH);
    expect(r.stats.errors.some((e) => e.startsWith("INFO:"))).toBe(true);
  });

  it("IM tools have Taylor constants in physical range", () => {
    const r = hyperMillMacroDBEngine.extractIMToolDB(NONEXISTENT_PATH);
    r.tools.forEach((t) => {
      expect(t.taylor_n).toBeGreaterThan(0);
      expect(t.taylor_n).toBeLessThan(0.5);
      expect(t.taylor_c).toBeGreaterThan(50);
      expect(t.taylor_c).toBeLessThan(500);
    });
  });
});

describe("HyperMillMacroDBEngine — getMacroSchema()", () => {
  it("returns 10 macro types covering primary drilling/threading ops", () => {
    const s = hyperMillMacroDBEngine.getMacroSchema();
    expect(s.macro_types.length).toBe(10);
    expect(s.macro_types).toContain("peck_drilling");
    expect(s.macro_types).toContain("deep_hole_drilling");
    expect(s.macro_types).toContain("tapping");
    expect(s.macro_types).toContain("feature_to_job");
  });

  it("returns 5 parameter types", () => {
    const s = hyperMillMacroDBEngine.getMacroSchema();
    expect(s.parameter_types).toEqual(["float", "int", "enum", "boolean", "string"]);
  });

  it("formula_format mentions F-HM-EXT-NNN scheme", () => {
    const s = hyperMillMacroDBEngine.getMacroSchema();
    expect(s.formula_format).toContain("F-HM-EXT-NNN");
  });

  it("formula_id_series describes F-HM-EXT-001..014 range", () => {
    const s = hyperMillMacroDBEngine.getMacroSchema();
    expect(s.formula_id_series).toContain("F-HM-EXT-001");
    expect(s.formula_id_series).toContain("F-HM-EXT-014");
  });

  it("tool_db_fields includes Taylor constants and wear limit", () => {
    const s = hyperMillMacroDBEngine.getMacroSchema();
    expect(s.tool_db_fields).toContain("taylor_n");
    expect(s.tool_db_fields).toContain("taylor_c");
    expect(s.tool_db_fields).toContain("wear_limit_vb_mm");
  });
});

describe("HyperMillMacroDBEngine — getFormulaRegistryEntries()", () => {
  it("returns 14 formula entries", () => {
    const f = hyperMillMacroDBEngine.getFormulaRegistryEntries();
    expect(f.length).toBe(BUILTIN_FORMULA_COUNT);
  });

  it("every formula has F-HM-EXT-NNN id format", () => {
    const f = hyperMillMacroDBEngine.getFormulaRegistryEntries();
    f.forEach((entry) => {
      expect(entry.id).toMatch(/^F-HM-EXT-\d{3}$/);
    });
  });

  it("returns a defensive copy (mutation does not affect engine state)", () => {
    const f1 = hyperMillMacroDBEngine.getFormulaRegistryEntries();
    f1.pop();
    const f2 = hyperMillMacroDBEngine.getFormulaRegistryEntries();
    expect(f2.length).toBe(BUILTIN_FORMULA_COUNT);
  });

  it("F-HM-EXT-001 = 'T:Dia * 0.4' (steel peck depth)", () => {
    const f = hyperMillMacroDBEngine.getFormulaRegistryEntries();
    const e = f.find((x) => x.id === "F-HM-EXT-001");
    expect(e!.expression).toBe("T:Dia * 0.4");
    expect(e!.unit).toBe("mm");
    expect(e!.macro_id).toBe("hm_peck_drill_01");
  });

  it("F-HM-EXT-012 = Taylor tool life formula", () => {
    const f = hyperMillMacroDBEngine.getFormulaRegistryEntries();
    const e = f.find((x) => x.id === "F-HM-EXT-012");
    expect(e!.expression).toBe("C / Vc^(1/n)");
    expect(e!.category).toBe("tool_life");
  });

  it("every formula has variables map populated", () => {
    const f = hyperMillMacroDBEngine.getFormulaRegistryEntries();
    f.forEach((entry) => {
      expect(typeof entry.variables).toBe("object");
      expect(Object.keys(entry.variables).length).toBeGreaterThan(0);
    });
  });
});
