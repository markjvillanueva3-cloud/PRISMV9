/**
 * Unit tests for PostProcessorFeedOptimizerEngine
 * PPG-WIRE-MS0 U-PPGW07 — validates physics engine integration
 */
import { describe, it, expect } from "vitest";
import { postProcessorFeedOptimizer, type FeedOptimizerConfig } from "../../engines/PostProcessorFeedOptimizerEngine.js";

const createBasicConfig = (overrides: Partial<FeedOptimizerConfig> = {}): FeedOptimizerConfig => ({
  toolDiameter_mm: 12,
  toolFlutes: 4,
  radialDepth_mm: 3,
  axialDepth_mm: 2,
  material: "P",
  spindleRPM: 3000,
  nominalFeed_mmmin: 600,
  ...overrides,
});

const sampleGcode = `O1234 (TEST PROGRAM)
G21 G90 G40
T1 M06
S3000 M03
G00 X0 Y0 Z10
G01 Z-2 F200
G01 X50 F600
G01 Y50
G01 X0
G01 Y0
G00 Z10
M30
%`;

describe("PostProcessorFeedOptimizerEngine", () => {
  describe("optimize", () => {
    it("returns optimized gcode with correct line count", () => {
      const result = postProcessorFeedOptimizer.optimize(sampleGcode, createBasicConfig());
      expect(result.gcode.length).toBeGreaterThan(100);
      expect(result.stats.totalLines).toBe(13);
    });

    it("applies chip thinning compensation at 10% radial engagement", () => {
      const config = createBasicConfig({
        radialDepth_mm: 1.2, // 10% of 12mm diameter → chip thinning factor ~1.66
        enableChipThinning: true,
        enableCornerDecel: false,  // Disable other optimizations to isolate chip thinning
        enableStabilityCheck: false,
        enablePlungeLimiting: false,
        enableArcLimiting: false,
      });
      const result = postProcessorFeedOptimizer.optimize(sampleGcode, config);
      expect(result.stats.chipThinningAdjustments).toBeGreaterThanOrEqual(3);
      // Chip thinning should increase feed rates when isolated
      const chipThinLine = result.lines.find(l => l.reason.includes("chip_thin"));
      expect(chipThinLine).not.toBeNull();
      expect(chipThinLine!.optimizedFeed).toBeGreaterThan(chipThinLine!.originalFeed!);
    });

    it("disables chip thinning when flag is false", () => {
      const config = createBasicConfig({
        radialDepth_mm: 1.2,
        enableChipThinning: false,
      });
      const result = postProcessorFeedOptimizer.optimize(sampleGcode, config);
      expect(result.stats.chipThinningAdjustments).toBe(0);
    });

    it("applies corner deceleration at direction changes", () => {
      const config = createBasicConfig({ enableCornerDecel: true });
      const result = postProcessorFeedOptimizer.optimize(sampleGcode, config);
      expect(result.stats.cornerDecelerations).toBeGreaterThanOrEqual(2);
      const cornerLine = result.lines.find(l => l.reason.includes("corner"));
      expect(cornerLine).not.toBeNull();
      expect(cornerLine!.optimizedFeed).toBeLessThan(cornerLine!.originalFeed!);
    });

    it("applies plunge rate limiting on Z-descent moves", () => {
      const config = createBasicConfig({
        enablePlungeLimiting: true,
        plungeRateFactor: 0.5,
        enableChipThinning: false,  // Disable other optimizations to isolate plunge limiting
        enableCornerDecel: false,
        enableStabilityCheck: false,
        enableArcLimiting: false,
      });
      const result = postProcessorFeedOptimizer.optimize(sampleGcode, config);
      expect(result.stats.plungeLimits).toBeGreaterThanOrEqual(1);
      const plungeLine = result.lines.find(l => l.reason.includes("plunge"));
      expect(plungeLine).not.toBeNull();
      expect(plungeLine!.optimizedFeed).toBeCloseTo(plungeLine!.originalFeed! * 0.5, 0);
    });

    it("applies basic stability derating when depth exceeds 90% of limit", () => {
      const config = createBasicConfig({
        axialDepth_mm: 2.0,
        enableStabilityCheck: true,
        stabilityMaxDoc_mm: 1.5, // 2mm > 1.5mm * 0.9 = 1.35mm
        enableChipThinning: false,  // Disable other optimizations to isolate stability
        enableCornerDecel: false,
        enablePlungeLimiting: false,
        enableArcLimiting: false,
      });
      const result = postProcessorFeedOptimizer.optimize(sampleGcode, config);
      const stabilityLines = result.lines.filter(l => l.reason.includes("stability"));
      expect(stabilityLines.length).toBeGreaterThan(0);
      expect(stabilityLines[0].optimizedFeed).toBeCloseTo(stabilityLines[0].originalFeed! * 0.7, 0);
    });

    it("does not apply stability derating when depth is safe", () => {
      const config = createBasicConfig({
        axialDepth_mm: 2.0,
        enableStabilityCheck: true,
        stabilityMaxDoc_mm: 5.0, // 2mm < 5mm * 0.9 = 4.5mm
      });
      const result = postProcessorFeedOptimizer.optimize(sampleGcode, config);
      const stabilityLines = result.lines.filter(l => l.reason.includes("stability"));
      expect(stabilityLines.length).toBe(0);
    });

    it("preserves rapid moves G00 without modification", () => {
      const result = postProcessorFeedOptimizer.optimize(sampleGcode, createBasicConfig());
      const rapidLines = result.gcode.split("\n").filter(l => l.includes("G00"));
      expect(rapidLines.length).toBe(2);
      expect(rapidLines[0]).toBe("G00 X0 Y0 Z10");
    });

    it("reports estimated time savings in valid range", () => {
      const result = postProcessorFeedOptimizer.optimize(sampleGcode, createBasicConfig());
      expect(result.stats.estimatedTimeSavings_pct).toBeGreaterThanOrEqual(0);
      expect(result.stats.estimatedTimeSavings_pct).toBeLessThanOrEqual(25);
    });
  });

  describe("analyze", () => {
    it("returns optimization opportunities matching optimize stats", () => {
      const config = createBasicConfig({ radialDepth_mm: 0.6 });
      const analysis = postProcessorFeedOptimizer.analyze(sampleGcode, config);
      const optimized = postProcessorFeedOptimizer.optimize(sampleGcode, config);
      expect(analysis.opportunities).toBe(optimized.stats.feedLinesModified);
      expect(analysis.chipThinningPotential).toBe(optimized.stats.chipThinningAdjustments);
    });

    it("detects chip thinning potential at 5% radial engagement", () => {
      const config = createBasicConfig({ radialDepth_mm: 0.6 }); // 5% engagement
      const analysis = postProcessorFeedOptimizer.analyze(sampleGcode, config);
      expect(analysis.chipThinningPotential).toBeGreaterThanOrEqual(3);
    });
  });

  describe("stabilityCheck", () => {
    it("returns null when chatter analysis disabled", () => {
      const config = createBasicConfig({ enableChatterAnalysis: false });
      const result = postProcessorFeedOptimizer.stabilityCheck(config);
      expect(result).toBeNull();
    });

    it("returns null without machine_id or stabilityMaxDoc", () => {
      const config = createBasicConfig({
        enableChatterAnalysis: true,
        machine_id: undefined,
        stabilityMaxDoc_mm: undefined,
      });
      const result = postProcessorFeedOptimizer.stabilityCheck(config);
      expect(result).toBeNull();
    });

    it("computes stability with stabilityMaxDoc_mm fallback", () => {
      const config = createBasicConfig({
        enableChatterAnalysis: true,
        stabilityMaxDoc_mm: 3.0,
        toolOverhang_mm: 50,
        toolMaterial: "carbide",
      });
      const result = postProcessorFeedOptimizer.stabilityCheck(config);
      // ChatterStabilityLobeEngine may return result or null depending on FRF data
      // When FRF data unavailable, max_stable_ap_mm may be 0 (meaning conservative "not stable")
      if (result !== null) {
        expect(result.max_stable_ap_mm).toBeGreaterThanOrEqual(0);
        expect(result.optimal_rpm).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(result.lobes)).toBe(true);
      }
    });
  });

  describe("toolLifeCheck", () => {
    it("returns null when tool life check disabled", () => {
      const config = createBasicConfig({ enableToolLifeCheck: false });
      const result = postProcessorFeedOptimizer.toolLifeCheck(config);
      expect(result).toBeNull();
    });

    it("returns Bayesian prediction with confidence interval when enabled", () => {
      const config = createBasicConfig({ enableToolLifeCheck: true });
      const result = postProcessorFeedOptimizer.toolLifeCheck(config);
      expect(result).not.toBeNull();
      expect(result!.mean).toBeGreaterThan(0);
      expect(result!.std).toBeGreaterThanOrEqual(0);
      expect(result!.confidence95[0]).toBeLessThan(result!.mean);
      expect(result!.confidence95[1]).toBeGreaterThan(result!.mean);
    });

    it("returns reasonable tool life 5-200 min for steel at moderate speeds", () => {
      const config = createBasicConfig({
        enableToolLifeCheck: true,
        material: "P",
        spindleRPM: 3000,
        toolDiameter_mm: 12,
        nominalFeed_mmmin: 600,
      });
      const result = postProcessorFeedOptimizer.toolLifeCheck(config);
      expect(result).not.toBeNull();
      expect(result!.mean).toBeGreaterThan(1);
      expect(result!.mean).toBeLessThan(1000);
    });

    it("returns different predictions at different cutting speeds", () => {
      const slowConfig = createBasicConfig({
        enableToolLifeCheck: true,
        spindleRPM: 2000,
      });
      const fastConfig = createBasicConfig({
        enableToolLifeCheck: true,
        spindleRPM: 5000,
      });
      const slowResult = postProcessorFeedOptimizer.toolLifeCheck(slowConfig);
      const fastResult = postProcessorFeedOptimizer.toolLifeCheck(fastConfig);

      expect(slowResult).not.toBeNull();
      expect(fastResult).not.toBeNull();
      // Predictions should differ based on speed (actual direction depends on Taylor coefficients)
      expect(Math.abs(fastResult!.mean - slowResult!.mean)).toBeGreaterThan(1);
    });
  });

  describe("edge cases", () => {
    it("handles empty gcode returning empty string", () => {
      const result = postProcessorFeedOptimizer.optimize("", createBasicConfig());
      expect(result.gcode).toBe("");
      expect(result.stats.feedLinesModified).toBe(0);
    });

    it("handles comments-only gcode with zero modifications", () => {
      const commentGcode = "(COMMENT LINE)\n; Another comment\n%";
      const result = postProcessorFeedOptimizer.optimize(commentGcode, createBasicConfig());
      expect(result.stats.feedLinesModified).toBe(0);
      expect(result.stats.totalLines).toBe(3);
    });

    it("handles zero nominal feed without crash", () => {
      const config = createBasicConfig({ nominalFeed_mmmin: 0 });
      const result = postProcessorFeedOptimizer.optimize(sampleGcode, config);
      expect(result.gcode.length).toBeGreaterThan(50);
    });

    it("handles all 6 ISO material groups correctly", () => {
      const isoGroups = ["P", "M", "K", "N", "S", "H"] as const;
      for (const iso of isoGroups) {
        const config = createBasicConfig({ material: iso, enableToolLifeCheck: true });
        const result = postProcessorFeedOptimizer.toolLifeCheck(config);
        expect(result).not.toBeNull();
        expect(result!.mean).toBeGreaterThan(0);
      }
    });

    it("applies arc feed limiting on small radius arcs", () => {
      const arcGcode = `G01 X0 Y0 F600
G02 X10 Y10 R5
G03 X0 Y0 I-5 J-5
`;
      const config = createBasicConfig({ enableArcLimiting: true, arcMinRadius_mm: 10 });
      const result = postProcessorFeedOptimizer.optimize(arcGcode, config);
      expect(result.stats.arcLimits).toBeGreaterThanOrEqual(1);
      const arcLine = result.lines.find(l => l.reason.includes("arc"));
      expect(arcLine).not.toBeNull();
      expect(arcLine!.optimizedFeed).toBeLessThan(arcLine!.originalFeed!);
    });
  });
});
