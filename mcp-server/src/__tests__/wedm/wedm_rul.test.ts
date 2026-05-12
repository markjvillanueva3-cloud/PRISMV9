/**
 * WEDMRULEngine tests — WEDM AGI Phase 4 / P4-MS3 / U-P4-07.
 *
 * Covers:
 *  - estimateFromRates(): (C-x)/r for healthy components
 *  - zero/negative rate → RUL=Infinity + band=healthy
 *  - state ≥ capacity → RUL=0 + band=imminent
 *  - band classification thresholds (imminent/soon/planned/healthy)
 *  - worstComponent / worstRUL picks the smallest
 *  - estimateFromUsage(): rates are derived from degradation model
 *  - countInBand() dashboard helper
 */
import { describe, it, expect } from "vitest";
import {
  WEDMRULEngine,
  wedmRULEngine,
} from "../../engines/WEDMRULEngine.js";
import {
  WEDMDegradationModelEngine,
  type DegradationSnapshot,
  type UsageDelta,
} from "../../engines/WEDMDegradationModelEngine.js";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function snapshotWith(overrides: Partial<Record<string, { state: number; capacity: number }>>): DegradationSnapshot {
  const e = new WEDMDegradationModelEngine();
  for (const [k, v] of Object.entries(overrides)) {
    if (!v) continue;
    e.load({ [k]: { state: v.state, capacity: v.capacity } });
  }
  return e.snapshot();
}

function usage(overrides: Partial<UsageDelta> = {}): UsageDelta {
  return {
    dt_hours: 1,
    wire_tension_gf: 1000,
    wire_feed_mm_s: 50,
    discharge_current_A: 10,
    pulse_on_us: 5,
    pulses: 1_000_000,
    conductivity_uS_cm: 0.5,
    flow_L_min: 20,
    debris_rate_mg_hr: 100,
    pulse_energy_mJ: 0.5,
    ...overrides,
  };
}

// ----------------------------------------------------------------------------
// estimateFromRates
// ----------------------------------------------------------------------------

describe("WEDMRULEngine — estimateFromRates()", () => {
  const e = new WEDMRULEngine();

  it("RUL = (C - x) / rate", () => {
    const snap = snapshotWith({ guide_wear: { state: 0.1, capacity: 0.5 } });
    const report = e.estimateFromRates(snap, { guide_wear: 0.01 });
    // (0.5 - 0.1) / 0.01 = 40
    expect(report.components.guide_wear.rul_hours).toBeCloseTo(40, 5);
  });

  it("rate = 0 → RUL=Infinity, band=healthy", () => {
    const snap = snapshotWith({ guide_wear: { state: 0.1, capacity: 0.5 } });
    const r = e.estimateFromRates(snap, { guide_wear: 0 });
    expect(r.components.guide_wear.rul_hours).toBe(Number.POSITIVE_INFINITY);
    expect(r.components.guide_wear.band).toBe("healthy");
  });

  it("state ≥ capacity → RUL=0, band=imminent", () => {
    const snap = snapshotWith({ guide_wear: { state: 0.7, capacity: 0.5 } });
    const r = e.estimateFromRates(snap, { guide_wear: 0.01 });
    expect(r.components.guide_wear.rul_hours).toBe(0);
    expect(r.components.guide_wear.band).toBe("imminent");
  });

  it("missing rate entry defaults to 0 → healthy", () => {
    const snap = snapshotWith({});
    const r = e.estimateFromRates(snap, {});
    for (const c of Object.values(r.components)) {
      expect(c.rul_hours).toBe(Number.POSITIVE_INFINITY);
      expect(c.band).toBe("healthy");
    }
  });

  it("reason string includes the (C-x)/r arithmetic", () => {
    const snap = snapshotWith({ guide_wear: { state: 0.1, capacity: 0.5 } });
    const r = e.estimateFromRates(snap, { guide_wear: 0.01 });
    expect(r.components.guide_wear.reason).toMatch(/per hr/);
  });
});

// ----------------------------------------------------------------------------
// Band classification
// ----------------------------------------------------------------------------

