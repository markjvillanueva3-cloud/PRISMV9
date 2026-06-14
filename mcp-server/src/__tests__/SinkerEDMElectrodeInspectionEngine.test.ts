/**
 * Tests for SinkerEDMElectrodeInspectionEngine — electrode/cavity inspection
 * with spark-gap back-calculation (muS-D58..D59 / ARC-MS10).
 *
 * Reference values are hand-computed from the die-sinking overcut model
 * (cavity = electrode + 2·gap) so each test fails if the logic regresses.
 */

import { describe, it, expect } from "vitest";
import {
  sinkerEDMElectrodeInspectionEngine,
  SinkerEDMElectrodeInspectionInputSchema,
} from "../engines/SinkerEDMElectrodeInspectionEngine.js";

describe("SinkerEDMElectrodeInspectionEngine — back-calculation", () => {
  it("back-calculates the spark gap as (cavity − electrode) / 2", () => {
    // electrode 8.0, cavity 8.40 → gap = 0.40 / 2 = 0.20 mm.
    const r = sinkerEDMElectrodeInspectionEngine.inspect({
      features: [
        { label: "bore", electrodeSizeMm: 8.0, measuredCavityMm: 8.4, expectedSparkGapMm: 0.2 },
      ],
    });
    expect(r.features[0].actualSparkGapMm).toBeCloseTo(0.2, 6);
    expect(r.features[0].gapDeviationMm).toBeCloseTo(0, 6);
  });

  it("passes a feature whose back-calculated gap matches the expected gap", () => {
    const r = sinkerEDMElectrodeInspectionEngine.inspect({
      features: [
        { label: "pocket", electrodeSizeMm: 10, measuredCavityMm: 10.1, expectedSparkGapMm: 0.05 },
      ],
    });
    expect(r.features[0].status).toBe("pass");
    expect(r.features[0].findings).toHaveLength(0);
    expect(r.verdict).toBe("pass");
  });
});

describe("SinkerEDMElectrodeInspectionEngine — off-target gap diagnosis", () => {
  it("fails an over-burned cavity and diagnoses excess discharge energy", () => {
    // electrode 10, cavity 10.30 → gap 0.15, expected 0.05 → deviation +0.10.
    // Default tolerance = 0.25 × 0.05 = 0.0125 mm → out of tolerance.
    const r = sinkerEDMElectrodeInspectionEngine.inspect({
      features: [
        { label: "rib", electrodeSizeMm: 10, measuredCavityMm: 10.3, expectedSparkGapMm: 0.05 },
      ],
    });
    expect(r.features[0].status).toBe("fail");
    expect(r.features[0].gapDeviationMm).toBeCloseTo(0.1, 6);
    expect(r.features[0].gapToleranceMm).toBeCloseTo(0.0125, 6);
    expect(r.features[0].findings.length).toBeGreaterThan(0);
    expect(r.features[0].findings[0].cause).toMatch(/energy above/i);
    expect(r.verdict).toBe("fail");
  });

  it("fails an under-burned cavity and diagnoses insufficient discharge energy", () => {
    // electrode 10, cavity 10.04 → gap 0.02, expected 0.05 → deviation −0.03.
    const r = sinkerEDMElectrodeInspectionEngine.inspect({
      features: [
        { label: "slot", electrodeSizeMm: 10, measuredCavityMm: 10.04, expectedSparkGapMm: 0.05 },
      ],
    });
    expect(r.features[0].status).toBe("fail");
    expect(r.features[0].gapDeviationMm).toBeCloseTo(-0.03, 6);
    expect(r.features[0].findings[0].cause).toMatch(/energy below/i);
  });

  it("ranks diagnosis findings by descending confidence", () => {
    const r = sinkerEDMElectrodeInspectionEngine.inspect({
      features: [
        { label: "rib", electrodeSizeMm: 10, measuredCavityMm: 10.3, expectedSparkGapMm: 0.05 },
      ],
    });
    const f = r.features[0].findings;
    expect(f.length).toBeGreaterThan(1);
    for (let i = 1; i < f.length; i++) {
      expect(f[i - 1].confidence).toBeGreaterThanOrEqual(f[i].confidence);
    }
  });
});

