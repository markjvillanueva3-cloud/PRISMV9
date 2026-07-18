/**
 * TieredMemoryEngine tests — HMEMV01.  Asserts insert/recall/promote/expire
 * with deterministic counts and exact tier transitions.
 */
import { describe, it, expect } from "vitest";
import {
  TieredMemoryEngine,
  type MemoryEntry,
} from "../engines/TieredMemoryEngine.js";

const ISO = "2026-05-24T13:00:00.000Z";
const LATER = "2026-05-24T13:01:00.000Z";

const newEntry = (id: string, key: string, value: unknown = 1, ttl_ms?: number) => ({
  entry_id: id, key, value, created_at: ISO, ttl_ms, tags: [],
});

describe("TieredMemoryEngine.insert", () => {
  it("inserts a new entry into working tier with access_count=0", () => {
    const s0 = TieredMemoryEngine.empty();
    const s1 = TieredMemoryEngine.insert(s0, newEntry("e1", "k1"), ISO);
    expect(s1.working).toHaveLength(1);
    expect(s1.episodic).toHaveLength(0);
    expect(s1.semantic).toHaveLength(0);
    expect(s1.working[0].tier).toBe("working");
    expect(s1.working[0].access_count).toBe(0);
    expect(s1.working[0].accessed_at).toBe(ISO);
    expect(s1.working[0].key).toBe("k1");
  });

  it("throws on duplicate entry_id across any tier", () => {
    let s = TieredMemoryEngine.empty();
    s = TieredMemoryEngine.insert(s, newEntry("dup", "k1"), ISO);
    expect(() => TieredMemoryEngine.insert(s, newEntry("dup", "k2"), ISO))
      .toThrow(/duplicate/);
  });
});

describe("TieredMemoryEngine.recall", () => {
  it("returns null on miss; state unchanged", () => {
    const s = TieredMemoryEngine.insert(TieredMemoryEngine.empty(), newEntry("e1", "k1"), ISO);
    const { state, entry } = TieredMemoryEngine.recall(s, "missing", LATER);
    expect(entry).toBeNull();
    expect(state.working[0].access_count).toBe(0);
    expect(state.working[0].accessed_at).toBe(ISO);
  });

  it("hit increments access_count and updates accessed_at exactly once", () => {
    const s = TieredMemoryEngine.insert(TieredMemoryEngine.empty(), newEntry("e1", "k1"), ISO);
    const { state, entry } = TieredMemoryEngine.recall(s, "k1", LATER);
    expect(entry).not.toBeNull();
    expect(entry!.access_count).toBe(1);
    expect(entry!.accessed_at).toBe(LATER);
    expect(state.working[0].access_count).toBe(1);
  });

  it("multiple recalls accumulate access_count exactly", () => {
    let s = TieredMemoryEngine.insert(TieredMemoryEngine.empty(), newEntry("e1", "k1"), ISO);
    for (let i = 0; i < 5; i += 1) {
      const r = TieredMemoryEngine.recall(s, "k1", LATER);
      s = r.state;
    }
    expect(s.working[0].access_count).toBe(5);
  });
});

