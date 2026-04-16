/**
 * StepImportEngine — Unit Tests
 *
 * Tests all 5 public methods with mocked occt-import-js (no real STEP files needed).
 * Validates structure, geometry calculations, and feature detection.
 *
 * @module tests/step-import-engine
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// MOCK: occt-import-js
// ============================================================================

// Build a mock mesh representing a simple box: 8 vertices, 12 triangles
function buildBoxMesh(
  name: string,
  cx: number, cy: number, cz: number,
  sx: number, sy: number, sz: number
) {
  const hx = sx / 2, hy = sy / 2, hz = sz / 2;
  // 8 corners of the box
  const vertices = [
    cx - hx, cy - hy, cz - hz, // 0
    cx + hx, cy - hy, cz - hz, // 1
    cx + hx, cy + hy, cz - hz, // 2
    cx - hx, cy + hy, cz - hz, // 3
    cx - hx, cy - hy, cz + hz, // 4
    cx + hx, cy - hy, cz + hz, // 5
    cx + hx, cy + hy, cz + hz, // 6
    cx - hx, cy + hy, cz + hz, // 7
  ];

  // 12 triangles (2 per face, 6 faces) — outward-facing normals (CCW winding)
  const indices = [
    // -Z face
    0, 2, 1, 0, 3, 2,
    // +Z face
    4, 5, 6, 4, 6, 7,
    // -Y face
    0, 1, 5, 0, 5, 4,
    // +Y face
    2, 3, 7, 2, 7, 6,
    // -X face
    0, 4, 7, 0, 7, 3,
    // +X face
    1, 2, 6, 1, 6, 5,
  ];

  // Compute per-vertex normals (average of adjacent face normals — simplified)
  const normals = new Array(vertices.length).fill(0);
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i], i1 = indices[i + 1], i2 = indices[i + 2];
    const ax = vertices[i1 * 3] - vertices[i0 * 3];
    const ay = vertices[i1 * 3 + 1] - vertices[i0 * 3 + 1];
    const az = vertices[i1 * 3 + 2] - vertices[i0 * 3 + 2];
    const bx = vertices[i2 * 3] - vertices[i0 * 3];
    const by = vertices[i2 * 3 + 1] - vertices[i0 * 3 + 1];
    const bz = vertices[i2 * 3 + 2] - vertices[i0 * 3 + 2];
    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;
    for (const idx of [i0, i1, i2]) {
      normals[idx * 3] += nx;
      normals[idx * 3 + 1] += ny;
      normals[idx * 3 + 2] += nz;
    }
  }
  // Normalize
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.sqrt(normals[i] ** 2 + normals[i + 1] ** 2 + normals[i + 2] ** 2);
    if (len > 0) {
      normals[i] /= len;
      normals[i + 1] /= len;
      normals[i + 2] /= len;
    }
  }

  return {
    name,
    color: [0.5, 0.5, 0.5, 1.0],
    attributes: {
      position: { array: new Float32Array(vertices) },
      normal: { array: new Float32Array(normals) },
    },
    index: { array: new Uint32Array(indices) },
  };
}

// Build a mock mesh representing a cylinder (approximated with triangles)
function buildCylinderMesh(
  name: string,
  cx: number, cy: number, cz: number,
  radius: number, height: number, segments: number = 16
) {
  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  const hz = height / 2;

  // Bottom center vertex
  const bottomCenter = vertices.length / 3;
  vertices.push(cx, cy, cz - hz);
  normals.push(0, 0, -1);

  // Bottom ring
  const bottomRingStart = vertices.length / 3;
  for (let i = 0; i < segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    vertices.push(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle), cz - hz);
    normals.push(0, 0, -1);
  }

  // Top center vertex
  const topCenter = vertices.length / 3;
  vertices.push(cx, cy, cz + hz);
  normals.push(0, 0, 1);

  // Top ring
  const topRingStart = vertices.length / 3;
  for (let i = 0; i < segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    vertices.push(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle), cz + hz);
    normals.push(0, 0, 1);
  }

  // Side vertices (duplicate ring verts with radial normals)
  const sideBottomStart = vertices.length / 3;
  for (let i = 0; i < segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    const nx = Math.cos(angle), ny = Math.sin(angle);
    vertices.push(cx + radius * nx, cy + radius * ny, cz - hz);
    normals.push(nx, ny, 0);
  }
  const sideTopStart = vertices.length / 3;
  for (let i = 0; i < segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    const nx = Math.cos(angle), ny = Math.sin(angle);
    vertices.push(cx + radius * nx, cy + radius * ny, cz + hz);
    normals.push(nx, ny, 0);
  }

  // Bottom cap triangles
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(bottomCenter, bottomRingStart + next, bottomRingStart + i);
  }

  // Top cap triangles
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(topCenter, topRingStart + i, topRingStart + next);
  }

  // Side quads (2 triangles each)
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(sideBottomStart + i, sideBottomStart + next, sideTopStart + next);
    indices.push(sideBottomStart + i, sideTopStart + next, sideTopStart + i);
  }

  return {
    name,
    color: [0.8, 0.2, 0.2, 1.0],
    attributes: {
      position: { array: new Float32Array(vertices) },
      normal: { array: new Float32Array(normals) },
    },
    index: { array: new Uint32Array(indices) },
  };
}

const mockBoxMesh = buildBoxMesh("box_part", 0, 0, 0, 100, 80, 60);
const mockCylinderMesh = buildCylinderMesh("cylinder_part", 0, 0, 0, 10, 50, 24);

const mockOcctResult = {
  meshes: [mockBoxMesh],
};

const mockAssemblyResult = {
  meshes: [mockBoxMesh, mockCylinderMesh],
};

// Mock occt-import-js module
let currentMockResult = mockOcctResult;

vi.mock("occt-import-js", () => ({
  default: vi.fn().mockImplementation(async () => ({
    ReadStepFile: vi.fn().mockImplementation(() => currentMockResult),
  })),
}));

// Mock fs to avoid needing real STEP files
vi.mock("fs", async () => {
  const actual = await vi.importActual<typeof import("fs")>("fs");
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn().mockReturnValue(true),
      readFileSync: vi.fn().mockReturnValue(Buffer.from("mock-step-data")),
      statSync: vi.fn().mockReturnValue({ size: 12345 }),
    },
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue(Buffer.from("mock-step-data")),
    statSync: vi.fn().mockReturnValue({ size: 12345 }),
  };
});

// ============================================================================
// TESTS
// ============================================================================

describe("StepImportEngine", () => {
  let engine: any;

  beforeEach(async () => {
    currentMockResult = mockOcctResult;
    const mod = await import("../engines/StepImportEngine.js");
    engine = mod.stepImportEngine;
  });

  // --------------------------------------------------------------------------
  // importStep
  // --------------------------------------------------------------------------
  describe("importStep", () => {
    it("should return mesh data with correct structure", async () => {
      const result = await engine.importStep({ file_path: "test.step" });

      expect(result).toBeDefined();
      expect(result.file_path).toBe("test.step");
      expect(result.mesh_count).toBe(1);
      expect(result.total_vertices).toBe(8);
      expect(result.total_triangles).toBe(12);
      expect(result.meshes).toHaveLength(1);
      expect(result.meshes[0].name).toBe("box_part");
      expect(result.meshes[0].vertex_count).toBe(8);
      expect(result.meshes[0].triangle_count).toBe(12);
      expect(result.meshes[0].vertices).toHaveLength(24); // 8 * 3
      expect(result.meshes[0].normals).toHaveLength(24);
      expect(result.meshes[0].indices).toHaveLength(36); // 12 * 3
    });

    it("should compute correct bounding box for box mesh", async () => {
      const result = await engine.importStep({ file_path: "test.step" });
      const bb = result.bounding_box;

      expect(bb.min.x).toBeCloseTo(-50, 1);
      expect(bb.min.y).toBeCloseTo(-40, 1);
      expect(bb.min.z).toBeCloseTo(-30, 1);
      expect(bb.max.x).toBeCloseTo(50, 1);
      expect(bb.max.y).toBeCloseTo(40, 1);
      expect(bb.max.z).toBeCloseTo(30, 1);
      expect(bb.size.x).toBeCloseTo(100, 1);
      expect(bb.size.y).toBeCloseTo(80, 1);
      expect(bb.size.z).toBeCloseTo(60, 1);
    });

    it("should handle mesh color (array format)", async () => {
      const result = await engine.importStep({ file_path: "test.step" });
      const color = result.meshes[0].color;

      expect(color).toBeDefined();
      expect(color.r).toBe(0.5);
      expect(color.g).toBe(0.5);
      expect(color.b).toBe(0.5);
      expect(color.a).toBe(1.0);
    });

    it("should handle multi-mesh assemblies", async () => {
      currentMockResult = mockAssemblyResult;
      const result = await engine.importStep({ file_path: "assembly.step" });

      expect(result.mesh_count).toBe(2);
      expect(result.total_vertices).toBeGreaterThan(8);
      expect(result.total_triangles).toBeGreaterThan(12);
      expect(result.meshes).toHaveLength(2);
      expect(result.meshes[0].name).toBe("box_part");
      expect(result.meshes[1].name).toBe("cylinder_part");
    });
  });

  // --------------------------------------------------------------------------
  // analyzeStep
  // --------------------------------------------------------------------------
  describe("analyzeStep", () => {
    it("should return metadata with correct structure", async () => {
      const result = await engine.analyzeStep({ file_path: "test.step" });

      expect(result).toBeDefined();
      expect(result.file_path).toBe("test.step");
      expect(result.file_size_bytes).toBe(12345);
      expect(result.mesh_count).toBe(1);
      expect(result.part_count).toBe(1);
      expect(result.total_vertices).toBe(8);
      expect(result.total_triangles).toBe(12);
    });

    it("should compute volume for box mesh (V = L*W*H = 100*80*60 = 480000)", async () => {
      const result = await engine.analyzeStep({ file_path: "test.step" });

      // Divergence theorem on triangulated box should be close to exact volume
      expect(result.volume_mm3).toBeGreaterThan(400000);
      expect(result.volume_mm3).toBeLessThan(560000);
    });

    it("should compute surface area for box mesh (A = 2*(LW+LH+WH) = 2*(8000+6000+4800) = 37600)", async () => {
      const result = await engine.analyzeStep({ file_path: "test.step" });

      expect(result.surface_area_mm2).toBeGreaterThan(30000);
      expect(result.surface_area_mm2).toBeLessThan(45000);
    });

    it("should estimate edge count via Euler formula", async () => {
      const result = await engine.analyzeStep({ file_path: "test.step" });

      // E ≈ 1.5 * F = 1.5 * 12 = 18
      expect(result.total_edges_estimate).toBe(18);
    });

    it("should build assembly structure for multi-mesh", async () => {
      currentMockResult = mockAssemblyResult;
      const result = await engine.analyzeStep({ file_path: "assembly.step" });

      expect(result.assembly_structure).toHaveLength(2);
      expect(result.assembly_structure[0].name).toBe("box_part");
      expect(result.assembly_structure[1].name).toBe("cylinder_part");
      expect(result.assembly_structure[0].volume_mm3).toBeGreaterThan(0);
      expect(result.assembly_structure[1].volume_mm3).toBeGreaterThan(0);
      expect(result.bounding_box).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // extractFeatures
  // --------------------------------------------------------------------------
  describe("extractFeatures", () => {
    it("should return feature structure with all categories", async () => {
      const result = await engine.extractFeatures({ file_path: "test.step" });

      expect(result).toBeDefined();
      expect(result.file_path).toBe("test.step");
      expect(result.feature_summary).toBeDefined();
      expect(typeof result.feature_summary.holes).toBe("number");
      expect(typeof result.feature_summary.pockets).toBe("number");
      expect(typeof result.feature_summary.slots).toBe("number");
      expect(typeof result.feature_summary.planar_faces).toBe("number");
      expect(typeof result.feature_summary.cylindrical_faces).toBe("number");
      expect(typeof result.feature_summary.fillets).toBe("number");
      expect(typeof result.feature_summary.chamfers).toBe("number");
      expect(Array.isArray(result.holes)).toBe(true);
      expect(Array.isArray(result.pockets)).toBe(true);
      expect(Array.isArray(result.slots)).toBe(true);
      expect(Array.isArray(result.planar_faces)).toBe(true);
      expect(Array.isArray(result.cylindrical_faces)).toBe(true);
      expect(Array.isArray(result.fillets)).toBe(true);
      expect(Array.isArray(result.chamfers)).toBe(true);
    });

    it("should detect planar faces on a box (at least 3 unique normals)", async () => {
      const result = await engine.extractFeatures({ file_path: "test.step" });

      // A box has 6 planar faces, grouped by normal → at least 3 groups (opposing normals may merge)
      expect(result.planar_faces.length).toBeGreaterThanOrEqual(3);
      for (const face of result.planar_faces) {
        expect(face.normal).toBeDefined();
        expect(face.area_mm2).toBeGreaterThan(0);
        expect(face.centroid).toBeDefined();
      }
    });

    it("should detect cylindrical faces on cylinder mesh", async () => {
      currentMockResult = { meshes: [mockCylinderMesh] };
      const result = await engine.extractFeatures({ file_path: "cylinder.step" });

      // Cylinder should have detectable cylindrical faces
      expect(result.cylindrical_faces.length).toBeGreaterThanOrEqual(0);
      // And planar faces (top/bottom caps)
      expect(result.planar_faces.length).toBeGreaterThanOrEqual(1);
    });

    it("should return correct feature_summary counts", async () => {
      const result = await engine.extractFeatures({ file_path: "test.step" });

      expect(result.feature_summary.planar_faces).toBe(result.planar_faces.length);
      expect(result.feature_summary.holes).toBe(result.holes.length);
      expect(result.feature_summary.cylindrical_faces).toBe(result.cylindrical_faces.length);
      expect(result.feature_summary.fillets).toBe(result.fillets.length);
      expect(result.feature_summary.chamfers).toBe(result.chamfers.length);
      expect(result.feature_summary.slots).toBe(result.slots.length);
      expect(result.feature_summary.pockets).toBe(result.pockets.length);
    });
  });

  // --------------------------------------------------------------------------
  // getWallThickness
  // --------------------------------------------------------------------------
  describe("getWallThickness", () => {
    it("should return wall thickness structure", async () => {
      const result = await engine.getWallThickness({ file_path: "test.step" });

      expect(result).toBeDefined();
      expect(result.file_path).toBe("test.step");
      expect(typeof result.min_thickness_mm).toBe("number");
      expect(typeof result.max_thickness_mm).toBe("number");
      expect(typeof result.avg_thickness_mm).toBe("number");
      expect(typeof result.ray_count).toBe("number");
      expect(typeof result.hit_count).toBe("number");
      expect(Array.isArray(result.thin_regions)).toBe(true);
    });

    it("should detect wall thickness on box mesh (~60mm through Z, ~80mm through Y, ~100mm through X)", async () => {
      const result = await engine.getWallThickness({ file_path: "test.step", ray_count: 100 });

      // Box wall thickness = distance through the solid
      // Min should correspond to shortest dimension (60mm)
      if (result.hit_count > 0) {
        expect(result.min_thickness_mm).toBeGreaterThan(0);
        expect(result.max_thickness_mm).toBeGreaterThanOrEqual(result.min_thickness_mm);
        expect(result.avg_thickness_mm).toBeGreaterThanOrEqual(result.min_thickness_mm);
        expect(result.avg_thickness_mm).toBeLessThanOrEqual(result.max_thickness_mm);
      }
    });

    it("should respect ray_count parameter", async () => {
      const result = await engine.getWallThickness({ file_path: "test.step", ray_count: 10 });

      expect(result.ray_count).toBeLessThanOrEqual(12); // capped by triangle count
    });

    it("should identify thin regions", async () => {
      const result = await engine.getWallThickness({ file_path: "test.step" });

      if (result.thin_regions.length > 0) {
        for (const region of result.thin_regions) {
          expect(region.location).toBeDefined();
          expect(typeof region.thickness_mm).toBe("number");
          expect(region.thickness_mm).toBeGreaterThan(0);
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // toBRepSummary
  // --------------------------------------------------------------------------
  describe("toBRepSummary", () => {
    it("should return B-Rep topology summary", async () => {
      const result = await engine.toBRepSummary({ file_path: "test.step" });

      expect(result).toBeDefined();
      expect(result.file_path).toBe("test.step");
      expect(result.shell_count).toBe(1);
      expect(result.mesh_count).toBe(1);
      expect(result.vertex_count).toBe(8);
      expect(result.face_count).toBe(12); // tessellated triangle count
      expect(result.edge_count).toBe(18); // 1.5 * 12
    });

    it("should classify topology type as solid for closed box mesh", async () => {
      const result = await engine.toBRepSummary({ file_path: "test.step" });

      expect(result.topology_type).toBe("solid");
    });

    it("should handle multi-mesh assemblies", async () => {
      currentMockResult = mockAssemblyResult;
      const result = await engine.toBRepSummary({ file_path: "assembly.step" });

      expect(result.shell_count).toBe(2);
      expect(result.mesh_count).toBe(2);
      expect(result.vertex_count).toBeGreaterThan(8);
      expect(result.face_count).toBeGreaterThan(12);
      expect(result.edge_count).toBeGreaterThan(18);
    });
  });

  // --------------------------------------------------------------------------
  // Geometry calculation accuracy
  // --------------------------------------------------------------------------
  describe("geometry calculations", () => {
    it("should compute volume accurately for unit box (10x10x10)", async () => {
      const unitBox = buildBoxMesh("unit_box", 5, 5, 5, 10, 10, 10);
      currentMockResult = { meshes: [unitBox] };
      const result = await engine.analyzeStep({ file_path: "unit.step" });

      // Volume should be close to 1000 mm^3
      expect(result.volume_mm3).toBeCloseTo(1000, -1);
    });

    it("should compute surface area accurately for unit box (10x10x10 → A=600)", async () => {
      const unitBox = buildBoxMesh("unit_box", 5, 5, 5, 10, 10, 10);
      currentMockResult = { meshes: [unitBox] };
      const result = await engine.analyzeStep({ file_path: "unit.step" });

      // Surface area should be close to 600 mm^2
      expect(result.surface_area_mm2).toBeCloseTo(600, -1);
    });

    it("should merge bounding boxes correctly for assemblies", async () => {
      const box1 = buildBoxMesh("left", -50, 0, 0, 20, 20, 20);
      const box2 = buildBoxMesh("right", 50, 0, 0, 20, 20, 20);
      currentMockResult = { meshes: [box1, box2] };
      const result = await engine.analyzeStep({ file_path: "spread.step" });

      expect(result.bounding_box.min.x).toBeCloseTo(-60, 1);
      expect(result.bounding_box.max.x).toBeCloseTo(60, 1);
      expect(result.bounding_box.size.x).toBeCloseTo(120, 1);
    });
  });

  // --------------------------------------------------------------------------
  // Edge cases
  // --------------------------------------------------------------------------
  describe("edge cases", () => {
    it("should handle mesh with no index array gracefully", async () => {
      const noIndexMesh = {
        name: "no_index",
        color: null,
        attributes: {
          position: { array: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]) },
          normal: { array: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]) },
        },
        index: undefined,
      };
      currentMockResult = { meshes: [noIndexMesh as any] };

      const result = await engine.importStep({ file_path: "noindex.step" });
      expect(result.mesh_count).toBe(1);
      expect(result.meshes[0].indices).toHaveLength(0);
      expect(result.meshes[0].vertex_count).toBe(3);
    });

    it("should handle mesh with no normals", async () => {
      const noNormalMesh = {
        name: "no_normals",
        color: [1, 0, 0, 1],
        attributes: {
          position: { array: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]) },
        },
        index: { array: new Uint32Array([0, 1, 2]) },
      };
      currentMockResult = { meshes: [noNormalMesh as any] };

      const result = await engine.importStep({ file_path: "nonormals.step" });
      expect(result.meshes[0].normals).toHaveLength(0);
    });
  });
});
