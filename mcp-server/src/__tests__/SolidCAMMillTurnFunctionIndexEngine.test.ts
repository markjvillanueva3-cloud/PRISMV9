/**
 * SolidCAMMillTurnFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM37 (mill-turn)
 *
 * Coverage:
 *   - schema/metadata (12 ops, 188 params, 7 categories)
 *   - per-op reference values + parameter consistency
 *   - variability: all 7 categories + 3+ controller families
 *   - engine methods: happy + failures + adversarial
 *   - recommendByFeature: 11 feature types
 *   - validateSubSpindleSync: RPM delta vs tolerance
 *   - polarFeedAtRadius: feed clamp at small radius
 *   - validateWaitBarriers: deadlock-risk classification
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
    tool(name: string, _desc: string, _schema: unknown, handler: CapturedTool["handler"]) {
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

describe("SolidCAMMillTurnFunctionIndexEngine — engine + dispatcher", () => {
  it("engine module exports class with required methods", async () => {
    const mod: any = await import("../engines/SolidCAMMillTurnFunctionIndexEngine.js");
    expect(mod.SolidCAMMillTurnFunctionIndexEngine).toBeTruthy();
    const E = mod.SolidCAMMillTurnFunctionIndexEngine;
    expect(typeof E.getSummary).toBe("function");
    expect(typeof E.validateSubSpindleSync).toBe("function");
    expect(typeof E.polarFeedAtRadius).toBe("function");
    expect(typeof E.validateWaitBarriers).toBe("function");
  });

  it("getSummary returns 12 ops / 188 params / 7 categories", async () => {
    const { SolidCAMMillTurnFunctionIndexEngine } = await import(
      "../engines/SolidCAMMillTurnFunctionIndexEngine.js"
    );
    const s: any = SolidCAMMillTurnFunctionIndexEngine.getSummary();
    expect(s.system_id).toBe("solidcam");
    expect(s.section_key).toBe("millturn");
    expect(s.total_operations).toBe(12);
    expect(s.total_parameters).toBe(188);
    expect(s.categories).toHaveLength(7);
    expect(s.categories).toEqual(
      expect.arrayContaining([
        "live_tooling",
        "c_axis",
        "y_axis",
        "sub_spindle",
        "multi_channel",
        "swiss_type",
        "specialty",
      ]),
    );
    expect(s.training_topics_count).toBe(7);
  });

  // Reference values — 12 ops
  it.each([
    ["mt_live_mill_face", "live_tooling", 17],
    ["mt_live_mill_radial", "live_tooling", 16],
    ["mt_c_axis_drilling", "c_axis", 15],
    ["mt_c_axis_polar_milling", "c_axis", 16],
    ["mt_y_axis_milling", "y_axis", 15],
    ["mt_sub_spindle_pickup", "sub_spindle", 16],
    ["mt_sub_spindle_part_off", "sub_spindle", 15],
    ["mt_balanced_turning", "multi_channel", 17],
    ["mt_multi_channel_sync", "multi_channel", 15],
    ["mt_swiss_type_turning", "swiss_type", 17],
    ["mt_thread_chasing_sync", "specialty", 16],
    ["mt_bar_feeder_advance", "specialty", 13],
  ])("op %s → category %s, params=%i", async (id, cat, count) => {
    const { SolidCAMMillTurnFunctionIndexEngine } = await import(
      "../engines/SolidCAMMillTurnFunctionIndexEngine.js"
    );
    const op: any = SolidCAMMillTurnFunctionIndexEngine.getOperation(id);
    expect("error" in op).toBe(false);
    expect(op.category).toBe(cat);
    expect(op.parameter_count).toBe(count);
  });

  it("sum of declared equals 188 and nested actual matches", async () => {
    const { SolidCAMMillTurnFunctionIndexEngine } = await import(
      "../engines/SolidCAMMillTurnFunctionIndexEngine.js"
    );
    const idx: any = SolidCAMMillTurnFunctionIndexEngine.getIndex();
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
    expect(total).toBe(188);
  });

  it("category breakdown covers all 7 categories", async () => {
    const { SolidCAMMillTurnFunctionIndexEngine } = await import(
      "../engines/SolidCAMMillTurnFunctionIndexEngine.js"
    );
    const b = SolidCAMMillTurnFunctionIndexEngine.getCategoryBreakdown();
    expect(b.length).toBe(7);
    expect(b.reduce((a, x) => a + x.operations.length, 0)).toBe(12);
    expect(b.reduce((a, x) => a + x.total_parameters, 0)).toBe(188);
  });

  it("variability: controller families span ≥3 platforms", async () => {
    const { SolidCAMMillTurnFunctionIndexEngine } = await import(
      "../engines/SolidCAMMillTurnFunctionIndexEngine.js"
    );
    const idx: any = SolidCAMMillTurnFunctionIndexEngine.getIndex();
    const controllers = new Set<string>();
    for (const op of Object.values(idx.operations) as any) {
      for (const grp of Object.values(op.parameters) as any) {
        const ctrl = grp.controller;
        if (ctrl?.values) for (const v of ctrl.values) controllers.add(v);
      }
    }
    expect(controllers.size).toBeGreaterThanOrEqual(3);
  });

  it("getOperation returns error for unknown id", async () => {
    const { SolidCAMMillTurnFunctionIndexEngine } = await import(
      "../engines/SolidCAMMillTurnFunctionIndexEngine.js"
    );
    const op: any = SolidCAMMillTurnFunctionIndexEngine.getOperation("nonexistent");
    expect("error" in op).toBe(true);
  });

  it("findParameter respects limit + returns [] on no match", async () => {
    const { SolidCAMMillTurnFunctionIndexEngine } = await import(
      "../engines/SolidCAMMillTurnFunctionIndexEngine.js"
    );
    const all = SolidCAMMillTurnFunctionIndexEngine.findParameter("controller", 1000);
    expect(all.length).toBeGreaterThanOrEqual(3);
    const capped = SolidCAMMillTurnFunctionIndexEngine.findParameter("controller", 2);
    expect(capped.length).toBe(2);
    expect(SolidCAMMillTurnFunctionIndexEngine.findParameter("zz_bogus_param")).toHaveLength(0);
  });

  // ── recommendByFeature ──
  it.each([
    ["polar_face_pocket", "mt_c_axis_polar_milling"],
    ["cross_drilled_hole", "mt_live_mill_radial"],
    ["off_center_keyway", "mt_y_axis_milling"],
    ["bolt_circle_face", "mt_c_axis_drilling"],
    ["polar_slot_arc", "mt_c_axis_polar_milling"],
    ["second_op_on_back", "mt_sub_spindle_pickup"],
    ["long_shaft_balanced", "mt_balanced_turning"],
    ["main_sub_parallel", "mt_multi_channel_sync"],
    ["swiss_long_part", "mt_swiss_type_turning"],
    ["synced_thread_pickup", "mt_thread_chasing_sync"],
    ["bar_feed_cycle", "mt_bar_feeder_advance"],
  ])("recommendByFeature(%s) → %s", async (feature, expected) => {
    const { SolidCAMMillTurnFunctionIndexEngine } = await import(
      "../engines/SolidCAMMillTurnFunctionIndexEngine.js"
    );
    const r = SolidCAMMillTurnFunctionIndexEngine.recommendByFeature(feature as any);
    expect(r.primary).toBe(expected);
    const op: any = SolidCAMMillTurnFunctionIndexEngine.getOperation(r.primary);
    expect("error" in op).toBe(false);
  });

  it("recommendByFeature defaults on unknown feature", async () => {
    const { SolidCAMMillTurnFunctionIndexEngine } = await import(
      "../engines/SolidCAMMillTurnFunctionIndexEngine.js"
    );
    const r = SolidCAMMillTurnFunctionIndexEngine.recommendByFeature("fictional" as any);
    expect(r.primary).toBe("mt_live_mill_face");
    expect(r.reason).toMatch(/unknown|default/i);
  });

  // ── validateSubSpindleSync ──
  it("validateSubSpindleSync: exact match is safe", async () => {
    const { SolidCAMMillTurnFunctionIndexEngine } = await import(
      "../engines/SolidCAMMillTurnFunctionIndexEngine.js"
    );
    const r: any = SolidCAMMillTurnFunctionIndexEngine.validateSubSpindleSync(500, 500, 5);
    expect(r.delta_rpm).toBe(0);
    expect(r.within_tolerance).toBe(true);
    expect(r.recommendation).toMatch(/safe/i);
  });

  it("validateSubSpindleSync: within tolerance", async () => {
    const { SolidCAMMillTurnFunctionIndexEngine } = await import(
      "../engines/SolidCAMMillTurnFunctionIndexEngine.js"
    );
    const r: any = SolidCAMMillTurnFunctionIndexEngine.validateSubSpindleSync(500, 503, 5);
    expect(r.delta_rpm).toBe(3);
    expect(r.within_tolerance).toBe(true);
  });

  it("validateSubSpindleSync: out of tolerance is blocked", async () => {
    const { SolidCAMMillTurnFunctionIndexEngine } = await import(
      "../engines/SolidCAMMillTurnFunctionIndexEngine.js"
    );
    const r: any = SolidCAMMillTurnFunctionIndexEngine.validateSubSpindleSync(500, 520, 5);
    expect(r.delta_rpm).toBe(20);
    expect(r.within_tolerance).toBe(false);
    expect(r.recommendation).toMatch(/NOT engage|resync/i);
  });

  it.each([
    ["NaN main", NaN, 500, 5],
    ["Infinity sub", 500, Infinity, 5],
    ["negative main", -100, 500, 5],
    ["negative tolerance", 500, 500, -1],
  ])("validateSubSpindleSync rejects bad input: %s", async (_label, a, b, t) => {
    const { SolidCAMMillTurnFunctionIndexEngine } = await import(
      "../engines/SolidCAMMillTurnFunctionIndexEngine.js"
    );
    const r: any = SolidCAMMillTurnFunctionIndexEngine.validateSubSpindleSync(a, b, t);
    expect("error" in r).toBe(true);
  });

  // ── polarFeedAtRadius ──
  it("polarFeedAtRadius: no clamp when radius >= min", async () => {
    const { SolidCAMMillTurnFunctionIndexEngine } = await import(
      "../engines/SolidCAMMillTurnFunctionIndexEngine.js"
    );
    const r: any = SolidCAMMillTurnFunctionIndexEngine.polarFeedAtRadius(1000, 5, 0.5);
    expect(r.feed_at_radius_mm_per_min).toBe(1000);
    expect(r.is_clamped).toBe(false);
  });

  it("polarFeedAtRadius: clamp scales proportionally at small r", async () => {
    const { SolidCAMMillTurnFunctionIndexEngine } = await import(
      "../engines/SolidCAMMillTurnFunctionIndexEngine.js"
    );
    // r=0.25, min=0.5 → feed * (0.25/0.5) = 500
    const r: any = SolidCAMMillTurnFunctionIndexEngine.polarFeedAtRadius(1000, 0.25, 0.5);
    expect(r.is_clamped).toBe(true);
    expect(r.feed_at_radius_mm_per_min).toBeCloseTo(500, 6);
    expect(r.clamp_reason).toMatch(/runaway|scaled/i);
  });

  it("polarFeedAtRadius: at r=0 feed goes to 0 (boundary)", async () => {
    const { SolidCAMMillTurnFunctionIndexEngine } = await import(
      "../engines/SolidCAMMillTurnFunctionIndexEngine.js"
    );
    const r: any = SolidCAMMillTurnFunctionIndexEngine.polarFeedAtRadius(1000, 0, 0.5);
    expect(r.is_clamped).toBe(true);
    expect(r.feed_at_radius_mm_per_min).toBe(0);
  });

  it.each([
    ["NaN feed", NaN, 1, 0.5],
    ["zero feed", 0, 1, 0.5],
    ["negative feed", -100, 1, 0.5],
    ["negative radius", 1000, -1, 0.5],
    ["zero min_radius", 1000, 1, 0],
    ["NaN min_radius", 1000, 1, NaN],
  ])("polarFeedAtRadius rejects: %s", async (_label, f, r, m) => {
    const { SolidCAMMillTurnFunctionIndexEngine } = await import(
      "../engines/SolidCAMMillTurnFunctionIndexEngine.js"
    );
    const res: any = SolidCAMMillTurnFunctionIndexEngine.polarFeedAtRadius(f, r, m);
    expect("error" in res).toBe(true);
  });

  // ── validateWaitBarriers ──
  it("validateWaitBarriers: balanced counts → no deadlock", async () => {
    const { SolidCAMMillTurnFunctionIndexEngine } = await import(
      "../engines/SolidCAMMillTurnFunctionIndexEngine.js"
    );
    const r: any = SolidCAMMillTurnFunctionIndexEngine.validateWaitBarriers(3, 3);
    expect(r.is_balanced).toBe(true);
    expect(r.deadlock_risk).toBe("none");
  });

  it("validateWaitBarriers: off-by-one → low risk", async () => {
    const { SolidCAMMillTurnFunctionIndexEngine } = await import(
      "../engines/SolidCAMMillTurnFunctionIndexEngine.js"
    );
    const r: any = SolidCAMMillTurnFunctionIndexEngine.validateWaitBarriers(3, 2);
    expect(r.is_balanced).toBe(false);
    expect(r.deadlock_risk).toBe("low");
  });

  it("validateWaitBarriers: off-by-many → high risk", async () => {
    const { SolidCAMMillTurnFunctionIndexEngine } = await import(
      "../engines/SolidCAMMillTurnFunctionIndexEngine.js"
    );
    const r: any = SolidCAMMillTurnFunctionIndexEngine.validateWaitBarriers(5, 1);
    expect(r.is_balanced).toBe(false);
    expect(r.deadlock_risk).toBe("high");
  });

  it.each([
    ["non-integer", 3.5, 3],
    ["negative", -1, 3],
    ["NaN", NaN, 3],
    ["Infinity", Infinity, 3],
  ])("validateWaitBarriers rejects: %s", async (_label, a, b) => {
    const { SolidCAMMillTurnFunctionIndexEngine } = await import(
      "../engines/SolidCAMMillTurnFunctionIndexEngine.js"
    );
    const r: any = SolidCAMMillTurnFunctionIndexEngine.validateWaitBarriers(a, b);
    expect("error" in r).toBe(true);
  });

  // ── Dispatcher round-trip ──
  it("round-trip: solidcam_millturn_summary returns 12/188/7", async () => {
    const r: any = await invoke("solidcam_millturn_summary", {});
    const d = r.data ?? r.result ?? r;
    expect(d.total_operations).toBe(12);
    expect(d.total_parameters).toBe(188);
    expect(d.categories).toHaveLength(7);
  });

  it("round-trip: solidcam_millturn_get_op returns balanced turning", async () => {
    const r: any = await invoke("solidcam_millturn_get_op", { operation_id: "mt_balanced_turning" });
    const d = r.data ?? r.result ?? r;
    expect(d.category).toBe("multi_channel");
    expect(d.parameter_count).toBe(17);
  });

  it("round-trip: solidcam_millturn_sync_check safe case", async () => {
    const r: any = await invoke("solidcam_millturn_sync_check", {
      rpm_main: 500, rpm_sub: 502, tolerance_rpm: 5,
    });
    const d = r.data ?? r.result ?? r;
    expect(d.within_tolerance).toBe(true);
    expect(d.delta_rpm).toBe(2);
  });

  it("round-trip: solidcam_millturn_polar_feed clamps near center", async () => {
    const r: any = await invoke("solidcam_millturn_polar_feed", {
      linear_feed_mm_per_min: 1000, radius_mm: 0.1, min_radius_mm: 1,
    });
    const d = r.data ?? r.result ?? r;
    expect(d.is_clamped).toBe(true);
    expect(d.feed_at_radius_mm_per_min).toBeCloseTo(100, 6);
  });

  it("round-trip: solidcam_millturn_wait_barriers balanced", async () => {
    const r: any = await invoke("solidcam_millturn_wait_barriers", { main_count: 4, sub_count: 4 });
    const d = r.data ?? r.result ?? r;
    expect(d.is_balanced).toBe(true);
    expect(d.deadlock_risk).toBe("none");
  });

  it("round-trip: solidcam_millturn_recommend", async () => {
    const r: any = await invoke("solidcam_millturn_recommend", { feature: "swiss_long_part" });
    const d = r.data ?? r.result ?? r;
    expect(d.primary).toBe("mt_swiss_type_turning");
  });

  it("round-trip: validation error for bad sync params", async () => {
    const r: any = await invoke("solidcam_millturn_sync_check", { rpm_main: -100, rpm_sub: 500, tolerance_rpm: 5 });
    const blob = JSON.stringify(r);
    expect(blob).toMatch(/Invalid params|rpm_main|minimum|greater/i);
  });

  // ── Schema integration ──
  it("camDispatcher ACTIONS includes all 10 millturn actions", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const expected = [
      "solidcam_millturn_index",
      "solidcam_millturn_summary",
      "solidcam_millturn_list_ops",
      "solidcam_millturn_get_op",
      "solidcam_millturn_by_category",
      "solidcam_millturn_find_param",
      "solidcam_millturn_recommend",
      "solidcam_millturn_sync_check",
      "solidcam_millturn_polar_feed",
      "solidcam_millturn_wait_barriers",
    ];
    for (const a of expected) expect(mod.ACTIONS).toContain(a);
  });

  it("ACTION_SOLIDCAM_MILLTURN_FUNCTION_INDEX_SCHEMAS has 10 keys", async () => {
    const { ACTION_SOLIDCAM_MILLTURN_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/solidcamMillTurnFunctionIndexActionSchemas.js"
    );
    expect(Object.keys(ACTION_SOLIDCAM_MILLTURN_FUNCTION_INDEX_SCHEMAS)).toHaveLength(10);
  });

  it("solidcam_millturn_polar_feed schema rejects zero min_radius", async () => {
    const { ACTION_SOLIDCAM_MILLTURN_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/solidcamMillTurnFunctionIndexActionSchemas.js"
    );
    const s = ACTION_SOLIDCAM_MILLTURN_FUNCTION_INDEX_SCHEMAS.solidcam_millturn_polar_feed;
    expect(s.safeParse({ linear_feed_mm_per_min: 1000, radius_mm: 0.5, min_radius_mm: 1 }).success).toBe(true);
    expect(s.safeParse({ linear_feed_mm_per_min: 1000, radius_mm: 0.5, min_radius_mm: 0 }).success).toBe(false);
    expect(s.safeParse({ linear_feed_mm_per_min: 0, radius_mm: 0.5, min_radius_mm: 1 }).success).toBe(false);
    expect(s.safeParse({ linear_feed_mm_per_min: 1000, radius_mm: -1, min_radius_mm: 1 }).success).toBe(false);
  });
});
