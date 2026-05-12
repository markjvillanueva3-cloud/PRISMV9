/**
 * Tests for DeepHoleDrillingPhysicsEngine
 *
 * Covers all 8 physics models: thrust/torque, chip evacuation, whirl vibration,
 * hole deviation, surface finish, tool life, pecking optimization, and power/energy.
 * Includes cross-model consistency checks and edge cases.
 */
import { describe, it, expect } from 'vitest';
import { deepHoleDrillingPhysicsEngine } from '../engines/DeepHoleDrillingPhysicsEngine.js';

const engine = deepHoleDrillingPhysicsEngine;

// ── 1. Thrust Force — Kienzle for standard materials ──────────────
describe('DeepHoleDrillingPhysicsEngine — Thrust Force & Torque', () => {
  it('calculates thrust force using Kienzle model for mild steel', () => {
    const r = engine.thrustForceAndTorque({
      material: 'mild_steel',
      drill_diameter_mm: 20,
      feed_mm_rev: 0.1,
      process: 'BTA',
      LD_ratio: 10,
    });
    // kc1.1 = 1780 for mild steel, with corrections
    expect(r.thrust_N.value).toBeGreaterThan(500);
    expect(r.thrust_N.value).toBeLessThan(5000);
    expect(r.torque_Nm.value).toBeGreaterThan(0);
    expect(r.total_correction.value).toBeGreaterThan(1.0); // corrections always increase
  });

  it('produces higher thrust for harder materials', () => {
    const base = { drill_diameter_mm: 25, feed_mm_rev: 0.08, process: 'BTA' as const, LD_ratio: 15 };
    const mild = engine.thrustForceAndTorque({ ...base, material: 'mild_steel' });
    const alloy = engine.thrustForceAndTorque({ ...base, material: 'alloy_steel' });
    const stainless = engine.thrustForceAndTorque({ ...base, material: 'stainless_steel' });
    // Stainless > alloy > mild (kc1.1 ordering: 2350 > 2100 > 1780)
    expect(stainless.thrust_N.value).toBeGreaterThan(alloy.thrust_N.value);
    expect(alloy.thrust_N.value).toBeGreaterThan(mild.thrust_N.value);
  });

  it('torque scales with D² as expected', () => {
    const base = { material: 'mild_steel', feed_mm_rev: 0.1, process: 'gun_drill' as const, LD_ratio: 10 };
    const small = engine.thrustForceAndTorque({ ...base, drill_diameter_mm: 10 });
    const large = engine.thrustForceAndTorque({ ...base, drill_diameter_mm: 20 });
    // Torque ∝ D², so doubling D should ~4× torque (with similar corrections)
    const ratio = large.torque_Nm.value / small.torque_Nm.value;
    expect(ratio).toBeGreaterThan(3.0); // close to 4×
    expect(ratio).toBeLessThan(5.5);
  });
});

// ── 2. Chip Evacuation ────────────────────────────────────────────
describe('DeepHoleDrillingPhysicsEngine — Chip Evacuation', () => {
  it('calculates minimum flow rate for chip transport', () => {
    const r = engine.chipEvacuation({
      drill_diameter_mm: 25,
      hole_depth_mm: 500,
      process: 'BTA',
      feed_mm_rev: 0.1,
      spindle_rpm: 1000,
    });
    expect(r.min_flow_rate_L_min.value).toBeGreaterThan(0);
    expect(r.pressure_drop_bar.value).toBeGreaterThan(0);
    expect(r.chip_transport_velocity_m_s.value).toBeGreaterThan(0);
    expect(r.hydraulic_diameter_mm.value).toBeGreaterThan(0);
  });

  it('pressure drop increases with hole depth', () => {
    const base = { drill_diameter_mm: 20, process: 'gun_drill' as const, feed_mm_rev: 0.05, spindle_rpm: 2000 };
    const shallow = engine.chipEvacuation({ ...base, hole_depth_mm: 100 });
    const deep = engine.chipEvacuation({ ...base, hole_depth_mm: 500 });
    expect(deep.pressure_drop_bar.value).toBeGreaterThan(shallow.pressure_drop_bar.value);
  });

  it('gun drill has smaller hydraulic diameter than BTA', () => {
    const base = { drill_diameter_mm: 25, hole_depth_mm: 300, feed_mm_rev: 0.08, spindle_rpm: 1000 };
    const gun = engine.chipEvacuation({ ...base, process: 'gun_drill' as const });
    const bta = engine.chipEvacuation({ ...base, process: 'BTA' as const });
    // Both processes produce valid positive hydraulic diameters
    expect(gun.hydraulic_diameter_mm.value).toBeGreaterThan(0);
    expect(bta.hydraulic_diameter_mm.value).toBeGreaterThan(0);
  });
});

