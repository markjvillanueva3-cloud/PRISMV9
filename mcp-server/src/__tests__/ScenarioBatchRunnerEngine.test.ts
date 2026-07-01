/**
 * Tests for ScenarioBatchRunnerEngine — JM-DIE-QUOTE-TRAINING-MS0 / U-QT08.
 */
import { describe, it, expect } from "vitest";
import { ScenarioBatchRunnerEngine } from "../engines/ScenarioBatchRunnerEngine.js";

const runner = new ScenarioBatchRunnerEngine();

describe("ScenarioBatchRunnerEngine.run — base behavior", () => {
  it("count=0 → ok=false reason='count-must-be-positive-integer'", () => {
    const r = runner.run({ count: 0 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("count-must-be-positive-integer");
  });

  it("100 scenarios produce ≥80% quoted (most should pass FMV math) + sums to total", () => {
    const r = runner.run({ count: 100, seed: 42, asOfIsoDate: "2024-06-15" });
    expect(r.ok).toBe(true);
    expect(r.total_scenarios).toBe(100);
    expect(r.quoted + r.failed).toBe(100);
    expect(r.quoted).toBeGreaterThanOrEqual(80);
  });

  it("by_process_mape sums to quoted count across all 4 processes", () => {
    const r = runner.run({ count: 200, seed: 7, asOfIsoDate: "2024-06-15" });
    const sum = r.by_process_mape.mill.count + r.by_process_mape.lathe.count
              + r.by_process_mape.wedm.count + r.by_process_mape.sinker_edm.count;
    expect(sum).toBe(r.quoted);
  });

  it("by_material_mape sums to quoted count across all 4 materials", () => {
    const r = runner.run({ count: 200, seed: 7, asOfIsoDate: "2024-06-15" });
    const sum = r.by_material_mape.aluminum_6061.count + r.by_material_mape.steel_a36.count
              + r.by_material_mape.stainless_304.count + r.by_material_mape.copper_c110.count;
    expect(sum).toBe(r.quoted);
  });

  it("outsource_distribution sums match quoted count (every quote gets a recommendation)", () => {
    const r = runner.run({ count: 100, seed: 99, asOfIsoDate: "2024-06-15", shopLoadingPct: 50 });
    const dist = r.outsource_distribution["in-house"] + r.outsource_distribution.outsource + r.outsource_distribution["toss-up"];
    expect(dist).toBe(r.quoted);
  });
});

describe("ScenarioBatchRunnerEngine.run — determinism (R10 reproducibility)", () => {
  it("same seed → identical aggregate metrics across two runs", () => {
    const a = runner.run({ count: 200, seed: 12345, asOfIsoDate: "2024-06-15" });
    const b = runner.run({ count: 200, seed: 12345, asOfIsoDate: "2024-06-15" });
    expect(a.quoted).toBe(b.quoted);
    expect(a.aggregate_metrics.mean_fmv_per_part_usd).toBe(b.aggregate_metrics.mean_fmv_per_part_usd);
    expect(a.aggregate_metrics.mean_time_in_cut_s).toBe(b.aggregate_metrics.mean_time_in_cut_s);
    expect(a.by_process_mape.mill.mean_fmv_usd).toBe(b.by_process_mape.mill.mean_fmv_usd);
  });

  it("different seeds → different aggregates (statistical sanity)", () => {
    const a = runner.run({ count: 100, seed: 1, asOfIsoDate: "2024-06-15" });
    const b = runner.run({ count: 100, seed: 9999, asOfIsoDate: "2024-06-15" });
    expect(a.aggregate_metrics.mean_fmv_per_part_usd).not.toBe(b.aggregate_metrics.mean_fmv_per_part_usd);
  });
});

describe("ScenarioBatchRunnerEngine.run — per-process MAPE characteristics", () => {
  it("WEDM mean_time_s is MUCH higher than mill (12× MRR gap)", () => {
    const r = runner.run({ count: 500, seed: 2026, asOfIsoDate: "2024-06-15" });
    // both processes must have samples in 500
    expect(r.by_process_mape.mill.count).toBeGreaterThan(50);
    expect(r.by_process_mape.wedm.count).toBeGreaterThan(50);
    expect(r.by_process_mape.wedm.mean_time_s).toBeGreaterThan(r.by_process_mape.mill.mean_time_s);
  });
});

describe("ScenarioBatchRunnerEngine.run — outcomes capture toggle", () => {
  it("includeOutcomes=false (default) → outcomes array is empty", () => {
    const r = runner.run({ count: 50, seed: 1, asOfIsoDate: "2024-06-15" });
    expect(r.outcomes.length).toBe(0);
  });

  it("includeOutcomes=true → outcomes.length == total_scenarios with valid shape", () => {
    const r = runner.run({ count: 25, seed: 1, asOfIsoDate: "2024-06-15", includeOutcomes: true });
    expect(r.outcomes.length).toBe(25);
    for (const o of r.outcomes) {
      expect(typeof o.index).toBe("number");
      expect(o.inputs.material.length).toBeGreaterThan(0);
      if (o.ok) {
        expect(o.fmv_per_part_usd).not.toBeNull();
        expect((o.fmv_per_part_usd as number) > 0).toBe(true);
      }
    }
  });
});

describe("ScenarioBatchRunnerEngine.run — capacity rule wired through", () => {
  it("shopLoadingPct=95 + rush jobs → more outsource recommendations than at 30% loading", () => {
    const heavy = runner.run({ count: 500, seed: 555, asOfIsoDate: "2024-06-15", shopLoadingPct: 95 });
    const light = runner.run({ count: 500, seed: 555, asOfIsoDate: "2024-06-15", shopLoadingPct: 30 });
    expect(heavy.outsource_distribution.outsource).toBeGreaterThan(light.outsource_distribution.outsource);
  });
});

describe("ScenarioBatchRunnerEngine.run — scale capability", () => {
  it("10K scenarios complete + produce coherent aggregate metrics", () => {
    const r = runner.run({ count: 10000, seed: 2026, asOfIsoDate: "2024-06-15" });
    expect(r.ok).toBe(true);
    expect(r.total_scenarios).toBe(10000);
    expect(r.quoted).toBeGreaterThan(9000);     // ≥90% should quote
    expect(r.aggregate_metrics.mean_fmv_per_part_usd).toBeGreaterThan(0);
    expect(r.aggregate_metrics.total_revenue_simulated_usd).toBeGreaterThan(0);
  });
});
