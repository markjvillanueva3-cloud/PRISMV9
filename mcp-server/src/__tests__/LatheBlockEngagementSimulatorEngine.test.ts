import { describe, it, expect } from "vitest";
import { latheBlockEngagementSimulatorEngine } from "../engines/LatheBlockEngagementSimulatorEngine.js";

const BLOCKS = [
  { n: 10, motion: "rapid" as const, x_start_mm: 60, z_start_mm: 5, x_end_mm: 50, z_end_mm: 5 },
  { n: 20, motion: "feed" as const, x_start_mm: 50, z_start_mm: 5, x_end_mm: 46, z_end_mm: -30, feed_mm_rev: 0.25, spindle_rpm: 2000 },
  { n: 30, motion: "feed" as const, x_start_mm: 46, z_start_mm: -30, x_end_mm: 42, z_end_mm: -60, feed_mm_rev: 0.25, spindle_rpm: 2000 },
  { n: 40, motion: "rapid" as const, x_start_mm: 42, z_start_mm: -60, x_end_mm: 60, z_end_mm: 5 },
  { n: 50, motion: "tool_change" as const, x_start_mm: 60, z_start_mm: 5, x_end_mm: 60, z_end_mm: 5 },
];

describe("LatheBlockEngagementSimulatorEngine", () => {
  it("simulates all blocks and returns per-block steps", () => {
    const r = latheBlockEngagementSimulatorEngine.simulate({ blocks: BLOCKS });
    expect(r.steps.length).toBe(BLOCKS.length);
  });

  it("counts cutting blocks (feed with DoC > 0)", () => {
    const r = latheBlockEngagementSimulatorEngine.simulate({ blocks: BLOCKS });
    expect(r.total_cutting_blocks).toBe(2);
  });

  it("peak DoC = 2mm for 50 → 46 diameter move", () => {
    const r = latheBlockEngagementSimulatorEngine.simulate({ blocks: BLOCKS });
    expect(r.peak_doc_mm).toBeCloseTo(2, 2);
  });

  it("rapid blocks have zero MRR and zero DoC", () => {
    const r = latheBlockEngagementSimulatorEngine.simulate({ blocks: BLOCKS });
    const rapid = r.steps.find((s) => s.n === 10)!;
    expect(rapid.mrr_mm3_s).toBe(0);
    expect(rapid.depth_of_cut_mm).toBe(0);
  });

  it("feed block MRR is > 0 with rpm + feed", () => {
    const r = latheBlockEngagementSimulatorEngine.simulate({ blocks: BLOCKS });
    const feed = r.steps.find((s) => s.n === 20)!;
    expect(feed.mrr_mm3_s).toBeGreaterThan(0);
  });

  it("peak MRR scales with spindle rpm", () => {
    const lo = latheBlockEngagementSimulatorEngine.simulate({
      blocks: [{ ...BLOCKS[1], spindle_rpm: 500 }],
    });
    const hi = latheBlockEngagementSimulatorEngine.simulate({
      blocks: [{ ...BLOCKS[1], spindle_rpm: 4000 }],
    });
    expect(hi.peak_mrr_mm3_s).toBeGreaterThan(lo.peak_mrr_mm3_s);
  });

  it("warns on high DoC > 5mm", () => {
    const r = latheBlockEngagementSimulatorEngine.simulate({
      blocks: [{ ...BLOCKS[1], x_start_mm: 80, x_end_mm: 60 }],
    });
    expect(r.warnings.some((w) => /DoC/.test(w))).toBe(true);
  });

  it("tool change produces a step with no engagement", () => {
    const r = latheBlockEngagementSimulatorEngine.simulate({ blocks: BLOCKS });
    const tc = r.steps.find((s) => s.n === 50)!;
    expect(tc.depth_of_cut_mm).toBe(0);
    expect(tc.mrr_mm3_s).toBe(0);
  });

  it("nose radius affects engagement width estimate", () => {
    const r1 = latheBlockEngagementSimulatorEngine.simulate({ blocks: BLOCKS, nose_radius_mm: 0.4 });
    const r2 = latheBlockEngagementSimulatorEngine.simulate({ blocks: BLOCKS, nose_radius_mm: 1.6 });
    const f1 = r1.steps.find((s) => s.n === 20)!;
    const f2 = r2.steps.find((s) => s.n === 20)!;
    expect(f2.engagement_width_mm).toBeGreaterThanOrEqual(f1.engagement_width_mm);
  });

  it("reasoning mentions cutting blocks and peak values", () => {
    const r = latheBlockEngagementSimulatorEngine.simulate({ blocks: BLOCKS });
    const text = r.reasoning.join(" ");
    expect(text).toMatch(/cutting/);
    expect(text).toMatch(/Peak/i);
  });

  it("empty blocks returns zero totals", () => {
    const r = latheBlockEngagementSimulatorEngine.simulate({ blocks: [] });
    expect(r.total_cutting_blocks).toBe(0);
    expect(r.peak_mrr_mm3_s).toBe(0);
    expect(r.peak_doc_mm).toBe(0);
  });

  it("high feed per rev triggers warning", () => {
    const r = latheBlockEngagementSimulatorEngine.simulate({
      blocks: [{ ...BLOCKS[1], feed_mm_rev: 1.5 }],
    });
    const step = r.steps.find((s) => s.n === 20)!;
    expect(step.warning).toBeDefined();
  });

  it("getStats returns reference citation", () => {
    const s = latheBlockEngagementSimulatorEngine.getStats();
    expect(s.reference.length).toBeGreaterThan(5);
  });
});
