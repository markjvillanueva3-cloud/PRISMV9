/**
 * SurfaceFinishPredictorEngine Tests — CAMK-MS2/U04
 * Tests surface finish prediction along novel toolpath segments
 */
import { describe, it, expect } from "vitest";
import { surfaceFinishPredictorEngine } from "../engines/SurfaceFinishPredictorEngine.js";

const tool = { type: "flat" as const, diameter_mm: 10, flute_count: 2, edge_radius_um: 5 };
const ballTool = { type: "ball" as const, diameter_mm: 10, flute_count: 2, edge_radius_um: 5 };

function makeSegments(count: number, overrides: Partial<{ ae_mm: number; ap_mm: number; rpm: number; feed_mmmin: number }> = {}) {
  return Array.from({ length: count }, (_, i) => ({
    x: 10 + i * 5, y: 50, z: -3,
    ae_mm: overrides.ae_mm ?? 3, ap_mm: overrides.ap_mm ?? 2,
    rpm: overrides.rpm ?? 10000, feed_mmmin: overrides.feed_mmmin ?? 1000,
  }));
}

describe("SurfaceFinishPredictorEngine", () => {
  // ---- Brammertz model ----
  it("Brammertz Ra scales with fz² and inversely with R", () => {
    const { ra_um: ra1 } = surfaceFinishPredictorEngine.brammertzRa(0.5, 5);
    const { ra_um: ra2 } = surfaceFinishPredictorEngine.brammertzRa(1.0, 5);
    // Doubling fz: feed term goes 4x, but edge radius is constant → Ra more than doubles at large fz
    expect(ra2).toBeGreaterThan(ra1 * 2);
  });

  it("Brammertz Ra inversely proportional to tool radius", () => {
    const { ra_um: raSmall } = surfaceFinishPredictorEngine.brammertzRa(0.15, 3);
    const { ra_um: raLarge } = surfaceFinishPredictorEngine.brammertzRa(0.15, 10);
    expect(raSmall).toBeGreaterThan(raLarge);
  });

  it("Brammertz returns zero for zero feed", () => {
    const { ra_um } = surfaceFinishPredictorEngine.brammertzRa(0, 5);
    expect(ra_um).toBe(0);
  });

  // ---- Scallop height ----
  it("ball endmill scallop height from stepover", () => {
    // h = R - sqrt(R² - (ae/2)²), R=5, ae=3 → h = 5 - sqrt(25-2.25) = 5-4.769 ≈ 0.231mm = 231µm
    const h = surfaceFinishPredictorEngine.scallopHeight(3, ballTool);
    expect(h).toBeCloseTo(231, -1);
  });

  it("flat endmill scallop from stepover", () => {
    // h = ae²/(8R) = 9/(40) = 0.225mm = 225µm
    const h = surfaceFinishPredictorEngine.scallopHeight(3, tool);
    expect(h).toBeCloseTo(225, -1);
  });

  it("barrel cutter scallop is much smaller", () => {
    const barrelTool = { type: "barrel" as const, diameter_mm: 10, barrel_radius_mm: 250 };
    const hBarrel = surfaceFinishPredictorEngine.scallopHeight(3, barrelTool);
    const hBall = surfaceFinishPredictorEngine.scallopHeight(3, ballTool);
    expect(hBarrel).toBeLessThan(hBall / 10); // barrel R=250 vs ball R=5
  });

  it("zero stepover gives zero scallop", () => {
    expect(surfaceFinishPredictorEngine.scallopHeight(0, ballTool)).toBe(0);
  });

  // ---- Full prediction ----
  it("predict returns per-point finish data", () => {
    const segments = makeSegments(10);
    const result = surfaceFinishPredictorEngine.predict({ segments, tool });
    expect(result.points).toHaveLength(10);
    expect(result.summary.mean_ra_um).toBeGreaterThan(0);
    // max >= mean (within floating point)
    expect(result.summary.max_ra_um).toBeGreaterThanOrEqual(result.summary.mean_ra_um - 1e-10);
  });

  it("higher feed increases Ra", () => {
    const lowFeed = surfaceFinishPredictorEngine.predict({ segments: makeSegments(5, { feed_mmmin: 500 }), tool });
    const highFeed = surfaceFinishPredictorEngine.predict({ segments: makeSegments(5, { feed_mmmin: 2000 }), tool });
    expect(highFeed.summary.mean_ra_um).toBeGreaterThan(lowFeed.summary.mean_ra_um);
  });

  it("wider stepover increases scallop", () => {
    const narrow = surfaceFinishPredictorEngine.predict({ segments: makeSegments(5, { ae_mm: 1 }), tool: ballTool });
    const wide = surfaceFinishPredictorEngine.predict({ segments: makeSegments(5, { ae_mm: 4 }), tool: ballTool });
    expect(wide.summary.mean_scallop_um).toBeGreaterThan(narrow.summary.mean_scallop_um);
  });

  // ---- Material correction ----
  it("titanium gives higher Ra than aluminum", () => {
    const segs = makeSegments(5);
    const al = surfaceFinishPredictorEngine.predict({ segments: segs, tool, material: "aluminum" });
    const ti = surfaceFinishPredictorEngine.predict({ segments: segs, tool, material: "titanium" });
    expect(ti.summary.mean_ra_um).toBeGreaterThan(al.summary.mean_ra_um);
  });

  // ---- Coolant effect ----
  it("MQL gives lower Ra than dry cutting", () => {
    const segs = makeSegments(5);
    const dry = surfaceFinishPredictorEngine.predict({ segments: segs, tool, coolant: "dry" });
    const mql = surfaceFinishPredictorEngine.predict({ segments: segs, tool, coolant: "mql" });
    expect(mql.summary.mean_ra_um).toBeLessThan(dry.summary.mean_ra_um);
  });

  // ---- Algorithm effects ----
  it("HRAF algorithm reduces Ra", () => {
    const segs = makeSegments(5);
    const base = surfaceFinishPredictorEngine.predict({ segments: segs, tool });
    const hraf = surfaceFinishPredictorEngine.predict({ segments: segs, tool, algorithm: "HRAF" });
    expect(hraf.summary.mean_ra_um).toBeLessThan(base.summary.mean_ra_um);
    expect(hraf.algorithm_effects[0].algorithm).toBe("HRAF");
  });

  it("TGAR roughing increases Ra", () => {
    const segs = makeSegments(5);
    const base = surfaceFinishPredictorEngine.predict({ segments: segs, tool });
    const tgar = surfaceFinishPredictorEngine.predict({ segments: segs, tool, algorithm: "TGAR" });
    expect(tgar.summary.mean_ra_um).toBeGreaterThan(base.summary.mean_ra_um);
  });

  it("HBCF barrel cutter finishing effect", () => {
    const result = surfaceFinishPredictorEngine.predict({ segments: makeSegments(3), tool, algorithm: "HBCF" });
    expect(result.algorithm_effects.some(e => e.algorithm === "HBCF")).toBe(true);
    expect(result.algorithm_effects[0].ra_correction_factor).toBeLessThan(1);
  });

  // ---- Target compliance ----
  it("tracks target compliance percentage", () => {
    const segs = makeSegments(10, { feed_mmmin: 200, ae_mm: 0.5, ap_mm: 0.5 }); // low feed + light cut
    const result = surfaceFinishPredictorEngine.predict({ segments: segs, tool, target_ra_um: 100 });
    expect(result.summary.pct_meeting_target).toBeGreaterThan(0);
  });

  it("identifies worst segment", () => {
    const segs = [
      { x: 10, y: 50, z: -3, ae_mm: 3, ap_mm: 2, rpm: 10000, feed_mmmin: 500 },
      { x: 20, y: 50, z: -3, ae_mm: 3, ap_mm: 2, rpm: 10000, feed_mmmin: 3000 }, // high feed
      { x: 30, y: 50, z: -3, ae_mm: 3, ap_mm: 2, rpm: 10000, feed_mmmin: 500 },
    ];
    const result = surfaceFinishPredictorEngine.predict({ segments: segs, tool });
    expect(result.summary.worst_segment_idx).toBe(1);
  });

  // ---- Quick predict ----
  it("quickPredict returns summary", () => {
    const segs = makeSegments(5);
    const quick = surfaceFinishPredictorEngine.quickPredict({ segments: segs, tool });
    expect(quick.mean_ra_um).toBeGreaterThan(0);
    expect(quick.max_ra_um).toBeGreaterThanOrEqual(quick.mean_ra_um - 1e-10);
    expect(quick.recommendation).toBeDefined();
  });

  // ---- Optimal feed for target Ra ----
  it("computes optimal fz for target Ra", () => {
    const fz = surfaceFinishPredictorEngine.optimalFeedForRa(1.6, 5, 5);
    expect(fz).toBeGreaterThan(0);
    // Verify: using this fz should give Ra close to target
    const { ra_um } = surfaceFinishPredictorEngine.brammertzRa(fz, 5, 5);
    expect(ra_um).toBeCloseTo(1.6, 0);
  });

  // ---- Optimal stepover for scallop ----
  it("computes optimal stepover for target scallop (ball)", () => {
    const ae = surfaceFinishPredictorEngine.optimalStepoverForScallop(100, ballTool); // 100µm target
    expect(ae).toBeGreaterThan(0);
    // Verify round-trip
    const h = surfaceFinishPredictorEngine.scallopHeight(ae, ballTool);
    expect(h).toBeCloseTo(100, -1);
  });

  // ---- Empty segments ----
  it("handles empty segments", () => {
    const result = surfaceFinishPredictorEngine.predict({ segments: [], tool });
    expect(result.points).toHaveLength(0);
    expect(result.summary.pct_meeting_target).toBe(100);
  });

  // ---- Recommendations ----
  it("generates recommendations when Ra exceeds target", () => {
    const segs = makeSegments(5, { feed_mmmin: 5000 }); // very high feed
    const result = surfaceFinishPredictorEngine.predict({ segments: segs, tool, target_ra_um: 0.4 });
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  // ---- Composite Ra includes waviness ----
  it("composite Ra >= kinematic Ra due to waviness", () => {
    const segs = makeSegments(5, { ap_mm: 5, ae_mm: 5, feed_mmmin: 2000 });
    const result = surfaceFinishPredictorEngine.predict({ segments: segs, tool });
    for (const p of result.points) {
      expect(p.composite_ra_um).toBeGreaterThanOrEqual(p.ra_um);
    }
  });
});
