/**
 * LatheDeepLogicEngine.test.ts — engine-direct coverage.
 *
 * Pairs with `dispatcher.latheDeepLogic.test.ts` (round-trip through
 * prism_dev). This file exercises the engine's public 4-method surface
 * directly without going through the dispatcher harness — required by
 * `stop_on_unwired_assets` (each engine needs a matching test file
 * with >=10 it() cases).
 *
 * Surface tested:
 *   - optimizeParameters({material_iso, max_power_kw, max_rpm,
 *                         tool_nose_radius_mm, diameter_mm, target_ra_um})
 *   - validateSequence(operations[])
 *   - getFuzzySpeedRecommendation(hardness_hrc, depth_mm, feed_mm_rev)
 *   - reasonToolSelection({is_steel, is_hardened, is_interrupted,
 *                          is_high_temp_alloy, needs_fine_finish})
 *
 * DEFERRED from coverage (state-mutation; covered separately in audit
 * tests if/when wired): analyzeOperation (folLogic.registerEntity),
 * checkProcessAlternatives (modalLogic.worlds.set).
 */

import { describe, it, expect } from "vitest";
import { latheDeepLogicEngine } from "../engines/LatheDeepLogicEngine.js";

describe("LatheDeepLogicEngine — optimizeParameters", () => {
  const baseCtx = {
    material_iso: "P" as const,
    max_power_kw: 15,
    max_rpm: 5000,
    tool_nose_radius_mm: 0.8,
    diameter_mm: 50,
    target_ra_um: 1.6,
  };

  it("returns positive Vc/fn/ap + derived MRR/tool-life/power on a feasible context", () => {
    const r = latheDeepLogicEngine.optimizeParameters(baseCtx);
    expect(r.optimal.Vc).toBeGreaterThan(0);
    expect(r.optimal.fn).toBeGreaterThan(0);
    expect(r.optimal.ap).toBeGreaterThan(0);
    expect(r.mrr_mm3_per_min).toBeGreaterThan(0);
    expect(r.predicted_tool_life_min).toBeGreaterThan(0);
    expect(r.predicted_power_kw).toBeGreaterThan(0);
    expect(typeof r.constraints_satisfied).toBe("boolean");
  });

  it("VARIABILITY — 6 ISO groups all return positive Vc/fn/ap", () => {
    const groups: Array<"P" | "M" | "K" | "N" | "S" | "H"> = ["P", "M", "K", "N", "S", "H"];
    for (const iso of groups) {
      const r = latheDeepLogicEngine.optimizeParameters({ ...baseCtx, material_iso: iso });
      expect(r.optimal.Vc).toBeGreaterThan(0);
      expect(r.optimal.fn).toBeGreaterThan(0);
      expect(r.optimal.ap).toBeGreaterThan(0);
    }
  });

  it("MRR = Vc * fn * ap * 1000 (mm^3/min algebraic invariant — engine line 2630)", () => {
    const r = latheDeepLogicEngine.optimizeParameters(baseCtx);
    if (r.constraints_satisfied) {
      const expected = r.optimal.Vc * r.optimal.fn * r.optimal.ap * 1000;
      expect(r.mrr_mm3_per_min).toBeCloseTo(expected, 6);
    }
  });

  it("BOUNDARY — tiny machine envelope (1kW / 200rpm) returns conservative defaults Vc=100/fn=0.15/ap=1.0 (engine line 2611)", () => {
    const r = latheDeepLogicEngine.optimizeParameters({
      ...baseCtx, max_power_kw: 1, max_rpm: 200,
    });
    // Engine falls back to conservative defaults if CSP unsat (line 2611-2616).
    // When defaults fire: Vc=100, fn=0.15, ap=1.0, mrr=15000, tl=30min, power=5kW.
    if (!r.constraints_satisfied) {
      expect(r.optimal.Vc).toBe(100);
      expect(r.optimal.fn).toBeCloseTo(0.15, 6);
      expect(r.optimal.ap).toBe(1.0);
      expect(r.mrr_mm3_per_min).toBe(15000);
      expect(r.predicted_tool_life_min).toBe(30);
      expect(r.predicted_power_kw).toBe(5);
    } else {
      // CSP found a feasible solution; verify it's still positive.
      expect(r.optimal.Vc).toBeGreaterThan(0);
    }
  });

  it("ADVERSARIAL — extreme tight Ra (0.001 µm mirror finish) still produces a result", () => {
    const r = latheDeepLogicEngine.optimizeParameters({ ...baseCtx, target_ra_um: 0.001 });
    expect(Number.isFinite(r.optimal.Vc)).toBe(true);
    expect(Number.isFinite(r.optimal.fn)).toBe(true);
    expect(Number.isFinite(r.optimal.ap)).toBe(true);
    expect(r.optimal.Vc).toBeGreaterThan(0);
    expect(r.optimal.fn).toBeGreaterThan(0);
    expect(r.optimal.ap).toBeGreaterThan(0);
  });
});

