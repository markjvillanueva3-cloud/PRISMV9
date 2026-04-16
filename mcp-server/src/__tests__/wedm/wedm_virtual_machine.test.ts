/**
 * WEDMVirtualMachineEngine Tests — WEDM AGI Phase 1 / U-P1-03 (digital twin)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { WEDMVirtualMachineEngine } from "../../engines/WEDMVirtualMachineEngine.js";
import type {
  WEDMMachineState,
} from "../../engines/WEDMMachineStateEngine.js";

function mkMachine(overrides: Partial<WEDMMachineState> = {}): WEDMMachineState {
  return {
    t_ms: 0,
    mode: "cutting",
    modeConfidence: 0.9,
    healthScore: 1.0,
    channels: {
      gap_voltage: null,
      discharge_current: null,
      wire_tension: null,
      flush_pressure: null,
      bath_temperature: null,
      spark_frequency: null,
    },
    position_mm: { x: 0, y: 0, u: 0, v: 0, z: 0 },
    activeAlarmBits: 0,
    activeWarnings: [],
    latencyMs: 0,
    ...overrides,
  };
}

describe("WEDMVirtualMachineEngine.sync — state tracking", () => {
  let engine: WEDMVirtualMachineEngine;
  beforeEach(() => {
    engine = new WEDMVirtualMachineEngine();
  });

  it("initialises state from first machine frame (zero velocity, zero integrals)", () => {
    const s = engine.sync(
      mkMachine({ t_ms: 100, position_mm: { x: 10, y: 5, u: 0, v: 0, z: 0 } }),
    );
    expect(s.position_mm).toEqual({ x: 10, y: 5, u: 0, v: 0, z: 0 });
    expect(s.velocity_mm_s).toEqual({ x: 0, y: 0, u: 0, v: 0, z: 0 });
    expect(s.cumulative.cut_length_mm).toBe(0);
  });

  it("computes XY velocity from position delta over dt", () => {
    engine.sync(mkMachine({ t_ms: 0, position_mm: { x: 0, y: 0, u: 0, v: 0, z: 0 } }));
    const s = engine.sync(
      mkMachine({ t_ms: 1000, position_mm: { x: 5, y: 12, u: 0, v: 0, z: 0 } }),
    );
    expect(s.velocity_mm_s.x).toBeCloseTo(5, 5);
    expect(s.velocity_mm_s.y).toBeCloseTo(12, 5);
  });

  it("integrates XY cut length via planar Euclidean distance", () => {
    engine.sync(mkMachine({ t_ms: 0, position_mm: { x: 0, y: 0, u: 0, v: 0, z: 0 } }));
    engine.sync(mkMachine({ t_ms: 100, position_mm: { x: 3, y: 4, u: 0, v: 0, z: 0 } }));
    const s = engine.sync(
      mkMachine({ t_ms: 200, position_mm: { x: 3, y: 9, u: 0, v: 0, z: 0 } }),
    );
    // 0→(3,4) = 5 mm, (3,4)→(3,9) = 5 mm → total 10 mm
    expect(s.cumulative.cut_length_mm).toBeCloseTo(10, 5);
  });

  it("integrates wire consumption from caller-supplied feed rate", () => {
    engine.setWireFeed(150 / 60); // 150 mm/min = 2.5 mm/s
    engine.sync(mkMachine({ t_ms: 0 }));
    const s = engine.sync(mkMachine({ t_ms: 2000 })); // 2 s elapsed
    expect(s.cumulative.wire_consumed_mm).toBeCloseTo(5, 5);
  });

  it("decrements wire_remaining when spool capacity is configured", () => {
    const e = new WEDMVirtualMachineEngine({ wire_spool_mm: 100, wire_feed_mm_s: 1 });
    e.sync(mkMachine({ t_ms: 0 }));
    e.sync(mkMachine({ t_ms: 10_000 })); // 10 mm consumed
    expect(e.getWireRemaining()).toBeCloseTo(90, 5);
  });

  it("keeps wire_remaining at null when spool capacity is not set", () => {
    const e = new WEDMVirtualMachineEngine();
    e.setWireFeed(5);
    e.sync(mkMachine({ t_ms: 0 }));
    e.sync(mkMachine({ t_ms: 1000 }));
    expect(e.getWireRemaining()).toBeNull();
  });

  it("only accrues discharge_energy when current > 0", () => {
    const e = new WEDMVirtualMachineEngine({ energy_J_per_discharge: 1 });
    // frame 1: idle
    e.sync(
      mkMachine({
        t_ms: 0,
        channels: {
          ...mkMachine().channels,
          discharge_current: { value: 0, unit: "A", source: "x" },
          spark_frequency: { value: 1000, unit: "Hz", source: "x" },
        },
      }),
    );
    // frame 2: no discharge, spark_freq 0
    const s = e.sync(
      mkMachine({
        t_ms: 500,
        channels: {
          ...mkMachine().channels,
          discharge_current: { value: 0, unit: "A", source: "x" },
          spark_frequency: { value: 0, unit: "Hz", source: "x" },
        },
      }),
    );
    expect(s.cumulative.discharge_energy_J).toBe(0);
  });

  it("accumulates discharge_energy with active current", () => {
    const e = new WEDMVirtualMachineEngine({ energy_J_per_discharge: 0.1 });
    e.sync(mkMachine({ t_ms: 0, channels: {
      ...mkMachine().channels,
      discharge_current: { value: 10, unit: "A", source: "x" },
      spark_frequency: { value: 1000, unit: "Hz", source: "x" },
    } }));
    const s = e.sync(mkMachine({ t_ms: 1000, channels: {
      ...mkMachine().channels,
      discharge_current: { value: 10, unit: "A", source: "x" },
      spark_frequency: { value: 1000, unit: "Hz", source: "x" },
    } }));
    // dt=1s, spark=1000Hz, J=0.1 → 100 J accrued on the second step
    expect(s.cumulative.discharge_energy_J).toBeCloseTo(100, 5);
  });
});

describe("WEDMVirtualMachineEngine.predict", () => {
  it("returns null before first sync", () => {
    expect(new WEDMVirtualMachineEngine().predict(100)).toBeNull();
  });

  it("linearly extrapolates position using current velocity", () => {
    const e = new WEDMVirtualMachineEngine();
    e.sync(mkMachine({ t_ms: 0 }));
    e.sync(mkMachine({ t_ms: 1000, position_mm: { x: 10, y: 0, u: 0, v: 0, z: 0 } }));
    const p = e.predict(200)!; // +200 ms
    expect(p.position_mm.x).toBeCloseTo(12, 5); // 10 mm/s * 0.2 s + 10
    expect(p.t_ms).toBe(1200);
    expect(p.horizonMs).toBe(200);
    expect(p.mode_guess).toBe("cutting");
  });

  it("position error within 1 mm on a 200 ms horizon at constant velocity (exit gate)", () => {
    const e = new WEDMVirtualMachineEngine();
    // 0 → 1 s: moves at 10 mm/s in X
    e.sync(mkMachine({ t_ms: 0 }));
    e.sync(mkMachine({ t_ms: 1000, position_mm: { x: 10, y: 0, u: 0, v: 0, z: 0 } }));
    const p = e.predict(200)!;
    // The actual physical position 200 ms later (if velocity really is 10 mm/s)
    const actual = { x: 12, y: 0, z: 0 };
    const err = Math.hypot(p.position_mm.x - actual.x, p.position_mm.y - actual.y);
    expect(err).toBeLessThan(1.0);
  });

  it("decays confidence with horizon (1 s horizon → 0 confidence)", () => {
    const e = new WEDMVirtualMachineEngine();
    e.sync(mkMachine({ t_ms: 0 }));
    e.sync(mkMachine({ t_ms: 100 }));
    expect(e.predict(100)!.confidence).toBeGreaterThan(0.8);
    expect(e.predict(1000)!.confidence).toBe(0);
  });

  it("predicts wire_remaining given feed rate + spool", () => {
    const e = new WEDMVirtualMachineEngine({ wire_spool_mm: 100, wire_feed_mm_s: 5 });
    e.sync(mkMachine({ t_ms: 0 }));
    e.sync(mkMachine({ t_ms: 1000 })); // 5 mm consumed → 95 remaining
    const p = e.predict(1000)!; // +1 s → 5 more
    expect(p.wire_remaining_mm).toBeCloseTo(90, 5);
  });
});

describe("WEDMVirtualMachineEngine.compareToPhysical", () => {
  it("computes Euclidean XYZ error and per-axis delta", () => {
    const e = new WEDMVirtualMachineEngine();
    e.sync(mkMachine({ t_ms: 0, position_mm: { x: 10, y: 10, u: 0, v: 0, z: 5 } }));
    const d = e.compareToPhysical(
      mkMachine({ t_ms: 5, position_mm: { x: 10.3, y: 10.4, u: 0, v: 0, z: 5 } }),
    )!;
    expect(d.position_error_mm).toBeCloseTo(Math.hypot(0.3, 0.4, 0), 5);
    expect(d.axis_errors_mm.x).toBeCloseTo(0.3, 5);
    expect(d.withinBudget).toBe(true);
  });

  it("flags withinBudget=false when error ≥ 1 mm", () => {
    const e = new WEDMVirtualMachineEngine();
    e.sync(mkMachine({ t_ms: 0 }));
    const d = e.compareToPhysical(
      mkMachine({ t_ms: 5, position_mm: { x: 1.5, y: 0, u: 0, v: 0, z: 0 } }),
    )!;
    expect(d.withinBudget).toBe(false);
  });

  it("returns mode_mismatch when physical mode differs from twin", () => {
    const e = new WEDMVirtualMachineEngine();
    e.sync(mkMachine({ t_ms: 0, mode: "cutting" }));
    const d = e.compareToPhysical(mkMachine({ t_ms: 5, mode: "alarm" }))!;
    expect(d.mode_mismatch).toBe(true);
  });

  it("returns null when no state exists yet", () => {
    expect(new WEDMVirtualMachineEngine().compareToPhysical(mkMachine({}))).toBeNull();
  });
});

describe("WEDMVirtualMachineEngine — latency + reset", () => {
  it("syncLatencyMs ≤ 10 under caller-supplied clock (P1-MS1 exit gate)", () => {
    const e = new WEDMVirtualMachineEngine();
    const s = e.sync(mkMachine({ t_ms: 0 }), undefined, /* nowMsOverride */ 1.2);
    expect(s.syncLatencyMs).toBeLessThanOrEqual(10);
  });

  it("reset clears state but preserves engine config by default", () => {
    const e = new WEDMVirtualMachineEngine({ wire_spool_mm: 100 });
    e.setWireFeed(1);
    e.sync(mkMachine({ t_ms: 0 }));
    e.sync(mkMachine({ t_ms: 10_000 }));
    e.reset();
    expect(e.getState()).toBeNull();
    // spool_mm not overridden → preserved
    expect(e.getWireRemaining()).not.toBeNull();
  });

  it("reset with new wire_spool_mm overrides the spool", () => {
    const e = new WEDMVirtualMachineEngine({ wire_spool_mm: 100 });
    e.reset({ wire_spool_mm: 500 });
    expect(e.getWireRemaining()).toBe(500);
  });
});
