/**
 * PersistentMemoryEngine Tests — MXU-MS3
 */
import { describe, it, expect, beforeEach } from "vitest";
import { PersistentMemoryEngine } from "../engines/PersistentMemoryEngine.js";

let engine: PersistentMemoryEngine;

beforeEach(() => {
  engine = new PersistentMemoryEngine();
  engine.clear();
});

// ── Store & Retrieve ─────────────────────────────────────────

describe("PersistentMemoryEngine — Store & Retrieve", () => {

  it("stores and retrieves by ID", () => {
    const entry = engine.store("learning", "physics", ["speed", "feed"], "Use lower feed for hardened steel");
    expect(entry.id).toBeTruthy();
    expect(entry.relevance_score).toBe(1.0);

    const retrieved = engine.get(entry.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.content).toBe("Use lower feed for hardened steel");
    expect(retrieved!.access_count).toBe(1);
  });

  it("returns undefined for missing ID", () => {
    expect(engine.get("nonexistent")).toBeUndefined();
  });

  it("deletes entry", () => {
    const entry = engine.store("learning", "physics", ["test"], "content");
    expect(engine.delete(entry.id)).toBe(true);
    expect(engine.get(entry.id)).toBeUndefined();
  });

  it("delete returns false for missing ID", () => {
    expect(engine.delete("nonexistent")).toBe(false);
  });

  it("increments access count on get", () => {
    const entry = engine.store("learning", "physics", ["test"], "content");
    engine.get(entry.id);
    engine.get(entry.id);
    engine.get(entry.id);
    const retrieved = engine.get(entry.id);
    expect(retrieved!.access_count).toBe(4);
  });

  it("stores with session ID", () => {
    const entry = engine.store("context", "general", ["session"], "snapshot", {}, "session-123");
    expect(entry.source_session).toBe("session-123");
  });
});

// ── Search ───────────────────────────────────────────────────

describe("PersistentMemoryEngine — Search", () => {

  beforeEach(() => {
    engine.store("learning", "physics", ["speed", "feed"], "lesson 1");
    engine.store("learning", "physics", ["force", "kienzle"], "lesson 2");
    engine.store("preference", "general", ["format"], "json output");
    engine.store("calibration", "physics", ["speed", "steel"], "correction");
  });

  it("searches by type", () => {
    const r = engine.search({ type: "learning" });
    expect(r.total_matches).toBe(2);
    expect(r.entries.every(e => e.type === "learning")).toBe(true);
  });

  it("searches by domain", () => {
    const r = engine.search({ domain: "physics" });
    expect(r.total_matches).toBe(3);
  });

  it("searches by tags", () => {
    const r = engine.search({ tags: ["speed"] });
    expect(r.total_matches).toBe(2); // lesson 1 + calibration
  });

  it("searches with multiple criteria", () => {
    const r = engine.search({ type: "learning", domain: "physics", tags: ["speed"] });
    expect(r.total_matches).toBe(1);
    expect(r.entries[0].content).toBe("lesson 1");
  });

  it("respects limit", () => {
    const r = engine.search({ domain: "physics", limit: 1 });
    expect(r.entries).toHaveLength(1);
    expect(r.total_matches).toBe(3);
  });

  it("returns query time", () => {
    const r = engine.search({});
    expect(r.query_time_ms).toBeGreaterThanOrEqual(0);
  });
});

// ── Decay ────────────────────────────────────────────────────

describe("PersistentMemoryEngine — Decay", () => {

  it("decay reduces relevance of old entries", () => {
    const entry = engine.store("learning", "physics", ["test"], "old lesson");
    // Simulate old last_accessed
    entry.last_accessed = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    entry.relevance_score = 1.0;

    const { decayed } = engine.applyDecay();
    expect(decayed).toBeGreaterThan(0);

    const updated = engine.get(entry.id);
    expect(updated!.relevance_score).toBeLessThan(1.0);
  });

  it("prunes entries below minimum relevance", () => {
    const entry = engine.store("learning", "physics", ["test"], "will be pruned");
    entry.relevance_score = 0.05; // Below MIN_RELEVANCE
    entry.last_accessed = new Date(Date.now() - 1000 * 3600 * 1000).toISOString();

    const { pruned } = engine.applyDecay();
    expect(pruned).toBe(1);
    expect(engine.count()).toBe(0);
  });

  it("fresh entries survive decay", () => {
    engine.store("learning", "physics", ["test"], "fresh");
    const { pruned } = engine.applyDecay();
    expect(pruned).toBe(0);
    expect(engine.count()).toBe(1);
  });
});

