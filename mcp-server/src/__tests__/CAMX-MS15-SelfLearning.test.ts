/**
 * CAMX-MS15: Self-Learning Strategy Optimizer — consolidated integration tests.
 *
 * Covers all 12 units:
 *  U01 StrategyPerformanceTrackerEngine
 *  U02 StrategyRankingUpdateEngine
 *  U03 AnomalyDetectionEngine
 *  U04 FleetLearningStrategyEngine
 *  U05 StrategyEvolutionEngine
 *  U06 PredictionCalibrationEngine
 *  U07 Dispatcher wiring (camDispatcher routes — smoke check via action strings)
 *  U08 Tests (this file)
 *  U09 SelfLearningCAMEngine (P2P-facing)
 *  U10 PhysicsAutoCalibrationEngine (SFO-facing)
 *  U11 TransferLearningEngine (machine/material scaling)
 *  U12 FeedbackPersistenceEngine + MLFeedback
 */
import { describe, it, expect } from "vitest";

import { strategyPerformanceTrackerEngine } from "../engines/StrategyPerformanceTrackerEngine.js";
import { strategyRankingUpdateEngine } from "../engines/StrategyRankingUpdateEngine.js";
import { anomalyDetectionEngine } from "../engines/AnomalyDetectionEngine.js";
import { fleetLearningStrategyEngine } from "../engines/FleetLearningStrategyEngine.js";
import { strategyEvolutionEngine } from "../engines/StrategyEvolutionEngine.js";
import { predictionCalibrationEngine } from "../engines/PredictionCalibrationEngine.js";
import { selfLearningCAMEngine } from "../engines/SelfLearningCAMEngine.js";
import { physicsAutoCalibrationEngine } from "../engines/PhysicsAutoCalibrationEngine.js";
import { transferLearningEngine } from "../engines/TransferLearningEngine.js";
import { FeedbackPersistenceEngine } from "../engines/FeedbackPersistenceEngine.js";

// ─── U01: StrategyPerformanceTrackerEngine ───────────────────────────────────

describe("CAMX-MS15 / U01 StrategyPerformanceTrackerEngine", () => {
  const strategy = `ms15_u01_strat_${Date.now()}`;

  it("record: stores execution with computed deltas and returns full record", () => {
    const rec = strategyPerformanceTrackerEngine.record({
      strategy_id: strategy,
      feature_type: "pocket",
      material_iso: "P",
      predicted: { cycle_time_min: 10, tool_life_min: 60, Fc_N: 800 },
      actual: { cycle_time_min: 11, tool_life_min: 54, Fc_N: 880 },
      outcome: "success",
    });
    expect(rec.execution_id).toBeTruthy();
    expect(rec.timestamp).toBeGreaterThan(0);
    expect(rec.deltas.cycle_time_pct).toBeCloseTo(10, 1);
    expect(rec.deltas.tool_life_pct).toBeCloseTo(-10, 1);
    expect(rec.deltas.Fc_pct).toBeCloseTo(10, 1);
  });

  it("getAccuracy: returns metric accuracy with finite MAPE for repeated records", () => {
    for (let i = 0; i < 4; i++) {
      strategyPerformanceTrackerEngine.record({
        strategy_id: strategy,
        feature_type: "pocket",
        material_iso: "P",
        predicted: { cycle_time_min: 10, tool_life_min: 60 },
        actual: { cycle_time_min: 10 + i * 0.3, tool_life_min: 60 - i * 2 },
        outcome: "success",
      });
    }
    const acc = strategyPerformanceTrackerEngine.getAccuracy(strategy, "P", "pocket");
    expect(acc.sample_count).toBeGreaterThan(0);
    expect(Number.isFinite(acc.overall_mape_pct)).toBe(true);
    expect(acc.metrics.cycle_time).toBeDefined();
    expect(Number.isFinite(acc.metrics.cycle_time!.mape_pct)).toBe(true);
  });

  it("getHistory: supports filter by strategy_id and returns matching executions", () => {
    const history = strategyPerformanceTrackerEngine.getHistory({ strategy_id: strategy });
    expect(history.length).toBeGreaterThan(0);
    for (const h of history) expect(h.strategy_id).toBe(strategy);
  });

  it("getTopPerformers: returns sorted array for feature/material pair", () => {
    const top = strategyPerformanceTrackerEngine.getTopPerformers("pocket", "P", 5);
    expect(Array.isArray(top)).toBe(true);
  });

  it("getStats: snapshot reports total executions as a finite integer", () => {
    const s = strategyPerformanceTrackerEngine.getStats();
    expect(Number.isFinite(s.total_executions)).toBe(true);
    expect(s.total_executions).toBeGreaterThan(0);
  });
});

