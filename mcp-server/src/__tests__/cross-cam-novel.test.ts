import { describe, it, expect } from "vitest";
import {
  computeCrossCamNovel, crossCamNovelEngine, CROSS_CAM_NOVEL_INFO,
  type CrossCamNovelAlgorithm
} from "../engines/CrossCamNovelAlgorithms.js";
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

describe("CrossCamNovelAlgorithms", () => {
  describe("AMEF - Adaptive Morphed Engagement Finishing", () => {
    it("generates morphed spiral finishing segments", () => {
      const result = computeCrossCamNovel('AMEF', {
        material: 'steel_1045', tool: BALL_6MM, machine: MACHINE_5AX,
        surface_dims: { length_mm: 80, width_mm: 60 },
        target_ra_um: 0.4, ap_mm: 0.15, fz_mm: 0.04, rpm: 12000
      });
      expect(result.algorithm).toBe('AMEF');
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.cross_cam_notes).toBeDefined();
      expect(result.cross_cam_notes!.length).toBeGreaterThan(0);
    });
  });

  describe("VCMR - Volumetric Constant-MRR Roughing", () => {
    it("maintains constant MRR across segments", () => {
      const result = computeCrossCamNovel('VCMR', {
        material: 'titanium_6al4v', tool: TOOL_10MM, machine: MACHINE_5AX,
        pocket_dims: { length_mm: 60, width_mm: 50, depth_mm: 20 },
        fz_mm: 0.06, rpm: 3000,
        target_mrr_cm3min: 10, max_engagement_pct: 40
      });
      expect(result.algorithm).toBe('VCMR');
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.cross_cam_notes!.some(n => n.includes('Fusion360') || n.includes('GibbsCAM') || n.includes('Mastercam'))).toBe(true);
    });
  });

  describe("SNWF - Streamline-Normalized Waveform Finishing", () => {
    it("generates streamline-based finishing", () => {
      const result = computeCrossCamNovel('SNWF', {
        material: 'aluminum_6061', tool: BALL_6MM, machine: MACHINE_5AX,
        surface_length_mm: 100, surface_width_mm: 80,
        target_ra_um: 0.8, ap_mm: 0.2, fz_mm: 0.05, rpm: 15000,
        curvature_radius_mm: 200
      });
      expect(result.algorithm).toBe('SNWF');
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.metrics.estimated_time_sec).toBeGreaterThan(0);
    });
  });

  describe("EAPR - Engagement-Aware Plunge Roughing", () => {
    it("generates plunge-dominant roughing segments", () => {
      const result = computeCrossCamNovel('EAPR', {
        material: 'titanium_6al4v', tool: TOOL_10MM, machine: MACHINE_5AX,
        pocket_dims: { length_mm: 40, width_mm: 30, depth_mm: 50 },
        max_engagement_deg: 90, ap_mm: 2, fz_mm: 0.05, rpm: 2000
      });
      expect(result.algorithm).toBe('EAPR');
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("HBCF - Hybrid Barrel-Conical Finishing", () => {
    it("auto-selects barrel vs ball based on wall angle", () => {
      const result = computeCrossCamNovel('HBCF', {
        material: 'steel_1045', tool: { ...BALL_6MM, barrel_radius_mm: 250 },
        machine: MACHINE_5AX,
        wall_height_mm: 60, wall_angle_deg: 3,
        surface_length_mm: 100, target_ra_um: 0.8,
        fz_mm: 0.04, rpm: 10000
      });
      expect(result.algorithm).toBe('HBCF');
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.cross_cam_notes!.some(n => n.includes('hyperMILL') || n.includes('barrel'))).toBe(true);
    });
  });

  describe("MACS - Multi-Axis Coordinated Swarf", () => {
    it("generates swarf cutting segments", () => {
      const result = computeCrossCamNovel('MACS', {
        material: 'aluminum_6061', tool: TOOL_10MM, machine: MACHINE_5AX,
        part_zones: [
          { id: 'z1', type: 'steep', area_mm2: 3000, max_angle_deg: 85 },
          { id: 'z2', type: 'shallow', area_mm2: 2000, max_angle_deg: 15 },
          { id: 'z3', type: 'freeform', area_mm2: 1500, max_angle_deg: 45 }
        ],
        fz_mm: 0.08, rpm: 10000
      });
      expect(result.algorithm).toBe('MACS');
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.metrics.estimated_time_sec).toBeGreaterThan(0);
    });
  });

  describe("Unified Interface", () => {
    it("lists all 6 cross-CAM algorithms", () => {
      const algos = crossCamNovelEngine.listAlgorithms();
      expect(Object.keys(algos)).toHaveLength(6);
      expect(Object.keys(algos)).toEqual(['AMEF', 'VCMR', 'SNWF', 'EAPR', 'HBCF', 'MACS']);
    });

    it("returns available materials", () => {
      const mats = crossCamNovelEngine.getAvailableMaterials();
      expect(mats).toContain('aluminum_6061');
      expect(mats).toContain('titanium_6al4v');
      expect(mats.length).toBeGreaterThanOrEqual(6);
    });

    it("throws on unknown algorithm", () => {
      expect(() => computeCrossCamNovel('INVALID' as any, {})).toThrow();
    });
  });
});
