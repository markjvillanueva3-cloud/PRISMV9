/**
 * MillLoRACadenceEngine — Test Suite
 * ===================================
 * MILL-PARITY-UPGRADE-MS0 / U-MILL-LORA-CADENCE (iter89)
 *
 * Mill parity for LatheLoRACadenceEngine.test.ts with MILL-CANONICAL
 * coverage:
 *   - Per-axis training mode (3_axis / 4_axis_index / 5_axis_simul / shared)
 *   - Mill-canonical trigger types (chatter-drift, fpa-rejection-spike, tcpm-fault-spike)
 *   - Mill-canonical signal checks (chatter / FPA / TCPM)
 *   - Per-axis version isolation (promotion of 3-axis doesn't deactivate 5-axis)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MillLoRACadenceEngine,
  MILL_CANONICAL_TRIGGER_TYPES,
  type MillCadenceConfig,
} from "../engines/MillLoRACadenceEngine.js";

describe("MillLoRACadenceEngine", () => {
  let engine: MillLoRACadenceEngine;

  beforeEach(() => {
    engine = new MillLoRACadenceEngine();
  });

  describe("default configuration", () => {
    it("seeds the lathe-parity defaults", () => {
      const cfg = engine.getConfig();
      expect(cfg.enabled).toBe(true);
      expect(cfg.interval).toBe("weekly");
      expect(cfg.day_of_week).toBe(0);
      expect(cfg.hour).toBe(2);
      expect(cfg.timezone).toBe("America/Chicago");
      expect(cfg.min_new_programs).toBe(50);
      expect(cfg.drift_threshold).toBeCloseTo(0.1, 6);
      expect(cfg.performance_threshold).toBe(65);
      expect(cfg.max_versions).toBe(5);
      expect(cfg.auto_promote).toBe(true);
    });

    it("seeds MILL-CANONICAL defaults", () => {
      const cfg = engine.getConfig();
      expect(cfg.axis_mode).toBe("shared");
      expect(cfg.chatter_violation_threshold).toBeCloseTo(0.05, 6);
      expect(cfg.fpa_pass_threshold).toBeCloseTo(0.85, 6);
      expect(cfg.tcpm_fault_threshold).toBeCloseTo(0.02, 6);
    });
  });

  describe("MILL_CANONICAL_TRIGGER_TYPES taxonomy", () => {
    it("exposes exactly 3 mill-canonical trigger types", () => {
      expect(MILL_CANONICAL_TRIGGER_TYPES.length).toBe(3);
      expect(MILL_CANONICAL_TRIGGER_TYPES).toContain("chatter-drift");
      expect(MILL_CANONICAL_TRIGGER_TYPES).toContain("fpa-rejection-spike");
      expect(MILL_CANONICAL_TRIGGER_TYPES).toContain("tcpm-fault-spike");
    });

    it("mill-canonical types do not overlap with lathe-shared types", () => {
      const latheShared = ["scheduled", "data-drift", "performance-drop", "manual"];
      for (const t of MILL_CANONICAL_TRIGGER_TYPES) {
        expect(latheShared.includes(t)).toBe(false);
      }
    });
  });

  describe("setConfig", () => {
    it("merges partial config into existing", () => {
      engine.setConfig({ enabled: false, hour: 4 });
      const cfg = engine.getConfig();
      expect(cfg.enabled).toBe(false);
      expect(cfg.hour).toBe(4);
      expect(cfg.interval).toBe("weekly");
    });

    it("propagates config to state", () => {
      engine.setConfig({ axis_mode: "5_axis_simul" });
      const st = engine.getState();
      expect(st.config.axis_mode).toBe("5_axis_simul");
    });
  });

  describe("checkDrift", () => {
    it("flags drift above threshold", () => {
      const r = engine.checkDrift(50, 80);
      expect(r.drifted).toBe(true);
      expect(r.delta).toBeCloseTo(0.38, 2);
    });

    it("does not flag drift within threshold", () => {
      const r = engine.checkDrift(78, 80);
      expect(r.drifted).toBe(false);
    });

    it("handles zero baseline without divide-by-zero", () => {
      const r = engine.checkDrift(0, 0);
      expect(r.drifted).toBe(false);
      expect(r.delta).toBe(0);
    });
  });

  describe("checkPerformance", () => {
    it("accepts score at threshold", () => {
      const r = engine.checkPerformance(65);
      expect(r.acceptable).toBe(true);
      expect(r.delta).toBe(0);
    });

    it("rejects score below threshold", () => {
      const r = engine.checkPerformance(60);
      expect(r.acceptable).toBe(false);
      expect(r.delta).toBe(-5);
    });
  });

  describe("MILL-CANONICAL: checkChatterViolation", () => {
    it("triggers above 5% default chatter rate", () => {
      const r = engine.checkChatterViolation(0.08);
      expect(r.triggered).toBe(true);
      expect(r.threshold).toBeCloseTo(0.05, 6);
    });

    it("does not trigger at boundary (>)", () => {
      const r = engine.checkChatterViolation(0.05);
      expect(r.triggered).toBe(false);
    });
  });

  describe("MILL-CANONICAL: checkFpaPassRate", () => {
    it("triggers when FPA pass drops below 85% floor", () => {
      const r = engine.checkFpaPassRate(0.80);
      expect(r.triggered).toBe(true);
    });

    it("does not trigger at boundary (<)", () => {
      const r = engine.checkFpaPassRate(0.85);
      expect(r.triggered).toBe(false);
    });
  });

  describe("MILL-CANONICAL: checkTcpmFaultRate", () => {
    it("triggers above 2% default solver fail rate", () => {
      const r = engine.checkTcpmFaultRate(0.05);
      expect(r.triggered).toBe(true);
    });

    it("does not trigger at boundary (>)", () => {
      const r = engine.checkTcpmFaultRate(0.02);
      expect(r.triggered).toBe(false);
    });
  });

  describe("MILL-CANONICAL: assessMillTriggers (priority order)", () => {
    it("returns chatter-drift first when chatter exceeds threshold", () => {
      const r = engine.assessMillTriggers({
        chatter_violation_rate: 0.10,
        fpa_pass_rate: 0.50,
        tcpm_solver_failure_rate: 0.50,
      });
      expect(r.triggered).toBe(true);
      expect(r.trigger).toBe("chatter-drift");
    });

    it("falls through to fpa-rejection-spike when chatter is healthy", () => {
      const r = engine.assessMillTriggers({
        chatter_violation_rate: 0.01,
        fpa_pass_rate: 0.50,
        tcpm_solver_failure_rate: 0.50,
      });
      expect(r.trigger).toBe("fpa-rejection-spike");
    });

    it("falls through to tcpm-fault-spike when chatter + fpa are healthy", () => {
      const r = engine.assessMillTriggers({
        chatter_violation_rate: 0.01,
        fpa_pass_rate: 0.95,
        tcpm_solver_failure_rate: 0.10,
      });
      expect(r.trigger).toBe("tcpm-fault-spike");
    });

    it("returns no-trigger when all signals are healthy", () => {
      const r = engine.assessMillTriggers({
        chatter_violation_rate: 0.01,
        fpa_pass_rate: 0.95,
        tcpm_solver_failure_rate: 0.001,
      });
      expect(r.triggered).toBe(false);
      expect(r.trigger).toBe(null);
    });

    it("skips checks for signals that are not provided", () => {
      const r = engine.assessMillTriggers({});
      expect(r.triggered).toBe(false);
    });
  });

  describe("startRun + completeRun (lathe-parity)", () => {
    it("creates a run with running status", () => {
      const run = engine.startRun("scheduled");
      expect(run.status).toBe("running");
      expect(run.triggered_by).toBe("scheduled");
      expect(run.promoted).toBe(false);
    });

    it("MILL-CANONICAL: tags run with config.axis_mode by default", () => {
      engine.setConfig({ axis_mode: "4_axis_index" });
      const run = engine.startRun("scheduled");
      expect(run.axis_mode).toBe("4_axis_index");
    });

    it("MILL-CANONICAL: accepts explicit axis_mode override per run", () => {
      const run = engine.startRun("chatter-drift", { axis_mode: "5_axis_simul", notes: "tcpm" });
      expect(run.axis_mode).toBe("5_axis_simul");
      expect(run.notes).toBe("tcpm");
    });

    it("completeRun records metrics and creates a version", () => {
      const run = engine.startRun("scheduled");
      engine.completeRun(run.run_id, {
        dataset_size: 1000,
        training_loss: 0.05,
        score: 80,
        new_programs: 75,
      }, "/models/v1");
      const versions = engine.getVersionHistory();
      expect(versions.length).toBe(1);
      expect(versions[0].score).toBe(80);
    });

    it("completeRun auto-promotes when score >= threshold AND auto_promote=true", () => {
      const run = engine.startRun("scheduled");
      engine.completeRun(run.run_id, {
        dataset_size: 1000,
        training_loss: 0.05,
        score: 80,
        new_programs: 75,
      }, "/models/v1");
      const active = engine.getActiveVersion();
      expect(active === null).toBe(false);
      expect((active as { is_active: boolean }).is_active).toBe(true);
    });

    it("completeRun does NOT auto-promote when score is below threshold", () => {
      const run = engine.startRun("scheduled");
      engine.completeRun(run.run_id, {
        dataset_size: 1000,
        training_loss: 0.5,
        score: 50,
        new_programs: 75,
      }, "/models/v_low");
      expect(engine.getActiveVersion()).toBe(null);
    });

    it("throws when completing a missing run", () => {
      expect(() => engine.completeRun("nonexistent", {
        dataset_size: 0, training_loss: 0, score: 0, new_programs: 0,
      }, "/x")).toThrow(/not found/);
    });

    it("failRun marks run failed with error note", () => {
      const run = engine.startRun("manual");
      const failed = engine.failRun(run.run_id, "OOM");
      expect(failed.status).toBe("failed");
      expect(failed.notes).toContain("OOM");
    });
  });

  describe("MILL-CANONICAL: per-axis version isolation", () => {
    it("3-axis promotion does NOT deactivate 5-axis active version", () => {
      // Promote a 5-axis version first
      const r5 = engine.startRun("scheduled", { axis_mode: "5_axis_simul" });
      engine.completeRun(r5.run_id, {
        dataset_size: 500, training_loss: 0.1, score: 90, new_programs: 60,
      }, "/m/5ax");
      // Promote a 3-axis version
      const r3 = engine.startRun("scheduled", { axis_mode: "3_axis" });
      engine.completeRun(r3.run_id, {
        dataset_size: 500, training_loss: 0.1, score: 90, new_programs: 60,
      }, "/m/3ax");

      const active5 = engine.getActiveVersion("5_axis_simul");
      const active3 = engine.getActiveVersion("3_axis");
      expect(active5 === null).toBe(false);
      expect(active3 === null).toBe(false);
      expect((active5 as { is_active: boolean }).is_active).toBe(true);
      expect((active3 as { is_active: boolean }).is_active).toBe(true);
    });

    it("getActiveVersionsAllAxes returns every axis with a promoted model", () => {
      const r3 = engine.startRun("scheduled", { axis_mode: "3_axis" });
      engine.completeRun(r3.run_id, {
        dataset_size: 500, training_loss: 0.1, score: 90, new_programs: 60,
      }, "/m/3ax");
      const r5 = engine.startRun("scheduled", { axis_mode: "5_axis_simul" });
      engine.completeRun(r5.run_id, {
        dataset_size: 500, training_loss: 0.1, score: 90, new_programs: 60,
      }, "/m/5ax");

      const all = engine.getActiveVersionsAllAxes();
      expect(Object.keys(all).sort()).toEqual(["3_axis", "5_axis_simul"]);
    });

    it("getRunsByAxis filters by axis_mode", () => {
      engine.startRun("scheduled", { axis_mode: "3_axis" });
      engine.startRun("scheduled", { axis_mode: "3_axis" });
      engine.startRun("scheduled", { axis_mode: "5_axis_simul" });
      expect(engine.getRunsByAxis("3_axis").length).toBe(2);
      expect(engine.getRunsByAxis("5_axis_simul").length).toBe(1);
      expect(engine.getRunsByAxis("4_axis_index").length).toBe(0);
    });
  });

  describe("MILL-CANONICAL: generateVersion embeds axis_mode", () => {
    it("includes axis_mode in version slug", () => {
      const v3 = engine.generateVersion("3_axis");
      const v5 = engine.generateVersion("5_axis_simul");
      expect(v3.includes("3_axis")).toBe(true);
      expect(v5.includes("5_axis_simul")).toBe(true);
    });

    it("uses config.axis_mode by default", () => {
      engine.setConfig({ axis_mode: "4_axis_index" });
      const v = engine.generateVersion();
      expect(v.includes("4_axis_index")).toBe(true);
    });
  });

  describe("deprecateVersion", () => {
    it("clears active_version_by_axis when active model is deprecated", () => {
      const run = engine.startRun("scheduled");
      engine.completeRun(run.run_id, {
        dataset_size: 1, training_loss: 0, score: 90, new_programs: 0,
      }, "/m");
      const v = engine.getActiveVersion();
      expect(v === null).toBe(false);
      engine.deprecateVersion((v as { version: string }).version);
      expect(engine.getActiveVersion()).toBe(null);
    });
  });

  describe("calculateNextRun", () => {
    it("daily: pushes by 1 day when target time has passed", () => {
      engine.setConfig({ interval: "daily", hour: 2 });
      const from = new Date("2026-05-25T12:00:00Z");
      const next = engine.calculateNextRun(from);
      expect(next.getTime() > from.getTime()).toBe(true);
    });

    it("on-demand returns epoch 0", () => {
      engine.setConfig({ interval: "on-demand" });
      const next = engine.calculateNextRun();
      expect(next.getTime()).toBe(0);
    });
  });

  describe("getCronExpression", () => {
    it("daily", () => {
      engine.setConfig({ interval: "daily", hour: 3 });
      expect(engine.getCronExpression()).toBe("0 3 * * *");
    });
    it("weekly", () => {
      engine.setConfig({ interval: "weekly", hour: 2, day_of_week: 1 });
      expect(engine.getCronExpression()).toBe("0 2 * * 1");
    });
    it("monthly", () => {
      engine.setConfig({ interval: "monthly", hour: 4, day_of_month: 15 });
      expect(engine.getCronExpression()).toBe("0 4 15 * *");
    });
    it("on-demand returns comment marker", () => {
      engine.setConfig({ interval: "on-demand" });
      expect(engine.getCronExpression().startsWith("#")).toBe(true);
    });
  });

  describe("shouldTriggerRun", () => {
    it("does not trigger when disabled", () => {
      engine.setConfig({ enabled: false });
      const r = engine.shouldTriggerRun();
      expect(r.should).toBe(false);
    });

    it("does not trigger when on-demand", () => {
      engine.setConfig({ interval: "on-demand" });
      const r = engine.shouldTriggerRun();
      expect(r.should).toBe(false);
    });
  });

  describe("recordNewPrograms", () => {
    it("accumulates programs", () => {
      engine.recordNewPrograms(20);
      const total = engine.recordNewPrograms(35);
      expect(total).toBe(55);
    });
  });

  describe("getSummary", () => {
    it("counts runs by trigger and axis", () => {
      engine.startRun("scheduled", { axis_mode: "3_axis" });
      engine.startRun("chatter-drift", { axis_mode: "5_axis_simul" });
      engine.startRun("fpa-rejection-spike", { axis_mode: "3_axis" });
      const s = engine.getSummary();
      expect(s.total_runs).toBe(3);
      expect(s.runs_by_trigger["scheduled"]).toBe(1);
      expect(s.runs_by_trigger["chatter-drift"]).toBe(1);
      expect(s.runs_by_axis["3_axis"]).toBe(2);
      expect(s.runs_by_axis["5_axis_simul"]).toBe(1);
    });

    it("exposes axis_mode from config", () => {
      engine.setConfig({ axis_mode: "5_axis_simul" });
      const s = engine.getSummary();
      expect(s.axis_mode).toBe("5_axis_simul");
    });
  });

  describe("reset", () => {
    it("clears all state and reverts config to defaults", () => {
      engine.setConfig({ enabled: false, axis_mode: "5_axis_simul" });
      engine.startRun("manual");
      engine.recordNewPrograms(10);
      engine.reset();
      const cfg = engine.getConfig();
      const st = engine.getState();
      expect(cfg.enabled).toBe(true);
      expect(cfg.axis_mode).toBe("shared");
      expect(st.runs.length).toBe(0);
      expect(st.programs_since_last_run).toBe(0);
    });
  });
});
