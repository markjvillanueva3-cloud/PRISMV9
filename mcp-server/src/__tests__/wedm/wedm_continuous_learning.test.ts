/**
 * WEDMContinuousLearningEngine — WEDM AGI Phase 3 / P3-MS1 / U-P3-01 tests.
 *
 * Exit gates covered:
 *   - Ingest-to-settle latency strictly under the 30 s P3-MS1 budget.
 *   - Ra/time signal routes through Bayesian calibration.
 *   - Wire-break events drive a monotonic Weibull scale update.
 *   - Operator adjustments build an EMA preference per parameter.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WEDMContinuousLearningEngine,
  wedmContinuousLearningEngine,
  type LearningSignal,
} from "../../engines/WEDMContinuousLearningEngine.js";
import { wedmFeedbackCalibrationEngine } from "../../engines/WEDMFeedbackCalibrationEngine.js";

function fresh() {
  wedmFeedbackCalibrationEngine.reset_calibration("D2");
  wedmFeedbackCalibrationEngine.reset_calibration("A2");
  wedmFeedbackCalibrationEngine.reset_calibration("WC");
  const engine = new WEDMContinuousLearningEngine();
  return engine;
}

describe("WEDMContinuousLearningEngine — exit gate (P3-MS1)", () => {
  it("singleton is exported and usable", () => {
    expect(wedmContinuousLearningEngine).toBeInstanceOf(WEDMContinuousLearningEngine);
  });

  it("settles a Ra/time ingest within the 30 s budget", () => {
    const engine = fresh();
    const sig: LearningSignal = {
      kind: "ra_time",
      material: "D2",
      raTime: {
        material: "D2",
        thickness_mm: 12,
        predicted_ra_um: 1.6,
        actual_ra_um: 1.82,
        predicted_time_min: 45,
        actual_time_min: 50,
      },
    };
    const r = engine.ingest(sig);
    expect(r.accepted).toBe(true);
    expect(r.withinBudget).toBe(true);
    expect(r.latency_ms).toBeLessThan(30_000);
  });
});

describe("WEDMContinuousLearningEngine — ra_time route", () => {
  beforeEach(() => {
    wedmFeedbackCalibrationEngine.reset_calibration("D2");
  });

  it("routes to Bayesian calibration and returns feedback payload", () => {
    const engine = fresh();
    const r = engine.ingest({
      kind: "ra_time",
      material: "D2",
      raTime: {
        material: "D2",
        thickness_mm: 12,
        predicted_ra_um: 1.6,
        actual_ra_um: 2.0,
        predicted_time_min: 40,
        actual_time_min: 46,
      },
    });
    expect(r.accepted).toBe(true);
    expect(r.feedback).toBeDefined();
    expect(r.feedback!.accepted).toBe(true);
    expect(r.feedback!.ra_flagged).toBe(true);
  });

  it("rejects payload with non-positive predictions", () => {
    const engine = fresh();
    const r = engine.ingest({
      kind: "ra_time",
      material: "D2",
      raTime: {
        material: "D2",
        thickness_mm: 12,
        predicted_ra_um: 0,
        actual_ra_um: 2.0,
        predicted_time_min: 40,
        actual_time_min: 46,
      },
    });
    expect(r.accepted).toBe(false);
    expect(r.error).toBeDefined();
  });

  it("rejects ra_time kind without payload", () => {
    const engine = fresh();
    const r = engine.ingest({ kind: "ra_time", material: "D2" });
    expect(r.accepted).toBe(false);
    expect(r.error).toContain("missing");
  });
});

describe("WEDMContinuousLearningEngine — wire_break route (Weibull)", () => {
  it("seeds Weibull from a single break event", () => {
    const engine = fresh();
    const r = engine.ingest({
      kind: "wire_break",
      material: "D2",
      wireBreak: { elapsed_life_min: 70 },
    });
    expect(r.accepted).toBe(true);
    expect(r.weibull).toBeDefined();
    expect(r.weibull!.samples).toBe(1);
    expect(r.weibull!.shape).toBeGreaterThan(0);
    expect(r.weibull!.scale).toBeGreaterThan(0);
  });

  it("monotonically reduces Weibull scale under repeated short-life events", () => {
    const engine = fresh();
    let prev = Infinity;
    for (let i = 0; i < 6; i++) {
      const r = engine.ingest({
        kind: "wire_break",
        material: "D2",
        wireBreak: { elapsed_life_min: 30 }, // shorter than default 90 scale
      });
      expect(r.accepted).toBe(true);
      const scale = r.weibull!.scale;
      expect(scale).toBeLessThanOrEqual(prev + 1e-6);
      prev = scale;
    }
    expect(prev).toBeLessThan(90);
  });

  it("caps per-event influence at ±30 % of the running mean", () => {
    const engine = fresh();
    // One very long-life event — the cap should prevent >30 % jump on mean.
    const r = engine.ingest({
      kind: "wire_break",
      material: "D2",
      wireBreak: { elapsed_life_min: 10_000 },
    });
    expect(r.accepted).toBe(true);
    // scale starts at 90 with mean ≈ 90 · Γ(1.5) ≈ 79.77; capped 1.30× on
    // the blended update → scale should be well under 200.
    expect(r.weibull!.scale).toBeLessThan(200);
  });

  it("rejects non-positive elapsed life", () => {
    const engine = fresh();
    const r = engine.ingest({
      kind: "wire_break",
      material: "D2",
      wireBreak: { elapsed_life_min: 0 },
    });
    expect(r.accepted).toBe(false);
  });
});

describe("WEDMContinuousLearningEngine — operator_adjustment route", () => {
  it("records bias and magnitude from a single adjustment", () => {
    const engine = fresh();
    const r = engine.ingest({
      kind: "operator_adjustment",
      material: "D2",
      operatorAdjustment: {
        parameter: "peak_current_A",
        suggested: 8,
        actual: 9,
        outcome: "faster",
      },
    });
    expect(r.accepted).toBe(true);
    expect(r.preference).toBeDefined();
    expect(r.preference!.parameter).toBe("peak_current_A");
    expect(r.preference!.bias).toBeCloseTo(1.0, 6);
    expect(r.preference!.magnitude).toBeCloseTo(1.0, 6);
    expect(r.preference!.samples).toBe(1);
  });

  it("EMA averages successive adjustments", () => {
    const engine = fresh();
    engine.ingest({
      kind: "operator_adjustment",
      material: "D2",
      operatorAdjustment: { parameter: "pulse_on_us", suggested: 10, actual: 12 },
    });
    const r = engine.ingest({
      kind: "operator_adjustment",
      material: "D2",
      operatorAdjustment: { parameter: "pulse_on_us", suggested: 10, actual: 14 },
    });
    // first bias = +2, second: 2*0.8 + 4*0.2 = 2.4
    expect(r.preference!.bias).toBeCloseTo(2.4, 3);
    expect(r.preference!.samples).toBe(2);
  });

  it("rejects missing parameter name", () => {
    const engine = fresh();
    const r = engine.ingest({
      kind: "operator_adjustment",
      material: "D2",
      operatorAdjustment: { parameter: "", suggested: 8, actual: 9 },
    });
    expect(r.accepted).toBe(false);
  });
});

describe("WEDMContinuousLearningEngine — snapshot + history", () => {
  it("snapshot reflects all three signal sources for one material", () => {
    const engine = fresh();
    engine.ingest({
      kind: "ra_time",
      material: "D2",
      raTime: {
        material: "D2",
        thickness_mm: 12,
        predicted_ra_um: 1.6,
        actual_ra_um: 1.9,
        predicted_time_min: 40,
        actual_time_min: 46,
      },
    });
    engine.ingest({
      kind: "wire_break",
      material: "D2",
      wireBreak: { elapsed_life_min: 55 },
    });
    engine.ingest({
      kind: "operator_adjustment",
      material: "D2",
      operatorAdjustment: { parameter: "peak_current_A", suggested: 8, actual: 7.5 },
    });

    const snap = engine.snapshot("D2");
    expect(snap.totalSignals).toBe(3);
    expect(snap.weibull).not.toBeNull();
    expect(snap.weibull!.samples).toBe(1);
    expect(snap.preferences.peak_current_A.samples).toBe(1);
    expect(snap.calibration.samples).toBeGreaterThanOrEqual(5);
  });

  it("getHistory returns most-recent-first results", () => {
    const engine = fresh();
    engine.ingest({
      kind: "wire_break",
      material: "D2",
      wireBreak: { elapsed_life_min: 60 },
    });
    engine.ingest({
      kind: "wire_break",
      material: "A2",
      wireBreak: { elapsed_life_min: 50 },
    });
    const h = engine.getHistory();
    expect(h).toHaveLength(2);
    expect(h[0].signal.material).toBe("A2");
    expect(h[1].signal.material).toBe("D2");
  });

  it("reset clears only the specified material", () => {
    const engine = fresh();
    engine.ingest({
      kind: "wire_break",
      material: "D2",
      wireBreak: { elapsed_life_min: 60 },
    });
    engine.ingest({
      kind: "wire_break",
      material: "A2",
      wireBreak: { elapsed_life_min: 60 },
    });
    engine.reset("D2");
    expect(engine.snapshot("D2").weibull).toBeNull();
    expect(engine.snapshot("A2").weibull).not.toBeNull();
  });

  it("stats aggregates across materials", () => {
    const engine = fresh();
    engine.ingest({
      kind: "wire_break",
      material: "D2",
      wireBreak: { elapsed_life_min: 60 },
    });
    engine.ingest({
      kind: "wire_break",
      material: "WC",
      wireBreak: { elapsed_life_min: 40 },
    });
    const s = engine.stats();
    expect(s.materials).toBe(2);
    expect(s.signals).toBe(2);
    expect(Object.keys(s.weibull).sort()).toEqual(["d2", "wc"]);
  });
});

describe("WEDMContinuousLearningEngine — batch ingest", () => {
  it("processes a mixed batch and returns one result per signal", () => {
    const engine = fresh();
    const out = engine.ingestBatch([
      {
        kind: "wire_break",
        material: "D2",
        wireBreak: { elapsed_life_min: 55 },
      },
      {
        kind: "operator_adjustment",
        material: "D2",
        operatorAdjustment: { parameter: "pulse_on_us", suggested: 10, actual: 11 },
      },
      {
        kind: "ra_time",
        material: "D2",
        raTime: {
          material: "D2",
          thickness_mm: 12,
          predicted_ra_um: 1.6,
          actual_ra_um: 1.7,
          predicted_time_min: 40,
          actual_time_min: 42,
        },
      },
    ]);
    expect(out).toHaveLength(3);
    expect(out.every((r) => r.accepted)).toBe(true);
    expect(out.every((r) => r.latency_ms < 30_000)).toBe(true);
  });
});
