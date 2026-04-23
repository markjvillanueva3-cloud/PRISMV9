/**
 * Tests for InventorHSMPluginAdapterEngine — Autodesk Inventor HSM COM Add-in Bridge
 * @milestone CAM-EXHAUST-MS0 U-CAM88
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  InventorHSMPluginAdapterEngine,
  HSMProject,
  HSMSetup,
  HSMOperation,
  HSMTool,
  HSMCOMRequest,
} from "../engines/InventorHSMPluginAdapterEngine.js";

// ── Test Fixtures ───────────────────────────────────────────────────────────

const createTestTool = (overrides: Partial<HSMTool> = {}): HSMTool => ({
  tool_id: "T01",
  tool_number: 1,
  tool_type: "flat end mill",
  diameter: 10,
  flute_count: 4,
  flute_length: 30,
  overall_length: 75,
  shaft_diameter: 10,
  corner_radius: 0,
  helix_angle: 30,
  material: "carbide",
  coating: "AlTiN",
  ...overrides,
});

const createTestSetup = (overrides: Partial<HSMSetup> = {}): HSMSetup => ({
  setup_id: "SETUP-001",
  setup_name: "Setup 1",
  setup_type: "milling",
  stock_mode: "fixed size box",
  stock_material: {
    material_id: "6061-T6",
    material_name: "Aluminum 6061-T6",
    iso_group: "N",
    hardness_hrc: 20,
  },
  stock_dimensions: { x: 100, y: 80, z: 25 },
  wcs: {
    origin: { x: 0, y: 0, z: 0 },
    x_axis: { x: 1, y: 0, z: 0 },
    y_axis: { x: 0, y: 1, z: 0 },
  },
  ...overrides,
});

const createTestOperation = (overrides: Partial<HSMOperation> = {}): HSMOperation => ({
  operation_id: "OP-001",
  operation_name: "Adaptive Roughing",
  strategy: "adaptive2d",
  tool: createTestTool(),
  spindle_speed: 8000,
  surface_speed: 250,
  cutting_feedrate: 2000,
  plunge_feedrate: 500,
  ramp_feedrate: 1000,
  maximum_roughing_stepdown: 2,
  stepover: 4,
  optimal_load: 0.4,
  maximum_chip_load: 0.1,
  stock_to_leave: 0.2,
  coolant: "flood",
  setup_id: "SETUP-001",
  ...overrides,
});

const createTestProject = (overrides: Partial<HSMProject> = {}): HSMProject => ({
  project_id: "PROJ-HSM-001",
  project_name: "Test Part",
  ipart_filename: "test_part.ipt",
  is_ipart_family: false,
  machine_id: "HAAS-VF2",
  setups: [createTestSetup()],
  operations: [createTestOperation()],
  ...overrides,
});

// ── Test Suites ─────────────────────────────────────────────────────────────

describe("InventorHSMPluginAdapterEngine", () => {
  let projectId: string;

  beforeEach(() => {
    projectId = "HSM-TEST-" + Date.now() + Math.random();
  });

  afterEach(() => {
    try {
      InventorHSMPluginAdapterEngine.onProjectClosed(projectId);
    } catch {
      // Session may not exist
    }
  });

  describe("Project Lifecycle", () => {
    it("should initialize session when project opens", () => {
      const project = createTestProject({ project_id: projectId });
      const result = InventorHSMPluginAdapterEngine.onProjectOpened(project);

      expect(result.prismSessionId).toMatch(/^PRISM-VER-/);
      expect(result.status).toBe("initialized");
    });

    it("should close project and return final verdict", () => {
      const project = createTestProject({ project_id: projectId });
      InventorHSMPluginAdapterEngine.onProjectOpened(project);

      const result = InventorHSMPluginAdapterEngine.onProjectClosed(projectId);
      expect(result).toBeDefined();
      expect(["CERTIFIED", "REVIEW_REQUIRED", "BLOCKED"]).toContain(result?.finalVerdict);
    });

    it("should return null for non-existent project closure", () => {
      const result = InventorHSMPluginAdapterEngine.onProjectClosed("NO-SUCH-PROJECT");
      expect(result).toBeNull();
    });
  });

  describe("Operation Analysis", () => {
    beforeEach(() => {
      const project = createTestProject({ project_id: projectId });
      InventorHSMPluginAdapterEngine.onProjectOpened(project);
    });

    it("should analyze operation and return physics results", () => {
      const operation = createTestOperation();
      const result = InventorHSMPluginAdapterEngine.analyzeOperation(projectId, operation);

      expect(result.operation_id).toBe("OP-001");
      expect(result.prism_session_id).toMatch(/^PRISM-VER-/);
      expect(result.physics.force_n).toBeGreaterThan(0);
      expect(typeof result.physics.chatter_stable).toBe("boolean");
      expect(result.physics.deflection_mm).toBeGreaterThanOrEqual(0);
      expect(result.physics.temperature_c).toBeGreaterThan(0);
      expect(result.physics.tool_life_remaining_pct).toBeGreaterThanOrEqual(0);
      expect(result.physics.tool_life_remaining_pct).toBeLessThanOrEqual(100);
    });

    it("should provide safety assessment with verdict", () => {
      const operation = createTestOperation();
      const result = InventorHSMPluginAdapterEngine.analyzeOperation(projectId, operation);

      expect(result.safety.score).toBeGreaterThanOrEqual(0);
      expect(result.safety.score).toBeLessThanOrEqual(1);
      expect(["PASS", "WARNING", "FAIL"]).toContain(result.safety.verdict);
      expect(typeof result.safety.hard_stop).toBe("boolean");
    });

    it("should generate NC comments with force and safety", () => {
      const operation = createTestOperation();
      const result = InventorHSMPluginAdapterEngine.analyzeOperation(projectId, operation);

      expect(result.ilogic_annotations.nc_comment).toMatch(/^\(PRISM:/);
      expect(result.ilogic_annotations.nc_comment).toContain("N");
      expect(result.ilogic_annotations.nc_comment).toContain("S(x)=");
    });

    it("should generate iLogic verification rule body", () => {
      const operation = createTestOperation();
      const result = InventorHSMPluginAdapterEngine.analyzeOperation(projectId, operation);

      expect(result.ilogic_annotations.verification_rule).toContain("Sub Main()");
      expect(result.ilogic_annotations.verification_rule).toContain("End Sub");
      expect(result.ilogic_annotations.verification_rule).toContain(operation.operation_id);
    });

    it("should throw for invalid setup reference", () => {
      const operation = createTestOperation({ setup_id: "NONEXISTENT-SETUP" });

      expect(() =>
        InventorHSMPluginAdapterEngine.analyzeOperation(projectId, operation)
      ).toThrow(/Setup.*not found/);
    });

    it("should throw for invalid project ID", () => {
      const operation = createTestOperation();

      expect(() =>
        InventorHSMPluginAdapterEngine.analyzeOperation("INVALID", operation)
      ).toThrow(/No active PRISM session/);
    });

    it("should downgrade iMachining level on unstable conditions", () => {
      const iMachiningOp = createTestOperation({
        strategy: "imachining_2d",
        imachining: {
          machining_level: 7,
          wall_quality: "rough",
        },
        spindle_speed: 3000,
        cutting_feedrate: 4000,
        maximum_roughing_stepdown: 8,
      });

      const result = InventorHSMPluginAdapterEngine.analyzeOperation(projectId, iMachiningOp);

      // If aggressive, should suggest level downgrade
      if (!result.physics.chatter_stable || result.physics.force_n > 4000) {
        expect(result.recommendations.suggested_imachining_level).toBeLessThan(7);
        expect(result.recommendations.suggested_imachining_level).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe("Project Analysis", () => {
    it("should analyze multi-setup, multi-operation project", () => {
      const project = createTestProject({
        project_id: projectId,
        setups: [
          createTestSetup({ setup_id: "SETUP-A", setup_name: "Op 10" }),
          createTestSetup({ setup_id: "SETUP-B", setup_name: "Op 20" }),
        ],
        operations: [
          createTestOperation({ operation_id: "OP-001", setup_id: "SETUP-A" }),
          createTestOperation({ operation_id: "OP-002", setup_id: "SETUP-A" }),
          createTestOperation({
            operation_id: "OP-003",
            setup_id: "SETUP-B",
            strategy: "imachining_3d",
            imachining: { machining_level: 5, wall_quality: "finish" },
          }),
        ],
      });

      InventorHSMPluginAdapterEngine.onProjectOpened(project);
      const analysis = InventorHSMPluginAdapterEngine.analyzeProject(projectId);

      expect(analysis.total_operations).toBe(3);
      expect(analysis.total_setups).toBe(2);
      expect(analysis.imachining_operations).toBe(1);
      expect(analysis.results.length).toBe(3);
      expect(analysis.summary.operations_by_setup["SETUP-A"]).toBe(2);
      expect(analysis.summary.operations_by_setup["SETUP-B"]).toBe(1);
      expect(["APPROVED", "REVIEW", "BLOCKED"]).toContain(analysis.summary.overall_verdict);
    });

    it("should track iPart family metadata in analysis", () => {
      const project = createTestProject({
        project_id: projectId,
        is_ipart_family: true,
        active_ipart_member: "Small-Variant",
      });

      InventorHSMPluginAdapterEngine.onProjectOpened(project);
      const analysis = InventorHSMPluginAdapterEngine.analyzeProject(projectId);

      expect(analysis.is_ipart_family).toBe(true);
      expect(analysis.active_ipart_member).toBe("Small-Variant");
    });
  });

  describe("NC Header Generation", () => {
    it("should generate PRISM verification header for postprocess", () => {
      const project = createTestProject({ project_id: projectId });
      InventorHSMPluginAdapterEngine.onProjectOpened(project);

      const header = InventorHSMPluginAdapterEngine.generateNCHeader(projectId);

      expect(header.header).toContain("PRISM Verification Header");
      expect(header.header).toContain(project.ipart_filename);
      expect(header.header).toContain("Safety Score");
      expect(header.header).toContain("Verdict");
      expect(header.verified_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("should include iPart member in header when iPart family", () => {
      const project = createTestProject({
        project_id: projectId,
        is_ipart_family: true,
        active_ipart_member: "Large-Variant",
      });
      InventorHSMPluginAdapterEngine.onProjectOpened(project);

      const header = InventorHSMPluginAdapterEngine.generateNCHeader(projectId);

      expect(header.header).toContain("iPart Member: Large-Variant");
    });

    it("should include iMachining count when present", () => {
      const project = createTestProject({
        project_id: projectId,
        operations: [
          createTestOperation({
            operation_id: "IM-01",
            strategy: "imachining_2d",
            imachining: { machining_level: 5 },
          }),
        ],
      });
      InventorHSMPluginAdapterEngine.onProjectOpened(project);

      const header = InventorHSMPluginAdapterEngine.generateNCHeader(projectId);

      expect(header.header).toContain("iMachining Ops: 1");
    });

    it("should return empty header for unknown project", () => {
      const header = InventorHSMPluginAdapterEngine.generateNCHeader("UNKNOWN-PROJ");
      expect(header.header).toBe("");
    });
  });

  describe("COM Message Protocol", () => {
    it("should handle project.opened COM request", () => {
      const project = createTestProject({ project_id: projectId });
      const request: HSMCOMRequest = {
        method: "project.opened",
        params: project as unknown as Record<string, unknown>,
        sequence_id: 1,
      };

      const response = InventorHSMPluginAdapterEngine.handleCOMRequest(request);

      expect(response.success).toBe(true);
      expect(response.sequence_id).toBe(1);
      expect(response.result).toBeDefined();
    });

    it("should handle addin.activate handshake", () => {
      const request: HSMCOMRequest = {
        method: "addin.activate",
        params: {},
        sequence_id: 0,
      };

      const response = InventorHSMPluginAdapterEngine.handleCOMRequest(request);

      expect(response.success).toBe(true);
      expect((response.result as { activated: boolean }).activated).toBe(true);
    });

    it("should return error for unknown method", () => {
      const request = {
        method: "unknown.method" as HSMCOMRequest["method"],
        params: {},
        sequence_id: 42,
      };

      const response = InventorHSMPluginAdapterEngine.handleCOMRequest(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain("Method not found");
      expect(response.sequence_id).toBe(42);
    });

    it("should propagate analysis errors via COM response", () => {
      const request: HSMCOMRequest = {
        method: "operation.modified",
        params: {
          project_id: "NONEXISTENT",
          operation: createTestOperation(),
        },
        sequence_id: 99,
      };

      const response = InventorHSMPluginAdapterEngine.handleCOMRequest(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain("No active PRISM session");
    });
  });

  describe("iLogic Integration", () => {
    beforeEach(() => {
      const project = createTestProject({ project_id: projectId });
      InventorHSMPluginAdapterEngine.onProjectOpened(project);
    });

    it("should evaluate iLogic rule and return parameter updates", () => {
      const result = InventorHSMPluginAdapterEngine.triggerILogicRule(
        projectId,
        "VerifyCuttingParameters",
        { base_rpm: 8000, base_feed: 2000 }
      );

      expect(result.rule_name).toBe("VerifyCuttingParameters");
      expect(typeof result.passed).toBe("boolean");
      expect(["INFO", "WARNING", "ERROR"]).toContain(result.severity);
      expect(result.parameter_updates.base_rpm).toBe(8000);
    });

    it("should handle iPart member change with re-verification", () => {
      const result = InventorHSMPluginAdapterEngine.onIPartMemberChanged(
        projectId,
        "Variant-B",
        { stock_width: 120 }
      );

      expect(result.re_verified).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.analysis?.active_ipart_member).toBe("Variant-B");
    });

    it("should handle iLogic rule for unknown project", () => {
      const result = InventorHSMPluginAdapterEngine.triggerILogicRule(
        "UNKNOWN",
        "SomeRule",
        {}
      );

      expect(result.passed).toBe(false);
      expect(result.severity).toBe("ERROR");
    });

    it("should return negative result on iPart change for unknown project", () => {
      const result = InventorHSMPluginAdapterEngine.onIPartMemberChanged(
        "UNKNOWN",
        "SomeMember",
        {}
      );

      expect(result.re_verified).toBe(false);
      expect(result.analysis).toBeNull();
    });
  });

  describe("Material Sensitivity", () => {
    it("should produce higher forces for harder materials (ISO-P steel)", () => {
      const alProject = createTestProject({
        project_id: projectId + "-AL",
        setups: [createTestSetup({
          setup_id: "SETUP-AL",
          stock_material: {
            material_id: "6061-T6",
            material_name: "Aluminum 6061-T6",
            iso_group: "N",
          },
        })],
        operations: [createTestOperation({ setup_id: "SETUP-AL" })],
      });

      const steelProject = createTestProject({
        project_id: projectId + "-STEEL",
        setups: [createTestSetup({
          setup_id: "SETUP-STEEL",
          stock_material: {
            material_id: "4140",
            material_name: "Steel 4140",
            iso_group: "P",
            hardness_hrc: 32,
          },
        })],
        operations: [createTestOperation({ setup_id: "SETUP-STEEL" })],
      });

      InventorHSMPluginAdapterEngine.onProjectOpened(alProject);
      const alResult = InventorHSMPluginAdapterEngine.analyzeOperation(
        alProject.project_id,
        alProject.operations[0]
      );

      InventorHSMPluginAdapterEngine.onProjectOpened(steelProject);
      const steelResult = InventorHSMPluginAdapterEngine.analyzeOperation(
        steelProject.project_id,
        steelProject.operations[0]
      );

      // Steel Kienzle coefficient is ~2.5x aluminum
      expect(steelResult.physics.force_n).toBeGreaterThan(alResult.physics.force_n);

      // Cleanup
      InventorHSMPluginAdapterEngine.onProjectClosed(alProject.project_id);
      InventorHSMPluginAdapterEngine.onProjectClosed(steelProject.project_id);
    });
  });
});
