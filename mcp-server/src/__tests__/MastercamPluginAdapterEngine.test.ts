/**
 * Tests for MastercamPluginAdapterEngine — Mastercam NET-Hook SDK Bridge
 * @milestone CAM-EXHAUST-MS0 U-CAM89
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  MastercamPluginAdapterEngine,
  MCProject,
  MCMachineGroup,
  MCOperation,
  MCTool,
  MCChain,
  MCEvent,
} from "../engines/MastercamPluginAdapterEngine.js";

// ── Test Fixtures ───────────────────────────────────────────────────────────

const createTestTool = (overrides: Partial<MCTool> = {}): MCTool => ({
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
  library_source: "JMDIE_TOOLS.tooldb",
  ...overrides,
});

const createTestMachineGroup = (overrides: Partial<MCMachineGroup> = {}): MCMachineGroup => ({
  group_id: "GROUP-001",
  group_name: "Mill Group 1",
  machine_type: "mill",
  stock_setup: {
    stock_type: "rectangular",
    dimensions: { x: 100, y: 80, z: 25 },
    material_id: "6061-T6",
    material_name: "Aluminum 6061-T6",
    iso_group: "N",
    hardness_hrc: 20,
  },
  wcs: {
    origin: { x: 0, y: 0, z: 0 },
    x_axis: { x: 1, y: 0, z: 0 },
    y_axis: { x: 0, y: 1, z: 0 },
  },
  post_processor: "Haas_VF2.pst",
  ...overrides,
});

const createTestOperation = (overrides: Partial<MCOperation> = {}): MCOperation => ({
  operation_id: "OP-001",
  operation_number: 1,
  operation_name: "Contour",
  operation_type: "contour",
  tool: createTestTool(),
  spindle_speed: 8000,
  surface_speed: 250,
  cutting_feedrate: 2000,
  plunge_feedrate: 500,
  max_stepdown: 2,
  stepover: 4,
  stock_to_leave_xy: 0.2,
  stock_to_leave_z: 0.1,
  coolant: "flood",
  material_group_id: "MG-ALUM-N",
  ...overrides,
});

const createTestProject = (overrides: Partial<MCProject> = {}): MCProject => ({
  project_id: "PROJ-MC-001",
  mcam_filename: "test_part.mcam",
  mastercam_version: "2025",
  machine_groups: [createTestMachineGroup()],
  operations: [createTestOperation()],
  machine_id: "HAAS-VF2",
  ...overrides,
});

// ── Test Suites ─────────────────────────────────────────────────────────────

describe("MastercamPluginAdapterEngine", () => {
  let projectId: string;

  beforeEach(() => {
    projectId = "MC-TEST-" + Date.now() + Math.random();
  });

  afterEach(() => {
    try {
      MastercamPluginAdapterEngine.onProjectClosed(projectId);
    } catch {
      // Session may not exist
    }
  });

  describe("Project Lifecycle", () => {
    it("should initialize session when project opens", () => {
      const project = createTestProject({ project_id: projectId });
      const result = MastercamPluginAdapterEngine.onProjectOpened(project);

      expect(result.prismSessionId).toMatch(/^PRISM-VER-/);
      expect(result.status).toBe("initialized");
    });

    it("should close project and return verdict", () => {
      const project = createTestProject({ project_id: projectId });
      MastercamPluginAdapterEngine.onProjectOpened(project);

      const result = MastercamPluginAdapterEngine.onProjectClosed(projectId);
      expect(result).toBeDefined();
      expect(["CERTIFIED", "REVIEW_REQUIRED", "BLOCKED"]).toContain(result?.finalVerdict);
    });

    it("should return null for non-existent project closure", () => {
      const result = MastercamPluginAdapterEngine.onProjectClosed("NO-SUCH-PROJECT");
      expect(result).toBeNull();
    });
  });

  describe("Operation Analysis", () => {
    beforeEach(() => {
      const project = createTestProject({ project_id: projectId });
      MastercamPluginAdapterEngine.onProjectOpened(project);
    });

    it("should analyze operation and return physics results", () => {
      const operation = createTestOperation();
      const result = MastercamPluginAdapterEngine.analyzeOperation(projectId, operation);

      expect(result.operation_id).toBe("OP-001");
      expect(result.operation_number).toBe(1);
      expect(result.prism_session_id).toMatch(/^PRISM-VER-/);
      expect(result.physics.force_n).toBeGreaterThan(0);
      expect(typeof result.physics.chatter_stable).toBe("boolean");
      expect(result.physics.deflection_mm).toBeGreaterThanOrEqual(0);
    });

    it("should provide safety assessment with verdict", () => {
      const operation = createTestOperation();
      const result = MastercamPluginAdapterEngine.analyzeOperation(projectId, operation);

      expect(result.safety.score).toBeGreaterThanOrEqual(0);
      expect(result.safety.score).toBeLessThanOrEqual(1);
      expect(["PASS", "WARNING", "FAIL"]).toContain(result.safety.verdict);
    });

    it("should generate NC comments with force and safety", () => {
      const operation = createTestOperation();
      const result = MastercamPluginAdapterEngine.analyzeOperation(projectId, operation);

      expect(result.mastercam_annotations.nc_comment).toMatch(/^\(PRISM:/);
      expect(result.mastercam_annotations.nc_comment).toContain("N");
      expect(result.mastercam_annotations.nc_comment).toContain("S(x)=");
    });

    it("should set Operation Manager tree icon state", () => {
      const operation = createTestOperation();
      const result = MastercamPluginAdapterEngine.analyzeOperation(projectId, operation);

      expect(["green", "yellow", "red"]).toContain(result.mastercam_annotations.tree_icon_state);
    });

    it("should compute operation_suffix for non-PASS verdicts", () => {
      const operation = createTestOperation();
      const result = MastercamPluginAdapterEngine.analyzeOperation(projectId, operation);

      if (result.safety.verdict === "PASS") {
        expect(result.mastercam_annotations.operation_suffix).toBe("");
      } else if (result.safety.verdict === "WARNING") {
        expect(result.mastercam_annotations.operation_suffix).toContain("PRISM-REVIEW");
      } else {
        expect(result.mastercam_annotations.operation_suffix).toContain("PRISM-BLOCKED");
      }
    });

    it("should throw for invalid project ID", () => {
      const operation = createTestOperation();

      expect(() =>
        MastercamPluginAdapterEngine.analyzeOperation("INVALID", operation)
      ).toThrow(/No active PRISM session/);
    });

    it("should suggest Dynamic Motion engagement reduction on instability", () => {
      const dynamicOp = createTestOperation({
        operation_type: "2d_dynamic_mill",
        dynamic_motion: {
          stepover_amount: 2,
          back_feedrate_factor: 0.8,
          trochoidal_engagement: 0.7,
        },
        spindle_speed: 3000,
        cutting_feedrate: 4000,
        max_stepdown: 8,
      });

      const result = MastercamPluginAdapterEngine.analyzeOperation(projectId, dynamicOp);

      // If aggressive, should suggest engagement reduction
      if (!result.physics.chatter_stable || result.physics.force_n > 4000) {
        expect(result.recommendations.suggested_dynamic_engagement).toBeLessThan(0.7);
        expect(result.recommendations.suggested_dynamic_engagement).toBeGreaterThanOrEqual(0.1);
      }
    });
  });

  describe("Project Analysis", () => {
    it("should analyze multi-operation project with Dynamic Motion tracking", () => {
      const project = createTestProject({
        project_id: projectId,
        operations: [
          createTestOperation({ operation_id: "OP-001", operation_number: 1 }),
          createTestOperation({
            operation_id: "OP-002",
            operation_number: 2,
            operation_type: "2d_dynamic_mill",
            dynamic_motion: {
              stepover_amount: 2,
              back_feedrate_factor: 0.8,
              trochoidal_engagement: 0.5,
            },
          }),
          createTestOperation({
            operation_id: "OP-003",
            operation_number: 3,
            operation_type: "3d_dynamic_opti_rough",
          }),
        ],
      });

      MastercamPluginAdapterEngine.onProjectOpened(project);
      const analysis = MastercamPluginAdapterEngine.analyzeProject(projectId);

      expect(analysis.total_operations).toBe(3);
      expect(analysis.dynamic_motion_operations).toBe(2);
      expect(analysis.mastercam_version).toBe("2025");
      expect(["APPROVED", "REVIEW", "BLOCKED"]).toContain(analysis.summary.overall_verdict);
    });

    it("should track Mastercam version in analysis", () => {
      const project = createTestProject({
        project_id: projectId,
        mastercam_version: "X8",
      });

      MastercamPluginAdapterEngine.onProjectOpened(project);
      const analysis = MastercamPluginAdapterEngine.analyzeProject(projectId);

      expect(analysis.mastercam_version).toBe("X8");
    });
  });

  describe("Chain Validation", () => {
    beforeEach(() => {
      const project = createTestProject({ project_id: projectId });
      MastercamPluginAdapterEngine.onProjectOpened(project);
    });

    it("should validate healthy chain", () => {
      const chain: MCChain = {
        chain_id: 1,
        chain_type: "closed",
        entity_count: 8,
        length_mm: 200,
        area_mm2: 2500,
      };

      const result = MastercamPluginAdapterEngine.validateChain(projectId, chain);

      expect(result.valid).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it("should flag empty chain", () => {
      const chain: MCChain = {
        chain_id: 2,
        chain_type: "open",
        entity_count: 0,
      };

      const result = MastercamPluginAdapterEngine.validateChain(projectId, chain);

      expect(result.valid).toBe(false);
      expect(result.issues[0]).toContain("no entities");
    });

    it("should flag degenerate geometry (low compactness)", () => {
      // Very thin elongated shape — high perimeter, tiny area
      const chain: MCChain = {
        chain_id: 3,
        chain_type: "closed",
        entity_count: 4,
        length_mm: 1000,
        area_mm2: 100,
      };

      const result = MastercamPluginAdapterEngine.validateChain(projectId, chain);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes("compactness"))).toBe(true);
    });

    it("should return invalid for unknown project", () => {
      const chain: MCChain = {
        chain_id: 1,
        chain_type: "closed",
        entity_count: 4,
      };

      const result = MastercamPluginAdapterEngine.validateChain("UNKNOWN", chain);

      expect(result.valid).toBe(false);
      expect(result.issues[0]).toContain("No active PRISM session");
    });
  });

  describe("NC Header Generation", () => {
    it("should generate PRISM verification header for postprocess", () => {
      const project = createTestProject({ project_id: projectId });
      MastercamPluginAdapterEngine.onProjectOpened(project);

      const header = MastercamPluginAdapterEngine.generateNCHeader(projectId);

      expect(header.header).toContain("PRISM Verification Header");
      expect(header.header).toContain(project.mcam_filename);
      expect(header.header).toContain("Mastercam: 2025");
      expect(header.header).toContain("Safety Score");
      expect(header.header).toContain("Verdict");
    });

    it("should include Dynamic Motion count when present", () => {
      const project = createTestProject({
        project_id: projectId,
        operations: [
          createTestOperation({
            operation_type: "2d_dynamic_mill",
            dynamic_motion: {
              stepover_amount: 2,
              back_feedrate_factor: 0.8,
              trochoidal_engagement: 0.5,
            },
          }),
        ],
      });
      MastercamPluginAdapterEngine.onProjectOpened(project);

      const header = MastercamPluginAdapterEngine.generateNCHeader(projectId);

      expect(header.header).toContain("Dynamic Motion Ops: 1");
    });

    it("should return empty header for unknown project", () => {
      const header = MastercamPluginAdapterEngine.generateNCHeader("UNKNOWN-PROJ");
      expect(header.header).toBe("");
    });
  });

  describe("NET-Hook Event Protocol", () => {
    it("should handle nethook.load handshake", () => {
      const event: MCEvent = {
        event_type: "nethook.load",
        payload: {},
        event_id: 0,
      };

      const response = MastercamPluginAdapterEngine.handleEvent(event);

      expect(response.success).toBe(true);
      expect((response.result as { loaded: boolean }).loaded).toBe(true);
    });

    it("should handle project.opened event", () => {
      const project = createTestProject({ project_id: projectId });
      const event: MCEvent = {
        event_type: "project.opened",
        payload: project as unknown as Record<string, unknown>,
        event_id: 1,
      };

      const response = MastercamPluginAdapterEngine.handleEvent(event);

      expect(response.success).toBe(true);
      expect(response.event_id).toBe(1);
      expect(response.result).toBeDefined();
    });

    it("should handle operation.regenerating event", () => {
      const project = createTestProject({ project_id: projectId });
      MastercamPluginAdapterEngine.onProjectOpened(project);

      const event: MCEvent = {
        event_type: "operation.regenerating",
        payload: {
          project_id: projectId,
          operation: createTestOperation(),
        },
        event_id: 10,
      };

      const response = MastercamPluginAdapterEngine.handleEvent(event);

      expect(response.success).toBe(true);
      expect(response.event_id).toBe(10);
    });

    it("should handle chain.selected event", () => {
      const project = createTestProject({ project_id: projectId });
      MastercamPluginAdapterEngine.onProjectOpened(project);

      const event: MCEvent = {
        event_type: "chain.selected",
        payload: {
          project_id: projectId,
          chain: {
            chain_id: 1,
            chain_type: "closed",
            entity_count: 4,
            length_mm: 100,
            area_mm2: 625,
          },
        },
        event_id: 20,
      };

      const response = MastercamPluginAdapterEngine.handleEvent(event);

      expect(response.success).toBe(true);
      expect(response.result).toBeDefined();
    });

    it("should return error for unknown event type", () => {
      const event = {
        event_type: "unknown.event" as MCEvent["event_type"],
        payload: {},
        event_id: 99,
      };

      const response = MastercamPluginAdapterEngine.handleEvent(event);

      expect(response.success).toBe(false);
      expect(response.error).toContain("Unknown event type");
    });

    it("should propagate analysis errors via response", () => {
      const event: MCEvent = {
        event_type: "operation.modified",
        payload: {
          project_id: "NONEXISTENT",
          operation: createTestOperation(),
        },
        event_id: 42,
      };

      const response = MastercamPluginAdapterEngine.handleEvent(event);

      expect(response.success).toBe(false);
      expect(response.error).toContain("No active PRISM session");
    });
  });

  describe("Material Sensitivity", () => {
    it("should produce higher forces for harder materials", () => {
      const alProject = createTestProject({
        project_id: projectId + "-AL",
        machine_groups: [createTestMachineGroup({
          group_id: "GROUP-AL",
          stock_setup: {
            stock_type: "rectangular",
            dimensions: { x: 100, y: 80, z: 25 },
            material_id: "6061-T6",
            material_name: "Aluminum 6061-T6",
            iso_group: "N",
          },
        })],
      });

      const steelProject = createTestProject({
        project_id: projectId + "-STEEL",
        machine_groups: [createTestMachineGroup({
          group_id: "GROUP-STEEL",
          stock_setup: {
            stock_type: "rectangular",
            dimensions: { x: 100, y: 80, z: 25 },
            material_id: "4140",
            material_name: "Steel 4140",
            iso_group: "P",
            hardness_hrc: 32,
          },
        })],
      });

      MastercamPluginAdapterEngine.onProjectOpened(alProject);
      const alResult = MastercamPluginAdapterEngine.analyzeOperation(
        alProject.project_id,
        alProject.operations[0]
      );

      MastercamPluginAdapterEngine.onProjectOpened(steelProject);
      const steelResult = MastercamPluginAdapterEngine.analyzeOperation(
        steelProject.project_id,
        steelProject.operations[0]
      );

      // Steel Kienzle coefficient is ~2.5x aluminum
      expect(steelResult.physics.force_n).toBeGreaterThan(alResult.physics.force_n);

      // Cleanup
      MastercamPluginAdapterEngine.onProjectClosed(alProject.project_id);
      MastercamPluginAdapterEngine.onProjectClosed(steelProject.project_id);
    });
  });
});
