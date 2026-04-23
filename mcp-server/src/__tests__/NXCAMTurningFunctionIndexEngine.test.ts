/**
 * NXCAMTurningFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM40
 *
 * Coverage:
 *   - schema invariants: 12 ops, 159 params, 6 categories (hard numeric asserts)
 *   - per-op reference values + parameter-count consistency
 *   - variability: all 6 categories + 3 infeed strategies + 2 spindle modes
 *   - engine methods: real invocation + failure + adversarial NaN/Infinity
 *   - recommendByFeature: 12 features exercised end-to-end
 *   - noseRadiusForSurfaceFinish: textbook value + quadratic-doubling check
 *   - taylorToolLife: textbook (200,0.25,400)→16min + V doubling = life/16
 *   - teachModeValidate: real boundary + failure behavior
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

describe("NXCAMTurningFunctionIndexEngine — engine + dispatcher", () => {
  it("getSummary returns exactly 12 ops / 159 params / 6 categories / nxcam/turning", async () => {
    const { NXCAMTurningFunctionIndexEngine } = await import(
      "../engines/NXCAMTurningFunctionIndexEngine.js"
    );
    const s: any = NXCAMTurningFunctionIndexEngine.getSummary();
    expect(s.system_id).toBe("nxcam");
    expect(s.section_key).toBe("turning");
    expect(s.total_operations).toBe(12);
    expect(s.total_parameters).toBe(159);
    expect(s.categories).toHaveLength(6);
    expect(s.training_topics_count).toBe(6);
  });

  // Per-op reference values (variability: 6 categories × 12 ops)
  it.each([
    ["rough_turn_od", "rough", 24],
    ["rough_bore_id", "rough", 17],
    ["rough_face", "rough", 10],
    ["finish_turn_od", "finish", 14],
    ["finish_bore_id", "finish", 11],
    ["finish_face", "finish", 9],
    ["groove_od", "groove", 12],
    ["thread_od", "thread", 19],
    ["thread_id", "thread", 13],
    ["centerline_drill", "drill_bore", 12],
    ["manual_bore", "drill_bore", 10],
    ["teach_mode", "teach", 8],
  ])("op %s → category %s, params %i", async (id, cat, count) => {
    const { NXCAMTurningFunctionIndexEngine } = await import(
      "../engines/NXCAMTurningFunctionIndexEngine.js"
    );
    const op: any = NXCAMTurningFunctionIndexEngine.getOperation(id);
    expect("error" in op).toBe(false);
    expect(op.category).toBe(cat);
    expect(op.parameter_count).toBe(count);
  });

  it("declared sum = 159 + every op's nested parameter count matches declared", async () => {
    const { NXCAMTurningFunctionIndexEngine } = await import(
      "../engines/NXCAMTurningFunctionIndexEngine.js"
    );
    const idx: any = NXCAMTurningFunctionIndexEngine.getIndex();
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
    expect(total).toBe(159);
  });

  it("category breakdown sums to 159 / 12 ops across 6 categories", async () => {
    const { NXCAMTurningFunctionIndexEngine } = await import(
      "../engines/NXCAMTurningFunctionIndexEngine.js"
    );
    const b = NXCAMTurningFunctionIndexEngine.getCategoryBreakdown();
    expect(b.length).toBe(6);
    expect(b.reduce((a, x) => a + x.operations.length, 0)).toBe(12);
    expect(b.reduce((a, x) => a + x.total_parameters, 0)).toBe(159);
  });

  it("variability: threading ops cover ≥3 infeed strategies including radial/modified_flank/alternating_flank", async () => {
    const { NXCAMTurningFunctionIndexEngine } = await import(
      "../engines/NXCAMTurningFunctionIndexEngine.js"
    );
    const idx: any = NXCAMTurningFunctionIndexEngine.getIndex();
    const modes = new Set<string>();
    for (const op of Object.values(idx.operations) as any) {
      const infeed = op.parameters.infeed;
      if (infeed?.method?.values) for (const v of infeed.method.values) modes.add(v);
    }
    expect(modes.size).toBeGreaterThanOrEqual(3);
    expect(modes).toContain("radial");
    expect(modes).toContain("modified_flank");
    expect(modes).toContain("alternating_flank");
  });

  it("variability: both G96 and G97 spindle modes appear in catalog", async () => {
    const { NXCAMTurningFunctionIndexEngine } = await import(
      "../engines/NXCAMTurningFunctionIndexEngine.js"
    );
    const idx: any = NXCAMTurningFunctionIndexEngine.getIndex();
    const modes = new Set<string>();
    for (const op of Object.values(idx.operations) as any) {
      const sf = op.parameters.speeds_feeds;
      const mode = sf?.spindle_mode ?? sf?.spindle_mode_override;
      if (mode?.values) for (const v of mode.values) modes.add(v);
    }
    expect(modes).toContain("CSS_G96");
    expect(modes).toContain("RPM_G97");
  });

  // Failure modes
  it("getOperation returns {error: ...} on unknown id, real match on known", async () => {
    const { NXCAMTurningFunctionIndexEngine } = await import(
      "../engines/NXCAMTurningFunctionIndexEngine.js"
    );
    const bad: any = NXCAMTurningFunctionIndexEngine.getOperation("bogus_id_does_not_exist");
    expect(bad.error).toMatch(/bogus_id_does_not_exist/);
    const good: any = NXCAMTurningFunctionIndexEngine.getOperation("thread_od");
    expect(good.operation_id).toBe("thread_od");
    expect(good.parameter_count).toBe(19);
  });

  it("getOperationsByCategory case-insensitive + empty on unknown", async () => {
    const { NXCAMTurningFunctionIndexEngine } = await import(
      "../engines/NXCAMTurningFunctionIndexEngine.js"
    );
    const lower = NXCAMTurningFunctionIndexEngine.getOperationsByCategory("thread");
    const upper = NXCAMTurningFunctionIndexEngine.getOperationsByCategory("THREAD");
    expect(lower.length).toBe(2);
    expect(upper.length).toBe(2);
    expect(lower.map((o) => o.operation_id).sort()).toEqual(["thread_id", "thread_od"]);
    expect(NXCAMTurningFunctionIndexEngine.getOperationsByCategory("no_such_cat")).toHaveLength(0);
  });

  it("findParameter respects limit; returns empty on no match; real content on match", async () => {
    const { NXCAMTurningFunctionIndexEngine } = await import(
      "../engines/NXCAMTurningFunctionIndexEngine.js"
    );
    const all = NXCAMTurningFunctionIndexEngine.findParameter("nose_radius_mm", 1000);
    expect(all.length).toBeGreaterThanOrEqual(5);
    all.forEach((m) => expect(m.parameter).toContain("nose_radius_mm"));
    const capped = NXCAMTurningFunctionIndexEngine.findParameter("nose_radius_mm", 3);
    expect(capped.length).toBe(3);
    expect(NXCAMTurningFunctionIndexEngine.findParameter("zz_xxx_nonexistent")).toHaveLength(0);
  });

  // recommendByFeature — 12 deterministic routes, each verified by looking up the result
  it.each([
    ["od_rough", "rough_turn_od"],
    ["id_rough", "rough_bore_id"],
    ["face_rough", "rough_face"],
    ["od_finish", "finish_turn_od"],
    ["id_finish", "finish_bore_id"],
    ["face_finish", "finish_face"],
    ["od_groove", "groove_od"],
    ["od_thread", "thread_od"],
    ["id_thread", "thread_id"],
    ["axial_drill", "centerline_drill"],
    ["manual_bore", "manual_bore"],
    ["teach_mode_part", "teach_mode"],
  ])("recommendByFeature(%s) → %s (verified in catalog)", async (feature, expected) => {
    const { NXCAMTurningFunctionIndexEngine } = await import(
      "../engines/NXCAMTurningFunctionIndexEngine.js"
    );
    const r = NXCAMTurningFunctionIndexEngine.recommendByFeature(feature as any);
    expect(r.primary).toBe(expected);
    expect(r.reason.length).toBeGreaterThan(10);
    const op: any = NXCAMTurningFunctionIndexEngine.getOperation(r.primary);
    expect("error" in op).toBe(false);
    expect(op.operation_id).toBe(expected);
  });

  it("recommendByFeature defaults safely with informative reason", async () => {
    const { NXCAMTurningFunctionIndexEngine } = await import(
      "../engines/NXCAMTurningFunctionIndexEngine.js"
    );
    const r = NXCAMTurningFunctionIndexEngine.recommendByFeature("totally_bogus" as any);
    expect(r.primary).toBe("rough_turn_od");
    expect(r.reason).toMatch(/unknown|default/i);
  });

  // noseRadiusForSurfaceFinish — real physics
  it("noseRadius textbook: f=0.1mm/rev, Ra=1.6μm → R = 0.78125mm exact", async () => {
    const { NXCAMTurningFunctionIndexEngine } = await import(
      "../engines/NXCAMTurningFunctionIndexEngine.js"
    );
    // Ra_mm = 1.6/1000 = 0.0016; R = (0.1*0.1)/(8*0.0016) = 0.01/0.0128 = 0.78125
    const r: any = NXCAMTurningFunctionIndexEngine.noseRadiusForSurfaceFinish(0.1, 1.6);
    expect(r.required_nose_radius_mm).toBeCloseTo(0.78125, 6);
    expect(r.target_Ra_mm).toBeCloseTo(0.0016, 8);
    expect(r.feed_per_rev_mm).toBe(0.1);
  });

  it("noseRadius: doubling feed quadruples required R (quadratic in f)", async () => {
    const { NXCAMTurningFunctionIndexEngine } = await import(
      "../engines/NXCAMTurningFunctionIndexEngine.js"
    );
    const small: any = NXCAMTurningFunctionIndexEngine.noseRadiusForSurfaceFinish(0.1, 1.6);
    const big: any = NXCAMTurningFunctionIndexEngine.noseRadiusForSurfaceFinish(0.2, 1.6);
    expect(big.required_nose_radius_mm / small.required_nose_radius_mm).toBeCloseTo(4, 6);
  });

  it.each([
    ["NaN feed", NaN, 1.6],
    ["zero feed", 0, 1.6],
    ["negative feed", -0.1, 1.6],
    ["NaN Ra", 0.1, NaN],
    ["zero Ra", 0.1, 0],
    ["negative Ra", 0.1, -1.6],
  ])("noseRadius rejects bad input: %s", async (_label, f, ra) => {
    const { NXCAMTurningFunctionIndexEngine } = await import(
      "../engines/NXCAMTurningFunctionIndexEngine.js"
    );
    const r: any = NXCAMTurningFunctionIndexEngine.noseRadiusForSurfaceFinish(f, ra);
    expect("error" in r).toBe(true);
  });

  // taylorToolLife — real physics
  it("taylorToolLife textbook: V=200, n=0.25, C=400 → T=16 minutes exact", async () => {
    const { NXCAMTurningFunctionIndexEngine } = await import(
      "../engines/NXCAMTurningFunctionIndexEngine.js"
    );
    // T = (400/200)^(1/0.25) = 2^4 = 16
    const r: any = NXCAMTurningFunctionIndexEngine.taylorToolLife(200, 0.25, 400);
    expect(r.tool_life_minutes).toBeCloseTo(16, 6);
    expect(r.cutting_velocity_m_per_min).toBe(200);
    expect(r.taylor_exponent_n).toBe(0.25);
  });

  it("taylorToolLife: doubling V reduces life by 2^(1/n)=16 for n=0.25", async () => {
    const { NXCAMTurningFunctionIndexEngine } = await import(
      "../engines/NXCAMTurningFunctionIndexEngine.js"
    );
    const t1: any = NXCAMTurningFunctionIndexEngine.taylorToolLife(200, 0.25, 400);
    const t2: any = NXCAMTurningFunctionIndexEngine.taylorToolLife(400, 0.25, 400);
    expect(t1.tool_life_minutes / t2.tool_life_minutes).toBeCloseTo(16, 4);
  });

  it.each([
    ["NaN V", NaN, 0.25, 400],
    ["zero V", 0, 0.25, 400],
    ["negative V", -100, 0.25, 400],
    ["n = 0 (boundary)", 200, 0, 400],
    ["n = 1 (boundary)", 200, 1, 400],
    ["n > 1", 200, 1.5, 400],
    ["n negative", 200, -0.1, 400],
    ["C = 0", 200, 0.25, 0],
    ["C NaN", 200, 0.25, NaN],
    ["C negative", 200, 0.25, -400],
  ])("taylorToolLife rejects: %s", async (_label, V, n, C) => {
    const { NXCAMTurningFunctionIndexEngine } = await import(
      "../engines/NXCAMTurningFunctionIndexEngine.js"
    );
    const r: any = NXCAMTurningFunctionIndexEngine.taylorToolLife(V, n, C);
    expect("error" in r).toBe(true);
  });

  // teachModeValidate — real behavior
  it("teachModeValidate: 5 points + feed allowed → valid with 4 segments", async () => {
    const { NXCAMTurningFunctionIndexEngine } = await import(
      "../engines/NXCAMTurningFunctionIndexEngine.js"
    );
    const r: any = NXCAMTurningFunctionIndexEngine.teachModeValidate(5, true, false);
    expect(r.is_valid).toBe(true);
    expect(r.segment_count).toBe(4);
    expect(r.issues).toHaveLength(0);
  });

  it("teachModeValidate: 1 point fails with 'at least 2' issue", async () => {
    const { NXCAMTurningFunctionIndexEngine } = await import(
      "../engines/NXCAMTurningFunctionIndexEngine.js"
    );
    const r: any = NXCAMTurningFunctionIndexEngine.teachModeValidate(1, true, false);
    expect(r.is_valid).toBe(false);
    expect(r.issues.join(" ")).toMatch(/at least 2/i);
  });

  it("teachModeValidate: 0 motion types → invalid even with enough points", async () => {
    const { NXCAMTurningFunctionIndexEngine } = await import(
      "../engines/NXCAMTurningFunctionIndexEngine.js"
    );
    const r: any = NXCAMTurningFunctionIndexEngine.teachModeValidate(5, false, false);
    expect(r.is_valid).toBe(false);
    expect(r.issues.join(" ")).toMatch(/motion type/i);
  });

  it.each([
    ["fractional", 3.5, true, false],
    ["negative", -1, true, false],
    ["NaN", NaN, true, false],
  ])("teachModeValidate rejects point_count: %s", async (_label, pc, af, ar) => {
    const { NXCAMTurningFunctionIndexEngine } = await import(
      "../engines/NXCAMTurningFunctionIndexEngine.js"
    );
    const r: any = NXCAMTurningFunctionIndexEngine.teachModeValidate(pc, af, ar);
    expect("error" in r).toBe(true);
  });

  // Dispatcher round-trip
  it("round-trip: nxcam_turning_summary returns 12/159", async () => {
    const r: any = await invoke("nxcam_turning_summary", {});
    const d = r.data ?? r.result ?? r;
    expect(d.total_operations).toBe(12);
    expect(d.total_parameters).toBe(159);
  });

  it("round-trip: nxcam_turning_get_op('thread_od') returns 19 params, thread category", async () => {
    const r: any = await invoke("nxcam_turning_get_op", { operation_id: "thread_od" });
    const d = r.data ?? r.result ?? r;
    expect(d.category).toBe("thread");
    expect(d.parameter_count).toBe(19);
  });

  it("round-trip: nxcam_turning_nose_radius textbook Ra=1.6, f=0.1 → 0.78125", async () => {
    const r: any = await invoke("nxcam_turning_nose_radius", { feed_per_rev_mm: 0.1, target_Ra_um: 1.6 });
    const d = r.data ?? r.result ?? r;
    expect(d.required_nose_radius_mm).toBeCloseTo(0.78125, 6);
  });

  it("round-trip: nxcam_turning_taylor textbook V=200,n=0.25,C=400 → 16min", async () => {
    const r: any = await invoke("nxcam_turning_taylor", { V_m_per_min: 200, n: 0.25, C: 400 });
    const d = r.data ?? r.result ?? r;
    expect(d.tool_life_minutes).toBeCloseTo(16, 6);
  });

  it("round-trip: nxcam_turning_teach_validate(5,true,false) → is_valid, 4 segments", async () => {
    const r: any = await invoke("nxcam_turning_teach_validate", {
      point_count: 5,
      allow_feed_between: true,
      allow_rapid_between: false,
    });
    const d = r.data ?? r.result ?? r;
    expect(d.is_valid).toBe(true);
    expect(d.segment_count).toBe(4);
  });

  it("round-trip: nxcam_turning_recommend(od_thread) → thread_od", async () => {
    const r: any = await invoke("nxcam_turning_recommend", { feature: "od_thread" });
    const d = r.data ?? r.result ?? r;
    expect(d.primary).toBe("thread_od");
  });

  it("round-trip: validation error for Taylor n≥1", async () => {
    const r: any = await invoke("nxcam_turning_taylor", { V_m_per_min: 200, n: 1.5, C: 400 });
    const blob = JSON.stringify(r);
    expect(blob).toMatch(/Invalid params|less/i);
  });

  // Schema integration
  it("camDispatcher ACTIONS contains all 10 nxcam_turning_* action names", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const expected = [
      "nxcam_turning_index",
      "nxcam_turning_summary",
      "nxcam_turning_list_ops",
      "nxcam_turning_get_op",
      "nxcam_turning_by_category",
      "nxcam_turning_find_param",
      "nxcam_turning_recommend",
      "nxcam_turning_nose_radius",
      "nxcam_turning_taylor",
      "nxcam_turning_teach_validate",
    ];
    for (const a of expected) expect(mod.ACTIONS).toContain(a);
  });

  it("ACTION_NXCAM_TURNING_FUNCTION_INDEX_SCHEMAS has exactly 10 keys", async () => {
    const { ACTION_NXCAM_TURNING_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/nxcamTurningFunctionIndexActionSchemas.js"
    );
    expect(Object.keys(ACTION_NXCAM_TURNING_FUNCTION_INDEX_SCHEMAS)).toHaveLength(10);
  });

  it("nxcam_turning_taylor schema rejects n outside (0,1) and non-positive V/C", async () => {
    const { ACTION_NXCAM_TURNING_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/nxcamTurningFunctionIndexActionSchemas.js"
    );
    const s = ACTION_NXCAM_TURNING_FUNCTION_INDEX_SCHEMAS.nxcam_turning_taylor;
    expect(s.safeParse({ V_m_per_min: 200, n: 0.25, C: 400 }).success).toBe(true);
    expect(s.safeParse({ V_m_per_min: 200, n: 1.0, C: 400 }).success).toBe(false);
    expect(s.safeParse({ V_m_per_min: 200, n: 0, C: 400 }).success).toBe(false);
    expect(s.safeParse({ V_m_per_min: -200, n: 0.25, C: 400 }).success).toBe(false);
    expect(s.safeParse({ V_m_per_min: 200, n: 0.25, C: 0 }).success).toBe(false);
  });
});
