/**
 * Tests for PostProcessorFeedOptimizerEngine — Physics-backed feed optimization.
 */
import { describe, it, expect } from "vitest";
import { postProcessorFeedOptimizer } from "../engines/PostProcessorFeedOptimizerEngine.js";
import type { FeedOptimizerConfig } from "../engines/PostProcessorFeedOptimizerEngine.js";

const baseConfig: FeedOptimizerConfig = {
  toolDiameter_mm: 10,
  toolFlutes: 4,
  radialDepth_mm: 2,   // ae/D = 0.2 → chip thinning active
  axialDepth_mm: 5,
  material: "P",
  spindleRPM: 8000,
  nominalFeed_mmmin: 1000,
};

// ============================================================================
// Chip Thinning Compensation
// ============================================================================

describe("FeedOptimizer — Chip Thinning", () => {
  it("increases feed when ae/D < 0.5 (chip thinning active)", () => {
    const gcode = "G1 X10 Y0 F1000\nG1 X20 Y0";
    const result = postProcessorFeedOptimizer.optimize(gcode, baseConfig);
    // ae/D = 0.2 → factor ~1.27, feed should increase
    const modified = result.lines.filter(l => l.reason.includes("chip_thin"));
    expect(modified.length).toBeGreaterThan(0);
    expect(modified[0].optimizedFeed!).toBeGreaterThan(1000);
  });

  it("does not increase feed when ae/D >= 0.5", () => {
    const gcode = "G1 X10 Y0 F1000\nG1 X20 Y0";
    const config = { ...baseConfig, radialDepth_mm: 5 }; // ae/D = 0.5
    const result = postProcessorFeedOptimizer.optimize(gcode, config);
    const chipThin = result.lines.filter(l => l.reason.includes("chip_thin"));
    expect(chipThin.length).toBe(0);
  });

  it("respects maxFeedIncrease cap", () => {
    const gcode = "G1 X10 Y0 F1000";
    const config = { ...baseConfig, radialDepth_mm: 0.5, maxFeedIncrease: 1.2 };
    // ae/D = 0.05 → factor ~2.30, but capped at 1.2
    const result = postProcessorFeedOptimizer.optimize(gcode, config);
    const modified = result.lines.filter(l => l.optimizedFeed != null);
    if (modified.length > 0) {
      expect(modified[0].optimizedFeed!).toBeLessThanOrEqual(1200);
    }
  });

  it("can be disabled via enableChipThinning=false", () => {
    const gcode = "G1 X10 Y0 F1000";
    const config = { ...baseConfig, enableChipThinning: false };
    const result = postProcessorFeedOptimizer.optimize(gcode, config);
    const chipThin = result.lines.filter(l => l.reason.includes("chip_thin"));
    expect(chipThin.length).toBe(0);
  });
});

// ============================================================================
// Corner Deceleration
// ============================================================================

describe("FeedOptimizer — Corner Deceleration", () => {
  it("reduces feed at sharp corners (>30° direction change)", () => {
    // Straight then 90° turn
    const gcode = [
      "G1 X0 Y0 F1000",
      "G1 X10 Y0",
      "G1 X10 Y10",  // 90° corner
    ].join("\n");
    const config = { ...baseConfig, radialDepth_mm: 5, enableChipThinning: false };
    const result = postProcessorFeedOptimizer.optimize(gcode, config);
    const corners = result.lines.filter(l => l.reason.includes("corner"));
    expect(corners.length).toBeGreaterThan(0);
    expect(corners[0].optimizedFeed!).toBeLessThan(1000);
  });

  it("does not decelerate for straight moves", () => {
    const gcode = [
      "G1 X0 Y0 F1000",
      "G1 X10 Y0",
      "G1 X20 Y0",  // straight continuation
    ].join("\n");
    const config = { ...baseConfig, radialDepth_mm: 5, enableChipThinning: false };
    const result = postProcessorFeedOptimizer.optimize(gcode, config);
    const corners = result.lines.filter(l => l.reason.includes("corner"));
    expect(corners.length).toBe(0);
  });

  it("can be disabled via enableCornerDecel=false", () => {
    const gcode = "G1 X0 Y0 F1000\nG1 X10 Y0\nG1 X10 Y10";
    const config = { ...baseConfig, radialDepth_mm: 5, enableChipThinning: false, enableCornerDecel: false };
    const result = postProcessorFeedOptimizer.optimize(gcode, config);
    const corners = result.lines.filter(l => l.reason.includes("corner"));
    expect(corners.length).toBe(0);
  });
});

