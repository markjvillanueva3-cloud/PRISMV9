/**
 * MillLoRAEnsembleOrchestratorEngine — Test Suite
 * ================================================
 * MILL-PARITY-UPGRADE-MS0 / U-MILL-LORA-ENSEMBLE-ORCHESTRATOR (iter96)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MillLoRAEnsembleOrchestratorEngine,
  MILL_CANONICAL_RUN_STATUSES,
  type MillModelExecution,
} from "../engines/MillLoRAEnsembleOrchestratorEngine.js";

describe("MillLoRAEnsembleOrchestratorEngine", () => {
  let engine: MillLoRAEnsembleOrchestratorEngine;

  const ex = (id: string, opts?: Partial<MillModelExecution>): MillModelExecution => ({
    model_id: id,
    status: "success",
    prediction: "yes",
    confidence: 0.9,
    latency_ms: 100,
    ...opts,
  });

  beforeEach(() => {
    engine = new MillLoRAEnsembleOrchestratorEngine();
  });

  describe("MILL_CANONICAL_RUN_STATUSES taxonomy", () => {
    it("exposes 2 mill-canonical statuses", () => {
      expect(MILL_CANONICAL_RUN_STATUSES.length).toBe(2);
      expect(MILL_CANONICAL_RUN_STATUSES).toContain("chatter_aborted");
      expect(MILL_CANONICAL_RUN_STATUSES).toContain("tcpm_aborted");
    });
  });

  describe("default config", () => {
    it("has mill-canonical abort_on flags enabled", () => {
      const cfg = engine.getConfig();
      expect(cfg.abort_on_chatter_breach).toBe(true);
      expect(cfg.abort_on_tcpm_fault).toBe(true);
      expect(cfg.cascade_early_stop_confidence).toBeCloseTo(0.95, 6);
    });
  });

  describe("startRun", () => {
    it("creates a running run with default mode + shared axis", () => {
      const r = engine.startRun("input", ["m1", "m2"]);
      expect(r.status).toBe("running");
      expect(r.mode).toBe("parallel");
      expect(r.axis_mode).toBe("shared");
      expect(r.executions.length).toBe(0);
    });

    it("accepts axis_mode + mode opts", () => {
      const r = engine.startRun("input", ["m1"], { mode: "cascade", axis_mode: "5_axis_simul" });
      expect(r.mode).toBe("cascade");
      expect(r.axis_mode).toBe("5_axis_simul");
    });

    it("throws on empty model list", () => {
      expect(() => engine.startRun("x", [])).toThrow(/at least one model/);
    });

    it("throws on too many models", () => {
      expect(() => engine.startRun("x", ["a", "b", "c", "d", "e", "f"])).toThrow(/Too many models/);
    });
  });

  describe("recordExecution + latency accounting", () => {
    it("parallel mode takes MAX latency", () => {
      const r = engine.startRun("x", ["a", "b"]);
      engine.recordExecution(r.id, ex("a", { latency_ms: 100 }));
      engine.recordExecution(r.id, ex("b", { latency_ms: 250 }));
      const got = engine.getRun(r.id);
      expect(got?.total_latency_ms).toBe(250);
    });

    it("sequential mode SUMS latency", () => {
      const r = engine.startRun("x", ["a", "b"], { mode: "sequential" });
      engine.recordExecution(r.id, ex("a", { latency_ms: 100 }));
      engine.recordExecution(r.id, ex("b", { latency_ms: 200 }));
      const got = engine.getRun(r.id);
      expect(got?.total_latency_ms).toBe(300);
    });

    it("returns false on missing run", () => {
      expect(engine.recordExecution("missing", ex("a"))).toBe(false);
    });
  });

  describe("MILL-CANONICAL: shouldCascadeStop", () => {
    it("does not stop on parallel mode", () => {
      const r = engine.startRun("x", ["a"], { mode: "parallel" });
      engine.recordExecution(r.id, ex("a", { confidence: 0.99 }));
      const result = engine.shouldCascadeStop(r.id);
      expect(result.stop).toBe(false);
    });

    it("stops on high-confidence latest execution", () => {
      const r = engine.startRun("x", ["a"], { mode: "cascade" });
      engine.recordExecution(r.id, ex("a", { confidence: 0.96 }));
      const result = engine.shouldCascadeStop(r.id);
      expect(result.stop).toBe(true);
      expect(result.reason).toBe("confidence");
    });

    it("stops immediately on chatter_breach (regardless of confidence)", () => {
      const r = engine.startRun("x", ["a"], { mode: "cascade" });
      engine.recordExecution(r.id, ex("a", { confidence: 0.5, chatter_breach: true }));
      const result = engine.shouldCascadeStop(r.id);
      expect(result.stop).toBe(true);
      expect(result.reason).toBe("chatter");
    });

    it("stops immediately on tcpm_solver_fault", () => {
      const r = engine.startRun("x", ["a"], { mode: "cascade" });
      engine.recordExecution(r.id, ex("a", { confidence: 0.5, tcpm_solver_fault: true }));
      const result = engine.shouldCascadeStop(r.id);
      expect(result.stop).toBe(true);
      expect(result.reason).toBe("tcpm");
    });

    it("chatter takes priority over tcpm + confidence in same execution", () => {
      const r = engine.startRun("x", ["a"], { mode: "cascade" });
      engine.recordExecution(r.id, ex("a", { confidence: 0.99, chatter_breach: true, tcpm_solver_fault: true }));
      const result = engine.shouldCascadeStop(r.id);
      expect(result.reason).toBe("chatter");
    });

    it("respects abort_on_chatter_breach=false config knob", () => {
      engine.setConfig({ abort_on_chatter_breach: false });
      const r = engine.startRun("x", ["a"], { mode: "cascade" });
      engine.recordExecution(r.id, ex("a", { confidence: 0.5, chatter_breach: true }));
      const result = engine.shouldCascadeStop(r.id);
      expect(result.stop).toBe(false);
    });
  });

  describe("completeRun — status determination", () => {
    it("status=completed when all executions succeed", () => {
      const r = engine.startRun("x", ["a", "b"]);
      engine.recordExecution(r.id, ex("a"));
      engine.recordExecution(r.id, ex("b"));
      const done = engine.completeRun(r.id);
      expect(done?.status).toBe("completed");
    });

    it("status=partial when some succeed and some fail", () => {
      const r = engine.startRun("x", ["a", "b"]);
      engine.recordExecution(r.id, ex("a"));
      engine.recordExecution(r.id, ex("b", { status: "failure" }));
      const done = engine.completeRun(r.id);
      expect(done?.status).toBe("partial");
    });

    it("status=failed when none succeed", () => {
      const r = engine.startRun("x", ["a", "b"]);
      engine.recordExecution(r.id, ex("a", { status: "failure" }));
      engine.recordExecution(r.id, ex("b", { status: "timeout" }));
      const done = engine.completeRun(r.id);
      expect(done?.status).toBe("failed");
    });
  });

  describe("MILL-CANONICAL: completeRun abort statuses", () => {
    it("status=chatter_aborted when any execution has chatter_breach", () => {
      const r = engine.startRun("x", ["a", "b"]);
      engine.recordExecution(r.id, ex("a"));
      engine.recordExecution(r.id, ex("b", { chatter_breach: true }));
      const done = engine.completeRun(r.id);
      expect(done?.status).toBe("chatter_aborted");
      expect(done?.abort_reason).toBe("chatter_breach");
    });

    it("status=tcpm_aborted when any execution has tcpm_solver_fault", () => {
      const r = engine.startRun("x", ["a", "b"]);
      engine.recordExecution(r.id, ex("a"));
      engine.recordExecution(r.id, ex("b", { tcpm_solver_fault: true }));
      const done = engine.completeRun(r.id);
      expect(done?.status).toBe("tcpm_aborted");
      expect(done?.abort_reason).toBe("tcpm_solver_fault");
    });

    it("chatter abort takes priority over tcpm", () => {
      const r = engine.startRun("x", ["a", "b"]);
      engine.recordExecution(r.id, ex("a", { tcpm_solver_fault: true }));
      engine.recordExecution(r.id, ex("b", { chatter_breach: true }));
      const done = engine.completeRun(r.id);
      expect(done?.status).toBe("chatter_aborted");
    });

    it("does NOT compute consensus when aborted", () => {
      const r = engine.startRun("x", ["a", "b"]);
      engine.recordExecution(r.id, ex("a", { prediction: "yes" }));
      engine.recordExecution(r.id, ex("b", { prediction: "yes", chatter_breach: true }));
      const done = engine.completeRun(r.id);
      // consensus_reached stays false even though both predicted "yes"
      expect(done?.consensus_reached).toBe(false);
    });

    it("config knob abort_on_chatter_breach=false skips chatter abort", () => {
      engine.setConfig({ abort_on_chatter_breach: false });
      const r = engine.startRun("x", ["a", "b"]);
      engine.recordExecution(r.id, ex("a"));
      engine.recordExecution(r.id, ex("b", { chatter_breach: true }));
      const done = engine.completeRun(r.id);
      expect(done?.status).toBe("completed");
    });
  });

  describe("consensus + final prediction", () => {
    it("majority vote wins consensus", () => {
      const r = engine.startRun("x", ["a", "b", "c"]);
      engine.recordExecution(r.id, ex("a", { prediction: "yes" }));
      engine.recordExecution(r.id, ex("b", { prediction: "yes" }));
      engine.recordExecution(r.id, ex("c", { prediction: "no" }));
      const done = engine.completeRun(r.id);
      expect(done?.consensus_reached).toBe(true);
      expect(done?.final_prediction).toBe("yes");
    });

    it("no consensus when below min_successful_for_consensus", () => {
      engine.setConfig({ min_successful_for_consensus: 3 });
      const r = engine.startRun("x", ["a", "b"]);
      engine.recordExecution(r.id, ex("a", { prediction: "yes" }));
      engine.recordExecution(r.id, ex("b", { prediction: "yes" }));
      const done = engine.completeRun(r.id);
      expect(done?.consensus_reached).toBe(false);
    });

    it("computes confidence-weighted final_value", () => {
      const r = engine.startRun("x", ["a", "b"]);
      engine.recordExecution(r.id, ex("a", { prediction: "yes", numeric_value: 100, confidence: 0.5 }));
      engine.recordExecution(r.id, ex("b", { prediction: "yes", numeric_value: 200, confidence: 0.5 }));
      const done = engine.completeRun(r.id);
      // Weighted: (100*0.5 + 200*0.5) / 1 = 150
      expect(done?.final_value).toBeCloseTo(150, 4);
    });
  });

  describe("MILL-CANONICAL: getStatsByAxis", () => {
    it("buckets runs per axis_mode", () => {
      // 3-axis run with chatter abort
      const r1 = engine.startRun("x", ["a"], { axis_mode: "3_axis" });
      engine.recordExecution(r1.id, ex("a", { chatter_breach: true }));
      engine.completeRun(r1.id);
      // 5-axis run with tcpm abort
      const r2 = engine.startRun("x", ["a"], { axis_mode: "5_axis_simul" });
      engine.recordExecution(r2.id, ex("a", { tcpm_solver_fault: true }));
      engine.completeRun(r2.id);
      // 5-axis run completed successfully
      const r3 = engine.startRun("x", ["a", "b"], { axis_mode: "5_axis_simul" });
      engine.recordExecution(r3.id, ex("a"));
      engine.recordExecution(r3.id, ex("b"));
      engine.completeRun(r3.id);

      const stats = engine.getStatsByAxis();
      expect(stats["3_axis"].runs).toBe(1);
      expect(stats["3_axis"].chatter_aborted).toBe(1);
      expect(stats["5_axis_simul"].runs).toBe(2);
      expect(stats["5_axis_simul"].tcpm_aborted).toBe(1);
    });

    it("empty when no completed runs", () => {
      const stats = engine.getStatsByAxis();
      expect(Object.keys(stats).length).toBe(0);
    });
  });

  describe("getStats", () => {
    it("counts chatter_aborted_runs + tcpm_aborted_runs separately", () => {
      const r1 = engine.startRun("x", ["a"]);
      engine.recordExecution(r1.id, ex("a", { chatter_breach: true }));
      engine.completeRun(r1.id);

      const r2 = engine.startRun("x", ["a"]);
      engine.recordExecution(r2.id, ex("a", { tcpm_solver_fault: true }));
      engine.completeRun(r2.id);

      const s = engine.getStats();
      expect(s.chatter_aborted_runs).toBe(1);
      expect(s.tcpm_aborted_runs).toBe(1);
    });

    it("safe zeros on empty engine", () => {
      const s = engine.getStats();
      expect(s.total_runs).toBe(0);
      expect(s.consensus_rate).toBe(0);
    });
  });

  describe("getRun + getActiveRuns + getCompletedRuns", () => {
    it("getRun returns active or completed", () => {
      const r1 = engine.startRun("x", ["a"]);
      expect(engine.getRun(r1.id)?.id).toBe(r1.id);
      engine.recordExecution(r1.id, ex("a"));
      engine.completeRun(r1.id);
      // After complete, still findable
      expect(engine.getRun(r1.id)?.id).toBe(r1.id);
    });

    it("getActiveRuns lists only pending/running", () => {
      const r1 = engine.startRun("x", ["a"]);
      engine.startRun("y", ["b"]);
      engine.recordExecution(r1.id, ex("a"));
      engine.completeRun(r1.id);
      expect(engine.getActiveRuns().length).toBe(1);
    });

    it("getCompletedRuns respects limit", () => {
      for (let i = 0; i < 5; i++) {
        const r = engine.startRun(`x${i}`, ["a"]);
        engine.recordExecution(r.id, ex("a"));
        engine.completeRun(r.id);
      }
      expect(engine.getCompletedRuns(2).length).toBe(2);
    });
  });

  describe("getSummary", () => {
    it("includes mill-canonical abort lines", () => {
      const r = engine.startRun("x", ["a"]);
      engine.recordExecution(r.id, ex("a", { chatter_breach: true }));
      engine.completeRun(r.id);
      const s = engine.getSummary();
      expect(s.indexOf("Chatter Aborted") >= 0).toBe(true);
      expect(s.indexOf("TCPM Aborted") >= 0).toBe(true);
    });
  });

  describe("reset", () => {
    it("clears active + completed runs and reverts config", () => {
      engine.setConfig({ abort_on_chatter_breach: false });
      const r = engine.startRun("x", ["a"]);
      engine.reset();
      expect(engine.getActiveRuns().length).toBe(0);
      expect(engine.getCompletedRuns().length).toBe(0);
      expect(engine.getConfig().abort_on_chatter_breach).toBe(true);
    });
  });
});
