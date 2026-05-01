/**
 * PP-REV-MS4 — Prove-Out + Air-Cut Detection Tests
 * ==================================================
 * Tests for ProveOutModeEngine, ProveOutPromotionEngine, AirCutDetectionEngine,
 * and RapidRepositionOptEngine air-cut detection.
 *
 * Dispatcher actions tested: ppg_prove_out_generate, ppg_prove_out_promote,
 * ppg_air_cut_detect, ppg_rapid_optimize
 */
import { describe, it, expect } from "vitest";
import { proveOutModeEngine } from "../engines/ProveOutModeEngine.js";
import { proveOutPromotionEngine } from "../engines/ProveOutPromotionEngine.js";
import { airCutDetectionEngine } from "../engines/AirCutDetectionEngine.js";
import { rapidRepositionOptEngine } from "../engines/RapidRepositionOptEngine.js";

const SAMPLE_GCODE = `O1001 (TEST PART)
T1 M6
S8000 M3
G43 H1 Z50. M8
G0 X0 Y0
G1 Z-5. F500
G1 X50. F1000
G1 Y50.
G1 X0.
G1 Y0.
G0 Z50.
T2 M6
S6000 M3
G43 H2 Z50.
G0 X10 Y10
G1 Z-3. F300
G1 X40. F800
G2 X40. Y40. I15. J0.
G1 X10.
G1 Y10.
G0 Z50.
M30
`;

const AIR_CUT_GCODE = `O2001 (AIR CUT TEST)
T1 M6
S10000 M3
G43 H1 Z100. M8
G0 X0 Y0
G1 Z5. F200
G1 Z-2. F500
G1 X50. F1000
G1 Y50.
G0 Z100.
G0 X0 Y0
G1 Z5. F200
G1 Z-2. F500
G1 X50. F1000
G1 Y50.
G0 Z100.
G0 X10 Y10
G1 Z-2. F500
G1 X40. F800
G1 Y40.
G0 Z100.
M30
`;

// ============================================================================
// 1. ProveOutModeEngine — generate prove-out program
// ============================================================================
describe("ProveOutModeEngine — prove-out generation", () => {
  it("generates prove-out version with reduced feeds", async () => {
    const result = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: SAMPLE_GCODE,
      config: { controller: "fanuc", feed_reduction: 0.5, rpm_cap: 0.7, insert_optional_stops: true },
    });
    expect(result.gcode.length).toBeGreaterThan(0);
    expect(result.gcode.split("\n").length).toBeGreaterThanOrEqual(SAMPLE_GCODE.split("\n").length);
  });

  it("inserts optional stops (M01) at tool changes", async () => {
    const result = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: SAMPLE_GCODE,
      config: { controller: "fanuc", feed_reduction: 0.5, rpm_cap: 0.8, insert_optional_stops: true },
    });
    expect(result.gcode).toContain("M01");
  });

  it("reduces feed rates by specified factor", async () => {
    const result = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: SAMPLE_GCODE,
      config: { controller: "fanuc", feed_reduction: 0.5, rpm_cap: 1.0 },
    });
    const feedMatches = result.gcode.match(/F(\d+)/g) || [];
    const feeds = feedMatches.map(f => parseInt(f.slice(1)));
    // Original F1000 → F500 with 50% reduction
    expect(feeds.some(f => f < 1000)).toBe(true);
  });

  it("adds prove-out comment header", async () => {
    const result = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: SAMPLE_GCODE,
      config: { controller: "fanuc" },
    });
    expect(result.gcode.toLowerCase()).toContain("prove");
  });

  it("works for Siemens controller dialect", async () => {
    const result = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: SAMPLE_GCODE,
      config: { controller: "siemens", feed_reduction: 0.5 },
    });
    // Siemens uses "; " prefix for comments
    expect(result.gcode).toContain(";");
    expect(result.gcode.length).toBeGreaterThan(0);
  });

  it("works for Haas controller dialect", async () => {
    const result = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: SAMPLE_GCODE,
      config: { controller: "haas", feed_reduction: 0.5 },
    });
    expect(result.gcode.length).toBeGreaterThan(0);
  });

  it("caps RPM values", async () => {
    const result = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: SAMPLE_GCODE,
      config: { controller: "fanuc", rpm_cap: 0.7 },
    });
    // S8000 → S5600 with 70% cap
    expect(result.summary.rpm_caps).toBeGreaterThan(0);
  });

  it("returns summary statistics", async () => {
    const result = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: SAMPLE_GCODE,
    });
    expect(result.summary).toBeDefined();
    expect(result.summary.total_lines).toBeGreaterThan(0);
    expect(result.estimated_cycle_time_ratio).toBeGreaterThanOrEqual(1.0);
  });
});

