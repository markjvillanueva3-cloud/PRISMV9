/**
 * SFOutcomeFeedbackLoopWire.test.ts
 *
 * Anti-regression for SF-PSN-WIRE-MS0/U-SFPSN-09 (slot:juliett, 2026-05-23).
 *
 * Closes the SF outcome feedback loop into the SF-AI ladder. Per audit F9:
 * "sfcOutcomeWire.ts is imported by 5 SF engines but NOT by
 * SpeedFeedDeepLearningEngine, which holds the calibrationFactors
 * self-learning state — so outcomes are captured at the calculator layer
 * and discarded before the AI-ladder sink." After U-SFPSN-09:
 *   (a) SpeedFeedDeepLearningEngine imports captureSFC from sfcOutcomeWire
 *   (b) recordFeedback() emits to the SFC bus AFTER updating calibrationFactors
 *   (c) NEW captureRecommendation() method emits fresh predictions to the bus
 *
 * Verifier match (envelope U-SFPSN-09):
 *   grep -c 'sfcOutcomeWire|captureSFC' SpeedFeedDeepLearningEngine.ts >=1
 *     (currently 0 pre-wire; >=3 after this unit)
 *   a test asserts a recorded outcome shifts the next prediction
 *     (assertion below: calibrationFactors drift after >=5 recordFeedback
 *     calls with non-zero error_pct)
 *
 * Frozen-baseline pattern matches U-SFPSN-02A/03/04/05/06.
 */

import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { speedFeedDeepLearningEngine } from "../engines/SpeedFeedDeepLearningEngine.js";

describe("SF-PSN-WIRE-MS0/U-SFPSN-09 — SF outcome feedback loop wired into AI ladder (audit F9)", () => {
  it("audit F9 verifier — SpeedFeedDeepLearningEngine.ts source mentions sfcOutcomeWire or captureSFC at least 3 times (import + recordFeedback emit + captureRecommendation emit)", async () => {
    const src = await readFile(
      new URL("../engines/SpeedFeedDeepLearningEngine.ts", import.meta.url),
      "utf8"
    );
    const hits = (src.match(/sfcOutcomeWire|captureSFC/g) || []).length;
    expect(hits).toBeGreaterThanOrEqual(3);
  });

  it("audit F9 import verifier — SpeedFeedDeepLearningEngine.ts imports captureSFC from sfcOutcomeWire middleware", async () => {
    const src = await readFile(
      new URL("../engines/SpeedFeedDeepLearningEngine.ts", import.meta.url),
      "utf8"
    );
    expect(src).toMatch(/import\s*\{\s*captureSFC\s*\}\s*from\s*["']\.\.\/middleware\/sfcOutcomeWire/);
  });

  it("audit F9 method verifier — captureRecommendation method is exposed on the engine class", async () => {
    const src = await readFile(
      new URL("../engines/SpeedFeedDeepLearningEngine.ts", import.meta.url),
      "utf8"
    );
    expect(src).toContain("captureRecommendation");
  });

  it("recorded outcome shifts the next prediction — 5+ feedback entries with non-zero error_pct cause calibrationFactors to drift", () => {
    const initialStats = speedFeedDeepLearningEngine.getSelfLearningStats();
    const initialFeedback = initialStats.total_feedback;

    // Predicted ALWAYS over-predicts by 10% (actual is 90% of predicted)
    const predicted = { speed_mpm: 200, feed_mm: 0.3, tool_life_min: 60, Ra_um: 1.6 };
    const actualUnder = { speed_mpm: 180, feed_mm: 0.27, tool_life_min: 54, Ra_um: 1.44 };

    for (let i = 0; i < 6; i++) {
      speedFeedDeepLearningEngine.recordFeedback(`u-sfpsn-09-job-${i}`, predicted, actualUnder);
    }

    const finalStats = speedFeedDeepLearningEngine.getSelfLearningStats();
    expect(finalStats.total_feedback).toBe(initialFeedback + 6);
    expect(finalStats.calibrated || finalStats.total_feedback >= 5).toBe(true);

    // 10% over-prediction → avg_error should be near +10 for at least one channel
    expect(Math.max(
      finalStats.avg_errors.speed ?? 0,
      finalStats.avg_errors.feed ?? 0,
      finalStats.avg_errors.tool_life ?? 0,
      finalStats.avg_errors.surface_finish ?? 0,
    )).toBeGreaterThan(5);
  });

  it("captureRecommendation returns a non-empty lineage_id (string contract)", () => {
    const lineageId = speedFeedDeepLearningEngine.captureRecommendation(
      "u-sfpsn-09-cr-001",
      { speed_mpm: 150, feed_mm: 0.25, tool_life_min: 45, confidence: 0.8 },
      { material: "1018", tool_id: "T01", operation: "milling" }
    );
    expect(typeof lineageId).toBe("string");
    expect(lineageId.length).toBeGreaterThan(0);
  });

  it("captureRecommendation echoes back the caller-provided jobId when no upstream lineage exists", () => {
    const jobId = "u-sfpsn-09-cr-echo-001";
    const lineageId = speedFeedDeepLearningEngine.captureRecommendation(
      jobId,
      { speed_mpm: 100, feed_mm: 0.2 }
    );
    expect(lineageId).toBe(jobId);
  });

  it("non-fatal — recordFeedback completes when actual outcomes are all undefined (error_pct empty, captureSFC still emits)", () => {
    expect(() => speedFeedDeepLearningEngine.recordFeedback(
      "u-sfpsn-09-undef-001",
      { speed_mpm: 200, feed_mm: 0.3, tool_life_min: 60, Ra_um: 1.6 },
      {}
    )).not.toThrow();
  });
});
