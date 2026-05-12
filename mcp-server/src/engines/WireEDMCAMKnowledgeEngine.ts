/**
 * WireEDMCAMKnowledgeEngine
 *
 * Mastercam Wire EDM CAM knowledge extracted from official tutorials.
 * Integrates toolpath strategies, pass progressions, synchronization modes,
 * and cutting parameters with PRISM's deep AI Wire EDM systems.
 *
 * Knowledge Sources:
 * - Mastercam Wire Tutorial (June 2018)
 * - CNC Software Inc. official documentation
 * - Makino TECH library patterns
 *
 * @module engines/WireEDMCAMKnowledgeEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Wire EDM toolpath type classification
 */
export type WireEDMToolpathType =
  | "single_contour"     // Same shape top/bottom - 2-axis
  | "multiple_contour"   // Multiple parts from single stock
  | "no_core"            // Material removal without slugs
  | "four_axis";         // Different XY/UV geometry (tapered)

/**
 * 4-axis synchronization method for matching XY/UV chains
 */
export type SyncMode =
  | "by_entity"          // Match endpoint of each entity (same entity count required)
  | "by_branch"          // Match by branch points (needs 3D connecting geometry)
  | "by_point"           // Match previously created point entities
  | "by_node"            // Match parametric splines by node points
  | "manual"             // User-defined area matching
  | "manual_density";    // Manual with density control for small radii

/**
 * No-core cutting method patterns
 */
export type NoCoreMethod =
  | "parallel_spiral"    // Default - good for slots
  | "zigzag"             // Alternating direction
  | "spiral_in"          // Outside to center
  | "spiral_out"         // Center to outside
  | "one_way"            // Single direction
  | "adaptive";          // Shape-following

/**
 * Lead in/out geometry type
 */
export type LeadType =
  | "line_only"
  | "line_and_arc"       // Preferred - reduces burrs
  | "two_lines_and_arc"
  | "arc_only"
  | "arc_and_line"
  | "arc_and_two_lines";

/**
 * Cutting direction method
 */
export type CuttingMethod =
  | "one_way"            // Re-thread wire at end of each pass
  | "reverse";           // Wire travels back (more efficient)

/**
 * Compensation output mode
 */
export type CompensationType =
  | "computer"           // CAM calculates compensated path
  | "control"            // G41/G42 output for machine compensation
  | "both"               // Combined
  | "reverse_both"       // Reversed for special cases
  | "off";               // No compensation

/**
 * Pass definition with power library values
 */
export interface PassDefinition {
  pass_number: number;
  pass_type: "rough" | "tab" | "skim";
  wire_diameter_mm: number;
  wire_overburn_mm: number;
  offset_code?: number;
  power_code?: string;
  feed_mmpm?: number;
  description: string;
}

/**
 * Lead geometry configuration
 */
export interface LeadConfig {
  lead_type: LeadType;
  arc_radius_mm: number;
  arc_sweep_deg: number;
  line_length_mm?: number;
  overlap_mm: number;
  max_lead_out_mm?: number;
  trim_final_lead_out: boolean;
}

/**
 * Tab configuration for holding workpiece
 */
export interface TabConfig {
  enabled: boolean;
  width_mm: number;
  count: number;
  position: "start" | "midpoint" | "end" | "automatic";
  make_tab_cutoff_with_skim: boolean;
  skim_cuts_after_tab: boolean;
}

/**
 * Glue stop configuration
 */
export interface GlueStopConfig {
  enabled: boolean;
  output_as_glue_stop: boolean;  // M01 optional stop
  before_tab: boolean;
  after_tab: boolean;
  for_each_tab: boolean;
  for_first_tab_only: boolean;
}

/**
 * Height plane configuration
 */
export interface HeightConfig {
  rapid_height_mm: number;     // Z height of upper wire guide for rapids
  uv_trim_plane_mm: number;    // Upper wire guide position
  uv_height_mm: number;        // Upper contour plane
  xy_height_mm: number;        // Lower contour plane (typically Z=0)
  use_absolute: boolean;
}

/**
 * Chaining options for geometry selection
 */
export interface ChainingOptions {
  break_closest_entity_to_thread_point: boolean;  // Perpendicular approach
  start_chain_at_point: boolean;
  closed_chains_only: boolean;
  open_chains_allowed: boolean;
  sync_mode: SyncMode;
  chaining_tolerance_mm: number;
}

/**
 * TECH library entry (Makino-specific)
 */
