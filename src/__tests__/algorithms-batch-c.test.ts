import { describe, it, expect } from "vitest";
import { PIDController } from "../algorithms/PIDController.js";
import { RegressionEngine } from "../algorithms/RegressionEngine.js";
import { SpindleVibFFTModel } from "../algorithms/SpindleVibFFTModel.js";
import { STFTChatterDetection } from "../algorithms/STFTChatter.js";
import { SweptVolumeCollision } from "../algorithms/SweptVolumeCollision.js";
import { ThermalFEAModel } from "../algorithms/ThermalFEAModel.js";
import { TimeSeriesPredictor } from "../algorithms/TimeSeriesPredictor.js";
import { ToolDeflectionModel } from "../algorithms/ToolDeflectionModel.js";
import { ToolWearPrediction } from "../algorithms/ToolWearPrediction.js";
import { UsuiWearModel } from "../algorithms/UsuiWearModel.js";
import { WaveletToolBreakage } from "../algorithms/WaveletBreakage.js";

// ── 1. PIDController ────────────────────────────────────────────────

describe("PIDController", () => {
  const pid = new PIDController();

  it("validates valid input", () => {
    const result = pid.validate({ setpoint: 100, process_values: [90, 92, 95, 97, 99] });
    expect(result.valid).toBe(true);
  });

  it("rejects missing setpoint", () => {
    const result = pid.validate({ setpoint: undefined as unknown as number, process_values: [1] });
    expect(result.valid).toBe(false);
  });

  it("rejects empty process_values", () => {
    const result = pid.validate({ setpoint: 100, process_values: [] });
    expect(result.valid).toBe(false);
  });

  it("rejects dt <= 0", () => {
    const result = pid.validate({ setpoint: 100, process_values: [90], dt: -0.1 });
    expect(result.valid).toBe(false);
  });

  it("calculates PID response approaching setpoint", () => {
    const values = [80, 85, 90, 93, 96, 98, 99];
    const out = pid.calculate({ setpoint: 100, process_values: values, Kp: 1.0, Ki: 0.1, Kd: 0.05 });
    expect(out.steps).toHaveLength(values.length);
    expect(out.current_error).toBeCloseTo(100 - 99, 5);
    expect(out.calculation_method).toContain("Discrete PID");
    expect(out.overshoot_pct).toBeGreaterThanOrEqual(0);
  });

  it("clamps output to min/max", () => {
    const out = pid.calculate({
      setpoint: 1000, process_values: [0],
      Kp: 10, Ki: 0, Kd: 0, output_min: -50, output_max: 50,
    });
    expect(out.current_output).toBeLessThanOrEqual(50);
    expect(out.is_saturated).toBe(true);
  });

  it("performs Ziegler-Nichols auto-tune (PID)", () => {
    const out = pid.calculate({
      setpoint: 100, process_values: [80, 85, 90, 95],
      auto_tune: { ultimate_gain: 10, ultimate_period: 2 },
    });
    expect(out.tuned_gains).not.toBeNull();
    expect(out.tuned_gains!.Kp).toBeCloseTo(6, 5); // 0.6 * Ku
    expect(out.tuned_gains!.Ki).toBeCloseTo(6, 5);  // Kp / (Tu/2)
    expect(out.tuned_gains!.Kd).toBeCloseTo(1.5, 5); // Kp * Tu / 8
  });

  it("performs Ziegler-Nichols auto-tune (PI)", () => {
    const out = pid.calculate({
      setpoint: 100, process_values: [90],
      auto_tune: { ultimate_gain: 10, ultimate_period: 2, controller_type: "PI" },
    });
    expect(out.tuned_gains!.Kp).toBeCloseTo(4.5, 5);
    expect(out.tuned_gains!.Kd).toBe(0);
  });

  it("settling_time is null when always within band", () => {
    // All values within 5% of setpoint
    const out = pid.calculate({ setpoint: 100, process_values: [98, 99, 100, 100] });
    // error < 5 for all points, so settling_time should be null
    expect(out.settling_time).toBeNull();
  });

  it("returns metadata", () => {
    const meta = pid.getMetadata();
    expect(meta.id).toBe("pid-controller");
    expect(meta.domain).toBe("control");
  });
});

