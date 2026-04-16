/**
 * wedmGeometry.ts — Wire EDM 2D Geometry Utilities
 * WEDM-MS0 U-WEDM06
 *
 * Pure functions for 2D profile rendering: arc tessellation, contour paths,
 * bounding boxes, contour offsetting, and snap-to-grid.
 * All math in millimeters, angles in radians.
 */

import type { Point2D, ProfileContour, GeometrySegment, ArcSegment, TaperSegmentDisplay } from "../types/wedmStudio";

// ============================================================================
// ARC TESSELLATION
// ============================================================================

/**
 * Tessellate a circular arc into polyline points.
 * Uses chord-height tolerance to determine segment count:
 *   step = 2 * acos(1 - tolerance / radius)
 *
 * @param center     Arc center point
 * @param radius     Arc radius in mm
 * @param startAngle Start angle in radians
 * @param endAngle   End angle in radians
 * @param ccw        Counter-clockwise direction
 * @param tolerance  Max chord-height deviation in mm (default 0.01)
 * @returns Array of Point2D along the arc (includes start & end)
 */
export function tessellateArc(
  center: Point2D,
  radius: number,
  startAngle: number,
  endAngle: number,
  ccw: boolean,
  tolerance = 0.01,
): Point2D[] {
  if (radius <= 0) return [center];
  const clampedTol = Math.min(tolerance, radius);

  // Angular step from chord-height formula
  const step = 2 * Math.acos(1 - clampedTol / radius);

  // Calculate sweep angle respecting direction
  let sweep: number;
  if (ccw) {
    sweep = endAngle - startAngle;
    if (sweep < 0) sweep += 2 * Math.PI;
  } else {
    sweep = startAngle - endAngle;
    if (sweep < 0) sweep += 2 * Math.PI;
  }

  // Degenerate arc (start == end, zero sweep) → return start point only
  if (sweep < 1e-12) return [{ x: center.x + radius * Math.cos(startAngle), y: center.y + radius * Math.sin(startAngle) }];

  const segments = Math.max(2, Math.ceil(sweep / step));
  const deltaAngle = (ccw ? 1 : -1) * (sweep / segments);

  const points: Point2D[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = startAngle + i * deltaAngle;
    points.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    });
  }
  return points;
}

// ============================================================================
// CONTOUR → CANVAS PATH2D
// ============================================================================

/**
 * Convert a ProfileContour to a Canvas Path2D object.
 * Lines become lineTo, arcs become the native arc() call.
 */
export function contourToCanvasPath(contour: ProfileContour): Path2D {
  const path = new Path2D();
  const segs = contour.segments;
  if (segs.length === 0) return path;

  path.moveTo(segs[0].start.x, segs[0].start.y);

  for (const seg of segs) {
    if (seg.type === "line") {
      path.lineTo(seg.end.x, seg.end.y);
    } else {
      // Arc: use native arc() for subpixel accuracy
      path.arc(
        seg.center.x,
        seg.center.y,
        seg.radius,
        seg.start_angle_rad,
        seg.end_angle_rad,
        seg.ccw,
      );
    }
  }

  if (contour.is_closed) {
    path.closePath();
  }

  return path;
}

// ============================================================================
// FEATURE → COLOR MAPPING
// ============================================================================

const FEATURE_COLORS: Record<string, string> = {
  profile:        "#2196F3", // blue — outer profile
  hole:           "#FF9800", // orange — holes
  slot:           "#9C27B0", // purple — slots
  cavity:         "#4CAF50", // green — cavities
  contour:        "#00BCD4", // cyan — generic contour
  pocket:         "#F44336", // red — pockets
  // Canvas overlays
  toolpath:       "#FFEB3B", // yellow — cutting toolpath
  approach:       "#8BC34A", // light green — approach/departure
  start_hole:     "#FF5722", // deep orange — start hole markers
  tab:            "#E91E63", // pink — tab positions
  wcs:            "#FFFFFF", // white — WCS crosshair
  grid:           "#424242", // dark gray — background grid
  offset_rough:   "#FF5722", // deep orange — rough pass offset
  offset_semi:    "#FF9800", // orange — semi-finish offset
  offset_finish:  "#4CAF50", // green — finish pass offset
  offset_super:   "#2196F3", // blue — super-finish pass offset
  error:          "#F44336", // red — geometry errors
  warning:        "#FFC107", // amber — geometry warnings
  selection:      "#E040FB", // magenta — user selection highlight
  dimension:      "#B0BEC5", // blue-gray — dimension annotations
  // Taper visualization (WEDM-MS1)
  taper_top_guide:  "#2196F3", // blue — top guide XY path
  taper_bottom_guide: "#FF9800", // orange — bottom guide UV path
  taper_connection: "#78909C", // blue-gray — wire angle connection lines
  taper_transition: "#00E5FF", // cyan — land/taper transition markers
};

