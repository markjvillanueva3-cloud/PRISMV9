import { describe, it, expect } from "vitest";
import { fcfSyntaxValidatorEngine } from "../engines/FCFSyntaxValidatorEngine.js";
import type { FCF } from "../engines/GDTCalloutParserEngine.js";

function makeFCF(partial: Partial<FCF>): FCF {
  return {
    symbol: partial.symbol ?? "position",
    tolerance_mm: partial.tolerance_mm ?? 0.02,
    diameter: partial.diameter ?? false,
    material_modifier: partial.material_modifier ?? "RFS",
    datums: partial.datums ?? [],
    errors: partial.errors ?? [],
    composite_refinement: partial.composite_refinement,
  };
}

describe("FCFSyntaxValidatorEngine", () => {
  it("accepts valid position FCF", () => {
    const r = fcfSyntaxValidatorEngine.validate({
      fcf: makeFCF({
        symbol: "position",
        tolerance_mm: 0.02,
        diameter: true,
        datums: [{ label: "A" }, { label: "B" }],
      }),
      is_feature_of_size: true,
    });
    expect(r.valid).toBe(true);
  });

  it("rejects form tolerance with datums", () => {
    const r = fcfSyntaxValidatorEngine.validate({
      fcf: makeFCF({ symbol: "flatness", datums: [{ label: "A" }] }),
    });
    expect(r.valid).toBe(false);
    expect(r.issues.some((x) => x.code === "FORM_WITH_DATUM")).toBe(true);
  });

  it("rejects zero tolerance", () => {
    const r = fcfSyntaxValidatorEngine.validate({
      fcf: makeFCF({ symbol: "flatness", tolerance_mm: 0 }),
    });
    expect(r.issues.some((x) => x.code === "ZERO_TOLERANCE")).toBe(true);
  });

  it("rejects diameter prefix on perpendicularity", () => {
    const r = fcfSyntaxValidatorEngine.validate({
      fcf: makeFCF({
        symbol: "perpendicularity",
        diameter: true,
        datums: [{ label: "A" }],
      }),
    });
    expect(r.issues.some((x) => x.code === "INVALID_DIAMETER_PREFIX")).toBe(true);
  });

  it("rejects material modifier on form tolerance", () => {
    const r = fcfSyntaxValidatorEngine.validate({
      fcf: makeFCF({ symbol: "roundness", material_modifier: "M" }),
    });
    expect(r.issues.some((x) => x.code === "MMC_ON_FORM")).toBe(true);
  });

  it("warns on deprecated concentricity symbol", () => {
    const r = fcfSyntaxValidatorEngine.validate({
      fcf: makeFCF({ symbol: "concentricity", datums: [{ label: "A" }] }),
    });
    expect(r.issues.some((x) => x.code === "DEPRECATED_SYMBOL")).toBe(true);
  });

  it("flags position without datum", () => {
    const r = fcfSyntaxValidatorEngine.validate({
      fcf: makeFCF({ symbol: "position", datums: [] }),
    });
    expect(r.issues.some((x) => x.code === "POSITION_NO_DATUM" || x.code === "MISSING_DATUM")).toBe(true);
  });

  it("flags circular runout without datum", () => {
    const r = fcfSyntaxValidatorEngine.validate({
      fcf: makeFCF({ symbol: "circular_runout", datums: [] }),
    });
    expect(r.issues.some((x) => x.code === "MISSING_DATUM")).toBe(true);
  });

  it("flags concentricity without datum (datum-requiring location control, ASME Y14.5)", () => {
    const r = fcfSyntaxValidatorEngine.validate({
      fcf: makeFCF({ symbol: "concentricity", datums: [] }),
    });
    expect(r.valid).toBe(false);
    expect(r.issues.some((x) => x.code === "MISSING_DATUM")).toBe(true);
  });

  it("flags symmetry without datum (datum-requiring location control)", () => {
    const r = fcfSyntaxValidatorEngine.validate({
      fcf: makeFCF({ symbol: "symmetry", datums: [] }),
    });
    expect(r.valid).toBe(false);
    expect(r.issues.some((x) => x.code === "MISSING_DATUM")).toBe(true);
  });

  it("concentricity WITH a datum does NOT raise MISSING_DATUM (only the deprecation warning)", () => {
    const r = fcfSyntaxValidatorEngine.validate({
      fcf: makeFCF({ symbol: "concentricity", datums: [{ label: "A" }] }),
    });
    expect(r.issues.some((x) => x.code === "MISSING_DATUM")).toBe(false);
    expect(r.issues.some((x) => x.code === "DEPRECATED_SYMBOL")).toBe(true);
  });

  it("detects duplicate datum reference", () => {
    const r = fcfSyntaxValidatorEngine.validate({
      fcf: makeFCF({
        symbol: "position",
        datums: [{ label: "A" }, { label: "A" }],
      }),
    });
    expect(r.issues.some((x) => x.code === "DUPLICATE_DATUM")).toBe(true);
  });

  it("warns when tolerance > 50% feature size", () => {
    const r = fcfSyntaxValidatorEngine.validate({
      fcf: makeFCF({ symbol: "flatness", tolerance_mm: 10 }),
      feature_size_mm: 12,
    });
    expect(r.issues.some((x) => x.code === "TOL_TOO_LOOSE")).toBe(true);
  });

  it("flags MMC on profile", () => {
    const r = fcfSyntaxValidatorEngine.validate({
      fcf: makeFCF({
        symbol: "profile_of_surface",
        material_modifier: "M",
        datums: [{ label: "A" }],
      }),
    });
    expect(r.issues.some((x) => x.code === "MMC_ON_PROFILE")).toBe(true);
  });

  it("composite FCF with refinement looser than primary is error", () => {
    const r = fcfSyntaxValidatorEngine.validate({
      fcf: makeFCF({
        symbol: "position",
        tolerance_mm: 0.05,
        diameter: true,
        datums: [{ label: "A" }],
        composite_refinement: makeFCF({
          symbol: "position",
          tolerance_mm: 0.1,
          diameter: true,
          datums: [{ label: "A" }],
        }),
      }),
    });
    expect(r.issues.some((x) => x.code === "COMPOSITE_REFINEMENT_LOOSER")).toBe(true);
  });

  it("composite FCF with symbol mismatch is error", () => {
    const r = fcfSyntaxValidatorEngine.validate({
      fcf: makeFCF({
        symbol: "position",
        datums: [{ label: "A" }],
        composite_refinement: makeFCF({ symbol: "perpendicularity", datums: [{ label: "A" }] }),
      }),
    });
    expect(r.issues.some((x) => x.code === "COMPOSITE_SYMBOL_MISMATCH")).toBe(true);
  });

  it("propagates parser errors", () => {
    const r = fcfSyntaxValidatorEngine.validate({
      fcf: makeFCF({ symbol: "flatness", errors: ["parsing failed"] }),
    });
    expect(r.issues.some((x) => x.code === "PARSE_ERROR")).toBe(true);
  });

  it("summary counts errors/warnings/info", () => {
    const r = fcfSyntaxValidatorEngine.validate({
      fcf: makeFCF({ symbol: "concentricity", datums: [{ label: "A" }] }),
    });
    expect(r.summary.warnings + r.summary.errors + r.summary.info).toBe(r.issues.length);
  });

  it("getStats returns rule list", () => {
    const s = fcfSyntaxValidatorEngine.getStats();
    expect(s.rules_applied.length).toBeGreaterThan(0);
    expect(s.reference).toMatch(/Y14\.5/);
  });
});
