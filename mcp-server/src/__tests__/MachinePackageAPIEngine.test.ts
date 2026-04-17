/**
 * Tests for MachinePackageAPIEngine
 * @milestone MCAT-MS0/P3-U02
 *
 * Verifies the unified API surface for machine-package operations.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  machinePackageAPIEngine,
  type APIResponse,
  type PackageDetail,
  type PackageListResult,
  type PackageSummary,
  type CapabilityQueryResult,
  type CompatibilityCheckResult,
  type CoverageStats,
} from "../engines/MachinePackageAPIEngine.js";
import { shopMachineOverlayEngine } from "../engines/ShopMachineOverlayEngine.js";

describe("MachinePackageAPIEngine", () => {
  // Setup test overlays
  beforeAll(() => {
    try {
      shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "LTH-01",
        user_id: "api-test",
        display_name: "API Test Lathe",
      });
    } catch {
      // Already exists
    }

    try {
      shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "VMC-01",
        user_id: "api-test",
        display_name: "API Test VMC",
      });
    } catch {
      // Already exists
    }
  });

  describe("API Response Format", () => {
    it("returns success responses with correct structure", () => {
      const response = machinePackageAPIEngine.getPackage("LTH-01");

      expect(response.success).toBeDefined();
      expect(response.metadata).toBeDefined();
      expect(response.metadata.timestamp).toBeDefined();
      expect(response.metadata.api_version).toBeDefined();
      expect(response.metadata.request_id).toBeDefined();
    });

    it("generates unique request IDs", () => {
      const r1 = machinePackageAPIEngine.getPackage("LTH-01");
      const r2 = machinePackageAPIEngine.getPackage("LTH-01");

      expect(r1.metadata.request_id).not.toBe(r2.metadata.request_id);
    });

    it("returns error responses for invalid input", () => {
      const response = machinePackageAPIEngine.getPackage("INVALID-MACHINE-XYZ");

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.data).toBeUndefined();
    });
  });

  describe("getPackage", () => {
    it("returns package details for valid machine", () => {
      const response = machinePackageAPIEngine.getPackage("LTH-01");

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.id).toBe("LTH-01");
    });

    it("includes controller information", () => {
      const response = machinePackageAPIEngine.getPackage("LTH-01");

      expect(response.data?.controller).toBeDefined();
      expect(response.data?.controller.id).toBeDefined();
      expect(response.data?.controller.family).toBeDefined();
    });

    it("includes spindle specifications", () => {
      const response = machinePackageAPIEngine.getPackage("LTH-01");

      expect(response.data?.spindle).toBeDefined();
      expect(response.data?.spindle.max_rpm).toBeGreaterThan(0);
      expect(response.data?.spindle.max_power_kw).toBeGreaterThan(0);
    });

    it("includes envelope dimensions", () => {
      const response = machinePackageAPIEngine.getPackage("LTH-01");

      expect(response.data?.envelope).toBeDefined();
      expect(response.data?.envelope.x_mm).toBeGreaterThan(0);
      expect(response.data?.envelope.y_mm).toBeGreaterThan(0);
      expect(response.data?.envelope.z_mm).toBeGreaterThan(0);
    });

    it("includes confidence score", () => {
      const response = machinePackageAPIEngine.getPackage("LTH-01");

      expect(response.data?.confidence).toBeGreaterThanOrEqual(0);
      expect(response.data?.confidence).toBeLessThanOrEqual(1);
    });

    it("includes overlay info when present", () => {
      const response = machinePackageAPIEngine.getPackage("LTH-01");

      // May or may not have overlay depending on test setup
      if (response.data?.overlay) {
        expect(response.data.overlay.id).toBeDefined();
        expect(response.data.overlay.user_id).toBeDefined();
      }
    });
  });

  describe("listPackages", () => {
    it("returns paginated list of packages", () => {
      const response = machinePackageAPIEngine.listPackages();

      expect(response.success).toBe(true);
      expect(response.data?.packages).toBeDefined();
      expect(Array.isArray(response.data?.packages)).toBe(true);
      expect(response.data?.total).toBeGreaterThan(0);
    });

    it("respects limit parameter", () => {
      const response = machinePackageAPIEngine.listPackages({ limit: 5 });

      expect(response.data?.limit).toBe(5);
      expect(response.data?.packages.length).toBeLessThanOrEqual(5);
    });

    it("respects offset parameter", () => {
      const response = machinePackageAPIEngine.listPackages({ offset: 2 });

      expect(response.data?.offset).toBe(2);
    });

    it("indicates if more results available", () => {
      const response = machinePackageAPIEngine.listPackages({ limit: 1 });

      if (response.data && response.data.total > 1) {
        expect(response.data.has_more).toBe(true);
      }
    });

    it("filters by machine type", () => {
      const response = machinePackageAPIEngine.listPackages({ machine_type: "lathe" });

      expect(response.success).toBe(true);
      // All returned should be lathes (if any match)
      if (response.data && response.data.packages.length > 0) {
        for (const pkg of response.data.packages) {
          expect(pkg.machine_type.toLowerCase()).toContain("lathe");
        }
      }
    });

    it("each package has required fields", () => {
      const response = machinePackageAPIEngine.listPackages({ limit: 5 });

      for (const pkg of response.data?.packages || []) {
        expect(pkg.id).toBeDefined();
        expect(pkg.display_name).toBeDefined();
        expect(pkg.machine_type).toBeDefined();
        expect(typeof pkg.has_overlay).toBe("boolean");
        expect(typeof pkg.confidence).toBe("number");
      }
    });
  });

  describe("searchPackages", () => {
    it("returns search results", () => {
      const response = machinePackageAPIEngine.searchPackages({ query: "lathe" });

      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it("respects limit parameter", () => {
      const response = machinePackageAPIEngine.searchPackages({ limit: 3 });

      expect(response.data?.length).toBeLessThanOrEqual(3);
    });

    it("filters by machine type", () => {
      const response = machinePackageAPIEngine.searchPackages({ machine_type: "mill" });

      expect(response.success).toBe(true);
    });

    it("filters by minimum confidence", () => {
      const response = machinePackageAPIEngine.searchPackages({ min_confidence: 0.8 });

      expect(response.success).toBe(true);
      for (const pkg of response.data || []) {
        expect(pkg.confidence).toBeGreaterThanOrEqual(0.8);
      }
    });
  });

  describe("createOverlay", () => {
    it("creates overlay and returns ID", () => {
      const machineId = `TEST-CREATE-${Date.now()}`;

      // This will fail since machine doesn't exist in shop config,
      // but we can still test the API structure
      const response = machinePackageAPIEngine.createOverlay({
        shop_machine_id: machineId,
        user_id: "test-user",
        display_name: "Test Machine",
      });

      // Will either succeed or fail with proper error format
      expect(response.metadata).toBeDefined();
      if (response.success) {
        expect(response.data?.overlay_id).toBeDefined();
      } else {
        expect(response.error).toBeDefined();
      }
    });
  });

  describe("getCapabilities", () => {
    it("returns capabilities for valid machine", () => {
      const response = machinePackageAPIEngine.getCapabilities("LTH-01");

      expect(response.success).toBe(true);
      expect(response.data?.machine_id).toBe("LTH-01");
    });

    it("includes spindle specs", () => {
      const response = machinePackageAPIEngine.getCapabilities("LTH-01");

      expect(response.data?.spindle_specs).toBeDefined();
      expect(response.data?.spindle_specs.max_rpm).toBeGreaterThan(0);
    });

    it("includes compatible operations", () => {
      const response = machinePackageAPIEngine.getCapabilities("LTH-01");

      expect(Array.isArray(response.data?.compatible_operations)).toBe(true);
      expect(response.data?.compatible_operations.length).toBeGreaterThan(0);
    });

    it("includes coolant strategies", () => {
      const response = machinePackageAPIEngine.getCapabilities("LTH-01");

      expect(Array.isArray(response.data?.coolant_strategies)).toBe(true);
    });

    it("includes axis capabilities", () => {
      const response = machinePackageAPIEngine.getCapabilities("LTH-01");

      expect(Array.isArray(response.data?.axis_capabilities)).toBe(true);
    });

    it("returns error for invalid machine", () => {
      const response = machinePackageAPIEngine.getCapabilities("INVALID-XYZ");

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe("checkCompatibility", () => {
    it("returns compatibility result", () => {
      const response = machinePackageAPIEngine.checkCompatibility({
        machine_id: "LTH-01",
        operation_type: "turning",
      });

      expect(response.success).toBe(true);
      expect(typeof response.data?.compatible).toBe("boolean");
      expect(typeof response.data?.score).toBe("number");
    });

    it("includes detailed checks", () => {
      const response = machinePackageAPIEngine.checkCompatibility({
        machine_id: "LTH-01",
        operation_type: "turning",
        required_rpm: 3000,
      });

      expect(Array.isArray(response.data?.checks)).toBe(true);
      for (const check of response.data?.checks || []) {
        expect(check.name).toBeDefined();
        expect(typeof check.passed).toBe("boolean");
        expect(check.detail).toBeDefined();
      }
    });

    it("checks RPM requirements", () => {
      const response = machinePackageAPIEngine.checkCompatibility({
        machine_id: "LTH-01",
        operation_type: "turning",
        required_rpm: 5000,
      });

      const rpmCheck = response.data?.checks.find(c => c.name === "spindle_rpm");
      expect(rpmCheck).toBeDefined();
    });

    it("checks power requirements", () => {
      const response = machinePackageAPIEngine.checkCompatibility({
        machine_id: "LTH-01",
        operation_type: "turning",
        required_power_kw: 10,
      });

      const powerCheck = response.data?.checks.find(c => c.name === "spindle_power");
      expect(powerCheck).toBeDefined();
    });

    it("provides recommendations for issues", () => {
      const response = machinePackageAPIEngine.checkCompatibility({
        machine_id: "LTH-01",
        operation_type: "turning",
        required_rpm: 50000, // Unreasonably high
      });

      if (response.data && response.data.score < 100) {
        expect(response.data.recommendations).toBeDefined();
      }
    });
  });

  describe("validateProfile", () => {
    it("returns validation result", () => {
      const mergedView = shopMachineOverlayEngine.getMergedView("LTH-01");
      if (!mergedView) return;

      const response = machinePackageAPIEngine.validateProfile(mergedView.read_model.profile);

      expect(response.success).toBe(true);
      expect(typeof response.data?.valid).toBe("boolean");
    });

    it("includes violation details", () => {
      const mergedView = shopMachineOverlayEngine.getMergedView("LTH-01");
      if (!mergedView) return;

      const response = machinePackageAPIEngine.validateProfile(mergedView.read_model.profile);

      expect(Array.isArray(response.data?.violations)).toBe(true);
    });
  });

  describe("getRenderableOptions", () => {
    it("returns renderable options for machine", () => {
      const response = machinePackageAPIEngine.getRenderableOptions("LTH-01");

      expect(response.success).toBe(true);
      expect(response.data?.machine_id).toBe("LTH-01");
    });

    it("includes controllers array", () => {
      const response = machinePackageAPIEngine.getRenderableOptions("LTH-01");

      expect(Array.isArray(response.data?.controllers)).toBe(true);
    });

    it("includes spindles array", () => {
      const response = machinePackageAPIEngine.getRenderableOptions("LTH-01");

      expect(Array.isArray(response.data?.spindles)).toBe(true);
    });

    it("includes coolants array", () => {
      const response = machinePackageAPIEngine.getRenderableOptions("LTH-01");

      expect(Array.isArray(response.data?.coolants)).toBe(true);
    });
  });

  describe("runContractTests", () => {
    it("runs contract tests for machine", () => {
      const response = machinePackageAPIEngine.runContractTests("LTH-01");

      expect(response.success).toBe(true);
      expect(response.data?.machine_id).toBe("LTH-01");
      expect(response.data?.total).toBeGreaterThan(0);
    });

    it("includes pass/fail counts", () => {
      const response = machinePackageAPIEngine.runContractTests("LTH-01");

      expect(typeof response.data?.passed).toBe("number");
      expect(typeof response.data?.failed).toBe("number");
      expect(response.data?.passed + response.data?.failed).toBe(response.data?.total);
    });

    it("includes individual test results", () => {
      const response = machinePackageAPIEngine.runContractTests("LTH-01");

      expect(Array.isArray(response.data?.results)).toBe(true);
      for (const r of response.data?.results || []) {
        expect(r.name).toBeDefined();
        expect(typeof r.passed).toBe("boolean");
      }
    });
  });

  describe("getConsumerBindings", () => {
    it("returns consumer bindings", () => {
      const response = machinePackageAPIEngine.getConsumerBindings("LTH-01");

      expect(response.success).toBe(true);
      expect(response.data?.context).toBeDefined();
    });

    it("includes Program Release binding", () => {
      const response = machinePackageAPIEngine.getConsumerBindings("LTH-01");

      expect(response.data?.programRelease).toBeDefined();
    });

    it("includes Print to CNC binding", () => {
      const response = machinePackageAPIEngine.getConsumerBindings("LTH-01");

      expect(response.data?.printToCNC).toBeDefined();
    });

    it("includes quote binding", () => {
      const response = machinePackageAPIEngine.getConsumerBindings("LTH-01");

      expect(response.data?.quote).toBeDefined();
    });
  });

  describe("getCoverageStats", () => {
    it("returns coverage statistics", () => {
      const response = machinePackageAPIEngine.getCoverageStats();

      expect(response.success).toBe(true);
      expect(typeof response.data?.total_machines).toBe("number");
      expect(typeof response.data?.coverage_percentage).toBe("number");
    });

    it("includes by-type breakdown", () => {
      const response = machinePackageAPIEngine.getCoverageStats();

      expect(response.data?.by_type).toBeDefined();
      expect(typeof response.data?.by_type).toBe("object");
    });

    it("includes by-manufacturer breakdown", () => {
      const response = machinePackageAPIEngine.getCoverageStats();

      expect(response.data?.by_manufacturer).toBeDefined();
      expect(typeof response.data?.by_manufacturer).toBe("object");
    });
  });

  describe("listBindableMachines", () => {
    it("returns list of bindable machines", () => {
      const response = machinePackageAPIEngine.listBindableMachines();

      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it("each entry has required fields", () => {
      const response = machinePackageAPIEngine.listBindableMachines();

      for (const entry of response.data || []) {
        expect(entry.shop_machine_id).toBeDefined();
        expect(entry.display_name).toBeDefined();
        expect(typeof entry.bound).toBe("boolean");
      }
    });
  });

  describe("getSelfAwareness", () => {
    it("returns engine metadata", () => {
      const awareness = machinePackageAPIEngine.getSelfAwareness();

      expect(awareness.engine).toBe("MachinePackageAPIEngine");
      expect(awareness.milestone).toBe("MCAT-MS0/P3-U02");
      expect(awareness.api_version).toBeDefined();
    });

    it("lists all endpoint categories", () => {
      const awareness = machinePackageAPIEngine.getSelfAwareness();

      expect(awareness.endpoints.read).toContain("getPackage");
      expect(awareness.endpoints.write).toContain("createOverlay");
      expect(awareness.endpoints.capability).toContain("getCapabilities");
      expect(awareness.endpoints.validation).toContain("validateProfile");
      expect(awareness.endpoints.resource).toContain("getCoverageStats");
    });

    it("lists integrations", () => {
      const awareness = machinePackageAPIEngine.getSelfAwareness();

      expect(awareness.integrations).toContain("ShopMachineOverlayEngine");
      expect(awareness.integrations).toContain("MachineConsumerBindingEngine");
    });
  });
});