describe("SinkerEDMElectrodeInspectionEngine — measurement errors", () => {
  it("flags a cavity not larger than the electrode as a measurement error", () => {
    // cavity 9.8 < electrode 10 → back-calc gap −0.1, physically impossible.
    const r = sinkerEDMElectrodeInspectionEngine.inspect({
      features: [
        { label: "bad", electrodeSizeMm: 10, measuredCavityMm: 9.8, expectedSparkGapMm: 0.05 },
      ],
    });
    expect(r.features[0].status).toBe("measurement_error");
    expect(r.features[0].gapDeviationMm).toBeNull(); // not physically meaningful
    expect(r.warnings.some((w) => /not\s+larger/i.test(w))).toBe(true);
    expect(r.verdict).toBe("fail");
  });

  it("treats an exactly-equal cavity and electrode as a measurement error", () => {
    const r = sinkerEDMElectrodeInspectionEngine.inspect({
      features: [
        { label: "eq", electrodeSizeMm: 10, measuredCavityMm: 10, expectedSparkGapMm: 0.05 },
      ],
    });
    expect(r.features[0].status).toBe("measurement_error");
  });

  it("does not crash when every feature is a measurement error", () => {
    const r = sinkerEDMElectrodeInspectionEngine.inspect({
      features: [
        { label: "a", electrodeSizeMm: 10, measuredCavityMm: 9.5, expectedSparkGapMm: 0.05 },
        { label: "b", electrodeSizeMm: 12, measuredCavityMm: 11.0, expectedSparkGapMm: 0.05 },
      ],
    });
    expect(r.meanSparkGapMm).toBe(0);
    expect(r.sparkGapStdDevMm).toBe(0);
    expect(r.gapConsistent).toBe(true); // < 2 valid gaps → short-circuit
    expect(r.verdict).toBe("fail");
    expect(r.tally.measurementError).toBe(2);
  });
});

describe("SinkerEDMElectrodeInspectionEngine — tolerance resolution", () => {
  it("honours a per-feature gap tolerance over the relative default", () => {
    // gap 0.08, expected 0.05 → deviation +0.03. Relative default 0.0125 would
    // fail; the per-feature 0.1 tolerance passes it.
    const r = sinkerEDMElectrodeInspectionEngine.inspect({
      features: [
        {
          label: "f",
          electrodeSizeMm: 10,
          measuredCavityMm: 10.16,
          expectedSparkGapMm: 0.05,
          gapToleranceMm: 0.1,
        },
      ],
    });
    expect(r.features[0].gapToleranceMm).toBeCloseTo(0.1, 6);
    expect(r.features[0].status).toBe("pass");
  });

  it("applies the batch default tolerance when a feature omits its own", () => {
    const r = sinkerEDMElectrodeInspectionEngine.inspect({
      features: [
        { label: "f", electrodeSizeMm: 10, measuredCavityMm: 10.16, expectedSparkGapMm: 0.05 },
      ],
      defaultGapToleranceMm: 0.1,
    });
    expect(r.features[0].gapToleranceMm).toBeCloseTo(0.1, 6);
    expect(r.features[0].status).toBe("pass");
  });

  it("falls back to 25% of the expected gap when no tolerance is supplied", () => {
    const r = sinkerEDMElectrodeInspectionEngine.inspect({
      features: [
        { label: "f", electrodeSizeMm: 10, measuredCavityMm: 10.3, expectedSparkGapMm: 0.05 },
      ],
    });
    expect(r.features[0].gapToleranceMm).toBeCloseTo(0.0125, 6); // 0.25 × 0.05
  });
});

