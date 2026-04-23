/**
 * EDMWireSlugCornerTaperEngine — Corner Classification & Slug Drop Prediction Tests
 *
 * MS-P3-TIER6A/U-P3-T6A-01
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  EDMWireSlugCornerTaperEngine,
  edmWireSlugCornerTaperEngine,
  CornerTaperInput,
  CornerPoint,
  SlugGeometry,
  CornerType,
  SlugDropClass,
} from "../engines/EDMWireSlugCornerTaperEngine.js";

describe("EDMWireSlugCornerTaperEngine", () => {
  let engine: EDMWireSlugCornerTaperEngine;

  beforeEach(() => {
    engine = new EDMWireSlugCornerTaperEngine();
  });

  describe("singleton export", () => {
    it("exports singleton instance", () => {
      expect(edmWireSlugCornerTaperEngine).toBeInstanceOf(EDMWireSlugCornerTaperEngine);
      expect(edmWireSlugCornerTaperEngine.name).toBe("EDMWireSlugCornerTaperEngine");
      expect(edmWireSlugCornerTaperEngine.version).toBe("1.0.0");
    });
  });

  describe("computeMinRadius", () => {
    it("computes minimum corner radius for standard wire", () => {
      const minR = engine.computeMinRadius(0.25, 0.025);
      // R_min = 0.25/2 + 0.025 + 0.02 = 0.125 + 0.025 + 0.02 = 0.17
      expect(minR).toBeCloseTo(0.17, 3);
    });

    it("computes minimum radius for thin wire", () => {
      const minR = engine.computeMinRadius(0.10, 0.015);
      // R_min = 0.10/2 + 0.015 + 0.02 = 0.05 + 0.015 + 0.02 = 0.085
      expect(minR).toBeCloseTo(0.085, 3);
    });

    it("computes minimum radius for thick wire", () => {
      const minR = engine.computeMinRadius(0.30, 0.030);
      // R_min = 0.30/2 + 0.030 + 0.02 = 0.15 + 0.030 + 0.02 = 0.2
      expect(minR).toBeCloseTo(0.2, 3);
    });
  });

  describe("classifyCorner", () => {
    it("classifies sharp corner (zero radius)", () => {
      const corner: CornerPoint = { x: 0, y: 0, angle_deg: 90, radius_mm: 0, is_internal: true };
      expect(engine.classifyCorner(corner)).toBe("sharp");
    });

    it("classifies fillet corner (positive radius)", () => {
      const corner: CornerPoint = { x: 0, y: 0, angle_deg: 90, radius_mm: 0.5, is_internal: true };
      expect(engine.classifyCorner(corner)).toBe("fillet");
    });

    it("classifies tangent corner (nearly straight)", () => {
      const corner: CornerPoint = { x: 0, y: 0, angle_deg: 175, radius_mm: 0, is_internal: true };
      expect(engine.classifyCorner(corner)).toBe("tangent");
    });

    it("classifies sharp corner at boundary angle", () => {
      const corner: CornerPoint = { x: 0, y: 0, angle_deg: 170, radius_mm: 0, is_internal: true };
      expect(engine.classifyCorner(corner)).toBe("sharp");
    });

    it("treats negligible radius as sharp", () => {
      const corner: CornerPoint = { x: 0, y: 0, angle_deg: 90, radius_mm: 0.005, is_internal: true };
      expect(engine.classifyCorner(corner)).toBe("sharp");
    });
  });

  describe("recommendStrategy", () => {
    it("returns standard for external corners", () => {
      const corner: CornerPoint = { x: 0, y: 0, angle_deg: 90, radius_mm: 0, is_internal: false };
      expect(engine.recommendStrategy(corner, true, false)).toBe("standard");
    });

    it("returns taper_relief for inadequate acute internal corner", () => {
      const corner: CornerPoint = { x: 0, y: 0, angle_deg: 45, radius_mm: 0, is_internal: true };
      expect(engine.recommendStrategy(corner, false, true)).toBe("taper_relief");
    });

    it("returns corner_round for inadequate obtuse internal corner", () => {
      const corner: CornerPoint = { x: 0, y: 0, angle_deg: 80, radius_mm: 0, is_internal: true };
      expect(engine.recommendStrategy(corner, false, true)).toBe("corner_round");
    });

    it("returns dwell for adequate very acute corner", () => {
      const corner: CornerPoint = { x: 0, y: 0, angle_deg: 30, radius_mm: 0.3, is_internal: true };
      expect(engine.recommendStrategy(corner, true, true)).toBe("dwell");
    });

    it("returns lead_out for adequate moderately acute corner", () => {
      const corner: CornerPoint = { x: 0, y: 0, angle_deg: 60, radius_mm: 0.3, is_internal: true };
      expect(engine.recommendStrategy(corner, true, true)).toBe("lead_out");
    });

    it("returns standard for adequate right angle internal corner", () => {
      const corner: CornerPoint = { x: 0, y: 0, angle_deg: 90, radius_mm: 0.3, is_internal: true };
      expect(engine.recommendStrategy(corner, true, true)).toBe("standard");
    });
  });

  describe("computeWireBow", () => {
    it("computes zero bow for straight path (180°)", () => {
      const bow = engine.computeWireBow(180, 12, 0.025);
      expect(bow).toBeCloseTo(0, 2);
    });

    it("computes positive bow for right angle", () => {
      const bow = engine.computeWireBow(90, 12, 0.025);
      expect(bow).toBeGreaterThan(0);
    });

    it("computes larger bow for acute angle", () => {
      const bow90 = engine.computeWireBow(90, 12, 0.025);
      const bow45 = engine.computeWireBow(45, 12, 0.025);
      expect(bow45).toBeGreaterThan(bow90);
    });
  });

  describe("computeTaperRelief", () => {
    it("returns zero for right angle or obtuse", () => {
      expect(engine.computeTaperRelief(90)).toBe(0);
      expect(engine.computeTaperRelief(120)).toBe(0);
    });

    it("returns positive relief for acute angle", () => {
      const relief = engine.computeTaperRelief(60);
      // (90 - 60) * 0.5 = 15
      expect(relief).toBeCloseTo(15, 1);
    });

    it("caps relief at max taper spec", () => {
      const relief = engine.computeTaperRelief(10);
      // Would be (90 - 10) * 0.5 = 40, but capped
      expect(relief).toBeLessThanOrEqual(30);
    });
  });

  describe("analyze — happy path", () => {
    const makeSquareSlug = (): SlugGeometry => ({
      area_mm2: 100,
      perimeter_mm: 40,
      min_internal_angle_deg: 90,
      max_internal_angle_deg: 90,
      internal_corner_count: 4,
      has_undercut: false,
      corners: [
        { x: 0, y: 0, angle_deg: 90, radius_mm: 0.2, is_internal: true },
        { x: 10, y: 0, angle_deg: 90, radius_mm: 0.2, is_internal: true },
        { x: 10, y: 10, angle_deg: 90, radius_mm: 0.2, is_internal: true },
        { x: 0, y: 10, angle_deg: 90, radius_mm: 0.2, is_internal: true },
      ],
    });

    it("analyzes square slug with adequate corners", () => {
      const input: CornerTaperInput = {
        thickness_mm: 10,
        slug: makeSquareSlug(),
      };

      const result = engine.analyze(input);

      expect(result.success).toBe(true);
      expect(result.corners).toHaveLength(4);
      expect(result.all_corners_adequate).toBe(true);
      expect(result.total_warnings).toHaveLength(0);
    });

    it("computes slug drop prediction for clean drop", () => {
      // Need heavy slug for clean_drop: weight > 0.5N and compactness > 0.7
      // 50x50mm square, 50mm thick steel: vol = 125000mm³, mass ≈ 0.98kg, weight ≈ 9.6N
      const input: CornerTaperInput = {
        thickness_mm: 50,
        slug: {
          area_mm2: 2500,
          perimeter_mm: 200,
          min_internal_angle_deg: 90,
          max_internal_angle_deg: 90,
          internal_corner_count: 4,
          has_undercut: false,
          corners: [
            { x: 0, y: 0, angle_deg: 90, radius_mm: 0.3, is_internal: true },
            { x: 50, y: 0, angle_deg: 90, radius_mm: 0.3, is_internal: true },
            { x: 50, y: 50, angle_deg: 90, radius_mm: 0.3, is_internal: true },
            { x: 0, y: 50, angle_deg: 90, radius_mm: 0.3, is_internal: true },
          ],
        },
      };

      const result = engine.analyze(input);

      expect(result.slug_prediction.slug_class).toBe("clean_drop");
      expect(result.slug_prediction.drop_probability).toBeGreaterThan(0.9);
      expect(result.slug_prediction.confidence).toBeGreaterThan(0.8);
    });

    it("includes aspect ratio and compactness metrics", () => {
      const input: CornerTaperInput = {
        thickness_mm: 10,
        slug: makeSquareSlug(),
      };

      const result = engine.analyze(input);

      expect(result.slug_prediction.aspect_ratio).toBeGreaterThan(0);
      expect(result.slug_prediction.compactness).toBeGreaterThan(0);
      expect(result.slug_prediction.compactness).toBeLessThanOrEqual(1);
    });
  });

  describe("analyze — slug drop classifications", () => {
    it("classifies retained when tabs present", () => {
      const input: CornerTaperInput = {
        thickness_mm: 10,
        tab_count: 2,
        tab_width_mm: 0.5,
        slug: {
          area_mm2: 100,
          perimeter_mm: 40,
          min_internal_angle_deg: 90,
          max_internal_angle_deg: 90,
          internal_corner_count: 4,
          has_undercut: false,
          corners: [
            { x: 0, y: 0, angle_deg: 90, radius_mm: 0.2, is_internal: true },
          ],
        },
      };

      const result = engine.analyze(input);

      expect(result.slug_prediction.slug_class).toBe("retained");
      expect(result.slug_prediction.drop_probability).toBe(0);
      expect(result.slug_prediction.confidence).toBe(1);
    });

    it("classifies wedge when undercut present", () => {
      const input: CornerTaperInput = {
        thickness_mm: 10,
        slug: {
          area_mm2: 100,
          perimeter_mm: 40,
          min_internal_angle_deg: 25,
          max_internal_angle_deg: 90,
          internal_corner_count: 4,
          has_undercut: true,
          corners: [
            { x: 0, y: 0, angle_deg: 25, radius_mm: 0, is_internal: true },
          ],
        },
      };

      const result = engine.analyze(input);

      expect(result.slug_prediction.slug_class).toBe("wedge");
      expect(result.slug_prediction.hook_risk).toBe(true);
    });

    it("classifies stick for lightweight slug", () => {
      const input: CornerTaperInput = {
        thickness_mm: 0.5,
        slug: {
          area_mm2: 1,
          perimeter_mm: 4,
          min_internal_angle_deg: 90,
          max_internal_angle_deg: 90,
          internal_corner_count: 4,
          has_undercut: false,
          corners: [
            { x: 0, y: 0, angle_deg: 90, radius_mm: 0.1, is_internal: true },
          ],
        },
      };

      const result = engine.analyze(input);

      expect(result.slug_prediction.slug_class).toBe("stick");
      expect(result.slug_prediction.estimated_weight_N).toBeLessThan(0.01);
    });

    it("classifies stick for elongated slug", () => {
      const input: CornerTaperInput = {
        thickness_mm: 10,
        slug: {
          area_mm2: 100,
          perimeter_mm: 200,
          min_internal_angle_deg: 90,
          max_internal_angle_deg: 90,
          internal_corner_count: 4,
          has_undercut: false,
          corners: [
            { x: 0, y: 0, angle_deg: 90, radius_mm: 0.2, is_internal: true },
          ],
        },
      };

      const result = engine.analyze(input);

      expect(result.slug_prediction.slug_class).toBe("stick");
      expect(result.slug_prediction.aspect_ratio).toBeGreaterThan(4);
    });
  });

  describe("analyze — corner inadequacy detection", () => {
    it("flags sharp internal corners below minimum radius", () => {
      const input: CornerTaperInput = {
        thickness_mm: 10,
        slug: {
          area_mm2: 100,
          perimeter_mm: 40,
          min_internal_angle_deg: 90,
          max_internal_angle_deg: 90,
          internal_corner_count: 2,
          has_undercut: false,
          corners: [
            { x: 0, y: 0, angle_deg: 90, radius_mm: 0, is_internal: true },
            { x: 10, y: 0, angle_deg: 90, radius_mm: 0.3, is_internal: true },
          ],
        },
      };

      const result = engine.analyze(input);

      expect(result.all_corners_adequate).toBe(false);
      expect(result.corners[0].radius_adequate).toBe(false);
      expect(result.corners[1].radius_adequate).toBe(true);
      expect(result.total_warnings.some(w => w.includes("corner(s) below minimum radius"))).toBe(true);
    });

    it("warns on acute internal corners", () => {
      const input: CornerTaperInput = {
        thickness_mm: 10,
        slug: {
          area_mm2: 100,
          perimeter_mm: 40,
          min_internal_angle_deg: 30,
          max_internal_angle_deg: 90,
          internal_corner_count: 2,
          has_undercut: false,
          corners: [
            { x: 0, y: 0, angle_deg: 30, radius_mm: 0.3, is_internal: true },
          ],
        },
      };

      const result = engine.analyze(input);

      expect(result.corners[0].warnings.some(w => w.includes("acute"))).toBe(true);
      expect(result.corners[0].taper_relief_deg).toBeGreaterThan(0);
    });

    it("external corners always adequate regardless of radius", () => {
      const input: CornerTaperInput = {
        thickness_mm: 10,
        slug: {
          area_mm2: 100,
          perimeter_mm: 40,
          min_internal_angle_deg: 90,
          max_internal_angle_deg: 90,
          internal_corner_count: 0,
          has_undercut: false,
          corners: [
            { x: 0, y: 0, angle_deg: 90, radius_mm: 0, is_internal: false },
          ],
        },
      };

      const result = engine.analyze(input);

      expect(result.corners[0].radius_adequate).toBe(true);
    });
  });

  describe("analyze — wire parameters", () => {
    it("uses custom wire diameter", () => {
      const input: CornerTaperInput = {
        wire_diameter_mm: 0.10,
        thickness_mm: 10,
        slug: {
          area_mm2: 100,
          perimeter_mm: 40,
          min_internal_angle_deg: 90,
          max_internal_angle_deg: 90,
          internal_corner_count: 1,
          has_undercut: false,
          corners: [
            { x: 0, y: 0, angle_deg: 90, radius_mm: 0.1, is_internal: true },
          ],
        },
      };

      const result = engine.analyze(input);

      // With 0.10mm wire: R_min = 0.05 + 0.025 + 0.02 = 0.095
      // Corner has 0.1mm radius, so should be adequate
      expect(result.required_min_radius_mm).toBeCloseTo(0.095, 3);
      expect(result.corners[0].radius_adequate).toBe(true);
    });

    it("uses custom spark gap", () => {
      const input: CornerTaperInput = {
        spark_gap_mm: 0.050,
        thickness_mm: 10,
        slug: {
          area_mm2: 100,
          perimeter_mm: 40,
          min_internal_angle_deg: 90,
          max_internal_angle_deg: 90,
          internal_corner_count: 1,
          has_undercut: false,
          corners: [
            { x: 0, y: 0, angle_deg: 90, radius_mm: 0.15, is_internal: true },
          ],
        },
      };

      const result = engine.analyze(input);

      // With 0.050mm gap: R_min = 0.125 + 0.050 + 0.02 = 0.195
      expect(result.required_min_radius_mm).toBeCloseTo(0.195, 3);
    });

    it("uses custom material density for weight calculation", () => {
      const input: CornerTaperInput = {
        thickness_mm: 10,
        material_density_kg_m3: 2700,
        slug: {
          area_mm2: 100,
          perimeter_mm: 40,
          min_internal_angle_deg: 90,
          max_internal_angle_deg: 90,
          internal_corner_count: 1,
          has_undercut: false,
          corners: [
            { x: 0, y: 0, angle_deg: 90, radius_mm: 0.2, is_internal: true },
          ],
        },
      };

      const result = engine.analyze(input);

      // Volume = 100 * 10 / 1e9 = 1e-6 m³
      // Mass = 1e-6 * 2700 = 0.0027 kg
      // Weight = 0.0027 * 9.81 ≈ 0.02649 N, rounds to 0.026
      expect(result.slug_prediction.estimated_weight_N).toBeCloseTo(0.026, 3);
    });
  });

  describe("analyze — invalid input handling", () => {
    it("returns invalid result for missing slug", () => {
      const input = {
        thickness_mm: 10,
      } as CornerTaperInput;

      const result = engine.analyze(input);

      expect(result.success).toBe(false);
      expect(result.summary).toContain("INVALID");
    });

    it("returns invalid result for missing corners array", () => {
      const input: CornerTaperInput = {
        thickness_mm: 10,
        slug: {
          area_mm2: 100,
          perimeter_mm: 40,
          min_internal_angle_deg: 90,
          max_internal_angle_deg: 90,
          internal_corner_count: 0,
          has_undercut: false,
        } as SlugGeometry,
      };

      const result = engine.analyze(input);

      expect(result.success).toBe(false);
    });

    it("returns invalid result for zero thickness", () => {
      const input: CornerTaperInput = {
        thickness_mm: 0,
        slug: {
          area_mm2: 100,
          perimeter_mm: 40,
          min_internal_angle_deg: 90,
          max_internal_angle_deg: 90,
          internal_corner_count: 1,
          has_undercut: false,
          corners: [
            { x: 0, y: 0, angle_deg: 90, radius_mm: 0.2, is_internal: true },
          ],
        },
      };

      const result = engine.analyze(input);

      expect(result.success).toBe(false);
    });

    it("returns invalid result for negative thickness", () => {
      const input: CornerTaperInput = {
        thickness_mm: -5,
        slug: {
          area_mm2: 100,
          perimeter_mm: 40,
          min_internal_angle_deg: 90,
          max_internal_angle_deg: 90,
          internal_corner_count: 1,
          has_undercut: false,
          corners: [
            { x: 0, y: 0, angle_deg: 90, radius_mm: 0.2, is_internal: true },
          ],
        },
      };

      const result = engine.analyze(input);

      expect(result.success).toBe(false);
    });

    it("returns invalid result for zero area", () => {
      const input: CornerTaperInput = {
        thickness_mm: 10,
        slug: {
          area_mm2: 0,
          perimeter_mm: 40,
          min_internal_angle_deg: 90,
          max_internal_angle_deg: 90,
          internal_corner_count: 1,
          has_undercut: false,
          corners: [
            { x: 0, y: 0, angle_deg: 90, radius_mm: 0.2, is_internal: true },
          ],
        },
      };

      const result = engine.analyze(input);

      expect(result.success).toBe(false);
    });

    it("returns invalid result for NaN area", () => {
      const input: CornerTaperInput = {
        thickness_mm: 10,
        slug: {
          area_mm2: NaN,
          perimeter_mm: 40,
          min_internal_angle_deg: 90,
          max_internal_angle_deg: 90,
          internal_corner_count: 1,
          has_undercut: false,
          corners: [
            { x: 0, y: 0, angle_deg: 90, radius_mm: 0.2, is_internal: true },
          ],
        },
      };

      const result = engine.analyze(input);

      expect(result.success).toBe(false);
    });
  });

  describe("analyze — edge cases", () => {
    it("handles empty corners array", () => {
      const input: CornerTaperInput = {
        thickness_mm: 10,
        slug: {
          area_mm2: 100,
          perimeter_mm: 40,
          min_internal_angle_deg: 90,
          max_internal_angle_deg: 90,
          internal_corner_count: 0,
          has_undercut: false,
          corners: [],
        },
      };

      const result = engine.analyze(input);

      expect(result.success).toBe(true);
      expect(result.corners).toHaveLength(0);
      expect(result.all_corners_adequate).toBe(true);
    });

    it("handles single corner", () => {
      const input: CornerTaperInput = {
        thickness_mm: 10,
        slug: {
          area_mm2: 50,
          perimeter_mm: 30,
          min_internal_angle_deg: 60,
          max_internal_angle_deg: 60,
          internal_corner_count: 1,
          has_undercut: false,
          corners: [
            { x: 5, y: 5, angle_deg: 60, radius_mm: 0.25, is_internal: true },
          ],
        },
      };

      const result = engine.analyze(input);

      expect(result.success).toBe(true);
      expect(result.corners).toHaveLength(1);
    });

    it("handles mixed internal/external corners", () => {
      const input: CornerTaperInput = {
        thickness_mm: 10,
        slug: {
          area_mm2: 100,
          perimeter_mm: 50,
          min_internal_angle_deg: 90,
          max_internal_angle_deg: 90,
          internal_corner_count: 2,
          has_undercut: false,
          corners: [
            { x: 0, y: 0, angle_deg: 90, radius_mm: 0, is_internal: true },
            { x: 10, y: 0, angle_deg: 270, radius_mm: 0, is_internal: false },
            { x: 10, y: 10, angle_deg: 90, radius_mm: 0.3, is_internal: true },
            { x: 0, y: 10, angle_deg: 270, radius_mm: 0, is_internal: false },
          ],
        },
      };

      const result = engine.analyze(input);

      expect(result.success).toBe(true);
      expect(result.corners.filter(c => c.corner.is_internal)).toHaveLength(2);
      expect(result.corners.filter(c => !c.corner.is_internal)).toHaveLength(2);
    });

    it("handles very small dimensions", () => {
      const input: CornerTaperInput = {
        thickness_mm: 0.1,
        wire_diameter_mm: 0.05,
        spark_gap_mm: 0.005,
        slug: {
          area_mm2: 0.01,
          perimeter_mm: 0.4,
          min_internal_angle_deg: 90,
          max_internal_angle_deg: 90,
          internal_corner_count: 4,
          has_undercut: false,
          corners: [
            { x: 0, y: 0, angle_deg: 90, radius_mm: 0.05, is_internal: true },
          ],
        },
      };

      const result = engine.analyze(input);

      expect(result.success).toBe(true);
      expect(result.slug_prediction.estimated_weight_N).toBeLessThan(0.001);
    });

    it("handles very large dimensions", () => {
      const input: CornerTaperInput = {
        thickness_mm: 500,
        slug: {
          area_mm2: 100000,
          perimeter_mm: 1400,
          min_internal_angle_deg: 90,
          max_internal_angle_deg: 90,
          internal_corner_count: 4,
          has_undercut: false,
          corners: [
            { x: 0, y: 0, angle_deg: 90, radius_mm: 5, is_internal: true },
          ],
        },
      };

      const result = engine.analyze(input);

      expect(result.success).toBe(true);
      expect(result.slug_prediction.estimated_weight_N).toBeGreaterThan(100);
    });
  });

  describe("analyze — summary generation", () => {
    it("generates summary with corner status", () => {
      const input: CornerTaperInput = {
        thickness_mm: 10,
        slug: {
          area_mm2: 100,
          perimeter_mm: 40,
          min_internal_angle_deg: 90,
          max_internal_angle_deg: 90,
          internal_corner_count: 2,
          has_undercut: false,
          corners: [
            { x: 0, y: 0, angle_deg: 90, radius_mm: 0.3, is_internal: true },
            { x: 10, y: 0, angle_deg: 90, radius_mm: 0.3, is_internal: true },
          ],
        },
      };

      const result = engine.analyze(input);

      expect(result.summary).toContain("corners");
      expect(result.summary).toContain("Slug:");
    });

    it("includes drop probability in summary", () => {
      const input: CornerTaperInput = {
        thickness_mm: 20,
        slug: {
          area_mm2: 200,
          perimeter_mm: 60,
          min_internal_angle_deg: 90,
          max_internal_angle_deg: 90,
          internal_corner_count: 4,
          has_undercut: false,
          corners: [
            { x: 0, y: 0, angle_deg: 90, radius_mm: 0.5, is_internal: true },
          ],
        },
      };

      const result = engine.analyze(input);

      expect(result.summary).toMatch(/\d+% drop prob/);
    });
  });

  describe("analyze — recommendations", () => {
    it("provides recommendations for wedge prediction", () => {
      const input: CornerTaperInput = {
        thickness_mm: 10,
        slug: {
          area_mm2: 100,
          perimeter_mm: 40,
          min_internal_angle_deg: 20,
          max_internal_angle_deg: 90,
          internal_corner_count: 2,
          has_undercut: true,
          corners: [
            { x: 0, y: 0, angle_deg: 20, radius_mm: 0, is_internal: true },
          ],
        },
      };

      const result = engine.analyze(input);

      expect(result.slug_prediction.recommendations.length).toBeGreaterThan(0);
      expect(result.slug_prediction.recommendations.some(r => r.includes("tab") || r.includes("corner"))).toBe(true);
    });

    it("provides recommendations for stick prediction", () => {
      const input: CornerTaperInput = {
        thickness_mm: 0.2,
        slug: {
          area_mm2: 0.5,
          perimeter_mm: 3,
          min_internal_angle_deg: 90,
          max_internal_angle_deg: 90,
          internal_corner_count: 4,
          has_undercut: false,
          corners: [
            { x: 0, y: 0, angle_deg: 90, radius_mm: 0.1, is_internal: true },
          ],
        },
      };

      const result = engine.analyze(input);

      expect(result.slug_prediction.slug_class).toBe("stick");
      expect(result.slug_prediction.recommendations.some(r => r.includes("air blast") || r.includes("manual") || r.includes("stick"))).toBe(true);
    });
  });
});
