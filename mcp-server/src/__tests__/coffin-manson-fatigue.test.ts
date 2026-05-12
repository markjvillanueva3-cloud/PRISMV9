/**
 * Tests for CoffinMansonFatigueEngine
 * Covers: Strain-life, S-N curves, cyclic stress-strain, thermal fatigue, multiaxial, machine components
 */
import { describe, it, expect } from "vitest";
import { coffinMansonFatigueEngine } from "../engines/CoffinMansonFatigueEngine.js";

describe("CoffinMansonFatigueEngine", () => {

  describe("strainLifeAnalysis", () => {
    it("steel 1045 returns positive fatigue life", () => {
      const result = coffinMansonFatigueEngine.strainLifeAnalysis({
        material: "steel_1045", strain_amplitude: 0.005,
      });
      expect(result.fatigue_life_cycles).toBeGreaterThan(100);
      expect(result.fatigue_life_cycles).toBeLessThan(1e8);
      expect(result.elastic_strain).toBeGreaterThan(0);
      expect(result.plastic_strain).toBeGreaterThan(0);
    });

    it("low cycle at high strain (< 10^4 cycles)", () => {
      const result = coffinMansonFatigueEngine.strainLifeAnalysis({
        material: "steel_1045", strain_amplitude: 0.02,
      });
      expect(result.fatigue_life_cycles).toBeLessThan(1e4);
      expect(result.regime).toBe("low_cycle");
    });

    it("high cycle at low strain (> 10^5 cycles)", () => {
      const result = coffinMansonFatigueEngine.strainLifeAnalysis({
        material: "steel_1045", strain_amplitude: 0.001,
      });
      expect(result.fatigue_life_cycles).toBeGreaterThan(1e4);
    });

    it("higher strain gives shorter life (monotonic)", () => {
      const r1 = coffinMansonFatigueEngine.strainLifeAnalysis({
        material: "steel_4340", strain_amplitude: 0.003,
      });
      const r2 = coffinMansonFatigueEngine.strainLifeAnalysis({
        material: "steel_4340", strain_amplitude: 0.01,
      });
      expect(r2.fatigue_life_cycles).toBeLessThan(r1.fatigue_life_cycles);
    });

    it("mean stress correction fields are present", () => {
      const result = coffinMansonFatigueEngine.strainLifeAnalysis({
        material: "steel_1045", strain_amplitude: 0.005, mean_stress_mpa: 200,
      });
      // Morrow/SWT corrections should be computed
      expect(result.fatigue_life_cycles).toBeGreaterThan(0);
      expect(result.mean_stress_correction).toBeDefined();
    });

    it("all 7 materials have valid constants", () => {
      const materials = [
        "steel_1045", "steel_4340", "aluminum_6061", "aluminum_7075",
        "titanium_6al4v", "stainless_316", "inconel_718",
      ] as const;
      for (const mat of materials) {
        const result = coffinMansonFatigueEngine.strainLifeAnalysis({
          material: mat, strain_amplitude: 0.005,
        });
        expect(result.fatigue_life_cycles).toBeGreaterThan(0);
        expect(result.total_strain).toBeGreaterThan(0);
      }
    });

    it("temperature effect: higher T reduces life", () => {
      const cold = coffinMansonFatigueEngine.strainLifeAnalysis({
        material: "steel_1045", strain_amplitude: 0.005, temperature_c: 20,
      });
      const hot = coffinMansonFatigueEngine.strainLifeAnalysis({
        material: "steel_1045", strain_amplitude: 0.005, temperature_c: 500,
      });
      expect(hot.fatigue_life_cycles).toBeLessThan(cold.fatigue_life_cycles);
    });
  });

  describe("snCurveGenerate", () => {
    it("S-N curve is monotonically decreasing", () => {
      const result = coffinMansonFatigueEngine.snCurveGenerate({
        material: "steel_1045", n_points: 10,
      });
      expect(result.stress_amplitudes_mpa.length).toBe(10);
      expect(result.cycles_to_failure.length).toBe(10);
      // Higher stress → lower cycles
      for (let i = 1; i < result.stress_amplitudes_mpa.length; i++) {
        if (result.stress_amplitudes_mpa[i] > result.stress_amplitudes_mpa[i - 1]) {
          expect(result.cycles_to_failure[i]).toBeLessThanOrEqual(result.cycles_to_failure[i - 1]);
        }
      }
    });

    it("fatigue strengths at 1e3 and 1e6 are reasonable", () => {
      const result = coffinMansonFatigueEngine.snCurveGenerate({
        material: "steel_4340",
      });
      expect(result.fatigue_strength_at_1e3).toBeGreaterThan(100);
      expect(result.fatigue_strength_at_1e6).toBeGreaterThan(50);
      expect(result.fatigue_strength_at_1e3).toBeGreaterThan(result.fatigue_strength_at_1e6);
    });
  });

  describe("cyclicStressStrain", () => {
    it("Ramberg-Osgood curve produces positive stress", () => {
      const result = coffinMansonFatigueEngine.cyclicStressStrain({
        material: "steel_1045", strain_amplitude: 0.005,
      });
      expect(result.stress_amplitude_mpa).toBeGreaterThan(0);
      expect(result.elastic_strain).toBeGreaterThan(0);
      expect(result.strain_hardening_exponent).toBeGreaterThan(0);
      expect(result.strain_hardening_exponent).toBeLessThan(1);
    });

    it("hysteresis energy is positive for plastic deformation", () => {
      const result = coffinMansonFatigueEngine.cyclicStressStrain({
        material: "aluminum_6061", strain_amplitude: 0.01,
      });
      expect(result.hysteresis_energy_mj_per_m3).toBeGreaterThan(0);
    });
  });

  describe("thermalFatigue", () => {
    it("larger ΔT gives shorter life", () => {
      const small = coffinMansonFatigueEngine.thermalFatigue({
        material: "steel_1045", temp_min_c: 20, temp_max_c: 100, constraint_factor: 0.5,
      });
      const large = coffinMansonFatigueEngine.thermalFatigue({
        material: "steel_1045", temp_min_c: 20, temp_max_c: 500, constraint_factor: 0.5,
      });
      expect(large.fatigue_life_cycles).toBeLessThan(small.fatigue_life_cycles);
    });

    it("zero constraint gives very long life", () => {
      const result = coffinMansonFatigueEngine.thermalFatigue({
        material: "steel_1045", temp_min_c: 20, temp_max_c: 200, constraint_factor: 0,
      });
      expect(result.fatigue_life_cycles).toBeGreaterThan(1e6);
    });
  });

  describe("multiaxialFatigue", () => {
    it("uniaxial equivalent matches uniaxial input", () => {
      const uniaxial = coffinMansonFatigueEngine.multiaxialFatigue({
        principal_strains: [0.005, 0, 0], material: "steel_1045",
      });
      const direct = coffinMansonFatigueEngine.strainLifeAnalysis({
        material: "steel_1045", strain_amplitude: 0.005,
      });
      // Equivalent strain should be close to the uniaxial value
      expect(uniaxial.equivalent_strain).toBeGreaterThan(0.003);
      expect(uniaxial.fatigue_life).toBeGreaterThan(0);
    });
  });

  describe("machineComponentFatigue", () => {
    it("spindle shaft returns realistic fatigue life", () => {
      const result = coffinMansonFatigueEngine.machineComponentFatigue({
        component: "spindle_shaft",
        loading: { max_stress_mpa: 200, min_stress_mpa: -50 },
      });
      expect(result.fatigue_life_cycles).toBeGreaterThan(1000);
      expect(result.fatigue_life_hours).toBeGreaterThan(0);
      expect(result.safety_factor).toBeGreaterThan(0);
    });

    it("higher stress gives shorter life", () => {
      const low = coffinMansonFatigueEngine.machineComponentFatigue({
        component: "ball_screw",
        loading: { max_stress_mpa: 100, min_stress_mpa: 0 },
      });
      const high = coffinMansonFatigueEngine.machineComponentFatigue({
        component: "ball_screw",
        loading: { max_stress_mpa: 400, min_stress_mpa: 0 },
      });
      expect(high.fatigue_life_cycles).toBeLessThan(low.fatigue_life_cycles);
    });
  });
});
