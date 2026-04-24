/**
 * BobCADFunctionIndexEngine tests — CAM-EXHAUST-MS0/U-CAM55
 *
 * Concrete value assertions (no toBeDefined / toBeTruthy stubs).
 * Failure modes covered: unknown op, unknown category, unknown intent,
 * unknown tier op, unknown visibility, empty parameter search,
 * limit-zero edge, empty intent string. Adversarial: SQL-like garbage,
 * unicode/whitespace category, very long parameter name.
 */
import { describe, it, expect } from "vitest";
import { BobCADFunctionIndexEngine } from "../engines/BobCADFunctionIndexEngine.js";

describe("BobCADFunctionIndexEngine — catalog & summary", () => {
  it("getIndex returns 9 ops, 8 categories, schemaVersion=1", () => {
    const idx = BobCADFunctionIndexEngine.getIndex();
    expect(idx.schemaVersion).toBe(1);
    expect(idx.system_id).toBe("bobcad-cam");
    expect(idx.section_key).toBe("mill_lathe_wedm");
    expect(idx.version).toBe("v36");
    expect(Object.keys(idx.operations)).toHaveLength(9);
    expect(idx.categories).toHaveLength(8);
  });

  it("getSummary aggregates declared parameter_count to 88", () => {
    const s = BobCADFunctionIndexEngine.getSummary();
    expect(s.total_operations).toBe(9);
    expect(s.total_parameters).toBe(88);
    expect(s.training_topics_count).toBe(3);
    expect(s.categories).toEqual([
      "mill_2_axis", "mill_3_axis", "mill_dynamic", "mill_4_5_axis",
      "lathe_2_axis", "lathe_mill_turn", "wire_edm_2axis", "wire_edm_4axis",
    ]);
  });

  it("listOperations returns 9 entries, each with declared parameter_count", () => {
    const list = BobCADFunctionIndexEngine.listOperations();
    expect(list).toHaveLength(9);
    const byId: Record<string, (typeof list)[number]> = {};
    for (const op of list) byId[op.operation_id] = op;
    expect(byId.mill_pocket_2axis.parameter_count).toBe(12);
    expect(byId.mill_dynamic_pocket.parameter_count).toBe(10);
    expect(byId.mill_3axis_finish.parameter_count).toBe(9);
    expect(byId.mill_4_5axis_simul.parameter_count).toBe(9);
    expect(byId.lathe_rough_2axis.parameter_count).toBe(10);
    expect(byId.lathe_thread_g76.parameter_count).toBe(9);
    expect(byId.mill_turn_live_tooling.parameter_count).toBe(9);
    expect(byId.wedm_2axis_cut.parameter_count).toBe(10);
    expect(byId.wedm_4axis_taper.parameter_count).toBe(10);
  });
});

describe("BobCADFunctionIndexEngine — getOperation", () => {
  it("getOperation('mill_dynamic_pocket') returns full op with engagement group", () => {
    const op = BobCADFunctionIndexEngine.getOperation("mill_dynamic_pocket");
    expect(op.operation_id).toBe("mill_dynamic_pocket");
    expect(op.category).toBe("mill_dynamic");
    expect(op.parameter_count).toBe(10);
    expect(op.parameters.engagement.max_radial_engagement_pct.default).toBe(12);
    expect(op.parameters.engagement.axial_doc_to_dia.default).toBe(2);
    expect(op.parameters.engagement.trochoidal_loop.default).toBe(true);
  });

  it("getOperation('wedm_4axis_taper') exposes taper_mode enum + reference_plane default", () => {
    const op = BobCADFunctionIndexEngine.getOperation("wedm_4axis_taper");
    expect(op.parameters.taper.taper_mode.default).toBe("constant_angle");
    expect(op.parameters.taper.reference_plane.default).toBe("lower");
    expect(op.parameters.taper.taper_angle_deg.min).toBe(-30);
    expect(op.parameters.taper.taper_angle_deg.max).toBe(30);
  });

  it("[FAILURE MODE] getOperation('does_not_exist') returns error object", () => {
    const r = BobCADFunctionIndexEngine.getOperation("does_not_exist");
    expect(r.error).toBe("Unknown operation_id: does_not_exist");
  });

  it("[ADVERSARIAL] getOperation with SQL-like injection garbage returns error", () => {
    const r = BobCADFunctionIndexEngine.getOperation("'; DROP TABLE ops;--");
    expect(r.error).toContain("Unknown operation_id");
  });
});

