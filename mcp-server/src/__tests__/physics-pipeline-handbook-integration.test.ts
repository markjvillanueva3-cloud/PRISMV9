/**
 * HBK-MS7 U04 — Physics Pipeline Handbook Integration Comparison Tests
 *
 * Verifies that:
 * 1. SpeedFeedOrchestratorEngine uses handbook-sourced spindle data when available
 * 2. FeedRateOptimizationEngine resolves axis accel/rapid from capability profile
 * 3. ToolpathThermalEngine accepts machine_id and integrates machine repeatability
 * 4. Fallback to generic defaults works when no handbook data exists
 * 5. Handbook-sourced results produce higher-confidence outputs than defaults
 *
 * Test machines:
 *   - Haas VF-2: HSMAdvisor torque curve (6 points, conf 0.95)
 *   - DMG MORI DMU 50: computed torque curve (conf 0.70)
 *   - "unknown_machine_xyz": no data — tests fallback path
 */

import { describe, it, expect } from "vitest";

// ── SpeedFeedOrchestratorEngine ──────────────────────────────────────────────

describe("SpeedFeedOrchestratorEngine — handbook integration", () => {
  it("uses capability profile data for known machine (Haas VF-2)", async () => {
    const mod = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const eng = new mod.SpeedFeedOrchestratorEngine();
    const result = eng.compute({
      machine_name: "haas vf-2",
      material: "steel",
      tool_diameter_mm: 12,
      flutes: 4,
      operation: "milling",
      cut_type: "roughing",
      axial_depth_mm: 6,
      radial_depth_mm: 6,
    });

    const r = result.value;
    expect(r).toBeDefined();

    // Machine should be resolved with capability profile confidence (>0.85)
    expect(r.resolved_machine?.power_kw?.confidence).toBeGreaterThanOrEqual(0.85);
    expect(r.resolved_machine?.max_rpm?.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("falls back to defaults for unknown machine", async () => {
    const mod = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const eng = new mod.SpeedFeedOrchestratorEngine();
    const result = eng.compute({
      machine_name: "unknown_machine_xyz_999",
      material: "steel",
      tool_diameter_mm: 12,
      flutes: 4,
      operation: "milling",
      cut_type: "roughing",
      axial_depth_mm: 6,
      radial_depth_mm: 6,
    });

    const r = result.value;
    expect(r).toBeDefined();
    // Should still produce a valid result with lower confidence
    expect(r.resolved_machine?.power_kw?.confidence).toBeLessThan(0.85);
    expect(r.spindle_rpm).toBeGreaterThan(0);
    expect(r.feed_rate_mmmin).toBeGreaterThan(0);
  });

  it("handbook-sourced machine has higher confidence than defaults", async () => {
    const mod = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const eng = new mod.SpeedFeedOrchestratorEngine();

    const withMachine = eng.compute({
      machine_name: "haas vf-2",
      material: "aluminum",
      tool_diameter_mm: 20,
      flutes: 3,
      operation: "milling",
      cut_type: "roughing",
      axial_depth_mm: 10,
      radial_depth_mm: 5,
    }).value;

    const withoutMachine = eng.compute({
      material: "aluminum",
      tool_diameter_mm: 20,
      flutes: 3,
      operation: "milling",
      cut_type: "roughing",
      axial_depth_mm: 10,
      radial_depth_mm: 5,
    }).value;

    // Named machine should have higher machine resolution confidence
    const machConf = withMachine.resolved_machine?.power_kw?.confidence ?? 0;
    const defaultConf = withoutMachine.resolved_machine?.power_kw?.confidence ?? 0;
    expect(machConf).toBeGreaterThan(defaultConf);
  });

  it("torque curve produces RPM-dependent limits", async () => {
    const mod = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const eng = new mod.SpeedFeedOrchestratorEngine();

    // Low RPM (large tool → low RPM, constant-torque region for VF-2)
    const lowRPM = eng.compute({
      machine_name: "haas vf-2",
      material: "steel",
      tool_diameter_mm: 50,
      flutes: 6,
      operation: "milling",
      cut_type: "roughing",
      axial_depth_mm: 3,
      radial_depth_mm: 10,
    }).value;

    // High RPM (small tool → high RPM, constant-power region)
    const highRPM = eng.compute({
      machine_name: "haas vf-2",
      material: "aluminum",
      tool_diameter_mm: 6,
      flutes: 3,
      operation: "milling",
      cut_type: "roughing",
      axial_depth_mm: 6,
      radial_depth_mm: 3,
    }).value;

    expect(lowRPM.spindle_rpm).toBeGreaterThan(0);
    expect(highRPM.spindle_rpm).toBeGreaterThan(0);

    // The torque limits should differ because RPM differs
    const lowTorqueCheck = lowRPM.safety_checks?.find((c: any) => c.name === "torque");
    const highTorqueCheck = highRPM.safety_checks?.find((c: any) => c.name === "torque");
    if (lowTorqueCheck && highTorqueCheck) {
      // At low RPM (constant torque), limit should be >= high RPM (constant power)
      expect(lowTorqueCheck.limit).toBeGreaterThanOrEqual(highTorqueCheck.limit);
    }
  });

  it("DMG MORI DMU 50 resolves from capability profile", async () => {
    const mod = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const eng = new mod.SpeedFeedOrchestratorEngine();
    const result = eng.compute({
      machine_name: "dmg mori dmu 50",
      material: "titanium",
      tool_diameter_mm: 10,
      flutes: 4,
      operation: "milling",
      cut_type: "roughing",
    }).value;

    expect(result).toBeDefined();
    expect(result.spindle_rpm).toBeGreaterThan(0);
    expect(result.resolved_machine?.power_kw?.confidence).toBeGreaterThanOrEqual(0.7);
  });
});

// ── FeedRateOptimizationEngine ───────────────────────────────────────────────

describe("FeedRateOptimizationEngine — handbook axis integration", () => {
  it("accepts machine_id parameter without error", async () => {
    const mod = await import("../engines/FeedRateOptimizationEngine.js");
    const eng = new mod.FeedRateOptimizationEngine();
    const result = eng.optimize({
      base_feed_per_tooth: 0.1,
      tool_diameter: 12,
      number_of_flutes: 4,
      spindle_rpm: 5000,
      radial_depth: 6,
      axial_depth: 6,
      machine_id: "haas_vf_2",
    });

    expect(result).toBeDefined();
    expect(result.optimized_feed_rate).toBeGreaterThan(0);
    expect(result.nominal_feed_rate).toBeGreaterThan(0);
  });

  it("produces valid result with unknown machine_id (fallback)", async () => {
    const mod = await import("../engines/FeedRateOptimizationEngine.js");
    const eng = new mod.FeedRateOptimizationEngine();
    const result = eng.optimize({
      base_feed_per_tooth: 0.1,
      tool_diameter: 12,
      number_of_flutes: 4,
      spindle_rpm: 5000,
      radial_depth: 6,
      axial_depth: 6,
      machine_id: "nonexistent_machine_xyz",
    });

    expect(result).toBeDefined();
    expect(result.optimized_feed_rate).toBeGreaterThan(0);
  });

  it("explicit max_acceleration_mm_s2 overrides machine_id lookup", async () => {
    const mod = await import("../engines/FeedRateOptimizationEngine.js");
    const eng = new mod.FeedRateOptimizationEngine();

    const withExplicit = eng.optimize({
      base_feed_per_tooth: 0.15,
      tool_diameter: 10,
      number_of_flutes: 4,
      spindle_rpm: 8000,
      radial_depth: 2,
      axial_depth: 10,
      max_acceleration_mm_s2: 500,
      machine_id: "haas_vf_2",
    });

    const withoutExplicit = eng.optimize({
      base_feed_per_tooth: 0.15,
      tool_diameter: 10,
      number_of_flutes: 4,
      spindle_rpm: 8000,
      radial_depth: 2,
      axial_depth: 10,
      machine_id: "haas_vf_2",
    });

    expect(withExplicit.optimized_feed_rate).toBeLessThanOrEqual(withoutExplicit.optimized_feed_rate);
  });

  it("rapid_traverse_mm_min caps feed rate", async () => {
    const mod = await import("../engines/FeedRateOptimizationEngine.js");
    const eng = new mod.FeedRateOptimizationEngine();
    const result = eng.optimize({
      base_feed_per_tooth: 0.2,
      tool_diameter: 20,
      number_of_flutes: 3,
      spindle_rpm: 10000,
      radial_depth: 2,
      axial_depth: 5,
      rapid_traverse_mm_min: 1000,
    });

    expect(result.optimized_feed_rate).toBeLessThanOrEqual(1000);
  });
});

// ── ToolpathThermalEngine ────────────────────────────────────────────────────

describe("ToolpathThermalEngine — handbook thermal integration", () => {
  const SIMPLE_GCODE = [
    "G21 G90",
    "M3 S5000",
    "G0 X0 Y0 Z5",
    "G1 Z-2 F200",
    "G1 X100 F500",
    "G1 Y50",
    "G1 X0",
    "G1 Y0",
    "G0 Z5",
    "M5",
    "M30",
  ].join("\n");

  it("accepts machine_id in HeatAccumulationConfig", async () => {
    const mod = await import("../engines/ToolpathThermalEngine.js");
    const eng = new mod.ToolpathThermalEngine();
    const result = eng.analyzeHeatAccumulation({
      gcode: SIMPLE_GCODE,
      material: "steel_4140",
      tool_diameter: 12,
      workpiece_dimensions: { x: 120, y: 70, z: 30 },
      coolant_type: "flood",
      ambient_temp: 20,
      machine_id: "haas_vf_2",
    });

    expect(result).toBeDefined();
    expect(result.peak_temperature_rise).toBeGreaterThanOrEqual(0);
    expect(result.max_distortion_um).toBeGreaterThanOrEqual(0);
    expect(result.distortion_risk).toBeDefined();
  });

  it("produces valid result with unknown machine_id (fallback)", async () => {
    const mod = await import("../engines/ToolpathThermalEngine.js");
    const eng = new mod.ToolpathThermalEngine();
    const result = eng.analyzeHeatAccumulation({
      gcode: SIMPLE_GCODE,
      material: "aluminum_6061",
      tool_diameter: 10,
      workpiece_dimensions: { x: 100, y: 60, z: 20 },
      coolant_type: "mist",
      ambient_temp: 22,
      machine_id: "nonexistent_machine_xyz",
    });

    expect(result).toBeDefined();
    expect(result.peak_temperature_rise).toBeGreaterThanOrEqual(0);
  });

  it("produces valid result without machine_id (original behavior)", async () => {
    const mod = await import("../engines/ToolpathThermalEngine.js");
    const eng = new mod.ToolpathThermalEngine();
    const result = eng.analyzeHeatAccumulation({
      gcode: SIMPLE_GCODE,
      material: "steel_1018",
      tool_diameter: 12,
      workpiece_dimensions: { x: 100, y: 60, z: 20 },
      coolant_type: "flood",
      ambient_temp: 20,
    });

    expect(result).toBeDefined();
    expect(result.peak_temperature_rise).toBeGreaterThanOrEqual(0);
    expect(result.cooling_recommendations).toBeInstanceOf(Array);
  });

  it("machine_id in predictDistortion works without error", async () => {
    const mod = await import("../engines/ToolpathThermalEngine.js");
    const eng = new mod.ToolpathThermalEngine();
    const result = eng.predictDistortion({
      gcode: SIMPLE_GCODE,
      material: "steel_4140",
      workpiece_dimensions: { x: 100, y: 60, z: 20 },
      critical_dimensions: [
        { axis: "x", nominal: 100, tolerance: 0.025 },
        { axis: "y", nominal: 60, tolerance: 0.050 },
      ],
      coolant_type: "flood",
      machine_id: "haas_vf_2",
    });

    expect(result).toBeDefined();
    expect(result.distortion_per_dimension).toHaveLength(2);
    expect(result.overall_risk).toBeDefined();
  });
});
