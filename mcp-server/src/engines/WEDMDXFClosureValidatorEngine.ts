/**
 * WEDMDXFClosureValidatorEngine — DXF Contour Closure Validation
 * WEDM-P2P-PRODUCTION-MS0 U-PROD-07
 *
 * Validates that DXF profiles form closed contours for Wire EDM:
 * - Detects gaps between endpoints
 * - Identifies overlapping segments
 * - Reports near-misses requiring closure
 * - Suggests repair points
 *
 * Critical for Wire EDM: open contours cause wire threading failures
 * and unexpected cut paths.
 *
 * @module engines/WEDMDXFClosureValidatorEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DXFPoint {
  x: number;
  y: number;
}

export interface DXFSegment {
  id: string;
  type: "line" | "arc" | "circle" | "polyline" | "spline";
  start: DXFPoint;
  end: DXFPoint;
  center?: DXFPoint;
  radius?: number;
  bulge?: number;
}

export interface DXFContour {
  id: string;
  segments: DXFSegment[];
  is_closed: boolean;
  area_mm2?: number;
  perimeter_mm?: number;
}

export interface ClosureGap {
  segment1_id: string;
  segment2_id: string;
  point1: DXFPoint;
  point2: DXFPoint;
  gap_mm: number;
  suggested_fix: "extend" | "bridge" | "snap";
}

export interface ClosureOverlap {
  segment1_id: string;
  segment2_id: string;
  overlap_mm: number;
  location: DXFPoint;
}

export interface ClosureValidationResult {
  /** Whether all contours are closed within tolerance */
  valid: boolean;
  /** Total number of contours detected */
  contour_count: number;
  /** Number of closed contours */
  closed_count: number;
  /** Number of open contours */
  open_count: number;
  /** Detected gaps */
  gaps: ClosureGap[];
  /** Detected overlaps */
  overlaps: ClosureOverlap[];
  /** Near-misses (gaps < 10× tolerance but > tolerance) */
  near_misses: ClosureGap[];
  /** Contour details */
  contours: DXFContour[];
  /** Closure tolerance used */
  tolerance_mm: number;
  /** Warning messages */
  warnings: string[];
  /** Repair suggestions */
  repair_suggestions: string[];
}

export interface ClosureValidatorConfig {
  /** Closure tolerance in mm (default 0.001mm = 1μm) */
  closure_tolerance_mm: number;
  /** Near-miss threshold (multiples of tolerance) */
  near_miss_factor: number;
  /** Maximum gap to auto-repair */
  max_auto_repair_mm: number;
  /** Check for self-intersection */
  check_self_intersection: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: ClosureValidatorConfig = {
  closure_tolerance_mm: 0.001,
  near_miss_factor: 10,
  max_auto_repair_mm: 0.1,
  check_self_intersection: true,
};

// ============================================================================
// ENGINE
// ============================================================================

class WEDMDXFClosureValidatorEngine {
  private config: ClosureValidatorConfig;