export interface TechLibraryEntry {
  finish_ra_code: string;       // e.g., "12~13"
  sequence: string;             // e.g., "Rough & 2 skim(s)"
  passes: PassDefinition[];
  material_type: string;
  thickness_range_mm: [number, number];
  wire_type: string;
}

/**
 * Complete wirepath configuration
 */
export interface WirepathConfig {
  toolpath_type: WireEDMToolpathType;
  passes: PassDefinition[];
  leads: {
    entry: LeadConfig;
    exit: LeadConfig;
  };
  tabs: TabConfig;
  glue_stops: GlueStopConfig;
  heights: HeightConfig;
  compensation: {
    type: CompensationType;
    direction: "left" | "right" | "auto";
  };
  cutting_method: CuttingMethod;
  chaining: ChainingOptions;
}

/**
 * Toolpath recommendation based on part analysis
 */
export interface ToolpathRecommendation {
  toolpath_type: WireEDMToolpathType;
  reason: string;
  suggested_config: Partial<WirepathConfig>;
  confidence: number;
  alternatives: Array<{
    type: WireEDMToolpathType;
    when_to_use: string;
  }>;
}

/**
 * CAM system knowledge record
 */
export interface CAMKnowledgeRecord {
  topic: string;
  category: "toolpath" | "parameter" | "workflow" | "optimization" | "safety";
  knowledge: string;
  source: string;
  confidence: number;
  applies_to: string[];
}

// ============================================================================
// KNOWLEDGE DATABASE
// ============================================================================

/**
 * Mastercam Wire EDM knowledge database
 */