/**
 * Map a feature or overlay type to its display color.
 * Returns a default gray for unknown types.
 */
export function featureToColor(featureType: string): string {
  return FEATURE_COLORS[featureType] ?? "#9E9E9E";
}

// ============================================================================
// BOUNDING BOX
// ============================================================================

export interface BBox {
  min_x: number;
  min_y: number;
  max_x: number;
  max_y: number;
}

/**
 * Calculate the bounding box that encloses all provided contours.
 * Accounts for arc extents (not just endpoints).
 */
export function calculateBounds(contours: ProfileContour[]): BBox {
  if (contours.length === 0) {
    return { min_x: 0, min_y: 0, max_x: 0, max_y: 0 };
  }

  let min_x = Infinity;
  let min_y = Infinity;
  let max_x = -Infinity;
  let max_y = -Infinity;

  for (const contour of contours) {
    for (const seg of contour.segments) {
      // Endpoint bounds
      expandPoint(seg.start);
      expandPoint(seg.end);

      // Arc extrema: check axis-aligned angles within sweep
      if (seg.type === "arc") {
        expandArcExtrema(seg);
      }
    }
  }

  function expandPoint(p: Point2D): void {
    if (p.x < min_x) min_x = p.x;
    if (p.y < min_y) min_y = p.y;
    if (p.x > max_x) max_x = p.x;
    if (p.y > max_y) max_y = p.y;
  }

  function expandArcExtrema(arc: ArcSegment): void {
    const axisAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

    // Detect full-circle arcs where normalizeAngle collapses start≈end
    let sweep: number;
    if (arc.ccw) {
      sweep = arc.end_angle_rad - arc.start_angle_rad;
      if (sweep <= 0) sweep += 2 * Math.PI;
    } else {
      sweep = arc.start_angle_rad - arc.end_angle_rad;
      if (sweep <= 0) sweep += 2 * Math.PI;
    }
    const isFullCircle = sweep >= 2 * Math.PI - 1e-9;

    for (const a of axisAngles) {
      if (isFullCircle || angleInArc(a, arc.start_angle_rad, arc.end_angle_rad, arc.ccw)) {
        expandPoint({
          x: arc.center.x + arc.radius * Math.cos(a),
          y: arc.center.y + arc.radius * Math.sin(a),
        });
      }
    }
  }

  return { min_x, min_y, max_x, max_y };
}

/**
 * Check if a test angle falls within an arc sweep.
 * Normalizes all angles to [0, 2π).
 */
function normalizeAngle(a: number): number {
  a = a % (2 * Math.PI);
  return a < 0 ? a + 2 * Math.PI : a;
}

function angleInArc(
  test: number,
  start: number,
  end: number,
  ccw: boolean,
): boolean {
  const t = normalizeAngle(test);
  const s = normalizeAngle(start);
  const e = normalizeAngle(end);

  if (ccw) {
    // CCW: from s to e going counter-clockwise
    if (s <= e) {
      return t >= s && t <= e;
    }
    return t >= s || t <= e;
  } else {
    // CW: from s to e going clockwise
    if (s >= e) {
      return t <= s && t >= e;
    }
    return t <= s || t >= e;
  }
}

// ============================================================================
// CONTOUR OFFSET (for multi-pass onion-skin)
// ============================================================================

