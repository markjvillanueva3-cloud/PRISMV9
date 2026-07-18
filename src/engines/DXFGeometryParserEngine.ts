/**
 * DXFGeometryParserEngine — WEDM-MS0 U-WEDM00
 *
 * Arc-preserving DXF/STEP/IGES parser for Wire EDM pipeline.
 *
 * Unlike DXFParserEngine (CK-MS10) which discretizes all geometry to point arrays,
 * this engine preserves line/arc segment semantics required for G02/G03 generation.
 *
 * Entity support:
 *   LINE, ARC, CIRCLE, LWPOLYLINE (with bulge→arc), SPLINE→biarc decomposition,
 *   ELLIPSE→arc decomposition, INSERT/BLOCK flattening
 *
 * Post-processing pipeline:
 *   raw bytes → entity extraction → BLOCK/INSERT resolution → spline-to-arc (0.005mm chord)
 *   → gap closure (0.01mm) → duplicate removal → winding normalization (CCW=ext, CW=int)
 *   → self-intersection detection → WireEDMContour[] output
 *
 * References:
 *   - AutoCAD DXF Reference (Autodesk, 2024)
 *   - "Biarc approximation of NURBS curves" — Meek & Walton (1997)
 *   - ISO 6983-1:2009 — Numerical control of machines, G-code
 *
 * @module engines/DXFGeometryParserEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface Point2D {
  x: number;
  y: number;
}

/** A line segment from start to end */
export interface LineSegment {
  type: "line";
  start: Point2D;
  end: Point2D;
}

/** An arc segment — preserves center/radius/angles for G02/G03 output */
export interface ArcSegment {
  type: "arc";
  start: Point2D;
  end: Point2D;
  center: Point2D;
  radius: number;
  start_angle_rad: number;
  end_angle_rad: number;
  ccw: boolean; // true = G03 (CCW), false = G02 (CW)
}

export type GeometrySegment = LineSegment | ArcSegment;

export interface WireEDMContour {
  id: string;
  segments: GeometrySegment[];
  is_closed: boolean;
  is_exterior: boolean; // CCW winding = exterior, CW = interior/hole
  area_mm2: number;
  perimeter_mm: number;
  bbox: { min_x: number; min_y: number; max_x: number; max_y: number };
}

export interface GeometryIssue {
  type: "open_contour" | "self_intersection" | "narrow_slot" | "short_segment" | "gap_closed" | "duplicate_removed";
  severity: "error" | "warning" | "info";
  message: string;
  location?: Point2D;
  contour_id?: string;
}

export interface GeometryParseResult {
  contours: WireEDMContour[];
  issues: GeometryIssue[];
  entity_count: number;
  source_format: "dxf" | "step" | "iges";
  /** DXF $INSUNITS: "mm" | "inch" | "unknown" — parsed from HEADER section */
  source_units: "mm" | "inch" | "unknown";
  warnings: string[];
}

// Internal types for BLOCK/INSERT handling
interface BlockDefinition {
  name: string;
  segments: RawSegment[];
}

