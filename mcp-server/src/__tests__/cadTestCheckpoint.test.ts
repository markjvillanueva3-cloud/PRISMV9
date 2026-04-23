/**
 * cadTestCheckpoint.test.ts — U-CINF05 unit tests
 *
 * Covers:
 *   1. createCadence initialises counters and defaults
 *   2. shouldCheckpoint fires on transition-count threshold
 *   3. shouldCheckpoint fires on time-interval threshold
 *   4. shouldCheckpoint is false before either threshold
 *   5. markSaved resets both counters
 *   6. recordTransition increments + returns whether to save
 *   7. save() writes valid JSON that round-trips through load()
 *   8. save() updates updatedAt + lastCheckpoint timestamps
 *   9. load() returns null on missing file
 *  10. load() returns null on corrupted JSON
 *  11. load() returns null on schema mismatch
 *  12. resumeDiff partitions completed vs pending correctly
 *  13. resumeDiff reverts 'running' entries to 'pending' in place
 *  14. resumeDiff treats 'error' as pending (will be retried)
 *  15. defaultPath returns batchId-keyed canonical path
 *  16. execute() validates op surface
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as os from "os";
import * as nodePath from "path";
import * as nodeFs from "fs";
import {
  CADTestCheckpointEngine,
  cadTestCheckpointEngine,
  DEFAULT_CHECKPOINT_EVERY,
  DEFAULT_CHECKPOINT_INTERVAL_MS,
  DEFAULT_STATE_DIR,
  type CheckpointFS,
} from "../engines/CADTestCheckpointEngine.js";
import type { TestBatch } from "../schemas/cadRegressionTestSchema.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function mkBatch(overrides: Partial<TestBatch> = {}): TestBatch {
  return {
    batchId: "11111111-1111-4111-8111-111111111111",
    schemaVersion: 1,
    stats: { total: 0, completed: 0, passed: 0, failed: 0, skipped: 0, errored: 0 },
    lastCheckpoint: "2026-04-19T00:00:00.000Z",
    createdAt: "2026-04-19T00:00:00.000Z",
    updatedAt: "2026-04-19T00:00:00.000Z",
    files: {},
    ...overrides,
  };
}

function tempPath(name: string): string {
  const dir = nodeFs.mkdtempSync(nodePath.join(os.tmpdir(), "cad-ckpt-"));
  return nodePath.join(dir, `${name}.json`);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("CADTestCheckpointEngine", () => {
  let engine: CADTestCheckpointEngine;

  beforeEach(() => {
    engine = new CADTestCheckpointEngine();
  });

  // ── Cadence ────────────────────────────────────────────────────────────────

  describe("cadence", () => {
    it("createCadence initialises counters and defaults", () => {
      const state = engine.createCadence({ nowMs: 1000 });
      expect(state.transitionsSinceSave).toBe(0);
      expect(state.lastSaveAtMs).toBe(1000);
      expect(state.every).toBe(DEFAULT_CHECKPOINT_EVERY);
      expect(state.intervalMs).toBe(DEFAULT_CHECKPOINT_INTERVAL_MS);
    });

    it("createCadence accepts overrides", () => {
      const state = engine.createCadence({ every: 7, intervalMs: 123, nowMs: 0 });
      expect(state.every).toBe(7);
      expect(state.intervalMs).toBe(123);
    });

    it("shouldCheckpoint fires on transition-count threshold", () => {
      const state = engine.createCadence({ every: 3, intervalMs: 1_000_000, nowMs: 0 });
      expect(engine.shouldCheckpoint(state, 0)).toBe(false);
      state.transitionsSinceSave = 3;
      expect(engine.shouldCheckpoint(state, 0)).toBe(true);
    });

    it("shouldCheckpoint fires on time-interval threshold", () => {
      const state = engine.createCadence({ every: 10_000, intervalMs: 100, nowMs: 0 });
      expect(engine.shouldCheckpoint(state, 99)).toBe(false);
      expect(engine.shouldCheckpoint(state, 100)).toBe(true);
    });

    it("shouldCheckpoint is false before either threshold", () => {
      const state = engine.createCadence({ every: 100, intervalMs: 60_000, nowMs: 1000 });
      state.transitionsSinceSave = 50;
      expect(engine.shouldCheckpoint(state, 30_000)).toBe(false);
    });

    it("markSaved resets both counters", () => {
      const state = engine.createCadence({ nowMs: 0 });
      state.transitionsSinceSave = 42;
      engine.markSaved(state, 5000);
      expect(state.transitionsSinceSave).toBe(0);
      expect(state.lastSaveAtMs).toBe(5000);
    });

    it("recordTransition increments + returns whether to save", () => {
      const state = engine.createCadence({ every: 2, intervalMs: 1_000_000, nowMs: 0 });
      expect(engine.recordTransition(state, 0)).toBe(false); // 1
      expect(engine.recordTransition(state, 0)).toBe(true);  // 2 (triggers)
      expect(state.transitionsSinceSave).toBe(2);
    });
  });

  // ── Persistence ────────────────────────────────────────────────────────────

  describe("persistence", () => {
    it("save+load round-trips a valid TestBatch", async () => {
      const path = tempPath("round-trip");
      const original = mkBatch();
      await engine.save(original, path);
      const loaded = await engine.load(path);
      expect(loaded).not.toBeNull();
      expect(loaded!.batchId).toBe(original.batchId);
      expect(loaded!.schemaVersion).toBe(1);
    });

    it("save updates updatedAt + lastCheckpoint timestamps", async () => {
      const path = tempPath("timestamps");
      const original = mkBatch({
        updatedAt: "2020-01-01T00:00:00.000Z",
        lastCheckpoint: "2020-01-01T00:00:00.000Z",
      });
      await engine.save(original, path);
      const loaded = await engine.load(path);
      expect(loaded!.updatedAt).not.toBe("2020-01-01T00:00:00.000Z");
      expect(loaded!.lastCheckpoint).not.toBe("2020-01-01T00:00:00.000Z");
      // Both should be recent (within the last 10s)
      const ageMs = Date.now() - new Date(loaded!.updatedAt).getTime();
      expect(ageMs).toBeLessThan(10_000);
    });

    it("load returns null on missing file", async () => {
      const fs: CheckpointFS = {
        existsSync: () => false,
        readFileSync: () => "",
        mkdirSync: () => {},
      };
      const loaded = await engine.load("H:/nope.json", fs);
      expect(loaded).toBeNull();
    });

    it("load returns null on corrupted JSON", async () => {
      const path = tempPath("corrupt");
      nodeFs.mkdirSync(nodePath.dirname(path), { recursive: true });
      nodeFs.writeFileSync(path, "{not json");
      const loaded = await engine.load(path);
      expect(loaded).toBeNull();
    });

    it("load returns null on schema mismatch", async () => {
      const path = tempPath("badschema");
      nodeFs.mkdirSync(nodePath.dirname(path), { recursive: true });
      nodeFs.writeFileSync(path, JSON.stringify({ wrong: "shape" }));
      const loaded = await engine.load(path);
      expect(loaded).toBeNull();
    });
  });

  // ── Resume ─────────────────────────────────────────────────────────────────

  describe("resumeDiff", () => {
    it("partitions completed vs pending correctly", () => {
      const batch = mkBatch({
        files: {
          "f1": { fileId: "f1", status: "pass",    errorType: "none", durationMs: 5,  retries: 0, artifacts: {} },
          "f2": { fileId: "f2", status: "fail",    errorType: "comparison", durationMs: 3, retries: 0, artifacts: {} },
          "f3": { fileId: "f3", status: "skip",    errorType: "none", durationMs: 0,  retries: 0, artifacts: {} },
          "f4": { fileId: "f4", status: "pending", errorType: "none", durationMs: 0,  retries: 0, artifacts: {} },
        },
      });
      const diff = engine.resumeDiff(batch);
      expect(diff.completedIds.sort()).toEqual(["f1", "f2", "f3"]);
      expect(diff.pendingIds).toEqual(["f4"]);
      expect(diff.revertedIds).toEqual([]);
    });

    it("reverts 'running' entries to 'pending' in place", () => {
      const batch = mkBatch({
        files: {
          "f1": { fileId: "f1", status: "running", errorType: "none", durationMs: 99, retries: 0, artifacts: {} },
        },
      });
      const diff = engine.resumeDiff(batch);
      expect(diff.revertedIds).toEqual(["f1"]);
      expect(diff.pendingIds).toEqual(["f1"]);
      expect(batch.files["f1"].status).toBe("pending");
      expect(batch.files["f1"].durationMs).toBe(0);
    });

    it("treats 'error' status as pending (retry)", () => {
      const batch = mkBatch({
        files: {
          "f1": { fileId: "f1", status: "error", errorType: "crash", durationMs: 10, retries: 1, artifacts: {} },
        },
      });
      const diff = engine.resumeDiff(batch);
      expect(diff.pendingIds).toEqual(["f1"]);
      expect(diff.completedIds).toEqual([]);
    });
  });

  // ── Misc ───────────────────────────────────────────────────────────────────

  it("defaultPath returns batchId-keyed canonical path", () => {
    const p = engine.defaultPath("00000000-0000-4000-8000-000000000000");
    expect(p).toBe(nodePath.join(DEFAULT_STATE_DIR, "00000000-0000-4000-8000-000000000000.json"));
  });

  it("execute() validates op surface", async () => {
    const result = await engine.execute({ op: "garbage" });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/save\|load\|diff/);
  });

  it("execute() routes save op", async () => {
    const path = tempPath("execute-save");
    const result = await engine.execute({
      op: "save",
      batch: mkBatch(),
      path,
    });
    expect(result.success).toBe(true);
    const loaded = await engine.load(path);
    expect(loaded).not.toBeNull();
  });

  it("execute() routes diff op", async () => {
    const batch = mkBatch({
      files: {
        "f1": { fileId: "f1", status: "pass", errorType: "none", durationMs: 1, retries: 0, artifacts: {} },
      },
    });
    const result = await engine.execute({ op: "diff", batch });
    expect(result.success).toBe(true);
    const data = result.data as { completedIds: string[] };
    expect(data.completedIds).toEqual(["f1"]);
  });

  it("singleton is usable", () => {
    const state = cadTestCheckpointEngine.createCadence();
    expect(state.every).toBe(DEFAULT_CHECKPOINT_EVERY);
  });
});
