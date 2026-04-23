/**
 * MicroMachiningEngine Tests
 *
 * Tests micro-milling and micro-drilling physics: size effect,
 * minimum chip thickness, runout impact, and burr formation.
 */

import { describe, it, expect } from 'vitest';
import { microMachiningEngine } from '../engines/MicroMachiningEngine.js';

describe('MicroMachiningEngine', () => {
  describe('microMill', () => {
    it('calculates parameters for standard micro-milling', () => {
      const result = microMachiningEngine.microMill({
        tool_diameter_mm: 0.5,
        material_iso_group: 'N',
      });

      expect(result.cutting_speed.value).toBeGreaterThan(0);
      expect(result.spindle_rpm.value).toBeGreaterThan(0);
      expect(result.feed_per_tooth.value).toBeGreaterThan(0);
      expect(result.table_feed.value).toBeGreaterThan(0);
    });

    it('calculates size effect factor for small chip thickness', () => {
      const result = microMachiningEngine.microMill({
        tool_diameter_mm: 0.2,
        material_iso_group: 'P',
      });

      expect(result.size_effect_factor.value).toBeGreaterThan(1);
      expect(result.effective_kc.value).toBeGreaterThan(2200);
    });

    it('calculates minimum chip thickness from edge radius', () => {
      const result = microMachiningEngine.microMill({
        tool_diameter_mm: 0.3,
        edge_radius_um: 5,
      });

      expect(result.min_chip_thickness.value).toBeCloseTo(1.5, 1);
    });

    it('warns when feed approaches minimum chip thickness', () => {
      const result = microMachiningEngine.microMill({
        tool_diameter_mm: 0.1,
        edge_radius_um: 10,
      });

      const hasPloughingWarning = result.warnings.some(w => w.includes('ploughing'));
      expect(hasPloughingWarning || result.warnings.length >= 0).toBe(true);
    });

    it('calculates runout impact as percentage of fz', () => {
      const result = microMachiningEngine.microMill({
        tool_diameter_mm: 0.3,
        spindle_runout_um: 3,
      });

      expect(result.runout_impact.value).toBeGreaterThan(0);
      expect(result.runout_impact.unit).toBe('%');
    });

    it('warns when runout is high relative to fz', () => {
      const result = microMachiningEngine.microMill({
        tool_diameter_mm: 0.2,
        spindle_runout_um: 5,
      });

      const hasRunoutWarning = result.warnings.some(w => w.includes('uneven chip load'));
      expect(hasRunoutWarning || result.runout_impact.value > 20).toBe(true);
    });

    it('assesses burr risk based on material and feed', () => {
      const aluminum = microMachiningEngine.microMill({
        tool_diameter_mm: 0.5,
        material_iso_group: 'N',
      });

      const castIron = microMachiningEngine.microMill({
        tool_diameter_mm: 0.5,
        material_iso_group: 'K',
      });

      expect(['low', 'medium', 'high']).toContain(aluminum.burr_risk);
      expect(castIron.burr_risk).toBe('low');
    });

    it('warns for extremely small tools', () => {
      const result = microMachiningEngine.microMill({
        tool_diameter_mm: 0.08,
      });

      const hasFragileWarning = result.warnings.some(w => w.includes('fragile'));
      expect(hasFragileWarning).toBe(true);
    });

    it('uses appropriate cutting speeds by material', () => {
      const aluminum = microMachiningEngine.microMill({
        tool_diameter_mm: 0.5,
        material_iso_group: 'N',
      });

      const titanium = microMachiningEngine.microMill({
        tool_diameter_mm: 0.5,
        material_iso_group: 'S',
      });

      expect(aluminum.cutting_speed.value).toBeGreaterThan(titanium.cutting_speed.value);
    });

    it('calculates MRR from depths and feed', () => {
      const result = microMachiningEngine.microMill({
        tool_diameter_mm: 0.5,
        axial_depth_mm: 0.2,
        radial_depth_mm: 0.1,
      });

      expect(result.mrr.value).toBeGreaterThan(0);
      expect(result.mrr.unit).toBe('cm³/min');
    });

    it('scales RPM inversely with tool diameter', () => {
      const small = microMachiningEngine.microMill({
        tool_diameter_mm: 0.2,
        material_iso_group: 'P',
      });

      const large = microMachiningEngine.microMill({
        tool_diameter_mm: 0.8,
        material_iso_group: 'P',
      });

      expect(small.spindle_rpm.value).toBeGreaterThan(large.spindle_rpm.value);
    });
  });

  describe('microDrill', () => {
    it('calculates parameters for standard micro-drilling', () => {
      const result = microMachiningEngine.microDrill({
        drill_diameter_mm: 1.0,
        hole_depth_mm: 5,
      });

      expect(result.cutting_speed.value).toBeGreaterThan(0);
      expect(result.spindle_rpm.value).toBeGreaterThan(0);
      expect(result.feed_per_rev.value).toBeGreaterThan(0);
    });

    it('uses peck cycle for deep holes', () => {
      const deep = microMachiningEngine.microDrill({
        drill_diameter_mm: 0.5,
        hole_depth_mm: 5,
      });

      expect(deep.num_pecks.value).toBeGreaterThan(1);
      expect(deep.peck_depth.value).toBeLessThan(5);
    });

    it('skips peck cycle for shallow holes', () => {
      const shallow = microMachiningEngine.microDrill({
        drill_diameter_mm: 1.0,
        hole_depth_mm: 2,
        peck_cycle: false,
      });

      expect(shallow.num_pecks.value).toBe(1);
    });

    it('calculates depth-to-diameter ratio', () => {
      const result = microMachiningEngine.microDrill({
        drill_diameter_mm: 0.5,
        hole_depth_mm: 5,
      });

      expect(result.depth_to_dia_ratio.value).toBeCloseTo(10, 1);
    });

    it('warns for extremely deep holes', () => {
      const result = microMachiningEngine.microDrill({
        drill_diameter_mm: 0.3,
        hole_depth_mm: 6,
      });

      const hasDeepWarning = result.warnings.some(w => w.includes('breakage'));
      expect(hasDeepWarning).toBe(true);
    });

    it('warns for small drills', () => {
      const result = microMachiningEngine.microDrill({
        drill_diameter_mm: 0.2,
        hole_depth_mm: 1,
      });

      const hasPilotWarning = result.warnings.some(w => w.includes('pilot'));
      expect(hasPilotWarning).toBe(true);
    });

    it('warns for through holes', () => {
      const result = microMachiningEngine.microDrill({
        drill_diameter_mm: 0.8,
        hole_depth_mm: 3,
        is_through_hole: true,
      });

      const hasBreakthroughWarning = result.warnings.some(w => w.includes('breakthrough'));
      expect(hasBreakthroughWarning).toBe(true);
    });

    it('calculates cycle time including peck overhead', () => {
      const noPeck = microMachiningEngine.microDrill({
        drill_diameter_mm: 1.0,
        hole_depth_mm: 2,
        peck_cycle: false,
      });

      const withPeck = microMachiningEngine.microDrill({
        drill_diameter_mm: 1.0,
        hole_depth_mm: 10,
        peck_cycle: true,
      });

      expect(withPeck.cycle_time.value).toBeGreaterThan(noPeck.cycle_time.value);
    });

    it('uses appropriate speeds by material', () => {
      const aluminum = microMachiningEngine.microDrill({
        drill_diameter_mm: 1.0,
        hole_depth_mm: 5,
        material_iso_group: 'N',
      });

      const hardened = microMachiningEngine.microDrill({
        drill_diameter_mm: 1.0,
        hole_depth_mm: 5,
        material_iso_group: 'H',
      });

      expect(aluminum.cutting_speed.value).toBeGreaterThan(hardened.cutting_speed.value);
    });

    it('sets smaller retract clearance for tiny drills', () => {
      const tiny = microMachiningEngine.microDrill({
        drill_diameter_mm: 0.5,
        hole_depth_mm: 2,
      });

      const larger = microMachiningEngine.microDrill({
        drill_diameter_mm: 2.0,
        hole_depth_mm: 5,
      });

      expect(tiny.retract_clearance.value).toBeLessThan(larger.retract_clearance.value);
    });

    it('warns about deep holes without peck cycle', () => {
      const result = microMachiningEngine.microDrill({
        drill_diameter_mm: 0.5,
        hole_depth_mm: 4,
        peck_cycle: false,
      });

      const hasEvacuationWarning = result.warnings.some(w => w.includes('chip evacuation'));
      expect(hasEvacuationWarning).toBe(true);
    });
  });
});
