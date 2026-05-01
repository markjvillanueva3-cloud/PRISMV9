// @ts-nocheck
/**
 * BatchCAMOperationCatalogEngines — 4 CAM Operation Catalog Engines in One File
 *
 * Catalogs ALL operation types in Mastercam, SolidCAM, NX CAM, and PowerMill with
 * default parameters, suitable features, recommended tools, and material-adjusted
 * defaults. Shared base class with per-system operation databases.
 *
 * @engine BatchCAMOperationCatalogEngines
 * @shortcode E1142
 * @dispatcher camDispatcher
 * @actions
 *   mastercam_op_get, mastercam_op_list,
 *   solidcam_op_get, solidcam_op_list,
 *   nx_op_get, nx_op_list,
 *   powermill_op_get, powermill_op_list
 * @milestone CAMX-MS7/U03
 */

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type OperationCategory =
  | "2d" | "3d" | "drilling" | "turning" | "roughing" | "finishing"
  | "multi_axis" | "specialty" | "imachining" | "hsr" | "hss";

export type FeatureType =
  | "pocket" | "contour" | "slot" | "face" | "bore" | "hole" | "freeform_3d"
  | "steep_wall" | "flat_area" | "groove" | "thread" | "turning_external"
  | "turning_internal" | "impeller" | "ruled_surface" | "rib" | "chamfer_edge"
  | "engraved_text" | "circular_boss" | "thin_wall";

export type ToolType =
  | "flat_end_mill" | "ball_end_mill" | "bull_nose" | "face_mill" | "drill"
  | "tap" | "reamer" | "boring_bar" | "thread_mill" | "chamfer_mill"
  | "engraving_bit" | "dovetail" | "t_slot" | "lollipop" | "turning_insert"
  | "groove_insert" | "thread_insert" | "cutoff_insert";

export type MaterialISO = "P" | "M" | "K" | "N" | "S" | "H";

export interface CATOperation {
  name: string;
  category: OperationCategory;
  /** Radial engagement as % of tool diameter (default, 3-axis milling) */
  default_ae_pct: number;
  /** Axial depth as factor of tool diameter */
  default_ap_factor: number;
  /** Cutting speed multiplier relative to base Vc for ISO P steel */
  default_vc_mult: number;
  suitable_features: FeatureType[];
  recommended_tool_types: ToolType[];
  /** Minimum axis count required (3, 4, or 5) */
  min_axes: number;
  description: string;
}

export interface OperationParams {
  ae_mm: number;
  ap_mm: number;
  vc_mpm: number;
  fz_mm: number;
  recommended_tool: ToolType;
  notes: string;
}

// ─── Material Vc base table (m/min) ───────────────────────────────────────────
// Used by getDefaultParams to scale Vc to material group
const VC_BASE_BY_ISO: Record<MaterialISO, number> = {
  P: 200,  // Carbon/alloy steel
  M: 150,  // Stainless steel
  K: 300,  // Cast iron
  N: 500,  // Aluminium/non-ferrous
  S: 60,   // Heat-resistant superalloys
  H: 80,   // Hardened steel
};

// fz base per tool diameter (mm) — 12mm tool default
const FZ_BASE_BY_ISO: Record<MaterialISO, number> = {
  P: 0.04,
  M: 0.03,
  K: 0.05,
  N: 0.08,
  S: 0.02,
  H: 0.015,
};

// ─── Base Engine ──────────────────────────────────────────────────────────────

export abstract class BaseCAMOperationCatalogEngine {
  readonly camSystem: string;
  protected abstract readonly operations: CATOperation[];

  constructor(camSystem: string) {
    this.camSystem = camSystem;
  }

  /** Retrieve a single operation by exact name (case-insensitive fallback). */
  getOperation(name: string): CATOperation | { error: string } {
    const direct = this.operations.find((op) => op.name === name);
    if (direct) return direct;
    const lower = name.toLowerCase();
    const ci = this.operations.find((op) => op.name.toLowerCase() === lower);
    if (ci) return ci;
    return {
      error: `Operation "${name}" not found in ${this.camSystem}. ` +
        `Use listOperations() to see available operations.`,
    };
  }

  /** List all operations, optionally filtered by category. */
  listOperations(category?: OperationCategory): {
    cam_system: string;
    operations: Array<{ name: string; category: OperationCategory; min_axes: number; description: string }>;
    total: number;
  } {
    const filtered = category
      ? this.operations.filter((op) => op.category === category)
      : this.operations;

    return {
      cam_system: this.camSystem,
      operations: filtered.map((op) => ({
        name: op.name,
        category: op.category,
        min_axes: op.min_axes,
        description: op.description,
      })),
      total: filtered.length,
    };
  }

  /** Return material-adjusted default parameters for a named operation. */
  getDefaultParams(name: string, material_iso: MaterialISO = "P"): OperationParams | { error: string } {
    const op = this.getOperation(name);
    if ("error" in op) return op;

    const vcBase = VC_BASE_BY_ISO[material_iso] ?? VC_BASE_BY_ISO.P;
    const fzBase = FZ_BASE_BY_ISO[material_iso] ?? FZ_BASE_BY_ISO.P;
    const toolDia = 12; // reference tool diameter mm

    const vc_mpm = Math.round(vcBase * op.default_vc_mult * 10) / 10;
    const ae_mm = Math.round(toolDia * (op.default_ae_pct / 100) * 100) / 100;
    const ap_mm = Math.round(toolDia * op.default_ap_factor * 100) / 100;
    const fz_mm = Math.round(fzBase * 100) / 100;

    return {
      ae_mm,
      ap_mm,
      vc_mpm,
      fz_mm,
      recommended_tool: op.recommended_tool_types[0] ?? "flat_end_mill",
      notes: `${this.camSystem} / ${op.name} — ISO ${material_iso}: ` +
        `Vc=${vc_mpm} m/min, ae=${ae_mm}mm, ap=${ap_mm}mm, fz=${fz_mm}mm/tooth`,
    };
  }