  constructor(config: Partial<ClosureValidatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate distance between two points.
   */
  distance(p1: DXFPoint, p2: DXFPoint): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if two points are within tolerance.
   */
  pointsMatch(p1: DXFPoint, p2: DXFPoint, tolerance?: number): boolean {
    const tol = tolerance ?? this.config.closure_tolerance_mm;
    return this.distance(p1, p2) <= tol;
  }

  /**
   * Find the endpoint of a segment that connects to another segment.
   */
  findConnection(
    segment: DXFSegment,
    other: DXFSegment,
    tolerance?: number
  ): { from: "start" | "end"; to: "start" | "end" } | null {
    const tol = tolerance ?? this.config.closure_tolerance_mm;

    if (this.pointsMatch(segment.end, other.start, tol)) {
      return { from: "end", to: "start" };
    }
    if (this.pointsMatch(segment.end, other.end, tol)) {
      return { from: "end", to: "end" };
    }
    if (this.pointsMatch(segment.start, other.start, tol)) {
      return { from: "start", to: "start" };
    }
    if (this.pointsMatch(segment.start, other.end, tol)) {
      return { from: "start", to: "end" };
    }

    return null;
  }

  /**
   * Build contours from unordered segments.
   */
  buildContours(segments: DXFSegment[]): DXFContour[] {
    if (segments.length === 0) return [];

    const contours: DXFContour[] = [];
    const used = new Set<string>();
    let contourId = 0;

    for (const startSegment of segments) {
      if (used.has(startSegment.id)) continue;

      const contour: DXFContour = {
        id: `contour-${contourId++}`,
        segments: [startSegment],
        is_closed: false,
      };
      used.add(startSegment.id);

      let currentEnd = startSegment.end;
      let changed = true;

      // Build chain forward
      while (changed) {
        changed = false;
        for (const seg of segments) {
          if (used.has(seg.id)) continue;

          if (this.pointsMatch(currentEnd, seg.start)) {
            contour.segments.push(seg);
            used.add(seg.id);
            currentEnd = seg.end;
            changed = true;
            break;
          }
          if (this.pointsMatch(currentEnd, seg.end)) {
            // Reverse segment
            contour.segments.push({
              ...seg,
              start: seg.end,
              end: seg.start,
            });
            used.add(seg.id);
            currentEnd = seg.start;
            changed = true;
            break;
          }
        }
      }

      // Check if closed
      if (contour.segments.length > 1) {
        const first = contour.segments[0];
        const last = contour.segments[contour.segments.length - 1];
        contour.is_closed = this.pointsMatch(last.end, first.start);
      }

      // Calculate perimeter
      contour.perimeter_mm = contour.segments.reduce((sum, seg) => {
        return sum + this.distance(seg.start, seg.end);
      }, 0);

      contours.push(contour);
    }

    return contours;
  }

  /**
   * Detect gaps in contours.
   */
  detectGaps(contours: DXFContour[]): ClosureGap[] {
    const gaps: ClosureGap[] = [];

    for (const contour of contours) {
      if (contour.is_closed) continue;

      const segments = contour.segments;
      if (segments.length === 0) continue;

      // Check first-to-last gap
      const first = segments[0];
      const last = segments[segments.length - 1];
      const gapDist = this.distance(last.end, first.start);

      if (gapDist > this.config.closure_tolerance_mm) {
        gaps.push({
          segment1_id: last.id,
          segment2_id: first.id,
          point1: last.end,
          point2: first.start,
          gap_mm: Math.round(gapDist * 10000) / 10000,
          suggested_fix: gapDist <= this.config.max_auto_repair_mm ? "snap" : "bridge",
        });
      }

      // Check intermediate gaps
      for (let i = 0; i < segments.length - 1; i++) {
        const current = segments[i];
        const next = segments[i + 1];
        const dist = this.distance(current.end, next.start);

        if (dist > this.config.closure_tolerance_mm) {
          gaps.push({
            segment1_id: current.id,
            segment2_id: next.id,
            point1: current.end,
            point2: next.start,
            gap_mm: Math.round(dist * 10000) / 10000,
            suggested_fix: dist <= this.config.max_auto_repair_mm ? "snap" : "bridge",
          });
        }
      }
    }

    return gaps;
  }

  /**
   * Detect near-misses (gaps larger than tolerance but small enough to be suspicious).
   */
  detectNearMisses(gaps: ClosureGap[]): ClosureGap[] {
    const threshold = this.config.closure_tolerance_mm * this.config.near_miss_factor;
    return gaps.filter(
      gap =>
        gap.gap_mm > this.config.closure_tolerance_mm &&
        gap.gap_mm <= threshold
    );
  }

  /**
   * Detect overlapping segments.
   */
  detectOverlaps(segments: DXFSegment[]): ClosureOverlap[] {
    const overlaps: ClosureOverlap[] = [];

    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        const seg1 = segments[i];
        const seg2 = segments[j];

        // Check if endpoints are very close (potential overlap)
        const d1 = this.distance(seg1.start, seg2.start);
        const d2 = this.distance(seg1.end, seg2.end);

        if (d1 < this.config.closure_tolerance_mm && d2 < this.config.closure_tolerance_mm) {
          // Possible duplicate segment
          overlaps.push({
            segment1_id: seg1.id,
            segment2_id: seg2.id,
            overlap_mm: this.distance(seg1.start, seg1.end),
            location: seg1.start,
          });
        }
      }
    }

    return overlaps;
  }

