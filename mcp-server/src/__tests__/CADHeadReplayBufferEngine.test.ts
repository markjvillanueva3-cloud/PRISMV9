/**
 * CADHeadReplayBufferEngine — U-CADC-LP03 / CAD-COMPLETE-MS0
 *
 * Verifies the three acceptance criteria of U-CADC-LP03:
 *   1. Priority sampling — high-priority entries are drawn far more often
 *      than low-priority ones (a uniform sampler would fail these).
 *   2. Buffer eviction — per-head FIFO cap; evictions counted; ids stable.
 *   3. Deterministic replay — two instances with the same seed + same
 *      add()/sample() sequence produce byte-identical batches.
 * Plus PER importance-sampling-weight correctness, copy semantics, the
 * extreme-α numeric-degradation guard, and the dispatcher schema contract.
 *
 * No mocks — LP03 has no runtime dependencies (it imports only the
 * FeedbackSample TYPE from LP02). These are pure unit tests.
 *
 * @module __tests__/CADHeadReplayBufferEngine.test
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  CADHeadReplayBufferEngine,
  type ReplayEntry,
} from "../engines/CADHeadReplayBufferEngine.js";
import type { FeedbackSample } from "../engines/CADPerAdapterFeedbackCollectorEngine.js";

/** A FeedbackSample fixture for replay-buffer tests. */
const fbSample = (over: Partial<FeedbackSample> = {}): FeedbackSample => ({
  headId: "fusion360",
  success: true,
  timingMs: 100,
  collision: false,
  regenerationOk: true,
  lineageId: "lin-0",
  timestamp: "2026-05-20T12:00:00.000Z",
  ...over,
});

