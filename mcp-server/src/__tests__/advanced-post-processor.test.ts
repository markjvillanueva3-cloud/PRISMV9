import { describe, it, expect } from "vitest";
import { AdvancedPostProcessorEngine } from "../engines/AdvancedPostProcessorEngine.js";
import type {
  AdvancedController,
  AdaptiveClearingConfig,
  HSMConfig,
  FeedOptimizationConfig,
  MultiAxisConfig,
  ToolManagementConfig,
  InProcessMeasureConfig,
} from "../engines/AdvancedPostProcessorEngine.js";

const engine = new AdvancedPostProcessorEngine();

const SAMPLE_GCODE = [
  "O1001",
  "G90 G80 G40 G49 G17 G94",
  "T1 M6",
  "S8000 M3",
  "G43 H1 Z50.",
  "G0 X0 Y0",
  "G0 Z5.",
  "G1 Z-3. F200",
  "G1 X50. F500",
  "G1 Y50.",
  "G1 X0.",
  "G1 Y0.",
  "G0 Z50.",
  "M30",
].join("\n");

// ---------------------------------------------------------------------------
// Supported features
// ---------------------------------------------------------------------------

describe("AdvancedPostProcessorEngine — metadata", () => {
  it("lists 6 controllers", () => {
    expect(engine.supportedControllers()).toHaveLength(6);
    expect(engine.supportedControllers()).toContain("fanuc");
    expect(engine.supportedControllers()).toContain("siemens");
    expect(engine.supportedControllers()).toContain("heidenhain");
  });

  it("lists supported features", () => {
    const features = engine.supportedFeatures();
    expect(features.length).toBeGreaterThanOrEqual(10);
    expect(features).toContain("adaptive_clearing");
    expect(features).toContain("multi_axis_rtcp");
    expect(features).toContain("in_process_measurement");
  });
});

// ---------------------------------------------------------------------------
// Adaptive Clearing
// ---------------------------------------------------------------------------

describe("Adaptive Clearing / iMachining", () => {
  const adaptiveConfig: AdaptiveClearingConfig = {
    optimal_load: 0.25,
    max_stepover: 3,
    min_stepover: 0.5,
    ramp_angle: 3,
    ramp_diameter_factor: 0.8,
    feed_on_engage: 300,
    feed_on_disengage: 800,
    use_trochoidal: false,
    chip_thinning_compensation: true,
  };

  it("injects adaptive clearing header", () => {
    const result = engine.enhance({
      controller: "fanuc",
      gcode: SAMPLE_GCODE,
      adaptive_clearing: adaptiveConfig,
    });
    expect(result.enhancements_applied).toContain("adaptive_clearing");
    expect(result.gcode).toContain("ADAPTIVE CLEARING");
    expect(result.gcode).toContain("Optimal Load: 25%");
  });

  it("applies chip thinning compensation", () => {
    const result = engine.enhance({
      controller: "fanuc",
      gcode: SAMPLE_GCODE,
      adaptive_clearing: adaptiveConfig,
    });
    expect(result.gcode).toContain("CHIP THINNING COMPENSATION");
    // Feed should be increased for 25% engagement (thin chips)
    expect(result.gcode).toContain("CTF:");
  });

  it("injects trochoidal block on Siemens", () => {
    const result = engine.enhance({
      controller: "siemens",
      gcode: SAMPLE_GCODE,
      adaptive_clearing: { ...adaptiveConfig, use_trochoidal: true },
    });
    expect(result.gcode).toContain("CYCLE899");
  });

  it("injects trochoidal block on Heidenhain", () => {
    const result = engine.enhance({
      controller: "heidenhain",
      gcode: SAMPLE_GCODE,
      adaptive_clearing: { ...adaptiveConfig, use_trochoidal: true },
    });
    expect(result.gcode).toContain("CYCL DEF 233");
  });

  it("estimates time savings with adaptive clearing", () => {
    const result = engine.enhance({
      controller: "fanuc",
      gcode: SAMPLE_GCODE,
      adaptive_clearing: adaptiveConfig,
    });
    expect(result.estimated_time_savings_pct).toBeGreaterThanOrEqual(15);
  });
});

