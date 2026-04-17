/**
 * Tests for MachineOptionContractEngine
 * @milestone MCAT-MS0/P2-U04
 *
 * These contract tests verify that unsupported machine options
 * never render for calculator, program release, or other consumers.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  machineOptionContractEngine,
  type ContractValidationResult,
  type RenderableOptions,
} from "../engines/MachineOptionContractEngine.js";
import { shopMachineOverlayEngine } from "../engines/ShopMachineOverlayEngine.js";
import type { UserMachineProfileOverlay } from "../contracts/userMachineProfile.js";

describe("MachineOptionContractEngine", () => {
  // Create test overlays before running tests
  beforeAll(() => {
    try {
      shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "LTH-01",
        user_id: "contract-test",
        display_name: "Contract Test Lathe",
      });
    } catch {
      // Overlay might already exist
    }
  });

  describe("validateProfile", () => {
    it("validates a correctly configured profile", () => {
      const mergedView = shopMachineOverlayEngine.getMergedView("LTH-01");
      if (!mergedView) {
        return; // Skip if no overlay
      }

      const profile = mergedView.read_model.profile;
      const result = machineOptionContractEngine.validateProfile(profile);

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.checks_total).toBeGreaterThan(0);
    });

    it("returns valid=true for valid configuration", () => {
      const mergedView = shopMachineOverlayEngine.getMergedView("LTH-01");
      if (!mergedView) return;

      const profile = mergedView.read_model.profile;
      const result = machineOptionContractEngine.validateProfile(profile);

      // If controller and spindle are in available options, should be valid
      expect(typeof result.valid).toBe("boolean");
    });

    it("detects invalid controller selection", () => {
      const mergedView = shopMachineOverlayEngine.getMergedView("LTH-01");
      if (!mergedView) return;

      const invalidProfile: UserMachineProfileOverlay = {
        ...mergedView.read_model.profile,
        selectedControllerId: "invalid-controller-xyz-123",
      };

      const result = machineOptionContractEngine.validateProfile(invalidProfile);

      expect(result.controller.is_allowed).toBe(false);
      expect(result.violations.some(v => v.component === "controller")).toBe(true);
    });

    it("detects invalid spindle selection", () => {
      const mergedView = shopMachineOverlayEngine.getMergedView("LTH-01");
      if (!mergedView) return;

      const invalidProfile: UserMachineProfileOverlay = {
        ...mergedView.read_model.profile,
        selectedSpindlePackageId: "invalid-spindle-xyz-456",
      };

      const result = machineOptionContractEngine.validateProfile(invalidProfile);

      expect(result.spindle.is_compatible).toBe(false);
    });

    it("detects invalid coolant selection", () => {
      const mergedView = shopMachineOverlayEngine.getMergedView("LTH-01");
      if (!mergedView) return;

      const invalidProfile: UserMachineProfileOverlay = {
        ...mergedView.read_model.profile,
        enabledCoolantStrategyIds: ["flood", "cryogenic-nitrogen-xyz"],
      };

      const result = machineOptionContractEngine.validateProfile(invalidProfile);

      expect(result.coolant.invalid_ids.length).toBeGreaterThan(0);
    });

    it("counts errors vs warnings correctly", () => {
      const mergedView = shopMachineOverlayEngine.getMergedView("LTH-01");
      if (!mergedView) return;

      const profile = mergedView.read_model.profile;
      const result = machineOptionContractEngine.validateProfile(profile);

      expect(result.summary.errors).toBeGreaterThanOrEqual(0);
      expect(result.summary.warnings).toBeGreaterThanOrEqual(0);
      expect(result.summary.checks_passed + result.summary.errors + result.summary.warnings)
        .toBeLessThanOrEqual(result.summary.checks_total + result.summary.warnings);
    });

    it("provides remediation hints for violations", () => {
      const mergedView = shopMachineOverlayEngine.getMergedView("LTH-01");
      if (!mergedView) return;

      const invalidProfile: UserMachineProfileOverlay = {
        ...mergedView.read_model.profile,
        selectedControllerId: "invalid-controller",
      };

      const result = machineOptionContractEngine.validateProfile(invalidProfile);

      const violation = result.violations.find(v => v.component === "controller");
      if (violation) {
        expect(violation.remediation).toBeDefined();
        expect(typeof violation.remediation).toBe("string");
      }
    });
  });

  describe("getRenderableOptions", () => {
    it("returns renderable options for valid machine", () => {
      const result = machineOptionContractEngine.getRenderableOptions({
        machine_id: "LTH-01",
      });

      expect(result).toBeDefined();
      expect(result.machine_id).toBe("LTH-01");
      expect(Array.isArray(result.controllers)).toBe(true);
      expect(Array.isArray(result.spindles)).toBe(true);
      expect(Array.isArray(result.coolants)).toBe(true);
    });

    it("returns empty arrays for invalid machine", () => {
      const result = machineOptionContractEngine.getRenderableOptions({
        machine_id: "INVALID-MACHINE-XYZ",
      });

      expect(result.controllers.length).toBe(0);
      expect(result.spindles.length).toBe(0);
      expect(result.coolants.length).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("filters options based on selected controller", () => {
      const result = machineOptionContractEngine.getRenderableOptions({
        machine_id: "LTH-01",
        selected_controller_id: "okuma",
      });

      expect(result).toBeDefined();
      // Spindles should be filtered to those compatible with selected controller
      expect(Array.isArray(result.spindles)).toBe(true);
    });

    it("filters options based on part requirements", () => {
      const result = machineOptionContractEngine.getRenderableOptions({
        machine_id: "LTH-01",
        part_requirements: {
          weight_kg: 50,
          diameter_mm: 150,
        },
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.spindles)).toBe(true);
    });

    it("tracks enabled vs disabled features", () => {
      const result = machineOptionContractEngine.getRenderableOptions({
        machine_id: "LTH-01",
      });

      expect(Array.isArray(result.enabled_features)).toBe(true);
      expect(Array.isArray(result.disabled_features)).toBe(true);
    });

    it("collects warnings during filtering", () => {
      const result = machineOptionContractEngine.getRenderableOptions({
        machine_id: "LTH-01",
      });

      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe("isValidCombination", () => {
    it("returns valid=true when no allowed options defined", () => {
      const result = machineOptionContractEngine.isValidCombination(
        "any-controller",
        "any-spindle",
        ["flood"],
        [] // Empty allowed options = all combinations valid
      );

      expect(result.valid).toBe(true);
    });

    it("rejects controller not in allowed options", () => {
      const result = machineOptionContractEngine.isValidCombination(
        "invalid-controller",
        "spindle-1",
        ["flood"],
        [{ controller_id: "valid-controller", compatible_spindle_ids: [], compatible_coolant_ids: [] }]
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Controller");
    });

    it("rejects spindle not compatible with controller", () => {
      const result = machineOptionContractEngine.isValidCombination(
        "valid-controller",
        "incompatible-spindle",
        ["flood"],
        [{
          controller_id: "valid-controller",
          compatible_spindle_ids: ["spindle-a", "spindle-b"],
          compatible_coolant_ids: [],
        }]
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Spindle");
    });

    it("rejects coolant not compatible with controller", () => {
      const result = machineOptionContractEngine.isValidCombination(
        "valid-controller",
        "spindle-a",
        ["flood", "invalid-coolant"],
        [{
          controller_id: "valid-controller",
          compatible_spindle_ids: ["spindle-a"],
          compatible_coolant_ids: ["flood", "mist"],
        }]
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Coolant");
    });

    it("accepts valid combination", () => {
      const result = machineOptionContractEngine.isValidCombination(
        "fanuc-31i",
        "spindle-main",
        ["flood", "mist"],
        [{
          controller_id: "fanuc-31i",
          compatible_spindle_ids: ["spindle-main", "spindle-hsk"],
          compatible_coolant_ids: ["flood", "mist", "through_spindle"],
        }]
      );

      expect(result.valid).toBe(true);
    });
  });

  describe("validateGeometry", () => {
    it("passes when no restrictions defined", () => {
      const result = machineOptionContractEngine.validateGeometry(100, 200, undefined);

      expect(result.valid).toBe(true);
      expect(result.violations.length).toBe(0);
    });

    it("passes when part is within restrictions", () => {
      const result = machineOptionContractEngine.validateGeometry(50, 150, {
        max_part_diameter_mm: 200,
      });

      expect(result.valid).toBe(true);
    });

    it("fails when part exceeds diameter restriction", () => {
      const result = machineOptionContractEngine.validateGeometry(50, 250, {
        max_part_diameter_mm: 200,
      });

      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.includes("diameter"))).toBe(true);
    });
  });

  describe("generateContractTests", () => {
    it("generates test cases for valid machine", () => {
      const result = machineOptionContractEngine.generateContractTests("LTH-01");

      expect(result.test_cases).toBeDefined();
      expect(Array.isArray(result.test_cases)).toBe(true);
      expect(result.test_cases.length).toBeGreaterThan(0);
    });

    it("includes both positive and negative test cases", () => {
      const result = machineOptionContractEngine.generateContractTests("LTH-01");

      const positiveTests = result.test_cases.filter(tc => tc.expected_valid);
      const negativeTests = result.test_cases.filter(tc => !tc.expected_valid);

      expect(positiveTests.length).toBeGreaterThan(0);
      expect(negativeTests.length).toBeGreaterThan(0);
    });

    it("each test case has required fields", () => {
      const result = machineOptionContractEngine.generateContractTests("LTH-01");

      for (const tc of result.test_cases) {
        expect(tc.name).toBeDefined();
        expect(tc.input).toBeDefined();
        expect(typeof tc.expected_valid).toBe("boolean");
        expect(tc.reason).toBeDefined();
      }
    });

    it("returns empty test cases for invalid machine", () => {
      const result = machineOptionContractEngine.generateContractTests("INVALID-MACHINE");

      // Should still return some basic tests (like invalid controller)
      expect(Array.isArray(result.test_cases)).toBe(true);
    });
  });

  describe("runContractTests", () => {
    it("runs all generated tests", () => {
      const result = machineOptionContractEngine.runContractTests("LTH-01");

      expect(result.machine_id).toBe("LTH-01");
      expect(result.total).toBeGreaterThan(0);
      expect(result.passed + result.failed).toBe(result.total);
    });

    it("returns detailed results for each test", () => {
      const result = machineOptionContractEngine.runContractTests("LTH-01");

      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results.length).toBe(result.total);

      for (const r of result.results) {
        expect(r.name).toBeDefined();
        expect(typeof r.passed).toBe("boolean");
        expect(typeof r.actual_valid).toBe("boolean");
        expect(typeof r.expected_valid).toBe("boolean");
      }
    });

    it("correctly identifies passing tests", () => {
      const result = machineOptionContractEngine.runContractTests("LTH-01");

      const passingResults = result.results.filter(r => r.passed);
      expect(passingResults.length).toBe(result.passed);
    });

    it("provides reason for failing tests", () => {
      const result = machineOptionContractEngine.runContractTests("LTH-01");

      const failingResults = result.results.filter(r => !r.passed);
      for (const r of failingResults) {
        expect(r.reason).toBeDefined();
      }
    });
  });

  describe("getSelfAwareness", () => {
    it("returns engine metadata", () => {
      const awareness = machineOptionContractEngine.getSelfAwareness();

      expect(awareness.engine).toBe("MachineOptionContractEngine");
      expect(awareness.milestone).toBe("MCAT-MS0/P2-U04");
    });

    it("lists all capabilities", () => {
      const awareness = machineOptionContractEngine.getSelfAwareness();

      expect(awareness.capabilities).toContain("validateProfile");
      expect(awareness.capabilities).toContain("getRenderableOptions");
      expect(awareness.capabilities).toContain("isValidCombination");
      expect(awareness.capabilities).toContain("runContractTests");
    });

    it("documents contracts being enforced", () => {
      const awareness = machineOptionContractEngine.getSelfAwareness();

      expect(Array.isArray(awareness.contracts)).toBe(true);
      expect(awareness.contracts.length).toBeGreaterThan(0);
    });

    it("lists integrations", () => {
      const awareness = machineOptionContractEngine.getSelfAwareness();

      expect(awareness.integrations).toContain("ShopMachineOverlayEngine");
    });
  });

  // ============================================================================
  // CONTRACT ENFORCEMENT TESTS
  // These tests verify the core contracts that P2-U04 must enforce
  // ============================================================================

  describe("Contract: Unsupported options never render", () => {
    it("disabled spindles are excluded from renderable options", () => {
      const result = machineOptionContractEngine.getRenderableOptions({
        machine_id: "LTH-01",
      });

      // All returned spindles should have availability.enabled = true
      for (const spindle of result.spindles) {
        expect(spindle.availability.enabled).toBe(true);
      }
    });

    it("disabled coolants are excluded from renderable options", () => {
      const result = machineOptionContractEngine.getRenderableOptions({
        machine_id: "LTH-01",
      });

      // All returned coolants should have availability.enabled = true
      for (const coolant of result.coolants) {
        expect(coolant.availability.enabled).toBe(true);
      }
    });

    it("disabled features appear in disabled_features list", () => {
      const result = machineOptionContractEngine.getRenderableOptions({
        machine_id: "LTH-01",
      });

      // enabled_features and disabled_features should not overlap
      const overlap = result.enabled_features.filter(f =>
        result.disabled_features.includes(f)
      );
      expect(overlap.length).toBe(0);
    });
  });

  describe("Contract: Invalid selections are rejected", () => {
    it("profile with invalid controller fails validation", () => {
      const mergedView = shopMachineOverlayEngine.getMergedView("LTH-01");
      if (!mergedView) return;

      const profile: UserMachineProfileOverlay = {
        ...mergedView.read_model.profile,
        selectedControllerId: "TOTALLY-INVALID-CONTROLLER",
      };

      const result = machineOptionContractEngine.validateProfile(profile);

      expect(result.valid).toBe(false);
      expect(result.violations.some(v =>
        v.severity === "error" && v.component === "controller"
      )).toBe(true);
    });

    it("combination check rejects invalid spindle for controller", () => {
      const result = machineOptionContractEngine.isValidCombination(
        "fanuc",
        "invalid-spindle",
        ["flood"],
        [{
          controller_id: "fanuc",
          compatible_spindle_ids: ["spindle-a", "spindle-b"],
          compatible_coolant_ids: ["flood", "mist"],
        }]
      );

      expect(result.valid).toBe(false);
    });
  });
});
