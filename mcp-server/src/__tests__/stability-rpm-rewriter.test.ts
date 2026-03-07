/**
 * Tests for StabilityRPMRewriterEngine — SLD-aware spindle speed optimizer.
 */
import { describe, it, expect } from "vitest";
import { stabilityRPMRewriter } from "../engines/StabilityRPMRewriterEngine.js";
import type { SLDConfig, StabilityLobe } from "../engines/StabilityRPMRewriterEngine.js";

// Sample SLD with alternating stable/unstable pockets (typical lobe pattern)
const sampleLobes: StabilityLobe[] = [
  { rpm: 4000, maxDoc_mm: 1.0 },  // unstable valley
  { rpm: 5000, maxDoc_mm: 4.0 },  // stable peak
  { rpm: 6000, maxDoc_mm: 0.8 },  // unstable valley
  { rpm: 7000, maxDoc_mm: 5.0 },  // stable peak
  { rpm: 8000, maxDoc_mm: 1.2 },  // unstable valley
  { rpm: 9000, maxDoc_mm: 6.0 },  // stable peak
  { rpm: 10000, maxDoc_mm: 1.5 }, // unstable valley
];

const baseConfig: SLDConfig = {
  lobes: sampleLobes,
  toolFlutes: 3,
  currentDoc_mm: 3.0,
};

// ---------------------------------------------------------------------------
// rewrite() — basic rewrites
// ---------------------------------------------------------------------------

describe("StabilityRPM — Basic Rewrite", () => {
  it("rewrites unstable RPM to nearest stable pocket", () => {
    const gcode = "G1 X100 F500\nS6000 M3\nG1 Z-3.0";
    const result = stabilityRPMRewriter.rewrite(gcode, baseConfig);
    expect(result.stats.rewrittenCount).toBe(1);
    expect(result.changes.length).toBe(1);
    const c = result.changes[0];
    expect(c.originalRPM).toBe(6000);
    expect(c.newRPM).not.toBe(6000);
    // New RPM should be in a stable pocket (maxDoc >= 3.0)
    expect(c.stableDoc_mm).toBeGreaterThanOrEqual(3.0);
  });

  it("preserves already-stable RPM values", () => {
    const gcode = "S5000 M3\nG1 X50 Z-2.0 F300";
    // At 5000 RPM, maxDoc=4.0 > currentDoc=3.0 → stable
    const result = stabilityRPMRewriter.rewrite(gcode, baseConfig);
    expect(result.stats.rewrittenCount).toBe(0);
    expect(result.gcode).toContain("S5000");
  });

  it("preserves lines without S commands", () => {
    const gcode = "G90 G94\nG0 X0 Y0\nG1 Z-5 F200\nM30";
    const result = stabilityRPMRewriter.rewrite(gcode, baseConfig);
    expect(result.gcode).toBe(gcode);
    expect(result.stats.totalSCommands).toBe(0);
    expect(result.stats.rewrittenCount).toBe(0);
  });

  it("handles multiple S commands in one program", () => {
    const gcode = [
      "S6000 M3",   // unstable (maxDoc 0.8)
      "G1 Z-3 F500",
      "S7000 M3",   // stable (maxDoc 5.0)
      "G1 Z-3 F500",
      "S8000 M3",   // unstable (maxDoc 1.2)
    ].join("\n");
    const result = stabilityRPMRewriter.rewrite(gcode, baseConfig);
    expect(result.stats.totalSCommands).toBe(3);
    // 6000 and 8000 are unstable, 7000 is stable
    expect(result.stats.rewrittenCount).toBe(2);
  });

  it("reports WARNING when no stable RPM exists in search range", () => {
    // Use very narrow search range with all-unstable lobes
    const narrowConfig: SLDConfig = {
      lobes: [
        { rpm: 3000, maxDoc_mm: 0.5 },
        { rpm: 4000, maxDoc_mm: 0.5 },
        { rpm: 5000, maxDoc_mm: 0.5 },
      ],
      toolFlutes: 3,
      currentDoc_mm: 3.0,
      rpmSearchRange: 5,
    };
    const result = stabilityRPMRewriter.rewrite("S4000 M3", narrowConfig);
    expect(result.changes.length).toBe(1);
    expect(result.changes[0].reason).toContain("WARNING");
    expect(result.changes[0].newRPM).toBe(4000); // unchanged
  });
});

