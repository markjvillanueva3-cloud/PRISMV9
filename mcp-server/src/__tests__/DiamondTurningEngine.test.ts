/**
 * DiamondTurningEngine Tests
 *
 * Tests ultra-precision SPDT physics: surface finish prediction,
 * micro-cutting forces with size effect, diamond tool wear, and
 * machine configuration selection.
 */

import { describe, it, expect } from 'vitest';
import { diamondTurningEngine } from '../engines/DiamondTurningEngine.js';

describe('DiamondTurningEngine', () => {
  describe('predictSurfaceFinish', () => {
    it('calculates kinematic roughness from feed and tool radius', () => {
      const result = diamondTurningEngine.predictSurfaceFinish({
        material: 'copper',
        tool_nose_radius_mm: 1.0,
        feed_per_rev_um: 5,
        depth_of_cut_um: 2,
        spindle_rpm: 3000,
      });

      expect(result.value.Ra_nm).toBeGreaterThan(0);
      expect(result.value.Rz_nm).toBeGreaterThan(result.value.Ra_nm);
      expect(result.value.pv_nm).toBeGreaterThan(result.value.Rz_nm);
      expect(result.formula).toContain('Ra_ideal');
    });

    it('identifies dominant contributor correctly', () => {
      const highFeed = diamondTurningEngine.predictSurfaceFinish({
        material: 'aluminum_6061',
        tool_nose_radius_mm: 0.5,
        feed_per_rev_um: 20,
        depth_of_cut_um: 5,
        spindle_rpm: 2000,
      });

      expect(highFeed.value.dominant_contributor).toBe('kinematic (feed marks)');
    });

    it('warns about ductile-brittle transition for germanium', () => {
      const result = diamondTurningEngine.predictSurfaceFinish({
        material: 'germanium',
        tool_nose_radius_mm: 0.8,
        feed_per_rev_um: 3,
        depth_of_cut_um: 1.0,
        spindle_rpm: 4000,
      });

      const dbtWarning = result.value.recommendations.some(r => r.includes('ductile-brittle'));
      expect(dbtWarning).toBe(true);
    });

    it('accounts for spindle error motion in total Ra', () => {
      const lowError = diamondTurningEngine.predictSurfaceFinish({
        material: 'copper',
        tool_nose_radius_mm: 1.0,
        feed_per_rev_um: 2,
        depth_of_cut_um: 1,
        spindle_rpm: 3000,
        spindle_error_motion_nm: 5,
      });

      const highError = diamondTurningEngine.predictSurfaceFinish({
        material: 'copper',
        tool_nose_radius_mm: 1.0,
        feed_per_rev_um: 2,
        depth_of_cut_um: 1,
        spindle_rpm: 3000,
        spindle_error_motion_nm: 100,
      });

      expect(highError.value.Ra_nm).toBeGreaterThan(lowError.value.Ra_nm);
    });

    it('applies RSS combination of error sources', () => {
      const result = diamondTurningEngine.predictSurfaceFinish({
        material: 'copper',
        tool_nose_radius_mm: 1.0,
        feed_per_rev_um: 5,
        depth_of_cut_um: 2,
        spindle_rpm: 3000,
        spindle_error_motion_nm: 25,
        tool_waviness_nm: 10,
      });

      expect(result.formula).toContain('√');
    });
  });

  describe('calculateCuttingForces', () => {
    it('calculates cutting force with size effect', () => {
      const result = diamondTurningEngine.calculateCuttingForces({
        material: 'copper',
        depth_of_cut_um: 5,
        feed_um: 5,
      });

      expect(result.value.Fc_mN).toBeGreaterThan(0);
      expect(result.value.Ft_mN).toBeGreaterThan(0);
      expect(result.value.specific_energy_J_per_mm3).toBeGreaterThan(0);
      expect(result.unit).toBe('mN');
    });

    it('shows size effect: smaller chips have higher specific energy', () => {
      const small = diamondTurningEngine.calculateCuttingForces({
        material: 'aluminum_6061',
        depth_of_cut_um: 2,
        feed_um: 2,
      });

      const large = diamondTurningEngine.calculateCuttingForces({
        material: 'aluminum_6061',
        depth_of_cut_um: 10,
        feed_um: 10,
      });

      expect(small.value.specific_energy_J_per_mm3).toBeGreaterThan(
        large.value.specific_energy_J_per_mm3
      );
    });

    it('calculates minimum chip thickness from edge radius', () => {
      const result = diamondTurningEngine.calculateCuttingForces({
        material: 'copper',
        depth_of_cut_um: 5,
        feed_um: 5,
        edge_radius_nm: 100,
      });

      expect(result.value.min_chip_thickness_um).toBeGreaterThan(0);
      expect(result.value.min_chip_thickness_um).toBeLessThan(1);
    });

    it('identifies ductile regime for metals', () => {
      const copper = diamondTurningEngine.calculateCuttingForces({
        material: 'copper',
        depth_of_cut_um: 10,
        feed_um: 5,
      });

      expect(copper.value.ductile_regime).toBe(true);
    });

    it('identifies brittle regime for silicon at excessive DOC', () => {
      const silicon = diamondTurningEngine.calculateCuttingForces({
        material: 'silicon',
        depth_of_cut_um: 2,
        feed_um: 5,
      });

      expect(silicon.value.ductile_regime).toBe(false);
    });

    it('applies rake angle correction', () => {
      const neutral = diamondTurningEngine.calculateCuttingForces({
        material: 'copper',
        depth_of_cut_um: 5,
        feed_um: 5,
        rake_angle_deg: 0,
      });

      const positive = diamondTurningEngine.calculateCuttingForces({
        material: 'copper',
        depth_of_cut_um: 5,
        feed_um: 5,
        rake_angle_deg: 10,
      });

      expect(positive.value.Fc_mN).toBeLessThan(neutral.value.Fc_mN);
    });
  });

  describe('assessToolWear', () => {
    it('calculates edge recession over cutting distance', () => {
      const result = diamondTurningEngine.assessToolWear({
        workpiece_material: 'copper',
        cutting_distance_km: 10,
        depth_um: 5,
        feed_um: 5,
        coolant: 'oil_mist',
      });

      expect(result.value.edge_recession_um).toBeGreaterThan(0);
      expect(result.value.remaining_life_km).toBeGreaterThanOrEqual(0);
      expect(result.unit).toBe('µm');
    });

    it('identifies graphitization risk for nickel', () => {
      const result = diamondTurningEngine.assessToolWear({
        workpiece_material: 'nickel',
        cutting_distance_km: 5,
        depth_um: 3,
        feed_um: 3,
        coolant: 'oil_mist',
      });

      expect(result.value.graphitization_risk).toBe(true);
      expect(result.value.wear_type).toContain('chemical');
    });

    it('shows no graphitization risk for aluminum', () => {
      const result = diamondTurningEngine.assessToolWear({
        workpiece_material: 'aluminum_6061',
        cutting_distance_km: 20,
        depth_um: 5,
        feed_um: 5,
        coolant: 'flood',
      });

      expect(result.value.graphitization_risk).toBe(false);
    });

    it('reduces wear rate with cryogenic coolant', () => {
      const dry = diamondTurningEngine.assessToolWear({
        workpiece_material: 'copper',
        cutting_distance_km: 10,
        depth_um: 5,
        feed_um: 5,
        coolant: 'dry',
      });

      const cryo = diamondTurningEngine.assessToolWear({
        workpiece_material: 'copper',
        cutting_distance_km: 10,
        depth_um: 5,
        feed_um: 5,
        coolant: 'nitrogen',
      });

      expect(cryo.value.edge_recession_um).toBeLessThan(dry.value.edge_recession_um);
    });

    it('calculates remaining life based on max recession limit', () => {
      const result = diamondTurningEngine.assessToolWear({
        workpiece_material: 'pmma',
        cutting_distance_km: 1,
        depth_um: 3,
        feed_um: 3,
        coolant: 'oil_mist',
      });

      expect(result.value.remaining_life_km).toBeGreaterThan(0);
      expect(result.value.recommended_max_distance_km).toBeGreaterThan(result.value.remaining_life_km);
    });
  });

  describe('selectMachineConfig', () => {
    it('selects aerostatic spindle for sub-5nm targets', () => {
      const result = diamondTurningEngine.selectMachineConfig({
        target_Ra_nm: 3,
        workpiece_diameter_mm: 50,
        material: 'copper',
        form: 'spherical',
      });

      expect(result.value.spindle_type).toBe('aerostatic');
      expect(result.value.spindle_error_spec_nm).toBeLessThanOrEqual(5);
      expect(result.value.feedback).toBe('laser_interferometer');
    });

    it('selects air bearing for 5-20nm targets', () => {
      const result = diamondTurningEngine.selectMachineConfig({
        target_Ra_nm: 15,
        workpiece_diameter_mm: 100,
        material: 'aluminum_6061',
        form: 'flat',
      });

      expect(result.value.spindle_type).toBe('air_bearing');
      expect(result.value.spindle_error_spec_nm).toBeLessThanOrEqual(15);
    });

    it('selects hydrostatic for large diameters', () => {
      const result = diamondTurningEngine.selectMachineConfig({
        target_Ra_nm: 15,
        workpiece_diameter_mm: 400,
        material: 'aluminum_6061',
        form: 'flat',
      });

      expect(result.value.spindle_type).toBe('hydrostatic');
    });

    it('requires laser interferometer for freeform surfaces', () => {
      const result = diamondTurningEngine.selectMachineConfig({
        target_Ra_nm: 50,
        workpiece_diameter_mm: 80,
        material: 'copper',
        form: 'freeform',
      });

      expect(result.value.feedback).toBe('laser_interferometer');
    });

    it('specifies tighter temperature control for tighter Ra', () => {
      const tight = diamondTurningEngine.selectMachineConfig({
        target_Ra_nm: 3,
        workpiece_diameter_mm: 50,
        material: 'copper',
        form: 'flat',
      });

      const loose = diamondTurningEngine.selectMachineConfig({
        target_Ra_nm: 100,
        workpiece_diameter_mm: 50,
        material: 'copper',
        form: 'flat',
      });

      expect(tight.value.temperature_control_C).toBeLessThan(loose.value.temperature_control_C);
    });

    it('requires vibration isolation for sub-50nm targets', () => {
      const sub50 = diamondTurningEngine.selectMachineConfig({
        target_Ra_nm: 40,
        workpiece_diameter_mm: 50,
        material: 'copper',
        form: 'spherical',
      });

      expect(sub50.value.isolation).toBe(true);
    });

    it('provides cost range estimate', () => {
      const result = diamondTurningEngine.selectMachineConfig({
        target_Ra_nm: 10,
        workpiece_diameter_mm: 100,
        material: 'germanium',
        form: 'aspheric',
      });

      expect(result.value.estimated_cost_range).toContain('$');
    });

    it('tightens specs for brittle materials', () => {
      const silicon = diamondTurningEngine.selectMachineConfig({
        target_Ra_nm: 30,
        workpiece_diameter_mm: 50,
        material: 'silicon',
        form: 'flat',
      });

      expect(silicon.value.spindle_error_spec_nm).toBeLessThanOrEqual(15);
      expect(silicon.value.temperature_control_C).toBeLessThanOrEqual(0.05);
    });
  });
});
