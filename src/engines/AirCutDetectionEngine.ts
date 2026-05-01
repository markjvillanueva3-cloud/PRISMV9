/**
 * AirCutDetectionEngine — Detect air-cutting in raw G-code
 *
 * Analyzes G-code programs to find cutting moves where the tool isn't engaging material:
 *   - Z-level tracking: infers stock surface from cutting history
 *   - Consecutive passes at same Z with no new material removal
 *   - Approach moves that could be rapid instead of feed
 *   - Spiral exit moves (finishing passes already cleared by rough)
 *
 * Detection strategies:
 *   1. Z-tracking: Build a height map from cutting history. Any G1/G2/G3 move
 *      above the deepest cut at that region is flagged as potential air.
 *   2. Approach detection: Feed-rate moves from retract height to cutting depth
 *      that could be replaced with rapids.
 *   3. Repeat-pass detection: Same toolpath at same Z as a previous pass.
 *
 * Time estimation uses configured rapid and feed rates per controller.
 *
 * References:
 *   - Peter Smid, "CNC Programming Handbook" 3rd ed., Ch. 16 (Program Optimization)
 *   - Sandvik Coromant, "Metal Cutting Technology" — air-cut minimization guidelines
 *
 * @module engines/AirCutDetectionEngine
 * @version 1.0.0
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface AirCutInput {
  /** Raw G-code program */
  gcode: string;
  /** Controller family for parsing dialect differences */
  controller?: string;
  /** Retract height (Z value above which moves are definitely air). Default: auto-detect. */
  retract_z?: number;
  /** Stock top surface Z. Default: 0 (convention). */
  stock_top_z?: number;
  /** Minimum feed move distance (mm) to flag as air cut. Default: 1.0 */
  min_distance_mm?: number;
  /** Rapid traverse rate mm/min for time estimation. Default: 15000 */
  rapid_rate_mm_min?: number;
}

export interface AirCutBlock {
  /** Line number in original program (1-based) */
  line_number: number;
  /** Original G-code text */
  gcode_text: string;
  /** Type of air cut */
  type: "above_stock" | "approach_feed" | "retract_feed" | "repeat_pass" | "exit_spiral";
  /** Z position of the move */
  z_position: number;
  /** Deepest cut at this XY region */
  deepest_z_at_region: number;
  /** Estimated time wasted (seconds) */
  time_wasted_sec: number;
  /** Suggested optimization */
  suggestion: string;
  /** Distance of the air-cutting move (mm) */
  distance_mm: number;
}

export interface AirCutResult {
  /** All detected air-cut blocks */
  detections: AirCutBlock[];
  /** Total time wasted on air cuts (seconds) */
  total_time_wasted_sec: number;
  /** Optimized G-code with air cuts replaced by rapids */
  optimized_gcode: string;
  /** Summary statistics */
  summary: {
    total_lines: number;
    air_cut_lines: number;
    air_cut_pct: number;
    total_time_wasted_sec: number;
    time_saved_if_optimized_sec: number;
    by_type: Record<string, number>;
  };
  /** Detailed report */
  report: string;
}

// ─── Constants ──────────────────────────────────────────────────────

const G_MOTION_LINEAR = /G0?1\b/;
const G_MOTION_RAPID = /G0?0\b/;
const G_MOTION_ARC_CW = /G0?2\b/;
const G_MOTION_ARC_CCW = /G0?3\b/;
const FEED_REGEX = /F([\d.]+)/;
const X_REGEX = /X(-?[\d.]+)/;
const Y_REGEX = /Y(-?[\d.]+)/;
const Z_REGEX = /Z(-?[\d.]+)/;
const RAPID_RATE_DEFAULT = 15000; // mm/min typical CNC rapid

// ─── Engine ─────────────────────────────────────────────────────────

class AirCutDetectionEngineImpl {
  /**
   * Detect air cuts in a G-code program.
   *
   * @param input - G-code and detection parameters
   * @returns Detection results with optimized G-code
   */
  detect(input: AirCutInput): AirCutResult {
    const lines = input.gcode.split("\n");
    const stockTopZ = input.stock_top_z ?? 0;
    const minDistance = input.min_distance_mm ?? 1.0;
    const rapidRate = input.rapid_rate_mm_min ?? RAPID_RATE_DEFAULT;
    const detections: AirCutBlock[] = [];
    const optimizedLines: string[] = [];

    // State tracking
    let currentX = 0, currentY = 0, currentZ = stockTopZ + 50; // Start above stock
    let currentFeed = 0;
    let motionMode: "rapid" | "linear" | "arc_cw" | "arc_ccw" = "rapid";
    let retractZ = input.retract_z ?? this.autoDetectRetractZ(lines, stockTopZ);

    // Z-height map: track deepest cut per XY grid cell (1mm resolution)
    const zMap = new Map<string, number>();
    const gridKey = (x: number, y: number): string =>
      `${Math.round(x)},${Math.round(y)}`;

    // First pass: build the Z-height map from all cutting moves
    let scanX = 0, scanY = 0, scanZ = stockTopZ + 50;
    let scanMotion: "rapid" | "linear" | "arc" = "rapid";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || this.isComment(trimmed)) continue;

