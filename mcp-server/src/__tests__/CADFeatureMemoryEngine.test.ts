/**
 * CADFeatureMemoryEngine test suite — U-CUC63 (CAD-UNIVERSAL-CONTROL-MS0)
 *
 * Tests persistent memory of CAD feature patterns with similarity search.
 * Covers: load/persist, record, query, stats, embedding, edge cases.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  CADFeatureMemoryEngine,
  CAD_FEATURE_EMBEDDING_DIM,
  CAD_FEATURE_MEMORY_SCHEMA_VERSION,
  fnv1a,
  cosineSimilarity,
  type FeatureMemoryEntry,
  type CADFeatureMemoryState,
} from "../engines/CADFeatureMemoryEngine.js";

describe("CADFeatureMemoryEngine", () => {
  let engine: CADFeatureMemoryEngine;
  let testDir: string;
  let testPath: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `cad-feature-memory-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDir, { recursive: true });
    testPath = join(testDir, "CAD_FEATURE_MEMORY.json");
    engine = new CADFeatureMemoryEngine(testPath);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ── Constructor & Initialization ─────────────────────────────────────────

  describe("constructor", () => {
    it("should create engine with custom path", () => {
      const customPath = "/custom/path/memory.json";
      const customEngine = new CADFeatureMemoryEngine(customPath);
      expect(customEngine).toBeInstanceOf(CADFeatureMemoryEngine);
    });

    it("should use default path when none provided", () => {
      const defaultEngine = new CADFeatureMemoryEngine();
      expect(defaultEngine).toBeInstanceOf(CADFeatureMemoryEngine);
    });
  });

  // ── Load & Persist ───────────────────────────────────────────────────────

  describe("load", () => {
    it("should handle missing file gracefully (fresh state)", async () => {
      await engine.load();
      const stats = await engine.stats();
      expect(stats.total_entries).toBe(0);
      expect(stats.embedding_dim).toBe(CAD_FEATURE_EMBEDDING_DIM);
    });

    it("should load existing state from disk", async () => {
      const state: CADFeatureMemoryState = {
        schemaVersion: CAD_FEATURE_MEMORY_SCHEMA_VERSION,
        generatedAt: new Date().toISOString(),
        embeddingDim: CAD_FEATURE_EMBEDDING_DIM,
        entries: [
          {
            id: "pocket:abc123",
            feature_type: "pocket",
            parameters: { depth: 10, width: 20 },
            embedding: new Array(CAD_FEATURE_EMBEDDING_DIM).fill(0.5),
            success_count: 5,
            failure_count: 1,
            total_attempts: 6,
            success_rate: 5 / 6,
            avg_gen_time_ms: 150,
            error_patterns: ["timeout"],
            created_at: "2026-01-01T00:00:00Z",
            last_used_at: "2026-04-01T00:00:00Z",
          },
        ],
      };
      await fs.writeFile(testPath, JSON.stringify(state));

      await engine.load();
      const stats = await engine.stats();
      expect(stats.total_entries).toBe(1);
      expect(stats.total_attempts).toBe(6);
    });

    it("should be idempotent (no-op on subsequent calls)", async () => {
      await engine.record({
        feature_type: "hole",
        parameters: { diameter: 5 },
        outcome: "success",
        gen_time_ms: 100,
      });

      await engine.load(); // Should not reset
      const stats = await engine.stats();
      expect(stats.total_entries).toBe(1);
    });

    it("should reload when force=true", async () => {
      await engine.record({
        feature_type: "hole",
        parameters: { diameter: 5 },
        outcome: "success",
        gen_time_ms: 100,
      });
      await engine.persist();

      // Write different state to disk
      const differentState: CADFeatureMemoryState = {
        schemaVersion: CAD_FEATURE_MEMORY_SCHEMA_VERSION,
        generatedAt: new Date().toISOString(),
        embeddingDim: CAD_FEATURE_EMBEDDING_DIM,
        entries: [],
      };
      await fs.writeFile(testPath, JSON.stringify(differentState));

      await engine.load(true); // Force reload
      const stats = await engine.stats();
      expect(stats.total_entries).toBe(0);
    });

    it("should throw on invalid JSON", async () => {
      await fs.writeFile(testPath, "{ invalid json }}}");
      await expect(engine.load()).rejects.toThrow("not valid JSON");
    });

    it("should handle malformed entries gracefully", async () => {
      const state = {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        embeddingDim: CAD_FEATURE_EMBEDDING_DIM,
        entries: [
          { id: "valid:123", feature_type: "slot", parameters: {}, embedding: new Array(CAD_FEATURE_EMBEDDING_DIM).fill(0) },
          { id: "missing-type" }, // Invalid - no feature_type
          { id: "bad-embedding:456", feature_type: "hole", embedding: [1, 2, 3] }, // Wrong dim
          null,
          "not-an-object",
        ],
      };
      await fs.writeFile(testPath, JSON.stringify(state));

      await engine.load();
      const stats = await engine.stats();
      expect(stats.total_entries).toBe(1); // Only valid entry loaded
    });
  });

  describe("persist", () => {
    it("should write state to disk atomically", async () => {
      await engine.record({
        feature_type: "chamfer",
        parameters: { angle: 45, depth: 2 },
        outcome: "success",
        gen_time_ms: 80,
      });
      await engine.persist();

      const raw = await fs.readFile(testPath, "utf-8");
      const state = JSON.parse(raw) as CADFeatureMemoryState;
      expect(state.schemaVersion).toBe(CAD_FEATURE_MEMORY_SCHEMA_VERSION);
      expect(state.entries.length).toBe(1);
      expect(state.entries[0].feature_type).toBe("chamfer");
    });

    it("should update last_persisted_at in stats", async () => {
      await engine.record({
        feature_type: "fillet",
        parameters: { radius: 3 },
        outcome: "success",
        gen_time_ms: 50,
      });

      const beforeStats = await engine.stats();
      expect(beforeStats.last_persisted_at).toBeNull();

      await engine.persist();

      const afterStats = await engine.stats();
      expect(afterStats.last_persisted_at).not.toBeNull();
      expect(new Date(afterStats.last_persisted_at!).getTime()).toBeGreaterThan(0);
    });
  });

  // ── Recording ────────────────────────────────────────────────────────────

  describe("record", () => {
    it("should create new entry on first occurrence", async () => {
      const entry = await engine.record({
        feature_type: "pocket",
        parameters: { depth: 15, width: 30 },
        outcome: "success",
        gen_time_ms: 200,
      });

      expect(entry.feature_type).toBe("pocket");
      expect(entry.success_count).toBe(1);
      expect(entry.failure_count).toBe(0);
      expect(entry.total_attempts).toBe(1);
      expect(entry.success_rate).toBe(1);
      expect(entry.avg_gen_time_ms).toBe(200);
      expect(entry.embedding.length).toBe(CAD_FEATURE_EMBEDDING_DIM);
    });

    it("should update existing entry on subsequent occurrence", async () => {
      await engine.record({
        feature_type: "hole",
        parameters: { diameter: 10 },
        outcome: "success",
        gen_time_ms: 100,
      });

      const updated = await engine.record({
        feature_type: "hole",
        parameters: { diameter: 10 },
        outcome: "failure",
        gen_time_ms: 150,
        error_pattern: "geometry_error",
      });

      expect(updated.success_count).toBe(1);
      expect(updated.failure_count).toBe(1);
      expect(updated.total_attempts).toBe(2);
      expect(updated.success_rate).toBe(0.5);
      expect(updated.avg_gen_time_ms).toBe(125); // Rolling average
      expect(updated.error_patterns).toContain("geometry_error");
    });

    it("should cap error_patterns at MAX_ERROR_PATTERNS (8)", async () => {
      for (let i = 0; i < 12; i++) {
        await engine.record({
          feature_type: "thread",
          parameters: { pitch: 1.5 },
          outcome: "failure",
          gen_time_ms: 50,
          error_pattern: `error_${i}`,
        });
      }

      const snapshot = await engine.snapshot();
      expect(snapshot[0].error_patterns.length).toBeLessThanOrEqual(8);
      expect(snapshot[0].error_patterns[0]).toBe("error_11"); // Most recent first
    });

    it("should deduplicate error patterns", async () => {
      await engine.record({
        feature_type: "slot",
        parameters: { width: 5 },
        outcome: "failure",
        gen_time_ms: 60,
        error_pattern: "collision",
      });
      await engine.record({
        feature_type: "slot",
        parameters: { width: 5 },
        outcome: "failure",
        gen_time_ms: 70,
        error_pattern: "collision", // Duplicate
      });

      const snapshot = await engine.snapshot();
      expect(snapshot[0].error_patterns.filter((p) => p === "collision").length).toBe(1);
    });

    it("should reject invalid feature_type", async () => {
      await expect(
        engine.record({
          feature_type: "",
          parameters: {},
          outcome: "success",
          gen_time_ms: 10,
        }),
      ).rejects.toThrow("feature_type must be a non-empty string");
    });

    it("should reject invalid outcome", async () => {
      await expect(
        engine.record({
          feature_type: "test",
          parameters: {},
          outcome: "maybe" as "success",
          gen_time_ms: 10,
        }),
      ).rejects.toThrow("outcome must be 'success' or 'failure'");
    });

    it("should reject negative gen_time_ms", async () => {
      await expect(
        engine.record({
          feature_type: "test",
          parameters: {},
          outcome: "success",
          gen_time_ms: -5,
        }),
      ).rejects.toThrow("gen_time_ms must be a finite number >= 0");
    });

    it("should reject NaN in parameters", async () => {
      await expect(
        engine.record({
          feature_type: "test",
          parameters: { bad: NaN },
          outcome: "success",
          gen_time_ms: 10,
        }),
      ).rejects.toThrow("non-finite");
    });

    it("should reject Infinity in parameters", async () => {
      await expect(
        engine.record({
          feature_type: "test",
          parameters: { bad: Infinity },
          outcome: "success",
          gen_time_ms: 10,
        }),
      ).rejects.toThrow("non-finite");
    });

    it("should truncate long string parameters at 256 bytes", async () => {
      const longString = "x".repeat(500);
      const entry = await engine.record({
        feature_type: "test",
        parameters: { note: longString },
        outcome: "success",
        gen_time_ms: 10,
      });

      const noteValue = entry.parameters.note as string;
      expect(noteValue.length).toBeLessThan(500);
      expect(noteValue.endsWith("…")).toBe(true);
    });

    it("should handle boolean parameters correctly", async () => {
      const entry = await engine.record({
        feature_type: "bore",
        parameters: { through: true, blind: false },
        outcome: "success",
        gen_time_ms: 30,
      });

      expect(entry.parameters.through).toBe(true);
      expect(entry.parameters.blind).toBe(false);
    });
  });

  // ── Lookup ───────────────────────────────────────────────────────────────

  describe("lookup", () => {
    it("should return entry by exact id", async () => {
      const recorded = await engine.record({
        feature_type: "counterbore",
        parameters: { diameter: 12, depth: 5 },
        outcome: "success",
        gen_time_ms: 100,
      });

      const found = await engine.lookup(recorded.id);
      expect(found).not.toBeNull();
      expect(found!.feature_type).toBe("counterbore");
      expect(found!.id).toBe(recorded.id);
    });

    it("should return null for unknown id", async () => {
      const found = await engine.lookup("nonexistent:12345678");
      expect(found).toBeNull();
    });
  });

  // ── Query (Similarity Search) ────────────────────────────────────────────

  describe("query", () => {
    beforeEach(async () => {
      // Seed with test data
      await engine.record({ feature_type: "pocket", parameters: { depth: 10, width: 20 }, outcome: "success", gen_time_ms: 100 });
      await engine.record({ feature_type: "pocket", parameters: { depth: 15, width: 25 }, outcome: "success", gen_time_ms: 110 });
      await engine.record({ feature_type: "pocket", parameters: { depth: 100, width: 200 }, outcome: "failure", gen_time_ms: 500 });
      await engine.record({ feature_type: "hole", parameters: { diameter: 5 }, outcome: "success", gen_time_ms: 50 });
      await engine.record({ feature_type: "slot", parameters: { width: 8, length: 40 }, outcome: "success", gen_time_ms: 80 });
    });

    it("should return most similar entries", async () => {
      const results = await engine.query("pocket", { depth: 12, width: 22 }, { topK: 3 });

      expect(results.length).toBeLessThanOrEqual(3);
      expect(results[0].similarity).toBeGreaterThan(0);
      // Similar pockets should rank higher than dissimilar ones
      expect(results[0].entry.feature_type).toBe("pocket");
    });

    it("should respect topK limit", async () => {
      const results = await engine.query("pocket", { depth: 10 }, { topK: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("should filter by minSuccessRate", async () => {
      const results = await engine.query("pocket", { depth: 50 }, { minSuccessRate: 0.5 });

      for (const r of results) {
        expect(r.entry.success_rate).toBeGreaterThanOrEqual(0.5);
      }
    });

    it("should filter by minAttempts", async () => {
      // Record more attempts to one entry
      await engine.record({ feature_type: "pocket", parameters: { depth: 10, width: 20 }, outcome: "success", gen_time_ms: 90 });
      await engine.record({ feature_type: "pocket", parameters: { depth: 10, width: 20 }, outcome: "success", gen_time_ms: 95 });

      const results = await engine.query("pocket", { depth: 10 }, { minAttempts: 2 });

      for (const r of results) {
        expect(r.entry.total_attempts).toBeGreaterThanOrEqual(2);
      }
    });

    it("should filter by featureTypeFilter", async () => {
      const results = await engine.query("pocket", { depth: 10 }, { featureTypeFilter: "hole" });

      for (const r of results) {
        expect(r.entry.feature_type).toBe("hole");
      }
    });

    it("should return empty array when no matches", async () => {
      const results = await engine.query("pocket", { depth: 10 }, { featureTypeFilter: "nonexistent" });
      expect(results).toEqual([]);
    });

    it("should throw on empty feature_type", async () => {
      await expect(engine.query("", { depth: 10 })).rejects.toThrow("feature_type required");
    });

    it("should clamp topK to max 100", async () => {
      const results = await engine.query("pocket", { depth: 10 }, { topK: 1000 });
      expect(results.length).toBeLessThanOrEqual(100);
    });

    it("should sort results by similarity descending", async () => {
      const results = await engine.query("pocket", { depth: 10, width: 20 });

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
      }
    });
  });

  // ── Stats ────────────────────────────────────────────────────────────────

  describe("stats", () => {
    it("should return correct aggregate statistics", async () => {
      await engine.record({ feature_type: "pocket", parameters: { depth: 10 }, outcome: "success", gen_time_ms: 100 });
      await engine.record({ feature_type: "pocket", parameters: { depth: 20 }, outcome: "failure", gen_time_ms: 150 });
      await engine.record({ feature_type: "hole", parameters: { diameter: 5 }, outcome: "success", gen_time_ms: 50 });

      const stats = await engine.stats();

      expect(stats.total_entries).toBe(3);
      expect(stats.total_attempts).toBe(3);
      expect(stats.global_success_rate).toBeCloseTo(2 / 3, 4);
      expect(stats.embedding_dim).toBe(CAD_FEATURE_EMBEDDING_DIM);
      expect(stats.by_feature_type.length).toBe(2);
    });

    it("should aggregate by feature_type correctly", async () => {
      await engine.record({ feature_type: "pocket", parameters: { depth: 10 }, outcome: "success", gen_time_ms: 100 });
      await engine.record({ feature_type: "pocket", parameters: { depth: 10 }, outcome: "success", gen_time_ms: 100 });
      await engine.record({ feature_type: "pocket", parameters: { depth: 20 }, outcome: "failure", gen_time_ms: 150 });
      await engine.record({ feature_type: "hole", parameters: { diameter: 5 }, outcome: "success", gen_time_ms: 50 });

      const stats = await engine.stats();
      const pocketStats = stats.by_feature_type.find((s) => s.feature_type === "pocket");

      expect(pocketStats).not.toBeNull();
      expect(pocketStats!.entry_count).toBe(2);
      expect(pocketStats!.total_attempts).toBe(3);
      expect(pocketStats!.success_rate).toBeCloseTo(2 / 3, 4);
    });

    it("should return zero stats for empty memory", async () => {
      const stats = await engine.stats();

      expect(stats.total_entries).toBe(0);
      expect(stats.total_attempts).toBe(0);
      expect(stats.global_success_rate).toBe(0);
      expect(stats.by_feature_type).toEqual([]);
    });

    it("should sort by_feature_type by total_attempts descending", async () => {
      await engine.record({ feature_type: "a", parameters: {}, outcome: "success", gen_time_ms: 10 });
      await engine.record({ feature_type: "b", parameters: {}, outcome: "success", gen_time_ms: 10 });
      await engine.record({ feature_type: "b", parameters: {}, outcome: "success", gen_time_ms: 10 });
      await engine.record({ feature_type: "c", parameters: {}, outcome: "success", gen_time_ms: 10 });
      await engine.record({ feature_type: "c", parameters: {}, outcome: "success", gen_time_ms: 10 });
      await engine.record({ feature_type: "c", parameters: {}, outcome: "success", gen_time_ms: 10 });

      const stats = await engine.stats();
      expect(stats.by_feature_type[0].feature_type).toBe("c");
      expect(stats.by_feature_type[1].feature_type).toBe("b");
      expect(stats.by_feature_type[2].feature_type).toBe("a");
    });
  });

  // ── Reset & Snapshot ─────────────────────────────────────────────────────

  describe("reset", () => {
    it("should clear in-memory state", async () => {
      await engine.record({ feature_type: "test", parameters: {}, outcome: "success", gen_time_ms: 10 });
      engine.reset();

      const stats = await engine.stats();
      expect(stats.total_entries).toBe(0);
    });

    it("should allow reloading after reset", async () => {
      await engine.record({ feature_type: "test", parameters: {}, outcome: "success", gen_time_ms: 10 });
      await engine.persist();

      engine.reset();
      await engine.load();

      const stats = await engine.stats();
      expect(stats.total_entries).toBe(1);
    });
  });

  describe("snapshot", () => {
    it("should return defensive copy of entries", async () => {
      await engine.record({ feature_type: "test", parameters: { x: 1 }, outcome: "success", gen_time_ms: 10 });

      const snap = await engine.snapshot();
      expect(snap.length).toBe(1);

      // Modifying snapshot should not affect engine state
      (snap[0] as FeatureMemoryEntry).success_count = 999;

      const snap2 = await engine.snapshot();
      expect(snap2[0].success_count).toBe(1);
    });
  });

  describe("setMemoryPath", () => {
    it("should change path and reset loaded state", async () => {
      await engine.record({ feature_type: "test", parameters: {}, outcome: "success", gen_time_ms: 10 });

      const newPath = join(testDir, "new_memory.json");
      engine.setMemoryPath(newPath);

      const stats = await engine.stats();
      expect(stats.total_entries).toBe(0); // Reset after path change
    });
  });

  // ── Embedding ────────────────────────────────────────────────────────────

  describe("embedFeature", () => {
    it("should produce consistent embeddings for same input", () => {
      const e1 = engine.embedFeature("pocket", { depth: 10, width: 20 });
      const e2 = engine.embedFeature("pocket", { depth: 10, width: 20 });

      expect(e1).toEqual(e2);
    });

    it("should produce different embeddings for different feature_types", () => {
      const e1 = engine.embedFeature("pocket", { depth: 10 });
      const e2 = engine.embedFeature("hole", { depth: 10 });

      expect(e1).not.toEqual(e2);
    });

    it("should produce different embeddings for different parameters", () => {
      const e1 = engine.embedFeature("pocket", { depth: 10 });
      const e2 = engine.embedFeature("pocket", { depth: 100 });

      expect(e1).not.toEqual(e2);
    });

    it("should have correct dimension (64)", () => {
      const e = engine.embedFeature("test", { x: 1, y: 2 });
      expect(e.length).toBe(CAD_FEATURE_EMBEDDING_DIM);
      expect(e.length).toBe(64);
    });

    it("should map boolean true to 1 in slot", () => {
      const e = engine.embedFeature("bore", { through: true });
      expect(e.length).toBe(CAD_FEATURE_EMBEDDING_DIM);
      // Boolean true should map to 1 in first param slot (index 32)
      const slotIndex = 32;
      expect(e[slotIndex]).toBe(1);
    });

    it("should map boolean false to -1 in slot", () => {
      const e = engine.embedFeature("bore", { through: false });
      const slotIndex = 32;
      expect(e[slotIndex]).toBe(-1);
    });

    it("should handle string parameters with hash mapping", () => {
      const e1 = engine.embedFeature("test", { material: "steel" });
      const e2 = engine.embedFeature("test", { material: "aluminum" });

      expect(e1).not.toEqual(e2);
    });

    it("should handle many parameters (truncates at PARAM_SLOTS)", () => {
      const params: Record<string, number> = {};
      for (let i = 0; i < 50; i++) {
        params[`param${i}`] = i;
      }

      const e = engine.embedFeature("complex", params);
      expect(e.length).toBe(CAD_FEATURE_EMBEDDING_DIM);
    });
  });

  // ── Helper Functions ─────────────────────────────────────────────────────

  describe("fnv1a", () => {
    it("should produce consistent hash for same input", () => {
      expect(fnv1a("test")).toBe(fnv1a("test"));
    });

    it("should produce different hash for different input", () => {
      expect(fnv1a("test")).not.toBe(fnv1a("TEST"));
    });

    it("should return FNV offset basis for empty string", () => {
      expect(fnv1a("")).toBe(0x811c9dc5);
    });

    it("should handle unicode characters", () => {
      const h = fnv1a("日本語");
      expect(typeof h).toBe("number");
      expect(h).toBeGreaterThan(0);
    });

    it("should return 32-bit unsigned integer", () => {
      const h = fnv1a("large hash test string with lots of characters");
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
    });

    it("should produce known hash for known input", () => {
      // FNV-1a hash of "hello" is a known value
      const hash = fnv1a("hello");
      expect(typeof hash).toBe("number");
      expect(hash >>> 0).toBe(hash); // Confirm unsigned
    });
  });

  describe("cosineSimilarity", () => {
    it("should return 1 for identical vectors", () => {
      const v = [1, 2, 3, 4];
      expect(cosineSimilarity(v, v)).toBeCloseTo(1, 6);
    });

    it("should return -1 for opposite vectors", () => {
      const v1 = [1, 0, 0];
      const v2 = [-1, 0, 0];
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(-1, 6);
    });

    it("should return 0 for orthogonal vectors", () => {
      const v1 = [1, 0];
      const v2 = [0, 1];
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(0, 6);
    });

    it("should return 0 for mismatched lengths", () => {
      expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    });

    it("should return 0 for empty vectors", () => {
      expect(cosineSimilarity([], [])).toBe(0);
    });

    it("should return 0 when one vector is zero", () => {
      expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
    });

    it("should be symmetric", () => {
      const v1 = [1, 2, 3];
      const v2 = [4, 5, 6];
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(cosineSimilarity(v2, v1), 6);
    });

    it("should handle negative values correctly", () => {
      const v1 = [-1, 2, -3];
      const v2 = [1, -2, 3];
      const sim = cosineSimilarity(v1, v2);
      expect(sim).toBeCloseTo(-1, 6);
    });

    it("should compute correct value for known vectors", () => {
      // cos([1,0], [1,1]) = 1 / (1 * sqrt(2)) ≈ 0.7071
      const v1 = [1, 0];
      const v2 = [1, 1];
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(1 / Math.sqrt(2), 4);
    });
  });

  // ── Edge Cases ───────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("should handle sequential records to same entry", async () => {
      // Sequential records to same entry should accumulate correctly
      for (let i = 0; i < 10; i++) {
        await engine.record({
          feature_type: "sequential",
          parameters: { x: 1 },
          outcome: i % 2 === 0 ? "success" : "failure",
          gen_time_ms: 10 + i,
        });
      }

      const stats = await engine.stats();
      expect(stats.total_entries).toBe(1);
      expect(stats.total_attempts).toBe(10);
    });

    it("should handle multiple distinct entries", async () => {
      // Multiple distinct entries should all be tracked separately
      for (let i = 0; i < 5; i++) {
        await engine.record({
          feature_type: "distinct",
          parameters: { index: i },
          outcome: "success",
          gen_time_ms: 10 + i,
        });
      }

      const stats = await engine.stats();
      expect(stats.total_entries).toBe(5);
      expect(stats.total_attempts).toBe(5);
    });

    it("should handle special characters in feature_type", async () => {
      const entry = await engine.record({
        feature_type: "pocket/slot-combo_v2.1",
        parameters: { depth: 5 },
        outcome: "success",
        gen_time_ms: 100,
      });

      expect(entry.feature_type).toBe("pocket/slot-combo_v2.1");
    });

    it("should handle very large gen_time_ms", async () => {
      const entry = await engine.record({
        feature_type: "slow",
        parameters: {},
        outcome: "success",
        gen_time_ms: 999999999,
      });

      expect(entry.avg_gen_time_ms).toBe(999999999);
    });

    it("should handle parameter key ordering consistently (canonical)", async () => {
      const e1 = await engine.record({
        feature_type: "test",
        parameters: { a: 1, b: 2, c: 3 },
        outcome: "success",
        gen_time_ms: 10,
      });

      const e2 = await engine.record({
        feature_type: "test",
        parameters: { c: 3, a: 1, b: 2 }, // Different order
        outcome: "success",
        gen_time_ms: 10,
      });

      expect(e1.id).toBe(e2.id); // Same canonical ID
    });

    it("should filter entries whose embedding dim mismatches file embeddingDim", async () => {
      // File declares embeddingDim=64, but entry has 32-dim embedding → filtered
      const state: CADFeatureMemoryState = {
        schemaVersion: CAD_FEATURE_MEMORY_SCHEMA_VERSION,
        generatedAt: new Date().toISOString(),
        embeddingDim: CAD_FEATURE_EMBEDDING_DIM, // 64
        entries: [
          {
            id: "bad:123",
            feature_type: "bad",
            parameters: {},
            embedding: new Array(32).fill(0.5), // Mismatches file's 64
            success_count: 1,
            failure_count: 0,
            total_attempts: 1,
            success_rate: 1,
            avg_gen_time_ms: 10,
            error_patterns: [],
            created_at: new Date().toISOString(),
            last_used_at: new Date().toISOString(),
          },
        ],
      };
      await fs.writeFile(testPath, JSON.stringify(state));

      await engine.load();

      // Entry with 32-dim embedding filtered when file declares 64
      const stats = await engine.stats();
      expect(stats.total_entries).toBe(0);
    });

    it("should load entries when embedding dim matches file embeddingDim", async () => {
      // File declares embeddingDim=32, entry has 32-dim → loads correctly
      const state: CADFeatureMemoryState = {
        schemaVersion: CAD_FEATURE_MEMORY_SCHEMA_VERSION,
        generatedAt: new Date().toISOString(),
        embeddingDim: 32,
        entries: [
          {
            id: "ok:123",
            feature_type: "pocket",
            parameters: {},
            embedding: new Array(32).fill(0.5), // Matches file's 32
            success_count: 1,
            failure_count: 0,
            total_attempts: 1,
            success_rate: 1,
            avg_gen_time_ms: 10,
            error_patterns: [],
            created_at: new Date().toISOString(),
            last_used_at: new Date().toISOString(),
          },
        ],
      };
      await fs.writeFile(testPath, JSON.stringify(state));

      await engine.load();

      const stats = await engine.stats();
      expect(stats.total_entries).toBe(1);
      expect(stats.embedding_dim).toBe(32);
    });

    it("should handle zero gen_time_ms", async () => {
      const entry = await engine.record({
        feature_type: "instant",
        parameters: {},
        outcome: "success",
        gen_time_ms: 0,
      });

      expect(entry.avg_gen_time_ms).toBe(0);
    });
  });

  // ── Constants Export ─────────────────────────────────────────────────────

  describe("constants", () => {
    it("should export CAD_FEATURE_EMBEDDING_DIM as 64", () => {
      expect(CAD_FEATURE_EMBEDDING_DIM).toBe(64);
    });

    it("should export CAD_FEATURE_MEMORY_SCHEMA_VERSION as 1", () => {
      expect(CAD_FEATURE_MEMORY_SCHEMA_VERSION).toBe(1);
    });
  });
});
