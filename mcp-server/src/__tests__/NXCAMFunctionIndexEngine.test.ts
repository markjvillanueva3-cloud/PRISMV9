/**
 * NXCAMFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM42
 *
 * Coverage:
 *   - manifest: 3 sections (milling/turning/fbm), 37 ops, 520 params (hard numerics)
 *   - per-section pointer integrity (file, op_count, param_count, op_ids)
 *   - getAllOperations: real flat list with section_key annotations
 *   - findOperation: cross-section lookup + miss case
 *   - findParameterAcrossSections: real param search + limit + empty
 *   - getCategoryUniverse: deduplicated cat list with section attribution
 *   - recommendForFeature: ≥3 routing intents per section + hint fallback + no-match path
 *   - validateConsistency: real consistency report (is_consistent, totals match, no duplicates)
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

describe("NXCAMFunctionIndexEngine — unified index + dispatcher", () => {
  it("getManifest exposes nxcam/2306 with exactly 3 sections (milling/turning/fbm) and expected_totals", async () => {
    const { NXCAMFunctionIndexEngine } = await import(
      "../engines/NXCAMFunctionIndexEngine.js"
    );
    const m: any = NXCAMFunctionIndexEngine.getManifest();
    expect(m.system_id).toBe("nxcam");
    expect(m.version).toBe("2306");
    expect(Object.keys(m.sections).sort()).toEqual(["fbm", "milling", "turning"]);
    expect(m.sections.milling.file).toBe("milling.json");
    expect(m.sections.turning.file).toBe("turning.json");
    expect(m.sections.fbm.file).toBe("fbm.json");
    expect(m.expected_totals).toEqual({ sections: 3, operations: 37, parameters: 520 });
  });

  it("getSectionList returns sorted [fbm, milling, turning]", async () => {
    const { NXCAMFunctionIndexEngine } = await import(
      "../engines/NXCAMFunctionIndexEngine.js"
    );
    expect(NXCAMFunctionIndexEngine.getSectionList()).toEqual(["fbm", "milling", "turning"]);
  });

  it.each([
    ["milling", "milling.json", 13, 196, 6],
    ["turning", "turning.json", 12, 159, 6],
    ["fbm", "fbm.json", 12, 165, 6],
  ])("section %s pointer: file=%s, ops=%i, params=%i, training_topics=%i", async (key, file, ops, params, topics) => {
    const { NXCAMFunctionIndexEngine } = await import(
      "../engines/NXCAMFunctionIndexEngine.js"
    );
    const s: any = NXCAMFunctionIndexEngine.getSectionStats(key);
    expect(s.file).toBe(file);
    expect(s.operation_count).toBe(ops);
    expect(s.parameter_count).toBe(params);
    expect(s.training_topic_count).toBe(topics);
    expect(s.operation_ids).toHaveLength(ops);
    // operation_ids are alphabetically sorted strings — verify first non-empty entry
    expect(typeof s.operation_ids[0]).toBe("string");
    expect(s.operation_ids[0].length).toBeGreaterThan(0);
  });

  it("getSectionStats returns {error: ...} on unknown key", async () => {
    const { NXCAMFunctionIndexEngine } = await import(
      "../engines/NXCAMFunctionIndexEngine.js"
    );
    const s: any = NXCAMFunctionIndexEngine.getSectionStats("not_a_section");
    expect(s.error).toMatch(/not_a_section/);
  });

  it("getAllOperations returns 37 ops with section_key + 520 declared param sum", async () => {
    const { NXCAMFunctionIndexEngine } = await import(
      "../engines/NXCAMFunctionIndexEngine.js"
    );
    const all = NXCAMFunctionIndexEngine.getAllOperations();
    expect(all).toHaveLength(37);
    const totalParams = all.reduce((a, o) => a + o.parameter_count, 0);
    expect(totalParams).toBe(520);
    // distribution by section: milling 13, turning 12, fbm 12
    const bySection: Record<string, number> = {};
    for (const op of all) {
      bySection[op.section_key] = (bySection[op.section_key] ?? 0) + 1;
    }
    expect(bySection).toEqual({ milling: 13, turning: 12, fbm: 12 });
  });

  it.each([
    ["face_milling", "milling"],
    ["thread_od", "turning"],
    ["template_auto_3d", "fbm"],
    ["adaptive_milling", "milling"],
    ["centerline_drill", "turning"],
    ["machining_knowledge_rule", "fbm"],
  ])("findOperation('%s') resolves to section=%s", async (op_id, section) => {
    const { NXCAMFunctionIndexEngine } = await import(
      "../engines/NXCAMFunctionIndexEngine.js"
    );
    const r = NXCAMFunctionIndexEngine.findOperation(op_id);
    expect(r.found).toBe(true);
    expect(r.matches).toHaveLength(1);
    expect(r.matches[0].section_key).toBe(section);
    expect(r.matches[0].operation_id).toBe(op_id);
  });

  it("findOperation reports not-found cleanly", async () => {
    const { NXCAMFunctionIndexEngine } = await import(
      "../engines/NXCAMFunctionIndexEngine.js"
    );
    const r = NXCAMFunctionIndexEngine.findOperation("does_not_exist_anywhere");
    expect(r.found).toBe(false);
    expect(r.matches).toHaveLength(0);
  });

  it("findParameterAcrossSections('coolant_mode') hits ≥1 section with real content", async () => {
    const { NXCAMFunctionIndexEngine } = await import(
      "../engines/NXCAMFunctionIndexEngine.js"
    );
    const matches = NXCAMFunctionIndexEngine.findParameterAcrossSections("coolant_mode", 100);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    matches.forEach((m) => expect(m.parameter).toContain("coolant_mode"));
  });

  it("findParameterAcrossSections respects limit", async () => {
    const { NXCAMFunctionIndexEngine } = await import(
      "../engines/NXCAMFunctionIndexEngine.js"
    );
    const big = NXCAMFunctionIndexEngine.findParameterAcrossSections("type", 1000);
    const capped = NXCAMFunctionIndexEngine.findParameterAcrossSections("type", 5);
    expect(big.length).toBeGreaterThan(5);
    expect(capped.length).toBe(5);
  });

  it("findParameterAcrossSections returns empty on no match", async () => {
    const { NXCAMFunctionIndexEngine } = await import(
      "../engines/NXCAMFunctionIndexEngine.js"
    );
    const matches = NXCAMFunctionIndexEngine.findParameterAcrossSections("zz_xxx_definitely_not_a_param");
    expect(matches).toHaveLength(0);
  });

  it("getCategoryUniverse returns ≥15 categories deduplicated with section attribution from all 3 sources", async () => {
    const { NXCAMFunctionIndexEngine } = await import(
      "../engines/NXCAMFunctionIndexEngine.js"
    );
    const universe = NXCAMFunctionIndexEngine.getCategoryUniverse();
    // milling has 6 categories, turning 6, fbm 5 — all distinct names so total ≥15
    expect(universe.length).toBeGreaterThanOrEqual(15);
    // verify we cover all 3 sections somewhere
    const flatSections = new Set<string>();
    for (const u of universe) for (const s of u.sections) flatSections.add(s);
    expect(flatSections).toEqual(new Set(["milling", "turning", "fbm"]));
    // total operation_count across all categories must equal 37
    const totalOps = universe.reduce((a, x) => a + x.operation_count, 0);
    expect(totalOps).toBe(37);
  });

  // recommendForFeature — deterministic routing
  it.each([
    ["od_thread", "turning", "thread_od"],
    ["id_thread", "turning", "thread_id"],
    ["od_groove", "turning", "groove_od"],
    ["od_finish", "turning", "finish_turn_od"],
    ["face_top_surface", "milling", "face_milling"],
    ["rectangular_pocket", "milling", "planar_mill"],
    ["freeform_cavity", "milling", "cavity_mill"],
    ["impeller", "milling", "variable_contour"],
    ["auto_recognize", "fbm", "auto_feature_recognition"],
    ["mke_rule", "fbm", "machining_knowledge_rule"],
    ["template_library", "fbm", "template_library_mgmt"],
    ["feature_group", "fbm", "feature_group_operation"],
  ])("recommendForFeature('%s') → %s/%s", async (feature, section, op) => {
    const { NXCAMFunctionIndexEngine } = await import(
      "../engines/NXCAMFunctionIndexEngine.js"
    );
    const r = NXCAMFunctionIndexEngine.recommendForFeature(feature);
    expect(r.section_key).toBe(section);
    expect(r.operation_id).toBe(op);
    expect(r.reason.length).toBeGreaterThan(10);
  });

  it("recommendForFeature respects hint fallback (mill/lathe/fbm)", async () => {
    const { NXCAMFunctionIndexEngine } = await import(
      "../engines/NXCAMFunctionIndexEngine.js"
    );
    const m = NXCAMFunctionIndexEngine.recommendForFeature("ambiguous_thing", "milling");
    expect(m.section_key).toBe("milling");
    expect(m.operation_id).toBe("cavity_mill");
    const t = NXCAMFunctionIndexEngine.recommendForFeature("ambiguous_thing", "turning");
    expect(t.section_key).toBe("turning");
    expect(t.operation_id).toBe("rough_turn_od");
    const f = NXCAMFunctionIndexEngine.recommendForFeature("ambiguous_thing", "fbm");
    expect(f.section_key).toBe("fbm");
    expect(f.operation_id).toBe("auto_feature_recognition");
  });

  it("recommendForFeature reports no-match cleanly when no rule fires", async () => {
    const { NXCAMFunctionIndexEngine } = await import(
      "../engines/NXCAMFunctionIndexEngine.js"
    );
    const r = NXCAMFunctionIndexEngine.recommendForFeature("totally_unrelated_feature_xyz");
    expect(r.section_key).toBeNull();
    expect(r.operation_id).toBeNull();
    expect(r.reason).toMatch(/no routing rule/i);
    expect(r.alternatives).toHaveLength(0);
  });

  it("validateConsistency confirms manifest = actual, no duplicates, no missing files", async () => {
    const { NXCAMFunctionIndexEngine } = await import(
      "../engines/NXCAMFunctionIndexEngine.js"
    );
    const c = NXCAMFunctionIndexEngine.validateConsistency();
    expect(c.is_consistent).toBe(true);
    expect(c.manifest_section_count).toBe(3);
    expect(c.actual_section_count).toBe(3);
    expect(c.manifest_total_operations).toBe(37);
    expect(c.actual_total_operations).toBe(37);
    expect(c.manifest_total_parameters).toBe(520);
    expect(c.actual_total_parameters).toBe(520);
    expect(c.duplicate_operation_ids ?? []).toHaveLength(0);
    expect(c.missing_files ?? []).toHaveLength(0);
  });

  // Dispatcher round-trip
  it("round-trip: nxcam_index_manifest exposes 3 sections + expected_totals", async () => {
    const r: any = await invoke("nxcam_index_manifest", {});
    const d = r.data ?? r.result ?? r;
    expect(Object.keys(d.sections).sort()).toEqual(["fbm", "milling", "turning"]);
    expect(d.expected_totals.operations).toBe(37);
    expect(d.expected_totals.parameters).toBe(520);
  });

  it("round-trip: nxcam_index_section_list returns sorted 3-key list", async () => {
    const r: any = await invoke("nxcam_index_section_list", {});
    const d = r.data ?? r.result ?? r;
    expect(d).toEqual(["fbm", "milling", "turning"]);
  });

  it("round-trip: nxcam_index_section_stats('milling') returns 13/196/milling.json", async () => {
    const r: any = await invoke("nxcam_index_section_stats", { section_key: "milling" });
    const d = r.data ?? r.result ?? r;
    expect(d.file).toBe("milling.json");
    expect(d.operation_count).toBe(13);
    expect(d.parameter_count).toBe(196);
  });

  it("round-trip: nxcam_index_all_ops returns 37 entries", async () => {
    const r: any = await invoke("nxcam_index_all_ops", {});
    const d = r.data ?? r.result ?? r;
    expect(d).toHaveLength(37);
  });

  it("round-trip: nxcam_index_find_op('thread_od') resolves to turning", async () => {
    const r: any = await invoke("nxcam_index_find_op", { operation_id: "thread_od" });
    const d = r.data ?? r.result ?? r;
    expect(d.found).toBe(true);
    expect(d.matches[0].section_key).toBe("turning");
  });

  it("round-trip: nxcam_index_recommend('impeller') routes to milling/variable_contour", async () => {
    const r: any = await invoke("nxcam_index_recommend", { feature: "impeller" });
    const d = r.data ?? r.result ?? r;
    expect(d.section_key).toBe("milling");
    expect(d.operation_id).toBe("variable_contour");
  });

  it("round-trip: nxcam_index_validate is_consistent=true", async () => {
    const r: any = await invoke("nxcam_index_validate", {});
    const d = r.data ?? r.result ?? r;
    expect(d.is_consistent).toBe(true);
    expect(d.actual_total_operations).toBe(37);
    expect(d.actual_total_parameters).toBe(520);
  });

  it("round-trip: nxcam_index_section_stats validation error on missing section_key", async () => {
    const r: any = await invoke("nxcam_index_section_stats", {});
    const blob = JSON.stringify(r);
    expect(blob).toMatch(/Invalid params|section_key/i);
  });

  // Schema integration
  it("camDispatcher ACTIONS contains all 9 nxcam_index_* action names", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const expected = [
      "nxcam_index_manifest",
      "nxcam_index_section_list",
      "nxcam_index_section_stats",
      "nxcam_index_all_ops",
      "nxcam_index_find_op",
      "nxcam_index_find_param",
      "nxcam_index_category_universe",
      "nxcam_index_recommend",
      "nxcam_index_validate",
    ];
    for (const a of expected) expect(mod.ACTIONS).toContain(a);
  });

  it("ACTION_NXCAM_FUNCTION_INDEX_SCHEMAS has exactly 9 keys", async () => {
    const { ACTION_NXCAM_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/nxcamFunctionIndexActionSchemas.js"
    );
    expect(Object.keys(ACTION_NXCAM_FUNCTION_INDEX_SCHEMAS)).toHaveLength(9);
  });

  it("nxcam_index_recommend schema requires non-empty feature; hint optional", async () => {
    const { ACTION_NXCAM_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/nxcamFunctionIndexActionSchemas.js"
    );
    const s = ACTION_NXCAM_FUNCTION_INDEX_SCHEMAS.nxcam_index_recommend;
    expect(s.safeParse({ feature: "impeller" }).success).toBe(true);
    expect(s.safeParse({ feature: "impeller", hint: "milling" }).success).toBe(true);
    expect(s.safeParse({ feature: "" }).success).toBe(false);
    expect(s.safeParse({}).success).toBe(false);
  });

  it("nxcam_index_find_param schema: limit bounds [1,500] enforced", async () => {
    const { ACTION_NXCAM_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/nxcamFunctionIndexActionSchemas.js"
    );
    const s = ACTION_NXCAM_FUNCTION_INDEX_SCHEMAS.nxcam_index_find_param;
    expect(s.safeParse({ parameter_name: "coolant" }).success).toBe(true);
    expect(s.safeParse({ parameter_name: "coolant", limit: 50 }).success).toBe(true);
    expect(s.safeParse({ parameter_name: "coolant", limit: 0 }).success).toBe(false);
    expect(s.safeParse({ parameter_name: "coolant", limit: 1000 }).success).toBe(false);
    expect(s.safeParse({ parameter_name: "" }).success).toBe(false);
  });
});
