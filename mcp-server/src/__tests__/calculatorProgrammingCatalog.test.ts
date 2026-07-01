/**
 * calculatorProgrammingCatalog.test.ts (slot:oscar)
 *
 * Pins the re-authored CAM/programming-environment catalog (the original base JSON was lost
 * to exFAT corruption 2026-04-10; SUPPLEMENTAL_PROGRAMMING_ENVIRONMENTS is now the source).
 * This catalog backs the SFC `/programming/catalog` endpoint -> the CAM-system select. A
 * regression to the empty `[]` (which made the endpoint return 0) fails here.
 */
import { describe, it, expect } from "vitest";
import {
  getCalculatorProgrammingEnvironments,
  CALCULATOR_PROGRAMMING_ENVIRONMENTS,
} from "../data/calculatorProgrammingCatalog.js";

describe("calculator programming (CAM) catalog", () => {
  it("is populated with real off-the-shelf CAM systems (not the post-corruption empty list)", () => {
    expect(CALCULATOR_PROGRAMMING_ENVIRONMENTS.length).toBeGreaterThanOrEqual(10);
    const labels = CALCULATOR_PROGRAMMING_ENVIRONMENTS.map((e) => e.label);
    expect(labels).toEqual(expect.arrayContaining(["Mastercam Mill", "Fusion 360 Manufacture", "hyperMILL"]));
  });

  it("filters by machine mode and the modes partition the full set", () => {
    const all = getCalculatorProgrammingEnvironments();
    const mill = getCalculatorProgrammingEnvironments("mill");
    const lathe = getCalculatorProgrammingEnvironments("lathe");
    expect(mill.length).toBeGreaterThan(0);
    expect(mill.every((e) => e.mode === "mill")).toBe(true);
    expect(lathe.every((e) => e.mode === "lathe")).toBe(true);
    // Only mill + lathe environments are authored, so they account for the whole catalog.
    expect(all.length).toBe(mill.length + lathe.length);
  });

  it("every environment carries id/vendor/kind + real toolpaths with an operationId", () => {
    for (const env of CALCULATOR_PROGRAMMING_ENVIRONMENTS) {
      expect(env.id).toBeTruthy();
      expect(env.vendor).toBeTruthy();
      expect(["cam", "manual", "nesting"]).toContain(env.kind);
      expect(env.toolpaths.length).toBeGreaterThan(0);
      for (const tp of env.toolpaths) {
        expect(tp.id).toBeTruthy();
        expect(tp.label).toBeTruthy();
        expect(tp.operationId).toBeTruthy();
      }
    }
  });

  it("surfaces >=8 unique mill vendors for the SFC CAM select", () => {
    const vendors = [...new Set(getCalculatorProgrammingEnvironments("mill").map((e) => e.vendor))];
    expect(vendors.length).toBeGreaterThanOrEqual(8);
    expect(vendors).toEqual(expect.arrayContaining(["Mastercam (Sandvik)", "Autodesk Fusion 360"]));
  });

  it("includes a manual (non-CAM) programming option alongside the CAM systems", () => {
    expect(getCalculatorProgrammingEnvironments("mill").some((e) => e.kind === "manual")).toBe(true);
  });

  it("has globally-unique environment ids and toolpath ids", () => {
    const envIds = CALCULATOR_PROGRAMMING_ENVIRONMENTS.map((e) => e.id);
    expect(new Set(envIds).size).toBe(envIds.length);
    const tpIds = CALCULATOR_PROGRAMMING_ENVIRONMENTS.flatMap((e) => e.toolpaths.map((t) => t.id));
    expect(new Set(tpIds).size).toBe(tpIds.length);
  });
});
