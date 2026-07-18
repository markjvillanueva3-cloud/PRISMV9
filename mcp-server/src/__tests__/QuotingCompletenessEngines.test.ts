/**
 * QUOTING-COMPLETENESS engines — combined tests for iters 3-6
 *
 * Covers (one suite per engine):
 *   - LeadTimePricingTierEngine — 3-tier emit (rush/standard/economy)
 *   - SecondaryOpsQuotePricingEngine — 11 op types, per-op pricing
 *   - TolerancePricingImpactEngine — per-dim cost multipliers
 *   - CrossPartToolingSynergyEngine — payback + beneficiary scan
 *
 * Real reference values throughout — NO toBeDefined stubs.
 *
 * @milestone QUOTING-COMPLETENESS-MS0/U-QP-LEAD-TIME-TIERS + U-QP-SECONDARY-OPS-PRICING + U-QP-TOL-PRICING + U-QP-CROSS-PART-SYNERGY
 */

import { describe, it, expect } from "vitest";
import { leadTimePricingTierEngine } from "../engines/LeadTimePricingTierEngine.js";
import { secondaryOpsQuotePricingEngine } from "../engines/SecondaryOpsQuotePricingEngine.js";
import { tolerancePricingImpactEngine } from "../engines/TolerancePricingImpactEngine.js";
import { crossPartToolingSynergyEngine } from "../engines/CrossPartToolingSynergyEngine.js";

// ────────────────────────────────────────────────────────────────────────
// LeadTimePricingTierEngine
// ────────────────────────────────────────────────────────────────────────

describe("LeadTimePricingTierEngine — U-QP-LEAD-TIME-TIERS", () => {
  it("emits 3 tiers sorted by lead-time ascending", () => {
    const r = leadTimePricingTierEngine.emit({ base_unit_price: 100, base_lead_days: 14, quantity: 10 });
    expect(r.ok).toBe(true);
    expect(r.tiers.length).toBe(3);
    expect(r.tiers[0].tier).toBe("rush");
    expect(r.tiers[1].tier).toBe("standard");
    expect(r.tiers[2].tier).toBe("economy");
    expect(r.tiers[0].lead_time_days).toBe(7);   // 14 - 7
    expect(r.tiers[1].lead_time_days).toBe(14);
    expect(r.tiers[2].lead_time_days).toBe(28);  // 14 + 14
  });

  it("applies default 1.5/1.0/0.92 multipliers correctly", () => {
    const r = leadTimePricingTierEngine.emit({ base_unit_price: 100, base_lead_days: 14, quantity: 1 });
    expect(r.tiers.find(t => t.tier === "rush")!.unit_price).toBe(150);
    expect(r.tiers.find(t => t.tier === "standard")!.unit_price).toBe(100);
    expect(r.tiers.find(t => t.tier === "economy")!.unit_price).toBe(92);
  });

  it("REJECTS negative base price", () => {
    const r = leadTimePricingTierEngine.emit({ base_unit_price: -10, base_lead_days: 5, quantity: 1 });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/positive/);
  });

  it("clamps negative lead time to 0 (rush beats baseline)", () => {
    const r = leadTimePricingTierEngine.emit({ base_unit_price: 100, base_lead_days: 3, quantity: 1 });
    // rush = 3 - 7 = -4 → clamped to 0
    expect(r.tiers.find(t => t.tier === "rush")!.lead_time_days).toBe(0);
  });

  it("custom config override works", () => {
    const r = leadTimePricingTierEngine.emit({
      base_unit_price: 100, base_lead_days: 14, quantity: 1,
      configs: { rush: { priceMultiplier: 2.0 } },
    });
    expect(r.tiers.find(t => t.tier === "rush")!.unit_price).toBe(200);
  });
});

// ────────────────────────────────────────────────────────────────────────
// SecondaryOpsQuotePricingEngine
// ────────────────────────────────────────────────────────────────────────