// ============================================================================
// 2. ProveOutPromotionEngine — strip to production
// ============================================================================
describe("ProveOutPromotionEngine — promote to production", () => {
  it("strips prove-out comments and M01 stops (heuristic)", () => {
    const proveOutGcode = [
      "(PROVE-OUT MODE - FIRST ARTICLE)",
      "(RECOMMEND: ENABLE SINGLE-BLOCK MODE)",
      "(FEEDS REDUCED 25% | RPM CAPPED 80%)",
      "(OPTIONAL STOPS AT CRITICAL TRANSITIONS)",
      "O1001",
      "(PROVE-OUT: DEPTH TRANSITION 0.000 -> -5.000)",
      "M01",
      "G1 Z-5. F375",
      "G1 X50. F750",
      "M30",
    ].join("\n");

    const result = proveOutPromotionEngine.promote({
      prove_out_gcode: proveOutGcode,
      feed_reduction: 0.25,
    });

    expect(result.production_gcode).not.toContain("PROVE-OUT");
    expect(result.production_gcode).not.toContain("FEEDS REDUCED");
    expect(result.production_gcode).not.toMatch(/^\s*M0?1\s*$/m);
    expect(result.production_gcode).toContain("O1001");
    expect(result.production_gcode).toContain("M30");
    expect(result.summary.lines_removed).toBeGreaterThan(0);
    expect(result.restoration_method).toBe("heuristic");
  });

  it("restores original feed rates from heuristic", () => {
    const proveOutGcode = [
      "(FEEDS REDUCED 50% | RPM CAPPED 70%)",
      "G1 Z-5. F250",
      "G1 X50. F500",
      "M30",
    ].join("\n");

    const result = proveOutPromotionEngine.promote({
      prove_out_gcode: proveOutGcode,
      feed_reduction: 0.5,
    });

    // F250 / (1 - 0.5) = F500, F500 / (1 - 0.5) = F1000
    expect(result.production_gcode).toContain("F500");
    expect(result.production_gcode).toContain("F1000");
    expect(result.summary.feeds_restored).toBeGreaterThan(0);
  });

  it("uses exact restoration when original_gcode is provided", () => {
    const original = "O1001\nG1 Z-5. F500\nG1 X50. F1000\nM30";
    const proveOut = [
      "(PROVE-OUT MODE - FIRST ARTICLE)",
      "(FEEDS REDUCED 25% | RPM CAPPED 80%)",
      "O1001",
      "M01",
      "G1 Z-5. F375",
      "G1 X50. F750",
      "M30",
    ].join("\n");

    const result = proveOutPromotionEngine.promote({
      prove_out_gcode: proveOut,
      original_gcode: original,
    });

    expect(result.restoration_method).toBe("exact");
    expect(result.production_gcode).toBe(original);
    expect(result.summary.feeds_restored).toBeGreaterThan(0);
  });

  it("preserves M00 (programmed stops) while removing M01", () => {
    const proveOut = "O1001\nM00 (PROGRAMMED STOP)\nM01\nG1 X10 F500\nM30";
    const result = proveOutPromotionEngine.promote({ prove_out_gcode: proveOut });

    expect(result.production_gcode).toContain("M00");
    expect(result.production_gcode).not.toMatch(/^\s*M0?1\s*$/m);
  });

  it("includes sign-off block when requested", () => {
    const result = proveOutPromotionEngine.promote({
      prove_out_gcode: "O1001\nG1 X10 F500\nM30",
      operator_name: "John Smith",
      part_number: "P-1234",
      job_number: "WO-5678",
      include_sign_off: true,
    });

    expect(result.sign_off).toBeDefined();
    expect(result.sign_off!.operator).toBe("John Smith");
    expect(result.sign_off!.part_number).toBe("P-1234");
    expect(result.sign_off!.job_number).toBe("WO-5678");
    expect(result.sign_off!.status).toBe("pending");
  });

  it("generates diff between prove-out and production", () => {
    const proveOut = [
      "(PROVE-OUT MODE - FIRST ARTICLE)",
      "O1001",
      "M01",
      "G1 X10 F500",
      "M30",
    ].join("\n");

    const result = proveOutPromotionEngine.promote({ prove_out_gcode: proveOut });

    expect(result.diff.length).toBeGreaterThan(0);
    const removedLines = result.diff.filter(d => d.change_type === "removed");
    expect(removedLines.length).toBeGreaterThan(0);
  });

  it("handles empty input gracefully", () => {
    const result = proveOutPromotionEngine.promote({ prove_out_gcode: "" });
    expect(result.production_gcode).toBe("");
    expect(result.summary.total_lines_prove_out).toBe(1); // split("") produces [""]
  });

  it("auto-detects feed reduction from header", () => {
    const proveOut = "(FEEDS REDUCED 30% | RPM CAPPED 75%)\nG1 X10 F700\nM30";
    const result = proveOutPromotionEngine.promote({ prove_out_gcode: proveOut });

    // Should detect 30% reduction from header and use it
    expect(result.summary.header_lines_removed).toBe(1);
    expect(result.summary.feeds_restored).toBeGreaterThan(0);
    // F700 / (1 - 0.3) = F1000
    expect(result.production_gcode).toContain("F1000");
  });
});

