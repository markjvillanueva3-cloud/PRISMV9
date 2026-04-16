/**
 * WEDM-AI-ADVANCED Tests
 *
 * Verifies Wire EDM advanced AI integration:
 * - Quality and inspection domains
 * - Troubleshooting and diagnostics domains
 * - Learning and optimization domains
 * - Cost and scheduling domains
 */

import { describe, it, expect } from "vitest";
import { prismIntelligence, type AIReasoningDomain } from "../engines/PRISMIntelligenceLayer.js";
import { WEDMCompleteOrchestrationEngine } from "../engines/WEDMCompleteOrchestrationEngine.js";

describe("WEDM-AI-ADVANCED", () => {
  describe("Quality & Inspection AI Domains", () => {
    it("should support wedm_dimensional_verification domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_dimensional_verification",
        intent: "Plan dimensional verification for aerospace WEDM part",
        context: {
          material: "Inconel 718",
          spec_class: "aerospace",
          target_accuracy_mm: 0.005,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
      expect(["ai", "fallback"]).toContain(result.source);
    });

    it("should support wedm_spc_analysis domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_spc_analysis",
        intent: "Implement SPC for die production run",
        context: {
          material: "D2",
          batch_size: 100,
          critical_dimension_count: 5,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_metrology_strategy domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_metrology_strategy",
        intent: "Develop metrology strategy for tight-tolerance parts",
        context: {
          target_accuracy_mm: 0.003,
          target_ra_um: 0.2,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_first_article domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_first_article",
        intent: "Plan AS9102 first article inspection",
        context: {
          spec_class: "aerospace",
          requires_as9102: true,
          dimension_count: 45,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });
  });

  describe("Troubleshooting & Diagnostics AI Domains", () => {
    it("should support wedm_wire_break_diagnosis domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_wire_break_diagnosis",
        intent: "Diagnose repeated wire breaks at corners",
        context: {
          material: "carbide",
          thickness_mm: 30,
          break_location: "sharp_corner",
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_dimension_drift domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_dimension_drift",
        intent: "Diagnose gradual dimension drift over production run",
        context: {
          drift_pattern: "gradual",
          direction: "oversized",
          drift_amount_mm: 0.015,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_surface_defect domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_surface_defect",
        intent: "Diagnose witness lines on finish pass",
        context: {
          defect_type: "witness_lines",
          material: "D2",
          pass_number: 4,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_process_recovery domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_process_recovery",
        intent: "Recover from mid-cut wire break",
        context: {
          machine_manufacturer: "Mitsubishi",
          break_position: "mid_profile",
          pass_number: 2,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });
  });

  describe("Learning & Optimization AI Domains", () => {
    it("should support wedm_performance_prediction domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_performance_prediction",
        intent: "Predict performance for new material grade",
        context: {
          material: "A2",
          thickness_mm: 35,
          target_ra_um: 0.6,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_historical_analysis domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_historical_analysis",
        intent: "Analyze performance trends for D2 steel jobs",
        context: {
          material: "D2",
          time_period: "6_months",
          job_count: 150,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_continuous_improvement domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_continuous_improvement",
        intent: "Identify improvement opportunities for WEDM cell",
        context: {
          current_oee: 0.65,
          target_oee: 0.80,
          constraint: "setup_time",
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_calibration_learning domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_calibration_learning",
        intent: "Implement calibration learning from production data",
        context: {
          machine_id: "MV1200-01",
          data_points: 500,
          calibration_type: "offset",
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });
  });

  describe("Cost & Scheduling AI Domains", () => {
    it("should support wedm_cost_estimation domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_cost_estimation",
        intent: "Estimate cost for die insert production",
        context: {
          material: "M2",
          thickness_mm: 20,
          perimeter_mm: 150,
          pass_count: 5,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_cycle_prediction domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_cycle_prediction",
        intent: "Predict cycle time for complex die geometry",
        context: {
          material: "D2",
          thickness_mm: 25,
          perimeter_mm: 300,
          corner_count: 12,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_machine_routing domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_machine_routing",
        intent: "Route job across 3 WEDM machines",
        context: {
          machines: ["MV1200-01", "MV1200-02", "AG600L"],
          job_size: "large",
          precision_class: "high",
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_capacity_planning domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_capacity_planning",
        intent: "Plan capacity for Q2 production forecast",
        context: {
          machine_count: 2,
          shift_hours: 16,
          forecast_hours: 1200,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });
  });

  describe("WEDMCompleteOrchestrationEngine Advanced AI Integration", () => {
    it("should include quality/verification recommendations", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        spec_class: "precision",
        target_accuracy_mm: 0.005,
      });

      expect(result.ai_recommendations).toHaveProperty("dimensional_verification");
      expect(result.ai_recommendations).toHaveProperty("metrology_strategy");
    });

    it("should include first article for aerospace parts", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "Inconel 718",
        thickness_mm: 20,
        target_ra_um: 0.4,
        spec_class: "aerospace",
      });

      expect(result.ai_recommendations).toHaveProperty("first_article");
    });

    it("should include wire break prevention recommendations", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "carbide",
        thickness_mm: 30,
        target_ra_um: 0.4,
        profiles: [
          {
            id: "p1",
            type: "closed",
            is_exterior: false,
            perimeter_mm: 100,
            min_corner_radius_mm: 0.3,
            has_arcs: false,
          },
        ],
      });

      expect(result.ai_recommendations).toHaveProperty("wire_break_diagnosis");
      expect(result.ai_recommendations).toHaveProperty("process_recovery");
    });

    it("should include performance and cycle predictions", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "A2",
        thickness_mm: 20,
        target_ra_um: 0.6,
        profiles: [
          { id: "p1", type: "closed", is_exterior: true, perimeter_mm: 150, has_arcs: true },
        ],
      });

      expect(result.ai_recommendations).toHaveProperty("performance_prediction");
      expect(result.ai_recommendations).toHaveProperty("cycle_prediction");
    });

    it("should include cost estimation recommendations", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "M2",
        thickness_mm: 20,
        target_ra_um: 0.4,
        part_name: "Die Insert",
      });

      expect(result.ai_recommendations).toHaveProperty("cost_estimation");
    });

    it("should include machine routing when manufacturer specified", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        machine_manufacturer: "Mitsubishi",
        machine_model: "MV1200-S",
      });

      expect(result.ai_recommendations).toHaveProperty("machine_routing");
    });
  });

  describe("Advanced AI Synthesis Report", () => {
    it("should include advanced domain summaries in report", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        spec_class: "aerospace",
        part_name: "Aerospace Die",
        machine_manufacturer: "Mitsubishi",
        profiles: [
          { id: "p1", type: "closed", is_exterior: false, perimeter_mm: 100, has_arcs: true },
        ],
      });

      const report = result.ai_recommendations?.synthesis_report ?? "";
      expect(report.length).toBeGreaterThan(300);
      // Should have verification and cost summaries
      expect(report).toMatch(/Verification:|Cost:|Cycle Time:|Performance:/);
    });
  });

  describe("Tribal Synthesis for Advanced Domains", () => {
    it("should inject tribal knowledge for quality domains", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_dimensional_verification",
        intent: "Verification tips for die work",
        context: { material: "D2", spec_class: "precision" },
      });

      expect(result).toHaveProperty("success");
    });

    it("should inject tribal knowledge for troubleshooting", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_wire_break_diagnosis",
        intent: "Wire break troubleshooting for carbide",
        context: { material: "carbide", thickness_mm: 30 },
      });

      expect(result).toHaveProperty("success");
    });

    it("should inject tribal knowledge for cost estimation", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_cost_estimation",
        intent: "Costing best practices for tool steel",
        context: { material: "M2", thickness_mm: 20 },
      });

      expect(result).toHaveProperty("success");
    });
  });
});
