/**
 * Tests for HSMAdvisorComparatorBridgeEngine (U-OSC9-11).
 *
 * Coverage:
 *   - Singleton + shape
 *   - Zod schema (input override, optimization_mode)
 *   - Enum translation: exact-map, caller-override, fallback-default for material_id, tool_material_id, type
 *   - state_override path (skips disk read — drives the comparison from a fixture state)
 *   - Throws on missing Cut + missing Tool
 *   - 5-axis diff: signs, percentages, abs deltas
 *   - Agreement score: identical inputs → 1.0; one large outlier → score collapses
 *   - PRISM-side missing fields → 0 + warning
 *   - Translation source tags match builtin/override/default rule
 *   - Warnings populated on unknown enum IDs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  hsmAdvisorComparatorBridgeEngine,
  HSMAdvisorComparatorBridgeEngine,
  HSMAdvisorCompareInputSchema,
} from "../engines/HSMAdvisorComparatorBridgeEngine.js";
import * as adapterMod from "../engines/HSMAdvisorAdapterEngine.js";
import * as orchMod from "../engines/SpeedFeedNineAxisOrchestratorEngine.js";
import type { HSMAdvisorState } from "../engines/HSMAdvisorAdapterEngine.js";
import type { NineAxisResult } from "../engines/SpeedFeedNineAxisOrchestratorEngine.js";

// ============================================================================
// FIXTURES
// ============================================================================

/** Live operator state shape (verified 2026-05-26): T2 Rough Turn for Steel, material_id=227, sfm=388.7, rpm=2971, mrr=2.376 */
const LIVE_STATE: HSMAdvisorState = {
  tool: {
    guid: "8ca983ce-6590-482f-8ee9-7fa49f9e5f14",
    library: "Lathe",
    comment: "T2 Rough Turn for Steel",
    id: 84,
    type: "endmill",
    diameter: 0.5,
    shank_dia: 0.5,
    flutes: 2,
    flute_len: 1,
    shoulder_len: 1,
    helix_angle: 30,
    leadangle: 90,
    corner_rad: 0,
    stickout: 1.25,
    tool_material_id: 5,
    coating_id: 1,
    productivity: 4,
    maxdeflection_pc: 70,
    maxtorque_pc: 70,
    sfm_adj: 100,
    ipt_adj: 100,
    doc: 0.875,
    woc: 0.1513359375,
    number: 2,
  },
  cut: {
    guid: "38ac9484-732a-4301-a1de-ff29c7053ce6",
    tool_guid: "8ca983ce-6590-482f-8ee9-7fa49f9e5f14",
    tool_id: 84,
    material_id: 227,
    diameter: 0.5,
    effective_dia: 0.5,
    doc: 0.875,
    woc: 0.1513359375,
    sfm: 388.703040178571,
    ipt: 0.00302,
    rpm: 2971,
    feed: 17.9448,
    mrr: 2.37623148984375,
    tool_deflection: 0.000411937838544968,
    comment: "Rough",
    operation_type: 1,
    surface_finish: 0,
    productivity: 4,
    hsm: false,
    hss: false,
    manufacturer_sfm: 0,
    manufacturer_ipt: 0,
  },
  settings: {
    sfm_pc: 100,
    ipt_pc: 100,
    deflection_limit_pc: 70,
    torque_limit_pc: 70,
    tool_performance: 1,
  },
  source_mtime_ms: 1700000000000,
  source_path: "fixture.xml",
  units_mm: false,
  warnings: [],
};

/** Stub orchestrator result with the same 5 axes the diff inspects. */
function stubResult(sfm: number, ipt: number, rpm: number, feed: number, mrr: number): NineAxisResult {
  const minimal = {
    sfc: {
      cuttingSpeed: sfm,
      feedPerTooth: ipt,
      rpm,
      feed,
      mrr,
    },
    mrr_ranking: [],
  };
  return minimal as unknown as NineAxisResult;
}

function mockOrchestrator(result: NineAxisResult) {
  return vi
    .spyOn(orchMod.speedFeedNineAxisOrchestratorEngine, "run")
    .mockImplementation(() => result);
}

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// TESTS
// ============================================================================

describe("HSMAdvisorComparatorBridgeEngine — singleton + shape", () => {
  it("exports a singleton instance of the class", () => {
    expect(hsmAdvisorComparatorBridgeEngine).toBeInstanceOf(HSMAdvisorComparatorBridgeEngine);
  });

  it("exposes run()", () => {
    expect(typeof hsmAdvisorComparatorBridgeEngine.run).toBe("function");
  });
});