describe("WEDMRULEngine — band classification", () => {
  const e = new WEDMRULEngine();

  it("imminent band for RUL ≤ 8 hr", () => {
    const snap = snapshotWith({ guide_wear: { state: 0.5 - 0.05, capacity: 0.5 } });
    // rate=0.01/hr → rul = 0.05 / 0.01 = 5 hr
    const r = e.estimateFromRates(snap, { guide_wear: 0.01 });
    expect(r.components.guide_wear.band).toBe("imminent");
  });

  it("soon band for RUL in (8, 40]", () => {
    const snap = snapshotWith({ guide_wear: { state: 0.5 - 0.2, capacity: 0.5 } });
    // rate=0.01/hr → rul = 0.2 / 0.01 = 20 hr
    const r = e.estimateFromRates(snap, { guide_wear: 0.01 });
    expect(r.components.guide_wear.band).toBe("soon");
  });

  it("planned band for RUL in (40, 200]", () => {
    const snap = snapshotWith({ guide_wear: { state: 0, capacity: 0.5 } });
    // rate=0.005/hr → rul = 100 hr
    const r = e.estimateFromRates(snap, { guide_wear: 0.005 });
    expect(r.components.guide_wear.band).toBe("planned");
  });

  it("healthy band for RUL > 200", () => {
    const snap = snapshotWith({ guide_wear: { state: 0, capacity: 0.5 } });
    const r = e.estimateFromRates(snap, { guide_wear: 0.001 });
    // rul = 500 hr
    expect(r.components.guide_wear.band).toBe("healthy");
  });

  it("custom band thresholds honored", () => {
    const snap = snapshotWith({ guide_wear: { state: 0, capacity: 100 } });
    const r = e.estimateFromRates(
      snap,
      { guide_wear: 1 }, // 100 hr RUL
      { imminent_hr: 150 },
    );
    expect(r.components.guide_wear.band).toBe("imminent");
  });
});

// ----------------------------------------------------------------------------
// Worst-link summary
// ----------------------------------------------------------------------------

describe("WEDMRULEngine — worst-link summary", () => {
  const e = new WEDMRULEngine();

  it("worst component is the smallest RUL", () => {
    const snap = snapshotWith({
      guide_wear: { state: 0, capacity: 0.5 },
      wire_erosion: { state: 0, capacity: 100 },
    });
    const r = e.estimateFromRates(snap, {
      guide_wear: 0.005, // rul = 100 hr
      wire_erosion: 20, // rul = 5 hr  ← worst
    });
    expect(r.worstComponent).toBe("wire_erosion");
    expect(r.worstRUL_hours).toBeCloseTo(5, 5);
    expect(r.worstBand).toBe("imminent");
  });

  it("all components healthy → worstBand=healthy", () => {
    const snap = snapshotWith({});
    const r = e.estimateFromRates(snap, {});
    expect(r.worstBand).toBe("healthy");
    expect(r.worstRUL_hours).toBe(Number.POSITIVE_INFINITY);
  });
});

// ----------------------------------------------------------------------------
// estimateFromUsage (derives rates via degradation model)
// ----------------------------------------------------------------------------

describe("WEDMRULEngine — estimateFromUsage()", () => {
  const e = new WEDMRULEngine();

  it("steady usage → every component has a finite RUL", () => {
    const snap = snapshotWith({});
    const r = e.estimateFromUsage(snap, usage());
    for (const c of Object.values(r.components)) {
      expect(c.rate_per_hr).toBeGreaterThan(0);
      expect(c.rul_hours).toBeLessThan(Number.POSITIVE_INFINITY);
    }
  });

  it("zero usage → every component infinite RUL", () => {
    const snap = snapshotWith({});
    const zero: UsageDelta = {
      dt_hours: 1,
      wire_tension_gf: 0,
      wire_feed_mm_s: 0,
      discharge_current_A: 0,
      pulse_on_us: 0,
      pulses: 0,
      conductivity_uS_cm: 0,
      flow_L_min: 0,
      debris_rate_mg_hr: 0,
      pulse_energy_mJ: 0,
    };
    const r = e.estimateFromUsage(snap, zero);
    for (const c of Object.values(r.components)) {
      expect(c.rul_hours).toBe(Number.POSITIVE_INFINITY);
    }
  });

  it("higher debris rate shortens filter_clogging RUL", () => {
    const snap = snapshotWith({});
    const a = e.estimateFromUsage(snap, usage({ debris_rate_mg_hr: 100 }));
    const b = e.estimateFromUsage(snap, usage({ debris_rate_mg_hr: 500 }));
    expect(b.components.filter_clogging.rul_hours).toBeLessThan(
      a.components.filter_clogging.rul_hours,
    );
  });
});

// ----------------------------------------------------------------------------
// countInBand
// ----------------------------------------------------------------------------

describe("WEDMRULEngine — countInBand()", () => {
  const e = new WEDMRULEngine();

  it("counts components in each band", () => {
    const snap = snapshotWith({
      guide_wear: { state: 0.49, capacity: 0.5 },
      wire_erosion: { state: 0, capacity: 100 },
    });
    const r = e.estimateFromRates(snap, {
      guide_wear: 0.01, // rul = 1 hr → imminent
      wire_erosion: 0, // healthy
    });
    expect(e.countInBand(r, "imminent")).toBe(1);
    expect(e.countInBand(r, "healthy")).toBe(4); // the other 4
  });
});

// ----------------------------------------------------------------------------
// Singleton
// ----------------------------------------------------------------------------

describe("WEDMRULEngine — singleton", () => {
  it("wedmRULEngine produces consistent results", () => {
    const snap = snapshotWith({});
    const r = wedmRULEngine.estimateFromUsage(snap, usage());
    expect(r.components).toBeDefined();
  });
});
