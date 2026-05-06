/**
 * CrossProcessEpisodicMemoryEngine.test.ts — XPROC-NEURAL Tier 2 (T2-01)
 *
 * Concrete-assertion test suite. Covers acceptance criteria from
 * XPROC-NEURAL-ROADMAP.md Tier 2: recall@10 ≥ 0.85 on synthetic queries.
 * Plus the seven failure modes documented in the engine header.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CrossProcessEpisodicMemoryEngine,
  crossProcessEpisodicMemory,
  type XProcEpisodeKey,
} from "../engines/CrossProcessEpisodicMemoryEngine.js";

beforeEach(() => {
  CrossProcessEpisodicMemoryEngine.reset();
});

const millKey: XProcEpisodeKey = {
  process: "mill",
  material: "P",
  feature: "pocket",
  decision: "approved",
};

const lateKey: XProcEpisodeKey = {
  process: "lathe",
  material: "M",
  feature: "od_turn",
  decision: "approved",
};

describe("store() — input validation", () => {
  it("accepts a valid episode and returns ok=true with hot tier", () => {
    const r = CrossProcessEpisodicMemoryEngine.store({
      key: millKey,
      features: { vc_m_min: 180, fz_mm_tooth: 0.08, ap_mm: 4 },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.tier).toBe("hot");
      expect(r.seq).toBe(1);
      expect(r.id).toMatch(/^xproc-/);
    }
  });

  it("rejects missing key with invalid_key error (no throw)", () => {
    const r = CrossProcessEpisodicMemoryEngine.store({
      features: { vc: 100 },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("invalid_key");
      expect(r.message).toContain("key");
    }
  });

  it("rejects unknown process value with invalid_key error", () => {
    const r = CrossProcessEpisodicMemoryEngine.store({
      key: { ...millKey, process: "edm" as never },
      features: { vc: 100 },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("invalid_key");
  });

  it("rejects NaN feature value (Zod finite gate)", () => {
    const r = CrossProcessEpisodicMemoryEngine.store({
      key: millKey,
      features: { vc: Number.NaN },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("invalid_key");
  });

  it("rejects Infinity feature value (Zod finite gate)", () => {
    const r = CrossProcessEpisodicMemoryEngine.store({
      key: millKey,
      features: { vc: Number.POSITIVE_INFINITY },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("invalid_key");
  });

  it("monotonic seq across stores", () => {
    const a = CrossProcessEpisodicMemoryEngine.store({ key: millKey, features: { x: 1 } });
    const b = CrossProcessEpisodicMemoryEngine.store({ key: millKey, features: { x: 2 } });
    const c = CrossProcessEpisodicMemoryEngine.store({ key: millKey, features: { x: 3 } });
    if (a.ok && b.ok && c.ok) {
      expect(b.seq).toBe(a.seq + 1);
      expect(c.seq).toBe(b.seq + 1);
    } else {
      throw new Error("expected all stores to succeed");
    }
  });
});

describe("recall() — empty + edge cases", () => {
  it("returns empty result on empty store", () => {
    const r = CrossProcessEpisodicMemoryEngine.recall({ key: millKey, n: 10 });
    expect(r.episodes).toEqual([]);
    expect(r.totalSearched).toBe(0);
    expect(r.ageFilteredOut).toBe(0);
  });

  it("returns at most n episodes when totalSize > n", () => {
    for (let i = 0; i < 20; i++) {
      CrossProcessEpisodicMemoryEngine.store({ key: millKey, features: { x: i } });
    }
    const r = CrossProcessEpisodicMemoryEngine.recall({ key: millKey, n: 5 });
    expect(r.episodes.length).toBe(5);
    expect(r.totalSearched).toBe(20);
  });

  it("returns all available when n > totalSize (no padding)", () => {
    for (let i = 0; i < 3; i++) {
      CrossProcessEpisodicMemoryEngine.store({ key: millKey, features: { x: i } });
    }
    const r = CrossProcessEpisodicMemoryEngine.recall({ key: millKey, n: 100 });
    expect(r.episodes.length).toBe(3);
  });

  it("ageWindowMs filters episodes older than now-window", () => {
    const now = Date.now();
    CrossProcessEpisodicMemoryEngine.store({ key: millKey, features: { x: 1 }, ts: now - 10 * 60 * 1000 });
    CrossProcessEpisodicMemoryEngine.store({ key: millKey, features: { x: 2 }, ts: now - 1000 });
    const r = CrossProcessEpisodicMemoryEngine.recall({ key: millKey, n: 10, ageWindowMs: 5 * 60 * 1000 });
    expect(r.episodes.length).toBe(1);
    expect(r.episodes[0].episode.features.x).toBe(2);
    expect(r.ageFilteredOut).toBe(1);
  });
});

describe("recall() — categorical + numeric scoring", () => {
  it("ranks exact-key match above process-only match", () => {
    CrossProcessEpisodicMemoryEngine.store({
      key: { process: "mill", material: "S", feature: "slot", decision: "approved" },
      features: { vc: 80, fz: 0.05 },
    });
    CrossProcessEpisodicMemoryEngine.store({
      key: millKey,
      features: { vc: 180, fz: 0.08 },
    });
    const r = CrossProcessEpisodicMemoryEngine.recall({ key: millKey, n: 2 });
    expect(r.episodes[0].episode.key.material).toBe("P");  // exact match wins
    expect(r.episodes[1].episode.key.material).toBe("S");
    expect(r.episodes[0].categoricalScore).toBeGreaterThan(r.episodes[1].categoricalScore);
  });

  it("cosine similarity orders close numeric matches above far ones", () => {
    CrossProcessEpisodicMemoryEngine.store({ key: millKey, features: { vc: 200, fz: 0.1 } });
    CrossProcessEpisodicMemoryEngine.store({ key: millKey, features: { vc: 50, fz: 0.02 } });
    const r = CrossProcessEpisodicMemoryEngine.recall({
      key: millKey,
      queryFeatures: { vc: 195, fz: 0.095 },
      n: 2,
      weightCategorical: 0,  // pure numeric
    });
    // Both have identical categorical match; numeric should differentiate
    expect(r.episodes[0].numericScore).toBeGreaterThanOrEqual(r.episodes[1].numericScore);
    expect(r.episodes[0].episode.features.vc).toBe(200);
  });

  it("partial key (process only) still matches all process=mill episodes", () => {
    CrossProcessEpisodicMemoryEngine.store({ key: millKey, features: { x: 1 } });
    CrossProcessEpisodicMemoryEngine.store({
      key: { process: "mill", material: "S", feature: "slot", decision: "vetoed" },
      features: { x: 2 },
    });
    CrossProcessEpisodicMemoryEngine.store({ key: lateKey, features: { x: 3 } });
    const r = CrossProcessEpisodicMemoryEngine.recall({ key: { process: "mill" }, n: 10 });
    const millOnly = r.episodes.filter((e) => e.episode.key.process === "mill");
    expect(millOnly.length).toBe(2);
    // Lathe episode has 0 categorical score for process=mill query
    const latheRes = r.episodes.find((e) => e.episode.key.process === "lathe");
    expect(latheRes?.categoricalScore).toBe(0);
  });

  it("empty query key matches everything (categorical=1)", () => {
    CrossProcessEpisodicMemoryEngine.store({ key: millKey, features: { x: 1 } });
    CrossProcessEpisodicMemoryEngine.store({ key: lateKey, features: { x: 2 } });
    const r = CrossProcessEpisodicMemoryEngine.recall({ key: {}, n: 10 });
    expect(r.episodes.length).toBe(2);
    for (const ep of r.episodes) expect(ep.categoricalScore).toBe(1);
  });

  it("cosine handles disjoint feature keys (returns 0, not NaN)", () => {
    CrossProcessEpisodicMemoryEngine.store({ key: millKey, features: { vc: 200 } });
    const r = CrossProcessEpisodicMemoryEngine.recall({
      key: millKey,
      queryFeatures: { unrelated: 5 },
      n: 1,
      weightCategorical: 0,
    });
    expect(r.episodes.length).toBe(1);
    expect(Number.isFinite(r.episodes[0].score)).toBe(true);
    expect(r.episodes[0].numericScore).toBe(0);
  });

  it("tiebreaks score-tied episodes by ts desc then seq desc", () => {
    const ts = Date.now();
    const a = CrossProcessEpisodicMemoryEngine.store({ key: millKey, features: { x: 1 }, ts });
    const b = CrossProcessEpisodicMemoryEngine.store({ key: millKey, features: { x: 1 }, ts: ts + 100 });
    const c = CrossProcessEpisodicMemoryEngine.store({ key: millKey, features: { x: 1 }, ts: ts + 100 });
    if (!a.ok || !b.ok || !c.ok) throw new Error("setup failed");
    const r = CrossProcessEpisodicMemoryEngine.recall({ key: millKey, n: 3 });
    // All three have identical score (same key, no queryFeatures); newer ts first, then higher seq
    expect(r.episodes[0].episode.ts).toBe(ts + 100);
    expect(r.episodes[0].episode.seq).toBe(c.seq);
    expect(r.episodes[1].episode.seq).toBe(b.seq);
    expect(r.episodes[2].episode.seq).toBe(a.seq);
  });
});

describe("hierarchical promotion (hot → warm → cold)", () => {
  it("hot capacity demotes oldest to warm on overflow", () => {
    CrossProcessEpisodicMemoryEngine.reset({ hotMax: 3, warmMax: 100, coldMax: 100, warmHalfLifeMs: 1e9 });
    for (let i = 0; i < 5; i++) {
      CrossProcessEpisodicMemoryEngine.store({ key: millKey, features: { x: i } });
    }
    const s = CrossProcessEpisodicMemoryEngine.stats();
    expect(s.hot).toBe(3);
    expect(s.warm).toBe(2);
    expect(s.total).toBe(5);
  });

  it("warm capacity demotes age-decayed oldest to cold on overflow", () => {
    CrossProcessEpisodicMemoryEngine.reset({ hotMax: 1, warmMax: 2, coldMax: 100, warmHalfLifeMs: 1000 });
    const t0 = 1000000;
    for (let i = 0; i < 6; i++) {
      CrossProcessEpisodicMemoryEngine.store({ key: millKey, features: { x: i }, ts: t0 + i * 2000 });
    }
    const s = CrossProcessEpisodicMemoryEngine.stats();
    expect(s.hot).toBe(1);
    expect(s.warm).toBe(2);
    expect(s.cold).toBeGreaterThanOrEqual(3);
    // Oldest (x=0) must have aged out of warm — it's either in cold or evicted
    const r = CrossProcessEpisodicMemoryEngine.recall({ key: millKey, n: 100 });
    const xs = r.episodes.map((e) => e.episode.features.x).sort((a, b) => a - b);
    expect(xs).toContain(0);  // still preserved (in cold)
    expect(xs).toContain(5);  // newest in hot
  });

  it("cold capacity uses Algorithm R reservoir sampling (bounded)", () => {
    CrossProcessEpisodicMemoryEngine.reset({ hotMax: 1, warmMax: 1, coldMax: 5, warmHalfLifeMs: 1 });
    for (let i = 0; i < 100; i++) {
      CrossProcessEpisodicMemoryEngine.store({ key: millKey, features: { x: i }, ts: 1000 + i });
    }
    const s = CrossProcessEpisodicMemoryEngine.stats();
    expect(s.cold).toBeLessThanOrEqual(5);
    expect(s.total).toBeLessThanOrEqual(7);  // 1 hot + 1 warm + ≤5 cold
    expect(s.coldSampledFromTotal).toBeGreaterThan(0);
  });
});

describe("recall@10 acceptance — synthetic ground truth ≥ 0.85", () => {
  it("recall@10 covers ≥85% of relevant episodes on synthetic distribution", () => {
    // Build a synthetic dataset where each (process, material) combination has
    // 20 episodes with a characteristic feature center. Query the center; the
    // expected hits are the 20 episodes for that (process, material).
    const processes: Array<XProcEpisodeKey["process"]> = ["mill", "lathe", "wedm"];
    const materials = ["P", "M", "K", "N", "S"];
    const features = ["pocket", "od_turn", "rough"];
    const decisions: Array<XProcEpisodeKey["decision"]> = ["approved", "vetoed"];

    const centers: Record<string, { vc: number; fz: number }> = {};
    let storedOk = 0;
    for (const p of processes) {
      for (const m of materials) {
        const center = { vc: 50 + Math.random() * 200, fz: 0.02 + Math.random() * 0.15 };
        centers[`${p}|${m}`] = center;
        for (let i = 0; i < 20; i++) {
          const r = CrossProcessEpisodicMemoryEngine.store({
            key: {
              process: p,
              material: m,
              feature: features[i % features.length],
              decision: decisions[i % decisions.length],
            },
            features: {
              vc: center.vc + (Math.random() - 0.5) * 5,
              fz: center.fz + (Math.random() - 0.5) * 0.005,
            },
          });
          if (r.ok) storedOk++;
        }
      }
    }
    expect(storedOk).toBe(processes.length * materials.length * 20);

    // Bump capacities so we don't lose any to overflow during the test
    CrossProcessEpisodicMemoryEngine.configure({ hotMax: 100, warmMax: 1000, coldMax: 5000 });

    // For each (process, material) combo, query the center and count how many
    // of the top-10 results belong to that combo.
    let hits = 0;
    let totalQueries = 0;
    for (const p of processes) {
      for (const m of materials) {
        const c = centers[`${p}|${m}`];
        const r = CrossProcessEpisodicMemoryEngine.recall({
          key: { process: p, material: m },
          queryFeatures: c,
          n: 10,
          weightCategorical: 0.6,
        });
        const correct = r.episodes.filter(
          (e) => e.episode.key.process === p && e.episode.key.material === m,
        ).length;
        hits += correct;
        totalQueries += 10;
      }
    }
    const recallAt10 = hits / totalQueries;
    expect(recallAt10).toBeGreaterThanOrEqual(0.85);
  });
});

describe("stats() and configure()", () => {
  it("stats reports oldest/newest ts correctly", () => {
    const t0 = 1000000;
    CrossProcessEpisodicMemoryEngine.store({ key: millKey, features: { x: 1 }, ts: t0 });
    CrossProcessEpisodicMemoryEngine.store({ key: millKey, features: { x: 2 }, ts: t0 + 5000 });
    CrossProcessEpisodicMemoryEngine.store({ key: millKey, features: { x: 3 }, ts: t0 + 2000 });
    const s = CrossProcessEpisodicMemoryEngine.stats();
    expect(s.oldestTs).toBe(t0);
    expect(s.newestTs).toBe(t0 + 5000);
    expect(s.total).toBe(3);
  });

  it("stats on empty store has null timestamps", () => {
    const s = CrossProcessEpisodicMemoryEngine.stats();
    expect(s.oldestTs).toBeNull();
    expect(s.newestTs).toBeNull();
    expect(s.total).toBe(0);
  });

  it("configure() merges with defaults and returns the effective config", () => {
    const cfg = CrossProcessEpisodicMemoryEngine.configure({ hotMax: 50 });
    expect(cfg.hotMax).toBe(50);
    expect(cfg.warmMax).toBe(1000);  // unchanged default
    expect(cfg.coldMax).toBe(5000);
  });
});

describe("dispatcher convenience wrapper", () => {
  it("routes xproc_episodic_store to store()", () => {
    const r = crossProcessEpisodicMemory("xproc_episodic_store", {
      key: millKey,
      features: { vc: 180 },
    }) as { ok: boolean; tier?: string };
    expect(r.ok).toBe(true);
    expect(r.tier).toBe("hot");
  });

  it("routes xproc_episodic_recall to recall()", () => {
    crossProcessEpisodicMemory("xproc_episodic_store", { key: millKey, features: { x: 1 } });
    const r = crossProcessEpisodicMemory("xproc_episodic_recall", {
      key: millKey,
      n: 5,
    }) as { episodes: unknown[]; totalSearched: number };
    expect(r.totalSearched).toBe(1);
    expect(r.episodes.length).toBe(1);
  });

  it("routes xproc_episodic_stats to stats()", () => {
    crossProcessEpisodicMemory("xproc_episodic_store", { key: millKey, features: { x: 1 } });
    const r = crossProcessEpisodicMemory("xproc_episodic_stats", {}) as { total: number };
    expect(r.total).toBe(1);
  });

  it("throws on unknown action with descriptive message", () => {
    expect(() => crossProcessEpisodicMemory("xproc_unknown_action", {})).toThrow(
      /unknown action 'xproc_unknown_action'/,
    );
  });
});