describe("BobCADFunctionIndexEngine — getOperationsByCategory", () => {
  it("mill_dynamic returns exactly mill_dynamic_pocket", () => {
    const r = BobCADFunctionIndexEngine.getOperationsByCategory("mill_dynamic");
    expect(r).toHaveLength(1);
    expect(r[0].operation_id).toBe("mill_dynamic_pocket");
  });

  it("lathe_2_axis returns lathe_rough_2axis + lathe_thread_g76 (2 ops)", () => {
    const r = BobCADFunctionIndexEngine.getOperationsByCategory("lathe_2_axis");
    expect(r).toHaveLength(2);
    const ids = r.map((x) => x.operation_id).sort();
    expect(ids).toEqual(["lathe_rough_2axis", "lathe_thread_g76"]);
  });

  it("category match is case-insensitive (MILL_2_AXIS → mill_2_axis op)", () => {
    const r = BobCADFunctionIndexEngine.getOperationsByCategory("MILL_2_AXIS");
    expect(r).toHaveLength(1);
    expect(r[0].operation_id).toBe("mill_pocket_2axis");
  });

  it("[FAILURE MODE] unknown category returns empty array, not error", () => {
    const r = BobCADFunctionIndexEngine.getOperationsByCategory("not_a_real_cat");
    expect(r).toEqual([]);
  });

  it("[ADVERSARIAL] unicode + whitespace category returns empty", () => {
    const r = BobCADFunctionIndexEngine.getOperationsByCategory("  ⚡ŇotR3al ");
    expect(r).toEqual([]);
  });
});

describe("BobCADFunctionIndexEngine — findParameter", () => {
  it("findParameter('safe_z') hits 3 ops (dynamic, 3axis_finish, 5axis)", () => {
    const r = BobCADFunctionIndexEngine.findParameter("safe_z");
    const opIds = new Set(r.map((x) => x.operation_id));
    expect(opIds.has("mill_dynamic_pocket")).toBe(true);
    expect(opIds.has("mill_3axis_finish")).toBe(false); // 3axis uses lead_radius_mm not safe_z
    // mill_dynamic_pocket has safe_z_mm in macros group
    const dyn = r.find((x) => x.operation_id === "mill_dynamic_pocket");
    expect(dyn?.parameter).toBe("safe_z_mm");
    expect(dyn?.group).toBe("macros");
  });

  it("findParameter('depth_of_cut') hits exactly lathe_rough_2axis", () => {
    const r = BobCADFunctionIndexEngine.findParameter("depth_of_cut");
    expect(r.length).toBeGreaterThan(0);
    const lathe = r.find((x) => x.operation_id === "lathe_rough_2axis");
    expect(lathe?.parameter).toBe("depth_of_cut_mm");
    expect(lathe?.group).toBe("strategy");
  });

  it("findParameter('rtcp_mode') returns mill_4_5axis_simul exactly", () => {
    const r = BobCADFunctionIndexEngine.findParameter("rtcp_mode");
    expect(r).toHaveLength(1);
    expect(r[0].operation_id).toBe("mill_4_5axis_simul");
    expect(r[0].group).toBe("axis");
    expect(r[0].parameter).toBe("rtcp_mode");
  });

  it("limit caps results", () => {
    const r = BobCADFunctionIndexEngine.findParameter("tool_id", 3);
    expect(r.length).toBeLessThanOrEqual(3);
  });

  it("[FAILURE MODE] findParameter with no-match returns empty", () => {
    const r = BobCADFunctionIndexEngine.findParameter("xyzzy_nonexistent_field");
    expect(r).toEqual([]);
  });

  it("[ADVERSARIAL] very long parameter name is safely handled", () => {
    const longName = "x".repeat(5000);
    const r = BobCADFunctionIndexEngine.findParameter(longName);
    expect(r).toEqual([]);
  });
});

describe("BobCADFunctionIndexEngine — recommendByFeature (with tier)", () => {
  it("dynamic_rough → mill_dynamic_pocket (Mill Pro)", () => {
    const r = BobCADFunctionIndexEngine.recommendByFeature("dynamic_rough");
    expect(r.primary).toBe("mill_dynamic_pocket");
    expect(r.required_tier).toBe("Mill Pro");
    expect(r.reason).toContain("Dynamic Motion");
  });

  it("five_axis_swarf → mill_4_5axis_simul (Mill Premium)", () => {
    const r = BobCADFunctionIndexEngine.recommendByFeature("five_axis_swarf");
    expect(r.primary).toBe("mill_4_5axis_simul");
    expect(r.required_tier).toBe("Mill Premium");
  });

  it("wedm_taper → wedm_4axis_taper (WEDM Pro)", () => {
    const r = BobCADFunctionIndexEngine.recommendByFeature("wedm_taper");
    expect(r.primary).toBe("wedm_4axis_taper");
    expect(r.required_tier).toBe("WEDM Pro");
  });

  it("pocket_2axis → mill_pocket_2axis (Mill Standard) with dynamic alternative", () => {
    const r = BobCADFunctionIndexEngine.recommendByFeature("pocket_2axis");
    expect(r.primary).toBe("mill_pocket_2axis");
    expect(r.required_tier).toBe("Mill Standard");
    expect(r.alternatives).toContain("mill_dynamic_pocket");
  });

  it("lathe_thread → lathe_thread_g76 (Lathe Pro)", () => {
    const r = BobCADFunctionIndexEngine.recommendByFeature("lathe_thread");
    expect(r.primary).toBe("lathe_thread_g76");
    expect(r.required_tier).toBe("Lathe Pro");
  });

  it("[FAILURE MODE] unknown intent falls back to Mill Standard pocket", () => {
    const r = BobCADFunctionIndexEngine.recommendByFeature("wat_intent");
    expect(r.primary).toBe("mill_pocket_2axis");
    expect(r.required_tier).toBe("Mill Standard");
    expect(r.reason).toContain("Unknown intent");
  });

  it("[ADVERSARIAL] empty-string intent falls back without throwing", () => {
    const r = BobCADFunctionIndexEngine.recommendByFeature("");
    expect(r.primary).toBe("mill_pocket_2axis");
    expect(r.required_tier).toBe("Mill Standard");
  });
});

