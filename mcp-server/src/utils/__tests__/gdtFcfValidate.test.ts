// Tests for the OCR-frame FCF syntax validator adapter (U-XRAY-GDT-FCF-VALIDATE).
// The load-bearing intent (R9): the OCR-side and parser-side GDTSymbol enums DIFFER
// (circularity/profile_line/profile_surface vs roundness/profile_of_line/profile_of_surface).
// A correct adapter must translate them so the validator recognizes the control type -- these
// tests FAIL if the translation is dropped (a raw pass-through would silently mis-classify).
import { describe, it, expect } from "vitest";
import { validateExtractedGdt } from "../gdtFcfValidate.js";

// pull the issue codes out of the "[severity] CODE: message" strings for precise assertions.
const codes = (issues: string[]): string[] =>
  issues.map((s) => {
    const m = s.match(/^\[[a-z]+\]\s+([A-Z_]+):/);
    return m ? m[1] : s;
  });

describe("validateExtractedGdt — symbol translation (the cross-enum hazard)", () => {
  it("OCR 'circularity' is translated to the parser form symbol 'roundness' (form + datum = error)", () => {
    // If 'circularity' were passed raw, the validator's FORM_SYMBOLS.includes() would be false
    // and FORM_WITH_DATUM would NOT fire -- this test pins the translation.
    const v = validateExtractedGdt({
      symbol: "circularity",
      tolerance_value: 0.02,
      tolerance_unit: "mm",
      datum_references: ["A"],
    });
    expect(v?.fcf_valid).toBe(false);
    expect(codes(v?.fcf_issues ?? [])).toContain("FORM_WITH_DATUM");
  });

  it("OCR 'circularity' with NO datum is a valid form tolerance", () => {
    const v = validateExtractedGdt({ symbol: "circularity", tolerance_value: 0.02, tolerance_unit: "mm", datum_references: [] });
    expect(v?.fcf_valid).toBe(true);
    expect(v?.fcf_issues).toEqual([]);
  });

  it("OCR 'profile_surface' is translated to 'profile_of_surface' (profile-without-datum info)", () => {
    const v = validateExtractedGdt({ symbol: "profile_surface", tolerance_value: 0.1, tolerance_unit: "mm", datum_references: [] });
    expect(v?.fcf_valid).toBe(true); // info, not error
    expect(codes(v?.fcf_issues ?? [])).toContain("PROFILE_WITHOUT_DATUM");
  });

  it("OCR 'profile_line' is recognized as a profile symbol", () => {
    const v = validateExtractedGdt({ symbol: "profile_line", tolerance_value: 0.1, tolerance_unit: "mm", datum_references: [] });
    expect(codes(v?.fcf_issues ?? [])).toContain("PROFILE_WITHOUT_DATUM");
  });

  it("parser-native names are accepted too ('roundness')", () => {
    const v = validateExtractedGdt({ symbol: "roundness", tolerance_value: 0.02, tolerance_unit: "mm", datum_references: ["A"] });
    expect(codes(v?.fcf_issues ?? [])).toContain("FORM_WITH_DATUM");
  });

  it("symbol is case/space tolerant", () => {
    const v = validateExtractedGdt({ symbol: "  Position ", tolerance_value: 0.1, tolerance_unit: "mm", datum_references: [] });
    expect(v?.fcf_valid).toBe(false);
    expect(codes(v?.fcf_issues ?? [])).toContain("POSITION_NO_DATUM");
  });
});

describe("validateExtractedGdt — datum-deficiency (the xray FCF doctrine)", () => {
  it("position WITHOUT a datum is invalid", () => {
    const v = validateExtractedGdt({ symbol: "position", tolerance_value: 0.05, tolerance_unit: "mm", datum_references: [] });
    expect(v?.fcf_valid).toBe(false);
    expect(codes(v?.fcf_issues ?? [])).toContain("POSITION_NO_DATUM");
  });

  it("position WITH a primary datum is valid", () => {
    const v = validateExtractedGdt({ symbol: "position", tolerance_value: 0.05, tolerance_unit: "mm", datum_references: ["A", "B", "C"] });
    expect(v?.fcf_valid).toBe(true);
    expect(v?.fcf_issues).toEqual([]);
  });

  it("perpendicularity (orientation) without a datum is invalid", () => {
    const v = validateExtractedGdt({ symbol: "perpendicularity", tolerance_value: 0.03, tolerance_unit: "mm", datum_references: [] });
    expect(v?.fcf_valid).toBe(false);
    expect(codes(v?.fcf_issues ?? [])).toContain("MISSING_DATUM");
  });

  it("circular_runout without a datum is invalid", () => {
    const v = validateExtractedGdt({ symbol: "circular_runout", tolerance_value: 0.05, tolerance_unit: "mm", datum_references: [] });
    expect(v?.fcf_valid).toBe(false);
    expect(codes(v?.fcf_issues ?? [])).toContain("MISSING_DATUM");
  });

  it("concentricity without a datum is invalid (round-trips the validator's location-datum rule)", () => {
    const v = validateExtractedGdt({ symbol: "concentricity", tolerance_value: 0.02, tolerance_unit: "mm", datum_references: [] });
    expect(v?.fcf_valid).toBe(false);
    expect(codes(v?.fcf_issues ?? [])).toContain("MISSING_DATUM");
  });

  it("symmetry without a datum is invalid", () => {
    const v = validateExtractedGdt({ symbol: "symmetry", tolerance_value: 0.05, tolerance_unit: "mm", datum_references: [] });
    expect(v?.fcf_valid).toBe(false);
    expect(codes(v?.fcf_issues ?? [])).toContain("MISSING_DATUM");
  });

  it("flatness (form) without a datum is valid — form needs no datum", () => {
    const v = validateExtractedGdt({ symbol: "flatness", tolerance_value: 0.01, tolerance_unit: "mm", datum_references: [] });
    expect(v?.fcf_valid).toBe(true);
    expect(v?.fcf_issues).toEqual([]);
  });
});

