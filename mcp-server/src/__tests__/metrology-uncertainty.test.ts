import { describe, it, expect } from "vitest";
import {
  metrologyUncertaintyEngine,
  MetrologyUncertaintyEngine,
  GAGE_UNCERTAINTY_DATABASE,
  MATERIAL_CTE_DATABASE,
} from "../engines/MetrologyUncertaintyEngine";

const engine = metrologyUncertaintyEngine;

// ── 1. Type A Evaluation ────────────────────────────────────────────

describe("GUM Type A Evaluation", () => {
  it("computes correct u_A for 10 repeated measurements", () => {
    // 10 measurements of a 25mm gage block
    const measurements = [
      25.0012, 25.0015, 25.0008, 25.0011, 25.0013,
      25.0009, 25.0014, 25.0010, 25.0012, 25.0011,
    ];
    const result = engine.typeAEvaluation(measurements);

    expect(result.n).toBe(10);
    expect(result.degreesOfFreedom).toBe(9);

    // Mean should be close to 25.00115
    expect(result.mean).toBeCloseTo(25.00115, 5);

    // s = sample std dev
    const manualMean = measurements.reduce((a, b) => a + b, 0) / 10;
    const manualS = Math.sqrt(
      measurements.reduce((s, v) => s + (v - manualMean) ** 2, 0) / 9
    );
    expect(result.standardDeviation).toBeCloseTo(manualS, 8);

    // u_A = s / sqrt(n)
    expect(result.standardUncertainty).toBeCloseTo(manualS / Math.sqrt(10), 8);
  });

  it("throws for fewer than 2 measurements", () => {
    expect(() => engine.typeAEvaluation([1.0])).toThrow(
      "at least 2 measurements"
    );
  });

  it("handles single-value edge case with exactly 2 measurements", () => {
    const result = engine.typeAEvaluation([10.0, 10.0]);
    expect(result.standardUncertainty).toBe(0);
    expect(result.degreesOfFreedom).toBe(1);
  });
});

// ── 2. Type B Evaluation ────────────────────────────────────────────

describe("GUM Type B Evaluation", () => {
  it("rectangular distribution: u = a / sqrt(3)", () => {
    const result = engine.typeBEvaluation(0.01, "rectangular");
    expect(result.standardUncertainty).toBeCloseTo(0.01 / Math.sqrt(3), 8);
    expect(result.degreesOfFreedom).toBe(Infinity);
  });

  it("triangular distribution: u = a / sqrt(6)", () => {
    const result = engine.typeBEvaluation(0.01, "triangular");
    expect(result.standardUncertainty).toBeCloseTo(0.01 / Math.sqrt(6), 8);
  });

  it("U-shaped distribution: u = a / sqrt(2)", () => {
    const result = engine.typeBEvaluation(0.005, "u-shaped");
    expect(result.standardUncertainty).toBeCloseTo(0.005 / Math.sqrt(2), 8);
  });

  it("normal distribution: u = a / k", () => {
    const result = engine.typeBEvaluation(0.02, "normal", 2);
    expect(result.standardUncertainty).toBeCloseTo(0.01, 8);
  });

  it("zero half-width yields zero uncertainty", () => {
    const result = engine.typeBEvaluation(0, "rectangular");
    expect(result.standardUncertainty).toBe(0);
  });
});

// ── 3. Combined Standard Uncertainty ────────────────────────────────