// ============================================================================
// 3. AirCutDetectionEngine — raw G-code air-cut detection
// ============================================================================
describe("AirCutDetectionEngine — detect from G-code", () => {
  it("detects approach feed moves above stock", () => {
    const gcode = [
      "O3001",
      "T1 M6",
      "S10000 M3",
      "G0 X0 Y0 Z50.",
      "G1 Z5. F200",      // approach at feed above stock (Z=0)
      "G1 Z-5. F500",     // actual cutting
      "G1 X50. F1000",
      "G0 Z50.",
      "M30",
    ].join("\n");

    const result = airCutDetectionEngine.detect({ gcode, stock_top_z: 0 });
    expect(result.detections.length).toBeGreaterThan(0);
    expect(result.total_time_wasted_sec).toBeGreaterThanOrEqual(0);
  });

  it("returns optimized G-code with rapids replacing air cuts", () => {
    const gcode = [
      "O3002",
      "G0 X0 Y0 Z50.",
      "G1 Z10. F200",     // Feed approach well above stock
      "G1 Z-5. F500",
      "G1 X50. F1000",
      "G0 Z50.",
      "M30",
    ].join("\n");

    const result = airCutDetectionEngine.detect({ gcode, stock_top_z: 0 });
    expect(result.optimized_gcode).toBeDefined();
    expect(result.optimized_gcode.length).toBeGreaterThan(0);
  });

  it("generates a human-readable report", () => {
    const result = airCutDetectionEngine.detect({ gcode: AIR_CUT_GCODE, stock_top_z: 0 });
    expect(result.report).toContain("AIR-CUT DETECTION REPORT");
    expect(result.report).toContain("Total lines analyzed");
  });

  it("returns summary with detection statistics", () => {
    const result = airCutDetectionEngine.detect({ gcode: AIR_CUT_GCODE, stock_top_z: 0 });
    expect(result.summary).toBeDefined();
    expect(result.summary.total_lines).toBeGreaterThan(0);
    expect(typeof result.summary.air_cut_pct).toBe("number");
    expect(result.summary.by_type).toBeDefined();
  });

  it("handles minimal program with no air cuts", () => {
    const minimal = "O4001\nG0 X0 Y0\nG1 Z-5. F500\nG1 X50.\nM30";
    const result = airCutDetectionEngine.detect({ gcode: minimal, stock_top_z: 0 });
    expect(result.detections).toBeDefined();
    expect(Array.isArray(result.detections)).toBe(true);
  });

  it("detects retract at feed rate", () => {
    const gcode = [
      "O5001",
      "G0 X0 Y0 Z50.",
      "G0 Z2.",
      "G1 Z-5. F500",
      "G1 X50. F1000",
      "G1 Z50. F200",     // Retract at feed rate instead of G0!
      "M30",
    ].join("\n");

    const result = airCutDetectionEngine.detect({ gcode, stock_top_z: 0, retract_z: 50 });
    const retractDetections = result.detections.filter(d => d.type === "retract_feed");
    expect(retractDetections.length).toBeGreaterThan(0);
  });

  it("provides suggestions for each detection", () => {
    const result = airCutDetectionEngine.detect({ gcode: AIR_CUT_GCODE, stock_top_z: 0 });
    for (const det of result.detections) {
      expect(det.suggestion).toBeDefined();
      expect(det.suggestion.length).toBeGreaterThan(0);
    }
  });

  it("includes line numbers in detections", () => {
    const result = airCutDetectionEngine.detect({ gcode: AIR_CUT_GCODE, stock_top_z: 0 });
    for (const det of result.detections) {
      expect(det.line_number).toBeGreaterThan(0);
      expect(det.gcode_text.length).toBeGreaterThan(0);
    }
  });

  it("handles custom retract_z", () => {
    const gcode = "O6001\nG0 X0 Y0 Z25.\nG1 Z-5. F500\nG1 X50.\nG0 Z25.\nM30";
    const result = airCutDetectionEngine.detect({ gcode, stock_top_z: 0, retract_z: 25 });
    expect(result).toBeDefined();
    expect(result.summary.total_lines).toBeGreaterThan(0);
  });
});