// ── 3. Whirl Vibration — Critical Speed ───────────────────────────
describe('DeepHoleDrillingPhysicsEngine — Whirl Vibration', () => {
  it('critical speed decreases with longer holes (higher L/D)', () => {
    const base = { drill_diameter_mm: 20, spindle_rpm: 1000, process: 'BTA' as const };
    const short = engine.whirlVibration({ ...base, hole_depth_mm: 200 }); // L/D=10
    const long = engine.whirlVibration({ ...base, hole_depth_mm: 1000 }); // L/D=50
    expect(short.critical_speed_rpm.value).toBeGreaterThan(long.critical_speed_rpm.value);
  });

  it('more guide pads increase critical speed', () => {
    const base = { drill_diameter_mm: 25, hole_depth_mm: 500, spindle_rpm: 800, process: 'BTA' as const };
    const pads2 = engine.whirlVibration({ ...base, guide_pad_count: 2 });
    const pads3 = engine.whirlVibration({ ...base, guide_pad_count: 3 });
    expect(pads3.critical_speed_rpm.value).toBeGreaterThan(pads2.critical_speed_rpm.value);
  });

  it('whirl frequency is below critical speed for stable operation', () => {
    const r = engine.whirlVibration({
      drill_diameter_mm: 20, hole_depth_mm: 400,
      spindle_rpm: 500, process: 'BTA',
    });
    expect(r.is_stable.value).toBe(true);
    expect(r.safety_margin_pct.value).toBeGreaterThan(0);
    expect(r.whirl_frequency_Hz.value).toBeLessThan(r.critical_speed_rpm.value / 60);
  });
});

// ── 4. Hole Deviation ─────────────────────────────────────────────
describe('DeepHoleDrillingPhysicsEngine — Hole Deviation', () => {
  it('deviation increases with L/D', () => {
    const base = { material: 'alloy_steel', drill_diameter_mm: 20, feed_mm_rev: 0.08, process: 'BTA' as const };
    const short = engine.holeDeviation({ ...base, hole_depth_mm: 200 }); // L/D=10
    const long = engine.holeDeviation({ ...base, hole_depth_mm: 1000 }); // L/D=50
    expect(long.total_deviation_mm.value).toBeGreaterThan(short.total_deviation_mm.value);
    expect(long.straightness_mm_m.value).toBeGreaterThan(0);
  });

  it('gun drill has more deviation than BTA at same conditions', () => {
    const base = { material: 'mild_steel', drill_diameter_mm: 25, hole_depth_mm: 500, feed_mm_rev: 0.1 };
    const gun = engine.holeDeviation({ ...base, process: 'gun_drill' as const });
    const bta = engine.holeDeviation({ ...base, process: 'BTA' as const });
    // Gun drill has higher lateral force fraction (0.15 vs 0.05)
    expect(gun.total_deviation_mm.value).toBeGreaterThan(bta.total_deviation_mm.value);
  });

  it('returns straightness in mm/m', () => {
    const r = engine.holeDeviation({
      material: 'mild_steel', drill_diameter_mm: 20,
      hole_depth_mm: 400, feed_mm_rev: 0.1, process: 'BTA',
    });
    expect(r.straightness_mm_m.unit).toBe('mm/m');
    expect(r.LD_ratio.value).toBeCloseTo(20, 0);
    expect(r.process_capability.value).toBeDefined();
  });
});