describe("Combined Standard Uncertainty", () => {
  it("combines multiple uncorrelated sources via RSS", () => {
    const sources = [
      {
        name: "gage_resolution",
        standardUncertainty: 0.001,
        sensitivityCoefficient: 1,
        degreesOfFreedom: Infinity,
        type: "B" as const,
      },
      {
        name: "repeatability",
        standardUncertainty: 0.002,
        sensitivityCoefficient: 1,
        degreesOfFreedom: 9,
        type: "A" as const,
      },
      {
        name: "temperature",
        standardUncertainty: 0.0015,
        sensitivityCoefficient: 1,
        degreesOfFreedom: Infinity,
        type: "B" as const,
      },
    ];
    const result = engine.combinedUncertainty(sources);
    const expected = Math.sqrt(0.001 ** 2 + 0.002 ** 2 + 0.0015 ** 2);
    expect(result.combinedUncertainty).toBeCloseTo(expected, 8);
    expect(result.contributions).toHaveLength(3);

    // Contributions should sum to 100%
    const totalPct = result.contributions.reduce(
      (s, c) => s + c.percentage,
      0
    );
    expect(totalPct).toBeCloseTo(100, 5);
  });

  it("handles sensitivity coefficients", () => {
    const sources = [
      {
        name: "x",
        standardUncertainty: 0.01,
        sensitivityCoefficient: 2,
        degreesOfFreedom: Infinity,
        type: "B" as const,
      },
      {
        name: "y",
        standardUncertainty: 0.02,
        sensitivityCoefficient: 0.5,
        degreesOfFreedom: Infinity,
        type: "B" as const,
      },
    ];
    const result = engine.combinedUncertainty(sources);
    const expected = Math.sqrt((2 * 0.01) ** 2 + (0.5 * 0.02) ** 2);
    expect(result.combinedUncertainty).toBeCloseTo(expected, 8);
  });

  it("returns zero for empty sources", () => {
    const result = engine.combinedUncertainty([]);
    expect(result.combinedUncertainty).toBe(0);
  });

  it("handles correlated sources with covariance matrix", () => {
    const ci = [1, 1];
    // Two sources with u1=0.01, u2=0.02, correlation r=0.5
    const u1 = 0.01;
    const u2 = 0.02;
    const r = 0.5;
    const cov = [
      [u1 ** 2, r * u1 * u2],
      [r * u1 * u2, u2 ** 2],
    ];
    const uc = engine.combinedUncertaintyCorrelated(ci, cov);
    const expected = Math.sqrt(
      u1 ** 2 + u2 ** 2 + 2 * r * u1 * u2
    );
    expect(uc).toBeCloseTo(expected, 8);
  });
});

// ── 4. Welch-Satterthwaite Effective DOF ────────────────────────────

describe("Welch-Satterthwaite Effective DOF", () => {
  it("computes correct effective DOF for mixed A/B sources", () => {
    const sources = [
      {
        name: "typeA",
        standardUncertainty: 0.003,
        sensitivityCoefficient: 1,
        degreesOfFreedom: 9,
        type: "A" as const,
      },
      {
        name: "typeB",
        standardUncertainty: 0.002,
        sensitivityCoefficient: 1,
        degreesOfFreedom: Infinity,
        type: "B" as const,
      },
    ];
    const result = engine.combinedUncertainty(sources);
    // Type B with infinite DOF does not limit effective DOF
    // ν_eff = uc^4 / (c1^4*u1^4/ν1)
    const uc = result.combinedUncertainty;
    const expectedDOF = uc ** 4 / (0.003 ** 4 / 9);
    expect(result.effectiveDOF).toBeCloseTo(expectedDOF, 1);
  });

  it("returns Infinity when all sources have infinite DOF", () => {
    const sources = [
      {
        name: "b1",
        standardUncertainty: 0.01,
        sensitivityCoefficient: 1,
        degreesOfFreedom: Infinity,
        type: "B" as const,
      },
      {
        name: "b2",
        standardUncertainty: 0.02,
        sensitivityCoefficient: 1,
        degreesOfFreedom: Infinity,
        type: "B" as const,
      },
    ];
    const result = engine.combinedUncertainty(sources);
    expect(result.effectiveDOF).toBe(Infinity);
  });
});

// ── 5. Expanded Uncertainty ─────────────────────────────────────────

describe("Expanded Uncertainty", () => {
  it("U always greater than or equal to u_c", () => {
    const sources = [
      {
        name: "a",
        standardUncertainty: 0.005,
        sensitivityCoefficient: 1,
        degreesOfFreedom: 5,
        type: "A" as const,
      },
      {
        name: "b",
        standardUncertainty: 0.003,
        sensitivityCoefficient: 1,
        degreesOfFreedom: Infinity,
        type: "B" as const,
      },
    ];
    const result = engine.expandedUncertainty(sources, 0.95);
    expect(result.expandedUncertainty).toBeGreaterThanOrEqual(
      result.combinedUncertainty
    );
    expect(result.coverageFactor).toBeGreaterThanOrEqual(2.0);
    expect(result.confidenceLevel).toBe(0.95);
  });

  it("uses k=2 for large DOF (normal approx)", () => {
    const sources = [
      {
        name: "b1",
        standardUncertainty: 0.01,
        sensitivityCoefficient: 1,
        degreesOfFreedom: Infinity,
        type: "B" as const,
      },
    ];
    const result = engine.expandedUncertainty(sources, 0.95);
    expect(result.coverageFactor).toBe(2.0);
    expect(result.expandedUncertainty).toBeCloseTo(0.02, 8);
  });
});

