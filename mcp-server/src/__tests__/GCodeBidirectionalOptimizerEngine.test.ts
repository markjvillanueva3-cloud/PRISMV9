/**
 * GCodeBidirectionalOptimizerEngine -- deterministic companion contract tests
 * (U-PP-MISSING-ENGINE-TESTS, slot:echo)
 *
 * The engine turns a predicted runtime (+ optional reverse-CAD) into ranked
 * G-code optimization recommendations. The integration-level coverage in
 * GCodeReverseLoop.test.ts only runs the REAL predictor and asserts weak
 * `savings > 0` / sort / conservation. This file is the reference-value layer:
 * each recommendation category is exercised with a HAND-BUILT `baselineRuntime`
 * so every estimated-savings number, boundary, and gate is locked to an exact
 * value (R9 -- verify intent with arithmetic, not just "a rec exists").
 *
 * It also locks the trailing-cluster bug fix (test "1b"): block_consolidation
 * only flushed inside the `else` branch, so a short-G1 cluster that ran to the
 * end of the program was silently dropped (a boundary miss). The fix adds a
 * post-loop flush; test 1b FAILS on the pre-fix engine (0 recs).
 *
 * Domain note (echo): these are heuristic savings thresholds (named constants
 * in the engine), NOT physics constants -- no constants.ts dependency.
 */

import { describe, it, expect } from "vitest";
import {
  gcodeBidirectionalOptimizerEngine as opt,
  GCodeBidirectionalOptimizerEngine,
} from "../engines/GCodeBidirectionalOptimizerEngine.js";
import {
  MACHINE_LIBRARY,
  type RuntimePrediction,
  type BlockTimeBreakdown,
  type ParsedBlock,
} from "../engines/GCodeRuntimePredictorEngine.js";
import type { ReverseCADResult, ReverseCADFeature } from "../engines/GCodeReverseCADEngine.js";

const MACHINE = MACHINE_LIBRARY.hurco_vmx24;

/** A BlockTimeBreakdown with neutral defaults (long G1 block, constant feed, no
 *  penalties) so each test sets ONLY the fields its category reads. Defaults are
 *  chosen to fire NOTHING: path >= 0.5 (no consolidation), constant feed (no
 *  balancing), zero throttle/spindle penalties. */
function mkBTB(over: Partial<BlockTimeBreakdown> = {}): BlockTimeBreakdown {
  return {
    block_n: undefined,
    motion: "G1",
    path_length_mm: 10,
    effective_feed_mm_min: 1000,
    motion_time_sec: 0,
    accel_penalty_sec: 0,
    throttle_penalty_sec: 0,
    tool_change_sec: 0,
    spindle_ramp_sec: 0,
    dwell_sec: 0,
    total_sec: 0,
    bottleneck: "feed",
    ...over,
  };
}

/** A RuntimePrediction with all-zero time_breakdown so a test fires only the
 *  category it sets. total_sec defaults to the sum of block total_sec. */
function mkBaseline(over: Partial<RuntimePrediction> = {}): RuntimePrediction {
  const { time_breakdown: tbOver, blocks: blocksOver, total_sec: totalOver, ...rest } = over;
  const blocks = blocksOver ?? [];
  const total_sec = totalOver ?? blocks.reduce((a, b) => a + b.total_sec, 0);
  return {
    machine: MACHINE,
    blocks,
    total_sec,
    total_min: total_sec / 60,
    time_breakdown: {
      cutting_sec: 0,
      rapid_sec: 0,
      tool_change_sec: 0,
      spindle_ramp_sec: 0,
      dwell_sec: 0,
      accel_penalty_sec: 0,
      throttle_penalty_sec: 0,
      ...(tbOver ?? {}),
    },
    bottleneck_breakdown: { feed: 0, corner: 0, accel: 0, throttle: 0, overhead: 0 },
    findings: [],
    ...rest,
  };
}

/** Minimal ReverseCADResult -- the engine reads ONLY features[].position.z +
 *  features[].depth_mm. Everything else is zeroed scaffold. */
