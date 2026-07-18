/**
 * AlgorithmSelectorEngine Tests — CAMK-MS0/U02
 * Tests novel algorithm selection per zone/material/priority
 */
import { describe, it, expect } from "vitest";
import { algorithmSelectorEngine } from "../engines/AlgorithmSelectorEngine.js";

describe("AlgorithmSelectorEngine", () => {
  // ---- Basic selection ----
  it("returns top-3 ranked algorithms for a pocket zone", () => {
    const result = algorithmSelectorEngine.select({
      zone_type: "pocket",
      material: "6061-T6 Aluminum",
    });
    expect(result.top_3).toHaveLength(3);
    expect(result.top_3[0].score).toBeGreaterThan(result.top_3[2].score);
    expect(result.material_class).toBe("aluminum");
    // TGAR or VCER should rank high for pockets
    const topAlgos = result.top_3.map(r => r.algorithm);
    expect(topAlgos.some(a => ["TGAR", "VCER", "DPLS", "VCMR"].includes(a))).toBe(true);
  });

  // ---- All 24 algorithms ranked ----
  it("ranks all 24 algorithms", () => {
    const result = algorithmSelectorEngine.select({
      zone_type: "freeform",
      material: "Ti-6Al-4V",
    });
    expect(result.all_ranked).toHaveLength(24);
    // Scores in descending order
    for (let i = 1; i < result.all_ranked.length; i++) {
      expect(result.all_ranked[i - 1].score).toBeGreaterThanOrEqual(result.all_ranked[i].score);
    }
  });

  // ---- Material classification ----
  it("classifies materials correctly", () => {
    expect(algorithmSelectorEngine.classifyMaterial("6061-T6")).toBe("aluminum");
    expect(algorithmSelectorEngine.classifyMaterial("Ti-6Al-4V")).toBe("titanium");
    expect(algorithmSelectorEngine.classifyMaterial("Inconel 718")).toBe("nickel_alloy");
    expect(algorithmSelectorEngine.classifyMaterial("304 Stainless")).toBe("stainless_steel");
    expect(algorithmSelectorEngine.classifyMaterial("1045 Steel")).toBe("mild_steel");
    expect(algorithmSelectorEngine.classifyMaterial("D2 Tool Steel")).toBe("hardened_steel");
    expect(algorithmSelectorEngine.classifyMaterial("Gray Cast Iron")).toBe("cast_iron");
    expect(algorithmSelectorEngine.classifyMaterial("PEEK")).toBe("plastic");
    expect(algorithmSelectorEngine.classifyMaterial("CFRP")).toBe("composite");
    expect(algorithmSelectorEngine.classifyMaterial("C360 Brass")).toBe("copper");
  });

  // ---- Steep wall → HRAF/MACS preferred ----
  it("prefers HRAF/MACS for steep walls in titanium", () => {
    const result = algorithmSelectorEngine.select({
      zone_type: "steep_wall",
      material: "Ti-6Al-4V",
      priority: "quality",
    });
    const topAlgos = result.top_3.map(r => r.algorithm);
    expect(topAlgos.some(a => ["HRAF", "MACS", "PTDC"].includes(a))).toBe(true);
  });

  // ---- Deep pocket → VCER physics boost ----
  it("boosts VCER for deep pockets (high depth ratio)", () => {
    const result = algorithmSelectorEngine.select({
      zone_type: "pocket",
      material: "Aluminum 7075",
      depth_ratio: 5,
    });
    const vcerRank = result.all_ranked.findIndex(r => r.algorithm === "VCER");
    expect(vcerRank).toBeLessThan(5); // should be in top 5
    const vcer = result.all_ranked[vcerRank];
    expect(vcer.breakdown.physics_match).toBe(95);
  });

  // ---- Thin wall → PTDC physics boost ----
  it("boosts PTDC for thin walls", () => {
    const result = algorithmSelectorEngine.select({
      zone_type: "steep_wall",
      material: "Inconel 718",
      wall_thickness_mm: 1.5,
    });
    const ptdcRank = result.all_ranked.findIndex(r => r.algorithm === "PTDC");
    expect(ptdcRank).toBeLessThan(3);
    expect(result.all_ranked[ptdcRank].breakdown.physics_match).toBe(95);
  });

  // ---- Fine finish → HRAF/CFSF boost ----
  it("boosts HRAF for fine surface finish requirement", () => {
    const result = algorithmSelectorEngine.select({
      zone_type: "freeform",
      material: "P20 Tool Steel",
      target_ra_um: 0.4,
    });
    const hrafRank = result.all_ranked.findIndex(r => r.algorithm === "HRAF");
    expect(hrafRank).toBeLessThan(5);
    expect(result.all_ranked[hrafRank].breakdown.physics_match).toBe(95);
  });

  // ---- 3-axis machine penalizes 5-axis algorithms ----
  it("penalizes 5-axis algorithms on 3-axis machines", () => {
    const result = algorithmSelectorEngine.select({
      zone_type: "freeform",
      material: "Aluminum",
      machine: { axes: 3, max_rpm: 10000, max_feed_mmmin: 5000 },
    });
    const macsEntry = result.all_ranked.find(r => r.algorithm === "MACS");
    expect(macsEntry!.breakdown.machine_fit).toBe(30);
  });

  // ---- High-speed spindle → CFCM boost ----
  it("boosts CFCM for high-speed machines", () => {
    const result = algorithmSelectorEngine.select({
      zone_type: "pocket",
      material: "6061 Aluminum",
      machine: { axes: 3, max_rpm: 24000, max_feed_mmmin: 15000 },
    });
    const cfcm = result.all_ranked.find(r => r.algorithm === "CFCM");
    expect(cfcm!.breakdown.machine_fit).toBe(95);
  });

  // ---- Priority: speed → DPLS/VCER/VCMR ----
  it("favors speed-optimized algorithms when priority=speed", () => {
    const result = algorithmSelectorEngine.select({
      zone_type: "pocket",
      material: "Aluminum",
      priority: "speed",
    });
    const topAlgos = result.top_3.map(r => r.algorithm);
    expect(topAlgos.some(a => ["DPLS", "VCER", "VCMR", "CFCM"].includes(a))).toBe(true);
  });

  // ---- Priority: tool_life → WBRL/MEGM/WHAP ----
  it("favors tool-life algorithms when priority=tool_life", () => {
    const result = algorithmSelectorEngine.select({
      zone_type: "steep_wall",
      material: "Inconel 718",
      priority: "tool_life",
    });
    const top5 = result.all_ranked.slice(0, 5).map(r => r.algorithm);
    expect(top5.some(a => ["WBRL", "WHAP", "PTAP", "MEGM"].includes(a))).toBe(true);
  });

  // ---- Confidence scoring ----
  it("produces confidence scores between 20 and 100", () => {
    const result = algorithmSelectorEngine.select({
      zone_type: "corner",
      material: "4140 Steel",
    });
    for (const r of result.all_ranked) {
      expect(r.confidence).toBeGreaterThanOrEqual(20);
      expect(r.confidence).toBeLessThanOrEqual(100);
    }
  });

  // ---- Breakdown scores are valid ----
  it("returns valid breakdown scores (0-100)", () => {
    const result = algorithmSelectorEngine.select({
      zone_type: "hole",
      material: "Cast Iron",
    });
    for (const r of result.all_ranked) {
      const { geometry_fit, material_fit, objective_fit } = r.breakdown;
      expect(geometry_fit).toBeGreaterThanOrEqual(0);
      expect(geometry_fit).toBeLessThanOrEqual(100);
      expect(material_fit).toBeGreaterThanOrEqual(0);
      expect(objective_fit).toBeGreaterThanOrEqual(0);
    }
  });

  // ---- Batch zone selection ----
  it("selects algorithms for multiple zones at once", () => {
    const results = algorithmSelectorEngine.selectForZones(
      [
        { zone_type: "pocket", id: "z1" },
        { zone_type: "steep_wall", id: "z2" },
        { zone_type: "freeform", id: "z3" },
      ],
      "Ti-6Al-4V",
      undefined,
      "balanced"
    );
    expect(results).toHaveLength(3);
    expect(results[0].zone_id).toBe("z1");
    expect(results[0].recommendations).toHaveLength(3);
    // Different zones should likely get different top picks
    const topAlgos = results.map(r => r.recommendations[0].algorithm);
    expect(new Set(topAlgos).size).toBeGreaterThanOrEqual(2);
  });

  // ---- Reasons are populated ----
  it("provides meaningful reasons for top picks", () => {
    const result = algorithmSelectorEngine.select({
      zone_type: "pocket",
      material: "Aluminum",
      depth_ratio: 5,
    });
    const topResult = result.top_3[0];
    expect(topResult.reasons.length).toBeGreaterThan(0);
    expect(topResult.reasons.some(r => r.length > 5)).toBe(true);
  });
});
