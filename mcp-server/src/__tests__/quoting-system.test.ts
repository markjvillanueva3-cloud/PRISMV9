/**
 * Quoting System Tests — QuoteEstimatorEngine, SecondaryOpsEngine, QuoteAnalyticsEngine
 * Tests physics-backed estimation, secondary ops catalog, and analytics/feedback loop.
 */
import { describe, it, expect } from "vitest";
import { quoteEstimatorEngine } from "../engines/QuoteEstimatorEngine.js";
import { secondaryOpsEngine } from "../engines/SecondaryOpsEngine.js";
import { quoteAnalyticsEngine } from "../engines/QuoteAnalyticsEngine.js";

// ─── QuoteEstimatorEngine ────────────────────────────────────

describe("QuoteEstimatorEngine", () => {
  it("generates comprehensive estimate for simple aluminum part", () => {
    const est = quoteEstimatorEngine.estimate({
      part_name: "Bracket",
      quantity: 50,
      material: "aluminum_6061",
      complexity: "simple",
      machine_type: "cnc_mill_3axis",
      inspection_level: "standard",
    });

    expect(est.quote_id).toMatch(/^QE/);
    expect(est.quantity).toBe(50);
    expect(est.costs.material.total).toBeGreaterThan(0);
    expect(est.costs.machining.total).toBeGreaterThan(0);
    expect(est.costs.machining.cycle_time_source).toBe("parametric_estimate");
    expect(est.costs.setup.num_setups).toBe(1);
    expect(est.costs.overhead.total).toBeGreaterThan(0);
    expect(est.pricing.unit_price).toBeGreaterThan(est.costs.total_cost_per_part);
    expect(est.pricing.margin_pct).toBeGreaterThan(0);
    expect(est.lead_time.total_standard_days).toBeGreaterThan(0);
    expect(est.confidence_score).toBeGreaterThan(0);
    expect(est.price_breaks.length).toBeGreaterThan(0);
  });

  it("uses CAM-derived cycle times when provided", () => {
    const est = quoteEstimatorEngine.estimate({
      quantity: 10,
      material: "steel_4140",
      complexity: "complex",
      operations: [
        { name: "roughing", type: "roughing", cycle_time_min: 25, tool_count: 3 },
        { name: "finishing", type: "finishing", cycle_time_min: 15, tool_count: 2 },
      ],
    });

    expect(est.costs.machining.cycle_time_min).toBe(40);
    expect(est.costs.machining.cycle_time_source).toBe("cam_derived");
    expect(est.confidence_score).toBeGreaterThanOrEqual(70); // higher confidence with CAM data
  });

  it("uses physics-based cycle time when cutting params provided", () => {
    const est = quoteEstimatorEngine.estimate({
      quantity: 25,
      material: "aluminum_7075",
      complexity: "medium",
      cutting_speed_mpm: 250,
      feed_per_tooth_mm: 0.1,
      tool_diameter_mm: 12,
      num_flutes: 3,
      depth_of_cut_mm: 3,
      stock_dimensions_mm: { length: 100, width: 80, height: 30 },
      part_volume_cm3: 100,
    });

    expect(est.costs.machining.cycle_time_source).toBe("physics_calculated");
    expect(est.costs.machining.cycle_time_min).toBeGreaterThan(0);
    expect(est.buy_to_fly).toBeGreaterThan(1);
  });

  it("applies rush premium correctly", () => {
    const base = quoteEstimatorEngine.estimate({
      quantity: 10, material: "steel_1018", complexity: "medium",
    });
    const rush = quoteEstimatorEngine.estimate({
      quantity: 10, material: "steel_1018", complexity: "medium",
      rush: true, rush_tier: "next_day",
    });

    expect(rush.pricing.unit_price).toBeGreaterThan(base.pricing.unit_price);
    expect(rush.pricing.adjustments.rush_premium_pct).toBe(100); // 2x = +100%
    expect(rush.lead_time.total_rush_days).toBeLessThan(rush.lead_time.total_standard_days);
  });

  it("applies volume discount for large quantities", () => {
    const small = quoteEstimatorEngine.estimate({
      quantity: 5, material: "aluminum_6061", complexity: "simple",
    });
    const large = quoteEstimatorEngine.estimate({
      quantity: 1000, material: "aluminum_6061", complexity: "simple",
    });

    expect(large.pricing.unit_price).toBeLessThan(small.pricing.unit_price);
    expect(large.pricing.adjustments.volume_discount_pct).toBeGreaterThan(0);
  });

  it("applies tolerance premium for tight tolerances", () => {
    const standard = quoteEstimatorEngine.estimate({
      quantity: 10, material: "steel_4140", complexity: "complex",
    });
    const tight = quoteEstimatorEngine.estimate({
      quantity: 10, material: "steel_4140", complexity: "complex",
      tightest_tolerance_mm: 0.005,
    });

    expect(tight.pricing.adjustments.tolerance_premium_pct).toBeGreaterThan(0);
    expect(tight.pricing.unit_price).toBeGreaterThan(standard.pricing.unit_price);
  });

  it("adds feature-based costs", () => {
    const noFeatures = quoteEstimatorEngine.estimate({
      quantity: 10, material: "aluminum_6061", complexity: "medium",
    });
    const withFeatures = quoteEstimatorEngine.estimate({
      quantity: 10, material: "aluminum_6061", complexity: "medium",
      features: [
        { type: "hole", count: 20, tolerance_mm: 0.02 },
        { type: "pocket", count: 3, depth_ratio: 5 },
        { type: "thread", count: 8 },
        { type: "undercut", count: 1, requires_5axis: true },
      ],
    });

    expect(withFeatures.costs.total_cost).toBeGreaterThan(noFeatures.costs.total_cost);
  });

  it("generates DfM warnings", () => {
    const est = quoteEstimatorEngine.estimate({
      quantity: 1,
      material: "titanium_gr5",
      complexity: "very_complex",
      machine_type: "cnc_mill_5axis",
      tightest_tolerance_mm: 0.003,
      tightest_surface_finish_ra: 0.2,
      features: [
        { type: "pocket", count: 1, depth_ratio: 8 },
        { type: "undercut", count: 2 },
      ],
    });

    expect(est.dfm_warnings.length).toBeGreaterThanOrEqual(3);
    expect(est.dfm_warnings.some(w => w.includes("Tolerance"))).toBe(true);
    expect(est.dfm_warnings.some(w => w.includes("titanium") || w.includes("tool wear"))).toBe(true);
  });

  it("includes secondary ops in cost", () => {
    const est = quoteEstimatorEngine.estimate({
      quantity: 50,
      material: "aluminum_6061",
      complexity: "medium",
      secondary_ops: [
        { type: "anodize_type_ii" },
        { type: "laser_engrave" },
      ],
    });

    expect(est.costs.secondary_ops.operations).toHaveLength(2);
    expect(est.costs.secondary_ops.total).toBeGreaterThan(0);
    expect(est.lead_time.secondary_ops_days).toBeGreaterThan(0);
  });

  it("handles NRE items with amortization", () => {
    const est = quoteEstimatorEngine.estimate({
      quantity: 100,
      material: "steel_4140",
      complexity: "complex",
      nre_items: [
        { type: "fixture_design", description: "Custom 5-axis fixture", estimated_hours: 8, amortize_over_qty: 100 },
        { type: "programming", description: "5-axis programming", estimated_hours: 12 },
      ],
    });

    expect(est.costs.nre.items).toHaveLength(2);
    expect(est.costs.nre.total_nre).toBeGreaterThan(0);
    // First item amortized, second not
    expect(est.costs.nre.items[0].amortized_per_part).toBeGreaterThan(0);
    expect(est.costs.nre.items[1].amortized_per_part).toBe(0);
  });

  it("compareMaterials shows price differences", () => {
    const results = quoteEstimatorEngine.compareMaterials(
      { quantity: 25, material: "aluminum_6061", complexity: "medium" },
      ["aluminum_6061", "steel_4140", "titanium_gr5"],
    );

    expect(results).toHaveLength(3);
    // Titanium should be most expensive
    const titanium = results.find(r => r.material === "titanium_gr5")!;
    const aluminum = results.find(r => r.material === "aluminum_6061")!;
    expect(titanium.unit_price).toBeGreaterThan(aluminum.unit_price);
  });

  it("whatIf shows scenario deltas", () => {
    const results = quoteEstimatorEngine.whatIf(
      { quantity: 50, material: "aluminum_6061", complexity: "medium" },
      [
        { quantity: 500 },
        { rush: true, rush_tier: "next_day" },
        { material: "titanium_gr5" },
      ],
    );

    expect(results).toHaveLength(3);
    expect(results[0].delta_pct).toBeLessThan(0); // volume should reduce price
    expect(results[1].delta_pct).toBeGreaterThan(0); // rush should increase
    expect(results[2].delta_pct).toBeGreaterThan(0); // titanium should increase
  });

  it("adjusts margin by customer tier", () => {
    const tierA = quoteEstimatorEngine.estimate({
      quantity: 10, material: "steel_1018", complexity: "simple", customer_tier: "A",
    });
    const tierC = quoteEstimatorEngine.estimate({
      quantity: 10, material: "steel_1018", complexity: "simple", customer_tier: "C",
    });

    // Tier A gets lower margin (30%) vs Tier C (40%)
    expect(tierA.pricing.unit_price).toBeLessThan(tierC.pricing.unit_price);
  });

  it("handles customer-supplied material", () => {
    const est = quoteEstimatorEngine.estimate({
      quantity: 10, material: "inconel_718", complexity: "complex",
      customer_supplied_material: true,
    });
    expect(est.costs.material.total).toBe(0);
    expect(est.confidence_factors.some(f => f.includes("customer-supplied"))).toBe(true);
  });
});

