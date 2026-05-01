/**
 * Tests for Specialty Process Engine Batch 15:
 * HybridLaserMachine, LaserCutInterface, LaserMarking,
 * WaterjetTaper, MicrostructureEffect, EnergyOptimization
 */
import { describe, it, expect } from "vitest";
import { hybridLaserMachineEngine } from "../engines/HybridLaserMachineEngine.js";
import { laserCutInterfaceEngine } from "../engines/LaserCutInterfaceEngine.js";
import { laserMarkingEngine } from "../engines/LaserMarkingEngine.js";
import { waterjetTaperEngine } from "../engines/WaterjetTaperEngine.js";
import { microstructureEffectEngine } from "../engines/MicrostructureEffectEngine.js";
import { energyOptimizationEngine } from "../engines/EnergyOptimizationEngine.js";

// ── Hybrid Laser Machining ──────────────────────────────────────
describe("HybridLaserMachineEngine", () => {
  it("calculates laser-assisted machining", () => {
    const r = hybridLaserMachineEngine.calculate({
      process: "laser_assisted_milling",
      laser_power_W: 500,
      spot_diameter_mm: 3,
      workpiece_material: "titanium",
      cutting_speed_m_per_min: 80,
      feed_mm_per_rev: 0.1,
      depth_of_cut_mm: 1.5,
    });
    expect(r.preheat_temperature_C).toBeGreaterThan(0);
    expect(r.force_reduction_pct).toBeGreaterThan(0);
    expect(r.tool_life_improvement_pct).toBeGreaterThan(0);
    expect(r.process_sequence.length).toBeGreaterThan(0);
  });

  it("cladding process works", () => {
    const r = hybridLaserMachineEngine.calculate({
      process: "laser_clad_mill",
      laser_power_W: 1500,
      spot_diameter_mm: 3,
      workpiece_material: "steel",
      clad_material: "inconel_625",
      powder_feed_g_per_min: 10,
      layer_height_mm: 0.5,
      track_width_mm: 2,
    });
    expect(r.energy_input_J_per_mm).toBeGreaterThan(0);
    expect(r.recommendations.length).toBeGreaterThan(0);
  });
});

// ── Laser Cutting ───────────────────────────────────────────────
describe("LaserCutInterfaceEngine", () => {
  it("calculates laser cutting parameters", () => {
    const r = laserCutInterfaceEngine.calculate({
      laser_type: "fiber",
      power_W: 4000,
      material: "mild_steel",
      thickness_mm: 6,
      assist_gas: "N2",
      gas_pressure_bar: 12,
      focus_position_mm: -1,
      nozzle_diameter_mm: 2.0,
    });
    expect(r.max_cutting_speed_mm_per_min).toBeGreaterThan(0);
    expect(r.kerf_width_mm).toBeGreaterThan(0);
    expect(r.heat_affected_zone_mm).toBeGreaterThan(0);
    expect(r.edge_quality).toBeDefined();
  });

  it("thicker material = slower cutting", () => {
    const thin = laserCutInterfaceEngine.calculate({
      laser_type: "fiber", power_W: 4000, material: "mild_steel",
      thickness_mm: 2, assist_gas: "N2", gas_pressure_bar: 12,
      focus_position_mm: -0.5, nozzle_diameter_mm: 2.0,
    });
    const thick = laserCutInterfaceEngine.calculate({
      laser_type: "fiber", power_W: 4000, material: "mild_steel",
      thickness_mm: 20, assist_gas: "N2", gas_pressure_bar: 12,
      focus_position_mm: -3, nozzle_diameter_mm: 2.0,
    });
    expect(thin.max_cutting_speed_mm_per_min).toBeGreaterThan(
      thick.max_cutting_speed_mm_per_min
    );
  });
});

// ── Laser Marking ───────────────────────────────────────────────
describe("LaserMarkingEngine", () => {
  it("calculates marking parameters", () => {
    const r = laserMarkingEngine.calculate({
      laser_source: "fiber_1064",
      power_W: 30,
      mark_type: "engrave",
      content_type: "data_matrix",
      material: "stainless",
      mark_area_mm2: 100,
      character_height_mm: 3,
    });
    expect(r.recommended_speed_mm_per_sec).toBeGreaterThan(0);
    expect(r.mark_depth_um).toBeGreaterThan(0);
    expect(r.mark_time_sec).toBeGreaterThan(0);
    expect(r.readability_grade).toBeDefined();
  });

  it("anneal marking has zero depth", () => {
    const r = laserMarkingEngine.calculate({
      laser_source: "fiber_1064", power_W: 20,
      mark_type: "anneal", content_type: "serial",
      material: "stainless", mark_area_mm2: 50,
      character_height_mm: 2,
    });
    expect(r.mark_depth_um).toBe(0);
  });
});

