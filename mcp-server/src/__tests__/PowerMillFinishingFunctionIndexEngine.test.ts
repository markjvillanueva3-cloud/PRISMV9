/**
 * PowerMillFinishingFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM44
 *
 * Coverage:
 *   - schema invariants: 12 ops, 180 params, 5 categories, 6 topics
 *   - per-op reference values + parameter-count consistency
 *   - variability: 5 categories present; threshold defaults / strategy enums verified
 *   - engine methods: real invocation + failure + adversarial NaN/Infinity
 *   - recommendByFeature: 12 intents end-to-end + default fallback
 *   - classifySurfaceSteepShallow: 3 zone boundaries + overlap-band + adversarial
 *   - stepoverForCuspTarget: textbook inverse equation + algebraic invariants + adversarial
 *   - pencilTraceFeasibility: feasible / not feasible boundary + adversarial
 *   - dispatcher round-trip via registerCamDispatcher(stub)
 */

import { describe, it, expect, beforeAll } from "vitest";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

function makeStub() {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
      tools.push({ name, handler });
    },
  };
}

let dispatchCam: CapturedTool["handler"];

beforeAll(async () => {
  const { registerCamDispatcher } = await import(
    "../tools/dispatchers/camDispatcher.js"
  );
  const stub = makeStub();
  registerCamDispatcher(stub as any);
  const tool = stub.tools.find((t) => t.name === "prism_cam");
  if (!tool) throw new Error("prism_cam not registered");
  dispatchCam = tool.handler;
});

async function invoke(action: string, params: Record<string, unknown> = {}) {
  const res: any = await dispatchCam({ action, params });
  if (res && Array.isArray(res.content) && res.content[0]?.text) {
    try {
      return JSON.parse(res.content[0].text);
    } catch {
      return { __raw: res.content[0].text };
    }
  }
  return res;
}