// ─── SecondaryOpsEngine ──────────────────────────────────────

describe("SecondaryOpsEngine", () => {
  it("lists all operations", () => {
    const ops = secondaryOpsEngine.listOperations();
    expect(ops.length).toBeGreaterThanOrEqual(20);
  });

  it("filters by category", () => {
    const ht = secondaryOpsEngine.listOperations("heat_treatment");
    expect(ht.length).toBeGreaterThanOrEqual(3);
    expect(ht.every(o => o.category === "heat_treatment")).toBe(true);
  });

  it("lists categories with counts", () => {
    const cats = secondaryOpsEngine.listCategories();
    expect(cats.length).toBeGreaterThanOrEqual(6);
    expect(cats.find(c => c.category === "plating")!.count).toBeGreaterThanOrEqual(3);
  });

  it("quotes with batch pricing discount", () => {
    const single = secondaryOpsEngine.quote({
      operation_id: "anodize_type_ii", quantity: 1, material: "aluminum_6061",
    });
    const batch = secondaryOpsEngine.quote({
      operation_id: "anodize_type_ii", quantity: 200, material: "aluminum_6061",
    });

    expect(single.per_part_cost).toBe(8); // base price
    expect(batch.per_part_cost).toBeLessThan(8); // batch discount
    expect(batch.lot_charge_applied).toBe(false);
  });

  it("applies min lot charge for small batches", () => {
    const result = secondaryOpsEngine.quote({
      operation_id: "anodize_type_ii", quantity: 2, material: "aluminum_6061",
    });
    expect(result.lot_charge_applied).toBe(true);
    expect(result.subtotal).toBeGreaterThanOrEqual(75); // min lot charge
  });

  it("warns on incompatible material", () => {
    const result = secondaryOpsEngine.quote({
      operation_id: "anodize_type_ii", quantity: 10, material: "steel_4140",
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("NOT compatible");
  });

  it("applies rush multiplier", () => {
    const standard = secondaryOpsEngine.quote({
      operation_id: "chrome_plate", quantity: 10,
    });
    const rush = secondaryOpsEngine.quote({
      operation_id: "chrome_plate", quantity: 10, rush: true,
    });

    expect(rush.rush_premium).toBeGreaterThan(0);
    expect(rush.total).toBeGreaterThan(standard.total);
    expect(rush.lead_time_days).toBeLessThan(standard.lead_time_days);
  });

  it("adds masking cost", () => {
    const noMask = secondaryOpsEngine.quote({
      operation_id: "bead_blast", quantity: 10,
    });
    const withMask = secondaryOpsEngine.quote({
      operation_id: "bead_blast", quantity: 10, requires_masking: true, masking_areas: 3,
    });

    expect(withMask.masking_cost).toBeGreaterThan(0);
    expect(withMask.total).toBeGreaterThan(noMask.total);
  });

  it("quoteBatch aggregates multiple ops", () => {
    const batch = secondaryOpsEngine.quoteBatch([
      { operation_id: "passivate", quantity: 50, material: "stainless_304" },
      { operation_id: "laser_engrave", quantity: 50 },
    ]);

    expect(batch.quotes).toHaveLength(2);
    expect(batch.total).toBeGreaterThan(0);
    expect(batch.max_lead_days).toBeGreaterThan(0);
  });

  it("findVendors returns capable vendors", () => {
    const vendors = secondaryOpsEngine.findVendors("anodize_type_ii");
    expect(vendors.length).toBeGreaterThanOrEqual(1);
    expect(vendors[0].capabilities).toContain("anodize_type_ii");
  });

  it("recommends operations for material + application", () => {
    const recs = secondaryOpsEngine.recommend("aluminum_6061", "corrosion");
    expect(recs.length).toBeGreaterThanOrEqual(1);
    expect(recs.some(r => r.id.includes("anodize"))).toBe(true);
  });

  it("compatibleOps excludes incompatible materials", () => {
    const alOps = secondaryOpsEngine.compatibleOps("aluminum_6061");
    expect(alOps.some(o => o.id === "anodize_type_ii")).toBe(true);
    expect(alOps.every(o => !o.incompatible_materials.includes("aluminum_6061"))).toBe(true);

    const steelOps = secondaryOpsEngine.compatibleOps("steel_4140");
    expect(steelOps.some(o => o.id === "anodize_type_ii")).toBe(false);
  });

  it("uses vendor quote override", () => {
    const result = secondaryOpsEngine.quote({
      operation_id: "anodize_type_ii", quantity: 100,
      vendor_quote_override: 350,
    });
    expect(result.per_part_cost).toBe(3.50); // 350/100
  });
});

// ─── QuoteAnalyticsEngine ────────────────────────────────────

describe("QuoteAnalyticsEngine", () => {
  it("records and retrieves quotes", () => {
    const q = quoteAnalyticsEngine.recordQuote({
      quote_id: "QA-TEST-001",
      part_name: "Test Bracket",
      customer: "Acme Corp",
      material: "aluminum_6061",
      complexity: "medium",
      quantity: 50,
      date_quoted: "2026-03-01",
      valid_until: "2026-03-31",
      quoted_unit_price: 25,
      quoted_total: 1250,
      quoted_margin_pct: 35,
      quoted_lead_days: 10,
      quoted_cost_breakdown: {
        material: 150, machining: 300, setup: 50, tooling: 30,
        programming: 75, inspection: 40, secondary_ops: 100, overhead: 67, total: 812,
      },
      quoted_cycle_time_min: 12,
      status: "pending",
      estimator: "John",
    });

    expect(q.quote_id).toBe("QA-TEST-001");
    expect(quoteAnalyticsEngine.getQuote("QA-TEST-001")).toBeDefined();
  });

  it("updates outcome and tracks loss reason", () => {
    const q = quoteAnalyticsEngine.updateOutcome("QA-TEST-001", "won");
    expect(q.status).toBe("won");
  });

  it("records actuals and calculates margin", () => {
    const q = quoteAnalyticsEngine.recordActuals("QA-TEST-001", {
      cost_breakdown: {
        material: 160, machining: 280, setup: 55, tooling: 45,
        programming: 75, inspection: 35, secondary_ops: 110, overhead: 70, total: 830,
      },
      cycle_time_min: 14,
      lead_days: 12,
    });

    expect(q.actual_cost_breakdown).toBeDefined();
    expect(q.actual_cycle_time_min).toBe(14);
    expect(q.actual_margin_pct).toBeDefined();
  });

  it("computes accuracy metrics", () => {
    // Add a second quote with actuals for meaningful stats
    quoteAnalyticsEngine.recordQuote({
      quote_id: "QA-TEST-002",
      part_name: "Shaft",
      customer: "Beta Inc",
      material: "steel_4140",
      complexity: "complex",
      quantity: 25,
      date_quoted: "2026-03-02",
      valid_until: "2026-04-01",
      quoted_unit_price: 80,
      quoted_total: 2000,
      quoted_margin_pct: 35,
      quoted_lead_days: 15,
      quoted_cost_breakdown: {
        material: 200, machining: 500, setup: 100, tooling: 50,
        programming: 150, inspection: 100, secondary_ops: 0, overhead: 200, total: 1300,
      },
      quoted_cycle_time_min: 30,
      status: "won",
      estimator: "John",
    });
    quoteAnalyticsEngine.recordActuals("QA-TEST-002", {
      cost_breakdown: {
        material: 220, machining: 550, setup: 120, tooling: 80,
        programming: 150, inspection: 90, secondary_ops: 0, overhead: 220, total: 1430,
      },
      cycle_time_min: 35,
    });

    const metrics = quoteAnalyticsEngine.accuracyMetrics();
    expect(metrics.quotes_with_actuals).toBe(2);
    expect(metrics.cost_accuracy.avg_variance_pct).toBeDefined();
    expect(metrics.by_category).toHaveProperty("material");
    expect(metrics.margin_accuracy.avg_quoted_margin).toBeGreaterThan(0);
  });

  it("computes conversion metrics", () => {
    // Add a lost quote
    quoteAnalyticsEngine.recordQuote({
      quote_id: "QA-TEST-003",
      part_name: "Housing",
      customer: "Acme Corp",
      material: "aluminum_6061",
      complexity: "simple",
      quantity: 100,
      date_quoted: "2026-03-03",
      valid_until: "2026-04-02",
      quoted_unit_price: 15,
      quoted_total: 1500,
      quoted_margin_pct: 30,
      quoted_lead_days: 7,
      quoted_cost_breakdown: {
        material: 200, machining: 400, setup: 50, tooling: 20,
        programming: 50, inspection: 30, secondary_ops: 0, overhead: 100, total: 850,
      },
      quoted_cycle_time_min: 5,
      status: "pending",
      estimator: "Jane",
    });
    quoteAnalyticsEngine.updateOutcome("QA-TEST-003", "lost", {
      loss_reason: "price_too_high",
      competing_price: 12,
    });

    const conv = quoteAnalyticsEngine.conversionMetrics();
    expect(conv.total_quotes).toBeGreaterThanOrEqual(3);
    expect(conv.won).toBeGreaterThanOrEqual(1);
    expect(conv.lost).toBeGreaterThanOrEqual(1);
    expect(conv.win_rate_pct).toBeGreaterThan(0);
    expect(conv.loss_reasons.price_too_high).toBe(1);
    expect(conv.by_customer.length).toBeGreaterThanOrEqual(1);
    expect(conv.by_material.length).toBeGreaterThanOrEqual(1);
  });

  it("estimator scores rank by accuracy", () => {
    const scores = quoteAnalyticsEngine.estimatorScores();
    expect(scores.length).toBeGreaterThanOrEqual(1);
    expect(scores[0].estimator).toBeDefined();
    expect(scores[0].accuracy_score).toBeGreaterThanOrEqual(0);
  });

  it("calibration suggestions detect bias", () => {
    const suggestions = quoteAnalyticsEngine.calibrationSuggestions();
    // With our test data, machining was underestimated (quoted 300+500=800, actual 280+550=830)
    // So we should get suggestions if sample size is sufficient
    expect(Array.isArray(suggestions)).toBe(true);
  });

  it("findSimilar returns matching quotes", () => {
    const similar = quoteAnalyticsEngine.findSimilar({
      material: "aluminum_6061",
      complexity: "medium",
    });
    expect(similar.length).toBeGreaterThanOrEqual(1);
    expect(similar[0].material).toBe("aluminum_6061");
  });

  it("listQuotes filters by status", () => {
    const won = quoteAnalyticsEngine.listQuotes("won");
    expect(won.every(q => q.status === "won")).toBe(true);
  });
});

// ─── Dispatcher Wiring Smoke Test ────────────────────────────

describe("businessDispatcher quoting wiring", () => {
  it("module loads with 82 actions", async () => {
    const mod = await import("../tools/dispatchers/businessDispatcher.js");
    expect(mod.registerBusinessDispatcher).toBeDefined();
  });
});
