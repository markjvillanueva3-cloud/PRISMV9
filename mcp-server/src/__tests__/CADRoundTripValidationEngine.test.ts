/**
 * CADRoundTripValidationEngine.test.ts — CAD-DRAW-MAX-MS1/U-VALIDATION-ROUNDTRIP
 *
 * Hermetic tests for the print → CAD → print → dimension-diff round-trip
 * validation engine. All 5 dependencies are stubbed; no live OCR or CAD
 * session needed.
 */

import { describe, it, expect } from "vitest";
import type { DrawAnyPartInput, DrawAnyPartResult } from "../engines/CADDrawAnyPartOrchestratorEngine.js";
import {
  CADRoundTripValidationEngine,
  cadRoundTripValidationEngine,
  DefaultIntentBuilder,
  defaultIntentBuilder,
  clampTolerance,
  clampPassGate,
  diffDimensions,
  computeMatchRate,
  DEFAULT_DIMENSION_TOLERANCE,
  DEFAULT_ROUND_TRIP_PASS_GATE,
  type PrintOcrResult,
  type PrintDimension,
  type RoundTripDependencies,
} from "../engines/CADRoundTripValidationEngine.js";

function dim(id: string, label: string, value: number, opts: Partial<PrintDimension> = {}): PrintDimension {
  return { id, label, value, ...opts };
}

function makeDrawResult(overrides: Partial<DrawAnyPartResult> = {}): DrawAnyPartResult {
  return {
    opLog: [],
    steps: [],
    exportedSuccessfully: overrides.exportedSuccessfully ?? true,
    stopReason: overrides.stopReason ?? "exported",
    iterations: overrides.iterations ?? 5,
  };
}

function makeDeps(o: Partial<RoundTripDependencies> & { ocr?: PrintOcrResult; cadDims?: PrintDimension[]; regenDims?: PrintDimension[]; drawResult?: DrawAnyPartResult; ocrThrow?: boolean } = {}): RoundTripDependencies {
  return {
    ocrPrint: o.ocrPrint ?? (async (p) => {
      if (o.ocrThrow) throw new Error("ocr-blew-up");
      return o.ocr ?? { printPath: p, dimensions: [], features: [] };
    }),
    intentBuilder: o.intentBuilder ?? defaultIntentBuilder,
    cadDrawer: o.cadDrawer ?? { drawAnyPart: async () => o.drawResult ?? makeDrawResult() },
    cadDimensionExtractor: o.cadDimensionExtractor ?? { extract: async () => o.cadDims ?? [] },
    printGenerator: o.printGenerator ?? { generate: async () => o.regenDims ?? [] },
  };
}

// ── Constants + clamps ───────────────────────────────────────────────────────

describe("constants", () => {
  it("DEFAULT_DIMENSION_TOLERANCE is 0.005 (5 thou)", () => {
    expect(DEFAULT_DIMENSION_TOLERANCE).toBe(0.005);
  });

  it("DEFAULT_ROUND_TRIP_PASS_GATE is 0.95 (near-zero slack)", () => {
    expect(DEFAULT_ROUND_TRIP_PASS_GATE).toBe(0.95);
  });
});

describe("clampTolerance", () => {
  it("undefined → default", () => expect(clampTolerance(undefined)).toBe(DEFAULT_DIMENSION_TOLERANCE));
  it("valid in-range → passthrough", () => expect(clampTolerance(0.01)).toBe(0.01));
  it("negative → 0", () => expect(clampTolerance(-0.1)).toBe(0));
  it("> 1 → 1", () => expect(clampTolerance(99)).toBe(1));
  it("NaN → default", () => expect(clampTolerance(NaN)).toBe(DEFAULT_DIMENSION_TOLERANCE));
});

describe("clampPassGate", () => {
  it("undefined → default 0.95", () => expect(clampPassGate(undefined)).toBe(DEFAULT_ROUND_TRIP_PASS_GATE));
  it("in-range → passthrough", () => expect(clampPassGate(0.7)).toBe(0.7));
  it("clamps [0..1]", () => {
    expect(clampPassGate(-1)).toBe(0);
    expect(clampPassGate(99)).toBe(1);
  });
});