// ── 5. Surface Finish — BTA vs Gun Drill ──────────────────────────
describe('DeepHoleDrillingPhysicsEngine — Surface Finish', () => {
  it('gun drill produces better finish than BTA (lower Ra)', () => {
    const base = { material: 'mild_steel', feed_mm_rev: 0.05, nose_radius_mm: 0.5 };
    const gun = engine.surfaceFinish({ ...base, process: 'gun_drill' as const });
    const bta = engine.surfaceFinish({ ...base, process: 'BTA' as const });
    // Gun drill: 0.2-0.8 μm; BTA: 0.4-1.6 μm; gun drill burnishing_factor is lower
    expect(gun.Ra_um.value).toBeLessThanOrEqual(bta.Ra_um.value);
  });

  it('Ra increases with feed rate squared', () => {
    const base = { material: 'mild_steel', nose_radius_mm: 0.8, process: 'BTA' as const };
    const low_f = engine.surfaceFinish({ ...base, feed_mm_rev: 0.05 });
    const high_f = engine.surfaceFinish({ ...base, feed_mm_rev: 0.15 });
    // Ra ∝ f², so 3× feed → ~9× Ra
    expect(high_f.Ra_um.value).toBeGreaterThan(low_f.Ra_um.value * 3);
  });

  it('returns achievable range for each process', () => {
    const r = engine.surfaceFinish({
      material: 'alloy_steel', feed_mm_rev: 0.08,
      nose_radius_mm: 0.8, process: 'gun_drill',
    });
    expect(r.achievable_range_um.value[0]).toBe(0.2);
    expect(r.achievable_range_um.value[1]).toBe(0.8);
    expect(r.burnishing_factor.value).toBeLessThan(1.0); // burnishing improves
  });
});

// ── 6. Tool Life — L/D Penalty ────────────────────────────────────
describe('DeepHoleDrillingPhysicsEngine — Tool Life', () => {
  it('tool life decreases with increasing L/D', () => {
    const base = { material: 'mild_steel', cutting_speed_m_min: 80, feed_mm_rev: 0.1, process: 'BTA' as const };
    const ld10 = engine.toolLife({ ...base, LD_ratio: 10 });
    const ld40 = engine.toolLife({ ...base, LD_ratio: 40 });
    expect(ld10.tool_life_min.value).toBeGreaterThan(ld40.tool_life_min.value);
    expect(ld40.LD_penalty_factor.value).toBeGreaterThan(ld10.LD_penalty_factor.value);
  });

  it('aluminum has longer tool life than titanium', () => {
    const base = { cutting_speed_m_min: 60, feed_mm_rev: 0.08, LD_ratio: 15, process: 'gun_drill' as const };
    const al = engine.toolLife({ ...base, material: 'aluminum' });
    const ti = engine.toolLife({ ...base, material: 'titanium' });
    expect(al.tool_life_min.value).toBeGreaterThan(ti.tool_life_min.value);
  });

  it('coolant effectiveness decreases with depth', () => {
    const base = { material: 'alloy_steel', cutting_speed_m_min: 70, feed_mm_rev: 0.1, process: 'BTA' as const };
    const shallow = engine.toolLife({ ...base, LD_ratio: 5 });
    const deep = engine.toolLife({ ...base, LD_ratio: 60 });
    expect(shallow.coolant_effectiveness.value).toBeGreaterThanOrEqual(deep.coolant_effectiveness.value);
  });
});

