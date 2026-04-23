/**
 * PowerMillRoughingFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM43
 *
 * Coverage:
 *   - schema invariants: 12 ops, 189 params, 5 categories, 6 topics
 *   - per-op reference values + parameter-count consistency
 *   - variability: all 5 categories present; Vortex envelope check 4 boundary points;
 *     rest cascade 4 ratios; plunge feasibility 5 cases
 *   - engine methods: real invocation + failure + adversarial NaN/Infinity
 *   - recommendByFeature: 12 intents end-to-end + default fallback
 *   - vortexEngagementCheck: 3 zone boundaries (safe/caution/critical) + adversarial
 *   - restMachiningWorthwhile: textbook ratios + adversarial
 *   - plungeStrategyValidate: 5 cases including too-narrow / too-wide / feed-out-of-range
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

describe("PowerMillRoughingFunctionIndexEngine — engine + dispatcher", () => {
  it("getSummary returns exactly 12 ops / 189 params / 5 categories / powermill/roughing", async () => {
    const { PowerMillRoughingFunctionIndexEngine } = await import(
      "../engines/PowerMillRoughingFunctionIndexEngine.js"
    );
    const s: any = PowerMillRoughingFunctionIndexEngine.getSummary();
    expect(s.system_id).toBe("powermill");
    expect(s.section_key).toBe("roughing");
    expect(s.total_operations).toBe(12);
    expect(s.total_parameters).toBe(189);
    expect(s.categories).toHaveLength(5);
    expect(s.training_topics_count).toBe(6);
  });

  it.each([
    ["model_area_clearance", "model_area_clearance", 23],
    ["offset_area_clearance", "model_area_clearance", 18],
    ["profile_area_clearance", "model_area_clearance", 13],
    ["slice_area_clearance", "model_area_clearance", 14],
    ["vortex_clearance", "vortex", 25],
    ["plunge_roughing", "plunge", 17],
    ["plunge_mill_pocket", "plunge", 12],
    ["adaptive_clearance_boundary", "adaptive", 14],
    ["raster_area_clearance", "adaptive", 16],
    ["rest_roughing", "rest_and_helpers", 13],
    ["stock_model_management", "rest_and_helpers", 12],
    ["drill_for_clearance", "rest_and_helpers", 12],
  ])("op %s → category %s, params %i", async (id, cat, count) => {
    const { PowerMillRoughingFunctionIndexEngine } = await import(
      "../engines/PowerMillRoughingFunctionIndexEngine.js"
    );
    const op: any = PowerMillRoughingFunctionIndexEngine.getOperation(id);
    expect("error" in op).toBe(false);
    expect(op.category).toBe(cat);
    expect(op.parameter_count).toBe(count);
  });

  it("declared sum = 189 + every op's nested parameter count matches declared", async () => {
    const { PowerMillRoughingFunctionIndexEngine } = await import(
      "../engines/PowerMillRoughingFunctionIndexEngine.js"
    );
    const idx: any = PowerMillRoughingFunctionIndexEngine.getIndex();
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
    expect(total).toBe(189);
  });

  it("category breakdown sums to 189 / 12 ops across 5 categories", async () => {
    const { PowerMillRoughingFunctionIndexEngine } = await import(
      "../engines/PowerMillRoughingFunctionIndexEngine.js"
    );
    const b = PowerMillRoughingFunctionIndexEngine.getCategoryBreakdown();
    expect(b.length).toBe(5);
    expect(b.reduce((a, x) => a + x.operations.length, 0)).toBe(12);
    expect(b.reduce((a, x) => a + x.total_parameters, 0)).toBe(189);
  });

  it("variability: vortex_clearance carries the canonical envelope params (radial%, axial DOC, fpt)", async () => {
    const { PowerMillRoughingFunctionIndexEngine } = await import(
      "../engines/PowerMillRoughingFunctionIndexEngine.js"
    );
    const op: any = PowerMillRoughingFunctionIndexEngine.getOperation("vortex_clearance");
    // engagement defaults must reflect canonical envelope (≤12% radial, ≤2.5×D axial, ~0.10 fpt)
    expect(op.parameters.engagement.max_radial_engagement_pct.default).toBe(8);
    expect(op.parameters.engagement.max_radial_engagement_pct.max).toBe(25);
    expect(op.parameters.axial.axial_doc_to_dia_ratio.max).toBe(3.0);
    expect(op.parameters.axial.axial_doc_to_dia_ratio.default).toBe(1.5);
    expect(op.parameters.feed_speed.feed_per_tooth_mm.default).toBe(0.10);
  });

  it("variability: plunge_roughing pecks by default and constrains plunge to 25mm starting depth", async () => {
    const { PowerMillRoughingFunctionIndexEngine } = await import(
      "../engines/PowerMillRoughingFunctionIndexEngine.js"
    );
    const op: any = PowerMillRoughingFunctionIndexEngine.getOperation("plunge_roughing");
    expect(op.parameters.limits.peck_enabled.default).toBe(true);
    expect(op.parameters.limits.max_plunge_depth_mm.default).toBe(25);
    expect(op.parameters.limits.peck_depth_mm.default).toBe(2);
  });

  it("variability: drill_for_clearance defaults to G73 (high-speed peck) cycle", async () => {
    const { PowerMillRoughingFunctionIndexEngine } = await import(
      "../engines/PowerMillRoughingFunctionIndexEngine.js"
    );
    const op: any = PowerMillRoughingFunctionIndexEngine.getOperation("drill_for_clearance");
    expect(op.parameters.cycle.cycle_type.default).toBe("G73_high_speed_peck");
    expect(op.parameters.cycle.cycle_type.values).toContain("G83_deep_peck");
    expect(op.parameters.cycle.cycle_type.values).toContain("G81_drill");
  });

  // Failure modes
  it("getOperation returns {error: ...} on unknown id, real match on known", async () => {
    const { PowerMillRoughingFunctionIndexEngine } = await import(
      "../engines/PowerMillRoughingFunctionIndexEngine.js"
    );
    const bad: any = PowerMillRoughingFunctionIndexEngine.getOperation("bogus_id_does_not_exist");
    expect(bad.error).toMatch(/bogus_id_does_not_exist/);
    const good: any = PowerMillRoughingFunctionIndexEngine.getOperation("vortex_clearance");
    expect(good.operation_id).toBe("vortex_clearance");
    expect(good.parameter_count).toBe(25);
  });

  it("getOperationsByCategory case-insensitive + empty on unknown", async () => {
    const { PowerMillRoughingFunctionIndexEngine } = await import(
      "../engines/PowerMillRoughingFunctionIndexEngine.js"
    );
    const lower = PowerMillRoughingFunctionIndexEngine.getOperationsByCategory("model_area_clearance");
    const upper = PowerMillRoughingFunctionIndexEngine.getOperationsByCategory("MODEL_AREA_CLEARANCE");
    expect(lower.length).toBe(4);
    expect(upper.length).toBe(4);
    expect(lower.map((o) => o.operation_id).sort()).toEqual([
      "model_area_clearance",
      "offset_area_clearance",
      "profile_area_clearance",
      "slice_area_clearance",
    ]);
    expect(PowerMillRoughingFunctionIndexEngine.getOperationsByCategory("no_such_cat")).toHaveLength(0);
  });

  it("findParameter respects limit; returns empty on no match; real content on match", async () => {
    const { PowerMillRoughingFunctionIndexEngine } = await import(
      "../engines/PowerMillRoughingFunctionIndexEngine.js"
    );
    const all = PowerMillRoughingFunctionIndexEngine.findParameter("safe_z_mm", 1000);
    expect(all.length).toBeGreaterThanOrEqual(5);
    all.forEach((m) => expect(m.parameter).toBe("safe_z_mm"));
    const capped = PowerMillRoughingFunctionIndexEngine.findParameter("safe_z_mm", 3);
    expect(capped.length).toBe(3);
    expect(PowerMillRoughingFunctionIndexEngine.findParameter("zz_xxx_nonexistent")).toHaveLength(0);
  });

  // recommendByFeature — 12 intents
  it.each([
    ["general_cavity_rough", "model_area_clearance"],
    ["smooth_offset_fill", "offset_area_clearance"],
    ["profile_only_rough", "profile_area_clearance"],
    ["waterline_pre_finish", "slice_area_clearance"],
    ["high_efficiency_adaptive", "vortex_clearance"],
    ["deep_cavity_unstable", "plunge_roughing"],
    ["narrow_pocket_plunge", "plunge_mill_pocket"],
    ["selective_adaptive_region", "adaptive_clearance_boundary"],
    ["raster_lace_fill", "raster_area_clearance"],
    ["rest_clearance_after_big_tool", "rest_roughing"],
    ["stock_model_setup", "stock_model_management"],
    ["pre_pierce_or_chip_release", "drill_for_clearance"],
  ])("recommendByFeature(%s) → %s (verified in catalog)", async (intent, expected) => {
    const { PowerMillRoughingFunctionIndexEngine } = await import(
      "../engines/PowerMillRoughingFunctionIndexEngine.js"
    );
    const r = PowerMillRoughingFunctionIndexEngine.recommendByFeature(intent as any);
    expect(r.primary).toBe(expected);
    expect(r.reason.length).toBeGreaterThan(10);
    const op: any = PowerMillRoughingFunctionIndexEngine.getOperation(r.primary);
    expect("error" in op).toBe(false);
    expect(op.operation_id).toBe(expected);
  });

  it("recommendByFeature defaults safely with informative reason", async () => {
    const { PowerMillRoughingFunctionIndexEngine } = await import(
      "../engines/PowerMillRoughingFunctionIndexEngine.js"
    );
    const r = PowerMillRoughingFunctionIndexEngine.recommendByFeature("totally_bogus" as any);
    expect(r.primary).toBe("model_area_clearance");
    expect(r.reason).toMatch(/unknown|default/i);
  });

  // vortexEngagementCheck — 3 zones with deterministic boundaries
  it.each([
    [8, 1.5, "safe"],
    [12, 2.5, "safe"],
    [12, 2.6, "caution"],
    [15, 2.5, "caution"],
    [18, 3.0, "caution"],
    [19, 2.5, "critical"],
    [12, 3.1, "critical"],
    [50, 5.0, "critical"],
  ])("vortexEngagementCheck(radial=%i%%,axial/D=%f) → %s", async (r, a, cls) => {
    const { PowerMillRoughingFunctionIndexEngine } = await import(
      "../engines/PowerMillRoughingFunctionIndexEngine.js"
    );
    const result: any = PowerMillRoughingFunctionIndexEngine.vortexEngagementCheck(r, a);
    expect(result.classification).toBe(cls);
    expect(result.radial_engagement_pct).toBe(r);
    expect(result.axial_doc_to_dia_ratio).toBe(a);
  });

  it.each([
    ["NaN radial", NaN, 1.5],
    ["zero radial", 0, 1.5],
    ["radial > 100", 101, 1.5],
    ["NaN axial", 8, NaN],
    ["zero axial", 8, 0],
    ["negative axial", 8, -1],
  ])("vortexEngagementCheck rejects: %s", async (_label, r, a) => {
    const { PowerMillRoughingFunctionIndexEngine } = await import(
      "../engines/PowerMillRoughingFunctionIndexEngine.js"
    );
    const result: any = PowerMillRoughingFunctionIndexEngine.vortexEngagementCheck(r, a);
    expect("error" in result).toBe(true);
  });

  // restMachiningWorthwhile — rule of thumb
  it.each([
    [20, 10, true, 0.5],   // exactly 50% — at threshold, worthwhile
    [20, 8, true, 0.4],    // 40% — clearly worthwhile
    [20, 4, true, 0.2],    // 20% — strongly worthwhile
    [20, 11, false, 0.55], // 55% — not worthwhile
    [20, 16, false, 0.8],  // 80% — clearly not worthwhile
    [20, 20, false, 1.0],  // same diameter — not worthwhile
  ])("restMachiningWorthwhile(prev=%i, curr=%i) → worthwhile=%s, ratio=%f", async (prev, curr, worth, ratio) => {
    const { PowerMillRoughingFunctionIndexEngine } = await import(
      "../engines/PowerMillRoughingFunctionIndexEngine.js"
    );
    const r: any = PowerMillRoughingFunctionIndexEngine.restMachiningWorthwhile(prev, curr);
    expect(r.worthwhile).toBe(worth);
    expect(r.diameter_ratio).toBeCloseTo(ratio, 6);
  });

  it.each([
    ["NaN prev", NaN, 10],
    ["zero prev", 0, 10],
    ["negative prev", -5, 10],
    ["NaN curr", 20, NaN],
    ["zero curr", 20, 0],
  ])("restMachiningWorthwhile rejects: %s", async (_label, prev, curr) => {
    const { PowerMillRoughingFunctionIndexEngine } = await import(
      "../engines/PowerMillRoughingFunctionIndexEngine.js"
    );
    const r: any = PowerMillRoughingFunctionIndexEngine.restMachiningWorthwhile(prev, curr);
    expect("error" in r).toBe(true);
  });

  // plungeStrategyValidate — feasibility envelope
  it("plungeStrategyValidate: ideal case — slot 1.2× tool, plunge feed 35% → valid", async () => {
    const { PowerMillRoughingFunctionIndexEngine } = await import(
      "../engines/PowerMillRoughingFunctionIndexEngine.js"
    );
    const r: any = PowerMillRoughingFunctionIndexEngine.plungeStrategyValidate(12, 10, 35);
    expect(r.is_valid).toBe(true);
    expect(r.issues).toHaveLength(0);
    expect(r.slot_width_to_tool_ratio).toBeCloseTo(1.2, 6);
  });

  it("plungeStrategyValidate: slot too narrow (8mm slot, 10mm tool) → invalid 'does not fit'", async () => {
    const { PowerMillRoughingFunctionIndexEngine } = await import(
      "../engines/PowerMillRoughingFunctionIndexEngine.js"
    );
    const r: any = PowerMillRoughingFunctionIndexEngine.plungeStrategyValidate(8, 10, 35);
    expect(r.is_valid).toBe(false);
    expect(r.issues.join(" ")).toMatch(/does not fit/);
  });

  it("plungeStrategyValidate: slot too wide (20mm, 10mm tool) → conventional milling faster", async () => {
    const { PowerMillRoughingFunctionIndexEngine } = await import(
      "../engines/PowerMillRoughingFunctionIndexEngine.js"
    );
    const r: any = PowerMillRoughingFunctionIndexEngine.plungeStrategyValidate(20, 10, 35);
    expect(r.is_valid).toBe(false);
    expect(r.issues.join(" ")).toMatch(/conventional milling/);
  });

  it("plungeStrategyValidate: plunge feed too low (10%) → unnecessarily slow", async () => {
    const { PowerMillRoughingFunctionIndexEngine } = await import(
      "../engines/PowerMillRoughingFunctionIndexEngine.js"
    );
    const r: any = PowerMillRoughingFunctionIndexEngine.plungeStrategyValidate(12, 10, 10);
    expect(r.is_valid).toBe(false);
    expect(r.issues.join(" ")).toMatch(/unnecessarily slow/);
  });

  it("plungeStrategyValidate: plunge feed too high (75%) → breakage risk", async () => {
    const { PowerMillRoughingFunctionIndexEngine } = await import(
      "../engines/PowerMillRoughingFunctionIndexEngine.js"
    );
    const r: any = PowerMillRoughingFunctionIndexEngine.plungeStrategyValidate(12, 10, 75);
    expect(r.is_valid).toBe(false);
    expect(r.issues.join(" ")).toMatch(/breakage risk/);
  });

  it.each([
    ["NaN slot", NaN, 10, 35],
    ["zero slot", 0, 10, 35],
    ["NaN tool_dia", 12, NaN, 35],
    ["NaN feed", 12, 10, NaN],
    ["zero feed", 12, 10, 0],
    ["feed > 100", 12, 10, 101],
  ])("plungeStrategyValidate rejects: %s", async (_label, slot, tool, feed) => {
    const { PowerMillRoughingFunctionIndexEngine } = await import(
      "../engines/PowerMillRoughingFunctionIndexEngine.js"
    );
    const r: any = PowerMillRoughingFunctionIndexEngine.plungeStrategyValidate(slot, tool, feed);
    expect("error" in r).toBe(true);
  });

  // Dispatcher round-trip
  it("round-trip: pm_roughing_summary returns 12/189", async () => {
    const r: any = await invoke("pm_roughing_summary", {});
    const d = r.data ?? r.result ?? r;
    expect(d.total_operations).toBe(12);
    expect(d.total_parameters).toBe(189);
  });

  it("round-trip: pm_roughing_get_op('vortex_clearance') returns 25 params, vortex category", async () => {
    const r: any = await invoke("pm_roughing_get_op", { operation_id: "vortex_clearance" });
    const d = r.data ?? r.result ?? r;
    expect(d.category).toBe("vortex");
    expect(d.parameter_count).toBe(25);
  });

  it("round-trip: pm_roughing_vortex_check(8,1.5) → safe", async () => {
    const r: any = await invoke("pm_roughing_vortex_check", { radial_engagement_pct: 8, axial_doc_to_dia_ratio: 1.5 });
    const d = r.data ?? r.result ?? r;
    expect(d.classification).toBe("safe");
  });

  it("round-trip: pm_roughing_vortex_check(50,5) → critical", async () => {
    const r: any = await invoke("pm_roughing_vortex_check", { radial_engagement_pct: 50, axial_doc_to_dia_ratio: 5 });
    const d = r.data ?? r.result ?? r;
    expect(d.classification).toBe("critical");
  });

  it("round-trip: pm_roughing_rest_worthwhile(20, 8) → worthwhile=true, ratio=0.4", async () => {
    const r: any = await invoke("pm_roughing_rest_worthwhile", { previous_tool_diameter_mm: 20, current_tool_diameter_mm: 8 });
    const d = r.data ?? r.result ?? r;
    expect(d.worthwhile).toBe(true);
    expect(d.diameter_ratio).toBeCloseTo(0.4, 6);
  });

  it("round-trip: pm_roughing_plunge_validate happy path (slot=12, tool=10, feed=35) → valid", async () => {
    const r: any = await invoke("pm_roughing_plunge_validate", { slot_width_mm: 12, tool_diameter_mm: 10, plunge_feed_pct: 35 });
    const d = r.data ?? r.result ?? r;
    expect(d.is_valid).toBe(true);
  });

  it("round-trip: pm_roughing_recommend(high_efficiency_adaptive) → vortex_clearance", async () => {
    const r: any = await invoke("pm_roughing_recommend", { intent: "high_efficiency_adaptive" });
    const d = r.data ?? r.result ?? r;
    expect(d.primary).toBe("vortex_clearance");
  });

  it("round-trip: validation error for radial > 100 in vortex_check", async () => {
    const r: any = await invoke("pm_roughing_vortex_check", { radial_engagement_pct: 200, axial_doc_to_dia_ratio: 1 });
    const blob = JSON.stringify(r);
    expect(blob).toMatch(/Invalid params|100/i);
  });

  // Schema integration
  it("camDispatcher ACTIONS contains all 10 pm_roughing_* action names", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const expected = [
      "pm_roughing_index",
      "pm_roughing_summary",
      "pm_roughing_list_ops",
      "pm_roughing_get_op",
      "pm_roughing_by_category",
      "pm_roughing_find_param",
      "pm_roughing_recommend",
      "pm_roughing_vortex_check",
      "pm_roughing_rest_worthwhile",
      "pm_roughing_plunge_validate",
    ];
    for (const a of expected) expect(mod.ACTIONS).toContain(a);
  });

  it("ACTION_PM_ROUGHING_FUNCTION_INDEX_SCHEMAS has exactly 10 keys", async () => {
    const { ACTION_PM_ROUGHING_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/powerMillRoughingFunctionIndexActionSchemas.js"
    );
    expect(Object.keys(ACTION_PM_ROUGHING_FUNCTION_INDEX_SCHEMAS)).toHaveLength(10);
  });

  it("pm_roughing_vortex_check schema enforces radial in (0,100] and positive axial ratio", async () => {
    const { ACTION_PM_ROUGHING_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/powerMillRoughingFunctionIndexActionSchemas.js"
    );
    const s = ACTION_PM_ROUGHING_FUNCTION_INDEX_SCHEMAS.pm_roughing_vortex_check;
    expect(s.safeParse({ radial_engagement_pct: 8, axial_doc_to_dia_ratio: 1.5 }).success).toBe(true);
    expect(s.safeParse({ radial_engagement_pct: 100, axial_doc_to_dia_ratio: 1.5 }).success).toBe(true);
    expect(s.safeParse({ radial_engagement_pct: 0, axial_doc_to_dia_ratio: 1.5 }).success).toBe(false);
    expect(s.safeParse({ radial_engagement_pct: 101, axial_doc_to_dia_ratio: 1.5 }).success).toBe(false);
    expect(s.safeParse({ radial_engagement_pct: 8, axial_doc_to_dia_ratio: -1 }).success).toBe(false);
  });

  it("pm_roughing_plunge_validate schema enforces all three positive inputs", async () => {
    const { ACTION_PM_ROUGHING_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/powerMillRoughingFunctionIndexActionSchemas.js"
    );
    const s = ACTION_PM_ROUGHING_FUNCTION_INDEX_SCHEMAS.pm_roughing_plunge_validate;
    expect(s.safeParse({ slot_width_mm: 12, tool_diameter_mm: 10, plunge_feed_pct: 35 }).success).toBe(true);
    expect(s.safeParse({ slot_width_mm: 0, tool_diameter_mm: 10, plunge_feed_pct: 35 }).success).toBe(false);
    expect(s.safeParse({ slot_width_mm: 12, tool_diameter_mm: -10, plunge_feed_pct: 35 }).success).toBe(false);
    expect(s.safeParse({ slot_width_mm: 12, tool_diameter_mm: 10, plunge_feed_pct: 101 }).success).toBe(false);
  });
});