const MASTERCAM_WIRE_KNOWLEDGE: CAMKnowledgeRecord[] = [
  // TOOLPATH SELECTION
  {
    topic: "Single Contour Toolpath",
    category: "toolpath",
    knowledge: "Use single contour toolpath when top and bottom shapes are identical. Best for 2-axis parts with consistent cross-section.",
    source: "Mastercam Wire Tutorial p.7",
    confidence: 0.95,
    applies_to: ["gears", "simple_dies", "uniform_profiles"]
  },
  {
    topic: "Multiple Contour Toolpath",
    category: "toolpath",
    knowledge: "Use multiple contour toolpath to cut multiple parts from single stock in one operation. Select parts as group then sort chains for optimal cutting order.",
    source: "Mastercam Wire Tutorial p.23",
    confidence: 0.95,
    applies_to: ["batch_production", "nesting", "multiple_cavities"]
  },
  {
    topic: "No Core Toolpath",
    category: "toolpath",
    knowledge: "Use No Core toolpath to remove all material within boundary without producing slivers or slugs. Wire zigzags or spirals outward from thread point until all material is removed. All chains must be closed shapes.",
    source: "Mastercam Wire Tutorial p.33",
    confidence: 0.95,
    applies_to: ["pockets", "slots", "cavities", "material_removal"]
  },
  {
    topic: "4-Axis Toolpath",
    category: "toolpath",
    knowledge: "Use 4-axis toolpath when wire must be non-vertical. For parts with different XY and UV plane geometry, or same geometry in different orientation (tapered gears).",
    source: "Mastercam Wire Tutorial p.41",
    confidence: 0.95,
    applies_to: ["tapered_parts", "draft_angles", "variable_geometry"]
  },

  // PASS STRATEGY
  {
    topic: "Pass Progression Pattern",
    category: "parameter",
    knowledge: "Standard 4-pass progression: Rough (0.035mm overburn) → Skim1 (0.02mm) → Skim2 (0.01mm) → Final (0mm). Overburn decreases with each pass as less material is removed.",
    source: "Mastercam Wire Tutorial p.16",
    confidence: 0.95,
    applies_to: ["standard_steel", "tool_steel", "general_purpose"]
  },
  {
    topic: "Wire Overburn Calculation",
    category: "parameter",
    knowledge: "Wire overburn represents material removed beyond wire radius. Final pass at 0mm overburn puts wire exactly on geometry. Sum of wire_radius + overburn = total stock left after each pass.",
    source: "Mastercam Wire Tutorial p.13",
    confidence: 0.95,
    applies_to: ["all_materials"]
  },

  // LEADS
  {
    topic: "Lead In/Out Geometry",
    category: "parameter",
    knowledge: "Use Line-and-Arc lead in with Arc-and-Line lead out. Arc motion reduces burr formation at entry/exit. Typical: 0.125mm arc radius, 60° sweep. Overlap 0.02mm eliminates start/end witness marks.",
    source: "Mastercam Wire Tutorial p.18",
    confidence: 0.95,
    applies_to: ["precision_parts", "die_components"]
  },
  {
    topic: "Maximum Lead Out",
    category: "parameter",
    knowledge: "Enable Max Lead Out to shorten exit move instead of forcing wire to travel full distance from contour end to cut point. Reduces cycle time on large parts.",
    source: "Mastercam Wire Tutorial p.18",
    confidence: 0.90,
    applies_to: ["large_parts", "time_optimization"]
  },

  // TABS AND STOPS
  {
    topic: "Tab Strategy",
    category: "parameter",
    knowledge: "Tab keeps part attached to stock during cutting. Typical width 1-2mm. Enable 'Make tab cutoff with skim cut' for efficiency. Use 'Skim cuts after tab' to finish tab area.",
    source: "Mastercam Wire Tutorial p.16-17",
    confidence: 0.95,
    applies_to: ["all_contour_cuts"]
  },
  {
    topic: "Glue Stop Usage",
    category: "workflow",
    knowledge: "Glue stop outputs M01 optional stop before tab cut. Allows operator to secure part (with glue or clamp) to prevent dropout after tab cut. Select 'For each tab' for multiple contours.",
    source: "Mastercam Wire Tutorial p.17",
    confidence: 0.95,
    applies_to: ["heavy_parts", "precision_parts", "dropout_prevention"]
  },

  // CUTTING METHOD
  {
    topic: "Reverse Cutting Method",
    category: "optimization",
    knowledge: "Use Reverse cutting method instead of One Way. Wire travels back at end of each pass instead of re-threading. Significantly reduces cycle time on multi-pass operations.",
    source: "Mastercam Wire Tutorial p.16",
    confidence: 0.95,
    applies_to: ["multi_pass", "time_optimization"]
  },

  // 4-AXIS SYNC
  {
    topic: "Entity Sync Mode",
    category: "toolpath",
    knowledge: "By Entity sync matches endpoint of each entity between XY and UV chains. Both chains must have identical entity count. Use for geometrically similar top/bottom contours.",
    source: "Mastercam Wire Tutorial p.44",
    confidence: 0.95,
    applies_to: ["tapered_gears", "similar_geometry"]
  },
  {
    topic: "Branch Sync Mode",
    category: "toolpath",
    knowledge: "By Branch sync matches contours by branch points (where 3+ entity endpoints meet). Requires 3D geometry connecting upper and lower contours.",
    source: "Mastercam Wire Tutorial p.44",
    confidence: 0.90,
    applies_to: ["complex_3d_parts"]
  },

  // NO CORE
  {
    topic: "No Core Method Selection",
    category: "toolpath",
    knowledge: "Select No Core cutting method that follows part shape. Parallel Spiral works well for slots and elongated pockets. Enable Finish pass to smooth rough edges.",
    source: "Mastercam Wire Tutorial p.37",
    confidence: 0.95,
    applies_to: ["pockets", "slots"]
  },
  {
    topic: "No Core Finish Pass",
    category: "parameter",
    knowledge: "Enable No Core finish pass with 'Start pass at closest entity' for efficient motion. Finish pass begins at closest endpoint to roughing end position.",
    source: "Mastercam Wire Tutorial p.38",
    confidence: 0.90,
    applies_to: ["precision_pockets"]
  },

  // CHAINING
  {
    topic: "Break Closest Entity",
    category: "workflow",
    knowledge: "Enable 'Break closest entity to thread point' to create perpendicular approach from thread point. Creates shortest possible motion and cleaner entry.",
    source: "Mastercam Wire Tutorial p.12",
    confidence: 0.95,
    applies_to: ["all_contour_cuts"]
  },
  {
    topic: "Window Chaining",
    category: "workflow",
    knowledge: "Use Window chaining to quickly select multiple contours. Draw rectangle around parts, then click thread point as start. Sort chains afterward for optimal cutting order.",
    source: "Mastercam Wire Tutorial p.25",
    confidence: 0.95,
    applies_to: ["multiple_contour", "batch_selection"]
  },
  {
    topic: "Chain Sorting",
    category: "optimization",
    knowledge: "After window chaining, use Sort options to optimize cutting order. Sort by Y+X-, X+Y-, or other patterns based on part layout. Minimizes rapid travel between cuts.",
    source: "Mastercam Wire Tutorial p.30",
    confidence: 0.90,
    applies_to: ["multiple_contour", "optimization"]
  },

  // TECH LIBRARY
  {
    topic: "TECH Library Usage",
    category: "workflow",
    knowledge: "TECH library contains machine-specific power, offset, feed, and register settings. Select Finish Ra code and Sequence (e.g., 'Rough & 2 skim(s)') to load appropriate passes.",
    source: "Mastercam Wire Tutorial p.45-46",
    confidence: 0.95,
    applies_to: ["makino", "machine_specific"]
  },

  // COMPENSATION
  {
    topic: "Computer Compensation",
    category: "parameter",
    knowledge: "Use Computer compensation to calculate compensated wirepath in CAM. Does not output G41/G42 codes. Shows accurate representation of actual tool motion in backplot.",
    source: "Mastercam Wire Tutorial p.13",
    confidence: 0.95,
    applies_to: ["visualization", "programming"]
  },

  // HEIGHTS
  {
    topic: "Height Setup",
    category: "parameter",
    knowledge: "Set Rapid height, UV trim plane, and UV height to stock top. Rapid height is Z of upper wire guide for rapid moves. UV trim plane sets upper guide position during cut.",
    source: "Mastercam Wire Tutorial p.14",
    confidence: 0.95,
    applies_to: ["all_toolpaths"]
  },

  // SAFETY
  {
    topic: "Thread Point Placement",
    category: "safety",
    knowledge: "Place thread point at center of pre-drilled hole. When stock is close to part size, thread point is often outside stock boundaries. Each contour needs associated thread point.",
    source: "Mastercam Wire Tutorial p.8, p.35",
    confidence: 0.95,
    applies_to: ["all_toolpaths"]
  }
];

