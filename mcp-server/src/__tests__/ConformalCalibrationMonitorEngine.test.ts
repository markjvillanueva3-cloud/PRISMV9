/**
 * U-NN-CONFORMAL02 — rolling empirical-coverage monitor + drift detector.
 *
 * Tests verify the marginal-coverage estimate, the K-consecutive drift
 * gate, ring-buffer rotation correctness, and every documented failure
 * mode. Uses a deterministic LCG PRNG for reproducible coverage stats.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ConformalCalibrationMonitorEngine as CCM,
  conformalCalibrationMonitor,
} from "../engines/ConformalCalibrationMonitorEngine.js";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

beforeEach(() => {
  CCM.reset();
  // Always start from default config — earlier tests may have shrunk windowSize.
  CCM.configure({
    windowSize: 200,
    alpha: 0.1,
    driftTolerance: 0.05,
    consecutiveK: 20,
  });
  CCM.reset();
});

// ============================================================================
// 1. CONFIGURE — happy paths and validation
// ============================================================================

describe("configure()", () => {
  it("merges partial config without resetting the ring when windowSize unchanged", () => {
    CCM.configure({ windowSize: 50, alpha: 0.1 });
    // Drop a few obs into the buffer.
    CCM.record({ predictedSet: [0], actualLabel: 0 });
    CCM.record({ predictedSet: [0], actualLabel: 0 });
    expect(CCM.status().total).toBe(2);
    const r = CCM.configure({ alpha: 0.2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.reset).toBe(false);
    expect(r.config.alpha).toBe(0.2);
    expect(r.config.windowSize).toBe(50);
    expect(CCM.status().total).toBe(2);
  });

  it("resets the ring when windowSize changes (rolling math invariant)", () => {
    CCM.configure({ windowSize: 50 });
    CCM.record({ predictedSet: [0], actualLabel: 0 });
    expect(CCM.status().total).toBe(1);
    const r = CCM.configure({ windowSize: 100 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.reset).toBe(true);
    expect(r.config.windowSize).toBe(100);
    expect(CCM.status().total).toBe(0);
  });

  it("rejects windowSize below MIN_WINDOW_SIZE", () => {
    const r = CCM.configure({ windowSize: 5 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("invalid_input");
  });

  it("rejects alpha outside (0, 1)", () => {
    const r1 = CCM.configure({ alpha: 0 });
    expect(r1.ok).toBe(false);
    const r2 = CCM.configure({ alpha: 1 });
    expect(r2.ok).toBe(false);
  });

  it("rejects driftTolerance outside [0, 1)", () => {
    const r1 = CCM.configure({ driftTolerance: -0.01 });
    expect(r1.ok).toBe(false);
    const r2 = CCM.configure({ driftTolerance: 1 });
    expect(r2.ok).toBe(false);
  });

  it("rejects consecutiveK below 1", () => {
    const r = CCM.configure({ consecutiveK: 0 });
    expect(r.ok).toBe(false);
  });
});

// ============================================================================
// 2. RECORD — coverage flag + ring-buffer math
// ============================================================================

describe("record()", () => {
  it("returns covered=true when actualLabel is in the predicted set", () => {
    const r = CCM.record({ predictedSet: [0, 2], actualLabel: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.covered).toBe(true);
    expect(r.status.total).toBe(1);
    expect(r.status.covered).toBe(1);
    expect(r.status.empiricalCoverage).toBe(1);
  });

  it("returns covered=false when actualLabel is NOT in the predicted set", () => {
    const r = CCM.record({ predictedSet: [0, 1], actualLabel: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.covered).toBe(false);
    expect(r.status.total).toBe(1);
    expect(r.status.covered).toBe(0);
    expect(r.status.empiricalCoverage).toBe(0);
  });

  it("rejects empty predicted set (degenerate output from upstream)", () => {
    const r = CCM.record({ predictedSet: [], actualLabel: 0 });
    expect(r.ok).toBe(false);
  });

  it("rejects negative or non-integer label", () => {
    const r1 = CCM.record({ predictedSet: [0], actualLabel: -1 });
    expect(r1.ok).toBe(false);
    const r2 = CCM.record({ predictedSet: [0], actualLabel: 0.5 });
    expect(r2.ok).toBe(false);
  });

  it("ring evicts oldest observation once windowSize is reached (rotation invariant)", () => {
    CCM.configure({ windowSize: 20 });
    // Record 20 covered, then 5 missed — ring should have 25 positions
    // shifted; total stays at windowSize=20.
    for (let i = 0; i < 20; i++) {
      CCM.record({ predictedSet: [0], actualLabel: 0 });
    }
    expect(CCM.status().covered).toBe(20);
    expect(CCM.status().total).toBe(20);
    expect(CCM.status().empiricalCoverage).toBe(1);
    for (let i = 0; i < 5; i++) {
      CCM.record({ predictedSet: [0], actualLabel: 1 });
    }
    expect(CCM.status().total).toBe(20);
    expect(CCM.status().covered).toBe(15);
    expect(CCM.status().empiricalCoverage).toBe(15 / 20);
    expect(CCM.status().totalRecorded).toBe(25);
  });

  it("totalRecorded counts lifetime even after the ring rolls over", () => {
    CCM.configure({ windowSize: 20 });
    for (let i = 0; i < 100; i++) {
      CCM.record({ predictedSet: [0], actualLabel: 0 });
    }
    expect(CCM.status().total).toBe(20);
    expect(CCM.status().totalRecorded).toBe(100);
  });
});

// ============================================================================
// 3. DRIFT DETECTION — the core safety contract
// ============================================================================

describe("drift detection", () => {
  it("does NOT trigger drift while the ring is still filling", () => {
    CCM.configure({ windowSize: 50, alpha: 0.1, driftTolerance: 0.05, consecutiveK: 5 });
    // 30 observations all missed — empirical would be 0, but ring isn't full.
    for (let i = 0; i < 30; i++) {
      CCM.record({ predictedSet: [0], actualLabel: 1 });
    }
    expect(CCM.status().total).toBe(30);
    expect(CCM.status().drifting).toBe(false);
    expect(CCM.status().consecutiveBelow).toBe(0);
  });

  it("does NOT trigger drift on a stationary at-target stream (no false positive baseline)", () => {
    CCM.configure({ windowSize: 100, alpha: 0.1, driftTolerance: 0.05, consecutiveK: 20 });
    const rand = lcg(0xC0FFEE);
    const targetCoverage = 0.92; // slightly above 1−α=0.9, well above threshold 0.85
    // 1000 observations, each covered with probability targetCoverage.
    let triggered = false;
    for (let i = 0; i < 1000; i++) {
      const isCovered = rand() < targetCoverage;
      CCM.record({ predictedSet: isCovered ? [0] : [1], actualLabel: 0 });
      if (CCM.status().drifting) triggered = true;
    }
    expect(triggered).toBe(false);
    expect(CCM.status().empiricalCoverage).toBeGreaterThan(0.85);
  });

  it("DOES trigger drift when empirical coverage stays below threshold for K consecutive obs", () => {
    CCM.configure({ windowSize: 50, alpha: 0.1, driftTolerance: 0.05, consecutiveK: 10 });
    // Fill the ring with all-covered first.
    for (let i = 0; i < 50; i++) {
      CCM.record({ predictedSet: [0], actualLabel: 0 });
    }
    expect(CCM.status().drifting).toBe(false);
    // Now flood with all-misses. Each miss reduces in-window covered count
    // by 1 immediately (evicting a covered obs), so empirical coverage
    // drops monotonically: 1.0, 0.98, 0.96, ..., crossing 0.85 around
    // the 8th miss. Then >=10 consecutive below-threshold obs trigger drift.
    let triggeredAt = -1;
    for (let i = 0; i < 30; i++) {
      CCM.record({ predictedSet: [0], actualLabel: 1 });
      if (CCM.status().drifting && triggeredAt === -1) {
        triggeredAt = i + 1;
      }
    }
    expect(triggeredAt).toBeGreaterThan(0);
    expect(triggeredAt).toBeLessThanOrEqual(25);
    expect(CCM.status().drifting).toBe(true);
  });

  it("clears drift state when coverage recovers above threshold", () => {
    CCM.configure({ windowSize: 30, alpha: 0.1, driftTolerance: 0.05, consecutiveK: 5 });
    // Ramp into drift state.
    for (let i = 0; i < 30; i++) CCM.record({ predictedSet: [0], actualLabel: 0 });
    for (let i = 0; i < 20; i++) CCM.record({ predictedSet: [0], actualLabel: 1 });
    expect(CCM.status().drifting).toBe(true);
    // Recover with covered observations; consecutiveBelow resets the
    // moment we cross above threshold.
    for (let i = 0; i < 30; i++) CCM.record({ predictedSet: [0], actualLabel: 0 });
    expect(CCM.status().consecutiveBelow).toBe(0);
    expect(CCM.status().drifting).toBe(false);
    expect(CCM.status().empiricalCoverage).toBe(1);
  });

  it("threshold derivation: 1 − α − driftTolerance is the explicit floor", () => {
    CCM.configure({ windowSize: 20, alpha: 0.2, driftTolerance: 0.1, consecutiveK: 5 });
    // Threshold = 1 − 0.2 − 0.1 = 0.7. Sustaining 11 missed in 20 → 9/20 = 0.45.
    for (let i = 0; i < 20; i++) {
      CCM.record({
        predictedSet: [0],
        actualLabel: i < 9 ? 0 : 1, // 9 covered, 11 missed
      });
    }
    expect(CCM.status().empiricalCoverage).toBe(0.45);
    // Threshold = 0.7, empirical = 0.45 → below → consecutiveBelow advances.
    // With consecutiveK=5, drift fires once consecutiveBelow >= 5.
    // The first 5 fills don't count (ring not full); from obs 21 onwards
    // we record below-threshold. Add 5 more steady misses.
    for (let i = 0; i < 5; i++) {
      CCM.record({ predictedSet: [0], actualLabel: 1 });
    }
    expect(CCM.status().drifting).toBe(true);
  });
});

// ============================================================================
// 4. STATE — status + reset + constants
// ============================================================================

describe("state management", () => {
  it("status() before any record returns honest zero snapshot", () => {
    const s = CCM.status();
    expect(s.total).toBe(0);
    expect(s.covered).toBe(0);
    expect(s.empiricalCoverage).toBe(0);
    expect(s.totalRecorded).toBe(0);
    expect(s.drifting).toBe(false);
    expect(s.consecutiveBelow).toBe(0);
    expect(s.targetCoverage).toBeCloseTo(0.9, 6);
  });

  it("reset() clears the ring + counters, keeps config", () => {
    CCM.configure({ windowSize: 50, alpha: 0.05, driftTolerance: 0.02, consecutiveK: 7 });
    for (let i = 0; i < 25; i++) CCM.record({ predictedSet: [0], actualLabel: 0 });
    expect(CCM.status().total).toBe(25);
    CCM.reset();
    const s = CCM.status();
    expect(s.total).toBe(0);
    expect(s.covered).toBe(0);
    expect(s.totalRecorded).toBe(0);
    // Config preserved.
    expect(s.config.windowSize).toBe(50);
    expect(s.config.alpha).toBe(0.05);
    expect(s.config.driftTolerance).toBe(0.02);
    expect(s.config.consecutiveK).toBe(7);
  });

  it("constants() reports defaults and bounds", () => {
    const c = CCM.constants();
    expect(c.DEFAULT_WINDOW_SIZE).toBe(200);
    expect(c.MIN_WINDOW_SIZE).toBe(20);
    expect(c.MAX_WINDOW_SIZE).toBe(100_000);
    expect(c.DEFAULT_ALPHA).toBe(0.1);
    expect(c.DEFAULT_DRIFT_TOLERANCE).toBe(0.05);
    expect(c.DEFAULT_CONSECUTIVE_K).toBe(20);
  });
});

// ============================================================================
// 5. DISPATCHER WRAPPER
// ============================================================================

describe("conformalCalibrationMonitor() dispatcher wrapper", () => {
  it("xproc_calibration_monitor_configure routes through configure()", () => {
    const r = conformalCalibrationMonitor("xproc_calibration_monitor_configure", {
      windowSize: 30,
    }) as { ok: boolean; config?: { windowSize: number } };
    expect(r.ok).toBe(true);
    expect(r.config?.windowSize).toBe(30);
  });

  it("xproc_calibration_monitor_record routes through record()", () => {
    conformalCalibrationMonitor("xproc_calibration_monitor_configure", { windowSize: 50 });
    const r = conformalCalibrationMonitor("xproc_calibration_monitor_record", {
      predictedSet: [0, 1],
      actualLabel: 1,
    }) as { ok: boolean; covered?: boolean };
    expect(r.ok).toBe(true);
    expect(r.covered).toBe(true);
  });

  it("xproc_calibration_monitor_status returns the snapshot", () => {
    const s = conformalCalibrationMonitor("xproc_calibration_monitor_status", {}) as {
      total: number;
    };
    expect(s.total).toBe(0);
  });

  it("xproc_calibration_monitor_reset wipes the ring", () => {
    conformalCalibrationMonitor("xproc_calibration_monitor_configure", { windowSize: 50 });
    conformalCalibrationMonitor("xproc_calibration_monitor_record", {
      predictedSet: [0],
      actualLabel: 0,
    });
    conformalCalibrationMonitor("xproc_calibration_monitor_reset", {});
    const s = conformalCalibrationMonitor("xproc_calibration_monitor_status", {}) as {
      totalRecorded: number;
    };
    expect(s.totalRecorded).toBe(0);
  });

  it("xproc_calibration_monitor_constants returns defaults", () => {
    const c = conformalCalibrationMonitor("xproc_calibration_monitor_constants", {}) as {
      DEFAULT_WINDOW_SIZE: number;
    };
    expect(c.DEFAULT_WINDOW_SIZE).toBe(200);
  });

  it("unknown action throws descriptively", () => {
    expect(() => conformalCalibrationMonitor("not_a_real_action", {})).toThrow(/unknown action/);
  });
});
