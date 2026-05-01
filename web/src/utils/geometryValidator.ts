/**
 * geometryValidator — Wire EDM Geometry Validation
 * WEDM-MS0 U-WEDM00
 *
 * Client-side geometry validation for Wire EDM contours.
 * Checks Wire EDM constraints and produces issues for canvas error overlay.
 *
 * Constraints checked:
 *   - Closed contour (Wire EDM requires closed profiles)
 *   - Min segment length > wire_diameter
 *   - Min slot width > wire_diameter + 2×spark_gap + 0.05mm
 *   - Self-intersection detection (line-line approximation)
 *   - Min corner radius (inner corners must be ≥ wire_radius + spark_gap)
 *
 * @module utils/geometryValidator
 */

// ============================================================================
// TYPES (mirror DXFGeometryParserEngine output types)
// ============================================================================

export interface Point2D {
  x: number;
  y: number;
}

export interface GeometrySegment {
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

export interface WireEDMContour {
  id: string;
  segments: GeometrySegment[];
  is_closed: boolean;
  is_exterior: boolean;
  area_mm2: number;
  perimeter_mm: number;
  bbox: { min_x: number; min_y: number; max_x: number; max_y: number };
}

export interface GeometryIssue {
  type:
    | "open_contour"
    | "self_intersection"
    | "narrow_slot"
    | "short_segment"
    | "small_corner_radius"
    | "thin_wall";
  severity: "error" | "warning" | "info";
  message: string;
  location?: Point2D;
  contour_id?: string;
}

/** Wire EDM process parameters for validation */
export interface WireEDMParams {
  wire_diameter_mm: number;
  spark_gap_mm: number;
  min_corner_radius_mm?: number;
  min_wall_thickness_mm?: number;
}

// ============================================================================
// DEFAULT PARAMETERS
// ============================================================================

/** Standard brass wire 0.25mm with typical spark gap */
const DEFAULT_PARAMS: WireEDMParams = {
  wire_diameter_mm: 0.25,
  spark_gap_mm: 0.013,
  min_corner_radius_mm: undefined, // Derived from wire + gap
  min_wall_thickness_mm: undefined, // Derived from wire + gap
};

// ============================================================================
// VALIDATION
// ============================================================================

function dist(a: Point2D, b: Point2D): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function segmentLength(seg: GeometrySegment): number {
  if (seg.type === "line") return dist(seg.start, seg.end);
  // Arc length approximation
  if (!seg.radius || seg.start_angle_rad === undefined || seg.end_angle_rad === undefined) {
    return dist(seg.start, seg.end);
  }
  let sweep = (seg.ccw ? 1 : -1) * (seg.end_angle_rad - seg.start_angle_rad);
  if (sweep <= 0) sweep += 2 * Math.PI;
  return seg.radius * sweep;
}

/**
 * Validate Wire EDM contours against process constraints.
 *
 * @param contours - Parsed geometry contours
 * @param params - Wire EDM process parameters (defaults to 0.25mm brass)
 * @returns Array of geometry issues with severity and location
 */
export function validateGeometry(
  contours: WireEDMContour[],
  params: Partial<WireEDMParams> = {},
): GeometryIssue[] {
  const p = { ...DEFAULT_PARAMS, ...params };
  const issues: GeometryIssue[] = [];

  // Derived limits
  const wireRadius = p.wire_diameter_mm / 2;
  const kerf = p.wire_diameter_mm + 2 * p.spark_gap_mm; // Total material removal width
  const minSlotWidth = kerf + 0.05; // Min slot = kerf + clearance
  const minCornerRadius = p.min_corner_radius_mm ?? (wireRadius + p.spark_gap_mm);
  const minWall = p.min_wall_thickness_mm ?? (kerf + 0.1);

  for (const c of contours) {
    // 1. Closed contour check
    if (!c.is_closed) {
      issues.push({
        type: "open_contour",
        severity: "error",
        message: `${c.id}: Open contour — Wire EDM requires closed profiles for cutting`,
        contour_id: c.id,
        location: c.segments.length > 0 ? c.segments[c.segments.length - 1].end : undefined,
      });
    }

    // 2. Min segment length check
    for (const seg of c.segments) {
      const len = segmentLength(seg);
      if (len < p.wire_diameter_mm && len > 0.0001) {
        issues.push({
          type: "short_segment",
          severity: "warning",
          message: `${c.id}: Segment ${len.toFixed(4)}mm < wire diameter ${p.wire_diameter_mm}mm`,
          contour_id: c.id,
          location: seg.start,
        });
      }
    }

    // 3. Corner radius check (arcs in internal contours)
    if (!c.is_exterior) {
      for (const seg of c.segments) {
        if (seg.type === "arc" && seg.radius !== undefined && seg.radius < minCornerRadius) {
          issues.push({
            type: "small_corner_radius",
            severity: "warning",
            message: `${c.id}: Corner radius ${seg.radius.toFixed(3)}mm < minimum ${minCornerRadius.toFixed(3)}mm (wire_r + gap)`,
            contour_id: c.id,
            location: seg.center ?? seg.start,
          });
        }
      }
    }

    // 4. Narrow slot check (internal contours)
    if (!c.is_exterior) {
      const bboxW = c.bbox.max_x - c.bbox.min_x;
      const bboxH = c.bbox.max_y - c.bbox.min_y;
      const minDim = Math.min(bboxW, bboxH);
      if (minDim > 0 && minDim < minSlotWidth) {
        issues.push({
          type: "narrow_slot",
          severity: "warning",
          message: `${c.id}: Slot width ${minDim.toFixed(3)}mm < minimum ${minSlotWidth.toFixed(3)}mm (wire + 2×gap + 0.05)`,
          contour_id: c.id,
          location: { x: c.bbox.min_x, y: c.bbox.min_y },
        });
      }
    }

    // 5. Self-intersection check (line-line approximation)
    const segs = c.segments;
    for (let i = 0; i < segs.length; i++) {
      for (let j = i + 2; j < segs.length; j++) {
        if (i === 0 && j === segs.length - 1) continue; // Adjacent
        if (lineIntersects(segs[i].start, segs[i].end, segs[j].start, segs[j].end)) {
          issues.push({
            type: "self_intersection",
            severity: "error",
            message: `${c.id}: Self-intersection between segments ${i} and ${j}`,
            contour_id: c.id,
            location: segs[i].start,
          });
          break; // One per contour
        }
      }
    }
  }

  // 6. Thin wall check (between close contours)
  for (let i = 0; i < contours.length; i++) {
    for (let j = i + 1; j < contours.length; j++) {
      const gap = minContourGap(contours[i], contours[j]);
      if (gap > 0 && gap < minWall) {
        issues.push({
          type: "thin_wall",
          severity: "warning",
          message: `Wall between ${contours[i].id} and ${contours[j].id}: ${gap.toFixed(3)}mm < minimum ${minWall.toFixed(3)}mm`,
        });
      }
    }
  }

  return issues;
}

/** Line-line intersection test */
function lineIntersects(a0: Point2D, a1: Point2D, b0: Point2D, b1: Point2D): boolean {
  const d1x = a1.x - a0.x, d1y = a1.y - a0.y;
  const d2x = b1.x - b0.x, d2y = b1.y - b0.y;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-10) return false;
  const dx = b0.x - a0.x;
  const dy = b0.y - a0.y;
  const t = (dx * d2y - dy * d2x) / cross;
  const u = (dx * d1y - dy * d1x) / cross;
  return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99;
}

/** Approximate minimum gap between two contours using bbox distance */
function minContourGap(a: WireEDMContour, b: WireEDMContour): number {
  // Quick bbox gap estimate
  const gapX = Math.max(0,
    Math.max(a.bbox.min_x - b.bbox.max_x, b.bbox.min_x - a.bbox.max_x));
  const gapY = Math.max(0,
    Math.max(a.bbox.min_y - b.bbox.max_y, b.bbox.min_y - a.bbox.max_y));

  if (gapX > 0 || gapY > 0) {
    return Math.sqrt(gapX * gapX + gapY * gapY);
  }

  // Overlapping bboxes — could be nested or adjacent, return 0 for simplicity
  return 0;
}

/**
 * Get issue counts by severity for display in UI.
 */
export function issueSummary(issues: GeometryIssue[]): {
  errors: number;
  warnings: number;
  infos: number;
  canProceed: boolean;
} {
  let errors = 0, warnings = 0, infos = 0;
  for (const i of issues) {
    if (i.severity === "error") errors++;
    else if (i.severity === "warning") warnings++;
    else infos++;
  }
  return { errors, warnings, infos, canProceed: errors === 0 };
}
