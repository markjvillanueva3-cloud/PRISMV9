/**
 * WEDMWhatIfSimulatorEngine Tests — WEDM AGI Phase 2 / U-P2-02
 *
 * Exit gates:
 *   - <100 ms per simulate() call (counterfactual SLA)
 *   - Correct direction on every canonical chain
 */
import { describe, it, expect } from "vitest";
import {
  WEDMWhatIfSimulatorEngine,
  wedmWhatIfSimulatorEngine,
} from "../../engines/WEDMWhatIfSimulatorEngine.js";

const engine = new WEDMWhatIfSimulatorEngine();

describe("WEDMWhatIfSimulatorEngine — direction predictions", () => {
  it("↑peak_current predicts ↑Ra (direct positive effect)", () => {
    const p = engine.askAboutOutcome(
      { variable: "peak_current", delta_fraction: 0.1 },
      "Ra",
    );
    expect(p).not.toBeNull();
    expect(p!.direction).toBe("up");
    expect(p!.predicted_delta).toBeGreaterThan(0);
  });

  it("↑off_time predicts ↓mrr (via duty_cycle, composed negative)", () => {
    const p = engine.askAboutOutcome(
      { variable: "off_time", delta_fraction: 0.1 },
      "mrr",
    );
    expect(p).not.toBeNull();
    expect(p!.direction).toBe("down");
    expect(p!.predicted_delta).toBeLessThan(0);
  });

  it("↑flushing_pressure predicts ↑arc_stability (via debris_evacuation)", () => {
    const p = engine.askAboutOutcome(
      { variable: "flushing_pressure", delta_fraction: 0.2 },
      "arc_stability",
    );
    expect(p).not.toBeNull();
    expect(p!.direction).toBe("up");
  });

  it("↑wire_tension predicts ↓wire_vibration (direct negative)", () => {
    const p = engine.askAboutOutcome(
      { variable: "wire_tension", delta_fraction: 0.15 },
      "wire_vibration",
    );
    expect(p).not.toBeNull();
    expect(p!.direction).toBe("down");
  });

  it("↑taper_angle predicts ↑dimensional_error", () => {
    const p = engine.askAboutOutcome(
      { variable: "taper_angle", delta_fraction: 0.1 },
      "dimensional_error",
    );
    expect(p).not.toBeNull();
    expect(p!.direction).toBe("up");
  });

  it("↑corner_radius predicts ↓wire_deflection", () => {
    const p = engine.askAboutOutcome(
      { variable: "corner_radius", delta_fraction: 0.1 },
      "wire_deflection",
    );
    expect(p).not.toBeNull();
    expect(p!.direction).toBe("down");
  });

  it("negating Δ flips the predicted direction", () => {
    const up = engine.askAboutOutcome(
      { variable: "peak_current", delta_fraction: +0.1 },
      "Ra",
    );
    const down = engine.askAboutOutcome(
      { variable: "peak_current", delta_fraction: -0.1 },
      "Ra",
    );
    expect(up!.direction).toBe("up");
    expect(down!.direction).toBe("down");
  });
});

describe("WEDMWhatIfSimulatorEngine — magnitude + ordering", () => {
  it("predicted_delta magnitude grows with |delta_fraction|", () => {
    const small = engine.askAboutOutcome(
      { variable: "peak_current", delta_fraction: 0.05 },
      "Ra",
    );
    const big = engine.askAboutOutcome(
      { variable: "peak_current", delta_fraction: 0.3 },
      "Ra",
    );
    expect(Math.abs(big!.predicted_delta)).toBeGreaterThan(
      Math.abs(small!.predicted_delta),
    );
  });

  it("predictions sorted by descending |predicted_delta|", () => {
    const r = engine.simulate({ variable: "peak_current", delta_fraction: 0.1 });
    for (let i = 1; i < r.predictions.length; i++) {
      expect(Math.abs(r.predictions[i].predicted_delta)).toBeLessThanOrEqual(
        Math.abs(r.predictions[i - 1].predicted_delta),
      );
    }
  });

  it("min_effect_confidence filters weak chains", () => {
    const loose = engine.simulate({
      variable: "peak_current",
      delta_fraction: 0.1,
      min_effect_confidence: 0.0,
    });
    const strict = engine.simulate({
      variable: "peak_current",
      delta_fraction: 0.1,
      min_effect_confidence: 0.5,
    });
    expect(strict.predictions.length).toBeLessThanOrEqual(loose.predictions.length);
  });

  it("max_hops=1 restricts to direct children only", () => {
    const oneHop = engine.simulate({
      variable: "peak_current",
      delta_fraction: 0.1,
      max_hops: 1,
    });
    for (const p of oneHop.predictions) {
      expect(p.hops).toBe(1);
    }
  });
});

describe("WEDMWhatIfSimulatorEngine — explanation + result shape", () => {
  it("explanation starts with 'Increasing' when delta is positive", () => {
    const r = engine.simulate({ variable: "peak_current", delta_fraction: 0.1 });
    expect(r.explanation[0]).toMatch(/^Increasing/);
  });

  it("explanation starts with 'Decreasing' when delta is negative", () => {
    const r = engine.simulate({
      variable: "peak_current",
      delta_fraction: -0.1,
    });
    expect(r.explanation[0]).toMatch(/^Decreasing/);
  });

  it("askAboutOutcome returns null for unreachable outcomes", () => {
    const p = engine.askAboutOutcome(
      { variable: "peak_current", delta_fraction: 0.1 },
      "nonexistent_variable_xyz",
    );
    expect(p).toBeNull();
  });
});

describe("WEDMWhatIfSimulatorEngine — validation", () => {
  it("throws on empty variable", () => {
    expect(() => engine.simulate({ variable: "", delta_fraction: 0.1 })).toThrow(
      /variable required/,
    );
  });

  it("throws on non-finite delta_fraction", () => {
    expect(() =>
      engine.simulate({ variable: "peak_current", delta_fraction: NaN }),
    ).toThrow(/finite/);
  });

  it("throws when delta_fraction exceeds [-1,1]", () => {
    expect(() =>
      engine.simulate({ variable: "peak_current", delta_fraction: 2 }),
    ).toThrow(/\[-1, 1\]/);
  });
});

describe("WEDMWhatIfSimulatorEngine — SLA + singleton", () => {
  it("completes a single simulate() in under 100 ms (P2-MS1 exit gate)", () => {
    const r = engine.simulate({ variable: "peak_current", delta_fraction: 0.1 });
    expect(r.elapsed_ms).toBeLessThan(100);
  });

  it("exposes a singleton for dispatcher use", () => {
    expect(wedmWhatIfSimulatorEngine).toBeInstanceOf(
      WEDMWhatIfSimulatorEngine,
    );
  });
});