function mkReverseCad(features: Partial<ReverseCADFeature>[]): ReverseCADResult {
  const feats: ReverseCADFeature[] = features.map((f) => ({
    kind: "pocket",
    tool_number: 1,
    position: { x: 0, y: 0, z: 0 },
    primary_dim_mm: 10,
    depth_mm: 0,
    confidence: 0.8,
    source_blocks: {},
    ...f,
  }));
  return {
    stock: { min: { x: 0, y: 0, z: 0 }, max: { x: 100, y: 100, z: 50 } },
    features: feats,
    material_removed_mm3: 0,
    stock_volume_mm3: 0,
    finished_volume_mm3: 0,
    feature_counts: {} as ReverseCADResult["feature_counts"],
    summary: [],
    warnings: [],
  };
}

describe("GCodeBidirectionalOptimizerEngine", () => {
  it("exports a singleton instance of the class", () => {
    expect(opt).toBeInstanceOf(GCodeBidirectionalOptimizerEngine);
  });

  describe("1. block_consolidation", () => {
    it("flags a mid-array cluster of >=5 short G1 blocks (savings = clusterTime * 0.3)", () => {
      // 5 short G1 blocks (0.3mm, 0.1s each, N10..N14) then a long G1 terminator.
      const short = (n: number) => mkBTB({ block_n: n, path_length_mm: 0.3, total_sec: 0.1 });
      const blocks = [short(10), short(11), short(12), short(13), short(14), mkBTB({ block_n: 15, total_sec: 2.0 })];
      const r = opt.optimize({ blocks: [], machine: MACHINE, baselineRuntime: mkBaseline({ blocks }) });
      expect(r.recommendations).toHaveLength(1);
      const rec = r.recommendations[0];
      expect(rec.category).toBe("block_consolidation");
      // clusterTime = 5 * 0.1 = 0.5 ; savings = 0.5 * 0.3 = 0.15
      expect(rec.estimated_savings_sec).toBeCloseTo(0.15, 6);
      expect(rec.source_blocks).toEqual({ start: 10, end: 14 });
      expect(rec.risk).toBe(0.2);
      expect(rec.confidence).toBe(0.85);
      expect(rec.why).toContain("5 consecutive short G1 blocks");
      // baseline total = 0.5 + 2.0 = 2.5 ; pct = 0.15/2.5*100 = 6
      expect(r.total_savings_pct).toBeCloseTo(6, 6);
      expect(r.optimized_runtime_estimate_sec).toBeCloseTo(2.35, 6);
    });

    it("FIXED (trailing flush): a cluster that runs to the LAST block is still reported", () => {
      // 5 short G1 blocks N20..N24 with NO terminator. Pre-fix the loop never
      // flushed the open cluster -> 0 recs. The post-loop flush now emits it.
      const short = (n: number) => mkBTB({ block_n: n, path_length_mm: 0.3, total_sec: 0.1 });
      const blocks = [short(20), short(21), short(22), short(23), short(24)];
      const r = opt.optimize({ blocks: [], machine: MACHINE, baselineRuntime: mkBaseline({ blocks }) });
      expect(r.recommendations).toHaveLength(1);
      expect(r.recommendations[0].category).toBe("block_consolidation");
      expect(r.recommendations[0].source_blocks).toEqual({ start: 20, end: 24 });
      expect(r.recommendations[0].estimated_savings_sec).toBeCloseTo(0.15, 6);
    });

    it("FAILURE MODE: a trailing cluster BELOW the min size (4 < 5) is NOT flagged", () => {
      // Proves the trailing flush still respects CONSOLIDATION_CLUSTER_MIN.
      const short = (n: number) => mkBTB({ block_n: n, path_length_mm: 0.3, total_sec: 0.1 });
      const blocks = [short(30), short(31), short(32), short(33)];
      const r = opt.optimize({ blocks: [], machine: MACHINE, baselineRuntime: mkBaseline({ blocks }) });
      expect(r.recommendations).toHaveLength(0);
    });

    it("FAILURE MODE: 5 short RAPID (G0) blocks are not a consolidation candidate (G1 gate)", () => {
      const short = (n: number) => mkBTB({ block_n: n, path_length_mm: 0.3, total_sec: 0.1, motion: "G0" });
      const blocks = [short(40), short(41), short(42), short(43), short(44)];
      const r = opt.optimize({ blocks: [], machine: MACHINE, baselineRuntime: mkBaseline({ blocks }) });
      expect(r.recommendations).toHaveLength(0);
    });
  });

  describe("2. throttle_relief", () => {
    it("fires when throttle penalty exceeds 10% of cycle time (savings = penalty * 0.6)", () => {
      const r = opt.optimize({
        blocks: [],
        machine: MACHINE,
        baselineRuntime: mkBaseline({ total_sec: 100, time_breakdown: { throttle_penalty_sec: 20 } as never }),
      });
      expect(r.recommendations).toHaveLength(1);
      const rec = r.recommendations[0];
      expect(rec.category).toBe("throttle_relief");
      // 20 > 100*0.1=10 ; savings = 20 * 0.6 = 12
      expect(rec.estimated_savings_sec).toBeCloseTo(12, 6);
      expect(rec.risk).toBe(0.15);
      expect(rec.confidence).toBe(0.9);
      expect(rec.source_blocks).toEqual({});
      expect(rec.why).toMatch(/20\.0s/);
      expect(rec.why).toMatch(/\(20%\)/);
      expect(r.total_savings_pct).toBeCloseTo(12, 6);
      expect(r.optimized_runtime_estimate_sec).toBeCloseTo(88, 6);
    });

    it("FAILURE MODE: throttle penalty exactly at the 10% threshold does NOT fire (strict >)", () => {
      const r = opt.optimize({
        blocks: [],
        machine: MACHINE,
        baselineRuntime: mkBaseline({ total_sec: 100, time_breakdown: { throttle_penalty_sec: 10 } as never }),
      });
      expect(r.recommendations).toHaveLength(0);
    });

    it("fires just above the threshold (10.5 > 10) with savings = 10.5 * 0.6 = 6.3", () => {
      const r = opt.optimize({
        blocks: [],
        machine: MACHINE,
        baselineRuntime: mkBaseline({ total_sec: 100, time_breakdown: { throttle_penalty_sec: 10.5 } as never }),
      });
      expect(r.recommendations).toHaveLength(1);
      expect(r.recommendations[0].estimated_savings_sec).toBeCloseTo(6.3, 6);
    });
  });

  describe("3. feed_balancing", () => {
    it("flags a >40% feed drop between consecutive G1 blocks (savings = accel_penalty * 0.5)", () => {
      const blocks = [
        mkBTB({ block_n: 1, effective_feed_mm_min: 1000, total_sec: 1 }),
        mkBTB({ block_n: 2, effective_feed_mm_min: 500, accel_penalty_sec: 1.0, total_sec: 1 }),
      ];
      const r = opt.optimize({ blocks: [], machine: MACHINE, baselineRuntime: mkBaseline({ blocks }) });
      expect(r.recommendations).toHaveLength(1);
      const rec = r.recommendations[0];
      expect(rec.category).toBe("feed_balancing");
      // 500 < 1000*0.6=600 ; savings = 1.0 * 0.5 = 0.5
      expect(rec.estimated_savings_sec).toBeCloseTo(0.5, 6);
      expect(rec.source_blocks).toEqual({ start: 2, end: 2 });
      expect(rec.risk).toBe(0.1);
      expect(rec.confidence).toBe(0.7);
      expect(rec.why).toMatch(/Feed drops 50% from prior block/);
      expect(rec.how).toMatch(/Hold feed at 1000 mm\/min/);
    });

    it("FAILURE MODE: feed drop with negligible accel headroom (savings <= 0.05) is skipped", () => {
      const blocks = [
        mkBTB({ block_n: 1, effective_feed_mm_min: 1000, total_sec: 1 }),
        mkBTB({ block_n: 2, effective_feed_mm_min: 500, accel_penalty_sec: 0.08, total_sec: 1 }),
      ];
      // savings = 0.08 * 0.5 = 0.04 <= 0.05 -> no rec
      const r = opt.optimize({ blocks: [], machine: MACHINE, baselineRuntime: mkBaseline({ blocks }) });
      expect(r.recommendations).toHaveLength(0);
    });

    it("FAILURE MODE: a feed drop to EXACTLY 60% of prior is not flagged (strict deficit boundary)", () => {
      const blocks = [
        mkBTB({ block_n: 1, effective_feed_mm_min: 1000, total_sec: 1 }),
        mkBTB({ block_n: 2, effective_feed_mm_min: 600, accel_penalty_sec: 1.0, total_sec: 1 }),
      ];
      // 600 < 1000*0.6=600 is FALSE -> no rec
      const r = opt.optimize({ blocks: [], machine: MACHINE, baselineRuntime: mkBaseline({ blocks }) });
      expect(r.recommendations).toHaveLength(0);
    });

    it("ADVERSARIAL: a RAPID (G0) following a cut is not a feed-imbalance candidate (motion gate)", () => {
      const blocks = [
        mkBTB({ block_n: 1, effective_feed_mm_min: 1000, total_sec: 1 }),
        mkBTB({ block_n: 2, effective_feed_mm_min: 400, accel_penalty_sec: 1.0, total_sec: 1, motion: "G0" }),
      ];
      const r = opt.optimize({ blocks: [], machine: MACHINE, baselineRuntime: mkBaseline({ blocks }) });
      expect(r.recommendations).toHaveLength(0);
    });
  });

  describe("4. rapid_conversion (reverse-CAD)", () => {
    it("flags G1 blocks above safe-Z as air cuts (savings = air motion_time * 0.7)", () => {
      // feature top Z = 0 + depth 5 = 5 ; safeRapidZ = 5 + 5 (clearance) = 10
      const reverseCad = mkReverseCad([{ position: { x: 0, y: 0, z: 0 }, depth_mm: 5 }]);
      const blocks: ParsedBlock[] = [
        { n: 100, z: 20 }, // above 10 -> air cut
        { n: 101, z: 15 }, // above 10 -> air cut
        { n: 102, z: 5 },  // below 10 -> real cut, must NOT convert
      ];
      const btb = [
        mkBTB({ motion: "G1", motion_time_sec: 2 }),
        mkBTB({ motion: "G1", motion_time_sec: 3 }),
        mkBTB({ motion: "G1", motion_time_sec: 1 }),
      ];
      const r = opt.optimize({ blocks, machine: MACHINE, reverseCad, baselineRuntime: mkBaseline({ blocks: btb, total_sec: 10 }) });
      expect(r.recommendations).toHaveLength(1);
      const rec = r.recommendations[0];
      expect(rec.category).toBe("rapid_conversion");
      // air motion time = 2 + 3 = 5 ; savings = 5 * 0.7 = 3.5
      expect(rec.estimated_savings_sec).toBeCloseTo(3.5, 6);
      expect(rec.source_blocks).toEqual({ start: 100, end: 101 });
      expect(rec.risk).toBe(0.05);
      expect(rec.confidence).toBe(0.92);
      expect(rec.why).toMatch(/2 G1 blocks above safe-Z \(10\.0mm\)/);
    });

    it("SAFETY GATE: G1 cutting moves BELOW safe-Z are never proposed as rapids (0 recs)", () => {
      // feature top Z = 0 + 50 = 50 ; safeRapidZ = 55 ; blocks at z=20/15 are real cuts.
      // Converting a real cut to a G0 rapid would plunge the tool into stock at rapid speed.
      const reverseCad = mkReverseCad([{ position: { x: 0, y: 0, z: 0 }, depth_mm: 50 }]);
      const blocks: ParsedBlock[] = [{ n: 100, z: 20 }, { n: 101, z: 15 }];
      const btb = [mkBTB({ motion: "G1", motion_time_sec: 2 }), mkBTB({ motion: "G1", motion_time_sec: 3 })];
      const r = opt.optimize({ blocks, machine: MACHINE, reverseCad, baselineRuntime: mkBaseline({ blocks: btb, total_sec: 10 }) });
      expect(r.recommendations).toHaveLength(0);
    });

    it("ADVERSARIAL: a block that is ALREADY G0 above safe-Z is not re-flagged (G1-only gate)", () => {
      const reverseCad = mkReverseCad([{ position: { x: 0, y: 0, z: 0 }, depth_mm: 5 }]); // safeRapidZ = 10
      const blocks: ParsedBlock[] = [{ n: 200, z: 20 }];
      const btb = [mkBTB({ motion: "G0", motion_time_sec: 2 })];
      const r = opt.optimize({ blocks, machine: MACHINE, reverseCad, baselineRuntime: mkBaseline({ blocks: btb, total_sec: 10 }) });
      expect(r.recommendations).toHaveLength(0);
    });
  });

  describe("5. tool_sequencing", () => {
    it("flags tool oscillation T1,T2,T1,T2,T1,T2,T1 (5 alternations, savings = 5 * 8 = 40)", () => {
      const blocks: ParsedBlock[] = [1, 2, 1, 2, 1, 2, 1].map((t) => ({ m: [6], t }));
      const r = opt.optimize({ blocks, machine: MACHINE, baselineRuntime: mkBaseline({ blocks: [], total_sec: 100 }) });
      expect(r.recommendations).toHaveLength(1);
      const rec = r.recommendations[0];
      expect(rec.category).toBe("tool_sequencing");
      expect(rec.estimated_savings_sec).toBeCloseTo(40, 6);
      expect(rec.risk).toBe(0.25);
      expect(rec.confidence).toBe(0.8);
      expect(rec.why).toMatch(/5 alternations across 7 tool changes/);
    });

    it("FAILURE MODE: a single alternation (T1,T2,T1) is below the 3-oscillation threshold", () => {
      const blocks: ParsedBlock[] = [1, 2, 1].map((t) => ({ m: [6], t }));
      const r = opt.optimize({ blocks, machine: MACHINE, baselineRuntime: mkBaseline({ blocks: [], total_sec: 100 }) });
      expect(r.recommendations).toHaveLength(0);
    });

    it("ADVERSARIAL: a well-sequenced program (T1,T1,T2,T2,T3,T3) is NOT flagged (0 oscillations)", () => {
      const blocks: ParsedBlock[] = [1, 1, 2, 2, 3, 3].map((t) => ({ m: [6], t }));
      const r = opt.optimize({ blocks, machine: MACHINE, baselineRuntime: mkBaseline({ blocks: [], total_sec: 100 }) });
      expect(r.recommendations).toHaveLength(0);
    });

    it("ADVERSARIAL: a T-word WITHOUT M06 is a preselect, not a tool change (no oscillation)", () => {
      const blocks: ParsedBlock[] = [1, 2, 1, 2, 1].map((t) => ({ m: [8], t })); // M08 coolant, not M06
      const r = opt.optimize({ blocks, machine: MACHINE, baselineRuntime: mkBaseline({ blocks: [], total_sec: 100 }) });
      expect(r.recommendations).toHaveLength(0);
    });
  });

  describe("6. spindle_warm_reduce", () => {
    it("fires when spindle ramp overhead exceeds 5s (savings = ramp * 0.3)", () => {
      const r = opt.optimize({
        blocks: [],
        machine: MACHINE,
        baselineRuntime: mkBaseline({ total_sec: 50, time_breakdown: { spindle_ramp_sec: 10 } as never }),
      });
      expect(r.recommendations).toHaveLength(1);
      const rec = r.recommendations[0];
      expect(rec.category).toBe("spindle_warm_reduce");
      expect(rec.estimated_savings_sec).toBeCloseTo(3, 6); // 10 * 0.3
      expect(rec.risk).toBe(0.15);
      expect(rec.confidence).toBe(0.7);
    });

    it("FAILURE MODE: spindle ramp of exactly 5s does NOT fire (strict >)", () => {
      const r = opt.optimize({
        blocks: [],
        machine: MACHINE,
        baselineRuntime: mkBaseline({ total_sec: 50, time_breakdown: { spindle_ramp_sec: 5 } as never }),
      });
      expect(r.recommendations).toHaveLength(0);
    });
  });

  describe("aggregation + sorting", () => {
    it("sorts recommendations by estimated_savings descending and sums totals", () => {
      // throttle(20->12) + spindle(10->3): both fire, throttle is the bigger saver.
      const r = opt.optimize({
        blocks: [],
        machine: MACHINE,
        baselineRuntime: mkBaseline({
          total_sec: 100,
          time_breakdown: { throttle_penalty_sec: 20, spindle_ramp_sec: 10 } as never,
        }),
      });
      expect(r.recommendations).toHaveLength(2);
      expect(r.recommendations[0].category).toBe("throttle_relief"); // 12 > 3
      expect(r.recommendations[1].category).toBe("spindle_warm_reduce");
      expect(r.total_estimated_savings_sec).toBeCloseTo(15, 6); // 12 + 3
      expect(r.total_savings_pct).toBeCloseTo(15, 6);
      expect(r.optimized_runtime_estimate_sec).toBeCloseTo(85, 6);
      // conservation: optimized + savings == baseline
      expect(r.optimized_runtime_estimate_sec + r.total_estimated_savings_sec).toBeCloseTo(100, 6);
      expect(r.summary).toContain("Recommendations: 2");
      expect(r.summary).toContain("Estimated total savings: 15.0s (15.0%)");
      expect(r.summary.some((s) => /Top recommendation: throttle_relief/.test(s))).toBe(true);
    });

    it("EDGE: an empty program yields 0 recs, 0 savings, and a guarded 0% (no divide-by-zero)", () => {
      const r = opt.optimize({ blocks: [], machine: MACHINE, baselineRuntime: mkBaseline({ blocks: [], total_sec: 0 }) });
      expect(r.recommendations).toHaveLength(0);
      expect(r.total_estimated_savings_sec).toBe(0);
      expect(r.total_savings_pct).toBe(0); // total_sec>0 ? ... : 0 guard
      expect(r.optimized_runtime_estimate_sec).toBe(0);
      // baseline + recs + savings + optimized (no "Top recommendation" line when 0 recs)
      expect(r.summary).toHaveLength(4);
    });
  });

  describe("default-baseline integration (real predictor)", () => {
    it("computes its own baseline via the predictor when none is injected (conservation holds)", () => {
      const blocks: ParsedBlock[] = [
        { n: 1, motion: "G0", x: 0, y: 0, z: 5, s: 8000, m: [3] },
        { n: 2, motion: "G1", x: 50, y: 0, z: 5, f: 1000 },
        { n: 3, motion: "G1", x: 50, y: 50, z: 5, f: 1000 },
      ];
      const r = opt.optimize({ blocks, machine: MACHINE });
      expect(r.baseline_runtime.total_sec).toBeGreaterThan(0); // predict() actually ran
      // total_estimated_savings_sec is the exact sum of the per-rec savings
      const sum = r.recommendations.reduce((a, x) => a + x.estimated_savings_sec, 0);
      expect(sum).toBeCloseTo(r.total_estimated_savings_sec, 6);
      // optimized + savings reconciles to baseline regardless of which recs fired
      expect(r.optimized_runtime_estimate_sec + r.total_estimated_savings_sec)
        .toBeCloseTo(r.baseline_runtime.total_sec, 1);
    });
  });
});
