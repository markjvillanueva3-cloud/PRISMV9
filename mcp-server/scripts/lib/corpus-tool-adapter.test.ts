/**
 * corpus-tool-adapter.test.ts -- real-value coverage for the corpus->matrix adapter.
 * [CORPUS-CUTTING-CORPUS] (slot:romeo, 2026-06-14)
 *
 * Asserts the exact mapping decisions that make the deterministic cutting matrix
 * runnable over EVERY corpus tool: geometry gate, type-driven flute defaults,
 * ISO-applicability capture, brand normalization, substrate/description defaults.
 */
import { describe, it, expect } from "vitest";
import { adaptCorpusTool, normalizeBrand, type CorpusTool } from "./corpus-tool-adapter.js";

function tool(over: Partial<CorpusTool> = {}): CorpusTool {
  return {
    id: "corpus:Acme:EM-12",
    manufacturer: "Acme",
    series: "EM",
    designation: "EM-12 4F",
    type: "end_mill",
    material: "carbide",
    physical: { cutting_diameter_mm: 12, shank_diameter_mm: 12, overall_length_mm: 80, flute_length_mm: 25 },
    flute_count: 4,
    iso_groups: ["P", "M", "K", "N", "S", "H"],
    ...over,
  };
}

describe("adaptCorpusTool -- happy path", () => {
  it("maps a fully-specified corpus end mill to the matrix input verbatim", () => {
    const a = adaptCorpusTool(tool());
    expect(a.input).toEqual({ toolType: "end_mill", dMm: 12, flutes: 4, material: "carbide", description: "EM-12 4F" });
    expect(a.geometryKnown).toBe(true);
    expect(a.fluteSource).toBe("record");
    expect(a.brand).toBe("Acme");
    expect(a.declaredIso).toEqual(["P", "M", "K", "N", "S", "H"]);
  });
});

describe("adaptCorpusTool -- geometry gate (dia=0 holder-derived entries)", () => {
  it("flags geometryKnown=false and zeroes dMm when cutting_diameter_mm is 0", () => {
    const a = adaptCorpusTool(tool({ physical: { cutting_diameter_mm: 0 } }));
    expect(a.geometryKnown).toBe(false);
    expect(a.input.dMm).toBe(0);
  });
  it("treats a missing physical block as geometry-unknown (no throw)", () => {
    const a = adaptCorpusTool(tool({ physical: undefined }));
    expect(a.geometryKnown).toBe(false);
    expect(a.input.dMm).toBe(0);
  });
  it("treats a negative diameter as geometry-unknown", () => {
    const a = adaptCorpusTool(tool({ physical: { cutting_diameter_mm: -3 } }));
    expect(a.geometryKnown).toBe(false);
  });
});

describe("adaptCorpusTool -- flute defaults when flute_count is absent", () => {
  it("defaults an end mill to 4 flutes", () => {
    const a = adaptCorpusTool(tool({ flute_count: undefined }));
    expect(a.input.flutes).toBe(4);
    expect(a.fluteSource).toBe("type-default");
  });
  it("defaults a drill to 2 flutes", () => {
    const a = adaptCorpusTool(tool({ type: "drill", flute_count: undefined }));
    expect(a.input.flutes).toBe(2);
  });
  it("defaults a single-point turning tool to 1", () => {
    const a = adaptCorpusTool(tool({ type: "turning_tool", flute_count: undefined }));
    expect(a.input.flutes).toBe(1);
  });
  it("a zero flute_count falls back to the type default (not 0)", () => {
    const a = adaptCorpusTool(tool({ flute_count: 0 }));
    expect(a.input.flutes).toBe(4);
    expect(a.fluteSource).toBe("type-default");
  });
});

describe("adaptCorpusTool -- ISO applicability capture", () => {
  it("captures a strict subset of ISO groups", () => {
    const a = adaptCorpusTool(tool({ iso_groups: ["N"] }));
    expect(a.declaredIso).toEqual(["N"]);
  });
  it("upper-cases and filters invalid ISO tokens", () => {
    const a = adaptCorpusTool(tool({ iso_groups: ["p", "m", "Z", "x"] }));
    expect(a.declaredIso).toEqual(["P", "M"]);
  });
  it("yields an empty declaredIso when iso_groups is absent", () => {
    const a = adaptCorpusTool(tool({ iso_groups: undefined }));
    expect(a.declaredIso).toEqual([]);
  });
});

describe("adaptCorpusTool -- substrate + description + brand defaults", () => {
  it("defaults material to carbide when absent", () => {
    const a = adaptCorpusTool(tool({ material: undefined }));
    expect(a.input.material).toBe("carbide");
  });
  it("falls back description to series then id", () => {
    expect(adaptCorpusTool(tool({ designation: undefined })).input.description).toBe("EM");
    expect(adaptCorpusTool(tool({ designation: undefined, series: undefined })).input.description).toBe("corpus:Acme:EM-12");
  });
  it("normalizes an empty manufacturer to 'unspecified'", () => {
    expect(normalizeBrand("")).toBe("unspecified");
    expect(normalizeBrand(undefined)).toBe("unspecified");
    expect(normalizeBrand("  Iscar ")).toBe("Iscar");
    expect(adaptCorpusTool(tool({ manufacturer: "  " })).brand).toBe("unspecified");
  });
});
