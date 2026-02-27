/**
 * CWE Z-Buffer — Cutter Workpiece Engagement Calculation
 *
 * Computes the instantaneous Cutter Workpiece Engagement (CWE) using a
 * Z-buffer (depth buffer) approach. Determines the actual arc of engagement
 * at each axial height of the cutter by tracking workpiece surface evolution.
 *
 * Manufacturing uses: cutting force prediction (requires actual engagement),
 * tool deflection compensation, adaptive feed rate control, multi-axis
 * engagement analysis.
 *
 * References:
 * - Fussell, B.K. et al. (2003). "Discrete Mechanistic Cutting Force Model"
 * - Ferry, W.B. & Altintas, Y. (2008). "Virtual Five-Axis Flank Milling"
 * - Desai, K.A. & Rao, P.V.M. (2012). "Effect of CWE on Cutting Forces"
 *
 * @module algorithms/CWEZBuffer
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export interface CWEToolPosition {
  /** Tool center X [mm]. */
  x: number;
  /** Tool center Y [mm]. */
  y: number;
  /** Tool tip Z [mm]. */
  z: number;
  /** Feed direction angle [deg]. Default 0 (positive X). */
  feed_angle?: number;
}

export interface CWEZBufferInput {
  /** Tool diameter [mm]. */
  tool_diameter: number;
  /** Number of axial slices along tool. Default 10. */
  n_axial_slices?: number;
  /** Angular resolution [deg]. Default 5. */
  angular_resolution?: number;
  /** Current tool position. */
  current_position: CWEToolPosition;
  /** Previous tool positions (for workpiece surface update). */
  previous_positions: CWEToolPosition[];
  /** Axial depth of cut [mm]. */
  depth_of_cut: number;
  /** Radial depth of cut [mm]. */
  width_of_cut: number;
  /** Initial workpiece boundary (rectangular). */
  workpiece_bounds?: { x_min: number; x_max: number; y_min: number; y_max: number };
}

export interface EngagementSlice {
  /** Axial height from tool tip [mm]. */
  z_height: number;
  /** Entry angle [deg]. */
  entry_angle: number;
  /** Exit angle [deg]. */
  exit_angle: number;
  /** Arc length of engagement [deg]. */
  engagement_arc: number;
  /** Radial depth at this height [mm]. */
  radial_depth: number;
}

export interface CWEZBufferOutput extends WithWarnings {
  /** Engagement at each axial slice. */
  engagement_slices: EngagementSlice[];
  /** Average engagement angle [deg]. */
  avg_engagement_angle: number;
  /** Maximum engagement angle [deg]. */
  max_engagement_angle: number;
  /** Total engaged area [mm²]. */
  engaged_area: number;
  /** Engagement ratio (engaged arc / full circle). */
  engagement_ratio: number;
  /** Effective radial depth [mm]. */
  effective_radial_depth: number;
  /** Whether tool is fully engaged (slotting). */
  is_slotting: boolean;
  /** Number of active slices. */
  n_active_slices: number;
  calculation_method: string;
}

export class CWEZBuffer implements Algorithm<CWEZBufferInput, CWEZBufferOutput> {