describe("PowerMillFinishingFunctionIndexEngine — engine + dispatcher", () => {
  it("getSummary returns exactly 12 ops / 180 params / 5 categories / powermill/finishing", async () => {
    const { PowerMillFinishingFunctionIndexEngine } = await import(
      "../engines/PowerMillFinishingFunctionIndexEngine.js"
    );
    const s: any = PowerMillFinishingFunctionIndexEngine.getSummary();
    expect(s.system_id).toBe("powermill");
    expect(s.section_key).toBe("finishing");
    expect(s.total_operations).toBe(12);
    expect(s.total_parameters).toBe(180);
    expect(s.categories).toHaveLength(5);
    expect(s.training_topics_count).toBe(6);
  });

  it.each([
    ["steep_and_shallow", "steep_shallow", 21],
    ["optimised_constant_z", "steep_shallow", 18],
    ["constant_z", "constant_z", 18],
    ["constant_z_rest", "constant_z", 13],
    ["offset_3d", "offset_3d", 18],
    ["offset_3d_rest", "offset_3d", 13],
    ["raster_finish", "raster_radial_spiral", 15],
    ["radial_finish", "raster_radial_spiral", 14],
    ["spiral_finish", "raster_radial_spiral", 14],
    ["pattern_finish", "pattern_corner", 11],
    ["pencil_finish", "pattern_corner", 11],
    ["corner_finishing", "pattern_corner", 14],
  ])("op %s → category %s, params %i", async (id, cat, count) => {
    const { PowerMillFinishingFunctionIndexEngine } = await import(
      "../engines/PowerMillFinishingFunctionIndexEngine.js"
    );
    const op: any = PowerMillFinishingFunctionIndexEngine.getOperation(id);
    expect("error" in op).toBe(false);
    expect(op.category).toBe(cat);
    expect(op.parameter_count).toBe(count);
  });

  it("declared sum = 180 + every op's nested parameter count matches declared", async () => {
    const { PowerMillFinishingFunctionIndexEngine } = await import(
      "../engines/PowerMillFinishingFunctionIndexEngine.js"
    );
    const idx: any = PowerMillFinishingFunctionIndexEngine.getIndex();
    let total = 0;
    for (const [opId, op] of Object.entries(idx.operations) as any) {
      let actual = 0;
      for (const grp of Object.values(op.parameters) as any) actual += Object.keys(grp).length;
      expect({ opId, declared: op.parameter_count, actual }).toEqual({
        opId,
        declared: op.parameter_count,
        actual: op.parameter_count,
      });
      total += op.parameter_count;
    }
    expect(total).toBe(180);
  });

  it("category breakdown sums to 180 / 12 ops across 5 categories", async () => {
    const { PowerMillFinishingFunctionIndexEngine } = await import(
      "../engines/PowerMillFinishingFunctionIndexEngine.js"
    );
    const b = PowerMillFinishingFunctionIndexEngine.getCategoryBreakdown();
    expect(b.length).toBe(5);
    expect(b.reduce((a, x) => a + x.operations.length, 0)).toBe(12);
    expect(b.reduce((a, x) => a + x.total_parameters, 0)).toBe(180);
  });

  it("variability: steep_and_shallow defaults canonical 30° threshold and 2° overlap", async () => {
    const { PowerMillFinishingFunctionIndexEngine } = await import(
      "../engines/PowerMillFinishingFunctionIndexEngine.js"
    );
    const op: any = PowerMillFinishingFunctionIndexEngine.getOperation("steep_and_shallow");
    expect(op.parameters.split.threshold_angle_deg.default).toBe(30);
    expect(op.parameters.split.overlap_angle_deg.default).toBe(2);
    expect(op.parameters.steep_path.steep_strategy.default).toBe("optimised_constant_z");
    expect(op.parameters.shallow_path.shallow_strategy.default).toBe("3d_offset");
    expect(op.parameters.shallow_path.shallow_strategy.values).toContain("raster");
    expect(op.parameters.shallow_path.shallow_strategy.values).toContain("radial");
    expect(op.parameters.shallow_path.shallow_strategy.values).toContain("spiral");
  });

  it("variability: optimised_constant_z has adaptive min/max stepdown bounds", async () => {
    const { PowerMillFinishingFunctionIndexEngine } = await import(
      "../engines/PowerMillFinishingFunctionIndexEngine.js"
    );
    const op: any = PowerMillFinishingFunctionIndexEngine.getOperation("optimised_constant_z");
    expect(op.parameters.adaptive_stepdown.min_stepdown_mm.default).toBe(0.1);
    expect(op.parameters.adaptive_stepdown.max_stepdown_mm.default).toBe(0.5);
    expect(op.parameters.adaptive_stepdown.min_machining_angle_deg.default).toBe(30);
  });

  it("variability: corner_finishing supports 3 pass types (pencil/along/across)", async () => {
    const { PowerMillFinishingFunctionIndexEngine } = await import(
      "../engines/PowerMillFinishingFunctionIndexEngine.js"
    );
    const op: any = PowerMillFinishingFunctionIndexEngine.getOperation("corner_finishing");
    expect(op.parameters.passes.include_pencil_pass.default).toBe(true);
    expect(op.parameters.passes.include_along_pass.default).toBe(true);
    expect(op.parameters.passes.include_across_pass.default).toBe(true);
  });

  // Failure modes
  it("getOperation returns {error: ...} on unknown id, real match on known", async () => {
    const { PowerMillFinishingFunctionIndexEngine } = await import(
      "../engines/PowerMillFinishingFunctionIndexEngine.js"
    );
    const bad: any = PowerMillFinishingFunctionIndexEngine.getOperation("bogus_id_does_not_exist");
    expect(bad.error).toMatch(/bogus_id_does_not_exist/);
    const good: any = PowerMillFinishingFunctionIndexEngine.getOperation("constant_z");
    expect(good.operation_id).toBe("constant_z");
    expect(good.parameter_count).toBe(18);
  });

  it("getOperationsByCategory case-insensitive + empty on unknown", async () => {
    const { PowerMillFinishingFunctionIndexEngine } = await import(
      "../engines/PowerMillFinishingFunctionIndexEngine.js"
    );
    const lower = PowerMillFinishingFunctionIndexEngine.getOperationsByCategory("raster_radial_spiral");
    const upper = PowerMillFinishingFunctionIndexEngine.getOperationsByCategory("RASTER_RADIAL_SPIRAL");
    expect(lower.length).toBe(3);
    expect(upper.length).toBe(3);
    expect(lower.map((o) => o.operation_id).sort()).toEqual([
      "radial_finish",
      "raster_finish",
      "spiral_finish",
    ]);
    expect(PowerMillFinishingFunctionIndexEngine.getOperationsByCategory("no_such_cat")).toHaveLength(0);
  });

  it("findParameter respects limit; returns empty on no match; real content on match", async () => {
    const { PowerMillFinishingFunctionIndexEngine } = await import(
      "../engines/PowerMillFinishingFunctionIndexEngine.js"
    );
    const all = PowerMillFinishingFunctionIndexEngine.findParameter("safe_z_mm", 1000);
    expect(all.length).toBeGreaterThanOrEqual(5);
    all.forEach((m) => expect(m.parameter).toBe("safe_z_mm"));
    const capped = PowerMillFinishingFunctionIndexEngine.findParameter("stepover", 3);
    expect(capped.length).toBe(3);
    expect(PowerMillFinishingFunctionIndexEngine.findParameter("zz_xxx_nonexistent")).toHaveLength(0);
  });

  // recommendByFeature — 12 intents
  it.each([
    ["mixed_steep_shallow", "steep_and_shallow"],
    ["adaptive_waterline", "optimised_constant_z"],
    ["steep_wall_waterline", "constant_z"],
    ["rest_after_waterline", "constant_z_rest"],
    ["uniform_cusp_3d_offset", "offset_3d"],
    ["rest_after_3d_offset", "offset_3d_rest"],
    ["fast_flat_finish", "raster_finish"],
    ["round_pocket_finish", "spiral_finish"],
    ["round_boss_continuous", "spiral_finish"],
    ["user_directed_path", "pattern_finish"],
    ["internal_corner_cleanup", "pencil_finish"],
    ["multi_pass_corner_residue", "corner_finishing"],
  ])("recommendByFeature(%s) → %s (verified in catalog)", async (intent, expected) => {
    const { PowerMillFinishingFunctionIndexEngine } = await import(
      "../engines/PowerMillFinishingFunctionIndexEngine.js"
    );
    const r = PowerMillFinishingFunctionIndexEngine.recommendByFeature(intent as any);
    expect(r.primary).toBe(expected);
    expect(r.reason.length).toBeGreaterThan(10);
    const op: any = PowerMillFinishingFunctionIndexEngine.getOperation(r.primary);
    expect("error" in op).toBe(false);
    expect(op.operation_id).toBe(expected);
  });

  it("recommendByFeature defaults safely with informative reason", async () => {
    const { PowerMillFinishingFunctionIndexEngine } = await import(
      "../engines/PowerMillFinishingFunctionIndexEngine.js"
    );
    const r = PowerMillFinishingFunctionIndexEngine.recommendByFeature("totally_bogus" as any);
    expect(r.primary).toBe("steep_and_shallow");
    expect(r.reason).toMatch(/unknown|default/i);
  });

  // classifySurfaceSteepShallow — 3 zones with deterministic boundaries
  it.each([
    [10, 30, 0, "shallow"],
    [29.99, 30, 0, "shallow"],
    [30.01, 30, 0, "steep"],
    [60, 30, 0, "steep"],
    [89, 30, 0, "steep"],
    // With 4° overlap centered on 30°: lower=28°, upper=32°
    [27, 30, 4, "shallow"],
    [29, 30, 4, "transition"],
    [31, 30, 4, "transition"],
    [33, 30, 4, "steep"],
  ])("classifySurfaceSteepShallow(angle=%f, threshold=%i, overlap=%i) → %s", async (angle, thresh, overlap, cls) => {
    const { PowerMillFinishingFunctionIndexEngine } = await import(
      "../engines/PowerMillFinishingFunctionIndexEngine.js"
    );
    const r: any = PowerMillFinishingFunctionIndexEngine.classifySurfaceSteepShallow(angle, thresh, overlap);
    expect(r.classification).toBe(cls);
    expect(r.threshold_angle_deg).toBe(thresh);
  });

  it.each([
    ["NaN angle", NaN, 30, 0],
    ["angle > 90", 91, 30, 0],
    ["negative angle", -5, 30, 0],
    ["NaN threshold", 45, NaN, 0],
    ["threshold = 0", 45, 0, 0],
    ["threshold ≥ 90", 45, 90, 0],
    ["overlap > 20", 45, 30, 25],
    ["negative overlap", 45, 30, -1],
  ])("classifySurfaceSteepShallow rejects: %s", async (_label, angle, thresh, overlap) => {
    const { PowerMillFinishingFunctionIndexEngine } = await import(
      "../engines/PowerMillFinishingFunctionIndexEngine.js"
    );
    const r: any = PowerMillFinishingFunctionIndexEngine.classifySurfaceSteepShallow(angle, thresh, overlap);
    expect("error" in r).toBe(true);
  });

  // stepoverForCuspTarget — INVERSE of cusp ≈ s²/(8R), so s = sqrt(8·R·cusp)
  it("stepoverForCuspTarget textbook: cusp=0.005mm, dia=6mm → s = sqrt(8·3·0.005) = sqrt(0.12) ≈ 0.3464mm", async () => {
    const { PowerMillFinishingFunctionIndexEngine } = await import(
      "../engines/PowerMillFinishingFunctionIndexEngine.js"
    );
    const r: any = PowerMillFinishingFunctionIndexEngine.stepoverForCuspTarget(0.005, 6);
    expect(r.required_stepover_mm).toBeCloseTo(Math.sqrt(0.12), 6);
    expect(r.tool_radius_mm).toBe(3);
    expect(r.target_cusp_mm).toBe(0.005);
  });

  it("stepoverForCuspTarget: doubling tool radius increases stepover by sqrt(2)", async () => {
    const { PowerMillFinishingFunctionIndexEngine } = await import(
      "../engines/PowerMillFinishingFunctionIndexEngine.js"
    );
    const small: any = PowerMillFinishingFunctionIndexEngine.stepoverForCuspTarget(0.01, 6);
    const big: any = PowerMillFinishingFunctionIndexEngine.stepoverForCuspTarget(0.01, 12);
    expect(big.required_stepover_mm / small.required_stepover_mm).toBeCloseTo(Math.SQRT2, 6);
  });

  it("stepoverForCuspTarget: quadrupling cusp doubles stepover", async () => {
    const { PowerMillFinishingFunctionIndexEngine } = await import(
      "../engines/PowerMillFinishingFunctionIndexEngine.js"
    );
    const tight: any = PowerMillFinishingFunctionIndexEngine.stepoverForCuspTarget(0.005, 6);
    const loose: any = PowerMillFinishingFunctionIndexEngine.stepoverForCuspTarget(0.020, 6);
    expect(loose.required_stepover_mm / tight.required_stepover_mm).toBeCloseTo(2, 6);
  });

  it.each([
    ["NaN cusp", NaN, 6],
    ["zero cusp", 0, 6],
    ["negative cusp", -0.01, 6],
    ["NaN tool_dia", 0.01, NaN],
    ["zero tool_dia", 0.01, 0],
    ["negative tool_dia", 0.01, -6],
  ])("stepoverForCuspTarget rejects: %s", async (_label, cusp, dia) => {
    const { PowerMillFinishingFunctionIndexEngine } = await import(
      "../engines/PowerMillFinishingFunctionIndexEngine.js"
    );
    const r: any = PowerMillFinishingFunctionIndexEngine.stepoverForCuspTarget(cusp, dia);
    expect("error" in r).toBe(true);
  });

  // pencilTraceFeasibility
  it("pencilTraceFeasibility feasible: 1.0mm corner, 0.5mm tool radius → 0.5mm clearance", async () => {
    const { PowerMillFinishingFunctionIndexEngine } = await import(
      "../engines/PowerMillFinishingFunctionIndexEngine.js"
    );
    const r: any = PowerMillFinishingFunctionIndexEngine.pencilTraceFeasibility(1.0, 0.5);
    expect(r.is_feasible).toBe(true);
    expect(r.clearance_mm).toBeCloseTo(0.5, 6);
  });

  it("pencilTraceFeasibility tight fit: 0.5mm corner, 0.5mm tool → 0 clearance, still feasible", async () => {
    const { PowerMillFinishingFunctionIndexEngine } = await import(
      "../engines/PowerMillFinishingFunctionIndexEngine.js"
    );
    const r: any = PowerMillFinishingFunctionIndexEngine.pencilTraceFeasibility(0.5, 0.5);
    expect(r.is_feasible).toBe(true);
    expect(r.clearance_mm).toBeCloseTo(0, 6);
  });

  it("pencilTraceFeasibility infeasible: 0.5mm corner, 1.0mm tool → -0.5 deficit, not feasible", async () => {
    const { PowerMillFinishingFunctionIndexEngine } = await import(
      "../engines/PowerMillFinishingFunctionIndexEngine.js"
    );
    const r: any = PowerMillFinishingFunctionIndexEngine.pencilTraceFeasibility(0.5, 1.0);
    expect(r.is_feasible).toBe(false);
    expect(r.clearance_mm).toBeCloseTo(-0.5, 6);
    expect(r.reason).toMatch(/cannot fit|deficit/i);
  });

  it.each([
    ["NaN corner", NaN, 0.5],
    ["zero corner", 0, 0.5],
    ["negative corner", -0.5, 0.5],
    ["NaN tool", 1.0, NaN],
    ["zero tool", 1.0, 0],
    ["negative tool", 1.0, -0.5],
  ])("pencilTraceFeasibility rejects: %s", async (_label, corner, tool) => {
    const { PowerMillFinishingFunctionIndexEngine } = await import(
      "../engines/PowerMillFinishingFunctionIndexEngine.js"
    );
    const r: any = PowerMillFinishingFunctionIndexEngine.pencilTraceFeasibility(corner, tool);
    expect("error" in r).toBe(true);
  });

  // Dispatcher round-trip
  it("round-trip: pm_finishing_summary returns 12/180", async () => {
    const r: any = await invoke("pm_finishing_summary", {});
    const d = r.data ?? r.result ?? r;
    expect(d.total_operations).toBe(12);
    expect(d.total_parameters).toBe(180);
  });

  it("round-trip: pm_finishing_get_op('steep_and_shallow') returns 21 params, steep_shallow category", async () => {
    const r: any = await invoke("pm_finishing_get_op", { operation_id: "steep_and_shallow" });
    const d = r.data ?? r.result ?? r;
    expect(d.category).toBe("steep_shallow");
    expect(d.parameter_count).toBe(21);
  });

  it("round-trip: pm_finishing_classify_steep_shallow(60,30,0) → steep", async () => {
    const r: any = await invoke("pm_finishing_classify_steep_shallow", { surface_angle_deg: 60, threshold_deg: 30, overlap_deg: 0 });
    const d = r.data ?? r.result ?? r;
    expect(d.classification).toBe("steep");
  });

  it("round-trip: pm_finishing_classify_steep_shallow(15,30,0) → shallow", async () => {
    const r: any = await invoke("pm_finishing_classify_steep_shallow", { surface_angle_deg: 15, threshold_deg: 30, overlap_deg: 0 });
    const d = r.data ?? r.result ?? r;
    expect(d.classification).toBe("shallow");
  });

  it("round-trip: pm_finishing_stepover_for_cusp(0.005, 6) ≈ sqrt(0.12)", async () => {
    const r: any = await invoke("pm_finishing_stepover_for_cusp", { target_cusp_mm: 0.005, tool_diameter_mm: 6 });
    const d = r.data ?? r.result ?? r;
    expect(d.required_stepover_mm).toBeCloseTo(Math.sqrt(0.12), 6);
  });

  it("round-trip: pm_finishing_pencil_feasibility(1.0, 0.5) → feasible, 0.5 clearance", async () => {
    const r: any = await invoke("pm_finishing_pencil_feasibility", { internal_corner_radius_mm: 1.0, tool_radius_mm: 0.5 });
    const d = r.data ?? r.result ?? r;
    expect(d.is_feasible).toBe(true);
    expect(d.clearance_mm).toBeCloseTo(0.5, 6);
  });

  it("round-trip: pm_finishing_recommend(round_pocket_finish) → spiral_finish", async () => {
    const r: any = await invoke("pm_finishing_recommend", { intent: "round_pocket_finish" });
    const d = r.data ?? r.result ?? r;
    expect(d.primary).toBe("spiral_finish");
  });

  it("round-trip: validation error for surface_angle > 90 in classify", async () => {
    const r: any = await invoke("pm_finishing_classify_steep_shallow", { surface_angle_deg: 100, threshold_deg: 30 });
    const blob = JSON.stringify(r);
    expect(blob).toMatch(/Invalid params|90/i);
  });

  // Schema integration
  it("camDispatcher ACTIONS contains all 10 pm_finishing_* action names", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const expected = [
      "pm_finishing_index",
      "pm_finishing_summary",
      "pm_finishing_list_ops",
      "pm_finishing_get_op",
      "pm_finishing_by_category",
      "pm_finishing_find_param",
      "pm_finishing_recommend",
      "pm_finishing_classify_steep_shallow",
      "pm_finishing_stepover_for_cusp",
      "pm_finishing_pencil_feasibility",
    ];
    for (const a of expected) expect(mod.ACTIONS).toContain(a);
  });

  it("ACTION_PM_FINISHING_FUNCTION_INDEX_SCHEMAS has exactly 10 keys", async () => {
    const { ACTION_PM_FINISHING_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/powerMillFinishingFunctionIndexActionSchemas.js"
    );
    expect(Object.keys(ACTION_PM_FINISHING_FUNCTION_INDEX_SCHEMAS)).toHaveLength(10);
  });

  it("pm_finishing_classify_steep_shallow schema enforces angle [0,90], threshold [1,90), overlap optional [0,20]", async () => {
    const { ACTION_PM_FINISHING_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/powerMillFinishingFunctionIndexActionSchemas.js"
    );
    const s = ACTION_PM_FINISHING_FUNCTION_INDEX_SCHEMAS.pm_finishing_classify_steep_shallow;
    expect(s.safeParse({ surface_angle_deg: 45, threshold_deg: 30 }).success).toBe(true);
    expect(s.safeParse({ surface_angle_deg: 45, threshold_deg: 30, overlap_deg: 4 }).success).toBe(true);
    expect(s.safeParse({ surface_angle_deg: -1, threshold_deg: 30 }).success).toBe(false);
    expect(s.safeParse({ surface_angle_deg: 91, threshold_deg: 30 }).success).toBe(false);
    expect(s.safeParse({ surface_angle_deg: 45, threshold_deg: 90 }).success).toBe(false);
    expect(s.safeParse({ surface_angle_deg: 45, threshold_deg: 0.5 }).success).toBe(false);
    expect(s.safeParse({ surface_angle_deg: 45, threshold_deg: 30, overlap_deg: 25 }).success).toBe(false);
  });

  it("pm_finishing_stepover_for_cusp schema requires both inputs positive", async () => {
    const { ACTION_PM_FINISHING_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/powerMillFinishingFunctionIndexActionSchemas.js"
    );
    const s = ACTION_PM_FINISHING_FUNCTION_INDEX_SCHEMAS.pm_finishing_stepover_for_cusp;
    expect(s.safeParse({ target_cusp_mm: 0.005, tool_diameter_mm: 6 }).success).toBe(true);
    expect(s.safeParse({ target_cusp_mm: 0, tool_diameter_mm: 6 }).success).toBe(false);
    expect(s.safeParse({ target_cusp_mm: 0.005, tool_diameter_mm: -6 }).success).toBe(false);
  });
});
