/**
 * WEDMBenchmarkToleranceEngine tests — WEDM-CAL-MS4 / U-CAL20
 *
 * Proves the v2 tolerance bands are loaded, strictly tighter than v1,
 * and correctly classify deviations into match/warning/major/critical.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { wedmBenchmarkToleranceEngine, type BenchmarkKey } from "../engines/WEDMBenchmarkToleranceEngine.js";

beforeEach(() => {
  wedmBenchmarkToleranceEngine.reset();
});

describe("WEDMBenchmarkToleranceEngine — config loading", () => {
  it("loads the v2 config and caches it", () => {
    const cfg = wedmBenchmarkToleranceEngine.getConfig();
    expect(cfg.version).toBe("2.0.0");
    expect(cfg.reference_milestone).toBe("WEDM-CAL-MS4/U-CAL20");
    expect(cfg.tolerances).toBeDefined();
    // Second call returns cached (same reference)
    const cfg2 = wedmBenchmarkToleranceEngine.getConfig();
    expect(cfg2).toBe(cfg);
  });

  it("exposes all five tightened bands plus the default", () => {
    const cfg = wedmBenchmarkToleranceEngine.getConfig();
    const keys: BenchmarkKey[] = [
      "area_cutting_rate_pct",
      "kerf_width_pct",
      "surface_finish_ra_pct",
      "d2_rough_speed_pct",
      "offset_cascade_pct",
      "rough_speed_pct_default",
    ];
    for (const k of keys) {
      expect(cfg.tolerances[k]).toBeDefined();
      expect(cfg.tolerances[k].value).toBeGreaterThan(0);
      expect(cfg.tolerances[k].prior_value).toBeGreaterThan(0);
    }
  });
});

describe("WEDMBenchmarkToleranceEngine — v2 bands match MS4/U-CAL20 spec", () => {
  it("area cutting rate: ±30% → ±20%", () => {
    const b = wedmBenchmarkToleranceEngine.getBand("area_cutting_rate_pct");
    expect(b.prior_value).toBe(30);
    expect(b.value).toBe(20);
  });

  it("kerf width: ±20% → ±15%", () => {
    const b = wedmBenchmarkToleranceEngine.getBand("kerf_width_pct");
    expect(b.prior_value).toBe(20);
    expect(b.value).toBe(15);
  });

  it("surface finish Ra: ±70% → ±30%", () => {
    const b = wedmBenchmarkToleranceEngine.getBand("surface_finish_ra_pct");
    expect(b.prior_value).toBe(70);
    expect(b.value).toBe(30);
  });

  it("D2 rough speed: ±70% → ±25%", () => {
    const b = wedmBenchmarkToleranceEngine.getBand("d2_rough_speed_pct");
    expect(b.prior_value).toBe(70);
    expect(b.value).toBe(25);
  });

  it("offset cascade: ±30% → ±25%", () => {
    const b = wedmBenchmarkToleranceEngine.getBand("offset_cascade_pct");
    expect(b.prior_value).toBe(30);
    expect(b.value).toBe(25);
  });

  it("every v2 band is ≤ its v1 prior (monotonic tightening)", () => {
    const cfg = wedmBenchmarkToleranceEngine.getConfig();
    for (const [key, band] of Object.entries(cfg.tolerances)) {
      expect(band.value).toBeLessThanOrEqual(band.prior_value);
    }
  });
});

describe("WEDMBenchmarkToleranceEngine.isTightened", () => {
  it("returns true for the tightened bands", () => {
    for (const k of ["area_cutting_rate_pct", "kerf_width_pct", "surface_finish_ra_pct", "d2_rough_speed_pct", "offset_cascade_pct"] as BenchmarkKey[]) {
      expect(wedmBenchmarkToleranceEngine.isTightened(k)).toBe(true);
    }
  });

  it("returns true for already-tight bands (value == prior_value)", () => {
    // rough_speed_pct_default is unchanged (20 → 20); still counts as tightened
    expect(wedmBenchmarkToleranceEngine.isTightened("rough_speed_pct_default")).toBe(true);
  });
});

describe("WEDMBenchmarkToleranceEngine.overallTighteningScore", () => {
  it("overall tightening score is meaningfully positive (≥ 0.30)", () => {
    const s = wedmBenchmarkToleranceEngine.overallTighteningScore();
    // v2 cuts average band width by ~46% across all tolerances → score well above 0.3
    expect(s).toBeGreaterThanOrEqual(0.30);
    expect(s).toBeLessThanOrEqual(1.0);
  });

  it("never returns NaN or negative", () => {
    const s = wedmBenchmarkToleranceEngine.overallTighteningScore();
    expect(Number.isFinite(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
  });
});

describe("WEDMBenchmarkToleranceEngine.roughSpeedBandFor", () => {
  it("D2 and SKD11 use the tightened 25% band", () => {
    expect(wedmBenchmarkToleranceEngine.roughSpeedBandFor("D2")).toBe(25);
    expect(wedmBenchmarkToleranceEngine.roughSpeedBandFor("D2 tool steel")).toBe(25);
    expect(wedmBenchmarkToleranceEngine.roughSpeedBandFor("SKD11")).toBe(25);
  });

  it("non-D2 materials fall through to the default 20% band", () => {
    expect(wedmBenchmarkToleranceEngine.roughSpeedBandFor("A2")).toBe(20);
    expect(wedmBenchmarkToleranceEngine.roughSpeedBandFor("stainless 304")).toBe(20);
    expect(wedmBenchmarkToleranceEngine.roughSpeedBandFor("Aluminum 6061")).toBe(20);
    expect(wedmBenchmarkToleranceEngine.roughSpeedBandFor(undefined)).toBe(20);
  });
});

describe("WEDMBenchmarkToleranceEngine.classify", () => {
  it("tiny deviations are classified as 'match'", () => {
    expect(wedmBenchmarkToleranceEngine.classify(1, "area_cutting_rate_pct")).toBe("match");
    expect(wedmBenchmarkToleranceEngine.classify(-5, "surface_finish_ra_pct")).toBe("match");
  });

  it("deviations inside the band but above half-band are 'warning'", () => {
    // area band is 20%, so 15% is warning (> 10% half-band but ≤ 20% band)
    expect(wedmBenchmarkToleranceEngine.classify(15, "area_cutting_rate_pct")).toBe("warning");
    expect(wedmBenchmarkToleranceEngine.classify(-15, "area_cutting_rate_pct")).toBe("warning");
  });

  it("deviations between band and 2×band are 'major'", () => {
    // area band is 20%, so 30% is major (> 20% band but ≤ 40% double-band)
    expect(wedmBenchmarkToleranceEngine.classify(30, "area_cutting_rate_pct")).toBe("major");
    expect(wedmBenchmarkToleranceEngine.classify(-35, "area_cutting_rate_pct")).toBe("major");
  });

  it("deviations beyond 2×band are 'critical'", () => {
    expect(wedmBenchmarkToleranceEngine.classify(100, "area_cutting_rate_pct")).toBe("critical");
    expect(wedmBenchmarkToleranceEngine.classify(-80, "d2_rough_speed_pct")).toBe("critical");
  });

  it("NaN / non-finite deviations classify as 'critical'", () => {
    expect(wedmBenchmarkToleranceEngine.classify(NaN, "kerf_width_pct")).toBe("critical");
    expect(wedmBenchmarkToleranceEngine.classify(Infinity, "surface_finish_ra_pct")).toBe("critical");
  });

  it("zero deviation is always 'match'", () => {
    const keys: BenchmarkKey[] = [
      "area_cutting_rate_pct", "kerf_width_pct", "surface_finish_ra_pct",
      "d2_rough_speed_pct", "offset_cascade_pct", "rough_speed_pct_default",
    ];
    for (const k of keys) {
      expect(wedmBenchmarkToleranceEngine.classify(0, k)).toBe("match");
    }
  });
});

describe("WEDMBenchmarkToleranceEngine.classifyRoughSpeed — material-aware", () => {
  it("25% deviation on D2 is exactly at the band edge → 'warning'", () => {
    // D2 band is 25; abs(25) == 25 → warning, not major
    expect(wedmBenchmarkToleranceEngine.classifyRoughSpeed(25, "D2")).toBe("warning");
    // 12% < 12.5% half-band → match. 13% > 12.5% half-band → warning.
    expect(wedmBenchmarkToleranceEngine.classifyRoughSpeed(12, "D2")).toBe("match");
    expect(wedmBenchmarkToleranceEngine.classifyRoughSpeed(13, "D2")).toBe("warning");
  });

  it("25% deviation on A2 is beyond the 20% band → 'major'", () => {
    expect(wedmBenchmarkToleranceEngine.classifyRoughSpeed(25, "A2")).toBe("major");
  });

  it("60% deviation: major on D2 (<2×25), critical on A2 (>2×20)", () => {
    expect(wedmBenchmarkToleranceEngine.classifyRoughSpeed(45, "D2")).toBe("major");    // |45| < 2×25=50
    expect(wedmBenchmarkToleranceEngine.classifyRoughSpeed(60, "D2")).toBe("critical"); // |60| > 2×25=50
    expect(wedmBenchmarkToleranceEngine.classifyRoughSpeed(60, "A2")).toBe("critical"); // |60| > 2×20=40
  });
});

describe("WEDMBenchmarkToleranceEngine.asComparisonOverride", () => {
  it("returns fractional tolerances suitable for WEDMProgramComparisonEngine", () => {
    const ov = wedmBenchmarkToleranceEngine.asComparisonOverride();
    expect(ov.offset_rel_tol).toBeCloseTo(0.25, 5); // 25%
    expect(ov.feed_rel_tol).toBeCloseTo(0.20, 5);   // 20%
  });
});
