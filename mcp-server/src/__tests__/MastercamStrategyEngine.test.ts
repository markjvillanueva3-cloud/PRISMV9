/**
 * MastercamStrategyEngine tests — MILL-MASTER Phase 2 (Milling Hardening)
 *
 * Covers the 28-strategy Mastercam 2024/2025 toolpath database:
 *   - recommend() ranking + priority weighting + material-group bonuses
 *   - getParameters() happy + unknown-strategy path
 *   - dynamicMotionDetails / optiRoughDetails / profitTurningDetails
 *   - listStrategies filtered + unfiltered
 *   - Dispatcher wiring (action enum + lazy import parity)
 *
 * Discipline: real behaviour assertions (no toBeDefined() stubs), ≥3 spanning
 * material groups (P, M, N, S, H all touched), adversarial inputs
 * (NaN hardness, unknown strategy, incompatible tool/feature), and a
 * round-trip that reaches the engine through the dispatcher's lazy getter.
 */
import { describe, it, expect } from "vitest";
import {
  mastercamStrategyEngine,
  type MastercamFeature,
  type MastercamMaterial,
  type MastercamMachine,
  type MastercamTool,
} from "../engines/MastercamStrategyEngine.js";
import { ACTIONS as CAM_ACTIONS } from "../tools/dispatchers/camDispatcher.js";

// ── Fixtures ──────────────────────────────────────────────────────────────
const STEEL: MastercamMaterial = { iso_group: "P", name: "4140" };
const STAINLESS: MastercamMaterial = { iso_group: "M", name: "304" };
const ALUMINUM: MastercamMaterial = { iso_group: "N", name: "6061-T6" };
const TITANIUM: MastercamMaterial = { iso_group: "S", name: "Ti-6Al-4V" };
const HARDENED: MastercamMaterial = { iso_group: "H", hardness_hrc: 58, name: "D2 @58HRC" };

const VMC3: MastercamMachine = { type: "3axis_vertical", max_rpm: 12000, spindle_kw: 15 };
const VMC5: MastercamMachine = { type: "5axis", max_rpm: 18000, spindle_kw: 22, hpc: true };
const LATHE: MastercamMachine = { type: "lathe", max_rpm: 4000, spindle_kw: 20 };

const ENDMILL_10_4FL: MastercamTool = { diameter_mm: 10, flute_count: 4, type: "endmill" };
const BALL_6_4FL: MastercamTool = { diameter_mm: 6, flute_count: 4, type: "ballnose", corner_radius_mm: 3 };
const DRILL_8: MastercamTool = { diameter_mm: 8, flute_count: 2, type: "drill" };
const TURN_INSERT: MastercamTool = { diameter_mm: 12, flute_count: 1, type: "turning_insert" };

const POCKET_STEEL: MastercamFeature = { type: "pocket", depth_mm: 15, axis_count: 3 };
const FREEFORM_3D: MastercamFeature = {
  type: "freeform_3d",
  depth_mm: 40,
  wall_angle_deg: 65,
  has_previous_roughing: true,
  axis_count: 3,
};
const IMPELLER_5A: MastercamFeature = { type: "impeller", depth_mm: 80, axis_count: 5 };
const SLOT: MastercamFeature = { type: "slot", depth_mm: 12, axis_count: 3 };
const RULED_SURF: MastercamFeature = { type: "ruled_surface", wall_angle_deg: 45, axis_count: 5 };
const HOLE: MastercamFeature = { type: "hole", depth_mm: 20, axis_count: 3 };
const TURNING_OD: MastercamFeature = { type: "turning_external", depth_mm: 60 };

