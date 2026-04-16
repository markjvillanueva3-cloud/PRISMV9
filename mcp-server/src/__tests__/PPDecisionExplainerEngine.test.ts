/**
 * PPDecisionExplainerEngine Tests — PP-DL-MS9
 */
import { describe, it, expect } from "vitest";
import {
  PPDecisionExplainerEngine,
  ppDecisionExplainerEngine,
} from "../engines/PPDecisionExplainerEngine.js";
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

describe("PPDecisionExplainerEngine", () => {
  it("exports singleton", () => {
    expect(ppDecisionExplainerEngine).toBeInstanceOf(PPDecisionExplainerEngine);
  });

  describe("explain", () => {
    it("returns full explanation for valid scenario", () => {
      const s = validScenario();
      if (!s) return;
      const e = ppDecisionExplainerEngine.explain(s);
      expect(e.summary.length).toBeGreaterThan(0);
      expect(e.confidence).toBeGreaterThanOrEqual(0);
      expect(e.recommendation.length).toBeGreaterThan(0);
    });

    it("includes top factors", () => {
      const s = validScenario();
      if (!s) return;
      const e = ppDecisionExplainerEngine.explain(s);
      expect(e.top_factors.length).toBeGreaterThan(0);
      expect(e.top_factors.length).toBeLessThanOrEqual(5);
    });

    it("top factors have required fields", () => {
      const s = validScenario();
      if (!s) return;
      const e = ppDecisionExplainerEngine.explain(s);
      for (const f of e.top_factors) {
        expect(typeof f.dimension).toBe("number");
        expect(typeof f.name).toBe("string");
        expect(["controller", "machine", "material"]).toContain(f.domain);
        expect(["positive", "negative", "neutral"]).toContain(f.contribution);
        expect(f.explanation.length).toBeGreaterThan(0);
      }
    });

    it("includes counterfactuals", () => {
      const s = validScenario();
      if (!s) return;
      const e = ppDecisionExplainerEngine.explain(s);
      expect(Array.isArray(e.counterfactuals)).toBe(true);
    });

    it("includes analogies", () => {
      const s = validScenario();
      if (!s) return;
      const e = ppDecisionExplainerEngine.explain(s);
      expect(Array.isArray(e.analogies)).toBe(true);
      expect(e.analogies.length).toBeGreaterThan(0);
    });

    it("includes risk narrative", () => {
      const s = validScenario();
      if (!s) return;
      const e = ppDecisionExplainerEngine.explain(s);
      expect(e.risk_narrative.length).toBeGreaterThan(0);
    });
  });

  describe("explainControllerChoice", () => {
    it("explains choice between two controllers", () => {
      const ctrls = ppControllerEmbeddingEngine.embedAll();
      if (ctrls.length < 2) return;
      const explanation = ppDecisionExplainerEngine.explainControllerChoice(
        ctrls[0].controller_id, ctrls[1].controller_id
      );
      expect(explanation.length).toBeGreaterThan(0);
      expect(explanation).toContain("Chose");
      expect(explanation).toContain("Similarity");
    });
  });

  describe("explainMaterialSubstitution", () => {
    it("explains substitution between known materials", () => {
      const mats = ppMaterialPropertyVectorEngine.embedAll();
      if (mats.length < 2) return;
      const explanation = ppDecisionExplainerEngine.explainMaterialSubstitution(
        mats[0].material_id, mats[1].material_id
      );
      expect(explanation).toContain("substitution");
      expect(explanation).toContain("Similarity");
    });

    it("handles unknown materials", () => {
      const explanation = ppDecisionExplainerEngine.explainMaterialSubstitution(
        "unknown_a", "unknown_b"
      );
      expect(explanation).toContain("Cannot compare");
    });
  });
});