describe("validateExtractedGdt — material condition mapping", () => {
  it("MMC on a form tolerance (flatness) is an error (MMC->M mapped, then rejected)", () => {
    const v = validateExtractedGdt({ symbol: "flatness", tolerance_value: 0.01, tolerance_unit: "mm", material_condition: "MMC", datum_references: [] });
    expect(v?.fcf_valid).toBe(false);
    expect(codes(v?.fcf_issues ?? [])).toContain("MMC_ON_FORM");
  });

  it("MMC on position (feature of size) is allowed", () => {
    const v = validateExtractedGdt({ symbol: "position", tolerance_value: 0.05, tolerance_unit: "mm", material_condition: "MMC", datum_references: ["A"] });
    expect(v?.fcf_valid).toBe(true);
  });

  it("material_condition is case tolerant ('mmc')", () => {
    const v = validateExtractedGdt({ symbol: "flatness", tolerance_value: 0.01, tolerance_unit: "mm", material_condition: "mmc", datum_references: [] });
    expect(codes(v?.fcf_issues ?? [])).toContain("MMC_ON_FORM");
  });

  it("absent material_condition defaults to RFS (no material checks fire)", () => {
    const v = validateExtractedGdt({ symbol: "flatness", tolerance_value: 0.01, tolerance_unit: "mm", datum_references: [] });
    expect(codes(v?.fcf_issues ?? [])).not.toContain("MMC_ON_FORM");
  });
});

describe("validateExtractedGdt — tolerance + units", () => {
  it("zero tolerance is flagged", () => {
    const v = validateExtractedGdt({ symbol: "flatness", tolerance_value: 0, tolerance_unit: "mm", datum_references: [] });
    expect(v?.fcf_valid).toBe(false);
    expect(codes(v?.fcf_issues ?? [])).toContain("ZERO_TOLERANCE");
  });

  it("a positive inch tolerance survives mm conversion (no false ZERO_TOLERANCE)", () => {
    const v = validateExtractedGdt({ symbol: "flatness", tolerance_value: 0.001, tolerance_unit: "in", datum_references: [] });
    expect(codes(v?.fcf_issues ?? [])).not.toContain("ZERO_TOLERANCE");
    expect(v?.fcf_valid).toBe(true);
  });

  it("missing tolerance_value is treated as zero (review-worthy)", () => {
    const v = validateExtractedGdt({ symbol: "flatness", tolerance_unit: "mm", datum_references: [] });
    expect(codes(v?.fcf_issues ?? [])).toContain("ZERO_TOLERANCE");
  });
});

describe("validateExtractedGdt — adversarial / failure modes (R12, never guess)", () => {
  it("unknown symbol returns undefined (no misleading verdict)", () => {
    expect(validateExtractedGdt({ symbol: "wobbliness", tolerance_value: 0.1, tolerance_unit: "mm" })).toBe(undefined);
    expect(validateExtractedGdt({ symbol: "", tolerance_value: 0.1 })).toBe(undefined);
    expect(validateExtractedGdt({})).toBe(undefined);
  });

  it("NaN / Infinity tolerance -> treated as zero, flagged (never NaN-through)", () => {
    expect(codes(validateExtractedGdt({ symbol: "flatness", tolerance_value: NaN, datum_references: [] })?.fcf_issues ?? [])).toContain("ZERO_TOLERANCE");
    expect(codes(validateExtractedGdt({ symbol: "flatness", tolerance_value: Infinity, datum_references: [] })?.fcf_issues ?? [])).toContain("ZERO_TOLERANCE");
  });

  it("null / undefined datum_references -> empty datums (no crash, position still flagged)", () => {
    const a = validateExtractedGdt({ symbol: "position", tolerance_value: 0.05, datum_references: null });
    expect(codes(a?.fcf_issues ?? [])).toContain("POSITION_NO_DATUM");
    const b = validateExtractedGdt({ symbol: "position", tolerance_value: 0.05 });
    expect(codes(b?.fcf_issues ?? [])).toContain("POSITION_NO_DATUM");
  });

  it("blank / non-string datum labels are dropped (no false DUPLICATE_DATUM, real missing-datum kept)", () => {
    const v = validateExtractedGdt({
      symbol: "position",
      tolerance_value: 0.05,
      datum_references: ["", "  ", null as unknown as string],
    });
    // all labels were blank -> treated as no datum -> the genuine missing-datum error stands
    expect(codes(v?.fcf_issues ?? [])).toContain("POSITION_NO_DATUM");
    expect(codes(v?.fcf_issues ?? [])).not.toContain("DUPLICATE_DATUM");
  });

  it("duplicate real datum labels ARE flagged (after blank-filtering)", () => {
    const v = validateExtractedGdt({ symbol: "position", tolerance_value: 0.05, datum_references: ["A", "A"] });
    expect(codes(v?.fcf_issues ?? [])).toContain("DUPLICATE_DATUM");
  });

  it("fcf_issues entries are human-readable '[severity] CODE: message' strings", () => {
    const v = validateExtractedGdt({ symbol: "position", tolerance_value: 0.05, datum_references: [] });
    expect(v?.fcf_issues.some((s) => /^\[error\]\s+POSITION_NO_DATUM:\s+\S/.test(s))).toBe(true);
  });
});