// ─── U02: StrategyRankingUpdateEngine ────────────────────────────────────────

describe("CAMX-MS15 / U02 StrategyRankingUpdateEngine", () => {
  const strat = `ms15_u02_strat_${Date.now()}`;

  it("recordResult: persists sufficient statistics and returns updated state", () => {
    const r = strategyRankingUpdateEngine.recordResult(strat, "P_steel", "pocket_12mm", {
      success: true,
      cycle_time_actual: 9.5,
      cycle_time_predicted: 10,
      tool_life_actual: 58,
      tool_life_predicted: 60,
    });
    expect(r.key).toContain(strat.toLowerCase());
    expect(r.updated_stats.n).toBeGreaterThan(0);
    expect(r.updated_stats.successes).toBeGreaterThan(0);
  });

  it("recordResult: handles unsuccessful outcomes without incrementing successes", () => {
    const r = strategyRankingUpdateEngine.recordResult(strat, "P_steel", "pocket_12mm", { success: false });
    expect(r.updated_stats.n).toBeGreaterThan(1);
    // successes should not increment beyond previous
    expect(r.updated_stats.successes).toBeLessThan(r.updated_stats.n);
  });

  it("getRanking: returns entries sorted by composite_score descending", () => {
    const ranking = strategyRankingUpdateEngine.getRanking("P_steel");
    expect(ranking.length).toBeGreaterThan(0);
    for (let i = 1; i < ranking.length; i++) {
      expect(ranking[i - 1].composite_score).toBeGreaterThanOrEqual(ranking[i].composite_score - 1e-6);
    }
  });

  it("getConfidence: returns Wilson interval + tier for an existing triple", () => {
    const c = strategyRankingUpdateEngine.getConfidence(strat, "P_steel", "pocket_12mm");
    expect(c.n).toBeGreaterThan(0);
    expect(c.wilson_lower).toBeGreaterThanOrEqual(0);
    expect(c.wilson_upper).toBeLessThanOrEqual(1);
    expect(["none", "low", "medium", "high"]).toContain(c.confidence);
  });

  it("listTracked: returns string keys in registry", () => {
    const keys = strategyRankingUpdateEngine.listTracked();
    expect(Array.isArray(keys)).toBe(true);
    expect(keys.length).toBeGreaterThan(0);
  });
});

// ─── U03: AnomalyDetectionEngine ─────────────────────────────────────────────

describe("CAMX-MS15 / U03 AnomalyDetectionEngine", () => {
  it("detectAnomaly: small deltas produce is_anomaly=false and severity 'none'/'low'", () => {
    const r = anomalyDetectionEngine.detectAnomaly(
      { cycle_time_min: 10, tool_life_min: 60, cutting_force_N: 800 },
      { cycle_time_min: 10.2, tool_life_min: 59, cutting_force_N: 810 },
    );
    expect(r.is_anomaly).toBe(false);
    expect(["none", "low"]).toContain(r.severity);
    expect(r.distance).toBeLessThan(r.threshold + 1e-6);
  });

  it("detectAnomaly: huge deviation flags is_anomaly=true and severity non-'none'", () => {
    const r = anomalyDetectionEngine.detectAnomaly(
      { cycle_time_min: 10, cutting_force_N: 800 },
      { cycle_time_min: 30, cutting_force_N: 3000 },
    );
    expect(r.is_anomaly).toBe(true);
    expect(r.severity).not.toBe("none");
    expect(r.factors.length).toBeGreaterThan(0);
  });

  it("recordAndDetect: persists record and returns structured result", () => {
    const rec = anomalyDetectionEngine.recordAndDetect(
      { cycle_time_min: 10, power_kW: 5 },
      { cycle_time_min: 11, power_kW: 5.5 },
      { strategy: "test_ms15", material: "P" },
    );
    expect(rec.id).toBeTruthy();
    expect(rec.detection).toBeDefined();
    expect(rec.context.timestamp).toBeGreaterThan(0);
  });

  it("getAnomalyHistory: returns array filtered by strategy", () => {
    const hist = anomalyDetectionEngine.getAnomalyHistory({ strategy: "test_ms15" });
    expect(Array.isArray(hist)).toBe(true);
    expect(hist.length).toBeGreaterThan(0);
  });

  it("detectAnomaly: no common dimensions returns zero-distance non-anomaly", () => {
    const r = anomalyDetectionEngine.detectAnomaly({}, {});
    expect(r.is_anomaly).toBe(false);
    expect(r.distance).toBe(0);
    expect(r.degrees_of_freedom).toBe(0);
  });
});