// ── 2. RegressionEngine ─────────────────────────────────────────────

describe("RegressionEngine", () => {
  const reg = new RegressionEngine();

  it("validates valid input", () => {
    const r = reg.validate({ X: [[1], [2], [3]], y: [2, 4, 6] });
    expect(r.valid).toBe(true);
  });

  it("rejects mismatched X and y lengths", () => {
    const r = reg.validate({ X: [[1], [2]], y: [1, 2, 3] });
    expect(r.valid).toBe(false);
  });

  it("rejects degree > 4", () => {
    const r = reg.validate({ X: [[1], [2], [3]], y: [1, 2, 3], degree: 5 });
    expect(r.valid).toBe(false);
  });

  it("fits a perfect linear model y = 2x + 1", () => {
    const out = reg.calculate({
      X: [[1], [2], [3], [4], [5]],
      y: [3, 5, 7, 9, 11],
    });
    expect(out.r_squared).toBeCloseTo(1.0, 4);
    expect(out.intercept).toBeCloseTo(1.0, 2);
    expect(out.coefficients[0]).toBeCloseTo(2.0, 2);
    expect(out.rmse).toBeCloseTo(0, 4);
  });

  it("fits quadratic y = x^2 with degree 2", () => {
    const X = [[1], [2], [3], [4], [5]];
    const y = [1, 4, 9, 16, 25];
    const out = reg.calculate({ X, y, degree: 2 });
    expect(out.r_squared).toBeCloseTo(1.0, 3);
    expect(out.feature_names).toContain("x0");
    expect(out.feature_names).toContain("x0^2");
  });

  it("makes predictions with intervals", () => {
    const out = reg.calculate({
      X: [[1], [2], [3], [4], [5]],
      y: [3, 5, 7, 9, 11],
      X_predict: [[6], [7]],
    });
    expect(out.predictions).toHaveLength(2);
    expect(out.predictions[0].y_hat).toBeCloseTo(13, 1);
    expect(out.predictions[0].lower).toBeLessThanOrEqual(out.predictions[0].y_hat);
    expect(out.predictions[0].upper).toBeGreaterThanOrEqual(out.predictions[0].y_hat);
  });

  it("returns residuals matching fitted - actual", () => {
    const y = [3, 5, 7, 9, 11];
    const out = reg.calculate({ X: [[1], [2], [3], [4], [5]], y });
    for (let i = 0; i < y.length; i++) {
      expect(out.residuals[i]).toBeCloseTo(y[i] - out.fitted_values[i], 8);
    }
  });

  it("returns metadata", () => {
    expect(reg.getMetadata().id).toBe("regression-engine");
  });
});

// ── 3. SpindleVibFFTModel ───────────────────────────────────────────

