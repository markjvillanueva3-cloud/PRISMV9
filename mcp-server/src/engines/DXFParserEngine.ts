/**
 * DXFParserEngine — CK-MS10 U03
 *
 * Parses DXF and SVG files into 2D polygon boundaries (Polygon2D[]).
 *
 * DXF entities: LINE, ARC, CIRCLE, LWPOLYLINE (with bulge), ELLIPSE, SPLINE
 * SVG elements: path (M/L/C/Z), rect, circle, ellipse, polygon, polyline
 * Transforms: translate, rotate, scale
 *
 * Algorithms:
 *   Arc discretization: N points from start to end angle
 *   De Boor's algorithm for SPLINE evaluation
 *   Cubic Bezier discretization for SVG paths
 *   Shoelace formula for area
 *   Winding number for inside/outside classification
 */

import { log } from "../utils/Logger.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Point2D {
  x: number;
  y: number;
}

export interface Polygon2D {
  id: string;
  vertices: Point2D[];
  is_hole: boolean; // true = inner contour (hole)
  area_mm2: number;
  perimeter_mm: number;
  bbox: { x: number; y: number; w: number; h: number };
}

export interface ParseResult {
  polygons: Polygon2D[];
  entity_count: number;
  warnings: string[];
  source: "dxf" | "svg";
}

// Internal segment type for loop-building
interface Segment {
  start: Point2D;
  end: Point2D;
  points: Point2D[]; // intermediate polyline points including start
}

// ─── Math helpers ─────────────────────────────────────────────────────────────

const DEG2RAD = Math.PI / 180;

