/**
 * DigitalTwinEstimator.test.ts — R9 reference-value tests for the quoting-galaxy
 * digital-twin state estimator (slot:charlie, 2026-06-09). The only one of the 5
 * quoting algorithms (DigitalTwinEstimator, JobCostBomRollup, QuoteConfidenceEstimator,
 * PriceBreakOptimization, ToolLifeEconomicReplacement) lacking a co-located test.
 *
 * The complementary-filter fusion is fully deterministic, so every assertion is an
 * exact value computed by hand from the algorithm's own math — these fail if the
 * fusion weights, smoothing, anomaly gate, or agreement metric drift (not just if a
 * field is present).
 */
import { describe, it, expect } from "vitest";
import { DigitalTwinEstimator } from "./DigitalTwinEstimator.js";

const dte = new DigitalTwinEstimator();

describe("DigitalTwinEstimator.validate", () => {
  it("rejects an empty state list", () => {
    const r = dte.validate({ states: [] });
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => i.field === "states" && i.severity === "error")).toBe(true);
  });

  it("rejects a state with a blank name", () => {
    const r = dte.validate({ states: [{ name: "", model_value: 5 }] });
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => i.field === "states[0].name")).toBe(true);
  });

  it("accepts a well-formed input", () => {
    const r = dte.validate({ states: [{ name: "spindle_temp", model_value: 60 }] });
    expect(r.valid).toBe(true);
  });
});

describe("DigitalTwinEstimator.calculate", () => {
  it("model-only (no sensor): fused = model, source=model, confidence=model_confidence, deviation=0", () => {
    const out = dte.calculate({ states: [{ name: "feed", model_value: 250, model_confidence: 0.5 }] });
    const e = out.estimates[0];
    expect(e.fused_value).toBe(250);
    expect(e.source).toBe("model");
    expect(e.confidence).toBe(0.5);
    expect(e.sensor_value).toBe(null);
    expect(e.deviation_pct).toBe(0);
    expect(out.overall_health).toBe(1);
    expect(out.anomalies).toEqual([]);
    // No sensor → agreementCount 0 → metric defaults to 1.
    expect(out.model_sensor_agreement).toBe(1);
  });

  it("fused (complementary filter): exact weights from model_conf=0.5, sensor_noise=0.1", () => {
    // Closed form (hand-derived): sensorConf = 1/(1+0.1^2) = 100/101, modelConf = 1/2,
    // totalConf = 301/202 ⇒ modelWeight = 101/301, sensorWeight = 200/301 (sum = 1).
    // fused = (101·100 + 200·110)/301 = 32100/301 = 106.64451827…
    // confidence = min(1, totalConf/2) = (301/202)/2 = 301/404 = 0.74504950…
    const out = dte.calculate({ states: [{ name: "x", model_value: 100, sensor_value: 110 }] });
    const e = out.estimates[0];
    expect(e.source).toBe("fused");
    expect(e.fused_value).toBeCloseTo(32100 / 301, 9);
    expect(e.confidence).toBeCloseTo(301 / 404, 9); // min(1, totalConf/2)
    expect(e.sensor_value).toBe(110);
    expect(e.deviation_pct).toBeCloseTo(9.090909, 4); // |100-110|/110*100
    expect(out.model_sensor_agreement).toBeCloseTo(0.9, 6); // 1 - |100-110|/100
    expect(out.anomalies).toEqual([]); // 10% deviation is NOT > 10% threshold (boundary)
    expect(out.overall_health).toBe(1);
  });

  it("anomaly: model-sensor deviation above health_threshold flags + drops overall_health", () => {
    // |100-130|/100 = 0.30 → 30% > 10% default threshold → 1 anomaly of 1 state.
    const out = dte.calculate({ states: [{ name: "torque", model_value: 100, sensor_value: 130 }] });
    expect(out.anomalies.length).toBe(1);
    expect(out.anomalies[0]).toContain("torque");
    expect(out.overall_health).toBe(0); // max(0, 1 - 1/1)
    expect(out.model_sensor_agreement).toBeCloseTo(0.7, 6); // 1 - 0.30
  });

  it("temporal smoothing: fused = smoothing*prev + (1-smoothing)*current", () => {
    // model-only current = 200; prev = 100; smoothing 0.3 → 0.3*100 + 0.7*200 = 170
    const out = dte.calculate({
      states: [{ name: "rpm", model_value: 200 }],
      previous_estimates: { rpm: 100 },
      smoothing: 0.3,
    });
    expect(out.estimates[0].fused_value).toBeCloseTo(170, 6);
  });

  it("custom health_threshold turns a sub-default deviation into an anomaly", () => {
    // 9.09% model-sensor deviation, threshold lowered to 5% → flagged.
    const out = dte.calculate({
      states: [{ name: "x", model_value: 100, sensor_value: 110 }],
      health_threshold_pct: 5,
    });
    expect(out.anomalies.length).toBe(1);
    expect(out.overall_health).toBe(0);
  });
});
