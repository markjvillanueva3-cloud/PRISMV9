/**
 * MillLoRAMasterOrchestratorEngine — Test Suite
 * ==============================================
 * MILL-PARITY-UPGRADE-MS0 / U-MILL-LORA-MASTER-ORCHESTRATOR (iter94)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MillLoRAMasterOrchestratorEngine,
  MILL_CANONICAL_SUBSYSTEMS,
  type MillSubsystemStatus,
  type MillMasterState,
} from "../engines/MillLoRAMasterOrchestratorEngine.js";

describe("MillLoRAMasterOrchestratorEngine", () => {
  let engine: MillLoRAMasterOrchestratorEngine;

  beforeEach(() => {
    engine = new MillLoRAMasterOrchestratorEngine();
  });

  describe("MILL_CANONICAL_SUBSYSTEMS taxonomy", () => {
    it("exposes exactly 3 mill-canonical subsystem names", () => {
      expect(MILL_CANONICAL_SUBSYSTEMS.length).toBe(3);
      expect(MILL_CANONICAL_SUBSYSTEMS.includes("chatter_monitor")).toBe(true);
      expect(MILL_CANONICAL_SUBSYSTEMS.includes("fpa_gate")).toBe(true);
      expect(MILL_CANONICAL_SUBSYSTEMS.includes("tcpm_solver_watch")).toBe(true);
    });
  });

  describe("default config", () => {
    it("seeds lathe-parity defaults", () => {
      const cfg = engine.getConfig();
      expect(cfg.auto_transition).toBe(true);
      expect(cfg.health_check_interval_ms).toBe(30000);
      expect(cfg.degraded_subsystem_threshold).toBeCloseTo(0.3, 6);
    });

    it("seeds MILL-CANONICAL require_first_piece_validation = true", () => {
      expect(engine.getConfig().require_first_piece_validation).toBe(true);
    });
  });

  describe("initialize", () => {
    it("starts in data_collection / initializing", () => {
      const s = engine.initialize();
      expect(s.current_phase).toBe("data_collection");
      expect(s.overall_health).toBe("initializing");
      expect(s.subsystems.size).toBe(0);
    });

    it("getState returns null before initialize", () => {
      expect(engine.getState()).toBe(null);
    });
  });

  describe("MILL-CANONICAL: initializeMillStack", () => {
    it("auto-registers 3 mill-canonical subsystems for the given axis", () => {
      engine.initializeMillStack("5_axis_simul");
      const state = engine.getState() as MillMasterState;
      const names = Array.from(state.subsystems.keys()).sort();
      expect(names).toEqual([
        "chatter_monitor.5_axis_simul",
        "fpa_gate.5_axis_simul",
        "tcpm_solver_watch.5_axis_simul",
      ]);
    });

    it("each registered subsystem carries the requested axis_mode", () => {
      engine.initializeMillStack("3_axis");
      const subs = engine.getSubsystemsByAxis("3_axis");
      expect(subs.length).toBe(3);
      for (const sub of subs) {
        expect(sub.axis_mode).toBe("3_axis");
      }
    });

    it("can layer multiple axis stacks", () => {
      engine.initializeMillStack("3_axis");
      engine.initializeMillStack("5_axis_simul");
      const stats = engine.getStatsByAxis();
      expect(stats["3_axis"].total).toBe(3);
      expect(stats["5_axis_simul"].total).toBe(3);
    });
  });

  describe("registerSubsystem", () => {
    it("returns false when not initialized", () => {
      expect(engine.registerSubsystem("x", "training")).toBe(false);
    });

    it("registers with default axis_mode = shared", () => {
      engine.initialize();
      engine.registerSubsystem("trainer", "training");
      const state = engine.getState() as MillMasterState;
      expect(state.subsystems.get("trainer")?.axis_mode).toBe("shared");
    });

    it("accepts explicit axis_mode", () => {
      engine.initialize();
      engine.registerSubsystem("trainer", "training", "5_axis_simul");
      const state = engine.getState() as MillMasterState;
      expect(state.subsystems.get("trainer")?.axis_mode).toBe("5_axis_simul");
    });
  });

  describe("updateSubsystem + recomputeHealth", () => {
    beforeEach(() => {
      engine.initialize();
      engine.registerSubsystem("a", "training");
      engine.registerSubsystem("b", "training");
      engine.registerSubsystem("c", "training");
    });

    it("returns true on existing subsystem", () => {
      expect(engine.updateSubsystem("a", { health: "healthy" })).toBe(true);
    });

    it("returns false on missing subsystem", () => {
      expect(engine.updateSubsystem("nonexistent", { health: "healthy" })).toBe(false);
    });

    it("overall_health = healthy when all healthy", () => {
      engine.updateSubsystem("a", { health: "healthy" });
      engine.updateSubsystem("b", { health: "healthy" });
      engine.updateSubsystem("c", { health: "healthy" });
      const state = engine.getState() as MillMasterState;
      expect(state.overall_health).toBe("healthy");
    });

    it("overall_health = unhealthy when >30% unhealthy", () => {
      engine.updateSubsystem("a", { health: "unhealthy" });
      engine.updateSubsystem("b", { health: "unhealthy" });
      engine.updateSubsystem("c", { health: "healthy" });
      // 2/3 unhealthy > 30% → unhealthy
      const state = engine.getState() as MillMasterState;
      expect(state.overall_health).toBe("unhealthy");
    });

    it("overall_health = degraded when (degraded+unhealthy)/total > 30%", () => {
      engine.updateSubsystem("a", { health: "degraded" });
      engine.updateSubsystem("b", { health: "healthy" });
      engine.updateSubsystem("c", { health: "healthy" });
      // 1/3 degraded ≈ 33% > 30% → degraded
      const state = engine.getState() as MillMasterState;
      expect(state.overall_health).toBe("degraded");
    });
  });

  describe("updateMetrics", () => {
    it("merges metric updates into subsystem", () => {
      engine.initialize();
      engine.registerSubsystem("a", "training");
      engine.updateMetrics("a", { loss: 0.5, accuracy: 0.9 });
      engine.updateMetrics("a", { loss: 0.4 });
      const sub = (engine.getState() as MillMasterState).subsystems.get("a") as MillSubsystemStatus;
      expect(sub.metrics.loss).toBeCloseTo(0.4, 6);
      expect(sub.metrics.accuracy).toBeCloseTo(0.9, 6);
    });
  });

  describe("transition phase ordering", () => {
    it("data_collection → training works", () => {
      engine.initialize();
      expect(engine.transition("training")).toBe(true);
      expect((engine.getState() as MillMasterState).current_phase).toBe("training");
    });

    it("does NOT allow backward transition to data_collection from training", () => {
      engine.initialize();
      engine.transition("training");
      expect(engine.transition("data_collection")).toBe(false);
    });

    it("allows maintenance from any state", () => {
      engine.initialize();
      engine.transition("training");
      expect(engine.transition("maintenance")).toBe(true);
    });

    it("allows decommissioning from any state", () => {
      engine.initialize();
      engine.transition("training");
      expect(engine.transition("decommissioning")).toBe(true);
    });
  });

  describe("MILL-CANONICAL: first_piece_validation gate", () => {
    it("deployment is BLOCKED if not coming from first_piece_validation", () => {
      engine.initialize();
      engine.transition("training");
      engine.transition("evaluation");
      // attempt to skip the gate
      expect(engine.transition("deployment")).toBe(false);
      expect((engine.getState() as MillMasterState).current_phase).toBe("evaluation");
    });

    it("deployment ALLOWED after first_piece_validation passes", () => {
      engine.initialize();
      engine.transition("training");
      engine.transition("evaluation");
      engine.transition("first_piece_validation");
      expect(engine.transition("deployment")).toBe(true);
      expect((engine.getState() as MillMasterState).current_phase).toBe("deployment");
    });

    it("gate can be disabled via config", () => {
      engine.initialize();
      engine.setConfig({ require_first_piece_validation: false });
      engine.transition("training");
      engine.transition("evaluation");
      // Skip the gate when config disables it
      expect(engine.transition("deployment")).toBe(true);
    });
  });

  describe("beginOperation + endOperation", () => {
    it("tracks active vs total operations", () => {
      engine.initialize();
      engine.beginOperation();
      engine.beginOperation();
      engine.endOperation();
      const state = engine.getState() as MillMasterState;
      expect(state.active_operations).toBe(1);
      expect(state.total_operations).toBe(2);
    });

    it("endOperation never drops below 0", () => {
      engine.initialize();
      engine.endOperation();
      engine.endOperation();
      const state = engine.getState() as MillMasterState;
      expect(state.active_operations).toBe(0);
    });
  });

  describe("MILL-CANONICAL: getStatsByAxis", () => {
    it("returns per-axis subsystem health rollups", () => {
      engine.initializeMillStack("3_axis");
      engine.initializeMillStack("5_axis_simul");
      engine.updateSubsystem("chatter_monitor.3_axis", { health: "healthy" });
      engine.updateSubsystem("chatter_monitor.5_axis_simul", { health: "unhealthy" });
      const stats = engine.getStatsByAxis();
      expect(stats["3_axis"].total).toBe(3);
      expect(stats["3_axis"].healthy).toBe(1);
      expect(stats["5_axis_simul"].unhealthy).toBe(1);
    });

    it("empty when state not initialized", () => {
      const stats = engine.getStatsByAxis();
      expect(Object.keys(stats).length).toBe(0);
    });
  });

  describe("getSubsystemsByAxis", () => {
    it("filters to just one axis", () => {
      engine.initialize();
      engine.registerSubsystem("a", "training", "3_axis");
      engine.registerSubsystem("b", "training", "5_axis_simul");
      engine.registerSubsystem("c", "training", "3_axis");
      const three = engine.getSubsystemsByAxis("3_axis");
      expect(three.length).toBe(2);
      expect(three.every((s) => s.axis_mode === "3_axis")).toBe(true);
    });

    it("empty array when not initialized", () => {
      expect(engine.getSubsystemsByAxis("3_axis")).toEqual([]);
    });
  });

  describe("getEvents", () => {
    it("records phase transitions and subsystem registers", () => {
      engine.initialize();
      engine.registerSubsystem("a", "training");
      engine.transition("training");
      const events = engine.getEvents();
      expect(events.length).toBeGreaterThanOrEqual(3);
      expect(events.some((e) => e.type === "phase_transition")).toBe(true);
      expect(events.some((e) => e.type === "subsystem_registered")).toBe(true);
    });

    it("respects limit", () => {
      engine.initialize();
      for (let i = 0; i < 10; i++) engine.registerSubsystem(`s${i}`, "training");
      const events = engine.getEvents(3);
      expect(events.length).toBe(3);
    });
  });

  describe("getStats", () => {
    it("returns initialized=false when not initialized", () => {
      const s = engine.getStats();
      expect(s.initialized).toBe(false);
      expect(s.current_phase).toBe(null);
    });

    it("counts subsystems by health", () => {
      engine.initialize();
      engine.registerSubsystem("a", "training");
      engine.registerSubsystem("b", "training");
      engine.updateSubsystem("a", { health: "healthy" });
      engine.updateSubsystem("b", { health: "degraded" });
      const s = engine.getStats();
      expect(s.total_subsystems).toBe(2);
      expect(s.healthy_subsystems).toBe(1);
      expect(s.degraded_subsystems).toBe(1);
    });
  });

  describe("shutdown", () => {
    it("forces phase to decommissioning bypassing FPA gate", () => {
      engine.initialize();
      engine.transition("training");
      engine.shutdown();
      expect((engine.getState() as MillMasterState).current_phase).toBe("decommissioning");
    });

    it("returns false when not initialized", () => {
      expect(engine.shutdown()).toBe(false);
    });
  });

  describe("reset", () => {
    it("clears state and events and reverts config", () => {
      engine.initialize();
      engine.setConfig({ require_first_piece_validation: false });
      engine.registerSubsystem("a", "training");
      engine.reset();
      expect(engine.getState()).toBe(null);
      expect(engine.getEvents().length).toBe(0);
      expect(engine.getConfig().require_first_piece_validation).toBe(true);
    });
  });

  describe("getSummary", () => {
    it("prints uninitialized message before initialize", () => {
      expect(engine.getSummary()).toBe("Mill Master Orchestrator: Not initialized");
    });

    it("includes phase + subsystem counts after init", () => {
      engine.initializeMillStack("3_axis");
      const s = engine.getSummary();
      expect(s.indexOf("Mill LoRA Master Orchestrator") >= 0).toBe(true);
      expect(s.indexOf("Subsystems: 3") >= 0).toBe(true);
    });
  });
});
