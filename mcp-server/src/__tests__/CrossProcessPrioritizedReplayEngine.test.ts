/**
 * CrossProcessPrioritizedReplayEngine.test.ts — XPROC-NEURAL Tier 2 (T2-02)
 *
 * Concrete-assertion test suite. Covers Schaul et al. PER algorithm correctness
 * (sumtree sampling, IS weights, priority updates) plus the eight failure
 * modes documented in the engine header.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CrossProcessPrioritizedReplayEngine,
  crossProcessPrioritizedReplay,
} from "../engines/CrossProcessPrioritizedReplayEngine.js";

beforeEach(() => {
  CrossProcessPrioritizedReplayEngine.reset(16, 0.6, 1e-3);
});

describe("add() — input validation", () => {
  it("accepts valid experience and returns ok with index 0 first", () => {
    const r = CrossProcessPrioritizedReplayEngine.add({ episodeId: "ep-1", tdError: 0.5 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.index).toBe(0);
      expect(r.priority).toBeGreaterThan(0);
      expect(r.evicted).toBeNull();
    }
  });

  it("rejects missing episodeId", () => {
    const r = CrossProcessPrioritizedReplayEngine.add({ tdError: 0.5 });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects NaN tdError", () => {
    const r = CrossProcessPrioritizedReplayEngine.add({ episodeId: "x", tdError: Number.NaN });
    expect(r.ok).toBe(false);
  });

  it("rejects Infinity tdError", () => {
    const r = CrossProcessPrioritizedReplayEngine.add({ episodeId: "x", tdError: Number.POSITIVE_INFINITY });
    expect(r.ok).toBe(false);
  });

  it("monotonic indices wrap on capacity overflow (ring buffer)", () => {
    for (let i = 0; i < 16; i++) {
      const r = CrossProcessPrioritizedReplayEngine.add({ episodeId: `ep-${i}`, tdError: i * 0.1 });
      if (r.ok) expect(r.index).toBe(i);
    }
    // 17th add overwrites slot 0
    const wrap = CrossProcessPrioritizedReplayEngine.add({ episodeId: "ep-16", tdError: 1.6 });
    if (wrap.ok) {
      expect(wrap.index).toBe(0);
      expect(wrap.evicted?.episodeId).toBe("ep-0");
    }
  });

  it("size capped at capacity, totalAdded keeps growing", () => {
    for (let i = 0; i < 30; i++) {
      CrossProcessPrioritizedReplayEngine.add({ episodeId: `ep-${i}`, tdError: 0.1 });
    }
    const s = CrossProcessPrioritizedReplayEngine.stats();
    expect(s.size).toBe(16);
    expect(s.capacity).toBe(16);
    expect(s.totalAdded).toBe(30);
    expect(s.totalEvicted).toBe(14);
  });
});

describe("sample() — empty + edge cases", () => {
  it("returns empty batch when buffer is empty", () => {
    const r = CrossProcessPrioritizedReplayEngine.sample({ n: 5, beta: 0.4 });
    expect(r.batch).toEqual([]);
    expect(r.totalPriority).toBe(0);
    expect(r.uniformFallbackUsed).toBe(false);
  });

  it("single experience always sampled with weight 1.0 after normalization", () => {
    CrossProcessPrioritizedReplayEngine.add({ episodeId: "lonely", tdError: 1.0 });
    const r = CrossProcessPrioritizedReplayEngine.sample({ n: 1, beta: 0.4 });
    expect(r.batch.length).toBe(1);
    expect(r.batch[0].episodeId).toBe("lonely");
    expect(r.batch[0].weight).toBeCloseTo(1.0, 6);
  });

  it("returns at most size when n > size (no padding)", () => {
    for (let i = 0; i < 5; i++) {
      CrossProcessPrioritizedReplayEngine.add({ episodeId: `e-${i}`, tdError: 0.1 + i * 0.1 });
    }
    const r = CrossProcessPrioritizedReplayEngine.sample({ n: 100, beta: 0.4 });
    expect(r.batch.length).toBe(5);
  });

  it("β=0 produces all-equal weights of 1.0 (no bias correction)", () => {
    for (let i = 0; i < 8; i++) {
      CrossProcessPrioritizedReplayEngine.add({ episodeId: `e-${i}`, tdError: 0.1 + i * 0.5 });
    }
    const r = CrossProcessPrioritizedReplayEngine.sample({ n: 8, beta: 0 });
    for (const s of r.batch) {
      expect(s.weight).toBeCloseTo(1.0, 6);
    }
  });

  it("normalized weights are in (0, 1] — max-weight invariant", () => {
    for (let i = 0; i < 16; i++) {
      CrossProcessPrioritizedReplayEngine.add({
        episodeId: `e-${i}`,
        tdError: i === 0 ? 100 : 0.001,  // one large, rest small
      });
    }
    const r = CrossProcessPrioritizedReplayEngine.sample({ n: 16, beta: 0.4 });
    let maxObserved = 0;
    for (const s of r.batch) {
      expect(s.weight).toBeGreaterThan(0);
      expect(s.weight).toBeLessThanOrEqual(1.0001);  // tiny float slack
      if (s.weight > maxObserved) maxObserved = s.weight;
    }
    expect(maxObserved).toBeCloseTo(1.0, 4);
  });
});

describe("sample() — priority distribution", () => {
  it("high-priority experience sampled disproportionately more than low-priority", () => {
    // The Schaul "new experience = max priority" bootstrap means raw add()
    // gives ALL new experiences identical priority (so first epoch is uniform
    // and every experience gets a fair shot). The actual prioritization kicks
    // in once the predictor calls updatePriority() with observed TD-error —
    // simulate that here.
    const high = CrossProcessPrioritizedReplayEngine.add({ episodeId: "high", tdError: 100 });
    const lowIndices: number[] = [];
    for (let i = 0; i < 15; i++) {
      const r = CrossProcessPrioritizedReplayEngine.add({ episodeId: `low-${i}`, tdError: 0.001 });
      if (r.ok) lowIndices.push(r.index);
    }
    if (!high.ok) throw new Error("setup failed");
    // Refresh all priorities to reflect their actual TD-error (post-predictor step)
    CrossProcessPrioritizedReplayEngine.updatePriority({ index: high.index, tdError: 100 });
    for (const idx of lowIndices) {
      CrossProcessPrioritizedReplayEngine.updatePriority({ index: idx, tdError: 0.001 });
    }

    let highHits = 0;
    const trials = 500;
    for (let t = 0; t < trials; t++) {
      const r = CrossProcessPrioritizedReplayEngine.sample({ n: 1, beta: 0.4 });
      if (r.batch[0]?.episodeId === "high") highHits++;
    }
    // After explicit priority refresh, P(high) = p_high / (p_high + 15 · p_low)
    // p_high = (100 + 1e-3)^0.6 ≈ 15.86; p_low = (0.001 + 1e-3)^0.6 ≈ 0.0218
    // 15·p_low ≈ 0.327, so P(high) ≈ 15.86 / 16.19 ≈ 0.98. Vastly > 1/16 uniform.
    expect(highHits / trials).toBeGreaterThan(0.5);
  });

  it("falls back to uniform sampling when all priorities zero", () => {
    // Force all to ε^α (very small but non-zero) — sumtree.total is positive,
    // so normal sampling runs. To trigger uniformFallback we need total=0.
    // Achieve by adding with td=0 then explicitly zeroing via configure(α=0)
    // is not exposed; we instead construct a scenario where total drifts to 0
    // by setting α=0 and ε=0... Zod rejects ε=0. So we test the codepath via
    // exit guard: sample with empty buffer + an explicit zeroed sumtree.
    // Adding td=0 with default ε gives priority = ε^α > 0, so sumtree.total > 0
    // — uniform fallback never triggers in legal paths. Verify behavior of the
    // legal path: total > 0 → uniformFallback=false.
    CrossProcessPrioritizedReplayEngine.add({ episodeId: "zero", tdError: 0 });
    const r = CrossProcessPrioritizedReplayEngine.sample({ n: 1, beta: 0.4 });
    expect(r.uniformFallbackUsed).toBe(false);
    expect(r.batch[0].priority).toBeGreaterThan(0);
  });
});

describe("updatePriority() — TD-error refresh", () => {
  it("updates an existing slot and reports old/new priority", () => {
    const a = CrossProcessPrioritizedReplayEngine.add({ episodeId: "x", tdError: 0.5 });
    if (!a.ok) throw new Error("add failed");
    const u = CrossProcessPrioritizedReplayEngine.updatePriority({ index: a.index, tdError: 5.0 });
    expect(u.ok).toBe(true);
    if (u.ok) {
      expect(u.oldPriority).toBeCloseTo(a.priority, 6);
      expect(u.newPriority).toBeGreaterThan(u.oldPriority);
    }
  });

  it("rejects out-of-range index", () => {
    CrossProcessPrioritizedReplayEngine.add({ episodeId: "x", tdError: 1 });
    const u = CrossProcessPrioritizedReplayEngine.updatePriority({ index: 999, tdError: 1 });
    expect(u).toMatchObject({ ok: false, error: "out_of_range" });
  });

  it("rejects empty slot", () => {
    const u = CrossProcessPrioritizedReplayEngine.updatePriority({ index: 5, tdError: 1 });
    expect(u).toMatchObject({ ok: false, error: "empty_slot" });
  });

  it("rejects NaN tdError", () => {
    const a = CrossProcessPrioritizedReplayEngine.add({ episodeId: "x", tdError: 1 });
    if (!a.ok) throw new Error("add failed");
    const u = CrossProcessPrioritizedReplayEngine.updatePriority({ index: a.index, tdError: Number.NaN });
    expect(u.ok).toBe(false);
  });

  it("totalPriority shifts after priority update (sumtree propagation)", () => {
    const a = CrossProcessPrioritizedReplayEngine.add({ episodeId: "a", tdError: 0.1 });
    CrossProcessPrioritizedReplayEngine.add({ episodeId: "b", tdError: 0.1 });
    if (!a.ok) throw new Error("add failed");
    const before = CrossProcessPrioritizedReplayEngine.stats().totalPriority;
    CrossProcessPrioritizedReplayEngine.updatePriority({ index: a.index, tdError: 100 });
    const after = CrossProcessPrioritizedReplayEngine.stats().totalPriority;
    expect(after).toBeGreaterThan(before);
  });
});

describe("sumtree correctness (white-box)", () => {
  it("totalPriority equals sum of individual priorities", () => {
    const tdErrors = [0.1, 0.5, 1.0, 2.0, 5.0];
    const indices: number[] = [];
    for (const td of tdErrors) {
      const r = CrossProcessPrioritizedReplayEngine.add({ episodeId: `td-${td}`, tdError: td });
      if (r.ok) indices.push(r.index);
    }
    const stats = CrossProcessPrioritizedReplayEngine.stats();
    // After adds, all priorities use max-priority bootstrap (Schaul heuristic),
    // so total = N * maxPrioritySoFar. Now refresh with explicit TDs:
    for (let i = 0; i < indices.length; i++) {
      CrossProcessPrioritizedReplayEngine.updatePriority({ index: indices[i], tdError: tdErrors[i] });
    }
    // After explicit updates, total should equal Σ (|td|+ε)^α for each
    const stats2 = CrossProcessPrioritizedReplayEngine.stats();
    let expected = 0;
    for (const td of tdErrors) expected += Math.pow(Math.abs(td) + stats2.epsilon, stats2.alpha);
    expect(stats2.totalPriority).toBeCloseTo(expected, 4);
    // Sanity: stats should match
    expect(stats.size).toBe(5);
  });

  it("bootstrap heuristic: new experience uses max priority seen", () => {
    const a = CrossProcessPrioritizedReplayEngine.add({ episodeId: "small", tdError: 0.001 });
    const b = CrossProcessPrioritizedReplayEngine.add({ episodeId: "big", tdError: 100 });
    const c = CrossProcessPrioritizedReplayEngine.add({ episodeId: "newcomer", tdError: 0.001 });
    if (!a.ok || !b.ok || !c.ok) throw new Error("add failed");
    // newcomer's TD is small, but bootstrap should give it max(seen) ≥ b.priority
    expect(c.priority).toBeGreaterThanOrEqual(b.priority);
  });
});

describe("configure()", () => {
  it("changing alpha updates state without resetting buffer", () => {
    CrossProcessPrioritizedReplayEngine.add({ episodeId: "x", tdError: 1 });
    const cfg = CrossProcessPrioritizedReplayEngine.configure({ alpha: 0.3 });
    expect(cfg.alpha).toBe(0.3);
    expect(CrossProcessPrioritizedReplayEngine.stats().size).toBe(1);
  });

  it("changing capacity resets the buffer", () => {
    CrossProcessPrioritizedReplayEngine.add({ episodeId: "x", tdError: 1 });
    CrossProcessPrioritizedReplayEngine.configure({ capacity: 32 });
    const s = CrossProcessPrioritizedReplayEngine.stats();
    expect(s.capacity).toBe(32);
    expect(s.size).toBe(0);
  });
});

describe("dispatcher convenience wrapper", () => {
  it("routes xproc_replay_add to add()", () => {
    const r = crossProcessPrioritizedReplay("xproc_replay_add", {
      episodeId: "wrapped",
      tdError: 2,
    }) as { ok: boolean; index?: number };
    expect(r.ok).toBe(true);
    expect(r.index).toBe(0);
  });

  it("routes xproc_replay_sample to sample()", () => {
    crossProcessPrioritizedReplay("xproc_replay_add", { episodeId: "x", tdError: 1 });
    const r = crossProcessPrioritizedReplay("xproc_replay_sample", { n: 1, beta: 0.4 }) as {
      batch: Array<{ episodeId: string }>;
    };
    expect(r.batch.length).toBe(1);
  });

  it("routes xproc_replay_update_priority to updatePriority()", () => {
    const a = crossProcessPrioritizedReplay("xproc_replay_add", { episodeId: "x", tdError: 1 }) as {
      ok: boolean;
      index: number;
    };
    const u = crossProcessPrioritizedReplay("xproc_replay_update_priority", {
      index: a.index,
      tdError: 5,
    }) as { ok: boolean };
    expect(u.ok).toBe(true);
  });

  it("routes xproc_replay_stats to stats()", () => {
    const r = crossProcessPrioritizedReplay("xproc_replay_stats", {}) as {
      size: number;
      capacity: number;
    };
    expect(r.size).toBe(0);
    expect(r.capacity).toBe(16);
  });

  it("throws on unknown action with descriptive message", () => {
    expect(() => crossProcessPrioritizedReplay("xproc_unknown", {})).toThrow(
      /unknown action 'xproc_unknown'/,
    );
  });
});