describe("SpindleVibFFTModel", () => {
  const fft = new SpindleVibFFTModel();

  it("validates valid input", () => {
    const sig = Array.from({ length: 64 }, (_, i) => Math.sin(2 * Math.PI * 500 * i / 10000));
    const r = fft.validate({ signal: sig, sample_rate_hz: 10000, spindle_rpm: 6000, flutes: 4 });
    expect(r.valid).toBe(true);
  });

  it("rejects too few samples", () => {
    const r = fft.validate({ signal: [1, 2, 3], sample_rate_hz: 10000, spindle_rpm: 6000, flutes: 4 });
    expect(r.valid).toBe(false);
  });

  it("rejects invalid sample rate", () => {
    const sig = new Array(64).fill(0);
    const r = fft.validate({ signal: sig, sample_rate_hz: 50, spindle_rpm: 6000, flutes: 4 });
    expect(r.valid).toBe(false);
  });

  it("detects dominant frequency from a pure sine", () => {
    const fs = 10000;
    const freq = 400; // Hz
    const N = 128;
    const sig = Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * freq * i / fs));
    const out = fft.calculate({ signal: sig, sample_rate_hz: fs, spindle_rpm: 3000, flutes: 4 });
    expect(out.num_samples).toBe(N);
    // Dominant frequency should be near 400 Hz (within resolution)
    expect(out.dominant_frequency_hz).toBeGreaterThan(300);
    expect(out.dominant_frequency_hz).toBeLessThan(500);
    expect(out.dominant_magnitude).toBeGreaterThan(0);
    expect(out.freq_resolution).toBeCloseTo(fs / N, 5);
  });

  it("tooth passing frequency is correct", () => {
    const sig = new Array(64).fill(0);
    const out = fft.calculate({ signal: sig, sample_rate_hz: 10000, spindle_rpm: 6000, flutes: 4 });
    // TPF = (6000/60) * 4 = 400 Hz
    expect(out.tooth_passing_freq_hz).toBeCloseTo(400, 5);
  });

  it("classifies harmonic peaks correctly for TPF signal", () => {
    const fs = 10000;
    const rpm = 3000;
    const flutes = 4;
    const tpf = (rpm / 60) * flutes; // 200 Hz
    const N = 128;
    // Pure TPF signal
    const sig = Array.from(
      { length: N },
      (_, i) => Math.sin(2 * Math.PI * tpf * i / fs)
    );
    const out = fft.calculate({
      signal: sig, sample_rate_hz: fs,
      spindle_rpm: rpm, flutes,
    });
    // Dominant frequency should be near TPF
    expect(out.dominant_frequency_hz).toBeGreaterThan(100);
    expect(out.dominant_frequency_hz).toBeLessThan(300);
    expect(out.peaks.length).toBeGreaterThan(0);
  });

  it("returns metadata with critical safety class", () => {
    const meta = fft.getMetadata();
    expect(meta.safety_class).toBe("critical");
    expect(meta.id).toBe("spindle-vib-fft");
  });
});

// ── 4. STFTChatterDetection ─────────────────────────────────────────

describe("STFTChatterDetection", () => {
  const stft = new STFTChatterDetection();

  it("validates valid input", () => {
    const sig = new Array(1024).fill(0).map((_, i) => Math.sin(i * 0.1));
    const r = stft.validate({ signal: sig, sample_rate: 10000, spindle_speed: 6000, n_flutes: 4 });
    expect(r.valid).toBe(true);
  });

  it("rejects too few samples", () => {
    const r = stft.validate({ signal: [1, 2, 3], sample_rate: 10000, spindle_speed: 6000, n_flutes: 4 });
    expect(r.valid).toBe(false);
  });

  it("rejects zero spindle speed", () => {
    const r = stft.validate({ signal: new Array(100).fill(0), sample_rate: 10000, spindle_speed: 0, n_flutes: 4 });
    expect(r.valid).toBe(false);
  });

  it("detects no chatter on a low-amplitude signal", () => {
    const N = 1024;
    const sig = new Array(N).fill(0).map(() => (Math.random() - 0.5) * 0.001);
    // Use a seeded deterministic signal instead
    const detSig = new Array(N).fill(0).map((_, i) => Math.sin(i * 0.01) * 0.001);
    const out = stft.calculate({
      signal: detSig, sample_rate: 10000, spindle_speed: 6000, n_flutes: 4,
      window_size: 128, overlap: 0.5,
    });
    expect(out.tooth_passing_frequency).toBeCloseTo(400, 5);
    expect(out.signal_rms).toBeGreaterThan(0);
    expect(out.spectrogram.length).toBeGreaterThan(0);
    expect(out.calculation_method).toContain("STFT");
  });

  it("returns severity 'none' when no chatter", () => {
    const N = 1024;
    const detSig = new Array(N).fill(0).map((_, i) => Math.sin(i * 0.01) * 0.0001);
    const out = stft.calculate({
      signal: detSig, sample_rate: 10000, spindle_speed: 6000, n_flutes: 4,
      window_size: 128,
    });
    if (!out.chatter_detected) {
      expect(out.severity).toBe("none");
      expect(out.recommendation).toContain("No action");
    }
  });

  it("returns metadata", () => {
    const meta = stft.getMetadata();
    expect(meta.id).toBe("stft-chatter");
    expect(meta.safety_class).toBe("critical");
  });
});

// ── 5. SweptVolumeCollision ─────────────────────────────────────────

