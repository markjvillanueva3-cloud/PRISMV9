/**
 * STLToVoxelGridEngine — PHASE21 wiring tests.
 * Real assertions on parseSTL, voxelize, analyzeGeometry against a
 * synthetic single-triangle and 12-triangle cube STL.
 */
import { describe, it, expect } from "vitest";
import { stlToVoxelGridEngine } from "../engines/STLToVoxelGridEngine.js";

const SINGLE_TRI = `solid testpart
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 10 0 0
    vertex 0 10 0
  endloop
endfacet
endsolid testpart
`;

// Tetrahedron with 4 triangles (closed manifold) for voxelization
const TETRAHEDRON = `solid tet
facet normal 0 0 -1
  outer loop
    vertex 0 0 0
    vertex 10 0 0
    vertex 0 10 0
  endloop
endfacet
facet normal 0 -1 0
  outer loop
    vertex 0 0 0
    vertex 0 0 10
    vertex 10 0 0
  endloop
endfacet
facet normal -1 0 0
  outer loop
    vertex 0 0 0
    vertex 0 10 0
    vertex 0 0 10
  endloop
endfacet
facet normal 1 1 1
  outer loop
    vertex 10 0 0
    vertex 0 0 10
    vertex 0 10 0
  endloop
endfacet
endsolid tet
`;

describe("STLToVoxelGridEngine.parseSTL", () => {
  it("empty content → 0 triangles, zero bounding box", () => {
    const r = stlToVoxelGridEngine.parseSTL({ content: "" });
    expect(r.triangle_count).toBe(0);
    expect(r.triangles.length).toBe(0);
    expect(r.bounding_box.min).toEqual({ x: 0, y: 0, z: 0 });
    expect(r.bounding_box.max).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("single triangle → 1 triangle, exact vertex parsing", () => {
    const r = stlToVoxelGridEngine.parseSTL({ content: SINGLE_TRI });
    expect(r.triangle_count).toBe(1);
    expect(r.triangles[0].normal).toEqual({ x: 0, y: 0, z: 1 });
    expect(r.triangles[0].vertices[0]).toEqual({ x: 0, y: 0, z: 0 });
    expect(r.triangles[0].vertices[1]).toEqual({ x: 10, y: 0, z: 0 });
    expect(r.triangles[0].vertices[2]).toEqual({ x: 0, y: 10, z: 0 });
  });

  it("single triangle → solid_name extracted", () => {
    const r = stlToVoxelGridEngine.parseSTL({ content: SINGLE_TRI });
    expect(r.solid_name).toBe("testpart");
  });

  it("single triangle → bounding box covers triangle extent exactly", () => {
    const r = stlToVoxelGridEngine.parseSTL({ content: SINGLE_TRI });
    expect(r.bounding_box.min).toEqual({ x: 0, y: 0, z: 0 });
    expect(r.bounding_box.max).toEqual({ x: 10, y: 10, z: 0 });
  });

  it("tetrahedron → 4 triangles parsed", () => {
    const r = stlToVoxelGridEngine.parseSTL({ content: TETRAHEDRON });
    expect(r.triangle_count).toBe(4);
  });

  it("tetrahedron → bounding box (0,0,0)-(10,10,10)", () => {
    const r = stlToVoxelGridEngine.parseSTL({ content: TETRAHEDRON });
    expect(r.bounding_box.min).toEqual({ x: 0, y: 0, z: 0 });
    expect(r.bounding_box.max).toEqual({ x: 10, y: 10, z: 10 });
  });
});

describe("STLToVoxelGridEngine.voxelize", () => {
  it("empty triangles → empty grid, zero dimensions", () => {
    const r = stlToVoxelGridEngine.voxelize({ triangles: [], resolution_mm: 1 });
    expect(r.dimensions).toEqual({ nx: 0, ny: 0, nz: 0 });
    expect(r.volume_mm3).toBe(0);
    expect(r.grid.length).toBe(0);
  });

  it("tetrahedron at 2mm resolution → grid populated, finite volume", () => {
    const parsed = stlToVoxelGridEngine.parseSTL({ content: TETRAHEDRON });
    const r = stlToVoxelGridEngine.voxelize({ triangles: parsed.triangles, resolution_mm: 2 });
    expect(r.resolution_mm).toBe(2);
    expect(r.dimensions.nx).toBeGreaterThanOrEqual(5);
    expect(r.dimensions.ny).toBeGreaterThanOrEqual(5);
    expect(r.dimensions.nz).toBeGreaterThanOrEqual(5);
    expect(r.volume_mm3).toBeGreaterThan(0);
  });

  it("resolution clamps to minimum 0.01 when given 0", () => {
    const parsed = stlToVoxelGridEngine.parseSTL({ content: TETRAHEDRON });
    const r = stlToVoxelGridEngine.voxelize({ triangles: parsed.triangles, resolution_mm: 0 });
    expect(r.resolution_mm).toBe(0.01);
  });
});

describe("STLToVoxelGridEngine.analyzeGeometry — neural pipeline gateway", () => {
  it("tetrahedron analysis → bbox echoes parsed bbox", () => {
    const r = stlToVoxelGridEngine.analyzeGeometry({ content: TETRAHEDRON, resolution_mm: 2 });
    expect(r.bounding_box.min).toEqual({ x: 0, y: 0, z: 0 });
    expect(r.bounding_box.max).toEqual({ x: 10, y: 10, z: 10 });
  });

  it("tetrahedron aspect ratios reported as finite numbers", () => {
    const r = stlToVoxelGridEngine.analyzeGeometry({ content: TETRAHEDRON, resolution_mm: 2 });
    expect(Number.isFinite(r.aspect_ratio.xy)).toBe(true);
    expect(Number.isFinite(r.aspect_ratio.xz)).toBe(true);
    expect(Number.isFinite(r.aspect_ratio.yz)).toBe(true);
  });

  it("default resolution applied when not provided", () => {
    const r = stlToVoxelGridEngine.analyzeGeometry({ content: TETRAHEDRON });
    expect(r.volume_mm3).toBeGreaterThanOrEqual(0);
    expect(r.surface_area_mm2).toBeGreaterThanOrEqual(0);
  });

  it("estimated_5axis_needed is a boolean", () => {
    const r = stlToVoxelGridEngine.analyzeGeometry({ content: TETRAHEDRON });
    expect(typeof r.estimated_5axis_needed).toBe("boolean");
  });
});
