/**
 * StlWriterEngine — CAD-UNIVERSAL-CONTROL-MS0 / U-CUC11
 *
 * Pure-JS STL writer that converts 2D polygons to 3D meshes by extrusion.
 * Closes the STL write gap (classification "gap" in CAD_COVERAGE_MATRIX).
 *
 * Formats supported:
 *   - ASCII STL (human-readable, larger files)
 *   - Binary STL (compact, industry standard)
 *
 * Extrusion strategy:
 *   - Takes Polygon2D[] and extrudes along Z by a given thickness
 *   - Creates top face, bottom face, and side walls
 *   - Triangulates polygons using ear-clipping for convex/concave support
 *
 * Round-trip: STL files written here can be imported into any CAD/CAM
 * system (Fusion360, SolidWorks, Mastercam, etc.) for machining.
 */

import type { Polygon2D, Point2D } from "./DXFParserEngine.js";

export interface StlWriteOptions {
  /** Extrusion thickness in mm. Default 1.0. */
  thickness?: number;
  /** Output format. Default "ascii". */
  format?: "ascii" | "binary";
  /** Solid name for ASCII STL. Default "polygon_extrusion". */
  solidName?: string;
  /** Decimal places for ASCII coords. Default 6. */
  precision?: number;
}

export interface StlWriteResult {
  /** STL content (string for ASCII, Uint8Array for binary) */
  data: string | Uint8Array;
  /** File size in bytes */
  bytes: number;
  /** Number of triangles in mesh */
  triangle_count: number;
  /** Number of input polygons */
  polygon_count: number;
  /** Format used */
  format: "ascii" | "binary";
  /** Source attribution */
  source: string;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Triangle {
  v1: Vec3;
  v2: Vec3;
  v3: Vec3;
  normal: Vec3;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len < 1e-12) return { x: 0, y: 0, z: 1 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function computeNormal(v1: Vec3, v2: Vec3, v3: Vec3): Vec3 {
  const edge1 = sub(v2, v1);
  const edge2 = sub(v3, v1);
  return normalize(cross(edge1, edge2));
}

/**
 * Simple ear-clipping triangulation for 2D polygons.
 * Returns indices into the vertex array forming triangles.
 */
function triangulatePolygon(vertices: Point2D[]): number[][] {
  if (vertices.length < 3) return [];
  if (vertices.length === 3) return [[0, 1, 2]];

  const triangles: number[][] = [];
  const indices = vertices.map((_, i) => i);

  // Compute polygon winding (positive = CCW, negative = CW)
  let signedArea = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    signedArea += vertices[i].x * vertices[j].y;
    signedArea -= vertices[j].x * vertices[i].y;
  }
  const isCCW = signedArea > 0;

  function isEar(prev: number, curr: number, next: number): boolean {
    const a = vertices[indices[prev]];
    const b = vertices[indices[curr]];
    const c = vertices[indices[next]];

    // Check if triangle is CCW (valid ear for CCW polygon)
    const cross2d = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    if ((isCCW && cross2d <= 0) || (!isCCW && cross2d >= 0)) return false;

    // Check if any other vertex is inside this triangle
    for (let i = 0; i < indices.length; i++) {
      if (i === prev || i === curr || i === next) continue;
      const p = vertices[indices[i]];
      if (pointInTriangle(p, a, b, c)) return false;
    }
    return true;
  }

  function pointInTriangle(p: Point2D, a: Point2D, b: Point2D, c: Point2D): boolean {
    const d1 = sign(p, a, b);
    const d2 = sign(p, b, c);
    const d3 = sign(p, c, a);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
  }

  function sign(p1: Point2D, p2: Point2D, p3: Point2D): number {
    return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  }

  let safety = indices.length * indices.length;
  while (indices.length > 3 && safety-- > 0) {
    let earFound = false;
    for (let i = 0; i < indices.length; i++) {
      const prev = (i - 1 + indices.length) % indices.length;
      const next = (i + 1) % indices.length;
      if (isEar(prev, i, next)) {
        triangles.push([indices[prev], indices[i], indices[next]]);
        indices.splice(i, 1);
        earFound = true;
        break;
      }
    }
    if (!earFound) break;
  }

  if (indices.length === 3) {
    triangles.push([indices[0], indices[1], indices[2]]);
  }

  return triangles;
}

class StlWriterEngine {
  /**
   * Extrude 2D polygons to 3D and write as STL.
   */
  writePolygonsToStl(
    polygons: Polygon2D[],
    options: StlWriteOptions = {}
  ): StlWriteResult {
    if (!Array.isArray(polygons) || polygons.length === 0) {
      throw new Error("StlWriter: polygons must be a non-empty array");
    }

    const thickness = options.thickness ?? 1.0;
    const format = options.format ?? "ascii";
    const solidName = options.solidName ?? "polygon_extrusion";
    const precision = Math.max(0, Math.min(options.precision ?? 6, 15));

    if (thickness <= 0) {
      throw new Error(`StlWriter: thickness must be positive, got ${thickness}`);
    }

    // Collect all triangles from all polygons
    const allTriangles: Triangle[] = [];

    for (const poly of polygons) {
      if (!poly.vertices || poly.vertices.length < 3) continue;

      const verts = poly.vertices;
      const triIndices = triangulatePolygon(verts);

      // Top face (z = thickness)
      for (const [i0, i1, i2] of triIndices) {
        const v1: Vec3 = { x: verts[i0].x, y: verts[i0].y, z: thickness };
        const v2: Vec3 = { x: verts[i1].x, y: verts[i1].y, z: thickness };
        const v3: Vec3 = { x: verts[i2].x, y: verts[i2].y, z: thickness };
        allTriangles.push({ v1, v2, v3, normal: computeNormal(v1, v2, v3) });
      }

      // Bottom face (z = 0, reversed winding)
      for (const [i0, i1, i2] of triIndices) {
        const v1: Vec3 = { x: verts[i0].x, y: verts[i0].y, z: 0 };
        const v2: Vec3 = { x: verts[i2].x, y: verts[i2].y, z: 0 };
        const v3: Vec3 = { x: verts[i1].x, y: verts[i1].y, z: 0 };
        allTriangles.push({ v1, v2, v3, normal: computeNormal(v1, v2, v3) });
      }

      // Side walls (vertical quads triangulated)
      for (let i = 0; i < verts.length; i++) {
        const j = (i + 1) % verts.length;
        const p0 = verts[i];
        const p1 = verts[j];

        // Two triangles per side quad
        const bl: Vec3 = { x: p0.x, y: p0.y, z: 0 };
        const br: Vec3 = { x: p1.x, y: p1.y, z: 0 };
        const tl: Vec3 = { x: p0.x, y: p0.y, z: thickness };
        const tr: Vec3 = { x: p1.x, y: p1.y, z: thickness };

        // Triangle 1: bl, br, tr
        allTriangles.push({
          v1: bl,
          v2: br,
          v3: tr,
          normal: computeNormal(bl, br, tr),
        });
        // Triangle 2: bl, tr, tl
        allTriangles.push({
          v1: bl,
          v2: tr,
          v3: tl,
          normal: computeNormal(bl, tr, tl),
        });
      }
    }

    if (format === "binary") {
      return this.writeBinaryStl(allTriangles, polygons.length);
    } else {
      return this.writeAsciiStl(allTriangles, solidName, precision, polygons.length);
    }
  }