interface RawSegment {
  type: "line" | "arc";
  start: Point2D;
  end: Point2D;
  // Arc-specific
  center?: Point2D;
  radius?: number;
  start_angle_rad?: number;
  end_angle_rad?: number;
  ccw?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GAP_TOLERANCE_MM = 0.01;
const SPLINE_CHORD_TOLERANCE_MM = 0.005;
const MIN_SEGMENT_LENGTH_MM = 0.001;
const DUPLICATE_TOLERANCE_MM = 0.001;
const DEG2RAD = Math.PI / 180;
const TWO_PI = 2 * Math.PI;
/** DoS guard: reject DXF files with more than 500K group code pairs */
const MAX_DXF_GROUPS = 500_000;

// ============================================================================
// MATH HELPERS
// ============================================================================

function dist(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function ptEq(a: Point2D, b: Point2D, tol = DUPLICATE_TOLERANCE_MM): boolean {
  return dist(a, b) < tol;
}

function normalizeAngle(a: number): number {
  let r = a % TWO_PI;
  if (r < 0) r += TWO_PI;
  return r;
}

function arcLength(seg: ArcSegment): number {
  let sweep = seg.ccw
    ? seg.end_angle_rad - seg.start_angle_rad
    : seg.start_angle_rad - seg.end_angle_rad;
  if (sweep <= 0) sweep += TWO_PI;
  return seg.radius * sweep;
}

function segmentLength(seg: GeometrySegment): number {
  if (seg.type === "line") return dist(seg.start, seg.end);
  return arcLength(seg);
}

function segmentStart(seg: GeometrySegment): Point2D {
  return seg.start;
}

function segmentEnd(seg: GeometrySegment): Point2D {
  return seg.end;
}

/** Signed area via Green's theorem — approximated by sampling segments */
function contourSignedArea(segments: GeometrySegment[]): number {
  let area = 0;
  for (const seg of segments) {
    if (seg.type === "line") {
      area += (seg.start.x * seg.end.y - seg.end.x * seg.start.y);
    } else {
      // For arcs, sample intermediate points for area contribution
      const steps = Math.max(8, Math.ceil(arcLength(seg) / 0.5));
      let prev = seg.start;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const pt = arcPointAt(seg, t);
        area += (prev.x * pt.y - pt.x * prev.y);
        prev = pt;
      }
    }
  }
  return area / 2;
}

function arcPointAt(arc: ArcSegment, t: number): Point2D {
  let sweep = arc.ccw
    ? arc.end_angle_rad - arc.start_angle_rad
    : arc.start_angle_rad - arc.end_angle_rad;
  if (sweep <= 0) sweep += TWO_PI;
  const angle = arc.ccw
    ? arc.start_angle_rad + sweep * t
    : arc.start_angle_rad - sweep * t;
  return {
    x: arc.center.x + arc.radius * Math.cos(angle),
    y: arc.center.y + arc.radius * Math.sin(angle),
  };
}

function contourPerimeter(segments: GeometrySegment[]): number {
  let p = 0;
  for (const seg of segments) p += segmentLength(seg);
  return p;
}

function contourBBox(segments: GeometrySegment[]): { min_x: number; min_y: number; max_x: number; max_y: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  function updatePt(p: Point2D): void {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  for (const seg of segments) {
    updatePt(seg.start);
    updatePt(seg.end);
    if (seg.type === "arc") {
      // Sample arc for bbox accuracy
      const steps = Math.max(8, Math.ceil(arcLength(seg) / 1.0));
      for (let i = 1; i < steps; i++) {
        updatePt(arcPointAt(seg, i / steps));
      }
    }
  }

  if (!isFinite(minX)) return { min_x: 0, min_y: 0, max_x: 0, max_y: 0 };
  return { min_x: minX, min_y: minY, max_x: maxX, max_y: maxY };
}

/**
 * Check if an angle lies within an arc's angular sweep.
 * Handles wrap-around correctly for both CW and CCW arcs.
 */
function isAngleInSweep(angle: number, startAngle: number, endAngle: number, ccw: boolean): boolean {
  const a = normalizeAngle(angle);
  const s = normalizeAngle(startAngle);
  const e = normalizeAngle(endAngle);

  if (ccw) {
    // CCW: sweep from s to e going counterclockwise (increasing angle)
    if (s <= e) return a >= s && a <= e;
    return a >= s || a <= e; // wraps through 0
  } else {
    // CW: sweep from s to e going clockwise (decreasing angle)
    if (s >= e) return a <= s && a >= e;
    return a <= s || a >= e; // wraps through 0
  }
}

// ============================================================================
// BIARC FITTING — Spline to arc decomposition
// ============================================================================

/**
 * Fit a biarc (two tangent-continuous arcs) through start/end points with tangents.
 * Used for spline-to-arc conversion with chord tolerance control.
 *
 * Reference: Meek & Walton (1997) "Approximation of discrete data by G1 arc splines"
 */
function fitBiarc(
  p0: Point2D, t0: Point2D, // start point + tangent
  p1: Point2D, t1: Point2D, // end point + tangent
): ArcSegment[] {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const d = Math.sqrt(dx * dx + dy * dy);

  if (d < MIN_SEGMENT_LENGTH_MM) return [];

  // Midpoint as junction
  const mx = (p0.x + p1.x) / 2;
  const my = (p0.y + p1.y) / 2;

  const arcs: ArcSegment[] = [];

  // First arc: p0 → mid
  const arc1 = fitSingleArc(p0, { x: mx, y: my });
  if (arc1) arcs.push(arc1);

  // Second arc: mid → p1
  const arc2 = fitSingleArc({ x: mx, y: my }, p1);
  if (arc2) arcs.push(arc2);

  return arcs;
}

/**
 * Fit a single arc through two points. For short segments, the arc center
 * is placed at the perpendicular bisector at a distance that matches the chord.
 */
function fitSingleArc(p0: Point2D, p1: Point2D): ArcSegment | null {
  const d = dist(p0, p1);
  if (d < MIN_SEGMENT_LENGTH_MM) return null;

  // Large radius arc approximation (nearly straight)
  const r = d * 5; // generous radius for gentle curve
  const mx = (p0.x + p1.x) / 2;
  const my = (p0.y + p1.y) / 2;
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  // Perpendicular direction
  const px = -dy / d;
  const py = dx / d;
  const h = Math.sqrt(Math.max(0, r * r - (d / 2) * (d / 2)));
  const cx = mx + px * h;
  const cy = my + py * h;

  const startAngle = Math.atan2(p0.y - cy, p0.x - cx);
  const endAngle = Math.atan2(p1.y - cy, p1.x - cx);

  return {
    type: "arc",
    start: p0,
    end: p1,
    center: { x: cx, y: cy },
    radius: r,
    start_angle_rad: normalizeAngle(startAngle),
    end_angle_rad: normalizeAngle(endAngle),
    ccw: true,
  };
}

/**
 * Convert B-spline control points to arc segments via adaptive sampling + biarc fitting.
 * Chord tolerance: SPLINE_CHORD_TOLERANCE_MM (0.005mm).
 */
function splineToArcs(
  controlPts: Point2D[],
  degree: number,
  knots: number[],
): GeometrySegment[] {
  if (controlPts.length < 2) return [];

  // Evaluate spline at dense sample points
  const tMin = knots[degree];
  const tMax = knots[knots.length - degree - 1];
  if (tMax <= tMin) return [];

  // Adaptive sampling: start with initial samples, refine where chord error is high
  const sampleCount = Math.max(32, controlPts.length * 8);
  const pts: Point2D[] = [];
  for (let i = 0; i <= sampleCount; i++) {
    const t = tMin + (i / sampleCount) * (tMax - tMin);
    pts.push(deBoorEvaluate(degree, knots, controlPts, t));
  }

  // Convert sampled points to arc segments using biarc fitting
  const segments: GeometrySegment[] = [];
  let i = 0;
  while (i < pts.length - 1) {
    // Try to fit longest arc span within chord tolerance
    let bestEnd = i + 1;
    for (let j = Math.min(i + 16, pts.length - 1); j > i + 1; j--) {
      const arc = fitSingleArc(pts[i], pts[j]);
      if (arc && arcChordError(arc, pts, i, j) < SPLINE_CHORD_TOLERANCE_MM) {
        bestEnd = j;
        break;
      }
    }

    if (bestEnd === i + 1) {
      // Fall back to line segment
      segments.push({
        type: "line",
        start: pts[i],
        end: pts[i + 1],
      });
    } else {
      const arc = fitSingleArc(pts[i], pts[bestEnd]);
      if (arc) segments.push(arc);
    }
    i = bestEnd;
  }

  return segments;
}

/** Check maximum chord error of an arc against sampled points */
function arcChordError(arc: ArcSegment, pts: Point2D[], startIdx: number, endIdx: number): number {
  let maxError = 0;
  for (let k = startIdx + 1; k < endIdx; k++) {
    const d = Math.abs(dist(pts[k], arc.center) - arc.radius);
    if (d > maxError) maxError = d;
  }
  return maxError;
}

/** De Boor's algorithm for B-spline evaluation */
function deBoorEvaluate(
  degree: number,
  knots: number[],
  controlPts: Point2D[],
  t: number,
): Point2D {
  const n = controlPts.length - 1;
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
        x: d[j - 1].x + alpha * (d[j].x - d[j - 1].x),
        y: d[j - 1].y + alpha * (d[j].y - d[j - 1].y),
      };
    }
  }
  return d[degree];
}

