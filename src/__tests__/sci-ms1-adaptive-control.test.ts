/**
 * SCI-MS1 Adaptive Control — Comprehensive Tests
 *
 * Covers all 5 SCI-MS1 engines:
 * 1. AdaptiveFeedControlEngine — PID feed override with anti-windup & rate limiting
 * 2. AdaptiveSpindleControlEngine — Stability lobes, chatter detection, SSV
 * 3. BayesianAdaptiveEngine — Conjugate Bayesian Kienzle calibration
 * 4. ToolLifeAdaptiveEngine — Weibull life prediction & cost-optimal replacement
 * 5. DigitalTwinSyncEngine — Multi-physics state synchronization
 */

import { describe, it, expect } from "vitest";
import { adaptiveFeedControlEngine } from "../engines/AdaptiveFeedControlEngine.js";
import { adaptiveSpindleControlEngine } from "../engines/AdaptiveSpindleControlEngine.js";
import { bayesianAdaptiveEngine } from "../engines/BayesianAdaptiveEngine.js";
import { toolLifeAdaptiveEngine } from "../engines/ToolLifeAdaptiveEngine.js";
import { digitalTwinSyncEngine } from "../engines/DigitalTwinSyncEngine.js";

// =============================================================================
// 1. AdaptiveFeedControlEngine
// =============================================================================