describe("HSMAdvisorCompareInputSchema — Zod validation", () => {
  it("accepts empty input", () => {
    const parsed = HSMAdvisorCompareInputSchema.parse({});
    expect(parsed.material_id_to_iso).toEqual(undefined);
  });

  it("rejects bad ISO group in caller override", () => {
    expect(() =>
      HSMAdvisorCompareInputSchema.parse({ material_id_to_iso: { "227": "Z" } }),
    ).toThrow();
  });

  it("rejects bad tool material in caller override", () => {
    expect(() =>
      HSMAdvisorCompareInputSchema.parse({ tool_material_id_to_prism: { "5": "unobtanium" } }),
    ).toThrow();
  });

  it("rejects bad optimization_mode", () => {
    expect(() =>
      HSMAdvisorCompareInputSchema.parse({ optimization_mode: "rocket_fast" as unknown as "prism_optimized" }),
    ).toThrow();
  });
});

describe("HSMAdvisorComparatorBridgeEngine.run() — enum translation", () => {
  it("material_id=227 → ISO P via builtin exact-map", () => {
    mockOrchestrator(stubResult(388, 0.003, 2971, 17.9, 2.37));
    const result = hsmAdvisorComparatorBridgeEngine.run({ state_override: LIVE_STATE });
    expect(result.translation.iso_group).toBe("P");
    expect(result.translation.iso_group_source).toBe("exact-map");
  });

  it("unknown material_id → ISO P fallback + warning", () => {
    mockOrchestrator(stubResult(388, 0.003, 2971, 17.9, 2.37));
    const stateUnknown = { ...LIVE_STATE, cut: { ...LIVE_STATE.cut!, material_id: 99999 } };
    const result = hsmAdvisorComparatorBridgeEngine.run({ state_override: stateUnknown });
    expect(result.translation.iso_group).toBe("P");
    expect(result.translation.iso_group_source).toBe("fallback-default");
    expect(result.warnings.some((w) => /unknown HSMAdvisor material_id=99999/.test(w))).toBe(true);
  });

  it("caller-override beats builtin map", () => {
    mockOrchestrator(stubResult(388, 0.003, 2971, 17.9, 2.37));
    const result = hsmAdvisorComparatorBridgeEngine.run({
      state_override: LIVE_STATE,
      material_id_to_iso: { "227": "M" }, // override built-in 227→P with 227→M
    });
    expect(result.translation.iso_group).toBe("M");
    expect(result.translation.iso_group_source).toBe("caller-override");
  });

  it("tool_material_id=5 → hss via builtin", () => {
    mockOrchestrator(stubResult(388, 0.003, 2971, 17.9, 2.37));
    const result = hsmAdvisorComparatorBridgeEngine.run({ state_override: LIVE_STATE });
    expect(result.translation.tool_material).toBe("hss");
    expect(result.translation.tool_material_source).toBe("exact-map");
  });

  it("unknown tool_material_id → carbide fallback + warning", () => {
    mockOrchestrator(stubResult(388, 0.003, 2971, 17.9, 2.37));
    const state = { ...LIVE_STATE, tool: { ...LIVE_STATE.tool!, tool_material_id: 42 } };
    const result = hsmAdvisorComparatorBridgeEngine.run({ state_override: state });
    expect(result.translation.tool_material).toBe("carbide");
    expect(result.translation.tool_material_source).toBe("fallback-default");
    expect(result.warnings.some((w) => /unknown HSMAdvisor tool_material_id=42/.test(w))).toBe(true);
  });

  it("tool.type='endmill' → operation=milling via exact-map", () => {
    mockOrchestrator(stubResult(388, 0.003, 2971, 17.9, 2.37));
    const result = hsmAdvisorComparatorBridgeEngine.run({ state_override: LIVE_STATE });
    expect(result.translation.operation).toBe("milling");
    expect(result.translation.operation_source).toBe("exact-map");
  });

  it("unknown tool.type → milling fallback + warning", () => {
    mockOrchestrator(stubResult(388, 0.003, 2971, 17.9, 2.37));
    const state = { ...LIVE_STATE, tool: { ...LIVE_STATE.tool!, type: "unobtanium-cutter" } };
    const result = hsmAdvisorComparatorBridgeEngine.run({ state_override: state });
    expect(result.translation.operation).toBe("milling");
    expect(result.translation.operation_source).toBe("fallback-default");
    expect(result.warnings.some((w) => /unknown HSMAdvisor tool type="unobtanium-cutter"/.test(w))).toBe(true);
  });
});