/**
 * Offset a closed polyline by a given distance.
 * Positive offset = outward (for external contours), negative = inward.
 *
 * Uses the perpendicular-offset + line-intersection method.
 * Handles convex corners (extend edges) and concave corners (arc insert).
 *
 * @param points   Ordered polyline points (closed: first !== last)
 * @param offset   Offset distance in mm (positive = outward for CCW contours)
 * @returns Offset polyline points
 */
export function offsetContour(points: Point2D[], offset: number): Point2D[] {
  const n = points.length;
  if (n < 3) return [...points];
  if (Math.abs(offset) < 1e-9) return [...points];

  // Build offset edge lines
  const offsetEdges: Array<{ p1: Point2D; p2: Point2D }> = [];
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-12) {
      // Degenerate edge — copy points
      offsetEdges.push({ p1: a, p2: b });
      continue;
    }
    // Right-hand normal (outward for CCW polygons with positive offset)
    const nx = dy / len * offset;
    const ny = -dx / len * offset;
    offsetEdges.push({
      p1: { x: a.x + nx, y: a.y + ny },
      p2: { x: b.x + nx, y: b.y + ny },
    });
  }

  // Intersect consecutive offset edges
  const result: Point2D[] = [];
  for (let i = 0; i < n; i++) {
    const e1 = offsetEdges[i];
    const e2 = offsetEdges[(i + 1) % n];
    const ix = lineLineIntersection(e1.p1, e1.p2, e2.p1, e2.p2);
    result.push(ix ?? e1.p2); // fallback to endpoint if parallel
  }

  return result;
}

/**
 * Line-line intersection of segments (p1→p2) and (p3→p4).
 * Returns null if lines are parallel.
 */
function lineLineIntersection(
  p1: Point2D, p2: Point2D,
  p3: Point2D, p4: Point2D,
): Point2D | null {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;
  const denom = d1x * d2y - d1y * d2x;

  if (Math.abs(denom) < 1e-12) return null;

  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
  return {
    x: p1.x + t * d1x,
    y: p1.y + t * d1y,
  };
}

// ============================================================================
// SNAP TO GRID
// ============================================================================

/**
 * Snap a point to the nearest grid intersection.
 * @param point    Input point
 * @param gridSize Grid spacing in mm
 */