// ── 6. CMM Measurement Uncertainty ──────────────────────────────────

describe("CMM Measurement Uncertainty", () => {
  it("calculates CMM uncertainty with temperature correction", () => {
    const result = engine.cmmUncertainty({
      measuredLength: 100,
      partMaterial: "aluminum_6061",
      ambientTemperature: 22,
      temperatureUncertainty: 1.0,
      probeRepeatability: 0.001,
      cmmManufacturer: "zeiss",
    });

    // Temperature correction: 100 × 23.6e-6 × (22-20) = 0.00472 mm
    expect(result.temperatureCorrection).toBeCloseTo(
      100 * 23.6e-6 * 2,
      6
    );

    // All uncertainties should be positive
    expect(result.probeUncertainty).toBeGreaterThan(0);
    expect(result.temperatureUncertainty).toBeGreaterThan(0);
    expect(result.mpeUncertainty).toBeGreaterThan(0);
    expect(result.totalUncertainty).toBeGreaterThan(0);

    // Expanded = 2 × combined
    expect(result.expandedUncertainty).toBeCloseTo(
      2 * result.totalUncertainty,
      8
    );
  });

  it("computes CTE mismatch uncertainty", () => {
    const result = engine.cmmUncertainty({
      measuredLength: 200,
      partMaterial: "aluminum_6061",
      ambientTemperature: 21,
      temperatureUncertainty: 0.5,
      probeRepeatability: 0.001,
      scaleCTE: 11.5e-6,
    });

    // CTE mismatch: 200 × |23.6e-6 - 11.5e-6| × (0.5/sqrt(3))
    const cteDiff = Math.abs(23.6e-6 - 11.5e-6);
    const expectedCTE = 200 * cteDiff * (0.5 / Math.sqrt(3));
    expect(result.cteMismatchUncertainty).toBeCloseTo(expectedCTE, 8);
    expect(result.cteMismatchUncertainty).toBeGreaterThan(0);
  });
});

// ── 7. Gage R&R Analysis ────────────────────────────────────────────