// ── diffDimensions ───────────────────────────────────────────────────────────

describe("diffDimensions", () => {
  it("all match within tolerance", () => {
    const ex = [dim("d1", "OD", 0.500), dim("d2", "len", 1.250)];
    const ac = [dim("d1", "OD", 0.5005), dim("d2", "len", 1.2502)];
    const out = diffDimensions(ex, ac, 0.005);
    expect(out.every(d => d.match)).toBe(true);
    expect(out).toHaveLength(2);
  });

  it("missing dimension → match=false with reason", () => {
    const ex = [dim("d1", "OD", 0.5)];
    const out = diffDimensions(ex, [], 0.005);
    expect(out[0].match).toBe(false);
    expect(out[0].actual).toBeNull();
    expect(out[0].reason).toMatch(/missing/);
  });

  it("out-of-tolerance → match=false with delta cited", () => {
    const ex = [dim("d1", "OD", 0.500)];
    const ac = [dim("d1", "OD", 0.520)];
    const out = diffDimensions(ex, ac, 0.005);
    expect(out[0].match).toBe(false);
    expect(out[0].delta).toBeCloseTo(0.020, 5);
    expect(out[0].reason).toMatch(/out of tolerance/);
  });

  it("uses case-specific asymmetric tolerance when supplied", () => {
    const ex = [dim("d1", "OD", 0.500, { tolerance: { lower: -0.0001, upper: 0.0005 } })];
    const ac = [dim("d1", "OD", 0.5003)];
    const out = diffDimensions(ex, ac, 0.005);
    // effective tol = max(|−0.0001|, |0.0005|) = 0.0005; delta=0.0003 ≤ 0.0005 → match
    expect(out[0].match).toBe(true);
  });

  it("non-finite actual → match=false", () => {
    const ex = [dim("d1", "OD", 0.5)];
    const ac = [dim("d1", "OD", NaN)];
    const out = diffDimensions(ex, ac, 0.005);
    expect(out[0].match).toBe(false);
    expect(out[0].reason).toMatch(/non-finite/);
  });
});

describe("computeMatchRate", () => {
  it("empty → 0", () => expect(computeMatchRate([])).toBe(0));
  it("3 of 4 pass → 0.75", () => {
    const diffs = [
      { id: "a", label: "", expected: 1, actual: 1, delta: 0, tolerance: 0, match: true, reason: "" },
      { id: "b", label: "", expected: 1, actual: 2, delta: 1, tolerance: 0, match: false, reason: "" },
      { id: "c", label: "", expected: 1, actual: 1, delta: 0, tolerance: 0, match: true, reason: "" },
      { id: "d", label: "", expected: 1, actual: 1, delta: 0, tolerance: 0, match: true, reason: "" },
    ];
    expect(computeMatchRate(diffs)).toBe(0.75);
  });
});

// ── DefaultIntentBuilder ─────────────────────────────────────────────────────

describe("DefaultIntentBuilder", () => {
  it("includes printPath + dim summary in intent", () => {
    const ocr: PrintOcrResult = {
      printPath: "/jm/od_pin.pdf",
      dimensions: [dim("d1", "OD", 0.500), dim("d2", "len", 1.250)],
      features: [],
    };
    const out = new DefaultIntentBuilder().build(ocr);
    expect(out.intent).toContain("/jm/od_pin.pdf");
    expect(out.intent).toContain("OD=0.5");
    expect(out.intent).toContain("len=1.25");
  });

  it("intent length is capped at 1000 chars", () => {
    const ocr: PrintOcrResult = {
      printPath: "x".repeat(2000),
      dimensions: [],
      features: [],
    };
    const out = new DefaultIntentBuilder().build(ocr);
    expect(out.intent.length).toBeLessThanOrEqual(1000);
  });
});

// ── Engine.validate — happy + fail paths ─────────────────────────────────────

