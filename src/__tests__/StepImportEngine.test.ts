/**
 * StepImportEngine — comprehensive tests
 *
 * Mocks occt-import-js WASM module and fs to test all public methods:
 *   importStep, analyzeStep, extractFeatures, getWallThickness, toBRepSummary
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Helper: build a simple cube mesh (8 vertices, 12 triangles)
// ---------------------------------------------------------------------------
function makeCubeMesh(size = 10, name = "cube") {
  const h = size / 2;
  const positions = [
    -h, -h, -h,   h, -h, -h,   h,  h, -h,  -h,  h, -h,
    -h, -h,  h,   h, -h,  h,   h,  h,  h,  -h,  h,  h,
  ];
  const indices = [
    0, 1, 2,  0, 2, 3,   // -Z
    4, 6, 5,  4, 7, 6,   // +Z
    0, 5, 1,  0, 4, 5,   // -Y
    2, 7, 3,  2, 6, 7,   // +Y
    0, 3, 7,  0, 7, 4,   // -X
    1, 5, 6,  1, 6, 2,   // +X
  ];
  const normals = positions.map(() => 0);
  return {
    name,
    color: [0.5, 0.5, 0.5, 1.0] as [number, number, number, number],
    attributes: {
      position: { array: new Float32Array(positions) },
      normal: { array: new Float32Array(normals) },
    },
    index: { array: new Uint32Array(indices) },
  };
}

/**
 * Build a cylinder-ish mesh along the Z axis.
 */
function makeCylinderMesh(radius = 5, height = 20, segments = 24, name = "cylinder", inner = false) {
  const positions: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  for (let ring = 0; ring <= 1; ring++) {
    const z = ring === 0 ? -height / 2 : height / 2;
    for (let s = 0; s < segments; s++) {
      const angle = (2 * Math.PI * s) / segments;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      positions.push(x, y, z);
      const sign = inner ? -1 : 1;
      normals.push(sign * Math.cos(angle), sign * Math.sin(angle), 0);
    }
  }
  for (let s = 0; s < segments; s++) {
    const s1 = (s + 1) % segments;
    indices.push(s, s1, s1 + segments);
    indices.push(s, s1 + segments, s + segments);
  }
  return {
    name,
    color: null,
    attributes: {
      position: { array: new Float32Array(positions) },
      normal: { array: new Float32Array(normals) },
    },
    index: { array: new Uint32Array(indices) },
  };
}

// ---------------------------------------------------------------------------
// Hoisted mocks — vi.hoisted runs before vi.mock
// ---------------------------------------------------------------------------
const { mockReadStepFile, mockExistsSync, mockReadFileSync, mockStatSync } = vi.hoisted(() => ({
  mockReadStepFile: vi.fn(),
  mockExistsSync: vi.fn().mockReturnValue(true),
  mockReadFileSync: vi.fn().mockReturnValue(Buffer.from("FAKE-STEP")),
  mockStatSync: vi.fn().mockReturnValue({ size: 12345 }),
}));

vi.mock("occt-import-js", () => {
  const init = vi.fn().mockImplementation(async () => ({
    ReadStepFile: mockReadStepFile,
  }));
  return { default: init };
});

vi.mock("fs", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    statSync: mockStatSync,
  };
});

// Import engine AFTER mocks
import { StepImportEngine } from "../engines/StepImportEngine";

