/**
 * Tests for MillingEndToEndOrchestrationEngine
 * Validates complete workflow automation from print to verified G-code.
 */
import { describe, it, expect } from "vitest";
import {
  MillingEndToEndOrchestrationEngine,
  millingEndToEndOrchestrationEngine,
  type WorkflowRequest,
} from "../engines/MillingEndToEndOrchestrationEngine.js";

describe("MillingEndToEndOrchestrationEngine", () => {
  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe("initialization", () => {
    it("exports singleton instance", () => {
      expect(millingEndToEndOrchestrationEngine).toBeDefined();
      expect(millingEndToEndOrchestrationEngine).toBeInstanceOf(MillingEndToEndOrchestrationEngine);
    });

    it("can instantiate new engine instances", () => {
      const engine = new MillingEndToEndOrchestrationEngine();
      expect(engine).toBeInstanceOf(MillingEndToEndOrchestrationEngine);
    });
  });

  // ============================================================================
  // EXECUTE WORKFLOW
  // ============================================================================

  describe("executeWorkflow()", () => {
    it("executes complete workflow", async () => {
      const request: WorkflowRequest = {
        part_number: "TEST-001",
        revision: "A",
        part_name: "Test Bracket",
        material: "4140 Steel",
        material_iso: "P",
        geometry_source: "print",
        features: [
          { id: "F1", type: "pocket", dimensions: { width: 30, length: 20 }, depth_mm: 10, position: { x: 25, y: 20, z: 0 } },
        ],
        dimensions: { length_mm: 100, width_mm: 80, height_mm: 25, stock_length_mm: 105, stock_width_mm: 85, stock_height_mm: 28 },
        tolerances: [
          { feature_id: "F1", dimension: "width", nominal: 30, upper: 0.05, lower: -0.05 },
        ],
        surface_requirements: [
          { surface_id: "F1_bottom", ra_um: 3.2 },
        ],
        machine: "Haas VF-2",
        controller: "Haas NGC",
        workholding: "6-inch vise",
        available_tools: [
          { tool_number: 1, type: "Face Mill", diameter_mm: 50, length_mm: 40, flutes: 5, coating: "TiAlN", holder: "BT40", condition: "new" },
          { tool_number: 2, type: "Flat Endmill", diameter_mm: 12, length_mm: 75, flutes: 4, coating: "AlTiN", holder: "ER32", condition: "new" },
        ],
        customer: "FONTANA",
        quantity: 50,
        priority: "standard",
        delivery_date: "2026-05-01",
        inspection_level: "standard",
        certifications_required: [],
        documentation_level: "standard",
      };

      const result = await millingEndToEndOrchestrationEngine.executeWorkflow(request);

      expect(result.workflow_id).toMatch(/^E2E-/);
      expect(result.status).toBe("completed");
      expect(result.stages.length).toBe(6);
      expect(result.current_stage).toBe("complete");
    });

    it("completes all 6 stages", async () => {
      const request: WorkflowRequest = {
        part_number: "STAGE-TEST",
        revision: "A",
        part_name: "Stage Test Part",
        material: "6061-T6",
        material_iso: "N",
        geometry_source: "cad",
        features: [
          { id: "P1", type: "pocket", dimensions: { width: 40, length: 30 }, depth_mm: 15, position: { x: 30, y: 25, z: 0 } },
        ],
        dimensions: { length_mm: 80, width_mm: 60, height_mm: 20, stock_length_mm: 85, stock_width_mm: 65, stock_height_mm: 22 },
        tolerances: [],
        surface_requirements: [],
        machine: "Hurco VM10i",
        controller: "WinMax",
        workholding: "4-inch vise",
        available_tools: [],
        customer: "TEST",
        quantity: 10,
        priority: "standard",
        delivery_date: "2026-06-01",
        inspection_level: "standard",
        certifications_required: [],
        documentation_level: "minimal",
      };

      const result = await millingEndToEndOrchestrationEngine.executeWorkflow(request);

      const stageNames = result.stages.map(s => s.stage);
      expect(stageNames).toContain("intake");
      expect(stageNames).toContain("intelligence");
      expect(stageNames).toContain("planning");
      expect(stageNames).toContain("optimization");
      expect(stageNames).toContain("code_generation");
      expect(stageNames).toContain("verification");
    });

    it("generates process plan", async () => {
      const request: WorkflowRequest = {
        part_number: "PLAN-001",
        revision: "A",
        part_name: "Plan Test",
        material: "D2 Tool Steel",
        material_iso: "H",
        hardness_hrc: 58,
        geometry_source: "print",
        features: [
          { id: "C1", type: "contour", dimensions: { length: 80 }, position: { x: 0, y: 0, z: 0 } },
          { id: "B1", type: "bore", dimensions: { diameter: 20 }, depth_mm: 25, position: { x: 40, y: 30, z: 0 } },
        ],
        dimensions: { length_mm: 100, width_mm: 80, height_mm: 30, stock_length_mm: 105, stock_width_mm: 85, stock_height_mm: 32 },
        tolerances: [],
        surface_requirements: [],
        machine: "Okuma Genos M560",
        controller: "OSP-P300",
        workholding: "Fixture plate",
        available_tools: [],
        customer: "ITW",
        quantity: 5,
        priority: "rush",
        delivery_date: "2026-04-20",
        inspection_level: "critical",
        certifications_required: ["ISO 9001"],
        documentation_level: "full",
      };

      const result = await millingEndToEndOrchestrationEngine.executeWorkflow(request);

      expect(result.process_plan).toBeDefined();
      expect(result.process_plan!.operations.length).toBeGreaterThan(0);
      expect(result.process_plan!.tool_list.length).toBeGreaterThan(0);
    });

    it("generates G-code", async () => {
      const request: WorkflowRequest = {
        part_number: "GCODE-001",
        revision: "B",
        part_name: "Gcode Test",
        material: "Aluminum 7075",
        material_iso: "N",
        geometry_source: "both",
        features: [
          { id: "S1", type: "slot", dimensions: { width: 10, length: 60 }, depth_mm: 8, position: { x: 20, y: 30, z: 0 } },
        ],
        dimensions: { length_mm: 100, width_mm: 60, height_mm: 15, stock_length_mm: 102, stock_width_mm: 62, stock_height_mm: 17 },
        tolerances: [],
        surface_requirements: [],
        machine: "Haas VF-4",
        controller: "Haas NGC",
        workholding: "Soft jaws",
        available_tools: [],
        customer: "ALCOA",
        quantity: 100,
        priority: "standard",
        delivery_date: "2026-07-01",
        inspection_level: "standard",
        certifications_required: [],
        documentation_level: "standard",
      };

      const result = await millingEndToEndOrchestrationEngine.executeWorkflow(request);

      expect(result.gcode).toBeDefined();
      expect(result.gcode!.program_number).toMatch(/^O\d{4}$/);
      expect(result.gcode!.header.length).toBeGreaterThan(0);
      expect(result.gcode!.body.length).toBeGreaterThan(0);
      expect(result.gcode!.footer.length).toBeGreaterThan(0);
      expect(result.gcode!.total_lines).toBeGreaterThan(10);
    });

    it("generates quality package", async () => {
      const request: WorkflowRequest = {
        part_number: "QUAL-001",
        revision: "A",
        part_name: "Quality Test",
        material: "316 Stainless",
        material_iso: "M",
        geometry_source: "print",
        features: [
          { id: "H1", type: "bore", dimensions: { diameter: 25 }, depth_mm: 20, position: { x: 30, y: 30, z: 0 }, surface_finish_ra: 1.6 },
        ],
        dimensions: { length_mm: 60, width_mm: 60, height_mm: 25, stock_length_mm: 62, stock_width_mm: 62, stock_height_mm: 27 },
        tolerances: [
          { feature_id: "H1", dimension: "diameter", nominal: 25, upper: 0.01, lower: -0.01 },
        ],
        surface_requirements: [
          { surface_id: "H1_id", ra_um: 1.6 },
        ],
        machine: "Roku-Roku",
        controller: "Fanuc",
        workholding: "Vise",
        available_tools: [],
        customer: "FASTRON",
        quantity: 25,
        priority: "critical",
        delivery_date: "2026-04-25",
        inspection_level: "aerospace",
        certifications_required: ["AS9100", "NADCAP"],
        documentation_level: "full",
      };

      const result = await millingEndToEndOrchestrationEngine.executeWorkflow(request);

      expect(result.quality_package).toBeDefined();
      expect(result.quality_package!.inspection_plan.length).toBeGreaterThan(0);
      expect(result.quality_package!.spc_requirements.length).toBeGreaterThan(0);
      expect(result.quality_package!.certification_requirements).toContain("AS9100");
    });

    it("generates documentation package", async () => {
      const request: WorkflowRequest = {
        part_number: "DOC-001",
        revision: "C",
        part_name: "Documentation Test",
        material: "4340 Steel",
        material_iso: "P",
        geometry_source: "print",
        features: [],
        dimensions: { length_mm: 50, width_mm: 50, height_mm: 20, stock_length_mm: 52, stock_width_mm: 52, stock_height_mm: 22 },
        tolerances: [],
        surface_requirements: [],
        machine: "Haas VF-2",
        controller: "Haas NGC",
        workholding: "Vise",
        available_tools: [],
        customer: "TEST",
        quantity: 1,
        priority: "standard",
        delivery_date: "2026-05-15",
        inspection_level: "aerospace",
        certifications_required: [],
        documentation_level: "full",
      };

      const result = await millingEndToEndOrchestrationEngine.executeWorkflow(request);

      expect(result.documentation).toBeDefined();
      expect(result.documentation!.process_sheet).toBe(true);
      expect(result.documentation!.first_article).toBe(true); // aerospace level
    });

    it("tracks metrics", async () => {
      const request: WorkflowRequest = {
        part_number: "METRICS-001",
        revision: "A",
        part_name: "Metrics Test",
        material: "Cast Iron",
        material_iso: "K",
        geometry_source: "cad",
        features: [
          { id: "F1", type: "face", dimensions: { length: 80, width: 60 }, position: { x: 0, y: 0, z: 0 } },
        ],
        dimensions: { length_mm: 80, width_mm: 60, height_mm: 30, stock_length_mm: 82, stock_width_mm: 62, stock_height_mm: 32 },
        tolerances: [],
        surface_requirements: [],
        machine: "Haas VF-3",
        controller: "Haas NGC",
        workholding: "Fixture",
        available_tools: [],
        customer: "TEST",
        quantity: 20,
        priority: "standard",
        delivery_date: "2026-06-15",
        inspection_level: "standard",
        certifications_required: [],
        documentation_level: "standard",
      };

      const result = await millingEndToEndOrchestrationEngine.executeWorkflow(request);

      expect(result.total_cycle_time_min).toBeGreaterThan(0);
      expect(result.total_tools).toBeGreaterThan(0);
      expect(result.estimated_cost).toBeGreaterThan(0);
      expect(result.confidence_score).toBeGreaterThan(0);
      expect(result.confidence_score).toBeLessThanOrEqual(1);
      expect(result.total_processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("lists engines consulted", async () => {
      const request: WorkflowRequest = {
        part_number: "ENG-001",
        revision: "A",
        part_name: "Engine Test",
        material: "Inconel 718",
        material_iso: "S",
        geometry_source: "print",
        features: [],
        dimensions: { length_mm: 50, width_mm: 50, height_mm: 20, stock_length_mm: 52, stock_width_mm: 52, stock_height_mm: 22 },
        tolerances: [],
        surface_requirements: [],
        machine: "Okuma MB-46VAE",
        controller: "OSP-P300",
        workholding: "Vise",
        available_tools: [],
        customer: "TEST",
        quantity: 3,
        priority: "rush",
        delivery_date: "2026-04-22",
        inspection_level: "critical",
        certifications_required: [],
        documentation_level: "standard",
      };

      const result = await millingEndToEndOrchestrationEngine.executeWorkflow(request);

      expect(result.engines_consulted.length).toBeGreaterThan(5);
      expect(result.engines_consulted).toContain("MillingAGIMasterEngine");
      expect(result.engines_consulted).toContain("MillingDeepKnowledgeSynthesisEngine");
    });

    it("lists formulas applied", async () => {
      const request: WorkflowRequest = {
        part_number: "FORM-001",
        revision: "A",
        part_name: "Formula Test",
        material: "A2 Tool Steel",
        material_iso: "H",
        geometry_source: "print",
        features: [
          { id: "P1", type: "pocket", dimensions: { width: 25, length: 20 }, depth_mm: 12, position: { x: 20, y: 20, z: 0 } },
        ],
        dimensions: { length_mm: 60, width_mm: 50, height_mm: 20, stock_length_mm: 62, stock_width_mm: 52, stock_height_mm: 22 },
        tolerances: [],
        surface_requirements: [],
        machine: "Haas VF-2",
        controller: "Haas NGC",
        workholding: "Vise",
        available_tools: [],
        customer: "TEST",
        quantity: 10,
        priority: "standard",
        delivery_date: "2026-05-20",
        inspection_level: "standard",
        certifications_required: [],
        documentation_level: "standard",
      };

      const result = await millingEndToEndOrchestrationEngine.executeWorkflow(request);

      expect(result.formulas_applied.length).toBeGreaterThan(0);
      expect(result.formulas_applied.some(f => f.includes("Kienzle"))).toBe(true);
      expect(result.formulas_applied.some(f => f.includes("Taylor"))).toBe(true);
    });

    it("collects tribal knowledge used", async () => {
      const request: WorkflowRequest = {
        part_number: "TRIBAL-001",
        revision: "A",
        part_name: "Tribal Test",
        material: "Ti-6Al-4V",
        material_iso: "S",
        geometry_source: "print",
        features: [
          { id: "C1", type: "contour", dimensions: { length: 60 }, position: { x: 0, y: 0, z: 0 } },
        ],
        dimensions: { length_mm: 70, width_mm: 50, height_mm: 15, stock_length_mm: 72, stock_width_mm: 52, stock_height_mm: 17 },
        tolerances: [],
        surface_requirements: [],
        machine: "Okuma MB-56V",
        controller: "OSP-P300",
        workholding: "Soft jaws",
        available_tools: [],
        customer: "TEST",
        quantity: 5,
        priority: "critical",
        delivery_date: "2026-04-28",
        inspection_level: "aerospace",
        certifications_required: [],
        documentation_level: "full",
      };

      const result = await millingEndToEndOrchestrationEngine.executeWorkflow(request);

      expect(result.tribal_knowledge_used.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // VALIDATE REQUEST
  // ============================================================================

  describe("validateRequest()", () => {
    it("validates complete request", () => {
      const request: WorkflowRequest = {
        part_number: "VAL-001",
        revision: "A",
        part_name: "Valid Part",
        material: "4140 Steel",
        material_iso: "P",
        geometry_source: "print",
        features: [{ id: "F1", type: "pocket", dimensions: {}, position: { x: 0, y: 0, z: 0 } }],
        dimensions: { length_mm: 100, width_mm: 80, height_mm: 30, stock_length_mm: 102, stock_width_mm: 82, stock_height_mm: 32 },
        tolerances: [],
        surface_requirements: [],
        machine: "Haas VF-2",
        controller: "Haas NGC",
        workholding: "Vise",
        available_tools: [],
        customer: "TEST",
        quantity: 10,
        priority: "standard",
        delivery_date: "2026-05-01",
        inspection_level: "standard",
        certifications_required: [],
        documentation_level: "standard",
      };

      const result = millingEndToEndOrchestrationEngine.validateRequest(request);

      expect(result.valid).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it("detects missing part number", () => {
      const request = {
        part_number: "",
        revision: "A",
        part_name: "Test",
        material: "Steel",
        material_iso: "P",
        geometry_source: "print",
        features: [],
        dimensions: { length_mm: 100, width_mm: 80, height_mm: 30, stock_length_mm: 102, stock_width_mm: 82, stock_height_mm: 32 },
        tolerances: [],
        surface_requirements: [],
        machine: "Haas",
        controller: "NGC",
        workholding: "Vise",
        available_tools: [],
        customer: "TEST",
        quantity: 1,
        priority: "standard",
        delivery_date: "2026-05-01",
        inspection_level: "standard",
        certifications_required: [],
        documentation_level: "standard",
      } as WorkflowRequest;

      const result = millingEndToEndOrchestrationEngine.validateRequest(request);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes("Part number"))).toBe(true);
    });

    it("detects invalid material ISO class", () => {
      const request = {
        part_number: "TEST-001",
        revision: "A",
        part_name: "Test",
        material: "Unknown",
        material_iso: "X",
        geometry_source: "print",
        features: [],
        dimensions: { length_mm: 100, width_mm: 80, height_mm: 30, stock_length_mm: 102, stock_width_mm: 82, stock_height_mm: 32 },
        tolerances: [],
        surface_requirements: [],
        machine: "Haas",
        controller: "NGC",
        workholding: "Vise",
        available_tools: [],
        customer: "TEST",
        quantity: 1,
        priority: "standard",
        delivery_date: "2026-05-01",
        inspection_level: "standard",
        certifications_required: [],
        documentation_level: "standard",
      } as WorkflowRequest;

      const result = millingEndToEndOrchestrationEngine.validateRequest(request);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes("Invalid material ISO"))).toBe(true);
    });

    it("warns about empty features", () => {
      const request = {
        part_number: "TEST-001",
        revision: "A",
        part_name: "Test",
        material: "Steel",
        material_iso: "P",
        geometry_source: "print",
        features: [],
        dimensions: { length_mm: 100, width_mm: 80, height_mm: 30, stock_length_mm: 102, stock_width_mm: 82, stock_height_mm: 32 },
        tolerances: [],
        surface_requirements: [],
        machine: "Haas",
        controller: "NGC",
        workholding: "Vise",
        available_tools: [],
        customer: "TEST",
        quantity: 1,
        priority: "standard",
        delivery_date: "2026-05-01",
        inspection_level: "standard",
        certifications_required: [],
        documentation_level: "standard",
      } as WorkflowRequest;

      const result = millingEndToEndOrchestrationEngine.validateRequest(request);

      expect(result.warnings.some(w => w.includes("No features"))).toBe(true);
    });

    it("detects invalid tolerances", () => {
      const request = {
        part_number: "TEST-001",
        revision: "A",
        part_name: "Test",
        material: "Steel",
        material_iso: "P",
        geometry_source: "print",
        features: [],
        dimensions: { length_mm: 100, width_mm: 80, height_mm: 30, stock_length_mm: 102, stock_width_mm: 82, stock_height_mm: 32 },
        tolerances: [
          { feature_id: "F1", dimension: "width", nominal: 50, upper: -0.05, lower: 0.05 }, // Invalid: upper < lower
        ],
        surface_requirements: [],
        machine: "Haas",
        controller: "NGC",
        workholding: "Vise",
        available_tools: [],
        customer: "TEST",
        quantity: 1,
        priority: "standard",
        delivery_date: "2026-05-01",
        inspection_level: "standard",
        certifications_required: [],
        documentation_level: "standard",
      } as WorkflowRequest;

      const result = millingEndToEndOrchestrationEngine.validateRequest(request);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes("Invalid tolerance"))).toBe(true);
    });
  });

  // ============================================================================
  // GET WORKFLOW TEMPLATE
  // ============================================================================

  describe("getWorkflowTemplate()", () => {
    it("returns workflow template", () => {
      const template = millingEndToEndOrchestrationEngine.getWorkflowTemplate();

      expect(template.stages.length).toBe(6);
      expect(template.stages).toContain("intake");
      expect(template.stages).toContain("verification");
      expect(template.engines_available.length).toBeGreaterThan(10);
      expect(template.formulas_available.length).toBeGreaterThan(5);
    });
  });

  // ============================================================================
  // GET STATS
  // ============================================================================

  describe("getStats()", () => {
    it("returns comprehensive statistics", () => {
      const stats = millingEndToEndOrchestrationEngine.getStats();

      expect(stats.engines_integrated).toBeGreaterThan(10);
      expect(stats.formulas_available).toBeGreaterThan(5);
      expect(stats.workflow_stages).toBe(6);
      expect(stats.capabilities.length).toBeGreaterThan(3);
      expect(stats.capabilities).toContain("Print-to-program");
      expect(stats.capabilities).toContain("Physics validation");
    });
  });

  // ============================================================================
  // MATERIAL-SPECIFIC WORKFLOWS
  // ============================================================================

  describe("material-specific workflows", () => {
    it("handles aluminum (N) with HSM strategy", async () => {
      const request: WorkflowRequest = {
        part_number: "ALU-001",
        revision: "A",
        part_name: "Aluminum Part",
        material: "6061-T6",
        material_iso: "N",
        geometry_source: "cad",
        features: [
          { id: "P1", type: "pocket", dimensions: { width: 40, length: 30 }, depth_mm: 15, position: { x: 30, y: 25, z: 0 } },
        ],
        dimensions: { length_mm: 100, width_mm: 80, height_mm: 25, stock_length_mm: 102, stock_width_mm: 82, stock_height_mm: 27 },
        tolerances: [],
        surface_requirements: [],
        machine: "Haas VF-4",
        controller: "Haas NGC",
        workholding: "Vise",
        available_tools: [],
        customer: "ALCOA",
        quantity: 200,
        priority: "standard",
        delivery_date: "2026-07-01",
        inspection_level: "standard",
        certifications_required: [],
        documentation_level: "standard",
      };

      const result = await millingEndToEndOrchestrationEngine.executeWorkflow(request);

      expect(result.status).toBe("completed");
      // Aluminum should complete successfully with appropriate strategy
      const planStage = result.stages.find(s => s.stage === "planning");
      expect(planStage?.outputs.process_plan.operations.length).toBeGreaterThan(0);
    });

    it("handles superalloy (S) with reduced parameters", async () => {
      const request: WorkflowRequest = {
        part_number: "SUPER-001",
        revision: "A",
        part_name: "Inconel Part",
        material: "Inconel 718",
        material_iso: "S",
        geometry_source: "print",
        features: [
          { id: "C1", type: "contour", dimensions: { length: 60 }, position: { x: 0, y: 0, z: 0 } },
        ],
        dimensions: { length_mm: 80, width_mm: 60, height_mm: 20, stock_length_mm: 82, stock_width_mm: 62, stock_height_mm: 22 },
        tolerances: [],
        surface_requirements: [],
        machine: "Okuma MB-56V",
        controller: "OSP-P300",
        workholding: "Fixture",
        available_tools: [],
        customer: "TEST",
        quantity: 3,
        priority: "critical",
        delivery_date: "2026-04-30",
        inspection_level: "aerospace",
        certifications_required: ["AS9100"],
        documentation_level: "full",
      };

      const result = await millingEndToEndOrchestrationEngine.executeWorkflow(request);

      expect(result.status).toBe("completed");
      // Superalloy tribal tips should mention coolant
      expect(result.tribal_knowledge_used.some(t =>
        t.toLowerCase().includes("coolant") || t.toLowerCase().includes("speed")
      )).toBe(true);
    });
  });
});