// ---------------------------------------------------------------------------
// HSM Smoothing
// ---------------------------------------------------------------------------

describe("HSM Smoothing & NURBS", () => {
  const controllers: AdvancedController[] = ["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"];

  controllers.forEach((ctrl) => {
    it(`activates smoothing on ${ctrl}`, () => {
      const result = engine.enhance({
        controller: ctrl,
        gcode: SAMPLE_GCODE,
        hsm: { corner_rounding_tolerance: 0, smoothing_mode: "finish", nurbs_interpolation: false, arc_fitting: false, arc_tolerance: 0.01, min_arc_radius: 0.5, max_arc_radius: 500 },
      });
      expect(result.enhancements_applied).toContain("hsm_smoothing");
    });
  });

  it("injects Fanuc G5.1 for finish mode", () => {
    const result = engine.enhance({
      controller: "fanuc",
      gcode: SAMPLE_GCODE,
      hsm: { corner_rounding_tolerance: 0, smoothing_mode: "finish", nurbs_interpolation: false, arc_fitting: false, arc_tolerance: 0.01, min_arc_radius: 0.5, max_arc_radius: 500 },
    });
    expect(result.gcode).toContain("G5.1 Q1 R0.01");
  });

  it("injects Haas G187 for finish mode", () => {
    const result = engine.enhance({
      controller: "haas",
      gcode: SAMPLE_GCODE,
      hsm: { corner_rounding_tolerance: 0, smoothing_mode: "finish", nurbs_interpolation: false, arc_fitting: false, arc_tolerance: 0.01, min_arc_radius: 0.5, max_arc_radius: 500 },
    });
    expect(result.gcode).toContain("G187 P3 E0.005");
  });

  it("injects Siemens CYCLE832 for finish mode", () => {
    const result = engine.enhance({
      controller: "siemens",
      gcode: SAMPLE_GCODE,
      hsm: { corner_rounding_tolerance: 0, smoothing_mode: "finish", nurbs_interpolation: false, arc_fitting: false, arc_tolerance: 0.01, min_arc_radius: 0.5, max_arc_radius: 500 },
    });
    expect(result.gcode).toContain("CYCLE832(0.005,1)");
  });

  it("injects corner rounding codes", () => {
    const result = engine.enhance({
      controller: "fanuc",
      gcode: SAMPLE_GCODE,
      hsm: { corner_rounding_tolerance: 0.05, smoothing_mode: "finish", nurbs_interpolation: false, arc_fitting: false, arc_tolerance: 0.01, min_arc_radius: 0.5, max_arc_radius: 500 },
    });
    expect(result.gcode).toContain("G62");
    expect(result.gcode).toContain("G64");
  });

  it("activates NURBS on Fanuc", () => {
    const result = engine.enhance({
      controller: "fanuc",
      gcode: SAMPLE_GCODE,
      hsm: { corner_rounding_tolerance: 0, smoothing_mode: "off", nurbs_interpolation: true, arc_fitting: false, arc_tolerance: 0.01, min_arc_radius: 0.5, max_arc_radius: 500 },
    });
    expect(result.gcode).toContain("G06.2");
    expect(result.enhancements_applied).toContain("nurbs_interpolation");
  });

  it("warns NURBS unsupported on Haas", () => {
    const result = engine.enhance({
      controller: "haas",
      gcode: SAMPLE_GCODE,
      hsm: { corner_rounding_tolerance: 0, smoothing_mode: "off", nurbs_interpolation: true, arc_fitting: false, arc_tolerance: 0.01, min_arc_radius: 0.5, max_arc_radius: 500 },
    });
    expect(result.warnings.some((w) => w.includes("NURBS") && w.includes("haas"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Feed Optimization
// ---------------------------------------------------------------------------

describe("Feed Optimization", () => {
  const feedConfig: FeedOptimizationConfig = {
    chip_thinning: true,
    corner_slowdown: true,
    corner_radius_threshold: 5,
    corner_feed_factor: 0.6,
    plunge_rate_factor: 0.5,
    retract_rapid: true,
    arc_feed_limit: 300,
  };

  it("applies plunge rate reduction", () => {
    const result = engine.enhance({
      controller: "fanuc",
      gcode: SAMPLE_GCODE,
      feed_optimization: feedConfig,
    });
    expect(result.enhancements_applied).toContain("feed_optimization");
    expect(result.gcode).toContain("PLUNGE RATE");
  });

  it("estimates time savings", () => {
    const result = engine.enhance({
      controller: "fanuc",
      gcode: SAMPLE_GCODE,
      feed_optimization: feedConfig,
    });
    expect(result.estimated_time_savings_pct).toBeGreaterThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// Multi-Axis RTCP
// ---------------------------------------------------------------------------

describe("Multi-Axis RTCP", () => {
  const gcode5ax = [
    "O2001",
    "G90 G80 G40 G49 G17 G94",
    "T1 M6",
    "S12000 M3",
    "G43 H1 Z50.",
    "G0 X0 Y0 A0 B0",
    "G1 X10 Y10 A15 B-10 F300",
    "G1 X20 Y20 A30 B-20 F300",
    "M30",
  ].join("\n");

  it("activates Fanuc G43.4 RTCP", () => {
    const result = engine.enhance({
      controller: "fanuc",
      gcode: gcode5ax,
      multi_axis: { rtcp_mode: "G43.4", tilt_axis: "AB", tool_vector_output: false, singularity_avoidance: false, singularity_tolerance: 5, inverse_time_feed: false },
    });
    expect(result.gcode).toContain("G43.4");
    expect(result.gcode).toContain("G49"); // deactivation
    expect(result.enhancements_applied).toContain("multi_axis_rtcp");
  });

  it("activates Siemens TRAORI", () => {
    const result = engine.enhance({
      controller: "siemens",
      gcode: gcode5ax,
      multi_axis: { rtcp_mode: "TRAORI", tilt_axis: "AB", tool_vector_output: true, singularity_avoidance: false, singularity_tolerance: 5, inverse_time_feed: false },
    });
    expect(result.gcode).toContain("TRAORI(1)");
    expect(result.gcode).toContain("ORIAXES");
    expect(result.gcode).toContain("TRAFOOF"); // deactivation
  });

  it("activates Heidenhain TCPM", () => {
    const result = engine.enhance({
      controller: "heidenhain",
      gcode: gcode5ax,
      multi_axis: { rtcp_mode: "TCPM", tilt_axis: "AB", tool_vector_output: false, singularity_avoidance: false, singularity_tolerance: 5, inverse_time_feed: false },
    });
    expect(result.gcode).toContain("FUNCTION TCPM");
    expect(result.gcode).toContain("M129"); // deactivation
  });

  it("activates G93 inverse time feed", () => {
    const result = engine.enhance({
      controller: "fanuc",
      gcode: gcode5ax,
      multi_axis: { rtcp_mode: "G43.4", tilt_axis: "AB", tool_vector_output: false, singularity_avoidance: false, singularity_tolerance: 5, inverse_time_feed: true },
    });
    expect(result.gcode).toContain("G93");
    expect(result.gcode).toContain("G94"); // restored before end
  });

  it("warns on near-singularity", () => {
    const gcodeNearPole = gcode5ax.replace("A15 B-10", "A0 B0").replace("A30 B-20", "A2 B-1");
    const result = engine.enhance({
      controller: "fanuc",
      gcode: gcodeNearPole,
      multi_axis: { rtcp_mode: "G43.4", tilt_axis: "AB", tool_vector_output: false, singularity_avoidance: true, singularity_tolerance: 5, inverse_time_feed: false },
    });
    expect(result.warnings.some((w) => w.includes("singularity"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tool Management
// ---------------------------------------------------------------------------

describe("Tool Management", () => {
  const toolConfig: ToolManagementConfig = {
    sister_tooling: true,
    max_tool_life_minutes: 45,
    break_detection: true,
    break_detection_method: "probe",
    wear_offset_increment: 0.005,
    auto_offset_update: true,
  };

  it("injects sister tool logic on Fanuc", () => {
    const result = engine.enhance({
      controller: "fanuc",
      gcode: SAMPLE_GCODE,
      tool_management: toolConfig,
    });
    expect(result.gcode).toContain("TOOL LIFE CHECK");
    expect(result.gcode).toContain("SISTER TOOL: T101");
    expect(result.gcode).toContain("GOTO 9900");
  });

  it("injects sister tool logic on Siemens", () => {
    const result = engine.enhance({
      controller: "siemens",
      gcode: SAMPLE_GCODE,
      tool_management: toolConfig,
    });
    expect(result.gcode).toContain("GOTOF SISTER_T1");
  });

  it("injects probe break detection on Fanuc", () => {
    const result = engine.enhance({
      controller: "fanuc",
      gcode: SAMPLE_GCODE,
      tool_management: toolConfig,
    });
    expect(result.gcode).toContain("TOOL BREAK CHECK");
    expect(result.gcode).toContain("G65 P9023");
    expect(result.gcode).toContain("BROKEN TOOL ALARM");
  });

  it("injects break detection on Siemens", () => {
    const result = engine.enhance({
      controller: "siemens",
      gcode: SAMPLE_GCODE,
      tool_management: toolConfig,
    });
    expect(result.gcode).toContain("CYCLE982");
  });

  it("injects break detection on Heidenhain", () => {
    const result = engine.enhance({
      controller: "heidenhain",
      gcode: SAMPLE_GCODE,
      tool_management: toolConfig,
    });
    expect(result.gcode).toContain("TCH PROBE 481");
  });

  it("supports load monitor break detection", () => {
    const result = engine.enhance({
      controller: "haas",
      gcode: SAMPLE_GCODE,
      tool_management: { ...toolConfig, break_detection_method: "load_monitor" },
    });
    expect(result.gcode).toContain("SPINDLE LOAD MONITOR");
  });

  it("supports laser break detection", () => {
    const result = engine.enhance({
      controller: "fanuc",
      gcode: SAMPLE_GCODE,
      tool_management: { ...toolConfig, break_detection_method: "laser" },
    });
    expect(result.gcode).toContain("LASER TOOL CHECK");
    expect(result.gcode).toContain("M26");
  });
});

// ---------------------------------------------------------------------------
// In-Process Measurement
// ---------------------------------------------------------------------------

describe("In-Process Measurement", () => {
  const measureConfig: InProcessMeasureConfig = {
    measure_every_n_parts: 5,
    critical_features: [
      { type: "bore", nominal: 25.0, tolerance_plus: 0.013, tolerance_minus: -0.013, work_offset: "G54" },
    ],
    auto_compensate: true,
    alarm_on_out_of_tolerance: true,
    spc_logging: true,
  };

  it("injects measurement on Fanuc", () => {
    const result = engine.enhance({
      controller: "fanuc",
      gcode: SAMPLE_GCODE,
      in_process_measure: measureConfig,
    });
    expect(result.gcode).toContain("IN-PROCESS MEASUREMENT");
    expect(result.gcode).toContain("G65 P9812");
    expect(result.gcode).toContain("#199");
    expect(result.enhancements_applied).toContain("in_process_measurement");
  });

  it("injects SPC DPRNT logging on Fanuc", () => {
    const result = engine.enhance({
      controller: "fanuc",
      gcode: SAMPLE_GCODE,
      in_process_measure: measureConfig,
    });
    expect(result.gcode).toContain("DPRNT");
    expect(result.gcode).toContain("SPC");
  });

  it("injects auto compensation via G10", () => {
    const result = engine.enhance({
      controller: "fanuc",
      gcode: SAMPLE_GCODE,
      in_process_measure: measureConfig,
    });
    expect(result.gcode).toContain("G10 L2 P54");
    expect(result.gcode).toContain("AUTO COMPENSATE");
  });

  it("injects tolerance alarm", () => {
    const result = engine.enhance({
      controller: "fanuc",
      gcode: SAMPLE_GCODE,
      in_process_measure: measureConfig,
    });
    expect(result.gcode).toContain("GOTO 9999");
    expect(result.gcode).toContain("25.013");
  });

  it("injects measurement on Siemens", () => {
    const result = engine.enhance({
      controller: "siemens",
      gcode: SAMPLE_GCODE,
      in_process_measure: measureConfig,
    });
    expect(result.gcode).toContain("CYCLE977");
    expect(result.gcode).toContain("SKIP_MEASURE");
    expect(result.gcode).toContain("SETAL");
  });

  it("injects measurement on Heidenhain", () => {
    const result = engine.enhance({
      controller: "heidenhain",
      gcode: SAMPLE_GCODE,
      in_process_measure: measureConfig,
    });
    expect(result.gcode).toContain("TCH PROBE 421");
    expect(result.gcode).toContain("Q199");
    expect(result.gcode).toContain("LBL 98");
  });
});

// ---------------------------------------------------------------------------
// Combined enhancements
// ---------------------------------------------------------------------------

describe("Combined enhancements", () => {
  it("applies multiple features simultaneously", () => {
    const result = engine.enhance({
      controller: "fanuc",
      gcode: SAMPLE_GCODE,
      adaptive_clearing: {
        optimal_load: 0.25,
        max_stepover: 3,
        min_stepover: 0.5,
        ramp_angle: 3,
        ramp_diameter_factor: 0.8,
        feed_on_engage: 300,
        feed_on_disengage: 800,
        use_trochoidal: false,
        chip_thinning_compensation: true,
      },
      hsm: {
        corner_rounding_tolerance: 0.05,
        smoothing_mode: "finish",
        nurbs_interpolation: false,
        arc_fitting: false,
        arc_tolerance: 0.01,
        min_arc_radius: 0.5,
        max_arc_radius: 500,
      },
      feed_optimization: {
        chip_thinning: true,
        corner_slowdown: true,
        corner_radius_threshold: 5,
        corner_feed_factor: 0.6,
        plunge_rate_factor: 0.5,
        retract_rapid: true,
      },
    });
    expect(result.enhancements_applied).toContain("adaptive_clearing");
    expect(result.enhancements_applied).toContain("hsm_smoothing");
    expect(result.enhancements_applied).toContain("feed_optimization");
    expect(result.estimated_time_savings_pct).toBeGreaterThanOrEqual(20);
  });

  it("caps time savings at 50%", () => {
    const result = engine.enhance({
      controller: "fanuc",
      gcode: SAMPLE_GCODE,
      adaptive_clearing: {
        optimal_load: 0.25,
        max_stepover: 3,
        min_stepover: 0.5,
        ramp_angle: 3,
        ramp_diameter_factor: 0.8,
        feed_on_engage: 300,
        feed_on_disengage: 800,
        use_trochoidal: false,
        chip_thinning_compensation: false,
      },
      hsm: {
        corner_rounding_tolerance: 0,
        smoothing_mode: "ultra",
        nurbs_interpolation: false,
        arc_fitting: false,
        arc_tolerance: 0.01,
        min_arc_radius: 0.5,
        max_arc_radius: 500,
      },
      feed_optimization: {
        chip_thinning: false,
        corner_slowdown: false,
        corner_radius_threshold: 5,
        corner_feed_factor: 0.6,
        plunge_rate_factor: 0.5,
        retract_rapid: true,
      },
    });
    expect(result.estimated_time_savings_pct).toBeLessThanOrEqual(50);
  });
});
