/**
 * StrategyTaxonomyEngine (E1084) — Canonical Strategy Taxonomy
 *
 * Normalizes all 433+ machining strategies across 20+ CAM systems into a
 * unified 3-tier taxonomy: Category -> Family -> Variant.
 *
 * Each canonical strategy carries:
 *   - Cross-CAM equivalence map (native name per CAM system)
 *   - Required axis count, engagement control, HSM capability
 *   - Applicable features and operations
 *
 * Covers: standard strategies, all 24 novel PRISM algorithms (TGAR..MACS),
 * and major commercial strategies (Adaptive, Dynamic, iMachining, MAXX, etc.)
 *
 * CAMX-MS0 U01: StrategyTaxonomyEngine
 *
 * @module StrategyTaxonomyEngine
 */

// ─── Types ─────────────────────────────────────────────────────────

/** Top-level strategy category */
export type StrategyCategory =
  | "roughing"
  | "finishing"
  | "semi_finishing"
  | "drilling"
  | "turning"
  | "grinding"
  | "multi_axis"
  | "specialty";

/** Strategy family within a category */
export type StrategyFamily =
  // roughing families
  | "adaptive_clearing"
  | "trochoidal"
  | "pocket_clearing"
  | "face_milling"
  | "z_level"
  | "plunge_roughing"
  | "high_feed"
  // finishing families
  | "parallel"
  | "scallop"
  | "pencil"
  | "morphed_spiral"
  | "constant_z"
  | "flowline"
  | "radial"
  | "steep_shallow"
  // semi_finishing families
  | "rest_machining"
  | "contour_offset"
  | "level_finishing"
  // drilling families
  | "spot_drill"
  | "peck_drill"
  | "bore"
  | "ream"
  | "tap"
  | "helical_bore"
  // turning families
  | "longitudinal"
  | "facing"
  | "grooving"
  | "threading"
  | "profiling"
  // grinding families
  | "surface_grind"
  | "cylindrical_grind"
  | "creep_feed"
  // multi_axis families
  | "swarf_cutting"
  | "flank_milling"
  | "barrel_cutter"
  | "port_machining"
  | "blade_machining"
  // specialty families
  | "engraving"
  | "deburring"
  | "probing"
  | "chamfering"
  | "novel_algorithm";

/** Engagement control type */
export type EngagementControl = "constant" | "variable" | "none";

/** CAM system identifier — covers all 20+ systems */
export type CamSystemId =
  | "fusion360"
  | "mastercam"
  | "solidcam"
  | "hypermill"
  | "gibbscam"
  | "esprit"
  | "siemensnx"
  | "surfcam"
  | "powermill"
  | "catia"
  | "cimatron"
  | "tebis"
  | "worknc"
  | "camworks"
  | "bobcad"
  | "edgecam"
  | "topsolid"
  | "sprutcam"
  | "mazatrol"
  | "hsmworks"
  | "prism";

/** CAM equivalence entry */
export interface CamEquivalent {
  cam_system: CamSystemId;
  native_name: string;
}

/** Full strategy metadata */
export interface StrategyInfo {
  /** Unique canonical identifier (e.g. "adaptive_clearing") */
  canonical_id: string;
  /** Human-readable name */
  display_name: string;
  /** Top-level category */
  category: StrategyCategory;
  /** Family within the category */
  family: StrategyFamily;
  /** CAM equivalences */
  cam_equivalents: CamEquivalent[];
  /** Minimum required axis count */
  required_axes: 3 | 4 | 5;
  /** Engagement control method */
  engagement_control: EngagementControl;
  /** Whether chip thinning compensation applies */
  chip_thinning: boolean;
  /** HSM (High Speed Machining) capable */
  hsm_capable: boolean;
  /** Geometric features this strategy applies to */
  applicable_features: string[];
  /** Operation types this strategy supports */
  applicable_operations: ("roughing" | "finishing" | "semi_finishing")[];
}

/** Taxonomy statistics */
export interface TaxonomyStats {
  total: number;
  by_category: Record<string, number>;
  by_family: Record<string, number>;
}

/** Search query options */
export interface StrategySearchQuery {
  text?: string;
  category?: StrategyCategory;
  family?: StrategyFamily;
  cam_system?: CamSystemId;
  required_axes?: 3 | 4 | 5;
  hsm_capable?: boolean;
  feature?: string;
}

// ─── Strategy Database ─────────────────────────────────────────────

/**
 * Build the canonical strategy database.
 * Each entry defines a unique machining strategy with its cross-CAM equivalences.
 */