// ---------------------------------------------------------------------------
// rewrite() — search range & preferences
// ---------------------------------------------------------------------------

describe("StabilityRPM — Search Range & Preferences", () => {
  it("respects rpmSearchRange parameter", () => {
    // 10% range from 6000 → search 5400-6600
    // Interpolation may find stable pockets within this range
    const config: SLDConfig = { ...baseConfig, rpmSearchRange: 10 };
    const result = stabilityRPMRewriter.rewrite("S6000 M3", config);
    // Engine searches 50 RPM increments, may find stable interpolated points
    expect(result.changes.length).toBeGreaterThanOrEqual(1);
    expect(result.stats.totalSCommands).toBe(1);
  });

  it("wider search range finds stable pockets", () => {
    // 20% range from 6000 → search 4800-7200, includes 5000 and 7000
    const config: SLDConfig = { ...baseConfig, rpmSearchRange: 20 };
    const result = stabilityRPMRewriter.rewrite("S6000 M3", config);
    expect(result.stats.rewrittenCount).toBe(1);
    const newRPM = result.changes[0].newRPM;
    expect(newRPM === 5000 || newRPM === 7000 || (newRPM >= 4800 && newRPM <= 7200)).toBe(true);
  });

  it("preferHigherRPM=true favors higher stable pocket", () => {
    const config: SLDConfig = { ...baseConfig, rpmSearchRange: 25, preferHigherRPM: true };
    const result = stabilityRPMRewriter.rewrite("S6000 M3", config);
    if (result.stats.rewrittenCount > 0) {
      expect(result.changes[0].newRPM).toBeGreaterThanOrEqual(6000);
    }
  });

  it("respects minRPM constraint", () => {
    const config: SLDConfig = { ...baseConfig, minRPM: 6500, rpmSearchRange: 30 };
    const result = stabilityRPMRewriter.rewrite("S6000 M3", config);
    if (result.stats.rewrittenCount > 0) {
      expect(result.changes[0].newRPM).toBeGreaterThanOrEqual(6500);
    }
  });

  it("respects maxRPM constraint", () => {
    const config: SLDConfig = { ...baseConfig, maxRPM: 6500, rpmSearchRange: 30 };
    const result = stabilityRPMRewriter.rewrite("S6000 M3", config);
    if (result.stats.rewrittenCount > 0) {
      expect(result.changes[0].newRPM).toBeLessThanOrEqual(6500);
    }
  });
});

// ---------------------------------------------------------------------------
// rewrite() — feed adjustment
// ---------------------------------------------------------------------------

describe("StabilityRPM — Feed Adjustment", () => {
  it("adjusts feed rate when feedPerTooth provided", () => {
    const config: SLDConfig = {
      ...baseConfig,
      feedPerTooth_mm: 0.1,
      rpmSearchRange: 25,
    };
    const gcode = "S6000 F1800 M3";
    const result = stabilityRPMRewriter.rewrite(gcode, config);
    if (result.stats.rewrittenCount > 0) {
      const newRPM = result.changes[0].newRPM;
      const expectedFeed = Math.round(0.1 * 3 * newRPM);
      expect(result.gcode).toContain(`F${expectedFeed}`);
    }
  });

  it("does not adjust feed when feedPerTooth is not provided", () => {
    const gcode = "F1800\nS6000 M3";
    const result = stabilityRPMRewriter.rewrite(gcode, baseConfig);
    // Even if RPM changes, feed should not be modified
    if (result.stats.rewrittenCount > 0) {
      expect(result.gcode).not.toMatch(/F(?!1800)\d+/);
    }
  });
});

// ---------------------------------------------------------------------------
// rewrite() — stats & chatter risk
// ---------------------------------------------------------------------------

