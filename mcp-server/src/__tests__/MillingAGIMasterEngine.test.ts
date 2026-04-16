/**
 * Tests for MillingAGIMasterEngine
 * Validates PhD-level master machinist intelligence.
 */
import { describe, it, expect } from "vitest";
import {
  MillingAGIMasterEngine,
  millingAGIMasterEngine,
  type PrintToProgramRequest,
} from "../engines/MillingAGIMasterEngine.js";

describe("MillingAGIMasterEngine", () => {
  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe("initialization", () => {
    it("exports singleton instance", () => {
      expect(millingAGIMasterEngine).toBeDefined();
      expect(millingAGIMasterEngine).toBeInstanceOf(MillingAGIMasterEngine);
    });

    it("can instantiate new engine instances", () => {
      const engine = new MillingAGIMasterEngine();
      expect(engine).toBeInstanceOf(MillingAGIMasterEngine);
    });
  });

  // ============================================================================
  // GENERATE FROM PRINT
  // ============================================================================

  describe("generateFromPrint()", () => {
    it("generates complete program from print specification", async () => {
      const request: PrintToProgramRequest = {
        part_name: "Test Bracket",
        material: "4140 Steel",
        material_iso: "P",
        features: [
          { type: "pocket", dimensions: { width: 50, length: 30 }, depth_mm: 10 },
          { type: "bore", dimensions: { diameter: 12 } },
        ],
        dimensions: { length_mm: 100, width_mm: 80, height_mm: 25 },
        tolerances: [
          { feature: "pocket", dimension: "width", nominal_mm: 50, upper_tol_mm: 0.05, lower_tol_mm: -0.05 },
        ],
        surface_finish_requirements: [
          { surface: "pocket_bottom", ra_um: 3.2 },
        ],
      };

      const result = await millingAGIMasterEngine.generateFromPrint(request);

      expect(result.request_id).toMatch(/^AGI-P2P-/);
      expect(result.timestamp).toBeDefined();
      expect(result.process_plan).toBeDefined();
      expect(result.process_plan.operations.length).toBeGreaterThan(0);
      expect(result.expertise_level).toBe("phd_master");
    });

    it("includes operation sequence", async () => {
      const request: PrintToProgramRequest = {
        part_name: "Multi-Feature Part",
        material: "D2 Tool Steel",
        material_iso: "H",
        hardness_hrc: 60,
        features: [
          { type: "face", dimensions: { length: 100, width: 80 } },
          { type: "pocket", dimensions: { width: 40, length: 30 }, depth_mm: 15 },
          { type: "contour", dimensions: { length: 100 } },
          { type: "bore", dimensions: { diameter: 10 }, depth_mm: 20 },
        ],
        dimensions: { length_mm: 100, width_mm: 80, height_mm: 30 },
        tolerances: [],
        surface_finish_requirements: [],
      };

      const result = await millingAGIMasterEngine.generateFromPrint(request);

      // Should have proper sequencing
      expect(result.process_plan.operations[0].operation_name).toContain("Face");
      expect(result.process_plan.operations.some(op => op.operation_type === "roughing")).toBe(true);
    });

    it("includes G-code structure", async () => {
      const request: PrintToProgramRequest = {
        part_name: "Simple Pocket",
        material: "6061-T6 Aluminum",
        material_iso: "N",
        features: [
          { type: "pocket", dimensions: { width: 30, length: 20 }, depth_mm: 8 },
        ],
        dimensions: { length_mm: 60, width_mm: 40, height_mm: 15 },
        tolerances: [],
        surface_finish_requirements: [],
      };

      const result = await millingAGIMasterEngine.generateFromPrint(request);

      expect(result.gcode_structure.program_number).toMatch(/^O\d{4}$/);
      expect(result.gcode_structure.header.length).toBeGreaterThan(0);
      expect(result.gcode_structure.tool_list.length).toBeGreaterThan(0);
      expect(result.gcode_structure.operations.length).toBeGreaterThan(0);
      expect(result.gcode_structure.footer.length).toBeGreaterThan(0);
    });

    it("includes risk assessment", async () => {
      const request: PrintToProgramRequest = {
        part_name: "Risky Part",
        material: "Inconel 718",
        material_iso: "S",
        features: [
          { type: "pocket", dimensions: { width: 20, length: 15 }, depth_mm: 40 },
        ],
        dimensions: { length_mm: 80, width_mm: 60, height_mm: 50 },
        tolerances: [
          { feature: "pocket", dimension: "width", nominal_mm: 20, upper_tol_mm: 0.01, lower_tol_mm: -0.01 },
        ],
        surface_finish_requirements: [],
      };

      const result = await millingAGIMasterEngine.generateFromPrint(request);

      expect(result.risk_assessment.identified_risks.length).toBeGreaterThan(0);
      expect(result.risk_assessment.mitigations.length).toBeGreaterThan(0);
      expect(result.risk_assessment.confidence_score).toBeGreaterThan(0);
      expect(result.risk_assessment.confidence_score).toBeLessThanOrEqual(1);
    });

    it("includes quality plan", async () => {
      const request: PrintToProgramRequest = {
        part_name: "Quality Part",
        material: "4340 Steel",
        material_iso: "P",
        features: [
          { type: "bore", dimensions: { diameter: 25 }, surface_finish_ra: 1.6 },
        ],
        dimensions: { length_mm: 50, width_mm: 50, height_mm: 30 },
        tolerances: [
          { feature: "bore", dimension: "diameter", nominal_mm: 25, upper_tol_mm: 0.02, lower_tol_mm: -0.02 },
        ],
        surface_finish_requirements: [
          { surface: "bore_id", ra_um: 1.6 },
        ],
        inspection_level: "aerospace",
      };

      const result = await millingAGIMasterEngine.generateFromPrint(request);

      expect(result.quality_plan.in_process_checks.length).toBeGreaterThan(0);
      expect(result.quality_plan.final_inspection.length).toBeGreaterThan(0);
      expect(result.quality_plan.documentation.some(d => d.includes("FAI"))).toBe(true);
    });

    it("includes expert insights", async () => {
      const request: PrintToProgramRequest = {
        part_name: "Expert Test",
        material: "316 Stainless",
        material_iso: "M",
        features: [
          { type: "pocket", dimensions: { width: 25, length: 20 }, depth_mm: 25 },
        ],
        dimensions: { length_mm: 60, width_mm: 50, height_mm: 35 },
        tolerances: [],
        surface_finish_requirements: [],
      };

      const result = await millingAGIMasterEngine.generateFromPrint(request);

      expect(result.expert_insights.experience_based_tips.length).toBeGreaterThan(0);
      expect(result.expert_insights.common_pitfalls.length).toBeGreaterThan(0);
      // Should have stainless-specific tips
      expect(result.expert_insights.experience_based_tips.some(t =>
        t.toLowerCase().includes("work harden") || t.toLowerCase().includes("chip load")
      )).toBe(true);
    });

    it("includes reasoning trace", async () => {
      const request: PrintToProgramRequest = {
        part_name: "Reasoning Test",
        material: "A2 Tool Steel",
        material_iso: "H",
        features: [
          { type: "contour", dimensions: { length: 80 } },
        ],
        dimensions: { length_mm: 100, width_mm: 50, height_mm: 20 },
        tolerances: [],
        surface_finish_requirements: [],
      };

      const result = await millingAGIMasterEngine.generateFromPrint(request);

      expect(result.reasoning_trace.mode).toBeDefined();
      expect(result.reasoning_trace.steps.length).toBeGreaterThan(0);
      expect(result.reasoning_trace.knowledge_sources_used.length).toBeGreaterThan(0);
      expect(result.reasoning_trace.engines_consulted.length).toBeGreaterThan(0);
      expect(result.reasoning_trace.formulas_applied.length).toBeGreaterThan(0);
    });

    it("calculates physics correctly", async () => {
      const request: PrintToProgramRequest = {
        part_name: "Physics Test",
        material: "4140 Steel",
        material_iso: "P",
        features: [
          { type: "pocket", dimensions: { width: 30, length: 20 }, depth_mm: 10 },
        ],
        dimensions: { length_mm: 60, width_mm: 40, height_mm: 20 },
        tolerances: [],
        surface_finish_requirements: [],
      };

      const result = await millingAGIMasterEngine.generateFromPrint(request);

      const roughingOp = result.process_plan.operations.find(op => op.operation_type === "roughing");
      expect(roughingOp).toBeDefined();
      expect(roughingOp!.parameters.cutting_force_N).toBeGreaterThan(0);
      expect(roughingOp!.parameters.power_kW).toBeGreaterThan(0);
      expect(roughingOp!.parameters.mrr_cm3_min).toBeGreaterThan(0);
      expect(roughingOp!.parameters.expected_tool_life_min).toBeGreaterThan(0);
    });

    it("tracks computation time", async () => {
      const request: PrintToProgramRequest = {
        part_name: "Time Test",
        material: "Aluminum",
        material_iso: "N",
        features: [
          { type: "face", dimensions: { length: 50, width: 40 } },
        ],
        dimensions: { length_mm: 50, width_mm: 40, height_mm: 10 },
        tolerances: [],
        surface_finish_requirements: [],
      };

      const result = await millingAGIMasterEngine.generateFromPrint(request);

      expect(result.computation_time_ms).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // QUICK RECOMMEND
  // ============================================================================

  describe("quickRecommend()", () => {
    it("returns quick recommendation", () => {
      const result = millingAGIMasterEngine.quickRecommend({
        operation: "roughing",
        material_iso: "P",
        feature_type: "pocket",
        tool_diameter_mm: 12,
      });

      expect(result.rpm).toBeGreaterThan(0);
      expect(result.feed_mm_min).toBeGreaterThan(0);
      expect(result.doc_mm).toBeGreaterThan(0);
      expect(result.woc_mm).toBeGreaterThan(0);
      expect(result.strategy).toBeDefined();
      expect(result.tips.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("adjusts for aluminum", () => {
      const steelResult = millingAGIMasterEngine.quickRecommend({
        operation: "roughing",
        material_iso: "P",
        feature_type: "pocket",
        tool_diameter_mm: 12,
      });

      const aluResult = millingAGIMasterEngine.quickRecommend({
        operation: "roughing",
        material_iso: "N",
        feature_type: "pocket",
        tool_diameter_mm: 12,
      });

      expect(aluResult.rpm).toBeGreaterThan(steelResult.rpm);
      expect(aluResult.feed_mm_min).toBeGreaterThan(steelResult.feed_mm_min);
    });

    it("adjusts for hard materials", () => {
      const steelResult = millingAGIMasterEngine.quickRecommend({
        operation: "roughing",
        material_iso: "P",
        feature_type: "pocket",
        tool_diameter_mm: 12,
      });

      const hardResult = millingAGIMasterEngine.quickRecommend({
        operation: "roughing",
        material_iso: "H",
        feature_type: "pocket",
        tool_diameter_mm: 12,
      });

      expect(hardResult.rpm).toBeLessThan(steelResult.rpm);
      expect(hardResult.doc_mm).toBeLessThan(steelResult.doc_mm);
    });

    it("selects appropriate strategy", () => {
      const slotResult = millingAGIMasterEngine.quickRecommend({
        operation: "roughing",
        material_iso: "S",
        feature_type: "slot",
        tool_diameter_mm: 10,
      });

      expect(slotResult.strategy).toBe("trochoidal");
    });

    it("is very fast", () => {
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        millingAGIMasterEngine.quickRecommend({
          operation: "roughing",
          material_iso: "P",
          feature_type: "pocket",
          tool_diameter_mm: 12,
        });
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });
  });

  // ============================================================================
  // GET MASTER WISDOM
  // ============================================================================

  describe("getMasterWisdom()", () => {
    it("returns general wisdom", () => {
      const wisdom = millingAGIMasterEngine.getMasterWisdom("general");

      expect(wisdom.length).toBeGreaterThan(5);
      expect(wisdom.some(w => w.toLowerCase().includes("face"))).toBe(true);
    });

    it("returns thin wall wisdom", () => {
      const wisdom = millingAGIMasterEngine.getMasterWisdom("thin_walls");

      expect(wisdom.length).toBeGreaterThan(3);
      expect(wisdom.some(w => w.toLowerCase().includes("climb"))).toBe(true);
    });

    it("returns deep pocket wisdom", () => {
      const wisdom = millingAGIMasterEngine.getMasterWisdom("deep_pockets");

      expect(wisdom.length).toBeGreaterThan(3);
      expect(wisdom.some(w => w.toLowerCase().includes("trochoidal") || w.toLowerCase().includes("helical"))).toBe(true);
    });

    it("returns hard material wisdom", () => {
      const wisdom = millingAGIMasterEngine.getMasterWisdom("hard_materials");

      expect(wisdom.length).toBeGreaterThan(3);
      expect(wisdom.some(w => w.toLowerCase().includes("cbn") || w.toLowerCase().includes("ceramic"))).toBe(true);
    });

    it("returns aluminum wisdom", () => {
      const wisdom = millingAGIMasterEngine.getMasterWisdom("aluminum");

      expect(wisdom.length).toBeGreaterThan(3);
      expect(wisdom.some(w => w.toLowerCase().includes("high speed") || w.toLowerCase().includes("rpm"))).toBe(true);
    });

    it("returns general for unknown category", () => {
      const wisdom = millingAGIMasterEngine.getMasterWisdom("unknown_category");

      expect(wisdom.length).toBeGreaterThan(0);
      expect(wisdom).toEqual(millingAGIMasterEngine.getMasterWisdom("general"));
    });
  });

  // ============================================================================
  // GET WISDOM CATEGORIES
  // ============================================================================

  describe("getWisdomCategories()", () => {
    it("returns all categories", () => {
      const categories = millingAGIMasterEngine.getWisdomCategories();

      expect(categories.length).toBeGreaterThan(5);
      expect(categories).toContain("general");
      expect(categories).toContain("thin_walls");
      expect(categories).toContain("deep_pockets");
      expect(categories).toContain("hard_materials");
      expect(categories).toContain("aluminum");
      expect(categories).toContain("finishing");
    });
  });

  // ============================================================================
  // VALIDATE APPROACH
  // ============================================================================

  describe("validateApproach()", () => {
    it("validates safe approach", () => {
      // Feed = fz × flutes × rpm = 0.15 × 4 × 3000 = 1800 mm/min for proper chip load
      const result = millingAGIMasterEngine.validateApproach({
        material_iso: "P",
        operation: "roughing",
        rpm: 3000,
        feed: 1800,
        doc: 4,
        tool_diameter: 12,
      });

      expect(result.valid).toBe(true);
      expect(result.issues.length).toBe(0);
      expect(result.physics_check.safe).toBe(true);
    });

    it("detects excessive speed", () => {
      const result = millingAGIMasterEngine.validateApproach({
        material_iso: "P",
        operation: "roughing",
        rpm: 20000,
        feed: 500,
        doc: 4,
        tool_diameter: 12,
      });

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.toLowerCase().includes("speed"))).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("detects excessive chip load", () => {
      const result = millingAGIMasterEngine.validateApproach({
        material_iso: "P",
        operation: "roughing",
        rpm: 2000,
        feed: 2000, // Very high feed
        doc: 4,
        tool_diameter: 12,
      });

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.toLowerCase().includes("chip load"))).toBe(true);
    });

    it("detects too light chip load", () => {
      const result = millingAGIMasterEngine.validateApproach({
        material_iso: "M", // Stainless - work hardening risk
        operation: "roughing",
        rpm: 3000,
        feed: 50, // Very low feed
        doc: 4,
        tool_diameter: 12,
      });

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.toLowerCase().includes("rubbing") || i.toLowerCase().includes("too light"))).toBe(true);
    });

    it("calculates physics correctly", () => {
      const result = millingAGIMasterEngine.validateApproach({
        material_iso: "P",
        operation: "roughing",
        rpm: 3000,
        feed: 600,
        doc: 4,
        tool_diameter: 12,
      });

      expect(result.physics_check.cutting_force_N).toBeGreaterThan(0);
      expect(result.physics_check.power_kW).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // GET STATS
  // ============================================================================

  describe("getStats()", () => {
    it("returns comprehensive statistics", () => {
      const stats = millingAGIMasterEngine.getStats();

      expect(stats.physics_formulas).toBeGreaterThan(0);
      expect(stats.tribal_tips).toBeGreaterThan(20);
      expect(stats.playbook_rules).toBeGreaterThan(5);
      expect(stats.material_classes).toBe(6);
      expect(stats.wisdom_categories).toBeGreaterThan(5);
      expect(stats.strategies).toBeGreaterThan(10);
    });
  });

  // ============================================================================
  // MATERIAL-SPECIFIC BEHAVIOR
  // ============================================================================

  describe("material-specific behavior", () => {
    it("uses correct physics for stainless (M)", async () => {
      const request: PrintToProgramRequest = {
        part_name: "Stainless Part",
        material: "316 Stainless",
        material_iso: "M",
        features: [
          { type: "pocket", dimensions: { width: 30, length: 20 }, depth_mm: 10 },
        ],
        dimensions: { length_mm: 60, width_mm: 40, height_mm: 20 },
        tolerances: [],
        surface_finish_requirements: [],
      };

      const result = await millingAGIMasterEngine.generateFromPrint(request);

      // Stainless should have trochoidal strategy for pocket
      const roughOp = result.process_plan.operations.find(op => op.operation_type === "roughing");
      expect(roughOp?.strategy.name).toContain("Trochoidal");
    });

    it("uses correct physics for superalloy (S)", async () => {
      const request: PrintToProgramRequest = {
        part_name: "Inconel Part",
        material: "Inconel 718",
        material_iso: "S",
        features: [
          { type: "contour", dimensions: { length: 50 } },
        ],
        dimensions: { length_mm: 60, width_mm: 40, height_mm: 15 },
        tolerances: [],
        surface_finish_requirements: [],
      };

      const result = await millingAGIMasterEngine.generateFromPrint(request);

      // Should identify tool breakage risk
      expect(result.risk_assessment.identified_risks.some(r =>
        r.category === "tool_breakage"
      )).toBe(true);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles minimal feature list", async () => {
      const request: PrintToProgramRequest = {
        part_name: "Simple Part",
        material: "Aluminum",
        material_iso: "N",
        features: [],
        dimensions: { length_mm: 50, width_mm: 40, height_mm: 10 },
        tolerances: [],
        surface_finish_requirements: [],
      };

      const result = await millingAGIMasterEngine.generateFromPrint(request);

      // Should still have facing operation at minimum
      expect(result.process_plan.operations.length).toBeGreaterThan(0);
    });

    it("handles tight tolerances", async () => {
      const request: PrintToProgramRequest = {
        part_name: "Precision Part",
        material: "4140 Steel",
        material_iso: "P",
        features: [
          { type: "bore", dimensions: { diameter: 25 } },
        ],
        dimensions: { length_mm: 50, width_mm: 50, height_mm: 30 },
        tolerances: [
          { feature: "bore", dimension: "diameter", nominal_mm: 25, upper_tol_mm: 0.005, lower_tol_mm: -0.005 },
        ],
        surface_finish_requirements: [],
      };

      const result = await millingAGIMasterEngine.generateFromPrint(request);

      // Should identify tolerance risk
      expect(result.risk_assessment.identified_risks.some(r =>
        r.category === "tolerance"
      )).toBe(true);

      // Should have SPC in quality plan
      expect(result.quality_plan.spc_requirements.length).toBeGreaterThan(0);
    });

    it("handles customer context", async () => {
      const request: PrintToProgramRequest = {
        part_name: "Customer Part",
        material: "4140 Steel",
        material_iso: "P",
        features: [
          { type: "pocket", dimensions: { width: 30, length: 20 }, depth_mm: 10 },
        ],
        dimensions: { length_mm: 60, width_mm: 40, height_mm: 20 },
        tolerances: [],
        surface_finish_requirements: [],
        customer: "FONTANA",
        quantity: 100,
      };

      const result = await millingAGIMasterEngine.generateFromPrint(request);

      // Should have alternative approaches for production quantity
      expect(result.expert_insights.alternative_approaches.length).toBeGreaterThan(0);
    });
  });
});
