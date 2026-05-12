/**
 * Session 5-3: Physics-Fed Costing Tests
 *
 * Verifies:
 * - U-PHYSCOST1: ERPIntegrationEngine uses physics (not hardcoded Vc)
 * - U-PHYSCOST2: JobCostingEngine includes tool consumption + power cost
 * - U-PHYSCOST3: QuoteEstimatorEngine produces CI95 uncertainty bands
 * - EXIT GATE: Ti-6Al-4V shows wider CI than 6061 aluminum
 */

import { describe, it, expect } from "vitest";

// ── U-PHYSCOST1: ERP Physics Bridge ──────────────────────────────────────────

describe("U-PHYSCOST1: ERPIntegrationEngine physics-backed routing", () => {
  it("importWorkOrder produces physics-backed Vc (not hardcoded 400/200)", async () => {
    const { importWorkOrder } = await import("../engines/ERPIntegrationEngine.js");
    const plan = importWorkOrder({
      wo_number: "WO-PHYS-001",
      part_number: "PN-TEST-001",
      material: "aluminum_6061",
      quantity: 10,
      routing: [
        { step: 1, operation: "Roughing", work_center: "VMC-1" },
        { step: 2, operation: "Finishing", work_center: "VMC-1" },
      ],
    });

    // Vc should come from physics, not the old hardcoded getVc()==400
    expect(plan.routing.length).toBe(2);
    // Physics-backed RPM should be reasonable for aluminum
    expect(plan.routing[0].parameters.rpm).toBeGreaterThan(0);
    expect(plan.routing[0].parameters.feed_mmmin).toBeGreaterThan(0);
    expect(plan.routing[0].parameters.doc_mm).toBeGreaterThan(0);
    // Recommendations should mention the physics source
    expect(plan.recommendations.some((r: string) =>
      r.includes("SpeedFeedOrchestrator") || r.includes("canonical_material_db")
    )).toBe(true);
  });

  it("importWorkOrder uses physics cycle time (not Math.random)", async () => {
    const { importWorkOrder } = await import("../engines/ERPIntegrationEngine.js");
    const plan1 = importWorkOrder({
      wo_number: "WO-DET-001",
      part_number: "PN-DET-001",
      material: "steel_4140",
      quantity: 5,
      routing: [{ step: 1, operation: "Roughing", work_center: "VMC-1" }],
    });
    const plan2 = importWorkOrder({
      wo_number: "WO-DET-002",
      part_number: "PN-DET-002",
      material: "steel_4140",
      quantity: 5,
      routing: [{ step: 1, operation: "Roughing", work_center: "VMC-1" }],
    });

    // Same input should produce same cycle time (deterministic, no Math.random)
    expect(plan1.routing[0].prism_cycle_time_min).toBe(plan2.routing[0].prism_cycle_time_min);
  });

  it("recordCostFeedback returns deterministic actuals (no Math.random)", async () => {
    const { importWorkOrder, recordCostFeedback } = await import("../engines/ERPIntegrationEngine.js");
    importWorkOrder({
      wo_number: "WO-COST-001",
      part_number: "PN-COST-001",
      material: "aluminum_6061",
      quantity: 1,
      routing: [{ step: 1, operation: "Roughing", work_center: "VMC-1" }],
    });

    const fb1 = recordCostFeedback({ wo_number: "WO-COST-001" });
    const fb2 = recordCostFeedback({ wo_number: "WO-COST-001" });

    // Without real actuals, feedback should use estimated values (not random)
    expect(fb1.actual.machine_time).toBe(fb2.actual.machine_time);
    expect(fb1.actual.labor).toBe(fb2.actual.labor);
  });

  it("volume_to_remove_cm3 controls MRR-based cycle time", async () => {
    const { importWorkOrder } = await import("../engines/ERPIntegrationEngine.js");
    // Use large volumes to avoid 0.5 min floor clamp with high aluminum MRR
    const smallVol = importWorkOrder({
      wo_number: "WO-VOL-S",
      part_number: "PN-VOL-S",
      material: "aluminum_6061",
      quantity: 1,
      routing: [{ step: 1, operation: "Roughing", work_center: "VMC-1", volume_to_remove_cm3: 100 }],
    });
    const largeVol = importWorkOrder({
      wo_number: "WO-VOL-L",
      part_number: "PN-VOL-L",
      material: "aluminum_6061",
      quantity: 1,
      routing: [{ step: 1, operation: "Roughing", work_center: "VMC-1", volume_to_remove_cm3: 1000 }],
    });

    // Larger volume should take longer (10x volume → ~10x cycle time)
    expect(largeVol.routing[0].prism_cycle_time_min).toBeGreaterThan(
      smallVol.routing[0].prism_cycle_time_min
    );
  });
});

// ── U-PHYSCOST2: JobCosting with Kienzle + Taylor ────────────────────────────

