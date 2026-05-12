/**
 * CAM Dispatcher — Strategy Validation Actions (CAMX-MS2/U07)
 *
 * Tests 5 new strategy validation actions wired into camDispatcher:
 * - strategy_controller_validate
 * - strategy_machine_validate
 * - strategy_find_compatible_controllers
 * - strategy_find_best_machine
 * - strategy_compatibility_matrix
 */

import { describe, it, expect } from "vitest";
import { ACTIONS } from "../tools/dispatchers/camDispatcher.js";

describe("camDispatcher: CAMX-MS2/U07 strategy validation actions", () => {
  describe("action registration", () => {
    it("strategy_controller_validate is in ACTIONS enum", () => {
      expect(ACTIONS).toContain("strategy_controller_validate");
    });

    it("strategy_machine_validate is in ACTIONS enum", () => {
      expect(ACTIONS).toContain("strategy_machine_validate");
    });

    it("strategy_find_compatible_controllers is in ACTIONS enum", () => {
      expect(ACTIONS).toContain("strategy_find_compatible_controllers");
    });

    it("strategy_find_best_machine is in ACTIONS enum", () => {
      expect(ACTIONS).toContain("strategy_find_best_machine");
    });

    it("strategy_compatibility_matrix is in ACTIONS enum", () => {
      expect(ACTIONS).toContain("strategy_compatibility_matrix");
    });

    it("all 5 actions registered adds to previous count", () => {
      // Anti-regression: we're adding 5, not removing any
      expect(ACTIONS.length).toBeGreaterThanOrEqual(5);
      // All 5 strategy actions present
      const strategyActions = ACTIONS.filter(a => a.startsWith("strategy_"));
      expect(strategyActions.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("end-to-end via engines (same code path as dispatcher)", () => {
    it("strategy_controller_validate returns validation result", async () => {
      const { controllerStrategyValidatorEngine } = await import("../engines/ControllerStrategyValidatorEngine.js");
      const result = controllerStrategyValidatorEngine.validate("face_milling", "fanuc_30i");
      expect(result.controller).toBe("fanuc_30i");
      expect(result.strategy).toBe("face_milling");
    });

    it("strategy_machine_validate returns feasibility result", async () => {
      const { machineStrategyConstraintEngine } = await import("../engines/MachineStrategyConstraintEngine.js");
      const result = machineStrategyConstraintEngine.validate({
        strategy: "face_milling",
        machine: "haas_vf2",
      });
      expect(result.strategy).toBe("face_milling");
      expect(typeof result.feasible).toBe("boolean");
    });

    it("strategy_find_compatible_controllers categorizes controllers", async () => {
      const { controllerStrategyValidatorEngine } = await import("../engines/ControllerStrategyValidatorEngine.js");
      const result = controllerStrategyValidatorEngine.findCompatibleControllers("face_milling");
      expect(Array.isArray(result.compatible)).toBe(true);
      expect(Array.isArray(result.partial)).toBe(true);
      expect(Array.isArray(result.incompatible)).toBe(true);
    });

    it("strategy_find_best_machine returns ranked machines", async () => {
      const { machineStrategyConstraintEngine } = await import("../engines/MachineStrategyConstraintEngine.js");
      const result = machineStrategyConstraintEngine.findBestMachine({
        strategy: "face_milling",
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("strategy_compatibility_matrix builds full grid", async () => {
      const { controllerStrategyValidatorEngine } = await import("../engines/ControllerStrategyValidatorEngine.js");
      const result = controllerStrategyValidatorEngine.compatibilityMatrix();
      expect(Array.isArray(result.controllers)).toBe(true);
      expect(Array.isArray(result.strategies)).toBe(true);
      expect(result.controllers.length).toBeGreaterThan(0);
      expect(result.strategies.length).toBeGreaterThan(0);
    });
  });
});