describe("HSMAdvisorComparatorBridgeEngine.run() — guard clauses", () => {
  it("throws on missing <Cut> block", () => {
    mockOrchestrator(stubResult(0, 0, 0, 0, 0));
    const state = { ...LIVE_STATE, cut: null };
    expect(() => hsmAdvisorComparatorBridgeEngine.run({ state_override: state })).toThrow(
      /no <Cut> block — nothing to compare/,
    );
  });

  it("throws on missing <Tool> block", () => {
    mockOrchestrator(stubResult(0, 0, 0, 0, 0));
    const state = { ...LIVE_STATE, tool: null };
    expect(() => hsmAdvisorComparatorBridgeEngine.run({ state_override: state })).toThrow(
      /no <Tool> block/,
    );
  });

  it("wraps orchestrator throws with bridge-context message", () => {
    vi.spyOn(orchMod.speedFeedNineAxisOrchestratorEngine, "run").mockImplementation(() => {
      throw new Error("kc lookup failed for ISO Z");
    });
    expect(() => hsmAdvisorComparatorBridgeEngine.run({ state_override: LIVE_STATE })).toThrow(
      /PRISM NineAxisOrchestrator failed.*kc lookup failed/,
    );
  });
});

describe("HSMAdvisorComparatorBridgeEngine.run() — 5-axis diff", () => {
  it("identical inputs → all deltas 0 + agreement_score 1.0", () => {
    mockOrchestrator(stubResult(388.703040178571, 0.00302, 2971, 17.9448, 2.37623148984375));
    const result = hsmAdvisorComparatorBridgeEngine.run({ state_override: LIVE_STATE });

    for (const a of result.axes) {
      expect(a.delta_abs).toBeCloseTo(0, 9);
      expect(a.delta_pct).toBeCloseTo(0, 9);
      expect(a.axis_agreement).toBeCloseTo(1, 5);
    }
    expect(result.agreement_score).toBeCloseTo(1, 5);
  });

  it("PRISM 10% high on every axis → delta_pct = 0.10, axis_agreement = 0.8", () => {
    mockOrchestrator(stubResult(427.5733, 0.003322, 3268.1, 19.7393, 2.6139));
    const result = hsmAdvisorComparatorBridgeEngine.run({ state_override: LIVE_STATE });

    for (const a of result.axes) {
      expect(a.delta_pct).toBeCloseTo(0.1, 2);
      expect(a.axis_agreement).toBeCloseTo(0.8, 2);
    }
    expect(result.agreement_score).toBeCloseTo(0.8, 2);
  });

  it("one axis blown out (mrr 100% off) drags geometric-mean score down", () => {
    // Identical on 4 axes, mrr is 2x HSMAdvisor's value.
    mockOrchestrator(
      stubResult(388.703040178571, 0.00302, 2971, 17.9448, 2.37623148984375 * 2),
    );
    const result = hsmAdvisorComparatorBridgeEngine.run({ state_override: LIVE_STATE });

    const mrrAxis = result.axes.find((a) => a.axis === "mrr");
    expect(mrrAxis?.delta_pct).toBeCloseTo(1.0, 2);
    expect(mrrAxis?.axis_agreement).toBeCloseTo(0, 5); // 100% off ≥ 50% threshold → 0
    // 4 axes at agreement=1, 1 at agreement=0 (clamped). Geometric mean of [1,1,1,1,1e-6] ≈ 1e-6^(1/5).
    expect(result.agreement_score).toBeLessThan(0.1);
  });

  it("delta_abs sign: PRISM > HSMAdvisor → positive delta", () => {
    mockOrchestrator(stubResult(500, 0.005, 3500, 25, 5));
    const result = hsmAdvisorComparatorBridgeEngine.run({ state_override: LIVE_STATE });
    for (const a of result.axes) {
      expect(a.delta_abs).toBeGreaterThan(0);
      expect(a.prism).toBeGreaterThan(a.hsmadvisor);
    }
  });

  it("delta_abs sign: PRISM < HSMAdvisor → negative delta", () => {
    mockOrchestrator(stubResult(100, 0.001, 1000, 5, 0.5));
    const result = hsmAdvisorComparatorBridgeEngine.run({ state_override: LIVE_STATE });
    for (const a of result.axes) {
      expect(a.delta_abs).toBeLessThan(0);
    }
  });
});