// ── Waterjet Taper ──────────────────────────────────────────────
describe("WaterjetTaperEngine", () => {
  it("calculates waterjet taper", () => {
    const r = waterjetTaperEngine.calculate({
      material: "mild_steel", thickness_mm: 25,
      cutting_speed_mm_per_min: 200, pump_pressure_MPa: 400,
      orifice_diameter_mm: 0.35, mixing_tube_diameter_mm: 1.0,
      abrasive_flow_g_per_min: 350, standoff_mm: 2,
      target_quality: "Q3_medium", has_tilt_head: false,
    });
    expect(r.predicted_taper_deg).toBeGreaterThan(0);
    expect(r.top_kerf_mm).toBeGreaterThan(r.bottom_kerf_mm);
    expect(r.recommendations.length).toBeGreaterThan(0);
  });

  it("higher quality = slower speed", () => {
    const rough = waterjetTaperEngine.calculate({
      material: "mild_steel", thickness_mm: 25,
      cutting_speed_mm_per_min: 200, pump_pressure_MPa: 400,
      orifice_diameter_mm: 0.35, mixing_tube_diameter_mm: 1.0,
      abrasive_flow_g_per_min: 350, standoff_mm: 2,
      target_quality: "Q2_rough", has_tilt_head: false,
    });
    const fine = waterjetTaperEngine.calculate({
      material: "mild_steel", thickness_mm: 25,
      cutting_speed_mm_per_min: 200, pump_pressure_MPa: 400,
      orifice_diameter_mm: 0.35, mixing_tube_diameter_mm: 1.0,
      abrasive_flow_g_per_min: 350, standoff_mm: 2,
      target_quality: "Q5_precision", has_tilt_head: false,
    });
    expect(rough.recommended_speed_mm_per_min).toBeGreaterThan(
      fine.recommended_speed_mm_per_min
    );
  });
});

// ── Microstructure Effects ──────────────────────────────────────
describe("MicrostructureEffectEngine", () => {
  it("analyzes microstructure impact", () => {
    const r = microstructureEffectEngine.analyze({
      material_class: "steel",
      grain_size_ASTM: 7,
      hardness_HRC: 30,
      phases: [
        { phase: "pearlite", fraction_pct: 60 },
        { phase: "ferrite", fraction_pct: 40 },
      ],
    });
    expect(r.machinability_index).toBeGreaterThan(0);
    expect(r.force_multiplier).toBeGreaterThan(0);
    expect(r.surface_finish_achievable_Ra_um).toBeGreaterThan(0);
    expect(r.phase_effects.length).toBe(2);
  });

  it("martensite = lower machinability than pearlite", () => {
    const pearlite = microstructureEffectEngine.analyze({
      material_class: "steel", grain_size_ASTM: 7, hardness_HRC: 25,
      phases: [{ phase: "pearlite", fraction_pct: 100 }],
    });
    const martensite = microstructureEffectEngine.analyze({
      material_class: "steel", grain_size_ASTM: 7, hardness_HRC: 55,
      phases: [{ phase: "martensite", fraction_pct: 100 }],
    });
    expect(pearlite.machinability_index).toBeGreaterThan(
      martensite.machinability_index
    );
  });

  it("recommends optimal heat treatment", () => {
    const r = microstructureEffectEngine.recommend({
      material_class: "steel", grain_size_ASTM: 7,
      hardness_HRC: 45,
      phases: [{ phase: "martensite", fraction_pct: 80 },
               { phase: "bainite", fraction_pct: 20 }],
    });
    expect(r.optimal_heat_treat).toBeDefined();
    expect(r.expected_improvement_pct).toBeGreaterThan(0);
  });
});

// ── Energy Optimization ─────────────────────────────────────────
describe("EnergyOptimizationEngine", () => {
  const ops = [{
    operation_name: "roughing",
    cutting_time_min: 10, spindle_rpm: 3000,
    feed_rate_mmmin: 500, depth_of_cut_mm: 3,
    radial_depth_mm: 10, tool_diameter_mm: 20,
    material_iso_group: "P", coolant_active: true,
  }];

  it("analyzes energy consumption", () => {
    const r = energyOptimizationEngine.analyze({
      operations: ops, machine_power_kW: 22,
    });
    expect(r.total_energy_kWh).toBeGreaterThan(0);
    expect(r.cutting_energy_kWh).toBeGreaterThan(0);
    expect(r.carbon_footprint_kg_CO2).toBeGreaterThan(0);
    expect(r.by_operation.length).toBe(1);
  });

  it("optimizes energy", () => {
    const r = energyOptimizationEngine.optimize({
      operations: ops, machine_power_kW: 22,
    });
    expect(r.savings_pct).toBeGreaterThanOrEqual(0);
    expect(r.savings_CO2_kg).toBeGreaterThanOrEqual(0);
  });

  it("compares scenarios", () => {
    const r = energyOptimizationEngine.compare([
      { name: "baseline", input: { operations: ops, machine_power_kW: 22 } },
      { name: "high_rpm", input: { operations: [{ ...ops[0], spindle_rpm: 6000 }], machine_power_kW: 22 } },
    ]);
    expect(r.length).toBe(2);
  });
});