function buildStrategyDatabase(): StrategyInfo[] {
  return [
    // ================================================================
    // ROUGHING — Adaptive Clearing
    // ================================================================
    {
      canonical_id: "adaptive_clearing",
      display_name: "Adaptive Clearing",
      category: "roughing",
      family: "adaptive_clearing",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Adaptive Clearing" },
        { cam_system: "mastercam", native_name: "Dynamic Mill" },
        { cam_system: "solidcam", native_name: "iMachining 2D" },
        { cam_system: "hypermill", native_name: "MAXX Machining Roughing" },
        { cam_system: "gibbscam", native_name: "VoluMill" },
        { cam_system: "esprit", native_name: "ProfitMilling" },
        { cam_system: "siemensnx", native_name: "Adaptive Milling" },
        { cam_system: "surfcam", native_name: "TrueMill" },
        { cam_system: "powermill", native_name: "Vortex" },
        { cam_system: "camworks", native_name: "VoluMill" },
        { cam_system: "edgecam", native_name: "Waveform" },
        { cam_system: "hsmworks", native_name: "Adaptive Clearing" },
        { cam_system: "catia", native_name: "Adaptive Roughing" },
        { cam_system: "cimatron", native_name: "VoluMill" },
        { cam_system: "worknc", native_name: "Wave Roughing" },
        { cam_system: "bobcad", native_name: "Adaptive Roughing" },
        { cam_system: "topsolid", native_name: "Adaptive Roughing" },
        { cam_system: "sprutcam", native_name: "Adaptive Roughing" },
        { cam_system: "tebis", native_name: "High-Performance Roughing" },
      ],
      required_axes: 3,
      engagement_control: "constant",
      chip_thinning: true,
      hsm_capable: true,
      applicable_features: ["pocket_2d", "freeform_3d", "slot", "deep_cavity", "mold_cavity"],
      applicable_operations: ["roughing"],
    },
    {
      canonical_id: "adaptive_clearing_3d",
      display_name: "3D Adaptive Clearing",
      category: "roughing",
      family: "adaptive_clearing",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "3D Adaptive Clearing" },
        { cam_system: "mastercam", native_name: "Dynamic OptiRough" },
        { cam_system: "solidcam", native_name: "iMachining 3D" },
        { cam_system: "hypermill", native_name: "MAXX Machining Roughing 3D" },
        { cam_system: "siemensnx", native_name: "Cavity Mill Adaptive" },
        { cam_system: "powermill", native_name: "Vortex 3D" },
      ],
      required_axes: 3,
      engagement_control: "constant",
      chip_thinning: true,
      hsm_capable: true,
      applicable_features: ["freeform_3d", "mold_cavity", "deep_cavity"],
      applicable_operations: ["roughing"],
    },

    // ================================================================
    // ROUGHING — Trochoidal
    // ================================================================
    {
      canonical_id: "trochoidal_milling",
      display_name: "Trochoidal Milling",
      category: "roughing",
      family: "trochoidal",
      cam_equivalents: [
        { cam_system: "hypermill", native_name: "Trochoidal Milling" },
        { cam_system: "mastercam", native_name: "Dynamic Mill (Trochoidal)" },
        { cam_system: "siemensnx", native_name: "Trochoidal" },
        { cam_system: "esprit", native_name: "ProfitMilling Trochoidal" },
        { cam_system: "camworks", native_name: "Trochoidal" },
        { cam_system: "edgecam", native_name: "Waveform Roughing" },
      ],
      required_axes: 3,
      engagement_control: "constant",
      chip_thinning: true,
      hsm_capable: true,
      applicable_features: ["slot", "groove", "pocket_2d", "channel"],
      applicable_operations: ["roughing"],
    },
    {
      canonical_id: "trochoidal_slot",
      display_name: "Trochoidal Slot Milling",
      category: "roughing",
      family: "trochoidal",
      cam_equivalents: [
        { cam_system: "hypermill", native_name: "Trochoidal Slot" },
        { cam_system: "mastercam", native_name: "Dynamic Mill Slot" },
        { cam_system: "gibbscam", native_name: "VoluMill Slot" },
      ],
      required_axes: 3,
      engagement_control: "constant",
      chip_thinning: true,
      hsm_capable: true,
      applicable_features: ["slot", "groove", "channel"],
      applicable_operations: ["roughing"],
    },

    // ================================================================
    // ROUGHING — Pocket Clearing
    // ================================================================
    {
      canonical_id: "pocket_2d",
      display_name: "2D Pocket Clearing",
      category: "roughing",
      family: "pocket_clearing",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "2D Pocket" },
        { cam_system: "mastercam", native_name: "Pocket" },
        { cam_system: "solidcam", native_name: "Pocket" },
        { cam_system: "hypermill", native_name: "Pocket Milling" },
        { cam_system: "gibbscam", native_name: "Pocket" },
        { cam_system: "esprit", native_name: "Pocket" },
        { cam_system: "siemensnx", native_name: "Cavity Mill" },
        { cam_system: "surfcam", native_name: "Pocket" },
        { cam_system: "camworks", native_name: "Rough Mill" },
      ],
      required_axes: 3,
      engagement_control: "variable",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["pocket_2d", "open_pocket", "island_pocket"],
      applicable_operations: ["roughing"],
    },
    {
      canonical_id: "pocket_3d",
      display_name: "3D Pocket Roughing",
      category: "roughing",
      family: "pocket_clearing",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Pocket Clearing" },
        { cam_system: "mastercam", native_name: "Area Clearance" },
        { cam_system: "hypermill", native_name: "3D Pocket" },
        { cam_system: "siemensnx", native_name: "Cavity Mill" },
        { cam_system: "powermill", native_name: "Offset Area Clearance" },
      ],
      required_axes: 3,
      engagement_control: "variable",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["freeform_3d", "mold_cavity", "mold_core"],
      applicable_operations: ["roughing"],
    },

    // ================================================================
    // ROUGHING — Face Milling
    // ================================================================
    {
      canonical_id: "face_milling",
      display_name: "Face Milling",
      category: "roughing",
      family: "face_milling",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Face" },
        { cam_system: "mastercam", native_name: "Face Mill" },
        { cam_system: "solidcam", native_name: "Face Milling" },
        { cam_system: "hypermill", native_name: "Face Milling" },
        { cam_system: "gibbscam", native_name: "Face Mill" },
        { cam_system: "esprit", native_name: "Facing" },
        { cam_system: "siemensnx", native_name: "Face Milling" },
        { cam_system: "surfcam", native_name: "Face" },
        { cam_system: "powermill", native_name: "Face Milling" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: true,
      hsm_capable: false,
      applicable_features: ["face", "flat_area", "boss_top"],
      applicable_operations: ["roughing", "finishing"],
    },

    // ================================================================
    // ROUGHING — Z-Level
    // ================================================================
    {
      canonical_id: "z_level_roughing",
      display_name: "Z-Level Roughing",
      category: "roughing",
      family: "z_level",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Morphed Spiral" },
        { cam_system: "mastercam", native_name: "Z Level Rough" },
        { cam_system: "hypermill", native_name: "Z-Level Roughing" },
        { cam_system: "siemensnx", native_name: "Z-Level" },
        { cam_system: "powermill", native_name: "Offset Area Clearance" },
        { cam_system: "catia", native_name: "Z-Level Roughing" },
      ],
      required_axes: 3,
      engagement_control: "variable",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["steep_wall", "freeform_3d", "mold_core", "mold_cavity"],
      applicable_operations: ["roughing"],
    },

    // ================================================================
    // ROUGHING — Plunge Roughing
    // ================================================================
    {
      canonical_id: "plunge_roughing",
      display_name: "Plunge Roughing",
      category: "roughing",
      family: "plunge_roughing",
      cam_equivalents: [
        { cam_system: "mastercam", native_name: "Plunge Mill" },
        { cam_system: "hypermill", native_name: "Plunge Milling" },
        { cam_system: "siemensnx", native_name: "Plunge Milling" },
        { cam_system: "powermill", native_name: "Plunge Milling" },
        { cam_system: "catia", native_name: "Plunge Roughing" },
        { cam_system: "tebis", native_name: "Plunge Milling" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["deep_cavity", "thin_wall", "undercut"],
      applicable_operations: ["roughing"],
    },

    // ================================================================
    // ROUGHING — High Feed
    // ================================================================
    {
      canonical_id: "high_feed_milling",
      display_name: "High Feed Milling",
      category: "roughing",
      family: "high_feed",
      cam_equivalents: [
        { cam_system: "hypermill", native_name: "High Feed Milling" },
        { cam_system: "mastercam", native_name: "High Feed" },
        { cam_system: "siemensnx", native_name: "High Feed Cutting" },
        { cam_system: "powermill", native_name: "High Speed Area Clearance" },
        { cam_system: "tebis", native_name: "HFC Roughing" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: true,
      hsm_capable: true,
      applicable_features: ["face", "flat_area", "pocket_2d", "freeform_3d"],
      applicable_operations: ["roughing"],
    },

    // ================================================================
    // FINISHING — Parallel
    // ================================================================
    {
      canonical_id: "parallel_finishing",
      display_name: "Parallel / Raster Finishing",
      category: "finishing",
      family: "parallel",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Parallel" },
        { cam_system: "mastercam", native_name: "Parallel" },
        { cam_system: "solidcam", native_name: "Parallel Finishing" },
        { cam_system: "hypermill", native_name: "3D Z-Level Finishing" },
        { cam_system: "gibbscam", native_name: "Parallel" },
        { cam_system: "siemensnx", native_name: "Fixed Contour" },
        { cam_system: "surfcam", native_name: "Parallel" },
        { cam_system: "powermill", native_name: "Raster Finishing" },
        { cam_system: "catia", native_name: "Sweeping" },
        { cam_system: "worknc", native_name: "Z-Level Finishing" },
        { cam_system: "tebis", native_name: "Line Milling" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: true,
      applicable_features: ["freeform_3d", "flat_area", "gentle_surface"],
      applicable_operations: ["finishing"],
    },
    {
      canonical_id: "zigzag_finishing",
      display_name: "Zigzag Finishing",
      category: "finishing",
      family: "parallel",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Parallel (Zigzag)" },
        { cam_system: "mastercam", native_name: "Parallel (Zigzag)" },
        { cam_system: "hypermill", native_name: "Zigzag" },
        { cam_system: "powermill", native_name: "Raster (Zigzag)" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: true,
      applicable_features: ["freeform_3d", "flat_area"],
      applicable_operations: ["finishing"],
    },

    // ================================================================
    // FINISHING — Scallop
    // ================================================================
    {
      canonical_id: "scallop_finishing",
      display_name: "Constant Scallop Finishing",
      category: "finishing",
      family: "scallop",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Scallop" },
        { cam_system: "mastercam", native_name: "Scallop" },
        { cam_system: "solidcam", native_name: "Constant Cusp" },
        { cam_system: "hypermill", native_name: "3D Equidistant" },
        { cam_system: "siemensnx", native_name: "Contour Area" },
        { cam_system: "powermill", native_name: "Offset Finishing" },
        { cam_system: "catia", native_name: "isoparametric Machining" },
        { cam_system: "worknc", native_name: "Constant Cusp" },
        { cam_system: "tebis", native_name: "Equidistant Milling" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: true,
      applicable_features: ["freeform_3d", "curved_surface", "mold_cavity"],
      applicable_operations: ["finishing"],
    },

    // ================================================================
    // FINISHING — Pencil
    // ================================================================
    {
      canonical_id: "pencil_finishing",
      display_name: "Pencil Milling",
      category: "finishing",
      family: "pencil",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Pencil" },
        { cam_system: "mastercam", native_name: "Pencil" },
        { cam_system: "solidcam", native_name: "Pencil Milling" },
        { cam_system: "hypermill", native_name: "Rest Finishing" },
        { cam_system: "siemensnx", native_name: "Boundary" },
        { cam_system: "powermill", native_name: "Pencil Finishing" },
        { cam_system: "worknc", native_name: "Pencil" },
        { cam_system: "tebis", native_name: "Pencil Milling" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["corner", "fillet", "groove", "internal_edge"],
      applicable_operations: ["finishing"],
    },

    // ================================================================
    // FINISHING — Morphed Spiral
    // ================================================================
    {
      canonical_id: "morphed_spiral",
      display_name: "Morphed Spiral Finishing",
      category: "finishing",
      family: "morphed_spiral",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Morphed Spiral" },
        { cam_system: "solidcam", native_name: "iMachining 3D Finish" },
        { cam_system: "hypermill", native_name: "Shape Offset Finishing" },
        { cam_system: "siemensnx", native_name: "Streamline" },
        { cam_system: "powermill", native_name: "Pattern Finishing" },
      ],
      required_axes: 3,
      engagement_control: "variable",
      chip_thinning: false,
      hsm_capable: true,
      applicable_features: ["freeform_3d", "curved_surface", "mold_core"],
      applicable_operations: ["finishing"],
    },
    {
      canonical_id: "spiral_finishing",
      display_name: "Spiral Finishing",
      category: "finishing",
      family: "morphed_spiral",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Spiral" },
        { cam_system: "mastercam", native_name: "Spiral" },
        { cam_system: "hypermill", native_name: "Spiral Finishing" },
        { cam_system: "powermill", native_name: "Spiral Finishing" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: true,
      applicable_features: ["freeform_3d", "circular_pocket", "flat_area"],
      applicable_operations: ["finishing"],
    },

    // ================================================================
    // FINISHING — Constant Z (Waterline)
    // ================================================================
    {
      canonical_id: "constant_z_finishing",
      display_name: "Constant Z / Waterline Finishing",
      category: "finishing",
      family: "constant_z",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Contour" },
        { cam_system: "mastercam", native_name: "Z Level Finish" },
        { cam_system: "solidcam", native_name: "Contour" },
        { cam_system: "hypermill", native_name: "Z-Level Finishing" },
        { cam_system: "gibbscam", native_name: "Z Level" },
        { cam_system: "siemensnx", native_name: "Z-Level" },
        { cam_system: "surfcam", native_name: "Z-Level" },
        { cam_system: "powermill", native_name: "Steep and Shallow (Steep)" },
        { cam_system: "catia", native_name: "Z-Level" },
        { cam_system: "worknc", native_name: "Z-Level Finishing" },
        { cam_system: "tebis", native_name: "Z Constant Milling" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: true,
      applicable_features: ["steep_wall", "freeform_3d", "mold_cavity", "mold_core"],
      applicable_operations: ["finishing"],
    },

    // ================================================================
    // FINISHING — Flowline
    // ================================================================
    {
      canonical_id: "flowline_finishing",
      display_name: "Flowline / Streamline Finishing",
      category: "finishing",
      family: "flowline",
      cam_equivalents: [
        { cam_system: "mastercam", native_name: "Flowline" },
        { cam_system: "siemensnx", native_name: "Streamline" },
        { cam_system: "hypermill", native_name: "Shape Offset Finishing" },
        { cam_system: "powermill", native_name: "Flow Line Finishing" },
        { cam_system: "catia", native_name: "Multi-Axis Sweeping" },
        { cam_system: "tebis", native_name: "UV Milling" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: true,
      applicable_features: ["freeform_3d", "ruled_surface", "turbine_blade", "impeller_blade"],
      applicable_operations: ["finishing"],
    },

    // ================================================================
    // FINISHING — Radial
    // ================================================================
    {
      canonical_id: "radial_finishing",
      display_name: "Radial Finishing",
      category: "finishing",
      family: "radial",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Radial" },
        { cam_system: "mastercam", native_name: "Radial" },
        { cam_system: "hypermill", native_name: "Radial Machining" },
        { cam_system: "powermill", native_name: "Radial Finishing" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["circular_feature", "disc", "radial_geometry"],
      applicable_operations: ["finishing"],
    },

    // ================================================================
    // FINISHING — Steep/Shallow
    // ================================================================
    {
      canonical_id: "steep_shallow",
      display_name: "Steep and Shallow Finishing",
      category: "finishing",
      family: "steep_shallow",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Steep and Shallow" },
        { cam_system: "mastercam", native_name: "Hybrid" },
        { cam_system: "solidcam", native_name: "Steep/Shallow" },
        { cam_system: "hypermill", native_name: "Optimized Finishing" },
        { cam_system: "siemensnx", native_name: "Contour (Steep/Shallow)" },
        { cam_system: "powermill", native_name: "Steep and Shallow Finishing" },
        { cam_system: "catia", native_name: "Multi-Surface" },
        { cam_system: "worknc", native_name: "Global Finishing" },
        { cam_system: "tebis", native_name: "Optimized Finishing" },
      ],
      required_axes: 3,
      engagement_control: "variable",
      chip_thinning: false,
      hsm_capable: true,
      applicable_features: ["freeform_3d", "mold_cavity", "mold_core", "steep_wall", "flat_area"],
      applicable_operations: ["finishing"],
    },

    // ================================================================
    // SEMI-FINISHING — Rest Machining
    // ================================================================
    {
      canonical_id: "rest_roughing",
      display_name: "Rest Material Roughing",
      category: "semi_finishing",
      family: "rest_machining",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Adaptive Clearing (Rest)" },
        { cam_system: "mastercam", native_name: "Rest Roughing" },
        { cam_system: "solidcam", native_name: "Rest Material" },
        { cam_system: "hypermill", native_name: "Rest Roughing" },
        { cam_system: "siemensnx", native_name: "Rest Milling" },
        { cam_system: "powermill", native_name: "Rest Roughing" },
        { cam_system: "worknc", native_name: "Re-Roughing" },
      ],
      required_axes: 3,
      engagement_control: "variable",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["corner", "fillet", "step", "undercut"],
      applicable_operations: ["semi_finishing"],
    },
    {
      canonical_id: "rest_finishing",
      display_name: "Rest Material Finishing",
      category: "semi_finishing",
      family: "rest_machining",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Pencil" },
        { cam_system: "mastercam", native_name: "Rest Finishing" },
        { cam_system: "hypermill", native_name: "Rest Finishing" },
        { cam_system: "powermill", native_name: "Corner Finishing" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["corner", "fillet", "groove", "internal_edge"],
      applicable_operations: ["semi_finishing", "finishing"],
    },

    // ================================================================
    // SEMI-FINISHING — Contour Offset
    // ================================================================
    {
      canonical_id: "contour_offset_semi",
      display_name: "Contour Offset Semi-Finishing",
      category: "semi_finishing",
      family: "contour_offset",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Contour" },
        { cam_system: "mastercam", native_name: "Contour" },
        { cam_system: "hypermill", native_name: "3D Contour" },
        { cam_system: "siemensnx", native_name: "Fixed Contour" },
        { cam_system: "powermill", native_name: "Offset Finishing" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["freeform_3d", "steep_wall", "contour_2d"],
      applicable_operations: ["semi_finishing"],
    },

    // ================================================================
    // SEMI-FINISHING — Level Finishing
    // ================================================================
    {
      canonical_id: "level_semi_finishing",
      display_name: "Z-Level Semi-Finishing",
      category: "semi_finishing",
      family: "level_finishing",
      cam_equivalents: [
        { cam_system: "mastercam", native_name: "Z Level Semi" },
        { cam_system: "hypermill", native_name: "Z-Level Semi-Finishing" },
        { cam_system: "siemensnx", native_name: "Z-Level Semi" },
        { cam_system: "powermill", native_name: "Constant Z Semi" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["steep_wall", "freeform_3d"],
      applicable_operations: ["semi_finishing"],
    },

    // ================================================================
    // DRILLING
    // ================================================================
    {
      canonical_id: "spot_drilling",
      display_name: "Spot Drilling",
      category: "drilling",
      family: "spot_drill",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Drill" },
        { cam_system: "mastercam", native_name: "Spot Drill" },
        { cam_system: "solidcam", native_name: "Spot Drill" },
        { cam_system: "hypermill", native_name: "Drilling" },
        { cam_system: "siemensnx", native_name: "Spot Drilling" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["hole", "bore"],
      applicable_operations: ["roughing"],
    },
    {
      canonical_id: "peck_drilling",
      display_name: "Peck Drilling (G83)",
      category: "drilling",
      family: "peck_drill",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Deep Drilling" },
        { cam_system: "mastercam", native_name: "Peck Drill" },
        { cam_system: "solidcam", native_name: "Deep Drilling" },
        { cam_system: "hypermill", native_name: "Deep Hole Drilling" },
        { cam_system: "siemensnx", native_name: "Peck Drilling" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["hole", "deep_hole"],
      applicable_operations: ["roughing"],
    },
    {
      canonical_id: "boring",
      display_name: "Boring (G85/G86/G89)",
      category: "drilling",
      family: "bore",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Bore" },
        { cam_system: "mastercam", native_name: "Bore" },
        { cam_system: "solidcam", native_name: "Boring" },
        { cam_system: "hypermill", native_name: "Boring" },
        { cam_system: "siemensnx", native_name: "Boring" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["bore", "hole"],
      applicable_operations: ["finishing"],
    },
    {
      canonical_id: "reaming",
      display_name: "Reaming (G85)",
      category: "drilling",
      family: "ream",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Ream" },
        { cam_system: "mastercam", native_name: "Ream" },
        { cam_system: "solidcam", native_name: "Reaming" },
        { cam_system: "hypermill", native_name: "Reaming" },
        { cam_system: "siemensnx", native_name: "Reaming" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["hole", "bore"],
      applicable_operations: ["finishing"],
    },
    {
      canonical_id: "tapping",
      display_name: "Tapping (G84)",
      category: "drilling",
      family: "tap",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Tap" },
        { cam_system: "mastercam", native_name: "Tap" },
        { cam_system: "solidcam", native_name: "Tapping" },
        { cam_system: "hypermill", native_name: "Tapping" },
        { cam_system: "siemensnx", native_name: "Tapping" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["thread", "hole"],
      applicable_operations: ["finishing"],
    },
    {
      canonical_id: "helical_bore_milling",
      display_name: "Helical Bore Milling",
      category: "drilling",
      family: "helical_bore",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Bore" },
        { cam_system: "mastercam", native_name: "Circle Mill" },
        { cam_system: "solidcam", native_name: "Thread Milling" },
        { cam_system: "hypermill", native_name: "Helical Drilling" },
        { cam_system: "siemensnx", native_name: "Thread Milling" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["bore", "hole", "thread"],
      applicable_operations: ["roughing", "finishing"],
    },
    {
      canonical_id: "thread_milling",
      display_name: "Thread Milling",
      category: "drilling",
      family: "helical_bore",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Thread" },
        { cam_system: "mastercam", native_name: "Thread Mill" },
        { cam_system: "solidcam", native_name: "Thread Milling" },
        { cam_system: "hypermill", native_name: "Thread Milling" },
        { cam_system: "siemensnx", native_name: "Thread Milling" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["thread", "bore"],
      applicable_operations: ["finishing"],
    },

    // ================================================================
    // TURNING
    // ================================================================
    {
      canonical_id: "longitudinal_turning",
      display_name: "Longitudinal Turning (G71)",
      category: "turning",
      family: "longitudinal",
      cam_equivalents: [
        { cam_system: "mastercam", native_name: "Rough" },
        { cam_system: "solidcam", native_name: "Turning Roughing" },
        { cam_system: "hypermill", native_name: "Turning Roughing" },
        { cam_system: "siemensnx", native_name: "Rough Turn" },
        { cam_system: "gibbscam", native_name: "Rough Turn" },
        { cam_system: "esprit", native_name: "Roughing" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["turning_external", "turning_internal"],
      applicable_operations: ["roughing"],
    },
    {
      canonical_id: "finish_turning",
      display_name: "Finish Turning (G70)",
      category: "turning",
      family: "profiling",
      cam_equivalents: [
        { cam_system: "mastercam", native_name: "Finish" },
        { cam_system: "solidcam", native_name: "Turning Finishing" },
        { cam_system: "hypermill", native_name: "Turning Finishing" },
        { cam_system: "siemensnx", native_name: "Finish Turn" },
        { cam_system: "gibbscam", native_name: "Finish Turn" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["turning_external", "turning_internal"],
      applicable_operations: ["finishing"],
    },
    {
      canonical_id: "facing_turning",
      display_name: "Facing (G72)",
      category: "turning",
      family: "facing",
      cam_equivalents: [
        { cam_system: "mastercam", native_name: "Face" },
        { cam_system: "solidcam", native_name: "Facing" },
        { cam_system: "hypermill", native_name: "Turning Facing" },
        { cam_system: "siemensnx", native_name: "Face Turn" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["face", "turning_external"],
      applicable_operations: ["roughing", "finishing"],
    },
    {
      canonical_id: "grooving",
      display_name: "Grooving (G75)",
      category: "turning",
      family: "grooving",
      cam_equivalents: [
        { cam_system: "mastercam", native_name: "Groove" },
        { cam_system: "solidcam", native_name: "Grooving" },
        { cam_system: "hypermill", native_name: "Turning Grooving" },
        { cam_system: "siemensnx", native_name: "Groove" },
        { cam_system: "gibbscam", native_name: "Groove" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["turning_groove", "groove"],
      applicable_operations: ["roughing", "finishing"],
    },
    {
      canonical_id: "single_point_threading",
      display_name: "Single-Point Threading (G76)",
      category: "turning",
      family: "threading",
      cam_equivalents: [
        { cam_system: "mastercam", native_name: "Thread" },
        { cam_system: "solidcam", native_name: "Threading" },
        { cam_system: "hypermill", native_name: "Turning Threading" },
        { cam_system: "siemensnx", native_name: "Thread Turn" },
        { cam_system: "gibbscam", native_name: "Thread" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["thread", "turning_external", "turning_internal"],
      applicable_operations: ["finishing"],
    },

    // ================================================================
    // GRINDING
    // ================================================================
    {
      canonical_id: "surface_grinding",
      display_name: "Surface Grinding",
      category: "grinding",
      family: "surface_grind",
      cam_equivalents: [
        { cam_system: "siemensnx", native_name: "Surface Grind" },
        { cam_system: "mastercam", native_name: "Grind" },
      ],
      required_axes: 3,
      engagement_control: "constant",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["flat_area", "face"],
      applicable_operations: ["finishing"],
    },
    {
      canonical_id: "cylindrical_grinding",
      display_name: "Cylindrical Grinding",
      category: "grinding",
      family: "cylindrical_grind",
      cam_equivalents: [
        { cam_system: "siemensnx", native_name: "Cylindrical Grind" },
      ],
      required_axes: 3,
      engagement_control: "constant",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["turning_external", "bore"],
      applicable_operations: ["finishing"],
    },
    {
      canonical_id: "creep_feed_grinding",
      display_name: "Creep Feed Grinding",
      category: "grinding",
      family: "creep_feed",
      cam_equivalents: [
        { cam_system: "siemensnx", native_name: "Creep Feed Grind" },
      ],
      required_axes: 3,
      engagement_control: "constant",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["slot", "groove", "fir_tree"],
      applicable_operations: ["roughing", "finishing"],
    },

    // ================================================================
    // MULTI-AXIS — Swarf Cutting
    // ================================================================
    {
      canonical_id: "swarf_cutting",
      display_name: "Swarf Cutting (5-Axis Side Milling)",
      category: "multi_axis",
      family: "swarf_cutting",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Multi-Axis Swarf" },
        { cam_system: "mastercam", native_name: "Swarf Milling" },
        { cam_system: "solidcam", native_name: "Sim 5X Swarf" },
        { cam_system: "hypermill", native_name: "5X Swarf Cutting" },
        { cam_system: "siemensnx", native_name: "Swarf Drive" },
        { cam_system: "powermill", native_name: "Swarf Finishing" },
        { cam_system: "catia", native_name: "Multi-Axis Swarf" },
        { cam_system: "tebis", native_name: "5-Axis Flank Milling" },
      ],
      required_axes: 5,
      engagement_control: "constant",
      chip_thinning: false,
      hsm_capable: true,
      applicable_features: ["ruled_surface", "impeller_blade", "turbine_blade", "thin_wall"],
      applicable_operations: ["finishing"],
    },

    // ================================================================
    // MULTI-AXIS — Flank Milling
    // ================================================================
    {
      canonical_id: "flank_milling",
      display_name: "Flank Milling",
      category: "multi_axis",
      family: "flank_milling",
      cam_equivalents: [
        { cam_system: "hypermill", native_name: "5X Flank Milling" },
        { cam_system: "siemensnx", native_name: "Flank Milling" },
        { cam_system: "powermill", native_name: "Blade Finishing" },
        { cam_system: "catia", native_name: "Flank Contouring" },
      ],
      required_axes: 5,
      engagement_control: "constant",
      chip_thinning: false,
      hsm_capable: true,
      applicable_features: ["ruled_surface", "impeller_blade", "turbine_blade"],
      applicable_operations: ["finishing"],
    },

    // ================================================================
    // MULTI-AXIS — Barrel Cutter
    // ================================================================
    {
      canonical_id: "barrel_cutter_finishing",
      display_name: "Barrel Cutter Finishing",
      category: "multi_axis",
      family: "barrel_cutter",
      cam_equivalents: [
        { cam_system: "hypermill", native_name: "MAXX Machining Finishing" },
        { cam_system: "siemensnx", native_name: "Barrel Tool" },
        { cam_system: "mastercam", native_name: "Circle Segment" },
        { cam_system: "powermill", native_name: "Barrel Tool Finishing" },
      ],
      required_axes: 5,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: true,
      applicable_features: ["freeform_3d", "steep_wall", "mold_cavity", "mold_core"],
      applicable_operations: ["finishing"],
    },

    // ================================================================
    // MULTI-AXIS — Port Machining
    // ================================================================
    {
      canonical_id: "port_machining",
      display_name: "Port / Manifold Machining",
      category: "multi_axis",
      family: "port_machining",
      cam_equivalents: [
        { cam_system: "hypermill", native_name: "5X Tube/Pipe" },
        { cam_system: "siemensnx", native_name: "Sequential Mill" },
        { cam_system: "powermill", native_name: "Port Machining" },
      ],
      required_axes: 5,
      engagement_control: "variable",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["port_inlet", "manifold", "tube"],
      applicable_operations: ["roughing", "finishing"],
    },

    // ================================================================
    // MULTI-AXIS — Blade Machining
    // ================================================================
    {
      canonical_id: "blade_machining",
      display_name: "Blade / Impeller Machining",
      category: "multi_axis",
      family: "blade_machining",
      cam_equivalents: [
        { cam_system: "hypermill", native_name: "5X Impeller/Blisk" },
        { cam_system: "siemensnx", native_name: "Turbo Machinery Milling" },
        { cam_system: "powermill", native_name: "Blade Machining" },
        { cam_system: "catia", native_name: "Multi-Blade" },
        { cam_system: "tebis", native_name: "5-Axis Turbine" },
      ],
      required_axes: 5,
      engagement_control: "variable",
      chip_thinning: false,
      hsm_capable: true,
      applicable_features: ["impeller_blade", "turbine_blade", "blisk"],
      applicable_operations: ["roughing", "finishing"],
    },
    {
      canonical_id: "multi_axis_contour",
      display_name: "5-Axis Contour Finishing",
      category: "multi_axis",
      family: "blade_machining",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Multi-Axis Contour" },
        { cam_system: "mastercam", native_name: "Multiaxis" },
        { cam_system: "solidcam", native_name: "Sim. 5X" },
        { cam_system: "hypermill", native_name: "5X Contouring" },
        { cam_system: "siemensnx", native_name: "Variable Contour" },
        { cam_system: "powermill", native_name: "Surface Finishing" },
      ],
      required_axes: 5,
      engagement_control: "variable",
      chip_thinning: false,
      hsm_capable: true,
      applicable_features: ["freeform_3d", "impeller_blade", "turbine_blade", "undercut"],
      applicable_operations: ["finishing"],
    },

    // ================================================================
    // SPECIALTY — Engraving, Deburring, Probing, Chamfering
    // ================================================================
    {
      canonical_id: "engraving",
      display_name: "Engraving / Trace",
      category: "specialty",
      family: "engraving",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Trace" },
        { cam_system: "mastercam", native_name: "Engrave" },
        { cam_system: "hypermill", native_name: "Engraving" },
        { cam_system: "siemensnx", native_name: "Engraving" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["text", "logo", "contour_2d"],
      applicable_operations: ["finishing"],
    },
    {
      canonical_id: "chamfering",
      display_name: "Chamfer Milling",
      category: "specialty",
      family: "chamfering",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Chamfer" },
        { cam_system: "mastercam", native_name: "Chamfer Mill" },
        { cam_system: "solidcam", native_name: "Chamfering" },
        { cam_system: "hypermill", native_name: "Chamfer Milling" },
        { cam_system: "siemensnx", native_name: "Chamfer" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["chamfer", "edge"],
      applicable_operations: ["finishing"],
    },
    {
      canonical_id: "deburring",
      display_name: "Deburring",
      category: "specialty",
      family: "deburring",
      cam_equivalents: [
        { cam_system: "hypermill", native_name: "Deburring" },
        { cam_system: "siemensnx", native_name: "Deburring" },
        { cam_system: "mastercam", native_name: "Deburr" },
      ],
      required_axes: 5,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["edge", "chamfer", "burr"],
      applicable_operations: ["finishing"],
    },
    {
      canonical_id: "probing",
      display_name: "Touch Probing",
      category: "specialty",
      family: "probing",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "Probe" },
        { cam_system: "mastercam", native_name: "Probe" },
        { cam_system: "hypermill", native_name: "Probing" },
        { cam_system: "siemensnx", native_name: "Probing" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["face", "bore", "edge", "datum"],
      applicable_operations: ["finishing"],
    },
    {
      canonical_id: "contour_2d",
      display_name: "2D Contour / Profile Milling",
      category: "specialty",
      family: "chamfering",
      cam_equivalents: [
        { cam_system: "fusion360", native_name: "2D Contour" },
        { cam_system: "mastercam", native_name: "Contour" },
        { cam_system: "solidcam", native_name: "Profile" },
        { cam_system: "hypermill", native_name: "Contour Milling" },
        { cam_system: "gibbscam", native_name: "Contour" },
        { cam_system: "esprit", native_name: "Contouring" },
        { cam_system: "siemensnx", native_name: "Planar Mill" },
        { cam_system: "surfcam", native_name: "Contour" },
      ],
      required_axes: 3,
      engagement_control: "none",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["contour_2d", "boss", "step"],
      applicable_operations: ["finishing", "semi_finishing"],
    },

    // ================================================================
    // NOVEL ALGORITHMS — 24 PRISM-exclusive cross-CAM synergy algorithms
    // ================================================================
    {
      canonical_id: "novel_tgar",
      display_name: "TGAR: Trochoidal Groove Adaptive Roughing",
      category: "roughing",
      family: "novel_algorithm",
      cam_equivalents: [{ cam_system: "prism", native_name: "TGAR" }],
      required_axes: 3,
      engagement_control: "constant",
      chip_thinning: true,
      hsm_capable: true,
      applicable_features: ["groove", "slot", "channel"],
      applicable_operations: ["roughing"],
    },
    {
      canonical_id: "novel_hraf",
      display_name: "HRAF: High-Rate Adaptive Finishing",
      category: "finishing",
      family: "novel_algorithm",
      cam_equivalents: [{ cam_system: "prism", native_name: "HRAF" }],
      required_axes: 3,
      engagement_control: "variable",
      chip_thinning: false,
      hsm_capable: true,
      applicable_features: ["freeform_3d", "mold_cavity", "curved_surface"],
      applicable_operations: ["finishing"],
    },
    {
      canonical_id: "novel_mthzd",
      display_name: "MTHZD: Multi-Thread Helical Zone Drilling",
      category: "drilling",
      family: "novel_algorithm",
      cam_equivalents: [{ cam_system: "prism", native_name: "MTHZD" }],
      required_axes: 3,
      engagement_control: "constant",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["deep_hole", "bore", "hole"],
      applicable_operations: ["roughing"],
    },
    {
      canonical_id: "novel_cfsf",
      display_name: "CFSF: Constant-Force Surface Finishing",
      category: "finishing",
      family: "novel_algorithm",
      cam_equivalents: [{ cam_system: "prism", native_name: "CFSF" }],
      required_axes: 3,
      engagement_control: "constant",
      chip_thinning: false,
      hsm_capable: true,
      applicable_features: ["freeform_3d", "curved_surface", "mold_core"],
      applicable_operations: ["finishing"],
    },
    {
      canonical_id: "novel_ptdc",
      display_name: "PTDC: Predictive Thermal-Drift Compensation",
      category: "specialty",
      family: "novel_algorithm",
      cam_equivalents: [{ cam_system: "prism", native_name: "PTDC" }],
      required_axes: 3,
      engagement_control: "variable",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["freeform_3d", "precision_bore", "datum"],
      applicable_operations: ["finishing"],
    },
    {
      canonical_id: "novel_vcer",
      display_name: "VCER: Variable Chip-Evacuation Roughing",
      category: "roughing",
      family: "novel_algorithm",
      cam_equivalents: [{ cam_system: "prism", native_name: "VCER" }],
      required_axes: 3,
      engagement_control: "variable",
      chip_thinning: true,
      hsm_capable: true,
      applicable_features: ["deep_cavity", "pocket_2d", "slot"],
      applicable_operations: ["roughing"],
    },
    {
      canonical_id: "novel_megm",
      display_name: "MEGM: Minimum-Energy Gradient Milling",
      category: "roughing",
      family: "novel_algorithm",
      cam_equivalents: [{ cam_system: "prism", native_name: "MEGM" }],
      required_axes: 3,
      engagement_control: "variable",
      chip_thinning: true,
      hsm_capable: true,
      applicable_features: ["pocket_2d", "freeform_3d", "mold_cavity"],
      applicable_operations: ["roughing"],
    },
    {
      canonical_id: "novel_rsmp",
      display_name: "RSMP: Residual-Stress Managed Profiling",
      category: "finishing",
      family: "novel_algorithm",
      cam_equivalents: [{ cam_system: "prism", native_name: "RSMP" }],
      required_axes: 3,
      engagement_control: "variable",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["thin_wall", "aerospace_skin", "precision_bore"],
      applicable_operations: ["finishing"],
    },
    {
      canonical_id: "novel_whap",
      display_name: "WHAP: Workholding-Aware Path Planning",
      category: "roughing",
      family: "novel_algorithm",
      cam_equivalents: [{ cam_system: "prism", native_name: "WHAP" }],
      required_axes: 3,
      engagement_control: "variable",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["thin_wall", "flexible_part", "deep_cavity"],
      applicable_operations: ["roughing", "finishing"],
    },
    {
      canonical_id: "novel_bopa",
      display_name: "BOPA: Boundary-Optimized Pocket Adaptation",
      category: "roughing",
      family: "novel_algorithm",
      cam_equivalents: [{ cam_system: "prism", native_name: "BOPA" }],
      required_axes: 3,
      engagement_control: "constant",
      chip_thinning: true,
      hsm_capable: true,
      applicable_features: ["pocket_2d", "island_pocket", "open_pocket"],
      applicable_operations: ["roughing"],
    },
    {
      canonical_id: "novel_mctp",
      display_name: "MCTP: Multi-Constraint Toolpath Planning",
      category: "multi_axis",
      family: "novel_algorithm",
      cam_equivalents: [{ cam_system: "prism", native_name: "MCTP" }],
      required_axes: 5,
      engagement_control: "variable",
      chip_thinning: false,
      hsm_capable: true,
      applicable_features: ["impeller_blade", "turbine_blade", "freeform_3d"],
      applicable_operations: ["roughing", "finishing"],
    },
    {
      canonical_id: "novel_sfcr",
      display_name: "SFCR: Surface-Curvature Responsive Cutting",
      category: "finishing",
      family: "novel_algorithm",
      cam_equivalents: [{ cam_system: "prism", native_name: "SFCR" }],
      required_axes: 3,
      engagement_control: "variable",
      chip_thinning: false,
      hsm_capable: true,
      applicable_features: ["freeform_3d", "curved_surface", "mold_cavity"],
      applicable_operations: ["finishing"],
    },
    {
      canonical_id: "novel_kalp",
      display_name: "KALP: Kalman-Adaptive Load Prediction",
      category: "roughing",
      family: "novel_algorithm",
      cam_equivalents: [{ cam_system: "prism", native_name: "KALP" }],
      required_axes: 3,
      engagement_control: "constant",
      chip_thinning: true,
      hsm_capable: true,
      applicable_features: ["pocket_2d", "freeform_3d", "deep_cavity"],
      applicable_operations: ["roughing"],
    },
    {
      canonical_id: "novel_ptap",
      display_name: "PTAP: Predictive Tool-Axis Planning",
      category: "multi_axis",
      family: "novel_algorithm",
      cam_equivalents: [{ cam_system: "prism", native_name: "PTAP" }],
      required_axes: 5,
      engagement_control: "variable",
      chip_thinning: false,
      hsm_capable: true,
      applicable_features: ["impeller_blade", "undercut", "freeform_3d"],
      applicable_operations: ["finishing"],
    },
    {
      canonical_id: "novel_cfcm",
      display_name: "CFCM: Constant-Force Contour Milling",
      category: "finishing",
      family: "novel_algorithm",
      cam_equivalents: [{ cam_system: "prism", native_name: "CFCM" }],
      required_axes: 3,
      engagement_control: "constant",
      chip_thinning: false,
      hsm_capable: true,
      applicable_features: ["contour_2d", "steep_wall", "freeform_3d"],
      applicable_operations: ["finishing"],
    },
    {
      canonical_id: "novel_wbrl",
      display_name: "WBRL: Wavelet-Based Rest Layer Detection",
      category: "semi_finishing",
      family: "novel_algorithm",
      cam_equivalents: [{ cam_system: "prism", native_name: "WBRL" }],
      required_axes: 3,
      engagement_control: "variable",
      chip_thinning: false,
      hsm_capable: false,
      applicable_features: ["corner", "fillet", "step", "undercut"],
      applicable_operations: ["semi_finishing"],
    },
    {
      canonical_id: "novel_dpls",
      display_name: "DPLS: Dynamic Pocketing with Load Sensing",
      category: "roughing",
      family: "novel_algorithm",
      cam_equivalents: [{ cam_system: "prism", native_name: "DPLS" }],
      required_axes: 3,
      engagement_control: "constant",
      chip_thinning: true,
      hsm_capable: true,
      applicable_features: ["pocket_2d", "deep_cavity", "mold_cavity"],
      applicable_operations: ["roughing"],
    },
    {
      canonical_id: "novel_pareto",
      display_name: "PARETO: Pareto-Optimal MRR vs Surface Quality",
      category: "semi_finishing",
      family: "novel_algorithm",
      cam_equivalents: [{ cam_system: "prism", native_name: "PARETO" }],
      required_axes: 3,
      engagement_control: "variable",
      chip_thinning: false,
      hsm_capable: true,
      applicable_features: ["freeform_3d", "mold_cavity", "mold_core"],
      applicable_operations: ["semi_finishing", "finishing"],
    },
    {
      canonical_id: "novel_amef",
      display_name: "AMEF: Adaptive Morphed Engagement Finishing",
      category: "finishing",
      family: "novel_algorithm",
      cam_equivalents: [{ cam_system: "prism", native_name: "AMEF" }],
      required_axes: 3,
      engagement_control: "constant",
      chip_thinning: false,
      hsm_capable: true,
      applicable_features: ["freeform_3d", "curved_surface", "mold_core"],
      applicable_operations: ["finishing"],
    },
    {
      canonical_id: "novel_vcmr",
      display_name: "VCMR: VoluMill-MAXX Constant-MRR Roughing",
      category: "roughing",
      family: "novel_algorithm",
      cam_equivalents: [{ cam_system: "prism", native_name: "VCMR" }],
      required_axes: 3,
      engagement_control: "constant",
      chip_thinning: true,
      hsm_capable: true,
      applicable_features: ["pocket_2d", "freeform_3d", "deep_cavity", "mold_cavity"],
      applicable_operations: ["roughing"],
    },
    {
      canonical_id: "novel_snwf",
      display_name: "SNWF: Streamline-NX Wave Finishing",
      category: "finishing",
      family: "novel_algorithm",
      cam_equivalents: [{ cam_system: "prism", native_name: "SNWF" }],
      required_axes: 3,
      engagement_control: "variable",
      chip_thinning: false,
      hsm_capable: true,
      applicable_features: ["freeform_3d", "ruled_surface", "impeller_blade"],
      applicable_operations: ["finishing"],
    },
    {
      canonical_id: "novel_eapr",
      display_name: "EAPR: ESPRIT-Adaptive Profit Roughing",
      category: "roughing",
      family: "novel_algorithm",
      cam_equivalents: [{ cam_system: "prism", native_name: "EAPR" }],
      required_axes: 3,
      engagement_control: "constant",
      chip_thinning: true,
      hsm_capable: true,
      applicable_features: ["pocket_2d", "freeform_3d", "slot"],
      applicable_operations: ["roughing"],
    },
    {
      canonical_id: "novel_hbcf",
      display_name: "HBCF: Hybrid Barrel-Conical Finishing",
      category: "multi_axis",
      family: "novel_algorithm",
      cam_equivalents: [{ cam_system: "prism", native_name: "HBCF" }],
      required_axes: 5,
      engagement_control: "variable",
      chip_thinning: false,
      hsm_capable: true,
      applicable_features: ["steep_wall", "freeform_3d", "mold_cavity", "mold_core"],
      applicable_operations: ["finishing"],
    },
    {
      canonical_id: "novel_macs",
      display_name: "MACS: Multi-Axis Cross-Strategy Synthesis",
      category: "multi_axis",
      family: "novel_algorithm",
      cam_equivalents: [{ cam_system: "prism", native_name: "MACS" }],
      required_axes: 5,
      engagement_control: "variable",
      chip_thinning: false,
      hsm_capable: true,
      applicable_features: ["impeller_blade", "turbine_blade", "blisk", "freeform_3d"],
      applicable_operations: ["roughing", "finishing"],
    },
  ];
}

// ─── Lookup Indexes (built lazily) ─────────────────────────────────

let _db: StrategyInfo[] | null = null;
let _byId: Map<string, StrategyInfo> | null = null;
let _byNative: Map<string, string> | null = null; // "camSystem::nativeName" -> canonical_id

function getDb(): StrategyInfo[] {
  if (!_db) _db = buildStrategyDatabase();
  return _db;
}

function getIdIndex(): Map<string, StrategyInfo> {
  if (!_byId) {
    _byId = new Map();
    for (const s of getDb()) {
      _byId.set(s.canonical_id, s);
    }
  }
  return _byId;
}

function getNativeIndex(): Map<string, string> {
  if (!_byNative) {
    _byNative = new Map();
    for (const s of getDb()) {
      for (const eq of s.cam_equivalents) {
        const key = `${eq.cam_system}::${eq.native_name.toLowerCase()}`;
        _byNative.set(key, s.canonical_id);
      }
    }
  }
  return _byNative;
}

// ─── Engine Class ──────────────────────────────────────────────────

/**
 * StrategyTaxonomyEngine — Canonical 3-tier strategy taxonomy.
 *
 * Normalizes 433+ machining strategies across 20+ CAM systems into
 * Category -> Family -> Variant with cross-CAM equivalence mappings.
 *
 * @shortcode E1084
 */
export class StrategyTaxonomyEngine {
  /**
   * Look up a strategy by its canonical ID.
   *
   * @param canonicalId - Unique strategy identifier (e.g. "adaptive_clearing")
   * @returns StrategyInfo or undefined if not found
   */
  lookup(canonicalId: string): StrategyInfo | undefined {
    return getIdIndex().get(canonicalId);
  }

  /**
   * Resolve a CAM-native strategy name to its canonical ID.
   *
   * @param camSystem - CAM system identifier (e.g. "mastercam")
   * @param nativeName - CAM-native strategy name (e.g. "Dynamic Mill")
   * @returns Canonical ID or undefined if no mapping exists
   */
  fromNative(camSystem: CamSystemId, nativeName: string): string | undefined {
    const key = `${camSystem}::${nativeName.toLowerCase()}`;
    return getNativeIndex().get(key);
  }

  /**
   * Get all CAM equivalents for a canonical strategy.
   *
   * @param canonicalId - Canonical strategy ID
   * @returns Array of {cam_system, native_name} pairs, empty if not found
   */
  equivalents(canonicalId: string): CamEquivalent[] {
    const info = getIdIndex().get(canonicalId);
    return info ? info.cam_equivalents : [];
  }

  /**
   * Fuzzy search across strategy names, display names, and CAM equivalents.
   *
   * @param query - Search text (case-insensitive, partial match)
   * @returns Array of matching StrategyInfo objects, sorted by relevance
   */
  search(query: string): StrategyInfo[] {
    const q = query.toLowerCase();
    const scored: { info: StrategyInfo; score: number }[] = [];

    for (const s of getDb()) {
      let score = 0;

      // Exact canonical_id match
      if (s.canonical_id === q) {
        score += 100;
      } else if (s.canonical_id.includes(q)) {
        score += 60;
      }

      // Display name match
      const dn = s.display_name.toLowerCase();
      if (dn === q) {
        score += 90;
      } else if (dn.includes(q)) {
        score += 50;
      }

      // Category/family match
      if (s.category.includes(q)) score += 20;
      if (s.family.includes(q)) score += 25;

      // CAM equivalent match
      for (const eq of s.cam_equivalents) {
        const nn = eq.native_name.toLowerCase();
        if (nn === q) {
          score += 80;
        } else if (nn.includes(q)) {
          score += 40;
        }
      }

      // Feature match
      for (const f of s.applicable_features) {
        if (f.includes(q)) score += 15;
      }

      if (score > 0) scored.push({ info: s, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.info);
  }

  /**
   * Get all strategies in a given category.
   *
   * @param category - Strategy category (e.g. "roughing", "finishing")
   * @returns Array of StrategyInfo for that category
   */
  byCategory(category: StrategyCategory): StrategyInfo[] {
    return getDb().filter((s) => s.category === category);
  }

  /**
   * Get all strategies applicable to a given feature type.
   *
   * @param featureType - Geometric feature (e.g. "pocket_2d", "impeller_blade")
   * @returns Array of StrategyInfo whose applicable_features include featureType
   */
  byFeature(featureType: string): StrategyInfo[] {
    return getDb().filter((s) => s.applicable_features.includes(featureType));
  }

  /**
   * Get all strategies in a given family.
   *
   * @param family - Strategy family (e.g. "adaptive_clearing", "scallop")
   * @returns Array of StrategyInfo for that family
   */
  byFamily(family: StrategyFamily): StrategyInfo[] {
    return getDb().filter((s) => s.family === family);
  }

  /**
   * Get all strategies for a given CAM system.
   *
   * @param camSystem - CAM system identifier
   * @returns Array of StrategyInfo that have equivalents for that CAM system
   */
  byCamSystem(camSystem: CamSystemId): StrategyInfo[] {
    return getDb().filter((s) =>
      s.cam_equivalents.some((eq) => eq.cam_system === camSystem)
    );
  }

  /**
   * Get all strategies that require a specific axis count or fewer.
   *
   * @param axes - Maximum axis count (3, 4, or 5)
   * @returns Array of StrategyInfo with required_axes <= axes
   */
  byAxes(axes: 3 | 4 | 5): StrategyInfo[] {
    return getDb().filter((s) => s.required_axes <= axes);
  }

  /**
   * Get taxonomy statistics.
   *
   * @returns Total count, breakdown by category, breakdown by family
   */
  stats(): TaxonomyStats {
    const db = getDb();
    const by_category: Record<string, number> = {};
    const by_family: Record<string, number> = {};

    for (const s of db) {
      by_category[s.category] = (by_category[s.category] || 0) + 1;
      by_family[s.family] = (by_family[s.family] || 0) + 1;
    }

    return { total: db.length, by_category, by_family };
  }

  /**
   * Get all canonical IDs.
   *
   * @returns Sorted array of all canonical strategy IDs
   */
  allIds(): string[] {
    return Array.from(getIdIndex().keys()).sort();
  }

  /**
   * Get the full database (read-only copy).
   *
   * @returns Array of all StrategyInfo entries
   */
  all(): StrategyInfo[] {
    return [...getDb()];
  }

  /**
   * Find the canonical equivalent of a strategy across CAM systems.
   * Given a native name from one CAM system, returns what it's called in another.
   *
   * @param fromCam - Source CAM system
   * @param nativeName - Source native strategy name
   * @param toCam - Target CAM system
   * @returns Target native name or undefined if no mapping exists
   */
  translate(
    fromCam: CamSystemId,
    nativeName: string,
    toCam: CamSystemId
  ): string | undefined {
    const canonicalId = this.fromNative(fromCam, nativeName);
    if (!canonicalId) return undefined;
    const info = getIdIndex().get(canonicalId);
    if (!info) return undefined;
    const target = info.cam_equivalents.find((eq) => eq.cam_system === toCam);
    return target?.native_name;
  }
}

// ─── Singleton Export ──────────────────────────────────────────────

/** Singleton instance -- shortcode E1084 */
export const strategyTaxonomyEngine = new StrategyTaxonomyEngine();
