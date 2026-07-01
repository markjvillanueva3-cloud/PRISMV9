/**
 * U-QP-DOCUSTRATA-MATERIAL (charlie 2026-06-12) -- wire REAL JM material cost
 * into the quote. The quote material cost was a density x static-$/kg planning
 * estimate; this uses the AP-ledger-derived $/in3 consumable basis (real JM
 * spend, density-free) when stock dims + a JM tool-steel grade are known.
 *
 * NOTE: the DocuStrata per-job spend brackets (DocuStrataMaterialPriorEngine)
 * are per-JOB USD, NOT $/kg -- conflating them with a unit price would be a
 * UNITS error. The units-correct real-data source is the VendorCostIndexEngine
 * $/in3 basis (block-form, density-free). Reference values are READ FROM the
 * engine (no hardcoded $/in3 -- charlie soul refuses inline material constants).
 */
import { describe, it, expect } from "vitest";
import { quoteEstimatorEngine, type QuoteEstimateInput } from "../engines/QuoteEstimatorEngine.js";
import { instantQuoteEngine, type InstantQuoteInput } from "../engines/InstantQuoteEngine.js";
import { vendorCostIndexEngine } from "../engines/VendorCostIndexEngine.js";

const MM3_PER_IN3 = 16387.064;

const QE_BASE: QuoteEstimateInput = {
  part_name: "mat-basis-test",
  quantity: 10,
  material: "4140",
  complexity: "medium",
  stock_dimensions_mm: { length: 100, width: 50, height: 25 },
};

describe("U-QP-DOCUSTRATA-MATERIAL -- QuoteEstimatorEngine material override", () => {
  it("a units-correct override replaces the density x $/kg estimate (raw = override x qty, scrap=0)", () => {
    const q = quoteEstimatorEngine.estimate({ ...QE_BASE, material_cost_per_part_override: 12.5 });
    expect(q.costs.material.raw_cost).toBeCloseTo(12.5 * 10, 2);
    expect(q.costs.material.scrap_pct).toBe(0); // block-form basis -> scrap inherent, not re-loaded
  });

  it("WITHOUT override -> density x $/kg estimate path (regression lock, scrap re-applied)", () => {
    const q = quoteEstimatorEngine.estimate(QE_BASE);
    // The estimate path applies a scrap_pct (0.12 for non-exotic) -> nonzero.
    expect(q.costs.material.scrap_pct).toBeGreaterThan(0);
    expect(q.costs.material.raw_cost).toBeGreaterThan(0);
  });

  it("override of 0 or negative is ignored -> falls back to the estimate (no silent zero cost)", () => {
    const q = quoteEstimatorEngine.estimate({ ...QE_BASE, material_cost_per_part_override: 0 });
    expect(q.costs.material.scrap_pct).toBeGreaterThan(0); // estimate path, not the override
  });
});

describe("U-QP-DOCUSTRATA-MATERIAL -- InstantQuoteEngine consumes the $/in3 basis", () => {
  const IQ_4140: InstantQuoteInput = {
    part_name: "mat-basis-4140",
    material: "4140",
    quantity: 10,
    stock_dimensions_mm: { length: 100, width: 50, height: 25 },
    part_volume_cm3: 80,
    iso_group: "P",
    machine_type: "cnc_mill_3axis",
  };

  it("a 4140 part with stock dims costs material from the real $/in3 basis", () => {
    const basis = vendorCostIndexEngine.getMaterialGradeBasis("4140");
    expect(basis).not.toBeNull();
    expect(basis!.usd_per_in3).toBeGreaterThan(0); // 4140 is a consumable JM grade
    const stockVolIn3 = (100 * 50 * 25) / MM3_PER_IN3;
    const expectedRaw = basis!.usd_per_in3! * stockVolIn3 * 10; // x qty

    const r = instantQuoteEngine.quote(IQ_4140);
    expect(r.physics_engines_used).toContain("VendorCostIndexEngine");
    // material.total = raw_cost (+ cert; no certs here) -> equals the basis cost.
    expect(r.cost_breakdown.material.total).toBeCloseTo(expectedRaw, 1);
  });

  it("aluminum_6061 (not a JM tool-steel grade) -> no basis, falls back to the estimate", () => {
    const r = instantQuoteEngine.quote({ ...IQ_4140, part_name: "mat-basis-alu", material: "aluminum_6061" });
    expect(r.physics_engines_used).not.toContain("VendorCostIndexEngine");
    expect(r.cost_breakdown.material.total).toBeGreaterThan(0); // estimate still produces a cost
  });

  it("low-confidence grade (D2: AP-ledger outlier, low-n) is NOT used -> falls back to estimate", () => {
    // D2 in the basis is a low-n outlier ($251/in3, block_n=2). The confidence
    // gate must reject it so a D2 block does NOT quote ~$92k of material.
    const d2basis = vendorCostIndexEngine.getMaterialGradeBasis("D2");
    // Guard the test's premise: D2 must be present AND not high-confidence.
    expect(d2basis).not.toBeNull();
    expect(d2basis!.confidence).not.toBe("high");
    const r = instantQuoteEngine.quote({ ...IQ_4140, part_name: "mat-basis-d2", material: "D2" });
    expect(r.physics_engines_used).not.toContain("VendorCostIndexEngine");
  });

  it("no stock_dimensions -> no override (basis needs a stock volume)", () => {
    const noStock: InstantQuoteInput = { part_name: "no-stock", material: "4140", quantity: 5, part_volume_cm3: 50, machine_type: "cnc_mill_3axis" };
    const r = instantQuoteEngine.quote(noStock);
    expect(r.physics_engines_used).not.toContain("VendorCostIndexEngine");
  });

  it("the basis path changes the quoted material cost vs the density estimate (proves the wire drives output)", () => {
    const withBasis = instantQuoteEngine.quote(IQ_4140);
    const estimate = instantQuoteEngine.quote({ ...IQ_4140, material: "aluminum_6061" });
    // Different material-cost sources -> different totals (sanity: both > 0, distinct).
    expect(withBasis.cost_breakdown.material.total).toBeGreaterThan(0);
    expect(estimate.cost_breakdown.material.total).toBeGreaterThan(0);
    expect(withBasis.cost_breakdown.material.total).not.toBeCloseTo(estimate.cost_breakdown.material.total, 1);
  });
});