describe("CADHeadReplayBufferEngine", () => {
  let buf: CADHeadReplayBufferEngine;

  beforeEach(() => {
    buf = new CADHeadReplayBufferEngine({ seed: 12345 });
  });

  // ─── add() — routing, growth, ids ──────────────────────────────────────
  describe("add()", () => {
    it("adds an entry, returns a monotonic id, grows the head buffer", () => {
      const id0 = buf.add("fusion360", fbSample());
      const id1 = buf.add("fusion360", fbSample());
      expect(id0).toBe(0);
      expect(id1).toBe(1);
      expect(buf.size("fusion360")).toBe(2);
    });

    it("new entries inherit the head's high-water priority", () => {
      const id0 = buf.add("fusion360", fbSample());
      buf.updatePriorities("fusion360", [id0], [50]); // raises high-water to 50
      buf.add("fusion360", fbSample());               // should inherit 50
      const entries = buf.getEntries("fusion360");
      expect(entries[1].priority).toBe(50);
    });

    it("clamps an explicit priority below the ε floor up to MIN_PRIORITY", () => {
      buf.add("fusion360", fbSample(), 0);          // 0 < 1e-6 → clamped
      buf.add("fusion360", fbSample(), -5);         // negative → clamped
      const entries = buf.getEntries("fusion360");
      expect(entries[0].priority).toBeGreaterThan(0);
      expect(entries[1].priority).toBeGreaterThan(0);
    });

    it("throws a descriptive TypeError on an empty headId (programmer error)", () => {
      expect(() => buf.add("", fbSample())).toThrow(/headId/);
    });

    it("throws a descriptive TypeError on a non-object sample (programmer error)", () => {
      expect(() => buf.add("fusion360", null as unknown as FeedbackSample)).toThrow(/sample/);
    });

    it("routes 3 adapters into 3 independent per-head buffers (variability floor)", () => {
      buf.add("freecad", fbSample({ headId: "freecad" }));
      buf.add("fusion360", fbSample());
      buf.add("mastercam", fbSample({ headId: "mastercam" }));
      buf.add("mastercam", fbSample({ headId: "mastercam" }));
      expect(buf.listHeads()).toEqual(["freecad", "fusion360", "mastercam"]);
      expect(buf.size("freecad")).toBe(1);
      expect(buf.size("mastercam")).toBe(2);
    });
  });

  // ─── buffer eviction (acceptance #2) ───────────────────────────────────
  describe("eviction", () => {
    it("FIFO-evicts at capacityPerHead — buffer caps, evictions counted, oldest dropped", () => {
      const capped = new CADHeadReplayBufferEngine({ seed: 1, capacityPerHead: 4 });
      const ids: number[] = [];
      for (let i = 0; i < 7; i++) ids.push(capped.add("fusion360", fbSample({ timingMs: i })));
      expect(capped.size("fusion360")).toBe(4);
      const entries = capped.getEntries("fusion360");
      expect(entries.map((e) => e.sample.timingMs)).toEqual([3, 4, 5, 6]); // 0-2 evicted
      expect(capped.getStats().byHead.fusion360.evicted).toBe(3);
      // ids stay monotonic + stable — evicted ids 0-2 simply no longer resolve
      expect(entries.map((e) => e.id)).toEqual([3, 4, 5, 6]);
    });
  });

  // ─── deterministic replay (acceptance #3) ──────────────────────────────
  describe("deterministic replay", () => {
    it("getSeed() returns the construction seed", () => {
      expect(new CADHeadReplayBufferEngine({ seed: 999 }).getSeed()).toBe(999);
    });

    it("two instances with the SAME seed produce byte-identical sample() batches", () => {
      const build = (): CADHeadReplayBufferEngine => {
        const b = new CADHeadReplayBufferEngine({ seed: 42 });
        for (let i = 0; i < 8; i++) b.add("fusion360", fbSample({ timingMs: i }), i + 1);
        return b;
      };
      const a = build();
      const c = build();
      const batchA = a.sample("fusion360", 4);
      const batchC = c.sample("fusion360", 4);
      expect(batchA.ids).toEqual(batchC.ids);
      expect(batchA.weights).toEqual(batchC.weights);
    });

    it("reset() re-seeds the PRNG — replay repeats exactly", () => {
      for (let i = 0; i < 8; i++) buf.add("fusion360", fbSample({ timingMs: i }), i + 1);
      const first = buf.sample("fusion360", 4);
      // reset clears the buffer + re-seeds; re-add the identical sequence
      buf.reset();
      for (let i = 0; i < 8; i++) buf.add("fusion360", fbSample({ timingMs: i }), i + 1);
      const second = buf.sample("fusion360", 4);
      expect(second.ids).toEqual(first.ids);
      expect(second.weights).toEqual(first.weights);
    });

    it("different seeds generally produce different draws", () => {
      const draw = (seed: number): number[] => {
        const b = new CADHeadReplayBufferEngine({ seed });
        for (let i = 0; i < 20; i++) b.add("fusion360", fbSample(), i + 1);
        return b.sample("fusion360", 5).ids;
      };
      expect(draw(1)).not.toEqual(draw(2));
    });
  });

  // ─── priority sampling (acceptance #1) ─────────────────────────────────
  describe("priority sampling", () => {
    it("draws a high-priority entry far more often than low-priority peers", () => {
      // 5 entries at default priority; one promoted to 1000. With α=0.6 the
      // promoted entry's weight is 1000^0.6 ≈ 63x a peer's, so over 100 single
      // draws it should dominate. A uniform sampler would draw it ~20 times.
      const ids: number[] = [];
      for (let i = 0; i < 5; i++) ids.push(buf.add("fusion360", fbSample()));
      const hotId = ids[2];
      buf.updatePriorities("fusion360", [hotId], [1000]);
      let hotHits = 0;
      for (let d = 0; d < 100; d++) {
        if (buf.sample("fusion360", 1).ids[0] === hotId) hotHits++;
      }
      expect(hotHits).toBeGreaterThanOrEqual(70);
    });

    it("samples uniformly when every entry has an equal priority", () => {
      for (let i = 0; i < 4; i++) buf.add("fusion360", fbSample());
      const batch = buf.sample("fusion360", 4); // batch == size → all entries
      expect(batch.ids.length).toBe(4);
      // equal priorities → equal P(i) → IS weights all normalise to 1
      for (const w of batch.weights) expect(w).toBeCloseTo(1, 10);
    });
  });

  // ─── sample() — batching, weights, edges ───────────────────────────────
  describe("sample()", () => {
    it("draws WITHOUT replacement — every id in a batch is distinct", () => {
      for (let i = 0; i < 10; i++) buf.add("fusion360", fbSample(), i + 1);
      const batch = buf.sample("fusion360", 6);
      expect(batch.ids.length).toBe(6);
      expect(new Set(batch.ids).size).toBe(6);
    });

    it("clamps batchSize larger than the buffer down to the buffer size", () => {
      for (let i = 0; i < 3; i++) buf.add("fusion360", fbSample());
      const batch = buf.sample("fusion360", 99);
      expect(batch.entries.length).toBe(3);
      expect(batch.ids.length).toBe(3);
    });

    it("returns an empty batch for batchSize 0 / negative / NaN", () => {
      for (let i = 0; i < 3; i++) buf.add("fusion360", fbSample());
      for (const bad of [0, -2, NaN]) {
        const batch = buf.sample("fusion360", bad);
        expect(batch.entries).toEqual([]);
        expect(batch.ids).toEqual([]);
        expect(batch.weights).toEqual([]);
      }
    });

    it("returns an empty batch for an empty / unknown head — never throws", () => {
      expect(buf.sample("never-seen", 5)).toEqual({ headId: "never-seen", entries: [], ids: [], weights: [] });
    });

    it("importance-sampling weights are all in (0,1] with max normalised to 1", () => {
      for (let i = 0; i < 8; i++) buf.add("fusion360", fbSample(), i + 1);
      const batch = buf.sample("fusion360", 5);
      expect(Math.max(...batch.weights)).toBeCloseTo(1, 10);
      for (const w of batch.weights) {
        expect(w).toBeGreaterThan(0);
        expect(w).toBeLessThanOrEqual(1 + 1e-9);
        expect(Number.isFinite(w)).toBe(true);
      }
    });

    it("degrades to uniform (finite weights, no NaN) under extreme α + priority overflow", () => {
      // P1 guard: α=50 with a 1e300 priority overflows Math.pow to Infinity.
      const extreme = new CADHeadReplayBufferEngine({ seed: 7, alpha: 50 });
      extreme.add("fusion360", fbSample());
      extreme.add("fusion360", fbSample(), 1e300); // alphaWeight → Infinity
      extreme.add("fusion360", fbSample());
      const batch = extreme.sample("fusion360", 3);
      expect(batch.entries.length).toBe(3);
      for (const w of batch.weights) {
        expect(Number.isFinite(w)).toBe(true);
        expect(w).toBeGreaterThan(0);
      }
    });
  });

  // ─── updatePriorities() ────────────────────────────────────────────────
  describe("updatePriorities()", () => {
    it("updates raw priorities and returns the count actually changed", () => {
      const a = buf.add("fusion360", fbSample());
      const b = buf.add("fusion360", fbSample());
      const updated = buf.updatePriorities("fusion360", [a, b], [10, 20]);
      expect(updated).toBe(2);
      const entries = buf.getEntries("fusion360");
      expect(entries[0].priority).toBe(10);
      expect(entries[1].priority).toBe(20);
    });

    it("skips unknown / evicted ids without throwing", () => {
      const a = buf.add("fusion360", fbSample());
      const updated = buf.updatePriorities("fusion360", [a, 9999], [10, 20]);
      expect(updated).toBe(1);
    });

    it("clamps an updated priority to the ε floor", () => {
      const a = buf.add("fusion360", fbSample());
      buf.updatePriorities("fusion360", [a], [-100]);
      expect(buf.getEntries("fusion360")[0].priority).toBeGreaterThan(0);
    });
  });

  // ─── inspection + lifecycle ────────────────────────────────────────────
  describe("inspection + lifecycle", () => {
    it("getEntries returns a copy — mutating it cannot corrupt live state", () => {
      buf.add("fusion360", fbSample());
      const entries = buf.getEntries("fusion360");
      entries[0].priority = 99999;
      entries.push({ ...entries[0], id: 777 } as ReplayEntry);
      const fresh = buf.getEntries("fusion360");
      expect(fresh.length).toBe(1);
      expect(fresh[0].priority).not.toBe(99999);
    });

    it("getEntries with limit returns only the last N entries", () => {
      for (let i = 0; i < 6; i++) buf.add("fusion360", fbSample({ timingMs: i }));
      const last2 = buf.getEntries("fusion360", 2);
      expect(last2.map((e) => e.sample.timingMs)).toEqual([4, 5]);
    });

    it("getStats reports headCount / totalAdded / totalEvicted / totalSampled / byHead", () => {
      const small = new CADHeadReplayBufferEngine({ seed: 1, capacityPerHead: 2 });
      small.add("freecad", fbSample({ headId: "freecad" }));
      small.add("fusion360", fbSample());
      small.add("fusion360", fbSample());
      small.add("fusion360", fbSample()); // evicts 1
      small.sample("fusion360", 1);
      const s = small.getStats();
      expect(s.headCount).toBe(2);
      expect(s.totalAdded).toBe(4);
      expect(s.totalEvicted).toBe(1);
      expect(s.totalSampled).toBe(1);
      expect(s.byHead.fusion360.size).toBe(2);
    });

    it("reset() clears every buffer and zeroes counters", () => {
      buf.add("fusion360", fbSample());
      buf.sample("fusion360", 1);
      buf.reset();
      expect(buf.listHeads()).toEqual([]);
      expect(buf.size("fusion360")).toBe(0);
      expect(buf.getStats()).toEqual({ headCount: 0, totalAdded: 0, totalEvicted: 0, totalSampled: 0, byHead: {} });
    });
  });

  // ─── dispatcher schema contract ────────────────────────────────────────
  it("prism_cad LP03 action schemas parse valid params + reject bad ones", async () => {
    const { ACTION_CAD_SCHEMAS } = await import("../schemas/cadActionSchemas.js");
    const stats = ACTION_CAD_SCHEMAS.cad_replay_stats;
    const entries = ACTION_CAD_SCHEMAS.cad_replay_entries;
    expect(typeof stats.safeParse).toBe("function");
    expect(typeof entries.safeParse).toBe("function");

    // stats — strict empty
    expect(stats.safeParse({}).success).toBe(true);
    expect(stats.safeParse({ extra: 1 }).success).toBe(false);

    // entries — headId REQUIRED, limit optional positive int
    expect(entries.safeParse({ headId: "fusion360" }).success).toBe(true);
    expect(entries.safeParse({ headId: "fusion360", limit: 5 }).success).toBe(true);
    expect(entries.safeParse({}).success).toBe(false);
    expect(entries.safeParse({ headId: "" }).success).toBe(false);
    expect(entries.safeParse({ headId: "x", limit: -1 }).success).toBe(false);
    expect(entries.safeParse({ headId: "x", limit: 2.5 }).success).toBe(false);
  });
});
