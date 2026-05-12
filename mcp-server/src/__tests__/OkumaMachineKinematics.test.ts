/**
 * OkumaMachineKinematics.test.ts — MS3 U-LAT31 Test Suite (T042)
 *
 * Regression guard for Okuma machine kinematics catalog from STEP files.
 * Validates 37 machines loaded correctly with work envelopes, kinematics chains,
 * and simulation model paths.
 */

import { describe, it, expect } from "vitest";
import {
  OKUMA_MACHINES_FROM_STEP,
  findOkumaMachineByModel,
  getOkumaMachinesBySeries,
  getOkumaMachinesByType,
  type OkumaMachineEntry,
} from "../data/okuma-machines-from-step.js";

describe("OkumaMachineKinematics — MS3 Regression Guard", () => {
  // ============================================================================
  // Catalog Loading
  // ============================================================================

  describe("Catalog Loading", () => {
    it("should load 37 Okuma machines from STEP catalog", () => {
      expect(OKUMA_MACHINES_FROM_STEP.length).toBe(37);
    });

    it("should have all required fields for each machine", () => {
      for (const machine of OKUMA_MACHINES_FROM_STEP) {
        expect(machine.model).toBeDefined();
        expect(machine.type).toBeDefined();
        expect(machine.series).toBeDefined();
        expect(machine.step_file).toBeDefined();
        expect(machine.step_file_size_mb).toBeGreaterThan(0);
        expect(machine.work_envelope_mm).toBeDefined();
        expect(machine.spindle).toBeDefined();
        expect(machine.tool_magazine).toBeDefined();
        expect(machine.controller).toBeDefined();
        expect(machine.kinematic_chain).toBeDefined();
        expect(machine.simulation_model_path).toBeDefined();
      }
    });

    it("should have valid work envelope dimensions", () => {
      for (const machine of OKUMA_MACHINES_FROM_STEP) {
        const we = machine.work_envelope_mm;
        expect(we.x_travel).toBeGreaterThan(0);
        expect(we.y_travel).toBeGreaterThan(0);
        expect(we.z_travel).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // Series Coverage
  // ============================================================================

  describe("Series Coverage", () => {
    it("should have GENOS series machines", () => {
      const genos = getOkumaMachinesBySeries("GENOS");
      expect(genos.length).toBeGreaterThanOrEqual(6);
      expect(genos.some(m => m.model.includes("M460"))).toBe(true);
      expect(genos.some(m => m.model.includes("M560"))).toBe(true);
      expect(genos.some(m => m.model.includes("M660"))).toBe(true);
    });

    it("should have MB series machines", () => {
      const mb = getOkumaMachinesBySeries("MB");
      expect(mb.length).toBeGreaterThanOrEqual(6);
      expect(mb.some(m => m.model.includes("MB-5000H"))).toBe(true);
    });

    it("should have MU series 5-axis machines", () => {
      const mu = getOkumaMachinesBySeries("MU");
      expect(mu.length).toBeGreaterThanOrEqual(7);
      // All MU machines should be 5-axis
      for (const m of mu) {
        expect(m.type).toBe("5axis_machining_center");
      }
    });

    it("should have MCR double-column machines", () => {
      const mcr = getOkumaMachinesBySeries("MCR");
      expect(mcr.length).toBeGreaterThanOrEqual(4);
      for (const m of mcr) {
        expect(m.type).toBe("double_column_machining_center");
      }
    });

    it("should have VTM mill-turn centers", () => {
      const vtm = getOkumaMachinesBySeries("VTM");
      expect(vtm.length).toBeGreaterThanOrEqual(3);
      for (const m of vtm) {
        expect(m.type).toBe("mill_turn_center");
      }
    });
  });

  // ============================================================================
  // Type Coverage
  // ============================================================================

  describe("Type Coverage", () => {
    it("should have vertical machining centers", () => {
      const vmc = getOkumaMachinesByType("vertical_machining_center");
      expect(vmc.length).toBeGreaterThan(10);
    });

    it("should have horizontal machining centers", () => {
      const hmc = getOkumaMachinesByType("horizontal_machining_center");
      expect(hmc.length).toBeGreaterThan(5);
    });

    it("should have 5-axis machining centers", () => {
      const fiveAxis = getOkumaMachinesByType("5axis_machining_center");
      expect(fiveAxis.length).toBeGreaterThanOrEqual(8);
    });
  });

  // ============================================================================
  // Model Lookup
  // ============================================================================

  describe("Model Lookup", () => {
    it("should find MU-5000V by exact model", () => {
      const machine = findOkumaMachineByModel("MU-5000V");
      expect(machine).toBeDefined();
      expect(machine?.model).toBe("MU-5000V");
      expect(machine?.type).toBe("5axis_machining_center");
    });

    it("should find MB-5000H with case-insensitive search", () => {
      const machine = findOkumaMachineByModel("mb-5000h");
      expect(machine).toBeDefined();
      expect(machine?.model).toBe("MB-5000H");
    });

    it("should find machine with partial model name", () => {
      const machine = findOkumaMachineByModel("GENOS M460");
      expect(machine).toBeDefined();
      expect(machine?.series).toBe("GENOS");
    });

    it("should return undefined for non-existent model", () => {
      const machine = findOkumaMachineByModel("FAKE-MODEL-999");
      expect(machine).toBeUndefined();
    });
  });

  // ============================================================================
  // Kinematic Chain Validation
  // ============================================================================

  describe("Kinematic Chain Validation", () => {
    it("should have correct axis config for 3-axis VMC", () => {
      const machine = findOkumaMachineByModel("GENOS M560-V-e");
      expect(machine).toBeDefined();
      expect(machine?.kinematic_chain.axis_config).toEqual(["X", "Y", "Z"]);
    });

    it("should have correct axis config for 5-axis", () => {
      const machine = findOkumaMachineByModel("MU-5000V");
      expect(machine).toBeDefined();
      expect(machine?.kinematic_chain.axis_config).toEqual(["X", "Y", "Z", "A", "C"]);
      expect(machine?.kinematic_chain.rotary_axes).toBeDefined();
      expect(machine?.kinematic_chain.rotary_axes?.A).toBeDefined();
      expect(machine?.kinematic_chain.rotary_axes?.C).toBeDefined();
    });

    it("should have correct rotary axis ranges for 5-axis", () => {
      const machine = findOkumaMachineByModel("MU-5000V");
      expect(machine?.kinematic_chain.rotary_axes?.A?.range_min).toBeLessThan(0);
      expect(machine?.kinematic_chain.rotary_axes?.A?.range_max).toBeGreaterThan(0);
      expect(machine?.kinematic_chain.rotary_axes?.C?.range_min).toBe(0);
      expect(machine?.kinematic_chain.rotary_axes?.C?.range_max).toBe(360);
    });

    it("should have VTM mill-turn with B-axis", () => {
      const vtm = findOkumaMachineByModel("VTM-1200YB");
      expect(vtm).toBeDefined();
      expect(vtm?.kinematic_chain.axis_config).toContain("B");
      expect(vtm?.kinematic_chain.axis_config).toContain("C");
    });
  });

  // ============================================================================
  // Spindle Configuration
  // ============================================================================

  describe("Spindle Configuration", () => {
    it("should have valid spindle specs", () => {
      for (const machine of OKUMA_MACHINES_FROM_STEP) {
        expect(machine.spindle.max_rpm).toBeGreaterThan(0);
        expect(machine.spindle.power_kw).toBeGreaterThan(0);
        expect(["direct_drive", "belt_driven", "built_in", "gear_head"]).toContain(machine.spindle.type);
      }
    });

    it("should have HSK taper for high-speed 5-axis", () => {
      const mu5000 = findOkumaMachineByModel("MU-5000V");
      expect(mu5000?.spindle.taper).toBe("HSK63");
    });

    it("should have BT50 for horizontal machining centers", () => {
      const mb5000 = findOkumaMachineByModel("MB-5000H");
      expect(mb5000?.spindle.taper).toBe("BT50");
    });
  });

  // ============================================================================
  // Tool Magazine
  // ============================================================================

  describe("Tool Magazine", () => {
    it("should have valid tool magazine specs", () => {
      for (const machine of OKUMA_MACHINES_FROM_STEP) {
        expect(machine.tool_magazine.capacity).toBeGreaterThan(0);
        expect(["arm", "matrix", "chain", "turret", "ring"]).toContain(machine.tool_magazine.type);
      }
    });

    it("should have larger magazines for HMCs", () => {
      const hmc = getOkumaMachinesByType("horizontal_machining_center");
      for (const m of hmc) {
        expect(m.tool_magazine.capacity).toBeGreaterThanOrEqual(40);
      }
    });
  });

  // ============================================================================
  // Controller Assignment
  // ============================================================================

  describe("Controller Assignment", () => {
    it("should have valid OSP controller codes", () => {
      const validControllers = [
        "OSP-P300", "OSP-P200", "OSP-P500",
        "OSP-P300L", "OSP-P300M", "OSP-P300MA",
        "OSP-P300S", "OSP-P300SA"
      ];
      for (const machine of OKUMA_MACHINES_FROM_STEP) {
        expect(validControllers).toContain(machine.controller);
      }
    });

    it("should use OSP-P300MA for 5-axis machines", () => {
      const fiveAxis = getOkumaMachinesByType("5axis_machining_center");
      for (const m of fiveAxis) {
        expect(m.controller).toBe("OSP-P300MA");
      }
    });
  });

  // ============================================================================
  // Simulation Model Paths
  // ============================================================================

  describe("Simulation Model Paths", () => {
    it("should have unique simulation model paths", () => {
      const paths = new Set<string>();
      for (const machine of OKUMA_MACHINES_FROM_STEP) {
        expect(paths.has(machine.simulation_model_path)).toBe(false);
        paths.add(machine.simulation_model_path);
      }
    });

    it("should follow MACHINE_SIMULATION_MODELS/OKUMA/ prefix", () => {
      for (const machine of OKUMA_MACHINES_FROM_STEP) {
        expect(machine.simulation_model_path.startsWith("MACHINE_SIMULATION_MODELS/OKUMA/")).toBe(true);
      }
    });
  });
});
