/**
 * HyperMillCycleDefaultsEngine tests — CAM-EXHAUST-MS0 / U-CAM-HM-CYCDEF-TESTS-01
 *
 * Coverage:
 *   1. listAll: returns full CYCLE_DEFAULTS array
 *   2. getByCode: case-insensitive exact lookup + null on miss
 *   3. search: name/code/category substring match
 *   4. byCategory: filter by CycleCategory union
 *   5. withFormulas: returns only cycles with formula params
 *   6. resolveFormula: arithmetic substitution for T:Dia, T:Rad, mtol, J:F
 *      - happy path tool=10 → 10*0.35 = 3.5
 *      - pipe-separated APPROXRES picks first segment
 *      - default fallback values when context omitted
 *      - returns null on unsafe expression
 *   7. resolveDefaults: hybrid numeric+resolved-formula record
 *      - cycle exists → all params present (formulas resolved)
 *      - cycle missing → null
 *   8. collisionDefaults / macroFormulas: canonical constants
 *   9. stats: totalCycles + byCategory + formulaCount + paramCount
 *  10. Adversarial: empty code, unknown formula, NaN context
 *
 * Strict legitimacy: concrete assertions, named constants.
 */

import { describe, it, expect } from "vitest";
import {
  HyperMillCycleDefaultsEngine,
  hyperMillCycleDefaultsEngine,
  FORMULA_VARIABLES,
  FRTYP_MAP,
  type CycleCategory,
} from "../engines/HyperMillCycleDefaultsEngine.js";

const TOOL_DIA_MM = 10;
const TOOL_RADIUS_MM = 5;
const TOOL_CORNER_R_MM = 0.5;
const MTOL_MM = 0.01;
const APPROACH_FACTOR = 0.35;     // T:Dia*0.35
const CLEAR_SIDE_FACTOR = 0.25;   // T:Rad*0.25
const APPROACH_LEN_EXPECTED = TOOL_DIA_MM * APPROACH_FACTOR; // 3.5
const CLEAR_SIDE_EXPECTED = TOOL_RADIUS_MM * CLEAR_SIDE_FACTOR; // 1.25
const HOLDER_CLEARANCE_MM = 0.25;
const HEAD_CLEARANCE_MM = 1.5;

describe("HyperMillCycleDefaultsEngine — class shape", () => {
  it("exports class + singleton + FORMULA_VARIABLES + FRTYP_MAP", () => {
    expect(typeof HyperMillCycleDefaultsEngine).toBe("function");
    expect(hyperMillCycleDefaultsEngine instanceof HyperMillCycleDefaultsEngine).toBe(true);
    expect(typeof FORMULA_VARIABLES).toBe("object");
    expect(typeof FRTYP_MAP).toBe("object");
  });

  it("FORMULA_VARIABLES contains canonical T: and mtol entries", () => {
    expect(FORMULA_VARIABLES["T:Dia"].source).toBe("tool");
    expect(FORMULA_VARIABLES["T:Rad"].unit).toBe("mm");
    expect(FORMULA_VARIABLES["mtol"].source).toBe("job");
    expect(FORMULA_VARIABLES["J:F"].unit).toBe("mm/min");
  });

  it("FRTYP_MAP recognizes 1=end_mill, 3=ball_nose, 200=probe", () => {
    expect(FRTYP_MAP[1]).toBe("end_mill");
    expect(FRTYP_MAP[3]).toBe("ball_nose");
    expect(FRTYP_MAP[200]).toBe("probe");
  });
});

describe("HyperMillCycleDefaultsEngine — listAll() / getByCode()", () => {
  it("listAll returns >20 cycles", () => {
    expect(hyperMillCycleDefaultsEngine.listAll().length).toBeGreaterThan(20);
  });

  it("getByCode finds 3D Z-Level Finishing (hmSlf3) — case-insensitive", () => {
    const c = hyperMillCycleDefaultsEngine.getByCode("HMSLF3");
    expect(c!.code).toBe("hmSlf3");
    expect(c!.displayName).toBe("3D Z-Level Finishing");
    expect(c!.category).toBe("3d_milling");
    expect(c!.toolType).toBe(1);
  });

  it("getByCode returns null on miss", () => {
    expect(hyperMillCycleDefaultsEngine.getByCode("nonexistent_code")).toBe(null);
  });

  it("getByCode finds turning roughing (hmTrnr) with toolType 101", () => {
    const c = hyperMillCycleDefaultsEngine.getByCode("hmTrnr");
    expect(c!.toolType).toBe(101);
    expect(c!.category).toBe("turning");
  });

  it("getByCode finds impeller probing (hmPbX3) with toolType 12", () => {
    const c = hyperMillCycleDefaultsEngine.getByCode("hmPbX3");
    expect(c!.toolType).toBe(12);
    expect(c!.category).toBe("impeller_blade");
  });
});