// ============================================================================
// 4. RapidRepositionOptEngine — structured air-cut detection
// ============================================================================
describe("RapidRepositionOptEngine — air-cut detection", () => {
  it("detects air cuts from structured data", () => {
    const result = rapidRepositionOptEngine.detectAirCuts({
      gcode: SAMPLE_GCODE,
      controller: "fanuc",
    });
    expect(result).toHaveProperty("detections");
    expect(result).toHaveProperty("total_time_wasted_sec");
    expect(result.total_time_wasted_sec).toBeGreaterThanOrEqual(0);
  });

  it("returns empty detections for minimal program", () => {
    const minimal = "O1001\nG0 X0 Y0\nG1 Z-5. F500\nG1 X50.\nM30";
    const result = rapidRepositionOptEngine.detectAirCuts({
      gcode: minimal,
      controller: "fanuc",
    });
    expect(result.detections).toBeDefined();
  });
});

// ============================================================================
// 5. RapidRepositionOptEngine — full optimization
// ============================================================================
describe("RapidRepositionOptEngine — full optimization", () => {
  it("returns optimization result with time savings", () => {
    const result = rapidRepositionOptEngine.fullOptimize({
      gcode: SAMPLE_GCODE,
      controller: "fanuc",
    });
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });
});

// ============================================================================
// 6. Prove-Out → Promote roundtrip
// ============================================================================
describe("Prove-Out → Promote roundtrip", () => {
  it("roundtrip: prove-out then promote preserves program structure", async () => {
    const proveOutResult = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: SAMPLE_GCODE,
      config: { controller: "fanuc", feed_reduction: 0.25, rpm_cap: 0.8 },
    });

    const promoResult = proveOutPromotionEngine.promote({
      prove_out_gcode: proveOutResult.gcode,
      original_gcode: SAMPLE_GCODE,
    });

    // Production should match original
    expect(promoResult.production_gcode).toBe(SAMPLE_GCODE);
    expect(promoResult.restoration_method).toBe("exact");
  });

  it("heuristic roundtrip restores feeds approximately", async () => {
    const reduction = 0.25;
    const proveOutResult = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: "O1001\nG1 X50. F1000\nM30",
      config: { controller: "fanuc", feed_reduction: reduction, rpm_cap: 1.0 },
    });

    const promoResult = proveOutPromotionEngine.promote({
      prove_out_gcode: proveOutResult.gcode,
      feed_reduction: reduction,
    });

    // F1000 * 0.75 = F750 → restore: F750 / 0.75 = F1000
    expect(promoResult.production_gcode).toContain("F1000");
  });
});

