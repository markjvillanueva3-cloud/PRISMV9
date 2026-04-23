/**
 * Tests for Fusion360PluginAdapterEngine — Fusion 360 CAM Python Add-in Bridge
 * @milestone CAM-EXHAUST-MS0 U-CAM87
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  Fusion360PluginAdapterEngine,
  FusionProject,
  FusionSetup,
  FusionOperation,
  FusionTool,
  FusionRPCRequest,
} from "../engines/Fusion360PluginAdapterEngine.js";

// ── Test Fixtures ───────────────────────────────────────────────────────────

const createTestTool = (overrides: Partial<FusionTool> = {}): FusionTool => ({
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

const createTestSetup = (overrides: Partial<FusionSetup> = {}): FusionSetup => ({
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

const createTestOperation = (overrides: Partial<FusionOperation> = {}): FusionOperation => ({
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

const createTestProject = (overrides: Partial<FusionProject> = {}): FusionProject => ({
  project_id: "PROJ-F360-001",
  project_name: "Test Part",
  design_name: "test_part_v1",
  machine_id: "HAAS-VF2",
  setups: [createTestSetup()],
  operations: [createTestOperation()],
  ...overrides,
});

// ── Test Suites ─────────────────────────────────────────────────────────────

describe("Fusion360PluginAdapterEngine", () => {
  let projectId: string;

  beforeEach(() => {
    projectId = "F360-TEST-" + Date.now() + Math.random();
  });

  afterEach(() => {
    try {
      Fusion360PluginAdapterEngine.onProjectClosed(projectId);
    } catch {
      // Session may not exist
    }
  });

  describe("Project Lifecycle", () => {
    it("should initialize session when project opens", () => {
      const project = createTestProject({ project_id: projectId });
      const result = Fusion360PluginAdapterEngine.onProjectOpened(project);

      expect(result.prismSessionId).toMatch(/^PRISM-VER-/);
      expect(result.status).toBe("initialized");
    });

    it("should close project and return verdict", () => {
      const project = createTestProject({ project_id: projectId });
      Fusion360PluginAdapterEngine.onProjectOpened(project);

      const result = Fusion360PluginAdapterEngine.onProjectClosed(projectId);
      expect(result).toBeDefined();
      expect(["CERTIFIED", "REVIEW_REQUIRED", "BLOCKED"]).toContain(result?.finalVerdict);
    });

    it("should return null for non-existent project closure", () => {
      const result = Fusion360PluginAdapterEngine.onProjectClosed("NO-SUCH-PROJECT");
      expect(result).toBeNull();
    });
  });

  describe("Operation Analysis", () => {
    beforeEach(() => {
      const project = createTestProject({ project_id: projectId });
      Fusion360PluginAdapterEngine.onProjectOpened(project);
    });

    it("should analyze operation and return physics results", () => {
      const operation = createTestOperation();
      const result = Fusion360PluginAdapterEngine.analyzeOperation(projectId, operation);

      expect(result.operation_id).toBe("OP-001");
      expect(result.prism_session_id).toMatch(/^PRISM-VER-/);
      expect(result.physics.force_n).toBeGreaterThan(0);
      expect(typeof result.physics.chatter_stable).toBe("boolean");
      expect(result.physics.deflection_mm).toBeGreaterThanOrEqual(0);
      expect(result.physics.temperature_c).toBeGreaterThan(0);
      expect(result.physics.tool_life_remaining_pct).toBeGreaterThanOrEqual(0);
      expect(result.physics.tool_life_remaining_pct).toBeLessThanOrEqual(100);
    });

    it("should provide safety assessment", () => {
      const operation = createTestOperation();
      const result = Fusion360PluginAdapterEngine.analyzeOperation(projectId, operation);

      expect(result.safety.score).toBeGreaterThanOrEqual(0);
      expect(result.safety.score).toBeLessThanOrEqual(1);
      expect(["PASS", "WARNING", "FAIL"]).toContain(result.safety.verdict);
      expect(typeof result.safety.hard_stop).toBe("boolean");
    });

    it("should generate NC comments and timeline markers", () => {
      const operation = createTestOperation();
      const result = Fusion360PluginAdapterEngine.analyzeOperation(projectId, operation);

      expect(result.fusion_annotations.nc_comment).toMatch(/^\(PRISM:/);
      expect(result.fusion_annotations.nc_comment).toContain("N");
      expect(result.fusion_annotations.nc_comment).toContain("S(x)=");
      expect(result.fusion_annotations.timeline_markers.length).toBeGreaterThan(0);
    });

    it("should throw for invalid setup reference", () => {
      const operation = createTestOperation({ setup_id: "NONEXISTENT-SETUP" });

      expect(() =>
        Fusion360PluginAdapterEngine.analyzeOperation(projectId, operation)
      ).toThrow(/Setup.*not found/);
    });

    it("should throw for invalid project ID", () => {
      const operation = createTestOperation();

      expect(() =>
        Fusion360PluginAdapterEngine.analyzeOperation("INVALID", operation)
      ).toThrow(/No active PRISM session/);
    });

    it("should generate recommendations for high-force conditions", () => {
      const aggressiveOp = createTestOperation({
        spindle_speed: 4000,
        cutting_feedrate: 3000,
        maximum_roughing_stepdown: 6,
        stepover: 8,
        tool: createTestTool({ diameter: 8, flute_count: 2 }),
      });

      const result = Fusion360PluginAdapterEngine.analyzeOperation(projectId, aggressiveOp);

      // If force > 4000N, should suggest feedrate reduction
      if (result.physics.force_n > 4000) {
        expect(result.recommendations.suggested_feedrate).toBeLessThan(aggressiveOp.cutting_feedrate);
        expect(result.recommendations.rationale.length).toBeGreaterThan(0);
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
          createTestOperation({ operation_id: "OP-003", setup_id: "SETUP-B" }),
        ],
      });

      Fusion360PluginAdapterEngine.onProjectOpened(project);
      const analysis = Fusion360PluginAdapterEngine.analyzeProject(projectId);

      expect(analysis.total_operations).toBe(3);
      expect(analysis.total_setups).toBe(2);
      expect(analysis.results.length).toBe(3);
      expect(analysis.summary.operations_by_setup["SETUP-A"]).toBe(2);
      expect(analysis.summary.operations_by_setup["SETUP-B"]).toBe(1);
      expect(["APPROVED", "REVIEW", "BLOCKED"]).toContain(analysis.summary.overall_verdict);
    });
  });

  describe("NC Header Generation", () => {
    it("should generate PRISM verification header for postprocess", () => {
      const project = createTestProject({ project_id: projectId });
      Fusion360PluginAdapterEngine.onProjectOpened(project);

      const header = Fusion360PluginAdapterEngine.generateNCHeader(projectId);

      expect(header.header).toContain("PRISM Verification Header");
      expect(header.header).toContain(project.design_name);
      expect(header.header).toContain("Safety Score");
      expect(header.header).toContain("Verdict");
      expect(header.verified_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("should return empty header for unknown project", () => {
      const header = Fusion360PluginAdapterEngine.generateNCHeader("UNKNOWN-PROJ");
      expect(header.header).toBe("");
    });
  });

  describe("JSON-RPC Protocol", () => {
    it("should handle project.opened RPC request", () => {
      const project = createTestProject({ project_id: projectId });
      const request: FusionRPCRequest = {
        jsonrpc: "2.0",
        method: "project.opened",
        params: project as unknown as Record<string, unknown>,
        id: 1,
      };

      const response = Fusion360PluginAdapterEngine.handleRPCRequest(request);

      expect(response.jsonrpc).toBe("2.0");
      expect(response.id).toBe(1);
      expect(response.error).toBeUndefined();
      const result = response.result as { prismSessionId: string };
      expect(result.prismSessionId).toMatch(/^PRISM-VER-/);
    });

    it("should handle operation.created RPC request", () => {
      const project = createTestProject({ project_id: projectId });
      Fusion360PluginAdapterEngine.onProjectOpened(project);

      const request: FusionRPCRequest = {
        jsonrpc: "2.0",
        method: "operation.created",
        params: {
          project_id: projectId,
          operation: createTestOperation(),
        },
        id: 2,
      };

      const response = Fusion360PluginAdapterEngine.handleRPCRequest(request);

      expect(response.error).toBeUndefined();
      const result = response.result as { safety: { score: number } };
      expect(result.safety.score).toBeGreaterThanOrEqual(0);
    });

    it("should return error for unknown method", () => {
      const request = {
        jsonrpc: "2.0" as const,
        method: "unknown.method" as unknown as FusionRPCRequest["method"],
        params: {},
        id: 3,
      };

      const response = Fusion360PluginAdapterEngine.handleRPCRequest(request);

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32601);
      expect(response.error?.message).toMatch(/Method not found/);
    });

    it("should return error for invalid params", () => {
      const request: FusionRPCRequest = {
        jsonrpc: "2.0",
        method: "operation.created",
        params: {
          project_id: "DOES-NOT-EXIST",
          operation: createTestOperation(),
        },
        id: 4,
      };

      const response = Fusion360PluginAdapterEngine.handleRPCRequest(request);

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32603);
    });
  });

  describe("Material Scaling", () => {
    it("should produce higher forces for harder materials", () => {
      const aluminum_project = createTestProject({
        project_id: projectId + "-N",
        setups: [createTestSetup({
          stock_material: {
            material_id: "6061-T6",
            material_name: "Aluminum",
            iso_group: "N",
          },
        })],
      });

      const steel_project = createTestProject({
        project_id: projectId + "-P",
        setups: [createTestSetup({
          stock_material: {
            material_id: "4140",
            material_name: "Steel",
            iso_group: "P",
          },
        })],
      });

      Fusion360PluginAdapterEngine.onProjectOpened(aluminum_project);
      Fusion360PluginAdapterEngine.onProjectOpened(steel_project);

      const alResult = Fusion360PluginAdapterEngine.analyzeOperation(
        projectId + "-N",
        createTestOperation()
      );
      const steelResult = Fusion360PluginAdapterEngine.analyzeOperation(
        projectId + "-P",
        createTestOperation()
      );

      expect(steelResult.physics.force_n).toBeGreaterThan(alResult.physics.force_n);

      Fusion360PluginAdapterEngine.onProjectClosed(projectId + "-N");
      Fusion360PluginAdapterEngine.onProjectClosed(projectId + "-P");
    });
  });
});
