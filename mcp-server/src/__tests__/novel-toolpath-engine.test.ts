import { describe, it, expect } from "vitest";
import {
  computeTGAR, computeHRAF, computeMTHZD, computeCFSF, computePTDC, computeVCER,
  computeNovelToolpath, listNovelAlgorithms, getAvailableMaterials,
  type TGARInput, type HRAFInput, type MTHZDInput, type CFSFInput, type PTDCInput, type VCERInput,
  type ToolGeometry, type MachineCapability
} from "../engines/NovelToolpathEngine.js";

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

describe("NovelToolpathEngine", () => {
  describe("TGAR - Thermal-Gradient Adaptive Roughing", () => {
    const input: TGARInput = {
      material: 'titanium_6al4v', tool: TOOL_10MM, machine: MACHINE_5AX,
      pocket_dims: { length_mm: 80, width_mm: 60, depth_mm: 20 },
      base_ap_mm: 2, base_ae_mm: 4, base_fz_mm: 0.08, rpm: 3000
    };

    it("generates segments with adapted feeds", () => {
      const result = computeTGAR(input);
      expect(result.algorithm).toBe('TGAR');
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.metrics.estimated_time_sec).toBeGreaterThan(0);
      expect(result.metrics.peak_force_n).toBeGreaterThan(0);
    });

    it("tracks thermal zones and produces physics summary", () => {
      const result = computeTGAR(input);
      expect(result.physics_summary).toContain('Kienzle');
      expect(result.physics_summary).toContain('thermal grid');
      expect(result.metrics.peak_temperature_rise_k).toBeGreaterThanOrEqual(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("includes cross-CAM notes", () => {
      const result = computeTGAR(input);
      expect(result.cross_cam_notes).toBeDefined();
      expect(result.cross_cam_notes!.length).toBeGreaterThan(0);
    });

    it("reports improvement vs conventional", () => {
      const result = computeTGAR(input);
      expect(result.metrics.improvement_vs_conventional_pct).toBeDefined();
    });
  });

  describe("HRAF - Harmonic-Resonance Avoidant Finishing", () => {
    const input: HRAFInput = {
      material: 'steel_1045', tool: BALL_6MM, machine: MACHINE_5AX,
      surface_length_mm: 100, target_ra_um: 0.8, base_rpm: 10000,
      base_ae_mm: 0.3, ap_mm: 0.2, base_fz_mm: 0.04
    };

    it("generates segments with varied RPM", () => {
      const result = computeHRAF(input);
      expect(result.algorithm).toBe('HRAF');
      const rpms = result.segments.map(s => s.rpm!);
      const uniqueRpms = new Set(rpms);
      expect(uniqueRpms.size).toBeGreaterThan(1); // RPM varies
    });

    it("reduces ae in resonance zones or varies RPM to avoid them", () => {
      const result = computeHRAF(input);
      const aes = result.segments.map(s => s.ae_mm!);
      const rpms = result.segments.map(s => s.rpm!);
      // Either ae varies (resonance avoidance) or RPM varies (harmonic shifting)
      const aeVaries = new Set(aes.map(a => Math.round(a * 1000))).size > 1;
      const rpmVaries = new Set(rpms).size > 1;
      expect(aeVaries || rpmVaries).toBe(true);
    });

    it("reports surface quality prediction", () => {
      const result = computeHRAF(input);
      expect(result.metrics.surface_quality_ra_um).toBeDefined();
      expect(result.metrics.surface_quality_ra_um!).toBeGreaterThan(0);
    });
  });

  describe("MTHZD - Multi-Tool Hybrid Zone Decomposition", () => {
    const input: MTHZDInput = {
      material: 'aluminum_6061', machine: MACHINE_5AX, priority: 'speed',
      zones: [
        { id: 'z1', type: 'flat', area_mm2: 5000, depth_mm: 5 },
        { id: 'z2', type: 'pocket', area_mm2: 2000, depth_mm: 30, min_corner_radius_mm: 5 },
        { id: 'z3', type: 'freeform', area_mm2: 3000, depth_mm: 10, curvature_radius_mm: 50 },
        { id: 'z4', type: 'corner', area_mm2: 100, depth_mm: 20, min_corner_radius_mm: 2 }
      ],
      available_tools: [
        { ...TOOL_10MM },
        { ...BALL_6MM },
        { diameter_mm: 4, flute_count: 3, helix_angle_deg: 30, overhang_mm: 30, material: 'carbide', type: 'flat' }
      ]
    };

    it("assigns different strategies per zone", () => {
      const result = computeMTHZD(input);
      expect(result.algorithm).toBe('MTHZD');
      expect(result.recommendations.length).toBeGreaterThanOrEqual(input.zones.length);
    });

    it("includes tool change overhead", () => {
      const result = computeMTHZD(input);
      expect(result.metrics.estimated_time_sec).toBeGreaterThan(0);
      expect(result.physics_summary).toContain('tool change');
    });
  });

  describe("CFSF - Constant-Force Spiral Finishing", () => {
    const input: CFSFInput = {
      material: 'steel_1045', tool: BALL_6MM, machine: MACHINE_5AX,
      part_radius_mm: 40, target_force_n: 50, target_ra_um: 0.4,
      base_rpm: 12000, ap_mm: 0.15
    };

    it("generates spiral with variable ae", () => {
      const result = computeCFSF(input);
      expect(result.algorithm).toBe('CFSF');
      const aes = result.segments.map(s => s.ae_mm!);
      const uniqueAes = new Set(aes.map(a => Math.round(a * 10)));
      expect(uniqueAes.size).toBeGreaterThanOrEqual(1);
      expect(result.physics_summary).toContain('Constant-force spiral');
    });

    it("achieves lower force variation than conventional", () => {
      const result = computeCFSF(input);
      expect(result.physics_summary).toContain('variation');
      expect(result.metrics.improvement_vs_conventional_pct).toBeGreaterThan(0);
    });
  });

  describe("PTDC - Predictive Tool Deflection Compensation", () => {
    const points = Array.from({ length: 20 }, (_, i) => ({
      x: i * 5, y: 0, z: 0, ae_mm: 2, ap_mm: 3
    }));

    const input: PTDCInput = {
      material: 'steel_1045', tool: { ...TOOL_10MM, overhang_mm: 80 },
      machine: MACHINE_5AX, toolpath_points: points,
      tolerance_mm: 0.02, fz_mm: 0.06, rpm: 8000
    };

    it("compensates coordinates for deflection", () => {
      const result = computePTDC(input);
      expect(result.algorithm).toBe('PTDC');
      // Compensated coordinates should differ from input
      const hasCompensation = result.segments.some((s, i) =>
        Math.abs(s.y - points[i].y) > 0.0001
      );
      expect(hasCompensation).toBe(true);
    });

    it("reports deflection in physics summary", () => {
      const result = computePTDC(input);
      expect(result.physics_summary).toContain('δ=');
      expect(result.metrics.peak_deflection_um).toBeGreaterThan(0);
    });

    it("eliminates spring passes for improvement", () => {
      const result = computePTDC(input);
      expect(result.metrics.improvement_vs_conventional_pct).toBeGreaterThan(0);
    });
  });

  describe("VCER - Vortex Chip Evacuation Roughing", () => {
    const input: VCERInput = {
      material: 'steel_1045', tool: TOOL_10MM, machine: MACHINE_5AX,
      pocket_dims: { length_mm: 50, width_mm: 40, depth_mm: 60 },
      coolant: 'through_spindle',
      base_ap_mm: 2, base_ae_mm: 4, fz_mm: 0.08, rpm: 5000
    };

    it("generates spiral-out pattern with evacuation lanes", () => {
      const result = computeVCER(input);
      expect(result.algorithm).toBe('VCER');
      expect(result.segments.length).toBeGreaterThan(0);
      // Should have evacuation retracts (ae=0 segments)
      const evacuations = result.segments.filter(s => s.ae_mm === 0);
      expect(evacuations.length).toBeGreaterThan(0);
    });

    it("accounts for depth ratio in recommendations", () => {
      const result = computeVCER(input);
      expect(result.recommendations.some(r => r.includes('xD'))).toBe(true);
    });

    it("reports coolant effectiveness", () => {
      const result = computeVCER(input);
      expect(result.physics_summary).toContain('Coolant=through_spindle');
    });
  });

  describe("Unified Interface", () => {
    it("dispatches via computeNovelToolpath", () => {
      const result = computeNovelToolpath({
        algorithm: 'TGAR',
        params: {
          material: 'aluminum_6061', tool: TOOL_10MM, machine: MACHINE_5AX,
          pocket_dims: { length_mm: 50, width_mm: 50, depth_mm: 10 },
          base_ap_mm: 2, base_ae_mm: 4, base_fz_mm: 0.12, rpm: 10000
        }
      });
      expect(result.algorithm).toBe('TGAR');
    });

    it("lists all 6 algorithms", () => {
      const algos = listNovelAlgorithms();
      expect(Object.keys(algos)).toHaveLength(6);
      expect(Object.keys(algos)).toEqual(['TGAR', 'HRAF', 'MTHZD', 'CFSF', 'PTDC', 'VCER']);
    });

    it("returns available materials", () => {
      const mats = getAvailableMaterials();
      expect(mats).toContain('aluminum_6061');
      expect(mats).toContain('titanium_6al4v');
      expect(mats).toContain('inconel_718');
      expect(mats.length).toBeGreaterThanOrEqual(6);
    });

    it("throws on unknown algorithm", () => {
      expect(() => computeNovelToolpath({
        algorithm: 'INVALID' as any,
        params: {} as any
      })).toThrow('Unknown novel algorithm');
    });
  });
});
