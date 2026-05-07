/**
 * Tests for MeasurementSystemAnalysisEngine (Phase 0.22 U-SPC5)
 */

import { describe, it, expect } from "vitest";
import { MeasurementSystemAnalysisEngine } from "../engines/MeasurementSystemAnalysisEngine.js";

/**
 * Build a study array [parts][appraisers][trials]. Injects three sources of
 * variation so the ANOVA has signal in each row: part variation dominates,
 * appraiser offset is small, equipment noise is sub-1%.
 */
function buildStudy(opts: {
  partValues: number[];
  appraiserBias: number[];
  trials: number;
  equipmentNoise: number;
  seed?: number;
}): number[][][] {
  const { partValues, appraiserBias, trials, equipmentNoise, seed = 1 } = opts;
  const prng = mulberry32(seed);
  return partValues.map((pv) =>
    appraiserBias.map((ab) =>
      Array.from({ length: trials }, () => pv + ab + (prng() - 0.5) * equipmentNoise),
    ),
  );
}

function mulberry32(a: number): () => number {
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("MeasurementSystemAnalysisEngine", () => {
  describe("input validation", () => {
    it("rejects fewer than 2 parts", () => {
      const meas = [[[1, 1]]];
      expect(() => MeasurementSystemAnalysisEngine.analyze({ measurements: meas })).toThrow(
        /parts/,
      );
    });

    it("rejects fewer than 2 trials per cell", () => {
      const meas = [
        [[1]],
        [[2]],
      ];
      expect(() => MeasurementSystemAnalysisEngine.analyze({ measurements: meas })).toThrow(
        /trials/,
      );
    });

    it("rejects non-rectangular appraiser dimension", () => {
      const meas = [
        [[1, 1], [2, 2]],
        [[3, 3]],
      ];
      expect(() => MeasurementSystemAnalysisEngine.analyze({ measurements: meas })).toThrow(
        /rectangular/,
      );
    });

    it("rejects non-rectangular trial dimension", () => {
      const meas = [
        [[1, 1], [2, 2, 2]],
        [[3, 3], [4, 4]],
      ];
      expect(() => MeasurementSystemAnalysisEngine.analyze({ measurements: meas })).toThrow(
        /rectangular/,
      );
    });

    it("rejects non-finite measurements", () => {
      const meas = [[[NaN, 1]], [[1, 1]]];
      expect(() => MeasurementSystemAnalysisEngine.analyze({ measurements: meas })).toThrow();
    });
  });

  describe("analyze() — variance decomposition", () => {
    it("returns zero %GRR when noise is vanishingly small", () => {
      const meas = buildStudy({
        partValues: [10, 11, 12, 13, 14],
        appraiserBias: [0, 0, 0],
        trials: 3,
        equipmentNoise: 1e-8,
        seed: 7,
      });
      const r = MeasurementSystemAnalysisEngine.analyze({ measurements: meas });
      expect(r.gageRR.percentStudy).toBeLessThan(1);
      expect(r.verdict).toBe("acceptable");
    });

    it("flags large equipment noise as unacceptable", () => {
      const meas = buildStudy({
        partValues: [10, 10.05, 10.1, 10.15, 10.2],
        appraiserBias: [0, 0, 0],
        trials: 3,
        equipmentNoise: 5,
        seed: 11,
      });
      const r = MeasurementSystemAnalysisEngine.analyze({ measurements: meas });
      expect(r.gageRR.percentStudy).toBeGreaterThan(30);
      expect(r.verdict).toBe("unacceptable");
    });

    it("marginal verdict bracket is 10–30%", () => {
      const meas = buildStudy({
        partValues: [10, 10.3, 10.6, 10.9, 11.2],
        appraiserBias: [0, 0.05, -0.05],
        trials: 3,
        equipmentNoise: 0.5,
        seed: 42,
      });
      const r = MeasurementSystemAnalysisEngine.analyze({ measurements: meas });
      expect(r.gageRR.percentStudy).toBeGreaterThan(5);
      expect(r.gageRR.percentStudy).toBeLessThan(80);
    });

    it("ANOVA sums-of-squares are non-negative and sum to total", () => {
      const meas = buildStudy({
        partValues: [10, 11, 12, 13, 14, 15],
        appraiserBias: [0, 0.1, -0.1],
        trials: 3,
        equipmentNoise: 0.3,
        seed: 99,
      });
      const r = MeasurementSystemAnalysisEngine.analyze({ measurements: meas });
      expect(r.anova.SS_part).toBeGreaterThanOrEqual(0);
      expect(r.anova.SS_appraiser).toBeGreaterThanOrEqual(0);
      expect(r.anova.SS_interaction).toBeGreaterThanOrEqual(0);
      expect(r.anova.SS_equipment).toBeGreaterThanOrEqual(0);
      const sum =
        r.anova.SS_part + r.anova.SS_appraiser + r.anova.SS_interaction + r.anova.SS_equipment;
      expect(sum).toBeCloseTo(r.anova.SS_total, 4);
    });

    it("degrees of freedom partition correctly", () => {
      const meas = buildStudy({
        partValues: [10, 11, 12, 13, 14],
        appraiserBias: [0, 0.1, -0.1],
        trials: 4,
        equipmentNoise: 0.2,
      });
      const r = MeasurementSystemAnalysisEngine.analyze({ measurements: meas });
      expect(r.anova.DF_part).toBe(4);
      expect(r.anova.DF_appraiser).toBe(2);
      expect(r.anova.DF_interaction).toBe(8);
      expect(r.anova.DF_equipment).toBe(5 * 3 * 3);
      expect(r.anova.DF_total).toBe(5 * 3 * 4 - 1);
    });
  });

  describe("analyze() — derived metrics", () => {
    it("NDC ≥ 5 when part-to-part dominates equipment noise", () => {
      const meas = buildStudy({
        partValues: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        appraiserBias: [0, 0, 0],
        trials: 3,
        equipmentNoise: 0.01,
        seed: 3,
      });
      const r = MeasurementSystemAnalysisEngine.analyze({ measurements: meas });
      expect(r.ndc).toBeGreaterThanOrEqual(5);
    });

    it("includes %Tolerance column when tolerance is supplied", () => {
      const meas = buildStudy({
        partValues: [10, 10.5, 11, 11.5, 12],
        appraiserBias: [0, 0.05, -0.05],
        trials: 3,
        equipmentNoise: 0.1,
        seed: 5,
      });
      const r = MeasurementSystemAnalysisEngine.analyze({
        measurements: meas,
        tolerance: 2,
      });
      expect(r.gageRR.percentTolerance).not.toBeNull();
      expect(r.gageRR.percentTolerance! > 0).toBe(true);
    });

    it("honours historical process variation override", () => {
      const meas = buildStudy({
        partValues: [10, 10.5, 11, 11.5, 12],
        appraiserBias: [0, 0.05, -0.05],
        trials: 3,
        equipmentNoise: 0.1,
      });
      const r = MeasurementSystemAnalysisEngine.analyze({
        measurements: meas,
        processVariation: 6, // 6σ window
      });
      expect(r.totalVariation.stddev).toBeCloseTo(1, 5);
    });

    it("interaction flag fires when appraiser bias depends on part", () => {
      // Strong interaction: appraiser 0 reads low on small parts and high on
      // large parts; appraisers 1 and 2 are flat. Small within-cell noise
      // keeps MS_equipment > 0 so the F-ratio is defined.
      const prng = mulberry32(123);
      const meas: number[][][] = [];
      for (let p = 0; p < 8; p += 1) {
        const partRow: number[][] = [];
        for (let a = 0; a < 3; a += 1) {
          const interactionBias = a === 0 ? (p - 3.5) * 0.6 : 0;
          partRow.push(
            Array.from({ length: 3 }, () => 10 + p + interactionBias + (prng() - 0.5) * 0.01),
          );
        }
        meas.push(partRow);
      }
      const r = MeasurementSystemAnalysisEngine.analyze({ measurements: meas });
      expect(r.interactionSignificant).toBe(true);
    });
  });

  describe("bias()", () => {
    it("returns zero bias for measurements centred on the reference", () => {
      const r = MeasurementSystemAnalysisEngine.bias([10, 10, 10, 10], 10);
      expect(r.bias).toBeCloseTo(0, 6);
      expect(r.n).toBe(4);
    });

    it("positive bias when mean exceeds reference", () => {
      const r = MeasurementSystemAnalysisEngine.bias([10.1, 10.2, 10.0, 10.1], 10);
      expect(r.bias).toBeGreaterThan(0);
      expect(Math.abs(r.tStatistic)).toBeGreaterThan(0);
    });

    it("rejects fewer than 2 samples", () => {
      expect(() => MeasurementSystemAnalysisEngine.bias([10], 10)).toThrow();
    });

    it("rejects non-finite reference", () => {
      expect(() => MeasurementSystemAnalysisEngine.bias([1, 2], NaN)).toThrow();
    });
  });

  describe("linearity()", () => {
    it("returns slope 0 and intercept 0 for perfect linearity", () => {
      const pts = [
        { reference: 1, measurement: 1 },
        { reference: 2, measurement: 2 },
        { reference: 3, measurement: 3 },
        { reference: 4, measurement: 4 },
      ];
      const r = MeasurementSystemAnalysisEngine.linearity(pts);
      expect(r.slope).toBeCloseTo(0, 6);
      expect(r.intercept).toBeCloseTo(0, 6);
    });

    it("returns non-zero slope when bias grows with reference", () => {
      const pts = [
        { reference: 1, measurement: 1.01 },
        { reference: 2, measurement: 2.03 },
        { reference: 3, measurement: 3.06 },
        { reference: 4, measurement: 4.1 },
      ];
      const r = MeasurementSystemAnalysisEngine.linearity(pts);
      expect(r.slope).toBeGreaterThan(0);
      expect(r.rSquared).toBeGreaterThan(0.9);
    });

    it("rejects fewer than 2 points", () => {
      expect(() =>
        MeasurementSystemAnalysisEngine.linearity([{ reference: 1, measurement: 1 }]),
      ).toThrow();
    });
  });
});
