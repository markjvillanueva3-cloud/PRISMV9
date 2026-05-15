/**
 * devDispatcher.reverse-index-wire.test.ts
 *
 * OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-REVERSE-INDEX —
 * round-trip wire tests for the 11 new `rev_idx_*` actions wrapping
 * ReverseIndexEngine through prism_dev.
 *
 * ReverseIndexEngine is a singleton with 5 named indexes that PERSIST to disk
 * under data/state/indexes/. Tests use unique test-key strings + cleanup via
 * remove_mapping to avoid polluting the production index data. We do NOT
 * exercise rebuild_all (heavyweight — scans dispatchers + engines dirs).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

const INDEX_NAMES = [
  "ACTION_TO_ENGINE",
  "SKILL_TO_ACTION",
  "ENGINE_TO_DEPENDENTS",
  "KEYWORD_TO_ASSETS",
  "TYPE_TO_ASSETS",
] as const;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerDevDispatcher(fakeServer);
  return { handler };
}

async function call(
  handler: Handler,
  action: string,
  params: Record<string, any> = {},
): Promise<any> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try {
    return JSON.parse(text);
  } catch {
    return r;
  }
}

describe("prism_dev rev_idx_* wire (OBSIDIAN-PRISM-OS-MS0)", () => {
  let handler: Handler;

  beforeAll(async () => {
    handler = await createServer().handler;
  });

  // ---------------------------------------------------------------------
  // Read-side lookups — engine should return [] for unknown keys
  // ---------------------------------------------------------------------

  describe("lookup actions return [] for unknown keys (engine line 107-144)", () => {
    it("rev_idx_action_to_engine for nonexistent action returns []", async () => {
      const r = await call(handler, "rev_idx_action_to_engine", {
        action: "test_iter6_never_exists_xyz",
      });
      expect(r.success).toBe(true);
      // slimResponse may strip empty array — normalize before assert
      expect(r.engines ?? []).toEqual([]);
    });

    it("rev_idx_skill_to_action for nonexistent skill returns []", async () => {
      const r = await call(handler, "rev_idx_skill_to_action", {
        skill: "test_iter6_never_skill_xyz",
      });
      expect(r.success).toBe(true);
      expect(r.actions ?? []).toEqual([]);
    });

    it("rev_idx_engine_to_dependents for nonexistent engine returns []", async () => {
      const r = await call(handler, "rev_idx_engine_to_dependents", {
        engine: "test_iter6_never_engine_xyz",
      });
      expect(r.success).toBe(true);
      expect(r.dependents ?? []).toEqual([]);
    });

    it("rev_idx_keyword_search for unknown keyword returns []", async () => {
      const r = await call(handler, "rev_idx_keyword_search", {
        keyword: "test_iter6_never_keyword_xyz",
      });
      expect(r.success).toBe(true);
      expect(r.assets ?? []).toEqual([]);
    });

    it("rev_idx_assets_by_type for unknown type returns []", async () => {
      const r = await call(handler, "rev_idx_assets_by_type", {
        asset_type: "test_iter6_never_type_xyz",
      });
      expect(r.success).toBe(true);
      expect(r.assets ?? []).toEqual([]);
    });

    it("keys are case-INsensitive (engine line 107: .toLowerCase())", async () => {
      // After adding 'TestKeyUPPER' both queries must resolve
      const ADD_KEY = "TestIter6CaseUpper";
      const VAL = "iter6-case-value-1";
      await call(handler, "rev_idx_add_mapping", {
        index_name: "KEYWORD_TO_ASSETS",
        key: ADD_KEY,
        value: VAL,
      });
      const upper = await call(handler, "rev_idx_keyword_search", {
        keyword: ADD_KEY.toUpperCase(),
      });
      const lower = await call(handler, "rev_idx_keyword_search", {
        keyword: ADD_KEY.toLowerCase(),
      });
      expect(upper.success && lower.success).toBe(true);
      expect((upper.assets ?? []).includes(VAL)).toBe(true);
      expect((lower.assets ?? []).includes(VAL)).toBe(true);
      // Cleanup
      await call(handler, "rev_idx_remove_mapping", {
        index_name: "KEYWORD_TO_ASSETS",
        key: ADD_KEY,
        value: VAL,
      });
    });
  });

  // ---------------------------------------------------------------------
  // Add → lookup → remove → lookup round-trip
  // ---------------------------------------------------------------------

  describe("add_mapping → lookup → remove_mapping round-trip", () => {
    it("adds a mapping then keyword_search returns it", async () => {
      const KEY = "test_iter6_round_trip_key";
      const VAL = "iter6-roundtrip-value-A";
      // Add
      const add = await call(handler, "rev_idx_add_mapping", {
        index_name: "KEYWORD_TO_ASSETS",
        key: KEY,
        value: VAL,
      });
      expect(add.success).toBe(true);
      expect(add.update.indexName).toBe("KEYWORD_TO_ASSETS");
      expect(add.update.keysUpdated).toBe(1);
      // Lookup
      const lookup = await call(handler, "rev_idx_keyword_search", { keyword: KEY });
      expect(lookup.success).toBe(true);
      expect((lookup.assets ?? []).includes(VAL)).toBe(true);
      // Remove
      const remove = await call(handler, "rev_idx_remove_mapping", {
        index_name: "KEYWORD_TO_ASSETS",
        key: KEY,
        value: VAL,
      });
      expect(remove.success).toBe(true);
      // Re-lookup → []
      const after = await call(handler, "rev_idx_keyword_search", { keyword: KEY });
      expect(after.success).toBe(true);
      expect(after.assets ?? []).toEqual([]);
    });

    it("duplicate add of same value does NOT create duplicate (engine line 181)", async () => {
      const KEY = "test_iter6_dedup_key";
      const VAL = "iter6-dedup-value";
      await call(handler, "rev_idx_add_mapping", {
        index_name: "KEYWORD_TO_ASSETS",
        key: KEY,
        value: VAL,
      });
      await call(handler, "rev_idx_add_mapping", {
        index_name: "KEYWORD_TO_ASSETS",
        key: KEY,
        value: VAL,
      });
      const lookup = await call(handler, "rev_idx_keyword_search", { keyword: KEY });
      const assets = lookup.assets ?? [];
      // Engine: index.entries[key].values.includes(value) guard prevents dupe
      const occurrences = assets.filter((v: string) => v === VAL).length;
      expect(occurrences).toBe(1);
      // Cleanup
      await call(handler, "rev_idx_remove_mapping", {
        index_name: "KEYWORD_TO_ASSETS",
        key: KEY,
        value: VAL,
      });
    });

    it("two distinct values under same key are both retrievable", async () => {
      const KEY = "test_iter6_multivalue_key";
      const VAL1 = "iter6-mv-A";
      const VAL2 = "iter6-mv-B";
      await call(handler, "rev_idx_add_mapping", {
        index_name: "KEYWORD_TO_ASSETS",
        key: KEY,
        value: VAL1,
      });
      await call(handler, "rev_idx_add_mapping", {
        index_name: "KEYWORD_TO_ASSETS",
        key: KEY,
        value: VAL2,
      });
      const lookup = await call(handler, "rev_idx_keyword_search", { keyword: KEY });
      const assets = lookup.assets ?? [];
      expect(assets.includes(VAL1)).toBe(true);
      expect(assets.includes(VAL2)).toBe(true);
      // Cleanup
      await call(handler, "rev_idx_remove_mapping", { index_name: "KEYWORD_TO_ASSETS", key: KEY, value: VAL1 });
      await call(handler, "rev_idx_remove_mapping", { index_name: "KEYWORD_TO_ASSETS", key: KEY, value: VAL2 });
    });

    it("removing the last value deletes the entry (engine line 236-238)", async () => {
      const KEY = "test_iter6_lastval_key";
      const VAL = "iter6-lastval-A";
      await call(handler, "rev_idx_add_mapping", {
        index_name: "KEYWORD_TO_ASSETS",
        key: KEY,
        value: VAL,
      });
      await call(handler, "rev_idx_remove_mapping", {
        index_name: "KEYWORD_TO_ASSETS",
        key: KEY,
        value: VAL,
      });
      // Entry should be gone; lookup returns []
      const lookup = await call(handler, "rev_idx_keyword_search", { keyword: KEY });
      expect(lookup.success).toBe(true);
      expect(lookup.assets ?? []).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------
  // Cross-index isolation — same key in different indexes is independent
  // ---------------------------------------------------------------------

  describe("cross-index isolation", () => {
    it("same key in KEYWORD_TO_ASSETS and TYPE_TO_ASSETS are independent buckets", async () => {
      const KEY = "test_iter6_cross_idx";
      const KEYWORD_VAL = "iter6-cross-keyword-side";
      const TYPE_VAL = "iter6-cross-type-side";
      await call(handler, "rev_idx_add_mapping", {
        index_name: "KEYWORD_TO_ASSETS",
        key: KEY,
        value: KEYWORD_VAL,
      });
      await call(handler, "rev_idx_add_mapping", {
        index_name: "TYPE_TO_ASSETS",
        key: KEY,
        value: TYPE_VAL,
      });
      const keyword = await call(handler, "rev_idx_keyword_search", { keyword: KEY });
      const byType = await call(handler, "rev_idx_assets_by_type", { asset_type: KEY });
      expect((keyword.assets ?? []).includes(KEYWORD_VAL)).toBe(true);
      expect((keyword.assets ?? []).includes(TYPE_VAL)).toBe(false);
      expect((byType.assets ?? []).includes(TYPE_VAL)).toBe(true);
      expect((byType.assets ?? []).includes(KEYWORD_VAL)).toBe(false);
      // Cleanup
      await call(handler, "rev_idx_remove_mapping", { index_name: "KEYWORD_TO_ASSETS", key: KEY, value: KEYWORD_VAL });
      await call(handler, "rev_idx_remove_mapping", { index_name: "TYPE_TO_ASSETS", key: KEY, value: TYPE_VAL });
    });
  });

  // ---------------------------------------------------------------------
  // Stats — must return all 5 documented indexes
  // ---------------------------------------------------------------------

  describe("rev_idx_stats returns all 5 indexes with documented shape", () => {
    it("stats has one entry per INDEX_NAME with {totalKeys, totalValues, avgValuesPerKey}", async () => {
      const r = await call(handler, "rev_idx_stats", {});
      expect(r.success).toBe(true);
      for (const idxName of INDEX_NAMES) {
        const s = r.stats[idxName];
        // Every index must appear in stats (engine line 314-323)
        expect(typeof s.totalKeys).toBe("number");
        expect(s.totalKeys).toBeGreaterThanOrEqual(0);
        expect(typeof s.totalValues).toBe("number");
        expect(s.totalValues).toBeGreaterThanOrEqual(0);
        expect(typeof s.avgValuesPerKey).toBe("number");
        expect(s.avgValuesPerKey).toBeGreaterThanOrEqual(0);
        // Math invariant: avgValuesPerKey = totalValues / totalKeys (or 0 when totalKeys=0)
        if (s.totalKeys === 0) {
          expect(s.avgValuesPerKey).toBe(0);
        } else {
          expect(s.avgValuesPerKey).toBeCloseTo(s.totalValues / s.totalKeys, 6);
        }
      }
    });

    it("adding a mapping increments KEYWORD_TO_ASSETS stats by exactly 1 key + 1 value", async () => {
      const KEY = "test_iter6_stats_increment";
      const VAL = "iter6-stats-val";
      const before = (await call(handler, "rev_idx_stats", {})).stats.KEYWORD_TO_ASSETS;
      await call(handler, "rev_idx_add_mapping", {
        index_name: "KEYWORD_TO_ASSETS",
        key: KEY,
        value: VAL,
      });
      const after = (await call(handler, "rev_idx_stats", {})).stats.KEYWORD_TO_ASSETS;
      expect(after.totalKeys).toBe(before.totalKeys + 1);
      expect(after.totalValues).toBe(before.totalValues + 1);
      // Cleanup
      await call(handler, "rev_idx_remove_mapping", {
        index_name: "KEYWORD_TO_ASSETS",
        key: KEY,
        value: VAL,
      });
    });
  });

  // ---------------------------------------------------------------------
  // rev_idx_rebuild — single-index rebuild (use TYPE_TO_ASSETS, lightest)
  // ---------------------------------------------------------------------

  describe("rev_idx_rebuild", () => {
    it("rebuild TYPE_TO_ASSETS populates 'engine' type with all .ts engine files", async () => {
      const r = await call(handler, "rev_idx_rebuild", {
        index_name: "TYPE_TO_ASSETS",
      });
      expect(r.success).toBe(true);
      expect(r.update.indexName).toBe("TYPE_TO_ASSETS");
      // Engine line 567-572: rebuildTypeToAssets adds 1 key ("engine") with all engine files
      expect(r.update.keysUpdated).toBeGreaterThanOrEqual(1);
      // Now lookup should return many engines
      const lookup = await call(handler, "rev_idx_assets_by_type", { asset_type: "engine" });
      expect(lookup.success).toBe(true);
      const assets = lookup.assets ?? [];
      // PRISM has hundreds of engines — expect at least 50 in the bucket
      expect(assets.length).toBeGreaterThan(50);
      // Every entry should be an engine name (no .ts suffix per engine line 569)
      for (const a of assets.slice(0, 20)) {
        expect(typeof a).toBe("string");
        expect(a.endsWith(".ts")).toBe(false);
      }
    });
  });

  // ---------------------------------------------------------------------
  // Schema validation
  // ---------------------------------------------------------------------

  describe("schema validation", () => {
    it("rev_idx_add_mapping with missing key → rejected", async () => {
      const r = await call(handler, "rev_idx_add_mapping", {
        index_name: "KEYWORD_TO_ASSETS",
        value: "v",
      });
      expect(String(r.error)).toMatch(/invalid params/i);
    });

    it("rev_idx_add_mapping with invalid index_name enum → rejected", async () => {
      const r = await call(handler, "rev_idx_add_mapping", {
        index_name: "BOGUS_INDEX",
        key: "k",
        value: "v",
      });
      expect(String(r.error)).toMatch(/invalid params/i);
    });

    it("rev_idx_action_to_engine with empty action → rejected", async () => {
      const r = await call(handler, "rev_idx_action_to_engine", { action: "" });
      expect(String(r.error)).toMatch(/invalid params/i);
    });
  });

  // ---------------------------------------------------------------------
  // recover_wal — engine line 328 returns number
  // ---------------------------------------------------------------------

  describe("rev_idx_recover_wal", () => {
    it("returns non-negative integer count of recovered operations", async () => {
      const r = await call(handler, "rev_idx_recover_wal", {});
      expect(r.success).toBe(true);
      expect(typeof r.recovered).toBe("number");
      expect(r.recovered).toBeGreaterThanOrEqual(0);
      // After a clean recovery, subsequent calls should return 0 (WAL cleared)
      const r2 = await call(handler, "rev_idx_recover_wal", {});
      expect(r2.recovered).toBe(0);
    });
  });

  // ---------------------------------------------------------------------
  // Wiring round-trip — all 11 actions reachable
  // ---------------------------------------------------------------------

  describe("dispatcher wiring round-trip", () => {
    it("all 11 rev_idx_* actions are registered and reachable", async () => {
      const actions = [
        "rev_idx_action_to_engine",
        "rev_idx_skill_to_action",
        "rev_idx_engine_to_dependents",
        "rev_idx_keyword_search",
        "rev_idx_assets_by_type",
        "rev_idx_add_mapping",
        "rev_idx_remove_mapping",
        "rev_idx_rebuild",
        "rev_idx_stats",
        "rev_idx_recover_wal",
        // rev_idx_rebuild_all intentionally NOT round-trip-tested (5x heavy disk rebuilds)
      ];
      const minimalArgs: Record<string, Record<string, any>> = {
        rev_idx_action_to_engine: { action: "ping_iter6" },
        rev_idx_skill_to_action: { skill: "ping_iter6" },
        rev_idx_engine_to_dependents: { engine: "ping_iter6" },
        rev_idx_keyword_search: { keyword: "ping_iter6" },
        rev_idx_assets_by_type: { asset_type: "ping_iter6" },
        rev_idx_add_mapping: { index_name: "KEYWORD_TO_ASSETS", key: "ping_iter6_wire", value: "ping_iter6_v" },
        rev_idx_remove_mapping: { index_name: "KEYWORD_TO_ASSETS", key: "ping_iter6_wire", value: "ping_iter6_v" },
        rev_idx_rebuild: { index_name: "TYPE_TO_ASSETS" },
        rev_idx_stats: {},
        rev_idx_recover_wal: {},
      };
      for (const action of actions) {
        const r = await call(handler, action, minimalArgs[action]);
        // success:true means: action registered + schema passed + lazy-import executed
        expect(r.success).toBe(true);
      }
    });
  });
});
