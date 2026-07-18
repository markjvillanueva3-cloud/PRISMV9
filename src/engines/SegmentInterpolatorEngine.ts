/**
 * PRISM MCP Server - Segment Interpolator Engine
 *
 * Converts novel toolpath algorithm segment arrays (from NovelToolpathEngine,
 * NovelToolpathAlgorithmsExt, CrossCamNovelAlgorithms) into CNC motion blocks
 * (G-code instructions). Handles linear interpolation (G01), circular arc
 * fitting (G02/G03 via 3-point circle), PTDC deflection compensation offsets,
 * tool change preamble, coolant control, and time estimation.
 *
 * Arc fitting: For 3+ consecutive coplanar points forming a curve, fits a
 * circular arc and emits G02/G03 if deviation < arc_tolerance_mm. Falls back
 * to G01 for each point otherwise.
 *
 * No external imports — pure computation.
 *
 * @module SegmentInterpolatorEngine
 */

// ============================================================================
// TYPES
// ============================================================================

interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

/** A single toolpath segment point (matches NovelToolpathEngine.SegmentPoint). */
export interface SegmentPoint {
  x: number;
  y: number;
  z: number;
  feed_mmmin: number;
  rpm: number;
  ae_mm?: number;
  ap_mm?: number;
}

/** Tool definition for the interpolation run. */
export interface InterpolatorTool {
  number: number;
  diameter_mm: number;
  length_mm: number;
  type: string;
}

/** Optional PTDC deflection compensation offset per segment. */
export interface CompensationOffset {
  dx: number;
  dy: number;
  dz: number;
}

/** Input configuration for the segment interpolator. */
export interface SegmentInterpolatorInput {
  segments: SegmentPoint[];
  tool: InterpolatorTool;
  work_offset?: string;
  coolant?: 'flood' | 'mist' | 'off';
  safe_z_mm?: number;
  arc_tolerance_mm?: number;
  compensation_offsets?: CompensationOffset[];
}

/** A single G-code block in the output program. */
export interface GCodeBlock {
  line_number: number;
  code: string;
  x?: number;
  y?: number;
  z?: number;
  f?: number;
  s?: number;
  comment?: string;
}

/** Motion type summary counters and distance/time estimates. */
export interface MotionSummary {
  total_lines: number;
  g01_count: number;
  g02_count: number;
  g03_count: number;
  rapid_count: number;
  total_distance_mm: number;
  estimated_time_sec: number;
}

/** Full output from segment interpolation. */
export interface SegmentInterpolatorResult {
  blocks: GCodeBlock[];
  motion_summary: MotionSummary;
  warnings: string[];
}

