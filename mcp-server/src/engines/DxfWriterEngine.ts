/**
 * DxfWriterEngine — CAD-INPUT-MS0 / write-side closure for .dxf.
 *
 * Writes `Polygon2D[]` (from DXFParserEngine or any 2D source) to
 * valid ASCII DXF R12. Closes the 1,445-file write gap identified in
 * the CAD coverage matrix (gapExts: .dxf).
 *
 * Entities emitted:
 *   - LWPOLYLINE (group code 70 flag 1 = closed) for every polygon.
 *     Each vertex is emitted as (10, x) / (20, y) pairs.
 *   - Outer polygons → layer "0"   (canonical default).
 *   - Holes          → layer "HOLES" (so downstream ingesters can
 *                      classify without a separate winding-number pass).
 *
 * File structure (minimal but valid R12):
 *   SECTION / HEADER       — just $ACADVER + $INSBASE
 *   SECTION / TABLES       — LAYER table with "0" and "HOLES"
 *   SECTION / ENTITIES     — LWPOLYLINE per polygon
 *   EOF
 *
 * Round-trip: every polygon written by writePolygonsToDxf(ps) must
 * be recoverable by DXFParserEngine.parseDXF() with vertex count and
 * positions preserved to float precision.
 *
 * This engine is the shipped source of truth — dispatcher actions
 * `dxf_write_polygons` and `dxf_parse` delegate here. Tests import
 * directly AND invoke through the dispatcher.
 */
import type { Polygon2D, Point2D } from "./DXFParserEngine.js";

export interface DxfWriteOptions {
  /** Layer name for outer polygons. Default "0". */
  outer_layer?: string;
  /** Layer name for inner/hole polygons. Default "HOLES". */
  hole_layer?: string;
  /** AutoCAD version string in $ACADVER. Default "AC1009" (R12). */
  acadver?: string;
  /** Decimal places for coordinates. Default 6. */
  precision?: number;
}

export interface DxfWriteResult {
  dxf: string;
  bytes: number;
  polygon_count: number;
  vertex_count: number;
  layers: string[];
  source: string;
}

