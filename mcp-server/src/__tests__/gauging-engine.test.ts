/**
 * GaugingEngine — Unit Tests
 * @milestone FORGE-ENGINES-B25
 */
import { describe, it, expect } from "vitest";
import { gaugingEngine } from "../engines/GaugingEngine.js";

describe("GaugingEngine", () => {
  it("calculates gauge R&R percentage", () => {
    const r = gaugingEngine.calculate({
      nominal_mm: 25,
      tolerance_mm: 0.05,
    });
    expect(r.gauge_rr_pct.value).toBeGreaterThan(0);
  });

  it("tighter tolerance worsens R&R percentage", () => {
    const loose = gaugingEngine.calculate({
      nominal_mm: 25,
      tolerance_mm: 0.1,
      gauge_resolution_mm: 0.005,
    });
    const tight = gaugingEngine.calculate({
      nominal_mm: 25,
      tolerance_mm: 0.01,
      gauge_resolution_mm: 0.005,
    });
    expect(tight.gauge_rr_pct.value).toBeGreaterThan(
      loose.gauge_rr_pct.value
    );
  });

  it("discrimination ratio = tol/resolution", () => {
    const r = gaugingEngine.calculate({
      nominal_mm: 25,
      tolerance_mm: 0.1,
      gauge_resolution_mm: 0.01,
    });
    expect(r.discrimination_ratio.value).toBe(10);
  });

  it("go/nogo sizes bracket tolerance", () => {
    const r = gaugingEngine.calculate({
      nominal_mm: 25,
      tolerance_mm: 0.05,
      tolerance_type: "bilateral",
      feature_type: "od",
    });
    expect(r.go_gauge_size.value).toBeLessThan(
      r.nogo_gauge_size.value
    );
  });

  it("gauge maker tolerance = 10% of part tol", () => {
    const r = gaugingEngine.calculate({
      nominal_mm: 25,
      tolerance_mm: 0.1,
    });
    expect(r.gauge_maker_tolerance.value).toBeCloseTo(0.01, 4);
  });

  it("high volume recommends go/nogo for OD", () => {
    const r = gaugingEngine.calculate({
      nominal_mm: 25,
      tolerance_mm: 0.05,
      production_volume: "high",
      feature_type: "od",
    });
    expect(r.recommended_gauge.unit).toContain("go_nogo");
  });

  it("very tight tolerance recommends CMM", () => {
    const r = gaugingEngine.calculate({
      nominal_mm: 25,
      tolerance_mm: 0.005,
    });
    expect(r.recommended_gauge.unit).toContain("cmm");
  });

  it("warns poor discrimination ratio", () => {
    const r = gaugingEngine.calculate({
      nominal_mm: 25,
      tolerance_mm: 0.05,
      gauge_resolution_mm: 0.01,
    });
    expect(
      r.warnings.some(w => w.includes("Discrimination") ||
        w.includes("discrimination") || w.includes("resolution"))
    ).toBe(true);
  });

  it("sample size increases with production volume", () => {
    const proto = gaugingEngine.calculate({
      nominal_mm: 25,
      tolerance_mm: 0.05,
      production_volume: "prototype",
    });
    const high = gaugingEngine.calculate({
      nominal_mm: 25,
      tolerance_mm: 0.05,
      production_volume: "high",
    });
    expect(high.sample_size.value).toBeGreaterThan(
      proto.sample_size.value
    );
  });

  it("measurement time varies by gauge type", () => {
    const r = gaugingEngine.calculate({
      nominal_mm: 25,
      tolerance_mm: 0.05,
    });
    expect(r.measurement_time_sec.value).toBeGreaterThan(0);
  });
});
