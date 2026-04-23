/**
 * Tests for FeatureStoreEngine (U-LEARN-02).
 *
 * Core proof: point-in-time AS-OF semantics — training reads at t=T0 never
 * see feature rows observable at t>T0.  Also: per-group shard isolation,
 * lineage threading, atomic writes, torn-tail tolerance, ingest-from-
 * OutcomeCaptureBus event.
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { FeatureStoreEngine } from "../engines/FeatureStoreEngine.js";
import type { OutcomeEvent } from "../schemas/outcomeEventSchema.js";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-fs-"));
}

describe("FeatureStoreEngine — U-LEARN-02", () => {
  let root: string;
  let store: FeatureStoreEngine;
  const cleanups: string[] = [];

  beforeEach(() => {
    root = tmpRoot();
    store = new FeatureStoreEngine(root);
    cleanups.push(root);
  });

  afterAll(() => {
    for (const r of cleanups) {
      try { fs.rmSync(r, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  // --- put() ------------------------------------------------------------

  it("put: writes a minimal valid row", () => {
    const res = store.put({
      domain: "mill",
      feature_group: "material_x_tool",
      feature_group_version: "v1",
      entity_id: "D2_carbide_4fl",
      event_ts: new Date().toISOString(),
      feature_values: { kienzle_residual: -12.5 },
    });
    expect(res.ok).toBe(true);
    expect(res.path).toContain("material_x_tool");
  });

  it("put: rejects invalid domain", () => {
    const res = store.put({
      // @ts-expect-error — intentional
      domain: "teleport",
      feature_group: "whatever",
      feature_group_version: "v1",
      entity_id: "x",
      event_ts: new Date().toISOString(),
      feature_values: {},
    });
    expect(res.ok).toBe(false);
    expect(res.warning).toContain("schema validation failed");
  });

  it("put: rejects invalid version format", () => {
    const res = store.put({
      domain: "mill",
      feature_group: "g",
      // @ts-expect-error — bad version
      feature_group_version: "1.0",
      entity_id: "x",
      event_ts: new Date().toISOString(),
      feature_values: {},
    });
    expect(res.ok).toBe(false);
  });

  it("put: never throws on non-JSON-safe payload (circular)", () => {
    const circ: Record<string, unknown> = {};
    circ.self = circ;
    expect(() =>
      store.put({
        domain: "mill",
        feature_group: "g",
        feature_group_version: "v1",
        entity_id: "x",
        event_ts: new Date().toISOString(),
        feature_values: circ,
      }),
    ).not.toThrow();
  });

  // --- getHistoricalFeatures() — point-in-time correctness --------------

  it("AS-OF: returns most-recent row ≤ as_of_ts per entity", () => {
    const base = Date.now();
    const iso = (offset: number) => new Date(base + offset).toISOString();

    store.put({
      domain: "mill", feature_group: "f", feature_group_version: "v1",
      entity_id: "E1", event_ts: iso(-30_000),
      feature_values: { sfm: 100 },
    });
    store.put({
      domain: "mill", feature_group: "f", feature_group_version: "v1",
      entity_id: "E1", event_ts: iso(-10_000),
      feature_values: { sfm: 120 },
    });
    store.put({
      domain: "mill", feature_group: "f", feature_group_version: "v1",
      entity_id: "E1", event_ts: iso(+10_000),     // future relative to as_of
      feature_values: { sfm: 150 },
    });

    const result = store.getHistoricalFeatures({
      domain: "mill",
      feature_group: "f",
      entity_ids: ["E1"],
      as_of_ts: iso(0),
      limit_per_entity: 1,
    });

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].feature_values.sfm).toBe(120);   // not 100, not 150
    expect(result.misses).toEqual([]);
  });

  it("AS-OF: entity with no row ≤ as_of_ts appears in misses[]", () => {
    store.put({
      domain: "mill", feature_group: "f", feature_group_version: "v1",
      entity_id: "E1", event_ts: new Date(Date.now() + 60_000).toISOString(),
      feature_values: { sfm: 120 },
    });
    const result = store.getHistoricalFeatures({
      domain: "mill",
      feature_group: "f",
      entity_ids: ["E1", "E2"],
      as_of_ts: new Date().toISOString(),
    });
    expect(result.rows.length).toBe(0);
    expect(result.misses).toContain("E1");
    expect(result.misses).toContain("E2");
  });

  it("AS-OF: multiple entities in one query", () => {
    const ts = new Date().toISOString();
    store.put({
      domain: "lathe", feature_group: "f", feature_group_version: "v1",
      entity_id: "E1", event_ts: ts, feature_values: { a: 1 },
    });
    store.put({
      domain: "lathe", feature_group: "f", feature_group_version: "v1",
      entity_id: "E2", event_ts: ts, feature_values: { a: 2 },
    });
    store.put({
      domain: "lathe", feature_group: "f", feature_group_version: "v1",
      entity_id: "E3", event_ts: ts, feature_values: { a: 3 },
    });
    const r = store.getHistoricalFeatures({
      domain: "lathe",
      feature_group: "f",
      entity_ids: ["E1", "E2", "E3"],
    });
    expect(r.rows.length).toBe(3);
    expect(r.misses).toEqual([]);
  });

  it("feature_keys filter projects only requested keys", () => {
    const ts = new Date().toISOString();
    store.put({
      domain: "wedm", feature_group: "f", feature_group_version: "v1",
      entity_id: "P-100", event_ts: ts,
      feature_values: { sfm: 100, ipt: 0.003, doc: 0.1, ra: 1.6 },
    });
    const r = store.getHistoricalFeatures({
      domain: "wedm", feature_group: "f",
      entity_ids: ["P-100"],
      feature_keys: ["sfm", "ra"],
    });
    expect(Object.keys(r.rows[0].feature_values).sort()).toEqual(["ra", "sfm"]);
  });

  // --- shard isolation --------------------------------------------------

  it("different feature groups stay isolated", () => {
    const ts = new Date().toISOString();
    store.put({
      domain: "mill", feature_group: "GroupA", feature_group_version: "v1",
      entity_id: "X", event_ts: ts, feature_values: { a: 1 },
    });
    store.put({
      domain: "mill", feature_group: "GroupB", feature_group_version: "v1",
      entity_id: "X", event_ts: ts, feature_values: { b: 2 },
    });
    const a = store.getHistoricalFeatures({
      domain: "mill", feature_group: "GroupA", entity_ids: ["X"],
    });
    expect(Object.keys(a.rows[0].feature_values)).toEqual(["a"]);
  });

  it("different versions stay isolated", () => {
    const ts = new Date().toISOString();
    store.put({
      domain: "mill", feature_group: "G", feature_group_version: "v1",
      entity_id: "X", event_ts: ts, feature_values: { v: 1 },
    });
    store.put({
      domain: "mill", feature_group: "G", feature_group_version: "v2",
      entity_id: "X", event_ts: ts, feature_values: { v: 99 },
    });
    const r1 = store.getHistoricalFeatures({
      domain: "mill", feature_group: "G",
      feature_group_version: "v1", entity_ids: ["X"],
    });
    const r2 = store.getHistoricalFeatures({
      domain: "mill", feature_group: "G",
      feature_group_version: "v2", entity_ids: ["X"],
    });
    expect(r1.rows[0].feature_values.v).toBe(1);
    expect(r2.rows[0].feature_values.v).toBe(99);
  });

  // --- ingestOutcomeEvent ----------------------------------------------

  it("ingestOutcomeEvent: converts an event to a feature row", () => {
    const ev: OutcomeEvent = {
      schemaVersion: "1.0.0",
      event_id: "EVT-1",
      lineage_id: "LNG-1",
      domain: "mill",
      kind: "cycle_time_measurement",
      severity: "info",
      source: "controller",
      timestamp: new Date().toISOString(),
      context: { material: "D2" },
      actual: { cycle_min: 14.3 },
    };
    const res = store.ingestOutcomeEvent(ev, {
      feature_group: "outcome_bus",
      entity_id: "D2_op10",
    });
    expect(res.ok).toBe(true);

    const r = store.getHistoricalFeatures({
      domain: "mill", feature_group: "outcome_bus",
      entity_ids: ["D2_op10"],
    });
    expect(r.rows.length).toBe(1);
    expect(r.rows[0].source_event_id).toBe("EVT-1");
    expect(r.rows[0].lineage_id).toBe("LNG-1");
    const fv = r.rows[0].feature_values as Record<string, unknown>;
    expect(fv.kind).toBe("cycle_time_measurement");
    expect((fv.actual as { cycle_min: number }).cycle_min).toBeCloseTo(14.3, 5);
  });

  // --- durability --------------------------------------------------------

  it("rapid 100 writes all land (no lost rows)", () => {
    const ts = new Date().toISOString();
    for (let i = 0; i < 100; i++) {
      store.put({
        domain: "mill", feature_group: "load", feature_group_version: "v1",
        entity_id: `E${i}`, event_ts: ts, feature_values: { i },
      });
    }
    const stats = store.stats();
    const grp = stats.groups.find((g) => g.feature_group === "load");
    expect(grp?.row_count).toBe(100);
  });

  it("skips torn tail lines (crash-tolerant read)", () => {
    const ts = new Date().toISOString();
    store.put({
      domain: "mill", feature_group: "f", feature_group_version: "v1",
      entity_id: "OK", event_ts: ts, feature_values: { x: 1 },
    });
    // Simulate crash-mid-write torn line
    const filePath = path.join(root, "mill", "f", "v1.jsonl");
    fs.appendFileSync(filePath, "{partial_line_no_newline_or_closing");
    const r = store.getHistoricalFeatures({
      domain: "mill", feature_group: "f", entity_ids: ["OK"],
    });
    expect(r.rows.length).toBe(1);
    expect(r.rows[0].feature_values.x).toBe(1);
  });

  // --- stats + listFeatureGroups ---------------------------------------

  it("listFeatureGroups discovers all shards", () => {
    const ts = new Date().toISOString();
    store.put({
      domain: "mill", feature_group: "a", feature_group_version: "v1",
      entity_id: "E", event_ts: ts, feature_values: {},
    });
    store.put({
      domain: "mill", feature_group: "a", feature_group_version: "v2",
      entity_id: "E", event_ts: ts, feature_values: {},
    });
    store.put({
      domain: "lathe", feature_group: "b", feature_group_version: "v1",
      entity_id: "E", event_ts: ts, feature_values: {},
    });
    const groups = store.listFeatureGroups();
    expect(groups.length).toBe(3);
    expect(groups.some((g) => g.domain === "lathe" && g.feature_group === "b")).toBe(true);
  });

  it("stats reports row counts per shard", () => {
    const ts = new Date().toISOString();
    store.put({
      domain: "mill", feature_group: "g", feature_group_version: "v1",
      entity_id: "E1", event_ts: ts, feature_values: { x: 1 },
    });
    store.put({
      domain: "mill", feature_group: "g", feature_group_version: "v1",
      entity_id: "E2", event_ts: ts, feature_values: { x: 2 },
    });
    const s = store.stats();
    const g = s.groups.find((x) => x.feature_group === "g");
    expect(g?.row_count).toBe(2);
    expect((g?.bytes ?? 0)).toBeGreaterThan(0);
  });

  // --- self-awareness + query edge cases --------------------------------

  it("exposes self-awareness metadata", () => {
    const meta = FeatureStoreEngine.getSelfAwareness();
    expect(meta.name).toBe("FeatureStoreEngine");
    expect(meta.milestone).toContain("U-LEARN-02");
    expect(meta.capabilities).toContain("getHistoricalFeatures");
  });

  it("query on non-existent shard returns all misses cleanly", () => {
    const r = store.getHistoricalFeatures({
      domain: "grinder", feature_group: "nothing_here",
      entity_ids: ["A", "B"],
    });
    expect(r.rows).toEqual([]);
    expect(r.misses).toEqual(["A", "B"]);
  });

  it("put rejects oversized row (> 128KB)", () => {
    const huge = "x".repeat(200 * 1024);
    const res = store.put({
      domain: "mill", feature_group: "g", feature_group_version: "v1",
      entity_id: "E", event_ts: new Date().toISOString(),
      feature_values: { payload: huge },
    });
    expect(res.ok).toBe(false);
    expect(res.warning).toContain("exceeds");
  });
});
