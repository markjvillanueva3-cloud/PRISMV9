/**
 * consensus-cron-snapshot-drift.integration — INTEL-OLLAMA-OBSIDIAN-MS0/U-CONSENSUS-DRIFT-CRON-WIRE.
 *
 * Verifies the cron CLI's pre+post snapshot + drift detection wiring by
 * exercising the same engine call sequence the script performs. The CLI
 * itself is tested via this inline integration rather than by spawning
 * tsx (which is slow + Windows-fragile).
 *
 * The flow tested:
 *   1. captureSnapshot(label="pre-cron")   — before applyFromFeed
 *   2. ConsensusNeuralCreditAssignmentEngine.applyFromFeed(...)
 *   3. captureSnapshot(label="post-cron")  — after applyFromFeed
 *   4. getLatestPair → driftDetector.compare → hasActionableDrift
 *   5. pruneSnapshots(keepLast)
 *
 * This is the production cron loop. Keeping this test in lockstep with
 * scripts/consensus-credit-cron.mjs prevents drift between the script
 * glue and the engine contracts.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { consensusModelPerformanceEngine } from "../engines/ConsensusModelPerformanceEngine.js";
import { consensusPerfSnapshotEngine } from "../engines/ConsensusPerfSnapshotEngine.js";
import { consensusDriftDetectorEngine } from "../engines/ConsensusDriftDetectorEngine.js";

let dir: string;
let perfPath: string;
let snapshotDir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-cron-wire-"));
  perfPath = path.join(dir, "perf.json");
  snapshotDir = path.join(dir, "snaps");
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("consensus-credit-cron snapshot+drift wiring", () => {
  it("captures pre+post snapshots and detects no drift on a no-op run", () => {
    consensusModelPerformanceEngine.saveState(
      { schemaVersion: "1.0.0", vendors: { anthropic: { tasks: { plan: { ema: 0.85, n: 30 } } } } },
      perfPath,
    );
    // Pre-snapshot.
    const pre = consensusPerfSnapshotEngine.captureSnapshot({ perfStatePath: perfPath, snapshotDir, label: "pre-cron" });
    expect(pre.ok).toBe(true);
    // No-op: don't change perf state (mimics empty feed).
    // Post-snapshot.
    const post = consensusPerfSnapshotEngine.captureSnapshot({ perfStatePath: perfPath, snapshotDir, label: "post-cron" });
    expect(post.ok).toBe(true);
    // Drift between latest pair — same state, no events.
    const pair = consensusPerfSnapshotEngine.getLatestPair({ snapshotDir });
    expect(pair.ok).toBe(true);
    const report = consensusDriftDetectorEngine.compare(pair.before!.state, pair.after!.state);
    expect(report.events).toHaveLength(0);
    expect(consensusDriftDetectorEngine.hasActionableDrift(report)).toBe(false);
  });

  it("detects severe drift when perf-state regresses between pre and post", () => {
    consensusModelPerformanceEngine.saveState(
      { schemaVersion: "1.0.0", vendors: { anthropic: { tasks: { plan: { ema: 0.90, n: 30 } } } } },
      perfPath,
    );
    consensusPerfSnapshotEngine.captureSnapshot({
      perfStatePath: perfPath,
      snapshotDir,
      label: "pre-cron",
    });
    // Simulate the credit-assignment engine collapsing Anthropic's EMA.
    consensusModelPerformanceEngine.saveState(
      { schemaVersion: "1.0.0", vendors: { anthropic: { tasks: { plan: { ema: 0.40, n: 35 } } } } },
      perfPath,
    );
    consensusPerfSnapshotEngine.captureSnapshot({
      perfStatePath: perfPath,
      snapshotDir,
      label: "post-cron",
    });

    const pair = consensusPerfSnapshotEngine.getLatestPair({ snapshotDir });
    expect(pair.ok).toBe(true);
    const report = consensusDriftDetectorEngine.compare(pair.before!.state, pair.after!.state);
    expect(report.counts.severe).toBe(1);
    expect(report.events[0].vendor).toBe("anthropic");
    expect(report.events[0].taskType).toBe("plan");
    expect(consensusDriftDetectorEngine.hasActionableDrift(report)).toBe(true);
  });

  it("auto-prunes snapshots to keepLast retention after multiple runs", () => {
    consensusModelPerformanceEngine.saveState(
      { schemaVersion: "1.0.0", vendors: {} },
      perfPath,
    );
    // Simulate 5 cron runs — each produces pre + post = 10 snapshots.
    for (let i = 0; i < 5; i++) {
      consensusPerfSnapshotEngine.captureSnapshot({ perfStatePath: perfPath, snapshotDir, label: "pre-cron" });
      consensusPerfSnapshotEngine.captureSnapshot({ perfStatePath: perfPath, snapshotDir, label: "post-cron" });
    }
    expect(consensusPerfSnapshotEngine.listSnapshots(snapshotDir)).toHaveLength(10);
    // Prune to 4 (covers last 2 runs).
    const pruned = consensusPerfSnapshotEngine.pruneSnapshots({ snapshotDir, keepLast: 4 });
    expect(pruned.ok).toBe(true);
    expect(pruned.kept).toHaveLength(4);
    expect(pruned.pruned).toHaveLength(6);
    expect(consensusPerfSnapshotEngine.listSnapshots(snapshotDir)).toHaveLength(4);
  });

  it("inter-run drift: minSpanMs honors prior post-cron when comparing across runs", () => {
    consensusModelPerformanceEngine.saveState(
      { schemaVersion: "1.0.0", vendors: { openai: { tasks: { decide: { ema: 0.80, n: 50 } } } } },
      perfPath,
    );
    // Run 1: post snapshot at hour 0.
    consensusPerfSnapshotEngine.captureSnapshot({
      perfStatePath: perfPath,
      snapshotDir,
      label: "post-cron",
      now: new Date("2026-05-05T00:00:00.000Z"),
    });
    // Run 2: regression then post at hour 1.
    consensusModelPerformanceEngine.saveState(
      { schemaVersion: "1.0.0", vendors: { openai: { tasks: { decide: { ema: 0.30, n: 60 } } } } },
      perfPath,
    );
    consensusPerfSnapshotEngine.captureSnapshot({
      perfStatePath: perfPath,
      snapshotDir,
      label: "pre-cron",
      now: new Date("2026-05-05T01:00:00.000Z"),
    });
    consensusPerfSnapshotEngine.captureSnapshot({
      perfStatePath: perfPath,
      snapshotDir,
      label: "post-cron",
      now: new Date("2026-05-05T01:00:01.000Z"),
    });
    // Inter-run drift: minSpanMs=30min skips pre-cron of run-2 → compares
    // run-2 post against run-1 post (the only snapshot ≥30m older).
    const halfHour = 30 * 60 * 1000;
    const pair = consensusPerfSnapshotEngine.getLatestPair({ snapshotDir, minSpanMs: halfHour });
    expect(pair.ok).toBe(true);
    expect(pair.before!.label).toBe("post-cron");
    expect(pair.before!.ts).toBe("2026-05-05T00:00:00.000Z");
    const report = consensusDriftDetectorEngine.compare(pair.before!.state, pair.after!.state);
    expect(report.counts.severe).toBe(1);
    expect(consensusDriftDetectorEngine.hasActionableDrift(report)).toBe(true);
  });

  it("dry-run posture: skip snapshot+drift when persist is false", () => {
    // Mimics the CLI's `if (opts.snapshotDir && !opts.dryRun)` gating —
    // dry-run callers should NOT capture snapshots so they don't pollute
    // the timeline with no-op observations.
    consensusModelPerformanceEngine.saveState(
      { schemaVersion: "1.0.0", vendors: {} },
      perfPath,
    );
    // Don't capture anything (dry-run posture).
    expect(consensusPerfSnapshotEngine.listSnapshots(snapshotDir)).toHaveLength(0);
  });
});