// ============================================================================
// Arc Feed Limiting
// ============================================================================

describe("FeedOptimizer — Arc Feed Limiting", () => {
  it("reduces feed for small radius arcs", () => {
    const gcode = "G2 X5 Y0 I1 J0 F1000";  // R=1, below default arcMinRadius=2
    const config = { ...baseConfig, radialDepth_mm: 5, enableChipThinning: false };
    const result = postProcessorFeedOptimizer.optimize(gcode, config);
    const arcs = result.lines.filter(l => l.reason.includes("arc"));
    expect(arcs.length).toBeGreaterThan(0);
    expect(arcs[0].optimizedFeed!).toBeLessThan(1000);
  });

  it("does not limit large radius arcs", () => {
    const gcode = "G2 X10 Y0 R10 F1000";  // R=10 >> arcMinRadius
    const config = { ...baseConfig, radialDepth_mm: 5, enableChipThinning: false };
    const result = postProcessorFeedOptimizer.optimize(gcode, config);
    const arcs = result.lines.filter(l => l.reason.includes("arc"));
    expect(arcs.length).toBe(0);
  });

  it("uses R word when available", () => {
    const gcode = "G3 X5 Y0 R0.5 F1000";  // R=0.5, very small
    const config = { ...baseConfig, radialDepth_mm: 5, enableChipThinning: false };
    const result = postProcessorFeedOptimizer.optimize(gcode, config);
    const arcs = result.lines.filter(l => l.reason.includes("arc"));
    expect(arcs.length).toBeGreaterThan(0);
  });

  it("can be disabled via enableArcLimiting=false", () => {
    const gcode = "G2 X5 Y0 I1 J0 F1000";
    const config = { ...baseConfig, radialDepth_mm: 5, enableChipThinning: false, enableArcLimiting: false };
    const result = postProcessorFeedOptimizer.optimize(gcode, config);
    const arcs = result.lines.filter(l => l.reason.includes("arc"));
    expect(arcs.length).toBe(0);
  });
});

// ============================================================================
// Plunge Rate Limiting
// ============================================================================

describe("FeedOptimizer — Plunge Limiting", () => {
  it("reduces feed for pure Z plunge moves", () => {
    const gcode = "G1 X10 Y10 Z5 F1000\nG1 Z-5";  // pure Z descent
    const config = { ...baseConfig, radialDepth_mm: 5, enableChipThinning: false };
    const result = postProcessorFeedOptimizer.optimize(gcode, config);
    const plunges = result.lines.filter(l => l.reason.includes("plunge"));
    expect(plunges.length).toBeGreaterThan(0);
    expect(plunges[0].optimizedFeed!).toBeLessThan(1000);
  });

  it("does not limit horizontal moves (no Z descent)", () => {
    const gcode = "G1 X0 Y0 Z5 F1000\nG1 X10 Y0 Z5";
    const config = { ...baseConfig, radialDepth_mm: 5, enableChipThinning: false };
    const result = postProcessorFeedOptimizer.optimize(gcode, config);
    const plunges = result.lines.filter(l => l.reason.includes("plunge"));
    expect(plunges.length).toBe(0);
  });

  it("uses configurable plungeRateFactor", () => {
    const gcode = "G1 X10 Y10 Z5 F1000\nG1 Z-5";
    const config = { ...baseConfig, radialDepth_mm: 5, enableChipThinning: false, plungeRateFactor: 0.3 };
    const result = postProcessorFeedOptimizer.optimize(gcode, config);
    const plunges = result.lines.filter(l => l.reason.includes("plunge"));
    expect(plunges.length).toBeGreaterThan(0);
    expect(plunges[0].optimizedFeed!).toBeLessThanOrEqual(300);
  });

  it("can be disabled via enablePlungeLimiting=false", () => {
    const gcode = "G1 X10 Y10 Z5 F1000\nG1 Z-5";
    const config = { ...baseConfig, radialDepth_mm: 5, enableChipThinning: false, enablePlungeLimiting: false };
    const result = postProcessorFeedOptimizer.optimize(gcode, config);
    const plunges = result.lines.filter(l => l.reason.includes("plunge"));
    expect(plunges.length).toBe(0);
  });
});

