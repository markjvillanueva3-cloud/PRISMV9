import { describe, it, expect } from "vitest";
import { latheBlockTimeProfilerEngine } from "../engines/LatheBlockTimeProfilerEngine.js";

const BLOCKS = [
  { n: 10, category: "rapid" as const, distance_mm: 200, rapid_rate_mm_min: 30000 },
  { n: 20, category: "feed" as const, distance_mm: 50, effective_feed_mm_min: 500 },
  { n: 30, category: "dwell" as const, dwell_seconds: 2 },
  { n: 40, category: "tool_change" as const, tool_change_seconds: 5 },
  { n: 50, category: "m_code" as const, m_code_seconds: 0.5 },
  { n: 60, category: "retract" as const, distance_mm: 100, effective_feed_mm_min: 2000 },
];

describe("LatheBlockTimeProfilerEngine", () => {
  it("produces a step for each input block", () => {
    const r = latheBlockTimeProfilerEngine.profile({ blocks: BLOCKS });
    expect(r.steps.length).toBe(BLOCKS.length);
  });

  it("rapid block seconds = distance / rate × 60", () => {
    const r = latheBlockTimeProfilerEngine.profile({ blocks: BLOCKS });
    const rapid = r.steps.find((s) => s.n === 10)!;
    expect(rapid.seconds).toBeCloseTo((200 / 30000) * 60, 3);
  });

  it("feed block seconds scale with distance / feed rate", () => {
    const r = latheBlockTimeProfilerEngine.profile({ blocks: BLOCKS });
    const feed = r.steps.find((s) => s.n === 20)!;
    expect(feed.seconds).toBeCloseTo((50 / 500) * 60, 3);
  });

  it("dwell seconds are passed through verbatim", () => {
    const r = latheBlockTimeProfilerEngine.profile({ blocks: BLOCKS });
    const dwell = r.steps.find((s) => s.n === 30)!;
    expect(dwell.seconds).toBeCloseTo(2, 3);
  });

  it("tool_change uses per-block tool_change_seconds", () => {
    const r = latheBlockTimeProfilerEngine.profile({ blocks: BLOCKS });
    const tc = r.steps.find((s) => s.n === 40)!;
    expect(tc.seconds).toBeCloseTo(5, 3);
  });

  it("m_code seconds pass through", () => {
    const r = latheBlockTimeProfilerEngine.profile({ blocks: BLOCKS });
    const mc = r.steps.find((s) => s.n === 50)!;
    expect(mc.seconds).toBeCloseTo(0.5, 3);
  });

  it("share_pct sums to ~100% across all blocks", () => {
    const r = latheBlockTimeProfilerEngine.profile({ blocks: BLOCKS });
    const sum = r.steps.reduce((s, x) => s + x.share_pct, 0);
    expect(sum).toBeGreaterThan(99);
    expect(sum).toBeLessThan(101);
  });

  it("category_shares sum to ~total_seconds", () => {
    const r = latheBlockTimeProfilerEngine.profile({ blocks: BLOCKS });
    const catSum = r.category_shares.reduce((s, x) => s + x.total_seconds, 0);
    expect(catSum).toBeCloseTo(r.total_seconds, 2);
  });

  it("bottleneck_blocks sorted by seconds descending", () => {
    const r = latheBlockTimeProfilerEngine.profile({ blocks: BLOCKS });
    for (let k = 1; k < r.bottleneck_blocks.length; k++) {
      expect(r.bottleneck_blocks[k - 1].seconds).toBeGreaterThanOrEqual(r.bottleneck_blocks[k].seconds);
    }
  });

  it("top_n limits bottleneck list", () => {
    const r = latheBlockTimeProfilerEngine.profile({ blocks: BLOCKS, top_n: 2 });
    expect(r.bottleneck_blocks.length).toBe(2);
  });

  it("total_seconds > 0 for non-empty input", () => {
    const r = latheBlockTimeProfilerEngine.profile({ blocks: BLOCKS });
    expect(r.total_seconds).toBeGreaterThan(0);
  });

  it("empty blocks returns zero total", () => {
    const r = latheBlockTimeProfilerEngine.profile({ blocks: [] });
    expect(r.total_seconds).toBe(0);
    expect(r.steps.length).toBe(0);
  });

  it("reasoning mentions profiled count and dominant category", () => {
    const r = latheBlockTimeProfilerEngine.profile({ blocks: BLOCKS });
    const text = r.reasoning.join(" ");
    expect(text).toMatch(/Profiled/);
    expect(text).toMatch(/Dominant|category/);
  });

  it("getStats lists categories + reference", () => {
    const s = latheBlockTimeProfilerEngine.getStats();
    expect(s.categories).toContain("feed");
    expect(s.categories).toContain("rapid");
    expect(s.reference.length).toBeGreaterThan(5);
  });
});