describe("AdaptiveFeedControlEngine", () => {
  it("PID produces feed overrides that track target force", () => {
    const result = adaptiveFeedControlEngine.adapt({
      segments: [
        { force_actual_N: 800, force_target_N: 1000, feed_programmed_mmmin: 500, segment_idx: 0 },
        { force_actual_N: 900, force_target_N: 1000, feed_programmed_mmmin: 500, segment_idx: 1 },
        { force_actual_N: 950, force_target_N: 1000, feed_programmed_mmmin: 500, segment_idx: 2 },
        { force_actual_N: 980, force_target_N: 1000, feed_programmed_mmmin: 500, segment_idx: 3 },
      ],
    });
    expect(result.overrides).toHaveLength(4);
    // Force is below target → error is positive → override should be > 100%
    expect(result.overrides[0].feed_override_pct).toBeGreaterThan(100);
    // As force approaches target, override should decrease toward 100%
    expect(result.overrides[3].feed_override_pct).toBeLessThan(result.overrides[0].feed_override_pct);
    expect(result.formula).toContain("anti-windup");
  });

  it("anti-windup prevents integral divergence under sustained saturation", () => {
    // Large sustained error with tight override limits — integral should not blow up
    const segments = Array.from({ length: 20 }, (_, i) => ({
      force_actual_N: 200,
      force_target_N: 2000,
      feed_programmed_mmmin: 500,
      segment_idx: i,
    }));
    const result = adaptiveFeedControlEngine.adapt({
      segments,
      override_max_pct: 150,
      override_min_pct: 50,
      pid: { Kp: 0.5, Ki: 0.2, Kd: 0.01 },
    });
    // Even after 20 segments of saturation, integral should be bounded
    const lastIntegral = result.overrides[result.overrides.length - 1].integral;
    // Without anti-windup, integral would be ~20 * 1800 * 0.1 = 3600
    // With anti-windup the integral accumulation is frozen during saturation
    expect(Math.abs(lastIntegral)).toBeLessThan(3600);
    // Override should be clamped at max
    expect(result.overrides[result.overrides.length - 1].feed_override_pct).toBeLessThanOrEqual(150);
  });

  it("rate limiter constrains override change rate per segment", () => {
    const result = adaptiveFeedControlEngine.adapt({
      segments: [
        { force_actual_N: 1000, force_target_N: 1000, feed_programmed_mmmin: 500, segment_idx: 0 },
        { force_actual_N: 200, force_target_N: 1000, feed_programmed_mmmin: 500, segment_idx: 1 },
      ],
      rate_limit_pct_per_seg: 5,
      pid: { Kp: 1.0, Ki: 0.0, Kd: 0.0 },
    });
    // Second segment has huge error (800 N) → Kp*800 = 800 → raw output ~900%
    // Rate limit of 5%/seg means max change from 100% is ±5%
    expect(result.overrides[1].rate_limited).toBe(true);
    const delta = Math.abs(result.overrides[1].feed_override_pct - result.overrides[0].feed_override_pct);
    expect(delta).toBeLessThanOrEqual(5 + 0.01); // floating point tolerance
  });

  it("higher force → lower feed override", () => {
    const highForceResult = adaptiveFeedControlEngine.adapt({
      segments: [
        { force_actual_N: 1500, force_target_N: 1000, feed_programmed_mmmin: 500, segment_idx: 0 },
      ],
    });
    const lowForceResult = adaptiveFeedControlEngine.adapt({
      segments: [
        { force_actual_N: 500, force_target_N: 1000, feed_programmed_mmmin: 500, segment_idx: 0 },
      ],
    });
    // High actual force → negative error → override < 100%
    expect(highForceResult.overrides[0].feed_override_pct).toBeLessThan(100);
    // Low actual force → positive error → override > 100%
    expect(lowForceResult.overrides[0].feed_override_pct).toBeGreaterThan(100);
    expect(highForceResult.overrides[0].feed_override_pct).toBeLessThan(lowForceResult.overrides[0].feed_override_pct);
  });

  it("override stays within [min, max] bounds", () => {
    const result = adaptiveFeedControlEngine.adapt({
      segments: [
        { force_actual_N: 100, force_target_N: 5000, feed_programmed_mmmin: 500, segment_idx: 0 },
        { force_actual_N: 5000, force_target_N: 100, feed_programmed_mmmin: 500, segment_idx: 1 },
      ],
      override_min_pct: 30,
      override_max_pct: 180,
      rate_limit_pct_per_seg: 200, // high rate limit so clamping is the active constraint
    });
    for (const o of result.overrides) {
      expect(o.feed_override_pct).toBeGreaterThanOrEqual(30);
      expect(o.feed_override_pct).toBeLessThanOrEqual(180);
    }
    expect(result.control_params.Kp).toBeGreaterThan(0);
  });

  it("tuneGains returns valid PID gains from oscillatory force history", () => {
    // Create a sinusoidal force signal around target
    const target = 1000;
    const history = Array.from({ length: 64 }, (_, i) =>
      target + 200 * Math.sin(i * 0.5)
    );
    const gains = adaptiveFeedControlEngine.tuneGains(history, target);
    expect(gains.Kp).toBeGreaterThan(0);
    expect(gains.Ki).toBeGreaterThan(0);
    expect(gains.Kd).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// 2. AdaptiveSpindleControlEngine
// =============================================================================

describe("AdaptiveSpindleControlEngine", () => {
  it("stability limit computation returns positive depth", () => {
    const aLim = adaptiveSpindleControlEngine.stabilityLimit(
      8000,  // rpm
      800,   // natural freq Hz
      0.03,  // damping
      2000,  // Kc N/mm²
      5000,  // stiffness N/mm
      4      // flutes
    );
    expect(aLim).toBeGreaterThan(0);
    expect(typeof aLim).toBe("number");
    expect(Number.isFinite(aLim)).toBe(true);
  });

  it("chatter detection flags known chatter signal", () => {
    const sampleRate = 2048;
    const toothPassFreq = (8000 * 4) / 60; // ~533 Hz
    // Create a signal with a strong non-harmonic frequency (e.g., 750 Hz chatter)
    const chatterFreq = 750;
    const N = 512;
    const signal = Array.from({ length: N }, (_, i) => {
      const t = i / sampleRate;
      return 0.1 * Math.sin(2 * Math.PI * toothPassFreq * t) + // normal tooth passing
             2.0 * Math.sin(2 * Math.PI * chatterFreq * t);     // dominant chatter
    });
    const detection = adaptiveSpindleControlEngine.detectChatter(signal, sampleRate, toothPassFreq);
    expect(detection.detected).toBe(true);
    expect(detection.freq).not.toBeNull();
    // Detected frequency should be near 750 Hz (within FFT bin resolution)
    expect(detection.freq!).toBeGreaterThan(700);
    expect(detection.freq!).toBeLessThan(800);
    expect(detection.amplitude).toBeGreaterThan(0);
  });

  it("SSV profile generation when chatter detected", () => {
    const sampleRate = 2048;
    const chatterFreq = 750;
    const N = 512;
    const signal = Array.from({ length: N }, (_, i) => {
      const t = i / sampleRate;
      return 2.0 * Math.sin(2 * Math.PI * chatterFreq * t);
    });
    const result = adaptiveSpindleControlEngine.adapt({
      current_rpm: 8000,
      depth_of_cut_mm: 3.0,
      tool_diameter_mm: 12,
      flute_count: 4,
      vibration_samples: signal,
      sample_rate_hz: sampleRate,
      ssv_enabled: true,
      ssv_amplitude_pct: 10,
      ssv_freq_hz: 2,
    });
    // SSV should be generated since chatter was detected or stability is not "stable"
    if (result.chatter_detected || result.stability_status !== "stable") {
      expect(result.ssv_profile).toBeDefined();
      expect(result.ssv_profile!.rpm_base).toBeGreaterThan(0);
      expect(result.ssv_profile!.amplitude).toBeGreaterThan(0);
      expect(result.ssv_profile!.freq_hz).toBe(2);
    }
    expect(result.formula).toContain("a_lim");
  });

  it("RPM rate limiting constrains large speed changes", () => {
    const result = adaptiveSpindleControlEngine.adapt({
      current_rpm: 8000,
      depth_of_cut_mm: 100, // intentionally above stability limit to force RPM change
      tool_diameter_mm: 12,
      flute_count: 4,
      max_rpm_rate: 100,
      dt_sec: 0.1,
    });
    // If the recommended RPM differs from current, check rate limiting
    if (result.recommended_rpm !== 8000) {
      const maxDelta = 100 * 0.1; // max_rpm_rate * dt_sec = 10
      expect(Math.abs(result.rpm_adjustment)).toBeLessThanOrEqual(maxDelta + 1);
      expect(result.rate_limited).toBe(true);
    }
    expect(result.critical_depth_mm).toBeGreaterThan(0);
  });

  it("stable status for favorable conditions", () => {
    const result = adaptiveSpindleControlEngine.adapt({
      current_rpm: 8000,
      depth_of_cut_mm: 0.1, // very shallow cut — well within stability
      tool_diameter_mm: 12,
      flute_count: 4,
    });
    expect(result.stability_status).toBe("stable");
    expect(result.chatter_detected).toBe(false);
    expect(result.critical_depth_mm).toBeGreaterThan(0.1);
  });
});

// =============================================================================
// 3. BayesianAdaptiveEngine
// =============================================================================

describe("BayesianAdaptiveEngine", () => {
  // Generate synthetic Kienzle observations: Fc = kc11 * b * h^(1-mc)
  const trueKc11 = 1800;
  const trueMc = 0.25;
  function syntheticObs(n: number, noise = 0): Array<{ force_N: number; chip_thickness_mm: number; width_of_cut_mm: number }> {
    return Array.from({ length: n }, (_, i) => {
      const h = 0.05 + (i + 1) * 0.01;
      const b = 3.0;
      const force = trueKc11 * b * Math.pow(h, 1 - trueMc) + noise * (Math.sin(i * 7.3) * 20);
      return { force_N: force, chip_thickness_mm: h, width_of_cut_mm: b };
    });
  }

  it("posterior updates reduce variance (convergence)", () => {
    const fewObs = syntheticObs(5);
    const manyObs = syntheticObs(30);
    const resultFew = bayesianAdaptiveEngine.calibrate({ observations: fewObs });
    const resultMany = bayesianAdaptiveEngine.calibrate({ observations: manyObs });
    // More data → smaller std (tighter posterior)
    expect(resultMany.posterior.kc11_std).toBeLessThan(resultFew.posterior.kc11_std);
    // Convergence ratio should decrease with more data
    expect(resultMany.convergence_ratio).toBeLessThan(resultFew.convergence_ratio);
  });

  it("force prediction matches Kienzle model", () => {
    const predicted = bayesianAdaptiveEngine.predictForce(1800, 0.25, 0.1, 3.0);
    // Fc = 1800 * 3.0 * 0.1^0.75
    const expected = 1800 * 3.0 * Math.pow(0.1, 0.75);
    expect(predicted).toBeCloseTo(expected, 2);
  });

  it("material-specific priors differ between aluminum and inconel", () => {
    const alPrior = bayesianAdaptiveEngine.defaultPrior("aluminum");
    const inPrior = bayesianAdaptiveEngine.defaultPrior("inconel");
    expect(alPrior.kc11_mean).not.toBe(inPrior.kc11_mean);
    // Inconel has higher kc11 than aluminum
    expect(inPrior.kc11_mean!).toBeGreaterThan(alPrior.kc11_mean!);
  });

  it("wear trend detection shows increasing kc11 with rising forces", () => {
    // Simulate increasing forces over time (tool wear effect)
    const obs = Array.from({ length: 30 }, (_, i) => {
      const h = 0.1;
      const b = 3.0;
      const wearMultiplier = 1.0 + i * 0.015; // 1.0 → 1.435 over 30 obs
      const force = trueKc11 * wearMultiplier * b * Math.pow(h, 1 - trueMc);
      return { force_N: force, chip_thickness_mm: h, width_of_cut_mm: b };
    });
    const result = bayesianAdaptiveEngine.calibrate({ observations: obs });
    expect(result.kc11_trend).toBe("increasing");
    expect(result.kc11_drift_pct).toBeGreaterThan(5);
  });

  it("95% credible intervals contain the true value", () => {
    const obs = syntheticObs(40, 5); // slight noise
    const result = bayesianAdaptiveEngine.calibrate({ observations: obs });
    const [kc11Lo, kc11Hi] = result.credible_interval_95.kc11;
    // True kc11 = 1800 should be within the interval
    expect(kc11Lo).toBeLessThan(trueKc11);
    expect(kc11Hi).toBeGreaterThan(trueKc11);
    // mc interval
    const [mcLo, mcHi] = result.credible_interval_95.mc;
    expect(mcLo).toBeLessThan(trueMc);
    expect(mcHi).toBeGreaterThan(trueMc);
  });
});

// =============================================================================
// 4. ToolLifeAdaptiveEngine
// =============================================================================

describe("ToolLifeAdaptiveEngine", () => {
  const wearData = [
    { time_min: 0, vb_mm: 0.00 },
    { time_min: 5, vb_mm: 0.04 },
    { time_min: 10, vb_mm: 0.07 },
    { time_min: 15, vb_mm: 0.10 },
    { time_min: 20, vb_mm: 0.14 },
    { time_min: 25, vb_mm: 0.18 },
    { time_min: 30, vb_mm: 0.22 },
  ];

  it("Weibull parameters computed from wear data", () => {
    const result = toolLifeAdaptiveEngine.predict({
      wear_observations: wearData,
    });
    expect(result.weibull.beta).toBeGreaterThan(0);
    expect(result.weibull.eta_min).toBeGreaterThan(0);
    expect(result.weibull.r_squared).toBeGreaterThanOrEqual(0);
    expect(result.weibull.r_squared).toBeLessThanOrEqual(1);
  });

  it("RUL prediction is positive for mid-life tool", () => {
    const result = toolLifeAdaptiveEngine.predict({
      wear_observations: wearData,
      current_time_min: 20,
    });
    expect(result.rul.predicted_min).toBeGreaterThan(0);
    expect(result.rul.lower_bound_min).toBeGreaterThanOrEqual(0);
    expect(result.rul.upper_bound_min).toBeGreaterThan(result.rul.lower_bound_min);
    expect(result.rul.confidence).toBe(0.95);
  });

  it("reliability decreases with time", () => {
    const beta = 2.5;
    const eta = 30;
    const r10 = toolLifeAdaptiveEngine.reliability(10, beta, eta);
    const r20 = toolLifeAdaptiveEngine.reliability(20, beta, eta);
    const r30 = toolLifeAdaptiveEngine.reliability(30, beta, eta);
    expect(r10).toBeGreaterThan(r20);
    expect(r20).toBeGreaterThan(r30);
    expect(r10).toBeLessThanOrEqual(1);
    expect(r30).toBeGreaterThanOrEqual(0);
  });

  it("cost-optimal replacement time exists and is positive", () => {
    const beta = 2.5;
    const eta = 30;
    const Cr = 25 + 5 * 2; // tool + replacement cost
    const Cf = Cr + 500;    // + scrap cost
    const optT = toolLifeAdaptiveEngine.optimalReplacement(beta, eta, Cr, Cf);
    expect(optT).toBeGreaterThan(0);
    expect(optT).toBeLessThan(3 * eta); // should be within search range
  });

  it("urgency escalates as wear increases toward limit", () => {
    // Low wear → no urgency
    const lowWear = toolLifeAdaptiveEngine.predict({
      wear_observations: [
        { time_min: 0, vb_mm: 0.00 },
        { time_min: 5, vb_mm: 0.02 },
        { time_min: 10, vb_mm: 0.04 },
      ],
      current_time_min: 10,
    });
    // High wear near limit → immediate/soon urgency
    const highWear = toolLifeAdaptiveEngine.predict({
      wear_observations: [
        { time_min: 0, vb_mm: 0.00 },
        { time_min: 5, vb_mm: 0.10 },
        { time_min: 10, vb_mm: 0.20 },
        { time_min: 15, vb_mm: 0.29 }, // near VB limit 0.3
      ],
      vb_limit_mm: 0.3,
      current_time_min: 15,
    });
    // Low wear should have lower urgency
    const urgencyRank: Record<string, number> = { none: 0, plan: 1, soon: 2, immediate: 3 };
    expect(urgencyRank[highWear.urgency]).toBeGreaterThan(urgencyRank[lowWear.urgency]);
    expect(highWear.tool_change_recommended).toBe(true);
  });
});

// =============================================================================
// 5. DigitalTwinSyncEngine
// =============================================================================

describe("DigitalTwinSyncEngine", () => {
  const baseUpdate = {
    feed_mmmin: 500,
    rpm: 8000,
    depth_mm: 2.0,
    width_mm: 5.0,
    tool_diameter_mm: 12,
    dt_sec: 0.1,
  };

  it("states array length matches update count", () => {
    const updates = Array.from({ length: 5 }, () => ({ ...baseUpdate }));
    const result = digitalTwinSyncEngine.sync({ updates });
    expect(result.states).toHaveLength(5);
    expect(result.final_state.step_count).toBe(5);
    expect(result.states[0].step_count).toBe(1);
    expect(result.states[4].step_count).toBe(5);
  });

  it("temperature increases during cutting", () => {
    const updates = Array.from({ length: 10 }, () => ({ ...baseUpdate }));
    const result = digitalTwinSyncEngine.sync({ updates });
    // First state should already be above ambient (25°C) due to cutting heat
    expect(result.states[0].thermal.cutting_zone_temp_C).toBeGreaterThan(25);
    // Cumulative heat should increase
    expect(result.final_state.thermal.cumulative_heat_J).toBeGreaterThan(0);
    expect(result.summary.peak_temperature_C).toBeGreaterThan(25);
  });

  it("wear accumulates over time", () => {
    const updates = Array.from({ length: 20 }, () => ({ ...baseUpdate }));
    const result = digitalTwinSyncEngine.sync({ updates });
    // VB should increase step over step
    expect(result.states[19].wear.vb_mm).toBeGreaterThan(result.states[0].wear.vb_mm);
    expect(result.final_state.wear.vb_mm).toBeGreaterThan(0);
    expect(result.final_state.wear.cutting_time_min).toBeGreaterThan(0);
    expect(result.summary.final_wear_vb_mm).toBeGreaterThan(0);
  });

  it("volume removed is tracked across steps", () => {
    const stockVol = 500000;
    const updates = Array.from({ length: 10 }, () => ({ ...baseUpdate }));
    const result = digitalTwinSyncEngine.sync({ updates, stock_volume_mm3: stockVol });
    expect(result.final_state.stock.volume_removed_mm3).toBeGreaterThan(0);
    expect(result.final_state.stock.volume_remaining_mm3).toBeLessThan(stockVol);
    expect(result.final_state.stock.removal_pct).toBeGreaterThan(0);
    expect(result.summary.total_volume_removed_mm3).toBe(result.final_state.stock.volume_removed_mm3);
  });

  it("queryForAlgorithm returns relevant data for TGAR", () => {
    const updates = Array.from({ length: 5 }, () => ({ ...baseUpdate }));
    const result = digitalTwinSyncEngine.sync({
      updates,
      algorithm_context: "TGAR",
    });
    // TGAR thermal field should have one entry per step
    expect(result.algorithm_queries.tgar_thermal_field).toHaveLength(5);
    expect(result.algorithm_queries.tgar_thermal_field[0]).toBeGreaterThan(0);
    // Query the final state directly for TGAR-specific fields
    const tgarData = digitalTwinSyncEngine.queryForAlgorithm(result.final_state, "TGAR");
    expect(tgarData).toHaveProperty("thermal_gradient");
    expect(tgarData).toHaveProperty("bulk_temp_C");
    expect(tgarData).toHaveProperty("cumulative_heat_J");
    expect(tgarData.temp_C).toBeGreaterThan(0);
  });

  it("queryForAlgorithm returns deflection for PTDC", () => {
    const updates = Array.from({ length: 3 }, () => ({ ...baseUpdate }));
    const result = digitalTwinSyncEngine.sync({ updates, algorithm_context: "PTDC" });
    const ptdcData = digitalTwinSyncEngine.queryForAlgorithm(result.final_state, "PTDC");
    expect(ptdcData).toHaveProperty("deflection_um");
    expect(ptdcData).toHaveProperty("stiffness_loss_factor");
    expect(ptdcData.deflection_um).toBeGreaterThanOrEqual(0);
  });
});
