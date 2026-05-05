/**
 * ConsensusPerfSnapshotEngine — INTEL-OLLAMA-OBSIDIAN-MS0/U-CONSENSUS-PERF-SNAPSHOT.
 *
 * Verifies snapshot capture/list/load/prune/getLatestPair lifecycle:
 *   - capture writes immutable timestamped file
 *   - list returns chronological order
 *   - load round-trips a captured snapshot
 *   - prune retains keepLast newest, deletes older
 *   - getLatestPair returns most-recent pair for drift comparison
 *   - minSpanMs honored when picking before
 *   - fail-open on missing dir, corrupt JSON, missing file
 *   - label sanitization (path-injection defense)
 *   - filename round-trip for ISO timestamps containing colons + dot
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ConsensusPerfSnapshotEngine } from "../engines/ConsensusPerfSnapshotEngine.js";
import { consensusModelPerformanceEngine } from "../engines/ConsensusModelPerformanceEngine.js";
import type { PerformanceState } from "../engines/ConsensusModelPerformanceEngine.js";

const engine = new ConsensusPerfSnapshotEngine();

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-perf-snap-"));
}

function makeState(spec: Record<string, Record<string, { ema: number; n: number }>>): PerformanceState {
  const vendors: PerformanceState["vendors"] = {};
  for (const [vendor, tasks] of Object.entries(spec)) {
    const tasksOut: Record<string, { ema: number; n: number }> = {};
    for (const [taskType, stats] of Object.entries(tasks)) {
      tasksOut[taskType] = { ema: stats.ema, n: stats.n };
    }
    vendors[vendor] = { tasks: tasksOut };
  }
  return { schemaVersion: "1.0.0", vendors };
}

let dir: string;
let perfPath: string;
let snapshotDir: string;

beforeEach(() => {
  dir = tmpRoot();
  perfPath = path.join(dir, "perf.json");
  snapshotDir = path.join(dir, "snapshots");
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("ConsensusPerfSnapshotEngine", () => {
  // ---- captureSnapshot() ----

  it("captureSnapshot writes immutable file with timestamp + label + state", () => {
    const live = makeState({ anthropic: { plan: { ema: 0.85, n: 30 } } });
    consensusModelPerformanceEngine.saveState(live, perfPath);
    const result = engine.captureSnapshot({
      perfStatePath: perfPath,
      snapshotDir,
      label: "hourly",
      now: new Date("2026-05-05T18:00:00.000Z"),
    });
    expect(result.ok).toBe(true);
    expect(result.error).toBeNull();
    expect(result.label).toBe("hourly");
    expect(result.ts).toBe("2026-05-05T18:00:00.000Z");
    expect(result.vendorCount).toBe(1);
    expect(result.taskCount).toBe(1);
    expect(fs.existsSync(result.snapshotPath)).toBe(true);
    expect(result.snapshotPath).toContain("perf-2026-05-05T18-00-00-000Z__hourly.json");
  });

  it("captureSnapshot creates the snapshot directory if missing", () => {
    consensusModelPerformanceEngine.saveState(makeState({}), perfPath);
    expect(fs.existsSync(snapshotDir)).toBe(false);
    const result = engine.captureSnapshot({ perfStatePath: perfPath, snapshotDir });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(snapshotDir)).toBe(true);
  });

  it("captureSnapshot defaults label to 'manual' when not supplied", () => {
    consensusModelPerformanceEngine.saveState(makeState({}), perfPath);
    const result = engine.captureSnapshot({ perfStatePath: perfPath, snapshotDir });
    expect(result.label).toBe("manual");
    expect(result.snapshotPath).toContain("__manual.json");
  });

  it("captureSnapshot sanitizes path-injection in label (defense in depth)", () => {
    consensusModelPerformanceEngine.saveState(makeState({}), perfPath);
    const result = engine.captureSnapshot({
      perfStatePath: perfPath,
      snapshotDir,
      label: "../../etc/passwd",
    });
    expect(result.ok).toBe(true);
    // Slashes + dots replaced; result still inside snapshotDir.
    expect(result.snapshotPath.startsWith(snapshotDir)).toBe(true);
    expect(result.snapshotPath).not.toContain("..");
    expect(path.dirname(result.snapshotPath)).toBe(snapshotDir);
  });

  it("captureSnapshot writes valid JSON that loadSnapshot can round-trip", () => {
    const live = makeState({ anthropic: { plan: { ema: 0.85, n: 30 } } });
    consensusModelPerformanceEngine.saveState(live, perfPath);
    const captured = engine.captureSnapshot({ perfStatePath: perfPath, snapshotDir, label: "rt" });
    const loaded = engine.loadSnapshot(captured.snapshotPath);
    expect(loaded).not.toBeNull();
    expect(loaded!.state.vendors.anthropic.tasks.plan.ema).toBe(0.85);
    expect(loaded!.label).toBe("rt");
  });

  it("captureSnapshot from empty perf state still produces a valid snapshot", () => {
    consensusModelPerformanceEngine.saveState(makeState({}), perfPath);
    const result = engine.captureSnapshot({ perfStatePath: perfPath, snapshotDir });
    expect(result.ok).toBe(true);
    expect(result.vendorCount).toBe(0);
    expect(result.taskCount).toBe(0);
  });

  // ---- listSnapshots() ----

  it("listSnapshots returns empty array when directory is missing", () => {
    expect(engine.listSnapshots(path.join(dir, "nope"))).toEqual([]);
  });

  it("listSnapshots ignores non-snapshot files in the directory", () => {
    fs.mkdirSync(snapshotDir, { recursive: true });
    fs.writeFileSync(path.join(snapshotDir, "README.md"), "not a snapshot", "utf-8");
    fs.writeFileSync(path.join(snapshotDir, "perf-bad.json"), "{}", "utf-8");
    consensusModelPerformanceEngine.saveState(makeState({}), perfPath);
    engine.captureSnapshot({ perfStatePath: perfPath, snapshotDir, label: "good" });
    const list = engine.listSnapshots(snapshotDir);
    expect(list).toHaveLength(1);
    expect(list[0].label).toBe("good");
  });

  it("listSnapshots returns chronological order (oldest first)", () => {
    consensusModelPerformanceEngine.saveState(makeState({}), perfPath);
    engine.captureSnapshot({ perfStatePath: perfPath, snapshotDir, label: "third", now: new Date("2026-05-05T20:00:00.000Z") });
    engine.captureSnapshot({ perfStatePath: perfPath, snapshotDir, label: "first", now: new Date("2026-05-05T18:00:00.000Z") });
    engine.captureSnapshot({ perfStatePath: perfPath, snapshotDir, label: "second", now: new Date("2026-05-05T19:00:00.000Z") });
    const list = engine.listSnapshots(snapshotDir);
    expect(list.map((m) => m.label)).toEqual(["first", "second", "third"]);
  });

  // ---- loadSnapshot() ----

  it("loadSnapshot returns null on corrupt JSON file", () => {
    fs.mkdirSync(snapshotDir, { recursive: true });
    const badPath = path.join(snapshotDir, "perf-2026-05-05T18-00-00-000Z__corrupt.json");
    fs.writeFileSync(badPath, "{not-valid", "utf-8");
    expect(engine.loadSnapshot(badPath)).toBeNull();
  });

  it("loadSnapshot returns null on missing file", () => {
    expect(engine.loadSnapshot(path.join(dir, "missing.json"))).toBeNull();
  });

  it("loadSnapshot returns null when payload is missing required fields", () => {
    fs.mkdirSync(snapshotDir, { recursive: true });
    const badPath = path.join(snapshotDir, "perf-2026-05-05T18-00-00-000Z__bad.json");
    fs.writeFileSync(badPath, JSON.stringify({ ts: "x" }), "utf-8");
    expect(engine.loadSnapshot(badPath)).toBeNull();
  });

  // ---- pruneSnapshots() ----

  it("pruneSnapshots retains keepLast newest, deletes older", () => {
    consensusModelPerformanceEngine.saveState(makeState({}), perfPath);
    for (let i = 0; i < 5; i++) {
      engine.captureSnapshot({
        perfStatePath: perfPath,
        snapshotDir,
        label: `s${i}`,
        now: new Date(`2026-05-05T${String(18 + i).padStart(2, "0")}:00:00.000Z`),
      });
    }
    const result = engine.pruneSnapshots({ snapshotDir, keepLast: 2 });
    expect(result.ok).toBe(true);
    expect(result.kept).toHaveLength(2);
    expect(result.pruned).toHaveLength(3);
    // Newest two kept (s3 and s4).
    expect(result.kept.map((m) => m.label).sort()).toEqual(["s3", "s4"]);
    // Pruned files actually gone from disk.
    for (const m of result.pruned) {
      expect(fs.existsSync(m.fullPath)).toBe(false);
    }
    // Kept files still on disk.
    for (const m of result.kept) {
      expect(fs.existsSync(m.fullPath)).toBe(true);
    }
  });

  it("pruneSnapshots with keepLast=0 deletes all snapshots", () => {
    consensusModelPerformanceEngine.saveState(makeState({}), perfPath);
    engine.captureSnapshot({ perfStatePath: perfPath, snapshotDir, label: "a" });
    engine.captureSnapshot({ perfStatePath: perfPath, snapshotDir, label: "b" });
    const result = engine.pruneSnapshots({ snapshotDir, keepLast: 0 });
    expect(result.kept).toHaveLength(0);
    expect(result.pruned).toHaveLength(2);
    expect(engine.listSnapshots(snapshotDir)).toHaveLength(0);
  });

  it("pruneSnapshots is a no-op when fewer snapshots than keepLast", () => {
    consensusModelPerformanceEngine.saveState(makeState({}), perfPath);
    engine.captureSnapshot({ perfStatePath: perfPath, snapshotDir, label: "a" });
    const result = engine.pruneSnapshots({ snapshotDir, keepLast: 5 });
    expect(result.kept).toHaveLength(1);
    expect(result.pruned).toHaveLength(0);
  });

  it("pruneSnapshots rejects negative keepLast", () => {
    const result = engine.pruneSnapshots({ snapshotDir, keepLast: -1 });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("non-negative");
  });

  // ---- getLatestPair() ----

  it("getLatestPair returns ok:false with fewer than 2 snapshots", () => {
    consensusModelPerformanceEngine.saveState(makeState({}), perfPath);
    engine.captureSnapshot({ perfStatePath: perfPath, snapshotDir, label: "alone" });
    const result = engine.getLatestPair({ snapshotDir });
    expect(result.ok).toBe(false);
    expect(result.before).toBeNull();
    expect(result.after).toBeNull();
    expect(result.error).toContain("at least 2");
  });

  it("getLatestPair returns most recent two snapshots when minSpanMs=0", () => {
    consensusModelPerformanceEngine.saveState(makeState({ a: { x: { ema: 0.8, n: 10 } } }), perfPath);
    engine.captureSnapshot({ perfStatePath: perfPath, snapshotDir, label: "old", now: new Date("2026-05-05T18:00:00.000Z") });
    consensusModelPerformanceEngine.saveState(makeState({ a: { x: { ema: 0.6, n: 12 } } }), perfPath);
    engine.captureSnapshot({ perfStatePath: perfPath, snapshotDir, label: "new", now: new Date("2026-05-05T19:00:00.000Z") });
    const result = engine.getLatestPair({ snapshotDir });
    expect(result.ok).toBe(true);
    expect(result.before!.label).toBe("old");
    expect(result.after!.label).toBe("new");
    expect(result.before!.state.vendors.a.tasks.x.ema).toBe(0.8);
    expect(result.after!.state.vendors.a.tasks.x.ema).toBe(0.6);
  });

  it("getLatestPair honors minSpanMs by skipping snapshots that are too close to after", () => {
    consensusModelPerformanceEngine.saveState(makeState({}), perfPath);
    // Three snapshots: -2h, -10min, now.
    engine.captureSnapshot({ perfStatePath: perfPath, snapshotDir, label: "two-hours-ago", now: new Date("2026-05-05T18:00:00.000Z") });
    engine.captureSnapshot({ perfStatePath: perfPath, snapshotDir, label: "ten-min-ago", now: new Date("2026-05-05T19:50:00.000Z") });
    engine.captureSnapshot({ perfStatePath: perfPath, snapshotDir, label: "now", now: new Date("2026-05-05T20:00:00.000Z") });
    // Min span 30 min → should skip "ten-min-ago" and pick "two-hours-ago" as before.
    const result = engine.getLatestPair({ snapshotDir, minSpanMs: 30 * 60 * 1000 });
    expect(result.ok).toBe(true);
    expect(result.before!.label).toBe("two-hours-ago");
    expect(result.after!.label).toBe("now");
  });

  it("getLatestPair returns ok:false when no snapshot satisfies minSpanMs", () => {
    consensusModelPerformanceEngine.saveState(makeState({}), perfPath);
    engine.captureSnapshot({ perfStatePath: perfPath, snapshotDir, label: "a", now: new Date("2026-05-05T19:55:00.000Z") });
    engine.captureSnapshot({ perfStatePath: perfPath, snapshotDir, label: "b", now: new Date("2026-05-05T20:00:00.000Z") });
    // Min span 1h → no candidate qualifies.
    const result = engine.getLatestPair({ snapshotDir, minSpanMs: 60 * 60 * 1000 });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("minSpanMs");
  });

  // ---- end-to-end: capture → list → drift-detector compatibility ----

  it("captured snapshots are drift-detector compatible (state shape preserved)", () => {
    consensusModelPerformanceEngine.saveState(makeState({ anthropic: { plan: { ema: 0.85, n: 30 } } }), perfPath);
    engine.captureSnapshot({ perfStatePath: perfPath, snapshotDir, label: "before", now: new Date("2026-05-05T18:00:00.000Z") });
    consensusModelPerformanceEngine.saveState(makeState({ anthropic: { plan: { ema: 0.50, n: 35 } } }), perfPath);
    engine.captureSnapshot({ perfStatePath: perfPath, snapshotDir, label: "after", now: new Date("2026-05-05T19:00:00.000Z") });
    const pair = engine.getLatestPair({ snapshotDir });
    expect(pair.ok).toBe(true);
    // Drift detector contract: state.vendors[v].tasks[t].{ema,n} must be present.
    expect(pair.before!.state.vendors.anthropic.tasks.plan.ema).toBe(0.85);
    expect(pair.before!.state.vendors.anthropic.tasks.plan.n).toBe(30);
    expect(pair.after!.state.vendors.anthropic.tasks.plan.ema).toBe(0.50);
    expect(pair.after!.state.vendors.anthropic.tasks.plan.n).toBe(35);
  });
});