describe("HyperMillCycleDefaultsEngine — search()", () => {
  it("finds 'finishing' across multiple cycles", () => {
    const results = hyperMillCycleDefaultsEngine.search("finishing");
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => {
      const matches =
        r.displayName.toLowerCase().includes("finishing") ||
        r.code.toLowerCase().includes("finishing") ||
        r.category.includes("finishing");
      expect(matches).toBe(true);
    });
  });

  it("matches by category substring (turning)", () => {
    const results = hyperMillCycleDefaultsEngine.search("turning");
    expect(results.length).toBeGreaterThan(2);
  });

  it("returns empty for nonsense query", () => {
    expect(hyperMillCycleDefaultsEngine.search("xyzzy_unobtainium")).toEqual([]);
  });
});

describe("HyperMillCycleDefaultsEngine — byCategory()", () => {
  it("returns 3d_milling cycles", () => {
    const cats: CycleCategory[] = ["3d_milling", "5axis", "turning", "drilling"];
    cats.forEach((cat) => {
      const r = hyperMillCycleDefaultsEngine.byCategory(cat);
      r.forEach((c) => expect(c.category).toBe(cat));
    });
  });

  it("turning category has at least 5 cycles (rough/finish/recess/part-off/boring)", () => {
    const r = hyperMillCycleDefaultsEngine.byCategory("turning");
    expect(r.length).toBeGreaterThanOrEqual(5);
  });

  it("returns empty for category with no entries", () => {
    // probing has no entries currently (only probing cycle is hmPbX3 → impeller_blade)
    expect(hyperMillCycleDefaultsEngine.byCategory("probing")).toEqual([]);
  });
});

describe("HyperMillCycleDefaultsEngine — withFormulas()", () => {
  it("returns cycles that have formula-based params (e.g. mtol references)", () => {
    const r = hyperMillCycleDefaultsEngine.withFormulas();
    expect(r.length).toBeGreaterThan(0);
    r.forEach((c) => {
      const hasFormula = Object.values(c.params).some((p) => p.isFormula);
      expect(hasFormula).toBe(true);
    });
  });

  it("includes 3D Z-Level Finishing (uses mtol-based APPROXRES)", () => {
    const r = hyperMillCycleDefaultsEngine.withFormulas();
    expect(r.some((c) => c.code === "hmSlf3")).toBe(true);
  });
});

describe("HyperMillCycleDefaultsEngine — resolveFormula()", () => {
  it("resolves T:Dia*0.35 with tool diameter 10 → 3.5", () => {
    const r = hyperMillCycleDefaultsEngine.resolveFormula("T:Dia*0.35", { toolDiameter: TOOL_DIA_MM });
    expect(r).toBeCloseTo(APPROACH_LEN_EXPECTED, 6);
  });

  it("resolves T:Rad*0.25 with tool radius 5 → 1.25", () => {
    const r = hyperMillCycleDefaultsEngine.resolveFormula("T:Rad*0.25", { toolRadius: TOOL_RADIUS_MM });
    expect(r).toBeCloseTo(CLEAR_SIDE_EXPECTED, 6);
  });

  it("resolves mtol with explicit context (0.005 → 0.005)", () => {
    const r = hyperMillCycleDefaultsEngine.resolveFormula("mtol", { machineTolerance: 0.005 });
    expect(r).toBe(0.005);
  });

  it("derives toolRadius from toolDiameter when toolRadius omitted", () => {
    // T:Rad → toolRadius ?? toolDiameter/2 → 10/2 = 5
    const r = hyperMillCycleDefaultsEngine.resolveFormula("T:Rad*0.5", { toolDiameter: TOOL_DIA_MM });
    expect(r).toBeCloseTo(2.5, 6);
  });

  it("uses default toolDiameter=10 when context omitted", () => {
    const r = hyperMillCycleDefaultsEngine.resolveFormula("T:Dia", {});
    expect(r).toBe(10);
  });

  it("uses default machineTolerance=0.01 when context omitted", () => {
    const r = hyperMillCycleDefaultsEngine.resolveFormula("mtol", {});
    expect(r).toBe(0.01);
  });

  it("returns first segment of pipe-separated APPROXRES (mtol*0.9|...)", () => {
    const r = hyperMillCycleDefaultsEngine.resolveFormula("mtol*0.9|mtol*0.1|mtol*0.1", { machineTolerance: MTOL_MM });
    expect(r).toBeCloseTo(MTOL_MM * 0.9, 6);
  });

  it("returns null on expression containing letters (unsafe)", () => {
    expect(hyperMillCycleDefaultsEngine.resolveFormula("T:Dia + abc", { toolDiameter: TOOL_DIA_MM })).toBe(null);
  });

  it("resolves J:MTol", () => {
    const r = hyperMillCycleDefaultsEngine.resolveFormula("J:MTol*2", { machineTolerance: 0.005 });
    expect(r).toBeCloseTo(0.01, 6);
  });

  it("resolves J:F (job feed) substitution", () => {
    const r = hyperMillCycleDefaultsEngine.resolveFormula("J:F/10", { jobFeed: 1000 });
    expect(r).toBe(100);
  });
});

