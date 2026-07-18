/**
 * PostProcessorFeedOptimizerEngine.test.ts
 *
 * Reference-value / algebraic-invariant coverage for
 * PostProcessorFeedOptimizerEngine (ECHO-ULTIMATE-ROADMAP Track A priority).
 *
 * VERIFIED symbols (read engine src, no fabrication):
 *   exported singleton : postProcessorFeedOptimizer (PostProcessorFeedOptimizerEngineImpl)
 *   public methods     : optimize(gcode, config) => FeedOptimizeResult
 *                        analyze(gcode, config)  => { opportunities, ... }
 *                        stabilityCheck(config)  => ChatterResult | null
 *                        toolLifeCheck(config)   => PredictionResult | null
 *   exported types     : FeedOptimizerConfig, FeedOptimizedLine, FeedOptimizeResult
 *
 * Tests encode *intent* (R9):
 *   - Chip thinning: empirical table from source -- ae/D=0.10->1.66x, ae/D=0.20->1.27x,
 *     capped at maxFeedIncrease (default 1.5).
 *   - Corner decel: formula reduction = 1 - (angle/180) * (1 - cornerFactor).
 *   - Plunge: factor 0.5 applied when Z descends steeply (dz/dxy > 2).
 *   - Arc: factor = max(0.3, radius/arcMinR) applied to arcs below arcMinR (default 2 mm).
 *   - Stability gate: feed * 0.70 when axialDepth > stabilityMaxDoc * 0.9.
 *   - Feed reconstruction: modified lines carry the new F word; unchanged lines pass through.
 *   - Stats accounting: counts match actual modified-line populations.
 */

import { describe, it, expect } from "vitest";
import {
  postProcessorFeedOptimizer,
  type FeedOptimizerConfig,
  type FeedOptimizeResult,
} from "../engines/PostProcessorFeedOptimizerEngine.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid config -- chip thinning OFF so other effects are isolated. */
function cfg(overrides: Partial<FeedOptimizerConfig> = {}): FeedOptimizerConfig {
  return {
    toolDiameter_mm: 10,
    toolFlutes: 4,
    radialDepth_mm: 5,   // ae/D = 0.50 => chip-thin factor = 1.0 (no boost)
    axialDepth_mm: 3,
    material: "P",
    spindleRPM: 3000,
    nominalFeed_mmmin: 1000,
    enableChipThinning: true,
    enableCornerDecel: true,
    enableArcLimiting: true,
    enablePlungeLimiting: true,
    enableStabilityCheck: false,
    enableChatterAnalysis: false,
    enableToolLifeCheck: false,
    ...overrides,
  };
}

/** Extract the F-word value from a G-code line, or null if absent. */
function extractF(line: string): number | null {
  const m = line.match(/F(\d+\.?\d*)/i);
  return m ? parseFloat(m[1]) : null;
}

// ---------------------------------------------------------------------------
// 1. Chip Thinning -- reference-value assertions from embedded table
// ---------------------------------------------------------------------------

