/**
 * WeldPrepEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Calculates weld joint preparation geometry: bevel angles, root gaps,
 * root faces, land dimensions, and machining parameters for weld prep.
 *
 * Covers: V-groove, J-groove, U-groove, bevel, and combination joints
 * per AWS D1.1, ASME IX, and ISO 9692 standards.
 *
 * Actions: weld_prep_calc, weld_prep_volume, weld_prep_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type JointType = "butt" | "corner" | "tee" | "lap" | "edge";
export type GrooveType = "V" | "single_bevel" | "J" | "U" | "double_V" | "double_U" | "square";
export type WeldProcess = "GMAW" | "GTAW" | "SMAW" | "FCAW" | "SAW" | "laser" | "electron_beam";

export interface WeldPrepInput {
  joint_type: JointType;
  groove_type: GrooveType;
  plate_thickness_mm: number;
  material: string;
  weld_process: WeldProcess;
  bevel_angle_deg?: number;           // per side (if not auto-calculated)
  root_gap_mm?: number;
  root_face_mm?: number;
  groove_radius_mm?: number;          // for J and U grooves
}

export interface WeldPrepResult {
  bevel_angle_deg: number;
  included_angle_deg: number;          // total groove angle
  root_gap_mm: number;
  root_face_mm: number;
  groove_depth_mm: number;
  groove_radius_mm: number;
  cross_section_area_mm2: number;      // weld metal volume per unit length
  filler_metal_kg_per_m: number;
  machining_passes: number;
  prep_time_min_per_m: number;
  standard_reference: string;
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Default groove parameters by type and thickness range
const GROOVE_DEFAULTS: Record<GrooveType, {
  bevel_deg: number; root_gap: number; root_face: number; groove_radius: number;
}> = {
  V: { bevel_deg: 30, root_gap: 2.0, root_face: 1.5, groove_radius: 0 },
  single_bevel: { bevel_deg: 45, root_gap: 3.0, root_face: 1.5, groove_radius: 0 },
  J: { bevel_deg: 10, root_gap: 2.0, root_face: 1.5, groove_radius: 6 },
  U: { bevel_deg: 10, root_gap: 2.0, root_face: 1.5, groove_radius: 6 },
  double_V: { bevel_deg: 30, root_gap: 2.0, root_face: 2.0, groove_radius: 0 },
  double_U: { bevel_deg: 10, root_gap: 2.0, root_face: 2.0, groove_radius: 6 },
  square: { bevel_deg: 0, root_gap: 2.0, root_face: 0, groove_radius: 0 },
};

// Steel density for filler metal calculation
const FILLER_DENSITY_KG_MM3 = 7.85e-6;

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class WeldPrepEngine {
  calculate(input: WeldPrepInput): WeldPrepResult {
    const defaults = GROOVE_DEFAULTS[input.groove_type] || GROOVE_DEFAULTS.V;
    const t = input.plate_thickness_mm;

    const bevelAngle = input.bevel_angle_deg ?? defaults.bevel_deg;
    const rootGap = input.root_gap_mm ?? defaults.root_gap;
    const rootFace = input.root_face_mm ?? defaults.root_face;
    const grooveRadius = input.groove_radius_mm ?? defaults.groove_radius;

    // Groove depth
    let grooveDepth = t - rootFace;
    if (input.groove_type === "double_V" || input.groove_type === "double_U") {
      grooveDepth = (t - rootFace) / 2; // each side
    }

    // Included angle
    let includedAngle: number;
    if (input.groove_type === "V" || input.groove_type === "double_V") {
      includedAngle = bevelAngle * 2;
    } else if (input.groove_type === "single_bevel") {
      includedAngle = bevelAngle;
    } else {
      includedAngle = bevelAngle * 2;
    }

    // Cross-section area of groove (weld metal required)
    let area: number;
    const tanBevel = Math.tan(bevelAngle * Math.PI / 180);

    if (input.groove_type === "V" || input.groove_type === "double_V") {
      // Triangular cross-section + root gap rectangle
      const triangleArea = grooveDepth * grooveDepth * tanBevel;
      const rootArea = rootGap * t;
      area = triangleArea + rootArea;
      if (input.groove_type === "double_V") area *= 2;
    } else if (input.groove_type === "J" || input.groove_type === "U") {
      // Approximate: bevel portion + radius portion
      const bevelArea = grooveDepth * grooveDepth * tanBevel;
      const radiusArea = Math.PI * grooveRadius ** 2 * 0.25; // quarter circle
      area = bevelArea + radiusArea + rootGap * t;
      if (input.groove_type === "double_U") area *= 2;
    } else if (input.groove_type === "square") {
      area = rootGap * t;
    } else {
      area = grooveDepth * grooveDepth * tanBevel * 0.5 + rootGap * t;
    }

    // Add reinforcement (~15% over fill)
    area *= 1.15;

    // Filler metal per meter
    const fillerPerM = area * 1000 * FILLER_DENSITY_KG_MM3;

    // Machining estimate
    const passes = grooveDepth > 10 ? 3 : grooveDepth > 5 ? 2 : 1;
    const prepTimePerM = passes * 8 + (grooveRadius > 0 ? 5 : 0); // minutes per meter

    // Standard reference
    const standard = input.plate_thickness_mm > 25 ? "AWS D1.1 Table 3.4" : "AWS D1.1 Table 3.3";

    // Recommendations
    const recs: string[] = [];
    if (t > 25 && input.groove_type === "V") {
      recs.push("Plate >25mm with V-groove — consider double-V or J-groove to reduce weld volume");
    }
    if (t < 6 && input.groove_type !== "square") {
      recs.push("Thin plate (<6mm) — square butt joint may be sufficient");
    }
    if (input.weld_process === "SAW" && rootGap > 3) {
      recs.push("SAW with large root gap — use backing bar or reduce gap");
    }
    if (bevelAngle > 35 && input.groove_type === "V") {
      recs.push("Steep bevel angle — excessive weld metal; consider reducing to 30° per side");
    }
    if (recs.length === 0) {
      recs.push("Weld prep geometry within standard parameters — proceed");
    }

    return {
      bevel_angle_deg: bevelAngle,
      included_angle_deg: includedAngle,
      root_gap_mm: rootGap,
      root_face_mm: rootFace,
      groove_depth_mm: Math.round(grooveDepth * 100) / 100,
      groove_radius_mm: grooveRadius,
      cross_section_area_mm2: Math.round(area * 10) / 10,
      filler_metal_kg_per_m: Math.round(fillerPerM * 1000) / 1000,
      machining_passes: passes,
      prep_time_min_per_m: Math.round(prepTimePerM * 10) / 10,
      standard_reference: standard,
      recommendations: recs,
    };
  }
}

export const weldPrepEngine = new WeldPrepEngine();