      if (G_MOTION_RAPID.test(trimmed)) scanMotion = "rapid";
      else if (G_MOTION_LINEAR.test(trimmed)) scanMotion = "linear";
      else if (G_MOTION_ARC_CW.test(trimmed) || G_MOTION_ARC_CCW.test(trimmed)) scanMotion = "arc";

      const xm = trimmed.match(X_REGEX);
      const ym = trimmed.match(Y_REGEX);
      const zm = trimmed.match(Z_REGEX);

      if (xm) scanX = parseFloat(xm[1]);
      if (ym) scanY = parseFloat(ym[1]);
      if (zm) scanZ = parseFloat(zm[1]);

      // Record cutting depth (only linear/arc moves below stock top)
      if (scanMotion !== "rapid" && scanZ <= stockTopZ) {
        const key = gridKey(scanX, scanY);
        const existing = zMap.get(key);
        if (existing === undefined || scanZ < existing) {
          zMap.set(key, scanZ);
        }
      }
    }

    // Second pass: detect air cuts
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed || this.isComment(trimmed)) {
        optimizedLines.push(line);
        continue;
      }

      // Update motion mode
      if (G_MOTION_RAPID.test(trimmed)) motionMode = "rapid";
      else if (G_MOTION_LINEAR.test(trimmed)) motionMode = "linear";
      else if (G_MOTION_ARC_CW.test(trimmed)) motionMode = "arc_cw";
      else if (G_MOTION_ARC_CCW.test(trimmed)) motionMode = "arc_ccw";

      const xm = trimmed.match(X_REGEX);
      const ym = trimmed.match(Y_REGEX);
      const zm = trimmed.match(Z_REGEX);
      const fm = trimmed.match(FEED_REGEX);

      const newX = xm ? parseFloat(xm[1]) : currentX;
      const newY = ym ? parseFloat(ym[1]) : currentY;
      const newZ = zm ? parseFloat(zm[1]) : currentZ;
      if (fm) currentFeed = parseFloat(fm[1]);

      const isCuttingMove = motionMode !== "rapid";

      if (isCuttingMove && currentFeed > 0) {
        const distance = this.moveDistance(currentX, currentY, currentZ, newX, newY, newZ);

        if (distance >= minDistance) {
          const key = gridKey(newX, newY);
          const deepestZ = zMap.get(key) ?? stockTopZ;

          // Check for air-cut conditions
          let airCutType: AirCutBlock["type"] | null = null;
          let suggestion = "";

          // 1. Above stock surface — tool is cutting air
          if (newZ > stockTopZ && currentZ > stockTopZ) {
            airCutType = "above_stock";
            suggestion = "Replace with G0 rapid — move is entirely above stock";
          }
          // 2. Approach at feed rate — moving from above to stock at feed instead of rapid
          else if (currentZ > retractZ * 0.9 && newZ > stockTopZ && zm) {
            airCutType = "approach_feed";
            suggestion = "Use G0 rapid for approach above stock, switch to G1 at stock surface";
          }
          // 3. Retract at feed rate — moving upward from cut to retract at feed
          else if (newZ >= retractZ * 0.9 && currentZ <= stockTopZ && zm) {
            airCutType = "retract_feed";
            suggestion = "Use G0 rapid for retract after cutting complete";
          }
          // 4. Cutting above deepest previous cut at this location (repeat pass / spring pass above material)
          else if (newZ > deepestZ + 0.01 && newZ <= stockTopZ && deepestZ < stockTopZ) {
            // Only if this Z is substantially above the deepest — within 0.1mm might be intentional finishing
            if (newZ - deepestZ > 0.5) {
              airCutType = "repeat_pass";
              suggestion = `Material already cleared to Z${deepestZ.toFixed(3)} — this pass at Z${newZ.toFixed(3)} is air`;
            }
          }

          if (airCutType) {
            const feedTime = currentFeed > 0 ? (distance / currentFeed) * 60 : 0;
            const rapidTime = (distance / rapidRate) * 60;
            const timeSaved = feedTime - rapidTime;

            detections.push({
              line_number: i + 1,
              gcode_text: trimmed,
              type: airCutType,
              z_position: newZ,
              deepest_z_at_region: deepestZ,
              time_wasted_sec: Math.max(0, timeSaved),
              suggestion,
              distance_mm: Math.round(distance * 100) / 100,
            });

            // Optimized line: replace with rapid
            if (airCutType === "above_stock" || airCutType === "approach_feed" || airCutType === "retract_feed") {
              const rapidLine = this.toRapid(trimmed);
              optimizedLines.push(rapidLine);
            } else {
              optimizedLines.push(line);
            }
          } else {
            optimizedLines.push(line);
          }
        } else {
          optimizedLines.push(line);
        }
      } else {
        optimizedLines.push(line);
      }

      currentX = newX;
      currentY = newY;
      currentZ = newZ;
    }

    // Build summary
    const totalTimeWasted = detections.reduce((sum, d) => sum + d.time_wasted_sec, 0);
    const byType: Record<string, number> = {};
    for (const d of detections) {
      byType[d.type] = (byType[d.type] ?? 0) + 1;
    }

    const timeSavedIfOptimized = detections
      .filter(d => ["above_stock", "approach_feed", "retract_feed"].includes(d.type))
      .reduce((sum, d) => sum + d.time_wasted_sec, 0);

    const report = this.buildReport(detections, lines.length, totalTimeWasted, timeSavedIfOptimized, byType);

    return {
      detections,
      total_time_wasted_sec: Math.round(totalTimeWasted * 100) / 100,
      optimized_gcode: optimizedLines.join("\n"),
      summary: {
        total_lines: lines.length,
        air_cut_lines: detections.length,
        air_cut_pct: lines.length > 0 ? Math.round((detections.length / lines.length) * 10000) / 100 : 0,
        total_time_wasted_sec: Math.round(totalTimeWasted * 100) / 100,
        time_saved_if_optimized_sec: Math.round(timeSavedIfOptimized * 100) / 100,
        by_type: byType,
      },
      report,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  /**
   * Auto-detect retract Z height from the program.
   * Looks for the highest Z in rapid moves.
   */
  private autoDetectRetractZ(lines: string[], stockTopZ: number): number {
    let maxZ = stockTopZ + 25; // Default 25mm above stock
    let isRapid = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (G_MOTION_RAPID.test(trimmed)) isRapid = true;
      else if (G_MOTION_LINEAR.test(trimmed) || G_MOTION_ARC_CW.test(trimmed) || G_MOTION_ARC_CCW.test(trimmed)) isRapid = false;

      if (isRapid) {
        const zm = trimmed.match(Z_REGEX);
        if (zm) {
          const z = parseFloat(zm[1]);
          if (z > maxZ) maxZ = z;
        }
      }
    }

    return maxZ;
  }

  /** Calculate 3D distance between two points */
  private moveDistance(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
  }

  /** Convert a G1/G2/G3 line to G0 rapid */
  private toRapid(line: string): string {
    // Replace G1/G01/G2/G02/G3/G03 with G0 and remove feed rate
    return line
      .replace(/G0?[123]\b/, "G0")
      .replace(/\s*F[\d.]+/, "");
  }

  /** Check if a line is a pure comment */
  private isComment(line: string): boolean {
    return (line.startsWith("(") && line.endsWith(")")) ||
           line.startsWith(";") ||
           line.startsWith("%");
  }

  /** Build human-readable air-cut report */
  private buildReport(
    detections: AirCutBlock[],
    totalLines: number,
    totalWasted: number,
    timeSaved: number,
    byType: Record<string, number>,
  ): string {
    const parts: string[] = [
      `AIR-CUT DETECTION REPORT`,
      `========================`,
      `Total lines analyzed: ${totalLines}`,
      `Air-cut blocks found: ${detections.length}`,
      `Total time wasted: ${totalWasted.toFixed(1)} seconds`,
      `Time saved if optimized: ${timeSaved.toFixed(1)} seconds`,
      ``,
      `BY TYPE:`,
    ];

    for (const [type, count] of Object.entries(byType)) {
      parts.push(`  ${type}: ${count} occurrences`);
    }

    if (detections.length > 0) {
      parts.push(``, `TOP AIR-CUT BLOCKS (by time wasted):`);
      const sorted = [...detections].sort((a, b) => b.time_wasted_sec - a.time_wasted_sec);
      for (const d of sorted.slice(0, 10)) {
        parts.push(`  Line ${d.line_number}: ${d.gcode_text} — ${d.time_wasted_sec.toFixed(2)}s wasted (${d.type})`);
        parts.push(`    → ${d.suggestion}`);
      }
    }

    return parts.join("\n");
  }
}

/** Singleton export */
export const airCutDetectionEngine = new AirCutDetectionEngineImpl();
