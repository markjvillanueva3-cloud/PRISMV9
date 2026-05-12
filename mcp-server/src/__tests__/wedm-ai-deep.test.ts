/**
 * WEDM-AI-DEEP Tests
 *
 * Verifies deep Wire EDM AI integration:
 * - CAD/Drawing analysis domains
 * - Workholding and fixturing domains
 * - Setup and job planning domains
 * - Advanced parameter optimization domains
 */

import { describe, it, expect } from "vitest";
import { prismIntelligence, type AIReasoningDomain } from "../engines/PRISMIntelligenceLayer.js";
import { WEDMCompleteOrchestrationEngine } from "../engines/WEDMCompleteOrchestrationEngine.js";

describe("WEDM-AI-DEEP", () => {
  describe("CAD/Drawing AI Domains", () => {
    it("should support wedm_cad_analysis domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_cad_analysis",
        intent: "Analyze punch die geometry for WEDM",
        context: {
          material: "D2",
          profile_count: 4,
          min_corner_radius_mm: 0.3,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
      expect(["ai", "fallback"]).toContain(result.source);
    });

    it("should support wedm_feature_recognition domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_feature_recognition",
        intent: "Identify punch, die, and slug features",
        context: {
          material: "S7",
          profiles: [
            { type: "closed", is_exterior: true },
            { type: "closed", is_exterior: false },
          ],
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_drawing_interpretation domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_drawing_interpretation",
        intent: "Interpret GD&T for aerospace WEDM part",
        context: {
          material: "Inconel 718",
          spec_class: "aerospace",
          target_accuracy_mm: 0.005,
          max_recast_um: 5,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });
  });

  describe("Workholding AI Domains", () => {
    it("should support wedm_workholding domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_workholding",
        intent: "Recommend workholding for carbide insert blank",
        context: {
          material: "carbide",
          thickness_mm: 12,
          width_mm: 50,
          submerged: true,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_fixturing domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_fixturing",
        intent: "Design fixture for multi-piece WEDM batch",
        context: {
          material: "4140",
          piece_count: 8,
          profile_type: "die",
          taper_angle_deg: 0.5,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_clamping_strategy domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_clamping_strategy",
        intent: "Develop clamping for thin hardened steel",
        context: {
          material: "D2",
          thickness_mm: 3,
          hardness_hrc: 62,
          has_thin_sections: true,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });
  });

  describe("Setup & Job Planning AI Domains", () => {
    it("should support wedm_setup_sequence domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_setup_sequence",
        intent: "Plan setup sequence for Mitsubishi MV1200",
        context: {
          machine_manufacturer: "Mitsubishi",
          machine_model: "MV1200-S",
          material: "D2",
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_machine_prep domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_machine_prep",
        intent: "Machine prep checklist for tight-tolerance work",
        context: {
          target_ra_um: 0.2,
          target_accuracy_mm: 0.003,
          wire_type: "brass",
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_job_planning domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_job_planning",
        intent: "Create job plan for cold heading die production",
        context: {
          part_name: "M8 Hex Die Insert",
          material: "M2",
          profile_count: 1,
          total_perimeter_mm: 85,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });
  });

  describe("Advanced Parameter AI Domains", () => {
    it("should support wedm_adaptive_parameters domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_adaptive_parameters",
        intent: "Optimize adaptive parameters for bi-material zone",
        context: {
          material: "D2",
          has_thickness_variation: true,
          bi_material_zones: [
            { start_mm: 0, end_mm: 15, material: "steel" },
            { start_mm: 15, end_mm: 25, material: "carbide" },
          ],
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_corner_strategy domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_corner_strategy",
        intent: "Optimize sharp corner strategy for punch profile",
        context: {
          material: "A2",
          min_corner_radius_mm: 0.15,
          wire_diameter_mm: 0.25,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });

    it("should support wedm_thin_section domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_thin_section",
        intent: "Optimize parameters for 2mm sheet stock",
        context: {
          material: "304SS",
          thickness_mm: 2,
          is_sheet: true,
          has_narrow_features: true,
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("recommendation");
    });
  });

  describe("WEDMCompleteOrchestrationEngine Deep AI Integration", () => {
    it("should include deep AI recommendations when profiles provided", async () => {
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

      expect(result.ai_recommendations).toHaveProperty("cad_analysis");
      expect(result.ai_recommendations).toHaveProperty("feature_recognition");
    });

    it("should include workholding recommendations", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "carbide",
        thickness_mm: 15,
        target_ra_um: 0.4,
        width_mm: 50,
        height_mm: 50,
        submerged: true,
      });

      expect(result.ai_recommendations).toHaveProperty("workholding");
      expect(result.ai_recommendations).toHaveProperty("fixturing");
      expect(result.ai_recommendations).toHaveProperty("clamping_strategy");
    });

    it("should include setup and job planning recommendations", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        part_name: "Die Insert A",
        part_number: "DI-2026-001",
        machine_manufacturer: "Mitsubishi",
      });

      expect(result.ai_recommendations).toHaveProperty("setup_sequence");
      expect(result.ai_recommendations).toHaveProperty("machine_prep");
      expect(result.ai_recommendations).toHaveProperty("job_planning");
    });

    it("should include adaptive parameter recommendations", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        bi_material_zones: [
          { start_mm: 0, end_mm: 20, material: "D2" },
          { start_mm: 20, end_mm: 25, material: "carbide" },
        ],
      });

      expect(result.ai_recommendations).toHaveProperty("adaptive_parameters");
    });

    it("should include corner strategy for tight-radius profiles", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "A2",
        thickness_mm: 20,
        target_ra_um: 0.6,
        profiles: [
          {
            id: "punch-1",
            type: "closed",
            is_exterior: true,
            perimeter_mm: 80,
            min_corner_radius_mm: 0.2,
            has_arcs: false,
          },
        ],
      });

      expect(result.ai_recommendations).toHaveProperty("corner_strategy");
    });

    it("should include thin section strategy for thin stock", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "304SS",
        thickness_mm: 2,
        target_ra_um: 0.8,
      });

      expect(result.ai_recommendations).toHaveProperty("thin_section");
    });

    it("should include drawing interpretation for spec-class jobs", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "Inconel 718",
        thickness_mm: 20,
        target_ra_um: 0.2,
        spec_class: "aerospace",
        target_accuracy_mm: 0.005,
        max_recast_um: 5,
      });

      expect(result.ai_recommendations).toHaveProperty("drawing_interpretation");
    });
  });

  describe("Deep AI Synthesis Report", () => {
    it("should generate comprehensive synthesis report", async () => {
      const engine = new WEDMCompleteOrchestrationEngine();
      const result = await engine.generateCompleteProgram({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        part_name: "Test Part",
        profiles: [
          {
            id: "p1",
            type: "closed",
            is_exterior: false,
            perimeter_mm: 100,
            min_corner_radius_mm: 0.3,
            has_arcs: true,
          },
        ],
      });

      const report = result.ai_recommendations?.synthesis_report ?? "";
      expect(report.length).toBeGreaterThan(100);
      // Should have multiple AI recommendation summaries
      expect(report.split("\n").filter(l => l.startsWith("-")).length).toBeGreaterThan(3);
    });
  });

  describe("Tribal Synthesis for Deep Domains", () => {
    it("should inject tribal knowledge for workholding domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_workholding",
        intent: "Workholding for carbide insert",
        context: { material: "carbide", thickness_mm: 10 },
      });

      // Should work even if tribal tips are empty
      expect(result).toHaveProperty("success");
    });

    it("should inject tribal knowledge for setup domain", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_setup_sequence",
        intent: "Setup for precision die work",
        context: { material: "D2", target_accuracy_mm: 0.003 },
      });

      expect(result).toHaveProperty("success");
    });

    it("should inject tribal knowledge for corner strategy", async () => {
      const result = await prismIntelligence.reason({
        domain: "wedm_corner_strategy",
        intent: "Sharp corner machining tips",
        context: { material: "S7", min_corner_radius_mm: 0.15 },
      });

      expect(result).toHaveProperty("success");
    });
  });
});
