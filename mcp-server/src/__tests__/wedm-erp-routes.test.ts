/**
 * WEDM-ERP-MS0 U-WEDM-ERP04..07 integration tests
 *
 * Tests the full pipeline through the router's engines rather than spinning
 * up Express. Validates the Zod schemas reject bad input, and that the end-
 * to-end flow (estimate → quote → job → complete → invoice → approve) works.
 */
import { describe, it, expect } from "vitest";
import {
  wedmEstimateSchema,
  wedmFromProgramSchema,
  wedmQuantityBreaksSchema,
  wedmCreditCostSchema,
  wedmQuoteCreateSchema,
  wedmJobCreateSchema,
  wedmJobCompleteSchema,
  wedmOverageApproveSchema,
  wedmOverageRejectSchema,
} from "../schemas/wedmErpActionSchemas.js";
import { EDMCostDocumentationEngine } from "../engines/EDMCostDocumentationEngine.js";
import { WEDMQuoteBridgeEngine } from "../engines/WEDMQuoteBridgeEngine.js";
import { WEDMCreditCostEngine } from "../engines/WEDMCreditCostEngine.js";
import { WEDMJobCreatorEngine } from "../engines/WEDMJobCreatorEngine.js";
import { WEDMInvoiceLineEngine } from "../engines/WEDMInvoiceLineEngine.js";
import { WEDMOverageApprovalEngine } from "../engines/WEDMOverageApprovalEngine.js";
import { createWedmErpRouter } from "../routes/wedm-erp.js";

function makeProgram() {
  return {
    success: true,
    program_text: "G21\nG90\nG00\nM02",
    line_count: 80,
    controller: "mitsubishi-mv",
    profiles_cut: 1,
    passes_per_profile: 3,
    estimated_time_min: 60,
    predicted_ra_um: 1.8,
    predicted_accuracy_mm: 0.005,
    wire_consumption_m: 300,
    pass_details: [
      { pass_number: 1, type: "rough", offset_mm: 0.15, feed_mm_min: 3.2, e_pack_code: "E240", wire_speed_m_min: 7.5, tension_N: 10, predicted_ra_um: 3.2, predicted_recast_um: 15 },
      { pass_number: 2, type: "skim", offset_mm: 0.09, feed_mm_min: 6.0, e_pack_code: "E520", wire_speed_m_min: 6.0, tension_N: 12, predicted_ra_um: 2.4, predicted_recast_um: 8 },
      { pass_number: 3, type: "skim", offset_mm: 0.04, feed_mm_min: 9.0, e_pack_code: "E830", wire_speed_m_min: 4.5, tension_N: 14, predicted_ra_um: 1.8, predicted_recast_um: 3 },
    ],
    setup_sheet: {
      part_name: "Die Insert",
      part_number: "DI-1234",
      material: "D2",
      thickness_mm: 32,
      wire_type: "brass",
      wire_diameter_mm: 0.25,
    } as any,
    geometry_summary: {} as any,
    warnings: [],
    stages_completed: [],
    cycle_time_breakdown: {} as any,
    confidence_score: {} as any,
  };
}

