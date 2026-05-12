/**
 * SCI-MS0 Sensor Engines — Comprehensive Test Suite
 *
 * Tests 4 engines: SensorDataSchemaEngine, SensorSimulatorEngine,
 * SensorFusionEngine, RealTimeAnomalyDetectionEngine.
 *
 * 76+ tests covering validation, simulation, fusion, and anomaly detection.
 */

import { describe, it, expect } from "vitest";
import {
  sensorDataSchemaEngine,
  SensorDataSchemaEngine,
  RingBuffer,
  SensorDataStore,
} from "../engines/SensorDataSchemaEngine.js";
import {
  sensorSimulatorEngine,
  SensorSimulatorEngine,
} from "../engines/SensorSimulatorEngine.js";
import {
  sensorFusionEngine,
  SensorFusionEngine,
} from "../engines/SensorFusionEngine.js";
import { realTimeAnomalyDetectionEngine } from "../engines/RealTimeAnomalyDetectionEngine.js";

// ============================================================================
// Test data generators
// ============================================================================

function makeForceSamples(count: number, baseForce = 450) {
  return Array.from({ length: count }, (_, i) => ({
    timestamp_ms: i * 10,
    fx_n: baseForce * 0.6 + Math.sin(i * 0.1) * 5,
    fy_n: baseForce * 0.3 + Math.cos(i * 0.1) * 3,
    fz_n: baseForce * 0.8 + Math.sin(i * 0.15) * 4,
  }));
}

function makeSpindleSamples(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    timestamp_ms: i * 10,
    load_pct: 45 + Math.sin(i * 0.05) * 2,
    power_kw: 5.5 + Math.sin(i * 0.05) * 0.3,
    torque_nm: 12.3 + Math.sin(i * 0.05) * 0.5,
    rpm_actual: 8000 + Math.sin(i * 0.02) * 50,
  }));
}

function makeVibrationSamples(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    timestamp_ms: i * 10,
    accel_x_g: 0.5 + Math.sin(i * 0.3) * 0.1,
    accel_y_g: 0.3 + Math.cos(i * 0.3) * 0.08,
    accel_z_g: 0.7 + Math.sin(i * 0.2) * 0.15,
    velocity_mm_s: 2.5 + Math.sin(i * 0.1) * 0.3,
    displacement_um: 1.2 + Math.cos(i * 0.1) * 0.1,
  }));
}

function makeTemperatureSamples(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    timestamp_ms: i * 10,
    tool_temp_c: 85 + i * 0.5 + Math.random() * 2,
    workpiece_temp_c: 40 + i * 0.2,
    coolant_temp_c: 22 + i * 0.05,
  }));
}

function stableSignal(count: number, center = 100, noise = 1): number[] {
  return Array.from({ length: count }, () => center + (Math.random() - 0.5) * noise * 2);
}

// ============================================================================
// 1. SensorDataSchemaEngine
// ============================================================================

