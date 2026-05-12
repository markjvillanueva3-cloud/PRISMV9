/**
 * Tests for WireEDMResearchAIEngine
 *
 * Validates ML-based predictions, optimization algorithms, and
 * research database integration for Wire EDM AI.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  WireEDMResearchAIEngine,
  wireEDMResearchAIEngine,
  type MLModelType,
  type OptimalParameters,
  type WireBreakagePrediction
} from "../engines/WireEDMResearchAIEngine.js";

describe("WireEDMResearchAIEngine", () => {
  let engine: WireEDMResearchAIEngine;

  beforeEach(() => {
    engine = new WireEDMResearchAIEngine();
  });

  // =========================================================================
  // Singleton Export
  // =========================================================================

  describe("singleton", () => {
    it("exports a singleton instance", () => {
      expect(wireEDMResearchAIEngine).toBeInstanceOf(WireEDMResearchAIEngine);
    });
  });

  // =========================================================================
  // Status and Initialization
  // =========================================================================

  describe("status", () => {
    it("returns engine status with research papers count", () => {
      const status = engine.getStatus();
      expect(status.research_papers).toBeGreaterThanOrEqual(8);
      expect(status.materials_optimized).toBeGreaterThanOrEqual(7);
      expect(status.ann_architectures).toBeGreaterThanOrEqual(4);
    });

    it("includes implemented ML models", () => {
      const status = engine.getStatus();
      expect(status.ml_models_implemented).toContain("ann");
      expect(status.ml_models_implemented).toContain("gpr");
      expect(status.ml_models_implemented).toContain("anfis");
    });

    it("includes optimization algorithms", () => {
      const status = engine.getStatus();
      expect(status.optimization_algorithms).toContain("genetic");
      expect(status.optimization_algorithms).toContain("taguchi");
    });

    it("returns valid year range", () => {
      const status = engine.getStatus();
      expect(status.year_range[0]).toBeLessThanOrEqual(status.year_range[1]);
      expect(status.year_range[1]).toBeGreaterThanOrEqual(2023);
    });
  });

  // =========================================================================
  // MRR Prediction
  // =========================================================================

  describe("predictMRR", () => {
    it("predicts MRR for D2 steel", () => {
      const result = engine.predictMRR({
        peak_current_A: 4.0,
        pulse_on_us: 18,
        pulse_off_us: 12,
        wire_feed_mpm: 8,
        material: "D2"
      });

      expect(result.mrr_mm3pm).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.model).toBe("ann");
      expect(result.reference).toContain("SpringerNature");
    });

    it("predicts higher MRR for higher conductivity materials", () => {
      const aluminum = engine.predictMRR({
        peak_current_A: 4.0,
        pulse_on_us: 18,
        pulse_off_us: 12,
        wire_feed_mpm: 8,
        material: "AL6061"
      });

      const carbide = engine.predictMRR({
        peak_current_A: 4.0,
        pulse_on_us: 18,
        pulse_off_us: 12,
        wire_feed_mpm: 8,
        material: "tungsten_carbide"
      });

      expect(aluminum.mrr_mm3pm).toBeGreaterThan(carbide.mrr_mm3pm);
    });

    it("MRR increases with higher current", () => {
      const lowCurrent = engine.predictMRR({
        peak_current_A: 2.0,
        pulse_on_us: 18,
        pulse_off_us: 12,
        wire_feed_mpm: 8,
        material: "D2"
      });

      const highCurrent = engine.predictMRR({
        peak_current_A: 6.0,
        pulse_on_us: 18,
        pulse_off_us: 12,
        wire_feed_mpm: 8,
        material: "D2"
      });

      expect(highCurrent.mrr_mm3pm).toBeGreaterThan(lowCurrent.mrr_mm3pm);
    });

    it("MRR increases with longer pulse on time", () => {
      const shortPulse = engine.predictMRR({
        peak_current_A: 4.0,
        pulse_on_us: 10,
        pulse_off_us: 12,
        wire_feed_mpm: 8,
        material: "D2"
      });

      const longPulse = engine.predictMRR({
        peak_current_A: 4.0,
        pulse_on_us: 30,
        pulse_off_us: 12,
        wire_feed_mpm: 8,
        material: "D2"
      });

      expect(longPulse.mrr_mm3pm).toBeGreaterThan(shortPulse.mrr_mm3pm);
    });

    it("MRR decreases with longer pulse off time", () => {
      const shortOff = engine.predictMRR({
        peak_current_A: 4.0,
        pulse_on_us: 18,
        pulse_off_us: 6,
        wire_feed_mpm: 8,
        material: "D2"
      });

      const longOff = engine.predictMRR({
        peak_current_A: 4.0,
        pulse_on_us: 18,
        pulse_off_us: 25,
        wire_feed_mpm: 8,
        material: "D2"
      });

      expect(shortOff.mrr_mm3pm).toBeGreaterThan(longOff.mrr_mm3pm);
    });

    it("handles unknown materials gracefully", () => {
      const result = engine.predictMRR({
        peak_current_A: 4.0,
        pulse_on_us: 18,
        pulse_off_us: 12,
        wire_feed_mpm: 8,
        material: "exotic_alloy_xyz"
      });

      expect(result.mrr_mm3pm).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Surface Roughness Prediction
  // =========================================================================

  describe("predictSurfaceRoughness", () => {
    it("predicts Ra with confidence interval", () => {
      const result = engine.predictSurfaceRoughness({
        peak_current_A: 4.0,
        pulse_on_us: 18,
        pulse_off_us: 12,
        wire_feed_mpm: 8,
        servo_voltage_V: 50,
        material: "D2"
      });

      expect(result.ra_um).toBeGreaterThan(0);
      expect(result.confidence_interval[0]).toBeLessThan(result.ra_um);
      expect(result.confidence_interval[1]).toBeGreaterThan(result.ra_um);
      expect(result.model).toBe("gpr");
      expect(result.reference).toContain("MDPI");
    });

    it("Ra increases with higher current", () => {
      const lowCurrent = engine.predictSurfaceRoughness({
        peak_current_A: 2.0,
        pulse_on_us: 18,
        pulse_off_us: 12,
        wire_feed_mpm: 8,
        servo_voltage_V: 50,
        material: "D2"
      });

      const highCurrent = engine.predictSurfaceRoughness({
        peak_current_A: 8.0,
        pulse_on_us: 18,
        pulse_off_us: 12,
        wire_feed_mpm: 8,
        servo_voltage_V: 50,
        material: "D2"
      });

      expect(highCurrent.ra_um).toBeGreaterThan(lowCurrent.ra_um);
    });

    it("Ra increases with longer pulse on time", () => {
      const shortPulse = engine.predictSurfaceRoughness({
        peak_current_A: 4.0,
        pulse_on_us: 8,
        pulse_off_us: 12,
        wire_feed_mpm: 8,
        servo_voltage_V: 50,
        material: "D2"
      });

      const longPulse = engine.predictSurfaceRoughness({
        peak_current_A: 4.0,
        pulse_on_us: 30,
        pulse_off_us: 12,
        wire_feed_mpm: 8,
        servo_voltage_V: 50,
        material: "D2"
      });

      expect(longPulse.ra_um).toBeGreaterThan(shortPulse.ra_um);
    });

    it("Ra decreases with longer pulse off time", () => {
      const shortOff = engine.predictSurfaceRoughness({
        peak_current_A: 4.0,
        pulse_on_us: 18,
        pulse_off_us: 6,
        wire_feed_mpm: 8,
        servo_voltage_V: 50,
        material: "D2"
      });

      const longOff = engine.predictSurfaceRoughness({
        peak_current_A: 4.0,
        pulse_on_us: 18,
        pulse_off_us: 20,
        wire_feed_mpm: 8,
        servo_voltage_V: 50,
        material: "D2"
      });

      expect(shortOff.ra_um).toBeGreaterThan(longOff.ra_um);
    });

    it("harder materials show higher Ra factors", () => {
      const aluminum = engine.predictSurfaceRoughness({
        peak_current_A: 4.0,
        pulse_on_us: 18,
        pulse_off_us: 12,
        wire_feed_mpm: 8,
        servo_voltage_V: 50,
        material: "AL6061"
      });

      const carbide = engine.predictSurfaceRoughness({
        peak_current_A: 4.0,
        pulse_on_us: 18,
        pulse_off_us: 12,
        wire_feed_mpm: 8,
        servo_voltage_V: 50,
        material: "tungsten_carbide"
      });

      expect(carbide.ra_um).toBeGreaterThan(aluminum.ra_um);
    });
  });

  // =========================================================================
  // Wire Breakage Prediction
  // =========================================================================

  describe("predictWireBreakage", () => {
    it("predicts low risk for conservative parameters", () => {
      const result = engine.predictWireBreakage({
        peak_current_A: 3.0,
        pulse_on_us: 15,
        pulse_off_us: 15,
        thickness_mm: 25,
        flushing_pressure_bar: 6,
        wire_tension_N: 12,
        material: "D2"
      });

      expect(result.risk_level).toBe("low");
      expect(result.probability).toBeLessThan(0.3);
      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
    });

    it("predicts high risk for aggressive parameters", () => {
      const result = engine.predictWireBreakage({
        peak_current_A: 10.0,
        pulse_on_us: 40,
        pulse_off_us: 5,
        thickness_mm: 100,
        flushing_pressure_bar: 2,
        wire_tension_N: 5,
        material: "Inconel_718"
      });

      expect(["high", "critical"]).toContain(result.risk_level);
      expect(result.probability).toBeGreaterThan(0.4);
      expect(result.contributing_factors.length).toBeGreaterThan(0);
    });

    it("identifies thermal overload risk", () => {
      const result = engine.predictWireBreakage({
        peak_current_A: 9.0,
        pulse_on_us: 35,
        pulse_off_us: 4,
        thickness_mm: 25,
        flushing_pressure_bar: 6,
        wire_tension_N: 12,
        material: "D2"
      });

      const thermalFactor = result.contributing_factors.find(f =>
        f.factor.toLowerCase().includes("thermal")
      );
      expect(thermalFactor).toBeDefined();
    });

    it("identifies flushing risk for thick sections", () => {
      const result = engine.predictWireBreakage({
        peak_current_A: 4.0,
        pulse_on_us: 18,
        pulse_off_us: 12,
        thickness_mm: 150,
        flushing_pressure_bar: 2,
        wire_tension_N: 12,
        material: "D2"
      });

      const flushFactor = result.contributing_factors.find(f =>
        f.factor.toLowerCase().includes("debris") ||
        f.factor.toLowerCase().includes("flush")
      );
      expect(flushFactor).toBeDefined();
    });

    it("identifies wire tension risk", () => {
      const lowTension = engine.predictWireBreakage({
        peak_current_A: 4.0,
        pulse_on_us: 18,
        pulse_off_us: 12,
        thickness_mm: 25,
        flushing_pressure_bar: 6,
        wire_tension_N: 4,
        material: "D2"
      });

      const tensionFactor = lowTension.contributing_factors.find(f =>
        f.factor.toLowerCase().includes("tension")
      );
      expect(tensionFactor).toBeDefined();
    });

    it("identifies challenging material risk", () => {
      const result = engine.predictWireBreakage({
        peak_current_A: 4.0,
        pulse_on_us: 18,
        pulse_off_us: 12,
        thickness_mm: 25,
        flushing_pressure_bar: 6,
        wire_tension_N: 12,
        material: "Inconel_718"
      });

      const materialFactor = result.contributing_factors.find(f =>
        f.factor.toLowerCase().includes("challenging") ||
        f.factor.toLowerCase().includes("inconel")
      );
      expect(materialFactor).toBeDefined();
    });

    it("provides recommendations for each risk factor", () => {
      const result = engine.predictWireBreakage({
        peak_current_A: 9.0,
        pulse_on_us: 35,
        pulse_off_us: 4,
        thickness_mm: 100,
        flushing_pressure_bar: 2,
        wire_tension_N: 4,
        material: "Inconel_718"
      });

      result.contributing_factors.forEach(factor => {
        expect(factor.recommendation).toBeDefined();
        expect(factor.recommendation.length).toBeGreaterThan(0);
      });
    });

    it("predicts break time for critical risk", () => {
      const result = engine.predictWireBreakage({
        peak_current_A: 10.0,
        pulse_on_us: 45,
        pulse_off_us: 3,
        thickness_mm: 150,
        flushing_pressure_bar: 1,
        wire_tension_N: 3,
        material: "tungsten_carbide"
      });

      if (result.risk_level === "critical") {
        expect(result.predicted_break_time_min).toBeDefined();
        expect(result.predicted_break_time_min).toBeLessThanOrEqual(10);
      }
    });
  });

  // =========================================================================
  // Full Prediction
  // =========================================================================

  describe("predictAll", () => {
    it("returns complete research-based predictions", () => {
      const result = engine.predictAll({
        peak_current_A: 4.0,
        pulse_on_us: 18,
        pulse_off_us: 12,
        wire_feed_mpm: 8,
        wire_tension_N: 12,
        servo_voltage_V: 50,
        flushing_pressure_bar: 6,
        thickness_mm: 25,
        material: "D2"
      });

      // MRR prediction
      expect(result.mrr_mm3pm.value).toBeGreaterThan(0);
      expect(result.mrr_mm3pm.confidence_interval).toHaveLength(2);
      expect(result.mrr_mm3pm.model).toBe("ann");

      // Surface roughness prediction
      expect(result.surface_roughness_um.value).toBeGreaterThan(0);
      expect(result.surface_roughness_um.confidence_interval).toHaveLength(2);
      expect(result.surface_roughness_um.model).toBe("gpr");

      // Wire breakage prediction
      expect(result.wire_break_risk.risk_level).toBeDefined();
      expect(result.wire_break_risk.probability).toBeDefined();

      // Energy consumption
      expect(result.energy_consumption_kj.value).toBeGreaterThan(0);

      // Research references
      expect(result.research_references.length).toBeGreaterThanOrEqual(4);
    });
  });

  // =========================================================================
  // Research Optimum
  // =========================================================================

  describe("getResearchOptimum", () => {
    it("returns optimal parameters for D2", () => {
      const result = engine.getResearchOptimum("D2");
      expect(result).not.toBeNull();
      expect(result!.peak_current_A).toBeDefined();
      expect(result!.pulse_on_us).toBeDefined();
      expect(result!.pulse_off_us).toBeDefined();
    });

    it("returns optimal parameters for various materials", () => {
      const materials = ["A2", "Ti6Al4V", "Inconel_718", "tungsten_carbide", "AL6061"];
      materials.forEach(material => {
        const result = engine.getResearchOptimum(material);
        expect(result).not.toBeNull();
      });
    });

    it("returns null for unknown materials", () => {
      const result = engine.getResearchOptimum("unobtanium");
      expect(result).toBeNull();
    });

    it("handles material name variations", () => {
      const result1 = engine.getResearchOptimum("AISI_1020");
      const result2 = engine.getResearchOptimum("aisi 1020");
      // Both should resolve or one may not - implementation dependent
      expect(result1 !== null || result2 !== null).toBe(true);
    });
  });

  // =========================================================================
  // Multi-Objective Optimization
  // =========================================================================

  describe("optimizeParameters", () => {
    it("returns pareto front with multiple solutions", () => {
      const result = engine.optimizeParameters({
        material: "D2",
        minimize_energy: true
      });

      expect(result.pareto_front.length).toBeGreaterThanOrEqual(3);
      expect(result.best_compromise).toBeDefined();
      expect(result.algorithm_used).toBe("genetic");
    });

    it("includes dominance ranking", () => {
      const result = engine.optimizeParameters({
        material: "D2",
        target_mrr_mm3pm: 25,
        minimize_energy: false
      });

      result.pareto_front.forEach(solution => {
        expect(solution.dominance_rank).toBeDefined();
        expect(solution.dominance_rank).toBeGreaterThanOrEqual(1);
      });
    });

    it("provides improvement percentages", () => {
      const result = engine.optimizeParameters({
        material: "D2",
        target_ra_um: 1.5,
        minimize_energy: true
      });

      expect(result.improvement_pct).toBeDefined();
      expect(typeof result.improvement_pct.ra).toBe("number");
      expect(typeof result.improvement_pct.energy).toBe("number");
    });

    it("reports convergence generations", () => {
      const result = engine.optimizeParameters({
        material: "Ti6Al4V",
        target_mrr_mm3pm: 15,
        minimize_energy: true
      });

      expect(result.convergence_generations).toBeDefined();
      expect(result.convergence_generations).toBeGreaterThan(0);
    });

    it("handles unknown materials with default baseline", () => {
      const result = engine.optimizeParameters({
        material: "exotic_alloy",
        minimize_energy: true
      });

      expect(result.pareto_front.length).toBeGreaterThan(0);
      expect(result.best_compromise).toBeDefined();
    });
  });

  // =========================================================================
  // Research Database
  // =========================================================================

  describe("searchResearch", () => {
    it("finds papers by keyword", () => {
      const results = engine.searchResearch("surface roughness");
      expect(results.length).toBeGreaterThan(0);
    });

    it("finds papers about ANN", () => {
      const results = engine.searchResearch("ANN");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].key_findings.some(f =>
        f.toLowerCase().includes("ann") || f.toLowerCase().includes("neural")
      )).toBe(true);
    });

    it("finds papers about optimization", () => {
      const results = engine.searchResearch("optimization");
      expect(results.length).toBeGreaterThan(0);
    });

    it("returns empty array for no matches", () => {
      const results = engine.searchResearch("quantum teleportation xyz");
      expect(results).toEqual([]);
    });
  });

  describe("getAllResearch", () => {
    it("returns all research papers", () => {
      const papers = engine.getAllResearch();
      expect(papers.length).toBeGreaterThanOrEqual(8);
      papers.forEach(paper => {
        expect(paper.title).toBeDefined();
        expect(paper.journal).toBeDefined();
        expect(paper.year).toBeDefined();
        expect(paper.key_findings.length).toBeGreaterThan(0);
      });
    });
  });

  describe("getResearchByYear", () => {
    it("filters papers by year range", () => {
      const papers = engine.getResearchByYear(2024, 2026);
      expect(papers.length).toBeGreaterThan(0);
      papers.forEach(paper => {
        expect(paper.year).toBeGreaterThanOrEqual(2024);
        expect(paper.year).toBeLessThanOrEqual(2026);
      });
    });

    it("returns empty for out-of-range years", () => {
      const papers = engine.getResearchByYear(1990, 1995);
      expect(papers).toEqual([]);
    });
  });

  // =========================================================================
  // ANN Architectures
  // =========================================================================

  describe("getANNArchitecture", () => {
    it("returns architecture for MRR prediction", () => {
      const arch = engine.getANNArchitecture("mrr_prediction");
      expect(arch).not.toBeNull();
      expect(arch!.input_features).toContain("peak_current");
      expect(arch!.hidden_layers.length).toBeGreaterThan(0);
      expect(arch!.output_layer.outputs).toContain("mrr");
    });

    it("returns architecture for surface roughness", () => {
      const arch = engine.getANNArchitecture("surface_roughness_prediction");
      expect(arch).not.toBeNull();
      expect(arch!.output_layer.outputs).toContain("surface_roughness");
    });

    it("returns architecture for wire breakage classification", () => {
      const arch = engine.getANNArchitecture("wire_breakage_classification");
      expect(arch).not.toBeNull();
      expect(arch!.output_layer.activation).toBe("softmax");
      expect(arch!.output_layer.outputs).toContain("break_risk");
    });

    it("returns architecture for multi-output optimization", () => {
      const arch = engine.getANNArchitecture("multi_output_optimization");
      expect(arch).not.toBeNull();
      expect(arch!.output_layer.neurons).toBe(3);
    });

    it("returns null for unknown architecture", () => {
      const arch = engine.getANNArchitecture("unknown_task");
      expect(arch).toBeNull();
    });
  });

  describe("getAllArchitectures", () => {
    it("returns all ANN architectures", () => {
      const archs = engine.getAllArchitectures();
      expect(Object.keys(archs).length).toBeGreaterThanOrEqual(4);
      expect(archs.mrr_prediction).toBeDefined();
      expect(archs.surface_roughness_prediction).toBeDefined();
      expect(archs.wire_breakage_classification).toBeDefined();
      expect(archs.multi_output_optimization).toBeDefined();
    });
  });

  // =========================================================================
  // Research Paper Structure
  // =========================================================================

  describe("research paper structure", () => {
    it("papers have required fields", () => {
      const papers = engine.getAllResearch();
      papers.forEach(paper => {
        expect(paper.title).toBeTruthy();
        expect(paper.authors).toBeInstanceOf(Array);
        expect(paper.journal).toBeTruthy();
        expect(paper.year).toBeGreaterThan(2000);
        expect(paper.key_findings).toBeInstanceOf(Array);
        expect(paper.key_findings.length).toBeGreaterThan(0);
      });
    });

    it("some papers have model accuracy data", () => {
      const papers = engine.getAllResearch();
      const withAccuracy = papers.filter(p => p.model_accuracy);
      expect(withAccuracy.length).toBeGreaterThan(0);
      withAccuracy.forEach(paper => {
        expect(paper.model_accuracy!.model_type).toBeDefined();
      });
    });

    it("some papers have optimal parameters", () => {
      const papers = engine.getAllResearch();
      const withParams = papers.filter(p => p.optimal_params);
      expect(withParams.length).toBeGreaterThan(0);
    });
  });
});