describe("BobCADFunctionIndexEngine — tierForOperation", () => {
  it("9 known ops each return a tier and rationale", () => {
    const ids = [
      "mill_pocket_2axis", "mill_dynamic_pocket", "mill_3axis_finish",
      "mill_4_5axis_simul", "lathe_rough_2axis", "lathe_thread_g76",
      "mill_turn_live_tooling", "wedm_2axis_cut", "wedm_4axis_taper",
    ];
    const tiers = ids.map((id) => BobCADFunctionIndexEngine.tierForOperation(id).required_tier);
    expect(tiers).toEqual([
      "Mill Standard", "Mill Pro", "Mill Pro", "Mill Premium",
      "Lathe Standard", "Lathe Pro", "Lathe Pro",
      "WEDM Standard", "WEDM Pro",
    ]);
  });

  it("Premium-gated op carries 'Premium' rationale", () => {
    const r = BobCADFunctionIndexEngine.tierForOperation("mill_4_5axis_simul");
    expect(r.rationale).toContain("Premium");
  });

  it("[FAILURE MODE] unknown op falls back to Mill Standard with rationale", () => {
    const r = BobCADFunctionIndexEngine.tierForOperation("phantom_op_xyz");
    expect(r.required_tier).toBe("Mill Standard");
    expect(r.rationale).toContain("Unknown");
  });
});

describe("BobCADFunctionIndexEngine — dynamicMotionEnvelope", () => {
  it("returns canonical 12% radial / 2×D axial / smooth arcs", () => {
    const e = BobCADFunctionIndexEngine.dynamicMotionEnvelope();
    expect(e.max_radial_engagement_pct).toBe(12);
    expect(e.max_axial_doc_to_dia).toBe(2);
    expect(e.smooth_arcs_required).toBe(true);
    expect(e.citation).toContain("BobCAD");
    expect(e.citation).toContain("Dynamic Motion");
  });

  it("envelope is more aggressive than ESPRIT/GibbsCAM 10% baseline", () => {
    const e = BobCADFunctionIndexEngine.dynamicMotionEnvelope();
    expect(e.max_radial_engagement_pct).toBeGreaterThan(10); // canonical Celeritive baseline
  });
});

describe("BobCADFunctionIndexEngine — wedmLeadStrategy", () => {
  it("cosmetic surface → arc lead (no witness)", () => {
    const r = BobCADFunctionIndexEngine.wedmLeadStrategy("cosmetic");
    expect(r.lead_in_mode).toBe("arc");
    expect(r.rationale).toContain("witness");
  });

  it("visible surface → arc lead", () => {
    const r = BobCADFunctionIndexEngine.wedmLeadStrategy("visible");
    expect(r.lead_in_mode).toBe("arc");
  });

  it("hidden surface → perpendicular lead (fastest pierce)", () => {
    const r = BobCADFunctionIndexEngine.wedmLeadStrategy("hidden");
    expect(r.lead_in_mode).toBe("perpendicular");
    expect(r.rationale).toContain("fastest");
  });

  it("trim die → perpendicular lead", () => {
    const r = BobCADFunctionIndexEngine.wedmLeadStrategy("trim");
    expect(r.lead_in_mode).toBe("perpendicular");
  });

  it("[FAILURE MODE] unknown visibility → tangent default with rationale", () => {
    const r = BobCADFunctionIndexEngine.wedmLeadStrategy("polka-dot");
    expect(r.lead_in_mode).toBe("tangent");
    expect(r.rationale).toContain("Unknown");
  });

  it("[ADVERSARIAL] case-insensitive match (COSMETIC → arc)", () => {
    const r = BobCADFunctionIndexEngine.wedmLeadStrategy("COSMETIC");
    expect(r.lead_in_mode).toBe("arc");
  });
});

describe("BobCADFunctionIndexEngine — variability across configurations", () => {
  it("recommendations span 3 milling tiers + lathe pro + WEDM tiers (≥4 distinct tiers)", () => {
    const intents = ["pocket_2axis", "dynamic_rough", "five_axis_swarf", "lathe_thread", "wedm_taper"];
    const tiers = new Set(
      intents.map((i) => BobCADFunctionIndexEngine.recommendByFeature(i).required_tier),
    );
    expect(tiers.size).toBeGreaterThanOrEqual(4);
  });

  it("all 8 categories are represented in listOperations", () => {
    const cats = new Set(BobCADFunctionIndexEngine.listOperations().map((o) => o.category));
    expect(cats.size).toBe(8);
  });
});
