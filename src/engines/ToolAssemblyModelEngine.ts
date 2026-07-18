/**
 * ToolAssemblyModelEngine — Compound tool+holder+spindle collision shape
 *
 * Combines tool dimensions (46K catalog) + holder dimensions (1,164 holders)
 * + spindle nose geometry into a single collision cylinder stack.
 * Computes: total assembly length, max diameter at each Z-height, gauge line offset.
 *
 * References: ISO 7388 (taper standards), DIN 69871 (SK toolholders),
 *             ISO 26623 (HSK interface), MAS-BT (BT taper)
 */

export interface ToolDimensions {
  type: "endmill" | "drill" | "boring_bar" | "face_mill" | "ball_end" | "insert" | "reamer" | "tap";
  cutting_diameter_mm: number;
  cutting_length_mm: number;
  shank_diameter_mm: number;
  overall_length_mm: number;
  flute_count?: number;
  corner_radius_mm?: number;
}

export interface HolderDimensions {
  type: "collet_chuck" | "shrink_fit" | "hydraulic" | "weldon" | "end_mill_holder" | "shell_mill" | "boring_head" | "tap_holder";
  taper: "BT30" | "BT40" | "BT50" | "HSK-A63" | "HSK-A100" | "HSK-E40" | "HSK-F63" | "CAT40" | "CAT50" | "SK40" | "SK50";
  body_diameter_mm: number;
  body_length_mm: number;
  bore_diameter_mm: number;
  gauge_length_mm: number;
  projection_length_mm?: number;
}

export interface SpindleNose {
  taper: string;
  nose_diameter_mm: number;
  nose_length_mm: number;
  housing_diameter_mm: number;
  housing_length_mm: number;
}

export interface CylinderSegment {
  z_start_mm: number;
  z_end_mm: number;
  diameter_mm: number;
  label: string;
}

export interface AssemblyProfile {
  segments: CylinderSegment[];
  total_length_mm: number;
  max_diameter_mm: number;
  gauge_line_z_mm: number;
  cutting_tip_z_mm: number;
  tool_type: string;
  holder_type: string;
  taper: string;
}

// Default spindle nose dimensions by taper
const SPINDLE_DEFAULTS: Record<string, SpindleNose> = {
  BT30: { taper: "BT30", nose_diameter_mm: 50, nose_length_mm: 30, housing_diameter_mm: 120, housing_length_mm: 150 },
  BT40: { taper: "BT40", nose_diameter_mm: 63, nose_length_mm: 40, housing_diameter_mm: 150, housing_length_mm: 200 },
  BT50: { taper: "BT50", nose_diameter_mm: 80, nose_length_mm: 50, housing_diameter_mm: 180, housing_length_mm: 250 },
  "HSK-A63": { taper: "HSK-A63", nose_diameter_mm: 80, nose_length_mm: 35, housing_diameter_mm: 140, housing_length_mm: 180 },
  "HSK-A100": { taper: "HSK-A100", nose_diameter_mm: 120, nose_length_mm: 45, housing_diameter_mm: 180, housing_length_mm: 220 },
  "HSK-E40": { taper: "HSK-E40", nose_diameter_mm: 55, nose_length_mm: 25, housing_diameter_mm: 100, housing_length_mm: 140 },
  "HSK-F63": { taper: "HSK-F63", nose_diameter_mm: 80, nose_length_mm: 35, housing_diameter_mm: 140, housing_length_mm: 180 },
  CAT40: { taper: "CAT40", nose_diameter_mm: 63, nose_length_mm: 40, housing_diameter_mm: 150, housing_length_mm: 200 },
  CAT50: { taper: "CAT50", nose_diameter_mm: 80, nose_length_mm: 50, housing_diameter_mm: 180, housing_length_mm: 250 },
  SK40: { taper: "SK40", nose_diameter_mm: 63, nose_length_mm: 40, housing_diameter_mm: 150, housing_length_mm: 200 },
  SK50: { taper: "SK50", nose_diameter_mm: 80, nose_length_mm: 50, housing_diameter_mm: 180, housing_length_mm: 250 },
};