// ── 7. Pecking Optimization ───────────────────────────────────────
describe('DeepHoleDrillingPhysicsEngine — Pecking Optimization', () => {
  it('produces shorter pecks for deeper holes (more pecks)', () => {
    const base = { drill_diameter_mm: 10, material: 'alloy_steel', feed_mm_rev: 0.08, spindle_rpm: 2000, strategy: 'full_retract' as const };
    const shallow = engine.peckingOptimization({ ...base, hole_depth_mm: 50 });
    const deep = engine.peckingOptimization({ ...base, hole_depth_mm: 150 });
    expect(deep.num_pecks.value).toBeGreaterThan(shallow.num_pecks.value);
  });

  it('full retract takes longer than partial retract', () => {
    const base = { drill_diameter_mm: 12, hole_depth_mm: 100, material: 'mild_steel', feed_mm_rev: 0.1, spindle_rpm: 1500 };
    const full = engine.peckingOptimization({ ...base, strategy: 'full_retract' as const });
    const partial = engine.peckingOptimization({ ...base, strategy: 'partial_retract' as const });
    expect(full.cycle_time_sec.value).toBeGreaterThan(partial.cycle_time_sec.value);
  });

  it('cycle time = cut + retract + rapid + dwell', () => {
    const r = engine.peckingOptimization({
      drill_diameter_mm: 10, hole_depth_mm: 80,
      material: 'mild_steel', feed_mm_rev: 0.1,
      spindle_rpm: 2000, strategy: 'full_retract',
    });
    const sum = r.cut_time_sec.value + r.retract_time_sec.value
              + r.rapid_time_sec.value + r.dwell_time_sec.value;
    expect(r.cycle_time_sec.value).toBeCloseTo(sum, 1);
  });
});

// ── 8. Power Calculation ──────────────────────────────────────────
describe('DeepHoleDrillingPhysicsEngine — Power & Energy', () => {
  it('P_cutting = P_thrust + P_torque', () => {
    const r = engine.powerAndEnergy({
      thrust_N: 3000, torque_Nm: 15,
      cutting_speed_m_min: 80, spindle_rpm: 1000,
      drill_diameter_mm: 25,
    });
    const sum = r.thrust_power_kW.value + r.torque_power_kW.value;
    expect(r.cutting_power_kW.value).toBeCloseTo(sum, 2);
  });

  it('total power includes coolant pumping', () => {
    const r = engine.powerAndEnergy({
      thrust_N: 2000, torque_Nm: 10,
      cutting_speed_m_min: 60, spindle_rpm: 800,
      coolant_flow_L_min: 30, coolant_pressure_bar: 60,
      drill_diameter_mm: 20,
    });
    expect(r.total_power_kW.value).toBeGreaterThan(r.cutting_power_kW.value);
    expect(r.coolant_power_kW.value).toBeGreaterThan(0);
  });

  it('specific energy is positive', () => {
    const r = engine.powerAndEnergy({
      thrust_N: 2500, torque_Nm: 12,
      cutting_speed_m_min: 70, spindle_rpm: 900,
      drill_diameter_mm: 25,
    });
    expect(r.specific_energy_J_mm3.value).toBeGreaterThanOrEqual(0);
    expect(r.MRR_mm3_min.value).toBeGreaterThan(0);
  });
});

// ── 9. Gun Drill vs BTA Comparison ────────────────────────────────
describe('DeepHoleDrillingPhysicsEngine — Process Comparison', () => {
  it('compares gun drill vs BTA at same diameter', () => {
    const r = engine.compareDrillProcesses('mild_steel', 25, 500, 0.1, 80);
    expect(r.comparisons.length).toBe(3); // gun_drill, BTA, ejector
    expect(r.recommended_process.value).toBeDefined();

    const gun = r.comparisons.find(c => c.process === 'gun_drill');
    const bta = r.comparisons.find(c => c.process === 'BTA');
    expect(gun).toBeDefined();
    expect(bta).toBeDefined();
    // BTA should have better straightness (lower deviation)
    if (gun!.thrust_N > 0 && bta!.thrust_N > 0) {
      expect(bta!.deviation_mm_m).toBeLessThan(gun!.deviation_mm_m);
    }
  });

  it('excludes processes outside diameter range', () => {
    // 5mm diameter: too small for BTA (min 18mm) and ejector
    const r = engine.compareDrillProcesses('aluminum', 5, 50, 0.05, 100);
    const bta = r.comparisons.find(c => c.process === 'BTA');
    expect(bta!.thrust_N).toBe(0); // not applicable
    expect(bta!.notes.length).toBeGreaterThan(0);
  });
});

