/**
 * Tests for HyperMillPluginAdapterEngine — hyperMILL COM/.NET Plugin Bridge
 * @milestone CAM-EXHAUST-MS0 U-CAM86
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  HyperMillPluginAdapterEngine,
  HMProject,
  HMJobList,
  HMOperation,
  HMTool,
  HMStock,
  HMPluginMessage,
} from "../engines/HyperMillPluginAdapterEngine.js";

// ── Test Fixtures ───────────────────────────────────────────────────────────

const createTestTool = (overrides: Partial<HMTool> = {}): HMTool => ({
  tool_id: "T01",
  tool_number: 1,
  tool_type: "endmill",
  diameter_mm: 12,
  flutes: 4,
  flute_length_mm: 50,
  overall_length_mm: 100,
  shank_diameter_mm: 12,
  corner_radius_mm: 0,
  helix_angle_deg: 30,
  material: "carbide",
  coating: "TiAlN",
  ...overrides,
});

const createTestStock = (overrides: Partial<HMStock> = {}): HMStock => ({
  material_id: "4140",
  material_name: "AISI 4140 Steel",
  iso_group: "P",
  hardness_hrc: 28,
  tensile_strength_mpa: 950,
  ...overrides,
});

const createTestOperation = (overrides: Partial<HMOperation> = {}): HMOperation => ({
  operation_id: "OP-001",
  operation_name: "Roughing Pass 1",
  operation_type: "roughing",
  spindle_rpm: 5000,
  feed_rate_mmpm: 1500,
  depth_of_cut_mm: 2,
  width_of_cut_mm: 8,
  stepover_mm: 6,
  stepdown_mm: 2,
  tool: createTestTool(),
  stock: createTestStock(),
  coolant: "flood",
  ...overrides,
});

const createTestJobList = (operations?: HMOperation[]): HMJobList => ({
  joblist_id: "JL-001",
  joblist_name: "Main Machining",
  machine_id: "OKUMA-MB56V",
  machine_name: "Okuma MB-56V VMC",
  operations: operations ?? [createTestOperation()],
  total_machining_time_s: 3600,
});

const createTestProject = (joblists?: HMJobList[]): HMProject => ({
  project_id: "PROJ-001",
  project_name: "JM Die Test Part",
  part_number: "JM-DIE-4140-001",
  revision: "A",
  joblists: joblists ?? [createTestJobList()],
  created_at: "2026-04-19T00:00:00Z",
  modified_at: "2026-04-19T05:00:00Z",
});

// ── Test Suites ─────────────────────────────────────────────────────────────

describe("HyperMillPluginAdapterEngine", () => {
  let testProjectId: string;

  beforeEach(() => {
    testProjectId = "TEST-" + Date.now();
  });

  afterEach(() => {
    // Clean up any active sessions
    try {
      HyperMillPluginAdapterEngine.onProjectClosed(testProjectId);
    } catch {
      // Session may not exist, ignore
    }
  });

  describe("Project Lifecycle", () => {
    it("should initialize session when project opens", () => {
      const project = createTestProject();
      project.project_id = testProjectId;

      const result = HyperMillPluginAdapterEngine.onProjectOpened(project);

      expect(result.prismSessionId).toMatch(/^PRISM-VER-/);
      expect(result.status).toBe("initialized");
    });

    it("should close session and return verdict when project closes", () => {
      const project = createTestProject();
      project.project_id = testProjectId;

      HyperMillPluginAdapterEngine.onProjectOpened(project);
      const result = HyperMillPluginAdapterEngine.onProjectClosed(testProjectId);

      expect(result).toBeDefined();
      expect(result?.finalVerdict).toBeDefined();
      expect(["CERTIFIED", "REVIEW_REQUIRED", "BLOCKED"]).toContain(result?.finalVerdict);
    });

    it("should return null when closing non-existent project", () => {
      const result = HyperMillPluginAdapterEngine.onProjectClosed("NON-EXISTENT");
      expect(result).toBeNull();
    });
  });

  describe("Operation Analysis", () => {
    beforeEach(() => {
      const project = createTestProject();
      project.project_id = testProjectId;
      HyperMillPluginAdapterEngine.onProjectOpened(project);
    });

    it("should analyze single operation", () => {
      const operation = createTestOperation();
      const result = HyperMillPluginAdapterEngine.analyzeOperationPreCalc(
        testProjectId,
        operation
      );

      expect(result.operation_id).toBe("OP-001");
      expect(result.prism_session_id).toMatch(/^PRISM-VER-/);
      expect(result.analysis_time_ms).toBeGreaterThanOrEqual(0);

      // Force analysis
      expect(result.force.peak_n).toBeGreaterThan(0);
      expect(result.force.confidence).toBeGreaterThan(0);

      // Chatter analysis
      expect(typeof result.chatter.stable).toBe("boolean");
      expect(result.chatter.margin_pct).toBeDefined();

      // Deflection analysis
      expect(result.deflection.tool_mm).toBeGreaterThanOrEqual(0);
      expect(result.deflection.total_mm).toBeGreaterThanOrEqual(result.deflection.tool_mm);

      // Thermal analysis
      expect(result.thermal.peak_temp_c).toBeGreaterThan(0);
      expect(["none", "low", "medium", "high"]).toContain(result.thermal.damage_risk);

      // Tool life
      expect(result.tool_life.remaining_pct).toBeGreaterThanOrEqual(0);
      expect(result.tool_life.remaining_pct).toBeLessThanOrEqual(100);

      // Safety score
      expect(result.safety_score.value).toBeGreaterThanOrEqual(0);
      expect(result.safety_score.value).toBeLessThanOrEqual(1);
      expect(["PASS", "WARNING", "FAIL"]).toContain(result.safety_score.verdict);
    });

    it("should throw error for invalid project ID", () => {
      const operation = createTestOperation();

      expect(() =>
        HyperMillPluginAdapterEngine.analyzeOperationPreCalc("INVALID", operation)
      ).toThrow(/No active PRISM session/);
    });

    it("should analyze harder materials with higher forces", () => {
      const softOperation = createTestOperation({
        stock: createTestStock({ iso_group: "N", material_id: "ALUMINUM" }),
      });

      const hardOperation = createTestOperation({
        stock: createTestStock({ iso_group: "H", material_id: "H13-HARDENED" }),
      });

      const softResult = HyperMillPluginAdapterEngine.analyzeOperationPreCalc(
        testProjectId,
        softOperation
      );

      // Need new session for different material
      const project2 = createTestProject();
      project2.project_id = testProjectId + "-2";
      HyperMillPluginAdapterEngine.onProjectOpened(project2);

      const hardResult = HyperMillPluginAdapterEngine.analyzeOperationPreCalc(
        testProjectId + "-2",
        hardOperation
      );

      expect(hardResult.force.peak_n).toBeGreaterThan(softResult.force.peak_n);

      HyperMillPluginAdapterEngine.onProjectClosed(testProjectId + "-2");
    });
  });

  describe("JobList Analysis", () => {
    beforeEach(() => {
      const project = createTestProject();
      project.project_id = testProjectId;
      HyperMillPluginAdapterEngine.onProjectOpened(project);
    });

    it("should analyze entire joblist", () => {
      const operations = [
        createTestOperation({ operation_id: "OP-001", operation_name: "Rough 1" }),
        createTestOperation({ operation_id: "OP-002", operation_name: "Rough 2" }),
        createTestOperation({ operation_id: "OP-003", operation_name: "Finish" }),
      ];
      const joblist = createTestJobList(operations);

      const { results, summary } = HyperMillPluginAdapterEngine.analyzeJobList(
        testProjectId,
        joblist
      );

      expect(results.length).toBe(3);
      expect(summary.total_operations).toBe(3);
      expect(summary.passed + summary.warnings + summary.failed).toBe(3);
      expect(summary.worst_safety_score).toBeGreaterThanOrEqual(0);
      expect(summary.worst_safety_score).toBeLessThanOrEqual(1);
      expect(["APPROVED", "REVIEW", "BLOCKED"]).toContain(summary.overall_verdict);
    });

    it("should flag dangerous operations in summary", () => {
      const dangerousOp = createTestOperation({
        operation_id: "OP-DANGER",
        operation_name: "Aggressive Cut",
        spindle_rpm: 15000,
        depth_of_cut_mm: 10,
        width_of_cut_mm: 20,
        tool: createTestTool({ diameter_mm: 6, flutes: 2, material: "hss" }),
        stock: createTestStock({ iso_group: "S", material_id: "INCONEL" }),
      });

      const joblist = createTestJobList([dangerousOp]);
      const { summary } = HyperMillPluginAdapterEngine.analyzeJobList(testProjectId, joblist);

      // High forces + chatter risk on Inconel should trigger warnings/failures
      expect(summary.worst_safety_score).toBeLessThan(0.85);
    });
  });

  describe("Simulation Overlay", () => {
    beforeEach(() => {
      const project = createTestProject();
      project.project_id = testProjectId;
      HyperMillPluginAdapterEngine.onProjectOpened(project);
    });

    it("should generate overlay data for time points", () => {
      const timePoints = [0, 1, 2, 3, 4, 5];
      const overlays = HyperMillPluginAdapterEngine.getSimulationOverlay(
        testProjectId,
        "OP-001",
        timePoints
      );

      expect(overlays.length).toBe(6);

      for (const overlay of overlays) {
        expect(overlay.force_n).toBeGreaterThan(0);
        expect(typeof overlay.stable).toBe("boolean");
        expect(overlay.deflection_mm).toBeGreaterThanOrEqual(0);
        expect(overlay.temp_c).toBeGreaterThan(0);
        expect(overlay.safety).toBeGreaterThanOrEqual(0);
        expect(overlay.safety).toBeLessThanOrEqual(1);
        expect(overlay.color).toMatch(/^#[0-9A-F]{6}$/);
      }
    });

    it("should return empty array for non-existent operation", () => {
      const overlays = HyperMillPluginAdapterEngine.getSimulationOverlay(
        testProjectId,
        "NON-EXISTENT",
        [0, 1, 2]
      );

      expect(overlays).toEqual([]);
    });

    it("should color-code by safety level", () => {
      const timePoints = [0];
      const overlays = HyperMillPluginAdapterEngine.getSimulationOverlay(
        testProjectId,
        "OP-001",
        timePoints
      );

      expect(overlays.length).toBe(1);
      const safety = overlays[0].safety;
      const color = overlays[0].color;

      if (safety >= 0.85) {
        expect(color).toBe("#00FF00"); // Green
      } else if (safety >= 0.70) {
        expect(color).toBe("#FFFF00"); // Yellow
      } else {
        expect(color).toBe("#FF0000"); // Red
      }
    });
  });

  describe("Message Protocol", () => {
    it("should handle project_opened message", () => {
      const project = createTestProject();
      project.project_id = testProjectId;

      const message: HMPluginMessage = {
        message_id: "MSG-001",
        message_type: "project_opened",
        timestamp: new Date().toISOString(),
        payload: project as unknown as Record<string, unknown>,
      };

      const result = HyperMillPluginAdapterEngine.handleMessage(message) as {
        prismSessionId: string;
        status: string;
      };

      expect(result.prismSessionId).toMatch(/^PRISM-VER-/);
      expect(result.status).toBe("initialized");
    });

    it("should handle pre_calculate message", () => {
      // First open project
      const project = createTestProject();
      project.project_id = testProjectId;
      HyperMillPluginAdapterEngine.onProjectOpened(project);

      const message: HMPluginMessage = {
        message_id: "MSG-002",
        message_type: "pre_calculate",
        timestamp: new Date().toISOString(),
        payload: {
          project_id: testProjectId,
          operation: createTestOperation(),
        },
      };

      const result = HyperMillPluginAdapterEngine.handleMessage(message) as {
        safety_score: { value: number };
      };

      expect(result.safety_score.value).toBeGreaterThanOrEqual(0);
    });

    it("should return unhandled status for unknown message types", () => {
      const message: HMPluginMessage = {
        message_id: "MSG-003",
        message_type: "nc_output_start",
        timestamp: new Date().toISOString(),
        payload: {},
      };

      const result = HyperMillPluginAdapterEngine.handleMessage(message) as {
        status: string;
        message_type: string;
      };

      expect(result.status).toBe("unhandled");
      expect(result.message_type).toBe("nc_output_start");
    });
  });

  describe("Recommendations", () => {
    beforeEach(() => {
      const project = createTestProject();
      project.project_id = testProjectId;
      HyperMillPluginAdapterEngine.onProjectOpened(project);
    });

    it("should generate recommendations array", () => {
      const operation = createTestOperation();
      const result = HyperMillPluginAdapterEngine.analyzeOperationPreCalc(
        testProjectId,
        operation
      );

      expect(Array.isArray(result.recommendations)).toBe(true);
      // Recommendations are strings
      for (const rec of result.recommendations) {
        expect(typeof rec).toBe("string");
        expect(rec.length).toBeGreaterThan(0);
      }
    });

    it("should recommend RPM adjustment for unstable chatter", () => {
      const unstableOp = createTestOperation({
        spindle_rpm: 15000, // Likely to hit resonance zone
        tool: createTestTool({ flutes: 2 }),
      });

      const result = HyperMillPluginAdapterEngine.analyzeOperationPreCalc(
        testProjectId,
        unstableOp
      );

      // If chatter is unstable, there should be a recommendation
      if (!result.chatter.stable && result.chatter.recommended_rpm) {
        const hasRpmRec = result.recommendations.some((r) => r.includes("RPM"));
        expect(hasRpmRec).toBe(true);
      }
    });
  });
});