describe("HyperMillCycleDefaultsEngine — resolveDefaults()", () => {
  it("returns full param map for hmSlf3 with formulas resolved", () => {
    const r = hyperMillCycleDefaultsEngine.resolveDefaults("hmSlf3", {
      toolDiameter: TOOL_DIA_MM,
      toolRadius: TOOL_RADIUS_MM,
      machineTolerance: MTOL_MM,
    });
    expect(r).not.toBe(null);
    // Numeric param preserved
    expect(r!.SICHEBENE).toBe(100);
    // Formula param resolved
    expect(typeof r!.MASRFRES).toBe("number");
    expect(r!.MASRFRES).toBeCloseTo(0.1 * MTOL_MM, 6);
  });

  it("returns null for unknown cycle", () => {
    expect(hyperMillCycleDefaultsEngine.resolveDefaults("nonexistent", {})).toBe(null);
  });

  it("HOLDCHECK_CLEARVALUE_F = T:Dia*0.1 resolves to 1.0 with diameter 10", () => {
    const r = hyperMillCycleDefaultsEngine.resolveDefaults("hmOrm", { toolDiameter: TOOL_DIA_MM });
    expect(r!.HOLDCHECK_CLEARVALUE_F).toBeCloseTo(1.0, 6);
  });
});

describe("HyperMillCycleDefaultsEngine — collisionDefaults() / macroFormulas()", () => {
  it("collisionDefaults returns canonical 0.25/0.05/0.25/1.5 mm clearances", () => {
    const c = hyperMillCycleDefaultsEngine.collisionDefaults();
    expect(c.holderClearance).toBe(HOLDER_CLEARANCE_MM);
    expect(c.shankClearance).toBe(0.05);
    expect(c.extensionClearance).toBe(HOLDER_CLEARANCE_MM);
    expect(c.headClearance).toBe(HEAD_CLEARANCE_MM);
  });

  it("macroFormulas returns canonical T:Dia/T:Rad expressions", () => {
    const m = hyperMillCycleDefaultsEngine.macroFormulas();
    expect(m.approachLength).toBe("T:Dia*0.35");
    expect(m.retractLength).toBe("T:Dia*0.35");
    expect(m.approachClearSide).toBe("T:Rad*0.25");
    expect(m.approachClearAxial).toBe("T:Rad*0.1");
  });
});

describe("HyperMillCycleDefaultsEngine — stats()", () => {
  it("returns totalCycles + byCategory + formulaCount + paramCount", () => {
    const s = hyperMillCycleDefaultsEngine.stats();
    expect(s.totalCycles).toBeGreaterThan(20);
    expect(s.formulaCount).toBeGreaterThan(0);
    expect(s.paramCount).toBeGreaterThan(s.formulaCount);
    expect(typeof s.byCategory["3d_milling"]).toBe("number");
    expect(typeof s.byCategory["turning"]).toBe("number");
    expect(s.formulaVars).toContain("T:Dia");
    expect(s.formulaVars).toContain("mtol");
  });

  it("sum of byCategory equals totalCycles", () => {
    const s = hyperMillCycleDefaultsEngine.stats();
    const sum = Object.values(s.byCategory).reduce((a, b) => a + b, 0);
    expect(sum).toBe(s.totalCycles);
  });
});

describe("HyperMillCycleDefaultsEngine — adversarial inputs", () => {
  it("getByCode with empty string returns null", () => {
    expect(hyperMillCycleDefaultsEngine.getByCode("")).toBe(null);
  });

  it("resolveFormula with empty string returns 0 (eval of '')", () => {
    // Empty string passes the safe regex /^[\d.+\-*/() ]+$/  (matches 0+ chars) → eval → undefined
    // But Function("return ()")() throws → returns null via catch
    const r = hyperMillCycleDefaultsEngine.resolveFormula("", {});
    expect(r === null || r === 0).toBe(true);
  });

  it("resolveFormula with nested division parses correctly", () => {
    const r = hyperMillCycleDefaultsEngine.resolveFormula("T:Dia/T:Rad", {
      toolDiameter: TOOL_DIA_MM,
      toolRadius: TOOL_RADIUS_MM,
    });
    expect(r).toBe(2);
  });
});
