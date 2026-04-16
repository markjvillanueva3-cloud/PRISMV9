/**
 * WEDM-AI-MACRO Tests
 *
 * Verifies Wire EDM AI integration for:
 * - CAD modeling and geometry generation
 * - Macro programming and parametric design
 * - Template system and family programming
 * - Batch optimization and automation workflows
 */

import { describe, it, expect } from "vitest";
import { prismIntelligence, type AIReasoningDomain } from "../engines/PRISMIntelligenceLayer.js";
import { WEDMCompleteOrchestrationEngine } from "../engines/WEDMCompleteOrchestrationEngine.js";

describe("WEDM-AI-MACRO", () => {
  describe("CAD Modeling AI Domains", () => {
    it("should support wedm_cad_modeling domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_cad_modeling",
        intent: "Create CAD model for punch die profile",
        context: {
          material: "D2",
          profile_type: "punch",
          min_corner_radius_mm: 0.3,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
      expect(["ai", "fallback"]).toContain(result.source);
    });

    it("should support wedm_geometry_generation domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_geometry_generation",
        intent: "Generate cut geometry from solid model",
        context: {
          material: "S7",
          profile_count: 3,
          total_perimeter_mm: 450,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_profile_optimization domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_profile_optimization",
        intent: "Optimize wire path for multi-profile job",
        context: {
          material: "A2",
          profile_count: 5,
          has_arcs: true,
          min_corner_radius_mm: 0.5,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });
  });

  describe("Macro Programming AI Domains", () => {
    it("should support wedm_macro_generation domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_macro_generation",
        intent: "Generate parametric macro for Mitsubishi M800",
        context: {
          controller: "mitsubishi",
          profile_type: "die",
          variable_dimensions: ["width", "height", "corner_radius"],
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_parametric_programming domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_parametric_programming",
        intent: "Design parametric program for hex die family",
        context: {
          part_family: "hex_die",
          size_range: "M6-M24",
          variable_count: 4,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_variable_strategy domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_variable_strategy",
        intent: "Design adaptive strategy for material hardness range",
        context: {
          material: "4140",
          hardness_range: "28-52 HRC",
          thickness_range: "15-50mm",
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });
  });

  describe("Template System AI Domains", () => {
    it("should support wedm_template_design domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_template_design",
        intent: "Design template architecture for cold heading dies",
        context: {
          template_category: "die",
          operations: ["rough", "semi", "finish"],
          pass_count_range: "3-7",
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_program_template domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_program_template",
        intent: "Create program template for Sodick controller",
        context: {
          controller: "sodick",
          template_sections: ["header", "geometry", "footer"],
          include_comments: true,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_family_programming domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_family_programming",
        intent: "Develop family programming for fastener die series",
        context: {
          part_family: "socket_head_die",
          size_variants: ["M4", "M5", "M6", "M8", "M10", "M12"],
          common_features: ["hex_pocket", "bore", "chamfer"],
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });
  });

  describe("Batch & Automation AI Domains", () => {
    it("should support wedm_batch_optimization domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_batch_optimization",
        intent: "Optimize batch production of 50 die inserts",
        context: {
          part_count: 50,
          material: "M2",
          cycle_time_target_min: 45,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_nesting_strategy domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_nesting_strategy",
        intent: "Optimize nesting for 12 parts on 300x200mm stock",
        context: {
          part_count: 12,
          stock_width_mm: 300,
          stock_height_mm: 200,
          part_size_mm: 40,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_automation_workflow domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_automation_workflow",
        intent: "Design automation workflow for lights-out production",
        context: {
          machine_manufacturer: "Mitsubishi",
          shift_hours: 16,
          has_robot_loader: true,
          has_dnc: true,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });
  });

  describe("WEDMCompleteOrchestrationEngine Macro/Template Integration", () => {
    it("should include CAD modeling recommendations when profiles provided", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        profiles: [
          {
            id: "die-1",
            type: "closed",
            is_exterior: false,
            perimeter_mm: 120,
            area_mm2: 400,
            min_corner_radius_mm: 0.5,
            has_arcs: true,
          },
        ],
      });

      expect(result.ai_recommendations).toHaveProperty("cad_modeling");
      expect(result.ai_recommendations).toHaveProperty("geometry_generation");
      expect(result.ai_recommendations).toHaveProperty("profile_optimization");
    });

    it("should include macro generation recommendations", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        machine_manufacturer: "Mitsubishi",
        controller: "mitsubishi",
      });

      expect(result.ai_recommendations).toHaveProperty("macro_generation");
      expect(result.ai_recommendations).toHaveProperty("parametric_programming");
      expect(result.ai_recommendations).toHaveProperty("variable_strategy");
    });

    it("should include template recommendations", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "S7",
        thickness_mm: 30,
        target_ra_um: 0.6,
        profiles: [
          {
            id: "punch-1",
            type: "closed",
            is_exterior: true,
            perimeter_mm: 100,
            has_arcs: false,
          },
        ],
      });

      expect(result.ai_recommendations).toHaveProperty("template_design");
      expect(result.ai_recommendations).toHaveProperty("program_template");
    });

    it("should include family programming for named parts", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "M2",
        thickness_mm: 20,
        target_ra_um: 0.4,
        part_name: "M8 Hex Die Insert",
        part_number: "HDI-M8-001",
      });

      expect(result.ai_recommendations).toHaveProperty("family_programming");
    });

    it("should include batch optimization for multi-piece jobs", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        profiles: [
          { id: "p1", type: "closed", is_exterior: true, perimeter_mm: 80, has_arcs: true },
          { id: "p2", type: "closed", is_exterior: true, perimeter_mm: 80, has_arcs: true },
          { id: "p3", type: "closed", is_exterior: true, perimeter_mm: 80, has_arcs: true },
        ],
        width_mm: 150,
        height_mm: 100,
      });

      expect(result.ai_recommendations).toHaveProperty("batch_optimization");
      expect(result.ai_recommendations).toHaveProperty("nesting_strategy");
    });

    it("should include automation workflow recommendations", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "A2",
        thickness_mm: 15,
        target_ra_um: 1.0,
        machine_manufacturer: "Sodick",
        part_name: "Production Die",
      });

      expect(result.ai_recommendations).toHaveProperty("automation_workflow");
    });
  });

  describe("Macro/Template Synthesis Report", () => {
    it("should include macro/template summaries in synthesis report", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        part_name: "Test Die Family",
        part_number: "TDF-001",
        profiles: [
          { id: "p1", type: "closed", is_exterior: false, perimeter_mm: 100, has_arcs: true },
          { id: "p2", type: "closed", is_exterior: false, perimeter_mm: 100, has_arcs: true },
        ],
      });

      const report = result.ai_recommendations?.synthesis_report ?? "";
      expect(report.length).toBeGreaterThan(200);
      // Should have macro/template-related summaries
      const lines = report.split("\n").filter(l => l.startsWith("-"));
      expect(lines.length).toBeGreaterThan(5);
    });
  });

  describe("Controller-Specific Macro Generation", () => {
    it("should adapt macro generation for Mitsubishi controller", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_macro_generation",
        intent: "Generate macro for Mitsubishi M800 controller",
        context: {
          controller: "mitsubishi",
          machine_model: "MV1200-S",
        },
      });

      expect(result).toHaveProperty("success");
    });

    it("should adapt macro generation for Sodick controller", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_macro_generation",
        intent: "Generate macro for Sodick LN2W controller",
        context: {
          controller: "sodick",
          machine_model: "AG600LH",
        },
      });

      expect(result).toHaveProperty("success");
    });

    it("should adapt macro generation for Makino controller", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_macro_generation",
        intent: "Generate macro for Makino Hyper-i controller",
        context: {
          controller: "makino",
          machine_model: "U6",
        },
      });

      expect(result).toHaveProperty("success");
    });
  });

  describe("Tribal Synthesis for Macro/Template Domains", () => {
    it("should inject tribal knowledge for macro programming", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_macro_generation",
        intent: "Macro tips for die programming",
        context: { material: "D2", controller: "mitsubishi" },
      });

      expect(result).toHaveProperty("success");
    });

    it("should inject tribal knowledge for template design", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_template_design",
        intent: "Template best practices for cold heading tools",
        context: { part_type: "die", industry: "fastener" },
      });

      expect(result).toHaveProperty("success");
    });

    it("should inject tribal knowledge for batch production", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_batch_optimization",
        intent: "Batch tips for production efficiency",
        context: { part_count: 100, material: "M2" },
      });

      expect(result).toHaveProperty("success");
    });
  });
});
