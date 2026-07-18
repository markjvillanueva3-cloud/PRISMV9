import { describe, it, expect } from "vitest";
import { SheetMetalQuoteEngine } from "../engines/SheetMetalQuoteEngine.js";

/**
 * U-SHEETMETAL-DIM-ALIAS (slot:charlie 2026-06-29) — regression lock.
 *
 * The SheetMetalQuotePage form submits the simpler {length_mm, width_mm} shape and
 * omits perimeter_mm. The engine reads flat_length_mm / flat_width_mm / perimeter_mm
 * directly, so an un-normalized page payload yielded NaN -> null pricing — a LIVE dead
 * pricing panel surfaced by the front-end live simulation (2026-06-29). These tests pin:
 *   1. the page shape now produces real positive pricing (the bug fix),
 *   2. an explicit flat_* / perimeter_mm payload is byte-for-byte unaffected (backward compat),
 *   3. genuinely-absent dimensions still degrade safely (no throw),
 *   4. explicit fields win over the simpler aliases (no silent override).
 */
const engine = new SheetMetalQuoteEngine();

// The exact field set SheetMetalQuotePage.tsx:48-57 sends.
const PAGE_SHAPE = {
  material: "aluminum_5052",
  thickness_mm: 2,
  length_mm: 300,
  width_mm: 200,
  quantity: 50,
  num_bends: 2,
  num_holes: 4,
  finish: "none",
} as unknown as Parameters<typeof engine.quote>[0];

describe("SheetMetalQuoteEngine — dimension alias normalization (U-SHEETMETAL-DIM-ALIAS)", () => {
  it("page shape {length_mm,width_mm,no perimeter} now produces real positive pricing (was null)", () => {
    const r = engine.quote(PAGE_SHAPE);
    expect(r.pricing.unit_price).not.toBeNull();
    expect(r.pricing.unit_price).toBeGreaterThan(0);
    expect(Number.isFinite(r.pricing.unit_price as number)).toBe(true);
    expect(r.pricing.total_price).toBeGreaterThan(0);
    // total ~= unit * qty (volume discounts allowed to lower it, never raise above unit*qty)
    expect(r.pricing.total_price as number).toBeLessThanOrEqual(
      (r.pricing.unit_price as number) * 50 + 0.01,
    );
    // material area must have been computed from the aliased L*W, not NaN
    expect(r.costs.material.sheet_area_mm2).toBe(300 * 200);
  });

  it("derives a rectangular perimeter (2*(L+W)) when the caller gives none", () => {
    const r = engine.quote(PAGE_SHAPE);
    // cutting cost is driven by perimeter; a real positive cutting total proves the derive worked
    expect(r.costs.cutting.total).toBeGreaterThan(0);
    expect(Number.isFinite(r.costs.cutting.total)).toBe(true);
  });

  it("explicit flat_*/perimeter_mm payload is unchanged (backward compatible)", () => {
    const explicit = {
      material: "stainless_304",
      thickness_mm: 3,
      flat_length_mm: 300,
      flat_width_mm: 200,
      perimeter_mm: 1000,
      quantity: 20,
      num_bends: 4,
    } as unknown as Parameters<typeof engine.quote>[0];
    const r = engine.quote(explicit);
    expect(r.pricing.unit_price).toBeGreaterThan(0);
    expect(r.costs.material.sheet_area_mm2).toBe(300 * 200);
  });

  it("explicit flat_length_mm WINS over the length_mm alias (no silent override)", () => {
    const both = {
      material: "mild_steel",
      thickness_mm: 2,
      flat_length_mm: 400, // explicit
      length_mm: 100, // alias — must be ignored
      flat_width_mm: 250,
      width_mm: 50, // alias — must be ignored
      quantity: 10,
    } as unknown as Parameters<typeof engine.quote>[0];
    const r = engine.quote(both);
    expect(r.costs.material.sheet_area_mm2).toBe(400 * 250); // explicit, not 100*50
  });

  it("an explicit perimeter_mm WINS over the derived rectangular perimeter", () => {
    const aliasOnly = engine.quote({
      material: "mild_steel", thickness_mm: 2, length_mm: 300, width_mm: 200, quantity: 10,
    } as unknown as Parameters<typeof engine.quote>[0]);
    const withExplicitPerim = engine.quote({
      material: "mild_steel", thickness_mm: 2, length_mm: 300, width_mm: 200,
      perimeter_mm: 5000, quantity: 10, // much larger perimeter than 2*(300+200)=1000
    } as unknown as Parameters<typeof engine.quote>[0]);
    // a larger explicit perimeter => strictly more cutting time/cost than the derived 1000mm
    expect(withExplicitPerim.costs.cutting.total).toBeGreaterThan(aliasOnly.costs.cutting.total);
  });

  it("genuinely-absent dimensions degrade without throwing (no L/W/perimeter at all)", () => {
    expect(() =>
      engine.quote({ material: "mild_steel", thickness_mm: 2, quantity: 5 } as unknown as Parameters<typeof engine.quote>[0]),
    ).not.toThrow();
  });
});
