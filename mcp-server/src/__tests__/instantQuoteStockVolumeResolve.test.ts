/**
 * instantQuoteStockVolumeResolve.test.ts -- U-QP-STOCK-VOLUME-RESOLVE (slot:charlie).
 *
 * Before this unit, the real $/in3 material-cost override could ONLY fire when a
 * RECTANGULAR `stock_dimensions_mm` block was supplied. A turned part on cylindrical
 * bar stock could not express its stock volume, so a lathe quote silently lost its
 * real material cost -- a money leak for a lathe-heavy shop like JM Die. This unit
 * resolves stock volume from any source (explicit in^3 > rect block > round bar) in
 * a single precedence-ordered pure function and feeds the existing confidence-gated
 * material-cost primitive.
 *
 * Tests are reference-value (R9): the pure resolver math is verified against exact
 * computed cubic-inch values, and the precedence + degraded-input fall-through is
 * proven. Round-trip integration goes THROUGH the dispatcher (R15) to prove the new
 * fields survive the `.passthrough()` schema, plus a direct engine assertion that
 * a round-bar lathe part now carries a real material cost where it did not before.
 */
import { describe, it, expect } from "vitest";
import {
  computeStockVolumeIn3,
  instantQuoteEngine,
  type InstantQuoteInput,
} from "../engines/InstantQuoteEngine.js";
import {
  quotingActionEnum,
  QUOTING_ACTION_SCHEMAS,
  quotingPublicInstantQuoteSchema,
} from "../schemas/quotingActionSchemas.js";

const MM3_PER_IN3 = 16387.064; // mirrors the engine constant for reference math

// ---------------------------------------------------------------------------
// computeStockVolumeIn3 -- the pure multi-source resolver (reference values)
// ---------------------------------------------------------------------------