export class ToolAssemblyModelEngine {
  /**
   * Build a compound collision profile from tool + holder + spindle
   */
  buildAssembly(
    tool: ToolDimensions,
    holder?: HolderDimensions,
    spindle?: SpindleNose
  ): AssemblyProfile {
    const segments: CylinderSegment[] = [];
    let z = 0; // Z=0 is the cutting tip (most negative Z in machine coords)

    // Segment 1: Cutting edge
    segments.push({
      z_start_mm: z,
      z_end_mm: z + tool.cutting_length_mm,
      diameter_mm: tool.cutting_diameter_mm,
      label: "cutting_edge",
    });
    z += tool.cutting_length_mm;

    // Segment 2: Shank (between cutting and holder)
    const shankLength = tool.overall_length_mm - tool.cutting_length_mm;
    if (shankLength > 0) {
      segments.push({
        z_start_mm: z,
        z_end_mm: z + shankLength,
        diameter_mm: tool.shank_diameter_mm,
        label: "shank",
      });
      z += shankLength;
    }

    // Segment 3: Holder body (if provided)
    const gaugeLineZ = z;
    if (holder) {
      // Holder collet/bore section
      const projLen = holder.projection_length_mm ?? holder.body_length_mm * 0.3;
      segments.push({
        z_start_mm: z,
        z_end_mm: z + projLen,
        diameter_mm: Math.max(holder.bore_diameter_mm + 10, tool.shank_diameter_mm + 5),
        label: "holder_nose",
      });
      z += projLen;

      // Holder main body
      const bodyRemain = holder.body_length_mm - projLen;
      if (bodyRemain > 0) {
        segments.push({
          z_start_mm: z,
          z_end_mm: z + bodyRemain,
          diameter_mm: holder.body_diameter_mm,
          label: "holder_body",
        });
        z += bodyRemain;
      }

      // Holder taper section
      const taperLength = holder.gauge_length_mm - holder.body_length_mm;
      if (taperLength > 0) {
        const taperDia = SPINDLE_DEFAULTS[holder.taper]?.nose_diameter_mm ?? holder.body_diameter_mm;
        segments.push({
          z_start_mm: z,
          z_end_mm: z + taperLength,
          diameter_mm: taperDia,
          label: "holder_taper",
        });
        z += taperLength;
      }
    }

    // Segment 4: Spindle nose + housing
    const sp = spindle ?? SPINDLE_DEFAULTS[holder?.taper ?? "BT40"] ?? SPINDLE_DEFAULTS.BT40;
    segments.push({
      z_start_mm: z,
      z_end_mm: z + sp.nose_length_mm,
      diameter_mm: sp.nose_diameter_mm,
      label: "spindle_nose",
    });
    z += sp.nose_length_mm;

    segments.push({
      z_start_mm: z,
      z_end_mm: z + sp.housing_length_mm,
      diameter_mm: sp.housing_diameter_mm,
      label: "spindle_housing",
    });
    z += sp.housing_length_mm;

    return {
      segments,
      total_length_mm: Math.round(z * 100) / 100,
      max_diameter_mm: Math.max(...segments.map(s => s.diameter_mm)),
      gauge_line_z_mm: gaugeLineZ,
      cutting_tip_z_mm: 0,
      tool_type: tool.type,
      holder_type: holder?.type ?? "none",
      taper: holder?.taper ?? sp.taper,
    };
  }

  /**
   * Get collision profile as max diameter at each Z height
   * Used for swept volume collision checking
   */
  getCollisionProfile(assembly: AssemblyProfile, step_mm: number = 5): Array<{ z: number; radius: number }> {
    const profile: Array<{ z: number; radius: number }> = [];
    for (let z = 0; z <= assembly.total_length_mm; z += step_mm) {
      // Find which segment contains this Z
      let radius = 0;
      for (const seg of assembly.segments) {
        if (z >= seg.z_start_mm && z <= seg.z_end_mm) {
          radius = seg.diameter_mm / 2;
          break;
        }
      }
      profile.push({ z, radius });
    }
    return profile;
  }

  /**
   * Get the maximum radius at any Z height within a range
   * Used for quick conservative collision check
   */
  getMaxRadiusInRange(assembly: AssemblyProfile, z_min: number, z_max: number): number {
    let maxR = 0;
    for (const seg of assembly.segments) {
      if (seg.z_end_mm >= z_min && seg.z_start_mm <= z_max) {
        maxR = Math.max(maxR, seg.diameter_mm / 2);
      }
    }
    return maxR;
  }
}

export const toolAssemblyModelEngine = new ToolAssemblyModelEngine();