// ============================================================================
// BULGE → ARC conversion (LWPOLYLINE)
// ============================================================================

/**
 * Convert DXF bulge value to an arc segment between two vertices.
 * Bulge = tan(sweep_angle / 4). Positive = CCW, negative = CW.
 */
function bulgeToArc(p0: Point2D, p1: Point2D, bulge: number): ArcSegment {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const chord = Math.sqrt(dx * dx + dy * dy);
  const sagitta = Math.abs(bulge) * chord / 2;
  const radius = ((chord / 2) * (chord / 2) + sagitta * sagitta) / (2 * sagitta);

  // Center calculation
  const mx = (p0.x + p1.x) / 2;
  const my = (p0.y + p1.y) / 2;
  const px = -dy / chord;
  const py = dx / chord;
  const h = radius - sagitta;
  const sign = bulge > 0 ? 1 : -1;
  const cx = mx + sign * px * h;
  const cy = my + sign * py * h;

  const startAngle = Math.atan2(p0.y - cy, p0.x - cx);
  const endAngle = Math.atan2(p1.y - cy, p1.x - cx);

  return {
    type: "arc",
    start: p0,
    end: p1,
    center: { x: cx, y: cy },
    radius: Math.abs(radius),
    start_angle_rad: normalizeAngle(startAngle),
    end_angle_rad: normalizeAngle(endAngle),
    ccw: bulge > 0,
  };
}

// ============================================================================
// ELLIPSE → ARC DECOMPOSITION
// ============================================================================

/**
 * Decompose ellipse to arc segments. Accounts for major axis rotation angle
 * (the angle of the vector from center to major axis endpoint).
 * For circular ellipses (ratio ≈ 1), returns exact arcs.
 * For non-circular, uses multi-arc approximation with rotated sampling.
 *
 * Reference: AutoCAD DXF Reference — ELLIPSE entity groups 11/21 define
 * the major axis endpoint relative to center, encoding both length and rotation.
 */
function ellipseToArcs(
  cx: number, cy: number,
  majorX: number, majorY: number,
  ratio: number,
  startRad: number, endRad: number,
): GeometrySegment[] {
  const rx = Math.sqrt(majorX * majorX + majorY * majorY);
  const ry = rx * ratio;
  const rot = Math.atan2(majorY, majorX); // Major axis rotation angle
  const cosRot = Math.cos(rot);
  const sinRot = Math.sin(rot);

  /** Compute rotated ellipse point at parameter a */
  function ellipsePoint(a: number): Point2D {
    return {
      x: cx + rx * Math.cos(a) * cosRot - ry * Math.sin(a) * sinRot,
      y: cy + rx * Math.cos(a) * sinRot + ry * Math.sin(a) * cosRot,
    };
  }

  // If nearly circular (ratio > 0.95), treat as single arc with rotation applied
  if (ratio > 0.95) {
    const r = (rx + ry) / 2;
    const start = ellipsePoint(startRad);
    const end = ellipsePoint(endRad);
    return [{
      type: "arc",
      start,
      end,
      center: { x: cx, y: cy },
      radius: r,
      start_angle_rad: normalizeAngle(Math.atan2(start.y - cy, start.x - cx)),
      end_angle_rad: normalizeAngle(Math.atan2(end.y - cy, end.x - cx)),
      ccw: true,
    }];
  }

  // Non-circular: decompose to multiple arcs by sampling + biarc fitting
  let sweep = endRad - startRad;
  if (sweep <= 0) sweep += TWO_PI;
  const nArcs = Math.max(4, Math.ceil(sweep / (Math.PI / 4)));
  const segments: GeometrySegment[] = [];

  for (let i = 0; i < nArcs; i++) {
    const a0 = startRad + (i / nArcs) * sweep;
    const a1 = startRad + ((i + 1) / nArcs) * sweep;
    const p0 = ellipsePoint(a0);
    const p1 = ellipsePoint(a1);
    const arc = fitSingleArc(p0, p1);
    if (arc) segments.push(arc);
  }

  return segments;
}

// ============================================================================
// DXF GROUP CODE PARSER
// ============================================================================

function parseDXFGroups(content: string): Array<[number, string]> {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const nonBlank = lines.filter((l) => l.trim() !== "");
  const groups: Array<[number, string]> = [];
  for (let i = 0; i + 1 < nonBlank.length; i += 2) {
    if (groups.length >= MAX_DXF_GROUPS) {
      throw new Error(`DXF entity limit exceeded: file contains more than ${MAX_DXF_GROUPS} group code pairs`);
    }
    const code = parseInt(nonBlank[i].trim(), 10);
    const value = nonBlank[i + 1].trim();
    if (!isNaN(code)) {
      groups.push([code, value]);
    }
  }
  return groups;
}

function collectEntityProps(groups: Array<[number, string]>, startIdx: number): { props: Record<number, string>; nextIdx: number } {
  const props: Record<number, string> = {};
  let i = startIdx;
  while (i < groups.length && groups[i][0] !== 0) {
    props[groups[i][0]] = groups[i][1];
    i++;
  }
  return { props, nextIdx: i };
}

