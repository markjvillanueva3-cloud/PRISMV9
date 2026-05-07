/**
 * CrossProcessDriftDetectorEngine.test.ts — XPROC-NEURAL Tier 3 (T3-02)
 *
 * Verifies DDM, EDDM, and ADWIN drift detection algorithms operate per
 * Gama 2004, Baena-García 2006, and Bifet & Gavaldà 2007 respectively, with
 * the 95% step-change recall acceptance criterion from XPROC-NEURAL-ROADMAP.md
 * Tier 3 R2.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CrossProcessDriftDetectorEngine,
  crossProcessDriftDetector,
  type DetectorVerdict,
} from "../engines/CrossProcessDriftDetectorEngine.js";

beforeEach(() => CrossProcessDriftDetectorEngine.reset());

/** Seedable PRNG so step-change tests are reproducible. Mulberry32. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("input validation", () => {
  it("rejects non-binary error value", () => {
    const r = CrossProcessDriftDetectorEngine.observe({ error: 0.5 });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects NaN error", () => {
    const r = CrossProcessDriftDetectorEngine.observe({ error: Number.NaN });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects negative error", () => {
    const r = CrossProcessDriftDetectorEngine.observe({ error: -1 });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects empty batch", () => {
    const r = CrossProcessDriftDetectorEngine.observeBatch({ errors: [] });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });
});

describe("warm-up behavior (failure mode 5)", () => {
  it("returns no_change + inWarmup=true while n < MIN_SAMPLES_FOR_DETECTION", () => {
    const r = CrossProcessDriftDetectorEngine.observe({ error: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.report.inWarmup).toBe(true);
      expect(r.report.driftConfidence).toBe(0);
      expect(r.report.recommendedAction).toBe("none");
      for (const d of r.report.detectors) expect(d.verdict).toBe("no_change");
    }
  });

  it("inWarmup flips to false after 30 observations", () => {
    let last: DetectorVerdict | null = null;
    let inWarmup = true;
    for (let i = 0; i < 35; i++) {
      const r = CrossProcessDriftDetectorEngine.observe({ error: 0 });
      if (r.ok) {
        inWarmup = r.report.inWarmup;
        last = r.report.detectors[0].verdict;
      }
    }
    expect(inWarmup).toBe(false);
    expect(last).toBe("no_change");  // stationary stream → no drift
  });
});

describe("DDM — abrupt step-change detection", () => {
  it("flags drift after error rate jumps from 0.1 to 0.5", () => {
    const rng = mulberry32(42);
    let driftDetectedAt = -1;
    // Stable phase: 200 samples at 10% error rate
    for (let i = 0; i < 200; i++) {
      const err = rng() < 0.1 ? 1 : 0;
      CrossProcessDriftDetectorEngine.observe({ error: err });
    }
    // Drift phase: 50% error rate
    for (let i = 0; i < 200; i++) {
      const err = rng() < 0.5 ? 1 : 0;
      const r = CrossProcessDriftDetectorEngine.observe({ error: err });
      if (r.ok && r.report.detectors[0].verdict === "drift" && driftDetectedAt < 0) {
        driftDetectedAt = i;
      }
    }
    expect(driftDetectedAt).toBeGreaterThanOrEqual(0);
    expect(driftDetectedAt).toBeLessThan(200);
  });

  it("does NOT flag drift on a stable stream", () => {
    const rng = mulberry32(7);
    let anyDrift = false;
    for (let i = 0; i < 500; i++) {
      const err = rng() < 0.1 ? 1 : 0;
      const r = CrossProcessDriftDetectorEngine.observe({ error: err });
      if (r.ok && r.report.detectors[0].verdict === "drift") anyDrift = true;
    }
    expect(anyDrift).toBe(false);
  });
});

describe("acceptance — 95% recall on synthetic step-change within 200 events", () => {
  it("at least 95% of trials detect drift via consensus within 200 post-shift events", () => {
    const trials = 50;
    let detections = 0;
    for (let trial = 0; trial < trials; trial++) {
      CrossProcessDriftDetectorEngine.reset();
      const rng = mulberry32(trial * 1000 + 1);
      // Stable phase
      for (let i = 0; i < 200; i++) {
        CrossProcessDriftDetectorEngine.observe({ error: rng() < 0.1 ? 1 : 0 });
      }
      // Step change to 0.5 error rate; allow up to 200 events to detect
      let detected = false;
      for (let i = 0; i < 200; i++) {
        const r = CrossProcessDriftDetectorEngine.observe({ error: rng() < 0.5 ? 1 : 0 });
        if (r.ok && (r.report.recommendedAction === "retrain" || r.report.recommendedAction === "alert")) {
          detected = true;
          break;
        }
      }
      if (detected) detections++;
    }
    const recall = detections / trials;
    expect(recall).toBeGreaterThanOrEqual(0.95);
  });
});

describe("recommendedAction policy", () => {
  it("never recommends retrain on a stationary stream (DDM lock-min behavior)", () => {
    // Per Gama 2004, DDM locks p_min/s_min at the running minimum and only
    // resets on reset() — so occasional "alert" warnings on small samples of
    // a stationary stream are EXPECTED (statistical noise crossing 2σ from
    // the locked minimum). The load-bearing assertion is "no retrain":
    // ≥2-detector consensus must NOT fire on noise alone, because retrain
    // is expensive and disruptive.
    const rng = mulberry32(11);
    let retrainCount = 0;
    let alertCount = 0;
    for (let i = 0; i < 200; i++) {
      const r = CrossProcessDriftDetectorEngine.observe({ error: rng() < 0.05 ? 1 : 0 });
      if (r.ok) {
        if (r.report.recommendedAction === "retrain") retrainCount++;
        else if (r.report.recommendedAction === "alert") alertCount++;
      }
    }
    expect(retrainCount).toBe(0);
    // Alerts may fire occasionally; bound the rate so a regression that
    // makes ALL observations alert would still fail the test.
    expect(alertCount).toBeLessThan(50);  // < 25% of 200-event stream
  });

  it("returns retrain when ≥2 detectors agree on drift", () => {
    const rng = mulberry32(99);
    // Stable then strong drift to force consensus
    for (let i = 0; i < 200; i++) CrossProcessDriftDetectorEngine.observe({ error: rng() < 0.05 ? 1 : 0 });
    let sawRetrain = false;
    for (let i = 0; i < 500; i++) {
      const r = CrossProcessDriftDetectorEngine.observe({ error: rng() < 0.7 ? 1 : 0 });
      if (r.ok && r.report.recommendedAction === "retrain") {
        sawRetrain = true;
        break;
      }
    }
    expect(sawRetrain).toBe(true);
  });
});

describe("driftConfidence ∈ [0, 1]", () => {
  it("driftConfidence is bounded across a long random stream", () => {
    const rng = mulberry32(13);
    for (let i = 0; i < 500; i++) {
      const r = CrossProcessDriftDetectorEngine.observe({ error: rng() < 0.3 ? 1 : 0 });
      if (r.ok) {
        expect(r.report.driftConfidence).toBeGreaterThanOrEqual(0);
        expect(r.report.driftConfidence).toBeLessThanOrEqual(1);
      }
    }
  });

  it("driftConfidence = 0 in warmup", () => {
    const r = CrossProcessDriftDetectorEngine.observe({ error: 1 });
    if (r.ok) expect(r.report.driftConfidence).toBe(0);
  });
});

describe("history + reset", () => {
  it("history records each observation in chronological order", () => {
    for (let i = 0; i < 5; i++) {
      CrossProcessDriftDetectorEngine.observe({ error: i % 2 === 0 ? 1 : 0 });
    }
    const h = CrossProcessDriftDetectorEngine.history();
    expect(h.length).toBe(5);
    // Most-recent first per API contract
    expect(h[0].totalObservations).toBe(5);
    expect(h[4].totalObservations).toBe(1);
  });

  it("history is capped at 1000 entries", () => {
    for (let i = 0; i < 1500; i++) {
      CrossProcessDriftDetectorEngine.observe({ error: 0 });
    }
    expect(CrossProcessDriftDetectorEngine.history().length).toBeLessThanOrEqual(1000);
  });

  it("history(limit) respects the limit", () => {
    for (let i = 0; i < 100; i++) {
      CrossProcessDriftDetectorEngine.observe({ error: 0 });
    }
    expect(CrossProcessDriftDetectorEngine.history(10).length).toBe(10);
  });

  it("reset() clears history and detector state", () => {
    for (let i = 0; i < 50; i++) CrossProcessDriftDetectorEngine.observe({ error: 1 });
    CrossProcessDriftDetectorEngine.reset();
    expect(CrossProcessDriftDetectorEngine.history()).toEqual([]);
    const r = CrossProcessDriftDetectorEngine.observe({ error: 0 });
    if (r.ok) {
      expect(r.report.totalObservations).toBe(1);
      expect(r.report.inWarmup).toBe(true);
    }
  });
});

describe("observeBatch", () => {
  it("processes a batch and returns the final report", () => {
    const errors = Array.from({ length: 50 }, () => 0);
    const r = CrossProcessDriftDetectorEngine.observeBatch({ errors });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.report.totalObservations).toBe(50);
      expect(r.report.recommendedAction).toBe("none");
    }
  });

  it("rejects mid-stream invalid value", () => {
    const r = CrossProcessDriftDetectorEngine.observeBatch({
      errors: [0, 1, 0, 0.5, 1] as never,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });
});

describe("dispatcher convenience wrapper", () => {
  it("routes xproc_drift_observe", () => {
    const r = crossProcessDriftDetector("xproc_drift_observe", { error: 1 }) as {
      ok: boolean;
      report?: { inWarmup: boolean };
    };
    expect(r.ok).toBe(true);
    expect(r.report?.inWarmup).toBe(true);
  });

  it("routes xproc_drift_observe_batch", () => {
    const r = crossProcessDriftDetector("xproc_drift_observe_batch", {
      errors: [0, 0, 1, 0, 0],
    }) as { ok: boolean; report?: { totalObservations: number } };
    expect(r.ok).toBe(true);
    expect(r.report?.totalObservations).toBe(5);
  });

  it("routes xproc_drift_history", () => {
    crossProcessDriftDetector("xproc_drift_observe", { error: 1 });
    const h = crossProcessDriftDetector("xproc_drift_history", { limit: 1 }) as Array<{
      totalObservations: number;
    }>;
    expect(h.length).toBe(1);
    expect(h[0].totalObservations).toBe(1);
  });

  it("routes xproc_drift_reset", () => {
    crossProcessDriftDetector("xproc_drift_observe", { error: 1 });
    const r = crossProcessDriftDetector("xproc_drift_reset", {}) as { ok: boolean };
    expect(r.ok).toBe(true);
    expect(crossProcessDriftDetector("xproc_drift_history", {})).toEqual([]);
  });

  it("routes xproc_drift_constants", () => {
    const c = crossProcessDriftDetector("xproc_drift_constants", {}) as {
      DDM_DRIFT_LEVEL: number;
      MIN_SAMPLES_FOR_DETECTION: number;
    };
    expect(c.DDM_DRIFT_LEVEL).toBe(3.0);
    expect(c.MIN_SAMPLES_FOR_DETECTION).toBe(30);
  });

  it("throws on unknown action", () => {
    expect(() => crossProcessDriftDetector("xproc_unknown", {})).toThrow(
      /unknown action 'xproc_unknown'/,
    );
  });
});
