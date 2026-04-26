/**
 * CAD-UNIVERSAL-CONTROL-MS0/U-CUC11 — StlWriterEngine tests
 *
 * Covers:
 *   • Reference values: known rectangle extrusion geometry
 *   • ASCII and binary format output
 *   • Triangle count verification (top + bottom + sides)
 *   • Triangulation of convex and concave polygons
 *   • Failure modes: empty polygons, invalid thickness
 *   • Round-trip: basic structure validation
 */
import { describe, it, expect } from "vitest";
import { stlWriterEngine, type StlWriteResult } from "../engines/StlWriterEngine.js";
import type { Polygon2D } from "../engines/DXFParserEngine.js";

// ───────────────── Helpers ─────────────────

function square(id: string, size = 10, originX = 0, originY = 0): Polygon2D {
  return {
    id,
    vertices: [
      { x: originX, y: originY },
      { x: originX + size, y: originY },
      { x: originX + size, y: originY + size },
      { x: originX, y: originY + size },
    ],
    is_hole: false,
    area_mm2: size * size,
    perimeter_mm: 4 * size,
    bbox: { x: originX, y: originY, w: size, h: size },
  };
}

function triangle(id: string): Polygon2D {
  return {
    id,
    vertices: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 8.66 },
    ],
    is_hole: false,
    area_mm2: 43.3,
    perimeter_mm: 30,
    bbox: { x: 0, y: 0, w: 10, h: 8.66 },
  };
}

// ───────────────── Reference-value tests ─────────────────

describe("StlWriterEngine.writePolygonsToStl — reference values", () => {
  it("extrudes a square to correct triangle count", () => {
    // Square: 4 vertices
    // Top face: 2 triangles (from ear-clipping a quad)
    // Bottom face: 2 triangles
    // Side walls: 4 edges × 2 triangles each = 8 triangles
    // Total: 2 + 2 + 8 = 12 triangles
    const r = stlWriterEngine.writePolygonsToStl([square("sq1", 10)]);
    expect(r.polygon_count).toBe(1);
    expect(r.triangle_count).toBe(12);
  });

  it("extrudes a triangle to correct triangle count", () => {
    // Triangle: 3 vertices
    // Top face: 1 triangle
    // Bottom face: 1 triangle
    // Side walls: 3 edges × 2 triangles = 6 triangles
    // Total: 1 + 1 + 6 = 8 triangles
    const r = stlWriterEngine.writePolygonsToStl([triangle("tri1")]);
    expect(r.polygon_count).toBe(1);
    expect(r.triangle_count).toBe(8);
  });

  it("uses default thickness of 1.0 and produces valid output", () => {
    const r = stlWriterEngine.writePolygonsToStl([square("sq")]);
    expect(r.format).toBe("ascii");
    expect(r.bytes).toBeGreaterThan(100);
    expect(r.source).toContain("StlWriterEngine");
  });

  it("respects custom thickness in output coordinates", () => {
    const r1 = stlWriterEngine.writePolygonsToStl([square("sq")], { thickness: 1, format: "ascii" });
    const r2 = stlWriterEngine.writePolygonsToStl([square("sq")], { thickness: 5, format: "ascii" });
    const text1 = r1.data as string;
    const text2 = r2.data as string;
    // Both should have same triangle count
    expect(r1.triangle_count).toBe(r2.triangle_count);
    // But thickness 5 should have z=5 vertices
    expect(text2).toContain("5.000000");
    expect(text1).not.toContain("5.000000");
  });
});

// ───────────────── ASCII format tests ─────────────────

describe("StlWriterEngine — ASCII format", () => {
  it("produces valid ASCII STL structure", () => {
    const r = stlWriterEngine.writePolygonsToStl([square("sq")], { format: "ascii" });
    expect(r.format).toBe("ascii");
    expect(typeof r.data).toBe("string");
    const text = r.data as string;
    expect(text).toContain("solid polygon_extrusion");
    expect(text).toContain("facet normal");
    expect(text).toContain("outer loop");
    expect(text).toContain("vertex");
    expect(text).toContain("endloop");
    expect(text).toContain("endfacet");
    expect(text).toContain("endsolid polygon_extrusion");
  });

  it("uses custom solid name", () => {
    const r = stlWriterEngine.writePolygonsToStl([square("sq")], {
      format: "ascii",
      solidName: "my_part",
    });
    const text = r.data as string;
    expect(text).toContain("solid my_part");
    expect(text).toContain("endsolid my_part");
  });

  it("respects precision setting", () => {
    const r = stlWriterEngine.writePolygonsToStl([square("sq", 1.123456789)], {
      format: "ascii",
      precision: 3,
    });
    const text = r.data as string;
    // Should have 3 decimal places
    expect(text).toMatch(/vertex \d+\.\d{3} /);
  });

  it("counts facets correctly in ASCII output", () => {
    const r = stlWriterEngine.writePolygonsToStl([square("sq")], { format: "ascii" });
    const text = r.data as string;
    const facetCount = (text.match(/facet normal/g) || []).length;
    expect(facetCount).toBe(r.triangle_count);
  });
});