  private writeAsciiStl(
    triangles: Triangle[],
    solidName: string,
    precision: number,
    polyCount: number
  ): StlWriteResult {
    const fmt = (n: number) => n.toFixed(precision);
    const lines: string[] = [`solid ${solidName}`];

    for (const tri of triangles) {
      lines.push(`  facet normal ${fmt(tri.normal.x)} ${fmt(tri.normal.y)} ${fmt(tri.normal.z)}`);
      lines.push("    outer loop");
      lines.push(`      vertex ${fmt(tri.v1.x)} ${fmt(tri.v1.y)} ${fmt(tri.v1.z)}`);
      lines.push(`      vertex ${fmt(tri.v2.x)} ${fmt(tri.v2.y)} ${fmt(tri.v2.z)}`);
      lines.push(`      vertex ${fmt(tri.v3.x)} ${fmt(tri.v3.y)} ${fmt(tri.v3.z)}`);
      lines.push("    endloop");
      lines.push("  endfacet");
    }

    lines.push(`endsolid ${solidName}`);
    const data = lines.join("\n");

    return {
      data,
      bytes: data.length,
      triangle_count: triangles.length,
      polygon_count: polyCount,
      format: "ascii",
      source: "StlWriterEngine.writePolygonsToStl (ASCII)",
    };
  }

