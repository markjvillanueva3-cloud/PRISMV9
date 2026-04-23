/**
 * NXCAMMillingFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM39
 *
 * Coverage:
 *   - schema invariants: 13 ops, 196 params, 6 categories
 *   - per-op reference values + parameter consistency
 *   - variability: 6 categories spanned, ≥3 tool-axis modes
 *   - engine methods + adversarial inputs
 *   - recommendByFeature: 12 feature types
 *   - estimateScallopHeight: ball-end formula h = s²/(8R)
 *   - adaptiveEngagementCheck: safe/caution/critical zones
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

describe("NXCAMMillingFunctionIndexEngine — engine + dispatcher", () => {
  it("module exports class with helpers", async () => {
    const mod: any = await import("../engines/NXCAMMillingFunctionIndexEngine.js");
    const E = mod.NXCAMMillingFunctionIndexEngine;
    expect(E).toBeTruthy();
    expect(typeof E.getSummary).toBe("function");
    expect(typeof E.recommendByFeature).toBe("function");
    expect(typeof E.estimateScallopHeight).toBe("function");
    expect(typeof E.adaptiveEngagementCheck).toBe("function");
  });

  it("getSummary returns 13 ops / 196 params / 6 categories", async () => {
    const { NXCAMMillingFunctionIndexEngine } = await import(
      "../engines/NXCAMMillingFunctionIndexEngine.js"
    );
    const s: any = NXCAMMillingFunctionIndexEngine.getSummary();
    expect(s.system_id).toBe("nxcam");
    expect(s.section_key).toBe("milling");
    expect(s.total_operations).toBe(13);
    expect(s.total_parameters).toBe(196);
    expect(s.categories).toHaveLength(6);
    expect(s.training_topics_count).toBe(6);
  });

  // Per-op reference values
  it.each([
    ["face_milling", "fixed_axis_3plus2", 22],
    ["planar_mill", "fixed_axis_3plus2", 20],
    ["cavity_mill", "fixed_axis_3plus2", 20],
    ["zlevel_profile", "fixed_axis_3plus2", 14],
    ["fixed_contour", "fixed_axis_3plus2", 13],
    ["variable_contour", "variable_axis", 17],
    ["variable_streamline", "variable_axis", 14],
    ["swarf_drive", "variable_axis", 15],
    ["adaptive_milling", "adaptive", 14],
    ["sequential_mill", "sequential", 9],
    ["planar_profile", "prismatic_finish", 12],
    ["surface_contour", "prismatic_finish", 13],
    ["auto_3d_fbm", "feature_based", 13],
  ])("op %s → category %s, params %i", async (id, cat, count) => {
    const { NXCAMMillingFunctionIndexEngine } = await import(
      "../engines/NXCAMMillingFunctionIndexEngine.js"
    );
    const op: any = NXCAMMillingFunctionIndexEngine.getOperation(id);
    expect("error" in op).toBe(false);
    expect(op.category).toBe(cat);
    expect(op.parameter_count).toBe(count);
  });

  it("declared sum equals 196 + nested actuals match", async () => {
    const { NXCAMMillingFunctionIndexEngine } = await import(
      "../engines/NXCAMMillingFunctionIndexEngine.js"
    );
    const idx: any = NXCAMMillingFunctionIndexEngine.getIndex();
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
    expect(total).toBe(196);
  });

  it("category breakdown spans all 6 categories with sum 196 / 13 ops", async () => {
    const { NXCAMMillingFunctionIndexEngine } = await import(
      "../engines/NXCAMMillingFunctionIndexEngine.js"
    );
    const b = NXCAMMillingFunctionIndexEngine.getCategoryBreakdown();
    expect(b.length).toBe(6);
    expect(b.reduce((a, x) => a + x.operations.length, 0)).toBe(13);
    expect(b.reduce((a, x) => a + x.total_parameters, 0)).toBe(196);
  });

  it("variability: ≥3 tool-axis modes across variable-axis ops", async () => {
    const { NXCAMMillingFunctionIndexEngine } = await import(
      "../engines/NXCAMMillingFunctionIndexEngine.js"
    );
    const idx: any = NXCAMMillingFunctionIndexEngine.getIndex();
    const modes = new Set<string>();
    for (const op of Object.values(idx.operations) as any) {
      const ta = op.parameters.tool_axis;
      if (!ta?.axis_mode?.values) continue;
      for (const v of ta.axis_mode.values) modes.add(v);
    }
    expect(modes.size).toBeGreaterThanOrEqual(3);
  });

  // Failure modes + adversarial
  it("getOperation returns error on unknown id", async () => {
    const { NXCAMMillingFunctionIndexEngine } = await import(
      "../engines/NXCAMMillingFunctionIndexEngine.js"
    );
    const op: any = NXCAMMillingFunctionIndexEngine.getOperation("zz_not_real");
    expect("error" in op).toBe(true);
  });

  it("getOperationsByCategory case-insensitive + empty for unknown", async () => {
    const { NXCAMMillingFunctionIndexEngine } = await import(
      "../engines/NXCAMMillingFunctionIndexEngine.js"
    );
    const lower = NXCAMMillingFunctionIndexEngine.getOperationsByCategory("variable_axis");
    const upper = NXCAMMillingFunctionIndexEngine.getOperationsByCategory("VARIABLE_AXIS");
    expect(lower.length).toBe(3);
    expect(upper.length).toBe(3);
    expect(NXCAMMillingFunctionIndexEngine.getOperationsByCategory("nope")).toHaveLength(0);
  });

  it("findParameter respects limit + returns [] on no match", async () => {
    const { NXCAMMillingFunctionIndexEngine } = await import(
      "../engines/NXCAMMillingFunctionIndexEngine.js"
    );
    const all = NXCAMMillingFunctionIndexEngine.findParameter("spindle_rpm", 1000);
    expect(all.length).toBeGreaterThanOrEqual(5);
    const capped = NXCAMMillingFunctionIndexEngine.findParameter("spindle_rpm", 3);
    expect(capped.length).toBe(3);
    expect(NXCAMMillingFunctionIndexEngine.findParameter("zz_xxx_no")).toHaveLength(0);
  });

  // recommendByFeature
  it.each([
    ["face_top_surface", "face_milling"],
    ["rectangular_pocket", "planar_mill"],
    ["freeform_cavity", "cavity_mill"],
    ["steep_wall_finish", "zlevel_profile"],
    ["shallow_surface_finish", "fixed_contour"],
    ["impeller_blade", "variable_contour"],
    ["ruled_swarf_wall", "swarf_drive"],
    ["freeform_streamline", "variable_streamline"],
    ["high_efficiency_rough", "adaptive_milling"],
    ["operator_guided", "sequential_mill"],
    ["profile_finish_2d", "planar_profile"],
    ["automatic_feature_machining", "auto_3d_fbm"],
  ])("recommendByFeature(%s) → %s", async (feature, expected) => {
    const { NXCAMMillingFunctionIndexEngine } = await import(
      "../engines/NXCAMMillingFunctionIndexEngine.js"
    );
    const r = NXCAMMillingFunctionIndexEngine.recommendByFeature(feature as any);
    expect(r.primary).toBe(expected);
    const op: any = NXCAMMillingFunctionIndexEngine.getOperation(r.primary);
    expect("error" in op).toBe(false);
  });

  it("recommendByFeature defaults safely for unknown", async () => {
    const { NXCAMMillingFunctionIndexEngine } = await import(
      "../engines/NXCAMMillingFunctionIndexEngine.js"
    );
    const r = NXCAMMillingFunctionIndexEngine.recommendByFeature("imaginary" as any);
    expect(r.primary).toBe("cavity_mill");
    expect(r.reason).toMatch(/unknown|default/i);
  });

  // estimateScallopHeight
  it("estimateScallopHeight: textbook s=0.5mm, D=10mm → h≈0.00625mm", async () => {
    const { NXCAMMillingFunctionIndexEngine } = await import(
      "../engines/NXCAMMillingFunctionIndexEngine.js"
    );
    // h = 0.25 / (8 * 5) = 0.00625
    const r: any = NXCAMMillingFunctionIndexEngine.estimateScallopHeight(0.5, 10);
    expect("error" in r).toBe(false);
    expect(r.scallop_height_mm).toBeCloseTo(0.00625, 6);
    expect(r.tool_radius_mm).toBe(5);
  });

  it("estimateScallopHeight: doubling stepover ≈ 4× scallop (quadratic)", async () => {
    const { NXCAMMillingFunctionIndexEngine } = await import(
      "../engines/NXCAMMillingFunctionIndexEngine.js"
    );
    const small: any = NXCAMMillingFunctionIndexEngine.estimateScallopHeight(0.3, 10);
    const big: any = NXCAMMillingFunctionIndexEngine.estimateScallopHeight(0.6, 10);
    expect(big.scallop_height_mm / small.scallop_height_mm).toBeCloseTo(4, 6);
  });

  it.each([
    ["NaN stepover", NaN, 10],
    ["zero stepover", 0, 10],
    ["negative tool", 0.5, -10],
    ["Infinity tool", 0.5, Infinity],
    ["stepover ≥ tool_dia (boundary)", 10, 10],
    ["stepover > tool_dia", 12, 10],
  ])("estimateScallopHeight rejects: %s", async (_label, s, d) => {
    const { NXCAMMillingFunctionIndexEngine } = await import(
      "../engines/NXCAMMillingFunctionIndexEngine.js"
    );
    const r: any = NXCAMMillingFunctionIndexEngine.estimateScallopHeight(s, d);
    expect("error" in r).toBe(true);
  });

  // adaptiveEngagementCheck
  it.each([
    [10, 1.0, "safe"],
    [12, 1.5, "safe"],
    [12.01, 1.5, "caution"],
    [15, 1.8, "caution"],
    [25, 1.0, "critical"],
    [10, 2.5, "critical"],
  ])("adaptiveEngagementCheck(%i%%, %fxD) → %s", async (rad, ax, cls) => {
    const { NXCAMMillingFunctionIndexEngine } = await import(
      "../engines/NXCAMMillingFunctionIndexEngine.js"
    );
    const r: any = NXCAMMillingFunctionIndexEngine.adaptiveEngagementCheck(rad, ax);
    expect(r.classification).toBe(cls);
  });

  it.each([
    ["NaN radial", NaN, 1.0],
    ["zero radial", 0, 1.0],
    ["radial > 100", 105, 1.0],
    ["zero axial", 10, 0],
    ["Infinity axial", 10, Infinity],
    ["negative axial", 10, -1],
  ])("adaptiveEngagementCheck rejects: %s", async (_label, r, a) => {
    const { NXCAMMillingFunctionIndexEngine } = await import(
      "../engines/NXCAMMillingFunctionIndexEngine.js"
    );
    const res: any = NXCAMMillingFunctionIndexEngine.adaptiveEngagementCheck(r, a);
    expect("error" in res).toBe(true);
  });

  // Dispatcher round-trip
  it("round-trip: nxcam_milling_summary returns 13/196", async () => {
    const r: any = await invoke("nxcam_milling_summary", {});
    const d = r.data ?? r.result ?? r;
    expect(d.total_operations).toBe(13);
    expect(d.total_parameters).toBe(196);
  });

  it("round-trip: nxcam_milling_get_op returns variable_contour", async () => {
    const r: any = await invoke("nxcam_milling_get_op", { operation_id: "variable_contour" });
    const d = r.data ?? r.result ?? r;
    expect(d.category).toBe("variable_axis");
    expect(d.parameter_count).toBe(17);
  });

  it("round-trip: nxcam_milling_scallop textbook", async () => {
    const r: any = await invoke("nxcam_milling_scallop", { stepover_mm: 0.5, tool_diameter_mm: 10 });
    const d = r.data ?? r.result ?? r;
    expect(d.scallop_height_mm).toBeCloseTo(0.00625, 6);
  });

  it("round-trip: nxcam_milling_adaptive_check critical zone", async () => {
    const r: any = await invoke("nxcam_milling_adaptive_check", {
      radial_engagement_pct: 30,
      axial_doc_to_dia_ratio: 1.0,
    });
    const d = r.data ?? r.result ?? r;
    expect(d.classification).toBe("critical");
  });

  it("round-trip: nxcam_milling_recommend impeller_blade → variable_contour", async () => {
    const r: any = await invoke("nxcam_milling_recommend", { feature: "impeller_blade" });
    const d = r.data ?? r.result ?? r;
    expect(d.primary).toBe("variable_contour");
  });

  it("round-trip: validation error for empty operation_id", async () => {
    const r: any = await invoke("nxcam_milling_get_op", {});
    const blob = JSON.stringify(r);
    expect(blob).toMatch(/Invalid params|operation_id|required/i);
  });

  // Schema integration
  it("camDispatcher ACTIONS includes all 9 nxcam milling actions", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const expected = [
      "nxcam_milling_index",
      "nxcam_milling_summary",
      "nxcam_milling_list_ops",
      "nxcam_milling_get_op",
      "nxcam_milling_by_category",
      "nxcam_milling_find_param",
      "nxcam_milling_recommend",
      "nxcam_milling_scallop",
      "nxcam_milling_adaptive_check",
    ];
    for (const a of expected) expect(mod.ACTIONS).toContain(a);
  });

  it("ACTION_NXCAM_MILLING_FUNCTION_INDEX_SCHEMAS has 9 keys", async () => {
    const { ACTION_NXCAM_MILLING_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/nxcamMillingFunctionIndexActionSchemas.js"
    );
    expect(Object.keys(ACTION_NXCAM_MILLING_FUNCTION_INDEX_SCHEMAS)).toHaveLength(9);
  });

  it("nxcam_milling_adaptive_check schema rejects radial > 100", async () => {
    const { ACTION_NXCAM_MILLING_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/nxcamMillingFunctionIndexActionSchemas.js"
    );
    const s = ACTION_NXCAM_MILLING_FUNCTION_INDEX_SCHEMAS.nxcam_milling_adaptive_check;
    expect(s.safeParse({ radial_engagement_pct: 12, axial_doc_to_dia_ratio: 1.5 }).success).toBe(true);
    expect(s.safeParse({ radial_engagement_pct: 101, axial_doc_to_dia_ratio: 1.5 }).success).toBe(false);
    expect(s.safeParse({ radial_engagement_pct: 0, axial_doc_to_dia_ratio: 1.5 }).success).toBe(false);
    expect(s.safeParse({ radial_engagement_pct: 12, axial_doc_to_dia_ratio: 0 }).success).toBe(false);
  });
});
