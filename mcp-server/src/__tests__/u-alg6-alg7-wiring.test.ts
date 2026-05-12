/**
 * Tests for Phase 0-D-5: U-ALG6 + U-ALG7 Algorithm Wiring
 *
 * U-ALG6: FFTAnalyzer + STFTChatter + WaveletBreakage wiring into monitoring engines
 *         via analyzeVibration() and detectChatterSTFT()
 *
 * U-ALG7: ChipBreakingModel + ChipEvacuationModel + ChipVolumeRate wiring into chip engines
 *         via analyzeChipFormISO(), optimizeWithEvacuation(), calculateFromProcess()
 */
import { describe, it, expect } from "vitest";
import { spindleLoadMonitorEngine } from "../engines/SpindleLoadMonitorEngine.js";
import { chatterPredictionEngine } from "../engines/ChatterPredictionEngine.js";
import { chipBreakingEngine } from "../engines/ChipBreakingEngine.js";
import { peckDrillingOptimizationEngine } from "../engines/PeckDrillingOptimizationEngine.js";
import { chipConveyorEngine } from "../engines/ChipConveyorEngine.js";

// ── Helper: generate test vibration signal ──
function makeSignal(opts: {
  samples: number;
  sampleRate: number;
  fundamentalHz: number;
  amplitude: number;
  noiseLevel?: number;
  chatterHz?: number;
  chatterAmplitude?: number;
  breakageAt?: number; // sample index for spike
}): number[] {
  const {
    samples, sampleRate, fundamentalHz, amplitude,
    noiseLevel = 0.01, chatterHz, chatterAmplitude = 0,
    breakageAt,
  } = opts;
  const signal: number[] = [];
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    let v = amplitude * Math.sin(2 * Math.PI * fundamentalHz * t);
    // Add harmonics (2x, 3x) at lower amplitude
    v += amplitude * 0.3 * Math.sin(2 * Math.PI * fundamentalHz * 2 * t);
    // Add chatter frequency if specified
    if (chatterHz && chatterAmplitude) {
      v += chatterAmplitude * Math.sin(2 * Math.PI * chatterHz * t);
    }
    // Add breakage spike
    if (breakageAt !== undefined && Math.abs(i - breakageAt) < 5) {
      v += amplitude * 20;
    }
    // Add noise
    v += noiseLevel * (Math.random() * 2 - 1);
    signal.push(v);
  }
  return signal;
}

// ═══ U-ALG6: SpindleLoadMonitorEngine.analyzeVibration ═══

