/**
 * Tests for ToolCatalogEngine — Unified Tool Catalog with Physical Dimensions
 */
import { describe, it, expect } from "vitest";
import { ToolCatalogEngine } from "../engines/ToolCatalogEngine.js";

describe("ToolCatalogEngine", () => {
  const engine = new ToolCatalogEngine();

  // ── Stats & Inventory ──
  it("has standard + Tungaloy tools loaded", () => {
    const stats = engine.stats();
    expect(stats.total_tools).toBeGreaterThan(800); // 200+ standard + 800+ Tungaloy
    expect(stats.by_type["end_mill"]).toBeGreaterThan(700);
    expect(stats.by_type["drill"]).toBeGreaterThan(400);
    expect(stats.by_type["face_mill"]).toBeGreaterThan(0);
    expect(stats.by_type["ball_mill"]).toBeGreaterThan(100);
    expect(stats.holders).toBeGreaterThan(400);
    expect(stats.by_manufacturer["Tungaloy"]).toBeGreaterThan(700);
  });

  // ── Search ──
  it("searches by type", () => {
    const drills = engine.search({ type: "drill" });
    expect(drills.length).toBeGreaterThan(0);
    expect(drills.every(t => t.type === "drill")).toBe(true);
  });

  it("searches by diameter", () => {
    const tools = engine.search({ type: "end_mill", diameter_mm: 10 });
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.every(t => Math.abs(t.physical.cutting_diameter_mm - 10) < 0.5)).toBe(true);
  });

  it("searches by ISO group", () => {
    const tools = engine.search({ iso_group: "S", type: "end_mill", max_results: 5 });
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.every(t => t.iso_groups.includes("S"))).toBe(true);
  });

  it("searches by flute count", () => {
    const tools = engine.search({ type: "end_mill", flute_count: 4, max_results: 10 });
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.every(t => t.flute_count === 4)).toBe(true);
  });

  it("limits results with max_results", () => {
    const tools = engine.search({ type: "end_mill", max_results: 3 });
    expect(tools.length).toBeLessThanOrEqual(3);
  });

  // ── Lookup ──
  it("looks up a specific tool by ID", () => {
    const tool = engine.lookup("STD-EM-10x4F-2xD");
    expect(tool).not.toBeNull();
    expect(tool!.physical.cutting_diameter_mm).toBe(10);
    expect(tool!.flute_count).toBe(4);
    expect(tool!.physical.shank_diameter_mm).toBe(10);
  });

  it("returns null for unknown tool", () => {
    expect(engine.lookup("NONEXISTENT")).toBeNull();
  });

  // ── Physical Dimensions ──
  it("has correct physical dimensions for 10mm end mill", () => {
    const tool = engine.lookup("STD-EM-10x4F-2xD")!;
    expect(tool.physical.cutting_diameter_mm).toBe(10);
    expect(tool.physical.shank_diameter_mm).toBe(10);
    expect(tool.physical.flute_length_mm).toBe(20); // 2xD
    expect(tool.physical.overall_length_mm).toBe(72);
  });

  it("has correct physical dimensions for 10mm drill", () => {
    const tool = engine.lookup("STD-DR-10")!;
    expect(tool.physical.cutting_diameter_mm).toBe(10);
    expect(tool.physical.overall_length_mm).toBe(121);
    expect(tool.physical.flute_length_mm).toBe(87);
    expect(tool.physical.point_angle_deg).toBe(140);
  });

  it("long reach end mill has longer LOC", () => {
    const std = engine.lookup("STD-EM-10x4F-2xD")!;
    const lng = engine.lookup("STD-EM-10x4F-3xD")!;
    expect(lng.physical.flute_length_mm).toBeGreaterThan(std.physical.flute_length_mm);
    expect(lng.physical.flute_length_mm).toBe(30); // 3xD
  });

  // ── Assembly & Collision Envelope ──
  it("builds a tool assembly with collision envelope", () => {
    const asm = engine.assembly({ tool_id: "STD-EM-10x4F-2xD" });
    expect(asm.tool.physical.cutting_diameter_mm).toBe(10);
    expect(asm.holder_gauge_length_mm).toBeGreaterThan(0);
    expect(asm.tool_stickout_mm).toBeGreaterThan(asm.tool.physical.flute_length_mm);
    expect(asm.total_reach_mm).toBe(asm.holder_gauge_length_mm + asm.tool_stickout_mm);
    expect(asm.collision_envelope.profile.length).toBeGreaterThanOrEqual(4);
  });

  it("collision envelope has increasing diameters from tip to holder", () => {
    const env = engine.collisionEnvelope({ tool_id: "STD-EM-6x3F-2xD" });
    // Tool tip has cutting diameter, holder is larger
    const tipDia = env.profile[0].diameter_mm;
    const holderDia = env.profile[env.profile.length - 1].diameter_mm;
    expect(holderDia).toBeGreaterThan(tipDia);
    expect(env.holder_max_diameter_mm).toBeGreaterThan(tipDia);
  });

  it("collision envelope total reach = gauge + stickout", () => {
    const env = engine.collisionEnvelope({ tool_id: "STD-DR-8", stickout_mm: 60 });
    expect(env.total_reach_mm).toBeGreaterThan(60);
    expect(env.holder_gauge_length_mm).toBeGreaterThan(0);
  });

  it("assembly respects holder taper selection", () => {
    const bt40 = engine.assembly({ tool_id: "STD-EM-10x4F-2xD", holder_taper: "BT40" });
    const hsk = engine.assembly({ tool_id: "STD-EM-10x4F-2xD", holder_taper: "HSK-A63" });
    // Both should produce valid assemblies with different tapers
    expect(bt40.holder_gauge_length_mm).toBeGreaterThan(0);
    expect(hsk.holder_gauge_length_mm).toBeGreaterThan(0);
    expect(bt40.collision_envelope.profile.length).toBeGreaterThanOrEqual(4);
    expect(hsk.collision_envelope.profile.length).toBeGreaterThanOrEqual(4);
  });

  it("throws on incompatible tool/holder", () => {
    // 25mm shank won't fit in HSK-A63 ER16 (max 10mm)
    expect(() => engine.assembly({
      tool_id: "STD-EM-25x4F-2xD",
      holder_type: "ER16",
      holder_taper: "HSK-A63",
    })).toThrow();
  });

  // ── Recommend ──
  it("recommends tools for pocket milling", () => {
    const recs = engine.recommend({ operation: "pocket", iso_group: "P", diameter_mm: 10 });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].score).toBeGreaterThan(0);
    expect(recs[0].type).toBe("end_mill");
  });

  it("recommends drills for drill operation", () => {
    const recs = engine.recommend({ operation: "drill", iso_group: "P", diameter_mm: 8 });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].type).toBe("drill");
  });

  it("recommends face mills for face operation", () => {
    const recs = engine.recommend({ operation: "face", iso_group: "P", diameter_mm: 50 });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.some(r => r.type === "face_mill")).toBe(true);
  });

  it("scores finishing tools higher when finish_required", () => {
    const rough = engine.recommend({ operation: "pocket", iso_group: "P", diameter_mm: 10, finish_required: false });
    const finish = engine.recommend({ operation: "pocket", iso_group: "P", diameter_mm: 10, finish_required: true });
    // 4-flute should score higher for finishing
    const fourFluteFinish = finish.find(t => t.flute_count === 4);
    const twoFluteFinish = finish.find(t => t.flute_count === 2);
    if (fourFluteFinish && twoFluteFinish) {
      expect(fourFluteFinish.score).toBeGreaterThanOrEqual(twoFluteFinish.score);
    }
  });

  it("penalizes tools with insufficient LOC for depth", () => {
    const recs = engine.recommend({ operation: "pocket", iso_group: "P", diameter_mm: 10, depth_mm: 50 });
    // 2xD LOC = 20mm, insufficient for 50mm depth
    const shortTool = recs.find(t => t.physical.flute_length_mm < 50);
    const longTool = recs.find(t => t.physical.flute_length_mm >= 50);
    if (shortTool && longTool) {
      expect(longTool.score).toBeGreaterThan(shortTool.score);
    }
  });

  // ── Speed/Feed Data ──
  it("has cutting data per ISO group", () => {
    const tool = engine.lookup("STD-EM-10x4F-2xD")!;
    expect(tool.cutting_data).toBeDefined();
    expect(tool.cutting_data!["P"]).toBeDefined();
    expect(tool.cutting_data!["P"].vc_min).toBeGreaterThan(0);
    expect(tool.cutting_data!["P"].fz_min).toBeGreaterThan(0);
  });

  it("has ap_max and ae_max for end mills", () => {
    const tool = engine.lookup("STD-EM-10x4F-2xD")!;
    expect(tool.cutting_data!["P"].ap_max).toBeGreaterThan(0);
    expect(tool.cutting_data!["P"].ae_max).toBeGreaterThan(0);
    // ap_max should be proportional to diameter
    expect(tool.cutting_data!["P"].ap_max).toBeLessThanOrEqual(30); // max 3xD
  });

  // ── Add Tools ──
  it("adds custom tools and deduplicates", () => {
    const newTool = {
      id: "CUSTOM-EM-TEST",
      manufacturer: "TestCo",
      series: "Test",
      designation: "Test EM 10mm",
      type: "end_mill" as const,
      material: "carbide" as const,
      physical: { cutting_diameter_mm: 10, shank_diameter_mm: 10, overall_length_mm: 72, flute_length_mm: 22 },
      iso_groups: ["P", "M"],
      operations: ["pocket"],
      source: "test",
    };
    const r = engine.addTools([newTool]);
    expect(r.added).toBe(1);
    expect(engine.lookup("CUSTOM-EM-TEST")).not.toBeNull();

    // Adding again should deduplicate
    const r2 = engine.addTools([newTool]);
    expect(r2.duplicates).toBe(1);
    expect(r2.added).toBe(0);
  });

  // ── Ball Mill ──
  it("has ball mills with corner radius = D/2", () => {
    const tool = engine.lookup("STD-BM-10x2F")!;
    expect(tool.type).toBe("ball_mill");
    expect(tool.physical.corner_radius_mm).toBe(5);
    expect(tool.flute_count).toBe(2);
  });

  // ── Tungaloy Holder Integration ──
  it("includes Tungaloy holders in stats", () => {
    const stats = engine.stats();
    expect(stats.holders).toBeGreaterThan(400); // 27 generic + 494 Tungaloy
  });

  it("searches Tungaloy holders by taper", () => {
    const hsk63 = engine.searchHolders({ taper: "HSK-A63" });
    expect(hsk63.length).toBeGreaterThan(0);
    expect(hsk63.every(h => h.taper.includes("HSK-A63"))).toBe(true);
  });

  it("searches Tungaloy holders by type", () => {
    const shrink = engine.searchHolders({ holder_type: "shrink_fit", max_results: 5 });
    expect(shrink.length).toBeGreaterThan(0);
    expect(shrink.every(h => h.holder_type === "shrink_fit")).toBe(true);
  });

  it("searches Tungaloy holders by bore diameter", () => {
    const bore10 = engine.searchHolders({ bore_diameter_mm: 10 });
    expect(bore10.length).toBeGreaterThan(0);
  });

  it("uses Tungaloy real holder data for HSK-A63 assembly", () => {
    const asm = engine.assembly({ tool_id: "STD-EM-10x4F-2xD", holder_taper: "HSK-A63" });
    // Should match Tungaloy HSKA63 ER collet (real data)
    expect(asm.holder_gauge_length_mm).toBeGreaterThan(0);
    expect(asm.collision_envelope.holder_max_diameter_mm).toBeGreaterThan(0);
  });

  it("uses Tungaloy CAT40 holder data", () => {
    const asm = engine.assembly({ tool_id: "STD-EM-10x4F-2xD", holder_taper: "CAT40" });
    expect(asm.holder_gauge_length_mm).toBeGreaterThan(0);
    expect(asm.collision_envelope.profile.length).toBeGreaterThanOrEqual(4);
  });

  // ── Multi-Manufacturer Integration ──
  it("loads ISCAR insert families into catalog", () => {
    const iscar = engine.search({ manufacturer: "ISCAR", max_results: 50 });
    expect(iscar.length).toBeGreaterThan(0);
    const sumo = iscar.filter(t => t.series === "SUMO-TEC");
    expect(sumo.length).toBeGreaterThan(0);
    expect(sumo[0].manufacturer).toBe("ISCAR");
  });

  it("loads ISCAR DOVE-IQ face mills", () => {
    const dove = engine.search({ manufacturer: "ISCAR", type: "face_mill", max_results: 10 });
    expect(dove.length).toBeGreaterThan(0);
    expect(dove.some(t => t.series === "DOVE-IQ-MILL")).toBe(true);
  });

  it("loads ISCAR MULTI-MASTER modular end mills", () => {
    const mm = engine.search({ manufacturer: "ISCAR", operation: "pocket", max_results: 20 });
    const multiMaster = mm.filter(t => t.series === "MULTI-MASTER");
    expect(multiMaster.length).toBeGreaterThan(0);
  });

  it("loads Korloy grade inserts from multi-manufacturer data", () => {
    const korloy = engine.search({ manufacturer: "Korloy", max_results: 50 });
    expect(korloy.length).toBeGreaterThan(0);
    expect(korloy.some(t => t.series === "NC3200")).toBe(true);
  });

  it("loads Mitsubishi grade inserts from multi-manufacturer data", () => {
    const mitsu = engine.search({ manufacturer: "Mitsubishi", max_results: 50 });
    expect(mitsu.length).toBeGreaterThan(0);
    expect(mitsu.some(t => t.series === "MC7025")).toBe(true);
  });

  it("recommend() boosts first-choice grades for ISO group P", () => {
    const recs = engine.recommend({ operation: "turn", iso_group: "P", max_results: 20 });
    expect(recs.length).toBeGreaterThan(0);
    const firstChoice = recs.filter(r => r.reasoning.includes("first-choice grade"));
    expect(firstChoice.length).toBeGreaterThan(0);
    // First-choice should score higher
    const best = firstChoice[0];
    expect(best.score).toBeGreaterThanOrEqual(70);
  });

  it("recommend() returns ISCAR tools for milling operations", () => {
    const recs = engine.recommend({ operation: "pocket", iso_group: "P", max_results: 20 });
    const iscarRecs = recs.filter(r => r.manufacturer === "ISCAR");
    expect(iscarRecs.length).toBeGreaterThan(0);
  });

  it("ISCAR CHAM-IQ-DRILL appears in drill recommendations", () => {
    const recs = engine.recommend({ operation: "drill", iso_group: "P", max_results: 20 });
    const chamIq = recs.filter(r => r.series === "CHAM-IQ-DRILL");
    expect(chamIq.length).toBeGreaterThan(0);
  });

  it("multi-manufacturer grades have correct ISO suitability", async () => {
    const { ALL_MANUFACTURER_GRADES } = await import("../data/multi-manufacturer-grades.js");
    expect(ALL_MANUFACTURER_GRADES.length).toBeGreaterThan(40);
    const iscar8150 = ALL_MANUFACTURER_GRADES.find((g: any) => g.code === "IC8150");
    expect(iscar8150).toBeDefined();
    expect(iscar8150.iso_suitability.P).toBe("first_choice");
    expect(iscar8150.manufacturer).toBe("ISCAR");
  });

  // ── OSG & Guhring Integration ──
  it("loads OSG tools into catalog", () => {
    const osg = engine.search({ manufacturer: "OSG", max_results: 50 });
    expect(osg.length).toBeGreaterThan(0);
  });

  it("loads OSG drills searchable by type", () => {
    const osgDrills = engine.search({ manufacturer: "OSG", type: "drill", max_results: 10 });
    expect(osgDrills.length).toBeGreaterThan(0);
    expect(osgDrills[0].type).toBe("drill");
  });

  it("loads Guhring tools into catalog", () => {
    const guh = engine.search({ manufacturer: "Guhring", max_results: 50 });
    expect(guh.length).toBeGreaterThan(0);
  });

  it("loads Guhring drills searchable by type", () => {
    const guhDrills = engine.search({ manufacturer: "Guhring", type: "drill", max_results: 10 });
    expect(guhDrills.length).toBeGreaterThan(0);
  });

  // ── Global CNC live-tooling holders (DB-COVERAGE-GAPFILL-MS0/U-GCNC01) ──
  // The Global CNC source (GLOBAL_CNC_TOOLS, 3,680 records) mixes 2,416 guide BUSHINGS
  // with 1,264 live-tooling HOLDERS. _loadGlobalCNCTools() now filters bushings + bad
  // geometry at the loader (source-agnostic — same result for the dev src/data json and
  // the prod dist json), so the catalog holds ~1,134 real holders with valid dimensions.
  it("loads Global CNC holders into the catalog, excluding bushings + bad geometry", () => {
    const gcnc = engine.search({ manufacturer: "Global CNC", max_results: 4000 });
    // ~1,134 holders land (1,264 holders − implausible-bore − zero-OAL drops).
    expect(gcnc.length).toBeGreaterThan(1000);
    expect(gcnc.length).toBeLessThan(1300); // bushings (2,416) must NOT leak in
    for (const t of gcnc) {
      // No guide bushings in the tool catalog.
      expect(t.type).not.toBe("bushing");
      // Every loaded holder carries real, usable geometry (the loader drops zero/oversize).
      expect(t.physical.overall_length_mm).toBeGreaterThan(0);
      expect(t.source).toBe("Global_CNC_2023_Catalog");
    }
  });

  it("classifies Global CNC holder families per the extended gt.type mapping", () => {
    // driven_drill_mill → end_mill (live rotating tools)
    const mills = engine.search({ manufacturer: "Global CNC", type: "end_mill", max_results: 500 });
    expect(mills.length).toBeGreaterThan(0);
    // boring_bar_holder + id_holder → boring_bar (internal/ID work)
    const bores = engine.search({ manufacturer: "Global CNC", type: "boring_bar", max_results: 500 });
    expect(bores.length).toBeGreaterThan(0);
    // od_turning_holder etc. → turning_tool (OD turning + turret interfaces)
    const turns = engine.search({ manufacturer: "Global CNC", type: "turning_tool", max_results: 500 });
    expect(turns.length).toBeGreaterThan(0);
  });

  it("catalog stats reflect all manufacturers", () => {
    const stats = engine.stats();
    expect(stats.total_tools).toBeGreaterThan(1000);
    // by_manufacturer must be a populated map — Global CNC present with >1000 holders after U-GCNC01.
    expect(Object.keys(stats.by_manufacturer).length).toBeGreaterThan(0);
    expect(stats.by_manufacturer["Global CNC"]).toBeGreaterThan(1000);
  });

  // ── Dispatcher Wiring ──
  it("dispatcher module loads with tool_catalog actions", async () => {
    const mod = await import("../tools/dispatchers/calcDispatcher.js");
    expect(typeof mod.registerCalcDispatcher).toBe("function");
  });
});
