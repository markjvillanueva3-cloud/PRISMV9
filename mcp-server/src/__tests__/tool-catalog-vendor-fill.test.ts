/**
 * tool-catalog-vendor-fill.test.ts — DB-COVERAGE-GAPFILL-MS0 / U-SVK01 (+ future vendor fills)
 *
 * Verifies that vendor tool catalogs populated by this milestone load through the
 * engine's per-vendor loaders and are searchable by manufacturer + type. These
 * catalogs were empty `[]` stubs whose `_load<Vendor>Tools` loaders were dead;
 * this test fails if a fill regresses to empty or a record's type/diameter is wrong.
 *
 * R9: asserts concrete record counts, type filtering, and physical-field sanity
 * against the live engine — not satisfiable by a stub.
 */
import { describe, it, expect } from "vitest";
import { toolCatalogEngine } from "../engines/ToolCatalogEngine.js";

describe("vendor catalog fills — searchable through the engine", () => {
  it("Sandvik catalog loads with drills + end mills (was empty [])", () => {
    const all = toolCatalogEngine.search({ manufacturer: "Sandvik", max_results: 100 });
    expect(all.length).toBeGreaterThanOrEqual(10);
    expect(all.every((t) => t.manufacturer === "Sandvik")).toBe(true);

    const drills = toolCatalogEngine.search({ manufacturer: "Sandvik", type: "drill", max_results: 50 });
    expect(drills.length).toBeGreaterThanOrEqual(7);
    expect(drills.every((t) => t.type === "drill")).toBe(true);

    const endmills = toolCatalogEngine.search({ manufacturer: "Sandvik", type: "end_mill", max_results: 50 });
    expect(endmills.length).toBeGreaterThanOrEqual(5);
    expect(endmills.every((t) => t.type === "end_mill")).toBe(true);
  });

  it("Sandvik records carry finite positive cutting diameters and a known designation", () => {
    const all = toolCatalogEngine.search({ manufacturer: "Sandvik", max_results: 100 });
    const badDia = all.filter(
      (t) => !(Number.isFinite(t.physical?.cutting_diameter_mm) && (t.physical!.cutting_diameter_mm as number) > 0),
    );
    expect(badDia.map((t) => t.designation)).toEqual([]);
    const designations = all.map((t) => t.designation);
    expect(designations).toContain("CD460-6.0");
  });

  it("Sandvik CoroMill Plura end mills are 4-flute carbide", () => {
    const plura = toolCatalogEngine
      .search({ manufacturer: "Sandvik", type: "end_mill", max_results: 50 })
      .filter((t) => t.designation.startsWith("Plura"));
    expect(plura.length).toBeGreaterThanOrEqual(5);
    expect(plura.every((t) => t.material === "carbide")).toBe(true);
    expect(plura.every((t) => t.flute_count === 4)).toBe(true);
  });

  it("Helical Solutions catalog loads with end mills + ball mills (was empty [])", () => {
    const all = toolCatalogEngine.search({ manufacturer: "Helical", max_results: 100 });
    expect(all.length).toBeGreaterThanOrEqual(8);
    expect(all.every((t) => t.manufacturer === "Helical Solutions")).toBe(true);
    expect(all.every((t) => t.material === "carbide")).toBe(true);

    const endmills = toolCatalogEngine.search({ manufacturer: "Helical", type: "end_mill", max_results: 50 });
    expect(endmills.length).toBeGreaterThanOrEqual(6); // HEV-5 x4 + HVAL x2
    const balls = toolCatalogEngine.search({ manufacturer: "Helical", type: "ball_mill", max_results: 50 });
    expect(balls.length).toBeGreaterThanOrEqual(2); // HBN x2
    expect(balls.every((t) => t.type === "ball_mill")).toBe(true);
    // 3-flute aluminium line present
    expect(all.some((t) => t.flute_count === 3)).toBe(true);
  });

  it("Sumitomo catalog loads with drills + end mills (was empty [])", () => {
    const all = toolCatalogEngine.search({ manufacturer: "Sumitomo", max_results: 100 });
    expect(all.length).toBeGreaterThanOrEqual(9);
    expect(all.every((t) => t.manufacturer === "Sumitomo")).toBe(true);

    const drills = toolCatalogEngine.search({ manufacturer: "Sumitomo", type: "drill", max_results: 50 });
    expect(drills.length).toBeGreaterThanOrEqual(5);
    expect(drills.every((t) => t.type === "drill")).toBe(true);
    const endmills = toolCatalogEngine.search({ manufacturer: "Sumitomo", type: "end_mill", max_results: 50 });
    expect(endmills.length).toBeGreaterThanOrEqual(3);

    const badDia = all.filter((t) => !(Number.isFinite(t.physical?.cutting_diameter_mm) && (t.physical!.cutting_diameter_mm as number) > 0));
    expect(badDia.map((t) => t.designation)).toEqual([]);
  });

  it("additional-tools multi-vendor catalog loads (YG-1 / Niagara / Mitsubishi / Walter, was empty [])", () => {
    for (const mfr of ["YG-1", "Niagara", "Mitsubishi", "Walter"]) {
      const hits = toolCatalogEngine.search({ manufacturer: mfr, max_results: 50 });
      expect(hits.length).toBeGreaterThanOrEqual(1);
      expect(hits.every((t) => t.manufacturer.includes(mfr.split("-")[0]))).toBe(true);
    }
    const yg = toolCatalogEngine.search({ manufacturer: "YG-1", max_results: 50 });
    expect(yg.some((t) => t.type === "drill")).toBe(true);
    expect(yg.some((t) => t.type === "end_mill")).toBe(true);
    const balls = toolCatalogEngine.search({ manufacturer: "Mitsubishi", type: "ball_mill", max_results: 50 });
    expect(balls.length).toBeGreaterThanOrEqual(1);
  });

  it("indexable-tools catalog loads (ISCAR / Kennametal / Korloy milling bodies, was empty [])", () => {
    const iscar = toolCatalogEngine.search({ manufacturer: "ISCAR", max_results: 200 });
    expect(iscar.map((t) => t.designation)).toContain("HM390-FTD-D25");
    const ken = toolCatalogEngine.search({ manufacturer: "Kennametal", max_results: 200 });
    expect(ken.map((t) => t.designation)).toContain("MILL1-14-D50");
    const kor = toolCatalogEngine.search({ manufacturer: "Korloy", max_results: 200 });
    expect(kor.length).toBeGreaterThanOrEqual(2);
    // indexable milling bodies map to end_mill type with finite cutter diameter
    const hm390 = iscar.find((t) => t.designation === "HM390-FTD-D25");
    expect(hm390?.type).toBe("end_mill");
    expect(hm390?.physical?.cutting_diameter_mm).toBe(25);
  });
});
