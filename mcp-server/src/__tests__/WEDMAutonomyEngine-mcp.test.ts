/**
 * U-P2PFS25: WEDMAutonomyEngine MCP Wiring Tests
 * Verifies dispatcher actions wedm_autonomy_get_level, wedm_autonomy_can,
 * wedm_autonomy_snapshot, wedm_autonomy_promote, wedm_autonomy_demote, wedm_autonomy_degrade
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WEDMAutonomyEngine,
  AUTONOMY_LEVEL_NAMES,
  CAPABILITY_MIN_LEVEL,
  DEFAULT_STARTING_LEVEL,
  type AutonomyLevel,
  type AutonomyCapability,
} from "../engines/WEDMAutonomyEngine.js";

describe("WEDMAutonomyEngine MCP Wiring (U-P2PFS25)", () => {
  let engine: WEDMAutonomyEngine;

  beforeEach(() => {
    engine = new WEDMAutonomyEngine();
  });

  describe("getLevel()", () => {
    it("returns current autonomy level", () => {
      expect(engine.getLevel()).toBe(DEFAULT_STARTING_LEVEL);
    });

    it("starts at L0 by default", () => {
      expect(engine.getLevel()).toBe(0);
    });

    it("can be initialized at different level", () => {
      const l2Engine = new WEDMAutonomyEngine(2);
      expect(l2Engine.getLevel()).toBe(2);
    });
  });

  describe("getName()", () => {
    it("returns level name", () => {
      expect(engine.getName()).toBe("Manual");
    });

    it("returns correct name for each level", () => {
      for (let i = 0; i <= 5; i++) {
        const e = new WEDMAutonomyEngine(i as AutonomyLevel);
        expect(e.getName()).toBe(AUTONOMY_LEVEL_NAMES[i as AutonomyLevel]);
      }
    });
  });

  describe("getHumanRole()", () => {
    it("returns human role description", () => {
      expect(engine.getHumanRole()).toContain("Full control");
    });
  });

  describe("can()", () => {
    it("returns false for all capabilities at L0", () => {
      expect(engine.can("suggest_parameters")).toBe(false);
      expect(engine.can("auto_adjust_parameters")).toBe(false);
      expect(engine.can("execute_job_supervised")).toBe(false);
    });

    it("returns true for suggest_parameters at L1+", () => {
      const l1 = new WEDMAutonomyEngine(1);
      expect(l1.can("suggest_parameters")).toBe(true);
    });

    it("returns true for auto_adjust_parameters at L2+", () => {
      const l2 = new WEDMAutonomyEngine(2);
      expect(l2.can("auto_adjust_parameters")).toBe(true);
      expect(l2.can("suggest_parameters")).toBe(true);
    });

    it("returns true for execute_job_supervised at L3+", () => {
      const l3 = new WEDMAutonomyEngine(3);
      expect(l3.can("execute_job_supervised")).toBe(true);
    });

    it("returns true for execute_job_unattended at L4+", () => {
      const l4 = new WEDMAutonomyEngine(4);
      expect(l4.can("execute_job_unattended")).toBe(true);
    });

    it("returns true for self_modify_policy at L5 only", () => {
      const l5 = new WEDMAutonomyEngine(5);
      expect(l5.can("self_modify_policy")).toBe(true);

      const l4 = new WEDMAutonomyEngine(4);
      expect(l4.can("self_modify_policy")).toBe(false);
    });

    it("throws for unknown capability", () => {
      expect(() => engine.can("unknown" as AutonomyCapability)).toThrow();
    });
  });

  describe("snapshot()", () => {
    it("returns full snapshot structure", () => {
      const snap = engine.snapshot();

      expect(snap).toHaveProperty("level");
      expect(snap).toHaveProperty("name");
      expect(snap).toHaveProperty("humanRole");
      expect(snap).toHaveProperty("version");
      expect(snap).toHaveProperty("history");
    });

    it("version starts at 0", () => {
      expect(engine.snapshot().version).toBe(0);
    });

    it("history starts empty", () => {
      expect(engine.snapshot().history).toHaveLength(0);
    });

    it("includes last transition after promote", () => {
      engine.promote({ actor: "test" });
      const snap = engine.snapshot();

      expect(snap.last).toBeDefined();
      expect(snap.last?.from).toBe(0);
      expect(snap.last?.to).toBe(1);
    });
  });

  describe("promote()", () => {
    it("steps up one level", () => {
      const transition = engine.promote();

      expect(transition.from).toBe(0);
      expect(transition.to).toBe(1);
      expect(engine.getLevel()).toBe(1);
    });

    it("records actor and reason", () => {
      const transition = engine.promote({
        actor: "operator_john",
        reason: "job start",
      });

      expect(transition.actor).toBe("operator_john");
      expect(transition.reason).toBe("job start");
    });

    it("throws at max level", () => {
      const maxEngine = new WEDMAutonomyEngine(5);
      expect(() => maxEngine.promote()).toThrow(/max level/);
    });

    it("requires counterSign for L3→L4", () => {
      const l3 = new WEDMAutonomyEngine(3);
      expect(() => l3.promote()).toThrow(/counterSign/);
    });

    it("succeeds with counterSign for L3→L4", () => {
      const l3 = new WEDMAutonomyEngine(3);
      const transition = l3.promote({ counterSign: "supervisor_jane" });

      expect(transition.to).toBe(4);
    });

    it("requires counterSign for L4→L5", () => {
      const l4 = new WEDMAutonomyEngine(4);
      expect(() => l4.promote()).toThrow(/counterSign/);
    });

    it("increments version after transition", () => {
      engine.promote();
      expect(engine.snapshot().version).toBe(1);
    });
  });

  describe("demote()", () => {
    it("steps down one level", () => {
      const l2 = new WEDMAutonomyEngine(2);
      const transition = l2.demote();

      expect(transition.from).toBe(2);
      expect(transition.to).toBe(1);
      expect(l2.getLevel()).toBe(1);
    });

    it("throws at min level", () => {
      expect(() => engine.demote()).toThrow(/min level/);
    });

    it("never requires counterSign", () => {
      const l4 = new WEDMAutonomyEngine(4);
      const transition = l4.demote({ reason: "shift end" });

      expect(transition.to).toBe(3);
    });
  });

  describe("degrade()", () => {
    it("forces downgrade to floor level", () => {
      const l4 = new WEDMAutonomyEngine(4);
      const transition = l4.degrade({ floorToLevel: 1, reason: "safety violation" });

      expect(transition?.to).toBe(1);
      expect(l4.getLevel()).toBe(1);
    });

    it("returns null if already at or below floor", () => {
      const result = engine.degrade({ floorToLevel: 2 });
      expect(result).toBeNull();
    });

    it("marks transition as forced", () => {
      const l3 = new WEDMAutonomyEngine(3);
      const transition = l3.degrade({ floorToLevel: 0 });

      expect(transition?.forced).toBe(true);
    });

    it("sets actor to system by default", () => {
      const l2 = new WEDMAutonomyEngine(2);
      const transition = l2.degrade({ floorToLevel: 0 });

      expect(transition?.actor).toBe("system");
    });
  });

  describe("reset()", () => {
    it("resets to specified level", () => {
      engine.promote();
      engine.promote();
      engine.reset(0);

      expect(engine.getLevel()).toBe(0);
    });

    it("clears history", () => {
      engine.promote();
      engine.reset();

      expect(engine.snapshot().history).toHaveLength(0);
    });
  });

  describe("level names", () => {
    it("has all six levels defined", () => {
      expect(Object.keys(AUTONOMY_LEVEL_NAMES)).toHaveLength(6);
    });

    it("levels are L0 Manual through L5 Self-improving", () => {
      expect(AUTONOMY_LEVEL_NAMES[0]).toBe("Manual");
      expect(AUTONOMY_LEVEL_NAMES[5]).toBe("Self-improving");
    });
  });

  describe("capability minimum levels", () => {
    it("suggest_parameters requires L1", () => {
      expect(CAPABILITY_MIN_LEVEL.suggest_parameters).toBe(1);
    });

    it("auto_adjust_parameters requires L2", () => {
      expect(CAPABILITY_MIN_LEVEL.auto_adjust_parameters).toBe(2);
    });

    it("execute_job_supervised requires L3", () => {
      expect(CAPABILITY_MIN_LEVEL.execute_job_supervised).toBe(3);
    });

    it("execute_job_unattended requires L4", () => {
      expect(CAPABILITY_MIN_LEVEL.execute_job_unattended).toBe(4);
    });

    it("self_modify_policy requires L5", () => {
      expect(CAPABILITY_MIN_LEVEL.self_modify_policy).toBe(5);
    });
  });
});
