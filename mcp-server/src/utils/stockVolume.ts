/**
 * stockVolume.ts -- the single, unit-agnostic stock-volume resolver
 * (U-QP-STOCK-VOLUME-CORE).
 *
 * Two engines independently resolved a part's STOCK volume from the same set of
 * sources (rectangular block bbox, cylindrical bar stock, or an explicit volume):
 *   - QuoteEstimatorEngine.resolveStockVolumeCm3  (returns cm^3)
 *   - InstantQuoteEngine.computeStockVolumeIn3     (returns in^3)
 * They could NOT share code by importing each other -- InstantQuoteEngine already
 * imports QuoteEstimatorEngine, so a back-import would create a cycle. The fix is a
 * LEAF utility both engines import (neither imports the other through it): compute
 * the volume + source tag in mm^3 here, and let each caller divide by its unit's
 * `mm^3 per unit` factor.
 *
 * The cylinder formula (V = pi/4 * d^2 * L), the rect bbox (L * W * H), and the
 * finite/positive guards now live in exactly ONE place -- a future fix to the
 * precedence or the geometry is applied once, not forked across two engines.
 *
 * NO physics constants here: pi/4 is pure cylinder geometry, and the mm^3->unit
 * divisors the callers apply are pure SI/imperial dimensional conversions, not
 * Kienzle/Taylor/material values (those live in src/physics/constants.ts).
 */

/** mm^3 per cubic inch: (25.4 mm/in)^3 = 16387.064. Pure imperial conversion. */
export const MM3_PER_IN3 = 16387.064;

/** mm^3 per cubic centimetre: (10 mm/cm)^3 = 1000. Pure SI conversion. */
export const MM3_PER_CM3 = 1000;

/** The volume-bearing sources a part may carry, highest-confidence first. */
export interface StockVolumeSources {
  /** Stock volume already known in the in^3 basis unit (e.g. an OCR'd value). */
  stock_volume_in3?: number;
  /** Rectangular block bounding box, in mm. */
  stock_dimensions_mm?: { length: number; width: number; height: number };
  /** Cylindrical bar stock (turned parts), in mm. */
  stock_round_bar_mm?: { diameter: number; length: number };
}

/** Which source produced the resolved volume. */
export type StockVolumeSourceTag = "explicit_in3" | "rect_block_mm" | "round_bar_mm";

/** A resolved stock volume in mm^3, tagged with the source that produced it. */
export interface ResolvedStockVolumeMm3 {
  mm3: number;
  source: StockVolumeSourceTag;
  /**
   * The ORIGINAL in^3 value, present ONLY for the `explicit_in3` source. The
   * explicit path stores `mm3 = v * MM3_PER_IN3`; dividing that back by the same
   * factor is NOT bit-exact for every IEEE-754 double (~0.011% drift by 1 ULP),
   * so `resolveStockVolumeIn3` returns this raw `v` instead of the round-tripped
   * value -- the explicit in^3 input is returned byte-identical. Undefined for the
   * geometry sources (their natural basis is mm^3, no lossless original exists).
   */
  in3Exact?: number;
}

/**
 * Resolve a part's STOCK volume in mm^3 from whichever source is supplied,
 * highest-confidence first. The single source of truth for stock-volume geometry.
 *
 * Precedence:
 *   1. explicit_in3  -- caller already has the volume in the in^3 basis unit
 *                       (converted up to mm^3 here so the return is uniformly mm^3)
 *   2. rect_block_mm -- rectangular block bbox: L * W * H
 *   3. round_bar_mm  -- cylindrical bar: pi/4 * d^2 * L
 *
 * Returns null when no usable source is present or every candidate is
 * non-finite / non-positive, so the caller falls back to its own estimate
 * (R12: never fabricate a stock volume from a degraded input).
 *
 * @param sources the volume-bearing fields off a quote input
 * @returns the resolved stock volume in mm^3 with its source tag, or null
 */
export function resolveStockVolumeMm3(
  sources: StockVolumeSources,
): ResolvedStockVolumeMm3 | null {
  if (!sources || typeof sources !== "object") return null;

  // 1. Explicit in^3 -- already in a basis unit, highest confidence. Convert up
  //    to mm^3 so the return is uniformly mm^3, but carry the ORIGINAL in^3 value
  //    (in3Exact) so the in^3 resolver returns it byte-identical (no lossy round-trip).
  const v = sources.stock_volume_in3;
  if (typeof v === "number" && Number.isFinite(v) && v > 0) {
    return { mm3: v * MM3_PER_IN3, source: "explicit_in3", in3Exact: v };
  }

  // 2. Rectangular block bbox: L * W * H.
  const d = sources.stock_dimensions_mm;
  if (d) {
    const mm3 = d.length * d.width * d.height;
    if (Number.isFinite(mm3) && mm3 > 0) {
      return { mm3, source: "rect_block_mm" };
    }
  }

  // 3. Cylindrical bar stock: V = pi/4 * d^2 * L.
  const bar = sources.stock_round_bar_mm;
  if (bar) {
    const mm3 = (Math.PI / 4) * bar.diameter * bar.diameter * bar.length;
    if (Number.isFinite(mm3) && mm3 > 0) {
      return { mm3, source: "round_bar_mm" };
    }
  }

  return null;
}

/**
 * Resolve stock volume in in^3 (delegates to the mm^3 core). For the explicit_in3
 * source the ORIGINAL in^3 value is returned byte-identical (in3Exact) -- not the
 * lossy mm^3 round-trip; geometry sources convert mm^3 -> in^3.
 */
export function resolveStockVolumeIn3(
  sources: StockVolumeSources,
): { in3: number; source: StockVolumeSourceTag } | null {
  const r = resolveStockVolumeMm3(sources);
  if (!r) return null;
  const in3 = r.in3Exact !== undefined ? r.in3Exact : r.mm3 / MM3_PER_IN3;
  return { in3, source: r.source };
}

/** Resolve stock volume in cm^3 (delegates to the mm^3 core). */
export function resolveStockVolumeCm3(
  sources: StockVolumeSources,
): { cm3: number; source: StockVolumeSourceTag } | null {
  const r = resolveStockVolumeMm3(sources);
  return r ? { cm3: r.mm3 / MM3_PER_CM3, source: r.source } : null;
}
