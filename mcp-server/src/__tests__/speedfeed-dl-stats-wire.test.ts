/**
 * FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-PARTIAL-L1-STATS
 *
 * R12-safe introspection wire for SpeedFeedDeepLearningEngine (L1 of the SF-AI ladder).
 * This test asserts the engine surface contract that the new `prism_calc:speedfeed_dl_stats`
 * dispatcher action depends on. The action does NOT call inference paths — it only exposes
 * calibration/training state so operators can decide whether L2/L3 are safe to use.
 *
 * Sister to [[reference_u_cw_01_false_positive_2026_05_20]]: before wiring an AI engine,
 * verify its INFERENCE path is safe to expose. When inference is unsafe (random-init weights
 * until trained), wire only introspection so operators see the "untrained" state explicitly
 * rather than receiving silently-garbage predictions.
 */

import { describe, it, expect } from "vitest";
import { speedFeedDeepLearningEngine } from "../engines/SpeedFeedDeepLearningEngine.js";

describe("U-WIRE-BACKLOG-SF-PARTIAL-L1-STATS — speedfeed_dl_stats engine surface", () => {
  it("getSelfLearningStats returns the documented shape", () => {
    const s = speedFeedDeepLearningEngine.getSelfLearningStats();
    expect(s).toHaveProperty("total_feedback");
    expect(s).toHaveProperty("calibrated");
    expect(s).toHaveProperty("avg_errors");
    expect(typeof s.total_feedback).toBe("number");
    expect(typeof s.calibrated).toBe("boolean");
    expect(s.avg_errors !== null && typeof s.avg_errors === "object").toBe(true);
    expect(Array.isArray(s.avg_errors)).toBe(false);
  });

  it("stats returns operational counters as numbers", () => {
    const s = speedFeedDeepLearningEngine.stats();
    expect(typeof s.queries_processed).toBe("number");
    // R12 fail-loud: the engine code at SpeedFeedDeepLearningEngine.ts comment "3, // speed, feed, tool life"
    // declares exactly 3 networks. If this changes, the dispatcher contract MUST be re-reviewed before bump.
    expect(s.neural_networks).toBe(3);
    expect(typeof s.self_learning_feedback).toBe("number");
    expect(s.self_learning_feedback).toBeGreaterThanOrEqual(0);
    expect(s.queries_processed).toBeGreaterThanOrEqual(0);
  });

  it("stats.self_learning_feedback equals getSelfLearningStats.total_feedback (single source of truth)", () => {
    const op = speedFeedDeepLearningEngine.stats();
    const learn = speedFeedDeepLearningEngine.getSelfLearningStats();
    expect(op.self_learning_feedback).toBe(learn.total_feedback);
  });

  it("calibrated invariant: false iff total_feedback < 10", () => {
    const s = speedFeedDeepLearningEngine.getSelfLearningStats();
    if (s.total_feedback < 10) {
      expect(s.calibrated).toBe(false);
    } else {
      expect(s.calibrated).toBe(true);
    }
  });

  it("avg_errors keys match recorded error_pct keys (calibrationFactors taxonomy)", () => {
    const s = speedFeedDeepLearningEngine.getSelfLearningStats();
    // Keys can be empty on fresh engine; when present, they must be strings mapping to numbers.
    for (const k of Object.keys(s.avg_errors)) {
      expect(typeof k).toBe("string");
      expect(typeof s.avg_errors[k]).toBe("number");
      expect(Number.isFinite(s.avg_errors[k])).toBe(true);
      expect(s.avg_errors[k]).toBeGreaterThanOrEqual(0);
    }
  });
});