describe("SinkerEDMElectrodeInspectionEngine — cross-feature consistency", () => {
  it("reports consistent spark gaps across an even burn", () => {
    const r = sinkerEDMElectrodeInspectionEngine.inspect({
      features: [
        { label: "a", electrodeSizeMm: 10, measuredCavityMm: 10.1, expectedSparkGapMm: 0.05 },
        { label: "b", electrodeSizeMm: 10, measuredCavityMm: 10.1, expectedSparkGapMm: 0.05 },
        { label: "c", electrodeSizeMm: 10, measuredCavityMm: 10.1, expectedSparkGapMm: 0.05 },
      ],
    });
    expect(r.meanSparkGapMm).toBeCloseTo(0.05, 6);
    expect(r.sparkGapStdDevMm).toBeCloseTo(0, 6);
    expect(r.gapConsistent).toBe(true);
  });

  it("flags an uneven burn when one feature's gap diverges", () => {
    // gaps 0.05, 0.05, 0.20 → mean 0.10, std-dev ≈ 0.0707 > 0.15 × 0.10.
    const r = sinkerEDMElectrodeInspectionEngine.inspect({
      features: [
        { label: "a", electrodeSizeMm: 10, measuredCavityMm: 10.1, expectedSparkGapMm: 0.05 },
        { label: "b", electrodeSizeMm: 10, measuredCavityMm: 10.1, expectedSparkGapMm: 0.05 },
        { label: "c", electrodeSizeMm: 10, measuredCavityMm: 10.4, expectedSparkGapMm: 0.05 },
      ],
    });
    expect(r.meanSparkGapMm).toBeCloseTo(0.1, 6);
    expect(r.sparkGapStdDevMm).toBeCloseTo(0.0707, 3);
    expect(r.gapConsistent).toBe(false);
    expect(r.warnings.some((w) => /varies markedly|uneven/i.test(w))).toBe(true);
  });

  it("treats a single feature as trivially consistent", () => {
    const r = sinkerEDMElectrodeInspectionEngine.inspect({
      features: [
        { label: "only", electrodeSizeMm: 10, measuredCavityMm: 10.1, expectedSparkGapMm: 0.05 },
      ],
    });
    expect(r.gapConsistent).toBe(true);
    expect(r.sparkGapStdDevMm).toBe(0);
  });
});

describe("SinkerEDMElectrodeInspectionEngine — verdict & tally", () => {
  it("returns verdict 'pass' only when every feature passes", () => {
    const r = sinkerEDMElectrodeInspectionEngine.inspect({
      features: [
        { label: "a", electrodeSizeMm: 10, measuredCavityMm: 10.1, expectedSparkGapMm: 0.05 },
        { label: "b", electrodeSizeMm: 10, measuredCavityMm: 10.3, expectedSparkGapMm: 0.05 }, // fail
      ],
    });
    expect(r.verdict).toBe("fail");
    expect(r.tally).toEqual({ pass: 1, fail: 1, measurementError: 0 });
  });
});

describe("SinkerEDMElectrodeInspectionEngine — input validation", () => {
  it("rejects malformed input", () => {
    expect(() => sinkerEDMElectrodeInspectionEngine.inspect(null)).toThrow();
    expect(() => sinkerEDMElectrodeInspectionEngine.inspect({})).toThrow();
    expect(() =>
      sinkerEDMElectrodeInspectionEngine.inspect({ features: [] }),
    ).toThrow(); // at least one feature required
  });

  it("rejects a non-positive electrode or cavity size", () => {
    expect(() =>
      SinkerEDMElectrodeInspectionInputSchema.parse({
        features: [
          { label: "x", electrodeSizeMm: -1, measuredCavityMm: 10, expectedSparkGapMm: 0.05 },
        ],
      }),
    ).toThrow();
    expect(() =>
      SinkerEDMElectrodeInspectionInputSchema.parse({
        features: [
          { label: "x", electrodeSizeMm: 10, measuredCavityMm: 0, expectedSparkGapMm: 0.05 },
        ],
      }),
    ).toThrow();
  });

  it("parses a well-formed input", () => {
    const parsed = SinkerEDMElectrodeInspectionInputSchema.parse({
      features: [
        { label: "p", electrodeSizeMm: 10, measuredCavityMm: 10.1, expectedSparkGapMm: 0.05 },
      ],
      defaultGapToleranceMm: 0.02,
    });
    expect(parsed.features).toHaveLength(1);
    expect(parsed.defaultGapToleranceMm).toBe(0.02);
  });
});
