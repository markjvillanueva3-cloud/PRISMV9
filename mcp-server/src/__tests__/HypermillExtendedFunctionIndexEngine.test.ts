/**
 * HypermillExtendedFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM48
 *
 * Coverage:
 *   - manifest invariants: 7 sections, 45 ops, 341 params
 *   - per-section reference counts (ops + params)
 *   - declared op count = catalog op count (variability check)
 *   - manifest totals match actual sums (consistency)
 *   - getAllOperations: every op surfaced with category + display_name
 *   - findOperation: hit + miss
 *   - findParameterAcrossSections: hit, limit cap, miss
 *   - getCategoryUniverse: covers ≥27 distinct categories
 *   - recommendForFeature: 14 feature intents + 7 hint fallbacks + null fallback
 *   - validateConsistency: passes on disk
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

describe("HypermillExtendedFunctionIndexEngine — engine + dispatcher", () => {
  it("manifest exposes 7 sections / 45 ops / 341 params with hypermill system_id", async () => {
    const { HypermillExtendedFunctionIndexEngine } = await import(
      "../engines/HypermillExtendedFunctionIndexEngine.js"
    );
    const m: any = HypermillExtendedFunctionIndexEngine.getManifest();
    expect(m.system_id).toBe("hypermill");
    expect(m.totals.section_count).toBe(7);
    expect(m.totals.operations_count).toBe(45);
    expect(m.totals.parameters_count).toBe(341);
    expect(Object.keys(m.sections)).toHaveLength(7);
  });

  it.each([
    ["2d_operations", 8, 91],
    ["3d_operations", 6, 61],
    ["tool_database", 6, 48],
    ["stock_fixture", 7, 42],
    ["virtual_machining", 6, 34],
    ["automation_center", 6, 33],
    ["post_processor", 6, 32],
  ])("section %s declares %i ops / %i params (matches manifest)", async (key, ops, params) => {
    const { HypermillExtendedFunctionIndexEngine } = await import(
      "../engines/HypermillExtendedFunctionIndexEngine.js"
    );
    const s: any = HypermillExtendedFunctionIndexEngine.getSectionStats(key);
    expect(s.section_key).toBe(key);
    expect(s.operations_count).toBe(ops);
    expect(s.parameters_count).toBe(params);
  });

  it("getAllOperations returns 45 with non-empty category & display_name", async () => {
    const { HypermillExtendedFunctionIndexEngine } = await import(
      "../engines/HypermillExtendedFunctionIndexEngine.js"
    );
    const all = HypermillExtendedFunctionIndexEngine.getAllOperations();
    expect(all).toHaveLength(45);
    for (const op of all) {
      expect(op.category.length).toBeGreaterThan(0);
      expect(op.display_name.length).toBeGreaterThan(0);
      expect(op.parameter_count).toBeGreaterThan(0);
    }
  });

  it("getSectionList is sorted ascending and has 7 entries", async () => {
    const { HypermillExtendedFunctionIndexEngine } = await import(
      "../engines/HypermillExtendedFunctionIndexEngine.js"
    );
    const list = HypermillExtendedFunctionIndexEngine.getSectionList();
    expect(list).toHaveLength(7);
    const sorted = [...list].sort();
    expect(list).toEqual(sorted);
  });

  it("findOperation hits known + misses unknown", async () => {
    const { HypermillExtendedFunctionIndexEngine } = await import(
      "../engines/HypermillExtendedFunctionIndexEngine.js"
    );
    const hit = HypermillExtendedFunctionIndexEngine.findOperation("rough_3d_adaptive");
    expect(hit.found).toBe(true);
    expect(hit.matches[0].section_key).toBe("3d_operations");
    expect(hit.matches[0].category).toBe("roughing");

    const miss = HypermillExtendedFunctionIndexEngine.findOperation("nonexistent_op_xyz");
    expect(miss.found).toBe(false);
    expect(miss.matches).toHaveLength(0);
  });

  it("findParameterAcrossSections finds safe_z_mm in multiple sections, respects limit, returns empty on miss", async () => {
    const { HypermillExtendedFunctionIndexEngine } = await import(
      "../engines/HypermillExtendedFunctionIndexEngine.js"
    );
    const all = HypermillExtendedFunctionIndexEngine.findParameterAcrossSections("safe_z_mm", 200);
    expect(all.length).toBeGreaterThan(5);
    for (const m of all) expect(m.parameter).toContain("safe_z_mm");

    const capped = HypermillExtendedFunctionIndexEngine.findParameterAcrossSections("safe_z_mm", 3);
    expect(capped.length).toBe(3);

    const empty = HypermillExtendedFunctionIndexEngine.findParameterAcrossSections("zzz_definitely_nope", 50);
    expect(empty).toHaveLength(0);
  });

  it("getCategoryUniverse surfaces ≥27 distinct categories spanning all 7 sections", async () => {
    const { HypermillExtendedFunctionIndexEngine } = await import(
      "../engines/HypermillExtendedFunctionIndexEngine.js"
    );
    const cats = HypermillExtendedFunctionIndexEngine.getCategoryUniverse();
    expect(cats.length).toBeGreaterThanOrEqual(27);
    // Sum of operation_count across all categories must equal 45
    const totalOps = cats.reduce((acc, c) => acc + c.operation_count, 0);
    expect(totalOps).toBe(45);
    // Verify a few canonical categories
    const names = cats.map((c) => c.category);
    expect(names).toContain("roughing");
    expect(names).toContain("finishing");
    expect(names).toContain("tool_definition");
    expect(names).toContain("collision_check");
    expect(names).toContain("controller_dialect");
  });

  // recommendForFeature — feature-keyword routing
  it.each([
    ["pocket_2d", "2d_operations", "pocket_contour"],
    ["face_mill_top", "2d_operations", "face_milling"],
    ["3d_zlevel_rough", "3d_operations", "rough_3d_zlevel"],
    ["adaptive_3d_hsc_rough", "3d_operations", "rough_3d_adaptive"],
    ["steep_finish_walls", "3d_operations", "finish_3d_zlevel"],
    ["shallow_finish_offset", "3d_operations", "finish_3d_offset"],
    ["pencil_3d_corner", "3d_operations", "finish_3d_pencil"],
    ["rest_3d_residue", "3d_operations", "rest_3d"],
    ["define_tool_milling", "tool_database", "tool_define_milling"],
    ["zoller_presetter_import", "tool_database", "tool_measure_presetter"],
    ["box_stock_offset", "stock_fixture", "stock_box"],
    ["chuck_fixture_3jaw", "stock_fixture", "fixture_chuck"],
    ["full_collision_machine", "virtual_machining", "vm_collision_full"],
    ["recognize_holes_auto", "automation_center", "ac_recognize_holes"],
  ])("recommendForFeature(%s) → %s.%s", async (feature, section, op) => {
    const { HypermillExtendedFunctionIndexEngine } = await import(
      "../engines/HypermillExtendedFunctionIndexEngine.js"
    );
    const r = HypermillExtendedFunctionIndexEngine.recommendForFeature(feature);
    expect(r.section_key).toBe(section);
    expect(r.operation_id).toBe(op);
    expect(r.reason.length).toBeGreaterThan(10);
  });

  // recommendForFeature — hint fallbacks
  it.each([
    ["nonsense_feature_xyz", "2d", "2d_operations", "pocket_contour"],
    ["nonsense_feature_xyz", "3d", "3d_operations", "rough_3d_adaptive"],
    ["nonsense_feature_xyz", "tool", "tool_database", "tool_define_milling"],
    ["nonsense_feature_xyz", "fixture", "stock_fixture", "stock_box"],
    ["nonsense_feature_xyz", "verify", "virtual_machining", "vm_collision_full"],
    ["nonsense_feature_xyz", "automate", "automation_center", "ac_macro_apply"],
    ["nonsense_feature_xyz", "post", "post_processor", "post_generate_program"],
  ])("recommendForFeature with hint='%s' falls back to %s.%s", async (feature, hint, section, op) => {
    const { HypermillExtendedFunctionIndexEngine } = await import(
      "../engines/HypermillExtendedFunctionIndexEngine.js"
    );
    const r = HypermillExtendedFunctionIndexEngine.recommendForFeature(feature, hint);
    expect(r.section_key).toBe(section);
    expect(r.operation_id).toBe(op);
  });

  it("recommendForFeature returns nulls + descriptive reason when nothing matches", async () => {
    const { HypermillExtendedFunctionIndexEngine } = await import(
      "../engines/HypermillExtendedFunctionIndexEngine.js"
    );
    const r = HypermillExtendedFunctionIndexEngine.recommendForFeature("totally_unmatched_xyz");
    expect(r.section_key).toBeNull();
    expect(r.operation_id).toBeNull();
    expect(r.reason).toMatch(/No routing rule matched/);
  });

  it("validateConsistency reports is_consistent=true with no duplicates / no missing files", async () => {
    const { HypermillExtendedFunctionIndexEngine } = await import(
      "../engines/HypermillExtendedFunctionIndexEngine.js"
    );
    const r = HypermillExtendedFunctionIndexEngine.validateConsistency();
    expect(r.is_consistent).toBe(true);
    expect(r.actual_section_count).toBe(7);
    expect(r.actual_total_operations).toBe(45);
    expect(r.actual_total_parameters).toBe(341);
    expect(r.duplicate_operation_ids).toHaveLength(0);
    expect(r.missing_files).toHaveLength(0);
  });

  it("getSectionStats returns error on unknown section", async () => {
    const { HypermillExtendedFunctionIndexEngine } = await import(
      "../engines/HypermillExtendedFunctionIndexEngine.js"
    );
    const r: any = HypermillExtendedFunctionIndexEngine.getSectionStats("zzz_unknown_section");
    expect(r.error).toMatch(/Unknown section/);
  });

  // Dispatcher round-trip
  it("round-trip: hm_ext_summary returns 7 sections / 45 ops / 341 params", async () => {
    const r: any = await invoke("hm_ext_summary", {});
    const d = r.data ?? r.result ?? r;
    expect(d.totals.section_count).toBe(7);
    expect(d.totals.operations_count).toBe(45);
    expect(d.totals.parameters_count).toBe(341);
    expect(d.section_count).toBe(7);
  });

  it("round-trip: hm_ext_list_sections returns 7 sorted entries", async () => {
    const r: any = await invoke("hm_ext_list_sections", {});
    const d = r.data ?? r.result ?? r;
    expect(d).toHaveLength(7);
    expect(d).toEqual([...d].sort());
  });

  it("round-trip: hm_ext_section_stats(stock_fixture) returns 7 ops / 42 params", async () => {
    const r: any = await invoke("hm_ext_section_stats", { section_key: "stock_fixture" });
    const d = r.data ?? r.result ?? r;
    expect(d.operations_count).toBe(7);
    expect(d.parameters_count).toBe(42);
  });

  it("round-trip: hm_ext_find_op('vm_collision_full') resolves to virtual_machining", async () => {
    const r: any = await invoke("hm_ext_find_op", { operation_id: "vm_collision_full" });
    const d = r.data ?? r.result ?? r;
    expect(d.found).toBe(true);
    expect(d.matches[0].section_key).toBe("virtual_machining");
  });

  it("round-trip: hm_ext_recommend(adaptive_3d_hsc) → 3d_operations.rough_3d_adaptive", async () => {
    const r: any = await invoke("hm_ext_recommend", { feature: "adaptive_3d_hsc_rough" });
    const d = r.data ?? r.result ?? r;
    expect(d.section_key).toBe("3d_operations");
    expect(d.operation_id).toBe("rough_3d_adaptive");
  });

  it("round-trip: hm_ext_consistency reports is_consistent=true", async () => {
    const r: any = await invoke("hm_ext_consistency", {});
    const d = r.data ?? r.result ?? r;
    expect(d.is_consistent).toBe(true);
    expect(d.actual_total_operations).toBe(45);
  });

  it("round-trip: hm_ext_section_stats with invalid enum is rejected by zod", async () => {
    const r: any = await invoke("hm_ext_section_stats", { section_key: "bogus_section" });
    const blob = JSON.stringify(r);
    expect(blob).toMatch(/Invalid params|invalid_enum_value|enum/i);
  });

  it("camDispatcher ACTIONS contains all 10 hm_ext_* action names", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const expected = [
      "hm_ext_index",
      "hm_ext_summary",
      "hm_ext_list_sections",
      "hm_ext_section_stats",
      "hm_ext_list_ops",
      "hm_ext_find_op",
      "hm_ext_find_param",
      "hm_ext_categories",
      "hm_ext_recommend",
      "hm_ext_consistency",
    ];
    for (const a of expected) expect(mod.ACTIONS).toContain(a);
  });

  it("ACTION_HYPERMILL_EXTENDED_FUNCTION_INDEX_SCHEMAS has exactly 10 keys", async () => {
    const { ACTION_HYPERMILL_EXTENDED_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/hypermillExtendedFunctionIndexActionSchemas.js"
    );
    expect(Object.keys(ACTION_HYPERMILL_EXTENDED_FUNCTION_INDEX_SCHEMAS)).toHaveLength(10);
  });

  it("hm_ext_find_param schema enforces non-empty parameter_name and limit ≤ 200", async () => {
    const { ACTION_HYPERMILL_EXTENDED_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/hypermillExtendedFunctionIndexActionSchemas.js"
    );
    const s = ACTION_HYPERMILL_EXTENDED_FUNCTION_INDEX_SCHEMAS.hm_ext_find_param;
    expect(s.safeParse({ parameter_name: "stepover" }).success).toBe(true);
    expect(s.safeParse({ parameter_name: "stepover", limit: 50 }).success).toBe(true);
    expect(s.safeParse({ parameter_name: "" }).success).toBe(false);
    expect(s.safeParse({ parameter_name: "x", limit: 500 }).success).toBe(false);
    expect(s.safeParse({ parameter_name: "x", limit: 0 }).success).toBe(false);
  });
});
