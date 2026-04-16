import { describe, it, expect } from 'vitest';
import { coolantOptimizationPhysicsEngine } from '../engines/CoolantOptimizationPhysicsEngine.js';

describe('CoolantOptimizationPhysicsEngine', () => {
  // ── A. Fluid Delivery (Darcy-Weisbach) ──

  it('fluidDelivery — Darcy-Weisbach pressure drop is positive', () => {
    const result = coolantOptimizationPhysicsEngine.fluidDelivery({
      pipe_diameter_mm: 12,
      pipe_length_mm: 2000,
      flow_rate_lpm: 10,
      nozzle_diameter_mm: 3,
      supply_pressure_bar: 10,
    });
    expect(result.pressure_drop_bar).toBeGreaterThan(0);
    expect(result.reynolds_number).toBeGreaterThan(0);
    expect(result.flow_regime).toBeDefined();
  });

  it('fluidDelivery — nozzle velocity increases with pressure', () => {
    const low = coolantOptimizationPhysicsEngine.fluidDelivery({
      pipe_diameter_mm: 12,
      pipe_length_mm: 1000,
      flow_rate_lpm: 5,
      nozzle_diameter_mm: 3,
      supply_pressure_bar: 5,
    });
    const high = coolantOptimizationPhysicsEngine.fluidDelivery({
      pipe_diameter_mm: 12,
      pipe_length_mm: 1000,
      flow_rate_lpm: 5,
      nozzle_diameter_mm: 3,
      supply_pressure_bar: 20,
    });
    expect(high.nozzle_velocity_m_s).toBeGreaterThan(low.nozzle_velocity_m_s);
  });

  it('fluidDelivery — jet coherence length is positive', () => {
    const result = coolantOptimizationPhysicsEngine.fluidDelivery({
      pipe_diameter_mm: 10,
      pipe_length_mm: 500,
      flow_rate_lpm: 8,
      nozzle_diameter_mm: 2.5,
      supply_pressure_bar: 15,
    });
    expect(result.jet_coherence_length_mm).toBeGreaterThan(0);
  });

  // ── B. MQL Physics ──

  it('mqlPhysics — droplet size d32 is positive', () => {
    const result = coolantOptimizationPhysicsEngine.mqlPhysics({
      air_velocity_m_s: 50,
    });
    expect(result.droplet_diameter_um).toBeGreaterThan(0);
    expect(result.penetration_distance_mm).toBeGreaterThan(0);
  });

  it('mqlPhysics — higher air velocity produces smaller droplets', () => {
    const slow = coolantOptimizationPhysicsEngine.mqlPhysics({
      air_velocity_m_s: 30,
    });
    const fast = coolantOptimizationPhysicsEngine.mqlPhysics({
      air_velocity_m_s: 80,
    });
    expect(fast.droplet_diameter_um).toBeLessThan(slow.droplet_diameter_um);
  });

  // ── C. HPC Design ──

  it('hpcDesign — required pressure is positive for chip breaking', () => {
    const result = coolantOptimizationPhysicsEngine.hpcDesign({
      chip_thickness_mm: 0.2,
      chip_width_mm: 3,
      chip_curl_radius_mm: 5,
      yield_strength_MPa: 400,
      nozzle_diameter_mm: 1.5,
    });
    expect(result.required_pressure_bar).toBeGreaterThan(0);
    expect(result.chip_break_force_N).toBeGreaterThan(0);
  });

  it('hpcDesign — harder material needs more pressure', () => {
    const soft = coolantOptimizationPhysicsEngine.hpcDesign({
      chip_thickness_mm: 0.2,
      chip_width_mm: 3,
      chip_curl_radius_mm: 5,
      yield_strength_MPa: 200,
      nozzle_diameter_mm: 1.5,
    });
    const hard = coolantOptimizationPhysicsEngine.hpcDesign({
      chip_thickness_mm: 0.2,
      chip_width_mm: 3,
      chip_curl_radius_mm: 5,
      yield_strength_MPa: 800,
      nozzle_diameter_mm: 1.5,
    });
    expect(hard.required_pressure_bar).toBeGreaterThan(soft.required_pressure_bar);
  });

  // ── D. Coolant Health ──

  it('coolantHealth — concentration and pH are tracked', () => {
    const result = coolantOptimizationPhysicsEngine.coolantHealth({
      refractometer_brix: 5.0,
      refractometer_factor: 1.0,
      target_concentration_pct: 7,
      initial_pH: 9.2,
      days_since_change: 30,
      days_since_skim: 5,
    });
    expect(result).toBeDefined();
    expect(result.concentration_pct).toBeGreaterThan(0);
  });

  // ── E. Optimization ──

  it('optimization — heat removal Q = mCpDT is positive', () => {
    const result = coolantOptimizationPhysicsEngine.optimization({
      candidate_flows_lpm: [5, 10, 15, 20],
      mass_flow_rate_kg_s: 0.15,
      coolant_Cp_J_kgK: 4180,
      delta_T_C: 15,
    });
    expect(result).toBeDefined();
    expect(result.heat_removal_W).toBeGreaterThan(0);
  });

  it('optimization — evaluates multiple candidate flows', () => {
    const result = coolantOptimizationPhysicsEngine.optimization({
      candidate_flows_lpm: [5, 10, 15, 20, 25],
      T0_C: 20,
      temperature_coeff_A: 500,
      temperature_exponent_n: 0.5,
      coolant_cost_per_L: 0.05,
      energy_cost_per_kWh: 0.12,
      mass_flow_rate_kg_s: 0.2,
      coolant_Cp_J_kgK: 4180,
      delta_T_C: 10,
    });
    expect(result).toBeDefined();
    expect(result.optimal_flow_lpm).toBeGreaterThan(0);
  });
});
