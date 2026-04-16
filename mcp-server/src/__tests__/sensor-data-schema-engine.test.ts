/**
 * Tests for SensorDataSchemaEngine — SCI-MS0 U01
 * Ring buffer, schema validation, sensor data store
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  SensorDataSchemaEngine,
  RingBuffer,
  SensorDataStore,
  type SpindleLoadSample,
  type VibrationSample,
  type ForceSample,
  type TemperatureSample,
} from "../engines/SensorDataSchemaEngine.js";

// ── RingBuffer ──────────────────────────────────────────────

describe("RingBuffer", () => {
  it("stores and retrieves samples in order", () => {
    const buf = new RingBuffer<number>(5);
    buf.push(1); buf.push(2); buf.push(3);
    expect(buf.getAll()).toEqual([1, 2, 3]);
    expect(buf.size).toBe(3);
    expect(buf.isFull).toBe(false);
  });

  it("overwrites oldest when at capacity", () => {
    const buf = new RingBuffer<number>(3);
    buf.push(1); buf.push(2); buf.push(3); buf.push(4);
    expect(buf.getAll()).toEqual([2, 3, 4]);
    expect(buf.size).toBe(3);
    expect(buf.isFull).toBe(true);
  });

  it("getLast returns most recent N samples", () => {
    const buf = new RingBuffer<number>(10);
    for (let i = 0; i < 7; i++) buf.push(i);
    expect(buf.getLast(3)).toEqual([4, 5, 6]);
    expect(buf.getLast(100)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("getLast works after wrap-around", () => {
    const buf = new RingBuffer<number>(3);
    buf.push(10); buf.push(20); buf.push(30); buf.push(40); buf.push(50);
    expect(buf.getLast(2)).toEqual([40, 50]);
    expect(buf.getAll()).toEqual([30, 40, 50]);
  });

  it("handles capacity of 1", () => {
    const buf = new RingBuffer<number>(1);
    buf.push(1); buf.push(2);
    expect(buf.getAll()).toEqual([2]);
    expect(buf.size).toBe(1);
  });

  it("clear resets the buffer", () => {
    const buf = new RingBuffer<number>(5);
    buf.push(1); buf.push(2); buf.push(3);
    buf.clear();
    expect(buf.size).toBe(0);
    expect(buf.getAll()).toEqual([]);
    expect(buf.isFull).toBe(false);
  });

  it("empty buffer returns empty arrays", () => {
    const buf = new RingBuffer<number>(5);
    expect(buf.getAll()).toEqual([]);
    expect(buf.getLast(5)).toEqual([]);
    expect(buf.size).toBe(0);
  });

  it("enforces minimum capacity of 1", () => {
    const buf = new RingBuffer<number>(0);
    buf.push(42);
    expect(buf.getAll()).toEqual([42]);
  });
});

// ── SensorDataStore ─────────────────────────────────────────

describe("SensorDataStore", () => {
  let store: SensorDataStore;

  beforeEach(() => {
    store = new SensorDataStore();
  });

  it("ingests valid spindle samples", () => {
    const samples: SpindleLoadSample[] = [
      { timestamp_ms: 0, load_pct: 45, power_kw: 5.2, torque_nm: 12.1, rpm_actual: 8000 },
      { timestamp_ms: 1, load_pct: 46, power_kw: 5.3, torque_nm: 12.2, rpm_actual: 8000 },
    ];
    const result = store.ingest("spindle_load", samples);
    expect(result.accepted).toBe(2);
    expect(result.rejected).toBe(0);
    expect(store.spindle.size).toBe(2);
  });

  it("ingests valid vibration samples", () => {
    const samples: VibrationSample[] = [
      { timestamp_ms: 0, accel_x_g: 0.1, accel_y_g: 0.2, accel_z_g: 0.05, velocity_mm_s: 1.5, displacement_um: 3.0 },
    ];
    const result = store.ingest("vibration", samples);
    expect(result.accepted).toBe(1);
    expect(result.rejected).toBe(0);
  });

  it("ingests valid force samples with optional moments", () => {
    const samples: ForceSample[] = [
      { timestamp_ms: 0, fx_n: 100, fy_n: 50, fz_n: 200 },
      { timestamp_ms: 1, fx_n: 110, fy_n: 55, fz_n: 210, mx_nm: 1.2, my_nm: 0.5, mz_nm: 0.3 },
    ];
    const result = store.ingest("force", samples);
    expect(result.accepted).toBe(2);
    expect(result.rejected).toBe(0);
  });

  it("ingests valid temperature samples", () => {
    const samples: TemperatureSample[] = [
      { timestamp_ms: 0, tool_temp_c: 35, workpiece_temp_c: 28, coolant_temp_c: 22 },
    ];
    const result = store.ingest("temperature", samples);
    expect(result.accepted).toBe(1);
  });

  it("rejects invalid samples (missing required field)", () => {
    const bad = [{ timestamp_ms: 0, load_pct: 45 }]; // missing power_kw, torque_nm, rpm_actual
    const result = store.ingest("spindle_load", bad as any);
    expect(result.rejected).toBe(1);
    expect(result.accepted).toBe(0);
  });

  it("rejects samples with non-number fields", () => {
    const bad = [{ timestamp_ms: "zero", load_pct: 45, power_kw: 5, torque_nm: 12, rpm_actual: 8000 }];
    const result = store.ingest("spindle_load", bad as any);
    expect(result.rejected).toBe(1);
  });

  it("rejects samples with NaN/Infinity", () => {
    const bad = [{ timestamp_ms: 0, load_pct: NaN, power_kw: 5, torque_nm: 12, rpm_actual: 8000 }];
    const result = store.ingest("spindle_load", bad as any);
    expect(result.rejected).toBe(1);
  });

  it("getSamples retrieves all or last N", () => {
    const samples: TemperatureSample[] = [];
    for (let i = 0; i < 5; i++) {
      samples.push({ timestamp_ms: i * 100, tool_temp_c: 30 + i, workpiece_temp_c: 25, coolant_temp_c: 20 });
    }
    store.ingest("temperature", samples);
    const all = store.getSamples("temperature");
    expect(all.length).toBe(5);
    const last2 = store.getSamples("temperature", 2);
    expect(last2.length).toBe(2);
  });

  it("getStatus returns buffer status for all 4 types", () => {
    const status = store.getStatus();
    expect(status.length).toBe(4);
    const types = status.map(s => s.type);
    expect(types).toContain("spindle_load");
    expect(types).toContain("vibration");
    expect(types).toContain("force");
    expect(types).toContain("temperature");
    // All empty initially
    for (const s of status) {
      expect(s.depth).toBe(0);
      expect(s.full).toBe(false);
    }
  });

  it("getStatus computes actual_hz from timestamps", () => {
    const samples: ForceSample[] = [];
    for (let i = 0; i < 100; i++) {
      samples.push({ timestamp_ms: i * 0.5, fx_n: 100, fy_n: 50, fz_n: 200 }); // 2000 Hz
    }
    store.ingest("force", samples);
    const status = store.getStatus().find(s => s.type === "force")!;
    expect(status.depth).toBe(100);
    expect(status.actual_hz).toBeGreaterThan(1900);
    expect(status.actual_hz).toBeLessThan(2100);
  });

  it("setSampleRate updates expected Hz", () => {
    store.setSampleRate("vibration", 10000);
    const status = store.getStatus().find(s => s.type === "vibration")!;
    expect(status.expected_hz).toBe(10000);
  });
});

// ── SensorDataSchemaEngine ──────────────────────────────────

describe("SensorDataSchemaEngine", () => {
  const engine = new SensorDataSchemaEngine();

  it("validates correct spindle samples", () => {
    const result = engine.validate({
      type: "spindle_load",
      samples: [
        { timestamp_ms: 0, load_pct: 45, power_kw: 5.2, torque_nm: 12.1, rpm_actual: 8000 },
      ],
    });
    expect(result.value.valid).toBe(true);
    expect(result.value.errors.length).toBe(0);
    expect(result.value.validated_count).toBe(1);
    expect(result.unit).toBe("validation_result");
    expect(result.confidence).toBe(1);
  });

  it("rejects unknown sensor type", () => {
    const result = engine.validate({ type: "unknown" as any, samples: [] });
    expect(result.value.valid).toBe(false);
    expect(result.value.errors[0]).toContain("unknown sensor type");
  });

  it("rejects non-array samples", () => {
    const result = engine.validate({ type: "force", samples: "not array" as any });
    expect(result.value.valid).toBe(false);
    expect(result.value.errors[0]).toContain("must be an array");
  });

  it("reports per-sample errors with index", () => {
    const result = engine.validate({
      type: "force",
      samples: [
        { timestamp_ms: 0, fx_n: 100, fy_n: 50, fz_n: 200 }, // valid
        { timestamp_ms: 1, fx_n: 100 }, // missing fy_n, fz_n
      ],
    });
    expect(result.value.valid).toBe(false);
    expect(result.value.validated_count).toBe(1);
    expect(result.value.errors.some(e => e.startsWith("[1]"))).toBe(true);
  });

  it("validates temperature samples with all required fields", () => {
    const result = engine.validate({
      type: "temperature",
      samples: [
        { timestamp_ms: 0, tool_temp_c: 35, workpiece_temp_c: 28, coolant_temp_c: 22 },
        { timestamp_ms: 100, tool_temp_c: 36, workpiece_temp_c: 29, coolant_temp_c: 22 },
      ],
    });
    expect(result.value.valid).toBe(true);
    expect(result.value.validated_count).toBe(2);
  });

  it("handles null sample in array", () => {
    const result = engine.validate({
      type: "spindle_load",
      samples: [null as any],
    });
    expect(result.value.valid).toBe(false);
    expect(result.value.errors[0]).toContain("non-null object");
  });

  it("formula field contains sensor type and count", () => {
    const result = engine.validate({
      type: "vibration",
      samples: [
        { timestamp_ms: 0, accel_x_g: 0.1, accel_y_g: 0.2, accel_z_g: 0.05, velocity_mm_s: 1.5, displacement_um: 3.0 },
      ],
    });
    expect(result.formula).toContain("vibration");
    expect(result.formula).toContain("n=1");
  });
});