function dist(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function shoelaceArea(pts: Point2D[]): number {
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2;
}

function perimeter(pts: Point2D[]): number {
  let p = 0;
  for (let i = 0; i < pts.length; i++) {
    p += dist(pts[i], pts[(i + 1) % pts.length]);
  }
  return p;
}

function getBBox(pts: Point2D[]): { x: number; y: number; w: number; h: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const v of pts) {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
  }
  if (!isFinite(minX)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Winding number test — positive area = CCW = outer; negative = CW = hole */
function signedArea(pts: Point2D[]): number {
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return area / 2;
}

function discretizeArc(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
  segments = 32
): Point2D[] {
  const pts: Point2D[] = [];
  let start = startDeg * DEG2RAD;
  let end = endDeg * DEG2RAD;
  // Normalize: DXF arcs go CCW
  if (end <= start) end += 2 * Math.PI;
  const steps = Math.max(4, Math.ceil((segments * (end - start)) / (2 * Math.PI)));
  for (let i = 0; i <= steps; i++) {
    const angle = start + (i / steps) * (end - start);
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return pts;
}

function discretizeCircle(cx: number, cy: number, r: number, segments = 36): Point2D[] {
  const pts: Point2D[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return pts;
}

function discretizeEllipse(
  cx: number, cy: number,
  rx: number, ry: number,
  startRad: number, endRad: number,
  segments = 36
): Point2D[] {
  const pts: Point2D[] = [];
  let end = endRad;
  if (end <= startRad) end += 2 * Math.PI;
  const steps = Math.max(8, Math.ceil((segments * (end - startRad)) / (2 * Math.PI)));
  for (let i = 0; i <= steps; i++) {
    const t = startRad + (i / steps) * (end - startRad);
    pts.push({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) });
  }
  return pts;
}

/** De Boor's algorithm for B-spline evaluation */
function deBoor(
  degree: number,
  knots: number[],
  controlPts: Point2D[],
  t: number
): Point2D {
  const n = controlPts.length - 1;
  // Find knot span
  let k = degree;
  for (let i = degree; i < knots.length - degree - 1; i++) {
    if (t >= knots[i] && t < knots[i + 1]) {
      k = i;
      break;
    }
  }
  if (t >= knots[knots.length - degree - 1]) k = n;

  const d: Point2D[] = [];
  for (let j = 0; j <= degree; j++) {
    const idx = j + k - degree;
    if (idx >= 0 && idx < controlPts.length) {
      d.push({ ...controlPts[idx] });
    } else {
      d.push({ x: 0, y: 0 });
    }
  }

  for (let r = 1; r <= degree; r++) {
    for (let j = degree; j >= r; j--) {
      const ki = j + k - degree;
      const denom = knots[ki + degree - r + 1] - knots[ki];
      const alpha = denom === 0 ? 0 : (t - knots[ki]) / denom;
      d[j] = {
        x: lerp(d[j - 1].x, d[j].x, alpha),
        y: lerp(d[j - 1].y, d[j].y, alpha),
      };
    }
  }
  return d[degree];
}

function discretizeSpline(
  controlPts: Point2D[],
  degree: number,
  knots: number[],
  segments = 32
): Point2D[] {
  if (controlPts.length < 2) return controlPts;

  const tMin = knots[degree];
  const tMax = knots[knots.length - degree - 1];

  const pts: Point2D[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = tMin + (i / segments) * (tMax - tMin);
    pts.push(deBoor(degree, knots, controlPts, t));
  }
  return pts;
}

/** Cubic Bezier discretization */
function cubicBezier(
  p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D,
  steps = 16
): Point2D[] {
  const pts: Point2D[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    pts.push({
      x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
      y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
    });
  }
  return pts;
}

/** Quadratic Bezier discretization */
function quadBezier(p0: Point2D, p1: Point2D, p2: Point2D, steps = 12): Point2D[] {
  const pts: Point2D[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    pts.push({
      x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    });
  }
  return pts;
}

// ─── Loop building ──────────────────────────────────────────────────────────

const ENDPOINT_TOL = 0.01; // mm

function buildClosedLoops(segments: Segment[]): Point2D[][] {
  if (segments.length === 0) return [];

  const unused = segments.map((_, i) => i);
  const loops: Point2D[][] = [];

  while (unused.length > 0) {
    // Start a new chain
    const startIdx = unused.shift()!;
    const chain: Point2D[] = [...segments[startIdx].points];
    let chainEnd = segments[startIdx].end;

    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < unused.length; i++) {
        const idx = unused[i];
        const seg = segments[idx];
        if (dist(chainEnd, seg.start) < ENDPOINT_TOL) {
          // Append (skip duplicate start point)
          chain.push(...seg.points.slice(1));
          chainEnd = seg.end;
          unused.splice(i, 1);
          changed = true;
          break;
        } else if (dist(chainEnd, seg.end) < ENDPOINT_TOL) {
          // Reverse and append
          const rev = [...seg.points].reverse();
          chain.push(...rev.slice(1));
          chainEnd = seg.start;
          unused.splice(i, 1);
          changed = true;
          break;
        }
      }
    }

    // Check if closed
    if (chain.length >= 3 && dist(chain[0], chainEnd) < ENDPOINT_TOL * 10) {
      loops.push(chain);
    } else if (chain.length >= 3) {
      // Force close
      loops.push(chain);
    }
  }

  return loops;
}

function makePolygon(id: string, pts: Point2D[]): Polygon2D {
  const sa = signedArea(pts);
  const area = Math.abs(sa);
  const isHole = sa < 0; // CW = hole in DXF convention
  return {
    id,
    vertices: pts,
    is_hole: isHole,
    area_mm2: parseFloat(area.toFixed(4)),
    perimeter_mm: parseFloat(perimeter(pts).toFixed(4)),
    bbox: getBBox(pts),
  };
}

// ─── DXF Parser ───────────────────────────────────────────────────────────────

export class DXFParserEngine {
  // ── DXF group code reader ────────────────────────────────────────────

  private parseDXFGroups(content: string): Array<[number, string]> {
    const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    // Filter out completely blank lines to handle leading/trailing newlines in test strings
    const nonBlank = lines.filter((l) => l.trim() !== "");
    const groups: Array<[number, string]> = [];
    for (let i = 0; i + 1 < nonBlank.length; i += 2) {
      const code = parseInt(nonBlank[i].trim(), 10);
      const value = nonBlank[i + 1].trim();
      if (!isNaN(code)) {
        groups.push([code, value]);
      }
    }
    return groups;
  }

  parseDXF(content: string): Polygon2D[] {
    const groups = this.parseDXFGroups(content);
    const segments: Segment[] = [];
    const warnings: string[] = [];

    let inEntities = false;
    let i = 0;
    let entityCount = 0;

    while (i < groups.length) {
      const [code, value] = groups[i];

      if (code === 2 && value === "ENTITIES") {
        inEntities = true;
        i++;
        continue;
      }
      if (code === 2 && value === "ENDSEC") {
        inEntities = false;
        i++;
        continue;
      }

      if (!inEntities) { i++; continue; }

      if (code === 0) {
        const entityType = value;
        entityCount++;
        i++;

        if (entityType === "LINE") {
          const props: Record<number, string> = {};
          while (i < groups.length && groups[i][0] !== 0) {
            props[groups[i][0]] = groups[i][1];
            i++;
          }
          const x1 = parseFloat(props[10] ?? "0");
          const y1 = parseFloat(props[20] ?? "0");
          const x2 = parseFloat(props[11] ?? "0");
          const y2 = parseFloat(props[21] ?? "0");
          segments.push({
            start: { x: x1, y: y1 },
            end: { x: x2, y: y2 },
            points: [{ x: x1, y: y1 }, { x: x2, y: y2 }],
          });

        } else if (entityType === "ARC") {
          const props: Record<number, string> = {};
          while (i < groups.length && groups[i][0] !== 0) {
            props[groups[i][0]] = groups[i][1];
            i++;
          }
          const cx = parseFloat(props[10] ?? "0");
          const cy = parseFloat(props[20] ?? "0");
          const r = parseFloat(props[40] ?? "1");
          const startDeg = parseFloat(props[50] ?? "0");
          const endDeg = parseFloat(props[51] ?? "360");
          const pts = discretizeArc(cx, cy, r, startDeg, endDeg);
          if (pts.length >= 2) {
            segments.push({ start: pts[0], end: pts[pts.length - 1], points: pts });
          }

        } else if (entityType === "CIRCLE") {
          const props: Record<number, string> = {};
          while (i < groups.length && groups[i][0] !== 0) {
            props[groups[i][0]] = groups[i][1];
            i++;
          }
          const cx = parseFloat(props[10] ?? "0");
          const cy = parseFloat(props[20] ?? "0");
          const r = parseFloat(props[40] ?? "1");
          const pts = discretizeCircle(cx, cy, r, 36);
          // Circle is self-closing
          segments.push({ start: pts[0], end: pts[0], points: pts });

        } else if (entityType === "LWPOLYLINE") {
          // Read all group codes until next entity
          const rawGroups: Array<[number, string]> = [];
          while (i < groups.length && groups[i][0] !== 0) {
            rawGroups.push(groups[i]);
            i++;
          }
          const pts = this.parseLWPOLYLINE(rawGroups);
          if (pts.length >= 2) {
            segments.push({ start: pts[0], end: pts[pts.length - 1], points: pts });
          }

        } else if (entityType === "ELLIPSE") {
          const props: Record<number, string> = {};
          while (i < groups.length && groups[i][0] !== 0) {
            props[groups[i][0]] = groups[i][1];
            i++;
          }
          const cx = parseFloat(props[10] ?? "0");
          const cy = parseFloat(props[20] ?? "0");
          const majorX = parseFloat(props[11] ?? "1");
          const majorY = parseFloat(props[21] ?? "0");
          const rx = Math.sqrt(majorX * majorX + majorY * majorY);
          const ratio = parseFloat(props[40] ?? "1");
          const ry = rx * ratio;
          const startRad = parseFloat(props[41] ?? "0");
          const endRad = parseFloat(props[42] ?? String(2 * Math.PI));
          const pts = discretizeEllipse(cx, cy, rx, ry, startRad, endRad);
          if (pts.length >= 2) {
            segments.push({ start: pts[0], end: pts[pts.length - 1], points: pts });
          }

        } else if (entityType === "SPLINE") {
          const rawGroups: Array<[number, string]> = [];
          while (i < groups.length && groups[i][0] !== 0) {
            rawGroups.push(groups[i]);
            i++;
          }
          const pts = this.parseSPLINE(rawGroups);
          if (pts.length >= 2) {
            segments.push({ start: pts[0], end: pts[pts.length - 1], points: pts });
          }

        } else {
          // Skip unknown entity
          while (i < groups.length && groups[i][0] !== 0) i++;
        }
      } else {
        i++;
      }
    }

    const loops = buildClosedLoops(segments);
    const polygons: Polygon2D[] = loops.map((pts, idx) =>
      makePolygon(`dxf_${idx}`, pts)
    );

    log.debug("[DXFParserEngine] parseDXF", {
      entities: entityCount,
      segments: segments.length,
      loops: loops.length,
    });

    return this.classifyContours(polygons);
  }

  private parseLWPOLYLINE(rawGroups: Array<[number, string]>): Point2D[] {
    // Collect vertex coordinates and bulge values
    const xs: number[] = [];
    const ys: number[] = [];
    const bulges: number[] = [];
    let closed = false;

    for (const [code, val] of rawGroups) {
      if (code === 70) closed = (parseInt(val) & 1) === 1;
      if (code === 10) xs.push(parseFloat(val));
      if (code === 20) ys.push(parseFloat(val));
      if (code === 42) bulges.push(parseFloat(val));
    }

    // Pad bulges array
    while (bulges.length < xs.length) bulges.push(0);

    const pts: Point2D[] = [];
    for (let i = 0; i < xs.length; i++) {
      const p0: Point2D = { x: xs[i], y: ys[i] };
      const p1: Point2D = {
        x: xs[(i + 1) % xs.length],
        y: ys[(i + 1) % xs.length],
      };
      pts.push(p0);

      const bulge = bulges[i];
      if (Math.abs(bulge) > 1e-6 && (i < xs.length - 1 || closed)) {
        // Bulge = tan(θ/4), where θ is the included angle
        const theta = 4 * Math.atan(Math.abs(bulge));
        const d = dist(p0, p1);
        const r = d / (2 * Math.sin(theta / 2));
        // Arc center
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const midX = (p0.x + p1.x) / 2;
        const midY = (p0.y + p1.y) / 2;
        const h = Math.sqrt(Math.max(0, r * r - (d / 2) * (d / 2)));
        const sign = bulge > 0 ? 1 : -1;
        const perpX = -sign * dy / d;
        const perpY = sign * dx / d;
        const cx = midX + h * perpX;
        const cy = midY + h * perpY;
        const startAngle = Math.atan2(p0.y - cy, p0.x - cx);
        const endAngle = Math.atan2(p1.y - cy, p1.x - cx);
        const arcPts = discretizeArc(
          cx, cy, r,
          (startAngle / DEG2RAD + 360) % 360,
          (endAngle / DEG2RAD + 360) % 360,
          Math.max(4, Math.ceil(16 * theta / Math.PI))
        );
        pts.push(...arcPts.slice(1, -1));
      }
    }

    if (closed && pts.length > 0) pts.push(pts[0]);
    return pts;
  }

  private parseSPLINE(rawGroups: Array<[number, string]>): Point2D[] {
    let degree = 3;
    const knots: number[] = [];
    const ctrlXs: number[] = [];
    const ctrlYs: number[] = [];

    for (const [code, val] of rawGroups) {
      if (code === 71) degree = parseInt(val);
      if (code === 40) knots.push(parseFloat(val));
      if (code === 10) ctrlXs.push(parseFloat(val));
      if (code === 20) ctrlYs.push(parseFloat(val));
    }

    const controlPts: Point2D[] = ctrlXs.map((x, i) => ({ x, y: ctrlYs[i] ?? 0 }));
    if (controlPts.length < 2) return controlPts;

    // If no knots provided, build uniform knot vector
    if (knots.length === 0) {
      const n = controlPts.length;
      for (let i = 0; i < degree + 1; i++) knots.push(0);
      for (let i = 1; i < n - degree; i++) knots.push(i / (n - degree));
      for (let i = 0; i < degree + 1; i++) knots.push(1);
    }

    return discretizeSpline(controlPts, degree, knots, Math.max(32, controlPts.length * 4));
  }

  // ── SVG Parser ─────────────────────────────────────────────────────────

  parseSVG(content: string): Polygon2D[] {
    const polygons: Polygon2D[] = [];
    const warnings: string[] = [];
    let idCounter = 0;

    // Extract transform from an element string
    const getTransform = (attrs: string): { tx: number; ty: number; rot: number; sx: number; sy: number } => {
      const tr = { tx: 0, ty: 0, rot: 0, sx: 1, sy: 1 };
      const m = attrs.match(/transform\s*=\s*["']([^"']+)["']/);
      if (!m) return tr;
      const t = m[1];
      const translate = t.match(/translate\s*\(\s*([+-]?\d*\.?\d+)(?:\s*,\s*|\s+)([+-]?\d*\.?\d+)\s*\)/);
      if (translate) { tr.tx = parseFloat(translate[1]); tr.ty = parseFloat(translate[2]); }
      const rotate = t.match(/rotate\s*\(\s*([+-]?\d*\.?\d+)/);
      if (rotate) tr.rot = parseFloat(rotate[1]);
      const scale = t.match(/scale\s*\(\s*([+-]?\d*\.?\d+)(?:(?:\s*,\s*|\s+)([+-]?\d*\.?\d+))?\s*\)/);
      if (scale) { tr.sx = parseFloat(scale[1]); tr.sy = scale[2] ? parseFloat(scale[2]) : tr.sx; }
      return tr;
    };

    const applyTransform = (
      pts: Point2D[],
      tr: { tx: number; ty: number; rot: number; sx: number; sy: number }
    ): Point2D[] => {
      const rad = tr.rot * DEG2RAD;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return pts.map((p) => {
        const sx = p.x * tr.sx;
        const sy = p.y * tr.sy;
        return {
          x: sx * cos - sy * sin + tr.tx,
          y: sx * sin + sy * cos + tr.ty,
        };
      });
    };

    // Parse <path> elements
    const pathRegex = /<path([^>]+)\/?>|<path([^>]+)>.*?<\/path>/gs;
    let pm;
    while ((pm = pathRegex.exec(content)) !== null) {
      const attrs = pm[1] ?? pm[2] ?? "";
      const dm = attrs.match(/\bd\s*=\s*["']([^"']+)["']/);
      if (!dm) continue;
      const tr = getTransform(attrs);
      const pts = this.parseSVGPath(dm[1]);
      if (pts.length >= 3) {
        const transformed = applyTransform(pts, tr);
        polygons.push(makePolygon(`svg_path_${idCounter++}`, transformed));
      }
    }

    // Parse <rect> elements
    const rectRegex = /<rect([^>]+)\/?>|<rect([^>]+)>.*?<\/rect>/gs;
    let rm;
    while ((rm = rectRegex.exec(content)) !== null) {
      const attrs = rm[1] ?? rm[2] ?? "";
      const x = parseFloat(attrs.match(/\bx\s*=\s*["']([^"']+)["']/)?.[1] ?? "0");
      const y = parseFloat(attrs.match(/\by\s*=\s*["']([^"']+)["']/)?.[1] ?? "0");
      const w = parseFloat(attrs.match(/\bwidth\s*=\s*["']([^"']+)["']/)?.[1] ?? "0");
      const h = parseFloat(attrs.match(/\bheight\s*=\s*["']([^"']+)["']/)?.[1] ?? "0");
      const rx = parseFloat(attrs.match(/\brx\s*=\s*["']([^"']+)["']/)?.[1] ?? "0");
      const tr = getTransform(attrs);
      let pts: Point2D[];
      if (rx > 0) {
        pts = this.roundedRect(x, y, w, h, rx);
      } else {
        pts = [
          { x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h },
        ];
      }
      polygons.push(makePolygon(`svg_rect_${idCounter++}`, applyTransform(pts, tr)));
    }

    // Parse <circle> elements
    const circleRegex = /<circle([^>]+)\/?>|<circle([^>]+)>.*?<\/circle>/gs;
    let cm;
    while ((cm = circleRegex.exec(content)) !== null) {
      const attrs = cm[1] ?? cm[2] ?? "";
      const cx = parseFloat(attrs.match(/\bcx\s*=\s*["']([^"']+)["']/)?.[1] ?? "0");
      const cy = parseFloat(attrs.match(/\bcy\s*=\s*["']([^"']+)["']/)?.[1] ?? "0");
      const r = parseFloat(attrs.match(/\br\s*=\s*["']([^"']+)["']/)?.[1] ?? "0");
      const tr = getTransform(attrs);
      const pts = discretizeCircle(cx, cy, r, 36);
      polygons.push(makePolygon(`svg_circle_${idCounter++}`, applyTransform(pts, tr)));
    }

    // Parse <ellipse> elements
    const ellipseRegex = /<ellipse([^>]+)\/?>|<ellipse([^>]+)>.*?<\/ellipse>/gs;
    let em;
    while ((em = ellipseRegex.exec(content)) !== null) {
      const attrs = em[1] ?? em[2] ?? "";
      const cx = parseFloat(attrs.match(/\bcx\s*=\s*["']([^"']+)["']/)?.[1] ?? "0");
      const cy = parseFloat(attrs.match(/\bcy\s*=\s*["']([^"']+)["']/)?.[1] ?? "0");
      const rx = parseFloat(attrs.match(/\brx\s*=\s*["']([^"']+)["']/)?.[1] ?? "0");
      const ry = parseFloat(attrs.match(/\bry\s*=\s*["']([^"']+)["']/)?.[1] ?? "0");
      const tr = getTransform(attrs);
      const pts = discretizeEllipse(cx, cy, rx, ry, 0, 2 * Math.PI, 36);
      polygons.push(makePolygon(`svg_ellipse_${idCounter++}`, applyTransform(pts, tr)));
    }

    // Parse <polygon> elements
    const polygonRegex = /<polygon([^>]+)\/?>|<polygon([^>]+)>.*?<\/polygon>/gs;
    let pgm;
    while ((pgm = polygonRegex.exec(content)) !== null) {
      const attrs = pgm[1] ?? pgm[2] ?? "";
      const pointsM = attrs.match(/\bpoints\s*=\s*["']([^"']+)["']/);
      if (!pointsM) continue;
      const tr = getTransform(attrs);
      const pts = this.parsePointsString(pointsM[1]);
      if (pts.length >= 3) {
        polygons.push(makePolygon(`svg_polygon_${idCounter++}`, applyTransform(pts, tr)));
      }
    }

    // Parse <polyline> elements (not closed by default)
    const polylineRegex = /<polyline([^>]+)\/?>|<polyline([^>]+)>.*?<\/polyline>/gs;
    let plm;
    while ((plm = polylineRegex.exec(content)) !== null) {
      const attrs = plm[1] ?? plm[2] ?? "";
      const pointsM = attrs.match(/\bpoints\s*=\s*["']([^"']+)["']/);
      if (!pointsM) continue;
      const tr = getTransform(attrs);
      const pts = this.parsePointsString(pointsM[1]);
      if (pts.length >= 3) {
        polygons.push(makePolygon(`svg_polyline_${idCounter++}`, applyTransform(pts, tr)));
      }
    }

    log.debug("[DXFParserEngine] parseSVG", { polygons: polygons.length });
    return this.classifyContours(polygons);
  }

  private roundedRect(x: number, y: number, w: number, h: number, r: number): Point2D[] {
    const pts: Point2D[] = [];
    const segs = 8;
    // Four corners
    const corners = [
      { cx: x + r, cy: y + r, startDeg: 180, endDeg: 270 },
      { cx: x + w - r, cy: y + r, startDeg: 270, endDeg: 360 },
      { cx: x + w - r, cy: y + h - r, startDeg: 0, endDeg: 90 },
      { cx: x + r, cy: y + h - r, startDeg: 90, endDeg: 180 },
    ];
    for (const c of corners) {
      pts.push(...discretizeArc(c.cx, c.cy, r, c.startDeg, c.endDeg, segs));
    }
    return pts;
  }

  private parsePointsString(s: string): Point2D[] {
    const nums = s.trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));
    const pts: Point2D[] = [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      pts.push({ x: nums[i], y: nums[i + 1] });
    }
    return pts;
  }

  parseSVGPath(d: string): Point2D[] {
    const pts: Point2D[] = [];
    let curX = 0, curY = 0;
    let startX = 0, startY = 0;

    // Tokenize: split on command letters, keeping the letter
    const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|[+-]?\d*\.?\d+(?:[eE][+-]?\d+)?/g) ?? [];
    let i = 0;
    let lastCmd = "";
    let lastCtrlX = 0, lastCtrlY = 0;

    const nums = () => {
      const result: number[] = [];
      while (i < tokens.length && /^[+-]?\d/.test(tokens[i])) {
        result.push(parseFloat(tokens[i++]));
      }
      return result;
    };

    while (i < tokens.length) {
      const cmd = tokens[i++];
      if (!/[MmLlHhVvCcSsQqTtAaZz]/.test(cmd)) continue;
      lastCmd = cmd;

      if (cmd === "M" || cmd === "m") {
        const n = nums();
        for (let j = 0; j + 1 < n.length; j += 2) {
          if (cmd === "M") { curX = n[j]; curY = n[j + 1]; }
          else { curX += n[j]; curY += n[j + 1]; }
          if (j === 0) { startX = curX; startY = curY; }
          pts.push({ x: curX, y: curY });
        }
      } else if (cmd === "L" || cmd === "l") {
        const n = nums();
        for (let j = 0; j + 1 < n.length; j += 2) {
          if (cmd === "L") { curX = n[j]; curY = n[j + 1]; }
          else { curX += n[j]; curY += n[j + 1]; }
          pts.push({ x: curX, y: curY });
        }
      } else if (cmd === "H" || cmd === "h") {
        const n = nums();
        for (const v of n) {
          if (cmd === "H") curX = v; else curX += v;
          pts.push({ x: curX, y: curY });
        }
      } else if (cmd === "V" || cmd === "v") {
        const n = nums();
        for (const v of n) {
          if (cmd === "V") curY = v; else curY += v;
          pts.push({ x: curX, y: curY });
        }
      } else if (cmd === "C" || cmd === "c") {
        const n = nums();
        for (let j = 0; j + 5 < n.length; j += 6) {
          let x1: number, y1: number, x2: number, y2: number, x: number, y: number;
          if (cmd === "C") {
            x1 = n[j]; y1 = n[j+1]; x2 = n[j+2]; y2 = n[j+3]; x = n[j+4]; y = n[j+5];
          } else {
            x1 = curX + n[j]; y1 = curY + n[j+1];
            x2 = curX + n[j+2]; y2 = curY + n[j+3];
            x = curX + n[j+4]; y = curY + n[j+5];
          }
          const bezPts = cubicBezier(
            { x: curX, y: curY }, { x: x1, y: y1 }, { x: x2, y: y2 }, { x, y }
          );
          pts.push(...bezPts.slice(1));
          lastCtrlX = x2; lastCtrlY = y2;
          curX = x; curY = y;
        }
      } else if (cmd === "S" || cmd === "s") {
        // Smooth cubic bezier
        const n = nums();
        for (let j = 0; j + 3 < n.length; j += 4) {
          const x1 = 2 * curX - lastCtrlX;
          const y1 = 2 * curY - lastCtrlY;
          let x2: number, y2: number, x: number, y: number;
          if (cmd === "S") {
            x2 = n[j]; y2 = n[j+1]; x = n[j+2]; y = n[j+3];
          } else {
            x2 = curX + n[j]; y2 = curY + n[j+1];
            x = curX + n[j+2]; y = curY + n[j+3];
          }
          const bezPts = cubicBezier(
            { x: curX, y: curY }, { x: x1, y: y1 }, { x: x2, y: y2 }, { x, y }
          );
          pts.push(...bezPts.slice(1));
          lastCtrlX = x2; lastCtrlY = y2;
          curX = x; curY = y;
        }
      } else if (cmd === "Q" || cmd === "q") {
        const n = nums();
        for (let j = 0; j + 3 < n.length; j += 4) {
          let x1: number, y1: number, x: number, y: number;
          if (cmd === "Q") { x1 = n[j]; y1 = n[j+1]; x = n[j+2]; y = n[j+3]; }
          else { x1 = curX + n[j]; y1 = curY + n[j+1]; x = curX + n[j+2]; y = curY + n[j+3]; }
          const qPts = quadBezier({ x: curX, y: curY }, { x: x1, y: y1 }, { x, y });
          pts.push(...qPts.slice(1));
          lastCtrlX = x1; lastCtrlY = y1;
          curX = x; curY = y;
        }
      } else if (cmd === "Z" || cmd === "z") {
        pts.push({ x: startX, y: startY });
        curX = startX; curY = startY;
      }
    }

    return pts;
  }

  // ── Contour classification ────────────────────────────────────────────

  classifyContours(polygons: Polygon2D[]): Polygon2D[] {
    // Sort by area descending — largest is likely outer boundary
    const sorted = [...polygons].sort((a, b) => b.area_mm2 - a.area_mm2);

    return sorted.map((poly, idx) => {
      // Count how many larger polygons contain this polygon's centroid
      const cx = poly.bbox.x + poly.bbox.w / 2;
      const cy = poly.bbox.y + poly.bbox.h / 2;
      let containCount = 0;
      for (let i = 0; i < idx; i++) {
        if (this.pointInPolygon({ x: cx, y: cy }, sorted[i].vertices)) {
          containCount++;
        }
      }
      const isHole = containCount % 2 === 1;
      return { ...poly, is_hole: isHole };
    });
  }

  private pointInPolygon(pt: Point2D, vertices: Point2D[]): boolean {
    let inside = false;
    const n = vertices.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = vertices[i].x, yi = vertices[i].y;
      const xj = vertices[j].x, yj = vertices[j].y;
      const intersect =
        yi > pt.y !== yj > pt.y &&
        pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // ── Area / perimeter / BBox (public API) ──────────────────────────────

  calculateArea(polygon: Polygon2D): number {
    return parseFloat(shoelaceArea(polygon.vertices).toFixed(4));
  }

  calculatePerimeter(polygon: Polygon2D): number {
    return parseFloat(perimeter(polygon.vertices).toFixed(4));
  }

  getBoundingBox(polygon: Polygon2D): { x: number; y: number; w: number; h: number } {
    return getBBox(polygon.vertices);
  }

  extractContours(entities: Segment[]): Point2D[][] {
    return buildClosedLoops(entities);
  }

  buildClosedLoops(segments: Segment[]): Point2D[][] {
    return buildClosedLoops(segments);
  }
}

export const dxfParserEngine = new DXFParserEngine();