describe("SensorDataSchemaEngine", () => {
  describe("singleton export", () => {
    it("exports sensorDataSchemaEngine singleton", () => {
      expect(sensorDataSchemaEngine).toBeInstanceOf(SensorDataSchemaEngine);
    });

    it("has a validate method", () => {
      expect(typeof sensorDataSchemaEngine.validate).toBe("function");
    });
  });

  describe("force validation", () => {
    it("validates 5 valid force samples", () => {
      const samples = makeForceSamples(5);
      const result = sensorDataSchemaEngine.validate({ type: "force", samples });
      expect(result.value.valid).toBe(true);
      expect(result.value.validated_count).toBe(5);
      expect(result.value.errors).toHaveLength(0);
      expect(result.unit).toBe("validation_result");
    });

    it("validates force samples with optional moment fields", () => {
      const samples = [
        { timestamp_ms: 0, fx_n: 100, fy_n: 50, fz_n: 200, mx_nm: 1.5, my_nm: 0.8, mz_nm: 0.3 },
      ];
      const result = sensorDataSchemaEngine.validate({ type: "force", samples });
      expect(result.value.valid).toBe(true);
      expect(result.value.validated_count).toBe(1);
    });

    it("rejects force sample missing fx_n", () => {
      const samples = [{ timestamp_ms: 0, fy_n: 50, fz_n: 200 }];
      const result = sensorDataSchemaEngine.validate({ type: "force", samples });
      expect(result.value.valid).toBe(false);
      expect(result.value.errors.length).toBeGreaterThan(0);
      expect(result.value.errors[0]).toContain("fx_n");
    });

    it("rejects force sample with string fx_n", () => {
      const samples = [{ timestamp_ms: 0, fx_n: "bad", fy_n: 50, fz_n: 200 }];
      const result = sensorDataSchemaEngine.validate({ type: "force", samples });
      expect(result.value.valid).toBe(false);
      expect(result.value.errors.some((e: string) => e.includes("fx_n"))).toBe(true);
    });

    it("rejects force sample with NaN value", () => {
      const samples = [{ timestamp_ms: 0, fx_n: NaN, fy_n: 50, fz_n: 200 }];
      const result = sensorDataSchemaEngine.validate({ type: "force", samples });
      expect(result.value.valid).toBe(false);
      expect(result.value.errors.some((e: string) => e.includes("finite"))).toBe(true);
    });

    it("rejects force sample with Infinity", () => {
      const samples = [{ timestamp_ms: 0, fx_n: Infinity, fy_n: 50, fz_n: 200 }];
      const result = sensorDataSchemaEngine.validate({ type: "force", samples });
      expect(result.value.valid).toBe(false);
    });

    it("validates large batch of 100 force samples", () => {
      const samples = makeForceSamples(100);
      const result = sensorDataSchemaEngine.validate({ type: "force", samples });
      expect(result.value.valid).toBe(true);
      expect(result.value.validated_count).toBe(100);
    });
  });

  describe("spindle_load validation", () => {
    it("validates valid spindle_load samples", () => {
      const samples = makeSpindleSamples(5);
      const result = sensorDataSchemaEngine.validate({ type: "spindle_load", samples });
      expect(result.value.valid).toBe(true);
      expect(result.value.validated_count).toBe(5);
    });

    it("rejects spindle sample missing torque_nm", () => {
      const samples = [{ timestamp_ms: 0, load_pct: 40, power_kw: 5, rpm_actual: 8000 }];
      const result = sensorDataSchemaEngine.validate({ type: "spindle_load", samples });
      expect(result.value.valid).toBe(false);
      expect(result.value.errors.some((e: string) => e.includes("torque_nm"))).toBe(true);
    });

    it("rejects spindle sample missing load_pct", () => {
      const samples = [{ timestamp_ms: 0, power_kw: 5, torque_nm: 12, rpm_actual: 8000 }];
      const result = sensorDataSchemaEngine.validate({ type: "spindle_load", samples });
      expect(result.value.valid).toBe(false);
    });
  });

  describe("vibration validation", () => {
    it("validates valid vibration samples", () => {
      const samples = makeVibrationSamples(5);
      const result = sensorDataSchemaEngine.validate({ type: "vibration", samples });
      expect(result.value.valid).toBe(true);
      expect(result.value.validated_count).toBe(5);
    });

    it("rejects vibration sample missing velocity_mm_s", () => {
      const samples = [{
        timestamp_ms: 0, accel_x_g: 0.5, accel_y_g: 0.3,
        accel_z_g: 0.7, displacement_um: 1.2,
      }];
      const result = sensorDataSchemaEngine.validate({ type: "vibration", samples });
      expect(result.value.valid).toBe(false);
      expect(result.value.errors.some((e: string) => e.includes("velocity_mm_s"))).toBe(true);
    });

    it("rejects vibration sample missing displacement_um", () => {
      const samples = [{
        timestamp_ms: 0, accel_x_g: 0.5, accel_y_g: 0.3,
        accel_z_g: 0.7, velocity_mm_s: 2.5,
      }];
      const result = sensorDataSchemaEngine.validate({ type: "vibration", samples });
      expect(result.value.valid).toBe(false);
    });
  });

  describe("temperature validation", () => {
    it("validates valid temperature samples", () => {
      const samples = makeTemperatureSamples(5);
      const result = sensorDataSchemaEngine.validate({ type: "temperature", samples });
      expect(result.value.valid).toBe(true);
      expect(result.value.validated_count).toBe(5);
    });

    it("rejects temperature sample missing workpiece_temp_c", () => {
      const samples = [{ timestamp_ms: 0, tool_temp_c: 85, coolant_temp_c: 22 }];
      const result = sensorDataSchemaEngine.validate({ type: "temperature", samples });
      expect(result.value.valid).toBe(false);
      expect(result.value.errors.some((e: string) => e.includes("workpiece_temp_c"))).toBe(true);
    });

    it("rejects temperature sample missing coolant_temp_c", () => {
      const samples = [{ timestamp_ms: 0, tool_temp_c: 85, workpiece_temp_c: 40 }];
      const result = sensorDataSchemaEngine.validate({ type: "temperature", samples });
      expect(result.value.valid).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("returns valid=true for empty samples array", () => {
      const result = sensorDataSchemaEngine.validate({ type: "force", samples: [] });
      expect(result.value.valid).toBe(true);
      expect(result.value.validated_count).toBe(0);
      expect(result.value.errors).toHaveLength(0);
    });

    it("rejects unknown sensor type", () => {
      const result = sensorDataSchemaEngine.validate({
        type: "laser" as any,
        samples: [{ timestamp_ms: 0 }],
      });
      expect(result.value.valid).toBe(false);
      expect(result.value.errors[0]).toContain("unknown sensor type");
    });

    it("rejects non-array samples input", () => {
      const result = sensorDataSchemaEngine.validate({
        type: "force",
        samples: "not an array" as any,
      });
      expect(result.value.valid).toBe(false);
      expect(result.value.errors[0]).toContain("array");
    });

    it("rejects null sample in array", () => {
      const result = sensorDataSchemaEngine.validate({
        type: "force",
        samples: [null],
      });
      expect(result.value.valid).toBe(false);
      expect(result.value.errors.some((e: string) => e.includes("non-null object"))).toBe(true);
    });

    it("counts valid and invalid in mixed batch", () => {
      const samples = [
        { timestamp_ms: 0, fx_n: 100, fy_n: 50, fz_n: 200 }, // valid
        { timestamp_ms: 10, fx_n: "bad", fy_n: 50, fz_n: 200 }, // invalid
        { timestamp_ms: 20, fx_n: 120, fy_n: 60, fz_n: 180 }, // valid
      ];
      const result = sensorDataSchemaEngine.validate({ type: "force", samples });
      expect(result.value.valid).toBe(false);
      expect(result.value.validated_count).toBe(2);
      expect(result.value.errors.length).toBeGreaterThan(0);
    });

    it("includes formula in result", () => {
      const result = sensorDataSchemaEngine.validate({ type: "force", samples: makeForceSamples(3) });
      expect(result.formula).toContain("schema_check");
      expect(result.formula).toContain("force");
    });

    it("confidence is 1", () => {
      const result = sensorDataSchemaEngine.validate({ type: "force", samples: makeForceSamples(1) });
      expect(result.confidence).toBe(1);
    });
  });

  describe("RingBuffer", () => {
    it("pushes and retrieves samples in order", () => {
      const buf = new RingBuffer<number>(5);
      for (let i = 0; i < 5; i++) buf.push(i);
      expect(buf.getAll()).toEqual([0, 1, 2, 3, 4]);
      expect(buf.size).toBe(5);
    });

    it("overwrites oldest when full", () => {
      const buf = new RingBuffer<number>(3);
      for (let i = 0; i < 5; i++) buf.push(i);
      expect(buf.getAll()).toEqual([2, 3, 4]);
      expect(buf.isFull).toBe(true);
    });

    it("getLast returns most recent n samples", () => {
      const buf = new RingBuffer<number>(10);
      for (let i = 0; i < 7; i++) buf.push(i);
      expect(buf.getLast(3)).toEqual([4, 5, 6]);
    });

    it("clear resets the buffer", () => {
      const buf = new RingBuffer<number>(5);
      for (let i = 0; i < 5; i++) buf.push(i);
      buf.clear();
      expect(buf.size).toBe(0);
      expect(buf.getAll()).toEqual([]);
    });
  });

  describe("SensorDataStore", () => {
    it("ingests valid force samples", () => {
      const store = new SensorDataStore();
      const samples = makeForceSamples(10);
      const result = store.ingest("force", samples as any);
      expect(result.accepted).toBe(10);
      expect(result.rejected).toBe(0);
    });

    it("rejects invalid samples during ingest", () => {
      const store = new SensorDataStore();
      const samples = [
        { timestamp_ms: 0, fx_n: 100, fy_n: 50, fz_n: 200 },
        { timestamp_ms: 10 }, // missing fields
      ];
      const result = store.ingest("force", samples as any);
      expect(result.accepted).toBe(1);
      expect(result.rejected).toBe(1);
    });

    it("getStatus returns 4 sensor types", () => {
      const store = new SensorDataStore();
      const status = store.getStatus();
      expect(status).toHaveLength(4);
      const types = status.map((s) => s.type);
      expect(types).toContain("spindle_load");
      expect(types).toContain("vibration");
      expect(types).toContain("force");
      expect(types).toContain("temperature");
    });

    it("tracks actual Hz from ingested timestamps", () => {
      const store = new SensorDataStore();
      // 11 samples at 1ms intervals = 10000 Hz actual
      const samples = Array.from({ length: 11 }, (_, i) => ({
        timestamp_ms: i, fx_n: 100, fy_n: 50, fz_n: 200,
      }));
      store.ingest("force", samples as any);
      const status = store.getStatus().find((s) => s.type === "force")!;
      expect(status.depth).toBe(11);
      expect(status.actual_hz).toBe(1000);
    });
  });
});

// ============================================================================
// 2. SensorSimulatorEngine
// ============================================================================

describe("SensorSimulatorEngine", () => {
  const nominal = {
    cutting_speed_mpm: 200,
    feed_mmrev: 0.15,
    depth_mm: 2,
    diameter_mm: 20,
    power_max_kw: 15,
  };

  describe("singleton export", () => {
    it("exports sensorSimulatorEngine singleton", () => {
      expect(sensorSimulatorEngine).toBeInstanceOf(SensorSimulatorEngine);
    });
  });

  describe("force simulation", () => {
    it("generates correct number of samples (1s @ 1000Hz = 1000)", () => {
      const result = sensorSimulatorEngine.simulate({
        sensor_type: "force", duration_sec: 1,
        sample_rate_hz: 1000, nominal,
      });
      expect(result.result.samples).toHaveLength(1000);
      expect(result.unit).toBe("N");
      expect(result.source).toContain("force");
    });

    it("produces physically reasonable force values", () => {
      const result = sensorSimulatorEngine.simulate({
        sensor_type: "force", duration_sec: 0.5,
        sample_rate_hz: 500, nominal,
      });
      const values = result.result.samples.map((s: any) => s.value);
      const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
      // Kienzle: Fc = 2100 * 2 * 0.15^(1-0.26) ≈ 2100 * 2 * 0.2607 ≈ 1095 N
      expect(avg).toBeGreaterThan(100);
      expect(avg).toBeLessThan(5000);
    });

    it("samples have t and value fields", () => {
      const result = sensorSimulatorEngine.simulate({
        sensor_type: "force", duration_sec: 0.01,
        sample_rate_hz: 100, nominal,
      });
      const s = result.result.samples[0];
      expect(s).toHaveProperty("t");
      expect(s).toHaveProperty("value");
      expect(typeof s.t).toBe("number");
      expect(typeof s.value).toBe("number");
    });

    it("returns nominal_values with Kienzle parameters", () => {
      const result = sensorSimulatorEngine.simulate({
        sensor_type: "force", duration_sec: 0.01,
        sample_rate_hz: 100, nominal,
      });
      expect(result.result.nominal_values).toHaveProperty("Fc_N");
      expect(result.result.nominal_values).toHaveProperty("kc11");
      expect(result.result.nominal_values).toHaveProperty("mc");
    });
  });

  describe("spindle_load simulation", () => {
    it("generates spindle load data in percentage", () => {
      const result = sensorSimulatorEngine.simulate({
        sensor_type: "spindle_load", duration_sec: 0.5,
        sample_rate_hz: 200, nominal,
      });
      expect(result.result.samples).toHaveLength(100);
      expect(result.unit).toBe("%");
      // Load should be non-negative
      result.result.samples.forEach((s: any) => {
        expect(s.value).toBeGreaterThanOrEqual(0);
      });
    });

    it("returns load and power nominals", () => {
      const result = sensorSimulatorEngine.simulate({
        sensor_type: "spindle_load", duration_sec: 0.01,
        sample_rate_hz: 100, nominal,
      });
      expect(result.result.nominal_values).toHaveProperty("load_pct");
      expect(result.result.nominal_values).toHaveProperty("Pc_kW");
    });
  });

  describe("vibration simulation", () => {
    it("generates vibration data with tooth-pass harmonics", () => {
      const result = sensorSimulatorEngine.simulate({
        sensor_type: "vibration", duration_sec: 0.1,
        sample_rate_hz: 5000, nominal,
      });
      expect(result.result.samples).toHaveLength(500);
      expect(result.unit).toBe("m/s²");
      // Vibration oscillates around zero (includes positive and negative)
      const values = result.result.samples.map((s: any) => s.value);
      const hasPositive = values.some((v: number) => v > 0);
      const hasNegative = values.some((v: number) => v < 0);
      expect(hasPositive).toBe(true);
      expect(hasNegative).toBe(true);
    });

    it("returns tooth-pass frequency in nominals", () => {
      const result = sensorSimulatorEngine.simulate({
        sensor_type: "vibration", duration_sec: 0.01,
        sample_rate_hz: 1000, nominal,
      });
      expect(result.result.nominal_values).toHaveProperty("f_tooth_Hz");
      expect(result.result.nominal_values.f_tooth_Hz).toBeGreaterThan(0);
    });
  });

  describe("temperature simulation", () => {
    it("generates temperature data with thermal lag", () => {
      const result = sensorSimulatorEngine.simulate({
        sensor_type: "temperature", duration_sec: 5,
        sample_rate_hz: 10, nominal,
      });
      expect(result.result.samples).toHaveLength(50);
      expect(result.unit).toBe("°C");
      // Temperature starts near ambient and rises
      const first = result.result.samples[0].value;
      const last = result.result.samples[result.result.samples.length - 1].value;
      expect(first).toBeGreaterThanOrEqual(0);
      expect(last).toBeGreaterThanOrEqual(first - 5); // allowing noise
    });

    it("temperature values are non-negative", () => {
      const result = sensorSimulatorEngine.simulate({
        sensor_type: "temperature", duration_sec: 2,
        sample_rate_hz: 10, nominal,
      });
      result.result.samples.forEach((s: any) => {
        expect(s.value).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("statistics", () => {
    it("returns mean and std_dev in statistics", () => {
      const result = sensorSimulatorEngine.simulate({
        sensor_type: "force", duration_sec: 1,
        sample_rate_hz: 100, nominal,
      });
      const stats = result.result.statistics;
      expect(stats).toHaveProperty("mean");
      expect(stats).toHaveProperty("std");
      expect(stats).toHaveProperty("min");
      expect(stats).toHaveProperty("max");
      expect(typeof stats.mean).toBe("number");
      expect(typeof stats.std).toBe("number");
      expect(stats.min).toBeLessThanOrEqual(stats.mean);
      expect(stats.max).toBeGreaterThanOrEqual(stats.mean);
    });

    it("tracks outlier count", () => {
      const result = sensorSimulatorEngine.simulate({
        sensor_type: "force", duration_sec: 1,
        sample_rate_hz: 1000, nominal,
        outlier_probability: 0,
      });
      expect(result.result.statistics.outlier_count).toBe(0);
    });

    it("reports failure_injected when specified", () => {
      const result = sensorSimulatorEngine.simulate({
        sensor_type: "force", duration_sec: 2,
        sample_rate_hz: 100, nominal,
        failure_at_sec: 1,
      });
      expect(result.result.statistics.failure_injected).toBe(true);
      expect(result.warning).toContain("failure");
    });

    it("failure_injected is false when not specified", () => {
      const result = sensorSimulatorEngine.simulate({
        sensor_type: "force", duration_sec: 1,
        sample_rate_hz: 100, nominal,
      });
      expect(result.result.statistics.failure_injected).toBe(false);
    });
  });

  describe("noise and drift", () => {
    it("zero noise produces consistent values", () => {
      const result = sensorSimulatorEngine.simulate({
        sensor_type: "force", duration_sec: 0.1,
        sample_rate_hz: 100, nominal,
        noise_level: 0, outlier_probability: 0,
      });
      const values = result.result.samples.map((s: any) => s.value);
      // All values should be identical (force is constant baseline)
      const unique = new Set(values);
      expect(unique.size).toBe(1);
    });

    it("drift increases values over time", () => {
      const result = sensorSimulatorEngine.simulate({
        sensor_type: "force", duration_sec: 10,
        sample_rate_hz: 10, nominal,
        noise_level: 0, drift_rate: 0.1, outlier_probability: 0,
      });
      const values = result.result.samples.map((s: any) => s.value);
      // Last value should be significantly higher than first
      expect(values[values.length - 1]).toBeGreaterThan(values[0] * 1.5);
    });
  });

  describe("error handling", () => {
    it("throws on zero duration", () => {
      expect(() =>
        sensorSimulatorEngine.simulate({
          sensor_type: "force", duration_sec: 0,
          sample_rate_hz: 100, nominal,
        })
      ).toThrow();
    });

    it("throws on unknown sensor type", () => {
      expect(() =>
        sensorSimulatorEngine.simulate({
          sensor_type: "laser" as any, duration_sec: 1,
          sample_rate_hz: 100, nominal,
        })
      ).toThrow();
    });
  });
});

// ============================================================================
// 3. SensorFusionEngine
// ============================================================================

describe("SensorFusionEngine", () => {
  const processParams = {
    diameter_mm: 20,
    flute_count: 4,
    depth_mm: 2,
    feed_mmrev: 0.15,
  };

  describe("singleton export", () => {
    it("exports sensorFusionEngine singleton", () => {
      expect(sensorFusionEngine).toBeInstanceOf(SensorFusionEngine);
    });
  });

  describe("full fusion with all 4 sensor types", () => {
    it("fuses all sensor data into unified states", () => {
      const count = 10;
      const result = sensorFusionEngine.fuse({
        force_samples: makeForceSamples(count),
        spindle_samples: makeSpindleSamples(count).map((s) => ({
          timestamp_ms: s.timestamp_ms, load_pct: s.load_pct,
          power_kw: s.power_kw, rpm_actual: s.rpm_actual,
        })),
        vibration_samples: makeVibrationSamples(count).map((s) => ({
          timestamp_ms: s.timestamp_ms, accel_x_g: s.accel_x_g,
          accel_y_g: s.accel_y_g, accel_z_g: s.accel_z_g,
        })),
        temperature_samples: makeTemperatureSamples(count).map((s) => ({
          timestamp_ms: s.timestamp_ms, tool_temp_c: s.tool_temp_c,
        })),
        process_params: processParams,
        dt_ms: 10,
      });
      expect(result.value.fused_states.length).toBeGreaterThan(0);
      expect(result.unit).toBe("fusion_result");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("fused states have 5-element state vectors", () => {
      const count = 10;
      const result = sensorFusionEngine.fuse({
        force_samples: makeForceSamples(count),
        spindle_samples: makeSpindleSamples(count).map((s) => ({
          timestamp_ms: s.timestamp_ms, load_pct: s.load_pct,
          power_kw: s.power_kw, rpm_actual: s.rpm_actual,
        })),
        vibration_samples: makeVibrationSamples(count).map((s) => ({
          timestamp_ms: s.timestamp_ms, accel_x_g: s.accel_x_g,
          accel_y_g: s.accel_y_g, accel_z_g: s.accel_z_g,
        })),
        temperature_samples: makeTemperatureSamples(count).map((s) => ({
          timestamp_ms: s.timestamp_ms, tool_temp_c: s.tool_temp_c,
        })),
        process_params: processParams,
        dt_ms: 10,
      });
      for (const fs of result.value.fused_states) {
        expect(fs.state).toHaveLength(5);
        expect(fs.covariance_diag).toHaveLength(5);
        expect(typeof fs.timestamp_ms).toBe("number");
      }
    });

    it("sensor_health shows ok when enough data", () => {
      const count = 20;
      const result = sensorFusionEngine.fuse({
        force_samples: makeForceSamples(count),
        spindle_samples: makeSpindleSamples(count).map((s) => ({
          timestamp_ms: s.timestamp_ms, load_pct: s.load_pct,
          power_kw: s.power_kw, rpm_actual: s.rpm_actual,
        })),
        vibration_samples: makeVibrationSamples(count).map((s) => ({
          timestamp_ms: s.timestamp_ms, accel_x_g: s.accel_x_g,
          accel_y_g: s.accel_y_g, accel_z_g: s.accel_z_g,
        })),
        temperature_samples: makeTemperatureSamples(count).map((s) => ({
          timestamp_ms: s.timestamp_ms, tool_temp_c: s.tool_temp_c,
        })),
        process_params: processParams,
        dt_ms: 10,
      });
      expect(result.value.sensor_health.force).toBe("ok");
    });

    it("estimated_wear is a number between 0 and 1", () => {
      const count = 10;
      const result = sensorFusionEngine.fuse({
        force_samples: makeForceSamples(count),
        process_params: processParams,
        dt_ms: 10,
      });
      expect(result.value.estimated_wear).toBeGreaterThanOrEqual(0);
      expect(result.value.estimated_wear).toBeLessThanOrEqual(1);
    });

    it("force_trend is a valid string", () => {
      const count = 10;
      const result = sensorFusionEngine.fuse({
        force_samples: makeForceSamples(count),
        process_params: processParams,
        dt_ms: 10,
      });
      expect(["stable", "increasing", "decreasing"]).toContain(result.value.force_trend);
    });

    it("warnings is an array", () => {
      const count = 10;
      const result = sensorFusionEngine.fuse({
        force_samples: makeForceSamples(count),
        process_params: processParams,
        dt_ms: 10,
      });
      expect(Array.isArray(result.value.warnings)).toBe(true);
    });
  });

  describe("force-only fusion", () => {
    it("fuses with only force data", () => {
      const result = sensorFusionEngine.fuse({
        force_samples: makeForceSamples(15),
        process_params: processParams,
        dt_ms: 10,
      });
      expect(result.value.fused_states.length).toBeGreaterThan(0);
      expect(result.value.sensor_health.force).toBe("ok");
      // Other sensors should show dropout
      expect(result.value.sensor_health.spindle).toBe("dropout");
      expect(result.value.sensor_health.vibration).toBe("dropout");
      expect(result.value.sensor_health.temperature).toBe("dropout");
    });

    it("force-only confidence is lower than all-sensor fusion", () => {
      const count = 10;
      const forceOnly = sensorFusionEngine.fuse({
        force_samples: makeForceSamples(count),
        process_params: processParams,
        dt_ms: 10,
      });
      const allSensors = sensorFusionEngine.fuse({
        force_samples: makeForceSamples(count),
        spindle_samples: makeSpindleSamples(count).map((s) => ({
          timestamp_ms: s.timestamp_ms, load_pct: s.load_pct,
          power_kw: s.power_kw, rpm_actual: s.rpm_actual,
        })),
        vibration_samples: makeVibrationSamples(count).map((s) => ({
          timestamp_ms: s.timestamp_ms, accel_x_g: s.accel_x_g,
          accel_y_g: s.accel_y_g, accel_z_g: s.accel_z_g,
        })),
        temperature_samples: makeTemperatureSamples(count).map((s) => ({
          timestamp_ms: s.timestamp_ms, tool_temp_c: s.tool_temp_c,
        })),
        process_params: processParams,
        dt_ms: 10,
      });
      expect(forceOnly.confidence!).toBeLessThan(allSensors.confidence!);
    });
  });

  describe("empty/no data", () => {
    it("returns empty fused_states with no sensor data", () => {
      const result = sensorFusionEngine.fuse({
        process_params: processParams,
      });
      expect(result.value.fused_states).toHaveLength(0);
      expect(result.value.estimated_wear).toBe(0);
      expect(result.value.force_trend).toBe("stable");
      expect(result.value.warnings).toContain("No sensor data provided");
      expect(result.confidence).toBe(0);
    });

    it("all sensors show dropout with no data", () => {
      const result = sensorFusionEngine.fuse({
        process_params: processParams,
      });
      expect(result.value.sensor_health.force).toBe("dropout");
      expect(result.value.sensor_health.spindle).toBe("dropout");
      expect(result.value.sensor_health.vibration).toBe("dropout");
      expect(result.value.sensor_health.temperature).toBe("dropout");
    });
  });

  describe("EKF formula and metadata", () => {
    it("formula mentions EKF", () => {
      const result = sensorFusionEngine.fuse({
        force_samples: makeForceSamples(5),
        process_params: processParams,
      });
      expect(result.formula).toContain("EKF");
    });

    it("unit is fusion_result", () => {
      const result = sensorFusionEngine.fuse({
        force_samples: makeForceSamples(5),
        process_params: processParams,
      });
      expect(result.unit).toBe("fusion_result");
    });
  });

  describe("dropout warnings", () => {
    it("generates dropout warnings for missing sensor types", () => {
      const result = sensorFusionEngine.fuse({
        force_samples: makeForceSamples(10),
        process_params: processParams,
        dt_ms: 10,
      });
      const dropoutWarnings = result.value.warnings.filter((w: string) => w.includes("dropout"));
      // spindle, vibration, temperature should have dropout warnings
      expect(dropoutWarnings.length).toBeGreaterThanOrEqual(3);
    });
  });
});

// ============================================================================
// 4. RealTimeAnomalyDetectionEngine
// ============================================================================

describe("RealTimeAnomalyDetectionEngine", () => {
  describe("singleton export", () => {
    it("exports realTimeAnomalyDetectionEngine", () => {
      expect(realTimeAnomalyDetectionEngine).toBeDefined();
      expect(typeof realTimeAnomalyDetectionEngine.detect).toBe("function");
    });
  });

  describe("stable signal detection", () => {
    it("reports normal status for stable signal", () => {
      // Constant signal with explicit baseline — no method should trigger
      const samples = new Array(200).fill(100);
      const result = realTimeAnomalyDetectionEngine.detect({
        samples, sample_rate_hz: 1000, sensitivity: 0.1,
        baseline_mean: 100, baseline_std: 1,
      });
      const detection = result.value as any;
      expect(detection.overall_status).toBe("normal");
      expect(detection.recommended_action).toContain("No action");
    });

    it("produces few or no anomalies for stable signal", () => {
      const samples = stableSignal(200, 100, 0.5);
      const result = realTimeAnomalyDetectionEngine.detect({
        samples, sample_rate_hz: 1000, sensitivity: 0.3,
      });
      const detection = result.value as any;
      // With low sensitivity and stable signal, anomaly count should be low
      expect(detection.anomalies.length).toBeLessThan(20);
    });

    it("returns 5 method summaries by default", () => {
      const samples = stableSignal(100, 100, 1);
      const result = realTimeAnomalyDetectionEngine.detect({
        samples, sample_rate_hz: 1000,
      });
      const detection = result.value as any;
      expect(detection.method_summaries).toHaveLength(5);
      const methods = detection.method_summaries.map((m: any) => m.method);
      expect(methods).toContain("cusum");
      expect(methods).toContain("ewma");
      expect(methods).toContain("mahalanobis");
      expect(methods).toContain("fft");
      expect(methods).toContain("wavelet");
    });
  });

  describe("spike detection", () => {
    it("detects a large spike anomaly", () => {
      const samples = stableSignal(100, 100, 1);
      samples[50] = 500; // inject massive spike
      const result = realTimeAnomalyDetectionEngine.detect({
        samples, sample_rate_hz: 1000,
      });
      const detection = result.value as any;
      expect(detection.anomalies.length).toBeGreaterThan(0);
      // At least one anomaly should be near index 50
      const nearSpike = detection.anomalies.filter(
        (a: any) => Math.abs(a.sample_index - 50) < 15
      );
      expect(nearSpike.length).toBeGreaterThan(0);
    });

    it("overall_status is warning or alarm for spike", () => {
      const samples = stableSignal(100, 100, 1);
      samples[50] = 500;
      const result = realTimeAnomalyDetectionEngine.detect({
        samples, sample_rate_hz: 1000,
      });
      const detection = result.value as any;
      expect(["warning", "alarm"]).toContain(detection.overall_status);
    });

    it("anomaly events have required fields", () => {
      const samples = stableSignal(100, 100, 1);
      samples[50] = 500;
      const result = realTimeAnomalyDetectionEngine.detect({
        samples, sample_rate_hz: 1000,
      });
      const detection = result.value as any;
      for (const anomaly of detection.anomalies) {
        expect(anomaly).toHaveProperty("method");
        expect(anomaly).toHaveProperty("sample_index");
        expect(anomaly).toHaveProperty("severity");
        expect(anomaly).toHaveProperty("type");
        expect(anomaly).toHaveProperty("message");
        expect(anomaly.severity).toBeGreaterThanOrEqual(0);
        expect(anomaly.severity).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("sensitivity", () => {
    it("high sensitivity detects more anomalies than low", () => {
      // Use a signal with moderate disturbance
      const baseSamples = stableSignal(128, 100, 2);
      baseSamples[40] = 115;
      baseSamples[80] = 88;

      const highSens = realTimeAnomalyDetectionEngine.detect({
        samples: [...baseSamples], sample_rate_hz: 1000, sensitivity: 0.95,
      });
      const lowSens = realTimeAnomalyDetectionEngine.detect({
        samples: [...baseSamples], sample_rate_hz: 1000, sensitivity: 0.1,
      });
      const highDetection = highSens.value as any;
      const lowDetection = lowSens.value as any;
      expect(highDetection.anomalies.length).toBeGreaterThanOrEqual(lowDetection.anomalies.length);
    });

    it("sensitivity is clamped to 0-1 range", () => {
      const samples = stableSignal(64, 100, 1);
      // Should not throw with out-of-range sensitivity
      expect(() =>
        realTimeAnomalyDetectionEngine.detect({
          samples, sample_rate_hz: 1000, sensitivity: 2.0,
        })
      ).not.toThrow();
      expect(() =>
        realTimeAnomalyDetectionEngine.detect({
          samples, sample_rate_hz: 1000, sensitivity: -0.5,
        })
      ).not.toThrow();
    });
  });

  describe("single method runs", () => {
    it("runs cusum only when specified", () => {
      const samples = stableSignal(100, 100, 1);
      samples[50] = 500;
      const result = realTimeAnomalyDetectionEngine.detect({
        samples, sample_rate_hz: 1000, methods: ["cusum"],
      });
      const detection = result.value as any;
      expect(detection.method_summaries).toHaveLength(1);
      expect(detection.method_summaries[0].method).toBe("cusum");
    });

    it("runs ewma only", () => {
      const samples = stableSignal(100, 100, 1);
      const result = realTimeAnomalyDetectionEngine.detect({
        samples, sample_rate_hz: 1000, methods: ["ewma"],
      });
      const detection = result.value as any;
      expect(detection.method_summaries).toHaveLength(1);
      expect(detection.method_summaries[0].method).toBe("ewma");
    });

    it("runs fft only", () => {
      const samples = stableSignal(64, 100, 1);
      const result = realTimeAnomalyDetectionEngine.detect({
        samples, sample_rate_hz: 1000, methods: ["fft"],
      });
      const detection = result.value as any;
      expect(detection.method_summaries).toHaveLength(1);
      expect(detection.method_summaries[0].method).toBe("fft");
    });

    it("runs wavelet only", () => {
      const samples = stableSignal(64, 100, 1);
      const result = realTimeAnomalyDetectionEngine.detect({
        samples, sample_rate_hz: 1000, methods: ["wavelet"],
      });
      const detection = result.value as any;
      expect(detection.method_summaries).toHaveLength(1);
      expect(detection.method_summaries[0].method).toBe("wavelet");
    });

    it("runs mahalanobis only", () => {
      const samples = stableSignal(100, 100, 1);
      const result = realTimeAnomalyDetectionEngine.detect({
        samples, sample_rate_hz: 1000, methods: ["mahalanobis"],
      });
      const detection = result.value as any;
      expect(detection.method_summaries).toHaveLength(1);
      expect(detection.method_summaries[0].method).toBe("mahalanobis");
    });
  });

  describe("method summaries", () => {
    it("each summary has required fields", () => {
      const samples = stableSignal(100, 100, 1);
      const result = realTimeAnomalyDetectionEngine.detect({
        samples, sample_rate_hz: 1000,
      });
      const detection = result.value as any;
      for (const summary of detection.method_summaries) {
        expect(summary).toHaveProperty("method");
        expect(summary).toHaveProperty("triggered");
        expect(summary).toHaveProperty("score");
        expect(summary).toHaveProperty("details");
        expect(typeof summary.triggered).toBe("boolean");
        expect(typeof summary.score).toBe("number");
        expect(summary.score).toBeGreaterThanOrEqual(0);
        expect(summary.score).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("AtomicValue wrapper", () => {
    it("returns unit and source fields", () => {
      const samples = stableSignal(64, 100, 1);
      const result = realTimeAnomalyDetectionEngine.detect({
        samples, sample_rate_hz: 1000,
      });
      expect(result.unit).toBe("anomaly_detection_result");
      expect(result.source).toContain("RealTimeAnomalyDetectionEngine");
    });

    it("uncertainty matches false_positive_estimate", () => {
      const samples = stableSignal(64, 100, 1);
      const result = realTimeAnomalyDetectionEngine.detect({
        samples, sample_rate_hz: 1000,
      });
      const detection = result.value as any;
      expect(result.uncertainty).toBe(detection.false_positive_estimate);
    });
  });

  describe("drift detection", () => {
    it("detects gradual drift with cusum", () => {
      // Create a signal with gradual upward drift
      const samples = Array.from({ length: 200 }, (_, i) => 100 + i * 0.5 + (Math.random() - 0.5));
      const result = realTimeAnomalyDetectionEngine.detect({
        samples, sample_rate_hz: 1000, methods: ["cusum"], sensitivity: 0.7,
      });
      const detection = result.value as any;
      expect(detection.method_summaries[0].triggered).toBe(true);
      const driftEvents = detection.anomalies.filter((a: any) => a.type === "drift");
      expect(driftEvents.length).toBeGreaterThan(0);
    });
  });

  describe("recommended actions", () => {
    it("recommends no action for normal signal", () => {
      const samples = stableSignal(100, 100, 0.5);
      const result = realTimeAnomalyDetectionEngine.detect({
        samples, sample_rate_hz: 1000, sensitivity: 0.2,
      });
      const detection = result.value as any;
      if (detection.overall_status === "normal") {
        expect(detection.recommended_action).toContain("No action");
      }
    });

    it("returns a non-empty recommended_action string", () => {
      const samples = stableSignal(100, 100, 1);
      samples[50] = 500;
      const result = realTimeAnomalyDetectionEngine.detect({
        samples, sample_rate_hz: 1000,
      });
      const detection = result.value as any;
      expect(detection.recommended_action.length).toBeGreaterThan(0);
    });
  });

  describe("false positive estimate", () => {
    it("false_positive_estimate is between 0 and 1", () => {
      const samples = stableSignal(100, 100, 1);
      const result = realTimeAnomalyDetectionEngine.detect({
        samples, sample_rate_hz: 1000,
      });
      const detection = result.value as any;
      expect(detection.false_positive_estimate).toBeGreaterThanOrEqual(0);
      expect(detection.false_positive_estimate).toBeLessThanOrEqual(1);
    });
  });

  describe("baseline estimation", () => {
    it("auto-estimates baseline when not provided", () => {
      const samples = stableSignal(100, 50, 2);
      const result = realTimeAnomalyDetectionEngine.detect({
        samples, sample_rate_hz: 1000,
      });
      expect(result).toBeDefined();
      const detection = result.value as any;
      expect(detection.method_summaries.length).toBe(5);
    });

    it("uses provided baseline_mean and baseline_std", () => {
      const samples = stableSignal(100, 100, 1);
      samples[50] = 500;
      const result = realTimeAnomalyDetectionEngine.detect({
        samples, sample_rate_hz: 1000,
        baseline_mean: 100, baseline_std: 1,
      });
      const detection = result.value as any;
      expect(detection.anomalies.length).toBeGreaterThan(0);
    });
  });

  describe("multiple spikes", () => {
    it("detects multiple spikes in signal", () => {
      const samples = stableSignal(200, 100, 1);
      samples[30] = 400;
      samples[100] = 500;
      samples[170] = 450;
      const result = realTimeAnomalyDetectionEngine.detect({
        samples, sample_rate_hz: 1000, sensitivity: 0.7,
      });
      const detection = result.value as any;
      expect(detection.anomalies.length).toBeGreaterThan(2);
      expect(detection.overall_status).not.toBe("normal");
    });
  });
});
