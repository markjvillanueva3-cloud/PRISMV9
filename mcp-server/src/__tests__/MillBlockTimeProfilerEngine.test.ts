import { describe, it, expect } from "vitest";
import {
  millBlockTimeProfilerEngine as eng,
  type MillBlockTimeInput,
} from "../engines/MillBlockTimeProfilerEngine.js";

describe("MillBlockTimeProfilerEngine", () => {
  it("getStats lists 9 categories including 3 mill-canonical extensions", () => {
    const s = eng.getStats();
    expect(s.categories).toEqual([
      "rapid", "feed", "dwell", "tool_change", "retract", "m_code",
      "probe_cycle", "pallet_change", "head_index",
    ]);
    expect(s.mill_canonical_extensions).toEqual(["probe_cycle", "pallet_change", "head_index"]);
    expect(s.reference).toMatch(/Sandvik|Altintas|ISO 841/);
  });

  it("throws on missing blocks array", () => {
    expect(() => eng.profile({} as never)).toThrow(/blocks\[\] required/);
  });

  it("empty blocks array → 0 total seconds, all category counts zero", () => {
    const r = eng.profile({ blocks: [] });
    expect(r.total_seconds).toBe(0);
    expect(r.steps).toEqual([]);
    expect(r.category_shares.every(c => c.block_count === 0)).toBe(true);
  });

  it("rapid block: 100mm at 30000 mm/min → 0.2s", () => {
    const r = eng.profile({ blocks: [{ n: 1, category: "rapid", distance_mm: 100, rapid_rate_mm_min: 30000 }] });
    expect(r.total_seconds).toBe(0.2);
    expect(r.steps[0].seconds).toBe(0.2);
    expect(r.steps[0].share_pct).toBe(100);
  });

  it("rapid diagonal: dx=100, dy=80, dz=20 at 30000 mm/min → dominant axis 100mm → 0.2s", () => {
    const r = eng.profile({ blocks: [{ n: 1, category: "rapid", dx_mm: 100, dy_mm: 80, dz_mm: 20, rapid_rate_mm_min: 30000 }] });
    expect(r.total_seconds).toBe(0.2);
  });

  it("feed block: 10mm at 500 mm/min → 1.2s", () => {
    const r = eng.profile({ blocks: [{ n: 1, category: "feed", distance_mm: 10, effective_feed_mm_min: 500 }] });
    expect(r.total_seconds).toBe(1.2);
  });

  it("dwell block honors dwell_seconds", () => {
    const r = eng.profile({ blocks: [{ n: 1, category: "dwell", dwell_seconds: 2.5 }] });
    expect(r.total_seconds).toBe(2.5);
  });

  it("tool_change default 4s when no time supplied", () => {
    const r = eng.profile({ blocks: [{ n: 1, category: "tool_change" }] });
    expect(r.total_seconds).toBe(4);
  });

  it("m_code default 0.2s", () => {
    const r = eng.profile({ blocks: [{ n: 1, category: "m_code" }] });
    expect(r.total_seconds).toBe(0.2);
  });

  it("probe_cycle default 2.5s (mill-canonical)", () => {
    const r = eng.profile({ blocks: [{ n: 1, category: "probe_cycle" }] });
    expect(r.total_seconds).toBe(2.5);
    expect(r.steps[0].category).toBe("probe_cycle");
  });

  it("pallet_change default 8s (mill-canonical)", () => {
    const r = eng.profile({ blocks: [{ n: 1, category: "pallet_change" }] });
    expect(r.total_seconds).toBe(8);
  });

  it("head_index default 1s (mill-canonical, 5-axis A/B/C)", () => {
    const r = eng.profile({ blocks: [{ n: 1, category: "head_index" }] });
    expect(r.total_seconds).toBe(1);
  });

  it("retract block uses effective_feed_mm_min like feed", () => {
    const r = eng.profile({ blocks: [{ n: 1, category: "retract", distance_mm: 5, effective_feed_mm_min: 500 }] });
    expect(r.total_seconds).toBe(0.6); // 5/500 * 60
  });

  it("accel penalty: short 10mm rapid with accel=5000 mm/s² produces triangular-profile time (~0.089s) longer than no-accel (~0.02s)", () => {
    const noAccel = eng.profile({ blocks: [{ n: 1, category: "rapid", distance_mm: 10, dx_mm: 10, rapid_rate_mm_min: 30000 }] });
    const withAccel = eng.profile({ blocks: [{ n: 1, category: "rapid", distance_mm: 10, dx_mm: 10, rapid_rate_mm_min: 30000, accel_mm_s2: 5000 }] });
    // triangular: 2*sqrt(10/5000) = 0.0894
    expect(withAccel.total_seconds).toBeGreaterThan(noAccel.total_seconds);
    expect(withAccel.total_seconds).toBeCloseTo(0.089, 2);
  });

  it("multi-category program: rapid + feed + dwell + tool_change → correct total + per-category shares", () => {
    const blocks: MillBlockTimeInput[] = [
      { n: 1, category: "rapid", distance_mm: 100, rapid_rate_mm_min: 30000 }, // 0.2s
      { n: 2, category: "feed", distance_mm: 50, effective_feed_mm_min: 500 }, // 6s
      { n: 3, category: "dwell", dwell_seconds: 1 },                            // 1s
      { n: 4, category: "tool_change", tool_change_seconds: 5 },                // 5s
    ];
    const r = eng.profile({ blocks });
    // Total = 0.2 + 6 + 1 + 5 = 12.2
    expect(r.total_seconds).toBeCloseTo(12.2, 2);
    const feedShare = r.category_shares.find(c => c.category === "feed");
    if (!feedShare) throw new Error("Expected feed category share");
    expect(feedShare.share_pct).toBeCloseTo((6 / 12.2) * 100, 1);
  });

  it("bottleneck_blocks ranks blocks by descending seconds", () => {
    const blocks: MillBlockTimeInput[] = [
      { n: 1, category: "feed", distance_mm: 5, effective_feed_mm_min: 500 },   // 0.6s
      { n: 2, category: "tool_change", tool_change_seconds: 5 },                 // 5s
      { n: 3, category: "feed", distance_mm: 20, effective_feed_mm_min: 500 },  // 2.4s
    ];
    const r = eng.profile({ blocks });
    expect(r.bottleneck_blocks[0].n).toBe(2);
    expect(r.bottleneck_blocks[1].n).toBe(3);
    expect(r.bottleneck_blocks[2].n).toBe(1);
  });

  it("top_n=2 caps bottleneck list to 2 entries", () => {
    const blocks: MillBlockTimeInput[] = [
      { n: 1, category: "feed", distance_mm: 5, effective_feed_mm_min: 500 },
      { n: 2, category: "tool_change", tool_change_seconds: 5 },
      { n: 3, category: "feed", distance_mm: 20, effective_feed_mm_min: 500 },
    ];
    const r = eng.profile({ blocks, top_n: 2 });
    expect(r.bottleneck_blocks.length).toBe(2);
  });

  it("category_shares sorted by total_seconds descending (dominant category first)", () => {
    const blocks: MillBlockTimeInput[] = [
      { n: 1, category: "feed", distance_mm: 100, effective_feed_mm_min: 500 }, // 12s
      { n: 2, category: "rapid", distance_mm: 50, rapid_rate_mm_min: 30000 },    // 0.1s
      { n: 3, category: "dwell", dwell_seconds: 0.5 },                            // 0.5s
    ];
    const r = eng.profile({ blocks });
    expect(r.category_shares[0].category).toBe("feed");
    // sorted descending
    for (let i = 1; i < r.category_shares.length; i++) {
      expect(r.category_shares[i].total_seconds).toBeLessThanOrEqual(r.category_shares[i - 1].total_seconds);
    }
  });

  it("probe_cycle > 15% of total → reasoning flags in-process probing reduction", () => {
    const blocks: MillBlockTimeInput[] = [
      { n: 1, category: "feed", distance_mm: 5, effective_feed_mm_min: 500 },  // 0.6s
      { n: 2, category: "probe_cycle", probe_cycle_seconds: 5 },                // 5s — 89%
    ];
    const r = eng.profile({ blocks });
    expect(r.reasoning.some(s => /Probing >.*in-process probing reduction/.test(s))).toBe(true);
  });

  it("pallet_change > 10% of total → reasoning suggests batching parts", () => {
    const blocks: MillBlockTimeInput[] = [
      { n: 1, category: "feed", distance_mm: 100, effective_feed_mm_min: 500 }, // 12s
      { n: 2, category: "pallet_change", pallet_change_seconds: 10 },            // 10s — 45%
    ];
    const r = eng.profile({ blocks });
    expect(r.reasoning.some(s => /Pallet changes >.*batching parts/.test(s))).toBe(true);
  });

  it("tool_change > 20% of total → reasoning suggests tool-change-order optimization", () => {
    const blocks: MillBlockTimeInput[] = [
      { n: 1, category: "feed", distance_mm: 50, effective_feed_mm_min: 500 }, // 6s
      { n: 2, category: "tool_change", tool_change_seconds: 5 },                // 5s — 45%
    ];
    const r = eng.profile({ blocks });
    expect(r.reasoning.some(s => /Tool changes >.*tool-change-order optimization/.test(s))).toBe(true);
  });

  it("share_pct sums to 100 (within rounding) for non-empty programs", () => {
    const blocks: MillBlockTimeInput[] = [
      { n: 1, category: "rapid", distance_mm: 100, rapid_rate_mm_min: 30000 },
      { n: 2, category: "feed", distance_mm: 50, effective_feed_mm_min: 500 },
      { n: 3, category: "tool_change", tool_change_seconds: 5 },
    ];
    const r = eng.profile({ blocks });
    const totalShare = r.steps.reduce((s, x) => s + x.share_pct, 0);
    expect(totalShare).toBeCloseTo(100, 0);
  });
});