/**
 * Standard pass progressions for common scenarios
 */
const PASS_PROGRESSIONS: Record<string, PassDefinition[]> = {
  // Standard 4-pass progression for tool steel
  "standard_4_pass": [
    { pass_number: 1, pass_type: "rough", wire_diameter_mm: 0.2, wire_overburn_mm: 0.035, description: "Rough cut - maximum material removal" },
    { pass_number: 2, pass_type: "skim", wire_diameter_mm: 0.2, wire_overburn_mm: 0.02, description: "First skim - semi-finish" },
    { pass_number: 3, pass_type: "skim", wire_diameter_mm: 0.2, wire_overburn_mm: 0.01, description: "Second skim - near-finish" },
    { pass_number: 4, pass_type: "skim", wire_diameter_mm: 0.2, wire_overburn_mm: 0.0, description: "Final skim - on size" }
  ],

  // Quick 2-pass for less critical work
  "quick_2_pass": [
    { pass_number: 1, pass_type: "rough", wire_diameter_mm: 0.2, wire_overburn_mm: 0.02, description: "Rough cut" },
    { pass_number: 2, pass_type: "skim", wire_diameter_mm: 0.2, wire_overburn_mm: 0.0, description: "Finish skim" }
  ],

  // High precision 5-pass
  "precision_5_pass": [
    { pass_number: 1, pass_type: "rough", wire_diameter_mm: 0.2, wire_overburn_mm: 0.04, description: "Rough cut" },
    { pass_number: 2, pass_type: "skim", wire_diameter_mm: 0.2, wire_overburn_mm: 0.025, description: "First skim" },
    { pass_number: 3, pass_type: "skim", wire_diameter_mm: 0.2, wire_overburn_mm: 0.015, description: "Second skim" },
    { pass_number: 4, pass_type: "skim", wire_diameter_mm: 0.2, wire_overburn_mm: 0.005, description: "Third skim" },
    { pass_number: 5, pass_type: "skim", wire_diameter_mm: 0.2, wire_overburn_mm: 0.0, description: "Final polish" }
  ],

  // Rough only (for blanking operations)
  "rough_only": [
    { pass_number: 1, pass_type: "rough", wire_diameter_mm: 0.2, wire_overburn_mm: 0.05, description: "Rough cut - blanking" }
  ],

  // With tab cut
  "standard_with_tab": [
    { pass_number: 1, pass_type: "rough", wire_diameter_mm: 0.2, wire_overburn_mm: 0.035, description: "Rough cut with stop before tab" },
    { pass_number: 2, pass_type: "skim", wire_diameter_mm: 0.2, wire_overburn_mm: 0.02, description: "First skim" },
    { pass_number: 3, pass_type: "skim", wire_diameter_mm: 0.2, wire_overburn_mm: 0.01, description: "Second skim" },
    { pass_number: 4, pass_type: "skim", wire_diameter_mm: 0.2, wire_overburn_mm: 0.0, description: "Third skim" },
    { pass_number: 5, pass_type: "tab", wire_diameter_mm: 0.2, wire_overburn_mm: 0.0, description: "Tab cutoff" }
  ]
};

/**
 * Default lead configurations
 */
