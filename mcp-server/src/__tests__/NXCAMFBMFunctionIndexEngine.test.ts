/**
 * NXCAMFBMFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM41
 *
 * Coverage:
 *   - schema invariants: 12 ops, 165 params, 5 categories, 6 topics
 *   - per-op reference values + parameter-count consistency
 *   - variability: all 5 categories exercised; ≥3 hole-classification toggles, ≥3 mke rule fields
 *   - engine methods: real invocation + failure + adversarial NaN/Infinity
 *   - recommendByFeature: 12 intents end-to-end + default fallback
 *   - classifyPocketDepth: 4 zone boundaries (shallow/normal/deep/extreme) + adversarial
 *   - selectSmallestFitTool: real catalogue with ≥3 candidates + no-fit case
 *   - matchKnowledgeRule: enabled toggle, priority ordering, dimensional envelope, material wildcard
 *   - featureGroupEfficiency: 4 zone boundaries + integer-only enforcement
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

describe("NXCAMFBMFunctionIndexEngine — engine + dispatcher", () => {
  it("getSummary returns exactly 12 ops / 165 params / 5 categories / nxcam/fbm", async () => {
    const { NXCAMFBMFunctionIndexEngine } = await import(
      "../engines/NXCAMFBMFunctionIndexEngine.js"
    );
    const s: any = NXCAMFBMFunctionIndexEngine.getSummary();
    expect(s.system_id).toBe("nxcam");
    expect(s.section_key).toBe("fbm");
    expect(s.total_operations).toBe(12);
    expect(s.total_parameters).toBe(165);
    expect(s.categories).toHaveLength(5);
    expect(s.training_topics_count).toBe(6);
  });

  it.each([
    ["auto_feature_recognition", "feature_recognition", 20],
    ["hole_feature_recognition", "feature_recognition", 15],
    ["pocket_feature_recognition", "feature_recognition", 14],
    ["manual_feature_create", "manual_feature", 12],
    ["feature_painting", "manual_feature", 10],
    ["machining_knowledge_rule", "machining_knowledge", 18],
    ["machining_knowledge_library", "machining_knowledge", 12],
    ["template_auto_3d", "process_template", 16],
    ["template_hole_making", "process_template", 14],
    ["template_library_mgmt", "process_template", 10],
    ["feature_group_operation", "feature_group", 14],
    ["feature_cad_sync", "feature_group", 10],
  ])("op %s → category %s, params %i", async (id, cat, count) => {
    const { NXCAMFBMFunctionIndexEngine } = await import(
      "../engines/NXCAMFBMFunctionIndexEngine.js"
    );
    const op: any = NXCAMFBMFunctionIndexEngine.getOperation(id);
    expect("error" in op).toBe(false);
    expect(op.category).toBe(cat);
    expect(op.parameter_count).toBe(count);
  });

  it("declared sum = 165 + every op's nested parameter count matches declared", async () => {
    const { NXCAMFBMFunctionIndexEngine } = await import(
      "../engines/NXCAMFBMFunctionIndexEngine.js"
    );
    const idx: any = NXCAMFBMFunctionIndexEngine.getIndex();
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
    expect(total).toBe(165);
  });

  it("category breakdown sums to 165 / 12 ops across 5 categories", async () => {
    const { NXCAMFBMFunctionIndexEngine } = await import(
      "../engines/NXCAMFBMFunctionIndexEngine.js"
    );
    const b = NXCAMFBMFunctionIndexEngine.getCategoryBreakdown();
    expect(b.length).toBe(5);
    expect(b.reduce((a, x) => a + x.operations.length, 0)).toBe(12);
    expect(b.reduce((a, x) => a + x.total_parameters, 0)).toBe(165);
  });

  it("variability: hole_feature_recognition has all 7 hole-type toggle parameters with boolean type", async () => {
    const { NXCAMFBMFunctionIndexEngine } = await import(
      "../engines/NXCAMFBMFunctionIndexEngine.js"
    );
    const op: any = NXCAMFBMFunctionIndexEngine.getOperation("hole_feature_recognition");
    const types = op.parameters.hole_types;
    expect(Object.keys(types)).toHaveLength(7);
    expect(types.recognize_simple.type).toBe("boolean");
    expect(types.recognize_simple.default).toBe(true);
    expect(types.recognize_counterbore.type).toBe("boolean");
    expect(types.recognize_counterbore.default).toBe(true);
    expect(types.recognize_threaded.type).toBe("boolean");
    expect(types.recognize_threaded.default).toBe(true);
    expect(types.recognize_tapered.default).toBe(false);
  });

  it("variability: machining_knowledge_rule schema has correct types/values across 4 dimensions", async () => {
    const { NXCAMFBMFunctionIndexEngine } = await import(
      "../engines/NXCAMFBMFunctionIndexEngine.js"
    );
    const op: any = NXCAMFBMFunctionIndexEngine.getOperation("machining_knowledge_rule");
    expect(op.parameters.match.feature_type.type).toBe("enum");
    expect(op.parameters.match.feature_type.default).toBe("any");
    expect(op.parameters.match.feature_type.values).toContain("pocket");
    expect(op.parameters.match.feature_type.values).toContain("hole");
    expect(op.parameters.priority.priority.type).toBe("number");
    expect(op.parameters.priority.priority.min).toBe(1);
    expect(op.parameters.priority.priority.max).toBe(1000);
    expect(op.parameters.constraints.required_machine_class.type).toBe("enum");
    expect(op.parameters.constraints.required_machine_class.values).toContain("mill_3axis");
    expect(op.parameters.constraints.required_machine_class.values).toContain("mill_5axis");
    expect(op.parameters.action.applied_template.type).toBe("string");
    expect(op.parameters.action.applied_template.required).toBe(true);
  });

  it("variability: all 5 categories present in catalog with correct membership", async () => {
    const { NXCAMFBMFunctionIndexEngine } = await import(
      "../engines/NXCAMFBMFunctionIndexEngine.js"
    );
    const idx: any = NXCAMFBMFunctionIndexEngine.getIndex();
    const cats = new Set<string>();
    for (const op of Object.values(idx.operations) as any) cats.add(op.category);
    expect(cats.size).toBe(5);
    expect(cats).toContain("feature_recognition");
    expect(cats).toContain("manual_feature");
    expect(cats).toContain("machining_knowledge");
    expect(cats).toContain("process_template");
    expect(cats).toContain("feature_group");
  });

  // Failure modes
  it("getOperation returns {error: ...} on unknown id, real match on known", async () => {
    const { NXCAMFBMFunctionIndexEngine } = await import(
      "../engines/NXCAMFBMFunctionIndexEngine.js"
    );
    const bad: any = NXCAMFBMFunctionIndexEngine.getOperation("bogus_id_does_not_exist");
    expect(bad.error).toMatch(/bogus_id_does_not_exist/);
    const good: any = NXCAMFBMFunctionIndexEngine.getOperation("template_auto_3d");
    expect(good.operation_id).toBe("template_auto_3d");
    expect(good.parameter_count).toBe(16);
  });

  it("getOperationsByCategory case-insensitive + empty on unknown", async () => {
    const { NXCAMFBMFunctionIndexEngine } = await import(
      "../engines/NXCAMFBMFunctionIndexEngine.js"
    );
    const lower = NXCAMFBMFunctionIndexEngine.getOperationsByCategory("feature_recognition");
    const upper = NXCAMFBMFunctionIndexEngine.getOperationsByCategory("FEATURE_RECOGNITION");
    expect(lower.length).toBe(3);
    expect(upper.length).toBe(3);
    expect(lower.map((o) => o.operation_id).sort()).toEqual([
      "auto_feature_recognition",
      "hole_feature_recognition",
      "pocket_feature_recognition",
    ]);
    expect(NXCAMFBMFunctionIndexEngine.getOperationsByCategory("no_such_cat")).toHaveLength(0);
  });

  it("findParameter respects limit; returns empty on no match; real content on match", async () => {
    const { NXCAMFBMFunctionIndexEngine } = await import(
      "../engines/NXCAMFBMFunctionIndexEngine.js"
    );
    const all = NXCAMFBMFunctionIndexEngine.findParameter("template_id", 1000);
    expect(all.length).toBeGreaterThanOrEqual(2);
    all.forEach((m) => expect(m.parameter).toContain("template_id"));
    const capped = NXCAMFBMFunctionIndexEngine.findParameter("recognize", 3);
    expect(capped.length).toBe(3);
    expect(NXCAMFBMFunctionIndexEngine.findParameter("zz_xxx_nonexistent")).toHaveLength(0);
  });

  // recommendByFeature — 12 intents (variability + verification)
  it.each([
    ["auto_recognize", "auto_feature_recognition"],
    ["hole_only_recognize", "hole_feature_recognition"],
    ["pocket_only_recognize", "pocket_feature_recognition"],
    ["manual_feature", "manual_feature_create"],
    ["paint_faces", "feature_painting"],
    ["edit_mke_rule", "machining_knowledge_rule"],
    ["mke_library", "machining_knowledge_library"],
    ["auto_3d_machining", "template_auto_3d"],
    ["hole_making", "template_hole_making"],
    ["template_library", "template_library_mgmt"],
    ["feature_group_batch", "feature_group_operation"],
    ["cad_sync", "feature_cad_sync"],
  ])("recommendByFeature(%s) → %s (verified in catalog)", async (intent, expected) => {
    const { NXCAMFBMFunctionIndexEngine } = await import(
      "../engines/NXCAMFBMFunctionIndexEngine.js"
    );
    const r = NXCAMFBMFunctionIndexEngine.recommendByFeature(intent as any);
    expect(r.primary).toBe(expected);
    expect(r.reason.length).toBeGreaterThan(10);
    const op: any = NXCAMFBMFunctionIndexEngine.getOperation(r.primary);
    expect("error" in op).toBe(false);
    expect(op.operation_id).toBe(expected);
  });

  it("recommendByFeature defaults safely with informative reason", async () => {
    const { NXCAMFBMFunctionIndexEngine } = await import(
      "../engines/NXCAMFBMFunctionIndexEngine.js"
    );
    const r = NXCAMFBMFunctionIndexEngine.recommendByFeature("totally_bogus" as any);
    expect(r.primary).toBe("auto_feature_recognition");
    expect(r.reason).toMatch(/unknown|default/i);
  });

  // classifyPocketDepth — 4 zones with deterministic boundaries
  it.each([
    [5, 50, "shallow", 0.1],
    [10, 50, "shallow", 0.2],
    [25, 50, "shallow", 0.5],
    [40, 50, "normal", 0.8],
    [100, 50, "normal", 2.0],
    [150, 50, "deep", 3.0],
    [200, 50, "deep", 4.0],
    [250, 50, "extreme", 5.0],
  ])("classifyPocketDepth(d=%i,w=%i) → %s, ratio=%f", async (depth, width, cls, ratio) => {
    const { NXCAMFBMFunctionIndexEngine } = await import(
      "../engines/NXCAMFBMFunctionIndexEngine.js"
    );
    const r: any = NXCAMFBMFunctionIndexEngine.classifyPocketDepth(depth, width);
    expect(r.classification).toBe(cls);
    expect(r.depth_to_width_ratio).toBeCloseTo(ratio, 6);
  });

  it.each([
    ["NaN depth", NaN, 50],
    ["zero depth", 0, 50],
    ["negative depth", -5, 50],
    ["NaN width", 10, NaN],
    ["zero width", 10, 0],
    ["Infinity width", 10, Infinity],
  ])("classifyPocketDepth rejects: %s", async (_label, d, w) => {
    const { NXCAMFBMFunctionIndexEngine } = await import(
      "../engines/NXCAMFBMFunctionIndexEngine.js"
    );
    const r: any = NXCAMFBMFunctionIndexEngine.classifyPocketDepth(d, w);
    expect("error" in r).toBe(true);
  });

  // selectSmallestFitTool — real catalogue
  it("selectSmallestFitTool picks smallest tool whose radius ≤ feature_min_radius", async () => {
    const { NXCAMFBMFunctionIndexEngine } = await import(
      "../engines/NXCAMFBMFunctionIndexEngine.js"
    );
    const tools = [
      { tool_id: "T-2mm", tool_diameter_mm: 2 },
      { tool_id: "T-4mm", tool_diameter_mm: 4 },
      { tool_id: "T-6mm", tool_diameter_mm: 6 },
      { tool_id: "T-8mm", tool_diameter_mm: 8 },
      { tool_id: "T-10mm", tool_diameter_mm: 10 },
    ];
    // feature_min_radius = 5mm → tools with radius ≤ 5: T-2,T-4,T-6,T-8,T-10. Smallest: T-2.
    const r: any = NXCAMFBMFunctionIndexEngine.selectSmallestFitTool(5, tools);
    expect(r.selected_tool_id).toBe("T-2mm");
    expect(r.selected_tool_radius_mm).toBe(1);
    expect(r.candidates_considered).toBe(5);
  });

  it("selectSmallestFitTool only T-10 fits at min_radius=5; pick T-10", async () => {
    const { NXCAMFBMFunctionIndexEngine } = await import(
      "../engines/NXCAMFBMFunctionIndexEngine.js"
    );
    // Tools: 10/12/14 → radii 5/6/7. At min_radius=5 only T-10 fits.
    const tools = [
      { tool_id: "T-10mm", tool_diameter_mm: 10 },
      { tool_id: "T-12mm", tool_diameter_mm: 12 },
      { tool_id: "T-14mm", tool_diameter_mm: 14 },
    ];
    const r: any = NXCAMFBMFunctionIndexEngine.selectSmallestFitTool(5, tools);
    expect(r.selected_tool_id).toBe("T-10mm");
  });

  it("selectSmallestFitTool no-fit case reports closest and shortfall reason", async () => {
    const { NXCAMFBMFunctionIndexEngine } = await import(
      "../engines/NXCAMFBMFunctionIndexEngine.js"
    );
    const tools = [
      { tool_id: "T-12mm", tool_diameter_mm: 12 },
      { tool_id: "T-16mm", tool_diameter_mm: 16 },
    ];
    // min_radius=2 → no tool fits (smallest radius is 6). Closest tool returned = T-12mm.
    const r: any = NXCAMFBMFunctionIndexEngine.selectSmallestFitTool(2, tools);
    expect(r.selected_tool_id).toBe("T-12mm");
    expect(r.reason).toMatch(/under-cut|fits/i);
  });

  it.each([
    ["NaN min_radius", NaN, [{ tool_id: "T", tool_diameter_mm: 4 }]],
    ["zero min_radius", 0, [{ tool_id: "T", tool_diameter_mm: 4 }]],
    ["negative min_radius", -1, [{ tool_id: "T", tool_diameter_mm: 4 }]],
    ["empty tools", 5, []],
    ["bad tool entry", 5, [{ tool_id: "T", tool_diameter_mm: -3 }]],
  ])("selectSmallestFitTool rejects: %s", async (_label, mr, tools) => {
    const { NXCAMFBMFunctionIndexEngine } = await import(
      "../engines/NXCAMFBMFunctionIndexEngine.js"
    );
    const r: any = NXCAMFBMFunctionIndexEngine.selectSmallestFitTool(mr, tools as any);
    expect("error" in r).toBe(true);
  });

  // matchKnowledgeRule — real MKE behaviour
  it("matchKnowledgeRule picks lowest-priority enabled match across mixed rules", async () => {
    const { NXCAMFBMFunctionIndexEngine } = await import(
      "../engines/NXCAMFBMFunctionIndexEngine.js"
    );
    const rules = [
      { rule_id: "R1", priority: 30, feature_type: "pocket", material_filter: "aluminum", applied_template: "AUTO_3D_AL" },
      { rule_id: "R2", priority: 10, feature_type: "pocket", material_filter: "aluminum", applied_template: "FAST_AL" },
      { rule_id: "R3", priority: 5,  feature_type: "pocket", material_filter: "steel",    applied_template: "FAST_STEEL" },
      { rule_id: "R4", priority: 20, feature_type: "any",    material_filter: null,        applied_template: "GENERIC" },
    ];
    const r: any = NXCAMFBMFunctionIndexEngine.matchKnowledgeRule("pocket", "aluminum", rules);
    expect(r.matched).toBe(true);
    // R3 (steel) doesn't match. Among matches: R1=30, R2=10, R4=20 → lowest = R2.
    expect(r.rule_id).toBe("R2");
    expect(r.applied_template).toBe("FAST_AL");
    expect(r.priority).toBe(10);
    expect(r.candidates_considered).toBe(4);
  });

  it("matchKnowledgeRule honors enabled=false skip", async () => {
    const { NXCAMFBMFunctionIndexEngine } = await import(
      "../engines/NXCAMFBMFunctionIndexEngine.js"
    );
    const rules = [
      { rule_id: "R1", priority: 5,  feature_type: "hole", material_filter: "steel", applied_template: "DRILL_FAST", enabled: false },
      { rule_id: "R2", priority: 20, feature_type: "hole", material_filter: "steel", applied_template: "DRILL_SLOW", enabled: true },
    ];
    const r: any = NXCAMFBMFunctionIndexEngine.matchKnowledgeRule("hole", "steel", rules);
    expect(r.rule_id).toBe("R2");
  });

  it("matchKnowledgeRule respects dimensional envelope (min/max diameter)", async () => {
    const { NXCAMFBMFunctionIndexEngine } = await import(
      "../engines/NXCAMFBMFunctionIndexEngine.js"
    );
    const rules = [
      { rule_id: "small", priority: 10, feature_type: "hole", material_filter: null, applied_template: "SMALL_HOLE", min_diameter_mm: 1, max_diameter_mm: 5 },
      { rule_id: "big",   priority: 10, feature_type: "hole", material_filter: null, applied_template: "BIG_HOLE",   min_diameter_mm: 5.001, max_diameter_mm: 50 },
    ];
    const r1: any = NXCAMFBMFunctionIndexEngine.matchKnowledgeRule("hole", "any", rules, { diameter_mm: 3 });
    expect(r1.rule_id).toBe("small");
    const r2: any = NXCAMFBMFunctionIndexEngine.matchKnowledgeRule("hole", "any", rules, { diameter_mm: 25 });
    expect(r2.rule_id).toBe("big");
  });

  it("matchKnowledgeRule reports unmatched with reason and candidate count", async () => {
    const { NXCAMFBMFunctionIndexEngine } = await import(
      "../engines/NXCAMFBMFunctionIndexEngine.js"
    );
    const rules = [
      { rule_id: "R1", priority: 10, feature_type: "pocket", material_filter: "aluminum", applied_template: "X" },
    ];
    const r: any = NXCAMFBMFunctionIndexEngine.matchKnowledgeRule("hole", "steel", rules);
    expect(r.matched).toBe(false);
    expect(r.candidates_considered).toBe(1);
    expect(r.reason).toMatch(/no enabled|not matched/i);
  });

  it.each([
    ["empty feature_type", "", "steel", []],
    ["empty material",     "hole", "", []],
    ["non-array rules",    "hole", "steel", null as any],
  ])("matchKnowledgeRule rejects: %s", async (_label, ft, mat, rules) => {
    const { NXCAMFBMFunctionIndexEngine } = await import(
      "../engines/NXCAMFBMFunctionIndexEngine.js"
    );
    const r: any = NXCAMFBMFunctionIndexEngine.matchKnowledgeRule(ft as any, mat as any, rules as any);
    expect("error" in r).toBe(true);
  });

  // featureGroupEfficiency — 4 zones
  it.each([
    [2, 5, "wasteful", 0.4],
    [5, 5, "sparse", 1.0],
    [10, 5, "sparse", 2.0],
    [15, 5, "efficient", 3.0],
    [25, 5, "efficient", 5.0],
    [30, 5, "highly_efficient", 6.0],
    [50, 5, "highly_efficient", 10.0],
  ])("featureGroupEfficiency(%i,%i) → %s, ratio=%f", async (fc, tc, cls, ratio) => {
    const { NXCAMFBMFunctionIndexEngine } = await import(
      "../engines/NXCAMFBMFunctionIndexEngine.js"
    );
    const r: any = NXCAMFBMFunctionIndexEngine.featureGroupEfficiency(fc, tc);
    expect(r.classification).toBe(cls);
    expect(r.ratio).toBeCloseTo(ratio, 6);
  });

  it.each([
    ["NaN feature_count", NaN, 5],
    ["fractional feature_count", 3.5, 5],
    ["negative feature_count", -1, 5],
    ["zero tool_count", 10, 0],
    ["negative tool_count", 10, -1],
    ["NaN tool_count", 10, NaN],
  ])("featureGroupEfficiency rejects: %s", async (_label, fc, tc) => {
    const { NXCAMFBMFunctionIndexEngine } = await import(
      "../engines/NXCAMFBMFunctionIndexEngine.js"
    );
    const r: any = NXCAMFBMFunctionIndexEngine.featureGroupEfficiency(fc, tc);
    expect("error" in r).toBe(true);
  });

  // Dispatcher round-trip — happy paths
  it("round-trip: nxcam_fbm_summary returns 12/165", async () => {
    const r: any = await invoke("nxcam_fbm_summary", {});
    const d = r.data ?? r.result ?? r;
    expect(d.total_operations).toBe(12);
    expect(d.total_parameters).toBe(165);
  });

  it("round-trip: nxcam_fbm_get_op('template_auto_3d') returns 16 params, process_template", async () => {
    const r: any = await invoke("nxcam_fbm_get_op", { operation_id: "template_auto_3d" });
    const d = r.data ?? r.result ?? r;
    expect(d.category).toBe("process_template");
    expect(d.parameter_count).toBe(16);
  });

  it("round-trip: nxcam_fbm_classify_pocket_depth(150,50) → deep, ratio=3", async () => {
    const r: any = await invoke("nxcam_fbm_classify_pocket_depth", { depth_mm: 150, width_mm: 50 });
    const d = r.data ?? r.result ?? r;
    expect(d.classification).toBe("deep");
    expect(d.depth_to_width_ratio).toBeCloseTo(3, 6);
  });

  it("round-trip: nxcam_fbm_smallest_fit_tool happy path", async () => {
    const r: any = await invoke("nxcam_fbm_smallest_fit_tool", {
      feature_min_radius_mm: 5,
      tools: [
        { tool_id: "T-4mm", tool_diameter_mm: 4 },
        { tool_id: "T-8mm", tool_diameter_mm: 8 },
        { tool_id: "T-10mm", tool_diameter_mm: 10 },
      ],
    });
    const d = r.data ?? r.result ?? r;
    expect(d.selected_tool_id).toBe("T-4mm");
  });

  it("round-trip: nxcam_fbm_match_rule picks lowest-priority enabled match", async () => {
    const r: any = await invoke("nxcam_fbm_match_rule", {
      feature_type: "pocket",
      material: "aluminum",
      rules: [
        { rule_id: "R1", priority: 30, feature_type: "pocket", material_filter: "aluminum", applied_template: "AUTO_3D_AL" },
        { rule_id: "R2", priority: 10, feature_type: "pocket", material_filter: "aluminum", applied_template: "FAST_AL" },
      ],
    });
    const d = r.data ?? r.result ?? r;
    expect(d.matched).toBe(true);
    expect(d.rule_id).toBe("R2");
  });

  it("round-trip: nxcam_fbm_group_efficiency(15,5) → efficient, ratio=3", async () => {
    const r: any = await invoke("nxcam_fbm_group_efficiency", { feature_count: 15, tool_count: 5 });
    const d = r.data ?? r.result ?? r;
    expect(d.classification).toBe("efficient");
    expect(d.ratio).toBeCloseTo(3, 6);
  });

  it("round-trip: nxcam_fbm_recommend(auto_3d_machining) → template_auto_3d", async () => {
    const r: any = await invoke("nxcam_fbm_recommend", { intent: "auto_3d_machining" });
    const d = r.data ?? r.result ?? r;
    expect(d.primary).toBe("template_auto_3d");
  });

  it("round-trip: validation error for negative depth in classify_pocket_depth", async () => {
    const r: any = await invoke("nxcam_fbm_classify_pocket_depth", { depth_mm: -10, width_mm: 50 });
    const blob = JSON.stringify(r);
    expect(blob).toMatch(/Invalid params|positive/i);
  });

  // Schema integration
  it("camDispatcher ACTIONS contains all 11 nxcam_fbm_* action names", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const expected = [
      "nxcam_fbm_index",
      "nxcam_fbm_summary",
      "nxcam_fbm_list_ops",
      "nxcam_fbm_get_op",
      "nxcam_fbm_by_category",
      "nxcam_fbm_find_param",
      "nxcam_fbm_recommend",
      "nxcam_fbm_classify_pocket_depth",
      "nxcam_fbm_smallest_fit_tool",
      "nxcam_fbm_match_rule",
      "nxcam_fbm_group_efficiency",
    ];
    for (const a of expected) expect(mod.ACTIONS).toContain(a);
  });

  it("ACTION_NXCAM_FBM_FUNCTION_INDEX_SCHEMAS has exactly 11 keys", async () => {
    const { ACTION_NXCAM_FBM_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/nxcamFBMFunctionIndexActionSchemas.js"
    );
    expect(Object.keys(ACTION_NXCAM_FBM_FUNCTION_INDEX_SCHEMAS)).toHaveLength(11);
  });

  it("nxcam_fbm_smallest_fit_tool schema rejects empty tools array and bad diameter", async () => {
    const { ACTION_NXCAM_FBM_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/nxcamFBMFunctionIndexActionSchemas.js"
    );
    const s = ACTION_NXCAM_FBM_FUNCTION_INDEX_SCHEMAS.nxcam_fbm_smallest_fit_tool;
    expect(s.safeParse({ feature_min_radius_mm: 5, tools: [{ tool_id: "T", tool_diameter_mm: 4 }] }).success).toBe(true);
    expect(s.safeParse({ feature_min_radius_mm: 5, tools: [] }).success).toBe(false);
    expect(s.safeParse({ feature_min_radius_mm: -1, tools: [{ tool_id: "T", tool_diameter_mm: 4 }] }).success).toBe(false);
    expect(s.safeParse({ feature_min_radius_mm: 5, tools: [{ tool_id: "T", tool_diameter_mm: -4 }] }).success).toBe(false);
    expect(s.safeParse({ feature_min_radius_mm: 5, tools: [{ tool_id: "", tool_diameter_mm: 4 }] }).success).toBe(false);
  });

  it("nxcam_fbm_group_efficiency schema enforces integer counts and tool_count ≥ 1", async () => {
    const { ACTION_NXCAM_FBM_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/nxcamFBMFunctionIndexActionSchemas.js"
    );
    const s = ACTION_NXCAM_FBM_FUNCTION_INDEX_SCHEMAS.nxcam_fbm_group_efficiency;
    expect(s.safeParse({ feature_count: 10, tool_count: 3 }).success).toBe(true);
    expect(s.safeParse({ feature_count: 0, tool_count: 1 }).success).toBe(true);
    expect(s.safeParse({ feature_count: 3.5, tool_count: 1 }).success).toBe(false);
    expect(s.safeParse({ feature_count: -1, tool_count: 1 }).success).toBe(false);
    expect(s.safeParse({ feature_count: 10, tool_count: 0 }).success).toBe(false);
  });
});