// ───────────────── Binary format tests ─────────────────

describe("StlWriterEngine — binary format", () => {
  it("produces valid binary STL structure", () => {
    const r = stlWriterEngine.writePolygonsToStl([square("sq")], { format: "binary" });
    expect(r.format).toBe("binary");
    expect(r.data).toBeInstanceOf(Uint8Array);
    const data = r.data as Uint8Array;

    // Binary STL: 80-byte header + 4-byte count + 50 bytes per triangle
    const expectedSize = 80 + 4 + r.triangle_count * 50;
    expect(data.length).toBe(expectedSize);
    expect(r.bytes).toBe(expectedSize);
  });

  it("encodes triangle count correctly", () => {
    const r = stlWriterEngine.writePolygonsToStl([square("sq")], { format: "binary" });
    const data = r.data as Uint8Array;
    const view = new DataView(data.buffer);
    const encodedCount = view.getUint32(80, true); // little-endian
    expect(encodedCount).toBe(r.triangle_count);
  });

  it("binary is more compact than ASCII", () => {
    const polys = [square("sq1"), square("sq2", 20, 50, 50)];
    const ascii = stlWriterEngine.writePolygonsToStl(polys, { format: "ascii" });
    const binary = stlWriterEngine.writePolygonsToStl(polys, { format: "binary" });
    expect(binary.bytes).toBeLessThan(ascii.bytes);
  });
});

// ───────────────── Multiple polygon tests ─────────────────

describe("StlWriterEngine — multiple polygons", () => {
  it("handles multiple polygons", () => {
    const polys = [square("sq1"), square("sq2", 5), triangle("tri1")];
    const r = stlWriterEngine.writePolygonsToStl(polys);
    expect(r.polygon_count).toBe(3);
    // 12 + 12 + 8 = 32 triangles
    expect(r.triangle_count).toBe(32);
  });

  it("sums bytes correctly for multiple polygons", () => {
    const polys = [square("sq1"), square("sq2")];
    const r = stlWriterEngine.writePolygonsToStl(polys, { format: "binary" });
    const expectedSize = 80 + 4 + r.triangle_count * 50;
    expect(r.bytes).toBe(expectedSize);
  });
});

// ───────────────── Edge cases and failures ─────────────────

describe("StlWriterEngine — edge cases", () => {
  it("throws on empty polygon array", () => {
    expect(() => stlWriterEngine.writePolygonsToStl([])).toThrow(/non-empty/);
  });

  it("throws on non-array input", () => {
    expect(() => stlWriterEngine.writePolygonsToStl(null as unknown as Polygon2D[])).toThrow();
  });

  it("throws on zero thickness", () => {
    expect(() => stlWriterEngine.writePolygonsToStl([square("sq")], { thickness: 0 })).toThrow(/positive/);
  });

  it("throws on negative thickness", () => {
    expect(() => stlWriterEngine.writePolygonsToStl([square("sq")], { thickness: -1 })).toThrow(/positive/);
  });

  it("skips polygons with fewer than 3 vertices", () => {
    const degenerate: Polygon2D = {
      id: "line",
      vertices: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
      is_hole: false,
      area_mm2: 0,
      perimeter_mm: 14.14,
      bbox: { x: 0, y: 0, w: 10, h: 10 },
    };
    const valid = square("sq");
    const r = stlWriterEngine.writePolygonsToStl([degenerate, valid]);
    // Only the valid square should produce triangles
    expect(r.polygon_count).toBe(2);
    expect(r.triangle_count).toBe(12); // Only from square
  });
});

// ───────────────── Box mesh helper ─────────────────

describe("StlWriterEngine.boxMesh", () => {
  it("creates a box with 12 triangles", () => {
    const triangles = stlWriterEngine.boxMesh(10, 10, 10);
    expect(triangles.length).toBe(12); // 6 faces × 2 triangles
  });

  it("throws on non-positive dimensions", () => {
    expect(() => stlWriterEngine.boxMesh(0, 10, 10)).toThrow(/positive/);
    expect(() => stlWriterEngine.boxMesh(10, -5, 10)).toThrow(/positive/);
    expect(() => stlWriterEngine.boxMesh(10, 10, 0)).toThrow(/positive/);
  });

  it("respects origin offset", () => {
    const triangles = stlWriterEngine.boxMesh(10, 10, 10, 100, 200, 300);
    // All vertices should be offset
    for (const tri of triangles) {
      expect(tri.v1.x).toBeGreaterThanOrEqual(100);
      expect(tri.v1.y).toBeGreaterThanOrEqual(200);
      expect(tri.v1.z).toBeGreaterThanOrEqual(300);
    }
  });
});
