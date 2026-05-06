import { describe, it, expect } from "vitest";
import { ToleranceExtractionEngine } from "../engines/ToleranceExtractionEngine.js";
import type { ExtractedDimension } from "../engines/BlueprintOCREngine.js";

const engine = new ToleranceExtractionEngine();

function dim(id: string, type: ExtractedDimension["type"], nominal: number, tol?: { upper: number; lower: number }, rawText?: string): ExtractedDimension {
  return {
    id, type, nominal, unit: "mm",
    raw_text: rawText ?? `${nominal}`,
    confidence: 0.9,
    tolerance: tol ? { type: "bilateral", upper: tol.upper, lower: tol.lower } : undefined,
  };
}

describe("ToleranceExtractionEngine.toFusionDesignParameters", () => {
  it("emits a single _nominal param when both deviations are zero (unlikely but valid)", () => {
    const result = engine.extract([dim("DIM-1", "diameter", 23.876, { upper: 0, lower: 0 })], []);
    const params = engine.toFusionDesignParameters(result.feature_tolerances);
    expect(params.length).toBe(1);
    expect(params[0]?.name).toBe("DIM_1_nominal");
    expect(params[0]?.value).toBe(23.876);
    expect(params[0]?.unit).toBe("mm");
  });

  it("emits 3 params (nominal+upper+lower) for bilateral ±.002\" callout", () => {
    const tols = engine.extract([dim("OD", "diameter", 23.876, { upper: 0.0508, lower: -0.0508 }, "Ø.94 ±.002")], []);
    const params = engine.toFusionDesignParameters(tols.feature_tolerances);
    expect(params.length).toBe(3);
    expect(params[0]?.name).toBe("OD_nominal");
    expect(params[0]?.value).toBe(23.876);
    expect(params[1]?.name).toBe("OD_upper");
    expect(params[1]?.value).toBeCloseTo(0.0508, 6);
    expect(params[2]?.name).toBe("OD_lower");
    expect(params[2]?.value).toBeCloseTo(-0.0508, 6);
  });

  it("sanitises non-alnum characters in feature_id", () => {
    const tols = engine.extract([dim("DIM-A.1/B", "linear", 100)], []);
    const params = engine.toFusionDesignParameters(tols.feature_tolerances);
    expect(params[0]?.name.startsWith("DIM_A_1_B_")).toBe(true);
  });

  it("description carries raw_text and source provenance", () => {
    const tols = engine.extract([dim("ID", "diameter", 5.08, { upper: 0.013, lower: 0 }, "Ø.20 +.0005/-0")], []);
    const params = engine.toFusionDesignParameters(tols.feature_tolerances);
    expect(params[0]?.description).toContain("Ø.20 +.0005/-0");
    expect(params[0]?.description).toContain("explicit");
  });

  it("ISO 2768-m default tolerance fills in when no explicit tolerance", () => {
    // 100mm linear with no explicit tolerance → ISO 2768-m default applies
    const tols = engine.extract([dim("LEN", "linear", 100)], []);
    const params = engine.toFusionDesignParameters(tols.feature_tolerances);
    // Should have nominal + upper + lower params (defaults applied)
    expect(params.length).toBe(3);
    expect(params[0]?.description).toContain("iso_2768_m");
  });

  it("upper-only deviation (e.g. +.0005/-0) emits 2 params (nominal + upper)", () => {
    const tols = engine.extract([dim("DIM-1", "diameter", 5.08, { upper: 0.013, lower: 0 })], []);
    const params = engine.toFusionDesignParameters(tols.feature_tolerances);
    expect(params.length).toBe(2);
    expect(params[1]?.name.endsWith("_upper")).toBe(true);
  });

  it("lower-only deviation emits 2 params (nominal + lower)", () => {
    const tols = engine.extract([dim("DIM-1", "diameter", 5.08, { upper: 0, lower: -0.013 })], []);
    const params = engine.toFusionDesignParameters(tols.feature_tolerances);
    expect(params.length).toBe(2);
    expect(params[1]?.name.endsWith("_lower")).toBe(true);
  });
});

describe("ToleranceExtractionEngine.extractFusionDesignParams — pipeline", () => {
  it("threads dimensions through extract → toFusionDesignParameters in one call", () => {
    const dims = [
      dim("OD", "diameter", 23.876, { upper: 0.0508, lower: -0.0508 }, "Ø.94 ±.002"),
      dim("LEN", "linear", 104.39, { upper: 0.13, lower: -0.13 }),
    ];
    const result = engine.extractFusionDesignParams(dims, []);
    expect(result.parameters.length).toBe(6); // 3 each
    expect(result.feature_tolerances.length).toBe(2);
    // OD parameters present
    expect(result.parameters.some((p) => p.name === "OD_nominal" && p.value === 23.876)).toBe(true);
    expect(result.parameters.some((p) => p.name === "LEN_nominal" && p.value === 104.39)).toBe(true);
  });

  it("warnings array is always present (proper plumbing from extract())", () => {
    const dims = [dim("DIM-1", "diameter", 10)];
    const result = engine.extractFusionDesignParams(dims, []);
    expect(Array.isArray(result.warnings)).toBe(true);
    // No explicit tolerance → ISO 2768-m default applied → no warning required
    // but the array shape must exist as a stable plumbing surface.
    expect(result.warnings.length).toBeGreaterThanOrEqual(0);
  });

  it("ISO class override 'f' (fine) produces tighter tolerance than 'm' (medium)", () => {
    const dims = [dim("LEN", "linear", 100)];
    const fine = engine.extractFusionDesignParams(dims, [], "f");
    const medium = engine.extractFusionDesignParams(dims, [], "m");
    const fineUpper = fine.parameters.find((p) => p.name === "LEN_upper")?.value ?? 0;
    const medUpper = medium.parameters.find((p) => p.name === "LEN_upper")?.value ?? 0;
    expect(fineUpper).toBeLessThan(medUpper);
    expect(fineUpper).toBeGreaterThan(0);
  });

  it("empty inputs produce zero parameters", () => {
    const result = engine.extractFusionDesignParams([], []);
    expect(result.parameters.length).toBe(0);
    expect(result.feature_tolerances.length).toBe(0);
  });
});
