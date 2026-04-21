/**
 * TurningChipbreakerCatalogEngine — per-engine tests (MS7 / U-LPC02)
 */
import { describe, it, expect } from "vitest";
import { turningChipbreakerCatalogEngine } from "../engines/TurningChipbreakerCatalogEngine.js";

describe("TurningChipbreakerCatalogEngine", () => {
  it("catalog contains entries for all 5 vendors", () => {
    const list = turningChipbreakerCatalogEngine.list();
    const vendors = new Set(list.map(g => g.manufacturer));
    expect(vendors.has("sandvik")).toBe(true);
    expect(vendors.has("kennametal")).toBe(true);
    expect(vendors.has("iscar")).toBe(true);
    expect(vendors.has("tungaloy")).toBe(true);
    expect(vendors.has("mitsubishi")).toBe(true);
  });

  it("Sandvik PM medium-steel window accepts feed=0.25 ap=2.0", () => {
    const r = turningChipbreakerCatalogEngine.validate({
      manufacturer: "sandvik",
      code: "PM",
      iso_group: "P",
      feed_mm_rev: 0.25,
      ap_mm: 2.0,
    });
    expect(r.geometry_found).toBe(true);
    expect(r.in_window).toBe(true);
    expect(r.iso_group_supported).toBe(true);
  });

  it("Sandvik PM rejects feed below window (0.05)", () => {
    const r = turningChipbreakerCatalogEngine.validate({
      manufacturer: "sandvik",
      code: "PM",
      iso_group: "P",
      feed_mm_rev: 0.05,
      ap_mm: 2.0,
    });
    expect(r.in_window).toBe(false);
    expect(r.feed_in_window).toBe(false);
  });

  it("parameter_adjustment nudges feed into window when ap is fine", () => {
    const r = turningChipbreakerCatalogEngine.validate({
      manufacturer: "sandvik",
      code: "PM",
      iso_group: "P",
      feed_mm_rev: 0.05,
      ap_mm: 2.0,
    });
    expect(r.parameter_adjustment).toBeDefined();
    expect(r.parameter_adjustment!.suggested_feed_mm_rev).toBe(0.15);
  });

  it("unknown geometry returns geometry_found=false with alternatives", () => {
    const r = turningChipbreakerCatalogEngine.validate({
      manufacturer: "sandvik",
      code: "ZZ-NOT-A-THING",
      iso_group: "P",
      feed_mm_rev: 0.2,
      ap_mm: 2.0,
    });
    expect(r.geometry_found).toBe(false);
    expect(r.alternatives.length).toBeGreaterThan(0);
  });

  it("ISO mismatch is flagged but geometry still found", () => {
    // Sandvik PM is P only; supply M.
    const r = turningChipbreakerCatalogEngine.validate({
      manufacturer: "sandvik",
      code: "PM",
      iso_group: "M",
      feed_mm_rev: 0.2,
      ap_mm: 2.0,
    });
    expect(r.geometry_found).toBe(true);
    expect(r.iso_group_supported).toBe(false);
    expect(r.warnings.some(w => /not rated for ISO/.test(w))).toBe(true);
  });

  it("recommendForPoint returns geometries that accept the point", () => {
    const hits = turningChipbreakerCatalogEngine.recommendForPoint("P", 0.2, 2.0);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every(h => /Accepts feed=0.2/.test(h.reason))).toBe(true);
  });

  it("recommendForPoint filters by ISO group", () => {
    const mHits = turningChipbreakerCatalogEngine.recommendForPoint("M", 0.25, 2.0);
    expect(mHits.every(h => h.code !== "PM")).toBe(true); // PM is P-only
  });

  it("Grooving geometry has narrower feed window than medium", () => {
    const list = turningChipbreakerCatalogEngine.list();
    const gr = list.find(g => g.manufacturer === "sandvik" && g.code === "GR");
    const pm = list.find(g => g.manufacturer === "sandvik" && g.code === "PM");
    expect(gr!.feed_max).toBeLessThan(pm!.feed_max);
  });

  it("alternatives list excludes the chosen geometry when out of window", () => {
    const r = turningChipbreakerCatalogEngine.validate({
      manufacturer: "sandvik",
      code: "PF",
      iso_group: "P",
      feed_mm_rev: 0.5, // above PF window
      ap_mm: 3.0,       // above PF window
    });
    expect(r.in_window).toBe(false);
    expect(r.alternatives.every(a => !(a.manufacturer === "sandvik" && a.code === "PF"))).toBe(true);
  });

  it("all catalog windows have feed_min < feed_max and ap_min < ap_max", () => {
    const list = turningChipbreakerCatalogEngine.list();
    for (const g of list) {
      expect(g.feed_min).toBeLessThan(g.feed_max);
      expect(g.ap_min).toBeLessThan(g.ap_max);
    }
  });
});