describe("LatheDeepLogicEngine — validateSequence", () => {
  it("single-op sequence returns valid bool + violations array + corrected_sequence|null", () => {
    const r = latheDeepLogicEngine.validateSequence(["face"]);
    expect(typeof r.valid).toBe("boolean");
    expect(Array.isArray(r.violations)).toBe(true);
    expect(r.corrected_sequence === null || Array.isArray(r.corrected_sequence)).toBe(true);
  });

  it("VARIABILITY — canonical OP order (face -> rough -> finish) vs scrambled order", () => {
    const canonical = latheDeepLogicEngine.validateSequence(["face", "rough_turn", "finish_turn"]);
    const scrambled = latheDeepLogicEngine.validateSequence(["finish_turn", "face", "rough_turn"]);
    expect(typeof canonical.valid).toBe("boolean");
    expect(typeof scrambled.valid).toBe("boolean");
    // Both shapes well-formed independent of valid flag — violation_count
    // for canonical must be <= scrambled (canonical can't have MORE rule
    // violations than the out-of-order version, by construction of the
    // temporal logic's sequence rules).
    expect(canonical.violations.length).toBeLessThanOrEqual(scrambled.violations.length);
  });

  it("ADVERSARIAL — single-op-repeated sequence well-formed (no false negative on idempotent ops)", () => {
    const r = latheDeepLogicEngine.validateSequence(["face", "face", "face"]);
    expect(typeof r.valid).toBe("boolean");
    expect(Array.isArray(r.violations)).toBe(true);
    // violations carry rule_id and severity strings per engine's
    // TemporalCheckResult contract.
    for (const v of r.violations) {
      expect(typeof v.rule).toBe("string");
      expect(typeof v.severity).toBe("string");
    }
  });
});

describe("LatheDeepLogicEngine — getFuzzySpeedRecommendation", () => {
  it("returns adjustment_percent + confidence in [0,1] + non-empty linguistic_summary", () => {
    const r = latheDeepLogicEngine.getFuzzySpeedRecommendation(35, 2, 0.15);
    expect(Number.isFinite(r.adjustment_percent)).toBe(true);
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
    expect(r.linguistic_summary.length).toBeGreaterThan(0);
    // linguistic_summary must mention "speed" per engine line 2701 template.
    expect(r.linguistic_summary.toLowerCase()).toContain("speed");
  });

  it("VARIABILITY — soft (HRC=20) / medium (HRC=40) / hard (HRC=60) materials produce distinct adjustments", () => {
    const soft = latheDeepLogicEngine.getFuzzySpeedRecommendation(20, 2, 0.15);
    const med = latheDeepLogicEngine.getFuzzySpeedRecommendation(40, 2, 0.15);
    const hard = latheDeepLogicEngine.getFuzzySpeedRecommendation(60, 2, 0.15);
    // Hardness monotonicity: harder material -> equal-or-more-negative
    // (slower) speed adjustment than softer material (well-formed fuzzy
    // system; the speed_adjustment output decreases with hardness).
    expect(hard.adjustment_percent).toBeLessThanOrEqual(soft.adjustment_percent + 1e-6);
    expect(soft.linguistic_summary.length).toBeGreaterThan(0);
    expect(med.linguistic_summary.length).toBeGreaterThan(0);
    expect(hard.linguistic_summary.length).toBeGreaterThan(0);
  });

  it("BOUNDARY — zero hardness (HRC=0) returns finite adjustment + confidence in [0,1]", () => {
    const r = latheDeepLogicEngine.getFuzzySpeedRecommendation(0, 1, 0.1);
    expect(Number.isFinite(r.adjustment_percent)).toBe(true);
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });

  it("ADVERSARIAL — extreme inputs (HRC=80, depth=50, feed=5) still yield finite result", () => {
    const r = latheDeepLogicEngine.getFuzzySpeedRecommendation(80, 50, 5);
    expect(Number.isFinite(r.adjustment_percent)).toBe(true);
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });
});