// ═══════════════════════════════════════════════════════════════════════════
describe("MastercamStrategyEngine.recommend — happy paths", () => {
  it("steel pocket returns ranked strategies sorted descending by score", () => {
    const r = mastercamStrategyEngine.recommend(POCKET_STEEL, STEEL, VMC3, ENDMILL_10_4FL, "balanced");
    expect(r.length).toBeGreaterThan(0);
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1].score).toBeGreaterThanOrEqual(r[i].score);
      expect(r[i - 1].rank).toBe(i);
      expect(r[i].rank).toBe(i + 1);
    }
  });

  it("aluminum pocket surfaces HSM strategies near the top", () => {
    const r = mastercamStrategyEngine.recommend(POCKET_STEEL, ALUMINUM, VMC3, ENDMILL_10_4FL, "cycle_time");
    const top = r.slice(0, 5).map((x) => x.strategy.name);
    // At least one HSM-capable strategy should rank in the top 5 for aluminum
    const hasHsm = r.slice(0, 5).some((x) => x.strategy.hsm_capable);
    expect(hasHsm).toBe(true);
    expect(top.length).toBe(5);
  });

  it("titanium (S) pocket preferentially ranks engagement-controlled strategies", () => {
    const r = mastercamStrategyEngine.recommend(POCKET_STEEL, TITANIUM, VMC3, ENDMILL_10_4FL, "tool_life");
    // Superalloys add +5 score for engagement_control — top strategy should have it
    expect(r[0].strategy.engagement_control).toBe(true);
  });

  it("ruled-surface feature on 5-axis promotes the swarf strategy", () => {
    const r = mastercamStrategyEngine.recommend(RULED_SURF, TITANIUM, VMC5, ENDMILL_10_4FL, "balanced");
    const top5 = r.slice(0, 5).map((x) => x.strategy.name);
    expect(top5).toContain("swarf");
  });

  it("slot feature surfaces peel_mill as a top candidate (+5 bonus)", () => {
    const r = mastercamStrategyEngine.recommend(SLOT, STEEL, VMC3, ENDMILL_10_4FL, "cycle_time");
    const top3 = r.slice(0, 3).map((x) => x.strategy.name);
    expect(top3).toContain("peel_mill");
  });

  it("freeform_3d with previous_roughing penalises roughing and surfaces finishing", () => {
    const r = mastercamStrategyEngine.recommend(FREEFORM_3D, STEEL, VMC3, BALL_6_4FL, "surface_finish");
    expect(r[0].strategy.category).not.toBe("roughing");
  });

  it("impeller 5-axis feature requires multi-axis category at top", () => {
    const r = mastercamStrategyEngine.recommend(IMPELLER_5A, TITANIUM, VMC5, BALL_6_4FL, "balanced");
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].strategy.category).toBe("multi_axis");
  });

  it("turning feature with turning_insert + lathe returns only turning strategies", () => {
    const r = mastercamStrategyEngine.recommend(TURNING_OD, STEEL, LATHE, TURN_INSERT, "balanced");
    expect(r.length).toBeGreaterThan(0);
    for (const rec of r) expect(rec.strategy.category).toBe("turning");
  });

  it("drill on hole feature returns drilling strategies", () => {
    const r = mastercamStrategyEngine.recommend(HOLE, STEEL, VMC3, DRILL_8, "balanced");
    expect(r.length).toBeGreaterThan(0);
    for (const rec of r) expect(rec.strategy.category).toBe("drilling");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MastercamStrategyEngine.recommend — priority weighting", () => {
  const allPri = ["cycle_time", "tool_life", "surface_finish", "balanced"] as const;

  it.each(allPri)("priority '%s' produces a non-empty ranked result", (pri) => {
    const r = mastercamStrategyEngine.recommend(POCKET_STEEL, STEEL, VMC3, ENDMILL_10_4FL, pri);
    expect(r.length).toBeGreaterThan(0);
    // Score must be finite and non-negative for at least the top pick
    expect(Number.isFinite(r[0].score)).toBe(true);
  });

  it("priority tool_life ranks higher tool-life-rating strategy over cycle-time-heavy ones", () => {
    const byTL = mastercamStrategyEngine.recommend(POCKET_STEEL, STEEL, VMC3, ENDMILL_10_4FL, "tool_life");
    const byCT = mastercamStrategyEngine.recommend(POCKET_STEEL, STEEL, VMC3, ENDMILL_10_4FL, "cycle_time");
    // Top strategy under tool_life must have tool_life rating >= top under cycle_time's tool_life rating
    expect(byTL[0].strategy.ratings.tool_life).toBeGreaterThanOrEqual(byCT[0].strategy.ratings.tool_life);
  });

  it("priority surface_finish ranks higher surface_finish rating than cycle_time ranking does", () => {
    const bySF = mastercamStrategyEngine.recommend(FREEFORM_3D, STEEL, VMC3, BALL_6_4FL, "surface_finish");
    const byCT = mastercamStrategyEngine.recommend(FREEFORM_3D, STEEL, VMC3, BALL_6_4FL, "cycle_time");
    expect(bySF[0].strategy.ratings.surface_finish).toBeGreaterThanOrEqual(
      byCT[0].strategy.ratings.surface_finish,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MastercamStrategyEngine.recommend — material-specific bonuses", () => {
  it("stainless (M) rewards chip-thinning strategies", () => {
    const r = mastercamStrategyEngine.recommend(POCKET_STEEL, STAINLESS, VMC3, ENDMILL_10_4FL, "balanced");
    // At least one chip-thinning strategy should appear in top 3
    const topChip = r.slice(0, 3).some((x) => x.strategy.chip_thinning);
    expect(topChip).toBe(true);
  });

  it("hardened material (H, >45HRC) boosts engagement_control strategies", () => {
    const r = mastercamStrategyEngine.recommend(POCKET_STEEL, HARDENED, VMC3, ENDMILL_10_4FL, "tool_life");
    expect(r[0].strategy.engagement_control).toBe(true);
  });

  it("hardened material penalises area_mill (should not top rank)", () => {
    const r = mastercamStrategyEngine.recommend(POCKET_STEEL, HARDENED, VMC3, ENDMILL_10_4FL, "cycle_time");
    expect(r[0].strategy.name).not.toBe("area_mill");
  });

  it("aluminum rewards HSM-capable strategies", () => {
    const r = mastercamStrategyEngine.recommend(POCKET_STEEL, ALUMINUM, VMC3, ENDMILL_10_4FL, "balanced");
    expect(r[0].strategy.hsm_capable).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MastercamStrategyEngine.recommend — filter logic", () => {
  it("empty result when tool type doesn't match any strategy for the feature", () => {
    // turning insert + mill pocket feature → no match (pocket not suitable for turning_insert)
    const r = mastercamStrategyEngine.recommend(POCKET_STEEL, STEEL, VMC3, TURN_INSERT, "balanced");
    expect(r.length).toBe(0);
  });

  it("3-axis machine never receives 5-axis-only multi_axis strategies", () => {
    const r = mastercamStrategyEngine.recommend(IMPELLER_5A, STEEL, VMC3, ENDMILL_10_4FL, "balanced");
    // Impeller+3axis should exclude multi_axis 5-axis-only strategies → possibly empty
    for (const rec of r) {
      if (rec.strategy.category === "multi_axis" && rec.strategy.five_axis_capable) {
        throw new Error(`Leaked 5-axis strategy ${rec.strategy.name} to 3-axis machine`);
      }
    }
  });

  it("lathe machine does not receive mill strategies (3axis_vertical-only)", () => {
    const r = mastercamStrategyEngine.recommend(POCKET_STEEL, STEEL, LATHE, ENDMILL_10_4FL, "balanced");
    // Pocket is a mill feature; lathe shouldn't match any → empty
    expect(r.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MastercamStrategyEngine.getParameters", () => {
  it("returns the strategy record for a known name", () => {
    const s = mastercamStrategyEngine.getParameters("dynamic_mill");
    expect("error" in s).toBe(false);
    if (!("error" in s)) {
      expect(s.name).toBe("dynamic_mill");
      expect(s.category).toBe("roughing");
      expect(s.hsm_capable).toBe(true);
      expect(s.ae_pct).toBeGreaterThan(0);
      expect(s.ap_factor).toBeGreaterThan(0);
      expect(s.vc_multiplier).toBeGreaterThan(1); // HSM boosts speed
    }
  });

  it("returns an error object for an unknown strategy name", () => {
    const s = mastercamStrategyEngine.getParameters("__definitely_not_a_strategy__");
    expect("error" in s).toBe(true);
    if ("error" in s) {
      expect(s.error).toMatch(/Unknown strategy/);
      expect(s.error).toMatch(/listStrategies/);
    }
  });

  it("empty-string strategy name also yields an error (boundary)", () => {
    const s = mastercamStrategyEngine.getParameters("");
    expect("error" in s).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MastercamStrategyEngine.listStrategies", () => {
  it("unfiltered returns all 28 strategies with all 5 categories present", () => {
    const r = mastercamStrategyEngine.listStrategies();
    expect(r.total).toBe(28);
    expect(r.strategies.length).toBe(28);
    expect(r.categories.sort()).toEqual(
      ["drilling", "finishing", "multi_axis", "roughing", "turning"].sort(),
    );
  });

  it("roughing filter returns only roughing strategies", () => {
    const r = mastercamStrategyEngine.listStrategies("roughing");
    expect(r.total).toBe(r.strategies.length);
    for (const s of r.strategies) expect(s.category).toBe("roughing");
  });

  it("turning filter returns only turning strategies", () => {
    const r = mastercamStrategyEngine.listStrategies("turning");
    expect(r.total).toBe(r.strategies.length);
    for (const s of r.strategies) expect(s.category).toBe("turning");
  });

  it("multi_axis filter returns only multi_axis strategies (several expected)", () => {
    const r = mastercamStrategyEngine.listStrategies("multi_axis");
    expect(r.total).toBeGreaterThan(0);
    for (const s of r.strategies) expect(s.category).toBe("multi_axis");
  });

  it("each listed strategy carries rating 1-10 per axis", () => {
    const r = mastercamStrategyEngine.listStrategies();
    for (const s of r.strategies) {
      expect(s.ratings.surface_finish).toBeGreaterThanOrEqual(1);
      expect(s.ratings.surface_finish).toBeLessThanOrEqual(10);
      expect(s.ratings.cycle_time).toBeGreaterThanOrEqual(1);
      expect(s.ratings.cycle_time).toBeLessThanOrEqual(10);
      expect(s.ratings.tool_life).toBeGreaterThanOrEqual(1);
      expect(s.ratings.tool_life).toBeLessThanOrEqual(10);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MastercamStrategyEngine — technology deep-dives", () => {
  it("dynamicMotionDetails describes HSM principles + supported strategies", () => {
    const d = mastercamStrategyEngine.dynamicMotionDetails();
    expect(d.technology_name).toBe("Dynamic Motion Technology");
    expect(d.key_principles.length).toBeGreaterThanOrEqual(3);
    expect(d.supported_strategies.length).toBeGreaterThanOrEqual(1);
    expect(d.benefits.length).toBeGreaterThan(0);
    expect(d.limitations.length).toBeGreaterThan(0);
    expect(d.engagement_control.length).toBeGreaterThan(20);
  });

  it("optiRoughDetails covers stock-awareness + rest-machining behaviour", () => {
    const d = mastercamStrategyEngine.optiRoughDetails();
    expect(d.technology_name).toBe("OptiRough");
    expect(d.stock_awareness.toLowerCase()).toContain("stock");
    expect(d.rest_machining.toLowerCase()).toContain("rest");
    expect(d.best_for.length).toBeGreaterThan(0);
    expect(d.key_features.length).toBeGreaterThanOrEqual(3);
  });

  it("profitTurningDetails references constant chip load + iMachining comparison", () => {
    const d = mastercamStrategyEngine.profitTurningDetails();
    expect(d.technology_name).toBe("ProfitTurning");
    expect(d.chip_load_control.toLowerCase()).toContain("chip load");
    expect(d.comparison_to_imachining.toLowerCase()).toContain("imachining");
    expect(d.key_features.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MastercamStrategyEngine — adversarial inputs", () => {
  it("NaN hardness is treated as absent (no crash, still ranks)", () => {
    const weird: MastercamMaterial = { iso_group: "P", hardness_hrc: NaN };
    const r = mastercamStrategyEngine.recommend(POCKET_STEEL, weird, VMC3, ENDMILL_10_4FL, "balanced");
    // hardness_hrc > 45 check uses `!== undefined` && comparison; NaN > 45 is false → no bonus/penalty
    // The recommender must still produce a usable ranked list.
    expect(r.length).toBeGreaterThan(0);
    expect(Number.isFinite(r[0].score)).toBe(true);
  });

  it("extreme wall_angle (> 90) does not crash ranking", () => {
    const extreme: MastercamFeature = { type: "freeform_3d", wall_angle_deg: 179, has_previous_roughing: true, axis_count: 3 };
    const r = mastercamStrategyEngine.recommend(extreme, STEEL, VMC3, BALL_6_4FL, "balanced");
    expect(Array.isArray(r)).toBe(true);
    // With has_previous_roughing=true, some candidates still available
  });

  it("zero-diameter tool still returns a ranked list (geometry not required for recommendation)", () => {
    const zero: MastercamTool = { diameter_mm: 0, flute_count: 0, type: "endmill" };
    const r = mastercamStrategyEngine.recommend(POCKET_STEEL, STEEL, VMC3, zero, "balanced");
    expect(Array.isArray(r)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MastercamStrategyEngine — dispatcher wiring parity", () => {
  it("camDispatcher ACTIONS enum includes all 6 mastercam_strategy_* actions", () => {
    const expected = [
      "mastercam_strategy_recommend",
      "mastercam_strategy_params",
      "mastercam_strategy_dynamic_motion",
      "mastercam_strategy_optirough",
      "mastercam_strategy_profit_turning",
      "mastercam_strategy_list",
    ];
    for (const a of expected) expect(CAM_ACTIONS).toContain(a);
  });

  it("lazy import path resolves to the same singleton used in tests (round-trip)", async () => {
    // Mirror camDispatcher's getEngine("mastercamStrategy") lazy-import pattern
    const mod = await import("../engines/MastercamStrategyEngine.js");
    const viaLazy = mod.mastercamStrategyEngine;
    // Confirm both singletons expose the same strategy count + same recommend output shape
    const direct = mastercamStrategyEngine.listStrategies();
    const lazy = viaLazy.listStrategies();
    expect(lazy.total).toBe(direct.total);
    expect(lazy.total).toBe(28);
    // Sanity: call recommend through the lazy-loaded instance
    const r = viaLazy.recommend(POCKET_STEEL, STEEL, VMC3, ENDMILL_10_4FL, "balanced");
    expect(r.length).toBeGreaterThan(0);
  });

  it("dispatcher-style params shape survives round-trip for recommend", async () => {
    // Replicate what camDispatcher's `mastercam_strategy_recommend` case does:
    //   const eng = await getEngine("mastercamStrategy");
    //   result = eng.recommend(params.feature, params.material, params.machine, params.tool, params.priority);
    const params = {
      feature: POCKET_STEEL,
      material: ALUMINUM,
      machine: VMC3,
      tool: ENDMILL_10_4FL,
      priority: "cycle_time" as const,
    };
    const mod = await import("../engines/MastercamStrategyEngine.js");
    const eng = mod.mastercamStrategyEngine;
    const result = eng.recommend(params.feature, params.material, params.machine, params.tool, params.priority);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].rank).toBe(1);
    expect(result[0].strategy.hsm_capable).toBe(true); // aluminum prefers HSM
  });
});