/** Arc fitting result from 3-point circle computation. */
interface ArcFitResult {
  cx: number;
  cy: number;
  radius: number;
  cw: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * 3D Euclidean distance between two points.
 */
function distance3d(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * 2D Euclidean distance (XY plane).
 */
function distance2d(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if an array of points are coplanar in Z within tolerance.
 * For arc fitting we require all arc candidate points to share the same Z.
 */
function isCoplanar(points: SegmentPoint[], tol: number): boolean {
  if (points.length < 2) return true;
  const z0 = points[0].z;
  for (let i = 1; i < points.length; i++) {
    if (Math.abs(points[i].z - z0) > tol) return false;
  }
  return true;
}

/**
 * Fit a circular arc through three 2D points (XY plane).
 * Returns center, radius, and direction (CW/CCW), or null if points are
 * nearly collinear (determinant < epsilon).
 *
 * Uses the circumcircle formula:
 *   | x²+y²  x  y  1 |
 *   | ...               | = 0
 *
 * Direction is determined by the cross product of (p1→p2) × (p1→p3).
 */
function fitArc(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
): ArcFitResult | null {
  const ax = p1.x, ay = p1.y;
  const bx = p2.x, by = p2.y;
  const cx = p3.x, cy = p3.y;

  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-10) return null; // collinear

  const ux = ((ax * ax + ay * ay) * (by - cy) +
              (bx * bx + by * by) * (cy - ay) +
              (cx * cx + cy * cy) * (ay - by)) / d;
  const uy = ((ax * ax + ay * ay) * (cx - bx) +
              (bx * bx + by * by) * (ax - cx) +
              (cx * cx + cy * cy) * (bx - ax)) / d;

  const radius = distance2d(ux, uy, ax, ay);

  // Cross product (p1→p2) × (p1→p3) z-component determines winding
  const cross = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  // Positive cross = CCW traversal, so CW arc (G02) when cross > 0
  const cw = cross > 0;

  return { cx: ux, cy: uy, radius, cw };
}

/**
 * Maximum deviation of a point from an arc defined by center and radius.
 */
function arcDeviation(
  point: { x: number; y: number },
  center: { cx: number; cy: number },
  radius: number,
): number {
  const dist = distance2d(point.x, point.y, center.cx, center.cy);
  return Math.abs(dist - radius);
}

/**
 * Format a number to fixed decimal places, trimming trailing zeros.
 */
function fmt(n: number, decimals: number = 4): string {
  return parseFloat(n.toFixed(decimals)).toString();
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * SegmentInterpolatorEngine — converts toolpath segment arrays into G-code
 * motion blocks with arc fitting, PTDC compensation, and time estimation.
 *
 * Usage:
 * ```ts
 * const result = segmentInterpolatorEngine.interpolate({
 *   segments: novelResult.segments,
 *   tool: { number: 1, diameter_mm: 10, length_mm: 75, type: 'flat' },
 *   coolant: 'flood',
 * });
 * ```
 */
class SegmentInterpolatorEngine {
  private readonly RAPID_FEED = 10000; // mm/min assumed rapid traverse rate

  /**
   * Convert a segment array into CNC G-code blocks.
   *
   * @param input - Segment interpolation input with segments, tool, and options
   * @returns Interpolated G-code blocks, motion summary, and warnings
   */
  interpolate(input: SegmentInterpolatorInput): AtomicValue<SegmentInterpolatorResult> {
    const {
      segments,
      tool,
      work_offset = 'G54',
      coolant = 'flood',
      safe_z_mm = 50,
      arc_tolerance_mm = 0.01,
      compensation_offsets,
    } = input;

    const blocks: GCodeBlock[] = [];
    const warnings: string[] = [];
    let lineNum = 10;
    let g01Count = 0;
    let g02Count = 0;
    let g03Count = 0;
    let rapidCount = 0;
    let totalDistance = 0;
    let totalTime = 0; // seconds

    // Validate input
    if (!segments || segments.length === 0) {
      warnings.push('No segments provided — empty program generated');
      return this.wrapResult({ blocks, motion_summary: this.buildSummary(0, g01Count, g02Count, g03Count, rapidCount, totalDistance, totalTime), warnings });
    }

    if (compensation_offsets && compensation_offsets.length > 0 && compensation_offsets.length !== segments.length) {
      warnings.push(`Compensation offsets count (${compensation_offsets.length}) does not match segment count (${segments.length}) — offsets will be applied cyclically`);
    }

    // Apply PTDC compensation offsets to segments
    const compensated: SegmentPoint[] = segments.map((seg, i) => {
      if (!compensation_offsets || compensation_offsets.length === 0) return seg;
      const offset = compensation_offsets[i % compensation_offsets.length];
      return {
        ...seg,
        x: seg.x + offset.dx,
        y: seg.y + offset.dy,
        z: seg.z + offset.dz,
      };
    });

    // ---- Preamble ----
    const addBlock = (code: string, opts?: Partial<GCodeBlock>): void => {
      blocks.push({ line_number: lineNum, code, ...opts });
      lineNum += 10;
    };

    addBlock('%', { comment: 'Program start' });
    addBlock('G90 G21 G17 G40 G49 G80', { comment: 'Safety line — abs, metric, XY plane, cancel comp' });
    addBlock(work_offset, { comment: 'Work offset' });

    // Tool change
    addBlock(`T${tool.number} M06`, { comment: `Tool change — ${tool.type} D${fmt(tool.diameter_mm, 1)}mm` });
    addBlock(`G43 H${tool.number}`, { comment: 'Tool length compensation' });

    // Spindle start (use first segment's RPM)
    const startRpm = compensated[0].rpm;
    addBlock(`S${Math.round(startRpm)} M03`, { s: startRpm, comment: 'Spindle CW' });

    // Coolant
    if (coolant === 'flood') {
      addBlock('M08', { comment: 'Coolant flood ON' });
    } else if (coolant === 'mist') {
      addBlock('M07', { comment: 'Coolant mist ON' });
    }

    // ---- Approach: rapid to XY above first point, then plunge ----
    const firstPt = compensated[0];
    addBlock('G00', {
      x: firstPt.x, y: firstPt.y, z: safe_z_mm,
      comment: 'Rapid to start position',
    });
    rapidCount++;

    // Linear plunge to first Z
    const plungeDist = Math.abs(safe_z_mm - firstPt.z);
    const plungeFeed = Math.min(firstPt.feed_mmmin * 0.5, 500); // conservative plunge
    addBlock('G01', {
      z: firstPt.z, f: plungeFeed,
      comment: 'Plunge to cutting depth',
    });
    g01Count++;
    totalDistance += plungeDist;
    totalTime += (plungeDist / plungeFeed) * 60;

    // ---- Main motion blocks ----
    let cursor = { x: firstPt.x, y: firstPt.y, z: firstPt.z };
    let currentFeed = plungeFeed;
    let currentRpm = startRpm;
    let i = 1;

    while (i < compensated.length) {
      // Try arc fitting: look for 3+ coplanar points forming a curve
      if (i + 1 < compensated.length) {
        const arcResult = this.tryArcFit(compensated, i - 1, arc_tolerance_mm);
        if (arcResult) {
          const { endIndex, arc, endPt } = arcResult;
          const arcCode = arc.cw ? 'G02' : 'G03';
          const ijI = arc.cx - cursor.x;
          const ijJ = arc.cy - cursor.y;
          const feed = compensated[endIndex].feed_mmmin;

          // Approximate arc length: chord count × avg chord length
          let arcDist = 0;
          for (let k = i; k <= endIndex; k++) {
            arcDist += distance3d(
              k === i ? cursor : compensated[k - 1],
              compensated[k],
            );
          }

          const blockCode = `${arcCode} X${fmt(endPt.x)} Y${fmt(endPt.y)} I${fmt(ijI)} J${fmt(ijJ)}`;
          addBlock(blockCode, {
            x: endPt.x, y: endPt.y, z: endPt.z, f: feed,
            comment: `Arc — R${fmt(arc.radius, 3)}`,
          });

          if (feed !== currentFeed) currentFeed = feed;
          if (arc.cw) g02Count++; else g03Count++;
          totalDistance += arcDist;
          totalTime += (arcDist / feed) * 60;

          cursor = { x: endPt.x, y: endPt.y, z: endPt.z };
          i = endIndex + 1;
          continue;
        }
      }

      // Linear move (G01)
      const seg = compensated[i];
      const dist = distance3d(cursor, seg);
      const feed = seg.feed_mmmin;

      // Check for RPM change
      if (seg.rpm !== currentRpm) {
        addBlock(`S${Math.round(seg.rpm)} M03`, { s: seg.rpm, comment: 'RPM change' });
        currentRpm = seg.rpm;
      }

      // Build G01 block
      const parts: string[] = ['G01'];
      const opts: Partial<GCodeBlock> = {};
      if (seg.x !== cursor.x) { parts.push(`X${fmt(seg.x)}`); opts.x = seg.x; }
      if (seg.y !== cursor.y) { parts.push(`Y${fmt(seg.y)}`); opts.y = seg.y; }
      if (seg.z !== cursor.z) { parts.push(`Z${fmt(seg.z)}`); opts.z = seg.z; }
      if (feed !== currentFeed) { parts.push(`F${Math.round(feed)}`); opts.f = feed; currentFeed = feed; }

      addBlock(parts.join(' '), opts);
      g01Count++;
      totalDistance += dist;
      if (feed > 0) totalTime += (dist / feed) * 60;

      cursor = { x: seg.x, y: seg.y, z: seg.z };
      i++;
    }

    // ---- Retract ----
    addBlock('G00', {
      z: safe_z_mm,
      comment: 'Retract to safe Z',
    });
    rapidCount++;
    const retractDist = Math.abs(cursor.z - safe_z_mm);
    totalDistance += retractDist;
    totalTime += (retractDist / this.RAPID_FEED) * 60;

    // ---- Footer ----
    addBlock('M09', { comment: 'Coolant OFF' });
    addBlock('M05', { comment: 'Spindle stop' });
    addBlock('G91 G28 Z0', { comment: 'Return to machine home Z' });
    addBlock('G28 X0 Y0', { comment: 'Return to machine home XY' });
    addBlock('M30', { comment: 'Program end' });
    addBlock('%', { comment: 'EOF' });

    // ---- Warnings ----
    if (totalTime > 3600) {
      warnings.push(`Estimated cycle time is ${fmt(totalTime / 60, 1)} min — consider optimizing feed rates`);
    }
    if (segments.some(s => s.feed_mmmin <= 0)) {
      warnings.push('One or more segments have zero or negative feed rate');
    }
    if (segments.some(s => s.rpm <= 0)) {
      warnings.push('One or more segments have zero or negative RPM');
    }

    const summary = this.buildSummary(blocks.length, g01Count, g02Count, g03Count, rapidCount, totalDistance, totalTime);
    return this.wrapResult({ blocks, motion_summary: summary, warnings });
  }

  /**
   * Attempt to fit an arc through consecutive coplanar points starting at
   * prevIndex (using prevIndex as p1). Returns the arc fit result with the
   * end index if successful, or null if no valid arc could be formed.
   */
  private tryArcFit(
    segments: SegmentPoint[],
    prevIndex: number,
    tolerance: number,
  ): { endIndex: number; arc: ArcFitResult; endPt: SegmentPoint } | null {
    const p1 = segments[prevIndex];
    const p2 = segments[prevIndex + 1];
    const p3Idx = prevIndex + 2;
    if (p3Idx >= segments.length) return null;
    const p3 = segments[p3Idx];

    // Must be coplanar in Z
    if (!isCoplanar([p1, p2, p3], tolerance)) return null;

    // Fit arc through three points
    const arc = fitArc(p1, p2, p3);
    if (!arc) return null;

    // Check that the midpoint (p2) deviation is within tolerance
    const dev = arcDeviation(p2, arc, arc.radius);
    if (dev > tolerance) return null;

    // Reject arcs with very large radius (nearly straight) — use G01 instead
    if (arc.radius > 10000) return null;

    // Try to extend the arc through more consecutive points
    let endIndex = p3Idx;
    for (let k = p3Idx + 1; k < segments.length; k++) {
      const pk = segments[k];
      if (Math.abs(pk.z - p1.z) > tolerance) break; // left the plane
      const d = arcDeviation(pk, arc, arc.radius);
      if (d > tolerance) break;
      endIndex = k;
    }

    return {
      endIndex,
      arc,
      endPt: segments[endIndex],
    };
  }

  /**
   * Build motion summary object.
   */
  private buildSummary(
    totalLines: number,
    g01: number,
    g02: number,
    g03: number,
    rapid: number,
    dist: number,
    time: number,
  ): MotionSummary {
    return {
      total_lines: totalLines,
      g01_count: g01,
      g02_count: g02,
      g03_count: g03,
      rapid_count: rapid,
      total_distance_mm: parseFloat(dist.toFixed(3)),
      estimated_time_sec: parseFloat(time.toFixed(2)),
    };
  }

  /**
   * Wrap result in AtomicValue envelope.
   */
  private wrapResult(result: SegmentInterpolatorResult): AtomicValue<SegmentInterpolatorResult> {
    return {
      value: result,
      unit: 'gcode_program',
      formula: 'segment_array → G01/G02/G03 + arc_fit(3pt_circle) + PTDC_offset',
      confidence: 0.95,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const segmentInterpolatorEngine = new SegmentInterpolatorEngine();