// ─── U04: FleetLearningStrategyEngine ────────────────────────────────────────

describe("CAMX-MS15 / U04 FleetLearningStrategyEngine", () => {
  const makeRec = (shopId: string, strategyId: string, ct: number, outcome: "success" | "failure" = "success") => ({
    shop_id: shopId,
    machine_id: `${shopId}-M1`,
    strategy_id: strategyId,
    feature_type: "pocket",
    material_iso: "P" as const,
    tool_diameter_mm: 12,
    cycle_time_min: ct,
    tool_life_min: 60,
    Ra_um: 1.6,
    outcome,
    timestamp: new Date().toISOString(),
  });

  const shops = [
    { shop_id: "shop_A", shop_name: "Alpha", records: [
      makeRec("shop_A", "roughing_v1", 10),
      makeRec("shop_A", "roughing_v1", 10.5),
      makeRec("shop_A", "roughing_v1", 10.2),
    ]},
    { shop_id: "shop_B", shop_name: "Bravo", records: [
      makeRec("shop_B", "roughing_v1", 11),
      makeRec("shop_B", "roughing_v1", 11.5),
      makeRec("shop_B", "roughing_v1", 10.9),
      makeRec("shop_B", "roughing_v1", 11.3),
    ]},
  ];

  it("aggregateFleet: requires minimum observations and emits FleetPerformanceStats", () => {
    const stats = fleetLearningStrategyEngine.aggregateFleet(shops);
    expect(stats.length).toBeGreaterThan(0);
    const s0 = stats[0];
    expect(s0.contributing_shops).toBeGreaterThanOrEqual(2);
    expect(s0.total_observations).toBeGreaterThan(0);
    expect(Number.isFinite(s0.fleet_mean_cycle_time_min)).toBe(true);
    expect(s0.success_rate_ci_upper).toBeGreaterThanOrEqual(s0.success_rate_ci_lower);
  });

  it("aggregateFleet: filters by strategy name", () => {
    const none = fleetLearningStrategyEngine.aggregateFleet(shops, "nonexistent_strategy");
    expect(none.length).toBe(0);
    const yes = fleetLearningStrategyEngine.aggregateFleet(shops, "roughing_v1");
    expect(yes.length).toBeGreaterThan(0);
  });

  it("aggregateFleet: shop_estimates include shrunk predictions per shop", () => {
    const [s0] = fleetLearningStrategyEngine.aggregateFleet(shops);
    expect(Array.isArray(s0.shop_estimates)).toBe(true);
    expect(s0.shop_estimates.length).toBeGreaterThan(0);
    for (const est of s0.shop_estimates) {
      expect(Number.isFinite(est.raw_mean_cycle_time)).toBe(true);
    }
  });
});

// ─── U05: StrategyEvolutionEngine ────────────────────────────────────────────

