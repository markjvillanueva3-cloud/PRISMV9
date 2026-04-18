/**
 * MCAT-MS0 U-MCAT08: Machine Validation Hooks Tests
 *
 * Tests all 5 blocking safety hooks for machine validation:
 * 1. pre-machine-spindle-limits
 * 2. pre-machine-envelope-check
 * 3. pre-machine-power-budget
 * 4. pre-machine-controller-compatibility
 * 5. pre-machine-completeness-gate
 */

import { describe, it, expect } from "vitest";
import {
  machineValidationHooks,
  preMachineSpindleLimits,
  preMachineEnvelopeCheck,
  preMachinePowerBudget,
  preMachineControllerCompatibility,
  preMachineCompletenessGate,
} from "../hooks/MachineValidationHooks.js";
import type { HookContext } from "../engines/HookExecutor.js";

// Helper to create hook context
function makeContext(data: Record<string, any>): HookContext {
  return {
    operation: "test",
    target: { type: "calculation", id: "test", data },
    metadata: {},
  };
}

describe("MachineValidationHooks — MCAT-MS0 U-MCAT08", () => {
  describe("Hook Registry", () => {
    it("exports 5 hooks", () => {
      expect(machineValidationHooks).toHaveLength(5);
    });

    it("all hooks are blocking mode", () => {
      for (const hook of machineValidationHooks) {
        expect(hook.mode).toBe("blocking");
      }
    });

    it("all hooks are critical priority", () => {
      for (const hook of machineValidationHooks) {
        expect(hook.priority).toBe("critical");
      }
    });

    it("all hooks have mcat tag", () => {
      for (const hook of machineValidationHooks) {
        expect(hook.tags).toContain("mcat");
      }
    });
  });

  describe("pre-machine-spindle-limits", () => {
    it("passes when RPM within machine limits", () => {
      const ctx = makeContext({
        spindleRpm: 8000,
        machine: { spindle: { max_rpm: 10000 } },
      });
      const result = preMachineSpindleLimits.handler(ctx);
      expect(result.blocked).toBe(false);
      expect(result.data?.headroom).toBe("20.0%");
    });

    it("BLOCKS when RPM exceeds machine max", () => {
      const ctx = makeContext({
        spindleRpm: 12000,
        machine: { spindle: { max_rpm: 10000 } },
      });
      const result = preMachineSpindleLimits.handler(ctx);
      expect(result.blocked).toBe(true);
      expect(result.message).toContain("SPINDLE OVERSPEED");
      expect(result.data?.issues).toContain(
        "Requested RPM 12000 exceeds machine spindle max 10000 RPM"
      );
    });

    it("BLOCKS when RPM exceeds absolute max (100000)", () => {
      const ctx = makeContext({ spindleRpm: 150000 });
      const result = preMachineSpindleLimits.handler(ctx);
      expect(result.blocked).toBe(true);
      expect(result.data?.issues[0]).toContain("absolute max");
    });

    it("handles machinePackage.spindle structure", () => {
      const ctx = makeContext({
        rpm: 5000,
        machinePackage: { spindle: { max_rpm: 8100 } },
      });
      const result = preMachineSpindleLimits.handler(ctx);
      expect(result.blocked).toBe(false);
    });
  });

  describe("pre-machine-envelope-check", () => {
    it("passes when part fits within envelope", () => {
      const ctx = makeContext({
        part: { length: 200, width: 150, height: 100 },
        machine: {
          envelope: { x_travel: 500, y_travel: 400, z_travel: 300 },
        },
      });
      const result = preMachineEnvelopeCheck.handler(ctx);
      expect(result.blocked).toBe(false);
    });

    it("BLOCKS when part X exceeds X travel", () => {
      const ctx = makeContext({
        part: { length: 600, width: 150, height: 100 },
        machine: {
          envelope: { x_travel: 500, y_travel: 400, z_travel: 300 },
        },
      });
      const result = preMachineEnvelopeCheck.handler(ctx);
      expect(result.blocked).toBe(true);
      expect(result.message).toContain("ENVELOPE VIOLATION");
      expect(result.data?.issues[0]).toContain("Part X (600mm) exceeds X travel (500mm)");
    });

    it("BLOCKS when part weight exceeds table load", () => {
      const ctx = makeContext({
        part: { length: 100, width: 100, height: 50, weight_kg: 500 },
        machine: {
          envelope: {
            x_travel: 500,
            y_travel: 400,
            z_travel: 300,
            max_table_load_kg: 300,
          },
        },
      });
      const result = preMachineEnvelopeCheck.handler(ctx);
      expect(result.blocked).toBe(true);
      expect(result.data?.issues[0]).toContain("weight (500kg) exceeds table load (300kg)");
    });

    it("BLOCKS on multiple envelope violations", () => {
      const ctx = makeContext({
        part: { length: 600, width: 500, height: 400 },
        machine: {
          envelope: { x_travel: 500, y_travel: 400, z_travel: 300 },
        },
      });
      const result = preMachineEnvelopeCheck.handler(ctx);
      expect(result.blocked).toBe(true);
      expect(result.data?.issues.length).toBe(3);
    });
  });

  describe("pre-machine-power-budget", () => {
    it("passes when power/torque within limits", () => {
      const ctx = makeContext({
        requiredPower_kW: 10,
        requiredTorque_Nm: 50,
        spindleRpm: 1910, // P = 50 * 1910 / 9549 ≈ 10 kW
        machine: {
          spindle: { power_continuous_kw: 15, max_torque_nm: 100 },
        },
      });
      const result = preMachinePowerBudget.handler(ctx);
      expect(result.blocked).toBe(false);
    });

    it("BLOCKS when power exceeds machine capacity", () => {
      const ctx = makeContext({
        requiredPower_kW: 20,
        machine: { spindle: { power_continuous_kw: 15 } },
      });
      const result = preMachinePowerBudget.handler(ctx);
      expect(result.blocked).toBe(true);
      expect(result.message).toContain("POWER/TORQUE EXCEEDED");
      expect(result.data?.issues[0]).toContain("20.00 kW exceeds machine max 15 kW");
    });

    it("BLOCKS when torque exceeds machine capacity", () => {
      const ctx = makeContext({
        requiredTorque_Nm: 150,
        machine: { spindle: { max_torque_nm: 100 } },
      });
      const result = preMachinePowerBudget.handler(ctx);
      expect(result.blocked).toBe(true);
      expect(result.data?.issues[0]).toContain("150.00 Nm exceeds machine max 100 Nm");
    });

    it("BLOCKS on physics mismatch (P ≠ T*RPM/9549)", () => {
      const ctx = makeContext({
        requiredPower_kW: 10,
        requiredTorque_Nm: 50,
        spindleRpm: 3000, // P should be 50*3000/9549 ≈ 15.7 kW, not 10
        machine: { spindle: { power_continuous_kw: 20, max_torque_nm: 200 } },
      });
      const result = preMachinePowerBudget.handler(ctx);
      expect(result.blocked).toBe(true);
      expect(result.data?.issues[0]).toContain("physics mismatch");
    });

    it("BLOCKS when torque unavailable at high RPM", () => {
      const ctx = makeContext({
        requiredTorque_Nm: 80,
        spindleRpm: 6000,
        machine: {
          spindle: {
            max_torque_nm: 100,
            base_rpm: 3000, // At 6000 RPM, only 50 Nm available
          },
        },
      });
      const result = preMachinePowerBudget.handler(ctx);
      expect(result.blocked).toBe(true);
      expect(result.data?.issues[0]).toContain("available torque is only 50");
    });
  });

  describe("pre-machine-controller-compatibility", () => {
    it("passes when controller supports required axes", () => {
      const ctx = makeContext({
        requiredAxes: 3,
        machine: { controller: { type: "FANUC", axes: 5 } },
      });
      const result = preMachineControllerCompatibility.handler(ctx);
      expect(result.blocked).toBe(false);
    });

    it("BLOCKS when operation requires more axes than controller supports", () => {
      const ctx = makeContext({
        requiredAxes: 5,
        machine: { controller: { type: "FANUC", axes: 3 } },
      });
      const result = preMachineControllerCompatibility.handler(ctx);
      expect(result.blocked).toBe(true);
      expect(result.message).toContain("CONTROLLER INCOMPATIBLE");
      expect(result.data?.issues[0]).toContain("requires 5 axes but controller supports only 3");
    });

    it("BLOCKS when required G-codes missing", () => {
      const ctx = makeContext({
        requiredGCodes: ["G43.4", "G68.2"],
        machine: {
          controller: {
            type: "FANUC",
            supported_gcodes: ["G00", "G01", "G43"],
          },
        },
      });
      const result = preMachineControllerCompatibility.handler(ctx);
      expect(result.blocked).toBe(true);
      expect(result.data?.issues[0]).toContain("missing required G-codes: G43.4, G68.2");
    });

    it("BLOCKS 5-axis simultaneous on 3-axis controller", () => {
      const ctx = makeContext({
        operationType: "5-axis-simultaneous",
        machine: { controller: { axes: 3 } },
      });
      const result = preMachineControllerCompatibility.handler(ctx);
      expect(result.blocked).toBe(true);
      expect(result.data?.issues[0]).toContain("5-axis simultaneous requires 5-axis controller");
    });
  });

  describe("pre-machine-completeness-gate", () => {
    it("passes when completeness > 50%", () => {
      const ctx = makeContext({
        machinePackage: {
          confidence: { overall: 0.75, spindle: 0.8, controller: 0.7 },
          spindle: { max_rpm: 10000, power_kw: 15 },
        },
      });
      const result = preMachineCompletenessGate.handler(ctx);
      expect(result.blocked).toBe(false);
    });

    it("BLOCKS when completeness < 50%", () => {
      const ctx = makeContext({
        machinePackage: {
          confidence: { overall: 0.35 },
          spindle: { max_rpm: 10000, power_kw: 15 },
        },
      });
      const result = preMachineCompletenessGate.handler(ctx);
      expect(result.blocked).toBe(true);
      expect(result.message).toContain("INCOMPLETE MACHINE DATA");
      expect(result.data?.issues[0]).toContain("35.0% is below minimum 50%");
    });

    it("BLOCKS when critical spindle fields missing", () => {
      const ctx = makeContext({
        machinePackage: {
          spindle: {}, // Missing max_rpm and power
        },
      });
      const result = preMachineCompletenessGate.handler(ctx);
      expect(result.blocked).toBe(true);
      expect(result.data?.criticalMissing).toContain("spindle.max_rpm");
      expect(result.data?.criticalMissing).toContain("spindle.power");
    });

    it("returns warning when subsystem confidence low", () => {
      const ctx = makeContext({
        machinePackage: {
          confidence: { overall: 0.6, spindle: 0.2, controller: 0.8 },
          spindle: { max_rpm: 10000, power_kw: 15 },
        },
      });
      const result = preMachineCompletenessGate.handler(ctx);
      expect(result.blocked).toBe(false);
      expect(result.warnings).toBeDefined();
      expect(result.data?.warnings[0]).toContain("spindle confidence very low");
    });
  });
});
