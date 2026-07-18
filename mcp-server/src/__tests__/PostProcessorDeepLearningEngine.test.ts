/**
 * PostProcessorDeepLearningEngine Tests
 *
 * Covers:
 * - recognizePatterns: operation + strategy classification, feature boundaries, anomaly detection
 * - predictFeedOptimization: chip-load physics, Kienzle constraints, deterministic math
 * - classifyController: pattern scoring + migration suggestions
 * - estimateCycleTime: XYZ geometry integration, tool-change accounting
 * - scorePostQuality: weighted dimension scoring, safety compliance, best-practices
 * - analyze: composite result + neural_confidence bounds
 *
 * Happy path + >=3 failure / adversarial / edge-case modes per method.
 */

import { describe, it, expect } from "vitest";
import {
  PostProcessorDeepLearningEngine,
  postProcessorDeepLearningEngine,
  type DeepLearningInput,
} from "../engines/PostProcessorDeepLearningEngine.js";

// \u2500\u2500 Shared fixtures \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

const FANUC_GCODE = `O1000
G90 G94 G17
G53 Z0
T01M06
G54
S3000 M03
G43 H01
G00 X0 Y0
G01 Z-5 F500
G01 X50 F1000
G01 Y50 F1000
G01 X0 F1000
G00 Z100
M05
M09
M30`;

const DRILLING_GCODE = `G28 Z0
T02M06
G54
S2000 M03
G43 H02
G00 X10 Y10
G81 Z-20 R5 F200 (DRILL)
G00 X20 Y10
G81 Z-20 R5 F200
G80
G28 Z0
M30`;

const HAAS_GCODE = `G28 G91 Z0
G17 G90 G94
T01M06
G54
G43 H01
G187 P3 E0.005
M51
S12000 M03
G00 X0 Y0
G01 Z-2 F800
G01 X100 F3000
M05
M30`;

const HEIDENHAIN_GCODE = `BLK FORM 0.1 Z X0 Y0 Z0
BLK FORM 0.2 X100 Y100 Z50
TOOL CALL 1 Z S3000
CYCL DEF 1 PECKING
L X10 Y10 Z-20 FMAX
M30`;

// Missing safe start, missing M30, missing work offset, tool change without retract
const POOR_GCODE = `G00 X0 Y0
G01 X50 F500
G01 Y50
T01M06
G01 X100`;

const engine = postProcessorDeepLearningEngine;

// \u2500\u2500 recognizePatterns \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