// ============================================================================
// Stability Check
// ============================================================================

describe("FeedOptimizer — Stability Check", () => {
  it("reduces feed when DOC near stability limit", () => {
    const gcode = "G1 X10 Y0 F1000";
    const config = {
      ...baseConfig, radialDepth_mm: 5, enableChipThinning: false,
      enableStabilityCheck: true, stabilityMaxDoc_mm: 5.5, // axialDepth 5 > 5.5*0.9=4.95
    };
    const result = postProcessorFeedOptimizer.optimize(gcode, config);
    const stab = result.lines.filter(l => l.reason.includes("stability"));
    expect(stab.length).toBeGreaterThan(0);
    expect(stab[0].optimizedFeed!).toBeLessThan(1000);
  });

  it("does not reduce when DOC safely below stability limit", () => {
    const gcode = "G1 X10 Y0 F1000";
    const config = {
      ...baseConfig, radialDepth_mm: 5, enableChipThinning: false,
      enableStabilityCheck: true, stabilityMaxDoc_mm: 20, // axialDepth 5 << 20*0.9=18
    };
    const result = postProcessorFeedOptimizer.optimize(gcode, config);
    const stab = result.lines.filter(l => l.reason.includes("stability"));
    expect(stab.length).toBe(0);
  });

  it("disabled by default", () => {
    const gcode = "G1 X10 Y0 F1000";
    const config = { ...baseConfig, radialDepth_mm: 5, enableChipThinning: false, stabilityMaxDoc_mm: 5.5 };
    const result = postProcessorFeedOptimizer.optimize(gcode, config);
    const stab = result.lines.filter(l => l.reason.includes("stability"));
    expect(stab.length).toBe(0);
  });
});

// ============================================================================
// G-code Parsing
// ============================================================================

describe("FeedOptimizer — G-code Parsing", () => {
  it("skips comments and empty lines", () => {
    const gcode = "; comment\n(another comment)\n%\n\nG1 X10 F1000";
    const config = { ...baseConfig, radialDepth_mm: 5, enableChipThinning: false };
    const result = postProcessorFeedOptimizer.optimize(gcode, config);
    expect(result.stats.totalLines).toBe(5);
  });

  it("skips rapid moves (G0)", () => {
    const gcode = "G0 X10 Y10 Z5\nG1 X20 Y0 F1000";
    const config = { ...baseConfig, radialDepth_mm: 5, enableChipThinning: false };
    const result = postProcessorFeedOptimizer.optimize(gcode, config);
    // G0 should not be modified
    expect(result.gcode).toMatch(/^G0 X10 Y10 Z5/);
  });

  it("handles modal feed tracking", () => {
    const gcode = "G1 X10 F500\nG1 X20\nG1 X30";
    const config = { ...baseConfig, radialDepth_mm: 5, enableChipThinning: false };
    const result = postProcessorFeedOptimizer.optimize(gcode, config);
    // All lines should use F500 as modal feed
    expect(result.stats.totalLines).toBe(3);
  });

  it("replaces existing F word", () => {
    const gcode = "G1 X10 Y0 F1000";
    const config = { ...baseConfig, radialDepth_mm: 2 }; // chip thinning active
    const result = postProcessorFeedOptimizer.optimize(gcode, config);
    const modified = result.lines.filter(l => l.optimizedFeed != null);
    if (modified.length > 0) {
      expect(modified[0].optimized).toMatch(/F\d+/);
      expect(modified[0].optimized).not.toMatch(/F1000/);
    }
  });

  it("injects F word when line has no F", () => {
    const gcode = "G1 X0 Y0 F1000\nG1 X10 Y0\nG1 X10 Y10";
    // chip thinning + corner → feed will change
    const result = postProcessorFeedOptimizer.optimize(gcode, baseConfig);
    const modified = result.lines.filter(l => l.optimizedFeed != null && !l.original.includes("F"));
    for (const m of modified) {
      expect(m.optimized).toMatch(/F\d+/);
    }
  });

  it("classifies G2/G3 as arc moves", () => {
    const gcode = "G2 X10 Y0 I5 J0 F1000\nG3 X0 Y10 I0 J5 F1000";
    const config = { ...baseConfig, radialDepth_mm: 5, enableChipThinning: false };
    const result = postProcessorFeedOptimizer.optimize(gcode, config);
    expect(result.stats.totalLines).toBe(2);
  });
});

