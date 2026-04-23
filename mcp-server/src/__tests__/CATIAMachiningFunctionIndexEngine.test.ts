/**
 * CATIAMachiningFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM47
 *
 * Coverage:
 *   - schema invariants: 12 ops, 199 params, 5 categories, 6 topics
 *   - per-op reference values + parameter-count consistency
 *   - variability: 5 categories present; cycle types, tap modes, axis modes, stock modes enumerated
 *   - engine methods: real invocation + failure + adversarial NaN/Infinity
 *   - recommendByFeature: 12 intents end-to-end + default fallback
 *   - classifyToleranceGrade: 3 zones (loose/tight/multi-axis) across IT range + adversarial
 *   - selectMachiningPlan: 3 zones + adversarial
 *   - delmiaSimulationCoverage: textbook + 4 sample-density zones + adversarial
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

describe("CATIAMachiningFunctionIndexEngine — engine + dispatcher", () => {
  it("getSummary returns exactly 12 ops / 199 params / 5 categories / catia/machining", async () => {
    const { CATIAMachiningFunctionIndexEngine } = await import(
      "../engines/CATIAMachiningFunctionIndexEngine.js"
    );
    const s: any = CATIAMachiningFunctionIndexEngine.getSummary();
    expect(s.system_id).toBe("catia");
    expect(s.section_key).toBe("machining");
    expect(s.total_operations).toBe(12);
    expect(s.total_parameters).toBe(199);
    expect(s.categories).toHaveLength(5);
    expect(s.training_topics_count).toBe(6);
  });

  it.each([
    ["pocketing_2_5d", "prismatic_2_5d", 23],
    ["profile_contouring", "prismatic_2_5d", 17],
    ["facing_2_5d", "prismatic_2_5d", 13],
    ["hole_drilling", "drilling_holemaking", 16],
    ["hole_tapping", "drilling_holemaking", 12],
    ["sweeping", "surface_3axis", 19],
    ["contour_driven", "surface_3axis", 15],
    ["isoparametric_machining", "surface_3axis", 13],
    ["multi_axis_sweeping", "advanced_5axis", 22],
    ["multi_axis_contour", "advanced_5axis", 19],
    ["delmia_simulate", "delmia_integration", 16],
    ["delmia_clash_check", "delmia_integration", 14],
  ])("op %s → category %s, params %i", async (id, cat, count) => {
    const { CATIAMachiningFunctionIndexEngine } = await import(
      "../engines/CATIAMachiningFunctionIndexEngine.js"
    );
    const op: any = CATIAMachiningFunctionIndexEngine.getOperation(id);
    expect("error" in op).toBe(false);
    expect(op.category).toBe(cat);
    expect(op.parameter_count).toBe(count);
  });

  it("declared sum = 199 + every op's nested parameter count matches declared", async () => {
    const { CATIAMachiningFunctionIndexEngine } = await import(
      "../engines/CATIAMachiningFunctionIndexEngine.js"
    );
    const idx: any = CATIAMachiningFunctionIndexEngine.getIndex();
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
    expect(total).toBe(199);
  });

  it("category breakdown sums to 199 / 12 ops across 5 categories", async () => {
    const { CATIAMachiningFunctionIndexEngine } = await import(
      "../engines/CATIAMachiningFunctionIndexEngine.js"
    );
    const b = CATIAMachiningFunctionIndexEngine.getCategoryBreakdown();
    expect(b.length).toBe(5);
    expect(b.reduce((a, x) => a + x.operations.length, 0)).toBe(12);
    expect(b.reduce((a, x) => a + x.total_parameters, 0)).toBe(199);
  });

  it("variability: hole_drilling supports all 7 standard G-cycles (G81/82/83/73/84/85/86)", async () => {
    const { CATIAMachiningFunctionIndexEngine } = await import(
      "../engines/CATIAMachiningFunctionIndexEngine.js"
    );
    const op: any = CATIAMachiningFunctionIndexEngine.getOperation("hole_drilling");
    const cycles = op.parameters.cycle.cycle_type.values;
    expect(cycles).toHaveLength(7);
    expect(cycles).toContain("G81_drill");
    expect(cycles).toContain("G82_drill_dwell");
    expect(cycles).toContain("G83_deep_peck");
    expect(cycles).toContain("G73_high_speed_peck");
    expect(cycles).toContain("G84_tap");
    expect(cycles).toContain("G85_ream");
    expect(cycles).toContain("G86_bore");
  });

  it("variability: hole_tapping covers ≥3 tap modes (rigid / floating / roll-form)", async () => {
    const { CATIAMachiningFunctionIndexEngine } = await import(
      "../engines/CATIAMachiningFunctionIndexEngine.js"
    );
    const op: any = CATIAMachiningFunctionIndexEngine.getOperation("hole_tapping");
    const modes = op.parameters.cycle.tap_mode.values;
    expect(modes).toHaveLength(3);
    expect(modes).toContain("rigid_g84");
    expect(modes).toContain("floating_g84");
    expect(modes).toContain("roll_form");
  });

  it("variability: multi_axis_sweeping supports ≥5 tool axis modes including swarf and lead_lag", async () => {
    const { CATIAMachiningFunctionIndexEngine } = await import(
      "../engines/CATIAMachiningFunctionIndexEngine.js"
    );
    const op: any = CATIAMachiningFunctionIndexEngine.getOperation("multi_axis_sweeping");
    const modes = op.parameters.tool_axis.axis_mode.values;
    expect(modes.length).toBeGreaterThanOrEqual(5);
    expect(modes).toContain("normal_to_part");
    expect(modes).toContain("lead_lag");
    expect(modes).toContain("swarf");
  });

  it("variability: delmia_simulate supports 3 stock model modes", async () => {
    const { CATIAMachiningFunctionIndexEngine } = await import(
      "../engines/CATIAMachiningFunctionIndexEngine.js"
    );
    const op: any = CATIAMachiningFunctionIndexEngine.getOperation("delmia_simulate");
    const modes = op.parameters.stock_model.stock_model_mode.values;
    expect(modes).toEqual(["voxel", "mesh", "boundary_rep"]);
    expect(op.parameters.stock_model.stock_model_mode.default).toBe("mesh");
  });

  // Failure modes
  it("getOperation returns {error: ...} on unknown id, real match on known", async () => {
    const { CATIAMachiningFunctionIndexEngine } = await import(
      "../engines/CATIAMachiningFunctionIndexEngine.js"
    );
    const bad: any = CATIAMachiningFunctionIndexEngine.getOperation("bogus_id_does_not_exist");
    expect(bad.error).toMatch(/bogus_id_does_not_exist/);
    const good: any = CATIAMachiningFunctionIndexEngine.getOperation("multi_axis_sweeping");
    expect(good.operation_id).toBe("multi_axis_sweeping");
    expect(good.parameter_count).toBe(22);
  });

  it("getOperationsByCategory case-insensitive + empty on unknown", async () => {
    const { CATIAMachiningFunctionIndexEngine } = await import(
      "../engines/CATIAMachiningFunctionIndexEngine.js"
    );
    const lower = CATIAMachiningFunctionIndexEngine.getOperationsByCategory("prismatic_2_5d");
    const upper = CATIAMachiningFunctionIndexEngine.getOperationsByCategory("PRISMATIC_2_5D");
    expect(lower.length).toBe(3);
    expect(upper.length).toBe(3);
    expect(lower.map((o) => o.operation_id).sort()).toEqual([
      "facing_2_5d",
      "pocketing_2_5d",
      "profile_contouring",
    ]);
    expect(CATIAMachiningFunctionIndexEngine.getOperationsByCategory("no_such_cat")).toHaveLength(0);
  });

  it("findParameter respects limit; returns empty on no match; real content on match", async () => {
    const { CATIAMachiningFunctionIndexEngine } = await import(
      "../engines/CATIAMachiningFunctionIndexEngine.js"
    );
    const all = CATIAMachiningFunctionIndexEngine.findParameter("safe_clearance_height_mm", 1000);
    expect(all.length).toBeGreaterThanOrEqual(5);
    all.forEach((m) => expect(m.parameter).toBe("safe_clearance_height_mm"));
    const capped = CATIAMachiningFunctionIndexEngine.findParameter("stepover", 3);
    expect(capped.length).toBe(3);
    expect(CATIAMachiningFunctionIndexEngine.findParameter("zz_xxx_nonexistent")).toHaveLength(0);
  });

  // recommendByFeature — 12 intents
  it.each([
    ["pocket_2_5d", "pocketing_2_5d"],
    ["profile_2d", "profile_contouring"],
    ["face_top_surface", "facing_2_5d"],
    ["drill_holes", "hole_drilling"],
    ["tap_holes", "hole_tapping"],
    ["sweep_3axis_surface", "sweeping"],
    ["contour_3axis_surface", "contour_driven"],
    ["isoparametric_uv_finish", "isoparametric_machining"],
    ["sweep_5axis_surface", "multi_axis_sweeping"],
    ["contour_5axis_surface", "multi_axis_contour"],
    ["delmia_full_simulation", "delmia_simulate"],
    ["delmia_quick_clash", "delmia_clash_check"],
  ])("recommendByFeature(%s) → %s (verified in catalog)", async (intent, expected) => {
    const { CATIAMachiningFunctionIndexEngine } = await import(
      "../engines/CATIAMachiningFunctionIndexEngine.js"
    );
    const r = CATIAMachiningFunctionIndexEngine.recommendByFeature(intent as any);
    expect(r.primary).toBe(expected);
    expect(r.reason.length).toBeGreaterThan(10);
    const op: any = CATIAMachiningFunctionIndexEngine.getOperation(r.primary);
    expect("error" in op).toBe(false);
    expect(op.operation_id).toBe(expected);
  });

  it("recommendByFeature defaults safely with informative reason", async () => {
    const { CATIAMachiningFunctionIndexEngine } = await import(
      "../engines/CATIAMachiningFunctionIndexEngine.js"
    );
    const r = CATIAMachiningFunctionIndexEngine.recommendByFeature("totally_bogus" as any);
    expect(r.primary).toBe("pocketing_2_5d");
    expect(r.reason).toMatch(/unknown|default/i);
  });

  // classifyToleranceGrade — 3 zones across IT range
  it.each([
    [11, "loose_pocket_ok", "prismatic"],
    [12, "loose_pocket_ok", "prismatic"],
    [16, "loose_pocket_ok", "prismatic"],
    [10, "tight_surface_needed", "surface"],
    [8, "tight_surface_needed", "surface"],
    [7, "tight_surface_needed", "surface"],
    [6, "multi_axis_required", "advanced"],
    [4, "multi_axis_required", "advanced"],
    [1, "multi_axis_required", "advanced"],
  ])("classifyToleranceGrade(IT%i) → %s, workbench=%s", async (it, cls, wb) => {
    const { CATIAMachiningFunctionIndexEngine } = await import(
      "../engines/CATIAMachiningFunctionIndexEngine.js"
    );
    const r: any = CATIAMachiningFunctionIndexEngine.classifyToleranceGrade(it);
    expect(r.classification).toBe(cls);
    expect(r.recommended_workbench).toBe(wb);
    expect(r.IT_grade).toBe(it);
    expect(r.approx_tolerance_um).toBeGreaterThan(0);
  });

  it.each([
    ["NaN", NaN],
    ["fractional", 7.5],
    ["zero", 0],
    ["negative", -1],
    ["over 18", 19],
  ])("classifyToleranceGrade rejects: %s", async (_label, it) => {
    const { CATIAMachiningFunctionIndexEngine } = await import(
      "../engines/CATIAMachiningFunctionIndexEngine.js"
    );
    const r: any = CATIAMachiningFunctionIndexEngine.classifyToleranceGrade(it);
    expect("error" in r).toBe(true);
  });

  // selectMachiningPlan — 3 zones
  it.each([
    [0, "prismatic"],
    [3, "prismatic"],
    [3.5, "surface"],
    [5, "surface"],
    [6, "surface"],
    [6.5, "advanced"],
    [10, "advanced"],
  ])("selectMachiningPlan(score=%f) → workbench=%s", async (score, wb) => {
    const { CATIAMachiningFunctionIndexEngine } = await import(
      "../engines/CATIAMachiningFunctionIndexEngine.js"
    );
    const r: any = CATIAMachiningFunctionIndexEngine.selectMachiningPlan(score);
    expect(r.workbench).toBe(wb);
    expect(r.complexity_score).toBe(score);
  });

  it.each([
    ["NaN", NaN],
    ["negative", -1],
    ["over 10", 11],
    ["Infinity", Infinity],
  ])("selectMachiningPlan rejects: %s", async (_label, score) => {
    const { CATIAMachiningFunctionIndexEngine } = await import(
      "../engines/CATIAMachiningFunctionIndexEngine.js"
    );
    const r: any = CATIAMachiningFunctionIndexEngine.selectMachiningPlan(score);
    expect("error" in r).toBe(true);
  });

  // delmiaSimulationCoverage
  it("delmiaSimulationCoverage textbook: 1000mm path / 0.1mm step → ~10001 points", async () => {
    const { CATIAMachiningFunctionIndexEngine } = await import(
      "../engines/CATIAMachiningFunctionIndexEngine.js"
    );
    const r: any = CATIAMachiningFunctionIndexEngine.delmiaSimulationCoverage(1000, 0.1);
    expect(r.sample_point_count).toBe(10001);
    expect(r.estimated_memory_mb).toBeCloseTo((10001 * 256) / (1024 * 1024), 4);
  });

  it.each([
    [1000, 0.0001, "Very dense"],         // 10M+ pts
    [1000, 0.005, "Dense"],               // 200k pts
    [1000, 0.5, "Standard"],              // 2k pts
    [100, 1, "Sparse"],                   // 101 pts
  ])("delmiaSimulationCoverage(%i mm, %f step) — recommendation matches density zone", async (len, step, label) => {
    const { CATIAMachiningFunctionIndexEngine } = await import(
      "../engines/CATIAMachiningFunctionIndexEngine.js"
    );
    const r: any = CATIAMachiningFunctionIndexEngine.delmiaSimulationCoverage(len, step);
    expect(r.recommendation).toMatch(new RegExp(label, "i"));
  });

  it.each([
    ["NaN length", NaN, 0.1],
    ["zero length", 0, 0.1],
    ["negative length", -100, 0.1],
    ["NaN step", 1000, NaN],
    ["zero step", 1000, 0],
    ["negative step", 1000, -0.1],
    ["step > length", 100, 200],
  ])("delmiaSimulationCoverage rejects: %s", async (_label, len, step) => {
    const { CATIAMachiningFunctionIndexEngine } = await import(
      "../engines/CATIAMachiningFunctionIndexEngine.js"
    );
    const r: any = CATIAMachiningFunctionIndexEngine.delmiaSimulationCoverage(len, step);
    expect("error" in r).toBe(true);
  });

  // Dispatcher round-trip
  it("round-trip: catia_mach_summary returns 12/199", async () => {
    const r: any = await invoke("catia_mach_summary", {});
    const d = r.data ?? r.result ?? r;
    expect(d.total_operations).toBe(12);
    expect(d.total_parameters).toBe(199);
  });

  it("round-trip: catia_mach_get_op('multi_axis_sweeping') returns 22 params, advanced_5axis", async () => {
    const r: any = await invoke("catia_mach_get_op", { operation_id: "multi_axis_sweeping" });
    const d = r.data ?? r.result ?? r;
    expect(d.category).toBe("advanced_5axis");
    expect(d.parameter_count).toBe(22);
  });

  it("round-trip: catia_mach_classify_tolerance(IT12) → loose_pocket_ok / prismatic", async () => {
    const r: any = await invoke("catia_mach_classify_tolerance", { IT_grade: 12 });
    const d = r.data ?? r.result ?? r;
    expect(d.classification).toBe("loose_pocket_ok");
    expect(d.recommended_workbench).toBe("prismatic");
  });

  it("round-trip: catia_mach_classify_tolerance(IT5) → multi_axis_required / advanced", async () => {
    const r: any = await invoke("catia_mach_classify_tolerance", { IT_grade: 5 });
    const d = r.data ?? r.result ?? r;
    expect(d.classification).toBe("multi_axis_required");
    expect(d.recommended_workbench).toBe("advanced");
  });

  it("round-trip: catia_mach_select_plan(2) → prismatic", async () => {
    const r: any = await invoke("catia_mach_select_plan", { complexity_score: 2 });
    const d = r.data ?? r.result ?? r;
    expect(d.workbench).toBe("prismatic");
  });

  it("round-trip: catia_mach_delmia_coverage(1000,0.1) → 10001 points", async () => {
    const r: any = await invoke("catia_mach_delmia_coverage", { toolpath_length_mm: 1000, sample_step_mm: 0.1 });
    const d = r.data ?? r.result ?? r;
    expect(d.sample_point_count).toBe(10001);
  });

  it("round-trip: catia_mach_recommend(sweep_5axis_surface) → multi_axis_sweeping", async () => {
    const r: any = await invoke("catia_mach_recommend", { intent: "sweep_5axis_surface" });
    const d = r.data ?? r.result ?? r;
    expect(d.primary).toBe("multi_axis_sweeping");
  });

  it("round-trip: validation error for IT_grade > 18", async () => {
    const r: any = await invoke("catia_mach_classify_tolerance", { IT_grade: 25 });
    const blob = JSON.stringify(r);
    expect(blob).toMatch(/Invalid params|18/i);
  });

  // Schema integration
  it("camDispatcher ACTIONS contains all 10 catia_mach_* action names", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const expected = [
      "catia_mach_index",
      "catia_mach_summary",
      "catia_mach_list_ops",
      "catia_mach_get_op",
      "catia_mach_by_category",
      "catia_mach_find_param",
      "catia_mach_recommend",
      "catia_mach_classify_tolerance",
      "catia_mach_select_plan",
      "catia_mach_delmia_coverage",
    ];
    for (const a of expected) expect(mod.ACTIONS).toContain(a);
  });

  it("ACTION_CATIA_MACHINING_FUNCTION_INDEX_SCHEMAS has exactly 10 keys", async () => {
    const { ACTION_CATIA_MACHINING_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/catiaMachiningFunctionIndexActionSchemas.js"
    );
    expect(Object.keys(ACTION_CATIA_MACHINING_FUNCTION_INDEX_SCHEMAS)).toHaveLength(10);
  });

  it("catia_mach_classify_tolerance schema enforces integer IT_grade in [1,18]", async () => {
    const { ACTION_CATIA_MACHINING_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/catiaMachiningFunctionIndexActionSchemas.js"
    );
    const s = ACTION_CATIA_MACHINING_FUNCTION_INDEX_SCHEMAS.catia_mach_classify_tolerance;
    expect(s.safeParse({ IT_grade: 7 }).success).toBe(true);
    expect(s.safeParse({ IT_grade: 1 }).success).toBe(true);
    expect(s.safeParse({ IT_grade: 18 }).success).toBe(true);
    expect(s.safeParse({ IT_grade: 0 }).success).toBe(false);
    expect(s.safeParse({ IT_grade: 19 }).success).toBe(false);
    expect(s.safeParse({ IT_grade: 7.5 }).success).toBe(false);
  });

  it("catia_mach_delmia_coverage schema enforces both inputs positive", async () => {
    const { ACTION_CATIA_MACHINING_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/catiaMachiningFunctionIndexActionSchemas.js"
    );
    const s = ACTION_CATIA_MACHINING_FUNCTION_INDEX_SCHEMAS.catia_mach_delmia_coverage;
    expect(s.safeParse({ toolpath_length_mm: 1000, sample_step_mm: 0.1 }).success).toBe(true);
    expect(s.safeParse({ toolpath_length_mm: 0, sample_step_mm: 0.1 }).success).toBe(false);
    expect(s.safeParse({ toolpath_length_mm: 1000, sample_step_mm: -0.1 }).success).toBe(false);
  });
});