describe("PostProcessorDeepLearningEngine", () => {
  describe("recognizePatterns", () => {
    it("detects drilling operation from G81 canned cycle", () => {
      const result = engine.recognizePatterns({ gcode: DRILLING_GCODE });
      expect(result.operation_type).toBe("drilling");
      expect(result.operation_confidence).toBeGreaterThan(0);
      expect(result.operation_confidence).toBeLessThanOrEqual(1);
    });

    it("confidence values are in [0, 1] for typical G-code", () => {
      const result = engine.recognizePatterns({ gcode: FANUC_GCODE });
      expect(result.operation_confidence).toBeGreaterThanOrEqual(0);
      expect(result.operation_confidence).toBeLessThanOrEqual(1);
      expect(result.strategy_confidence).toBeGreaterThanOrEqual(0);
      expect(result.strategy_confidence).toBeLessThanOrEqual(1);
    });

    it("embedding is a 64-element array with values in [0, 1]", () => {
      const result = engine.recognizePatterns({ gcode: FANUC_GCODE });
      expect(result.embedding).toHaveLength(64);
      for (const v of result.embedding) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    });

    it("embedding is deterministic (cached on same prefix)", () => {
      const gcode = FANUC_GCODE;
      const r1 = engine.recognizePatterns({ gcode });
      const r2 = engine.recognizePatterns({ gcode });
      expect(r1.embedding).toEqual(r2.embedding);
    });

    it("ADVERSARIAL: detects critical rapid-into-material anomaly (G00 with negative Z)", () => {
      const dangerousGcode = `G28 Z0
G00 X0 Y0
G00 Z-50
G01 X50 F500
M30`;
      const result = engine.recognizePatterns({ gcode: dangerousGcode });
      const rapid = result.anomalies.find(a => a.type === "rapid_negative_z");
      expect(rapid).not.toBeNull();
      expect(rapid!.severity).toBe("critical");
      expect(rapid!.description).toContain("Rapid move to negative Z");
    });

    it("detects high feed rate anomaly above 10000 as warning", () => {
      const highFeedGcode = `G28 Z0
G01 X50 F15000
G01 Y50 F15000
M30`;
      const result = engine.recognizePatterns({ gcode: highFeedGcode });
      const highFeed = result.anomalies.filter(a => a.type === "high_feed");
      expect(highFeed.length).toBeGreaterThan(0);
      expect(highFeed[0].severity).toBe("warning");
    });

    it("detects missing retract before tool change as critical anomaly", () => {
      // POOR_GCODE has T01M06 directly after a G01 -- no G28/G30/G53 on the prior line
      const result = engine.recognizePatterns({ gcode: POOR_GCODE });
      const retractMiss = result.anomalies.find(a => a.type === "missing_retract");
      expect(retractMiss).not.toBeNull();
      expect(retractMiss!.severity).toBe("critical");
    });

    it("FAILURE: empty G-code falls back to unknown operation with score >= 0.5", () => {
      const result = engine.recognizePatterns({ gcode: "" });
      expect(result.operation_type).toBe("unknown");
      expect(result.operation_confidence).toBeGreaterThanOrEqual(0.5);
    });

    it("detects tool change feature boundaries with valid line ranges", () => {
      const result = engine.recognizePatterns({ gcode: DRILLING_GCODE });
      // DRILLING_GCODE has one T02M06 -- expect at least one feature boundary
      expect(result.detected_features.length).toBeGreaterThan(0);
      for (const f of result.detected_features) {
        expect(f.start_line).toBeGreaterThanOrEqual(0);
        expect(f.end_line).toBeGreaterThanOrEqual(f.start_line);
        expect(f.confidence).toBeCloseTo(0.85, 2);
      }
    });

    it("ADVERSARIAL: HSM G-code with G05.1 sets embedding index 23 to 1", () => {
      const hsmGcode = `G28 Z0
G05.1 Q1
G01 X50 F5000
M30`;
      const result = engine.recognizePatterns({ gcode: hsmGcode });
      // embedding[23] = HSM indicator per generateGCodeEmbedding
      expect(result.embedding[23]).toBe(1);
    });

    it("5-axis G-code sets embedding index 24 to 1", () => {
      const fiveAxisGcode = `G28 Z0
G43.4 H01
G01 X50 F1000
M30`;
      const result = engine.recognizePatterns({ gcode: fiveAxisGcode });
      expect(result.embedding[24]).toBe(1);
    });
  });

  // \u2500\u2500 predictFeedOptimization \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  describe("predictFeedOptimization", () => {
    it("returns array of results for G-code with feed lines", () => {
      const results = engine.predictFeedOptimization({
        gcode: FANUC_GCODE,
        material_iso: "P",
        tool_diameter_mm: 10,
        spindle_rpm: 3000,
      });
      expect(results.length).toBeGreaterThan(0);
    });

    it("optimization_factor = optimized_feed / original_feed (algebraic invariant)", () => {
      const results = engine.predictFeedOptimization({
        gcode: FANUC_GCODE,
        material_iso: "P",
        tool_diameter_mm: 10,
        spindle_rpm: 3000,
      });
      for (const r of results) {
        expect(r.optimization_factor).toBeCloseTo(r.optimized_feed / r.original_feed, 5);
      }
    });

    it("estimated_time_savings_pct is non-negative", () => {
      const results = engine.predictFeedOptimization({
        gcode: FANUC_GCODE,
        material_iso: "P",
        tool_diameter_mm: 10,
        spindle_rpm: 3000,
      });
      for (const r of results) {
        expect(r.estimated_time_savings_pct).toBeGreaterThanOrEqual(0);
      }
    });

    it("confidence is in (0, 1] for all results", () => {
      const results = engine.predictFeedOptimization({
        gcode: FANUC_GCODE,
        material_iso: "N",
        tool_diameter_mm: 16,
        spindle_rpm: 8000,
      });
      for (const r of results) {
        expect(r.confidence).toBeGreaterThan(0);
        expect(r.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("FAILURE: no feed lines in G-code returns empty array", () => {
      const noFeedGcode = `G00 X0 Y0
G00 Z100
M30`;
      const results = engine.predictFeedOptimization({ gcode: noFeedGcode });
      expect(results).toEqual([]);
    });

    it("FAILURE: very low chip load triggers upward optimization", () => {
      // spindle=100, flutes=4 -> chipLoad = F/400
      // F=50 -> chipLoad=0.125mm, idealChipLoad=10*0.01=0.1
      // chipLoad(0.125) > idealChipLoad*0.5(0.05) but also > ideal*1.5(0.15)? No: 0.125 < 0.15
      // Actually use spindle=100, F=5: chipLoad=5/400=0.0125 < 0.05 -> push UP
      const lowChipGcode = `G01 X50 F5\nM30`;
      const results = engine.predictFeedOptimization({
        gcode: lowChipGcode,
        material_iso: "P",
        tool_diameter_mm: 10,
        spindle_rpm: 100,
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].optimized_feed).toBeGreaterThan(results[0].original_feed);
      expect(results[0].reasoning.length).toBeGreaterThan(0);
    });

    it("Kienzle cutting-force constraint is included in physics_constraints", () => {
      const results = engine.predictFeedOptimization({
        gcode: FANUC_GCODE,
        material_iso: "S",
        tool_diameter_mm: 8,
        spindle_rpm: 2000,
      });
      expect(results.length).toBeGreaterThan(0);
      const kienzle = results[0].physics_constraints.find(c => c.constraint.includes("Kienzle"));
      expect(kienzle).not.toBeNull();
      expect(kienzle!.limit).toBeGreaterThan(0);
    });

    it("ADVERSARIAL: optimized feed is always clamped to max machine feed (15000)", () => {
      // Very large tool + low original feed + high spindle -> chip load very low -> push up beyond 15000
      const gcodeHighSpin = `G01 X50 F200\nM30`;
      const results = engine.predictFeedOptimization({
        gcode: gcodeHighSpin,
        material_iso: "N",
        tool_diameter_mm: 50,
        spindle_rpm: 30000,
      });
      for (const r of results) {
        expect(r.optimized_feed).toBeLessThanOrEqual(15000);
      }
    });

    it("samples at most 10 feed lines from a long program", () => {
      const manyFeeds = Array.from({ length: 20 }, (_, i) => `G01 X${i} F${500 + i * 10}`).join("\n");
      const results = engine.predictFeedOptimization({
        gcode: manyFeeds,
        material_iso: "P",
      });
      expect(results.length).toBeLessThanOrEqual(10);
    });
  });

  // \u2500\u2500 classifyController \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  describe("classifyController", () => {
    it("detects Fanuc from O-number + M98 patterns", () => {
      // Use explicit Fanuc markers
      const fanucMarkerGcode = `O1000\n#100=5\nM98 P0050\nG54.1 P1\nT01M06\nM30`;
      const result = engine.classifyController({ gcode: fanucMarkerGcode });
      expect(result.detected_controller).toBe("fanuc");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("detects Haas from G187 / M51 / M52 signatures", () => {
      const result = engine.classifyController({ gcode: HAAS_GCODE });
      expect(result.detected_controller).toBe("haas");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("detects Heidenhain from BLK FORM / TOOL CALL / CYCL DEF", () => {
      const result = engine.classifyController({ gcode: HEIDENHAIN_GCODE });
      expect(result.detected_controller).toBe("heidenhain");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("confidence is in [0, 1] for all detected controllers and alternatives", () => {
      const result = engine.classifyController({ gcode: FANUC_GCODE });
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      for (const alt of result.alternative_controllers) {
        expect(alt.probability).toBeGreaterThanOrEqual(0);
        expect(alt.probability).toBeLessThanOrEqual(1);
      }
    });

    it("FAILURE: empty G-code gives zero confidence (no pattern matches)", () => {
      const result = engine.classifyController({ gcode: "" });
      expect(result.confidence).toBe(0);
    });

    it("Fanuc-to-Siemens migration suggestion carries correct complexity and changes", () => {
      // Inject both Fanuc and Siemens markers
      const mixedGcode = `O1000\n#100=5\nM98 P50\nCYCLE800\nTRAORI\nG642\nM30`;
      const result = engine.classifyController({ gcode: mixedGcode });
      const siemensMigration = result.migration_suggestions.find(m => m.target === "siemens");
      if (siemensMigration) {
        expect(siemensMigration.complexity).toBe("complex");
        expect(siemensMigration.changes_required.length).toBeGreaterThan(0);
      }
    });

    it("Fanuc-to-Haas migration suggestion carries trivial complexity", () => {
      const mixedGcode = `O1000\n#100=5\nM98 P50\nG187 P3\nT01M06\nM30`;
      const result = engine.classifyController({ gcode: mixedGcode });
      const haasMigration = result.migration_suggestions.find(m => m.target === "haas");
      if (haasMigration) {
        expect(haasMigration.complexity).toBe("trivial");
      }
    });

    it("ADVERSARIAL: multi-controller G-code -- top confidence >= all alternatives", () => {
      // Both Haas and Fanuc markers present
      const mixedGcode = `O1000\nM98 P50\nG187 P3\nM51\nG54.1P5\nT01M06\nM30`;
      const result = engine.classifyController({ gcode: mixedGcode });
      for (const alt of result.alternative_controllers) {
        expect(result.confidence).toBeGreaterThanOrEqual(alt.probability);
      }
    });

    it("dialect_features list has at least one entry with a feature name string", () => {
      const result = engine.classifyController({ gcode: HAAS_GCODE });
      expect(result.dialect_features.length).toBeGreaterThan(0);
      expect(typeof result.dialect_features[0].feature).toBe("string");
      expect(result.dialect_features[0].feature.length).toBeGreaterThan(0);
    });
  });

  // \u2500\u2500 estimateCycleTime \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  describe("estimateCycleTime", () => {
    it("returns positive estimated_time_sec for a real cutting program", () => {
      const result = engine.estimateCycleTime({ gcode: FANUC_GCODE });
      expect(result.estimated_time_sec).toBeGreaterThan(0);
    });

    it("confidence interval: lower <= estimated <= upper", () => {
      const result = engine.estimateCycleTime({ gcode: FANUC_GCODE });
      expect(result.confidence_interval.lower).toBeLessThanOrEqual(result.estimated_time_sec);
      expect(result.confidence_interval.upper).toBeGreaterThanOrEqual(result.estimated_time_sec);
    });

    it("confidence interval width is 30% of estimated time (pm 15%, rounded)", () => {
      const result = engine.estimateCycleTime({ gcode: FANUC_GCODE });
      const width = result.confidence_interval.upper - result.confidence_interval.lower;
      const expected = Math.round(result.estimated_time_sec * 0.3);
      // Allow +-2 seconds due to rounding
      expect(Math.abs(width - expected)).toBeLessThanOrEqual(2);
    });

    it("comparison.savings_pct is exactly 15 (engine constant)", () => {
      const result = engine.estimateCycleTime({ gcode: FANUC_GCODE });
      expect(result.comparison.savings_pct).toBe(15);
    });

    it("optimized_time_sec < baseline_time_sec (15% savings)", () => {
      const result = engine.estimateCycleTime({ gcode: FANUC_GCODE });
      expect(result.comparison.optimized_time_sec).toBeLessThan(result.comparison.baseline_time_sec);
    });

    it("FAILURE: G-code with no moves produces zero estimated time", () => {
      const noMoveGcode = `M03 S3000\nM05\nM30`;
      const result = engine.estimateCycleTime({ gcode: noMoveGcode });
      expect(result.estimated_time_sec).toBe(0);
    });

    it("tool change contributes exactly 8 seconds per M06 to breakdown", () => {
      // Two M06 commands, no moves -> 2 * 8 = 16 sec tool changes
      const twoChanges = `M06\nM06\nM30`;
      const result = engine.estimateCycleTime({ gcode: twoChanges });
      const tcBreakdown = result.breakdown.find(b => b.category === "Tool changes");
      expect(tcBreakdown).not.toBeNull();
      expect(tcBreakdown!.time_sec).toBe(16);
    });

    it("ADVERSARIAL: large program produces deterministic result across two calls", () => {
      const lines = Array.from({ length: 500 }, (_, i) => `G01 X${i} Y0 Z0 F1000`).join("\n");
      const r1 = engine.estimateCycleTime({ gcode: lines });
      const r2 = engine.estimateCycleTime({ gcode: lines });
      expect(r1.estimated_time_sec).toBe(r2.estimated_time_sec);
    });

    it("higher feed rate reduces feed move time monotonically", () => {
      const slow = `G28 Z0\nG01 X100 F500\nM30`;
      const fast = `G28 Z0\nG01 X100 F2000\nM30`;
      const rSlow = engine.estimateCycleTime({ gcode: slow });
      const rFast = engine.estimateCycleTime({ gcode: fast });
      const feedSlow = rSlow.breakdown.find(b => b.category === "Feed moves");
      const feedFast = rFast.breakdown.find(b => b.category === "Feed moves");
      expect(feedFast!.time_sec).toBeLessThan(feedSlow!.time_sec);
    });
  });

  // \u2500\u2500 scorePostQuality \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  describe("scorePostQuality", () => {
    it("overall_score is in [0, 100]", () => {
      const result = engine.scorePostQuality({ gcode: FANUC_GCODE });
      expect(result.overall_score).toBeGreaterThanOrEqual(0);
      expect(result.overall_score).toBeLessThanOrEqual(100);
    });

    it("FANUC_GCODE scores higher than POOR_GCODE (ordering invariant)", () => {
      const good = engine.scorePostQuality({ gcode: FANUC_GCODE });
      const poor = engine.scorePostQuality({ gcode: POOR_GCODE });
      expect(good.overall_score).toBeGreaterThan(poor.overall_score);
    });

    it("produces exactly 5 named scoring dimensions", () => {
      const result = engine.scorePostQuality({ gcode: FANUC_GCODE });
      expect(result.dimensions).toHaveLength(5);
      const names = result.dimensions.map(d => d.name);
      expect(names).toContain("Safety");
      expect(names).toContain("Best Practices");
      expect(names).toContain("Machine Optimization");
      expect(names).toContain("Cross-CAM Features");
      expect(names).toContain("Readability");
    });

    it("all dimension scores in [0, 100]", () => {
      const result = engine.scorePostQuality({ gcode: FANUC_GCODE });
      for (const d of result.dimensions) {
        expect(d.score).toBeGreaterThanOrEqual(0);
        expect(d.score).toBeLessThanOrEqual(100);
      }
    });

    it("FAILURE: missing safe-start retract penalizes safety dimension score", () => {
      const noRetract = `T01M06\nG01 X50 F500\nM30`;
      const withRetract = `G28 Z0\nT01M06\nG01 X50 F500\nM30`;
      const r1 = engine.scorePostQuality({ gcode: noRetract });
      const r2 = engine.scorePostQuality({ gcode: withRetract });
      const safety1 = r1.dimensions.find(d => d.name === "Safety")!;
      const safety2 = r2.dimensions.find(d => d.name === "Safety")!;
      expect(safety2.score).toBeGreaterThan(safety1.score);
    });

    it("FAILURE: missing M30/M02 penalizes safety dimension score", () => {
      const noEnd = `G28 Z0\nG01 X50 F500`;
      const withEnd = `G28 Z0\nG01 X50 F500\nM30`;
      const r1 = engine.scorePostQuality({ gcode: noEnd });
      const r2 = engine.scorePostQuality({ gcode: withEnd });
      const safety1 = r1.dimensions.find(d => d.name === "Safety")!;
      const safety2 = r2.dimensions.find(d => d.name === "Safety")!;
      expect(safety2.score).toBeGreaterThan(safety1.score);
    });

    it("G43 tool length comp raises machine optimization score", () => {
      const withTLC = `G28 Z0\nG43 H01\nG01 X50 F500\nM30`;
      const noTLC = `G28 Z0\nG01 X50 F500\nM30`;
      const r1 = engine.scorePostQuality({ gcode: withTLC });
      const r2 = engine.scorePostQuality({ gcode: noTLC });
      const mo1 = r1.dimensions.find(d => d.name === "Machine Optimization")!;
      const mo2 = r2.dimensions.find(d => d.name === "Machine Optimization")!;
      expect(mo1.score).toBeGreaterThan(mo2.score);
    });

    it("safety_compliance.passed includes expected items for FANUC_GCODE", () => {
      // FANUC_GCODE has G53 Z0 (safe start), M30 (end), M03 (spindle on), M09 (coolant OFF, not M08)
      // Coolant check in engine uses /M0?8|M0?7/ so M09 does NOT match -> expect warning, not passed
      const result = engine.scorePostQuality({ gcode: FANUC_GCODE });
      expect(result.safety_compliance.passed).toContain("Safe start block present");
      expect(result.safety_compliance.passed).toContain("Program end present");
      expect(result.safety_compliance.passed).toContain("Spindle start command present");
      // M09 = coolant OFF; engine checks M08/M07 for coolant ON
      expect(result.safety_compliance.warnings).toContain("No coolant command detected");
    });

    it("safety_compliance.passed includes coolant when M08 is present", () => {
      const withCoolant = `G28 Z0\nG43 H01\nG54\nM03 S3000\nM08\nG01 X50 F500\nM09\nM30`;
      const result = engine.scorePostQuality({ gcode: withCoolant });
      expect(result.safety_compliance.passed).toContain("Coolant command present");
    });

    it("best_practices.followed includes work offset and TLC for FANUC_GCODE", () => {
      const result = engine.scorePostQuality({ gcode: FANUC_GCODE });
      // FANUC_GCODE has G54 and G43
      expect(result.best_practices.followed).toContain("Work offset declaration");
      expect(result.best_practices.followed).toContain("Tool length compensation");
    });

    it("machine_optimization_level equals Machine Optimization dimension score", () => {
      const result = engine.scorePostQuality({ gcode: FANUC_GCODE });
      const dim = result.dimensions.find(d => d.name === "Machine Optimization")!;
      expect(result.machine_optimization_level).toBe(dim.score);
    });

    it("ADVERSARIAL: all bonus features present -> machine optimization score >= 90", () => {
      // G05.1 (HSM) + G43 (TLC) + G83 (canned cycle) -> base 70 + 15 + 10 + 5 = 100 capped at 100
      const optGcode = `G28 Z0
G43 H01
G05.1 Q1
G83 Z-30 R5 F200
G54
M08
M30`;
      const result = engine.scorePostQuality({ gcode: optGcode });
      const mo = result.dimensions.find(d => d.name === "Machine Optimization")!;
      expect(mo.score).toBeGreaterThanOrEqual(90);
    });

    it("overall_score is the dimension weighted average (algebraic invariant)", () => {
      const result = engine.scorePostQuality({ gcode: FANUC_GCODE });
      const weightedSum = result.dimensions.reduce((s, d) => s + d.score * d.weight, 0);
      const weightTotal = result.dimensions.reduce((s, d) => s + d.weight, 0);
      const expected = Math.round((weightedSum / weightTotal) * 10) / 10;
      expect(result.overall_score).toBeCloseTo(expected, 1);
    });
  });

  // \u2500\u2500 analyze (composite) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  describe("analyze", () => {
    it("returns all top-level fields with correct primitive types", () => {
      const result = engine.analyze({ gcode: FANUC_GCODE, material_iso: "P" });
      expect(typeof result.pattern_recognition.operation_type).toBe("string");
      expect(Array.isArray(result.feed_optimization)).toBe(true);
      expect(typeof result.controller_classification.detected_controller).toBe("string");
      expect(typeof result.cycle_time_estimation.estimated_time_sec).toBe("number");
      expect(typeof result.quality_score.overall_score).toBe("number");
      expect(typeof result.neural_confidence).toBe("number");
      expect(typeof result.processing_time_ms).toBe("number");
    });

    it("neural_confidence is in [0, 1]", () => {
      const result = engine.analyze({ gcode: FANUC_GCODE, material_iso: "P" });
      expect(result.neural_confidence).toBeGreaterThanOrEqual(0);
      expect(result.neural_confidence).toBeLessThanOrEqual(1);
    });

    it("processing_time_ms is a non-negative integer", () => {
      const result = engine.analyze({ gcode: FANUC_GCODE });
      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(result.processing_time_ms)).toBe(true);
    });

    it("pattern_recognition sub-result agrees with standalone recognizePatterns call", () => {
      const input: DeepLearningInput = { gcode: DRILLING_GCODE, material_iso: "K" };
      const full = engine.analyze(input);
      const standalone = engine.recognizePatterns(input);
      expect(full.pattern_recognition.operation_type).toBe(standalone.operation_type);
    });

    it("FAILURE: empty G-code returns zero cycle time and empty feed optimizations", () => {
      const result = engine.analyze({ gcode: "" });
      expect(result.cycle_time_estimation.estimated_time_sec).toBe(0);
      expect(result.feed_optimization).toHaveLength(0);
    });

    it("ADVERSARIAL: very large G-code program completes without throwing", () => {
      const bigGcode = Array.from({ length: 2000 }, (_, i) =>
        `G01 X${(i % 500).toFixed(3)} Y${(i % 300).toFixed(3)} F1000`
      ).join("\n");
      let threw = false;
      try {
        engine.analyze({ gcode: bigGcode });
      } catch {
        threw = true;
      }
      expect(threw).toBe(false);
    });

    it("singleton export and fresh instance produce identical deterministic results", () => {
      const fresh = new PostProcessorDeepLearningEngine();
      const r1 = engine.classifyController({ gcode: HAAS_GCODE });
      const r2 = fresh.classifyController({ gcode: HAAS_GCODE });
      expect(r1.detected_controller).toBe(r2.detected_controller);
      expect(r1.confidence).toBe(r2.confidence);
    });
  });
});
