/**
 * ElectrochemicalMachiningEngine Tests
 *
 * Tests ECM physics: Faraday's law MRR, current density,
 * electrode design, surface quality prediction.
 */

import { describe, it, expect } from 'vitest';
import { electrochemicalMachiningEngine } from '../engines/ElectrochemicalMachiningEngine.js';

describe('ElectrochemicalMachiningEngine', () => {
  describe('predictMRR', () => {
    it('calculates MRR using Faraday\'s law', () => {
      const result = electrochemicalMachiningEngine.predictMRR({
        material: 'steel',
        current_A: 100,
        voltage_V: 15,
        gap_mm: 0.3,
        electrolyte: 'NaCl',
      });

      expect(result.mrr_mm3_per_min).toBeGreaterThan(0);
      expect(result.formula).toContain('Faraday');
    });

    it('scales MRR linearly with current', () => {
      const low = electrochemicalMachiningEngine.predictMRR({
        material: 'steel',
        current_A: 50,
        voltage_V: 15,
        gap_mm: 0.3,
        electrolyte: 'NaCl',
      });

      const high = electrochemicalMachiningEngine.predictMRR({
        material: 'steel',
        current_A: 100,
        voltage_V: 15,
        gap_mm: 0.3,
        electrolyte: 'NaCl',
      });

      expect(high.mrr_mm3_per_min).toBeCloseTo(low.mrr_mm3_per_min * 2, 1);
    });

    it('calculates current density from voltage and gap', () => {
      const result = electrochemicalMachiningEngine.predictMRR({
        material: 'steel',
        current_A: 100,
        voltage_V: 20,
        gap_mm: 0.2,
        electrolyte: 'NaCl',
      });

      expect(result.current_density_A_per_cm2).toBeGreaterThan(0);
    });

    it('predicts surface roughness', () => {
      const result = electrochemicalMachiningEngine.predictMRR({
        material: 'copper',
        current_A: 80,
        voltage_V: 12,
        gap_mm: 0.3,
        electrolyte: 'NaNO3',
      });

      expect(result.surface_roughness_Ra_um).toBeGreaterThan(0);
      expect(result.surface_roughness_Ra_um).toBeLessThan(10);
    });

    it('calculates electrolyte flow requirement', () => {
      const result = electrochemicalMachiningEngine.predictMRR({
        material: 'steel',
        current_A: 200,
        voltage_V: 15,
        gap_mm: 0.3,
        electrolyte: 'NaCl',
      });

      expect(result.electrolyte_flow_requirement_lpm).toBeGreaterThan(1);
    });

    it('warns about too small gap', () => {
      const result = electrochemicalMachiningEngine.predictMRR({
        material: 'steel',
        current_A: 50,
        voltage_V: 10,
        gap_mm: 0.03,
        electrolyte: 'NaCl',
      });

      const hasGapWarning = result.warnings.some(w => w.includes('short circuit'));
      expect(hasGapWarning).toBe(true);
    });

    it('warns about high voltage', () => {
      const result = electrochemicalMachiningEngine.predictMRR({
        material: 'steel',
        current_A: 100,
        voltage_V: 35,
        gap_mm: 0.3,
        electrolyte: 'NaCl',
      });

      const hasVoltageWarning = result.warnings.some(w => w.includes('hydrogen'));
      expect(hasVoltageWarning).toBe(true);
    });

    it('warns about passivation risk', () => {
      const result = electrochemicalMachiningEngine.predictMRR({
        material: 'titanium',
        current_A: 100,
        voltage_V: 15,
        gap_mm: 0.3,
        electrolyte: 'NaNO3',
      });

      const hasPassivationWarning = result.warnings.some(w => w.includes('passivation'));
      expect(hasPassivationWarning).toBe(true);
    });

    it('accounts for material properties', () => {
      const steel = electrochemicalMachiningEngine.predictMRR({
        material: 'steel',
        current_A: 100,
        voltage_V: 15,
        gap_mm: 0.3,
        electrolyte: 'NaCl',
      });

      const aluminum = electrochemicalMachiningEngine.predictMRR({
        material: 'aluminum',
        current_A: 100,
        voltage_V: 15,
        gap_mm: 0.3,
        electrolyte: 'NaCl',
      });

      expect(steel.mrr_mm3_per_min).not.toEqual(aluminum.mrr_mm3_per_min);
    });
  });

  describe('designToolElectrode', () => {
    it('recommends electrode material based on tolerance', () => {
      const tight = electrochemicalMachiningEngine.designToolElectrode({
        target_shape: 'cavity',
        depth_mm: 10,
        width_mm: 5,
        tolerance_mm: 0.01,
      });

      expect(tight.electrode_material).toContain('Titanium');
    });

    it('recommends stainless for deep cavities', () => {
      const deep = electrochemicalMachiningEngine.designToolElectrode({
        target_shape: 'deep slot',
        depth_mm: 30,
        width_mm: 10,
        tolerance_mm: 0.1,
      });

      expect(deep.electrode_material).toContain('Stainless');
    });

    it('recommends copper for general work', () => {
      const general = electrochemicalMachiningEngine.designToolElectrode({
        target_shape: 'pocket',
        depth_mm: 5,
        width_mm: 8,
        tolerance_mm: 0.2,
      });

      expect(general.electrode_material).toContain('Copper');
    });

    it('recommends smaller gap for tighter tolerance', () => {
      const tight = electrochemicalMachiningEngine.designToolElectrode({
        target_shape: 'feature',
        depth_mm: 5,
        width_mm: 5,
        tolerance_mm: 0.01,
      });

      const loose = electrochemicalMachiningEngine.designToolElectrode({
        target_shape: 'feature',
        depth_mm: 5,
        width_mm: 5,
        tolerance_mm: 0.3,
      });

      expect(tight.gap_recommendation_mm).toBeLessThan(loose.gap_recommendation_mm);
    });

    it('calculates feed rate based on gap', () => {
      const result = electrochemicalMachiningEngine.designToolElectrode({
        target_shape: 'cavity',
        depth_mm: 10,
        width_mm: 10,
        tolerance_mm: 0.1,
      });

      expect(result.feed_rate_mm_per_min).toBeGreaterThan(0);
    });

    it('provides electrode shape notes', () => {
      const result = electrochemicalMachiningEngine.designToolElectrode({
        target_shape: 'pocket',
        depth_mm: 15,
        width_mm: 8,
        tolerance_mm: 0.05,
      });

      expect(result.electrode_shape_notes).toContain('negative');
    });

    it('advises internal channels for deep cavities', () => {
      const deep = electrochemicalMachiningEngine.designToolElectrode({
        target_shape: 'deep hole',
        depth_mm: 25,
        width_mm: 5,
        tolerance_mm: 0.1,
      });

      expect(deep.electrode_shape_notes).toContain('channel');
    });

    it('recommends pulse ECM for tight tolerances', () => {
      const result = electrochemicalMachiningEngine.designToolElectrode({
        target_shape: 'precision feature',
        depth_mm: 5,
        width_mm: 3,
        tolerance_mm: 0.01,
      });

      expect(result.electrode_shape_notes).toContain('pulse');
    });
  });

  describe('predictSurfaceQuality', () => {
    it('predicts surface roughness Ra', () => {
      const result = electrochemicalMachiningEngine.predictSurfaceQuality({
        current_density: 50,
        gap_mm: 0.2,
        electrolyte_type: 'NaCl',
      });

      expect(result.predicted_Ra_um).toBeGreaterThan(0);
      expect(result.predicted_Ra_um).toBeLessThan(10);
    });

    it('improves finish with higher current density', () => {
      const low = electrochemicalMachiningEngine.predictSurfaceQuality({
        current_density: 20,
        gap_mm: 0.3,
        electrolyte_type: 'NaNO3',
      });

      const high = electrochemicalMachiningEngine.predictSurfaceQuality({
        current_density: 80,
        gap_mm: 0.3,
        electrolyte_type: 'NaNO3',
      });

      expect(high.predicted_Ra_um).toBeLessThan(low.predicted_Ra_um);
    });

    it('improves finish with pulse ECM', () => {
      const dc = electrochemicalMachiningEngine.predictSurfaceQuality({
        current_density: 50,
        gap_mm: 0.2,
        electrolyte_type: 'NaCl',
      });

      const pulse = electrochemicalMachiningEngine.predictSurfaceQuality({
        current_density: 50,
        gap_mm: 0.2,
        electrolyte_type: 'NaCl',
        pulse_on_us: 100,
        pulse_off_us: 200,
      });

      expect(pulse.predicted_Ra_um).toBeLessThan(dc.predicted_Ra_um);
    });

    it('assesses hydrogen evolution risk', () => {
      const high = electrochemicalMachiningEngine.predictSurfaceQuality({
        current_density: 200,
        gap_mm: 0.2,
        electrolyte_type: 'NaCl',
      });

      expect(high.hydrogen_evolution_risk).toContain('high');
    });

    it('assesses passivation risk', () => {
      const result = electrochemicalMachiningEngine.predictSurfaceQuality({
        current_density: 30,
        gap_mm: 0.3,
        electrolyte_type: 'NaNO3',
      });

      expect(result.passivation_risk).toBeDefined();
    });

    it('calculates stray machining extent', () => {
      const result = electrochemicalMachiningEngine.predictSurfaceQuality({
        current_density: 50,
        gap_mm: 0.3,
        electrolyte_type: 'NaCl',
      });

      expect(result.stray_machining_mm).toBeGreaterThan(0);
    });

    it('NaNO3 produces better finish than NaCl', () => {
      const nacl = electrochemicalMachiningEngine.predictSurfaceQuality({
        current_density: 50,
        gap_mm: 0.2,
        electrolyte_type: 'NaCl',
      });

      const nano3 = electrochemicalMachiningEngine.predictSurfaceQuality({
        current_density: 50,
        gap_mm: 0.2,
        electrolyte_type: 'NaNO3',
      });

      expect(nano3.predicted_Ra_um).toBeLessThan(nacl.predicted_Ra_um);
    });
  });
});
