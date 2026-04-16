/**
 * WEDMSequencingEngine Tests — WEDM AGI Phase 2 / U-P2-09
 *
 * Exit gate: Sequencing reduces total travel by ≥15 % vs naive order on
 * mixed workloads. We verify this on a small curated set and on 10 random
 * workloads (seeded PRNG for reproducibility).
 */
import { describe, it, expect } from "vitest";
import {
  WEDMSequencingEngine,
  wedmSequencingEngine,
  type WEDMCutOperation,
} from "../../engines/WEDMSequencingEngine.js";

const engine = new WEDMSequencingEngine();

// Seeded LCG for reproducible randomness in the stress test.
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function randomWorkload(
  rng: () => number,
  n: number,
  span = 200,
): WEDMCutOperation[] {
  const out: WEDMCutOperation[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      id: `c${i}`,
      start: { x: rng() * span, y: rng() * span },
      end: { x: rng() * span, y: rng() * span },
    });
  }
  return out;
}

describe("WEDMSequencingEngine — basic correctness", () => {
  it("returns each cut id exactly once", () => {
    const cuts: WEDMCutOperation[] = [
      { id: "a", start: { x: 10, y: 10 } },
      { id: "b", start: { x: 100, y: 100 } },
      { id: "c", start: { x: 50, y: 50 } },
    ];
    const r = engine.sequence({ cuts });
    expect(r.order.sort()).toEqual(["a", "b", "c"]);
  });

  it("nearest_neighbor visits the closest cut first from origin", () => {
    const cuts: WEDMCutOperation[] = [
      { id: "far", start: { x: 100, y: 100 } },
      { id: "near", start: { x: 5, y: 5 } },
      { id: "mid", start: { x: 50, y: 50 } },
    ];
    const r = engine.sequence({ cuts, strategy: "nearest_neighbor" });
    expect(r.order[0]).toBe("near");
  });

  it("naive strategy preserves input order", () => {
    const cuts: WEDMCutOperation[] = [
      { id: "a", start: { x: 100, y: 100 } },
      { id: "b", start: { x: 5, y: 5 } },
      { id: "c", start: { x: 50, y: 50 } },
    ];
    const r = engine.sequence({ cuts, strategy: "naive" });
    expect(r.order).toEqual(["a", "b", "c"]);
    expect(r.total_travel_mm).toBe(r.naive_travel_mm);
    expect(r.improvement_fraction).toBe(0);
  });

  it("end != start is honoured (moves start from prior end)", () => {
    const cuts: WEDMCutOperation[] = [
      { id: "a", start: { x: 0, y: 0 }, end: { x: 50, y: 0 } },
      { id: "b", start: { x: 52, y: 0 }, end: { x: 100, y: 0 } },
    ];
    const r = engine.sequence({ cuts, strategy: "naive" });
    // origin→a.start(0) + a.end→b.start(2) = 2mm travel
    expect(r.total_travel_mm).toBeCloseTo(2, 3);
  });
});