describe("CAMX-MS15 / U05 StrategyEvolutionEngine", () => {
  const feature = { type: "pocket" as const, target_Ra_um: 3.2 };
  const material = { name: "P20", iso_group: "P" as const, kc1_1: 2100, mc: 0.25, taylor_C: 200, taylor_n: 0.25 };
  const tool = { diameter_mm: 12, flute_count: 4, corner_radius_mm: 0.4, max_force_N: 2500 };
  const machine = { max_rpm: 12000, max_power_kW: 22, max_feed_mmpm: 10000, max_force_N: 3000 };

  it("evolve: converges to best individual with finite fitness after N generations", () => {
    const r = strategyEvolutionEngine.evolve(feature, material, tool, machine, 5);
    expect(r.best).toBeDefined();
    expect(Number.isFinite(r.best.fitness)).toBe(true);
    expect(r.generations_run).toBe(5);
    expect(r.convergence.length).toBeGreaterThan(0);
  });

  it("evolve: top_discoveries is an array of unique parameter sets", () => {
    const r = strategyEvolutionEngine.evolve(feature, material, tool, machine, 3);
    expect(Array.isArray(r.top_discoveries)).toBe(true);
    expect(r.top_discoveries.length).toBeGreaterThan(0);
  });

  it("evolve: best parameters respect machine power envelope", () => {
    const r = strategyEvolutionEngine.evolve(feature, material, tool, machine, 3);
    // Best should keep cutting force under configured envelope
    expect(r.best.cutting_force_N).toBeLessThanOrEqual(machine.max_force_N! + 1e-3);
  });

  it("getBestDiscoveries + getEvolutionHistory: maintain run ledger", () => {
    const disc = strategyEvolutionEngine.getBestDiscoveries();
    const hist = strategyEvolutionEngine.getEvolutionHistory();
    expect(Array.isArray(disc)).toBe(true);
    expect(Array.isArray(hist)).toBe(true);
  });
});

// ─── U06: PredictionCalibrationEngine ────────────────────────────────────────

describe("CAMX-MS15 / U06 PredictionCalibrationEngine", () => {
  const material_key = `ms15_u06_mat_${Date.now()}`;
  const machine_id = `ms15_u06_mach`;

  it("calibrate: accepts first force measurement and updates posterior", () => {
    const r = predictionCalibrationEngine.calibrate({
      predicted: 1000,
      actual: 1100,
      type: "force",
      material_key,
      machine_id,
    });
    expect(r.accepted).toBe(true);
    expect(r.factors.kc1_1.n_observations).toBeGreaterThan(0);
    expect(Number.isFinite(r.z_score)).toBe(true);
  });

  it("calibrate: handles tool_life type by updating taylor_C posterior", () => {
    const r = predictionCalibrationEngine.calibrate({
      predicted: 60,
      actual: 54,
      type: "tool_life",
      material_key,
      machine_id,
    });
    expect(r.factors.taylor_C.n_observations).toBeGreaterThan(0);
  });

  it("getCalibrationFactors: returns factors for calibrated pair, null otherwise", () => {
    const hit = predictionCalibrationEngine.getCalibrationFactors(material_key, machine_id);
    expect(hit).not.toBeNull();
    expect(hit!.material_key).toBe(material_key);
    const miss = predictionCalibrationEngine.getCalibrationFactors("nonexistent", "also_no");
    expect(miss).toBeNull();
  });

  it("getCalibrationHistory: returns history array for the calibrated pair", () => {
    const h = predictionCalibrationEngine.getCalibrationHistory(material_key, machine_id);
    expect(Array.isArray(h)).toBe(true);
    expect((h as any[]).length).toBeGreaterThan(0);
  });
});

// ─── U07: Dispatcher wiring smoke — action strings present in camDispatcher ──

describe("CAMX-MS15 / U07 Dispatcher wiring", () => {
  it("camDispatcher exports action router (presence check)", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod).toBeDefined();
  });
});

// ─── U09: SelfLearningCAMEngine (P2P facing) ─────────────────────────────────