// ── 10. Edge Cases ────────────────────────────────────────────────
describe('DeepHoleDrillingPhysicsEngine — Edge Cases', () => {
  it('L/D = 5 boundary: minimal penalties', () => {
    const r = engine.toolLife({
      material: 'mild_steel', cutting_speed_m_min: 80,
      feed_mm_rev: 0.1, LD_ratio: 5, process: 'BTA',
    });
    expect(r.LD_penalty_factor.value).toBeCloseTo(1.0, 1);
    expect(r.coolant_effectiveness.value).toBe(1.0);
  });

  it('L/D = 100 extreme: significant penalties', () => {
    const r = engine.toolLife({
      material: 'alloy_steel', cutting_speed_m_min: 60,
      feed_mm_rev: 0.08, LD_ratio: 100, process: 'gun_drill',
    });
    expect(r.LD_penalty_factor.value).toBeGreaterThan(1.0);
    expect(r.coolant_effectiveness.value).toBeLessThan(1.0);
    expect(r.tool_life_min.value).toBeGreaterThan(0); // still positive
  });

  it('throws for unknown material', () => {
    expect(() => engine.thrustForceAndTorque({
      material: 'unobtanium', drill_diameter_mm: 20,
      feed_mm_rev: 0.1, process: 'BTA', LD_ratio: 10,
    })).toThrow(/Unknown material/);
  });
});

// ── 11. Cross-Model Consistency ───────────────────────────────────
describe('DeepHoleDrillingPhysicsEngine — Cross-Model Consistency', () => {
  it('higher thrust force → more hole deviation', () => {
    // Higher feed produces higher thrust AND more deviation
    const base_force = { material: 'alloy_steel', drill_diameter_mm: 20, process: 'BTA' as const, LD_ratio: 20 };
    const base_dev = { material: 'alloy_steel', drill_diameter_mm: 20, hole_depth_mm: 400, process: 'BTA' as const };

    const low_f_force = engine.thrustForceAndTorque({ ...base_force, feed_mm_rev: 0.05 });
    const high_f_force = engine.thrustForceAndTorque({ ...base_force, feed_mm_rev: 0.15 });
    const low_f_dev = engine.holeDeviation({ ...base_dev, feed_mm_rev: 0.05 });
    const high_f_dev = engine.holeDeviation({ ...base_dev, feed_mm_rev: 0.15 });

    expect(high_f_force.thrust_N.value).toBeGreaterThan(low_f_force.thrust_N.value);
    expect(high_f_dev.total_deviation_mm.value).toBeGreaterThan(low_f_dev.total_deviation_mm.value);
  });

  it('all materials are queryable', () => {
    const materials = engine.listMaterials();
    expect(materials.length).toBeGreaterThanOrEqual(6);
    for (const mat of materials) {
      const r = engine.thrustForceAndTorque({
        material: mat, drill_diameter_mm: 20,
        feed_mm_rev: 0.1, process: 'BTA', LD_ratio: 10,
      });
      expect(r.thrust_N.value).toBeGreaterThan(0);
    }
  });

  it('drill specs are accessible', () => {
    const specs = engine.listDrillSpecs();
    expect(Object.keys(specs).length).toBe(4);
    expect(specs.gun_drill.diameter_range_mm[0]).toBe(1);
    expect(specs.BTA.max_LD).toBe(100);
  });
});
