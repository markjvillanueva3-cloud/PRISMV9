/**
 * EDM Dispatcher — WireEDMAIPrintToProgramEngine Routing Tests
 * P2P-FULLSTACK-MS0/U-P2PFS02: Wire WireEDMAIPrintToProgramEngine into edmDispatcher
 */
import { describe, it, expect } from "vitest";
import { wireEDMAIPrintToProgramEngine } from "../engines/WireEDMAIPrintToProgramEngine.js";

describe("edmDispatcher WireEDMAI routing", () => {
  describe("engine existence", () => {
    it("engine should exist as singleton", () => {
      expect(wireEDMAIPrintToProgramEngine).toBeDefined();
      expect(wireEDMAIPrintToProgramEngine).toHaveProperty("generate");
      expect(wireEDMAIPrintToProgramEngine).toHaveProperty("quickPredictMRR");
      expect(wireEDMAIPrintToProgramEngine).toHaveProperty("quickPredictRa");
    });

    it("engine should have causal and counterfactual methods", () => {
      expect(wireEDMAIPrintToProgramEngine).toHaveProperty("explainCausalEffect");
      expect(wireEDMAIPrintToProgramEngine).toHaveProperty("getCounterfactuals");
    });
  });

  describe("wedm_ai_generate_program", () => {
    it("generate() should return AIProgramResult structure", async () => {
      const result = await wireEDMAIPrintToProgramEngine.generate({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        reasoning_mode: "analytical",
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("gcode");
      expect(result).toHaveProperty("passes");
      expect(result).toHaveProperty("reasoning_chain");
      expect(result).toHaveProperty("confidence");
    });

    it("generate() confidence should have tier", async () => {
      const result = await wireEDMAIPrintToProgramEngine.generate({
        material: "D2",
        thickness_mm: 25,
      });

      expect(result.confidence).toHaveProperty("tier");
      expect(["high", "medium", "low", "uncertain"]).toContain(result.confidence.tier);
    });
  });

  describe("wedm_ai_quick_mrr", () => {
    it("quickPredictMRR() should return MRR prediction", () => {
      const result = wireEDMAIPrintToProgramEngine.quickPredictMRR({
        thickness_mm: 25,
        pulse_on_us: 4,
        current_a: 10,
      });

      expect(result).toHaveProperty("mrr_mm3_per_min");
      expect(result).toHaveProperty("confidence");
      expect(result.mrr_mm3_per_min).toBeGreaterThan(0);
    });

    it("quickPredictMRR() confidence should be 0-1 range", () => {
      const result = wireEDMAIPrintToProgramEngine.quickPredictMRR({
        thickness_mm: 25,
        pulse_on_us: 4,
        current_a: 10,
      });

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("wedm_ai_quick_ra", () => {
    it("quickPredictRa() should return Ra prediction", () => {
      const result = wireEDMAIPrintToProgramEngine.quickPredictRa({
        thickness_mm: 25,
        pulse_on_us: 4,
        current_a: 10,
      });

      expect(result).toHaveProperty("ra_um");
      expect(result).toHaveProperty("confidence");
    });

    it("quickPredictRa() with valid inputs returns numeric Ra", () => {
      const result = wireEDMAIPrintToProgramEngine.quickPredictRa({
        thickness_mm: 25,
        pulse_on_us: 4,
        current_a: 10,
      });

      expect(typeof result.ra_um).toBe("number");
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe("wedm_ai_explain_causal", () => {
    it("explainCausalEffect() returns undefined for unknown pair", () => {
      const result = wireEDMAIPrintToProgramEngine.explainCausalEffect(
        "unknown_param",
        "unknown_effect"
      );

      expect(result).toBeUndefined();
    });

    it("explainCausalEffect() type check", () => {
      expect(typeof wireEDMAIPrintToProgramEngine.explainCausalEffect).toBe("function");
    });
  });

  describe("wedm_ai_counterfactuals", () => {
    it("getCounterfactuals() should return scenario array", () => {
      const result = wireEDMAIPrintToProgramEngine.getCounterfactuals({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        reasoning_mode: "counterfactual",
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("getCounterfactuals() scenarios have AICounterfactual structure", () => {
      const result = wireEDMAIPrintToProgramEngine.getCounterfactuals({
        material: "D2",
        thickness_mm: 25,
      });

      for (const scenario of result) {
        expect(scenario).toHaveProperty("scenario_id");
        expect(scenario).toHaveProperty("scenario_name");
        expect(scenario).toHaveProperty("description");
        expect(scenario).toHaveProperty("parameter_changes");
        expect(scenario).toHaveProperty("predicted_outcomes");
        expect(scenario).toHaveProperty("recommendation");
      }
    });

    it("getCounterfactuals() recommendation is valid enum", () => {
      const result = wireEDMAIPrintToProgramEngine.getCounterfactuals({
        material: "D2",
        thickness_mm: 25,
      });

      for (const scenario of result) {
        expect(["adopt", "consider", "avoid"]).toContain(scenario.recommendation);
      }
    });
  });
});
