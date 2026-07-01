/**
 * MastercamStrategyEngine -- CAMX-MS3 U01 dispatcher-action methods.
 *
 * Regression coverage for the 6 camDispatcher actions (mastercam_strategy_*) that
 * called engine methods which never existed -> runtime "is not a function" crashes
 * (audit-dispatcher-engine-methods MISSING). Every assertion is an algebraic
 * invariant against the real composed MastercamCycleCatalogEngine -- no stub values.
 */

import { describe, it, expect } from "vitest";
import { mastercamStrategyEngine } from "../engines/MastercamStrategyEngine.js";
import { mastercamCycleCatalogEngine } from "../engines/MastercamCycleCatalogEngine.js";

const P_MATERIAL = { iso_group: "P" as const, hardness_hrc: 20 };
const ENDMILL = { diameter_mm: 10, flute_count: 4, type: "endmill" };

describe("MastercamStrategyEngine.recommend (mastercam_strategy_recommend)", () => {
  it("recommends a milling strategy for a pocket feature with real cutting params", () => {
    const r = mastercamStrategyEngine.recommend(
      { type: "pocket", depth_mm: 12 },
      P_MATERIAL,
      { type: "3axis_vertical" },
      ENDMILL,
      "balanced",
    );
    expect(r.success).toBe(true);
    if (!r.success) throw new Error("unreachable");
    expect(r.out_of_scope).toBe(false);
    expect(r.operation).toBe("pocketing");
    expect(r.primary.cycle_code.length).toBeGreaterThan(0);
    // Physics is real: rpm = vc*1000/(pi*D) > 0, feed derived from chipload > 0.
    expect(r.primary.params.rpm).toBeGreaterThan(0);
    expect(r.primary.params.feed_mmpm).toBeGreaterThan(0);
    expect(r.machine_type).toBe("3axis_vertical");
  });

  it("maps every supported milling feature.type to a valid operation (no crash)", () => {
    const millFeatures = [
      "bore", "contour", "face", "flat_area", "freeform_3d", "groove",
      "hole", "impeller", "pocket", "ruled_surface", "slot", "steep_wall", "thread",
    ];
    for (const type of millFeatures) {
      const r = mastercamStrategyEngine.recommend({ type }, P_MATERIAL, undefined, ENDMILL);
      expect(r.success, `feature ${type} should resolve`).toBe(true);
    }
  });

  it("returns an honest out-of-scope result for turning features (never fabricates)", () => {
    for (const type of ["turning_external", "turning_internal"]) {
      const r = mastercamStrategyEngine.recommend({ type }, P_MATERIAL, undefined, ENDMILL);
      expect(r.success).toBe(false);
      if (r.success) throw new Error("unreachable");
      expect(r.out_of_scope).toBe(true);
      expect(r.feature_type).toBe(type);
    }
  });

  it("ranks deduped alternatives -- none equal the primary, none repeated", () => {
    const r = mastercamStrategyEngine.recommend({ type: "pocket" }, P_MATERIAL, undefined, ENDMILL, "cycle_time");
    expect(r.success).toBe(true);
    if (!r.success) throw new Error("unreachable");
    const codes = r.alternatives.map((a) => a.cycle_code);
    expect(codes).not.toContain(r.primary.cycle_code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("rejects an unknown feature.type as out-of-scope rather than throwing", () => {
    const r = mastercamStrategyEngine.recommend({ type: "not_a_feature" }, P_MATERIAL);
    expect(r.success).toBe(false);
  });
});

describe("MastercamStrategyEngine.getParameters (mastercam_strategy_params)", () => {
  it("returns the exact catalog record for a known cycle code", () => {
    const known = mastercamCycleCatalogEngine.listAll()[0];
    const r = mastercamStrategyEngine.getParameters(known.code);
    expect(r.found).toBe(true);
    expect(r.cycle?.code).toBe(known.code);
  });

  it("returns honest candidates (not a fabricated record) for an unknown name", () => {
    const r = mastercamStrategyEngine.getParameters("zzz_no_such_strategy_zzz");
    expect(r.found).toBe(false);
    expect(r.cycle).toBeUndefined();
    expect(Array.isArray(r.candidates)).toBe(true);
    expect(typeof r.note).toBe("string");
  });
});

describe("MastercamStrategyEngine technology deep-dives", () => {
  it("dynamicMotionDetails mirrors the catalog's dynamic cycles exactly", () => {
    const r = mastercamStrategyEngine.dynamicMotionDetails();
    const real = mastercamCycleCatalogEngine.getDynamicCycles();
    expect(r.cycle_count).toBe(real.length);
    expect(r.cycles.every((c) => c.isDynamic)).toBe(true);
    expect(r.source).toBe("MastercamCycleCatalogEngine");
  });

  it("optiRoughDetails mirrors the catalog's opti cycles exactly", () => {
    const r = mastercamStrategyEngine.optiRoughDetails();
    const real = mastercamCycleCatalogEngine.getOptiCycles();
    expect(r.cycle_count).toBe(real.length);
    expect(r.cycles.every((c) => c.isOpti)).toBe(true);
  });

  it("profitTurningDetails reports availability honestly (flag matches cycle presence)", () => {
    const r = mastercamStrategyEngine.profitTurningDetails();
    expect(r.available).toBe(r.cycle_count > 0);
    expect(r.cycles.every((c) => c.category === "turning")).toBe(true);
    if (r.cycle_count === 0) expect(typeof r.note).toBe("string");
  });
});

describe("MastercamStrategyEngine.listStrategies (mastercam_strategy_list)", () => {
  it("lists the full catalog when no category filter is given", () => {
    const r = mastercamStrategyEngine.listStrategies();
    expect(r.category).toBe("all");
    expect(r.count).toBe(mastercamCycleCatalogEngine.listAll().length);
    expect(r.strategies.length).toBe(r.count);
  });

  it("filters drilling strategies to the drilling cycle category", () => {
    const r = mastercamStrategyEngine.listStrategies("drilling");
    expect(r.category).toBe("drilling");
    expect(r.count).toBe(mastercamCycleCatalogEngine.byCategory("drilling").length);
    expect(r.strategies.every((s) => s.category === "drilling")).toBe(true);
  });

  it("roughing filter returns the opti+dynamic cycles, deduped by code", () => {
    const r = mastercamStrategyEngine.listStrategies("roughing");
    const codes = r.strategies.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(r.strategies.every((s) => s.isOpti || s.isDynamic)).toBe(true);
  });
});
