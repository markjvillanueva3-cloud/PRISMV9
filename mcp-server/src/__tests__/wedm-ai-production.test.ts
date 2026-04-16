/**
 * WEDM-AI-PRODUCTION Tests
 *
 * Verifies Wire EDM production AI integration:
 * - Operator/training AI domains
 * - Documentation AI domains
 * - Safety/compliance AI domains
 * - Integration/simulation AI domains
 */

import { describe, it, expect } from "vitest";
import { prismIntelligence, type AIReasoningDomain } from "../engines/PRISMIntelligenceLayer.js";
import { WEDMCompleteOrchestrationEngine } from "../engines/WEDMCompleteOrchestrationEngine.js";

describe("WEDM-AI-PRODUCTION", () => {
  describe("Operator & Training AI Domains", () => {
    it("should support wedm_operator_guidance domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_operator_guidance",
        intent: "Provide operator guidance for D2 WEDM job",
        context: {
          material: "D2",
          thickness_mm: 25,
          skill_level: "intermediate",
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
      expect(["ai", "fallback"]).toContain(result.source);
    });

    it("should support wedm_skill_assessment domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_skill_assessment",
        intent: "Assess skill requirements for aerospace WEDM work",
        context: {
          spec_class: "aerospace",
          target_ra_um: 0.4,
          has_difficult_features: true,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_training_recommendation domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_training_recommendation",
        intent: "Recommend training for carbide WEDM operations",
        context: {
          material: "carbide",
          skill_level: "beginner",
          has_tapers: true,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_real_time_assist domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_real_time_assist",
        intent: "Configure real-time assistance for Mitsubishi WEDM",
        context: {
          machine_manufacturer: "Mitsubishi",
          controller: "mitsubishi",
          has_alarms: true,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });
  });

  describe("Documentation AI Domains", () => {
    it("should support wedm_setup_documentation domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_setup_documentation",
        intent: "Generate setup documentation for die insert",
        context: {
          part_name: "Die Insert A1",
          material: "D2",
          machine_manufacturer: "Mitsubishi",
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_work_instruction domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_work_instruction",
        intent: "Create work instructions for precision WEDM",
        context: {
          spec_class: "precision",
          target_ra_um: 0.6,
          requires_iso: false,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_process_sheet domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_process_sheet",
        intent: "Generate process sheet for multi-profile job",
        context: {
          material: "M2",
          profile_count: 4,
          total_perimeter_mm: 350,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_knowledge_capture domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_knowledge_capture",
        intent: "Set up knowledge capture for carbide WEDM",
        context: {
          material: "carbide",
          capture_modes: ["process_data", "operator_notes"],
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });
  });

  describe("Safety & Compliance AI Domains", () => {
    it("should support wedm_safety_analysis domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_safety_analysis",
        intent: "Analyze safety for D2 WEDM at 30mm thickness",
        context: {
          material: "D2",
          thickness_mm: 30,
          submerged: true,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_hazard_prevention domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_hazard_prevention",
        intent: "Develop hazard prevention plan for WEDM cell",
        context: {
          machine_manufacturer: "Mitsubishi",
          wire_type: "brass",
          has_dielectric: true,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_compliance_check domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_compliance_check",
        intent: "Check AS9100 compliance for aerospace WEDM",
        context: {
          spec_class: "aerospace",
          requires_as9100: true,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_environmental domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_environmental",
        intent: "Assess environmental impact of brass wire EDM",
        context: {
          wire_type: "brass",
          dielectric_type: "deionized_water",
          material: "D2",
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });
  });

  describe("Integration & Simulation AI Domains", () => {
    it("should support wedm_erp_integration domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_erp_integration",
        intent: "Configure ERP integration for WEDM job tracking",
        context: {
          has_job_number: true,
          has_part_number: true,
          part_name: "Die Insert",
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_mes_integration domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_mes_integration",
        intent: "Set up MES integration for Mitsubishi WEDM cell",
        context: {
          machine_manufacturer: "Mitsubishi",
          has_automation: true,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_simulation_verify domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_simulation_verify",
        intent: "Verify simulation for 3-profile WEDM job",
        context: {
          profile_count: 3,
          total_perimeter_mm: 250,
          has_tapers: false,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_dnc_optimization domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_dnc_optimization",
        intent: "Optimize DNC for Mitsubishi controller",
        context: {
          controller: "mitsubishi",
          program_size_kb_estimate: 75,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });
  });

  describe("WEDMCompleteOrchestrationEngine Production AI Integration", () => {
    it("should include operator guidance recommendations", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        operator_skill_level: "intermediate",
      });

      expect(result.ai_recommendations).toHaveProperty("operator_guidance");
      expect(result.ai_recommendations).toHaveProperty("skill_assessment");
    });

    it("should include documentation recommendations", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "M2",
        thickness_mm: 20,
        target_ra_um: 0.6,
        part_name: "Die Insert",
      });

      expect(result.ai_recommendations).toHaveProperty("setup_documentation");
      expect(result.ai_recommendations).toHaveProperty("work_instruction");
      expect(result.ai_recommendations).toHaveProperty("process_sheet");
    });

    it("should include safety analysis recommendations", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "carbide",
        thickness_mm: 30,
        target_ra_um: 0.4,
        submerged: true,
      });

      expect(result.ai_recommendations).toHaveProperty("safety_analysis");
      expect(result.ai_recommendations).toHaveProperty("hazard_prevention");
      expect(result.ai_recommendations).toHaveProperty("environmental");
    });

    it("should include compliance check for aerospace parts", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "Inconel 718",
        thickness_mm: 20,
        target_ra_um: 0.4,
        spec_class: "aerospace",
      });

      expect(result.ai_recommendations).toHaveProperty("compliance_check");
    });

    it("should include integration recommendations", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        machine_manufacturer: "Mitsubishi",
        job_number: "JOB-001",
        part_number: "P-1234",
      });

      expect(result.ai_recommendations).toHaveProperty("erp_integration");
      expect(result.ai_recommendations).toHaveProperty("mes_integration");
      expect(result.ai_recommendations).toHaveProperty("dnc_optimization");
    });

    it("should include simulation verification", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "A2",
        thickness_mm: 20,
        target_ra_um: 0.6,
        profiles: [
          { id: "p1", type: "closed", is_exterior: false, perimeter_mm: 100, has_arcs: true },
          { id: "p2", type: "closed", is_exterior: false, perimeter_mm: 80, has_arcs: false },
        ],
      });

      expect(result.ai_recommendations).toHaveProperty("simulation_verify");
    });
  });

  describe("Production AI Synthesis Report", () => {
    it("should include production domain summaries in report", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        spec_class: "aerospace",
        part_name: "Aerospace Die",
        machine_manufacturer: "Mitsubishi",
        job_number: "JOB-002",
        profiles: [
          { id: "p1", type: "closed", is_exterior: false, perimeter_mm: 100, has_arcs: true },
        ],
      });

      const report = result.ai_recommendations?.synthesis_report ?? "";
      expect(report.length).toBeGreaterThan(400);
      // Should have production domain summaries
      expect(report).toMatch(/Operator:|Safety:|Compliance:|ERP:|Setup Doc:|Simulation:/);
    });
  });

  describe("Tribal Synthesis for Production Domains", () => {
    it("should inject tribal knowledge for operator guidance", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_operator_guidance",
        intent: "Operator tips for die work",
        context: { material: "D2", skill_level: "intermediate" },
      });

      expect(result).toHaveProperty("success");
    });

    it("should inject tribal knowledge for safety analysis", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_safety_analysis",
        intent: "Safety considerations for carbide",
        context: { material: "carbide", thickness_mm: 30 },
      });

      expect(result).toHaveProperty("success");
    });

    it("should inject tribal knowledge for ERP integration", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_erp_integration",
        intent: "ERP best practices for die production",
        context: { has_job_number: true, part_name: "Die Insert" },
      });

      expect(result).toHaveProperty("success");
    });
  });
});