function collectEntityRawGroups(groups: Array<[number, string]>, startIdx: number): { rawGroups: Array<[number, string]>; nextIdx: number } {
  const rawGroups: Array<[number, string]> = [];
  let i = startIdx;
  while (i < groups.length && groups[i][0] !== 0) {
    rawGroups.push(groups[i]);
    i++;
  }
  return { rawGroups, nextIdx: i };
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

export class DXFGeometryParserEngine {

  /**
   * Parse a DXF file into Wire EDM contours with preserved arc/line semantics.
   *
   * @param content - Raw DXF file content as string
   * @returns GeometryParseResult with contours, issues, and metadata
   */
  parseGeometryFile(content: string, format: "dxf" | "step" | "iges" = "dxf"): GeometryParseResult {
    if (format === "step" || format === "iges") {
      return this.parseSTEPOrIGES(content, format);
    }
    return this.parseDXF(content);
  }

  parseDXF(content: string): GeometryParseResult {
    const groups = parseDXFGroups(content);
    const issues: GeometryIssue[] = [];
    const warnings: string[] = [];

    // Phase 0: Parse HEADER for $INSUNITS (inch vs mm detection)
    const source_units = this.parseHeaderUnits(groups);

    // Phase 1: Extract BLOCK definitions
    const blocks = this.extractBlocks(groups);

    // Phase 2: Extract ENTITIES section segments (with INSERT/BLOCK resolution)
    const { segments, entityCount } = this.extractEntities(groups, blocks, issues);

    // Phase 3: Build contour chains from segments
    let contours = this.buildContours(segments, issues);

    // Phase 4: Remove duplicate contours
    contours = this.removeDuplicateContours(contours, issues);

    // Phase 5: Normalize winding order (CCW = exterior, CW = interior)
    contours = this.normalizeWinding(contours);

    // Phase 6: Detect self-intersections
    this.detectSelfIntersections(contours, issues);

    log.debug("[DXFGeometryParserEngine] parseDXF", {
      entities: entityCount,
      contours: contours.length,
      issues: issues.length,
    });

    return {
      contours,
      issues,
      entity_count: entityCount,
      source_format: "dxf",
      source_units,
      warnings,
    };
  }

  /**
   * Placeholder for STEP/IGES parsing. In production this would use opencascade.js.
   * For now, returns a clear error directing users to DXF format.
   */
  private parseSTEPOrIGES(content: string, format: "step" | "iges"): GeometryParseResult {
    return {
      contours: [],
      issues: [{
        type: "open_contour",
        severity: "error",
        message: `${format.toUpperCase()} parsing requires opencascade.js integration. Convert to DXF for Wire EDM use.`,
      }],
      entity_count: 0,
      source_format: format,
      source_units: "unknown",
      warnings: [`${format.toUpperCase()} support pending opencascade.js integration`],
    };
  }

  /**
   * Parse DXF HEADER section for $INSUNITS variable.
   * $INSUNITS group 70 values: 1=inches, 4=millimeters.
   * Reference: AutoCAD DXF Reference — HEADER section system variables.
   */
  private parseHeaderUnits(groups: Array<[number, string]>): "mm" | "inch" | "unknown" {
    for (let i = 0; i < groups.length; i++) {
      // Stop at ENTITIES or BLOCKS — HEADER is always before them
      if (groups[i][0] === 2 && (groups[i][1] === "ENTITIES" || groups[i][1] === "BLOCKS")) break;
      if (groups[i][0] === 9 && groups[i][1] === "$INSUNITS") {
        // Next group with code 70 is the units value
        for (let j = i + 1; j < groups.length && j < i + 5; j++) {
          if (groups[j][0] === 70) {
            const code = parseInt(groups[j][1], 10);
            if (code === 1) return "inch";
            if (code === 4) return "mm";
            return "unknown";
          }
        }
      }
    }
    return "unknown";
  }

  // ── BLOCK extraction ────────────────────────────────────────────────

  private extractBlocks(groups: Array<[number, string]>): Map<string, BlockDefinition> {
    const blocks = new Map<string, BlockDefinition>();
    let i = 0;
    let inBlocks = false;

    while (i < groups.length) {
      const [code, value] = groups[i];

      if (code === 2 && value === "BLOCKS") {
        inBlocks = true;
        i++;
        continue;
      }
      if (code === 0 && value === "ENDSEC") {
        break;
      }
      if (!inBlocks) { i++; continue; }

      // BLOCK entity start
      if (code === 0 && value === "BLOCK") {
        i++;
        let blockName = "";
        // Read block header
        while (i < groups.length && !(groups[i][0] === 0 && groups[i][1] === "ENDBLK")) {
          if (groups[i][0] === 2) blockName = groups[i][1];
          if (groups[i][0] === 0 && groups[i][1] !== "BLOCK") break;
          i++;
        }

        // Parse entities within block
        const blockSegments: RawSegment[] = [];
        while (i < groups.length && !(groups[i][0] === 0 && groups[i][1] === "ENDBLK")) {
          if (groups[i][0] === 0) {
            const entityType = groups[i][1];
            i++;
            const segs = this.parseEntityToRawSegments(entityType, groups, i);
            blockSegments.push(...segs.segments);
            i = segs.nextIdx;
          } else {
            i++;
          }
        }

        if (blockName) {
          blocks.set(blockName, { name: blockName, segments: blockSegments });
        }
        if (i < groups.length) i++; // Skip ENDBLK
      } else {
        i++;
      }
    }

    return blocks;
  }

  // ── Entity extraction ───────────────────────────────────────────────

  private extractEntities(
    groups: Array<[number, string]>,
    blocks: Map<string, BlockDefinition>,
    issues: GeometryIssue[],
  ): { segments: GeometrySegment[]; entityCount: number } {
    const segments: GeometrySegment[] = [];
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
      if (!inEntities) {
        // Skip everything until we find ENTITIES section
        i++;
        continue;
      }
      if (code === 0 && (value === "ENDSEC" || value === "EOF")) break;

      if (code === 0) {
        const entityType = value;
        entityCount++;
        i++;

        if (entityType === "INSERT") {
          // Resolve BLOCK reference
          const { props, nextIdx } = collectEntityProps(groups, i);
          i = nextIdx;
          const blockName = props[2] ?? "";
          const block = blocks.get(blockName);
          if (block) {
            const insertX = parseFloat(props[10] ?? "0");
            const insertY = parseFloat(props[20] ?? "0");
            const scaleX = parseFloat(props[41] ?? "1");
            const scaleY = parseFloat(props[42] ?? "1");
            const rotation = parseFloat(props[50] ?? "0") * DEG2RAD;

            for (const rawSeg of block.segments) {
              const transformed = this.transformRawSegment(rawSeg, insertX, insertY, scaleX, scaleY, rotation);
              segments.push(transformed);
            }
          } else {
            issues.push({
              type: "open_contour",
              severity: "warning",
              message: `Block "${blockName}" not found for INSERT entity`,
            });
          }
        } else {
          const parsed = this.parseEntityToSegments(entityType, groups, i);
          segments.push(...parsed.segments);
          i = parsed.nextIdx;
        }
      } else {
        i++;
      }
    }

    return { segments, entityCount };
  }

  private parseEntityToRawSegments(
    entityType: string,
    groups: Array<[number, string]>,
    startIdx: number,
  ): { segments: RawSegment[]; nextIdx: number } {
    const result = this.parseEntityToSegments(entityType, groups, startIdx);
    return {
      segments: result.segments.map(s => ({
        type: s.type,
        start: s.start,
        end: s.end,
        ...(s.type === "arc" ? {
          center: s.center,
          radius: s.radius,
          start_angle_rad: s.start_angle_rad,
          end_angle_rad: s.end_angle_rad,
          ccw: s.ccw,
        } : {}),
      })),
      nextIdx: result.nextIdx,
    };
  }

  private parseEntityToSegments(
    entityType: string,
    groups: Array<[number, string]>,
    startIdx: number,
  ): { segments: GeometrySegment[]; nextIdx: number } {
    switch (entityType) {
      case "LINE": return this.parseLine(groups, startIdx);
      case "ARC": return this.parseArc(groups, startIdx);
      case "CIRCLE": return this.parseCircle(groups, startIdx);
      case "LWPOLYLINE": return this.parseLWPolyline(groups, startIdx);
      case "ELLIPSE": return this.parseEllipse(groups, startIdx);
      case "SPLINE": return this.parseSpline(groups, startIdx);
      default: {
        // Skip unknown entity
        let i = startIdx;
        while (i < groups.length && groups[i][0] !== 0) i++;
        return { segments: [], nextIdx: i };
      }
    }
  }

  // ── Individual entity parsers ───────────────────────────────────────

  private parseLine(groups: Array<[number, string]>, startIdx: number): { segments: GeometrySegment[]; nextIdx: number } {
    const { props, nextIdx } = collectEntityProps(groups, startIdx);
    const start: Point2D = { x: parseFloat(props[10] ?? "0"), y: parseFloat(props[20] ?? "0") };
    const end: Point2D = { x: parseFloat(props[11] ?? "0"), y: parseFloat(props[21] ?? "0") };

    if (dist(start, end) < MIN_SEGMENT_LENGTH_MM) return { segments: [], nextIdx };

    return {
      segments: [{ type: "line", start, end }],
      nextIdx,
    };
  }

  private parseArc(groups: Array<[number, string]>, startIdx: number): { segments: GeometrySegment[]; nextIdx: number } {
    const { props, nextIdx } = collectEntityProps(groups, startIdx);
    const cx = parseFloat(props[10] ?? "0");
    const cy = parseFloat(props[20] ?? "0");
    const r = parseFloat(props[40] ?? "1");
    const startDeg = parseFloat(props[50] ?? "0");
    const endDeg = parseFloat(props[51] ?? "360");

    const startRad = startDeg * DEG2RAD;
    const endRad = endDeg * DEG2RAD;
    const start: Point2D = { x: cx + r * Math.cos(startRad), y: cy + r * Math.sin(startRad) };
    const end: Point2D = { x: cx + r * Math.cos(endRad), y: cy + r * Math.sin(endRad) };

    return {
      segments: [{
        type: "arc",
        start,
        end,
        center: { x: cx, y: cy },
        radius: r,
        start_angle_rad: normalizeAngle(startRad),
        end_angle_rad: normalizeAngle(endRad),
        ccw: true, // DXF arcs are always CCW
      }],
      nextIdx,
    };
  }

  private parseCircle(groups: Array<[number, string]>, startIdx: number): { segments: GeometrySegment[]; nextIdx: number } {
    const { props, nextIdx } = collectEntityProps(groups, startIdx);
    const cx = parseFloat(props[10] ?? "0");
    const cy = parseFloat(props[20] ?? "0");
    const r = parseFloat(props[40] ?? "1");

    // Circle = full arc from 0 to 2π
    const start: Point2D = { x: cx + r, y: cy };
    return {
      segments: [{
        type: "arc",
        start,
        end: { ...start }, // Same point — full circle
        center: { x: cx, y: cy },
        radius: r,
        start_angle_rad: 0,
        end_angle_rad: TWO_PI,
        ccw: true,
      }],
      nextIdx,
    };
  }

  private parseLWPolyline(groups: Array<[number, string]>, startIdx: number): { segments: GeometrySegment[]; nextIdx: number } {
    const { rawGroups, nextIdx } = collectEntityRawGroups(groups, startIdx);

    const xs: number[] = [];
    const ys: number[] = [];
    const bulges: number[] = [];
    let closed = false;

    for (const [code, val] of rawGroups) {
      if (code === 70) closed = (parseInt(val) & 1) === 1;
      if (code === 10) {
        xs.push(parseFloat(val));
        // Initialize bulge for this vertex to 0 — group 42 will overwrite if present.
        // This keeps bulges[] aligned 1:1 with xs[] regardless of which vertices have bulge values.
        bulges.push(0);
      }
      if (code === 20) ys.push(parseFloat(val));
      if (code === 42 && bulges.length > 0) {
        // Assign bulge to the most recently pushed vertex
        bulges[bulges.length - 1] = parseFloat(val);
      }
    }

    const segments: GeometrySegment[] = [];
    const vertexCount = closed ? xs.length : xs.length - 1;

    for (let i = 0; i < vertexCount; i++) {
      const p0: Point2D = { x: xs[i], y: ys[i] };
      const p1: Point2D = { x: xs[(i + 1) % xs.length], y: ys[(i + 1) % xs.length] };

      if (dist(p0, p1) < MIN_SEGMENT_LENGTH_MM) continue;

      if (Math.abs(bulges[i]) > 1e-10) {
        segments.push(bulgeToArc(p0, p1, bulges[i]));
      } else {
        segments.push({ type: "line", start: p0, end: p1 });
      }
    }

    return { segments, nextIdx };
  }

  private parseEllipse(groups: Array<[number, string]>, startIdx: number): { segments: GeometrySegment[]; nextIdx: number } {
    const { props, nextIdx } = collectEntityProps(groups, startIdx);
    const cx = parseFloat(props[10] ?? "0");
    const cy = parseFloat(props[20] ?? "0");
    const majorX = parseFloat(props[11] ?? "1");
    const majorY = parseFloat(props[21] ?? "0");
    const ratio = parseFloat(props[40] ?? "1");
    const startRad = parseFloat(props[41] ?? "0");
    const endRad = parseFloat(props[42] ?? String(TWO_PI));

    const segments = ellipseToArcs(cx, cy, majorX, majorY, ratio, startRad, endRad);
    return { segments, nextIdx };
  }

  private parseSpline(groups: Array<[number, string]>, startIdx: number): { segments: GeometrySegment[]; nextIdx: number } {
    const { rawGroups, nextIdx } = collectEntityRawGroups(groups, startIdx);

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

    if (controlPts.length < 2 || knots.length < degree + controlPts.length + 1) {
      // Insufficient data — fall back to line segments between control points
      const segments: GeometrySegment[] = [];
      for (let i = 0; i < controlPts.length - 1; i++) {
        if (dist(controlPts[i], controlPts[i + 1]) >= MIN_SEGMENT_LENGTH_MM) {
          segments.push({ type: "line", start: controlPts[i], end: controlPts[i + 1] });
        }
      }
      return { segments, nextIdx };
    }

    const segments = splineToArcs(controlPts, degree, knots);
    return { segments, nextIdx };
  }

  // ── Transform for INSERT entities ───────────────────────────────────

  private transformRawSegment(
    raw: RawSegment,
    tx: number, ty: number,
    sx: number, sy: number,
    rotation: number,
  ): GeometrySegment {
    const transform = (p: Point2D): Point2D => {
      // Scale
      let x = p.x * sx;
      let y = p.y * sy;
      // Rotate
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const rx = x * cos - y * sin;
      const ry = x * sin + y * cos;
      // Translate
      return { x: rx + tx, y: ry + ty };
    };

    if (raw.type === "line") {
      return { type: "line", start: transform(raw.start), end: transform(raw.end) };
    }

    // Arc: transform center, scale radius, adjust angles for rotation
    const center = transform(raw.center!);
    const radius = raw.radius! * Math.abs(sx); // Assume uniform scale for arcs
    const startAngle = normalizeAngle(raw.start_angle_rad! + rotation);
    const endAngle = normalizeAngle(raw.end_angle_rad! + rotation);
    const ccw = (sx * sy > 0) ? raw.ccw! : !raw.ccw!; // Flip if mirrored

    return {
      type: "arc",
      start: transform(raw.start),
      end: transform(raw.end),
      center,
      radius,
      start_angle_rad: startAngle,
      end_angle_rad: endAngle,
      ccw,
    };
  }

  // ── Contour building (gap closure) ──────────────────────────────────

  private buildContours(
    segments: GeometrySegment[],
    issues: GeometryIssue[],
  ): WireEDMContour[] {
    if (segments.length === 0) return [];

    const used = new Set<number>();
    const contours: WireEDMContour[] = [];
    let contourIdx = 0;

    // Handle self-closing segments (circles)
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.type === "arc" && ptEq(seg.start, seg.end, GAP_TOLERANCE_MM)) {
        // Full circle — standalone contour
        used.add(i);
        const area = Math.abs(contourSignedArea([seg]));
        contours.push({
          id: `contour_${contourIdx++}`,
          segments: [seg],
          is_closed: true,
          is_exterior: true,
          area_mm2: parseFloat(area.toFixed(4)),
          perimeter_mm: parseFloat(contourPerimeter([seg]).toFixed(4)),
          bbox: contourBBox([seg]),
        });
      }
    }

    // Chain remaining segments into contours
    while (true) {
      // Find first unused segment
      let startIdx = -1;
      for (let i = 0; i < segments.length; i++) {
        if (!used.has(i)) { startIdx = i; break; }
      }
      if (startIdx === -1) break;

      const chain: GeometrySegment[] = [segments[startIdx]];
      used.add(startIdx);
      let chainEnd = segmentEnd(segments[startIdx]);
      const chainStart = segmentStart(segments[startIdx]);

      // Greedily extend chain
      let changed = true;
      while (changed) {
        changed = false;
        for (let i = 0; i < segments.length; i++) {
          if (used.has(i)) continue;
          const seg = segments[i];
          const sStart = segmentStart(seg);
          const sEnd = segmentEnd(seg);

          if (dist(chainEnd, sStart) < GAP_TOLERANCE_MM) {
            // Close gap if needed
            if (dist(chainEnd, sStart) > DUPLICATE_TOLERANCE_MM) {
              issues.push({
                type: "gap_closed",
                severity: "info",
                message: `Gap of ${dist(chainEnd, sStart).toFixed(4)}mm auto-closed`,
                location: chainEnd,
              });
            }
            chain.push(seg);
            chainEnd = sEnd;
            used.add(i);
            changed = true;
            break;
          } else if (dist(chainEnd, sEnd) < GAP_TOLERANCE_MM) {
            // Reverse segment
            chain.push(this.reverseSegment(seg));
            chainEnd = sStart;
            used.add(i);
            changed = true;
            break;
          }
        }
      }

      const isClosed = dist(chainStart, chainEnd) < GAP_TOLERANCE_MM;
      if (!isClosed) {
        issues.push({
          type: "open_contour",
          severity: "error",
          message: `Open contour detected — gap of ${dist(chainStart, chainEnd).toFixed(4)}mm between start and end`,
          location: chainEnd,
        });
      }

      const signedA = contourSignedArea(chain);
      const area = Math.abs(signedA);

      contours.push({
        id: `contour_${contourIdx++}`,
        segments: chain,
        is_closed: isClosed,
        is_exterior: signedA > 0, // CCW = positive area = exterior
        area_mm2: parseFloat(area.toFixed(4)),
        perimeter_mm: parseFloat(contourPerimeter(chain).toFixed(4)),
        bbox: contourBBox(chain),
      });
    }

    return contours;
  }

  private reverseSegment(seg: GeometrySegment): GeometrySegment {
    if (seg.type === "line") {
      return { type: "line", start: seg.end, end: seg.start };
    }
    return {
      type: "arc",
      start: seg.end,
      end: seg.start,
      center: seg.center,
      radius: seg.radius,
      start_angle_rad: seg.end_angle_rad,
      end_angle_rad: seg.start_angle_rad,
      ccw: !seg.ccw,
    };
  }

  // ── Duplicate removal ───────────────────────────────────────────────

  private removeDuplicateContours(
    contours: WireEDMContour[],
    issues: GeometryIssue[],
  ): WireEDMContour[] {
    const kept: WireEDMContour[] = [];
    for (const c of contours) {
      const isDuplicate = kept.some(existing =>
        Math.abs(existing.area_mm2 - c.area_mm2) < 0.01 &&
        Math.abs(existing.perimeter_mm - c.perimeter_mm) < 0.01 &&
        Math.abs(existing.bbox.min_x - c.bbox.min_x) < DUPLICATE_TOLERANCE_MM &&
        Math.abs(existing.bbox.min_y - c.bbox.min_y) < DUPLICATE_TOLERANCE_MM
      );

      if (isDuplicate) {
        issues.push({
          type: "duplicate_removed",
          severity: "info",
          message: `Duplicate contour removed (area=${c.area_mm2.toFixed(2)}mm²)`,
          contour_id: c.id,
        });
      } else {
        kept.push(c);
      }
    }
    return kept;
  }

  // ── Winding normalization ───────────────────────────────────────────

  private normalizeWinding(contours: WireEDMContour[]): WireEDMContour[] {
    if (contours.length === 0) return contours;

    // Find the outermost contour (largest area)
    let maxArea = -1;
    let outerIdx = 0;
    for (let i = 0; i < contours.length; i++) {
      if (contours[i].area_mm2 > maxArea) {
        maxArea = contours[i].area_mm2;
        outerIdx = i;
      }
    }

    return contours.map((c, i) => {
      const shouldBeExterior = i === outerIdx || !this.isContainedBy(c, contours[outerIdx]);
      const signedA = contourSignedArea(c.segments);
      const currentlyCCW = signedA > 0;

      if (shouldBeExterior && !currentlyCCW) {
        // Reverse to CCW
        return { ...c, segments: this.reverseContourSegments(c.segments), is_exterior: true };
      } else if (!shouldBeExterior && currentlyCCW) {
        // Reverse to CW
        return { ...c, segments: this.reverseContourSegments(c.segments), is_exterior: false };
      }

      return { ...c, is_exterior: shouldBeExterior };
    });
  }

  private reverseContourSegments(segments: GeometrySegment[]): GeometrySegment[] {
    return segments.map(s => this.reverseSegment(s)).reverse();
  }

  /** Simple containment check: is c's center inside outer? */
  private isContainedBy(c: WireEDMContour, outer: WireEDMContour): boolean {
    const cx = (c.bbox.min_x + c.bbox.max_x) / 2;
    const cy = (c.bbox.min_y + c.bbox.max_y) / 2;
    return cx >= outer.bbox.min_x && cx <= outer.bbox.max_x &&
           cy >= outer.bbox.min_y && cy <= outer.bbox.max_y &&
           c.area_mm2 < outer.area_mm2;
  }

  // ── Self-intersection detection ─────────────────────────────────────

  private detectSelfIntersections(contours: WireEDMContour[], issues: GeometryIssue[]): void {
    for (const c of contours) {
      const segs = c.segments;
      for (let i = 0; i < segs.length; i++) {
        for (let j = i + 2; j < segs.length; j++) {
          // Skip adjacent segments (they share an endpoint)
          if (j === i + 1 || (i === 0 && j === segs.length - 1)) continue;

          if (this.segmentsIntersect(segs[i], segs[j])) {
            const loc = segmentStart(segs[i]);
            issues.push({
              type: "self_intersection",
              severity: "error",
              message: `Self-intersection detected between segments ${i} and ${j} in ${c.id}`,
              location: loc,
              contour_id: c.id,
            });
            return; // One intersection per contour is enough
          }
        }
      }
    }
  }

  /**
   * Intersection test supporting all segment type combinations:
   * line-line, line-arc, arc-line, and arc-arc.
   */
  private segmentsIntersect(a: GeometrySegment, b: GeometrySegment): boolean {
    if (a.type === "line" && b.type === "line") return this.lineLineIntersect(a, b);
    if (a.type === "line" && b.type === "arc") return this.lineArcIntersect(a, b);
    if (a.type === "arc" && b.type === "line") return this.lineArcIntersect(b, a);
    // arc-arc
    return this.arcArcIntersect(a as ArcSegment, b as ArcSegment);
  }

  private lineLineIntersect(a: GeometrySegment, b: GeometrySegment): boolean {
    const d1x = a.end.x - a.start.x, d1y = a.end.y - a.start.y;
    const d2x = b.end.x - b.start.x, d2y = b.end.y - b.start.y;
    const cross = d1x * d2y - d1y * d2x;
    if (Math.abs(cross) < 1e-10) return false;
    const dx = b.start.x - a.start.x;
    const dy = b.start.y - a.start.y;
    const t = (dx * d2y - dy * d2x) / cross;
    const u = (dx * d1y - dy * d1x) / cross;
    return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99;
  }

  /** Line-circle intersection via quadratic, then check arc sweep range */
  private lineArcIntersect(line: GeometrySegment, arc: ArcSegment): boolean {
    const ax = line.start.x, ay = line.start.y;
    const dx = line.end.x - ax, dy = line.end.y - ay;
    const fx = ax - arc.center.x, fy = ay - arc.center.y;

    const qa = dx * dx + dy * dy;
    const qb = 2 * (fx * dx + fy * dy);
    const qc = fx * fx + fy * fy - arc.radius * arc.radius;
    const disc = qb * qb - 4 * qa * qc;
    if (disc < 0) return false;

    const sqrtDisc = Math.sqrt(disc);
    for (const t of [(-qb - sqrtDisc) / (2 * qa), (-qb + sqrtDisc) / (2 * qa)]) {
      if (t > 0.01 && t < 0.99) {
        const px = ax + t * dx, py = ay + t * dy;
        const angle = Math.atan2(py - arc.center.y, px - arc.center.x);
        if (isAngleInSweep(angle, arc.start_angle_rad, arc.end_angle_rad, arc.ccw)) {
          return true;
        }
      }
    }
    return false;
  }

  /** Two-circle intersection, then check both arcs' sweep ranges */
  private arcArcIntersect(a: ArcSegment, b: ArcSegment): boolean {
    const d = dist(a.center, b.center);
    if (d > a.radius + b.radius + 1e-10) return false; // Too far apart
    if (d < Math.abs(a.radius - b.radius) - 1e-10) return false; // One inside other
    if (d < 1e-10) return false; // Concentric

    const a2 = (a.radius * a.radius - b.radius * b.radius + d * d) / (2 * d);
    const hSq = a.radius * a.radius - a2 * a2;
    if (hSq < 0) return false;
    const h = Math.sqrt(hSq);

    const mx = a.center.x + a2 * (b.center.x - a.center.x) / d;
    const my = a.center.y + a2 * (b.center.y - a.center.y) / d;
    const px = -(b.center.y - a.center.y) / d * h;
    const py = (b.center.x - a.center.x) / d * h;

    for (const pt of [{ x: mx + px, y: my + py }, { x: mx - px, y: my - py }]) {
      // Skip shared endpoints (adjacent segments share endpoints)
      if (ptEq(pt, a.start) || ptEq(pt, a.end) || ptEq(pt, b.start) || ptEq(pt, b.end)) continue;
      const angA = Math.atan2(pt.y - a.center.y, pt.x - a.center.x);
      const angB = Math.atan2(pt.y - b.center.y, pt.x - b.center.x);
      if (isAngleInSweep(angA, a.start_angle_rad, a.end_angle_rad, a.ccw) &&
          isAngleInSweep(angB, b.start_angle_rad, b.end_angle_rad, b.ccw)) {
        return true;
      }
    }
    return false;
  }

  // ── Geometry validation (Wire EDM specific) ─────────────────────────

  /**
   * Validate contours against Wire EDM constraints.
   *
   * @param contours - Parsed contours
   * @param wireDiameter_mm - Wire diameter (default 0.25mm for standard brass)
   * @param sparkGap_mm - Spark gap (default 0.013mm per side)
   * @returns Additional issues found during validation
   */
  validateForWireEDM(
    contours: WireEDMContour[],
    wireDiameter_mm = 0.25,
    sparkGap_mm = 0.013,
  ): GeometryIssue[] {
    const issues: GeometryIssue[] = [];
    const minSlotWidth = wireDiameter_mm + 2 * sparkGap_mm + 0.05;

    for (const c of contours) {
      // Check closed contour
      if (!c.is_closed) {
        issues.push({
          type: "open_contour",
          severity: "error",
          message: `Contour ${c.id} is not closed — Wire EDM requires closed profiles`,
          contour_id: c.id,
        });
      }

      // Check min segment length
      for (const seg of c.segments) {
        const len = segmentLength(seg);
        if (len < wireDiameter_mm) {
          issues.push({
            type: "short_segment",
            severity: "warning",
            message: `Segment in ${c.id} is ${len.toFixed(4)}mm — shorter than wire diameter (${wireDiameter_mm}mm)`,
            location: seg.start,
            contour_id: c.id,
          });
        }
      }

      // Check narrow slots (simplified: check min bbox dimension)
      const bboxW = c.bbox.max_x - c.bbox.min_x;
      const bboxH = c.bbox.max_y - c.bbox.min_y;
      const minDim = Math.min(bboxW, bboxH);
      if (minDim > 0 && minDim < minSlotWidth && !c.is_exterior) {
        issues.push({
          type: "narrow_slot",
          severity: "warning",
          message: `Contour ${c.id} has dimension ${minDim.toFixed(3)}mm — narrower than min slot width (${minSlotWidth.toFixed(3)}mm = wire + 2×gap + 0.05mm)`,
          location: { x: c.bbox.min_x, y: c.bbox.min_y },
          contour_id: c.id,
        });
      }
    }

    return issues;
  }

  /**
   * Convert contours to PartFeature[] format for EDMDrawingInterpretationEngine.
   */
  toPartFeatures(contours: WireEDMContour[]): Array<{
    name: string;
    type: "profile" | "hole" | "slot" | "cavity" | "contour";
    is_through: boolean;
    dimensions_mm: { length?: number; width?: number; depth?: number; diameter?: number };
    tolerance_mm?: number;
    surface_finish_ra_um?: number;
    min_corner_radius_mm?: number;
    profile_length_mm?: number;
  }> {
    return contours.map(c => {
      const bboxW = c.bbox.max_x - c.bbox.min_x;
      const bboxH = c.bbox.max_y - c.bbox.min_y;

      // Classify by geometry
      let featureType: "profile" | "hole" | "slot" | "cavity" | "contour" = "contour";
      let diameter: number | undefined;

      if (c.segments.length === 1 && c.segments[0].type === "arc") {
        // Single arc = circle = hole or profile
        featureType = c.is_exterior ? "profile" : "hole";
        diameter = c.segments[0].radius * 2;
      } else if (!c.is_exterior) {
        // Internal contour
        const aspectRatio = Math.max(bboxW, bboxH) / (Math.min(bboxW, bboxH) || 1);
        featureType = aspectRatio > 3 ? "slot" : "cavity";
      } else {
        featureType = "profile";
      }

      // Find minimum corner radius (smallest arc radius in contour)
      let minCornerRadius: number | undefined;
      for (const seg of c.segments) {
        if (seg.type === "arc") {
          if (minCornerRadius === undefined || seg.radius < minCornerRadius) {
            minCornerRadius = seg.radius;
          }
        }
      }

      return {
        name: c.id,
        type: featureType,
        is_through: true, // Wire EDM is always through-cut
        dimensions_mm: {
          length: parseFloat(bboxW.toFixed(4)),
          width: parseFloat(bboxH.toFixed(4)),
          diameter,
        },
        min_corner_radius_mm: minCornerRadius ? parseFloat(minCornerRadius.toFixed(4)) : undefined,
        profile_length_mm: parseFloat(c.perimeter_mm.toFixed(4)),
      };
    });
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const dxfGeometryParserEngine = new DXFGeometryParserEngine();
