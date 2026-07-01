/**
 * R9 tests for normalizeToolRows -- the SFC tool-search row normalizer. The tool
 * corpus rows use many field-name dialects (DC/ZEFP/APMX vs cutting_diameter_mm/
 * flute_count, coating as object vs string), so the normalizer must read each via a
 * key-fallback list and never drop a real tool over a dialect mismatch. Pure -- no fetch.
 */
import { describe, it, expect } from "vitest";
import { normalizeToolRows, type ToolSearchOption } from "../api/sfcReferenceCatalogs";

describe("normalizeToolRows", () => {
  it("normalizes a canonical registry row (nested geometry + object coating)", () => {
    const [opt] = normalizeToolRows([
      {
        id: "EM-12-4F",
        name: "12mm 4FL Carbide Endmill",
        geometry: { diameter: 12, flutes: 4, helix_angle: 35, flute_length: 36 },
        coating: { type: "AlTiN" },
        tool_type: "endmill",
      },
    ]);
    expect(opt).toMatchObject<Partial<ToolSearchOption>>({
      id: "EM-12-4F",
      label: "12mm 4FL Carbide Endmill",
      diameterMm: 12,
      flutes: 4,
      coating: "AlTiN",
      helixDeg: 35,
      fluteLengthMm: 36,
      toolType: "endmill",
    });
    expect(opt.detail).toBe("12 mm · 4F · Endmill · AlTiN");
  });

  it("reads the brand-catalog field dialects (DC / ZEFP / APMX, flat coating string)", () => {
    const [opt] = normalizeToolRows([
      { catalog_id: "SAND-R390", description: "CoroMill 390", DC: 25, ZEFP: 5, APMX: 10, coating: "TiAlN", type: "face_mill" },
    ]);
    expect(opt.id).toBe("SAND-R390");
    expect(opt.label).toBe("CoroMill 390");
    expect(opt.diameterMm).toBe(25);
    expect(opt.flutes).toBe(5);
    expect(opt.fluteLengthMm).toBe(10);
    expect(opt.coating).toBe("TiAlN");
  });

  it("prefers cutting_diameter_mm / flute_count over the nested geometry when both exist", () => {
    const [opt] = normalizeToolRows([
      { id: "t1", name: "T1", cutting_diameter_mm: 6, flute_count: 2, geometry: { diameter: 999, flutes: 9 } },
    ]);
    expect(opt.diameterMm).toBe(6);
    expect(opt.flutes).toBe(2);
  });

  it("yields null geometry (not 0) for a row with no diameter/flutes, and '' coating when uncoated", () => {
    const [opt] = normalizeToolRows([{ id: "bare", name: "Bare Tool" }]);
    expect(opt.diameterMm).toBeNull();
    expect(opt.flutes).toBeNull();
    expect(opt.coating).toBe("");
    expect(opt.detail).toBe("Bare Tool"); // detail falls back to the name when no facets
  });

  it("skips malformed rows (non-object, missing name) and dedups by id", () => {
    const opts = normalizeToolRows([
      null,
      7,
      "str",
      {}, // no name, no id -> skipped
      { id: "dup", name: "Dup A" },
      { id: "dup", name: "Dup B" }, // same id -> deduped
    ]);
    expect(opts).toHaveLength(1);
    expect(opts[0].label).toBe("Dup A");
  });

  it("returns [] for a non-array payload (null / object / string)", () => {
    expect(normalizeToolRows(null)).toEqual([]);
    expect(normalizeToolRows({ tools: [] })).toEqual([]);
    expect(normalizeToolRows("x")).toEqual([]);
  });

  it("uses description/catalog_number as the name fallback when name is absent", () => {
    const [byDesc] = normalizeToolRows([{ catalog_number: "ACCU-0.0469", description: "Accupro drill 1.191mm", DC: 1.191 }]);
    expect(byDesc.label).toBe("Accupro drill 1.191mm");
    expect(byDesc.diameterMm).toBeCloseTo(1.191, 3);
  });
});
