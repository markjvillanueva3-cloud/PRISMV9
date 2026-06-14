/**
 * MillLoRADeploymentEngine — Test Suite
 * ======================================
 * MILL-PARITY-UPGRADE-MS0 / U-MILL-LORA-DEPLOYMENT (iter90)
 *
 * Mill parity for LatheLoRADeploymentEngine.test.ts with MILL-CANONICAL
 * coverage:
 *   - Per-axis_mode active deployments (no cross-axis supersede)
 *   - Mill-canonical cell types (3axis_cell, 5axis_cell, etc.)
 *   - Mill-canonical rollback triggers (chatter_breach, fpa_rejection,
 *     tcpm_solver_fault) on top of health_below_threshold + manual
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MillLoRADeploymentEngine,
  MILL_CANONICAL_ROLLBACK_TRIGGERS,
  type MillDeploymentTarget,
} from "../engines/MillLoRADeploymentEngine.js";

describe("MillLoRADeploymentEngine", () => {
  let engine: MillLoRADeploymentEngine;

  const TARGET: MillDeploymentTarget = {
    id: "tgt-prod-1",
    name: "Prod Mill Cell 1",
    environment: "production",
    capacity: 10,
    cell_type: "5axis_cell",
  };

  beforeEach(() => {
    engine = new MillLoRADeploymentEngine();
    engine.registerTarget(TARGET);
  });

  describe("default configuration", () => {
    it("seeds lathe-parity defaults", () => {
      const cfg = engine.getConfig();
      expect(cfg.default_strategy).toBe("canary");
      expect(cfg.canary_initial_percent).toBe(10);
      expect(cfg.canary_step_percent).toBe(20);
      expect(cfg.health_threshold).toBeCloseTo(0.95, 6);
      expect(cfg.rollback_on_failure).toBe(true);
    });

    it("seeds MILL-CANONICAL rollback thresholds", () => {
      const cfg = engine.getConfig();
      expect(cfg.chatter_rollback_threshold).toBeCloseTo(0.05, 6);
      expect(cfg.fpa_rollback_threshold).toBeCloseTo(0.85, 6);
      expect(cfg.tcpm_rollback_threshold).toBeCloseTo(0.02, 6);
    });
  });

  describe("MILL_CANONICAL_ROLLBACK_TRIGGERS taxonomy", () => {
    it("exposes exactly 3 mill-canonical rollback triggers", () => {
      expect(MILL_CANONICAL_ROLLBACK_TRIGGERS.length).toBe(3);
      expect(MILL_CANONICAL_ROLLBACK_TRIGGERS).toContain("chatter_breach");
      expect(MILL_CANONICAL_ROLLBACK_TRIGGERS).toContain("fpa_rejection");
      expect(MILL_CANONICAL_ROLLBACK_TRIGGERS).toContain("tcpm_solver_fault");
    });
  });

  describe("registerTarget / getTarget", () => {
    it("stores and retrieves targets", () => {
      const got = engine.getTarget("tgt-prod-1");
      expect(got === undefined).toBe(false);
      expect((got as MillDeploymentTarget).cell_type).toBe("5axis_cell");
    });

    it("getTargets enumerates all", () => {
      engine.registerTarget({
        id: "tgt-dev-1",
        name: "Dev",
        environment: "dev",
        capacity: 1,
        cell_type: "prototype_bench",
      });
      expect(engine.getTargets().length).toBe(2);
    });
  });

  describe("deploy (lathe parity)", () => {
    it("creates a pending deployment", () => {
      const d = engine.deploy("model-1", "v1.0", "tgt-prod-1");
      expect(d === null).toBe(false);
      const dep = d as { status: string; strategy: string; canary_percent: number };
      expect(dep.status).toBe("pending");
      expect(dep.strategy).toBe("canary");
      expect(dep.canary_percent).toBe(10);
    });

    it("returns null for unknown target", () => {
      const d = engine.deploy("m", "v", "missing");
      expect(d).toBe(null);
    });

    it("immediate strategy starts at 100% canary", () => {
      const d = engine.deploy("m", "v", "tgt-prod-1", { strategy: "immediate" });
      expect((d as { canary_percent: number }).canary_percent).toBe(100);
    });
  });

  describe("MILL-CANONICAL: axis_mode tagging", () => {
    it("defaults axis_mode to 'shared'", () => {
      const d = engine.deploy("m", "v", "tgt-prod-1");
      expect((d as { axis_mode: string }).axis_mode).toBe("shared");
    });

    it("accepts explicit axis_mode", () => {
      const d = engine.deploy("m", "v", "tgt-prod-1", { axis_mode: "5_axis_simul" });
      expect((d as { axis_mode: string }).axis_mode).toBe("5_axis_simul");
    });
  });

  describe("activate", () => {
    it("transitions pending → active", () => {
      const d = engine.deploy("m", "v", "tgt-prod-1") as { id: string };
      engine.activate(d.id);
      const got = engine.getDeployment(d.id);
      expect((got as { status: string }).status).toBe("active");
      expect((got as { canary_percent: number }).canary_percent).toBe(100);
    });

    it("returns false for missing deployment", () => {
      expect(engine.activate("nonexistent")).toBe(false);
    });
  });

  describe("MILL-CANONICAL: per-axis_mode supersession", () => {
    it("activating a 3-axis deployment does NOT supersede the 5-axis active model", () => {
      const d5 = engine.deploy("m5", "v1", "tgt-prod-1", { axis_mode: "5_axis_simul" }) as { id: string };
      engine.activate(d5.id);
      const d3 = engine.deploy("m3", "v1", "tgt-prod-1", { axis_mode: "3_axis" }) as { id: string };
      engine.activate(d3.id);

      const got5 = engine.getDeployment(d5.id) as { status: string };
      const got3 = engine.getDeployment(d3.id) as { status: string };
      expect(got5.status).toBe("active");
      expect(got3.status).toBe("active");
    });

    it("activating a 2nd 5-axis model DOES supersede the previous 5-axis", () => {
      const d5a = engine.deploy("m5", "v1", "tgt-prod-1", { axis_mode: "5_axis_simul" }) as { id: string };
      engine.activate(d5a.id);
      const d5b = engine.deploy("m5", "v2", "tgt-prod-1", { axis_mode: "5_axis_simul" }) as { id: string };
      engine.activate(d5b.id);

      const got5a = engine.getDeployment(d5a.id) as { status: string };
      const got5b = engine.getDeployment(d5b.id) as { status: string };
      expect(got5a.status).toBe("superseded");
      expect(got5b.status).toBe("active");
    });

    it("getActiveDeployment with axis_mode filter returns the right model", () => {
      const d5 = engine.deploy("m5", "v", "tgt-prod-1", { axis_mode: "5_axis_simul" }) as { id: string };
      engine.activate(d5.id);
      const d3 = engine.deploy("m3", "v", "tgt-prod-1", { axis_mode: "3_axis" }) as { id: string };
      engine.activate(d3.id);

      const got5 = engine.getActiveDeployment("tgt-prod-1", "5_axis_simul");
      const got3 = engine.getActiveDeployment("tgt-prod-1", "3_axis");
      expect((got5 as { id: string }).id).toBe(d5.id);
      expect((got3 as { id: string }).id).toBe(d3.id);
    });

    it("getActiveDeploymentsByAxis returns all active per axis", () => {
      const d5 = engine.deploy("m5", "v", "tgt-prod-1", { axis_mode: "5_axis_simul" }) as { id: string };
      engine.activate(d5.id);
      const d3 = engine.deploy("m3", "v", "tgt-prod-1", { axis_mode: "3_axis" }) as { id: string };
      engine.activate(d3.id);
      const map = engine.getActiveDeploymentsByAxis("tgt-prod-1");
      expect(Object.keys(map).sort()).toEqual(["3_axis", "5_axis_simul"]);
    });
  });

  describe("advanceCanary", () => {
    it("steps canary percent by config step", () => {
      const d = engine.deploy("m", "v", "tgt-prod-1") as { id: string };
      engine.beginDeployment(d.id);
      engine.advanceCanary(d.id);
      const got = engine.getDeployment(d.id) as { canary_percent: number };
      expect(got.canary_percent).toBe(30);
    });

    it("activates when canary reaches 100%", () => {
      const d = engine.deploy("m", "v", "tgt-prod-1") as { id: string };
      engine.beginDeployment(d.id);
      for (let i = 0; i < 10; i++) engine.advanceCanary(d.id);
      const got = engine.getDeployment(d.id) as { status: string };
      expect(got.status).toBe("active");
    });

    it("returns false for non-canary strategy", () => {
      const d = engine.deploy("m", "v", "tgt-prod-1", { strategy: "immediate" }) as { id: string };
      expect(engine.advanceCanary(d.id)).toBe(false);
    });
  });

  describe("updateHealth + rollback on health breach", () => {
    it("rolls back when health drops below threshold", () => {
      const d = engine.deploy("m", "v", "tgt-prod-1") as { id: string };
      engine.activate(d.id);
      engine.updateHealth(d.id, 0.5);
      const got = engine.getDeployment(d.id) as { status: string; rollback_reason: string };
      expect(got.status).toBe("rolled_back");
      expect(got.rollback_reason).toBe("health_below_threshold");
    });

    it("does not roll back when rollback_on_failure=false", () => {
      engine.setConfig({ rollback_on_failure: false });
      const d = engine.deploy("m", "v", "tgt-prod-1") as { id: string };
      engine.activate(d.id);
      engine.updateHealth(d.id, 0.1);
      const got = engine.getDeployment(d.id) as { status: string };
      expect(got.status).toBe("active");
    });
  });

  describe("MILL-CANONICAL: updateMillSignals rollback triggers", () => {
    it("rolls back on chatter_breach", () => {
      const d = engine.deploy("m", "v", "tgt-prod-1") as { id: string };
      engine.activate(d.id);
      const trig = engine.updateMillSignals(d.id, { chatter_violation_rate: 0.10 });
      expect(trig).toBe("chatter_breach");
      const got = engine.getDeployment(d.id) as { status: string; rollback_reason: string };
      expect(got.status).toBe("rolled_back");
      expect(got.rollback_reason).toBe("chatter_breach");
    });

    it("rolls back on fpa_rejection", () => {
      const d = engine.deploy("m", "v", "tgt-prod-1") as { id: string };
      engine.activate(d.id);
      const trig = engine.updateMillSignals(d.id, { fpa_pass_rate: 0.50 });
      expect(trig).toBe("fpa_rejection");
    });

    it("rolls back on tcpm_solver_fault", () => {
      const d = engine.deploy("m", "v", "tgt-prod-1") as { id: string };
      engine.activate(d.id);
      const trig = engine.updateMillSignals(d.id, { tcpm_solver_failure_rate: 0.10 });
      expect(trig).toBe("tcpm_solver_fault");
    });

    it("returns null when all signals are healthy", () => {
      const d = engine.deploy("m", "v", "tgt-prod-1") as { id: string };
      engine.activate(d.id);
      const trig = engine.updateMillSignals(d.id, {
        chatter_violation_rate: 0.01,
        fpa_pass_rate: 0.99,
        tcpm_solver_failure_rate: 0.001,
      });
      expect(trig).toBe(null);
      const got = engine.getDeployment(d.id) as { status: string };
      expect(got.status).toBe("active");
    });

    it("priority: chatter > fpa > tcpm", () => {
      const d = engine.deploy("m", "v", "tgt-prod-1") as { id: string };
      engine.activate(d.id);
      const trig = engine.updateMillSignals(d.id, {
        chatter_violation_rate: 0.10,
        fpa_pass_rate: 0.50,
        tcpm_solver_failure_rate: 0.10,
      });
      expect(trig).toBe("chatter_breach");
    });

    it("records signal values even when below thresholds", () => {
      const d = engine.deploy("m", "v", "tgt-prod-1") as { id: string };
      engine.activate(d.id);
      engine.updateMillSignals(d.id, { chatter_violation_rate: 0.01, fpa_pass_rate: 0.99 });
      const got = engine.getDeployment(d.id) as { chatter_violation_rate: number; fpa_pass_rate: number };
      expect(got.chatter_violation_rate).toBeCloseTo(0.01, 6);
      expect(got.fpa_pass_rate).toBeCloseTo(0.99, 6);
    });

    it("does NOT roll back deployments that are not active/deploying", () => {
      const d = engine.deploy("m", "v", "tgt-prod-1") as { id: string };
      // Still pending — no rollback should fire even if signals breach
      const trig = engine.updateMillSignals(d.id, { chatter_violation_rate: 0.50 });
      expect(trig).toBe(null);
      const got = engine.getDeployment(d.id) as { status: string };
      expect(got.status).toBe("pending");
    });
  });

  describe("rollback restores previous-axis predecessor", () => {
    it("rolling back the newer 5-axis re-activates the previous 5-axis", () => {
      const d5a = engine.deploy("m5", "v1", "tgt-prod-1", { axis_mode: "5_axis_simul" }) as { id: string };
      engine.activate(d5a.id);
      const d5b = engine.deploy("m5", "v2", "tgt-prod-1", { axis_mode: "5_axis_simul" }) as { id: string };
      engine.activate(d5b.id);
      engine.rollback(d5b.id, "manual");
      const got5a = engine.getDeployment(d5a.id) as { status: string };
      const got5b = engine.getDeployment(d5b.id) as { status: string };
      expect(got5a.status).toBe("active");
      expect(got5b.status).toBe("rolled_back");
    });

    it("rollback is idempotent (second call returns false)", () => {
      const d = engine.deploy("m", "v", "tgt-prod-1") as { id: string };
      engine.activate(d.id);
      expect(engine.rollback(d.id)).toBe(true);
      expect(engine.rollback(d.id)).toBe(false);
    });
  });

  describe("getDeploymentsForTarget", () => {
    it("filters deployments by target", () => {
      engine.registerTarget({ ...TARGET, id: "tgt2", name: "Other" });
      engine.deploy("m", "v", "tgt-prod-1");
      engine.deploy("m", "v", "tgt-prod-1");
      engine.deploy("m", "v", "tgt2");
      expect(engine.getDeploymentsForTarget("tgt-prod-1").length).toBe(2);
      expect(engine.getDeploymentsForTarget("tgt2").length).toBe(1);
    });
  });

  describe("getStats", () => {
    it("counts by status / strategy / axis / rollback reason", () => {
      const d1 = engine.deploy("m", "v", "tgt-prod-1", { axis_mode: "3_axis" }) as { id: string };
      engine.activate(d1.id);
      const d2 = engine.deploy("m", "v", "tgt-prod-1", { axis_mode: "5_axis_simul", strategy: "immediate" }) as { id: string };
      engine.activate(d2.id);
      engine.updateMillSignals(d2.id, { chatter_violation_rate: 0.10 });

      const stats = engine.getStats();
      expect(stats.total_deployments).toBe(2);
      expect(stats.active).toBe(1);
      expect(stats.rolled_back).toBe(1);
      expect(stats.strategy_distribution["canary"]).toBe(1);
      expect(stats.strategy_distribution["immediate"]).toBe(1);
      expect(stats.axis_distribution["3_axis"]).toBe(1);
      expect(stats.axis_distribution["5_axis_simul"]).toBe(1);
      expect(stats.rollback_reasons["chatter_breach"]).toBe(1);
    });

    it("handles empty state gracefully", () => {
      const stats = engine.getStats();
      expect(stats.total_deployments).toBe(0);
      expect(stats.avg_health_score).toBe(0);
    });
  });

  describe("getHistory", () => {
    it("returns deployments sorted newest-first", async () => {
      engine.deploy("m", "v1", "tgt-prod-1");
      await new Promise((r) => setTimeout(r, 5));
      engine.deploy("m", "v2", "tgt-prod-1");
      const hist = engine.getHistory();
      expect(hist[0].model_version).toBe("v2");
      expect(hist[1].model_version).toBe("v1");
    });

    it("respects limit", () => {
      engine.deploy("m", "v1", "tgt-prod-1");
      engine.deploy("m", "v2", "tgt-prod-1");
      engine.deploy("m", "v3", "tgt-prod-1");
      const hist = engine.getHistory(2);
      expect(hist.length).toBe(2);
    });
  });

  describe("getSummary", () => {
    it("produces a human-readable summary", () => {
      const d = engine.deploy("m", "v", "tgt-prod-1") as { id: string };
      engine.activate(d.id);
      const s = engine.getSummary();
      expect(s.includes("Mill LoRA Deployment")).toBe(true);
      expect(s.includes("Active: 1")).toBe(true);
    });
  });

  describe("reset", () => {
    it("clears all state", () => {
      engine.deploy("m", "v", "tgt-prod-1");
      engine.reset();
      expect(engine.getTargets().length).toBe(0);
      expect(engine.getStats().total_deployments).toBe(0);
    });
  });
});