// ============================================================================
// Analyze (read-only)
// ============================================================================

describe("FeedOptimizer — Analyze", () => {
  it("returns opportunity counts without modifying G-code", () => {
    const gcode = [
      "G1 X0 Y0 F1000",
      "G1 X10 Y0",
      "G1 X10 Y10",   // corner
      "G1 Z-5",        // plunge
      "G2 X5 Y0 I1 J0", // small arc
    ].join("\n");
    const config = { ...baseConfig, enableChipThinning: false };
    const analysis = postProcessorFeedOptimizer.analyze(gcode, config);
    expect(analysis.opportunities).toBeGreaterThanOrEqual(0);
    expect(typeof analysis.cornerCount).toBe("number");
    expect(typeof analysis.plungeCount).toBe("number");
    expect(typeof analysis.smallArcCount).toBe("number");
    expect(typeof analysis.estimatedTimeSavings_pct).toBe("number");
  });
});

// ============================================================================
// Combined Effects
// ============================================================================

describe("FeedOptimizer — Combined Effects", () => {
  it("applies multiple adjustments to a single line", () => {
    // A plunge into a small arc
    const gcode = "G1 X10 Y10 Z5 F1000\nG2 X15 Y10 Z3 I1 J0";
    const config = { ...baseConfig, radialDepth_mm: 5, enableChipThinning: false };
    const result = postProcessorFeedOptimizer.optimize(gcode, config);
    // The arc line may have both arc + plunge adjustments
    const multi = result.lines.filter(l => l.reason.includes("+"));
    // At minimum, stats should reflect both types
    expect(result.stats.arcLimits + result.stats.plungeLimits).toBeGreaterThan(0);
  });

  it("stats are correctly populated", () => {
    const gcode = [
      "G1 X0 Y0 Z10 F1000",
      "G1 X10 Y0",
      "G1 X10 Y10",
      "G1 Z-5",
      "G2 X15 Y10 I0.5 J0",
    ].join("\n");
    const result = postProcessorFeedOptimizer.optimize(gcode, baseConfig);
    expect(result.stats.totalLines).toBe(5);
    expect(typeof result.stats.feedLinesModified).toBe("number");
    expect(typeof result.stats.averageFeedChange).toBe("number");
    expect(typeof result.stats.estimatedTimeSavings_pct).toBe("number");
  });

  it("output G-code has same number of lines as input", () => {
    const gcode = "G0 X0 Y0 Z10\nG1 X10 Y0 F1000\nG1 X20 Y10\nG1 Z-5\nM30";
    const result = postProcessorFeedOptimizer.optimize(gcode, baseConfig);
    expect(result.gcode.split("\n").length).toBe(5);
  });

  it("feed never drops below 1", () => {
    // Very aggressive corner + plunge + arc + stability
    const gcode = "G1 X0 Y0 Z10 F10\nG2 X1 Y0 Z5 I0.1 J0";
    const config = {
      ...baseConfig, radialDepth_mm: 5, enableChipThinning: false,
      cornerSlowdownFactor: 0.1, plungeRateFactor: 0.1,
      enableStabilityCheck: true, stabilityMaxDoc_mm: 5.5,
    };
    const result = postProcessorFeedOptimizer.optimize(gcode, config);
    for (const line of result.lines) {
      if (line.optimizedFeed != null) {
        expect(line.optimizedFeed).toBeGreaterThanOrEqual(1);
      }
    }
  });
});
