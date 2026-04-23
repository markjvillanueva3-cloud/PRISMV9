/**
 * Tests for PRISMVerificationPluginEngine — Intelligent Vericut Integration
 * @milestone CAM-EXHAUST-MS0 U-CAM85
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  PRISMVerificationPluginEngine,
  OperationPoint,
  PhysicsOverlay,
  VerificationSession,
} from "../engines/PRISMVerificationPluginEngine.js";

describe("PRISMVerificationPluginEngine", () => {
  describe("Session Management", () => {
    it("should create a verification session", () => {
      const session = PRISMVerificationPluginEngine.createSession({
        cam_system: "hypermill",
        part_number: "JM-DIE-001",
        machine_id: "OKUMA-LB3000",
      });

      expect(session.session_id).toMatch(/^PRISM-VER-/);
      expect(session.cam_system).toBe("hypermill");
      expect(session.part_number).toBe("JM-DIE-001");
      expect(session.state).toBe("initializing");
      expect(session.operations_analyzed).toBe(0);
    });

    it("should retrieve session by ID", () => {
      const session = PRISMVerificationPluginEngine.createSession({
        cam_system: "mastercam",
        part_number: "TEST-002",
        machine_id: "HAAS-VF2",
      });

      const retrieved = PRISMVerificationPluginEngine.getSession(session.session_id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.part_number).toBe("TEST-002");
    });

    it("should list active sessions", () => {
      PRISMVerificationPluginEngine.createSession({
        cam_system: "fusion360",
        part_number: "ACTIVE-001",
        machine_id: "HURCO-VM10",
      });

      const sessions = PRISMVerificationPluginEngine.listSessions();
      expect(sessions.length).toBeGreaterThan(0);
    });
  });

  describe("Physics Analysis", () => {
    let sessionId: string;

    beforeEach(() => {
      const session = PRISMVerificationPluginEngine.createSession({
        cam_system: "hypermill",
        part_number: "PHYSICS-TEST",
        machine_id: "OKUMA-MB56V",
      });
      sessionId = session.session_id;
    });

    it("should analyze operation point and return physics overlay", () => {
      const point: OperationPoint = {
        operation_id: "OP-001",
        time_s: 10,
        position: { x: 50, y: 25, z: -5 },
        cutting: {
          spindle_rpm: 8000,
          feed_rate_mmpm: 2400,
          depth_of_cut_mm: 2,
          width_of_cut_mm: 6,
        },
        tool: {
          tool_id: "T01",
          diameter_mm: 12,
          flutes: 4,
          material: "carbide",
          overhang_mm: 50,
        },
        material: {
          material_id: "4140",
          iso_group: "P",
        },
      };

      const overlay = PRISMVerificationPluginEngine.analyzePoint(sessionId, point);

      expect(overlay.force).toBeDefined();
      expect(overlay.force.unit).toBe("N");
      expect(overlay.force.value).toBeGreaterThan(0);
      expect(overlay.force.confidence).toBeGreaterThan(0);

      expect(overlay.chatter).toBeDefined();
      expect(typeof overlay.chatter.stable).toBe("boolean");

      expect(overlay.deflection).toBeDefined();
      expect(overlay.deflection.unit).toBe("mm");

      expect(overlay.temperature).toBeDefined();
      expect(overlay.temperature.unit).toBe("°C");

      expect(overlay.tool_life).toBeDefined();
      expect(overlay.tool_life.remaining_pct).toBeGreaterThanOrEqual(0);
      expect(overlay.tool_life.remaining_pct).toBeLessThanOrEqual(100);

      expect(overlay.safety_score).toBeDefined();
      expect(overlay.safety_score.value).toBeGreaterThanOrEqual(0);
      expect(overlay.safety_score.value).toBeLessThanOrEqual(1);
      expect(["PASS", "WARNING", "FAIL"]).toContain(overlay.safety_score.verdict);
    });

    it("should calculate higher forces for harder materials", () => {
      const basePoint: OperationPoint = {
        operation_id: "OP-002",
        time_s: 5,
        position: { x: 0, y: 0, z: 0 },
        cutting: {
          spindle_rpm: 5000,
          feed_rate_mmpm: 1000,
          depth_of_cut_mm: 1.5,
          width_of_cut_mm: 8,
        },
        tool: {
          tool_id: "T02",
          diameter_mm: 10,
          flutes: 4,
          material: "carbide",
        },
        material: {
          material_id: "ALUMINUM",
          iso_group: "N", // Aluminum
        },
      };

      const aluminumOverlay = PRISMVerificationPluginEngine.analyzePoint(sessionId, basePoint);

      // Create a new session for harder material
      const hardSession = PRISMVerificationPluginEngine.createSession({
        cam_system: "mastercam",
        part_number: "HARD-TEST",
        machine_id: "TEST-MACHINE",
      });

      const hardPoint = {
        ...basePoint,
        material: {
          material_id: "H13",
          iso_group: "H" as const, // Hardened steel
        },
      };

      const hardenedOverlay = PRISMVerificationPluginEngine.analyzePoint(hardSession.session_id, hardPoint);

      expect(hardenedOverlay.force.value).toBeGreaterThan(aluminumOverlay.force.value);
    });

    it("should detect unstable chatter conditions", () => {
      const point: OperationPoint = {
        operation_id: "OP-CHATTER",
        time_s: 1,
        position: { x: 0, y: 0, z: 0 },
        cutting: {
          spindle_rpm: 15000, // Very high RPM to trigger instability
          feed_rate_mmpm: 3000,
          depth_of_cut_mm: 3,
          width_of_cut_mm: 10,
        },
        tool: {
          tool_id: "T03",
          diameter_mm: 8,
          flutes: 2, // 2 flutes at high RPM
          material: "carbide",
        },
        material: {
          material_id: "STEEL",
          iso_group: "P",
        },
      };

      const overlay = PRISMVerificationPluginEngine.analyzePoint(sessionId, point);

      // At 15000 RPM with 2 flutes, critical = 60000 / (2*2) = 15000
      // rpmRatio = 1.0, which is in the resonance zone (0.8-1.2)
      expect(overlay.chatter.stable).toBe(false);
      expect(overlay.chatter.status).toBe("unstable");
    });

    it("should calculate deflection based on overhang", () => {
      const shortOverhang: OperationPoint = {
        operation_id: "OP-SHORT",
        time_s: 1,
        position: { x: 0, y: 0, z: 0 },
        cutting: {
          spindle_rpm: 5000,
          feed_rate_mmpm: 1500,
          depth_of_cut_mm: 2,
          width_of_cut_mm: 6,
        },
        tool: {
          tool_id: "T04",
          diameter_mm: 12,
          flutes: 4,
          material: "carbide",
          overhang_mm: 30, // Short overhang
        },
        material: {
          material_id: "STEEL",
          iso_group: "P",
        },
      };

      const session1 = PRISMVerificationPluginEngine.createSession({
        cam_system: "fusion360",
        part_number: "DEFLECT-TEST",
        machine_id: "TEST",
      });

      const shortOverlay = PRISMVerificationPluginEngine.analyzePoint(session1.session_id, shortOverhang);

      const session2 = PRISMVerificationPluginEngine.createSession({
        cam_system: "fusion360",
        part_number: "DEFLECT-TEST-2",
        machine_id: "TEST",
      });

      const longOverhang = {
        ...shortOverhang,
        tool: { ...shortOverhang.tool, overhang_mm: 80 }, // Long overhang
      };

      const longOverlay = PRISMVerificationPluginEngine.analyzePoint(session2.session_id, longOverhang);

      // Deflection scales with L³, so longer overhang = much more deflection
      expect(longOverlay.deflection.value).toBeGreaterThan(shortOverlay.deflection.value);
    });

    it("should update session statistics after analysis", () => {
      const point: OperationPoint = {
        operation_id: "OP-STATS",
        time_s: 5,
        position: { x: 10, y: 10, z: -2 },
        cutting: {
          spindle_rpm: 6000,
          feed_rate_mmpm: 1800,
          depth_of_cut_mm: 2,
          width_of_cut_mm: 6,
        },
        tool: {
          tool_id: "T05",
          diameter_mm: 10,
          flutes: 4,
          material: "carbide",
        },
        material: {
          material_id: "STEEL",
          iso_group: "P",
        },
      };

      PRISMVerificationPluginEngine.analyzePoint(sessionId, point);

      const session = PRISMVerificationPluginEngine.getSession(sessionId);
      expect(session?.operations_analyzed).toBe(1);
      expect(session?.statistics).toBeDefined();
      expect(session?.statistics?.max_force_n).toBeGreaterThan(0);
    });
  });

  describe("Session Completion", () => {
    it("should complete session and return final verdict", () => {
      const session = PRISMVerificationPluginEngine.createSession({
        cam_system: "inventor_hsm",
        part_number: "COMPLETE-TEST",
        machine_id: "MACHINE-01",
      });

      // Analyze a safe point
      const safePoint: OperationPoint = {
        operation_id: "OP-SAFE",
        time_s: 1,
        position: { x: 0, y: 0, z: 0 },
        cutting: {
          spindle_rpm: 4000,
          feed_rate_mmpm: 800,
          depth_of_cut_mm: 0.5,
          width_of_cut_mm: 3,
        },
        tool: {
          tool_id: "T06",
          diameter_mm: 10,
          flutes: 4,
          material: "carbide",
        },
        material: {
          material_id: "ALUMINUM",
          iso_group: "N",
        },
      };

      PRISMVerificationPluginEngine.analyzePoint(session.session_id, safePoint);

      const result = PRISMVerificationPluginEngine.completeSession(session.session_id);
      expect(result.state).toBe("completed");
      expect(["CERTIFIED", "REVIEW_REQUIRED", "BLOCKED"]).toContain(result.final_verdict);
    });
  });

  describe("Supported Systems", () => {
    it("should return all supported CAM systems", () => {
      const systems = PRISMVerificationPluginEngine.getSupportedSystems();

      expect(systems.length).toBe(4);
      expect(systems.map(s => s.id)).toContain("hypermill");
      expect(systems.map(s => s.id)).toContain("fusion360");
      expect(systems.map(s => s.id)).toContain("inventor_hsm");
      expect(systems.map(s => s.id)).toContain("mastercam");
    });
  });

  describe("WebSocket Message Format", () => {
    it("should format overlay for WebSocket transmission", () => {
      const session = PRISMVerificationPluginEngine.createSession({
        cam_system: "hypermill",
        part_number: "WS-TEST",
        machine_id: "MACHINE-WS",
      });

      const point: OperationPoint = {
        operation_id: "OP-WS",
        time_s: 1,
        position: { x: 0, y: 0, z: 0 },
        cutting: {
          spindle_rpm: 5000,
          feed_rate_mmpm: 1000,
          depth_of_cut_mm: 1,
          width_of_cut_mm: 5,
        },
        tool: {
          tool_id: "T07",
          diameter_mm: 10,
          flutes: 4,
          material: "carbide",
        },
        material: {
          material_id: "STEEL",
          iso_group: "P",
        },
      };

      const overlay = PRISMVerificationPluginEngine.analyzePoint(session.session_id, point);
      const message = PRISMVerificationPluginEngine.formatWebSocketMessage(overlay);

      const parsed = JSON.parse(message);
      expect(parsed.type).toBe("physics_overlay");
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.data).toEqual(overlay);
    });
  });

  describe("Safety Score Calculation", () => {
    it("should calculate S(x) as weighted average of components", () => {
      const session = PRISMVerificationPluginEngine.createSession({
        cam_system: "mastercam",
        part_number: "SAFETY-TEST",
        machine_id: "MACHINE-SAFE",
      });

      const point: OperationPoint = {
        operation_id: "OP-SAFETY",
        time_s: 1,
        position: { x: 0, y: 0, z: 0 },
        cutting: {
          spindle_rpm: 4000,
          feed_rate_mmpm: 600,
          depth_of_cut_mm: 0.5,
          width_of_cut_mm: 3,
        },
        tool: {
          tool_id: "T08",
          diameter_mm: 10,
          flutes: 4,
          material: "carbide",
        },
        material: {
          material_id: "ALUMINUM",
          iso_group: "N",
        },
      };

      const overlay = PRISMVerificationPluginEngine.analyzePoint(session.session_id, point);

      // S(x) should be between 0 and 1
      expect(overlay.safety_score.value).toBeGreaterThanOrEqual(0);
      expect(overlay.safety_score.value).toBeLessThanOrEqual(1);

      // Components should all be present
      expect(overlay.safety_score.components.force).toBeDefined();
      expect(overlay.safety_score.components.stability).toBeDefined();
      expect(overlay.safety_score.components.deflection).toBeDefined();
      expect(overlay.safety_score.components.thermal).toBeDefined();
      expect(overlay.safety_score.components.tool_life).toBeDefined();
    });

    it("should set hard_stop when S(x) < 0.70", () => {
      const session = PRISMVerificationPluginEngine.createSession({
        cam_system: "hypermill",
        part_number: "HARDSTOP-TEST",
        machine_id: "MACHINE-HS",
      });

      // Create extreme conditions to trigger hard stop
      const dangerousPoint: OperationPoint = {
        operation_id: "OP-DANGER",
        time_s: 100, // Long time = tool wear
        position: { x: 0, y: 0, z: 0 },
        cutting: {
          spindle_rpm: 15000, // High RPM in resonance zone
          feed_rate_mmpm: 5000, // High feed
          depth_of_cut_mm: 10, // Deep cut
          width_of_cut_mm: 20, // Wide cut
        },
        tool: {
          tool_id: "T09",
          diameter_mm: 6, // Small diameter
          flutes: 2,
          material: "hss", // Weaker material
          overhang_mm: 100, // Long overhang
        },
        material: {
          material_id: "INCONEL",
          iso_group: "S", // Hardest material
        },
      };

      const overlay = PRISMVerificationPluginEngine.analyzePoint(session.session_id, dangerousPoint);

      // Should have very low safety score and hard stop
      expect(overlay.safety_score.value).toBeLessThan(0.7);
      expect(overlay.safety_score.hard_stop).toBe(true);
      expect(overlay.safety_score.verdict).toBe("FAIL");
    });
  });
});