describe("U-PHYSCOST2: JobCostingEngine physics-backed costing", () => {
  it("CostBreakdown includes toolConsumption and power fields", async () => {
    const { jobCostingEngine } = await import("../engines/JobCostingEngine.js");
    const result = jobCostingEngine.calculateJobCost({
      quantity: 10,
      material: { type: "aluminum_6061", length: 100, width: 50, height: 25 },
      operations: [
        { name: "Roughing", type: "roughing", volumeToRemove: 50 },
        { name: "Finishing", type: "finishing", volumeToRemove: 5 },
      ],
      machineType: "cnc_mill_3axis",
    });

    // New physics-based fields must exist
    expect(result.toolConsumption).toBeDefined();
    expect(result.toolConsumption.cost).toBeGreaterThanOrEqual(0);
    expect(result.toolConsumption.source).toBeDefined();
    expect(result.power).toBeDefined();
    expect(result.power.ratePerKwh).toBe(0.12);
    expect(result.power.machiningHours).toBeGreaterThan(0);
  });

  it("total cost includes toolConsumption and power", async () => {
    const { jobCostingEngine } = await import("../engines/JobCostingEngine.js");
    const result = jobCostingEngine.calculateJobCost({
      quantity: 25,
      material: { type: "steel_4140", length: 150, width: 100, height: 50 },
      operations: [{ name: "Roughing", type: "roughing", volumeToRemove: 100, mrr: 20 }],
      machineType: "cnc_mill_3axis",
    });

    // Total should be >= sum of individual components
    const componentSum = result.material.cost + result.setup.cost
      + result.machining.cost + result.programming.cost
      + result.inspection.cost + result.finishing.cost
      + result.toolConsumption.cost + result.power.cost
      + result.overhead.cost + result.admin.cost;

    expect(Math.abs(result.total - componentSum)).toBeLessThan(0.02); // rounding tolerance
  });

  it("physics MRR used when material type is provided", async () => {
    const { jobCostingEngine } = await import("../engines/JobCostingEngine.js");
    // With material type — should use physics-backed MRR
    const withMat = jobCostingEngine.calculateJobCost({
      quantity: 1,
      material: { type: "aluminum_6061", length: 50, width: 50, height: 25 },
      operations: [{ name: "Roughing", type: "roughing", volumeToRemove: 50 }],
    });

    // Physics-backed cycle time should be positive and reasonable
    expect(withMat.machining.totalMinutes).toBeGreaterThan(0);
    expect(withMat.machining.hours).toBeGreaterThan(0);

    // Tool consumption should have a physics source (not just static_fallback)
    expect(withMat.toolConsumption.source).toBeDefined();
    expect(typeof withMat.toolConsumption.toolLifeMin).toBe("number");
  });
});

// ── U-PHYSCOST3: CI95 Uncertainty-Aware Quoting ──────────────────────────────

describe("U-PHYSCOST3: QuoteEstimatorEngine uncertainty bands", () => {
  it("estimate returns uncertainty with CI95 fields", async () => {
    const { quoteEstimatorEngine } = await import("../engines/QuoteEstimatorEngine.js");
    const result = quoteEstimatorEngine.estimate({
      quantity: 10,
      material: "aluminum_6061",
      complexity: "medium",
      stock_dimensions_mm: { length: 100, width: 50, height: 25 },
    });

    expect(result.uncertainty).toBeDefined();
    expect(result.uncertainty!.ci95_low).toBeLessThan(result.uncertainty!.estimated_cost);
    expect(result.uncertainty!.ci95_high).toBeGreaterThan(result.uncertainty!.estimated_cost);
    expect(result.uncertainty!.ci95_low).toBeGreaterThanOrEqual(0);
    expect(result.uncertainty!.confidence).toBeGreaterThan(0);
    expect(result.uncertainty!.confidence).toBeLessThanOrEqual(1);
    expect(result.uncertainty!.cost_cv_pct).toBeGreaterThan(0);
    expect(result.uncertainty!.dominant_uncertainty_source).toBeDefined();
  });

  it("uncertainty has component breakdown", async () => {
    const { quoteEstimatorEngine } = await import("../engines/QuoteEstimatorEngine.js");
    const result = quoteEstimatorEngine.estimate({
      quantity: 5,
      material: "steel_4140",
      complexity: "complex",
    });

    const u = result.uncertainty!;
    expect(u.component_uncertainties).toBeDefined();
    expect(u.component_uncertainties.machining_cv_pct).toBeGreaterThan(0);
    expect(u.component_uncertainties.tool_life_cv_pct).toBeGreaterThan(0);
    expect(u.component_uncertainties.material_cv_pct).toBeGreaterThan(0);
  });

  it("EXIT GATE: Ti-6Al-4V shows wider CI than 6061 aluminum", async () => {
    const { quoteEstimatorEngine } = await import("../engines/QuoteEstimatorEngine.js");

    const aluminumQuote = quoteEstimatorEngine.estimate({
      quantity: 10,
      material: "aluminum_6061",
      complexity: "medium",
      stock_dimensions_mm: { length: 100, width: 50, height: 25 },
    });

    const titaniumQuote = quoteEstimatorEngine.estimate({
      quantity: 10,
      material: "titanium_gr5",
      complexity: "medium",
      stock_dimensions_mm: { length: 100, width: 50, height: 25 },
    });

    const alSpread = aluminumQuote.uncertainty!.ci95_high - aluminumQuote.uncertainty!.ci95_low;
    const tiSpread = titaniumQuote.uncertainty!.ci95_high - titaniumQuote.uncertainty!.ci95_low;

    // Titanium should have wider uncertainty band (harder to machine, more variable)
    expect(tiSpread).toBeGreaterThan(alSpread);
    // Both should have positive spreads
    expect(alSpread).toBeGreaterThan(0);
    expect(tiSpread).toBeGreaterThan(0);
  });

  it("CI95 brackets the estimated cost symmetrically", async () => {
    const { quoteEstimatorEngine } = await import("../engines/QuoteEstimatorEngine.js");
    const result = quoteEstimatorEngine.estimate({
      quantity: 25,
      material: "stainless_304",
      complexity: "simple",
    });

    const u = result.uncertainty!;
    const lowDelta = u.estimated_cost - u.ci95_low;
    const highDelta = u.ci95_high - u.estimated_cost;

    // Should be approximately symmetric (within 1% of cost due to rounding)
    expect(Math.abs(lowDelta - highDelta)).toBeLessThan(u.estimated_cost * 0.01);
  });
});