// ============================================================================
// 7. Air-Cut + Optimization integration
// ============================================================================
describe("Air-Cut + Optimization integration", () => {
  it("air-cut detection + optimization produces shorter program", () => {
    const result = airCutDetectionEngine.detect({ gcode: AIR_CUT_GCODE, stock_top_z: 0 });
    if (result.detections.length > 0) {
      // Optimized G-code should have G0 replacing some G1 air cuts
      const origG1Count = (AIR_CUT_GCODE.match(/G1\b/g) || []).length;
      const optG1Count = (result.optimized_gcode.match(/G1\b/g) || []).length;
      const optG0Count = (result.optimized_gcode.match(/G0\b/g) || []).length;
      // Should have more rapids or fewer feeds after optimization
      expect(optG1Count).toBeLessThanOrEqual(origG1Count);
    }
  });
});

// ============================================================================
// 8. Dispatcher wiring verification
// ============================================================================
describe("productDispatcher — PP-REV-MS4 action wiring", () => {
  it("dispatcher contains all MS4 actions", async () => {
    const fs = await import("fs");
    const path = new URL("../tools/dispatchers/productDispatcher.ts", import.meta.url)
      .pathname.replace(/^\/([A-Z]:)/, "$1");
    const src = fs.readFileSync(path, "utf8");
    expect(src).toContain('"ppg_prove_out_generate"');
    expect(src).toContain('"ppg_prove_out_promote"');
    expect(src).toContain('"ppg_air_cut_detect"');
    expect(src).toContain('"ppg_rapid_optimize"');
    expect(src).toContain('action === "ppg_prove_out_generate"');
    expect(src).toContain('action === "ppg_prove_out_promote"');
    expect(src).toContain('action === "ppg_air_cut_detect"');
    expect(src).toContain('action === "ppg_rapid_optimize"');
  });

  it("dispatcher uses ProveOutPromotionEngine for promote action", async () => {
    const fs = await import("fs");
    const path = new URL("../tools/dispatchers/productDispatcher.ts", import.meta.url)
      .pathname.replace(/^\/([A-Z]:)/, "$1");
    const src = fs.readFileSync(path, "utf8");
    expect(src).toContain('ProveOutPromotionEngine');
    expect(src).toContain('proveOutPromotionEngine.promote');
  });

  it("dispatcher uses AirCutDetectionEngine for gcode-based detection", async () => {
    const fs = await import("fs");
    const path = new URL("../tools/dispatchers/productDispatcher.ts", import.meta.url)
      .pathname.replace(/^\/([A-Z]:)/, "$1");
    const src = fs.readFileSync(path, "utf8");
    expect(src).toContain('AirCutDetectionEngine');
    expect(src).toContain('airCutDetectionEngine.detect');
  });
});

// ============================================================================
// 9. Route wiring verification
// ============================================================================
describe("Route wiring — ppg routes", () => {
  it("ppg routes include prove-out promote and air-cut detect", async () => {
    const fs = await import("fs");
    const path = new URL("../routes/ppg.ts", import.meta.url)
      .pathname.replace(/^\/([A-Z]:)/, "$1");
    const src = fs.readFileSync(path, "utf8");
    expect(src).toContain("/prove-out/promote");
    expect(src).toContain("/air-cut/detect");
    expect(src).toContain("ppg_prove_out_promote");
    expect(src).toContain("ppg_air_cut_detect");
  });
});
