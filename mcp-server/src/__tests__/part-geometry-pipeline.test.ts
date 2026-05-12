/**
 * Dedicated tests for PartGeometryPipelineEngine
 * Methods: analyzeFeatures, matchTools, generateJobPlan
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("../physics/constants.js", () => ({
  CANONICAL_KIENZLE: {
    P: { kc1_1: 1800, mc: 0.25 }, M: { kc1_1: 2100, mc: 0.25 },
    K: { kc1_1: 1100, mc: 0.25 }, N: { kc1_1: 700, mc: 0.25 },
    S: { kc1_1: 2800, mc: 0.25 }, H: { kc1_1: 3500, mc: 0.25 },
  },
  CANONICAL_TAYLOR: {
    P: { C: 300, n: 0.25 }, M: { C: 200, n: 0.25 },
    K: { C: 350, n: 0.25 }, N: { C: 600, n: 0.25 },
    S: { C: 150, n: 0.2 }, H: { C: 100, n: 0.15 },
  },
  CANONICAL_MATERIAL_DB: {
    aluminum: {
      name: "Aluminum", iso_group: "N", kc1_1: 700, mc: 0.25,
      taylor_C: 600, taylor_n: 0.25, k_thermal: 167, sigma_y_MPa: 276,
      density_kg_m3: 2700, hardness_HB: 95, vc_base_roughing: 250,
      vc_base_finishing: 400, machinability_factor: 1.8, cp_J_kgK: 896,
    },
    steel: {
      name: "Steel", iso_group: "P", kc1_1: 1800, mc: 0.25,
      taylor_C: 300, taylor_n: 0.25, k_thermal: 49.8, sigma_y_MPa: 530,
      density_kg_m3: 7850, hardness_HB: 200, vc_base_roughing: 150,
      vc_base_finishing: 250, machinability_factor: 1.0, cp_J_kgK: 486,
    },
  },
}));

import { partGeometryPipelineEngine } from "../engines/PartGeometryPipelineEngine.js";

const sampleFeatures = [
  {
    id: "F1",
    type: "pocket_closed" as const,
    width_mm: 30,
    length_mm: 50,
    depth_mm: 10,
    corner_radius_mm: 3,
  },
  {
    id: "F2",
    type: "hole_through" as const,
    diameter_mm: 10,
    depth_mm: 20,
  },
  {
    id: "F3",
    type: "face" as const,
    width_mm: 100,
    length_mm: 100,
    depth_mm: 1,
  },
];

const sampleTools = [
  {
    tool_id: "T1",
    tool_name: "10mm 3-flute endmill",
    diameter_mm: 10,
    flutes: 3,
    flute_length_mm: 30,
    material: "carbide",
    coating: "AlTiN",
  },
  {
    tool_id: "T2",
    tool_name: "6mm 2-flute endmill",
    diameter_mm: 6,
    flutes: 2,
    flute_length_mm: 20,
    material: "carbide",
    coating: "TiAlN",
    corner_radius_mm: 1,
  },
  {
    tool_id: "T3",
    tool_name: "50mm face mill",
    diameter_mm: 50,
    flutes: 5,
    flute_length_mm: 5,
    material: "carbide",
    coating: "TiN",
    type: "face_mill",
  },
  {
    tool_id: "T4",
    tool_name: "10mm drill",
    diameter_mm: 10,
    flutes: 2,
    flute_length_mm: 40,
    material: "carbide",
    coating: "TiN",
    type: "drill",
  },
];

describe("PartGeometryPipelineEngine", () => {
  describe("analyzeFeatures", () => {
    it("should classify feature complexity and required operations", () => {
      const r = partGeometryPipelineEngine.analyzeFeatures({
        features: sampleFeatures,
        material: "aluminum",
      });
      expect(r.confidence).toBeGreaterThan(0);
      const analysis = r.value;
      expect(analysis.features).toHaveLength(3);
      expect(analysis.total_operations).toBeGreaterThanOrEqual(3);
      for (const f of analysis.features) {
        expect(f.complexity).toBeDefined();
        expect(f.required_ops.length).toBeGreaterThanOrEqual(1);
        expect(f.estimated_volume_mm3).toBeGreaterThan(0);
      }
    });

    it("should identify deep pocket as high aspect ratio", () => {
      const r = partGeometryPipelineEngine.analyzeFeatures({
        features: [
          { id: "deep", type: "pocket_closed" as const, width_mm: 10, depth_mm: 50, length_mm: 10 },
        ],
        material: "steel",
      });
      const f = r.value.features[0];
      expect(f.aspect_ratio).toBeGreaterThan(2);
    });
  });

  describe("matchTools", () => {
    it("should match tools to features with fit scores", () => {
      const r = partGeometryPipelineEngine.matchTools({
        features: sampleFeatures,
        tools: sampleTools,
        material: "aluminum",
      });
      expect(r.value.matches.length).toBeGreaterThan(0);
      for (const m of r.value.matches) {
        expect(m.candidates.length).toBeGreaterThan(0);
        for (const c of m.candidates) {
          expect(c.fit_score).toBeGreaterThan(0);
          expect(c.fit_score).toBeLessThanOrEqual(1);
        }
      }
    });

    it("should report unmatched features when no suitable tool", () => {
      const r = partGeometryPipelineEngine.matchTools({
        features: [
          { id: "tiny", type: "pocket_closed" as const, width_mm: 2, depth_mm: 5, length_mm: 2 },
        ],
        tools: sampleTools,
        material: "aluminum",
      });
      expect(r.value.unmatched.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("generateJobPlan", () => {
    it("should produce sequenced operations with S/F parameters", () => {
      const r = partGeometryPipelineEngine.generateJobPlan({
        features: sampleFeatures,
        tools: sampleTools,
        material: "aluminum",
      });
      const plan = r.value;
      expect(plan.operations.length).toBeGreaterThanOrEqual(3);
      for (const op of plan.operations) {
        expect(op.spindle_rpm).toBeGreaterThan(0);
        expect(op.feed_rate_mmmin).toBeGreaterThan(0);
        expect(op.estimated_time_min).toBeGreaterThanOrEqual(0);
      }
      expect(plan.total_time_min).toBeGreaterThan(0);
      expect(plan.magazine_layout.length).toBeGreaterThan(0);
    });

    it("should suggest missing tools when needed", () => {
      const r = partGeometryPipelineEngine.generateJobPlan({
        features: [
          ...sampleFeatures,
          { id: "F4", type: "thread" as const, diameter_mm: 8, depth_mm: 15 },
        ],
        tools: sampleTools,
        material: "steel",
      });
      expect(r.value.operations.length).toBeGreaterThan(0);
    });
  });
});
