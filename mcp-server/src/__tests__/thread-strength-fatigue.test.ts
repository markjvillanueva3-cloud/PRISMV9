import { describe, it, expect } from 'vitest';
import { threadStrengthFatigueEngine } from '../engines/ThreadStrengthFatigueEngine.js';

describe('ThreadStrengthFatigueEngine', () => {
  // ── Thread Strength ──

  it('thread_strength — M10 shear area in expected range', () => {
    const result = threadStrengthFatigueEngine.calculate({
      action: 'thread_strength',
      major_diameter_mm: 10,
      pitch_mm: 1.5,
      engagement_length_mm: 15,
      material_ult_shear_mpa: 300,
    });
    expect(result.shear_area_bolt_mm2).toBeGreaterThan(50);
    expect(result.shear_area_bolt_mm2).toBeLessThan(200);
    expect(result.tensile_stress_area_mm2).toBeGreaterThan(40);
    expect(result.tensile_stress_area_mm2).toBeLessThan(80);
  });

  it('thread_strength — pullout force exceeds 10kN for M10 steel', () => {
    const result = threadStrengthFatigueEngine.calculate({
      action: 'thread_strength',
      major_diameter_mm: 10,
      pitch_mm: 1.5,
      engagement_length_mm: 15,
      material_ult_shear_mpa: 300,
    });
    expect(result.pullout_force_n).toBeGreaterThan(10000);
    expect(result.threads_engaged).toBe(10);
  });

  it('thread_strength — inadequate engagement flagged', () => {
    const result = threadStrengthFatigueEngine.calculate({
      action: 'thread_strength',
      major_diameter_mm: 10,
      pitch_mm: 1.5,
      engagement_length_mm: 3, // very short
      material_ult_shear_mpa: 300,
    });
    expect(result.threads_engaged).toBe(2);
  });

  // ── Thread Fatigue ──

  it('thread_fatigue — Goodman safety factor calculated', () => {
    const result = threadStrengthFatigueEngine.calculate({
      action: 'thread_fatigue',
      stress_amplitude_mpa: 30,
      mean_stress_mpa: 200,
      endurance_limit_mpa: 250,
      ultimate_strength_mpa: 800,
      kt_thread: 4.0,
    });
    expect(result.safety_factor).toBeGreaterThan(0);
    expect(result.goodman_ratio).toBeGreaterThan(0);
    expect(result.effective_endurance_mpa).toBeCloseTo(62.5, 0);
  });

  it('thread_fatigue — high amplitude is unsafe', () => {
    const result = threadStrengthFatigueEngine.calculate({
      action: 'thread_fatigue',
      stress_amplitude_mpa: 200,
      mean_stress_mpa: 500,
      endurance_limit_mpa: 250,
      ultimate_strength_mpa: 800,
      kt_thread: 4.0,
    });
    expect(result.safe).toBe(false);
    expect(result.safety_factor).toBeLessThan(1.0);
  });

  // ── Bolt Preload ──

  it('bolt_preload — F = T/(K*d) formula', () => {
    const result = threadStrengthFatigueEngine.calculate({
      action: 'bolt_preload',
      torque_nm: 25,
      bolt_diameter_mm: 10,
      nut_factor_k: 0.2,
    });
    // F = 25*1000 / (0.2 * 10) = 12500 N
    expect(result.preload_force_n).toBe(12500);
    expect(result.joint_separates).toBe(false);
  });

  it('bolt_preload — joint separation under large external force', () => {
    const result = threadStrengthFatigueEngine.calculate({
      action: 'bolt_preload',
      torque_nm: 10,
      bolt_diameter_mm: 10,
      nut_factor_k: 0.2,
      bolt_stiffness_n_mm: 500000,
      member_stiffness_n_mm: 2500000,
      external_force_n: 50000,
    });
    // Preload = 10*1000/(0.2*10) = 5000N, C=1/6, clamp = 5000 - (5/6)*50000 < 0
    expect(result.joint_separates).toBe(true);
  });

  // ── Vibration Loosening ──

  it('vibration_loosening — stable joint below friction threshold', () => {
    const result = threadStrengthFatigueEngine.calculate({
      action: 'vibration_loosening',
      preload_force_n: 20000,
      transverse_force_n: 1000,
      friction_coefficient: 0.15,
    });
    // Resist = 0.15 * 20000 = 3000 > 1000
    expect(result.will_loosen).toBe(false);
    expect(result.safety_factor).toBeGreaterThan(1);
  });

  it('vibration_loosening — loosening detected when force exceeds friction', () => {
    const result = threadStrengthFatigueEngine.calculate({
      action: 'vibration_loosening',
      preload_force_n: 5000,
      transverse_force_n: 2000,
      friction_coefficient: 0.12,
    });
    // Resist = 0.12 * 5000 = 600 < 2000
    expect(result.will_loosen).toBe(true);
    expect(result.loosening_ratio).toBeGreaterThan(1);
    expect(result.recommendation).toContain('thread-locking');
  });

  // ── Joint Analysis ──

  it('joint_analysis — stripping torque and stiffness computed', () => {
    const result = threadStrengthFatigueEngine.calculate({
      action: 'joint_analysis',
      major_diameter_mm: 12,
      pitch_mm: 1.75,
      engagement_length_mm: 18,
      material_ult_shear_mpa: 350,
    });
    expect(result.stripping_torque_nm).toBeGreaterThan(0);
    expect(result.member_stiffness_n_mm).toBeGreaterThan(0);
    expect(result.bolt_stiffness_n_mm).toBeGreaterThan(0);
    expect(result.stiffness_ratio).toBeGreaterThan(0);
    expect(result.stiffness_ratio).toBeLessThan(1);
    expect(result.tensile_area_mm2).toBeGreaterThan(0);
  });
});