describe("StepImportEngine", () => {
  let engine: StepImportEngine;

  beforeEach(() => {
    engine = new StepImportEngine();
    vi.clearAllMocks();
    mockReadStepFile.mockReturnValue({ meshes: [makeCubeMesh()] });
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(Buffer.from("FAKE"));
    mockStatSync.mockReturnValue({ size: 12345 });
  });

  // =========================================================================
  // importStep
  // =========================================================================
  describe("importStep", () => {
    it("should return mesh data for a valid STEP file", async () => {
      const result = await engine.importStep({ file_path: "test.step" });
      expect(result.file_path).toBe("test.step");
      expect(result.mesh_count).toBe(1);
      expect(result.total_vertices).toBe(8);
      expect(result.total_triangles).toBe(12);
      expect(result.meshes).toHaveLength(1);
      expect(result.meshes[0].name).toBe("cube");
    });

    it("should compute correct bounding box", async () => {
      const result = await engine.importStep({ file_path: "test.step" });
      const bb = result.bounding_box;
      expect(bb.min.x).toBeCloseTo(-5);
      expect(bb.max.x).toBeCloseTo(5);
      expect(bb.size.x).toBeCloseTo(10);
      expect(bb.size.y).toBeCloseTo(10);
      expect(bb.size.z).toBeCloseTo(10);
    });

    it("should handle multiple meshes (assembly)", async () => {
      mockReadStepFile.mockReturnValue({
        meshes: [makeCubeMesh(10, "part_A"), makeCubeMesh(4, "part_B")],
      });
      const result = await engine.importStep({ file_path: "assembly.step" });
      expect(result.mesh_count).toBe(2);
      expect(result.total_vertices).toBe(16);
      expect(result.total_triangles).toBe(24);
      expect(result.meshes[0].name).toBe("part_A");
      expect(result.meshes[1].name).toBe("part_B");
    });

    it("should handle mesh with color as array", async () => {
      const result = await engine.importStep({ file_path: "test.step" });
      expect(result.meshes[0].color).toEqual({ r: 0.5, g: 0.5, b: 0.5, a: 1 });
    });

    it("should handle mesh with color as object", async () => {
      const mesh = makeCubeMesh();
      (mesh as any).color = { r: 1, g: 0, b: 0, a: 0.8 };
      mockReadStepFile.mockReturnValue({ meshes: [mesh] });
      const result = await engine.importStep({ file_path: "test.step" });
      expect(result.meshes[0].color).toEqual({ r: 1, g: 0, b: 0, a: 0.8 });
    });

    it("should handle mesh with no color", async () => {
      const mesh = makeCubeMesh();
      mesh.color = null as any;
      mockReadStepFile.mockReturnValue({ meshes: [mesh] });
      const result = await engine.importStep({ file_path: "test.step" });
      expect(result.meshes[0].color).toBeNull();
    });

    it("should assign default names to unnamed meshes", async () => {
      const mesh = makeCubeMesh();
      (mesh as any).name = "";
      mockReadStepFile.mockReturnValue({ meshes: [mesh] });
      const result = await engine.importStep({ file_path: "test.step" });
      expect(result.meshes[0].name).toBe("mesh_0");
    });

    it("should throw when STEP file not found", async () => {
      mockExistsSync.mockReturnValue(false);
      await expect(engine.importStep({ file_path: "missing.step" })).rejects.toThrow(
        /STEP file not found/
      );
    });

    it("should throw when ReadStepFile returns null", async () => {
      mockReadStepFile.mockReturnValue(null);
      await expect(engine.importStep({ file_path: "bad.step" })).rejects.toThrow(
        /Failed to parse STEP file/
      );
    });

    it("should handle mesh with no index array", async () => {
      const mesh = makeCubeMesh();
      delete (mesh as any).index;
      mockReadStepFile.mockReturnValue({ meshes: [mesh] });
      const result = await engine.importStep({ file_path: "test.step" });
      expect(result.meshes[0].indices).toEqual([]);
      expect(result.meshes[0].triangle_count).toBe(0);
    });

    it("should handle mesh with no normals", async () => {
      const mesh = makeCubeMesh();
      delete (mesh as any).attributes.normal;
      mockReadStepFile.mockReturnValue({ meshes: [mesh] });
      const result = await engine.importStep({ file_path: "test.step" });
      expect(result.meshes[0].normals).toEqual([]);
    });
  });

  // =========================================================================
  // analyzeStep
  // =========================================================================
  describe("analyzeStep", () => {
    it("should return file size and mesh metadata", async () => {
      const result = await engine.analyzeStep({ file_path: "test.step" });
      expect(result.file_size_bytes).toBe(12345);
      expect(result.mesh_count).toBe(1);
      expect(result.part_count).toBe(1);
    });

    it("should compute volume and surface area for a cube", async () => {
      const result = await engine.analyzeStep({ file_path: "test.step" });
      expect(result.volume_mm3).toBeCloseTo(1000, 0);
      expect(result.surface_area_mm2).toBeCloseTo(600, 0);
    });

    it("should estimate edges via Euler formula", async () => {
      const result = await engine.analyzeStep({ file_path: "test.step" });
      expect(result.total_edges_estimate).toBe(18);
    });

    it("should build assembly structure with per-part stats", async () => {
      mockReadStepFile.mockReturnValue({
        meshes: [makeCubeMesh(10, "body"), makeCubeMesh(2, "boss")],
      });
      const result = await engine.analyzeStep({ file_path: "assy.step" });
      expect(result.assembly_structure).toHaveLength(2);
      expect(result.assembly_structure[0].name).toBe("body");
      expect(result.assembly_structure[1].name).toBe("boss");
      expect(result.assembly_structure[0].volume_mm3).toBeGreaterThan(
        result.assembly_structure[1].volume_mm3
      );
    });

    it("should handle statSync failure gracefully", async () => {
      mockStatSync.mockImplementation(() => { throw new Error("no stat"); });
      const result = await engine.analyzeStep({ file_path: "test.step" });
      expect(result.file_size_bytes).toBe(0);
    });

    it("should handle mesh with no indices (zero volume/area)", async () => {
      const mesh = makeCubeMesh();
      delete (mesh as any).index;
      mockReadStepFile.mockReturnValue({ meshes: [mesh] });
      const result = await engine.analyzeStep({ file_path: "test.step" });
      expect(result.volume_mm3).toBe(0);
      expect(result.surface_area_mm2).toBe(0);
    });
  });

  // =========================================================================
  // extractFeatures
  // =========================================================================
  describe("extractFeatures", () => {
    it("should return feature summary for a cube", async () => {
      const result = await engine.extractFeatures({ file_path: "test.step" });
      expect(result.file_path).toBe("test.step");
      expect(result.feature_summary).toBeDefined();
      expect(typeof result.feature_summary.holes).toBe("number");
      expect(typeof result.feature_summary.planar_faces).toBe("number");
    });

    it("should detect planar faces on a cube", async () => {
      const result = await engine.extractFeatures({ file_path: "test.step" });
      expect(result.planar_faces.length).toBeGreaterThanOrEqual(1);
      for (const face of result.planar_faces) {
        expect(face.area_mm2).toBeGreaterThan(0);
        expect(face.normal).toBeDefined();
        expect(face.centroid).toBeDefined();
      }
    });

    it("should detect cylindrical faces from a cylinder mesh", async () => {
      mockReadStepFile.mockReturnValue({
        meshes: [makeCylinderMesh(5, 20, 24, "outer_cyl", false)],
      });
      const result = await engine.extractFeatures({ file_path: "cyl.step" });
      expect(result.cylindrical_faces.length).toBeGreaterThanOrEqual(1);
      if (result.cylindrical_faces.length > 0) {
        const cyl = result.cylindrical_faces[0];
        expect(cyl.radius_mm).toBeGreaterThan(0);
        expect(cyl.height_mm).toBeGreaterThan(0);
      }
    });

    it("should detect holes from inner cylindrical faces", async () => {
      mockReadStepFile.mockReturnValue({
        meshes: [makeCylinderMesh(3, 30, 24, "hole", true)],
      });
      const result = await engine.extractFeatures({ file_path: "hole.step" });
      expect(result.feature_summary.holes).toBeDefined();
    });

    it("should return empty arrays for empty mesh", async () => {
      mockReadStepFile.mockReturnValue({
        meshes: [{
          name: "empty",
          color: null,
          attributes: { position: { array: new Float32Array([]) } },
        }],
      });
      const result = await engine.extractFeatures({ file_path: "empty.step" });
      expect(result.holes).toEqual([]);
      expect(result.pockets).toEqual([]);
      expect(result.slots).toEqual([]);
      expect(result.fillets).toEqual([]);
      expect(result.chamfers).toEqual([]);
    });

    it("should populate feature_summary with correct keys", async () => {
      const result = await engine.extractFeatures({ file_path: "test.step" });
      const keys = Object.keys(result.feature_summary);
      expect(keys).toContain("holes");
      expect(keys).toContain("pockets");
      expect(keys).toContain("slots");
      expect(keys).toContain("planar_faces");
      expect(keys).toContain("cylindrical_faces");
      expect(keys).toContain("fillets");
      expect(keys).toContain("chamfers");
    });
  });

  // =========================================================================
  // getWallThickness
  // =========================================================================
  describe("getWallThickness", () => {
    it("should return wall thickness results for a cube", async () => {
      const result = await engine.getWallThickness({ file_path: "test.step" });
      expect(result.file_path).toBe("test.step");
      expect(result.ray_count).toBeGreaterThan(0);
      expect(typeof result.min_thickness_mm).toBe("number");
      expect(typeof result.max_thickness_mm).toBe("number");
      expect(typeof result.avg_thickness_mm).toBe("number");
    });

    it("should respect custom ray_count", async () => {
      const result = await engine.getWallThickness({ file_path: "test.step", ray_count: 5 });
      expect(result.ray_count).toBeLessThanOrEqual(5);
    });

    it("should return zeros when no ray hits (empty mesh)", async () => {
      mockReadStepFile.mockReturnValue({
        meshes: [{
          name: "empty",
          color: null,
          attributes: { position: { array: new Float32Array([]) } },
        }],
      });
      const result = await engine.getWallThickness({ file_path: "empty.step" });
      expect(result.min_thickness_mm).toBe(0);
      expect(result.max_thickness_mm).toBe(0);
      expect(result.avg_thickness_mm).toBe(0);
      expect(result.thin_regions).toEqual([]);
    });

    it("should satisfy min <= avg <= max invariant", async () => {
      const result = await engine.getWallThickness({ file_path: "test.step" });
      if (result.hit_count > 0) {
        expect(result.min_thickness_mm).toBeLessThanOrEqual(result.max_thickness_mm);
        expect(result.avg_thickness_mm).toBeGreaterThanOrEqual(result.min_thickness_mm);
        expect(result.avg_thickness_mm).toBeLessThanOrEqual(result.max_thickness_mm);
      }
    });

    it("should cap thin_regions to 20 entries max", async () => {
      const result = await engine.getWallThickness({ file_path: "test.step" });
      expect(result.thin_regions.length).toBeLessThanOrEqual(20);
    });
  });

  // =========================================================================
  // toBRepSummary
  // =========================================================================
  describe("toBRepSummary", () => {
    it("should return B-Rep summary for a solid cube", async () => {
      const result = await engine.toBRepSummary({ file_path: "test.step" });
      expect(result.file_path).toBe("test.step");
      expect(result.shell_count).toBe(1);
      expect(result.mesh_count).toBe(1);
      expect(result.vertex_count).toBe(8);
      expect(result.face_count).toBe(12);
      expect(result.edge_count).toBe(18);
      expect(result.topology_type).toBe("solid");
    });

    it("should detect sheet topology when volume/area ratio is tiny", async () => {
      const positions = [0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0];
      const indices = [0, 1, 2, 0, 2, 3];
      mockReadStepFile.mockReturnValue({
        meshes: [{
          name: "sheet",
          color: null,
          attributes: {
            position: { array: new Float32Array(positions) },
            normal: { array: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]) },
          },
          index: { array: new Uint32Array(indices) },
        }],
      });
      const result = await engine.toBRepSummary({ file_path: "sheet.step" });
      expect(result.topology_type).toBe("sheet");
    });

    it("should detect mixed topology with both solid and sheet meshes", async () => {
      const solidMesh = makeCubeMesh(10, "solid_part");
      const sheetMesh = {
        name: "sheet_part",
        color: null,
        attributes: {
          position: { array: new Float32Array([0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0]) },
          normal: { array: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]) },
        },
        index: { array: new Uint32Array([0, 1, 2, 0, 2, 3]) },
      };
      mockReadStepFile.mockReturnValue({ meshes: [solidMesh, sheetMesh] });
      const result = await engine.toBRepSummary({ file_path: "mixed.step" });
      expect(result.topology_type).toBe("mixed");
      expect(result.shell_count).toBe(2);
    });

    it("should detect wire topology when no triangles present", async () => {
      mockReadStepFile.mockReturnValue({
        meshes: [{
          name: "wire",
          color: null,
          attributes: {
            position: { array: new Float32Array([0, 0, 0, 1, 0, 0]) },
            normal: { array: new Float32Array([0, 0, 0, 0, 0, 0]) },
          },
          index: { array: new Uint32Array([]) },
        }],
      });
      const result = await engine.toBRepSummary({ file_path: "wire.step" });
      expect(result.topology_type).toBe("wire");
      expect(result.face_count).toBe(0);
    });

    it("should handle multiple shells", async () => {
      mockReadStepFile.mockReturnValue({
        meshes: [makeCubeMesh(10, "a"), makeCubeMesh(5, "b"), makeCubeMesh(2, "c")],
      });
      const result = await engine.toBRepSummary({ file_path: "multi.step" });
      expect(result.shell_count).toBe(3);
      expect(result.mesh_count).toBe(3);
      expect(result.vertex_count).toBe(24);
    });
  });

  // =========================================================================
  // Edge cases & error handling
  // =========================================================================
  describe("error handling", () => {
    it("should throw when ReadStepFile returns object without meshes", async () => {
      mockReadStepFile.mockReturnValue({ meshes: undefined });
      await expect(engine.importStep({ file_path: "bad.step" })).rejects.toThrow(
        /Failed to parse STEP file/
      );
    });

    it("should handle empty meshes array gracefully", async () => {
      mockReadStepFile.mockReturnValue({ meshes: [] });
      const result = await engine.importStep({ file_path: "empty.step" });
      expect(result.mesh_count).toBe(0);
      expect(result.total_vertices).toBe(0);
      expect(result.total_triangles).toBe(0);
    });

    it("should handle bounding box for empty positions", async () => {
      mockReadStepFile.mockReturnValue({
        meshes: [{
          name: "empty",
          color: null,
          attributes: { position: { array: new Float32Array([]) } },
        }],
      });
      const result = await engine.importStep({ file_path: "empty.step" });
      expect(result.bounding_box.min).toEqual({ x: 0, y: 0, z: 0 });
      expect(result.bounding_box.max).toEqual({ x: 0, y: 0, z: 0 });
      expect(result.bounding_box.size).toEqual({ x: 0, y: 0, z: 0 });
    });
  });
});