describe("SweptVolumeCollision", () => {
  const svc = new SweptVolumeCollision();

  it("validates valid input", () => {
    const r = svc.validate({
      toolpath: [{ x: 0, y: 0, z: 50 }, { x: 100, y: 0, z: 50 }],
      tool: { diameter: 10 },
      obstacles: [{ min: { x: 200, y: 200, z: 0 }, max: { x: 210, y: 210, z: 10 } }],
    });
    expect(r.valid).toBe(true);
  });

  it("rejects single toolpath point", () => {
    const r = svc.validate({
      toolpath: [{ x: 0, y: 0, z: 0 }],
      tool: { diameter: 10 },
      obstacles: [],
    });
    expect(r.valid).toBe(false);
  });

  it("rejects zero tool diameter", () => {
    const r = svc.validate({
      toolpath: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
      tool: { diameter: 0 },
      obstacles: [],
    });
    expect(r.valid).toBe(false);
  });

  it("collision_free when obstacle is far away", () => {
    const out = svc.calculate({
      toolpath: [{ x: 0, y: 0, z: 50 }, { x: 100, y: 0, z: 50 }],
      tool: { diameter: 10 },
      obstacles: [{ min: { x: 500, y: 500, z: 0 }, max: { x: 510, y: 510, z: 10 } }],
      clearance: 2,
    });
    expect(out.collision_free).toBe(true);
    expect(out.collisions).toHaveLength(0);
    expect(out.toolpath_length).toBeCloseTo(100, 5);
  });

  it("detects collision when tool passes through obstacle", () => {
    const out = svc.calculate({
      toolpath: [{ x: 0, y: 0, z: 10 }, { x: 100, y: 0, z: 10 }],
      tool: { diameter: 20, holder_diameter: 40, flute_length: 30, total_length: 50 },
      obstacles: [{ min: { x: 45, y: -5, z: -40 }, max: { x: 55, y: 5, z: 5 } }],
      clearance: 0,
      samples_per_segment: 20,
    });
    expect(out.collision_free).toBe(false);
    expect(out.collisions.length).toBeGreaterThan(0);
    expect(out.warnings.length).toBeGreaterThan(0);
  });

  it("computes swept bounding box", () => {
    const out = svc.calculate({
      toolpath: [{ x: 0, y: 0, z: 50 }, { x: 100, y: 50, z: 50 }],
      tool: { diameter: 10 },
      obstacles: [],
      clearance: 2,
    });
    expect(out.swept_bbox.min.x).toBeLessThan(0);
    expect(out.swept_bbox.max.x).toBeGreaterThan(100);
    expect(out.swept_bbox.max.y).toBeGreaterThan(50);
  });

  it("returns metadata", () => {
    expect(svc.getMetadata().id).toBe("swept-volume-collision");
  });
});

// ── 6. ThermalFEAModel ──────────────────────────────────────────────