describe("CADRoundTripValidationEngine.validate", () => {
  it("rejects empty printPath", async () => {
    const eng = new CADRoundTripValidationEngine();
    const r = await eng.validate("", makeDeps());
    expect(r.passed).toBe(false);
    expect(r.step).toBe("ocr");
    expect(r.error).toMatch(/printPath must be non-empty/);
  });

  it("ocr throws → step=ocr fail", async () => {
    const r = await new CADRoundTripValidationEngine().validate("/p.pdf", makeDeps({ ocrThrow: true }));
    expect(r.step).toBe("ocr");
    expect(r.passed).toBe(false);
    expect(r.error).toMatch(/ocrPrint threw/);
  });

  it("draw did not export → step=draw fail", async () => {
    const r = await new CADRoundTripValidationEngine().validate("/p.pdf", makeDeps({
      ocr: { printPath: "/p.pdf", dimensions: [], features: [] },
      drawResult: makeDrawResult({ exportedSuccessfully: false, stopReason: "max-ops" }),
    }));
    expect(r.step).toBe("draw");
    expect(r.drawExported).toBe(false);
    expect(r.error).toMatch(/did not export/);
  });

  it("happy round-trip: 2 dims match → passed=true", async () => {
    const dims = [dim("d1", "OD", 0.500), dim("d2", "len", 1.250)];
    const r = await new CADRoundTripValidationEngine().validate("/jm/pin.pdf", makeDeps({
      ocr: { printPath: "/jm/pin.pdf", dimensions: dims, features: [] },
      cadDims: dims,
      regenDims: dims,
    }), { passGate: 0.99 });
    expect(r.passed).toBe(true);
    expect(r.step).toBe("complete");
    expect(r.dimensionMatchRate).toBe(1);
    expect(r.diffs).toHaveLength(2);
  });

  it("partial mismatch below gate → passed=false", async () => {
    const ex = [dim("d1", "OD", 0.500), dim("d2", "len", 1.250)];
    const drift = [dim("d1", "OD", 0.500), dim("d2", "len", 1.300)]; // 50 thou off
    const r = await new CADRoundTripValidationEngine().validate("/p.pdf", makeDeps({
      ocr: { printPath: "/p.pdf", dimensions: ex, features: [] },
      regenDims: drift,
    }), { tolerance: 0.005, passGate: 0.95 });
    expect(r.passed).toBe(false);
    expect(r.dimensionMatchRate).toBe(0.5);
    expect(r.diffs[1].match).toBe(false);
  });

  it("dimension extractor throws → step=extract fail (draw still counted exported)", async () => {
    const r = await new CADRoundTripValidationEngine().validate("/p.pdf", makeDeps({
      ocr: { printPath: "/p.pdf", dimensions: [dim("d1", "OD", 0.5)], features: [] },
      cadDimensionExtractor: { extract: async () => { throw new Error("brep blew up"); } },
    }));
    expect(r.step).toBe("extract");
    expect(r.drawExported).toBe(true);
    expect(r.error).toMatch(/cadDimensionExtractor threw/);
  });

  it("printGenerator throws → step=regen-print fail", async () => {
    const r = await new CADRoundTripValidationEngine().validate("/p.pdf", makeDeps({
      ocr: { printPath: "/p.pdf", dimensions: [dim("d1", "OD", 0.5)], features: [] },
      printGenerator: { generate: async () => { throw new Error("print render blew up"); } },
    }));
    expect(r.step).toBe("regen-print");
    expect(r.error).toMatch(/printGenerator threw/);
  });

  it("preserves ranAtIso from injected now()", async () => {
    const r = await new CADRoundTripValidationEngine().validate("/p.pdf", makeDeps(), {
      now: () => new Date("2026-05-23T12:00:00.000Z"),
    });
    expect(r.ranAtIso).toBe("2026-05-23T12:00:00.000Z");
  });
});

describe("singleton + plugin compat", () => {
  it("singleton instance is the engine class", () => {
    expect(cadRoundTripValidationEngine).toBeInstanceOf(CADRoundTripValidationEngine);
  });
});