// ── Learning Records ─────────────────────────────────────────

describe("PersistentMemoryEngine — Learning", () => {

  it("records a learning", () => {
    const entry = engine.recordLearning({
      action: "speed_feed_calculation",
      outcome: "success",
      context: { material: "steel", tool: "12mm endmill" },
      lesson: "Reduce feed by 15% for 4140 alloy steel vs plain carbon",
      confidence: 0.85,
    });
    expect(entry.type).toBe("learning");
    expect(entry.tags).toContain("speed_feed_calculation");
    expect(entry.tags).toContain("success");
  });

  it("searchable by outcome", () => {
    engine.recordLearning({ action: "a", outcome: "success", context: {}, lesson: "good", confidence: 0.9 });
    engine.recordLearning({ action: "b", outcome: "failure", context: {}, lesson: "bad", confidence: 0.8 });
    const successes = engine.search({ tags: ["success"] });
    expect(successes.total_matches).toBe(1);
  });
});

// ── Preferences ──────────────────────────────────────────────

describe("PersistentMemoryEngine — Preferences", () => {

  it("sets and gets preference", () => {
    engine.setPreference({ key: "output_format", value: "json", domain: "general", set_by: "user" });
    expect(engine.getPreference("output_format")).toBe("json");
  });

  it("overwrites existing preference", () => {
    engine.setPreference({ key: "coolant", value: "flood", domain: "machining", set_by: "user" });
    engine.setPreference({ key: "coolant", value: "mist", domain: "machining", set_by: "user" });
    expect(engine.getPreference("coolant")).toBe("mist");
    // Should only have 1 entry for this key
    const r = engine.search({ type: "preference", tags: ["coolant"] });
    expect(r.total_matches).toBe(1);
  });

  it("returns undefined for missing preference", () => {
    expect(engine.getPreference("nonexistent")).toBeUndefined();
  });
});

// ── Calibration ──────────────────────────────────────────────

describe("PersistentMemoryEngine — Calibration", () => {

  it("records calibration data", () => {
    const entry = engine.recordCalibration({
      parameter: "cycle_time",
      predicted: 12.5,
      actual: 14.2,
      correction_factor: 0.88,
      material: "steel",
      machine: "Haas VF-2",
      sample_count: 5,
    });
    expect(entry.type).toBe("calibration");
    expect(entry.tags).toContain("calibration");
    expect(entry.tags).toContain("cycle_time");
    expect(entry.tags).toContain("steel");
  });

  it("searchable by parameter and material", () => {
    engine.recordCalibration({ parameter: "cycle_time", predicted: 10, actual: 12, correction_factor: 0.83, material: "steel", sample_count: 3 });
    engine.recordCalibration({ parameter: "surface_finish", predicted: 1.6, actual: 2.0, correction_factor: 0.8, material: "aluminum", sample_count: 2 });
    const r = engine.search({ tags: ["steel"] });
    expect(r.total_matches).toBe(1);
  });
});

// ── Stats ────────────────────────────────────────────────────

describe("PersistentMemoryEngine — Stats", () => {

  it("empty stats", () => {
    const s = engine.getStats();
    expect(s.total_entries).toBe(0);
    expect(s.avg_relevance).toBe(0);
    expect(s.oldest_entry).toBeNull();
  });

  it("populated stats", () => {
    engine.store("learning", "physics", ["a"], "1");
    engine.store("learning", "physics", ["b"], "2");
    engine.store("preference", "general", ["c"], "3");
    const s = engine.getStats();
    expect(s.total_entries).toBe(3);
    expect(s.by_type.learning).toBe(2);
    expect(s.by_type.preference).toBe(1);
    expect(s.by_domain.physics).toBe(2);
    expect(s.avg_relevance).toBe(1);
    expect(s.oldest_entry).toBeTruthy();
    expect(s.newest_entry).toBeTruthy();
  });
});

// ── Utility ──────────────────────────────────────────────────

describe("PersistentMemoryEngine — Utility", () => {

  it("count returns entry count", () => {
    expect(engine.count()).toBe(0);
    engine.store("learning", "physics", [], "a");
    engine.store("learning", "physics", [], "b");
    expect(engine.count()).toBe(2);
  });

  it("getAll returns all entries", () => {
    engine.store("learning", "physics", [], "a");
    engine.store("preference", "general", [], "b");
    expect(engine.getAll()).toHaveLength(2);
  });

  it("clear removes all entries", () => {
    engine.store("learning", "physics", [], "a");
    engine.clear();
    expect(engine.count()).toBe(0);
  });
});
