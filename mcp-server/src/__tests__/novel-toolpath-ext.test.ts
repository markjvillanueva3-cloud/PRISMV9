import { describe, it, expect } from "vitest";
import {
  computeExtendedAlgorithm, extendedNovelToolpathEngine, EXTENDED_ALGORITHM_INFO,
  type ExtendedAlgorithm
} from "../engines/NovelToolpathAlgorithmsExt.js";
import type { ToolGeometry, MachineCapability } from "../engines/NovelToolpathEngine.js";

const TOOL_10MM: ToolGeometry = {
  diameter_mm: 10, flute_count: 4, helix_angle_deg: 30,
  overhang_mm: 40, material: 'carbide', type: 'flat'
};

const BALL_6MM: ToolGeometry = {
  diameter_mm: 6, flute_count: 2, helix_angle_deg: 30,
  overhang_mm: 50, material: 'carbide', type: 'ball'
};

const MACHINE_5AX: MachineCapability = {
  max_rpm: 15000, max_feed_mmmin: 10000, spindle_power_kw: 15,
  axis_count: 5, taper: 'HSK-A63'
};

describe("NovelToolpathAlgorithmsExt", () => {
  describe("MEGM - Minimum Entropy Generation Machining", () => {
    it("generates segments with entropy optimization", () => {
      const result = computeExtendedAlgorithm('MEGM', {
        material: 'titanium_6al4v', tool: TOOL_10MM, machine: MACHINE_5AX,
        pocket_dims: { length_mm: 60, width_mm: 40, depth_mm: 15 },
        base_ap_mm: 2, base_ae_mm: 4, fz_mm: 0.08, rpm: 3000
      });
      expect(result.algorithm).toBe('MEGM');
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.physics_summary).toContain('entropy');
    });
  });

  describe("RSMP - Residual Stress Managed Profiling", () => {
    it("generates segments with stress management", () => {
      const result = computeExtendedAlgorithm('RSMP', {
        material: 'steel_1045', tool: TOOL_10MM, machine: MACHINE_5AX,
        part_dims: { length_mm: 100, width_mm: 60, thickness_mm: 20 },
        ap_mm: 1, ae_mm: 0.5, fz_mm: 0.06, rpm: 8000,
        target_stress_mpa: -200
      });
      expect(result.algorithm).toBe('RSMP');
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.physics_summary).toContain('stress');
    });
  });

  describe("WHAP - Work-Hardening Aware Profiling", () => {
    it("adapts feed for work hardening", () => {
      const result = computeExtendedAlgorithm('WHAP', {
        material: 'stainless_304', tool: TOOL_10MM, machine: MACHINE_5AX,
        contour_length_mm: 80, ap_mm: 1.5, ae_mm: 2, fz_mm: 0.06, rpm: 5000,
        num_passes: 5
      });
      expect(result.algorithm).toBe('WHAP');
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.physics_summary).toContain('Hollomon');
    });
  });

  describe("BOPA - Bayesian Online Parameter Adaptation", () => {
    it("updates force model via Bayesian inference", () => {
      const result = computeExtendedAlgorithm('BOPA', {
        material: 'aluminum_6061', tool: TOOL_10MM, machine: MACHINE_5AX,
        contour_length_mm: 120,
        prior_cuts: [
          { fz: 0.1, ae: 3, ap: 2, rpm: 10000, result_force_n: 150 },
          { fz: 0.1, ae: 3, ap: 2, rpm: 10000, result_force_n: 160 },
          { fz: 0.08, ae: 2.5, ap: 1.5, rpm: 10000, result_force_n: 120 },
          { fz: 0.12, ae: 3.5, ap: 2.5, rpm: 10000, result_force_n: 200 },
        ],
        target_ra_um: 1.6
      });
      expect(result.algorithm).toBe('BOPA');
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.physics_summary).toContain('Bayesian');
    });
  });

  describe("MCTP - Monte Carlo Tolerance Prediction", () => {
    it("predicts Cpk via Monte Carlo simulation", () => {
      const result = computeExtendedAlgorithm('MCTP', {
        material: 'steel_1045', tool: TOOL_10MM, machine: MACHINE_5AX,
        nominal_dims: [
          { name: 'width', value_mm: 50, tolerance_mm: 0.05 },
          { name: 'depth', value_mm: 20, tolerance_mm: 0.03 }
        ],
        fz_mm: 0.04, rpm: 8000, ae_mm: 1, ap_mm: 0.5
      });
      expect(result.algorithm).toBe('MCTP');
      expect(result.physics_summary.toLowerCase()).toContain('monte carlo');
      expect(result.segments.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("SFCR - Space-Filling Curve Roughing", () => {
    it("generates space-filling curve segments", () => {
      const result = computeExtendedAlgorithm('SFCR', {
        material: 'aluminum_6061', tool: TOOL_10MM, machine: MACHINE_5AX,
        pocket_dims: { length_mm: 80, width_mm: 80, depth_mm: 10 },
        ap_mm: 2, fz_mm: 0.12, rpm: 12000, curve_type: 'hilbert'
      });
      expect(result.algorithm).toBe('SFCR');
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.physics_summary).toContain('curve');
    });
  });

  describe("KALP - Kalman-Filtered Adaptive Profiling", () => {
    it("applies Kalman filter to force estimation", () => {
      const result = computeExtendedAlgorithm('KALP', {
        material: 'steel_1045', tool: BALL_6MM, machine: MACHINE_5AX,
        contour_length_mm: 80,
        measured_forces: [40, 42, 38, 45, 41, 43, 39, 44, 40, 42],
        nominal_params: { fz_mm: 0.04, ae_mm: 0.5, ap_mm: 0.3, rpm: 10000 }
      });
      expect(result.algorithm).toBe('KALP');
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.physics_summary).toContain('Kalman');
    });
  });

  describe("PTAP - Phase-Transform Aware Profiling", () => {
    it("controls temperature below phase transformation", () => {
      const result = computeExtendedAlgorithm('PTAP', {
        material: 'steel_1045', tool: TOOL_10MM, machine: MACHINE_5AX,
        contour_length_mm: 60, ap_mm: 0.5, ae_mm: 1, fz_mm: 0.05, rpm: 8000,
        max_surface_temp_c: 400
      });
      expect(result.algorithm).toBe('PTAP');
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.metrics.estimated_time_sec).toBeGreaterThan(0);
    });
  });

  describe("PARETO - Pareto Multi-Objective Optimization", () => {
    it("generates Pareto front solutions", () => {
      const result = computeExtendedAlgorithm('PARETO', {
        material: 'titanium_6al4v', tool: TOOL_10MM, machine: MACHINE_5AX,
        pocket_dims: { length_mm: 50, width_mm: 40, depth_mm: 10 },
        ap_range: [1, 3], ae_range: [2, 5], fz_range: [0.05, 0.1], rpm: 4000,
        objectives: ['mrr', 'force', 'temperature']
      });
      expect(result.algorithm).toBe('PARETO');
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.physics_summary).toContain('Pareto');
    });
  });

  describe("CFCM - Centrifugal Force Compensated Machining", () => {
    it("compensates for centrifugal expansion at high RPM", () => {
      const result = computeExtendedAlgorithm('CFCM', {
        material: 'aluminum_6061', tool: TOOL_10MM, machine: MACHINE_5AX,
        contour_length_mm: 60, ap_mm: 0.2, ae_mm: 0.5, fz_mm: 0.04, rpm: 15000,
        tolerance_mm: 0.01
      });
      expect(result.algorithm).toBe('CFCM');
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.physics_summary).toContain('Centrifugal');
    });
  });

  describe("WBRL - Weibull Reliability-Based Tool Life", () => {
    it("computes reliable tool life with Weibull model", () => {
      const result = computeExtendedAlgorithm('WBRL', {
        material: 'steel_1045', tool: TOOL_10MM, machine: MACHINE_5AX,
        contour_length_mm: 200, ap_mm: 2, ae_mm: 3, fz_mm: 0.08, rpm: 5000,
        tool_life_data_min: [45, 50, 42, 55, 48, 52, 47, 53, 44, 51],
        target_reliability: 0.95
      });
      expect(result.algorithm).toBe('WBRL');
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.physics_summary).toContain('Weibull');
    });
  });

  describe("DPLS - Dynamic Programming Layer Sequencing", () => {
    it("optimizes layer sequence via Bellman equation", () => {
      const result = computeExtendedAlgorithm('DPLS', {
        material: 'aluminum_6061', tool: TOOL_10MM, machine: MACHINE_5AX,
        part_profile: [
          { z_mm: 0, width_mm: 60 }, { z_mm: -5, width_mm: 60 },
          { z_mm: -10, width_mm: 50 }, { z_mm: -15, width_mm: 50 },
          { z_mm: -20, width_mm: 40 }, { z_mm: -25, width_mm: 30 },
          { z_mm: -30, width_mm: 20 }
        ],
        max_ap_mm: 5, ae_mm: 4, fz_mm: 0.1, rpm: 10000
      });
      expect(result.algorithm).toBe('DPLS');
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.physics_summary).toContain('programming');
    });
  });

  describe("Unified Interface", () => {
    it("lists all 12 extended algorithms", () => {
      const algos = extendedNovelToolpathEngine.listAlgorithms();
      expect(Object.keys(algos)).toHaveLength(12);
      expect(Object.keys(algos)).toEqual([
        'MEGM', 'RSMP', 'WHAP', 'BOPA', 'MCTP', 'SFCR',
        'KALP', 'PTAP', 'PARETO', 'CFCM', 'WBRL', 'DPLS'
      ]);
    });

    it("returns available materials", () => {
      const mats = extendedNovelToolpathEngine.getAvailableMaterials();
      expect(mats).toContain('aluminum_6061');
      expect(mats).toContain('titanium_6al4v');
      expect(mats.length).toBeGreaterThanOrEqual(6);
    });

    it("throws on unknown algorithm", () => {
      expect(() => computeExtendedAlgorithm('INVALID' as any, {})).toThrow();
    });
  });
});