const EPS = 1e-12;

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function validateLayer(name: string, which: string): void {
  // AutoCAD layer name rules (relaxed — ASCII printable, no special DXF chars)
  if (typeof name !== "string" || name.length === 0) {
    throw new Error(`DxfWriter: ${which} layer must be a non-empty string`);
  }
  if (name.length > 255) {
    throw new Error(`DxfWriter: ${which} layer too long (${name.length})`);
  }
  if (/[<>/\\":;?*|,=`]/.test(name)) {
    throw new Error(`DxfWriter: ${which} layer contains forbidden character`);
  }
}

function validatePolygon(p: Polygon2D, idx: number): void {
  if (!Array.isArray(p.vertices) || p.vertices.length < 2) {
    throw new Error(
      `DxfWriter: polygon[${idx}] needs ≥2 vertices, got ${p.vertices?.length ?? "undefined"}`,
    );
  }
  for (let j = 0; j < p.vertices.length; j++) {
    const v = p.vertices[j];
    if (!isFiniteNumber(v.x) || !isFiniteNumber(v.y)) {
      throw new Error(
        `DxfWriter: polygon[${idx}].vertices[${j}] has non-finite coord (${v.x}, ${v.y})`,
      );
    }
  }
}

class DxfWriterEngine {
  /** DXF is strict about line endings and group-code/value pairing.
   *  Every emitted block is "code\nvalue\n". Keep this single writer
   *  so the format never drifts between polygon entities. */
  private pair(code: number, value: string): string {
    return `${code}\n${value}\n`;
  }

  private header(acadver: string): string {
    return (
      this.pair(0, "SECTION") +
      this.pair(2, "HEADER") +
      this.pair(9, "$ACADVER") +
      this.pair(1, acadver) +
      this.pair(9, "$INSBASE") +
      this.pair(10, "0.0") +
      this.pair(20, "0.0") +
      this.pair(30, "0.0") +
      this.pair(0, "ENDSEC")
    );
  }

  private tables(layers: string[]): string {
    let out =
      this.pair(0, "SECTION") +
      this.pair(2, "TABLES") +
      this.pair(0, "TABLE") +
      this.pair(2, "LAYER") +
      this.pair(70, String(layers.length));
    for (const name of layers) {
      out +=
        this.pair(0, "LAYER") +
        this.pair(2, name) +
        this.pair(70, "0") + // flags: 0 = frozen/off/locked all clear
        this.pair(62, "7") + // color: white
        this.pair(6, "CONTINUOUS"); // linetype
    }
    out += this.pair(0, "ENDTAB") + this.pair(0, "ENDSEC");
    return out;
  }

  /** Emit an LWPOLYLINE entity. Closed=1 when first==last OR is_hole doesn't matter —
   *  polygons are always topologically closed contours in our domain. */
  private lwpolyline(
    pts: Point2D[],
    layer: string,
    precision: number,
    closed: boolean,
  ): string {
    const numPts = pts.length;
    const fmt = (n: number) => n.toFixed(precision);
    let out =
      this.pair(0, "LWPOLYLINE") +
      this.pair(8, layer) +
      this.pair(90, String(numPts)) +
      this.pair(70, closed ? "1" : "0");
    for (const p of pts) {
      out += this.pair(10, fmt(p.x)) + this.pair(20, fmt(p.y));
    }
    return out;
  }

  private entities(
    polygons: Polygon2D[],
    outerLayer: string,
    holeLayer: string,
    precision: number,
  ): string {
    let out = this.pair(0, "SECTION") + this.pair(2, "ENTITIES");
    for (const p of polygons) {
      // Detect whether first vertex duplicates last (already-closed polyline).
      // If so, drop the duplicate — DXF LWPOLYLINE with flag 70=1 implies
      // the closing edge automatically; duplicating would create a zero-length segment.
      let pts = p.vertices;
      if (
        pts.length > 2 &&
        Math.abs(pts[0].x - pts[pts.length - 1].x) < EPS &&
        Math.abs(pts[0].y - pts[pts.length - 1].y) < EPS
      ) {
        pts = pts.slice(0, -1);
      }
      out += this.lwpolyline(pts, p.is_hole ? holeLayer : outerLayer, precision, true);
    }
    out += this.pair(0, "ENDSEC");
    return out;
  }

  /** Main entry: serialize polygons to DXF R12 ASCII. */
  writePolygonsToDxf(
    polygons: Polygon2D[],
    options: DxfWriteOptions = {},
  ): DxfWriteResult {
    if (!Array.isArray(polygons)) {
      throw new Error("DxfWriter: polygons must be an array");
    }
    if (polygons.length === 0) {
      throw new Error("DxfWriter: polygons array is empty");
    }
    const outerLayer = options.outer_layer ?? "0";
    const holeLayer = options.hole_layer ?? "HOLES";
    validateLayer(outerLayer, "outer_layer");
    validateLayer(holeLayer, "hole_layer");
    const acadver = options.acadver ?? "AC1009";
    const precision = Math.max(
      0,
      Math.min(Math.round(options.precision ?? 6), 15),
    );

    for (let i = 0; i < polygons.length; i++) validatePolygon(polygons[i], i);

    const layersUsed = new Set<string>();
    for (const p of polygons) layersUsed.add(p.is_hole ? holeLayer : outerLayer);
    const layers = Array.from(layersUsed);

    let dxf = "";
    dxf += this.header(acadver);
    dxf += this.tables(layers);
    dxf += this.entities(polygons, outerLayer, holeLayer, precision);
    dxf += this.pair(0, "EOF");

    const vertexCount = polygons.reduce((s, p) => s + p.vertices.length, 0);

    return {
      dxf,
      bytes: dxf.length,
      polygon_count: polygons.length,
      vertex_count: vertexCount,
      layers,
      source: "DxfWriterEngine.writePolygonsToDxf (R12 LWPOLYLINE)",
    };
  }

  /** Helper: build a closed rectangle polygon from bounds. */
  rectanglePolygon(
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    isHole = false,
  ): Polygon2D {
    if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(w) || !isFiniteNumber(h)) {
      throw new Error("DxfWriter.rectanglePolygon: non-finite bounds");
    }
    if (w <= 0 || h <= 0) {
      throw new Error(`DxfWriter.rectanglePolygon: non-positive dimensions w=${w} h=${h}`);
    }
    const vertices: Point2D[] = [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ];
    return {
      id,
      vertices,
      is_hole: isHole,
      area_mm2: w * h,
      perimeter_mm: 2 * (w + h),
      bbox: { x, y, w, h },
    };
  }

  /** Helper: build a closed circle polygon sampled at N points. */
  circlePolygon(
    id: string,
    cx: number,
    cy: number,
    r: number,
    segments = 36,
    isHole = false,
  ): Polygon2D {
    if (!isFiniteNumber(cx) || !isFiniteNumber(cy) || !isFiniteNumber(r)) {
      throw new Error("DxfWriter.circlePolygon: non-finite parameters");
    }
    if (r <= 0) {
      throw new Error(`DxfWriter.circlePolygon: non-positive radius r=${r}`);
    }
    const n = Math.max(6, Math.round(segments));
    const vertices: Point2D[] = [];
    for (let i = 0; i < n; i++) {
      const theta = (2 * Math.PI * i) / n;
      vertices.push({ x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) });
    }
    const bbox = { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r };
    return {
      id,
      vertices,
      is_hole: isHole,
      area_mm2: Math.PI * r * r,
      perimeter_mm: 2 * Math.PI * r,
      bbox,
    };
  }
}

export const dxfWriterEngine = new DxfWriterEngine();
export { DxfWriterEngine };