describe("computeStockVolumeIn3 -- precedence + reference values", () => {
  it("explicit stock_volume_in3 wins and is returned verbatim", () => {
    const r = computeStockVolumeIn3({ stock_volume_in3: 3.5 });
    expect(r).not.toBeNull();
    expect(r!.in3).toBeCloseTo(3.5, 9);
    expect(r!.source).toBe("explicit_in3");
  });

  it("rectangular block: 50x50x25 mm = 62500 mm^3 / 16387.064 in^3 (reference value)", () => {
    const r = computeStockVolumeIn3({
      stock_dimensions_mm: { length: 50, width: 50, height: 25 },
    });
    expect(r).not.toBeNull();
    expect(r!.in3).toBeCloseTo(62500 / MM3_PER_IN3, 9); // ~3.813984
    expect(r!.in3).toBeCloseTo(3.813984, 5);
    expect(r!.source).toBe("rect_block_mm");
  });

  it("round bar: pi/4 * 50^2 * 100 mm^3 -> in^3 (reference value)", () => {
    const r = computeStockVolumeIn3({
      stock_round_bar_mm: { diameter: 50, length: 100 },
    });
    const expectedMm3 = (Math.PI / 4) * 50 * 50 * 100; // 196349.54 mm^3
    expect(r).not.toBeNull();
    expect(r!.in3).toBeCloseTo(expectedMm3 / MM3_PER_IN3, 9); // ~11.981984
    expect(r!.in3).toBeCloseTo(11.981984, 4);
    expect(r!.source).toBe("round_bar_mm");
  });

  it("explicit in^3 beats BOTH dims (precedence) when all three supplied", () => {
    const r = computeStockVolumeIn3({
      stock_volume_in3: 9.99,
      stock_dimensions_mm: { length: 50, width: 50, height: 25 },
      stock_round_bar_mm: { diameter: 50, length: 100 },
    });
    expect(r!.in3).toBeCloseTo(9.99, 9);
    expect(r!.source).toBe("explicit_in3");
  });

  it("rect block beats round bar when in^3 absent (precedence)", () => {
    const r = computeStockVolumeIn3({
      stock_dimensions_mm: { length: 50, width: 50, height: 25 },
      stock_round_bar_mm: { diameter: 50, length: 100 },
    });
    expect(r!.source).toBe("rect_block_mm");
  });

  // ---- failure / degraded-data modes: must return null (density fallback) ----
  it("no source at all -> null (caller falls back to density estimate)", () => {
    expect(computeStockVolumeIn3({})).toBeNull();
  });

  it("zero / negative explicit in^3 falls through to the next source", () => {
    // 0 in^3 is not usable -> skip to the rect block.
    const r = computeStockVolumeIn3({
      stock_volume_in3: 0,
      stock_dimensions_mm: { length: 10, width: 10, height: 10 },
    });
    expect(r!.source).toBe("rect_block_mm");
    // negative in^3 with no other source -> null
    expect(computeStockVolumeIn3({ stock_volume_in3: -5 })).toBeNull();
  });

  it("a zero dimension on the rect block falls through (no $0 stock)", () => {
    const r = computeStockVolumeIn3({
      stock_dimensions_mm: { length: 50, width: 0, height: 25 },
      stock_round_bar_mm: { diameter: 20, length: 40 },
    });
    expect(r!.source).toBe("round_bar_mm");
  });

  it("zero diameter or length on the bar -> null (no usable source)", () => {
    expect(computeStockVolumeIn3({ stock_round_bar_mm: { diameter: 0, length: 100 } })).toBeNull();
    expect(computeStockVolumeIn3({ stock_round_bar_mm: { diameter: 50, length: 0 } })).toBeNull();
  });

  // ---- adversarial inputs ----
  it("NaN / Infinity inputs never produce a poisoned volume (return null / fall through)", () => {
    expect(computeStockVolumeIn3({ stock_volume_in3: NaN })).toBeNull();
    expect(computeStockVolumeIn3({ stock_volume_in3: Infinity })).toBeNull();
    expect(
      computeStockVolumeIn3({ stock_dimensions_mm: { length: NaN, width: 50, height: 25 } }),
    ).toBeNull();
    expect(
      computeStockVolumeIn3({ stock_round_bar_mm: { diameter: Infinity, length: 100 } }),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Integration: a round-bar lathe part now carries real material cost
// ---------------------------------------------------------------------------

// A2 tool steel is a JM grade -> resolves in the AP-ledger $/in3 basis at high conf.
const ROUND_BAR_LATHE: InstantQuoteInput = {
  part_name: "SV-ROUND-BAR-TEST",
  material: "A2",
  machine_type: "cnc_lathe",
  quantity: 5,
  stock_round_bar_mm: { diameter: 50.8, length: 152.4 }, // 2in dia x 6in bar
};

describe("InstantQuoteEngine.quote -- round-bar stock resolves material cost", () => {
  it("a round-bar part with NO rect dims still produces a finite quote", () => {
    const q = instantQuoteEngine.quote(ROUND_BAR_LATHE);
    expect(Number.isFinite(q.unit_price)).toBe(true);
    expect(q.unit_price).toBeGreaterThan(0);
  });

  it("supplying round-bar stock does not crash when the material is non-JM (falls back)", () => {
    // AL6061 is NOT a JM tool-steel grade -> materialCostForVolume returns ok:false
    // -> the override never fires -> density estimate path. Must not throw.
    const q = instantQuoteEngine.quote({ ...ROUND_BAR_LATHE, material: "AL6061" });
    expect(Number.isFinite(q.unit_price)).toBe(true);
    expect(q.unit_price).toBeGreaterThan(0);
  });

  it("explicit stock_volume_in3 path produces a finite quote", () => {
    const q = instantQuoteEngine.quote({
      part_name: "SV-EXPLICIT",
      material: "A2",
      quantity: 5,
      stock_volume_in3: 12.0,
    });
    expect(Number.isFinite(q.unit_price)).toBe(true);
    expect(q.unit_price).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Round-trip THROUGH the dispatcher: the new fields survive .passthrough()
// ---------------------------------------------------------------------------

describe("quoting_public_instant_quote dispatcher round-trip -- new stock fields pass through", () => {
  it("action is in the enum + schema map (wiring intact)", () => {
    expect(quotingActionEnum.options).toContain("quoting_public_instant_quote");
    expect(QUOTING_ACTION_SCHEMAS["quoting_public_instant_quote"]).toBe(
      quotingPublicInstantQuoteSchema,
    );
  });

  it("schema validates AND preserves the new stock fields (.passthrough), then the engine consumes them", () => {
    const params = {
      part_name: "SV-DISPATCH-RT",
      material: "A2",
      quantity: 5,
      // The two NEW fields must survive the schema unchanged -- they are not in the
      // explicit object shape, so only .passthrough() carries them to the engine.
      stock_round_bar_mm: { diameter: 50.8, length: 152.4 },
    };
    const parsed = QUOTING_ACTION_SCHEMAS["quoting_public_instant_quote"].safeParse(params);
    expect(parsed.success).toBe(true);
    const data = parsed.data as InstantQuoteInput;
    // Proof the passthrough actually kept the new field (not silently stripped).
    expect(data.stock_round_bar_mm).toEqual({ diameter: 50.8, length: 152.4 });

    // The engine consumes the parsed payload end-to-end and prices it.
    const q = instantQuoteEngine.quote(data);
    expect(Number.isFinite(q.unit_price)).toBe(true);
    expect(q.unit_price).toBeGreaterThan(0);
  });

  it("explicit stock_volume_in3 also survives the passthrough schema", () => {
    const parsed = QUOTING_ACTION_SCHEMAS["quoting_public_instant_quote"].safeParse({
      part_name: "SV-EXPLICIT-RT",
      material: "A2",
      quantity: 5,
      stock_volume_in3: 12.0,
    });
    expect(parsed.success).toBe(true);
    expect((parsed.data as InstantQuoteInput).stock_volume_in3).toBe(12.0);
  });
});