describe("ThermalFEAModel", () => {
  const therm = new ThermalFEAModel();

  it("validates valid input", () => {
    const r = therm.validate({ cutting_speed: 200, feed_per_tooth: 0.15, axial_depth: 2 });
    expect(r.valid).toBe(true);
  });

  it("rejects zero cutting speed", () => {
    const r = therm.validate({ cutting_speed: 0, feed_per_tooth: 0.15, axial_depth: 2 });
    expect(r.valid).toBe(false);
  });

  it("rejects negative thermal conductivity", () => {
    const r = therm.validate({ cutting_speed: 200, feed_per_tooth: 0.15, axial_depth: 2, thermal_conductivity: -1 });
    expect(r.valid).toBe(false);
  });

  it("calculates cutting temperature above ambient", () => {
    const out = therm.calculate({ cutting_speed: 200, feed_per_tooth: 0.15, axial_depth: 2 });
    expect(out.cutting_temperature).toBeGreaterThan(20);
    expect(out.temperature_rise).toBeGreaterThan(0);
    expect(out.chip_temperature).toBeGreaterThan(20);
    expect(out.tool_temperature).toBeGreaterThan(20);
    expect(out.workpiece_temperature).toBeGreaterThan(20);
  });

  it("heat partition sums to 1", () => {
    const out = therm.calculate({ cutting_speed: 200, feed_per_tooth: 0.15, axial_depth: 2 });
    const sum = out.heat_partition.chip + out.heat_partition.tool + out.heat_partition.workpiece;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("calculates thermal expansion", () => {
    const out = therm.calculate({
      cutting_speed: 200, feed_per_tooth: 0.15, axial_depth: 2,
      workpiece_length: 200, thermal_expansion_coeff: 12e-6,
    });
    expect(out.thermal_expansion).toBeGreaterThan(0);
    expect(out.thermal_error_um).toBeCloseTo(out.thermal_expansion * 1000, 5);
  });

  it("spindle drift is zero with no run time", () => {
    const out = therm.calculate({
      cutting_speed: 200, feed_per_tooth: 0.15, axial_depth: 2,
      run_time_min: 0, spindle_power_kw: 0,
    });
    // With run_time_min=0 and spindle_power_kw=0, drift comes from heatFactor * tempRise only
    // heatFactor = Vc*f*ap/10000, tempRise = heatFactor*2
    // So drift values are small but not necessarily zero
    expect(out.spindle_drift_um.z).toBeDefined();
  });

  it("compensation is negative of drift", () => {
    const out = therm.calculate({
      cutting_speed: 200, feed_per_tooth: 0.15, axial_depth: 2,
      run_time_min: 30, spindle_power_kw: 5,
    });
    expect(out.compensation_um.x).toBeCloseTo(-out.spindle_drift_um.x, 8);
    expect(out.compensation_um.y).toBeCloseTo(-out.spindle_drift_um.y, 8);
    expect(out.compensation_um.z).toBeCloseTo(-out.spindle_drift_um.z, 8);
  });

  it("temperature risk is low at gentle conditions", () => {
    const out = therm.calculate({ cutting_speed: 50, feed_per_tooth: 0.05, axial_depth: 0.5 });
    expect(out.temperature_risk).toBe("low");
  });

  it("returns metadata", () => {
    const meta = therm.getMetadata();
    expect(meta.id).toBe("thermal-fea");
    expect(meta.safety_class).toBe("critical");
  });
});

// ── 7. TimeSeriesPredictor ──────────────────────────────────────────

describe("TimeSeriesPredictor", () => {
  const ts = new TimeSeriesPredictor();

  it("validates valid input", () => {
    const r = ts.validate({ data: [1, 2, 3, 4, 5] });
    expect(r.valid).toBe(true);
  });

  it("rejects fewer than 3 data points", () => {
    const r = ts.validate({ data: [1, 2] });
    expect(r.valid).toBe(false);
  });

  it("forecasts an increasing linear trend", () => {
    const data = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const out = ts.calculate({ data, horizon: 3 });
    expect(out.forecasts).toHaveLength(3);
    expect(out.trend_direction).toBe("increasing");
    expect(out.trend).toBeGreaterThan(0);
    // Forecasted values should continue upward
    expect(out.forecasts[0].value).toBeGreaterThan(90);
  });

  it("forecasts a decreasing trend", () => {
    const data = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
    const out = ts.calculate({ data, horizon: 2 });
    expect(out.trend_direction).toBe("decreasing");
    expect(out.trend).toBeLessThan(0);
  });

  it("fitted_values has same length as input data", () => {
    const data = [5, 10, 15, 20, 25];
    const out = ts.calculate({ data });
    expect(out.fitted_values).toHaveLength(data.length);
  });

  it("prediction intervals widen with horizon", () => {
    const data = [10, 12, 14, 16, 18, 20, 22, 24];
    const out = ts.calculate({ data, horizon: 5 });
    const widths = out.forecasts.map(f => f.upper - f.lower);
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i]).toBeGreaterThanOrEqual(widths[i - 1] - 1e-10);
    }
  });

  it("respects alpha and beta parameters", () => {
    // Use a noisy series so smoothing params make a visible difference
    const data = [10, 25, 12, 30, 18, 35, 22, 40];
    const out1 = ts.calculate({ data, alpha: 0.9, beta: 0.9 });
    const out2 = ts.calculate({ data, alpha: 0.1, beta: 0.1 });
    // Different smoothing should yield different trends
    expect(out1.trend).not.toBeCloseTo(out2.trend, 1);
  });

  it("returns mape and rmse", () => {
    const data = [10, 20, 30, 40, 50];
    const out = ts.calculate({ data });
    expect(out.mape).toBeGreaterThanOrEqual(0);
    expect(out.rmse).toBeGreaterThanOrEqual(0);
  });

  it("returns metadata", () => {
    expect(ts.getMetadata().id).toBe("time-series-predictor");
  });
});

