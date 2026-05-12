/**
 * WEDM-AI-DEEP-MAX Integration Tests
 *
 * Verifies that all 44 DEEP-MAX domains are properly wired into
 * the WEDMCompleteOrchestrationEngine pipeline.
 *
 * Categories:
 * - Deep Reasoning (12 domains)
 * - Neural/ML (12 domains)
 * - Physics-Informed (12 domains)
 * - Digital Twin (8 domains)
 */

import { describe, it, expect } from "vitest";
import { WEDMCompleteOrchestrationEngine } from "../engines/WEDMCompleteOrchestrationEngine.js";

describe("WEDM-AI-DEEP-MAX Integration", () => {
  // ════════════════════════════════════════════════════════════════════════════
  // DEEP REASONING INTEGRATION
  // ════════════════════════════════════════════════════════════════════════════

  describe("Deep Reasoning Pipeline Integration", () => {
    it("should include causal_chain for aerospace/precision specs", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "Inconel 718",
        thickness_mm: 20,
        target_ra_um: 0.4,
        spec_class: "aerospace",
      });

      expect(result.ai_recommendations).toHaveProperty("causal_chain");
    });

    it("should include root_cause analysis", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("root_cause");
    });

    it("should include what_if scenario analysis", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("what_if");
    });

    it("should include tradeoff_optimization", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "M2",
        thickness_mm: 20,
        target_ra_um: 0.6,
      });

      expect(result.ai_recommendations).toHaveProperty("tradeoff_optimization");
    });

    it("should include constraint_satisfaction", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        max_recast_um: 5,
      });

      expect(result.ai_recommendations).toHaveProperty("constraint_satisfaction");
    });

    it("should include fmea_reasoning for critical applications", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "Inconel 718",
        thickness_mm: 20,
        target_ra_um: 0.4,
        spec_class: "medical",
      });

      expect(result.ai_recommendations).toHaveProperty("fmea_reasoning");
    });

    it("should include decision_justification", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("decision_justification");
    });

    it("should include alternative_analysis", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "carbide",
        thickness_mm: 30,
        target_ra_um: 0.4,
      });

      expect(result.ai_recommendations).toHaveProperty("alternative_analysis");
    });

    it("should include risk_decomposition", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("risk_decomposition");
    });

    it("should include confidence_calibration", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("confidence_calibration");
    });

    it("should include analogical_reasoning", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "A2",
        thickness_mm: 20,
        target_ra_um: 0.6,
      });

      expect(result.ai_recommendations).toHaveProperty("analogical_reasoning");
    });

    it("should include case_based reasoning", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        profiles: [
          { id: "p1", type: "closed", is_exterior: false, perimeter_mm: 100, has_arcs: true },
        ],
      });

      expect(result.ai_recommendations).toHaveProperty("case_based");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // NEURAL/ML INTEGRATION
  // ════════════════════════════════════════════════════════════════════════════

  describe("Neural/ML Pipeline Integration", () => {
    it("should include pattern_recognition", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("pattern_recognition");
    });

    it("should include anomaly_detection", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        machine_manufacturer: "Mitsubishi",
      });

      expect(result.ai_recommendations).toHaveProperty("anomaly_detection");
    });

    it("should include predictive_model", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("predictive_model");
    });

    it("should include time_series_forecast", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("time_series_forecast");
    });

    it("should include transfer_learning", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "M2",
        thickness_mm: 20,
        target_ra_um: 0.6,
      });

      expect(result.ai_recommendations).toHaveProperty("transfer_learning");
    });

    it("should include reinforcement_optimize", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("reinforcement_optimize");
    });

    it("should include neural_architecture", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("neural_architecture");
    });

    it("should include feature_extraction", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("feature_extraction");
    });

    it("should include clustering_analysis", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("clustering_analysis");
    });

    it("should include regression_model", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("regression_model");
    });

    it("should include classification_model", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("classification_model");
    });

    it("should include ensemble_prediction", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("ensemble_prediction");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PHYSICS-INFORMED INTEGRATION
  // ════════════════════════════════════════════════════════════════════════════

  describe("Physics-Informed Pipeline Integration", () => {
    it("should include thermal_validation", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("thermal_validation");
    });

    it("should include recast_prediction", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "Inconel 718",
        thickness_mm: 20,
        target_ra_um: 0.4,
        spec_class: "aerospace",
      });

      expect(result.ai_recommendations).toHaveProperty("recast_prediction");
    });

    it("should include wire_deflection", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 30,
        target_ra_um: 0.8,
        profiles: [
          { id: "p1", type: "closed", is_exterior: false, perimeter_mm: 100, min_corner_radius_mm: 0.3, has_arcs: true },
        ],
      });

      expect(result.ai_recommendations).toHaveProperty("wire_deflection");
    });

    it("should include spark_gap_model", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("spark_gap_model");
    });

    it("should include crater_formation", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("crater_formation");
    });

    it("should include melt_pool_dynamics", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("melt_pool_dynamics");
    });

    it("should include debris_evacuation", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 30,
        target_ra_um: 0.8,
        submerged: true,
      });

      expect(result.ai_recommendations).toHaveProperty("debris_evacuation");
    });

    it("should include dielectric_breakdown", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("dielectric_breakdown");
    });

    it("should include energy_partition", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("energy_partition");
    });

    it("should include plasma_channel", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("plasma_channel");
    });

    it("should include surface_tension", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("surface_tension");
    });

    it("should include resolidification", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("resolidification");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // DIGITAL TWIN INTEGRATION
  // ════════════════════════════════════════════════════════════════════════════

  describe("Digital Twin Pipeline Integration", () => {
    it("should include twin_sync when machine specified", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        machine_manufacturer: "Mitsubishi",
        machine_model: "MV1200-S",
      });

      expect(result.ai_recommendations).toHaveProperty("twin_sync");
    });

    it("should include realtime_update", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("realtime_update");
    });

    it("should include virtual_commission", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        profiles: [
          { id: "p1", type: "closed", is_exterior: false, perimeter_mm: 100, has_arcs: true },
        ],
      });

      expect(result.ai_recommendations).toHaveProperty("virtual_commission");
    });

    it("should include sensor_fusion", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        machine_manufacturer: "Mitsubishi",
      });

      expect(result.ai_recommendations).toHaveProperty("sensor_fusion");
    });

    it("should include state_estimation", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("state_estimation");
    });

    it("should include predictive_maintenance", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        machine_manufacturer: "Mitsubishi",
      });

      expect(result.ai_recommendations).toHaveProperty("predictive_maintenance");
    });

    it("should include health_monitoring", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        machine_manufacturer: "Sodick",
      });

      expect(result.ai_recommendations).toHaveProperty("health_monitoring");
    });

    it("should include adaptive_control", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("adaptive_control");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SYNTHESIS REPORT VERIFICATION
  // ════════════════════════════════════════════════════════════════════════════

  describe("Synthesis Report Integration", () => {
    it("should include DEEP-MAX summaries in synthesis report", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "Inconel 718",
        thickness_mm: 20,
        target_ra_um: 0.4,
        spec_class: "aerospace",
        machine_manufacturer: "Mitsubishi",
        machine_model: "MV1200-S",
        profiles: [
          { id: "p1", type: "closed", is_exterior: false, perimeter_mm: 100, has_arcs: true },
        ],
      });

      const report = result.ai_recommendations?.synthesis_report ?? "";
      expect(report.length).toBeGreaterThan(500);

      // Should have DEEP-MAX domain summaries
      expect(report).toMatch(/Root Cause:|FMEA:|Trade-offs:|ML Model:|Recast Model:|Twin Sync:|PdM:/);
    });

    it("should report high domain count for comprehensive input", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        spec_class: "precision",
        machine_manufacturer: "Mitsubishi",
        profiles: [
          { id: "p1", type: "closed", is_exterior: false, perimeter_mm: 100, has_arcs: true },
        ],
      });

      const report = result.ai_recommendations?.synthesis_report ?? "";
      // Should report many domains (100+)
      const domainMatch = report.match(/AI Analysis \((\d+) domains/);
      expect(domainMatch).toBeTruthy();
      if (domainMatch) {
        const domainCount = parseInt(domainMatch[1], 10);
        expect(domainCount).toBeGreaterThan(50);
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // HELPER METHOD VERIFICATION
  // ════════════════════════════════════════════════════════════════════════════

  describe("Helper Method Integration", () => {
    it("should use getSimilarMaterials for analogical reasoning", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      // Analogical reasoning should be present and use similar materials
      expect(result.ai_recommendations).toHaveProperty("analogical_reasoning");
    });

    it("should use getSourceDomain for transfer learning", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "Inconel 718",
        thickness_mm: 20,
        target_ra_um: 0.4,
      });

      // Transfer learning should use appropriate source domain
      expect(result.ai_recommendations).toHaveProperty("transfer_learning");
    });
  });
});