describe("Gage R&R (AIAG MSA)", () => {
  /**
   * Generate synthetic Gage R&R data:
   * 3 operators, 10 parts, 3 repeats.
   * Parts vary from 10.0 to 10.9 in 0.1 increments.
   * Small operator bias and repeat noise added.
   */
  function generateGageRRData(): number[][][] {
    const data: number[][][] = [];
    const partNominals = Array.from({ length: 10 }, (_, i) => 10.0 + i * 0.1);
    const operatorBias = [0, 0.002, -0.001];
    const repeatNoise = [
      // Operator 0
      [
        [0.001, -0.001, 0.000], [0.002, 0.000, -0.001],
        [-0.001, 0.001, 0.000], [0.000, -0.002, 0.001],
        [0.001, 0.001, -0.001], [-0.001, 0.000, 0.001],
        [0.000, 0.002, -0.001], [0.001, -0.001, 0.000],
        [-0.001, 0.001, 0.001], [0.000, 0.000, -0.001],
      ],
      // Operator 1
      [
        [0.000, 0.001, -0.001], [-0.001, 0.001, 0.000],
        [0.001, 0.000, -0.001], [0.000, 0.001, 0.001],
        [-0.001, -0.001, 0.001], [0.001, 0.000, 0.000],
        [0.000, -0.001, 0.001], [-0.001, 0.001, 0.000],
        [0.001, 0.000, -0.001], [0.000, 0.001, 0.001],
      ],
      // Operator 2
      [
        [-0.001, 0.000, 0.001], [0.001, -0.001, 0.000],
        [0.000, 0.001, -0.001], [-0.001, 0.000, 0.001],
        [0.001, 0.001, 0.000], [0.000, -0.001, -0.001],
        [-0.001, 0.001, 0.000], [0.001, 0.000, -0.001],
        [0.000, -0.001, 0.001], [0.001, 0.000, 0.000],
      ],
    ];

    for (let op = 0; op < 3; op++) {
      const opData: number[][] = [];
      for (let part = 0; part < 10; part++) {
        const partData: number[] = [];
        for (let rep = 0; rep < 3; rep++) {
          partData.push(
            partNominals[part] + operatorBias[op] + repeatNoise[op][part][rep]
          );
        }
        opData.push(partData);
      }
      data.push(opData);
    }
    return data;
  }

  it("computes %GRR and makes correct decision", () => {
    const data = generateGageRRData();
    const tolerance = 0.1; // ±0.05
    const result = engine.gageRR({ measurements: data, tolerance });

    expect(result.EV).toBeGreaterThan(0);
    expect(result.GRR).toBeGreaterThan(0);
    expect(result.PV).toBeGreaterThan(0);
    expect(result.TV).toBeGreaterThan(0);

    // GRR = sqrt(EV^2 + AV^2)
    expect(result.GRR).toBeCloseTo(
      Math.sqrt(result.EV ** 2 + result.AV ** 2),
      8
    );

    // TV = sqrt(GRR^2 + PV^2)
    expect(result.TV).toBeCloseTo(
      Math.sqrt(result.GRR ** 2 + result.PV ** 2),
      8
    );

    // With small noise and large part variation, %GRR should be small
    expect(result.percentGRR).toBeLessThan(30);
    expect(["acceptable", "marginal"]).toContain(result.decision);
  });

  it("ndc matches AIAG formula ndc = floor(1.41 * PV / GRR)", () => {
    const data = generateGageRRData();
    const result = engine.gageRR({ measurements: data, tolerance: 0.1 });
    const expectedNdc = Math.floor(1.41 * (result.PV / result.GRR));
    expect(result.ndc).toBe(expectedNdc);
  });

  it("flags 100% GRR scenario as unacceptable", () => {
    // All parts identical → PV ≈ 0, %GRR will be very high
    const data: number[][][] = [];
    for (let op = 0; op < 2; op++) {
      const opData: number[][] = [];
      for (let part = 0; part < 3; part++) {
        // Large random noise relative to tolerance
        opData.push([10.0 + op * 0.05, 10.0 - op * 0.03, 10.0 + op * 0.04]);
      }
      data.push(opData);
    }
    const result = engine.gageRR({ measurements: data, tolerance: 0.01 });
    expect(result.percentGRR).toBeGreaterThan(30);
    expect(result.decision).toBe("unacceptable");
  });
});

// ── 8. Measurement Decision Risk ────────────────────────────────────

describe("Measurement Decision Risk", () => {
  it("calculates conformance probability for centered measurement", () => {
    // Measurement exactly at center of tolerance band
    const result = engine.measurementDecisionRisk(10.0, 9.95, 10.05, 0.005);
    // Should be very high conformance probability
    expect(result.conformanceProbability).toBeGreaterThan(0.99);
    expect(result.toleranceZone).toBeCloseTo(0.1, 8);
  });

  it("applies guard banding correctly", () => {
    const u = 0.005;
    const k = 2;
    const result = engine.measurementDecisionRisk(10.0, 9.95, 10.05, u, k);
    // Guard banded zone = tolerance - 2*U = 0.1 - 2*(2*0.005) = 0.08
    expect(result.guardBandedZone).toBeCloseTo(0.08, 8);
  });

  it("shows higher risk for measurement near spec limit", () => {
    const centered = engine.measurementDecisionRisk(
      10.0, 9.95, 10.05, 0.005
    );
    const nearLimit = engine.measurementDecisionRisk(
      10.04, 9.95, 10.05, 0.005
    );
    // Measurement near limit → lower conformance probability
    expect(nearLimit.conformanceProbability).toBeLessThan(
      centered.conformanceProbability
    );
    // Consumer risk higher near boundary
    expect(nearLimit.consumerRisk).toBeGreaterThan(centered.consumerRisk);
  });
});

// ── 9. Surface Texture Uncertainty ──────────────────────────────────

