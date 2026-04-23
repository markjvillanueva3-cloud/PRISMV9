/**
 * SolidCAMFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM38 (unified assembly)
 *
 * Coverage:
 *   - manifest invariants: 6 sections, 66 ops, 1383 params
 *   - per-section stats lookup
 *   - getAllOperations: flat list with section attribution
 *   - findOperation: cross-section lookup
 *   - findParameterAcrossSections: parameter search across all 6 sections
 *   - recommendForFeature: routes intents to (section, op)
 *   - getCategoryUniverse: dedup categories across sections
 *   - validateConsistency: declared totals match actual + no dup operation_ids
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

describe("SolidCAMFunctionIndexEngine — unified index + dispatcher", () => {
  it("engine module exports class with required methods", async () => {
    const mod: any = await import("../engines/SolidCAMFunctionIndexEngine.js");
    const E = mod.SolidCAMFunctionIndexEngine;
    expect(E).toBeTruthy();
    expect(typeof E.getManifest).toBe("function");
    expect(typeof E.getAllOperations).toBe("function");
    expect(typeof E.findOperation).toBe("function");
    expect(typeof E.findParameterAcrossSections).toBe("function");
    expect(typeof E.recommendForFeature).toBe("function");
    expect(typeof E.validateConsistency).toBe("function");
    expect(typeof E.getCategoryUniverse).toBe("function");
  });

  // ── Manifest ──────────────────────────────────────────────────────────
  it("getManifest returns 6 sections with expected_totals 66/1383", async () => {
    const { SolidCAMFunctionIndexEngine } = await import(
      "../engines/SolidCAMFunctionIndexEngine.js"
    );
    const m = SolidCAMFunctionIndexEngine.getManifest();
    expect(m.system_id).toBe("solidcam");
    expect(Object.keys(m.sections)).toHaveLength(6);
    expect(m.expected_totals.sections).toBe(6);
    expect(m.expected_totals.operations).toBe(66);
    expect(m.expected_totals.parameters).toBe(1383);
  });

  it("getSectionList returns sorted 6 keys spanning all SolidCAM modules", async () => {
    const { SolidCAMFunctionIndexEngine } = await import(
      "../engines/SolidCAMFunctionIndexEngine.js"
    );
    const sections = SolidCAMFunctionIndexEngine.getSectionList();
    expect(sections).toHaveLength(6);
    expect(sections).toEqual(
      expect.arrayContaining([
        "2.5d_operations",
        "3d-hss-hsr",
        "5-axis",
        "imachining",
        "millturn",
        "turning",
      ]),
    );
  });

  // ── Per-section stats spanning ≥3 sections (variability) ──────────────
  it.each([
    ["turning", 13, 232],
    ["millturn", 12, 188],
    ["5-axis", 12, 300],
    ["3d-hss-hsr", 13, 325],
    ["2.5d_operations", 12, 209],
    ["imachining", 4, 129],
  ])("getSectionStats(%s) → %i ops / %i params", async (key, ops, params) => {
    const { SolidCAMFunctionIndexEngine } = await import(
      "../engines/SolidCAMFunctionIndexEngine.js"
    );
    const s: any = SolidCAMFunctionIndexEngine.getSectionStats(key);
    expect("error" in s).toBe(false);
    expect(s.operation_count).toBe(ops);
    expect(s.parameter_count).toBe(params);
  });

  it("getSectionStats returns error for unknown section (failure mode)", async () => {
    const { SolidCAMFunctionIndexEngine } = await import(
      "../engines/SolidCAMFunctionIndexEngine.js"
    );
    const s: any = SolidCAMFunctionIndexEngine.getSectionStats("nonexistent_section");
    expect("error" in s).toBe(true);
  });

  // ── getAllOperations ──────────────────────────────────────────────────
  it("getAllOperations returns 66 operations across 6 sections", async () => {
    const { SolidCAMFunctionIndexEngine } = await import(
      "../engines/SolidCAMFunctionIndexEngine.js"
    );
    const ops = SolidCAMFunctionIndexEngine.getAllOperations();
    expect(ops).toHaveLength(66);
    const sections = new Set(ops.map((o) => o.section_key));
    expect(sections.size).toBe(6);
    // Sum of parameters across all ops should equal 1383
    const totalParams = ops.reduce((a, o) => a + o.parameter_count, 0);
    expect(totalParams).toBe(1383);
  });

  it("getAllOperations entries carry valid section attribution", async () => {
    const { SolidCAMFunctionIndexEngine } = await import(
      "../engines/SolidCAMFunctionIndexEngine.js"
    );
    const ops = SolidCAMFunctionIndexEngine.getAllOperations();
    const validSections = new Set([
      "2.5d_operations",
      "3d-hss-hsr",
      "5-axis",
      "imachining",
      "millturn",
      "turning",
    ]);
    ops.forEach((o) => {
      expect(validSections.has(o.section_key)).toBe(true);
      expect(o.parameter_count).toBeGreaterThan(0);
      expect(o.operation_id.length).toBeGreaterThan(0);
    });
  });

  // ── findOperation ─────────────────────────────────────────────────────
  it.each([
    ["turn_thread_external", "turning"],
    ["mt_balanced_turning", "millturn"],
    ["5x_multiblade", "5-axis"],
  ])("findOperation(%s) finds it in %s", async (op_id, expectedSection) => {
    const { SolidCAMFunctionIndexEngine } = await import(
      "../engines/SolidCAMFunctionIndexEngine.js"
    );
    const r = SolidCAMFunctionIndexEngine.findOperation(op_id);
    expect(r.found).toBe(true);
    expect(r.matches.length).toBeGreaterThanOrEqual(1);
    expect(r.matches[0].section_key).toBe(expectedSection);
    expect(r.matches[0].operation_id).toBe(op_id);
  });

  it("findOperation returns found=false for unknown id", async () => {
    const { SolidCAMFunctionIndexEngine } = await import(
      "../engines/SolidCAMFunctionIndexEngine.js"
    );
    const r = SolidCAMFunctionIndexEngine.findOperation("zz_nonexistent_op");
    expect(r.found).toBe(false);
    expect(r.matches).toHaveLength(0);
  });

  it("findOperation handles empty/edge string (boundary)", async () => {
    const { SolidCAMFunctionIndexEngine } = await import(
      "../engines/SolidCAMFunctionIndexEngine.js"
    );
    const r = SolidCAMFunctionIndexEngine.findOperation("");
    expect(r.found).toBe(false);
  });

  // ── findParameterAcrossSections ───────────────────────────────────────
  it("findParameterAcrossSections finds 'feed_per_rev_mm' across multiple sections", async () => {
    const { SolidCAMFunctionIndexEngine } = await import(
      "../engines/SolidCAMFunctionIndexEngine.js"
    );
    const matches = SolidCAMFunctionIndexEngine.findParameterAcrossSections("feed_per_rev_mm", 500);
    expect(matches.length).toBeGreaterThanOrEqual(5);
    const sections = new Set(matches.map((m) => m.section_key));
    // turning ops use feed_per_rev_mm broadly
    expect(sections.has("turning")).toBe(true);
  });

  it("findParameterAcrossSections respects limit (boundary)", async () => {
    const { SolidCAMFunctionIndexEngine } = await import(
      "../engines/SolidCAMFunctionIndexEngine.js"
    );
    const capped = SolidCAMFunctionIndexEngine.findParameterAcrossSections("tool_id", 5);
    expect(capped).toHaveLength(5);
  });

  it("findParameterAcrossSections returns [] for unmatched param", async () => {
    const { SolidCAMFunctionIndexEngine } = await import(
      "../engines/SolidCAMFunctionIndexEngine.js"
    );
    const empty = SolidCAMFunctionIndexEngine.findParameterAcrossSections("zz_no_such_param_xx");
    expect(empty).toHaveLength(0);
  });

  // ── getCategoryUniverse ───────────────────────────────────────────────
  it("getCategoryUniverse returns deduplicated categories across sections", async () => {
    const { SolidCAMFunctionIndexEngine } = await import(
      "../engines/SolidCAMFunctionIndexEngine.js"
    );
    const cats = SolidCAMFunctionIndexEngine.getCategoryUniverse();
    expect(cats.length).toBeGreaterThanOrEqual(10);
    cats.forEach((c) => {
      expect(c.category.length).toBeGreaterThan(0);
      expect(c.sections.length).toBeGreaterThanOrEqual(1);
      expect(c.operation_count).toBeGreaterThanOrEqual(1);
    });
    // Sum of operation_count over all categories should equal 66 (every op has one category)
    const total = cats.reduce((a, c) => a + c.operation_count, 0);
    expect(total).toBe(66);
  });

  it("getCategoryUniverse: 'specialty' appears in multiple sections", async () => {
    const { SolidCAMFunctionIndexEngine } = await import(
      "../engines/SolidCAMFunctionIndexEngine.js"
    );
    const cats = SolidCAMFunctionIndexEngine.getCategoryUniverse();
    const specialty = cats.find((c) => c.category === "specialty");
    expect(specialty).toBeTruthy();
    // turning + millturn + 5-axis all have a 'specialty' category
    expect(specialty!.sections.length).toBeGreaterThanOrEqual(2);
  });

  // ── recommendForFeature: routing rules ────────────────────────────────
  it.each([
    ["od_thread", "turning", "turn_thread_external"],
    ["id_thread", "turning", "turn_thread_internal"],
    ["part_off", "turning", "turn_part_off"],
    ["sub_spindle pickup", "millturn", "mt_sub_spindle_pickup"],
    ["balanced_turning shafts", "millturn", "mt_balanced_turning"],
    ["swiss long part", "millturn", "mt_swiss_type_turning"],
    ["impeller blade", "5-axis", "5x_multiblade"],
    ["intake_port", "5-axis", "5x_port"],
    ["undercut relief", "5-axis", "5x_undercut"],
    ["3+2 indexed face", "5-axis", "5x_indexed_3plus2"],
  ])("recommendForFeature('%s') → (%s, %s)", async (feature, sec, op) => {
    const { SolidCAMFunctionIndexEngine } = await import(
      "../engines/SolidCAMFunctionIndexEngine.js"
    );
    const r = SolidCAMFunctionIndexEngine.recommendForFeature(feature);
    expect(r.section_key).toBe(sec);
    expect(r.operation_id).toBe(op);
    expect(r.reason.length).toBeGreaterThan(5);
  });

  it("recommendForFeature with hint='imachining' routes to imachining section", async () => {
    const { SolidCAMFunctionIndexEngine } = await import(
      "../engines/SolidCAMFunctionIndexEngine.js"
    );
    const r = SolidCAMFunctionIndexEngine.recommendForFeature("pocket_rough", "imachining");
    expect(r.section_key).toBe("imachining");
    expect(r.operation_id).toBe("imachining_2d");
  });

  it("recommendForFeature returns nulls + reason for unmatched feature (failure mode)", async () => {
    const { SolidCAMFunctionIndexEngine } = await import(
      "../engines/SolidCAMFunctionIndexEngine.js"
    );
    const r = SolidCAMFunctionIndexEngine.recommendForFeature("xyzzy_unknown_feature");
    expect(r.section_key).toBeNull();
    expect(r.operation_id).toBeNull();
    expect(r.reason).toMatch(/no routing rule|inspect/i);
  });

  // ── validateConsistency ───────────────────────────────────────────────
  it("validateConsistency: manifest matches actual sums + no duplicates", async () => {
    const { SolidCAMFunctionIndexEngine } = await import(
      "../engines/SolidCAMFunctionIndexEngine.js"
    );
    const r = SolidCAMFunctionIndexEngine.validateConsistency();
    expect(r.is_consistent).toBe(true);
    expect(r.actual_section_count).toBe(6);
    expect(r.actual_total_operations).toBe(66);
    expect(r.actual_total_parameters).toBe(1383);
    expect(r.manifest_section_count).toBe(r.actual_section_count);
    expect(r.manifest_total_operations).toBe(r.actual_total_operations);
    expect(r.manifest_total_parameters).toBe(r.actual_total_parameters);
    expect(r.duplicate_operation_ids).toHaveLength(0);
    expect(r.missing_files).toHaveLength(0);
  });

  // ── Dispatcher round-trip ─────────────────────────────────────────────
  it("round-trip: solidcam_index_manifest", async () => {
    const r: any = await invoke("solidcam_index_manifest", {});
    const d = r.data ?? r.result ?? r;
    expect(d.expected_totals.operations).toBe(66);
    expect(d.expected_totals.parameters).toBe(1383);
  });

  it("round-trip: solidcam_index_sections returns 6 keys", async () => {
    const r: any = await invoke("solidcam_index_sections", {});
    const d = r.data ?? r.result ?? r;
    expect(Array.isArray(d)).toBe(true);
    expect(d).toHaveLength(6);
  });

  it("round-trip: solidcam_index_section_stats(turning)", async () => {
    const r: any = await invoke("solidcam_index_section_stats", { section_key: "turning" });
    const d = r.data ?? r.result ?? r;
    expect(d.operation_count).toBe(13);
    expect(d.parameter_count).toBe(232);
  });

  it("round-trip: solidcam_index_all_ops returns 66", async () => {
    const r: any = await invoke("solidcam_index_all_ops", {});
    const d = r.data ?? r.result ?? r;
    expect(Array.isArray(d)).toBe(true);
    expect(d).toHaveLength(66);
  });

  it("round-trip: solidcam_index_find_op('5x_multiblade') routes to 5-axis", async () => {
    const r: any = await invoke("solidcam_index_find_op", { operation_id: "5x_multiblade" });
    const d = r.data ?? r.result ?? r;
    expect(d.found).toBe(true);
    expect(d.matches[0].section_key).toBe("5-axis");
  });

  it("round-trip: solidcam_index_find_param('css_m_per_min')", async () => {
    const r: any = await invoke("solidcam_index_find_param", { parameter_name: "css_m_per_min", limit: 50 });
    const d = r.data ?? r.result ?? r;
    expect(Array.isArray(d)).toBe(true);
    expect(d.length).toBeGreaterThanOrEqual(5);
  });

  it("round-trip: solidcam_index_categories returns category list summing to 66 ops", async () => {
    const r: any = await invoke("solidcam_index_categories", {});
    const d = r.data ?? r.result ?? r;
    expect(Array.isArray(d)).toBe(true);
    const sum = d.reduce((a: number, c: any) => a + c.operation_count, 0);
    expect(sum).toBe(66);
  });

  it("round-trip: solidcam_index_recommend('od_thread') → turning/turn_thread_external", async () => {
    const r: any = await invoke("solidcam_index_recommend", { feature: "od_thread" });
    const d = r.data ?? r.result ?? r;
    expect(d.section_key).toBe("turning");
    expect(d.operation_id).toBe("turn_thread_external");
  });

  it("round-trip: solidcam_index_validate is_consistent=true", async () => {
    const r: any = await invoke("solidcam_index_validate", {});
    const d = r.data ?? r.result ?? r;
    expect(d.is_consistent).toBe(true);
    expect(d.actual_total_operations).toBe(66);
    expect(d.actual_total_parameters).toBe(1383);
    // slimResponse may strip empty arrays — accept either missing or empty
    expect(d.duplicate_operation_ids ?? []).toHaveLength(0);
  });

  it("round-trip: solidcam_index_section_stats with empty section_key fails validation", async () => {
    const r: any = await invoke("solidcam_index_section_stats", {});
    const blob = JSON.stringify(r);
    expect(blob).toMatch(/Invalid params|section_key|required/i);
  });

  // ── Schema integration ────────────────────────────────────────────────
  it("camDispatcher ACTIONS includes all 9 unified-index actions", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const expected = [
      "solidcam_index_manifest",
      "solidcam_index_sections",
      "solidcam_index_section_stats",
      "solidcam_index_all_ops",
      "solidcam_index_find_op",
      "solidcam_index_find_param",
      "solidcam_index_categories",
      "solidcam_index_recommend",
      "solidcam_index_validate",
    ];
    for (const a of expected) expect(mod.ACTIONS).toContain(a);
  });

  it("ACTION_SOLIDCAM_FUNCTION_INDEX_SCHEMAS has 9 keys", async () => {
    const { ACTION_SOLIDCAM_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/solidcamFunctionIndexActionSchemas.js"
    );
    expect(Object.keys(ACTION_SOLIDCAM_FUNCTION_INDEX_SCHEMAS)).toHaveLength(9);
  });

  it("solidcam_index_recommend schema: feature required, hint optional", async () => {
    const { ACTION_SOLIDCAM_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/solidcamFunctionIndexActionSchemas.js"
    );
    const s = ACTION_SOLIDCAM_FUNCTION_INDEX_SCHEMAS.solidcam_index_recommend;
    expect(s.safeParse({ feature: "od_thread" }).success).toBe(true);
    expect(s.safeParse({ feature: "od_thread", hint: "any" }).success).toBe(true);
    expect(s.safeParse({}).success).toBe(false);
    expect(s.safeParse({ feature: "" }).success).toBe(false);
  });
});