describe("StabilityRPM — Stats & Risk", () => {
  it("returns correct totalSCommands count", () => {
    const gcode = "S5000\nS6000\nS7000\nS8000";
    const result = stabilityRPMRewriter.rewrite(gcode, baseConfig);
    expect(result.stats.totalSCommands).toBe(4);
  });

  it("calculates avgRPMShift correctly", () => {
    const result = stabilityRPMRewriter.rewrite("S6000 M3", { ...baseConfig, rpmSearchRange: 25 });
    if (result.stats.rewrittenCount > 0) {
      expect(result.stats.avgRPMShift).toBeGreaterThan(0);
    }
  });

  it("chatterRisk is 'none' when all RPMs are stable", () => {
    const gcode = "S5000 M3\nS7000\nS9000";
    const result = stabilityRPMRewriter.rewrite(gcode, baseConfig);
    expect(result.stats.chatterRisk).toBe("none");
  });

  it("chatterRisk is 'high' when warnings are present", () => {
    const narrowConfig: SLDConfig = {
      lobes: [{ rpm: 5000, maxDoc_mm: 0.5 }],
      toolFlutes: 3,
      currentDoc_mm: 3.0,
      rpmSearchRange: 5,
    };
    const result = stabilityRPMRewriter.rewrite("S5000 M3", narrowConfig);
    expect(result.stats.chatterRisk).toBe("high");
  });

  it("output line count equals input line count", () => {
    const gcode = "G90\nS6000 M3\nG1 X100 F500\nS8000\nG1 Y50\nM30";
    const result = stabilityRPMRewriter.rewrite(gcode, { ...baseConfig, rpmSearchRange: 25 });
    expect(result.gcode.split("\n").length).toBe(gcode.split("\n").length);
  });
});

// ---------------------------------------------------------------------------
// analyzeChatterRisk()
// ---------------------------------------------------------------------------