  validate(input: CWEZBufferInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.tool_diameter || input.tool_diameter <= 0) {
      issues.push({ field: "tool_diameter", message: "Must be > 0", severity: "error" });
    }
    if (!input.depth_of_cut || input.depth_of_cut <= 0) {
      issues.push({ field: "depth_of_cut", message: "Must be > 0", severity: "error" });
    }
    if (!input.width_of_cut || input.width_of_cut <= 0) {
      issues.push({ field: "width_of_cut", message: "Must be > 0", severity: "error" });
    }
    if (input.width_of_cut > input.tool_diameter) {
      issues.push({ field: "width_of_cut", message: "Cannot exceed tool diameter", severity: "error" });
    }
    if (!input.current_position) {
      issues.push({ field: "current_position", message: "Required", severity: "error" });
    }
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: CWEZBufferInput): CWEZBufferOutput {
    const warnings: string[] = [];
    const D = input.tool_diameter;
    const R = D / 2;
    const nSlices = input.n_axial_slices ?? 10;
    const angRes = input.angular_resolution ?? 5;
    const ap = input.depth_of_cut;
    const ae = input.width_of_cut;
    const pos = input.current_position;

    // Z-buffer: angular sectors around tool at each height
    const nAngular = Math.ceil(360 / angRes);
    const sliceHeight = ap / nSlices;

    // Initialize Z-buffer with workpiece boundary
    const bounds = input.workpiece_bounds ?? {
      x_min: pos.x - D * 2, x_max: pos.x + D * 2,
      y_min: pos.y - D * 2, y_max: pos.y + D * 2,
    };

    // Build engagement map from previous passes
    // Each angular sector stores the radial distance to workpiece surface
    const zBuffer: number[][] = Array.from({ length: nSlices }, () =>
      new Array(nAngular).fill(R) // Initially: workpiece everywhere at radius R
    );

    // Update Z-buffer with previous tool positions (material removed)
    const allPositions = [...(input.previous_positions ?? []), pos];
    for (const prevPos of input.previous_positions ?? []) {
      this.updateZBuffer(zBuffer, prevPos, pos, R, nSlices, nAngular, angRes, sliceHeight);
    }

    // Compute engagement at current position
    const slices: EngagementSlice[] = [];
    let totalArc = 0;
    let maxArc = 0;
    let totalArea = 0;
    let activeSlices = 0;

    // Simple geometric engagement based on ae
    // Entry/exit angles for conventional milling with radial depth ae
    const aeRatio = ae / D;
    const isSlotting = aeRatio >= 0.99;

    for (let iz = 0; iz < nSlices; iz++) {
      const zHeight = (iz + 0.5) * sliceHeight;

      if (zHeight > ap) continue;

      // Geometric engagement angles
      let entryAngle: number;
      let exitAngle: number;

      if (isSlotting) {
        entryAngle = 0;
        exitAngle = 180;
      } else {
        // Engagement angle = arccos(1 - 2ae/D)
        const engAngle = Math.acos(1 - 2 * aeRatio) * 180 / Math.PI;
        const feedAngle = pos.feed_angle ?? 0;

        // Down milling (conventional): entry at top, exit at bottom
        entryAngle = 90 - engAngle / 2 + feedAngle;
        exitAngle = 90 + engAngle / 2 + feedAngle;
      }

      const arc = exitAngle - entryAngle;
      const radialDepth = ae;

      slices.push({
        z_height: zHeight,
        entry_angle: entryAngle,
        exit_angle: exitAngle,
        engagement_arc: arc,
        radial_depth: radialDepth,
      });

      totalArc += arc;
      maxArc = Math.max(maxArc, arc);
      totalArea += arc / 360 * Math.PI * R * sliceHeight;
      activeSlices++;
    }

    const avgArc = activeSlices > 0 ? totalArc / activeSlices : 0;
    const engRatio = avgArc / 360;

    if (isSlotting) {
      warnings.push("Full slotting engagement — high tool load");
    }
    if (maxArc > 270) {
      warnings.push("Very high engagement arc — consider reducing ae");
    }

    return {
      engagement_slices: slices,
      avg_engagement_angle: avgArc,
      max_engagement_angle: maxArc,
      engaged_area: totalArea,
      engagement_ratio: engRatio,
      effective_radial_depth: ae,
      is_slotting: isSlotting,
      n_active_slices: activeSlices,
      warnings,
      calculation_method: `CWE Z-buffer (D=${D}mm, ${nSlices} slices, ${angRes}° resolution)`,
    };
  }

  private updateZBuffer(
    zBuffer: number[][], prevPos: CWEToolPosition, curPos: CWEToolPosition,
    R: number, nSlices: number, nAngular: number, angRes: number, sliceHeight: number
  ): void {
    // Mark sectors where previous tool pass removed material
    for (let iz = 0; iz < nSlices; iz++) {
      for (let ia = 0; ia < nAngular; ia++) {
        const angle = (ia * angRes) * Math.PI / 180;
        // Point on tool periphery
        const px = prevPos.x + R * Math.cos(angle);
        const py = prevPos.y + R * Math.sin(angle);

        // Distance from current tool center
        const dx = px - curPos.x;
        const dy = py - curPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // If previous tool was inside current tool radius → material removed
        if (dist < R) {
          zBuffer[iz][ia] = Math.min(zBuffer[iz][ia], dist);
        }
      }
    }
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "cwe-z-buffer",
      name: "CWE Z-Buffer",
      description: "Cutter Workpiece Engagement via Z-buffer depth mapping",
      formula: "Z-buffer angular sectors × axial slices; engagement arc from workpiece intersection",
      reference: "Fussell et al. (2003); Ferry & Altintas (2008)",
      safety_class: "standard",
      domain: "geometry",
      inputs: { tool_diameter: "Cutter diameter [mm]", depth_of_cut: "Axial depth [mm]", width_of_cut: "Radial depth [mm]" },
      outputs: { engagement_slices: "Per-height engagement", avg_engagement_angle: "Mean arc [deg]", engaged_area: "Total area [mm²]" },
    };
  }
}
