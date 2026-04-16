/**
 * PPEnsembleUncertaintyEngine Tests — PP-DL-MS8
 */
import { describe, it, expect } from "vitest";
import {
  PPEnsembleUncertaintyEngine,
  ppEnsembleUncertaintyEngine,
} from "../engines/PPEnsembleUncertaintyEngine.js";
import { ppControllerEmbeddingEngine } from "../engines/PPControllerEmbeddingEngine.js";
import { ppMachineVectorEncoderEngine } from "../engines/PPMachineVectorEncoderEngine.js";
import { ppMaterialPropertyVectorEngine } from "../engines/PPMaterialPropertyVectorEngine.js";

function validScenario() {
  const c = ppControllerEmbeddingEngine.embedAll();
  const m = ppMachineVectorEncoderEngine.embedAll();
  const mat = ppMaterialPropertyVectorEngine.embedAll();
  if (!c.length || !m.length || !mat.length) return null;
  return { controller_id: c[0].controller_id, machine_id: m[0].machine_id, material_id: mat[0].material_id };
}

describe("PPEnsembleUncertaintyEngine", () => {
  it("exports singleton", () => {
    expect(ppEnsembleUncertaintyEngine).toBeInstanceOf(PPEnsembleUncertaintyEngine);
  });

  describe("estimateUncertainty", () => {
    it("returns confidence in [0, 1]", () => {
      const s = validScenario();
      if (!s) return;
      const u = ppEnsembleUncertaintyEngine.estimateUncertainty(s);
      expect(u.confidence).toBeGreaterThanOrEqual(0);
      expect(u.confidence).toBeLessThanOrEqual(1);
    });

    it("known scenario has higher confidence than unknown", () => {
      const known = validScenario();
      if (!known) return;
      const unknown = { controller_id: "weird", machine_id: "weird", material_id: "weird" };
      const kU = ppEnsembleUncertaintyEngine.estimateUncertainty(known);
      const uU = ppEnsembleUncertaintyEngine.estimateUncertainty(unknown);
      expect(kU.confidence).toBeGreaterThanOrEqual(uU.confidence);
    });

    it("epistemic + aleatoric are non-negative", () => {
      const s = validScenario();
      if (!s) return;
      const u = ppEnsembleUncertaintyEngine.estimateUncertainty(s);
      expect(u.epistemic_uncertainty).toBeGreaterThanOrEqual(0);
      expect(u.aleatoric_uncertainty).toBeGreaterThanOrEqual(0);
    });

    it("source_agreement in [0, 1]", () => {
      const s = validScenario();
      if (!s) return;
      const u = ppEnsembleUncertaintyEngine.estimateUncertainty(s);
      expect(u.source_agreement).toBeGreaterThanOrEqual(0);
      expect(u.source_agreement).toBeLessThanOrEqual(1);
    });

    it("recommendation is one of 4 options", () => {
      const s = validScenario();
      if (!s) return;
      const u = ppEnsembleUncertaintyEngine.estimateUncertainty(s);
      expect(["proceed", "verify", "caution", "insufficient_data"]).toContain(u.recommendation);
    });

    it("unknown material adds dimension uncertainty", () => {
      const s = validScenario();
      if (!s) return;
      const u = ppEnsembleUncertaintyEngine.estimateUncertainty({
        ...s, material_id: "unobtanium_xyz",
      });
      expect(u.dimension_uncertainties.some(d => d.domain === "material")).toBe(true);
    });

    it("unknown machine adds dimension uncertainty", () => {
      const s = validScenario();
      if (!s) return;
      const u = ppEnsembleUncertaintyEngine.estimateUncertainty({
        ...s, machine_id: "nonexistent_machine",
      });
      expect(u.dimension_uncertainties.some(d => d.domain === "machine")).toBe(true);
    });
  });

  describe("monteCarloDropout", () => {
    it("returns predictions array", () => {
      const s = validScenario();
      if (!s) return;
      const mc = ppEnsembleUncertaintyEngine.monteCarloDropout(s, 10);
      expect(mc.predictions.length).toBe(11); // 1 base + 10 samples
    });

    it("mean is in [0, 1]", () => {
      const s = validScenario();
      if (!s) return;
      const mc = ppEnsembleUncertaintyEngine.monteCarloDropout(s, 10);
      expect(mc.mean).toBeGreaterThanOrEqual(0);
      expect(mc.mean).toBeLessThanOrEqual(1);
    });

    it("std_dev is non-negative", () => {
      const s = validScenario();
      if (!s) return;
      const mc = ppEnsembleUncertaintyEngine.monteCarloDropout(s, 10);
      expect(mc.std_dev).toBeGreaterThanOrEqual(0);
    });

    it("confidence interval brackets mean", () => {
      const s = validScenario();
      if (!s) return;
      const mc = ppEnsembleUncertaintyEngine.monteCarloDropout(s, 20);
      expect(mc.confidence_interval.lower).toBeLessThanOrEqual(mc.mean);
      expect(mc.confidence_interval.upper).toBeGreaterThanOrEqual(mc.mean);
    });

    it("agreement_score in [0, 1]", () => {
      const s = validScenario();
      if (!s) return;
      const mc = ppEnsembleUncertaintyEngine.monteCarloDropout(s, 10);
      expect(mc.agreement_score).toBeGreaterThanOrEqual(0);
      expect(mc.agreement_score).toBeLessThanOrEqual(1);
    });
  });

  describe("calibrate", () => {
    it("high similarity → high probability", () => {
      expect(ppEnsembleUncertaintyEngine.calibrate(0.95)).toBeGreaterThan(0.9);
    });
    it("low similarity → low probability", () => {
      expect(ppEnsembleUncertaintyEngine.calibrate(0.3)).toBeLessThan(0.1);
    });
    it("at threshold → ~0.5", () => {
      expect(ppEnsembleUncertaintyEngine.calibrate(0.7)).toBeCloseTo(0.5, 1);
    });
    it("returns value in [0, 1]", () => {
      for (const v of [0, 0.3, 0.5, 0.7, 0.9, 1.0]) {
        const p = ppEnsembleUncertaintyEngine.calibrate(v);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
    });
  });
});