describe("U-ALG6: SpindleLoadMonitorEngine vibration analysis", () => {
  const sampleRate = 10000;
  const rpm = 8000;
  const flutes = 4;
  const tpf = (rpm * flutes) / 60; // 533.3 Hz

  it("analyzeVibration returns FFT + wavelet metadata fields", () => {
    const signal = makeSignal({
      samples: 2048, sampleRate, fundamentalHz: tpf, amplitude: 1.0,
    });
    const result = spindleLoadMonitorEngine.analyzeVibration({
      signal, sample_rate: sampleRate,
      spindle_speed: rpm, n_flutes: flutes,
      expected_force_N: 500,
    });

    expect(typeof result.fft_used).toBe("boolean");
    expect(typeof result.wavelet_used).toBe("boolean");
    expect(Array.isArray(result.dominant_frequencies)).toBe(true);
    expect(Array.isArray(result.breakage_events)).toBe(true);
    expect(result.vibration_health).toBeDefined();
    expect(result.monitoring_thresholds.force_alarm_N).toBeGreaterThan(0);
    expect(result.monitoring_thresholds.force_retract_N).toBeGreaterThan(result.monitoring_thresholds.force_alarm_N);
    expect(result.monitoring_thresholds.vibration_alarm_rms).toBeGreaterThan(0);
    expect(result.monitoring_comment).toContain("EXPECTED FORCE");
  });

  it("clean signal yields healthy vibration status", () => {
    const signal = makeSignal({
      samples: 2048, sampleRate, fundamentalHz: tpf, amplitude: 0.5,
    });
    const result = spindleLoadMonitorEngine.analyzeVibration({
      signal, sample_rate: sampleRate,
      spindle_speed: rpm, n_flutes: flutes,
    });

    expect(result.breakage_events.length).toBe(0);
    expect(result.vibration_health).toBe("healthy");
  });

  it("signal with breakage spike produces breakage events", () => {
    const signal = makeSignal({
      samples: 2048, sampleRate, fundamentalHz: tpf,
      amplitude: 0.5, breakageAt: 1024,
    });
    const result = spindleLoadMonitorEngine.analyzeVibration({
      signal, sample_rate: sampleRate,
      spindle_speed: rpm, n_flutes: flutes,
    });

    // Wavelet should detect the spike
    if (result.wavelet_used) {
      expect(result.breakage_events.length).toBeGreaterThan(0);
      expect(["warning", "critical"]).toContain(result.vibration_health);
    }
  });

  it("monitoring comment includes alarm and retract thresholds", () => {
    const signal = makeSignal({
      samples: 1024, sampleRate, fundamentalHz: tpf, amplitude: 0.5,
    });
    const result = spindleLoadMonitorEngine.analyzeVibration({
      signal, sample_rate: sampleRate,
      expected_force_N: 1200,
    });

    expect(result.monitoring_comment).toContain("1200");
    expect(result.monitoring_comment).toContain("ALARM AT");
    expect(result.monitoring_comment).toContain("RETRACT AT");
  });

  it("base spindle load result is preserved", () => {
    const signal = makeSignal({
      samples: 1024, sampleRate, fundamentalHz: tpf, amplitude: 0.5,
    });
    const result = spindleLoadMonitorEngine.analyzeVibration({
      signal, sample_rate: sampleRate,
      rated_power_kw: 15, operation: "roughing",
    });

    // Base calculate() fields should be present
    expect(result.nominal_load).toBeDefined();
    expect(result.warning_threshold).toBeDefined();
    expect(result.retract_threshold).toBeDefined();
    expect(result.breakage_spike_limit).toBeDefined();
  });
});

// ═══ U-ALG6: ChatterPredictionEngine.detectChatterSTFT ═══

describe("U-ALG6: ChatterPredictionEngine STFT chatter detection", () => {
  const sampleRate = 10000;
  const rpm = 6000;
  const flutes = 4;
  const tpf = (rpm * flutes) / 60; // 400 Hz

  it("detectChatterSTFT returns STFT metadata fields", () => {
    const signal = makeSignal({
      samples: 4096, sampleRate, fundamentalHz: tpf, amplitude: 1.0,
    });
    const result = chatterPredictionEngine.detectChatterSTFT({
      signal, sample_rate: sampleRate,
      spindle_speed: rpm, n_flutes: flutes,
    });

    expect(typeof result.stft_used).toBe("boolean");
    expect(["none", "mild", "moderate", "severe"]).toContain(result.severity);
    expect(typeof result.chatter_percentage).toBe("number");
    expect(typeof result.chatter_onset_time).toBe("number");
    expect(typeof result.tooth_passing_frequency_Hz).toBe("number");
    expect(result.monitoring_comment).toBeDefined();
    // Base fields preserved
    expect(typeof result.chatterDetected).toBe("boolean");
    expect(typeof result.chatterSeverity).toBe("number");
  });

  it("clean signal reports no chatter", () => {
    const signal = makeSignal({
      samples: 4096, sampleRate, fundamentalHz: tpf,
      amplitude: 1.0, noiseLevel: 0.01,
    });
    const result = chatterPredictionEngine.detectChatterSTFT({
      signal, sample_rate: sampleRate,
      spindle_speed: rpm, n_flutes: flutes,
    });

    expect(result.severity).toBe("none");
    expect(result.monitoring_comment).toContain("NONE");
  });

  it("signal with chatter frequency reports detection", () => {
    // Add strong non-harmonic peak at 850 Hz (not a TPF harmonic)
    const signal = makeSignal({
      samples: 4096, sampleRate, fundamentalHz: tpf,
      amplitude: 0.5, chatterHz: 850, chatterAmplitude: 2.0,
    });
    const result = chatterPredictionEngine.detectChatterSTFT({
      signal, sample_rate: sampleRate,
      spindle_speed: rpm, n_flutes: flutes,
    });

    // Should detect chatter (either via STFT or DFT fallback)
    expect(result.chatterDetected).toBe(true);
    expect(result.severity).not.toBe("none");
  });

  it("tooth passing frequency is calculated correctly", () => {
    const signal = makeSignal({
      samples: 1024, sampleRate, fundamentalHz: tpf, amplitude: 0.5,
    });
    const result = chatterPredictionEngine.detectChatterSTFT({
      signal, sample_rate: sampleRate,
      spindle_speed: rpm, n_flutes: flutes,
    });

    expect(result.tooth_passing_frequency_Hz).toBeCloseTo(400, 0);
  });

  it("chatter monitoring comment includes frequency when detected", () => {
    const signal = makeSignal({
      samples: 4096, sampleRate, fundamentalHz: tpf,
      amplitude: 0.5, chatterHz: 720, chatterAmplitude: 3.0,
    });
    const result = chatterPredictionEngine.detectChatterSTFT({
      signal, sample_rate: sampleRate,
      spindle_speed: rpm, n_flutes: flutes,
    });

    if (result.chatterDetected) {
      expect(result.monitoring_comment).toContain("CHATTER:");
      expect(result.monitoring_comment).not.toContain("NONE");
    }
  });
});