describe("PostProcessorFeedOptimizerEngine -- chip thinning", () => {
  it("ae/D=0.10 => factor 1.66, clamped by maxFeedIncrease=1.5 (default) => feed 1500", () => {
    // ae/D = 1 / 10 = 0.10 => factor 1.66, but maxIncrease default=1.5 caps it
    const c = cfg({ toolDiameter_mm: 10, radialDepth_mm: 1 });
    const gcode = "G1 X10 Y0 F1000";
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    // expected: round(1000 * min(1.66, 1.5)) = round(1500) = 1500
    expect(extractF(res.gcode)).toBe(1500);
    expect(res.stats.chipThinningAdjustments).toBe(1);
  });

  it("ae/D=0.20 => factor 1.27, below maxFeedIncrease=1.5 => feed 1270", () => {
    // ae/D = 2/10 = 0.20 => factor exactly 1.27 (table hit)
    const c = cfg({ toolDiameter_mm: 10, radialDepth_mm: 2 });
    const gcode = "G1 X10 Y0 F1000";
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    expect(extractF(res.gcode)).toBe(1270);
    expect(res.stats.chipThinningAdjustments).toBe(1);
  });

  it("ae/D=0.50 => factor 1.0 => no chip-thin boost, feed unchanged", () => {
    // radialDepth=5, toolDiameter=10 => ratio 0.5 => table returns 1.0
    const c = cfg({ toolDiameter_mm: 10, radialDepth_mm: 5 });
    const gcode = "G1 X10 F1000";
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    // factor 1.0 => no boost => feed unchanged
    expect(extractF(res.gcode)).toBe(1000);
    expect(res.stats.chipThinningAdjustments).toBe(0);
  });

  it("ae/D=0.25 => factor 1.18 => feed 1180", () => {
    const c = cfg({ toolDiameter_mm: 8, radialDepth_mm: 2 }); // 2/8=0.25
    const gcode = "G1 X5 F1000";
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    expect(extractF(res.gcode)).toBe(1180);
  });

  it("disabling chip thinning leaves feed at nominal", () => {
    const c = cfg({ toolDiameter_mm: 10, radialDepth_mm: 1, enableChipThinning: false });
    const gcode = "G1 X10 F1000";
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    expect(extractF(res.gcode)).toBe(1000);
    expect(res.stats.chipThinningAdjustments).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Corner Deceleration -- algebraic invariant
//    reduction = 1 - (angle/180) * (1 - cornerFactor), default cornerFactor=0.5
// ---------------------------------------------------------------------------

describe("PostProcessorFeedOptimizerEngine -- corner deceleration", () => {
  it("90-degree corner with default cornerFactor=0.5 => reduction=0.75 => feed 750", () => {
    // Straight path: (0,0)->(10,0)->(10,10) gives angle between segments:
    //   v1=(10,0), v2=(0,10) => dot=0 => angle=90 deg
    // reduction = 1 - (90/180)*(1-0.5) = 1 - 0.5*0.5 = 0.75
    // ae/D = 5/10 = 0.5 => no chip thin; start at nominalFeed=1000
    // adjusted = 1000 * 0.75 = 750
    const c = cfg({ enableChipThinning: false, enablePlungeLimiting: false });
    const gcode = [
      "G1 X0 Y0 F1000",   // prev position (feed modal set)
      "G1 X10 Y0",         // current move -- corner detected ahead
      "G1 X10 Y10",        // next move
    ].join("\n");
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    // line 2 (index 1) is the corner line
    const cornerLine = res.gcode.split("\n")[1];
    const f = extractF(cornerLine);
    expect(f).toBe(750);
    expect(res.stats.cornerDecelerations).toBeGreaterThanOrEqual(1);
  });

  it("180-degree (straight-through) direction produces no corner decel (angle<=30)", () => {
    // (0,0)->(5,0)->(10,0): angle=0, no decel triggered (threshold is >30 deg)
    const c = cfg({ enableChipThinning: false, enablePlungeLimiting: false });
    const gcode = [
      "G1 X0 Y0 F1000",
      "G1 X5 Y0",
      "G1 X10 Y0",
    ].join("\n");
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    expect(res.stats.cornerDecelerations).toBe(0);
  });

  it("custom cornerSlowdownFactor=0.3 produces deeper deceleration at 90 deg", () => {
    // reduction = 1 - (90/180)*(1-0.3) = 1 - 0.5*0.7 = 0.65 => feed=650
    const c = cfg({ enableChipThinning: false, enablePlungeLimiting: false, cornerSlowdownFactor: 0.3 });
    const gcode = [
      "G1 X0 Y0 F1000",
      "G1 X10 Y0",
      "G1 X10 Y10",
    ].join("\n");
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    const cornerLine = res.gcode.split("\n")[1];
    expect(extractF(cornerLine)).toBe(650);
  });
});

// ---------------------------------------------------------------------------
// 3. Plunge Rate Limiting
//    Applied when: z moves down AND (dxy < 0.01 OR dz/dxy > 2.0)
//    Factor = plungeRateFactor (default 0.5)
// ---------------------------------------------------------------------------

describe("PostProcessorFeedOptimizerEngine -- plunge rate limiting", () => {
  it("pure Z-down plunge (no XY) applies factor 0.5 => feed 500", () => {
    // ae/D=0.5 => no chip thin; no corners; pure plunge
    const c = cfg({ enableChipThinning: false, enableCornerDecel: false });
    const gcode = [
      "G1 Z0 F1000",   // prev Z=0
      "G1 Z-10",       // descend: dz=10, dxy~0 => plunge triggered
    ].join("\n");
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    const plungeLine = res.gcode.split("\n")[1];
    expect(extractF(plungeLine)).toBe(500);
    expect(res.stats.plungeLimits).toBe(1);
  });

  it("custom plungeRateFactor=0.3 applies correctly => feed 300", () => {
    const c = cfg({
      enableChipThinning: false,
      enableCornerDecel: false,
      plungeRateFactor: 0.3,
    });
    const gcode = ["G1 Z0 F1000", "G1 Z-5"].join("\n");
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    const plungeLine = res.gcode.split("\n")[1];
    expect(extractF(plungeLine)).toBe(300);
  });

  it("Z-up move (retract) does NOT apply plunge limiting", () => {
    const c = cfg({ enableChipThinning: false, enableCornerDecel: false });
    const gcode = ["G1 Z-10 F1000", "G1 Z0"].join("\n");
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    expect(res.stats.plungeLimits).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Arc Feed Limiting
//    factor = max(0.3, arcRadius / arcMinR), applied when arcRadius < arcMinR
//    default arcMinR=2.0
// ---------------------------------------------------------------------------

describe("PostProcessorFeedOptimizerEngine -- arc feed limiting", () => {
  it("G2 arc with R=1.0 (< arcMinR=2) => factor max(0.3,1/2)=0.5 => feed 500", () => {
    const c = cfg({ enableChipThinning: false, enableCornerDecel: false, enablePlungeLimiting: false });
    const gcode = ["G1 X0 Y0 F1000", "G2 X2 Y0 R1.0"].join("\n");
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    const arcLine = res.gcode.split("\n")[1];
    expect(extractF(arcLine)).toBe(500);
    expect(res.stats.arcLimits).toBe(1);
  });

  it("G3 arc with R=0.5 => factor max(0.3, 0.5/2)=max(0.3,0.25)=0.3 => feed 300", () => {
    const c = cfg({
      enableChipThinning: false, enableCornerDecel: false, enablePlungeLimiting: false,
    });
    const gcode = ["G1 X0 Y0 F1000", "G3 X1 Y0 R0.5"].join("\n");
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    const arcLine = res.gcode.split("\n")[1];
    expect(extractF(arcLine)).toBe(300);
  });

  it("G2 arc with R=3.0 (> arcMinR=2) => no arc limiting, feed unchanged", () => {
    const c = cfg({ enableChipThinning: false, enableCornerDecel: false, enablePlungeLimiting: false });
    const gcode = ["G1 X0 Y0 F1000", "G2 X6 Y0 R3.0"].join("\n");
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    expect(res.stats.arcLimits).toBe(0);
  });

  it("arc with IJ center offset: radius = sqrt(I^2+J^2)", () => {
    // I=0, J=1 => radius=1 < arcMinR=2 => factor=0.5 => feed 500
    const c = cfg({ enableChipThinning: false, enableCornerDecel: false, enablePlungeLimiting: false });
    const gcode = ["G1 X0 Y0 F1000", "G2 X0 Y2 I0 J1"].join("\n");
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    const arcLine = res.gcode.split("\n")[1];
    expect(extractF(arcLine)).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// 5. Stability Gate (SLD-based)
//    Applied when axialDepth > stabilityMaxDoc * 0.9 => feed *= 0.70
// ---------------------------------------------------------------------------

describe("PostProcessorFeedOptimizerEngine -- stability gate", () => {
  it("axialDepth > stabilityMaxDoc*0.9 => feed * 0.70 => feed 700", () => {
    const c = cfg({
      enableChipThinning: false,
      enableCornerDecel: false,
      enablePlungeLimiting: false,
      enableStabilityCheck: true,
      axialDepth_mm: 5.0,
      stabilityMaxDoc_mm: 5.0,  // 5.0 > 5.0*0.9=4.5 => triggered
    });
    const gcode = "G1 X10 F1000";
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    expect(extractF(res.gcode)).toBe(700);
  });

  it("axialDepth <= stabilityMaxDoc*0.9 => no stability reduction", () => {
    const c = cfg({
      enableChipThinning: false,
      enableCornerDecel: false,
      enablePlungeLimiting: false,
      enableStabilityCheck: true,
      axialDepth_mm: 3.0,
      stabilityMaxDoc_mm: 5.0,  // 3.0 < 5.0*0.9=4.5 => not triggered
    });
    const gcode = "G1 X10 F1000";
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    expect(extractF(res.gcode)).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// 6. G-code passthrough + stats accounting
// ---------------------------------------------------------------------------

describe("PostProcessorFeedOptimizerEngine -- passthrough and stats", () => {
  it("rapid moves (G0) are never modified", () => {
    const c = cfg({ enableChipThinning: false });
    const gcode = "G0 X100 Y50 F5000";
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    expect(res.gcode).toBe("G0 X100 Y50 F5000");
    expect(res.stats.feedLinesModified).toBe(0);
  });

  it("comments and blank lines pass through unchanged", () => {
    const c = cfg({ enableChipThinning: false });
    const gcode = "(PROGRAM START)\n\n; comment\nG1 X5 F1000\n%";
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    const outputLines = res.gcode.split("\n");
    expect(outputLines[0]).toBe("(PROGRAM START)");
    expect(outputLines[1]).toBe("");
    expect(outputLines[2]).toBe("; comment");
    expect(outputLines[4]).toBe("%");
  });

  it("totalLines accounts for every input line including blanks", () => {
    const c = cfg();
    const gcode = "G1 X0 F1000\nG1 X5\n";
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    // "G1 X0 F1000\nG1 X5\n".split("\n") => 3 elements (trailing empty)
    expect(res.stats.totalLines).toBe(3);
  });

  it("lines array contains ONLY modified lines (reason != empty)", () => {
    const c = cfg({ toolDiameter_mm: 10, radialDepth_mm: 1 }); // ae/D=0.1 => chip-thin boost
    const gcode = ["G1 X0 F1000", "G1 X10", "G0 X0"].join("\n");
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    // G1 X10 is modified (chip thin boost), G0 is not feed
    expect(res.lines.every(l => l.reason !== "")).toBe(true);
    expect(res.stats.feedLinesModified).toBe(res.lines.length);
  });

  it("F word injected on line without explicit F when feed changed", () => {
    // ae/D=0.10 => factor 1.66, capped 1.5 => feed 1500
    // G1 X10 has no explicit F -- engine must inject it
    const c = cfg({ toolDiameter_mm: 10, radialDepth_mm: 1, enableCornerDecel: false });
    const gcode = ["G1 X0 Y0 F1000", "G1 X10"].join("\n");
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    const secondLine = res.gcode.split("\n")[1];
    // Should now carry F1500
    expect(secondLine).toContain("F1500");
  });

  it("F word REPLACED (not duplicated) when line already carries it", () => {
    const c = cfg({ toolDiameter_mm: 10, radialDepth_mm: 1, enableCornerDecel: false });
    const gcode = "G1 X10 F1000";
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    // Only one F word in the output line
    const fMatches = (res.gcode.match(/F\d+/gi) ?? []).length;
    expect(fMatches).toBe(1);
    expect(extractF(res.gcode)).toBe(1500);
  });
});

// ---------------------------------------------------------------------------
// 7. analyze() -- thin wrapper over optimize(), returns opportunity summary
// ---------------------------------------------------------------------------

describe("PostProcessorFeedOptimizerEngine -- analyze()", () => {
  it("returns zero opportunities for a G0-only program", () => {
    const c = cfg();
    const analysis = postProcessorFeedOptimizer.analyze("G0 X0 Y0 Z50", c);
    expect(analysis.opportunities).toBe(0);
    expect(analysis.chipThinningPotential).toBe(0);
    expect(analysis.cornerCount).toBe(0);
    expect(analysis.plungeCount).toBe(0);
  });

  it("reports chipThinningPotential matching optimize() stat", () => {
    const c = cfg({ toolDiameter_mm: 10, radialDepth_mm: 1, enableCornerDecel: false });
    const gcode = ["G1 X0 F1000", "G1 X5", "G1 X10"].join("\n");
    const analysis = postProcessorFeedOptimizer.analyze(gcode, c);
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    expect(analysis.chipThinningPotential).toBe(res.stats.chipThinningAdjustments);
    expect(analysis.opportunities).toBe(res.stats.feedLinesModified);
  });
});

// ---------------------------------------------------------------------------
// 8. stabilityCheck() -- returns null when disabled
// ---------------------------------------------------------------------------

describe("PostProcessorFeedOptimizerEngine -- stabilityCheck()", () => {
  it("returns null when enableChatterAnalysis is false", () => {
    const c = cfg({ enableChatterAnalysis: false });
    expect(postProcessorFeedOptimizer.stabilityCheck(c)).toBeNull();
  });

  it("returns null when enableChatterAnalysis=true but no machine_id or stabilityMaxDoc", () => {
    // Both conditions are required per engine source (line 311)
    const c = cfg({
      enableChatterAnalysis: true,
      machine_id: undefined,
      stabilityMaxDoc_mm: undefined,
    });
    expect(postProcessorFeedOptimizer.stabilityCheck(c)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 9. toolLifeCheck() -- returns null when disabled
// ---------------------------------------------------------------------------

describe("PostProcessorFeedOptimizerEngine -- toolLifeCheck()", () => {
  it("returns null when enableToolLifeCheck is false", () => {
    const c = cfg({ enableToolLifeCheck: false });
    expect(postProcessorFeedOptimizer.toolLifeCheck(c)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 10. Adversarial inputs
// ---------------------------------------------------------------------------

describe("PostProcessorFeedOptimizerEngine -- adversarial", () => {
  it("[adversarial] empty G-code string returns empty gcode and zeroed stats", () => {
    const c = cfg();
    const res = postProcessorFeedOptimizer.optimize("", c);
    expect(res.gcode).toBe("");
    expect(res.stats.totalLines).toBe(1); // "".split("\n") => [""]
    expect(res.stats.feedLinesModified).toBe(0);
    expect(res.lines).toHaveLength(0);
  });

  it("[adversarial] zero toolDiameter_mm => chip thinning factor is 1.0 (no divide-by-zero)", () => {
    // _computeChipThinningFactor guards: D<=0 => return 1.0
    const c = cfg({ toolDiameter_mm: 0, radialDepth_mm: 0, enableCornerDecel: false });
    const gcode = "G1 X10 F1000";
    expect(() => postProcessorFeedOptimizer.optimize(gcode, c)).not.toThrow();
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    expect(res.stats.chipThinningAdjustments).toBe(0);
    expect(extractF(res.gcode)).toBe(1000); // no boost
  });

  it("[adversarial] nominalFeed of 1 => floor guard keeps adjusted==modal => line not rewritten", () => {
    // arc R=0.001 (tiny) => arcFactor = max(0.3, 0.001/2) = 0.3
    // adjustedFeed = round(1 * 0.3) = round(0.3) = 0 => floor clamps to 1
    // feedChanged = |1 - 1| > 0.5 => false => line passes through UNCHANGED
    // This proves the floor guard does not introduce a sub-1 F word anywhere.
    const c = cfg({
      nominalFeed_mmmin: 1,
      enableChipThinning: false,
      enableCornerDecel: false,
      enablePlungeLimiting: false,
    });
    const gcode = ["G1 X0 Y0 F1", "G2 X1 Y0 R0.001"].join("\n");
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    // No feed modification written (floor == modal)
    expect(res.stats.feedLinesModified).toBe(0);
    // No F0 or F-negative in entire output
    const allFValues = [...res.gcode.matchAll(/F(\d+\.?\d*)/gi)].map(m => parseFloat(m[1]));
    expect(allFValues.every(v => v >= 1)).toBe(true);
  });

  it("[adversarial] combined chip-thin + plunge: both factors stack multiplicatively", () => {
    // ae/D=0.20 => factor=1.27; then pure Z-plunge => *0.5
    // Line 1: G1 Z0 F1000 -- feed move, chip-thin applies => 1270; prevZ set to 0
    // Line 2: G1 Z-10     -- chip-thin again (1270) then plunge *0.5 => 635
    // => round(1000 * 1.27 * 0.5) = round(635) = 635
    const c = cfg({
      toolDiameter_mm: 10,
      radialDepth_mm: 2, // ae/D=0.20
      enableCornerDecel: false,
    });
    // Set prev Z first, then descend
    const gcode = ["G1 Z0 F1000", "G1 Z-10"].join("\n");
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    const plungeLine = res.gcode.split("\n")[1];
    // chip-thin then plunge: 1000*1.27*0.5 = 635
    expect(extractF(plungeLine)).toBe(635);
    // Both lines are feed moves so chip-thin fires on each (2 total)
    expect(res.stats.chipThinningAdjustments).toBe(2);
    expect(res.stats.plungeLimits).toBe(1);
  });

  it("[adversarial] G-code with only comments produces no feed modifications", () => {
    const c = cfg();
    const gcode = "(TOOL CHANGE)\n(FLOOD ON)\n(PROGRAM END)";
    const res = postProcessorFeedOptimizer.optimize(gcode, c);
    expect(res.stats.feedLinesModified).toBe(0);
    expect(res.lines).toHaveLength(0);
    expect(res.gcode).toBe(gcode);
  });
});
