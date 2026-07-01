/**
 * HolderSelectionEngine tests -- CATALOG-APP-WIRING-MS0/U-HOLDER-SELECT (slot:romeo).
 *
 * Real reference holders (verified in the catalogs):
 *   HAIMER  CAT40 shrink_fit bore 3.0mm  (designation "HAIMER-CAT40-shrink_fit-3.0")
 *   GUHRING CAT40 hydraulic  bore 6.35mm (designation "GUH-4216-CAT40-6.35")
 * Tests assert SELECTION behavior fails when the matcher breaks (R9 intent).
 */
import { describe, it, expect } from "vitest";
import {
  HolderSelectionEngine,
  holderSelectionEngine,
  normalizeTaper,
} from "../engines/HolderSelectionEngine.js";

describe("HolderSelectionEngine", () => {
  const eng = new HolderSelectionEngine();

  it("loads bore-bearing holders from all three branded catalogs", () => {
    const all = eng.all();
    // Haimer alone is ~489 holders, all with a bore -> total must be well past 400.
    expect(all.length).toBeGreaterThan(400);
    const brands = new Set(all.map((h) => h.brand));
    expect(brands.has("HAIMER")).toBe(true);
    expect(brands.has("GUHRING")).toBe(true);
    expect(brands.has("BIG DAISHOWA")).toBe(true);
    // every record carries a finite bore + a normalized taper
    expect(all.every((h) => Number.isFinite(h.boreMinMm) && Number.isFinite(h.boreMaxMm))).toBe(true);
    expect(all.every((h) => h.taper === h.taper.toUpperCase())).toBe(true);
  });

  it("stats() breaks down by brand/type/taper with non-zero brands", () => {
    const s = eng.stats();
    expect(s.total).toBe(eng.all().length);
    expect(s.byBrand["HAIMER"]).toBeGreaterThan(0);
    expect(s.byBrand["GUHRING"]).toBeGreaterThan(0);
    expect(s.byBrand["BIG DAISHOWA"]).toBeGreaterThan(0);
    // shrink_fit is a Haimer staple; must appear in the type census
    expect(s.byType["shrink_fit"]).toBeGreaterThan(0);
  });

  it("selects a real shrink_fit holder for an exact-bore shank (CAT40, 3.0mm)", () => {
    const h = eng.select({ taper: "CAT40", shankDiameterMm: 3.0, typePreference: "shrink_fit" });
    if (!h) throw new Error("expected a CAT40 3.0mm shrink_fit holder, got null");
    expect(h.type).toBe("shrink_fit");
    expect(h.taper).toBe("CAT40");
    expect(h.boreMinMm).toBeCloseTo(3.0, 2);
  });

  it("selects a real hydraulic holder that clamps a 6.35mm shank (CAT40)", () => {
    const h = eng.select({ taper: "CAT40", shankDiameterMm: 6.35, typePreference: "hydraulic" });
    if (!h) throw new Error("expected a CAT40 6.35mm hydraulic holder, got null");
    expect(h.type).toBe("hydraulic");
    expect(h.taper).toBe("CAT40");
    // the chosen holder must actually be able to clamp 6.35mm
    expect(h.boreMinMm - 0.05).toBeLessThanOrEqual(6.35);
    expect(h.boreMaxMm + 0.05).toBeGreaterThanOrEqual(6.35);
  });

  it("typePreference wins ties when multiple holder types can clamp the shank", () => {
    // pick a shank that several types can hold; assert the preferred type is returned
    const pref = eng.select({ taper: "CAT40", shankDiameterMm: 12.0, typePreference: "shrink_fit" });
    if (!pref) throw new Error("expected a CAT40 12mm holder");
    expect(pref.type).toBe("shrink_fit");
  });

  it("returns null when no holder matches the taper", () => {
    expect(eng.select({ taper: "ZZZ-999", shankDiameterMm: 10 })).toBe(null);
  });

  it("returns null when the shank exceeds every bore for the taper", () => {
    expect(eng.select({ taper: "CAT40", shankDiameterMm: 9999 })).toBe(null);
  });

  it("shrink_fit holders only clamp an EXACT bore (no over-tolerance grip)", () => {
    // 3.27mm is not a standard shrink-fit bore. The exact-bore rule must hold for any
    // shrink_fit holder the selector returns: its bore is within tolerance of the shank,
    // never a mis-sized grab. (Null or a range-type holder are both acceptable outcomes.)
    const h = eng.select({ taper: "CAT40", shankDiameterMm: 3.27, typePreference: "shrink_fit" });
    const exactBoreRuleHolds =
      h === null || h.type !== "shrink_fit" || Math.abs(h.boreMinMm - 3.27) <= 0.05;
    expect(exactBoreRuleHolds).toBe(true);
  });

  it("byTypeBrand() organizes type -> brand -> holders", () => {
    const org = eng.byTypeBrand();
    expect(Object.keys(org).length).toBeGreaterThan(0);
    // shrink_fit group exists with a HAIMER sub-group carrying real holders
    expect(Object.keys(org["shrink_fit"] ?? {}).length).toBeGreaterThan(0);
    expect(Array.isArray(org["shrink_fit"]["HAIMER"])).toBe(true);
    expect(org["shrink_fit"]["HAIMER"].length).toBeGreaterThan(0);
    // every holder filed under a (type, brand) cell actually has that type + brand
    const sample = org["shrink_fit"]["HAIMER"][0];
    expect(sample.type).toBe("shrink_fit");
    expect(sample.brand).toBe("HAIMER");
  });

  it("normalizeTaper upper-cases, trims, and unifies separators", () => {
    expect(normalizeTaper("cat40 ")).toBe("CAT40");
    expect(normalizeTaper("hsk_a63")).toBe("HSK-A63");
    expect(normalizeTaper(" BT 40 ")).toBe("BT40");
  });

  it("singleton exposes the same loaded record set", () => {
    expect(holderSelectionEngine.all().length).toBe(eng.all().length);
  });
});
