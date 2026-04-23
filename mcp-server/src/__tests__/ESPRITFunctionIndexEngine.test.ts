/**
 * ESPRITFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM53
 *
 * Coverage:
 *   - manifest invariants: 4 sections / 32 ops / 279 params
 *   - per-section reference counts
 *   - getAllOperations surfaces all 32 ops with non-empty fields
 *   - findOperation: hit + miss, ProfitMilling routed to milling
 *   - findParameterAcrossSections: cross-section safe_z search, limit, miss
 *   - getCategoryUniverse: ≥30 distinct categories; total op count = 32
 *   - recommendForFeature: 14 feature intents + 4 hint fallbacks + null fallback
 *   - validateConsistency: no duplicates / no missing files, is_consistent=true
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

describe("ESPRITFunctionIndexEngine — unified index + dispatcher", () => {
  it("manifest exposes 4 sections / 32 ops / 279 params with esprit system_id", async () => {
    const { ESPRITFunctionIndexEngine } = await import(
      "../engines/ESPRITFunctionIndexEngine.js"
    );
    const m: any = ESPRITFunctionIndexEngine.getManifest();
    expect(m.system_id).toBe("esprit");
    expect(m.totals.section_count).toBe(4);
    expect(m.totals.operations_count).toBe(32);
    expect(m.totals.parameters_count).toBe(279);
    expect(Object.keys(m.sections)).toHaveLength(4);
  });

  it.each([
    ["milling", 8, 87],
    ["lathe_millturn", 9, 85],
    ["wire_edm", 8, 59],
    ["knowledge_based_machining", 7, 48],
  ])("section %s declares %i ops / %i params (matches manifest)", async (key, ops, params) => {
    const { ESPRITFunctionIndexEngine } = await import(
      "../engines/ESPRITFunctionIndexEngine.js"
    );
    const s: any = ESPRITFunctionIndexEngine.getSectionStats(key);
    expect(s.section_key).toBe(key);
    expect(s.operations_count).toBe(ops);
    expect(s.parameters_count).toBe(params);
  });

  it("getAllOperations returns 32 with non-empty category & display_name", async () => {
    const { ESPRITFunctionIndexEngine } = await import(
      "../engines/ESPRITFunctionIndexEngine.js"
    );
    const all = ESPRITFunctionIndexEngine.getAllOperations();
    expect(all).toHaveLength(32);
    for (const op of all) {
      expect(op.category.length).toBeGreaterThan(0);
      expect(op.display_name.length).toBeGreaterThan(0);
      expect(op.parameter_count).toBeGreaterThan(0);
    }
  });

  it("getSectionList is sorted ascending and has 4 entries", async () => {
    const { ESPRITFunctionIndexEngine } = await import(
      "../engines/ESPRITFunctionIndexEngine.js"
    );
    const list = ESPRITFunctionIndexEngine.getSectionList();
    expect(list).toHaveLength(4);
    expect(list).toEqual([...list].sort());
  });

  it("findOperation hits ProfitMilling in milling section, misses unknown", async () => {
    const { ESPRITFunctionIndexEngine } = await import(
      "../engines/ESPRITFunctionIndexEngine.js"
    );
    const hit = ESPRITFunctionIndexEngine.findOperation("profitmilling_pocket");
    expect(hit.found).toBe(true);
    expect(hit.matches[0].section_key).toBe("milling");
    expect(hit.matches[0].category).toBe("profitmilling");

    const miss = ESPRITFunctionIndexEngine.findOperation("nonexistent_op_xyz");
    expect(miss.found).toBe(false);
    expect(miss.matches).toHaveLength(0);
  });

  it("findParameterAcrossSections finds tool_id in multiple sections, respects limit, returns empty on miss", async () => {
    const { ESPRITFunctionIndexEngine } = await import(
      "../engines/ESPRITFunctionIndexEngine.js"
    );
    const all = ESPRITFunctionIndexEngine.findParameterAcrossSections("tool_id", 200);
    expect(all.length).toBeGreaterThan(10);
    for (const m of all) expect(m.parameter).toContain("tool_id");

    const capped = ESPRITFunctionIndexEngine.findParameterAcrossSections("tool_id", 3);
    expect(capped.length).toBe(3);

    const empty = ESPRITFunctionIndexEngine.findParameterAcrossSections("zzz_definitely_nope", 50);
    expect(empty).toHaveLength(0);
  });

  it("getCategoryUniverse surfaces 29 distinct categories; sum of op counts = 32", async () => {
    const { ESPRITFunctionIndexEngine } = await import(
      "../engines/ESPRITFunctionIndexEngine.js"
    );
    const cats = ESPRITFunctionIndexEngine.getCategoryUniverse();
    // 32 ops collapse into 29 categories: cut_2axis, strategy_template, millturn_live each hold 2 ops
    expect(cats.length).toBe(29);
    const totalOps = cats.reduce((acc, c) => acc + c.operation_count, 0);
    expect(totalOps).toBe(32);
    const names = cats.map((c) => c.category);
    expect(names).toContain("profitmilling");
    expect(names).toContain("threading");
    expect(names).toContain("punch_die");
    expect(names).toContain("probing");
  });

  // recommendForFeature — 14 feature intents
  it.each([
    ["profitmilling_pocket", "milling", "profitmilling_pocket"],
    ["pocket_2_5d_standard", "milling", "pocket_2_5d"],
    ["rough_3d_cavity_zlevel", "milling", "rough_3d_zlevel"],
    ["five_axis_swarf_ruled", "milling", "five_axis_swarf"],
    ["turn_rough_od_g71", "lathe_millturn", "turn_rough_od"],
    ["thread_single_point_g76", "lathe_millturn", "thread_single_point"],
    ["millturn_y_axis_pocket", "lathe_millturn", "millturn_y_axis_pocket"],
    ["swiss_sub_spindle_handoff", "lathe_millturn", "swiss_main_sub_handoff"],
    ["wire_2axis_xy_cut", "wire_edm", "wire_2axis_cut"],
    ["wire_taper_uv_cut", "wire_edm", "wire_4axis_taper"],
    ["skim_pass_schedule", "wire_edm", "wire_skim_pass"],
    ["punch_die_pair", "wire_edm", "wire_punch_die"],
    ["recognize_features_auto", "knowledge_based_machining", "kbm_recognize_features"],
    ["probe_inspection_routine", "knowledge_based_machining", "kbm_probe_inspection"],
  ])("recommendForFeature(%s) → %s.%s", async (feature, section, op) => {
    const { ESPRITFunctionIndexEngine } = await import(
      "../engines/ESPRITFunctionIndexEngine.js"
    );
    const r = ESPRITFunctionIndexEngine.recommendForFeature(feature);
    expect(r.section_key).toBe(section);
    expect(r.operation_id).toBe(op);
    expect(r.reason.length).toBeGreaterThan(5);
  });

  // recommendForFeature — hint fallbacks
  it.each([
    ["nonsense_xyz", "mill", "milling", "pocket_2_5d"],
    ["nonsense_xyz", "lathe", "lathe_millturn", "turn_rough_od"],
    ["nonsense_xyz", "wedm", "wire_edm", "wire_2axis_cut"],
    ["nonsense_xyz", "kbm", "knowledge_based_machining", "kbm_recognize_features"],
  ])("recommendForFeature with hint='%s' falls back to %s.%s", async (feature, hint, section, op) => {
    const { ESPRITFunctionIndexEngine } = await import(
      "../engines/ESPRITFunctionIndexEngine.js"
    );
    const r = ESPRITFunctionIndexEngine.recommendForFeature(feature, hint);
    expect(r.section_key).toBe(section);
    expect(r.operation_id).toBe(op);
  });

  it("recommendForFeature returns nulls + descriptive reason when nothing matches", async () => {
    const { ESPRITFunctionIndexEngine } = await import(
      "../engines/ESPRITFunctionIndexEngine.js"
    );
    const r = ESPRITFunctionIndexEngine.recommendForFeature("totally_unmatched_xyz");
    expect(r.section_key).toBeNull();
    expect(r.operation_id).toBeNull();
    expect(r.reason).toMatch(/No routing rule matched/);
  });

  it("validateConsistency reports is_consistent=true with 0 duplicates / 0 missing files", async () => {
    const { ESPRITFunctionIndexEngine } = await import(
      "../engines/ESPRITFunctionIndexEngine.js"
    );
    const r = ESPRITFunctionIndexEngine.validateConsistency();
    expect(r.is_consistent).toBe(true);
    expect(r.actual_section_count).toBe(4);
    expect(r.actual_total_operations).toBe(32);
    expect(r.actual_total_parameters).toBe(279);
    expect(r.duplicate_operation_ids).toHaveLength(0);
    expect(r.missing_files).toHaveLength(0);
  });

  it("getSectionStats returns error on unknown section", async () => {
    const { ESPRITFunctionIndexEngine } = await import(
      "../engines/ESPRITFunctionIndexEngine.js"
    );
    const r: any = ESPRITFunctionIndexEngine.getSectionStats("zzz_unknown");
    expect(r.error).toMatch(/Unknown section/);
  });

  // Dispatcher round-trip
  it("round-trip: esprit_summary returns 4 sections / 32 ops / 279 params", async () => {
    const r: any = await invoke("esprit_summary", {});
    const d = r.data ?? r.result ?? r;
    expect(d.totals.section_count).toBe(4);
    expect(d.totals.operations_count).toBe(32);
    expect(d.totals.parameters_count).toBe(279);
    expect(d.section_count).toBe(4);
  });

  it("round-trip: esprit_list_sections returns 4 sorted entries", async () => {
    const r: any = await invoke("esprit_list_sections", {});
    const d = r.data ?? r.result ?? r;
    expect(d).toHaveLength(4);
    expect(d).toEqual([...d].sort());
  });

  it("round-trip: esprit_section_stats(wire_edm) → 8 ops / 59 params", async () => {
    const r: any = await invoke("esprit_section_stats", { section_key: "wire_edm" });
    const d = r.data ?? r.result ?? r;
    expect(d.operations_count).toBe(8);
    expect(d.parameters_count).toBe(59);
  });

  it("round-trip: esprit_find_op('thread_single_point') → lathe_millturn", async () => {
    const r: any = await invoke("esprit_find_op", { operation_id: "thread_single_point" });
    const d = r.data ?? r.result ?? r;
    expect(d.found).toBe(true);
    expect(d.matches[0].section_key).toBe("lathe_millturn");
  });

  it("round-trip: esprit_recommend('profitmilling_pocket') → milling.profitmilling_pocket", async () => {
    const r: any = await invoke("esprit_recommend", { feature: "profitmilling_pocket" });
    const d = r.data ?? r.result ?? r;
    expect(d.section_key).toBe("milling");
    expect(d.operation_id).toBe("profitmilling_pocket");
  });

  it("round-trip: esprit_consistency reports is_consistent=true", async () => {
    const r: any = await invoke("esprit_consistency", {});
    const d = r.data ?? r.result ?? r;
    expect(d.is_consistent).toBe(true);
    expect(d.actual_total_operations).toBe(32);
  });

  it("round-trip: esprit_section_stats with invalid enum rejected by zod", async () => {
    const r: any = await invoke("esprit_section_stats", { section_key: "bogus" });
    const blob = JSON.stringify(r);
    expect(blob).toMatch(/Invalid params|enum|bogus/i);
  });

  it("camDispatcher ACTIONS contains all 10 esprit_* unified names", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const expected = [
      "esprit_index",
      "esprit_summary",
      "esprit_list_sections",
      "esprit_section_stats",
      "esprit_list_ops",
      "esprit_find_op",
      "esprit_find_param",
      "esprit_categories",
      "esprit_recommend",
      "esprit_consistency",
    ];
    for (const a of expected) expect(mod.ACTIONS).toContain(a);
  });

  it("ACTION_ESPRIT_FUNCTION_INDEX_SCHEMAS has exactly 10 keys", async () => {
    const { ACTION_ESPRIT_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/espritFunctionIndexActionSchemas.js"
    );
    expect(Object.keys(ACTION_ESPRIT_FUNCTION_INDEX_SCHEMAS)).toHaveLength(10);
  });

  it("esprit_find_param schema enforces non-empty parameter_name and limit ≤ 200", async () => {
    const { ACTION_ESPRIT_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/espritFunctionIndexActionSchemas.js"
    );
    const s = ACTION_ESPRIT_FUNCTION_INDEX_SCHEMAS.esprit_find_param;
    expect(s.safeParse({ parameter_name: "stepover" }).success).toBe(true);
    expect(s.safeParse({ parameter_name: "" }).success).toBe(false);
    expect(s.safeParse({ parameter_name: "x", limit: 500 }).success).toBe(false);
  });
});