const DEFAULT_LEADS: Record<string, LeadConfig> = {
  entry_standard: {
    lead_type: "line_and_arc",
    arc_radius_mm: 0.125,
    arc_sweep_deg: 60,
    line_length_mm: 0.5,
    overlap_mm: 0.0,
    trim_final_lead_out: false
  },
  exit_standard: {
    lead_type: "arc_and_line",
    arc_radius_mm: 0.125,
    arc_sweep_deg: 60,
    line_length_mm: 0.5,
    overlap_mm: 0.02,
    max_lead_out_mm: 0.3,
    trim_final_lead_out: true
  },
  entry_precision: {
    lead_type: "line_and_arc",
    arc_radius_mm: 0.5,
    arc_sweep_deg: 90,
    line_length_mm: 1.0,
    overlap_mm: 0.0,
    trim_final_lead_out: false
  },
  exit_precision: {
    lead_type: "arc_and_line",
    arc_radius_mm: 0.5,
    arc_sweep_deg: 90,
    line_length_mm: 1.0,
    overlap_mm: 0.02,
    trim_final_lead_out: true
  }
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * Wire EDM CAM Knowledge Engine
 *
 * Provides Mastercam Wire EDM knowledge for:
 * - Toolpath type selection
 * - Pass strategy recommendations
 * - Lead geometry configuration
 * - Tab and stop strategies
 * - 4-axis sync mode selection
 */
export class WireEDMCAMKnowledgeEngine {
  private readonly knowledgeBase: CAMKnowledgeRecord[];
  private readonly passProgressions: Record<string, PassDefinition[]>;

  constructor() {
    this.knowledgeBase = MASTERCAM_WIRE_KNOWLEDGE;
    this.passProgressions = PASS_PROGRESSIONS;
    log.info("[WireEDMCAMKnowledge] Initialized with Mastercam Wire knowledge");
  }

  // ==========================================================================
  // TOOLPATH RECOMMENDATION
  // ==========================================================================

  /**
   * Recommend toolpath type based on part characteristics
   */
  recommendToolpathType(params: {
    has_different_top_bottom: boolean;
    num_contours: number;
    requires_material_removal: boolean;
    has_taper_angle: boolean;
    is_closed_contour: boolean;
  }): ToolpathRecommendation {
    const {
      has_different_top_bottom,
      num_contours,
      requires_material_removal,
      has_taper_angle,
      is_closed_contour
    } = params;

    // Decision logic
    if (has_different_top_bottom || has_taper_angle) {
      return {
        toolpath_type: "four_axis",
        reason: "Part has different top/bottom geometry or taper angle requiring 4-axis wire orientation",
        suggested_config: {
          toolpath_type: "four_axis",
          chaining: {
            sync_mode: "by_entity",
            break_closest_entity_to_thread_point: true,
            start_chain_at_point: true,
            closed_chains_only: true,
            open_chains_allowed: false,
            chaining_tolerance_mm: 0.002
          }
        },
        confidence: 0.95,
        alternatives: [
          { type: "single_contour", when_to_use: "If geometry can be simplified to 2-axis" }
        ]
      };
    }

    if (requires_material_removal && is_closed_contour) {
      return {
        toolpath_type: "no_core",
        reason: "Material removal within closed boundary without producing slugs",
        suggested_config: {
          toolpath_type: "no_core",
          chaining: {
            sync_mode: "by_entity",
            break_closest_entity_to_thread_point: false,
            start_chain_at_point: true,
            closed_chains_only: true,
            open_chains_allowed: false,
            chaining_tolerance_mm: 0.002
          }
        },
        confidence: 0.95,
        alternatives: [
          { type: "single_contour", when_to_use: "If slug removal is acceptable" }
        ]
      };
    }

    if (num_contours > 1) {
      return {
        toolpath_type: "multiple_contour",
        reason: "Multiple contours can be cut efficiently from single stock",
        suggested_config: {
          toolpath_type: "multiple_contour",
          cutting_method: "reverse",
          chaining: {
            sync_mode: "by_entity",
            break_closest_entity_to_thread_point: true,
            start_chain_at_point: false,
            closed_chains_only: true,
            open_chains_allowed: false,
            chaining_tolerance_mm: 0.002
          }
        },
        confidence: 0.90,
        alternatives: [
          { type: "single_contour", when_to_use: "If parts require different settings" }
        ]
      };
    }

    // Default: single contour
    return {
      toolpath_type: "single_contour",
      reason: "Standard 2-axis contour with same top/bottom geometry",
      suggested_config: {
        toolpath_type: "single_contour",
        cutting_method: "reverse",
        chaining: {
          sync_mode: "by_entity",
          break_closest_entity_to_thread_point: true,
          start_chain_at_point: false,
          closed_chains_only: true,
          open_chains_allowed: true,
          chaining_tolerance_mm: 0.002
        }
      },
      confidence: 0.95,
      alternatives: [
        { type: "multiple_contour", when_to_use: "If cutting multiple identical parts" },
        { type: "four_axis", when_to_use: "If taper is required" }
      ]
    };
  }

  // ==========================================================================
  // PASS STRATEGY
  // ==========================================================================

  /**
   * Get pass progression for target Ra
   */
  getPassProgression(params: {
    target_ra_um: number;
    material: string;
    time_priority: "speed" | "quality" | "balanced";
    include_tab_cut: boolean;
  }): PassDefinition[] {
    const { target_ra_um, time_priority, include_tab_cut } = params;

    let progression: PassDefinition[];

    // Select base progression
    if (target_ra_um <= 0.4) {
      progression = [...this.passProgressions["precision_5_pass"]];
    } else if (target_ra_um <= 0.8) {
      progression = [...this.passProgressions["standard_4_pass"]];
    } else if (target_ra_um <= 1.6 && time_priority === "speed") {
      progression = [...this.passProgressions["quick_2_pass"]];
    } else if (time_priority === "speed") {
      progression = [...this.passProgressions["rough_only"]];
    } else {
      progression = [...this.passProgressions["standard_4_pass"]];
    }

    // Add tab cut if needed
    if (include_tab_cut) {
      progression.push({
        pass_number: progression.length + 1,
        pass_type: "tab",
        wire_diameter_mm: 0.2,
        wire_overburn_mm: 0.0,
        description: "Tab cutoff"
      });
    }

    return progression;
  }

  /**
   * Calculate total stock to remove based on pass progression
   */
  calculateStockRemoval(passes: PassDefinition[]): {
    total_stock_per_side_mm: number;
    passes_breakdown: Array<{
      pass: number;
      stock_left_mm: number;
      material_removed_mm: number;
    }>;
  } {
    const wire_radius = passes[0]?.wire_diameter_mm / 2 || 0.1;
    let previous_stock = 0;

    const breakdown = passes
      .filter(p => p.pass_type !== "tab")
      .map((pass, idx) => {
        const stock_left = wire_radius + pass.wire_overburn_mm;
        const material_removed = idx === 0
          ? stock_left  // First pass removes from raw
          : previous_stock - stock_left;
        previous_stock = stock_left;

        return {
          pass: pass.pass_number,
          stock_left_mm: stock_left,
          material_removed_mm: material_removed
        };
      });

    const rough_pass = passes.find(p => p.pass_type === "rough");
    const total_stock = rough_pass
      ? (rough_pass.wire_diameter_mm / 2) + rough_pass.wire_overburn_mm
      : 0.135;  // Default for 0.2mm wire with 0.035 overburn

    return {
      total_stock_per_side_mm: total_stock,
      passes_breakdown: breakdown
    };
  }

  // ==========================================================================
  // LEAD CONFIGURATION
  // ==========================================================================

  /**
   * Get recommended lead configuration
   */
  getLeadConfig(params: {
    precision_level: "standard" | "precision" | "rough";
    eliminate_witness_marks: boolean;
    optimize_cycle_time: boolean;
  }): { entry: LeadConfig; exit: LeadConfig } {
    const { precision_level, eliminate_witness_marks, optimize_cycle_time } = params;

    let entry: LeadConfig;
    let exit: LeadConfig;

    if (precision_level === "precision") {
      entry = { ...DEFAULT_LEADS.entry_precision };
      exit = { ...DEFAULT_LEADS.exit_precision };
    } else {
      entry = { ...DEFAULT_LEADS.entry_standard };
      exit = { ...DEFAULT_LEADS.exit_standard };
    }

    // Adjust for witness mark elimination
    if (eliminate_witness_marks) {
      exit.overlap_mm = 0.02;
    }

    // Adjust for cycle time
    if (optimize_cycle_time) {
      exit.max_lead_out_mm = 0.3;
      exit.trim_final_lead_out = true;
    }

    return { entry, exit };
  }

  // ==========================================================================
  // TAB AND STOP CONFIGURATION
  // ==========================================================================

  /**
   * Get recommended tab configuration
   */
  getTabConfig(params: {
    part_weight_kg: number;
    contour_count: number;
    material: string;
    precision_required: boolean;
  }): TabConfig {
    const { part_weight_kg, contour_count, precision_required } = params;

    // Heavier parts need wider tabs
    let width = 1.0;
    if (part_weight_kg > 1.0) width = 2.0;
    if (part_weight_kg > 5.0) width = 3.0;

    return {
      enabled: true,
      width_mm: width,
      count: 1,
      position: "automatic",
      make_tab_cutoff_with_skim: !precision_required,
      skim_cuts_after_tab: precision_required
    };
  }

  /**
   * Get glue stop configuration
   */
  getGlueStopConfig(params: {
    prevent_dropout: boolean;
    contour_count: number;
    heavy_parts: boolean;
  }): GlueStopConfig {
    const { prevent_dropout, contour_count, heavy_parts } = params;

    if (!prevent_dropout) {
      return {
        enabled: false,
        output_as_glue_stop: false,
        before_tab: false,
        after_tab: false,
        for_each_tab: false,
        for_first_tab_only: false
      };
    }

    return {
      enabled: true,
      output_as_glue_stop: true,  // M01 optional stop
      before_tab: true,
      after_tab: false,
      for_each_tab: contour_count > 1 || heavy_parts,
      for_first_tab_only: contour_count === 1 && !heavy_parts
    };
  }

  // ==========================================================================
  // 4-AXIS SYNC MODE
  // ==========================================================================

  /**
   * Recommend 4-axis sync mode
   */
  recommendSyncMode(params: {
    xy_entity_count: number;
    uv_entity_count: number;
    has_branch_points: boolean;
    has_connecting_3d_geometry: boolean;
    has_sync_points: boolean;
    are_splines: boolean;
  }): {
    recommended_mode: SyncMode;
    reason: string;
    alternatives: Array<{ mode: SyncMode; when_to_use: string }>;
  } {
    const {
      xy_entity_count,
      uv_entity_count,
      has_branch_points,
      has_connecting_3d_geometry,
      has_sync_points,
      are_splines
    } = params;

    // By entity - same entity count
    if (xy_entity_count === uv_entity_count) {
      return {
        recommended_mode: "by_entity",
        reason: `Both chains have ${xy_entity_count} entities - By Entity sync will match endpoints`,
        alternatives: [
          { mode: "by_point", when_to_use: "If specific points need alignment" },
          { mode: "manual_density", when_to_use: "If small radii need higher resolution" }
        ]
      };
    }

    // By branch - has connecting geometry
    if (has_branch_points && has_connecting_3d_geometry) {
      return {
        recommended_mode: "by_branch",
        reason: "Branch points available with 3D connecting geometry",
        alternatives: [
          { mode: "manual", when_to_use: "If automatic branch matching is incorrect" }
        ]
      };
    }

    // By point - has sync points
    if (has_sync_points) {
      return {
        recommended_mode: "by_point",
        reason: "Sync points defined on both chains",
        alternatives: [
          { mode: "manual", when_to_use: "If point alignment needs adjustment" }
        ]
      };
    }

    // By node - parametric splines
    if (are_splines) {
      return {
        recommended_mode: "by_node",
        reason: "Parametric splines can sync by node points",
        alternatives: [
          { mode: "manual_density", when_to_use: "If node count differs between splines" }
        ]
      };
    }

    // Default to manual
    return {
      recommended_mode: "manual",
      reason: "Complex geometry requires manual sync point definition",
      alternatives: [
        { mode: "manual_density", when_to_use: "If areas have small radii needing higher density" }
      ]
    };
  }

  // ==========================================================================
  // NO CORE CONFIGURATION
  // ==========================================================================

  /**
   * Recommend No Core cutting method
   */
  recommendNoCoreMethod(params: {
    pocket_shape: "slot" | "round" | "square" | "irregular";
    aspect_ratio: number;  // length / width
    has_small_radii: boolean;
  }): {
    method: NoCoreMethod;
    reason: string;
    enable_finish: boolean;
    finish_passes: number;
  } {
    const { pocket_shape, aspect_ratio, has_small_radii } = params;

    if (pocket_shape === "slot" || aspect_ratio > 3) {
      return {
        method: "parallel_spiral",
        reason: "Parallel spiral follows elongated slot shape efficiently",
        enable_finish: true,
        finish_passes: has_small_radii ? 2 : 1
      };
    }

    if (pocket_shape === "round") {
      return {
        method: "spiral_out",
        reason: "Spiral out follows circular pocket shape",
        enable_finish: true,
        finish_passes: 1
      };
    }

    if (pocket_shape === "square") {
      return {
        method: "zigzag",
        reason: "Zigzag efficiently clears rectangular pockets",
        enable_finish: true,
        finish_passes: 1
      };
    }

    return {
      method: "adaptive",
      reason: "Adaptive follows irregular pocket contours",
      enable_finish: true,
      finish_passes: has_small_radii ? 2 : 1
    };
  }

  // ==========================================================================
  // KNOWLEDGE SEARCH
  // ==========================================================================

  /**
   * Search knowledge base
   */
  searchKnowledge(query: string, category?: CAMKnowledgeRecord["category"]): CAMKnowledgeRecord[] {
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/);

    return this.knowledgeBase
      .filter(record => {
        // Category filter
        if (category && record.category !== category) return false;

        // Term matching
        const text = `${record.topic} ${record.knowledge}`.toLowerCase();
        return queryTerms.some(term => text.includes(term));
      })
      .sort((a, b) => {
        // Score by term matches
        const textA = `${a.topic} ${a.knowledge}`.toLowerCase();
        const textB = `${b.topic} ${b.knowledge}`.toLowerCase();
        const scoreA = queryTerms.filter(t => textA.includes(t)).length;
        const scoreB = queryTerms.filter(t => textB.includes(t)).length;
        return scoreB - scoreA;
      });
  }

  /**
   * Get all knowledge by category
   */
  getKnowledgeByCategory(category: CAMKnowledgeRecord["category"]): CAMKnowledgeRecord[] {
    return this.knowledgeBase.filter(r => r.category === category);
  }

  // ==========================================================================
  // COMPLETE WIREPATH CONFIGURATION
  // ==========================================================================

  /**
   * Generate complete wirepath configuration
   */
  generateWirepathConfig(params: {
    toolpath_type: WireEDMToolpathType;
    target_ra_um: number;
    material: string;
    thickness_mm: number;
    part_weight_kg: number;
    contour_count: number;
    optimize_time: boolean;
    precision_required: boolean;
  }): WirepathConfig {
    const {
      toolpath_type,
      target_ra_um,
      material,
      thickness_mm,
      part_weight_kg,
      contour_count,
      optimize_time,
      precision_required
    } = params;

    // Get passes
    const passes = this.getPassProgression({
      target_ra_um,
      material,
      time_priority: optimize_time ? "speed" : precision_required ? "quality" : "balanced",
      include_tab_cut: toolpath_type !== "no_core"
    });

    // Get leads
    const leads = this.getLeadConfig({
      precision_level: precision_required ? "precision" : "standard",
      eliminate_witness_marks: precision_required,
      optimize_cycle_time: optimize_time
    });

    // Get tabs
    const tabs = this.getTabConfig({
      part_weight_kg,
      contour_count,
      material,
      precision_required
    });

    // Get glue stops
    const glue_stops = this.getGlueStopConfig({
      prevent_dropout: part_weight_kg > 0.5 || precision_required,
      contour_count,
      heavy_parts: part_weight_kg > 2.0
    });

    return {
      toolpath_type,
      passes,
      leads: { entry: leads.entry, exit: leads.exit },
      tabs,
      glue_stops,
      heights: {
        rapid_height_mm: thickness_mm + 5,
        uv_trim_plane_mm: thickness_mm + 5,
        uv_height_mm: thickness_mm + 5,
        xy_height_mm: 0,
        use_absolute: true
      },
      compensation: {
        type: "computer",
        direction: "left"
      },
      cutting_method: "reverse",
      chaining: {
        break_closest_entity_to_thread_point: toolpath_type !== "no_core",
        start_chain_at_point: false,
        closed_chains_only: toolpath_type === "no_core",
        open_chains_allowed: toolpath_type !== "no_core",
        sync_mode: "by_entity",
        chaining_tolerance_mm: 0.002
      }
    };
  }

  // ==========================================================================
  // STATUS
  // ==========================================================================

  /**
   * Get engine status
   */
  getStatus(): {
    knowledge_records: number;
    categories: Record<string, number>;
    pass_progressions: number;
    lead_configs: number;
    sources: string[];
  } {
    const categories: Record<string, number> = {};
    for (const record of this.knowledgeBase) {
      categories[record.category] = (categories[record.category] || 0) + 1;
    }

    const sources = [...new Set(this.knowledgeBase.map(r => r.source))];

    return {
      knowledge_records: this.knowledgeBase.length,
      categories,
      pass_progressions: Object.keys(this.passProgressions).length,
      lead_configs: Object.keys(DEFAULT_LEADS).length,
      sources
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const wireEDMCAMKnowledgeEngine = new WireEDMCAMKnowledgeEngine();