describe("HSMAdvisorComparatorBridgeEngine.run() — orchestrator-side missing fields", () => {
  it("missing sfc.mrr → axis value coerces to 0 with warning", () => {
    // Stub without mrr — diff function should warn + treat axis as 0.
    const result = {
      sfc: { cuttingSpeed: 388, feedPerTooth: 0.003, rpm: 2971, feed: 17.9 /* mrr omitted */ },
      mrr_ranking: [],
    } as unknown as NineAxisResult;
    mockOrchestrator(result);

    const compare = hsmAdvisorComparatorBridgeEngine.run({ state_override: LIVE_STATE });
    expect(compare.warnings.some((w) => /sfc\.mrr.*not finite/.test(w))).toBe(true);
    const mrrAxis = compare.axes.find((a) => a.axis === "mrr");
    expect(mrrAxis?.prism).toBe(0);
  });

  it("missing entire sfc → all 5 axes warn + diff still well-defined", () => {
    const result = { sfc: {}, mrr_ranking: [] } as unknown as NineAxisResult;
    mockOrchestrator(result);

    const compare = hsmAdvisorComparatorBridgeEngine.run({ state_override: LIVE_STATE });
    // 5 axes × 3 prismVal lookups each (with fallbacks) — at minimum 5 warnings.
    expect(compare.warnings.length).toBeGreaterThanOrEqual(5);
    // every axis still has a numeric prism field (no NaN poisoning)
    for (const a of compare.axes) {
      expect(Number.isFinite(a.prism)).toBe(true);
      expect(Number.isFinite(a.delta_abs)).toBe(true);
    }
  });
});

describe("HSMAdvisorComparatorBridgeEngine.run() — disk-read path (full integration)", () => {
  it("forwards settings_path to the adapter when no state_override is provided", () => {
    const readSpy = vi
      .spyOn(adapterMod.hsmAdvisorAdapterEngine, "read")
      .mockReturnValue(LIVE_STATE);
    mockOrchestrator(stubResult(388.703040178571, 0.00302, 2971, 17.9448, 2.37623148984375));

    const result = hsmAdvisorComparatorBridgeEngine.run({ settings_path: "/some/fixture.xml" });

    expect(readSpy).toHaveBeenCalledWith({ settings_path: "/some/fixture.xml", convert_to_mm: false });
    expect(result.agreement_score).toBeCloseTo(1, 5);
  });
});

describe("HSMAdvisorComparatorBridgeEngine.run() — invariants", () => {
  it("returns 5 axes in canonical order: sfm, ipt, rpm, feed, mrr", () => {
    mockOrchestrator(stubResult(388.703040178571, 0.00302, 2971, 17.9448, 2.37623148984375));
    const result = hsmAdvisorComparatorBridgeEngine.run({ state_override: LIVE_STATE });
    expect(result.axes.map((a) => a.axis)).toEqual(["sfm", "ipt", "rpm", "feed", "mrr"]);
  });

  it("agreement_score ∈ [0, 1]", () => {
    mockOrchestrator(stubResult(0, 0, 0, 0, 0)); // PRISM is 0 on everything, hsma values stand → big delta
    const result = hsmAdvisorComparatorBridgeEngine.run({ state_override: LIVE_STATE });
    expect(result.agreement_score).toBeGreaterThanOrEqual(0);
    expect(result.agreement_score).toBeLessThanOrEqual(1);
  });

  it("preserves the HSMAdvisor state in the result for caller inspection", () => {
    mockOrchestrator(stubResult(388.703040178571, 0.00302, 2971, 17.9448, 2.37623148984375));
    const result = hsmAdvisorComparatorBridgeEngine.run({ state_override: LIVE_STATE });
    expect(result.hsmadvisor_state.cut?.guid).toBe(LIVE_STATE.cut!.guid);
    expect(result.hsmadvisor_state.tool?.guid).toBe(LIVE_STATE.tool!.guid);
  });

  it("axis_agreement formula: 1 - clamp01(|delta_pct|/0.5) — boundary at 50% off", () => {
    // PRISM exactly 50% high on sfm → delta_pct = 0.5 → axis_agreement = 0
    mockOrchestrator(stubResult(388.703040178571 * 1.5, 0.00302, 2971, 17.9448, 2.37623148984375));
    const result = hsmAdvisorComparatorBridgeEngine.run({ state_override: LIVE_STATE });
    const sfmAxis = result.axes.find((a) => a.axis === "sfm");
    expect(sfmAxis?.delta_pct).toBeCloseTo(0.5, 5);
    expect(sfmAxis?.axis_agreement).toBeCloseTo(0, 5);
  });
});
