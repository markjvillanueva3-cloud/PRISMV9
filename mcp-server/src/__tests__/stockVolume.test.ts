/**
 * stockVolume.test.ts -- U-QP-STOCK-VOLUME-CORE.
 *
 * The shared, unit-agnostic stock-volume resolver that QuoteEstimatorEngine and
 * InstantQuoteEngine both delegate to (breaking the prior duplicate-resolver fork
 * without an import cycle). Tests pin the mm^3 core with REAL reference values
 * (R9), the precedence order, the cross-unit consistency invariant (in^3 and cm^3
 * must agree via the conversion), and the finite/positive guards.
 */
import { describe, it, expect } from "vitest";
import {
  resolveStockVolumeMm3,
  resolveStockVolumeIn3,
  resolveStockVolumeCm3,
  MM3_PER_IN3,
  MM3_PER_CM3,
} from "../utils/stockVolume.js";

// Hand-computed references:
//   rect 50.8 x 25.4 x 12.7 mm  -> 50.8*25.4*12.7 = 16387.064 mm^3 (= exactly 1 in^3)
//   round bar 25.4 dia x 100 L  -> pi/4 * 25.4^2 * 100 = 50670.748 mm^3
const RECT_MM3 = 50.8 * 25.4 * 12.7;          // 16387.064
const BAR_MM3 = (Math.PI / 4) * 25.4 * 25.4 * 100; // 50670.748...

describe("resolveStockVolumeMm3 -- geometry + precedence", () => {
  it("rect block: L*W*H in mm^3 (reference 16387.064 = exactly 1 in^3)", () => {
    const r = resolveStockVolumeMm3({ stock_dimensions_mm: { length: 50.8, width: 25.4, height: 12.7 } });
    expect(r).not.toBeNull();
    expect(r!.source).toBe("rect_block_mm");
    expect(r!.mm3).toBeCloseTo(16387.064, 3);
  });

  it("round bar: pi/4*d^2*L in mm^3 (reference 50670.748)", () => {
    const r = resolveStockVolumeMm3({ stock_round_bar_mm: { diameter: 25.4, length: 100 } });
    expect(r!.source).toBe("round_bar_mm");
    expect(r!.mm3).toBeCloseTo(50670.748, 2);
  });

  it("explicit in^3 converts up to mm^3 and tags explicit_in3 (highest precedence)", () => {
    const r = resolveStockVolumeMm3({ stock_volume_in3: 2 });
    expect(r!.source).toBe("explicit_in3");
    expect(r!.mm3).toBeCloseTo(2 * MM3_PER_IN3, 6); // 32774.128
  });

  it("precedence explicit > rect > round-bar (all three set -> explicit wins)", () => {
    const r = resolveStockVolumeMm3({
      stock_volume_in3: 1,
      stock_dimensions_mm: { length: 50.8, width: 25.4, height: 12.7 },
      stock_round_bar_mm: { diameter: 25.4, length: 100 },
    });
    expect(r!.source).toBe("explicit_in3");
    expect(r!.mm3).toBeCloseTo(MM3_PER_IN3, 6);
  });

  it("rect beats round-bar when both (no explicit) are set", () => {
    const r = resolveStockVolumeMm3({
      stock_dimensions_mm: { length: 50.8, width: 25.4, height: 12.7 },
      stock_round_bar_mm: { diameter: 25.4, length: 100 },
    });
    expect(r!.source).toBe("rect_block_mm");
  });
});