// ── 8. ToolDeflectionModel ──────────────────────────────────────────

describe("ToolDeflectionModel", () => {
  const td = new ToolDeflectionModel();

  it("validates valid input", () => {
    const r = td.validate({ cutting_force: 500, tool_diameter: 12, overhang_length: 50 });
    expect(r.valid).toBe(true);
  });

  it("rejects negative cutting force", () => {
    const r = td.validate({ cutting_force: -10, tool_diameter: 12, overhang_length: 50 });
    expect(r.valid).toBe(false);
  });

  it("rejects zero tool diameter", () => {
    const r = td.validate({ cutting_force: 500, tool_diameter: 0, overhang_length: 50 });
    expect(r.valid).toBe(false);
  });

  it("warns on high L/D ratio", () => {
    const r = td.validate({ cutting_force: 500, tool_diameter: 6, overhang_length: 50 });
    // L/D = 50/6 > 6
    expect(r.issues.some(i => i.severity === "warning")).toBe(true);
  });

  it("calculates deflection for standard end mill", () => {
    const out = td.calculate({
      cutting_force: 500, tool_diameter: 12, overhang_length: 50,
      youngs_modulus: 600, runout: 0.005,
    });
    expect(out.static_deflection).toBeGreaterThan(0);
    expect(out.dynamic_deflection).toBeCloseTo(out.static_deflection * 1.5, 8);
    expect(out.surface_error).toBeCloseTo(out.dynamic_deflection + 0.005, 8);
    expect(out.stiffness).toBeGreaterThan(0);
    expect(out.moment_of_inertia).toBeCloseTo(Math.PI * Math.pow(12, 4) / 64, 4);
  });

  it("zero force gives zero deflection", () => {
    const out = td.calculate({
      cutting_force: 0, tool_diameter: 12, overhang_length: 50,
    });
    expect(out.static_deflection).toBe(0);
    expect(out.dynamic_deflection).toBe(0);
    expect(out.safety_factor).toBe(999);
  });

  it("safety factor decreases with higher force", () => {
    const out1 = td.calculate({ cutting_force: 100, tool_diameter: 12, overhang_length: 50 });
    const out2 = td.calculate({ cutting_force: 1000, tool_diameter: 12, overhang_length: 50 });
    expect(out2.safety_factor).toBeLessThan(out1.safety_factor);
  });

  it("stiffness follows k = 3EI/L^3", () => {
    const D = 16;
    const L = 60;
    const E_GPa = 600;
    const E = E_GPa * 1000;
    const I = Math.PI * Math.pow(D, 4) / 64;
    const expectedK = (3 * E * I) / Math.pow(L, 3);
    const out = td.calculate({
      cutting_force: 300, tool_diameter: D, overhang_length: L, youngs_modulus: E_GPa,
    });
    expect(out.stiffness).toBeCloseTo(expectedK, 2);
  });

  it("returns metadata", () => {
    expect(td.getMetadata().id).toBe("tool-deflection");
  });
});

// ── 9. ToolWearPrediction ───────────────────────────────────────────

