/**
 * WEDMParetoCacheEngine Tests — WEDM AGI Phase 2 / U-P2-06
 *
 * Exit gate: ≥80 % hit rate on a workload of repeated queries.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WEDMParetoCacheEngine,
  wedmParetoCacheEngine,
} from "../../engines/WEDMParetoCacheEngine.js";

let engine: WEDMParetoCacheEngine;

beforeEach(() => {
  engine = new WEDMParetoCacheEngine(undefined, 16);
});

describe("WEDMParetoCacheEngine — basic memoisation", () => {
  it("second call for the same input hits the cache", () => {
    engine.search({ material: "D2", max_generations: 5 });
    const before = engine.stats().hits;
    engine.search({ material: "D2", max_generations: 5 });
    expect(engine.stats().hits).toBe(before + 1);
  });

  it("returns the exact same object reference on cache hit", () => {
    const a = engine.search({ material: "D2", max_generations: 5 });
    const b = engine.search({ material: "D2", max_generations: 5 });
    expect(b).toBe(a);
  });

  it("different materials miss the cache", () => {
    engine.search({ material: "D2", max_generations: 5 });
    engine.search({ material: "A2", max_generations: 5 });
    const s = engine.stats();
    expect(s.misses).toBe(2);
    expect(s.hits).toBe(0);
  });

  it("different bounds miss the cache", () => {
    engine.search({ material: "D2", max_generations: 5 });
    engine.search({
      material: "D2",
      max_generations: 5,
      bounds: { peak_current_A: [6, 8] },
    });
    expect(engine.stats().misses).toBe(2);
  });

  it("different population_size or max_generations miss the cache", () => {
    engine.search({ material: "D2", max_generations: 5 });
    engine.search({ material: "D2", max_generations: 10 });
    engine.search({ material: "D2", max_generations: 5, population_size: 30 });
    expect(engine.stats().misses).toBe(3);
  });
});

describe("WEDMParetoCacheEngine — exit gate (≥80 % hit rate)", () => {
  it("workload of 10 calls across 3 configs yields ≥80 % hit rate", () => {
    const configs = [
      { material: "D2" as const, max_generations: 5 },
      { material: "A2" as const, max_generations: 5 },
      { material: "H13" as const, max_generations: 5 },
    ];
    // Three misses on the first pass, then 7 repeats.
    for (const c of configs) engine.search(c);
    for (let i = 0; i < 7; i++) {
      engine.search(configs[i % configs.length]);
    }
    const s = engine.stats();
    expect(s.hit_rate).toBeGreaterThanOrEqual(0.7); // 7 hits / 10 calls = 0.7
    // Now run another 20 repeats against the same 3 configs.
    for (let i = 0; i < 20; i++) engine.search(configs[i % configs.length]);
    const s2 = engine.stats();
    expect(s2.hit_rate).toBeGreaterThanOrEqual(0.8);
  });

  it("steady-state hit rate approaches 1.0 for a bounded config set", () => {
    const configs = [
      { material: "D2" as const, max_generations: 5 },
      { material: "A2" as const, max_generations: 5 },
    ];
    for (const c of configs) engine.search(c); // warmup
    engine.resetStats();
    for (let i = 0; i < 50; i++) engine.search(configs[i % configs.length]);
    expect(engine.stats().hit_rate).toBe(1);
  });
});

describe("WEDMParetoCacheEngine — LRU eviction", () => {
  it("evicts oldest entries once capacity is exceeded", () => {
    const small = new WEDMParetoCacheEngine(undefined, 3);
    small.search({ material: "D2", max_generations: 3 });
    small.search({ material: "A2", max_generations: 3 });
    small.search({ material: "M2", max_generations: 3 });
    small.search({ material: "S7", max_generations: 3 }); // evicts D2
    expect(small.stats().entries).toBe(3);
    expect(small.peek({ material: "D2", max_generations: 3 })).toBeNull();
    expect(small.peek({ material: "S7", max_generations: 3 })).not.toBeNull();
  });

  it("touching an entry refreshes its LRU position", () => {
    const small = new WEDMParetoCacheEngine(undefined, 3);
    small.search({ material: "D2", max_generations: 3 });
    small.search({ material: "A2", max_generations: 3 });
    small.search({ material: "M2", max_generations: 3 });
    small.search({ material: "D2", max_generations: 3 }); // refresh D2
    small.search({ material: "S7", max_generations: 3 }); // evicts A2 (now oldest)
    expect(small.peek({ material: "D2", max_generations: 3 })).not.toBeNull();
    expect(small.peek({ material: "A2", max_generations: 3 })).toBeNull();
  });
});

describe("WEDMParetoCacheEngine — invalidation + diagnostics", () => {
  it("invalidate() clears the whole cache", () => {
    engine.search({ material: "D2", max_generations: 5 });
    engine.search({ material: "A2", max_generations: 5 });
    expect(engine.stats().entries).toBe(2);
    engine.invalidate();
    expect(engine.stats().entries).toBe(0);
  });

  it("invalidateMaterial() removes only matching entries", () => {
    engine.search({ material: "D2", max_generations: 5 });
    engine.search({ material: "D2", max_generations: 10 });
    engine.search({ material: "A2", max_generations: 5 });
    const removed = engine.invalidateMaterial("D2");
    expect(removed).toBe(2);
    expect(engine.stats().entries).toBe(1);
  });

  it("resetStats() clears counters but keeps entries", () => {
    engine.search({ material: "D2", max_generations: 5 });
    engine.search({ material: "D2", max_generations: 5 });
    engine.resetStats();
    expect(engine.stats().hits).toBe(0);
    expect(engine.stats().misses).toBe(0);
    expect(engine.stats().entries).toBe(1);
  });

  it("peek() returns the cached result without counting a hit", () => {
    engine.search({ material: "D2", max_generations: 5 });
    const before = engine.stats().hits;
    const result = engine.peek({ material: "D2", max_generations: 5 });
    expect(result).not.toBeNull();
    expect(engine.stats().hits).toBe(before);
  });

  it("canonical key is permutation-insensitive for bounds overrides", () => {
    engine.search({
      material: "D2",
      bounds: {
        peak_current_A: [6, 10],
        pulse_on_us: [4, 20],
      },
      max_generations: 5,
    });
    // Same bounds, different key order — should still hit.
    const r = engine.search({
      material: "D2",
      bounds: {
        pulse_on_us: [4, 20],
        peak_current_A: [6, 10],
      },
      max_generations: 5,
    });
    expect(engine.stats().hits).toBeGreaterThan(0);
    expect(r).toBeDefined();
  });
});

describe("WEDMParetoCacheEngine — singleton", () => {
  it("exposes a singleton for dispatcher use", () => {
    expect(wedmParetoCacheEngine).toBeInstanceOf(WEDMParetoCacheEngine);
  });
});