  /**
   * Generate repair suggestions for detected issues.
   */
  generateRepairSuggestions(
    gaps: ClosureGap[],
    overlaps: ClosureOverlap[]
  ): string[] {
    const suggestions: string[] = [];

    // Gap repairs
    const snappable = gaps.filter(g => g.suggested_fix === "snap");
    if (snappable.length > 0) {
      suggestions.push(
        `${snappable.length} gap(s) can be auto-repaired by snapping endpoints (< ${this.config.max_auto_repair_mm}mm)`
      );
    }

    const bridgeable = gaps.filter(g => g.suggested_fix === "bridge");
    if (bridgeable.length > 0) {
      suggestions.push(
        `${bridgeable.length} gap(s) require bridging lines to close contours`
      );
    }

    // Overlap repairs
    if (overlaps.length > 0) {
      suggestions.push(
        `${overlaps.length} overlapping segment(s) detected - remove duplicates`
      );
    }

    return suggestions;
  }

  /**
   * Validate DXF segments for closure.
   */
  validate(segments: DXFSegment[]): ClosureValidationResult {
    const warnings: string[] = [];

    // Input validation
    if (segments.length === 0) {
      return {
        valid: false,
        contour_count: 0,
        closed_count: 0,
        open_count: 0,
        gaps: [],
        overlaps: [],
        near_misses: [],
        contours: [],
        tolerance_mm: this.config.closure_tolerance_mm,
        warnings: ["No segments provided"],
        repair_suggestions: [],
      };
    }

    // Build contours
    const contours = this.buildContours(segments);

    // Detect issues
    const gaps = this.detectGaps(contours);
    const nearMisses = this.detectNearMisses(gaps);
    const overlaps = this.detectOverlaps(segments);

    // Count closed/open
    const closedCount = contours.filter(c => c.is_closed).length;
    const openCount = contours.length - closedCount;

    // Generate warnings
    if (openCount > 0) {
      warnings.push(`${openCount} open contour(s) detected - Wire EDM requires closed profiles`);
    }
    if (nearMisses.length > 0) {
      warnings.push(`${nearMisses.length} near-miss(es) detected - verify intentional gaps`);
    }
    if (overlaps.length > 0) {
      warnings.push(`${overlaps.length} overlapping segment(s) - may cause toolpath issues`);
    }

    // Generate repair suggestions
    const repairSuggestions = this.generateRepairSuggestions(gaps, overlaps);

    // Determine validity
    const valid = openCount === 0 && overlaps.length === 0;

    return {
      valid,
      contour_count: contours.length,
      closed_count: closedCount,
      open_count: openCount,
      gaps,
      overlaps,
      near_misses: nearMisses,
      contours,
      tolerance_mm: this.config.closure_tolerance_mm,
      warnings,
      repair_suggestions: repairSuggestions,
    };
  }

  /**
   * Auto-repair gaps that are within repair tolerance.
   */
  autoRepair(segments: DXFSegment[]): {
    repaired_segments: DXFSegment[];
    repairs_made: number;
  } {
    const repairedSegments = [...segments];
    let repairsMade = 0;

    // Build contours and find gaps
    const contours = this.buildContours(repairedSegments);

    for (const contour of contours) {
      if (contour.is_closed) continue;

      const segs = contour.segments;
      if (segs.length < 2) continue;

      // Try to close the contour
      const first = segs[0];
      const last = segs[segs.length - 1];
      const gap = this.distance(last.end, first.start);

      if (gap <= this.config.max_auto_repair_mm && gap > this.config.closure_tolerance_mm) {
        // Add bridging segment
        const bridgeId = `bridge-${repairsMade}`;
        repairedSegments.push({
          id: bridgeId,
          type: "line",
          start: last.end,
          end: first.start,
        });
        repairsMade++;
      }
    }

    return {
      repaired_segments: repairedSegments,
      repairs_made: repairsMade,
    };
  }

  /**
   * Update configuration.
   */
  configure(config: Partial<ClosureValidatorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration.
   */
  getConfig(): ClosureValidatorConfig {
    return { ...this.config };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const wedmDXFClosureValidatorEngine = new WEDMDXFClosureValidatorEngine();
export { WEDMDXFClosureValidatorEngine };
