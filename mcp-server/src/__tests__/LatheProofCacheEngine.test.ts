/**
 * LatheProofCacheEngine Tests
 *
 * U-LTH67: Per-block hash cache for proof results
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheProofCacheEngine } from "../engines/LatheProofCacheEngine.js";

describe("LatheProofCacheEngine", () => {
  beforeEach(() => {
    latheProofCacheEngine.clear();
    latheProofCacheEngine.resetStats();
    latheProofCacheEngine.setConfig({
      max_entries: 10000,
      ttl_hours: 168,
      persist_path: null,
      auto_persist: false,
    });
  });

  describe("Basic Operations", () => {
    it("sets and gets cache entry", () => {
      const entry = latheProofCacheEngine.set(
        "modal_hash_1",
        "constraint_hash_1",
        "envelope_x",
        "unsat",
        50
      );

      expect(entry.status).toBe("unsat");
      expect(entry.time_ms).toBe(50);

      const retrieved = latheProofCacheEngine.get("modal_hash_1", "constraint_hash_1", "envelope_x");

      expect(retrieved).not.toBeNull();
      expect(retrieved!.status).toBe("unsat");
    });

    it("returns null for missing entry", () => {
      const entry = latheProofCacheEngine.get("nonexistent", "hash", "type");

      expect(entry).toBeNull();
    });

    it("checks if entry exists", () => {
      latheProofCacheEngine.set("hash1", "hash2", "prop", "unsat", 10);

      expect(latheProofCacheEngine.has("hash1", "hash2", "prop")).toBe(true);
      expect(latheProofCacheEngine.has("other", "hash2", "prop")).toBe(false);
    });

    it("deletes entry", () => {
      latheProofCacheEngine.set("hash1", "hash2", "prop", "unsat", 10);

      expect(latheProofCacheEngine.has("hash1", "hash2", "prop")).toBe(true);

      const deleted = latheProofCacheEngine.delete("hash1", "hash2", "prop");

      expect(deleted).toBe(true);
      expect(latheProofCacheEngine.has("hash1", "hash2", "prop")).toBe(false);
    });

    it("tracks block index", () => {
      const entry = latheProofCacheEngine.set(
        "modal",
        "constraint",
        "envelope_x",
        "sat",
        100,
        42
      );

      expect(entry.block_index).toBe(42);
    });
  });

  describe("Cache Hit/Miss Statistics", () => {
    it("tracks cache hits", () => {
      latheProofCacheEngine.set("h1", "h2", "prop", "unsat", 10);

      latheProofCacheEngine.get("h1", "h2", "prop");
      latheProofCacheEngine.get("h1", "h2", "prop");

      const stats = latheProofCacheEngine.getStats();

      expect(stats.hits).toBe(2);
    });

    it("tracks cache misses", () => {
      latheProofCacheEngine.get("missing1", "h2", "prop");
      latheProofCacheEngine.get("missing2", "h2", "prop");

      const stats = latheProofCacheEngine.getStats();

      expect(stats.misses).toBe(2);
    });

    it("calculates hit rate", () => {
      latheProofCacheEngine.set("h1", "h2", "prop", "unsat", 10);

      latheProofCacheEngine.get("h1", "h2", "prop"); // hit
      latheProofCacheEngine.get("h1", "h2", "prop"); // hit
      latheProofCacheEngine.get("missing", "h2", "prop"); // miss

      const stats = latheProofCacheEngine.getStats();

      expect(stats.hit_rate).toBeCloseTo(66.7, 0);
    });

    it("resets statistics", () => {
      latheProofCacheEngine.set("h1", "h2", "prop", "unsat", 10);
      latheProofCacheEngine.get("h1", "h2", "prop");
      latheProofCacheEngine.get("missing", "h2", "prop");

      latheProofCacheEngine.resetStats();

      const stats = latheProofCacheEngine.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe("LRU Eviction", () => {
    it("evicts oldest entry when max reached", () => {
      latheProofCacheEngine.setConfig({ max_entries: 3 });

      latheProofCacheEngine.set("h1", "c", "p", "unsat", 10);
      latheProofCacheEngine.set("h2", "c", "p", "unsat", 10);
      latheProofCacheEngine.set("h3", "c", "p", "unsat", 10);
      latheProofCacheEngine.set("h4", "c", "p", "unsat", 10);

      expect(latheProofCacheEngine.size()).toBe(3);
      expect(latheProofCacheEngine.has("h1", "c", "p")).toBe(false); // evicted
      expect(latheProofCacheEngine.has("h4", "c", "p")).toBe(true);
    });
  });

  describe("TTL Expiration", () => {
    it("respects TTL configuration", () => {
      // Set TTL to a very long time
      latheProofCacheEngine.setConfig({ ttl_hours: 1000 });

      latheProofCacheEngine.set("h1", "c", "p", "unsat", 10);

      // Entry should still be valid
      const entry = latheProofCacheEngine.get("h1", "c", "p");

      expect(entry).not.toBeNull();
    });
  });

  describe("Machine Profile Invalidation", () => {
    it("invalidates entries with different profile hash", () => {
      latheProofCacheEngine.setMachineProfile("profile_v1");
      latheProofCacheEngine.set("h1", "c", "p", "unsat", 10);

      latheProofCacheEngine.setMachineProfile("profile_v2");

      const entry = latheProofCacheEngine.get("h1", "c", "p");

      expect(entry).toBeNull();
    });

    it("returns entries with matching profile hash", () => {
      latheProofCacheEngine.setMachineProfile("profile_v1");
      latheProofCacheEngine.set("h1", "c", "p", "unsat", 10);

      const entry = latheProofCacheEngine.get("h1", "c", "p");

      expect(entry).not.toBeNull();
    });

    it("bulk invalidates by machine profile", () => {
      latheProofCacheEngine.setMachineProfile("old_profile");
      latheProofCacheEngine.set("h1", "c", "p1", "unsat", 10);
      latheProofCacheEngine.set("h2", "c", "p2", "unsat", 10);

      latheProofCacheEngine.setMachineProfile("new_profile");
      latheProofCacheEngine.set("h3", "c", "p3", "unsat", 10);

      const invalidated = latheProofCacheEngine.invalidateByMachineProfile();

      expect(invalidated).toBe(2);
      expect(latheProofCacheEngine.size()).toBe(1);
    });
  });

  describe("Property Invalidation", () => {
    it("invalidates entries by property type", () => {
      latheProofCacheEngine.set("h1", "c", "envelope_x", "unsat", 10);
      latheProofCacheEngine.set("h2", "c", "envelope_x", "unsat", 10);
      latheProofCacheEngine.set("h3", "c", "feedrate", "unsat", 10);

      const invalidated = latheProofCacheEngine.invalidateByProperty("envelope_x");

      expect(invalidated).toBe(2);
      expect(latheProofCacheEngine.has("h3", "c", "feedrate")).toBe(true);
    });
  });

  describe("Time-Based Invalidation", () => {
    it("invalidates entries older than specified hours", () => {
      // Create entries (they'll have current timestamps)
      latheProofCacheEngine.set("h1", "c", "p", "unsat", 10);

      // Invalidate entries older than 1000 hours (none will be invalidated)
      const invalidated = latheProofCacheEngine.invalidateOlderThan(1000);

      expect(invalidated).toBe(0);
      expect(latheProofCacheEngine.size()).toBe(1);
    });
  });

  describe("Bulk Operations", () => {
    it("gets multiple entries", () => {
      latheProofCacheEngine.set("h1", "c1", "p", "unsat", 10);
      latheProofCacheEngine.set("h2", "c2", "p", "sat", 20);

      const results = latheProofCacheEngine.getMultiple([
        { modalStateHash: "h1", constraintHash: "c1", propertyType: "p" },
        { modalStateHash: "h2", constraintHash: "c2", propertyType: "p" },
        { modalStateHash: "missing", constraintHash: "c3", propertyType: "p" },
      ]);

      expect(results.size).toBe(3);
    });

    it("sets multiple entries", () => {
      latheProofCacheEngine.setMultiple([
        {
          key: "k1", modal_state_hash: "h1", constraint_hash: "c1",
          property_type: "p1", status: "unsat", time_ms: 10, timestamp: new Date().toISOString(),
        },
        {
          key: "k2", modal_state_hash: "h2", constraint_hash: "c2",
          property_type: "p2", status: "sat", time_ms: 20, timestamp: new Date().toISOString(),
        },
      ]);

      expect(latheProofCacheEngine.size()).toBe(2);
    });
  });

  describe("Statistics", () => {
    it("reports statistics by status", () => {
      latheProofCacheEngine.set("h1", "c", "p", "unsat", 10);
      latheProofCacheEngine.set("h2", "c", "p", "sat", 10);
      latheProofCacheEngine.set("h3", "c", "p", "unsat", 10);

      const stats = latheProofCacheEngine.getStats();

      expect(stats.by_status.unsat).toBe(2);
      expect(stats.by_status.sat).toBe(1);
    });

    it("reports statistics by property", () => {
      latheProofCacheEngine.set("h1", "c", "envelope_x", "unsat", 10);
      latheProofCacheEngine.set("h2", "c", "envelope_x", "unsat", 10);
      latheProofCacheEngine.set("h3", "c", "feedrate", "unsat", 10);

      const stats = latheProofCacheEngine.getStats();

      expect(stats.by_property["envelope_x"]).toBe(2);
      expect(stats.by_property["feedrate"]).toBe(1);
    });

    it("tracks oldest and newest entries", () => {
      latheProofCacheEngine.set("h1", "c", "p", "unsat", 10);
      latheProofCacheEngine.set("h2", "c", "p", "unsat", 10);

      const stats = latheProofCacheEngine.getStats();

      expect(stats.oldest_entry).not.toBeNull();
      expect(stats.newest_entry).not.toBeNull();
    });

    it("estimates size in bytes", () => {
      latheProofCacheEngine.set("h1", "c", "p", "unsat", 10);

      const stats = latheProofCacheEngine.getStats();

      expect(stats.size_bytes).toBeGreaterThan(0);
    });
  });

  describe("Hash Utilities", () => {
    it("computes modal state hash", () => {
      const hash = latheProofCacheEngine.computeModalStateHash({
        motion_mode: "G0",
        positioning_mode: "G90",
        units: "G21",
        feed_mode: "G94",
        spindle_mode: "G97",
        tool_number: 1,
      });

      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });

    it("produces different hashes for different states", () => {
      const hash1 = latheProofCacheEngine.computeModalStateHash({
        motion_mode: "G0",
        positioning_mode: "G90",
        units: "G21",
        feed_mode: "G94",
        spindle_mode: "G97",
        tool_number: 1,
      });

      const hash2 = latheProofCacheEngine.computeModalStateHash({
        motion_mode: "G1",
        positioning_mode: "G90",
        units: "G21",
        feed_mode: "G94",
        spindle_mode: "G97",
        tool_number: 1,
      });

      expect(hash1).not.toBe(hash2);
    });

    it("computes constraint hash", () => {
      const hash = latheProofCacheEngine.computeConstraintHash({
        type: "linear",
        variables: ["x_0", "x_1"],
        operator: "<=",
        constant: 100,
      });

      expect(hash).toBeDefined();
    });

    it("computes machine profile hash", () => {
      const hash = latheProofCacheEngine.computeMachineProfileHash({
        machine_id: "LB-3000",
        x_min: -50,
        x_max: 300,
        z_min: -500,
        z_max: 50,
        f_max: 10000,
        s_max: 6000,
      });

      expect(hash).toBeDefined();
    });
  });

  describe("Query Helpers", () => {
    beforeEach(() => {
      latheProofCacheEngine.set("h1", "c", "envelope_x", "unsat", 10);
      latheProofCacheEngine.set("h2", "c", "envelope_x", "sat", 20);
      latheProofCacheEngine.set("h3", "c", "feedrate", "unsat", 30);
    });

    it("gets entries by property", () => {
      const entries = latheProofCacheEngine.getEntriesByProperty("envelope_x");

      expect(entries.length).toBe(2);
    });

    it("gets entries by status", () => {
      const entries = latheProofCacheEngine.getEntriesByStatus("unsat");

      expect(entries.length).toBe(2);
    });

    it("gets recent entries", () => {
      const entries = latheProofCacheEngine.getRecentEntries(2);

      expect(entries.length).toBe(2);
    });
  });

  describe("Export/Import", () => {
    it("exports to JSONL format", () => {
      latheProofCacheEngine.set("h1", "c1", "p1", "unsat", 10);
      latheProofCacheEngine.set("h2", "c2", "p2", "sat", 20);

      const jsonl = latheProofCacheEngine.exportToJSONL();

      const lines = jsonl.split("\n");
      expect(lines.length).toBe(2);
    });

    it("imports from JSONL format", () => {
      const jsonl = `{"key":"k1","modal_state_hash":"h1","constraint_hash":"c1","property_type":"p1","status":"unsat","time_ms":10,"timestamp":"2026-01-01T00:00:00.000Z"}
{"key":"k2","modal_state_hash":"h2","constraint_hash":"c2","property_type":"p2","status":"sat","time_ms":20,"timestamp":"2026-01-01T00:00:00.000Z"}`;

      const imported = latheProofCacheEngine.importFromJSONL(jsonl);

      expect(imported).toBe(2);
      expect(latheProofCacheEngine.size()).toBe(2);
    });
  });

  describe("Configuration", () => {
    it("sets and gets config", () => {
      latheProofCacheEngine.setConfig({
        max_entries: 5000,
        ttl_hours: 24,
      });

      const config = latheProofCacheEngine.getConfig();

      expect(config.max_entries).toBe(5000);
      expect(config.ttl_hours).toBe(24);
    });
  });

  describe("Clear and Size", () => {
    it("clears all entries", () => {
      latheProofCacheEngine.set("h1", "c", "p", "unsat", 10);
      latheProofCacheEngine.set("h2", "c", "p", "unsat", 10);

      latheProofCacheEngine.clear();

      expect(latheProofCacheEngine.size()).toBe(0);
    });

    it("reports correct size", () => {
      latheProofCacheEngine.set("h1", "c", "p", "unsat", 10);
      latheProofCacheEngine.set("h2", "c", "p", "unsat", 10);
      latheProofCacheEngine.set("h3", "c", "p", "unsat", 10);

      expect(latheProofCacheEngine.size()).toBe(3);
    });
  });
});
