/**
 * WEDMMachineStateEngine Tests — WEDM AGI Phase 1 / U-P1-01
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WEDMMachineStateEngine,
  type WEDMSensorReading,
} from "../../engines/WEDMMachineStateEngine.js";

const reading = (overrides: Partial<WEDMSensorReading>): WEDMSensorReading => ({
  t_ms: 0,
  ...overrides,
});

describe("WEDMMachineStateEngine.ingest — mode classification", () => {
  let engine: WEDMMachineStateEngine;
  beforeEach(() => {
    engine = new WEDMMachineStateEngine();
  });

  it("classifies an empty frame as idle with confidence", () => {
    const s = engine.ingest(reading({ t_ms: 1000 }));
    expect(s.mode).toBe("idle");
    expect(s.modeConfidence).toBeGreaterThan(0);
    expect(s.modeConfidence).toBeLessThanOrEqual(1);
    expect(s.healthScore).toBeCloseTo(1.0, 5);
  });

  it("classifies active discharge as cutting", () => {
    const s = engine.ingest(
      reading({ t_ms: 1000, discharge_current_A: 12, spark_frequency_Hz: 4500 }),
    );
    expect(s.mode).toBe("cutting");
    expect(s.modeConfidence).toBeGreaterThan(0.5);
  });

  it("classifies probing with wire tension as calibrating", () => {
    const s = engine.ingest(
      reading({
        t_ms: 1000,
        discharge_current_A: 0.05,
        wire_tension_N: 8,
        position_x_mm: 25.1,
      }),
    );
    expect(s.mode).toBe("calibrating");
  });

  it("raises alarm when controller reports non-zero alarm bits", () => {
    const s = engine.ingest(reading({ t_ms: 1000, alarm_bits: 0b0001 }));
    expect(s.mode).toBe("alarm");
    expect(s.activeAlarmBits).toBe(1);
    expect(s.healthScore).toBeLessThan(0.5);
  });

  it("escalates sustained alarm bits to fault", () => {
    engine.ingest(reading({ t_ms: 1000, alarm_bits: 0b0010 }));
    const s2 = engine.ingest(reading({ t_ms: 1020, alarm_bits: 0b0010 }));
    expect(s2.mode).toBe("fault");
    expect(s2.healthScore).toBe(0);
  });
});

describe("WEDMMachineStateEngine — channel aggregation", () => {
  let engine: WEDMMachineStateEngine;
  beforeEach(() => { engine = new WEDMMachineStateEngine(); });

  it("wraps numeric readings as AtomicValue with unit + source", () => {
    const s = engine.ingest(
      reading({ t_ms: 0, gap_voltage_V: 80, wire_tension_N: 9, bath_temperature_C: 22 }),
    );
    expect(s.channels.gap_voltage?.value).toBe(80);
    expect(s.channels.gap_voltage?.unit).toBe("V");
    expect(s.channels.wire_tension?.source).toBe("wire_tension");
    expect(s.channels.bath_temperature?.confidence).toBeCloseTo(0.95, 5);
  });

  it("leaves missing channels as null (no fabrication)", () => {
    const s = engine.ingest(reading({ t_ms: 0 }));
    expect(s.channels.gap_voltage).toBeNull();
    expect(s.channels.discharge_current).toBeNull();
    expect(s.channels.spark_frequency).toBeNull();
  });

  it("flags out-of-bounds readings with a warning and low confidence", () => {
    const s = engine.ingest(
      reading({ t_ms: 0, bath_temperature_C: 60, wire_tension_N: 40 }),
    );
    expect(s.channels.bath_temperature?.warning).toMatch(/out of/);
    expect(s.channels.wire_tension?.confidence).toBeCloseTo(0.4, 5);
    expect(s.activeWarnings.length).toBe(2);
  });

  it("captures full X/Y/U/V/Z position when provided", () => {
    const s = engine.ingest(
      reading({
        t_ms: 0,
        position_x_mm: 10,
        position_y_mm: 20,
        position_u_mm: 0.25,
        position_v_mm: -0.1,
        position_z_mm: 40,
      }),
    );
    expect(s.position_mm).toEqual({ x: 10, y: 20, u: 0.25, v: -0.1, z: 40 });
  });
});

describe("WEDMMachineStateEngine — history / transitions", () => {
  let engine: WEDMMachineStateEngine;
  beforeEach(() => { engine = new WEDMMachineStateEngine(4); });

  it("returns most recent state via getState()", () => {
    engine.ingest(reading({ t_ms: 1000 }));
    engine.ingest(reading({ t_ms: 1050, discharge_current_A: 10 }));
    const s = engine.getState();
    expect(s?.t_ms).toBe(1050);
    expect(s?.mode).toBe("cutting");
  });

  it("returns null state before any ingest", () => {
    expect(new WEDMMachineStateEngine().getState()).toBeNull();
  });

  it("bounds history to configured capacity (ring buffer)", () => {
    for (let i = 0; i < 10; i++) engine.ingest(reading({ t_ms: i * 10 }));
    expect(engine.getHistory(10_000).length).toBe(4);
  });

  it("windows history by elapsed ms relative to latest", () => {
    engine.ingest(reading({ t_ms: 0 }));
    engine.ingest(reading({ t_ms: 100 }));
    engine.ingest(reading({ t_ms: 500 }));
    engine.ingest(reading({ t_ms: 1000 }));
    // Window of 600 ms from latest (1000) → include 500, 1000
    const recent = engine.getHistory(600);
    expect(recent.map(s => s.t_ms)).toEqual([500, 1000]);
  });

  it("records transitions idle → cutting → idle with causes", () => {
    engine.ingest(reading({ t_ms: 0 }));
    engine.ingest(reading({ t_ms: 100, discharge_current_A: 8 }));
    engine.ingest(reading({ t_ms: 200, discharge_current_A: 0 }));
    const t = engine.getTransitions();
    expect(t.length).toBe(2);
    expect(t[0]).toMatchObject({ from: "idle", to: "cutting" });
    expect(t[1]).toMatchObject({ from: "cutting", to: "idle" });
    expect(t[0].cause).toMatch(/current|spark/);
  });

  it("reset() clears history, transitions, and last mode", () => {
    engine.ingest(reading({ t_ms: 0, discharge_current_A: 10 }));
    engine.reset();
    expect(engine.getState()).toBeNull();
    expect(engine.getTransitions()).toEqual([]);
    // After reset, a fresh cutting frame still registers a transition from idle
    engine.ingest(reading({ t_ms: 10, discharge_current_A: 10 }));
    expect(engine.getTransitions()).toEqual([
      expect.objectContaining({ from: "idle", to: "cutting" }),
    ]);
  });
});

describe("WEDMMachineStateEngine — latency budget (exit gate)", () => {
  it("reports latencyMs ≤ 10 for a single ingest (with caller-supplied clock)", () => {
    const engine = new WEDMMachineStateEngine();
    const s = engine.ingest(
      reading({
        t_ms: 1000,
        gap_voltage_V: 80,
        discharge_current_A: 12,
        wire_tension_N: 9,
        flush_pressure_bar: 5,
        bath_temperature_C: 22,
        spark_frequency_Hz: 4500,
      }),
      /* nowMs override */ 0.4,
    );
    expect(s.latencyMs).toBeLessThanOrEqual(10);
  });
});