describe("resolveStockVolume -- unit conversions agree with the mm^3 core", () => {
  it("in^3 = mm^3 / 16387.064 (rect block exactly 1 in^3)", () => {
    const r = resolveStockVolumeIn3({ stock_dimensions_mm: { length: 50.8, width: 25.4, height: 12.7 } });
    expect(r!.in3).toBeCloseTo(1, 6); // 16387.064 / 16387.064
    expect(r!.source).toBe("rect_block_mm");
  });

  it("cm^3 = mm^3 / 1000 (round bar 50.670748 cm^3)", () => {
    const r = resolveStockVolumeCm3({ stock_round_bar_mm: { diameter: 25.4, length: 100 } });
    expect(r!.cm3).toBeCloseTo(50.670748, 5);
    expect(r!.source).toBe("round_bar_mm");
  });

  it("CROSS-UNIT INVARIANT: in^3 * 16387.064 == cm^3 * 1000 == mm^3 for the same source", () => {
    const sources = { stock_round_bar_mm: { diameter: 30, length: 75 } };
    const mm3 = resolveStockVolumeMm3(sources)!.mm3;
    const in3 = resolveStockVolumeIn3(sources)!.in3;
    const cm3 = resolveStockVolumeCm3(sources)!.cm3;
    expect(in3 * MM3_PER_IN3).toBeCloseTo(mm3, 6);
    expect(cm3 * MM3_PER_CM3).toBeCloseTo(mm3, 6);
  });

  it("explicit in^3 is returned BYTE-IDENTICAL (no lossy mm^3 round-trip)", () => {
    // The in^3 resolver returns the ORIGINAL value (in3Exact), not (v*C)/C. The
    // round-trip (v*MM3_PER_IN3)/MM3_PER_IN3 is NOT bit-exact for every double --
    // 65524.50510607423 drifts by 1 ULP under it. So this value is the teeth: it
    // FAILS .toBe() if the resolver ever divides back instead of carrying v through.
    const drifty = 65524.50510607423;
    expect((drifty * MM3_PER_IN3) / MM3_PER_IN3).not.toBe(drifty); // the round-trip DOES drift
    expect(resolveStockVolumeIn3({ stock_volume_in3: drifty })!.in3).toBe(drifty); // we return it exactly
    expect(resolveStockVolumeIn3({ stock_volume_in3: 3.5 })!.in3).toBe(3.5);
    expect(resolveStockVolumeIn3({ stock_volume_in3: 0.123456789 })!.in3).toBe(0.123456789);
  });

  it("conversion constants are the exact derived values", () => {
    expect(MM3_PER_IN3).toBe(16387.064); // 25.4^3
    expect(MM3_PER_CM3).toBe(1000);      // 10^3
  });
});

describe("resolveStockVolume -- failure + adversarial inputs", () => {
  it("no source -> null", () => {
    expect(resolveStockVolumeMm3({})).toBeNull();
    expect(resolveStockVolumeIn3({})).toBeNull();
    expect(resolveStockVolumeCm3({})).toBeNull();
  });

  it("null / non-object sources -> null (no crash)", () => {
    expect(resolveStockVolumeMm3(null as unknown as Record<string, never>)).toBeNull();
    expect(resolveStockVolumeMm3(undefined as unknown as Record<string, never>)).toBeNull();
  });

  it("zero / negative rect dim -> non-positive volume rejected, falls through", () => {
    // zero height -> rect mm3 = 0 -> rejected; with a valid bar it falls to round_bar.
    const r = resolveStockVolumeMm3({
      stock_dimensions_mm: { length: 50, width: 50, height: 0 },
      stock_round_bar_mm: { diameter: 25.4, length: 100 },
    });
    expect(r!.source).toBe("round_bar_mm"); // rect rejected, bar resolved
  });

  it("NaN bar diameter -> non-finite rejected -> null (no NaN leak)", () => {
    const r = resolveStockVolumeMm3({ stock_round_bar_mm: { diameter: Number.NaN, length: 100 } });
    expect(r).toBeNull();
  });

  it("Infinity / negative explicit volume -> rejected (no fabricated volume)", () => {
    expect(resolveStockVolumeMm3({ stock_volume_in3: Number.POSITIVE_INFINITY })).toBeNull();
    expect(resolveStockVolumeMm3({ stock_volume_in3: -5 })).toBeNull();
    expect(resolveStockVolumeMm3({ stock_volume_in3: 0 })).toBeNull();
  });

  it("a degraded explicit value falls through to a valid geometry source", () => {
    // explicit is NaN -> skipped -> rect resolves.
    const r = resolveStockVolumeMm3({
      stock_volume_in3: Number.NaN,
      stock_dimensions_mm: { length: 10, width: 10, height: 10 },
    });
    expect(r!.source).toBe("rect_block_mm");
    expect(r!.mm3).toBe(1000);
  });
});