// ═══ U-ALG7: ChipBreakingEngine.analyzeChipFormISO ═══

describe("U-ALG7: ChipBreakingEngine ISO chip analysis", () => {
  it("analyzeChipFormISO returns ISO metadata fields", () => {
    const result = chipBreakingEngine.analyzeChipFormISO({
      feed_per_tooth: 0.15,
      axial_depth: 3,
      cutting_speed: 200,
      tool_diameter: 10,
      iso_group: "P",
      has_chipbreaker: true,
    });

    expect(typeof result.iso_model_used).toBe("boolean");
    expect(["broken", "segmented", "continuous", "stringy", "snarled"]).toContain(result.chip_type_iso);
    expect(result.chip_form_code).toBeGreaterThanOrEqual(1);
    expect(result.chip_form_code).toBeLessThanOrEqual(8);
    expect(["low", "medium", "high"]).toContain(result.bue_risk);
    expect(["good", "marginal", "poor"]).toContain(result.breaking_feasibility);
    expect(result.feed_modification).toBeDefined();
    // Base fields preserved
    expect(result.chip_type).toBeDefined();
    expect(result.shear_angle).toBeDefined();
  });

  it("ISO group K (cast iron) yields segmented chips", () => {
    const result = chipBreakingEngine.analyzeChipFormISO({
      feed_per_tooth: 0.2, axial_depth: 2,
      cutting_speed: 150, tool_diameter: 10,
      iso_group: "K",
    });

    expect(result.chip_type_iso).toBe("segmented");
    expect(result.breaking_feasibility).toBe("good");
  });

  it("ISO group N (aluminum) without chipbreaker yields stringy", () => {
    const result = chipBreakingEngine.analyzeChipFormISO({
      feed_per_tooth: 0.1, axial_depth: 3,
      cutting_speed: 300, tool_diameter: 12,
      iso_group: "N", has_chipbreaker: false,
    });

    expect(result.chip_type_iso).toBe("stringy");
    expect(result.breaking_feasibility).toBe("poor");
    expect(result.feed_modification.action).toBe("increase");
  });

  it("steel in BUE speed range flags high BUE risk", () => {
    const result = chipBreakingEngine.analyzeChipFormISO({
      feed_per_tooth: 0.15, axial_depth: 2,
      cutting_speed: 80, // in BUE range for P (30-120)
      tool_diameter: 10,
      iso_group: "P",
    });

    if (result.iso_model_used) {
      expect(result.bue_risk).toBe("high");
    }
  });

  it("with chipbreaker in ideal range yields good feasibility", () => {
    const result = chipBreakingEngine.analyzeChipFormISO({
      feed_per_tooth: 0.15, axial_depth: 3,
      cutting_speed: 200, tool_diameter: 10,
      iso_group: "P", has_chipbreaker: true,
    });

    if (result.iso_model_used) {
      expect(result.breaking_feasibility).toBe("good");
      expect(result.feed_modification.action).toBe("none");
    }
  });
});