  /** Suggest operations for a given feature type, ranked by suitability. */
  suggestOperation(feature_type: FeatureType): {
    cam_system: string;
    feature: FeatureType;
    suggestions: Array<{ name: string; category: OperationCategory; min_axes: number }>;
  } {
    const matches = this.operations.filter((op) =>
      op.suitable_features.includes(feature_type)
    );

    // Sort: 3-axis first, then fewer axes, then alphabetical
    matches.sort((a, b) => a.min_axes - b.min_axes || a.name.localeCompare(b.name));

    return {
      cam_system: this.camSystem,
      feature: feature_type,
      suggestions: matches.map((op) => ({
        name: op.name,
        category: op.category,
        min_axes: op.min_axes,
      })),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. MASTERCAM OPERATION CATALOG ENGINE — 25 Operations
// ═══════════════════════════════════════════════════════════════════════════════

const MASTERCAM_OPERATIONS: CATOperation[] = [
  // ── 2D ────────────────────────────────────────────────────────────────────
  {
    name: "contour",
    category: "2d",
    default_ae_pct: 100,
    default_ap_factor: 0.5,
    default_vc_mult: 1.0,
    suitable_features: ["contour", "pocket", "slot"],
    recommended_tool_types: ["flat_end_mill", "bull_nose"],
    min_axes: 3,
    description: "2D contour milling along a boundary with stock-to-leave control and lead-in/out",
  },
  {
    name: "pocket",
    category: "2d",
    default_ae_pct: 65,
    default_ap_factor: 0.5,
    default_vc_mult: 1.0,
    suitable_features: ["pocket", "face"],
    recommended_tool_types: ["flat_end_mill", "bull_nose"],
    min_axes: 3,
    description: "2D pocket clearing with offset, zigzag, or true spiral patterns; island awareness",
  },
  {
    name: "face",
    category: "2d",
    default_ae_pct: 70,
    default_ap_factor: 0.3,
    default_vc_mult: 1.1,
    suitable_features: ["face", "flat_area"],
    recommended_tool_types: ["face_mill", "flat_end_mill"],
    min_axes: 3,
    description: "Face milling with uni-directional or zigzag passes for flat stock removal",
  },
  {
    name: "slot",
    category: "2d",
    default_ae_pct: 100,
    default_ap_factor: 0.5,
    default_vc_mult: 0.85,
    suitable_features: ["slot", "groove"],
    recommended_tool_types: ["flat_end_mill"],
    min_axes: 3,
    description: "Slot milling with full-width engagement; supports T-slot and dovetail variants",
  },
  {
    name: "engrave",
    category: "2d",
    default_ae_pct: 5,
    default_ap_factor: 0.1,
    default_vc_mult: 0.9,
    suitable_features: ["engraved_text", "contour"],
    recommended_tool_types: ["engraving_bit"],
    min_axes: 3,
    description: "Engraving along 2D geometry with V-bit or flat engraving tools at controlled depth",
  },
  {
    name: "chamfer",
    category: "2d",
    default_ae_pct: 100,
    default_ap_factor: 0.2,
    default_vc_mult: 1.0,
    suitable_features: ["chamfer_edge", "contour"],
    recommended_tool_types: ["chamfer_mill"],
    min_axes: 3,
    description: "2D chamfering along edges with chamfer mill; depth controlled by chamfer width",
  },
  {
    name: "circle_mill",
    category: "2d",
    default_ae_pct: 40,
    default_ap_factor: 0.5,
    default_vc_mult: 1.0,
    suitable_features: ["circular_boss", "bore", "hole"],
    recommended_tool_types: ["flat_end_mill", "bull_nose"],
    min_axes: 3,
    description: "Circular pocket or boss milling using helical or spiral motion for accurate bores",
  },
  {
    name: "FBM_mill",
    category: "2d",
    default_ae_pct: 60,
    default_ap_factor: 0.5,
    default_vc_mult: 1.0,
    suitable_features: ["pocket", "contour", "hole", "slot", "face"],
    recommended_tool_types: ["flat_end_mill", "drill", "face_mill"],
    min_axes: 3,
    description: "Feature-Based Machining: automatic feature detection and operation assignment from solid model",
  },
  // ── 3D ────────────────────────────────────────────────────────────────────
  {
    name: "surface_rough",
    category: "3d",
    default_ae_pct: 50,
    default_ap_factor: 1.0,
    default_vc_mult: 1.0,
    suitable_features: ["freeform_3d", "pocket"],
    recommended_tool_types: ["flat_end_mill", "bull_nose"],
    min_axes: 3,
    description: "3D surface roughing with raster, offset, or plunge patterns; stock aware",
  },
  {
    name: "surface_finish_parallel",
    category: "3d",
    default_ae_pct: 8,
    default_ap_factor: 0.1,
    default_vc_mult: 1.2,
    suitable_features: ["freeform_3d", "flat_area"],
    recommended_tool_types: ["ball_end_mill", "bull_nose"],
    min_axes: 3,
    description: "Parallel lace finishing passes at defined stepover; best for shallow/flat freeform",
  },
  {
    name: "surface_finish_waterline",
    category: "3d",
    default_ae_pct: 6,
    default_ap_factor: 0.1,
    default_vc_mult: 1.2,
    suitable_features: ["steep_wall", "freeform_3d"],
    recommended_tool_types: ["ball_end_mill", "bull_nose"],
    min_axes: 3,
    description: "Z-level (waterline) finishing for steep walls; constant Z passes with uniform stepdown",
  },
  {
    name: "surface_finish_scallop",
    category: "3d",
    default_ae_pct: 6,
    default_ap_factor: 0.1,
    default_vc_mult: 1.2,
    suitable_features: ["freeform_3d", "steep_wall", "flat_area"],
    recommended_tool_types: ["ball_end_mill"],
    min_axes: 3,
    description: "Scallop finishing with constant cusp height across mixed steep and shallow regions",
  },
  {
    name: "surface_finish_pencil",
    category: "3d",
    default_ae_pct: 3,
    default_ap_factor: 0.05,
    default_vc_mult: 1.1,
    suitable_features: ["groove", "freeform_3d", "contour"],
    recommended_tool_types: ["ball_end_mill"],
    min_axes: 3,
    description: "Pencil tracing for concave fillets and corners; single-pass cleanup after area finishing",
  },
  {
    name: "surface_finish_blend",
    category: "3d",
    default_ae_pct: 6,
    default_ap_factor: 0.1,
    default_vc_mult: 1.1,
    suitable_features: ["freeform_3d", "ruled_surface"],
    recommended_tool_types: ["ball_end_mill", "bull_nose"],
    min_axes: 3,
    description: "Blend finishing between two drive curves for smooth morphed-surface toolpaths",
  },
  {
    name: "rest_rough",
    category: "3d",
    default_ae_pct: 35,
    default_ap_factor: 0.8,
    default_vc_mult: 0.9,
    suitable_features: ["freeform_3d", "pocket", "groove"],
    recommended_tool_types: ["ball_end_mill", "bull_nose"],
    min_axes: 3,
    description: "Rest roughing removing material left by larger tools using reference tool stock model",
  },
  // ── Drilling ──────────────────────────────────────────────────────────────
  {
    name: "drill",
    category: "drilling",
    default_ae_pct: 100,
    default_ap_factor: 3.0,
    default_vc_mult: 1.0,
    suitable_features: ["hole", "bore"],
    recommended_tool_types: ["drill"],
    min_axes: 3,
    description: "Standard drilling with G81 single-pass canned cycle; feeds/speeds auto-calculated",
  },
  {
    name: "peck_drill",
    category: "drilling",
    default_ae_pct: 100,
    default_ap_factor: 5.0,
    default_vc_mult: 0.9,
    suitable_features: ["hole"],
    recommended_tool_types: ["drill"],
    min_axes: 3,
    description: "Peck drilling (G83) with full retract between pecks for deep holes and chip evacuation",
  },
  {
    name: "chip_break",
    category: "drilling",
    default_ae_pct: 100,
    default_ap_factor: 5.0,
    default_vc_mult: 0.95,
    suitable_features: ["hole"],
    recommended_tool_types: ["drill"],
    min_axes: 3,
    description: "Chip-breaking drill (G73) with partial retract; faster than peck for ductile materials",
  },
  {
    name: "tap",
    category: "drilling",
    default_ae_pct: 100,
    default_ap_factor: 2.0,
    default_vc_mult: 0.5,
    suitable_features: ["thread"],
    recommended_tool_types: ["tap"],
    min_axes: 3,
    description: "Rigid or floating tapping cycle with synchronized spindle feed; pitch-controlled",
  },
  {
    name: "bore",
    category: "drilling",
    default_ae_pct: 100,
    default_ap_factor: 3.0,
    default_vc_mult: 0.8,
    suitable_features: ["bore", "hole"],
    recommended_tool_types: ["boring_bar"],
    min_axes: 3,
    description: "Fine boring with single-point boring bar for H7/H8 tolerances; oriented stop",
  },
  {
    name: "ream",
    category: "drilling",
    default_ae_pct: 100,
    default_ap_factor: 3.0,
    default_vc_mult: 0.5,
    suitable_features: ["hole", "bore"],
    recommended_tool_types: ["reamer"],
    min_axes: 3,
    description: "Reaming cycle for precision holes at reduced feed and speed; light stock removal",
  },
  // ── Turning ───────────────────────────────────────────────────────────────
  {
    name: "rough",
    category: "turning",
    default_ae_pct: 100,
    default_ap_factor: 1.5,
    default_vc_mult: 1.0,
    suitable_features: ["turning_external", "turning_internal"],
    recommended_tool_types: ["turning_insert"],
    min_axes: 3,
    description: "Rough turning with multiple passes and stock-to-leave; canned G71/G72 cycles",
  },
  {
    name: "finish",
    category: "turning",
    default_ae_pct: 100,
    default_ap_factor: 0.3,
    default_vc_mult: 1.2,
    suitable_features: ["turning_external", "turning_internal"],
    recommended_tool_types: ["turning_insert"],
    min_axes: 3,
    description: "Finish turning to final dimension with nose radius compensation; Ra-controlled",
  },
  {
    name: "groove",
    category: "turning",
    default_ae_pct: 100,
    default_ap_factor: 1.0,
    default_vc_mult: 0.7,
    suitable_features: ["groove"],
    recommended_tool_types: ["groove_insert"],
    min_axes: 3,
    description: "Grooving with plunge-and-step or oscillating motion; OD, ID, and face grooves",
  },
  {
    name: "thread",
    category: "turning",
    default_ae_pct: 100,
    default_ap_factor: 0.1,
    default_vc_mult: 0.6,
    suitable_features: ["thread"],
    recommended_tool_types: ["thread_insert"],
    min_axes: 3,
    description: "Thread turning with G76 multiple-pass cycle; inch/metric, tapered, multi-start",
  },
  {
    name: "cutoff",
    category: "turning",
    default_ae_pct: 100,
    default_ap_factor: 1.0,
    default_vc_mult: 0.6,
    suitable_features: ["turning_external"],
    recommended_tool_types: ["cutoff_insert"],
    min_axes: 3,
    description: "Part cutoff/parting operation with progressive feed reduction near center",
  },
];

class MastercamOperationCatalogEngineImpl extends BaseCAMOperationCatalogEngine {
  protected readonly operations = MASTERCAM_OPERATIONS;
  constructor() { super("Mastercam"); }
}

export const mastercamOperationCatalogEngine = new MastercamOperationCatalogEngineImpl();

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SOLIDCAM OPERATION CATALOG ENGINE — 25 Operations
// ═══════════════════════════════════════════════════════════════════════════════

const SOLIDCAM_OPERATIONS: CATOperation[] = [
  // ── iMachining ────────────────────────────────────────────────────────────
  {
    name: "imachining_2d",
    category: "imachining",
    default_ae_pct: 8,
    default_ap_factor: 2.0,
    default_vc_mult: 1.4,
    suitable_features: ["pocket", "contour", "slot", "face"],
    recommended_tool_types: ["flat_end_mill"],
    min_axes: 3,
    description: "iMachining 2D with wizard-driven trochoidal paths; constant chip load, 40-60% cycle time reduction",
  },
  {
    name: "imachining_3d",
    category: "imachining",
    default_ae_pct: 8,
    default_ap_factor: 2.0,
    default_vc_mult: 1.35,
    suitable_features: ["freeform_3d", "pocket", "steep_wall"],
    recommended_tool_types: ["flat_end_mill", "bull_nose"],
    min_axes: 3,
    description: "iMachining 3D trochoidal roughing on complex 3D surfaces with constant engagement",
  },
  {
    name: "irest",
    category: "imachining",
    default_ae_pct: 6,
    default_ap_factor: 1.5,
    default_vc_mult: 1.2,
    suitable_features: ["pocket", "groove", "freeform_3d"],
    recommended_tool_types: ["flat_end_mill", "ball_end_mill"],
    min_axes: 3,
    description: "iRest: iMachining-style rest milling targeting material left after larger tool passes",
  },
  // ── HSR (High Speed Roughing) ─────────────────────────────────────────────
  {
    name: "hatch",
    category: "hsr",
    default_ae_pct: 60,
    default_ap_factor: 0.8,
    default_vc_mult: 1.0,
    suitable_features: ["freeform_3d", "pocket", "face"],
    recommended_tool_types: ["flat_end_mill", "bull_nose"],
    min_axes: 3,
    description: "HSR Hatch: bi-directional raster roughing with constant Z passes and stock model",
  },
  {
    name: "contour",
    category: "hsr",
    default_ae_pct: 50,
    default_ap_factor: 0.7,
    default_vc_mult: 1.0,
    suitable_features: ["freeform_3d", "steep_wall", "pocket"],
    recommended_tool_types: ["flat_end_mill", "bull_nose"],
    min_axes: 3,
    description: "HSR Contour: constant-Z offset roughing following part boundary at each Z level",
  },
  {
    name: "rest",
    category: "hsr",
    default_ae_pct: 35,
    default_ap_factor: 0.6,
    default_vc_mult: 0.9,
    suitable_features: ["freeform_3d", "groove", "pocket"],
    recommended_tool_types: ["ball_end_mill", "bull_nose"],
    min_axes: 3,
    description: "HSR Rest: SolidCAM rest-roughing using previous tool stock awareness",
  },
  {
    name: "hybrid_rib",
    category: "hsr",
    default_ae_pct: 40,
    default_ap_factor: 0.6,
    default_vc_mult: 1.0,
    suitable_features: ["rib", "thin_wall", "freeform_3d"],
    recommended_tool_types: ["flat_end_mill", "bull_nose"],
    min_axes: 3,
    description: "HSR Hybrid Rib: specialized roughing for thin-rib and core/cavity geometry",
  },
  // ── HSS (High Speed Surface Finishing) ────────────────────────────────────
  {
    name: "linear",
    category: "hss",
    default_ae_pct: 8,
    default_ap_factor: 0.1,
    default_vc_mult: 1.2,
    suitable_features: ["freeform_3d", "flat_area"],
    recommended_tool_types: ["ball_end_mill", "bull_nose"],
    min_axes: 3,
    description: "HSS Linear: parallel raster finishing with constant stepover across full surface",
  },
  {
    name: "radial",
    category: "hss",
    default_ae_pct: 8,
    default_ap_factor: 0.1,
    default_vc_mult: 1.2,
    suitable_features: ["freeform_3d", "circular_boss"],
    recommended_tool_types: ["ball_end_mill"],
    min_axes: 3,
    description: "HSS Radial: spider-web finishing paths radiating from center; round/circular surfaces",
  },
  {
    name: "spiral",
    category: "hss",
    default_ae_pct: 8,
    default_ap_factor: 0.1,
    default_vc_mult: 1.2,
    suitable_features: ["freeform_3d", "circular_boss", "flat_area"],
    recommended_tool_types: ["ball_end_mill"],
    min_axes: 3,
    description: "HSS Spiral: constant-Z spiral finishing inward or outward; smooth surface quality",
  },
  {
    name: "morphed",
    category: "hss",
    default_ae_pct: 7,
    default_ap_factor: 0.1,
    default_vc_mult: 1.15,
    suitable_features: ["freeform_3d", "ruled_surface"],
    recommended_tool_types: ["ball_end_mill", "bull_nose"],
    min_axes: 3,
    description: "HSS Morphed: boundary-driven paths morphing between two drive curves; flow-following",
  },
  {
    name: "constant_z",
    category: "hss",
    default_ae_pct: 6,
    default_ap_factor: 0.08,
    default_vc_mult: 1.2,
    suitable_features: ["steep_wall", "freeform_3d"],
    recommended_tool_types: ["ball_end_mill", "bull_nose"],
    min_axes: 3,
    description: "HSS Constant-Z: waterline finishing at equal Z-level increments for steep walls",
  },
  {
    name: "helical",
    category: "hss",
    default_ae_pct: 7,
    default_ap_factor: 0.1,
    default_vc_mult: 1.2,
    suitable_features: ["bore", "circular_boss", "freeform_3d"],
    recommended_tool_types: ["ball_end_mill"],
    min_axes: 3,
    description: "HSS Helical: continuous helical finishing path wrapping around cylindrical/bowl shapes",
  },
  {
    name: "horizontal",
    category: "hss",
    default_ae_pct: 8,
    default_ap_factor: 0.15,
    default_vc_mult: 1.1,
    suitable_features: ["flat_area", "freeform_3d"],
    recommended_tool_types: ["flat_end_mill", "bull_nose"],
    min_axes: 3,
    description: "HSS Horizontal: flat-area detection with optimal passes to minimize scallop height",
  },
  {
    name: "pencil",
    category: "hss",
    default_ae_pct: 3,
    default_ap_factor: 0.05,
    default_vc_mult: 1.0,
    suitable_features: ["groove", "freeform_3d", "contour"],
    recommended_tool_types: ["ball_end_mill"],
    min_axes: 3,
    description: "HSS Pencil: concave-region cleanup tracing with smallest effective ball tool radius",
  },
  // ── 2.5D ─────────────────────────────────────────────────────────────────
  {
    name: "pocket",
    category: "2d",
    default_ae_pct: 65,
    default_ap_factor: 0.5,
    default_vc_mult: 1.0,
    suitable_features: ["pocket", "face", "slot"],
    recommended_tool_types: ["flat_end_mill"],
    min_axes: 3,
    description: "SolidCAM 2.5D pocket with open/closed pockets; offset or zigzag clearing pattern",
  },
  {
    name: "profile",
    category: "2d",
    default_ae_pct: 100,
    default_ap_factor: 0.5,
    default_vc_mult: 1.0,
    suitable_features: ["contour", "pocket", "slot"],
    recommended_tool_types: ["flat_end_mill", "bull_nose"],
    min_axes: 3,
    description: "SolidCAM 2.5D profile (contour) milling with compensation side and finishing allowance",
  },
  {
    name: "face",
    category: "2d",
    default_ae_pct: 70,
    default_ap_factor: 0.25,
    default_vc_mult: 1.1,
    suitable_features: ["face", "flat_area"],
    recommended_tool_types: ["face_mill"],
    min_axes: 3,
    description: "SolidCAM 2.5D face milling with efficient zig-zag or unidirectional passes",
  },
  {
    name: "slot",
    category: "2d",
    default_ae_pct: 100,
    default_ap_factor: 0.5,
    default_vc_mult: 0.85,
    suitable_features: ["slot", "groove"],
    recommended_tool_types: ["flat_end_mill"],
    min_axes: 3,
    description: "SolidCAM 2.5D slot milling with helical entry and multiple depth passes",
  },
  {
    name: "thread_mill",
    category: "2d",
    default_ae_pct: 100,
    default_ap_factor: 0.1,
    default_vc_mult: 0.8,
    suitable_features: ["thread", "hole"],
    recommended_tool_types: ["thread_mill"],
    min_axes: 3,
    description: "Thread milling with helical interpolation; single-point or full-form thread mills",
  },
  {
    name: "chamfer",
    category: "2d",
    default_ae_pct: 100,
    default_ap_factor: 0.15,
    default_vc_mult: 1.0,
    suitable_features: ["chamfer_edge", "contour"],
    recommended_tool_types: ["chamfer_mill"],
    min_axes: 3,
    description: "SolidCAM 2.5D chamfer operation driving chamfer tool along selected edges",
  },
  // ── Drilling ──────────────────────────────────────────────────────────────
  {
    name: "drill",
    category: "drilling",
    default_ae_pct: 100,
    default_ap_factor: 3.0,
    default_vc_mult: 1.0,
    suitable_features: ["hole", "bore"],
    recommended_tool_types: ["drill", "tap", "reamer"],
    min_axes: 3,
    description: "SolidCAM drill operation supporting all drilling/boring/tapping canned cycles",
  },
  // ── 5-Axis ────────────────────────────────────────────────────────────────
  {
    name: "sim_5axis",
    category: "multi_axis",
    default_ae_pct: 8,
    default_ap_factor: 0.1,
    default_vc_mult: 1.1,
    suitable_features: ["freeform_3d", "impeller", "ruled_surface", "steep_wall"],
    recommended_tool_types: ["ball_end_mill", "bull_nose", "lollipop"],
    min_axes: 5,
    description: "SolidCAM Simultaneous 5-Axis: continuous 5-axis motion for complex freeform surfaces",
  },
  {
    name: "swarf",
    category: "multi_axis",
    default_ae_pct: 100,
    default_ap_factor: 1.0,
    default_vc_mult: 1.15,
    suitable_features: ["ruled_surface", "thin_wall", "impeller"],
    recommended_tool_types: ["flat_end_mill", "bull_nose"],
    min_axes: 5,
    description: "SolidCAM Swarf milling: tool flank contacts ruled surface for excellent finish",
  },
  // Placeholders to reach 25
  {
    name: "irest_3d",
    category: "imachining",
    default_ae_pct: 6,
    default_ap_factor: 1.0,
    default_vc_mult: 1.1,
    suitable_features: ["freeform_3d", "groove"],
    recommended_tool_types: ["ball_end_mill"],
    min_axes: 3,
    description: "iRest 3D: rest milling on complex 3D surfaces using iMachining technology",
  },
  {
    name: "turning",
    category: "turning",
    default_ae_pct: 100,
    default_ap_factor: 1.0,
    default_vc_mult: 1.0,
    suitable_features: ["turning_external", "turning_internal", "groove", "thread"],
    recommended_tool_types: ["turning_insert", "groove_insert", "thread_insert"],
    min_axes: 3,
    description: "SolidCAM turning with full mill-turn support: roughing, finishing, grooving, threading",
  },
];

class SolidCAMOperationCatalogEngineImpl extends BaseCAMOperationCatalogEngine {
  protected readonly operations = SOLIDCAM_OPERATIONS;
  constructor() { super("SolidCAM"); }
}

export const solidCAMOperationCatalogEngine = new SolidCAMOperationCatalogEngineImpl();

// ═══════════════════════════════════════════════════════════════════════════════
// 3. NX CAM OPERATION CATALOG ENGINE — 20 Operations
// ═══════════════════════════════════════════════════════════════════════════════

const NXCAM_OPERATIONS: CATOperation[] = [
  // ── Milling ───────────────────────────────────────────────────────────────
  {
    name: "cavity_mill",
    category: "roughing",
    default_ae_pct: 60,
    default_ap_factor: 0.8,
    default_vc_mult: 1.0,
    suitable_features: ["pocket", "freeform_3d", "face"],
    recommended_tool_types: ["flat_end_mill", "bull_nose"],
    min_axes: 3,
    description: "NX Cavity Mill: 3D profile roughing with depth-first or level-first material removal",
  },
  {
    name: "adaptive_mill",
    category: "roughing",
    default_ae_pct: 10,
    default_ap_factor: 2.0,
    default_vc_mult: 1.4,
    suitable_features: ["pocket", "freeform_3d", "contour", "slot"],
    recommended_tool_types: ["flat_end_mill"],
    min_axes: 3,
    description: "NX Adaptive Milling: constant-engagement trochoidal roughing for HSM with deep axial cuts",
  },
  {
    name: "z_level",
    category: "finishing",
    default_ae_pct: 6,
    default_ap_factor: 0.1,
    default_vc_mult: 1.2,
    suitable_features: ["steep_wall", "freeform_3d"],
    recommended_tool_types: ["ball_end_mill", "bull_nose"],
    min_axes: 3,
    description: "NX Z-Level Milling: constant-Z finishing for steep and near-vertical walls",
  },
  {
    name: "face_mill",
    category: "2d",
    default_ae_pct: 70,
    default_ap_factor: 0.25,
    default_vc_mult: 1.1,
    suitable_features: ["face", "flat_area"],
    recommended_tool_types: ["face_mill"],
    min_axes: 3,
    description: "NX Face Milling: planar face operation with zig-zag, one-way, or follow-boundary patterns",
  },
  {
    name: "planar_mill",
    category: "2d",
    default_ae_pct: 55,
    default_ap_factor: 0.6,
    default_vc_mult: 1.0,
    suitable_features: ["pocket", "contour", "face", "slot"],
    recommended_tool_types: ["flat_end_mill", "bull_nose"],
    min_axes: 3,
    description: "NX Planar Milling: general 2.5D operation for prismatic parts; follow-part or follow-periphery",
  },
  {
    name: "contour_area",
    category: "finishing",
    default_ae_pct: 8,
    default_ap_factor: 0.1,
    default_vc_mult: 1.2,
    suitable_features: ["freeform_3d", "flat_area", "steep_wall"],
    recommended_tool_types: ["ball_end_mill", "bull_nose"],
    min_axes: 3,
    description: "NX Contour Area: region-based 3D finishing with area selection and steep/shallow split",
  },
  {
    name: "fixed_contour",
    category: "finishing",
    default_ae_pct: 7,
    default_ap_factor: 0.1,
    default_vc_mult: 1.2,
    suitable_features: ["freeform_3d", "flat_area"],
    recommended_tool_types: ["ball_end_mill", "bull_nose"],
    min_axes: 3,
    description: "NX Fixed-Axis Contour: 3-axis surface finishing with various drive methods (area, stream, surface)",
  },
  {
    name: "variable_contour",
    category: "multi_axis",
    default_ae_pct: 8,
    default_ap_factor: 0.1,
    default_vc_mult: 1.1,
    suitable_features: ["freeform_3d", "impeller", "ruled_surface"],
    recommended_tool_types: ["ball_end_mill", "bull_nose", "lollipop"],
    min_axes: 5,
    description: "NX Variable-Axis Contour: simultaneous 4/5-axis finishing with tool axis interpolation",
  },
  // ── Roughing ──────────────────────────────────────────────────────────────
  {
    name: "rest_mill",
    category: "roughing",
    default_ae_pct: 35,
    default_ap_factor: 0.6,
    default_vc_mult: 0.9,
    suitable_features: ["freeform_3d", "pocket", "groove"],
    recommended_tool_types: ["ball_end_mill", "bull_nose"],
    min_axes: 3,
    description: "NX Rest Milling: in-process stock-aware cleanup targeting previous-tool remainder material",
  },
  {
    name: "plunge_mill",
    category: "roughing",
    default_ae_pct: 40,
    default_ap_factor: 3.0,
    default_vc_mult: 0.8,
    suitable_features: ["pocket", "freeform_3d"],
    recommended_tool_types: ["flat_end_mill"],
    min_axes: 3,
    description: "NX Plunge Milling: Z-axis plunging passes for deep cavities; reduces side forces",
  },
  // ── Finishing ─────────────────────────────────────────────────────────────
  {
    name: "flow_cut",
    category: "finishing",
    default_ae_pct: 5,
    default_ap_factor: 0.05,
    default_vc_mult: 1.1,
    suitable_features: ["groove", "freeform_3d", "contour"],
    recommended_tool_types: ["ball_end_mill"],
    min_axes: 3,
    description: "NX Flow Cut: multiple-pass cleanup in steep concave areas; pencil-style corner finishing",
  },
  {
    name: "streamline",
    category: "finishing",
    default_ae_pct: 7,
    default_ap_factor: 0.1,
    default_vc_mult: 1.15,
    suitable_features: ["freeform_3d", "ruled_surface", "impeller"],
    recommended_tool_types: ["ball_end_mill", "bull_nose"],
    min_axes: 3,
    description: "NX Streamline: flow-following finishing paths aligned to surface isoparametric curves",
  },
  // ── Hole ─────────────────────────────────────────────────────────────────
  {
    name: "drill",
    category: "drilling",
    default_ae_pct: 100,
    default_ap_factor: 3.0,
    default_vc_mult: 1.0,
    suitable_features: ["hole", "bore"],
    recommended_tool_types: ["drill"],
    min_axes: 3,
    description: "NX Drill: parametric drilling cycle with peck, chip-break, boring, and reaming variants",
  },
  {
    name: "tap",
    category: "drilling",
    default_ae_pct: 100,
    default_ap_factor: 2.0,
    default_vc_mult: 0.5,
    suitable_features: ["thread"],
    recommended_tool_types: ["tap"],
    min_axes: 3,
    description: "NX Tapping: rigid or floating tap with pitch-synchronized spindle speed",
  },
  {
    name: "ream",
    category: "drilling",
    default_ae_pct: 100,
    default_ap_factor: 3.0,
    default_vc_mult: 0.45,
    suitable_features: ["hole", "bore"],
    recommended_tool_types: ["reamer"],
    min_axes: 3,
    description: "NX Reaming: precision hole finishing at reduced feed with reamer geometry",
  },
  {
    name: "bore",
    category: "drilling",
    default_ae_pct: 100,
    default_ap_factor: 3.0,
    default_vc_mult: 0.7,
    suitable_features: ["bore", "hole"],
    recommended_tool_types: ["boring_bar"],
    min_axes: 3,
    description: "NX Boring: single-point bore with oriented stop for precise diameter and position",
  },
  {
    name: "thread_mill",
    category: "drilling",
    default_ae_pct: 100,
    default_ap_factor: 0.1,
    default_vc_mult: 0.75,
    suitable_features: ["thread", "hole"],
    recommended_tool_types: ["thread_mill"],
    min_axes: 3,
    description: "NX Thread Milling: helical interpolated thread milling for large or hard-to-tap threads",
  },
  // ── Multi-axis ────────────────────────────────────────────────────────────
  {
    name: "multi_axis_contour",
    category: "multi_axis",
    default_ae_pct: 8,
    default_ap_factor: 0.1,
    default_vc_mult: 1.1,
    suitable_features: ["freeform_3d", "impeller", "ruled_surface", "steep_wall"],
    recommended_tool_types: ["ball_end_mill", "bull_nose", "lollipop"],
    min_axes: 5,
    description: "NX Multi-Axis Contour: general simultaneous 5-axis with extensive tool-axis controls",
  },
  {
    name: "swarf",
    category: "multi_axis",
    default_ae_pct: 100,
    default_ap_factor: 1.0,
    default_vc_mult: 1.15,
    suitable_features: ["ruled_surface", "thin_wall", "impeller"],
    recommended_tool_types: ["flat_end_mill", "bull_nose"],
    min_axes: 5,
    description: "NX Swarf Drive: tool peripheral tangent to ruled surface for single-pass wall finishing",
  },
  {
    name: "blade_mill",
    category: "multi_axis",
    default_ae_pct: 10,
    default_ap_factor: 0.15,
    default_vc_mult: 1.0,
    suitable_features: ["impeller", "ruled_surface", "freeform_3d"],
    recommended_tool_types: ["ball_end_mill", "bull_nose"],
    min_axes: 5,
    description: "NX Blade/Impeller Milling: dedicated high-efficiency 5-axis for turbine and impeller blades",
  },
];

class NXCAMOperationCatalogEngineImpl extends BaseCAMOperationCatalogEngine {
  protected readonly operations = NXCAM_OPERATIONS;
  constructor() { super("NX CAM"); }
}

export const nxCAMOperationCatalogEngine = new NXCAMOperationCatalogEngineImpl();

// ═══════════════════════════════════════════════════════════════════════════════
// 4. POWERMILL OPERATION CATALOG ENGINE — 18 Operations
// ═══════════════════════════════════════════════════════════════════════════════

const POWERMILL_OPERATIONS: CATOperation[] = [
  // ── Roughing ──────────────────────────────────────────────────────────────
  {
    name: "vortex",
    category: "roughing",
    default_ae_pct: 8,
    default_ap_factor: 2.5,
    default_vc_mult: 1.5,
    suitable_features: ["pocket", "freeform_3d", "contour", "slot"],
    recommended_tool_types: ["flat_end_mill"],
    min_axes: 3,
    description: "PowerMill Vortex: Delcam-patent constant-engagement trochoidal HSM roughing; max MRR with controlled tool load",
  },
  {
    name: "model_area_clear",
    category: "roughing",
    default_ae_pct: 55,
    default_ap_factor: 0.8,
    default_vc_mult: 1.0,
    suitable_features: ["freeform_3d", "pocket", "face"],
    recommended_tool_types: ["flat_end_mill", "bull_nose"],
    min_axes: 3,
    description: "PowerMill Model Area Clearance: 3D offset roughing following model boundary at each Z level",
  },
  {
    name: "plunge_rough",
    category: "roughing",
    default_ae_pct: 35,
    default_ap_factor: 3.0,
    default_vc_mult: 0.8,
    suitable_features: ["pocket", "freeform_3d"],
    recommended_tool_types: ["flat_end_mill", "drill"],
    min_axes: 3,
    description: "PowerMill Plunge Roughing: Z-axis plunge passes reducing radial forces in deep cavities",
  },
  {
    name: "rest_rough",
    category: "roughing",
    default_ae_pct: 35,
    default_ap_factor: 0.7,
    default_vc_mult: 0.9,
    suitable_features: ["freeform_3d", "pocket", "groove"],
    recommended_tool_types: ["ball_end_mill", "bull_nose"],
    min_axes: 3,
    description: "PowerMill Rest Roughing: area clearance on material remaining after primary roughing tool",
  },
  // ── Finishing ─────────────────────────────────────────────────────────────
  {
    name: "raster",
    category: "finishing",
    default_ae_pct: 8,
    default_ap_factor: 0.1,
    default_vc_mult: 1.2,
    suitable_features: ["freeform_3d", "flat_area"],
    recommended_tool_types: ["ball_end_mill", "bull_nose"],
    min_axes: 3,
    description: "PowerMill Raster Finishing: parallel lace passes at constant stepover; simple and robust",
  },
  {
    name: "offset_3d",
    category: "finishing",
    default_ae_pct: 8,
    default_ap_factor: 0.1,
    default_vc_mult: 1.2,
    suitable_features: ["freeform_3d", "steep_wall", "flat_area"],
    recommended_tool_types: ["ball_end_mill", "bull_nose"],
    min_axes: 3,
    description: "PowerMill 3D Offset: equidistant passes following model shape outward; uniform scallop",
  },
  {
    name: "constant_z",
    category: "finishing",
    default_ae_pct: 6,
    default_ap_factor: 0.08,
    default_vc_mult: 1.2,
    suitable_features: ["steep_wall", "freeform_3d"],
    recommended_tool_types: ["ball_end_mill", "bull_nose"],
    min_axes: 3,
    description: "PowerMill Constant-Z: waterline finishing at constant Z increments; ideal for steep walls",
  },
  {
    name: "steep_shallow",
    category: "finishing",
    default_ae_pct: 7,
    default_ap_factor: 0.1,
    default_vc_mult: 1.2,
    suitable_features: ["freeform_3d", "steep_wall", "flat_area"],
    recommended_tool_types: ["ball_end_mill"],
    min_axes: 3,
    description: "PowerMill Steep & Shallow: hybrid strategy auto-splits steep (Z-level) and shallow (raster) regions",
  },
  {
    name: "pencil",
    category: "finishing",
    default_ae_pct: 3,
    default_ap_factor: 0.05,
    default_vc_mult: 1.0,
    suitable_features: ["groove", "freeform_3d", "contour"],
    recommended_tool_types: ["ball_end_mill"],
    min_axes: 3,
    description: "PowerMill Pencil Milling: concave corner and fillet cleanup; 1-pass per concave feature",
  },
  {
    name: "flowline",
    category: "finishing",
    default_ae_pct: 7,
    default_ap_factor: 0.1,
    default_vc_mult: 1.15,
    suitable_features: ["freeform_3d", "ruled_surface", "impeller"],
    recommended_tool_types: ["ball_end_mill", "bull_nose"],
    min_axes: 3,
    description: "PowerMill Flowline: surface-following paths aligned to U/V parametric directions; excellent for blends",
  },
  {
    name: "rib",
    category: "finishing",
    default_ae_pct: 100,
    default_ap_factor: 0.3,
    default_vc_mult: 1.0,
    suitable_features: ["rib", "thin_wall", "contour"],
    recommended_tool_types: ["flat_end_mill", "bull_nose"],
    min_axes: 3,
    description: "PowerMill Rib Finishing: side-finish passes along thin-rib geometry with deflection awareness",
  },
  {
    name: "stitch_corner",
    category: "finishing",
    default_ae_pct: 4,
    default_ap_factor: 0.05,
    default_vc_mult: 1.0,
    suitable_features: ["groove", "contour", "freeform_3d"],
    recommended_tool_types: ["ball_end_mill"],
    min_axes: 3,
    description: "PowerMill Corner Stitching: connects pencil passes through corners for full corner coverage",
  },
  {
    name: "race_line",
    category: "finishing",
    default_ae_pct: 8,
    default_ap_factor: 0.1,
    default_vc_mult: 1.3,
    suitable_features: ["freeform_3d", "flat_area", "steep_wall"],
    recommended_tool_types: ["ball_end_mill", "bull_nose"],
    min_axes: 3,
    description: "PowerMill Race Line: optimal-path finishing minimizing direction changes for HSM machines",
  },
  {
    name: "swarf",
    category: "finishing",
    default_ae_pct: 100,
    default_ap_factor: 1.0,
    default_vc_mult: 1.15,
    suitable_features: ["ruled_surface", "thin_wall", "impeller"],
    recommended_tool_types: ["flat_end_mill", "bull_nose"],
    min_axes: 5,
    description: "PowerMill Swarf Machining: tool flank tangent to ruled surface for premium wall finish",
  },
  // ── Drilling ──────────────────────────────────────────────────────────────
  {
    name: "drill",
    category: "drilling",
    default_ae_pct: 100,
    default_ap_factor: 3.0,
    default_vc_mult: 1.0,
    suitable_features: ["hole", "bore"],
    recommended_tool_types: ["drill", "tap", "reamer"],
    min_axes: 3,
    description: "PowerMill Drilling: feature-based drilling with all standard cycle types; pattern recognition",
  },
  // ── Multi-axis ────────────────────────────────────────────────────────────
  {
    name: "5axis_contour",
    category: "multi_axis",
    default_ae_pct: 8,
    default_ap_factor: 0.1,
    default_vc_mult: 1.1,
    suitable_features: ["freeform_3d", "impeller", "ruled_surface", "steep_wall"],
    recommended_tool_types: ["ball_end_mill", "bull_nose", "lollipop"],
    min_axes: 5,
    description: "PowerMill 5-Axis Contour: simultaneous 5-axis with lead/lag and side-tilt control",
  },
  {
    name: "3plus2",
    category: "multi_axis",
    default_ae_pct: 55,
    default_ap_factor: 0.6,
    default_vc_mult: 1.05,
    suitable_features: ["freeform_3d", "pocket", "contour", "hole"],
    recommended_tool_types: ["flat_end_mill", "ball_end_mill", "drill"],
    min_axes: 4,
    description: "PowerMill 3+2: positional 5-axis (indexed) with the full 3-axis strategy set applied at each orientation",
  },
  {
    name: "blade_expert",
    category: "multi_axis",
    default_ae_pct: 10,
    default_ap_factor: 0.15,
    default_vc_mult: 1.0,
    suitable_features: ["impeller", "ruled_surface", "freeform_3d"],
    recommended_tool_types: ["ball_end_mill", "bull_nose"],
    min_axes: 5,
    description: "PowerMill Blade Expert: dedicated 5-axis module for impeller, blisk, and bladed-disc machining",
  },
];

class PowerMillOperationCatalogEngineImpl extends BaseCAMOperationCatalogEngine {
  protected readonly operations = POWERMILL_OPERATIONS;
  constructor() { super("PowerMill"); }
}

export const powerMillOperationCatalogEngine = new PowerMillOperationCatalogEngineImpl();
