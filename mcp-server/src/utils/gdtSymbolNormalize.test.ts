import { describe, it, expect } from "vitest";
import { normalizeGdtSymbol } from "./gdtSymbolNormalize.js";
import { validateExtractedGdt } from "./gdtFcfValidate.js";

// Reference values are PINNED IDENTICAL to the script-side
// scripts/lib/ollama-vision-extract-lib.test.mjs "normalizeGdtSymbol" test, so the documented
// .mjs/.ts clone cannot silently diverge.
describe("normalizeGdtSymbol (production clone)", () => {
  it("passes through canonical names (underscore-collapses 'profile surface')", () => {
    expect(normalizeGdtSymbol("position")).toBe("position");
    expect(normalizeGdtSymbol("circular_runout")).toBe("circular_runout");
    expect(normalizeGdtSymbol("profile surface")).toBe("profile_surface");
  });

  it("maps shop abbreviations to the canonical name", () => {
    expect(normalizeGdtSymbol("TP")).toBe("position");
    expect(normalizeGdtSymbol("POS")).toBe("position");
    expect(normalizeGdtSymbol("PERP")).toBe("perpendicularity");
    expect(normalizeGdtSymbol("CYL")).toBe("cylindricity");
  });

  it("maps variant spellings to the canonical name", () => {
    expect(normalizeGdtSymbol("true position")).toBe("position");
    expect(normalizeGdtSymbol("roundness")).toBe("circularity");
    expect(normalizeGdtSymbol("total runout")).toBe("total_runout");
    expect(normalizeGdtSymbol("runout")).toBe("circular_runout"); // bare runout = circular (single-arrow)
  });

  it("maps ASME Y14.5 unicode symbols (via fromCharCode)", () => {
    expect(normalizeGdtSymbol(String.fromCharCode(0x2316))).toBe("position");
    expect(normalizeGdtSymbol(String.fromCharCode(0x22a5))).toBe("perpendicularity");
  });

  it("strips trailing GD&T noise words", () => {
    expect(normalizeGdtSymbol("position tol")).toBe("position");
  });

  it("never fabricates -- unknown/empty/null/undefined -> null (R12)", () => {
    expect(normalizeGdtSymbol("XYZ") ?? "NONE").toBe("NONE");
    expect(normalizeGdtSymbol("") ?? "NONE").toBe("NONE");
    expect(normalizeGdtSymbol(null) ?? "NONE").toBe("NONE");
    expect(normalizeGdtSymbol(undefined) ?? "NONE").toBe("NONE");
  });
});

describe("normalizeGdtSymbol -> validateExtractedGdt (the production datum-deficiency fix)", () => {
  it("a non-canonical 'TP' position frame with no datum is now flagged datum-deficient", () => {
    // Before normalization, "tp" was unrecognized by gdtFcfValidate's SYMBOL_TO_PARSER -> undefined verdict
    // -> the datum-deficient position FCF was silently NOT flagged. Normalizing "TP" -> "position" fixes it.
    const verdict = validateExtractedGdt({
      symbol: normalizeGdtSymbol("TP") ?? "TP",
      tolerance_value: 0.005,
      tolerance_unit: "in",
      datum_references: [],
    });
    expect(verdict).toMatchObject({ fcf_valid: false });
    expect(verdict?.fcf_issues.some((s) => /datum/i.test(s))).toBe(true);
  });

  it("a 'FLAT' form-tolerance frame with no datum is NOT deficient (ASME Y14.5 8.2)", () => {
    const verdict = validateExtractedGdt({
      symbol: normalizeGdtSymbol("FLAT") ?? "FLAT",
      tolerance_value: 0.002,
      tolerance_unit: "in",
      datum_references: [],
    });
    // form tolerances never require a datum -> the no-datum case is valid (no datum-deficiency error)
    expect(verdict?.fcf_issues.some((s) => /datum/i.test(s)) ?? false).toBe(false);
  });

  it("an unrecognized symbol still leaves the frame un-validated (undefined), never guessed", () => {
    const verdict = validateExtractedGdt({ symbol: normalizeGdtSymbol("XYZ") ?? "XYZ", datum_references: [] });
    expect(verdict ?? "UNVALIDATED").toBe("UNVALIDATED");
  });
});