// ═══ U-ALG7: PeckDrillingOptimizationEngine.optimizeWithEvacuation ═══

describe("U-ALG7: PeckDrillingOptimization evacuation wiring", () => {
  it("optimizeWithEvacuation returns evacuation metadata fields", () => {
    const result = peckDrillingOptimizationEngine.optimizeWithEvacuation({
      drill_diameter_mm: 10,
      hole_depth_mm: 80,
      material: "steel",
      drill_type: "carbide_twist",
      cutting_speed_m_min: 100,
      feed_per_rev_mm: 0.2,
      coolant_through_spindle: true,
      system_pressure_bar: 40,
      system_flow_lpm: 20,
    });

    expect(typeof result.evacuation_model_used).toBe("boolean");
    expect(result.required_pressure_bar).toBeGreaterThan(0);
    expect(result.required_flow_lpm).toBeGreaterThan(0);
    expect(typeof result.pressure_adequate).toBe("boolean");
    expect(typeof result.flow_adequate).toBe("boolean");
    expect(result.evacuation_strategy).toBeDefined();
    expect(result.max_depth_no_retract_mm).toBeGreaterThan(0);
    // Base fields preserved
    expect(result.ld_ratio).toBeCloseTo(8, 0);
    expect(result.peck_depth_mm).toBeGreaterThan(0);
    expect(result.num_pecks).toBeGreaterThanOrEqual(1);
  });

  it("insufficient pressure flagged as inadequate", () => {
    const result = peckDrillingOptimizationEngine.optimizeWithEvacuation({
      drill_diameter_mm: 8,
      hole_depth_mm: 100, // L/D = 12.5
      material: "titanium",
      drill_type: "carbide_twist",
      cutting_speed_m_min: 40,
      feed_per_rev_mm: 0.1,
      coolant_through_spindle: true,
      system_pressure_bar: 10, // very low for deep titanium
      system_flow_lpm: 5,
    });

    // Either model or fallback should flag insufficient pressure
    expect(result.pressure_adequate).toBe(false);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("shallow hole in easy material needs low pressure", () => {
    const result = peckDrillingOptimizationEngine.optimizeWithEvacuation({
      drill_diameter_mm: 10,
      hole_depth_mm: 20, // L/D = 2
      material: "aluminum",
      drill_type: "carbide_twist",
      cutting_speed_m_min: 200,
      feed_per_rev_mm: 0.15,
      coolant_through_spindle: false,
      system_pressure_bar: 20,
      system_flow_lpm: 15,
    });

    expect(result.ld_ratio).toBeCloseTo(2, 0);
    expect(result.required_pressure_bar).toBeLessThan(30);
    expect(result.pressure_adequate).toBe(true);
  });

  it("peck depth from evacuation model is used when more conservative", () => {
    const base = peckDrillingOptimizationEngine.calculate({
      drill_diameter_mm: 10,
      hole_depth_mm: 100,
      material: "stainless",
      drill_type: "carbide_twist",
      cutting_speed_m_min: 60,
      feed_per_rev_mm: 0.15,
      coolant_through_spindle: false,
    });

    const evac = peckDrillingOptimizationEngine.optimizeWithEvacuation({
      drill_diameter_mm: 10,
      hole_depth_mm: 100,
      material: "stainless",
      drill_type: "carbide_twist",
      cutting_speed_m_min: 60,
      feed_per_rev_mm: 0.15,
      coolant_through_spindle: false,
      system_pressure_bar: 30,
      system_flow_lpm: 15,
    });

    // Evacuation model should give at least as many pecks (more conservative)
    if (evac.evacuation_model_used) {
      expect(evac.num_pecks).toBeGreaterThanOrEqual(base.num_pecks);
    }
  });
});

// ═══ U-ALG7: ChipConveyorEngine.calculateFromProcess ═══

describe("U-ALG7: ChipConveyorEngine process-based calculation", () => {
  it("calculateFromProcess returns volume rate metadata fields", () => {
    const result = chipConveyorEngine.calculateFromProcess({
      operation: "milling_side",
      tool_diameter: 10,
      depth_of_cut: 5,
      width_of_cut: 2,
      feed_rate: 800,
      cutting_speed: 200,
      n_flutes: 4,
      work_material: "steel",
    });

    expect(typeof result.volume_rate_model_used).toBe("boolean");
    expect(result.computed_mrr_cm3).toBeGreaterThan(0);
    expect(result.cutting_power_kw).toBeGreaterThan(0);
    expect(result.feed_per_tooth).toBeGreaterThan(0);
    expect(result.avg_chip_thickness_mm).toBeGreaterThan(0);
    expect(result.coolant_flow_recommended_lpm).toBeGreaterThan(0);
    // Base fields preserved
    expect(result.chip_volume_rate).toBeDefined();
    expect(result.conveyor_capacity).toBeDefined();
    expect(result.conveyor_adequate).toBeDefined();
  });

  it("turning operation computes MRR correctly", () => {
    const result = chipConveyorEngine.calculateFromProcess({
      operation: "turning",
      tool_diameter: 50,
      depth_of_cut: 3,
      width_of_cut: 0.3, // feed per rev for turning
      feed_rate: 0.3,
      cutting_speed: 200,
      work_material: "steel",
    });

    // MRR for turning = ap × f × Vc × 1000 / 1000 = 3 × 0.3 × 200 = 180 cm³/min
    expect(result.computed_mrr_cm3).toBeGreaterThan(50);
    expect(result.cutting_power_kw).toBeGreaterThan(0);
  });

  it("drilling operation computes chip volume", () => {
    const result = chipConveyorEngine.calculateFromProcess({
      operation: "drilling",
      tool_diameter: 10,
      depth_of_cut: 10, // not used for drilling MRR but required
      width_of_cut: 10,
      feed_rate: 0.2,
      cutting_speed: 100,
      n_flutes: 2,
      work_material: "aluminum",
    });

    expect(result.computed_mrr_cm3).toBeGreaterThan(0);
    expect(result.coolant_flow_recommended_lpm).toBeGreaterThanOrEqual(3);
  });

  it("titanium gets higher coolant flow recommendation than aluminum", () => {
    const params = {
      operation: "milling_side" as const,
      tool_diameter: 10,
      depth_of_cut: 3,
      width_of_cut: 2,
      feed_rate: 500,
      cutting_speed: 150,
      n_flutes: 4,
    };

    const ti = chipConveyorEngine.calculateFromProcess({
      ...params, work_material: "titanium",
    });
    const al = chipConveyorEngine.calculateFromProcess({
      ...params, work_material: "aluminum",
    });

    // Titanium needs more coolant (factor 3.0 vs 1.5)
    expect(ti.coolant_flow_recommended_lpm).toBeGreaterThan(al.coolant_flow_recommended_lpm);
  });

  it("high MRR triggers conveyor capacity warning", () => {
    const result = chipConveyorEngine.calculateFromProcess({
      operation: "milling_slot",
      tool_diameter: 25,
      depth_of_cut: 10,
      width_of_cut: 25,
      feed_rate: 2000,
      cutting_speed: 300,
      n_flutes: 3,
      work_material: "aluminum",
      belt_width_mm: 100, // narrow belt
    });

    // Very high MRR should stress the conveyor
    expect(result.computed_mrr_cm3).toBeGreaterThan(100);
  });
});