describe("Surface Texture Uncertainty", () => {
  it("calculates Ra uncertainty with default percentages", () => {
    const result = engine.surfaceTextureUncertainty(1.6);

    // Default contributions: 2%, 3%, 1%, 2%, 3% of Ra
    const uCutoff = 1.6 * 0.02;
    const uStylus = 1.6 * 0.03;
    const uSpeed = 1.6 * 0.01;
    const uFilter = 1.6 * 0.02;
    const uRepeat = 1.6 * 0.03;
    const expectedUc = Math.sqrt(
      uCutoff ** 2 + uStylus ** 2 + uSpeed ** 2 + uFilter ** 2 + uRepeat ** 2
    );

    expect(result.standardUncertainty).toBeCloseTo(expectedUc, 8);
    expect(result.expandedUncertainty).toBeCloseTo(2 * expectedUc, 8);

    // Relative uncertainty should be in 5-15% range
    expect(result.relativeUncertaintyPercent).toBeGreaterThan(5);
    expect(result.relativeUncertaintyPercent).toBeLessThan(15);
  });

  it("handles custom uncertainty sources", () => {
    const result = engine.surfaceTextureUncertainty(0.8, 0.02, 0.03, 0.01, 0.02, 0.03);
    const expectedUc = Math.sqrt(
      0.02 ** 2 + 0.03 ** 2 + 0.01 ** 2 + 0.02 ** 2 + 0.03 ** 2
    );
    expect(result.standardUncertainty).toBeCloseTo(expectedUc, 8);
  });
});

// ── 10. Database Lookups ────────────────────────────────────────────

describe("Database Lookups", () => {
  it("retrieves gage uncertainty values", () => {
    const u = engine.getGageUncertainty("micrometer_0_25");
    expect(u).toBe(0.001);
    expect(engine.getGageUncertainty("nonexistent")).toBeUndefined();
  });

  it("retrieves material CTE values", () => {
    const cte = engine.getMaterialCTE("aluminum_6061");
    expect(cte).toBe(23.6e-6);
    expect(engine.getMaterialCTE("nonexistent")).toBeUndefined();
  });

  it("lists all materials and gages", () => {
    const materials = engine.listMaterials();
    expect(materials.length).toBeGreaterThanOrEqual(10);
    const gages = engine.listGages();
    expect(gages.length).toBeGreaterThanOrEqual(10);
  });
});

// ── 11. Edge Cases & Consistency ────────────────────────────────────

describe("Edge Cases & Consistency", () => {
  it("expanded U is always >= combined u_c for any source config", () => {
    const configs = [
      [{ name: "a", standardUncertainty: 0.1, degreesOfFreedom: 3, type: "A" as const }],
      [{ name: "b", standardUncertainty: 0.05, degreesOfFreedom: Infinity, type: "B" as const }],
      [
        { name: "a", standardUncertainty: 0.01, degreesOfFreedom: 4, type: "A" as const },
        { name: "b", standardUncertainty: 0.02, degreesOfFreedom: Infinity, type: "B" as const },
        { name: "c", standardUncertainty: 0.015, degreesOfFreedom: 20, type: "A" as const },
      ],
    ];
    for (const sources of configs) {
      const filled = sources.map((s) => ({
        ...s,
        sensitivityCoefficient: 1,
      }));
      const result = engine.expandedUncertainty(filled, 0.95);
      expect(result.expandedUncertainty).toBeGreaterThanOrEqual(
        result.combinedUncertainty
      );
    }
  });

  it("zero uncertainty source does not affect combined result", () => {
    const sources = [
      {
        name: "real",
        standardUncertainty: 0.01,
        sensitivityCoefficient: 1,
        degreesOfFreedom: Infinity,
        type: "B" as const,
      },
      {
        name: "zero",
        standardUncertainty: 0,
        sensitivityCoefficient: 1,
        degreesOfFreedom: Infinity,
        type: "B" as const,
      },
    ];
    const result = engine.combinedUncertainty(sources);
    expect(result.combinedUncertainty).toBeCloseTo(0.01, 8);
  });

  it("class can be instantiated independently", () => {
    const eng = new MetrologyUncertaintyEngine();
    const r = eng.typeBEvaluation(0.01, "rectangular");
    expect(r.standardUncertainty).toBeGreaterThan(0);
  });
});
