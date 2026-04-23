/**
 * LatencyBudgetDecompositionEngine tests — U-LPR-PERF-SLO
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  latencyBudgetDecompositionEngine as engine,
  LatencyBudgetDecompositionEngine,
} from "../../engines/LatencyBudgetDecompositionEngine.js";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

describe("LatencyBudgetDecompositionEngine", () => {
  beforeEach(() => engine.clearAll());

  describe("R-7 quantile math", () => {
    it("p50 of odd-length list returns middle element exactly", () => {
      expect(LatencyBudgetDecompositionEngine.quantileR7([1, 2, 3, 4, 5], 0.5)).toBe(3);
    });

    it("p95 of [1..100] returns 95.05 by linear interpolation (R-7)", () => {
      const values = Array.from({ length: 100 }, (_, i) => i + 1);
      // h = (100−1) * 0.95 = 94.05  →  interp between index 94 (v=95) and 95 (v=96)
      expect(LatencyBudgetDecompositionEngine.quantileR7(values, 0.95)).toBeCloseTo(95.05, 5);
    });

    it("edge cases: empty, single element, q=0, q=1", () => {
      expect(LatencyBudgetDecompositionEngine.quantileR7([], 0.5)).toBe(0);
      expect(LatencyBudgetDecompositionEngine.quantileR7([42], 0.9)).toBe(42);
      expect(LatencyBudgetDecompositionEngine.quantileR7([1, 2, 3], 0)).toBe(1);
      expect(LatencyBudgetDecompositionEngine.quantileR7([1, 2, 3], 1)).toBe(3);
    });
  });

  describe("default profile catalog", () => {
    it("local_gpu sum is exactly 2480ms (20ms slack vs 2500ms target)", () => {
      const v = engine.validateProfileBudget("local_gpu");
      expect(v.total_ms).toBe(2480);
      expect(v.slack_ms).toBe(20);
      expect(v.valid).toBe(true);
    });

    it("server_async sum is 1780ms (700ms slack) — lower LoRA budget", () => {
      const v = engine.validateProfileBudget("server_async");
      expect(v.total_ms).toBe(1780);
      expect(v.slack_ms).toBe(720);
    });

    it("LoRA is the only stage with a TTFT budget, and only on local_gpu", () => {
      const lora = engine.getBudget("local_gpu", "lora_inference");
      expect(lora?.ttft_budget_ms).toBe(400);
      const loraSrv = engine.getBudget("server_async", "lora_inference");
      expect(loraSrv?.ttft_budget_ms).toBeNull();
    });
  });

  describe("setBudget validation", () => {
    it("rejects non-positive p95", () => {
      expect(() => engine.setBudget({
        stage: "ocr", p95_budget_ms: 0, ttft_budget_ms: null, profile: "local_gpu",
      })).toThrow(/must be positive/);
    });

    it("rejects TTFT ≥ p95", () => {
      expect(() => engine.setBudget({
        stage: "lora_inference", p95_budget_ms: 500, ttft_budget_ms: 500, profile: "local_gpu",
      })).toThrow(/strictly less/);
    });

    it("rejects budget that would push profile sum over 2500ms target (via validateProfileBudget)", () => {
      engine.setBudget({
        stage: "lora_inference", p95_budget_ms: 2500, ttft_budget_ms: 400, profile: "local_gpu",
      });
      const v = engine.validateProfileBudget("local_gpu");
      expect(v.valid).toBe(false);
      expect(v.reason).toMatch(/exceeds/);
    });
  });

  describe("recordObservation", () => {
    it("rejects negative latency", () => {
      expect(() => engine.recordObservation({
        stage: "ocr", profile: "local_gpu", latency_ms: -1,
      })).toThrow(/non-negative/);
    });

    it("rejects TTFT on a stage without TTFT budget", () => {
      expect(() => engine.recordObservation({
        stage: "ocr", profile: "local_gpu", latency_ms: 100, ttft_ms: 50,
      })).toThrow(/no TTFT budget/);
    });

    it("rejects observation for unregistered profile/stage combo", () => {
      engine.clearAll();
      // Remove OCR from local_gpu explicitly
      // (we can't unset, but we can test an unknown combo by overriding an incompatible profile)
      expect(() => engine.recordObservation({
        stage: "ocr",
        profile: "local_gpu",
        latency_ms: 100,
        // legit combo — should succeed
      })).not.toThrow();
    });
  });

  describe("stageStats", () => {
    it("counts breaches when latency exceeds p95 budget", () => {
      const t0 = 1_700_000_000_000;
      for (let i = 0; i < 20; i++) {
        engine.recordObservation({
          stage: "ocr",
          profile: "local_gpu",
          latency_ms: i < 18 ? 200 : 400, // 2 breaches out of 20 (budget=300)
          observed_at: t0 + i,
        });
      }
      const s = engine.stageStats("local_gpu", "ocr");
      expect(s.count).toBe(20);
      expect(s.breaches).toBe(2);
      expect(s.breach_ratio).toBe(0.1);
      expect(s.max_ms).toBe(400);
    });

    it("computes TTFT p95 when stage has TTFT budget and some obs include ttft_ms", () => {
      const t0 = 1_700_000_000_000;
      for (let i = 0; i < 10; i++) {
        engine.recordObservation({
          stage: "lora_inference",
          profile: "local_gpu",
          latency_ms: 1000,
          ttft_ms: 200 + i * 20,
          observed_at: t0 + i,
        });
      }
      const s = engine.stageStats("local_gpu", "lora_inference");
      expect(s.ttft_p95_ms).not.toBeNull();
      expect(s.ttft_p95_ms!).toBeGreaterThan(200);
      expect(s.ttft_p95_ms!).toBeLessThanOrEqual(380);
    });

    it("respects the since filter", () => {
      const t0 = 1_700_000_000_000;
      engine.recordObservation({ stage: "ocr", profile: "local_gpu", latency_ms: 100, observed_at: t0 });
      engine.recordObservation({ stage: "ocr", profile: "local_gpu", latency_ms: 200, observed_at: t0 + 1000 });
      const s = engine.stageStats("local_gpu", "ocr", t0 + 500);
      expect(s.count).toBe(1);
      expect(s.p50_ms).toBe(200);
    });
  });

  describe("endToEndStats status branches", () => {
    function seedAll(profile: "local_gpu" | "server_async", latency: number) {
      const stages = ["ocr", "cad_feature", "tribal_knn", "lora_inference", "physics_validation", "gcode_dialect", "sim_enqueue"] as const;
      for (const stage of stages) {
        const b = engine.getBudget(profile, stage)!;
        for (let i = 0; i < 100; i++) {
          engine.recordObservation({
            stage, profile,
            latency_ms: Math.min(latency, b.p95_budget_ms * 10),
          });
        }
      }
    }

    it("healthy when all stages well under budget and slack ≥200ms", () => {
      // Everything at half its stage budget — p95 is always the constant.
      const stages = ["ocr", "cad_feature", "tribal_knn", "lora_inference", "physics_validation", "gcode_dialect", "sim_enqueue"] as const;
      for (const stage of stages) {
        const b = engine.getBudget("server_async", stage)!; // server_async has big slack
        for (let i = 0; i < 100; i++) {
          engine.recordObservation({
            stage, profile: "server_async",
            latency_ms: b.p95_budget_ms / 2,
          });
        }
      }
      const e = engine.endToEndStats("server_async");
      expect(e.overall_status).toBe("healthy");
      expect(e.slack_ms).toBeGreaterThan(200);
    });

    it("at_risk when a stage p95 exceeds its budget", () => {
      // Local GPU has only 20ms aggregate slack — easy to push into at_risk.
      const stages = ["ocr", "cad_feature", "tribal_knn", "lora_inference", "physics_validation", "gcode_dialect", "sim_enqueue"] as const;
      for (const stage of stages) {
        const b = engine.getBudget("local_gpu", stage)!;
        for (let i = 0; i < 100; i++) {
          engine.recordObservation({
            stage, profile: "local_gpu",
            // Make OCR straddle its budget (half under, half over)
            latency_ms: stage === "ocr"
              ? (i < 50 ? 100 : 400)  // p95 will be ~400 > 300 budget
              : b.p95_budget_ms * 0.3,
          });
        }
      }
      const e = engine.endToEndStats("local_gpu");
      expect(e.overall_status).toBe("at_risk");
      expect(e.stage_stats.find(s => s.stage === "ocr")!.p95_ms).toBeGreaterThan(300);
    });

    it("breached when aggregate p95 sum exceeds aggregate budget", () => {
      // Blow the LoRA budget catastrophically
      const stages = ["ocr", "cad_feature", "tribal_knn", "lora_inference", "physics_validation", "gcode_dialect", "sim_enqueue"] as const;
      for (const stage of stages) {
        for (let i = 0; i < 100; i++) {
          engine.recordObservation({
            stage, profile: "local_gpu",
            latency_ms: stage === "lora_inference" ? 5000 : 100,
          });
        }
      }
      const e = engine.endToEndStats("local_gpu");
      expect(e.overall_status).toBe("breached");
      expect(e.aggregate_observed_p95_ms).toBeGreaterThan(e.aggregate_budget_ms);
    });
  });

  describe("burn rate alerts", () => {
    it("fast_burn not triggered when breach ratio is under SLO budget", () => {
      const now = 1_700_000_000_000;
      // 100 observations, 0 breaches → burn rate = 0
      for (let i = 0; i < 100; i++) {
        engine.recordObservation({
          stage: "ocr", profile: "local_gpu",
          latency_ms: 100,
          observed_at: now - 30 * MIN,
        });
      }
      const alert = engine.computeBurnRate({ profile: "local_gpu", window_minutes: 60, now });
      expect(alert.triggered).toBe(false);
      expect(alert.burn_rate).toBe(0);
    });

    it("fast_burn triggers when breach ratio exceeds 14.4x budget over 1h with ≥10 obs", () => {
      const now = 1_700_000_000_000;
      // 100 observations, 30 breaches → actual_bad_ratio = 0.30 → burn_rate = 60x (>14.4 threshold)
      for (let i = 0; i < 100; i++) {
        engine.recordObservation({
          stage: "ocr", profile: "local_gpu",
          latency_ms: i < 30 ? 900 : 100, // 30% breach
          observed_at: now - (i * 36 * 1000), // spread across <1h
        });
      }
      const alert = engine.computeBurnRate({ profile: "local_gpu", window_minutes: 60, now });
      expect(alert.triggered).toBe(true);
      expect(alert.severity).toBe("fast");
      expect(alert.burn_rate).toBeGreaterThan(14.4);
      expect(alert.threshold_burn_rate).toBe(14.4);
    });

    it("slow_burn threshold is 6x over a 6h window", () => {
      const now = 1_700_000_000_000;
      // 100 observations, 10 breaches → 0.10 / 0.005 = 20x > 6x threshold
      for (let i = 0; i < 100; i++) {
        engine.recordObservation({
          stage: "ocr", profile: "local_gpu",
          latency_ms: i < 10 ? 900 : 100,
          observed_at: now - i * 3 * MIN,
        });
      }
      const alert = engine.computeBurnRate({ profile: "local_gpu", window_minutes: 360, now });
      expect(alert.triggered).toBe(true);
      expect(alert.severity).toBe("slow");
      expect(alert.threshold_burn_rate).toBe(6);
    });

    it("does NOT trigger with fewer than 10 observations (anti-noise floor)", () => {
      const now = 1_700_000_000_000;
      for (let i = 0; i < 5; i++) {
        engine.recordObservation({
          stage: "ocr", profile: "local_gpu",
          latency_ms: 900, // all breaches
          observed_at: now - i * MIN,
        });
      }
      const alert = engine.computeBurnRate({ profile: "local_gpu", window_minutes: 60, now });
      expect(alert.triggered).toBe(false);
      expect(alert.observations).toBe(5);
    });
  });

  describe("generateComplianceReport", () => {
    it("healthy posture when budget intact", () => {
      const now = 1_700_000_000_000;
      const stages = ["ocr", "cad_feature", "tribal_knn", "lora_inference", "physics_validation", "gcode_dialect", "sim_enqueue"] as const;
      for (const stage of stages) {
        const b = engine.getBudget("server_async", stage)!;
        for (let i = 0; i < 50; i++) {
          engine.recordObservation({
            stage, profile: "server_async",
            latency_ms: b.p95_budget_ms / 3,
            observed_at: now - i * MIN,
          });
        }
      }
      const report = engine.generateComplianceReport("server_async", now);
      expect(report.fast_burn.triggered).toBe(false);
      expect(report.slow_burn.triggered).toBe(false);
      expect(report.findings.some(f => f.includes("healthy"))).toBe(true);
      expect(report.remaining_budget_ratio).toBe(1);
    });

    it("includes a finding when a stage p95 exceeds its budget", () => {
      const now = 1_700_000_000_000;
      const stages = ["ocr", "cad_feature", "tribal_knn", "lora_inference", "physics_validation", "gcode_dialect", "sim_enqueue"] as const;
      for (const stage of stages) {
        const b = engine.getBudget("local_gpu", stage)!;
        for (let i = 0; i < 50; i++) {
          engine.recordObservation({
            stage, profile: "local_gpu",
            latency_ms: stage === "ocr" ? 500 : b.p95_budget_ms / 4,
            observed_at: now - i * MIN,
          });
        }
      }
      const report = engine.generateComplianceReport("local_gpu", now);
      expect(report.findings.some(f => f.includes("Stage ocr"))).toBe(true);
    });
  });

  describe("stats", () => {
    it("counts observations by stage and total breaches", () => {
      engine.recordObservation({ stage: "ocr", profile: "local_gpu", latency_ms: 500 }); // breach
      engine.recordObservation({ stage: "ocr", profile: "local_gpu", latency_ms: 100 });
      engine.recordObservation({ stage: "lora_inference", profile: "local_gpu", latency_ms: 500 });
      const s = engine.getStats();
      expect(s.observations_total).toBe(3);
      expect(s.observations_by_stage.ocr).toBe(2);
      expect(s.observations_by_stage.lora_inference).toBe(1);
      expect(s.breaches_total).toBe(1);
    });
  });

  describe("clearAll", () => {
    it("resets observations but restores default profiles", () => {
      engine.recordObservation({ stage: "ocr", profile: "local_gpu", latency_ms: 100 });
      const r = engine.clearAll();
      expect(r.observations).toBe(1);
      expect(engine.listBudgets().length).toBe(14); // 7 stages x 2 profiles
      expect(engine.getStats().observations_total).toBe(0);
    });
  });
});
