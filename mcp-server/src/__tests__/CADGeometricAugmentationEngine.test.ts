/**
 * CADGeometricAugmentationEngine Tests — U-ML-02
 * =================================================
 *
 * Test coverage:
 *   - Happy path: mirror, scale, rotate, tolerance noise, CSG permutation
 *   - Edge cases: single vertex, empty vertices, no CSG tree
 *   - Adversarial: NaN coordinates, Infinity, negative scales
 *   - Batch processing and statistics
 *
 * @module __tests__/CADGeometricAugmentationEngine.test
 * @milestone CAD-COMPLETE-MS0 PHASE-49 U-ML-02
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  cadGeometricAugmentationEngine,
  CADGeometricAugmentationEngine,
  CADGeometry,
  AugmentedGeometry,
  Point3D,
} from "../engines/CADGeometricAugmentationEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createTestCube(size: number = 10): CADGeometry {
  const half = size / 2;
  return {
    id: "test-cube-001",
    name: "Test Cube",
    format: "brep",
    vertices: [
      { x: -half, y: -half, z: -half },
      { x: half, y: -half, z: -half },
      { x: half, y: half, z: -half },
      { x: -half, y: half, z: -half },
      { x: -half, y: -half, z: half },
      { x: half, y: -half, z: half },
      { x: half, y: half, z: half },
      { x: -half, y: half, z: half },
    ],
    bounding_box: {
      min: { x: -half, y: -half, z: -half },
      max: { x: half, y: half, z: half },
    },
    volume_mm3: size ** 3,
    surface_area_mm2: 6 * size ** 2,
    centroid: { x: 0, y: 0, z: 0 },
  };
}

function createTestCubeWithCSG(): CADGeometry {
  const cube = createTestCube(20);
  return {
    ...cube,
    id: "test-cube-csg-001",
    csg_tree: [
      { id: "op1", type: "union", operand_a: "base", operand_b: "boss1", order_index: 0 },
      { id: "op2", type: "union", operand_a: "result1", operand_b: "boss2", order_index: 1 },
      { id: "op3", type: "subtract", operand_a: "result2", operand_b: "hole1", order_index: 2 },
      { id: "op4", type: "intersect", operand_a: "result3", operand_b: "trim", order_index: 3 },
    ],
  };
}

function createOffsetCube(): CADGeometry {
  return {
    id: "offset-cube-001",
    name: "Offset Cube",
    format: "step",
    vertices: [
      { x: 100, y: 50, z: 25 },
      { x: 110, y: 50, z: 25 },
      { x: 110, y: 60, z: 25 },
      { x: 100, y: 60, z: 25 },
      { x: 100, y: 50, z: 35 },
      { x: 110, y: 50, z: 35 },
      { x: 110, y: 60, z: 35 },
      { x: 100, y: 60, z: 35 },
    ],
    bounding_box: {
      min: { x: 100, y: 50, z: 25 },
      max: { x: 110, y: 60, z: 35 },
    },
    volume_mm3: 1000,
    centroid: { x: 105, y: 55, z: 30 },
  };
}

// ============================================================================
// HAPPY PATH TESTS
// ============================================================================

describe("CADGeometricAugmentationEngine", () => {
  let engine: CADGeometricAugmentationEngine;

  beforeEach(() => {
    engine = new CADGeometricAugmentationEngine({ seed: 42 });
  });

  describe("Mirror transformations", () => {
    it("mirrors geometry along X axis", () => {
      const cube = createTestCube(10);
      engine.configure({ enable_mirror: true, mirror_axes: ["x"], enable_scale: false, enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: false });

      const results = engine.augment(cube);

      expect(results).toHaveLength(1);
      expect(results[0].augmentation_type).toBe("mirror_x");
      expect(results[0].origin_id).toBe(cube.id);

      const origV0 = cube.vertices[0];
      const mirroredV0 = results[0].vertices[0];
      expect(mirroredV0.x).toBe(-origV0.x);
      expect(mirroredV0.y).toBe(origV0.y);
      expect(mirroredV0.z).toBe(origV0.z);
    });

    it("mirrors geometry along Y axis", () => {
      const cube = createTestCube(10);
      engine.configure({ enable_mirror: true, mirror_axes: ["y"], enable_scale: false, enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: false });

      const results = engine.augment(cube);

      expect(results).toHaveLength(1);
      expect(results[0].augmentation_type).toBe("mirror_y");

      const origV0 = cube.vertices[0];
      const mirroredV0 = results[0].vertices[0];
      expect(mirroredV0.x).toBe(origV0.x);
      expect(mirroredV0.y).toBe(-origV0.y);
      expect(mirroredV0.z).toBe(origV0.z);
    });

    it("mirrors geometry along Z axis", () => {
      const cube = createTestCube(10);
      engine.configure({ enable_mirror: true, mirror_axes: ["z"], enable_scale: false, enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: false });

      const results = engine.augment(cube);

      expect(results).toHaveLength(1);
      expect(results[0].augmentation_type).toBe("mirror_z");

      const origV0 = cube.vertices[0];
      const mirroredV0 = results[0].vertices[0];
      expect(mirroredV0.x).toBe(origV0.x);
      expect(mirroredV0.y).toBe(origV0.y);
      expect(mirroredV0.z).toBe(-origV0.z);
    });

    it("mirrors along all three axes when configured", () => {
      const cube = createTestCube(10);
      engine.configure({ enable_mirror: true, mirror_axes: ["x", "y", "z"], enable_scale: false, enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: false });

      const results = engine.augment(cube);

      expect(results).toHaveLength(3);
      expect(results.map(r => r.augmentation_type)).toContain("mirror_x");
      expect(results.map(r => r.augmentation_type)).toContain("mirror_y");
      expect(results.map(r => r.augmentation_type)).toContain("mirror_z");
    });
  });

  describe("Scale transformations", () => {
    it("applies uniform scaling within range", () => {
      const cube = createTestCube(10);
      engine.configure({ enable_mirror: false, enable_scale: true, scale_uniform_range: [0.9, 1.1], enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: false });

      const results = engine.augment(cube);

      const uniformResult = results.find(r => r.augmentation_type === "scale_uniform");
      expect(uniformResult).toBeDefined();
      expect(uniformResult!.augmentation_params.scale_factor).toBeGreaterThanOrEqual(0.9);
      expect(uniformResult!.augmentation_params.scale_factor).toBeLessThanOrEqual(1.1);

      const scaleFactor = uniformResult!.augmentation_params.scale_factor as number;
      expect(uniformResult!.volume_mm3).toBeCloseTo(cube.volume_mm3! * scaleFactor ** 3, 5);
    });

    it("applies non-uniform scaling", () => {
      const cube = createTestCube(10);
      engine.configure({ enable_mirror: false, enable_scale: true, enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: false });

      const results = engine.augment(cube);

      const nonUniformResult = results.find(r => r.augmentation_type === "scale_nonuniform");
      expect(nonUniformResult).toBeDefined();
      expect(nonUniformResult!.augmentation_params.scale_x).toBeDefined();
      expect(nonUniformResult!.augmentation_params.scale_y).toBeDefined();
      expect(nonUniformResult!.augmentation_params.scale_z).toBeDefined();
    });

    it("preserves vertex ratios on uniform scale", () => {
      const cube = createTestCube(10);
      engine.configure({ enable_mirror: false, enable_scale: true, scale_uniform_range: [2, 2], enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: false });

      const results = engine.augment(cube);
      const uniformResult = results.find(r => r.augmentation_type === "scale_uniform");

      for (let i = 0; i < cube.vertices.length; i++) {
        const orig = cube.vertices[i];
        const scaled = uniformResult!.vertices[i];
        expect(scaled.x / orig.x).toBeCloseTo(2, 5);
        expect(scaled.y / orig.y).toBeCloseTo(2, 5);
        expect(scaled.z / orig.z).toBeCloseTo(2, 5);
      }
    });
  });

  describe("Rotation transformations", () => {
    it("rotates 90 degrees around X axis", () => {
      const cube = createOffsetCube();
      engine.configure({ enable_mirror: false, enable_scale: false, enable_rotate: true, rotation_angles_deg: [90], enable_tolerance_noise: false, enable_csg_permute: false });

      const results = engine.augment(cube);
      const rotX = results.find(r => r.augmentation_type === "rotate_90_x");

      expect(rotX).toBeDefined();
      expect(rotX!.augmentation_params.axis).toBe("x");
      expect(rotX!.augmentation_params.angle_deg).toBe(90);
    });

    it("rotates 180 degrees around Y axis", () => {
      const cube = createTestCube(10);
      engine.configure({ enable_mirror: false, enable_scale: false, enable_rotate: true, rotation_angles_deg: [180], enable_tolerance_noise: false, enable_csg_permute: false });

      const results = engine.augment(cube);
      const rotY = results.find(r => r.augmentation_type === "rotate_180_y");

      expect(rotY).toBeDefined();

      const origV = cube.vertices[1];
      const rotatedV = rotY!.vertices[1];
      expect(rotatedV.x).toBeCloseTo(-origV.x, 5);
      expect(rotatedV.y).toBeCloseTo(origV.y, 5);
      expect(rotatedV.z).toBeCloseTo(-origV.z, 5);
    });

    it("generates all rotation variants for configured angles", () => {
      const cube = createTestCube(10);
      engine.configure({ enable_mirror: false, enable_scale: false, enable_rotate: true, rotation_angles_deg: [90, 180, 270], enable_tolerance_noise: false, enable_csg_permute: false });

      const results = engine.augment(cube);

      expect(results).toHaveLength(9);
      expect(results.filter(r => r.augmentation_type.includes("rotate_90")).length).toBe(3);
      expect(results.filter(r => r.augmentation_type.includes("rotate_180")).length).toBe(3);
      expect(results.filter(r => r.augmentation_type.includes("rotate_270")).length).toBe(3);
    });
  });

  describe("Tolerance noise", () => {
    it("adds noise within IT7 tolerance band", () => {
      const cube = createTestCube(10);
      engine.configure({ enable_mirror: false, enable_scale: false, enable_rotate: false, enable_tolerance_noise: true, tolerance_iso_grade: "IT7", enable_csg_permute: false });

      const results = engine.augment(cube);

      expect(results).toHaveLength(1);
      expect(results[0].augmentation_type).toBe("tolerance_noise");
      expect(results[0].augmentation_params.iso_grade).toBe("IT7");
      expect(results[0].augmentation_params.tolerance_mm).toBe(0.01);

      for (let i = 0; i < cube.vertices.length; i++) {
        const orig = cube.vertices[i];
        const noisy = results[0].vertices[i];
        expect(Math.abs(noisy.x - orig.x)).toBeLessThanOrEqual(0.01);
        expect(Math.abs(noisy.y - orig.y)).toBeLessThanOrEqual(0.01);
        expect(Math.abs(noisy.z - orig.z)).toBeLessThanOrEqual(0.01);
      }
    });

    it("respects different ISO tolerance grades", () => {
      const cube = createTestCube(10);
      engine.configure({ enable_mirror: false, enable_scale: false, enable_rotate: false, enable_tolerance_noise: true, tolerance_iso_grade: "IT10", enable_csg_permute: false });

      const results = engine.augment(cube);

      expect(results[0].augmentation_params.tolerance_mm).toBe(0.04);
    });
  });

  describe("CSG permutation", () => {
    it("permutes CSG operations when tree has multiple ops", () => {
      const cubeWithCSG = createTestCubeWithCSG();
      engine.configure({ enable_mirror: false, enable_scale: false, enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: true });

      const results = engine.augment(cubeWithCSG);

      expect(results).toHaveLength(1);
      expect(results[0].augmentation_type).toBe("csg_permute");
      expect(results[0].augmentation_params.swapped_ops).toBeDefined();
      expect(results[0].csg_tree).toHaveLength(4);
    });

    it("returns no CSG augmentation when tree is missing", () => {
      const cube = createTestCube(10);
      engine.configure({ enable_mirror: false, enable_scale: false, enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: true });

      const results = engine.augment(cube);

      expect(results).toHaveLength(0);
    });

    it("returns no CSG augmentation when tree has single op", () => {
      const cube = createTestCube(10);
      cube.csg_tree = [{ id: "op1", type: "union", operand_a: "a", operand_b: "b", order_index: 0 }];
      engine.configure({ enable_mirror: false, enable_scale: false, enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: true });

      const results = engine.augment(cube);

      expect(results).toHaveLength(0);
    });
  });

  describe("Batch processing", () => {
    it("processes multiple geometries in batch", () => {
      const cube1 = createTestCube(10);
      const cube2 = createOffsetCube();
      engine.configure({ enable_mirror: true, mirror_axes: ["x"], enable_scale: false, enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: false });

      const { augmented, report } = engine.augmentBatch([cube1, cube2]);

      expect(augmented).toHaveLength(2);
      expect(report.source_count).toBe(2);
      expect(report.augmented_count).toBe(2);
      expect(report.multiplier_achieved).toBeCloseTo(2, 1);
    });

    it("tracks statistics across batch", () => {
      const cubes = [createTestCube(10), createTestCube(20), createTestCube(30)];
      engine.configure({ enable_mirror: true, mirror_axes: ["x", "y"], enable_scale: false, enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: false });
      engine.resetStats();

      engine.augmentBatch(cubes);
      const stats = engine.getStats();

      expect(stats.total_sources).toBe(3);
      expect(stats.total_augmented).toBe(6);
      expect(stats.by_type.mirror_x).toBe(3);
      expect(stats.by_type.mirror_y).toBe(3);
    });

    it("achieves target multiplier with full augmentation", () => {
      const cube = createTestCubeWithCSG();
      engine.configure({
        enable_mirror: true,
        mirror_axes: ["x", "y", "z"],
        enable_scale: true,
        enable_rotate: true,
        rotation_angles_deg: [90, 180, 270],
        enable_tolerance_noise: true,
        enable_csg_permute: true,
      });

      const { report } = engine.augmentBatch([cube]);

      expect(report.multiplier_achieved).toBeGreaterThanOrEqual(10);
    });
  });

  describe("Provenance tracking", () => {
    it("generates unique provenance hash for each augmentation", () => {
      const cube = createTestCube(10);
      engine.configure({ enable_mirror: true, mirror_axes: ["x", "y", "z"], enable_scale: false, enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: false });

      const results = engine.augment(cube);

      const hashes = results.map(r => r.provenance_hash);
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(results.length);
    });

    it("preserves origin_id linking back to source", () => {
      const cube = createTestCube(10);
      engine.configure({ enable_mirror: true, mirror_axes: ["x"], enable_scale: false, enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: false });

      const results = engine.augment(cube);

      expect(results[0].origin_id).toBe(cube.id);
    });
  });

  describe("Bounding box computation", () => {
    it("correctly computes bounding box after mirror", () => {
      const cube = createOffsetCube();
      engine.configure({ enable_mirror: true, mirror_axes: ["x"], enable_scale: false, enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: false });

      const results = engine.augment(cube);
      const mirrorX = results[0];

      expect(mirrorX.bounding_box.min.x).toBe(-110);
      expect(mirrorX.bounding_box.max.x).toBe(-100);
      expect(mirrorX.bounding_box.min.y).toBe(50);
      expect(mirrorX.bounding_box.max.y).toBe(60);
    });

    it("correctly computes centroid after transformation", () => {
      const cube = createOffsetCube();
      engine.configure({ enable_mirror: true, mirror_axes: ["x"], enable_scale: false, enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: false });

      const results = engine.augment(cube);
      const mirrorX = results[0];

      expect(mirrorX.centroid!.x).toBeCloseTo(-105, 5);
      expect(mirrorX.centroid!.y).toBeCloseTo(55, 5);
      expect(mirrorX.centroid!.z).toBeCloseTo(30, 5);
    });
  });

  describe("Edge cases", () => {
    it("handles single-vertex geometry", () => {
      const singlePoint: CADGeometry = {
        id: "single-point",
        name: "Single Point",
        format: "mesh",
        vertices: [{ x: 5, y: 10, z: 15 }],
        bounding_box: { min: { x: 5, y: 10, z: 15 }, max: { x: 5, y: 10, z: 15 } },
      };
      engine.configure({ enable_mirror: true, mirror_axes: ["x"], enable_scale: false, enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: false });

      const results = engine.augment(singlePoint);

      expect(results).toHaveLength(1);
      expect(results[0].vertices[0].x).toBe(-5);
    });

    it("handles empty vertices array", () => {
      const empty: CADGeometry = {
        id: "empty",
        name: "Empty",
        format: "mesh",
        vertices: [],
        bounding_box: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
      };
      engine.configure({ enable_mirror: true, mirror_axes: ["x"], enable_scale: false, enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: false });

      const results = engine.augment(empty);

      expect(results).toHaveLength(1);
      expect(results[0].vertices).toHaveLength(0);
    });

    it("handles very small geometry values", () => {
      const tiny: CADGeometry = {
        id: "tiny",
        name: "Tiny",
        format: "mesh",
        vertices: [
          { x: 0.0001, y: 0.0002, z: 0.0003 },
          { x: 0.0002, y: 0.0003, z: 0.0004 },
        ],
        bounding_box: {
          min: { x: 0.0001, y: 0.0002, z: 0.0003 },
          max: { x: 0.0002, y: 0.0003, z: 0.0004 },
        },
      };
      engine.configure({ enable_mirror: true, mirror_axes: ["x"], enable_scale: false, enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: false });

      const results = engine.augment(tiny);

      expect(results[0].vertices[0].x).toBeCloseTo(-0.0001, 10);
    });

    it("handles very large geometry values", () => {
      const large: CADGeometry = {
        id: "large",
        name: "Large",
        format: "mesh",
        vertices: [
          { x: 1e6, y: 2e6, z: 3e6 },
          { x: 1.1e6, y: 2.1e6, z: 3.1e6 },
        ],
        bounding_box: {
          min: { x: 1e6, y: 2e6, z: 3e6 },
          max: { x: 1.1e6, y: 2.1e6, z: 3.1e6 },
        },
      };
      engine.configure({ enable_scale: true, scale_uniform_range: [1.5, 1.5], enable_mirror: false, enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: false });

      const results = engine.augment(large);
      const uniformResult = results.find(r => r.augmentation_type === "scale_uniform");

      expect(uniformResult!.vertices[0].x).toBeCloseTo(1.5e6, -2);
    });
  });

  describe("Adversarial inputs", () => {
    it("handles NaN coordinates gracefully", () => {
      const nanGeom: CADGeometry = {
        id: "nan-geom",
        name: "NaN Geometry",
        format: "mesh",
        vertices: [
          { x: NaN, y: 1, z: 2 },
          { x: 3, y: NaN, z: 4 },
        ],
        bounding_box: { min: { x: 0, y: 0, z: 0 }, max: { x: 3, y: 1, z: 4 } },
      };
      engine.configure({ enable_mirror: true, mirror_axes: ["x"], enable_scale: false, enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: false });

      const results = engine.augment(nanGeom);

      expect(results).toHaveLength(1);
      expect(Number.isNaN(results[0].vertices[0].x)).toBe(true);
    });

    it("handles Infinity coordinates", () => {
      const infGeom: CADGeometry = {
        id: "inf-geom",
        name: "Infinity Geometry",
        format: "mesh",
        vertices: [
          { x: Infinity, y: 1, z: 2 },
          { x: -Infinity, y: 3, z: 4 },
        ],
        bounding_box: { min: { x: -Infinity, y: 1, z: 2 }, max: { x: Infinity, y: 3, z: 4 } },
      };
      engine.configure({ enable_mirror: true, mirror_axes: ["x"], enable_scale: false, enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: false });

      const results = engine.augment(infGeom);

      expect(results[0].vertices[0].x).toBe(-Infinity);
      expect(results[0].vertices[1].x).toBe(Infinity);
    });

    it("handles negative zero", () => {
      const negZeroGeom: CADGeometry = {
        id: "negzero",
        name: "Negative Zero",
        format: "mesh",
        vertices: [{ x: -0, y: -0, z: -0 }],
        bounding_box: { min: { x: -0, y: -0, z: -0 }, max: { x: -0, y: -0, z: -0 } },
      };
      engine.configure({ enable_mirror: true, mirror_axes: ["x"], enable_scale: false, enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: false });

      const results = engine.augment(negZeroGeom);

      expect(Object.is(results[0].vertices[0].x, 0)).toBe(true);
    });
  });

  describe("Configuration", () => {
    it("allows runtime configuration changes", () => {
      engine.configure({ enable_mirror: true, mirror_axes: ["x"], enable_scale: false, enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: false });

      let config = engine.getConfig();
      expect(config.mirror_axes).toEqual(["x"]);

      engine.configure({ mirror_axes: ["y", "z"] });
      config = engine.getConfig();
      expect(config.mirror_axes).toEqual(["y", "z"]);
    });

    it("resets statistics correctly", () => {
      const cube = createTestCube(10);
      engine.configure({ enable_mirror: true, mirror_axes: ["x"], enable_scale: false, enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: false });

      engine.augment(cube);
      expect(engine.getStats().total_augmented).toBe(1);

      engine.resetStats();
      expect(engine.getStats().total_augmented).toBe(0);
    });

    it("uses seeded RNG for reproducibility", () => {
      const cube = createTestCube(10);
      const engine1 = new CADGeometricAugmentationEngine({ seed: 12345, enable_mirror: false, enable_scale: true, enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: false });
      const engine2 = new CADGeometricAugmentationEngine({ seed: 12345, enable_mirror: false, enable_scale: true, enable_rotate: false, enable_tolerance_noise: false, enable_csg_permute: false });

      const results1 = engine1.augment(cube);
      const results2 = engine2.augment(cube);

      expect(results1[0].augmentation_params.scale_factor).toBe(results2[0].augmentation_params.scale_factor);
    });
  });

  describe("Singleton export", () => {
    it("exports working singleton instance", () => {
      expect(cadGeometricAugmentationEngine).toBeDefined();
      expect(typeof cadGeometricAugmentationEngine.augment).toBe("function");
      expect(typeof cadGeometricAugmentationEngine.augmentBatch).toBe("function");
    });
  });
});