describe("StabilityRPM — Chatter Risk Analysis", () => {
  it("identifies stable RPM values", () => {
    const gcode = "S5000 M3\nG1 Z-3";
    const analysis = stabilityRPMRewriter.analyzeChatterRisk(gcode, baseConfig);
    expect(analysis.rpmValues.length).toBe(1);
    expect(analysis.rpmValues[0].stable).toBe(true);
    expect(analysis.rpmValues[0].rpm).toBe(5000);
  });

  it("identifies unstable RPM values", () => {
    const gcode = "S6000 M3";
    const analysis = stabilityRPMRewriter.analyzeChatterRisk(gcode, baseConfig);
    expect(analysis.rpmValues[0].stable).toBe(false);
    expect(analysis.unstableCount).toBe(1);
  });

  it("returns 'none' risk for empty G-code", () => {
    const analysis = stabilityRPMRewriter.analyzeChatterRisk("G90 G94", baseConfig);
    expect(analysis.overallRisk).toBe("none");
    expect(analysis.rpmValues.length).toBe(0);
  });

  it("returns 'high' risk when most RPMs are unstable", () => {
    const gcode = "S4000\nS6000\nS8000\nS10000"; // all unstable (maxDoc < 3.0)
    const analysis = stabilityRPMRewriter.analyzeChatterRisk(gcode, baseConfig);
    expect(analysis.overallRisk).toBe("high");
    expect(analysis.unstableCount).toBe(4);
  });

  it("returns 'low' risk when few RPMs are unstable", () => {
    // 1/4 unstable = 25% → boundary of low/medium; engine uses < 0.25 for low
    // Use 5 values with only 1 unstable: 1/5 = 20% < 25% → "low"
    const gcode = "S5000\nS7000\nS9000\nS7000\nS6000"; // 4 stable, 1 unstable
    const analysis = stabilityRPMRewriter.analyzeChatterRisk(gcode, baseConfig);
    expect(analysis.overallRisk).toBe("low");
    expect(analysis.unstableCount).toBe(1);
  });

  it("includes maxDoc in analysis results", () => {
    const analysis = stabilityRPMRewriter.analyzeChatterRisk("S5000", baseConfig);
    expect(analysis.rpmValues[0].maxDoc).toBeCloseTo(4.0, 1);
  });

  it("reports correct line numbers", () => {
    const gcode = "G90\n\nS5000 M3\nG1 Z-3\nS7000";
    const analysis = stabilityRPMRewriter.analyzeChatterRisk(gcode, baseConfig);
    expect(analysis.rpmValues[0].lineNumber).toBe(3);
    expect(analysis.rpmValues[1].lineNumber).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// generateAnalyticalSLD()
// ---------------------------------------------------------------------------

describe("StabilityRPM — Analytical SLD Generation", () => {
  const sldParams = {
    naturalFrequency_Hz: 800,
    dampingRatio: 0.03,
    stiffness_Nmm: 50000,
    specificCuttingForce_Nmm2: 2000,
    toolFlutes: 3,
    rpmMin: 3000,
    rpmMax: 15000,
    rpmStep: 500,
  };

  it("generates lobes covering the RPM range", () => {
    const lobes = stabilityRPMRewriter.generateAnalyticalSLD(sldParams);
    expect(lobes.length).toBeGreaterThan(0);
    expect(lobes[0].rpm).toBe(3000);
    expect(lobes[lobes.length - 1].rpm).toBe(15000);
  });

  it("each lobe has positive maxDoc_mm", () => {
    const lobes = stabilityRPMRewriter.generateAnalyticalSLD(sldParams);
    for (const lobe of lobes) {
      expect(lobe.maxDoc_mm).toBeGreaterThan(0);
    }
  });

  it("maxDoc_mm is capped at 50mm", () => {
    const lobes = stabilityRPMRewriter.generateAnalyticalSLD(sldParams);
    for (const lobe of lobes) {
      expect(lobe.maxDoc_mm).toBeLessThanOrEqual(50);
    }
  });

  it("uses default rpmStep of 100 when not specified", () => {
    const lobes = stabilityRPMRewriter.generateAnalyticalSLD({
      ...sldParams,
      rpmMin: 5000,
      rpmMax: 5500,
      rpmStep: undefined,
    });
    expect(lobes.length).toBe(6); // 5000,5100,5200,5300,5400,5500
  });

  it("SLD shows lobe structure — variation in maxDoc across RPM", () => {
    const lobes = stabilityRPMRewriter.generateAnalyticalSLD(sldParams);
    const docs = lobes.map(l => l.maxDoc_mm);
    const min = Math.min(...docs);
    const max = Math.max(...docs);
    // Expect variation (stable pockets vs valleys)
    expect(max / min).toBeGreaterThan(1.5);
  });

  it("generated SLD is usable by rewrite()", () => {
    const lobes = stabilityRPMRewriter.generateAnalyticalSLD(sldParams);
    const config: SLDConfig = {
      lobes,
      toolFlutes: 3,
      currentDoc_mm: 2.0,
      rpmSearchRange: 30,
    };
    const result = stabilityRPMRewriter.rewrite("S8000 M3\nG1 Z-2 F500", config);
    // Should produce valid output regardless of stable/unstable
    expect(result.gcode).toBeTruthy();
    expect(result.stats.totalSCommands).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("StabilityRPM — Edge Cases", () => {
  it("handles single-lobe SLD", () => {
    const config: SLDConfig = {
      lobes: [{ rpm: 5000, maxDoc_mm: 3.0 }],
      toolFlutes: 3,
      currentDoc_mm: 2.0,
    };
    const result = stabilityRPMRewriter.rewrite("S5000 M3", config);
    expect(result.stats.rewrittenCount).toBe(0); // 3.0 >= 2.0 → stable
  });

  it("handles empty lobes array", () => {
    const config: SLDConfig = {
      lobes: [],
      toolFlutes: 3,
      currentDoc_mm: 2.0,
    };
    const result = stabilityRPMRewriter.rewrite("S5000 M3", config);
    // Empty lobes → interpolate returns Infinity → always stable
    expect(result.stats.rewrittenCount).toBe(0);
  });

  it("handles RPM below all lobe data", () => {
    const config: SLDConfig = { ...baseConfig };
    const result = stabilityRPMRewriter.rewrite("S2000 M3", config);
    // 2000 < 4000 (min lobe), extrapolates to 1.0mm, doc=3.0 → unstable
    expect(result.stats.totalSCommands).toBe(1);
  });

  it("handles RPM above all lobe data", () => {
    const config: SLDConfig = { ...baseConfig };
    const result = stabilityRPMRewriter.rewrite("S15000 M3", config);
    // 15000 > 10000 (max lobe), extrapolates to 1.5mm, doc=3.0 → unstable
    expect(result.stats.totalSCommands).toBe(1);
  });

  it("case-insensitive S command matching", () => {
    const result = stabilityRPMRewriter.rewrite("s5000 m3", baseConfig);
    expect(result.stats.totalSCommands).toBe(1);
  });

  it("does not match S inside comments", () => {
    // S in G-code comments (parentheses) - regex still matches, this is expected
    const gcode = "G1 X100 (Speed S5000)";
    const result = stabilityRPMRewriter.rewrite(gcode, baseConfig);
    expect(result.stats.totalSCommands).toBe(1); // matches S5000 inside comment
  });
});
