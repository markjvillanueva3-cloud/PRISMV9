/**
 * TribalTipOutcomeBridgeEngine — unit tests
 *
 * Verifies the closed-loop self-training bridge:
 *   1. recordApplication() persists tipId → programId linkages
 *   2. effectiveness() correctly joins applications to OutcomeTrackingEngine
 *      outcomes and produces weighted + Laplace-smoothed scores
 *   3. Confidence tier reflects sample size (low <5, medium 5-20, high >20)
 *   4. Operation filter narrows to specific operation buckets
 *   5. Smoothing protects single-bad-outcome tips from collapsing to -1.0
 *
 * @milestone TRIBAL-OUTCOME-LOOP-MS0/U-TTOB01
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { TribalTipOutcomeBridgeEngine } from "../engines/TribalTipOutcomeBridgeEngine.js";
import { OutcomeTrackingEngine } from "../engines/OutcomeTrackingEngine.js";

describe("TribalTipOutcomeBridgeEngine", () => {
  let tmpRoot: string;
  let outcomeEng: OutcomeTrackingEngine;
  let bridge: TribalTipOutcomeBridgeEngine;

  beforeEach(async () => {
    tmpRoot = await mkdtemp(path.join(tmpdir(), "prism-tribal-outcome-"));
    outcomeEng = new OutcomeTrackingEngine(path.join(tmpRoot, "outcomes"));
    bridge = new TribalTipOutcomeBridgeEngine(
      outcomeEng,
      path.join(tmpRoot, "tribal-outcomes"),
    );
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it("persists tip-program application records to JSONL", async () => {
    const rec = await bridge.recordApplication({
      tipId: "MILL-TIP-PTS-BALLNOSE-ZERO-SPEED-AT-TIP",
      programId: "PROG-001",
      operation: "ball_end_milling",
      consumer: "KnowledgeCurriculumBridge",
      context: "milling-wizard surface-finish question",
    });

    expect(rec.tipId).toBe("MILL-TIP-PTS-BALLNOSE-ZERO-SPEED-AT-TIP");
    expect(rec.programId).toBe("PROG-001");
    expect(rec.seq).toBe(0);
    expect(rec.schemaVersion).toBe(1);
    expect(rec.appliedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO-8601
  });

  it("reloads applications from disk in a fresh engine instance", async () => {
    await bridge.recordApplication({ tipId: "T1", programId: "P1" });
    await bridge.recordApplication({ tipId: "T1", programId: "P2" });

    const fresh = new TribalTipOutcomeBridgeEngine(
      outcomeEng,
      path.join(tmpRoot, "tribal-outcomes"),
    );
    const report = await fresh.effectiveness({ tipId: "T1" });
    expect(report.totalApplications).toBe(2);
  });

  it("joins applications to outcomes and computes weighted score (positive for all-good)", async () => {
    await bridge.recordApplication({ tipId: "T-GOOD", programId: "PROG-G1", operation: "face_milling" });
    await bridge.recordApplication({ tipId: "T-GOOD", programId: "PROG-G2", operation: "face_milling" });
    await outcomeEng.log({ programId: "PROG-G1", outcome: "good" });
    await outcomeEng.log({ programId: "PROG-G2", outcome: "good" });

    const report = await bridge.effectiveness({ tipId: "T-GOOD" });
    expect(report.totalApplications).toBe(2);
    expect(report.joinedOutcomes).toBe(2);
    expect(report.byKind.good).toBe(2);
    expect(report.byKind.scrap).toBe(0);
    expect(report.weightedScore).toBe(1.0); // all good = max
    expect(report.smoothedScore).toBeGreaterThan(0); // smoothed pulls toward 0 but stays positive
    expect(report.smoothedScore).toBeLessThan(1.0); // never max with Laplace prior
    expect(report.confidenceTier).toBe("low"); // 2 outcomes < 5
  });

  it("computes negative weighted score for all-scrap and tier confidence by N", async () => {
    // 6 scraps → medium-confidence tier should kick in (>=5, <20)
    for (let i = 0; i < 6; i++) {
      const pid = `PROG-S${i}`;
      await bridge.recordApplication({ tipId: "T-BAD", programId: pid });
      await outcomeEng.log({ programId: pid, outcome: "scrap" });
    }
    const report = await bridge.effectiveness({ tipId: "T-BAD" });
    expect(report.joinedOutcomes).toBe(6);
    expect(report.weightedScore).toBe(-1.0);
    expect(report.smoothedScore).toBeLessThan(0);
    expect(report.smoothedScore).toBeGreaterThan(-1.0); // smoothing protects from -1.0 collapse
    expect(report.confidenceTier).toBe("medium");
  });

  it("Laplace smoothing protects a single-bad-outcome tip from -1.0 collapse", async () => {
    await bridge.recordApplication({ tipId: "T-UNLUCKY", programId: "PROG-U1" });
    await outcomeEng.log({ programId: "PROG-U1", outcome: "scrap" });

    const report = await bridge.effectiveness({ tipId: "T-UNLUCKY" });
    expect(report.weightedScore).toBe(-1.0); // raw = pure scrap
    expect(report.smoothedScore).toBeGreaterThan(-0.5); // smoothed is much less harsh
  });

  it("filters by operation bucket — same tipId, different operations isolated", async () => {
    await bridge.recordApplication({ tipId: "T-MULTI", programId: "PROG-F1", operation: "face_milling" });
    await bridge.recordApplication({ tipId: "T-MULTI", programId: "PROG-S1", operation: "slotting" });
    await outcomeEng.log({ programId: "PROG-F1", outcome: "good" });
    await outcomeEng.log({ programId: "PROG-S1", outcome: "scrap" });

    const faceReport = await bridge.effectiveness({ tipId: "T-MULTI", operation: "face_milling" });
    expect(faceReport.byKind.good).toBe(1);
    expect(faceReport.byKind.scrap).toBe(0);

    const slotReport = await bridge.effectiveness({ tipId: "T-MULTI", operation: "slotting" });
    expect(slotReport.byKind.good).toBe(0);
    expect(slotReport.byKind.scrap).toBe(1);
  });

  it("mixed outcomes: weighted score reflects asymmetric weights (good=+1, scrap=-1, adjusted=+0.5)", async () => {
    // 2 good + 1 adjusted + 1 scrap = (1+1+0.5-1)/4 = 1.5/4 = 0.375
    await bridge.recordApplication({ tipId: "T-MIX", programId: "PG1" });
    await bridge.recordApplication({ tipId: "T-MIX", programId: "PG2" });
    await bridge.recordApplication({ tipId: "T-MIX", programId: "PADJ" });
    await bridge.recordApplication({ tipId: "T-MIX", programId: "PSCR" });
    await outcomeEng.log({ programId: "PG1", outcome: "good" });
    await outcomeEng.log({ programId: "PG2", outcome: "good" });
    await outcomeEng.log({ programId: "PADJ", outcome: "adjusted" });
    await outcomeEng.log({ programId: "PSCR", outcome: "scrap" });

    const report = await bridge.effectiveness({ tipId: "T-MIX" });
    expect(report.joinedOutcomes).toBe(4);
    expect(report.weightedScore).toBeCloseTo(0.375, 5);
    expect(report.byKind.good).toBe(2);
    expect(report.byKind.adjusted).toBe(1);
    expect(report.byKind.scrap).toBe(1);
  });

  it("returns zero scores + empty byKind when no applications match the tipId", async () => {
    const report = await bridge.effectiveness({ tipId: "T-NOT-EVER-APPLIED" });
    expect(report.totalApplications).toBe(0);
    expect(report.joinedOutcomes).toBe(0);
    expect(report.weightedScore).toBe(0);
    expect(report.confidenceTier).toBe("low");
  });

  it("recentApplications returns newest-first, capped at 5", async () => {
    for (let i = 0; i < 8; i++) {
      await bridge.recordApplication({ tipId: "T-MANY", programId: `P${i}` });
    }
    const report = await bridge.effectiveness({ tipId: "T-MANY" });
    expect(report.recentApplications).toHaveLength(5);
    expect(report.recentApplications[0].seq).toBe(7); // newest
    expect(report.recentApplications[4].seq).toBe(3); // 5th newest
  });
});
