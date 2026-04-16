/**
 * batch35-final-coverage.test.ts — Tests for the last 9 untested engines
 *
 * Engines:
 *   1. StockSizeOptimizerEngine
 *   2. InjectionMoldQuoteEngine
 *   3. ManusATCSBridge
 *   4. MarketMaterialPricingEngine
 *   5. PeckDrillingOptimizationEngine
 *   6. PartOffForceEngine
 *   7. RoughnessConversionEngine
 *   8. SourceCatalogAggregator
 *   9. DiffEngine
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// 1. StockSizeOptimizerEngine
// ============================================================================
import { stockSizeOptimizerEngine } from "../engines/StockSizeOptimizerEngine.js";

describe("StockSizeOptimizerEngine", () => {
  it("optimize — returns recommendations for aluminum milling part", () => {
    const result = stockSizeOptimizerEngine.optimize({
      part_dims_mm: { length: 100, width: 50, height: 25 },
      material: "aluminum_6061",
      quantity: 10,
    });
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.part_volume_cm3).toBeGreaterThan(0);
    expect(result.buy_to_fly_ratio).toBeGreaterThan(0);
    const best = result.recommendations[0];
    expect(best.rank).toBe(1);
    expect(best.material_cost_per_part).toBeGreaterThan(0);
    expect(best.waste_pct).toBeGreaterThan(0);
    expect(best.waste_pct).toBeLessThan(100);
  });

  it("optimize — turning mode returns round bar stock", () => {
    const result = stockSizeOptimizerEngine.optimize({
      part_dims_mm: { length: 80, width: 30, height: 30 },
      material: "steel_4140",
      quantity: 50,
      is_turning: true,
    });
    expect(result.recommendations.length).toBeGreaterThan(0);
    const hasRound = result.recommendations.some(r => r.form === "round_bar");
    expect(hasRound).toBe(true);
  });

  it("catalog — returns stock data for a known material", () => {
    const cat = stockSizeOptimizerEngine.catalog("steel_1018");
    expect(cat.round_bars.length).toBeGreaterThan(0);
    expect(cat.flat_bars.length).toBeGreaterThan(0);
    expect(cat.plate_thicknesses.length).toBeGreaterThan(0);
    expect(cat.cost_per_kg).toBeGreaterThan(0);
    expect(cat.density_kg_m3).toBeGreaterThan(0);
  });

  it("nesting — calculates parts per flat bar", () => {
    const result = stockSizeOptimizerEngine.nesting({
      stock_form: "flat_bar",
      stock_dims_mm: [50.8, 25.4],
      stock_length_mm: 914.4,
      part_dims_mm: { length: 40, width: 20, height: 10 },
    });
    expect(result.parts_per_stock).toBeGreaterThan(0);
    expect(result.waste_pct).toBeGreaterThan(0);
    expect(result.waste_pct).toBeLessThan(100);
    expect(result.layout).toContain("parts");
  });
});

// ============================================================================
// 2. InjectionMoldQuoteEngine
// ============================================================================
import { injectionMoldQuoteEngine } from "../engines/InjectionMoldQuoteEngine.js";

describe("InjectionMoldQuoteEngine", () => {
  it("quote — generates mold cost and per-part pricing for ABS part", () => {
    const result = injectionMoldQuoteEngine.quote({
      material: "abs",
      part_volume_cm3: 15,
      projected_area_cm2: 40,
      quantity: 5000,
      wall_thickness_mm: 2.0,
    });
    expect(result.mold_cost_usd).toBeGreaterThan(0);
    expect(result.unit_cost).toBeGreaterThan(0);
    expect(result.price_per_part).toBeGreaterThan(0);
    expect(result.cycle_time_s).toBeGreaterThan(0);
    expect(result.num_cavities).toBeGreaterThanOrEqual(1);
    expect(result.margin_pct).toBe(25);
  });

  it("quote — high volume selects higher mold class and more cavities", () => {
    const result = injectionMoldQuoteEngine.quote({
      material: "pp",
      part_volume_cm3: 8,
      projected_area_cm2: 25,
      quantity: 200000,
      annual_volume: 200000,
    });
    expect(result.mold_class).toBe("class_102");
    expect(result.num_cavities).toBeGreaterThanOrEqual(4);
  });

  it("listMaterials — returns non-empty material list", () => {
    const mats = injectionMoldQuoteEngine.listMaterials();
    expect(mats.length).toBeGreaterThan(10);
    const abs = mats.find(m => m.key === "abs");
    expect(abs).toBeDefined();
    expect(abs!.price_per_kg).toBeGreaterThan(0);
  });

  it("analyzeDfm — flags thin wall below minimum", () => {
    const result = injectionMoldQuoteEngine.analyzeDfm({
      material: "pc",
      wall_thickness_mm: 0.5,
      draft_angle_deg: 0.3,
    });
    expect(result.score).toBeLessThan(100);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 3. ManusATCSBridge
// ============================================================================
import {
  pollResults,
  getDelegationStatus,
  getActiveDelegations,
  clearCompletedDelegations,
  autoManusATCSPoll,
  getBridgeStatus,
} from "../engines/ManusATCSBridge.js";

describe("ManusATCSBridge", () => {
  it("pollResults — returns valid structure with no tasks", () => {
    const result = pollResults([]);
    expect(result.success).toBe(true);
    expect(result.completed).toEqual([]);
    expect(result.still_running).toBe(0);
    expect(result.failed).toEqual([]);
  });

  it("getDelegationStatus — returns null for unknown task", () => {
    const status = getDelegationStatus("nonexistent_task_999");
    expect(status).toBeNull();
  });

  it("getBridgeStatus — returns summary structure", () => {
    const status = getBridgeStatus();
    expect(status).toHaveProperty("active_delegations");
    expect(status).toHaveProperty("total_tracked");
    expect(status).toHaveProperty("by_status");
    expect(typeof status.active_delegations).toBe("number");
  });

  it("autoManusATCSPoll — returns counts", () => {
    const poll = autoManusATCSPoll(1);
    expect(poll).toHaveProperty("completed");
    expect(poll).toHaveProperty("running");
    expect(poll).toHaveProperty("failed");
    expect(typeof poll.completed).toBe("number");
  });
});

// ============================================================================
// 4. MarketMaterialPricingEngine
// ============================================================================
import { marketMaterialPricingEngine } from "../engines/MarketMaterialPricingEngine.js";

describe("MarketMaterialPricingEngine", () => {
  it("lookup — returns pricing for aluminum 6061 bar", () => {
    const result = marketMaterialPricingEngine.lookup({
      material: "aluminum_6061",
      form: "bar",
      region: "us_midwest",
    });
    expect(result.name).toBe("6061-T6");
    expect(result.category).toBe("aluminum");
    expect(result.base_price_kg).toBe(6.50);
    expect(result.final_price_kg).toBeGreaterThan(0);
    expect(result.index_multiplier).toBe(1.0);
  });

  it("lookup — plate form has higher price than bar", () => {
    const bar = marketMaterialPricingEngine.lookup({ material: "stainless_304", form: "bar" });
    const plate = marketMaterialPricingEngine.lookup({ material: "stainless_304", form: "plate" });
    expect(plate.form_adjusted_price_kg).toBeGreaterThan(bar.form_adjusted_price_kg);
  });

  it("compare — ranks materials cheapest first", () => {
    const results = marketMaterialPricingEngine.compare(
      ["aluminum_6061", "stainless_316", "titanium_gr5"],
      "bar",
      "us_midwest",
    );
    expect(results.length).toBe(3);
    expect(results[0].rank).toBe(1);
    // Aluminum should be cheapest
    expect(results[0].material).toBe("aluminum_6061");
  });

  it("surcharge — returns zero surcharge for carbon steel", () => {
    const result = marketMaterialPricingEngine.surcharge({
      material: "steel_1018",
      weight_kg: 100,
    });
    expect(result.surcharge_per_kg).toBe(0);
    expect(result.total_surcharge).toBe(0);
  });

  it("listMaterials — returns grouped categories", () => {
    const mats = marketMaterialPricingEngine.listMaterials();
    expect(mats).toHaveProperty("aluminum");
    expect(mats).toHaveProperty("steel");
    expect(mats).toHaveProperty("titanium");
    expect(mats.aluminum.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 5. PeckDrillingOptimizationEngine
// ============================================================================
import { peckDrillingOptimizationEngine } from "../engines/PeckDrillingOptimizationEngine.js";

describe("PeckDrillingOptimizationEngine", () => {
  it("calculate — standard steel drilling with full retract", () => {
    const result = peckDrillingOptimizationEngine.calculate({
      drill_diameter_mm: 10,
      hole_depth_mm: 60,
      material: "steel_4140",
      drill_type: "hss_twist",
      cutting_speed_m_min: 25,
      feed_per_rev_mm: 0.15,
      coolant_through_spindle: false,
    });
    expect(result.ld_ratio).toBe(6);
    expect(result.peck_strategy).toBe("full_retract");
    expect(result.peck_depth_mm).toBeGreaterThan(0);
    expect(result.num_pecks).toBeGreaterThan(1);
    expect(result.estimated_cycle_time_s).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("calculate — gun drill uses continuous strategy", () => {
    const result = peckDrillingOptimizationEngine.calculate({
      drill_diameter_mm: 8,
      hole_depth_mm: 200,
      material: "steel_1018",
      drill_type: "gun_drill",
      cutting_speed_m_min: 80,
      feed_per_rev_mm: 0.02,
      coolant_through_spindle: true,
    });
    expect(result.peck_strategy).toBe("gun_drill_continuous");
    expect(result.num_pecks).toBe(1);
  });

  it("calculate — shallow aluminum hole with chip break strategy", () => {
    const result = peckDrillingOptimizationEngine.calculate({
      drill_diameter_mm: 12,
      hole_depth_mm: 30,
      material: "aluminum_6061",
      drill_type: "carbide_twist",
      cutting_speed_m_min: 120,
      feed_per_rev_mm: 0.20,
      coolant_through_spindle: true,
    });
    expect(result.ld_ratio).toBe(2.5);
    expect(result.peck_strategy).toBe("chip_break");
  });
});

// ============================================================================
// 6. PartOffForceEngine
// ============================================================================
import { partOffForceEngine } from "../engines/PartOffForceEngine.js";

describe("PartOffForceEngine", () => {
  it("calculate — solid steel bar parting", () => {
    const result = partOffForceEngine.calculate({
      bar_diameter_mm: 50,
      bore_diameter_mm: 0,
      blade_width_mm: 3,
      feed_per_rev_mm: 0.10,
      cutting_speed_m_min: 120,
      material: "steel_4140",
      material_hardness_HRC: 28,
    });
    expect(result.tangential_force_N).toBeGreaterThan(0);
    expect(result.feed_force_N).toBeGreaterThan(0);
    expect(result.radial_force_N).toBeGreaterThan(0);
    expect(result.total_force_N).toBeGreaterThan(result.tangential_force_N);
    expect(result.cutting_power_kW).toBeGreaterThan(0);
    expect(result.estimated_time_s).toBeGreaterThan(0);
    expect(result.min_bar_remnant_mm).toBeGreaterThanOrEqual(1);
  });

  it("calculate — tube parting produces thin-wall warning", () => {
    const result = partOffForceEngine.calculate({
      bar_diameter_mm: 40,
      bore_diameter_mm: 34,
      blade_width_mm: 3,
      feed_per_rev_mm: 0.08,
      cutting_speed_m_min: 100,
      material: "stainless_304",
      material_hardness_HRC: 20,
    });
    expect(result.recommendations.some(r => r.includes("Thin wall") || r.includes("stainless"))).toBe(true);
  });

  it("calculate — rejects invalid inputs", () => {
    expect(() =>
      partOffForceEngine.calculate({
        bar_diameter_mm: -10,
        bore_diameter_mm: 0,
        blade_width_mm: 3,
        feed_per_rev_mm: 0.10,
        cutting_speed_m_min: 120,
        material: "steel",
        material_hardness_HRC: 30,
      }),
    ).toThrow("Bar diameter must be positive");
  });
});

// ============================================================================
// 7. RoughnessConversionEngine
// ============================================================================
import { roughnessConversionEngine } from "../engines/RoughnessConversionEngine.js";

describe("RoughnessConversionEngine", () => {
  it("convert — Ra to Rz is approximately 4x", () => {
    const result = roughnessConversionEngine.convert({
      value: 1.6,
      from_scale: "Ra_um",
      to_scale: "Rz_um",
    });
    expect(result.output_value).toBeCloseTo(6.4, 1);
    expect(result.input_value).toBe(1.6);
    expect(result.input_scale).toBe("Ra_um");
    expect(result.output_scale).toBe("Rz_um");
    expect(result.uncertainty_pct).toBeGreaterThan(0);
    expect(result.all_equivalents).toHaveProperty("Ra_um");
    expect(result.all_equivalents).toHaveProperty("N_grade");
  });

  it("convert — Ra microinch to Ra micron", () => {
    const result = roughnessConversionEngine.convert({
      value: 63,
      from_scale: "Ra_uin",
      to_scale: "Ra_um",
    });
    expect(result.output_value).toBeCloseTo(1.6, 1);
  });

  it("convert — N-grade round trip preserves value", () => {
    const result = roughnessConversionEngine.convert({
      value: 7,
      from_scale: "N_grade",
      to_scale: "Ra_um",
    });
    // N7 = Ra 1.6 um
    expect(result.output_value).toBeCloseTo(1.6, 2);
    expect(result.n_grade_label).toContain("N7");
    expect(result.typical_process.length).toBeGreaterThan(0);
  });

  it("scales — returns all 6 scales", () => {
    const scales = roughnessConversionEngine.scales();
    expect(scales.length).toBe(6);
    expect(scales).toContain("Ra_um");
    expect(scales).toContain("Rz_um");
    expect(scales).toContain("N_grade");
  });
});

// ============================================================================
// 8. SourceCatalogAggregator
// ============================================================================
import { getAllCatalogs, searchCatalog, getEngineCatalog, getCatalogStats } from "../engines/SourceCatalogAggregator.js";

describe("SourceCatalogAggregator", () => {
  it("getAllCatalogs — returns valid structure", async () => {
    const result = await getAllCatalogs();
    expect(result).toHaveProperty("engines");
    expect(result).toHaveProperty("total_entries");
    expect(result).toHaveProperty("total_lines");
    expect(result).toHaveProperty("total_engines");
    expect(typeof result.total_entries).toBe("number");
    expect(typeof result.total_engines).toBe("number");
  });

  it("searchCatalog — returns results array", async () => {
    const results = await searchCatalog("toolpath", { limit: 5 });
    expect(Array.isArray(results)).toBe(true);
    // Results may or may not be found depending on catalog state
    for (const r of results) {
      expect(r).toHaveProperty("engine");
      expect(r).toHaveProperty("id");
      expect(r).toHaveProperty("entry");
    }
  });

  it("getEngineCatalog — returns null for unknown engine", async () => {
    const result = await getEngineCatalog("NonexistentEngine999");
    expect(result).toBeNull();
  });

  it("getCatalogStats — returns stats structure", async () => {
    const stats = await getCatalogStats();
    expect(stats).toHaveProperty("by_category");
    expect(stats).toHaveProperty("by_safety_class");
    expect(stats).toHaveProperty("total_entries");
    expect(typeof stats.total_entries).toBe("number");
  });
});

// ============================================================================
// 9. DiffEngine
// ============================================================================
import { diffEngine } from "../engines/DiffEngine.js";

describe("DiffEngine", () => {
  const testDir = path.join(process.env.TEMP || "C:/tmp", "prism-diff-test-" + Date.now());
  const testFile = path.join(testDir, "test-diff.txt");

  beforeEach(() => {
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
    // Invalidate any cached checksum for our test file
    diffEngine.invalidateChecksum(testFile);
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  });

  afterEach(() => {
    try {
      if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
      if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true });
    } catch { /* cleanup best-effort */ }
  });

  it("writeIfChanged — creates new file", () => {
    const result = diffEngine.writeIfChanged(testFile, "hello world");
    expect(result.changed).toBe(true);
    expect(result.action).toBe("created");
    expect(result.path).toBe(testFile);
    expect(fs.readFileSync(testFile, "utf-8")).toBe("hello world");
  });

  it("writeIfChanged — skips write for same content", () => {
    diffEngine.writeIfChanged(testFile, "same content");
    const result = diffEngine.writeIfChanged(testFile, "same content");
    expect(result.changed).toBe(false);
    expect(result.action).toBe("skipped");
    expect(result.bytes_saved).toBeGreaterThan(0);
  });

  it("writeIfChanged — writes when content differs", () => {
    diffEngine.writeIfChanged(testFile, "version 1");
    const result = diffEngine.writeIfChanged(testFile, "version 2");
    expect(result.changed).toBe(true);
    expect(result.action).toBe("written");
    expect(fs.readFileSync(testFile, "utf-8")).toBe("version 2");
  });

  it("wouldChange — detects change without writing", () => {
    diffEngine.writeIfChanged(testFile, "original");
    expect(diffEngine.wouldChange(testFile, "original")).toBe(false);
    expect(diffEngine.wouldChange(testFile, "modified")).toBe(true);
  });

  it("getStats — returns stats object with correct shape", () => {
    const stats = diffEngine.getStats();
    expect(stats).toHaveProperty("total_writes");
    expect(stats).toHaveProperty("actual_writes");
    expect(stats).toHaveProperty("skipped_writes");
    expect(stats).toHaveProperty("bytes_saved");
    expect(stats).toHaveProperty("shadow_write_errors");
  });
});
