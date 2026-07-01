import { describe, it, expect } from "vitest";
import { adaptSheetMetalFlat, redactThroughEnvelope } from "../routes/quote.js";

/**
 * U-SHEETMETAL-FLAT-ADAPT (slot:charlie 2026-06-29) — regression lock for the second half
 * of the SheetMetalQuotePage dead-panel fix (3-of-3 arm C P1).
 *
 * The engine returns a NESTED result; the page reads FLAT keys and calls `.toFixed(2)` on them
 * (`result.unit_price.toFixed(2)` etc.) -> a crashing/dead pricing panel. `adaptSheetMetalFlat`
 * maps nested->flat at the route, mapping ONLY engine-computed fields. These tests pin:
 *   1. authed full result -> all 7 flat keys the page reads are present + correct,
 *   2. anon-redacted result -> customer-facing price/total/lead survive, cost-breakdown bars omitted,
 *   3. the {type,text} prism_business envelope is unwrapped before mapping,
 *   4. a dispatcher error payload passes through untouched (so the route 500s it),
 *   5. nested keys are preserved (no nested consumer breaks).
 */

// The nested shape SheetMetalQuoteEngine actually emits (authed = full cost stack).
const NESTED_FULL = {
  quote_id: "SM26-1",
  part_name: "panel",
  quantity: 20,
  costs: {
    material: { sheet_area_mm2: 60000, sheets_needed: 2, cost_per_sheet: 30, total: 60 },
    cutting: { method: "laser_fiber", cut_time_min: 1, rate_hr: 90, pierce_count: 5, total: 27 },
    bending: { bend_count: 4, bend_time_min: 2, rate_hr: 80, setup_min: 10, total: 18 },
    finishing: { type: "none", per_part: 0, total: 0 },
  },
  pricing: { unit_price: 65, total_price: 1300 },
  lead_time: { cutting_days: 2, bending_days: 1, finishing_days: 0, total_standard_days: 6, total_rush_days: 3 },
  price_breaks: [{ qty: 1, unit_price: 90, total: 90 }],
};

// The page reads exactly these flat keys (SheetMetalQuotePage.tsx:69-72,166,169,175).
const PAGE_KEYS = ["unit_price", "total", "lead_time_days", "material_cost", "cutting_cost", "bending_cost", "finishing_cost"] as const;

function asObj(v: unknown): Record<string, unknown> {
  expect(v && typeof v === "object").toBe(true);
  return v as Record<string, unknown>;
}

describe("adaptSheetMetalFlat — nested->flat for the page (U-SHEETMETAL-FLAT-ADAPT)", () => {
  it("authed full result maps all 7 flat keys the page reads (no undefined .toFixed crash)", () => {
    const flat = asObj(adaptSheetMetalFlat(NESTED_FULL));
    expect(flat.unit_price).toBe(65);
    expect(flat.total).toBe(1300);
    expect(flat.lead_time_days).toBe(6);
    expect(flat.material_cost).toBe(60);
    expect(flat.cutting_cost).toBe(27);
    expect(flat.bending_cost).toBe(18);
    expect(flat.finishing_cost).toBe(0); // finishing.total=0 -> 0, not undefined
    for (const k of PAGE_KEYS) {
      // every flat key the page calls .toFixed() on must be a finite number (never undefined)
      expect(typeof flat[k]).toBe("number");
    }
  });

  it("unwraps the {type,text} prism_business envelope before mapping", () => {
    const envelope = { type: "text", text: JSON.stringify(NESTED_FULL) };
    const flat = asObj(adaptSheetMetalFlat(envelope));
    expect(flat.unit_price).toBe(65);
    expect(flat.total).toBe(1300);
    expect(flat.lead_time_days).toBe(6);
  });

  it("anon-redacted result: price/total/lead survive, cost-breakdown bars omitted (no $undefined bar)", () => {
    // redactThroughEnvelope empties costs to {} for an anon caller; feed that to the adapter.
    const redacted = redactThroughEnvelope({ type: "text", text: JSON.stringify(NESTED_FULL) });
    const flat = asObj(adaptSheetMetalFlat(redacted));
    // customer-facing fields the page shows to anon must still render
    expect(flat.unit_price).toBe(65);
    expect(flat.total).toBe(1300);
    expect(flat.lead_time_days).toBe(6);
    // cost-basis breakdown bars must be ABSENT (redaction stripped costs.* -> adapter omits them)
    expect(flat.material_cost).toBeUndefined();
    expect(flat.cutting_cost).toBeUndefined();
    expect(flat.bending_cost).toBeUndefined();
    expect(flat.finishing_cost).toBeUndefined();
  });

  it("a dispatcher error payload passes through untouched (route 500s it)", () => {
    const err = { error: "sheet_metal_quote failed: bad input" };
    expect(adaptSheetMetalFlat(err)).toBe(err);
    // and inside an envelope
    const errEnv = { type: "text", text: JSON.stringify({ error: "boom" }) };
    const out = adaptSheetMetalFlat(errEnv);
    // error inside text -> passthrough of the original envelope (not a flat object with null prices)
    expect((out as Record<string, unknown>).unit_price).toBeUndefined();
  });

  it("preserves the nested keys so a nested consumer is unaffected", () => {
    const flat = asObj(adaptSheetMetalFlat(NESTED_FULL));
    expect(flat.pricing).toEqual({ unit_price: 65, total_price: 1300 });
    expect(asObj(flat.costs).material).toBeDefined();
    expect(flat.quote_id).toBe("SM26-1");
  });

  it("missing pricing/lead_time degrade to null (not undefined) for JSON safety", () => {
    const flat = asObj(adaptSheetMetalFlat({ quote_id: "x", quantity: 1 }));
    expect(flat.unit_price).toBeNull();
    expect(flat.total).toBeNull();
    expect(flat.lead_time_days).toBeNull();
  });
});
