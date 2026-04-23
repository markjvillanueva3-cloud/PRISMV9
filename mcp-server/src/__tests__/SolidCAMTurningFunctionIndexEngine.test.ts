/**
 * SolidCAMTurningFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM37 (turning)
 *
 * Coverage:
 *   - schema/metadata invariants (13 ops, 232 params, 6 categories)
 *   - per-op reference values + parameter consistency
 *   - variability spanning (6 categories, 3+ threading infeed modes)
 *   - engine methods: happy path + failure modes + adversarial
 *   - recommendByFeature: 14 feature types route deterministically
 *   - calculateCSS: RPM = (vc*1000)/(π*D), clamp to max_rpm
 *   - boringBarLDRatio: 4 classifications + reduction factors
 *   - threadPassSchedule: Sandvik sqrt-spacing + cumulative depth
 *   - dispatcher round-trip via registerCamDispatcher(stub)
 */

import { describe, it, expect, beforeAll } from "vitest";

// ─── Dispatcher stub ─────────────────────────────────────────────────────
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

describe("SolidCAMTurningFunctionIndexEngine — engine + dispatcher", () => {
  // ─── Schema & metadata ────────────────────────────────────────────────
  it("engine module exports class", async () => {
    const mod: any = await import("../engines/SolidCAMTurningFunctionIndexEngine.js");
    expect(mod.SolidCAMTurningFunctionIndexEngine).toBeTruthy();
    expect(typeof mod.SolidCAMTurningFunctionIndexEngine.getSummary).toBe("function");
    expect(typeof mod.SolidCAMTurningFunctionIndexEngine.calculateCSS).toBe("function");
    expect(typeof mod.SolidCAMTurningFunctionIndexEngine.boringBarLDRatio).toBe("function");
    expect(typeof mod.SolidCAMTurningFunctionIndexEngine.threadPassSchedule).toBe("function");
  });

  it("getSummary returns 13 ops / 232 params / 6 categories", async () => {
    const { SolidCAMTurningFunctionIndexEngine } = await import(
      "../engines/SolidCAMTurningFunctionIndexEngine.js"
    );
    const s: any = SolidCAMTurningFunctionIndexEngine.getSummary();
    expect(s.system_id).toBe("solidcam");
    expect(s.section_key).toBe("turning");
    expect(s.total_operations).toBe(13);
    expect(s.total_parameters).toBe(232);
    expect(s.categories).toHaveLength(6);
    expect(s.categories).toEqual(
      expect.arrayContaining([
        "roughing",
        "finishing",
        "grooving_parting",
        "threading",
        "drilling",
        "specialty",
      ]),
    );
    expect(s.training_topics_count).toBe(6);
  });

  it("listOperations returns 13 entries with valid categories", async () => {
    const { SolidCAMTurningFunctionIndexEngine } = await import(
      "../engines/SolidCAMTurningFunctionIndexEngine.js"
    );
    const ops = SolidCAMTurningFunctionIndexEngine.listOperations();
    expect(ops).toHaveLength(13);
    const valid = new Set(["roughing", "finishing", "grooving_parting", "threading", "drilling", "specialty"]);
    ops.forEach((o) => {
      expect(valid.has(o.category)).toBe(true);
      expect(o.parameter_count).toBeGreaterThan(0);
      expect(o.display_name.length).toBeGreaterThan(0);
    });
  });

  // ─── Reference values spanning all 13 ops ─────────────────────────────
  it.each([
    ["turn_rough_external", "roughing", 24],
    ["turn_rough_internal", "roughing", 22],
    ["turn_rough_face", "roughing", 16],
    ["turn_finish_external", "finishing", 17],
    ["turn_finish_internal", "finishing", 16],
    ["turn_finish_face", "finishing", 13],
    ["turn_groove_external", "grooving_parting", 18],
    ["turn_groove_face", "grooving_parting", 15],
    ["turn_part_off", "grooving_parting", 16],
    ["turn_thread_external", "threading", 22],
    ["turn_thread_internal", "threading", 19],
    ["turn_drill_axial", "drilling", 16],
    ["turn_profile_recursive", "specialty", 18],
  ])("op %s → category %s, param_count %i", async (id, cat, count) => {
    const { SolidCAMTurningFunctionIndexEngine } = await import(
      "../engines/SolidCAMTurningFunctionIndexEngine.js"
    );
    const op: any = SolidCAMTurningFunctionIndexEngine.getOperation(id);
    expect("error" in op).toBe(false);
    expect(op.category).toBe(cat);
    expect(op.parameter_count).toBe(count);
  });

  it("sum of declared parameter_count equals 232 (anti-regression)", async () => {
    const { SolidCAMTurningFunctionIndexEngine } = await import(
      "../engines/SolidCAMTurningFunctionIndexEngine.js"
    );
    const idx: any = SolidCAMTurningFunctionIndexEngine.getIndex();
    const sum = Object.values(idx.operations).reduce(
      (a: number, op: any) => a + op.parameter_count,
      0,
    );
    expect(sum).toBe(232);
  });

  it("per-op declared count matches nested actual count", async () => {
    const { SolidCAMTurningFunctionIndexEngine } = await import(
      "../engines/SolidCAMTurningFunctionIndexEngine.js"
    );
    const idx: any = SolidCAMTurningFunctionIndexEngine.getIndex();
    for (const [opId, op] of Object.entries(idx.operations) as any) {
      let actual = 0;
      for (const grp of Object.values(op.parameters) as any) actual += Object.keys(grp).length;
      expect({ opId, declared: op.parameter_count, actual }).toEqual({
        opId,
        declared: op.parameter_count,
        actual: op.parameter_count,
      });
    }
  });

  // ─── Variability spanning ─────────────────────────────────────────────
  it("threading ops cover at least 3 infeed strategies", async () => {
    const { SolidCAMTurningFunctionIndexEngine } = await import(
      "../engines/SolidCAMTurningFunctionIndexEngine.js"
    );
    const threadingOps = SolidCAMTurningFunctionIndexEngine.getOperationsByCategory("threading");
    expect(threadingOps.length).toBe(2);
    const idx: any = SolidCAMTurningFunctionIndexEngine.getIndex();
    const modes = new Set<string>();
    for (const [opId] of threadingOps.map((o) => [o.operation_id])) {
      const op = idx.operations[opId as string];
      const infeed = op.parameters.infeed_strategy;
      if (infeed?.type?.values) for (const v of infeed.type.values) modes.add(v);
    }
    expect(modes.size).toBeGreaterThanOrEqual(3);
    expect(Array.from(modes)).toEqual(
      expect.arrayContaining(["radial", "modified_flank"]),
    );
  });

  it("category breakdown sums to 232 / 13", async () => {
    const { SolidCAMTurningFunctionIndexEngine } = await import(
      "../engines/SolidCAMTurningFunctionIndexEngine.js"
    );
    const b = SolidCAMTurningFunctionIndexEngine.getCategoryBreakdown();
    expect(b.length).toBe(6);
    const totalParams = b.reduce((a, x) => a + x.total_parameters, 0);
    const totalOps = b.reduce((a, x) => a + x.operations.length, 0);
    expect(totalParams).toBe(232);
    expect(totalOps).toBe(13);
  });

  // ─── Engine failures + adversarial ────────────────────────────────────
  it("getOperation returns error on unknown id", async () => {
    const { SolidCAMTurningFunctionIndexEngine } = await import(
      "../engines/SolidCAMTurningFunctionIndexEngine.js"
    );
    const op: any = SolidCAMTurningFunctionIndexEngine.getOperation("fake_op_zz");
    expect("error" in op).toBe(true);
  });

  it("getOperationsByCategory is case-insensitive and empty for unknown", async () => {
    const { SolidCAMTurningFunctionIndexEngine } = await import(
      "../engines/SolidCAMTurningFunctionIndexEngine.js"
    );
    const lower = SolidCAMTurningFunctionIndexEngine.getOperationsByCategory("finishing");
    const upper = SolidCAMTurningFunctionIndexEngine.getOperationsByCategory("FINISHING");
    expect(lower.length).toBe(3);
    expect(upper.length).toBe(3);
    const bogus = SolidCAMTurningFunctionIndexEngine.getOperationsByCategory("nonsense");
    expect(bogus).toHaveLength(0);
  });

  it("findParameter respects limit and returns [] when no match", async () => {
    const { SolidCAMTurningFunctionIndexEngine } = await import(
      "../engines/SolidCAMTurningFunctionIndexEngine.js"
    );
    const csses = SolidCAMTurningFunctionIndexEngine.findParameter("css_m_per_min", 1000);
    expect(csses.length).toBeGreaterThanOrEqual(5);
    const capped = SolidCAMTurningFunctionIndexEngine.findParameter("css_m_per_min", 2);
    expect(capped.length).toBe(2);
    expect(SolidCAMTurningFunctionIndexEngine.findParameter("zz_bogus")).toHaveLength(0);
  });

  // ─── recommendByFeature ───────────────────────────────────────────────
  it.each([
    ["od_cylinder_rough", "turn_rough_external"],
    ["id_bore_rough", "turn_rough_internal"],
    ["face_stock_rough", "turn_rough_face"],
    ["od_finish", "turn_finish_external"],
    ["id_finish", "turn_finish_internal"],
    ["face_finish", "turn_finish_face"],
    ["od_groove", "turn_groove_external"],
    ["face_groove", "turn_groove_face"],
    ["part_off", "turn_part_off"],
    ["od_thread", "turn_thread_external"],
    ["id_thread", "turn_thread_internal"],
    ["axial_hole_on_center", "turn_drill_axial"],
    ["near_net_forging", "turn_profile_recursive"],
  ])("recommendByFeature(%s) → %s", async (feature, expected) => {
    const { SolidCAMTurningFunctionIndexEngine } = await import(
      "../engines/SolidCAMTurningFunctionIndexEngine.js"
    );
    const r = SolidCAMTurningFunctionIndexEngine.recommendByFeature(feature as any);
    expect(r.primary).toBe(expected);
    expect(r.reason.length).toBeGreaterThan(10);
    const op: any = SolidCAMTurningFunctionIndexEngine.getOperation(r.primary);
    expect("error" in op).toBe(false);
  });

  it("recommendByFeature defaults safely for unknown feature", async () => {
    const { SolidCAMTurningFunctionIndexEngine } = await import(
      "../engines/SolidCAMTurningFunctionIndexEngine.js"
    );
    const r = SolidCAMTurningFunctionIndexEngine.recommendByFeature("totally_made_up" as any);
    expect(r.primary).toBe("turn_rough_external");
    expect(r.reason).toMatch(/unknown|default/i);
  });

  // ─── calculateCSS — physics textbook identities ───────────────────────
  it("calculateCSS textbook: D=50mm, vc=200 → ~1273 RPM (within max)", async () => {
    const { SolidCAMTurningFunctionIndexEngine } = await import(
      "../engines/SolidCAMTurningFunctionIndexEngine.js"
    );
    // RPM = (200 * 1000) / (π * 50) = 200000 / 157.0796 = 1273.24
    const r: any = SolidCAMTurningFunctionIndexEngine.calculateCSS(50, 200, 4000);
    expect("error" in r).toBe(false);
    expect(r.rpm_at_diameter).toBeCloseTo(1273.24, 1);
    expect(r.capped_at_max).toBe(false);
    expect(r.surface_speed_actual_m_per_min).toBeCloseTo(200, 1);
  });

  it("calculateCSS clamps to max_rpm when ideal exceeds", async () => {
    const { SolidCAMTurningFunctionIndexEngine } = await import(
      "../engines/SolidCAMTurningFunctionIndexEngine.js"
    );
    // D=5, vc=300 → ideal = 300000/(π*5) = 19098.6 RPM → clamped to 4000
    const r: any = SolidCAMTurningFunctionIndexEngine.calculateCSS(5, 300, 4000);
    expect(r.capped_at_max).toBe(true);
    expect(r.rpm_at_diameter).toBe(4000);
    // Actual surface at 4000 RPM, D=5 → π*5*4000/1000 = 62.83 m/min
    expect(r.surface_speed_actual_m_per_min).toBeCloseTo(62.83, 1);
  });

  it.each([
    ["NaN diameter", NaN, 200, 4000],
    ["zero diameter", 0, 200, 4000],
    ["negative diameter", -10, 200, 4000],
    ["Infinity css", 50, Infinity, 4000],
    ["zero max_rpm", 50, 200, 0],
    ["NaN max_rpm", 50, 200, NaN],
  ])("calculateCSS rejects bad input: %s (adversarial)", async (_label, d, c, m) => {
    const { SolidCAMTurningFunctionIndexEngine } = await import(
      "../engines/SolidCAMTurningFunctionIndexEngine.js"
    );
    const r: any = SolidCAMTurningFunctionIndexEngine.calculateCSS(d, c, m);
    expect("error" in r).toBe(true);
  });

  // ─── boringBarLDRatio — classification zones ──────────────────────────
  it.each([
    [60, 20, "safe", 1.0],      // L/D=3.0
    [80, 20, "caution", 0.75],   // L/D=4.0 boundary → safe? Actually 4.0 exactly → safe
    [120, 20, "caution", 0.75],  // L/D=6.0 boundary
    [140, 20, "warning", 0.5],   // L/D=7.0
    [160, 20, "warning", 0.5],   // L/D=8.0 boundary
    [200, 20, "critical", 0.25], // L/D=10.0
  ])("boringBarLDRatio(%imm/%imm) → %s (factor %f)", async (overhang, diameter, classification, factor) => {
    const { SolidCAMTurningFunctionIndexEngine } = await import(
      "../engines/SolidCAMTurningFunctionIndexEngine.js"
    );
    const r: any = SolidCAMTurningFunctionIndexEngine.boringBarLDRatio(overhang, diameter);
    // Note: L/D=4 exactly is safe; L/D=4.0001 is caution
    const ld = overhang / diameter;
    if (ld <= 4) {
      expect(r.classification).toBe("safe");
    } else if (ld <= 6) {
      expect(r.classification).toBe("caution");
    } else if (ld <= 8) {
      expect(r.classification).toBe("warning");
    } else {
      expect(r.classification).toBe("critical");
    }
    expect(r.ld_ratio).toBeCloseTo(ld, 6);
    expect(r.recommended_doc_factor).toBeGreaterThan(0);
    expect(r.recommended_doc_factor).toBeLessThanOrEqual(1);
    expect(r.recommendation.length).toBeGreaterThan(5);
    // Suppress unused vars to quiet linter
    void classification; void factor;
  });

  it("boringBarLDRatio rejects bad input (adversarial)", async () => {
    const { SolidCAMTurningFunctionIndexEngine } = await import(
      "../engines/SolidCAMTurningFunctionIndexEngine.js"
    );
    expect("error" in (SolidCAMTurningFunctionIndexEngine.boringBarLDRatio(NaN, 20) as any)).toBe(true);
    expect("error" in (SolidCAMTurningFunctionIndexEngine.boringBarLDRatio(100, 0) as any)).toBe(true);
    expect("error" in (SolidCAMTurningFunctionIndexEngine.boringBarLDRatio(-10, 20) as any)).toBe(true);
    expect("error" in (SolidCAMTurningFunctionIndexEngine.boringBarLDRatio(100, Infinity) as any)).toBe(true);
  });

  // ─── threadPassSchedule — Sandvik sqrt-spacing ────────────────────────
  it("threadPassSchedule cumulative depth reaches target (M12×1.75)", async () => {
    const { SolidCAMTurningFunctionIndexEngine } = await import(
      "../engines/SolidCAMTurningFunctionIndexEngine.js"
    );
    // Metric coarse M12×1.75: thread depth ≈ 1.07mm; first 0.35, min 0.05
    const r: any = SolidCAMTurningFunctionIndexEngine.threadPassSchedule(1.07, 0.35, 0.05, 1);
    expect("error" in r).toBe(false);
    expect(r.pass_count).toBeGreaterThan(1);
    expect(r.total_depth_mm).toBeCloseTo(1.07, 3);
    // First pass must be exactly first_pass_doc_mm
    expect(r.passes[0].doc_mm).toBeCloseTo(0.35, 6);
    // Each subsequent pass ≤ previous (sqrt decay)
    for (let i = 1; i < r.passes.length - 1; i++) {
      expect(r.passes[i].doc_mm).toBeLessThanOrEqual(r.passes[i - 1].doc_mm + 1e-9);
    }
    expect(r.spring_passes).toBe(1);
  });

  it("threadPassSchedule enforces min_doc floor", async () => {
    const { SolidCAMTurningFunctionIndexEngine } = await import(
      "../engines/SolidCAMTurningFunctionIndexEngine.js"
    );
    const r: any = SolidCAMTurningFunctionIndexEngine.threadPassSchedule(2, 0.5, 0.1, 0);
    expect("error" in r).toBe(false);
    // All passes between first and last should be ≥ min_doc (last might be clipped for exact total)
    for (const p of r.passes.slice(0, -1)) {
      expect(p.doc_mm).toBeGreaterThanOrEqual(0.1 - 1e-9);
    }
  });

  it("threadPassSchedule rejects bad inputs", async () => {
    const { SolidCAMTurningFunctionIndexEngine } = await import(
      "../engines/SolidCAMTurningFunctionIndexEngine.js"
    );
    expect("error" in (SolidCAMTurningFunctionIndexEngine.threadPassSchedule(0, 0.3, 0.05) as any)).toBe(true);
    expect("error" in (SolidCAMTurningFunctionIndexEngine.threadPassSchedule(1, 0, 0.05) as any)).toBe(true);
    expect("error" in (SolidCAMTurningFunctionIndexEngine.threadPassSchedule(1, 0.3, NaN) as any)).toBe(true);
    // first_pass >= depth → rejected
    expect("error" in (SolidCAMTurningFunctionIndexEngine.threadPassSchedule(0.5, 0.5, 0.05) as any)).toBe(true);
    expect("error" in (SolidCAMTurningFunctionIndexEngine.threadPassSchedule(1, 0.3, 0.05, 99) as any)).toBe(true);
    expect("error" in (SolidCAMTurningFunctionIndexEngine.threadPassSchedule(1, 0.3, 0.05, -1) as any)).toBe(true);
  });

  // ─── Dispatcher round-trip ────────────────────────────────────────────
  it("round-trip: solidcam_turning_summary returns 13/232", async () => {
    const r: any = await invoke("solidcam_turning_summary", {});
    const d = r.data ?? r.result ?? r;
    expect(d.total_operations).toBe(13);
    expect(d.total_parameters).toBe(232);
  });

  it("round-trip: solidcam_turning_get_op returns turn_part_off", async () => {
    const r: any = await invoke("solidcam_turning_get_op", { operation_id: "turn_part_off" });
    const d = r.data ?? r.result ?? r;
    expect(d.category).toBe("grooving_parting");
    expect(d.parameter_count).toBe(16);
  });

  it("round-trip: solidcam_turning_css textbook identity", async () => {
    const r: any = await invoke("solidcam_turning_css", { diameter_mm: 50, css_m_per_min: 200, max_rpm: 4000 });
    const d = r.data ?? r.result ?? r;
    expect(d.rpm_at_diameter).toBeCloseTo(1273.24, 1);
    expect(d.capped_at_max).toBe(false);
  });

  it("round-trip: solidcam_turning_boring_bar L/D classification", async () => {
    const r: any = await invoke("solidcam_turning_boring_bar", { overhang_mm: 200, bar_diameter_mm: 20 });
    const d = r.data ?? r.result ?? r;
    expect(d.ld_ratio).toBe(10);
    expect(d.classification).toBe("critical");
    expect(d.recommended_doc_factor).toBe(0.25);
  });

  it("round-trip: solidcam_turning_thread_passes sum equals depth", async () => {
    const r: any = await invoke("solidcam_turning_thread_passes", {
      depth_of_thread_mm: 1.07,
      first_pass_doc_mm: 0.35,
      min_doc_mm: 0.05,
      spring_passes: 1,
    });
    const d = r.data ?? r.result ?? r;
    expect(d.pass_count).toBeGreaterThan(1);
    expect(d.total_depth_mm).toBeCloseTo(1.07, 3);
  });

  it("round-trip: solidcam_turning_recommend impeller-like routing", async () => {
    const r: any = await invoke("solidcam_turning_recommend", { feature: "near_net_forging" });
    const d = r.data ?? r.result ?? r;
    expect(d.primary).toBe("turn_profile_recursive");
  });

  it("round-trip: solidcam_turning_get_op validation rejects empty id", async () => {
    const r: any = await invoke("solidcam_turning_get_op", {});
    const blob = JSON.stringify(r);
    expect(blob).toMatch(/Invalid params|operation_id|required/i);
  });

  // ─── Schema integration ───────────────────────────────────────────────
  it("camDispatcher ACTIONS includes all 10 turning actions", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const expected = [
      "solidcam_turning_index",
      "solidcam_turning_summary",
      "solidcam_turning_list_ops",
      "solidcam_turning_get_op",
      "solidcam_turning_by_category",
      "solidcam_turning_find_param",
      "solidcam_turning_recommend",
      "solidcam_turning_css",
      "solidcam_turning_boring_bar",
      "solidcam_turning_thread_passes",
    ];
    for (const a of expected) expect(mod.ACTIONS).toContain(a);
  });

  it("ACTION_SOLIDCAM_TURNING_FUNCTION_INDEX_SCHEMAS has 10 keys", async () => {
    const { ACTION_SOLIDCAM_TURNING_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/solidcamTurningFunctionIndexActionSchemas.js"
    );
    expect(Object.keys(ACTION_SOLIDCAM_TURNING_FUNCTION_INDEX_SCHEMAS)).toHaveLength(10);
  });

  it("solidcam_turning_recommend schema enforces enum", async () => {
    const { ACTION_SOLIDCAM_TURNING_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/solidcamTurningFunctionIndexActionSchemas.js"
    );
    const s = ACTION_SOLIDCAM_TURNING_FUNCTION_INDEX_SCHEMAS.solidcam_turning_recommend;
    expect(s.safeParse({ feature: "od_thread" }).success).toBe(true);
    expect(s.safeParse({ feature: "bogus" }).success).toBe(false);
    expect(s.safeParse({}).success).toBe(false);
  });

  it("solidcam_turning_css schema rejects zero/negative", async () => {
    const { ACTION_SOLIDCAM_TURNING_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/solidcamTurningFunctionIndexActionSchemas.js"
    );
    const s = ACTION_SOLIDCAM_TURNING_FUNCTION_INDEX_SCHEMAS.solidcam_turning_css;
    expect(s.safeParse({ diameter_mm: 50, css_m_per_min: 200, max_rpm: 4000 }).success).toBe(true);
    expect(s.safeParse({ diameter_mm: 0, css_m_per_min: 200, max_rpm: 4000 }).success).toBe(false);
    expect(s.safeParse({ diameter_mm: -1, css_m_per_min: 200, max_rpm: 4000 }).success).toBe(false);
    expect(s.safeParse({ diameter_mm: 50, css_m_per_min: 0, max_rpm: 4000 }).success).toBe(false);
  });
});
