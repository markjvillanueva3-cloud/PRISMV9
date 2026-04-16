/**
 * WireEDMAIPrintToProgramEngine Tests
 * PhD-Level AI Print-to-Wire-EDM Pipeline
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  WireEDMAIPrintToProgramEngine,
  wireEDMAIPrintToProgramEngine,
  type AIProgramInput,
  type AIProgramResult,
  type AIReasoningMode,
  type AIConfidenceTier,
} from "../engines/WireEDMAIPrintToProgramEngine.js";

describe("WireEDMAIPrintToProgramEngine", () => {
  describe("singleton instance", () => {
    it("should return the same instance", () => {
      const instance1 = WireEDMAIPrintToProgramEngine.getInstance();
      const instance2 = WireEDMAIPrintToProgramEngine.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should export a singleton", () => {
      expect(wireEDMAIPrintToProgramEngine).toBeDefined();
      expect(wireEDMAIPrintToProgramEngine).toBe(WireEDMAIPrintToProgramEngine.getInstance());
    });
  });

  describe("generate() - Full AI Pipeline", () => {
    it("should generate a complete AI-enhanced program", async () => {
      const input: AIProgramInput = {
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        target_accuracy_mm: 0.005,
        wire_type: "plain_brass",
        wire_diameter_mm: 0.25,
        controller: "mitsubishi",
        part_name: "Test Punch",
        reasoning_mode: "ensemble",
      };

      const result = await wireEDMAIPrintToProgramEngine.generate(input);

      expect(result.success).toBe(true);
      expect(result.decision_id).toMatch(/^wedm-ai-\d+-\d+$/);
      expect(result.gcode).toContain("O");
      expect(result.gcode).toContain("M30");
      expect(result.passes.length).toBeGreaterThan(0);
    });

    it("should include neural predictions", async () => {
      const input: AIProgramInput = {
        material: "A2",
        thickness_mm: 15,
        target_ra_um: 1.2,
      };

      const result = await wireEDMAIPrintToProgramEngine.generate(input);

      expect(result.predictions.neural).toBeDefined();
      expect(result.predictions.neural.mrr_mm3_per_min).toBeGreaterThan(0);
      expect(result.predictions.neural.ra_um).toBeGreaterThan(0);
      expect(result.predictions.neural.confidence).toBeGreaterThan(0.8);
      expect(result.predictions.neural.source).toBe("neural_network");
    });

    it("should include physics predictions", async () => {
      const input: AIProgramInput = {
        material: "S7",
        thickness_mm: 30,
        target_ra_um: 0.6,
      };

      const result = await wireEDMAIPrintToProgramEngine.generate(input);

      expect(result.predictions.physics).toBeDefined();
      expect(result.predictions.physics.mrr_mm3_per_min).toBeGreaterThan(0);
      expect(result.predictions.physics.ra_um).toBeGreaterThan(0);
      expect(result.predictions.physics.source).toBe("physics_model");
    });

    it("should generate ensemble predictions when enabled", async () => {
      const input: AIProgramInput = {
        material: "D2",
        thickness_mm: 40,
        enable_ensemble: true,
      };

      const result = await wireEDMAIPrintToProgramEngine.generate(input);

      expect(result.predictions.ensemble).toBeDefined();
      expect(result.predictions.ensemble!.models.length).toBeGreaterThanOrEqual(2);
      expect(result.predictions.ensemble!.consensus_prediction).toBeDefined();
      expect(result.predictions.ensemble!.disagreement_score).toBeDefined();
    });

    it("should generate counterfactuals when enabled", async () => {
      const input: AIProgramInput = {
        material: "H13",
        thickness_mm: 50,
        enable_counterfactuals: true,
      };

      const result = await wireEDMAIPrintToProgramEngine.generate(input);

      expect(result.counterfactuals).toBeDefined();
      expect(result.counterfactuals!.length).toBeGreaterThanOrEqual(3);

      const scenarios = result.counterfactuals!.map(c => c.scenario_id);
      expect(scenarios).toContain("cf_high_speed");
      expect(scenarios).toContain("cf_high_quality");
      expect(scenarios).toContain("cf_safe_mode");
    });

    it("should include causal relations", async () => {
      const input: AIProgramInput = {
        material: "M2",
        thickness_mm: 20,
      };

      const result = await wireEDMAIPrintToProgramEngine.generate(input);

      expect(result.causal_relations).toBeDefined();
      expect(result.causal_relations!.length).toBeGreaterThan(0);

      const causes = result.causal_relations!.map(c => c.cause);
      expect(causes).toContain("pulse_on_time");
      expect(causes).toContain("peak_current");
    });

    it("should build complete reasoning chain", async () => {
      const input: AIProgramInput = {
        material: "D2",
        thickness_mm: 25,
        reasoning_mode: "full_agi",
      };

      const result = await wireEDMAIPrintToProgramEngine.generate(input);

      expect(result.reasoning_chain.length).toBeGreaterThanOrEqual(5);

      const modes = result.reasoning_chain.map(s => s.reasoning_mode);
      expect(modes).toContain("analytical");
      expect(modes).toContain("predictive");
    });
  });

  describe("pass generation", () => {
    it("should generate more passes for finer finish", async () => {
      const coarseInput: AIProgramInput = {
        material: "D2",
        thickness_mm: 30,
        target_ra_um: 3.0,
      };

      const fineInput: AIProgramInput = {
        material: "D2",
        thickness_mm: 30,
        target_ra_um: 0.3,
      };

      const coarseResult = await wireEDMAIPrintToProgramEngine.generate(coarseInput);
      const fineResult = await wireEDMAIPrintToProgramEngine.generate(fineInput);

      expect(fineResult.passes.length).toBeGreaterThan(coarseResult.passes.length);
    });

    it("should assign correct pass types", async () => {
      const input: AIProgramInput = {
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      };

      const result = await wireEDMAIPrintToProgramEngine.generate(input);

      expect(result.passes[0].pass_type).toBe("roughing");
      expect(result.passes[result.passes.length - 1].pass_type).toMatch(/skim|polish/);
    });

    it("should include E-codes for each pass", async () => {
      const input: AIProgramInput = {
        material: "A2",
        thickness_mm: 20,
      };

      const result = await wireEDMAIPrintToProgramEngine.generate(input);

      for (const pass of result.passes) {
        expect(pass.e_code).toMatch(/^E\d{4}$/);
      }
    });

    it("should calculate progressive offsets", async () => {
      const input: AIProgramInput = {
        material: "D2",
        thickness_mm: 30,
        target_ra_um: 0.6,
      };

      const result = await wireEDMAIPrintToProgramEngine.generate(input);

      for (let i = 1; i < result.passes.length; i++) {
        expect(result.passes[i].offset_mm).toBeLessThanOrEqual(result.passes[i - 1].offset_mm);
      }
    });

    it("should include AI rationale for each pass", async () => {
      const input: AIProgramInput = {
        material: "S7",
        thickness_mm: 25,
      };

      const result = await wireEDMAIPrintToProgramEngine.generate(input);

      for (const pass of result.passes) {
        expect(pass.ai_rationale).toBeDefined();
        expect(pass.ai_rationale.length).toBeGreaterThan(10);
      }
    });
  });

  describe("quickPredictMRR()", () => {
    it("should return MRR prediction", () => {
      const result = wireEDMAIPrintToProgramEngine.quickPredictMRR({
        thickness_mm: 25,
        hardness_hrc: 58,
        pulse_on_us: 4,
        current_a: 15,
      });

      expect(result.mrr_mm3_per_min).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it("should handle thin material", () => {
      const result = wireEDMAIPrintToProgramEngine.quickPredictMRR({
        thickness_mm: 5,
      });

      expect(result.mrr_mm3_per_min).toBeGreaterThan(0);
    });

    it("should handle thick material", () => {
      const result = wireEDMAIPrintToProgramEngine.quickPredictMRR({
        thickness_mm: 120,
      });

      expect(result.mrr_mm3_per_min).toBeGreaterThan(0);
    });
  });

  describe("quickPredictRa()", () => {
    it("should return Ra prediction", () => {
      const result = wireEDMAIPrintToProgramEngine.quickPredictRa({
        thickness_mm: 30,
        pulse_on_us: 4,
        current_a: 15,
      });

      expect(result.ra_um).toBeGreaterThan(0);
      expect(result.ra_um).toBeLessThan(15);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it("should predict lower Ra for lower energy", () => {
      const highEnergy = wireEDMAIPrintToProgramEngine.quickPredictRa({
        thickness_mm: 30,
        pulse_on_us: 8,
        current_a: 25,
      });

      const lowEnergy = wireEDMAIPrintToProgramEngine.quickPredictRa({
        thickness_mm: 30,
        pulse_on_us: 2,
        current_a: 5,
      });

      expect(lowEnergy.ra_um).toBeLessThan(highEnergy.ra_um);
    });
  });

  describe("explainCausalEffect()", () => {
    it("should explain pulse_on to mrr relationship", () => {
      const explanation = wireEDMAIPrintToProgramEngine.explainCausalEffect("pulse_on", "removal");

      expect(explanation).toBeDefined();
      expect(explanation!.strength).toBeGreaterThan(0.5);
      expect(explanation!.mechanism).toContain("discharge");
    });

    it("should explain current to mrr relationship", () => {
      const explanation = wireEDMAIPrintToProgramEngine.explainCausalEffect("current", "removal");

      expect(explanation).toBeDefined();
      expect(explanation!.strength).toBeGreaterThan(0.8);
    });

    it("should return undefined for unknown relationships", () => {
      const explanation = wireEDMAIPrintToProgramEngine.explainCausalEffect("unknown", "unknown");

      expect(explanation).toBeUndefined();
    });
  });

  describe("getCounterfactuals()", () => {
    it("should return counterfactual scenarios", () => {
      const counterfactuals = wireEDMAIPrintToProgramEngine.getCounterfactuals({
        material: "D2",
        thickness_mm: 30,
      });

      expect(counterfactuals.length).toBeGreaterThanOrEqual(4);
    });

    it("should recommend safe_mode for thick sections", () => {
      const counterfactuals = wireEDMAIPrintToProgramEngine.getCounterfactuals({
        material: "D2",
        thickness_mm: 100,
      });

      const safeMode = counterfactuals.find(c => c.scenario_id === "cf_safe_mode");
      expect(safeMode).toBeDefined();
      expect(safeMode!.recommendation).toBe("adopt");
    });

    it("should recommend high_quality for fine finish", () => {
      const counterfactuals = wireEDMAIPrintToProgramEngine.getCounterfactuals({
        material: "D2",
        thickness_mm: 30,
        target_ra_um: 0.3,
      });

      const highQuality = counterfactuals.find(c => c.scenario_id === "cf_high_quality");
      expect(highQuality).toBeDefined();
      expect(highQuality!.recommendation).toBe("adopt");
    });
  });

  describe("confidence scoring", () => {
    it("should return high confidence for standard inputs", async () => {
      const input: AIProgramInput = {
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      };

      const result = await wireEDMAIPrintToProgramEngine.generate(input);

      expect(result.confidence.overall).toBeGreaterThan(0.85);
      expect(result.confidence.tier).toBe("high");
    });

    it("should include component confidences", async () => {
      const input: AIProgramInput = {
        material: "A2",
        thickness_mm: 30,
      };

      const result = await wireEDMAIPrintToProgramEngine.generate(input);

      expect(result.confidence.geometry).toBeGreaterThan(0);
      expect(result.confidence.parameters).toBeGreaterThan(0);
      expect(result.confidence.predictions).toBeGreaterThan(0);
    });
  });

  describe("G-code generation", () => {
    it("should generate valid Mitsubishi G-code", async () => {
      const input: AIProgramInput = {
        material: "D2",
        thickness_mm: 25,
        controller: "mitsubishi",
        program_number: 1234,
      };

      const result = await wireEDMAIPrintToProgramEngine.generate(input);

      expect(result.gcode).toContain("O1234");
      expect(result.gcode).toContain("M98 P");
      expect(result.gcode).toContain("G41");
      expect(result.gcode).toContain("G40");
      expect(result.gcode).toContain("M20");
      expect(result.gcode).toContain("M21");
      expect(result.gcode).toContain("M30");
    });

    it("should include pass comments", async () => {
      const input: AIProgramInput = {
        material: "S7",
        thickness_mm: 20,
      };

      const result = await wireEDMAIPrintToProgramEngine.generate(input);

      expect(result.gcode).toContain("PASS 1");
      expect(result.gcode).toContain("ROUGHING");
    });

    it("should include AI generation metadata", async () => {
      const input: AIProgramInput = {
        material: "D2",
        thickness_mm: 25,
        reasoning_mode: "ensemble",
      };

      const result = await wireEDMAIPrintToProgramEngine.generate(input);

      expect(result.gcode).toContain("WireEDMAIPrintToProgramEngine");
      expect(result.gcode).toContain("REASONING MODE: ensemble");
    });
  });

  describe("setup sheet", () => {
    it("should generate complete setup sheet", async () => {
      const input: AIProgramInput = {
        material: "D2",
        thickness_mm: 30,
        target_ra_um: 0.6,
        part_name: "Test Die",
        wire_type: "zinc_coated",
      };

      const result = await wireEDMAIPrintToProgramEngine.generate(input);

      expect(result.setup_sheet.part_name).toBe("Test Die");
      expect(result.setup_sheet.material).toBe("D2");
      expect(result.setup_sheet.thickness_mm).toBe(30);
      expect(result.setup_sheet.wire_type).toBe("zinc_coated");
      expect(result.setup_sheet.num_passes).toBeGreaterThan(0);
      expect(result.setup_sheet.target_ra_um).toBe(0.6);
    });
  });

  describe("cycle time estimation", () => {
    it("should estimate cycle time components", async () => {
      const input: AIProgramInput = {
        material: "D2",
        thickness_mm: 40,
      };

      const result = await wireEDMAIPrintToProgramEngine.generate(input);

      expect(result.cycle_time.total_min).toBeGreaterThan(0);
      expect(result.cycle_time.cutting_min).toBeGreaterThan(0);
      expect(result.cycle_time.threading_min).toBeGreaterThan(0);
      expect(result.cycle_time.rapid_min).toBeGreaterThanOrEqual(0);
      expect(result.cycle_time.dwell_min).toBeGreaterThanOrEqual(0);
    });

    it("should have longer cycle time for thicker material", async () => {
      const thin = await wireEDMAIPrintToProgramEngine.generate({
        material: "D2",
        thickness_mm: 10,
      });

      const thick = await wireEDMAIPrintToProgramEngine.generate({
        material: "D2",
        thickness_mm: 80,
      });

      expect(thick.cycle_time.total_min).toBeGreaterThan(thin.cycle_time.total_min);
    });
  });

  describe("warnings and recommendations", () => {
    it("should warn for thick sections", async () => {
      const input: AIProgramInput = {
        material: "D2",
        thickness_mm: 100,
      };

      const result = await wireEDMAIPrintToProgramEngine.generate(input);

      const hasThickWarning = result.recommendations.some(r =>
        r.toLowerCase().includes("thick") || r.toLowerCase().includes("safe")
      );
      expect(hasThickWarning).toBe(true);
    });

    it("should recommend mirror finish settings", async () => {
      const input: AIProgramInput = {
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.3,
      };

      const result = await wireEDMAIPrintToProgramEngine.generate(input);

      const hasMirrorRec = result.recommendations.some(r =>
        r.toLowerCase().includes("mirror") || r.toLowerCase().includes("6+")
      );
      expect(hasMirrorRec).toBe(true);
    });

    it("should warn for hard materials", async () => {
      const input: AIProgramInput = {
        material: "D2",
        thickness_mm: 25,
        hardness_hrc: 65,
      };

      const result = await wireEDMAIPrintToProgramEngine.generate(input);

      const hasHardnessRec = result.recommendations.some(r =>
        r.toLowerCase().includes("hard") || r.toLowerCase().includes("tension")
      );
      expect(hasHardnessRec).toBe(true);
    });
  });

  describe("knowledge sources", () => {
    it("should track knowledge sources used", async () => {
      const input: AIProgramInput = {
        material: "D2",
        thickness_mm: 25,
      };

      const result = await wireEDMAIPrintToProgramEngine.generate(input);

      expect(result.knowledge_sources.length).toBeGreaterThan(0);
      expect(result.knowledge_sources.some(s => s.type === "neural_network")).toBe(true);
    });

    it("should include model contributions", async () => {
      const input: AIProgramInput = {
        material: "A2",
        thickness_mm: 30,
      };

      const result = await wireEDMAIPrintToProgramEngine.generate(input);

      const hasContribution = result.knowledge_sources.every(s =>
        s.contribution && s.contribution.length > 0
      );
      expect(hasContribution).toBe(true);
    });
  });

  describe("metadata", () => {
    it("should include processing metadata", async () => {
      const input: AIProgramInput = {
        material: "D2",
        thickness_mm: 25,
        reasoning_mode: "ensemble",
      };

      const result = await wireEDMAIPrintToProgramEngine.generate(input);

      expect(result.metadata.reasoning_mode).toBe("ensemble");
      expect(result.metadata.processing_time_ms).toBeGreaterThanOrEqual(0);
      expect(result.metadata.models_consulted).toBeGreaterThan(0);
      expect(result.metadata.knowledge_entries_applied).toBeGreaterThan(0);
    });
  });

  describe("uncertainty bounds", () => {
    it("should include uncertainty bounds in predictions", async () => {
      const input: AIProgramInput = {
        material: "D2",
        thickness_mm: 30,
      };

      const result = await wireEDMAIPrintToProgramEngine.generate(input);

      const bounds = result.predictions.neural.uncertainty_bounds;
      expect(bounds.mrr_low).toBeLessThan(bounds.mrr_high);
      expect(bounds.ra_low).toBeLessThan(bounds.ra_high);
    });
  });
});
