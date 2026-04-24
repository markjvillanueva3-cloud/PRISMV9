/**
 * Tests for TrainingDatasetSnapshotEngine (U-LEARN-02).
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { FeatureStoreEngine } from "../engines/FeatureStoreEngine.js";
import { TrainingDatasetSnapshotEngine } from "../engines/TrainingDatasetSnapshotEngine.js";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-tsnap-"));
}

describe("TrainingDatasetSnapshotEngine — U-LEARN-02", () => {
  let storeRoot: string;
  let snapRoot: string;
  let store: FeatureStoreEngine;
  let snap: TrainingDatasetSnapshotEngine;
  const cleanups: string[] = [];

  beforeEach(() => {
    storeRoot = tmpRoot();
    snapRoot = tmpRoot();
    store = new FeatureStoreEngine(storeRoot);
    snap = new TrainingDatasetSnapshotEngine(snapRoot, store);
    cleanups.push(storeRoot, snapRoot);

    // Seed feature store with deterministic rows across two entities
    store.put({
      domain: "mill",
      feature_group: "sf_recommendation",
      feature_group_version: "v1",
      entity_id: "part-A",
      event_ts: "2026-04-20T12:00:00Z",
      feature_values: { rpm: 8000, sfm: 300 },
      lineage_id: "lin-A-old",
    });
    store.put({
      domain: "mill",
      feature_group: "sf_recommendation",
      feature_group_version: "v1",
      entity_id: "part-A",
      event_ts: "2026-04-22T12:00:00Z",
      feature_values: { rpm: 9000, sfm: 320 },
      lineage_id: "lin-A-new",
    });
    store.put({
      domain: "mill",
      feature_group: "sf_recommendation",
      feature_group_version: "v1",
      entity_id: "part-B",
      event_ts: "2026-04-21T12:00:00Z",
      feature_values: { rpm: 12000, sfm: 250 },
      lineage_id: "lin-B",
    });
  });

  afterAll(() => {
    for (const r of cleanups) {
      try { fs.rmSync(r, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  // ────────────────────────────────────────────────────────────────────
  // create — happy path + metadata
  // ────────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("materialises a snapshot from a FeatureStore query with correct metadata", () => {
      const res = snap.create({
        query: {
          domain: "mill",
          feature_group: "sf_recommendation",
          entity_ids: ["part-A", "part-B"],
          as_of_ts: "2026-04-23T00:00:00Z",
          limit_per_entity: 1,
        },
        label: "model-v1-training",
      });
      expect(res.ok).toBe(true);
      expect(res.snapshot_id).toMatch(/^[0-9a-f-]{36}$/);
      expect(res.manifest!.row_count).toBe(2);
      expect(res.manifest!.content_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(res.manifest!.label).toBe("model-v1-training");
    });

    it("writes manifest.json + rows.jsonl under snapshot directory", () => {
      const res = snap.create({
        query: {
          domain: "mill",
          feature_group: "sf_recommendation",
          entity_ids: ["part-A"],
          as_of_ts: "2026-04-23T00:00:00Z",
          limit_per_entity: 1,
        },
        snapshot_id: "snap-001",
      });
      expect(res.ok).toBe(true);
      expect(fs.existsSync(path.join(snapRoot, "snap-001", "manifest.json"))).toBe(true);
      expect(fs.existsSync(path.join(snapRoot, "snap-001", "rows.jsonl"))).toBe(true);
      const disk = JSON.parse(
        fs.readFileSync(path.join(snapRoot, "snap-001", "manifest.json"), "utf8"),
      );
      expect(disk.snapshot_id).toBe("snap-001");
      expect(disk.row_count).toBe(1);
    });

    it("refuses to overwrite an existing snapshot (immutable invariant)", () => {
      const id = "snap-immutable-1";
      snap.create({
        query: {
          domain: "mill",
          feature_group: "sf_recommendation",
          entity_ids: ["part-A"],
          limit_per_entity: 1,
        },
        snapshot_id: id,
      });
      const second = snap.create({
        query: {
          domain: "mill",
          feature_group: "sf_recommendation",
          entity_ids: ["part-B"],
          limit_per_entity: 1,
        },
        snapshot_id: id,
      });
      expect(second.ok).toBe(false);
      expect(second.warning).toMatch(/already exists/i);
    });

    it("produces identical content_hash for identical queries (deterministic)", () => {
      const query = {
        domain: "mill" as const,
        feature_group: "sf_recommendation",
        entity_ids: ["part-A", "part-B"],
        as_of_ts: "2026-04-23T00:00:00Z",
        limit_per_entity: 1,
      };
      const a = snap.create({ query, snapshot_id: "snap-det-a" });
      const b = snap.create({ query, snapshot_id: "snap-det-b" });
      expect(a.ok).toBe(true);
      expect(b.ok).toBe(true);
      expect(a.manifest!.content_hash).toBe(b.manifest!.content_hash);
    });

    it("produces different content_hash when as_of_ts shifts past a row", () => {
      const early = snap.create({
        query: {
          domain: "mill",
          feature_group: "sf_recommendation",
          entity_ids: ["part-A"],
          as_of_ts: "2026-04-21T00:00:00Z",  // only sees old row
          limit_per_entity: 1,
        },
        snapshot_id: "snap-early",
      });
      const late = snap.create({
        query: {
          domain: "mill",
          feature_group: "sf_recommendation",
          entity_ids: ["part-A"],
          as_of_ts: "2026-04-23T00:00:00Z",  // sees new row
          limit_per_entity: 1,
        },
        snapshot_id: "snap-late",
      });
      expect(early.ok).toBe(true);
      expect(late.ok).toBe(true);
      expect(early.manifest!.content_hash).not.toBe(late.manifest!.content_hash);
    });

    it("AS-OF correctness — lineage on frozen rows matches the AS-OF timestamp", () => {
      const early = snap.create({
        query: {
          domain: "mill",
          feature_group: "sf_recommendation",
          entity_ids: ["part-A"],
          as_of_ts: "2026-04-21T00:00:00Z",
          limit_per_entity: 1,
        },
        snapshot_id: "snap-as-of-early",
      });
      const loaded = snap.load("snap-as-of-early");
      expect(loaded.ok).toBe(true);
      expect(loaded.rows).toHaveLength(1);
      expect(loaded.rows![0].lineage_id).toBe("lin-A-old");

      const late = snap.create({
        query: {
          domain: "mill",
          feature_group: "sf_recommendation",
          entity_ids: ["part-A"],
          as_of_ts: "2026-04-23T00:00:00Z",
          limit_per_entity: 1,
        },
        snapshot_id: "snap-as-of-late",
      });
      const loadedLate = snap.load("snap-as-of-late");
      expect(loadedLate.rows![0].lineage_id).toBe("lin-A-new");
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // load — rehash verification
  // ────────────────────────────────────────────────────────────────────

  describe("load", () => {
    it("re-opens a snapshot and returns rows + manifest", () => {
      snap.create({
        query: {
          domain: "mill",
          feature_group: "sf_recommendation",
          entity_ids: ["part-A", "part-B"],
          as_of_ts: "2026-04-23T00:00:00Z",
          limit_per_entity: 1,
        },
        snapshot_id: "snap-load",
      });
      const loaded = snap.load("snap-load");
      expect(loaded.ok).toBe(true);
      expect(loaded.manifest!.snapshot_id).toBe("snap-load");
      expect(loaded.rows).toHaveLength(2);
    });

    it("detects tampering via content_hash rehash", () => {
      snap.create({
        query: {
          domain: "mill",
          feature_group: "sf_recommendation",
          entity_ids: ["part-A"],
          limit_per_entity: 1,
        },
        snapshot_id: "snap-tamper",
      });
      // Mutate the rows file in place
      const rowsPath = path.join(snapRoot, "snap-tamper", "rows.jsonl");
      const original = fs.readFileSync(rowsPath, "utf8");
      const tampered = original.replace(/"rpm":\s*9000/, '"rpm": 11111');
      fs.writeFileSync(rowsPath, tampered, "utf8");
      const loaded = snap.load("snap-tamper");
      expect(loaded.ok).toBe(false);
      expect(loaded.warning).toMatch(/content_hash mismatch/i);
    });

    it("returns ok:false for missing snapshot_id", () => {
      const loaded = snap.load("does-not-exist");
      expect(loaded.ok).toBe(false);
      expect(loaded.warning).toMatch(/not found/i);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // list + stats + variability across domains
  // ────────────────────────────────────────────────────────────────────

  describe("list + stats", () => {
    it("list returns all snapshots in creation order with label filter", () => {
      snap.create({
        query: { domain: "mill", feature_group: "sf_recommendation", entity_ids: ["part-A"], limit_per_entity: 1 },
        snapshot_id: "s-1", label: "exp-A",
      });
      snap.create({
        query: { domain: "mill", feature_group: "sf_recommendation", entity_ids: ["part-B"], limit_per_entity: 1 },
        snapshot_id: "s-2", label: "exp-B",
      });
      snap.create({
        query: { domain: "mill", feature_group: "sf_recommendation", entity_ids: ["part-A", "part-B"], limit_per_entity: 1 },
        snapshot_id: "s-3", label: "exp-A",
      });
      const all = snap.list();
      expect(all).toHaveLength(3);
      const onlyA = snap.list({ label: "exp-A" });
      expect(onlyA).toHaveLength(2);
      expect(onlyA.map((m) => m.snapshot_id).sort()).toEqual(["s-1", "s-3"]);
    });

    it("stats roll up count, total_rows, by_domain", () => {
      // Seed a lathe row so a multi-domain stats test has something to find
      store.put({
        domain: "lathe",
        feature_group: "turning_sf",
        feature_group_version: "v1",
        entity_id: "job-L1",
        event_ts: "2026-04-22T12:00:00Z",
        feature_values: { sfm: 400, ipr: 0.01 },
      });
      snap.create({
        query: { domain: "mill", feature_group: "sf_recommendation", entity_ids: ["part-A", "part-B"], limit_per_entity: 1 },
        snapshot_id: "mill-snap",
      });
      snap.create({
        query: { domain: "lathe", feature_group: "turning_sf", entity_ids: ["job-L1"], limit_per_entity: 1 },
        snapshot_id: "lathe-snap",
      });
      const s = snap.stats();
      expect(s.count).toBe(2);
      expect(s.total_rows).toBe(3);
      expect(s.by_domain.mill).toBe(1);
      expect(s.by_domain.lathe).toBe(1);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Failure modes
  // ────────────────────────────────────────────────────────────────────

  describe("failure modes (never-throw)", () => {
    it("handles query for non-existent feature_group (returns 0 rows, still snapshottable)", () => {
      const res = snap.create({
        query: {
          domain: "mill",
          feature_group: "never_written",
          entity_ids: ["part-A"],
          limit_per_entity: 1,
        },
        snapshot_id: "empty-snap",
      });
      expect(res.ok).toBe(true);
      expect(res.manifest!.row_count).toBe(0);
      expect(res.manifest!.miss_count).toBe(1);
    });

    it("load recovers from corrupted manifest JSON", () => {
      snap.create({
        query: { domain: "mill", feature_group: "sf_recommendation", entity_ids: ["part-A"], limit_per_entity: 1 },
        snapshot_id: "corrupt-snap",
      });
      fs.writeFileSync(
        path.join(snapRoot, "corrupt-snap", "manifest.json"),
        "{not-valid-json",
        "utf8",
      );
      const loaded = snap.load("corrupt-snap");
      expect(loaded.ok).toBe(false);
      expect(loaded.warning).toMatch(/load failed/i);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Self-awareness
  // ────────────────────────────────────────────────────────────────────

  it("getSelfAwareness() reports capabilities + dependencies", () => {
    const sa = TrainingDatasetSnapshotEngine.getSelfAwareness();
    expect(sa.name).toBe("TrainingDatasetSnapshotEngine");
    expect(sa.capabilities).toContain("create");
    expect(sa.capabilities).toContain("load");
    expect(sa.dependencies).toContain("FeatureStoreEngine");
  });
});