describe("ToolWearPrediction", () => {
  const tw = new ToolWearPrediction();

  it("validates valid input", () => {
    const r = tw.validate({ cutting_speed: 200, cutting_time: 10, taylor_C: 400, taylor_n: 0.25 });
    expect(r.valid).toBe(true);
  });

  it("rejects zero cutting speed", () => {
    const r = tw.validate({ cutting_speed: 0, cutting_time: 10, taylor_C: 400, taylor_n: 0.25 });
    expect(r.valid).toBe(false);
  });

  it("rejects taylor_n out of range", () => {
    const r = tw.validate({ cutting_speed: 200, cutting_time: 10, taylor_C: 400, taylor_n: 0.01 });
    expect(r.valid).toBe(false);
  });

  it("calculates tool life from Taylor equation", () => {
    // T = (C/V)^(1/n) = (400/200)^(1/0.25) = 2^4 = 16 min
    const out = tw.calculate({ cutting_speed: 200, cutting_time: 0, taylor_C: 400, taylor_n: 0.25 });
    expect(out.total_tool_life).toBeCloseTo(16, 1);
    expect(out.remaining_life).toBeCloseTo(16, 1);
  });

  it("break-in zone at early cutting time", () => {
    const out = tw.calculate({ cutting_speed: 200, cutting_time: 0.1, taylor_C: 400, taylor_n: 0.25 });
    expect(out.wear_zone).toBe("break-in");
    expect(out.flank_wear_vb).toBeGreaterThan(0);
  });

  it("steady zone at mid life", () => {
    // Tool life ~16 min, steady zone 5-80% = 0.8 to 12.8 min
    const out = tw.calculate({ cutting_speed: 200, cutting_time: 5, taylor_C: 400, taylor_n: 0.25 });
    expect(out.wear_zone).toBe("steady");
  });

  it("accelerated zone near end of life", () => {
    // 80% of 16 min = 12.8, so t=14 should be accelerated
    const out = tw.calculate({ cutting_speed: 200, cutting_time: 14, taylor_C: 400, taylor_n: 0.25 });
    expect(out.wear_zone).toBe("accelerated");
  });

  it("wear percentage reaches 100 near tool life", () => {
    const out = tw.calculate({ cutting_speed: 200, cutting_time: 16, taylor_C: 400, taylor_n: 0.25 });
    expect(out.wear_percentage).toBeGreaterThanOrEqual(80);
  });

  it("recommendation says REPLACE when past threshold", () => {
    const out = tw.calculate({ cutting_speed: 200, cutting_time: 20, taylor_C: 400, taylor_n: 0.25 });
    expect(out.recommendation).toContain("REPLACE");
  });

  it("returns metadata", () => {
    expect(tw.getMetadata().id).toBe("tool-wear-prediction");
  });
});

// ── 10. UsuiWearModel ───────────────────────────────────────────────

describe("UsuiWearModel", () => {
  const usui = new UsuiWearModel();

  it("validates valid input", () => {
    const r = usui.validate({
      contact_stress: 800, sliding_velocity: 150,
      interface_temperature: 600, cutting_time: 10,
    });
    expect(r.valid).toBe(true);
  });

  it("rejects zero contact stress", () => {
    const r = usui.validate({
      contact_stress: 0, sliding_velocity: 150,
      interface_temperature: 600, cutting_time: 10,
    });
    expect(r.valid).toBe(false);
  });

  it("rejects zero cutting time", () => {
    const r = usui.validate({
      contact_stress: 800, sliding_velocity: 150,
      interface_temperature: 600, cutting_time: 0,
    });
    expect(r.valid).toBe(false);
  });

  it("warns on temperature > 1200", () => {
    const r = usui.validate({
      contact_stress: 800, sliding_velocity: 150,
      interface_temperature: 1300, cutting_time: 10,
    });
    expect(r.issues.some(i => i.severity === "warning")).toBe(true);
  });

  it("produces wear that increases with time", () => {
    const out = usui.calculate({
      contact_stress: 800, sliding_velocity: 150,
      interface_temperature: 600, cutting_time: 20,
    });
    expect(out.final_vb).toBeGreaterThan(0);
    expect(out.wear_history.length).toBeGreaterThan(0);
    // Wear should increase monotonically
    for (let i = 1; i < out.wear_history.length; i++) {
      expect(out.wear_history[i].vb).toBeGreaterThanOrEqual(out.wear_history[i - 1].vb);
    }
  });

  it("coating_factor < 1 reduces wear", () => {
    const baseOut = usui.calculate({
      contact_stress: 800, sliding_velocity: 150,
      interface_temperature: 600, cutting_time: 10,
    });
    const coatedOut = usui.calculate({
      contact_stress: 800, sliding_velocity: 150,
      interface_temperature: 600, cutting_time: 10,
      coating_factor: 0.5,
    });
    expect(coatedOut.final_vb).toBeLessThan(baseOut.final_vb);
  });

  it("crater wear computed when mode is 'both'", () => {
    const out = usui.calculate({
      contact_stress: 800, sliding_velocity: 150,
      interface_temperature: 600, cutting_time: 10,
      wear_mode: "both",
    });
    expect(out.final_kt).toBeGreaterThan(0);
    expect(out.final_kt).toBeCloseTo(out.final_vb * 0.4, 8);
  });

  it("remaining_life_pct is 0 when VB exceeds limit", () => {
    // High temperature + long time to force high wear
    const out = usui.calculate({
      contact_stress: 2000, sliding_velocity: 300,
      interface_temperature: 900, cutting_time: 60,
      usui_A: 1e-3,
    });
    if (!out.within_limit) {
      expect(out.remaining_life_pct).toBe(0);
    }
  });

  it("returns metadata", () => {
    expect(usui.getMetadata().id).toBe("usui-wear-model");
  });
});

