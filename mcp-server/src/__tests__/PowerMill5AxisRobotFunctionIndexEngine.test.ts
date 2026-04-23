/**
 * PowerMill5AxisRobotFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM45
 *
 * Coverage:
 *   - schema invariants: 12 ops, 187 params, 5 categories, 6 topics
 *   - per-op reference values + parameter-count consistency
 *   - variability: 5 categories present; blade stages, port axis modes, robot vendors enumerated
 *   - engine methods: real invocation + failure + adversarial NaN/Infinity
 *   - recommendByFeature: 12 intents end-to-end + default fallback
 *   - classifyKinematicConfig: 4 zones (head_head/table_table/mixed/robot) + adversarial
 *   - checkSingularityRisk: 3 zones (safe/caution/critical) + adversarial
 *   - validateRobotReach: 3 statuses (in_envelope/too_close/too_far) + adversarial
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

describe("PowerMill5AxisRobotFunctionIndexEngine — engine + dispatcher", () => {
  it("getSummary returns exactly 12 ops / 187 params / 5 categories / powermill/5axis_robot", async () => {
    const { PowerMill5AxisRobotFunctionIndexEngine } = await import(
      "../engines/PowerMill5AxisRobotFunctionIndexEngine.js"
    );
    const s: any = PowerMill5AxisRobotFunctionIndexEngine.getSummary();
    expect(s.system_id).toBe("powermill");
    expect(s.section_key).toBe("5axis_robot");
    expect(s.total_operations).toBe(12);
    expect(s.total_parameters).toBe(187);
    expect(s.categories).toHaveLength(5);
    expect(s.training_topics_count).toBe(6);
  });

  it.each([
    ["swarf_simul5", "swarf_blade_port", 22],
    ["blade_simul5", "swarf_blade_port", 24],
    ["port_simul5", "swarf_blade_port", 19],
    ["tool_axis_strategy", "tool_axis", 16],
    ["projection_5axis", "tool_axis", 15],
    ["index_3plus2", "positional", 13],
    ["curve_5axis", "positional", 13],
    ["wireframe_swarf", "wireframe", 11],
    ["robot_config", "robot", 16],
    ["robot_reach", "robot", 13],
    ["robot_trim", "robot", 13],
    ["robot_post", "robot", 12],
  ])("op %s → category %s, params %i", async (id, cat, count) => {
    const { PowerMill5AxisRobotFunctionIndexEngine } = await import(
      "../engines/PowerMill5AxisRobotFunctionIndexEngine.js"
    );
    const op: any = PowerMill5AxisRobotFunctionIndexEngine.getOperation(id);
    expect("error" in op).toBe(false);
    expect(op.category).toBe(cat);
    expect(op.parameter_count).toBe(count);
  });

  it("declared sum = 187 + every op's nested parameter count matches declared", async () => {
    const { PowerMill5AxisRobotFunctionIndexEngine } = await import(
      "../engines/PowerMill5AxisRobotFunctionIndexEngine.js"
    );
    const idx: any = PowerMill5AxisRobotFunctionIndexEngine.getIndex();
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
    expect(total).toBe(187);
  });

  it("category breakdown sums to 187 / 12 ops across 5 categories", async () => {
    const { PowerMill5AxisRobotFunctionIndexEngine } = await import(
      "../engines/PowerMill5AxisRobotFunctionIndexEngine.js"
    );
    const b = PowerMill5AxisRobotFunctionIndexEngine.getCategoryBreakdown();
    expect(b.length).toBe(5);
    expect(b.reduce((a, x) => a + x.operations.length, 0)).toBe(12);
    expect(b.reduce((a, x) => a + x.total_parameters, 0)).toBe(187);
  });

  it("variability: blade_simul5 supports all 5 standard stages (rough + 2 finishes + hub + LE)", async () => {
    const { PowerMill5AxisRobotFunctionIndexEngine } = await import(
      "../engines/PowerMill5AxisRobotFunctionIndexEngine.js"
    );
    const op: any = PowerMill5AxisRobotFunctionIndexEngine.getOperation("blade_simul5");
    expect(op.parameters.stages.include_rough_slice.default).toBe(true);
    expect(op.parameters.stages.include_finish_pressure_side.default).toBe(true);
    expect(op.parameters.stages.include_finish_suction_side.default).toBe(true);
    expect(op.parameters.stages.include_hub_fillet.default).toBe(true);
    expect(op.parameters.stages.include_leading_edge_cleanup.default).toBe(true);
  });

  it("variability: port_simul5 axis modes cover ≥3 strategies including follow_centerline", async () => {
    const { PowerMill5AxisRobotFunctionIndexEngine } = await import(
      "../engines/PowerMill5AxisRobotFunctionIndexEngine.js"
    );
    const op: any = PowerMill5AxisRobotFunctionIndexEngine.getOperation("port_simul5");
    const values = op.parameters.tool_axis.axis_mode.values;
    expect(values.length).toBeGreaterThanOrEqual(3);
    expect(values).toContain("follow_centerline");
    expect(values).toContain("interpolate");
    expect(values).toContain("fixed_to_curve");
  });

  it("variability: robot_config covers ≥5 vendor dialects (ABB/KUKA/Fanuc/Yaskawa/Staubli/UR)", async () => {
    const { PowerMill5AxisRobotFunctionIndexEngine } = await import(
      "../engines/PowerMill5AxisRobotFunctionIndexEngine.js"
    );
    const op: any = PowerMill5AxisRobotFunctionIndexEngine.getOperation("robot_config");
    const vendors = op.parameters.identity.vendor.values;
    expect(vendors.length).toBeGreaterThanOrEqual(5);
    expect(vendors).toContain("abb");
    expect(vendors).toContain("kuka");
    expect(vendors).toContain("fanuc");
    expect(vendors).toContain("yaskawa");
  });

  it("variability: robot_post supports ≥4 vendor dialects", async () => {
    const { PowerMill5AxisRobotFunctionIndexEngine } = await import(
      "../engines/PowerMill5AxisRobotFunctionIndexEngine.js"
    );
    const op: any = PowerMill5AxisRobotFunctionIndexEngine.getOperation("robot_post");
    const dialects = op.parameters.target_robot.vendor_dialect.values;
    expect(dialects.length).toBeGreaterThanOrEqual(4);
    expect(dialects).toContain("abb_rapid");
    expect(dialects).toContain("kuka_krl");
    expect(dialects).toContain("fanuc_tpp");
    expect(dialects).toContain("yaskawa_inform");
  });

  // Failure modes
  it("getOperation returns {error: ...} on unknown id, real match on known", async () => {
    const { PowerMill5AxisRobotFunctionIndexEngine } = await import(
      "../engines/PowerMill5AxisRobotFunctionIndexEngine.js"
    );
    const bad: any = PowerMill5AxisRobotFunctionIndexEngine.getOperation("bogus_id_does_not_exist");
    expect(bad.error).toMatch(/bogus_id_does_not_exist/);
    const good: any = PowerMill5AxisRobotFunctionIndexEngine.getOperation("blade_simul5");
    expect(good.operation_id).toBe("blade_simul5");
    expect(good.parameter_count).toBe(24);
  });

  it("getOperationsByCategory case-insensitive + empty on unknown", async () => {
    const { PowerMill5AxisRobotFunctionIndexEngine } = await import(
      "../engines/PowerMill5AxisRobotFunctionIndexEngine.js"
    );
    const lower = PowerMill5AxisRobotFunctionIndexEngine.getOperationsByCategory("robot");
    const upper = PowerMill5AxisRobotFunctionIndexEngine.getOperationsByCategory("ROBOT");
    expect(lower.length).toBe(4);
    expect(upper.length).toBe(4);
    expect(lower.map((o) => o.operation_id).sort()).toEqual([
      "robot_config",
      "robot_post",
      "robot_reach",
      "robot_trim",
    ]);
    expect(PowerMill5AxisRobotFunctionIndexEngine.getOperationsByCategory("no_such_cat")).toHaveLength(0);
  });

  it("findParameter respects limit; returns empty on no match; real content on match", async () => {
    const { PowerMill5AxisRobotFunctionIndexEngine } = await import(
      "../engines/PowerMill5AxisRobotFunctionIndexEngine.js"
    );
    const all = PowerMill5AxisRobotFunctionIndexEngine.findParameter("max_tilt_deg", 1000);
    expect(all.length).toBeGreaterThanOrEqual(5);
    all.forEach((m) => expect(m.parameter).toBe("max_tilt_deg"));
    const capped = PowerMill5AxisRobotFunctionIndexEngine.findParameter("safe_z", 3);
    expect(capped.length).toBe(3);
    expect(PowerMill5AxisRobotFunctionIndexEngine.findParameter("zz_xxx_nonexistent")).toHaveLength(0);
  });

  // recommendByFeature — 12 intents
  it.each([
    ["ruled_swarf_wall", "swarf_simul5"],
    ["impeller_blade_full_chain", "blade_simul5"],
    ["intake_exhaust_port", "port_simul5"],
    ["axis_overlay_on_3axis", "tool_axis_strategy"],
    ["project_2d_pattern_to_3d", "projection_5axis"],
    ["indexed_3plus2_undercut", "index_3plus2"],
    ["engrave_along_curve", "curve_5axis"],
    ["wireframe_only_swarf", "wireframe_swarf"],
    ["robot_cell_setup", "robot_config"],
    ["robot_pre_flight_validation", "robot_reach"],
    ["robot_composite_trim", "robot_trim"],
    ["robot_vendor_post", "robot_post"],
  ])("recommendByFeature(%s) → %s (verified in catalog)", async (intent, expected) => {
    const { PowerMill5AxisRobotFunctionIndexEngine } = await import(
      "../engines/PowerMill5AxisRobotFunctionIndexEngine.js"
    );
    const r = PowerMill5AxisRobotFunctionIndexEngine.recommendByFeature(intent as any);
    expect(r.primary).toBe(expected);
    expect(r.reason.length).toBeGreaterThan(10);
    const op: any = PowerMill5AxisRobotFunctionIndexEngine.getOperation(r.primary);
    expect("error" in op).toBe(false);
    expect(op.operation_id).toBe(expected);
  });

  it("recommendByFeature defaults safely with informative reason", async () => {
    const { PowerMill5AxisRobotFunctionIndexEngine } = await import(
      "../engines/PowerMill5AxisRobotFunctionIndexEngine.js"
    );
    const r = PowerMill5AxisRobotFunctionIndexEngine.recommendByFeature("totally_bogus" as any);
    expect(r.primary).toBe("tool_axis_strategy");
    expect(r.reason).toMatch(/unknown|default/i);
  });

  // classifyKinematicConfig — 4 kinematic types
  it.each([
    [2, 0, false, "head_head"],   // B-C head
    [3, 0, false, "head_head"],   // hypothetical 3-rotary head
    [0, 2, false, "table_table"], // A-C trunnion
    [0, 3, false, "table_table"],
    [1, 1, false, "mixed"],       // B-head + C-table
    [2, 1, false, "mixed"],       // unusual but mixed by definition
    [1, 2, false, "mixed"],
  ])("classifyKinematicConfig(head=%i, table=%i, robot=%s) → %s", async (head, table, robot, kt) => {
    const { PowerMill5AxisRobotFunctionIndexEngine } = await import(
      "../engines/PowerMill5AxisRobotFunctionIndexEngine.js"
    );
    const r: any = PowerMill5AxisRobotFunctionIndexEngine.classifyKinematicConfig(head, table, robot);
    expect(r.kinematic_type).toBe(kt);
  });

  it("classifyKinematicConfig: robot_articulated override returns robot_articulated", async () => {
    const { PowerMill5AxisRobotFunctionIndexEngine } = await import(
      "../engines/PowerMill5AxisRobotFunctionIndexEngine.js"
    );
    const r: any = PowerMill5AxisRobotFunctionIndexEngine.classifyKinematicConfig(0, 0, true);
    expect(r.kinematic_type).toBe("robot_articulated");
  });

  it("classifyKinematicConfig: total < 2 reports table_table fallback with explanation", async () => {
    const { PowerMill5AxisRobotFunctionIndexEngine } = await import(
      "../engines/PowerMill5AxisRobotFunctionIndexEngine.js"
    );
    const r: any = PowerMill5AxisRobotFunctionIndexEngine.classifyKinematicConfig(1, 0);
    expect(r.kinematic_type).toBe("table_table");
    expect(r.reason).toMatch(/not a 5-axis/i);
  });

  it.each([
    ["NaN head", NaN, 0],
    ["fractional head", 1.5, 0],
    ["negative head", -1, 0],
    ["head > 3", 4, 0],
    ["NaN table", 0, NaN],
    ["fractional table", 0, 1.5],
    ["table > 3", 0, 4],
  ])("classifyKinematicConfig rejects: %s", async (_label, head, table) => {
    const { PowerMill5AxisRobotFunctionIndexEngine } = await import(
      "../engines/PowerMill5AxisRobotFunctionIndexEngine.js"
    );
    const r: any = PowerMill5AxisRobotFunctionIndexEngine.classifyKinematicConfig(head, table);
    expect("error" in r).toBe(true);
  });

  // checkSingularityRisk — 3 zones
  it.each([
    [45, 3, "safe"],
    [10, 3, "safe"],     // 10 > 3+5 = 8
    [9, 3, "safe"],      // 9 > 8 — wait, 9 > 8 so safe
    [8, 3, "caution"],   // exactly threshold + buffer = caution boundary
    [5, 3, "caution"],   // 5 in [3, 8]
    [3, 3, "caution"],   // exactly threshold
    [2, 3, "critical"],  // < 3
    [0, 3, "critical"],  // pole exact
    [-2, 3, "critical"], // negative inside zone (|−2|=2 < 3)
    [-45, 3, "safe"],    // far on other side
  ])("checkSingularityRisk(angle=%i, threshold=%i) → %s", async (angle, thresh, cls) => {
    const { PowerMill5AxisRobotFunctionIndexEngine } = await import(
      "../engines/PowerMill5AxisRobotFunctionIndexEngine.js"
    );
    const r: any = PowerMill5AxisRobotFunctionIndexEngine.checkSingularityRisk(angle, thresh);
    expect(r.classification).toBe(cls);
    expect(r.proximity_to_singularity_deg).toBe(Math.abs(angle));
  });

  it.each([
    ["NaN angle", NaN, 3],
    ["Infinity angle", Infinity, 3],
    ["NaN threshold", 5, NaN],
    ["zero threshold", 5, 0],
    ["negative threshold", 5, -1],
    ["threshold > 30", 5, 31],
  ])("checkSingularityRisk rejects: %s", async (_label, angle, thresh) => {
    const { PowerMill5AxisRobotFunctionIndexEngine } = await import(
      "../engines/PowerMill5AxisRobotFunctionIndexEngine.js"
    );
    const r: any = PowerMill5AxisRobotFunctionIndexEngine.checkSingularityRisk(angle, thresh);
    expect("error" in r).toBe(true);
  });

  // validateRobotReach — annulus check
  it("validateRobotReach: ABB IRB-1600 (L1=475, L2=600), target 800mm → in_envelope", async () => {
    const { PowerMill5AxisRobotFunctionIndexEngine } = await import(
      "../engines/PowerMill5AxisRobotFunctionIndexEngine.js"
    );
    // max = 475+600 = 1075, min = |600-475| = 125, target 800 ∈ [125,1075]
    const r: any = PowerMill5AxisRobotFunctionIndexEngine.validateRobotReach(800, 475, 600);
    expect(r.is_reachable).toBe(true);
    expect(r.status).toBe("in_envelope");
    expect(r.max_reach_mm).toBe(1075);
    expect(r.min_reach_mm).toBe(125);
  });

  it("validateRobotReach: target beyond max reach → too_far with margin", async () => {
    const { PowerMill5AxisRobotFunctionIndexEngine } = await import(
      "../engines/PowerMill5AxisRobotFunctionIndexEngine.js"
    );
    // max = 1000, target 1200 → too_far by 200
    const r: any = PowerMill5AxisRobotFunctionIndexEngine.validateRobotReach(1200, 500, 500);
    expect(r.is_reachable).toBe(false);
    expect(r.status).toBe("too_far");
    expect(r.margin_mm).toBeCloseTo(200, 6);
  });

  it("validateRobotReach: target inside min reach → too_close with margin", async () => {
    const { PowerMill5AxisRobotFunctionIndexEngine } = await import(
      "../engines/PowerMill5AxisRobotFunctionIndexEngine.js"
    );
    // L1=475, L2=200, min=275, target 100 → too_close by 175
    const r: any = PowerMill5AxisRobotFunctionIndexEngine.validateRobotReach(100, 475, 200);
    expect(r.is_reachable).toBe(false);
    expect(r.status).toBe("too_close");
    expect(r.min_reach_mm).toBe(275);
    expect(r.margin_mm).toBeCloseTo(175, 6);
  });

  it("validateRobotReach: wrist_offset extends max reach", async () => {
    const { PowerMill5AxisRobotFunctionIndexEngine } = await import(
      "../engines/PowerMill5AxisRobotFunctionIndexEngine.js"
    );
    const without: any = PowerMill5AxisRobotFunctionIndexEngine.validateRobotReach(1080, 500, 500, 0);
    const withWrist: any = PowerMill5AxisRobotFunctionIndexEngine.validateRobotReach(1080, 500, 500, 100);
    expect(without.is_reachable).toBe(false); // 1080 > 1000
    expect(withWrist.is_reachable).toBe(true); // 1080 < 1100
  });

  it.each([
    ["NaN target", NaN, 500, 500],
    ["negative target", -100, 500, 500],
    ["NaN upper", 800, NaN, 500],
    ["zero upper", 800, 0, 500],
    ["negative upper", 800, -500, 500],
    ["NaN forearm", 800, 500, NaN],
    ["zero forearm", 800, 500, 0],
    ["negative forearm", 800, 500, -500],
  ])("validateRobotReach rejects: %s", async (_label, target, upper, forearm) => {
    const { PowerMill5AxisRobotFunctionIndexEngine } = await import(
      "../engines/PowerMill5AxisRobotFunctionIndexEngine.js"
    );
    const r: any = PowerMill5AxisRobotFunctionIndexEngine.validateRobotReach(target, upper, forearm);
    expect("error" in r).toBe(true);
  });

  // Dispatcher round-trip
  it("round-trip: pm_5axisrobot_summary returns 12/187", async () => {
    const r: any = await invoke("pm_5axisrobot_summary", {});
    const d = r.data ?? r.result ?? r;
    expect(d.total_operations).toBe(12);
    expect(d.total_parameters).toBe(187);
  });

  it("round-trip: pm_5axisrobot_get_op('blade_simul5') returns 24 params, swarf_blade_port", async () => {
    const r: any = await invoke("pm_5axisrobot_get_op", { operation_id: "blade_simul5" });
    const d = r.data ?? r.result ?? r;
    expect(d.category).toBe("swarf_blade_port");
    expect(d.parameter_count).toBe(24);
  });

  it("round-trip: pm_5axisrobot_classify_kinematic(2,0) → head_head", async () => {
    const r: any = await invoke("pm_5axisrobot_classify_kinematic", { rotary_on_head: 2, rotary_on_table: 0 });
    const d = r.data ?? r.result ?? r;
    expect(d.kinematic_type).toBe("head_head");
  });

  it("round-trip: pm_5axisrobot_classify_kinematic(0,2) → table_table", async () => {
    const r: any = await invoke("pm_5axisrobot_classify_kinematic", { rotary_on_head: 0, rotary_on_table: 2 });
    const d = r.data ?? r.result ?? r;
    expect(d.kinematic_type).toBe("table_table");
  });

  it("round-trip: pm_5axisrobot_singularity_check(45) → safe", async () => {
    const r: any = await invoke("pm_5axisrobot_singularity_check", { primary_rotary_deg: 45 });
    const d = r.data ?? r.result ?? r;
    expect(d.classification).toBe("safe");
  });

  it("round-trip: pm_5axisrobot_singularity_check(0) → critical", async () => {
    const r: any = await invoke("pm_5axisrobot_singularity_check", { primary_rotary_deg: 0 });
    const d = r.data ?? r.result ?? r;
    expect(d.classification).toBe("critical");
  });

  it("round-trip: pm_5axisrobot_robot_reach(800, 475, 600) → in_envelope", async () => {
    const r: any = await invoke("pm_5axisrobot_robot_reach", { target_distance_mm: 800, upper_arm_mm: 475, forearm_mm: 600 });
    const d = r.data ?? r.result ?? r;
    expect(d.is_reachable).toBe(true);
    expect(d.status).toBe("in_envelope");
  });

  it("round-trip: pm_5axisrobot_recommend(impeller_blade_full_chain) → blade_simul5", async () => {
    const r: any = await invoke("pm_5axisrobot_recommend", { intent: "impeller_blade_full_chain" });
    const d = r.data ?? r.result ?? r;
    expect(d.primary).toBe("blade_simul5");
  });

  it("round-trip: validation error for fractional rotary count in classify", async () => {
    const r: any = await invoke("pm_5axisrobot_classify_kinematic", { rotary_on_head: 1.5, rotary_on_table: 0 });
    const blob = JSON.stringify(r);
    expect(blob).toMatch(/Invalid params|integer/i);
  });

  // Schema integration
  it("camDispatcher ACTIONS contains all 10 pm_5axisrobot_* action names", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const expected = [
      "pm_5axisrobot_index",
      "pm_5axisrobot_summary",
      "pm_5axisrobot_list_ops",
      "pm_5axisrobot_get_op",
      "pm_5axisrobot_by_category",
      "pm_5axisrobot_find_param",
      "pm_5axisrobot_recommend",
      "pm_5axisrobot_classify_kinematic",
      "pm_5axisrobot_singularity_check",
      "pm_5axisrobot_robot_reach",
    ];
    for (const a of expected) expect(mod.ACTIONS).toContain(a);
  });

  it("ACTION_PM_5AXISROBOT_FUNCTION_INDEX_SCHEMAS has exactly 10 keys", async () => {
    const { ACTION_PM_5AXISROBOT_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/powerMill5AxisRobotFunctionIndexActionSchemas.js"
    );
    expect(Object.keys(ACTION_PM_5AXISROBOT_FUNCTION_INDEX_SCHEMAS)).toHaveLength(10);
  });

  it("pm_5axisrobot_classify_kinematic schema enforces integer rotary counts in [0,3]", async () => {
    const { ACTION_PM_5AXISROBOT_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/powerMill5AxisRobotFunctionIndexActionSchemas.js"
    );
    const s = ACTION_PM_5AXISROBOT_FUNCTION_INDEX_SCHEMAS.pm_5axisrobot_classify_kinematic;
    expect(s.safeParse({ rotary_on_head: 2, rotary_on_table: 0 }).success).toBe(true);
    expect(s.safeParse({ rotary_on_head: 0, rotary_on_table: 0, robot_articulated: true }).success).toBe(true);
    expect(s.safeParse({ rotary_on_head: 1.5, rotary_on_table: 0 }).success).toBe(false);
    expect(s.safeParse({ rotary_on_head: 4, rotary_on_table: 0 }).success).toBe(false);
    expect(s.safeParse({ rotary_on_head: -1, rotary_on_table: 0 }).success).toBe(false);
  });

  it("pm_5axisrobot_robot_reach schema enforces positive arm lengths and non-negative target/wrist", async () => {
    const { ACTION_PM_5AXISROBOT_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/powerMill5AxisRobotFunctionIndexActionSchemas.js"
    );
    const s = ACTION_PM_5AXISROBOT_FUNCTION_INDEX_SCHEMAS.pm_5axisrobot_robot_reach;
    expect(s.safeParse({ target_distance_mm: 800, upper_arm_mm: 475, forearm_mm: 600 }).success).toBe(true);
    expect(s.safeParse({ target_distance_mm: 0, upper_arm_mm: 475, forearm_mm: 600 }).success).toBe(true);
    expect(s.safeParse({ target_distance_mm: -1, upper_arm_mm: 475, forearm_mm: 600 }).success).toBe(false);
    expect(s.safeParse({ target_distance_mm: 800, upper_arm_mm: 0, forearm_mm: 600 }).success).toBe(false);
    expect(s.safeParse({ target_distance_mm: 800, upper_arm_mm: 475, forearm_mm: -1 }).success).toBe(false);
    expect(s.safeParse({ target_distance_mm: 800, upper_arm_mm: 475, forearm_mm: 600, wrist_offset_mm: -10 }).success).toBe(false);
  });
});
