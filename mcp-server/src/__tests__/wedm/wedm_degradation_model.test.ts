/**
 * WEDMDegradationModelEngine tests — WEDM AGI Phase 4 / P4-MS3 / U-P4-08.
 *
 * Covers:
 *  - All 5 roadmap components present with correct units
 *  - update() integrates monotone damage on non-zero usage
 *  - update() rejects bad input (NaN, negative, dt=0)
 *  - worstComponent / worstIndex picks the largest fraction
 *  - Indices clip at 1 (health never goes negative)
 *  - load() rehydrates per-component state and capacity
 *  - setCapacities() overrides capacity without touching state
 *  - reset() zeros state but keeps capacity
 *  - No cross-coupling between components (updating only tension does
 *    NOT change wire_erosion / filter / fatigue)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WEDMDegradationModelEngine,
  wedmDegradationModelEngine,
  type DegradationComponent,
  type UsageDelta,
} from "../../engines/WEDMDegradationModelEngine.js";

// ----------------------------------------------------------------------------
// Fixture
// ----------------------------------------------------------------------------

function nominalUsage(overrides: Partial<UsageDelta> = {}): UsageDelta {
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

function zeroUsage(): UsageDelta {
  return {
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
}

// ----------------------------------------------------------------------------
// Baseline
// ----------------------------------------------------------------------------

describe("WEDMDegradationModelEngine — baseline snapshot", () => {
  it("fresh instance has all 5 components with zero state", () => {
    const e = new WEDMDegradationModelEngine();
    const snap = e.snapshot();
    const keys: DegradationComponent[] = [
      "guide_wear",
      "wire_erosion",
      "filter_capacity",
      "filter_clogging",
      "wire_fatigue",
    ];
    for (const k of keys) {
      expect(snap.components[k]).toBeDefined();
      expect(snap.components[k].state).toBe(0);
      expect(snap.components[k].index).toBe(0);
      expect(snap.components[k].health).toBe(1);
    }
    expect(snap.worstIndex).toBe(0);
    expect(snap.overallHealth).toBe(1);
  });

  it("each component has a non-empty unit string", () => {
    const e = new WEDMDegradationModelEngine();
    const snap = e.snapshot();
    for (const c of Object.values(snap.components)) {
      expect(typeof c.unit).toBe("string");
      expect(c.unit.length).toBeGreaterThan(0);
    }
  });
});

// ----------------------------------------------------------------------------
// update() — per-component advance
// ----------------------------------------------------------------------------

describe("WEDMDegradationModelEngine — update() per-component", () => {
  let e: WEDMDegradationModelEngine;

  beforeEach(() => {
    e = new WEDMDegradationModelEngine();
  });

  it("nominal usage advances every component", () => {
    const snap = e.update(nominalUsage());
    expect(snap.components.guide_wear.state).toBeGreaterThan(0);
    expect(snap.components.wire_erosion.state).toBeGreaterThan(0);
    expect(snap.components.filter_capacity.state).toBeGreaterThan(0);
    expect(snap.components.filter_clogging.state).toBeGreaterThan(0);
    expect(snap.components.wire_fatigue.state).toBeGreaterThan(0);
  });

  it("zero usage → all components stay at zero", () => {
    e.update(zeroUsage());
    const snap = e.snapshot();
    for (const c of Object.values(snap.components)) expect(c.state).toBe(0);
  });

  it("only tension/feed advances guide_wear (isolation)", () => {
    e.update({ ...zeroUsage(), wire_tension_gf: 1000, wire_feed_mm_s: 100 });
    const snap = e.snapshot();
    expect(snap.components.guide_wear.state).toBeGreaterThan(0);
    expect(snap.components.wire_erosion.state).toBe(0);
    expect(snap.components.filter_capacity.state).toBe(0);
    expect(snap.components.filter_clogging.state).toBe(0);
    expect(snap.components.wire_fatigue.state).toBe(0);
  });

  it("only discharge current/pulse advances wire_erosion", () => {
    e.update({
      ...zeroUsage(),
      discharge_current_A: 10,
      pulse_on_us: 5,
      pulses: 1e6,
    });
    const snap = e.snapshot();
    expect(snap.components.wire_erosion.state).toBeGreaterThan(0);
    expect(snap.components.guide_wear.state).toBe(0);
  });

  it("only conductivity/flow advances filter_capacity", () => {
    e.update({ ...zeroUsage(), conductivity_uS_cm: 2, flow_L_min: 25 });
    const snap = e.snapshot();
    expect(snap.components.filter_capacity.state).toBeGreaterThan(0);
    expect(snap.components.filter_clogging.state).toBe(0);
  });

  it("only debris rate advances filter_clogging", () => {
    e.update({ ...zeroUsage(), debris_rate_mg_hr: 250 });
    const snap = e.snapshot();
    expect(snap.components.filter_clogging.state).toBeGreaterThan(0);
    expect(snap.components.filter_capacity.state).toBe(0);
  });

  it("only pulse energy/pulses advances wire_fatigue", () => {
    e.update({ ...zeroUsage(), pulses: 1e6, pulse_energy_mJ: 0.8 });
    const snap = e.snapshot();
    expect(snap.components.wire_fatigue.state).toBeGreaterThan(0);
  });

  it("monotonicity: successive updates only grow state", () => {
    e.update(nominalUsage());
    const s1 = e.snapshot();
    e.update(nominalUsage());
    const s2 = e.snapshot();
    for (const k of Object.keys(s1.components) as DegradationComponent[]) {
      expect(s2.components[k].state).toBeGreaterThanOrEqual(s1.components[k].state);
    }
  });
});

// ----------------------------------------------------------------------------
// update() — input validation
// ----------------------------------------------------------------------------

describe("WEDMDegradationModelEngine — input validation", () => {
  let e: WEDMDegradationModelEngine;

  beforeEach(() => {
    e = new WEDMDegradationModelEngine();
  });

  it("rejects dt_hours = 0", () => {
    expect(() => e.update({ ...nominalUsage(), dt_hours: 0 })).toThrow();
  });

  it("rejects negative tension", () => {
    expect(() => e.update({ ...nominalUsage(), wire_tension_gf: -5 })).toThrow();
  });

  it("rejects NaN", () => {
    expect(() => e.update({ ...nominalUsage(), flow_L_min: NaN })).toThrow();
  });

  it("rejects Infinity", () => {
    expect(() => e.update({ ...nominalUsage(), pulses: Infinity })).toThrow();
  });
});

// ----------------------------------------------------------------------------
// worstComponent / worstIndex
// ----------------------------------------------------------------------------

describe("WEDMDegradationModelEngine — worst-link summary", () => {
  it("picks the largest index component", () => {
    const e = new WEDMDegradationModelEngine();
    // Make filter_clogging saturate quickly by shrinking its capacity.
    e.setCapacities({ filter_clogging: 10 });
    e.update({ ...zeroUsage(), debris_rate_mg_hr: 100 });
    const snap = e.snapshot();
    expect(snap.worstComponent).toBe("filter_clogging");
    expect(snap.worstIndex).toBeGreaterThan(0);
  });

  it("indices clip at 1 (health clips at 0)", () => {
    const e = new WEDMDegradationModelEngine();
    e.setCapacities({ wire_fatigue: 1 });
    e.update({ ...zeroUsage(), pulses: 1e9, pulse_energy_mJ: 1 });
    const snap = e.snapshot();
    expect(snap.components.wire_fatigue.index).toBe(1);
    expect(snap.components.wire_fatigue.health).toBe(0);
    expect(snap.overallHealth).toBe(0);
  });
});

// ----------------------------------------------------------------------------
// load() / setCapacities() / reset()
// ----------------------------------------------------------------------------

describe("WEDMDegradationModelEngine — state management", () => {
  it("load() rehydrates per-component state and capacity", () => {
    const e = new WEDMDegradationModelEngine();
    e.load({
      guide_wear: { state: 0.1, capacity: 0.5 },
      filter_clogging: { state: 2500, capacity: 5000 },
    });
    const snap = e.snapshot();
    expect(snap.components.guide_wear.state).toBe(0.1);
    expect(snap.components.filter_clogging.state).toBe(2500);
  });

  it("load() clamps negative state to 0", () => {
    const e = new WEDMDegradationModelEngine();
    e.load({ guide_wear: { state: -5 } });
    expect(e.snapshot().components.guide_wear.state).toBe(0);
  });

  it("setCapacities() preserves current state", () => {
    const e = new WEDMDegradationModelEngine();
    e.update(nominalUsage());
    const before = e.snapshot().components.wire_fatigue.state;
    e.setCapacities({ wire_fatigue: 500 });
    expect(e.snapshot().components.wire_fatigue.state).toBe(before);
    expect(e.snapshot().components.wire_fatigue.capacity).toBe(500);
  });

  it("reset() zeros state, keeps capacity", () => {
    const e = new WEDMDegradationModelEngine();
    e.setCapacities({ guide_wear: 2 });
    e.update(nominalUsage());
    e.reset();
    const snap = e.snapshot();
    expect(snap.components.guide_wear.state).toBe(0);
    expect(snap.components.guide_wear.capacity).toBe(2);
  });
});

// ----------------------------------------------------------------------------
// Accessor + singleton
// ----------------------------------------------------------------------------

describe("WEDMDegradationModelEngine — accessors & singleton", () => {
  it("getComponent returns index + health", () => {
    const e = new WEDMDegradationModelEngine();
    e.update(nominalUsage());
    const c = e.getComponent("wire_fatigue");
    expect(c.index).toBeGreaterThan(0);
    expect(c.health).toBe(1 - c.index);
  });

  it("singleton exists with all 5 components", () => {
    const snap = wedmDegradationModelEngine.snapshot();
    expect(Object.keys(snap.components)).toHaveLength(5);
  });
});
