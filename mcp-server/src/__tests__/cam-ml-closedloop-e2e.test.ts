/**
 * CAM-ML-CLOSEDLOOP-MS0 U-CMCCL15 — End-to-End Closed-Loop Test
 * ================================================================
 *
 * Verifies the full feedback loop that converts observed CAM outcomes
 * into improved future orchestrator decisions. 5-stage assertion chain:
 *
 *   STAGE 1 — PREDICTION:   Orchestrator chooses a CAM via chosen() and
 *                           publishes a confidence_commit event.
 *   STAGE 2 — OBSERVATION:  Actual outcome is produced by a simulator
 *                           (deterministic perturbation of prediction).
 *   STAGE 3 — INGEST:       attachOutcome drains from pending→resolved,
 *                           OrchestratorConfidenceFeedbackEngine updates
 *                           Beta priors for the affected cell.
 *   STAGE 4 — POSTERIOR:    Posterior mean for the cell shifts away from
 *                           0.5 in the direction consistent with the
 *                           observed agreement.
 *   STAGE 5 — STRATEGY:     Next rankForCell() call on the SAME cell now
 *                           picks a different top CAM than the prior
 *                           (neutral) rank would have.
 *
 * Real engines for every stage. No mocks. Assertion count: 16.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  confidenceCommitEventBusEngine,
  type CAMSystem,
} from "../engines/ConfidenceCommitEventBusEngine.js";
import { orchestratorConfidenceFeedbackEngine } from "../engines/OrchestratorConfidenceFeedbackEngine.js";
import { crossCAMComparisonLedgerEngine } from "../engines/CrossCAMComparisonLedgerEngine.js";

// -------------------------------------------------------------
// Deterministic simulator — maps an event to an observed outcome.
// Each CAM has an intrinsic "true" agreement rate per cell. We
// rotate through outcomes via a simple index to avoid any PRNG
// non-determinism across test runs.
// -------------------------------------------------------------
const TRUE_RATE: Record<CAMSystem, number> = {
  hypermill: 0.92,
  mastercam: 0.85,
  fusion360: 0.55,
  inventorcam: 0.60,
  solidcam: 0.70,
  nx: 0.80,
  catia: 0.72,
  powermill: 0.78,
  featurecam: 0.50,
};

function simulatedAgreement(cam: CAMSystem, idx: number): number {
  // Deterministic per-(cam, idx) hash bucketed to [0,99]. We decorrelate
  // by CAM letter AND index to avoid the "all indices below threshold"
  // failure mode of a naive `idx % 100` bucket. The generated distribution
  // converges to TRUE_RATE[cam] over ~30 samples, which is what this E2E
  // test needs for posterior separation.
  const rate = TRUE_RATE[cam];
  const seed = cam.charCodeAt(0) * 131 + idx * 37 + 17;
  const bucket = seed % 100;
  return bucket < Math.round(rate * 100) ? 1 : 0;
}

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
function resetAll(): void {
  confidenceCommitEventBusEngine.reset();
  orchestratorConfidenceFeedbackEngine.reset();
  crossCAMComparisonLedgerEngine.reset();
  orchestratorConfidenceFeedbackEngine.setConfig({ minSamples: 5, updateRate: 1.0 });
}

// -------------------------------------------------------------
// End-to-end test
// -------------------------------------------------------------
describe("CAM-ML-CLOSEDLOOP-MS0 U-CMCCL15 — Closed-Loop E2E", () => {
  beforeEach(() => resetAll());

  it("5-stage chain: prediction → observation → ingest → posterior shift → strategy change", () => {
    // Wire the orchestrator feedback engine to the bus once.
    orchestratorConfidenceFeedbackEngine.attachToBus();

    const cell = {
      featureClass: "pocket_3d",
      materialClass: "tool_steel_D2",
      machineClass: "hurco_mill_3ax",
    };
    const candidates: CAMSystem[] = ["hypermill", "fusion360"];

    // --- BASELINE RANK (before any data) ---
    // With no samples, both candidates are untrusted → posteriorMean 0.5
    // and the order is tie-broken alphabetically. This establishes that
    // Stage-5 assertion below is a genuine strategy change, not a
    // pre-existing preference baked into the engine.
    const preRank = orchestratorConfidenceFeedbackEngine.rankForCell(cell, candidates);
    expect(preRank).toHaveLength(2);
    expect(preRank[0].trusted).toBe(false);
    expect(preRank[1].trusted).toBe(false);
    expect(preRank[0].posteriorMean).toBeCloseTo(0.5, 10);
    // Alphabetical: fusion360 < hypermill.
    expect(preRank[0].camSystem).toBe("fusion360");

    // --- DRIVE DATA INTO THE LOOP ---
    // Simulate N prior jobs per candidate CAM on this cell.
    // hypermill has TRUE_RATE 0.92, fusion360 has 0.55.
    // With 20 jobs and minSamples=5, both become "trusted".
    const JOBS = 20;

    let predictedHypermill = 0;
    let actualHypermill = 0;
    let predictedFusion = 0;
    let actualFusion = 0;

    for (let i = 0; i < JOBS; i += 1) {
      // ---- STAGE 1: PREDICTION (orchestrator commits) ----
      // We alternate between both CAMs to exercise both priors.
      const cam: CAMSystem = i % 2 === 0 ? "hypermill" : "fusion360";
      const decisionId = `job-${i}`;
      confidenceCommitEventBusEngine.commit({
        decisionId,
        reasoningMode: "chain_of_thought",
        chosenCam: cam,
        confidence: 0.8,
        timestamp: `2026-04-20T00:${String(i).padStart(2, "0")}:00Z`,
        ...cell,
      });
      if (cam === "hypermill") predictedHypermill += 1;
      else predictedFusion += 1;

      // ---- STAGE 2: OBSERVATION (simulator produces outcome) ----
      const agree = simulatedAgreement(cam, i);
      if (cam === "hypermill" && agree === 1) actualHypermill += 1;
      if (cam === "fusion360" && agree === 1) actualFusion += 1;

      // ---- STAGE 3: INGEST (attach → bus fans out to feedback engine) ----
      confidenceCommitEventBusEngine.attachOutcome({
        decisionId,
        observedAt: `2026-04-20T01:${String(i).padStart(2, "0")}:00Z`,
        agreement: agree,
      });

      // Also record into the cross-CAM comparison ledger. This is how
      // the leaderboard becomes useful in the same loop — typically a
      // separate subscriber, but here we call it explicitly to exercise
      // the full closed-loop surface.
      crossCAMComparisonLedgerEngine.record({
        camSystem: cam,
        ...cell,
        success: agree === 1 ? 1 : 0,
        observedAt: `2026-04-20T01:${String(i).padStart(2, "0")}:00Z`,
      });
    }

    // Sanity-check that both CAMs got at least minSamples=5 runs.
    expect(predictedHypermill).toBeGreaterThanOrEqual(5);
    expect(predictedFusion).toBeGreaterThanOrEqual(5);
    // And that the deterministic simulator actually produced the
    // expected rate ordering (hypermill > fusion360 on successes).
    expect(actualHypermill).toBeGreaterThan(actualFusion);

    // Bus must be drained (every commit had an attachOutcome).
    expect(confidenceCommitEventBusEngine.pendingCount()).toBe(0);
    expect(confidenceCommitEventBusEngine.resolvedCount()).toBe(JOBS);

    // ---- STAGE 4: POSTERIOR SHIFT ----
    // Beta prior for hypermill/cell should have moved well above 0.5,
    // fusion360 should have moved near its true rate (~0.55, still > 0.5
    // but noticeably lower than hypermill).
    const hmPost = orchestratorConfidenceFeedbackEngine.lookup({
      camSystem: "hypermill",
      ...cell,
    });
    const fuPost = orchestratorConfidenceFeedbackEngine.lookup({
      camSystem: "fusion360",
      ...cell,
    });
    expect(hmPost.trusted).toBe(true);
    expect(fuPost.trusted).toBe(true);
    expect(hmPost.posteriorMean).toBeGreaterThan(0.7);
    expect(fuPost.posteriorMean).toBeLessThan(hmPost.posteriorMean);
    // Shift magnitude: hypermill must have moved at least 0.2 away from
    // the neutral 0.5 prior — an unmistakable "learning happened" signal.
    expect(Math.abs(hmPost.posteriorMean - 0.5)).toBeGreaterThan(0.2);

    // ---- STAGE 5: STRATEGY CHANGE ----
    // After learning, rankForCell must prefer hypermill over fusion360
    // for THIS cell (reversing the baseline alphabetical preference).
    const postRank = orchestratorConfidenceFeedbackEngine.rankForCell(cell, candidates);
    expect(postRank[0].camSystem).toBe("hypermill");
    expect(postRank[0].trusted).toBe(true);
    expect(postRank[0].posteriorMean).toBeGreaterThan(postRank[1].posteriorMean);
    // The top choice must NOT match the pre-learning top choice —
    // this is the core "next-call strategy change" assertion.
    expect(postRank[0].camSystem).not.toBe(preRank[0].camSystem);

    // ---- CROSS-CAM LEDGER: same verdict via Wilson-score ranking ----
    // Independent corroboration from a separate engine using a different
    // ranking algorithm (Wilson lower bound, not Beta posterior mean).
    const board = crossCAMComparisonLedgerEngine.leaderboard(cell);
    expect(board.topCam).toBe("hypermill");

    // Clean up.
    orchestratorConfidenceFeedbackEngine.detachFromBus();
  });

  it("E2E is reproducible across back-to-back runs (same verdict)", () => {
    // Run the whole loop twice and confirm determinism.
    const runOnce = (): { topCam: CAMSystem | null; topPosterior: number } => {
      resetAll();
      orchestratorConfidenceFeedbackEngine.attachToBus();
      const cell = {
        featureClass: "contour",
        materialClass: "tool_steel_D2",
        machineClass: "hurco_mill_3ax",
      };
      for (let i = 0; i < 30; i += 1) {
        const cam: CAMSystem = i % 2 === 0 ? "hypermill" : "fusion360";
        const id = `r-${i}`;
        confidenceCommitEventBusEngine.commit({
          decisionId: id,
          reasoningMode: "chain_of_thought",
          chosenCam: cam,
          confidence: 0.8,
          timestamp: `2026-04-20T02:${String(i).padStart(2, "0")}:00Z`,
          ...cell,
        });
        const agree = simulatedAgreement(cam, i);
        confidenceCommitEventBusEngine.attachOutcome({
          decisionId: id,
          observedAt: `2026-04-20T03:${String(i).padStart(2, "0")}:00Z`,
          agreement: agree,
        });
      }
      const ranked = orchestratorConfidenceFeedbackEngine.rankForCell(cell, [
        "hypermill",
        "fusion360",
      ]);
      orchestratorConfidenceFeedbackEngine.detachFromBus();
      return { topCam: ranked[0].camSystem, topPosterior: ranked[0].posteriorMean };
    };

    const a = runOnce();
    const b = runOnce();
    expect(a.topCam).toBe(b.topCam);
    expect(a.topPosterior).toBeCloseTo(b.topPosterior, 10);
    expect(a.topCam).toBe("hypermill");
  });
});