describe("TieredMemoryEngine.promote — tier transitions", () => {
  it("promotes working → episodic when access_count >= threshold", () => {
    let s = TieredMemoryEngine.insert(TieredMemoryEngine.empty(), newEntry("e1", "k1"), ISO);
    for (let i = 0; i < 3; i += 1) s = TieredMemoryEngine.recall(s, "k1", LATER).state;
    const promoted = TieredMemoryEngine.promote(s);
    expect(promoted.working).toHaveLength(0);
    expect(promoted.episodic).toHaveLength(1);
    expect(promoted.episodic[0].tier).toBe("episodic");
    expect(promoted.episodic[0].access_count).toBe(3);
  });

  it("keeps working when access_count < threshold (exact boundary -1)", () => {
    let s = TieredMemoryEngine.insert(TieredMemoryEngine.empty(), newEntry("e1", "k1"), ISO);
    for (let i = 0; i < 2; i += 1) s = TieredMemoryEngine.recall(s, "k1", LATER).state;
    const promoted = TieredMemoryEngine.promote(s);
    expect(promoted.working).toHaveLength(1);
    expect(promoted.episodic).toHaveLength(0);
  });

  it("promotes episodic → semantic when access_count >= 8 (single-pass)", () => {
    let s = TieredMemoryEngine.insert(TieredMemoryEngine.empty(), newEntry("e1", "k1"), ISO);
    for (let i = 0; i < 8; i += 1) s = TieredMemoryEngine.recall(s, "k1", LATER).state;
    // Single promote() pass: working(≥3) → episodic AND episodic(≥8) → semantic both fire.
    const promoted = TieredMemoryEngine.promote(s);
    expect(promoted.working).toHaveLength(0);
    expect(promoted.episodic).toHaveLength(0);
    expect(promoted.semantic).toHaveLength(1);
    expect(promoted.semantic[0].tier).toBe("semantic");
    expect(promoted.semantic[0].access_count).toBe(8);
  });

  it("LRU-evicts oldest working entry when over capacity (exact eviction count)", () => {
    let s = TieredMemoryEngine.empty();
    for (let i = 0; i < 5; i += 1) {
      const ts = `2026-05-24T13:0${i}:00.000Z`;
      s = TieredMemoryEngine.insert(s, newEntry(`e${i}`, `k${i}`), ts);
    }
    const promoted = TieredMemoryEngine.promote(s, { workingTierMaxSize: 3 });
    expect(promoted.working).toHaveLength(3);
    expect(promoted.episodic).toHaveLength(2);
    // The 2 evicted entries should be the oldest (e0, e1).
    const evictedKeys = promoted.episodic.map((e) => e.key).sort();
    expect(evictedKeys).toEqual(["k0", "k1"]);
  });

  it("respects custom policy thresholds", () => {
    let s = TieredMemoryEngine.insert(TieredMemoryEngine.empty(), newEntry("e1", "k1"), ISO);
    for (let i = 0; i < 1; i += 1) s = TieredMemoryEngine.recall(s, "k1", LATER).state;
    const promoted = TieredMemoryEngine.promote(s, { workingToEpisodicMinAccess: 1 });
    expect(promoted.working).toHaveLength(0);
    expect(promoted.episodic).toHaveLength(1);
  });
});

describe("TieredMemoryEngine.expire — TTL", () => {
  it("expires entries where created_at + ttl_ms <= now; reports expired list", () => {
    let s = TieredMemoryEngine.empty();
    s = TieredMemoryEngine.insert(s, newEntry("e1", "k1", 1, 30_000), ISO);
    s = TieredMemoryEngine.insert(s, newEntry("e2", "k2", 2, 120_000), ISO);
    // 60s later → e1 expired (30s ttl), e2 alive (120s ttl).
    const r = TieredMemoryEngine.expire(s, "2026-05-24T13:01:00.000Z");
    expect(r.state.working).toHaveLength(1);
    expect(r.state.working[0].key).toBe("k2");
    expect(r.expired).toHaveLength(1);
    expect(r.expired[0].key).toBe("k1");
  });

  it("preserves entries with no ttl_ms (undefined TTL = no expiry)", () => {
    const s = TieredMemoryEngine.insert(TieredMemoryEngine.empty(), newEntry("e1", "k1"), ISO);
    const r = TieredMemoryEngine.expire(s, "2099-01-01T00:00:00.000Z");
    expect(r.state.working).toHaveLength(1);
    expect(r.expired).toHaveLength(0);
  });
});

describe("TieredMemoryEngine.stats / renderState", () => {
  it("stats counts entries per tier exactly", () => {
    let s = TieredMemoryEngine.empty();
    s = TieredMemoryEngine.insert(s, newEntry("e1", "k1"), ISO);
    s = TieredMemoryEngine.insert(s, newEntry("e2", "k2"), ISO);
    const stats = TieredMemoryEngine.stats(s);
    expect(stats).toEqual({ working: 2, episodic: 0, semantic: 0, total: 2 });
  });

  it("renderState lists tier headers and known keys", () => {
    const s = TieredMemoryEngine.insert(TieredMemoryEngine.empty(), newEntry("e1", "k_one"), ISO);
    const md = TieredMemoryEngine.renderState(s);
    expect(md.includes("TIERED-MEMORY")).toBe(true);
    expect(md.includes("total=1")).toBe(true);
    expect(md.includes("k_one")).toBe(true);
  });
});
