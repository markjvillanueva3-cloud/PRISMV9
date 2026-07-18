import { describe, it, expect, beforeEach } from "vitest";
import {
  wedmCurriculumSchedulerEngine,
  scoreAxesCount,
  scorePassCount,
  scoreMaterialClass,
  scoreToleranceTier,
  scoreTagDomain,
  scoreInverseConfidence,
} from "./WEDMCurriculumSchedulerEngine.js";

/**
 * Test coverage for U-WCTP-D2 — WEDMCurriculumSchedulerEngine.
 *
 * Verifies: per-axis pure scorers, weighted combination, deterministic
 * stable sort, tier-partition coherence with the EASY_THRESHOLD/
 * HARD_THRESHOLD cutoffs, and that the JM Die ground-truth tips
 * (E12xx straight 4-pass = simpler than E28xx 5-pass UV taper) order
 * correctly under default weights.
 */
describe("WEDMCurriculumSchedulerEngine", () => {
  beforeEach(() => {
    // Reset weights to defaults — singleton engine carries state.
    wedmCurriculumSchedulerEngine.setWeights({
      axes_count: 0.2,
      pass_count: 0.15,
      material_class: 0.2,
      tolerance_tier: 0.15,
      tag_domain: 0.2,
      inverse_confidence: 0.1,
    });
  });

  // ----- scoreAxesCount -------------------------------------------------

  it("scoreAxesCount: 4-axis taper text → 1.0", () => {
    expect(scoreAxesCount("4-axis UV taper program")).toBe(1.0);
    expect(scoreAxesCount("apply 5° taper with U-V offset")).toBe(1.0);
  });

  it("scoreAxesCount: 2-axis straight cut text → 0.0", () => {
    expect(scoreAxesCount("standard 2-axis straight cut")).toBe(0.0);
  });

  it("scoreAxesCount: metadata override beats text", () => {
    expect(scoreAxesCount("any text", { axes: 4 })).toBe(1.0);
    expect(scoreAxesCount("4-axis UV taper", { axes: 2 })).toBe(0.0);
  });

  // ----- scorePassCount -------------------------------------------------

  it("scorePassCount: '5-pass' text → 1.0 (= (5-1)/4)", () => {
    expect(scorePassCount("5-pass heavy cycle")).toBe(1.0);
  });

  it("scorePassCount: '4-pass' text → 0.75 (= (4-1)/4)", () => {
    expect(scorePassCount("4-pass standard cycle")).toBe(0.75);
  });

  it("scorePassCount: 'single-pass' → 0.0", () => {
    expect(scorePassCount("single-pass rough only")).toBe(0.0);
  });

  it("scorePassCount: metadata override", () => {
    expect(scorePassCount("no pass mention", { passes: 5 })).toBe(1.0);
    expect(scorePassCount("no pass mention", { passes: 1 })).toBe(0.0);
  });

  // ----- scoreMaterialClass ---------------------------------------------

  it("scoreMaterialClass: PCD = 1.0", () => {
    expect(scoreMaterialClass("PCD cutting tool insert")).toBe(1.0);
  });

  it("scoreMaterialClass: D2 tool steel ~ 0.45", () => {
    expect(scoreMaterialClass("D2 tool steel die")).toBeCloseTo(0.45, 2);
  });

  it("scoreMaterialClass: brass < tool steel < titanium < carbide", () => {
    const brass = scoreMaterialClass("brass plate");
    const steel = scoreMaterialClass("D2 tool steel");
    const ti = scoreMaterialClass("titanium Ti-6Al-4V");
    const carbide = scoreMaterialClass("tungsten carbide");
    expect(brass).toBeLessThan(steel);
    expect(steel).toBeLessThan(ti);
    expect(ti).toBeLessThan(carbide);
  });

  // ----- scoreToleranceTier ---------------------------------------------

  it("scoreToleranceTier: ±0.001 mm → high complexity", () => {
    expect(scoreToleranceTier("tolerance ±0.001 mm")).toBeGreaterThan(0.9);
  });

  it("scoreToleranceTier: ±0.01 mm → low complexity", () => {
    expect(scoreToleranceTier("tolerance ±0.01 mm")).toBeLessThan(0.1);
  });

  it("scoreToleranceTier: roughing keyword → low", () => {
    expect(scoreToleranceTier("roughing pass only no tolerance mention")).toBeLessThan(0.3);
  });

  it("scoreToleranceTier: 'sub-micron' or 'class-2' → high", () => {
    expect(scoreToleranceTier("sub-micron tolerance ground finish")).toBeGreaterThanOrEqual(0.7);
  });

  // ----- scoreTagDomain -------------------------------------------------

  it("scoreTagDomain: shop_ground_truth category → 1.0", () => {
    expect(scoreTagDomain({ category: "shop_ground_truth" })).toBe(1.0);
  });

  it("scoreTagDomain: fundamentals → 0.05", () => {
    expect(scoreTagDomain({ tags: ["fundamentals"] })).toBeCloseTo(0.05, 2);
  });

  it("scoreTagDomain: takes MAX over multiple matched tags", () => {
    expect(scoreTagDomain({ tags: ["fundamentals", "workpiece_machinability"] })).toBeCloseTo(0.7, 2);
  });

  // ----- scoreInverseConfidence -----------------------------------------

  it("scoreInverseConfidence: confidence 100 → 0.0", () => {
    expect(scoreInverseConfidence({ confidence: 100 })).toBe(0.0);
  });

  it("scoreInverseConfidence: confidence 50 → 1.0", () => {
    expect(scoreInverseConfidence({ confidence: 50 })).toBe(1.0);
  });

  it("scoreInverseConfidence: missing → 0.5 (neutral)", () => {
    expect(scoreInverseConfidence({})).toBe(0.5);
  });

  // ----- scoreExample (combined) ----------------------------------------

  it("scoreExample: simple brass roughing tip → easy tier", () => {
    const ex = wedmCurriculumSchedulerEngine.scoreExample({
      instruction: "What wire diameter for general roughing on brass?",
      output: "0.25 mm plain brass wire is the workhorse for brass roughing.",
      metadata: {
        confidence: 95,
        category: "fundamentals",
        tags: ["fundamentals", "brass"],
      },
    });
    expect(ex.tier).toBe("easy");
    expect(ex.complexity).toBeLessThan(0.33);
  });

  it("scoreExample: JM Die ground-truth E28xx UV taper → hard tier", () => {
    const ex = wedmCurriculumSchedulerEngine.scoreExample({
      instruction: "Generate JM Die FA-10S 5-pass UV taper program for 17-4 PH stainless. Tolerance ±0.002 mm.",
      output: "E2821-E2825 cycle, 4-axis UV, zero H-offset, feed 0.16-0.30 ipm.",
      metadata: {
        confidence: 98,
        category: "shop_ground_truth",
        tags: ["wire-edm", "jm-die", "e28xx", "4-axis-uv", "5-pass-taper", "17-4-ph"],
      },
    });
    expect(ex.tier).toBe("hard");
    expect(ex.complexity).toBeGreaterThanOrEqual(0.66);
  });

  // ----- emitCurriculum sort + stability --------------------------------

  it("emitCurriculum: sorts strictly easy → hard", () => {
    const corpus = [
      { instruction: "5-pass UV taper carbide", output: "complex", metadata: { confidence: 70, category: "shop_ground_truth" } },
      { instruction: "Brass fundamentals", output: "simple", metadata: { confidence: 100, category: "fundamentals", tags: ["brass"] } },
      { instruction: "4-pass D2 tool steel", output: "medium", metadata: { confidence: 95, category: "process_parameters" } },
    ];
    const ordered = wedmCurriculumSchedulerEngine.emitCurriculum(corpus);
    expect(ordered).toHaveLength(3);
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i].complexity).toBeGreaterThanOrEqual(ordered[i - 1].complexity);
    }
    expect(ordered[0].instruction).toMatch(/Brass fundamentals/);
    expect(ordered[2].instruction).toMatch(/5-pass UV taper carbide/);
  });

  it("emitCurriculum: stable sort — ties preserve input order", () => {
    const corpus = [
      { instruction: "ITEM A", output: "x", metadata: { confidence: 95, category: "fundamentals" } },
      { instruction: "ITEM B", output: "x", metadata: { confidence: 95, category: "fundamentals" } },
      { instruction: "ITEM C", output: "x", metadata: { confidence: 95, category: "fundamentals" } },
    ];
    const ordered = wedmCurriculumSchedulerEngine.emitCurriculum(corpus);
    // All three have identical complexity → must preserve A,B,C order
    expect(ordered.map((e) => e.instruction)).toEqual(["ITEM A", "ITEM B", "ITEM C"]);
  });

  it("emitCurriculum: empty input → empty output", () => {
    expect(wedmCurriculumSchedulerEngine.emitCurriculum([])).toEqual([]);
  });

  // ----- partitionByTier -------------------------------------------------

  it("partitionByTier: counts add up to the input length", () => {
    const corpus = [
      { instruction: "simple", output: "x", metadata: { confidence: 100, category: "fundamentals", tags: ["brass"] } },
      { instruction: "5-pass UV carbide ±0.001 mm", output: "y", metadata: { confidence: 70, category: "shop_ground_truth" } },
      { instruction: "4-pass D2 tool steel", output: "z", metadata: { confidence: 95, category: "process_parameters" } },
    ];
    const parts = wedmCurriculumSchedulerEngine.partitionByTier(corpus);
    expect(parts.easy.length + parts.medium.length + parts.hard.length).toBe(3);
    expect(parts.easy.every((e) => e.tier === "easy")).toBe(true);
    expect(parts.medium.every((e) => e.tier === "medium")).toBe(true);
    expect(parts.hard.every((e) => e.tier === "hard")).toBe(true);
  });

  // ----- stats() --------------------------------------------------------

  it("stats: per-tier counts + overallMean for empty input is zeros", () => {
    const s = wedmCurriculumSchedulerEngine.stats([]);
    expect(s.total).toBe(0);
    expect(s.overallMean).toBe(0);
    expect(s.counts).toEqual({ easy: 0, medium: 0, hard: 0 });
  });

  it("stats: reports overallMean between 0 and 1 for a mixed corpus", () => {
    const corpus = [
      { instruction: "easy brass", output: "x", metadata: { confidence: 100, category: "fundamentals", tags: ["brass"] } },
      { instruction: "5-pass UV carbide", output: "y", metadata: { confidence: 70, category: "shop_ground_truth" } },
    ];
    const s = wedmCurriculumSchedulerEngine.stats(corpus);
    expect(s.total).toBe(2);
    expect(s.overallMean).toBeGreaterThan(0);
    expect(s.overallMean).toBeLessThanOrEqual(1);
  });

  // ----- weights customization ------------------------------------------

  it("setWeights merges and getWeights returns defensive copy", () => {
    wedmCurriculumSchedulerEngine.setWeights({ axes_count: 0.5 });
    const w = wedmCurriculumSchedulerEngine.getWeights();
    w.axes_count = 999;
    expect(wedmCurriculumSchedulerEngine.getWeights().axes_count).toBe(0.5);
  });

  it("re-weighting axes_count alone shifts UV-taper examples relative to straight-cut", () => {
    const corpus = [
      { instruction: "5-pass UV taper", output: "x", metadata: { confidence: 95 } },
      { instruction: "2-axis straight cut", output: "y", metadata: { confidence: 95 } },
    ];
    wedmCurriculumSchedulerEngine.setWeights({
      axes_count: 0.8,
      pass_count: 0.05,
      material_class: 0.05,
      tolerance_tier: 0.025,
      tag_domain: 0.05,
      inverse_confidence: 0.025,
    });
    const ordered = wedmCurriculumSchedulerEngine.emitCurriculum(corpus);
    expect(ordered[0].instruction).toBe("2-axis straight cut");
    expect(ordered[1].instruction).toBe("5-pass UV taper");
    // Heavily-axes-weighted: taper example should be > 0.5 complexity
    expect(ordered[1].complexity).toBeGreaterThan(0.5);
  });
});
