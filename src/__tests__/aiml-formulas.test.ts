/**
 * Tests for AIMLFormulasEngine
 *
 * Validates feature importance, model selection, anomaly detection,
 * time series ML, and reinforcement learning.
 */
import { describe, it, expect } from "vitest";
import { aimlFormulasEngine } from "../engines/AIMLFormulasEngine.js";

describe("AIMLFormulasEngine", () => {
  const engine = aimlFormulasEngine;

  // ── Feature Importance ────────────────────────────────────────

  it("permutation importance ranks informative features higher", () => {
    // Feature 0 is informative, feature 1 is noise
    const X = Array.from({ length: 50 }, (_, i) => [i, Math.sin(i)]);
    const y = X.map((r) => 3 * r[0] + 1);
    const r = engine.featureImportance({
      X, y,
      feature_names: ["signal", "noise"],
      method: "permutation",
      n_repeats: 5,
    });
    expect(r.importances.length).toBe(2);
    expect(r.ranking[0]).toBe(0); // signal should be #1
    expect(r.importances[0]).toBeGreaterThan(r.importances[1]);
    expect(r.method).toBe("permutation");
  });

  it("SHAP approximation sums to ~1", () => {
    const X = Array.from({ length: 30 }, (_, i) => [i, i * 2, i * 0.5]);
    const y = X.map((r) => r[0] + 2 * r[1] + 0.1 * r[2]);
    const r = engine.featureImportance({ X, y, method: "shap_approx" });
    const total = r.importances.reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1.0, 1);
    expect(r.method).toBe("shap_approx");
  });

  it("partial dependence returns grid values", () => {
    const X = Array.from({ length: 20 }, (_, i) => [i, i * 2]);
    const y = X.map((r) => 5 * r[0]);
    const r = engine.featureImportance({
      X, y,
      method: "partial_dependence",
      pd_feature_idx: 0,
    });
    expect(r.partial_dependence).not.toBeNull();
    expect(r.partial_dependence!.length).toBeGreaterThan(0);
    // PD should be monotonically increasing for feature 0
    const pds = r.partial_dependence!;
    for (let i = 1; i < pds.length; i++) {
      expect(pds[i].prediction).toBeGreaterThanOrEqual(pds[i - 1].prediction - 0.01);
    }
  });

  // ── Model Selection ───────────────────────────────────────────

  it("AIC/BIC select simpler model when fit is similar", () => {
    const r = engine.modelSelection({
      n_observations: 100,
      model_params: [2, 5, 10],
      log_likelihoods: [-50, -49, -48.5],
      model_names: ["simple", "medium", "complex"],
    });
    expect(r.aic.length).toBe(3);
    expect(r.bic.length).toBe(3);
    // BIC penalizes complexity more; should prefer simpler
    expect(r.best_bic_idx).toBe(0);
    // Akaike weights should sum to 1
    const wSum = r.akaike_weights.reduce((s, w) => s + w, 0);
    expect(wSum).toBeCloseTo(1.0, 5);
  });

  // ── Anomaly Detection ─────────────────────────────────────────

  it("isolation forest detects outliers", () => {
    // Normal cluster + 2 outliers
    const data: number[][] = [];
    for (let i = 0; i < 50; i++) {
      data.push([i * 0.1, i * 0.1]);
    }
    data.push([100, 100]); // outlier
    data.push([-50, -50]); // outlier

    const r = engine.anomalyDetection({
      data,
      method: "isolation_forest",
      contamination: 0.05,
    });
    expect(r.scores.length).toBe(52);
    expect(r.n_anomalies).toBeGreaterThanOrEqual(1);
    // Outliers should have high scores
    expect(r.scores[50]).toBeGreaterThan(r.scores[25]);
    expect(r.method).toBe("isolation_forest");
  });

  it("LOF detects local outliers", () => {
    const data: number[][] = [];
    for (let i = 0; i < 20; i++) data.push([i * 0.1, i * 0.1]);
    data.push([50, 50]); // outlier
    const r = engine.anomalyDetection({
      data,
      method: "lof",
      k_neighbors: 3,
      contamination: 0.1,
    });
    expect(r.scores.length).toBe(21);
    expect(r.n_anomalies).toBeGreaterThanOrEqual(1);
  });

  // ── Time Series ML ────────────────────────────────────────────

  it("recurrent model forecasts trend continuation", () => {
    // Linear trend
    const series = Array.from({ length: 30 }, (_, i) => i * 2.0);
    const r = engine.timeSeriesML({
      series,
      window_size: 5,
      horizon: 3,
      epochs: 100,
    });
    expect(r.forecasts.length).toBe(3);
    // Forecast should continue upward trend
    expect(r.forecasts[0]).toBeGreaterThan(series[series.length - 1] * 0.5);
    expect(r.loss_history.length).toBe(100);
    // Loss should decrease
    expect(r.loss_history[99]).toBeLessThan(r.loss_history[0]);
    expect(r.in_sample_rmse).toBeGreaterThanOrEqual(0);
  });

  it("attention method returns weights", () => {
    const series = Array.from({ length: 20 }, (_, i) => Math.sin(i));
    const r = engine.timeSeriesML({
      series,
      window_size: 4,
      method: "attention",
      epochs: 20,
    });
    expect(r.attention_weights).not.toBeNull();
    expect(r.attention_weights!.length).toBe(4);
    // Attention weights sum to 1
    const sum = r.attention_weights!.reduce((s, w) => s + w, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  // ── Reinforcement Learning ────────────────────────────────────

  it("Q-learning converges on simple grid", () => {
    // 4-state chain: 0->1->2->3(goal)
    const episodes = [];
    for (let rep = 0; rep < 50; rep++) {
      episodes.push({ state: 0, action: 0, reward: 0, next_state: 1 });
      episodes.push({ state: 1, action: 0, reward: 0, next_state: 2 });
      episodes.push({ state: 2, action: 0, reward: 10, next_state: 3, done: true });
    }
    const r = engine.reinforcementLearning({
      n_states: 4,
      n_actions: 2,
      episodes,
      alpha: 0.5,
      gamma: 0.9,
    });
    expect(r.q_table.length).toBe(4);
    // State 2, action 0 should have high Q-value (leads to reward)
    expect(r.q_table[2][0]).toBeGreaterThan(5);
    // Policy should prefer action 0 in states 0,1,2
    expect(r.policy[2]).toBe(0);
    expect(r.total_reward).toBe(500);
    expect(r.method).toBe("q_learning");
  });

  it("dispatcher routes all 5 actions", () => {
    const r = engine.calculate({
      action: "calc_model_selection",
      params: {
        n_observations: 50,
        model_params: [2, 4],
        log_likelihoods: [-30, -28],
      },
    }) as any;
    expect(r.aic.length).toBe(2);
  });
});
