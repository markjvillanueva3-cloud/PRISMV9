/**
 * LatheMasterPostRouterEngine Tests
 *
 * U-LTH25: Tests for central router that routes lathe jobs to correct sub-posts
 * based on JM Die's 7 Okuma lathes + fallback path for unknown machines.
 */

import { describe, it, expect } from "vitest";
import {
  latheMasterPostRouterEngine,
  type MasterPostRouteRequest,
  type LatheOperationType,
} from "../engines/LatheMasterPostRouterEngine.js";

describe("LatheMasterPostRouterEngine", () => {
  const createBaseRequest = (overrides: Partial<MasterPostRouteRequest> = {}): MasterPostRouteRequest => ({
    machine_id: "LTH-01",
    operation: "turning",
    program_name: "TEST_PART",
    program_number: 1001,
    moves: [
      { type: "rapid", x: 100, z: 5 },
      { type: "linear", x: 50, z: 0, f: 200 },
      { type: "linear", x: 50, z: -50, f: 200 },
    ],
    tool_number: 1,
    spindle_rpm: 1500,
    feed_rate_mmmin: 200,
    material_iso: "P",
    coolant: "flood",
    ...overrides,
  });

  describe("route() - Machine Resolution", () => {
    it("routes LTH-01 to Okuma post with high confidence", () => {
      const request = createBaseRequest({ machine_id: "LTH-01" });
      const result = latheMasterPostRouterEngine.route(request);

      expect(result.route_decision.machine_id).toBe("LTH-01");
      expect(result.route_decision.controller_family).toBe("okuma");
      expect(result.route_decision.selected_post).toBe("PPOkumaTurningPostEngine");
      expect(result.route_decision.route_method).toBe("direct_match");
      expect(result.route_decision.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("routes all 7 JM Die Okuma lathes correctly", () => {
      const latheIds = ["LTH-01", "LTH-02", "LTH-03", "LTH-04", "LTH-05", "LTH-06", "LTH-07"];

      for (const machineId of latheIds) {
        const request = createBaseRequest({ machine_id: machineId });
        const result = latheMasterPostRouterEngine.route(request);

        expect(result.route_decision.machine_id).toBe(machineId);
        expect(result.route_decision.controller_family).toBe("okuma");
        expect(result.route_decision.reasoning.length).toBeGreaterThan(0);
      }
    });

    it("uses fallback generator for unknown machine", () => {
      const request = createBaseRequest({ machine_id: "UNKNOWN-99" });
      const result = latheMasterPostRouterEngine.route(request);

      expect(result.route_decision.route_method).toBe("fallback_generator");
      expect(result.route_decision.confidence).toBeLessThan(0.8);
      expect(result.warnings.some(w => w.includes("not in JM Die registry"))).toBe(true);
    });

    it("includes machine name in route decision", () => {
      const request = createBaseRequest({ machine_id: "LTH-01" });
      const result = latheMasterPostRouterEngine.route(request);

      expect(result.route_decision.machine_name).toContain("Okuma");
      expect(result.route_decision.machine_name).toContain("GENOS");
    });
  });

  describe("route() - Controller Selection", () => {
    it("selects correct controller model for each machine", () => {
      const expectedControllers: Record<string, string> = {
        "LTH-01": "OSP-P300L-R",
        "LTH-02": "OSP-P200LA-R",
        "LTH-03": "OSP-U10L",
        "LTH-04": "OSP-U10L",
        "LTH-05": "OSP-P300LA-E",
        "LTH-06": "OSP-P500",
        "LTH-07": "OSP-P300SA",
      };

      for (const [machineId, expectedController] of Object.entries(expectedControllers)) {
        const request = createBaseRequest({ machine_id: machineId });
        const result = latheMasterPostRouterEngine.route(request);

        expect(result.route_decision.controller_model).toBe(expectedController);
      }
    });

    it("includes reasoning steps in route decision", () => {
      const request = createBaseRequest({ machine_id: "LTH-05" });
      const result = latheMasterPostRouterEngine.route(request);

      expect(result.route_decision.reasoning.length).toBeGreaterThanOrEqual(2);
      expect(result.route_decision.reasoning.some(r => r.includes("Resolved machine"))).toBe(true);
      expect(result.route_decision.reasoning.some(r => r.includes("Controller family"))).toBe(true);
    });
  });

  describe("route() - Capability Warnings", () => {
    it("warns when sub_spindle requested on non-capable machine", () => {
      const request = createBaseRequest({
        machine_id: "LTH-01",
        sub_spindle: true,
      });
      const result = latheMasterPostRouterEngine.route(request);

      expect(result.warnings.some(w => w.includes("sub-spindle"))).toBe(true);
    });

    it("does not warn about sub_spindle for LTH-06 (Big Bore)", () => {
      const request = createBaseRequest({
        machine_id: "LTH-06",
        sub_spindle: true,
      });
      const result = latheMasterPostRouterEngine.route(request);

      expect(result.warnings.filter(w => w.includes("sub-spindle")).length).toBe(0);
    });

    it("warns when live_tooling requested on non-capable machine", () => {
      const request = createBaseRequest({
        machine_id: "LTH-03",
        live_tooling: true,
      });
      const result = latheMasterPostRouterEngine.route(request);

      expect(result.warnings.some(w => w.includes("live tooling"))).toBe(true);
    });
  });

  describe("getLatheMachines()", () => {
    it("returns at least 7 JM Die lathe machines", () => {
      const machines = latheMasterPostRouterEngine.getLatheMachines();

      expect(machines.length).toBeGreaterThanOrEqual(7);
      // Core Okuma lathes should be present
      const okumaLathes = machines.filter(m => m.machine_id.startsWith("LTH-"));
      expect(okumaLathes.length).toBe(7);
    });

    it("includes machine names for all lathes", () => {
      const machines = latheMasterPostRouterEngine.getLatheMachines();

      expect(machines.every(m => m.machine_name.length > 0)).toBe(true);
      // At least the 7 LTH- machines should be Okuma
      const okumaLathes = machines.filter(m => m.machine_id.startsWith("LTH-"));
      expect(okumaLathes.every(m => m.machine_name.includes("Okuma"))).toBe(true);
    });
  });

  describe("getRouteRecommendation()", () => {
    it("recommends Okuma post for known Okuma machine", () => {
      const recommendation = latheMasterPostRouterEngine.getRouteRecommendation("LTH-01");

      expect(recommendation.recommended_post).toBe("PPOkumaTurningPostEngine");
      expect(recommendation.controller_family).toBe("okuma");
      expect(recommendation.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("recommends fallback for unknown machine", () => {
      const recommendation = latheMasterPostRouterEngine.getRouteRecommendation("FAKE-99");

      expect(recommendation.recommended_post).toBe("LathePostGeneratorEngine");
      expect(recommendation.controller_family).toBe("unknown");
      expect(recommendation.confidence).toBeLessThan(0.6);
      expect(recommendation.notes.some(n => n.includes("not found"))).toBe(true);
    });

    it("includes helpful notes for each recommendation", () => {
      const recommendation = latheMasterPostRouterEngine.getRouteRecommendation("LTH-07");

      expect(recommendation.notes.length).toBeGreaterThanOrEqual(2);
      expect(recommendation.notes.some(n => n.includes("Machine:"))).toBe(true);
      expect(recommendation.notes.some(n => n.includes("Controller:"))).toBe(true);
    });
  });

  describe("validateMachineCapability()", () => {
    it("validates basic turning operations for all lathes", () => {
      const basicOps: LatheOperationType[] = ["turning", "facing", "drilling", "boring", "parting"];

      for (const op of basicOps) {
        const validation = latheMasterPostRouterEngine.validateMachineCapability("LTH-01", op);

        expect(validation.capable).toBe(true);
        expect(validation.confidence).toBeGreaterThanOrEqual(0.95);
      }
    });

    it("validates multi_op only for machines with live tooling", () => {
      const withLiveTooling = latheMasterPostRouterEngine.validateMachineCapability("LTH-01", "multi_op");
      const withoutLiveTooling = latheMasterPostRouterEngine.validateMachineCapability("LTH-03", "multi_op");

      expect(withLiveTooling.capable).toBe(true);
      expect(withLiveTooling.confidence).toBeGreaterThan(withoutLiveTooling.confidence);
    });

    it("returns not capable for unknown machines", () => {
      const validation = latheMasterPostRouterEngine.validateMachineCapability("FAKE-99", "turning");

      expect(validation.capable).toBe(false);
      expect(validation.confidence).toBe(0);
      expect(validation.notes.some(n => n.includes("not found"))).toBe(true);
    });
  });

  describe("G-code Output", () => {
    it("generates G-code with non-zero block count", () => {
      const request = createBaseRequest();
      const result = latheMasterPostRouterEngine.route(request);

      expect(result.block_count).toBeGreaterThan(0);
      expect(result.gcode.length).toBeGreaterThan(0);
    });

    it("marks result as success for valid input", () => {
      const request = createBaseRequest({ program_number: 9999 });
      const result = latheMasterPostRouterEngine.route(request);

      expect(result.success).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("handles empty moves array gracefully", () => {
      const request = createBaseRequest({ moves: [] });
      const result = latheMasterPostRouterEngine.route(request);

      expect(result.success).toBeDefined();
      expect(result.errors.length).toBeGreaterThanOrEqual(0);
    });

    it("handles all operation types without throwing", () => {
      const operations: LatheOperationType[] = [
        "turning", "facing", "grooving", "threading", "drilling",
        "boring", "parting", "tapping", "profiling", "contouring", "multi_op"
      ];

      for (const op of operations) {
        const request = createBaseRequest({ operation: op });
        expect(() => latheMasterPostRouterEngine.route(request)).not.toThrow();
      }
    });
  });
});
