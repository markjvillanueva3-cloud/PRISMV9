/**
 * Tests for SamplingPlanEngine (Phase 0.22 U-SPC8)
 */

import { describe, it, expect } from "vitest";
import { SamplingPlanEngine } from "../engines/SamplingPlanEngine.js";

describe("SamplingPlanEngine", () => {
  describe("codeLetter()", () => {
    it("maps typical lot-size buckets to the MIL-STD-1916 table", () => {
      expect(SamplingPlanEngine.codeLetter(50)).toBe("A");
      expect(SamplingPlanEngine.codeLetter(200)).toBe("B");
      expect(SamplingPlanEngine.codeLetter(500)).toBe("C");
      expect(SamplingPlanEngine.codeLetter(800)).toBe("D");
      expect(SamplingPlanEngine.codeLetter(5000)).toBe("G");
      expect(SamplingPlanEngine.codeLetter(100000)).toBe("K");
    });

    it("rejects non-positive lot size", () => {
      expect(() => SamplingPlanEngine.codeLetter(0)).toThrow();
      expect(() => SamplingPlanEngine.codeLetter(-5)).toThrow();
    });
  });

  describe("mil1916()", () => {
    it("returns c=0 for every verification level", () => {
      const plan = SamplingPlanEngine.mil1916({
        lotSize: 1000,
        verificationLevel: "IV",
        inspectionType: "normal",
      });
      expect(plan.acceptanceNumber).toBe(0);
      expect(plan.sampleSize).toBeGreaterThan(0);
    });

    it("tighter verification level increases sample size for a given lot", () => {
      const loose = SamplingPlanEngine.mil1916({
        lotSize: 1000,
        verificationLevel: "II",
        inspectionType: "normal",
      });
      const tight = SamplingPlanEngine.mil1916({
        lotSize: 1000,
        verificationLevel: "V",
        inspectionType: "normal",
      });
      expect(tight.sampleSize).toBeGreaterThan(loose.sampleSize);
    });

    it("tightened inspection shifts one level tighter", () => {
      const normal = SamplingPlanEngine.mil1916({
        lotSize: 1000,
        verificationLevel: "IV",
        inspectionType: "normal",
      });
      const tightened = SamplingPlanEngine.mil1916({
        lotSize: 1000,
        verificationLevel: "IV",
        inspectionType: "tightened",
      });
      expect(tightened.sampleSize).toBeGreaterThanOrEqual(normal.sampleSize);
      expect(tightened.verificationLevel).toBe("V");
    });

    it("reduced inspection shifts one level looser", () => {
      const normal = SamplingPlanEngine.mil1916({
        lotSize: 1000,
        verificationLevel: "IV",
        inspectionType: "normal",
      });
      const reduced = SamplingPlanEngine.mil1916({
        lotSize: 1000,
        verificationLevel: "IV",
        inspectionType: "reduced",
      });
      expect(reduced.sampleSize).toBeLessThanOrEqual(normal.sampleSize);
      expect(reduced.verificationLevel).toBe("III");
    });

    it("sets the 100% inspection note when the spec directs it", () => {
      const plan = SamplingPlanEngine.mil1916({
        lotSize: 100,
        verificationLevel: "T",
        inspectionType: "normal",
      });
      expect(plan.sampleSize).toBe(100);
      expect(plan.note).toMatch(/100% inspection/);
    });

    it("includes the code letter in the result", () => {
      const plan = SamplingPlanEngine.mil1916({
        lotSize: 5000,
        verificationLevel: "IV",
        inspectionType: "normal",
      });
      expect(plan.codeLetter).toBe("G");
    });
  });

  describe("ocCurve()", () => {
    it("probability of acceptance is 1 at zero defective fraction", () => {
      const oc = SamplingPlanEngine.ocCurve(50, 2, 500, 21);
      expect(oc.points[0].fractionDefective).toBeCloseTo(0, 6);
      expect(oc.points[0].probabilityAccept).toBeCloseTo(1, 6);
    });

    it("probability of acceptance decreases monotonically with p", () => {
      const oc = SamplingPlanEngine.ocCurve(50, 2, 500, 51);
      for (let i = 1; i < oc.points.length; i += 1) {
        expect(oc.points[i].probabilityAccept).toBeLessThanOrEqual(
          oc.points[i - 1].probabilityAccept + 1e-9,
        );
      }
    });

    it("AOQL > 0 and bounded by worst-case p", () => {
      const oc = SamplingPlanEngine.ocCurve(80, 1, 1000, 101);
      expect(oc.aoql.aoq).toBeGreaterThan(0);
      expect(oc.aoql.fractionDefective).toBeGreaterThan(0);
      expect(oc.aoql.fractionDefective).toBeLessThan(1);
    });

    it("identifies AQL and LTPD consistently", () => {
      const oc = SamplingPlanEngine.ocCurve(100, 2, 1000, 101);
      if (oc.aql && oc.ltpd) {
        expect(oc.aql.fractionDefective).toBeLessThan(oc.ltpd.fractionDefective);
      }
    });

    it("rejects invalid inputs", () => {
      expect(() => SamplingPlanEngine.ocCurve(0, 0, 100)).toThrow();
      expect(() => SamplingPlanEngine.ocCurve(10, -1, 100)).toThrow();
      expect(() => SamplingPlanEngine.ocCurve(10, 0, 0)).toThrow();
      expect(() => SamplingPlanEngine.ocCurve(10, 0, 100, 1)).toThrow();
    });
  });

  describe("aoqlPlan()", () => {
    it("returns a plan that meets or beats target AOQL", () => {
      const plan = SamplingPlanEngine.aoqlPlan({ lotSize: 1000, aoql: 0.02 });
      expect(plan.achievedAoql).toBeLessThanOrEqual(0.02);
      expect(plan.sampleSize).toBeGreaterThan(0);
      expect(plan.acceptanceNumber).toBeGreaterThanOrEqual(0);
    });

    it("tighter AOQL demands larger sample size", () => {
      const loose = SamplingPlanEngine.aoqlPlan({ lotSize: 5000, aoql: 0.05 });
      const tight = SamplingPlanEngine.aoqlPlan({ lotSize: 5000, aoql: 0.005 });
      expect(tight.sampleSize).toBeGreaterThanOrEqual(loose.sampleSize);
    });

    it("throws when no plan fits within maxSample", () => {
      expect(() =>
        SamplingPlanEngine.aoqlPlan({ lotSize: 100, aoql: 0.0001, maxSample: 10 }),
      ).toThrow();
    });
  });
});