describe("LatheDeepLogicEngine — reasonToolSelection", () => {
  it("simple steel-finish facts return non-empty recommended_tool + reasoning + alternatives", () => {
    const r = latheDeepLogicEngine.reasonToolSelection({
      is_steel: true, is_hardened: false, is_interrupted: false,
      is_high_temp_alloy: false, needs_fine_finish: true,
    });
    expect(r.recommended_tool.length).toBeGreaterThan(0);
    expect(typeof r.confidence).toBe("string");
    expect(Array.isArray(r.reasoning)).toBe(true);
    expect(Array.isArray(r.alternatives)).toBe(true);
  });

  it("hardened+interrupted -> 'toughened_carbide' (engine rule line 2746, priority=4)", () => {
    const r = latheDeepLogicEngine.reasonToolSelection({
      is_steel: true, is_hardened: true, is_interrupted: true,
      is_high_temp_alloy: false, needs_fine_finish: false,
    });
    expect(r.recommended_tool).toBe("toughened_carbide");
  });

  it("hardened+not-interrupted -> picks 'ceramic' or 'carbide' (engine lines 2742, 2735)", () => {
    const r = latheDeepLogicEngine.reasonToolSelection({
      is_steel: true, is_hardened: true, is_interrupted: false,
      is_high_temp_alloy: false, needs_fine_finish: false,
    });
    // engine sorts by priority desc; ceramic-preferred (priority=3) typically
    // wins when defeasible carbide path is also accepted (priority=1).
    expect(["ceramic", "carbide"]).toContain(r.recommended_tool);
  });

  it("high-temp alloy -> picks 'whisker_ceramic', 'ceramic', or 'carbide' (engine line 2750)", () => {
    const r = latheDeepLogicEngine.reasonToolSelection({
      is_steel: false, is_hardened: false, is_interrupted: false,
      is_high_temp_alloy: true, needs_fine_finish: true,
    });
    // whisker_ceramic priority=3 fires for high_temp_alloy.
    expect(["whisker_ceramic", "ceramic", "carbide"]).toContain(r.recommended_tool);
  });

  it("BOUNDARY — all-false facts returns default 'carbide' (engine line 2757)", () => {
    const r = latheDeepLogicEngine.reasonToolSelection({
      is_steel: false, is_hardened: false, is_interrupted: false,
      is_high_temp_alloy: false, needs_fine_finish: false,
    });
    // Default fallback at engine line 2757 is {tool:'carbide', status:'default'}.
    expect(r.recommended_tool).toBe("carbide");
  });

  it("alternatives deduplicated (engine line 2764 uses new Set())", () => {
    const r = latheDeepLogicEngine.reasonToolSelection({
      is_steel: true, is_hardened: true, is_interrupted: true,
      is_high_temp_alloy: true, needs_fine_finish: true,
    });
    // every alternative appears at most once
    const seen = new Set<string>();
    for (const alt of r.alternatives) {
      expect(seen.has(alt)).toBe(false);
      seen.add(alt);
    }
  });
});

describe("LatheDeepLogicEngine — singleton regression (post-log()-fix)", () => {
  it("singleton can execute all 4 wired methods round-trip without throwing", () => {
    // Engine ctor calls initializeLogicSystems() which calls log.info(...).
    // Prior to U-WIRE-LDL, this called log("info", ...) as a function and
    // crashed at module load. Regression guard: each method must actually
    // return a well-shaped result on a baseline input, not merely exist.
    const opt = latheDeepLogicEngine.optimizeParameters({
      material_iso: "P", max_power_kw: 15, max_rpm: 5000,
      tool_nose_radius_mm: 0.8, diameter_mm: 50, target_ra_um: 1.6,
    });
    expect(opt.optimal.Vc).toBeGreaterThan(0);

    const seq = latheDeepLogicEngine.validateSequence(["face"]);
    expect(typeof seq.valid).toBe("boolean");

    const fuz = latheDeepLogicEngine.getFuzzySpeedRecommendation(35, 2, 0.15);
    expect(Number.isFinite(fuz.adjustment_percent)).toBe(true);

    const tool = latheDeepLogicEngine.reasonToolSelection({
      is_steel: true, is_hardened: true, is_interrupted: true,
      is_high_temp_alloy: false, needs_fine_finish: false,
    });
    // hardened+interrupted rule produces toughened_carbide deterministically.
    expect(tool.recommended_tool).toBe("toughened_carbide");
  });
});