  private writeBinaryStl(
    triangles: Triangle[],
    polyCount: number
  ): StlWriteResult {
    // Binary STL: 80-byte header + 4-byte triangle count + 50 bytes per triangle
    const bufferSize = 80 + 4 + triangles.length * 50;
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    // Header (80 bytes, can be anything)
    const header = "Binary STL from StlWriterEngine";
    for (let i = 0; i < 80; i++) {
      view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
    }

    // Triangle count
    view.setUint32(80, triangles.length, true);

    // Triangles (50 bytes each: 12 floats + 2 byte attribute)
    let offset = 84;
    for (const tri of triangles) {
      // Normal
      view.setFloat32(offset, tri.normal.x, true); offset += 4;
      view.setFloat32(offset, tri.normal.y, true); offset += 4;
      view.setFloat32(offset, tri.normal.z, true); offset += 4;
      // Vertex 1
      view.setFloat32(offset, tri.v1.x, true); offset += 4;
      view.setFloat32(offset, tri.v1.y, true); offset += 4;
      view.setFloat32(offset, tri.v1.z, true); offset += 4;
      // Vertex 2
      view.setFloat32(offset, tri.v2.x, true); offset += 4;
      view.setFloat32(offset, tri.v2.y, true); offset += 4;
      view.setFloat32(offset, tri.v2.z, true); offset += 4;
      // Vertex 3
      view.setFloat32(offset, tri.v3.x, true); offset += 4;
      view.setFloat32(offset, tri.v3.y, true); offset += 4;
      view.setFloat32(offset, tri.v3.z, true); offset += 4;
      // Attribute byte count (unused, set to 0)
      view.setUint16(offset, 0, true); offset += 2;
    }

    const data = new Uint8Array(buffer);

    return {
      data,
      bytes: bufferSize,
      triangle_count: triangles.length,
      polygon_count: polyCount,
      format: "binary",
      source: "StlWriterEngine.writePolygonsToStl (binary)",
    };
  }

  /**
   * Helper: Create a box mesh from dimensions.
   */
  boxMesh(
    width: number,
    height: number,
    depth: number,
    originX = 0,
    originY = 0,
    originZ = 0
  ): Triangle[] {
    if (width <= 0 || height <= 0 || depth <= 0) {
      throw new Error("StlWriter.boxMesh: dimensions must be positive");
    }

    const x0 = originX, y0 = originY, z0 = originZ;
    const x1 = originX + width, y1 = originY + height, z1 = originZ + depth;

    // 8 vertices of the box
    const v = [
      { x: x0, y: y0, z: z0 }, // 0: front-bottom-left
      { x: x1, y: y0, z: z0 }, // 1: front-bottom-right
      { x: x1, y: y1, z: z0 }, // 2: front-top-right
      { x: x0, y: y1, z: z0 }, // 3: front-top-left
      { x: x0, y: y0, z: z1 }, // 4: back-bottom-left
      { x: x1, y: y0, z: z1 }, // 5: back-bottom-right
      { x: x1, y: y1, z: z1 }, // 6: back-top-right
      { x: x0, y: y1, z: z1 }, // 7: back-top-left
    ];

    // 12 triangles (2 per face)
    const faces = [
      [0, 1, 2], [0, 2, 3], // front
      [5, 4, 7], [5, 7, 6], // back
      [4, 0, 3], [4, 3, 7], // left
      [1, 5, 6], [1, 6, 2], // right
      [3, 2, 6], [3, 6, 7], // top
      [4, 5, 1], [4, 1, 0], // bottom
    ];

    return faces.map(([i0, i1, i2]) => {
      const v1 = v[i0], v2 = v[i1], v3 = v[i2];
      return { v1, v2, v3, normal: computeNormal(v1, v2, v3) };
    });
  }
}

export const stlWriterEngine = new StlWriterEngine();
export { StlWriterEngine };
