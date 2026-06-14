/**
 * MillLoRAModelSelectorEngine — Test Suite
 * =========================================
 * MILL-PARITY-UPGRADE-MS0 / U-MILL-LORA-MODEL-SELECTOR (iter95)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MillLoRAModelSelectorEngine,
  type MillModelDescriptor,
} from "../engines/MillLoRAModelSelectorEngine.js";

describe("MillLoRAModelSelectorEngine", () => {
  let engine: MillLoRAModelSelectorEngine;

  const baseModel = (
    id: string,
    spec: MillModelDescriptor["specializations"],
    axis_mode: MillModelDescriptor["axis_mode"] = "shared",
    extras?: Partial<MillModelDescriptor>,
  ) => ({
    id,
    name: id,
    specializations: spec,
    avg_accuracy: 0.85,
    avg_latency_ms: 200,
    max_concurrent: 10,
    enabled: true,
    axis_mode,
    ...extras,
  });

  beforeEach(() => {
    engine = new MillLoRAModelSelectorEngine();
  });

  describe("default config", () => {
    it("seeds defaults with mill-canonical thresholds", () => {
      const cfg = engine.getConfig();
      expect(cfg.min_accuracy).toBeCloseTo(0.6, 6);
      expect(cfg.max_backups).toBe(2);
      expect(cfg.chatter_penalty_threshold).toBeCloseTo(0.05, 6);
      expect(cfg.tcpm_fault_max).toBeCloseTo(0.02, 6);
    });
  });

  describe("registerModel", () => {
    it("creates descriptor with zero counts", () => {
      const m = engine.registerModel(baseModel("m1", ["face"]));
      expect(m.current_load).toBe(0);
      expect(m.success_count).toBe(0);
      expect(m.failure_count).toBe(0);
      expect(m.axis_mode).toBe("shared");
    });

    it("records explicit axis_mode", () => {
      const m = engine.registerModel(baseModel("m1", ["face"], "5_axis_simul"));
      expect(m.axis_mode).toBe("5_axis_simul");
    });
  });

  describe("recordOutcome (lathe parity)", () => {
    it("updates accuracy from success/failure ratio", () => {
      engine.registerModel(baseModel("m1", ["face"]));
      engine.recordOutcome("m1", true);
      engine.recordOutcome("m1", true);
      engine.recordOutcome("m1", false);
      const m = engine.getModel("m1");
      expect(m?.avg_accuracy).toBeCloseTo(2 / 3, 4);
    });

    it("smooths latency via EWMA alpha=0.1", () => {
      engine.registerModel(baseModel("m1", ["face"], "shared", { avg_latency_ms: 100 }));
      engine.recordOutcome("m1", true, 500);
      const m = engine.getModel("m1");
      // 100 * 0.9 + 500 * 0.1 = 90 + 50 = 140
      expect(m?.avg_latency_ms).toBeCloseTo(140, 4);
    });

    it("returns false on missing model", () => {
      expect(engine.recordOutcome("missing", true)).toBe(false);
    });
  });

  describe("MILL-CANONICAL: recordMillOutcome — exponential smoothing", () => {
    it("first chatter event lifts chatter_history off 0", () => {
      engine.registerModel(baseModel("m1", ["face"]));
      engine.recordMillOutcome("m1", { chatter: true });
      const m = engine.getModel("m1");
      // 0 * 0.9 + 1 * 0.1 = 0.1
      expect(m?.chatter_history).toBeCloseTo(0.1, 6);
    });

    it("first fpa_pass=false drops fpa_pass_history below baseline 1.0", () => {
      engine.registerModel(baseModel("m1", ["face"]));
      engine.recordMillOutcome("m1", { fpa_pass: false });
      const m = engine.getModel("m1");
      // 1 * 0.9 + 0 * 0.1 = 0.9
      expect(m?.fpa_pass_history).toBeCloseTo(0.9, 6);
    });

    it("first tcpm_fault=true lifts tcpm history off 0", () => {
      engine.registerModel(baseModel("m1", ["face"]));
      engine.recordMillOutcome("m1", { tcpm_fault: true });
      const m = engine.getModel("m1");
      expect(m?.tcpm_solver_fault_history).toBeCloseTo(0.1, 6);
    });

    it("returns false on missing model", () => {
      expect(engine.recordMillOutcome("missing", { chatter: true })).toBe(false);
    });
  });

  describe("scoreModel — hard filters", () => {
    it("disabled model scores 0", () => {
      const m = engine.registerModel(baseModel("m1", ["face"], "shared", { enabled: false }));
      expect(engine.scoreModel(m, {})).toBe(0);
    });

    it("under-accuracy model scores 0", () => {
      const m = engine.registerModel(baseModel("m1", ["face"], "shared", { avg_accuracy: 0.5 }));
      expect(engine.scoreModel(m, {})).toBe(0);
    });

    it("at-capacity model scores 0", () => {
      const m = engine.registerModel(baseModel("m1", ["face"], "shared", { max_concurrent: 3 }));
      m.current_load = 3;
      expect(engine.scoreModel(m, {})).toBe(0);
    });

    it("missing required_tag scores 0", () => {
      const m = engine.registerModel(baseModel("m1", ["face"]));
      expect(engine.scoreModel(m, { required_tags: ["heidenhain"] })).toBe(0);
    });
  });

  describe("MILL-CANONICAL: scoreModel — axis_mode hard filter", () => {
    it("5-axis context drops 3-axis model", () => {
      const m = engine.registerModel(baseModel("m1", ["face"], "3_axis"));
      expect(engine.scoreModel(m, { axis_mode: "5_axis_simul" })).toBe(0);
    });

    it("5-axis context keeps shared model", () => {
      const m = engine.registerModel(baseModel("m1", ["face"], "shared"));
      expect(engine.scoreModel(m, { axis_mode: "5_axis_simul" })).toBeGreaterThan(0);
    });

    it("5-axis context keeps 5_axis_simul model", () => {
      const m = engine.registerModel(baseModel("m1", ["face"], "5_axis_simul"));
      expect(engine.scoreModel(m, { axis_mode: "5_axis_simul" })).toBeGreaterThan(0);
    });
  });

  describe("MILL-CANONICAL: scoreModel — tcpm_safe_only filter", () => {
    it("drops model with tcpm history above max", () => {
      const m = engine.registerModel(baseModel("m1", ["face"], "5_axis_simul", { tcpm_solver_fault_history: 0.10 }));
      expect(engine.scoreModel(m, { tcpm_safe_only: true })).toBe(0);
    });

    it("keeps model with tcpm history below max", () => {
      const m = engine.registerModel(baseModel("m1", ["face"], "5_axis_simul", { tcpm_solver_fault_history: 0.01 }));
      expect(engine.scoreModel(m, { tcpm_safe_only: true })).toBeGreaterThan(0);
    });

    it("keeps model with no tcpm history (undefined) when filter active", () => {
      const m = engine.registerModel(baseModel("m1", ["face"], "5_axis_simul"));
      expect(engine.scoreModel(m, { tcpm_safe_only: true })).toBeGreaterThan(0);
    });
  });

  describe("MILL-CANONICAL: chatter penalty downweights chatter-prone models", () => {
    it("model with high chatter_history scores lower than clean model", () => {
      const clean = engine.registerModel(baseModel("clean", ["face"], "shared", { chatter_history: 0 }));
      const noisy = engine.registerModel(baseModel("noisy", ["face"], "shared", { chatter_history: 0.10 }));
      const sClean = engine.scoreModel(clean, {});
      const sNoisy = engine.scoreModel(noisy, {});
      expect(sClean).toBeGreaterThan(sNoisy);
    });
  });

  describe("MILL-CANONICAL: fpa bonus upweights high-FPA models", () => {
    it("model with high fpa_pass_history scores higher than low-fpa model", () => {
      const good = engine.registerModel(baseModel("good", ["face"], "shared", { fpa_pass_history: 0.99 }));
      const bad = engine.registerModel(baseModel("bad", ["face"], "shared", { fpa_pass_history: 0.50 }));
      expect(engine.scoreModel(good, {})).toBeGreaterThan(engine.scoreModel(bad, {}));
    });
  });

  describe("scoreModel — specialization match", () => {
    it("op match increases score", () => {
      const a = engine.registerModel(baseModel("a", ["face"]));
      const b = engine.registerModel(baseModel("b", ["general"]));
      expect(engine.scoreModel(a, { operation: "face" })).toBeGreaterThan(engine.scoreModel(b, { operation: "face" }));
    });

    it("material match increases score", () => {
      const a = engine.registerModel(baseModel("a", ["titanium"]));
      const b = engine.registerModel(baseModel("b", ["general"]));
      expect(engine.scoreModel(a, { material: "titanium" })).toBeGreaterThan(engine.scoreModel(b, { material: "titanium" }));
    });

    it("controller match increases score", () => {
      const a = engine.registerModel(baseModel("a", ["heidenhain"]));
      const b = engine.registerModel(baseModel("b", ["general"]));
      expect(engine.scoreModel(a, { controller: "heidenhain" })).toBeGreaterThan(engine.scoreModel(b, { controller: "heidenhain" }));
    });
  });

  describe("select — happy path", () => {
    it("picks highest-scoring model", () => {
      engine.registerModel(baseModel("a", ["face"]));
      engine.registerModel(baseModel("b", ["face", "heidenhain"]));
      engine.registerModel(baseModel("c", ["general"]));
      const r = engine.select({ operation: "face", controller: "heidenhain" });
      expect(r?.selected_model.id).toBe("b");
    });

    it("returns null when no models registered", () => {
      expect(engine.select({})).toBe(null);
    });

    it("returns null when no candidate scores >0", () => {
      engine.registerModel(baseModel("m1", ["face"], "3_axis"));
      const r = engine.select({ axis_mode: "5_axis_simul" });
      expect(r).toBe(null);
    });

    it("increments load on selection", () => {
      engine.registerModel(baseModel("m1", ["face"]));
      engine.select({ operation: "face" });
      expect(engine.getModel("m1")?.current_load).toBe(1);
    });

    it("emits up to max_backups backup models", () => {
      engine.registerModel(baseModel("a", ["face"]));
      engine.registerModel(baseModel("b", ["face"]));
      engine.registerModel(baseModel("c", ["face"]));
      engine.registerModel(baseModel("d", ["face"]));
      const r = engine.select({ operation: "face" });
      expect(r?.backup_models.length).toBe(2);
    });
  });

  describe("MILL-CANONICAL: select records filter counts", () => {
    it("axis_filtered_out counts axis-mismatched candidates", () => {
      engine.registerModel(baseModel("a", ["face"], "5_axis_simul"));
      engine.registerModel(baseModel("b", ["face"], "3_axis"));
      engine.registerModel(baseModel("c", ["face"], "3_axis"));
      const r = engine.select({ axis_mode: "5_axis_simul" });
      expect(r?.axis_filtered_out).toBe(2);
    });

    it("tcpm_filtered_out counts tcpm-unsafe candidates under tcpm_safe_only", () => {
      engine.registerModel(baseModel("a", ["face"], "5_axis_simul", { tcpm_solver_fault_history: 0.01 }));
      engine.registerModel(baseModel("b", ["face"], "5_axis_simul", { tcpm_solver_fault_history: 0.10 }));
      const r = engine.select({ axis_mode: "5_axis_simul", tcpm_safe_only: true });
      expect(r?.tcpm_filtered_out).toBe(1);
      expect(r?.selected_model.id).toBe("a");
    });
  });

  describe("release", () => {
    it("decrements load", () => {
      engine.registerModel(baseModel("m1", ["face"]));
      engine.select({ operation: "face" });
      engine.release("m1");
      expect(engine.getModel("m1")?.current_load).toBe(0);
    });

    it("does not go below 0", () => {
      engine.registerModel(baseModel("m1", ["face"]));
      engine.release("m1");
      expect(engine.getModel("m1")?.current_load).toBe(0);
    });

    it("returns false on missing model", () => {
      expect(engine.release("missing")).toBe(false);
    });
  });

  describe("findBySpecialization + findByAxisMode", () => {
    it("filters models by tag", () => {
      engine.registerModel(baseModel("a", ["face", "heidenhain"]));
      engine.registerModel(baseModel("b", ["pocket_2_5d"]));
      engine.registerModel(baseModel("c", ["heidenhain"]));
      expect(engine.findBySpecialization("heidenhain").length).toBe(2);
    });

    it("filters models by axis_mode", () => {
      engine.registerModel(baseModel("a", ["face"], "3_axis"));
      engine.registerModel(baseModel("b", ["face"], "5_axis_simul"));
      engine.registerModel(baseModel("c", ["face"], "5_axis_simul"));
      expect(engine.findByAxisMode("5_axis_simul").length).toBe(2);
    });
  });

  describe("priority multipliers", () => {
    it("speed priority boosts low-latency models", () => {
      const fast = engine.registerModel(baseModel("fast", ["face"], "shared", { avg_latency_ms: 100 }));
      const slow = engine.registerModel(baseModel("slow", ["face"], "shared", { avg_latency_ms: 800 }));
      const sFast = engine.scoreModel(fast, { priority: "speed" });
      const sSlow = engine.scoreModel(slow, { priority: "speed" });
      expect(sFast).toBeGreaterThan(sSlow);
    });

    it("accuracy priority boosts high-accuracy models", () => {
      const acc = engine.registerModel(baseModel("acc", ["face"], "shared", { avg_accuracy: 0.95 }));
      const ok = engine.registerModel(baseModel("ok", ["face"], "shared", { avg_accuracy: 0.70 }));
      expect(engine.scoreModel(acc, { priority: "accuracy" })).toBeGreaterThan(engine.scoreModel(ok, { priority: "accuracy" }));
    });
  });

  describe("getStats", () => {
    it("aggregates per-axis counts", () => {
      engine.registerModel(baseModel("a", ["face"], "3_axis"));
      engine.registerModel(baseModel("b", ["face"], "5_axis_simul"));
      engine.registerModel(baseModel("c", ["face"], "5_axis_simul"));
      const s = engine.getStats();
      expect(s.models_by_axis["3_axis"]).toBe(1);
      expect(s.models_by_axis["5_axis_simul"]).toBe(2);
    });

    it("accumulates filter drops across selections", () => {
      engine.registerModel(baseModel("a", ["face"], "5_axis_simul"));
      engine.registerModel(baseModel("b", ["face"], "3_axis"));
      engine.select({ axis_mode: "5_axis_simul" });
      engine.select({ axis_mode: "5_axis_simul" });
      const s = engine.getStats();
      expect(s.total_axis_filtered).toBe(2);
    });

    it("empty engine returns zero accuracy", () => {
      const s = engine.getStats();
      expect(s.total_models).toBe(0);
      expect(s.avg_accuracy).toBe(0);
    });
  });

  describe("reset + clearHistory", () => {
    it("reset clears models + history + config", () => {
      engine.registerModel(baseModel("m1", ["face"]));
      engine.setConfig({ min_accuracy: 0.99 });
      engine.reset();
      expect(engine.getModels().length).toBe(0);
      expect(engine.getConfig().min_accuracy).toBeCloseTo(0.6, 6);
    });

    it("clearHistory drops selections but keeps models", () => {
      engine.registerModel(baseModel("m1", ["face"]));
      engine.select({ operation: "face" });
      engine.clearHistory();
      expect(engine.getModels().length).toBe(1);
      expect(engine.getStats().total_selections).toBe(0);
    });
  });

  describe("getSummary", () => {
    it("includes mill-canonical filter counts in summary", () => {
      engine.registerModel(baseModel("a", ["face"], "5_axis_simul"));
      engine.registerModel(baseModel("b", ["face"], "3_axis"));
      engine.select({ axis_mode: "5_axis_simul" });
      const s = engine.getSummary();
      expect(s.indexOf("Axis Filtered") >= 0).toBe(true);
      expect(s.indexOf("TCPM Filtered") >= 0).toBe(true);
    });
  });
});
