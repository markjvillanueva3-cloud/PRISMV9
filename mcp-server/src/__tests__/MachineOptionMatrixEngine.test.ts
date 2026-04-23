/**
 * MCAT-MS0 P1-U03: Machine Option Matrix Engine Tests
 */
import { describe, it, expect } from "vitest";
import { machineOptionMatrixEngine } from "../engines/MachineOptionMatrixEngine.js";

describe("MachineOptionMatrixEngine", () => {
  describe("getMatrix", () => {
    it("should return matrix for Okuma LB3000", () => {
      const matrix = machineOptionMatrixEngine.getMatrix("okuma_lb3000_ex_ii");
      expect(matrix).toBeDefined();
      expect(matrix?.manufacturer).toBe("Okuma");
      expect(matrix?.model).toBe("LB3000 EX II");
      expect(matrix?.machineType).toBe("lathe");
    });

    it("should return matrix for Haas VF-2SS", () => {
      const matrix = machineOptionMatrixEngine.getMatrix("haas_vf2ss");
      expect(matrix).toBeDefined();
      expect(matrix?.manufacturer).toBe("Haas");
      expect(matrix?.machineType).toBe("mill");
    });

    it("should return matrix for Mitsubishi Wire EDM", () => {
      const matrix = machineOptionMatrixEngine.getMatrix("mitsubishi_mv1200r");
      expect(matrix).toBeDefined();
      expect(matrix?.machineType).toBe("edm");
      expect(matrix?.spindles.length).toBe(0); // EDM has no spindle
    });

    it("should return undefined for unknown machine", () => {
      const matrix = machineOptionMatrixEngine.getMatrix("unknown_machine");
      expect(matrix).toBeUndefined();
    });
  });

  describe("getAllMatrices", () => {
    it("should return all registered matrices", () => {
      const matrices = machineOptionMatrixEngine.getAllMatrices();
      expect(matrices.length).toBeGreaterThan(0);
      expect(matrices.some(m => m.manufacturer === "Okuma")).toBe(true);
      expect(matrices.some(m => m.manufacturer === "Haas")).toBe(true);
    });
  });

  describe("getMachinesByType", () => {
    it("should return lathes", () => {
      const lathes = machineOptionMatrixEngine.getMachinesByType("lathe");
      expect(lathes.length).toBeGreaterThan(0);
      expect(lathes.every(m => m.machineType === "lathe")).toBe(true);
    });

    it("should return mills", () => {
      const mills = machineOptionMatrixEngine.getMachinesByType("mill");
      expect(mills.length).toBeGreaterThan(0);
      expect(mills.every(m => m.machineType === "mill")).toBe(true);
    });

    it("should return EDMs", () => {
      const edms = machineOptionMatrixEngine.getMachinesByType("edm");
      expect(edms.length).toBeGreaterThan(0);
    });
  });

  describe("getMachinesByManufacturer", () => {
    it("should return Okuma machines", () => {
      const okumas = machineOptionMatrixEngine.getMachinesByManufacturer("Okuma");
      expect(okumas.length).toBeGreaterThan(0);
      expect(okumas.every(m => m.manufacturer === "Okuma")).toBe(true);
    });

    it("should handle case-insensitive search", () => {
      const okumas = machineOptionMatrixEngine.getMachinesByManufacturer("okuma");
      expect(okumas.length).toBeGreaterThan(0);
    });
  });

  describe("validateConfiguration", () => {
    it("should validate correct configuration", () => {
      const result = machineOptionMatrixEngine.validateConfiguration({
        machineId: "okuma_lb3000_ex_ii",
        controllerId: "okuma_osp",
        spindleId: "lb3000_std",
        coolantId: "flood",
      });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("should reject unknown machine", () => {
      const result = machineOptionMatrixEngine.validateConfiguration({
        machineId: "nonexistent_machine",
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe("UNKNOWN_MACHINE");
    });

    it("should reject invalid controller", () => {
      const result = machineOptionMatrixEngine.validateConfiguration({
        machineId: "okuma_lb3000_ex_ii",
        controllerId: "fanuc_31i", // Not available on Okuma
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === "INVALID_CONTROLLER")).toBe(true);
    });

    it("should reject invalid spindle", () => {
      const result = machineOptionMatrixEngine.validateConfiguration({
        machineId: "okuma_lb3000_ex_ii",
        spindleId: "invalid_spindle",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === "INVALID_SPINDLE")).toBe(true);
    });

    it("should reject invalid coolant", () => {
      const result = machineOptionMatrixEngine.validateConfiguration({
        machineId: "okuma_lb3000_ex_ii",
        coolantId: "cryogenic", // Not available
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === "INVALID_COOLANT")).toBe(true);
    });

    it("should reject incompatible spindle-coolant combination", () => {
      const result = machineOptionMatrixEngine.validateConfiguration({
        machineId: "okuma_lb3000_ex_ii",
        spindleId: "lb3000_std", // Belt-driven
        coolantId: "through_spindle", // Requires direct-drive
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === "INCOMPATIBLE_OPTIONS" || e.code === "COOLANT_SPINDLE_MISMATCH")).toBe(true);
    });

    it("should allow compatible spindle-coolant combination", () => {
      const result = machineOptionMatrixEngine.validateConfiguration({
        machineId: "okuma_lb3000_ex_ii",
        spindleId: "lb3000_hs", // Direct-drive
        coolantId: "through_spindle", // Compatible
      });
      expect(result.valid).toBe(true);
    });

    it("should reject invalid capability", () => {
      const result = machineOptionMatrixEngine.validateConfiguration({
        machineId: "haas_vf2ss",
        capabilities: ["invalid_cap"],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === "INVALID_CAPABILITY")).toBe(true);
    });

    it("should provide suggested fixes", () => {
      const result = machineOptionMatrixEngine.validateConfiguration({
        machineId: "okuma_lb3000_ex_ii",
        controllerId: "fanuc_31i",
      });
      expect(result.suggestedFixes).toBeDefined();
      expect(result.suggestedFixes!.length).toBeGreaterThan(0);
      expect(result.suggestedFixes![0].field).toBe("controllerId");
    });

    it("should include dependency warnings", () => {
      const result = machineOptionMatrixEngine.validateConfiguration({
        machineId: "dmg_nlx2500",
        capabilities: ["live_tooling"], // Benefits from Y-axis
      });
      expect(result.warnings.some(w => w.code === "DEPENDENCY_RECOMMENDATION")).toBe(true);
    });
  });

  describe("getAvailableOptions", () => {
    it("should return all options without selection", () => {
      const options = machineOptionMatrixEngine.getAvailableOptions("okuma_lb3000_ex_ii");
      expect(options).toBeDefined();
      expect(options!.controllers.length).toBe(2);
      expect(options!.spindles.length).toBe(2);
      expect(options!.coolants.length).toBe(2);
      expect(options!.filteredBySelection).toBe(false);
    });

    it("should filter coolants based on spindle selection", () => {
      const options = machineOptionMatrixEngine.getAvailableOptions("okuma_lb3000_ex_ii", {
        spindleId: "lb3000_std", // Belt-driven
      });
      expect(options).toBeDefined();
      expect(options!.filteredBySelection).toBe(true);
      // Through-spindle coolant should be filtered out
      expect(options!.coolants.some(c => c.coolantId === "through_spindle")).toBe(false);
    });

    it("should keep compatible coolants for direct-drive spindle", () => {
      const options = machineOptionMatrixEngine.getAvailableOptions("okuma_lb3000_ex_ii", {
        spindleId: "lb3000_hs", // Direct-drive
      });
      expect(options).toBeDefined();
      expect(options!.coolants.some(c => c.coolantId === "through_spindle")).toBe(true);
    });

    it("should return undefined for unknown machine", () => {
      const options = machineOptionMatrixEngine.getAvailableOptions("unknown_machine");
      expect(options).toBeUndefined();
    });
  });

  describe("getDefaultConfiguration", () => {
    it("should return defaults for Okuma LB3000", () => {
      const defaults = machineOptionMatrixEngine.getDefaultConfiguration("okuma_lb3000_ex_ii");
      expect(defaults).toBeDefined();
      expect(defaults!.controllerId).toBe("okuma_osp");
      expect(defaults!.spindleId).toBe("lb3000_std");
      expect(defaults!.coolantId).toBe("flood");
      expect(defaults!.capabilities).toContain("y_axis");
    });

    it("should return defaults for Haas VF-2SS", () => {
      const defaults = machineOptionMatrixEngine.getDefaultConfiguration("haas_vf2ss");
      expect(defaults).toBeDefined();
      expect(defaults!.controllerId).toBe("haas_ngc");
      expect(defaults!.capabilities).toContain("3_axis");
    });

    it("should return undefined for unknown machine", () => {
      const defaults = machineOptionMatrixEngine.getDefaultConfiguration("unknown");
      expect(defaults).toBeUndefined();
    });
  });

  describe("calculatePriceAdder", () => {
    it("should return zero for default configuration", () => {
      const price = machineOptionMatrixEngine.calculatePriceAdder({
        machineId: "okuma_lb3000_ex_ii",
        controllerId: "okuma_osp",
        spindleId: "lb3000_std",
        coolantId: "flood",
        capabilities: ["y_axis", "live_tooling", "bar_feeder"],
      });
      expect(price.total).toBe(0);
    });

    it("should calculate price for optional upgrades", () => {
      const price = machineOptionMatrixEngine.calculatePriceAdder({
        machineId: "okuma_lb3000_ex_ii",
        controllerId: "okuma_osp_p500", // +15000
        spindleId: "lb3000_hs", // +8000
        coolantId: "through_spindle", // +12000
        capabilities: ["sub_spindle"], // +45000
      });
      expect(price.total).toBe(15000 + 8000 + 12000 + 45000);
      expect(Object.keys(price.breakdown).length).toBe(4);
    });

    it("should handle Haas optional features", () => {
      const price = machineOptionMatrixEngine.calculatePriceAdder({
        machineId: "haas_vf2ss",
        controllerId: "haas_ngc",
        coolantId: "through_spindle", // +4995
        capabilities: ["4th_axis", "probing"], // +9995 + 7995
      });
      expect(price.total).toBe(4995 + 9995 + 7995);
    });

    it("should return zero for unknown machine", () => {
      const price = machineOptionMatrixEngine.calculatePriceAdder({
        machineId: "unknown",
      });
      expect(price.total).toBe(0);
    });
  });

  describe("getStats", () => {
    it("should return statistics", () => {
      const stats = machineOptionMatrixEngine.getStats();
      expect(stats.totalMachines).toBeGreaterThan(0);
      expect(stats.byType).toHaveProperty("lathe");
      expect(stats.byType).toHaveProperty("mill");
      expect(stats.byManufacturer).toHaveProperty("Okuma");
      expect(stats.averageOptions.controllers).toBeGreaterThan(0);
    });
  });

  describe("getSelfAwareness", () => {
    it("should return self-awareness info", () => {
      const awareness = machineOptionMatrixEngine.getSelfAwareness();
      expect(awareness.name).toBe("MachineOptionMatrixEngine");
      expect(awareness.capabilities).toContain("validateConfiguration");
      expect(awareness.capabilities).toContain("getAvailableOptions");
      expect(awareness.registeredMachines).toBeGreaterThan(0);
      expect(awareness.machineTypes.length).toBeGreaterThan(0);
      expect(awareness.manufacturers.length).toBeGreaterThan(0);
    });
  });

  describe("registerMatrix", () => {
    it("should register new machine matrix", () => {
      const newMatrix = {
        machineId: "test_machine_123",
        manufacturer: "TestMfr",
        model: "TEST-100",
        machineType: "mill" as const,
        controllers: [{ controllerId: "test_ctrl", name: "Test Control", isDefault: true, isOptional: false }],
        spindles: [{ spindleId: "test_spindle", type: "direct" as const, maxRpm: 10000, powerKw: 15, isDefault: true, isOptional: false }],
        coolants: [{ coolantId: "flood", type: "flood" as const, isDefault: true, isOptional: false }],
        capabilities: [{ capabilityId: "3_axis", name: "3-Axis", category: "axis" as const, isStandard: true, isOptional: false }],
        incompatibilities: [],
        dependencies: [],
        defaults: { controllerId: "test_ctrl", spindleId: "test_spindle", coolantId: "flood", capabilities: ["3_axis"] },
      };

      machineOptionMatrixEngine.registerMatrix(newMatrix);
      const retrieved = machineOptionMatrixEngine.getMatrix("test_machine_123");
      expect(retrieved).toBeDefined();
      expect(retrieved?.manufacturer).toBe("TestMfr");
    });
  });

  describe("DMG MORI NLX 2500 configurations", () => {
    it("should offer both FANUC and Siemens controllers", () => {
      const matrix = machineOptionMatrixEngine.getMatrix("dmg_nlx2500");
      expect(matrix?.controllers.length).toBe(2);
      expect(matrix?.controllers.some(c => c.controllerId === "fanuc_31i")).toBe(true);
      expect(matrix?.controllers.some(c => c.controllerId === "siemens_840d")).toBe(true);
    });

    it("should validate Siemens controller option", () => {
      const result = machineOptionMatrixEngine.validateConfiguration({
        machineId: "dmg_nlx2500",
        controllerId: "siemens_840d",
      });
      expect(result.valid).toBe(true);
    });

    it("should reject through-spindle coolant with belt spindle", () => {
      const result = machineOptionMatrixEngine.validateConfiguration({
        machineId: "dmg_nlx2500",
        spindleId: "nlx2500_std",
        coolantId: "through_spindle",
      });
      expect(result.valid).toBe(false);
    });

    it("should allow MQL coolant", () => {
      const result = machineOptionMatrixEngine.validateConfiguration({
        machineId: "dmg_nlx2500",
        coolantId: "mql",
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("Mazak QTN-250-II configurations", () => {
    it("should have gear and direct-drive spindle options", () => {
      const matrix = machineOptionMatrixEngine.getMatrix("mazak_qtn250_ii");
      expect(matrix?.spindles.length).toBe(2);
      expect(matrix?.spindles.some(s => s.type === "gear")).toBe(true);
      expect(matrix?.spindles.some(s => s.type === "direct")).toBe(true);
    });

    it("should have steady rest as optional capability", () => {
      const matrix = machineOptionMatrixEngine.getMatrix("mazak_qtn250_ii");
      const steadyRest = matrix?.capabilities.find(c => c.capabilityId === "steady_rest");
      expect(steadyRest).toBeDefined();
      expect(steadyRest?.isOptional).toBe(true);
      expect(steadyRest?.priceAdder).toBe(5500);
    });
  });
});
