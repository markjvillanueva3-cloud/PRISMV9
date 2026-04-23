/**
 * Tests for businessDispatcher FeatureStore actions
 * (PSAU P2.5-LEARN U-LEARN-02 — point-in-time feature retrieval wiring).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { businessDispatch } from "../../tools/dispatchers/businessDispatcher.js";

const FS_DIR = path.resolve(process.cwd(), "state/features");
const TEST_DOMAIN = "other";                 // keep writes out of production paths
const TEST_GROUP = "psau_test_group";
const SHARD_DIR = path.join(FS_DIR, TEST_DOMAIN, TEST_GROUP);

function cleanupShard(): void {
  if (fs.existsSync(SHARD_DIR)) {
    fs.rmSync(SHARD_DIR, { recursive: true, force: true });
  }
}

describe("businessDispatcher — FeatureStore wiring (U-LEARN-02)", () => {
  beforeAll(cleanupShard);
  afterAll(cleanupShard);

  it("feature_put: writes a minimal row", async () => {
    const result = await businessDispatch({
      action: "feature_put",
      domain: TEST_DOMAIN,
      feature_group: TEST_GROUP,
      feature_group_version: "v1",
      entity_id: "TEST-E1",
      event_ts: new Date().toISOString(),
      feature_values: { sfm: 120 },
    });
    expect(result.success).toBe(true);
    const d = result.data as any;
    expect(d.ok).toBe(true);
    expect(d.path).toContain(TEST_GROUP);
  });

  it("feature_put: rejects invalid domain", async () => {
    const result = await businessDispatch({
      action: "feature_put",
      domain: "not_a_real_domain",
      feature_group: TEST_GROUP,
      feature_group_version: "v1",
      entity_id: "X",
      event_ts: new Date().toISOString(),
      feature_values: {},
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid input");
  });

  it("feature_put: rejects bad version format", async () => {
    const result = await businessDispatch({
      action: "feature_put",
      domain: TEST_DOMAIN,
      feature_group: TEST_GROUP,
      feature_group_version: "1.0",                    // not v<N>
      entity_id: "X",
      event_ts: new Date().toISOString(),
      feature_values: {},
    });
    expect(result.success).toBe(false);
  });

  it("feature_get_historical: AS-OF returns most-recent row ≤ as_of_ts", async () => {
    const base = Date.now();
    const iso = (offset: number) => new Date(base + offset).toISOString();
    const ts_old = iso(-30_000);
    const ts_new = iso(-10_000);
    const ts_future = iso(+10_000);

    await businessDispatch({
      action: "feature_put",
      domain: TEST_DOMAIN,
      feature_group: TEST_GROUP,
      feature_group_version: "v1",
      entity_id: "ASOF-E1",
      event_ts: ts_old,
      feature_values: { sfm: 100 },
    });
    await businessDispatch({
      action: "feature_put",
      domain: TEST_DOMAIN,
      feature_group: TEST_GROUP,
      feature_group_version: "v1",
      entity_id: "ASOF-E1",
      event_ts: ts_new,
      feature_values: { sfm: 120 },
    });
    await businessDispatch({
      action: "feature_put",
      domain: TEST_DOMAIN,
      feature_group: TEST_GROUP,
      feature_group_version: "v1",
      entity_id: "ASOF-E1",
      event_ts: ts_future,
      feature_values: { sfm: 150 },
    });

    const q = await businessDispatch({
      action: "feature_get_historical",
      domain: TEST_DOMAIN,
      feature_group: TEST_GROUP,
      entity_ids: ["ASOF-E1"],
      as_of_ts: iso(0),
    });
    expect(q.success).toBe(true);
    const d = q.data as any;
    expect(d.rows.length).toBe(1);
    expect(d.rows[0].feature_values.sfm).toBe(120);       // not 100, not 150
  });

  it("feature_get_historical: records misses for unseen entities", async () => {
    const q = await businessDispatch({
      action: "feature_get_historical",
      domain: TEST_DOMAIN,
      feature_group: TEST_GROUP,
      entity_ids: ["NONEXISTENT-99"],
      as_of_ts: new Date().toISOString(),
    });
    expect(q.success).toBe(true);
    const d = q.data as any;
    expect(d.rows.length).toBe(0);
    expect(d.misses).toContain("NONEXISTENT-99");
  });

  it("feature_get_historical: feature_keys projection", async () => {
    await businessDispatch({
      action: "feature_put",
      domain: TEST_DOMAIN,
      feature_group: TEST_GROUP,
      feature_group_version: "v1",
      entity_id: "PROJ-E1",
      event_ts: new Date().toISOString(),
      feature_values: { sfm: 200, ipt: 0.004, doc: 0.1, ra: 1.2 },
    });
    const q = await businessDispatch({
      action: "feature_get_historical",
      domain: TEST_DOMAIN,
      feature_group: TEST_GROUP,
      entity_ids: ["PROJ-E1"],
      feature_keys: ["sfm", "ra"],
    });
    const d = q.data as any;
    expect(Object.keys(d.rows[0].feature_values).sort()).toEqual(["ra", "sfm"]);
  });

  it("feature_get_historical: rejects invalid input", async () => {
    const q = await businessDispatch({
      action: "feature_get_historical",
      domain: TEST_DOMAIN,
      feature_group: TEST_GROUP,
      entity_ids: [],                 // min(1) violation
    });
    expect(q.success).toBe(false);
    expect(q.error).toContain("Invalid input");
  });

  it("feature_list_groups: returns the test shard", async () => {
    const q = await businessDispatch({ action: "feature_list_groups" });
    expect(q.success).toBe(true);
    const d = q.data as any;
    expect(Array.isArray(d.groups)).toBe(true);
    const ours = d.groups.find((g: any) =>
      g.domain === TEST_DOMAIN && g.feature_group === TEST_GROUP,
    );
    expect(ours).toBeDefined();
  });

  it("feature_store_stats: reports row counts", async () => {
    const q = await businessDispatch({ action: "feature_store_stats" });
    expect(q.success).toBe(true);
    const d = q.data as any;
    expect(Array.isArray(d.groups)).toBe(true);
    const ours = d.groups.find((g: any) =>
      g.domain === TEST_DOMAIN && g.feature_group === TEST_GROUP,
    );
    expect(ours).toBeDefined();
    expect(ours.row_count).toBeGreaterThan(0);
  });

  it("feature_put rejects empty entity_id", async () => {
    const result = await businessDispatch({
      action: "feature_put",
      domain: TEST_DOMAIN,
      feature_group: TEST_GROUP,
      feature_group_version: "v1",
      entity_id: "",
      event_ts: new Date().toISOString(),
      feature_values: {},
    });
    expect(result.success).toBe(false);
  });

  it("feature_put rejects invalid event_ts", async () => {
    const result = await businessDispatch({
      action: "feature_put",
      domain: TEST_DOMAIN,
      feature_group: TEST_GROUP,
      feature_group_version: "v1",
      entity_id: "TS-BAD",
      event_ts: "not-a-date",
      feature_values: {},
    });
    expect(result.success).toBe(false);
  });
});