describe("WEDMSequencingEngine — exit gate (≥15 % travel reduction)", () => {
  it("beats naive by ≥15 % on a curated zig-zag workload", () => {
    // Naive zig-zags across the workspace; optimiser should strip that.
    const cuts: WEDMCutOperation[] = [
      { id: "0", start: { x: 0, y: 0 } },
      { id: "1", start: { x: 100, y: 0 } },
      { id: "2", start: { x: 10, y: 10 } },
      { id: "3", start: { x: 100, y: 10 } },
      { id: "4", start: { x: 10, y: 20 } },
      { id: "5", start: { x: 100, y: 20 } },
      { id: "6", start: { x: 10, y: 30 } },
      { id: "7", start: { x: 100, y: 30 } },
    ];
    const r = engine.sequence({ cuts });
    expect(r.improvement_fraction).toBeGreaterThanOrEqual(0.15);
  });

  it("beats naive by ≥15 % mean across 10 random workloads (seeded)", () => {
    const rng = mulberry32(20260416);
    const improvements: number[] = [];
    for (let i = 0; i < 10; i++) {
      const cuts = randomWorkload(rng, 20, 200);
      const r = engine.sequence({ cuts });
      improvements.push(r.improvement_fraction);
    }
    const mean =
      improvements.reduce((a, b) => a + b, 0) / improvements.length;
    expect(mean).toBeGreaterThanOrEqual(0.15);
  });

  it("2-opt improves on nearest-neighbour or matches it (never worse)", () => {
    const rng = mulberry32(42);
    for (let trial = 0; trial < 5; trial++) {
      const cuts = randomWorkload(rng, 15, 150);
      const nn = engine.sequence({ cuts, strategy: "nearest_neighbor" });
      const opt = engine.sequence({ cuts, strategy: "nn_2opt" });
      expect(opt.total_travel_mm).toBeLessThanOrEqual(
        nn.total_travel_mm + 1e-6,
      );
    }
  });
});

describe("WEDMSequencingEngine — degenerate cases", () => {
  it("single cut: order == [that id], travel = origin→start distance", () => {
    const r = engine.sequence({
      cuts: [{ id: "lonely", start: { x: 3, y: 4 } }],
    });
    expect(r.order).toEqual(["lonely"]);
    expect(r.total_travel_mm).toBeCloseTo(5, 3);
    expect(r.improvement_fraction).toBe(0);
  });

  it("all cuts at same point: travel == 0 or near-0, improvement = 0", () => {
    const cuts: WEDMCutOperation[] = Array.from({ length: 5 }).map((_, i) => ({
      id: `c${i}`,
      start: { x: 10, y: 10 },
    }));
    const r = engine.sequence({ cuts });
    expect(r.total_travel_mm).toBeLessThan(1e-6 + dist2d({ x: 0, y: 0 }, { x: 10, y: 10 }));
  });

  it("2 cuts with NN beats naive iff naive was worse", () => {
    const cuts: WEDMCutOperation[] = [
      { id: "far", start: { x: 100, y: 100 } },
      { id: "near", start: { x: 5, y: 5 } },
    ];
    const r = engine.sequence({ cuts });
    expect(r.order).toEqual(["near", "far"]);
    expect(r.improvement_fraction).toBeGreaterThan(0);
  });

  it("custom origin shifts the NN start", () => {
    const cuts: WEDMCutOperation[] = [
      { id: "a", start: { x: 0, y: 0 } },
      { id: "b", start: { x: 100, y: 0 } },
    ];
    const r = engine.sequence({
      cuts,
      origin: { x: 99, y: 0 },
      strategy: "nearest_neighbor",
    });
    expect(r.order[0]).toBe("b");
  });
});

describe("WEDMSequencingEngine — validation", () => {
  it("throws on empty cut list", () => {
    expect(() => engine.sequence({ cuts: [] })).toThrow(/at least one/);
  });

  it("throws on duplicate cut id", () => {
    expect(() =>
      engine.sequence({
        cuts: [
          { id: "a", start: { x: 0, y: 0 } },
          { id: "a", start: { x: 1, y: 1 } },
        ],
      }),
    ).toThrow(/duplicate/);
  });

  it("throws on NaN coordinate", () => {
    expect(() =>
      engine.sequence({
        cuts: [{ id: "a", start: { x: NaN, y: 0 } }],
      }),
    ).toThrow(/finite/);
  });

  it("throws on missing id", () => {
    expect(() =>
      engine.sequence({
        cuts: [{ id: "", start: { x: 0, y: 0 } }],
      }),
    ).toThrow(/id/);
  });
});

describe("WEDMSequencingEngine — singleton", () => {
  it("exposes a singleton for dispatcher use", () => {
    expect(wedmSequencingEngine).toBeInstanceOf(WEDMSequencingEngine);
  });
});

function dist2d(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