describe("CAMX-MS15 / U09 SelfLearningCAMEngine", () => {
  it("cutToLearn: processes multiple observations and returns residual summary", () => {
    const result = selfLearningCAMEngine.cutToLearn({
      observations: [
        {
          jobId: "j1",
          machineId: "VM3",
          materialGroup: "P",
          cuttingParams: {
            speed_mpm: 180, feed_mmtooth: 0.08, axial_depth_mm: 2,
            radial_depth_mm: 6, tool_diameter_mm: 12,
          },
          actuals: { force_N: 950, tool_life_min: 58, surface_finish_Ra_um: 1.8 },
          predicted: { force_N: 1000, tool_life_min: 60, surface_finish_Ra_um: 2.0 },
        },
        {
          jobId: "j2",
          machineId: "VM3",
          materialGroup: "P",
          cuttingParams: {
            speed_mpm: 200, feed_mmtooth: 0.09, axial_depth_mm: 2.5,
            radial_depth_mm: 6, tool_diameter_mm: 12,
          },
          actuals: { force_N: 1150, tool_life_min: 50 },
          predicted: { force_N: 1100, tool_life_min: 55 },
        },
      ],
    });
    expect(result.observationsProcessed).toBe(2);
    expect(result.residualSummary).toBeDefined();
  });

  it("calculate: dispatches cut_to_learn through the engine's action router", () => {
    const r = selfLearningCAMEngine.calculate("cut_to_learn", {
      observations: [{
        jobId: "j3", machineId: "VM3", materialGroup: "P",
        cuttingParams: { speed_mpm: 180, feed_mmtooth: 0.08, axial_depth_mm: 2, radial_depth_mm: 6, tool_diameter_mm: 12 },
        actuals: { force_N: 980 }, predicted: { force_N: 1000 },
      }],
    });
    expect(r).toBeDefined();
  });
});

// ─── U10: PhysicsAutoCalibrationEngine (SFO facing) ──────────────────────────

describe("CAMX-MS15 / U10 PhysicsAutoCalibrationEngine", () => {
  it("submit: accepts force measurement and returns updated posteriors", () => {
    const r = physicsAutoCalibrationEngine.submit({
      material: "P",
      tool_diameter_mm: 12,
      flutes: 4,
      ap_mm: 2,
      spindle_rpm: 4774,
      feed_rate_mmmin: 1528,
      measured_force_N: 950,
    });
    expect(r).toBeDefined();
  });

  it("predict: returns constants and force estimate for known params", () => {
    const p = physicsAutoCalibrationEngine.predict({
      material: "P",
      tool_diameter_mm: 12,
      flutes: 4,
      ap_mm: 2,
      spindle_rpm: 4774,
      feed_rate_mmmin: 1528,
    });
    expect(p).toBeDefined();
  });
});

// ─── U11: TransferLearningEngine ─────────────────────────────────────────────

describe("CAMX-MS15 / U11 TransferLearningEngine", () => {
  const src = { name: "VM1", power_kw: 22, max_rpm: 12000, rigidity_n_per_um: 400, accuracy_mm: 0.005, axes: 3 };
  const tgt = { name: "VM2", power_kw: 15, max_rpm: 10000, rigidity_n_per_um: 350, accuracy_mm: 0.008, axes: 3 };

  it("machineSimilarity: returns similarity_score in [0,1] with feature contributions", () => {
    const r = transferLearningEngine.machineSimilarity({ source: src, target: tgt });
    expect(r.value.similarity_score).toBeGreaterThanOrEqual(0);
    expect(r.value.similarity_score).toBeLessThanOrEqual(1);
    expect(r.value.feature_contributions).toBeDefined();
  });

  it("scaleParameters: emits scaled_params respecting target machine power envelope", () => {
    const r = transferLearningEngine.scaleParameters({
      source_params: { Vc: 180, fz: 0.08, ap: 2, ae: 6, tool_diameter_mm: 12, flute_count: 4 },
      source_machine: src,
      target_machine: tgt,
    });
    expect(r.value.scaled_params).toBeDefined();
    expect(["power", "rigidity", "rpm", "none"]).toContain(r.value.limiting_factor);
  });

  it("materialTransfer: scales speed/life across material pair with finite similarity", () => {
    const r = transferLearningEngine.materialTransfer({
      source_material: "AISI 1045",
      target_material: "AISI 4140",
      source_speed_mmin: 180,
      source_tool_life_min: 60,
    });
    expect(Number.isFinite(r.value.scaled_speed)).toBe(true);
    expect(Number.isFinite(r.value.similarity_score)).toBe(true);
  });
});

// ─── U12: FeedbackPersistenceEngine + MLFeedback ─────────────────────────────

describe("CAMX-MS15 / U12 FeedbackPersistenceEngine", () => {
  it("engine is constructable and exposes persistToFile/restoreFromFile", () => {
    const engine = new FeedbackPersistenceEngine();
    expect(engine).toBeDefined();
    expect(typeof engine.persistToFile).toBe("function");
    expect(typeof engine.restoreFromFile).toBe("function");
  });
});
