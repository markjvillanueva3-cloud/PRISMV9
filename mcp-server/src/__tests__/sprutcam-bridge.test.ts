/**
 * SprutCAMBridgeEngine Tests
 * Tests for SprutCAM automation bridge — project management, operations,
 * simulation, NC generation, robot machining, mill-turn, and wire EDM.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SprutCAMBridgeEngine,
  sprutCAMBridgeEngine,
  type SprutCAMProject,
  type SprutOperation,
  type SprutTool,
  type SprutRobotConfig,
  type SprutMillTurnConfig,
  type SprutWireEdmConfig,
  type SprutMachineDefinition,
  type SprutSimulationResult,
  type SprutNCResult,
  type SprutOperationType,
} from "../engines/SprutCAMBridgeEngine.js";

// ── Mock Fetch ────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function mockResponse(data: Record<string, unknown>, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

// ── Test Suite ────────────────────────────────────────────────────────────────

describe("SprutCAMBridgeEngine", () => {
  let engine: SprutCAMBridgeEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new SprutCAMBridgeEngine();
  });

  // ── Singleton Export ────────────────────────────────────────────────────────

  describe("singleton export", () => {
    it("exports a singleton instance", () => {
      expect(sprutCAMBridgeEngine).toBeInstanceOf(SprutCAMBridgeEngine);
    });
  });

  // ── Connection Management ───────────────────────────────────────────────────

  describe("connection management", () => {
    it("connects to SprutCAM server successfully", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          status: "ok",
          session_id: "sprut-session-123",
          sprutcam_version: "17.0.5",
          server_version: "1.0.0",
        })
      );

      const result = await engine.connect("localhost", 18366);

      expect(result.connected).toBe(true);
      expect(result.host).toBe("localhost");
      expect(result.port).toBe(18366);
      expect(result.sprutcamVersion).toBe("17.0.5");
      expect(result.sessionId).toBe("sprut-session-123");
      expect(result.message).toContain("Connected to SprutCAM");
    });

    it("handles connection failure gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      const result = await engine.connect();

      expect(result.connected).toBe(false);
      expect(result.message).toContain("Failed to connect");
    });

    it("gets server status", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          status: "ok",
          sprutcam_version: "17.0.5",
          running: true,
        })
      );

      const result = await engine.getStatus();

      expect(result.connected).toBe(true);
      expect(result.message).toContain("SprutCAM server is running");
    });

    it("disconnects cleanly", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ status: "ok" }));

      const result = await engine.disconnect();

      expect(result.disconnected).toBe(true);
      expect(result.message).toContain("Disconnected from SprutCAM");
    });
  });

  // ── Project Management ──────────────────────────────────────────────────────

  describe("project management", () => {
    it("opens a SprutCAM project", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          version: "17.0.5",
          machine_simulation: true,
          operations: [
            { id: "op1", name: "Roughing", type: "adaptive_roughing", status: "pending" },
          ],
          tools: [
            { id: "t1", number: 1, type: "end_mill", diameterMm: 12 },
          ],
          robot_support: false,
        })
      );

      const result = await engine.openProject("C:/Projects/part.stc");

      expect(result.success).toBe(true);
      expect(result.project).toBeDefined();
      expect(result.project?.projectPath).toBe("C:/Projects/part.stc");
      expect(result.project?.version).toBe("17.0.5");
      expect(result.project?.machineSimulation).toBe(true);
      expect(result.project?.operations).toHaveLength(1);
      expect(result.project?.tools).toHaveLength(1);
    });

    it("creates a new SprutCAM project", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          project_path: "C:/Projects/new_part.stc",
          version: "17.0.5",
          operations: [],
          tools: [],
        })
      );

      const result = await engine.createProject({
        name: "New Part",
        machineType: "5axis",
        controller: "fanuc",
        stock: {
          type: "block",
          block: { lengthMm: 100, widthMm: 80, heightMm: 50 },
          materialIsoGroup: "P",
          materialName: "Steel 4140",
        },
      });

      expect(result.success).toBe(true);
      expect(result.project).toBeDefined();
    });

    it("saves project", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ status: "ok" }));

      const result = await engine.saveProject("C:/Projects/part_v2.stc");

      expect(result.success).toBe(true);
      expect(result.action).toBe("save_project");
    });

    it("returns active project", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          version: "17.0.5",
          operations: [],
          tools: [],
        })
      );

      await engine.openProject("C:/Projects/part.stc");
      const project = engine.getActiveProject();

      expect(project).toBeDefined();
      expect(project?.projectPath).toBe("C:/Projects/part.stc");
    });
  });

  // ── Operation Management ────────────────────────────────────────────────────

  describe("operation management", () => {
    it("creates a milling operation", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          operation_id: "op-new-1",
          name: "Adaptive Rough",
          type: "adaptive_roughing",
          status: "pending",
        })
      );

      const result = await engine.createOperation({
        type: "adaptive_roughing",
        name: "Adaptive Rough",
        params: {
          maxEngagementPercent: 10,
          chipLoadMm: 0.1,
          depthOfCutMm: 15,
        },
      });

      expect(result.success).toBe(true);
      expect(result.operation).toBeDefined();
      expect(result.operation?.type).toBe("adaptive_roughing");
    });

    it("creates a 5-axis operation", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          operation_id: "op-5ax-1",
          name: "5-Axis Flowline",
          type: "5axis_flowline",
          status: "pending",
        })
      );

      const result = await engine.createOperation({
        type: "5axis_flowline",
        name: "5-Axis Flowline",
        params: {
          leadAngleDeg: 15,
          lagAngleDeg: 5,
          toolAxisSmoothingDeg: 1.0,
          scalllopHeightMm: 0.005,
        },
      });

      expect(result.success).toBe(true);
      expect(result.operation?.type).toBe("5axis_flowline");
    });

    it("creates a turning operation", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          operation_id: "op-turn-1",
          name: "OD Roughing",
          type: "od_roughing",
          status: "pending",
        })
      );

      const result = await engine.createOperation({
        type: "od_roughing",
        params: {
          cssMpm: 200,
          feedMmRev: 0.25,
          depthOfCutMm: 3,
          maxRpm: 4000,
        },
      });

      expect(result.success).toBe(true);
      expect(result.operation?.type).toBe("od_roughing");
    });

    it("modifies operation parameters", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ status: "ok" }));

      const result = await engine.modifyOperation("op-1", {
        spindleRpm: 8000,
        feedMmMin: 3000,
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe("modify_operation");
    });

    it("calculates toolpath for operations", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          status: "ok",
          calculated_operations: 3,
          total_cycle_time_sec: 1234,
        })
      );

      const result = await engine.calculateToolpath(["op-1", "op-2", "op-3"]);

      expect(result.success).toBe(true);
      expect(result.action).toBe("calculate_toolpath");
    });
  });

  // ── Tool Management ─────────────────────────────────────────────────────────

  describe("tool management", () => {
    it("adds a tool to the project", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          tool_id: "tool-new-1",
          status: "ok",
        })
      );

      const result = await engine.addTool({
        number: 5,
        type: "ball_end",
        diameterMm: 8,
        fluteCount: 2,
        fluteLengthMm: 16,
        overallLengthMm: 75,
        material: "carbide",
        coating: "TiAlN",
      });

      expect(result.success).toBe(true);
      expect(result.tool).toBeDefined();
      expect(result.tool?.type).toBe("ball_end");
      expect(result.tool?.diameterMm).toBe(8);
    });

    it("queries tool library", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          tools: [
            { id: "t1", number: 1, type: "end_mill", diameterMm: 10 },
            { id: "t2", number: 2, type: "end_mill", diameterMm: 12 },
          ],
        })
      );

      const result = await engine.queryToolLibrary({
        type: "end_mill",
        diameterMinMm: 8,
        diameterMaxMm: 14,
      });

      expect(result.success).toBe(true);
      expect(result.tools).toHaveLength(2);
    });
  });

  // ── Simulation ──────────────────────────────────────────────────────────────

  describe("simulation", () => {
    it("runs machine simulation successfully", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          passed: true,
          collision_detected: false,
          simulation_time_sec: 45.2,
          material_verification: {
            remainingStockMm3: 150,
            targetAchieved: true,
            gougingDetected: false,
          },
        })
      );

      const result = await engine.runSimulation({
        mode: "detailed",
        nearMissDistanceMm: 2,
        checkToolHolder: true,
        checkFixtures: true,
      });

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.passed).toBe(true);
      expect(result.result?.collisionDetected).toBe(false);
    });

    it("detects collision in simulation", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          passed: false,
          collision_detected: true,
          collisions: [
            {
              type: "tool_fixture",
              operationId: "op-3",
              moveIndex: 1542,
              description: "Tool collides with vise jaw at Z-15.2mm",
            },
          ],
          near_misses: [
            { distanceMm: 0.8, operationId: "op-2", moveIndex: 892 },
          ],
          simulation_time_sec: 38.5,
        })
      );

      const result = await engine.runSimulation({ mode: "detailed" });

      expect(result.success).toBe(true);
      expect(result.result?.passed).toBe(false);
      expect(result.result?.collisionDetected).toBe(true);
      expect(result.result?.collisions).toHaveLength(1);
      expect(result.result?.nearMisses).toHaveLength(1);
    });
  });

  // ── NC Generation ───────────────────────────────────────────────────────────

  describe("NC generation", () => {
    it("generates NC code", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          output_path: "C:/Output/part_001.nc",
          program_name: "PART_001",
          line_count: 2450,
        })
      );

      const result = await engine.generateNC({
        postProcessor: "fanuc_30i.sppx",
        outputFolder: "C:/Output",
        programName: "PART_001",
        outputUnits: "mm",
      });

      expect(result.success).toBe(true);
      expect(result.ncResult).toBeDefined();
      expect(result.ncResult?.outputPath).toBe("C:/Output/part_001.nc");
      expect(result.ncResult?.lineCount).toBe(2450);
    });

    it("returns NC code content when requested", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          output_path: "C:/Output/part.nc",
          line_count: 100,
          nc_code: "O0001\nG90 G40 G80\nG54\n...",
        })
      );

      const result = await engine.generateNC({
        postProcessor: "fanuc_30i.sppx",
        outputFolder: "C:/Output",
        returnNc: true,
      });

      expect(result.success).toBe(true);
      expect(result.ncResult?.ncCode).toBeDefined();
      expect(result.ncResult?.ncCode).toContain("G90");
    });

    it("lists available post processors", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          post_processors: [
            "fanuc_30i.sppx",
            "siemens_840d.sppx",
            "haas_ngc.sppx",
            "mazak_640mt.sppx",
            "kuka_krl.sppx",
          ],
        })
      );

      const result = await engine.listPostProcessors();

      expect(result.success).toBe(true);
      expect(result.postProcessors).toHaveLength(5);
      expect(result.postProcessors).toContain("fanuc_30i.sppx");
    });
  });

  // ── Robot Machining ─────────────────────────────────────────────────────────

  describe("robot machining", () => {
    it("configures robot for machining", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ status: "ok" }));

      const result = await engine.configureRobot({
        manufacturer: "KUKA",
        model: "KR 60-3",
        axisCount: 6,
        tcpOffset: { x: 0, y: 0, z: 150, rx: 0, ry: 0, rz: 0 },
        reachMm: 2033,
        payloadKg: 60,
        singularityZones: [
          { type: "wrist", avoidanceStrategy: "tilt" },
          { type: "shoulder", avoidanceStrategy: "reorient" },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe("configure_robot");
    });

    it("checks robot reachability", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          reachable: false,
          unreachable_points: [
            { index: 1542, reason: "Out of reach" },
            { index: 2103, reason: "Near singularity" },
          ],
          singularity_warnings: [
            { index: 2050, type: "wrist" },
          ],
        })
      );

      const result = await engine.checkRobotReachability();

      expect(result.success).toBe(true);
      expect(result.reachable).toBe(false);
      expect(result.unreachablePoints).toHaveLength(2);
      expect(result.singularityWarnings).toHaveLength(1);
    });
  });

  // ── Mill-Turn ───────────────────────────────────────────────────────────────

  describe("mill-turn", () => {
    it("configures mill-turn machine", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ status: "ok" }));

      const result = await engine.configureMillTurn({
        machineType: "swiss",
        spindleCount: 2,
        hasSubSpindle: true,
        hasGuideBushing: true,
        turretCount: 2,
        hasLiveTooling: true,
        maxLiveToolRpm: 6000,
        channelCount: 3,
        syncMode: "overlap",
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe("configure_millturn");
    });

    it("creates sub-spindle transfer operation", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ status: "ok" }));

      const result = await engine.createSubSpindleTransfer({
        transferPoint: { x: 0, z: 25 },
        mainSpindleSpeed: 2000,
        subSpindleSpeed: 2000,
        syncMode: "match",
        gripperSequence: ["close", "wait", "open", "wait"],
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe("create_transfer");
    });
  });

  // ── Wire EDM ────────────────────────────────────────────────────────────────

  describe("wire EDM", () => {
    it("configures wire EDM settings", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ status: "ok" }));

      const result = await engine.configureWireEdm({
        wireDiameterMm: 0.25,
        wireMaterial: "brass",
        has4Axis: true,
        maxTaperDeg: 30,
        dielectricType: "deionized_water",
        supportsNoCore: true,
        threading: {
          autoThread: true,
          threadingHeadType: "upper",
        },
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe("configure_wireedm");
    });

    it("creates wire EDM profile operation", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          operation_id: "wedm-1",
          name: "WEDM Profile",
          type: "wire_edm_profile",
          status: "pending",
        })
      );

      const result = await engine.createWireEdmOperation({
        type: "wire_edm_profile",
        skimCuts: 2,
        roughWireOffsetMm: 0.15,
        skimWireOffsetMm: 0.02,
      });

      expect(result.success).toBe(true);
      expect(result.operation).toBeDefined();
      expect(result.operation?.type).toBe("wire_edm_profile");
    });

    it("creates wire EDM taper operation", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          operation_id: "wedm-taper-1",
          name: "WEDM Taper",
          type: "wire_edm_taper",
          status: "pending",
        })
      );

      const result = await engine.createWireEdmOperation({
        type: "wire_edm_taper",
        taperAngleDeg: 5,
        topContour: [
          { x: 0, y: 0 },
          { x: 50, y: 0 },
          { x: 50, y: 30 },
          { x: 0, y: 30 },
        ],
        bottomContour: [
          { x: 2, y: 2 },
          { x: 48, y: 2 },
          { x: 48, y: 28 },
          { x: 2, y: 28 },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.operation?.type).toBe("wire_edm_taper");
    });

    it("creates no-core wire EDM operation", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          operation_id: "wedm-nocore-1",
          name: "WEDM No-Core",
          type: "wire_edm_no_core",
          status: "pending",
        })
      );

      const result = await engine.createWireEdmOperation({
        type: "wire_edm_no_core",
        noCoreTabsMm: 0.3,
      });

      expect(result.success).toBe(true);
      expect(result.operation?.type).toBe("wire_edm_no_core");
    });
  });

  // ── Machine Definition ──────────────────────────────────────────────────────

  describe("machine definition", () => {
    it("sets machine definition", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ status: "ok" }));

      const result = await engine.setMachineDefinition({
        name: "DMG MORI DMU 50",
        type: "5axis",
        controller: "siemens_840d",
        axes: [
          { name: "X", type: "linear", direction: "X", minLimit: -300, maxLimit: 300, homePosition: 0 },
          { name: "Y", type: "linear", direction: "Y", minLimit: -300, maxLimit: 300, homePosition: 0 },
          { name: "Z", type: "linear", direction: "Z", minLimit: -300, maxLimit: 300, homePosition: 0 },
          { name: "B", type: "rotary", direction: "B", minLimit: -120, maxLimit: 120, homePosition: 0 },
          { name: "C", type: "rotary", direction: "C", minLimit: -360, maxLimit: 360, homePosition: 0 },
        ],
        spindle: {
          maxRpm: 12000,
          minRpm: 50,
          powerKw: 25,
          torqueNm: 90,
        },
        workEnvelope: {
          xMin: -300, xMax: 300,
          yMin: -300, yMax: 300,
          zMin: -300, zMax: 300,
        },
        toolChanger: {
          type: "arm",
          capacity: 30,
          changeTimeSec: 4.5,
        },
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe("set_machine_definition");
    });

    it("lists available machine definitions", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          machines: [
            { name: "DMG MORI DMU 50", type: "5axis", controller: "siemens_840d" },
            { name: "Mazak INTEGREX", type: "mill_turn", controller: "mazatrol" },
            { name: "KUKA KR 60", type: "robot", controller: "kuka_krl" },
          ],
        })
      );

      const result = await engine.listMachineDefinitions();

      expect(result.success).toBe(true);
      expect(result.machines).toHaveLength(3);
    });
  });

  // ── IPW Export ──────────────────────────────────────────────────────────────

  describe("IPW export", () => {
    it("exports IPW as STL", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          stl_path: "C:/Output/ipw_after_op3.stl",
          status: "ok",
        })
      );

      const result = await engine.exportIPW({
        afterOperationId: "op-3",
        outputPath: "C:/Output/ipw_after_op3.stl",
        resolutionMm: 0.05,
      });

      expect(result.success).toBe(true);
      expect(result.stlPath).toBe("C:/Output/ipw_after_op3.stl");
    });
  });

  // ── Error Handling ──────────────────────────────────────────────────────────

  describe("error handling", () => {
    it("handles API error responses", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({ error: "Project file not found" }, false, 404)
      );

      const result = await engine.openProject("C:/Projects/nonexistent.stc");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("handles network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await engine.openProject("C:/Projects/part.stc");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });

    it("handles timeout errors", async () => {
      const abortError = new Error("Timeout");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValueOnce(abortError);

      const result = await engine.openProject("C:/Projects/part.stc");

      expect(result.success).toBe(false);
    });
  });

  // ── Type Safety ─────────────────────────────────────────────────────────────

  describe("type safety", () => {
    it("validates operation types", () => {
      const validTypes: SprutOperationType[] = [
        "adaptive_roughing",
        "5axis_flowline",
        "od_roughing",
        "wire_edm_taper",
        "robot_contour",
        "additive_ded",
        "gear_hobbing",
      ];

      for (const type of validTypes) {
        expect(typeof type).toBe("string");
      }
    });

    it("defines complete project structure", () => {
      const project: SprutCAMProject = {
        projectPath: "C:/test.stc",
        version: "17.0",
        machineSimulation: true,
        operations: [],
        tools: [],
        robotSupport: true,
        robotConfig: {
          manufacturer: "KUKA",
          model: "KR 60",
          axisCount: 6,
          tcpOffset: { x: 0, y: 0, z: 100 },
          reachMm: 2000,
          payloadKg: 60,
        },
        millTurnConfig: {
          machineType: "swiss",
          spindleCount: 2,
          hasSubSpindle: true,
          hasGuideBushing: true,
          turretCount: 2,
          hasLiveTooling: true,
          channelCount: 3,
          syncMode: "overlap",
        },
        wireEdmConfig: {
          wireDiameterMm: 0.25,
          wireMaterial: "brass",
          has4Axis: true,
          dielectricType: "deionized_water",
          supportsNoCore: true,
          threading: { autoThread: true },
        },
      };

      expect(project.projectPath).toBe("C:/test.stc");
      expect(project.robotSupport).toBe(true);
      expect(project.millTurnConfig?.machineType).toBe("swiss");
    });

    it("defines complete simulation result structure", () => {
      const result: SprutSimulationResult = {
        passed: false,
        collisionDetected: true,
        collisions: [
          {
            type: "tool_fixture",
            operationId: "op-1",
            moveIndex: 100,
            description: "Collision detected",
          },
        ],
        nearMisses: [
          { distanceMm: 0.5, operationId: "op-2", moveIndex: 200 },
        ],
        overTravel: [
          { axis: "X", position: 305, limit: 300, operationId: "op-3" },
        ],
        materialVerification: {
          remainingStockMm3: 50,
          targetAchieved: false,
          gougingDetected: true,
        },
        simulationTimeSec: 120,
      };

      expect(result.passed).toBe(false);
      expect(result.collisions).toHaveLength(1);
      expect(result.materialVerification?.gougingDetected).toBe(true);
    });
  });
});
