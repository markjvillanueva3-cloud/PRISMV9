/**
 * Batch 78 — ExponentialSmoothing, PrincipalComponent, ClusterAnalysis
 * @milestone FORGE-ENGINES-BATCH78
 */
import { describe, it, expect } from "vitest";
import { exponentialSmoothingEngine } from "../engines/ExponentialSmoothingEngine.js";
import { principalComponentEngine } from "../engines/PrincipalComponentEngine.js";
import { clusterAnalysisEngine } from "../engines/ClusterAnalysisEngine.js";

describe("ExponentialSmoothingEngine", () => {
  const data = [10, 12, 13, 15, 14, 16, 18, 17, 19, 20];
  const base = { data };
  it("forecast > 0", () => {
    expect(exponentialSmoothingEngine.calculate(base).forecast_next.value).toBeGreaterThan(0);
  });
  it("alpha between 0 and 1", () => {
    const a = exponentialSmoothingEngine.calculate(base).alpha_used.value;
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(1);
  });
  it("MSE > 0", () => {
    expect(exponentialSmoothingEngine.calculate(base).mse.value).toBeGreaterThan(0);
  });
  it("Holt detects trend", () => {
    const r = exponentialSmoothingEngine.calculate({ ...base, method: "holt" });
    expect(r.trend.value).toBeGreaterThan(0);
  });
  it("MAPE < 100%", () => {
    expect(exponentialSmoothingEngine.calculate(base).mape_pct.value).toBeLessThan(100);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(exponentialSmoothingEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("PrincipalComponentEngine", () => {
  // Correlated 3D data
  const data = Array.from({ length: 50 }, (_, i) => [i + Math.random(), i * 0.8 + Math.random(), Math.random() * 5]);
  const base = { data };
  it("PC1 explains most variance", () => {
    expect(principalComponentEngine.calculate(base).first_pc_variance_pct.value).toBeGreaterThan(30);
  });
  it("total explained ≤ 100%", () => {
    expect(principalComponentEngine.calculate(base).total_variance_explained_pct.value).toBeLessThanOrEqual(101);
  });
  it("kaiser components ≤ num variables", () => {
    expect(principalComponentEngine.calculate(base).kaiser_components.value).toBeLessThanOrEqual(3);
  });
  it("condition number > 1", () => {
    expect(principalComponentEngine.calculate(base).condition_number.value).toBeGreaterThanOrEqual(1);
  });
  it("num variables = 3", () => {
    expect(principalComponentEngine.calculate(base).num_variables.value).toBe(3);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(principalComponentEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("ClusterAnalysisEngine", () => {
  // 3 distinct clusters
  const data = [
    ...Array.from({ length: 20 }, () => [1 + Math.random() * 0.5, 1 + Math.random() * 0.5]),
    ...Array.from({ length: 20 }, () => [5 + Math.random() * 0.5, 5 + Math.random() * 0.5]),
    ...Array.from({ length: 20 }, () => [9 + Math.random() * 0.5, 1 + Math.random() * 0.5]),
  ];
  const base = { data, k: 3 };
  it("finds 3 clusters", () => {
    expect(clusterAnalysisEngine.calculate(base).num_clusters.value).toBe(3);
  });
  it("silhouette > 0 for well-separated data", () => {
    expect(clusterAnalysisEngine.calculate(base).silhouette_score.value).toBeGreaterThan(0);
  });
  it("between variance > 50%", () => {
    expect(clusterAnalysisEngine.calculate(base).between_variance_pct.value).toBeGreaterThan(50);
  });
  it("inertia > 0", () => {
    expect(clusterAnalysisEngine.calculate(base).inertia.value).toBeGreaterThan(0);
  });
  it("iterations > 0", () => {
    expect(clusterAnalysisEngine.calculate(base).iterations_used.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(clusterAnalysisEngine.calculate(base).recommendations)).toBe(true);
  });
});