describe("WEDM-ERP Routes — Schemas", () => {
  it("accepts a valid estimate request", () => {
    const r = wedmEstimateSchema.safeParse({
      material: "D2",
      perimeter_mm: 150,
      thickness_mm: 32,
    });
    expect(r.success).toBe(true);
  });

  it("rejects estimate with negative dimensions", () => {
    const r = wedmEstimateSchema.safeParse({
      material: "D2",
      perimeter_mm: -10,
      thickness_mm: 32,
    });
    expect(r.success).toBe(false);
  });

  it("rejects estimate with missing material", () => {
    const r = wedmEstimateSchema.safeParse({
      perimeter_mm: 150,
      thickness_mm: 32,
    });
    expect(r.success).toBe(false);
  });

  it("estimate defaults pass_count to 3 and wire_type to brass", () => {
    const r = wedmEstimateSchema.parse({
      material: "D2",
      perimeter_mm: 150,
      thickness_mm: 32,
    });
    expect(r.pass_count).toBe(3);
    expect(r.wire_type).toBe("brass");
    expect(r.wire_diameter_mm).toBeCloseTo(0.25, 3);
  });

  it("quantity-breaks schema enforces non-empty array", () => {
    const bad = wedmQuantityBreaksSchema.safeParse({
      cost_estimate: { anything: 1 },
      quantities: [],
    });
    expect(bad.success).toBe(false);
  });

  it("credit-cost schema enforces pass bounds", () => {
    const bad = wedmCreditCostSchema.safeParse({
      perimeter_mm: 100,
      thickness_mm: 32,
      passes: 10,
    });
    expect(bad.success).toBe(false);
  });

  it("job/complete schema accepts a full actuals payload", () => {
    const r = wedmJobCompleteSchema.safeParse({
      actual_cutting_time_min: 62,
      actual_wire_m: 310,
      actual_passes: 3,
      actual_cost_usd: 520,
      customer_email: "customer@example.com",
      tax_rate_pct: 8.5,
    });
    expect(r.success).toBe(true);
  });

  it("overage/approve schema requires approver", () => {
    const r = wedmOverageApproveSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it("overage/reject schema accepts optional reason", () => {
    const r = wedmOverageRejectSchema.safeParse({ approver: "customer@x.com" });
    expect(r.success).toBe(true);
  });

  it("quote/create schema populates defaults", () => {
    const r = wedmQuoteCreateSchema.parse({
      customer: "JM Die",
      part_name: "Die Insert",
      cost_estimate: { anything: 1 },
    });
    expect(r.quantity).toBe(1);
    expect(r.lead_time_days).toBe(7);
    expect(r.valid_days).toBe(30);
  });

  it("job/create schema accepts program_result + optional options", () => {
    const r = wedmJobCreateSchema.safeParse({
      program_result: makeProgram(),
      options: { customer: "JM Die", quantity: 2 },
    });
    expect(r.success).toBe(true);
  });

  it("from-program schema accepts a minimal program_result", () => {
    const r = wedmFromProgramSchema.safeParse({ program_result: makeProgram() });
    expect(r.success).toBe(true);
  });
});

describe("WEDM-ERP Routes — End-to-end pipeline", () => {
  it("runs estimate → quote → job → complete → approve flow", () => {
    // 1. Estimate
    const engine = new EDMCostDocumentationEngine();
    const cost = engine.estimateCost({
      part_id: "DI-1234",
      material: "tool_steel",
      machine_time: {
        machine_rate_per_hr: 85,
        setup_hrs: 1,
        cutting_hrs: 1.0,
      },
      wire: {
        wire_type: "brass",
        wire_diameter_mm: 0.25,
        cutting_hrs: 1.0,
        wire_speed_mm_per_min: 100,
      },
      consumables: { cutting_hrs: 1.0 },
      overhead_pct: 0.18,
      margin_pct: 0.25,
      quantity: 1,
    });
    expect(cost.total_per_part).toBeGreaterThan(0);

    // 2. Bridge to quote
    const bridge = WEDMQuoteBridgeEngine.toQuoteLineItems(cost, 2);
    expect(bridge.total).toBeGreaterThan(0);
    expect(bridge.line_items.length).toBeGreaterThanOrEqual(4);

    // 3. Build a quote
    const quote = {
      quote_number: "Q-TEST-1",
      customer: "JM Die",
      part_name: "Die Insert",
      quantity: 2,
      unit_price: bridge.total / 2,
      total_price: bridge.total,
      lead_time_days: 7,
      markup_pct: 0,
      margin_pct: 0,
      line_items: bridge.line_items,
      terms: [],
      valid_days: 30,
      notes: [],
    };

    // 4. Create job from program + quote
    const packet = WEDMJobCreatorEngine.createJob(
      makeProgram(),
      { customer: "JM Die", quantity: 2 },
      quote,
    );
    expect(packet.jobType).toBe("wedm");
    expect(packet.quoteRef?.quote_number).toBe("Q-TEST-1");

    // 5. Complete with small variance (auto-approve)
    const draft = WEDMInvoiceLineEngine.createInvoice(
      packet,
      {
        actual_cutting_time_min: 66, // +10%
        actual_wire_m: 315,
        actual_passes: 3,
        actual_cost_usd: quote.total_price * 1.1,
      },
      { machine_rate_usd_per_hr: 85 },
    );
    expect(draft.requires_overage_approval).toBe(false);
    expect(draft.overage_approval?.status).toBe("auto_approved");
  });

  it("gated flow — large overage pending approval, then approve unlocks invoice", () => {
    const packet = WEDMJobCreatorEngine.createJob(
      makeProgram(),
      { customer: "JM Die", quantity: 1 },
      {
        quote_number: "Q-GATED",
        customer: "JM Die",
        part_name: "Die",
        quantity: 1,
        unit_price: 500,
        total_price: 500,
        lead_time_days: 7,
        markup_pct: 0,
        margin_pct: 0,
        line_items: [],
        terms: [],
        valid_days: 30,
        notes: [],
      },
    );

    const draft = WEDMInvoiceLineEngine.createInvoice(packet, {
      actual_cutting_time_min: 90, // +50%
      actual_wire_m: 450,
      actual_passes: 4,
      actual_cost_usd: 750, // +50% over $500
    });
    expect(draft.requires_overage_approval).toBe(true);
    expect(draft.overage_approval?.status).toBe("pending");

    const approved = WEDMOverageApprovalEngine.approve(draft.overage_approval!, "customer@example.com");
    expect(approved.status).toBe("approved");

    const final = WEDMInvoiceLineEngine.finalizeAfterApproval(draft, approved);
    expect(final.requires_overage_approval).toBe(false);
  });

  it("credit-cost calc returns positive credits for nontrivial jobs", () => {
    const r = WEDMCreditCostEngine.calculate({
      perimeter_mm: 200,
      thickness_mm: 32,
      passes: 3,
      taper_count: 0,
    });
    expect(r.credits).toBeGreaterThan(0);
  });

  it("quantity-breaks produce monotonically decreasing unit costs", () => {
    const engine = new EDMCostDocumentationEngine();
    const cost = engine.estimateCost({
      part_id: "P1",
      material: "tool_steel",
      machine_time: { machine_rate_per_hr: 85, setup_hrs: 1, cutting_hrs: 1 },
      wire: { wire_type: "brass", wire_diameter_mm: 0.25, cutting_hrs: 1, wire_speed_mm_per_min: 100 },
      consumables: { cutting_hrs: 1 },
    });
    const breaks = WEDMQuoteBridgeEngine.getQuantityBreaks(cost, { quantities: [1, 5, 10, 25, 50] });
    for (let i = 1; i < breaks.length; i++) {
      expect(breaks[i].unit_price).toBeLessThanOrEqual(breaks[i - 1].unit_price);
    }
  });

  it("router constructs without throwing (smoke test)", () => {
    expect(() => createWedmErpRouter()).not.toThrow();
  });
});