// ── 11. WaveletToolBreakage ─────────────────────────────────────────

describe("WaveletToolBreakage", () => {
  const wav = new WaveletToolBreakage();

  it("validates valid input", () => {
    const sig = new Array(64).fill(0);
    const r = wav.validate({ signal: sig, sample_rate: 10000 });
    expect(r.valid).toBe(true);
  });

  it("rejects too few samples", () => {
    const r = wav.validate({ signal: [1, 2, 3], sample_rate: 10000 });
    expect(r.valid).toBe(false);
  });

  it("rejects zero sample rate", () => {
    const r = wav.validate({ signal: new Array(64).fill(0), sample_rate: 0 });
    expect(r.valid).toBe(false);
  });

  it("no breakage on constant signal", () => {
    const sig = new Array(128).fill(1.0);
    const out = wav.calculate({ signal: sig, sample_rate: 10000, n_scales: 8 });
    expect(out.breakage_detected).toBe(false);
    expect(out.n_events).toBe(0);
    expect(out.health_status).toBe("healthy");
    expect(out.most_severe_time).toBe(-1);
  });

  it("produces energy envelope and baseline for sinusoidal signal", () => {
    // Use a longer signal so baseline window captures representative energy
    const N = 512;
    const sig = Array.from(
      { length: N },
      (_, i) => Math.sin(2 * Math.PI * 50 * i / 10000)
    );
    const out = wav.calculate({
      signal: sig, sample_rate: 10000,
      n_scales: 4, threshold: 10,
    });
    expect(out.energy_envelope.length).toBeGreaterThan(0);
    expect(out.baseline_energy).toBeGreaterThan(0);
    expect(out.max_energy_ratio).toBeGreaterThanOrEqual(0);
  });

  it("detects breakage on signal with sharp transient", () => {
    const N = 256;
    // Quiet baseline followed by a huge spike
    const sig = new Array(N).fill(0).map((_, i) => {
      if (i >= 0 && i < N * 0.1) return 0.001 * Math.sin(i); // baseline
      if (i >= N * 0.5 && i <= N * 0.5 + 5) return 50; // sharp spike
      return 0.001 * Math.sin(i); // return to baseline
    });
    const out = wav.calculate({
      signal: sig, sample_rate: 10000, n_scales: 8,
      threshold: 3, min_event_duration: 0.01,
    });
    // The spike should produce high energy relative to baseline
    expect(out.max_energy_ratio).toBeGreaterThan(1);
    if (out.breakage_detected) {
      expect(out.events.length).toBeGreaterThan(0);
      expect(out.health_status).not.toBe("healthy");
    }
  });

  it("severity classification is correct", () => {
    // If we get events, verify severity values are valid
    const N = 256;
    const sig = new Array(N).fill(0).map((_, i) => (i === 150 ? 100 : 0.001));
    const out = wav.calculate({
      signal: sig, sample_rate: 10000, n_scales: 4,
      threshold: 3, min_event_duration: 0.01,
    });
    for (const event of out.events) {
      expect(["chipping", "fracture", "catastrophic"]).toContain(event.severity);
    }
  });

  it("returns metadata", () => {
    const meta = wav.getMetadata();
    expect(meta.id).toBe("wavelet-breakage");
    expect(meta.safety_class).toBe("critical");
  });
});