export function snapToGrid(point: Point2D, gridSize: number): Point2D {
  if (gridSize <= 0) return { ...point };
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

// ============================================================================
// TESSELLATE CONTOUR (full contour → polyline)
// ============================================================================

/**
 * Convert a full contour (mix of lines + arcs) into a flat polyline.
 * Useful for hit testing, distance calculations, and canvas strokeStyle rendering.
 *
 * @param contour   The ProfileContour to tessellate
 * @param tolerance Arc tessellation tolerance in mm (default 0.01)
 * @returns Flat array of Point2D forming the tessellated polyline
 */
export function tessellateContour(
  contour: ProfileContour,
  tolerance = 0.01,
): Point2D[] {
  const points: Point2D[] = [];

  for (const seg of contour.segments) {
    if (seg.type === "line") {
      if (points.length === 0) points.push(seg.start);
      points.push(seg.end);
    } else {
      const arcPts = tessellateArc(
        seg.center, seg.radius,
        seg.start_angle_rad, seg.end_angle_rad,
        seg.ccw, tolerance,
      );
      // Skip first point if it overlaps last pushed point
      const startIdx = points.length > 0 && dist(points[points.length - 1], arcPts[0]) < tolerance ? 1 : 0;
      for (let i = startIdx; i < arcPts.length; i++) {
        points.push(arcPts[i]);
      }
    }
  }

  return points;
}

/** Euclidean distance between two 2D points. */
export function dist(a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ============================================================================
// POLYLINE LENGTH
// ============================================================================

/** Total length of a polyline defined by ordered points. */
export function polylineLength(points: Point2D[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += dist(points[i - 1], points[i]);
  }
  return total;
}

// ============================================================================
// TAPER UV OFFSET (WEDM-MS1 U-WEDM22)
// ============================================================================

/**
 * Calculate the UV offset for a taper angle at a given workpiece height.
 * Formula: U = tan(α) × H/2 (canonical from EDMWireSlugCornerTaperEngine)
 * The offset is applied perpendicular to the wire path direction.
 *
 * @param taperAngleDeg Taper angle in degrees
 * @param workpieceHeightMm Workpiece thickness in mm
 * @returns Scalar UV offset magnitude in mm
 */
export function calculateTaperUVOffset(
  taperAngleDeg: number,
  workpieceHeightMm: number,
): number {
  if (taperAngleDeg <= 0 || workpieceHeightMm <= 0) return 0;
  const angleRad = (taperAngleDeg * Math.PI) / 180;
  return Math.tan(angleRad) * (workpieceHeightMm / 2);
}

/**
 * Calculate the bottom guide path from the top guide path (XY)
 * by applying UV offsets perpendicular to each segment direction.
 * Top guide = XY plane (workpiece top). Bottom guide = UV plane (workpiece bottom).
 *
 * @param topPoints   Top guide path points (the original XY contour)
 * @param taperSegments  Per-segment taper data with UV offsets
 * @returns Bottom guide path points (offset by UV)
 */
export function calculateBottomGuidePath(
  topPoints: Point2D[],
  taperSegments: TaperSegmentDisplay[],
): Point2D[] {
  if (topPoints.length < 2 || taperSegments.length === 0) return topPoints;

  const result: Point2D[] = [];
  for (let i = 0; i < topPoints.length; i++) {
    // Find the taper segment that covers this point
    const seg = findTaperSegmentForPointIndex(i, topPoints.length, taperSegments);
    if (!seg || (seg.u_offset_mm === 0 && seg.v_offset_mm === 0)) {
      result.push(topPoints[i]);
      continue;
    }

    // Compute perpendicular offset direction at this point
    const prev = topPoints[Math.max(0, i - 1)];
    const next = topPoints[Math.min(topPoints.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len < 1e-10) {
      result.push(topPoints[i]);
      continue;
    }

    // Perpendicular normal (right-hand)
    const nx = -dy / len;
    const ny = dx / len;

    // UV magnitude
    const uvMag = Math.sqrt(seg.u_offset_mm ** 2 + seg.v_offset_mm ** 2);

    result.push({
      x: topPoints[i].x + nx * uvMag,
      y: topPoints[i].y + ny * uvMag,
    });
  }

  return result;
}

/**
 * Find the taper segment that applies to a given point index.
 * Simple proportional mapping based on point index within total points.
 */
function findTaperSegmentForPointIndex(
  pointIndex: number,
  totalPoints: number,
  segments: TaperSegmentDisplay[],
): TaperSegmentDisplay | null {
  if (segments.length === 0) return null;
  if (segments.length === 1) return segments[0];
  const fraction = pointIndex / Math.max(1, totalPoints - 1);
  const segIndex = Math.min(
    Math.floor(fraction * segments.length),
    segments.length - 1,
  );
  return segments[segIndex];
}

/**
 * Find transition points where taper angle changes between segments.
 * Returns the point indices and angle change at each transition.
 */
export function findTaperTransitions(
  taperSegments: TaperSegmentDisplay[],
): Array<{ point: Point2D; fromAngle: number; toAngle: number }> {
  const transitions: Array<{ point: Point2D; fromAngle: number; toAngle: number }> = [];
  for (let i = 1; i < taperSegments.length; i++) {
    const prev = taperSegments[i - 1];
    const curr = taperSegments[i];
    if (Math.abs(prev.taper_angle_deg - curr.taper_angle_deg) > 0.01) {
      transitions.push({
        point: curr.start_point,
        fromAngle: prev.taper_angle_deg,
        toAngle: curr.taper_angle_deg,
      });
    }
  }
  return transitions;
}

/**
 * Calculate taper accuracy prediction.
 * Formula: ε = (wire_dia/2) × H / guide_distance (canonical)
 */
export function predictTaperError(
  wireDiaMm: number,
  workpieceHeightMm: number,
  guideDistanceMm: number,
): number {
  if (guideDistanceMm <= 0) return Infinity;
  return (wireDiaMm / 2) * workpieceHeightMm / guideDistanceMm;
}
