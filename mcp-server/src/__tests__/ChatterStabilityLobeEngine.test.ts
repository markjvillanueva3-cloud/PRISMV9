/**
 * ChatterStabilityLobeEngine Tests
 *
 * Tests regenerative chatter stability analysis: stability lobe
 * computation, process damping (Altintas et al. 2008), and
 * multi-mode FRF synthesis.
 */

import { describe, it, expect } from 'vitest';
import { chatterStabilityLobeEngine } from '../engines/ChatterStabilityLobeEngine.js';

describe('ChatterStabilityLobeEngine', () => {
  describe('compute', () => {
    it('computes stability lobes for milling', () => {
      const result = chatterStabilityLobeEngine.compute({
        tool: {
          diameter_mm: 12,
          flute_count: 4,
          overhang_mm: 50,
          material: 'carbide',
        },
        workpiece: {
          iso_group: 'P',
        },
        machine: {
          max_rpm: 12000,
        },
        cutting: {
          radial_immersion_ratio: 0.5,
          up_milling: false,
        },
      });

      expect(result.value.lobes.length).toBeGreaterThan(0);
      expect(result.value.optimal_rpm).toBeGreaterThan(0);
      expect(result.value.max_stable_ap_mm).toBeGreaterThan(0);
    });

    it('returns stable pockets between lobes', () => {
      const result = chatterStabilityLobeEngine.compute({
        tool: {
          diameter_mm: 10,
          flute_count: 3,
          overhang_mm: 40,
          material: 'carbide',
        },
        workpiece: {
          iso_group: 'N',
        },
        machine: {
          max_rpm: 15000,
        },
        cutting: {
          radial_immersion_ratio: 0.3,
          up_milling: true,
        },
      });

      expect(result.value.stable_pockets.length).toBeGreaterThan(0);
      for (const pocket of result.value.stable_pockets) {
        expect(pocket.rpm_range[1]).toBeGreaterThan(pocket.rpm_range[0]);
        expect(pocket.max_ap_mm).toBeGreaterThan(0);
      }
    });

    it('computes critical frequency near natural frequency', () => {
      const result = chatterStabilityLobeEngine.compute({
        tool: {
          diameter_mm: 16,
          flute_count: 4,
          overhang_mm: 60,
          material: 'carbide',
        },
        workpiece: {
          iso_group: 'P',
        },
        machine: {
          natural_frequency_hz: 1500,
          damping_ratio: 0.03,
          max_rpm: 10000,
        },
        cutting: {
          radial_immersion_ratio: 0.5,
          up_milling: false,
        },
      });

      expect(result.value.critical_frequency_hz).toBeGreaterThan(0);
    });

    it('uses custom kc11 when provided', () => {
      const defaultKc = chatterStabilityLobeEngine.compute({
        tool: { diameter_mm: 10, flute_count: 4, overhang_mm: 40, material: 'carbide' },
        workpiece: { iso_group: 'P' },
        machine: { max_rpm: 10000 },
        cutting: { radial_immersion_ratio: 0.5, up_milling: false },
      });

      const customKc = chatterStabilityLobeEngine.compute({
        tool: { diameter_mm: 10, flute_count: 4, overhang_mm: 40, material: 'carbide' },
        workpiece: { iso_group: 'P', kc11_mpa: 3000 },
        machine: { max_rpm: 10000 },
        cutting: { radial_immersion_ratio: 0.5, up_milling: false },
      });

      expect(customKc.value.max_stable_ap_mm).not.toEqual(defaultKc.value.max_stable_ap_mm);
    });

    it('generates recommendations', () => {
      const result = chatterStabilityLobeEngine.compute({
        tool: { diameter_mm: 8, flute_count: 2, overhang_mm: 35, material: 'carbide' },
        workpiece: { iso_group: 'M' },
        machine: { max_rpm: 8000 },
        cutting: { radial_immersion_ratio: 0.4, up_milling: false },
      });

      expect(result.value.recommendations.length).toBeGreaterThan(0);
    });

    it('includes formula reference', () => {
      const result = chatterStabilityLobeEngine.compute({
        tool: { diameter_mm: 10, flute_count: 4, overhang_mm: 40, material: 'carbide' },
        workpiece: { iso_group: 'P' },
        machine: { max_rpm: 10000 },
        cutting: { radial_immersion_ratio: 0.5, up_milling: false },
      });

      expect(result.formula).toContain('Altintas');
    });

    it('respects rpm_range constraint', () => {
      const result = chatterStabilityLobeEngine.compute({
        tool: { diameter_mm: 12, flute_count: 4, overhang_mm: 50, material: 'carbide' },
        workpiece: { iso_group: 'P' },
        machine: { max_rpm: 15000 },
        cutting: { radial_immersion_ratio: 0.5, up_milling: false },
        rpm_range: [4000, 8000],
      });

      expect(result.value.optimal_rpm).toBeGreaterThanOrEqual(4000);
      expect(result.value.optimal_rpm).toBeLessThanOrEqual(8000);
    });

    it('handles up milling vs down milling', () => {
      const downMilling = chatterStabilityLobeEngine.compute({
        tool: { diameter_mm: 10, flute_count: 4, overhang_mm: 40, material: 'carbide' },
        workpiece: { iso_group: 'P' },
        machine: { max_rpm: 10000 },
        cutting: { radial_immersion_ratio: 0.5, up_milling: false },
      });

      const upMilling = chatterStabilityLobeEngine.compute({
        tool: { diameter_mm: 10, flute_count: 4, overhang_mm: 40, material: 'carbide' },
        workpiece: { iso_group: 'P' },
        machine: { max_rpm: 10000 },
        cutting: { radial_immersion_ratio: 0.5, up_milling: true },
      });

      expect(downMilling.value.max_stable_ap_mm).not.toEqual(upMilling.value.max_stable_ap_mm);
    });

    it('handles different radial immersion ratios', () => {
      const slotting = chatterStabilityLobeEngine.compute({
        tool: { diameter_mm: 10, flute_count: 4, overhang_mm: 40, material: 'carbide' },
        workpiece: { iso_group: 'P' },
        machine: { max_rpm: 10000 },
        cutting: { radial_immersion_ratio: 1.0, up_milling: false },
      });

      const lightCut = chatterStabilityLobeEngine.compute({
        tool: { diameter_mm: 10, flute_count: 4, overhang_mm: 40, material: 'carbide' },
        workpiece: { iso_group: 'P' },
        machine: { max_rpm: 10000 },
        cutting: { radial_immersion_ratio: 0.1, up_milling: false },
      });

      expect(lightCut.value.max_stable_ap_mm).toBeGreaterThan(slotting.value.max_stable_ap_mm);
    });

    it('handles HSS tools with lower stiffness', () => {
      const carbide = chatterStabilityLobeEngine.compute({
        tool: { diameter_mm: 10, flute_count: 4, overhang_mm: 40, material: 'carbide' },
        workpiece: { iso_group: 'P' },
        machine: { max_rpm: 10000 },
        cutting: { radial_immersion_ratio: 0.5, up_milling: false },
      });

      const hss = chatterStabilityLobeEngine.compute({
        tool: { diameter_mm: 10, flute_count: 4, overhang_mm: 40, material: 'hss' },
        workpiece: { iso_group: 'P' },
        machine: { max_rpm: 10000 },
        cutting: { radial_immersion_ratio: 0.5, up_milling: false },
      });

      expect(hss.value.max_stable_ap_mm).toBeLessThan(carbide.value.max_stable_ap_mm);
    });

    it('handles longer overhang reducing stability', () => {
      const short = chatterStabilityLobeEngine.compute({
        tool: { diameter_mm: 10, flute_count: 4, overhang_mm: 30, material: 'carbide' },
        workpiece: { iso_group: 'P' },
        machine: { max_rpm: 10000 },
        cutting: { radial_immersion_ratio: 0.5, up_milling: false },
      });

      const long = chatterStabilityLobeEngine.compute({
        tool: { diameter_mm: 10, flute_count: 4, overhang_mm: 80, material: 'carbide' },
        workpiece: { iso_group: 'P' },
        machine: { max_rpm: 10000 },
        cutting: { radial_immersion_ratio: 0.5, up_milling: false },
      });

      expect(long.value.max_stable_ap_mm).toBeLessThan(short.value.max_stable_ap_mm);
    });
  });

  describe('calculateProcessDamping', () => {
    it('calculates process damping coefficient', () => {
      const result = chatterStabilityLobeEngine.calculateProcessDamping({
        clearanceAngle: 7,
        wearLandLength: 0.05,
        indentationCoeff: 3000,
        cuttingSpeed: 80,
        vibrationFrequency: 1200,
      });

      expect(result.dampingCoeff).toBeGreaterThan(0);
      expect(result.dampingRatioContribution).toBeGreaterThan(0);
    });

    it('shows significant effect at low cutting speeds', () => {
      const lowSpeed = chatterStabilityLobeEngine.calculateProcessDamping({
        clearanceAngle: 7,
        wearLandLength: 0.05,
        indentationCoeff: 3000,
        cuttingSpeed: 50,
        vibrationFrequency: 1200,
      });

      expect(lowSpeed.isSignificant).toBe(true);
      expect(lowSpeed.stabilityIncreaseFactor).toBeGreaterThan(1);
    });

    it('shows minimal effect at high cutting speeds', () => {
      const highSpeed = chatterStabilityLobeEngine.calculateProcessDamping({
        clearanceAngle: 7,
        wearLandLength: 0.05,
        indentationCoeff: 3000,
        cuttingSpeed: 300,
        vibrationFrequency: 1200,
      });

      expect(highSpeed.isSignificant).toBe(false);
      expect(highSpeed.stabilityIncreaseFactor).toBeCloseTo(1, 1);
    });

    it('increases with wear land length', () => {
      const fresh = chatterStabilityLobeEngine.calculateProcessDamping({
        clearanceAngle: 7,
        wearLandLength: 0.02,
        indentationCoeff: 3000,
        cuttingSpeed: 80,
        vibrationFrequency: 1200,
      });

      const worn = chatterStabilityLobeEngine.calculateProcessDamping({
        clearanceAngle: 7,
        wearLandLength: 0.2,
        indentationCoeff: 3000,
        cuttingSpeed: 80,
        vibrationFrequency: 1200,
      });

      expect(worn.dampingCoeff).toBeGreaterThan(fresh.dampingCoeff);
    });

    it('increases with clearance angle', () => {
      const small = chatterStabilityLobeEngine.calculateProcessDamping({
        clearanceAngle: 5,
        wearLandLength: 0.05,
        indentationCoeff: 3000,
        cuttingSpeed: 80,
        vibrationFrequency: 1200,
      });

      const large = chatterStabilityLobeEngine.calculateProcessDamping({
        clearanceAngle: 15,
        wearLandLength: 0.05,
        indentationCoeff: 3000,
        cuttingSpeed: 80,
        vibrationFrequency: 1200,
      });

      expect(large.dampingCoeff).toBeGreaterThan(small.dampingCoeff);
    });

    it('accounts for material-specific indentation coefficient', () => {
      const steel = chatterStabilityLobeEngine.calculateProcessDamping({
        clearanceAngle: 7,
        wearLandLength: 0.05,
        indentationCoeff: 3000,
        cuttingSpeed: 80,
        vibrationFrequency: 1200,
      });

      const aluminum = chatterStabilityLobeEngine.calculateProcessDamping({
        clearanceAngle: 7,
        wearLandLength: 0.05,
        indentationCoeff: 1000,
        cuttingSpeed: 80,
        vibrationFrequency: 1200,
      });

      expect(steel.dampingCoeff).toBeGreaterThan(aluminum.dampingCoeff);
    });

    it('decreases with higher vibration frequency', () => {
      const lowFreq = chatterStabilityLobeEngine.calculateProcessDamping({
        clearanceAngle: 7,
        wearLandLength: 0.05,
        indentationCoeff: 3000,
        cuttingSpeed: 80,
        vibrationFrequency: 500,
      });

      const highFreq = chatterStabilityLobeEngine.calculateProcessDamping({
        clearanceAngle: 7,
        wearLandLength: 0.05,
        indentationCoeff: 3000,
        cuttingSpeed: 80,
        vibrationFrequency: 2000,
      });

      expect(lowFreq.dampingCoeff).toBeGreaterThan(highFreq.dampingCoeff);
    });
  });

  describe('process damping integration', () => {
    it('enhances stability at low cutting speeds', () => {
      const result = chatterStabilityLobeEngine.compute({
        tool: { diameter_mm: 10, flute_count: 4, overhang_mm: 40, material: 'carbide' },
        workpiece: { iso_group: 'P' },
        machine: { max_rpm: 3000 },
        cutting: { radial_immersion_ratio: 0.5, up_milling: false, cutting_speed_mpm: 60 },
        process_damping: { enabled: true },
      });

      expect(result.value.process_damping_analysis).toBeDefined();
      if (result.value.process_damping_analysis?.is_significant) {
        expect(result.value.process_damping_analysis.enhanced_limit_mm).toBeGreaterThan(
          result.value.process_damping_analysis.classical_limit_mm
        );
      }
    });

    it('auto-detects process damping significance', () => {
      const lowSpeed = chatterStabilityLobeEngine.compute({
        tool: { diameter_mm: 10, flute_count: 4, overhang_mm: 40, material: 'carbide' },
        workpiece: { iso_group: 'P' },
        machine: { max_rpm: 2000 },
        cutting: { radial_immersion_ratio: 0.5, up_milling: false },
      });

      if (lowSpeed.value.process_damping_analysis) {
        expect(lowSpeed.value.process_damping_analysis.threshold_speed_mpm).toBe(150);
      }
    });
  });
});