describe("SecondaryOpsQuotePricingEngine — U-QP-SECONDARY-OPS-PRICING", () => {
  it("prices single op (laser_marking) correctly", () => {
    const r = secondaryOpsQuotePricingEngine.priceOps({ ops: ["laser_marking"], quantity: 100 });
    expect(r.ok).toBe(true);
    expect(r.line_items.length).toBe(1);
    expect(r.line_items[0].op).toBe("laser_marking");
    // 35 + (0.85 * 100) = 35 + 85 = 120
    expect(r.line_items[0].line_total_usd).toBe(120);
    expect(r.line_items[0].outsourced).toBe(false);
  });

  it("dedups repeated ops in input", () => {
    const r = secondaryOpsQuotePricingEngine.priceOps({ ops: ["grinding", "grinding", "grinding"], quantity: 10 });
    expect(r.line_items.length).toBe(1);
  });

  it("outsourced lead-days SUM, in-house take MAX (overlap model)", () => {
    const r = secondaryOpsQuotePricingEngine.priceOps({
      ops: ["hardening", "painting", "grinding", "honing"],
      quantity: 10,
    });
    // hardening (outsourced, 7d) + painting (outsourced, 5d) = 12 sequential
    // grinding (in-house, 1d) + honing (in-house, 2d) = max(1, 2) = 2 parallel
    // total = 12 + 2 = 14
    expect(r.total_lead_days_delta).toBe(14);
    expect(r.any_outsourced).toBe(true);
  });

  it("includes material_pct uplift when base_material_cost supplied", () => {
    const r = secondaryOpsQuotePricingEngine.priceOps({
      ops: ["painting"],
      quantity: 10,
      base_material_cost_usd: 200,
    });
    // painting material_pct 0.05 → 200 * 0.05 = 10 per part
    expect(r.line_items[0].material_cost_added_usd).toBe(10);
    // line total: 60 + (3.25 * 10) + (10 * 10) = 60 + 32.5 + 100 = 192.5
    expect(r.line_items[0].line_total_usd).toBe(192.5);
  });

  it("REJECTS unknown op", () => {
    const r = secondaryOpsQuotePricingEngine.priceOps({
      ops: ["unknown_op" as any],
      quantity: 10,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/unknown secondary op/);
  });

  it("empty ops list returns ok=true with empty totals", () => {
    const r = secondaryOpsQuotePricingEngine.priceOps({ ops: [], quantity: 10 });
    expect(r.ok).toBe(true);
    expect(r.line_items.length).toBe(0);
    expect(r.total_secondary_ops_usd).toBe(0);
  });

  it("listAvailableOps returns all 11 op types", () => {
    expect(secondaryOpsQuotePricingEngine.listAvailableOps()).toHaveLength(11);
  });
});

// ────────────────────────────────────────────────────────────────────────
// TolerancePricingImpactEngine
// ────────────────────────────────────────────────────────────────────────

describe("TolerancePricingImpactEngine — U-QP-TOL-PRICING", () => {
  it("classifies bands per ISO 2768 + ULTRA_PRECISION threshold", () => {
    expect(tolerancePricingImpactEngine.classifyBand(0.0008)).toBe("ULTRA_PRECISION");
    expect(tolerancePricingImpactEngine.classifyBand(0.005)).toBe("TIGHT_GRIND");
    expect(tolerancePricingImpactEngine.classifyBand(0.025)).toBe("ISO_FINE");
    expect(tolerancePricingImpactEngine.classifyBand(0.1)).toBe("ISO_MEDIUM");
    expect(tolerancePricingImpactEngine.classifyBand(0.5)).toBe("ISO_COARSE");
  });

  it("ISO_MEDIUM band ±0.1mm → multiplier ~1.0 (baseline)", () => {
    const r = tolerancePricingImpactEngine.priceTolerances({
      callouts: [{ dimension: "WIDTH", band_mm: 0.1 }],
      base_machining_cost_usd: 100,
    });
    expect(r.ok).toBe(true);
    expect(r.per_dimension[0].cost_multiplier).toBeCloseTo(1.0, 2);
    expect(r.per_dimension[0].added_cost_usd).toBeCloseTo(0, 1);
  });

  it("TIGHT_GRIND band ±0.005mm dramatically increases cost", () => {
    const r = tolerancePricingImpactEngine.priceTolerances({
      callouts: [{ dimension: "BORE", band_mm: 0.005 }],
      base_machining_cost_usd: 100,
    });
    // TIGHT_GRIND class_mult 2.10 + precision^0.6 (0.1/0.005)^0.6 = 20^0.6 ≈ 6.03
    // → 2.10 * 6.03 ≈ 12.7 — well above 1.0
    expect(r.per_dimension[0].cost_multiplier).toBeGreaterThan(5);
    expect(r.tightest_class).toBe("TIGHT_GRIND");
  });

  it("multiple callouts aggregate with damping (not naive product)", () => {
    const r = tolerancePricingImpactEngine.priceTolerances({
      callouts: [
        { dimension: "D1", band_mm: 0.05 },
        { dimension: "D2", band_mm: 0.05 },
        { dimension: "D3", band_mm: 0.05 },
      ],
      base_machining_cost_usd: 100,
    });
    expect(r.total_multiplier).toBeGreaterThan(1);
    // 3 ISO_FINE @ band 0.05 → per-callout cost_multiplier ≈ 2.047 (class 1.35 × precision (0.1/0.05)^0.6 = 1.516)
    // Naive multiplicative product: 2.047^3 ≈ 8.57. Damped aggregate: 1.524^3 ≈ 3.53 — well under naive.
    const naiveProduct = Math.pow(r.per_dimension[0].cost_multiplier, 3);
    expect(r.total_multiplier).toBeLessThan(naiveProduct);
  });

  it("surface_finish_ra ≤ 0.4 μm bumps multiplier (grind needed)", () => {
    const noFinish = tolerancePricingImpactEngine.priceTolerances({
      callouts: [{ dimension: "X", band_mm: 0.1 }],
      base_machining_cost_usd: 100,
    });
    const withFinish = tolerancePricingImpactEngine.priceTolerances({
      callouts: [{ dimension: "X", band_mm: 0.1, surface_finish_ra_um: 0.3 }],
      base_machining_cost_usd: 100,
    });
    expect(withFinish.per_dimension[0].cost_multiplier).toBeGreaterThan(noFinish.per_dimension[0].cost_multiplier);
  });

  it("REJECTS negative base cost", () => {
    const r = tolerancePricingImpactEngine.priceTolerances({
      callouts: [{ dimension: "X", band_mm: 0.1 }],
      base_machining_cost_usd: -10,
    });
    expect(r.ok).toBe(false);
  });

  it("empty callouts returns multiplier=1, no added cost", () => {
    const r = tolerancePricingImpactEngine.priceTolerances({
      callouts: [], base_machining_cost_usd: 100,
    });
    expect(r.ok).toBe(true);
    expect(r.total_multiplier).toBe(1);
    expect(r.total_added_cost_usd).toBe(0);
    expect(r.tightest_class).toBe(null);
  });
});

// ────────────────────────────────────────────────────────────────────────
// CrossPartToolingSynergyEngine
// ────────────────────────────────────────────────────────────────────────

describe("CrossPartToolingSynergyEngine — U-QP-CROSS-PART-SYNERGY", () => {
  const proposal = {
    type: "tool" as const,
    description: "5mm carbide endmill",
    cost_usd: 350,
    savings_per_part_usd_quoted: 0.50,
    quoted_annual_volume: 1000,
    match: {
      materials: ["aluminum_6061"],
      feature_tokens: ["small-bore"],
    },
  };

  const corpus = [
    { part_id: "P-001", customer: "ACME", material: "aluminum_6061", annual_volume: 500, feature_tokens: ["small-bore"] },
    { part_id: "P-002", customer: "BETA", material: "steel_a36", annual_volume: 1000, feature_tokens: ["thin-wall"] },
    { part_id: "P-003", customer: "ACME", material: "aluminum_6061", annual_volume: 200, feature_tokens: ["small-bore", "ribbed"] },
  ];

  it("finds beneficiaries matching on material or feature_tokens", () => {
    const r = crossPartToolingSynergyEngine.analyze({ proposal, corpus });
    expect(r.ok).toBe(true);
    expect(r.beneficiaries.length).toBe(2); // P-001 + P-003
    expect(r.beneficiaries.find(b => b.part_id === "P-002")).toBe(undefined);
  });

  it("recommends BUY when payback ≤12mo", () => {
    // Quoted: 0.50 × 1000 = 500/yr. Beneficiaries: 0.50 × 500 + 0.50 × 200 = 350/yr. Total = 850/yr.
    // Payback: 350 / (850/12) = 4.94mo → BUY
    const r = crossPartToolingSynergyEngine.analyze({ proposal, corpus });
    expect(r.recommendation).toBe("buy");
    expect(r.payback_months).toBeLessThanOrEqual(12);
    expect(r.total_annual_savings_usd).toBe(850);
  });

  it("recommends SKIP when no annual savings projected", () => {
    const noSavings = { ...proposal, savings_per_part_usd_quoted: 0, quoted_annual_volume: 0 };
    const r = crossPartToolingSynergyEngine.analyze({ proposal: noSavings, corpus: [] });
    expect(r.recommendation).toBe("skip");
    expect(r.payback_months).toBe(null);
  });

  it("recommends CONSIDER when payback 12-24mo", () => {
    // Tune so payback lands in middle: cost 5000, savings 0.50×1000 + 0.50×500 + 0.50×200 = 850/yr
    // 5000 / (850/12) = 70.6mo → SKIP. Bump savings_per_part to 3.50 → quoted 3500 + benef (500+200)*3.50 = 3500 + 2450 = 5950
    // 5000 / (5950/12) = 10.08mo → BUY. Need ~5000 cost, ~3000/yr savings → 20mo → CONSIDER
    const consider = { ...proposal, cost_usd: 5000, savings_per_part_usd_quoted: 1.50 };
    const r = crossPartToolingSynergyEngine.analyze({ proposal: consider, corpus });
    // Quoted: 1.50×1000 = 1500/yr; Benef: 1.50×500 + 1.50×200 = 1050; Total = 2550/yr
    // Payback: 5000 / (2550/12) = 23.5mo → CONSIDER
    expect(r.recommendation).toBe("consider");
    expect(r.payback_months).toBeGreaterThan(12);
    expect(r.payback_months).toBeLessThanOrEqual(24);
  });

  it("REJECTS investment with non-positive cost", () => {
    const bad = { ...proposal, cost_usd: 0 };
    const r = crossPartToolingSynergyEngine.analyze({ proposal: bad, corpus });
    expect(r.ok).toBe(false);
  });

  it("beneficiaries sorted by annual_savings_usd descending", () => {
    const r = crossPartToolingSynergyEngine.analyze({ proposal, corpus });
    for (let i = 1; i < r.beneficiaries.length; i++) {
      expect(r.beneficiaries[i].annual_savings_usd).toBeLessThanOrEqual(r.beneficiaries[i - 1].annual_savings_usd);
    }
  });
});
